import { Camera, CameraError, countVideoInputs } from './camera';
import { errorMessages } from './messages';
import { Renderer } from './renderer/renderer';
import { FpsMeter } from './fps';
import {
  filterOptions,
  loadAdjustments,
  loadDrawerHintSeen,
  loadIntensity,
  loadMirrorPhotos,
  loadSelectedId,
  loadSettingsHintSeen,
  saveAdjustments,
  saveDrawerHintSeen,
  saveIntensity,
  saveMirrorPhotos,
  saveSelectedId,
  saveSettingsHintSeen,
  wrapIndex,
} from './state';
import { isValidPalette, type Palette } from './palette/palette';
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
import { createTapClassifier } from './ui/double-tap';
import { PalettePicker } from './ui/palette-picker';
import { iconBackground, PaletteEditor, type PaletteDraft } from './ui/palette-editor';
import { SettingsPanel } from './ui/settings';
import { defaultAdjustments } from './edit/adjustments';
import { captureVideoFrame, encodeJpeg, loadImageFile, photoFileName } from './capture/image';
import { saveFile } from './capture/save';
import { canRecordVideo, formatDuration, MAX_RECORDING_MS, Recorder, videoExtension } from './capture/recorder';
import { clampZoom, DIGITAL_ZOOM, formatZoom, hardwareRange, type ZoomRange } from './zoom';
import { onPinch } from './ui/pinch';
import { buildExport, exportFileName, ImportError, mergePalettes, parseImport } from './palette/transfer';
import { registerServiceWorker } from './pwa';

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
const drawer = $<HTMLElement>('#palette-drawer');
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
const settingsBody = settingsRoot.querySelector<HTMLElement>('.sheet-body')!;
const galleryBtn = $<HTMLButtonElement>('#open-gallery');
const galleryInput = $<HTMLInputElement>('#gallery-input');
const gallerySaveBtn = $<HTMLButtonElement>('#gallery-save');
const galleryCloseBtn = $<HTMLButtonElement>('#gallery-close');
const errorGalleryBtn = $<HTMLButtonElement>('#error-gallery');
const captureModeRoot = $<HTMLElement>('#capture-mode');
const recTimer = $<HTMLElement>('#rec-timer');
const recTime = $<HTMLElement>('#rec-time');
const reviewVideo = $<HTMLVideoElement>('#review-video');
const reviewSound = $<HTMLButtonElement>('#review-sound');

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
      `vídeo ${video.videoWidth}×${video.videoHeight} · tela ${canvas.width}×${canvas.height} (máx ${renderer!.maxDpr}x)\n` +
      `versão ${__APP_VERSION__}`;
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
  onConfirm: (index) => {
    selectFilter(index, false);
    collapsePalettesSoon();
  },
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
    ? iconBackground(option.palette.colors, option.palette.icon)
    : 'transparent';
  toastSwatch.classList.toggle('has-icon', !!option.palette?.icon);
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

// ---------- Gaveta de filtros ----------
// Na câmera, as paletas ficam recolhidas para a tela mostrar só a imagem.
// Dois toques no disparo abrem a gaveta. Um toque numa paleta experimenta;
// dois toques escolhem e recolhem, assim como tocar em qualquer outro lugar.
// Com uma foto da galeria ela fica sempre aberta.

let drawerTimer = 0;
const palettesOpen = () => app.dataset.palettes === 'open';

function setPalettesOpen(open: boolean): void {
  if (!renderer) return;
  if (app.dataset.source === 'gallery') open = true;
  clearTimeout(drawerTimer);
  if (open === palettesOpen()) return;
  if (open) {
    // Escalona a entrada: os itens perto do filtro escolhido aparecem primeiro.
    pickerRoot.querySelectorAll<HTMLElement>('.palette-item').forEach((item, i) => {
      item.style.setProperty('--d', String(Math.min(Math.abs(i - selected), 8)));
    });
    app.dataset.palettes = 'open';
  } else {
    delete app.dataset.palettes;
  }
  drawer.inert = !open;
}

/** Depois de confirmar, deixa ver a seleção por um instante antes de recolher. */
function collapsePalettesSoon(): void {
  clearTimeout(drawerTimer);
  drawerTimer = window.setTimeout(() => setPalettesOpen(false), 220);
}

