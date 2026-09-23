// =========================================================
// Do Medo ao Play — Landing Page (funil de vendas Hotmart)
// =========================================================

// 1) COLE AQUI o link de checkout do Hotmart antes de publicar.
//    Todos os botões marcados com [data-checkout-link] vão usar essa URL.
const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/COLOQUE-SEU-CODIGO-AQUI";

// 2) O GSAP (em js/vendor) toca a abertura. Sem ele (falha de rede, bloqueio
//    de script), a abertura é pulada e a página abre direto: nada fica preso.
const hasGSAP = typeof gsap !== "undefined";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// A abertura monta uma réplica do menu e do herói dentro da câmera. As
// referências reais são guardadas logo no começo, antes da réplica existir.
let REAL_HERO = null;
let REAL_HEADER = null;

document.addEventListener("DOMContentLoaded", () => {
  // Páginas de apoio (política, termos, suporte): sempre abrem no topo. Sem
  // isso, o navegador às vezes restaura a posição de rolagem de uma visita
  // anterior à mesma URL (voltar, recarregar, cache de navegação).
  if (document.body.classList.contains("pagina-apoio")) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }
  REAL_HERO = document.querySelector(".hero");
  REAL_HEADER = document.querySelector(".site-header");
  wireCheckoutLinks();
  wireLinksVazios();
  wireAncoras();
  wireAccordions();
  wireModulosTrilha();
  wireScrollReveal();
  wireDepoimentos();
  wireNiveisFaixa();
  wireCountUp();
  wireScrollEffects();
  wireScrollCue();
  wireIntroStage();
  wireManterLugar();
  wireHeaderReveal();
  wireHeaderTema();
  playHeroIntro();
  wireVoltar();
  wireGuardaLugar();
  wireReviewMode();
  wireCorDaTransicao();
});

// A cor de fundo fixa (.page-bg) escurece aos poucos enquanto a pessoa rola
// do fim dos benefícios/e-book pra oferta — não é um degradê parado no CSS
// (isso já existe, ver #beneficios.section-tone::before), é a cor de
// verdade mudando com a rolagem, tipo a página da Apple Podcasts: quanto
// mais rola pra dentro da seção escura, mais escuro o azul claro fica.
function wireCorDaTransicao() {
  const fundo = document.querySelector(".page-bg");
  const beneficios = document.querySelector("#beneficios");
  const oferta = document.querySelector("#oferta");
  if (!fundo || !beneficios || !oferta || prefersReducedMotion) return;

  const AZUL_CLARO = [144, 190, 217]; // --blue-light
  const ESCURO = [11, 23, 40]; // --bg
  let zonaAntes = 0;
  let zonaInicio = 0;
  let zonaFim = 1;
  let ticking = false;

  function medir() {
    // Antes daqui (Escada de Exposição, depoimentos, o começo dos próprios
    // benefícios): fundo escuro, sempre — só #modulos/#beneficios são azuis,
    // e eles têm fundo opaco próprio cobrindo o .page-bg o tempo todo, então
    // nem precisam da cor certa aqui, só as seções ANTERIORES precisam
    // (senão o azul "vazava" pelos vãos delas, que não são opacos).
    // A faixa de verdade (esmaecendo) começa em 78% da altura de
    // benefícios — igual ao degradê pintado no CSS — e termina exatamente
    // no pé dela: o degradê e a cor ao vivo cobrem o mesmíssimo trecho,
    // sem entrar seção da oferta adentro (isso é que dava aquele corte
    // brusco: a cor viva ainda não tinha terminado quando o cartão da
    // oferta, já escuro e opaco, aparecia por cima). Faixa bem mais alta
    // (a maior parte de benefícios) pra a transição ficar mesmo fluida.
    zonaAntes = beneficios.getBoundingClientRect().top + window.scrollY;
    const altura = beneficios.offsetHeight;
    zonaInicio = zonaAntes + altura * 0.55;
    zonaFim = zonaAntes + altura;
  }

  function aplica() {
    const y = window.scrollY + window.innerHeight * 0.5;
    if (y <= zonaAntes) {
      fundo.style.backgroundColor = "";
      ticking = false;
      return;
    }
    const p = Math.max(0, Math.min(1, (y - zonaInicio) / Math.max(1, zonaFim - zonaInicio)));
    const r = Math.round(AZUL_CLARO[0] + (ESCURO[0] - AZUL_CLARO[0]) * p);
    const g = Math.round(AZUL_CLARO[1] + (ESCURO[1] - AZUL_CLARO[1]) * p);
    const b = Math.round(AZUL_CLARO[2] + (ESCURO[2] - AZUL_CLARO[2]) * p);
    fundo.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    ticking = false;
  }

  medir();
  aplica();
  window.addEventListener("resize", () => { medir(); aplica(); });
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(aplica);
  }, { passive: true });
}

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
/* A pista do herói tem exatamente a altura da primeira tela mais a altura
   real da seção de reconhecimento (que muda com o texto, a fonte e a
   largura da tela). Sem isso (um valor fixo de 100vh), numa tela onde essa
   seção rende mais baixa que uma tela inteira, ela soltava antes da foto
   liberar o lugar — e a escada seguinte aparecia por cima da foto, que
   ainda estava presa lá atrás. */
