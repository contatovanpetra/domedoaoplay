// Usabilidade sob estresse (auditoria geral final, 30/set): quem toca rápido
// demais, rola rápido, tem internet muito lenta e celular fraco, gira o
// celular, usa tela pequena ou entra sem JavaScript ("reduzir movimento" fica
// em acessibilidade.spec.mjs).
// A página não pode travar, ficar num estado errado nem mostrar erro.
import { test, expect } from "@playwright/test";
import { abre, vigia, semProblemas, percorre } from "./ajuda.mjs";

const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

test("Escada: toques seguidos nos níveis terminam no último tocado, com um cartão só ativo e à vista", async ({ page }) => {
  const problemas = vigia(page);
  await abre(page);
  const numeros = page.locator(".escada-num");
  await numeros.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  // Sem esperar nada entre um toque e outro (mais rápido que um dedo).
  await page.evaluate(() => {
    const b = document.querySelectorAll(".escada-num");
    for (const i of [3, 5, 0, 6, 1, 4, 2]) b[i].click();
  });
  await page.waitForTimeout(900);
  await expect(page.locator(".escada-card.is-active")).toHaveCount(1);
  await expect(page.locator(".escada-card").nth(2)).toHaveClass(/is-active/);
  await expect(page.locator('.escada-num[aria-selected="true"]')).toHaveCount(1);
  await expect(numeros.nth(2)).toHaveAttribute("aria-selected", "true");
  // O cartão ativo está dentro da vitrine (o carrossel parou no lugar certo).
  const dentro = await page.evaluate(() => {
    const v = document.querySelector(".escada-vitrine").getBoundingClientRect();
    const c = document.querySelector(".escada-card.is-active").getBoundingClientRect();
    const meio = c.left + c.width / 2;
    return meio > v.left && meio < v.right;
  });
  expect(dentro, "cartão ativo à vista").toBe(true);
  semProblemas(problemas);
});

test("Escada: play/pausa tocado muitas vezes fica coerente (rótulo, ícone e avanço)", async ({ page }) => {
  await abre(page);
  const botao = page.locator(".escada-play-pause");
  await botao.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.evaluate(() => { const b = document.querySelector(".escada-play-pause"); for (let i = 0; i < 7; i++) b.click(); });
  // Número ímpar de toques: fica pausado.
  await expect(botao).not.toHaveAttribute("aria-label", "Pausar avanço automático");
  await expect(botao.locator(".icon-play")).toBeVisible();
  await expect(botao.locator(".icon-pause")).toBeHidden();
  const antes = await page.locator(".escada-card.is-active").getAttribute("data-index");
  await page.waitForTimeout(5000);
  expect(await page.locator(".escada-card.is-active").getAttribute("data-index"), "pausado não avança").toBe(antes);
  await botao.click();
  await expect(botao).toHaveAttribute("aria-label", "Pausar avanço automático");
  await expect(botao.locator(".icon-pause")).toBeVisible();
});

test("vídeos dos depoimentos: abrir e fechar muitas vezes seguidas não prende a rolagem, o foco nem a página", async ({ page }) => {
  const problemas = vigia(page);
  await abre(page);
  const videos = page.locator(".depo-video");
  await videos.first().scrollIntoViewIfNeeded();
  for (let i = 0; i < 6; i++) {
    const v = videos.nth(i % 3);
    await v.scrollIntoViewIfNeeded();
    await v.click();
    await expect(page.locator(".depo-modal")).toHaveCount(1);
    if (i % 2) await page.keyboard.press("Escape");
    else await page.locator(".depo-modal-fechar").click();
    await expect(page.locator(".depo-modal")).toHaveCount(0);
  }
  // Toque duplo que cai no × logo depois de abrir: o vídeo fica aberto (de
  // propósito, nos primeiros 400 ms o clique não fecha) e o Esc fecha.
  await page.evaluate(() => {
    document.querySelector(".depo-video").click();
    document.querySelector(".depo-modal-fechar").click();
  });
  await page.waitForTimeout(300);
  await expect(page.locator(".depo-modal.is-aberto")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".depo-modal")).toHaveCount(0, { timeout: 5000 });
  const estado = await page.evaluate(() => ({
    overflow: document.documentElement.style.overflow + document.body.style.overflow,
    inerte: [...document.querySelectorAll("[inert]")].map((e) => e.tagName + "." + e.className),
  }));
  expect(estado.overflow, "a rolagem volta").toBe("");
  expect(estado.inerte, "nada fica inerte").toEqual([]);
  const y = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y);
  semProblemas(problemas);
});

