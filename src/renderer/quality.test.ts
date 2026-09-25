import { describe, expect, it } from 'vitest';
import { QualityMonitor } from './quality';

/** Simula `count` quadros da câmera, desenhando só 1 a cada `every`. */
function feed(monitor: QualityMonitor, count: number, every = 1, start = 0): { downgrades: number; next: number } {
  let downgrades = 0;
  let n = start;
  for (let i = 0; i < count; i++, n++) {
    if (i % every === 0 && monitor.record(n)) downgrades++;
  }
  return { downgrades, next: n };
}

describe('QualityMonitor', () => {
  it('mantém a resolução quando todos os quadros são desenhados', () => {
    const m = new QualityMonitor();
    expect(feed(m, 600).downgrades).toBe(0);
    expect(m.maxDpr).toBe(2);
  });

  it('baixa a resolução quando perde muitos quadros', () => {
    const m = new QualityMonitor();
    feed(m, 120, 2); // desenha metade dos quadros durante uma janela (~90 quadros)
    expect(m.maxDpr).toBe(1.5);
  });

  it('desce um degrau por vez e para no mínimo', () => {
    const m = new QualityMonitor();
    feed(m, 2000, 3);
    expect(m.maxDpr).toBe(1);
  });

  it('tolera perdas pequenas (10% dos quadros)', () => {
    const m = new QualityMonitor();
    for (let n = 0; n < 600; n++) if (n % 10 !== 9) m.record(n);
    expect(m.maxDpr).toBe(2);
  });

  it('reset não conta o intervalo em que a câmera ficou parada', () => {
    const m = new QualityMonitor();
    const { next } = feed(m, 60);
    m.reset();
    feed(m, 60, 1, next + 5000); // retoma muito depois
    expect(m.maxDpr).toBe(2);
  });
});
