import { cssGradient, MAX_COLORS, MIN_COLORS, mixHex, normalizeHex } from '../palette/palette';
import { MAX_NAME_LENGTH } from '../palette/storage';

export type PaletteDraft = { name: string; colors: string[] };

type Callbacks = {
  /** Chamado a cada mudança de cor, para o preview da câmera acompanhar. */
  onPreview: (colors: string[]) => void;
  onSave: (draft: PaletteDraft) => void;
  onDelete: () => void;
  onCancel: () => void;
};

const $ = <T extends HTMLElement>(root: HTMLElement, selector: string) => root.querySelector<T>(selector)!;

/** Folha inferior para criar ou editar uma paleta de 2 a 5 cores. */
export class PaletteEditor {
  private draft: PaletteDraft = { name: '', colors: [] };
  private readonly title: HTMLElement;
  private readonly gradient: HTMLElement;
  private readonly nameInput: HTMLInputElement;
  private readonly list: HTMLOListElement;
  private readonly addBtn: HTMLButtonElement;
  private readonly deleteBtn: HTMLButtonElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: Callbacks,
  ) {
    this.title = $(root, '#editor-title');
    this.gradient = $(root, '#editor-gradient');
    this.nameInput = $(root, '#editor-name');
    this.list = $(root, '#editor-colors');
    this.addBtn = $(root, '#editor-add');
    this.deleteBtn = $(root, '#editor-delete');
    this.nameInput.maxLength = MAX_NAME_LENGTH;

    this.nameInput.addEventListener('input', () => (this.draft.name = this.nameInput.value));
    this.addBtn.addEventListener('click', () => this.addColor());
    this.deleteBtn.addEventListener('click', () => callbacks.onDelete());
    $(root, '#editor-cancel').addEventListener('click', () => callbacks.onCancel());
    root.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      callbacks.onSave({ name: this.draft.name, colors: [...this.draft.colors] });
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        callbacks.onCancel();
      }
    });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(initial: PaletteDraft, mode: 'create' | 'edit'): void {
    this.draft = { name: initial.name, colors: initial.colors.map(normalizeHex) };
    this.title.textContent = mode === 'create' ? 'Nova paleta' : 'Editar paleta';
    this.deleteBtn.hidden = mode === 'create';
    this.nameInput.value = initial.name;
    this.render();
    this.root.hidden = false;
    // Foca o título, e não o campo de nome, para não abrir o teclado do celular.
    this.title.focus();
  }

  close(): void {
    this.root.hidden = true;
  }

  private changed(): void {
    this.render();
    this.callbacks.onPreview([...this.draft.colors]);
  }

  private addColor(): void {
    const { colors } = this.draft;
    if (colors.length >= MAX_COLORS) return;
    // Entra antes da última cor, no meio do caminho: o gradiente quase não muda.
    const last = colors.length - 1;
    colors.splice(last, 0, mixHex(colors[last - 1] ?? colors[last], colors[last]));
    this.changed();
    this.list.querySelectorAll<HTMLInputElement>('input[type="color"]')[last]?.focus();
  }

  private render(): void {
    const { colors } = this.draft;
    this.gradient.style.background = cssGradient(colors);
    this.addBtn.hidden = colors.length >= MAX_COLORS;
    this.list.replaceChildren(...colors.map((color, i) => this.createRow(color, i)));
  }

  private createRow(color: string, index: number): HTMLLIElement {
    const { colors } = this.draft;
    const count = colors.length;
    const li = document.createElement('li');
    li.className = 'color-row';

    const role = index === 0 ? 'Sombras' : index === count - 1 ? 'Luzes' : 'Meios-tons';

    const swatch = document.createElement('label');
    swatch.className = 'color-swatch';
    swatch.style.background = color;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = color;
    input.setAttribute('aria-label', `Cor ${index + 1} de ${count} (${role.toLowerCase()})`);
    swatch.append(input);

    const text = document.createElement('span');
    text.className = 'color-text';
    const hex = document.createElement('span');
    hex.className = 'color-hex';
    hex.textContent = color;
    const roleLabel = document.createElement('span');
    roleLabel.className = 'color-role';
    roleLabel.textContent = role;
    text.append(hex, roleLabel);

    // "input" atualiza ao vivo enquanto o seletor está aberto, sem redesenhar a lista
    // (redesenhar fecharia o seletor de cor em alguns navegadores).
    input.addEventListener('input', () => {
      colors[index] = normalizeHex(input.value);
      swatch.style.background = colors[index];
      hex.textContent = colors[index];
      this.gradient.style.background = cssGradient(colors);
      this.callbacks.onPreview([...colors]);
    });

    const actions = document.createElement('span');
    actions.className = 'color-actions';
    actions.append(
      this.iconButton('up', 'Mover para cima', index === 0, () => this.move(index, -1)),
      this.iconButton('down', 'Mover para baixo', index === count - 1, () => this.move(index, 1)),
      this.iconButton('remove', 'Remover cor', count <= MIN_COLORS, () => {
        colors.splice(index, 1);
        this.changed();
      }),
    );

    li.append(swatch, text, actions);
    return li;
  }

  private move(index: number, delta: -1 | 1): void {
    const { colors } = this.draft;
    const target = index + delta;
    [colors[index], colors[target]] = [colors[target], colors[index]];
    this.changed();
    // Mantém o foco no mesmo botão da linha que se moveu.
    const rows = this.list.querySelectorAll('.color-row');
    rows[target]?.querySelector<HTMLButtonElement>(`[data-icon="${delta < 0 ? 'up' : 'down'}"]:not(:disabled)`)?.focus();
  }

  private iconButton(icon: 'up' | 'down' | 'remove', label: string, disabled: boolean, onClick: () => void) {
    const paths = {
      up: 'M12 19V5M6 11l6-6 6 6',
      down: 'M12 5v14M6 13l6 6 6-6',
      remove: 'M6 6l12 12M18 6L6 18',
    };
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini-btn';
    button.dataset.icon = icon;
    button.disabled = disabled;
    button.setAttribute('aria-label', label);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[icon]}" /></svg>`;
    button.addEventListener('click', onClick);
    return button;
  }
}
