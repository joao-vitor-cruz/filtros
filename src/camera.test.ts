import { describe, expect, it } from 'vitest';
import { buildConstraints, classifyError } from './camera';

const domError = (name: string) => Object.assign(new Error(name), { name });

describe('buildConstraints', () => {
  it('pede a câmera do lado escolhido sem áudio', () => {
    const c = buildConstraints('user');
    expect(c.audio).toBe(false);
    expect(c.video).toMatchObject({ facingMode: { ideal: 'user' } });
  });

  it('usa "ideal" para não falhar em aparelhos com uma só câmera', () => {
    const video = buildConstraints('environment').video as MediaTrackConstraints;
    expect(video.facingMode).toEqual({ ideal: 'environment' });
    expect(video.width).toEqual({ ideal: 1280 });
  });
});

describe('classifyError', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'not-found'],
    ['OverconstrainedError', 'not-found'],
    ['NotReadableError', 'in-use'],
    ['TypeError', 'unknown'],
  ])('%s → %s', (name, kind) => {
    expect(classifyError(domError(name))).toBe(kind);
  });

  it('trata valores que não são erros como desconhecidos', () => {
    expect(classifyError('falhou')).toBe('unknown');
  });
});
