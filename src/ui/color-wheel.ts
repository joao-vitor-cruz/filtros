/**
 * Roda de cor: o ângulo do ponto escolhe o matiz (0° = vermelho, no topo, em
 * sentido horário) e a distância do centro escolhe a força (0 no centro, 1 na borda).
 */
export class ColorWheel {
  readonly element: HTMLElement;
  private readonly handle: HTMLElement;
  private hue = 0;
  private amount = 0;

  constructor(private readonly onChange: (hue: number, amount: number) => void) {
    this.element = document.createElement('div');
    this.element.className = 'color-wheel';
    this.element.tabIndex = 0;
    this.element.setAttribute('role', 'slider');
    this.element.setAttribute('aria-label', 'Roda de cor: setas para os lados mudam a cor, para cima e para baixo a força');
    this.handle = document.createElement('span');
    this.handle.className = 'color-wheel-handle';
    this.element.append(this.handle);

    const fromPointer = (e: PointerEvent) => {
      const rect = this.element.getBoundingClientRect();
      const r = rect.width / 2;
      const dx = e.clientX - (rect.left + r);
      const dy = e.clientY - (rect.top + r);
      const hue = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
      const amount = Math.min(1, Math.hypot(dx, dy) / r);
      this.update(hue, amount < 0.04 ? 0 : amount); // perto do centro "gruda" no zero
    };
    this.element.addEventListener('pointerdown', (e) => {
      this.element.setPointerCapture(e.pointerId);
      fromPointer(e);
    });
    this.element.addEventListener('pointermove', (e) => {
      if (this.element.hasPointerCapture(e.pointerId)) fromPointer(e);
    });
    this.element.addEventListener('dblclick', () => this.update(this.hue, 0));
    this.element.addEventListener('keydown', (e) => {
      const steps: Record<string, [number, number]> = {
        ArrowRight: [5, 0],
        ArrowLeft: [-5, 0],
        ArrowUp: [0, 0.05],
        ArrowDown: [0, -0.05],
      };
      const step = steps[e.key];
      if (!step) return;
      e.preventDefault();
      this.update((this.hue + step[0] + 360) % 360, Math.min(1, Math.max(0, this.amount + step[1])));
    });
  }

  set(hue: number, amount: number): void {
    this.hue = hue;
    this.amount = amount;
    const rad = (hue * Math.PI) / 180;
    this.handle.style.left = `${50 + Math.sin(rad) * amount * 50}%`;
    this.handle.style.top = `${50 - Math.cos(rad) * amount * 50}%`;
    this.element.setAttribute('aria-valuetext', amount === 0 ? 'Sem cor' : `Matiz ${Math.round(hue)} graus, força ${Math.round(amount * 100)}%`);
    this.element.classList.toggle('active', amount > 0);
  }

  private update(hue: number, amount: number): void {
    this.set(hue, amount);
    this.onChange(hue, amount);
  }
}
