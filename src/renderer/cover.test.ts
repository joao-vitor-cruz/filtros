import { describe, expect, it } from 'vitest';
import { canvasSize, containRect, coverScale } from './cover';

describe('coverScale', () => {
  it('não corta quando as proporções são iguais', () => {
    expect(coverScale(1280, 720, 1920, 1080)).toEqual([1, 1]);
  });

  it('corta as laterais de um vídeo paisagem numa tela retrato', () => {
    const [sx, sy] = coverScale(1280, 720, 390, 844);
    expect(sy).toBe(1);
    // Só a fração (390/844) / (1280/720) da largura do vídeo aparece.
    expect(sx).toBeCloseTo(390 / 844 / (1280 / 720));
  });

  it('corta em cima e embaixo de um vídeo retrato numa tela paisagem', () => {
    const [sx, sy] = coverScale(720, 1280, 844, 390);
    expect(sx).toBe(1);
    expect(sy).toBeCloseTo(720 / 1280 / (844 / 390));
  });

  it('nunca amplia além do vídeo (escalas ≤ 1)', () => {
    for (const [vw, vh, tw, th] of [
      [640, 480, 100, 1000],
      [640, 480, 1000, 100],
      [1080, 1920, 390, 844],
    ]) {
      const [sx, sy] = coverScale(vw, vh, tw, th);
      expect(sx).toBeLessThanOrEqual(1);
      expect(sy).toBeLessThanOrEqual(1);
      expect(Math.max(sx, sy)).toBe(1);
    }
  });

  it('devolve escala neutra enquanto o vídeo ainda não tem tamanho', () => {
    expect(coverScale(0, 0, 390, 844)).toEqual([1, 1]);
  });
});

describe('canvasSize', () => {
  it('multiplica pela densidade de pixels', () => {
    expect(canvasSize(390, 844, 2)).toEqual([780, 1688]);
  });

  it('limita a densidade a 2 para poupar a GPU', () => {
    expect(canvasSize(390, 844, 3)).toEqual([780, 1688]);
  });

  it('nunca devolve tamanho zero', () => {
    expect(canvasSize(0, 0, 1)).toEqual([1, 1]);
  });
});

describe('containRect', () => {
  it('foto em pé numa tela em pé mais alta: faixas em cima e embaixo', () => {
    // 3:4 numa tela 390×844
    expect(containRect(3000, 4000, 390, 844)).toEqual({ x: 0, y: 162, width: 390, height: 520 });
  });

  it('foto deitada numa tela em pé: faixas maiores em cima e embaixo', () => {
    expect(containRect(4000, 3000, 390, 844)).toEqual({ x: 0, y: 275, width: 390, height: 293 });
  });

  it('foto estreita numa tela larga: faixas nas laterais', () => {
    expect(containRect(1000, 2000, 1000, 500)).toEqual({ x: 375, y: 0, width: 250, height: 500 });
  });

  it('mesma proporção ocupa tudo', () => {
    expect(containRect(1920, 1080, 960, 540)).toEqual({ x: 0, y: 0, width: 960, height: 540 });
  });
});
