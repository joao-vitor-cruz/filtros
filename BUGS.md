# Bugs e pendências

## Abertos

### 1. Service worker não recebe atualizações (fase 8, não publicada)

**Onde:** branch `claude/sleepy-galileo-uezqdu` (trabalho da fase 8). A `main` e o site publicado não têm service worker, então não são afetados.

**O que acontece:** depois que o app é instalado, publicar uma versão nova não chega a quem instalou. `registration.update()` fica pendente para sempre e o navegador nem chega a pedir o `sw.js` de novo ao servidor. Quem instalasse ficaria preso na versão antiga.

**Como reproduzir (Chromium headless, câmera falsa):**
1. `npm run build` e servir `dist/` em `http://localhost` com o caminho `/filtros/` (o Chrome não registra service worker em HTTPS com certificado autoassinado).
2. Abrir o app; o service worker instala e guarda os arquivos (funciona).
3. Mudar a linha `const VERSION = "…"` em `dist/sw.js`.
4. Chamar `(await navigator.serviceWorker.getRegistration()).update()` na página: a promessa nunca resolve e o log do servidor não mostra novo pedido de `sw.js`.

**O que já foi descartado:**
- Numa página mínima (só registra um service worker simples), `update()` funciona. O problema está no app ou no service worker dele.
- Tirar o tratamento de `fetch` do service worker do app **não** resolve.
- Acontece tanto em perfil anônimo quanto em perfil normal do Chromium.

**Próximos passos:**
- Usar o `sw.js` do app na página mínima, para separar "service worker" de "página do app".
- Remover partes da página (câmera, WebGL) até `update()` voltar a funcionar.
- Olhar `chrome://serviceworker-internals` e testar num Chrome real/Android, para descartar algo específico do modo headless.
- Só levar a fase 8 para a `main` depois de ver uma atualização chegar a um app instalado.

### 2. Nada foi testado em aparelhos reais ainda

Todos os testes foram no Chromium com câmera falsa e GPU emulada. Falta confirmar no celular:
- fps com a câmera em 1920×1080 e com vinheta e grão ligados (usar `?debug`);
- Safari/iPhone: vídeo tocando sem toque, troca de câmera, câmera religando ao voltar para o app;
- seletor de cores nativo (iPhone e Android) no editor de paletas;
- salvar a foto no iPhone (folha do sistema → "Salvar imagem") e no Android (download);
- escolher foto da galeria (iPhone e Android, incluindo fotos HEIC e fotos tiradas em pé).

## Limitações conhecidas (comportamento esperado)

- **iPhone: salvar abre a folha do sistema.** O Safari não grava direto no app Fotos; a folha mostra também opções de compartilhar, que não dá para esconder.
- **iPhone: sem vibração** ao tirar a foto (o Safari não tem `navigator.vibrate`).
- **Modo Tinta é sutil em cores muito saturadas.** O *soft light* não consegue clarear um canal que está em zero (ex.: verde puro não ganha vermelho).
- **Paletas, filtro escolhido e ajustes ficam só no navegador.** Limpar os dados do navegador ou trocar de aparelho apaga tudo.
- **A foto da câmera mostra um pouco mais que o preview.** A foto usa o quadro inteiro da câmera; o preview corta para preencher a tela.
- **O grão fica mais fino em fotos grandes da galeria**, porque ele é gerado por pixel da foto.

## Corrigidos

| Fase | Bug | Correção |
|------|-----|----------|
| 2 | `npm run preview` servia o app na raiz e o JavaScript não carregava | `base: '/filtros/'` também no dev e no preview |
| 3 | Deslizes mais lentos (> 600 ms) não trocavam o filtro | Limite aumentado para 800 ms |
| 4 | Nomes das paletas cortados no carrossel ("Synthwa…") | Cada item com a largura do próprio nome |
| 4 | Primeiro item do carrossel não centralizava | Espaço lateral passou a considerar a margem da tela |
| 7 | Barra de pré-visualização do editor espremida até virar uma linha | Itens das folhas não encolhem; o painel rola |
| Galeria | Círculos do carrossel pareciam cortados nas beiradas (o degradê se repetia embaixo da borda) | Anel feito com sombra interna; círculos maiores (56 → 64 px) |
