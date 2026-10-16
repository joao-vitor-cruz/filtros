import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTapClassifier, DOUBLE_TAP_MS } from './double-tap';

describe('createTapClassifier', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const single = vi.fn();
    const double = vi.fn();
    return { single, double, taps: createTapClassifier({ single, double }) };
  };

  it('toque simples dispara só depois da janela do toque duplo', () => {
    const { single, double, taps } = setup();
    taps.tap();
    vi.advanceTimersByTime(DOUBLE_TAP_MS - 1);
    expect(single).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(single).toHaveBeenCalledTimes(1);
    expect(double).not.toHaveBeenCalled();
  });

  it('dois toques dentro da janela viram um toque duplo, sem o simples', () => {
    const { single, double, taps } = setup();
    taps.tap();
    vi.advanceTimersByTime(DOUBLE_TAP_MS / 2);
    taps.tap();
    vi.advanceTimersByTime(DOUBLE_TAP_MS * 2);
    expect(double).toHaveBeenCalledTimes(1);
    expect(single).not.toHaveBeenCalled();
  });

  it('dois toques espaçados são dois toques simples', () => {
    const { single, double, taps } = setup();
    taps.tap();
    vi.advanceTimersByTime(DOUBLE_TAP_MS + 10);
    taps.tap();
    vi.advanceTimersByTime(DOUBLE_TAP_MS + 10);
    expect(single).toHaveBeenCalledTimes(2);
    expect(double).not.toHaveBeenCalled();
  });

  it('imediato dispara na hora e cancela um toque pendente', () => {
    const { single, double, taps } = setup();
    taps.tap();
    taps.tap(true);
    expect(single).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(DOUBLE_TAP_MS * 2);
    expect(single).toHaveBeenCalledTimes(1);
    expect(double).not.toHaveBeenCalled();
  });
});
