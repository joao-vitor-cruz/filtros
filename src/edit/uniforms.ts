import { HSL_COLORS, isIdentityCurve, WHEELS, CURVE_CHANNELS, type Adjustments } from './adjustments';

/** Ajustes já no formato dos uniforms do shader (vec4 agrupados para caber em celulares). */
export type PackedAdjustments = {
  light1: [number, number, number, number]; // exposição, brilho, contraste, realces
  light2: [number, number, number, number]; // sombras, brancos, pretos, claridade
  color: [number, number, number, number]; // temperatura, tonalidade, saturação, vibração
  style: [number, number, number, number]; // nitidez, redução de ruído, desbotado, vinheta
  grain: number;
  hsl: Float32Array; // 8 × (matiz, saturação, luminância)
  wheels: Float32Array; // 4 × (deslocamento R, G, B, luminância)
  flags: [number, number, number, number]; // HSL ativo, rodas ativas, curvas ativas, detalhe ativo
};

/** Cor pura (saturação e brilho máximos) de um matiz, de 0 a 1. */
export function hueToRgb(hue: number): [number, number, number] {
  const h = (((hue % 360) + 360) % 360) / 60;
  const x = 1 - Math.abs((h % 2) - 1);
  const table: [number, number, number][] = [
    [1, x, 0],
    [x, 1, 0],
    [0, 1, x],
    [0, x, 1],
    [x, 0, 1],
    [1, 0, x],
  ];
  return table[Math.floor(h) % 6];
}

const LUMA = [0.2126, 0.7152, 0.0722];

/**
 * Deslocamento de cor de uma roda: a cor do matiz menos o próprio brilho dela,
 * para tingir sem clarear nem escurecer (o brilho é o controle de luminância).
 */
export function wheelOffset(hue: number, amount: number): [number, number, number] {
  const rgb = hueToRgb(hue);
  const l = rgb[0] * LUMA[0] + rgb[1] * LUMA[1] + rgb[2] * LUMA[2];
  return [(rgb[0] - l) * amount, (rgb[1] - l) * amount, (rgb[2] - l) * amount];
}

export function packAdjustments(a: Adjustments): PackedAdjustments {
  const hsl = new Float32Array(HSL_COLORS.length * 3);
  HSL_COLORS.forEach((c, i) => hsl.set([a.hsl[c].hue, a.hsl[c].saturation, a.hsl[c].luminance], i * 3));
  const wheels = new Float32Array(WHEELS.length * 4);
  WHEELS.forEach((w, i) => wheels.set([...wheelOffset(a.wheels[w].hue, a.wheels[w].amount), a.wheels[w].luminance], i * 4));

  return {
    light1: [a.exposure, a.brightness, a.contrast, a.highlights],
    light2: [a.shadows, a.whites, a.blacks, a.clarity],
    color: [a.temperature, a.tint, a.saturation, a.vibrance],
    style: [a.sharpen, a.noiseReduction, a.fade, a.vignette],
    grain: a.grain,
    hsl,
    wheels,
    flags: [
      hsl.some((v) => v !== 0) ? 1 : 0,
      wheels.some((v) => v !== 0) ? 1 : 0,
      CURVE_CHANNELS.some((c) => !isIdentityCurve(a.curves[c])) ? 1 : 0,
      a.sharpen !== 0 || a.noiseReduction !== 0 || a.clarity !== 0 ? 1 : 0,
    ],
  };
}
