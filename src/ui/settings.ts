import {
  cloneAdjustments,
  CURVE_CHANNELS,
  CURVE_LABELS,
  defaultAdjustments,
  HSL_COLORS,
  HSL_HUES,
  HSL_LABELS,
  isDefaultAdjustments,
  isIdentityCurve,
  SLIDERS,
  WHEEL_LABELS,
  WHEELS,
  type Adjustments,
  type CurveChannel,
  type HslColor,
  type SliderGroup,
  type Wheel,
} from '../edit/adjustments';
import { HELP, type HelpKey } from '../edit/help';
import { ColorWheel } from './color-wheel';
import { CurveEditor } from './curve-editor';

type Callbacks = {
  onAdjust: (adjustments: Adjustments) => void;
  onMirrorChange: (mirror: boolean) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClose: () => void;
};

type TabId = SliderGroup | 'hsl' | 'wheels' | 'curves' | 'more';

const TABS: { id: TabId; label: string }[] = [
  { id: 'light', label: 'Luz' },
  { id: 'color', label: 'Cor' },
  { id: 'hsl', label: 'HSL' },
  { id: 'wheels', label: 'Rodas' },
  { id: 'curves', label: 'Curvas' },
  { id: 'style', label: 'Estilo' },
  { id: 'more', label: 'Mais' },
];

const CURVE_COLORS: Record<CurveChannel, string> = { rgb: '#ffffff', r: '#ff5a5a', g: '#4cd964', b: '#5aa9ff' };

/** Um controle deslizante com rótulo, botão "?" e valor de -100 a 100 (ou 0 a 100). */
type SliderRow = { element: HTMLElement; set: (value: number) => void };

/**
 * Painel de ajustes no estilo do Instagram Edits: abas Luz, Cor, HSL, Rodas,
 * Curvas, Estilo e Mais. Cada ajuste tem um "?" que explica o que ele faz.
 */
