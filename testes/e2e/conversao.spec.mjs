// A jornada de quem vem de um anúncio até o checkout (QA de conversão, 29/set).
// O checkout da Hotmart é simulado (nenhuma compra, nenhum pedido pra Hotmart):
// o que se confere é o endereço que a aba nova abre.
import { test, expect } from "@playwright/test";
import { abre } from "./ajuda.mjs";

const Q = "?utm_source=meta&utm_medium=paid&utm_campaign=teste&fbclid=XyZ";
const HOTMART = /^https:\/\/pay\.hotmart\.com\//;

function comUtm(url) {
  const u = new URL(url);
  return u.searchParams.get("utm_source") === "meta" && u.searchParams.get("utm_campaign") === "teste" && u.searchParams.get("fbclid") === "XyZ";
}

test.beforeEach(async ({ context }) => {
  await context.route(/pay\.hotmart\.com/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>checkout simulado</title>" }));
});

async function clicaEPegaAba(page, context, botao) {
  await botao.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200); // o bloco termina de entrar na tela
  const [aba] = await Promise.all([context.waitForEvent("page"), botao.click()]);
  await aba.waitForLoadState("domcontentloaded");
  const url = aba.url();
  await aba.close();
  await page.bringToFront();
  await page.waitForTimeout(1100);
  return url;
}

test("cada um dos 5 botões de compra da página abre uma aba só, na Hotmart, com os parâmetros do anúncio", async ({ page, context }) => {
  await abre(page, "/index.html" + Q);
  const botoes = page.locator("[data-checkout-link]");
  expect(await botoes.count()).toBe(5);
  for (let i = 0; i < 5; i++) {
    const url = await clicaEPegaAba(page, context, botoes.nth(i));
    expect(url, `botão ${i + 1}`).toMatch(HOTMART);
    expect(comUtm(url), `botão ${i + 1} com UTMs: ${url}`).toBe(true);
    expect(page.url(), "a landing continua aberta na mesma aba").toContain("index.html");
  }
});

test("quem passa pelos Termos antes de comprar não perde os parâmetros do anúncio", async ({ page, context }) => {
  // Antes: o botão dos Termos (e o da landing, voltando pela logo) ia sem UTM.
  await abre(page, "/index.html" + Q);
  const rodape = page.locator('.footer-legal a[href="termos.html"]');
  await rodape.scrollIntoViewIfNeeded();
  await rodape.click();
  await page.waitForURL(/termos\.html$/);
  expect(comUtm(await clicaEPegaAba(page, context, page.locator("[data-checkout-link]")))).toBe(true);
  await page.locator(".site-header .logo").click();
  await page.waitForURL(/index\.html$/);
  await expect(page.locator("html")).not.toHaveClass(/abertura-on/, { timeout: 20_000 });
  expect(comUtm(await clicaEPegaAba(page, context, page.locator("#oferta [data-checkout-link]")))).toBe(true);
});

test("um anúncio novo na mesma aba vale mais que o anterior", async ({ page }) => {
  await abre(page, "/index.html" + Q);
  await abre(page, "/index.html?utm_source=google&utm_campaign=outra");
  const href = await page.locator("#oferta [data-checkout-link]").getAttribute("href");
  const u = new URL(href);
  expect(u.searchParams.get("utm_source")).toBe("google");
  expect(u.searchParams.get("utm_campaign")).toBe("outra");
});

test("rede lenta: tocar no botão antes do main.js chegar já leva os parâmetros do anúncio", async ({ page, context }) => {
  // Antes: o botão já funcionava, mas ia pra Hotmart sem UTM.
  await page.route(/\/js\/main\.js/, async (r) => { await new Promise((x) => setTimeout(x, 9000)); await r.continue(); });
  await page.goto("/index.html" + Q, { waitUntil: "commit" });
  await expect(page.locator("#hero-actions-el")).toHaveCSS("opacity", "1", { timeout: 8000 }); // a trava de 5 s mostra o topo
  expect(await page.evaluate(() => Boolean(window.mainPronto)), "o main.js ainda não pode ter chegado").toBe(false);
  const botao = page.locator(".hero [data-checkout-link]");
  const [aba] = await Promise.all([context.waitForEvent("page"), botao.click()]);
  await aba.waitForLoadState("domcontentloaded");
  expect(aba.url()).toMatch(HOTMART);
  expect(comUtm(aba.url()), aba.url()).toBe(true);
});

