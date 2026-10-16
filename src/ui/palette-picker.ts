import type { FilterOption } from '../state';
import { iconBackground } from './palette-editor';
import { DOUBLE_TAP_MS } from './double-tap';

type Callbacks = {
  /** Um toque: escolhe a paleta (o preview muda na hora). */
  onSelect: (index: number) => void;
  /** Dois toques no mesmo item: escolhe e confirma (a gaveta recolhe). */
  onConfirm: (index: number) => void;
  /** Paleta personalizada: tocar de novo quando já está escolhida, ou manter pressionado. */
  onEdit: (index: number) => void;
  onCreate: () => void;
};

const LONG_PRESS_MS = 500;
const LONG_PRESS_TOLERANCE = 10; // px que o dedo pode andar sem cancelar

/**
 * Carrossel horizontal de filtros. Cada item mostra as cores da paleta;
 * tocar seleciona e centraliza o item. O último botão cria uma paleta nova.
 */
export class PalettePicker {
  private buttons: HTMLButtonElement[] = [];
  private selected = -1;
  /** Último toque num item, para reconhecer o segundo toque de um toque duplo. */
  private lastTap: { index: number; time: number } | null = null;
  private editTimer = 0;

  constructor(
    private readonly root: HTMLElement,
    options: FilterOption[],
    private readonly callbacks: Callbacks,
  ) {
    root.setAttribute('role', 'radiogroup');
    root.setAttribute('aria-label', 'Filtros');
    this.setOptions(options);
  }

  /** Recria os itens (ex.: depois de criar ou excluir uma paleta). */
  setOptions(options: FilterOption[]): void {
    this.buttons = [];
    this.selected = -1;
    this.root.replaceChildren(...options.map((option, i) => this.createItem(option, i)), this.createAddButton());
  }

  /** Marca o item e o centraliza no carrossel (sem disparar onSelect). */
  select(index: number, smooth = true): void {
    if (index === this.selected) return;
    this.buttons[this.selected]?.setAttribute('aria-checked', 'false');
    this.buttons[this.selected]?.setAttribute('tabindex', '-1');
    this.selected = index;
    const button = this.buttons[index];
    button.setAttribute('aria-checked', 'true');
    button.setAttribute('tabindex', '0');
    this.center(button, smooth);
  }

  focusSelected(): void {
    this.buttons[this.selected]?.focus();
  }

  private center(button: HTMLElement, smooth: boolean): void {
    const { root } = this;
    const left = button.offsetLeft + button.offsetWidth / 2 - root.clientWidth / 2;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.scrollTo({ left, behavior: smooth && !reduce ? 'smooth' : 'auto' });
  }

  private createItem(option: FilterOption, index: number): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-item';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.setAttribute('tabindex', '-1');
    button.dataset.id = option.id;

    const swatch = document.createElement('span');
    swatch.className = 'palette-swatch';
    if (option.palette) {
      swatch.style.background = iconBackground(option.palette.colors, option.palette.icon);
      swatch.classList.toggle('has-icon', !!option.palette.icon);
    } else {
      swatch.classList.add('original');
    }

    const label = document.createElement('span');
    label.className = 'palette-label';
    label.textContent = option.name;
    button.append(swatch, label);

    const editable = !!option.palette && !option.palette.builtIn;
    if (editable) {
      button.classList.add('custom');
      button.setAttribute('aria-description', 'Toque de novo ou mantenha pressionado para editar');
      this.onLongPress(button, () => this.callbacks.onEdit(index));
    }

    button.addEventListener('click', () => {
      if (button.dataset.longPressed) {
        delete button.dataset.longPressed; // o toque longo já abriu o editor
        return;
      }
      this.onTap(index, editable);
    });

    this.buttons.push(button);
    return button;
  }

  /**
   * O primeiro toque escolhe na hora; um segundo toque no mesmo item logo em
   * seguida confirma. Numa paleta personalizada já escolhida, o toque abre o
   * editor, mas só depois da janela do toque duplo (para não brigar com ele).
   */
  private onTap(index: number, editable: boolean): void {
    const now = performance.now();
    const last = this.lastTap;
    clearTimeout(this.editTimer);
    if (last && last.index === index && now - last.time < DOUBLE_TAP_MS) {
      this.lastTap = null;
      this.callbacks.onConfirm(index);
      return;
    }
    this.lastTap = { index, time: now };
    if (editable && index === this.selected) {
      this.editTimer = window.setTimeout(() => this.callbacks.onEdit(index), DOUBLE_TAP_MS);
    } else {
      this.callbacks.onSelect(index);
    }
  }

  private createAddButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-item palette-add';
    button.innerHTML =
      '<span class="palette-swatch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></span>' +
      '<span class="palette-label">Nova</span>';
    button.setAttribute('aria-label', 'Criar nova paleta');
    button.addEventListener('click', () => this.callbacks.onCreate());
    return button;
  }

  private onLongPress(element: HTMLElement, handler: () => void): void {
    let timer = 0;
    let start: { x: number; y: number } | null = null;
    const cancel = () => {
      clearTimeout(timer);
      start = null;
    };
    element.addEventListener('pointerdown', (e) => {
      delete element.dataset.longPressed;
      start = { x: e.clientX, y: e.clientY };
      timer = window.setTimeout(() => {
        element.dataset.longPressed = '1';
        navigator.vibrate?.(15);
        handler();
      }, LONG_PRESS_MS);
    });
    element.addEventListener('pointermove', (e) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > LONG_PRESS_TOLERANCE) cancel();
    });
    element.addEventListener('pointerup', cancel);
    element.addEventListener('pointercancel', cancel);
    element.addEventListener('pointerleave', cancel);
    // Evita o menu de contexto do navegador ao segurar o dedo.
    element.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
