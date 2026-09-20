// =========================================================
// Do Medo ao Play — Landing Page (funil de vendas Hotmart)
// =========================================================

// 1) COLE AQUI o link de checkout do Hotmart antes de publicar.
//    Todos os botões marcados com [data-checkout-link] vão usar essa URL.
const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/COLOQUE-SEU-CODIGO-AQUI";

// 2) GSAP + ScrollTrigger (carregados via CDN no index.html) movem a abertura
//    em três cenas. Sem eles (falha de rede, bloqueio de script), a abertura
//    é pulada e a página abre direto: nada fica preso.
const hasGSAP = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
if (hasGSAP) {
  gsap.registerPlugin(ScrollTrigger);
  // No celular, a barra de endereço soma/tira uns pixels de altura da janela
  // conforme a pessoa rola. Sem isto, cada vez que ela some/aparece dispara um
  // resize que recalcula a rolagem presa da abertura (5200px) no meio do
  // caminho — e a rolagem parece "voltar do nada" pro início da abertura.
  ScrollTrigger.config({ ignoreMobileResize: true });
}
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// A abertura cria uma réplica da página dentro do celular, e essa réplica fica
// ANTES do original no documento. Por isso as referências reais são guardadas
// logo no começo: sem isso, querySelector(".hero") passa a achar a miniatura.
let REAL_HERO = null;
let REAL_HEADER = null;

document.addEventListener("DOMContentLoaded", () => {
  REAL_HERO = document.querySelector(".hero");
  REAL_HEADER = document.querySelector(".site-header");
  wireCheckoutLinks();
  wireAccordions();
  wireScrollReveal();
  wireCountUp();
  wireScrollEffects();
  wireScrollCue();
  wireIntroStage();
  wireHeaderReveal();
  playHeroIntro();
  wireTilt();
  wireConfettiCTA();
  wireReviewMode();
  if (hasGSAP) ScrollTrigger.refresh();
});

// Modo revisão (classe "modo-revisao" no <html>, ligada por uma linha no <head>):
// botão flutuante que conta e percorre os itens marcados com data-confirmar.
function wireReviewMode() {
  if (!document.documentElement.classList.contains("modo-revisao")) return;
  const items = [...document.querySelectorAll("[data-confirmar]")];
  if (!items.length) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "revisao-contador";
  btn.textContent = `${items.length} itens a confirmar · ver o primeiro`;
  let index = -1;

  btn.addEventListener("click", () => {
    index = (index + 1) % items.length;
    const el = items[index];
    // Item dentro de um módulo/pergunta fechado: abre antes de rolar até ele.
    const accordionItem = el.closest(".accordion-item");
    if (accordionItem && !accordionItem.classList.contains("open")) {
      accordionItem.querySelector(".accordion-trigger").click();
    }
    [el, el.closest(".reveal")].forEach((node) => node && node.classList.add("is-visible"));
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    btn.textContent = `${index + 1} de ${items.length} a confirmar · próximo`;
  });

  document.body.appendChild(btn);
}

const clamp = (v) => Math.min(1, Math.max(0, v));

