// Acessibilidade (auditoria pré-lançamento, 30/set, WCAG 2.2 A/AA). O que dá
// pra conferir de forma objetiva: nenhuma violação automática do axe,
// teclado, foco, abas da escada, perguntas, vídeo aberto, pausa dos vídeos e
// o que o leitor de tela recebe. Contraste sobre foto (medido à parte, pixel
// a pixel), leitor de tela de verdade e julgamento humano ficam no
// relatório, não aqui.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { abre, percorre } from "./ajuda.mjs";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

for (const pagina of ["index.html", "termos.html", "privacidade.html", "suporte.html"]) {
  test(`axe: nenhuma violação WCAG A/AA em ${pagina}`, async ({ page }) => {
    await abre(page, "/" + pagina);
    await percorre(page);
    const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}

test("vídeos dos depoimentos: com vídeo de verdade, há um botão pra pausar e retomar os três (2.2.2)", async ({ page }) => {
  // Os vídeos ainda não foram gravados: simula os três cartões com vídeo.
  await page.route(/\/index\.html/, async (rota) => {
    const r = await rota.fetch();
    const html = (await r.text()).replaceAll('<figure class="depo-card">', '<figure class="depo-card" data-video="amostra.webm">');
    await rota.fulfill({ response: r, body: html });
  });
  await page.route(/amostra\.webm/, (rota) => rota.fulfill({ path: "testes/amostras/tunel-vp9.webm", contentType: "video/webm" }));
  await abre(page);
  const botoes = page.locator(".depo-pausa");
  await expect(botoes).toHaveCount(3);
  await page.locator("#depoimentos").scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll(".depo-video-mudo")].some((v) => !v.paused))).toBe(true);
  await expect(botoes.first()).toHaveAccessibleName("Pausar os vídeos");
  await botoes.first().click();
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll(".depo-video-mudo")].every((v) => v.paused))).toBe(true);
  await expect(botoes.nth(1)).toHaveAccessibleName("Retomar os vídeos");
  // Pausado pela pessoa, sair e voltar à seção não liga de novo.
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.locator("#depoimentos").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => [...document.querySelectorAll(".depo-video-mudo")].every((v) => v.paused))).toBe(true);
  await botoes.first().focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll(".depo-video-mudo")].some((v) => !v.paused))).toBe(true);
});

test("todo botão e link visível tem nome, e o nome contém o texto que aparece", async ({ page }) => {
  await abre(page);
  const ruins = await page.evaluate(() => [...document.querySelectorAll("a[href], button, [role=button], [role=tab]")]
    .filter((e) => e.checkVisibility() && !e.closest("[aria-hidden=true]"))
    .map((e) => {
      const visivel = e.textContent.trim().replace(/\s+/g, " ");
      const rotulo = e.getAttribute("aria-label");
      const nome = (rotulo || visivel).trim();
      const img = e.querySelector("img[alt]");
      if (!nome && !(img && img.alt)) return "sem nome: " + e.outerHTML.slice(0, 80);
      // Rótulo no nome (2.5.3): o nome falado contém o texto que a pessoa vê.
      if (rotulo && visivel && !rotulo.toLowerCase().includes(visivel.split(" ")[0].toLowerCase())) return `nome "${rotulo}" não contém "${visivel}"`;
      return null;
    }).filter(Boolean));
  expect(ruins).toEqual([]);
});

test("Pular para o conteúdo: é o primeiro Tab, aparece na tela e leva o foco pro conteúdo", async ({ page }) => {
  await abre(page);
  await page.keyboard.press("Tab");
  const pular = page.locator(".skip-link");
  await expect(pular).toBeFocused();
  const visivel = await pular.evaluate((s) => { const r = s.getBoundingClientRect(); return r.left >= 0 && document.elementFromPoint(r.left + 4, r.top + 4) === s; });
  expect(visivel, "por cima do menu, não escondido").toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator("#conteudo-principal")).toBeFocused();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement.closest("#topo"))).toBe(true);
});

