# Painel em foco — Home e Menu

> Desenho aprovado: Paper, arquivo **Uma Estrelinha**, página **`47 · Painel em foco — Home e Menu`**
> (5 artboards + legenda). O desenho é a referência de forma; esta spec é a referência de comportamento.
> Onde os dois discordarem, **vale a spec** — e a divergência vira correção no Paper.

## Problem Statement

`/admin/home` e `/admin/menu` são as duas telas do painel que mostram **a loja ao lado do que se edita**.
Em 1440 sobram 1200px de conteúdo depois da sidebar de 240, e a coluna de edição fica com **380px** —
larga demais para uma lista, estreita demais para um formulário: as legendas das seções embrulham em
três linhas, os dois campos de uma linha não cabem lado a lado, e as duas artes de um banner
(computador e celular) precisam empilhar. Do outro lado, o palco de 748px mostra o computador a
**69%** — a barra do menu e o painel do mega menu ficam ilegíveis, que é justamente o que a Adri
abriu a tela para conferir.

A sidebar de 240px é o que está pagando essa conta, e nessas duas telas ela é a coisa menos usada:
quem entra em `/admin/home` veio compor a Home, não navegar.

## Goals

- [ ] Em 1440, a coluna de edição vai de **380 → 440px** e o palco de **748 → 872px** (computador a
      **81%** em vez de 69%), sem tirar navegação nenhuma do alcance de um clique.
- [ ] A prévia do computador alcança **100%** por um controle explícito, e não por acidente de janela.
- [ ] `/admin/menu` ganha a altura de tela fixa que `/admin/home` já tem — a prévia para de rolar
      para fora enquanto se edita.
- [ ] Nenhuma das duas telas ganha um segundo desenho da loja: a prévia continua sendo **a loja num
      iframe**, e continua sendo **um** componente (`previaUnica.test.ts` segue verde sem afrouxar).
- [ ] Nada muda no celular, em `/admin/*` fora dessas duas rotas, ou para quem já tem preferência
      salva de colapso de grupo.

## Out of Scope

| Item | Por quê |
| --- | --- |
| Trilho de ícones nas **outras** telas do painel | O ganho de largura só existe onde há duas colunas disputando. Em listagens, 240px de rótulo lido é melhor que 56px de ícone adivinhado. Nível 0 do desenho aprovado |
| **Estado de falha do iframe** da prévia (não carregou, recusou enquadrar) | Hoje não existe, e a tela cheia **não cria** esse modo de falha — só amplia a superfície dele. Entra como dívida registrada, não como escopo desta feature |
| Zoom livre da prévia (50%…200%) | Dois controles para "aumentar" (zoom e tela cheia) é uma decisão a mais por sessão e um segundo dono de "qual escala estou vendo". A tela cheia entrega 100%, que é o número que importa |
| Persistir a tela cheia na URL | Ver `A-04` |
| Sincronizar o trilho entre abas (`storage` event) | Ver `A-05` |
| Mexer no `PREVIEW_DEVICES.mobile` | 390 × 844 é a **dobra real** do celular. Esticá-la mentiria sobre o que a cliente vê (ver `FOCO-17`) |
| Redesenhar `HomeBlockTray`, `MenuLinkDialog`, `MenuSlotList` por dentro | Fora da queixa. Mudam de largura, não de forma |

---

## Assumptions & Open Questions

