// =========================================================
// Do Medo ao Play — Landing Page (funil de vendas Hotmart)
// =========================================================

// 1) COLE AQUI o link de checkout do Hotmart antes de publicar.
//    Todos os botões marcados com [data-checkout-link] vão usar essa URL.
const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/COLOQUE-SEU-CODIGO-AQUI";

// 2) GSAP + ScrollTrigger (em js/vendor) tocam a abertura. Sem eles (falha de
//    rede, bloqueio de script), a abertura é pulada e a página abre direto:
//    nada fica preso.
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

// A abertura monta uma réplica do menu e do herói dentro da câmera. As
// referências reais são guardadas logo no começo, antes da réplica existir.
let REAL_HERO = null;
let REAL_HEADER = null;

document.addEventListener("DOMContentLoaded", () => {
  REAL_HERO = document.querySelector(".hero");
  REAL_HEADER = document.querySelector(".site-header");
  wireCheckoutLinks();
  wireLinksVazios();
  wireAncoras();
  wireAccordions();
  wireScrollReveal();
  wireDepoimentos();
  wireCountUp();
  wireScrollEffects();
  wireScrollCue();
  wireIntroStage();
  wireManterLugar();
  wireHeaderReveal();
  playHeroIntro();
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

// Tudo que depende da rolagem num lugar só: o herói (a página sobe e a foto vai
// ficando pra trás, crescendo) e a barra de progresso.
// As medidas da página são lidas só quando algo muda de tamanho, nunca a cada
// quadro da rolagem: ler medidas logo depois de mexer em estilo trava o celular.
// A cena do herói foi montada num palco de 941x1672. Aqui ela é escalada pra
// cobrir a caixa dela (o mesmo que object-fit: cover faz numa imagem), o que
// o CSS sozinho não consegue: precisa comparar largura e altura.
// Vale pra cena de verdade e pra réplica que a abertura monta dentro do
// celular. Por isso a medida é a do layout (offsetWidth/Height), que ignora o
// transform que encolhe a réplica — as duas ficam enquadradas igual.
// Onde começam os ícones na cena montada (y em px no palco de 941x1672): em
// tela em pé a cena desce até eles ficarem logo abaixo do texto do herói.
const CENA_ICONES_TOPO = 604;
// Altura do rosto na cena (entre a testa e o queixo): o zoom da rolagem gira
// em torno dele, pra ele não fugir da tela.
const CENA_ROSTO = 880;
// Altura da tela sem a barra do navegador (100svh): não muda enquanto a pessoa
// rola, então o herói não fica mudando de tamanho no meio da rolagem.
let sondaTela = null;
function alturaDaTela() {
  if (!sondaTela) {
    sondaTela = document.createElement("div");
    sondaTela.setAttribute("aria-hidden", "true");
    sondaTela.style.cssText = "position:absolute;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none";
    document.body.appendChild(sondaTela);
  }
  return sondaTela.offsetHeight || window.innerHeight;
}
function ajustaCena3D() {
  document.querySelectorAll(".hero3d-stage").forEach((palco) => {
    const caixa = palco.parentElement;
    const w = caixa.offsetWidth;
    const h = caixa.offsetHeight;
    if (!w || !h) return;
    // Tela deitada (computador, tablet deitado) usa a foto horizontal inteira
    // (ver CSS); a cena em camadas é a da tela em pé.
    const deitada = window.matchMedia("(min-width: 700px) and (orientation: landscape)").matches;
    palco.classList.toggle("is-lado", deitada);
    // Em pé a conta é pela altura da tela (estável: 100svh não muda quando a
    // barra do navegador some), não pela do herói, que depende da própria cena.
    const tela = alturaDaTela();
    // Em pé a cena fica 10% maior que o necessário pra cobrir a tela: a foto
    // passa mais da rolagem.
    const escala = deitada ? h / 1672 : Math.max(w / 941, tela / 1672) * 1.1;
    palco.style.setProperty("--hero3d-s", escala.toFixed(4));
    // Em pé a cena cobre o herói inteiro, atrás do texto. Com o texto comprido,
    // ela desce até os ícones ficarem logo abaixo do botão; o alto da tela
    // continua o céu escuro da própria foto (degradê no CSS).
    const cinema = palco.closest(".cinema-stage");
    const fimTexto = cinema ? parseFloat(cinema.style.getPropertyValue("--hero-text-bottom")) : NaN;
    const topo = tela / 2 - 836 * escala;
    let desce = 0;
    if (!deitada && isFinite(fimTexto)) {
      desce = Math.min(tela * .4, Math.max(0, fimTexto + 12 - (topo + CENA_ICONES_TOPO * escala)));
    }
    const cenaY = topo + desce;
    caixa.style.setProperty("--cena-y", cenaY.toFixed(1) + "px");
    caixa.style.setProperty("--cena-emenda", cenaY.toFixed(1) + "px");
    if (cinema) {
      if (deitada) {
        cinema.style.removeProperty("--portal-origin");
        cinema.style.removeProperty("--hero-altura");
      } else {
        // O herói vai até o pé da foto: rolando, a pessoa vê a foto inteira
        // antes de a próxima seção chegar.
        const altura = Math.max(tela, Math.round(cenaY + 1672 * escala));
        cinema.style.setProperty("--hero-altura", altura + "px");
        cinema.style.setProperty("--portal-origin", "52% " + Math.round((cenaY + CENA_ROSTO * escala) / altura * 100) + "%");
      }
    }
  });
}
function wireScrollEffects() {
  const root = document.documentElement;
  const header = document.querySelector(".site-header");
  const hero = REAL_HERO;
  const stage = document.querySelector(".cinema-stage");
  // Só a cena de verdade acompanha a rolagem (a réplica da abertura fica parada).
  const cena3d = hero ? hero.querySelector(".hero3d-stage") : null;
  const inner = document.querySelector(".hero-inner");
  const copy = document.querySelector(".hero-copy");
  const bar = document.querySelector(".read-progress");
  // A classe é ligada no <head> só quando o movimento é permitido.
  const cinema = Boolean(hero && stage && root.classList.contains("cinema-on"));

  let heroTop = 0;
  let heroAltura = 0;
  let maxScroll = 0;
  let ticking = false;

  function measure() {
    if (header) {
      // Altura real do menu (muda com a logo, a fonte e o zoom de telas grandes).
      root.style.setProperty("--header-h", header.getBoundingClientRect().height + "px");
    }
    if (stage && inner && copy) {
      // O fim do texto decide quanto a cena desce em tela em pé (ajustaCena3D).
      // offsetTop/offsetHeight ignoram o translateY da animação.
      stage.style.setProperty("--hero-text-bottom", inner.offsetTop + copy.offsetTop + copy.offsetHeight + "px");
    }
    // Depois do fim do texto: a caixa da cena depende dele.
    ajustaCena3D();
    if (hero) {
      heroTop = hero.getBoundingClientRect().top + window.scrollY;
      heroAltura = hero.offsetHeight;
    }
    maxScroll = root.scrollHeight - window.innerHeight;
    update();
  }

  function update() {
    ticking = false;
    const y = window.scrollY;

    // A trilha de leitura fica parada enquanto a abertura toca.
    const introActive = root.classList.contains("abertura-on");
    if (bar) bar.style.setProperty("--read", introActive || maxScroll <= 0 ? "0" : clamp(y / maxScroll).toFixed(4));
    if (!cinema || !heroAltura) return;

    // Camadas de GPU da animação só existem enquanto o herói está na tela. Mantidas
    // o tempo todo, deixavam o menu sumir e mostravam um pedaço da foto repetido.
    const onScreen = y < heroTop + heroAltura && y + window.innerHeight > heroTop;
    stage.classList.toggle("is-live", onScreen);
    if (!onScreen) return;

    // Nada fica preso nem é coberto: a página sobe normalmente e a foto vai
    // crescendo devagar em volta do rosto, com os ícones se mexendo. É isso que
    // dá a sensação de ir entrando na imagem enquanto rola.
    const p = clamp((y - heroTop) / heroAltura);
    if (cena3d) cena3d.style.setProperty("--cena-p", p.toFixed(3));
    stage.style.setProperty("--portal-scale", (1 + p * 0.15).toFixed(3));
  }

  // A animação da cena (câmera balançando, ícones flutuando, brilho pulsando)
  // roda enquanto a pessoa rola e congela quando ela para: a classe entra a
  // cada evento de rolagem e sai 180ms depois do último.
  let paradaCena = 0;
  window.addEventListener("scroll", () => {
    if (cena3d) {
      cena3d.classList.add("is-rolando");
      clearTimeout(paradaCena);
      paradaCena = setTimeout(() => cena3d.classList.remove("is-rolando"), 180);
    }
  }, { passive: true });

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

  // Quando o ScrollTrigger remede a página (giro do celular, janela nova), a
  // posição do herói muda junto e precisa ser lida de novo.
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
  } catch {
    return HOTMART_CHECKOUT_URL;
  }
}

// Links ainda sem destino (href="#", como os do rodapé enquanto as páginas de
// política, termos e suporte não existem): o clique não leva a pessoa pro
// topo, que é a abertura recomeçando do zero.
function wireLinksVazios() {
  const vazios = [...document.querySelectorAll('.footer-legal a[href="#"]')].map((a) => a.textContent.trim());
  if (vazios.length) console.warn("Do Medo ao Play: links do rodapé ainda sem endereço: " + vazios.join(", ") + " (index.html).");
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  });
}