test("Tab percorre a página inteira: todo foco é visível, aparece na tela e não fica embaixo do menu", async ({ page }) => {
  await abre(page);
  const problemas = [];
  let primeiro = null;
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const rc = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      let op = 1; for (let n = e; n && n.nodeType === 1; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity);
      const menu = document.querySelector(".site-header").getBoundingClientRect();
      return {
        id: e.outerHTML.slice(0, 70),
        contorno: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2,
        naTela: rc.bottom > 0 && rc.top < innerHeight,
        opaco: op > .5,
        escondido: !!e.closest("[aria-hidden=true], [inert]"),
        sobMenu: !e.closest(".site-header") && !e.classList.contains("skip-link") && rc.bottom <= menu.bottom,
      };
    });
    if (!r) continue;
    if (r.id === primeiro) break;
    primeiro = primeiro || r.id;
    if (!r.contorno) problemas.push("sem contorno de foco: " + r.id);
    if (!r.naTela) problemas.push("fora da tela: " + r.id);
    if (!r.opaco) problemas.push("invisível: " + r.id);
    if (r.escondido) problemas.push("dentro de área escondida: " + r.id);
    if (r.sobMenu) problemas.push("inteiro embaixo do menu: " + r.id);
  }
  expect(problemas).toEqual([]);
});

