type Handlers = {
  /** Início da pinça: devolve o zoom atual, usado como base. */
  start: () => number;
  /** Novo zoom = base × (distância atual ÷ distância inicial entre os dedos). */
  change: (zoom: number) => void;
};

/** Gesto de pinça com dois dedos (Pointer Events, funciona no iPhone e no Android). */
export function onPinch(target: HTMLElement, handlers: Handlers): void {
  const points = new Map<number, { x: number; y: number }>();
  let base = 1;
  let startDistance = 0;

  const distance = () => {
    const [a, b] = [...points.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  target.addEventListener('pointerdown', (e) => {
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (points.size === 2) {
      startDistance = distance();
      base = handlers.start();
    }
  });

  target.addEventListener('pointermove', (e) => {
    if (!points.has(e.pointerId)) return;
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (points.size === 2 && startDistance > 0) handlers.change((base * distance()) / startDistance);
  });

  const end = (e: PointerEvent) => {
    points.delete(e.pointerId);
    if (points.size < 2) startDistance = 0;
  };
  target.addEventListener('pointerup', end);
  target.addEventListener('pointercancel', end);
}
