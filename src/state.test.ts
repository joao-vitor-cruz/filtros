import { describe, expect, it } from 'vitest';
import { filterOptions, wrapIndex } from './state';
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
