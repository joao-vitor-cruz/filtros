import { Camera, CameraError, countVideoInputs } from './camera';
import { errorMessages } from './messages';
import { Renderer } from './renderer/renderer';
import { FpsMeter } from './fps';

type AppState = 'loading' | 'running' | 'error';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

const app = $<HTMLElement>('.app');
const video = $<HTMLVideoElement>('.source');
const canvas = $<HTMLCanvasElement>('.preview');
const fpsLabel = $<HTMLOutputElement>('#fps');
const switchBtn = $<HTMLButtonElement>('#switch-camera');
const loading = $<HTMLElement>('#loading');
const errorBox = $<HTMLElement>('#error');
const errorTitle = $<HTMLElement>('#error-title');
const errorMessage = $<HTMLElement>('#error-message');
const retryBtn = $<HTMLButtonElement>('#retry');

const camera = new Camera(video);
let cameraCount = 0;

// Sem WebGL (raro), o próprio <video> vira o preview, ainda sem filtros.
let renderer: Renderer | null = null;
try {
  renderer = new Renderer(canvas, video);
} catch (err) {
  console.warn('WebGL indisponível, usando o vídeo direto.', err);
}
app.dataset.render = renderer ? (renderer.isWebGL2 ? 'webgl2' : 'webgl') : 'video';

// Medidor de fps para testes em aparelhos: abra a página com ?debug.
if (renderer && new URLSearchParams(location.search).has('debug')) {
  const meter = new FpsMeter();
  let lastUpdate = 0;
  fpsLabel.hidden = false;
  renderer.setFrameListener((now) => {
    meter.tick(now);
    if (now - lastUpdate < 500) return;
    lastUpdate = now;
    fpsLabel.textContent =
      `${meter.fps.toFixed(0)} fps · ${app.dataset.render}\n` +
      `vídeo ${video.videoWidth}×${video.videoHeight} · tela ${canvas.width}×${canvas.height}`;
  });
}

function setState(state: AppState): void {
  app.dataset.state = state;
  loading.hidden = state !== 'loading';
  errorBox.hidden = state !== 'error';
}

function showError(err: unknown): void {
  const kind = err instanceof CameraError ? err.kind : 'unknown';
  const { title, message } = errorMessages[kind];
  errorTitle.textContent = title;
  errorMessage.textContent = message;
  setState('error');
  console.error(err);
}

/**
 * Espelha o preview quando a câmera aponta para o usuário, como um espelho.
 * Webcams de computador não informam o lado; nesse caso, com uma única câmera,
 * assumimos que é frontal.
 */
function updateMirror(): void {
  const reported = camera.reportedFacing;
  const mirrored = reported ? reported === 'user' : cameraCount <= 1 || camera.facing === 'user';
  if (renderer) renderer.mirrored = mirrored;
  video.classList.toggle('mirrored', mirrored && !renderer);
}

async function startCamera(facing = camera.facing): Promise<void> {
  setState('loading');
  renderer?.stop();
  try {
    await camera.start(facing);
    if (!camera.active) return; // substituído por uma chamada mais recente
    // Só depois da permissão o navegador revela quantas câmeras existem.
    cameraCount = await countVideoInputs();
    switchBtn.hidden = cameraCount < 2;
    updateMirror();
    renderer?.start();
    setState('running');
  } catch (err) {
    showError(err);
  }
}

switchBtn.addEventListener('click', async () => {
  switchBtn.disabled = true;
  await startCamera(camera.facing === 'user' ? 'environment' : 'user');
  switchBtn.disabled = false;
});

retryBtn.addEventListener('click', () => startCamera());

// Desliga a câmera quando o app vai para segundo plano (economiza bateria
// e apaga o indicador de câmera) e religa ao voltar.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    renderer?.stop();
    camera.cancel();
  } else if (app.dataset.state !== 'error') {
    startCamera();
  }
});

startCamera('environment');
