# Log da implementação por ondas — 102

## T01 — wi-impl-task · review · agente a07ba3532f4ae2f5f

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/01-campanhas-no-painel.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Li só as seções que a tarefa cita: `spec.md` › Design (Selo, Painel · Campanhas · lista, nova/editar), › Código e › Decisões, e as duas linhas RN-06/CA-06 do `prd.md`. A regra 5 proíbe abrir a costura. | Inventar as frases literais e a regra RN-06, que a tarefa manda copiar mas não transcreve. | A tarefa exige frases literais e "o menor de RN-06". Nenhuma das duas está nela nem no repositório. | Processo. As frases das telas e `price.ts` vêm daí. |
| 2 | A campanha e os percentuais dela gravam pela RPC `save_campaign`: `security invoker`, `search_path ''`, `has_role` antes de gravar, tira percentuais antes de acrescentar, numa transação. `save_campaign` entrou na lista `RPCS` de `marcacaoSoPorAcao.test.ts`. | Uma sequência de `from()` pelo PostgREST, que não é atômica. | Molde de `upsert_promotion`. Tirar um percentual em uso (23503) ou cruzar outra campanha (23P01) desfaz a gravação inteira. | Migration, `marcacaoSoPorAcao`, o guarda de schema. As tarefas 02 e 03 não usam a RPC. |
| 3 | `campaign_percents.percent` e `product_campaigns.percent` são `integer`. | `smallint`. | Os números chegam do PostgREST e de `p_percents integer[]` sem conversão. | A tarefa 05 (`order_items.campaign_percent`) deve usar `integer` para casar. |
| 4 | `product_campaigns.campaign_id` tem FK própria `on delete cascade`, além da composta `(campaign_id, percent)` com `restrict`. | Só a FK composta. | Sem a FK própria, apagar a campanha esbarraria no `restrict`. Medi numa transação que o cascade da campanha passa e o `restrict` do percentual continua recusando. | Só a migration. |
| 5 | No banco, `badge_text` é obrigatório (1–14 após `btrim`) e o nome tem 1–40. | Selo opcional. | O selo acompanha o nome na tela e sai sempre no cartão. | Tarefa 04 (o selo sempre tem texto). |
| 6 | Data e hora com `DateField` mais `<Input type="time">`, como em `AdminRecordPaymentPage`, convertidas por `core/time/local.ts`. | Criar um campo novo de data e hora em `shared/ui`. | O repositório já tem esse par para Brasília. | Nenhum. |
| 7 | Campanha nova: hoje (Brasília) 00:00 a hoje 23:59, ligada, preto e ouro, sem percentual. | Fim em branco. | O design diz "nasce 00:00 e 23:59" e não diz o dia. | Só a tela. |
| 8 | Contraste com uma casa e vírgula. Quando o par é recusado e o arredondamento daria 4,5, a casa é cortada (4,47 sai "4,4:1"). | Arredondar sempre. | Para a tela não recusar dizendo "4,5:1", que é o próprio mínimo. | `core/campaigns/text.ts`. |
| 9 | "Encerrar agora" grava `ends_at` com o relógio do painel. | Uma RPC com `now()`. | Menor superfície. A regra de que o relógio do navegador não decide (RN-03) fala da cliente. | Diferença de segundos no fim. |
| 10 | Frases que o design não dá: "Dê um nome à campanha.", "Acrescente ao menos um percentual.", "Preencha a data e a hora do início e do fim.", a recusa de apagar com pedido e o singular "1 peça usa {p}%…". | Deixar sem motivo. | As recusas precisam de motivo. | `core/campaigns/refusals.ts`, e as tarefas que mostram essas frases. |
| 11 | Cabeçalho com `RecordPageHeader` (selo de estado, "Ver as peças", "Encerrar agora") e barra de salvar no pé. | `FormPageHeader`. | Ele não desliga o Salvar, e o design pede o Salvar desligado em cinco casos e a barra no pé. | Só a tela. |
| 12 | O preço de campanha é `campaignUnitPrice(price, comparePrice, percent)` e devolve `{ charged, full, discounted }` em reais, calculado em centavos com meio para cima. Cheio = `comparePrice` quando maior que o preço; cobrado = o menor dos dois. | Devolver centavos. | Os preços do repositório circulam em reais. | Tarefas 04, 05, 08 e 09 consomem. |
| 13 | A pílula de estado (`CampaignStatusPill`) e o selo em linha moram em `entities/campaign/ui`. | Pôr na página. | A tarefa 02 usa os dois. | Tarefa 02. |
| 14 | A lista ordena por `starts_at` decrescente. "Abertas para marcar" ordena por início crescente. | — | A mais recente no topo da lista; a ordem crescente é a que o contrato pede para a tarefa 02. | Tarefa 02. |
| 15 | Apagar fica num cartão "Apagar a campanha" na edição: desligado com o motivo quando há pedido, `AlertDialog` quando não há. | Botão no cabeçalho. | O design não mostra apagar (H-10). | Só a tela. |
| 16 | View `campaign_percent_usage(campaign_id, percent, products)`. Os percentuais da lista vêm dela. Migration `20261130120000_102-campanhas.sql`. | — | O prefixo é o primeiro livre a partir de 20261130120000. | Tarefas 03 e 05 (nomes e prefixo). |
| 17 | Rodei `pnpm install --frozen-lockfile --offline` no worktree. | Ligar o `node_modules` do repositório principal. | O worktree não tinha `node_modules`. O comando é finito e não mexe em arquivo versionado. | Nenhum. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Vigência: início inclusivo, fim exclusivo, desligada nunca vale; os quatro estados | unidade core | packages/core/src/campaigns/__tests__/live.test.ts | sim | vermelho |
| 2 | Preço: 167,92 · 169,92 · CA-06 233,91 · por unidade · meio centavo para cima | unidade core | packages/core/src/campaigns/__tests__/price.test.ts | sim | vermelho |
| 3 | Cada recusa do cadastro com o motivo | unidade core | packages/core/src/campaigns/__tests__/refusals.test.ts | sim | vermelho |
| 4 | Conversão do fim (23:59 ↔ 00:00 do dia seguinte) e texto da vitrine com 1, 2 e 3 percentuais | unidade core | packages/core/src/campaigns/__tests__/text.test.ts | sim | vermelho |
| 5 | `denoReach` de `core/campaigns` | guarda | packages/core/src/campaigns/__tests__/denoReach.test.ts | sim | vermelho |
| 6 | Guarda de schema da migration | guarda | apps/store/src/shared/lib/__tests__/campanhasSchema.test.ts | sim | vermelho |
| 7 | Paridade da vigência: policy × `live.ts` | guarda | apps/store/src/shared/lib/__tests__/campanhaVigenciaParidade.test.ts | sim | vermelho |
| 8 | Probe SQL: exclusão, FK composta, 23503, teto de 5, restrict, o que o anon vê | integração local | .specs/work-items/102-desconto-de-campanha/probes/01-campanhas.sql | sim (23 `ok —`) | não se aplica |
| 9 | Lista com as quatro pílulas, cartões no celular, vazio, carregando e erro | página real (jsdom) | apps/backoffice/src/pages/admin/__tests__/AdminCampaignsPage.test.tsx | sim | vermelho |
| 10 | Nova e editar: CA-01, CA-02, CA-08, CA-14, prévia, encerrar e apagar | página real (jsdom) | apps/backoffice/src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx | sim | 9 mutantes ficaram vermelhos e 2 ficaram verdes (ver Divergências); os 2 foram fechados |
| 11 | Porta única das marcações | unidade (dublê) | apps/backoffice/src/entities/campaign/__tests__/setProductsCampaign.test.ts | sim | vermelho |
| 12 | Probe da gravação do painel: criar, editar, encerrar, apagar, marcar e tirar | integração local | .specs/work-items/102-desconto-de-campanha/probes/02-gravacao-do-painel.sh | sim (20 `ok —`) | não se aplica |
| 13 | Item na sidebar e rotas sob `RequireAdmin` | guarda | navItems.test.ts, focusRoutes.test.ts, rotasSobGuarda.test.ts, animacaoRespeitaMovimento.test.ts | sim | vermelho (navItems, focusRoutes) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

supabase/migrations/20261130120000_102-campanhas.sql criado
packages/core/package.json alterado
packages/core/src/campaigns/limits.ts criado
packages/core/src/campaigns/types.ts criado
packages/core/src/campaigns/live.ts criado
packages/core/src/campaigns/status.ts criado
packages/core/src/campaigns/price.ts criado
packages/core/src/campaigns/end.ts criado
packages/core/src/campaigns/text.ts criado
packages/core/src/campaigns/refusals.ts criado
packages/core/src/campaigns/index.ts criado
packages/core/src/campaigns/__tests__/live.test.ts criado
packages/core/src/campaigns/__tests__/price.test.ts criado
packages/core/src/campaigns/__tests__/refusals.test.ts criado
packages/core/src/campaigns/__tests__/text.test.ts criado
packages/core/src/campaigns/__tests__/denoReach.test.ts criado
packages/supabase/src/types/campaign.ts criado
packages/supabase/src/types/index.ts alterado
apps/store/src/shared/lib/__tests__/campanhasSchema.test.ts criado
apps/store/src/shared/lib/__tests__/campanhaVigenciaParidade.test.ts criado
apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts alterado
apps/backoffice/src/entities/campaign/index.ts criado
apps/backoffice/src/entities/campaign/model/campaign.ts criado
apps/backoffice/src/entities/campaign/api/campaignRead.ts criado
apps/backoffice/src/entities/campaign/api/campaignWrite.ts criado
apps/backoffice/src/entities/campaign/ui/CampaignBadgeInline.tsx criado
apps/backoffice/src/entities/campaign/ui/CampaignCardPreview.tsx criado
apps/backoffice/src/entities/campaign/ui/CampaignStatusPill.tsx criado
apps/backoffice/src/entities/campaign/ui/badgeColors.ts criado
apps/backoffice/src/entities/campaign/__tests__/setProductsCampaign.test.ts criado
apps/backoffice/src/features/campaign-form/index.ts criado
apps/backoffice/src/features/campaign-form/model/draft.ts criado
apps/backoffice/src/features/campaign-form/ui/PercentsCard.tsx criado
apps/backoffice/src/features/campaign-form/ui/ColorsCard.tsx criado
apps/backoffice/src/pages/admin/AdminCampaignsPage.tsx criado
apps/backoffice/src/pages/admin/AdminCampaignFormPage.tsx criado
apps/backoffice/src/pages/admin/__tests__/AdminCampaignsPage.test.tsx criado
apps/backoffice/src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx criado
apps/backoffice/src/pages/admin/__tests__/campanhasFixture.ts criado
apps/backoffice/src/app/App.tsx alterado
apps/backoffice/src/app/__tests__/rotasSobGuarda.test.ts alterado
apps/backoffice/src/widgets/admin-layout/model/navItems.ts alterado
apps/backoffice/src/widgets/admin-layout/model/navItems.test.ts alterado
apps/backoffice/src/widgets/admin-layout/model/focusRoutes.test.ts alterado
apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts alterado
.specs/work-items/102-desconto-de-campanha/probes/01-campanhas.sql criado
.specs/work-items/102-desconto-de-campanha/probes/02-gravacao-do-painel.sh criado

## Verificação

- **Tipos** (fonte: `CLAUDE.md` › Comandos): `npx tsc --noEmit -p` em cada projeto.
  - `apps/backoffice/tsconfig.app.json`: 7 erros, todos em `ProposalStateBadge.test.tsx` (TS2304 ×3, TS2593 ×4).
  - `apps/store/tsconfig.app.json`: 0.
  - `packages/core/tsconfig.json`: 11, os mesmos arquivos e códigos da baseline.
  - `apps/mobile-adm/tsconfig.app.json`: 0.
  - Contra a baseline: nada novo. O orquestrador não mandou `baseline`; comparei com os números de `CLAUDE.md` › Baselines (backoffice 7 em `ProposalStateBadge.test.tsx`, core 11 herdados), e bateram por arquivo, código e quantidade.
- **Um arquivo de teste** (fonte: `PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`.
  - core `src/campaigns`: 5 arquivos, 56 casos verdes.
  - Guardas novos da loja: 32 verdes.
  - `AdminCampaignsPage`: 9. `AdminCampaignFormPage`: 19. `setProductsCampaign`: 4.
  - navItems, focusRoutes, rotasSobGuarda e animacaoRespeitaMovimento: 62 verdes.
- **Verificação mínima** (fonte: `CLAUDE.md` › Baselines: a suíte do workspace tocado e a da loja; exit capturado fora de pipe; um workspace por vez).
  - core: exit 0, **5774/243**.
  - backoffice: **5300/300**, 1 reprovação por timeout. `AdminOrdersPage.aviso.test.tsx`, o lote de 60, estourou o teto próprio de 45 s (88 s sob carga). Rodado sozinho: 29/29, exit 0.
  - store: 7221/384, todos os testes verdes, mas exit 1 nas duas rodadas por `[vitest-worker]: Timeout calling "onTaskUpdate"`. A máquina estava com load average 93.
  - lint (`npx eslint`) nos arquivos tocados do backoffice: 0 erros e 0 avisos. Corrigi um aviso de `react-refresh` antes.
- **Ambiente local** (fonte: `PROJECT.md` › Ambiente local):
  - `supabase status`: de pé.
  - `supabase migration up --local`: a migration foi aplicada.
  - Probe SQL `01-campanhas.sql`: exit 0, 23 `ok —`.
  - Probe HTTP `02-gravacao-do-painel.sh`: exit 0, 20 `ok —`. Ele limpa o que cria; conferi depois 0 campanhas e 0 `order_items.campaign_id` no banco.
- **Instruções lidas**:
  - `CLAUDE.md`: O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy, Feature-Sliced Design / Alias de import.
  - `packages/core/CLAUDE.md`: Quando um código pertence a este pacote, Pureza, Os módulos, Dinheiro, Convenções de tipo.
  - `supabase/CLAUDE.md`: Migrations, RLS — o molde que os guardas cobram.
  - `apps/backoffice/CLAUDE.md`: A sidebar, Molde dos formulários, Descontos.
  - `.specs/project/PROJECT.md`: Comandos de verificação, Ambiente local.

## Divergências e descobertas

- **A costura foi lida.** A tarefa manda copiar frases literais de `spec.md` › Design e cita RN-06 sem o texto. Li só as seções citadas e as duas linhas RN-06/CA-06 do `prd.md` (decisão 1).
- **Dois mutantes da tela ficaram verdes**, e os dois foram fechados.
  - O `sort` em `draftToInput` era redundante: `PercentsCard` já ordena os percentuais. Tirei o código.
  - "O selo vazio volta a acompanhar o nome" não tinha caso. Acrescentei o teste, e o mutante passou a ficar vermelho.
- **Os dois probes passaram de primeira sem check de mutação** (`01-campanhas.sql` e `02-gravacao-do-painel.sh`), porque rodam contra o banco local. Vale a revisão olhar as asserções deles.
- **A migration mudou depois de aplicada no local**, só em comentários: tirei identificadores de processo e consertei uma linha de comentário quebrada. Os comandos são idênticos aos aplicados. Ela não foi a nenhum ambiente remoto.
- **Reprovações por contenção, não por defeito.** No backoffice, o lote de 60 de `AdminOrdersPage.aviso` estourou o próprio teto de 45 s e passa sozinho. Na loja, o worker do vitest estourou o RPC (`onTaskUpdate`) com load average 93; os 7221 testes passaram nas duas rodadas.
- **Sem `baseline` na entrada.** Usei os números documentados em `CLAUDE.md` e eles bateram.
- **Sem `node_modules` no worktree.** Rodei `pnpm install --frozen-lockfile --offline` (decisão 17).
- **Nada a propagar.** Nenhuma afirmação das tarefas 02 a 09 ficou falsa: os nomes (`entities/campaign`, a porta `(productIds[], campaignId, percent|null)`, o selo em linha, `core/campaigns`) e o prefixo da tarefa 05 (a partir de 20261130130000) continuam valendo.
- **Fora do escopo.** O código do repositório já tem muitos comentários com identificador de processo ("Feature 86, T19"). Não toquei em nenhum; os arquivos que criei saíram sem eles.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 01
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01" · Convenções · Os guardas · Baselines · CI e deploy · FSD/Alias; packages/core/CLAUDE.md › Quando pertence · Pureza · Os módulos · Dinheiro · Convenções de tipo; supabase/CLAUDE.md › Migrations · RLS — o molde; apps/backoffice/CLAUDE.md › A sidebar · Molde dos formulários · Descontos; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos:
  - vigência e os quatro estados — packages/core/src/campaigns/__tests__/live.test.ts
  - preço (167,92; 169,92; CA-06 233,91; por unidade) — packages/core/src/campaigns/__tests__/price.test.ts
  - cada recusa do cadastro (fim antes do início por data e hora, 0, 80, repetido, nenhum, mais de 5, selo > 14, nome vazio ou > 40, contraste "3,2:1", hex inválido, vigência cruzada, apagar com pedido) — packages/core/src/campaigns/__tests__/refusals.test.ts
  - conversão do fim (H-04) e texto da vitrine com 1, 2 e 3 percentuais — packages/core/src/campaigns/__tests__/text.test.ts
  - denoReach — packages/core/src/campaigns/__tests__/denoReach.test.ts
  - guarda de schema — apps/store/src/shared/lib/__tests__/campanhasSchema.test.ts
  - paridade SQL × TS da vigência — apps/store/src/shared/lib/__tests__/campanhaVigenciaParidade.test.ts
  - probe SQL — .specs/work-items/102-desconto-de-campanha/probes/01-campanhas.sql
  - lista do painel pela página real — apps/backoffice/src/pages/admin/__tests__/AdminCampaignsPage.test.tsx
  - nova e editar pela página real (CA-01, CA-02, CA-08, CA-14, prévia, encerrar só em vigência, apagar desligado com pedido) — apps/backoffice/src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx
  - porta das marcações — apps/backoffice/src/entities/campaign/__tests__/setProductsCampaign.test.ts
  - probe da gravação do painel (AD-012) — .specs/work-items/102-desconto-de-campanha/probes/02-gravacao-do-painel.sh
  Sem cobertura automatizada: CA-15 (a tela de campanhas em 390 sem rolagem lateral, a fonte a 200 %). O jsdom não mede layout, e a medida é da Validation/QA em navegador.
Verificações:
  - tsc: store 0 · backoffice 7 · core 11 · mobile-adm 0 — iguais à baseline de CLAUDE.md, nenhum erro novo
  - suítes: core 5774/243 exit 0; backoffice 5300/300, com 1 timeout por contenção (o arquivo passa sozinho, 29/29); store 7221/384 verdes, com exit 1 por timeout do worker do vitest (load average 93)
  - eslint dos arquivos tocados do backoffice: 0/0
  - migration aplicada no local (`supabase migration up --local`)
  - probe SQL: 23 ok; probe HTTP: 20 ok
Árvore de trabalho: migration 20261130120000_102-campanhas.sql; packages/core/src/campaigns/ (9 arquivos e 5 testes) e o subpath `./campaigns` no package.json; packages/supabase/src/types/campaign.ts e o barrel (mais `DbOrderItem.campaign_id`); apps/backoffice: entities/campaign, features/campaign-form, AdminCampaignsPage, AdminCampaignFormPage e testes, rotas no App.tsx, item "Campanhas" em navItems; guardas atualizados (navItems, focusRoutes, rotasSobGuarda, animacaoRespeitaMovimento, marcacaoSoPorAcao); dois guardas novos na loja; dois probes. Nada commitado.
Citações conferidas: 12 abertas. Todas estavam no lugar (o exemplar de policy em promotions-progressive.sql:182-219, validate_promotion_tier:160, navItems.ts:76-79, contrast.ts:59, zone.ts:10, compreJuntoSchema, materialTransitions, coupons/denoReach, AdminPromotionFormPage, AdminPromotionsPage, couponStatus, os probes do WI-01). Nenhuma deslocou, nenhuma estava morta.
```

## T01 — wi-impl-review · fixing · agente a5a7a49c80410d7cf

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/01-campanhas-no-painel.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | `critério descoberto` | atrapalha | `apps/backoffice/src/pages/admin/AdminCampaignFormPage.tsx:303` (e o teste `apps/backoffice/src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx:174-182`) | A página passa `listRefusal={null}` ao `PercentsCard`. `checkDraft` calcula o motivo `check.percents` ("Acrescente ao menos um percentual.") e a página o descarta, então a recusa por "nenhum percentual" nunca aparece. Sem percentual, a tela mostra só o vazio neutro "Nenhum percentual ainda." e a barra diz "Corrija o que está marcado para salvar." sem nada marcado. O teste do caso confere só o Salvar desligado e o texto do vazio, não um motivo. O caminho `listRefusal` do `PercentsCard` (linhas 127-129) é inalcançável. Correção: passar `listRefusal={check.percents}` e cobrar a frase no teste. | CA-02: "Recusas do cadastro: fim antes do início, percentual 0 ou 80, percentual repetido, **nenhum percentual**, vigência cruzando outra campanha ligada, texto do selo acima de 14 caracteres — **cada uma com o motivo**, nada gravado." · UC-01: "Recusas com o motivo, antes de gravar: fim antes do início; nenhum percentual; …" |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| CA-01, CA-02, CA-08 e a recusa de contraste de CA-14 provados pela página real e pelo probe | CA-01: "Em vigência" na lista (`AdminCampaignsPage.test.tsx:63-82`) e criação pela RPC (`AdminCampaignFormPage.test.tsx:99-119`, probe 02 §1). CA-02: todas as recusas visíveis e cobertas na página e no probe 01 §1-3, exceto o motivo de "nenhum percentual" (achado 1). CA-08: na página (`:265-288`) e nos probes (01 §5, 02 §4). CA-14 contraste: na página (`:218-236`) e em `refusals.test.ts:97-108` | parcial (achado 1); o resto, só execução |
| a migration aplicada no banco local e o probe SQL passando | `supabase/migrations/20261130120000_102-campanhas.sql`, `probes/01-campanhas.sql` (23 `ok —`, segundo o implementador) | só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim, com a lacuna do achado 1 na página |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório | — | só execução |

## Obrigações

- **`navItems.test.ts`**: lista de Descontos reescrita com três itens, mais uma vizinha nova: Campanhas depois de Promoções, as subrotas fora da sidebar, e a ordem das três rotas do `App.tsx`. Nada afrouxado.
- **`focusRoutes.test.ts`**: as três rotas de campanha entram como fora do modo de foco.
- **`rotasSobGuarda.test.ts`**: caso novo exige as três rotas dentro do `RequireAdmin`.
- **`animacaoRespeitaMovimento.test.ts`**: os 8 arquivos de UI novos entraram no escopo literal. A âncora de arquivos é derivada (`FONTES.length === ARQUIVOS.length`). Nenhum arquivo novo declara `transition-*` ou `animate-*` (conferido por grep).
- **`marcacaoSoPorAcao.test.ts`**: `save_campaign` entrou em `RPCS`.
- **`fusoComDonoUnico`**: `core/campaigns/text.ts` usa `STORE_TIME_ZONE`, e `end.ts` usa `time/local.ts`. Nenhum literal de fuso.
- **Alvos de 44 px**: inputs, "Tirar {p}%", seletor de cor, presets, links da lista e botões do diálogo usam `h-11`/`min-h-11`. O interruptor usa `SWITCH_TAP_44`.
- **Sem `transition-*` sem par**: não há nenhuma classe de movimento nova.
- **`strictNullChecks: false`**: todas as recusas de `core/campaigns/refusals.ts` devolvem `string | null`.

## Testes

- **Unidade `core`, vigência e estados**: `packages/core/src/campaigns/__tests__/live.test.ts`. Início inclusivo e fim exclusivo, 1 ms de cada lado, desligada nunca vale, os quatro estados, Encerrada vencendo o interruptor. Morde.
- **Unidade `core`, preço**: `price.test.ts`. R$ 167,92 e R$ 169,92, CA-06 (233,91, nunca 215,91), arredondamento do meio, por unidade antes da quantidade. Morde. O caso da quantidade é aritmética do próprio teste e morde pouco, mas o preço por unidade está provado ao lado.
- **Unidade `core`, recusas**: `refusals.test.ts`. Fim antes do início por hora no mesmo dia, 0, 80, repetido, nenhum, sexto percentual, selo acima de 14, nome vazio e acima de 40, contraste "3,2:1" com a frase literal, o corte para "4,4:1", hex inválido, cruzamento com `[)`, apagar com pedido. Morde.
- **Unidade `core`, conversão do fim e texto da vitrine**: `text.test.ts`. 23:59 ↔ 00:00 do dia seguinte, ida e volta, vitrine com 1, 2 e 3 percentuais. Morde.
- **Guarda `denoReach`**: `denoReach.test.ts`. Âncora com as 9 folhas e os vizinhos `time` e `color`, sensores de `import type` sem extensão e de pacote, e o inverso de comentário com CRLF e LF. Morde.
- **Guarda de schema**: `apps/store/src/shared/lib/__tests__/campanhasSchema.test.ts`. Uma régua por comando, com `mutar()` que lança. Cobre tetos importados de `core`, exclusão com `[)` e `where (active)`, FK composta `restrict`, `cascade` de peça e campanha, `restrict` de `order_items.campaign_id`, RLS, escrita por `has_role` no `using` e no `with check` (sensor por tabela), leitura pública, `grant` ao anon, view `security_invoker`, `check` de hex e ausência de escrita de dado. Morde. O sensor de `'[)'`→`'[]'` (linha 235) é um `.not.toBe` fraco, mas a régua positiva ao lado é exata.
- **Guarda de paridade**: `campanhaVigenciaParidade.test.ts`. Interpreta o predicado da policy e compara com `isCampaignLive` em 18 bordas, com sensores de fim inclusivo, início exclusivo, sem `active`, a forma equivalente, e termo desconhecido que lança. Morde.
- **Probe SQL**: `probes/01-campanhas.sql`. Cobre exclusão (inclusive religar a desligada), encerrada × agendada convivendo, percentual fora da campanha (23503), tirar em uso (23503), teto de 5 (também num só comando), `anon` vendo só a em vigência, marcação de peça inativa invisível, `restrict` com pedido. Faz o que o bloco pede. O rótulo "8. Apagar a peça leva a marcação" apaga a marcação, não a peça, mas o `cascade` da peça é coberto pelo guarda de schema.
- **Página real do painel**: `AdminCampaignsPage.test.tsx` e `AdminCampaignFormPage.test.tsx`. Cobrem as quatro pílulas, cada recusa com o Salvar desligado e a RPC não chamada, "{n} peças usam {p}%" pela view com o link, "Encerrar agora" só em vigência e a escrita exata, apagar desligado com pedido, e a prévia trocando texto e cores cruzadas. Morde, exceto o caso "nenhum percentual", que não cobra motivo (achado 1). O caso "carregando" da lista só assere ausências.
- **Probe da gravação do painel**: `probes/02-gravacao-do-painel.sh`. Criar, editar, marcar, tirar, encerrar e apagar pelas chamadas da porta, contra :54441. Faz o que o bloco pede.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Leu só as seções citadas da spec e RN-06/CA-06 do prd | sim | As frases das telas batem com spec.md › Design (linhas 109-156) | sim |
| 2 | RPC `save_campaign` `security invoker` com `has_role` | sim | O molde `upsert_promotion` é `definer`, mas `invoker` + RLS de admin é mais estrito, e nada no supabase/CLAUDE.md o exige para este caso. O guarda de schema e `marcacaoSoPorAcao` foram atualizados | sim |
| 3 | `percent` como `integer` | sim | Nada contradiz. A tarefa 05 não fixa o tipo | sim (tarefa 05 listada) |
| 4 | FK própria `cascade` em `product_campaigns.campaign_id`, além da composta `restrict` | sim | O probe 01 §7 prova que apagar a campanha com marcação passa | sim |
| 5 | `badge_text` obrigatório 1–14, nome 1–40 | sim | Bate com RN-11 e com a prévia "Campanha" só no desenho | sim |
| 6 | `DateField` + `<input type="time">` via `core/time/local.ts` | sim | Mesmo par em `AdminRecordPaymentPage.tsx:21,239-250`. O CLAUDE do painel manda `DateField` | sim |
| 7 | Nova: hoje 00:00 a 23:59, ligada, preto e ouro | sim | spec "nova nasce 00:00 e 23:59" | sim |
| 8 | Contraste cortado abaixo do mínimo (4,47 → "4,4:1") | sim | Nada contradiz | sim |
| 9 | "Encerrar agora" com o relógio do painel | sim | RN-03 fala do navegador da cliente | sim |
| 10 | Frases que o design não dá | sim | "Acrescente ao menos um percentual." existe, mas nunca chega à tela (achado 1) | sim |
| 11 | `RecordPageHeader` com barra de salvar no pé, em vez de `FormPageHeader` | sim | `FormPageHeader` não tem `disabled`, `badges` nem `actions`. O design pede pílula, "Ver as peças", "Encerrar agora" e o Salvar desligado no pé | sim |
| 12 | `campaignUnitPrice` em centavos internamente, devolvendo reais | sim | T7 fala do cálculo em centavos. As tarefas 04/05/08/09 consomem `price.ts` sem forma fixada | sim |
| 13 | Pílula e selo em `entities/campaign/ui` | sim | A tarefa 02 cita "selo em linha do painel em `entities/campaign/ui/` JÁ EXISTE" | sim |
| 14 | Lista por `starts_at` desc; abertas para marcar por início asc | sim | O contrato pede "na ordem do início" para as abertas | sim |
| 15 | Cartão "Apagar a campanha" com `AlertDialog` | sim | H-10 | sim |
| 16 | View `campaign_percent_usage` e prefixo `20261130120000` | sim | É o primeiro livre na árvore (o último anterior é `20261119120000`) | sim |
| 17 | `pnpm install --frozen-lockfile --offline` no worktree | sim | Não toca arquivo versionado | sim |

## Não conferido

- Nada foi executado: a suíte, o `tsc`, o lint e os dois probes. Os resultados declarados (23 e 20 `ok —`) são a palavra do implementador.
- Os probes estão em `??`, sem intent-to-add: julguei os arquivos inteiros. São artefatos novos de `.specs/`, sem baseline a proteger.
- Os demais arquivos de `alterados` aparecem como `A` no índice. Julguei pelo `git diff HEAD`.
- Layout em 390 e 1440, a prévia `sticky` e as duas colunas: só a validação em navegador mostra.
- O contrato pede leitura de "uma campanha". Não há leitor dedicado: a edição acha a campanha na lista (`AdminCampaignFormPage.tsx:73`). Funciona para o que as tarefas 02 e 03 consomem, então não registrei como achado.
- O módulo `./campaigns` não entrou na tabela "Os módulos" de `packages/core/CLAUDE.md`, nem Campanhas na tabela da sidebar do CLAUDE do painel. A raiz manda atualizar documentação ao fechar a feature, não por tarefa.

Instruções lidas: `CLAUDE.md` (raiz, inteiro, recebido no contexto); `packages/core/CLAUDE.md` › Quando um código pertence a este pacote · Pureza · Os módulos · Dinheiro; `supabase/CLAUDE.md` › Migrations · RLS — o molde que os guardas cobram; `apps/backoffice/CLAUDE.md` › A sidebar · Molde dos formulários · Descontos.

## T01 — wi-impl-task · done · agente a07ba3532f4ae2f5f

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/01-campanhas-no-painel.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 10 | Nova campanha sem percentual: a tela mostra o motivo ("Acrescente ao menos um percentual."), deixa o Salvar desligado e não grava nada. O motivo some com um percentual e volta quando se tira o último | página real (jsdom) | apps/backoffice/src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx › "nenhum percentual: o motivo e o Salvar desligado" | sim | — (o caso reescrito ficou vermelho antes do conserto) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

Só o que a correção tocou (a lista completa está no bloco do fim):
apps/backoffice/src/pages/admin/AdminCampaignFormPage.tsx alterado
apps/backoffice/src/features/campaign-form/ui/PercentsCard.tsx alterado
apps/backoffice/src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx alterado

## Verificação

- **Um arquivo de teste** (de `PROJECT.md`): `AdminCampaignFormPage.test.tsx`. Antes do conserto, 1 falha em 19 (o caso reescrito, vermelho como esperado). Depois, 19 verdes, junto com `animacaoRespeitaMovimento.test.ts`: 27/27, exit 0.
- **Tipos** (de `CLAUDE.md`): `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` dá 7 erros, todos em `ProposalStateBadge.test.tsx`. É a baseline; nada novo.
- **Lint**: `npx eslint` nos três arquivos tocados dá 0/0.

## Divergências e descobertas

O motivo "Acrescente ao menos um percentual." ganhou `role="alert"`, como os outros motivos da tela, para o leitor de tela anunciar quando ele aparece. Os casos que procuram um único `alert` continuam verdes: nesses casos já há percentual na campanha, e o motivo não aparece.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 01
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01" · Convenções · Os guardas · Baselines · CI e deploy · FSD/Alias; packages/core/CLAUDE.md › Quando pertence · Pureza · Os módulos · Dinheiro · Convenções de tipo; supabase/CLAUDE.md › Migrations · RLS — o molde; apps/backoffice/CLAUDE.md › A sidebar · Molde dos formulários · Descontos; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos:
  - vigência e os quatro estados — packages/core/src/campaigns/__tests__/live.test.ts
  - preço (167,92; 169,92; CA-06 233,91; por unidade) — packages/core/src/campaigns/__tests__/price.test.ts
  - as recusas do cadastro — packages/core/src/campaigns/__tests__/refusals.test.ts
  - conversão do fim e texto da vitrine — packages/core/src/campaigns/__tests__/text.test.ts
  - denoReach — packages/core/src/campaigns/__tests__/denoReach.test.ts
  - guarda de schema — apps/store/src/shared/lib/__tests__/campanhasSchema.test.ts
  - paridade da vigência entre SQL e TS — apps/store/src/shared/lib/__tests__/campanhaVigenciaParidade.test.ts
  - probe SQL — .specs/work-items/102-desconto-de-campanha/probes/01-campanhas.sql
  - lista do painel — apps/backoffice/src/pages/admin/__tests__/AdminCampaignsPage.test.tsx
  - nova e editar (CA-01, CA-02 com o motivo de "nenhum percentual" desde a correção, CA-08, CA-14, prévia, encerrar e apagar) — apps/backoffice/src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx
  - porta das marcações — apps/backoffice/src/entities/campaign/__tests__/setProductsCampaign.test.ts
  - probe da gravação do painel — .specs/work-items/102-desconto-de-campanha/probes/02-gravacao-do-painel.sh
  Sem cobertura automatizada: CA-15 (layout em 390 e fonte a 200 %), porque o jsdom não mede layout; a medida é da Validation/QA.
Verificações:
  - tsc: store 0 · backoffice 7 · core 11 · mobile-adm 0, iguais à baseline; nada novo depois da correção
  - suítes da implementação:
    - core 5774/243, exit 0
    - backoffice 5300/300, com 1 timeout por contenção que passa sozinho
    - store 7221/384 verdes, mas exit 1 pelo timeout do worker do vitest (load average 93)
  - correção: o arquivo da página, 19/19 verdes depois de ficar vermelho antes do conserto
  - eslint dos arquivos tocados do painel: 0/0
  - migration aplicada no local
  - probe SQL: 23 ok; probe HTTP: 20 ok
Árvore de trabalho (nada commitado):
  - supabase/migrations/20261130120000_102-campanhas.sql
  - packages/core/package.json
  - packages/core/src/campaigns/{limits,types,live,status,price,end,text,refusals,index}.ts e __tests__/{live,price,refusals,text,denoReach}.test.ts
  - packages/supabase/src/types/campaign.ts, packages/supabase/src/types/index.ts
  - apps/store/src/shared/lib/__tests__/{campanhasSchema,campanhaVigenciaParidade,marcacaoSoPorAcao}.test.ts
  - apps/backoffice/src/entities/campaign/{index.ts,model/campaign.ts,api/campaignRead.ts,api/campaignWrite.ts,ui/CampaignBadgeInline.tsx,ui/CampaignCardPreview.tsx,ui/CampaignStatusPill.tsx,ui/badgeColors.ts,__tests__/setProductsCampaign.test.ts}
  - apps/backoffice/src/features/campaign-form/{index.ts,model/draft.ts,ui/PercentsCard.tsx,ui/ColorsCard.tsx}
  - apps/backoffice/src/pages/admin/{AdminCampaignsPage.tsx,AdminCampaignFormPage.tsx} e __tests__/{AdminCampaignsPage.test.tsx,AdminCampaignFormPage.test.tsx,campanhasFixture.ts}
  - apps/backoffice/src/app/App.tsx, apps/backoffice/src/app/__tests__/rotasSobGuarda.test.ts
  - apps/backoffice/src/widgets/admin-layout/model/{navItems.ts,navItems.test.ts,focusRoutes.test.ts}
  - apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts
  - .specs/work-items/102-desconto-de-campanha/probes/{01-campanhas.sql,02-gravacao-do-painel.sh}
Citações conferidas: 12 abertas; nenhuma deslocada, nenhuma morta.
```

## T04 — wi-impl-task · aborted · agente a70af73d936d30604

(sem resposta: error)

## T02 — wi-impl-task · aborted · agente a7903bed1cc0be235

(sem resposta: error)

## T02 — wi-impl-task · review · agente a0d5f0e9c2e7ffdfe

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/02-campo-da-campanha-no-produto.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A marcação lida na carga do formulário pelo embed `product_campaigns(campaign_id, percent)`, acrescentado a `PRODUCT_FORM_SELECT`. Fica no estado do formulário como `campaign_marks: CampaignMark[]`, e no snapshot como `campaignMarks` | uma leitura nova em `entities/campaign` | A tarefa proíbe mexer em `entities/campaign`, e ela não tem leitura da marcação de uma peça. O embed segue o molde do fornecedor e do Compre Junto, e com ele a marcação entra no rascunho, no `isDirty` e no diff do save | `features/product-form/model/useProductForm.ts`. A tarefa 03 não lê esse estado |
| 2 | O Salvar grava só as campanhas cujo percentual mudou desde a carga (`persistCampaignMarks`, em `features/product-form/model/campaignMarks.ts`), uma chamada a `setProductsCampaign([id], campaignId, percent \| null)` por campanha. Roda depois do Compre Junto. Se falhar, mostra o aviso "O produto foi salvo, mas o desconto de campanha não" | gravar todas as campanhas a cada save | Segue o molde de `persistSuppliers` (sem mudança, não escreve). Assim uma marcação de campanha encerrada ou desligada nunca é reescrita | só o save do formulário do produto |
| 3 | Duplicar uma peça (`?from=`) cria a cópia sem marcação de campanha | copiar as marcações do original | A cópia já nasce rascunho, e pôr a peça em desconto é decisão da dona. É também a opção de menor superfície e fácil de desfazer | `productRowToForm` |
| 4 | Os cartões ficam logo abaixo do cartão "Preço padrão" e antes do "Fornecedor", por um slot novo e opcional `campaignCards` no `PricingTab` | pôr os cartões depois do Fornecedor | O design pede "abaixo do cartão Preço". Sem campanha nada é renderizado, e o teste do fornecedor ("logo abaixo de Preço padrão") continua verde | `PricingTab.tsx`. Com campanha aberta, o Fornecedor deixa de ser o vizinho imediato do Preço |
| 5 | A tabela por variação mostra só as variações ativas e com preço. Rótulo: `variantLabel`, ou o nome, ou "Variação N". Coluna Preço = o preço cheio da linha (o `compare_price` quando é maior); "Na campanha" = o valor cobrado (`campaignUnitPrice`). Peça sem variação: só a prévia do cabeçalho, com `form.price`/`form.compare_price` | listar as variações pausadas | É a régua de `priceRange`: a loja não vende variação pausada | só o cartão |
| 6 | Se a leitura das campanhas falhar, aparece uma linha "Não foi possível carregar as campanhas de desconto: …" | não mostrar nada | Sem a linha, uma falha pareceria "sem campanha". Nas páginas de teste antigas cujo dublê não responde a `campaigns`, a frase aparece na aba Preços sem quebrar nenhuma asserção (suíte inteira medida) | só o cartão |
| 7 | O grupo de percentuais usa `role="radiogroup"` e botões `role="radio"` (classes `h-11 min-w-16`, `transition-colors motion-reduce:transition-none`), no molde do seletor de política de estoque | um RadioGroup do Radix | É o padrão que a própria aba já usa | só o cartão |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Sem campanha agendada ou em vigência, nenhum cartão (a encerrada e a desligada ficam de fora) | página real (jsdom) | `AdminProductFormPage.campanha.test.tsx` › "sem campanha agendada ou em vigência…" | sim | vermelho (com `useCampaigns()` no lugar de `useCampaignsOpenForMarking()`, o caso reprova) |
| 2 | Uma campanha em vigência e uma agendada: dois cartões na ordem do início, cada um com vigência, pílula e a sua nota | página real | "uma em vigência e uma agendada…" | sim | — (vermelho no ciclo). Mais um check: com o ramo da nota invertido, reprova |
| 3 | O campo mostra "Nenhum · 10% · 15% · 20%" com o percentual gravado escolhido; sem marcação, "Nenhum" e a nota de sem desconto | página real | "o campo oferece…" e "sem marcação, Nenhum…" | sim | — (vermelho no ciclo) |
| 4 | 20% sobre R$ 209,90 mostra R$ 209,90 riscado → R$ 167,92, com o selo nas cores da campanha (`style`) | página real | "20% numa peça de R$ 209,90…" | sim | vermelho (com `band` trocado por `accent`, reprova) |
| 5 | Tabela por variação, cada uma sobre o próprio preço (CA-05); a coluna Preço some abaixo de `lg` | página real | "com variações de preços diferentes…" e "a variação com 'de' também cobra o menor" | sim | vermelho (com o preço base no lugar do preço da variação, reprova) |
| 6 | "de" R$ 259,90 e preço R$ 239,90 com 10% dá R$ 233,91, nunca R$ 215,91 (CA-06) | página real | "com 'de' R$ 259,90…" | sim | vermelho (sem o `compare_price`, reprova) |
| 7 | Alvo de 44 px, largura de pelo menos 64 px, número em negrito | página real | "cada opção de percentual tem alvo de 44 px…" | sim | vermelho (sem `h-11`, reprova) |
| 8 | Salvar grava a marcação pela porta (upsert `{product_id, campaign_id: 'bf', percent: 20}`), suja o formulário antes e não muda `base_price`/`original_price` | página real | "escolher 20% suja o formulário…" | sim | vermelho (percorrido junto com o 9) |
| 9 | "Nenhum" tira a peça só daquela campanha (delete com `eq campaign_id` + `in product_id`) | página real | "'Nenhum' tira a peça da campanha…" | sim | vermelho (com `percent: depois ?? antes`, reprova) |
| 10 | Voltar ao percentual gravado e salvar não escreve marcação nenhuma | página real | "voltar ao percentual gravado…" | sim | vermelho (sem o filtro de mudança, reprova) |
| 11 | Gravação recusada: avisa que o produto foi salvo e o desconto não | página real | "a gravação recusada avisa…" | sim | vermelho (com o erro engolido, reprova) |
| 12 | Probe da gravação (`AD-012`) contra o banco local | integração no ambiente local | `.specs/work-items/102-desconto-de-campanha/probes/03-campanha-no-produto.sh` | sim (11 `ok —`, 0 falhas) | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

apps/backoffice/src/features/product-form/model/campaignMarks.ts — criado
apps/backoffice/src/features/product-form/ui/CampaignPriceCards.tsx — criado
apps/backoffice/src/pages/admin/AdminProductFormPage.campanha.test.tsx — criado
.specs/work-items/102-desconto-de-campanha/probes/03-campanha-no-produto.sh — criado
apps/backoffice/src/features/product-form/model/useProductForm.ts — alterado
apps/backoffice/src/features/product-form/ui/tabs/PricingTab.tsx — alterado
apps/backoffice/src/pages/admin/AdminProductFormPage.tsx — alterado
apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts — alterado

## Verificação

- **Tipos.** `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (fonte: `CLAUDE.md` §Comandos). Baseline capturada antes da primeira fatia: 7 erros, todos em `features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (TS2304 ×3, TS2593 ×4). No fim: os mesmos 7, mesmos arquivo, código e quantidade. Nenhum erro novo.
- **Um arquivo de teste.** `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminProductFormPage.campanha.test.tsx --testTimeout=20000` (fonte: `PROJECT.md` §Comandos de verificação): 13/13, exit 0.
- **Guarda de movimento.** `vitest run src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts`: 8/8. Âncora medida pela própria régua: 66 tokens / 32 pares (antes 63/31).
- **Arquivos vizinhos.** `vitest run src/features/product-form src/pages/admin/AdminProductFormPage`: 54 arquivos, 1032 testes, exit 0.
- **Verificação mínima, painel.** `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (fonte: `CLAUDE.md` §Baselines): 5311/5313 em 301 arquivos, exit 1. As 2 reprovações estão em arquivos que esta tarefa não tocou: `AdminOrdersPage.aviso.test.tsx` (timeout de 45 s) e `AdminProposalBuilderPage.test.tsx`. Rodados isolados: 47/47, exit 0. É contenção: a tarefa 04 rodava na mesma máquina.
- **Verificação mínima, loja.** Rodei só `src/shared/lib/__tests__` da loja, onde moram os guardas que varrem os dois apps: 2885/2885 em 116 arquivos. Saiu exit 1 por um `Timeout calling "onTaskUpdate"` do worker do vitest (contenção, já registrada no `CLAUDE.md`), sem nenhum teste reprovado. A suíte inteira da loja não rodou, porque a tarefa 04 edita a loja ao mesmo tempo.
- **Lint.** `npx eslint` nos 7 arquivos de código e teste tocados: limpo.
- **Probe.** `bash .specs/work-items/102-desconto-de-campanha/probes/03-campanha-no-produto.sh` contra o Supabase local (:54441, conferido com `supabase status`): 11 `ok —`, 0 falhas. O probe limpa o que criou.

Instruções lidas: `CLAUDE.md` › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; `apps/backoffice/CLAUDE.md` › Molde dos formulários · Descontos (e, para o molde citado, › O fornecedor da peça · O movimento do painel); `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- **Retomada sem trabalho anterior.** A entrada dizia `retomada: sim`, mas a árvore não tinha nada desta tarefa: nenhum diff em `features/product-form` nem no page. Todas as fatias foram feitas nesta execução.
- **Âncora do guarda estava folgada.** A âncora de `animacaoRespeitaMovimento.test.ts` dizia ≥ 63 tokens, mas a régua mediu 64 antes do arquivo novo. Com ele são 66/32, e a âncora agora está cravada no medido.
- **Verificação mínima da loja incompleta.** A suíte inteira da loja não rodou (a tarefa 04 edita `apps/store` em paralelo). Rodaram só os guardas de `src/shared/lib/__tests__`, que são os que varrem o painel.
- **Layout não medido.** Nada de layout foi provado em navegador. A coluna Preço escondida abaixo de 1024 px, as opções de pelo menos 44×64 px e a vigência quebrando linha estão provadas só por classe (o jsdom devolve 0 para layout). Fica para a Validation/QA.
- **Citações conferidas: 6, nenhuma deslocada nem morta.** `PricingTab.tsx` (exemplar), `persistSupplier.ts` (exemplar), `entities/campaign` (index, model, api, ui), `core/campaigns` (`price`, `end`, `status`, `text`), `animacaoRespeitaMovimento.test.ts` e `apps/backoffice/CLAUDE.md`.
- **Propagação: nada.** Nenhuma tarefa seguinte afirma algo que esta tornou falso. A tarefa 03 vai editar o mesmo guarda de movimento e deve medir a partir de 66/32.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 02
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; apps/backoffice/CLAUDE.md › Molde dos formulários · Descontos (e › O fornecedor da peça · O movimento do painel); .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: apps/backoffice/src/pages/admin/AdminProductFormPage.campanha.test.tsx (13 casos, página real):
  - sem campanha, nenhum cartão; uma em vigência e uma agendada dão dois cartões na ordem do início, cada um com a sua nota
  - 20% em R$ 209,90 mostra R$ 167,92, com a tabela por variação e cada preço; "de" R$ 259,90, preço R$ 239,90 e 10% dão R$ 233,91
  - o Salvar grava pela porta (upsert com a campanha e o percentual); "Nenhum" tira a peça (delete); sem mudança, nada é gravado; a falha avisa
  - alvo de 44 px
  Probe: .specs/work-items/102-desconto-de-campanha/probes/03-campanha-no-produto.sh (11 ok, contra o banco local).
  Sem cobertura: layout em navegador real (largura, quebra de linha, coluna escondida abaixo de 1024 px), que o jsdom não mede.
Verificações: tsc do backoffice com 7 erros = baseline (todos em ProposalStateBadge.test.tsx); arquivo da tarefa 13/13; guarda de movimento 8/8 (66/32); product-form + páginas do produto 1032/1032; suíte do backoffice 5311/5313 (as 2 reprovações são timeouts por contenção, em arquivos não tocados, verdes isolados); guardas da loja 2885/2885 (exit 1 só pelo timeout de RPC do worker); eslint limpo nos arquivos tocados; probe 0 falhas
Árvore de trabalho: criados features/product-form/model/campaignMarks.ts, features/product-form/ui/CampaignPriceCards.tsx, pages/admin/AdminProductFormPage.campanha.test.tsx e probes/03-campanha-no-produto.sh; alterados features/product-form/model/useProductForm.ts, features/product-form/ui/tabs/PricingTab.tsx, pages/admin/AdminProductFormPage.tsx e shared/lib/__tests__/animacaoRespeitaMovimento.test.ts (todos em apps/backoffice/src, menos o probe). Nada commitado.
Citações conferidas: 6 abertas ao usar; nenhuma deslocada, nenhuma morta
```

## T02 — wi-impl-review · done · agente a52d2b5139a905a8a

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/02-campo-da-campanha-no-produto.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| UC-03 e CA-01 (o campo com "Nenhum · 10% · 15% · 20%") provados pela página real | `CampaignPriceCards.tsx` (os cartões vêm de `useCampaignsOpenForMarking`, rótulo "Desconto na {nome}", opções `[null, ...percents]`); `AdminProductFormPage.tsx` (slot `campaignCards` do `PricingTab`); `AdminProductFormPage.campanha.test.tsx` monta `AdminProductFormPage` real ("o campo oferece 'Nenhum · 10% · 15% · 20%'", "dois cartões na ordem do início", "sem campanha … nenhum cartão") | sim |
| cada comportamento do bloco `Testes` coberto por um teste escrito | `AdminProductFormPage.campanha.test.tsx` e o probe `probes/03-campanha-no-produto.sh` | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- `animacaoRespeitaMovimento.test.ts` (escopo literal): `CampaignPriceCards.tsx` entrou em `ARQUIVOS`, e as âncoras de tokens e de pares subiram de 63/31 para 66/32. A âncora de arquivos lidos vem de `ARQUIVOS.length`, então acompanha sozinha. Aplicada.
- Alvo de 44 px: os botões de percentual têm `h-11 min-w-16`, e o teste confere as classes. Aplicada.
- Selo da prévia por `style` inline com as cores da campanha: usa `CampaignBadgeInline` da tarefa 01 com `band` e `accent`. O teste confere `backgroundColor` rgb(22,21,20) e rgb(194,160,99). Aplicada.

## Testes

- Página real, sem campanha agendada ou em vigência, nenhum cartão: "sem campanha agendada ou em vigência, nenhum cartão — nem a encerrada nem a desligada". Morde: a fixture traz uma encerrada e uma desligada, e o teste espera a leitura responder antes de afirmar a ausência.
- Uma em vigência e uma agendada, dois cartões na ordem do início, cada um com a sua nota: teste homônimo. Morde: a fixture chega em ordem decrescente e com intrusas, e as duas notas, as vigências e as pílulas são conferidas pelo texto literal, cada uma no seu cartão.
- 20% em R$ 209,90 mostra R$ 167,92, com a tabela por variação: os testes "20% numa peça…" e "com variações de preços diferentes…". Morde: o "de" é conferido como `<s>`, as linhas da tabela por igualdade exata (Prata 167,92 · Ouro 199,92, e a pausada fora), e o `hidden lg:table-cell` por token.
- "De" R$ 259,90, preço R$ 239,90 e 10% cobram R$ 233,91: teste homônimo. Também afirma a ausência de R$ 215,91 e repete o caso para a variação com "de". Morde.
- Salvar grava a marcação pela porta e "Nenhum" tira a peça:
  - o teste do upsert confere `campaign_id: 'bf'` e `percent: 20`, e que nada é escrito antes do Salvar;
  - o do "Nenhum" confere `delete` com `eq campaign_id bf` e `in product_id [p1]`, e só aquela campanha;
  - mais o caso sem mudança (zero escrita) e o da falha (o aviso).
  
  Morde, pelo diário do dublê.
- Probe `AD-012` contra o banco local: `probes/03-campanha-no-produto.sh`. Lê o `PRODUCT_FORM_SELECT` do próprio fonte e prova a releitura do embed depois do upsert e do delete. Também prova que `base_price` e `original_price` não mudam. O probe repete a forma HTTP da porta (`on_conflict=product_id,campaign_id`) em vez de chamar a porta. Os 11 `ok —` vêm do relato do implementador, porque esta revisão não executa nada.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Embed `product_campaigns(campaign_id, percent)` na carga, com `campaign_marks` no estado e `campaignMarks` no snapshot | sim | Mesmo molde do fornecedor e do Compre Junto em `PRODUCT_FORM_SELECT`. A tarefa proíbe mexer em `entities/campaign`. O teste prova que "Alterações não salvas" aparece | sim. As tarefas 03..09 não citam `PRODUCT_FORM_SELECT` nem `campaign_marks` |
| 2 | O Salvar grava só o que mudou, depois do Compre Junto, com aviso próprio se falhar | sim | Molde de `persistSuppliers`, que não escreve sem mudança (apps/backoffice/CLAUDE.md › O fornecedor da peça). Ordem conferida em `AdminProductFormPage.tsx` | sim |
| 3 | A cópia (`?from=`) nasce sem marcação | sim | `productRowToForm` com `asCopy`. Nada na tarefa pede herdar a marcação | sim |
| 4 | Os cartões entram pelo slot `campaignCards`, entre "Preço padrão" e "Fornecedor" | sim | O Design diz "abaixo do cartão Preço" | sim. O raio já declara que o Fornecedor deixa de ser o vizinho imediato com campanha aberta. Em consequência, a frase "card Fornecedor logo abaixo de Preço padrão" de apps/backoffice/CLAUDE.md passa a valer só sem campanha. É documentação, não regra |
| 5 | A tabela mostra só variações ativas e com preço, e a peça sem variação usa `form.price`/`compare_price` | sim | Mesma régua de `priceRange`, e bate com a decisão T17 | sim |
| 6 | A falha na leitura das campanhas mostra uma linha de erro | sim | Nada a contradiz | sim |
| 7 | O grupo de percentuais é `radiogroup`/`radio` com `h-11 min-w-16` | sim | Atende o "alvo 44 px, ≥ 64 px" do Design, com o par `motion-reduce` na mesma linha | sim |

## Não conferido

- **Probe sem baseline:** `.specs/work-items/102-desconto-de-campanha/probes/03-campanha-no-produto.sh` está `??` (sem intent-to-add) e foi julgado inteiro pelo escopo da tarefa. Sem baseline, "não tocou no que a tarefa proibia tocar" naquele diretório depende da palavra do implementador.
- **Âncora do guarda de movimento:** o comentário diz "+2 tokens / +1 par" e ainda assim a âncora foi de 63 para 66, quando 63+2 daria 65. Pode ser que o valor medido de antes já fosse acima da âncora (que é `>=`). Só a execução mostra isso.
- **Conflito na fila, fora deste diff:** a tarefa 03 também diz que "nesta onda só esta tarefa edita esse guarda" (`animacaoRespeitaMovimento.test.ts`). Se a 02 e a 03 rodarem na mesma onda, as duas mexem na mesma âncora.
- **Payload da porta sem igualdade exata:** o teste confere o upsert com `toMatchObject` (subconjunto), e não com a igualdade exata que apps/backoffice/CLAUDE.md › Molde dos formulários pede para payload de gravação. O payload é montado pela porta da tarefa 01 (`entities/campaign`), fora do diff. Não conferi se os testes da tarefa 01 o fixam por igualdade.
- **Só execução:** os testes passando, o probe com 11 `ok —` e a medida das âncoras.

Instruções lidas:
- `CLAUDE.md` (raiz, no system prompt) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import
- `apps/backoffice/CLAUDE.md` › Molde dos formulários · Descontos · O fornecedor da peça (o exemplar citado)

## T04 — wi-impl-task · review · agente a3b4905bc7b09ce66

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/04-selo-e-preco-na-vitrine-da-loja.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O mapeador (`mapDbToProduct`) **sobrescreve** `Product.price`/`compare_price` e o `price`/`compare_price` de cada variação com o preço efetivo e o cheio (`campaignUnitPrice`) quando há campanha. Também acrescenta `Product.campaign` | Um campo à parte (`effective_price`) que cada leitor teria de passar a ler | Filtros, régua de preço, ordenação, card, busca, Compre Junto, GA4 e carrinho abandonado já leem `price`/`compare_price`. Com a sobrescrita, todos passam ao efetivo sem uma linha de mudança, e `hasDiscount` = efetivo < cheio por construção. Um dono só na loja | 05, 06, 07 (consomem o produto mapeado); qualquer leitor futuro de `price` na loja |
| 2 | `ProductCampaign` carrega `list_prices` (os preços de TABELA da peça e de cada variação com preço próprio, por id) | Não guardar o preço de tabela | A T2 da tarefa 05 passa preço cheio + campanha a `resolveOrderPricing`. Sem o preço de tabela, ela reaplicaria a campanha sobre o efetivo e daria desconto em dobro | tarefa 05 (propagado) |
| 3 | A peça só fica marcada (`campaign` ≠ null, com a faixa) quando a campanha baixa o preço da peça ou de alguma variação. Se a campanha não baixa nada (o "de/por" de hoje já é menor), a peça fica a de sempre, sem selo | Mostrar a faixa "−X%" mesmo sem desconto efetivo | O selo anunciaria um desconto que não existe | card, página, 06/07 (quais peças mostram a faixa) |
| 4 | A variação usa o **próprio** `compare_price` no cálculo e nunca herda o `original_price` da peça. A variação sem preço próprio (`price` null) fica null e herda o preço efetivo da peça | Herdar o "de" do produto, como o card faz hoje quando o `compare_price` da variação é nulo | "cada variação sobre o próprio preço" (CA-05) | tarefa 05: o servidor precisa da mesma regra (o `mercado-pago` lê `compare_price` da variação) |
| 5 | O mapeador **não** chama `isCampaignLive`. Marcação com a campanha embutida já é campanha em vigência (RLS por `now()`). O guarda proíbe a regra de vigência em toda a produção da loja, e o mapeador também não a chama | Uma checagem de defesa no mapeador com `Date.now()` | T5: a loja nunca decide a vigência com o relógio do navegador | nenhum além do guarda |
| 6 | O selo vive em `apps/store/src/entities/campaign/ui` (`CampaignBand` 30 px, `CampaignBadgeInline` 26 px), com as props `campaign` e `percent` e as cores por `style` inline. Não reaproveita os componentes do painel (T01) | Mover o selo para `packages/ui` e compartilhar com o painel | A tarefa manda `entities/` (AD-033). `core/campaigns` não pode ser tocado. O painel continua com a sua prévia, que é uma cópia do desenho | 05 (selo da sacola), 06, 07 |
| 7 | `useLiveCampaign()` lê `campaigns` com `campaign_percents(percent)` e devolve `LiveCampaign` (percentuais em ordem) ou `null`. A falha da leitura é erro, não "sem campanha" | Não criar o hook nesta tarefa | Contrato: "a campanha em vigência ou nenhuma", que 06 e 07 consomem | 06, 07 |
| 8 | No cartão e na página, o cheio riscado (com "De " só para leitor de tela) sobe para **acima** do preço só na peça de campanha. A peça sem campanha mantém o layout de hoje | Mudar o layout de todos os cartões | Design da tarefa. A peça fora da campanha "volta a ser a de hoje" | altura dos cartões de campanha (+1 linha); prova de layout com o QA |
| 9 | Na página do produto da peça de campanha, o chip "Economize" sai e os selos da galeria (−X%, Novo) também saem. O selo em linha fica acima do `h1` | Manter o chip e os selos da galeria | RN-13: só a faixa da campanha, nunca dois selos | página do produto |
| 10 | `savingsOf` passa a ler o `compare_price` da **variação** escolhida só na peça de campanha (em `useProductPurchase`). Fora da campanha, nada muda | Corrigir para todas as peças | Menor superfície. Fora da campanha o comportamento de hoje fica intacto | página e barra de compra |
| 11 | As miniaturas sobem com a prop `aboveBand` do `ColorPreview`: `bottom-10 md:bottom-[42px]` com faixa e `bottom-3.5` sem ela | Reposicionar sempre | Design: 40/42 px com selo e 14 px sem | cartão |
| 12 | Não abri `spec.md`, embora a tarefa diga para copiar "spec.md › Design". Usei o resumo do bloco "Design — o que a tela faz" e, como exemplar, o `CampaignCardPreview`/`CampaignBadgeInline` do painel (T01) | Abrir a costura | Regra 5 do procedimento (não reabrir a costura) | medidas do selo; conferir no QA contra o protótipo |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Mapeador: 20% sobre R$ 209,90 ⇒ R$ 167,92 / cheio R$ 209,90; sem marcação ou fora da leitura ⇒ preço de sempre; cada variação sobre o próprio preço; CA-06 na peça e na variação | domínio | apps/store/src/entities/product/lib/__tests__/precoDeCampanha.test.ts | sim | — |
| 2 | Os três `select` da vitrine trazem a marcação e entregam o efetivo | domínio | apps/store/src/entities/product/lib/__tests__/cardSelect.test.ts (bloco novo + âncora de embeds) | sim | vermelho |
| 3 | Selo (faixa e em linha): texto, percentual "−20%", cores cruzadas, "Dia das Mães", medidas 30/26 px e cantos de 6 px | frontend | apps/store/src/entities/campaign/ui/__tests__/CampaignBadge.test.tsx | sim | vermelho |
| 4 | Leitura da campanha em vigência (`useLiveCampaign`) | aplicação | apps/store/src/entities/campaign/api/__tests__/useLiveCampaign.test.tsx | sim | — |
| 5 | Cartão: faixa nas cores cruzadas; nenhum selo do canto na campanha e os de hoje fora dela; "De R$ 209,90"; CA-06; miniaturas acima da faixa; tocar troca foto e preço sem navegar; Dia das Mães | frontend | apps/store/src/entities/product/ui/__tests__/ProductCardCampaign.test.tsx | sim | — |
| 6 | Página real: selo em linha acima do nome, cheio riscado acima, PIX R$ 159,52 e 6x R$ 27,99 sobre o efetivo, galeria sem selos do canto; fora da vigência, a de hoje | frontend | apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx | sim | — (o caso do PIX passou de primeira; vermelho com a mutação do mapeador) |
| 7 | Filtros e ordenação: "Com desconto", régua, faixa de preço, menor/maior preço e variação casada pelo efetivo | domínio | apps/store/src/features/category-filters/model/__tests__/filtrosComCampanha.test.ts | sim | vermelho |
| 8 | Guardas: selo sem token `estrelinha-*` e com cores por `style`; vigência não calculada no navegador (metade positiva no mapeador); contraste da semente 7,4:1 por `contrastRatio` | domínio | apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts | sim | vermelho |
| 9 | Demais leituras (busca/listagens, página/order bump/carrinho abandonado, Compre Junto, GA4) leem o efetivo | domínio | apps/store/src/entities/product/lib/__tests__/leiturasDoPrecoEfetivo.test.ts | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

- packages/supabase/src/types/campaign.ts alterado
- packages/supabase/src/types/index.ts alterado
- apps/store/src/entities/product/lib/mapProduct.ts alterado
- apps/store/src/entities/product/lib/__tests__/cardSelect.test.ts alterado
- apps/store/src/entities/product/lib/__tests__/precoDeCampanha.test.ts criado
- apps/store/src/entities/product/lib/__tests__/leiturasDoPrecoEfetivo.test.ts criado
- apps/store/src/entities/product/ui/ProductCard.tsx alterado
- apps/store/src/entities/product/ui/ColorPreview.tsx alterado
- apps/store/src/entities/product/ui/ProductInfo.tsx alterado
- apps/store/src/entities/product/ui/__tests__/ProductCardCampaign.test.tsx criado
- apps/store/src/entities/product/model/useProductPurchase.tsx alterado
- apps/store/src/pages/ProductPage.tsx alterado
- apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx criado
- apps/store/src/features/category-filters/model/__tests__/filtrosComCampanha.test.ts criado
- apps/store/src/entities/campaign/index.ts criado
- apps/store/src/entities/campaign/model/types.ts criado
- apps/store/src/entities/campaign/api/useLiveCampaign.ts criado
- apps/store/src/entities/campaign/api/__tests__/useLiveCampaign.test.tsx criado
- apps/store/src/entities/campaign/ui/CampaignBand.tsx criado
- apps/store/src/entities/campaign/ui/CampaignBadgeInline.tsx criado
- apps/store/src/entities/campaign/ui/__tests__/CampaignBadge.test.tsx criado
- apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts criado
- .specs/work-items/102-desconto-de-campanha/tasks/05-sacola-e-checkout.md alterado (só a linha do Contrato, propagação)
- .specs/work-items/102-desconto-de-campanha/tasks/06-vitrine-ofertas.md alterado (só a linha do Contrato, propagação)
- .specs/work-items/102-desconto-de-campanha/tasks/07-bloco-joias-em-oferta-na-home.md alterado (só a linha do Contrato, propagação)

## Verificação

- Baseline de tipos da loja (não veio na entrada): rodei `npx tsc --noEmit -p apps/store/tsconfig.app.json` antes da primeira fatia. Fonte: CLAUDE.md §Comandos. Resultado: 0 erros (`limpo`).
- `pnpm --filter @estrelinha/store exec vitest run <arquivo> --testTimeout=20000`, rodado por fatia em cada arquivo acima. Fonte: PROJECT.md › Comandos de verificação. Todos verdes no fim.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` no fecho. Fonte: CLAUDE.md §Comandos. Resultado: exit 0, 0 erros, igual ao baseline `limpo`.
- `pnpm --filter @estrelinha/store test --testTimeout=20000`, a verificação mínima (suíte da loja). Fonte: CLAUDE.md §Baselines.
  - Resultado: **392/392 arquivos, 7285/7285 testes passando**, mas o exit foi 1.
  - A causa é um único "Unhandled Error: [vitest-worker]: Timeout calling onTaskUpdate". É contenção do worker, não um teste, e mesma assinatura que o CLAUDE.md registra; a tarefa 02 rodava em paralelo.
  - Depois dessa rodada, mudei `list_prices`, o tipo `LiveCampaign` e o NBSP de dois testes. Por isso rerodei os 67 arquivos tocados e os guardas da obrigação: exit 0, 991/991. Os guardas: `cardSkeletonBox`, `alvoDeToqueNaoRoubaPosicao`, `accentText`, `touchTarget`, `cardSelect`, `fiacaoDaVitrine`, `renditionSingleOwner`, `contrast`, `arbitraryTextColor`, `brandScan`.
- `npx eslint` nos arquivos tocados: só os 2 warnings de fronteira FSD já existentes em `ProductInfo.tsx` (baseline da loja 2/2). Dois `no-irregular-whitespace` que eu tinha criado (NBSP literal em dois testes) foram corrigidos.
- Probe HTTP contra o Supabase local (porta 54441, anon) com o `select` enxuto e o completo: 200 nos dois (o embed `product_campaigns(percent, campaigns(...))` não cria ambiguidade). `campaigns` com anon devolve `[]`: não há campanha em vigência no banco local.

Instruções lidas: CLAUDE.md › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; apps/store/CLAUDE.md › A listagem de categoria (com Os filtros curados e Os filtros enxergam as variações) · Carrinho, chrome e checkout · A sacola v4 e a marca "acompanha"; packages/core/CLAUDE.md › Pureza · Dinheiro; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- **Retomada**: com `retomada: sim`, a árvore não tinha nada desta tarefa, só `.specs/` e, depois, o trabalho da tarefa 02 no backoffice. Todas as fatias foram feitas do zero.
- **A tarefa manda copiar `spec.md` › Design; o procedimento (regra 5) proíbe abrir a costura.** Segui a regra e não abri. As medidas vieram do bloco Design da tarefa e dos componentes de prévia do painel (T01). O QA deve conferir o selo contra o protótipo.
- **Fatias que passaram de primeira com o check de mutação feito**:
  - cardSelect (embed removido ⇒ vermelho)
  - selos (cores não cruzadas ⇒ vermelho)
  - filtros e PIX da página (mapeador sem sobrescrever ⇒ vermelho)
  - guardas (token e `isCampaignLive` injetados ⇒ vermelho)
  - demais leituras (embed e mapeador mutados ⇒ vermelho)
- **Propagado para 05, 06 e 07** (só a linha "JÁ EXISTE (tarefa 04)" do Contrato, que tinha Entra/Sai vazios):
  - a forma do contrato: preço efetivo já no `price`, `Product.campaign`, `useLiveCampaign`, `CampaignBadgeInline`/`CampaignBand`;
  - na 05, o aviso de que reaplicar a campanha sobre `price` dá desconto em dobro: use `campaign.list_prices`.
- **Para a tarefa 05**:
  - A sacola já recebe o efetivo: `useProductPurchase` grava `unitPrice: variant.price` e `product.price`, agora com a campanha.
  - O servidor (tarefa 05) precisa da mesma regra por variação: a variação usa o próprio `compare_price` e nunca o `original_price` da peça (premissa 4).
  - Compre Junto: o bloco aplica o desconto dele sobre o preço exibido, que agora é o efetivo. Se os dois descontos se somam ou se vale o menor (AD-015) é regra da 05.
- **Cache**: a listagem e a página guardam o produto no React Query. Se a campanha acabar com a página aberta, o cartão segue com o selo até a próxima releitura. Na sacola isso é da 05.
- **Só a execução provaria**: o preço de uma campanha em vigência de verdade, atravessando a RLS até a tela. Não há campanha ligada no banco local, e criar uma é escrita de admin que não fiz. Probei só que os dois `select` respondem 200 com o embed.
- Não rodei `tsc` do backoffice nem do mobile-adm depois de mexer em `packages/supabase/src/types`. O campo novo é opcional, e o backoffice está sendo editado em paralelo pela tarefa 02.
- Caducou: nada.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: CLAUDE.md › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; apps/store/CLAUDE.md › A listagem de categoria · Os filtros curados · Os filtros enxergam as variações · Carrinho, chrome e checkout · A sacola v4; packages/core/CLAUDE.md › Pureza · Dinheiro; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos:
  - Mapeador (efetivo, cheio, sem marcação/fora da leitura, variação, CA-06): apps/store/src/entities/product/lib/__tests__/precoDeCampanha.test.ts e cardSelect.test.ts
  - Cartão (faixa, cores cruzadas, sem selos do canto na campanha e com os de hoje fora, "De R$ 209,90", miniaturas acima da faixa e toque sem navegar, Dia das Mães): apps/store/src/entities/product/ui/__tests__/ProductCardCampaign.test.tsx; selo isolado em apps/store/src/entities/campaign/ui/__tests__/CampaignBadge.test.tsx
  - Página do produto real (selo acima do nome, PIX e parcelas sobre o efetivo): apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx
  - Filtros e ordenação: apps/store/src/features/category-filters/model/__tests__/filtrosComCampanha.test.ts
  - Guardas (sem token estrelinha-*, vigência fora do navegador, contraste da semente por contrastRatio): apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts
  - Demais leituras (busca, cross-sell, analytics, carrinho abandonado): apps/store/src/entities/product/lib/__tests__/leiturasDoPrecoEfetivo.test.ts
  - Sem cobertura: a fonte a 200 % e a ausência de rolagem horizontal, porque jsdom devolve 0 para layout (fica com o QA)
Verificações:
  - tsc da loja: 0 erros (baseline limpo)
  - arquivos de teste da tarefa: verdes
  - suíte da loja: 7285/7285 passando, exit 1 por um único "Timeout calling onTaskUpdate" do worker (contenção)
  - reexecução dos 67 arquivos tocados e dos guardas: 991/991, exit 0
  - eslint: só os 2 warnings de baseline
  - probe HTTP local: os dois select com o embed respondem 200
Árvore de trabalho: tipos em packages/supabase (ProductCampaign, Product.campaign); mapProduct (embed + preço efetivo); ProductCard, ColorPreview, ProductInfo, useProductPurchase, ProductPage; entities/campaign novo (hook, selo faixa e em linha, guardas); 7 arquivos de teste novos e cardSelect ampliado; linha do Contrato de 05, 06 e 07
Citações conferidas: 6 abertas (mapProduct.ts PRODUCT_CARD_SELECT; ProductCard.tsx :39 CardBadge, :159-164 hasDiscount, :304-312 cadeia de selos; ColorPreview.tsx :139; freeShippingSingleOwner.test.ts; core/campaigns/price.ts); nenhuma deslocou, nenhuma morta
Propagado:
  - 05: linha "preço efetivo e entities/campaign" do Contrato com a forma real (price já efetivo, Product.campaign com list_prices — usar list_prices para não descontar em dobro —, CampaignBadgeInline, useLiveCampaign)
  - 06 e 07: linha "entities/campaign, preço efetivo, selo" com useLiveCampaign/LiveCampaign, o efetivo no price e CampaignBand/CampaignBadgeInline
```

## T04 — wi-impl-review · fixing · agente a531661dc9f9d5b47

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/04-selo-e-preco-na-vitrine-da-loja.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | premissa derrubada | atrapalha | apps/store/src/entities/campaign/ui/CampaignBadgeInline.tsx:25 e :32 | A premissa 12 deixou de abrir o spec.md, e o selo em linha copiou as medidas da faixa do cartão: texto com folga 12/8 px, percentual em 13 px com folga 11 px. O spec dá outras medidas para o selo em linha. O teste `CampaignBadge.test.tsx` só confere 26 px e cantos de 6 px, então a diferença passa sem ninguém ver. | Tarefa › Design: "Copie spec.md › Design › … "Selo · em linha" … — é a fonte". spec.md:81: "Texto 11 px negrito maiúsculo 0,08 em, folga 10/9 px; percentual 12 px negrito, folga 9 px." |
| 2 | premissa derrubada | atrapalha | apps/store/src/entities/product/ui/ProductInfo.tsx:114-124 | Pela mesma premissa 12, na página do produto o preço cheio riscado foi posto numa linha própria, acima do preço com desconto. O spec põe o riscado depois do preço, na mesma linha das parcelas. | spec.md:83-84: "selo em linha → nome → preço com desconto → "De R$ X (riscado) · 4x de R$ Y sem juros" ("De " só para leitor de tela)" |
| 3 | convenção violada | atrapalha | apps/store/src/entities/product/ui/ProductCard.tsx:30; apps/store/src/entities/product/ui/ProductInfo.tsx:26 | O código novo importa o selo pelo caminho profundo (`@/entities/campaign/ui/CampaignBand`, `…/ui/CampaignBadgeInline`). O barrel `apps/store/src/entities/campaign/index.ts`, criado nesta mesma tarefa, já exporta os dois componentes, e o barrel não importa nada de `entities/product`, então não há ciclo que justifique o caminho profundo. | CLAUDE.md:225-226: "Cada slice tem um barrel `index.ts` (public API). **Novo código deve importar do slice** (`@/entities/product`) e não de caminhos profundos." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| CA-03 e CA-04 no cartão e na página do produto, CA-05, CA-06, CA-11, CA-12 (selo) e CA-14 (cores e sem paleta) provados por teste | `precoDeCampanha.test.ts` (CA-03, CA-04, CA-05, CA-06, variação sem preço próprio); `ProductCardCampaign.test.tsx` (CA-03 e CA-04 no cartão, CA-06, CA-11, CA-12); `ProductPageCampanha.test.tsx` (CA-03 e CA-04 na página); `CampaignBadge.test.tsx` e `campanhaNaLoja.test.ts` (CA-14: cores cruzadas, sem token `estrelinha-`, semente 7,4:1) | sim. O desenho do selo em linha diverge do spec (achados 1 e 2) |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

- `cardSkeletonBox`, `alvoDeToqueNaoRoubaPosicao`, `accentText`, `touchTarget`, `cardSelect`, `fiacaoDaVitrine` e `renditionSingleOwner` verdes sem afrouxar: `cardSelect.test.ts` só ganhou a entrada `product_campaigns` na lista de embeds e casos novos, sem asserção afrouxada. Os demais guardas não foram tocados. Que estão verdes, só a execução prova.
- Sem rolagem horizontal em 390 e o percentual sem cortar a 200 %: o percentual tem `shrink-0` e o texto tem `min-w-0`/`overflow-hidden` (`CampaignBand.tsx`, `CampaignBadgeInline.tsx`). A prova de layout fica com o QA, como a tarefa declara.
- `strictNullChecks: false`: o código novo não usa união discriminada por booleano. `toProductCampaign` devolve `CampaignMark | null`.

## Testes

- Mapeador: `apps/store/src/entities/product/lib/__tests__/precoDeCampanha.test.ts` cobre 209,90 a 20% = 167,92 com o cheio em 209,90, a peça sem marcação, a campanha `null` (fora da leitura), CA-06 na peça e na variação, cada variação sobre o próprio preço e `list_prices`. Mais `cardSelect.test.ts`: os três `select`, com um sensor que tira o embed. A asserção morde.
- Cartão: `apps/store/src/entities/product/ui/__tests__/ProductCardCampaign.test.tsx` cobre a faixa com as cores cruzadas, a ausência de Novo, Destaque, Últimas e −X% na peça de campanha, os selos de hoje fora dela, "De R$ 209,90" com `sr-only`, as miniaturas com `bottom-10 md:bottom-[42px]`, o toque na miniatura trocando foto e preço sem navegar, e "Dia das Mães". A asserção morde.
- Página do produto real: `apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx` cobre o selo acima do `h1`, PIX 159,52 e 6x de 27,99 sobre o preço com desconto, e a galeria sem selos. A página é a real e só os hooks são dublados. A asserção morde, mas fixa a ordem riscado-acima-do-preço, que diverge do spec (achado 2).
- Filtros e ordenação: `apps/store/src/features/category-filters/model/__tests__/filtrosComCampanha.test.ts` cobre "Com desconto", a régua de preço, a faixa de preço, a ordenação menor e maior preço, e a variação casada. A asserção morde.
- Guardas: `apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts` cobre o selo sem token, a vigência não chamada em lugar nenhum da loja, a metade positiva no mapeador e o contraste da semente por `contrastRatio`. Os sensores do token e da vigência testam a regex sobre string solta, sem chamar o colhedor. A régua aplicada ao código, porém, é a mesma regex, então a sensibilidade fica provada.
- Demais leituras de `price`: `apps/store/src/entities/product/lib/__tests__/leiturasDoPrecoEfetivo.test.ts` confere o embed nos três `select` (busca e listagens, página, carrinho abandonado e Compre Junto nas duas pontas) e o GA4 com 167,92. A cobertura da busca e do carrinho abandonado é indireta: o teste prova que o `select` traz o embed, não executa os hooks. Aceitável pela premissa 1.
- Leitura da campanha em vigência: `apps/store/src/entities/campaign/api/__tests__/useLiveCampaign.test.tsx` cobre tabela e `select` vistos pelo dublê, percentuais em ordem, vazio = `null` e erro = erro. A asserção morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O mapeador sobrescreve `price`/`compare_price` com o preço efetivo e o cheio | sim | T8 da tarefa; `mapProduct.ts withCampaign`. A tarefa 05 já está propagada ("já com a campanha") | sim. O servidor de páginas e o feed (tarefa 08) não usam o mapeador, e a loja não tem JSON-LD de produto no cliente |
| 2 | `list_prices` guarda os preços de tabela | sim | O contrato da tarefa 05 já cita `list_prices` | sim |
| 3 | A peça só é marcada quando a campanha baixa algum preço | sim | Teste "campanha que não baixa o preço" | sim. Contratos de 06 e 07: "na peça cujo preço ela baixa" |
| 4 | A variação usa o próprio `compare_price` | sim | CA-05 | sim. A tarefa 05 fica com a regra do servidor |
| 5 | O mapeador não chama `isCampaignLive` | sim | T5; o guarda confere | sim |
| 6 | O selo vive em `entities/campaign/ui`, com cores por `style` | sim | AD-033 e T16 | sim. Ver o achado 3 sobre o caminho do import |
| 7 | `useLiveCampaign` devolve `LiveCampaign` ou `null`, e falha é erro | sim | O contrato, e as tarefas 06 e 07 já propagadas | sim |
| 8 | O cheio riscado vai acima do preço só na peça de campanha | só no cartão | spec.md:90 manda acima no cartão; spec.md:83-84 põe o riscado depois do preço na página | sim |
| 9 | Na página da campanha saem o "Economize" e os selos da galeria | sim | RN-13 | sim |
| 10 | `savingsOf` lê o `compare_price` da variação só na campanha | sim | `useProductPurchase.tsx:205-210` | sim |
| 11 | `aboveBand` no `ColorPreview` | sim | spec.md:91-92 (40/42 px com selo, 14 px sem) | sim |
| 12 | Não abriu o spec.md e usou o resumo da tarefa e o painel como exemplar | não | A tarefa diz "Copie spec.md › Design … — é a fonte". O spec.md:81 e :83-84 dá medidas e ordem diferentes do implementado (achados 1 e 2) | sim |

## Não conferido

- Se os testes passam, `tsc` e lint: não rodei. Revisão sem execução.
- Altura do cartão de campanha frente ao esqueleto: o cartão ganha uma linha de 16 px no preço e o `ProductCardSkeleton` não mudou, o que pode gerar CLS nas listagens de peças de campanha. `cardSkeletonBox` lê classes e não alturas, então só o navegador mede.
- Caso extremo do cartão: numa peça de campanha cuja variação escolhida a campanha não baixou, aparece a faixa sem preço riscado, e o "de" pode cair no `compare_price` do produto. Não dá para afirmar o desenho sem executar.
- O status `A` dos arquivos novos indica que o intent-to-add foi feito. Todos os arquivos de `alterados` aparecem no diff.
- Instruções lidas: CLAUDE.md (raiz) inteiro (O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy, Feature-Sliced Design / Alias de import); apps/store/CLAUDE.md só pelo índice de títulos (não li A listagem de categoria / os filtros, Carrinho, chrome e checkout nem A sacola v4); packages/core/CLAUDE.md não lido (só o grep de "barrel"); .specs/work-items/102-desconto-de-campanha/spec.md › Design (Selo · a faixa, Selo · em linha, Cartão com miniaturas de cor) para conferir a premissa 12.

## T04 — wi-impl-task · done · agente a3b4905bc7b09ce66

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/04-selo-e-preco-na-vitrine-da-loja.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 12 | (revista) Abri `spec.md:80-86`, as linhas que os achados citam, e as medidas do selo em linha e a ordem dos preços da página agora seguem o spec. No selo em linha, o texto tem 11 px com folga de 10/9 px e o percentual tem 12 px com folga de 9 px. Na página, a ordem é: selo em linha, nome, preço com desconto, e depois uma linha só com "De R$ X (riscado) · Nx de R$ Y sem juros". O "De " fica só para leitor de tela, e a linha de parcelas avulsa some na peça de campanha | Copiar as medidas da faixa do cartão e pôr o riscado numa linha própria acima do preço | Os achados 1 e 2: o spec é a fonte que a tarefa nomeia | `CampaignBadgeInline`, que a tarefa 05 reaproveita na sacola; a página do produto |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 3 | Selo em linha com as medidas do spec: 26 px, cantos de 6 px, texto com folga 10/9 px, percentual em 12 px com folga 9 px | frontend | apps/store/src/entities/campaign/ui/__tests__/CampaignBadge.test.tsx | sim | vermelho |
| 6 | Página real: preço com desconto e, depois dele, "De R$ 209,90 · 6x de R$ 27,99 sem juros" numa linha só, sem repetir a linha de parcelas avulsa; PIX sobre o preço com desconto; fora da vigência, a página de hoje | frontend | apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

- apps/store/src/entities/campaign/ui/CampaignBadgeInline.tsx alterado
- apps/store/src/entities/campaign/ui/__tests__/CampaignBadge.test.tsx alterado
- apps/store/src/entities/product/ui/ProductInfo.tsx alterado
- apps/store/src/entities/product/ui/ProductCard.tsx alterado
- apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run <arquivos> --testTimeout=20000` (PROJECT.md › Comandos de verificação)
  - Rodado em `entities/campaign`, `entities/product`, `pages/__tests__/ProductPage*` e `features/category-filters`: 55 arquivos e 831 testes, exit 0.
  - Rodado nos guardas `alvoDeToqueNaoRoubaPosicao`, `accentText`, `touchTarget`, `renditionSingleOwner`, `arbitraryTextColor` e `contrast`: 109 testes, exit 0.
- Check de mutação nas duas fatias corrigidas. Voltei às medidas antigas do selo em linha e à linha de parcelas avulsa na peça de campanha, e cada teste correspondente ficou vermelho. Restaurei pela cópia e conferi com `cmp`.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md §Comandos): 0 erros. Igual ao baseline limpo.
- `npx eslint` nos arquivos tocados: só os 2 warnings de fronteira FSD de `ProductInfo.tsx`, que já existiam (baseline).
- Não rodei de novo a suíte inteira da loja.

Instruções lidas: CLAUDE.md › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; apps/store/CLAUDE.md › A listagem de categoria · Carrinho, chrome e checkout · A sacola v4; packages/core/CLAUDE.md › Pureza · Dinheiro; .specs/work-items/102-desconto-de-campanha/spec.md:80-86 (só as linhas citadas pelos achados).

## Divergências e descobertas

- Achado 3 aplicado: `ProductCard.tsx` e `ProductInfo.tsx` passam a importar `CampaignBand` e `CampaignBadgeInline` do barrel `@/entities/campaign`. O barrel também exporta `useLiveCampaign`, que traz o client do Supabase. As suítes do cartão e da página continuaram verdes.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: CLAUDE.md › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; apps/store/CLAUDE.md › A listagem de categoria · Os filtros curados · Os filtros enxergam as variações · Carrinho, chrome e checkout · A sacola v4; packages/core/CLAUDE.md › Pureza · Dinheiro; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local; na correção, spec.md:80-86 (as linhas citadas pela revisão)
Testes escritos:
  - Mapeador (preço efetivo, preço cheio, sem marcação ou fora da leitura, variação, CA-06): apps/store/src/entities/product/lib/__tests__/precoDeCampanha.test.ts e cardSelect.test.ts
  - Cartão (faixa, cores cruzadas, sem selos do canto na campanha e com os de hoje fora dela, "De R$ 209,90", miniaturas acima da faixa e toque sem navegar, Dia das Mães): apps/store/src/entities/product/ui/__tests__/ProductCardCampaign.test.tsx
  - Selo isolado, nas duas formas e com as medidas do spec para o selo em linha: apps/store/src/entities/campaign/ui/__tests__/CampaignBadge.test.tsx
  - Página do produto real (selo acima do nome; preço com desconto e depois "De R$ X · Nx de R$ Y sem juros" calculado sobre o preço com desconto; PIX sobre o preço com desconto): apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx
  - Filtros e ordenação: apps/store/src/features/category-filters/model/__tests__/filtrosComCampanha.test.ts
  - Guardas (sem token estrelinha-*, vigência fora do navegador, contraste da semente por contrastRatio): apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts
  - Demais leituras (busca, cross-sell, analytics, carrinho abandonado): apps/store/src/entities/product/lib/__tests__/leiturasDoPrecoEfetivo.test.ts
  - Sem cobertura: fonte a 200 % e rolagem horizontal, porque o jsdom devolve 0 para medidas de layout; fica com o QA
Verificações:
  - Implementação: tsc da loja com 0 erros. Suíte da loja com 7285/7285 testes passando, mas exit 1 por um único "Timeout calling onTaskUpdate" do worker (contenção, não teste).
  - Correção: arquivos tocados 831/831 e guardas 109/109, exit 0; tsc com 0 erros; eslint só com os 2 warnings do baseline.
  - Probe HTTP local: os dois select com o embed de campanha respondem 200.
Árvore de trabalho:
  - Tipos em packages/supabase: ProductCampaign com list_prices e Product.campaign.
  - mapProduct: embed de campanha e preço efetivo.
  - Telas e lógica: ProductCard, ColorPreview, ProductInfo, useProductPurchase, ProductPage.
  - entities/campaign novo: hook, selo em faixa e em linha (importado pelo barrel), guardas.
  - Testes: 7 arquivos novos e cardSelect ampliado.
  - Linha do Contrato das tarefas 05, 06 e 07.
Citações conferidas: 6 abertas, nenhuma deslocou, nenhuma morta. Na correção, spec.md:80-86.
Propagado:
  - 05: linha "preço efetivo e entities/campaign" do Contrato com a forma real (price já efetivo; Product.campaign com list_prices, para não descontar em dobro; CampaignBadgeInline; useLiveCampaign).
  - 06 e 07: linha "entities/campaign, preço efetivo, selo" com useLiveCampaign/LiveCampaign, o preço efetivo em price e CampaignBand/CampaignBadgeInline.
```

## T03 — wi-impl-task · review · agente ae9cbf754c9966a3c

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/03-lista-de-produtos-e-edicao-em-massa.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O filtro vira dois campos novos em `ProductFilters`: `campaignId: string \| null` e `campaignPercent: number \| null`. Na URL eles são `campanha` e `percentual`. O percentual só é escrito e lido quando há campanha | Um campo composto, ou o percentual valendo sozinho | Segue o molde de `supplierIds` e os endereços que `campaignProductsHref` (tarefa 01) já gera. Uma visão salva antiga abre com os dois campos em `null` por `readSavedViews` | `productQuery.ts`, `queryUrl.ts`, `filterChips.ts` e as visões salvas. Nenhuma tarefa seguinte cita esses campos |
| 2 | O filtro no servidor é o embed `filtro_campanha:product_campaigns!inner(campaign_id, percent)` com `.eq` na campanha e, se houver, no percentual. A exibição tem embed próprio, `product_campaigns(campaign_id, percent)`, que entrou no `LIST_SELECT` | Ler os ids primeiro e mandar `id=in.(…)` | É o molde de categoria e fornecedor (a URL longa já custou um 400). A forma foi provada contra o PostgREST local (probe 04) | `useAdminProducts.ts` |
| 3 | O nome e a vigência que aparecem na linha vêm da lista de campanhas que a tela já lê (`useCampaigns`), não de um embed de `campaigns` | Embutir `campaigns(name, …)` em cada linha | Uma leitura só e nenhuma coluna a mais por linha. A tela já precisa da lista para o filtro e para a edição em massa | `AdminProductsPage.tsx` e `features/product-list/model/campaignMarks.ts` |
| 4 | A linha só mostra as marcações de campanhas agendadas ou em vigência, mais a da campanha filtrada | Mostrar todas, inclusive as encerradas e as desligadas | Uma marcação de campanha encerrada continua guardada, e na linha ela pareceria um desconto ativo. A régua é a mesma do cadastro (`campaignsOpenForMarking`) | `campaignMarks.ts` |
| 5 | O seletor de campanha da lista oferece as agendadas e a em vigência, em ordem de início. A campanha que veio no endereço entra no fim mesmo encerrada | Listar todas as campanhas | É a decisão da tarefa ("todas as campanhas agendadas ou em vigência"). Sem a exceção, o "Ver as peças" de uma campanha encerrada abriria um filtro sem nome | `campaignMarks.ts`, `AdminProductsPage.tsx` |
| 6 | A edição em massa ganhou uma seção "Campanha" no `BulkEditPanel` que já existe. `onApply` passou a `(result, campaign \| null)`. A página grava pela porta `setProductsCampaign` e só aplica o patch de `products` quando há patch. O desfazer do toast continua só para o patch de `products` | Um diálogo separado, ou a marcação dentro do `BulkResult` | A tarefa pede a edição em massa existente, e a marcação não é patch de `products`. Desfazer marcação pediria um retrato das marcações anteriores, que a porta não devolve | `BulkEditPanel.tsx` (o único consumidor é a página) |
| 7 | Os rótulos são "{nome}: X%" e "Tirar da {nome}", com o artigo "da" fixo, inclusive em "Tirar da Natal" | Concordar o artigo com o nome | Contrato literal da tarefa. O gênero do nome não tem de onde ser derivado | Só texto de tela, fácil de trocar |
| 8 | Com a campanha ligada no painel e a escolha incompleta, "Aplicar" fica desligado. Se não há campanha aberta, a seção avisa e não bloqueia | Ignorar a seção incompleta em silêncio | Sem isso, a dona aplicaria achando que marcou | `BulkEditPanel.tsx` |
| 9 | Depois de gravar, a página relê a lista e as campanhas (`refetch` e o `refetch` de `useCampaigns`) | `invalidateCampaigns(queryClient)` | Mesmo efeito, e o teste da página não precisa montar um provedor de query | nenhum |
| 10 | No guarda `animacaoRespeitaMovimento` entrou só o arquivo novo de UI (`CampaignMarksCell.tsx`) | Incluir também `BulkEditPanel.tsx` e `AdminProductsPage.tsx`, que esta tarefa só alterou | A obrigação fala dos arquivos novos. Os dois alterados já tinham `transition-colors` sem o par, de antes desta tarefa, e consertá-los seria ampliar o escopo | o guarda (âncora de arquivos +1, contagens iguais) |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O filtro por campanha e por percentual vira a cadeia de filtros esperada no PostgREST | hook/consulta | `entities/product/api/useAdminProducts.test.ts` › "o filtro pela campanha" (5 casos) | sim | — (4 passaram pelo vermelho; "percentual sem campanha" passou de primeira e o check deu `vermelho`) |
| 2 | O recorte sobrevive na URL (ida e volta, "Ver as peças"), no chip e na visão salva | modelo | `features/product-list/model/__tests__/campanhaNosFiltros.test.ts`, mais `queryUrl.test.ts` ("cada eixo vai e volta") | sim | — (URL e chip passaram pelo vermelho; o caso da visão salva antiga passou de primeira e o check deu `vermelho`) |
| 3 | Quais campanhas o filtro oferece, e o que a linha mostra | modelo | `features/product-list/model/__tests__/campanhaNaLinha.test.ts` | sim | vermelho (duas mutações, cada uma derrubou 2 casos) |
| 4 | Na página real, `?campanha=bf&percentual=15` abre filtrada, com chip e seletores; a campanha encerrada aparece pelo nome; o filtro começa pela campanha e depois o percentual; o `x` do chip tira os dois | frontend (página) | `pages/admin/AdminProductsPage.campanha.test.tsx` | sim | — |
| 5 | A linha mostra "Black Friday · 15%" | frontend (página) | idem | sim | — |
| 6 | Na edição em massa: campanha e depois percentual, com os percentuais da campanha; campanha + 20% chama a porta com os ids; "Tirar da Black Friday" chama com `null`; sem percentual, "Aplicar" fica desligado; a recusa da porta vira aviso | frontend (página) | idem | sim | — |
| 7 | Gravação em lote, filtro, contagem, embed e preço intacto (CA-07), contra o banco local | integração local | `.specs/work-items/102-desconto-de-campanha/probes/04-lista-de-produtos.sh` (13 `ok —`) | sim | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

apps/backoffice/src/entities/product/api/productQuery.ts alterado
apps/backoffice/src/entities/product/api/useAdminProducts.ts alterado
apps/backoffice/src/entities/product/api/useAdminProducts.test.ts alterado
apps/backoffice/src/features/product-list/model/queryUrl.ts alterado
apps/backoffice/src/features/product-list/model/filterChips.ts alterado
apps/backoffice/src/features/product-list/model/campaignMarks.ts criado
apps/backoffice/src/features/product-list/model/__tests__/queryUrl.test.ts alterado
apps/backoffice/src/features/product-list/model/__tests__/campanhaNosFiltros.test.ts criado
apps/backoffice/src/features/product-list/model/__tests__/campanhaNaLinha.test.ts criado
apps/backoffice/src/features/product-list/ui/FilterChips.tsx alterado
apps/backoffice/src/features/product-list/ui/CampaignMarksCell.tsx criado
apps/backoffice/src/features/bulk-edit/model/bulkCampaign.ts criado
apps/backoffice/src/features/bulk-edit/ui/BulkEditPanel.tsx alterado
apps/backoffice/src/pages/admin/AdminProductsPage.tsx alterado
apps/backoffice/src/pages/admin/AdminProductsPage.test.tsx alterado
apps/backoffice/src/pages/admin/AdminProductsPage.campanha.test.tsx criado
apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts alterado
.specs/work-items/102-desconto-de-campanha/probes/04-lista-de-produtos.sh criado

## Verificação

- Um arquivo de teste (do `PROJECT.md`, Comandos de verificação): `pnpm --filter @estrelinha/backoffice exec vitest run <arquivo> --testTimeout=20000`. Rodou por fatia em cada arquivo acima. Ao fim, os arquivos ligados à lista (17 arquivos, 311 testes) passaram, e os guardas `animacaoRespeitaMovimento` e `buscaDeProdutoComDonoUnico` também (31/31).
- Tipos (do arquivo de instruções, `CLAUDE.md` §Comandos): `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` deu 7 erros, todos em `features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (3× TS2304, 4× TS2593). São idênticos à baseline do `CLAUDE.md` e não há erro novo.
- Verificação mínima (do arquivo de instruções, `CLAUDE.md` §Baselines): suíte do backoffice com `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`, exit 0, 5350/304. Suíte da loja com `pnpm --filter @estrelinha/store test --testTimeout=20000`, exit 1, 5 falhas e 7333 aprovados em 396 arquivos. As cinco falhas são todas da `OffersPage`, que a tarefa 06 está escrevendo nesta onda: `OffersPage.test.tsx`, `paginasFixasServidas`, `routeSplitting`, `reservedSlugs` ×2 e `buttonShape` (aponta `pages/OffersPage.tsx:199`). Nenhuma toca arquivo meu.
- ESLint nos arquivos tocados: 3 erros `no-explicit-any` em `useAdminProducts.ts:58/67/73` (`getProduct`, `createProduct`, `updateProduct`), que já existiam. O `any` novo está dentro do bloco `eslint-disable` que o arquivo já tinha.
- Probe local `04-lista-de-produtos.sh` contra :54441: 13 ok, 0 falhas. Limpa o que cria.

Instruções lidas: `CLAUDE.md` (raiz, já no contexto: O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy, Feature-Sliced Design / Alias de import); `apps/backoffice/CLAUDE.md › Molde dos formulários`, `› Descontos`, `› O fornecedor da peça` (este último pela regra do `queryUrl` e das visões salvas); `.specs/project/PROJECT.md › Comandos de verificação`, `› Ambiente local`.

## Divergências e descobertas

- Citações conferidas: `productQuery.ts:39,56,73` (supplierIds), `useAdminProducts.ts:104` (o embed `product_suppliers` está na linha 104), `fornecedorNosFiltros.test.ts`, `BulkEditPanel.tsx`, `buildBulkPatch.ts` e a porta `setProductsCampaign` da tarefa 01. Todas estavam presentes e nenhuma linha tinha deslocado.
- `Depende de` confere: `entities/campaign` exporta `setProductsCampaign(productIds, campaignId, percent | null)`, `useCampaigns`, `campaignsOpenForMarking` e `campaignProductsHref`, e `PercentsCard`/`AdminCampaignFormPage` já ligam para `/admin/produtos?campanha=…&percentual=…`.
- Fatias que passaram de primeira com o check de mutação dando `vermelho`: "percentual sem campanha não filtra nada" e "a visão salva antes da campanha abre sem o recorte". `campanhaNaLinha.test.ts` foi escrito junto com a implementação; o check deu `vermelho` nas duas mutações. As restaurações foram pela cópia e conferidas com `cmp`.
- Testes alterados, sem afrouxar nada: `queryUrl.test.ts` ("cada eixo vai e volta") ganhou os dois campos da campanha. `AdminProductsPage.test.tsx` ganhou o dublê de `useCampaigns`, porque a página agora lê as campanhas por React Query e esse arquivo não monta provedor.
- O que só o navegador prova ficou sem execução (CA-15, e a obrigação de não haver rolagem lateral em 390): a lista com os dois seletores novos (`w-[180px]` em `flex-wrap`), a seção Campanha do painel em massa (`max-w-full`) e o rótulo "nome · %" na linha (`break-words`, sem `truncate`) a 200% de fonte. O jsdom não mede layout; isso fica para a Validation/QA.
- A saída de teste no `TMPDIR` compartilhado foi sobrescrita por outra tarefa da onda. Passei a gravar no scratchpad da sessão.
- Propagado: nada. Nenhuma tarefa seguinte (04–09) afirma algo que esta mudou.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz › O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy, FSD/Alias); apps/backoffice/CLAUDE.md › Molde dos formulários · Descontos · O fornecedor da peça; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos:
  - filtro por campanha/percentual na cadeia do PostgREST: apps/backoffice/src/entities/product/api/useAdminProducts.test.ts ("o filtro pela campanha")
  - o recorte sobrevive na URL (e no chip e na visão salva): apps/backoffice/src/features/product-list/model/__tests__/campanhaNosFiltros.test.ts (+ queryUrl.test.ts)
  - página real: ?campanha=<id>&percentual=15 abre filtrada com o chip; a linha mostra o percentual: apps/backoffice/src/pages/admin/AdminProductsPage.campanha.test.tsx
  - edição em massa (campanha → 20% chama a porta com os ids; "Tirar da Black Friday" com null; percentuais da campanha): idem
  - quais campanhas o filtro e a linha mostram: apps/backoffice/src/features/product-list/model/__tests__/campanhaNaLinha.test.ts
  - probe da gravação em lote (AD-012) e CA-07 (preço intacto): .specs/work-items/102-desconto-de-campanha/probes/04-lista-de-produtos.sh
  - sem cobertura: CA-15 e "sem rolagem lateral em 390" (layout, jsdom não mede; fica para Validation/QA)
Verificações: vitest por arquivo, verde; suíte do backoffice 5350/304 exit 0; tsc do backoffice com os 7 herdados (ProposalStateBadge), nenhum novo; probe local 13 ok / 0 falhas; suíte da loja 5 falhas, todas da OffersPage em andamento na tarefa 06, nenhuma em arquivo desta tarefa; eslint só com os 3 `any` antigos de useAdminProducts.ts
Árvore de trabalho: productQuery.ts, useAdminProducts.ts(+test), queryUrl.ts(+test), filterChips.ts, campaignMarks.ts (novo), FilterChips.tsx, CampaignMarksCell.tsx (novo), bulkCampaign.ts (novo), BulkEditPanel.tsx, AdminProductsPage.tsx(+test, + AdminProductsPage.campanha.test.tsx novo), campanhaNosFiltros.test.ts e campanhaNaLinha.test.ts (novos), animacaoRespeitaMovimento.test.ts, probes/04-lista-de-produtos.sh (novo) — nada commitado
Citações conferidas: 6 abertas ao usar (productQuery.ts:39,56,73; useAdminProducts.ts:104; fornecedorNosFiltros.test.ts; BulkEditPanel.tsx; buildBulkPatch.ts; a porta da tarefa 01); nenhuma deslocada nem morta
```

## T03 — wi-impl-review · fixing · agente a818520cce40df28f

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/03-lista-de-produtos-e-edicao-em-massa.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | teste que não morde | atrapalha | apps/backoffice/src/pages/admin/AdminProductsPage.campanha.test.tsx (o último `it`, "a recusa da porta vira aviso, e nada é dado como gravado") | O título promete duas coisas e a asserção cobre só uma. Ela confere o toast destrutivo, mas não confere que o toast de sucesso ("2 peça(s) na Black Friday com 20%") ficou de fora, nem que `refetchMock`/`campaignsRefetchMock` não foram chamados. Se um mutante emitisse os dois toasts, ou relesse a lista como se tivesse gravado, o teste continuaria passando. | Classe da revisão: "asserção que passaria com o comportamento errado". O próprio título do teste diz que nada é dado como gravado. |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| UC-04 provado pela página real e pelo probe da gravação em lote | `AdminProductsPage.campanha.test.tsx` (filtro pelo endereço, chip, linha, edição em massa) e `probes/04-lista-de-produtos.sh` (13 `ok —`: upsert em lote, filtro `!inner`, count, embed, preço intacto, tirar) | sim (o passar é só execução) |
| cada comportamento do bloco `Testes` coberto por um teste escrito | ver a seção Testes | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- `animacaoRespeitaMovimento.test.ts`: entrou `features/product-list/ui/CampaignMarksCell.tsx`, o único arquivo de UI novo. O diff de `BulkEditPanel` não acrescenta classe `transition-*` nem `animate-*`. Aplicada.
- `buscaDeProdutoComDonoUnico.test.ts` continua verde: o filtro é `.eq` em `filtro_campanha.*`, sem filtro por nome. O código confere; o resultado verde é só execução.
- Sem rolagem lateral em 390 com o filtro novo: os dois `Select` seguem a forma `w-[180px]` dos filtros vizinhos. A medida em si é só execução, e é da Validation.

## Testes

- Hook/consulta, a cadeia de filtros no PostgREST: `useAdminProducts.test.ts`, no bloco "o filtro pela campanha". Confere o embed `filtro_campanha:product_campaigns!inner(...)`, os `eq` exatos (campanha, e campanha mais percentual), o percentual sem campanha produzindo o `LIST_SELECT` puro e zero `eq`, e `toListRow`. Morde.
- O recorte sobrevive na URL: `queryUrl.test.ts` (ida e volta com os dois campos) e `campanhaNosFiltros.test.ts` (`campaignProductsHref`, percentual ilegível, percentual sem campanha, visão salva antiga e nova). Morde.
- Página real, `?campanha=bf&percentual=15` abre filtrada com o chip, e a linha mostra o percentual: `AdminProductsPage.campanha.test.tsx`. Confere a consulta, o nome acessível do chip, os dois combobox, e "Black Friday · 15%" na `tr` certa, com a ausência na outra linha. Morde.
- Edição em massa: o mesmo arquivo. A campanha e 20% chegam a `setProductsCampaign(['p1','p2'],'bf',20)`; "Tirar da Black Friday" chega com `null`; as opções oferecidas são exatamente as da campanha (`Natal: 5%`, `Natal: 30%`, `Tirar da Natal`). Morde. O caso da recusa morde só em parte (achado 1).
- Probe da gravação em lote: `probes/04-lista-de-produtos.sh`. Ele refaz as mesmas chamadas HTTP da porta e do filtro e confere o preço antes e depois. A leitura confirma.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `campaignId`/`campaignPercent` em `ProductFilters`; na URL, `campanha`/`percentual` | sim | segue o molde de `supplierIds`; `readSavedViews` completa com `emptyFilters()`; bate com `campaignProductsHref` | sim. Nenhuma tarefa seguinte cita os campos (grep em `tasks/`). Testes antigos com literal de `ProductFilters` (`fornecedorNosFiltros`, `rowSummary.test`) não foram conferidos no tsc |
| 2 | Filtro por embed `!inner` com apelido e `eq`; embed de exibição no `LIST_SELECT` | sim | mesmo molde dos filtros de categoria e fornecedor; o probe prova o filtro contra o PostgREST | sim |
| 3 | Nome e vigência vindos de `useCampaigns` | sim | `useCampaigns` expõe `campaigns` e `refetch` (campaignRead.ts:26) | sim |
| 4 | A linha mostra só as marcações de campanhas abertas, mais a da campanha filtrada | sim | usa `campaignsOpenForMarking`, a régua do cadastro; a tarefa não exige mostrar as encerradas | sim |
| 5 | O seletor oferece agendadas e em vigência pela ordem do início; a campanha do endereço entra no fim | sim | é a decisão da tarefa, e a exceção cobre o "Ver as peças" de campanha encerrada | sim |
| 6 | A seção "Campanha" fica no `BulkEditPanel`; `onApply(result, campaign)`; a gravação vai por `setProductsCampaign` | sim | a tarefa manda usar a edição em massa existente e diz que ela "não é patch em products"; a porta não foi alterada (`git diff` vazio em `entities/campaign`) | sim. O único consumidor é a página (grep) |
| 7 | Rótulos "{nome}: X%" e "Tirar da {nome}" | sim | literal da tarefa | sim |
| 8 | Seção incompleta deixa "Aplicar" desligado | sim | coerente com o painel; o teste "sem o percentual escolhido" confere | sim |
| 9 | Depois de gravar, `refetch` da lista e das campanhas | sim | nada no arquivo de instruções exige `invalidateCampaigns` | sim |
| 10 | No guarda de movimento entrou só o arquivo novo | sim | a obrigação fala dos "arquivos de UI novos desta tarefa" | sim |

## Não conferido

- `.specs/work-items/102-desconto-de-campanha/probes/04-lista-de-produtos.sh` aparece como `??`, sem intent-to-add, porque o diretório `probes/` inteiro está fora do índice. Por isso foi julgado inteiro pelo escopo da tarefa, sem baseline. Afirmar que só o 04 é desta tarefa, e que os probes 01–03 não foram tocados por ela, depende da palavra do implementador.
- Typecheck: não rodei `tsc`. Testes existentes que montam literais de `ProductFilters` (`fornecedorNosFiltros.test.ts`, `rowSummary.test.ts`) podem acusar falta dos campos novos.
- Layout em 390/1440 e a fonte a 200 % (CA-15) são medida de navegador, da Validation.
- CA-07 nas demais superfícies (loja, feed): fora do recorte desta tarefa. O probe cobre só o preço no banco.
- Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (inteiro, no contexto; inclui O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy, Feature-Sliced Design / Alias de import); `apps/backoffice/CLAUDE.md` › Molde dos formulários · Descontos · O movimento do painel (feature 50).

## T03 — wi-impl-task · done · agente ae9cbf754c9966a3c

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/03-lista-de-produtos-e-edicao-em-massa.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 6 | A recusa da porta das marcações vira aviso, e nada é dado como gravado | frontend (página) | `apps/backoffice/src/pages/admin/AdminProductsPage.campanha.test.tsx` › "a recusa da porta vira aviso, e nada é dado como gravado" | sim | vermelho |

O teste é o do último `it`, que agora asserta também:
- `toastMock` chamado uma vez só;
- nenhum toast de sucesso ("2 peça(s) na Black Friday com 20%");
- `refetchMock` não chamado;
- `campaignsRefetchMock` não chamado.

Check de mutação: no `catch` de `AdminProductsPage.tsx`, injetei a releitura da lista e das campanhas e um toast de sucesso. O teste ficou vermelho. Restaurei pela cópia, conferi com `cmp` e o arquivo voltou ao verde.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

apps/backoffice/src/entities/product/api/productQuery.ts alterado
apps/backoffice/src/entities/product/api/useAdminProducts.ts alterado
apps/backoffice/src/entities/product/api/useAdminProducts.test.ts alterado
apps/backoffice/src/features/product-list/model/queryUrl.ts alterado
apps/backoffice/src/features/product-list/model/filterChips.ts alterado
apps/backoffice/src/features/product-list/model/campaignMarks.ts criado
apps/backoffice/src/features/product-list/model/__tests__/queryUrl.test.ts alterado
apps/backoffice/src/features/product-list/model/__tests__/campanhaNosFiltros.test.ts criado
apps/backoffice/src/features/product-list/model/__tests__/campanhaNaLinha.test.ts criado
apps/backoffice/src/features/product-list/ui/FilterChips.tsx alterado
apps/backoffice/src/features/product-list/ui/CampaignMarksCell.tsx criado
apps/backoffice/src/features/bulk-edit/model/bulkCampaign.ts criado
apps/backoffice/src/features/bulk-edit/ui/BulkEditPanel.tsx alterado
apps/backoffice/src/pages/admin/AdminProductsPage.tsx alterado
apps/backoffice/src/pages/admin/AdminProductsPage.test.tsx alterado
apps/backoffice/src/pages/admin/AdminProductsPage.campanha.test.tsx criado
apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts alterado
.specs/work-items/102-desconto-de-campanha/probes/04-lista-de-produtos.sh criado

A correção tocou só `AdminProductsPage.campanha.test.tsx`. `AdminProductsPage.tsx` foi mutado e restaurado byte a byte (`cmp`).

## Verificação

O comando de um arquivo vem do `PROJECT.md` (Comandos de verificação):

- `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminProductsPage.campanha.test.tsx --testTimeout=20000` → exit 0, 10/10.
- Com o mutante: exit 1, só o caso da recusa reprovou.
- Depois da restauração: exit 0, 10/10.

Tipos e suíte não foram rodados de novo: a correção só acrescentou asserções num arquivo de teste. Contra o `baseline`, a conferência de tipos segue como na implementação (os 7 erros herdados em `ProposalStateBadge.test.tsx`, nenhum novo).

Instruções lidas: as mesmas da implementação (`CLAUDE.md` raiz; `apps/backoffice/CLAUDE.md` › Molde dos formulários · Descontos · O fornecedor da peça; `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local).

## Divergências e descobertas

nada

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz › O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy, FSD/Alias); apps/backoffice/CLAUDE.md › Molde dos formulários · Descontos · O fornecedor da peça; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos:
  - filtro por campanha/percentual na cadeia do PostgREST: apps/backoffice/src/entities/product/api/useAdminProducts.test.ts ("o filtro pela campanha")
  - o recorte sobrevive na URL (e no chip e na visão salva): apps/backoffice/src/features/product-list/model/__tests__/campanhaNosFiltros.test.ts (+ queryUrl.test.ts)
  - página real: ?campanha=<id>&percentual=15 abre filtrada com o chip; a linha mostra o percentual: apps/backoffice/src/pages/admin/AdminProductsPage.campanha.test.tsx
  - edição em massa (campanha → 20% chama a porta com os ids; "Tirar da Black Friday" com null; percentuais da campanha; recusa da porta sem nada dado como gravado — sem toast de sucesso nem releitura): idem
  - quais campanhas o filtro e a linha mostram: apps/backoffice/src/features/product-list/model/__tests__/campanhaNaLinha.test.ts
  - probe da gravação em lote (AD-012) e CA-07 (preço intacto): .specs/work-items/102-desconto-de-campanha/probes/04-lista-de-produtos.sh
  - sem cobertura: CA-15 e "sem rolagem lateral em 390" (layout; jsdom não mede; fica para Validation/QA)
Verificações:
  - vitest por arquivo, verde
  - suíte do backoffice 5350/304, exit 0
  - tsc do backoffice: só os 7 herdados (ProposalStateBadge), nenhum novo
  - probe local: 13 ok, 0 falhas
  - suíte da loja: 5 falhas, todas da OffersPage em andamento na tarefa 06, nenhuma em arquivo desta tarefa
  - eslint: só os 3 `any` que já existiam em useAdminProducts.ts
  - correção da revisão: o caso da recusa endurecido, check de mutação vermelho, 10/10 verde
Árvore de trabalho: productQuery.ts, useAdminProducts.ts(+test), queryUrl.ts(+test), filterChips.ts, campaignMarks.ts (novo), FilterChips.tsx, CampaignMarksCell.tsx (novo), bulkCampaign.ts (novo), BulkEditPanel.tsx, AdminProductsPage.tsx(+test, + AdminProductsPage.campanha.test.tsx novo), campanhaNosFiltros.test.ts e campanhaNaLinha.test.ts (novos), animacaoRespeitaMovimento.test.ts, probes/04-lista-de-produtos.sh (novo) — nada commitado
Citações conferidas: 6 abertas ao usar (productQuery.ts:39,56,73; useAdminProducts.ts:104; fornecedorNosFiltros.test.ts; BulkEditPanel.tsx; buildBulkPatch.ts; a porta da tarefa 01); nenhuma deslocada nem morta
```

## T06 — wi-impl-task · review · agente af065013e302614fd

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/06-vitrine-ofertas.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | `/black-friday` entra em `LEGACY_REDIRECTS` e `vercel.json` sem rota no `App.tsx`. `APP_ROUTE_PATTERNS` passa a incluir só as legadas cujo primeiro segmento está em `ROUTE_SLUGS`. O espelho na SPA fica na `CategoryPage` (`legacyRedirectTo(pathname)` no modo não legado). No servidor, o ramo `category` de `servePage` devolve 301 antes de ler a árvore | `<Route path="/black-friday">` com `Navigate` | Uma rota no `App.tsx` exigiria `black-friday` em `ROUTE_SLUGS` (`reservedSlugs.test.ts` é bidirecional), e H-03 proíbe isso. Sem rota, `rotasDeApp` acusaria `/black-friday` como padrão órfão | `core/routes/routes.ts`, `core/page/serve.ts`, `CategoryPage.tsx`, `routes.test.ts` (o guarda "todo `from` reservado" ganhou essa exceção única e declarada), `classify.test.ts` |
| 2 | `/ofertas` é uma terceira classe de rota. Ela tem constante própria `OFFERS_PATH` em `core/routes`, fica em `ROUTE_SLUGS` e não fica em `SITEMAP_STATIC_PATHS` nem em `NON_INDEXABLE_PATHS`. `classifyPath` a classifica `{ kind: 'offers' }`, depois de app e de página fixa. Os guardas ganharam o conjunto "vitrine", escrito por extenso | Pôr `/ofertas` numa das duas listas | T6. Nas duas listas a indexação seria fixa, mas aqui ela depende da campanha | `classify.ts`, `rotasDeApp`, `sitemapRoutes`, `paginasFixasServidas`, `pageKind.ts` (`offers` passa a ser `lista`) |
| 3 | `offersPageMeta(campanha \| null)` mora em `core/seo/pages.ts` e chama `campaignShowcaseLine`. Com campanha: título com o nome, descrição com a linha da vitrine, indexável. Sem campanha: "Ofertas", "Não há ofertas agora na Uma Estrelinha. Conheça as coleções de joias afetivas.", noindex | Calcular a linha fora e passá-la pronta | Um dono só para o `<head>` do cliente e do servidor. Custo: o grafo Deno de `core/seo` sobe de 15 para 22 arquivos, e a âncora foi subida com a lista dos 7 novos | `core/seo`, `seo/__tests__/denoReach.test.ts`, tarefa 08 (se mexer no grafo de `core/seo`) |
| 4 | `servePage` sem campanha responde 200, `noindex`, sem canônica, `s-maxage=300`. Falha de leitura vira shell `no-store` | 404, ou `noindex` em caso de erro | A página existe e diz que não há ofertas. H-11 aceita a virada em até 5 min. A regra da casa é que erro não tira a página do índice | `core/page/serve.ts` |
| 5 | `PageDeps.readLiveCampaign` é novo e obrigatório. `server/page.ts` lê `campaigns` com `name,ends_at,campaign_percents(percent)` (`COLUNAS_CAMPANHA`), sem filtro de data: a vigência é a RLS. `SitemapDeps.readOffersLive` também é obrigatório, conta `campaigns` (`> 0`), e se falhar o sitemap inteiro dá 503 | Deixar os campos opcionais | A tipagem obriga todo `deps`. Sitemap parcial não pode parecer completo | `server/*`. A tarefa 08 também mexe em `serve.ts` e `server/page.ts` e precisa manter `readLiveCampaign` |
| 6 | As peças da vitrine vêm do hook novo `entities/product/api/useOfferProducts.ts`. É um embed aliased `oferta:product_campaigns!inner(campaign_id)` com `.eq('oferta.campaign_id', id)`, no molde do alias da categoria. Depois o hook filtra `p.campaign?.id === campaignId`. Peça marcada cujo "de/por" de hoje já é melhor que o desconto fica fora da vitrine | Listar toda peça marcada, ou mudar o mapeador (é da tarefa 04) | O mapeador só marca a peça quando a campanha baixa o preço, e a vitrine não anuncia desconto que a peça não tem | Página `/ofertas` e contagem dos chips |
| 7 | A `OffersPage` monta as mesmas peças da categoria (`useFilterUrlState`, `filterMatches`/`sortMatches`, `CategoryFiltersPanel`/`Sheet`, `useInfiniteWindow`, `ProductCard`), com o layout duplicado | Extrair um widget de listagem compartilhado com a `CategoryPage` | Refatorar a `CategoryPage` tem risco alto: vários guardas leem o fonte dela, como `fiacaoDaVitrine` e `filtroSemTag`. Fica para a revisão | `pages/OffersPage.tsx` (layout em duas cópias) |
| 8 | Os chips contam as peças da campanha antes dos filtros. Percentual que a campanha não oferece vale como "Todas". O chip escreve `?percentual=` com `replace`. O nome do parâmetro é o `CAMPAIGN_PERCENT_PARAM` de `@estrelinha/core/home`, da tarefa 07 | Declarar uma segunda constante | Um dono para o parâmetro | `OffersPage.tsx` depende de o nome exportado pela 07 continuar o mesmo |
| 9 | Textos do estado vazio que eu escrevi: título "Não há ofertas agora", texto "Quando houver uma campanha de desconto, as peças dela aparecem aqui. Enquanto isso, as coleções estão todas abertas para você conhecer.", botão "Ver as coleções" levando a `/` (a Home lista as coleções). Erro: "Não foi possível carregar as ofertas." com "Tentar de novo" | Copiar o texto literal de spec.md | A regra 5 proíbe abrir a costura, e não existe rota de índice de coleções | Texto da página, a conferir com spec.md na revisão |
| 10 | Os chips de percentual usam `rounded-pill` (rótulo que alterna estado), com entrada justificada na allowlist de `buttonShape.test.ts`. As ações usam `rounded-sm` | Chip em `rounded-sm` | Mesma linguagem dos chips de filtro da categoria | `buttonShape.test.ts` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `classifyPath('/ofertas')` é `offers`, e `/black-friday` continua categoria | domínio | `packages/core/src/page/__tests__/classify.test.ts` | sim | — |
| 2 | `offersPageMeta` com campanha, com "Dia das Mães" e sem campanha (noindex), sem tom de urgência | domínio | `packages/core/src/seo/__tests__/seo.test.ts` | sim | — |
| 3 | `servePage` com campanha monta título, descrição, canônica e 300 s; sem campanha põe noindex; leitura falhando dá `no-store`; `/black-friday` dá 301 | domínio | `packages/core/src/page/__tests__/serve.test.ts` | sim | `vermelho` nos 3 casos que passaram de primeira (não lê produto, origem não absoluta, categoria de um segmento) |
| 4 | Sitemap: `/ofertas` só com campanha em vigência; falha dá 503 | domínio | `packages/core/src/sitemap/__tests__/serve.test.ts` | sim | `vermelho` no caso "sem campanha não entra" |
| 5 | `pageKind`: `/ofertas` e `/black-friday` são `lista` | domínio | `packages/core/src/routes/__tests__/pageKind.test.ts` | sim | — |
| 6 | Leituras do servidor (`readLiveCampaign`, `readOffersLive`) e o handler em `/ofertas`, `/black-friday` e `/sitemap.xml` | aplicação | `apps/store/server/__tests__/page.test.ts`, `sitemap.test.ts` | sim | — (o caso `/black-friday` do handler já passava pelo core, vermelho visto em serve.test) |
| 7 | Guardas de rota com a âncora nova: core `routes` 21/24/5, `rotasDeApp` 28/16, `sitemapRoutes` 28, `paginasFixasServidas` 28, `routeSplitting` 21, `metaPorRota` 21, `vercelRedirects` 5, `seo` 18 (sem mudança), `reservedSlugs` (sem âncora numérica, verde) | guarda | os respectivos arquivos | sim | — |
| 8 | `/black-friday` na SPA leva a `/ofertas` | frontend | `apps/store/src/pages/__tests__/CategoryPage.test.tsx` | sim | — |
| 9 | Página real: lista exatamente as peças marcadas que a campanha baixa; chips com contagem; `?percentual=15` filtra; clique no chip escreve a URL; percentual inválido vale "Todas"; selo nos cartões; "Dia das Mães"; sem campanha, estado vazio com link e noindex | frontend | `apps/store/src/pages/__tests__/OffersPage.test.tsx` | sim | `vermelho` com três mutações: sem o filtro do hook, sem o recorte por percentual, com outro id de campanha |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

packages/core/src/routes/routes.ts alterado
packages/core/src/routes/pageKind.ts alterado
packages/core/src/routes/__tests__/routes.test.ts alterado
packages/core/src/routes/__tests__/pageKind.test.ts alterado
packages/core/src/page/classify.ts alterado
packages/core/src/page/serve.ts alterado
packages/core/src/page/__tests__/classify.test.ts alterado
packages/core/src/page/__tests__/serve.test.ts alterado
packages/core/src/page/__tests__/productHead.test.ts alterado
packages/core/src/seo/pages.ts alterado
packages/core/src/seo/__tests__/seo.test.ts alterado
packages/core/src/seo/__tests__/denoReach.test.ts alterado
packages/core/src/sitemap/serve.ts alterado
packages/core/src/sitemap/urls.ts alterado
packages/core/src/sitemap/__tests__/serve.test.ts alterado
apps/store/server/page.ts alterado
apps/store/server/sitemap.ts alterado
apps/store/server/__tests__/page.test.ts alterado
apps/store/server/__tests__/sitemap.test.ts alterado
apps/store/vercel.json alterado
apps/store/src/app/App.tsx alterado
apps/store/src/app/__tests__/rotasDeApp.test.ts alterado
apps/store/src/app/__tests__/sitemapRoutes.test.ts alterado
apps/store/src/app/__tests__/routeSplitting.test.ts alterado
apps/store/src/app/__tests__/paginasFixasServidas.test.ts alterado
apps/store/src/pages/OffersPage.tsx criado
apps/store/src/pages/__tests__/OffersPage.test.tsx criado
apps/store/src/pages/CategoryPage.tsx alterado
apps/store/src/pages/__tests__/CategoryPage.test.tsx alterado
apps/store/src/pages/__tests__/metaPorRota.test.ts alterado
apps/store/src/entities/product/api/useOfferProducts.ts criado
apps/store/src/shared/lib/__tests__/vercelRedirects.test.ts alterado
apps/store/src/shared/ui/__tests__/buttonShape.test.ts alterado
apps/store/CLAUDE.md alterado

## Verificação

- Tipos store: `npx tsc --noEmit -p apps/store/tsconfig.app.json` (fonte: CLAUDE.md §Comandos). 0 erros, igual ao baseline (0).
- Tipos servidor da loja: `npx tsc --noEmit -p apps/store/tsconfig.server.json` (fonte: CLAUDE.md §Baselines). 0 erros, baseline 0. Um TS2741 que eu introduzi num `deps` de teste foi corrigido.
- Tipos core: `npx tsc --noEmit -p packages/core/tsconfig.json` (fonte: CLAUDE.md §Comandos). 11 erros, os mesmos do baseline, por arquivo e código. Um TS2322 que eu introduzi em `productHead.test.ts` foi corrigido.
- Um arquivo de teste por fatia: `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (fonte: PROJECT.md › Comandos de verificação). Todos verdes.
- Suíte core: `pnpm --filter @estrelinha/core test --testTimeout=20000` (fonte: CLAUDE.md §Baselines). 5829/245, exit 0.
- Suíte store: `pnpm --filter @estrelinha/store test --testTimeout=20000` (fonte: CLAUDE.md §Baselines). 7355 passaram, 4 falharam em 2 arquivos: `entities/cart/api/__tests__/useCartBuyTogether.test.tsx` (3) e `pages/__tests__/CheckoutPage.test.tsx` (1, o bump). São arquivos da tarefa 05, que está rodando em paralelo e tem alterações sem commit em `entities/cart` e `features/checkout`. Não toquei neles. Todos os arquivos que eu alterei passam.
- Backoffice, só os testes que leem as constantes de rota/seo que eu mudei: `CategoryFormDialog`, `CategoryInspector` e `useAdminFilterCatalog`. 72/72, exit 0.
- Lint dos arquivos novos e alterados da loja: `eslint` saiu com exit 0.

Instruções lidas: CLAUDE.md (raiz), por seção: › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import. apps/store/CLAUDE.md › Endereçamento · O `<title>` e a descrição de cada rota · O HTML servido (`api/page`) · Sitemap · A listagem de categoria · Os filtros curados · Os filtros enxergam as variações. packages/core/CLAUDE.md › Os módulos. .specs/project/PROJECT.md › Comandos de verificação.

## Divergências e descobertas

- **A tarefa manda "copiar spec.md › Design" e o procedimento proíbe abrir a costura (regra 5).** Segui o procedimento. O texto do estado vazio e do erro foi decidido por mim (premissa 9); a revisão deve conferir contra a spec.
- **Conflito H-03 × guardas de rota.** O guarda core "todo `from` de LEGACY começa por um segmento em ROUTE_SLUGS" e o `rotasDeApp` (legadas ⊂ `APP_ROUTE_PATTERNS` ⊂ rotas do `App.tsx`) não admitiam um redirect sem rota reservada. Resolvido com a exceção declarada `/black-friday` e a filtragem de `APP_ROUTE_PATTERNS` (premissa 1). `classify.test` também foi ajustado à composição nova.
- **Dois donos de `/ofertas`.** A tarefa 07 (em paralelo) declarou `CAMPAIGN_OFFERS_PATH = '/ofertas'` em `packages/core/src/home/campaignOffers.ts`. O dono do endereço passa a ser `OFFERS_PATH` em `core/routes`. Não editei: `core/home` é da 07. Sugestão para a revisão: a 07 reexporta `OFFERS_PATH`.
- **Possível defeito da tarefa 04, não meu.** A policy `campaigns_admin_write` é `for all to authenticated` com `has_role admin`. Uma admin logada na loja recebe todas as campanhas, inclusive agendadas e encerradas, e `toLiveCampaign` devolve a primeira linha. O mesmo vale para o embed `product_campaigns` no mapeador. Quem é admin pode ver na loja uma campanha que não está valendo. O servidor (`api/page`) usa a chave publicável sem sessão e não tem o problema.
- **Âncora Deno de `core/seo` subiu de 15 para 22** pela importação de `core/campaigns/text.ts` (premissa 3). A âncora antiga ganhou uma vizinha que lista os 7 arquivos novos.
- Linhas citadas em "Siga a forma de" (`serve.ts:117`, `classify.ts:66-89`, `routes.ts:…`) conferidas e relocalizadas pelo alvo nomeado. Nenhuma citação morta.
- Fora do bloco Testes, mas no contrato e na política: `pageKind` (presença) passou a classificar `/ofertas` e `/black-friday` como `lista`. Antes, `/black-friday` era `lista` como categoria e cairia em `outra`.
- CA-15 (layout em 390/1440, fonte a 200 %) não foi provado aqui: jsdom não mede layout, e a prova é da Validation/QA.
- Comportamento que só a execução provaria e ficou sem ela: a RLS de `campaigns` e `product_campaigns` filtrando por `now()`, e o embed aliased `!inner` com `.eq('oferta.campaign_id')`. Os dois foram provados só contra dublê, sem probe no banco local; a fila não pede probe nesta tarefa.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 06
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; apps/store/CLAUDE.md › Endereçamento · O <title> de cada rota · O HTML servido (api/page) · Sitemap · A listagem de categoria / os filtros; packages/core/CLAUDE.md › Os módulos; .specs/project/PROJECT.md › Comandos de verificação
Testes escritos: core/page — classify.test.ts (`/ofertas` é offers; `/black-friday` é categoria) e serve.test.ts (com campanha: título, descrição, canônica e 300 s; sem campanha: noindex; leitura falha: no-store; `/black-friday` dá 301). Sitemap — core/sitemap/__tests__/serve.test.ts e apps/store/server/__tests__/sitemap.test.ts (`/ofertas` só com campanha; falha dá 503). Rotas — guardas atualizados para o número verdadeiro: core routes.test (21/24/5 e a exceção `/black-friday`), rotasDeApp 28/16, sitemapRoutes 28, paginasFixasServidas 28 e o tipo offers, routeSplitting 21, metaPorRota 21, vercelRedirects 5 com `/black-friday → /ofertas`; seo 18 e reservedSlugs sem mudança de âncora; CategoryPage.test (espelho na SPA). Página real — OffersPage.test.tsx (peças marcadas que a campanha baixa, chips com contagem, `?percentual=15`, clique no chip, estado vazio com link, "Dia das Mães" no título e no selo). Extra: offersPageMeta (seo.test) e pageKind. Sem cobertura: CA-15 (layout real, é da Validation).
Verificações: tsc store 0 (= baseline), tsc server 0 (= baseline), tsc core 11 (= baseline); suíte core 5829/245 verde; suíte store 7355 verdes e 4 vermelhos em arquivos da tarefa 05 (useCartBuyTogether, CheckoutPage bump), em andamento em paralelo, sem relação com esta tarefa; backoffice 72/72 nos testes que leem as constantes alteradas; eslint dos arquivos novos 0
Árvore de trabalho: os 34 arquivos listados em "Arquivos alterados" (3 criados: OffersPage.tsx, OffersPage.test.tsx, useOfferProducts.ts); nada commitado
Citações conferidas: 6 abertas ao usar (serve.ts ramo de produto, classify.ts classifyPath, routes.ts nos trechos citados, staticPageMeta/usePageMeta, CategoryPage, features/category-filters); as linhas de routes.ts e serve.ts deslocaram e foram relocalizadas pelo alvo; nenhuma morta
Caducou: nenhuma
```

## T07 — wi-impl-task · review · agente a5168c591d24c28b7

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/07-bloco-joias-em-oferta-na-home.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O tipo novo se chama `campaign_offers`, com o rótulo "Joias em oferta" | um nome com "black_friday" ou "ofertas" | o identificador é coluna e não pode carregar o nome de uma campanha (CA-12); o que a dona lê é o rótulo | o `check` do banco, `HOME_SECTION_TYPES`, os dois registros (loja e painel) e os guardas que listam os tipos |
| 2 | O tipo é único também no banco: a migration derruba e recria o índice único parcial com ele, além do `check` | deixar a unicidade só no TypeScript | `UNIQUE_SECTION_TYPES` é o par do índice (`homeSections.test.ts` compara os dois) | a migration `20261130140000`; o `homeSections.test.ts` agora lê o índice e o `check` dessa migration |
| 3 | O rótulo pequeno acima do título é o `badge_text` e o título h2 é o `name` da campanha | o mesmo texto nos dois | a tarefa diz "rótulo e título vindos da campanha"; com CA-12 ("DIA DAS MÃES" e "Dia das Mães") os dois aparecem | só o widget |
| 4 | Tons dos cartões, repetindo nessa ordem: `primary`/`on-primary`, `ink`/`on-primary`, `ground-deep`/`ink` | as cores da campanha (`band_color`/`accent_color`) | H-09 manda usar a paleta da loja; não tenho o protótipo, então escolhi pares de contraste AA já existentes | só o widget; a QA pode pedir outros tons |
| 5 | A fileira são 4 peças no `ProductCarousel` (forma `row`, tom `surface`). O "Ver todas" é o link do próprio carrossel, que só aparece a partir de `md` | um cabeçalho próprio com o link sempre visível | o carrossel é o dono das vagas e do esqueleto; no celular os cartões de percentual já levam à vitrine | widget; a QA em 390 pode querer o "Ver todas" no celular |
| 6 | Enquanto a campanha carrega, ou se a leitura dela falha, o bloco não desenha nada (não reserva espaço) | reservar a altura do bloco | reservar afirmaria uma campanha que a loja ainda não sabe se existe (mesma régua do `HomeSkeleton`) | possível deslocamento de layout (CLS) quando o bloco aparece; medir em navegador |
| 7 | A consulta das peças reaproveita `PRODUCT_CARD_SELECT_BY_CAMPAIGN` e `CAMPAIGN_FILTER_COLUMN` da tarefa 06 (`entities/product/api/useOfferProducts.ts`) por import profundo, com o limite de 4 e a mesma régua `campaign.id === campaignId` | escrever um segundo `select` com o mesmo alias `!inner` (minha primeira versão fazia isso) | escrito duas vezes, "quais peças estão em oferta" teria dois donos | depende de um arquivo da tarefa 06 ainda em andamento: se ela renomear algo, o `tsc` da loja quebra |
| 8 | `CAMPAIGN_PERCENT_PARAM` (`percentual`) e `campaignOffersHref` ficam em `core/home/campaignOffers.ts`, e `CAMPAIGN_OFFERS_PATH` passa a ser `OFFERS_PATH` de `core/routes` | um literal `/ofertas` próprio | o endereço já tem dono em `core/routes` (tarefa 06); a `OffersPage` da 06 já importa o meu `CAMPAIGN_PERCENT_PARAM` | `core/home` passou a importar `core/routes/routes.ts`; a vitrine (06) lê o parâmetro por esta constante |
| 9 | O editor do painel não tem campo nem recusa: um cartão diz de onde vem o conteúdo e tem um link para `/admin/campanhas` | o cartão genérico "ainda não tem campos" | H-10 proíbe campos de configuração; o cartão genérico pareceria tela por fazer | só o painel |
| 10 | Tirei duas guardas que o check de mutação mostrou serem equivalentes (`isLoading`/`isError` da campanha, e o `!pecas.isError` da fileira) | manter código que nenhum teste distingue | `data` é `undefined` nos dois casos, e o `ProductCarousel` já não desenha nada com lista vazia | se uma releitura da campanha falhar com dado antigo em cache, o bloco segue mostrando esse dado |
| 11 | O resumo da linha do bloco no painel diz "o título e os percentuais vêm da campanha em vigência" | cair no padrão "automático" | o bloco não tem curadoria nem derivação | só o painel |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Catálogo com o tipo novo (âncora de 11 para 12), rótulo "Joias em oferta", único, frases e endereços do bloco | domínio | `packages/core/src/home/__tests__/catalog.test.ts`, `packages/core/src/home/__tests__/campaignOffers.test.ts` | sim | vermelho (dois mutantes em `campaignOffers.ts`: ordem dos percentuais e nome acessível; tirar `campaign_offers` de `UNIQUE_SECTION_TYPES` derruba o teste de unicidade da bandeja) |
| 2 | O `check` vigente é o da migration nova, com todos os tipos; índice único com o tipo; nenhum tipo de contagem regressiva; a migration não escreve dado | guarda de fonte (lê o `.sql`) | `apps/store/src/shared/lib/__tests__/homeSections.test.ts` | sim | vermelho (tirar `campaign_offers` do índice na migration) |
| 3 | Widget: sem campanha, nada; com 3 percentuais, 3 cartões com `/ofertas?percentual=<p>`; com 1 e com 5; "Dia das Mães" mostra o nome e o selo dela; tom sem escassez; a fileira usa a campanha do título | componente | `apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx` | sim | vermelho (href sem percentual, nome fixo); dois mutantes ficaram verdes por serem equivalentes e as guardas foram tiradas (decisão 10) |
| 4 | A consulta da fileira: tabela, `select`, filtro pela campanha, limite 4, só peças cujo preço a campanha baixa, desligada sem campanha, falha é falha | aplicação (com o client dublado) | `apps/store/src/widgets/campaign-offers/model/__tests__/useCampaignOfferProducts.test.tsx` | sim | vermelho (3 mutantes: coluna do filtro, filtro de campanha, `enabled`) |
| 5 | `HomeRenderer` exige componente para o tipo e desenha o bloco só com campanha em vigência | componente | `apps/store/src/widgets/home-renderer/ui/__tests__/HomeRenderer.test.tsx` | sim | vermelho (renderer trocado por `null`: 2 casos falham) |
| 6 | A bandeja do painel oferece o bloco (12 tipos) e o recusa quando já está na Home; o editor não tem campo e aponta para Campanhas | componente | `apps/backoffice/src/features/home-composition/ui/HomeBlockTray.test.tsx`, `apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.test.tsx` | sim | vermelho (unicidade; link do editor trocado) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

packages/core/src/home/types.ts alterado
packages/core/src/home/catalog.ts alterado
packages/core/src/home/resolve.ts alterado
packages/core/src/home/index.ts alterado
packages/core/src/home/campaignOffers.ts criado
packages/core/src/home/__tests__/catalog.test.ts alterado
packages/core/src/home/__tests__/campaignOffers.test.ts criado
supabase/migrations/20261130140000_102-joias-em-oferta-na-home.sql criado
apps/store/src/shared/lib/__tests__/homeSections.test.ts alterado
apps/store/src/widgets/campaign-offers/index.ts criado
apps/store/src/widgets/campaign-offers/model/useCampaignOfferProducts.ts criado
apps/store/src/widgets/campaign-offers/model/__tests__/useCampaignOfferProducts.test.tsx criado
apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx criado
apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx criado
apps/store/src/widgets/home-renderer/ui/sectionRenderers.tsx alterado
apps/store/src/widgets/home-renderer/ui/__tests__/HomeRenderer.test.tsx alterado
apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx criado
apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.test.tsx criado
apps/backoffice/src/features/home-composition/ui/sectionEditors.tsx alterado
apps/backoffice/src/features/home-composition/ui/HomeSectionRow.tsx alterado
apps/backoffice/src/features/home-composition/ui/HomeBlockTray.test.tsx alterado

## Verificação

- Um arquivo de teste por fatia — `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (fonte: `PROJECT.md`): todos verdes no fim, depois da limpeza de identificadores. Loja: 128 casos (widget, renderer e `homeSections`). Core: 336 (`src/home`). Painel: 425 (`features/home-composition`, inclusive `previaUnica` e `toNewItems`).
- Tipos — `npx tsc --noEmit -p …` (fonte: `CLAUDE.md` › Comandos):
  - loja: **0**;
  - painel: **7**, todos em `ProposalStateBadge.test.tsx`, iguais à baseline (o 8º erro, que era meu, foi corrigido);
  - core: **11**, iguais à baseline (o 12º, em `productHead.test.ts`, era da tarefa 06 em andamento e já sumiu na última medição);
  - mobile-adm: **0**.
- Lint nos arquivos que toquei — `npx eslint` (fonte: `CLAUDE.md` › Baselines): sem nada.
- Verificação mínima — a suíte inteira de cada workspace tocado (fonte: `CLAUDE.md` › Baselines). As três rodaram antes da última troca, que reaproveitou o `select` da 06 e tirou identificadores; depois dela rodei de novo só os arquivos tocados.
  - core: exit 0, 5828/245;
  - painel: exit 0, 5351/305;
  - loja: **exit 1**, 9 falhas em 6 arquivos, e nenhum é meu. São trabalho em andamento das tarefas 05 e 06: `paginasFixasServidas`, `routeSplitting`, `useCartBuyTogether`, `buildOrderPayload`, `chavesDoItemDoPedido`, e `buttonShape`, que acusa `pages/OffersPage.tsx:199` (da 06). Os guardas de toque, contraste, ouro e marca passaram com o widget novo.
- Migration: `supabase migration up --local` (fonte: `PROJECT.md` › Ambiente local) aplicou `20261130140000`. Conferido no banco o `check` com 12 tipos e o índice com 7.
- Probes no banco local, com limpeza:
  - transação desfeita: o segundo `campaign_offers` é recusado pelo índice único, e um tipo `countdown` é recusado pelo `check`;
  - REST com chave pública: campanha de prova criada, 2 peças marcadas, a consulta com alias `oferta:product_campaigns!inner` devolveu as 2 com o embed completo; depois a campanha foi apagada e o banco ficou com 0 campanhas e 0 marcações.

Instruções lidas:
- `CLAUDE.md` (raiz, no contexto);
- `apps/store/CLAUDE.md` › Design system · Mobile · A home não salta enquanto carrega · Banner principal · A Home é dado · Produtos em destaque · `ProductCarousel` tem TRÊS formas · Modo prévia;
- `apps/backoffice/CLAUDE.md` › `/admin/home` · O editor de "Produtos em destaque" · O editor da "Lista de categorias" · O movimento do painel · A ponte da prévia;
- `packages/core/CLAUDE.md` › Quando um código pertence · Pureza · Os módulos · `home`;
- `supabase/CLAUDE.md` › Migrations · RLS;
- `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- **Ordem do ciclo:** li o `tdd` só no fim, não antes da primeira fatia. Também escrevi a implementação antes dos testes na maioria das fatias. Por isso o vermelho foi provado pelo check de mutação em todas elas, com restauração pela cópia e conferida com `cmp`, e não pelo ciclo vermelho → verde.
- **Mutantes equivalentes no widget:** dois mutantes ficaram verdes — a guarda de `isLoading`/`isError` da campanha e o `!pecas.isError` da fileira. Os dois eram equivalentes e as guardas foram tiradas (decisão 10).
- **Identificadores de processo:** eu tinha escrito UC-07, H-10, CA-12, RN-14 e "WI 102" em nomes de teste e comentários. Tirei todos. Sobra só o nome do arquivo da migration, que é a convenção declarada (H-12).
- **Migration fora de ordem:** apliquei a minha (`…140000`) no banco local antes de existir a da tarefa 05 (`20261130130000_102-campanha-no-pedido.sql`). Ela tem prefixo anterior ao meu, então quem for aplicá-la no local deve precisar de `supabase migration up --local --include-all`.
- **Citações que não batiam:**
  - `homeSections.test.ts:46-62,150-171` deslocou: relocalizei pelos alvos (bloco `MIGRATION_41` e parsers/âncoras);
  - `catalog.ts:11-22,36,99-105` conferiu;
  - `featured.ts` e `ProductCarousel` existem;
  - o exemplar da migration 41 está no disco.
- **Depende de 01 e 04:** conferido — `core/campaigns` (`percentList`, `sortedPercents`) e `entities/campaign` (`useLiveCampaign`, `LiveCampaign`), e o `mapDbToProduct` com `Product.campaign`.
- **Escopo do guarda de movimento:** o painel não ganhou arquivo de UI com transição; `CampaignOffersEditor.tsx` não tem nenhuma. O único movimento novo está na loja (cartões de percentual) e tem o par `motion-reduce:transition-none` na mesma linha; o escopo literal de `animacaoRespeitaMovimento` não precisou mudar e não foi tocado.
- **Dependência da tarefa 06:** o bloco usa o `select` e a coluna de filtro de `useOfferProducts.ts` (arquivo dela, ainda em andamento). A `OffersPage` da 06 já importa o meu `CAMPAIGN_PERCENT_PARAM`. Se a 06 renomear `PRODUCT_CARD_SELECT_BY_CAMPAIGN` ou `CAMPAIGN_FILTER_COLUMN`, o `tsc` da loja acusa.
- **Ficou sem prova em navegador:** CA-15 (390 e 1440, fonte a 200 %), o deslocamento de layout quando o bloco aparece, e o "Ver todas" ausente no celular (decisões 5 e 6). jsdom não mede layout; isso é da Validation/QA.
- **Propagação:** não foi preciso. As tarefas 08 e 09 não afirmam nada sobre o bloco da Home.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 07
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/store/CLAUDE.md › Design system · Mobile · A home não salta · Banner principal · A Home é dado · Produtos em destaque · ProductCarousel · Modo prévia; apps/backoffice/CLAUDE.md › /admin/home · editores de Produtos em destaque e Lista de categorias · O movimento do painel · A ponte da prévia; packages/core/CLAUDE.md › Quando um código pertence · Pureza · Os módulos · home; supabase/CLAUDE.md › Migrations · RLS; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos:
  - catálogo com o tipo novo e o rótulo: packages/core/src/home/__tests__/catalog.test.ts (âncoras 11→12 e 6→7, rótulo, único) e packages/core/src/home/__tests__/campaignOffers.test.ts
  - check vigente da migration nova com todos os tipos, sem contagem regressiva: apps/store/src/shared/lib/__tests__/homeSections.test.ts
  - widget (sem campanha, nada; 3 cartões com /ofertas?percentual=<p>; 1 e 5; "Dia das Mães"): apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx, mais a consulta em model/__tests__/useCampaignOfferProducts.test.tsx
  - HomeRenderer exige componente para o tipo: apps/store/src/widgets/home-renderer/ui/__tests__/HomeRenderer.test.tsx
  - a bandeja oferece o bloco: apps/backoffice/src/features/home-composition/ui/HomeBlockTray.test.tsx, mais o editor em CampaignOffersEditor.test.tsx
  - sem cobertura: CA-15 (390/1440, fonte a 200 %), porque jsdom não mede layout; fica para a Validation/QA
Verificações:
  - testes dos arquivos tocados: verdes (loja 128, core 336, painel 425)
  - suítes inteiras: core 5828/245 exit 0; painel 5351/305 exit 0; loja exit 1 com 9 falhas em 6 arquivos que são das tarefas 05 e 06 em andamento (nenhum meu)
  - tipos: loja 0; painel 7 (baseline); core 11 (baseline); mobile-adm 0
  - eslint nos arquivos tocados: limpo
  - migration aplicada no banco local; probes de unicidade, de check e de REST (positivo, com limpeza)
Árvore de trabalho: os 21 arquivos da lista "Arquivos alterados" acima; nada commitado
Citações conferidas: 7 abertas ao usar; homeSections.test.ts:46-62,150-171 deslocou e foi relocalizada pelos alvos; nenhuma morta
Caducou: nada
```

## T06 — wi-impl-review · fixing · agente a9005395f07568ecd

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/06-vitrine-ofertas.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | premissa derrubada | atrapalha | apps/store/src/pages/OffersPage.tsx:148-165 | O estado sem campanha usa um texto que o implementador escreveu ("Quando houver uma campanha de desconto, as peças dela aparecem aqui. Enquanto isso, as coleções estão todas abertas para você conhecer.") e não tem a trilha. A premissa 9 diz que a spec não podia ser aberta, mas a própria tarefa manda copiá-la. | Tarefa › Design: "Copie spec.md › Design › "Vitrine `/ofertas`" — é a fonte. […] sem campanha, "Não há ofertas agora" com o texto e o botão "Ver as coleções" literais". spec.md:103-104: "Sem campanha: trilha "Início › Ofertas", caixa "Não há ofertas agora", texto "Quando houver uma campanha com peças em oferta, elas aparecem aqui. Enquanto isso, as coleções da loja continuam abertas.", botão "Ver as coleções"." |
| 2 | critério descoberto | atrapalha | apps/store/src/pages/OffersPage.tsx:223 | O título sai com `text-[32px] … md:text-[48px]`, ou seja, 32 px no celular e 48 px a partir de 768. | spec.md:98 (a fonte que a tarefa manda copiar): "título = nome (28 px celular, 44 px a partir de 1024)" |
| 3 | critério descoberto | atrapalha | apps/store/src/pages/OffersPage.tsx:232-241 e :312-328 | No `md`, os chips de percentual ficam numa linha própria, acima. A ordenação fica noutra linha, dentro da coluna da grade. | spec.md:101-102: "A partir de 768 px chips e ordenação numa linha." |
| 4 | teste que não morde | atrapalha | apps/store/src/pages/__tests__/OffersPage.test.tsx:74-90 | As duas campanhas da fixtura têm `badge_text` igual ao `name` ('Black Friday'/'Dia das Mães'). Se o `h1`, a trilha ou o título usassem `badge_text` no lugar de `name`, os casos de título continuariam verdes. CA-12 exige distinguir os dois. | Tarefa › CA-12: "Uma campanha com outro nome ("Dia das Mães", texto do selo "DIA DAS MÃES") mostra esse texto no selo, na vitrine…"; bloco Testes: "com "Dia das Mães", título e selo da campanha" |
| 5 | convenção violada | atrapalha | apps/store/src/pages/OffersPage.tsx:10-12 | O código novo importa de caminho profundo (`@/entities/product/api/useOfferProducts`, `@/entities/product/ui/ProductCard`, `…/ProductCardSkeleton`), e o hook novo não entrou no barrel do slice. | CLAUDE.md (raiz) › Feature-Sliced Design: "Cada slice tem um barrel `index.ts` (public API). **Novo código deve importar do slice** (`@/entities/product`) e não de caminhos profundos." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| CA-09 provado (só as peças marcadas e ativas da campanha em vigência, chips com contagem; sem campanha: diz que não há ofertas, `noindex`, fora do sitemap) | `useOfferProducts.ts:18-43` (embed `!inner` + filtro por `campaign.id`); `OffersPage.tsx:84-96,148-166,238-239`; `offersPageMeta` (seo/pages.ts); `servirOfertas` (page/serve.ts); `sitemap/urls.ts` (`offers`), `sitemap/serve.ts` (`readOffersLive`); testes em OffersPage.test.tsx, serve.test.ts (page e sitemap), server/__tests__/page.test.ts e sitemap.test.ts | sim. O texto do vazio diverge do design (achado 1) |
| Redirect de `/black-friday` provado | `routes.ts` LEGACY_REDIRECTS; `vercel.json`; ramo `category` em `serve.ts`; espelho em `CategoryPage.tsx:196-200`; testes em routes.test, vercelRedirects, serve.test, page.test, CategoryPage.test | sim |
| UC-06 pela página real e por `servePage` | OffersPage.test.tsx (página real, com o dublê só do client); serve.test.ts `servePage — a vitrine da campanha` | em parte: título, chips e grade sim; tamanhos e layout do design divergem (achados 2 e 3) |
| Cada comportamento do bloco `Testes` coberto por teste escrito | ver seção Testes | sim. Achado 4 é sobre a força de uma asserção |
| Testes dos arquivos alterados passando | — | só execução |
| Verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- Âncoras subidas para o número verdadeiro: `metaPorRota` 20→21, `rotasDeApp` 27→28 (as 16 de app ficaram), `sitemapRoutes` 27→28, `paginasFixasServidas` 27→28 (com `offers` no conjunto de tipos), `routeSplitting` 20→21, `vercelRedirects` 4→5, `routes` 20→21 e 23→24. A âncora `seo` não muda, porque `/ofertas` não está em nenhuma das duas listas. `denoReach` de `core/seo` foi de 15→22, com os 7 nomes. Aplicada.
- `usePageMeta(` na página nova: OffersPage.tsx:74. Aplicada.
- `server/__tests__/page.test.ts` não nomeia a chave de serviço (grep vazio). Aplicada.
- Exclusividade de edição de `core/page/*`, `server/*`, `core/routes/*`, `App.tsx` e `apps/store/CLAUDE.md`: só confiro que esta tarefa os editou. A exceção ao AD-014 está registrada em apps/store/CLAUDE.md › Endereçamento (H-02). Aplicada.

## Testes

- `core/page`: `classifyPath('/ofertas')` → `offers`, em classify.test.ts. `servePage` com campanha (título, og:title, descrição, canônica, `s-maxage=300`) e sem campanha (`noindex` no HTML, sem canônica), em serve.test.ts:1034-1098. Morde.
- Sitemap: `/ofertas` só com campanha, e falha ⇒ 503. Está em sitemap/__tests__/serve.test.ts:512-537 e em server/__tests__/sitemap.test.ts (contagem com `head`, XML servido com e sem). Morde.
- Guardas de rotas: routes, rotasDeApp, sitemapRoutes, paginasFixasServidas, routeSplitting, metaPorRota e vercelRedirects atualizados, cada um com asserção nova de presença ou ausência de `/ofertas`. `/black-friday` → `/ofertas` em routes.test, vercelRedirects, serve.test, page.test e CategoryPage.test. Morde. A exceção em "todo `from` reservado" vem declarada e acompanhada de duas asserções novas, não é afrouxamento.
- Página real: peças exatas e filtro `oferta.campaign_id` registrado pelo dublê; chips com contagem; `?percentual=15`; o toque no chip escreve na URL; vazio com o link e `noindex`; "Dia das Mães". Morde, menos a distinção nome × texto do selo (achado 4).

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `/black-friday` só em LEGACY_REDIRECTS/vercel.json, sem rota; APP_ROUTE_PATTERNS filtra pelas legadas reservadas; espelho na CategoryPage e 301 no ramo de categoria | sim | H-03 manda não reservar o slug; o diff está coerente nos cinco pontos | sim (pageKind.test também mudou, sem efeito de raio) |
| 2 | `/ofertas` como terceira classe, com `OFFERS_PATH` e `{kind:'offers'}` | sim | T6 verbatim | sim. A tarefa 07 já consome `OFFERS_PATH` (`core/home/campaignOffers.ts` reexpõe), sem divergência |
| 3 | `offersPageMeta` em core/seo chamando `campaignShowcaseLine` | sim | Um dono só para o `<head>` do cliente e do servidor. denoReach subiu com a lista | sim |
| 4 | Sem campanha: 200, noindex, sem canônica, 300 s; erro ⇒ shell `no-store` | sim | Bate com a régua de erro de apps/store/CLAUDE.md › O HTML servido ("`no-store` quando a leitura falha (que nunca vira 404)") e com H-11 | sim |
| 5 | `readLiveCampaign`/`readOffersLive` obrigatórios; vigência pela RLS | sim | A policy `campaigns_public_read` (migration 102) filtra por `now()`. Todas as construções de `PageDeps`/`SitemapDeps` no repositório estão em `alterados` | sim (a tarefa 08 já anota que a 06 mexe em serve.ts e server/page.ts) |
| 6 | `useOfferProducts` com embed aliased `!inner` + filtro por `campaign.id` | sim | Molde de `PRODUCT_CARD_SELECT_BY_CATEGORY`; não toca o mapeador da 04 | sim. Ver achado 5 sobre o import fora do barrel |
| 7 | Layout da categoria duplicado na OffersPage | sim | Caso análogo: `SearchPage.tsx` já duplica `sortSelect` e `CategoryFiltersPanel` | sim |
| 8 | `CAMPAIGN_PERCENT_PARAM` de core/home (tarefa 07) | sim | Existe em `packages/core/src/home/campaignOffers.ts:19` com o valor `'percentual'` | sim |
| 9 | Texto do estado vazio escrito por ele, sem abrir a spec | **não** | A tarefa manda copiar spec.md › Design literalmente, e a spec traz o texto e a trilha (achado 1) | — |
| 10 | Chips em `rounded-pill`, com entrada na allowlist de buttonShape | sim | Os chips de `CategoryFiltersPanel` já usam `rounded-pill` e estão na allowlist | sim |

## Não conferido

- Execução de testes, `tsc`, lint e build: não rodo código.
- CA-15 (390/1440, fonte a 200 %, sem rolagem lateral) e o layout dos chips que rolam de lado: só navegador.
- Os arquivos criados (`OffersPage.tsx`, `OffersPage.test.tsx`, `useOfferProducts.ts`) aparecem como `A` no `git status`, ou seja, com intent-to-add. Foram julgados inteiros.
- Se `writeFilterParams` preserva `?percentual=` quando a cliente mexe num filtro da categoria: o código dele não foi lido a fundo, e não há teste que combine os dois.
- `apps/store/src/shared/lib/__tests__/homeSections.test.ts` e `CheckoutPage.tsx` estão modificados na árvore, mas fora de `alterados` (outras tarefas). Não julgados.
Instruções lidas: /Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md (no contexto; inclui O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy, Feature-Sliced Design / Alias de import); apps/store/CLAUDE.md › O `<title>` e a descrição de cada rota · O HTML servido · Sitemap · A listagem de categoria (o diff de › Endereçamento também foi lido); packages/core/CLAUDE.md › só o índice de títulos (Os módulos não foi lido por inteiro).

## T07 — wi-impl-review · fixing · agente acf949335819bc685

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/07-bloco-joias-em-oferta-na-home.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | premissa derrubada | atrapalha | apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx:31-35 | A premissa 4 escolheu os tons `primary`/`on-primary`, `ink`/`on-primary` e `ground-deep`/`ink` com o argumento "não tenho o protótipo". Mas a spec que a tarefa manda copiar descreve os tons: falta o cartão ouro, e o cartão escuro não tem o número em ouro. | Tarefa › Design: "Copie spec.md › Design › "Home · Joias em oferta"". spec.md:171-172: "Tons da paleta da loja: fundo claro, ouro, e escuro com número em ouro." Tarefa › Decisões: "H-09: … os tons dos cartões são os do protótipo (paleta da loja)." |
| 2 | convenção violada | atrapalha | apps/store/src/widgets/campaign-offers/model/useCampaignOfferProducts.ts:5-6; apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx:11 | Código novo importa por caminho profundo símbolos que o barrel do slice já exporta: `mapDbToProduct`, `listingWindow` e `ProductQueryError` (o `entities/product/index.ts` reexporta `./lib/mapProduct` e `./api/useProducts`) e `ProductCarousel` (o `widgets/product-carousel/index.ts` o exporta). O import de `useOfferProducts` não tem barrel e fica de fora. | CLAUDE.md (raiz) › Feature-Sliced Design: "Cada slice tem um barrel `index.ts` (public API). **Novo código deve importar do slice** (`@/entities/product`) e não de caminhos profundos." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| UC-07 e o bloco de CA-12 provados por teste | CampaignOffers.test.tsx (sem campanha não desenha nada; 1, 3 e 5 cartões com `/ofertas?percentual=<p>`; "Dia das Mães" / "DIA DAS MÃES"); HomeRenderer.test.tsx (o bloco aparece com campanha e some sem ela); HomeBlockTray.test.tsx (a bandeja oferece o bloco, e ele é único) | sim |
| a migration aplicada no banco local | supabase/migrations/20261130140000_102-joias-em-oferta-na-home.sql | só execução |
| cada comportamento do bloco `Testes` coberto por um teste escrito | ver seção Testes | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- Migration com hora `14`, só desta tarefa: aplicada (`20261130140000_102-joias-em-oferta-na-home.sql`). As edições ficaram em `core/home/*`, no renderer da Home e em `features/home-composition`, como a tarefa prevê.
- Não editar `animacaoRespeitaMovimento.test.ts`: cumprida, o arquivo não está entre os alterados. O arquivo de UI novo do painel (`CampaignOffersEditor.tsx`) não tem transição. O cartão da loja tem `transition-opacity` com `motion-reduce:transition-none` na mesma linha.
- `previaUnica.test.ts` e `toNewItems.test.ts` verdes: só a execução prova. O editor novo não desenha a Home e não grava itens.

## Testes

- `core/home`, catálogo com o tipo novo (âncora de 11 para 12) e rótulo: `packages/core/src/home/__tests__/catalog.test.ts`. Morde: lista por extenso, `toHaveLength(12)` e `sectionMeta('campaign_offers')` por `toEqual`. As frases e os endereços estão em `campaignOffers.test.ts`.
- `homeSections.test.ts`, o `check` vigente é o da migration nova e contém todos os tipos: morde. Lê `LIMPO_OFERTAS`, ancora 12 tipos e 7 únicos, e `ultimaQueDefine` prova que a migration é a última que define a constraint e o índice. O caso "nenhum tipo de contagem regressiva" é anterior à tarefa e passa a operar sobre `TIPOS_DO_CHECK` da migration nova.
- Widget (sem campanha; 3, 1 e 5 percentuais; "Dia das Mães"): `apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx`. Morde: contagem e `href` de cada cartão, nome acessível, título h2 e rótulo por texto exato, ausência de "Black Friday". O hook tem teste próprio, com um dublê que enxerga `from`, `select`, `eq` e `limit`.
- `HomeRenderer.test.tsx` exige componente para o tipo: morde, renderiza a Home real com e sem campanha.
- A bandeja oferece o bloco: `HomeBlockTray.test.tsx`. Morde: âncora de 12, clique chama `onAdd('campaign_offers')`, e o bloco fica desativado quando já está na Home.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | tipo `campaign_offers`, rótulo "Joias em oferta" | sim | CA-12; precedente `product_carousel` / "Produtos em destaque" | sim: os `Record<HomeSectionType>` (resolve, HomeSectionRow, sectionEditors) foram todos atualizados |
| 2 | o índice único parcial é recriado com o tipo | sim | `homeSections.test.ts` compara `UNIQUE_SECTION_TYPES` com o índice; o índice da 24 tem o mesmo nome | sim |
| 3 | rótulo = `badge_text`, título = `name` | sim | H-09: "título, rótulo e percentuais do bloco da Home vêm da campanha" | sim |
| 4 | tons primary / ink / ground-deep | não | spec.md:171-172 descreve "fundo claro, ouro, e escuro com número em ouro" (achado 1) | sim, só o widget |
| 5 | "Ver todas" pelo link do carrossel, visível só a partir de `md` | sim | precedente: `HomeCollectionRow` e `FeaturedProducts` usam o mesmo link `hidden md:inline` | sim |
| 6 | sem reserva de espaço enquanto a campanha carrega | sim | régua do `HomeSkeleton` em apps/store/CLAUDE.md ("não afirma conteúdo nenhum"); o risco de CLS está declarado | sim |
| 7 | reusa `PRODUCT_CARD_SELECT_BY_CAMPAIGN` e `CAMPAIGN_FILTER_COLUMN` da 06 | em parte | o select e a coluna têm um dono, mas o corpo da consulta e a régua `.filter(p => p.campaign?.id === campaignId)` estão copiados de `useOfferProducts.ts:32-41`. Ver Não conferido | sim (dependência da 06 declarada) |
| 8 | `CAMPAIGN_PERCENT_PARAM` e `campaignOffersHref` em `core/home`, path de `core/routes` | sim | `OffersPage.tsx:5,81,100-101` importa a constante; `OFFERS_PATH` em `core/routes/routes.ts:217` | sim |
| 9 | editor sem campo, aponta para `/admin/campanhas` | sim | H-10 ("sem campos de configuração"); precedente da faixa de vantagens ("aponta para Configurações"); a rota existe em `App.tsx:94` | sim |
| 10 | tirou as guardas `isLoading`/`isError` equivalentes | sim | `data` é `undefined` nos dois casos; o `ProductCarousel` some com lista vazia que não está carregando | sim |
| 11 | resumo próprio da linha no painel | sim | `HomeSectionRow.tsx` cairia no `default` (fonte) | sim; sem teste, e o bloco Testes não o exige |

## Não conferido

- Tamanhos do cartão: spec.md:171-172 pede "número 56 px" no celular e "número 88 px" a partir de 768. `CampaignOffers.tsx:74` usa 44 px e 56 px. Fica aqui porque não encontrei classe de achado que acolha divergência de medida de design fora de `Pronto quando`.
- A régua "só a peça que esta campanha baixa" e o corpo da consulta estão escritos duas vezes (`useCampaignOfferProducts.ts` e `useOfferProducts.ts` da tarefa 06). Consolidar exigiria mexer no arquivo da 06, que está em andamento em paralelo, e não dá para julgar só por este diff.
- "Ver todas" invisível em 390: no jsdom o teste acha o link porque a classe `hidden` não se aplica. Só navegador e QA dizem se o celular precisa dele.
- Migration aplicada no banco local, testes verdes, `previaUnica`/`toNewItems`, CA-15 (larguras, 200 %, rolagem): só execução ou navegador.
- `apps/store/CLAUDE.md` e os outros arquivos de instruções foram lidos por seção, não por inteiro.
- Instruções lidas: CLAUDE.md (raiz, injetado inteiro no contexto); apps/store/CLAUDE.md › A home não salta enquanto carrega · A Home é dado · Produtos em destaque / `ProductCarousel` tem TRÊS formas; packages/core/CLAUDE.md › `home`; apps/backoffice/CLAUDE.md › `/admin/home` — a composição, e a prévia que é a loja; supabase/CLAUDE.md › Migrations.

## T07 — wi-impl-task · done · agente a5168c591d24c28b7

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/07-bloco-joias-em-oferta-na-home.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 4 (revista) | Os tons dos cartões, nesta ordem (repetindo do 4º em diante): fundo claro (`ground-deep`, texto `ink`), ouro (`accent`, texto `ink` cheio, sem opacidade) e escuro (`ink`, texto `on-primary`, com o número em `accent`) | os tons `primary`/`ink`/`ground-deep` que eu tinha escolhido sem o protótipo | a spec descreve os tons: "fundo claro, ouro, e escuro com número em ouro" (achado 1, H-09). Contrastes: `ink` sobre `accent` 4,78:1; `accent` sobre `ink` 4,78:1, em número grande | o widget; e o guarda `accentText.test.ts` ganhou a entrada `widgets/campaign-offers/ui/CampaignOffers.tsx`, com a superfície escrita |
| 7 (revista) | A consulta da fileira importa do barrel do slice: `listingWindow`, `mapDbToProduct`, `ProductQueryError`, `PRODUCT_CARD_SELECT_BY_CAMPAIGN` e `CAMPAIGN_FILTER_COLUMN` de `@/entities/product` | o caminho profundo | convenção do FSD (achado 2). O barrel já reexporta `./api/useOfferProducts`, então o `select` da vitrine também sai pelo slice | o widget; se a tarefa 06 renomear símbolos de `useOfferProducts`, o `tsc` da loja acusa |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 3 (reaberta) | Os tons dos cartões: claro, ouro, e escuro com o número em ouro | componente | `apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx` (caso novo "os tons da paleta…") | sim | vermelho (tirar o ouro do número do cartão escuro derruba o caso) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

packages/core/src/home/types.ts alterado
packages/core/src/home/catalog.ts alterado
packages/core/src/home/resolve.ts alterado
packages/core/src/home/index.ts alterado
packages/core/src/home/campaignOffers.ts criado
packages/core/src/home/__tests__/catalog.test.ts alterado
packages/core/src/home/__tests__/campaignOffers.test.ts criado
supabase/migrations/20261130140000_102-joias-em-oferta-na-home.sql criado
apps/store/src/shared/lib/__tests__/homeSections.test.ts alterado
apps/store/src/shared/lib/__tests__/accentText.test.ts alterado
apps/store/src/widgets/campaign-offers/index.ts criado
apps/store/src/widgets/campaign-offers/model/useCampaignOfferProducts.ts criado
apps/store/src/widgets/campaign-offers/model/__tests__/useCampaignOfferProducts.test.tsx criado
apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx criado
apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx criado
apps/store/src/widgets/home-renderer/ui/sectionRenderers.tsx alterado
apps/store/src/widgets/home-renderer/ui/__tests__/HomeRenderer.test.tsx alterado
apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx criado
apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.test.tsx criado
apps/backoffice/src/features/home-composition/ui/sectionEditors.tsx alterado
apps/backoffice/src/features/home-composition/ui/HomeSectionRow.tsx alterado
apps/backoffice/src/features/home-composition/ui/HomeBlockTray.test.tsx alterado

## Verificação

- Testes que a correção tocou, com `pnpm --filter @estrelinha/store exec vitest run <arquivos> --testTimeout=20000` (fonte: `PROJECT.md`): o widget, a consulta da fileira, `HomeRenderer`, `accentText`, `contrast` e `homeSections`. Exit 0, 189 casos.
- Tipos da loja, com `npx tsc --noEmit -p apps/store/tsconfig.app.json` (fonte: `CLAUDE.md` › Comandos): **0**, igual à baseline.
- Lint dos arquivos tocados, com `npx eslint` (fonte: `CLAUDE.md` › Baselines): sem nenhum aviso.
- A suíte inteira da loja não rodou de novo nesta correção.

Instruções lidas: as mesmas da implementação, nada relido.

## Divergências e descobertas

- O texto em ouro do cartão escuro exigiu uma entrada nova em `accentText.test.ts` (`PERMITIDOS`), com o motivo escrito. Fazer isso não afrouxa o guarda: é o caminho que o próprio guarda pede para quem acrescenta ouro sobre `ink`.
- Achado 2: o import de `useOfferProducts`, que o revisor deixou de fora por não ter barrel, agora também sai por `@/entities/product`, porque a tarefa 06 o pôs no barrel do slice.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 07
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/store/CLAUDE.md › Design system · Mobile · A home não salta · Banner principal · A Home é dado · Produtos em destaque · ProductCarousel · Modo prévia; apps/backoffice/CLAUDE.md › /admin/home · editores de Produtos em destaque e Lista de categorias · O movimento do painel · A ponte da prévia; packages/core/CLAUDE.md › Quando um código pertence · Pureza · Os módulos · home; supabase/CLAUDE.md › Migrations · RLS; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos:
  - catálogo com o tipo novo e o rótulo: packages/core/src/home/__tests__/catalog.test.ts e campaignOffers.test.ts
  - o check vigente é o da migration nova, com todos os tipos, sem contagem regressiva: apps/store/src/shared/lib/__tests__/homeSections.test.ts
  - widget: sem campanha, nada; 3 cartões com /ofertas?percentual=<p>; com 1 e com 5; "Dia das Mães"; os tons claro, ouro e escuro com número em ouro: apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx
  - a consulta das peças da fileira: apps/store/src/widgets/campaign-offers/model/__tests__/useCampaignOfferProducts.test.tsx
  - o HomeRenderer exige componente para o tipo: HomeRenderer.test.tsx
  - a bandeja oferece o bloco: HomeBlockTray.test.tsx; o editor: CampaignOffersEditor.test.tsx
  - sem cobertura: CA-15 (390/1440 e fonte a 200 %), porque jsdom não mede layout; fica para a Validation/QA
Verificações:
  - implementação: core 5828/245 exit 0; painel 5351/305 exit 0; loja exit 1 com 9 falhas em 6 arquivos que são das tarefas 05 e 06 em andamento; tipos na baseline (loja 0, painel 7, core 11); migration aplicada no banco local, com probes
  - correção: os arquivos tocados (189 casos) exit 0; tsc da loja 0; eslint sem nada
Árvore de trabalho: os 22 arquivos da lista "Arquivos alterados" acima; nada commitado
Citações conferidas: 7 abertas ao usar; homeSections.test.ts:46-62,150-171 deslocou e foi relocalizada pelos alvos; nenhuma morta
Caducou: nada
```

## T06 — wi-impl-task · done · agente af065013e302614fd

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/06-vitrine-ofertas.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 9 (revista) | O estado sem campanha agora usa o texto literal da spec que o achado 1 citou: trilha "Início › Ofertas", caixa "Não há ofertas agora", texto "Quando houver uma campanha com peças em oferta, elas aparecem aqui. Enquanto isso, as coleções da loja continuam abertas." e botão "Ver as coleções" levando a `/`. O destino `/` continua sendo premissa minha, porque a citação não diz o destino | O texto que eu tinha escrito | O achado trouxe a fonte | `apps/store/src/pages/OffersPage.tsx` |
| 11 (nova) | `useOfferProducts` entrou no barrel `entities/product/index.ts`. A `OffersPage` importa `ProductCard`, `ProductCardSkeleton` e `useOfferProducts` de `@/entities/product` | Import por caminho profundo | Convenção do FSD no CLAUDE.md raiz: código novo importa do slice | `entities/product/index.ts`, que tarefas paralelas também podem tocar |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 9 (reaberta) | Página real: o título e a trilha dizem o `name` e o selo diz o `badge_text`; a fixtura agora tem os dois diferentes ('BLACK FRIDAY', 'DIA DAS MÃES') | frontend | `apps/store/src/pages/__tests__/OffersPage.test.tsx` | sim | `vermelho`: com o `h1` lendo `badge_text`, 3 casos reprovam |
| 9b | Estado sem campanha com a trilha "Início›Ofertas" e o texto literal comparado cru, sem normalização | frontend | idem | sim | — |
| 9c | O `h1` tem `text-[28px]` e `lg:text-[44px]`, sem tamanho em `md:` | frontend | idem | sim | — |
| 9d | Chips de percentual e ordenação na mesma linha a partir de `md`; a ordenação do celular continua na barra de filtros | frontend | idem | sim | `vermelho`: sem a ordenação na linha dos chips, 1 caso reprova |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

packages/core/src/routes/routes.ts alterado
packages/core/src/routes/pageKind.ts alterado
packages/core/src/routes/__tests__/routes.test.ts alterado
packages/core/src/routes/__tests__/pageKind.test.ts alterado
packages/core/src/page/classify.ts alterado
packages/core/src/page/serve.ts alterado
packages/core/src/page/__tests__/classify.test.ts alterado
packages/core/src/page/__tests__/serve.test.ts alterado
packages/core/src/page/__tests__/productHead.test.ts alterado
packages/core/src/seo/pages.ts alterado
packages/core/src/seo/__tests__/seo.test.ts alterado
packages/core/src/seo/__tests__/denoReach.test.ts alterado
packages/core/src/sitemap/serve.ts alterado
packages/core/src/sitemap/urls.ts alterado
packages/core/src/sitemap/__tests__/serve.test.ts alterado
apps/store/server/page.ts alterado
apps/store/server/sitemap.ts alterado
apps/store/server/__tests__/page.test.ts alterado
apps/store/server/__tests__/sitemap.test.ts alterado
apps/store/vercel.json alterado
apps/store/src/app/App.tsx alterado
apps/store/src/app/__tests__/rotasDeApp.test.ts alterado
apps/store/src/app/__tests__/sitemapRoutes.test.ts alterado
apps/store/src/app/__tests__/routeSplitting.test.ts alterado
apps/store/src/app/__tests__/paginasFixasServidas.test.ts alterado
apps/store/src/pages/OffersPage.tsx criado
apps/store/src/pages/__tests__/OffersPage.test.tsx criado
apps/store/src/pages/CategoryPage.tsx alterado
apps/store/src/pages/__tests__/CategoryPage.test.tsx alterado
apps/store/src/pages/__tests__/metaPorRota.test.ts alterado
apps/store/src/entities/product/api/useOfferProducts.ts criado
apps/store/src/entities/product/index.ts alterado
apps/store/src/shared/lib/__tests__/vercelRedirects.test.ts alterado
apps/store/src/shared/ui/__tests__/buttonShape.test.ts alterado
apps/store/CLAUDE.md alterado

## Verificação

Só o que a correção tocou e rodou:
- `pnpm --filter @estrelinha/store exec vitest run src/pages/__tests__/OffersPage.test.tsx --testTimeout=20000` (fonte: PROJECT.md): 13/13 verdes.
- Arquivos de teste afetados pela mudança no barrel e pelos guardas, no mesmo comando: OffersPage, `src/app/__tests__`, metaPorRota, buttonShape, touchTarget, `src/entities/product`, marcacaoPorOpcaoComDonoUnico. 941/941 verdes, exit 0.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (fonte: CLAUDE.md §Comandos): 0 erros, igual ao baseline.
- eslint de `OffersPage.tsx` e `entities/product/index.ts`: exit 0.

Instruções lidas: as mesmas da implementação, sem releitura.

## Divergências e descobertas

- A citação da spec no achado 1 não diz o destino de "Ver as coleções". Mantive `/` (premissa 9).
- O achado 3 foi aplicado assim: chips e ordenação numa linha a partir de 768 px. A linha dos filtros removíveis dentro da coluna da grade só aparece quando há algum filtro ativo.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 06
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; apps/store/CLAUDE.md › Endereçamento · O <title> de cada rota · O HTML servido (api/page) · Sitemap · A listagem de categoria / os filtros; packages/core/CLAUDE.md › Os módulos; .specs/project/PROJECT.md › Comandos de verificação
Testes escritos: core/page — classify.test.ts (`/ofertas` é `offers`; `/black-friday` continua categoria) e serve.test.ts (com campanha: título, descrição, canônica e 300 s; sem campanha: noindex; leitura que falha: no-store; `/black-friday` responde 301). Sitemap — core/sitemap/__tests__/serve.test.ts e apps/store/server/__tests__/sitemap.test.ts (`/ofertas` só com campanha; falha responde 503). Rotas — guardas atualizados para o número verdadeiro: core routes.test (21/24/5, mais a exceção `/black-friday`), rotasDeApp 28/16, sitemapRoutes 28, paginasFixasServidas 28 com o tipo `offers`, routeSplitting 21, metaPorRota 21, vercelRedirects 5 com `/black-friday → /ofertas`; seo 18 e reservedSlugs sem mudança de âncora; CategoryPage.test cobre o espelho na SPA. Página real — OffersPage.test.tsx (peças marcadas que a campanha baixa, chips com contagem, `?percentual=15`, clique no chip, título = nome e selo = texto do selo, diferentes entre si, "Dia das Mães", estado vazio com trilha, texto e botão literais, título 28/44, chips e ordenação na mesma linha). Extras: offersPageMeta (seo.test) e pageKind. Sem cobertura: CA-15, o layout real (é da Validation)
Verificações: tsc store 0, tsc server 0 e tsc core 11, todos iguais ao baseline; suíte core 5829/245 verde; suíte store 7355 verdes, com 4 vermelhos em arquivos da tarefa 05 que corre em paralelo (useCartBuyTogether e o bump do CheckoutPage); backoffice 72/72 nos testes que leem as constantes alteradas; na correção, 941/941 nos arquivos tocados e no entorno, tsc store 0 e eslint 0
Árvore de trabalho: os 35 arquivos listados em "Arquivos alterados", sendo 3 criados (OffersPage.tsx, OffersPage.test.tsx, useOfferProducts.ts); nada commitado
Citações conferidas: 6 abertas ao usar (o ramo de produto de serve.ts, classifyPath em classify.ts, os trechos citados de routes.ts, staticPageMeta/usePageMeta, CategoryPage, features/category-filters); as linhas citadas de routes.ts e serve.ts tinham deslocado e foram relocalizadas pelo alvo; nenhuma morta
Caducou: nenhuma
```

## T05 — wi-impl-task · review · agente a906fde1d4e758368

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/05-sacola-e-checkout.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A entrada por linha de `resolveOrderPricing` é `campaign?: { percent, compare_price? } \| null` (o "de" vai dentro do objeto da campanha), e `unit_price` continua sendo o preço de TABELA | um campo `compare_price` solto em `PricingItem` | O contrato pede `{ percent }`, e `campaignUnitPrice` precisa do "de" para RN-06. Assim é um campo opcional só, no molde de `manualDiscount`/`buyTogether` | `pricing.ts`, a loja (`cartPricingItem`, bump), `mercado-pago`, e a tarefa 09 (propagado) |
| 2 | Uma linha só conta como "de campanha" (fica fora do cupom, da faixa e do Compre Junto) quando a campanha BAIXA o preço dela (`hasCampaign`, exportado como `lineCampaignPercent`) | tratar como de campanha toda peça marcada | O mapeador da tarefa 04 só marca a peça (o selo) quando a campanha baixa o preço. Peça marcada sem desconto de verdade continua comum nas duas pontas | regra de cupom, faixa e Compre Junto; o `create-order` grava a campanha só nessas linhas; tarefa 09 |
| 3 | `campaignDiscount` só aparece na saída quando alguma linha trouxe `campaign` (mesmo que não desconte). Em `resolveOrderLines` ele também só aparece nesse caso | sempre presente | "Sem campanha, saída idêntica, inclusive a forma" | os `toEqual` de quem consome |
| 4 | O desconto de campanha conta para a campanha quando o preço dela é o cobrado. Quando a oferta do checkout é mais barata, o desconto fica com a oferta, que sai como resíduo do bump | atribuir sempre à campanha | É a mesma regra de "o menor vence" (`AD-015`), e mantém o resíduo do bump sem contar em dobro | `orders.campaign_discount`, `order_bump_discount` e a guarda de teto |
| 5 | Compre Junto: a alocação roda como antes, e os segmentos das linhas de campanha são descartados depois | tirar a peça de campanha da alocação | Muda menos o código de dinheiro. Efeito colateral: no raro par recíproco, a unidade "consumida" pela peça de campanha não vai para outra linha | `buyTogetherParts` |
| 6 | `couponRefusal` ganhou `eligibleSubtotal` e `campaignName`. A recusa "Este cupom não vale para peças da {nome}." só vale para cupom de percentual ou de valor (o de frete grátis passa), entra antes do pedido mínimo, e o mínimo é conferido sobre `eligibleSubtotal` quando ele vem | recusar também o cupom de frete grátis | RN-16/D-06: o cupom de frete grátis continua valendo | loja (`validateCoupon`), `mercado-pago`, `order-proposals` (tarefa 09) |
| 7 | O 422 do `create-order` usa o mesmo código e corpo do `create-payment`, mas com `total: null`. A loja mostra como total novo o que ela mesma recalcula depois de reler o catálogo (`priceChanged.total ?? totals.total`) | o `create-order` calcular o total novo (cupom, frete, promoção) | O `create-order` não reprecifica o pedido. Montar um total aproximado mostraria um valor errado à cliente | `CheckoutPage`, `useCreateOrder` (`OrderDiscountChangedError`) |
| 8 | `orders.campaign_discount` é calculado pelo `create-order` sobre o preço de tabela lido do banco. A linha conta quando o preço da campanha é menor ou igual ao `unit_price` exibido (com a oferta do checkout mais barata, não conta) | copiar do corpo | É calculado pelo servidor (H-05) e precisa casar com a atribuição da decisão 4 na guarda do `create-payment` | a guarda de teto do `mercado-pago` |
| 9 | O `mercado-pago` lê o "de" do BANCO (`original_price`/`compare_price`, T2). `compare_unit_price` é gravado pelo `create-order` e serve de histórico/exibição | recalcular com o `compare_unit_price` gravado | T2 manda o recálculo ler as colunas do banco | o recálculo do `create-payment` |
| 10 | A releitura do catálogo da sacola (`useCartCatalog`) é montada DENTRO de `useCartBuyTogether`, e `refresh` relê as duas consultas. Quando a releitura chega, `syncCatalog` regrava em cada linha da sacola o `unitPrice` efetivo e o `product.campaign` de agora, inclusive nas linhas sem campanha | um hook separado chamado pelas telas | As suítes do checkout montam a página sem `QueryClientProvider` e dublam `useCartBuyTogether`; um hook novo derrubaria dezenas de testes. Com o persistido regravado, frete grátis por faixa, seguro da cotação e subtotal leem o preço de agora, sem mudar o `version` | `entities/cart`, gaveta, checkout, `toQuotePayload` |
| 11 | A loja manda `campaign_percent` só nas linhas de campanha; a linha comum fica com as chaves de sempre | mandar `campaign_percent: null` em toda linha | `pages/__tests__/CheckoutPage.test.tsx` (fora da minha cerca) compara o item do bump com `toEqual`. O guarda `chavesDoItemDoPedido` passou a cobrar as duas formas | `buildOrderItems`, `chavesDoItemDoPedido.test.ts` |
| 12 | O `mercado-pago` grava `campaign_discount` (em `orders` e no travado) só quando há linha com campanha ou quando o travado tem a coluna | gravar sempre | Os testes de antes comparam essas gravações com `toEqual`, e o pedido sem campanha deve sair igual | `mercado-pago/handlers.ts` |
| 13 | No `mercado-pago`, o cupom passa por `couponRefusal` com `first_order_only` forçado a `false` | reconferir "primeira compra" | O próprio pedido já existiria como compra anterior. T10 pede só o `min_order` | cobrança |
| 14 | O resumo do pedido ganhou a linha "Desconto de campanha", genérica, sem o nome da campanha (`ORDER_DISCOUNT_LABELS.campaign`). Ela entra também no e-mail (`send-notification`), porque o resumo parte do preço cheio e sem ela a conta não fecharia | pôr o nome da campanha | O pedido não guarda o nome, e ler a tabela da campanha seria um segundo leitor | loja, painel, app, e-mail |
| 15 | Migration `20261130130000_102-campanha-no-pedido.sql`, aplicada com `supabase migration up --local --include-all` | o prefixo seguinte | A `20261130140000` (tarefa 07) já estava aplicada no local, e o comando recusa a anterior sem `--include-all`. Aplicada só no local | ordem das migrations no `db push` |
| 16 | Linha de campanha não se parte em preços diferentes; mesmo assim, o snapshot da linha nova em `regravarLinhas` copia `campaign_id`/`campaign_percent`/`compare_unit_price` | um teste de "linha partida com campanha" | Sem casado e sem faixa, a linha de campanha nunca se parte. O teste prova a junção, e a cópia é defensiva | `regravarLinhas` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Sem `campaign`, saída idêntica; CA-03; RN-06; arredondamento | domínio | packages/core/src/payment/__tests__/campaignDiscount.test.ts | sim | — |
| 2 | CA-16 (cupom só na comum, sacola só de campanha, frete grátis, PIX) | domínio | idem | sim | — |
| 3 | CA-17 (faixa, Compre Junto como principal e como adicional) | domínio | idem | sim | — |
| 4 | A oferta numa peça de campanha cobra o menor; `campaignDiscount` fora do resíduo do bump | domínio | idem | sim | — |
| 5 | Marcada sem baixar o preço é peça comum | domínio | idem | sim | vermelho |
| 6 | `couponRefusal` com o nome da campanha e o mínimo sobre as peças comuns | domínio | packages/core/src/coupons/__tests__/rules.test.ts | sim | — (o caso do frete grátis passou de primeira e levou o check: vermelho) |
| 7 | Guarda da migration (uma régua por comando) | guarda | apps/store/src/shared/lib/__tests__/campanhaNoPedidoSchema.test.ts | sim | os sensores do próprio arquivo (`mutar`) |
| 8 | Leitor das functions: vigência pelo relógio injetado | unidade | supabase/functions/_shared/__tests__/campaigns.test.ts | sim | vermelho |
| 9 | `create-order` grava a campanha que resolveu, recusa o 422 quando a exibida acabou, e nada antes/depois da vigência | handler | supabase/functions/checkout/__tests__/createOrderCampanha.test.ts | sim | — (o caso `linhaDoItem` passou de primeira e levou o check: vermelho) |
| 10 | `create-payment`: campanha gravada depois do fim, teto com `campaign_discount`, `min_order` vira `null`, travado e pagar de novo | handler | supabase/functions/mercado-pago/__tests__/campaignCharge.test.ts | sim | — (+ check extra no teto e no mínimo: vermelho; o caso "a linha regravada preserva a campanha" passou de primeiro sem check) |
| 11 | Chaves do item × colunas do `create-order`; a campanha do corpo não é copiada | guarda | apps/store/src/features/checkout/lib/__tests__/chavesDoItemDoPedido.test.ts | sim | os sensores do arquivo |
| 12 | `buildOrderItems` manda o percentual exibido só na linha de campanha | unidade | apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts | sim | vermelho |
| 13 | A sacola: peça posta antes do início mostra o preço da campanha depois da releitura; a campanha que acabou sai; a frase da próxima faixa ignora a peça de campanha | página real (gaveta) | apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaCampanha.test.tsx | sim | vermelho (sem o `syncCatalog`; sem a campanha no item) |
| 14 | O checkout relê ao voltar o foco | hook (jsdom) | apps/store/src/entities/cart/api/__tests__/useCartCatalog.test.tsx | sim | vermelho (`staleTime` de volta a 5 min) |
| 15 | O 422 do `create-order` vira erro próprio, com o total exibido | hook | apps/store/src/entities/order/api/__tests__/useOrders.test.tsx | sim | vermelho |
| 16 | O seguro da cotação usa o preço relido, por unidade | unidade | apps/store/src/entities/cart/lib/__tests__/toQuotePayload.test.ts | sim | não feito (passou de primeira) |
| 17 | Resumo do pedido com a linha da campanha: core | domínio | packages/core/src/orders/__tests__/summary.test.ts | sim | — |
| 18 | Resumo: loja | componente | apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx | sim | vermelho |
| 19 | Resumo: painel | página real | apps/backoffice/src/pages/admin/AdminOrderPage.campanha.test.tsx | sim | vermelho |
| 20 | Resumo: app | página real (`<App />`) | apps/mobile-adm/src/pages/__tests__/pedidoDescontoCampanha.test.tsx | sim | vermelho (sem a coluna no `select`) |
| 21 | `denoReach` do que as functions importam (`campaigns/price.ts` no grafo de `pricing.ts`) | guarda | packages/core/src/payment/__tests__/manualDiscount.test.ts | sim | — (âncora de contagem atualizada) |
| 22 | Probe HTTP `create-order` → `create-payment` | integração local | — | não rodado | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

packages/core/src/payment/pricing.ts alterado
packages/core/src/payment/__tests__/campaignDiscount.test.ts criado
packages/core/src/payment/__tests__/manualDiscount.test.ts alterado
packages/core/src/coupons/rules.ts alterado
packages/core/src/coupons/__tests__/rules.test.ts alterado
packages/core/src/hooks/useCoupons.ts alterado
packages/core/src/orders/summary.ts alterado
packages/core/src/orders/__tests__/summary.test.ts alterado
packages/supabase/src/types/index.ts alterado
packages/supabase/src/types/coupon.ts alterado
supabase/migrations/20261130130000_102-campanha-no-pedido.sql criado
supabase/functions/_shared/campaigns.ts criado
supabase/functions/_shared/__tests__/campaigns.test.ts criado
supabase/functions/checkout/handlers.ts alterado
supabase/functions/checkout/__tests__/createOrderCampanha.test.ts criado
supabase/functions/mercado-pago/handlers.ts alterado
supabase/functions/mercado-pago/__tests__/campaignCharge.test.ts criado
supabase/functions/send-notification/dispatch.ts alterado
supabase/functions/send-notification/handlers.ts alterado
supabase/functions/send-notification/render/layout.ts alterado
apps/store/src/entities/cart/api/useCartCatalog.ts criado
apps/store/src/entities/cart/api/__tests__/useCartCatalog.test.tsx criado
apps/store/src/entities/cart/api/useCartBuyTogether.ts alterado
apps/store/src/entities/cart/api/__tests__/useCartBuyTogether.test.tsx alterado
apps/store/src/entities/cart/lib/campaignPricing.ts criado
apps/store/src/entities/cart/lib/buyTogetherPricing.ts alterado
apps/store/src/entities/cart/lib/__tests__/toQuotePayload.test.ts alterado
apps/store/src/entities/cart/model/cartStore.ts alterado
apps/store/src/entities/cart/model/useCartPromotion.ts alterado
apps/store/src/entities/cart/index.ts alterado
apps/store/src/entities/order/api/useOrders.ts alterado
apps/store/src/entities/order/api/__tests__/useOrders.test.tsx alterado
apps/store/src/entities/order/ui/OrderItemsSummary.tsx alterado
apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx alterado
apps/store/src/features/apply-coupon/ui/CouponInput.tsx alterado
apps/store/src/features/checkout/lib/buildOrderPayload.ts alterado
apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts alterado
apps/store/src/features/checkout/lib/__tests__/chavesDoItemDoPedido.test.ts alterado
apps/store/src/features/checkout/model/useCheckoutTotals.ts alterado
apps/store/src/features/checkout/ui/OrderSummary.tsx alterado
apps/store/src/pages/CheckoutPage.tsx alterado
apps/store/src/shared/lib/__tests__/campanhaNoPedidoSchema.test.ts criado
apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx alterado
apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaCampanha.test.tsx criado
apps/backoffice/src/pages/admin/AdminOrderPage.campanha.test.tsx criado
apps/mobile-adm/src/entities/order/model/linha.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/usePedido.test.tsx alterado
apps/mobile-adm/src/test/pedidos.ts alterado
apps/mobile-adm/src/pages/__tests__/pedidoDescontoCampanha.test.tsx criado
.specs/work-items/102-desconto-de-campanha/tasks/08-feed-do-google-e-json-ld.md alterado
.specs/work-items/102-desconto-de-campanha/tasks/09-pedido-montado-com-a-campanha.md alterado

## Verificação

Comandos de `PROJECT.md › Comandos de verificação`, que remete ao `CLAUDE.md › Comandos/Baselines`.
- Um arquivo de teste por fatia: `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md). Todos verdes no fim.
- Tipos (`CLAUDE.md`): `npx tsc --noEmit -p apps/store/tsconfig.app.json` 0 · `apps/backoffice/tsconfig.app.json` 7 · `apps/mobile-adm/tsconfig.app.json` 0 · `apps/store/tsconfig.server.json` 0 · `packages/core/tsconfig.json` 11. Nenhum erro novo. Sem `baseline` na entrada; comparei com a baseline do `CLAUDE.md`, por arquivo e código: os 7 do backoffice são todos de `ProposalStateBadge.test.tsx` e os 11 do core estão nos arquivos herdados (`carousel`, `pickHomeBanners`, `pickHomeCollections`, `sitemap/urls`, `supabase/client.ts`).
- Verificação mínima (`CLAUDE.md › Baselines`: a suíte de cada workspace tocado, exit fora de pipe):
  - core: 5830/245, exit 0
  - functions: 1688/49, exit 0
  - mobile-adm: 2731/176, exit 0
  - backoffice: 5353/306, exit 0
  - store, rodada em dois lotes pelo teto de 10 min: `src/shared server` 3206/132 e `src/app src/entities src/features src/widgets src/pages src/test` 4144/264, os dois exit 0. Os números incluem o trabalho das tarefas 03, 06 e 07, que corriam na mesma árvore.
- Migration: `supabase migration up --local --include-all` (forma do `PROJECT.md › Ambiente local`, mais o `--include-all`), aplicada. Probe SQL numa transação desfeita: `order_list` expõe `campaign_discount`; `campaign_percent` 71 é recusado; `campaign_discount` negativo é recusado; o default de `orders.campaign_discount` é 0. As colunas que as functions leem (`campaigns`, `product_campaigns`, `products.original_price`, `product_variants.compare_price`, as colunas novas de `order_items`) existem.
- Fora da verificação mínima: `npx eslint` nos arquivos de UI e teste tocados da loja, do app e do painel deu 0 erros, depois de trocar um NBSP literal por ` ` num teste meu.

Instruções lidas:
- `CLAUDE.md` (raiz; versão no contexto, por inteiro)
- `apps/store/CLAUDE.md` › A listagem de categoria / Os filtros curados · Carrinho, chrome e checkout · A sacola v4 · As parcelas do cartão
- `packages/core/CLAUDE.md` › Pureza · Dinheiro
- `supabase/CLAUDE.md` › Migrations · Compre Junto (as três seções) · RLS — o molde que os guardas cobram
- `apps/mobile-adm/CLAUDE.md` › Montar pedido (WI 94)
- `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local

## Divergências e descobertas

- **O probe HTTP `create-order` → `create-payment` não rodou.** O edge runtime local está parado (`supabase status`: "Stopped services: supabase_edge_runtime…"), e subi-lo com `supabase functions serve` seria um processo que fica rodando (regra 8). Tratei como degradação, não como o caso 5 de aborto, porque o comportamento das duas functions está provado pelos testes de handler. Fiz no lugar o probe SQL acima. **Falta rodar o probe HTTP com as functions servidas**, dentro e fora da vigência e com corpo forjado.
- **O 422 e a volta do foco não foram testados pela página real do checkout.** `apps/store/src/pages/__tests__/` está na cerca de outra tarefa. Provei pelos hooks: `useCartCatalog` relê ao voltar o foco e `useCreateOrder` transforma o 422 em `OrderDiscountChangedError`. O ramo do `CheckoutPage` que trata esse erro (relê a sacola e mostra "o valor mudou" com `totals.total`) ficou sem teste de página.
- **Fatias que passaram de primeira sem o check de mutação:**
  - `toQuotePayload` (o seguro com o preço relido)
  - o caso "a linha regravada preserva a campanha" de `campaignCharge.test.ts`: ele só assere ausência de colunas de campanha nos updates, e essa asserção é fraca
  - o primeiro caso do painel (o "de/por" já existia por `full_unit_price`)
- **Teste existente ajustado (asserção ganhou, nenhuma foi afrouxada):**
  - `usePedido.test.tsx` (mobile-adm) cravava `manual_discount` como última coluna da `order_list`; agora exige `…, manual_discount, campaign_discount`.
  - `useCartBuyTogether.test.tsx`: o dublê passou a registrar e responder só a tabela do Compre Junto. A releitura do catálogo, que agora mora no mesmo hook, tem teste próprio.
  - `manualDiscount.test.ts`: a âncora do grafo Deno de `pricing.ts` ganhou `campaigns/price.ts`.
- **Guardas pegaram duas coisas que não eram regra:**
  - O guarda do `create-order` em `createOrder.test.ts` procura o fim literal da string `ITENS_DO_RECALCULO`. Pus as colunas de campanha no meio da string em vez de mexer no teste.
  - O `originZipNotRead` do painel acusou `origin_zip` numa fixture minha; a chave saiu da fixture.
- **Linha `Instruções lidas` dos arquivos:** usei a cópia do `CLAUDE.md` raiz que estava no contexto, sem relê-la do worktree. Li dos módulos só as seções citadas na tarefa.
- **Citações conferidas:**
  - `pricing.ts:65/74` estavam nas linhas certas.
  - `checkout/handlers.ts:276-301` deslocou; achei pelos nomes `COLUNAS_DA_MARCA`/`linhaDoItem`.
  - `mercado-pago/handlers.ts:798-846` deslocou um pouco: a guarda de teto estava em ~807-850.
  - `lockedFirstCharge` deslocou para ~1404.
  - `20261115120000_98-preco-travado.sql:25-39`, a migration `20261110160000…` e `orders/summary.ts:55,94` estavam certos.
  - Nenhuma citação morta.
- **Propagado (decisão minha, sem afirmação falsa):** as linhas `JÁ EXISTE` de `_shared/campaigns.ts` nas tarefas 08 e 09, e a de `resolveOrderPricing`/`couponRefusal` na 09, ganharam a assinatura concreta.
- **Mudanças de comportamento fora do caminho da campanha:**
  - O e-mail (`send-notification`) ganhou a linha de campanha no resumo (decisão 14), para a conta fechar.
  - A sacola passa a adotar o preço relido do catálogo também nas linhas sem campanha (decisão 10, T1).
- **Ambiente:** o arquivo de saída `$TMPDIR/wi-impl-saida.txt` é compartilhado com os agentes paralelos, e um deles sobrescreveu uma saída minha no meio de uma leitura. Passei a gravar em `$TMPDIR/wi-*-05.txt`.
- **Um comando escapou para o fundo:** uma rodada da suíte do backoffice estourou 120 s, sem o `timeout` da ferramenta, e foi para segundo plano. Esperei em primeiro plano até terminar (5353/306, exit 0).

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 05
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/store/CLAUDE.md › A listagem de categoria / os filtros · Carrinho, chrome e checkout · A sacola v4; packages/core/CLAUDE.md › Dinheiro · Pureza; supabase/CLAUDE.md › Migrations · RLS — o molde que os guardas cobram · Compre Junto; apps/mobile-adm/CLAUDE.md › Montar pedido (WI 94); .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos:
  - payment: packages/core/src/payment/__tests__/campaignDiscount.test.ts (sem campanha idêntico, CA-03, RN-06, CA-16, CA-17, bump cobra o menor, campaignDiscount fora do resíduo do bump)
  - cupom: packages/core/src/coupons/__tests__/rules.test.ts (recusa com o nome da campanha, mínimo só nas comuns, frete grátis vale)
  - handlers checkout: supabase/functions/checkout/__tests__/createOrderCampanha.test.ts (grava a resolvida, descarta a do corpo, 422 quando a exibida acabou, nada antes/depois da vigência, "de/por")
  - handlers mercado-pago: supabase/functions/mercado-pago/__tests__/campaignCharge.test.ts (campanha gravada depois do fim, teto com campaign_discount, min_order vira null, junção da linha, travado e pagar de novo)
  - leitor das functions: supabase/functions/_shared/__tests__/campaigns.test.ts
  - guardas: chavesDoItemDoPedido.test.ts; denoReach em manualDiscount.test.ts; campanhaNoPedidoSchema.test.ts; wiringResolve verde
  - página real: sacolaCampanha.test.tsx (releitura, campanha que acabou, frase da faixa); OrderItemsSummary.test.tsx (loja), AdminOrderPage.campanha.test.tsx (painel), pedidoDescontoCampanha.test.tsx (app)
  - hooks: useCartCatalog.test.tsx (relê ao voltar o foco), useOrders.test.tsx (o 422 do create-order)
  - sem cobertura: o probe HTTP (edge runtime local parado, e subir `functions serve` contraria a regra de não deixar processo rodando) e o ramo do CheckoutPage que trata o 422 do create-order (pages/__tests__ é de outra tarefa nesta onda)
Verificações: tsc store 0 · backoffice 7 · mobile-adm 0 · server 0 · core 11 (todos herdados); suítes core 5830/245 · functions 1688/49 · mobile-adm 2731/176 · backoffice 5353/306 · store 3206/132 + 4144/264, todas exit 0; migration aplicada no banco local e probe SQL ok
Árvore de trabalho: a lista de "Arquivos alterados" do relatório (migration 20261130130000_102-campanha-no-pedido.sql, _shared/campaigns.ts, pricing/rules/summary em core, as duas functions, a sacola e o checkout da loja, o resumo do pedido na loja, no painel, no app e no e-mail); nada commitado
Citações conferidas: 9 abertas; deslocaram checkout/handlers.ts:276-301 (COLUNAS_DA_MARCA/linhaDoItem), mercado-pago/handlers.ts:798-846 (~807-850) e lockedFirstCharge (~1404); nenhuma morta
Propagado: 08 e 09 — a assinatura de `_shared/campaigns.ts` (`liveCampaignMarks`) e, na 09, a entrada `campaign` de `resolveOrderPricing` e o contexto de `couponRefusal`
```

## T05 — wi-impl-review · fixing · agente ace4a73d47781a00a

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/05-sacola-e-checkout.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | comportamento sem teste | atrapalha | apps/store/src/pages/CheckoutPage.tsx:606-615 e :818 | Nenhum teste monta a página do checkout para o 422 do `create-order`. O caminho `OrderDiscountChangedError` → `buyTogether.refresh()` → `PriceChangedCheckout` com `total = priceChanged.total ?? totals.total` não tem teste. `useOrders.test.tsx` só prova que o 422 vira a classe de erro. Nada prova que a tela mostra o total recalculado. | Testes › "Página real (jsdom): … o checkout relê ao voltar o foco e o 422 mostra o total novo" |
| 2 | nível trocado | atrapalha | apps/store/src/entities/cart/api/__tests__/useCartCatalog.test.tsx:83 | A releitura ao voltar o foco é provada só no nível do hook (`renderHook(useCartCatalog)`). O checkout real não é montado. | Testes › "Página real (jsdom): … o checkout relê ao voltar o foco" |
| 3 | comportamento sem teste | atrapalha | (nenhum arquivo) `.specs/work-items/102-desconto-de-campanha/probes/` | Não há probe HTTP `create-order` → `create-payment`. A pasta tem só 01–04, e `sem mutação` lista a fatia 22 como "não rodado". | Testes › "Probe HTTP local: `create-order` → `create-payment` dentro e fora da vigência e com corpo forjado"; Pronto quando › "CA-13, CA-16 e CA-17 provados por teste e pelo probe HTTP" |
| 4 | identificador de processo | atrapalha | supabase/functions/mercado-pago/handlers.ts:585 | O comentário de código cita a chave de decisão do Work Item: "A campanha GRAVADA na linha pelo `create-order` (D-05)". | regra do workflow: identificador de processo não entra no código |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| CA-03, CA-04 e CA-07 na sacola, no checkout e no servidor | `pricing.ts` (`campaign`, `applyCampaign`); `cartPricingItem`/`campaignPricing.ts`; `useCartCatalog` + `syncCatalog`; `CartDrawerRow`/`OrderSummary` (de/por + `CampaignBadgeInline`); `campanhaDoPedido` (create-order); `campanhaDaLinha` (create-payment). Testes: `campaignDiscount.test.ts`, `sacolaCampanha.test.tsx`, `createOrderCampanha.test.ts` (antes/depois) | sim |
| CA-13, CA-16 e CA-17 provados por teste e pelo probe HTTP | Por teste: `campaignDiscount.test.ts`, `rules.test.ts`, `createOrderCampanha.test.ts`, `campaignCharge.test.ts`. O probe HTTP não existe (achado 3) | não (falta a metade do probe) |
| a migration aplicada no banco local | `20261130130000_102-campanha-no-pedido.sql` (a premissa 15 relata o `migration up --local --include-all`) | só execução |
| cada comportamento do bloco `Testes` coberto por um teste escrito | quase todos; faltam os itens dos achados 1, 2 e 3 | não |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- `payment/**` muda, com `displayedEqualsCharged.test.ts` e a suíte de `payment` sem perder caso: `pricing.ts` mudou. A suíte só ganhou casos: `campaignDiscount.test.ts` é novo, e em `manualDiscount.test.ts` só a âncora do `denoReach` ganhou `campaigns/price.ts`. Nenhum caso foi removido. Que os testes passam, só a execução prova.
- `.ts` explícito em tudo que as functions importam: aplicada. São `pricing.ts` → `../campaigns/price.ts`, `_shared/campaigns.ts` → `.../campaigns/live.ts`, `checkout/handlers.ts` → `campaigns/price.ts` e `mercado-pago` → `coupons/rules.ts`. Os `denoReach` de `coupons` e `campaigns` já existem.
- `pedidoComDonoUnico`, `pedidoGravadoSoPeloDono`, `orderNumberSchema` e `situacaoComDonoUnico` verdes: nenhuma escrita nova em `orders` pelo PostgREST nos apps. Que fiquem verdes, só a execução prova.
- `quotePayload.test.ts` com o seguro pelo preço relido, por unidade: o caso está em `apps/store/src/entities/cart/lib/__tests__/toQuotePayload.test.ts` (`syncCatalog` → `insurance_value` 167,92 com quantidade 2).
- Só esta tarefa edita os tipos de pedido de `packages/supabase/src/types/` e cria migration com hora 13: os dois arquivos de tipos estão no diff, e a migration é `20261130130000`.

## Testes

- Unidade (`payment`), sem `campaign` a saída é idêntica: `campaignDiscount.test.ts` compara com `toEqual` e afirma `not.toHaveProperty('campaignDiscount')`. Morde.
- CA-03 (167,92 antes de PIX, cupom e frete) e o "de/por" pelo menor: morde.
- CA-16, cupom de 10% só na peça comum, cupom de valor limitado às comuns, frete grátis e PIX: em `campaignDiscount.test.ts`. A recusa com "Black Friday" e o mínimo só nas comuns estão em `rules.test.ts`. Morde.
- CA-17, a faixa não alcançada e o casado como adicional e como principal: morde. Remover o filtro `hasCampaign` dos segmentos reprova o caso "como principal". O título desse caso promete também que o adicional comum recebe o casado, e isso não é afirmado.
- O bump numa peça de campanha cobra o menor, e `campaignDiscount` fica fora do resíduo do bump (`resolveOrderLines`): morde.
- Handlers `checkout` (`createOrderCampanha.test.ts`): grava a campanha resolvida; `linhaDoItem` não copia a campanha do corpo; 422 quando a campanha acabou, sem nada gravado; com a campanha começada, grava a do servidor; antes e depois da vigência, nada. Morde. O caso "corpo forjado" cai no 422, então ele não prova o descarte de `campaign_discount: 999`. Esse descarte vem da atribuição `pedido.campaign_discount = campanha.desconto`.
- Handlers `mercado-pago` (`campaignCharge.test.ts`): aplica a campanha gravada depois do fim; teto com 422 antes de cobrar; `min_order` vira `null`; trava na primeira cobrança; pagar de novo com o travado. Morde. "Linha partida em `regravarLinhas` preserva a campanha" é coberta só pela junção e pela ausência de chaves de campanha no update, conforme a premissa 16. A cópia em `SNAPSHOT_DA_LINHA` não tem teste.
- Guarda `chavesDoItemDoPedido.test.ts`: tem as duas formas e os sensores. Morde.
- Guarda de schema `campanhaNoPedidoSchema.test.ts`: uma régua por comando e `mutar()` que lança. Morde.
- `wiringResolve` e `denoReach`: já existem. Não houve `index.ts` alterado.
- Página real, a sacola com peça posta antes do início: `sacolaCampanha.test.tsx` usa a gaveta real e a leitura real. Morde.
- Página real, a frase da próxima faixa ignora a peça de campanha: em `sacolaCampanha.test.tsx`. Morde, mas fracamente, por `/2/` no texto.
- Página real, o checkout relê no foco e o 422 mostra o total novo: falta (achados 1 e 2).
- Resumo do pedido com a linha de campanha: na loja, `OrderItemsSummary.test.tsx` (componente) e `summary.test.ts`; no painel, `AdminOrderPage.campanha.test.tsx` (página real); no app, `pedidoDescontoCampanha.test.tsx`. Morde.
- Probe HTTP local: falta (achado 3).

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `campaign: { percent, compare_price? }`, com `unit_price` igual ao preço de tabela | sim | Contrato (`{ percent }`); RN-06 precisa do "de"; molde de `manualDiscount`/`buyTogether` | sim (a tarefa 09 o repete na linha 51) |
| 2 | Só é linha de campanha quando a campanha baixa o preço (`lineCampaignPercent`) | sim | O mapeador da tarefa 04 só marca nesse caso; `campaignUnitPrice.discounted` | sim |
| 3 | `campaignDiscount` só aparece quando alguma linha trouxe `campaign` | sim | Contrato: "sem `campaign`, saída idêntica, inclusive a forma" | sim |
| 4 | Com a oferta mais barata, o desconto fica com a oferta | sim | `AD-015` (packages/core/CLAUDE.md › Dinheiro: "vence o menor preço") | sim |
| 5 | A alocação do Compre Junto roda como antes e descarta os segmentos da peça de campanha | sim | H-01 ("`buyTogetherDiscountedPrice` não muda; a peça de campanha sai do casado") | sim |
| 6 | `couponRefusal` com `eligibleSubtotal`/`campaignName`; frete grátis passa; recusa antes do mínimo | sim | RN-16/D-06 e T10 | sim (a tarefa 09 o consome) |
| 7 | O 422 do `create-order` vai com `total: null`, e a loja usa o total recalculado | sim | H-05 (mesmo código e corpo); o `create-order` não reprecifica | sim. A tela não tem teste (achado 1) |
| 8 | `orders.campaign_discount` calculado pelo `create-order` sobre o preço de tabela do banco | sim | H-05 ("`orders.campaign_discount` é calculado pelo servidor"), casado com a atribuição da premissa 4 | sim |
| 9 | O `mercado-pago` lê o "de" do banco | sim | T2 ("O recálculo passa a ler `original_price`/`compare_price`") | sim |
| 10 | `useCartCatalog` dentro de `useCartBuyTogether`, e `syncCatalog` regrava `unitPrice` e `campaign` | sim | T1 (sem migração de `version`; a mesma releitura alimenta o frete por faixa e o seguro); o import profundo de `mapProduct` tem precedente em `useRecoverCart.ts:11` e evita o ciclo product↔cart | sim |
| 11 | `campaign_percent` só nas linhas de campanha | sim | O guarda `chavesDoItemDoPedido` cobra as duas formas | sim |
| 12 | `campaign_discount` gravado só com campanha ou com o travado tendo a coluna | sim | "sem campanha, saída idêntica" | sim |
| 13 | `first_order_only` forçado a `false` no `mercado-pago` | sim | T10 pede só `min_order` | sim |
| 14 | Linha genérica "Desconto de campanha", também no e-mail | sim | O resumo parte do preço cheio (`summary.ts`); o pedido não guarda o nome | sim (loja, painel, app e `send-notification` estão no diff) |
| 15 | Prefixo `20261130130000`, aplicado com `--include-all` | sim | H-12 ("a partir de `20261130130000`"); Obrigações (só esta tarefa usa hora 13); `ls supabase/migrations` | sim |
| 16 | A linha de campanha não se parte; a cópia em `SNAPSHOT_DA_LINHA` é defensiva | sim | Com a faixa e o casado excluídos, nada parte a linha de campanha | sim |

## Não conferido

- O diretório inteiro `.specs/work-items/102-desconto-de-campanha/` está untracked (`??`). Por isso as propagações para `tasks/08-feed-do-google-e-json-ld.md` e `tasks/09-pedido-montado-com-a-campanha.md` não têm baseline: não há como provar o que mudou nelas. Li só as linhas que citam a tarefa 05, e elas batem com a forma entregue.
- Nada que só a execução prova: suítes verdes, `displayedEqualsCharged.test.ts`, a migration aplicada no local, `tsc` e lint.
- O `couponEligibleSubtotal` do `mercado-pago` é calculado sem `buyTogether`, e o da loja com ele. Com Compre Junto no pedido, o servidor confere o mínimo sobre uma base maior, ou seja, mais leniente. Não virou achado: não há regra escrita que fixe essa forma.
- Em `apps/store/src/pages/CheckoutPage.tsx` ~600-605, o comentário da recusa de retirada ("Feature 63…") ficou acima do novo bloco de campanha, separado do `if` que ele descreve. É estilo de comentário, não é classe de achado.
- Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (o defeito 01, Convenções, Os guardas, Baselines, CI e deploy, Feature-Sliced Design / Alias de import, carregado inteiro no contexto); `packages/core/CLAUDE.md` › Dinheiro (e o índice de títulos); `supabase/CLAUDE.md` › Migrations (o começo) e o índice de títulos. Não li `apps/store/CLAUDE.md` › A listagem / Carrinho, chrome e checkout / A sacola v4, `packages/core/CLAUDE.md` › Pureza, `supabase/CLAUDE.md` › RLS / Compre Junto, nem `apps/mobile-adm/CLAUDE.md` › Montar pedido.

## T05 — wi-impl-task · done · agente a906fde1d4e758368

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/05-sacola-e-checkout.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 17 | O teste de página do checkout mora em `apps/store/src/test/checkoutCampanha.test.tsx` | `pages/__tests__/` (cerca da tarefa 06), `pages/` (o `routeSplitting.test.ts` conta todo `.tsx` de `pages/` como página e reprovou), `features/checkout/__tests__/` (aviso de fronteira FSD `features` → `pages`) | É o único lugar que não esbarra na cerca, nem num guarda, nem no lint | só o arquivo de teste |
| 18 | O probe HTTP foi escrito (`probes/05-sacola-e-checkout.sh`) e não foi executado | servir as functions e rodá-lo | `supabase functions serve` é um processo que fica rodando (regra 8), e o edge runtime local está parado | a Validation ou o humano precisa rodá-lo (ver `Ao humano`) |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 14' | O checkout relê o catálogo ao voltar o foco: a campanha que começou aparece no resumo e no total | página real (`CheckoutPage` + leitura real da sacola) | apps/store/src/test/checkoutCampanha.test.tsx | sim | vermelho (`staleTime` de volta a 5 min) |
| 15' | O 422 do `create-order` relê a sacola e mostra como "Agora" o total recalculado pela tela; nada é gravado | página real | apps/store/src/test/checkoutCampanha.test.tsx | sim | vermelho (`total = displayedTotal`); **ficou verde** sem o `buyTogether.refresh()` |
| 22 | Probe HTTP `create-order` → `create-payment`: dentro e fora da vigência, e com corpo forjado | integração local | .specs/work-items/102-desconto-de-campanha/probes/05-sacola-e-checkout.sh | não rodado (só `bash -n`) | não se aplica |

## Arquivos alterados

packages/core/src/payment/pricing.ts alterado
packages/core/src/payment/__tests__/campaignDiscount.test.ts criado
packages/core/src/payment/__tests__/manualDiscount.test.ts alterado
packages/core/src/coupons/rules.ts alterado
packages/core/src/coupons/__tests__/rules.test.ts alterado
packages/core/src/hooks/useCoupons.ts alterado
packages/core/src/orders/summary.ts alterado
packages/core/src/orders/__tests__/summary.test.ts alterado
packages/supabase/src/types/index.ts alterado
packages/supabase/src/types/coupon.ts alterado
supabase/migrations/20261130130000_102-campanha-no-pedido.sql criado
supabase/functions/_shared/campaigns.ts criado
supabase/functions/_shared/__tests__/campaigns.test.ts criado
supabase/functions/checkout/handlers.ts alterado
supabase/functions/checkout/__tests__/createOrderCampanha.test.ts criado
supabase/functions/mercado-pago/handlers.ts alterado
supabase/functions/mercado-pago/__tests__/campaignCharge.test.ts criado
supabase/functions/send-notification/dispatch.ts alterado
supabase/functions/send-notification/handlers.ts alterado
supabase/functions/send-notification/render/layout.ts alterado
apps/store/src/entities/cart/api/useCartCatalog.ts criado
apps/store/src/entities/cart/api/__tests__/useCartCatalog.test.tsx criado
apps/store/src/entities/cart/api/useCartBuyTogether.ts alterado
apps/store/src/entities/cart/api/__tests__/useCartBuyTogether.test.tsx alterado
apps/store/src/entities/cart/lib/campaignPricing.ts criado
apps/store/src/entities/cart/lib/buyTogetherPricing.ts alterado
apps/store/src/entities/cart/lib/__tests__/toQuotePayload.test.ts alterado
apps/store/src/entities/cart/model/cartStore.ts alterado
apps/store/src/entities/cart/model/useCartPromotion.ts alterado
apps/store/src/entities/cart/index.ts alterado
apps/store/src/entities/order/api/useOrders.ts alterado
apps/store/src/entities/order/api/__tests__/useOrders.test.tsx alterado
apps/store/src/entities/order/ui/OrderItemsSummary.tsx alterado
apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx alterado
apps/store/src/features/apply-coupon/ui/CouponInput.tsx alterado
apps/store/src/features/checkout/lib/buildOrderPayload.ts alterado
apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts alterado
apps/store/src/features/checkout/lib/__tests__/chavesDoItemDoPedido.test.ts alterado
apps/store/src/features/checkout/model/useCheckoutTotals.ts alterado
apps/store/src/features/checkout/ui/OrderSummary.tsx alterado
apps/store/src/pages/CheckoutPage.tsx alterado
apps/store/src/shared/lib/__tests__/campanhaNoPedidoSchema.test.ts criado
apps/store/src/test/checkoutCampanha.test.tsx criado
apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx alterado
apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaCampanha.test.tsx criado
apps/backoffice/src/pages/admin/AdminOrderPage.campanha.test.tsx criado
apps/mobile-adm/src/entities/order/model/linha.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/usePedido.test.tsx alterado
apps/mobile-adm/src/test/pedidos.ts alterado
apps/mobile-adm/src/pages/__tests__/pedidoDescontoCampanha.test.tsx criado
.specs/work-items/102-desconto-de-campanha/probes/05-sacola-e-checkout.sh criado
.specs/work-items/102-desconto-de-campanha/tasks/08-feed-do-google-e-json-ld.md alterado
.specs/work-items/102-desconto-de-campanha/tasks/09-pedido-montado-com-a-campanha.md alterado

Tocados por esta correção:
- `apps/store/src/test/checkoutCampanha.test.tsx`
- `.specs/work-items/102-desconto-de-campanha/probes/05-sacola-e-checkout.sh`
- `supabase/functions/mercado-pago/handlers.ts` (só o comentário)

## Verificação

Comandos da seção `Comandos de verificação` do `PROJECT.md`.

- `pnpm --filter @estrelinha/store exec vitest run src/test/checkoutCampanha.test.tsx --testTimeout=20000`: 2/2, exit 0. Mais três checks de mutação no `CheckoutPage.tsx` e no `useCartCatalog.ts` reais, restaurados por cópia e conferidos com `cmp`:
  - o total que a tela mostra como "Agora" (`?? displayedTotal`): vermelho
  - o `staleTime` de volta a 5 minutos: vermelho
  - sem o `buyTogether.refresh()`: ficou verde
- `pnpm --filter @estrelinha/functions exec vitest run functions/mercado-pago`: 286/286, exit 0 (depois do comentário).
- `pnpm --filter @estrelinha/store exec vitest run src/features/checkout src/pages/__tests__/CheckoutPage.test.tsx --testTimeout=20000`: 628/628, exit 0.
- `src/pages`, `src/app`, `src/shared` e `src/test` da loja:
  - por diretório: 930, 298, 3141 e 3, todos exit 0
  - juntos: 4372/4372 verdes, mas exit 1 nas duas rodadas, por `[vitest-worker]: Timeout calling "onTaskUpdate"` — a assinatura de contenção que o `CLAUDE.md` já registra (2026-11-09), não falha de teste
- `npx tsc --noEmit -p apps/store/tsconfig.app.json`: 0 erros, igual à baseline.
- `npx eslint src/test/checkoutCampanha.test.tsx` (`CLAUDE.md`): 0/0.
- `bash -n` no probe: sintaxe ok. **O probe não foi executado.**

Instruções lidas: as da implementação, já no contexto. Nada relido nesta correção.

## Divergências e descobertas

- **Check de mutação que ficou verde:** tirar o `buyTogether.refresh()` do ramo do `OrderDiscountChangedError` não derruba o teste. Na árvore do jsdom alguma outra coisa relê a consulta da sacola (`staleTime: 0`). Não isolei a causa; minha hipótese é um observador novo montando. O `refresh` fica como garantia, mas nenhum teste o prova sozinho.
- O teste de página precisou de um lugar fora de `pages/`: o `routeSplitting.test.ts` trata todo `.tsx` em `pages/` como página `lazy` e reprovou. Por isso ele mora em `src/test/`.
- O identificador `D-05` saiu do comentário de código. O probe, que é artefato do Work Item em `.specs/`, continua citando os critérios (regra 9).

## Ao humano

- **Achado 3 (probe HTTP): apliquei pela metade, e a outra metade eu julgo fora do que posso fazer.** O script `.specs/work-items/102-desconto-de-campanha/probes/05-sacola-e-checkout.sh` existe e cobre:
  - em vigência: a campanha gravada pelo servidor e o `orders.campaign_discount`
  - corpo forjado: 422 e nada gravado
  - campanha encerrada: 422 exibindo a campanha, pedido sem campanha sem exibir
  - pago depois do fim: a campanha gravada vale, e o cupom de 10% desconta só a comum

  O que falta é rodá-lo, e para isso é preciso deixar `supabase functions serve --env-file <chaves externas inválidas>` rodando. Minhas regras proíbem subir processo que fica rodando, e o edge runtime local está parado (`supabase status`). Quem tiver o serve de pé roda `bash .specs/work-items/102-desconto-de-campanha/probes/05-sacola-e-checkout.sh`. O script recusa sozinho se as functions não responderem, e apaga o que criou.
- **Ressalva do script:** ele nunca foi executado, então a limpeza da convidada (`customers`, `auth.users`) e os valores esperados ainda não foram vistos contra o banco real.

## O que devolver no fim

```
Tarefa: 05
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/store/CLAUDE.md › A listagem de categoria / os filtros · Carrinho, chrome e checkout · A sacola v4; packages/core/CLAUDE.md › Dinheiro · Pureza; supabase/CLAUDE.md › Migrations · RLS — o molde que os guardas cobram · Compre Junto; apps/mobile-adm/CLAUDE.md › Montar pedido (WI 94); .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos:
  - payment: packages/core/src/payment/__tests__/campaignDiscount.test.ts (sem campanha idêntico, CA-03, RN-06, CA-16, CA-17, bump cobra o menor, campaignDiscount fora do resíduo do bump)
  - cupom: packages/core/src/coupons/__tests__/rules.test.ts
  - handlers checkout: supabase/functions/checkout/__tests__/createOrderCampanha.test.ts
  - handlers mercado-pago: supabase/functions/mercado-pago/__tests__/campaignCharge.test.ts
  - leitor das functions: supabase/functions/_shared/__tests__/campaigns.test.ts
  - guardas: chavesDoItemDoPedido.test.ts; denoReach em manualDiscount.test.ts; campanhaNoPedidoSchema.test.ts; wiringResolve verde
  - página real: sacolaCampanha.test.tsx (releitura da sacola, campanha que acabou, frase da faixa); apps/store/src/test/checkoutCampanha.test.tsx (o checkout relê ao voltar o foco; o 422 do create-order mostra o total novo); resumo do pedido na loja (OrderItemsSummary.test.tsx), no painel (AdminOrderPage.campanha.test.tsx) e no app (pedidoDescontoCampanha.test.tsx)
  - hooks: useCartCatalog.test.tsx, useOrders.test.tsx
  - sem cobertura: o probe HTTP está escrito (probes/05-sacola-e-checkout.sh) mas não rodou — precisa das functions servidas no local; o `refresh` do ramo do 422 não é discriminado por teste (check de mutação ficou verde)
Verificações: tsc store 0 · backoffice 7 · mobile-adm 0 · server 0 · core 11 (todos herdados); suítes core 5830/245 · functions 1688/49 · mobile-adm 2731/176 · backoffice 5353/306 · loja verde por diretório; na correção, o teste de página 2/2, o checkout 628/628 e o mercado-pago 286/286; migration aplicada no banco local e probe SQL ok
Árvore de trabalho: a lista de "Arquivos alterados" (implementação e correção); nada commitado
Citações conferidas: 9 abertas; deslocaram checkout/handlers.ts:276-301, mercado-pago/handlers.ts:798-846 e lockedFirstCharge; nenhuma morta
Propagado: 08 e 09 — a assinatura de `_shared/campaigns.ts` e, na 09, a entrada `campaign` de `resolveOrderPricing` e o contexto de `couponRefusal`
```

## T08 — wi-impl-task · review · agente a860a0f921fffdf91

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/08-feed-do-google-e-json-ld.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O feed descobre a vigência (`starts_at`/`ends_at`) com uma leitura de `campaigns` filtrada pelo `id` que `liveCampaignMarks` já escolheu. A leitura confere de novo, com `isCampaignLive`, no mesmo instante. Se a campanha mudou entre as duas leituras, lança e o feed responde 503. Isso mora em `readFeedCampaign` (`google-feed/handlers.ts`). | Mudar `_shared/campaigns.ts` para devolver a vigência (o contrato diz "Consuma; não altere"). Também descartei uma segunda decisão de vigência fora de `core/campaigns/live.ts`. | O contrato do leitor devolve só `{ id, name }`, e o `g:sale_price_effective_date` precisa da vigência. Quem decide a vigência continua sendo o leitor único (H-06); a leitura nova só busca as colunas da campanha que ele já escolheu. | `google-feed/handlers.ts`. Se o leitor passar a devolver a vigência, esta leitura vira redundante e pode sair. |
| 2 | As ids das peças vão ao leitor em lotes de 150 (`FEED_CAMPAIGN_CHUNK`), com o relógio fixado uma vez para todos os lotes. Se a campanha muda entre lotes, lança. | Uma chamada só com o catálogo inteiro. | Seriam cerca de 700 UUIDs (~26 KB) na URL do `in.(…)` do PostgREST, perto do limite de linha de requisição dos proxies. | `google-feed` |
| 3 | Se a leitura da campanha falha, o feed responde 503 sem XML e não grava `last_fetched_at`. | Publicar o feed sem a campanha. | Sem a campanha, o feed anunciaria o preço cheio enquanto a página mostra o da campanha. O Merchant Center reprova essa diferença. Erro nunca vira "sem campanha", como `_shared/campaigns.ts` já faz. | `google-feed` |
| 4 | O `g:sale_price_effective_date` é `início/fim` em UTC com `Z` e sem milissegundo (`2026-11-13T03:00:00Z/2026-12-01T03:00:00Z`). O fim é o `ends_at` exclusivo do banco. Uma ponta ilegível omite a tag, sem lançar. | O fuso `-03:00`; o fim menos 1 minuto; recusar o feed inteiro. | Os dois formatos valem como ISO 8601. O fim exclusivo é o instante exato em que o preço deixa de valer. Derrubar o catálogo por um texto torto custaria mais que a tag faltando. | `shopping/xml.ts`, feed |
| 5 | O JSON-LD ganha `offers.priceValidUntil` com o último dia que vale, em Brasília: `storeLocalInput(lastMinuteOf(ends_at))` cortado em `AAAA-MM-DD`, por exemplo `2026-11-30`. Só aparece quando o "por" vem da campanha. | Não declarar vigência no JSON-LD; ou usar o dia UTC do `ends_at`. | O objetivo da tarefa pede o preço e a vigência nas duas superfícies. O dia UTC do fim exclusivo marcaria um dia a mais. Uso `lastMinuteOf`, que já é o dono da conversão do fim exclusivo. | `shopping/jsonld.ts`, página servida. O grafo Deno de `core/seo` não ganhou arquivo por isso: `campaigns/end.ts` e `time/local.ts` já estavam lá. |
| 6 | Quando a campanha não baixa o preço de hoje (o "de/por" já é menor), a oferta fica exatamente como era, sem `saleEffective` e sem `priceValidUntil`. Quando baixa, `g:price` é o cheio (o "de" quando ele é maior, senão o preço de hoje) e `g:sale_price` é o da campanha. | Mandar a vigência também no "de/por" vencedor. | O "de/por" vale sem prazo; a regra é do `campaignUnitPrice` (o menor, sem somar descontos). Fica um caso residual: uma peça com "de/por" em que a campanha vence. Depois do fim da campanha, o Google pode mostrar o "de" até o próximo feed, porque a vigência já passou. É aceito por H-11 (cache na virada). | `shopping/pricing.ts` |
| 7 | `saleEffective` é opcional no `ShoppingOffer` e só existe com campanha. `offerPricing` só devolve a chave nesse caso. | Devolver `saleEffective: null` sempre. | Sem campanha, a saída fica byte a byte igual à de antes, e os testes antigos com `toEqual` não precisaram mudar. | `ShoppingOffer` (consumido por feed e página) |
| 8 | Em `api/page`, a campanha da peça vem do embed `product_campaigns(percent,campaigns(starts_at,ends_at))` (`COLUNAS_CAMPANHA_DA_PECA`). Ela só entra em `ProductPageData.campaign` quando o percentual é válido e a campanha veio embutida; senão a chave não existe. | Uma leitura separada de `campaigns`. | Uma leitura só, e a RLS já filtra pela vigência do banco (a página não decide relógio). Com a chave ausente, o `toEqual` antigo do `readProduct` continuou valendo. | `apps/store/server/page.ts`, `core/page/serve.ts` (`ProductPageData`) |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `offerPricing` com campanha: `salePrice` igual ao da página e a vigência junto | domínio | `packages/core/src/shopping/__tests__/pricing.test.ts` | sim | — |
| 2 | `offerPricing`: o "de/por" que vence a campanha continua o de sempre, sem os dois descontos somados (CA-06, o menor) | domínio | idem | sim | vermelho (com `discounted` forçado a `true`) |
| 3 | `offerPricing` sem campanha: igual a hoje; linha sem preço continua sem preço | domínio | idem | sim | mutação não feita: é o comportamento antigo, de controle. Sem a guarda de `price != null` a saída é a mesma, porque `discounted` já cobre o caso |
| 4 | `xml.ts` emite `g:sale_price_effective_date` só com campanha | domínio | `packages/core/src/shopping/__tests__/xml.test.ts` | sim | — (o caso com campanha viu o vermelho). O caso da vigência ilegível: vermelho (sem a recusa da ponta ilegível) |
| 5 | Paridade feed × JSON-LD com campanha: o mesmo preço cobrado, a vigência no feed e o `priceValidUntil` na página | domínio | `packages/core/src/shopping/__tests__/shoppingParity.test.ts` | sim | — nos casos com campanha. O caso "de/por vence": vermelho (com `discounted` forçado a `true`). O caso sem campanha é controle, sem mutação |
| 6 | Handler do `google-feed`: com o relógio dentro da vigência, `sale_price` e `sale_price_effective_date` por variação marcada; fora (antes do início e no instante do fim), nada; falha na leitura da campanha dá 503; lotes | aplicação | `supabase/functions/google-feed/__tests__/handlers.test.ts` | sim | — nos casos novos. O caso "fora da vigência" passou de primeira; vermelho com o relógio injetado trocado por um fixo |
| 7 | `serve.ts`: o JSON-LD do produto marcado leva o preço da campanha (com e sem `?variant=`), igual ao `sale_price` do feed, e o `priceValidUntil` | aplicação | `packages/core/src/page/__tests__/serve.test.ts` | sim | — nos casos com campanha. O caso sem marcação: vermelho (com uma campanha padrão injetada no contexto) |
| 8 | `page.ts`: o embed das marcações vigentes vira a campanha da peça; marcação ausente, nula ou torta não vira campanha | aplicação | `apps/store/server/__tests__/page.test.ts` | sim | — |
| 9 | O grafo Deno de `core/seo` sobe para 23 arquivos com `campaigns/price.ts`, todos com `.ts` explícito e sem import de pacote | guarda | `packages/core/src/seo/__tests__/denoReach.test.ts` | sim | — (vermelho com 23 ≠ 22 antes de subir a âncora) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

packages/core/src/shopping/types.ts — alterado
packages/core/src/shopping/pricing.ts — alterado
packages/core/src/shopping/offer.ts — alterado
packages/core/src/shopping/xml.ts — alterado
packages/core/src/shopping/jsonld.ts — alterado
packages/core/src/shopping/index.ts — alterado
packages/core/src/shopping/__tests__/pricing.test.ts — alterado
packages/core/src/shopping/__tests__/xml.test.ts — alterado
packages/core/src/shopping/__tests__/shoppingParity.test.ts — alterado
packages/core/src/page/serve.ts — alterado
packages/core/src/page/__tests__/serve.test.ts — alterado
packages/core/src/seo/__tests__/denoReach.test.ts — alterado
supabase/functions/google-feed/handlers.ts — alterado
supabase/functions/google-feed/index.ts — alterado
supabase/functions/google-feed/__tests__/handlers.test.ts — alterado
apps/store/server/page.ts — alterado
apps/store/server/__tests__/page.test.ts — alterado

## Verificação

- Tipos (origem: `CLAUDE.md` §Comandos):
  - `npx tsc --noEmit -p packages/core/tsconfig.json`: 11 erros, idênticos ao baseline que medi antes da primeira fatia (mesmos arquivos, códigos e contagem; os 11 herdados).
  - `npx tsc --noEmit -p apps/store/tsconfig.app.json`: 0, baseline 0.
  - `npx tsc --noEmit -p apps/store/tsconfig.server.json`: 0, baseline 0.
- Um arquivo de teste (origem: `PROJECT.md` §Comandos de verificação): `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`, por fatia. Tudo verde: core (`shopping`, `page`, `seo`, `campaigns`, `sitemap`), functions (`google-feed`, `_shared`, inclusive `wiringResolve`), store (`server/__tests__`, `paginaDeOpcaoComDonoUnico`, `paginasFixasServidas`).
- Verificação mínima (origem: `CLAUDE.md` §Baselines): a suíte de cada workspace tocado, exit fora de pipe.
  - core: 5858/245, exit 0.
  - functions: 1701/49, exit 0.
  - store: 7374/399, todos os testes passando, mas exit 1 nas duas execuções, por um único "Unhandled Error: [vitest-worker]: Timeout calling "onTaskUpdate"". É contenção do worker, não teste reprovado: o `CLAUDE.md` registra a mesma assinatura no WI 98, e a tarefa 09 rodava ao mesmo tempo na mesma árvore.
- `npx eslint server/page.ts server/__tests__/page.test.ts` (apps/store): 0.
- Probe local (rule 10): `GET /rest/v1/products?select=slug,product_campaigns(percent,campaigns(starts_at,ends_at))` com a chave publicável no Supabase local (:54441) respondeu 200 com a forma esperada. O embed e as colunas resolvem pela RLS.

Instruções lidas: `CLAUDE.md` (raiz, idêntico ao do repositório principal; seções O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy, Feature-Sliced Design / Alias de import); `packages/core/CLAUDE.md` › topo, Quando pertence, Pureza, Dinheiro, `shopping`; `apps/store/CLAUDE.md` › O HTML servido — a função `api/page`; `supabase/CLAUDE.md` › Edge functions e `google-feed` e `product-page`; `.specs/project/PROJECT.md` › Comandos de verificação e Ambiente local.

## Divergências e descobertas

- **A âncora do `denoReach` já era 22, não 15.** A tarefa 06 já tinha subido o número. Com `campaigns/price.ts`, o valor medido é 23, e a lista de alvos ganhou `campaigns/price.ts`.
- **O contrato de `_shared/campaigns.ts` não devolve a vigência**, e o feed precisa dela. Resolvi sem alterar o leitor (premissa 1).
- **Citação deslocada.** A tarefa cita `offer.ts:176-188` para `resolveOffer`; relocalizei pelo nome, sem mudança de forma.
- **Fatias que passaram de primeira** (todas unitárias ou de aplicação sem infraestrutura) levaram o check de mutação, com o resultado na tabela `Fatias`. Nenhum mutante ficou verde. Na fatia 3, a guarda de `price != null` é redundante com `discounted`; isso é registro, não defeito.
- **Store: exit 1 sem teste reprovado**, pelo `Timeout calling "onTaskUpdate"` do worker, duas vezes seguidas (contenção).
- **O que só a execução prova e ficou sem ela.** O banco local não tem campanha em vigência, e criar uma não é desta tarefa. Por isso não rodei contra o banco:
  - a RLS entregando a marcação com a campanha embutida;
  - o `google-feed` servido de verdade.

  A forma do embed foi provada contra o local (200). O handler foi provado com o dublê de `_shared/testing`, que enxerga `.eq` e `.in`.
- **Residual da premissa 6.** Numa peça com "de/por" em que a campanha vence, o Google pode mostrar o "de" entre o fim da campanha e a próxima leitura do feed. É aceito por H-11.
- Nada a propagar: a tarefa 09 não afirma nada sobre feed, `offerPricing`, `ProductPageData` ou a âncora do `denoReach`.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 08
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01" · Convenções · Os guardas · Baselines · CI e deploy · FSD/Alias; packages/core/CLAUDE.md › topo, Quando pertence, Pureza, Dinheiro, `shopping`; apps/store/CLAUDE.md › O HTML servido (`api/page`); supabase/CLAUDE.md › Edge functions, `google-feed` e `product-page`; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - core/shopping offerPricing com campanha, sem campanha e CA-06 (o menor): packages/core/src/shopping/__tests__/pricing.test.ts
  - shoppingParity com campanha (o mesmo preço cobrado, a vigência no feed, priceValidUntil na página, o "de/por" que vence e sem campanha): packages/core/src/shopping/__tests__/shoppingParity.test.ts
  - xml.ts emite g:sale_price_effective_date só com campanha (e omite a vigência ilegível): packages/core/src/shopping/__tests__/xml.test.ts
  - handler do google-feed dentro e fora da vigência (antes do início e no instante do fim), as marcações pedidas só para as peças do feed, 503 na falha da leitura da campanha, lotes: supabase/functions/google-feed/__tests__/handlers.test.ts
  - serve.ts, JSON-LD do produto marcado com o preço da campanha (com e sem ?variant=), igual ao sale_price do feed: packages/core/src/page/__tests__/serve.test.ts
  - page.ts, o embed das marcações vira a campanha da peça: apps/store/server/__tests__/page.test.ts
  - denoReach, âncora 22 ⇒ 23 com campaigns/price.ts: packages/core/src/seo/__tests__/denoReach.test.ts
  - paginaDeOpcaoComDonoUnico e wiringResolve verdes, sem caso novo
  - Sem cobertura de execução real: a RLS entregando uma campanha em vigência no embed e o feed servido (o banco local não tem campanha em vigência)
Verificações: tsc core 11 (= baseline), store app 0, store server 0; core 5858/245 exit 0; functions 1701/49 exit 0; store 7374/399 todos verdes, exit 1 só por "Timeout calling onTaskUpdate" do worker (contenção); eslint de server/page.ts 0; probe do embed contra o Supabase local 200
Árvore de trabalho: packages/core/src/shopping/{types,pricing,offer,xml,jsonld,index}.ts e os testes pricing/xml/shoppingParity; packages/core/src/page/serve.ts e serve.test.ts; packages/core/src/seo/__tests__/denoReach.test.ts; supabase/functions/google-feed/{handlers,index}.ts e handlers.test.ts; apps/store/server/page.ts e __tests__/page.test.ts. Nada commitado.
Citações conferidas: 9 abertas (pricing.ts:48, offer.ts:176-188, shoppingParity.test.ts, xml.ts, google-feed/index.ts, serve.ts, page.ts, _shared/campaigns.ts, seo/denoReach.test.ts). Deslocada: offer.ts:176-188 (relocalizada pelo nome). Divergente: a âncora do denoReach era 22, não 15; o contrato de _shared/campaigns.ts não traz a vigência (resolvido com uma leitura por id, sem alterar o leitor). Nenhuma morta.
```

## T08 — wi-impl-review · done · agente a9b19fc14eb50d8f1

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/08-feed-do-google-e-json-ld.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| CA-10 provado pelo handler do feed e pela paridade | `google-feed/__tests__/handlers.test.ts` ("dentro da vigência: sale_price e sale_price_effective_date em cada variação marcada", com as duas variações de `p-0` e a peça sem marcação); `shoppingParity.test.ts` (novo `describe` com três casos de preço e dois de vigência); `serve.test.ts` ("o preço da página é o sale_price do feed para a mesma variação marcada") | sim |
| cada comportamento do bloco `Testes` coberto por um teste escrito | ver a seção Testes: os seis comportamentos têm teste | sim |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima de fechamento do arquivo de instruções | — | só execução |

## Obrigações

- **`.ts` explícito no grafo de `core/shopping` e `core/campaigns`, `import type` incluso**: aplicada. `pricing.ts` importa `../campaigns/price.ts`, `jsonld.ts` importa `../campaigns/end.ts` e `../time/local.ts`, `xml.ts` e `offer.ts` usam `import type … './types.ts'`. As folhas novas no grafo têm `.ts`: `campaigns/price.ts` não tem import, `end.ts` importa `../time/local.ts`, e `local.ts` importa `./zone.ts`. A âncora de `denoReach` foi de 22 para 23, e `campaigns/price.ts` entrou na lista de arquivos esperados.
- **Nesta onda, só esta tarefa edita `core/shopping/*`, `core/page/*`, `apps/store/server/*` e `google-feed`**: a lista de alterados fica dentro disso, mais `seo/__tests__/denoReach.test.ts`, que a própria tarefa manda subir.

## Testes

- **`offerPricing` com campanha (`salePrice` igual ao da página, a vigência, sem campanha igual a hoje, o menor de CA-06)**: `packages/core/src/shopping/__tests__/pricing.test.ts`. Os valores esperados vêm da conta à mão (169,92; 170; 150 em vez de 127,50) e são comparados com `toEqual` na forma inteira, inclusive a ausência de `saleEffective`. Morde.
- **`shoppingParity.test.ts` continua valendo, com casos de campanha**: o arquivo ganhou três casos de preço cobrado no feed × JSON-LD, mais o `g:price` cheio, a vigência e a ausência de vigência no "de/por" e sem campanha. As réguas antigas ficaram intocadas. Morde.
- **`xml.ts` emite `g:sale_price_effective_date` só com campanha**: `packages/core/src/shopping/__tests__/xml.test.ts`. Testa a presença com o intervalo exato normalizado (o `.000Z` e o `+00:00` viram `Z`), a ausência sem campanha e no "de/por", e a ponta ilegível. Morde.
- **Handler do `google-feed`, dentro e fora da vigência**: `supabase/functions/google-feed/__tests__/handlers.test.ts`. Usa o dublê compartilhado, que enxerga `.eq` e `.in`. Cobre dentro da vigência, um instante antes do início, o instante exato do fim exclusivo, o 503 sem `markFetched` e os lotes. Morde.
- **`serve.ts`/`page.test.ts`, o JSON-LD do produto marcado**:
  - `packages/core/src/page/__tests__/serve.test.ts` cobre o preço 169,92, `priceValidUntil` `2026-11-30`, a representante sem `?variant=` e a ausência sem marcação.
  - `apps/store/server/__tests__/page.test.ts` cobre o `select` exato com o embed, a campanha extraída, e quatro formas de embed vazio ou torto que devem deixar a peça sem a chave.
  - Morde. Se `paginaDeOpcaoComDonoUnico` fica verde só a execução prova.
- **`denoReach.test.ts`, a âncora subida para o número verdadeiro**: a âncora cravada mudou de 22 para 23, e `campaigns/price.ts` entrou na lista de arquivos esperados. O número verdadeiro e o `wiringResolve` verde só a execução prova.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Uma segunda leitura de `campaigns` pelo `id` que o leitor já escolheu, conferida de novo por `isCampaignLive`, e lança se a campanha divergir | sim, com tensão registrada | H-06 (`spec.md:401`) diz "Um leitor só: `_shared/campaigns.ts`". `google-feed/handlers.ts:145` é o segundo `from('campaigns')` nas functions. O contrato da tarefa, porém, proíbe alterar `_shared/campaigns.ts`, e esse arquivo devolve só `{ id, name }`. A vigência continua decidida por `core/campaigns/live.ts`, e a leitura nova não escolhe campanha: só busca as colunas da que o leitor escolheu. Dentro da cerca da tarefa não havia alternativa melhor. | sim (`google-feed/handlers.ts`) |
| 2 | Lotes de 150 ids, com o relógio fixado uma vez | sim | `readFeedCampaign` fixa `agora` antes do laço e passa `() => agora` a cada lote; um teste cobre três lotes ≤ 150 | sim |
| 3 | Falha da campanha ⇒ 503 sem XML e sem `last_fetched_at` | sim | É a mesma régua da falha do catálogo em `handleFeed`. O teste assere 503, a ausência de `<rss` e que `markFetched` não foi chamado. | sim |
| 4 | Vigência em UTC com `Z`, sem milissegundo, com o fim exclusivo; ponta ilegível omite a tag | sim | `formatSaleEffectiveDate` em `xml.ts`; testado nos dois sentidos | sim |
| 5 | `priceValidUntil` = último dia em Brasília, via `lastMinuteOf` + `storeLocalInput` | sim | `lastMinuteOf` é o dono da conversão (`campaigns/end.ts:18`). 01/12 03:00Z vira 30/11 23:59 em Brasília, e o teste dá `2026-11-30`. `end.ts` e `local.ts` já estavam no grafo de `seo`, e a âncora subiu só por `price.ts`. | sim |
| 6 | Campanha que não baixa o preço ⇒ a oferta de antes; campanha que vence ⇒ cheio em `g:price` | sim | `campaignUnitPrice(...).discounted` (`campaigns/price.ts`) é o critério; RN-07 manda `g:price` = o cheio. Observação: o resíduo que ele declara (o "de" visível no Google depois do fim, até o próximo feed) dura um ciclo de leitura do feed, mais que os 300 s de H-11 que ele cita. É consequência de RN-07, não da decisão dele. | sim |
| 7 | `saleEffective` opcional, só com campanha | sim | `offerPricing` e `resolveOffer` só espalham a chave quando ela existe. Os testes antigos com `toEqual` seguem válidos, e o caso "sem campanha, idêntico a hoje" o prova. | sim |
| 8 | Embed `product_campaigns(percent,campaigns(starts_at,ends_at))` em `api/page`, com a RLS decidindo a vigência | sim | As policies `campaigns_public_read` (`active and starts_at <= now() and now() < ends_at`) e `product_campaigns_public_read` estão em `20261130120000_102-campanhas.sql:245-274`. A linha torta é descartada, e o teste cobre quatro formas. | sim (`apps/store/server/page.ts`, `ProductPageData` em `core/page/serve.ts`) |

## Não conferido

- Se as suítes passam (core, functions, store), o número verdadeiro do grafo em `denoReach` (23), o `wiringResolve`, o `paginaDeOpcaoComDonoUnico` e o `purity` de `shopping`: só a execução prova.
- Que o `product_campaigns` embutido em `products` resolve no PostgREST real (a relação pela FK `product_id`): o teste usa dublê. É assunto de probe contra o banco local.
- Os arquivos alterados estão rastreados e aparecem no diff (`M`), então houve baseline para todos.
- Um comentário que ficou velho, sem classe de achado: `jsonld.ts` ainda diz, no bloco da feature 68, que "`productJsonLd` acima NÃO muda", e agora ela muda com `priceValidUntil`.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (raiz, carregado no contexto: O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy, Feature-Sliced Design / Alias de import); `packages/core/CLAUDE.md` › Pureza, › Os módulos, › `shopping` (do worktree). Não li `apps/store/CLAUDE.md` › O HTML servido nem `supabase/CLAUDE.md` › Edge functions.

## T09 — wi-impl-task · review · agente a57308729000c2608

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/09-pedido-montado-com-a-campanha.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | `ProposalLine` ganhou `campaign?: PricingCampaign \| null` (opcional). `list_price` continua sendo o preço de TABELA, e quem aplica o desconto é `resolveOrderPricing` | Gravar na linha o preço já com a campanha | É a mesma forma do `PricingItem.campaign` da tarefa 05. O dinheiro continua com um dono só | `core/proposals/types.ts`; quem monta `ProposalLine` (o painel e a `order-proposals`) |
| 2 | `priceProposalDraft` só trava o preço da linha por `resolveOrderLines` quando há peça de campanha. Sem campanha, o caminho de antes fica intacto | Trocar o cálculo para todas as linhas | Assim a montagem sem campanha não muda em nada (a suíte de `proposals` e a de `payment` seguem verdes, sem uma asserção alterada) | `core/proposals/pricing.ts` |
| 3 | `priceProposalDraft` recebe `campaignName?` e devolve `campaignDiscount` e `couponEligibleSubtotal`. Quando a montagem só tem peças de campanha e há um cupom de desconto (não de frete), ele recusa com `campaignCouponRefusal(nome)`; sem o nome, usa "campanha" | Recusar só no servidor | O painel aplica o cupom antes e pode acrescentar a peça de campanha depois. Sem essa recusa, ele mostraria um total que o servidor recusa | painel e `order-proposals` |
| 4 | Na `order-proposals`, o pedido mínimo do cupom continua usando o subtotal cheio como `subtotal`. A base elegível vem de `couponEligibleSubtotal({ items com a campanha, promotions: [] })`, mais `campaignName`, e só vai quando alguma linha é de campanha | Usar uma base elegível com promoções | É o mesmo formato do `create-payment` (tarefa 05). Sem campanha, o comportamento é o de antes | `order-proposals` |
| 5 | Se a leitura da campanha falhar, a montagem é recusada com 502 `catalog_read_failed` (a mesma frase da falha de catálogo) | Seguir sem campanha | Sem a campanha, a proposta seria travada a preço cheio. A regra "erro nunca vira sem campanha" já vale no `_shared/campaigns.ts` | `order-proposals` (`save`, `renew`, `preview`) |
| 6 | O "de" da linha é o `compare_price` da variação quando a linha tem preço de variação; senão, o `original_price` da peça | Usar sempre o "de" da peça | É a mesma regra da `checkout` (`tabelaDe`) | `order-proposals` e `core/proposals/piece.ts` |
| 7 | Para mostrar a campanha, o relógio é o do painel (`Date.now()`) e, no app, o `lido_em` do `atelie_clock` (o instante do banco). O servidor confere de novo pelo relógio da function | Ler a campanha no app pelo relógio do aparelho | O aparelho não decide vigência. Na virada da campanha, painel e servidor podem divergir por segundos, e o `save` responde "Os preços mudaram…" | as telas de montagem do painel e do app |
| 8 | O painel e o app leem a campanha pelo embed `product_campaigns(percent, campaigns(id, name, starts_at, ends_at, active))` na própria leitura da peça. A leitura do app continua dentro de `lerComPapel` | Fazer uma consulta separada a `campaigns` | Não acrescenta leitura nem arquivo que importe o client. Os guardas `leituraSoComPapel` e `escritaSoPelaPorta` seguem verdes | `useProductVariants.ts` (painel) e `catalogoDaMontagem.ts` (app) |
| 9 | `mapearPecaParaProposta(produto, linhas, agora = null)`: sem `agora`, nenhuma campanha entra. `campanhaVivaDaPeca` (exportada) decide a vigência por `isCampaignLive`. As formas novas: `VariacaoDaPeca.campanha`, `PecaParaProposta.campanha` (nome e percentual) e `campanhaBase` | Campos opcionais | A forma fica explícita. Custo: 3 fixtures de teste ganharam `campanha: null` | `core/proposals/piece.ts`; fixtures do painel e do app |
| 10 | No painel, `DraftLine.campanha` é campo de tela e não vai à function (o corpo do `save` continua com as 4 chaves por linha) | Mandar a campanha ao servidor | A function relê a campanha por conta própria (H-06) | painel |
| 11 | O que a tela mostra. Painel: o selo "`<nome>` · −N%" no lugar do selo de promoção, o chip da variação e o "Acrescentar · R$" com o preço da campanha. App: a folha mostra o preço da campanha com o cheio riscado e a etiqueta, a sacola usa `precoDaLinha`, e a busca usa o menor preço com campanha. `LinhaDaSacola.preco` continua sendo o cheio (vale para o frete e para o rascunho) | Trocar o `preco` da linha | O resumo e o preço travado vêm da function. Mudar `preco` mexeria no seguro da cotação e no rascunho | app (`sacola.ts`, `FolhaDaVariacao`, `PassoDasPecas`), painel (`ItemsSection`, `VariantPicker`) |
| 12 | `CouponField` do painel: `subtotal` passou a ser o cheio (soma também `campaignDiscount`), e ganhou `eligibleSubtotal`/`campaignName`, passados ao `validateCoupon` só quando há campanha | Manter o subtotal já com o desconto da campanha | Fica igual à `order-proposals`, que confere sobre o subtotal cheio | painel |
| 13 | Na prévia, a linha de campanha nunca é atribuída a uma promoção (`promotion: null`), mesmo quando o preço coincide | Deixar como estava | A peça de campanha não entra na promoção (`hasCampaign`) | `order-proposals` `preview` |
| 14 | O teste "preview não chama RPC nem grava" teve a lista de tabelas abertas acrescida de `campaigns` | Deixar a lista como estava | A prévia passou a ler a campanha. Não é afrouxamento: continua comparando por igualdade de conjunto | teste da `order-proposals` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `core/proposals`: o preço da peça com campanha (a linha trava com o preço da campanha, o cupom vale só nas comuns, só peças de campanha ⇒ recusa com o nome, o cupom de frete grátis vale, o combinado entra por cima, sem faixa progressiva) | domínio | `packages/core/src/proposals/__tests__/pricing.test.ts` | sim | — |
| 2 | `core/proposals`: o mapeamento da peça com a campanha em vigência (por variação, sem grade, sobre o "de", fora da vigência, desligada, sem relógio) | domínio | `packages/core/src/proposals/__tests__/piece.test.ts` | sim | — |
| 3 | Handler `order-proposals`: em vigência, a peça marcada sai com o preço da campanha e trava; o "de" entra na conta; o cupom de 10% vale só na comum; só peças de campanha ⇒ 422 com a frase da campanha; o pedido mínimo sem a peça de campanha; a leitura que falha ⇒ 502; a prévia não atribui a promoção | aplicação | `supabase/functions/order-proposals/__tests__/handlers.test.ts` | sim | — |
| 4 | Handler: fora da vigência, o preço de sempre | aplicação | idem ("fora da vigência, o preço de sempre") | sim | vermelho |
| 5 | Página real do painel: a montagem mostra o preço de campanha na peça marcada (botão, linha, selo, total, `expected_total`), e fora da vigência sem selo | frontend | `apps/backoffice/src/pages/admin/AdminProposalBuilderPage.test.tsx` | sim | vermelho |
| 6 | Página real do app (`<App />`): o preço de campanha na busca, na folha (com o cheio riscado) e na sacola, pelo instante do banco; fora da vigência, o preço de sempre | frontend | `apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx` | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

packages/core/src/proposals/types.ts alterado
packages/core/src/proposals/pricing.ts alterado
packages/core/src/proposals/piece.ts alterado
packages/core/src/proposals/__tests__/pricing.test.ts alterado
packages/core/src/proposals/__tests__/piece.test.ts alterado
supabase/functions/order-proposals/handlers.ts alterado
supabase/functions/order-proposals/__tests__/handlers.test.ts alterado
apps/backoffice/src/entities/product/api/useProductVariants.ts alterado
apps/backoffice/src/entities/product/ui/VariantPicker.tsx alterado
apps/backoffice/src/entities/product/ui/__tests__/VariantPicker.test.tsx alterado
apps/backoffice/src/features/order-proposal/model/draft.ts alterado
apps/backoffice/src/features/order-proposal/model/lines.ts alterado
apps/backoffice/src/features/order-proposal/model/__tests__/lines.test.ts alterado
apps/backoffice/src/features/order-proposal/ui/CouponField.tsx alterado
apps/backoffice/src/features/order-proposal/ui/ItemsSection.tsx alterado
apps/backoffice/src/pages/admin/AdminProposalBuilderPage.tsx alterado
apps/backoffice/src/pages/admin/AdminProposalBuilderPage.test.tsx alterado
apps/mobile-adm/src/entities/product/api/catalogoDaMontagem.ts alterado
apps/mobile-adm/src/features/order-proposal/model/sacola.ts alterado
apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/PassoDasPecas.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/__tests__/FolhaDaVariacao.test.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx alterado

## Verificação

- **Tipos** (comando do `CLAUDE.md` › Comandos): `npx tsc --noEmit -p <...>`
  - backoffice: 7 erros, todos em `ProposalStateBadge.test.tsx`, herdados (os 7 da baseline do `CLAUDE.md`). Os 3 que esta tarefa criou em fixtures foram corrigidos.
  - mobile-adm: 0.
  - store: 0.
  - `packages/core`: 11, os herdados (home, sitemap, `supabase/client`). Nada novo.
  - Baseline não veio na entrada; comparei com a linha *Tipos* do `CLAUDE.md`.
- **Um arquivo de teste** (`PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`, por fatia, todos verdes no fim.
- **Verificação mínima** (`CLAUDE.md` › Baselines, `pnpm --filter @estrelinha/<w> test --testTimeout=20000`, exit fora de pipe):
  - core 5858/245, exit 0
  - functions 1701/49, exit 0
  - backoffice 5355/306, exit 0
  - mobile-adm 2733/176, exit 0
  - store 7374/399, todos os testes passando, mas exit 1 por um único erro não tratado: `[vitest-worker]: Timeout calling "onTaskUpdate"`. É a contenção do worker já registrada no `CLAUDE.md`, não teste reprovado; a tarefa 08 rodava ao mesmo tempo na mesma máquina. Não remedi.
- **ESLint** nos arquivos tocados do backoffice e do mobile-adm: 0 problemas.

Instruções lidas: `CLAUDE.md` (raiz, já no contexto, inclusive O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy, FSD/Alias); `packages/core/CLAUDE.md` › Pureza, Os módulos, Dinheiro, `proposals`, Convenções de tipo; `apps/backoffice/CLAUDE.md` › Montar pedido para a cliente (feature 89); `apps/mobile-adm/CLAUDE.md` › Montar pedido (WI 94), Os guardas do app, Testes; `supabase/CLAUDE.md` › Edge functions, `order-proposals`; `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- **Linhas da citação deslocadas** em `order-proposals/handlers.ts` (o contrato citava 369, 376, 433, 481-505). Relocalizei pelos alvos: `precificar`, `resolveItemPrice` e o bloco do cupom.
- **Fatias que passaram de primeira e levaram o check de mutação, todos vermelhos** (restaurados pela cópia, conferidos com `cmp`):
  - handler, "fora da vigência": a mutação tirou `isCampaignLive` de `_shared/campaigns.ts`, arquivo da tarefa 05, editado só durante o check.
  - página do painel: a mutação zerou `campanha` em `lines.ts`.
  - página do app: duas mutações, `lido_em` → `Date.now()` em `catalogoDaMontagem.ts` e `precoDaLinha` → preço cheio em `sacola.ts`.
  - Nessas três fatias a implementação foi escrita antes do teste; a mutação foi a prova de que a asserção morde.
- **Comportamento que só a execução prova, sem execução:** o embed `product_campaigns(percent, campaigns(...))` lido pelo painel e pelo app, e a leitura de `campaigns`/`product_campaigns` pela function. Os testes usam o dublê. Nenhuma prova rodou contra o Supabase local nesta tarefa.
- **Leitura da campanha no app:** coube em `lerComPapel`. Os guardas `escritaSoPelaPorta`, `leituraSoComPapel` e `semDadoDeClienteNoAparelho` ficaram verdes na suíte inteira do app.
- **Na virada da campanha** o painel (relógio do navegador) pode mostrar um preço e a function (relógio dela) gravar outro; o `save` responde "Os preços mudaram…". É declarado, não defeito.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 09
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); packages/core/CLAUDE.md › proposals, Dinheiro, Pureza, Os módulos, Convenções de tipo; apps/backoffice/CLAUDE.md › Montar pedido para a cliente (feature 89); apps/mobile-adm/CLAUDE.md › Montar pedido (WI 94), Os guardas do app, Testes; supabase/CLAUDE.md › Edge functions, order-proposals; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - handler de order-proposals: supabase/functions/order-proposals/__tests__/handlers.test.ts, describe "a campanha de desconto na montagem" (em vigência trava com o preço da campanha; o "de" na conta; fora da vigência o preço de sempre; cupom só na comum; só campanha ⇒ 422 "Este cupom não vale para peças da Black Friday."; mínimo sem a peça de campanha; leitura que falha ⇒ 502; a prévia não atribui promoção)
  - core/proposals: packages/core/src/proposals/__tests__/pricing.test.ts ("a peça de campanha na montagem") e piece.test.ts ("o preço da campanha em vigência")
  - página real do painel: apps/backoffice/src/pages/admin/AdminProposalBuilderPage.test.tsx ("a peça na campanha de desconto em vigência")
  - página real do app: apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx ("passo 2 · a peça na campanha de desconto em vigência")
  - guardas do app (escritaSoPelaPorta, leituraSoComPapel, semDadoDeClienteNoAparelho): verdes na suíte inteira do mobile-adm; a leitura da campanha coube em lerComPapel
  - sem cobertura: o embed product_campaigns contra o PostgREST real (só dublê)
Verificações: tsc backoffice 7 (herdados, ProposalStateBadge.test.tsx), mobile-adm 0, store 0, core 11 (herdados); suítes core 5858, functions 1701, backoffice 5355, mobile-adm 2733 (exit 0); store 7374 testes passando, mas exit 1 por um "Timeout calling onTaskUpdate" do worker (contenção conhecida, tarefa 08 em paralelo); eslint dos arquivos tocados 0
Árvore de trabalho: 23 arquivos alterados (core/proposals, order-proposals, painel order-proposal + useProductVariants + VariantPicker, app catalogoDaMontagem + sacola + FolhaDaVariacao + PassoDasPecas, e os testes); nada commitado
Citações conferidas: 6 abertas (order-proposals/handlers.ts, core/proposals/pricing.ts, core/proposals/piece.ts, _shared/campaigns.ts + resolveOrderPricing/couponRefusal, lerComPapel.ts, catalogoDaMontagem.ts); deslocou: order-proposals/handlers.ts:369,376,433,481-505 (relocalizado por precificar, resolveItemPrice e o bloco do cupom); nenhuma morta
```

## T09 — wi-impl-review · fixing · agente a5a56cf68eb67f2d7

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/09-pedido-montado-com-a-campanha.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | `raio subdeclarado` | quebra | `apps/mobile-adm/src/features/order-proposal/model/sacola.ts:117` (o `preco` continua cheio) e `:56` (`precoDaLinha` só chega ao passo 2), o que alcança `apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx:129` e `:143` | A premissa 11 ("`LinhaDaSacola.preco` continua sendo o cheio"; raio: `sacola.ts`, `FolhaDaVariacao`, `PassoDasPecas`) deixou de fora o passo Revisar, que também lê esse campo. Lá a linha da peça marcada sai como `formatPrice(l.preco * l.quantidade)`, ou seja, R$ 120,00 a preço cheio. Logo abaixo, o "Subtotal" é `s.subtotal + s.promotion_discount`, que vem da function e já tem o desconto da campanha (R$ 96,00). Não há linha de campanha no resumo. Resultado: na última tela antes de criar o link, a dona vê a peça a preço cheio, e as linhas não fecham com o subtotal. O passo Peças e o painel mostram a mesma peça a R$ 96,00 | Objetivo: "a peça marcada entra com o preço da campanha"; Contrato, linha do app: "o preço de campanha mostrado (a dona ainda pode dar um desconto combinado por cima)" |
| 2 | `teste que não morde` | atrapalha | `supabase/functions/order-proposals/__tests__/handlers.test.ts:1773` | O teste "a prévia não atribui à promoção a peça que está na campanha" prova a guarda nova de `promocaoDasLinhas` (`handlers.ts:1292`). A promoção tem `min_qty: 2`. O P1 é de campanha e fica fora da contagem (`isEligible` → `hasCampaign`), e o P2 entra com quantidade 1. A faixa não é alcançada, `winner` sai `'none'`, `valeu` é falso e `candidatas` fica vazio. Assim `lines[0]` dá `{ promotion: null }` mesmo sem a guarda: apagar as linhas 1291–1294 deixa o teste verde. Para morder, a montagem precisa alcançar a faixa sem a peça de campanha, por exemplo com o P2 em quantidade 2 | `Testes` (a premissa 13 é decisão do implementador, e a única prova dela é este teste); a classe exige asserção que não passe com o comportamento errado |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o pedido montado com peça de campanha provado pelo handler e pelas páginas reais | Handler: `handlers.test.ts` (describe "a campanha de desconto na montagem": `save` grava `unit_price` 80, os "de" dão 96, fora da vigência volta ao de tabela, cupom recusado, pedido mínimo, falha de leitura dá 502). Painel: `AdminProposalBuilderPage.test.tsx` (R$ 72,00 na linha e no total, o selo, `expected_total` 72). App: `montarPedido.pecas.test.tsx` (R$ 96,00 na busca, na folha e na sacola) | sim no handler e nos passos 1–2; o passo Revisar do app mostra o preço cheio (achado 1) |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim; os guardas do app são só execução |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório | — | só execução |

Critérios de aceite, na parte desta tarefa:
- RN-04 (pedido montado): o preço vem de `resolveOrderPricing`, pela linha com `campaign` (`proposals/pricing.ts`), e fica travado em `lockedLines`. O desconto combinado entra por cima (teste do `core`).
- RN-16 (cupom): a base elegível sai sem a peça de campanha, a montagem só com peças de campanha é recusada com o nome, e o cupom de frete grátis continua valendo (testes do `core` e do handler).
- CA-03 e CA-16 são da loja e do servidor, fora do recorte desta tarefa.

## Obrigações

- `.ts` explícito no que a function importa de `core`: aplicado. `piece.ts` importa `../campaigns/live.ts`, `price.ts` e `types.ts`; `pricing.ts` importa `../coupons/rules.ts`; o handler importa `../_shared/campaigns.ts`. Todos têm a extensão, e `live.ts` importa `./types.ts`.
- `movimentoDosPedidos` e `animacaoRespeitaMovimento`: não se aplicam. Nenhum arquivo de UI novo nasceu, e as classes novas não têm `transition-*` nem `animate-*`.

## Testes

- Handler, em vigência, a peça marcada sai com o preço da campanha e trava: `handlers.test.ts`, "em vigência…". Lê o `unit_price` nos argumentos do `save_order_proposal` e morde.
- Handler, cupom recusado com a frase da campanha: `handlers.test.ts`, "só peças de campanha…". Confere 422, a frase exata e que nada foi gravado. Morde.
- Handler, fora da vigência, o preço de sempre: `handlers.test.ts`, "fora da vigência". Morde.
- `core/proposals`, o preço da peça com campanha: `pricing.test.ts` (167,92, a recusa, o frete grátis, o desconto combinado, a faixa) e `piece.test.ts` (o preço da campanha por variação e na peça sem grade, o "de", a vigência). Mordem.
- Página real do painel: `AdminProposalBuilderPage.test.tsx`, campanha. Confere o preço da linha, o total, o selo e as 4 chaves do `save`. Morde. O caso de fora da vigência só confere a ausência do selo, que é fraco mas não foi exigido.
- Página real do app: `montarPedido.pecas.test.tsx`, campanha. Cobre a busca, a folha e a sacola, e morde. Não cobre o passo Revisar (achado 1).
- Guardas do app (`escritaSoPelaPorta`, `leituraSoComPapel`, `semDadoDeClienteNoAparelho`): só execução. Por leitura, nenhum arquivo novo importa o client, o embed corre dentro de `lerComPapel`, e o rascunho grava só campos listados um a um, então a `campanha` não vai ao aparelho.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `ProposalLine.campaign?` opcional, `list_price` continua o de tabela | sim | `PricingItem.campaign` (`payment/pricing.ts:28`), Contrato | sim |
| 2 | o preço travado vem de `resolveOrderLines` só quando há campanha | sim | `resolveOrderLines` sem `buyTogether` devolve uma linha por índice, e o diff de `pricing.test.ts` só acrescenta | sim |
| 3 | `campaignName`, `campaignDiscount` e `couponEligibleSubtotal` em `priceProposalDraft`; a recusa só com campanha | sim | `couponRefusal` em `coupons/rules.ts:65-66` usa a mesma regra; recusa o cupom de desconto e não o de frete grátis | sim |
| 4 | o pedido mínimo sobre a base elegível; `subtotal` continua cheio | sim | `rules.ts:65`; teste "o pedido mínimo…" | sim |
| 5 | falha de leitura da campanha dá 502 `catalog_read_failed` | sim | `_shared/campaigns.ts`: "Erro nunca vira 'sem campanha'"; `precificar` é usado por `save`, `renew` e `preview` | sim |
| 6 | o "de" vem da variação quando ela tem preço, senão da peça | sim | `checkout/handlers.ts:453-461` (`tabelaDe`) é idêntico | sim |
| 7 | relógio: `Date.now()` no painel, `lido_em` no app, o da function no servidor | sim | `apps/mobile-adm/CLAUDE.md:234,450` (nada pelo relógio do aparelho); `lerComPapel` devolve `lido_em` | sim |
| 8 | a campanha entra por embed `product_campaigns(...)` na leitura da peça | sim | `lerComPapel` foi mantido e nenhum arquivo novo importa o client | sim |
| 9 | `mapearPecaParaProposta(..., agora = null)`, campos `campanha` e `campanhaBase` obrigatórios | sim | fixtures de `PecaParaProposta`/`VariacaoDaPeca` em `apps` e `packages`: só as 3 do raio mais `useProductVariants.test.ts`, que usa `toMatchObject` e não quebra | sim |
| 10 | `DraftLine.campanha` é campo de tela e não vai à function | sim | `apps/backoffice/CLAUDE.md` (montagem: "`DraftLine.image_url`/`stock_cap`… são campos de TELA"); o teste confere as 4 chaves | sim |
| 11 | `LinhaDaSacola.preco` continua cheio; a campanha só aparece em `FolhaDaVariacao` e `PassoDasPecas` | em parte | `PassoRevisar.tsx:129` mostra `l.preco` como valor da linha, e `:143` mostra o subtotal com a campanha | não, falta `PassoRevisar.tsx` (achado 1) |
| 12 | `CouponField` recebe o subtotal cheio mais `eligibleSubtotal`/`campaignName` | sim | `validateCoupon` (`core/hooks/useCoupons.ts:87,104`) aceita os dois; a soma `subtotal + promotionDiscount + campaignDiscount` dá o cheio | sim |
| 13 | na prévia, a linha de campanha nunca é atribuída a uma promoção | sim | `promocaoDasLinhas` monta `itens` sem `campaign`, então conta a quantidade da peça de campanha para a faixa; a guarda é necessária. O teste que a prova não morde (achado 2). A linha de `Não faça` "a promoção progressiva no `order-proposals`" é ambígua, ver Não conferido | sim |
| 14 | `campaigns` entrou no conjunto de tabelas da prévia | sim | `liveCampaignMarks` lê `campaigns`, e `product_campaigns` só quando há campanha viva; o teste ainda compara por igualdade de conjunto | sim |

## Não conferido

- Nenhum teste nem guarda foi executado: `escritaSoPelaPorta`, `leituraSoComPapel`, `semDadoDeClienteNoAparelho`, `regrasDaMontagemNoCore`, os de tom e movimento do app, `tsc`, lint. Só a execução prova que passam.
- Que o embed `product_campaigns(percent, campaigns(...))` resolve no PostgREST real (as chaves estrangeiras e a RLS de leitura pelo admin) depende das migrations da tarefa 01 e de um probe contra o banco.
- `Não faça`: "a promoção progressiva no `order-proposals`". A premissa 13 mexe em `promocaoDasLinhas`, que só atribui a promoção na exibição; `promocoesVigentes` (H-06) não foi tocada. Leio a proibição como "não reimplementar nem alterar a cópia da promoção", então não registro como achado, mas a fronteira é ambígua.
- `renew` reprecifica a proposta pela campanha vigente no momento da renovação. É o mesmo comportamento que já vale para a promoção e não contraria D-05, que fala do preço travado da proposta aberta. Não julguei além disso.
- O arquivo de instruções da raiz foi lido na cópia do repositório principal (o contexto da sessão), não na do worktree.

Instruções lidas: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; `packages/core/CLAUDE.md` › Dinheiro · `proposals`; `apps/backoffice/CLAUDE.md` › Montar pedido para a cliente (feature `89`) e o trecho de relógio do Dashboard; `apps/mobile-adm/CLAUDE.md` › Montar pedido (WI 94), lido em parte, mais as linhas sobre o relógio do aparelho (234, 450); `supabase/CLAUDE.md` › Edge functions · `order-proposals`.

## T09 — wi-impl-task · done · agente a57308729000c2608

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/09-pedido-montado-com-a-campanha.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 11 | O que a tela mostra. Painel: o selo "`<nome>` · −N%" no lugar do selo de promoção, e o chip da variação e o "Acrescentar · R$" com o preço da campanha. App: o preço de campanha aparece por `precoDaLinha` em todo lugar que mostra a linha — a folha (com o cheio riscado e a etiqueta), a sacola do passo 2, a busca e, desde a correção, a linha da peça no passo 4 · Revisar. `LinhaDaSacola.preco` continua sendo o cheio, porque é o que vai no corpo da cotação do frete (`corpoDaCotacao` em `revisao.ts`, igual ao painel) e no rascunho | Trocar o `preco` da linha | O resumo e o preço travado vêm da function, e o Subtotal da Revisão já vem com o desconto da campanha. Por isso a linha precisa mostrar o mesmo preço para fechar com ele. O seguro da cotação segue pelo preço cheio, como no painel | app (`sacola.ts`, `FolhaDaVariacao`, `PassoDasPecas`, `PassoRevisar`; `revisao.ts` lê o cheio de propósito), painel (`ItemsSection`, `VariantPicker`) |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 6b | Página real do app, passo 4 · Revisar: a linha da peça marcada mostra o preço da campanha e fecha com o subtotal da function | frontend | `apps/mobile-adm/src/pages/__tests__/montarPedido.revisar.test.tsx` ("passo 4 · a peça na campanha de desconto em vigência") | sim | — |
| 3b | Handler: a prévia não atribui à promoção a peça de campanha, com a faixa alcançada sem ela | aplicação | `supabase/functions/order-proposals/__tests__/handlers.test.ts` ("a prévia não atribui à promoção a peça que está na campanha") | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

packages/core/src/proposals/types.ts
packages/core/src/proposals/pricing.ts
packages/core/src/proposals/piece.ts
packages/core/src/proposals/__tests__/pricing.test.ts
packages/core/src/proposals/__tests__/piece.test.ts
supabase/functions/order-proposals/handlers.ts
supabase/functions/order-proposals/__tests__/handlers.test.ts
apps/backoffice/src/entities/product/api/useProductVariants.ts
apps/backoffice/src/entities/product/ui/VariantPicker.tsx
apps/backoffice/src/entities/product/ui/__tests__/VariantPicker.test.tsx
apps/backoffice/src/features/order-proposal/model/draft.ts
apps/backoffice/src/features/order-proposal/model/lines.ts
apps/backoffice/src/features/order-proposal/model/__tests__/lines.test.ts
apps/backoffice/src/features/order-proposal/ui/CouponField.tsx
apps/backoffice/src/features/order-proposal/ui/ItemsSection.tsx
apps/backoffice/src/pages/admin/AdminProposalBuilderPage.tsx
apps/backoffice/src/pages/admin/AdminProposalBuilderPage.test.tsx
apps/mobile-adm/src/entities/product/api/catalogoDaMontagem.ts
apps/mobile-adm/src/features/order-proposal/model/sacola.ts
apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx
apps/mobile-adm/src/features/order-proposal/ui/PassoDasPecas.tsx
apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx
apps/mobile-adm/src/features/order-proposal/ui/__tests__/FolhaDaVariacao.test.tsx
apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx
apps/mobile-adm/src/pages/__tests__/montarPedido.revisar.test.tsx

## Verificação

Só o que a correção tocou e rodou:
- **Arquivo de teste** (`PROJECT.md` › Comandos de verificação):
  - `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.revisar.test.tsx --testTimeout=20000` → 20/20. O caso novo falhou antes do conserto: mostrava "R$ 120,00".
  - `pnpm --filter @estrelinha/functions exec vitest run functions/order-proposals --testTimeout=20000` → 163/163.
- **Tipos** (`CLAUDE.md` › Comandos): `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` → 0 erros, igual à baseline (0).
- **ESLint** em `PassoRevisar.tsx` e em `montarPedido.revisar.test.tsx` → 0 problemas.
- **Suíte do mobile-adm** (`CLAUDE.md` › Baselines): `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` → 2730/2734, exit 1.
  - Os 4 que reprovaram ficam em arquivos que a correção não toca: `useListaDeClientes`, `useListaDePedidos`, `usePedido` e `usePushNoAparelho`.
  - O erro foi `Hook timed out in 10000ms`, seguido de `.clear` sobre `undefined`.
  - Rodados sozinhos, os 4 arquivos passam: 149/149, exit 0.

Instruções lidas: `CLAUDE.md`; `packages/core/CLAUDE.md` › proposals, Dinheiro; `apps/backoffice/CLAUDE.md` › Montar pedido para a cliente; `apps/mobile-adm/CLAUDE.md` › Montar pedido (WI 94), Os guardas do app; `supabase/CLAUDE.md` › Edge functions; `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- O corpo da cotação do frete no app (`corpoDaCotacao` em `revisao.ts`) continua mandando o preço cheio como `unitPrice`, igual ao painel (`shippingPreview.ts`). O frete grátis por valor não é decidido ali, por isso não mudei.
- A suíte inteira do mobile-adm reprovou 4 casos por estouro de tempo, em arquivos que a correção não toca. Rodados sozinhos, passam.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 09
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); packages/core/CLAUDE.md › proposals, Dinheiro, Pureza, Os módulos, Convenções de tipo; apps/backoffice/CLAUDE.md › Montar pedido para a cliente (feature 89); apps/mobile-adm/CLAUDE.md › Montar pedido (WI 94), Os guardas do app, Testes; supabase/CLAUDE.md › Edge functions, order-proposals; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - handler de order-proposals: supabase/functions/order-proposals/__tests__/handlers.test.ts, describe "a campanha de desconto na montagem" (em vigência trava com o preço da campanha; o "de" na conta; fora da vigência o preço de sempre; cupom só na comum; só campanha ⇒ 422 "Este cupom não vale para peças da Black Friday."; mínimo sem a peça de campanha; leitura que falha ⇒ 502; a prévia não atribui promoção à peça de campanha com a faixa alcançada sem ela)
  - core/proposals: packages/core/src/proposals/__tests__/pricing.test.ts ("a peça de campanha na montagem") e piece.test.ts ("o preço da campanha em vigência")
  - página real do painel: apps/backoffice/src/pages/admin/AdminProposalBuilderPage.test.tsx ("a peça na campanha de desconto em vigência")
  - página real do app: apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx (passo 2: busca, folha, sacola) e montarPedido.revisar.test.tsx (passo 4: a linha com o preço da campanha, fechando com o subtotal)
  - guardas do app (escritaSoPelaPorta, leituraSoComPapel, semDadoDeClienteNoAparelho): verdes na suíte do mobile-adm; a leitura da campanha coube em lerComPapel
  - sem cobertura: o embed product_campaigns contra o PostgREST real (só dublê)
Verificações: tsc backoffice 7 (herdados, ProposalStateBadge.test.tsx), mobile-adm 0, store 0, core 11 (herdados); suítes core 5858, functions 1701, backoffice 5355 (exit 0); mobile-adm 2733 na implementação e 2730/2734 depois da correção, os 4 reprovados por estouro de tempo em arquivos não tocados (sozinhos, 149/149); store 7374 testes passando, mas exit 1 por um "Timeout calling onTaskUpdate" do worker (contenção conhecida, tarefa 08 em paralelo); eslint dos arquivos tocados 0
Árvore de trabalho: 25 arquivos alterados (core/proposals, order-proposals, painel order-proposal + useProductVariants + VariantPicker, app catalogoDaMontagem + sacola + FolhaDaVariacao + PassoDasPecas + PassoRevisar, e os testes); nada commitado
Citações conferidas: 6 abertas (order-proposals/handlers.ts, core/proposals/pricing.ts, core/proposals/piece.ts, _shared/campaigns.ts + resolveOrderPricing/couponRefusal, lerComPapel.ts, catalogoDaMontagem.ts); deslocou: order-proposals/handlers.ts:369,376,433,481-505 (relocalizado por precificar, resolveItemPrice e o bloco do cupom); nenhuma morta
```

## T14 — wi-impl-task · review · agente aaf8d3f9cf3d2be7a

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/14-bug-5-percentuais-da-nova-campanha.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Causa: a recusa do campo ("10% já está na campanha.", estado `erro` do `PercentsCard`) sobrevivia à remoção do percentual. Ela também escondia o motivo da lista vazia, porque o card só mostra `listRefusal` com `!erro`. Conserto: `tirar` limpa `erro` quando a remoção acontece | Mexer em `core/campaigns/refusals.ts` ou no `checkDraft` da página. A frase "Acrescente ao menos um percentual." já vinha certa de `campaignPercentsRefusal`, e quem a escondia era a recusa velha | A causa está no estado local do card. É a menor superfície e não muda contrato | nenhum (fica dentro do `PercentsCard.tsx`) |
| 2 | A recusa do campo só se limpa quando a remoção acontece. Se a remoção é recusada porque o percentual está em uso, a recusa fica | Limpar a recusa em qualquer toque em "Tirar" | Com a remoção recusada, o percentual continua na lista e a frase continua verdadeira | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Acrescentar 10, tentar 10 de novo (recusa aparece) e tirar o 10: aparecem "Nenhum percentual ainda." e "Acrescente ao menos um percentual."; "10% já está na campanha." some; Salvar desligado | página (componente, página real) | `apps/backoffice/src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx` › "a recusa do repetido sai junto com o percentual, e o motivo da lista vazia aparece" | sim (vermelho antes: "expected <p role="alert"> to be null") | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

apps/backoffice/src/features/campaign-form/ui/PercentsCard.tsx alterado
apps/backoffice/src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx --testTimeout=20000` (fonte: PROJECT.md › Comandos de verificação)
  - antes do conserto: 1 falhou e 19 passaram, a falha sendo o caso novo
  - depois do conserto: 20/20, exit 0
- `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (fonte: CLAUDE.md › Baselines / PROJECT.md): 306 arquivos, 5356 testes, exit 0, capturado fora de pipe. A árvore tem trabalho de outras tarefas em paralelo.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (fonte: CLAUDE.md › Comandos): 7 erros, todos em `src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx`. É igual ao baseline (7 herdados), nenhum novo.
- `npx eslint .` em apps/backoffice (fonte: CLAUDE.md › Baselines): 23 erros e 5 avisos, igual ao baseline 23/5. Nenhum aponta para os arquivos tocados.
- Não rodei a suíte da loja nem a de `core`: `packages/core` não foi tocado, e a obrigação de rodá-las vale só quando ele muda.

Instruções lidas:
- CLAUDE.md (raiz, carregado no contexto)
- apps/backoffice/CLAUDE.md › topo · Molde dos formulários · Descontos (arquivo de ~130 KB lido por seção; índice por `grep '^#'`)
- packages/core/CLAUDE.md › topo · Quando um código pertence · Pureza (índice lido; não há seção "campaigns")
- .specs/project/PROJECT.md › Comandos de verificação · Ambiente local

## Divergências e descobertas

- Citação morta: a tarefa manda ler `packages/core/CLAUDE.md › campaigns`, mas o arquivo não tem seção de campanhas. Li as seções de alcance geral e segui.
- Conferência no app local: não abri o navegador. A instrução do agente põe a validação em navegador fora da tarefa (é da QA/reteste). O comportamento ficou provado pelo teste, que renderiza a página real `AdminCampaignFormPage` e executa os passos 2 a 4 do BUG-005. Isso cumpre só em parte o "visto funcionando no app local" do `Pronto quando`; o reteste em navegador fica com a QA.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 14
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/backoffice/CLAUDE.md (topo, Molde dos formulários, Descontos); packages/core/CLAUDE.md (topo, Quando pertence, Pureza — não existe seção "campaigns"); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: apps/backoffice/src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx › "a recusa do repetido sai junto com o percentual, e o motivo da lista vazia aparece" (tirar todos os percentuais ⇒ "Acrescente ao menos um percentual." presente, "10% já está na campanha." ausente, Salvar desligado); era vermelho antes do conserto. Não houve caso novo em refusals: o conserto não passou por core/campaigns/refusals.ts.
Verificações: arquivo de teste 20/20; suíte do backoffice 5356/306, exit 0; tsc do backoffice com 7 erros (os herdados de ProposalStateBadge.test.tsx, igual ao baseline); eslint do backoffice 23/5, igual ao baseline. App local não aberto em navegador (validação em navegador é da QA); a prova é a página real renderizada no teste.
Árvore de trabalho: apps/backoffice/src/features/campaign-form/ui/PercentsCard.tsx (tirar um percentual limpa a recusa do campo); apps/backoffice/src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx (caso novo). Nada commitado.
Citações conferidas: 4 abertas (PercentsCard.tsx, AdminCampaignFormPage.tsx, core/campaigns/refusals.ts, packages/core/CLAUDE.md › campaigns); nenhuma deslocou; morta: packages/core/CLAUDE.md › campaigns (a seção não existe)
```

## T10 — wi-impl-task · review · agente a4233c168a1a653eb

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/10-bug-1-barra-fixa-de-compra.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Não mexi no código de produto. Fechei pelo caminho "não reproduziu com toque real", que a própria tarefa prevê: fechou com divergência, e o reteste do QA decide `cannot-reproduce`. | Corrigir a barra às cegas, por exemplo mudando a regra de quando ela aparece ou o `translate-y-full`. | No toque emulado em jsdom, a cadeia ProductPage real → barra → `useBuyAction.tap` → sacola funciona, com e sem campanha. A evidência do QA (`CH-04-02-toque-sem-efeito-390.png`) mostra a foto principal visível e **nenhuma barra na tela**, ou seja `data-revealed=false` e `translate-y-full`. Pelo desenho (`useScrolledPast`), a barra só entra depois da foto ou quando o header some. O agent-browser "tocou" um botão fora da viewport. Isso bate com o resto do relato: Enter funciona porque o `focus-within:translate-y-0` traz a barra, e em 1440 o toque cai no CTA da coluna. Nada de `ProductBuyBar`/`useBuyAction` mudou no WI 102 (`git diff master...HEAD`), e a peça comum (M-E) falha igual. | O BUG-001 fica `open` até o reteste. O reteste precisa rolar além da foto antes de tocar. |
| 2 | Não subi dev server nem navegador para a prova com toque emulado. | Subir o Vite do worktree com Playwright `hasTouch`. | A regra 8 proíbe servidor e processo que fica rodando, e não havia nenhum de pé (8082, 8092, 4173 e 5173 sem resposta). | A prova em navegador fica para o reteste do QA. |
| 3 | Pus o teste do toque na página real, em `ProductPageCampanha.test.tsx`. | Pôr no `ProductBuyBar.test.tsx`, que recria a composição. | O fio passa pela `ProductPage`. Montar a página real prova a fiação, e esse arquivo já tem a peça de campanha vinda do mapeador. | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Toque (touch, pointer, mouse e click) em "Adicionar à sacola" na barra fixa da página real põe a peça de campanha na sacola a R$ 167,92 | componente (página real) | `apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx` › "a peça de campanha entra na sacola com o preço da campanha" | sim | vermelho |
| 2 | O mesmo toque põe a peça comum na sacola a R$ 209,90 | componente (página real) | idem › "a peça comum entra na sacola com o preço de sempre" | sim | vermelho |
| 3 | Prova em navegador com toque emulado em 390 × 844 | navegador | — | não executada | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/pages/__tests__/ProductPageCampanha.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação): exit 0, 7/7.
- Check de mutação: troquei `onClick={buy.tap}` por um no-op em `ProductBuyBar.tsx`. Os 2 casos novos reprovaram (2 failed | 5 passed). Restaurei pela cópia (`cmp` igual) e voltou a 7/7.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros, igual ao baseline do store (0).
- `npx eslint src/pages/__tests__/ProductPageCampanha.test.tsx` em `apps/store` (CLAUDE.md): exit 0.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines): 1 failed | 7380 passed (7381), 400 arquivos.
  - A falha é `src/entities/product/lib/__tests__/precoDeCampanha.test.ts`, o caso "10%: o menor entre o 'por' e o 'de' com o desconto — R$ 336,60…". É o teste vermelho de `mapProduct.ts`, de uma tarefa paralela desta onda (BUG-002/BUG-003), dentro da cerca que não posso tocar. Não vem desta tarefa.
  - Essa execução escapou do timeout e passou para segundo plano. Esperei a conclusão em primeiro plano antes de ler o resultado.

Instruções lidas: `CLAUDE.md` (raiz, no contexto: O "defeito 01", Convenções, Os guardas, Baselines, FSD/Alias, Comandos) · `apps/store/CLAUDE.md` › cabeçalho, › Página do produto (inclui O bloco Compre Junto e O botão único leva o conjunto); índice de títulos lido · `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local. `DESIGN.md` não foi lido: a tarefa não mexeu em UI.

## Divergências e descobertas

- **Não reproduziu.** Pela evidência, a causa é a barra escondida por desenho (`translate-y-full` enquanto a foto está visível) mais o clique do agent-browser num elemento fora da viewport. Em jsdom, a sequência de toque na página real põe a peça na sacola. O reteste deve tocar em 390 × 844 com toque real **depois de rolar além da foto**.
- Prova em navegador com toque emulado **não executada**: as regras não deixam subir servidor e não havia nenhum de pé. Fica para o reteste.
- A lixeira da gaveta em 390 (CH-04, uma ocorrência) não foi diagnosticada. `CartDrawerRow` não mudou no botão de remover neste WI, e a causa mais provável é a mesma (coordenada do driver). Registrado, sem ampliar o escopo.
- Fatias 1 e 2 passaram de primeira, sem bug para pegar em jsdom. O check de mutação deu vermelho nas duas.
- A suíte do store tem 1 falha de outra tarefa paralela (`precoDeCampanha.test.ts`).

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 10
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz: defeito 01, Convenções, Guardas, Baselines, FSD/Alias, Comandos); apps/store/CLAUDE.md (cabeçalho, Página do produto, Compre Junto, botão único); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local). DESIGN.md não lido (sem mudança de UI)
Testes escritos: apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx — "o toque em 'Adicionar à sacola' na barra fixa do celular": peça de campanha (R$ 167,92) e peça comum (R$ 209,90), pela ProductPage real, com touch, pointer, mouse e click. Verdes de primeira, porque não há defeito em jsdom; o check de mutação (onClick da barra anulado) deu vermelho nos dois. Sem cobertura: a prova em navegador com toque emulado em 390 × 844, porque as regras não deixam subir dev server e não havia nenhum de pé
Verificações: arquivo novo 7/7; tsc do store 0 (baseline 0); eslint do arquivo 0; suíte do store 7380/7381 — a falha é precoDeCampanha.test.ts, teste vermelho da tarefa paralela de mapProduct, fora desta tarefa
Árvore de trabalho: apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx (2 casos novos); nenhum código de produto alterado
Citações conferidas: 2 (ProductBuyBar.tsx e useBuyAction.ts, nos caminhos citados); nenhuma deslocada nem morta
```
Diagnóstico para o reteste: no screenshot de evidência a barra não aparece. Ela fica escondida (`translate-y-full`, `data-revealed=false`) enquanto a foto principal está visível, então o driver clicou fora da viewport. Reteste com toque real depois de rolar além da foto, e confira a lixeira da gaveta do mesmo jeito.

## T13 — wi-impl-task · review · agente ac38995b7ba673d3f

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/13-bug-4-preco-riscado-sem-de.md
Situação: fechou

**Importante: o BUG-004 não vai passar no reteste só com este conserto.** O texto que a QA ouviu ("R$ 346,50R$ 385,00R$ 322,24no Pix") é da barra fixa de compra, `apps/store/src/widgets/product-buy-bar/ui/ProductBuyBar.tsx`. Essa pasta é da tarefa 10 pela cerca de paralelismo, então não a editei. O conserto que falta está em Divergências e descobertas.

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Consertei só o `ProductInfo.tsx`. O riscado da barra fixa (`ProductBuyBar.tsx:145-147`, o `<span ... line-through>` do ramo `!conjunto && savings`) ficou sem o "De ". | Editar o `ProductBuyBar.tsx`. | A cerca do orquestrador proíbe tocar em `widgets/product-buy-bar/` durante a tarefa 10, que está rodando em paralelo. | A barra fixa: o leitor de tela continua lendo dois preços seguidos ali no celular. O reteste do BUG-004 reprova enquanto o `<span className="sr-only">De </span>` não entrar nesse span. |
| 2 | Pus o mesmo `<span className="sr-only">De </span>` no ramo "de/por" cadastrado do `ProductInfo`, que não tinha. É a forma que o ramo de campanha e o `ProductCard` já usam. | Criar um componente compartilhado de preço riscado. | Imitar a forma que o repositório já tem e manter a menor superfície. Um componente novo também teria de entrar na barra fixa, que está cercada. | Nenhum fora do arquivo. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | "de/por" cadastrado: o riscado é lido "De R$ 385,00", com o "De " só para leitor de tela | componente (`ProductInfo`) | `apps/store/src/entities/product/ui/__tests__/ProductInfoPrecoRiscado.test.tsx` › "no de/por cadastrado…" | sim | — |
| 2 | Peça de campanha: o riscado é lido "De R$ 385,00", com o "De " só para leitor de tela | componente (`ProductInfo`) | mesmo arquivo › "na peça de campanha…" | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

apps/store/src/entities/product/ui/ProductInfo.tsx alterado
apps/store/src/entities/product/ui/__tests__/ProductInfoPrecoRiscado.test.tsx criado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/entities/product/ui/__tests__/ProductInfoPrecoRiscado.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação):
  - antes do conserto: 1 falhou, 1 passou. O caso "de/por" recebeu "R$ 385,00" em vez de "De R$ 385,00".
  - com o check de mutação (o "De " tirado do ramo de campanha): 2 falharam. Restaurei pela cópia e conferi com `cmp`.
  - depois do conserto: 2/2, exit 0.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines): exit 1, 7380 passaram e 1 falhou, em 400 arquivos.
  - O caso que falha é `src/entities/product/lib/__tests__/precoDeCampanha.test.ts` ("10%: o menor entre o 'por' e o 'de'…").
  - Não é desta tarefa: o teste e o `mapProduct.ts` estão sendo alterados agora pela tarefa 11 (BUG-002, que escreve o teste vermelho antes do código).
  - Fora ele, a suíte está verde, com os guardas `touchTarget`, `contrast`, `accentText` e os de dono único.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros, igual ao baseline do store.
- `npx eslint .` em `apps/store` (CLAUDE.md › Baselines): 2 erros e 2 warnings, igual ao baseline do store.
- Não conferi no app local. A loja não estava de pé (as portas 8092 e 8082 não responderam) e subir dev server é proibido (regra 8). A leitura "De R$ 385,00" foi provada pelo `textContent` do riscado no teste.

Instruções lidas:
- `CLAUDE.md` (raiz), que veio inteiro no contexto
- `apps/store/CLAUDE.md`, por seção (o arquivo tem 149 KB): Design system · Mobile — o que quebra e não grita · Página do produto · Carrinho, chrome e checkout
- `DESIGN.md`, §1 a §4
- `.specs/project/PROJECT.md`: Comandos de verificação · Ambiente local
- `tdd.md`

## Divergências e descobertas

- **A causa do BUG-004 é a barra fixa, não o `ProductInfo`.**
  - O texto observado, "R$ 346,50R$ 385,00R$ 322,24no Pix", é exatamente a faixa 1 do `ProductBuyBar` (preço, riscado, Pix e "no Pix").
  - O `ProductInfo` diz "com Pix" e, no ramo de campanha, já tinha o `sr-only "De "` (por volta da linha 123, como a tarefa citava), com teste em `ProductPageCampanha.test.tsx`.
  - Em 390 a barra fica na árvore de acessibilidade mesmo fora da tela: ela é `translate`, não `hidden`.
  - Não consertei a barra por causa da cerca. O conserto é uma linha: `<span className="sr-only">De </span>` antes de `{formatPrice(savings.compareAt)}`, no span `line-through` de `ProductBuyBar.tsx:145-147`, mais um teste da barra que leia "De R$".
  - Não propaguei para outra tarefa: a 10 tem número menor e está em andamento, e a 14 e a 15 não falam desse trecho.
- O ramo "de/por" cadastrado do `ProductInfo` também não tinha o "De". Esse foi consertado.
- A linha citada pela tarefa (por volta da 123) conferiu.
- A conferência no app local não foi feita (ver Verificação). Cabe ao reteste do QA.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 13
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/store/CLAUDE.md › Design system · Mobile · Página do produto · Carrinho, chrome e checkout; DESIGN.md §1–§4; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: apps/store/src/entities/product/ui/__tests__/ProductInfoPrecoRiscado.test.tsx — "de/por" cadastrado (vermelho antes, verde depois) e peça de campanha (já passava; check de mutação deu vermelho). Sem cobertura: o riscado da barra fixa (ProductBuyBar), que está na cerca da tarefa 10 — e é ali que mora a leitura observada pela QA.
Verificações: arquivo de teste 2/2 depois do conserto; suíte do store 7380/7381 (a 1 que falha é precoDeCampanha.test.ts, da tarefa 11 em andamento); tsc do store 0; eslint do store 2/2 (igual ao baseline). Não conferi no app local: a loja não estava de pé e subir servidor é proibido.
Árvore de trabalho: apps/store/src/entities/product/ui/ProductInfo.tsx (sr-only "De " no ramo de/por); apps/store/src/entities/product/ui/__tests__/ProductInfoPrecoRiscado.test.tsx (novo)
Citações conferidas: 2 (ProductInfo.tsx, o sr-only por volta da linha 123, confere; ProductCard.tsx com o "De", confere); nenhuma deslocada nem morta
```

## T14 — wi-impl-review · done · agente a1e483de103bbfe03

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/14-bug-5-percentuais-da-nova-campanha.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| nada |       |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão | `AdminCampaignFormPage.test.tsx:190-202`. Pela leitura, o teste reprovaria antes do conserto: sem `setErro(null)` em `tirar`, `erro` continua com "10% já está na campanha.", e a linha `PercentsCard.tsx:129` (`!erro && listRefusal …`) esconde o motivo. Que ele passe agora, e que suíte, tipos e lint não regrediram, só a execução mostra | sim, pela leitura; o resto só execução |
| O comportamento esperado do BUG-005 foi visto funcionando no app local | Nada no diff prova isso. Depende do relato do implementador | só execução |

## Obrigações

- Rodar a suíte, o `tsc` e o `eslint` dos workspaces tocados e comparar com as baselines: não dá para conferir pelo diff. Só o backoffice foi tocado, e nada de `packages/core` mudou, então as suítes da loja e do painel não eram obrigatórias por esse motivo.
- Guardas continuam verdes sem afrouxar asserção: o diff não toca nenhum guarda e não afrouxa nenhuma asserção. Se ficaram verdes, só a execução mostra.
- `packages/core/src/payment/**` só muda se a causa estiver lá: não foi tocado.

## Testes

- Tirar todos os percentuais faz aparecer "Acrescente ao menos um percentual." e some "10% já está na campanha.". Coberto em `apps/backoffice/src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx:190`, pela página real (nível certo, porque o bloco `Testes` aceita "página/`PercentsCard`").
  - A asserção morde. O caso primeiro confirma que a recusa do repetido apareceu (`getByRole('alert')` com "10% já está na campanha."). Depois do "Tirar 10%" ele exige três coisas: a ausência da recusa velha, a presença do motivo da lista vazia e o Salvar desligado.
  - O motivo da lista vazia aparece só porque `erro` foi limpo (`PercentsCard.tsx:129`). Por isso o caso discrimina o conserto: ele é falso no mundo antigo.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | A causa é o estado `erro` local do card, que sobrevivia à remoção e escondia `listRefusal`. O conserto é limpar `erro` em `tirar`, sem mexer em `core` nem no `checkDraft` | Sim | `PercentsCard.tsx:32,39,128-131`: `erro` só era limpo ao adicionar com sucesso ou ao digitar, e a linha 129 condiciona o motivo a `!erro`. A página passa `listRefusal={check.percents}` (`AdminCampaignFormPage.tsx:303`), que já trazia a frase certa. A tarefa permite essa escolha ("se o conserto passar por `refusals.ts`…") | Sim. A mudança fica dentro do componente, sem mudança de props ou contrato |
| 2 | Quando a remoção é recusada (percentual em uso), a recusa do campo fica | Sim | `PercentsCard.tsx:50-53`: com a remoção recusada, a lista não muda, e a frase do campo continua verdadeira. Nada na tarefa exige o contrário | Sim |

## Não conferido

- Que a suíte, o `tsc` e o `eslint` do backoffice passam sem regressão, e que o teste novo estava vermelho antes do conserto: depende de execução, que eu não rodei.
- A conferência no app local que o `Pronto quando` pede: depende do relato do implementador.
- Os dois arquivos aparecem com `M` em `git status`, então o diff tinha baseline. O `PercentsCard.tsx` só tem no histórico o commit da T01 da mesma feature, e o diff dele contém apenas esta mudança.

Instruções lidas: `CLAUDE.md` (raiz; recebido inteiro no contexto) e `apps/backoffice/CLAUDE.md` (só o índice de títulos, conferido para achar alguma seção que governasse estado de recusa em formulário, e não há). Não li `packages/core/CLAUDE.md` › campaigns: o diff não toca `packages/core`.

## T10 — wi-impl-review · fixing · agente a283fca50aa3ac45b

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/10-bug-1-barra-fixa-de-compra.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | premissa derrubada | quebra | apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx:131-170 (o diff inteiro; a premissa 1 se apoia só nele) | A premissa 1 fecha "pelo caminho 'não reproduziu com toque real'". Mas nenhum toque real nem emulado chegou a ser tentado (premissa 2: nenhum navegador subiu). A única execução é um `fireEvent` em jsdom, que dispara `click` de qualquer jeito e não enxerga se a barra está na viewport (`translate-y-full`). Ou seja, não testa nem a hipótese do implementador. O diagnóstico pela screenshot é plausível (conferi: a barra não aparece em `CH-04-02-toque-sem-efeito-390.png`), mas é inferência, não "a evidência da tentativa" que a tarefa exige para esse caminho. Os dois itens de `Pronto quando` que pedem o app local ficam descobertos. | Decisões já tomadas: "Reproduza com emulação de toque (Playwright `hasTouch: true`/`isMobile: true`, `page.tap`) ou com o DevTools em modo dispositivo. […] **Não reproduziu com toque real** ⇒ […] feche a tarefa como `fechou com divergência`, com a evidência da tentativa (o que rodou, o resultado)". Pronto quando: "O comportamento esperado do BUG-001 foi visto funcionando no app local (relate como conferiu)." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão | ProductPageCampanha.test.tsx:150-170. Não houve conserto, então "reprovava antes" não se aplica a este caminho. A suíte, os tipos e o lint só a execução prova | em parte · só execução |
| O comportamento esperado do BUG-001 foi visto funcionando no app local (relate como conferiu) | nada. Nenhum navegador, nenhum toque emulado (premissa 2) | não |

## Obrigações

- Suíte, `tsc` e `eslint` do workspace store: não há como conferir no diff. Ficam para a execução.
- Guardas verdes sem afrouxar: o diff não toca guarda nem asserção existente. Só acrescenta um `describe` e dois casos.
- `packages/core/src/payment/**`: não foi tocado (fora de `alterados`).

## Testes

- Teste de componente ou da página real com a sequência de toque, asserindo o estado do `useCart`: está em `ProductPageCampanha.test.tsx:156-170`, sobre a `ProductPage` real. A sequência é touchStart/pointerDown/touchEnd/pointerUp/mouseDown/mouseUp/click. A asserção morde para a fiação: a peça entra no `useCartStore` com `id` e `unitPrice` (167.92 = 209.9 × 0,8 com campanha, 209.9 sem). Apagar o `onClick={buy.tap}` da barra (ProductBuyBar.tsx:164) a reprova. Ela não morde para a hipótese levantada (barra fora da viewport), porque jsdom não mede layout e o `click` sai de qualquer jeito. Também nunca esteve vermelha, já que não houve conserto.
- Prova em navegador com toque emulado em 390 × 844 (M-A e M-E): não existe. É a linha 3 de `sem mutação`, "não executada".

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Não mexer no código de produto e fechar como "não reproduziu com toque real", deixando o `cannot-reproduce` para o reteste | Em parte. Não corrigir às cegas bate com a tarefa. O rótulo "não reproduziu com toque real" não se sustenta: toque real nunca foi tentado | A ressalva do árbitro e as "Decisões já tomadas" da tarefa exigem toque emulado ou real antes desse caminho (achado 1). A screenshot confirma a barra fora da tela, e `ProductBuyBar.tsx` / `useScrolledPast` confirmam `translate-y-full` enquanto a foto está visível. O diagnóstico é plausível, mas não está provado | Sim: o BUG-001 segue `open`, e o reteste precisa rolar além da foto |
| 2 | Não subir dev server nem navegador | Não consigo julgar a regra 8, que não está na tarefa nem no arquivo de instruções. A consequência é o achado 1: a tarefa pede justamente essa prova | Tarefa › Decisões já tomadas e Pronto quando, item 2 | Sim: declara que a prova fica para o reteste |
| 3 | O teste vai na página real (`ProductPageCampanha.test.tsx`), não no `ProductBuyBar.test.tsx` | Sim | A tarefa pede "da página real, `ProductPage`, se o fio passar por ela", e o arquivo monta a `ProductPage` real com a peça vinda do mapeador | Sim |

## Não conferido

- Os resultados da suíte, de `tsc` e de `eslint`: só a execução prova.
- Se o defeito existe com toque real em 390 × 844. Só o reteste com rolagem além da foto, ou uma prova Playwright com `hasTouch`, decide. Isso também vale para a lixeira da gaveta, que a tarefa manda o reteste conferir.
- A "regra 8" citada na premissa 2 não está em nenhum texto que li.
- O diff vem com intent-to-add normal (`M`). Nada ficou sem baseline.

Instruções lidas: `CLAUDE.md` (raiz, carregado no contexto: O "defeito 01", Convenções, Os guardas, Baselines, FSD/Alias) · `apps/store/CLAUDE.md` › índice de títulos e › Página do produto · `DESIGN.md` › só o índice de títulos (o diff é só de teste e não toca UI).

## T10 — wi-impl-task · done · agente a4233c168a1a653eb

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/10-bug-1-barra-fixa-de-compra.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada. As premissas 1–3 da implementação continuam como estavam. O achado 1 não foi aplicado; a razão está em `Ao humano`.

## Fatias

nada

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx alterado (é da implementação; a correção não alterou nada)

## Verificação

nada novo. A correção não rodou nenhum comando, porque não aplicou o achado.
Instruções lidas: as mesmas da implementação.

## Divergências e descobertas

nada novo

## Ao humano

O achado 1 está certo nos fatos e mesmo assim não o apliquei.

**O que o achado aponta, e está correto:**
- Nenhum toque real nem emulado foi tentado.
- O teste em jsdom não enxerga a viewport, então não testa a hipótese da barra escondida.
- Os dois itens de `Pronto quando` que pedem o app local ficaram descobertos.

**Por que não apliquei:** cumprir o achado exige subir o Vite do worktree e um Chromium com Playwright (`hasTouch`/`page.tap`). O meu procedimento proíbe as duas coisas.
- A regra 8 diz: "Não suba servidor, dev server, […] navegador, nem qualquer processo que fica rodando".
- O procedimento também diz que "Validação em navegador não é desta tarefa […] é da Validation e da skill de QA", mesmo quando uma instrução de projeto a pede.
- Não havia nenhum servidor de pé para usar: 8082, 8092, 4173 e 5173 não responderam.

**A divergência de fundo:** a tarefa (Decisões já tomadas e `Pronto quando`) pede uma prova que o executor não pode produzir. Ou o orquestrador ou o QA roda a tentativa de toque emulado, ou a tarefa autoriza de forma explícita o executor a subir o app local.

**O que fica para o reteste do QA:**
- Tocar em 390 × 844 com `hasTouch: true`/`isMobile: true` e `page.tap`, em dois casos:
  - sem rolar, quando a barra está com `data-revealed=false`;
  - depois de rolar além da foto, quando a barra está visível.
- Na M-A (peça de campanha) e na M-E (peça comum).
- Conferir também a lixeira da gaveta.

**Como fica a tarefa:** é "fechou com divergência" sem a evidência da tentativa. Até o reteste, o diagnóstico (a barra fora da viewport no momento do toque) é inferência a partir da screenshot. O próprio revisor confirmou que a barra não aparece em `CH-04-02-toque-sem-efeito-390.png`.

## O que devolver no fim

```
Tarefa: 10
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz: defeito 01, Convenções, Guardas, Baselines, FSD/Alias, Comandos); apps/store/CLAUDE.md (cabeçalho, Página do produto, Compre Junto, botão único); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local). DESIGN.md não lido (sem mudança de UI)
Testes escritos: apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx — "o toque em 'Adicionar à sacola' na barra fixa do celular": peça de campanha (R$ 167,92) e peça comum (R$ 209,90), pela ProductPage real, com touch, pointer, mouse e click em jsdom. Verdes de primeira; o check de mutação (onClick da barra anulado) deu vermelho nos dois. Sem cobertura: a tentativa com toque emulado em navegador em 390 × 844, e por isso o "visto funcionando no app local". O executor não pode subir dev server nem navegador; a revisão adversarial apontou essa lacuna, e ela foi levada ao humano
Verificações: arquivo novo 7/7; tsc do store 0 (baseline 0); eslint do arquivo 0; suíte do store 7380/7381 — a falha é precoDeCampanha.test.ts, teste vermelho da tarefa paralela de mapProduct
Árvore de trabalho: apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx (2 casos novos); nenhum código de produto alterado
Citações conferidas: 2 (ProductBuyBar.tsx e useBuyAction.ts); nenhuma deslocada nem morta
```
Diagnóstico por inferência, para o reteste: no screenshot de evidência a barra não aparece, porque fica em `translate-y-full` enquanto a foto principal está visível; o driver clicou fora da viewport. Reteste com toque emulado ou real, antes e depois de rolar além da foto, nas peças M-A e M-E, e confira a lixeira da gaveta.

## T13 — wi-impl-review · fixing · agente ad50ce15b0baff810

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/13-bug-4-preco-riscado-sem-de.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | critério descoberto | quebra | apps/store/src/widgets/product-buy-bar/ui/ProductBuyBar.tsx:144-146 (fora do diff; o diff é só `apps/store/src/entities/product/ui/ProductInfo.tsx:142`) | O texto que a QA observou, "R$ 346,50R$ 385,00R$ 322,24no Pix", é a barra fixa, não o bloco de preço do `ProductInfo`. A barra é a única que diz "no Pix" (`ProductBuyBar.tsx:155`); o `ProductInfo` diz "com Pix". Além disso, o ramo de campanha do `ProductInfo` já tinha `<span className="sr-only">De </span>` no build da QA (`git show a1c6ea53:…/ProductInfo.tsx`, linha 123). O conserto pôs o "De " no ramo "de/por" cadastrado, que não é o caminho da peça observada. A barra segue lendo dois preços seguidos, então o esperado do BUG-004, no mesmo passo e no mesmo viewport (390 × 844, onde quem compra é a barra), continua falhando. A tarefa 10 (a da barra) não traz nada sobre o "De", então ninguém da fila vai fechar isso. O implementador declara a barra na premissa 1, mas a declaração não cumpre o critério. A correção é uma linha: o `<span className="sr-only">De </span>` no span `line-through` da barra, quando a cerca da tarefa 10 sair, com o teste correspondente. | Pronto quando: "O comportamento esperado do BUG-004 foi visto funcionando no app local". Esperado: "O preço riscado é anunciado como 'De R$ 385,00' (o 'De ' só para leitor de tela), como nos cartões." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão | `ProductInfoPrecoRiscado.test.tsx`: o caso "de/por" reprova antes (o ramo não tinha o `sr-only`). O caso de campanha já passava antes, porque o ramo de campanha já tinha o "De". Suíte, tipos e lint: só execução | em parte; o resto, só execução |
| O comportamento esperado do BUG-004 foi visto funcionando no app local | Nada no diff alcança o texto observado (a barra fixa); ver achado 1 | não |

## Obrigações

- **Suíte, `tsc` e `eslint` do workspace store contra as baselines:** só execução; não confiro.
- **Guardas verdes sem afrouxar asserção:** o diff não toca nenhum guarda e acrescenta só um `span sr-only`. Nada afrouxado.
- **`packages/core/src/payment/**` só muda se a causa estiver lá:** o diff não toca o diretório.

## Testes

- **Riscado lido "De R$" na peça de campanha e no "de/por" cadastrado** (`apps/store/src/entities/product/ui/__tests__/ProductInfoPrecoRiscado.test.tsx`):
  - **Caso "de/por":** morde. Ele assere o texto plano "De R$ 385,00" e o `.sr-only` com "De ", e é vermelho sem a linha nova.
  - **Caso de campanha:** a asserção é correta, mas era verde antes do conserto, porque o ramo já tinha o "De". Isso contraria o "vermelho antes do conserto" do bloco `Testes`. E ele não cobre a superfície onde a QA viu o defeito, a barra fixa.
  - **A barra fixa não tem teste.** Esse é o achado 1, visto pelo lado do teste.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Não tocar o `ProductBuyBar.tsx` por causa da cerca da tarefa 10 em paralelo | Não tocar o arquivo cercado se sustenta. O que não se sustenta é tratar a barra como resíduo: pela evidência da QA ("no Pix", e o ramo de campanha já com o "De"), a barra é o lugar do defeito observado. Então o conserto do `ProductInfo` não resolve o BUG-004 | `ProductBuyBar.tsx:144-155`; `git show a1c6ea53` do `ProductInfo.tsx` (linha 123, o `sr-only` já presente no ramo de campanha); `apps/store/CLAUDE.md` › Página do produto ("Quem compra no celular é a barra fixa"); a tarefa 10 sem menção ao "De" | Sim: ele lista a barra e diz que o reteste reprova. Falta dono na fila para a correção |
| 2 | O mesmo `sr-only "De "` no ramo "de/por" do `ProductInfo`, sem componente novo | Sim | `ProductCard.tsx:378-379` e o ramo de campanha do `ProductInfo.tsx:122-123` usam a mesma forma | Sim, nenhum arquivo fora |

## Não conferido

- Suíte, `tsc`, `eslint` e a prova no app local: só a execução mostra, e eu não executo.
- Por que o diagnóstico do implementador foi o ramo "de/por": o retorno dele não veio junto. Concluí que o texto observado é o da barra fixa comparando as strings ("no Pix" × "com Pix") e a presença prévia do `sr-only` no ramo de campanha, sem rodar a página.
- **Instruções lidas:**
  - `CLAUDE.md` (raiz), que veio no contexto
  - `apps/store/CLAUDE.md` › cabeçalho, Design system, Mobile — o que quebra e não grita, Página do produto
  - `DESIGN.md`: só uma busca por "riscad", "sr-only" e "leitor", sem ocorrência; não lido por inteiro

## T13 — wi-impl-task · done · agente ac38995b7ba673d3f

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/13-bug-4-preco-riscado-sem-de.md
Situação: fechou

O achado 1 foi aplicado. A barra fixa de compra agora lê o preço riscado como "De R$ X": pus o mesmo `<span className="sr-only">De </span>` no riscado dela. O teste novo da barra reprovou antes do conserto e passa depois. Ainda não vi isso funcionando no app local, porque a loja não estava de pé e subir servidor é proibido. A prova no app fica para o reteste do QA.

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Pus o `<span className="sr-only">De </span>` no riscado da barra fixa (`ProductBuyBar.tsx`, no ramo `!conjunto && savings`). | Deixar a barra para depois, que era a premissa 1 da implementação. | A cerca saiu: a tarefa 10 está `done`. O achado mostrou que a barra é exatamente o que a QA leu. | Nenhum fora do arquivo. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 3 | O riscado da barra fixa é lido "De R$ 385,00", com o "De " só para leitor de tela | componente (`ProductBuyBar` montado com a coluna, como na `ProductPage`) | `apps/store/src/widgets/product-buy-bar/ui/__tests__/ProductBuyBar.test.tsx` › "o preço riscado da barra é lido 'De R$ X'…" | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

apps/store/src/entities/product/ui/ProductInfo.tsx alterado
apps/store/src/entities/product/ui/__tests__/ProductInfoPrecoRiscado.test.tsx criado
apps/store/src/widgets/product-buy-bar/ui/ProductBuyBar.tsx alterado
apps/store/src/widgets/product-buy-bar/ui/__tests__/ProductBuyBar.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/widgets/product-buy-bar/ui/__tests__/ProductBuyBar.test.tsx --testTimeout=20000` (fonte: PROJECT.md):
  - antes do conserto: o caso novo reprovou (recebeu "R$ 385,00", esperava "De R$ 385,00"); 12 passaram.
- `pnpm --filter @estrelinha/store exec vitest run src/widgets/product-buy-bar --testTimeout=20000` (fonte: PROJECT.md):
  - depois do conserto: 27/27, exit 0.
- `ProductInfoPrecoRiscado.test.tsx` rodado de novo: 2/2, exit 0.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (fonte: CLAUDE.md › Baselines):
  - **7384/7384 casos passaram, em 401 arquivos.**
  - Mesmo assim o exit é 1: o vitest acusou um erro não tratado, `[vitest-worker]: Timeout calling "onTaskUpdate"`. É contenção do worker, sem nenhum caso reprovado. O `CLAUDE.md` já registra a mesma assinatura em 2026-11-09.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (fonte: CLAUDE.md):
  - dá 1 erro, `supabase/functions/mercado-pago/handlers.ts(622,81) TS2345`.
  - O arquivo está sendo alterado por outra tarefa da onda e eu não toquei nele.
  - Contra o baseline `limpo`, nenhum erro está em arquivo desta tarefa.
- `npx eslint .` em `apps/store` (fonte: CLAUDE.md): 2 erros e 2 warnings, igual ao baseline.
- App local: as portas 8092 e 8082 não responderam, então não houve conferência em navegador. Subir dev server é proibido pela regra 8.
- Instruções lidas: as mesmas da implementação.

## Divergências e descobertas

- Fatia 3 sem check de mutação, porque passou pelo vermelho no próprio ciclo.
- Erro de tipo alheio na árvore: `supabase/functions/mercado-pago/handlers.ts:622`, TS2345, vindo de mudança não commitada de outra tarefa da onda.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 13
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/store/CLAUDE.md › Design system · Mobile · Página do produto · Carrinho, chrome e checkout; DESIGN.md §1–§4; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: ProductInfoPrecoRiscado.test.tsx — "de/por" cadastrado (vermelho → verde) e peça de campanha (já passava; check de mutação deu vermelho); ProductBuyBar.test.tsx — o riscado da barra fixa é lido "De R$ X" (vermelho → verde). Sem cobertura em navegador: a loja local não estava de pé.
Verificações: arquivos de teste verdes; suíte do store 7384/7384 (exit 1 só pelo timeout de RPC do worker, contenção); eslint do store 2/2 (igual ao baseline); tsc do store com 1 erro em supabase/functions/mercado-pago/handlers.ts, de outra tarefa (nenhum em arquivo desta). Comportamento no app local não conferido (sem servidor de pé).
Árvore de trabalho: apps/store/src/entities/product/ui/ProductInfo.tsx; apps/store/src/entities/product/ui/__tests__/ProductInfoPrecoRiscado.test.tsx (novo); apps/store/src/widgets/product-buy-bar/ui/ProductBuyBar.tsx; apps/store/src/widgets/product-buy-bar/ui/__tests__/ProductBuyBar.test.tsx
Citações conferidas: 2 (ProductInfo.tsx, o sr-only por volta da linha 123; ProductCard.tsx com o "De"); nenhuma deslocada nem morta
```

## T11 — wi-impl-task · review · agente a36cfaf250554f649

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/11-bug-2-preco-de-campanha-com-de-por.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A causa: a regra `campaignUnitPrice` estava certa, mas a peça sem grade entrava com o "de" errado. O "de" dela mora na variação única: M-C tem `original_price` nulo e a variação tem `compare_price` 374. A loja (`withCampaign`), o topo do cartão do painel, a `checkout` (`price_source = 'base'`) e a `mercado-pago` liam `original_price`. O feed e a tabela do painel liam a variação. Medido no banco local: nenhum produto tem `original_price > base_price`, e 6 peças sem grade têm "de/por" só na variação. | Mudar `campaignUnitPrice`. Fazer a peça sem grade comprar pela variação (`variantId` e `price_source = 'variant'`), o que mexeria no modelo da sacola. | É o menor ponto de correção, e uma regra com um dono só (RN-04). | Todos os leitores de campanha da peça comprada sem variação escolhida. |
| 2 | Regra nova em `core`: `pieceComparePrice(price, compare, variants)` em `packages/core/src/campaigns/price.ts`. É uma folha, sem import. Quando a peça tem **exatamente uma** variação com o **mesmo preço** da peça (comparado em centavos), vale o maior entre o "de" da peça e o da variação. Fora isso, fica o "de" da peça. A função conta todas as linhas de variação recebidas, ativas ou não, porque a loja (`normalizeVariants`) e as functions leem todas. | Exigir a variação ativa. Aceitar variação de outro preço. | Assim nunca se junta o "de" de uma linha com o "por" de outra, e a loja e o servidor recebem a mesma entrada. | `mapProduct`, `CampaignPriceCards`, `checkout/handlers.ts`, `mercado-pago/handlers.ts`. |
| 3 | `list_prices.compare_price` da peça passa a ser o resultado de `pieceComparePrice`. Assim a sacola (`cartLineCampaign`) e o checkout (`resolveOrderPricing`) partem do "de" certo sem mudar nada em `entities/cart`. | Mexer em `campaignPricing.ts`. | Ele já lê `list_prices`. | Sacola, checkout, `useCartCatalog`. |
| 4 | Servidor: a `checkout` (`campanhaDoPedido`) lê `product_variants` por `product_id` e passa o resultado a `pieceComparePrice` nas linhas `base`. A `mercado-pago` faz a mesma leitura só para as peças de campanha sem variação escolhida. Com isso o pedido grava `compare_unit_price` 374 e `campaign_discount` 13,30, e a cobrança dá R$ 336,60. | Ler `order_items.compare_unit_price` gravado na `mercado-pago`. | A function já relia o preço do banco; mantive o caminho e só corrigi o "de". | `orders.campaign_discount`, `order_items.compare_unit_price`, guarda de teto do `create-payment`. |
| 5 | A montagem de pedido (`core/proposals/piece.ts` e `order-proposals`) ficou sem mudança. | Aplicar `pieceComparePrice` em `campanhaBase`. | Lá a peça com uma variação ativa já precifica pela variação (`variacoes.length === 1`), então chega a R$ 336,60. `campanhaBase` só vale com zero variações ativas. | nenhum |
| 6 | A peça sem campanha continua mostrando o "de" do banco (`original_price`), sem o da variação. | Usar `pieceComparePrice` também no `mapRow`. | A tarefa trata do preço de campanha. Mudar a vitrine sem campanha seria ampliar o escopo. | nenhum (registrado em Divergências) |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | "De" da peça sem grade vem da variação única: 374 ⇒ 10% dá 336,60; sem "de", 385 a 20% dá 308,00 | domínio (core) | `packages/core/src/campaigns/__tests__/price.test.ts` | sim | — |
| 2 | `mapProduct`: M-C a 10% ⇒ 336,60, "De" 374, `list_prices.compare_price` 374; o par sem "de" (385 ⇒ 308) segue verde | unitário | `apps/store/src/entities/product/lib/__tests__/precoDeCampanha.test.ts` | sim | — |
| 3 | Sacola: linha sem variação escolhida ⇒ "de" 374 por 336,60, igual ao `offerPricing` do feed | unitário | `apps/store/src/entities/cart/lib/__tests__/campaignPricing.test.ts` (novo) | sim | — |
| 4 | Painel: topo e tabela do cartão dão R$ 336,60 e "De" R$ 374,00 para a mesma variação | página real | `apps/backoffice/src/pages/admin/AdminProductFormPage.campanha.test.tsx` | sim | — |
| 5 | `create-order` grava `compare_unit_price` 374 e `campaign_discount` 13,30 | unitário (function) | `supabase/functions/checkout/__tests__/createOrderCampanha.test.ts` | sim | — |
| 6 | `create-payment` cobra 336,60, nunca 314,91 | unitário (function) | `supabase/functions/mercado-pago/__tests__/campaignCharge.test.ts` | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

packages/core/src/campaigns/price.ts — alterado
packages/core/src/campaigns/__tests__/price.test.ts — alterado
apps/store/src/entities/product/lib/mapProduct.ts — alterado
apps/store/src/entities/product/lib/__tests__/precoDeCampanha.test.ts — alterado
apps/store/src/entities/cart/lib/__tests__/campaignPricing.test.ts — criado
apps/backoffice/src/features/product-form/ui/CampaignPriceCards.tsx — alterado
apps/backoffice/src/pages/admin/AdminProductFormPage.campanha.test.tsx — alterado
supabase/functions/checkout/handlers.ts — alterado
supabase/functions/checkout/__tests__/createOrderCampanha.test.ts — alterado
supabase/functions/mercado-pago/handlers.ts — alterado
supabase/functions/mercado-pago/__tests__/campaignCharge.test.ts — alterado

## Verificação

- Um arquivo de teste por fatia, com `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (fonte: PROJECT.md › Comandos de verificação). Cada fatia ficou vermelha antes do conserto e verde depois.
- Suítes inteiras, com o código de saída lido fora de pipe (fonte: CLAUDE.md › Baselines):
  - core: **5865/245**, exit 0
  - functions: **1703/49**, exit 0
  - store: **7383/401**, exit 0
  - backoffice: **5357/306**, exit 0
  - Esses números incluem o trabalho das tarefas paralelas que já está na árvore.
- Tipos com `npx tsc --noEmit -p` (fonte: CLAUDE.md › Comandos). Comparação contra a baseline do CLAUDE.md (o orquestrador não passou baseline):
  - store: **0**. A primeira rodada acusou 1 erro meu, um TS2345 em `mercado-pago/handlers.ts`; corrigi tipando com `VariantListPrice`.
  - backoffice: **7**, os herdados de `ProposalStateBadge.test.tsx`.
  - core: **11**, os herdados.
  - Nenhum erro novo.
- Lint com `npx eslint .` (fonte: CLAUDE.md › Baselines): store **2/2** e backoffice **23/5**, iguais à baseline. Nenhum arquivo meu aparece.
- Conferência no app local: os dev servers 8092 e 8093 estavam fora do ar, e não os subi. Rodei uma sonda com `tsx` (script no scratchpad) que lê a linha real da M-C no PostgREST local (`PRODUCT_CARD_SELECT`, chave publicável) e passa pelo `mapDbToProduct` e pelo `cartLineCampaignPrice` reais. A Black Friday da QA já terminou às 19:17 do dia 13/11, então a sonda injeta a marca de 10% como a RLS a entregaria em vigência. Resultado:
  - linha do banco: base 349,90, `original_price` nulo, variação [349,90; 374]
  - loja: **336,6, "De" 374**
  - sacola: **336,6, "De" 374**
  - `offerPricing` do feed: price 374, salePrice 336,6
- Instruções lidas:
  - CLAUDE.md, já em contexto, incluindo O "defeito 01", Convenções, Os guardas, Baselines, FSD e Alias
  - apps/store/CLAUDE.md › Design system · Mobile · Página do produto · Carrinho, chrome e checkout
  - apps/backoffice/CLAUDE.md › Molde dos formulários · Descontos
  - packages/core/CLAUDE.md › Dinheiro
  - DESIGN.md, seções 1–2
  - .specs/project/PROJECT.md › Comandos de verificação · Ambiente local

## Divergências e descobertas

- A tarefa supõe que a peça sem grade tem o "de/por" no nível da peça. Na verdade ele mora só na variação única: no banco local, 0 produtos têm `original_price > base_price`. Corrigi o "de" que o código lê; não mexi em dado nenhum.
- A M-C, sem campanha, continua sem "De R$ 374,00" na loja, enquanto o feed anuncia esse "de/por" (lacuna anterior ao WI, fora do escopo; ver decisão 6).
- A prova no app foi por sonda, não em navegador: dev servers fora do ar e a Black Friday encerrada no banco local (ver Verificação). O caminho do servidor, com `checkout` e `mercado-pago` servidas, foi provado só pelos testes unitários das functions, sem servi-las localmente.
- O pedido #0604, gravado a R$ 314,91, não foi tocado.
- Propagação: nenhuma das tarefas seguintes (12–15) afirma algo que esta mudança tornou falso.
- Caducou: nada.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 11
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/store/CLAUDE.md (Design system, Mobile, Página do produto, Carrinho/checkout); apps/backoffice/CLAUDE.md (Molde dos formulários, Descontos); packages/core/CLAUDE.md › Dinheiro; DESIGN.md (§1–2)
Testes escritos: core price.test.ts (pieceComparePrice: 374⇒336,60; sem "de" 385⇒308; grade/preço diferente/lista ausente); store precoDeCampanha.test.ts (mapProduct M-C ⇒ 336,60/374 e list_prices; par 385⇒308); store entities/cart/lib/__tests__/campaignPricing.test.ts (sacola 336,60/374 e paridade com offerPricing do feed); backoffice AdminProductFormPage.campanha.test.tsx (topo e tabela = R$ 336,60); functions createOrderCampanha.test.ts (compare_unit_price 374, campaign_discount 13,30); functions campaignCharge.test.ts (cobra 336,60). Sem cobertura: prova em navegador (dev servers fora do ar; feita por sonda contra o PostgREST local)
Verificações: suítes core 5865/245, functions 1703/49, store 7383/401, backoffice 5357/306, exit 0; tsc store 0 · backoffice 7 (herdados) · core 11 (herdados); eslint store 2/2 · backoffice 23/5 (baseline); sonda local: loja e sacola 336,6 "De" 374, feed 374/336,6
Árvore de trabalho: packages/core/src/campaigns/price.ts (+pieceComparePrice) e teste; apps/store mapProduct.ts e precoDeCampanha.test.ts, novo entities/cart/lib/__tests__/campaignPricing.test.ts; apps/backoffice CampaignPriceCards.tsx e AdminProductFormPage.campanha.test.tsx; supabase/functions checkout/handlers.ts e mercado-pago/handlers.ts e seus testes de campanha. Nada commitado
Citações conferidas: 5 (mapProduct.ts, campaignPricing.ts, CampaignPriceCards.tsx, CampaignCardPreview.tsx, core/campaigns); nenhuma deslocada ou morta. types.ts de entities/campaign não precisou mudar
```

## T11 — wi-impl-review · done · agente a5d7e12c56a748a16

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/11-bug-2-preco-de-campanha-com-de-por.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão | testes novos em `price.test.ts`, `precoDeCampanha.test.ts`, `campaignPricing.test.ts`, `AdminProductFormPage.campanha.test.tsx`, `createOrderCampanha.test.ts`, `campaignCharge.test.ts`. Pela leitura, cada um reprovaria com o código anterior (detalhe em Testes) | só execução |
| O comportamento esperado do BUG-002 visto funcionando no app local | — | só execução |

Conferido no código que cada superfície passa pelo `pieceComparePrice` de `core` antes do `campaignUnitPrice`:
- loja: `mapProduct.ts` (`withCampaign`), que alimenta `list_prices.compare_price` e, por ele, a sacola e o checkout;
- painel: o topo do cartão da campanha, em `CampaignPriceCards.tsx`;
- servidor: a `checkout` (`campanhaDoPedido`, linhas `base`) e a `mercado-pago` (`createPayment`, peças sem variação escolhida).

O feed já lia a variação. Nenhuma tela faz uma segunda conta: RN-04 se mantém.

## Obrigações

- **Suíte, tsc e eslint por workspace, mais as suítes da loja e do painel:** só execução, não conferível por leitura.
- **Guardas sem afrouxar:** nenhum arquivo de guarda está em `alterados`, e nenhuma asserção existente foi tocada. Os diffs de teste só acrescentam casos. Em `campaignCharge.test.ts`, `produtos`/`variacoes` entraram no cenário de forma opcional, mantendo o valor padrão de antes.
- **`packages/core/src/payment/**`:** sem mudança, nenhum arquivo em `alterados`.
- **`price.ts` continua folha:** sem import, como o cabeçalho afirma. É alcançável pelo Deno pelo caminho com `.ts` nos dois handlers.

## Testes

- **`mapProduct` com "de" 374 / "por" 349,90 a 10 % ⇒ 336,60 e "De" 374, mais o par sem "de" (385 a 20 % ⇒ 308)**
  - Arquivo: `apps/store/src/entities/product/lib/__tests__/precoDeCampanha.test.ts`.
  - Morde: com `original_price` nulo e o código antigo, o preço daria 314,91 e o "De" 349,90. Também asserta `list_prices`.
- **`campaignPricing` (sacola)**
  - Arquivo: `apps/store/src/entities/cart/lib/__tests__/campaignPricing.test.ts`, novo.
  - Morde: `pricing.compare_price` 374 e o cobrado 336,60 vêm do `mapDbToProduct` real.
- **Cartão do painel: topo e tabela no mesmo valor**
  - Arquivo: `AdminProductFormPage.campanha.test.tsx`, pela página real.
  - Morde: asserta R$ 336,60 no topo, `<s>` R$ 374,00, a ausência de R$ 314,91, e a tabela com 374 / 336,60.
- **Paridade com o feed**
  - Arquivo: `campaignPricing.test.ts`, com `offerPricing` de `core/shopping`.
  - Morde: compara o par cheio/cobrado da sacola com `price`/`salePrice` do feed. Ressalva: a entrada do feed é escrita à mão (os dados da variação), não derivada da linha. Isso reproduz o que o feed faz e não é defeito.
- **Regra pura**
  - Arquivo: `packages/core/src/campaigns/__tests__/price.test.ts`.
  - Morde: cobre variação única, o "de" de peça × variação, a variação de outro preço, a grade e a lista nula.
- **Servidor**
  - Arquivos: `createOrderCampanha.test.ts` (`compare_unit_price` 374, `campaign_discount` 13,3) e `campaignCharge.test.ts` (cobra 336,60).
  - Morde: no `campaignCharge`, com o código antigo o recálculo daria um desconto maior que o teto gravado, então 422, e o teste espera 200.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | A causa é o "de" errado na peça sem grade, não a regra | sim | `campaignUnitPrice` intocado. O feed (`core/shopping/offer.ts`) lê a variação. Os quatro leitores de `original_price` foram corrigidos | sim. Os demais usos de `campaignUnitPrice` não se alteram por esta causa: `CampaignCardPreview` usa uma peça fixa de prévia com `compare` nulo, e os de `proposals` estão na premissa 5 |
| 2 | `pieceComparePrice` em `core`, como folha, contando variações ativas ou não | sim | A policy `product_variants_public_read` (migration `20260801120400`) dá ao anônimo todas as variações de produto ativo, sem filtro por `is_active`. `normalizeVariants` mantém as inativas. A loja e as functions recebem, portanto, a mesma entrada | sim |
| 3 | `list_prices.compare_price` passa a ser o resultado da função | sim | A sacola lê `list_prices`. O teste da sacola prova isso | sim |
| 4 | A `checkout` e a `mercado-pago` leem `product_variants` por `product_id` | sim | Na `checkout`, um erro na leitura vira `erro: 'precos'`, como nas leituras vizinhas. Na `mercado-pago`, o erro é ignorado, no mesmo padrão da leitura de `products` logo acima. O `.in` usa os mesmos `ids` da leitura de `products`, então não traz risco novo | sim |
| 5 | A montagem de pedido fica sem mudança | sim | Não contradita no código lido. Fica o caso de borda de uma peça com variação única inativa (premissa 2 e `campanhaBase`), não comprovado como alcançável | sim |
| 6 | A peça sem campanha mantém o `original_price` | sim | A tarefa trata do preço de campanha. O teste "sem campanha" fixa esse comportamento | sim |

## Não conferido

- Execução de suítes, tsc, eslint e a prova no app local: não rodo código.
- Se o `createFakeSupabase` aplica o filtro `.in('product_id', …)` nas duas leituras de `product_variants` da `checkout`. Não li o dublê. Os testes novos passam um único item, então isso não muda o resultado.
- Todos os 11 arquivos de `alterados` aparecem no `git diff` (o novo como `A`, com intent-to-add). Nenhum sem baseline.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (raiz, recebido inteiro no contexto: defeito 01, convenções, guardas, baselines, FSD/alias); `packages/core/CLAUDE.md` › Dinheiro e o índice de títulos. `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md` e `DESIGN.md` não foram lidos: o diff não toca tokens, layout nem UI nova, só o cálculo do preço.

## T15 — wi-impl-task · review · agente aeed7632c47fc9ec2

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/15-bug-6-ver-todas-no-celular.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Causa: o link de `ProductCarousel` levava `hidden … md:inline`. O conserto é uma prop opcional nova, `linkOnMobile` (o padrão é `false`), em `ProductCarousel`. Com ela ligada, o link fica visível em toda largura, com `TAP_ROW` (44 px de altura), 13 px no celular e 15 px a partir de `md`, como o "Ver todos" do `SectionHeading`. Só o `CampaignOffers` a liga | Tirar o `hidden` para todas as fileiras. Desenhar um link próprio dentro do `CampaignOffers` | As fileiras de coleção da Home ficam como estão (`HOME-04`). Um segundo link desenhado à mão seria um segundo dono do cabeçalho. A prop é a menor mudança e a mais fácil de desfazer | `ProductCarousel` (só quem passar `linkOnMobile`) e o bloco da campanha |
| 2 | Com `linkOnMobile`, o cabeçalho da fileira pode quebrar linha: `flex-wrap gap-y-3` no `SectionHeading`, e `ml-auto flex-wrap` no grupo de link e setas | Deixar como está | Título, link e as duas setas de 40 px numa largura estreita (390 com zoom ou fonte a 200 %) empurrariam a página para o lado. Com a quebra de linha, o grupo desce para baixo do título | Só as fileiras com `linkOnMobile`, hoje só a da campanha |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | "Ver todas" vai para `/ofertas` sem classe que o esconda abaixo de `md` (régua por token exato) e com alvo de 44 px | frontend (componente) | `apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx` › "Ver todas" também no celular… | sim (falhava antes: `expected [ 'hidden', … ] to not include 'hidden'`) | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

apps/store/src/widgets/product-carousel/ui/ProductCarousel.tsx alterado
apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx alterado
apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx --testTimeout=20000` (de `PROJECT.md` › Comandos de verificação): antes do conserto, 1 falha e 15 passaram. Depois do conserto, `campaign-offers` mais `product-carousel` rodados juntos: 52 de 52 passam.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (de `CLAUDE.md` › Baselines): exit 1. São 7386 passando e 1 falhando, em 402 arquivos.
  - A falha é `src/test/checkoutResumoCampanha.test.tsx`. É um arquivo não rastreado da tarefa 12, que roda em paralelo nesta mesma árvore (ela mexe em `OrderSummary` e `useCheckoutTotals`).
  - É o teste vermelho dela, não regressão desta tarefa: não toca em nada que esta tarefa alterou.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (de `CLAUDE.md` › Comandos): 0 erros. O baseline é 0, então nada mudou.
- `npx eslint .` em `apps/store` (de `CLAUDE.md` › Baselines): 2 erros e 2 avisos, igual ao baseline de 2/2. `npx eslint` nas duas pastas tocadas: limpo.

Instruções lidas:
- `CLAUDE.md` (raiz, a versão injetada no contexto): O "defeito 01", Convenções, Os guardas, Baselines, FSD e Alias.
- `apps/store/CLAUDE.md` › Design system, Mobile, Produtos em destaque e "`ProductCarousel` tem TRÊS formas", Modo prévia; e o trecho sobre `/ofertas` de Endereçamento.
- `DESIGN.md` §1–2.
- `.specs/project/PROJECT.md` › Comandos de verificação.

## Divergências e descobertas

- **O app não foi conferido em navegador.** O dev server do worktree (`:8092`) não estava de pé, e subir servidor é proibido (regra 8). A validação em navegador é da QA. A tarefa pede o comportamento visto no app local, então isso fica para o reteste do BUG-006: em 390×844 e com a fonte a 200 %, conferir que "Ver todas" aparece ao lado do subtítulo, que o cabeçalho quebra linha sem rolagem horizontal, e o alvo de 44 px.
- A suíte da loja tem 1 falha da tarefa 12, que roda em paralelo (`checkoutResumoCampanha.test.tsx`, não rastreado). Não é desta tarefa.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 15
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, pelas seções citadas); apps/store/CLAUDE.md (Design system, Mobile, Produtos em destaque/ProductCarousel, Modo prévia, /ofertas); DESIGN.md §1–2; .specs/project/PROJECT.md › Comandos de verificação
Testes escritos: CampaignOffers.test.tsx — "Ver todas" também no celular: nada que o esconda abaixo do `md`, e alvo de 44 px (href /ofertas; nem hidden/invisible nem sm|md|lg:inline/block/flex por token exato; relative + before:h-11 + before:inset-x-0). Falhava antes, passa depois. Sem cobertura: a medida de layout (rolagem horizontal em 390 e fonte a 200 %), porque jsdom devolve 0 para layout
Verificações: o teste do arquivo passou de vermelho a verde; suíte da loja 7386/7387 (a 1 falha é checkoutResumoCampanha.test.tsx, da tarefa 12 em paralelo); tsc da loja 0; eslint da loja 2/2 (baseline); navegador não conferido (dev server fora do ar, e subir servidor é proibido), fica para o reteste da QA
Árvore de trabalho: apps/store/src/widgets/product-carousel/ui/ProductCarousel.tsx (prop linkOnMobile e quebra de linha do cabeçalho); apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx (passa linkOnMobile); apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx (caso novo)
Citações conferidas: 1 (CampaignOffers.tsx, no lugar indicado); nenhuma deslocada nem morta
```

## T12 — wi-impl-task · review · agente afde5922592dfec94

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/12-bug-3-resumo-do-checkout.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Causa: `useCheckoutTotals` reconstituía o "Subtotal" cheio somando de volta o progressivo e o Compre Junto, mas não `outcome.campaignDiscount`. Agora soma esse também e expõe `campaignDiscount` (o mesmo número que `resolveOrderPricing` devolve e o servidor grava em `orders.campaign_discount`) | Calcular a campanha no componente a partir de `cartLineCampaignPrice` das linhas | Um dono só (`resolveOrderPricing`); o total não muda, só a apresentação | `CheckoutTotals` (campo novo `campaignDiscount`; o valor de `subtotalBeforePromotion` passa a ser o de tabela quando há peça de campanha). Único leitor é o `OrderSummary` |
| 2 | Rótulo da linha lido de `ORDER_DISCOUNT_LABELS.campaign` (`@estrelinha/core/orders`), e a linha posta logo abaixo do Subtotal, antes do Compre Junto: a mesma ordem de `orderSummary` | Escrever "Desconto de campanha" à mão no JSX | Se o texto fosse escrito duas vezes, pedido e checkout poderiam passar a divergir (o "defeito 01") | `OrderSummary.tsx` (as variantes sidebar e bar) |
| 3 | O teste novo mora em `apps/store/src/test/checkoutResumoCampanha.test.tsx` e monta a página real, imitando `checkoutCampanha.test.tsx`. Ele lê a coluna "Seu pedido" (o `section` do heading) | Teste de unidade do `OrderSummary` com o hook dublado | A tarefa pede a página real como opção; dublar o hook deixaria de testar justamente o hook, onde está o defeito | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Com uma peça de campanha (R$ 385,00 a 20 %) e uma comum (R$ 340,00), o resumo mostra Subtotal R$ 725,00, a linha "Desconto de campanha −R$ 77,00" e o total de antes, R$ 630,50 | página (componente) | apps/store/src/test/checkoutResumoCampanha.test.tsx | sim | — (vermelho antes: Subtotal recebido R$ 648,00) |
| 2 | Sem peça de campanha a linha não existe e o Subtotal é o das peças | página (componente) | apps/store/src/test/checkoutResumoCampanha.test.tsx | sim | — (é guarda de regressão: verde antes e depois, porque o defeito não se manifesta sem campanha) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

apps/store/src/features/checkout/model/useCheckoutTotals.ts alterado
apps/store/src/features/checkout/ui/OrderSummary.tsx alterado
apps/store/src/test/checkoutResumoCampanha.test.tsx criado

## Verificação

- `npx vitest run src/test/checkoutResumoCampanha.test.tsx --testTimeout=20000` (forma de rodar um arquivo; o CLAUDE.md da raiz declara o vitest por workspace). Antes do conserto: 1 vermelho (Subtotal R$ 648,00) e 1 verde. Depois: 2/2 verdes.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md da raiz): exit 0, 0 erros. O baseline é 0, então não mudou.
- `npx eslint .` em apps/store (CLAUDE.md da raiz): 2 erros e 2 warnings, igual ao baseline 2/2. Nenhum deles nos arquivos tocados.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md da raiz): **402 arquivos e 7387 testes passaram**, mas o **exit foi 1** por 1 erro não tratado `[vitest-worker]: Timeout calling "onTaskUpdate"`. Esse erro vem da contenção do worker (a tarefa 15 roda na mesma árvore ao mesmo tempo, e o CLAUDE.md registra o mesmo erro como contenção, não como teste). Não rodei a suíte de novo.
- `packages/core` não foi tocado; `payment/**` sem alteração.

Instruções lidas: CLAUDE.md da raiz (no contexto: defeito 01, Convenções, Guardas, Baselines, FSD/Alias); apps/store/CLAUDE.md › Design system, › Mobile — o que quebra e não grita, › Carrinho, chrome e checkout (até "A sacola v4"). O arquivo tem 149 KB e por isso foi lido por seção. DESIGN.md não foi lido: a mudança reaproveita a classe da linha vizinha e não cria cor nem forma nova.

## Divergências e descobertas

- O `Pronto quando` pede para ver o comportamento no app local. Não fiz isso: pelo meu procedimento, a validação em navegador é da QA. O que cobre o bug é o teste da página real do checkout. O reteste do BUG-003 fica com a QA.
- A fatia 2 é um guarda e não tinha como reprovar antes do conserto. Fica registrado para a revisão.
- O exit 1 da suíte da loja veio do timeout de RPC do worker vitest (contenção), com 7387/7387 testes verdes.
- A gaveta da sacola não foi tocada, porque está fora do escopo da tarefa. Não conferi se ela tem a mesma forma de subtotal.
- Nada propagado: as tarefas 13, 14 e 15 não afirmam nada sobre o resumo do checkout.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 12
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/store/CLAUDE.md › Design system, Mobile, Carrinho, chrome e checkout. DESIGN.md não foi lido (a linha nova reaproveita a classe da linha vizinha).
Testes escritos: apps/store/src/test/checkoutResumoCampanha.test.tsx — (1) peça de campanha + comum: Subtotal R$ 725,00, "Desconto de campanha −R$ 77,00", total R$ 630,50 (vermelho antes, com R$ 648,00); (2) sem campanha a linha não existe (guarda, verde antes e depois). Sem cobertura: a variante "bar" (celular) do resumo, que usa o mesmo bloco `totalLines`.
Verificações: arquivo novo 2/2; tsc store 0 erros (baseline 0); eslint store 2/2 (baseline 2/2); suíte store 7387/7387 em 402 arquivos, com exit 1 por timeout de RPC do worker (contenção com a tarefa 15), sem teste reprovado. Navegador não conferido: a validação em navegador é da QA.
Árvore de trabalho: alterados useCheckoutTotals.ts (soma e expõe campaignDiscount) e OrderSummary.tsx (linha "Desconto de campanha" com rótulo de ORDER_DISCOUNT_LABELS); criado checkoutResumoCampanha.test.tsx. Nada commitado.
Citações conferidas: 3 (OrderSummary.tsx, useCheckoutTotals.ts, packages/core/src/orders/summary.ts); nenhuma deslocou nem estava morta.
```

## T15 — wi-impl-review · done · agente aa0e81e216472883d

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/15-bug-6-ver-todas-no-celular.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão | `CampaignOffers.test.tsx:195-207`. Antes do conserto, o link tinha os tokens `hidden` e `md:inline`, que o caso recusa. Pela leitura, então, ele reprovava antes. Suíte, `tsc` e lint eu não rodei | só execução |
| O comportamento esperado do BUG-006 foi visto funcionando no app local | nada no diff prova isso, porque é uma conferência em navegador | só execução |
| (Critério de aceite) "Ver todas" no celular, levando a `/ofertas`, com alvo de 44 px | `ProductCarousel.tsx`: com `linkOnMobile`, o link sai sem `hidden` e leva `TAP_ROW` (`before:h-11`). `CampaignOffers.tsx:104` passa `linkOnMobile`, e o `href` continua `campaignOffersHref()` | sim. A medida em 390 e com a fonte a 200 % só a execução prova |

## Obrigações

- Suíte, `tsc` e `eslint` no workspace store: nada no diff mostra que rodaram. É prova de execução, e eu não a fiz.
- Os guardas continuam verdes sem afrouxar asserção: o diff não toca guarda nenhum. O link agora visível no celular leva `TAP_ROW`. Isso segue `apps/store/CLAUDE.md` › Mobile ("`TAP_ROW` é 44px de altura … para texto em fluxo") e é a mesma forma do "Ver todos" de `SectionHeading.tsx:63`. `TAP_ROW` entra em template literal, sem `absolute` no mesmo elemento, então `alvoDeToqueNaoRoubaPosicao` não é afetado. Os pares de movimento ganharam `motion-reduce:transition-none`.
- `packages/core/src/payment/**`: o diff não toca.

## Testes

- "Ver todas" para `/ofertas` sem classe que o esconda abaixo de `md`, por token exato, e com alvo de 44 px: o caso está em `apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx:195`. O teste renderiza o `ProductCarousel` real; só a campanha, as peças e o `ProductCard` são dublados.
  - O split por espaço compara token exato. O caso recusa `hidden` e `invisible`, recusa as formas `sm:/md:/lg:` de display e exige `before:h-11`, `before:inset-x-0` e `relative`, que vêm de `TAP_ROW`.
  - A asserção morde: a classe anterior (`hidden … md:inline`) reprova em dois pontos. Está no nível que a tarefa declara, o teste do `CampaignOffers`.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Prop opcional `linkOnMobile` em `ProductCarousel`, com padrão `false`. Com ela, o link aparece em toda largura, com `TAP_ROW` e 13/15 px. Só o `CampaignOffers` a liga | sim | `apps/store/CLAUDE.md` › Produtos em destaque: `row` é "imóvel, é a Home de hoje (`HOME-04`)", e o padrão preserva a classe antiga byte a byte. `SectionHeading.tsx:63` usa `TAP_ROW` e 13/15 px para o mesmo papel. O "Decisões já tomadas" cita `TAP_44`, mas `apps/store/CLAUDE.md` › Mobile manda usar `TAP_ROW` em texto em fluxo, e o arquivo de instruções prevalece | sim. `grep linkOnMobile` acha só `ProductCarousel.tsx` e `CampaignOffers.tsx`, e não há tarefa depois da 15 em `tasks/` |
| 2 | Com `linkOnMobile`, `flex-wrap gap-y-3` no `SectionHeading` e `ml-auto flex-wrap` no grupo de ação | sim | `SectionHeading` junta as classes por `cn`, e `gap-y-3` refina `gap-6` sem anulá-lo. A mudança fica condicionada à prop, então as outras fileiras não mudam | sim, só a fileira da campanha |

## Não conferido

- Suíte, `tsc`, lint e a conferência do comportamento no app local (390 × 844 e fonte a 200 %, sem rolagem horizontal): só a execução e o navegador provam. O jsdom não mede layout.
- Os três arquivos aparecem como `M` no `git status`, ou seja, têm baseline. O diff foi lido inteiro, sem trecho de outra tarefa misturado.

Instruções lidas: `CLAUDE.md` (raiz, por inteiro, no contexto) · `apps/store/CLAUDE.md` › Design system, › Mobile — o que quebra e não grita, › Produtos em destaque / `ProductCarousel` tem TRÊS formas · `DESIGN.md`, só o índice de títulos (as seções não foram lidas, porque o diff não muda paleta, tipo nem forma, e 13/15 px e `text-estrelinha-primary` repetem o `SectionHeading`).

## T12 — wi-impl-review · done · agente a90e284e5dfd13ce6

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/12-bug-3-resumo-do-checkout.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| nada | | | | | |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| O teste novo reprovava antes e passa depois | `apps/store/src/test/checkoutResumoCampanha.test.tsx`. O primeiro caso exige Subtotal `R$ 725,00` e a linha `summary-campaign`. Antes do conserto o resumo mostrava R$ 648,00 e não tinha a linha, então o caso reprovaria. | sim pela leitura; o vermelho e o verde são só execução |
| A suíte, os tipos e o lint dos workspaces tocados sem regressão | — | só execução |
| O comportamento esperado do BUG-003 foi visto funcionando no app local | — | só execução |

## Obrigações

- **Suíte, tsc e eslint contra as baselines:** só execução, sem como conferir no diff. `packages/core` não foi tocado, então a suíte do painel não era obrigatória.
- **Guardas verdes sem afrouxar asserção:** nenhum guarda nem asserção existente foi alterado. A linha nova segue as classes da linha vizinha (Compre Junto): `text-estrelinha-ink-soft`/`ink` e `shrink-0`. Não tem controle novo nem texto em `accent`.
- **`packages/core/src/payment/**`:** não foi alterado.

## Testes

- **Peça de campanha (R$ 385,00 a 20 %) mais uma comum:** `checkoutResumoCampanha.test.tsx`, primeiro caso. Monta o `CheckoutPage` real e assere três coisas: Subtotal `R$ 725,00`; a linha com o texto exato `Desconto de campanha−R$ 77,00`; total `R$ 630,50`, o mesmo de antes do conserto. A asserção morde: o valor anterior do subtotal (648) e a ausência da linha reprovam.
- **Sem peça de campanha:** segundo caso. Assere que `summary-campaign` não existe, que o texto "Desconto de campanha" não aparece, e confere Subtotal R$ 340,00 e total R$ 337,90. Este caso passaria também antes do conserto, e a tarefa só exige o vermelho do primeiro. Ele protege contra a linha aparecer com zero.
- **Nível:** a página real, como a tarefa aceita.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Somar `outcome.campaignDiscount` ao subtotal reconstituído e expor `campaignDiscount` | sim | `packages/core/src/payment/pricing.ts:894-900` já trata o "cheio" como subtotal + progressivo + Compre Junto + campanha. `core/orders/summary.ts:193` usa o subtotal de tabela quando o pedido é `detailed`. O total cobrado não muda. | sim: os únicos leitores de `subtotalBeforePromotion` e `campaignDiscount` em `apps/store/src` são `OrderSummary.tsx` e o próprio hook. O `OrderSummary.test.tsx` não dubla o hook. |
| 2 | Rótulo vindo de `ORDER_DISCOUNT_LABELS.campaign`, linha logo abaixo do Subtotal e antes do Compre Junto | sim | `summary.ts:97` e `:183-184` têm a mesma ordem (campanha, depois `buy_together`). O rótulo é exportado em `core/orders/index.ts:187`. A linha está em `totalLines`, que serve as duas variantes. | sim |
| 3 | Teste na página real, em `apps/store/src/test/` | sim | `checkoutCampanha.test.tsx` já está nessa pasta, e a tarefa oferece a página real como opção. | sim (nada) |

## Não conferido

- Resultado de suíte, tsc, lint e da conferência no app local: só a execução mostra.
- Se `checkoutCampanha.test.tsx`, `OrderSummary.test.tsx` ou `compreJuntoSacolaECheckout.test.tsx` têm algum caso com peça de campanha que esperava o subtotal antigo. Pela leitura, nenhum deles assere `summary-subtotal` com campanha, mas isso só se confirma rodando.
- Os três arquivos aparecem no diff: os dois modificados como `M` e o teste novo como `A`, com intent-to-add.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (raiz) › O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, Feature-Sliced Design / Alias de import, recebido no contexto. `apps/store/CLAUDE.md` e `DESIGN.md` não foram abertos. O diff só acrescenta uma linha de texto que repete as classes da linha vizinha, sem token, cor ou controle novo.

## T16 — wi-impl-task · review · agente a2c3d31ad2ef00dfc

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/16-bug-8-cupom-na-peca-de-campanha-com-de-por.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Causa: `couponBaseOf` (`packages/core/src/payment/pricing.ts`) perguntava `hasCampaign` à linha **já cobrada**. Nela o `unit_price` já é o preço da campanha (336,60), e com "de/por" `campaignUnitPrice(336,60, 374, 10)` dá 336,60, que não é menor que ele mesmo. A linha deixava de parecer de campanha e entrava na base do cupom. Sem "de/por" (M-A), o desconto se aplicava de novo e a linha seguia "de campanha", por isso a M-A era recusada. Conserto: `couponBaseOf(full, charged)` decide pela linha a preço de tabela alinhada por índice (`input.items` no caminho normal, `parts.full` no caminho do Compre Junto). `couponEligibleSubtotal` chama o mesmo par nos dois caminhos | Guardar uma marca de campanha na linha cobrada; mudar `hasCampaign` em si | A spec I-02 manda comparar contra o "por" de tabela. A troca é a menor possível: um dono só, que a loja (sacola e checkout), o painel e o `mercado-pago` já chamam | Tudo que chama `resolveOrderPricing` ou `couponEligibleSubtotal`: sacola, checkout, painel e app (proposta), `mercado-pago` `create-payment` e `order-proposals`. Uma peça com "de/por" que a campanha baixa passa a ficar fora do cupom e do pedido mínimo em todos eles |
| 2 | O teste do servidor ficou no `mercado-pago` (`create-payment`, `campaignCharge.test.ts`), e não no `checkout` (`create-order`) | Um caso em `checkout/__tests__` | O `create-order` não calcula cupom: copia `discount` e `coupon_*` do corpo, por `COLUNAS_DO_PEDIDO`. Um teste ali só provaria que ele copia o corpo, o que é tautológico. Quem recalcula o cupom no servidor e regrava `discount` e `total` é o `create-payment`, pela mesma regra de `core`. O `discount` que o `create-order` grava vem da loja, que agora o calcula certo | Afeta só onde o teste mora. Fazer o `create-order` validar cupom seria escopo novo e não foi feito |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Peça "de" R$ 374,00 / "por" R$ 349,90 a 10 % mais uma comum de R$ 340,00, cupom de 10 %: desconta R$ 34,00 (antes R$ 67,66) | domínio (core) | `packages/core/src/payment/__tests__/campaignDiscount.test.ts` › "com uma comum de R$ 340,00 e cupom de 10%…" e "com o Compre Junto na entrada…" | sim | — |
| 1b | O par com a M-A (R$ 385,00 a 10 %) continua dando R$ 34,00 | domínio (core) | idem › "o par sem "de/por"…" | sim | vermelho (com o filtro de campanha tirado de `couponBaseOf`, reprova) |
| 2 | Sacola só com a peça "de/por" de campanha: a base do cupom é 0 e o cupom é recusado com "Este cupom não vale para peças da Dia das Mães." | domínio (core) | idem › "sacola só com ela…" | sim | — |
| 3 | No servidor, o pedido M-C mais a comum com QA10 cobra 642,60 e regrava `discount` 34 (antes 608,94) | aplicação (function, com dublês) | `supabase/functions/mercado-pago/__tests__/campaignCharge.test.ts` › "cupom de 10% com a peça de "de/por"…" | sim | — (vi o vermelho reinjetando a regra antiga em `pricing.ts`; restaurado pela cópia, conferido com `cmp`) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

packages/core/src/payment/pricing.ts alterado
packages/core/src/payment/__tests__/campaignDiscount.test.ts alterado
supabase/functions/mercado-pago/__tests__/campaignCharge.test.ts alterado

## Verificação

- Um arquivo de teste por fatia (`PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`. Vermelho antes (3 casos de core e 1 da function), verde depois.
- Suítes (`CLAUDE.md` › Baselines), cada uma rodada sozinha e com o exit capturado fora de pipe, todas com exit 0:

| Workspace | Arquivos | Testes |
|---|---|---|
| core | 245 | 5869 |
| functions | 49 | 1704 |
| store | 402 | 7387 |
| backoffice | 306 | 5357 |

- Tipos (`CLAUDE.md` › Comandos): core 11, store 0, backoffice 7. Contra o baseline, os mesmos arquivos e as mesmas quantidades: os 11 de core são herdados (home, sitemap, `packages/supabase/src/client.ts`) e os 7 do backoffice estão todos em `ProposalStateBadge.test.tsx`. Nenhum erro novo.
- Lint (`npx eslint .` em cada app): store 2/2 e backoffice 23/5, igual ao baseline.
- Instruções lidas: `CLAUDE.md` (raiz, a cópia que veio no contexto; a do worktree é grande demais para ler inteira) › O "defeito 01" · Convenções · Os guardas · Baselines · Feature-Sliced Design / Alias de import · Comandos; `packages/core/CLAUDE.md` › Dinheiro; `supabase/CLAUDE.md` › Edge functions · `checkout`; `apps/store/CLAUDE.md` › Carrinho, chrome e checkout · A sacola v4; `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- O teste da function `checkout` pedido pelo bloco `Testes` foi trocado pelo do `mercado-pago` `create-payment` (decisão 2). O `create-order` copia o cupom do corpo e não decide nada sobre ele.
- Comportamento esperado visto no app local: não. Pelo procedimento, a validação em navegador é da Validation e do QA. A prova está nos testes, com os números reais da M-C e da M-E.
- `mercado-pago` com a regra antiga: um pedido já gravado com o cupom errado (como o #0607) passa a ser cobrado com o cupom só sobre a peça comum, e a cobrança sobe. A guarda de teto compara só os descontos por item, não o cupom, então não dá 422. Dado do banco não foi tocado.
- Citações conferidas: 3, todas no lugar (`pricing.ts`, `rules.ts`, `campaignPricing.ts`). Nenhuma deslocada nem morta. A causa estava só em `pricing.ts`.
- Nada a propagar: as tarefas 17 a 19 não afirmam nada sobre a base do cupom.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 16
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, por seção: defeito 01, Convenções, Guardas, Baselines, FSD/Alias, Comandos); apps/store/CLAUDE.md › Carrinho, chrome e checkout, A sacola v4; packages/core/CLAUDE.md › Dinheiro; supabase/CLAUDE.md › Edge functions, checkout; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: core — packages/core/src/payment/__tests__/campaignDiscount.test.ts, describe 'a peça com "de/por" que a campanha baixa também fica fora do cupom' (M-C + comum ⇒ cupom 34,00; o par M-A ⇒ 34,00; o mesmo com Compre Junto na entrada; só a M-C ⇒ base 0 e a recusa "Este cupom não vale para peças da Dia das Mães."); servidor — supabase/functions/mercado-pago/__tests__/campaignCharge.test.ts (M-C + comum com QA10 cobra 642,60 e regrava discount 34). Sem cobertura: um caso na function checkout, porque ela copia o cupom do corpo e não o calcula (teste tautológico); quem recalcula é o create-payment.
Verificações: core 5869/245, functions 1704/49, store 7387/402, backoffice 5357/306 (exit 0); tsc core 11 / store 0 / backoffice 7 (= baseline); eslint store 2/2, backoffice 23/5 (= baseline). Não visto em navegador (é da Validation e do QA).
Árvore de trabalho: packages/core/src/payment/pricing.ts (couponBaseOf decide pela linha de tabela); packages/core/src/payment/__tests__/campaignDiscount.test.ts; supabase/functions/mercado-pago/__tests__/campaignCharge.test.ts. Nada commitado.
Citações conferidas: 3 (pricing.ts, rules.ts, campaignPricing.ts); nenhuma deslocada nem morta
```

## T16 — wi-impl-review · done · agente accb56004fb31b2e2

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/16-bug-8-cupom-na-peca-de-campanha-com-de-por.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| O teste novo reprovava antes e passa depois; suíte, tipos e lint dos workspaces tocados sem regressão | `campaignDiscount.test.ts`, novo `describe` "a peça com 'de/por'…"; `campaignCharge.test.ts`, caso "cupom de 10% com a peça de 'de/por'…". Conferi pela leitura: antes do conserto, `couponBaseOf(chargedItems)` perguntava `hasCampaign` à linha já cobrada (336,60, com o "de" de 374). Nela, `campaignUnitPrice(336,60, 374, 10).charged` dá 336,60, que não é menor que 336,60. A linha entrava na base do cupom e o cupom dava 67,66, então as asserções `couponDiscount = 34` e `base = 0` teriam reprovado. | só execução (o vermelho antes do conserto, a suíte, o `tsc` e o lint) |
| O comportamento esperado do BUG-008 foi visto funcionando no app local | nada no diff; é relato do implementador | só execução |

## Obrigações

- **Suíte, `tsc` e `eslint` por workspace, comparados com a baseline (core, store, backoffice e functions):** só a execução prova. Não há nada no diff para conferir.
- **Guardas verdes sem afrouxar asserção:** nenhum teste existente foi alterado nem enfraquecido. Os três arquivos só ganharam casos novos.

## Testes

- **Caso de core: "de/por" a 10 % + comum de R$ 340,00 + cupom de 10 % ⇒ cupom de R$ 34,00.** Arquivo: `packages/core/src/payment/__tests__/campaignDiscount.test.ts`. Asserções: `couponDiscount` 34, `subtotal` 676,6 e `total` 642,6. Morde: antes do conserto o resultado seria 67,66. O par com a M-A (R$ 385,00 a 10 %) também está no arquivo e confere 34. Há ainda um caso extra pelo caminho do Compre Junto (`parts.full`), que exercita os dois ramos de `couponEligibleSubtotal`.
- **Caso só com a linha "de/por": recusa com o motivo da campanha.** Mesmo arquivo. Assere `couponEligibleSubtotal = 0` e chama `couponRefusal` real, que devolve "Este cupom não vale para peças da Dia das Mães.". Morde: antes do conserto a base seria 336,6 e não haveria recusa.
- **Caso da function `checkout`: o pedido gravado leva cupom de R$ 34,00.** O teste foi escrito no `mercado-pago` (`supabase/functions/mercado-pago/__tests__/campaignCharge.test.ts`), e não no `checkout`. Assere `total_amount` 642,60 e a gravação em `orders` com `discount` 34 e `total` 642,6. O nível é o mesmo (teste de handler de function); a troca de function está justificada na premissa 2, que se sustenta (ver abaixo). Morde: o `create-payment` recalcula o cupom pela mesma `resolveOrderPricing` e regrava `discount`.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `couponBaseOf(full, charged)` decide pela linha a preço de tabela alinhada por índice. Usa `input.items` no caminho normal e `parts.full` no caminho do Compre Junto. `couponEligibleSubtotal` usa o mesmo par nos dois caminhos | sim | `hasCampaign` (`pricing.ts:44`) compara `campaignPriceOf(item) < item.unit_price` e só faz sentido com o preço de tabela. A doc de `PricingItem.campaign` (`pricing.ts:22-27`) diz que "`unit_price` continua sendo o preço de TABELA". A troca segue o padrão que `campaignDiscountOf(full, charged)` já usa. `parts.full` tem um item por parte, alinhado com `parts.charged` (`pricing.ts:501-523`). Bate com a `spec.md` I-02 citada na tarefa e com `packages/core/CLAUDE.md` › Dinheiro (um ponto de entrada só, `resolveOrderPricing`, chamado pela loja e pelo `mercado-pago`). | sim. Os chamadores de `couponEligibleSubtotal` e de `resolveOrderPricing` que achei no código são os que o raio lista: `useCartPromotion`, `useCheckoutTotals`, `OrderSummary`, `CartDrawer`, o painel de proposta e `mercado-pago`. Nenhuma das tarefas seguintes (17–19) faz afirmação que a mudança torne falsa. |
| 2 | O teste do servidor ficou no `mercado-pago` (`create-payment`), e não no `checkout` | sim | O `checkout/handlers.ts:236-246` só copia `discount`, `coupon_code` e `coupon_id` do corpo (`COLUNAS_DO_PEDIDO`). Ele não chama `resolveOrderPricing` nem nenhuma regra de cupom (grep sem ocorrência). Quem recalcula o cupom e regrava o pedido é o `create-payment`. | sim, o raio é só o lugar do teste |

## Não conferido

- A execução inteira: o vermelho antes do conserto, as suítes dos quatro workspaces, o `tsc`, o lint e a conferência no app local. Revisão não roda código.
- Se o dublê do `mercado-pago` (`fakes.ts`) resolve o "de" da peça (374) pelo caminho `variantsOfPiece` / `pieceComparePrice` com a variação `var-mc` de mesmo preço, como o caso supõe. Li o handler (`handlers.ts:570-623`), mas não o dublê.
- Os três arquivos aparecem como `M` no `git status` e o diff mostra só as mudanças desta tarefa. Nenhum trecho ficou sem explicação.

Instruções lidas: `CLAUDE.md` (raiz, por inteiro, vindo no contexto); `packages/core/CLAUDE.md` › Dinheiro — a regra que não muda por acaso, e › `proposals`. Não li `apps/store/CLAUDE.md` nem `supabase/CLAUDE.md`, que a tarefa também manda ler. O diff não toca `apps/store` nem código de produção em `supabase/functions` (só um arquivo de teste), mas a ausência fica declarada.

## T19 — wi-impl-task · review · agente a6af6a382124a227f

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/19-bug-7-desfazer-do-lote-de-campanha.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O estado anterior de cada peça vem das linhas selecionadas (`row.campaigns`, que o `LIST_SELECT` lê inteiro, embed `product_campaigns(campaign_id, percent)`, separado do apelido do filtro). A captura acontece antes da escrita. | Uma leitura nova de `product_campaigns` antes do lote | A página já faz assim com o patch de `products` ("a seleção guarda a LINHA"). Uma leitura nova seria uma segunda leitura das marcações, fora da entidade. | `AdminProductsPage.tsx`. Se a linha selecionada estiver velha (outra aba mexeu), o Desfazer devolve o que a tela mostrava, igual ao desfazer de `products` |
| 2 | O Desfazer regrava pela porta única `setProductsCampaign`, com uma chamada por grupo (percentual de antes, ou `null` = tirar) | Uma RPC nova, ou um `upsert` e um `delete` direto | Obrigação da tarefa: nada de segunda escrita da marcação | nenhum fora da página e de `bulkCampaign.ts` |
| 3 | A peça que já estava como o lote a deixou (mesmo percentual, ou fora da campanha num "Tirar") não entra no Desfazer. O aviso só traz "Desfazer" se houver o que voltar | Regravar todas as peças do lote | Mesma regra do `useUndoBuffer` ("só o que de fato mudou"). Regravar o igual é escrita à toa | `campaignUndoGroups` em `bulkCampaign.ts` |
| 4 | `useUndoBuffer` passou a ser genérico (`useUndoBuffer<T = BulkPatch>`). A página tem uma segunda instância para o lote de campanha, com o mesmo prazo de 30 s, desfaz uma vez só e lê pelo `ref` no clique | Um closure solto no toast, sem prazo | Reaproveita a regra do prazo e do "uma vez só" sem copiá-la. O default `BulkPatch` deixa os chamadores de hoje sem mudança | `useUndoBuffer.ts`. O default mantém o tipo dos usos existentes |
| 5 | `set` dentro do `useUndoBuffer` virou `useCallback([])` e entrou nas dependências | Deixar como estava | Com o hook genérico, o `react-hooks/exhaustive-deps` passou a acusar 3 warnings novos. O lint subia de 23/5 para 23/8 | `useUndoBuffer.ts` |
| 6 | Se a volta falhar, aparece o aviso "As peças não voltaram à campanha de antes" com a frase da porta, e a lista é relida mesmo assim | Engolir o erro | Falha não pode passar como sucesso | `AdminProductsPage.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Lote "BF: 10%" sobre quatro peças a 15%: o aviso tem "Desfazer", e tocar nele devolve as quatro a 15% e relê a lista e as campanhas | frontend (página real) | `apps/backoffice/src/pages/admin/AdminProductsPage.campanha.test.tsx` › "quatro peças a 15% levadas a 10%…" | sim | — (vermelho antes: `expected undefined to be 'Desfazer'`). Mutação extra: tirar o `action` do toast reprovou 3 casos |
| 2 | Peças com percentuais diferentes e peças fora da campanha (uma delas marcada em outra campanha): cada uma volta ao que tinha | frontend (página real) | idem › "peças com percentuais diferentes e uma fora da campanha…" | sim | vermelho (duas mutações em `campaignUndoGroups`: ignorar o `campaign_id`, e juntar todos os percentuais num só) |
| 3 | "Tirar da Black Friday" em lote e depois "Desfazer": as peças voltam com o percentual que tinham | frontend (página real) | idem › "\"Tirar da Black Friday\" em lote e \"Desfazer\"…" | sim | vermelho na segunda tentativa: anular a captura quando o percentual é `null`. A primeira mutação ficou verde (ver Divergências) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

apps/backoffice/src/features/bulk-edit/model/bulkCampaign.ts alterado
apps/backoffice/src/features/bulk-edit/model/useUndoBuffer.ts alterado
apps/backoffice/src/pages/admin/AdminProductsPage.tsx alterado
apps/backoffice/src/pages/admin/AdminProductsPage.campanha.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminProductsPage.campanha.test.tsx --testTimeout=20000` (fonte: `PROJECT.md` › Comandos de verificação): 13/13 verdes. Antes do conserto, o caso 1 falhava.
- Arquivos relacionados juntos (`AdminProductsPage.campanha`, `AdminProductsPage`, `features/bulk-edit`): 135/135.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (fonte: `CLAUDE.md` › Comandos): 7 erros, todos em `ProposalStateBadge.test.tsx` (3 TS2304 e 4 TS2593). Igual ao baseline medido antes da primeira fatia, nenhum erro novo.
- `npx eslint .` em `apps/backoffice` (fonte: `CLAUDE.md` › Baselines): 23 erros e 5 warnings, igual à baseline.
- `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (fonte: `CLAUDE.md` › Baselines e `PROJECT.md`): 5359/5360 em 306 arquivos, exit 1. O único caso que falhou foi `AdminOrdersPage.aviso.test.tsx` › "lote de 60 selecionados…", com `Test timed out in 45000ms`. É o caso lento que o `CLAUDE.md` já registra, sob a contenção da onda paralela. Rodado sozinho: 29/29, exit 0.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (fonte: `PROJECT.md`, a suíte da loja quando o painel muda): 7390/7390 em 402 arquivos, todos verdes. Saiu com exit 1 por um único `[vitest-worker]: Timeout calling "onTaskUpdate"`, contenção do worker que o `CLAUDE.md` já registra, nenhum teste reprovou.

Instruções lidas: `CLAUDE.md` (raiz, já no contexto, inteiro); `apps/backoffice/CLAUDE.md` › introdução, Molde dos formulários, Descontos, Gravar NÃO desmonta a tela, O movimento do painel, Dívidas conhecidas deste app (o arquivo tem 130 KB, li pelo índice); `packages/core/CLAUDE.md` › Quando um código pertence, Pureza, Os módulos, Dinheiro, Convenções de tipo (lido pelo índice); `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- **O comportamento não foi visto no app local, nem por mim nem por probe.** O `Pronto quando` pede isso, mas a validação em navegador fica para a QA, pela regra deste procedimento. Também não rodei probe contra o banco local: o Desfazer grava marcações de verdade, e a tarefa proíbe alterar a massa do banco local. A escrita passa só pela porta `setProductsCampaign`, que não mudou e já foi provada na T01–T03. A confirmação em tela fica com o reteste do BUG-007.
- **Mutações das fatias 2 e 3.** As duas passaram de primeira, porque a implementação da fatia 1 já agrupava por percentual. Por isso as duas levaram o check de mutação.
  - Fatia 2: as duas mutações reprovaram, como esperado.
  - Fatia 3: a primeira mutação (pular peças sem marcação anterior) ficou verde. Não era defeito da asserção: num "Tirar", essas peças já ficam de fora por não terem mudado. Troquei pela mutação direta (não capturar nada quando o percentual é `null`), que reprovou.
  - Toda restauração foi pela cópia, conferida com `cmp`.
- **Teste reprovado por contenção:** `AdminOrdersPage.aviso.test.tsx` estourou os 45 s na suíte cheia e passou sozinho.
- **Caducou (a tarefa 03 não foi reescrita):** o desvio declarado em `implement-log.md` › T03 · 6 ("o desfazer cobre só o patch de `products`; a marcação de campanha não volta pelo toast") deixou de ser verdade. O arquivo `tasks/03-…md` não traz essa afirmação, então não reescrevi nada nele.
- **Propagação:** não há tarefa depois da 19, nada a propagar.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 19
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/backoffice/CLAUDE.md (por seção: introdução, Molde dos formulários, Descontos, Gravar NÃO desmonta a tela, O movimento do painel, Dívidas conhecidas); packages/core/CLAUDE.md (por seção: Quando pertence, Pureza, Os módulos, Dinheiro, Convenções de tipo); .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: apps/backoffice/src/pages/admin/AdminProductsPage.campanha.test.tsx — (1) lote "BF: 10%" sobre 4 peças a 15%: o aviso tem "Desfazer" e ele regrava as 4 a 15% pela porta (vermelho antes do conserto); (2) peças a 15%, a 20% e duas fora da campanha (uma marcada em outra): cada uma volta ao que tinha; (3) "Tirar da Black Friday" em lote e "Desfazer": as peças voltam com o percentual que tinham. Sem cobertura: a falha da própria volta (o aviso destrutivo), que não está no bloco Testes.
Verificações: arquivo da fatia 13/13; tsc do backoffice 7 erros, todos de antes (ProposalStateBadge.test.tsx); eslint do backoffice 23/5, igual à baseline; suíte do backoffice 5359/5360, o único reprovado foi o timeout de contenção de AdminOrdersPage.aviso (29/29 sozinho); suíte da loja 7390/7390, com 1 erro de RPC do worker por contenção. O comportamento não foi visto em navegador: fica para o reteste da QA.
Árvore de trabalho: apps/backoffice/src/features/bulk-edit/model/bulkCampaign.ts (campaignUndoGroups, CampaignUndoGroup); apps/backoffice/src/features/bulk-edit/model/useUndoBuffer.ts (genérico, `set` estável); apps/backoffice/src/pages/admin/AdminProductsPage.tsx (o lote de campanha captura o estado anterior e o aviso traz "Desfazer", que volta pela porta); apps/backoffice/src/pages/admin/AdminProductsPage.campanha.test.tsx (3 casos). Nada commitado.
Citações conferidas: 4 (AdminProductsPage.tsx, useUndoBuffer.ts, bulkCampaign.ts e o desvio T03 · 6). Nenhuma deslocada, nenhuma morta.
Caducou: implement-log.md T03 · 6 · "o desfazer cobre só o patch de products; a marcação de campanha não volta pelo toast" · o aviso do lote de campanha agora tem "Desfazer", que devolve as marcações de antes
```

## T19 — wi-impl-review · done · agente a1f011e1fa793f70a

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/19-bug-7-desfazer-do-lote-de-campanha.md
Veredito: serve

## Achados

| #   | Classe | Gravidade          | Arquivo:linha | O defeito | A exigência que ele contraria                  |
| --- | ------ | ------------------ | ------------- | --------- | ---------------------------------------------- |
| nada |  |  |  |  |  |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| O teste novo reprovava antes e passa depois; suíte, tipos e lint dos workspaces tocados sem regressão | `AdminProductsPage.campanha.test.tsx`: o describe "o \"Desfazer\" do lote de campanha devolve as marcações de antes" (3 casos). O código anterior não tinha `action` no aviso do lote de campanha, e `desfazer()` assere `aviso?.action.props.altText === 'Desfazer'`, então o caso reprova antes do conserto | só execução |
| O comportamento esperado do BUG-007 foi visto funcionando no app local | relato do implementador (não recebido nesta revisão) | só execução |
| Critério do bug: o aviso traz "Desfazer", e ele devolve cada peça ao estado de antes (percentual diferente por peça, sem marcação, e o "Tirar da …") | `AdminProductsPage.tsx`: em `applyCampaign`, `campaignUndoGroups(selectedRows, choice)` captura antes da escrita, `campaignUndo.capture` guarda, e `ToastAction` aparece quando `antes.length > 0`. `undoCampaign` regrava um grupo por chamada a `setProductsCampaign` e relê a lista e as campanhas. `bulkCampaign.ts`: `campaignUndoGroups` | sim |

## Obrigações

- Suíte, `tsc` e `eslint` do backoffice contra as baselines: só a execução prova. O diff não silencia erro de tipo e não traz `eslint-disable`. O `set` do hook entrou como `useCallback` nas dependências, em vez de ter o warning silenciado.
- Os guardas seguem sem asserção afrouxada: nenhum arquivo de guarda está entre os alterados. A escrita de `product_campaigns` continua só pela porta `setProductsCampaign` (`entities/campaign/api/campaignWrite.ts`), que aceita `percent: null` para tirar a peça. Isso cumpre a decisão "nada de segunda escrita da marcação".
- Gravação só pelas portas existentes: cumprida, como no item anterior.

## Testes

- Página real, lote "10 %" sobre quatro peças a 15 %: `AdminProductsPage.campanha.test.tsx`, o caso "quatro peças a 15% levadas a 10%…". A asserção morde. Ela confere a escrita do lote (`['p1'..'p4'], 'bf', 10`) e depois `setCampaignMock.mock.calls` com `toEqual` exato (`[[[p1..p4],'bf',15]]`), mais as releituras. O nome da campanha é "Black Friday" em vez de "Natal", e isso é só a fixture do arquivo.
- Percentuais diferentes e uma peça sem marcação: o caso "peças com percentuais diferentes e uma fora da campanha". A asserção morde: `toEqual` exato com três grupos (15, 20 e `null`). Inclui uma peça marcada em outra campanha, o que prova o recorte por `campaign_id`.
- "Tirar da campanha" em lote e depois Desfazer: o caso "\"Tirar da Black Friday\" em lote…". A asserção morde. A volta tem só p1→15 e p2→20, e p3 (que já estava fora) não é regravada. A igualdade exata recusa uma chamada a mais.
- Nível: página real, como o bloco `Testes` pede.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O estado de antes vem de `row.campaigns` das linhas selecionadas, capturado antes da escrita | sim | `LIST_SELECT` lê `product_campaigns(campaign_id, percent)` (`useAdminProducts.ts:106`), e `toListRow` mapeia para `campaigns` (`:137`). `applyPatches` usa o mesmo molde: o snapshot sai da linha selecionada, antes da escrita | sim |
| 2 | O Desfazer passa pela porta `setProductsCampaign`, uma chamada por grupo | sim | a tarefa exige isso em "Decisões já tomadas" (sem segunda escrita da marcação) | sim |
| 3 | A peça que já estava como o lote a deixou não entra, e o "Desfazer" só aparece se houver o que voltar | sim | é a mesma regra do `useUndoBuffer` ("só as linhas efetivamente alteradas"). O `capture` com snapshot vazio já zera o buffer | sim |
| 4 | `useUndoBuffer` passou a ser genérico, com default `BulkPatch`, e a página ganhou uma segunda instância | sim | o default mantém o tipo do uso existente (`undo = useUndoBuffer()` em `applyPatches`) | sim, o hook e a página |
| 5 | `set` virou `useCallback([])` e entrou nas dependências | sim | o comportamento não muda (a função só escreve o `ref` e o estado). Não silencia o lint | sim |
| 6 | Se a volta falhar, aparece um aviso destrutivo, e a lista é relida mesmo assim | sim | o molde é o `catch` do próprio `applyCampaign` | sim |

## Não conferido

- O resultado da suíte, do `tsc` e do `eslint`, e a conferência no app local: só a execução mostra.
- O caminho de falha do `undoCampaign` (o aviso "As peças não voltaram à campanha de antes") não tem teste. O bloco `Testes` não o pede.
- Os quatro arquivos são rastreados e aparecem no `git diff`, então todo o recorte teve baseline.
- Instruções lidas: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · Feature-Sliced Design (do contexto da sessão). De `apps/backoffice/CLAUDE.md` li só o índice de títulos e a busca por desfazer, undo, massa e campanha, sem seção que governe o caso. De `packages/core/CLAUDE.md`, só a busca por undo e desfaz, sem ocorrência pertinente. A mudança não toca `packages/core`.

## T17 — wi-impl-task · review · agente ad3debaba0fe0311e

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/17-bug-2-de-da-peca-no-pedido-gravado.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Consertei a **leitura**, não a gravação. Na linha de campanha, o "De" riscado passa a ser o `compare_unit_price` que a function `checkout` já grava desde a T11 (374,00 no #0607/#0608), quando ele é maior que o `full_unit_price` gravado. A regra fica em `orderSummary` (`packages/core/src/orders/summary.ts`), o dono do resumo do pedido | Mudar o `full_unit_price` que a loja e a function gravam, ou criar coluna nova com migration | A coluna já existe e já vem certa do servidor (`createOrderCampanha.test.ts:181-200`). Mexer no `full_unit_price` mudaria o Subtotal e o desconto de campanha (`resolveOrderLines`), que a tarefa 18 e o checkout da T12 usam. Sem migration nem mudança de contrato | `orderSummary` é lido também pelo e-mail (`send-notification/render/layout.ts`), pelo painel (`AdminOrderPage`) e pelo app do ateliê. Quem passar `compare_unit_price` nos itens passa a mostrar o mesmo "De". É a mesma regra nos quatro, não uma segunda conta |
| 2 | O Subtotal do pedido continua somando o preço de tabela (`full_unit_price`, 349,90), e o "Desconto de campanha" continua tabela − campanha (13,30). Só o "De" da linha usa o preço cheio da peça | Somar 374,00 no Subtotal e subir o desconto de campanha para 37,40 | O resumo do checkout (T12) já tem essa forma: linha com "De 374,00", Subtotal de tabela, campanha 13,30. A tarefa pede o pedido igual ao checkout, e o `orders.campaign_discount` é gravado pelo servidor | O pedido detalhado tem a mesma forma do checkout. A tarefa 18, que também mexe em `summary.ts`, mede sobre esse mesmo Subtotal |
| 3 | O "De" maior só vale quando `compare_unit_price` > `full_unit_price` × quantidade. Senão fica o cheio gravado | Usar o `compare_unit_price` sempre que existir | Nunca pode mostrar um "De" menor que o preço de tabela | nenhum (fica em `summary.ts`) |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | A tela do pedido mostra a linha de campanha com "de" 374,00 e "por" de tabela 349,90, cobrada a 336,60, como "de R$ 374,00 por R$ 336,60" | componente | `apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx` › "a linha diz "de R$ 374,00 por R$ 336,60"" | sim | — |
| 2 | O resumo do pedido segue o do checkout: Subtotal 349,90, campanha −13,30, total 336,60; a linha comum sem campanha segue com o cheio gravado | componente | mesmo arquivo, dois casos | sim | vermelho (a comum ficou vermelha só por como o teste lia o texto; corrigi a leitura e a regra continuou exercitada) |
| 3 | `orderSummary` com o pedido montado por `resolveOrderPricing` e `resolveOrderLines` (2 unidades): "De" 748, cobrado 673,20, Subtotal 699,80, campanha 26,60, conta fecha. Um "de" menor que a tabela não sobe o "De" | domínio | `packages/core/src/orders/__tests__/summary.test.ts` › 'orderSummary — o "De" da peça de campanha que tem "de/por"' | sim | vermelho (M1: "De" de volta ao cheio gravado ⇒ caso 1 vermelho; M2: `compare > 0` no lugar de `compare > cheio` ⇒ caso 2 vermelho. Restaurei pela cópia e conferi com `cmp`) |

A gravação não mudou, então o caso da function `checkout` não se aplicava. O que ela grava (`compare_unit_price: 374`) já tem teste em `supabase/functions/checkout/__tests__/createOrderCampanha.test.ts:181-200`.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

packages/core/src/orders/summary.ts alterado
packages/core/src/orders/__tests__/summary.test.ts alterado
apps/store/src/entities/order/lib/itemDetailLine.ts alterado
apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx alterado

## Verificação

- Um arquivo de teste (fonte: `PROJECT.md` › Comandos de verificação):
  - `pnpm --filter @estrelinha/store exec vitest run src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx --testTimeout=20000`: vermelho antes do conserto (recebido "de R$ 349,90 por R$ 336,60"); depois, 30/30 e exit 0.
  - `pnpm --filter @estrelinha/core exec vitest run src/orders/__tests__/summary.test.ts --testTimeout=20000`: 16/16 e exit 0; os dois mutantes deram vermelho.
- Suítes inteiras (fonte: `CLAUDE.md` › Baselines e a tarefa), um workspace por vez, exit fora de pipe:
  - core: **5871/245**, exit 0.
  - store: **7390/402**, todos os testes verdes, mas exit 1 nas duas rodadas por um único `[vitest-worker]: Timeout calling "onTaskUpdate"`. O `CLAUDE.md` registra esse erro como contenção, não teste. A tarefa 19 rodava ao mesmo tempo.
  - backoffice: 1ª rodada com 1 falha por timeout (`AdminOrdersPage.aviso`, o lote de 60) e um hook timeout em `labels.test.ts`. Os dois passaram isolados (105/105), e a 2ª rodada inteira deu **5360/306**, exit 0.
  - functions: **1704/49**, exit 0.
  - mobile-adm: 1ª rodada com 28 "Hook timed out in 10000ms" (contenção); 2ª rodada **2734/176**, exit 0.
- Tipos (fonte: `CLAUDE.md` › Comandos), contra as baselines do `CLAUDE.md` (sem `baseline` na entrada):
  - store 0 · mobile-adm 0: sem mudança.
  - backoffice 7, todos em `ProposalStateBadge.test.tsx`: herdados, iguais à baseline.
  - core 11, os mesmos arquivos da baseline: herdados.
  - Nenhum erro novo.
- Lint: `npx eslint .` em apps/store deu 2 erros / 2 warnings, igual à baseline 2/2.
- Conferido com o banco local: li do Postgres local (54442) os pedidos #0607 e #0608 inteiros, `orders` + `order_items` — a tela lê `select('*, order_items(*)')`. Passei os dois pela `orderSummary` real com `tsx`:
  - a linha "Pulseira Afetiva Esferas" sai "de 374 · por 336,6" nos dois pedidos;
  - o Subtotal, os descontos e o total ficam iguais aos gravados.
  - Nenhum dado do banco foi alterado.

Instruções lidas:
- `CLAUDE.md` (raiz): já estava no contexto inteiro. Seções usadas: "O defeito 01", Convenções, Os guardas, Baselines, FSD/Alias.
- `apps/store/CLAUDE.md` › Carrinho, chrome e checkout; › A sacola v4 e a marca "acompanha"; › As parcelas do cartão; › Minha conta e o detalhe do pedido.
- `packages/core/CLAUDE.md` › Dinheiro.
- `supabase/CLAUDE.md` › Edge functions; › `checkout`.
- `.specs/project/PROJECT.md` › Comandos de verificação; › Ambiente local.

## Divergências e descobertas

- O bug não estava na gravação. Desde a T11, a function `checkout` grava `compare_unit_price = 374,00` na linha de campanha, e os pedidos #0607/#0608 do banco local já o têm. Quem desenhava o "De" errado era `orderSummary`, que lia só `full_unit_price`, o preço de tabela que a loja grava. O #0604 é anterior à T11 e não tem `compare_unit_price`, então continua mostrando "De R$ 349,90"; ele não foi tocado (regra 6 da tarefa).
- Mudar em `core` alcança o e-mail do pedido, o painel e o app do ateliê, porque todos leem `orderSummary`. Quem traz `compare_unit_price` nos itens passa a mostrar o mesmo "De". As suítes de functions, backoffice e mobile-adm continuaram verdes.
- A suíte da loja e as primeiras rodadas do painel e do app falharam por contenção (timeouts e o erro do worker), com a tarefa 19 rodando ao mesmo tempo. Os arquivos que falharam passaram sozinhos ou na rodada seguinte; o detalhe está em Verificação.
- A tarefa 18 também mexe em `packages/core/src/orders/summary.ts`. Mexi só no `full` exibido de cada linha (`shownFullCents`); Subtotal e lista de descontos ficaram como estavam, então nada do que a tarefa 18 diz ficou falso. Não houve o que propagar.
- Nenhuma citação `caminho:linha` na tarefa; os caminhos de "Onde mora" estavam todos lá.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 17
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, inteiro — já no contexto); apps/store/CLAUDE.md › Carrinho, chrome e checkout · A sacola v4 · Parcelas do cartão · Minha conta e o detalhe do pedido; packages/core/CLAUDE.md › Dinheiro; supabase/CLAUDE.md › Edge functions · checkout; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: tela do pedido — apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx (linha de campanha "de R$ 374,00 por R$ 336,60", vermelho antes; o resumo igual ao do checkout; a linha comum sem campanha); regra — packages/core/src/orders/__tests__/summary.test.ts (pedido montado por resolveOrderPricing/resolveOrderLines com "De" 374 e a conta fechando; "de" menor que a tabela não sobe o "De"; dois mutantes deram vermelho). A gravação da function checkout não mudou: o compare_unit_price=374 já tem teste em createOrderCampanha.test.ts, então não há caso novo da function.
Verificações: core 5871/245 exit 0; store 7390/402 todos verdes, exit 1 só pelo "Timeout calling onTaskUpdate" do worker (contenção); backoffice 5360/306 exit 0 (2ª rodada); functions 1704/49 exit 0; mobile-adm 2734/176 exit 0 (2ª rodada); tsc store 0 · backoffice 7 · mobile-adm 0 · core 11 (as baselines); eslint store 2/2 (a baseline). No app local: os pedidos #0607/#0608, lidos do Postgres local e passados pela orderSummary real, saem com a pulseira Esferas "de 374,00 por 336,60" e a conta igual à gravada.
Árvore de trabalho: packages/core/src/orders/summary.ts; packages/core/src/orders/__tests__/summary.test.ts; apps/store/src/entities/order/lib/itemDetailLine.ts; apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx — nada commitado.
Citações conferidas: 4 caminhos de "Onde mora" abertos (OrderItemsSummary.tsx, itemDetailLine.ts, checkout/handlers.ts, e o summary.ts de core, onde o "de/por" é decidido); nenhum deslocado nem morto.
```
Divergência: a tarefa apontava a gravação da `checkout` como possível causa; a gravação já estava certa desde a T11, e o conserto foi na leitura (`orderSummary` em `core`), que vale também para o e-mail, o painel e o app do ateliê.

## T17 — wi-impl-review · done · agente a90f451837685b062

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/17-bug-2-de-da-peca-no-pedido-gravado.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| O teste novo reprovava antes e passa depois | `apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx` (bloco novo no fim) e `packages/core/src/orders/__tests__/summary.test.ts` (bloco novo no fim). Pela leitura, os dois reprovariam antes do conserto: o "De" seria 349,90 (store) e 699,80 (core). | sim pela leitura; o vermelho e o verde só a execução prova |
| Suíte, tipos e lint dos workspaces tocados sem regressão | — | só execução |
| O Esperado do BUG-002 visto funcionando no app local | — | só execução. O caminho de leitura está ligado: `useOrder.ts:119` lê `order_items(*)`, a leitura da convidada passa pela `mercado-pago`, que já lê `compare_unit_price` (`handlers.ts:1049`), e a `checkout` grava `compare_unit_price: tabela.compare` (`checkout/handlers.ts:507`) |

## Obrigações

- Rodar a suíte, o `tsc` e o lint de cada workspace tocado (core, store), mais a suíte do painel por causa de `packages/core`: não dá para conferir sem rodar (fica no relato do implementador).
- Guardas verdes sem afrouxar asserção: o diff não toca nenhum guarda e não enfraquece nenhuma asserção que já existia. Os testes só ganharam blocos novos.

## Testes

- **Linha de campanha com "de" R$ 374,00, "por" de tabela R$ 349,90 e cobrança de R$ 336,60.** O teste em `OrderItemsSummary.test.tsx` renderiza o `OrderItemsSummary` real e assere o texto `de R$ 374,00 por R$ 336,60`, o `<s>` com R$ 374,00 e o par. A asserção morde: antes do conserto o texto seria `de R$ 349,90 …`. No mesmo nível, `summary.test.ts` assere `full: 748` com quantidade 2, o Subtotal de 699,80, a linha "Desconto de campanha" de 26,60 e a conta fechando. O caso de borda (`compare_unit_price` 95 menor que o cheio 100) mantém `full: 100`. O controle sem campanha mantém "de 79".
- **Caso da `checkout` sobre o que vai para `order_items`:** não se aplica, porque a gravação não mudou.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Consertar a leitura em `orderSummary` usando o `compare_unit_price` que já é gravado | sim | A `checkout` grava `compare_unit_price: tabela.compare` (`supabase/functions/checkout/handlers.ts:507`). A loja lê `order_items(*)` (`useOrder.ts:119`, `useOrders.ts:84/99`), e a leitura da convidada pela `mercado-pago` inclui a coluna (`handlers.ts:1049`). A tarefa manda a regra num dono só, e `summary.ts` é o dono do resumo do pedido. Sem migration e sem contrato novo. | sim. Os leitores de `orderSummary` são `AdminOrderPage.tsx:355`, `mobile-adm/.../resumo.ts:13` e `send-notification/render/layout.ts:240/289/402`, todos declarados no raio com a ressalva "quem passar". |
| 2 | O Subtotal continua de tabela e o desconto de campanha continua tabela − campanha. Só o "De" da linha usa o preço cheio | sim | Bate com a "Decisão já tomada" da tarefa: o "De" é o `compare_price` quando é maior e o checkout lê a mesma regra. `orders.campaign_discount` vem do servidor. A tarefa 18 mexe em `summary.ts` nas linhas de desconto (Pix/promoção), e o Subtotal fica intacto. | sim |
| 3 | O "De" maior só vale quando `compare × qtd` é maior que o cheio gravado | sim | `summary.ts:174-178`. `Number(null)` dá 0 e `Number(undefined)` dá NaN, então a comparação nunca é verdadeira nesses casos e as linhas sem a coluna ficam iguais. O caso de borda do teste cobre a regra. | sim |

## Não conferido

- O vermelho antes e o verde depois, a suíte, `tsc` e lint: são de execução.
- A prova no app local do "Pronto quando": é de execução.
- O e-mail (`send-notification`) e o app do ateliê (`usePedido.ts:91`, com `COLUNAS_DOS_ITENS`) podem não ler `compare_unit_price` e seguir mostrando o "De" de tabela. Isso não é achado: a tarefa recorta o pedido da loja, e o raio declara "quem passar".
- Os pedidos #0607 e #0608 já gravados com `compare_unit_price` passam a mostrar "De R$ 374,00" na leitura. Nenhum dado foi alterado, o que é compatível com a Regra 6 da tarefa.
- Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (raiz, recebido no contexto: o "defeito 01", Convenções, Os guardas, Baselines, FSD/Alias). Não li `apps/store/CLAUDE.md`, `packages/core/CLAUDE.md` › Dinheiro nem `supabase/CLAUDE.md`: o diff não toca dinheiro em `payment/` nem as functions, e nenhuma regra desses arquivos foi conferida contra o diff.

## T18 — wi-impl-task · aborted · agente af1887cedeff72366

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/18-bug-9-resumo-do-pedido-com-promocao-e-pix.md
Situação: abortou

## Aborto

Parei antes de escrever código, como manda a ressalva do árbitro no Gate 3 da rodada 2: "antes de corrigir, confira na `master` se o 'Desconto PIX' já sumia antes do WI 102. Se já existia, pare e relate com a evidência". O defeito já existia antes do WI. Pela tarefa, isso é o caso "parou". Pelo procedimento, é o caso 4 de aborto: a premissa da tarefa não bate com o repositório e a decisão de escopo é do humano. Não alterei nada na árvore.

**Causa encontrada (diagnóstico do código, sem execução).**
1. O `orderSummary` (`packages/core/src/orders/summary.ts`) mostra a linha PIX sempre que `pix_discount > 0`, independente da promoção. Com os números gravados hoje no #0608 a conta fecha: subtotal 1.379,80, campanha 13,30, progressivo 102,99, PIX 88,45, frete 19,90, total 1.194,96. O `OrderItemsSummary.tsx` desenha todas as linhas que o `orderSummary` devolve.
2. O que a tela mostrou foi a linha de `orders` num estado intermediário:
   - O `create-order` (`supabase/functions/checkout/handlers.ts`, lista de colunas por volta da linha 220) grava `total` já com o PIX descontado, porque a loja manda `totals.total` do modo PIX (`buildOrderPayload.ts`). Mas ele não grava `pix_discount`, que fica 0.
   - Só o `create-payment` (`supabase/functions/mercado-pago/handlers.ts:937-955`) grava `pix_discount`. No #0608 isso aconteceu 0,5 s depois: `created_at` 20:52:29.018, `updated_at` 20:52:29.561.
   - A rota `/pedido/:id/pagamento` lê o pedido por `useOrder(id)` (`OrderPaymentPage.tsx:186`), na chave `['orders','id',id]`, com `STORE_STALE_TIME` de 5 min. Nada invalida essa leitura depois do `create-payment`.
   - Indo para `/pedido/:id` sem recarregar, a tela reaproveita a linha de antes: `pix_discount` 0 e total 1.194,96. É exatamente o que o screenshot do #0608 mostra.
3. A captura reforça que era a linha de antes do `create-payment`. O "de" da primeira peça aparece como R$ 349,90; hoje o banco tem `compare_unit_price` 374,00, gravado depois. A linha em si foi gravada por esse fluxo no pedido criado pela QA e não é dano da massa.
4. **A promoção não é a causa.** O mesmo intervalo existe em qualquer pedido PIX. O #0606 mostrar a linha é compatível com a leitura ter caído depois do `create-payment` (corrida ou recarga). Isso não foi provado por execução.

**Evidência de que o defeito é anterior ao WI.** Li o código no merge-base `eceb80c2` com a `master`:
- `checkout/handlers.ts` já tinha `'total'` na lista de colunas e nenhuma ocorrência de `pix_discount`.
- `buildOrderPayload.ts` já gravava `total: totals.total`, e `useCheckoutTotals.ts` monta o total do modo PIX com o desconto.
- `summary.ts` já punha a linha PIX a partir de `order.pix_discount` (linha 185).
- `OrderPaymentPage.tsx` já usava `useOrder(id)` sem invalidar depois do pagamento, e `queryClient.ts` já tinha `STORE_STALE_TIME` de 5 min.
- O WI 102 não mexeu em `OrderPaymentPage.tsx`, `features/order-payment`, `queryClient.ts`, `useOrder.ts` nem `guestOrder.ts` (`git diff --stat` vazio).

**O que fica para o humano decidir.** Se este defeito anterior entra no WI 102 e por qual conserto. Opções que vi, sem escolher:
- (a) o `create-order` gravar também `pix_discount`, o que é coerente com o `total` que ele já grava;
- (b) invalidar `['orders','id',id]` depois do `create-payment`;
- (c) as duas.

A (a) mexe na function `checkout` e nas colunas aceitas, que é contrato. A (b) só mexe na loja.

## Decisões e premissas

nada

## Fatias

nada

## Repositórios tocados

nada

## Arquivos alterados

nada

## Verificação

- Consulta só de leitura no banco local: `psql postgresql://postgres:postgres@127.0.0.1:54442/postgres`, `select` em `orders` e `order_items` dos pedidos #0605–#0608 e na linha do #0608 com itens. Dela vêm `pix_discount` 88,45 hoje, os timestamps e o `compare_unit_price` 374.
- `git show eceb80c2:<caminho>` e `git diff eceb80c2 HEAD --stat` nos arquivos citados no Aborto.
- Não rodei suíte, tipos nem lint: nenhum arquivo foi tocado.
- Comandos de verificação: não os levantei, porque parei antes da primeira fatia.
- Instruções lidas: `CLAUDE.md` (raiz, do contexto) › O "defeito 01" · Convenções · Os guardas · Baselines · FSD/Alias. Não li `apps/store/CLAUDE.md`, `packages/core/CLAUDE.md` › Dinheiro nem `supabase/CLAUDE.md`: parei antes de tocar em qualquer arquivo.

## Divergências e descobertas

- O bloco `Testes` da tarefa supõe que o caso de `core/orders/summary` com os números do #0608 (incluindo `pix_discount` 88,45) reprova antes do conserto. Pelo código, ele não reprovaria: a regra já devolve a linha PIX e a conta fecha. O defeito está na linha de `orders` lida no meio do caminho (`pix_discount` 0 com `total` já líquido do PIX), somada à leitura em cache.
- O defeito não depende da promoção progressiva. Afeta qualquer pedido PIX lido entre o `create-order` e o `create-payment`.
- Não conferi em navegador, para não subir dev server.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 18
Caso: parou
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01" · Convenções · Os guardas · Baselines · FSD/Alias — os de módulo não foram lidos (parei antes de tocar arquivo)
Testes escritos: nenhum — parei pela ressalva do árbitro; pelo código, o caso de core/orders/summary com os números do #0608 não reprovaria antes de um conserto
Verificações: leitura do banco local (#0605–#0608) e git show/diff contra o merge-base eceb80c2 com a master; nenhuma suíte rodada
Árvore de trabalho: nada alterado
Citações conferidas: 4 (summary.ts, OrderItemsSummary.tsx, OrderConfirmationPage.tsx:168, OrderPaymentPage.tsx:186); nenhuma deslocada nem morta
Bloqueio: o defeito existe na master (create-order grava total com PIX e sem pix_discount; /pagamento lê o pedido por useOrder com staleTime de 5 min e nada invalida depois do create-payment) e não depende da promoção · parei no diagnóstico, antes do primeiro teste; decisão de escopo e de conserto ((a) create-order gravar pix_discount, (b) invalidar ['orders','id',id] depois do create-payment, ou as duas) é do humano
```

## T18 — wi-impl-task · aborted · agente a407be14d126c8ffb

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/18-bug-9-resumo-do-pedido-com-promocao-e-pix.md
Situação: abortou

## Aborto

Caso 4. A tarefa e o repositório não batem, e a própria tarefa manda parar. A ressalva do árbitro no Gate 3 diz: confira na `master` se o defeito já existia antes do WI; se existia, pare e relate com a evidência.

**O que encontrei.** O defeito não está em `packages/core/src/orders/summary.ts`, e não tem relação com a promoção progressiva. Ele já existia antes do WI 102.

1. **O resumo funciona com os dados gravados do #0608.** Escrevi um teste temporário em `packages/core/src/orders/__tests__/`, rodei e apaguei. A entrada foi a linha gravada no banco local: itens 336,60/349,90 (de 374,00), 2×306,00/340,00 e 314,91/349,90; `pix_discount` 88,45; `promotion_discount` 102,99; `campaign_discount` 13,30; frete 19,90; total 1.194,96.
   - Resultado: `orderSummary` devolve as linhas campanha 13,30, progressivo 102,99 e PIX 88,45, com Subtotal 1.379,80, e a conta fecha.
   - Consequência: o teste que a tarefa pede ("vermelho antes do conserto") não pode ficar vermelho em `core`.
   - A linha `push('pix', …, order.pix_discount)` não depende da promoção, nem aqui nem na `master` (`master:packages/core/src/orders/summary.ts:185`).
   - `OrderItemsSummary.tsx` desenha todas as linhas de `resumo.discounts`. `useOrder` e o `get-order` leem `select('*, order_items(*)')`.
2. **O pedido nasce inconsistente no `create-order` e só fica certo no `create-payment`.**
   - O `create-order` grava `total: totals.total`, o total da tela já com o PIX descontado (`buildOrderPayload.ts:205`).
   - Ele não grava `pix_discount`: não está em `COLUNAS_DO_PEDIDO` (`supabase/functions/checkout/handlers.ts:217-249`), e o default da coluna é 0.
   - Quem grava `pix_discount` é o `create-payment` (`supabase/functions/mercado-pago/handlers.ts`, o `update` de persistência).
   - No #0608 o `create-payment` gravou 0,54 s depois da criação. O `order_charge_locks` registra 20:52:29.566, com `pix_discount` 88,45.
   - Nesse intervalo, qualquer leitura de `/pedido/:id` vê exatamente o que o BUG-009 descreve: Total 1.194,96, sem a linha "Desconto PIX", com as linhas somando 1.283,41.
   - A captura do QA é dessa leitura: o pedido tem `mp_payment_id` nulo, e a sessão foi aberta logo após "Pagar com PIX".
   - O #0606 foi lido depois de o `create-payment` gravar, por isso mostra a linha. A diferença entre os dois é de tempo, não de promoção.
3. **A `master` tem o mesmo caminho, sem alteração.**
   - `master:apps/store/src/features/checkout/lib/buildOrderPayload.ts:188` grava `total: totals.total`.
   - Em `master:supabase/functions/checkout/handlers.ts`, `COLUNAS_DO_PEDIDO` não tem `pix_discount`: são 0 ocorrências de `pix` na lista.
   - O WI 102 não tocou nesse ponto. O diff dele em `buildOrderPayload` e `checkout/handlers.ts` é só a campanha.

**Até onde cheguei.** Diagnóstico completo, nenhuma linha de código escrita. A árvore está intacta: `git status` mostra só `.specs/work-items/102-desconto-de-campanha/` sem rastreio, que já estava assim. O teste temporário foi removido.

**O que sobe ao humano.** Um defeito anterior ao WI pode ser escopo novo. Se a decisão for corrigir, o conserto mais provável:
- a loja manda `pix_discount: totals.pixDiscount` no payload do `create-order`;
- a function `checkout` acrescenta `pix_discount` a `COLUNAS_DO_PEDIDO`, e o pedido já nasce com a linha PIX que casa com o total gravado;
- o `create-payment` continua recalculando e sobrescrevendo.

Isso toca `supabase/functions` e o guarda `chavesDoItemDoPedido`/payload, e a tarefa precisaria ser reescrita: o teste vermelho seria do payload e do `create-order`, não de `core/orders/summary`.

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Parar e relatar, pela ressalva do árbitro | Corrigir o `create-order` para gravar `pix_discount` | A ressalva manda parar se o defeito já existia antes do WI. A evidência mostra que existia. | A fila do WI 102: o BUG-009 continua aberto até a decisão do humano. |
| 2 | Atribuir a captura do QA a uma leitura feita antes de o `create-payment` gravar | Uma falha do resumo ou da tela ligada à promoção | Com os dados gravados, o resumo devolve a linha PIX (provado por teste). A falta da linha só se reproduz com a linha do pedido de antes do `create-payment`: total com PIX e `pix_discount` 0. | O diagnóstico do BUG-009, que muda a camada da tarefa: de `core` para `create-order`. |

## Fatias

nada — nenhuma fatia aberta. O teste do bloco `Testes` em `core/orders/summary` não fica vermelho (ver Aborto).

## Repositórios tocados

nada

## Arquivos alterados

nada

## Verificação

- `npx vitest run src/orders/__tests__/tmpBug9Probe.test.ts` em `packages/core`: exit 0, 1 passou. Foi uma sonda de diagnóstico, apagada depois. O comando segue o padrão do `CLAUDE.md` raiz, rodando um arquivo.
- Consultas `psql` de leitura no banco local (:54442) sobre `orders`, `order_items` e `order_charge_locks` dos pedidos #0606 e #0608. Nenhuma escrita.
- Tipos, suíte e lint não foram rodados: nenhuma alteração.
- Instruções lidas: `CLAUDE.md` raiz (carregado no contexto). Os `CLAUDE.md` de `apps/store`, `packages/core` e `supabase` não foram lidos: parei antes de editar.

## Divergências e descobertas

- O "Onde mora" da tarefa (`core/orders/summary.ts`, `OrderItemsSummary.tsx`) não é onde o defeito está. A causa é o `create-order` gravar o total com PIX sem gravar `pix_discount`, e isso já acontecia na `master`.
- O bug não depende da promoção progressiva. Qualquer pedido PIX lido entre o `create-order` e o `create-payment` mostra as linhas sem fechar o total.
- Não verifiquei no app local: a loja do worktree (:8092) e as functions (:54441, 503) estavam fora do ar, e subir os dois não é decisão minha (regra 8).

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 18
Caso: parou
Instruções lidas: CLAUDE.md (raiz)
Testes escritos: nenhum. O caso de core/orders/summary com os dados do #0608 passa antes de qualquer conserto (sonda temporária, apagada), então não há vermelho a escrever ali.
Verificações: sonda vitest em packages/core (1/1 passou); psql só de leitura nos pedidos #0606/#0608 e order_charge_locks
Árvore de trabalho: nada alterado
Citações conferidas: 5 (summary.ts, OrderItemsSummary.tsx, OrderConfirmationPage.tsx, OrderSummary.tsx do checkout via grep, buildOrderPayload/checkout handlers); nenhuma deslocada nem morta
Bloqueio: defeito anterior ao WI 102 (ressalva do árbitro, Gate 3 r2). O create-order grava o total com PIX e deixa pix_discount=0 até o create-payment, igual na master; o resumo do pedido está certo para os dados gravados. Parei no diagnóstico, sem tocar em código; a decisão de escopo é do humano.
```

## T18 — wi-impl-task · aborted · agente a77da4e943219ad9f

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/18-bug-9-resumo-do-pedido-com-promocao-e-pix.md
Situação: abortou

## Aborto

Caso 4: o que a tarefa afirma não bate com o repositório, e não dá para concluir. A tarefa manda parar na sua própria ressalva do Gate 3: "antes de corrigir, confira na `master` … Se já existia, **pare e relate**".

**O que conferi:**

1. **O banco local tem o pedido certo.** #0608 está gravado com `pix_discount 88.45`, `promotion_discount 102.99`, `campaign_discount 13.30`, `subtotal 1263.51`, `shipping 19.90`, `total 1194.96`. As linhas dele têm os preços cheios (349,90 · 2×340,00 · 349,90) e os cobrados (336,60 · 612,00 · 314,91).
   - O registro em `order_charge_locks` mostra o PIX desde o primeiro cálculo do servidor, às 20:52:29.566, meio segundo depois da criação (20:52:29.018).
   - `updated_at` é 20:52:29.561, e não há outra gravação depois disso.
2. **`orderSummary` produz a linha "Desconto PIX" para esse pedido.** Escrevi o teste com os dados exatos do #0608 e o par do #0606. **Passou verde sem nenhum conserto** (18/18 no arquivo). Saem as linhas Subtotal 1.379,80, campanha 13,30, progressivo 102,99 e PIX 88,45, e a conta fecha em 1.194,96. A condição de "vermelho antes do conserto" é impossível de cumprir. O teste foi retirado: a árvore ficou como estava.
3. **A tela do pedido não descarta o PIX.** `OrderItemsSummary.tsx` desenha todos os descontos que o resumo devolve. O pedido chega por `select('*, order_items(*)')`, tanto em `useOrder` quanto no `get-order` da convidada, sem filtrar coluna.
4. **Na `master` (merge-base `eceb80c2`) a lógica é a mesma.** `summary.ts` já acrescentava a linha do PIX para qualquer pedido, fora do ramo do pedido detalhado.

**A causa provável vem de antes do WI 102.** O `create-order` nunca grava `pix_discount`: a coluna não está em `COLUNAS_DO_PEDIDO` e `buildOrderPayload` nem o manda. A loja grava `total` já com o PIX, e o `pix_discount` (default 0) só chega quando o `create-payment` regrava o pedido.

Quem lê o pedido nesse intervalo recebe um retrato cujas linhas não fecham o Total. É o que acontece com o `useOrder` da tela `/pedido/:id/pagamento`, que monta junto com a cobrança. O cache da loja guarda esse retrato por 5 minutos. A releitura do `onSettled` de `useCreatePayment` só acontece quando o `create-payment` termina, e no local, com a chave do Mercado Pago inválida, isso pode levar até o teto de 15 s.

- Isso explica a diferença entre o #0608 e o #0606 pelo momento da leitura, não pela promoção.
- Os dois arquivos envolvidos (`supabase/functions/checkout/handlers.ts` e `apps/store/src/features/checkout/lib/buildOrderPayload.ts`) já tinham essa forma na `master`.
- Não consegui reproduzir no app: a loja do worktree (:8092) não estava de pé e as functions locais respondiam 503. Subir esses serviços não é decisão minha (regra 8). Por isso a corrida é hipótese apoiada em leitura de código e nos horários do banco, não um fato provado.

**A decisão é do humano.** Este defeito é anterior ao WI e não é exclusivo da promoção, então pode ser escopo novo. O conserto mais curto seria o `create-order` gravar já na criação o `pix_discount` calculado pela tela; o `create-payment` regrava esse valor pelo próprio recálculo. Ele toca a function `checkout` e `buildOrderPayload`. A alternativa é a tela de pagamento reler o pedido depois que a cobrança grava.

**Árvore:** nada desta tarefa ficou. `git status` mostra só `.specs/work-items/102-desconto-de-campanha/`, como antes.

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Parar e relatar, sem consertar | Gravar `pix_discount` no `create-order` por conta própria | A ressalva da tarefa manda parar quando o defeito já existia antes do WI. O mecanismo provável está na `master`, e o teste do resumo não fica vermelho | A tarefa 18 inteira e o reteste do BUG-009 |
| 2 | Retirar o teste que eu tinha acrescentado em `summary.test.ts` | Deixá-lo na árvore | Não houve conserto que ele provasse; deixá-lo seria mudança sem tarefa fechada | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `core/orders/summary` com o #0608 traz "Desconto PIX" e fecha 1.194,96; o par do #0606 continua verde | domínio | `packages/core/src/orders/__tests__/summary.test.ts` (escrito, rodado e retirado) | verde antes de qualquer conserto, então não houve vermelho | não se aplica: o vermelho não se reproduz |
| 2 | A tela do pedido desenha essas linhas | componente | não escrito | — | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102 (só leitura; a única edição foi retirada)

## Arquivos alterados

nada

## Verificação

- `pnpm --filter @estrelinha/core exec vitest run src/orders/__tests__/summary.test.ts --testTimeout=20000` (fonte: `PROJECT.md` › Comandos de verificação): exit 0, 18/18, com os dois casos novos, antes de qualquer conserto. O resultado é a evidência do aborto.
- `psql` só de leitura no banco local (:54442): `orders` #0606, #0607 e #0608, `order_items` do #0608, `order_charge_locks`, o default de `orders.pix_discount` (0) e o gatilho `update_orders_updated_at`.
- `git show`/`git diff` contra o merge-base com a `master` (`eceb80c2`) e contra `36196100` (o HEAD da sessão do QA).
- Tipos e lint não foram rodados: não houve mudança de código.

Instruções lidas:
- `CLAUDE.md` (raiz, no contexto: o defeito 01, convenções, guardas, baselines, FSD/alias)
- `packages/core/CLAUDE.md` › Dinheiro
- `apps/store/CLAUDE.md` › Carrinho, chrome e checkout · Minha conta e o detalhe do pedido (o arquivo tem 149 KB, lido por seção)
- `supabase/CLAUDE.md` › Edge functions · `checkout`
- `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local

## Divergências e descobertas

- **A causa nomeada pela tarefa não confere.** A tarefa situa o bug no `summary.ts` e na tela do pedido. Os dois produzem a linha do PIX com os dados gravados do #0608; o teste pedido não fica vermelho.
- **O mecanismo provável é anterior ao WI 102** (detalhado em `## Aborto`). O pedido nasce no `create-order` sem `pix_discount` e com o `total` já líquido do PIX, igual na `master`. A leitura feita antes do `create-payment`, guardada no cache, mostra linhas que não fecham o total.
- **Não houve prova no app.** A loja do worktree (:8092) estava fora do ar e as functions locais respondiam 503; não subi nada (regra 8).
- Citações conferidas: 4 (`summary.ts`, `OrderItemsSummary.tsx`, `OrderConfirmationPage.tsx`, `OrderSummary.tsx` do checkout); nenhuma deslocou nem estava morta.
- **Fora do escopo, mas visto:** a "Depende de" (tarefa 17) está na árvore. No commit `faec01fd`, `summary.ts` ganhou `compare_unit_price`, mas a captura do QA é anterior a isso: mostra a M-C "de R$ 349,90".

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 18
Caso: parou
Instruções lidas: CLAUDE.md (raiz); packages/core/CLAUDE.md › Dinheiro; apps/store/CLAUDE.md › Carrinho, chrome e checkout · Minha conta e o detalhe do pedido; supabase/CLAUDE.md › Edge functions · checkout; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: o caso de core/orders/summary com o #0608 (e o par #0606), em packages/core/src/orders/__tests__/summary.test.ts. Ficou VERDE antes de qualquer conserto e foi retirado. O caso da tela do pedido não foi escrito: o resumo já desenha a linha.
Verificações: vitest do arquivo de summary, exit 0, 18/18, sem conserto. Leitura do banco local: #0608 gravado com pix_discount 88.45, coerente desde 20:52:29.566. Diff contra a master (eceb80c2) e contra 36196100.
Árvore de trabalho: nada alterado (o teste acrescentado foi retirado)
Citações conferidas: 4 abertas; nenhuma deslocada, nenhuma morta
Bloqueio: a ressalva do Gate 3 manda parar se o defeito já existia antes do WI · O summary e a tela produzem a linha "Desconto PIX" com o #0608 gravado. O mecanismo provável está na master: o create-order não grava pix_discount e o total já vem líquido do PIX, então a leitura feita antes do create-payment, guardada no cache, fica sem a linha. Não houve prova no app (loja do worktree e functions locais fora do ar). A decisão de escopo (gravar pix_discount no create-order, ou reler o pedido depois da cobrança) sobe ao humano.
```

## T18 — wi-impl-task · review · agente aa6503153f6be8563

Tarefa: .specs/work-items/102-desconto-de-campanha/tasks/18-bug-9-resumo-do-pedido-com-promocao-e-pix.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A causa está na gravação do pedido. O `create-order` gravava o `total` que a loja mandou, já com o PIX descontado, mas nunca gravava `pix_discount`, que ficava no default 0. Entre a criação e a regravação do `create-payment`, a linha do pedido tinha linhas de resumo que não somam o total. O print do #0608 bate centavo por centavo com esse estado de criação: sem PIX e com Total R$ 1.194,96. A tela leu esse estado. O mais provável é que tenha vindo do cache do React Query, mas não reproduzi a corrida exata (ver Divergências). | Mexer em `core/orders/summary.ts` ou na tela. As duas já mostram a linha do PIX com os valores que o banco guarda hoje: o teste com a linha literal do #0608 passa de primeira. Também descartei derivar o PIX no resumo quando as linhas não fecham, porque isso seria inventar um número. | A causa está no servidor. O conserto vale para pedidos gravados daqui em diante, e o #0608 não foi tocado. | O corpo do pedido (`buildOrderPayload`), `CreateOrderInput` e a allowlist `COLUNAS_DO_PEDIDO` da function `checkout` |
| 2 | A loja manda `pix_discount: totals.pixDiscount` no corpo, e a function o copia como os outros descontos de tela: `promotion_discount`, `buy_together_discount`, `order_bump_discount`. O `create-payment` continua regravando o valor com o recálculo antes de cobrar. | Calcular o PIX dentro do `create-order`. Isso é mais código e seria um segundo cálculo, além do recálculo que o `create-payment` já faz. | Segue a convenção que já existe para os descontos "que a tela mostrou". O valor gravado nunca serve para cobrar. | O contrato loja → function `checkout` (create-order) |
| 3 | `OrderPayloadInput.totals` passou a exigir `pixDiscount: number`. | Deixar o campo opcional. | O `CheckoutPage` já passa `outcome.totals`, que tem o campo. Com ele obrigatório, um caller novo não esquece a linha do PIX. | Os testes que montam `totals` (fixtures atualizadas) |
| 4 | O caminho do pedido montado (`checkout/proposal.ts`) ficou fora do conserto. | Corrigir os dois caminhos. | O BUG-009 é do checkout comum e a menor superfície vence. O caminho do montado tem o mesmo padrão (grava `total` sem `pix_discount`) e está registrado em Divergências. | Nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O resumo do #0608 (campanha, progressivo e PIX) traz a linha "Desconto PIX" e as linhas somam R$ 1.194,96. O par #0606 (sem promoção, com cupom) continua certo. | domínio (core) | packages/core/src/orders/__tests__/summary.test.ts | sim | vermelho |
| 2 | O corpo do pedido leva `pix_discount` junto do total, e no cartão o valor vai 0. | unitário (loja) | apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts | sim | — |
| 3 | O `create-order` grava `pix_discount` ao lado do total. | unitário (function) | supabase/functions/checkout/__tests__/createOrder.test.ts | sim | — |
| 4 | A tela do pedido mostra Subtotal, campanha, progressivo, PIX, Frete e Total, e as linhas somam o Total. | componente | apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

## Arquivos alterados

apps/store/src/entities/order/api/useOrders.ts alterado
apps/store/src/features/checkout/lib/buildOrderPayload.ts alterado
apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts alterado
apps/store/src/features/checkout/lib/__tests__/chavesDoPedido.test.ts alterado
apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx alterado
packages/core/src/orders/__tests__/summary.test.ts alterado
supabase/functions/checkout/handlers.ts alterado
supabase/functions/checkout/__tests__/createOrder.test.ts alterado

## Verificação

- `pnpm --filter @estrelinha/core test --testTimeout=20000` (CLAUDE.md): exit 0, 5873 testes em 245 arquivos.
- `npx vitest run` em `supabase/` (functions, CLAUDE.md): exit 0, 1705 testes em 49 arquivos.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md): exit 0, 7394 testes em 402 arquivos.
- `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (CLAUDE.md): exit 0, 5360 testes em 306 arquivos.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md): 0 erros, igual ao baseline. Na primeira rodada deu 2 erros, nas minhas próprias fixtures de teste sem `pixDiscount`; corrigi as fixtures.
- `npx tsc --noEmit -p apps/store/tsconfig.server.json`: 0.
- `npx tsc --noEmit -p packages/core/tsconfig.json`: 11 erros, os mesmos 11 herdados do baseline (carousel 5, pickHomeBanners 1, pickHomeCollections 1, sitemap/urls 2, supabase/client 2). Nenhum erro novo.
- `npx eslint .` em `apps/store` (CLAUDE.md): 2 erros e 2 avisos, igual ao baseline 2/2. Estão em ProductInfo, ShareButtons e ShippingCalc; nenhum em arquivo que eu toquei.
- Arquivos isolados: os 4 testes novos rodaram em vermelho → verde onde se aplica, e as duas mutações foram restauradas com `cmp` conferido.

Instruções lidas: CLAUDE.md (raiz, injetado no contexto: defeito 01, Convenções, Guardas, Baselines, FSD/Alias, CI). apps/store/CLAUDE.md, packages/core/CLAUDE.md e supabase/CLAUDE.md não foram lidos por inteiro nesta corrida.

## Divergências e descobertas

- **A causa não está onde a tarefa supunha.** `core/orders/summary.ts` e `OrderItemsSummary.tsx` já mostram a linha "Desconto PIX" com os valores que o banco tem hoje para o #0608 (pix_discount 88,45). As fatias 1 e 4 passaram de primeira, e o check de mutação ficou vermelho nas duas, ou seja, as asserções mordem. O que estava inconsistente era a linha do pedido no instante da criação: `total` já sem o PIX e `pix_discount` = 0. Fica assim até o `create-payment` regravar, 0,54 s depois no #0608 (created_at 20:52:29.018, updated_at 29.561). O print da QA reproduz exatamente esse estado.
- **Não reproduzi a corrida exata que deixou a tela com esse estado.** O mais provável é o cache do React Query lido antes da regravação. A `useCreatePayment` invalida `['orders']` no `onSettled`, então o caminho exato não ficou provado. O conserto torna o pedido consistente desde a criação, e com isso qualquer leitor nessa janela vê linhas que somam o total: a tela, o cache, um e-mail disparado na criação, ou um 422 do `create-payment` antes de regravar.
- **Não vi o comportamento no app local.** O dev server não estava de pé (:8092 recusou) e as edge functions locais respondiam 503. Subir os dois é proibido pela regra 8. A prova é a dos testes: corpo, function, core e tela. Falta o reteste da QA criando um pedido novo com promoção e PIX.
- **Âncora atualizada.** `chavesDoPedido.test.ts` passou de 28 para 29 colunas e ganhou `pix_discount` no `arrayContaining`. O guarda reprovou como devia ao ver a chave nova na loja, e passou de novo depois que a function passou a listá-la.
- **Fora do escopo:** `supabase/functions/checkout/proposal.ts`, o pedido montado, grava `total: totais.total` sem `pix_discount` e tem o mesmo defeito de linhas que não fecham até o `create-payment` regravar. Não foi corrigido.
- O #0608 e a massa da QA não foram tocados.
- Retomada: a árvore não tinha trabalho desta tarefa (`git status` só mostrava `.specs`). Comecei do zero.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 18
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz: defeito 01, Convenções, Guardas, Baselines, FSD/Alias); apps/store/CLAUDE.md, packages/core/CLAUDE.md e supabase/CLAUDE.md não lidos por inteiro nesta corrida
Testes escritos: packages/core/src/orders/__tests__/summary.test.ts (#0608 com a linha PIX e as linhas fechando o total, mais o par #0606; passou de primeira, com mutação vermelha); apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx (a tela com as seis linhas na ordem do checkout, somando o Total; passou de primeira, com mutação vermelha); apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts (pix_discount no corpo, 0 no cartão; vermelho antes do conserto); supabase/functions/checkout/__tests__/createOrder.test.ts (o create-order grava pix_discount; vermelho antes do conserto). Sem cobertura: a corrida de cache que mostrou o estado de criação, que exige navegador e functions servidas
Verificações: core 5873/245, functions 1705/49, store 7394/402 e backoffice 5360/306, todas com exit 0; tsc store 0, server 0, core 11 (todos herdados); eslint store 2/2 (baseline). Não vi no app local: dev server e functions fora do ar, e subi-los é proibido
Árvore de trabalho: apps/store/src/entities/order/api/useOrders.ts; apps/store/src/features/checkout/lib/buildOrderPayload.ts e os testes buildOrderPayload.test.ts e chavesDoPedido.test.ts; apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx; packages/core/src/orders/__tests__/summary.test.ts; supabase/functions/checkout/handlers.ts e __tests__/createOrder.test.ts. Nada commitado
Citações conferidas: 4 (summary.ts, OrderItemsSummary.tsx, OrderConfirmationPage.tsx, checkout/OrderSummary via useCheckoutTotals); nenhuma deslocada nem morta
```

## T18 — wi-impl-review · done · agente a9b0b8c1b44700752

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/tasks/18-bug-9-resumo-do-pedido-com-promocao-e-pix.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| "O teste novo reprovava antes e passa depois" | Os testes que de fato reprovam sem o conserto estão em `buildOrderPayload.test.ts` (o caso de `pix_discount: 88.45`), `createOrder.test.ts` (o caso "grava o desconto PIX…": `toMatchObject({ pix_discount: 88.45 })` sobre a linha inserida) e `chavesDoPedido.test.ts` (âncora de 28 para 29 colunas, com `pix_discount`). Os casos de `summary.test.ts` e `OrderItemsSummary.test.tsx` passam desde a primeira execução: a causa estava na gravação, não na montagem (premissa 1). | sim, pela leitura; o vermelho de antes só a execução mostra |
| "a suíte, os tipos e o lint dos workspaces tocados sem regressão" | — | só execução |
| "O comportamento esperado do BUG-009 foi visto funcionando no app local" | — | só execução |

## Obrigações

- **Suíte, tsc e eslint por workspace contra a baseline; com core tocado, rodar também a loja e o painel; com functions tocado, rodar functions.** Só a execução prova. No diff, `packages/core` mudou apenas em teste (`summary.test.ts`). `supabase/functions/checkout/handlers.ts` mudou, então a suíte de functions se aplica.
- **Guardas verdes sem afrouxar asserção.** O guarda `chavesDoPedido.test.ts` ficou mais apertado: a âncora passou de 28 para 29 e `arrayContaining` agora inclui `pix_discount`. A regra não perdeu nada. O resto só a execução prova.

## Testes

- **`core/orders/summary` com o #0608, mais o par #0606.** Estão em `packages/core/src/orders/__tests__/summary.test.ts:324-373`. A asserção morde: a lista exata de descontos inclui `pix`, o total é 1194,96 e `fecha(s) === cents(total)`. O par sem promoção também está lá. O bloco `Testes` pedia que esse caso estivesse vermelho antes do conserto, e não estava. A causa provada fica fora de `summary.ts`: a linha gravada não trazia `pix_discount`. A tarefa autoriza essa leitura ("registre … onde estava a causa"). Quem guarda o conserto são os casos de gravação: `buildOrderPayload.test.ts:328-351`, `createOrder.test.ts:199-207` e `chavesDoPedido.test.ts:58-65`. Os três mordem: apagar `pix_discount` do corpo ou da allowlist `COLUNAS_DO_PEDIDO` derruba cada um deles.
- **A tela do pedido renderizando essas linhas.** Está em `apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx:503-541`. A asserção morde: confere a ordem exata dos `dt`, o valor −88,45 e a soma das linhas em centavos igual ao Total.
- O caso "no cartão o desconto PIX vai zerado" (`buildOrderPayload.test.ts:343-351`) só prova que o valor passa adiante. Mesmo assim pega o campo ausente (`undefined` ≠ 0).

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | A causa está na gravação: o `create-order` não gravava `pix_discount`. O conserto fica no servidor e vale daqui em diante. O #0608 não foi tocado. | sim | `mercado-pago/handlers.ts:936-950` só grava `pix_discount` no `create-payment`. Antes disso a linha do pedido tinha `total` com o PIX descontado e `pix_discount` igual a 0. `summary.ts` não muda no diff. | sim. `buildOrderPayload.ts`, `CreateOrderInput` (`useOrders.ts:144-148`) e `COLUNAS_DO_PEDIDO` (`handlers.ts:239-241`). Outros leitores de `pix_discount` (`mercado-pago/analytics.ts:52,214`) leem depois da regravação. |
| 2 | O valor da tela é copiado como os outros descontos de tela, e o `create-payment` o regrava. | sim | `handlers.ts:940` regrava `pix_discount: totals.pixDiscount` nos dois meios, antes de cobrar. O padrão é o mesmo de `promotion_discount`, `buy_together_discount` e `order_bump_discount`, que também ficam na allowlist. | sim |
| 3 | `totals.pixDiscount` passou a ser obrigatório em `OrderPayloadInput`. | sim | O único chamador de produção é `CheckoutPage.tsx:542`, que passa `totals` = `outcome.totals`. O tipo tem `pixDiscount`, inclusive no ramo de falha de `useCheckoutTotals.ts:248`. As fixtures dos testes foram atualizadas. | sim |
| 4 | `checkout/proposal.ts` fica fora do conserto. | sim | A tarefa trata do checkout comum. O implementador declarou o caminho do pedido montado como divergência, e a tarefa não o exige. | sim (nenhum) |

## Não conferido

- O vermelho antes do conserto, as suítes, `tsc`, lint e a conferência no app local. Só a execução prova esses pontos.
- `apps/store/CLAUDE.md` não foi lido por inteiro. Procurei nele os termos `pix_discount` e `COLUNAS_DO_PEDIDO` e não achei regra sobre o assunto.
- Todos os arquivos de `alterados` aparecem como `M` em `git status`. Não há arquivo `??`, então todos têm baseline no diff.

Instruções lidas: `CLAUDE.md` (raiz: o "defeito 01", Convenções, Os guardas, Baselines, FSD/Alias, lido do contexto da sessão) · `packages/core/CLAUDE.md` › Dinheiro · `supabase/CLAUDE.md` › trecho da function `checkout` (linhas 455-485, `COLUNAS_DOS_ITENS` / `COLUNAS_DO_PEDIDO`) · `apps/store/CLAUDE.md` só por busca de termos.
