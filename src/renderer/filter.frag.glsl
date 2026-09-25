precision mediump float;

uniform sampler2D uVideo;
uniform sampler2D uPalette; // gradiente 256×1, sombras à esquerda, luzes à direita
uniform float uIntensity;   // 0 = original, 1 = filtro completo

varying vec2 vUv;

const float PALETTE_SIZE = 256.0;

// Brilho percebido (Rec. 709).
float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Gradient map: o brilho do pixel escolhe a cor no gradiente da paleta.
// Amostra no centro dos texels para que 0 e 1 caiam exatamente na primeira e na última cor.
vec3 gradientMap(vec3 color) {
  float x = luminance(color) * (PALETTE_SIZE - 1.0) / PALETTE_SIZE + 0.5 / PALETTE_SIZE;
  return texture2D(uPalette, vec2(x, 0.5)).rgb;
}

// Camadas do filtro. Ajustes base e efeitos entram na fase 7.
vec3 applyFilter(vec3 color) {
  vec3 mapped = gradientMap(color);
  return mix(color, mapped, uIntensity);
}

void main() {
  vec3 color = texture2D(uVideo, vUv).rgb;
  gl_FragColor = vec4(applyFilter(color), 1.0);
}
