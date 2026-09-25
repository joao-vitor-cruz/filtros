import type { Palette } from './palette/palette';
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

const STORAGE_KEY = 'filtros:filtro';

/** Lembra o último filtro usado neste navegador (conveniência, pode falhar sem problema). */
export function loadSelectedId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveSelectedId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // modo privado ou armazenamento bloqueado
  }
}
