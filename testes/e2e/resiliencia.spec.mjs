// O que acontece quando alguma coisa dá errado: um arquivo não chega, a rede
// cai, um recurso do navegador falha. Cada caso aqui reproduz um bug que a
// página já teve (auditoria de 29/set) e confere que ele não volta.
import { test, expect } from "@playwright/test";
import { abre, percorre } from "./ajuda.mjs";

const HOTMART = /^https:\/\/pay\.hotmart\.com\//;

async function topoFunciona(page) {
  await expect(page.locator("#hero-headline")).toHaveCSS("opacity", "1", { timeout: 20_000 });
  await expect(page.locator("#hero-actions-el")).toHaveCSS("opacity", "1");
  await expect(page.locator(".hero [data-checkout-link]")).toHaveAttribute("href", HOTMART);
  await expect(page.locator("html")).not.toHaveClass(/abertura-on/, { timeout: 25_000 });
}

test("main.js não chega (404): o topo aparece e o botão leva à Hotmart", async ({ page }) => {
  // Antes: título e botão invisíveis e os 5 botões com href="#".
  await page.route(/\/js\/main\.js/, (r) => r.fulfill({ status: 404, body: "" }));
  await page.goto("/index.html", { waitUntil: "load" });
  await topoFunciona(page);
});

test("a biblioteca de animação (GSAP) não chega: a página abre sem a abertura", async ({ page }) => {
  await page.route(/gsap\.min\.js/, (r) => r.fulfill({ status: 404, body: "" }));
  await page.goto("/index.html", { waitUntil: "load" });
  await topoFunciona(page);
});

test("um erro no meio do main.js não derruba o resto e aparece no console", async ({ page }) => {
  // Antes: o erro parava tudo o que vinha depois na lista (topo invisível).
  await page.addInitScript(() => { window.IntersectionObserver = function () { throw new Error("IntersectionObserver simulado quebrado"); }; });
  const consoleErros = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErros.push(m.text()); });
  await page.goto("/index.html", { waitUntil: "load" });
  await topoFunciona(page);
  expect(consoleErros.join(" "), "o erro precisa aparecer no console, não sumir").toMatch(/falha ao ligar/);
  // As seções não ficam escondidas esperando um observador que não existe.
  const escondidas = await page.locator(".reveal:not(.is-visible)").count();
  expect(escondidas).toBe(0);
  // O resto continua: perguntas abrem.
  const pergunta = page.locator("#faq .accordion-trigger").first();
  await pergunta.scrollIntoViewIfNeeded();
  await pergunta.click();
  await expect(pergunta).toHaveAttribute("aria-expanded", "true");
});

test("o vídeo da abertura dá erro ao tocar: a abertura não fica presa", async ({ page }) => {
  // Antes: a camada da abertura ficava na tela (presa por até 20 s).
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = function () { throw new Error("play simulado quebrado"); }; });
  await page.goto("/index.html", { waitUntil: "load" });
  await expect(page.locator("html")).not.toHaveClass(/abertura-on/, { timeout: 3_000 });
  await topoFunciona(page);
});

test("o vídeo da abertura não chega: a abertura segue com a imagem e libera", async ({ page }) => {
  await page.route(/\.mp4/, (r) => r.abort("failed"));
  await page.goto("/index.html", { waitUntil: "load" });
  await topoFunciona(page);
});

test("as fontes não chegam: a página segue funcionando", async ({ page }) => {
  await page.route(/\.woff2/, (r) => r.abort("failed"));
  await abre(page);
  await topoFunciona(page);
});

test("a internet cai com a página aberta: sem erro, sem pedidos em loop, e as imagens voltam quando ela volta", async ({ page, context }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  let pedidos = 0;
  page.on("request", () => pedidos++);
  await abre(page);
  await context.setOffline(true);
  await percorre(page);
  const antes = pedidos;
  await page.waitForTimeout(5000);
  expect(pedidos - antes, "pedidos disparados sozinhos com a página parada e sem internet").toBe(0);
  const quebradasOff = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length);
  expect(quebradasOff, "o teste precisa ter quebrado imagens pra valer").toBeGreaterThan(0);
  await context.setOffline(false);
  await page.waitForTimeout(3000);
  await percorre(page);
  // Antes: continuavam quebradas mesmo com a internet de volta.
  const quebradas = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute("src")));
  expect(quebradas).toEqual([]);
  expect(erros).toEqual([]);
});

test("uso longo: rolar e mexer várias vezes não acumula memória, listeners nem pedidos", async ({ page }) => {
  test.slow();
  await abre(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const mede = async () => {
    await cdp.send("HeapProfiler.collectGarbage");
    const m = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
    return { heap: m.JSHeapUsedSize, listeners: m.JSEventListeners, nos: m.Nodes };
  };
  let pedidos = 0;
  page.on("request", () => pedidos++);
  const rodada = async (i) => {
    await percorre(page);
    await page.evaluate(() => scrollTo(0, 0));
    const pergunta = page.locator("#faq .accordion-trigger").nth(i % 5);
    await pergunta.scrollIntoViewIfNeeded();
    await pergunta.click();
    const video = page.locator(".depo-video").first();
    await video.scrollIntoViewIfNeeded();
    await video.click();
    await page.waitForTimeout(450);
    await page.keyboard.press("Escape");
  };
  for (let i = 0; i < 2; i++) await rodada(i); // aquece (imagens, fontes, primeira vez de cada coisa)
  const base = await mede();
  const pedidosBase = pedidos;
  for (let i = 2; i < 8; i++) await rodada(i);
  const fim = await mede();
  expect(fim.listeners - base.listeners, "listeners a mais depois de 6 rodadas").toBeLessThanOrEqual(2);
  expect(fim.heap / base.heap, "memória JS depois de 6 rodadas / antes").toBeLessThan(1.3);
  expect(fim.nos - base.nos, "nós do DOM a mais").toBeLessThan(60);
  expect(pedidos - pedidosBase, "pedidos novos depois que tudo já carregou").toBeLessThanOrEqual(2);
});
