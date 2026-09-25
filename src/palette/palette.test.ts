import { describe, expect, it } from 'vitest';
import { buildGradient, cssGradient, isValidPalette, parseHex } from './palette';
import { PRESETS } from './presets';

const pixel = (data: Uint8Array, i: number) => Array.from(data.slice(i * 4, i * 4 + 4));

describe('parseHex', () => {
  it('lê #rrggbb e #rgb, com ou sem #', () => {
    expect(parseHex('#ff4f69')).toEqual([255, 79, 105]);
    expect(parseHex('0077B6')).toEqual([0, 119, 182]);
    expect(parseHex('#fa0')).toEqual([255, 170, 0]);
  });

  it('rejeita valores inválidos', () => {
    expect(() => parseHex('#12')).toThrow();
    expect(() => parseHex('vermelho')).toThrow();
  });
});

describe('isValidPalette', () => {
  it('aceita de 2 a 5 cores válidas', () => {
    expect(isValidPalette(['#000', '#fff'])).toBe(true);
    expect(isValidPalette(['#000', '#111', '#222', '#333', '#444'])).toBe(true);
  });

  it('rejeita poucas, muitas ou cores inválidas', () => {
    expect(isValidPalette(['#000'])).toBe(false);
    expect(isValidPalette(['#000', '#111', '#222', '#333', '#444', '#555'])).toBe(false);
    expect(isValidPalette(['#000', 'xyz'])).toBe(false);
  });
});

describe('buildGradient', () => {
  it('começa na primeira cor e termina na última', () => {
    const g = buildGradient(['#000000', '#ff8000']);
    expect(g.length).toBe(256 * 4);
    expect(pixel(g, 0)).toEqual([0, 0, 0, 255]);
    expect(pixel(g, 255)).toEqual([255, 128, 0, 255]);
  });

  it('interpola linearmente entre as cores', () => {
    const g = buildGradient(['#000000', '#ffffff'], 5);
    expect([0, 1, 2, 3, 4].map((i) => g[i * 4])).toEqual([0, 64, 128, 191, 255]);
  });

  it('passa exatamente pela cor do meio de uma paleta de 3 cores', () => {
    const g = buildGradient(['#000000', '#ff0000', '#ffffff'], 5);
    expect(pixel(g, 2)).toEqual([255, 0, 0, 255]);
  });

  it('funciona com uma única cor', () => {
    const g = buildGradient(['#123456'], 4);
    expect(pixel(g, 3)).toEqual([0x12, 0x34, 0x56, 255]);
  });
});

describe('cssGradient', () => {
  it('monta o linear-gradient', () => {
    expect(cssGradient(['#000', '#fff'])).toBe('linear-gradient(to right, #000, #fff)');
  });
});

describe('PRESETS', () => {
  it('têm ids únicos e paletas válidas', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    for (const p of PRESETS) expect(isValidPalette(p.colors), p.name).toBe(true);
  });
});
