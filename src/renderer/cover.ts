/**
 * Escala das coordenadas de textura para preencher a tela sem distorcer
 * (equivalente a `object-fit: cover`). Um valor < 1 significa que só essa
 * fração do vídeo aparece naquele eixo; o resto é cortado igualmente dos dois lados.
 */
export function coverScale(
  videoWidth: number,
  videoHeight: number,
  targetWidth: number,
  targetHeight: number,
): [number, number] {
  if (videoWidth <= 0 || videoHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return [1, 1];
  }
  const videoAspect = videoWidth / videoHeight;
  const targetAspect = targetWidth / targetHeight;
  return videoAspect > targetAspect
    ? [targetAspect / videoAspect, 1] // vídeo mais largo: corta as laterais
    : [1, videoAspect / targetAspect]; // vídeo mais alto: corta em cima e embaixo
}

/** Tamanho do canvas em pixels físicos, com a densidade limitada para poupar a GPU. */
export function canvasSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  maxDpr = 2,
): [number, number] {
  const dpr = Math.min(Math.max(devicePixelRatio, 1), maxDpr);
  return [Math.max(1, Math.round(cssWidth * dpr)), Math.max(1, Math.round(cssHeight * dpr))];
}
