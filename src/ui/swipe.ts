const MIN_DISTANCE = 50; // px
const MAX_DURATION = 800; // ms

/**
 * Detecta deslizes horizontais rápidos. `direction` é +1 ao deslizar para a
 * esquerda (próximo) e -1 para a direita (anterior), como num carrossel.
 */
export function onHorizontalSwipe(target: HTMLElement, handler: (direction: 1 | -1) => void): void {
  let start: { x: number; y: number; t: number; id: number } | null = null;

  target.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    start = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId };
  });

  target.addEventListener('pointerup', (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = e.timeStamp - start.t;
    start = null;
    if (dt <= MAX_DURATION && Math.abs(dx) >= MIN_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      handler(dx < 0 ? 1 : -1);
    }
  });

  target.addEventListener('pointercancel', () => {
    start = null;
  });
}