function ajustaRunwayHero() {
  const hero = REAL_HERO;
  const reconhecimento = document.getElementById("reconhecimento");
  if (!hero || !reconhecimento) return;
  // Tela baixa: o herói vira seção normal e ninguém sobe por cima de
  // ninguém (ver CSS, media max-height:480px) — limpa o inline pra não
  // brigar com a regra do media query.
  if (window.matchMedia("(max-height: 480px)").matches) {
    hero.style.minHeight = "";
    reconhecimento.style.marginTop = "";
    return;
  }
  const alturaRecon = reconhecimento.offsetHeight;
  const tela = alturaDaTela();
  hero.style.minHeight = (tela + alturaRecon) + "px";
  reconhecimento.style.marginTop = "-" + alturaRecon + "px";
}
function wireScrollEffects() {
  const root = document.documentElement;
  const header = document.querySelector(".site-header");
  const hero = REAL_HERO;
  const stage = document.querySelector(".cinema-stage");
  // A foto parada (ver .hero-foto-deitada) dá um zoom lento na rolagem:
  // começa um pouco menor (os ícones da foto ficam mais longe do botão) e
  // cresce até cobrir a tela.
  const zoomFoto = hero ? hero.querySelector(".hero3d-zoom") : null;
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
    // Refaz a altura da pista do herói antes de medi-la (ver função acima).
    ajustaRunwayHero();
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

    // A foto fica parada (presa numa tela, ver .cinema-stage no CSS); só o
    // zoom dela acompanha a rolagem pelas duas telas da pista.
    const p = clamp((y - heroTop) / heroAltura);
    if (zoomFoto) zoomFoto.style.setProperty("--portal-scale", (0.92 + 0.18 * p).toFixed(3));
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

// Links pra dentro da página (a logo, por exemplo) rolam suave pelo JS. O
// "Pular para o conteúdo" continua pulando direto.
function wireAncoras() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]:not(.skip-link)');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    const alvo = id && document.getElementById(id);
    if (!alvo) return;
    e.preventDefault();
    const behavior = prefersReducedMotion ? "auto" : "smooth";
    // A logo (menu e rodapé) volta pro começo da página, sem deixar "#topo"
    // no endereço.
    if (id === "topo") {
      window.scrollTo({ top: 0, behavior });
      if (location.hash) history.replaceState(null, "", location.pathname + location.search);
      return;
    }
    alvo.scrollIntoView({ behavior, block: "start" });
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

