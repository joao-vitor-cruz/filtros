import { describe, expect, it } from 'vitest';
import { normalizeName, parseStoredPalettes, serializePalettes, suggestName } from './storage';
import type { Palette } from './palette';

const custom = (id: string, name: string, colors: string[]): Palette => ({ id, name, colors, builtIn: false });

describe('parseStoredPalettes', () => {
  it('volta o que foi salvo', () => {
    const palettes = [custom('a', 'Praia', ['#003049', '#fcbf49']), custom('b', 'Neon', ['#000', '#0f0', '#fff'])];
    expect(parseStoredPalettes(serializePalettes(palettes))).toEqual(palettes);
  });

  it('ignora dados ausentes ou corrompidos', () => {
    expect(parseStoredPalettes(null)).toEqual([]);
    expect(parseStoredPalettes('{não é json')).toEqual([]);
    expect(parseStoredPalettes('{"a":1}')).toEqual([]);
  });

  it('descarta itens inválidos e ids repetidos, mantendo os bons', () => {
    const raw = JSON.stringify([
      { id: 'ok', name: 'Boa', colors: ['#000000', '#FFFFFF'] },
      { id: 'uma-cor', name: 'X', colors: ['#000000'] },
      { id: 'cor-ruim', name: 'X', colors: ['#000000', 'azul'] },
      { name: 'sem id', colors: ['#000', '#fff'] },
      { id: 'ok', name: 'Repetida', colors: ['#000', '#fff'] },
      42,
    ]);
    expect(parseStoredPalettes(raw)).toEqual([custom('ok', 'Boa', ['#000000', '#ffffff'])]);
  });

  it('dá um nome padrão quando o salvo está vazio', () => {
    const raw = JSON.stringify([{ id: 'x', name: '   ', colors: ['#000', '#fff'] }]);
    expect(parseStoredPalettes(raw)[0].name).toBe('Minha paleta');
  });
});

describe('normalizeName', () => {
  it('tira espaços extras e limita o tamanho', () => {
    expect(normalizeName('  Pôr   do sol ', 'x')).toBe('Pôr do sol');
    expect(normalizeName('a'.repeat(40), 'x')).toHaveLength(24);
    expect(normalizeName('   ', 'Padrão')).toBe('Padrão');
  });
});

describe('suggestName', () => {
  it('numera quando o nome já existe', () => {
    expect(suggestName([])).toBe('Minha paleta');
    expect(suggestName([custom('a', 'Minha paleta', ['#000', '#fff'])])).toBe('Minha paleta 2');
    expect(
      suggestName([custom('a', 'minha paleta', ['#000', '#fff']), custom('b', 'Minha paleta 2', ['#000', '#fff'])]),
    ).toBe('Minha paleta 3');
  });
});
