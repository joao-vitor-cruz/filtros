/** Inverte a ordem das linhas de uma imagem RGBA (o readPixels do WebGL lê de baixo para cima). */
export function flipRows(pixels: ArrayLike<number>, width: number, height: number): Uint8ClampedArray<ArrayBuffer> {
  const rowSize = width * 4;
  const out = new Uint8ClampedArray(new ArrayBuffer(rowSize * height));
  for (let y = 0; y < height; y++) {
    const src = (height - 1 - y) * rowSize;
    for (let i = 0; i < rowSize; i++) out[y * rowSize + i] = pixels[src + i];
  }
  return out;
}

/** Nome do arquivo da foto, ex.: filtros-20260925-141530.jpg. */
export function photoFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `filtros-${day}-${time}.jpg`;
}

export const JPEG_QUALITY = 0.92;

/** Codifica os pixels em JPEG. */
export async function encodeJpeg(image: ImageData, quality = JPEG_QUALITY): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  ctx.putImageData(image, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar JPEG'))), 'image/jpeg', quality),
  );
}

/** Sem WebGL: copia o frame do vídeo como está (sem filtro), espelhado como no preview. */
export function captureVideoFrame(video: HTMLVideoElement, mirrored: boolean): ImageData | null {
  const { videoWidth: width, videoHeight: height } = video;
  if (!width || !height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (mirrored) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}
