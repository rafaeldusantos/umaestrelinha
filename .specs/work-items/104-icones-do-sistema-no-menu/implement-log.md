# Log da implementação por ondas — 104

## T01 — pd-impl-task · aborted · agente a38d01f37149eaae2

(sem resposta: error)

## T02 — pd-impl-task · aborted · agente ae5318ef3146ea6cb

(sem resposta: error)

## T01 — pd-impl-task · review · agente a97cf9fb7b30f0d54

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104/.specs/work-items/104-icones-do-sistema-no-menu/tasks/01-icones-do-sistema.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

Uma execução anterior deixou estas decisões prontas na árvore. Esta execução conferiu cada uma e manteve todas.

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Em `core/menu/icons.ts`, a lista antiga virou `MENU_BRAND_ICON_KEYS` (as 29 da marca). Entrou `MENU_SYSTEM_ICON_KEYS` (as 10 do sistema). `MENU_ICON_KEYS` agora é a marca seguida do sistema. Os grupos ficam em `MENU_ICON_GROUPS` (`{ id: 'marca' \| 'sistema', keys }`), com o tipo `MenuIconGroup` | um mapa chave → grupo; títulos dos grupos dentro do core | A divisão é dado e mora no core. O título é texto de tela e mora no painel. `MENU_ICON_KEYS` continua sendo a lista inteira, então `menuIconKey`, `parseRoot` e `Record<MenuIconKey,…>` não mudam | `core/menu/icons.ts` (reexportado pelo barril `index.ts`, que é da 02 e não foi editado); `MenuIconPicker.tsx` e o teste dele |
| 2 | Os títulos "Da Uma Estrelinha" e "Do sistema" vivem em `TITULO_DO_GRUPO`, dentro de `MenuIconPicker.tsx`. Cada grupo é uma `<section role="group" aria-labelledby>` com um `<h3>` | títulos vindos do core | Menor superfície possível, e o grupo fica acessível pelo nome | `MenuIconPicker.tsx` |
| 3 | O contador continua "N no conjunto". Com os dois grupos, N passa a ser 39. Na busca mostra "X de 39" | contar cada grupo à parte | É o mesmo `data-testid`, e a tarefa só pede que o contador acompanhe | `MenuIconPicker.tsx` e o teste dele |
| 4 | A prova da tela da loja usa `Header` e `MobileMenu` reais, num arquivo novo (`MenuIconeDoSistema.test.tsx`). Só o client do Supabase é dublado | editar `MegaMenu.test.tsx` ou `MobileMenu.test.tsx` | Esses dois são da 02 (estão na cerca) | só o teste novo |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O catálogo tem os dez do sistema, sem repetição, no formato e com rótulo; os grupos cobrem o catálogo sem sobreposição; `menuIconKey` lê uma chave do sistema como ela mesma; a âncora passou para 39 | unidade (core) | packages/core/src/menu/__tests__/icons.test.ts | sim | retomada |
| 2 | O seletor mostra os dois títulos com os ícones de cada grupo; a busca por rótulo e por chave acha no grupo do sistema; grupo sem resultado some junto com o título; "Sem ícone" continua; contador e cabeçalho atualizados | componente (painel) | apps/backoffice/src/features/store-menu/ui/MenuIconPicker.test.tsx | sim | retomada |
| 3 | Um item principal com ícone do sistema aparece desenhado na barra do computador e na folha do celular | componente (loja) | apps/store/src/widgets/header/ui/__tests__/MenuIconeDoSistema.test.tsx | sim | retomada |
| 4 | Os dez desenhos passam nos guardas sem afrouxar a régua | guarda (loja/core) | apps/store/src/shared/lib/__tests__/icons.test.ts, menuIconCatalog.test.ts, packages/core/src/menu/__tests__/purity.test.ts | sim | retomada |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104

## Arquivos alterados

packages/core/src/menu/icons.ts — alterado
packages/core/src/menu/__tests__/icons.test.ts — alterado
packages/ui/src/icons/index.ts — alterado
packages/ui/src/icons/EtiquetaIcon.tsx — criado
packages/ui/src/icons/PorcentagemIcon.tsx — criado
packages/ui/src/icons/PresenteIcon.tsx — criado
packages/ui/src/icons/CoracaoIcon.tsx — criado
packages/ui/src/icons/CupomIcon.tsx — criado
packages/ui/src/icons/FreteIcon.tsx — criado
packages/ui/src/icons/CalendarioIcon.tsx — criado
packages/ui/src/icons/InformacaoIcon.tsx — criado
packages/ui/src/icons/DuvidaIcon.tsx — criado
packages/ui/src/icons/InicioIcon.tsx — criado
apps/backoffice/src/features/store-menu/ui/MenuIconPicker.tsx — alterado
apps/backoffice/src/features/store-menu/ui/MenuIconPicker.test.tsx — alterado
apps/store/src/widgets/header/ui/__tests__/MenuIconeDoSistema.test.tsx — criado

## Verificação

Comando de um arquivo de teste, `pnpm --filter <w> exec vitest run <arquivo> --testTimeout=20000` (fonte: PROJECT.md › Comandos de verificação):
- core: `icons.test.ts` e `purity.test.ts` — 41/41 verdes.
- store: `icons.test.ts`, `menuIconCatalog.test.ts` e `MenuIconeDoSistema.test.tsx` — 30/30 verdes.
- backoffice: `MenuIconPicker.test.tsx` — 26/26 verdes.

Conferência de tipos, `npx tsc --noEmit -p …` (fonte: CLAUDE.md › Comandos/Baselines). Não veio `baseline` no briefing, então a comparação é com a tabela de Baselines do CLAUDE.md:
- store: 0 erros, igual ao baseline.
- backoffice: 7 erros, todos em `ProposalStateBadge.test.tsx` (TS2304 e TS2593), iguais ao baseline.
- core: 11 erros (`carousel.test.ts` 5, `pickHomeBanners` 1, `pickHomeCollections` 1, `sitemap/urls.test` 2, `supabase/client.ts` 2), iguais ao baseline.
- Nenhum erro novo, e nenhum em arquivo desta tarefa.

Verificação mínima, a suíte de cada workspace tocado com `pnpm --filter @estrelinha/<w> test --testTimeout=20000` (fonte: CLAUDE.md › Baselines e PROJECT.md):
- core: exit 0, 6282 testes em 259 arquivos.
- backoffice: exit 0, 5589 testes em 312 arquivos.
- store, 1ª rodada: os 7873 testes (419 arquivos) passaram, mas o comando saiu com exit 1. A causa é um `[vitest-worker]: Timeout calling "onTaskUpdate"`, um erro do próprio worker, não de teste.
- store, 2ª rodada: exit 1, com 7872 passando e 1 estouro de 20 s em `marcacaoSoPorAcao.test.ts` (SC5), mais o mesmo erro do worker.
- `marcacaoSoPorAcao.test.ts` sozinho: os 102 testes passaram, e de novo só o erro do worker. Ele não tem relação com esta tarefa.
- Load average da máquina no momento: 66–74, com a 02 rodando em paralelo. Esse erro já está registrado em `docs/baselines-historico.md` como contenção, não teste.

ESLint (`npx eslint`) nos arquivos tocados de backoffice e store: exit 0.

Probe de gravação no Supabase local (`:54441`, AD-012): rodei um script Node no scratchpad, com o JWT de um admin local assinado com o JWT_SECRET local.
- Fez o `PATCH store_settings?key=eq.menu&updated_at=eq.<visto>&select=updated_at`, com o valor v2 e um item principal `icon: 'presente'`.
- Resposta 200, 1 linha.
- Relido como admin: `version` 2, `icon` "presente", itens iguais ao gravado em comparação profunda.
- Relido como anon (a loja): `icon` "presente".
- O valor original foi devolvido: 200, igual ao de antes em comparação profunda (o `updated_at` mudou pelo gatilho).

