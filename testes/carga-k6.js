// Teste de carga da landing (k6: https://k6.io).
// Simula a primeira visita de um celular: o HTML e, em paralelo, os arquivos
// da primeira tela (os mesmos que o navegador pede antes de mostrar a página).
// O vídeo do túnel fica de fora por padrão (é o mais pesado e só gasta banda
// do plano da Vercel); ligue com VIDEO=1.
//
// Como rodar:
//   k6 run testes/carga-k6.js                         # fumaça: 1 usuário, 30 s
//   k6 run -e PERFIL=carga testes/carga-k6.js         # sobe até 30 usuários ao mesmo tempo
//   k6 run -e PERFIL=pico -e ALVO=100 testes/carga-k6.js   # pico curto até ALVO usuários
//   k6 run -e PERFIL=campanha -e ALVO=100 testes/carga-k6.js  # poucos → pico → mantém → cai
//   k6 run -e BASE_URL=https://seu-dominio.com.br testes/carga-k6.js
//
// Aprovação (thresholds): menos de 1% de erro, HTML com p95 abaixo de 800 ms e
// arquivos com p95 abaixo de 1,5 s. O k6 sai com erro se algum critério falhar.
// Não aponte para páginas de terceiros (Hotmart): o checkout não é nosso.
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE = (__ENV.BASE_URL || "https://domedoaoplay.vercel.app").replace(/\/$/, "");
const PERFIL = __ENV.PERFIL || "fumaca";
const ALVO = Number(__ENV.ALVO || 100);

const perfis = {
  fumaca: [{ duration: "30s", target: 1 }],
  carga: [
    { duration: "20s", target: 10 },
    { duration: "30s", target: 10 },
    { duration: "20s", target: 30 },
    { duration: "40s", target: 30 },
    { duration: "10s", target: 0 },
  ],
  // Campanha começando a entregar: poucos visitantes, pico repentino, pico
  // mantido, queda e volta ao normal (para ver se o site se recupera).
  campanha: [
    { duration: "30s", target: 5 },
    { duration: "15s", target: ALVO },
    { duration: "60s", target: ALVO },
    { duration: "15s", target: 5 },
    { duration: "30s", target: 5 },
  ],
  pico: [
    { duration: "10s", target: ALVO },
    { duration: "30s", target: ALVO },
    { duration: "10s", target: 0 },
  ],
};

export const options = {
  scenarios: { visitas: { executor: "ramping-vus", startVUs: 1, stages: perfis[PERFIL] || perfis.fumaca } },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    html_ms: ["p(95)<800"],
    arquivos_ms: ["p(95)<1500"],
  },
  summaryTrendStats: ["min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

const htmlMs = new Trend("html_ms", true);
const arquivosMs = new Trend("arquivos_ms", true);

// Os arquivos da primeira tela no celular (conferidos no Lighthouse de 30/set).
// Quando o ?v= mudar no index.html, o teste continua valendo: o servidor
// entrega o mesmo arquivo com qualquer ?v=.
const PRIMEIRA_TELA = [
  "/css/style.css?v=118",
  "/js/vendor/gsap.min.js?v=3.12.5",
  "/js/main.js?v=66",
  "/assets/img/vivi-hero-mobile.avif?v=2",
  "/assets/video/tunel-celular-poster.webp",
  "/assets/fonts/manrope-v20-latin.woff2",
  "/assets/fonts/nunito-sans-v19-latin.woff2",
  "/assets/img/logo.svg",
  "/assets/img/logo-escuro.svg",
  "/assets/img/favicon.svg",
];

export default function () {
  const cab = { headers: { "Accept-Encoding": "br, gzip", "User-Agent": "k6-teste-de-carga (Do Medo ao Play)" } };
  const html = http.get(`${BASE}/`, cab);
  htmlMs.add(html.timings.duration);
  check(html, {
    "HTML 200": (r) => r.status === 200,
    "HTML tem o botão de compra": (r) => r.body && r.body.includes("Quero entrar em cena"),
  });

  const lista = PRIMEIRA_TELA.slice();
  if (__ENV.VIDEO === "1") lista.push("/assets/video/tunel-celular.mp4");
  const respostas = http.batch(lista.map((p) => ["GET", `${BASE}${p}`, null, cab]));
  respostas.forEach((r) => {
    arquivosMs.add(r.timings.duration);
    check(r, { "arquivo 200": (x) => x.status === 200 });
  });
  // Tempo de leitura entre uma visita e outra do mesmo "usuário".
  sleep(1 + Math.random() * 2);
}
