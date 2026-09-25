import { describe, expect, it } from 'vitest';
import { FpsMeter } from './fps';

describe('FpsMeter', () => {
  it('mede 30 fps com frames a cada ~33 ms', () => {
    const meter = new FpsMeter();
    for (let i = 0; i < 30; i++) meter.tick(i * (1000 / 30));
    expect(meter.fps).toBeCloseTo(30);
  });

  it('considera só a janela mais recente', () => {
    const meter = new FpsMeter(10);
    for (let i = 0; i < 10; i++) meter.tick(i * 100); // 10 fps
    for (let i = 1; i <= 10; i++) meter.tick(900 + i * 50); // 20 fps
    expect(meter.fps).toBeCloseTo(20);
  });

  it('é zero sem frames suficientes', () => {
    const meter = new FpsMeter();
    meter.tick(0);
    expect(meter.fps).toBe(0);
  });
});
