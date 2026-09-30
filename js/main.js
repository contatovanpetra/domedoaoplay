// =========================================================
// Do Medo ao Play — Landing Page (funil de vendas Hotmart)
// =========================================================

// 1) O link de checkout da Hotmart fica no próprio HTML, no href de cada botão
//    marcado com [data-checkout-link] (index.html e as 3 páginas de apoio:
//    troque COLOQUE-SEU-CODIGO-AQUI pelo código real em todos). Assim o botão
//    leva ao checkout mesmo se este arquivo não carregar (rede caindo no meio
//    do carregamento); aqui ele só acrescenta os parâmetros de rastreio.
const CHECKOUT_PROVISORIO = "COLOQUE-SEU-CODIGO-AQUI";

// 2) O GSAP (em js/vendor) toca a abertura. Sem ele (falha de rede, bloqueio
//    de script), a abertura é pulada e a página abre direto: nada fica preso.
const hasGSAP = typeof gsap !== "undefined";
// Avisa o <head> que este arquivo chegou (ver "sem-main" no index.html).
window.mainPronto = true;
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
  // Cada parte da página liga sozinha: um erro numa delas (um recurso que o
  // navegador não tem, um elemento que mudou) aparece no console e não
  // impede as outras. Antes, um erro no meio da lista parava tudo o que vinha
  // depois: o título e o botão do topo ficavam invisíveis e a abertura podia
  // ficar presa na tela.
  const partes = [
    wireCheckoutLinks, wireLinksVazios, wireAncoras, wireAccordions,
    wireModulosTrilha, wireScrollReveal, wireDepoimentos, wireEscadaShowcase,
    wireViviCard, wireCountUp, wireScrollEffects, wireReadProgressBar,
    wireScrollCue, wireIntroStage, wireManterLugar, wireHeaderReveal,
    wireHeaderTema, wireAplicacaoSome, playHeroIntro, wireVoltar,
    wireGuardaLugar, wireReviewMode, wireCorDoFundo, wirePonteEncolhe, wireBeneficiosPilha,
    wirePausaForaDaTela, wireReconexao,
  ];
  partes.forEach((liga) => {
    try {
      liga();
    } catch (erro) {
      console.error("Do Medo ao Play: falha ao ligar " + liga.name + " (o resto da página continua funcionando).", erro);
      // Se foi a abertura, a página não pode ficar presa atrás dela.
      if (liga === wireIntroStage && typeof window.liberaAbertura === "function") window.liberaAbertura();
      // Se foi a entrada do topo, o título e o botão aparecem sem animação.
      if (liga === playHeroIntro) mostraTopoSemAnimacao();
    }
  });
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
  const noite = ["reconhecimento", "situacoes", "virada"];
  // A ponte (#virada): enquanto a frase fica parada no meio da tela, o fundo
  // vai do quase-preto pro azul da marca acompanhando a rolagem, em vez de
  // trocar de uma vez. Cores iguais às do CSS (--noite e --bg).
  const virada = document.getElementById("virada");
  const pageBg = document.querySelector(".page-bg");
  const header = document.querySelector(".site-header");
  const DE = [4, 8, 14], PARA = [11, 23, 40];
  const mistura = (t) => DE.map((c, i) => Math.round(c + (PARA[i] - c) * t));
  let pintando = false;
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
    // Capítulo do problema ("Você trava." e as situações) em quase-preto.
    root.classList.toggle("fundo-noite", !!atual && noite.includes(atual.id));
    // Na ponte: a cor segue a rolagem (0 quando a caixa da frase gruda no
    // alto, 1 quando ela solta), com a mesma curva suave no começo e no fim.
    if (virada && pageBg && atual === virada) {
      const r = virada.getBoundingClientRect();
      const percurso = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / percurso));
      const t = p * p * (3 - 2 * p);
      const [vr, vg, vb] = mistura(t);
      pageBg.style.transition = "none";
      pageBg.style.backgroundColor = `rgb(${vr}, ${vg}, ${vb})`;
      if (header) header.style.backgroundColor = header.classList.contains("com-fundo") ? `rgba(${vr}, ${vg}, ${vb}, .9)` : "";
      pintando = true;
    } else if (pintando) {
      pintando = false;
      pageBg.style.transition = "";
      pageBg.style.backgroundColor = "";
      if (header) header.style.backgroundColor = "";
    }
  };
  confere();
  window.addEventListener("scroll", () => {
    if (!pedido) { pedido = true; requestAnimationFrame(confere); }
  }, { passive: true });
  window.addEventListener("resize", confere, { passive: true });
}