Instruções lidas: packages/ui/CLAUDE.md (inteiro); packages/core/CLAUDE.md › Pureza, › `menu`; apps/backoffice/CLAUDE.md › `/admin/menu — o menu montado pela dona`; apps/store/CLAUDE.md › Ícones e marca, › Menu (consumo); DESIGN.md §1, §8; CLAUDE.md › Comandos, › Convenções que valem em todo o repositório, › Os guardas (só as linhas de ícone e menu da tabela, que tem ~94 KB), › Baselines; .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- Retomada: as quatro fatias já estavam na árvore, com teste e implementação. Rodei os testes delas (verdes) e dei as quatro por fechadas sem refazer o check de mutação. A revisão deve olhar as asserções sabendo disso. O teste da loja tem um sensor próprio que mostra que a comparação separa um ícone do sistema de outro.
- Na árvore há trabalho da 02 (`labelColor`, `structure`, `refusals`, `documentOps`, `MenuItemEditor` e outros). Não foi tocado.
- Ao fechar, a suíte da loja não deu exit 0 nas duas rodadas, sempre pelo erro de worker do vitest sob carga alta, e nenhuma asserção falhou. O detalhe está em Verificação. Não rodei uma terceira vez.
- O probe usou um JWT montado com a chave local, e não o login real do painel. A policy `store_settings_admin_write` (`has_role(auth.uid(),'admin')`) foi exercida de verdade.
- `MenuIconPicker.tsx` já importava `Ban` e `Search` do `lucide-react` para o próprio controle (não são ícones do menu). Ficou como estava.
- Nenhuma citação morta. Os exemplares (`SacolaIcon.tsx`, `ESTRELINHA_ICONS`, `MENU_ICON_KEYS`/`LABELS`, `MenuIconPicker.tsx`) e os contratos (`menuIconKey`, `MENU_ICON_COMPONENTS`) foram conferidos.
- Não há tarefas depois desta. A 02 está na mesma onda e nenhuma afirmação dela ficou falsa, então nada foi propagado.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 01
Caso: fechou com divergência
Instruções lidas: packages/ui/CLAUDE.md; packages/core/CLAUDE.md › Pureza, › menu; apps/backoffice/CLAUDE.md › /admin/menu; apps/store/CLAUDE.md › Ícones e marca, › Menu (consumo); DESIGN.md §1, §8; CLAUDE.md (raiz) › Comandos, › Convenções, › Os guardas, › Baselines; .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local
Testes escritos: catálogo, grupos e menuIconKey — packages/core/src/menu/__tests__/icons.test.ts; seletor com dois títulos, busca por rótulo e por chave, grupo que some, "Sem ícone" fixo, contador e cabeçalho — apps/backoffice/src/features/store-menu/ui/MenuIconPicker.test.tsx; barra do computador e folha do celular desenham o ícone do sistema — apps/store/src/widgets/header/ui/__tests__/MenuIconeDoSistema.test.tsx (novo); guardas icons/menuIconCatalog/purity rodados sem mudar a régua. Sem lacuna.
Verificações: testes dos arquivos verdes (core 41, store 30, backoffice 26); tsc store 0, backoffice 7, core 11, iguais ao baseline; suítes: core 6282 verdes (exit 0), backoffice 5589 verdes (exit 0), store 7873 passando mas exit 1 por "Timeout calling onTaskUpdate" do worker vitest sob carga 66–74 (e 1 estouro de 20 s em marcacaoSoPorAcao, verde sozinho); probe no Supabase local: update v2 com icon 'presente' respondeu 200 com 1 linha, relido igual pelo admin e pelo anon, valor original restaurado; eslint dos arquivos tocados limpo
Árvore de trabalho: core/menu/icons.ts e o teste; ui/icons/index.ts mais 10 *Icon.tsx novos; backoffice MenuIconPicker.tsx e o teste; store widgets/header/ui/__tests__/MenuIconeDoSistema.test.tsx (novo); nada commitado
Citações conferidas: 7 (SacolaIcon.tsx, ParcelasIcon via guarda, ESTRELINHA_ICONS, MENU_ICON_KEYS/LABELS, MenuIconPicker.tsx, menuIconKey, MENU_ICON_COMPONENTS); nenhuma deslocada nem morta
```

## T02 — pd-impl-task · review · agente a824b26acbe51ea55

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104/.specs/work-items/104-icones-do-sistema-no-menu/tasks/02-cor-do-texto-do-item.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Na barra do computador, `style={{ color }}` vai no próprio `<Link>`/`<a>` da entrada (categoria, link interno e externo, com ou sem painel). O chevron herda a cor. O ícone mantém `text-estrelinha-accent` | envolver só o nome num `<span>` com a cor | o `style` vence `hover:text-white` e o `text-white` do aberto (P-05), sem mudar o DOM que os testes existentes medem. A régua de 2px continua sendo a pista do aberto | `MegaMenu.tsx` e os testes dele |
| 2 | Na folha do celular, a cor vai só no `<span>` do rótulo (link direto e acordeão). O chevron mantém as classes dele | pintar a linha inteira | o Design diz que a pista do aberto no celular é o chevron, que precisa ficar no tom de hoje | `MobileMenu.tsx` |
| 3 | Probe com a chave service role no Supabase local (:54441). Como a linha local não tinha v2, montei um documento v2 mínimo. Gravei `labelColors` no item 0, reli e restaurei o `value` original | provar como admin autenticado | não tenho credencial de admin local. O probe mostra que a coluna jsonb guarda e devolve `labelColors`, mas não exercita a RLS | só a prova (RLS de `store_settings` já provada na 86) |
| 4 | (corrida anterior, que assumo) A régua de cor em `menuDocumentRefusal` segue o `anterior`: a cor ilegível que o item já tinha gravada não trava as outras ações. Escolher uma cor nova abaixo do piso recusa | régua sempre estrita | é a mesma régua que o teto do submenu usa no repositório | `core/menu/refusals.ts`, `useStoreMenu` |
| 5 | (corrida anterior) Item sem cor válida nas duas superfícies não leva a chave `labelColors` (leitura e `updateNode`). O patch da raiz sempre leva `labelColors` (`{bar:null, sheet:null}` sem cor) | gravar `labelColors: {null,null}` | documento sem cor lê igual ao de antes, e a mesma cor devolve o mesmo documento | `structure.ts`, `documentOps.ts`, testes de igualdade do patch |
| 6 | (corrida anterior) O editor recusa antes da rede um código digitado fora de `#RRGGBB` (`MENU_LABEL_COLOR_FORMAT`, de core) | deixar virar "sem cor" calado | gravado, ele seria lido como sem cor e o rótulo voltaria ao padrão sem aviso | `MenuItemEditor.tsx`, `labelColor.ts` |
| 7 | (corrida anterior) `labelColor.ts` exporta também `menuLabelColorSurfaceRefusal` e `menuLabelColorApproval` (a medida por campo, verde ou vermelha) e `MENU_LABEL_HEX` | o painel calcular a medida | defeito 01: a medida e a frase vêm de core, e o painel só mostra | superfície pública de `core/menu` |
| 8 | (corrida anterior) O guarda dos fundos também lê do disco as classes `bg-estrelinha-primary` da barra (`Header.tsx`) e `bg-white` da folha (`MobileMenu.tsx`) | comparar só os tokens | é o desenho que diz qual é o fundo | `fundosDaCorDoRotulo.test.ts` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `menuLabelColorsOf` aceita `#RRGGBB` e devolve null no resto; `menuLabelColorRefusal` recusa barra (Padrão e Black Friday) e folha abaixo de 4,5:1 com a medida, e aceita no piso | unidade (core) | packages/core/src/menu/__tests__/labelColor.test.ts | sim | retomada |
| 2 | A leitura preserva `labelColors` válido e descarta o inválido; legado sem cor | unidade (core) | structure.test.ts, legacy.test.ts | sim | retomada |
| 3 | A porta entrega `bar` à barra e `sheet` à folha | unidade (core) | structureMenuItems.test.ts | sim | retomada |
| 4 | `menuDocumentRefusal` recusa a cor ilegível | unidade (core) | refusals.test.ts | sim | retomada |
| 5 | O rascunho da prévia carrega a cor | unidade (core) | preview.test.ts | sim | retomada |
| 6 | Os fundos copiados são iguais aos de `ESTRELINHA_PROFILES`, com sensor | guarda (loja) | apps/store/src/shared/lib/__tests__/fundosDaCorDoRotulo.test.ts | sim | retomada |
| 7 | Editor: dois campos, grava `labelColors` (igualdade exata), mostra a medida, recusa antes da rede, "Usar a cor padrão" volta a null, o filho não tem campo nem `labelColors` | componente (painel) | MenuItemEditor.test.tsx | sim | retomada |
| 8 | `documentOps`: `labelColors` só na raiz, mesma cor devolve o mesmo documento | componente (painel) | documentOps.test.ts | sim | retomada |
| 9 | `useStoreMenu`: o documento gravado leva a cor; a ilegível é recusada sem rede | componente (painel) | useStoreMenu.test.ts | sim | retomada |
| 10 | Barra: rótulo na cor `bar` (link interno e externo), também aberto, com a régua mantida; sem cor continua `on-primary`; o ícone continua `accent`; a cor não vaza para o submenu nem para o "ver tudo" | componente (loja) | apps/store/src/widgets/header/ui/__tests__/MegaMenu.test.tsx | sim | — |
| 11 | Folha: rótulo na cor `sheet` no link direto e no acordeão (fechado e aberto), chevron mantido; sem cor como hoje; a cor não vaza para as filhas | componente (loja) | apps/store/src/widgets/mobile-menu/ui/__tests__/MobileMenu.test.tsx | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104

## Arquivos alterados

packages/core/src/menu/labelColor.ts criado
packages/core/src/menu/__tests__/labelColor.test.ts criado
packages/core/src/menu/structure.ts alterado
packages/core/src/menu/refusals.ts alterado
packages/core/src/menu/index.ts alterado
packages/core/src/menu/__tests__/structure.test.ts alterado
packages/core/src/menu/__tests__/legacy.test.ts alterado
packages/core/src/menu/__tests__/structureMenuItems.test.ts alterado
packages/core/src/menu/__tests__/refusals.test.ts alterado
packages/core/src/menu/__tests__/preview.test.ts alterado
apps/backoffice/src/features/store-menu/model/documentOps.ts alterado
apps/backoffice/src/features/store-menu/model/documentOps.test.ts alterado
apps/backoffice/src/features/store-menu/model/useStoreMenu.test.ts alterado
apps/backoffice/src/features/store-menu/ui/MenuItemEditor.tsx alterado
apps/backoffice/src/features/store-menu/ui/MenuItemEditor.test.tsx alterado
apps/backoffice/src/features/store-menu/ui/MenuLabelColorField.tsx criado
apps/store/src/shared/lib/__tests__/fundosDaCorDoRotulo.test.ts criado
apps/store/src/widgets/header/ui/MegaMenu.tsx alterado
apps/store/src/widgets/header/ui/__tests__/MegaMenu.test.tsx alterado
apps/store/src/widgets/mobile-menu/ui/MobileMenu.tsx alterado
apps/store/src/widgets/mobile-menu/ui/__tests__/MobileMenu.test.tsx alterado

## Verificação

- Um arquivo de teste (PROJECT.md › Comandos de verificação): `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`
  - core, os 6 arquivos de menu: 205/205
  - backoffice, documentOps, useStoreMenu e MenuItemEditor: 116/116
  - store, fundosDaCorDoRotulo: 5/5
  - MegaMenu: vermelho 3, depois 1 por defeito do teste, depois 43/43
  - MobileMenu: vermelho 3, depois 41/41
- Guardas (mesmo comando), todos verdes:
  - store: `contrast`, `accentText`, `arbitraryTextColor`, `menuDocumentoComDonoUnico`, `menuSemTeto`, `menuSemItemFixo`, mais `widgets/header` e `widgets/mobile-menu`: 354/354
  - backoffice `previaUnica`: 43/43
  - core `menu/__tests__/purity`: 15/15
- Tipos (CLAUDE.md › Comandos), comparados com a tabela de Baselines do CLAUDE.md porque não veio `baseline`:
  - `npx tsc --noEmit -p packages/core/tsconfig.json`: 11 erros, os mesmos arquivos e códigos herdados (carousel, pickHome*, sitemap/urls, supabase/client)
  - `apps/backoffice/tsconfig.app.json`: 7 erros, todos em ProposalStateBadge.test.tsx (baseline)
  - `apps/store/tsconfig.app.json`: 0
  - Delta contra o baseline: nenhum.
- Verificação mínima (CLAUDE.md › Baselines, a suíte de cada workspace tocado):
  - core: 259 arquivos, 6282 testes, exit 0.
  - backoffice: exit 1, com 5563 passando, 1 falhando e 25 skip. Falharam 2 arquivos, ambos por timeout sob carga: `AdminOrdersPage.aviso.test.tsx` (70 s) e o hook de `labels.test.ts` (10 s). Os dois rodados sozinhos: 105/105, exit 0. Nenhum é desta tarefa.
  - store: 419 arquivos e 7873 testes passando, mas exit 1 por 1 "Unhandled Error: [vitest-worker]: Timeout calling onTaskUpdate". É um erro de RPC do worker sob carga (a tarefa 01 rodava ao mesmo tempo na árvore), não um teste.
