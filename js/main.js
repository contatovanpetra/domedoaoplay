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

document.addEventListener("DOMContentLoaded", () => {
  // Páginas de apoio (política, termos, suporte): sempre abrem no topo. Sem
  // isso, o navegador às vezes restaura a posição de rolagem de uma visita
  // anterior à mesma URL (voltar, recarregar, cache de navegação).
  if (document.body.classList.contains("pagina-apoio")) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }
  REAL_HERO = document.querySelector(".hero");
  wireCheckoutLinks();
  wireLinksVazios();
  wireAncoras();
  wireAccordions();
  wireModulosTrilha();
  wireScrollReveal();
  wireDepoimentos();
  wireEscadaShowcase();
  wireViviCard();
  wireCountUp();
  wireScrollEffects();
  wireReadProgressBar();
  wireScrollCue();
  wireIntroStage();
  wireManterLugar();
  wireHeaderReveal();
  wireHeaderTema();
  wireAplicacaoSome();
  playHeroIntro();
  wireVoltar();
  wireGuardaLugar();
  wireReviewMode();
  wireCorDoFundo();
  wireBeneficiosPilha();
  wirePausaForaDaTela();
});

// As animações que repetem sem parar (bônus flutuando, o pulso do som dos
// depoimentos, o giro e o brilho da logo final, a setinha do topo) ficam
// pausadas longe da tela. Paradas elas não custam nada; mas qualquer quadro
// da página (rolar, o anel da escada) recalculava as cinco, mesmo fora da
// tela (medido: 5 de cada 8 recálculos de estilo por quadro eram delas).
// Voltam a tocar 200px antes de aparecer, então ninguém vê a pausa. A luz
// da logo final (máscara com a imagem de 92 KB) só entra quando a seção
// chega perto: antes ela era baixada junto com a primeira tela.
function wirePausaForaDaTela() {
  if (!("IntersectionObserver" in window)) return;
  const alvos = document.querySelectorAll(".bonus-imagem, .depo-som, .final-logo, .scroll-cue");
  if (!alvos.length) return;
  document.documentElement.classList.add("pausa-fora");
  const vista = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => e.target.classList.toggle("em-vista", e.isIntersecting));
  }, { rootMargin: "200px 0px" });
  alvos.forEach((el) => vista.observe(el));
  const logo = document.querySelector(".final-logo");
  if (logo) {
    const perto = new IntersectionObserver((entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return;
      logo.classList.add("perto");
      perto.disconnect();
    }, { rootMargin: "1500px 0px" });
    perto.observe(logo);
  }
}

