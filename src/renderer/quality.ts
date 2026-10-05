/** Densidades de pixel do preview, da mais nítida para a mais leve. */
export const DPR_STEPS = [2, 1.5, 1] as const;

const WINDOW = 90; // quadros da câmera avaliados por vez (~3 s a 30 fps)
const MAX_SKIPPED = 0.2; // acima de 20% de quadros perdidos, o aparelho não está dando conta

/**
 * Detecta quando o preview não acompanha a câmera e sugere uma resolução menor.
 * Usa o `presentedFrames` do requestVideoFrameCallback: se ele pula números entre
 * uma chamada e outra, a câmera entregou quadros que não conseguimos desenhar.
 * Isso não depende do fps da câmera (que cai sozinho em pouca luz).
 */
export class QualityMonitor {
  private step = 0;
  private last = -1;
  private frames = 0;
  private skipped = 0;

  get maxDpr(): number {
    return DPR_STEPS[this.step];
  }

  /** Recomeça a contagem (ex.: ao religar a câmera), sem mudar a resolução atual. */
  reset(): void {
    this.last = -1;
    this.frames = 0;
    this.skipped = 0;
  }

  /** Registra um quadro desenhado. Retorna true quando a resolução deve baixar. */
  record(presentedFrames: number): boolean {
    if (this.last >= 0) {
      const gap = Math.max(presentedFrames - this.last - 1, 0);
      this.skipped += gap;
      this.frames += gap + 1;
    }
    this.last = presentedFrames;
    if (this.frames < WINDOW) return false;

    const tooSlow = this.skipped / this.frames > MAX_SKIPPED;
    this.frames = 0;
    this.skipped = 0;
    if (tooSlow && this.step < DPR_STEPS.length - 1) {
      this.step++;
      return true;
    }
    return false;
  }
}