// Tudo que depende da rolagem num lugar só: o herói "cinema" (o portal se aproxima,
// o texto de venda sai e entra a frase da travessia) e a barra de progresso.
// As medidas da página são lidas só quando algo muda de tamanho, nunca a cada
// quadro da rolagem: ler medidas logo depois de mexer em estilo trava o celular.
function wireScrollEffects() {
  const root = document.documentElement;
  const header = document.querySelector(".site-header");
  const hero = REAL_HERO;
  const stage = document.querySelector(".cinema-stage");
  const inner = document.querySelector(".hero-inner");
  const copy = document.querySelector(".hero-copy");
  const bar = document.querySelector(".read-progress");
  const introStage = document.getElementById("intro-stage");
  // A classe é ligada no <head> só quando o movimento é permitido.
  const cinema = Boolean(hero && stage && root.classList.contains("cinema-on"));

  // Mapeia um trecho da rolagem (de "from" até "to") para 0 a 1.
  const range = (p, from, to) => clamp((p - from) / (to - from));
  const CINEMA_PROPS = ["--portal-scale", "--portal-y", "--copy-opacity", "--copy-y", "--cross-opacity", "--cross-y"];

  let heroTop = 0;
  let heroBottom = 0;
  let track = 0;
  let maxScroll = 0;
  let ticking = false;

  function measure() {
    if (header) {
      // Altura real do menu (muda com a logo, a fonte e o zoom de telas grandes).
      root.style.setProperty("--header-h", header.getBoundingClientRect().height + "px");
    }
    if (stage && inner && copy) {
      // Tablet em pé usa a foto vertical alinhada pelo fim do texto do herói (ver CSS).
      // offsetTop/offsetHeight ignoram o translateY da animação.
      stage.style.setProperty("--hero-text-bottom", inner.offsetTop + copy.offsetTop + copy.offsetHeight + "px");
    }
    if (hero && stage) {
      heroTop = hero.getBoundingClientRect().top + window.scrollY;
      heroBottom = heroTop + hero.offsetHeight;
      track = hero.offsetHeight - stage.offsetHeight;
    }
    maxScroll = root.scrollHeight - window.innerHeight;
    update();
  }

  function update() {
    ticking = false;
    const y = window.scrollY;

    // Enquanto a abertura ainda está presa, a rolagem "de verdade" só serve pra
    // avançar o túnel/pensamentos (ver autoAdvance em wireIntroStage) e não
    // corresponde a progresso de leitura nenhum — sem esta checagem, a trilha
    // enchia sozinha (uma linha laranja subindo na borda direita) durante a
    // abertura inteira, em qualquer tamanho de tela.
    const introActive = introStage && !introStage.classList.contains("intro-done");
    if (bar) bar.style.setProperty("--read", introActive || maxScroll <= 0 ? "0" : clamp(y / maxScroll).toFixed(4));
    if (!cinema) return;

    if (track <= 0) {
      // Sem pista de rolagem (tela baixa, celular deitado): volta ao estado inicial.
      // Senão, quem gira o celular no meio da animação fica com o texto apagado.
      CINEMA_PROPS.forEach((prop) => stage.style.removeProperty(prop));
      stage.classList.remove("copy-inert", "is-live");
      return;
    }

    // Camadas de GPU da animação só existem enquanto o herói está na tela. Mantidas
    // o tempo todo, deixavam o menu sumir e mostravam um pedaço da foto repetido.
    const onScreen = y < heroBottom && y + window.innerHeight > heroTop;
    stage.classList.toggle("is-live", onScreen);
    if (!onScreen) return;

    const p = clamp((y - heroTop) / track);

    // O texto de venda só começa a sair depois que a pessoa teve tempo de ler.
    const approach = range(p, 0, 0.85);
    const exit = range(p, 0.18, 0.56);
    const cross = range(p, 0.58, 0.86);

    // Zoom fundo o bastante pros arcos saírem do quadro: é isso que dá a sensação
    // de atravessar o túnel. Sem rotação, que fazia o arco parecer um quadrado girando.
    stage.style.setProperty("--portal-scale", (1 + approach * 1.35).toFixed(3));
    stage.style.setProperty("--portal-y", (approach * -22).toFixed(1) + "px");
    stage.style.setProperty("--copy-opacity", (1 - exit).toFixed(3));
    stage.style.setProperty("--copy-y", (exit * -70).toFixed(1) + "px");
    stage.style.setProperty("--cross-opacity", cross.toFixed(3));
    stage.style.setProperty("--cross-y", (26 * (1 - cross)).toFixed(1) + "px");

    // Depois que o texto some, ele não pode mais receber clique nem foco.
    stage.classList.toggle("copy-inert", exit > 0.9);
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  // Qualquer mudança de tamanho (girar o celular, abrir um módulo, fonte chegando)
  // refaz as medidas uma vez.
  let measureQueued = false;
  const queueMeasure = () => {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => { measureQueued = false; measure(); });
  };
  window.addEventListener("resize", queueMeasure, { passive: true });
  window.addEventListener("orientationchange", queueMeasure);
  window.addEventListener("load", queueMeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueMeasure);
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(queueMeasure);
    ro.observe(document.body);
    if (header) ro.observe(header);
  }

  // A abertura é uma seção presa: quando o ScrollTrigger recalcula as medidas
  // dela, a posição do hero muda junto e precisa ser lida de novo.
  if (hasGSAP) ScrollTrigger.addEventListener("refresh", queueMeasure);

  measure();
}