| # | Ambiguidade | Padrão escolhido | Racional | Confirmado? |
| --- | --- | --- | --- | --- |
| A-01 | O que se guarda no `localStorage`: "recolhido" ou "expandido"? | **Só o override `'expandido'`**. Voltar a recolher **apaga a chave** | É a lição do `navCollapse.ts`, aplicada ao inverso: guarda-se o que DIFERE do padrão, para que a ausência de valor signifique sempre "siga o padrão da rota". Se amanhã o padrão mudar, muda para todo mundo que nunca mexeu | y |
| A-02 | O trilho aparece a partir de qual largura? | **`md` (768)** — a mesma dobra da sidebar de hoje | Mover a dobra mudaria o layout de quem usa tablet por um motivo que não é o desta feature | y |
| A-03 | Alvo do trilho: 44px ou os 36px (`md:h-9`) que o painel usa hoje? | **44px** | A régua do projeto é 44. O `md:h-9` de hoje vale para controles **dentro** de uma tela que tem alvos maiores ao lado; o trilho é a **única** navegação a partir de 768, e 768–1023 é território de dedo. `touchTarget.test.ts` varre só `apps/store/src`, então é convenção, não guarda — a asserção nasce aqui | y |
| A-04 | A tela cheia entra na URL? | **Não. Estado transitório** | É nível de zoom, não lugar. O que precisa sobreviver ao F5 já sobrevive (a seção em edição está no path). Um link compartilhado abrindo em tela cheia entregaria o modo de quem mandou, não o de quem abriu | y |
| A-05 | Duas abas do painel abertas com estados diferentes do trilho | **Última escrita vence, sem sincronizar** | Mesmo comportamento do `navCollapse` de hoje. Ouvir `storage` resolveria um conflito que ninguém relatou e acrescentaria um listener global por preferência de tela | y |
| A-06 | Com o menu **expandido** numa rota de foco, a coluna de edição encolhe para 380? | **Não — fica 440** | Ela não muda de largura ao expandir. O custo é medido e aceito: em 1440 o palco cai para 688 e o computador para **~63%**, pior que os 69% de hoje. É estado transitório e escolhido ("quero o menu de volta"), e a saída é um clique — ou o botão Tela cheia. Fazer a coluna reagir ao trilho daria **dois donos** da largura (o widget do layout e a página) | y |
| A-07 | Clicar num bloco da prévia estando em tela cheia | **Sai da tela cheia e abre o editor** | O clique quer dizer "quero consertar isto". Abrir o editor atrás de uma prévia em tela cheia entregaria um formulário que ninguém vê | y |
| A-08 | O `⋯` da linha aparece só no hover | **Aparece no hover E no foco de teclado; e é sempre alcançável por `Tab`** | Controle que só existe no hover não existe para teclado nem para toque. Esconder é do desenho; alcançar é do DOM | y |

**Open questions:** nenhuma — tudo acima está resolvido ou registrado.

### Varredura das dimensões implícitas (escopo Large — todas)

| Dimensão | Resolução |
| --- | --- |
| Validação de entrada e limites | `FOCO-06` — valor fora de `'expandido'` lê como ausente |
| Falha / falha parcial | `FOCO-06` — `localStorage` que lança (aba anônima, cota) não derruba a navegação |
| Idempotência / repetição | **N/A porque** nada aqui escreve no servidor; o alternador é um `set`/`remove` de chave única, idempotente por construção |
| Fronteira de auth / limite de taxa | **N/A porque** o trilho é apresentação dentro de `RequireAdmin`; nenhuma rota, endpoint ou policy nova |
| Concorrência / ordenação | `A-05` — duas abas, última escrita vence, sem sincronização |
| Ciclo de vida do dado | `FOCO-06` — a chave não expira, e valor desconhecido cai no padrão (mesmo descarte do `readCollapsed`) |
| Observabilidade | **N/A porque** não há chamada de rede nova nem superfície de log no painel; o que falha aqui falha à vista, na tela |
| Falha de dependência externa | **N/A para esta feature** — a dependência é o iframe da loja, e o comportamento dele **não muda**. Registrado em *Out of Scope* como dívida |
| Integridade de transição de estado | `FOCO-18`, `FOCO-19`, `FOCO-21` — sair da tela cheia por `Esc`/botão/clique num bloco, e o iframe **não remontar** em transição nenhuma |

---

## User Stories

### H1 · P1: O trilho de ícones ⭐ MVP

**User Story**: Como a Adri, quero que o menu lateral encolha sozinho quando eu abro a Home ou o
Menu da loja, para a coluna onde eu edito ficar maior — sem eu perder de vista onde estou nem como
sair dali.

**Why P1**: É a queixa. Sem isto, os 60px de coluna de edição e os 124px de palco não existem.

**Acceptance Criteria**:

1. `FOCO-01` — WHEN a pessoa abre `/admin/home` ou `/admin/menu` (ou qualquer subrota, como
   `/admin/home/:sectionId`) E não há preferência salva THEN a navegação SHALL renderizar como
   trilho de **56px**.
2. `FOCO-02` — WHEN o trilho está recolhido THEN ele SHALL conter **exatamente os mesmos destinos**
   de `navGroups` e `footerNavItems`, **na mesma ordem**, sem rótulo visível e com nome acessível
   (`aria-label` ou equivalente) igual ao rótulo do item.
