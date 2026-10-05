import type { CurvePoint } from '../edit/adjustments';
import { curveFunction } from '../edit/curves';

const HIT_RADIUS = 22; // px: distância para pegar um ponto com o dedo
const MIN_GAP = 0.02; // pontos não podem encostar uns nos outros no eixo x
const DOUBLE_TAP_MS = 350;
const PAD = 10; // px de margem: os pontos das pontas aparecem inteiros

/**
 * Editor de curva: toque numa área vazia cria um ponto, arrastar move,
 * toque duplo num ponto do meio apaga. As pontas só se movem na vertical.
 */
export class CurveEditor {
  readonly element: HTMLCanvasElement;
  private points: CurvePoint[] = [
    [0, 0],
    [1, 1],
  ];
  private color = '#ffffff';
  private dragging: number | null = null;
  private lastTap = { index: -1, time: 0 };

  constructor(private readonly onChange: (points: CurvePoint[]) => void) {
    const canvas = document.createElement('canvas');
    canvas.className = 'curve-editor';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Curva: toque para criar um ponto, arraste para mover, toque duas vezes para apagar');
    this.element = canvas;

    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    const end = () => (this.dragging = null);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    new ResizeObserver(() => this.draw()).observe(canvas);
  }

  set(points: CurvePoint[], color: string): void {
    this.points = points.map((p) => [...p] as CurvePoint);
    this.color = color;
    this.draw();
  }

  /** Área útil do gráfico na tela (sem a margem). */
  private area(): { left: number; top: number; size: number } {
    const rect = this.element.getBoundingClientRect();
    return { left: rect.left + PAD, top: rect.top + PAD, size: rect.width - PAD * 2 };
  }

  private toCurve(e: PointerEvent): [number, number] {
    const { left, top, size } = this.area();
    return [
      Math.min(Math.max((e.clientX - left) / size, 0), 1),
      Math.min(Math.max(1 - (e.clientY - top) / size, 0), 1),
    ];
  }

  private nearest(e: PointerEvent): number {
    const { left, top, size } = this.area();
    let best = -1;
    let bestDist = HIT_RADIUS;
    this.points.forEach(([x, y], i) => {
      const d = Math.hypot(left + x * size - e.clientX, top + (1 - y) * size - e.clientY);
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    });
    return best;
  }

  private onDown(e: PointerEvent): void {
    this.element.setPointerCapture(e.pointerId);
    let index = this.nearest(e);
    const interior = index > 0 && index < this.points.length - 1;

    if (index >= 0 && interior && this.lastTap.index === index && e.timeStamp - this.lastTap.time < DOUBLE_TAP_MS) {
      this.points.splice(index, 1);
      this.lastTap = { index: -1, time: 0 };
      this.commit();
      return;
    }

    if (index < 0) {
      const [x, y] = this.toCurve(e);
      const at = this.points.findIndex((p) => p[0] > x);
      const prev = this.points[at - 1];
      const next = this.points[at];
      if (!prev || !next || x - prev[0] < MIN_GAP || next[0] - x < MIN_GAP) return;
      this.points.splice(at, 0, [x, y]);
      index = at;
      this.commit();
    }
    this.lastTap = { index, time: e.timeStamp };
    this.dragging = index;
  }

  private onMove(e: PointerEvent): void {
    if (this.dragging === null) return;
    const i = this.dragging;
    const [x, y] = this.toCurve(e);
    const last = this.points.length - 1;
    const px =
      i === 0 ? 0 : i === last ? 1 : Math.min(Math.max(x, this.points[i - 1][0] + MIN_GAP), this.points[i + 1][0] - MIN_GAP);
    this.points[i] = [px, y];
    this.commit();
  }

  private commit(): void {
    this.draw();
    this.onChange(this.points.map((p) => [...p] as CurvePoint));
  }

  private draw(): void {
    const canvas = this.element;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const size = canvas.clientWidth;
    if (!size) return;
    if (canvas.width !== Math.round(size * dpr)) {
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Desenha numa área com margem: (0,0) da curva fica em (pad, pad + w).
    const pad = PAD * dpr;
    const w = canvas.width - pad * 2;
    ctx.save();
    ctx.translate(pad, pad);

    // Grade em quartos e a diagonal (curva neutra).
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = dpr;
    for (let i = 1; i < 4; i++) {
      const p = (w * i) / 4;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, w);
      ctx.moveTo(0, p);
      ctx.lineTo(w, p);
      ctx.stroke();
    }
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(0, w);
    ctx.lineTo(w, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    const f = curveFunction(this.points);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5 * dpr;
    ctx.beginPath();
    for (let i = 0; i <= 128; i++) {
      const x = i / 128;
      const px = x * w;
      const py = (1 - f(x)) * w;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    for (const [x, y] of this.points) {
      ctx.beginPath();
      ctx.arc(x * w, (1 - y) * w, 6 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.fill();
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = this.color;
      ctx.stroke();
    }
    ctx.restore();
  }
}