// A ponte (#virada): "Dá pra sair disso, degrau a degrau." entra grande e,
// enquanto fica parada no meio da tela, vai diminuindo com a rolagem (até
// 65%), abrindo caminho pra escada. Segue o dedo nos dois sentidos; só
// mexe no transform (sem recalcular a página).
function wirePonteEncolhe() {
  const virada = document.getElementById("virada");
  const frase = virada && virada.querySelector(".virada-palco > .container");
  if (!frase || prefersReducedMotion) return;
  const MENOR = 0.65;
  let pedido = false;
  let ultimo = -1;
  const confere = () => {
    pedido = false;
    const r = virada.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const percurso = Math.max(1, r.height - window.innerHeight);
    const p = Math.min(1, Math.max(0, -r.top / percurso));
    // Fica inteira no primeiro quinto (dá tempo de ler), depois encolhe
    // com a mesma curva suave do fundo.
    const q = Math.min(1, Math.max(0, (p - 0.2) / 0.8));
    const escala = 1 - (1 - MENOR) * q * q * (3 - 2 * q);
    if (Math.abs(escala - ultimo) < 0.001) return;
    ultimo = escala;
    frase.style.transform = escala === 1 ? "" : `scale(${escala.toFixed(4)})`;
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
  // Celular em pé: título e botão ficam por cima do pé da foto presa, e o
  // parágrafo logo abaixo (ver CSS). Subindo, eles passariam por cima do
  // rosto da Vitória: somem devagar antes disso (o parágrafo, que chega
  // depois, some depois), e a foto começa a se dissolver mais cedo. Some o
  // que está DENTRO do título, do parágrafo e do botão: neles mesmos quem
  // mexe na opacidade é a entrada do herói (playHeroIntro).
  const heroTopo = hero ? [...hero.querySelectorAll(".hero-h1-abre, .hero-h1-resto, .hero-cta-foto")] : [];
  const heroApoio = hero ? [...hero.querySelectorAll("#hero-lead p")] : [];
  const some = (els, o) => els.forEach((el) => {
    el.style.opacity = o < 1 ? (o * o * (3 - 2 * o)).toFixed(3) : "";
    // Sumido, o botão também não recebe toque nem Tab (o botão invisível
    // não abre nada). O texto (título e apoio) só fica transparente: continua
    // na página pro leitor de tela, que antes perdia o H1 ao rolar.
    el.style.visibility = o <= 0 && el.querySelector("a[href], button") ? "hidden" : "";
  });
  const celularEmPe = window.matchMedia("(max-width: 699.98px) and (min-height: 481px)");
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
      // alto (35% da pista) e termina quando a frase entra por baixo. No
      // celular em pé, de 10% a 95%: o texto sobe por cima da foto.
      const r = (y - heroTop) / pistaFoto;
      const f = celularEmPe.matches ? clamp((r - .1) / .85) : clamp((r - .35) / .6);
      fimFoto.style.opacity = (f * f * (3 - 2 * f)).toFixed(3);
      const emPe = celularEmPe.matches;
      const tela = window.innerHeight;
      // Título e botão somem devagar (de 6% a 46% da tela de rolagem; era
      // de 20 a 240px e parecia rápido demais, 30/set); o parágrafo, que
      // chega depois, some de 52% a 78%, antes de "Você trava." subir.
      some(heroTopo, emPe ? 1 - clamp((y - heroTop - .06 * tela) / (.4 * tela)) : 1);
      some(heroApoio, emPe ? 1 - clamp((y - heroTop - .52 * tela) / (.26 * tela)) : 1);
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

// Repassa pro checkout os parâmetros de rastreio com que a pessoa chegou
// (utm_source, src, sck...). Sem isso, quem vem de um anúncio ou da bio chega na
// Hotmart sem origem e a venda aparece sem rastreio no Hotmart Analytics.
// Os parâmetros ficam guardados na aba (sessionStorage) durante a visita: quem
// chega do anúncio, abre os Termos ou a Política e compra de lá (ou volta pela
// logo, que leva a index.html sem parâmetros) chegava na Hotmart sem origem.
// Uma visita nova com parâmetros de rastreio (outro anúncio, na mesma aba)
// substitui o conjunto inteiro guardado: vale o último anúncio da aba.
//
// Só seguem (e só ficam guardados) os parâmetros de rastreio: utm_* e os da
// lista abaixo (auditoria de tracking, 30/set). Antes ia tudo o que estivesse
// no endereço, inclusive um "email=" (dado pessoal indo pra Hotmart) ou um
// "off=" (que troca a oferta no checkout da Hotmart). O valor vai exatamente
// como chegou (sem recodificar: "%20" continua "%20"). Pra incluir outro
// parâmetro, acrescente aqui E na cópia da lista no <script> do <head> do
// index.html (o que atende o clique antes deste arquivo carregar).
const PARAMETROS_DE_RASTREIO = [
  "src", "sck", "xcod",                                        // Hotmart
  "gclid", "gbraid", "wbraid", "gad_source", "gad_campaignid", "dclid", // Google
  "fbclid",                                                    // Meta
  "msclkid", "ttclid", "twclid", "li_fat_id", "epik",          // Microsoft, TikTok, X, LinkedIn, Pinterest
];
const CHAVE_PARAMETROS = "dmap-parametros";
function ehDeRastreio(chave) {
  return /^utm_[a-z0-9_]+$/.test(chave) || PARAMETROS_DE_RASTREIO.includes(chave);
}
// Os pares de rastreio de um "?a=1&b=2", como vieram: [chave, "chave=valor"].
// Chave repetida: vale a primeira.
function paresDeRastreio(busca) {
  const pares = [];
  String(busca || "").replace(/^\?/, "").split("&").forEach((parte) => {
    if (!parte) return;
    const i = parte.indexOf("=");
    let chave;
    try { chave = decodeURIComponent((i < 0 ? parte : parte.slice(0, i)).replace(/\+/g, " ")); } catch { return; }
    if (!ehDeRastreio(chave) || pares.some((p) => p[0] === chave)) return;
    pares.push([chave, parte]);
  });
  return pares;
}
function parametrosDaVisita() {
  const atuais = paresDeRastreio(window.location.search);
  let guardados = [];
  try {
    if (atuais.length) sessionStorage.setItem(CHAVE_PARAMETROS, atuais.map((p) => p[1]).join("&"));
    guardados = paresDeRastreio(sessionStorage.getItem(CHAVE_PARAMETROS) || "");
  } catch { /* sem armazenamento (navegação privada restrita): vale só o endereço atual */ }
  guardados.forEach((p) => { if (!atuais.some((a) => a[0] === p[0])) atuais.push(p); });
  return atuais;
}
function checkoutHref(base, parametros) {
  try {
    const url = new URL(base);
    const pares = Array.isArray(parametros) ? parametros : paresDeRastreio(String(parametros || ""));
    // Um parâmetro que já vem no link do botão (a oferta, por exemplo) nunca
    // é trocado pelo do endereço.
    const extras = pares.filter(([chave]) => !url.searchParams.has(chave)).map((p) => p[1]);
    if (!extras.length) return url.toString();
    return url.origin + url.pathname + (url.search ? url.search + "&" : "?") + extras.join("&") + url.hash;
  } catch {
    // Endereço do botão inválido: mantém o que está no HTML.
    return base;
  }
}

// Pontos de medição (auditoria de tracking, 30/set). Nenhuma ferramenta de
// anúncio ou analytics está instalada: isto só avisa que algo aconteceu, de
// um jeito que qualquer uma delas (a escolha é do gestor de tráfego) consegue
// ouvir. Nada é enviado pra fora daqui:
//  - evento "dmap:evento" no document (detail = { evento, ...dados });
//  - se já existir um dataLayer (só existe se o GTM/gtag for instalado),
//    um push { event: "dmap_<evento>", ...dados }.
// Nunca atrasa nem impede a ação da pessoa: qualquer erro aqui é engolido.
function registraEvento(evento, dados) {
  const detalhe = Object.assign({ evento }, dados);
  try { document.dispatchEvent(new CustomEvent("dmap:evento", { detail: detalhe })); } catch { /* sem CustomEvent: segue */ }
  try {
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(Object.assign({ event: "dmap_" + evento }, dados));
  } catch { /* dataLayer quebrado ou bloqueado: segue */ }
}
function paginaAtual() {
  return (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
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
  const links = [...document.querySelectorAll("[data-checkout-link]")];
  if (links.some((link) => (link.getAttribute("href") || "").includes(CHECKOUT_PROVISORIO))) {
    console.warn("Do Medo ao Play: o link de checkout ainda é o provisório. Troque " + CHECKOUT_PROVISORIO + " pelo código da Hotmart nos botões (index.html e páginas de apoio).");
  }
  const parametros = parametrosDaVisita();
  links.forEach((link) => {
    link.setAttribute("href", checkoutHref(link.getAttribute("href"), parametros));
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener");
  });
  // Clique duplo (ou dois toques seguidos) abria duas abas do checkout: o
  // segundo clique dentro de 1 s é ignorado. Um clique normal não muda nada.
  let ultimoClique = -Infinity;
  // Um clique que abre o checkout = um evento "clique_checkout" (o clique
  // ignorado do clique duplo não conta). Não é compra nem início de checkout
  // confirmado: só que a pessoa tocou no botão. Botão do meio do mouse
  // (abrir em aba nova) também abre o checkout, então também conta.
  const abriu = (link) => registraEvento("clique_checkout", { posicao: link.dataset.trackId || "", pagina: paginaAtual() });
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const agora = performance.now();
      if (agora - ultimoClique < 1000) { e.preventDefault(); return; }
      ultimoClique = agora;
      abriu(link);
    });
    link.addEventListener("auxclick", (e) => {
      if (e.button !== 1) return;
      const agora = performance.now();
      if (agora - ultimoClique < 1000) return;
      ultimoClique = agora;
      abriu(link);
    });
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
  // Vídeos que rodam sozinhos em loop precisam de um jeito de parar (WCAG
  // 2.2.2): um botão de pausar no canto de cada vídeo, que pausa/retoma os
  // três. Só existe quando há vídeo de verdade no cartão.
  let pausadosPelaPessoa = false;
  const botoesPausa = [];
  function atualizaPausa() {
    botoesPausa.forEach((b) => {
      b.setAttribute("aria-label", pausadosPelaPessoa ? "Retomar os vídeos" : "Pausar os vídeos");
      b.classList.toggle("is-pausado", pausadosPelaPessoa);
    });
  }
  let secaoVisivel = false;
  function tocaOuPausa() {
    inline.forEach((v) => {
      if (secaoVisivel && !pausadosPelaPessoa) { const t = v.play(); if (t && t.catch) t.catch(() => {}); } else v.pause();
    });
  }
  if (inline.length && !prefersReducedMotion) {
    cards.forEach((card) => {
      if (!card.querySelector(".depo-video-mudo")) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "depo-pausa";
      b.innerHTML = '<svg class="icone-pausa" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>' +
        '<svg class="icone-tocar" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
      b.addEventListener("click", () => { pausadosPelaPessoa = !pausadosPelaPessoa; atualizaPausa(); tocaOuPausa(); });
      card.appendChild(b);
      botoesPausa.push(b);
    });
    atualizaPausa();
  }
  if (inline.length && !prefersReducedMotion && "IntersectionObserver" in window) {
    const secao = document.getElementById("depoimentos") || palco;
    new IntersectionObserver((entries) => {
      secaoVisivel = entries[entries.length - 1].isIntersecting;
      tocaOuPausa();
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
  let abertoEm = 0;
  // Clique no fundo ou no ×: o segundo clique de um clique duplo no vídeo
  // caía no fundo que acabou de aparecer e fechava o vídeo na mesma hora.
  // Nos primeiros 400 ms depois de abrir, o clique não fecha (o Esc fecha).
  function fechaPeloClique() {
    if (performance.now() - abertoEm < 400) return;
    fecha();
  }
  function fecha() {
    if (!modal) return;
    const m = modal;
    modal = null;
    const v = m.querySelector("video");
    if (v) v.pause();
    m.classList.remove("is-aberto");
    document.documentElement.style.overflow = "";
    fundoInerte(false);
    document.removeEventListener("keydown", teclaModal);
    setTimeout(() => m.remove(), prefersReducedMotion ? 0 : 300);
    if (focoAntes) focoAntes.focus({ preventScroll: true });
  }
  // Com o vídeo aberto, o resto da página fica inerte: o leitor de tela e o
  // Tab não saem do vídeo (o aria-modal sozinho não garante isso em todo lugar).
  let inertes = [];
  function fundoInerte(liga) {
    if (liga) {
      inertes = [...document.body.children].filter((el) => el !== modal && !el.inert && el.tagName !== "SCRIPT");
      inertes.forEach((el) => { el.inert = true; });
    } else {
      inertes.forEach((el) => { el.inert = false; });
      inertes = [];
    }
  }
  function teclaModal(e) {
    if (e.key === "Escape") { e.preventDefault(); fecha(); }
    // Com o vídeo aberto, o Tab não sai de dentro dele.
    // Com o vídeo aberto, o Tab circula entre o × e os controles do vídeo.
    if (e.key === "Tab" && modal) {
      const focaveis = [...modal.querySelectorAll("button, video[controls]")];
      const i = focaveis.indexOf(document.activeElement);
      e.preventDefault();
      const prox = e.shiftKey ? (i <= 0 ? focaveis.length - 1 : i - 1) : (i + 1) % focaveis.length;
      focaveis[prox].focus();
    }
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
    abertoEm = performance.now();
    modal.querySelector(".depo-modal-fundo").addEventListener("click", fechaPeloClique);
    modal.querySelector(".depo-modal-fechar").addEventListener("click", fechaPeloClique);
    document.body.appendChild(modal);
    fundoInerte(true);
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
  let focoDentro = false;     // foco do teclado nos níveis: o avanço espera

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
    if (!tocando || !naTela || focoDentro || prefersReducedMotion) return;
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
      // Só a aba ativa entra no Tab; as outras, pelas setas (padrão de abas).
      num.tabIndex = isActive ? 0 : -1;
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
        marcaEscolha();
        goToIndex(i + 1);
        nums[(i + 1) % nums.length].focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        marcaEscolha();
        goToIndex(i - 1);
        nums[(i - 1 + nums.length) % nums.length].focus();
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        const alvo = e.key === "Home" ? 0 : nums.length - 1;
        marcaEscolha();
        goToIndex(alvo);
        nums[alvo].focus();
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

  // Com o foco do teclado nos níveis (ou no pausar), o avanço automático
  // espera: não troca o nível nem desce a página enquanto a pessoa lê ou
  // escolhe (padrão de carrossel acessível). Ao sair, continua de onde estava.
  const areaFoco = [palco, document.querySelector(".escada-progresso")].filter(Boolean);
  areaFoco.forEach((area) => {
    area.addEventListener("focusin", (e) => {
      // Só o foco do teclado (o clique com mouse/dedo segue como antes).
      let teclado = true;
      try { teclado = e.target.matches(":focus-visible"); } catch (x) {}
      if (!teclado) return;
      focoDentro = true;
      pararProgresso();
    });
    area.addEventListener("focusout", (e) => {
      if (!focoDentro || areaFoco.some((a) => a.contains(e.relatedTarget))) return;
      focoDentro = false;
      if (tocando) iniciarProgresso(true);
    });
  });

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
    ".section .container > *, .accordion-item, .situacoes-item"
  )].filter((el) => !el.matches(
    ".accordion, .beneficios, .situacoes"
  ));
  // Sem IntersectionObserver, nada é escondido.
  if (!("IntersectionObserver" in window)) return;

  // O observador é criado ANTES de esconder os blocos: se ele falhar, os
  // blocos continuam visíveis (antes ficavam escondidos pra sempre).
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

  targets.forEach((el) => el.classList.add("reveal"));
  targets.forEach((el) => observer.observe(el));
  // Quem navega pelo teclado não espera a entrada: o bloco que recebe o
  // foco aparece na hora (antes o botão focado podia estar ainda invisível).
  document.addEventListener("focusin", (e) => {
    const bloco = e.target.closest && e.target.closest(".reveal:not(.is-visible)");
    if (bloco) { bloco.classList.add("is-visible", "entra-ja"); observer.unobserve(bloco); }
  });
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
  // O leitor de tela lê sempre o número final ("13 anos"), nunca a
  // contagem ("0 anos"): o número animado fica só pra quem vê.
  targets.forEach((el) => {
    const fixo = document.createElement("span");
    fixo.className = "sr-only";
    fixo.textContent = el.dataset.count + (el.dataset.suffix || "");
    el.setAttribute("aria-hidden", "true");
    el.parentNode.insertBefore(fixo, el);
  });
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
    gsap.set(burstLinha, { strokeDasharray: medeContorno(), strokeDashoffset: medeContorno() });
  }
  // Mede de novo na hora de desenhar (ver o .call em "celular"): a página
  // aberta dentro de um quadro ainda escondido (uma prévia carregando, por
  // exemplo) tem o palco com 0px no começo — o traço ficava com 4px e o
  // contorno aparecia pontilhado. Sem tamanho nenhum, vale o perímetro da
  // janela, que é sempre maior que o do celular: a linha sai inteira.
  function medeContorno() {
    const c = Math.ceil(2 * (burstStage.offsetWidth + burstStage.offsetHeight)) + 4;
    return c > 40 ? c : Math.ceil(2 * (window.innerWidth + window.innerHeight)) + 4;
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
  const CRESCE = .8; // a travessia: o iPhone crescendo junto com o túnel
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
    .call(() => { if (burstLinha) { const c = medeContorno(); gsap.set(burstLinha, { strokeDasharray: c, strokeDashoffset: c }); } }, null, "celular")
    .to(burstLinha, { strokeDashoffset: 0, duration: .7, ease: "power2.inOut" }, "celular")
    .to(burstStage, { rotationY: -5, rotationX: 2, duration: 1, ease: "power2.out" }, "celular")
    .to(burstAparelho, { opacity: 1, duration: .3, ease: "power1.out" }, "celular+=.6")
    .to(burstScreen, { opacity: 1, duration: .35, ease: "power2.out" }, "celular+=.85")
    .to(burstCamera, { opacity: 1, duration: .3 }, "celular+=1.15")
    .to(faixas, { opacity: 1, duration: .5, ease: "power2.inOut" }, "celular+=1.2")
    // A porta de luz chega aqui: a sombra do celular some junto (no laranja
    // ela virava uma caixa escura em volta dele).
    .to(burstAparelho, { "--sombra": 0, duration: .6, ease: "power1.out" }, "celular+=1.2")
    // FASE 4 — o resto da pergunta, já com o celular montado na tela.
    .to(burstTitleSpans, { opacity: 1, y: 0, duration: .3, stagger: .1, ease: "back.out(1.7)" }, "celular+=1.7")
    .call(aperta, null, "celular+=2")
    // FASE 5 — segura tudo montado ("E se, em vez de travar... você
    // desse o play?" inteira, celular gravando) um instante antes de
    // atravessar. Era 1,1 s depois do "play?" entrar; a Vitória pediu a
    // parte depois da pergunta mais curta (29/set): 0,3 s.
    .addLabel("atravessa", "celular+=2.6")
    .to([burstPre, ...burstTitleSpans], { opacity: 0, duration: .3 }, "atravessa")
    .to(faixas, { opacity: 0, duration: .3 }, "atravessa")
    .to(burstStage, { rotationX: 0, rotationY: 0, duration: .4, ease: "power2.inOut" }, "atravessa")
    .to([burstCamera, burstIlha, burstContorno], { opacity: 0, duration: .3 }, "atravessa+=.1")
    // ATRAVESSA: o iPhone cresce junto com o túnel, até a porta de luz, e
    // explode no clarão. A réplica lá dentro chega em escala 1: a tela VIRA a
    // página, sem corte.
    .addLabel("cresce", "atravessa+=.25")
    .to(burstStage, { scale: () => 1 / escalaDaReplica(), duration: CRESCE, ease: "power3.in" }, "cresce")
    .to(burstScreen, { borderRadius: 0, duration: CRESCE, ease: "power3.in" }, "cresce")
    // O clarão acende no fim da travessia (termina junto com o crescimento).
    .to(flash, { opacity: 1, duration: .32, ease: "power2.in" }, "cresce+=" + (CRESCE - .32).toFixed(2))
    .call(libera)
    .to(flash, { opacity: 0, duration: .5, ease: "power2.out" });

  // ---- O TÚNEL ----
  // Vídeo de 7s dos arcos até a porta de luz laranja, tocando sozinho. O
  // ritmo é acertado pra ele chegar na porta quando a tela termina de crescer
  // (a luz do vídeo emenda no clarão). Tela em pé usa o vídeo vertical.
  const VIDEOS = {
    celular: { src: "assets/video/tunel-celular.mp4?v=4", poster: "assets/video/tunel-celular-poster.webp" },
    computador: { src: "assets/video/tunel-desktop.mp4?v=4", poster: "assets/video/tunel-desktop-poster.webp" },
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

  // O túnel vai acelerando por igual até a porta de luz, aonde chega um
  // pouco antes da tela da câmera terminar de crescer, e fica na luz até o
  // clarão. A aceleração vem gravada no próprio arquivo (1,5x no começo até
  // 1,8x na porta, 4,4 s; a Vitória pediu só o túnel mais rápido, 29/set, o
  // resto da abertura segue no mesmo tempo): o vídeo toca no ritmo normal,
  // do começo ao fim, sem ninguém mexer nele. Antes o JS mudava o ritmo
  // (playbackRate) aos pouquinhos enquanto ele tocava; no iPhone, mudar o
  // ritmo de um vídeo que ainda está chegando pode fazer o Safari recomeçar
  // do último quadro-chave, e o arquivo antigo só tinha um no começo: o túnel
  // voltava pro início logo depois de "E se, em vez de travar…" (a primeira
  // mudança caía aos 1,6 s) e voltava a andar, como se a página recarregasse.
  // O arquivo novo tem um quadro-chave a cada meio segundo e nenhum quadro
  // "B" (os que dependem do quadro seguinte): decodificação mais leve.
  // A animação não espera o vídeo: começa logo depois do pôster (a imagem do
  // túnel) aparecer, e o vídeo entra quando chegar. O pôster é o primeiro
  // quadro do vídeo, então ele entrar um pouco depois não dá salto nenhum.
  // Antes a abertura inteira esperava o vídeo tocar: numa rede lenta a
  // pessoa ficava olhando o túnel parado, e a frase demorava a aparecer.
  let esperaInicio = 0;
  let videoAndando = false;
  // O vídeo não veio (rede lenta demais, modo de economia do celular): fica a
  // imagem do começo do túnel, que se aproxima devagar até o fim da abertura.
  function desisteDoVideo() {
    if (videoAndando || semVideo || aberturaAcabou) return;
    if (video.currentTime > 0 && !video.paused) { videoAndando = true; return; }
    semVideo = true;
    video.pause();
    video.removeAttribute("src");
    video.load();
    gsap.fromTo(video, { scale: 1 }, { scale: 1.3, duration: Math.max(.5, porta - tl.time()), ease: "power1.in" });
  }
  function comeca() {
    // Liberada antes de começar (trava de segurança, aba escondida): sem
    // isto, o vídeo chegava depois e dava play na abertura já cancelada —
    // o palco não existe mais, e só o clarão laranja piscava por cima da
    // página, segundos depois.
    if (comecou || aberturaAcabou) return;
    comecou = true;
    clearTimeout(esperaInicio);
    tl.play();
    // Trava de segurança: a página nunca fica presa atrás da abertura.
    setTimeout(() => libera(true), (tl.duration() + 4) * 1000);
    // Até 1,5 s de atraso o vídeo ainda entra (o clarão do fim cobre a
    // diferença na chegada à porta); depois disso, fica a imagem.
    if (!videoAndando && !semVideo) esperaVideo = setTimeout(desisteDoVideo, 1500);
  }

  // Adianta direto pra travessia (a tela da câmera crescendo até virar a
  // página), bem mais rápido: rolar, tocar ou apertar uma tecla.
  let adiantou = false;
  function adianta() {
    if (adiantou || aberturaAcabou) return;
    adiantou = true;
    const t = tl.labels.atravessa;
    if (tl.time() < t) tl.seek(t);
    tl.timeScale(2.2);
    // O vídeo não pula pra frente nem acelera junto: pular (currentTime) ou
    // mudar o ritmo de um vídeo tocando pode fazer o iPhone voltar pro
    // começo do túnel. Ele segue de onde está; o clarão do fim cobre a chegada na porta.
    if (!comecou) {
      comecou = true;
      clearTimeout(esperaInicio);
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
  // O véu abre assim que o pôster está pronto (já pedido no <head>), e a
  // animação começa 0,4 s depois — ou antes, se o vídeo já estiver tocando.
  // É a mesma animação da linha do tempo (tl), só adiantada: quando o tl
  // começa, o véu já está abrindo.
  const posterPronto = () => {
    if (comecou || aberturaAcabou) return;
    if (veil) gsap.to(veil, { opacity: 0, duration: .5, ease: "power1.out" });
    if (faixas) gsap.to(faixas, { opacity: .7, duration: .4, delay: .2 });
    clearTimeout(esperaInicio);
    esperaInicio = setTimeout(comeca, 400);
  };
  const poster = new Image();
  poster.onload = posterPronto;
  poster.onerror = () => { clearTimeout(esperaInicio); esperaInicio = setTimeout(comeca, 400); };
  poster.src = VIDEOS[modo].poster;
  video.addEventListener("playing", () => {
    videoAndando = true;
    clearTimeout(esperaVideo);
    comeca();
  }, { once: true });
  video.src = VIDEOS[modo].src;
  const tocando = video.play();
  // Vídeo bloqueado (modo de economia do iPhone) ou que não toca: começa na
  // hora, com a imagem.
  if (tocando && tocando.catch) tocando.catch(() => { desisteDoVideo(); comeca(); });
  // Nem o pôster chegou: não espera mais que isso pra começar.
  esperaInicio = setTimeout(comeca, 2500);
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

function mostraTopoSemAnimacao() {
  ["hero-headline", "hero-lead", "hero-actions-el", "hero-scrollcue"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.opacity = 1;
  });
}

// Imagem que falhou porque a internet caiu (metrô, elevador) não é pedida de
// novo sozinha pelo navegador: ficava quebrada mesmo com a conexão de volta.
// Quando a conexão volta, as que falharam são pedidas outra vez.
function wireReconexao() {
  window.addEventListener("online", () => {
    document.querySelectorAll("img").forEach((img) => {
      if (!img.complete || img.naturalWidth > 0) return;
      const picture = img.parentElement && img.parentElement.tagName === "PICTURE" ? img.parentElement : null;
      if (picture) picture.querySelectorAll("source").forEach((s) => { s.srcset = s.getAttribute("srcset"); });
      if (img.hasAttribute("srcset")) img.srcset = img.getAttribute("srcset");
      img.src = img.getAttribute("src");
    });
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
