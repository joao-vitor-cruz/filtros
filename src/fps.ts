/** Média móvel de quadros por segundo, calculada a partir dos instantes de cada frame. */
export class FpsMeter {
  private times: number[] = [];

  constructor(private readonly windowSize = 30) {}

  tick(now: number): void {
    this.times.push(now);
    if (this.times.length > this.windowSize) this.times.shift();
  }

  get fps(): number {
    const n = this.times.length;
    if (n < 2) return 0;
    const elapsed = this.times[n - 1] - this.times[0];
    return elapsed > 0 ? ((n - 1) * 1000) / elapsed : 0;
  }

  reset(): void {
    this.times = [];
  }
}