- Lint (`npx eslint` nos arquivos tocados, backoffice e store): limpo.
- Probe da gravação (AD-012), Supabase local em :54441:
  - O `PATCH store_settings?key=eq.menu&updated_at=eq.<visto>&select=updated_at` com `labelColors {bar:#F7D9A0, sheet:#7A1F1F}` devolveu 200 e 1 linha.
  - Relido: `labelColors` igual, documento igual com chaves ordenadas.
  - Valor original restaurado: 200, igual.
- Instruções lidas:
  - `CLAUDE.md` › Comandos, › O "defeito 01", › Convenções que valem em todo o repositório, › Baselines; e › Os guardas, só as linhas dos guardas citados (a seção tem ~95 KB)
  - `packages/core/CLAUDE.md` › Pureza, › `menu`, › Convenções de tipo
  - `apps/backoffice/CLAUDE.md` › Molde dos formulários, › A ponte da prévia, › `/admin/menu`
  - `apps/store/CLAUDE.md` › Design system, › Modo prévia, › Menu (consumo)
  - `DESIGN.md` §2 e §8
  - `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local

## Divergências e descobertas

- Retomada: as fatias 1 a 9 (core, guarda e painel) já estavam prontas na árvore. Rodei os testes delas, verdes, e não as reescrevi. Faltava a parte da loja (MegaMenu e MobileMenu), que fiz nesta corrida.
- Sem `baseline` no briefing: comparei com a tabela de Baselines do CLAUDE.md (core 11 · backoffice 7 · store 0).
- A verificação mínima do backoffice e da store não fechou em exit 0, só por timeout de carga (detalhe em Verificação). Os arquivos falhos do backoffice passam sozinhos, e nenhuma falha toca arquivo desta tarefa.
- O probe usou a chave service role, não a sessão de admin (premissa 3). O banco local não tinha menu v2, e o probe montou um documento mínimo e restaurou o original.
- Em `widgets/header` também rodou `MenuIconeDoSistema.test.tsx`, que é da tarefa 01, e passou.
- Lições de QA: nenhum padrão se aplica direto. Cobri "estado que persiste" pelo teste existente de abrir o editor com as cores gravadas.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 02
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, por seção), packages/core/CLAUDE.md, apps/backoffice/CLAUDE.md, apps/store/CLAUDE.md (por seção), DESIGN.md §2 e §8, .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: labelColor.test.ts (formato, recusa na barra Padrão/Black Friday e na folha, piso); structure.test.ts e legacy.test.ts (leitura tolerante, legado sem cor); structureMenuItems.test.ts (bar→barra, sheet→folha); refusals.test.ts (documento com cor ilegível); preview.test.ts (rascunho leva a cor); fundosDaCorDoRotulo.test.ts (guarda com sensor); MenuItemEditor.test.tsx (campos, patch exato, medida, recusa antes da rede, padrão→null, filho sem campo); documentOps.test.ts (só raiz, mesmo documento); useStoreMenu.test.ts (gravado leva a cor); MegaMenu.test.tsx (cor bar, aberto, sem cor on-primary, ícone no tom dele); MobileMenu.test.tsx (cor sheet no link direto e no acordeão, sem cor como hoje). Nada ficou sem cobertura.
Verificações: testes por arquivo verdes; guardas contrast, accentText, arbitraryTextColor, previaUnica, menuDocumentoComDonoUnico, menuSemTeto, menuSemItemFixo e core/menu purity verdes; tsc core 11 / backoffice 7 / store 0, iguais ao baseline; suíte core verde; suíte backoffice com 2 timeouts de carga que passam sozinhos; suíte store com todos os testes passando e 1 erro de RPC do worker; probe de gravação no Supabase local ok, com restauração.
Árvore de trabalho: os 21 arquivos listados em Arquivos alterados; nada commitado.
Citações conferidas: 4 abertas nesta corrida (MegaMenu.test.tsx › temToken, CampaignBand.tsx › style, MegaMenu.tsx, MobileMenu.tsx); nenhuma deslocada ou morta. As de core e painel foram usadas pela corrida anterior.
```

## T01 — pd-impl-review · done · agente a4b342732ef19828f

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104/.specs/work-items/104-icones-do-sistema-no-menu/tasks/01-icones-do-sistema.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| nada |       |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o seletor mostra "Da Uma Estrelinha" e "Do sistema" com os dez ícones novos, e a busca acha nos dois | `MenuIconPicker.tsx` (`TITULO_DO_GRUPO`, `grupos` filtrado por grupo via `MENU_ICON_GROUPS`, `<section role="group" aria-labelledby>` + `<h3>`); `core/menu/icons.ts` (`MENU_SYSTEM_ICON_KEYS`, rótulos) | sim |
| os dez desenhos passam em `icons.test.ts` e `menuIconCatalog.test.ts` sem mudança de régua | dez `packages/ui/src/icons/*Icon.tsx` + registro em `ESTRELINHA_ICONS`; os dois guardas não estão no diff (sem mudança de régua) | só execução |
| um item com ícone do sistema aparece na barra e na folha do celular (teste novo) | `apps/store/src/widgets/header/ui/__tests__/MenuIconeDoSistema.test.tsx` | sim (passar é só execução) |
| a gravação de uma chave do sistema provada por probe no Supabase local | não aparece no diff, por natureza: é registro de retorno | só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver seção Testes | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório | — | só execução |

## Obrigações

- Cada `*Icon.tsx` (viewBox/strokeWidth por constante, `fill="none"` só na raiz, `stroke="currentColor"`, realce só por `ICON_ACCENT`, sem cor literal, sem width/height, `className`, `aria-hidden`, `focusable="false"`, JSDoc): aplicada nos dez arquivos (conferido um a um). O `strokeWidth={ICON_STROKE}` fica em cada elemento, como em `SacolaIcon.tsx`, o exemplar.
- `core/menu` sem React nem `@estrelinha/ui`; imports relativos com `.ts`: aplicada. `icons.ts` continua sem import, e o barril `index.ts` já tinha `export * from './icons.ts'`.
- Rótulos neutros, sem urgência: aplicada (Etiqueta, Porcentagem, Presente, Coração, Cupom, Frete, Calendário, Informação, Dúvida, Início).
- Alvos de toque ≥ 44px: aplicada. `CELA` (`min-h-[76px] w-[100px]`) não mudou.
- A suíte da loja guarda: os guardas da loja não mudaram, e rodá-los é só execução.
- Probe HTTP contra o Supabase local: não se confere no diff. É registro de retorno do implementador.
- Comentários de `packages/ui/src/icons/index.ts` e de `core/menu/icons.ts` declarando a exceção (decisão já tomada): aplicada nos dois cabeçalhos.

## Testes

- Unidade (core), `packages/core/src/menu/__tests__/icons.test.ts`: o novo bloco "os ícones do sistema" assere os dez em ordem e no catálogo, os rótulos, que nenhum contém mecha nem unha, e que `menuIconKey` lê a chave como ela mesma (inclusive com caixa e espaço). O bloco "os grupos do seletor" testa a ordem e a identidade (`toBe`) e a cobertura sem sobreposição: tamanho igual, Set igual e interseção vazia. Formato, não repetição e rótulo valem pelos testes existentes sobre `MENU_ICON_KEYS`, que agora inclui os dez. A âncora foi para 39, e a marca ficou ancorada em 29. Morde.
- Componente (painel), `MenuIconPicker.test.tsx`: testa os dois títulos com as celas exatas de cada grupo, "Sem ícone" fora dos grupos e a busca pelo rótulo "Etiqueta", que acha no sistema enquanto a marca some com o título. Testa também a busca pela chave `informacao`, o grupo do sistema sumindo na busca `gravacao`, o contador em 39 e o cabeçalho sem "desenhados para a loja". Morde: as asserções são por igualdade de lista e por ausência de `group` e `heading`.
- Componente (loja), arquivo NOVO `MenuIconeDoSistema.test.tsx`: monta `Header` e `MobileMenu` reais e dubla só o Supabase. Compara o `innerHTML` do `<svg>` do item com o de `PresenteIcon` renderizado à parte, e tem um sensor que prova que `etiqueta` não passa por `presente`. Morde.
- Guardas rodados sem afrouxar: não estão no diff (nenhum afrouxamento). Rodar é só execução.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `MENU_BRAND_ICON_KEYS` + `MENU_SYSTEM_ICON_KEYS`; `MENU_ICON_KEYS` = marca + sistema; `MENU_ICON_GROUPS` com `MenuIconGroup` | sim | Contrato: "`MENU_ICON_KEYS` passa a ser marca + sistema" e "o grupo de cada chave". `packages/core/CLAUDE.md` e `packages/ui/CLAUDE.md` põem a chave (dado) no core. `menuIconKey` não mudou. | sim. O barril `core/menu/index.ts` faz `export * from './icons.ts'`, então os nomes novos chegam ao painel sem editar a posse da 02. Os únicos consumidores de `MENU_ICON_KEYS` fora de testes são o picker e o próprio core. A tarefa 02 não consome nada disso, e a linha 74 dela declara esses arquivos como da 01. |
| 2 | Títulos em `TITULO_DO_GRUPO` no picker; `<section role="group" aria-labelledby>` + `<h3>` | sim | Nada no arquivo de instruções nem na tarefa põe o texto de tela no core | sim |
| 3 | Contador "N no conjunto" com N = 39; "X de 39" na busca | sim | O Design não pede contador por grupo, e o `data-testid` `contador-icones` continua | sim |
| 4 | Prova da loja em arquivo novo com `Header`/`MobileMenu` reais | sim | Testes: "arquivo NOVO (não edite `MegaMenu.test.tsx` nem `MobileMenu.test.tsx`, que são da 02)" | sim |

## Não conferido

- O resultado da execução de todos os testes (o do core, o do picker, o novo da loja e os guardas `icons.test.ts`, `menuIconCatalog.test.ts` e `purity.test.ts`), os tipos, o lint e a verificação mínima da raiz: não rodo nada.
- O probe HTTP contra o Supabase local (`:54441`): é registro de retorno do implementador, sem nada no diff que o prove.
- Que os dez paths não foram copiados do `lucide-react` (P-01). Nenhum import de lucide nos arquivos novos, e as coordenadas diferem dos glifos lucide equivalentes que conheço (info, help, house, tag, ticket, percent, calendar). Ainda assim, não comparei com o pacote instalado.
- Fidelidade visual dos desenhos, o que só se vê em navegador.
- Todos os `alterados` aparecem no diff (os novos como `A`, via intent-to-add), então há baseline para todos.
- Os demais arquivos modificados na árvore (`structure.ts`, `refusals.ts`, `index.ts`, `MegaMenu.tsx`, `MobileMenu.tsx`, `documentOps.ts`, `MenuItemEditor.tsx`, `fundosDaCorDoRotulo.test.ts` etc.) são da posse da tarefa 02 da cerca e não foram julgados.

