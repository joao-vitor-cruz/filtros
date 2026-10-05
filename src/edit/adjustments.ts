/**
 * Ajustes de edição no estilo do Instagram Edits.
 *
 * Ordem no shader (e por que importa neste app, que tem uma paleta no meio):
 * 1. Detalhe e luz — ANTES da paleta: decidem qual cor da paleta cada ponto recebe.
 * 2. Paleta (mapa de cores, tons divididos, tinta ou pôster) com a intensidade.
 * 3. Cor (balanço de branco, saturação, HSL, rodas, curvas) — DEPOIS da paleta:
 *    corrigem as cores finais, inclusive as da própria paleta.
 * 4. Estilo (desbotado, vinheta, grão) — por cima de tudo.
 */

export const HSL_COLORS = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'] as const;
export type HslColor = (typeof HSL_COLORS)[number];
export type HslValues = { hue: number; saturation: number; luminance: number }; // -1..1

export const WHEELS = ['global', 'shadows', 'midtones', 'highlights'] as const;
export type Wheel = (typeof WHEELS)[number];
export type WheelValues = { hue: number; amount: number; luminance: number }; // 0..360, 0..1, -1..1

export const CURVE_CHANNELS = ['rgb', 'r', 'g', 'b'] as const;
export type CurveChannel = (typeof CURVE_CHANNELS)[number];
/** Ponto da curva: [entrada, saída], ambos de 0 a 1. */
export type CurvePoint = [number, number];

export type Adjustments = {
  // Luz (antes da paleta)
  exposure: number;
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  clarity: number;
  // Cor (depois da paleta)
  temperature: number;
  tint: number;
  saturation: number;
  vibrance: number;
  hsl: Record<HslColor, HslValues>;
  wheels: Record<Wheel, WheelValues>;
  curves: Record<CurveChannel, CurvePoint[]>;
  // Estilo
  sharpen: number;
  noiseReduction: number;
  fade: number;
  vignette: number;
  grain: number;
};

export type SliderKey = {
  [K in keyof Adjustments]: Adjustments[K] extends number ? K : never;
}[keyof Adjustments];

export type SliderGroup = 'light' | 'color' | 'style';

export type SliderDef = { key: SliderKey; label: string; group: SliderGroup; min: number; max: number };

/** Controles deslizantes simples, na ordem em que aparecem em cada aba. */
export const SLIDERS: readonly SliderDef[] = [
  { key: 'exposure', label: 'Exposição', group: 'light', min: -1, max: 1 },
  { key: 'brightness', label: 'Brilho', group: 'light', min: -1, max: 1 },
  { key: 'contrast', label: 'Contraste', group: 'light', min: -1, max: 1 },
  { key: 'highlights', label: 'Realces', group: 'light', min: -1, max: 1 },
  { key: 'shadows', label: 'Sombras', group: 'light', min: -1, max: 1 },
  { key: 'whites', label: 'Brancos', group: 'light', min: -1, max: 1 },
  { key: 'blacks', label: 'Pretos', group: 'light', min: -1, max: 1 },
  { key: 'clarity', label: 'Claridade', group: 'light', min: -1, max: 1 },
  { key: 'temperature', label: 'Temperatura', group: 'color', min: -1, max: 1 },
  { key: 'tint', label: 'Tonalidade', group: 'color', min: -1, max: 1 },
  { key: 'saturation', label: 'Saturação', group: 'color', min: -1, max: 1 },
  { key: 'vibrance', label: 'Vibração', group: 'color', min: -1, max: 1 },
  { key: 'sharpen', label: 'Nitidez', group: 'style', min: 0, max: 1 },
  { key: 'noiseReduction', label: 'Redução de ruído', group: 'style', min: 0, max: 1 },
  { key: 'fade', label: 'Desbotado', group: 'style', min: 0, max: 1 },
  { key: 'vignette', label: 'Vinheta', group: 'style', min: 0, max: 1 },
  { key: 'grain', label: 'Grão', group: 'style', min: 0, max: 1 },
];

export const HSL_LABELS: Record<HslColor, string> = {
  red: 'Vermelho',
  orange: 'Laranja',
  yellow: 'Amarelo',
  green: 'Verde',
  aqua: 'Ciano',
  blue: 'Azul',
  purple: 'Roxo',
  magenta: 'Magenta',
};

