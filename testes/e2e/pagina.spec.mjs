// A landing como uma pessoa usa: abrir, esperar a abertura, rolar tudo, tocar
// nos botões. Cada teste falha se a coisa que ele confere estiver quebrada.
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { vigia, semProblemas, abre, percorre } from "./ajuda.mjs";

const HOTMART = /^https:\/\/pay\.hotmart\.com\//;

test("abre, a abertura termina e o topo mostra título e botão", async ({ page }) => {
  const problemas = vigia(page);
  await abre(page);
  await expect(page.locator("#hero-headline")).toHaveCSS("opacity", "1");
  await expect(page.locator("#hero-actions-el")).toHaveCSS("opacity", "1");
  await expect(page.locator(".hero [data-checkout-link]")).toBeVisible();
  await expect(page.locator("#intro-stage")).toHaveCount(0); // a camada da abertura sai da página
  semProblemas(problemas);
});

test("percorre a página inteira sem erro, sem arquivo quebrado e sem rolagem lateral", async ({ page }) => {
  const problemas = vigia(page);
  await abre(page);
  await percorre(page);
  // Toda seção principal existe e tem altura.
  for (const id of ["topo", "reconhecimento", "metodo", "aplicacao", "depoimentos", "vivi", "modulos", "beneficios", "oferta", "faq"]) {
    const box = await page.locator("#" + id).boundingBox();
    expect(box && box.height, `seção #${id}`).toBeGreaterThan(100);
  }
  // Nenhuma imagem que o navegador tentou baixar falhou; as que têm lugar na página carregaram.
  const imagens = await page.evaluate(() => [...document.images].map((i) => ({
    src: i.getAttribute("src"), quebrada: i.complete && i.naturalWidth === 0,
    comLugar: i.getClientRects().length > 0 && i.getAttribute("loading") !== "lazy",
    carregada: i.naturalWidth > 0,
  })));
  expect(imagens.filter((i) => i.quebrada).map((i) => i.src), "imagens quebradas").toEqual([]);
  expect(imagens.filter((i) => i.comLugar && !i.carregada).map((i) => i.src), "imagens sem carregar").toEqual([]);
  // Fontes do próprio site.
  expect(await page.evaluate(() => document.fonts.check("800 20px Manrope") && document.fonts.check('400 17px "Nunito Sans"'))).toBe(true);
  // Nada vaza pro lado.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  semProblemas(problemas);
});

test("todos os botões de compra levam à Hotmart, em aba nova, com os parâmetros do anúncio", async ({ page }) => {
  await abre(page, "/index.html?utm_source=meta&utm_campaign=lancamento&fbclid=abc123");
  const links = page.locator("[data-checkout-link]");
  expect(await links.count()).toBe(5);
  for (const link of await links.all()) {
    const href = await link.getAttribute("href");
    expect(href).toMatch(HOTMART);
    const url = new URL(href);
    expect(url.searchParams.get("utm_source")).toBe("meta");
    expect(url.searchParams.get("utm_campaign")).toBe("lancamento");
    expect(url.searchParams.get("fbclid")).toBe("abc123");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  }
});

test("clique duplo e cliques rápidos no botão de compra abrem uma aba só", async ({ page, context }) => {
  await context.route(/hotmart\.com/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "checkout" }));
  await abre(page);
  const abas = [];
  context.on("page", (p) => abas.push(p));
  const botao = page.locator("#oferta [data-checkout-link]");
  await botao.scrollIntoViewIfNeeded();
  // Espera o cartão da oferta terminar de entrar (ele sobe 30px ao aparecer):
  // medir no meio da subida fazia os cliques seguintes caírem fora do botão.
  await expect(page.locator("#oferta .offer-card")).toHaveClass(/is-visible/);
  await page.waitForTimeout(900);
  const box = await botao.boundingBox();
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.dblclick(x, y);
  await page.mouse.click(x, y);
  await page.waitForTimeout(1500);
  expect(abas.length, "abas abertas pelo clique duplo + clique rápido").toBe(1);
  // Um clique normal depois continua funcionando (o botão não fica travado).
  // A aba da Hotmart abriu na frente: a pessoa volta pra aba do site.
  await page.bringToFront();
  await page.mouse.click(x, y);
  await page.waitForTimeout(1500);
  expect(abas.length).toBe(2);
});

test("depoimento: clique duplo deixa o vídeo aberto; Esc fecha e devolve a rolagem", async ({ page }) => {
  const problemas = vigia(page);
  await abre(page);
  const video = page.locator(".depo-video").first();
  await video.scrollIntoViewIfNeeded();
  await video.dblclick();
  await expect(page.locator(".depo-modal.is-aberto")).toHaveCount(1);
  await expect(page.locator(".depo-modal")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".depo-modal")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
  semProblemas(problemas);
});

