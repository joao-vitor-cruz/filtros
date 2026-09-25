import type { FilterOption } from '../state';
import { cssGradient } from '../palette/palette';

/**
 * Carrossel horizontal de filtros. Cada item mostra as cores da paleta;
 * tocar seleciona e centraliza o item.
 */
export class PalettePicker {
  private buttons: HTMLButtonElement[] = [];
  private selected = -1;

  constructor(
    private readonly root: HTMLElement,
    options: FilterOption[],
    private readonly onSelect: (index: number) => void,
  ) {
    root.setAttribute('role', 'radiogroup');
    root.setAttribute('aria-label', 'Filtros');
    root.replaceChildren(...options.map((option, i) => this.createItem(option, i)));
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
    button.addEventListener('click', () => this.onSelect(index));
    this.buttons.push(button);
    return button;
  }
}