test("voltar e avançar entre a landing e os Termos: volta no mesmo lugar, sem repetir a abertura", async ({ page }) => {
  await abre(page, "/index.html" + Q);
  const rodape = page.locator('.footer-legal a[href="termos.html"]');
  await rodape.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  await rodape.click();
  await page.waitForURL(/termos\.html$/);
  await page.goBack();
  await page.waitForURL(/index\.html/);
  expect(page.url()).toContain("utm_source=meta");
  await expect(page.locator("html")).not.toHaveClass(/abertura-on/, { timeout: 3000 });
  await page.waitForTimeout(800);
  expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(100);
  await page.goForward();
  await page.waitForURL(/termos\.html$/);
  await expect(page.locator("h1")).toBeVisible();
});

test("atualizar a página no meio mantém o lugar, o endereço e os parâmetros", async ({ page }) => {
  await abre(page, "/index.html" + Q);
  await page.locator("#depoimentos").scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/abertura-on/, { timeout: 3000 });
  expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(100);
  expect(comUtm(await page.locator("#oferta [data-checkout-link]").getAttribute("href"))).toBe(true);
});

test("entrar pelo meio da página (#oferta, #faq) mostra a seção certa, sem o título embaixo do menu", async ({ page }) => {
  for (const id of ["oferta", "faq", "depoimentos"]) {
    await page.goto(`/index.html${Q}#${id}`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const r = await page.evaluate((id) => {
      const t = document.getElementById(id).querySelector("h2") || document.getElementById(id);
      return { topo: t.getBoundingClientRect().top, menu: document.querySelector(".site-header").getBoundingClientRect().bottom, alto: innerHeight };
    }, id);
    expect(r.topo, `#${id}: título abaixo do menu`).toBeGreaterThanOrEqual(r.menu - 2);
    expect(r.topo, `#${id}: título na tela`).toBeLessThan(r.alto);
  }
});

test("nenhuma camada cobre os botões de compra (o ponto do toque é o próprio botão)", async ({ page }) => {
  await abre(page);
  const problemas = await page.evaluate(async () => {
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const ruins = [];
    for (const el of document.querySelectorAll("[data-checkout-link]")) {
      for (const f of [0.2, 0.5, 0.8]) {
        scrollTo(0, Math.max(0, el.getBoundingClientRect().top + scrollY - innerHeight * f));
        await espera(900);
        const b = el.getBoundingClientRect();
        if (b.bottom < 0 || b.top > innerHeight) continue;
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (!hit || !(hit === el || el.contains(hit))) ruins.push(`${el.textContent.trim()} a ${f * 100}% da tela: coberto por ${hit && hit.className}`);
      }
    }
    return ruins;
  });
  expect(problemas).toEqual([]);
});

test("preço, módulos, aulas e garantia são os mesmos na página e nos Termos", async ({ page }) => {
  await abre(page);
  const pagina = await page.evaluate(() => ({
    preco: document.querySelector("#oferta").textContent.match(/R\$\s?([\d.,]+)/)[1],
    aulasPorModulo: [...document.querySelectorAll("#accordion-modulos .accordion-item")].map((m) => m.querySelectorAll(".aula-num").length),
    contagemDita: [...document.querySelectorAll("#accordion-modulos .module-count")].map((c) => parseInt(c.textContent, 10)),
    titulo: document.getElementById("modulos-title").textContent,
    garantia: /7 dias/.test(document.querySelector("#oferta").textContent),
  }));
  expect(pagina.aulasPorModulo, "cada módulo diz quantas aulas tem").toEqual(pagina.contagemDita);
  const total = pagina.aulasPorModulo.reduce((a, b) => a + b, 0);
  expect(pagina.titulo).toContain(`${pagina.aulasPorModulo.length} módulos`);
  expect(pagina.titulo).toContain(`${total} aulas`);
  expect(pagina.garantia).toBe(true);
  await page.goto("/termos.html");
  const termos = await page.locator("main").textContent();
  expect(termos).toContain(`R$ ${pagina.preco}`);
  expect(termos).toContain(`${pagina.aulasPorModulo.length} módulos e ${total} aulas`);
  expect(termos).toMatch(/7 dias/);
});