test("Escada: uma parada no Tab, setas/Home/End trocam o nível, e o avanço espera o teclado", async ({ page }) => {
  await abre(page);
  const abas = page.locator('.escada-abas [role="tab"]');
  await expect(abas).toHaveCount(7);
  expect(await page.locator('.escada-abas [role="tab"][tabindex="0"]').count(), "só a aba ativa no Tab").toBe(1);
  await expect(page.locator(".escada-abas")).toHaveAttribute("role", "tablist");
  expect(await page.locator('.escada-progresso > [role="tablist"] > :not([role="tab"])').count(), "o pausar fica fora da lista de abas").toBe(0);
  await page.locator(".escada-play-pause").focus();
  await page.keyboard.press("Tab");
  await expect(abas.nth(0)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(abas.nth(1)).toBeFocused();
  await expect(abas.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#escada-card-2")).toHaveClass(/is-active/);
  // Parado no teclado, o nível não troca sozinho (o anel levaria 3 s).
  await page.waitForTimeout(4000);
  await expect(abas.nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(abas.nth(6)).toBeFocused();
  await page.keyboard.press("Home");
  await expect(abas.nth(0)).toBeFocused();
  await expect(abas.nth(0)).toHaveAccessibleName("Nível 1");
  await expect(page.locator("#escada-card-1")).toHaveAccessibleName("Nível 1");
  // Pausar/retomar: o nome diz o estado.
  const pausa = page.locator(".escada-play-pause");
  await pausa.focus();
  await page.keyboard.press("Enter");
  await expect(pausa).toHaveAccessibleName("Retomar avanço automático");
  await page.keyboard.press("Space");
  await expect(pausa).toHaveAccessibleName("Pausar avanço automático");
});

test("Perguntas: Enter e Espaço abrem e fecham; fechada, a resposta não é lida", async ({ page }) => {
  await abre(page);
  const botao = page.locator("#faq .accordion-trigger").first();
  const painel = page.locator("#faq .accordion-panel").first();
  await expect(page.locator("#faq h3 > .accordion-trigger")).toHaveCount(await page.locator("#faq .accordion-trigger").count());
  await expect(painel).toBeHidden();
  await botao.focus();
  await page.keyboard.press("Enter");
  await expect(botao).toHaveAttribute("aria-expanded", "true");
  await expect(painel).toBeVisible();
  await page.keyboard.press("Space");
  await expect(botao).toHaveAttribute("aria-expanded", "false");
  await expect(painel).toBeHidden();
});

test("Vídeo aberto: Enter abre, o foco vai pro fechar, o Tab não sai, o fundo fica inerte e o Esc volta pro cartão", async ({ page }) => {
  await abre(page);
  const cartao = page.locator(".depo-video").first();
  await cartao.scrollIntoViewIfNeeded();
  await cartao.focus();
  await page.keyboard.press("Enter");
  const modal = page.locator(".depo-modal[role=dialog]");
  await expect(modal).toHaveAttribute("aria-modal", "true");
  await expect(modal).toHaveAccessibleName(/Depoimento de/);
  await expect(page.locator(".depo-modal-fechar")).toBeFocused();
  for (let i = 0; i < 3; i++) { await page.keyboard.press("Tab"); expect(await page.evaluate(() => !!document.activeElement.closest(".depo-modal"))).toBe(true); }
  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => !!document.activeElement.closest(".depo-modal"))).toBe(true);
  expect(await page.evaluate(() => document.querySelector("main").inert), "o resto da página fica inerte").toBe(true);
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(cartao).toBeFocused();
  expect(await page.evaluate(() => document.querySelector("main").inert)).toBe(false);
});

test("leitor de tela recebe os números finais (13, 8 e 4 anos), não a contagem", async ({ page }) => {
  await abre(page);
  const lista = page.locator("#vivi .credential-list");
  const texto = await lista.evaluate((ul) => [...ul.querySelectorAll("li")].map((li) => {
    // O que sobra pro leitor: tudo menos o que está com aria-hidden.
    const copia = li.cloneNode(true);
    copia.querySelectorAll("[aria-hidden=true]").forEach((x) => x.remove());
    return copia.textContent.replace(/\s+/g, " ").trim();
  }));
  expect(texto.slice(0, 3)).toEqual(["13 anos como educadora", "8 anos como criadora de conteúdo", "4 anos de especialização em comunicação e oratória"]);
});

test("cada região da página tem um nome só dela (nada de três regiões \"Você trava.\")", async ({ page }) => {
  await abre(page);
  const nomes = await page.evaluate(() => [...document.querySelectorAll("section[aria-labelledby], section[aria-label], [role=region]")].map((s) => {
    const id = s.getAttribute("aria-labelledby");
    return (s.getAttribute("aria-label") || (id && document.getElementById(id).textContent) || "").replace(/\s+/g, " ").trim();
  }));
  expect(nomes.length).toBeGreaterThan(5);
  expect(new Set(nomes).size, nomes.join(" / ")).toBe(nomes.length);
});

test("idioma, título e um H1 só em todas as páginas", async ({ page }) => {
  for (const pagina of ["index.html", "termos.html", "privacidade.html", "suporte.html"]) {
    await page.goto("/" + pagina, { waitUntil: "load" });
    expect(await page.evaluate(() => document.documentElement.lang), pagina).toBe("pt-BR");
    expect((await page.title()).length, pagina).toBeGreaterThan(10);
    await expect(page.locator("h1"), pagina).toHaveCount(1);
  }
});

test.describe("com \"reduzir movimento\" ligado no sistema", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("sem abertura, sem avanço automático da escada, sem vídeos rodando e todo o conteúdo visível", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "load" });
    await page.waitForTimeout(1200);
    await expect(page.locator("html")).not.toHaveClass(/abertura-on|cinema-on/);
    await expect(page.locator("#escada-card-1")).toHaveClass(/is-active/);
    await page.locator("#metodo").scrollIntoViewIfNeeded();
    await page.waitForTimeout(4000);
    await expect(page.locator("#escada-card-1"), "a escada não avança sozinha").toHaveClass(/is-active/);
    await percorre(page);
    const escondidos = await page.evaluate(() => [...document.querySelectorAll(".reveal")].filter((e) => parseFloat(getComputedStyle(e).opacity) < 1).length);
    expect(escondidos).toBe(0);
    const tocando = await page.evaluate(() => [...document.querySelectorAll("video")].filter((v) => !v.paused).length);
    expect(tocando).toBe(0);
  });
});
