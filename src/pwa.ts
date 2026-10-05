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
      // O navegador só procura versão nova de tempos em tempos; pedimos ao abrir e
      // sempre que o app sai ou volta da tela. Com a câmera desenhando sem parar, a
      // verificação pode demorar (visto em testes sem GPU); ao ir para segundo plano
      // o desenho para e ela anda. Mesmo antes disso, a página nova chega pela rede
      // e o service worker guarda os arquivos novos (ver build/sw-template.js).
      const checkForUpdate = () => registration.update().catch(() => {});
      checkForUpdate();
      document.addEventListener('visibilitychange', checkForUpdate);
    } catch (err) {
      console.warn('Service worker não registrado', err);
    }
  });
}
