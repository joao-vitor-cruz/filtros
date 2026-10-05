import { describe, expect, it } from 'vitest';
import { isFilterMode } from './filter';

describe('isFilterMode', () => {
  it('aceita só os quatro modos', () => {
    expect(isFilterMode('gradient')).toBe(true);
    expect(isFilterMode('posterize')).toBe(true);
    expect(isFilterMode('sepia')).toBe(false);
    expect(isFilterMode(undefined)).toBe(false);
    expect(isFilterMode('toString')).toBe(false);
  });
});
