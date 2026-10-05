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
