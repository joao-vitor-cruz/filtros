/** Tamanho do ícone salvo (px). O carrossel mostra 64–69 px; 128 fica nítido em telas 2×. */
export const ICON_SIZE = 128;

export type CropState = { zoom: number; x: number; y: number };

/**
 * Posição da foto dentro do círculo de recorte (lado `view`), com a foto sempre
 * cobrindo o círculo inteiro. `x`/`y` são o canto superior esquerdo da foto
 * em relação ao círculo; `zoom` 1 = o lado menor da foto encosta no círculo.
 */
export function layoutCrop(imageWidth: number, imageHeight: number, view: number, crop: CropState) {
  const scale = (view / Math.min(imageWidth, imageHeight)) * crop.zoom;
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
  return { scale, width, height, x: clamp(crop.x, view - width), y: clamp(crop.y, view - height) };
}

/** Recorte inicial: foto centralizada, sem zoom. */
export function centeredCrop(imageWidth: number, imageHeight: number, view: number): CropState {
  const { width, height } = layoutCrop(imageWidth, imageHeight, view, { zoom: 1, x: 0, y: 0 });
  return { zoom: 1, x: (view - width) / 2, y: (view - height) / 2 };
}

/**
 * Muda o zoom mantendo fixo o ponto no centro do círculo (como um zoom de câmera).
 */
export function zoomCrop(imageWidth: number, imageHeight: number, view: number, crop: CropState, zoom: number): CropState {
  const before = layoutCrop(imageWidth, imageHeight, view, crop);
  const after = layoutCrop(imageWidth, imageHeight, view, { ...crop, zoom });
  const ratio = after.scale / before.scale;
  const c = view / 2;
  const next = { zoom, x: c - (c - before.x) * ratio, y: c - (c - before.y) * ratio };
  const fixed = layoutCrop(imageWidth, imageHeight, view, next);
  return { zoom, x: fixed.x, y: fixed.y };
}

/** Desenha o recorte num canvas ICON_SIZE × ICON_SIZE e devolve o JPEG em data URL. */
export function renderIcon(image: CanvasImageSource & { width: number; height: number }, view: number, crop: CropState): string {
  const layout = layoutCrop(image.width, image.height, view, crop);
  const k = ICON_SIZE / view;
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, layout.x * k, layout.y * k, layout.width * k, layout.height * k);
  return canvas.toDataURL('image/jpeg', 0.85);
}