// Onde começa a passagem do azul claro dos benefícios pro escuro da oferta.
// Troca de cor do fundo como a do Spotify (medida em spotify.com/br-pt/premium):
// a seção que manda é a última cujo topo já passou de 40% da altura da tela;
// se ela for #modulos ou #beneficios, o fundo da página inteira vira azul
// claro (classe "fundo-claro" no <html>, a cor muda por transição em CSS);
// se não, volta ao azul-noite. A cor dos textos dessas seções muda junto.
function wireCorDoFundo() {
  const claras = ["modulos", "beneficios"];
  const secoes = [...document.querySelectorAll("main > section, main > div > section")].filter((s) => s.id || s.classList.contains("section"));
  if (!secoes.length) return;
  const root = document.documentElement;
  let pedido = false;
  const confere = () => {
    pedido = false;
    const linha = window.innerHeight * 0.4;
    let atual = null;
    for (const s of secoes) {
      if (s.getBoundingClientRect().top <= linha) atual = s; else break;
    }
    root.classList.toggle("fundo-claro", !!atual && claras.includes(atual.id));
  };
  confere();
  window.addEventListener("scroll", () => {
    if (!pedido) { pedido = true; requestAnimationFrame(confere); }
  }, { passive: true });
  window.addEventListener("resize", confere, { passive: true });
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
// A tela "grande" (100lvh): a altura com as barras do navegador recolhidas.
// No iPhone (Safari), a barra de baixo flutua por cima da página e a tela
// "pequena" (100svh) para acima dela — o que fica embaixo da barra aparece
// através dela. Quem pinta a tela inteira (a foto do herói) usa esta altura,
// senão sobrava uma faixa azul do fundo embaixo da foto.
let sondaTelaGrande = null;
function alturaDaTelaGrande() {
  if (!sondaTelaGrande) {
    sondaTelaGrande = document.createElement("div");
    sondaTelaGrande.setAttribute("aria-hidden", "true");
    sondaTelaGrande.style.cssText = "position:absolute;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none";
    document.body.appendChild(sondaTelaGrande);
  }
  return sondaTelaGrande.offsetHeight || window.innerHeight;
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
  // A foto presa tem a altura da tela grande (ver .cinema-stage no CSS).
  const tela = alturaDaTelaGrande();
  hero.style.minHeight = (tela + alturaRecon) + "px";
  reconhecimento.style.marginTop = "-" + alturaRecon + "px";
}
function wireScrollEffects() {
  const root = document.documentElement;
  const header = document.querySelector(".site-header");
  const hero = REAL_HERO;
  const stage = document.querySelector(".cinema-stage");
  // A foto parada (ver .hero-foto-deitada) dá um zoom lento na rolagem:
  // já começa cobrindo a tela inteira (sem borda nenhuma aparecendo) e cresce
  // mais um pouco conforme rola — começar abaixo de 100% deixava uma faixa
  // do fundo escuro visível nas bordas em telas largas.
  const zoomFoto = hero ? hero.querySelector(".hero3d-zoom") : null;
  // Camada com o mesmo fundo da página por cima da foto: vai de 0 a 1 ao
  // longo da segunda tela da pista, e a foto se dissolve no fundo (como a
  // abertura do iPad Pro na Apple) em vez de terminar numa borda reta.
  const fimFoto = hero ? hero.querySelector(".hero-fim") : null;
  const bar = document.querySelector(".read-progress");
  // A classe é ligada no <head> só quando o movimento é permitido.
  const cinema = Boolean(hero && stage && root.classList.contains("cinema-on"));

  let heroTop = 0;
  let heroAltura = 0;
  let pistaFoto = 0;
  let fotoSolta = false;
  const telaBaixa = window.matchMedia("(max-height: 480px)");
  let maxScroll = 0;
  let ticking = false;

  function measure() {
    sincronizaHeaderH();
    // Refaz a altura da pista do herói antes de medi-la (ver função acima).
    ajustaRunwayHero();
    if (hero) {
      heroTop = hero.getBoundingClientRect().top + window.scrollY;
      heroAltura = hero.offsetHeight;
      pistaFoto = Math.max(1, heroAltura - alturaDaTelaGrande());
    }
    maxScroll = root.scrollHeight - window.innerHeight;
    update();
  }

  // Altura real do header, sempre em dia: antes só era recalculada em
  // resize/orientação/fonte — rolando a página, se a
  // altura do header mudasse por qualquer razão (zoom do navegador, troca
  // de fonte tardia), --header-h ficava desatualizado até o próximo
  // resize, e elementos que dependem dele (como o nome no alto da foto da
  // Vitória Caroline, ver .vivi-assinatura) ficavam mal posicionados —
  // às vezes escondidos atrás do próprio header.
  let ultimaHeaderH = -1;
  function sincronizaHeaderH() {
    if (!header) return;
    const h = header.getBoundingClientRect().height;
    if (Math.abs(h - ultimaHeaderH) > .5) {
      root.style.setProperty("--header-h", h + "px");
      ultimaHeaderH = h;
    }
  }

  function update() {
    ticking = false;
    const y = window.scrollY;
    sincronizaHeaderH();

    // A trilha de leitura fica parada enquanto a abertura toca.
    const introActive = root.classList.contains("abertura-on");
    if (bar) {
      bar.style.setProperty("--read", introActive || maxScroll <= 0 ? "0" : clamp(y / maxScroll).toFixed(4));
      // Página que cabe inteira na tela (o Suporte numa tela 4K): não há o
      // que rolar, então a barrinha some em vez de ficar parada no topo.
      bar.hidden = maxScroll <= 1;
    }
    // Fora do "cinema" também (movimento reduzido): é só opacidade, sem
    // movimento nenhum, e sem ela a foto terminaria numa borda reta.
    // Tela baixa (celular deitado): o herói vira seção normal, sem pista
    // pra foto se dissolver (ver CSS, max-height: 480px) — nada a fazer.
    if (fimFoto && heroAltura && telaBaixa.matches) {
      if (fotoSolta) { fotoSolta = false; stage.style.visibility = ""; }
    } else if (fimFoto && heroAltura) {
      // Começa a dissolver quando o botão do herói já está saindo pelo
      // alto (35% da pista) e termina quando a frase entra por baixo.
      const f = clamp(((y - heroTop) / pistaFoto - .35) / .6);
      fimFoto.style.opacity = (f * f * (3 - 2 * f)).toFixed(3);
      // Quando a foto solta e começa a subir, ela já é só fundo: esconde o
      // palco pra aparecer a .page-bg fixa por trás. Subindo, o degradê da
      // camada sairia do lugar em relação ao fundo fixo e marcaria uma faixa.
      const solta = y >= heroTop + pistaFoto - 1;
      if (solta !== fotoSolta) {
        fotoSolta = solta;
        stage.style.visibility = solta ? "hidden" : "";
      }
    }
    if (!cinema || !heroAltura) return;

    // Camadas de GPU da animação só existem enquanto o herói está na tela. Mantidas
    // o tempo todo, deixavam o menu sumir e mostravam um pedaço da foto repetido.
    const onScreen = y < heroTop + heroAltura && y + window.innerHeight > heroTop;
    stage.classList.toggle("is-live", onScreen);
    if (!onScreen) return;

    // A foto fica parada (presa numa tela, ver .cinema-stage no CSS); só o
    // zoom dela acompanha a rolagem pelas duas telas da pista.
    const p = clamp((y - heroTop) / heroAltura);
    if (zoomFoto) zoomFoto.style.setProperty("--portal-scale", (1 + 0.12 * p).toFixed(3));
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

// A trilha de leitura (.read-progress) não é só um indicador — ela mesma é
// a barra de rolagem da página (a nativa fica escondida, ver CSS). Clicar
// ou arrastar nela rola a página proporcionalmente à posição do mouse.
function wireReadProgressBar() {
  const bar = document.querySelector(".read-progress");
  if (!bar) return;

  function rolaPara(clientY) {
    const r = bar.getBoundingClientRect();
    // No computador a barra é uma barrinha curta (--thumb, ver CSS): o
    // meio dela acompanha o mouse. No celular é a faixa inteira (0).
    const thumb = parseFloat(getComputedStyle(bar).getPropertyValue("--thumb")) || 0;
    const margem = thumb ? 8 : 0;
    const fracao = clamp((clientY - r.top - margem - thumb / 2) / Math.max(1, r.height - thumb - 2 * margem));
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, fracao * maxScroll);
  }

  let arrastando = false;
  bar.addEventListener("pointerdown", (e) => {
    // Só o botão principal do mouse (ou toque/caneta) — sem isso, um clique
    // com o botão direito também arrastava a página.
    if (e.button !== undefined && e.button !== 0) return;
    // Sem isso o navegador começava a selecionar o texto da página junto
    // com o arrasto (cursor de texto e rolagem pesada).
    e.preventDefault();
    arrastando = true;
    document.documentElement.classList.add("arrastando-barra");
    bar.setPointerCapture(e.pointerId);
    rolaPara(e.clientY);
  });
  bar.addEventListener("pointermove", (e) => {
    if (!arrastando) return;
    rolaPara(e.clientY);
  });
  const solta = (e) => {
    arrastando = false;
    document.documentElement.classList.remove("arrastando-barra");
    if (bar.hasPointerCapture(e.pointerId)) bar.releasePointerCapture(e.pointerId);
  };
  bar.addEventListener("pointerup", solta);
  bar.addEventListener("pointercancel", solta);
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

// Depoimentos em galeria (formato das galerias da Apple): vídeos grandes lado
// a lado, deslizando com o dedo; um toque abre o vídeo em destaque.
function wireDepoimentos() {
  const palco = document.querySelector(".depo-palco");
  if (!palco) return;
  const cards = [...palco.querySelectorAll(".depo-card")];
  const pontos = [...document.querySelectorAll(".depo-ponto")];
  if (!cards.length) return;

  // Galeria de rolagem nativa (ver .depo-palco no CSS): o navegador cuida do
  // arrasto e de parar em cada vídeo; aqui só os pontinhos acompanham e o
  // toque no vídeo abre ele grande.
  function indiceAtual() {
    const base = palco.getBoundingClientRect().left;
    let melhor = 0;
    let menor = Infinity;
    cards.forEach((card, i) => {
      const d = Math.abs(card.getBoundingClientRect().left - base - 24);
      if (d < menor) { menor = d; melhor = i; }
    });
    return melhor;
  }
  let pedido = false;
  palco.addEventListener("scroll", () => {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(() => {
      pedido = false;
      const i = indiceAtual();
      pontos.forEach((p, k) => p.classList.toggle("is-ativo", k === i));
    });
  }, { passive: true });
  pontos.forEach((ponto, i) => {
    ponto.addEventListener("click", () => {
      const alvo = cards[i];
      if (!alvo) return;
      palco.scrollTo({ left: alvo.offsetLeft - cards[0].offsetLeft, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  });
  // Os vídeos rodam sozinhos, sem som, quando a seção aparece (fazem parte
  // do visual, como os da Apple); o ícone de som desligado no canto convida
  // a tocar. Tocar abre o vídeo grande, do começo e com som; ao fechar, o
  // do cartão continua rodando mudo.
  const inline = [];
  cards.forEach((card) => {
    const caixa = card.querySelector(".depo-video");
    const src = card.dataset.video;
    if (!caixa || !src) return;
    const v = document.createElement("video");
    v.className = "depo-video-mudo";
    v.src = src;
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("muted", "");
    v.preload = "metadata";
    v.setAttribute("aria-hidden", "true");
    caixa.insertBefore(v, caixa.firstChild);
    caixa.classList.add("tem-video");
    inline.push(v);
  });
  if (inline.length && !prefersReducedMotion && "IntersectionObserver" in window) {
    const secao = document.getElementById("depoimentos") || palco;
    new IntersectionObserver((entries) => {
      const visivel = entries[entries.length - 1].isIntersecting;
      inline.forEach((v) => { if (visivel) { const t = v.play(); if (t && t.catch) t.catch(() => {}); } else v.pause(); });
    }, { threshold: 0.15 }).observe(secao);
  }
  cards.forEach((card) => {
    const video = card.querySelector(".depo-video");
    if (!video) return;
    const nome = card.querySelector(".depo-nome");
    video.setAttribute("aria-label", "Assistir com som ao depoimento" + (nome ? " de " + nome.textContent.trim() : ""));
    video.addEventListener("click", () => abre(card));
    video.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abre(card); }
    });
  });

  // ---- Vídeo aberto em destaque (maior, com × pra fechar) ----
  // Cada depoimento pode ter o vídeo em data-video no <figure>; enquanto
  // não tem, abre o mesmo espaço reservado do cartão, só que grande.
  let modal = null;
  let focoAntes = null;
  function fecha() {
    if (!modal) return;
    const m = modal;
    modal = null;
    const v = m.querySelector("video");
    if (v) v.pause();
    m.classList.remove("is-aberto");
    document.documentElement.style.overflow = "";
    document.removeEventListener("keydown", teclaModal);
    setTimeout(() => m.remove(), prefersReducedMotion ? 0 : 300);
    if (focoAntes) focoAntes.focus({ preventScroll: true });
  }
  function teclaModal(e) {
    if (e.key === "Escape") { e.preventDefault(); fecha(); }
    // Com o vídeo aberto, o Tab não sai de dentro dele.
    if (e.key === "Tab" && modal) { e.preventDefault(); modal.querySelector(".depo-modal-fechar").focus(); }
  }
  function abre(card) {
    if (!card || modal) return;
    focoAntes = document.activeElement;
    const nome = card.querySelector(".depo-nome");
    modal = document.createElement("div");
    modal.className = "depo-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Depoimento" + (nome ? " de " + nome.textContent.trim() : ""));
    modal.innerHTML =
      '<div class="depo-modal-fundo"></div>' +
      '<div class="depo-modal-caixa">' +
        '<button type="button" class="depo-modal-fechar" aria-label="Fechar vídeo">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' +
        '</button>' +
        '<div class="depo-modal-video"></div>' +
      '</div>';
    const alvo = modal.querySelector(".depo-modal-video");
    const src = card.dataset.video;
    if (src) {
      const v = document.createElement("video");
      v.src = src;
      v.controls = true;
      v.autoplay = true;
      v.muted = false;
      v.playsInline = true;
      alvo.appendChild(v);
    } else {
      card.querySelectorAll(".depo-legenda").forEach((el) => alvo.appendChild(el.cloneNode(true)));
    }
    modal.querySelector(".depo-modal-fundo").addEventListener("click", fecha);
    modal.querySelector(".depo-modal-fechar").addEventListener("click", fecha);
    document.body.appendChild(modal);
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", teclaModal);
    requestAnimationFrame(() => {
      if (modal) modal.classList.add("is-aberto");
    });
    modal.querySelector(".depo-modal-fechar").focus({ preventScroll: true });
  }
}

// A Escada de Exposição: palco de vitrine com o cartão ativo em foco, e
// embaixo um controle único de play/pause + 7 bolinhas numeradas. Cada
// bolinha da vez preenche um anel (tipo stories) enquanto aquele nível fica
// em foco; ao completar o anel, avança sozinha pro próximo. Clicar num
// número, seta ou cartão lateral pula direto pra ele (e reinicia o anel).
function wireEscadaShowcase() {
  const palco = document.querySelector(".escada-palco-wrap");
  const vitrine = palco && palco.querySelector(".escada-vitrine");
  const track = vitrine && vitrine.querySelector(".escada-track");
  const cards = track ? [...track.querySelectorAll(".escada-card")] : [];
  const nums = [...document.querySelectorAll(".escada-num")];
  const playPauseBtn = document.querySelector(".escada-play-pause");
  const prevBtn = palco && palco.querySelector(".escada-nav-prev");
  const nextBtn = palco && palco.querySelector(".escada-nav-next");

  if (!vitrine || !track || !cards.length) return;

  const DURACAO_MS = 3000; // tempo que cada nível fica em foco antes de avançar sozinho
  const proxima = document.getElementById("aplicacao");
  let ultimaEscolha = -Infinity; // quando a pessoa escolheu um nível por último
  let jaConvidou = false;        // a descida pra próxima seção: uma vez por visita à escada
  const CIRCUNFERENCIA = 97.39; // 2 * PI * 15.5 (raio do anel no SVG)
  let activeIndex = 0;
  let tocando = true;
  let inicioProgresso = 0;
  let progressoAoPausar = 0; // 0..1, guardado ao pausar pra retomar do mesmo ponto
  let rafId = 0;
  let naTela = false;         // só conta com algum pedaço da escada na tela

  function anelDe(i) {
    return nums[i] && nums[i].querySelector(".escada-num-ring-fill");
  }
  function preencheAnel(i, fracao) {
    const anel = anelDe(i);
    if (anel) anel.style.strokeDashoffset = (CIRCUNFERENCIA * (1 - fracao)).toFixed(2);
  }
  function pararProgresso() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }
  function passoProgresso(t) {
    const fracao = Math.min(1, (t - inicioProgresso) / DURACAO_MS);
    preencheAnel(activeIndex, fracao);
    if (fracao >= 1) {
      // O nível 7 acabou de tocar inteiro: a página desce sozinha, de leve,
      // até a próxima seção ("Falar bem na câmera...").
      if (activeIndex === cards.length - 1) convidaPraSeguir();
      goToIndex((activeIndex + 1) % cards.length);
      return;
    }
    progressoAoPausar = fracao;
    rafId = requestAnimationFrame(passoProgresso);
  }
  function iniciarProgresso(retomarDoPonto) {
    pararProgresso();
    if (!tocando || !naTela || prefersReducedMotion) return;
    const jaFeito = retomarDoPonto ? progressoAoPausar : 0;
    inicioProgresso = performance.now() - jaFeito * DURACAO_MS;
    rafId = requestAnimationFrame(passoProgresso);
  }

  // Descida até a próxima seção, com a rolagem suave do próprio navegador
  // (a do iPhone, não um passo a passo em JS — esse o Safari às vezes
  // ignorava). Não acontece se a pessoa escolheu um nível nos últimos 5s
  // (ela está explorando), nem com "reduzir movimento" ligado.
  function convidaPraSeguir() {
    if (jaConvidou || !proxima || prefersReducedMotion) return;
    if (performance.now() - ultimaEscolha < 5000) return;
    const inicio = window.scrollY;
    // Onde o texto da próxima seção fica parado no meio da tela.
    const alvo = proxima.getBoundingClientRect().top + inicio + (parseFloat(getComputedStyle(proxima).paddingTop) || 0);
    if (alvo - inicio < 24) return;
    jaConvidou = true;
    window.scrollTo({ top: alvo, behavior: "smooth" });
  }

  // A fila vai de uma borda à outra da tela; os cartões começam (e o último
  // termina) na borda do conteúdo — a mesma do título "A Escada de Exposição".
  const tituloEscada = document.getElementById("metodo-title");
  let margemEscada = 24;
  function medeMargem() {
    const ref = tituloEscada || palco;
    margemEscada = Math.max(16, Math.round(ref.getBoundingClientRect().left - vitrine.getBoundingClientRect().left));
    track.style.paddingLeft = margemEscada + "px";
    track.style.paddingRight = margemEscada + "px";
  }
  medeMargem();

  function goToIndex(idx, suave = true) {
    activeIndex = ((idx % cards.length) + cards.length) % cards.length;
    progressoAoPausar = 0;

    cards.forEach((card, i) => card.classList.toggle("is-active", i === activeIndex));
    nums.forEach((num, i) => {
      const isActive = i === activeIndex;
      num.classList.toggle("is-active", isActive);
      num.setAttribute("aria-selected", isActive ? "true" : "false");
      preencheAnel(i, 0);
    });

    // Como as galerias da Apple (medido no Apple Watch Ultra 4): o cartão
    // para no começo — na mesma borda esquerda do título da seção —, não no
    // meio; e quando chega nos últimos, a fila encosta no fim (o último
    // cartão termina na mesma distância da borda direita) e o anterior fica
    // cortado na borda esquerda da tela.
    const activeCard = cards[activeIndex];
    const ultimo = cards[cards.length - 1];
    const maximo = Math.max(0, ultimo.offsetLeft + ultimo.offsetWidth + margemEscada - vitrine.clientWidth);
    const offset = Math.min(maximo, Math.max(0, activeCard.offsetLeft - margemEscada));
    track.style.transition = suave ? "transform .55s cubic-bezier(.16, 1, .3, 1)" : "none";
    track.style.transform = "translate3d(-" + offset.toFixed(2) + "px, 0, 0)";

    iniciarProgresso(false);
  }

  // Só conta como "ela está explorando" quem de fato escolhe um nível (um
  // número, uma seta, um cartão, o pausar ou o arrasto de lado). Um dedo que
  // só passa por cima dos cartões rolando a página NÃO conta — antes contava,
  // e era por isso que a página nunca descia no nível 7 no celular.
  const marcaEscolha = () => { ultimaEscolha = performance.now(); };

  nums.forEach((num, i) => {
    num.addEventListener("click", () => { marcaEscolha(); goToIndex(i); });
    num.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToIndex(i + 1);
        nums[(i + 1) % nums.length].focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToIndex(i - 1);
        nums[(i - 1 + nums.length) % nums.length].focus();
      }
    });
  });

  if (prevBtn) prevBtn.addEventListener("click", () => { marcaEscolha(); goToIndex(activeIndex - 1); });
  if (nextBtn) nextBtn.addEventListener("click", () => { marcaEscolha(); goToIndex(activeIndex + 1); });

  // Clicar num cartão lateral também traz ele pro foco.
  cards.forEach((card, i) => {
    card.addEventListener("click", () => {
      if (i !== activeIndex) { marcaEscolha(); goToIndex(i); }
    });
  });

  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", () => {
      marcaEscolha();
      tocando = !tocando;
      playPauseBtn.setAttribute("aria-pressed", tocando ? "false" : "true");
      playPauseBtn.setAttribute("aria-label", tocando ? "Pausar avanço automático" : "Retomar avanço automático");
      // toggleAttribute, não .hidden: nos ícones (SVG) a propriedade .hidden
      // não existe e não mexia no atributo — o ícone de play nunca aparecia e
      // o botão ficava vazio depois do primeiro toque.
      playPauseBtn.querySelector(".icon-pause").toggleAttribute("hidden", !tocando);
      playPauseBtn.querySelector(".icon-play").toggleAttribute("hidden", tocando);
      if (tocando) iniciarProgresso(true);
      else pararProgresso();
    });
  }

  // Arrastar no celular (sem travar a rolagem vertical da página).
  let touchStartX = 0;
  let touchStartY = 0;
  vitrine.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });
  vitrine.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
      marcaEscolha();
      if (dx < 0) goToIndex(activeIndex + 1);
      else goToIndex(activeIndex - 1);
    }
  }, { passive: true });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { medeMargem(); goToIndex(activeIndex, false); }, 100);
  }, { passive: true });

  // A rodinha anda sempre que qualquer pedaço da escada estiver na tela —
  // rolando a página ela NÃO para nem volta pro começo (antes pausava com
  // metade da escada fora da tela e voltava pro nível 1 quando ela saía,
  // e rolando parecia que "segurava" ou "rebobinava"). Só pausa com a escada
  // inteira fora da tela, e na volta continua de onde estava.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      if (e.isIntersecting) {
        naTela = true;
        if (tocando) iniciarProgresso(true);
      } else {
        naTela = false;
        pararProgresso();
        jaConvidou = false;
      }
    }, { threshold: 0 }).observe(palco);
  } else {
    naTela = true;
  }

  setTimeout(() => { medeMargem(); goToIndex(0, false); }, 50);
}

