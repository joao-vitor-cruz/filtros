import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

const TEMPLATE = new URL('./sw-template.js', import.meta.url);

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

/**
 * Gera dist/sw.js com a lista de arquivos do build para guardar no aparelho.
 * A versão é um hash do conteúdo: qualquer mudança publicada cria um cache novo
 * e o service worker antigo é substituído.
 */
export function serviceWorker(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'filtros-service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    generateBundle(_options, bundle) {
      const hash = createHash('sha256');
      const files = new Set<string>(['./']);

      for (const [fileName, output] of Object.entries(bundle)) {
        if (fileName.endsWith('.map')) continue;
        files.add(fileName);
        hash.update(fileName);
        hash.update(output.type === 'chunk' ? output.code : output.source);
      }

      const publicDir = config.publicDir;
      if (publicDir) {
        for (const path of listFiles(publicDir)) {
          const fileName = relative(publicDir, path).split(sep).join('/');
          files.add(fileName);
          hash.update(fileName);
          hash.update(readFileSync(path));
        }
      }

      const source = readFileSync(TEMPLATE, 'utf8')
        .replace('__VERSION__', JSON.stringify(hash.digest('hex').slice(0, 12)))
        .replace('__PRECACHE__', JSON.stringify([...files].sort(), null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
