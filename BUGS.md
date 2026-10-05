# Bugs e pendências

## Ordem de prioridade

| Ordem | Tarefa | Por quê nesta posição |
|-------|--------|------------------------|
| 0 | **Testar no celular** (aberto nº 2) — feito pelo usuário | Não custa desenvolvimento e pode revelar problemas que mudam as prioridades abaixo. Pode rodar em paralelo com a tarefa 1. |
| ~~1~~ | ~~**Exportar e importar paletas** (pedido nº 7)~~ | **Feito.** Painel de ajustes → "Minhas paletas". |
| 2 | **Fase 8: app instalável** (aberto nº 1) | Protege os dados no iPhone (sem a limpeza de 7 dias) e é pré-requisito para guardar imagens com segurança (pedidos 4 e 6). Tem um bug difícil (atualização do service worker) e precisa juntar o branch com a galeria. |
| ~~3~~ | ~~**Vídeo com filtro** (pedido nº 1)~~ | **Feito.** Seletor Foto/Vídeo acima do disparo. |
| ~~4~~ | ~~**Ajustes estilo Edits + botão de explicação** (pedidos nº 2 e 3)~~ | **Feito.** Painel de ajustes com abas Luz, Cor, HSL, Rodas, Curvas, Estilo e Mais; "?" em cada ajuste. |
| ~~—~~ | ~~**Zoom da câmera** (pedido nº 8)~~ | **Feito.** Pinça e botão 1×/2×/3×. |
| 5 | **Editor de paleta mostrando mais a imagem** (pedido nº 5) | Precisa definir o layout antes. Pode ser feito junto com a tarefa 4, que também mexe em painéis. |
| 6 | **Aba de edição de fotos e vídeos** (pedido nº 4) | Depende do vídeo (3) e dos novos ajustes (4) para valer a pena como aba própria. |
| 7 | **Foto como ícone da paleta** (pedido nº 6) | Precisa do IndexedDB, do app instalado (2) para não perder as imagens, e de ajustar o formato do exportar (1) para levar as imagens. |

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

## Funcionalidades pedidas

Ainda não iniciadas. Nenhuma precisa de servidor ou banco de dados online; algumas precisam guardar arquivos no próprio aparelho (IndexedDB, o banco de dados local do navegador) — ver a coluna "Armazenamento" e a seção abaixo.

| # | Pedido | O que envolve | Armazenamento |
|---|--------|---------------|---------------|
| 1 | ~~**Vídeo com o filtro**~~ **Feito** | Gravar o canvas filtrado (`canvas.captureStream()` + `MediaRecorder`) junto com o áudio do microfone; botão de gravar ao lado do disparo; salvar como MP4 (iPhone) ou WebM/MP4 (Android). | Nenhum além do salvar atual |
| 2 | ~~**Mais ajustes na câmera, estilo Instagram Edits**~~ **Feito**: exposição, brilho, contraste, realces, sombras, brancos, pretos, claridade; temperatura, tonalidade, saturação, vibração; HSL (8 cores × matiz/saturação/luminância); nitidez, redução de ruído, desbotado, vinheta, grão; rodas (global, sombras, meios-tons, realces); curvas (RGB, R, G, B) | Novas camadas no shader: exposição, realces, sombras, temperatura, matiz, nitidez, desbotado etc. Nitidez e desfoque leem pixels vizinhos (mais pesado que os ajustes atuais; medir o fps). | Preferências, como hoje (`localStorage`) |
| 3 | ~~**Botão de explicação em cada ajuste**~~ **Feito**: cada "?" diz o que o ajuste faz e em que ponto age em relação à paleta | Ícone "?" ao lado de cada ajuste abrindo um texto curto: o que ele muda na foto e como interage com a paleta/filtro do app (ex.: contraste antes do mapa de cores espalha mais a imagem pelas cores da paleta). | Nenhum (textos fixos no app) |
| 4 | **Aba de edição de fotos e vídeos já tirados** (como o Edits) | Fotos: já existe a base (galeria + filtros + ajustes); vira uma aba própria. Vídeos: tocar o vídeo pelo renderer e regravar com o filtro — leva o tempo do vídeo, ou usar WebCodecs para ser mais rápido onde houver. Decidir se a aba lista só o que vem da galeria do celular ou também guarda um histórico dentro do app. | Nenhum se abrir da galeria do celular; IndexedDB se o app mantiver um histórico próprio |
| 5 | **Editor de paleta mostrando mais a câmera/foto** (layout a definir) | Hoje a folha cobre ~75% da tela. Ideias: folha que minimiza para uma barra, ou editor compacto numa faixa horizontal com a câmera em cima. | Nenhum |
| 6 | **Foto escolhida como ícone da paleta** | No editor, escolher uma foto; recortar em círculo e reduzir (ex.: 128 px) para o carrossel. | IndexedDB (imagem por paleta) |
| 8 | ~~**Zoom da câmera**~~ **Feito** | Zoom da própria câmera quando o navegador oferece (Android/Chrome, até 10×, incluindo grande-angular); senão zoom digital no shader até 4× (iPhone). Pinça com dois dedos e botão que alterna os níveis. | — |
| 7 | ~~**Exportar e importar paletas**~~ | **Feito.** Painel de ajustes → "Minhas paletas": exportar gera `filtros-paletas-AAAAMMDD.json` (no iPhone, pela folha do sistema → "Salvar em Arquivos"); importar junta ao que já existe, ignora paletas iguais (mesmas cores e modo), renumera nomes repetidos ("Praia 2") e recusa arquivos que não são do app. Quando o item 6 existir, o formato precisa levar as imagens dos ícones (subir a versão do arquivo). | — |