// O texto da Vitória já está dentro da foto (entre o nome e os números):
// quando a foto entra na tela, ele aparece de leve — esmaece e sobe uns
// poucos pixels, como a Apple faz com texto sobre foto — e termina de
// aparecer no instante em que a foto para na tela. Nada acompanha a
// rolagem depois disso.
function wireViviCard() {
  const pin = document.querySelector(".vivi-pin");
  const card = document.querySelector(".vivi-card");
  if (!pin || !card || prefersReducedMotion) return;

  // Como a Apple conta uma cena: primeiro a foto chega sozinha (só o nome no
  // alto e os números no pé); com a foto já parada na tela, mais um pouco de
  // rolagem faz o texto aparecer de leve, no lugar; e só depois a página
  // segue. Antes o texto já vinha pronto junto com a foto.
  function aplica() {
    const tela = alturaDaTela();
    const andou = -pin.getBoundingClientRect().top; // quanto já rolou com a foto parada
    const p = clamp((andou - tela * .06) / (tela * .3));
    card.style.opacity = p.toFixed(3);
  }

  let ticking = false;
  const agenda = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { aplica(); ticking = false; });
  };
  window.addEventListener("scroll", agenda, { passive: true });
  window.addEventListener("resize", agenda, { passive: true });
  aplica();
}

