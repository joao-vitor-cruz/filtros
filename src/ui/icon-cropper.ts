import { centeredCrop, layoutCrop, renderIcon, zoomCrop, type CropState } from '../palette/icon';

/**
 * Recorte do ícone em círculo: arrastar enquadra, o controle de zoom aproxima.
 * open() resolve com o JPEG 128×128 (data URL) ou null se o usuário cancelar.
 */
export class IconCropper {
  private readonly view: HTMLElement;
  private readonly zoomInput: HTMLInputElement;
  private readonly title: HTMLElement;
  private image: HTMLCanvasElement | null = null;
  private crop: CropState = { zoom: 1, x: 0, y: 0 };
  private resolve: ((icon: string | null) => void) | null = null;
  private drag: { x: number; y: number; cropX: number; cropY: number } | null = null;

  constructor(private readonly root: HTMLElement) {
    this.view = root.querySelector<HTMLElement>('#cropper-view')!;
    this.zoomInput = root.querySelector<HTMLInputElement>('#cropper-zoom')!;
    this.title = root.querySelector<HTMLElement>('#cropper-title')!;

    this.view.addEventListener('pointerdown', (e) => {
      this.view.setPointerCapture(e.pointerId);
      this.drag = { x: e.clientX, y: e.clientY, cropX: this.crop.x, cropY: this.crop.y };
    });
    this.view.addEventListener('pointermove', (e) => {
      if (!this.drag || !this.image) return;
      this.crop = {
        ...this.crop,
        x: this.drag.cropX + e.clientX - this.drag.x,
        y: this.drag.cropY + e.clientY - this.drag.y,
      };
      this.render();
    });
    const endDrag = () => (this.drag = null);
    this.view.addEventListener('pointerup', endDrag);
    this.view.addEventListener('pointercancel', endDrag);

    this.zoomInput.addEventListener('input', () => {
      if (!this.image) return;
      this.crop = zoomCrop(this.image.width, this.image.height, this.size, this.crop, Number(this.zoomInput.value) / 100);
      this.render();
    });

    root.querySelector('#cropper-cancel')!.addEventListener('click', () => this.finish(null));
    root.querySelector('#cropper-use')!.addEventListener('click', () => {
      if (this.image) this.finish(renderIcon(this.image, this.size, this.crop));
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      this.finish(null);
    });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** Mostra a foto (já com a orientação corrigida) para enquadrar. */
  open(image: HTMLCanvasElement): Promise<string | null> {
    this.finish(null); // fecha um recorte anterior, se houver
    this.image = image;
    image.className = 'cropper-image';
    this.view.replaceChildren(image);
    this.root.hidden = false;
    this.crop = centeredCrop(image.width, image.height, this.size);
    this.zoomInput.value = '100';
    this.render();
    this.title.focus();
    return new Promise((resolve) => (this.resolve = resolve));
  }

  /** Lado do círculo na tela, em px. */
  private get size(): number {
    return this.view.clientWidth || 220;
  }

  private render(): void {
    if (!this.image) return;
    const layout = layoutCrop(this.image.width, this.image.height, this.size, this.crop);
    // Guarda a posição já limitada, para o próximo arraste partir de onde a foto realmente está.
    this.crop = { ...this.crop, x: layout.x, y: layout.y };
    Object.assign(this.image.style, {
      width: `${layout.width}px`,
      height: `${layout.height}px`,
      left: `${layout.x}px`,
      top: `${layout.y}px`,
    });
  }

  private finish(icon: string | null): void {
    this.root.hidden = true;
    this.image = null;
    this.view.replaceChildren();
    const resolve = this.resolve;
    this.resolve = null;
    resolve?.(icon);
  }
}