// Toque fora da gaveta (e fora do disparo, que tem o próprio gesto) recolhe.
document.addEventListener(
  'pointerdown',
  (e) => {
    const target = e.target as Node;
    if (palettesOpen() && !drawer.contains(target) && !shutterBtn.contains(target)) setPalettesOpen(false);
  },
  true,
);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && palettesOpen()) setPalettesOpen(false);
});

// ---------- Intensidade quase invisível ----------
// Fica discreta e acende enquanto o dedo está nela (ou no teclado).

let intensityIdle = 0;

function wakeIntensity(): void {
  clearTimeout(intensityIdle);
  intensityRow.classList.add('active');
}

function restIntensity(): void {
  if (!intensityRow.classList.contains('active')) return;
  clearTimeout(intensityIdle);
  intensityIdle = window.setTimeout(() => intensityRow.classList.remove('active'), 1200);
}

intensityRow.addEventListener('pointerdown', wakeIntensity);
intensityInput.addEventListener('input', wakeIntensity);
intensityInput.addEventListener('change', restIntensity);
intensityInput.addEventListener('blur', restIntensity);
// O dedo pode sair da faixa enquanto arrasta: escuta o soltar na janela toda.
window.addEventListener('pointerup', restIntensity);
window.addEventListener('pointercancel', restIntensity);

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
    ? { name: palette.name, colors: palette.colors, mode: palette.mode, icon: palette.icon }
    : {
        name: suggestName(customPalettes),
        colors: base ? base.colors : ['#1d3557', '#e63946', '#f1faee'],
        mode: base?.mode ?? 'gradient',
      };
  app.dataset.sheet = 'editor';
  setPalettesOpen(false);
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
    ...(draft.icon ? { icon: draft.icon } : {}),
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
let saveAdjustmentsTimer = 0;
renderer?.setAdjustments(adjustments);

const settings = new SettingsPanel(settingsRoot, {
  onAdjust: (value) => {
    adjustments = value;
    renderer?.setAdjustments(value);
    // Arrastar um controle gera muitos eventos: salva só quando para de mexer.
    clearTimeout(saveAdjustmentsTimer);
    saveAdjustmentsTimer = window.setTimeout(() => saveAdjustments(adjustments), 300);
  },
  onMirrorChange: (value) => {
    mirrorPhotos = value;
    saveMirrorPhotos(value);
  },
  onExport: exportPalettes,
  onImport: importPalettes,
  onClose: closeSettings,
});

function closeSettings(): void {
  if (app.dataset.sheet !== 'settings') return;
  settings.close();
  delete app.dataset.sheet;
  settingsBtn.focus();
}

settingsBtn.addEventListener('click', () => {
  if (photo || app.dataset.sheet) return;
  app.dataset.sheet = 'settings';
  setPalettesOpen(false);
  settings.open(adjustments, mirrorPhotos, customPalettes.length);
  fitPreviewAboveSheet();
  if (!loadSettingsHintSeen()) {
    showNotice('Arraste na imagem para ajustar. Segure para comparar. Toque para fechar.', 4500);
    saveSettingsHintSeen();
  }
});

// ---------- Gestos na câmera com os ajustes abertos ----------
// A imagem vira o controle: arrastar na horizontal ajusta o valor escolhido
// (área de toque muito maior que a barra), segurar mostra sem os ajustes
// para comparar, e um toque fecha o painel.

const DRAG_START_PX = 8;
const HOLD_MS = 280;

let previewGesture: {
  id: number;
  x: number;
  y: number;
  mode: 'pending' | 'drag' | 'hold';
  input: HTMLInputElement | null;
  startValue: number;
  timer: number;
} | null = null;

function setComparing(on: boolean): void {
  renderer?.setAdjustments(on ? defaultAdjustments() : adjustments);
  if (on) showNotice('Sem ajustes', 0);
  else hideNotice();
}

function endPreviewGesture(tap: boolean): void {
  const g = previewGesture;
  if (!g) return;
  previewGesture = null;
  clearTimeout(g.timer);
  if (g.mode === 'hold') setComparing(false);
  else if (g.mode === 'pending' && tap) closeSettings();
}

