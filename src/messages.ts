import type { CameraErrorKind } from './camera';

export const errorMessages: Record<CameraErrorKind, { title: string; message: string }> = {
  unsupported: {
    title: 'Câmera indisponível',
    message:
      'Este navegador não permite acesso à câmera nesta página. Abra o endereço com https:// em um navegador atualizado (Chrome, Safari ou Firefox).',
  },
  denied: {
    title: 'Permissão negada',
    message:
      'Para usar os filtros, libere o acesso à câmera: toque no ícone ao lado do endereço (ou em Ajustes do navegador → Câmera), permita o acesso e tente novamente.',
  },
  'not-found': {
    title: 'Nenhuma câmera encontrada',
    message: 'Não encontramos uma câmera neste dispositivo.',
  },
  'in-use': {
    title: 'Câmera ocupada',
    message: 'Outro aplicativo está usando a câmera. Feche-o e tente novamente.',
  },
  unknown: {
    title: 'Não foi possível abrir a câmera',
    message: 'Algo deu errado ao iniciar a câmera. Tente novamente.',
  },
};
