// Tracking (auditoria pré-lançamento, 30/set). Nenhuma ferramenta de anúncio
// está instalada (é o gestor de tráfego quem instala): aqui se prova que a
// landing aceita os parâmetros dos anúncios, leva ao checkout só os de
// rastreio e sem mexer no valor, avisa cada clique de compra uma vez só, e
// continua vendendo se a medição falhar ou for bloqueada. O checkout da
// Hotmart é simulado (nenhum pedido sai pra Hotmart).
import { test, expect } from "@playwright/test";
import { abre } from "./ajuda.mjs";

const RASTREIO = "utm_source=teste&utm_medium=paid_social&utm_campaign=auditoria&utm_content=criativo_a&utm_term=camera&utm_id=123"
  + "&gclid=Cj0KCQjw-abc_DEF123&gbraid=0AAAAAo-xyz&wbraid=CjkKCQ_abc&fbclid=IwAR2xYz_AbC-123&msclkid=abc123def&ttclid=E.C.P.xyz"
  + "&src=bio&sck=story1&xcod=abc";
// Valores com espaço, acento, +, %, / e & codificados: têm que chegar iguais.
const CODIFICADOS = "utm_creative_format=Promo%20Lan%C3%A7amento%2B50%25&utm_marketing_tactic=criativo%2Fa%26b";

test.beforeEach(async ({ context }) => {
  await context.route(/pay\.hotmart\.com/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>checkout simulado</title>" }));
});

const buscaDoCheckout = (href) => href.slice(href.indexOf("?") + 1);

test("UTMs, identificadores de clique (Google, Meta, Microsoft, TikTok) e os da Hotmart chegam intactos aos 5 botões", async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  const resp = await page.goto("/index.html?" + RASTREIO + "&" + CODIFICADOS, { waitUntil: "load" });
  expect(resp.status()).toBe(200);
  expect(resp.request().redirectedFrom(), "sem redirecionamento").toBeNull();
  await expect(page.locator("html")).not.toHaveClass(/abertura-on/, { timeout: 20_000 });
  expect(page.url(), "a página não apaga os parâmetros do endereço").toContain(RASTREIO);
  const hrefs = await page.locator("[data-checkout-link]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  expect(hrefs).toHaveLength(5);
  for (const href of hrefs) {
    expect(href).toMatch(/^https:\/\/pay\.hotmart\.com\/[^?]+\?/);
    // Exatamente o texto que veio, na mesma ordem, sem recodificar nada.
    expect(buscaDoCheckout(href)).toBe(RASTREIO + "&" + CODIFICADOS);
  }
  expect(erros).toEqual([]);
});

test("parâmetro que não é de rastreio não vai pro checkout nem fica guardado (dado pessoal, troca de oferta)", async ({ page }) => {
  await abre(page, "/index.html?utm_source=teste&email=pessoa%40exemplo.com&off=OUTRA&nome=Maria&xyz=1");
  const href = await page.locator("#oferta [data-checkout-link]").getAttribute("href");
  expect(buscaDoCheckout(href)).toBe("utm_source=teste");
  expect(await page.evaluate(() => sessionStorage.getItem("dmap-parametros"))).toBe("utm_source=teste");
  expect(await page.evaluate(() => document.cookie), "nenhum cookie").toBe("");
  expect(await page.evaluate(() => localStorage.length), "nada no localStorage").toBe(0);
});

test("parâmetro repetido: vale o primeiro, sem duplicar no checkout", async ({ page }) => {
  await abre(page, "/index.html?utm_source=a&utm_source=b&gclid=X&gclid=Y");
  expect(buscaDoCheckout(await page.locator("#oferta [data-checkout-link]").getAttribute("href"))).toBe("utm_source=a&gclid=X");
});

test("visita seguinte na mesma aba: um anúncio novo troca o conjunto inteiro; um endereço sem rastreio mantém o anterior", async ({ page }) => {
  await abre(page, "/index.html?utm_source=meta&utm_campaign=A&fbclid=F1");
  await abre(page, "/index.html?utm_campaign=B");
  expect(buscaDoCheckout(await page.locator("#oferta [data-checkout-link]").getAttribute("href")), "o anúncio B substitui o A inteiro (não mistura)").toBe("utm_campaign=B");
  await abre(page, "/index.html?xyz=1");
  expect(buscaDoCheckout(await page.locator("#oferta [data-checkout-link]").getAttribute("href")), "um parâmetro qualquer não apaga a origem").toBe("utm_campaign=B");
  await abre(page, "/termos.html");
  expect(buscaDoCheckout(await page.locator("[data-checkout-link]").getAttribute("href")), "nos Termos, a mesma origem").toBe("utm_campaign=B");
});

test("rede lenta (antes do main.js): o clique já leva só os parâmetros de rastreio, sem recodificar", async ({ page, context }) => {
  await page.route(/\/js\/main\.js/, async (r) => { await new Promise((x) => setTimeout(x, 9000)); await r.continue(); });
  await page.goto("/index.html?" + CODIFICADOS + "&email=pessoa%40exemplo.com&gclid=G1", { waitUntil: "commit" });
  await expect(page.locator("#hero-actions-el")).toHaveCSS("opacity", "1", { timeout: 8000 });
  expect(await page.evaluate(() => Boolean(window.mainPronto))).toBe(false);
  const [aba] = await Promise.all([context.waitForEvent("page"), page.locator(".hero [data-checkout-link]").click()]);
  await aba.waitForLoadState("domcontentloaded");
  expect(buscaDoCheckout(aba.url())).toBe(CODIFICADOS + "&gclid=G1");
});

// Conta os avisos de clique de compra (o evento neutro "dmap:evento").
async function contaEventos(page) {
  await page.evaluate(() => {
    window.__eventos = [];
    document.addEventListener("dmap:evento", (e) => window.__eventos.push(e.detail));
  });
}

test("um clique = um evento clique_checkout, com a posição do botão; clique duplo e Enter não duplicam", async ({ page, context }) => {
  await abre(page);
  await contaEventos(page);
  const botao = page.locator("#oferta [data-checkout-link]");
  await botao.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const [aba] = await Promise.all([context.waitForEvent("page"), botao.click()]);
  await aba.close();
  expect(await page.evaluate(() => window.__eventos)).toEqual([{ evento: "clique_checkout", posicao: "cta-oferta", pagina: "index" }]);
  await page.waitForTimeout(1100);
  // Clique duplo: abre uma aba e conta uma vez.
  const abas = [];
  context.on("page", (p) => abas.push(p));
  await botao.dblclick();
  await page.waitForTimeout(800);
  expect(abas.length, "uma aba só").toBe(1);
  expect(await page.evaluate(() => window.__eventos.length)).toBe(2);
  await page.waitForTimeout(1100);
  await botao.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__eventos.length), "Enter conta uma vez").toBe(3);
  // Botão do meio do mouse (abrir em aba nova) também conta uma vez.
  await page.waitForTimeout(1100);
  await botao.click({ button: "middle" });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__eventos.length), "botão do meio conta uma vez").toBe(4);
  // Três cliques espaçados: exatamente três (nada se acumula com o tempo).
  for (let i = 0; i < 3; i++) { await page.waitForTimeout(1100); await botao.click(); }
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__eventos.length)).toBe(7);
});