Instruções lidas: `packages/ui/CLAUDE.md` (inteiro); `packages/core/CLAUDE.md` › Pureza — e por que ela é asserida, › `menu` — a regra das quatro superfícies, › Convenções de tipo; `apps/backoffice/CLAUDE.md` › `/admin/menu` — o menu montado pela dona; `apps/store/CLAUDE.md` › Ícones e marca, › Menu (consumo); `CLAUDE.md` (raiz) › Convenções que valem em todo o repositório, › Os guardas — o que trava o quê (busca pelas linhas de ícone e menu), › Baselines. `DESIGN.md` §1 e §8: só o índice de títulos, não li o corpo, e por isso nenhum achado se apoia neles. Lições de QA (`licoes-qa.md`): lido; nenhum padrão se aplica ao diff.

## T02 — pd-impl-review · done · agente a1e6cf50e7cf08818

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104/.specs/work-items/104-icones-do-sistema-no-menu/tasks/02-cor-do-texto-do-item.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| nada | | | | | |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o editor do item principal grava `labelColors` e recusa, antes da rede, a cor abaixo de 4,5:1 em qualquer fundo/perfil | `MenuItemEditor.tsx` (o handler de salvar: checa o formato com `MENU_LABEL_HEX`, depois chama `menuLabelColorRefusal`, depois `onSave` com `{ label, icon, labelColors }`); `labelColor.ts › piorMedida` mede a barra contra os dois perfis de `STYLE_PROFILES` e a folha contra o branco; `AdminMenuPage.tsx:317` passa a `edicao` inteira para `updateNode`; `refusals.ts › menuDocumentRefusal` cobra de novo antes da rede em `useStoreMenu` | sim |
| a barra e a folha do celular desenham o rótulo na cor da superfície; sem cor, como hoje | `structure.ts › menuItems` (`labelColor: menuLabelColorFor(raiz.labelColors, surface)`); `MegaMenu.tsx` (`style: cor` em `gatilho` e no `<a>` externo sem painel; `undefined` quando não há cor); `MobileMenu.tsx` (`style={cor}` no `<span>` do rótulo do link direto e do acordeão) | sim |
| o guarda dos fundos compara a cópia com `ESTRELINHA_PROFILES`, com sensor | `apps/store/src/shared/lib/__tests__/fundosDaCorDoRotulo.test.ts`: âncora dos perfis, `divergencias` contra `primary`/branco, dois sensores (cópia divergente e perfil novo sem cópia) | sim |
| a gravação provada por probe no Supabase local | só a palavra do implementador (premissa 3) | só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório | — | só execução |

## Obrigações

- `labelColor.ts` sem React nem `@estrelinha/ui`, com imports relativos `.ts` explícitos (`import type` incluso) e reexportado em `core/menu/index.ts`: aplicada. O arquivo importa `../color/contrast.ts`, `../campaigns/text.ts`, `../appearance/types.ts`, `../appearance/copy.ts` e `./menu.ts`, todos com `.ts`. Os vizinhos (`appearance/copy.ts`, `campaigns/text.ts`) também importam com `.ts`. A reexportação está em `index.ts:22`.
- Veredito `string | null`: aplicada. `menuLabelColorRefusal`, `menuLabelColorSurfaceRefusal` e `menuLabelColorApproval` devolvem `string | null`, sem nenhuma união por booleano.
- Painel com `h-11`/44px, campo com `border-input` e `<Label htmlFor>`, sem arquivo `…Preview` novo e sem `<iframe>`: aplicada em `MenuLabelColorField.tsx`. O seletor tem `h-11 w-11 border-input`, o campo hex tem `h-11 border-input`, o botão "Usar a cor padrão" tem `min-h-11`, e há `<Label htmlFor={id}>`. Nenhum `…Preview` nem `iframe` no diff.
- Loja com cor por `style`, sem cor nada muda (a asserção de `on-primary` continua): aplicada em `MegaMenu.tsx` e `MobileMenu.tsx`. Não há `text-[#…]`. O `MegaMenu.test.tsx` mantém `text-estrelinha-on-primary` no caso sem cor.
- Probe HTTP no `:54441` com `labelColors`, relido igual: registrado na premissa 3. A prova não está no diff (ver Não conferido).

## Testes

- Unidade (core), `menuLabelColorsOf` aceita `#RRGGBB` e devolve `null` para o resto: `labelColor.test.ts`. Usa `it.each` com 8 formas inválidas por campo, 4 formas inválidas do campo inteiro, e um caso com uma superfície inválida e a outra válida. Morde.
- Unidade (core), recusa: `labelColor.test.ts`.
  - Barra no Padrão: `#B8945F` recusada com `3,3:1` e o perfil.
  - Cor que só reprova no Black Friday: `#222222`, com o pior perfil na frase e `not.toContain('1,7:1')`.
  - Folha sobre branco: `#777777` → `4,4:1`.
  - Cor que atinge o piso: `#ADBBC9`/`#767676` → `null`.
  - Morde.
- Unidade (core), leitura do documento: `structure.test.ts`.
  - A igualdade exata foi ajustada com `labelColors`.
  - O inválido some por superfície, e o campo inteiro inválido deixa o item sem a chave.
  - `legacy.test.ts` assere que nenhum item do legado tem `labelColors`.
  - Morde.
- Unidade (core), a porta entrega `bar` à barra e `sheet` à folha: `structureMenuItems.test.ts`, com os dois casos e mais a cor numa superfície só. `comoAntes` ganhou `labelColor: null`. Morde.
- Unidade (core), `menuDocumentRefusal` recusa o documento com a cor ilegível: `refusals.test.ts`. Cobre a barra, a folha, a cor legível, a cor fora do formato e a régua do `anterior`. Morde.
- Unidade (core), o rascunho da prévia carrega a cor: `preview.test.ts`. Morde, porque `preview.ts:126` passa o documento por `parseMenuDocument`, que descartaria uma chave que não lesse.
- Guarda (loja): `fundosDaCorDoRotulo.test.ts`, com sensores nos dois sentidos. Morde.
- Componente (painel): `MenuItemEditor.test.tsx`.
  - Mostra os dois campos, com as classes por token exato.
  - O patch sai em igualdade exata, e as quatro igualdades antigas foram ajustadas com `labelColors: {null,null}`.
  - A medida aparece verde ou vermelha, com a classe.
  - Recusa antes da rede: `onSave` não é chamado.
  - "Usar a cor padrão" grava `null`.
  - O filho não mostra o campo, e o patch dele é exatamente `{ label: null }`.
  - Morde.
- Componente (painel), `documentOps.test.ts`: `labelColors` só na raiz (filho → `toBe(DOC)`), a mesma cor devolve o mesmo documento por `toBe`, e voltar ao padrão remove a chave. Morde.
- Componente (painel), `useStoreMenu.test.ts`: o documento gravado leva a cor, e a cor ilegível é recusada sem chamada ao banco. Morde.
- Componente (loja), `MegaMenu.test.tsx`: cobre a cor `bar` por `style.color`, também aberto (com a régua `border-estrelinha-accent`), o ícone em `text-estrelinha-accent`, o link interno e o externo, o caso sem cor (`style.color === ''` e `on-primary`) e o submenu e o "ver tudo" sem cor. Morde.
- Componente (loja), `MobileMenu.test.tsx`: cobre o link direto e o acordeão, fechado e aberto (com o chevron em `text-estrelinha-primary`), o caso sem cor com as classes de sempre e nada vazando para as filhas. Morde.
- Guardas rodados sem afrouxar: nenhum guarda tocado no diff. Rodá-los é só execução.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Na barra, `style` no próprio `<Link>`/`<a>` da entrada; o ícone mantém `text-estrelinha-accent` | sim | Design: "Aberto e hover mantêm a cor da dona (P-05); a pista do aberto continua pela régua de 2px". `MegaMenu.tsx` mantém a régua em `className`, e `ItemIcon` tem classe própria | sim |
| 2 | Na folha, a cor vai só no `<span>` do rótulo; o chevron mantém o tom | sim | Design: "pelo chevron (celular)". O teste assere o chevron em `text-estrelinha-primary` com o item aberto | sim |
| 3 | Probe com service role, com um documento v2 mínimo montado e o `value` restaurado | sim, pelo que a obrigação pede (update + releitura de `labelColors`). A RLS fica sem exercício, e isso foi declarado | Obrigação: "probe HTTP … do `update` de `store_settings` com o documento contendo `labelColors`, relido igual" | sim (não vira código) |
| 4 | A régua de cor em `menuDocumentRefusal` segue o `anterior` | sim | É o mesmo desenho do teto do submenu: `useStoreMenu.ts:252-254` (`menuDocumentRefusal(proximo, base)`) e o docstring de `refusals.ts`. O editor continua estrito, o que cumpre "recusa, antes da rede" | sim (`refusals.ts`; `useStoreMenu` já passava `base`) |
| 5 | Item sem cor válida fica sem a chave `labelColors`; o patch da raiz sempre leva `labelColors` | sim | Contrato: "ausente em `legacyMenuDocument`". `mesmasCores` em `documentOps.ts` faz `{null,null}` sobre item sem cor devolver o mesmo documento, e há teste disso | sim (structure, documentOps, as igualdades do editor) |
| 6 | O editor recusa antes da rede um código fora de `#RRGGBB` | sim | O critério C-07 fala de leitura ("lido como sem cor"), e a leitura tolerante continua em `menuLabelColorsOf`. A recusa é só da tela, com a frase de core | sim |
| 7 | `labelColor.ts` exporta também `menuLabelColorSurfaceRefusal`, `menuLabelColorApproval` e `MENU_LABEL_HEX` | sim | A Design pede "a medida de contraste vinda de `core` (verde/vermelha)"; a Decisão diz "a régua de contraste e a frase vêm de core" | sim (barril de `core/menu`; a tarefa 01 não consome) |
| 8 | O guarda dos fundos lê também do disco a classe da barra (`Header.tsx`) e a da folha (`MobileMenu.tsx`) | sim | `Header.tsx:251` traz `hidden bg-estrelinha-primary md:block`. O `SheetContent` em `MobileMenu.tsx:102-108` tem `bg-white` na primeira `className` e nenhum `>` antes dela | sim |