test("rolagem muito rápida pela ponte (Dá pra sair disso → Escada), pra cima e pra baixo, termina no estado certo", async ({ page }) => {
  test.skip(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), "sem ponte com movimento reduzido");
  const problemas = vigia(page);
  await abre(page);
  const { topo, fim } = await page.evaluate(() => {
    const p = document.querySelector(".metodo-ponte");
    const t = p.querySelector(".metodo-ponte-trilho");
    const topo = p.getBoundingClientRect().top + scrollY;
    return { topo, fim: topo + t.offsetHeight };
  });
  await page.evaluate(async ({ topo, fim }) => {
    for (let i = 0; i < 40; i++) {
      scrollTo(0, i % 2 ? topo - 400 : fim + 400);
      await new Promise((r) => requestAnimationFrame(r));
    }
  }, { topo, fim });
  const ops = async () => page.evaluate(() => {
    const p = document.querySelector(".metodo-ponte");
    return { frase: +p.style.getPropertyValue("--frase-op"), escada: +p.style.getPropertyValue("--escada-op") };
  });
  await page.evaluate((y) => scrollTo(0, y), fim + 10);
  await page.waitForTimeout(400);
  expect(await ops(), "no fim da ponte: escada inteira, frase apagada").toEqual({ frase: 0, escada: 1 });
  await page.evaluate((y) => scrollTo(0, y), topo);
  await page.waitForTimeout(400);
  expect(await ops(), "no começo da ponte: frase inteira, escada apagada").toEqual({ frase: 1, escada: 0 });
  semProblemas(problemas);
});

test("tocar, clicar e rolar durante a abertura não trava a página", async ({ page }) => {
  const problemas = vigia(page);
  await page.addInitScript(() => { document.addEventListener("abertura:fim", () => { window.__yNoFim = scrollY; }); });
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  // Só enquanto a abertura está na tela: o primeiro toque adianta e ela acaba
  // em menos de 1 s; rolar depois disso já é rolar a página de propósito.
  const naAbertura = () => page.evaluate(() => document.documentElement.classList.contains("abertura-on"));
  for (let i = 0; i < 8 && await naAbertura(); i++) {
    await page.mouse.click(200, 300);
    if (await naAbertura()) await page.mouse.wheel(0, i % 2 ? -500 : 900);
    if (await naAbertura()) await page.keyboard.press(i % 2 ? "PageDown" : "Space");
  }
  await expect(page.locator("html")).not.toHaveClass(/abertura-on/, { timeout: 20_000 });
  expect(await page.evaluate(() => window.__yNoFim), "a abertura acaba com a página no topo").toBe(0);
  // (um último giro da roda pode ter caído depois do fim e rolado a página)
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator(".hero [data-checkout-link]")).toBeVisible();
  const y = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => scrollY), { message: "a rolagem funciona depois" }).toBeGreaterThan(y);
  semProblemas(problemas);
});

