import { normalizeHex, type Palette } from './palette';
import { MAX_NAME_LENGTH, newPaletteId, normalizeName, parseStoredPalettes } from './storage';

/** Identifica o arquivo como paletas deste app e a versão do formato. */
const APP = 'filtros';
const TYPE = 'paletas';
const VERSION = 1;

/** Arquivos maiores que isso não são paletas (5 paletas ocupam menos de 1 KB). */
export const MAX_IMPORT_BYTES = 1024 * 1024;

export class ImportError extends Error {
  constructor(readonly kind: 'invalid' | 'empty' | 'too-big') {
    super(kind);
    this.name = 'ImportError';
  }
}

export function exportFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `filtros-paletas-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.json`;
}

/** Conteúdo do arquivo exportado: legível, com as paletas do usuário (sem as prontas). */
export function buildExport(palettes: readonly Palette[], date = new Date()): string {
  return JSON.stringify(
    {
      app: APP,
      type: TYPE,
      version: VERSION,
      exportedAt: date.toISOString(),
      palettes: palettes.map(({ id, name, colors, mode }) => ({ id, name, colors, mode })),
    },
    null,
    2,
  );
}

/**
 * Lê um arquivo exportado. Aceita também a lista pura (o formato guardado no
 * navegador). Paletas inválidas dentro do arquivo são ignoradas; um arquivo sem
 * nenhuma paleta válida é rejeitado.
 */
export function parseImport(text: string): Palette[] {
  if (text.length > MAX_IMPORT_BYTES) throw new ImportError('too-big');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('invalid');
  }

  let list: unknown;
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object' && (data as Record<string, unknown>).app === APP) {
    list = (data as Record<string, unknown>).palettes;
  } else {
    throw new ImportError('invalid');
  }
  if (!Array.isArray(list)) throw new ImportError('invalid');

  const palettes = parseStoredPalettes(JSON.stringify(list));
  if (palettes.length === 0) throw new ImportError('empty');
  return palettes;
}

/** Duas paletas são "a mesma" se têm as mesmas cores, na mesma ordem, e o mesmo modo. */
function signature(p: Pick<Palette, 'colors' | 'mode'>): string {
  return `${p.mode}:${p.colors.map(normalizeHex).join(',')}`;
}

/** Nome que ainda não está em uso: "Praia", "Praia 2", "Praia 3"… (respeitando o tamanho máximo). */
function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name.toLowerCase())) return name;
  for (let i = 2; ; i++) {
    const suffix = ` ${i}`;
    const candidate = name.slice(0, MAX_NAME_LENGTH - suffix.length).trimEnd() + suffix;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

export type MergeResult = { palettes: Palette[]; added: number; skipped: number };

/**
 * Junta as paletas importadas às existentes, no fim da lista.
 * - Paletas iguais (mesmas cores e modo) a uma existente são ignoradas.
 * - Ids repetidos ganham um id novo; nomes repetidos ganham um número.
 */
export function mergePalettes(existing: readonly Palette[], incoming: readonly Palette[]): MergeResult {
  const signatures = new Set(existing.map(signature));
  const ids = new Set(existing.map((p) => p.id));
  const names = new Set(existing.map((p) => p.name.toLowerCase()));
  const result = [...existing];
  let added = 0;

  for (const palette of incoming) {
    const sig = signature(palette);
    if (signatures.has(sig)) continue;
    const imported: Palette = {
      ...palette,
      id: ids.has(palette.id) ? newPaletteId() : palette.id,
      name: uniqueName(normalizeName(palette.name, 'Paleta importada'), names),
      builtIn: false,
    };
    result.push(imported);
    signatures.add(sig);
    ids.add(imported.id);
    names.add(imported.name.toLowerCase());
    added++;
  }
  return { palettes: result, added, skipped: incoming.length - added };
}
