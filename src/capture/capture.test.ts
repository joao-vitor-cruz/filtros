import { describe, expect, it } from 'vitest';
import { fitWithin, flipRows, photoFileName } from './image';
import { isIOS } from './save';

describe('flipRows', () => {
  it('inverte a ordem das linhas mantendo cada pixel', () => {
    // 1×3: linhas com vermelho, verde e azul (de baixo para cima, como o WebGL lê)
    const pixels = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255];
    expect(Array.from(flipRows(pixels, 1, 3))).toEqual([0, 0, 255, 255, 0, 255, 0, 255, 255, 0, 0, 255]);
  });

  it('mantém a ordem dos pixels dentro da linha', () => {
    const pixels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    expect(Array.from(flipRows(pixels, 2, 2))).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('photoFileName', () => {
  it('usa data e hora locais', () => {
    expect(photoFileName(new Date(2026, 8, 5, 7, 3, 9))).toBe('filtros-20260905-070309.jpg');
  });
});

describe('isIOS', () => {
  const nav = (userAgent: string, maxTouchPoints = 0) => ({ userAgent, maxTouchPoints });

  it('reconhece iPhone e iPad', () => {
    expect(isIOS(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5))).toBe(true);
    expect(isIOS(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5))).toBe(true); // iPad
  });

  it('não confunde Mac e Android', () => {
    expect(isIOS(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0))).toBe(false);
    expect(isIOS(nav('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5))).toBe(false);
  });
});

describe('fitWithin', () => {
  it('reduz fotos grandes mantendo a proporção', () => {
    expect(fitWithin(8000, 6000, 4096)).toEqual([4096, 3072]);
    expect(fitWithin(3000, 9000, 4096)).toEqual([1365, 4096]);
  });

  it('não amplia fotos pequenas', () => {
    expect(fitWithin(1200, 800, 4096)).toEqual([1200, 800]);
  });
});
