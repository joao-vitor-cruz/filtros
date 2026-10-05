import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { serviceWorker } from './build/service-worker-plugin';

// Identifica cada build (aparece no modo ?debug), para conferir qual versão o aparelho abriu.
const APP_VERSION = process.env.APP_VERSION ?? new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  // No GitHub Pages o site fica em https://<usuário>.github.io/filtros/.
  // Usamos o mesmo caminho no dev e no preview para os três se comportarem igual.
  base: '/filtros/',
  // A câmera só funciona em contexto seguro (HTTPS ou localhost).
  // O certificado autoassinado permite testar no celular pela rede local.
  // O service worker só é gerado no build (no dev ele atrapalharia o recarregamento).
  plugins: [basicSsl(), serviceWorker()],
  server: { host: true },
  preview: { host: true },
});