export class SettingsPanel {
  private values: Adjustments = defaultAdjustments();
  private readonly title: HTMLElement;
  private readonly resetBtn: HTMLButtonElement;
  private readonly mirrorInput: HTMLInputElement;
  private readonly exportBtn: HTMLButtonElement;
  private readonly transferHint: HTMLElement;
  private readonly tabButtons = new Map<TabId, HTMLButtonElement>();
  private readonly panels = new Map<TabId, HTMLElement>();
  private readonly refreshers: (() => void)[] = [];
  private readonly help: HTMLElement;
  private helpReturnFocus: HTMLElement | null = null;
  private hslColor: HslColor = 'red';
  private wheel: Wheel = 'global';
  private curveChannel: CurveChannel = 'rgb';

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: Callbacks,
  ) {
    const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
    this.title = $('#settings-title');
    this.resetBtn = $<HTMLButtonElement>('#settings-reset');
    this.mirrorInput = $<HTMLInputElement>('#settings-mirror');
    this.exportBtn = $<HTMLButtonElement>('#export-palettes');
    this.transferHint = $('#transfer-hint');
    this.help = $('#help');

    this.buildTabs($('#edit-tabs'), $('#edit-panels'));

    this.resetBtn.addEventListener('click', () => {
      this.values = defaultAdjustments();
      this.refresh();
      this.emit();
    });
    this.mirrorInput.addEventListener('change', () => callbacks.onMirrorChange(this.mirrorInput.checked));
    this.exportBtn.addEventListener('click', () => callbacks.onExport());
    const importInput = $<HTMLInputElement>('#import-input');
    $('#import-palettes').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => {
      const file = importInput.files?.[0];
      importInput.value = ''; // permite importar o mesmo arquivo de novo
      if (file) callbacks.onImport(file);
    });
    $('#settings-done').addEventListener('click', () => callbacks.onClose());
    $('#help-close').addEventListener('click', () => this.closeHelp());
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (!this.help.hidden) this.closeHelp();
      else callbacks.onClose();
    });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(adjustments: Adjustments, mirror: boolean, paletteCount: number): void {
    this.values = cloneAdjustments(adjustments);
    this.mirrorInput.checked = mirror;
    this.setPaletteCount(paletteCount);
    this.refresh();
    this.root.hidden = false;
    this.title.focus();
  }

  close(): void {
    this.closeHelp();
    this.root.hidden = true;
  }

  /** Atualiza o texto e o botão de exportar conforme quantas paletas o usuário criou. */
  setPaletteCount(count: number): void {
    this.exportBtn.disabled = count === 0;
    this.transferHint.textContent =
      count === 0
        ? 'Você ainda não criou paletas. Dá para importar um arquivo exportado de outro aparelho.'
        : `${count === 1 ? '1 paleta criada' : `${count} paletas criadas`}. Exporte para ter um backup ou levar para outro aparelho.`;
  }

  // ---------- Estrutura ----------

  private buildTabs(tabList: HTMLElement, panelHost: HTMLElement): void {
    const more = panelHost.querySelector<HTMLElement>('#tab-more')!;
    for (const tab of TABS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'edit-tab';
      button.id = `tab-btn-${tab.id}`;
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', `tab-${tab.id}`);
      button.addEventListener('click', () => this.showTab(tab.id));
      tabList.append(button);
      this.tabButtons.set(tab.id, button);

      const panel = tab.id === 'more' ? more : this.buildPanel(tab.id);
      panel.id = `tab-${tab.id}`;
      panel.setAttribute('aria-labelledby', button.id);
      if (tab.id !== 'more') panelHost.insertBefore(panel, more);
      this.panels.set(tab.id, panel);
    }
    // Setas trocam de aba (padrão de tablist).
    tabList.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const ids = TABS.map((t) => t.id);
      const current = ids.findIndex((id) => this.tabButtons.get(id)!.getAttribute('aria-selected') === 'true');
      const next = ids[(current + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
      this.showTab(next);
      this.tabButtons.get(next)!.focus();
    });
    this.showTab('light');
  }

  private showTab(id: TabId): void {
    for (const [tab, button] of this.tabButtons) {
      const selected = tab === id;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      this.panels.get(tab)!.hidden = !selected;
    }
    this.tabButtons.get(id)!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  private buildPanel(id: Exclude<TabId, 'more'>): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'edit-panel';
    panel.setAttribute('role', 'tabpanel');
    if (id === 'hsl') this.buildHsl(panel);
    else if (id === 'wheels') this.buildWheels(panel);
    else if (id === 'curves') this.buildCurves(panel);
    else {
      for (const def of SLIDERS.filter((s) => s.group === id)) {
        const row = this.slider(def.label, def.key, def.min, (v) => {
          this.values[def.key] = v;
          this.emit();
        });
        this.refreshers.push(() => row.set(this.values[def.key]));
        panel.append(row.element);
      }
    }
    return panel;
  }

  // ---------- HSL ----------

  private buildHsl(panel: HTMLElement): void {
    panel.append(this.sectionHeader('Escolha a cor', 'hsl'));
    const chips = this.chips(
      HSL_COLORS.map((c) => ({ id: c, label: HSL_LABELS[c], color: `hsl(${HSL_HUES[c]} 90% 55%)` })),
      'Cor do HSL',
      (c) => {
        this.hslColor = c;
        this.refresh();
      },
    );
    panel.append(chips.element);
    (
      [
        ['Matiz', 'hue', 'hslHue'],
        ['Saturação', 'saturation', 'hslSaturation'],
        ['Luminância', 'luminance', 'hslLuminance'],
      ] as const
    ).forEach(([label, field, help]) => {
      const row = this.slider(label, help, -1, (v) => {
        this.values.hsl[this.hslColor][field] = v;
        chips.select(this.hslColor, (c) => this.isHslChanged(c));
        this.emit();
      });
      this.refreshers.push(() => row.set(this.values.hsl[this.hslColor][field]));
      panel.append(row.element);
    });
    this.refreshers.push(() => chips.select(this.hslColor, (c) => this.isHslChanged(c)));
  }

  private isHslChanged(c: HslColor): boolean {
    const v = this.values.hsl[c];
    return v.hue !== 0 || v.saturation !== 0 || v.luminance !== 0;
  }

  // ---------- Rodas ----------

  private buildWheels(panel: HTMLElement): void {
    panel.append(this.sectionHeader('Escolha a faixa', 'wheels'));
    const chips = this.chips(
      WHEELS.map((w) => ({ id: w, label: WHEEL_LABELS[w] })),
      'Roda de cor',
      (w) => {
        this.wheel = w;
        this.refresh();
      },
    );
    panel.append(chips.element);
    const wheel = new ColorWheel((hue, amount) => {
      this.values.wheels[this.wheel].hue = hue;
      this.values.wheels[this.wheel].amount = amount;
      chips.select(this.wheel, (w) => this.isWheelChanged(w));
      this.emit();
    });
    const wrap = document.createElement('div');
    wrap.className = 'color-wheel-wrap';
    wrap.append(wheel.element);
    panel.append(wrap);
    const lum = this.slider('Luminância', 'wheelLuminance', -1, (v) => {
      this.values.wheels[this.wheel].luminance = v;
      chips.select(this.wheel, (w) => this.isWheelChanged(w));
      this.emit();
    });
    panel.append(lum.element);
    this.refreshers.push(() => {
      const v = this.values.wheels[this.wheel];
      wheel.set(v.hue, v.amount);
      lum.set(v.luminance);
      chips.select(this.wheel, (w) => this.isWheelChanged(w));
    });
  }

  private isWheelChanged(w: Wheel): boolean {
    return this.values.wheels[w].amount !== 0 || this.values.wheels[w].luminance !== 0;
  }

  // ---------- Curvas ----------

  private buildCurves(panel: HTMLElement): void {
    panel.append(this.sectionHeader('Canal', 'curves'));
    const chips = this.chips(
      CURVE_CHANNELS.map((c) => ({ id: c, label: CURVE_LABELS[c], color: c === 'rgb' ? undefined : CURVE_COLORS[c] })),
      'Canal da curva',
      (c) => {
        this.curveChannel = c;
        this.refresh();
      },
    );
    panel.append(chips.element);
    const editor = new CurveEditor((points) => {
      this.values.curves[this.curveChannel] = points;
      chips.select(this.curveChannel, (c) => !isIdentityCurve(this.values.curves[c]));
      this.emit();
    });
    const resetCurve = document.createElement('button');
    resetCurve.type = 'button';
    resetCurve.className = 'ghost-btn compact';
    resetCurve.textContent = 'Redefinir esta curva';
    resetCurve.addEventListener('click', () => {
      this.values.curves[this.curveChannel] = [
        [0, 0],
        [1, 1],
      ];
      this.refresh();
      this.emit();
    });
    const wrap = document.createElement('div');
    wrap.className = 'curve-wrap';
    wrap.append(editor.element, resetCurve);
    panel.append(wrap);
    this.refreshers.push(() => {
      editor.set(this.values.curves[this.curveChannel], CURVE_COLORS[this.curveChannel]);
      chips.select(this.curveChannel, (c) => !isIdentityCurve(this.values.curves[c]));
    });
  }

  // ---------- Peças reutilizadas ----------

  private slider(label: string, helpKey: HelpKey, min: number, onInput: (value: number) => void): SliderRow {
    const row = document.createElement('div');
    row.className = 'adjust-row';
    const id = `adj-${helpKey}-${Math.random().toString(36).slice(2, 7)}`;

    const name = document.createElement('label');
    name.htmlFor = id;
    name.textContent = label;
    const output = document.createElement('output');
    output.htmlFor.add(id);
    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = String(min * 100);
    input.max = '100';
    input.step = '1';

    const show = (value: number) => {
      const v = Math.round(value * 100);
      input.value = String(v);
      output.textContent = min < 0 && v > 0 ? `+${v}` : String(v);
      // Preenchimento a partir do zero: do centro nos ajustes que vão de -100 a +100.
      const pct = ((v - min * 100) / (100 - min * 100)) * 100;
      const zero = min < 0 ? 50 : 0;
      input.style.setProperty('--from', `${Math.min(pct, zero)}%`);
      input.style.setProperty('--to', `${Math.max(pct, zero)}%`);
    };
    input.addEventListener('input', () => {
      const value = Number(input.value) / 100;
      show(value);
      onInput(value);
    });
    // Toque duplo volta o ajuste para zero.
    input.addEventListener('dblclick', () => {
      show(0);
      onInput(0);
    });

    const head = document.createElement('div');
    head.className = 'adjust-head';
    head.append(name, this.helpButton(helpKey), output);
    row.append(head, input);
    return { element: row, set: show };
  }

  private sectionHeader(text: string, helpKey: HelpKey): HTMLElement {
    const head = document.createElement('div');
    head.className = 'adjust-head section-head';
    const label = document.createElement('span');
    label.textContent = text;
    head.append(label, this.helpButton(helpKey));
    return head;
  }

  private chips<T extends string>(
    items: { id: T; label: string; color?: string }[],
    groupLabel: string,
    onSelect: (id: T) => void,
  ): { element: HTMLElement; select: (id: T, changed: (id: T) => boolean) => void } {
    const group = document.createElement('div');
    group.className = 'chip-row';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', groupLabel);
    const buttons = items.map((item) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('role', 'radio');
      b.dataset.id = item.id;
      if (item.color) {
        const dot = document.createElement('span');
        dot.className = 'chip-dot';
        dot.style.background = item.color;
        b.append(dot);
      }
      b.append(item.label);
      b.addEventListener('click', () => onSelect(item.id));
      group.append(b);
      return b;
    });
    return {
      element: group,
      select: (id, changed) => {
        for (const b of buttons) {
          const selected = b.dataset.id === id;
          b.setAttribute('aria-checked', String(selected));
          b.tabIndex = selected ? 0 : -1;
          // Ponto amarelo: essa cor/faixa/canal tem ajuste.
          b.classList.toggle('changed', changed(b.dataset.id as T));
        }
      },
    };
  }

  private helpButton(key: HelpKey): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'help-btn';
    button.textContent = '?';
    button.setAttribute('aria-label', `O que é ${HELP[key].title}?`);
    button.addEventListener('click', () => this.openHelp(key, button));
    return button;
  }

  private openHelp(key: HelpKey, from: HTMLElement): void {
    const entry = HELP[key];
    this.help.querySelector('#help-title')!.textContent = entry.title;
    this.help.querySelector('#help-what')!.textContent = entry.what;
    this.help.querySelector('#help-in-app')!.textContent = entry.inApp;
    this.helpReturnFocus = from;
    this.help.hidden = false;
    this.help.querySelector<HTMLElement>('#help-title')!.focus();
  }

  private closeHelp(): void {
    if (this.help.hidden) return;
    this.help.hidden = true;
    this.helpReturnFocus?.focus();
    this.helpReturnFocus = null;
  }

  private refresh(): void {
    for (const fn of this.refreshers) fn();
    this.resetBtn.disabled = isDefaultAdjustments(this.values);
  }

  private emit(): void {
    this.resetBtn.disabled = isDefaultAdjustments(this.values);
    this.callbacks.onAdjust(cloneAdjustments(this.values));
  }
}
