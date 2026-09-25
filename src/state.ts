import type { Palette } from './palette/palette';
import { parseAdjustments, type Adjustments } from './filter';
import { PRESETS } from './palette/presets';

/** "Original" (sem filtro) seguido das paletas disponíveis. */
export type FilterOption = { id: 'original'; name: string; palette: null } | { id: string; name: string; palette: Palette };

export const ORIGINAL: FilterOption = { id: 'original', name: 'Original', palette: null };

export function filterOptions(palettes: readonly Palette[] = PRESETS): FilterOption[] {
  return [ORIGINAL, ...palettes.map((palette) => ({ id: palette.id, name: palette.name, palette }))];
}

/** Índice vizinho com volta ao início/fim. */
export function wrapIndex(index: number, delta: number, length: number): number {
  return (((index + delta) % length) + length) % length;
}

// Preferências lembradas neste navegador. São só conveniência: se o
// armazenamento estiver bloqueado (ex.: modo privado), o app segue sem elas.
const FILTER_KEY = 'filtros:filtro';
const INTENSITY_KEY = 'filtros:intensidade';
const ADJUSTMENTS_KEY = 'filtros:ajustes';
const MIRROR_KEY = 'filtros:espelhar-fotos';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // modo privado ou armazenamento bloqueado
  }
}

export const loadSelectedId = (): string | null => read(FILTER_KEY);
export const saveSelectedId = (id: string): void => write(FILTER_KEY, id);

export const DEFAULT_INTENSITY = 1;

/** Converte o valor salvo em intensidade de 0 a 1; usa o padrão se inválido. */
export function parseIntensity(raw: string | null): number {
  if (raw === null || raw.trim() === '') return DEFAULT_INTENSITY;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : DEFAULT_INTENSITY;
}

export const loadIntensity = (): number => parseIntensity(read(INTENSITY_KEY));
export const saveIntensity = (value: number): void => write(INTENSITY_KEY, String(value));

export const loadAdjustments = (): Adjustments => parseAdjustments(read(ADJUSTMENTS_KEY));
export const saveAdjustments = (value: Adjustments): void => write(ADJUSTMENTS_KEY, JSON.stringify(value));

/** Fotos da câmera frontal saem espelhadas como no preview, a não ser que o usuário desligue. */
export const loadMirrorPhotos = (): boolean => read(MIRROR_KEY) !== 'false';
export const saveMirrorPhotos = (value: boolean): void => write(MIRROR_KEY, String(value));
