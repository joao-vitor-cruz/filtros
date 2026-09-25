import vertexSource from './quad.vert.glsl?raw';
import fragmentSource from './filter.frag.glsl?raw';
import { canvasSize, coverScale } from './cover';

type GL = WebGLRenderingContext | WebGL2RenderingContext;

type Program = {
  program: WebGLProgram;
  buffer: WebGLBuffer;
  texture: WebGLTexture;
  aPosition: number;
  uCoverScale: WebGLUniformLocation | null;
  uMirror: WebGLUniformLocation | null;
  uVideo: WebGLUniformLocation | null;
};

// Um único triângulo maior que a tela: mais simples que dois e sem costura diagonal.
const FULLSCREEN_TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);

export class RendererError extends Error {}

/**
 * Desenha o vídeo da câmera num <canvas> via WebGL, aplicando o shader de filtro.
 * O <video> continua tocando (fora de vista) só como fonte dos frames.
 */
export class Renderer {
  readonly gl: GL;
  mirrored = false;

  private res: Program | null = null;
  private running = false;
  private frameHandle = 0;
  private videoFrameHandle = 0;
  private resizeObserver: ResizeObserver;
  private onFrame?: (now: number) => void;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly video: HTMLVideoElement,
  ) {
    const options: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    };
    const gl =
      (canvas.getContext('webgl2', options) as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl', options) as WebGLRenderingContext | null);
    if (!gl) throw new RendererError('WebGL indisponível');
    this.gl = gl;
    this.res = this.setup();

    // O sistema pode descartar o contexto (ex.: pouca memória). Recriamos tudo ao voltar.
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.res = null;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.res = this.setup();
    });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  get isWebGL2(): boolean {
    return typeof WebGL2RenderingContext !== 'undefined' && this.gl instanceof WebGL2RenderingContext;
  }

  /** Chamado a cada frame desenhado (usado pelo medidor de fps). */
  setFrameListener(listener: (now: number) => void): void {
    this.onFrame = listener;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleFrame();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
    if (this.videoFrameHandle && 'cancelVideoFrameCallback' in this.video) {
      this.video.cancelVideoFrameCallback(this.videoFrameHandle);
    }
    this.frameHandle = 0;
    this.videoFrameHandle = 0;
  }

  /** Desenha o frame atual do vídeo. Retorna false se ainda não há imagem. */
  draw(): boolean {
    const { gl, video, res } = this;
    if (!res || gl.isContextLost()) return false;
    if (video.readyState < video.HAVE_CURRENT_DATA || video.videoWidth === 0) return false;

    gl.bindTexture(gl.TEXTURE_2D, res.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    const [sx, sy] = coverScale(video.videoWidth, video.videoHeight, this.canvas.width, this.canvas.height);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(res.uCoverScale, sx, sy);
    gl.uniform1f(res.uMirror, this.mirrored ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  }

  destroy(): void {
    this.stop();
    this.resizeObserver.disconnect();
    const { gl, res } = this;
    if (res && !gl.isContextLost()) {
      gl.deleteTexture(res.texture);
      gl.deleteBuffer(res.buffer);
      gl.deleteProgram(res.program);
    }
    this.res = null;
  }

  private scheduleFrame(): void {
    if (!this.running) return;
    // requestVideoFrameCallback dispara só quando chega um frame novo da câmera,
    // evitando reenviar a mesma imagem para a GPU. Sem ele, usamos o rAF.
    if ('requestVideoFrameCallback' in this.video) {
      this.videoFrameHandle = this.video.requestVideoFrameCallback((now) => this.tick(now));
    } else {
      this.frameHandle = requestAnimationFrame((now) => this.tick(now));
    }
  }

  private tick(now: number): void {
    if (!this.running) return;
    if (this.draw()) this.onFrame?.(now);
    this.scheduleFrame();
  }

  private resize(): void {
    const [w, h] = canvasSize(this.canvas.clientWidth, this.canvas.clientHeight, window.devicePixelRatio);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      // Com o vídeo pausado (ex.: girando a tela), redesenha para não esticar o último frame.
      this.draw();
    }
  }

  private setup(): Program {
    const { gl } = this;
    const program = linkProgram(gl, vertexSource, fragmentSource);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    if (!buffer) throw new RendererError('Falha ao criar buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW);
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    if (!texture) throw new RendererError('Falha ao criar textura');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Vídeo não tem tamanho potência de 2: sem mipmap e com CLAMP (exigência do WebGL 1).
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const uVideo = gl.getUniformLocation(program, 'uVideo');
    gl.uniform1i(uVideo, 0);

    return {
      program,
      buffer,
      texture,
      aPosition,
      uCoverScale: gl.getUniformLocation(program, 'uCoverScale'),
      uMirror: gl.getUniformLocation(program, 'uMirror'),
      uVideo,
    };
  }
}

function compileShader(gl: GL, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new RendererError('Falha ao criar shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new RendererError(`Erro ao compilar shader: ${log}`);
  }
  return shader;
}

function linkProgram(gl: GL, vertex: string, fragment: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertex);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!program) throw new RendererError('Falha ao criar programa');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new RendererError(`Erro ao ligar programa: ${log}`);
  }
  return program;
}
