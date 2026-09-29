import { describe, expect, it } from 'vitest';
import { buildExport, exportFileName, ImportError, mergePalettes, parseImport } from './transfer';
import type { Palette } from './palette';

const custom = (id: string, name: string, colors: string[], mode: Palette['mode'] = 'gradient'): Palette => ({
  id,
  name,
  colors,
  mode,
  builtIn: false,
});

const praia = custom('custom-a', 'Praia', ['#003049', '#fcbf49'], 'splitTone');
const neon = custom('custom-b', 'Neon', ['#000000', '#00ff00', '#ffffff'], 'posterize');

const importError = (text: string) => {
  try {
    parseImport(text);
  } catch (err) {
    return err instanceof ImportError ? err.kind : 'outro erro';
  }
  return 'sem erro';
};

describe('exportar', () => {
  it('gera um arquivo identificado que volta igual ao importar', () => {
    const text = buildExport([praia, neon], new Date('2026-09-29T12:00:00Z'));
    const data = JSON.parse(text);
    expect(data).toMatchObject({ app: 'filtros', type: 'paletas', version: 1, exportedAt: '2026-09-29T12:00:00.000Z' });
    expect(data.palettes[0]).toEqual({ id: 'custom-a', name: 'Praia', colors: ['#003049', '#fcbf49'], mode: 'splitTone' });
    expect(parseImport(text)).toEqual([praia, neon]);
  });

  it('nomeia o arquivo com a data', () => {
    expect(exportFileName(new Date(2026, 8, 5))).toBe('filtros-paletas-20260905.json');
  });
});

describe('importar', () => {
  it('aceita também a lista pura, como fica guardada no navegador', () => {
    expect(parseImport(JSON.stringify([{ id: 'x', name: 'X', colors: ['#000', '#fff'] }]))).toEqual([
      custom('x', 'X', ['#000', '#fff']),
    ]);
  });

  it('ignora paletas inválidas dentro do arquivo e mantém as boas', () => {
    const text = JSON.stringify({ app: 'filtros', palettes: [{ id: 'ruim', colors: ['#000'] }, praia] });
    expect(parseImport(text).map((p) => p.id)).toEqual(['custom-a']);
  });

  it('rejeita arquivos que não são paletas do app', () => {
    expect(importError('isto não é json')).toBe('invalid');
    expect(importError(JSON.stringify({ outroApp: true, palettes: [praia] }))).toBe('invalid');
    expect(importError(JSON.stringify({ app: 'filtros', palettes: 'x' }))).toBe('invalid');
    expect(importError('42')).toBe('invalid');
  });

  it('rejeita arquivo sem nenhuma paleta válida', () => {
    expect(importError(JSON.stringify({ app: 'filtros', palettes: [] }))).toBe('empty');
    expect(importError(JSON.stringify([{ id: 'x', colors: ['azul', 'verde'] }]))).toBe('empty');
  });

  it('rejeita arquivos grandes demais', () => {
    expect(importError(' '.repeat(1024 * 1024 + 1))).toBe('too-big');
  });
});

describe('mergePalettes', () => {
  it('adiciona as novas no fim', () => {
    const { palettes, added, skipped } = mergePalettes([praia], [neon]);
    expect(palettes.map((p) => p.name)).toEqual(['Praia', 'Neon']);
    expect([added, skipped]).toEqual([1, 0]);
  });

  it('ignora paletas iguais às existentes, mesmo com outro nome, id ou maiúsculas', () => {
    const copia = custom('outro-id', 'Praia (cópia)', ['#003049', '#FCBF49'], 'splitTone');
    const { palettes, added, skipped } = mergePalettes([praia], [copia]);
    expect(palettes).toEqual([praia]);
    expect([added, skipped]).toEqual([0, 1]);
  });

  it('mesmas cores com outro modo contam como paleta diferente', () => {
    const outroModo = { ...praia, id: 'custom-c', mode: 'gradient' as const };
    expect(mergePalettes([praia], [outroModo]).added).toBe(1);
  });

  it('dá id novo quando o id já existe com outra paleta', () => {
    const conflito = custom('custom-a', 'Outra', ['#111111', '#eeeeee']);
    const { palettes } = mergePalettes([praia], [conflito]);
    expect(palettes[1].id).not.toBe('custom-a');
    expect(palettes[1].name).toBe('Outra');
  });

  it('numera nomes repetidos, respeitando o tamanho máximo', () => {
    const mesmoNome = custom('custom-d', 'Praia', ['#111111', '#eeeeee']);
    expect(mergePalettes([praia], [mesmoNome]).palettes[1].name).toBe('Praia 2');

    const longo = 'Nome muito comprido demais';
    const a = custom('l1', longo.slice(0, 24), ['#000000', '#ffffff']);
    const b = custom('l2', longo, ['#111111', '#eeeeee']);
    const nome = mergePalettes([a], [b]).palettes[1].name;
    expect(nome.endsWith(' 2')).toBe(true);
    expect(nome.length).toBeLessThanOrEqual(24);
  });

  it('não duplica quando o próprio arquivo repete uma paleta', () => {
    const repetida = { ...neon, id: 'custom-e' };
    expect(mergePalettes([], [neon, repetida]).added).toBe(1);
  });
});