canvas.addEventListener('pointerdown', (e) => {
  if (app.dataset.sheet !== 'settings') return;
  // Segundo dedo é pinça (zoom): cancela o gesto em andamento.
  if (!e.isPrimary) {
    endPreviewGesture(false);
    return;
  }
  const input = settings.activeRange();
  previewGesture = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    mode: 'pending',
    input,
    startValue: input ? Number(input.value) : 0,
    timer: window.setTimeout(() => {
      if (previewGesture?.mode !== 'pending') return;
      previewGesture.mode = 'hold';
      setComparing(true);
    }, HOLD_MS),
  };
});

canvas.addEventListener('pointermove', (e) => {
  const g = previewGesture;
  if (!g || e.pointerId !== g.id) return;
  const dx = e.clientX - g.x;
  const dy = e.clientY - g.y;
  if (g.mode === 'pending') {
    if (Math.hypot(dx, dy) < DRAG_START_PX) return;
    clearTimeout(g.timer);
    // Arraste vertical (ou sem ajuste para mexer) não faz nada e não fecha.
    if (!g.input || Math.abs(dx) < Math.abs(dy)) {
      g.mode = 'drag';
      g.input = null;
      return;
    }
    g.mode = 'drag';
  }
  if (g.mode !== 'drag' || !g.input) return;
  // A largura da imagem na tela percorre a faixa inteira do ajuste.
  const { input } = g;
  const min = Number(input.min);
  const max = Number(input.max);
  const width = canvas.getBoundingClientRect().width;
  const value = Math.round(Math.min(max, Math.max(min, g.startValue + (dx / width) * (max - min))));
  if (String(value) === input.value) return;
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});

canvas.addEventListener('pointerup', (e) => {
  if (previewGesture?.id === e.pointerId) endPreviewGesture(true);
});
canvas.addEventListener('pointercancel', (e) => {
  if (previewGesture?.id === e.pointerId) endPreviewGesture(false);
});

// Com os ajustes abertos, a câmera encolhe para caber inteira acima do painel.
// É só uma escala visual (o canvas não muda de tamanho nem redesenha); o CSS anima.
const PREVIEW_GAP = 16;
const topBar = $<HTMLElement>('.top-bar');

function fitPreviewAboveSheet(): void {
  if (app.dataset.sheet !== 'settings') return;
  // O padding da barra do topo já inclui a área segura (notch) resolvida pelo navegador.
  const top = PREVIEW_GAP + parseFloat(getComputedStyle(topBar).paddingTop);
  // offsetHeight ignora a animação de subida: é a altura final do painel.
  const sheetTop = app.clientHeight - settingsBody.offsetHeight;
  const scale = Math.max(0.2, Math.min(1, (sheetTop - PREVIEW_GAP - top) / app.clientHeight));
  app.style.setProperty('--preview-scale', scale.toFixed(4));
  app.style.setProperty('--preview-y', `${Math.round(top)}px`);
}

// A altura do painel muda ao trocar de aba (curvas e rodas ocupam mais).
new ResizeObserver(fitPreviewAboveSheet).observe(settingsBody);
window.addEventListener('resize', fitPreviewAboveSheet);
// Sem WebGL não há filtros para ajustar.
settingsBtn.hidden = !renderer;

// ---------- Exportar e importar paletas ----------

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

async function exportPalettes(): Promise<void> {
  if (customPalettes.length === 0) return;
  try {
    const blob = new Blob([buildExport(customPalettes)], { type: 'application/json' });
    const result = await saveFile(blob, exportFileName());
    if (result === 'saved') showNotice(`${plural(customPalettes.length, 'paleta exportada', 'paletas exportadas')}`);
  } catch (err) {
    console.error(err);
    showNotice('Não foi possível exportar');
  }
}

const IMPORT_ERRORS: Record<ImportError['kind'], string> = {
  invalid: 'Esse arquivo não é de paletas do Filtros',
  empty: 'Nenhuma paleta válida nesse arquivo',
  'too-big': 'Arquivo grande demais para ser de paletas',
};

