import { describe, expect, it } from 'vitest';
import { DEFAULT_ADJUSTMENTS, isDefaultAdjustments, isFilterMode, parseAdjustments } from './filter';

describe('isFilterMode', () => {
  it('aceita só os quatro modos', () => {
    expect(isFilterMode('gradient')).toBe(true);
    expect(isFilterMode('posterize')).toBe(true);
    expect(isFilterMode('sepia')).toBe(false);
    expect(isFilterMode(undefined)).toBe(false);
    expect(isFilterMode('toString')).toBe(false);
  });
});

describe('parseAdjustments', () => {
  it('usa o padrão sem dados ou com JSON inválido', () => {
    expect(parseAdjustments(null)).toEqual(DEFAULT_ADJUSTMENTS);
    expect(parseAdjustments('{')).toEqual(DEFAULT_ADJUSTMENTS);
  });

  it('limita cada valor à sua faixa e ignora campos inválidos', () => {
    expect(parseAdjustments(JSON.stringify({ contrast: 2, saturation: -0.5, vignette: -1, grain: 'x' }))).toEqual({
      contrast: 1,
      saturation: -0.5,
      vignette: 0,
      grain: 0,
    });
  });
});

describe('isDefaultAdjustments', () => {
  it('detecta quando tudo está no padrão', () => {
    expect(isDefaultAdjustments({ ...DEFAULT_ADJUSTMENTS })).toBe(true);
    expect(isDefaultAdjustments({ ...DEFAULT_ADJUSTMENTS, grain: 0.2 })).toBe(false);
  });
});
