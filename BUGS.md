# Bugs e pendências

## Ordem de prioridade

| Ordem | Tarefa | Por quê nesta posição |
|-------|--------|------------------------|
| 0 | **Testar no celular** (aberto nº 2) — feito pelo usuário | Não custa desenvolvimento e pode revelar problemas que mudam as prioridades abaixo. Pode rodar em paralelo com a tarefa 1. |
| ~~1~~ | ~~**Exportar e importar paletas** (pedido nº 7)~~ | **Feito.** Painel de ajustes → "Minhas paletas". |
| ~~2~~ | ~~**Fase 8: app instalável** (aberto nº 1)~~ | **Feito.** Instalável no iPhone e no Android, funciona sem internet, atualiza sozinho. |
| ~~3~~ | ~~**Vídeo com filtro** (pedido nº 1)~~ | **Feito.** Seletor Foto/Vídeo acima do disparo. |
| ~~4~~ | ~~**Ajustes estilo Edits + botão de explicação** (pedidos nº 2 e 3)~~ | **Feito.** Painel de ajustes com abas Luz, Cor, HSL, Rodas, Curvas, Estilo e Mais; "?" em cada ajuste. |
| ~~—~~ | ~~**Zoom da câmera** (pedido nº 8)~~ | **Feito.** Só pinça com dois dedos (o nível aparece no topo durante o gesto). |
| 5 | **Editor de paleta mostrando mais a imagem** (pedido nº 5) | Precisa definir o layout antes. Pode ser feito junto com a tarefa 4, que também mexe em painéis. |
| 6 | **Aba de edição de fotos e vídeos** (pedido nº 4) | Depende do vídeo (3) e dos novos ajustes (4) para valer a pena como aba própria. |
| ~~7~~ | ~~**Foto como ícone da paleta** (pedido nº 6)~~ | **Feito.** Editor da paleta → Ícone → Escolher foto. |

## Abertos

### ~~1. Service worker não recebe atualizações~~ (resolvido)

**Causa encontrada:** nos testes (Chromium sem placa de vídeo), o desenho contínuo da câmera com WebGL ocupa o navegador e a verificação de versão do service worker não anda enquanto ele roda. Com a câmera negada, sem WebGL, ou com o desenho pausado (tela da foto), a mesma atualização funciona.

**Correção (não depende do service worker se atualizar na hora):**
- A página é sempre buscada na rede primeiro, então a versão nova chega ao abrir o app com internet.
- O service worker guarda na hora os arquivos novos que a página pede, então a versão nova também funciona sem internet.
- A verificação de versão é pedida ao abrir e sempre que o app sai ou volta da tela; em segundo plano o desenho para e o service worker novo é instalado.
- Testado: com a versão A aberta e a câmera desenhando, publicar a B e reabrir abre a B, inclusive sem internet; ao ir para segundo plano, o service worker da B é instalado.
- O modo `?debug` mostra a versão (data e hora do build) para conferir no celular.

### 2. Nada foi testado em aparelhos reais ainda

Todos os testes foram no Chromium com câmera falsa e GPU emulada. Falta confirmar no celular:
- instalar na tela inicial (iPhone: Safari → Compartilhar → Adicionar à Tela de Início; Android: Chrome → Instalar app) e abrir sem internet;
- depois de uma publicação nova, a versão em `?debug` mudar ao reabrir o app instalado;
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
| 6 | ~~**Foto escolhida como ícone da paleta**~~ **Feito** | Só nas paletas do usuário. No editor: Ícone → Escolher foto (da galeria) → recorte em círculo (arrastar e zoom) → JPEG 128×128 (~1–8 KB) guardado junto com a paleta no `localStorage` (não precisou de IndexedDB). No carrossel, a foto por dentro e as cores da paleta num anel. Vai junto no exportar/importar; ícones que não sejam imagens embutidas válidas são descartados. | Junto com a paleta (`localStorage`) |
| 8 | ~~**Zoom da câmera**~~ **Feito** | Zoom da própria câmera quando o navegador oferece (Android/Chrome, até 10×, incluindo grande-angular); senão zoom digital no shader até 4× (iPhone). Pinça com dois dedos; o nível aparece por um instante no topo (sem botão, a pedido). No computador não há zoom. | — |
| 7 | ~~**Exportar e importar paletas**~~ | **Feito.** Painel de ajustes → "Minhas paletas": exportar gera `filtros-paletas-AAAAMMDD.json` (no iPhone, pela folha do sistema → "Salvar em Arquivos"); importar junta ao que já existe, ignora paletas iguais (mesmas cores e modo), renumera nomes repetidos ("Praia 2") e recusa arquivos que não são do app. Quando o item 6 existir, o formato precisa levar as imagens dos ícones (subir a versão do arquivo). | — |

### Sobre armazenamento

- **Não é preciso servidor nem banco de dados online** para nada acima: tudo continua rodando no aparelho, e as fotos/vídeos vão para a galeria do celular.
- **IndexedDB** (banco local do navegador, sem servidor) passa a ser necessário para guardar imagens dentro do app: ícones das paletas (item 6) e, se desejado, um histórico de fotos/vídeos (item 4). O `localStorage` atual serve só para textos pequenos (~5 MB no total).
- **Risco:** o navegador pode apagar dados de sites. No iPhone, o Safari apaga os dados de sites não instalados depois de ~7 dias sem uso; apps instalados na tela inicial ficam protegidos — por isso vale instalar o app (fase 8, feita) e exportar as paletas como backup.
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
| 8 | Service worker não atualizava com a câmera desenhando (visto sem GPU) | Página pela rede primeiro + arquivos novos guardados na hora + verificação ao sair/voltar da tela |
| 8 | Ajuste automático de resolução podia mudar o tamanho do canvas no meio de uma gravação | Ajuste travado enquanto grava |
| Galeria | Círculos do carrossel pareciam cortados nas beiradas (o degradê se repetia embaixo da borda) | Anel feito com sombra interna; círculos maiores (56 → 64 px) |
