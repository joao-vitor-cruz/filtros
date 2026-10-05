import { describe, expect, it } from 'vitest';
import { formatDuration, pickMimeType, videoExtension } from './recorder';

describe('pickMimeType', () => {
  it('prefere MP4 quando o navegador grava nos dois formatos', () => {
    expect(pickMimeType(() => true)).toBe('video/mp4;codecs=avc1.42E01E,mp4a.40.2');
  });

  it('usa WebM quando é o único disponível', () => {
    expect(pickMimeType((t) => t.startsWith('video/webm'))).toBe('video/webm;codecs=vp9,opus');
  });

  it('aceita MP4 sem codecs explícitos (Safari)', () => {
    expect(pickMimeType((t) => t === 'video/mp4')).toBe('video/mp4');
  });

  it('devolve null sem nenhum formato', () => {
    expect(pickMimeType(() => false)).toBeNull();
  });
});

describe('videoExtension e formatDuration', () => {
  it('extensão pelo tipo', () => {
    expect(videoExtension('video/mp4;codecs=avc1')).toBe('mp4');
    expect(videoExtension('video/webm')).toBe('webm');
  });

  it('formata minutos e segundos', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(7400)).toBe('00:07');
    expect(formatDuration(155_000)).toBe('02:35');
  });
});