/** Matiz central de cada cor do HSL, em graus. */
export const HSL_HUES: Record<HslColor, number> = {
  red: 0,
  orange: 30,
  yellow: 60,
  green: 120,
  aqua: 180,
  blue: 225,
  purple: 270,
  magenta: 315,
};

export const WHEEL_LABELS: Record<Wheel, string> = {
  global: 'Global',
  shadows: 'Sombras',
  midtones: 'Meios-tons',
  highlights: 'Realces',
};

export const CURVE_LABELS: Record<CurveChannel, string> = { rgb: 'RGB', r: 'Vermelho', g: 'Verde', b: 'Azul' };

const identityCurve = (): CurvePoint[] => [
  [0, 0],
  [1, 1],
];

export function defaultAdjustments(): Adjustments {
  const sliders = Object.fromEntries(SLIDERS.map((s) => [s.key, 0])) as Record<SliderKey, number>;
  return {
    ...sliders,
    hsl: Object.fromEntries(HSL_COLORS.map((c) => [c, { hue: 0, saturation: 0, luminance: 0 }])) as Adjustments['hsl'],
    wheels: Object.fromEntries(WHEELS.map((w) => [w, { hue: 0, amount: 0, luminance: 0 }])) as Adjustments['wheels'],
    curves: Object.fromEntries(CURVE_CHANNELS.map((c) => [c, identityCurve()])) as Adjustments['curves'],
  };
}

export function cloneAdjustments(a: Adjustments): Adjustments {
  return structuredClone(a);
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const num = (v: unknown, min: number, max: number, fallback = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? clamp(v, min, max) : fallback;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** Curva válida: pontos ordenados por x, sem x repetido, sempre com as pontas 0 e 1. */
export function normalizeCurve(points: unknown): CurvePoint[] {
  if (!Array.isArray(points)) return identityCurve();
  const valid = points
    .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === 'number' && Number.isFinite(v)))
    .map(([x, y]) => [clamp(x, 0, 1), clamp(y, 0, 1)] as CurvePoint)
    .sort((a, b) => a[0] - b[0]);
  const unique: CurvePoint[] = [];
  for (const p of valid) if (!unique.length || p[0] - unique[unique.length - 1][0] > 1e-3) unique.push(p);
  // As pontas sempre existem (em x = 0 e x = 1), para a curva cobrir a faixa inteira.
  if (!unique.length || unique[0][0] > 0) unique.unshift([0, 0]);
  if (unique[unique.length - 1][0] < 1) unique.push([1, 1]);
  return unique;
}

/**
 * Lê ajustes salvos, limitando cada valor e completando o que faltar.
 * Aceita o formato antigo (só contraste, saturação, vinheta e grão).
 */
export function parseAdjustments(raw: string | null): Adjustments {
  const result = defaultAdjustments();
  if (!raw) return result;
  let data: Record<string, unknown>;
  try {
    data = obj(JSON.parse(raw));
  } catch {
    return result;
  }
  for (const s of SLIDERS) result[s.key] = num(data[s.key], s.min, s.max);
  const hsl = obj(data.hsl);
  for (const c of HSL_COLORS) {
    const v = obj(hsl[c]);
    result.hsl[c] = { hue: num(v.hue, -1, 1), saturation: num(v.saturation, -1, 1), luminance: num(v.luminance, -1, 1) };
  }
  const wheels = obj(data.wheels);
  for (const w of WHEELS) {
    const v = obj(wheels[w]);
    result.wheels[w] = {
      hue: ((num(v.hue, -1e6, 1e6) % 360) + 360) % 360,
      amount: num(v.amount, 0, 1),
      luminance: num(v.luminance, -1, 1),
    };
  }
  const curves = obj(data.curves);
  for (const c of CURVE_CHANNELS) result.curves[c] = normalizeCurve(curves[c]);
  return result;
}

export function isIdentityCurve(points: CurvePoint[]): boolean {
  return points.every(([x, y]) => Math.abs(x - y) < 1e-3);
}

export function isDefaultAdjustments(a: Adjustments): boolean {
  return (
    SLIDERS.every((s) => a[s.key] === 0) &&
    HSL_COLORS.every((c) => a.hsl[c].hue === 0 && a.hsl[c].saturation === 0 && a.hsl[c].luminance === 0) &&
    WHEELS.every((w) => a.wheels[w].amount === 0 && a.wheels[w].luminance === 0) &&
    CURVE_CHANNELS.every((c) => isIdentityCurve(a.curves[c]))
  );
}