3. `FOCO-03` — WHEN o trilho está recolhido E a rota atual pertence a um destino THEN esse destino
   SHALL estar marcado visualmente e continuar respondendo a `isNavActive` — a navegação nunca fica
   sem responder "onde eu estou".
4. `FOCO-04` — WHEN o trilho está recolhido THEN SHALL existir **um** controle rotulado que o
   expande para 240px, e WHEN expandido, o mesmo controle SHALL recolhê-lo.
5. `FOCO-05` — WHEN a pessoa expande o trilho THEN o valor `'expandido'` SHALL ser gravado em
   `localStorage` sob `estrelinha.admin.nav-rail`; WHEN ela recolhe de volta THEN a chave SHALL ser
   **removida** (`A-01`).
6. `FOCO-06` — WHEN a chave está ausente, ilegível, ou com valor diferente de `'expandido'`, OU
   WHEN `localStorage` lança ao ler ou ao gravar THEN o trilho SHALL assumir o padrão da rota e a
   navegação SHALL continuar funcionando — nenhuma exceção sobe.
7. `FOCO-07` — WHEN a rota é `/admin/*` **fora** de `/admin/home` e `/admin/menu` THEN a sidebar
   SHALL ser a de hoje (240px, com rótulos) e **não** SHALL existir controle de recolher.
8. `FOCO-08` — WHEN a viewport é menor que `md` THEN nada SHALL mudar: a navegação continua sendo a
   gaveta (`Sheet`) do botão da barra, em qualquer rota.
9. `FOCO-09` — WHEN o trilho está recolhido THEN todo alvo clicável dele SHALL medir **≥ 44 × 44 px**
   (`A-03`).
10. `FOCO-10` — WHEN o `<aside>` é declarado THEN ele SHALL conter `sticky`, `top-0`, `h-screen` e
    `self-start` nos **dois** estados, e o guarda que lê isso do disco SHALL ser **estendido** para
    enxergar `className` dinâmico — com **âncora** (a varredura acha as classes) e **sensor** (a
    declaração antiga reprova na mesma régua).
11. `FOCO-11` — WHEN a pessoa tem grupos colapsados salvos (`estrelinha.admin.nav-collapsed`) THEN
    essa preferência SHALL continuar valendo **no estado expandido**, sem ser lida nem escrita pelo
    trilho: são duas preferências, cada uma com o seu dono.

**Independent Test**: abrir `/admin/home` com `localStorage` limpo e ver o trilho de 56; clicar no
controle e ver 240 com rótulos; recarregar e continuar em 240; clicar de novo, recarregar, voltar a
56; abrir `/admin/produtos` e ver 240 sem controle.

---

### H2 · P1: A coluna de edição maior, e a prévia que não foge ⭐ MVP

**User Story**: Como a Adri, quero editar num espaço onde os campos cabem lado a lado e as legendas
não embrulham, com a prévia parada ao lado enquanto eu rolo o formulário.

**Why P1**: sem isto o trilho devolve espaço que ninguém usa.

**Acceptance Criteria**:

1. `FOCO-12` — WHEN `/admin/home` é renderizada em `lg` ou mais THEN a coluna de edição SHALL medir
   **440px** e o palco SHALL ocupar o restante.
2. `FOCO-13` — WHEN `/admin/menu` é renderizada em `lg` ou mais THEN o corpo SHALL ter **altura de
   tela fixa** (o mesmo molde de `/admin/home`), a coluna da esquerda SHALL rolar **dentro de si**, e
   o palco SHALL permanecer visível sem rolar com ela.
3. `FOCO-14` — WHEN o trilho está **expandido** numa rota de foco THEN a coluna de edição SHALL
   permanecer em 440px e o palco SHALL simplesmente encolher (`A-06`) — nenhuma das duas páginas lê
   o estado do trilho.

**Independent Test**: em 1440, abrir uma seção da Home e ver "Botão" e "Destino" na mesma linha sem
apertar; em `/admin/menu`, rolar a coluna esquerda até o fim e a prévia continuar no lugar.

---

### H3 · P1: A prévia em tela cheia ⭐ MVP

**User Story**: Como a Adri, quero um botão que faça a prévia do computador ocupar a tela inteira em
tamanho real, para eu ler o menu e a chamada como a cliente lê.

**Why P1**: 81% ainda não é leitura; 100% é — e é a segunda metade do pedido.

