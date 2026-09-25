/** Como as cores da paleta são aplicadas à imagem. */
export type FilterMode = 'gradient' | 'splitTone' | 'tint' | 'posterize';

export const FILTER_MODES: readonly { id: FilterMode; label: string; description: string }[] = [
  { id: 'gradient', label: 'Mapa de cores', description: 'O brilho de cada ponto escolhe uma cor da paleta' },
  { id: 'splitTone', label: 'Tons divididos', description: 'Tinge sombras e luzes mantendo as cores da foto' },
  { id: 'tint', label: 'Tinta', description: 'Uma camada da cor do meio da paleta sobre a foto' },
  { id: 'posterize', label: 'Pôster', description: 'Faixas chapadas com as cores exatas da paleta' },
];

/** Índice passado ao shader (uniform float uMode). */
export const MODE_INDEX: Record<FilterMode, number> = { gradient: 0, splitTone: 1, tint: 2, posterize: 3 };

export function isFilterMode(value: unknown): value is FilterMode {
  return typeof value === 'string' && Object.hasOwn(MODE_INDEX, value);
}

/** Ajustes globais aplicados junto com qualquer paleta (não afetam o "Original"). */
export type Adjustments = {
  contrast: number; // -1..1
  saturation: number; // -1..1
  vignette: number; // 0..1
  grain: number; // 0..1
};

export const DEFAULT_ADJUSTMENTS: Readonly<Adjustments> = { contrast: 0, saturation: 0, vignette: 0, grain: 0 };

export const ADJUSTMENT_RANGES: Record<keyof Adjustments, [number, number]> = {
  contrast: [-1, 1],
  saturation: [-1, 1],
  vignette: [0, 1],
  grain: [0, 1],
};

/** Lê ajustes salvos, limitando cada valor à sua faixa e completando o que faltar. */
export function parseAdjustments(raw: string | null): Adjustments {
  const result: Adjustments = { ...DEFAULT_ADJUSTMENTS };
  if (!raw) return result;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return result;
  }
  if (!data || typeof data !== 'object') return result;
  for (const key of Object.keys(ADJUSTMENT_RANGES) as (keyof Adjustments)[]) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const [min, max] = ADJUSTMENT_RANGES[key];
    result[key] = Math.min(Math.max(value, min), max);
  }
  return result;
}

export function isDefaultAdjustments(a: Adjustments): boolean {
  return (Object.keys(DEFAULT_ADJUSTMENTS) as (keyof Adjustments)[]).every((k) => a[k] === DEFAULT_ADJUSTMENTS[k]);
}
