// Build de publicação (a Vercel roda "npm run build" e publica a pasta dist/).
//
// Só faz duas coisas:
//   1. copia o site pra dist/ (tudo, menos o que é de desenvolvimento);
//   2. minifica os CSS e o main.js DENTRO de dist/, com os mesmos nomes.
//
// Os arquivos do repositório continuam comentados e legíveis: é neles que se
// edita. Os comentários eram 2/3 do CSS comprimido (42 KB → 14 KB), e o CSS
// segura a primeira pintura da página.
// O HTML e o gsap.min.js (já minificado) vão como estão.
import { cp, readFile, writeFile, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { transform } from "esbuild";

const RAIZ = new URL(".", import.meta.url).pathname;
const SAIDA = join(RAIZ, "dist");
const FORA = new Set([
  "dist", "node_modules", ".git", "testes", "hospedagem", "pacote",
  "package.json", "package-lock.json", "build.mjs", "vercel.json", "playwright.config.mjs",
  "test-results", "playwright-report",
  ".gitignore", ".vercelignore",
]);

await rm(SAIDA, { recursive: true, force: true });
for (const nome of await readdir(RAIZ)) {
  if (FORA.has(nome)) continue;
  await cp(join(RAIZ, nome), join(SAIDA, nome), { recursive: true });
}

async function minifica(caminho, loader) {
  const arquivo = join(SAIDA, caminho);
  const fonte = await readFile(arquivo, "utf8");
  // Sem "target": o esbuild não reescreve sintaxe moderna (image-set,
  // color-mix, :has, svh...), só tira comentários e espaços.
  const { code } = await transform(fonte, { loader, minify: true, legalComments: "none" });
  await writeFile(arquivo, code);
  console.log(`${caminho}: ${fonte.length} → ${code.length} bytes`);
}

await minifica("css/style.css", "css");
await minifica("css/legal.css", "css");
await minifica("js/main.js", "js");

// HTML sem os comentários (<!-- ... -->): eles explicam o código pra quem
// edita e iam junto pra todo visitante. O conteúdo e as tags ficam iguais.
for (const nome of await readdir(SAIDA)) {
  if (!nome.endsWith(".html")) continue;
  const arquivo = join(SAIDA, nome);
  const fonte = await readFile(arquivo, "utf8");
  // As notas de revisão (data-confirmar="...") também ficam só no código: no
  // ar elas não servem pra nada (o modo revisão vem desligado) e contavam
  // pra qualquer visitante o que ainda é provisório.
  const limpo = fonte.replace(/<!--(?!\[if)[\s\S]*?-->\n?/g, "").replace(/ data-confirmar="[^"]*"/g, "");
  await writeFile(arquivo, limpo);
  console.log(`${nome}: ${fonte.length} → ${limpo.length} bytes`);
}

// Domínio: o canonical, o og:url/og:image, os dados estruturados, o
// robots.txt e o sitemap.xml precisam do endereço completo. No código fica
// COLOQUE-SEU-DOMINIO-AQUI; aqui ele vira o domínio de verdade:
//   DOMINIO=seudominio.com.br npm run build   (pasta pra hospedagem final)
// Na Vercel (prévia), sem DOMINIO, entra o endereço da própria prévia, que
// fica fora do Google pelo X-Robots-Tag do vercel.json.
{
  const dominio = (process.env.DOMINIO || (process.env.VERCEL ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL : "") || "")
    .replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (dominio) {
    for (const nome of await readdir(SAIDA)) {
      if (!/\.(html|txt|xml)$/.test(nome)) continue;
      const arquivo = join(SAIDA, nome);
      await writeFile(arquivo, (await readFile(arquivo, "utf8")).replaceAll("COLOQUE-SEU-DOMINIO-AQUI", dominio));
    }
    console.log(`domínio: ${dominio}`);
  } else {
    console.log("domínio: provisório (COLOQUE-SEU-DOMINIO-AQUI). Para a pasta final: DOMINIO=seudominio.com.br npm run build");
  }
}

// O script e o estilo escritos direto no HTML só rodam, pela política de
// segurança (CSP) do vercel.json, se a impressão digital (hash) deles estiver
// lá. A política ainda só relata (Report-Only), então nada quebra; mas se um
// desses trechos mudar, o hash novo tem que ir pro vercel.json e pro
// hospedagem/SEGURANCA.txt, senão a política fica desatualizada.
{
  const { createHash } = await import("node:crypto");
  const politica = await readFile(join(RAIZ, "vercel.json"), "utf8");
  for (const nome of await readdir(SAIDA)) {
    if (!nome.endsWith(".html")) continue;
    const html = await readFile(join(SAIDA, nome), "utf8");
    for (const [, trecho] of html.matchAll(/<(?:script|style)>([\s\S]*?)<\/(?:script|style)>/g)) {
      const hash = "sha256-" + createHash("sha256").update(trecho, "utf8").digest("base64");
      if (!politica.includes(hash)) console.warn(`AVISO: ${nome} tem um trecho inline cujo hash (${hash}) não está na CSP do vercel.json`);
    }
  }
}

// Fora da Vercel (a pasta vai pra Hostinger ou outra hospedagem Apache/
// LiteSpeed): as regras de cache, compressão e https vão num .htaccess.
// Na Vercel isso vem do vercel.json e o .htaccess não é publicado.
if (!process.env.VERCEL) {
  await cp(join(RAIZ, "hospedagem", "htaccess"), join(SAIDA, ".htaccess"));
  console.log(".htaccess: criado");
}
