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
  "package.json", "package-lock.json", "build.mjs", "vercel.json",
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
  const limpo = fonte.replace(/<!--(?!\[if)[\s\S]*?-->\n?/g, "");
  await writeFile(arquivo, limpo);
  console.log(`${nome}: ${fonte.length} → ${limpo.length} bytes`);
}

// Fora da Vercel (a pasta vai pra Hostinger ou outra hospedagem Apache/
// LiteSpeed): as regras de cache, compressão e https vão num .htaccess.
// Na Vercel isso vem do vercel.json e o .htaccess não é publicado.
if (!process.env.VERCEL) {
  await cp(join(RAIZ, "hospedagem", "htaccess"), join(SAIDA, ".htaccess"));
  console.log(".htaccess: criado");
}