### Sobre armazenamento

- **Não é preciso servidor nem banco de dados online** para nada acima: tudo continua rodando no aparelho, e as fotos/vídeos vão para a galeria do celular.
- **IndexedDB** (banco local do navegador, sem servidor) passa a ser necessário para guardar imagens dentro do app: ícones das paletas (item 6) e, se desejado, um histórico de fotos/vídeos (item 4). O `localStorage` atual serve só para textos pequenos (~5 MB no total).
- **Risco:** o navegador pode apagar dados de sites. No iPhone, o Safari apaga os dados de sites não instalados depois de ~7 dias sem uso; apps instalados na tela inicial ficam protegidos. Isso aumenta a importância da fase 8 (app instalável) e de pedir armazenamento persistente (`navigator.storage.persist()`).
- **Banco de dados online só seria necessário** para: sincronizar paletas entre aparelhos, contas de usuário, compartilhar paletas com outras pessoas ou backup na nuvem.

## Limitações conhecidas (comportamento esperado)

- **iPhone: salvar abre a folha do sistema.** O Safari não grava direto no app Fotos; a folha mostra também opções de compartilhar, que não dá para esconder.
- **iPhone: sem vibração** ao tirar a foto (o Safari não tem `navigator.vibrate`).
- **Modo Tinta é sutil em cores muito saturadas.** O *soft light* não consegue clarear um canal que está em zero (ex.: verde puro não ganha vermelho).
- **Paletas, filtro escolhido e ajustes ficam só no navegador.** Limpar os dados do navegador ou trocar de aparelho apaga tudo; para as paletas, use Exportar/Importar como backup.
- **A foto da câmera mostra um pouco mais que o preview.** A foto usa o quadro inteiro da câmera; o preview corta para preencher a tela.
- **O grão fica mais fino em fotos grandes da galeria**, porque ele é gerado por pixel da foto.
- **O vídeo grava o preview**: sai na resolução da tela (ex.: 780×1688 num celular comum), não em 1080p, e na câmera frontal sai espelhado como o preview (a opção "espelhar fotos" vale só para fotos). Até 3 minutos.
- **Zoom digital (iPhone) amplia a imagem de 1920×1080**: a 4× a foto tem a nitidez de uma imagem de 480×270 ampliada.
- **Nitidez, redução de ruído e claridade pesam mais na GPU** (leem pixels vizinhos). Em aparelhos fracos, a câmera pode ficar menos fluida com eles ligados; o "?" de cada um avisa.
- **Os ajustes agora valem também no Original** (antes não valiam), para editar sem paleta.

## Corrigidos

| Fase | Bug | Correção |
|------|-----|----------|
| 2 | `npm run preview` servia o app na raiz e o JavaScript não carregava | `base: '/filtros/'` também no dev e no preview |
| 3 | Deslizes mais lentos (> 600 ms) não trocavam o filtro | Limite aumentado para 800 ms |
| 4 | Nomes das paletas cortados no carrossel ("Synthwa…") | Cada item com a largura do próprio nome |
| 4 | Primeiro item do carrossel não centralizava | Espaço lateral passou a considerar a margem da tela |
| 7 | Barra de pré-visualização do editor espremida até virar uma linha | Itens das folhas não encolhem; o painel rola |
| Galeria | Círculos do carrossel pareciam cortados nas beiradas (o degradê se repetia embaixo da borda) | Anel feito com sombra interna; círculos maiores (56 → 64 px) |
