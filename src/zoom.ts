export type ZoomRange = { min: number; max: number };

/** Zoom digital (ampliação feita no shader) quando a câmera não oferece zoom próprio. */
export const DIGITAL_ZOOM: ZoomRange = { min: 1, max: 4 };
/** Limite para o zoom da própria câmera (alguns aparelhos anunciam 50×+ só digital). */
const HARDWARE_MAX = 10;

export function hardwareRange(caps: ZoomRange): ZoomRange {
  return { min: caps.min, max: Math.max(caps.min, Math.min(caps.max, HARDWARE_MAX)) };
}

export function clampZoom(zoom: number, range: ZoomRange): number {
  return Math.min(Math.max(zoom, range.min), range.max);
}

/** Níveis do botão de zoom: a grande-angular (se houver), 1×, 2× e um mais longe. */
export function zoomPresets(range: ZoomRange): number[] {
  const presets = new Set<number>();
  if (range.min < 1) presets.add(range.min);
  presets.add(Math.max(1, range.min));
  if (range.max >= 2) presets.add(2);
  if (range.max >= 5) presets.add(5);
  else if (range.max >= 3) presets.add(3);
  return [...presets].filter((z) => z <= range.max).sort((a, b) => a - b);
}

/** Próximo nível acima do zoom atual; depois do último, volta ao primeiro. */
export function nextPreset(current: number, presets: number[]): number {
  return presets.find((z) => z > current + 0.05) ?? presets[0];
}

/** "1×", "2,5×", "0,5×" (vírgula decimal, uma casa só quando precisa). */
export function formatZoom(zoom: number): string {
  const rounded = Math.round(zoom * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
  return `${text}×`;
}