## Não conferido

- A prova por probe no Supabase local (premissa 3) só existe na palavra do implementador: nenhum artefato do probe está no diff, e não rodo comando contra o banco.
- Passar `tsc` e a suíte, inclusive os guardas listados (`contrast`, `accentText`, `arbitraryTextColor`, `previaUnica`, `menuDocumentoComDonoUnico`, `menuSemTeto`, `menuSemItemFixo`, `core/menu/__tests__/purity`), é só execução. Isso vale também para:
  - outras construções de `MenuItem` fora dos `alterados`, que poderiam acusar o campo obrigatório novo `labelColor`;
  - o grafo transitivo de `labelColor.ts` no `purity` do menu, que agora alcança `campaigns/text.ts`, `time/zone.ts`, `campaigns/end.ts` e `campaigns/status.ts`. Conferi só os imports diretos.
- Todos os arquivos novos dos `alterados` aparecem como adição no `git diff` (intent-to-add presente), e nenhum ficou sem baseline.
- A saída de `git diff -- apps/store/` trouxe também `apps/store/src/widgets/header/ui/__tests__/MenuIconeDoSistema.test.tsx` e `packages/core/src/menu/__tests__/icons.test.ts`. Os dois estão na posse da tarefa 01 e fora dos `alterados`, e não foram julgados.
- Lições de QA conferidas (`licoes-qa.md`). A da [prévia] se aplica: a prévia recebe o documento salvo (o otimista) com `labelColors`, e `preview.ts` o preserva. O nome e o ícone também só vão à prévia depois de Salvar, então a cor segue o mesmo padrão. Nenhuma lição foi violada.

Instruções lidas:
- `packages/core/CLAUDE.md › Pureza — e por que ela é asserida`, `› menu — a regra das quatro superfícies` (com `› O documento da dona`), `› Convenções de tipo`
- `apps/backoffice/CLAUDE.md › Molde dos formulários`, `› A ponte da prévia`, `› /admin/menu — o menu montado pela dona`
- `apps/store/CLAUDE.md › Design system`, `› Modo prévia`, `› Menu (consumo)`
- `DESIGN.md › 2. Paleta`, `› 8. Checklist de revisão`
- `CLAUDE.md › O "defeito 01"`, `› Convenções que valem em todo o repositório`, `› Os guardas` (por busca nas linhas de `fieldBorder`, `arbitraryTextColor`, `previaUnica`, `purity` e `menuDocumentoComDonoUnico`; a tabela inteira excede a leitura útil), `› Baselines`.

## T03 — pd-impl-task · review · agente a82fe5202a951b30b

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104/.specs/work-items/104-icones-do-sistema-no-menu/tasks/03-bug-1-previa-do-editor-do-item.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O editor continua sendo o `Dialog` do Radix, mas agora não modal (`modal={false}`), e a interação fora dele não o fecha (`onInteractOutside` → `preventDefault`). Fecha por Esc, X, Cancelar ou Salvar. No `lg` ele fica preso à esquerda (`lg:left-4 lg:translate-x-0`, 576 px), em cima da coluna da lista, e deixa o palco da prévia à vista | Levar o editor para dentro da coluna da esquerda, no lugar da lista, como `/admin/home` faz (e como manda o "Editor é TELA, não modal" do `Molde dos formulários`) | É a menor mudança que conserta o bug. Esc, a volta do foco (Q07), o `AlertDialog` aninhado de descartar banners e as suítes existentes, que dependem da semântica do diálogo, continuam iguais. A troca para editor em coluna dá para fazer depois | `MenuItemEditor.tsx` e o comportamento de foco: sem modal, não há mais foco preso dentro do diálogo. A tarefa 04 mexe no mesmo arquivo |
| 2 | O rascunho sai do editor por uma prop nova, `onDraftChange(edit: MenuItemEdit)`. A página aplica esse rascunho com `updateNode`, a mesma operação pura do Salvar, a um `documentoDaPrevia` que só vai para a `MenuLivePreview`. O documento gravado e o `useStoreMenu` não mudam | Gravar o rascunho no `useStoreMenu` ou mudar a ponte | Nada é gravado antes do Salvar, e a ponte e o `core/menu` ficam intactos, como manda o `Não faça` | `AdminMenuPage.tsx`, `MenuItemEditor.tsx` |
| 3 | Cor fora de `#RRGGBB` ou recusada (abaixo de 4,5:1, por `menuLabelColorSurfaceRefusal`) não entra no rascunho. Naquela superfície vale a cor já gravada, porque é o que a loja continua desenhando. Campo vazio vale `null` (a cor padrão) | Mandar `null` (sem cor) no lugar da cor recusada | O Salvar nunca grava uma cor recusada, então a loja segue com a gravada. Mostrar `null` faria a prévia piscar para a cor padrão enquanto a dona digita | `MenuItemEditor.tsx`. A tarefa 04 muda o estado `corBarra`/`corFolha` que esse cálculo lê |
| 4 | Nome recusado ou vazio não entra no rascunho: vale o `label` gravado. "Usar o nome da categoria" manda `label: null` | Mandar o texto cru | A prévia mostra o que a loja desenharia | `MenuItemEditor.tsx` |
| 5 | O rascunho só sai depois que os campos do editor foram reiniciados para o nó aberto (estado `prontoPara`). Fechar o editor limpa o rascunho (`fecharEditor`), e a página também ignora o rascunho quando `emEdicao` é `null` | Mandar o rascunho a cada render | No commit da abertura os campos ainda guardam os valores da edição anterior, e sem essa espera a prévia mostraria por um instante o rascunho de outro item | `AdminMenuPage.tsx`, `MenuItemEditor.tsx` |
| 6 | Abaixo de `lg` (para cumprir a obrigação dos 390 px): o editor ganha o botão "Ver na prévia" (`editor-ver-previa`, `lg:hidden`, `min-h-11`), que leva à aba Prévia e esconde o editor com `max-lg:hidden`, sem fechá-lo nem perder o que foi escolhido. A coluna da prévia ganha "Voltar ao editor" (`voltar-ao-editor`, `lg:hidden`, `min-h-11`) enquanto há item em edição | Não fazer nada para o celular | Sem modal, a folha de baixo ainda cobriria as abas no celular, e a prévia ficaria fora de alcance com o editor aberto | `AdminMenuPage.tsx`, `MenuItemEditor.tsx` (props opcionais `onVerPrevia` e `recolhido`) |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Com o editor aberto, escolher um ícone do sistema e uma cor válida põe o ícone e a cor no rascunho daquele item, sem gravar | Componente (painel) | `AdminMenuPage.test.tsx` › "o ícone do sistema e as cores escolhidos chegam à prévia, sem gravar" | sim | — |
| 2 | Cancelar o editor sem salvar devolve à prévia o documento gravado | Componente (painel) | › "cancelar o editor sem salvar devolve à prévia o documento gravado" | sim | vermelho (primeira mutação ficou verde, ver Divergências) |
| 3 | Com o editor aberto, o alternador Celular/Computador da prévia continua alcançável | Componente (painel) | › "com o editor aberto, o alternador Celular/Computador da prévia continua ao alcance" | sim | — |
| 4 | Uma cor recusada não chega ao rascunho como cor do item | Componente (painel) | › "uma cor recusada não chega à prévia como cor do item" | sim | vermelho |
| 5 | (obrigação dos 390 px) Abaixo de `lg`, o editor leva à prévia e volta, sem fechar | Componente (painel) | › "abaixo de `lg`, o editor leva à prévia e a prévia volta ao editor, sem fechá-lo" | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104

## Arquivos alterados

apps/backoffice/src/features/store-menu/ui/MenuItemEditor.tsx alterado
apps/backoffice/src/pages/admin/AdminMenuPage.tsx alterado
apps/backoffice/src/pages/admin/AdminMenuPage.test.tsx alterado

## Verificação

