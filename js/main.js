// =========================================================
// Do Medo ao Play — Landing Page (funil de vendas Hotmart)
// =========================================================

// 1) COLE AQUI o link de checkout do Hotmart antes de publicar.
//    Todos os botões marcados com [data-checkout-link] vão usar essa URL.
const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/COLOQUE-SEU-CODIGO-AQUI";

document.addEventListener("DOMContentLoaded", () => {
  wireCheckoutLinks();
  wireAccordions();
  wireScrollReveal();
  wireThoughtsReveal();
  wireCountUp();
  wireScrollEffects();
  wireReviewMode();
  wireViewfinderVideo();
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
  const hero = document.querySelector(".hero");
  const stage = document.querySelector(".cinema-stage");
  const inner = document.querySelector(".hero-inner");
  const copy = document.querySelector(".hero-copy");
  const bar = document.querySelector(".read-progress");
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

    if (bar) bar.style.setProperty("--read", maxScroll > 0 ? clamp(y / maxScroll).toFixed(4) : "0");
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
      if (isOpenInitially) {
        item.classList.add("open");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }

      trigger.addEventListener("click", () => {
        const willOpen = !item.classList.contains("open");

        items.forEach((other) => {
          const otherTrigger = other.querySelector(".accordion-trigger");
          const otherPanel = other.querySelector(".accordion-panel");
          other.classList.remove("open");
          otherTrigger.setAttribute("aria-expanded", "false");
          otherPanel.style.maxHeight = null;
        });

        if (willOpen) {
          item.classList.add("open");
          trigger.setAttribute("aria-expanded", "true");
          panel.style.maxHeight = panel.scrollHeight + "px";
        }
      });
    });
  });

  function refitOpenPanels() {
    document.querySelectorAll(".accordion-item.open .accordion-panel").forEach((panel) => {
      // scrollHeight lê 0 se o painel (ou um ancestral) estiver display:none no
      // instante da medição (ex.: troca de aba, teclado virtual). Nunca gravar isso.
      if (panel.scrollHeight > 0) {
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  }

  window.addEventListener("resize", refitOpenPanels);
  // O módulo que já vem aberto era medido antes das fontes carregarem; quando a
  // fonte chegava o texto crescia e a última linha ficava cortada.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refitOpenPanels);
  window.addEventListener("load", refitOpenPanels);
}

function wireScrollReveal() {
  // Listas com cascata própria revelam item a item; o contêiner delas fica de fora.
  // Animar contêiner e filhos juntos fazia os cards "pularem" quando o de fora
  // terminava de aparecer (a tela piscava no antes/depois).
  // Os balões de pensamento (.thought) têm a própria revelação, presa à rolagem
  // (ver wireThoughtsReveal) — por isso ficam de fora daqui.
  const targets = [...document.querySelectorAll(
    ".section .container > *, .ladder-step, .accordion-item, .fact-card, .compare-col, " +
    ".thoughts-person, .timeline li, .front-card, .big-fact"
  )].filter((el) => !el.matches(
    ".thoughts, .thought-col, .timeline, .two-fronts, .big-facts, .compare-grid, .ladder, .accordion"
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

// Balões da seção "Você se reconhece?": em vez de aparecerem todos juntos ao
// entrar na tela, saem um de cada vez conforme a pessoa rola a página — presos
// ao progresso da rolagem, não a um tempo fixo (por isso ficam fora do
// wireScrollReveal, que só olha "entrou ou não entrou na tela").
function wireThoughtsReveal() {
  const container = document.querySelector(".thoughts");
  if (!container) return;
  const items = [...container.querySelectorAll(".thought")];
  if (!items.length) return;
  const person = container.querySelector(".thoughts-person");

  // Assim que o último pensamento aparece, a câmera gira e some da tela.
  function sendPersonAway() {
    if (person) person.classList.add("is-leaving");
  }

  items.forEach((el) => el.classList.add("reveal"));

  if (
    !("IntersectionObserver" in window) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    items.forEach((el) => el.classList.add("is-visible"));
    sendPersonAway();
    return;
  }

  let start = 0;
  let span = 1;
  let revealedCount = 0;
  let ticking = false;

  function measure() {
    const top = container.getBoundingClientRect().top + window.scrollY;
    const height = container.offsetHeight;
    // Começa a soltar o primeiro balão um pouco antes do topo do bloco chegar
    // ao fim da tela, e solta o último perto de a rolagem passar do bloco —
    // assim o "um de cada vez" acontece na rolagem real, não num timer.
    start = top - window.innerHeight * 0.75;
    span = Math.max(1, height + window.innerHeight * 0.35);
    update();
  }

  function update() {
    ticking = false;
    const progress = clamp((window.scrollY - start) / span);
    const count = progress <= 0 ? 0 : Math.min(items.length, Math.ceil(progress * items.length));
    for (let i = revealedCount; i < count; i++) items[i].classList.add("is-visible");
    const wasComplete = revealedCount >= items.length;
    revealedCount = Math.max(revealedCount, count);
    if (!wasComplete && revealedCount >= items.length) sendPersonAway();
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  measure();
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

// Vídeo do visor da câmera: pula o primeiro segundo (sem precisar reeditar o
// arquivo) e toca só uma vez — no fim, fica parado no último quadro até a
// câmera girar e sair de cena (ver wireThoughtsReveal).
function wireViewfinderVideo() {
  const video = document.querySelector(".viewfinder-video");
  if (!video) return;
  const skipSeconds = 1;

  const start = () => {
    try { video.currentTime = skipSeconds; } catch (e) { /* metadata ainda não carregou */ }
    video.play().catch(() => {});
  };

  if (video.readyState >= 1) start();
  else video.addEventListener("loadedmetadata", start, { once: true });
}
