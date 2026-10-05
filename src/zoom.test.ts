import { describe, expect, it } from 'vitest';
import { clampZoom, DIGITAL_ZOOM, formatZoom, hardwareRange } from './zoom';

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

  it('formata com vírgula', () => {
    expect(formatZoom(1)).toBe('1×');
    expect(formatZoom(2.46)).toBe('2,5×');
    expect(formatZoom(0.5)).toBe('0,5×');
    expect(formatZoom(1.98)).toBe('2×');
  });
});