test("internet muito lenta (3G) e celular fraco: a abertura não prende e o botão do topo funciona", async ({ page, context }) => {
  test.setTimeout(150_000);
  await context.route(/pay\.hotmart\.com/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>checkout simulado</title>" }));
  const problemas = vigia(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  // "3G lento" do Chrome: 400 ms de latência, ~50 KB/s.
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 25 * 1024 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const t0 = Date.now();
  await page.goto("/index.html?utm_source=teste", { waitUntil: "commit" });
  const botao = page.locator(".hero [data-checkout-link]");
  await expect(botao).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("html")).not.toHaveClass(/abertura-on/, { timeout: 60_000 });
  const segundos = (Date.now() - t0) / 1000;
  const [aba] = await Promise.all([context.waitForEvent("page"), botao.click()]);
  await aba.waitForLoadState("domcontentloaded");
  expect(aba.url()).toContain("utm_source=teste");
  console.log(`3G lento + CPU 4x: topo com botão liberado em ${segundos.toFixed(1)} s`);
  // Pedidos cortados pela rede lenta não contam (o vídeo da abertura é cortado de propósito).
  expect(problemas.js).toEqual([]);
  expect(problemas.console).toEqual([]);
  expect(problemas.http).toEqual([]);
});

test("girar o celular (em pé ↔ deitado) no meio da página não quebra nada", async ({ page }) => {
  const problemas = vigia(page);
  await abre(page);
  const inicial = page.viewportSize();
  for (const id of ["#metodo", "#depoimentos", "#oferta"]) {
    await page.locator(id).scrollIntoViewIfNeeded();
    await page.setViewportSize({ width: inicial.height, height: inicial.width });
    await page.waitForTimeout(500);
    expect(await semRolagemLateral(page), `deitado em ${id}`).toBe(true);
    await page.setViewportSize(inicial);
    await page.waitForTimeout(500);
    expect(await semRolagemLateral(page), `em pé em ${id}`).toBe(true);
  }
  await percorre(page);
  await expect(page.locator(".site-header [data-checkout-link]")).toBeVisible();
  semProblemas(problemas);
});

for (const [nome, largura, altura] of [["celular pequeno (320 px)", 320, 568], ["celular deitado", 844, 390], ["tablet", 768, 1024], ["tela grande (2560 px)", 2560, 1440]]) {
  test(`${nome}: a página inteira cabe na largura e os botões de compra aparecem`, async ({ page }) => {
    const problemas = vigia(page);
    await page.setViewportSize({ width: largura, height: altura });
    await abre(page);
    await percorre(page);
    expect(await semRolagemLateral(page)).toBe(true);
    // Nenhum texto sai pela direita da tela (o que o overflow esconderia).
    const fora = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,p,li,a,button")]
      .filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && s.visibility !== "hidden" && r.right > innerWidth + 1 && !e.closest(".escada-track, .depo-palco, [aria-hidden='true'], .sr-only"); })
      .map((e) => e.tagName + ": " + e.textContent.trim().slice(0, 40)));
    expect(fora).toEqual([]);
    for (const id of ["#oferta", ".final-cta"]) {
      const cta = page.locator(`${id} [data-checkout-link]`);
      if (await cta.count()) { await cta.scrollIntoViewIfNeeded(); await expect(cta).toBeVisible(); }
    }
    semProblemas(problemas);
  });
}

test("sem JavaScript: o conteúdo aparece e os botões de compra levam à Hotmart", async ({ browser }, info) => {
  const context = await browser.newContext({ ...info.project.use, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/index.html", { waitUntil: "load" });
  await expect(page.locator("h1")).toBeVisible();
  const invisiveis = await page.evaluate(() => [...document.querySelectorAll("main h2, main h3:not(.sr-only)")]
    .filter((e) => { let n = e; while (n && n !== document.body) { const s = getComputedStyle(n); if (s.opacity === "0" || s.visibility === "hidden") return true; n = n.parentElement; } return false; })
    .filter((e) => !e.closest("[hidden], .accordion-panel, .escada-card:not(.is-active)"))
    .map((e) => e.textContent.trim().slice(0, 40)));
  expect(invisiveis, "títulos escondidos sem JS").toEqual([]);
  const hrefs = await page.locator("[data-checkout-link]").evaluateAll((as) => as.map((a) => a.href));
  expect(hrefs.length).toBe(5);
  for (const h of hrefs) expect(h).toMatch(/^https:\/\/pay\.hotmart\.com\//);
  await context.close();
});
