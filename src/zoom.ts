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

/** "1×", "2,5×", "0,5×" (vírgula decimal, uma casa só quando precisa). */
export function formatZoom(zoom: number): string {
  const rounded = Math.round(zoom * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
  return `${text}×`;
}
