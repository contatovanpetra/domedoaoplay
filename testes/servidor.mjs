// Servidor mínimo pra testar a pasta dist/ (o que vai pro ar), sem dependências.
// Uso: node testes/servidor.mjs  (porta 4173, ou PORTA=xxxx)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const RAIZ = process.env.RAIZ ? process.env.RAIZ.replace(/\/?$/, "/") : new URL("../dist/", import.meta.url).pathname;
const PORTA = Number(process.env.PORTA || 4173);
// Os mesmos cabeçalhos que a Vercel manda (vercel.json), pra os testes
// rodarem com a política de segurança (CSP) de verdade ligada.
const REGRAS = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8")).headers
  .map((r) => ({ re: new RegExp("^" + r.source + "$"), headers: Object.fromEntries(r.headers.map((h) => [h.key, h.value])) }));
const cabecalhos = (caminho) => Object.assign({}, ...REGRAS.filter((r) => r.re.test(caminho)).map((r) => r.headers));
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".avif": "image/avif", ".jpg": "image/jpeg", ".png": "image/png",
  ".woff2": "font/woff2", ".mp4": "video/mp4", ".json": "application/json",
};

createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const arquivo = normalize(join(RAIZ, caminho.endsWith("/") ? caminho + "index.html" : caminho));
  if (!arquivo.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
  try {
    const info = await stat(arquivo);
    if (!info.isFile()) throw new Error("não é arquivo");
    res.writeHead(200, { ...cabecalhos(caminho), "Content-Type": TIPOS[extname(arquivo)] || "application/octet-stream", "Content-Length": info.size });
    res.end(await readFile(arquivo));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("não encontrado");
  }
}).listen(PORTA, () => console.log(`dist/ em http://localhost:${PORTA}`));
