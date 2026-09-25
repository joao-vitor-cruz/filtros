# Planejamento — App de Filtros Coloridos (web, mobile-first)

## 1. Objetivo

Aplicação web, pensada primeiro para celular, que:

1. Abre a câmera do dispositivo (frontal ou traseira).
2. Mostra a imagem ao vivo com um filtro colorido aplicado em tempo real.
3. Permite ao usuário escolher ou criar a **paleta de cores** do filtro.
4. **Tira fotos** com o filtro aplicado e permite salvar ou compartilhar.

## 2. Stack técnica

| Área | Escolha | Por quê |
|------|---------|---------|
| Build | **Vite + TypeScript** | Rápido, zero configuração, HTTPS local fácil (necessário para câmera) |
| UI | **TypeScript puro** (sem framework) | A interface é pequena; o trabalho pesado está no WebGL. Menos peso = carregamento rápido no celular |
| Câmera | `navigator.mediaDevices.getUserMedia` | API padrão, funciona em Chrome/Android e Safari/iOS |
| Processamento | **WebGL 2** (fallback WebGL 1) com um único fragment shader | Processa cada frame na GPU em ~1–3 ms |
| Foto | Render em framebuffer na resolução nativa → `canvas.toBlob()` | Foto em resolução maior que a da tela |
| Salvar | Download do JPEG; no iOS, folha do sistema (`navigator.share`) | No iOS é a única forma de salvar no app Fotos |
| Persistência | `localStorage` (paletas e preferências) | Sem backend; as fotos vão direto para o aparelho |
| Instalação | **PWA** (manifest + service worker) | Abre em tela cheia como um app |
| Testes | Vitest (lógica de paletas/cores) + teste manual em aparelhos reais | Câmera/GPU não são bem simuladas |

**Sem backend**: tudo roda no dispositivo, nenhuma imagem sai do aparelho.

## 3. Arquitetura

```
┌─────────────┐   frames    ┌──────────────────────────┐   pixels   ┌──────────┐
│ <video>     │ ──────────▶ │ Renderer (WebGL)         │ ─────────▶ │ <canvas> │ (preview)
│ getUserMedia│             │  textura do vídeo        │            └──────────┘
└─────────────┘             │  + textura da paleta     │
                            │  + uniforms (parâmetros) │ ── captura ─▶ framebuffer
                            └──────────────────────────┘              em resolução
       ▲                              ▲                               nativa → Blob
       │                              │                                    │
 ┌─────┴──────┐              ┌────────┴────────┐                  ┌───────┴───────┐
 │ Camera     │              │ Estado do filtro│◀── UI ──────────▶│ Capture/Share │
 │ (troca     │              │ (paleta, modo,  │                  │ (galeria,     │
 │ frente/trás)│             │  intensidade…)  │                  │  compartilhar)│
 └────────────┘              └─────────────────┘                  └───────────────┘
```

### Estrutura de pastas

```
src/
  main.ts              # inicialização, loop requestAnimationFrame
  camera.ts            # getUserMedia, troca de câmera, tratamento de permissão
  renderer/
    renderer.ts        # contexto WebGL, texturas, draw, captura em alta resolução
    filter.frag.glsl   # shader com todas as camadas do filtro
    quad.vert.glsl     # vértice de tela cheia
  palette/
    palette.ts         # tipos, geração da textura de gradiente (256×1)
    presets.ts         # paletas prontas
    storage.ts         # salvar/carregar paletas do usuário
  capture/
    image.ts           # pixels → JPEG, nome do arquivo
    save.ts            # salvar (download; folha do sistema no iOS)
  ui/
    controls.ts        # botão de disparo, troca de câmera, slider de intensidade
    palette-picker.ts  # carrossel de paletas
    palette-editor.ts  # criar/editar paleta (2–5 cores)
  state.ts             # estado central do filtro + assinaturas
public/
  manifest.webmanifest, ícones
```

## 4. Pipeline do filtro (camadas no shader)

Todas as camadas ficam num único fragment shader, na ordem abaixo. Cada uma pode ser ligada ou desligada por uniforms.

1. **Ajustes base**: contraste, saturação, exposição.
2. **Mapeamento pela paleta** (núcleo do filtro), em um dos modos:
   - `gradient` — luminância → cor no gradiente da paleta (duotone/tritone).
   - `splitTone` — cor A nas sombras, cor B nas luzes.
   - `tint` — primeira cor da paleta aplicada com *soft light*.
   - `posterize` — cada pixel vira a cor mais próxima da paleta.
3. **Efeitos**: vinheta e grão (opcionais).
4. **Intensidade**: `mix(original, filtrado, intensidade)`.

A paleta vai para a GPU como uma **textura 256×1**, gerada no JavaScript interpolando as cores escolhidas. Trocar de paleta significa apenas reenviar essa textura, que é instantâneo. Para o modo `posterize`, as cores (até 5) também vão como um array de uniforms.

### Modelo de dados

```ts
type Palette = {
  id: string;
  name: string;
  colors: string[];          // 2 a 5 cores hex, da sombra para a luz
  builtIn: boolean;
};

type FilterState = {
  paletteId: string;
  mode: 'gradient' | 'splitTone' | 'tint' | 'posterize';
  intensity: number;         // 0..1
  contrast: number;          // -1..1
  saturation: number;        // -1..1
  vignette: number;          // 0..1
  grain: number;             // 0..1
};
```

## 5. Telas e UX (mobile-first)

**Tela principal (câmera)**, em tela cheia, com os controles sobre a imagem:

