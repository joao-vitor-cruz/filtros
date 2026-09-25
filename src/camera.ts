export type Facing = 'user' | 'environment';

export type CameraErrorKind =
  | 'unsupported' // navegador sem getUserMedia ou página fora de HTTPS
  | 'denied' // usuário ou sistema negou a permissão
  | 'not-found' // nenhuma câmera disponível
  | 'in-use' // câmera ocupada por outro app
  | 'unknown';

export class CameraError extends Error {
  constructor(
    readonly kind: CameraErrorKind,
    cause?: unknown,
  ) {
    super(kind, { cause });
    this.name = 'CameraError';
  }
}

/** Resolução do preview. A foto em alta resolução é tratada na fase 5. */
const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 720;

export function buildConstraints(facing: Facing): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: { ideal: facing },
      width: { ideal: PREVIEW_WIDTH },
      height: { ideal: PREVIEW_HEIGHT },
    },
  };
}

export function classifyError(err: unknown): CameraErrorKind {
  const name = err instanceof Error || err instanceof DOMException ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'not-found';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'in-use';
    default:
      return 'unknown';
  }
}

export function isCameraSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/**
 * Controla o stream da câmera ligado a um <video>.
 * Chamadas sobrepostas de start() (ex.: tocar várias vezes em "trocar câmera")
 * são resolvidas mantendo apenas a mais recente.
 */
export class Camera {
  private stream: MediaStream | null = null;
  private request = 0;
  private _facing: Facing = 'environment';
  private _reportedFacing: Facing | undefined;

  constructor(readonly video: HTMLVideoElement) {
    // Necessários para o Safari/iOS tocar o vídeo inline e sem gesto do usuário.
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.setAttribute('playsinline', '');
  }

  get facing(): Facing {
    return this._facing;
  }

  /** Lado informado pelo próprio navegador; webcams de computador geralmente não informam. */
  get reportedFacing(): Facing | undefined {
    return this._reportedFacing;
  }

  get active(): boolean {
    return this.stream !== null;
  }

  async start(facing: Facing = this._facing): Promise<void> {
    if (!isCameraSupported()) throw new CameraError('unsupported');

    const id = ++this.request;
    this.stop();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(buildConstraints(facing));
    } catch (err) {
      if (id !== this.request) return;
      throw new CameraError(classifyError(err), err);
    }

    // Outra chamada começou enquanto esperávamos: descarta este stream.
    if (id !== this.request) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    this.stream = stream;
    this._reportedFacing = facingOf(stream);
    this._facing = this._reportedFacing ?? facing;
    this.video.srcObject = stream;
    try {
      await this.video.play();
    } catch {
      // Alguns navegadores rejeitam play() mesmo com autoplay; o vídeo
      // ainda começa quando houver interação, então não é fatal.
    }
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }

  /** Invalida qualquer start() pendente e desliga a câmera. */
  cancel(): void {
    this.request++;
    this.stop();
  }

  async switchFacing(): Promise<void> {
    await this.start(this._facing === 'user' ? 'environment' : 'user');
  }
}

/** Lê para qual lado a câmera obtida realmente aponta, quando o navegador informa. */
function facingOf(stream: MediaStream): Facing | undefined {
  const mode = stream.getVideoTracks()[0]?.getSettings().facingMode;
  return mode === 'user' || mode === 'environment' ? mode : undefined;
}

export async function countVideoInputs(): Promise<number> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput').length;
  } catch {
    return 0;
  }
}
