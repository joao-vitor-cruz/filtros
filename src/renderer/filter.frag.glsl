// Precisão alta quando disponível: o grão usa um hash que perde qualidade em mediump.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

// Ordem das etapas (ver src/edit/adjustments.ts):
// detalhe e luz → paleta (com intensidade) → cor → estilo.

uniform sampler2D uVideo;
uniform sampler2D uPalette;  // gradiente 256×1, sombras à esquerda, luzes à direita
uniform sampler2D uCurves;   // tabela 256×1 das curvas (R, G e B já com a curva geral)
uniform vec3 uColors[5];     // cores exatas da paleta (modo pôster)

uniform vec4 uMisc;     // x: nº de cores da paleta, y: modo, z: intensidade, w: semente do grão
uniform vec4 uLight1;   // exposição, brilho, contraste, realces
uniform vec4 uLight2;   // sombras, brancos, pretos, claridade
uniform vec4 uColorAdj; // temperatura, tonalidade, saturação, vibração
uniform vec4 uStyle;    // nitidez, redução de ruído, desbotado, vinheta
uniform vec4 uFlags;    // HSL ativo, rodas ativas, curvas ativas, detalhe ativo
uniform vec4 uTexel;    // xy: tamanho de 1 pixel da imagem (em UV), z: grão
uniform vec3 uHsl[8];   // por cor: matiz, saturação, luminância (-1..1)
uniform vec4 uWheels[4]; // global, sombras, meios-tons, realces: deslocamento RGB + luminância

varying vec2 vUv;
varying vec2 vPos;

const float LUT_SIZE = 256.0;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float luminance(vec3 c) {
  return dot(c, LUMA);
}

// Amostra uma tabela 256×1 no centro dos texels (0 e 1 caem na primeira e na última posição).
vec4 lut(sampler2D table, float x) {
  return texture2D(table, vec2(clamp(x, 0.0, 1.0) * (LUT_SIZE - 1.0) / LUT_SIZE + 0.5 / LUT_SIZE, 0.5));
}

vec3 paletteAt(float t) {
  return lut(uPalette, t).rgb;
}

// Modo de mesclagem "soft light" (especificação W3C de compositing).
vec3 softLight(vec3 base, vec3 blend) {
  vec3 d = mix(sqrt(base), ((16.0 * base - 12.0) * base + 4.0) * base, step(base, vec3(0.25)));
  vec3 darken = base - (1.0 - 2.0 * blend) * base * (1.0 - base);
  vec3 lighten = base + (2.0 * blend - 1.0) * (d - base);
  return mix(darken, lighten, step(0.5, blend));
}

vec3 posterize(float lum) {
  float count = uMisc.x;
  float index = min(floor(lum * count), count - 1.0);
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

vec3 sampleAt(vec2 offset) {
  return texture2D(uVideo, vUv + offset * uTexel.xy).rgb;
}

// ---------- 1. Detalhe: redução de ruído, nitidez e claridade (leem pixels vizinhos) ----------

vec3 applyDetail(vec3 c) {
  float sharpen = uStyle.x;
  float denoise = uStyle.y;
  float clarity = uLight2.w;

  // Vizinhos imediatos (cruz) e diagonais.
  vec3 cross4 = (sampleAt(vec2(1.0, 0.0)) + sampleAt(vec2(-1.0, 0.0)) + sampleAt(vec2(0.0, 1.0)) + sampleAt(vec2(0.0, -1.0))) * 0.25;
  vec3 result = c;

  if (denoise > 0.0) {
    vec3 diag = (sampleAt(vec2(1.0, 1.0)) + sampleAt(vec2(-1.0, 1.0)) + sampleAt(vec2(1.0, -1.0)) + sampleAt(vec2(-1.0, -1.0))) * 0.25;
    vec3 blur = c * 0.25 + cross4 * 0.5 + diag * 0.25;
    result = mix(result, blur, denoise);
  }
  if (sharpen > 0.0) {
    result += (c - cross4) * sharpen * 1.5;
  }
  if (clarity != 0.0) {
    // Contraste local: compara com a média de uma vizinhança grande e realça a diferença,
    // mais nos meios-tons (como no Lightroom), para não estourar luzes nem sombras.
    const float R = 10.0;
    vec3 wide = (sampleAt(vec2(R, 0.0)) + sampleAt(vec2(-R, 0.0)) + sampleAt(vec2(0.0, R)) + sampleAt(vec2(0.0, -R)) +
                 sampleAt(vec2(0.7 * R, 0.7 * R)) + sampleAt(vec2(-0.7 * R, 0.7 * R)) +
                 sampleAt(vec2(0.7 * R, -0.7 * R)) + sampleAt(vec2(-0.7 * R, -0.7 * R))) * 0.125;
    float l = luminance(c);
    float midtones = 1.0 - abs(l * 2.0 - 1.0);
    result += (c - wide) * clarity * 0.9 * midtones;
  }
  return clamp(result, 0.0, 1.0);
}

// ---------- 2. Luz (antes da paleta) ----------

vec3 applyLight(vec3 c) {
  float exposure = uLight1.x, brightness = uLight1.y, contrast = uLight1.z, highlights = uLight1.w;
  float shadows = uLight2.x, whites = uLight2.y, blacks = uLight2.z;

  c *= exp2(exposure * 2.0); // ±2 pontos de exposição
  c = clamp(c, 0.0, 1.0);
  // Clareia ou escurece os meios-tons (pulado em zero: pow() perde precisão na GPU).
  if (brightness != 0.0) c = pow(c, vec3(exp2(-brightness * 0.8)));
  c = (c - 0.5) * (1.0 + contrast) + 0.5;

  float l = clamp(luminance(c), 0.0, 1.0);
  c += highlights * 0.35 * smoothstep(0.5, 1.0, l);
  c += shadows * 0.35 * (1.0 - smoothstep(0.0, 0.5, l));

  // Brancos e pretos movem as pontas da escala (níveis).
  float whitePoint = 1.0 - whites * 0.25;
  float blackPoint = -blacks * 0.12;
  c = (c - blackPoint) / (whitePoint - blackPoint);
  return clamp(c, 0.0, 1.0);
}

// ---------- 3. Paleta ----------

vec3 applyPalette(vec3 c) {
  float lum = luminance(c);
  float mode = uMisc.y;
  if (mode < 0.5) return paletteAt(lum);
  if (mode < 1.5) return softLight(c, paletteAt(lum));
  if (mode < 2.5) return softLight(c, paletteAt(0.5));
  return posterize(lum);
}

// ---------- 4. Cor (depois da paleta) ----------

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 applyHsl(vec3 c) {
  vec3 hsv = rgb2hsv(c);
  float hue = hsv.x * 360.0;
  // Centros das 8 cores em graus (vermelho, laranja, amarelo, verde, ciano, azul, roxo, magenta)
  // e de novo o vermelho em 360°, para fechar a volta. Arrays locais: o GLSL ES 1.0 só deixa
  // indexar com o índice do laço.
  float centers[9];
  centers[0] = 0.0; centers[1] = 30.0; centers[2] = 60.0; centers[3] = 120.0; centers[4] = 180.0;
  centers[5] = 225.0; centers[6] = 270.0; centers[7] = 315.0; centers[8] = 360.0;
  vec3 values[9];
  for (int i = 0; i < 8; i++) values[i] = uHsl[i];
  values[8] = uHsl[0];

  // Cada matiz fica entre duas cores vizinhas e recebe a mistura dos ajustes delas:
  // no centro de uma cor, 100% do ajuste dessa cor.
  vec3 adj = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (hue >= centers[i] && hue < centers[i + 1]) {
      float t = (hue - centers[i]) / (centers[i + 1] - centers[i]);
      adj = mix(values[i], values[i + 1], t * t * (3.0 - 2.0 * t));
    }
  }
  // Cinzas não têm cor: quase não são afetados.
  float colorful = smoothstep(0.02, 0.2, hsv.y);
  hsv.x = fract(hsv.x + adj.x * (30.0 / 360.0) * colorful);
  hsv.y = clamp(hsv.y * (1.0 + adj.y * colorful), 0.0, 1.0);
  vec3 result = hsv2rgb(hsv);
  result *= 1.0 + adj.z * 0.5 * colorful;
  return clamp(result, 0.0, 1.0);
}

