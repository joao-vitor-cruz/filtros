// Triângulo que cobre a tela inteira; calcula a coordenada de textura
// já com o corte (cover), o espelhamento e a inversão vertical do vídeo.
attribute vec2 aPosition;

uniform vec2 uCoverScale;
uniform float uMirror; // 1.0 = espelhado, 0.0 = normal

varying vec2 vUv;

void main() {
  vec2 uv = aPosition * 0.5 * uCoverScale + 0.5;
  uv.x = mix(uv.x, 1.0 - uv.x, uMirror);
  uv.y = 1.0 - uv.y; // a primeira linha do vídeo é o topo da imagem
  vUv = uv;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
