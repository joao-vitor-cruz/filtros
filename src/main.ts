import { Camera, CameraError, countVideoInputs } from './camera';
import { errorMessages } from './messages';
import { Renderer } from './renderer/renderer';
import { FpsMeter } from './fps';
import {
  filterOptions,
  loadAdjustments,
  loadIntensity,
  loadMirrorPhotos,
  loadSelectedId,
  saveAdjustments,
  saveIntensity,
  saveMirrorPhotos,
  saveSelectedId,
  wrapIndex,
} from './state';
import { cssGradient, isValidPalette, type Palette } from './palette/palette';
import { PRESETS } from './palette/presets';
import type { FilterMode } from './filter';
import {
  loadCustomPalettes,
  newPaletteId,
  normalizeName,
  saveCustomPalettes,
  suggestName,
} from './palette/storage';
import { onHorizontalSwipe } from './ui/swipe';
import { PalettePicker } from './ui/palette-picker';
import { PaletteEditor, type PaletteDraft } from './ui/palette-editor';
import { SettingsPanel } from './ui/settings';
import { captureVideoFrame, encodeJpeg, photoFileName } from './capture/image';
import { savePhoto } from './capture/save';

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
const toast = $<HTMLElement>('#filter-toast');
const toastSwatch = $<HTMLElement>('#filter-swatch');
const toastName = $<HTMLElement>('#filter-name');
const pickerRoot = $<HTMLElement>('#palette-picker');
const intensityRow = $<HTMLElement>('#intensity-row');
const intensityInput = $<HTMLInputElement>('#intensity');
const intensityValue = $<HTMLOutputElement>('#intensity-value');
const shutterBtn = $<HTMLButtonElement>('#shutter');
const flash = $<HTMLElement>('#flash');
const review = $<HTMLElement>('#review');
const reviewImage = $<HTMLImageElement>('#review-image');
const reviewClose = $<HTMLButtonElement>('#review-close');
const saveBtn = $<HTMLButtonElement>('#save');
const notice = $<HTMLElement>('#notice');
const editorRoot = $<HTMLElement>('#editor');
const settingsRoot = $<HTMLElement>('#settings');
const settingsBtn = $<HTMLButtonElement>('#open-settings');

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

// Filtros: "Original" + paletas prontas + paletas do usuário.
// Começa no último usado ou na primeira paleta pronta.
let customPalettes = loadCustomPalettes();
let options = filterOptions([...PRESETS, ...customPalettes]);
let selected = options.findIndex((o) => o.id === loadSelectedId());
if (selected < 0) selected = 1;
let intensity = loadIntensity();
let toastTimer = 0;

const picker = new PalettePicker(pickerRoot, options, {
  onSelect: (index) => selectFilter(index, false),
  onEdit: (index) => openEditor(index),
  onCreate: () => openEditor(null),
});

function applyToRenderer(): void {
  if (!renderer) return;
  const option = options[selected];
  // "Original" é o próprio filtro com intensidade zero.
  renderer.intensity = option.palette ? intensity : 0;
  renderer.draw();
}

function updateIntensityUi(): void {
  const percent = Math.round(intensity * 100);
  intensityInput.value = String(percent);
  intensityInput.style.setProperty('--fill', `${percent}%`);
  intensityValue.textContent = `${percent}%`;
  const disabled = !options[selected].palette;
  intensityInput.disabled = disabled;
  intensityRow.classList.toggle('disabled', disabled);
}

function showToast(index: number): void {
  const option = options[index];
  toastName.textContent = option.name;
  toastSwatch.style.background = option.palette
    ? cssGradient(option.palette.colors, '135deg')
    : 'transparent';
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 1200);
}

/** `announce`: mostra o nome no meio da tela (útil ao deslizar, quando o carrossel não está em foco). */
function selectFilter(index: number, announce: boolean, smooth = true): void {
  selected = index;
  const option = options[index];
  if (renderer && option.palette) renderer.setPalette(option.palette.colors, option.palette.mode);
  applyToRenderer();
  picker.select(index, smooth);
  updateIntensityUi();
  saveSelectedId(option.id);
  if (announce) showToast(index);
}