**Acceptance Criteria**:

1. `FOCO-15` — WHEN o palco da prévia está visível (em `/admin/home` e em `/admin/menu`) THEN SHALL
   existir um controle rotulado **"Tela cheia"** na barra dele.
2. `FOCO-16` — WHEN a tela cheia está ativa E o dispositivo é **computador** THEN o quadro SHALL ser
   renderizado com **1024px de largura** e escala **100%**.
3. `FOCO-17` — WHEN a tela cheia está ativa E o dispositivo é **computador** THEN a **altura** do
   quadro SHALL ser o espaço vertical disponível no palco, nunca menor que 768 — e o rótulo de
   métrica SHALL exibir a altura **realmente usada**, não a nominal.
4. `FOCO-18` — WHEN o dispositivo é **celular**, em qualquer modo THEN o quadro SHALL permanecer
   **390 × 844**, sem crescer em altura: ali a altura é a dobra, e esticá-la mentiria sobre o que a
   cliente vê.
5. `FOCO-19` — WHEN a tela cheia está ativa THEN `Esc` **e** o controle de sair SHALL devolver a
   tela ao modo normal.
6. `FOCO-20` — WHEN a pessoa clica num bloco dentro da prévia estando em tela cheia THEN o sistema
   SHALL sair da tela cheia **e** abrir o editor daquele bloco (`A-07`).
7. `FOCO-21` — WHEN a tela cheia é ligada ou desligada THEN o `<iframe>` **NÃO** SHALL remontar: o
   rascunho já entregue pela ponte continua desenhado, sem recarregar o documento da loja.
8. `FOCO-22` — WHEN a tela cheia existe THEN ela SHALL ser um **modo do palco já existente**, e
   **não** um segundo componente de prévia: `previaUnica.test.ts` SHALL continuar passando sem
   nenhuma asserção afrouxada, e nenhum arquivo novo chamado `*Preview` SHALL aparecer em
   `home-composition/ui` ou `store-menu/ui`.

**Independent Test**: em `/admin/home`, alternar para Computador, clicar em Tela cheia e ler a
métrica `1024 × <altura> · 100%`; apertar `Esc` e a prévia voltar ao palco **sem piscar** (o
rascunho segue lá).

---

### H4 · P2: A lista de seções sem lixeira em toda linha

**User Story**: Como a Adri, quero que a ação de abrir uma seção não divida peso com a de apagá-la.

**Why P2**: é risco e ruído, não bloqueio.

**Acceptance Criteria**:

1. `FOCO-23` — WHEN uma linha da lista de seções é renderizada THEN ela **NÃO** SHALL exibir um
   botão de lixeira permanente.
2. `FOCO-24` — WHEN o cursor entra na linha OU um controle dela recebe foco THEN um controle `⋯`
   SHALL ficar visível, e ele SHALL ser alcançável por `Tab` independentemente do hover (`A-08`).
3. `FOCO-25` — WHEN a pessoa aciona `⋯` THEN SHALL ser oferecida a ação **Remover**, com o mesmo
   texto de confirmação de hoje e a mesma passagem pelo `deleteSection`.
4. `FOCO-26` — WHEN o editor de uma seção está aberto THEN SHALL existir no rodapé dele a ação
   **"Remover esta seção da Home"**, levando ao mesmo caminho.
5. `FOCO-27` — WHEN a remoção é recusada pelo banco (`guard_last_active_home_section`) THEN a
   mensagem exibida SHALL continuar sendo **a do banco** — esta feature não antecipa nem reescreve a
   regra (`AD-029`).

**Independent Test**: passar o mouse numa linha e ver o `⋯`; navegar por `Tab` sem mouse e alcançá-lo;
abrir uma seção e achar "Remover esta seção da Home" no rodapé.

---

### H5 · P2: O editor da entrada de menu num lugar só

**User Story**: Como a Adri, quero configurar uma entrada do menu sem olhar para duas colunas ao
mesmo tempo.

**Why P2**: melhora o fluxo; não impede nada hoje.

**Acceptance Criteria**:

1. `FOCO-28` — WHEN uma entrada está selecionada em `/admin/menu` THEN `MenuPanelEditor`,
   `MenuBannerEditor` e `MenuIconPicker` SHALL ser apresentados num **único** card com abas
   **Painel · Banners · Ícone**, na coluna da esquerda.