async function importPalettes(file: File): Promise<void> {
  let incoming;
  try {
    incoming = parseImport(await file.text());
  } catch (err) {
    showNotice(err instanceof ImportError ? IMPORT_ERRORS[err.kind] : 'Não foi possível ler o arquivo');
    return;
  }
  const result = mergePalettes(customPalettes, incoming);
  if (result.added === 0) {
    showNotice('Você já tem todas as paletas desse arquivo');
    return;
  }
  const currentId = options[selected].id;
  customPalettes = result.palettes;
  const message = plural(result.added, 'paleta importada', 'paletas importadas');
  persist(result.skipped > 0 ? `${message} (${result.skipped} já existia${result.skipped > 1 ? 'm' : ''})` : message);
  // Mantém o filtro que estava escolhido; as importadas entram no fim do carrossel.
  refreshOptions(currentId, selected);
  selectFilter(selected, false, false);
  settings.setPaletteCount(customPalettes.length);
}

// ---------- Foto ----------

/** Foto ou vídeo esperando o usuário salvar ou descartar. */
let photo: { blob: Blob; url: string; name: string; kind: 'image' | 'video' } | null = null;
let noticeTimer = 0;

/** `ms`: quanto tempo fica na tela; 0 deixa até `hideNotice()`. */
function showNotice(text: string, ms = 2000): void {
  notice.textContent = text;
  notice.classList.add('visible');
  clearTimeout(noticeTimer);
  if (ms > 0) noticeTimer = window.setTimeout(hideNotice, ms);
}

function hideNotice(): void {
  clearTimeout(noticeTimer);
  notice.classList.remove('visible');
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
    showReview({ blob, url: URL.createObjectURL(blob), name: photoFileName(), kind: 'image' });
  } catch (err) {
    console.error(err);
    showNotice('Não foi possível tirar a foto');
  } finally {
    shutterBtn.disabled = app.dataset.state !== 'running';
  }
}

function showReview(item: NonNullable<typeof photo>, withAudio = false): void {
  photo = item;
  const isVideo = item.kind === 'video';
  reviewImage.hidden = isVideo;
  reviewVideo.hidden = !isVideo;
  reviewSound.hidden = !isVideo || !withAudio;
  review.setAttribute('aria-label', isVideo ? 'Vídeo gravado' : 'Foto tirada');
  if (isVideo) {
    // Começa sem som (o navegador só permite tocar sozinho assim); o botão liga o som.
    reviewVideo.muted = true;
    reviewSound.setAttribute('aria-pressed', 'false');
    reviewVideo.src = item.url;
    reviewVideo.play().catch(() => {});
  } else {
    reviewImage.src = item.url;
  }
  review.hidden = false;
  renderer?.stop(); // a câmera fica ligada, mas a GPU descansa durante a revisão
  saveBtn.focus();
}

function closeReview(): void {
  if (!photo) return;
  URL.revokeObjectURL(photo.url);
  photo = null;
  review.hidden = true;
  reviewImage.removeAttribute('src');
  reviewVideo.pause();
  reviewVideo.removeAttribute('src');
  reviewVideo.load();
  if (app.dataset.state === 'running') renderer?.start();
  shutterBtn.focus();
}

async function saveCurrentPhoto(): Promise<void> {
  if (!photo) return;
  saveBtn.disabled = true;
  try {
    const { kind } = photo;
    const result = await saveFile(photo.blob, photo.name);
    if (result === 'saved') {
      closeReview();
      showNotice(kind === 'video' ? 'Vídeo salvo' : 'Foto salva');
    }
  } catch (err) {
    console.error(err);
    showNotice('Não foi possível salvar');
  } finally {
    saveBtn.disabled = false;
  }
}

// ---------- Vídeo ----------

let captureMode: 'photo' | 'video' = 'photo';
const recorder = new Recorder(canvas);
let recInterval = 0;

function setCaptureMode(mode: 'photo' | 'video'): void {
  if (recorder.recording) return;
  captureMode = mode;
  for (const button of captureModeRoot.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
    button.setAttribute('aria-checked', String(button.dataset.mode === mode));
  }
  shutterBtn.classList.toggle('video', mode === 'video');
  shutterBtn.setAttribute('aria-label', mode === 'video' ? 'Começar a gravar' : 'Tirar foto');
}

