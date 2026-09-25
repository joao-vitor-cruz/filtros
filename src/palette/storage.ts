import { isValidPalette, MAX_COLORS, type Palette } from './palette';

const STORAGE_KEY = 'filtros:paletas';
export const MAX_NAME_LENGTH = 24;

/**
 * Lê as paletas salvas, descartando entradas corrompidas ou de versões antigas
 * em vez de quebrar o app.
 */
export function parseStoredPalettes(raw: string | null): Palette[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const seen = new Set<string>();
  const palettes: Palette[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const { id, name, colors } = item as Record<string, unknown>;
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    if (!Array.isArray(colors) || !colors.every((c) => typeof c === 'string')) continue;
    if (!isValidPalette(colors as string[])) continue;
    seen.add(id);
    palettes.push({
      id,
      name: normalizeName(typeof name === 'string' ? name : '', 'Minha paleta'),
      colors: (colors as string[]).slice(0, MAX_COLORS).map((c) => c.toLowerCase()),
      builtIn: false,
    });
  }
  return palettes;
}

export function serializePalettes(palettes: readonly Palette[]): string {
  return JSON.stringify(palettes.map(({ id, name, colors }) => ({ id, name, colors })));
}

export function normalizeName(name: string, fallback: string): string {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
  return clean || fallback;
}

/** Nome sugerido que ainda não está em uso: "Minha paleta", "Minha paleta 2"… */
export function suggestName(existing: readonly Palette[]): string {
  const names = new Set(existing.map((p) => p.name.toLowerCase()));
  if (!names.has('minha paleta')) return 'Minha paleta';
  for (let i = 2; ; i++) {
    const name = `Minha paleta ${i}`;
    if (!names.has(name.toLowerCase())) return name;
  }
}

export function newPaletteId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadCustomPalettes(): Palette[] {
  try {
    return parseStoredPalettes(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

/** Retorna false se o navegador não permitiu salvar (ex.: modo privado sem espaço). */
export function saveCustomPalettes(palettes: readonly Palette[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, serializePalettes(palettes));
    return true;
  } catch {
    return false;
  }
}
