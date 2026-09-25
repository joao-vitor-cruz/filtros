/**
 * Registra o service worker, que guarda o app no aparelho (abre sem internet e
 * permite instalar na tela inicial). Só no build publicado: no dev ele serviria
 * arquivos antigos e atrapalharia o recarregamento.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      // O navegador só procura versão nova de tempos em tempos; pedimos a cada vez que
      // o app abre ou volta para a frente, para quem instalou receber as atualizações.
      const checkForUpdate = () => registration.update().catch(() => {});
      checkForUpdate();
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkForUpdate();
      });
    } catch (err) {
      console.warn('Service worker não registrado', err);
    }
  });
}