// Os 4 cartões de "As aulas são só uma parte do que você leva" em pilha,
// como no Spotify Premium: cada cartão fica preso no meio da tela (sticky,
// no CSS) e, enquanto o próximo sobe por cima dele, encolhe de 100% até 92%
// — o mesmo que o Spotify faz (medido: 1 → 0,92 no trecho de um cartão +
// o vão). Só a escala é calculada aqui; a subida é a rolagem normal.
function wireBeneficiosPilha() {
  const cards = [...document.querySelectorAll(".beneficios .beneficio")];
  if (cards.length < 2 || prefersReducedMotion) return;
  const escalas = cards.map(() => 1);
  let ticking = false;
  function aplica() {
    ticking = false;
    const gap = parseFloat(getComputedStyle(cards[0].parentElement).rowGap) || 24;
    // Do fim pro começo: cada um usa a escala já atualizada do próximo.
    for (let i = cards.length - 2; i >= 0; i--) {
      const card = cards[i];
      const topo = parseFloat(getComputedStyle(card).top) || 0;
      const trecho = card.offsetHeight + gap;
      // O topo do próximo sem a escala dele (quando ele mesmo já está
      // encolhendo, o retângulo medido fica um pouco mais baixo).
      const prox = cards[i + 1];
      const r = prox.getBoundingClientRect();
      const e = escalas[i + 1];
      const falta = r.top - (r.height / e - r.height) / 2 - topo;
      const p = Math.min(1, Math.max(0, 1 - falta / trecho));
      escalas[i] = 1 - .08 * p;
      card.style.transform = p > 0 ? "scale(" + escalas[i].toFixed(4) + ")" : "";
    }
  }
  const agenda = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(aplica);
  };
  window.addEventListener("scroll", agenda, { passive: true });
  window.addEventListener("resize", agenda, { passive: true });
  aplica();
}

