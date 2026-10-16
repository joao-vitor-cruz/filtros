/** Intervalo máximo entre os dois toques de um toque duplo. */
export const DOUBLE_TAP_MS = 260;

type Handlers = { single: () => void; double: () => void };

/**
 * Separa toque simples de toque duplo. O toque simples só dispara depois da
 * janela do toque duplo; com `immediate` (teclado, gravação em andamento),
 * dispara na hora.
 */
export function createTapClassifier({ single, double }: Handlers, windowMs = DOUBLE_TAP_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  return {
    tap(immediate = false): void {
      if (immediate) {
        clear();
        single();
      } else if (timer !== null) {
        clear();
        double();
      } else {
        timer = setTimeout(() => {
          timer = null;
          single();
        }, windowMs);
      }
    },
  };
}