2. `FOCO-29` — WHEN o card com abas existe THEN a coluna da **direita** SHALL conter apenas o palco
   da prévia — `MenuIconPicker` deixa de morar lá.
3. `FOCO-30` — WHEN a pessoa troca a entrada selecionada OU o dispositivo em edição THEN a aba ativa
   SHALL voltar para **Painel**.
4. `FOCO-31` — WHEN nenhuma entrada está selecionada THEN a mensagem de hoje
   (`sem-entrada-selecionada`) SHALL continuar aparecendo no lugar do card.
5. `FOCO-32` — WHEN o card é renderizado THEN a aba **Banners** SHALL exibir quantos banners a
   entrada tem, lido da mesma fonte que o editor usa — nunca de uma contagem paralela.

**Independent Test**: selecionar "Leite materno", ver três abas e o seletor de ícone dentro do card;
trocar para Celular e a aba voltar para Painel.

---

### H6 · P2: O aviso de gravação onde se clica

**User Story**: Como a Adri, quero ver que o painel está salvando sem rolar até o fim da página.

**Why P2**: defeito pequeno de feedback, conserto pequeno.

**Acceptance Criteria**:

1. `FOCO-33` — WHEN `/admin/menu` está gravando THEN o aviso **"Salvando…"** SHALL aparecer no
   cabeçalho da página, ao lado do alternador de dispositivo, e **não** no rodapé do documento.
2. `FOCO-34` — WHEN a gravação termina THEN o aviso SHALL sumir, sem deixar espaço reservado que
   desloque os controles vizinhos.

**Independent Test**: ligar uma categoria no menu e ver "Salvando…" no topo, sem rolar.

---

### H7 · P2: As abas Entradas / Prévia no celular

**User Story**: Como a Adri conferindo o menu pelo telefone, quero escolher entre a lista e a prévia
em vez de rolar por três editores até achar a prévia.

**Why P2**: paridade com `/admin/home`, que já faz isso desde a feature 24.

**Acceptance Criteria**:

1. `FOCO-35` — WHEN `/admin/menu` é renderizada **abaixo de `lg`** THEN SHALL existir um alternador
   **Entradas / Prévia**, e apenas a coluna escolhida SHALL ser exibida.
2. `FOCO-36` — WHEN a viewport é `lg` ou maior THEN o alternador **NÃO** SHALL existir — as duas
   colunas estão à vista e escolher entre elas seria escolher entre duas coisas visíveis.
3. `FOCO-37` — WHEN o alternador Entradas/Prévia coexiste com o alternador Computador/Celular THEN
   eles SHALL usar **formas diferentes**: o de **dispositivo** continua sendo a pílula segmentada de
   hoje (fundo `bg-muted`, item ativo com fundo próprio); o de **vista** SHALL ser uma barra de abas
   com sublinhado (sem fundo de pílula, aba ativa marcada por borda inferior). Um diz *o que estou
   editando*, o outro *o que estou vendo* — dois controles de forma idêntica empilhados leem como o
   mesmo controle duplicado.

**Independent Test**: em 390, abrir `/admin/menu`, ver os dois alternadores com formas diferentes, e
tocar em "Prévia" trocando a coluna.

---

## Edge Cases

- WHEN a pessoa está com o trilho expandido e navega de `/admin/home` para `/admin/produtos` e volta
  THEN o trilho SHALL continuar expandido (a preferência é de pessoa, não de visita).
- WHEN a janela é estreitada de `lg` para abaixo de `md` com o trilho recolhido THEN a navegação
  SHALL virar a gaveta, e ao voltar para `md` SHALL reaparecer recolhida.
- WHEN a tela cheia está ativa e a pessoa navega para outra rota do painel THEN o modo SHALL terminar
  junto com a tela — não existe tela cheia sem palco.
- WHEN a seção aberta no editor é removida pelo `⋯` da lista THEN o comportamento SHALL ser o de hoje
  (`sectionId` que não existe mais cai na lista, sem tela de erro).
- WHEN `VITE_STORE_URL` não está definida THEN o palco SHALL continuar exibindo `previa-sem-loja`, e
  o controle de tela cheia **NÃO** SHALL ser oferecido — não há o que ampliar.
- WHEN a entrada selecionada no menu deixa de estar na barra (por troca de dispositivo) THEN o card
  com abas SHALL seguir a seleção que a tela já recalcula hoje, sem regra própria.