function wireScrollReveal() {
  // Listas com cascata própria revelam item a item; o contêiner delas fica de fora.
  // Animar contêiner e filhos juntos fazia os cards "pularem" quando o de fora
  // terminava de aparecer (a tela piscava no antes/depois).
  const targets = [...document.querySelectorAll(
    ".section .container > *, .accordion-item"
  )].filter((el) => !el.matches(
    ".accordion, .beneficios"
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
    // Como nas páginas da Apple (medido no iPhone e no AirPods Pro): o
    // elemento aparece e sobe 30px quando o alto dele passa de 88% da altura
    // da tela — a pessoa vê a entrada acontecer. Antes a margem era de 45%
    // pra baixo e a animação terminava antes de o elemento aparecer.
    { threshold: 0, rootMargin: "0px 0px -12% 0px" }
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
  const zera = (el) => { el.textContent = "0" + (el.dataset.suffix || ""); };
  targets.forEach(zera);
  const rodando = new Map();

  function animate(el) {
    const end = parseInt(el.dataset.count, 10);
    if (Number.isNaN(end)) return;
    const suffix = el.dataset.suffix || "";
    const duration = 1200;
    const start = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * end) + suffix;
      if (progress < 1) rodando.set(el, requestAnimationFrame(step));
      else rodando.delete(el);
    }
    rodando.set(el, requestAnimationFrame(step));
  }

  // Conta de novo toda vez que os números entram na tela (antes contava uma
  // vez só: quem passava e voltava achava que a animação tinha parado). Ao
  // sair da tela por completo, voltam pro zero, prontos pra próxima vez.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        if (entry.intersectionRatio >= .6) {
          if (!rodando.has(el) && el.dataset.contou !== "1") {
            el.dataset.contou = "1";
            animate(el);
          }
        } else if (!entry.isIntersecting) {
          if (rodando.has(el)) { cancelAnimationFrame(rodando.get(el)); rodando.delete(el); }
          el.dataset.contou = "";
          zera(el);
        }
      });
    },
    { threshold: [0, .6] }
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
  // Computador (tela larga e deitada, mesmo corte do vídeo do túnel logo
  // abaixo): o contorno do iPhone é um SVG diferente do de pé, não o mesmo
  // elemento com viewBox/width/height trocados por JS depois de montado
  // (ver index.html) — cada um já nasce com a forma certa.
  const telaDeitada = window.matchMedia("(min-width: 700px) and (orientation: landscape)").matches;
  const burstContorno = document.getElementById(telaDeitada ? "burst-contorno-paisagem" : "burst-contorno-retrato");
  const burstLinha = document.getElementById(telaDeitada ? "burst-linha-paisagem" : "burst-linha-retrato");
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

  // ---- A TELA DA CÂMERA ----
  // A ideia original era mostrar, dentro da câmera, uma cópia viva do menu +
  // herói (clonando os dois elementos, com a foto de fundo em tamanho de
  // tela cheia, girando em 3D ao mesmo tempo que o vídeo do túnel toca) —
  // pesava demais e travava a abertura, no celular e, mesmo com mais força
  // de processamento, também no computador (o clone é do tamanho da janela
  // inteira, então em telas largas fica ainda maior). A tela da câmera fica
  // sem a réplica, só escura mesmo, nos dois casos: nenhuma cópia é
  // montada. A escala abaixo continua servindo pra travessia (burstStage
  // crescendo até a tela da câmera virar a página, sem réplica nenhuma
  // dentro pra mostrar o crescimento).
  const escalaDaReplica = () => Math.min(
    (burstScreen.offsetWidth || 1) / window.innerWidth,
    (burstScreen.offsetHeight || 1) / window.innerHeight
  );

  // Começa só a linha do contorno, girada em 3D; o corpo do iPhone aparece depois.
  if (burstLinha) {
    // O traço usa vector-effect: non-scaling-stroke, então o tracejado é
    // medido em pixels da tela, não nas unidades do desenho: getTotalLength()
    // dava sempre ~577 e a linha parava na metade do celular deitado do
    // computador (contorno de ~1.230px) e deixava uma falha no de pé. O
    // perímetro real vem do tamanho do palco na tela (sem a rotação 3D, que
    // é transform e não mexe em offsetWidth/Height).
    const comprimento = Math.ceil(2 * (burstStage.offsetWidth + burstStage.offsetHeight)) + 4;
    gsap.set(burstLinha, { strokeDasharray: comprimento, strokeDashoffset: comprimento });
  }
  gsap.set(burstStage, { transformPerspective: 1100, transformOrigin: "50% 50%", rotationY: -22, rotationX: 9 });
  // O contorno também começa escondido por opacidade, não só pelo traço
  // (strokeDashoffset): sem isso, um risquinho do traço ficava visível bem
  // no início, antes da hora do celular começar a se montar.
  if (burstContorno) gsap.set(burstContorno, { opacity: 0 });
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
    .to(burstContorno, { opacity: 1, duration: .15 }, "celular")
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
    celular: { src: "assets/video/tunel-celular.mp4", poster: "assets/video/tunel-celular-poster.webp" },
    computador: { src: "assets/video/tunel-desktop.mp4", poster: "assets/video/tunel-desktop-poster.webp" },
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
    // Liberada antes de começar (trava de segurança, aba escondida): sem
    // isto, o vídeo chegava depois e dava play na abertura já cancelada —
    // o palco não existe mais, e só o clarão laranja piscava por cima da
    // página, segundos depois.
    if (comecou || aberturaAcabou) return;
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
    if (tl.time() < t) tl.seek(t);
    tl.timeScale(2.2);
    // O vídeo NÃO pula pra frente junto: pular (currentTime) num vídeo que
    // ainda está baixando fazia ele travar e voltar pro começo do túnel —
    // parecia que a abertura recarregava bem na hora do celular, sempre
    // que a pessoa encostava na tela. Ele só corre mais rápido de onde está;
    // o clarão do fim cobre a chegada na porta.
    if (!semVideo) video.playbackRate = Math.min(2.5, ritmoFinal * 2.2);
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
  // Como a barra do produto nas páginas da Apple (iPad Pro, AirPods Pro,
  // Fitness+): o menu fica sempre visível, descendo e subindo — nunca some.
  // No topo ele é transparente (flutua sobre o céu escuro da foto); assim
  // que a pessoa rola, ganha o fundo azul-noite translúcido (ver
  // .site-header.com-fundo no CSS), pra o texto não passar por trás da logo.
  let pedido = false;
  const confere = () => {
    pedido = false;
    header.classList.toggle("com-fundo", window.scrollY > 8);
  };
  confere();
  window.addEventListener("scroll", () => {
    if (!pedido) { pedido = true; requestAnimationFrame(confere); }
  }, { passive: true });
}

