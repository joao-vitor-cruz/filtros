/** Formatos em ordem de preferência: MP4 toca na galeria de qualquer celular; WebM é o plano B. */
const MIME_TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

/** Gravação para sozinha nesse tempo (o vídeo fica na memória até ser salvo). */
export const MAX_RECORDING_MS = 3 * 60 * 1000;

export function pickMimeType(isSupported: (type: string) => boolean): string | null {
  return MIME_TYPES.find((type) => isSupported(type)) ?? null;
}

export function videoExtension(mimeType: string): 'mp4' | 'webm' {
  return mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
}

/** "00:07", "02:35". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function canRecordVideo(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    pickMimeType((t) => MediaRecorder.isTypeSupported(t)) !== null
  );
}

export type Recording = { blob: Blob; mimeType: string; withAudio: boolean };

/**
 * Grava o que aparece no canvas (o preview já filtrado) com o som do microfone.
 * Assim o vídeo sai exatamente como o usuário vê, inclusive trocando de filtro
 * ou dando zoom durante a gravação.
 */
export class Recorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private tracks: MediaStreamTrack[] = [];
  private startedAt = 0;
  private withAudio = false;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  get recording(): boolean {
    return this.recorder?.state === 'recording';
  }

  get elapsed(): number {
    return this.recording ? performance.now() - this.startedAt : 0;
  }

  /** Começa a gravar. Retorna se conseguiu o microfone (sem ele, grava sem som). */
  async start(): Promise<boolean> {
    if (this.recorder) throw new Error('Já está gravando');
    const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
    if (!mimeType) throw new Error('Gravação de vídeo indisponível');

    const video = this.canvas.captureStream(30);
    let audio: MediaStream | null = null;
    try {
      audio = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      // Microfone negado ou indisponível: segue só com a imagem.
    }

    this.tracks = [...video.getVideoTracks(), ...(audio?.getAudioTracks() ?? [])];
    this.withAudio = !!audio;
    this.chunks = [];
    const recorder = new MediaRecorder(new MediaStream(this.tracks), {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    });
    recorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    });
    recorder.start(1000); // entrega pedaços a cada segundo: nada se perde se parar de repente
    this.recorder = recorder;
    this.startedAt = performance.now();
    return this.withAudio;
  }

  /** Para a gravação e devolve o vídeo. */
  async stop(): Promise<Recording | null> {
    const recorder = this.recorder;
    if (!recorder) return null;
    const stopped = new Promise<void>((resolve) => recorder.addEventListener('stop', () => resolve(), { once: true }));
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;
    this.tracks.forEach((t) => t.stop());
    this.tracks = [];
    this.recorder = null;

    const mimeType = recorder.mimeType || 'video/webm';
    const blob = new Blob(this.chunks, { type: mimeType.split(';')[0] });
    this.chunks = [];
    return blob.size > 0 ? { blob, mimeType, withAudio: this.withAudio } : null;
  }
}
