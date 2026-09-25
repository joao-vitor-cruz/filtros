import { describe, expect, it } from 'vitest';
import { DEFAULT_INTENSITY, filterOptions, parseIntensity, wrapIndex } from './state';
import { PRESETS } from './palette/presets';

describe('filterOptions', () => {
  it('começa com "Original" e inclui todas as paletas', () => {
    const options = filterOptions();
    expect(options[0].id).toBe('original');
    expect(options[0].palette).toBeNull();
    expect(options.slice(1).map((o) => o.id)).toEqual(PRESETS.map((p) => p.id));
  });
});

describe('wrapIndex', () => {
  it('avança e volta com a volta completa', () => {
    expect(wrapIndex(0, 1, 7)).toBe(1);
    expect(wrapIndex(6, 1, 7)).toBe(0);
    expect(wrapIndex(0, -1, 7)).toBe(6);
  });
});

describe('parseIntensity', () => {
  it('lê valores salvos e limita entre 0 e 1', () => {
    expect(parseIntensity('0.4')).toBe(0.4);
    expect(parseIntensity('3')).toBe(1);
    expect(parseIntensity('-1')).toBe(0);
  });

  it('usa o padrão quando não há valor ou ele é inválido', () => {
    expect(parseIntensity(null)).toBe(DEFAULT_INTENSITY);
    expect(parseIntensity('')).toBe(DEFAULT_INTENSITY);
    expect(parseIntensity('abc')).toBe(DEFAULT_INTENSITY);
  });
});