// Links pra dentro da página ("Ver como a escada...", a logo) rolam suave pelo
// JS: a rolagem suave no CSS do html atrapalhava o ScrollTrigger (ver o
// comentário no style.css). O "Pular para o conteúdo" continua pulando direto.
function wireAncoras() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]:not(.skip-link)');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    const alvo = id && document.getElementById(id);
    if (!alvo) return;
    e.preventDefault();
    alvo.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    history.pushState(null, "", "#" + id);
  });
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

// Depoimentos em carrossel: o vídeo do meio é sempre o maior e os outros dois
// aparecem menores dos lados. Arrastar pro lado (dedo ou mouse), tocar num dos
// lados ou usar as setas do teclado traz outro pro meio. Com três vídeos a
// fila dá a volta, então sempre tem um de cada lado.
function wireDepoimentos() {
  const palco = document.querySelector(".depo-palco");
  if (!palco) return;
  const cards = [...palco.querySelectorAll(".depo-card")];
  const n = cards.length;
  if (n < 2) return;
  let ativo = Math.floor(n / 2);
  let arrasto = 0;        // quanto o dedo já levou, em "cards"
  let toque = null;
  let arrastando = false;
  const passo = () => (cards[0].offsetWidth || 1) * .72;

  function posicao(i) {
    let d = i - ativo;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d - arrasto;
  }
  function desenha(anima) {
    const s = passo();
    cards.forEach((card, i) => {
      const p = posicao(i);
      const a = Math.min(1, Math.abs(p));
      card.style.transition = anima ? "" : "none";
      card.style.transform = "translate3d(" + (p * s).toFixed(1) + "px, 0, 0) scale(" + (1 - .2 * a).toFixed(3) + ")";
      card.style.opacity = (1 - .3 * a).toFixed(3);
      card.style.zIndex = String(10 - Math.round(Math.abs(p) * 3));
      card.classList.toggle("is-ativo", Math.abs(p) < .5);
    });
  }
  function vai(novo) {
    ativo = (novo + n) % n;
    arrasto = 0;
    desenha(true);
  }

  palco.addEventListener("pointerdown", (e) => {
    toque = { x: e.clientX, y: e.clientY, id: e.pointerId };
    arrastando = false;
  });
  palco.addEventListener("pointermove", (e) => {
    if (!toque || e.pointerId !== toque.id) return;
    const dx = e.clientX - toque.x;
    const dy = e.clientY - toque.y;
    // Só vira arrasto de lado quando o gesto é mais pro lado que pra baixo:
    // rolar a página por cima dos vídeos continua funcionando.
    if (!arrastando && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      arrastando = true;
      palco.classList.add("is-arrastando");
      try { palco.setPointerCapture(e.pointerId); } catch { /* segue sem captura */ }
    }
    if (arrastando) {
      arrasto = gsap.utils.clamp(-1.2, 1.2, -dx / passo());
      desenha(false);
    }
  });
  const solta = (e) => {
    if (!toque || (e && e.pointerId !== toque.id)) return;
    if (arrastando) {
      palco.classList.remove("is-arrastando");
      if (arrasto > .2) vai(ativo + 1);
      else if (arrasto < -.2) vai(ativo - 1);
      else vai(ativo);
    } else if (e && e.type === "pointerup") {
      // Toque num vídeo do lado: ele vem pro meio.
      const card = e.target.closest && e.target.closest(".depo-card");
      const i = cards.indexOf(card);
      if (i >= 0 && i !== ativo) vai(i);
    }
    toque = null;
    arrastando = false;
  };
  palco.addEventListener("pointerup", solta);
  palco.addEventListener("pointercancel", solta);
  palco.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); vai(ativo + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); vai(ativo - 1); }
  });
  window.addEventListener("resize", () => desenha(false), { passive: true });
  desenha(false);
}

