// SEO técnico (auditoria pré-lançamento, 29/set): uma URL oficial só, os
// parâmetros dos anúncios não criam páginas novas, todos os sinais (canonical,
// og:url, sitemap, robots.txt, dados estruturados) apontam pro mesmo lugar, e
// os dados estruturados só dizem o que está escrito na página.
import { test, expect } from "@playwright/test";

const PARAMETROS = [
  "",
  "?utm_source=meta&utm_medium=paid&utm_campaign=lancamento&utm_content=video1&utm_term=camera",
  "?gclid=abc123&fbclid=XyZ&ttclid=1&src=bio&sck=x",
  "?utm_source=google#faq",
];

async function metadados(page) {
  return page.evaluate(() => {
    const todos = (s) => [...document.querySelectorAll(s)];
    const um = (s, a = "content") => { const e = document.querySelector(s); return e && e.getAttribute(a); };
    return {
      titulos: todos("head > title").length,
      titulo: document.title,
      descricoes: todos('meta[name="description"]').length,
      canonicals: todos('link[rel="canonical"]').map((l) => l.getAttribute("href")),
      robots: todos('meta[name="robots"]').map((m) => m.content),
      ogUrl: um('meta[property="og:url"]'),
      ogImagem: um('meta[property="og:image"]'),
      lang: document.documentElement.lang,
      charsetPrimeiro: document.head.firstElementChild.getAttribute("charset"),
      h1: todos("h1").length,
      jsonld: todos('script[type="application/ld+json"]').map((s) => s.textContent),
    };
  });
}

test("a URL oficial (canonical) é a mesma com qualquer parâmetro de anúncio", async ({ page }) => {
  const vistos = new Set();
  for (const q of PARAMETROS) {
    await page.goto("/index.html" + q, { waitUntil: "load" });
    const m = await metadados(page);
    expect(m.canonicals.length, q).toBe(1);
    const c = m.canonicals[0];
    expect(c, q).toMatch(/^https:\/\/[^/?#]+\/$/);
    expect(c, q).not.toMatch(/localhost|utm_|gclid|fbclid|[?#]/);
    expect(m.ogUrl, "og:url igual ao canonical").toBe(c);
    vistos.add(c);
  }
  expect(vistos.size).toBe(1);
});

test("metadados da landing: um de cada, idioma, charset e indexável", async ({ page }) => {
  await page.goto("/index.html", { waitUntil: "load" });
  const m = await metadados(page);
  expect(m.titulos).toBe(1);
  expect(m.descricoes).toBe(1);
  expect(m.robots).toEqual(["index, follow, max-image-preview:large"]);
  expect(m.lang).toBe("pt-BR");
  expect(m.charsetPrimeiro.toLowerCase()).toBe("utf-8");
  expect(m.h1).toBe(1);
  expect(m.titulo).toContain("Do Medo ao Play");
  expect(m.titulo, "acentos sem corromper").not.toMatch(/Ã|Â|�/);
  expect(m.ogImagem).toMatch(/^https:\/\/[^/]+\/og-image\.jpg$/);
});

test("o JavaScript não mexe no canonical nem no título depois que a página abre", async ({ page, request }) => {
  const html = await (await request.get("/index.html?utm_source=meta")).text();
  const noHtml = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
  await page.goto("/index.html?utm_source=meta", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const m = await metadados(page);
  expect(m.canonicals).toEqual([noHtml]);
  expect(m.titulo).toBe(html.match(/<title>([^<]+)<\/title>/)[1]);
});

test("páginas de apoio: fora da busca (noindex, follow) e com o próprio endereço", async ({ page }) => {
  for (const pagina of ["privacidade.html", "termos.html", "suporte.html"]) {
    await page.goto("/" + pagina, { waitUntil: "load" });
    const m = await metadados(page);
    expect(m.robots, pagina).toEqual(["noindex, follow"]);
    expect(m.canonicals.length, pagina).toBe(1);
    expect(m.canonicals[0], pagina).toMatch(new RegExp("^https://[^/]+/" + pagina.replace(".", "\\.") + "$"));
    expect(m.titulos, pagina).toBe(1);
    expect(m.h1, pagina).toBe(1);
  }
});

test("robots.txt e sitemap.xml existem e apontam pra mesma URL oficial", async ({ request, page }) => {
  await page.goto("/index.html", { waitUntil: "load" });
  const canonical = (await metadados(page)).canonicals[0];
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const r = await robots.text();
  expect(r).toMatch(/User-agent: \*/);
  expect(r, "nada bloqueado").not.toMatch(/^Disallow:\s*\/\S*/m);
  expect(r).toContain("Sitemap: " + canonical + "sitemap.xml");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
  expect(locs).toEqual([canonical]);
});

test("dados estruturados: JSON válido e só o que está escrito na página", async ({ page }) => {
  await page.goto("/index.html", { waitUntil: "load" });
  const m = await metadados(page);
  expect(m.jsonld.length).toBe(1);
  const grafo = JSON.parse(m.jsonld[0])["@graph"];
  const curso = grafo.find((x) => x["@type"] === "Course");
  const site = grafo.find((x) => x["@type"] === "WebSite");
  expect(site.url).toBe(m.canonicals[0]);
  expect(curso.url).toBe(m.canonicals[0]);
  // O preço e a quantidade de módulos/aulas vêm da página: se um mudar, o outro tem que mudar junto.
  const pagina = await page.evaluate(() => ({
    preco: document.querySelector("#oferta .price-avista strong").textContent.replace(/\D/g, ""),
    titulo: document.getElementById("modulos-title").textContent,
  }));
  expect(curso.offers.price).toBe(pagina.preco);
  expect(curso.offers.priceCurrency).toBe("BRL");
  const [, mods, aulas] = curso.description.match(/(\d+) módulos e (\d+) aulas/);
  expect(pagina.titulo).toContain(`${mods} módulos`);
  expect(pagina.titulo).toContain(`${aulas} aulas`);
  // Nada inventado.
  for (const proibido of ["aggregateRating", "review", "Rating", "FAQPage", "availability", "priceValidUntil"]) {
    expect(m.jsonld[0], proibido).not.toContain(proibido);
  }
});

test("a imagem de compartilhamento existe e é um JPEG 1200x630", async ({ request, page }) => {
  const r = await request.get("/og-image.jpg");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toMatch(/^image\/jpeg/);
  await page.goto("/index.html", { waitUntil: "load" });
  const tamanho = await page.evaluate(() => new Promise((ok) => { const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.src = "og-image.jpg"; }));
  expect(tamanho).toEqual([1200, 630]);
});
