import { describe, expect, it } from 'vitest';
import { defaultAdjustments, isDefaultAdjustments, normalizeCurve, parseAdjustments } from './adjustments';
import { buildCurveLut, curveFunction } from './curves';
import { hueToRgb, packAdjustments, wheelOffset } from './uniforms';

describe('parseAdjustments', () => {
  it('padrão quando não há nada salvo ou o JSON é inválido', () => {
    expect(parseAdjustments(null)).toEqual(defaultAdjustments());
    expect(parseAdjustments('{')).toEqual(defaultAdjustments());
  });

  it('migra o formato antigo (contraste, saturação, vinheta, grão)', () => {
    const a = parseAdjustments(JSON.stringify({ contrast: 0.5, saturation: -0.2, vignette: 0.3, grain: 0.1 }));
    expect([a.contrast, a.saturation, a.vignette, a.grain]).toEqual([0.5, -0.2, 0.3, 0.1]);
    expect(a.exposure).toBe(0);
  });

  it('limita valores e corrige dados estranhos', () => {
    const a = parseAdjustments(
      JSON.stringify({
        exposure: 5,
        sharpen: -1,
        hsl: { red: { hue: 2, saturation: 'x' } },
        wheels: { shadows: { hue: 400, amount: 3, luminance: -0.5 } },
        curves: { rgb: [[0.5, 2], 'lixo'], r: 'x' },
      }),
    );
    expect(a.exposure).toBe(1);
    expect(a.sharpen).toBe(0);
    expect(a.hsl.red).toEqual({ hue: 1, saturation: 0, luminance: 0 });
    expect(a.wheels.shadows).toEqual({ hue: 40, amount: 1, luminance: -0.5 });
    expect(a.curves.rgb).toEqual([
      [0, 0],
      [0.5, 1],
      [1, 1],
    ]);
    expect(a.curves.r).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  it('volta igual depois de salvar', () => {
    const a = defaultAdjustments();
    a.clarity = 0.4;
    a.hsl.blue.saturation = -0.6;
    a.wheels.highlights = { hue: 45, amount: 0.3, luminance: 0.1 };
    a.curves.g = [
      [0, 0.1],
      [0.5, 0.6],
      [1, 1],
    ];
    expect(parseAdjustments(JSON.stringify(a))).toEqual(a);
  });
});

describe('isDefaultAdjustments', () => {
  it('detecta qualquer mudança, inclusive em HSL, rodas e curvas', () => {
    expect(isDefaultAdjustments(defaultAdjustments())).toBe(true);
    const hsl = defaultAdjustments();
    hsl.hsl.green.luminance = 0.1;
    expect(isDefaultAdjustments(hsl)).toBe(false);
    const curve = defaultAdjustments();
    curve.curves.rgb = [
      [0, 0],
      [0.5, 0.7],
      [1, 1],
    ];
    expect(isDefaultAdjustments(curve)).toBe(false);
  });
});

describe('curvas', () => {
  it('normaliza: ordena, remove x repetido e garante as pontas', () => {
    expect(
      normalizeCurve([
        [0.6, 0.8],
        [0.3, 0.2],
        [0.3, 0.9],
      ]),
    ).toEqual([
      [0, 0],
      [0.3, 0.2],
      [0.6, 0.8],
      [1, 1],
    ]);
  });

  it('a curva identidade não muda nada', () => {
    const f = curveFunction([
      [0, 0],
      [1, 1],
    ]);
    for (const x of [0, 0.25, 0.5, 0.9, 1]) expect(f(x)).toBeCloseTo(x);
  });

  it('passa pelos pontos e é monotônica (sem ondas)', () => {
    const points: [number, number][] = [
      [0, 0],
      [0.25, 0.1],
      [0.5, 0.5],
      [0.75, 0.9],
      [1, 1],
    ];
    const f = curveFunction(points);
    for (const [x, y] of points) expect(f(x)).toBeCloseTo(y);
    let last = -1;
    for (let i = 0; i <= 100; i++) {
      const y = f(i / 100);
      expect(y).toBeGreaterThanOrEqual(last - 1e-9);
      last = y;
    }
  });

  it('tabela aplica a curva geral antes da curva do canal', () => {
    const curves = defaultAdjustments().curves;
    curves.rgb = [
      [0, 0.2],
      [1, 1],
    ]; // levanta os pretos
    curves.b = [
      [0, 0],
      [1, 0.5],
    ]; // azul pela metade
    const lut = buildCurveLut(curves);
    expect(Array.from(lut.slice(0, 4))).toEqual([51, 51, 26, 255]);
    expect(Array.from(lut.slice(255 * 4, 256 * 4))).toEqual([255, 255, 128, 255]);
  });
});

describe('uniforms', () => {
  it('matiz para cor pura', () => {
    expect(hueToRgb(0)).toEqual([1, 0, 0]);
    expect(hueToRgb(120)).toEqual([0, 1, 0]);
    expect(hueToRgb(240)).toEqual([0, 0, 1]);
    expect(hueToRgb(360)).toEqual([1, 0, 0]);
  });

  it('roda de cor tinge sem mudar o brilho', () => {
    const [r, g, b] = wheelOffset(30, 1);
    expect(r).toBeGreaterThan(0);
    expect(b).toBeLessThan(0);
    expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeCloseTo(0);
    for (const v of wheelOffset(200, 0)) expect(v).toBeCloseTo(0);
  });

  it('marca como ativas só as etapas usadas (o shader pula as outras)', () => {
    expect(packAdjustments(defaultAdjustments()).flags).toEqual([0, 0, 0, 0]);
    const a = defaultAdjustments();
    a.hsl.red.hue = 0.2;
    a.clarity = 0.3;
    expect(packAdjustments(a).flags).toEqual([1, 0, 0, 1]);
  });
});