// Os pontinhos de cronologia em cima do acordeão dos módulos: o ponto do
// módulo aberto fica laranja, acompanhando qual está aberto (a ordem dos
// pontos no SVG é a mesma dos módulos no acordeão, um por um).
function wireModulosTrilha() {
  const accordion = document.getElementById("accordion-modulos");
  const trilha = document.querySelector(".modulos-trail");
  if (!accordion || !trilha) return;
  const items = [...accordion.querySelectorAll(".accordion-item")];
  const pontos = [...trilha.querySelectorAll(".modulos-trail-dot")];
  function atualiza() {
    items.forEach((item, i) => {
      if (pontos[i]) pontos[i].classList.toggle("is-ativo", item.classList.contains("open"));
    });
  }
  items.forEach((item) => {
    const trigger = item.querySelector(".accordion-trigger");
    if (trigger) trigger.addEventListener("click", atualiza);
  });
  atualiza();
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
      // Pro leitor de tela, só o vídeo do meio está na frente.
      if (Math.abs(p) < .5) card.removeAttribute("aria-hidden");
      else card.setAttribute("aria-hidden", "true");
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
      arrasto = Math.max(-1.2, Math.min(1.2, -dx / passo()));
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
  // As setas dos dois lados: quem não descobre o arrasto troca de vídeo no clique.
  palco.querySelectorAll(".depo-seta").forEach((seta) => {
    seta.addEventListener("click", (e) => {
      e.preventDefault();
      vai(ativo + (seta.classList.contains("depo-seta--antes") ? -1 : 1));
    });
  });
  window.addEventListener("resize", () => desenha(false), { passive: true });
  desenha(false);
}

// A faixa dos níveis anda sozinha, devagar, e obedece à mão: arrastar com o
// dedo (rolagem nativa) ou com o mouse leva a faixa pro lado, e ela volta a
// andar sozinha pouco depois que a pessoa solta. Os 7 níveis aparecem
// duplicados no HTML: ao passar da metade, a rolagem volta pro começo, então a
// faixa nunca acaba e ninguém vê a emenda.
function wireNiveisFaixa() {
  const faixa = document.querySelector(".niveis-marquee");
  const trilho = faixa && faixa.querySelector(".etapas-track");
  if (!faixa || !trilho) return;
  const metade = () => trilho.scrollWidth / 2 || 1;
  const VELOCIDADE = 26; // pixels por segundo
  let pausadoAte = 0;    // enquanto a pessoa mexe, o passo automático espera
  let comOMouseEmCima = false;
  let mao = null;        // dedo ou mouse segurando a faixa
  let naTela = true;
  let ultimo = 0;

  // Emenda invisível: passando da metade, volta pro começo (e vice-versa).
  const emenda = () => {
    const m = metade();
    if (faixa.scrollLeft >= m) faixa.scrollLeft -= m;
    else if (faixa.scrollLeft < 0) faixa.scrollLeft += m;
  };
  const espera = (ms) => { pausadoAte = performance.now() + ms; };

  // A posição é contada aqui em número quebrado e só depois vira rolagem: a
  // 26px por segundo, cada quadro anda menos de meio pixel, e somar isso
  // direto na rolagem não sai do lugar (o navegador arredonda e perde o resto).
  let pos = faixa.scrollLeft;
  function passo(t) {
    const dt = ultimo ? Math.min(.05, (t - ultimo) / 1000) : 0;
    ultimo = t;
    if (naTela && !mao && !comOMouseEmCima && t > pausadoAte && !prefersReducedMotion) {
      const m = metade();
      pos += VELOCIDADE * dt;
      if (pos >= m) pos -= m;
      faixa.scrollLeft = pos;
    } else {
      // Enquanto a pessoa manda (arrasto, roda, teclado), a conta acompanha ela.
      pos = faixa.scrollLeft;
    }
    requestAnimationFrame(passo);
  }
  requestAnimationFrame(passo);

  // O navegador tenta "arrastar a imagem" quando a mão começa em cima de uma foto.
  faixa.addEventListener("dragstart", (e) => e.preventDefault());
  faixa.addEventListener("mouseenter", () => { comOMouseEmCima = true; });
  faixa.addEventListener("mouseleave", () => { comOMouseEmCima = false; });
  faixa.addEventListener("wheel", () => espera(1500), { passive: true });
  faixa.addEventListener("keydown", () => espera(2500));
  // A rolagem nativa (dedo, trackpad, teclado) também precisa da emenda.
  faixa.addEventListener("scroll", emenda, { passive: true });

  faixa.addEventListener("pointerdown", (e) => {
    // No dedo, quem rola é o próprio navegador: aqui só seguramos o passo automático.
    mao = { id: e.pointerId, mouse: e.pointerType === "mouse", x: e.clientX, inicio: faixa.scrollLeft };
    if (mao.mouse) {
      faixa.classList.add("is-arrastando");
      try { faixa.setPointerCapture(e.pointerId); } catch { /* segue sem captura */ }
    }
  });
  faixa.addEventListener("pointermove", (e) => {
    if (!mao || !mao.mouse || e.pointerId !== mao.id) return;
    e.preventDefault();
    faixa.scrollLeft = mao.inicio - (e.clientX - mao.x);
    emenda();
  });
  const solta = (e) => {
    if (!mao || (e && e.pointerId !== mao.id)) return;
    mao = null;
    faixa.classList.remove("is-arrastando");
    espera(1200);
  };
  faixa.addEventListener("pointerup", solta);
  faixa.addEventListener("pointercancel", solta);
  faixa.addEventListener("pointerleave", solta);

  // Parada quando a faixa não está na tela: nada de rodar à toa.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((e) => { naTela = e[0].isIntersecting; }, { threshold: 0 }).observe(faixa);
  }
}