test("perguntas e módulos abrem e fecham, um de cada vez, mesmo com cliques rápidos", async ({ page }) => {
  await abre(page);
  for (const lista of ["#faq", "#accordion-modulos"]) {
    const botoes = page.locator(`${lista} .accordion-trigger`);
    await botoes.first().scrollIntoViewIfNeeded();
    await botoes.nth(1).click();
    await expect(botoes.nth(1)).toHaveAttribute("aria-expanded", "true");
    await botoes.nth(2).click();
    await expect(botoes.nth(2)).toHaveAttribute("aria-expanded", "true");
    await expect(botoes.nth(1)).toHaveAttribute("aria-expanded", "false");
    for (let i = 0; i < 5; i++) await botoes.nth(2).click({ delay: 0 }); // número ímpar de cliques: fecha
    await expect(botoes.nth(2)).toHaveAttribute("aria-expanded", "false");
    expect(await page.locator(`${lista} .accordion-item.open`).count()).toBe(0);
  }
});

test("escada: tocar num nível põe o cartão dele em foco", async ({ page }) => {
  await abre(page);
  const numeros = page.locator(".escada-num");
  expect(await numeros.count()).toBe(7);
  await numeros.first().scrollIntoViewIfNeeded();
  for (const i of [4, 1, 6]) {
    await numeros.nth(i).click();
    await expect(page.locator(".escada-card").nth(i)).toHaveClass(/is-active/);
    await expect(numeros.nth(i)).toHaveAttribute("aria-selected", "true");
    expect(await page.locator(".escada-card.is-active").count()).toBe(1);
  }
});

test("todo link interno tem destino e as páginas de apoio existem", async ({ page, request }) => {
  await abre(page);
  const destinos = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')]
    .map((a) => a.getAttribute("href").slice(1)).filter(Boolean)
    .filter((id) => !document.getElementById(id)));
  expect(destinos, "âncoras sem destino").toEqual([]);
  for (const pagina of ["privacidade.html", "termos.html", "suporte.html"]) {
    expect((await request.get("/" + pagina)).status(), pagina).toBe(200);
  }
});

for (const pagina of ["privacidade.html", "termos.html", "suporte.html"]) {
  test(`página de apoio ${pagina} abre sem erro e com botão de compra`, async ({ page }) => {
    const problemas = vigia(page);
    await page.goto("/" + pagina, { waitUntil: "load" });
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("[data-checkout-link]")).toHaveAttribute("href", HOTMART);
    await expect(page.locator(".apoio-voltar")).toHaveAttribute("href", /index\.html/);
    semProblemas(problemas);
  });
}

test("parâmetros de anúncio estranhos não quebram a página", async ({ page }) => {
  for (const q of ["?utm_source=&utm_medium=&=&&", "?utm_campaign=" + "x".repeat(3000), "?utm_content=%3Cscript%3Ealert(1)%3C%2Fscript%3E", "?%", "?utm_source=%ZZ", "?utm_source=a&utm_source=b#faq"]) {
    const problemas = vigia(page);
    await abre(page, "/index.html" + q);
    const href = await page.locator("#oferta [data-checkout-link]").getAttribute("href");
    expect(() => new URL(href), q).not.toThrow();
    expect(href).toMatch(HOTMART);
    semProblemas(problemas);
  }
});

test("abertura: o túnel toca do começo ao fim sem voltar e sem mudar de ritmo", async ({ page }) => {
  // O Chromium dos testes não toca H.264 (o formato do túnel): sem isto, o
  // vídeo nunca tocava aqui e a abertura seguia só com a imagem. Uma cópia
  // pequena em VP9, com o mesmo tempo, faz o vídeo tocar de verdade.
  // No iPhone, mudar o ritmo (playbackRate) do vídeo tocando fazia o túnel
  // voltar pro começo logo depois de "E se, em vez de travar…".
  const amostra = fs.readFileSync(new URL("../amostras/tunel-vp9.webm", import.meta.url));
  await page.route(/tunel-(celular|desktop)\.mp4/, (r) => r.fulfill({ status: 200, contentType: "video/webm", body: amostra }));
  await page.addInitScript(() => {
    window.__ritmos = []; window.__quadros = [];
    const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "playbackRate");
    Object.defineProperty(HTMLMediaElement.prototype, "playbackRate", { get() { return d.get.call(this); }, set(v) { window.__ritmos.push(v); d.set.call(this, v); } });
    document.addEventListener("DOMContentLoaded", () => {
      const v = document.getElementById("tunnel-video");
      if (!v || !v.requestVideoFrameCallback) return;
      const cb = (_, m) => { window.__quadros.push(m.mediaTime); if (v.isConnected) v.requestVideoFrameCallback(cb); };
      v.requestVideoFrameCallback(cb);
    });
  });
  await abre(page);
  const { ritmos, quadros } = await page.evaluate(() => ({ ritmos: window.__ritmos, quadros: window.__quadros }));
  expect(quadros.length, "o vídeo precisa ter tocado").toBeGreaterThan(100);
  const voltas = quadros.filter((q, i) => i > 0 && q < quadros[i - 1] - 0.001);
  expect(voltas, "quadros que voltaram no tempo").toEqual([]);
  expect(Math.max(...quadros), "o túnel chega na porta de luz").toBeGreaterThan(5);
  expect(ritmos, "mudanças de ritmo do vídeo").toEqual([]);
});