// "Falar bem na câmera vira venda...": o texto fica parado no meio da tela
// e, quando os depoimentos começam a subir por cima (ver #depoimentos no
// CSS), vai apagando e encolhendo um pouco — como se fosse ficando pra trás
// da tela — até sumir antes do título "Veja quem já deu o play" chegar nele.
function wireAplicacaoSome() {
  const texto = document.querySelector(".aplicacao-preso .container");
  const depo = document.getElementById("depoimentos");
  if (!texto || !depo) return;
  let ticking = false;
  let ultimo = -1;
  function aplica() {
    ticking = false;
    const tela = alturaDaTela();
    // Começa quando a cortina passa de 95% da altura da tela e termina em 68%.
    const p = clamp((.95 - depo.getBoundingClientRect().top / tela) / .27);
    const q = Math.round(p * 100) / 100;
    if (q === ultimo) return;
    ultimo = q;
    texto.style.opacity = q ? (1 - q).toFixed(2) : "";
    texto.style.transform = q && !prefersReducedMotion ? "scale(" + (1 - .06 * q).toFixed(3) + ")" : "";
  }
  aplica();
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(aplica);
  }, { passive: true });
  window.addEventListener("resize", aplica, { passive: true });
}

// A logo (texto branco) some sobre as seções claras (módulos, benefícios) — mesma ideia do "LocalnavThemeChanger" da Apple, o menu fixo
// mudando de tema conforme a seção que está passando por baixo dele. Aqui,
// em vez de trocar a cor da logo, o menu ganha um fundo escuro translúcido
// só enquanto está sobre uma dessas seções (ver .site-header.on-light).
function wireHeaderTema() {
  const header = document.querySelector(".site-header");
  const alvos = [...document.querySelectorAll("#modulos, #beneficios")];
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
// a rolar, pra não ficar sobrando na tela depois que ela já entendeu o gesto,
// e volta a aparecer se ela rolar de volta pro topo (antes o listener saía
// de vez na primeira rolagem, então ele nunca mais voltava).
function wireScrollCue() {
  const cue = document.querySelector(".scroll-cue");
  if (!cue) return;
  let ticking = false;
  const aplica = () => {
    ticking = false;
    cue.classList.toggle("is-hidden", window.scrollY > 60);
  };
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(aplica);
  }, { passive: true });
}
