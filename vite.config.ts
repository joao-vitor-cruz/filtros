import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { serviceWorker } from './build/service-worker-plugin';

export default defineConfig({
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
