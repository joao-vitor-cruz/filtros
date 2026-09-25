export type RGB = [number, number, number];

export type Palette = {
  id: string;
  name: string;
  /** 2 a 5 cores hex, da sombra para a luz. */
  colors: string[];
  builtIn: boolean;
};

export const MIN_COLORS = 2;
export const MAX_COLORS = 5;

/** Largura da textura de gradiente enviada à GPU (256 tons de luminância). */
export const GRADIENT_SIZE = 256;

/** Converte "#rgb" ou "#rrggbb" em [r, g, b] de 0 a 255. */
export function parseHex(hex: string): RGB {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Cor inválida: ${hex}`);
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function isValidPalette(colors: string[]): boolean {
  if (colors.length < MIN_COLORS || colors.length > MAX_COLORS) return false;
  try {
    colors.forEach(parseHex);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gera os pixels RGBA de um gradiente horizontal com as cores distribuídas
 * igualmente: a primeira em 0 (sombras) e a última em 1 (luzes).
 */
export function buildGradient(colors: string[], size = GRADIENT_SIZE): Uint8Array {
  if (colors.length === 0) throw new Error('Paleta vazia');
  const stops = colors.map(parseHex);
  const pixels = new Uint8Array(size * 4);
  const segments = Math.max(stops.length - 1, 1);

  for (let i = 0; i < size; i++) {
    const t = size === 1 ? 0 : i / (size - 1);
    const pos = t * segments;
    const seg = Math.min(Math.floor(pos), segments - 1);
    const local = pos - seg;
    const a = stops[seg];
    const b = stops[Math.min(seg + 1, stops.length - 1)];
    for (let c = 0; c < 3; c++) {
      pixels[i * 4 + c] = Math.round(a[c] + (b[c] - a[c]) * local);
    }
    pixels[i * 4 + 3] = 255;
  }
  return pixels;
}

/** CSS do gradiente, para mostrar a paleta na interface. */
export function cssGradient(colors: string[], direction = 'to right'): string {
  return `linear-gradient(${direction}, ${colors.join(', ')})`;
}

export function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

/** Normaliza para "#rrggbb" minúsculo (formato exigido pelo <input type="color">). */
export function normalizeHex(hex: string): string {
  return toHex(parseHex(hex));
}

/** Cor no meio do caminho entre duas cores. */
export function mixHex(a: string, b: string, t = 0.5): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return toHex([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * t) as RGB);
}