// Repassa pro checkout os parâmetros de rastreio com que a pessoa chegou na página
// (utm_source, src, sck...). Sem isso, quem vem de um anúncio ou da bio chega na
// Hotmart sem origem e a venda aparece sem rastreio no Hotmart Analytics.
function checkoutHref() {
  try {
    const url = new URL(HOTMART_CHECKOUT_URL);
    new URLSearchParams(window.location.search).forEach((value, key) => {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    });
    return url.toString();
  } catch (e) {
    return HOTMART_CHECKOUT_URL;
  }
}

function wireCheckoutLinks() {
  if (HOTMART_CHECKOUT_URL.includes("COLOQUE")) {
    console.warn("Do Medo ao Play: o link de checkout ainda é o provisório. Troque HOTMART_CHECKOUT_URL em js/main.js antes de publicar.");
  }
  const href = checkoutHref();
  const links = document.querySelectorAll("[data-checkout-link]");
  links.forEach((link) => {
    link.setAttribute("href", href);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener");
  });
}

function wireAccordions() {
  let uid = 0;
  document.querySelectorAll(".accordion").forEach((accordion) => {
    const items = accordion.querySelectorAll(".accordion-item");

    items.forEach((item) => {
      const trigger = item.querySelector(".accordion-trigger");
      const panel = item.querySelector(".accordion-panel");
      if (!trigger || !panel) return;

      // Liga o botão ao painel que ele abre, pra leitores de tela.
      uid += 1;
      panel.id = panel.id || "painel-" + uid;
      trigger.setAttribute("aria-controls", panel.id);
      trigger.setAttribute("type", "button");

      const isOpenInitially = trigger.getAttribute("aria-expanded") === "true";
      if (isOpenInitially) item.classList.add("open");

      trigger.addEventListener("click", () => {
        const willOpen = !item.classList.contains("open");

        items.forEach((other) => {
          const otherTrigger = other.querySelector(".accordion-trigger");
          const otherPanel = other.querySelector(".accordion-panel");
          // Guarda pra qualquer item que venha sem painel ou sem botão de
          // verdade (módulo ainda sem aulas, por exemplo): nada a fechar nele.
          if (!otherTrigger || !otherPanel) return;
          other.classList.remove("open");
          otherTrigger.setAttribute("aria-expanded", "false");
        });

        if (willOpen) {
          item.classList.add("open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });
  });
}

function wireScrollReveal() {
  // Listas com cascata própria revelam item a item; o contêiner delas fica de fora.
  // Animar contêiner e filhos juntos fazia os cards "pularem" quando o de fora
  // terminava de aparecer (a tela piscava no antes/depois).
  const targets = [...document.querySelectorAll(
    ".section .container > *, .ladder-step, .accordion-item, .compare-col"
  )].filter((el) => !el.matches(
    ".compare-grid, .ladder, .accordion"
  ));
  targets.forEach((el) => el.classList.add("reveal"));

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

// Números de destaque ("4 medos", "7 níveis") contam de 0 até o valor final
// assim que entram na tela, em vez de já aparecerem prontos.
function wireCountUp() {
  const targets = document.querySelectorAll(".big-fact-num[data-count]");
  if (!targets.length) return;

  if (
    !("IntersectionObserver" in window) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  // O número começa zerado. Antes ele aparecia pronto ("4"), caía pra 0 quando a
  // contagem começava e subia de novo: dava uma piscada.
  targets.forEach((el) => { el.textContent = "0" + (el.dataset.suffix || ""); });

  function animate(el) {
    const end = parseInt(el.dataset.count, 10);
    if (Number.isNaN(end)) return;
    const suffix = el.dataset.suffix || "";
    const duration = 700;
    const start = performance.now();

    function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * end) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );

  targets.forEach((el) => observer.observe(el));
}


// =========================================================
// ABERTURA EM TRÊS CENAS
// Cena 1: "você tem o que dizer" → "mas quando a câmera liga…" → VOCÊ TRAVA,
//         e os pensamentos de quem trava, um a cada deslizada da pessoa.
// Cena 2: "e se, em vez de travar…" — a câmera se desenha em 3D, se acomoda,
//         o fundo se abre e aparece "você entrasse em cena?".
// Cena 3: a página de verdade, que faz a própria entrada (playHeroIntro).
// Dá pra pular a qualquer momento pelo botão no canto.
// =========================================================

// A abertura é presa na rolagem: cada trecho rolado move as cenas pra frente,
// e rolar pra cima desfaz tudo na ordem inversa. Por isso dá pra voltar lá em
// cima e rever a animação inteira quantas vezes quiser.
function wireIntroStage() {
  const stage = document.getElementById("intro-stage");
  if (!stage) return;

  const inner = document.getElementById("hero-intro-inner");
  const line1 = document.getElementById("hi-line1");
  const line2 = document.getElementById("hi-line2");
  const travar = document.getElementById("hi-travar");
  const glMain = travar ? travar.querySelector(".gl-main") : null;
  const thoughts = [...document.querySelectorAll("#hi-thoughts span")];
  const cue = document.getElementById("hi-cue");
  const hero = REAL_HERO;

  // Cena 2
  const scene2 = document.getElementById("intro-scene2");
  const burstBg = document.getElementById("burst-bg");
  const burstPre = document.getElementById("burst-pre");
  const burstFrame = document.getElementById("burst-frame");
  const burstStage = document.getElementById("burst-stage");
  const burstScreen = document.getElementById("burst-screen");
  const flash = document.getElementById("flash");
  const burstTitleSpans = [...document.querySelectorAll("#burst-title span")];
  const bfRec = document.getElementById("bf-rec");
  const bfCorners = document.getElementById("bf-corners");
  const bfReticle = document.getElementById("bf-reticle");
  const bfPaths = ["bf-left", "bf-right", "bf-top", "bf-bottom"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!hasGSAP || prefersReducedMotion) {
    [line1, line2, glMain, ...thoughts].forEach((el) => { if (el) el.style.opacity = 1; });
    return;
  }

  // ---- O TÚNEL ----
  // A pessoa começa no fundo do túnel (quase preto) e vai atravessando até a
  // saída, que é laranja. A cor e o tamanho dos anéis (com a forma do símbolo
  // da marca) acompanham o quanto já foi percorrido.
  const rings = [...document.querySelectorAll(".t-ring")];
  const ringBase = [.16, .3, .5, .78, 1.15, 1.65];
  const CORE = ["#0A1826", "#12354F", "#2A6A97", "#B25E12", "#D77713"];
  const MID = ["#050D16", "#081C2C", "#0E3450", "#5C3310", "#A85A12"];
  const EDGE = ["#01040A", "#020810", "#04121F", "#0A1724", "#14202E"];
  const RING = ["#16304A", "#2E6A94", "#6FA9CC", "#E08A2A", "#FFC06A"];

  function paintTunnel(p) {
    stage.style.setProperty("--t-core", gsap.utils.interpolate(CORE, p));
    stage.style.setProperty("--t-mid", gsap.utils.interpolate(MID, p));
    stage.style.setProperty("--t-edge", gsap.utils.interpolate(EDGE, p));
    const ringColor = gsap.utils.interpolate(RING, p);
    rings.forEach((ring, i) => {
      // Cada anel avança na direção de quem olha; quando fica grande demais,
      // já passou por você e some.
      const scale = ringBase[i] * (1 + p * 2.1);
      const fade = gsap.utils.clamp(0, 1, (1.9 - scale) / .7);
      const rise = gsap.utils.clamp(0, 1, scale / .3);
      gsap.set(ring, {
        scale,
        svgOrigin: "180 198",
        opacity: Math.min(fade, rise) * (.2 + p * .5),
        stroke: ringColor,
      });
    });
  }

  // O glitch é um solavanco, não um estado: dispara ao passar pelo ponto,
  // indo ou voltando.
  let introBeatsDone = false;
  let glitchTimer = null;
  function fireGlitch() {
    if (!travar) return;
    travar.classList.remove("glitching");
    void travar.offsetWidth; // reinicia a animação
    travar.classList.add("glitching");
    if (glitchTimer) window.clearTimeout(glitchTimer);
    glitchTimer = window.setTimeout(() => travar.classList.remove("glitching"), 700);
  }

  // ---- A RÉPLICA DA PÁGINA DENTRO DO CELULAR ----
  // Em vez de uma foto, a tela mostra uma cópia viva do menu + da página de
  // vendas, do tamanho exato da janela e reduzida pra caber. Na travessia ela
  // cresce até escala 1, então a tela do celular VIRA a página, sem corte.
  const PHONE_RATIO = 440 / 280;          // proporção do quadro desenhado
  let mini = null;

  function buildMiniScreen() {
    if (!burstScreen) return;
    const header = REAL_HEADER;
    const heroSection = REAL_HERO;
    if (!heroSection) return;

    mini = document.createElement("div");
    mini.className = "burst-mini";

    [header, heroSection].forEach((node) => {
      if (!node) return;
      const copy = node.cloneNode(true);
      // Sem ids repetidos: a cópia não pode responder ao CSS/JS do original
      // (é por causa dos ids que o hero de verdade começa invisível).
      copy.removeAttribute("id");
      copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      copy.querySelectorAll("a, button").forEach((el) => el.setAttribute("tabindex", "-1"));
      mini.appendChild(copy);
    });

    burstScreen.appendChild(mini);
  }

  // O palco tem tamanho em px pra poder ser animado até a janela inteira.
  function stageBaseSize() {
    const w = Math.min(200, window.innerWidth * .42);
    return { w, h: w * PHONE_RATIO };
  }
  function sizeStage() {
    const { w, h } = stageBaseSize();
    gsap.set(burstStage, { width: w, height: h });
    if (mini) gsap.set(mini, { width: window.innerWidth, height: window.innerHeight });
    fitMini();
  }
  // A réplica sempre cabe inteira dentro da tela atual. Quando a tela é do
  // tamanho da janela, a conta dá exatamente 1.
  function fitMini() {
    if (!mini || !burstScreen) return;
    const r = burstScreen.getBoundingClientRect();
    const k = Math.min(r.width / window.innerWidth, r.height / window.innerHeight);
    gsap.set(mini, { scale: k });
  }

  buildMiniScreen();
  sizeStage();
  window.addEventListener("resize", sizeStage);

  bfPaths.forEach((p) => {
    const len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
  });
  gsap.set(burstStage, { rotationY: -26, rotationX: 9, transformPerspective: 1000, transformOrigin: "50% 50%" });
  paintTunnel(0);

  // Quanto a rolagem "presa" dura, no total. O GSAP, por padrão, reserva
  // sozinho o espaço de rolagem de uma seção presa somando a altura de
  // repouso dela (a tela cheia, ~100dvh) A MAIS por cima dessa distância —
  // isso deixava uma tela inteira em branco entre o fim da abertura (a
  // réplica já tinha sumido) e o hero de verdade aparecer (que só começava
  // bem mais embaixo). Mesmo com pinSpacing desligado, o GSAP ainda reserva
  // sozinho a altura "de repouso" (~100dvh); este spacer manual cobre só o
  // que falta além dela, pra o total bater com o fim da rolagem presa.
  const SCRUB_DISTANCE = 5200;
  const spacer = document.createElement("div");
  spacer.setAttribute("aria-hidden", "true");
  stage.insertAdjacentElement("afterend", spacer);
  const syncSpacer = () => {
    spacer.style.height = Math.max(0, SCRUB_DISTANCE - stage.offsetHeight) + "px";
  };
  syncSpacer();
  window.addEventListener("resize", syncSpacer);
  window.addEventListener("orientationchange", syncSpacer);
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: stage,
      start: "top top",
      end: "+=" + SCRUB_DISTANCE,
      scrub: .7,
      pin: true,
      pinSpacing: false,
      anticipatePin: 1,
      // Sem invalidateOnRefresh: com a seção escondida (display:none) depois
      // de pronta, um refresh perdido nesse meio tempo tentava remedir um
      // elemento colapsado e embaralhava o início/fim da rolagem presa — a
      // página parecia "voltar" sozinha pro meio da abertura.
      onUpdate: (self) => {
        paintTunnel(self.progress);
        fitMini();
      },
      // Depois que o clarão termina, a réplica dentro do celular (cabeçalho +
      // hero clonados) já cresceu até o tamanho da janela e não some sozinha:
      // sem isto, ela ficava por cima da página de verdade e duplicava o
      // cabeçalho do hero. Ao voltar rolando pra cima, ela reaparece — a
      // abertura continua reversível como antes. Precisa ser na hora (sem
      // atraso): com pinSpacing desligado, se ela ficasse position:relative
      // por um instante antes do display:none, empurraria o hero pra baixo
      // e desfaria o ajuste do espaçador manual.
      onLeave: () => stage.classList.add("intro-done"),
      onEnterBack: () => stage.classList.remove("intro-done"),
    },
  });

  // A cena 2 (túnel, câmera, estouro) roda sozinha depois de um único gesto
  // de rolagem: em vez de exigir rolagem manual do início ao fim, a gente
  // move a própria rolagem da página até o fim da seção presa assim que a
  // pessoa desliza uma vez. O scrub e o pin continuam existindo do mesmo
  // jeito (é só a rolagem que passa a ser automática a partir daí) — por
  // isso rolar de novo no meio ainda cancela e devolve o controle pra
  // pessoa, e a abertura continua reversível.
  function autoAdvance() {
    const trig = tl.scrollTrigger;
    if (!trig) return;
    const state = { y: window.scrollY };
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    // Um deslize de verdade (dedo ou trackpad) dispara uma sequência de
    // wheel/touchmove ao longo de uns 300-600ms, não um evento só. Se a
    // gente já ligasse o cancelamento aqui, o rabo do MESMO gesto que
    // acabou de ligar a cena 2 automática cancelava ela de novo em
    // milissegundos, era por isso que "funcionava uma hora, na outra não":
    // dependia do gesto ser curto (mouse) ou longo (touch/trackpad). Por
    // isso a gente espera o gesto atual esfriar antes de escutar um novo.
    let armTimer = setTimeout(() => {
      window.addEventListener("wheel", cancel, { passive: true, once: true });
      window.addEventListener("touchmove", cancel, { passive: true, once: true });
      window.addEventListener("keydown", cancel, { once: true });
    }, 500);
    gsap.to(state, {
      y: trig.end,
      duration: 7,
      ease: "power1.inOut",
      // behavior:"instant" é essencial aqui: o <html> usa scroll-behavior:smooth
      // pros links âncora, e sem isso CADA chamada (várias por segundo) disparava
      // sua própria animação suave, todas brigando entre si — a rolagem ficava
      // instável e às vezes "voltava" sozinha no meio do caminho.
      onUpdate: () => { if (!cancelled) window.scrollTo({ top: state.y, left: 0, behavior: "instant" }); },
    });
  }

  // CENA 1 — toda a primeira cena roda sozinha assim que a página abre: a
  // frase, a virada, o VOCÊ TRAVA e os pensamentos aparecem em sequência, um
  // atrás do outro, sem depender de rolagem. Só depois de tudo aparecer é que
  // a cena 2 começa a rolar sozinha.
  gsap.timeline({ delay: .35 })
    .fromTo(line1, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .7, ease: "power3.out" })
    .fromTo(line2, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .9, ease: "power1.out" }, "+=.5")
    .call(fireGlitch, null, "+=.45")
    .fromTo(glMain, { opacity: 0 }, { opacity: 1, duration: .1 }, "<")
    .fromTo(inner, { x: 0 }, { x: () => gsap.utils.random(-7, 7), duration: .05, repeat: 7, yoyo: true, ease: "none" }, "<")
    .set(inner, { x: 0 })
    .fromTo(thoughts,
      { opacity: 0, x: (i) => (i % 2 === 0 ? -26 : 26), y: 6 },
      { opacity: 1, x: 0, y: 0, duration: .5, stagger: .55 },
      "+=.3")
    .call(() => {
      introBeatsDone = true;
      if (cue) cue.classList.add("is-on");
      // Um só gesto liga a cena 2 no automático — depois disso a pessoa não
      // precisa mais continuar rolando até o hero aparecer. Escuta "scroll"
      // (dispara com qualquer forma de rolar: touch, roda do mouse, trackpad,
      // teclado) em vez de "wheel"/"touchmove" direto, porque no celular nem
      // sempre esses dois disparam de um jeito que o navegador deixa a gente
      // ouvir — "scroll" é o sinal que sempre chega, não importa como a
      // pessoa rolou. "keydown" fica como atalho extra pra quem usa teclado.
      let started = false;
      const start = () => {
        if (started) return;
        started = true;
        if (cue) cue.classList.remove("is-on");
        window.removeEventListener("scroll", start);
        window.removeEventListener("keydown", start);
        autoAdvance();
      };
      window.addEventListener("scroll", start, { passive: true });
      window.addEventListener("keydown", start);
    });

  tl
    // CENA 2 — a cena 1 sai e a câmera se desenha
    .to(inner, { opacity: 0, y: -24, duration: .5 })
    .fromTo(scene2, { autoAlpha: 0 }, { autoAlpha: 1, duration: .3 }, "<")
    .fromTo(burstPre, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .5 })
    // A moldura da câmera começava a desenhar só depois do texto "E se, em vez
    // de travar..." terminar de aparecer — rolando pra baixo isso nem se nota
    // (é rápido e o auto-avanço não para no meio), mas rolando de volta pra
    // cima manualmente, dava pra parar bem nesse intervalo e a tela ficava só
    // com o texto solto num fundo escuro, sem nada mais (parecia tela vazia/
    // azul). Desenhando junto com o texto, sempre tem algo na tela.
    .to(bfPaths.slice(0, 2), { strokeDashoffset: 0, duration: .6, ease: "power2.inOut" }, "<")
    .to(bfPaths.slice(2), { strokeDashoffset: 0, duration: .55, ease: "power2.inOut" }, "-=.2")
    .to(bfRec, { opacity: 1, duration: .3 }, "-=.1")
    .to(bfCorners, { opacity: 1, duration: .3 }, "-=.15")
    // a câmera "enxerga": a foto acende dentro da tela
    .to(burstScreen, { opacity: 1, duration: .6, ease: "power2.out" }, "-=.2")
    .to(bfReticle, { opacity: 1, duration: .4, ease: "back.out(2)" }, "-=.3")
    .to(burstStage, { rotationY: -5, rotationX: 2, duration: .8, ease: "power2.out" }, "-=.2")
    // a saída do túnel se abre e a pergunta se completa
    .to(burstBg, { clipPath: "circle(150% at 50% 50%)", duration: 1, ease: "power2.inOut" }, "-=.3")
    .to(burstTitleSpans, { opacity: 1, y: 0, duration: .4, stagger: .13, ease: "back.out(1.7)" }, "-=.55")
    .to({}, { duration: .8 })
    // ATRAVESSA — o texto sai, a câmera se endireita e a tela do celular cresce
    // até ocupar a janela inteira. Como ela é uma réplica da página de vendas,
    // quando chega no tamanho da janela ela JÁ É aquela tela: o clarão só
    // disfarça a emenda e a pessoa segue rolando na página.
    .to([burstPre, ...burstTitleSpans], { opacity: 0, duration: .4 })
    .to(burstStage, { rotationY: 0, rotationX: 0, duration: .5, ease: "power2.inOut" }, "<")
    .to(burstStage, {
      width: () => window.innerWidth,
      height: () => window.innerHeight,
      duration: 1.2,
      ease: "power2.in",
    })
    .to(burstScreen, {
      left: "0%", top: "0%", width: "100%", height: "100%", borderRadius: 0,
      duration: 1.2, ease: "power2.in",
    }, "<")
    .to(burstFrame, { opacity: 0, duration: .5 }, "<+=.2")
    .to(flash, { opacity: 1, duration: .45, ease: "power2.in" }, "<+=.45")
    .to(flash, { opacity: 0, duration: .8, ease: "power2.out" });
}

// O menu não existe durante a abertura: ele desce quando a página de vendas
// entra em cena, e sobe de volta se a pessoa voltar pra abertura.
function wireHeaderReveal() {
  const header = document.querySelector(".site-header");
  const hero = REAL_HERO;
  if (!header || !hero) return;

  if (!hasGSAP || prefersReducedMotion) { header.classList.add("is-on"); return; }

  ScrollTrigger.create({
    trigger: hero,
    start: "top 75%",
    onEnter: () => header.classList.add("is-on"),
    onLeaveBack: () => header.classList.remove("is-on"),
  });
}

// Cena 3: a página. Categoria, título, texto de apoio e botão entram em
// sequência quando o hero chega na tela — e desfazem ao subir, pra combinar
// com a abertura, que também é reversível.
function playHeroIntro() {
  const title = document.getElementById("hero-title");
  const lead = document.getElementById("hero-lead");
  const actions = document.getElementById("hero-actions-el");
  const cue = document.getElementById("hero-scrollcue");
  const items = [title, lead, actions, cue].filter(Boolean);
  if (!items.length) return;

  if (!hasGSAP || prefersReducedMotion) {
    items.forEach((el) => { el.style.opacity = 1; });
    return;
  }

  const tween = gsap.fromTo(items,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: .7, stagger: .16, ease: "power3.out", paused: true }
  );

  // Um pequeno atraso antes de tocar ou desfazer: sem isso, um solavanco da
  // rolagem por inércia bem em cima da linha "top 65%" (comum no celular)
  // disparava entra-sai-entra rapidinho, e o hero parecia aparecer duas vezes.
  let heroIntroTimer = null;
  ScrollTrigger.create({
    trigger: REAL_HERO,
    start: "top 65%",
    onEnter: () => { clearTimeout(heroIntroTimer); heroIntroTimer = setTimeout(() => tween.play(), 120); },
    onLeaveBack: () => { clearTimeout(heroIntroTimer); heroIntroTimer = setTimeout(() => tween.reverse(), 120); },
  });
}