test("cada botão de compra tem um identificador estável e único (data-track-id)", async ({ page }) => {
  await abre(page);
  const ids = await page.locator("[data-checkout-link]").evaluateAll((as) => as.map((a) => a.dataset.trackId));
  expect(ids).toEqual(["cta-menu", "cta-topo", "cta-escada", "cta-oferta", "cta-final"]);
  for (const pagina of ["termos.html", "privacidade.html", "suporte.html"]) {
    await page.goto("/" + pagina);
    await expect(page.locator('[data-checkout-link][data-track-id="cta-menu"]'), pagina).toHaveCount(1);
  }
});

test("sem dataLayer, nada é criado; com dataLayer (quando o gestor instalar GTM), um push por clique", async ({ page, context }) => {
  await abre(page);
  expect(await page.evaluate(() => "dataLayer" in window), "a landing não cria dataLayer sozinha").toBe(false);
  await page.evaluate(() => { window.dataLayer = []; });
  const botao = page.locator(".hero [data-checkout-link]");
  const [aba] = await Promise.all([context.waitForEvent("page"), botao.click()]);
  await aba.close();
  expect(await page.evaluate(() => window.dataLayer)).toEqual([{ event: "dmap_clique_checkout", posicao: "cta-topo", pagina: "index" }]);
});

test("medição quebrada ou bloqueada (dataLayer com erro, GTM/pixel bloqueados) não impede a compra", async ({ page, context }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  // Um bloqueador de anúncios derruba os domínios de medição.
  await context.route(/googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|analytics\.tiktok\.com/, (r) => r.abort("blockedbyclient"));
  await page.addInitScript(() => {
    window.dataLayer = { push() { throw new Error("dataLayer quebrado"); } };
    document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("script");
      s.src = "https://www.googletagmanager.com/gtm.js?id=GTM-BLOQUEADO";
      document.head.appendChild(s);
    });
  });
  await abre(page, "/index.html?utm_source=teste");
  const [aba] = await Promise.all([context.waitForEvent("page"), page.locator(".hero [data-checkout-link]").click()]);
  await aba.waitForLoadState("domcontentloaded");
  expect(aba.url()).toMatch(/^https:\/\/pay\.hotmart\.com\/.*utm_source=teste/);
  expect(erros).toEqual([]);
});

test("sem armazenamento (navegação privada restrita): a página e o checkout funcionam com os parâmetros do endereço", async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("bloqueado", "SecurityError"); } });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await abre(page, "/index.html?utm_source=teste&gclid=G1");
  const [aba] = await Promise.all([context.waitForEvent("page"), page.locator(".hero [data-checkout-link]").click()]);
  await aba.waitForLoadState("domcontentloaded");
  expect(buscaDoCheckout(aba.url())).toBe("utm_source=teste&gclid=G1");
  expect(erros).toEqual([]);
});

test("a landing não chama nenhum domínio de fora nem grava cookie (nenhuma medição instalada ainda)", async ({ page }) => {
  const fora = new Set();
  page.on("request", (r) => { const h = new URL(r.url()).hostname; if (!["localhost", "127.0.0.1"].includes(h)) fora.add(h); });
  await abre(page, "/index.html?" + RASTREIO);
  await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } });
  expect([...fora]).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).toBe("");
});
