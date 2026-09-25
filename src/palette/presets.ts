import type { FilterMode } from '../filter';
import type { Palette } from './palette';

const preset = (id: string, name: string, colors: string[], mode: FilterMode = 'gradient'): Palette => ({
  id,
  name,
  colors,
  mode,
  builtIn: true,
});

export const PRESETS: readonly Palette[] = [
  preset('synthwave', 'Synthwave', ['#2b0f54', '#ab1f65', '#ff4f69', '#fff7f8']),
  preset('oceano', 'Oceano', ['#03045e', '#0077b6', '#90e0ef']),
  preset('sepia', 'Sépia', ['#2e1f0f', '#a67b4b', '#f5e6c8']),
  preset('teal-orange', 'Teal & Orange', ['#006d77', '#ffb703'], 'splitTone'),
  preset('noir', 'Noir', ['#000000', '#ffffff']),
  preset('pop-art', 'Pop Art', ['#3a86ff', '#ff006e', '#fb5607', '#ffbe0b'], 'posterize'),
  preset('rose', 'Rosé', ['#5c2a3d', '#ff8fab', '#ffe5ec'], 'tint'),
];