vec3 applyWheels(vec3 c) {
  float l = clamp(luminance(c), 0.0, 1.0);
  float shadows = 1.0 - smoothstep(0.0, 0.5, l);
  float highlights = smoothstep(0.5, 1.0, l);
  float midtones = clamp(1.0 - abs(l - 0.5) * 2.0, 0.0, 1.0);
  vec4 total = uWheels[0] + uWheels[1] * shadows + uWheels[2] * midtones + uWheels[3] * highlights;
  return clamp(c + total.rgb * 0.35 + total.a * 0.25, 0.0, 1.0);
}

vec3 applyColor(vec3 c) {
  float temperature = uColorAdj.x, tint = uColorAdj.y, saturation = uColorAdj.z, vibrance = uColorAdj.w;

  // Balanço de branco: temperatura puxa para âmbar/azul, tonalidade para magenta/verde.
  c *= vec3(1.0 + temperature * 0.2, 1.0 - tint * 0.2, 1.0 - temperature * 0.2);
  c = clamp(c, 0.0, 1.0);

  float l = luminance(c);
  c = mix(vec3(l), c, 1.0 + saturation);
  // Vibração: satura mais o que tem pouca cor, preservando o que já é saturado.
  float sat = max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
  c = mix(vec3(l), c, 1.0 + vibrance * (1.0 - sat));
  c = clamp(c, 0.0, 1.0);

  if (uFlags.x > 0.5) c = applyHsl(c);
  if (uFlags.y > 0.5) c = applyWheels(c);
  if (uFlags.z > 0.5) c = vec3(lut(uCurves, c.r).r, lut(uCurves, c.g).g, lut(uCurves, c.b).b);
  return c;
}

// ---------- 5. Estilo ----------

vec3 applyStyle(vec3 c) {
  float fade = uStyle.z, vignette = uStyle.w, grain = uTexel.z;
  // Desbotado: levanta os pretos e tira um pouco do contraste, como filme antigo.
  c = mix(c, c * 0.82 + 0.12, fade);
  float dist = length(vPos);
  c *= 1.0 - vignette * 0.85 * smoothstep(0.45, 1.45, dist);
  float noise = hash(gl_FragCoord.xy + uMisc.w) - 0.5;
  c += noise * grain * 0.22;
  return clamp(c, 0.0, 1.0);
}

void main() {
  vec3 c = texture2D(uVideo, vUv).rgb;
  if (uFlags.w > 0.5) c = applyDetail(c);
  c = applyLight(c);
  c = mix(c, applyPalette(c), uMisc.z);
  c = applyColor(c);
  gl_FragColor = vec4(applyStyle(c), 1.0);
}
