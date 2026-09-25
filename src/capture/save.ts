export type SaveResult = 'saved' | 'cancelled';

type NavigatorLike = Pick<Navigator, 'userAgent' | 'maxTouchPoints'> & { platform?: string };

/** iPhone/iPad (inclusive iPad que se identifica como Mac). */
export function isIOS(nav: NavigatorLike = navigator): boolean {
  if (/iPad|iPhone|iPod/.test(nav.userAgent)) return true;
  return /Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1;
}

/**
 * Salva a foto no aparelho.
 * - iPhone/iPad: o Safari não grava direto na galeria; o caminho é a folha do
 *   sistema, onde a opção "Salvar imagem" leva a foto para o app Fotos.
 * - Demais: download do arquivo (no Android vai para Downloads e aparece na galeria).
 */
export async function savePhoto(blob: Blob, fileName: string): Promise<SaveResult> {
  const file = new File([blob], fileName, { type: blob.type });
  if (isIOS() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'saved';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Outras falhas: tenta o download abaixo.
    }
  }
  download(blob, fileName);
  return 'saved';
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // Dá tempo para o navegador iniciar o download antes de liberar a memória.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