function wireScrollReveal() {
  // Listas com cascata própria revelam item a item; o contêiner delas fica de fora.
  // Animar contêiner e filhos juntos fazia os cards "pularem" quando o de fora
  // terminava de aparecer (a tela piscava no antes/depois).
  // .etapa fica de fora: o efeito de grudar e soltar (position: sticky) já é
  // a entrada dela. Empilhar um fade por cima, com scroll rápido, deixava a
  // foto parada num meio-termo quase transparente até a rolagem parar.
  const targets = [...document.querySelectorAll(
    ".section .container > *, .accordion-item"
  )].filter((el) => !el.matches(
    ".accordion, .etapas"
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
    // Margem positiva embaixo: o elemento "conta" como visível bem antes de
    // entrar de fato na tela (ainda na metade da seção anterior), não só
    // quando a rolagem já chega nele — pra revelação (e a subida do card da
    // Vitória, que usa esse mesmo mecanismo) começar cedo, não em cima da hora.
    { threshold: 0.12, rootMargin: "0px 0px 45% 0px" }
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
  const burstAparelho = document.getElementById("burst-aparelho");
  const burstContorno = document.getElementById("burst-contorno");
  const burstLinha = document.getElementById("burst-linha");
  const burstCamera = document.getElementById("burst-camera");
  const burstIlha = document.getElementById("burst-ilha");
  const burstTempo = document.getElementById("burst-tempo");
  const burstGravar = document.querySelector("#burst-gravar i");

  let tl = null;
  let relogio = 0;
  // Enquanto a abertura toca, rolar/tocar/teclar não mexe na página: adianta a abertura.
  // O Tab fica de fora: ele também adianta, mas já leva o foco pro primeiro link.
  const TECLAS_DE_ROLAR = [" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"];
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
    // O navegador volta a guardar o lugar da rolagem, que a abertura desliga
    // pra sempre começar do topo.
    if ("scrollRestoration" in history) history.scrollRestoration = "auto";
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

  // Computador (tela larga e deitada, mesmo corte do vídeo do túnel logo
  // abaixo): o contorno do iPhone é desenhado deitado, não em pé — sem
  // isso, o corpo vinha sempre na vertical (CSS) mas o traço de dentro
  // continuava no formato em pé, esticado sem uniformidade (cantos viravam
  // elipse em vez de círculo).
  const telaDeitada = window.matchMedia("(min-width: 700px) and (orientation: landscape)").matches;
  if (telaDeitada && burstContorno && burstLinha) {
    burstContorno.setAttribute("viewBox", "0 0 206 100");
    burstLinha.setAttribute("width", "204");
    burstLinha.setAttribute("height", "98");
  }
  // Começa só a linha do contorno, girada em 3D; o corpo do iPhone aparece depois.
  if (burstLinha) {
    const comprimento = burstLinha.getTotalLength();
    gsap.set(burstLinha, { strokeDasharray: comprimento, strokeDashoffset: comprimento });
  }
  gsap.set(burstStage, { transformPerspective: 1100, transformOrigin: "50% 50%", rotationY: -22, rotationX: 9 });
  gsap.set(burstAparelho, { opacity: 0 });
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

  // ---- A ANIMAÇÃO ----
  // Antes tudo aparecia quase junto (túnel, frase, celular montando e o
  // resto da pergunta praticamente ao mesmo tempo) — dava pra piscar e
  // perder pedaço. Agora é em fases separadas, uma de cada vez, com um
  // instante de pausa entre elas pra cada coisa "entrar" antes da próxima:
  // 1) só o túnel (a pessoa vê o túnel antes de qualquer texto/celular);
  // 2) a frase "E se, em vez de travar…" sozinha;
  // 3) o celular se monta (contorno, corpo, tela, câmera);
  // 4) o resto da pergunta ("você desse o play?"), com a frase da fase 2
  //    ainda na tela, fechando a pergunta inteira;
  // 5) segura tudo montado um tempo pra dar pra ler, só então atravessa.
  const CRESCE = 1.1; // a travessia: o iPhone crescendo junto com o túnel
  tl = gsap.timeline({ paused: true });
  tl
    // FASE 1 — só o túnel: o véu abre e as faixas de luz aparecem, sem
    // nenhum texto ou celular ainda — a pessoa vê o túnel primeiro.
    .to(veil, { opacity: 0, duration: .5, ease: "power1.out" }, 0)
    .to(faixas, { opacity: .7, duration: .4 }, .2)
    // FASE 2 — a frase de abertura, sozinha.
    .to(burstPre, { opacity: 1, y: 0, duration: .4, ease: "power2.out" }, .9)
    // FASE 3 — o celular se monta: contorno desenhando e girando, depois o
    // corpo, a tela e a câmera, cada um entrando atrás do outro.
    .addLabel("celular", 1.7)
    .to(burstLinha, { strokeDashoffset: 0, duration: .7, ease: "power2.inOut" }, "celular")
    .to(burstStage, { rotationY: -5, rotationX: 2, duration: 1, ease: "power2.out" }, "celular")
    .to(burstAparelho, { opacity: 1, duration: .3, ease: "power1.out" }, "celular+=.6")
    .to(burstScreen, { opacity: 1, duration: .35, ease: "power2.out" }, "celular+=.85")
    .to(burstCamera, { opacity: 1, duration: .3 }, "celular+=1.15")
    .to(faixas, { opacity: 1, duration: .5, ease: "power2.inOut" }, "celular+=1.2")
    // FASE 4 — o resto da pergunta, já com o celular montado na tela.
    .to(burstTitleSpans, { opacity: 1, y: 0, duration: .35, stagger: .14, ease: "back.out(1.7)" }, "celular+=1.7")
    .call(aperta, null, "celular+=2.05")
    // FASE 5 — segura tudo montado ("E se, em vez de travar... você
    // desse o play?" inteira, celular gravando) um tempo de verdade antes
    // de atravessar — sem isso, pisca e passa antes de dar pra ler.
    .addLabel("atravessa", "celular+=3.6")
    .to([burstPre, ...burstTitleSpans], { opacity: 0, duration: .3 }, "atravessa")
    .to(faixas, { opacity: 0, duration: .3 }, "atravessa")
    .to(burstStage, { rotationX: 0, rotationY: 0, duration: .4, ease: "power2.inOut" }, "atravessa")
    .to([burstCamera, burstIlha, burstContorno], { opacity: 0, duration: .3 }, "atravessa+=.1")
    // ATRAVESSA: o iPhone cresce junto com o túnel, até a porta de luz, e
    // explode no clarão. A réplica lá dentro chega em escala 1: a tela VIRA a
    // página, sem corte.
    .addLabel("cresce", "atravessa+=.3")
    .to(burstStage, { scale: () => 1 / escalaDaReplica(), duration: CRESCE, ease: "power3.in" }, "cresce")
    .to(burstScreen, { borderRadius: 0, duration: CRESCE, ease: "power3.in" }, "cresce")
    // O clarão acende no fim da travessia (termina junto com o crescimento).
    .to(flash, { opacity: 1, duration: .32, ease: "power2.in" }, "cresce+=" + (CRESCE - .32).toFixed(2))
    .call(libera)
    .to(flash, { opacity: 0, duration: .7, ease: "power2.out" });

  // ---- O TÚNEL ----
  // Vídeo de 7s dos arcos até a porta de luz laranja, tocando sozinho. O
  // ritmo é acertado pra ele chegar na porta quando a tela termina de crescer
  // (a luz do vídeo emenda no clarão). Tela em pé usa o vídeo vertical.
  const VIDEOS = {
    celular: { src: "assets/video/tunel-celular.mp4", poster: "assets/video/tunel-celular-poster.jpg" },
    computador: { src: "assets/video/tunel-desktop.mp4", poster: "assets/video/tunel-desktop-poster.jpg" },
  };
  const modo = window.matchMedia("(max-aspect-ratio: 1/1)").matches ? "celular" : "computador";
  const porta = tl.labels.cresce + CRESCE;
  // Os 5 primeiros segundos do vídeo original (os mesmos arcos azuis passando
  // devagar) foram cortados do próprio arquivo: ele já começa onde a abertura
  // começa, e ninguém baixa o pedaço que não aparecia. Com a abertura de 4,5s,
  // o vídeo inteiro de 12s pedia um ritmo de 4x no fim, que o celular não
  // acompanha enquanto desenha a página (o vídeo engasgava antes da porta).
  let comecou = false;
  let semVideo = false;
  let esperaVideo = 0;

  // O túnel começa devagar e vai acelerando por igual até a porta de luz. O
  // ritmo final é o que faz ele chegar lá quando a tela da câmera termina de
  // crescer (a luz do vídeo emenda no clarão); fica perto de 2,2x, o mesmo pico
  // da abertura longa, que o vídeo sempre acompanhou.
  const RITMO_INICIAL = 1;
  let ritmoFinal = 2;
  let ritmo = null;
  function ajustaRitmo() {
    video.defaultPlaybackRate = RITMO_INICIAL;
    video.playbackRate = RITMO_INICIAL;
    // Subindo por igual, o ritmo médio é a média entre o inicial e o final.
    if (isFinite(video.duration) && video.duration > 0) {
      ritmoFinal = gsap.utils.clamp(1, 4, 2 * (video.duration / porta) - RITMO_INICIAL);
    }
  }
  // Onde o vídeo deve estar em cada instante da animação (a soma do ritmo).
  const tempoDoVideo = (t) => RITMO_INICIAL * t + (ritmoFinal - RITMO_INICIAL) * t * t / (2 * porta);
  function aceleraTunel() {
    const r = { v: RITMO_INICIAL };
    video.playbackRate = RITMO_INICIAL;
    ritmo = gsap.to(r, {
      v: ritmoFinal,
      duration: porta,
      ease: "none",
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
  video.src = VIDEOS[modo].src;
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
// que a página se reorganiza.
function wireManterLugar() {
  let lugar = null;
  let espera = 0;
  // Toda mudança de largura (girar o celular, mudar a janela) reorganiza a
  // página. A barra de endereço do celular (só a altura muda) não conta.
  let largura = window.innerWidth;
  let remede = 0;
  // Enquanto a página se reorganiza depois do giro, o lugar guardado não é
  // regravado: a rolagem desse meio tempo é do ajuste, não da pessoa.
  let congelado = false;
  let solta = 0;
  // As medidas novas entram no quadro seguinte a cada resize (ver
  // wireScrollEffects); 250ms depois do último, elas já estão no lugar e a
  // pessoa volta pro mesmo ponto da mesma seção.
  const volta = () => {
    clearTimeout(solta);
    solta = setTimeout(() => { congelado = false; }, 800);
    if (!lugar || !lugar.secao.isConnected) return;
    const r = lugar.secao.getBoundingClientRect();
    const alvo = Math.round(window.scrollY + r.top + lugar.fracao * r.height - window.innerHeight / 2);
    if (Math.abs(alvo - window.scrollY) > 2) window.scrollTo({ top: alvo, left: 0, behavior: "instant" });
  };
  window.addEventListener("resize", () => {
    // Ao girar, a largura e a altura podem mudar em eventos separados: depois
    // de uma mudança de largura, qualquer resize seguinte adia a volta até a
    // página parar de mudar.
    if (window.innerWidth !== largura) {
      largura = window.innerWidth;
      congelado = true;
      // Um giro logo depois do outro: o destrave do giro anterior não pode
      // soltar o lugar guardado no meio deste.
      clearTimeout(solta);
    } else if (!congelado) {
      return;
    }
    clearTimeout(remede);
    remede = setTimeout(() => requestAnimationFrame(volta), 250);
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
}

// O menu não existe durante a abertura: ele desce junto com a página de vendas.
// Depois do topo, ele some quando a pessoa desce (o texto não passa mais por
// baixo da logo e do botão) e volta assim que ela sobe um pouco.
function wireHeaderReveal() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  quandoAberturaAcabar(() => header.classList.add("is-on"));
  let ultimoY = window.scrollY;
  let pedido = false;
  const confere = () => {
    pedido = false;
    const y = window.scrollY;
    if (y <= (header.offsetHeight || 70)) {
      header.classList.remove("is-recolhido");
      ultimoY = y;
      return;
    }
    const d = y - ultimoY;
    if (Math.abs(d) < 8) return;
    // Com o foco no menu (navegando pelo teclado), ele não some.
    if (d > 0 && !header.contains(document.activeElement)) header.classList.add("is-recolhido");
    else if (d < 0) header.classList.remove("is-recolhido");
    ultimoY = y;
  };
  window.addEventListener("scroll", () => {
    if (!pedido) { pedido = true; requestAnimationFrame(confere); }
  }, { passive: true });
  header.addEventListener("focusin", () => header.classList.remove("is-recolhido"));
}

// A logo (texto branco) some sobre as seções claras (módulos, benefícios,
// aplicação) — mesma ideia do "LocalnavThemeChanger" da Apple, o menu fixo
// mudando de tema conforme a seção que está passando por baixo dele. Aqui,
// em vez de trocar a cor da logo, o menu ganha um fundo escuro translúcido
// só enquanto está sobre uma dessas seções (ver .site-header.on-light).
function wireHeaderTema() {
  const header = document.querySelector(".site-header");
  const alvos = [...document.querySelectorAll("#modulos, #beneficios, #aplicacao")];
  if (!header || !alvos.length) return;
  let ticking = false;
  function aplica() {
    const y = (header.offsetHeight || 70) / 2;
    const sobreClaro = alvos.some((el) => {
      const r = el.getBoundingClientRect();
      return r.top <= y && r.bottom >= y;
    });
    header.classList.toggle("on-light", sobreClaro);
    ticking = false;
  }
  aplica();
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(aplica);
  }, { passive: true });
  window.addEventListener("resize", aplica, { passive: true });
}

// Onde a pessoa parou de ler, guardado na aba. O <head> usa isto pra decidir a
// abertura: quem recarrega no meio da leitura volta direto pro mesmo lugar, sem
// assistir tudo de novo; quem chega ou recarrega no topo vê a abertura.
function wireGuardaLugar() {
  let espera = 0;
  const guarda = () => {
    try { sessionStorage.setItem("dmap-lugar", String(Math.round(window.scrollY))); } catch { /* sem armazenamento: a abertura toca de novo, só isso */ }
  };
  window.addEventListener("scroll", () => { clearTimeout(espera); espera = setTimeout(guarda, 250); }, { passive: true });
  guarda();
}

// Páginas de apoio: "Voltar para a página inicial" volta pelo histórico quando a
// pessoa veio da landing, então ela cai exatamente onde estava (no rodapé, na
// oferta...). Quem abriu a página de apoio direto segue pelo link normal.
function wireVoltar() {
  const link = document.querySelector(".apoio-voltar");
  if (!link) return;
  link.addEventListener("click", (e) => {
    try {
      const veio = document.referrer ? new URL(document.referrer) : null;
      const daLanding = veio && veio.origin === location.origin && /\/(index\.html)?$/.test(veio.pathname);
      if (daLanding && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    } catch { /* segue pelo link */ }
  });
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
