// Ferramentas comuns dos testes: vigia erros, espera a abertura e rola a página.
import { expect } from "@playwright/test";

// Origem do site em teste (local ou o endereço publicado, via BASE_URL).
const ORIGEM = new URL(process.env.BASE_URL || "http://localhost:4173").origin;

// Registra tudo o que dá errado na página: erro de JavaScript, console.error,
// arquivo do próprio site com status HTTP >= 400 e pedido que falhou.
// O vídeo do túnel é cortado de propósito quando a abertura acaba (a camada
// sai da página): esse ERR_ABORTED não conta como falha.
export function vigia(page) {
  const problemas = { js: [], console: [], http: [], rede: [] };
  page.on("pageerror", (e) => problemas.js.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") problemas.console.push(m.text()); });
  page.on("response", (r) => {
    if (r.url().startsWith(ORIGEM) && r.status() >= 400) problemas.http.push(`${r.status()} ${r.url()}`);
  });
  page.on("requestfailed", (r) => {
    const url = r.url();
    if (!url.startsWith(ORIGEM)) return;
    const erro = (r.failure() || {}).errorText || "";
    if (/\.mp4/.test(url) && /ABORTED/.test(erro)) return;
    problemas.rede.push(`${erro} ${url}`);
  });
  return problemas;
}

export function semProblemas(problemas) {
  expect(problemas.js, "erros de JavaScript").toEqual([]);
  expect(problemas.console, "console.error").toEqual([]);
  expect(problemas.http, "arquivos com erro HTTP").toEqual([]);
  expect(problemas.rede, "pedidos que falharam").toEqual([]);
}

// Abre a página e espera a abertura (o túnel) terminar sozinha.
export async function abre(page, caminho = "/index.html") {
  await page.goto(caminho, { waitUntil: "load" });
  await expect(page.locator("html")).not.toHaveClass(/abertura-on/, { timeout: 20_000 });
}

// Desce a página inteira devagar (as imagens "lazy" carregam) e volta ao topo.
export async function percorre(page) {
  await page.evaluate(async () => {
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let y = 0; y <= document.documentElement.scrollHeight; y += Math.round(innerHeight * 0.6)) {
      scrollTo(0, y);
      await espera(120);
    }
    await espera(600);
  });
}