async function startRecording(): Promise<void> {
  if (app.dataset.state !== 'running' || photo || recorder.recording || !renderer) return;
  shutterBtn.disabled = true;
  try {
    const withAudio = await recorder.start();
    if (!withAudio) showNotice('Gravando sem som (microfone não liberado)');
    app.dataset.recording = 'true';
    renderer.holdQuality = true;
    shutterBtn.classList.add('recording');
    shutterBtn.setAttribute('aria-label', 'Parar de gravar');
    recTimer.hidden = false;
    recTime.textContent = '00:00';
    recInterval = window.setInterval(() => {
      recTime.textContent = formatDuration(recorder.elapsed);
      if (recorder.elapsed >= MAX_RECORDING_MS) stopRecording();
    }, 250);
    navigator.vibrate?.(30);
  } catch (err) {
    console.error(err);
    showNotice('Não foi possível gravar vídeo');
  } finally {
    shutterBtn.disabled = app.dataset.state !== 'running';
  }
}

async function stopRecording(): Promise<void> {
  if (!recorder.recording) return;
  clearInterval(recInterval);
  recTimer.hidden = true;
  delete app.dataset.recording;
  if (renderer) renderer.holdQuality = false;
  shutterBtn.classList.remove('recording');
  setCaptureMode('video');
  const result = await recorder.stop();
  if (!result) {
    showNotice('O vídeo ficou vazio');
    return;
  }
  const name = photoFileName().replace(/\.jpg$/, `.${videoExtension(result.mimeType)}`);
  showReview({ blob: result.blob, url: URL.createObjectURL(result.blob), name, kind: 'video' }, result.withAudio);
}

function onShutter(): void {
  if (captureMode === 'photo') takePhoto();
  else if (recorder.recording) stopRecording();
  else startRecording();
}

captureModeRoot.addEventListener('click', (e) => {
  const mode = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-mode]')?.dataset.mode;
  if (mode === 'photo' || mode === 'video') setCaptureMode(mode);
});
reviewSound.addEventListener('click', () => {
  reviewVideo.muted = !reviewVideo.muted;
  reviewSound.setAttribute('aria-pressed', String(!reviewVideo.muted));
  reviewSound.setAttribute('aria-label', reviewVideo.muted ? 'Ouvir o som do vídeo' : 'Tirar o som do vídeo');
  reviewVideo.play().catch(() => {});
});
// Vídeo depende de WebGL (grava o preview filtrado) e de suporte do navegador.
captureModeRoot.hidden = !renderer || !canRecordVideo();

const shutterTaps = createTapClassifier({
  single: () => {
    setPalettesOpen(false);
    onShutter();
  },
  double: () => {
    navigator.vibrate?.(10);
    setPalettesOpen(!palettesOpen());
  },
});
shutterBtn.addEventListener('click', (e) => {
  // Teclado (detail 0) e parar a gravação respondem na hora; sem filtros não há gaveta.
  shutterTaps.tap(e.detail === 0 || !renderer || recorder.recording);
});
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
  if (usingGallery) return;
  setState('loading');
  renderer?.stop();
  try {
    await camera.start(facing);
    if (!camera.active) return; // substituído por uma chamada mais recente
    if (usingGallery) {
      // O usuário escolheu uma foto enquanto a câmera abria.
      camera.cancel();
      return;
    }
    // Só depois da permissão o navegador revela quantas câmeras existem.
    cameraCount = await countVideoInputs();
    switchBtn.hidden = cameraCount < 2;
    updateMirror();
    setupZoom();
    if (!photo) renderer?.start();
    setState('running');
    if (renderer && !loadDrawerHintSeen()) {
      showNotice('Dois toques no botão mostram os filtros');
      saveDrawerHintSeen();
    }
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
    // Para a gravação antes de desligar a câmera; o vídeo até aqui vai para a revisão.
    if (recorder.recording) stopRecording();
    renderer?.stop();
    camera.cancel();
  } else if (app.dataset.state !== 'error' && !usingGallery) {
    startCamera();
  }
});

// ---------- Zoom ----------

