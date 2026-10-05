import type { SliderKey } from './adjustments';

/** Texto do botão "?": o que o ajuste faz na foto e como ele age junto com a paleta deste app. */
export type HelpEntry = { title: string; what: string; inApp: string };

export type HelpKey =
  | SliderKey
  | 'hsl'
  | 'hslHue'
  | 'hslSaturation'
  | 'hslLuminance'
  | 'wheels'
  | 'wheelLuminance'
  | 'curves';

const BEFORE = 'Age antes da paleta:';
const AFTER = 'Age depois da paleta:';

export const HELP: Record<HelpKey, HelpEntry> = {
  exposure: {
    title: 'Exposição',
    what: 'Clareia ou escurece a foto inteira por igual, como abrir ou fechar o diafragma da câmera. Exagerar estoura as partes claras (viram branco puro) ou apaga as escuras.',
    inApp: `${BEFORE} empurra a imagem toda para as cores claras ou escuras da paleta. No mapa de cores, mais exposição = mais pontos com a última cor da paleta.`,
  },
  brightness: {
    title: 'Brilho',
    what: 'Clareia ou escurece principalmente os meios-tons, preservando os pretos e os brancos. É mais suave que a exposição e não estoura as pontas.',
    inApp: `${BEFORE} desloca os meios-tons para as cores do meio ou das pontas da paleta, sem mudar onde ficam as cores extremas.`,
  },
  contrast: {
    title: 'Contraste',
    what: 'Aumenta ou diminui a diferença entre claros e escuros. Mais contraste deixa a imagem mais "forte"; menos deixa mais lavada e suave.',
    inApp: `${BEFORE} com mais contraste, a foto usa a paleta inteira (das primeiras às últimas cores); com menos, fica concentrada nas cores do meio.`,
  },
  highlights: {
    title: 'Realces',
    what: 'Mexe só nas partes claras (céu, luzes, pele iluminada). Diminuir recupera detalhes que estavam quase brancos; aumentar deixa as luzes mais brilhantes.',
    inApp: `${BEFORE} decide quanto das áreas claras vai para as últimas cores da paleta.`,
  },
  shadows: {
    title: 'Sombras',
    what: 'Mexe só nas partes escuras. Aumentar revela detalhes nas sombras; diminuir deixa as sombras mais profundas e dramáticas.',
    inApp: `${BEFORE} decide quanto das áreas escuras fica nas primeiras cores da paleta.`,
  },
  whites: {
    title: 'Brancos',
    what: 'Define o ponto mais claro da foto. Aumentar faz mais áreas chegarem ao branco total (imagem mais luminosa); diminuir evita que algo fique branco puro.',
    inApp: `${BEFORE} aumenta ou reduz a área pintada com a última cor da paleta (a das luzes).`,
  },
  blacks: {
    title: 'Pretos',
    what: 'Define o ponto mais escuro. Diminuir deixa mais áreas no preto total (imagem mais densa); aumentar levanta os pretos para um cinza.',
    inApp: `${BEFORE} aumenta ou reduz a área pintada com a primeira cor da paleta (a das sombras).`,
  },
  clarity: {
    title: 'Claridade',
    what: 'Contraste local nos meios-tons: realça texturas e contornos (pele, roupas, nuvens) sem mudar muito o claro e o escuro geral. Negativa suaviza, como um efeito de sonho.',
    inApp: `${BEFORE} detalhes pequenos passam a variar entre cores vizinhas da paleta, deixando a textura mais visível no filtro. Usa mais processamento: se a câmera ficar lenta, diminua.`,
  },
  temperature: {
    title: 'Temperatura',
    what: 'Deixa a foto mais quente (amarelada/alaranjada) ou mais fria (azulada). Serve para corrigir a cor da luz ou criar clima.',
    inApp: `${AFTER} também aquece ou esfria as cores da própria paleta. Ótimo para ajustar uma paleta sem editá-la.`,
  },
  tint: {
    title: 'Tonalidade',
    what: 'Corrige ou cria um tom esverdeado (negativo) ou rosado/magenta (positivo). Complementa a temperatura, comum em luz fluorescente.',
    inApp: `${AFTER} puxa todas as cores finais, inclusive as da paleta, para o verde ou para o magenta.`,
  },
  saturation: {
    title: 'Saturação',
    what: 'Deixa todas as cores mais intensas ou mais apagadas, até o preto e branco em -100.',
    inApp: `${AFTER} deixa as cores da paleta mais vivas ou mais apagadas. Em -100 o resultado vira tons de cinza, mesmo com paleta colorida.`,
  },
  vibrance: {
    title: 'Vibração',
    what: 'Como a saturação, mas inteligente: realça mais as cores fracas e mexe pouco nas que já são intensas. Evita peles alaranjadas e cores "estouradas".',
    inApp: `${AFTER} dá vida às partes menos coloridas do resultado sem exagerar as cores mais fortes da paleta.`,
  },
  hsl: {
    title: 'HSL (cor por cor)',
    what: 'Ajusta uma faixa de cor por vez (vermelhos, azuis, verdes…) sem mexer nas outras. Escolha a cor e mude o matiz, a saturação ou a luminância só dela.',
    inApp: `${AFTER} age sobre as cores finais. Com uma paleta, "Azul" mexe nas partes da foto que ficaram azuis por causa da paleta.`,
  },
  hslHue: {
    title: 'Matiz (HSL)',
    what: 'Gira a cor escolhida para as vizinhas: por exemplo, deixa o verde mais amarelado ou mais azulado.',
    inApp: `${AFTER} muda o tom das cores finais daquela faixa, inclusive as que vieram da paleta.`,
  },
  hslSaturation: {
    title: 'Saturação (HSL)',
    what: 'Deixa só a cor escolhida mais intensa ou mais apagada. Ex.: tirar a saturação dos verdes e manter o resto.',
    inApp: `${AFTER} realça ou apaga só uma das cores do resultado.`,
  },
  hslLuminance: {
    title: 'Luminância (HSL)',
    what: 'Clareia ou escurece só a cor escolhida. Ex.: escurecer o azul do céu para destacar as nuvens.',
    inApp: `${AFTER} clareia ou escurece só uma das cores do resultado.`,
  },
  wheels: {
    title: 'Rodas de cor',
    what: 'Tingem a foto com uma cor, separadamente nas sombras, nos meios-tons e nos realces (ou em tudo, na Global). É a técnica de "color grading" do cinema: ex. sombras azuladas e luzes alaranjadas. Arraste o ponto: o ângulo escolhe a cor e a distância do centro, a força.',
    inApp: `${AFTER} tinge o resultado final. Combina bem com o Original para criar um visual sem paleta, ou para ajustar o clima de uma paleta.`,
  },
  wheelLuminance: {
    title: 'Luminância da roda',
    what: 'Clareia ou escurece só a faixa da roda escolhida (sombras, meios-tons, realces ou tudo).',
    inApp: `${AFTER} muda o claro e o escuro do resultado final, só naquela faixa.`,
  },
  curves: {
    title: 'Curvas',
    what: 'O controle mais preciso de luz e cor. O eixo de baixo é o brilho original (escuro à esquerda, claro à direita) e o vertical é o resultado. Subir um ponto clareia aquela faixa; descer escurece. Um "S" suave aumenta o contraste. Nos canais Vermelho, Verde e Azul, a curva muda a cor daquela faixa de brilho.',
    inApp: `${AFTER} age sobre o resultado final, inclusive as cores da paleta. Toque na área para criar um ponto, arraste para mover e toque duas vezes para apagar.`,
  },
  sharpen: {
    title: 'Nitidez',
    what: 'Realça bordas e detalhes finos para a foto parecer mais definida. Em excesso cria contornos e acentua o ruído.',
    inApp: 'Age no começo, sobre a imagem da câmera: os detalhes ficam mais marcados antes de receberem as cores da paleta. Usa mais processamento.',
  },
  noiseReduction: {
    title: 'Redução de ruído',
    what: 'Suaviza os "chuviscos" que aparecem em fotos com pouca luz. Em excesso deixa a imagem com aspecto de pintura.',
    inApp: 'Age no começo, sobre a imagem da câmera: evita que o ruído vire pontinhos coloridos ao passar pela paleta (bem visível no modo Pôster). Usa mais processamento.',
  },
  fade: {
    title: 'Desbotado',
    what: 'Levanta os pretos e tira um pouco do contraste, com aspecto de foto antiga ou filme.',
    inApp: 'Age por cima de tudo, depois da paleta: as sombras mais escuras da paleta ficam acinzentadas.',
  },
  vignette: {
    title: 'Vinheta',
    what: 'Escurece as bordas e os cantos, levando o olhar para o centro.',
    inApp: 'Age por cima de tudo, depois da paleta: escurece as bordas do resultado final.',
  },
  grain: {
    title: 'Grão',
    what: 'Adiciona uma textura granulada, como filme fotográfico.',
    inApp: 'Age por cima de tudo, depois da paleta. No vídeo, o grão se mexe a cada quadro, como em filme.',
  },
};
