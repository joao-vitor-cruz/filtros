import { ADJUSTMENT_RANGES, DEFAULT_ADJUSTMENTS, isDefaultAdjustments, type Adjustments } from '../filter';

type Callbacks = {
  onAdjust: (adjustments: Adjustments) => void;
  onMirrorChange: (mirror: boolean) => void;
  onClose: () => void;
};

const LABELS: Record<keyof Adjustments, string> = {
  contrast: 'Contraste',
  saturation: 'Saturação',
  vignette: 'Vinheta',
  grain: 'Grão',
};

/** Folha com os ajustes globais do filtro e preferências da câmera. */
export class SettingsPanel {
  private values: Adjustments = { ...DEFAULT_ADJUSTMENTS };
  private readonly inputs = new Map<keyof Adjustments, { input: HTMLInputElement; output: HTMLOutputElement }>();
  private readonly resetBtn: HTMLButtonElement;
  private readonly mirrorInput: HTMLInputElement;
  private readonly title: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: Callbacks,
  ) {
    const list = root.querySelector<HTMLElement>('#settings-sliders')!;
    this.resetBtn = root.querySelector<HTMLButtonElement>('#settings-reset')!;
    this.mirrorInput = root.querySelector<HTMLInputElement>('#settings-mirror')!;
    this.title = root.querySelector<HTMLElement>('#settings-title')!;

    for (const key of Object.keys(LABELS) as (keyof Adjustments)[]) list.append(this.createSlider(key));

    this.resetBtn.addEventListener('click', () => {
      this.set({ ...DEFAULT_ADJUSTMENTS });
      callbacks.onAdjust({ ...this.values });
    });
    this.mirrorInput.addEventListener('change', () => callbacks.onMirrorChange(this.mirrorInput.checked));
    root.querySelector('#settings-done')!.addEventListener('click', () => callbacks.onClose());
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        callbacks.onClose();
      }
    });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(adjustments: Adjustments, mirror: boolean): void {
    this.set(adjustments);
    this.mirrorInput.checked = mirror;
    this.root.hidden = false;
    this.title.focus();
  }

  close(): void {
    this.root.hidden = true;
  }

  private set(adjustments: Adjustments): void {
    this.values = { ...adjustments };
    for (const [key, { input, output }] of this.inputs) {
      input.value = String(Math.round(adjustments[key] * 100));
      this.updateOutput(key, input, output);
    }
    this.resetBtn.disabled = isDefaultAdjustments(this.values);
  }

  private updateOutput(key: keyof Adjustments, input: HTMLInputElement, output: HTMLOutputElement): void {
    const value = Number(input.value);
    const [min] = ADJUSTMENT_RANGES[key];
    output.textContent = min < 0 && value > 0 ? `+${value}` : String(value);
    // Preenchimento a partir do zero: do centro nos ajustes que vão de -100 a +100.
    const pct = ((value - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
    const zero = min < 0 ? 50 : 0;
    input.style.setProperty('--from', `${Math.min(pct, zero)}%`);
    input.style.setProperty('--to', `${Math.max(pct, zero)}%`);
  }

  private createSlider(key: keyof Adjustments): HTMLElement {
    const [min, max] = ADJUSTMENT_RANGES[key];
    const row = document.createElement('label');
    row.className = 'adjust-row';
    const name = document.createElement('span');
    name.textContent = LABELS[key];
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min * 100);
    input.max = String(max * 100);
    input.step = '1';
    const output = document.createElement('output');

    input.addEventListener('input', () => {
      this.values[key] = Number(input.value) / 100;
      this.updateOutput(key, input, output);
      this.resetBtn.disabled = isDefaultAdjustments(this.values);
      this.callbacks.onAdjust({ ...this.values });
    });
    // Toque duplo volta o ajuste para zero.
    input.addEventListener('dblclick', () => {
      input.value = '0';
      input.dispatchEvent(new Event('input'));
    });

    row.append(name, output, input);
    this.inputs.set(key, { input, output });
    return row;
  }
}