let zoom = 1;
let zoomRange: ZoomRange = DIGITAL_ZOOM;
let hardwareZoom = false;
let zoomPending = false;

/** Ao abrir uma câmera: usa o zoom dela se existir; senão, zoom digital no shader. */
function setupZoom(): void {
  const caps = camera.hardwareZoom();
  hardwareZoom = !!caps;
  zoomRange = caps ? hardwareRange(caps) : DIGITAL_ZOOM;
  zoom = clampZoom(1, zoomRange);
  if (renderer) renderer.digitalZoom = 1;
}

function applyZoom(value: number): void {
  zoom = clampZoom(value, zoomRange);
  // Sem botão de zoom: o nível aparece por um instante no topo enquanto faz a pinça.
  showNotice(formatZoom(zoom));
  if (hardwareZoom) {
    // Uma mudança por quadro: o gesto de pinça dispara muitos eventos.
    if (zoomPending) return;
    zoomPending = true;
    requestAnimationFrame(() => {
      zoomPending = false;
      camera.setHardwareZoom(zoom).catch((err) => console.warn('Zoom da câmera falhou', err));
    });
  } else if (renderer) {
    renderer.digitalZoom = zoom;
    renderer.draw();
  }
}

onPinch(canvas, {
  start: () => zoom,
  change: (value) => {
    if (!usingGallery && app.dataset.state === 'running') applyZoom(value);
  },
});

// ---------- Foto da galeria ----------

/** true enquanto o preview mostra uma foto da galeria em vez da câmera. */
let usingGallery = false;

function updateSourceUi(): void {
  app.dataset.source = usingGallery ? 'gallery' : 'camera';
  shutterBtn.hidden = usingGallery;
  gallerySaveBtn.hidden = !usingGallery;
  galleryCloseBtn.hidden = !usingGallery;
  switchBtn.hidden = usingGallery || cameraCount < 2;
  captureModeRoot.hidden = usingGallery || !renderer || !canRecordVideo();
  setPalettesOpen(usingGallery);
}

async function openGalleryFile(file: File): Promise<void> {
  if (!renderer || photo || app.dataset.sheet) return;
  try {
    const image = await loadImageFile(file, renderer.maxImageSide);
    usingGallery = true;
    camera.cancel(); // desliga a câmera (e o indicador dela) enquanto edita a foto
    renderer.setImage(image);
    updateSourceUi();
    setState('running');
    gallerySaveBtn.focus();
  } catch (err) {
    console.error(err);
    showNotice('Não foi possível abrir essa imagem');
  }
}

function backToCamera(): void {
  if (!usingGallery) return;
  usingGallery = false;
  renderer?.useCamera();
  updateSourceUi();
  startCamera();
}

async function saveGalleryPhoto(): Promise<void> {
  if (!renderer || !usingGallery) return;
  gallerySaveBtn.disabled = true;
  try {
    const image = renderer.capture();
    if (!image) throw new Error('Sem imagem');
    const result = await saveFile(await encodeJpeg(image), photoFileName());
    // Continua na foto: dá para salvar outra versão com outro filtro.
    if (result === 'saved') showNotice('Foto salva');
  } catch (err) {
    console.error(err);
    showNotice('Não foi possível salvar');
  } finally {
    gallerySaveBtn.disabled = false;
  }
}

const pickFromGallery = () => galleryInput.click();
galleryBtn.addEventListener('click', pickFromGallery);
errorGalleryBtn.addEventListener('click', pickFromGallery);
galleryInput.addEventListener('change', () => {
  const file = galleryInput.files?.[0];
  galleryInput.value = ''; // permite escolher a mesma foto de novo
  if (file) openGalleryFile(file);
});
gallerySaveBtn.addEventListener('click', saveGalleryPhoto);
galleryCloseBtn.addEventListener('click', backToCamera);

// Sem WebGL não há filtros para aplicar numa foto.
galleryBtn.hidden = !renderer;
errorGalleryBtn.hidden = !renderer;
updateSourceUi();

startCamera('environment');
registerServiceWorker();
// Para conferir a versão aberta (inclusive em testes automáticos).
(window as unknown as { __APP_VERSION__: string }).__APP_VERSION__ = __APP_VERSION__;
