precision mediump float;

uniform sampler2D uVideo;

varying vec2 vUv;

// As camadas do filtro (ajustes, paleta, efeitos, intensidade) entram aqui
// a partir da fase 3. Por enquanto a cor passa sem alteração.
vec3 applyFilter(vec3 color) {
  return color;
}

void main() {
  vec3 color = texture2D(uVideo, vUv).rgb;
  gl_FragColor = vec4(applyFilter(color), 1.0);
}
