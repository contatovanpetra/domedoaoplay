// Segurança (auditoria pré-lançamento, 29/set). A página não tem formulário,
// login, API nem banco: o que um visitante controla é o endereço (parâmetros
// e #) e o que fica guardado na aba. Estes testes conferem que isso nunca vira
// código rodando na página nem muda o destino do checkout, e que os cabeçalhos
// de segurança (vercel.json, os mesmos que o servidor de teste manda) estão
// lá e não bloqueiam nada da página.
import { test, expect } from "@playwright/test";
import { abre, percorre } from "./ajuda.mjs";

const HOTMART = /^https:\/\/pay\.hotmart\.com\//;

// Payloads inofensivos: se algum rodar, só liga window.__xss.
const XSS = [
  '?utm_source="><img src=x onerror="window.__xss=1">',
  "?utm_content=<script>window.__xss=1</script>",
  "?utm_campaign=javascript:window.__xss=1",
  "?\"><svg onload=window.__xss=1>=1",
  "?utm_source=a#\"><img src=x onerror=window.__xss=1>",
  "?utm_source=a#topo\" onmouseover=\"window.__xss=1",
  "?__proto__[x]=1&constructor[prototype][y]=1&utm_source=%00%0d%0aSet-Cookie:x=1",
];

test("parâmetros e # com código não rodam nada e não mudam o destino do checkout", async ({ page, context }) => {
  await context.route(/pay\.hotmart\.com/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "checkout" }));
  for (const q of XSS) {
    const erros = [];
    page.on("pageerror", (e) => erros.push(e.message));
    await abre(page, "/index.html" + q);
    await percorre(page);
    const r = await page.evaluate(() => ({
      xss: window.__xss,
      poluido: ({}).x !== undefined || ({}).y !== undefined,
      links: [...document.querySelectorAll("[data-checkout-link]")].map((a) => a.href),
      injetado: document.querySelectorAll("[onerror], [onload], [onmouseover]").length,
    }));
    expect(r.xss, q).toBeUndefined();
    expect(r.poluido, q).toBe(false);
    expect(r.injetado, q).toBe(0);
    for (const href of r.links) {
      expect(href, q).toMatch(HOTMART);
      expect(new URL(href).pathname, q).toBe("/COLOQUE-SEU-CODIGO-AQUI");
    }
    expect(erros, q).toEqual([]);
  }
});

test("um parâmetro do anúncio não troca um parâmetro que já vem no link do checkout", async ({ page }) => {
  // Se o link da Hotmart tiver, por exemplo, ?off=OFERTA, quem manda um
  // endereço com ?off=OUTRA não consegue trocar a oferta; só acrescenta o que
  // falta. E nenhum parâmetro muda o endereço (domínio e caminho) do link.
  await abre(page);
  const r = await page.evaluate(() => {
    const p = new URLSearchParams("off=OUTRA&utm_source=meta&checkoutMode=0");
    const u = new URL(checkoutHref("https://pay.hotmart.com/X?off=OFERTA", p));
    return { host: u.host, caminho: u.pathname, off: u.searchParams.getAll("off"), utm: u.searchParams.get("utm_source") };
  });
  expect(r).toEqual({ host: "pay.hotmart.com", caminho: "/X", off: ["OFERTA"], utm: "meta" });
});

test("a política de segurança (CSP) não bloquearia nada da página, em nenhuma página", async ({ page }) => {
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.effectiveDirective} ${e.blockedURI} ${e.disposition}`));
  });
  const avisos = [];
  page.on("console", (m) => { if (/Content Security Policy|Permissions-Policy|Report Only/i.test(m.text())) avisos.push(m.text()); });
  await abre(page);
  await percorre(page);
  const pergunta = page.locator("#faq .accordion-trigger").first();
  await pergunta.scrollIntoViewIfNeeded();
  await pergunta.click();
  const video = page.locator(".depo-video").first();
  await video.scrollIntoViewIfNeeded();
  await video.click();
  await page.waitForTimeout(600);
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.__csp), "index.html").toEqual([]);
  for (const pagina of ["privacidade.html", "termos.html", "suporte.html"]) {
    await page.goto("/" + pagina, { waitUntil: "load" });
    await percorre(page);
    expect(await page.evaluate(() => window.__csp), pagina).toEqual([]);
  }
  expect(avisos).toEqual([]);
});

test("os cabeçalhos de segurança chegam em todas as páginas e arquivos", async ({ request }) => {
  for (const caminho of ["/index.html", "/termos.html", "/privacidade.html", "/suporte.html", "/css/style.css", "/js/main.js", "/assets/img/logo.svg"]) {
    const h = (await request.get(caminho)).headers();
    expect(h["x-content-type-options"], caminho).toBe("nosniff");
    expect(h["x-frame-options"], caminho).toBe("DENY");
    expect(h["referrer-policy"], caminho).toBe("strict-origin-when-cross-origin");
    expect(h["content-security-policy"], caminho).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy-report-only"], caminho).toContain("default-src 'self'");
    expect(h["permissions-policy"], caminho).toContain("camera=()");
  }
});

// A pasta que vai pra Hostinger (dist/.htaccess, gerado pelo build) manda os
// mesmos cabeçalhos do vercel.json: sem isso, lá a página ficaria sem a
// proteção contra quadro (clickjacking) e sem a Permissions-Policy.
test("a pasta da Hostinger (.htaccess) manda os mesmos cabeçalhos de segurança do vercel.json", async () => {
  const { readFile } = await import("node:fs/promises");
  const htaccess = await readFile(new URL("../../dist/.htaccess", import.meta.url), "utf8");
  const vercel = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
  const geral = vercel.headers.find((h) => h.source === "/(.*)" && !h.has).headers;
  expect(geral.length).toBeGreaterThan(4);
  for (const { key, value } of geral) expect(htaccess, key).toContain(`Header always set ${key} "${value}"`);
  expect(htaccess, "HSTS só depois do https do domínio final").not.toContain("Strict-Transport-Security");
});

test("outro site não consegue abrir a página dentro de um quadro (clickjacking)", async ({ page, baseURL }) => {
  await page.setContent(`<iframe src="${baseURL}/index.html" width="400" height="400"></iframe>`);
  await page.waitForTimeout(3000);
  const quadro = page.frames().find((f) => f !== page.mainFrame());
  // Bloqueado, o Chromium troca o conteúdo do quadro pela página de erro dele.
  expect(quadro.url()).toMatch(/^chrome-error:/);
});

test("links que abrem aba nova não dão acesso à página de origem (noopener)", async ({ page }) => {
  for (const pagina of ["index.html", "privacidade.html", "termos.html", "suporte.html"]) {
    await page.goto("/" + pagina, { waitUntil: "load" });
    const semProtecao = await page.evaluate(() => [...document.querySelectorAll('a[target="_blank"]')]
      .filter((a) => !/\bnoopener\b|\bnoreferrer\b/.test(a.rel)).map((a) => a.href));
    expect(semProtecao, pagina).toEqual([]);
  }
});
