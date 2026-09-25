import type { FilterOption } from '../state';
import { cssGradient } from '../palette/palette';

type Callbacks = {
  onSelect: (index: number) => void;
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
      swatch.style.background = cssGradient(option.palette.colors, '135deg');
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
      button.setAttribute('aria-description', 'Toque de novo para editar');
      this.onLongPress(button, () => this.callbacks.onEdit(index));
    }

    button.addEventListener('click', () => {
      if (button.dataset.longPressed) {
        delete button.dataset.longPressed; // o toque longo já abriu o editor
        return;
      }
      if (editable && index === this.selected) this.callbacks.onEdit(index);
      else this.callbacks.onSelect(index);
    });

    this.buttons.push(button);
    return button;
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
