import type { Adjustments, CurvePoint } from './adjustments';

export const CURVE_LUT_SIZE = 256;

/**
 * Função da curva por interpolação cúbica monotônica (Fritsch–Carlson): passa
 * por todos os pontos e nunca "ondula" acima ou abaixo deles, como as curvas
 * do Lightroom/Edits. `points` precisa estar ordenado por x (normalizeCurve).
 */
export function curveFunction(points: CurvePoint[]): (x: number) => number {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  if (n < 2) return (x) => x;

  const deltas: number[] = [];
  for (let i = 0; i < n - 1; i++) deltas.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));

  const slopes: number[] = new Array(n);
  slopes[0] = deltas[0];
  slopes[n - 1] = deltas[n - 2];
  for (let i = 1; i < n - 1; i++) slopes[i] = deltas[i - 1] * deltas[i] <= 0 ? 0 : (deltas[i - 1] + deltas[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (deltas[i] === 0) {
      slopes[i] = 0;
      slopes[i + 1] = 0;
      continue;
    }
    const a = slopes[i] / deltas[i];
    const b = slopes[i + 1] / deltas[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      slopes[i] = t * a * deltas[i];
      slopes[i + 1] = t * b * deltas[i];
    }
  }

  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    const y =
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * slopes[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * slopes[i + 1];
    return Math.min(Math.max(y, 0), 1);
  };
}

/**
 * Tabela 256×1 enviada à GPU: para cada valor de entrada, a saída de cada canal
 * já com a curva RGB (geral) aplicada antes da curva do próprio canal.
 */
export function buildCurveLut(curves: Adjustments['curves']): Uint8Array {
  const master = curveFunction(curves.rgb);
  const channels = [curveFunction(curves.r), curveFunction(curves.g), curveFunction(curves.b)];
  const lut = new Uint8Array(CURVE_LUT_SIZE * 4);
  for (let i = 0; i < CURVE_LUT_SIZE; i++) {
    const m = master(i / (CURVE_LUT_SIZE - 1));
    for (let c = 0; c < 3; c++) lut[i * 4 + c] = Math.round(channels[c](m) * 255);
    lut[i * 4 + 3] = 255;
  }
  return lut;
}