```
┌──────────────────────────┐
│ [⚙]               [⟲ cam]│  ← topo: ajustes, trocar câmera
│                          │
│     preview filtrado     │
│      (tela cheia)        │
│                          │
│ ─────●────── intensidade │
│ (○)(○)(●)(○)(○)(+)       │  ← carrossel de paletas; "+" cria nova
│          ( ◉ )           │  ← botão de disparo
└──────────────────────────┘
```

- **Carrossel de paletas**: cada item mostra o gradiente da paleta. Tocar aplica na hora. Pressionar e segurar edita.
- **Editor de paleta** (painel inferior): 2 a 5 cores com `<input type="color">`, reordenar, remover, pré-visualização ao vivo e salvar.
- **Painel de ajustes** (⚙): modo do filtro, contraste, saturação, vinheta, grão.
- **Disparo**: flash branco rápido + vibração (`navigator.vibrate`) e a foto aparece em tela cheia.
- **Tela da foto**: só o botão *Salvar*; o X no canto volta para a câmera sem salvar.
- Alvos de toque ≥ 44px, controles na metade inferior (alcance do polegar), respeita `safe-area-inset` (notch).

## 6. Captura de foto (detalhes)

1. Ao disparar, o renderer desenha o frame atual num **framebuffer do tamanho nativo do vídeo** (a câmera é pedida em 1920×1080), com o quadro inteiro da câmera, e não o recorte da tela.
2. `readPixels` → linhas invertidas (o WebGL lê de baixo para cima) → canvas 2D → `toBlob('image/jpeg', 0.92)`.
3. Câmera frontal: a foto sai espelhada, como o usuário viu no preview.
4. **Tela da foto**: a única ação é **Salvar**. Um X discreto no canto volta para a câmera descartando a foto. Não há compartilhar, excluir nem galeria.
5. Salvar: no iPhone/iPad abre a folha do sistema (onde "Salvar imagem" leva a foto para o app Fotos, único caminho no Safari); nos demais, faz o download do JPEG. Depois de salvar, volta para a câmera com o aviso "Foto salva".
## 7. Paletas prontas (sugestão inicial)

| Nome | Cores | Modo |
|------|-------|------|
| Synthwave | `#2b0f54` `#ab1f65` `#ff4f69` `#fff7f8` | gradient |
| Oceano | `#03045e` `#0077b6` `#90e0ef` | gradient |
| Sépia | `#2e1f0f` `#a67b4b` `#f5e6c8` | gradient |
| Teal & Orange | `#006d77` `#ffb703` | splitTone |
| Noir | `#000000` `#ffffff` | gradient |
| Pop Art | `#ff006e` `#fb5607` `#ffbe0b` `#3a86ff` | posterize |

## 8. Fases de desenvolvimento

| Fase | Entrega | Critério de pronto |
|------|---------|--------------------|
| **1. Base** | Projeto Vite+TS, HTTPS local, `<video>` com a câmera, troca frente/trás, tela de permissão negada | Preview funciona no Android e no iPhone |
| **2. Renderer** | WebGL desenhando o vídeo no canvas (passthrough), redimensionamento e orientação | Preview a 30+ fps sem distorção |
| **3. Filtro gradient** | Shader com gradient map + intensidade, textura de paleta, presets | Trocar de paleta muda o preview na hora |
| **4. UI principal** | Carrossel de paletas, slider de intensidade, layout mobile | Usável com uma mão |
| **5. Foto** | Captura em resolução nativa, tela da foto com só "Salvar" (e X para descartar) | Foto salva na galeria do iOS e do Android |
| **6. Editor de paleta** | Criar/editar/excluir paletas, persistência | Paleta criada continua lá após recarregar |
| **7. Mais camadas** | Modos splitTone/tint/posterize, contraste, saturação, vinheta, grão | Todos os modos funcionam com paletas personalizadas |
| **8. PWA e polimento** | Manifest, service worker, ícones, testes em aparelhos, ajustes de desempenho | Instalável; Lighthouse PWA ok |

Cada fase gera algo testável no celular. As fases 1 a 5 formam o **MVP**.

## 9. Riscos e cuidados

- **HTTPS obrigatório**: a câmera só funciona em `https://` ou `localhost`. Para testar no celular em desenvolvimento, usar `@vitejs/plugin-basic-ssl` ou um túnel.
- **Safari/iOS**: o `<video>` precisa de `playsinline` e `muted`. `ImageCapture` não existe no Safari, por isso a foto sai do WebGL e não da API da câmera. `navigator.vibrate` também não existe no iOS (ignorar sem erro).
- **Permissão negada**: mostrar uma tela explicando como liberar a câmera nas configurações do navegador.
- **Aparelhos fracos**: limitar a resolução do preview (ex.: 1280×720) e usar a resolução máxima só na captura; se o fps cair, desligar o grão.
- **Orientação e proporção**: usar *cover* (cortar sem distorcer) e recalcular ao girar a tela.
- **Aba em segundo plano**: parar a câmera em `visibilitychange` e reabrir ao voltar (economiza bateria e libera o LED da câmera).
- **Privacidade**: tudo local, sem upload. Deixar isso claro na interface.

## 10. Fora do escopo do MVP (ideias futuras)

- Gravação de vídeo com filtro (`canvas.captureStream()` + `MediaRecorder`).
- Aplicar filtro em fotos da galeria.
- Extrair uma paleta automaticamente de uma imagem.
- Compartilhar paletas via link (paleta codificada na URL).
- Importar LUTs `.cube`.
