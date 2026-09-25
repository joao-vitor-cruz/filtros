// Precisão alta quando disponível: o grão usa um hash que perde qualidade em mediump.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uVideo;
uniform sampler2D uPalette;  // gradiente 256×1, sombras à esquerda, luzes à direita
uniform vec3 uColors[5];     // cores exatas da paleta (modo pôster)
uniform float uColorCount;
uniform float uMode;         // 0 mapa de cores, 1 tons divididos, 2 tinta, 3 pôster
uniform float uIntensity;    // 0 = original, 1 = filtro completo

uniform float uContrast;     // -1..1
uniform float uSaturation;   // -1..1
uniform float uVignette;     // 0..1
uniform float uGrain;        // 0..1
uniform float uSeed;         // muda a cada frame para o grão "andar"

varying vec2 vUv;
varying vec2 vPos;

const float PALETTE_SIZE = 256.0;

// Brilho percebido (Rec. 709).
float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Cor da paleta na posição t (0 = sombras, 1 = luzes), amostrando no centro dos texels.
vec3 paletteAt(float t) {
  float x = t * (PALETTE_SIZE - 1.0) / PALETTE_SIZE + 0.5 / PALETTE_SIZE;
  return texture2D(uPalette, vec2(x, 0.5)).rgb;
}

// Modo de mesclagem "soft light" (especificação W3C de compositing).
vec3 softLight(vec3 base, vec3 blend) {
  vec3 d = mix(sqrt(base), ((16.0 * base - 12.0) * base + 4.0) * base, step(base, vec3(0.25)));
  vec3 darken = base - (1.0 - 2.0 * blend) * base * (1.0 - base);
  vec3 lighten = base + (2.0 * blend - 1.0) * (d - base);
  return mix(darken, lighten, step(0.5, blend));
}

// Divide o brilho em faixas iguais, uma por cor da paleta.
vec3 posterize(float lum) {
  float index = min(floor(lum * uColorCount), uColorCount - 1.0);
  vec3 color = uColors[0];
  // GLSL ES 1.0 não permite indexar o array com variável: percorre e compara.
  for (int i = 1; i < 5; i++) {
    if (float(i) == index) color = uColors[i];
  }
  return color;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Camada 1: ajustes base.
vec3 adjust(vec3 color) {
  color = (color - 0.5) * (1.0 + uContrast) + 0.5;
  color = mix(vec3(luminance(color)), color, 1.0 + uSaturation);
  return clamp(color, 0.0, 1.0);
}

// Camada 2: aplicação da paleta no modo escolhido.
vec3 applyPalette(vec3 color) {
  float lum = luminance(color);
  if (uMode < 0.5) return paletteAt(lum);
  if (uMode < 1.5) return softLight(color, paletteAt(lum));
  if (uMode < 2.5) return softLight(color, paletteAt(0.5));
  return posterize(lum);
}

// Camada 3: vinheta e grão.
vec3 applyEffects(vec3 color) {
  // Escurece a partir do meio do caminho até as bordas; os cantos ficam mais escuros.
  float dist = length(vPos);
  color *= 1.0 - uVignette * 0.85 * smoothstep(0.45, 1.45, dist);
  float noise = hash(gl_FragCoord.xy + uSeed) - 0.5;
  color += noise * uGrain * 0.22;
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec3 original = texture2D(uVideo, vUv).rgb;
  vec3 filtered = applyEffects(applyPalette(adjust(original)));
  // Camada 4: intensidade.
  gl_FragColor = vec4(mix(original, filtered, uIntensity), 1.0);
}
