// Antes de ligar os anúncios: npm run checar-lancamento
// Lista tudo o que ainda é provisório nas páginas publicadas (dist/). Sai com
// erro enquanto sobrar algum item, pra ninguém lançar com o checkout de teste.
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;
const REGRAS = [
  [/COLOQUE-SEU-CODIGO-AQUI/g, "link do checkout da Hotmart ainda é o provisório (a Hotmart mostra \"Offer not found\")"],
  [/COLOQUE-SEU-DOMINIO-AQUI/g, "domínio ainda é o provisório (canonical, og:url/og:image, dados estruturados, robots.txt, sitemap.xml): gere com DOMINIO=seudominio.com.br npm run build"],
  [/class="apoio-pendente"/g, "informação ainda a preencher nas páginas de apoio (e-mail, etc.)"],
];

const pendencias = [];
for (const nome of (await readdir(DIST)).filter((n) => /\.(html|txt|xml)$/.test(n))) {
  const texto = await readFile(join(DIST, nome), "utf8");
  for (const [regra, descricao] of REGRAS) {
    const n = (texto.match(regra) || []).length;
    if (n) pendencias.push(`${nome}: ${n}x ${descricao}`);
  }
}
if (pendencias.length) {
  console.error("AINDA NÃO ESTÁ PRONTO PRA LANÇAR:\n  - " + pendencias.join("\n  - "));
  process.exit(1);
}
console.log("Nenhuma pendência provisória encontrada nas páginas.");