function stepFilter(direction: 1 | -1): void {
  if (app.dataset.state !== 'running' || photo || app.dataset.sheet) return;
  selectFilter(wrapIndex(selected, direction, options.length), true);
}

intensityInput.addEventListener('input', () => {
  intensity = Number(intensityInput.value) / 100;
  updateIntensityUi();
  applyToRenderer();
});
intensityInput.addEventListener('change', () => saveIntensity(intensity));

if (renderer) {
  selectFilter(selected, false, false);
  onHorizontalSwipe(canvas, stepFilter);
  document.addEventListener('keydown', (e) => {
    // Não interfere quando o foco está no controle de intensidade ou no carrossel.
    if (e.target instanceof HTMLInputElement || (e.target as Element).closest?.('.palette-picker')) return;
    if (e.key === 'ArrowRight') stepFilter(1);
    else if (e.key === 'ArrowLeft') stepFilter(-1);
  });
  // Setas dentro do carrossel movem a seleção entre os itens (padrão de radiogroup).
  pickerRoot.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    selectFilter(wrapIndex(selected, e.key === 'ArrowRight' ? 1 : -1, options.length), false);
    pickerRoot.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  });
} else {
  // Sem WebGL não há filtros: esconde os controles que não teriam efeito.
  pickerRoot.hidden = true;
  intensityRow.hidden = true;
}

// ---------- Editor de paletas ----------

/** Paleta sendo editada; null ao criar uma nova. */
let editingId: string | null = null;

const editor = new PaletteEditor(editorRoot, {
  onPreview: previewPalette,
  onSave: savePalette,
  onDelete: deletePalette,
  onCancel: closeEditor,
});

function openEditor(index: number | null): void {
  if (photo || app.dataset.sheet) return;
  const palette = index === null ? null : options[index].palette;
  if (index !== null && (!palette || palette.builtIn)) return;
  editingId = palette?.id ?? null;
  // Uma paleta nova começa com as cores do filtro atual, para servir de ponto de partida.
  const base = palette ?? options[selected].palette;
  const draft: PaletteDraft = palette
    ? { name: palette.name, colors: palette.colors, mode: palette.mode }
    : {
        name: suggestName(customPalettes),
        colors: base ? base.colors : ['#1d3557', '#e63946', '#f1faee'],
        mode: base?.mode ?? 'gradient',
      };
  app.dataset.sheet = 'editor';
  editor.open(draft, palette ? 'edit' : 'create');
  previewPalette(draft.colors, draft.mode);
}

function previewPalette(colors: string[], mode: FilterMode): void {
  if (!renderer || !isValidPalette(colors)) return;
  renderer.setPalette(colors, mode);
  // Mostra a paleta mesmo se o filtro atual for "Original" ou a intensidade estiver em zero.
  renderer.intensity = intensity > 0 ? intensity : 1;
  renderer.draw();
}

function closeEditor(): void {
  editor.close();
  delete app.dataset.sheet;
  editingId = null;
  selectFilter(selected, false, false); // devolve a paleta escolhida ao preview
  picker.focusSelected();
}

/** Recria a lista de filtros e seleciona o de `id` (ou o índice `fallback`). */
function refreshOptions(id: string | null, fallback: number): void {
  options = filterOptions([...PRESETS, ...customPalettes]);
  picker.setOptions(options);
  const index = options.findIndex((o) => o.id === id);
  selected = index >= 0 ? index : Math.min(Math.max(fallback, 0), options.length - 1);
}

function persist(message: string): void {
  showNotice(saveCustomPalettes(customPalettes) ? message : 'Paleta criada, mas este navegador não permitiu guardá-la');
}

function savePalette(draft: PaletteDraft): void {
  if (!isValidPalette(draft.colors)) return;
  const others = customPalettes.filter((p) => p.id !== editingId);
  const palette: Palette = {
    id: editingId ?? newPaletteId(),
    name: normalizeName(draft.name, suggestName(others)),
    colors: draft.colors,
    mode: draft.mode,
    builtIn: false,
  };
  customPalettes = editingId
    ? customPalettes.map((p) => (p.id === editingId ? palette : p))
    : [...customPalettes, palette];
  persist('Paleta salva');
  refreshOptions(palette.id, selected);
  closeEditor();
}

