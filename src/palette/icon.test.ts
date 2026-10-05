import { describe, expect, it } from 'vitest';
import { centeredCrop, layoutCrop, zoomCrop } from './icon';
import { isValidIcon, parseStoredPalettes, serializePalettes } from './storage';
import { buildExport, parseImport } from './transfer';

describe('recorte do ícone', () => {
  it('foto deitada: o lado menor encosta no círculo e fica centralizada', () => {
    const crop = centeredCrop(400, 200, 100);
    const l = layoutCrop(400, 200, 100, crop);
    expect([l.width, l.height, l.x, l.y]).toEqual([200, 100, -50, 0]);
  });

  it('não deixa a foto sair do círculo ao arrastar', () => {
    const l = layoutCrop(400, 200, 100, { zoom: 1, x: 30, y: -40 });
    expect([l.x, l.y]).toEqual([0, 0]);
    const l2 = layoutCrop(400, 200, 100, { zoom: 1, x: -500, y: 0 });
    expect(l2.x).toBe(-100);
  });

  it('zoom mantém o centro do círculo no mesmo ponto da foto', () => {
    const start = centeredCrop(200, 200, 100); // centro da foto no centro do círculo
    const z = zoomCrop(200, 200, 100, start, 2);
    const l = layoutCrop(200, 200, 100, z);
    expect([l.width, l.x, l.y]).toEqual([200, -50, -50]);
  });
});

describe('ícone salvo com a paleta', () => {
  const icon = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  const palette = { id: 'p1', name: 'Praia', colors: ['#003049', '#fcbf49'], mode: 'gradient' as const, icon, builtIn: false };

  it('aceita só imagens embutidas válidas', () => {
    expect(isValidIcon(icon)).toBe(true);
    expect(isValidIcon('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isValidIcon('https://exemplo.com/foto.jpg')).toBe(false);
    expect(isValidIcon('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
    expect(isValidIcon('data:image/jpeg;base64,' + 'A'.repeat(200_000))).toBe(false);
  });

  it('volta igual ao salvar e ao exportar/importar', () => {
    expect(parseStoredPalettes(serializePalettes([palette]))).toEqual([palette]);
    expect(parseImport(buildExport([palette]))).toEqual([palette]);
  });

  it('ícone inválido é descartado, mas a paleta continua', () => {
    const raw = JSON.stringify([{ ...palette, icon: 'javascript:alert(1)' }]);
    const [p] = parseStoredPalettes(raw);
    expect(p.icon).toBeUndefined();
    expect(p.name).toBe('Praia');
  });
});
