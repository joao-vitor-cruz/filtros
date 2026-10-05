import { describe, expect, it } from 'vitest';
import { clampZoom, DIGITAL_ZOOM, formatZoom, hardwareRange, nextPreset, zoomPresets } from './zoom';

describe('zoom', () => {
  it('limita ao intervalo', () => {
    expect(clampZoom(0.3, DIGITAL_ZOOM)).toBe(1);
    expect(clampZoom(9, DIGITAL_ZOOM)).toBe(4);
    expect(clampZoom(2.5, DIGITAL_ZOOM)).toBe(2.5);
  });

  it('limita o zoom da câmera a 10×', () => {
    expect(hardwareRange({ min: 1, max: 100 })).toEqual({ min: 1, max: 10 });
    expect(hardwareRange({ min: 0.5, max: 8 })).toEqual({ min: 0.5, max: 8 });
  });

  it('monta os níveis do botão conforme a câmera', () => {
    expect(zoomPresets(DIGITAL_ZOOM)).toEqual([1, 2, 3]);
    expect(zoomPresets({ min: 0.5, max: 10 })).toEqual([0.5, 1, 2, 5]);
    expect(zoomPresets({ min: 1, max: 1.8 })).toEqual([1]);
  });

  it('avança para o próximo nível e volta ao início', () => {
    const presets = [1, 2, 3];
    expect(nextPreset(1, presets)).toBe(2);
    expect(nextPreset(2.4, presets)).toBe(3);
    expect(nextPreset(3, presets)).toBe(1);
    expect(nextPreset(3.8, presets)).toBe(1);
  });

  it('formata com vírgula', () => {
    expect(formatZoom(1)).toBe('1×');
    expect(formatZoom(2.46)).toBe('2,5×');
    expect(formatZoom(0.5)).toBe('0,5×');
    expect(formatZoom(1.98)).toBe('2×');
  });
});