function wireScrollReveal() {
  // Listas com cascata própria revelam item a item; o contêiner delas fica de fora.
  // Animar contêiner e filhos juntos fazia os cards "pularem" quando o de fora
  // terminava de aparecer (a tela piscava no antes/depois).
  const targets = [...document.querySelectorAll(
    ".section .container > *, .nivel-card, .accordion-item"
  )].filter((el) => !el.matches(
    ".accordion, .niveis-trilho"
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
// ABERTURA (toca sozinha quando a página abre)
// O túnel avança sozinho, "E se, em vez de travar…" aparece, a câmera se
// desenha e a tela dela mostra a primeira seção da página. No fim a tela
// cresce até a janela inteira e VIRA a página: o clarão disfarça a emenda e
// o menu e o herói fazem a entrada deles. Ninguém precisa rolar; rolar,
// tocar, clicar ou apertar uma tecla adianta direto pra travessia.
// =========================================================

// O menu e o herói esperam a abertura acabar (ou saber que ela nem vai rodar).
let aberturaAcabou = false;
function quandoAberturaAcabar(fn) {
  if (aberturaAcabou) fn();
  else document.addEventListener("abertura:fim", fn, { once: true });
}

function wireIntroStage() {
  const root = document.documentElement;
  const stage = document.getElementById("intro-stage");
  const video = document.getElementById("tunnel-video");
  const veil = document.getElementById("tunnel-veil");
  const faixas = document.getElementById("tunnel-faixas");
  const scene2 = document.getElementById("intro-scene2");
  const burstPre = document.getElementById("burst-pre");
  const burstStage = document.getElementById("burst-stage");
  const burstScreen = document.getElementById("burst-screen");
  const flash = document.getElementById("flash");
  const burstTitleSpans = [...document.querySelectorAll("#burst-title span")];
  const burstCamera = document.getElementById("burst-camera");
  const burstIlha = document.getElementById("burst-ilha");
  const burstTempo = document.getElementById("burst-tempo");
  const burstGravar = document.querySelector("#burst-gravar i");

  let tl = null;
  let relogio = 0;
  // Enquanto a abertura toca, rolar/tocar/teclar não mexe na página: adianta a abertura.
  const TECLAS_DE_ROLAR = [" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End", "Tab"];
  const bloqueia = (e) => { e.preventDefault(); adianta(); };
  const tecla = (e) => { if (TECLAS_DE_ROLAR.includes(e.key)) e.preventDefault(); adianta(); };

  // Libera a página: a camada sai do documento, a rolagem volta e o menu e o
  // herói fazem a entrada deles. "forcado" é a trava de segurança (abertura
  // travada ou aba escondida): aí a animação para onde estiver.
  function libera(forcado) {
    if (aberturaAcabou) return;
    aberturaAcabou = true;
    clearInterval(relogio);
    window.removeEventListener("wheel", bloqueia);
    window.removeEventListener("touchmove", bloqueia);
    window.removeEventListener("keydown", tecla);
    if (forcado === true && tl) {
      tl.kill();
      if (flash) gsap.set(flash, { opacity: 0 });
    }
    root.classList.remove("abertura-on");
    if (stage) stage.remove();
    document.dispatchEvent(new Event("abertura:fim"));
  }
  window.liberaAbertura = () => libera(true);

  // Sem abertura: menos movimento, sem GSAP, endereço com âncora (a classe nem
  // entra, ver o <head>), página que já abriu rolada ou aba aberta escondida.
  if (!stage || !video || !burstStage || !root.classList.contains("abertura-on") ||
      !hasGSAP || prefersReducedMotion || window.scrollY > 0 || document.hidden) {
    libera();
    return;
  }
  window.aberturaAssumida = true;

  // ---- A RÉPLICA DA PÁGINA DENTRO DA CÂMERA ----
  // Em vez de uma foto, a tela mostra uma cópia viva do menu + herói, do
  // tamanho exato da janela e reduzida pra caber. Na travessia ela cresce até
  // escala 1, então a tela da câmera VIRA a página, sem corte.
  let mini = null;

  function buildMiniScreen() {
    if (!burstScreen || !REAL_HERO) return;
    mini = document.createElement("div");
    mini.className = "burst-mini";
    [REAL_HEADER, REAL_HERO].forEach((node) => {
      if (!node) return;
      const copy = node.cloneNode(true);
      // Sem ids repetidos: a cópia não pode responder ao CSS/JS do original
      // (é por causa dos ids que o herói de verdade começa invisível).
      copy.removeAttribute("id");
      copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      copy.querySelectorAll("a, button").forEach((el) => el.setAttribute("tabindex", "-1"));
      mini.appendChild(copy);
    });
    burstScreen.appendChild(mini);
    ajustaCena3D();
  }

  // O iPhone tem tamanho próprio (CSS): em pé na tela em pé, deitado na
  // deitada. A réplica é do tamanho da janela, reduzida pra caber na tela dele.
  function sizeStage() {
    if (!mini) return;
    gsap.set(mini, { width: window.innerWidth, height: window.innerHeight });
    // As medidas que o JS põe no herói de verdade (onde a cena começa etc.)
    // valem pra réplica também.
    const real = REAL_HERO.querySelector(".cinema-stage");
    const copia = mini.querySelector(".cinema-stage");
    if (real && copia) copia.setAttribute("style", real.getAttribute("style") || "");
    fitMini();
  }
  // Escala da réplica: cabe inteira na tela do iPhone. Pelo layout (offsetWidth),
  // que não muda com o giro nem com o zoom do aparelho.
  const escalaDaReplica = () => Math.min(
    (burstScreen.offsetWidth || 1) / window.innerWidth,
    (burstScreen.offsetHeight || 1) / window.innerHeight
  );
  function fitMini() {
    if (!mini || !burstScreen) return;
    gsap.set(mini, { scale: escalaDaReplica(), xPercent: -50, yPercent: -50 });
  }

  buildMiniScreen();
  sizeStage();
  window.addEventListener("resize", () => { if (!tl || tl.time() < tl.labels.cresce) sizeStage(); });

  gsap.set(burstStage, { transformPerspective: 1100, transformOrigin: "50% 50%" });
  gsap.set(scene2, { autoAlpha: 1 });
  gsap.set(burstPre, { opacity: 0, y: 10 });
  gsap.set(burstTitleSpans, { opacity: 0, y: 12 });

  // No "play?" o botão de gravar é apertado (vira o quadradinho de parar,
  // como no iPhone) e o tempo começa a contar.
  function aperta() {
    if (burstGravar) gsap.to(burstGravar, { width: "46%", height: "46%", borderRadius: "22%", duration: .35, ease: "power2.inOut" });
    if (burstTempo) gsap.to(burstTempo, { backgroundColor: "rgba(255, 59, 48, .9)", duration: .3 });
    const texto = burstTempo && burstTempo.querySelector("b");
    let s = 0;
    clearInterval(relogio);
    relogio = setInterval(() => { s += 1; if (texto) texto.textContent = "00:00:" + String(s).padStart(2, "0"); }, 1000);
  }

  // ---- A ANIMAÇÃO (em segundos de verdade, uns 6 no total) ----
  tl = gsap.timeline({ paused: true });
  tl
    // O túnel surge do escuro.
    .to(veil, { opacity: 0, duration: .9, ease: "power1.out" }, 0)
    .to(faixas, { opacity: .7, duration: .6 }, .2)
    .to(burstPre, { opacity: 1, y: 0, duration: .6, ease: "power2.out" }, .45)
    // O iPhone entra: sobe do fundo girando até ficar quase de frente.
    .fromTo(burstStage,
      { autoAlpha: 0, y: 70, scale: .88, rotationX: 24, rotationY: -22 },
      { autoAlpha: 1, y: 0, scale: 1, rotationX: 7, rotationY: -9, duration: 1.3, ease: "power3.out" }, .5)
    // A câmera liga: a página aparece na tela e a interface de gravação acende.
    .to(burstScreen, { opacity: 1, duration: .6, ease: "power2.out" }, 1.05)
    .to(burstCamera, { opacity: 1, duration: .4 }, 1.45)
    // Enquanto a pergunta se completa, ele termina de virar de frente, devagar.
    .to(burstStage, { rotationX: 3, rotationY: -4, duration: 1.6, ease: "sine.inOut" }, 1.8)
    .to(faixas, { opacity: 1, duration: .9, ease: "power2.inOut" }, 2.2)
    .to(burstTitleSpans, { opacity: 1, y: 0, duration: .45, stagger: .15, ease: "back.out(1.7)" }, 2.5)
    .call(aperta, null, 3.05)
    // Tempo de ler a pergunta inteira; depois o texto sai e o iPhone fica de frente.
    .addLabel("atravessa", 4.6)
    .to([burstPre, ...burstTitleSpans], { opacity: 0, duration: .4 }, "atravessa")
    .to(faixas, { opacity: 0, duration: .4 }, "atravessa")
    .to(burstStage, { rotationX: 0, rotationY: 0, duration: .5, ease: "power2.inOut" }, "atravessa")
    .to([burstCamera, burstIlha], { opacity: 0, duration: .35 }, "atravessa+=.15")
    // ATRAVESSA: a câmera entra na tela do iPhone até ela ocupar a janela. A
    // réplica lá dentro chega em escala 1: a tela VIRA a página, sem corte.
    .addLabel("cresce", "atravessa+=.4")
    .to(burstStage, { scale: () => 1 / escalaDaReplica(), duration: 1.5, ease: "power3.in" }, "cresce")
    .to(burstScreen, { borderRadius: 0, duration: 1.5, ease: "power3.in" }, "cresce")
    .to(flash, { opacity: 1, duration: .45, ease: "power2.in" }, "cresce+=1.05")
    .call(libera)
    .to(flash, { opacity: 0, duration: .8, ease: "power2.out" });

  // ---- O TÚNEL ----
  // Vídeo de 12s dos arcos até a porta de luz laranja, tocando sozinho. O
  // ritmo é acertado pra ele chegar na porta quando a tela termina de crescer
  // (a luz do vídeo emenda no clarão). Tela em pé usa o vídeo vertical.
  const VIDEOS = {
    celular: { src: "assets/video/tunel-celular.mp4", poster: "assets/video/tunel-celular-poster.jpg" },
    computador: { src: "assets/video/tunel-desktop.mp4", poster: "assets/video/tunel-desktop-poster.jpg" },
  };
  const modo = window.matchMedia("(max-aspect-ratio: 1/1)").matches ? "celular" : "computador";
  const porta = tl.labels.cresce + 1.5;
  // Os 3 primeiros segundos do vídeo são os mesmos arcos azuis passando
  // devagar: a abertura começa depois deles.
  const CORTE = 3;
  let comecou = false;
  let semVideo = false;
  let esperaVideo = 0;

  // O túnel começa devagar e vai acelerando até a porta de luz. O ritmo final
  // é o que faz ele chegar lá quando a tela da câmera termina de crescer (a luz
  // do vídeo emenda no clarão).
  const RITMO_INICIAL = 1;
  let ritmoFinal = 2;
  let ritmo = null;
  function ajustaRitmo() {
    video.defaultPlaybackRate = RITMO_INICIAL;
    video.playbackRate = RITMO_INICIAL;
    // Com power1.in (t²), o ritmo médio é inicial + (final - inicial) / 3.
    if (isFinite(video.duration) && video.duration > CORTE) {
      ritmoFinal = gsap.utils.clamp(1, 4, RITMO_INICIAL + 3 * ((video.duration - CORTE) / porta - RITMO_INICIAL));
      // Navegador que ignora o "#t=" do endereço: pula o começo aqui.
      if (video.currentTime < CORTE - .1) video.currentTime = CORTE;
    }
  }
  // Onde o vídeo deve estar em cada instante da animação (a soma do ritmo).
  const tempoDoVideo = (t) => CORTE + RITMO_INICIAL * t + (ritmoFinal - RITMO_INICIAL) * t * t * t / (3 * porta * porta);
  function aceleraTunel() {
    const r = { v: RITMO_INICIAL };
    video.playbackRate = RITMO_INICIAL;
    ritmo = gsap.to(r, {
      v: ritmoFinal,
      duration: porta,
      ease: "power1.in",
      // Muda o ritmo do vídeo em passos pequenos, não a cada quadro.
      onUpdate: () => { if (Math.abs(video.playbackRate - r.v) >= .04) video.playbackRate = r.v; },
    });
  }
  function comeca() {
    if (comecou) return;
    comecou = true;
    clearTimeout(esperaVideo);
    if (video.paused || video.readyState < 2) {
      // O vídeo não veio a tempo (rede lenta, modo de economia do celular):
      // fica a imagem do começo do túnel, que se aproxima devagar.
      semVideo = true;
      video.pause();
      video.removeAttribute("src");
      video.load();
      gsap.fromTo(video, { scale: 1 }, { scale: 1.3, duration: porta, ease: "power1.in" });
    } else {
      aceleraTunel();
    }
    tl.play();
    // Trava de segurança: a página nunca fica presa atrás da abertura.
    setTimeout(() => libera(true), (tl.duration() + 4) * 1000);
  }

  // Adianta direto pra travessia (a tela da câmera crescendo até virar a
  // página), bem mais rápido: rolar, tocar ou apertar uma tecla.
  let adiantou = false;
  function adianta() {
    if (adiantou || aberturaAcabou) return;
    adiantou = true;
    const t = tl.labels.atravessa;
    if (ritmo) ritmo.kill();
    if (tl.time() < t) {
      tl.seek(t);
      if (!semVideo && video.readyState >= 1) {
        try { video.currentTime = Math.min(video.duration || 0, tempoDoVideo(t)); } catch { /* segue sem acertar o vídeo */ }
      }
    }
    tl.timeScale(2.2);
    // Na travessia rápida, o túnel corre até a porta junto com a tela.
    if (!semVideo) video.playbackRate = Math.min(16, ritmoFinal * 2.2);
    if (!comecou) {
      comecou = true;
      clearTimeout(esperaVideo);
      setTimeout(() => libera(true), 8000);
    }
    tl.play();
  }

  window.addEventListener("wheel", bloqueia, { passive: false });
  window.addEventListener("touchmove", bloqueia, { passive: false });
  window.addEventListener("keydown", tecla);
  stage.addEventListener("click", adianta);

  video.poster = VIDEOS[modo].poster;
  video.addEventListener("loadedmetadata", ajustaRitmo);
  video.addEventListener("playing", comeca, { once: true });
  video.src = VIDEOS[modo].src + "#t=" + CORTE;
  const tocando = video.play();
  // Vídeo bloqueado (modo de economia do iPhone): começa na hora, com a imagem.
  if (tocando && tocando.catch) tocando.catch(comeca);
  // Rede lenta: não espera mais que isso pra começar.
  esperaVideo = setTimeout(comeca, 2500);
}

// Girar o celular (ou mudar a largura da janela) muda a altura das seções que
// seguem o tamanho da tela (a abertura, o herói): a rolagem ficava no mesmo
// número e a pessoa ia parar em outra seção. Guarda onde ela estava lendo (a
// seção no meio da tela e quanto dela já tinha passado) e volta pra lá depois
// que o ScrollTrigger remede a página.
function wireManterLugar() {
  if (!hasGSAP) return;
  let lugar = null;
  let espera = 0;
  // Toda mudança de largura (girar o celular, mudar a janela) remede a página.
  // O ScrollTrigger nem sempre remedia sozinho na volta pro modo em pé e a
  // abertura ficava com o tamanho da tela deitada. A barra de endereço do
  // celular (só a altura muda) não conta.
  let largura = window.innerWidth;
  let remede = 0;
  // Enquanto a página se reorganiza depois do giro, o lugar guardado não é
  // regravado: a rolagem desse meio tempo é do ajuste, não da pessoa.
  let congelado = false;
  let solta = 0;
  window.addEventListener("resize", () => {
    if (window.innerWidth === largura) return;
    largura = window.innerWidth;
    congelado = true;
    clearTimeout(remede);
    remede = setTimeout(() => ScrollTrigger.refresh(), 250);
  });
  const guarda = () => {
    if (congelado) return;
    const meio = window.innerHeight / 2;
    const el = document.elementFromPoint(window.innerWidth / 2, meio);
    const secao = el && el.closest("main > section, .site-footer");
    if (!secao) { lugar = null; return; }
    const r = secao.getBoundingClientRect();
    lugar = { secao, fracao: r.height ? (meio - r.top) / r.height : 0 };
  };
  window.addEventListener("scroll", () => { clearTimeout(espera); espera = setTimeout(guarda, 200); }, { passive: true });
  ScrollTrigger.addEventListener("refresh", () => {
    clearTimeout(solta);
    solta = setTimeout(() => { congelado = false; }, 800);
    if (!lugar || !lugar.secao.isConnected) return;
    const r = lugar.secao.getBoundingClientRect();
    const alvo = Math.round(window.scrollY + r.top + lugar.fracao * r.height - window.innerHeight / 2);
    if (Math.abs(alvo - window.scrollY) > 2) window.scrollTo({ top: alvo, left: 0, behavior: "instant" });
  });
}

// O menu não existe durante a abertura: ele desce junto com a página de vendas.
function wireHeaderReveal() {
  const header = document.querySelector(".site-header");
  if (header) quandoAberturaAcabar(() => header.classList.add("is-on"));
}

// A página: categoria, título, texto de apoio e botão entram em sequência
// assim que a abertura termina (ou logo ao abrir, quando não tem abertura).
function playHeroIntro() {
  const headline = document.getElementById("hero-headline");
  const lead = document.getElementById("hero-lead");
  const actions = document.getElementById("hero-actions-el");
  const cue = document.getElementById("hero-scrollcue");
  const items = [headline, lead, actions, cue].filter(Boolean);
  if (!items.length) return;

  if (!hasGSAP || prefersReducedMotion) {
    items.forEach((el) => { el.style.opacity = 1; });
    return;
  }

  const tween = gsap.fromTo(items,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: .7, stagger: .16, ease: "power3.out", paused: true }
  );
  quandoAberturaAcabar(() => tween.play());
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
