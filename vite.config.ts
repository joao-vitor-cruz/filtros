import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// A câmera só funciona em contexto seguro (HTTPS ou localhost).
// O certificado autoassinado permite testar no celular pela rede local.
export default defineConfig(({ command }) => ({
  // No GitHub Pages o site fica em https://<usuário>.github.io/filtros/.
  base: command === 'build' ? '/filtros/' : '/',
  plugins: [basicSsl()],
  server: { host: true },
  preview: { host: true },
}));