// Indicador de "role para continuar" no hero: some assim que a pessoa começa
// a rolar, pra não ficar sobrando na tela depois que ela já entendeu o gesto.
function wireScrollCue() {
  const cue = document.querySelector(".scroll-cue");
  if (!cue) return;
  const hide = () => {
    if (window.scrollY > 60) {
      cue.classList.add("is-hidden");
      window.removeEventListener("scroll", hide);
    }
  };
  window.addEventListener("scroll", hide, { passive: true });
}

// Tilt 3D nos cards marcados com [data-tilt]: a inclinação segue a posição
// do mouse/dedo dentro do card, e volta ao normal quando ele sai.
function wireTilt() {
  if (prefersReducedMotion) return;
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    function handleMove(clientX, clientY) {
      const rect = card.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      card.style.transform = `perspective(700px) rotateX(${(py - .5) * -10}deg) rotateY(${(px - .5) * 10}deg)`;
    }
    const reset = () => { card.style.transform = "perspective(700px) rotateX(0deg) rotateY(0deg)"; };
    card.addEventListener("pointermove", (e) => handleMove(e.clientX, e.clientY));
    card.addEventListener("pointerleave", reset);
    card.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      if (t) handleMove(t.clientX, t.clientY);
    }, { passive: true });
    card.addEventListener("touchend", reset);
  });
}

// Confete em canvas: um estouro de partículas a partir de um ponto, usado no
// botão do CTA final.
class Confetti {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.raf = null;
    this.colors = ["#D77713", "#B65B08", "#4682B4", "#90BED9", "#F5F5F5"];
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";
    this.w = rect.width;
    this.h = rect.height;
  }
  burst(x, y, count = 80) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 3 + Math.random() * 4,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - .5) * .3,
        life: 1,
        decay: .008 + Math.random() * .01,
        shape: Math.random() > .5 ? "rect" : "circle",
      });
    }
    if (!this.raf) this.loop();
  }
  loop() {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    let alive = false;
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.vy += .12;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.decay;
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .6);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (alive) this.raf = requestAnimationFrame(() => this.loop());
    else this.raf = null;
  }
}

function wireConfettiCTA() {
  const btn = document.getElementById("final-cta-btn");
  const canvas = document.getElementById("confetti-cta");
  if (!btn || !canvas) return;
  const confetti = new Confetti(canvas);
  btn.addEventListener("click", () => {
    const rect = canvas.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    confetti.burst(b.left - rect.left + b.width / 2, b.top - rect.top + b.height / 2, 90);
  });
}
