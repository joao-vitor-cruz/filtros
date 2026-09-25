import type { Palette } from './palette';

const preset = (id: string, name: string, colors: string[]): Palette => ({
  id,
  name,
  colors,
  builtIn: true,
});

// Todas usam o gradient map por enquanto; os modos split tone e posterização
// (sugeridos para Teal & Orange e Pop Art no PLANO.md) chegam na fase 7.
export const PRESETS: readonly Palette[] = [
  preset('synthwave', 'Synthwave', ['#2b0f54', '#ab1f65', '#ff4f69', '#fff7f8']),
  preset('oceano', 'Oceano', ['#03045e', '#0077b6', '#90e0ef']),
  preset('sepia', 'Sépia', ['#2e1f0f', '#a67b4b', '#f5e6c8']),
  preset('teal-orange', 'Teal & Orange', ['#006d77', '#ffb703']),
  preset('noir', 'Noir', ['#000000', '#ffffff']),
  preset('pop-art', 'Pop Art', ['#3a86ff', '#ff006e', '#fb5607', '#ffbe0b']),
];
