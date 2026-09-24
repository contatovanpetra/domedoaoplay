import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, 'assets', 'roteiros-depoimentos.pdf');
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 40, bottom: 40, left: 45, right: 45 }
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Colors
const primary = '#0B1728';
const accentOrange = '#D77713';
const textDark = '#1B3046';
const textMuted = '#4A627A';
const bgCard = '#F4F7FB';

// Header
doc.rect(0, 0, doc.page.width, 95).fill(primary);
doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold')
   .text('DO MEDO AO PLAY', 45, 30);
doc.fillColor('#D77713').fontSize(12).font('Helvetica-Bold')
   .text('GUIA DE GRAVAÇÃO: 3 ROTEIROS DE DEPOIMENTO DE ALTA CONVERSÃO', 45, 58);

doc.moveDown(3);

// Intro Box
doc.rect(45, 110, doc.page.width - 90, 60).fill(bgCard);
doc.fillColor(primary).fontSize(10).font('Helvetica-Bold')
   .text('ESTRUTURA DE ALTA CONVERSÃO (45 a 75 segundos):', 55, 120);
doc.fillColor(textDark).fontSize(9).font('Helvetica')
   .text('1. Gancho (Dor/Trava inicial)  ->  2. A Descoberta (Escada de Exposição)  ->  3. A Transformação (Resultado Prático)  ->  4. Validação e Chamada.', 55, 138, { width: doc.page.width - 110 });

let y = 190;

function renderDepoimento(title, role, persona, bullets) {
  // Card header
  doc.rect(45, y, doc.page.width - 90, 26).fill('#E9EFF7');
  doc.fillColor(primary).fontSize(11).font('Helvetica-Bold')
     .text(title.toUpperCase(), 55, y + 7, { continued: true });
  doc.fillColor(accentOrange).fontSize(10).font('Helvetica-Bold')
     .text(`  |  ${role.toUpperCase()}`);

  y += 32;

  doc.fillColor(textMuted).fontSize(8.5).font('Helvetica-Oblique')
     .text(`Perfil: ${persona}`, 50, y);
  y += 16;

  bullets.forEach((b) => {
    doc.fillColor(accentOrange).fontSize(9).font('Helvetica-Bold')
       .text(`• ${b.step}: `, 50, y, { continued: true });
    doc.fillColor(textDark).fontSize(9).font('Helvetica')
       .text(b.content, { width: doc.page.width - 105 });
    y = doc.y + 6;
  });

  y += 10;
}

// 1. Paloma Gonçalves
renderDepoimento(
  '1. Paloma Gonçalves',
  'CEO da Mundo Nuts (Empreendedora / Dona de Negócio)',
  'Dona de marca própria que tinha medo da exposição e de prejudicar a imagem da empresa.',
  [
    { step: 'Gancho (0-15s)', content: 'Contar que tinha um produto excelente, mas morria de vergonha de aparecer nos vídeos da marca. Sentia que ia parecer amadora ou queimar sua credibilidade.' },
    { step: 'A Virada (15-35s)', content: 'Descobriu que não precisava bancar a blogueira extrovertida. O método da Vitória ensinou postura executiva, como falar com firmeza e passar confiança sem forçar simpatia.' },
    { step: 'Resultado (35-55s)', content: 'Quando colocou a própria cara como fundadora nos Stories e Reels, o público se conectou imediatamente. No lançamento seguinte da Mundo Nuts, o faturamento disparou 27%.' },
    { step: 'Fechamento (55-65s)', content: '"Se você tem um negócio e fica escondido atrás de logo ou foto estática, você está perdendo dinheiro. Entre no Do Medo ao Play e dê o play na sua marca."' }
  ]
);

// 2. Vitória Catarina
renderDepoimento(
  '2. Vitória Catarina',
  'Afiliada no TikTok (Criadora de Conteúdo / Afiliada)',
  'Precisava de volume diário de vídeos mas travava na gravação e demorava horas para soltar 1 post.',
  [
    { step: 'Gancho (0-15s)', content: 'Explicar que tentava vender como afiliada, mas demorava uma tarde inteira gravando e apagando o mesmo vídeo 15 vezes, até desistir com vergonha da câmera.' },
    { step: 'A Virada (15-35s)', content: 'Com a Escada de Exposição, começou gravando só para ela, depois amigos, até soltar vídeos com naturalidade. Aprendeu roteiro rápido e presença fluida.' },
    { step: 'Resultado (35-55s)', content: 'Passou de 1 vídeo sofrido por semana para 1 vídeo leve por dia sem travar. Em dois meses de consistência, suas comissões triplicaram.' },
    { step: 'Fechamento (55-65s)', content: '"Não precisa de equipamento caro nem dom natural. O método da Vitória te destrava de verdade. Pode entrar sem medo."' }
  ]
);

// 3. Henrique Policastro
renderDepoimento(
  '3. Henrique Policastro',
  'Empresário (Mentor / Infoprodutor de Crescimento Empresarial)',
  'Tinha total coragem de gravar e domínio do conteúdo, mas travava no meio da fala e não concluía.',
  [
    { step: 'Gancho (0-15s)', content: 'Esclarecer de cara: "Eu nunca tive medo ou vergonha de gravar. Meu problema era outro: na hora em que a câmera ligava, eu travava, me embolava na linha de raciocínio, não conseguia concluir o pensamento e desistia da gravação."' },
    { step: 'A Virada (15-35s)', content: 'O curso ensinou técnicas de oratória aplicada à câmera, ritmo de fala, âncoras mentais e como manter a clareza sem gaguejar ou travar no meio do raciocínio.' },
    { step: 'Resultado (35-55s)', content: 'Pela primeira vez conseguiu sentar e finalizar toda a gravação do seu método de crescimento de empresas, de ponta a ponta, com autoridade e fluidez.' },
    { step: 'Fechamento (55-65s)', content: '"Se você tem o conhecimento na cabeça mas na hora de falar para a lente você trava e não consegue terminar, o Do Medo ao Play é a virada de chave exata que você precisa."' }
  ]
);

// Footer
doc.rect(45, doc.page.height - 45, doc.page.width - 90, 1).fill('#CCCCCC');
doc.fillColor(textMuted).fontSize(8).font('Helvetica')
   .text('Do Medo ao Play © 2026 - Guia Interno de Produção de Depoimentos para Landing Page', 45, doc.page.height - 35, { align: 'center', width: doc.page.width - 90 });

doc.end();

writeStream.on('finish', () => {
  console.log('PDF successfully created at:', outputPath);
});