function deletePalette(): void {
  const palette = customPalettes.find((p) => p.id === editingId);
  if (!palette || !confirm(`Excluir a paleta "${palette.name}"?`)) return;
  const index = options.findIndex((o) => o.id === palette.id);
  customPalettes = customPalettes.filter((p) => p.id !== palette.id);
  persist('Paleta excluída');
  refreshOptions(null, index - 1); // fica no filtro vizinho
  closeEditor();
}

// ---------- Ajustes ----------

let adjustments = loadAdjustments();
let mirrorPhotos = loadMirrorPhotos();
if (renderer) renderer.adjustments = adjustments;

const settings = new SettingsPanel(settingsRoot, {
  onAdjust: (value) => {
    adjustments = value;
    saveAdjustments(value);
    if (renderer) {
      renderer.adjustments = value;
      renderer.draw();
    }
  },
  onMirrorChange: (value) => {
    mirrorPhotos = value;
    saveMirrorPhotos(value);
  },
  onClose: () => {
    settings.close();
    delete app.dataset.sheet;
    settingsBtn.focus();
  },
});

settingsBtn.addEventListener('click', () => {
  if (photo || app.dataset.sheet) return;
  app.dataset.sheet = 'settings';
  settings.open(adjustments, mirrorPhotos);
});
// Sem WebGL não há filtros para ajustar.
settingsBtn.hidden = !renderer;

// ---------- Foto ----------

let photo: { blob: Blob; url: string; name: string } | null = null;
let noticeTimer = 0;

function showNotice(text: string): void {
  notice.textContent = text;
  notice.classList.add('visible');
  clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => notice.classList.remove('visible'), 2000);
}

function playFlash(): void {
  flash.classList.remove('active');
  void flash.offsetWidth; // reinicia a animação
  flash.classList.add('active');
  navigator.vibrate?.(30); // não existe no iOS; ignorado lá
}

async function takePhoto(): Promise<void> {
  if (app.dataset.state !== 'running' || photo) return;
  shutterBtn.disabled = true;
  try {
    // A foto só sai espelhada se o preview estiver espelhado e o usuário quiser assim.
    const image = renderer
      ? renderer.capture({ mirrored: renderer.mirrored && mirrorPhotos })
      : captureVideoFrame(video, video.classList.contains('mirrored') && mirrorPhotos);
    if (!image) throw new Error('Sem imagem da câmera');
    playFlash();
    const blob = await encodeJpeg(image);
    photo = { blob, url: URL.createObjectURL(blob), name: photoFileName() };
    reviewImage.src = photo.url;
    review.hidden = false;
    renderer?.stop(); // a câmera fica ligada, mas a GPU descansa enquanto a foto é revisada
    saveBtn.focus();
  } catch (err) {
    console.error(err);
    showNotice('Não foi possível tirar a foto');
  } finally {
    shutterBtn.disabled = app.dataset.state !== 'running';
  }
}

function closeReview(): void {
  if (!photo) return;
  URL.revokeObjectURL(photo.url);
  photo = null;
  review.hidden = true;
  reviewImage.removeAttribute('src');
  if (app.dataset.state === 'running') renderer?.start();
  shutterBtn.focus();
}

async function saveCurrentPhoto(): Promise<void> {
  if (!photo) return;
  saveBtn.disabled = true;
  try {
    const result = await savePhoto(photo.blob, photo.name);
    if (result === 'saved') {
      closeReview();
      showNotice('Foto salva');
    }
  } catch (err) {
    console.error(err);
    showNotice('Não foi possível salvar');
  } finally {
    saveBtn.disabled = false;
  }
}

shutterBtn.addEventListener('click', takePhoto);
saveBtn.addEventListener('click', saveCurrentPhoto);
reviewClose.addEventListener('click', closeReview);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeReview();
});

function setState(state: AppState): void {
  app.dataset.state = state;
  shutterBtn.disabled = state !== 'running';
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
    if (!photo) renderer?.start();
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