---

## Requirement Traceability

| ID | História | Fase | Tasks | Status |
| --- | --- | --- | --- | --- |
| FOCO-01, 03, 04, 07, 08 | H1 · P1: Trilho | Tasks | T7 | In Tasks |
| FOCO-02, 09 | H1 · P1: Trilho | Tasks | T6 | In Tasks |
| FOCO-05, 06, 11 | H1 · P1: Trilho | Tasks | T4 (+ T7 pelo fio) | In Tasks |
| FOCO-10 | H1 · P1: Trilho | Tasks | T5 → T7 | In Tasks |
| FOCO-12, 14 | H2 · P1: Larguras | Tasks | T8 | In Tasks |
| FOCO-13 | H2 · P1: Larguras | Tasks | T9 | In Tasks |
| FOCO-15, 19, 20, 21 | H3 · P1: Tela cheia | Tasks | T10, T11, T12 | In Tasks |
| FOCO-16, 17, 18 | H3 · P1: Tela cheia | Tasks | T2 | In Tasks |
| FOCO-22 | H3 · P1: Tela cheia | Tasks | T13 | In Tasks |
| FOCO-23, 24, 25 | H4 · P2: Lista sem lixeira | Tasks | T14 | In Tasks |
| FOCO-26, 27 | H4 · P2: Lista sem lixeira | Tasks | T15 | In Tasks |
| FOCO-28, 30, 32 | H5 · P2: Editor em abas | Tasks | T16 | In Tasks |
| FOCO-29, 31 | H5 · P2: Editor em abas | Tasks | T17 | In Tasks |
| FOCO-33, 34 | H6 · P2: Salvando… | Tasks | T17 | In Tasks |
| FOCO-35, 36, 37 | H7 · P2: Abas no celular | Tasks | T18 | In Tasks |

**ID format:** `FOCO-NN` · **Cobertura:** **37 no total, 37 mapeados em tasks, 0 sem task.**
T1 e T19 não carregam requisito: são a medição da baseline e o fecho.

---

## Guardas existentes que esta feature toca

Nenhum se conserta afrouxando. Cada um abaixo é **estendido** ou **provado intacto**.

| Guarda | O que acontece | Regra |
| --- | --- | --- |
| `AdminLayout.test.tsx` | O `className` do `<aside>` deixa de ser literal. A **âncora** (`classesDe('aside') !== ''`) passaria a medir string vazia | Estender `classesDe` para ler também `className={cn('…', …)}`, mantendo a âncora e o sensor. Acrescentar os casos do trilho — não substituir os de hoje |
| `navCollapse.test.ts` | Nada muda | O trilho usa **outra** chave e **outro** módulo. Provar por asserção que o trilho não lê nem escreve `estrelinha.admin.nav-collapsed` (`FOCO-11`) |
| `previaUnica.test.ts` | Arquivos novos entram em `store-menu/ui` (o card com abas) e o palco ganha um modo | Nada chamado `*Preview`; o palco continua sendo o único iframe; a régua do carrossel segue intocada (`FOCO-22`) |
| `touchTarget.test.ts` (loja) | **Não alcança o painel** (varre `apps/store/src`) | Os 44px do trilho ganham asserção própria em `AdminLayout.test.tsx`. **Não** copiar `TAP_44` para o backoffice — seria um segundo dono da medida |
| `navItems.test.ts` | Nada muda | A ordem das rotas continua saindo de `navGroups`; o trilho consome a **mesma** fonte (`FOCO-02`) |

---

## Success Criteria

- [ ] Em 1440 com o trilho recolhido, `/admin/home` mede coluna **440** e palco **872**, e a métrica
      do palco lê **`1024 × 768 · 81%`**.
- [ ] Tela cheia lê **`1024 × <altura> · 100%`**, e `Esc` volta sem recarregar a prévia.
- [ ] `/admin/menu` rola a coluna esquerda com a prévia parada.
- [ ] Nenhuma linha da lista de seções exibe lixeira, e "Remover" continua alcançável por mouse e por
      teclado.
- [ ] `pnpm --filter @estrelinha/backoffice test` e `@estrelinha/store` passam sem regressão contra a
      baseline medida no início da execução, com exit code capturado **fora de pipe**.
- [ ] `packages/core/src/payment/**` sem uma linha alterada (`git diff --name-only`).