- Um arquivo de teste (`PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminMenuPage.test.tsx -t … --testTimeout=20000`, rodado por fatia. Todas viram vermelho→verde ou passaram pelo check de mutação.
- Arquivos tocados e guardas (mesmo comando): `AdminMenuPage.test.tsx`, `src/features/store-menu`, `previaUnica.test.ts`, `animacaoRespeitaMovimento.test.ts`, `folgaDoPalco.test.ts` deram 14 arquivos, 473/473, exit 0. Na loja, `menuDocumentoComDonoUnico.test.ts` e `touchTarget.test.ts` deram 24/24, exit 0.
- Tipos (`CLAUDE.md` › Comandos): `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` deu 7 erros, todos em `ProposalStateBadge.test.tsx` (TS2304 ×3, TS2593 ×4). É exatamente o baseline do `CLAUDE.md` › Baselines; nenhum erro novo.
- ESLint nos três arquivos alterados: sem saída (limpo).
- Verificação mínima (`CLAUDE.md` › Baselines: suíte do workspace tocado e suíte da loja):
  - Backoffice, `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: a primeira rodada deu exit 1, com 1 timeout de 45 s em `AdminOrdersPage.aviso.test.tsx`, arquivo sem relação com a tarefa. Esse arquivo sozinho passou 29/29. A segunda rodada deu 312 arquivos, 5594/5594, exit 0.
  - Loja, `pnpm --filter @estrelinha/store test --testTimeout=20000`: a primeira rodada passou 7873/7873, mas saiu com exit 1 por um "[vitest-worker]: Timeout calling onTaskUpdate" (contenção). A segunda deu 419 arquivos, 7873/7873, exit 0.
- Instruções lidas:
  - `apps/backoffice/CLAUDE.md` (134 KB, lido por seção): topo, › O modo de foco, › Molde dos formulários, › O movimento do painel, › A ponte da prévia, › `/admin/menu`, › Dívidas conhecidas deste app.
  - `packages/core/CLAUDE.md` (53 KB, lido por seção): topo até › Os módulos, › `menu`, › `home`, › Convenções de tipo.
  - `CLAUDE.md`: › Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas (só as linhas de `touchTarget`, `menuDocumentoComDonoUnico`, `previaUnica`, `animacaoRespeitaMovimento` e `folgaDoPalco`; a seção tem 96 KB), › Baselines.
  - `.specs/project/PROJECT.md` › Comandos de verificação e › Ambiente local.
  - `licoes-qa.md` (a lição [prévia] se aplica: a prévia mostra o que a loja mostraria, e é a regra das decisões 3 e 4).

## Divergências e descobertas

- Divergência entre a tarefa e as instruções: o `Molde dos formulários` do `apps/backoffice/CLAUDE.md` diz "Editor é TELA, não modal". O editor do item do menu já era diálogo antes deste WI. Corrigi por diálogo não modal (decisão 1), não por tela. O `CLAUDE.md` › `/admin/menu` não fala do editor não modal nem do rascunho ao vivo, e ninguém atualizou isso.
- Check de mutação da fatia 2: a primeira mutação (tirar `setRascunhoDoEditor(null)` do `fecharEditor`) ficou verde. A volta ao gravado tem duas garantias independentes: limpar o rascunho e ignorá-lo quando `emEdicao` é `null`. Uma mutação que derruba as duas deu vermelho como esperado. O arquivo foi restaurado pela cópia e conferido com `cmp`.
- A fatia 3 (o alternador ao alcance) prova o comportamento pela árvore de acessibilidade do jsdom (`aria-hidden` do modo modal) e pelo `pointerdown`/foco fora sem fechar. A posição real (o editor preso à esquerda sem cobrir o quadro, que vai de 705 a 1375 px em 1440) e o comportamento em 390 px só se provam em navegador, e isso fica para o reteste do QA.
- Para a tarefa 04, sem afirmação falsa: o arquivo dela continua correto (a linha do Salvar com `labelColors = { bar: corBarra || null, … }` não mudou). Mas o rascunho da prévia agora também lê `corBarra`/`corFolha` num `useEffect` do `MenuItemEditor.tsx`, e mudar a forma desse estado mexe também no que a prévia recebe. Nada propagado.
- Os comentários que já existiam no `MenuItemEditor.tsx` e no `AdminMenuPage.tsx` citam identificadores de processo (`T15`, `MNM-…`, `Q07`). Não estendi isso.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: apps/backoffice/CLAUDE.md (por seção: topo, › O modo de foco, › Molde dos formulários, › O movimento do painel, › A ponte da prévia, › /admin/menu, › Dívidas conhecidas); packages/core/CLAUDE.md (por seção: topo..› Os módulos, › menu, › home, › Convenções de tipo); CLAUDE.md › Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas (linhas dos guardas da tarefa), › Baselines; .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local
Testes escritos: apps/backoffice/src/pages/admin/AdminMenuPage.test.tsx, describe "a prévia acompanha o editor do item antes de Salvar":
  (1) ícone do sistema + cor válida chegam ao rascunho, sem gravar;
  (2) cancelar devolve à prévia o documento gravado;
  (3) o alternador Celular/Computador continua na árvore de acessibilidade e clicável com o editor aberto, sem fechá-lo;
  (4) cor recusada não chega ao rascunho;
  e um a mais, da obrigação dos 390 px: "Ver na prévia" / "Voltar ao editor" sem fechar o editor.
  Sem cobertura em jsdom: a posição real do editor no lg e no celular (pede prova em navegador)
Verificações: vitest por arquivo, todos verdes; guardas previaUnica, animacaoRespeitaMovimento, folgaDoPalco, menuDocumentoComDonoUnico e touchTarget verdes; tsc backoffice 7 erros = baseline (todos em ProposalStateBadge.test.tsx); eslint dos arquivos alterados limpo; suíte do backoffice 5594/5594 e da loja 7873/7873, exit 0 na segunda rodada (a primeira de cada caiu por timeout de contenção, sem falha de asserção)
Árvore de trabalho: alterados apps/backoffice/src/features/store-menu/ui/MenuItemEditor.tsx, apps/backoffice/src/pages/admin/AdminMenuPage.tsx, apps/backoffice/src/pages/admin/AdminMenuPage.test.tsx; nada commitado
Citações conferidas: 5 abertas no uso (AdminMenuPage.tsx › <MenuLivePreview, MenuLivePreview.tsx › draft = useMemo, documentOps.ts › updateNode, useMenuPreviewBridge.ts, core/menu/labelColor.ts); nenhuma deslocada, nenhuma morta
```

## T03 — pd-impl-review · fixing · agente a45f2a68535160a36

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104/.specs/work-items/104-icones-do-sistema-no-menu/tasks/03-bug-1-previa-do-editor-do-item.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------------------------- |
| 1 | `raio subdeclarado` | atrapalha | apps/backoffice/src/features/store-menu/ui/MenuItemEditor.tsx:325-330 (`modal={false}` + `onInteractOutside` → `preventDefault`), junto com apps/backoffice/src/pages/admin/AdminMenuPage.tsx:277-282 (`abrirEditor`, que não mudou) | Sem modal, a lista da página continua utilizável com o editor aberto. Pelo Tab, que deixou de ficar preso, ou pelo ponteiro onde o editor não cobre a lista, a dona chega a Ações › Editar de outro item. `abrirEditor` troca `emEdicao` direto e não passa por `aoMudarAbertura`. Com isso, o efeito que reinicia os campos pelo `idDoNo` (MenuItemEditor.tsx:189-209) descarta em silêncio o que estava sendo editado e zera `rascunhoDosBanners`: não pergunta "Descartar as alterações do banner?" e não apaga `artesNaoGravadas`. A arte enviada e não gravada fica órfã em `home-images/menu/`. Pelo mesmo caminho, os toggles, Mover e Remover da lista, que gravam na hora, passam a funcionar com o editor aberto. O raio declarado traz só a perda do foco preso | Raio da premissa 1: "`MenuItemEditor.tsx` e o comportamento de foco: sem modal, não há mais foco preso dentro do diálogo". O próprio arquivo já tratava esse caso (comentário Q05 em MenuItemEditor.tsx:150-153): "Esc, fechar ou "Voltar" com alteração não salva PERGUNTA antes ("Descartar as alterações do banner?"); descartar apaga do Storage a arte enviada e não gravada, para não deixar órfão em `home-images/menu/`." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| com o editor aberto, a prévia mostra o ícone e as cores escolhidos antes de Salvar, em Computador e em Celular | MenuItemEditor.tsx:214-240 (o efeito `onDraftChange` monta `MenuItemEdit` com `icon` e `labelColors` das duas superfícies); AdminMenuPage.tsx:321-326 (`documentoDaPrevia` = `updateNode(document, emEdicao, rascunho)`) e :559 (`document={documentoDaPrevia}`); alternador alcançável porque o diálogo deixou de ser modal (sem overlay e sem `aria-hidden` nos irmãos) | sim |
| fechar sem salvar devolve a prévia ao gravado; nada grava antes do Salvar | AdminMenuPage.tsx:327-330 e :590 (`fecharEditor` limpa o rascunho, também no Remover em :608); `useMemo` cai em `document` quando `emEdicao` ou o rascunho é nulo; o rascunho só vai para `MenuLivePreview` e `useStoreMenu` não foi tocado | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | AdminMenuPage.test.tsx:1108-1213 | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- `previaUnica.test.ts`: aplicada. Não há arquivo `…Preview` novo nem segundo `<iframe>`; a prévia continua sendo `MenuLivePreview`, agora com outro `document`.
- `menuDocumentoComDonoUnico.test.ts`: aplicada. O diff não acrescenta tabela nem leitura crua do menu, e o documento continua vindo de `useStoreMenu`.
- `animacaoRespeitaMovimento` / `touchTarget`: aplicada. `editor-ver-previa` usa `QUEBRA` (`min-h-11`, MenuItemEditor.tsx:110 e :346) e `voltar-ao-editor` tem `min-h-11` (AdminMenuPage.tsx:514). Nenhuma classe de movimento nova.
- 390 px: aplicada. "Ver na prévia" leva à aba Prévia e recolhe o editor com `max-lg:hidden`, sem fechá-lo; "Voltar ao editor" fica na coluna da prévia (AdminMenuPage.tsx:508-520 e :594-596).

## Testes

- Ícone do sistema e cor válida chegam ao rascunho sem gravar: AdminMenuPage.test.tsx:1124-1141. Morde: confere `icon: 'etiqueta'` e as duas cores no nó `n-sobre` do último `postMessage`, e `escritasEm('store_settings')` vazio.
- Cancelar devolve o gravado: AdminMenuPage.test.tsx:1143-1160. Morde: o último rascunho tem de ser `toEqual` ao documento antes da abertura e voltar a ter `icon` nulo.
- Alternador alcançável com o editor aberto: AdminMenuPage.test.tsx:1162-1176. Morde: `getByRole('group', { name: 'Dispositivo da prévia' })` falharia com o modal do Radix, que esconde os irmãos com `aria-hidden`. Além disso confere `aria-pressed` e que o editor continua aberto.
- Cor recusada não chega ao rascunho: AdminMenuPage.test.tsx:1199-1213. Morde: com `#333333` na barra, `labelColors` tem de ser `{ bar: null, sheet: '#8A5A2B' }`. Repassar a cor crua reprovaria o teste.
- Teste a mais, para a premissa 6 (ida e volta abaixo de `lg`): AdminMenuPage.test.tsx:1178-1197. Confere as classes por token exato e que a escolha do ícone se mantém.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O `Dialog` passa a não modal, tocar fora não fecha, e no `lg` fica à esquerda | sim | O editor já era `Dialog` antes do WI; a regra "Editor é TELA, não modal" de `apps/backoffice/CLAUDE.md › Molde dos formulários` lista cupom, promoção, produto, pedido e cliente, e a tarefa não pede para tirar o editor do diálogo. O `DialogOverlay` do Radix não renderiza sem modal | não: ver achado 1 (a lista fica operável e a troca de item pula a pergunta da Q05) |
| 2 | Prop `onDraftChange`; a página aplica o rascunho com `updateNode` só no documento da prévia | sim | Bate com "Siga a forma de" (`documentOps.ts`) e com o Contrato de `MenuLivePreview`; ponte e `core/menu` intactos | sim |
| 3 | Cor fora do formato ou recusada cede à cor gravada; campo vazio vira `null` | sim | Decisão da tarefa: "a prévia mostra o que a loja desenharia". O Salvar nunca grava cor recusada (`salvar`, :293-302). Usa `MENU_LABEL_HEX` e `menuLabelColorSurfaceRefusal` de `core`, sem recriar a regra | sim (a tarefa 04 lista `corBarra`/`corFolha` e diz "Não toque a prévia") |
| 4 | Nome recusado ou vazio cede ao `label` gravado; "Usar o nome da categoria" vira `label: null` | sim | Mesmo critério do Salvar (`menuNodeLabelRefusal`, `label: null` para categoria) | sim |
| 5 | O rascunho só sai depois de `prontoPara === node.id`; fechar limpa | sim | Cobre o fechar e reabrir. A troca direta de item com o editor aberto (achado 1) deixa a página aplicar, por alguns commits, o rascunho do item anterior ao `emEdicao` novo; se isso chega ao iframe depende do debounce, e só a execução mostra | parcial: ver achado 1 |
| 6 | "Ver na prévia" e "Voltar ao editor" abaixo de `lg`, editor recolhido sem fechar | sim | Atende à obrigação dos 390 px; alvos com `min-h-11` | sim |

## Não conferido

- Se, no `lg`, a parte da direita das linhas da lista (Ações) fica fora do editor (576 px a partir de `left-4`) e pode ser tocada com o ponteiro. Depende de layout, que o jsdom não mede. O caminho pelo teclado vale independentemente disso.
- Se o debounce do rascunho em `MenuLivePreview` impede que o rascunho do item anterior chegue ao iframe numa troca direta de item (premissa 5). Só a execução mostra.
- Testes passando, lint e tipos: só execução.
- O diff acrescenta mais um `// eslint-disable-next-line react-hooks/exhaustive-deps` (MenuItemEditor.tsx:238-239), com justificativa e no mesmo molde do efeito anterior do arquivo. Não tratei como achado.
- Os três arquivos de `alterados` aparecem como `M` no `git status`; o diff tem baseline.
Instruções lidas: apps/backoffice/CLAUDE.md › Molde dos formulários, › A ponte da prévia (feature 25, e o segundo canal da 39), › /admin/menu — o menu montado pela dona (feature 86, AD-068); packages/core/CLAUDE.md (índice e › menu — a regra das quatro superfícies, por busca de cor/labelColors); CLAUDE.md › Feature-Sliced Design, › O "defeito 01": dois donos do mesmo dado, › Convenções que valem em todo o repositório, › Os guardas — o que trava o quê (por busca de touch/motion/previaUnica/menuDocumento), › Baselines — o gate de qualquer feature; /Users/rafael.santos/.claude/feature/-Users-rafael.santos-Projetos-uma-estrelinha-store/licoes-qa.md (nenhum padrão repetido aplicável).

## T03 — pd-impl-task · done · agente a82fe5202a951b30b

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104/.specs/work-items/104-icones-do-sistema-no-menu/tasks/03-bug-1-previa-do-editor-do-item.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 (revista) | O editor continua `Dialog` não modal (`modal={false}`), e tocar fora dele continua sem fechá-lo. **Com o editor aberto, a coluna da lista fica `inert`**: sai do Tab, do ponteiro e da árvore de acessibilidade. Ficam ao alcance a prévia, o alternador de dispositivo, a tela cheia e as abas Itens/Prévia. Além disso, `abrirEditor` não faz nada enquanto há item em edição, então o editor aberto nunca é trocado por baixo | Voltar ao modal, que reabriria o bug. Perguntar "Descartar?" ao trocar de item, que é mais código e outro caminho de descarte | O `inert` fecha os caminhos do achado: Editar de outro item, as chaves, Mover e Remover, que gravam na hora. O guarda em `abrirEditor` é uma segunda trava em código: mesmo que algo dispare um Editar, o efeito do `idDoNo` não zera os campos nem o `rascunhoDosBanners`, e a pergunta do Q05 e a limpeza de `artesNaoGravadas` continuam valendo | `MenuItemEditor.tsx`. Em `AdminMenuPage.tsx`: `coluna-entradas` e `abrirEditor`. Com o editor aberto a lista fica inacessível, e para editar outro item é preciso fechar este. Sem foco preso no diálogo, o Tab sai dele para a prévia e o cabeçalho, mas não para a lista. A tarefa 04 mexe no mesmo editor |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 6 | Com o editor aberto, a lista fica fora de alcance (`inert`) e um Editar de outro item não troca o item em edição nem descarta o que foi escolhido. Fechar devolve a lista | Componente (painel) | `AdminMenuPage.test.tsx` › "com o editor aberto, a lista fica fora de alcance e não troca o item em edição" | sim | — (passou pelo vermelho pelo `inert`). Tirar o guarda de `abrirEditor` também deixa o teste vermelho, com restauração por cópia conferida com `cmp` |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104

## Arquivos alterados

apps/backoffice/src/pages/admin/AdminMenuPage.tsx alterado
apps/backoffice/src/pages/admin/AdminMenuPage.test.tsx alterado

## Verificação

- Um arquivo de teste (`PROJECT.md`): `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminMenuPage.test.tsx --testTimeout=20000` deu 86/86, exit 0. React 18 não emitiu aviso para o `inert`.
- Tipos (`CLAUDE.md` › Comandos): `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` deu 7 erros, todos em `ProposalStateBadge.test.tsx` (TS2304 ×3, TS2593 ×4). É igual ao baseline; nenhum erro novo.
- ESLint nos dois arquivos alterados: exit 0.
- Verificação mínima (`CLAUDE.md` › Baselines): `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` deu 312 arquivos, 5595/5595, exit 0. A correção não tocou a loja.
- Instruções lidas: as mesmas da implementação, sem releitura.

## Divergências e descobertas

- O jsdom não implementa o efeito do `inert`. O teste confere o atributo e prova a trava de `abrirEditor` por comportamento. Que o Tab e o ponteiro não chegam à lista em navegador real fica para o reteste do QA.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: apps/backoffice/CLAUDE.md (por seção: topo, › O modo de foco, › Molde dos formulários, › O movimento do painel, › A ponte da prévia, › /admin/menu, › Dívidas conhecidas); packages/core/CLAUDE.md (por seção: topo..› Os módulos, › menu, › home, › Convenções de tipo); CLAUDE.md › Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas (linhas dos guardas da tarefa), › Baselines; .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local
Testes escritos: apps/backoffice/src/pages/admin/AdminMenuPage.test.tsx, describe "a prévia acompanha o editor do item antes de Salvar":
  (1) ícone do sistema + cor válida chegam ao rascunho, sem gravar;
  (2) cancelar devolve à prévia o documento gravado;
  (3) o alternador Celular/Computador continua na árvore de acessibilidade e clicável com o editor aberto, sem fechá-lo;
  (4) cor recusada não chega ao rascunho;
  e mais dois: "Ver na prévia" / "Voltar ao editor" abaixo de lg sem fechar o editor (obrigação dos 390 px), e a lista inert com o editor aberto, sem trocar o item em edição (correção da revisão).
  Sem cobertura em jsdom: a posição real do editor no lg e no celular, e o efeito do inert em navegador (pedem prova em navegador)
Verificações: vitest por arquivo, verdes (AdminMenuPage 86/86); guardas previaUnica, animacaoRespeitaMovimento, folgaDoPalco, menuDocumentoComDonoUnico e touchTarget verdes; tsc backoffice 7 erros = baseline; eslint dos arquivos alterados limpo; suíte do backoffice 5595/5595 exit 0; suíte da loja 7873/7873 exit 0 (na implementação)
Árvore de trabalho: alterados apps/backoffice/src/features/store-menu/ui/MenuItemEditor.tsx, apps/backoffice/src/pages/admin/AdminMenuPage.tsx, apps/backoffice/src/pages/admin/AdminMenuPage.test.tsx; nada commitado
Citações conferidas: 5 abertas no uso (AdminMenuPage.tsx › <MenuLivePreview, MenuLivePreview.tsx › draft = useMemo, documentOps.ts › updateNode, useMenuPreviewBridge.ts, core/menu/labelColor.ts); nenhuma deslocada, nenhuma morta
```

## T04 — pd-impl-task · review · agente a8939d811fed2b0fa

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104/.specs/work-items/104-icones-do-sistema-no-menu/tasks/04-bug-2-campo-de-cor-apagado.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Causa: o `onChange` do React só dispara quando o valor do campo difere do último valor que o próprio React registrou nele. Quem grava `value` direto no campo e depois dispara `input` (o preenchimento da automação da QA, ou um autopreenchimento) passa sem aviso. O campo fica vazio na tela, o estado `corFolha` continua `#E8C77A`, e o re-render seguinte devolve o código. Esses são exatamente os três sintomas do bug: seletor dourado, recusa de 1,6:1 e o código voltando. Correção: o campo de código de `MenuLabelColorField` também escuta `onInput`, com o mesmo tratamento (`trim().toUpperCase()`) | Mexer no estado do `MenuItemEditor`. Lá a lógica de `''` (= `null` ao salvar e no rascunho) já estava certa | Reproduzi em jsdom: gravei `value` direto e disparei `input`. Os 4 testes falharam com os sintomas observados (recusa visível, `#E8C77A` voltando, `onSave` sem chamada). Pelo teclado, a mesma sequência já passava. Só a execução no navegador confirma se a "variação pelo teclado" da QA foi o mesmo caminho | `MenuLabelColorField.tsx` (os dois campos de cor do editor). Na digitação normal, `onChange` e `onInput` disparam juntos com o mesmo valor, sem efeito a mais. O reteste da QA confirma |
| 2 | O teste "sem cor nas duas" verifica que a edição sai com `labelColors: { bar: null, sheet: null }`. A chave `labelColors` não aparecer no documento fica com `updateNode`/`documentOps.ts`, que já a remove quando as duas cores são `null` | Repetir no teste do componente a remoção da chave | O nível declarado é o componente. A remoção da chave já existe e não é desta tarefa | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Digitar uma cor e apagar o código inteiro deixa o campo vazio, sem recusa e com o seletor no padrão da superfície | Componente (painel) | `MenuItemEditor.test.tsx` › apagar o código inteiro… › "pelo teclado" / "por preenchimento vazio": o campo fica vazio… | sim | — (o caminho "por preenchimento vazio" ficou vermelho antes da correção; "pelo teclado" passou de primeira e é a mesma asserção) |
| 2 | Depois de apagar, digitar no OUTRO campo não devolve o código apagado | Componente (painel) | idem › "digitar no OUTRO campo não devolve o código apagado" (×2) | sim | — (vermelho antes da correção: voltava `#E8C77A`) |
| 3 | Salvar com o campo apagado grava `null` ali, e sem cor nas duas o item fica sem cor | Componente (painel) | idem › "Salvar grava a lista sem cor…" e "apagadas as duas, o item fica sem cor nenhuma" (×2) | sim | — (vermelho antes da correção: `onSave` sem chamada; o seletor ficava em `#f7f3ec`) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104

## Arquivos alterados

apps/backoffice/src/features/store-menu/ui/MenuLabelColorField.tsx alterado
apps/backoffice/src/features/store-menu/ui/MenuItemEditor.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/backoffice exec vitest run src/features/store-menu/ui/MenuItemEditor.test.tsx --testTimeout=20000`, de `PROJECT.md` › Comandos de verificação: antes da correção, 4 falharam e 52 passaram (vermelho esperado). Depois: 56/56 passaram, exit 0.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`, de `CLAUDE.md` › Comandos: 7 erros, todos em `apps/backoffice/src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (TS2304 ×3, TS2593 ×4). É exatamente o baseline herdado que `CLAUDE.md` › Baselines declara, sem erro novo. O briefing não trouxe `baseline`, então comparei contra o declarado.
- `npx eslint` nos 2 arquivos alterados: exit 0.
- Verificação mínima, de `CLAUDE.md` › Baselines e `PROJECT.md`:
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: 5603/312 passaram, exit 0.
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: 7873/419 passaram nas duas rodadas, mas saiu com exit 1 nas duas. A causa foi 1 erro não tratado do runner, `[vitest-worker]: Timeout calling "onTaskUpdate"`, já registrado em `docs/baselines-historico.md` como contenção do runner, não falha de teste.
  - Repetida com `--maxWorkers=2`, como o histórico registra: 7873/419 passaram, exit 0.

Instruções lidas: `apps/backoffice/CLAUDE.md` (grande demais para ler inteiro; li a abertura, › Molde dos formulários, › A ponte da prévia (feature 25, e o segundo canal da 39), › /admin/menu — o menu montado pela dona (feature 86, AD-068) e › Dívidas conhecidas deste app), `packages/core/CLAUDE.md` (inteiro), `CLAUDE.md` › Comandos, › Feature-Sliced Design, › O "defeito 01": dois donos do mesmo dado, › Convenções que valem em todo o repositório, › Os guardas — o que trava o quê (só as linhas de `fieldBorder`, `touchTarget` e `adminTokens`) e › Baselines — o gate de qualquer feature, `.specs/project/PROJECT.md` › Comandos de verificação e › Ambiente local. Li também as lições de QA (`licoes-qa.md`); nenhum padrão de lá se aplica diretamente a esta tarefa.

## Divergências e descobertas

- A causa do bug está no campo (`MenuLabelColorField`), não no `MenuItemEditor`: o contrato marcava o editor como "VOCÊ ALTERA, se a causa estiver aí", e não está. O `MenuItemEditor` não foi tocado.
- A QA viu a mesma falha "pelo teclado" e "por preenchimento". Em jsdom, só o caminho que grava `value` direto reproduz o defeito; o caminho por evento de troca já funcionava. Se a variação "pelo teclado" da sessão CH-02 foi outro caminho, só o reteste no navegador mostra. A correção cobre o caminho que reproduz os três sintomas observados.
- A suíte da loja saiu duas vezes com o erro `Timeout calling "onTaskUpdate"` do worker (contenção, já registrada no histórico de baselines). Fechou com exit 0 com `--maxWorkers=2`.
- A dependência da tarefa 03 conferiu: o commit `f3571f6b` está na árvore, e o `MenuItemEditor.tsx` estava no estado em que ela o deixou.
- Nada a propagar: esta é a última tarefa da fila. As citações conferiram, sem linha deslocada nem citação morta.
- A obrigação dos guardas (`fieldBorder`/`touchTarget`/`adminTokens`) está cumprida: classes e alvos sem mudança, e a suíte do painel com os guardas passou.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: apps/backoffice/CLAUDE.md (abertura, › Molde dos formulários, › A ponte da prévia, › /admin/menu, › Dívidas conhecidas deste app), packages/core/CLAUDE.md, CLAUDE.md (› Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines), .specs/project/PROJECT.md (› Comandos de verificação, › Ambiente local)
Testes escritos: apps/backoffice/src/features/store-menu/ui/MenuItemEditor.test.tsx › describe 'apagar o código inteiro é "sem cor" naquela superfície', cada caso pelo teclado e por preenchimento vazio:
  - campo vazio, sem recusa, seletor no padrão da superfície (#000000 na lista)
  - digitar no OUTRO campo não devolve o código apagado
  - Salvar grava a lista com null
  - apagadas as duas, labelColors { bar: null, sheet: null }
  Nada ficou sem cobertura.
Verificações: arquivo de teste 56/56; tsc do backoffice 7 erros = baseline (ProposalStateBadge.test.tsx); eslint dos 2 arquivos limpo; suíte backoffice 5603/312 exit 0; suíte store 7873/419 (exit 1 por "Timeout calling onTaskUpdate" do worker em 2 rodadas; exit 0 com --maxWorkers=2)
Árvore de trabalho: alterados apps/backoffice/src/features/store-menu/ui/MenuLabelColorField.tsx (o campo de código também escuta onInput) e apps/backoffice/src/features/store-menu/ui/MenuItemEditor.test.tsx (8 testes); nada commitado
Citações conferidas: 4 (MenuLabelColorField.tsx, MenuItemEditor.tsx, labelColor/MENU_LABEL_HEX via @estrelinha/core/menu, a dependência 03 no commit f3571f6b); nenhuma deslocada, nenhuma morta
```

## T04 — pd-impl-review · done · agente a277e9eb5293180f7

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-104/.specs/work-items/104-icones-do-sistema-no-menu/tasks/04-bug-2-campo-de-cor-apagado.md
Veredito: serve

## Achados

| #   | Classe | Gravidade          | Arquivo:linha | O defeito | A exigência que ele contraria                  |
| --- | ------ | ------------------ | ------------- | --------- | ---------------------------------------------- |
| nada | | | | | |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| apagar o código deixa a superfície sem cor, sem recusa e sem o código voltar; Salvar grava sem cor ali | `MenuLabelColorField.tsx:36,55-56`: `onInput` passa a chamar o mesmo `onChange(trim().toUpperCase())`. Com o campo vazio, `corFolha` vira `''`, e daí o seletor cai em `placeholderColor` (l.46), a medida some (l.30-31,70) e o Salvar grava `corFolha \|\| null` (`MenuItemEditor.tsx:299`) | sim, no caminho de jsdom. No navegador, só execução (reteste da QA) |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `MenuItemEditor.test.tsx:301-369` | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

- `fieldBorder`/`touchTarget`/`adminTokens`: o `Input` mantém `h-11 … border-input` (l.57), o seletor mantém `h-11 w-11` (l.48) e o botão mantém `min-h-11` + `BOTAO_CONTORNO` (l.65). O diff não muda classe nenhuma, então a obrigação está cumprida.

## Testes

- Digitar uma cor e apagar o código inteiro deixa o campo vazio, sem recusa e com o seletor no padrão: `MenuItemEditor.test.tsx:317-328`. O teste assere o valor `''`, a ausência de `cor-folha-medida`, o seletor em `#000000` e o "padrão" desabilitado. Morde na variante "por preenchimento vazio", que grava `value` pelo setter rastreado pelo React e dispara `input`: sem o `onInput`, o estado continuaria `#E8C77A`. A variante "pelo teclado" (`fireEvent.change`) já passava antes da correção. Ela fica como regressão, e a prova do bug está na variante irmã.
- Depois de apagar, digitar no OUTRO campo não devolve o código: `MenuItemEditor.test.tsx:330-340`. Morde pelo mesmo motivo: com o estado antigo, o re-render devolveria `#E8C77A`.
- Salvar com o campo apagado entrega `null` naquela superfície, e sem cor nas duas não sobra cor no item: `MenuItemEditor.test.tsx:342-367`. O payload é conferido em igualdade exata (`toEqual`), como pede `apps/backoffice/CLAUDE.md › Molde dos formulários` ("Payload de gravação fica em igualdade EXATA no teste"). O caso "nas duas" assere `{ bar: null, sheet: null }` e o seletor da barra em `#ffffff`. O nível é componente, como o bloco declara.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | A causa está no `onChange` do React, que não dispara quando `value` é gravado pelo setter antes do `input`. A correção é `onInput` no campo de código, com o mesmo tratamento | sim | O estado de `MenuItemEditor.tsx:139-140,466-487` e o Salvar (l.295-305) já tratam `''` como `null`, e o efeito de reabertura (l.186-208) só roda com `[open, idDoNo]`, então não devolve a cor sozinho. Nenhum caso análogo no backoffice resolve isso de outro jeito: este é o único `onInput`. Nada nas seções lidas proíbe o padrão. Com `onChange` e `onInput` disparando juntos na digitação normal, o segundo `setState` recebe o mesmo valor e não tem efeito | sim. O diff só toca `MenuLabelColorField.tsx`, e o contrato `value`/`onChange` se mantém |
| 2 | O teste do componente assere `labelColors: { bar: null, sheet: null }`. Remover a chave do documento fica com `updateNode` | sim | `apps/backoffice/src/features/store-menu/model/documentOps.ts:206-211` (`cores.bar \|\| cores.sheet ? { ...semCor, labelColors: cores } : semCor`) e `packages/core/src/menu/structure.ts:194` já removem a chave. O teste vizinho, "Usar a cor padrão" (l.371-383), segue a mesma forma de payload | nenhum (correto) |

## Não conferido

- Não dá para conferir, sem rodar no navegador, que a variação "pelo teclado" da QA (2 de 2) passou pelo mesmo caminho do setter. O próprio implementador deixa isso em aberto. Se o teclado real falhou por outra causa, só o reteste da QA vai mostrar.
- O resultado dos testes e da verificação de fechamento depende de execução.
- Lições de QA (`/Users/rafael.santos/.claude/feature/-Users-rafael.santos-Projetos-uma-estrelinha-store/licoes-qa.md`): nenhum dos padrões listados se aplica diretamente a esta correção. Os de "estado de falha" e "dado falso na tela" foram conferidos: o campo vazio deixou de mostrar a recusa e o seletor da cor antiga.
- Instruções lidas: `apps/backoffice/CLAUDE.md` (134 KB, lido por seção) › Molde dos formulários, › `/admin/menu` — o menu montado pela dona (feature 86, AD-068); `CLAUDE.md` › Convenções que valem em todo o repositório, › Os guardas — o que trava o quê (o início e a tabela até `menuSemItemFixo`), › Baselines — o gate de qualquer feature. Ficaram sem ler: `apps/backoffice/CLAUDE.md` › A ponte da prévia, `CLAUDE.md` › Feature-Sliced Design, › O "defeito 01", e `packages/core/CLAUDE.md`. O diff não toca a prévia, nem a estrutura FSD, nem `core`, e nenhum achado depende dessas seções.
