# 73 — mobile-adm: Início · Validation

**Data**: 2026-10-22
**Spec**: `.specs/features/73-mobile-adm-inicio/spec.md` (`MAI-01`..`MAI-31`, Edge Cases, Success Criteria)
**Design**: `design.md`, abordagem A (`AD-057`)
**Superfície**: `git diff feature/mobile-adm` (29 arquivos rastreados, +858/−743) + os não rastreados de
`git status --porcelain` (`packages/core/src/{orders/queue.ts,stats/**,hooks/useStore*.ts,hooks/useOrdersRealtime.ts}`,
`supabase/migrations/20261023120000_73-resumo-do-atelie.sql`, `apps/mobile-adm/src/**` (entities, widgets,
`PullToRefresh`, `leitura`, `queryClient`, `useRecusaDePapel`, testes), `apps/backoffice/src/entities/__tests__/`,
e os dois guardas da loja `overviewSchema.test.ts` e `filaComDonoUnico.test.ts`). Sem commit (pedido do usuário).
**Verificador**: sub-agente independente (autor ≠ verificador). A cobertura abaixo foi derivada da spec e do
código antes de ler `tasks.md`, `baseline.md` e `prova-navegador.md`; esses três só foram usados depois, para
conferir números e a prova em navegador.

## Veredito: **FAIL ❌** — 1 mutante sobrevivente de comportamento (A32, `MAI-11`), nenhum defeito de produto

O código faz o que a spec pede em todo AC conferido; o FAIL é de **cobertura**: um mutante que lê o mês pelo
relógio do aparelho passa a suíte inteira. É uma correção só de teste.

---

## Gates (medidos nesta sessão, um workspace por vez, exit fora de pipe)

| Medida | Resultado | Entrada (`baseline.md`) | Delta |
| --- | --- | --- | --- |
| core `pnpm --filter @estrelinha/core test` | **3811/146**, exit 0 | 3507/138 | +304/+8 |
| mobile-adm `pnpm --filter @estrelinha/mobile-adm test` | **387/39**, exit 0 | 267/26 | +120/+13 |
| store `… test --testTimeout=20000` | **5812/317**, exit 0 | 5748/315 | +64/+2 (`overviewSchema`, `filaComDonoUnico`, +lista de RPC em `marcacaoSoPorAcao`) |
| backoffice `… test --testTimeout=20000` | **3643/207**, exit 0 | 3653/208 | **−10/−1, queda declarada e conferida**: saíram `useOrdersRealtime.test.ts` (4) e `useStoreMovement.test.ts` (10) do painel; entrou `entities/__tests__/reexportaDeCore.test.ts` (4). Os 14 reaparecem em `packages/core/src/hooks/__tests__/` (6 + 12) |
| `tsc --noEmit -p apps/{mobile-adm,store,backoffice}/tsconfig.app.json` | **0 · 0 · 0** | 0 · 0 · 0 | — |
| `eslint .` em `apps/mobile-adm` | 0 erros | 0/0 | — |
| probe `probes/01-resumo.sql` (Postgres 54442, `begin … rollback`) | 25 `ok`, exit 0, "nenhum pedido PRB- sobrou: 0" | — | — |

Functions e catalog-import não foram tocados e não foram remedidos.

---

## Spec-anchored acceptance criteria

Legenda: ✅ evidência com o resultado da spec · ⚠️ lacuna de precisão · 🌐 provado só em navegador (jsdom não mede layout).

### P1 — Movimento

| AC | Resultado da spec | Evidência (`arquivo:linha` — asserção) | |
| --- | --- | --- | --- |
| MAI-01 | `store_movement` uma vez, sem argumento; os 4 números de Hoje | `apps/mobile-adm/src/pages/__tests__/InicioPage.test.tsx:69` — `expect(fake.chamadasDe('store_movement')).toEqual([{ nome: 'store_movement', args: [] }])`; `:67` nome `Faturamento, hoje, R$ 1.077`; `:78` Vendas/Ticket/Visitas | ✅ |
| MAI-02 | troca sem leitura, `aria-pressed` | `widgets/movement-hero/__tests__/MovementHero.test.tsx:57-66` — `aria-pressed` `true`/`false` e `tentarDeNovo` não chamado; `InicioPage.test.tsx:279-285` (um canal, sem nova leitura ao trocar) | ✅ |
| MAI-03 | ticket `—`, faturamento `R$ 0`, vendas `0`, nunca `R$ 0,00` | `MovementHero.test.tsx:72-76` — `'Ticket médio, ontem, —'`, `formatPriceWhole(0)` ⇒ `/^R\$\s0$/`, `queryByText(/R\$\s0,00/)` nulo; `:79-83` (vendas 0 com ticket 0) | ✅ |
| MAI-04 | saudação e data pelo dia/hora de Brasília do banco | `MovementHero.test.tsx:85-102` (aparelho em UTC: 14:30Z ⇒ "Bom dia", 01:30Z do dia 23 ⇒ "Boa noite" e "quinta-feira, 22 de outubro"); `packages/core/src/stats/__tests__/labels.test.ts:35-59` (as seis bordas 04:59…18:00) | ✅ |

### P1 — Precisa de você

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| MAI-05 | 4 blocos, contagem, rótulo, frase; idade do mais antigo só com contagem > 0 | `widgets/queue-tiles/__tests__/QueueTiles.test.tsx:16-35` (rótulos e frases por extenso, contagens 3/2/1/4), `:37-46` (acento só no 1º; `'o mais antigo parado há 9 dias'`), `:48-55` (contra `lido_em`), `:57-71` (sem idade em zero) | ⚠️ a spec escreve "o mais antigo há 9 dias"; o código escreve "parado há 9 dias" (`queueAgeLabel`, tier `stale`) — coerente com a emenda do design (§8: "a idade de `queueAge`, a mesma do painel"), mas o texto do AC não foi emendado |
| MAI-06 | uma regra, lida pelos dois apps; "Precisa de ação" = UNIÃO | `packages/core/src/orders/__tests__/queue.test.ts:92-93` (cada bloco = cadeia do painel de antes), `:111-112` (`needsActionOrFilter()` = `PRECISA_ACAO_OR` de antes), `:211-237` (painel monta por `toPostgrestFilter`); `apps/store/src/shared/lib/__tests__/filaComDonoUnico.test.ts:108-114` (SQL byte a byte, união por `or`); probe `01-resumo.sql` "a UNIÃO ganhou 4 … não 5" e "as quatro contagens, a idade e a união = as consultas do painel" | ✅ |
| MAI-07 | bloco ⇒ `/pedidos?bloco=…`; "Ver pedidos" ⇒ visão Precisa de ação; um dono | `QueueTiles.test.tsx:84-99` — `destino()` `'/pedidos?bloco=aguardando'` … `'/pedidos?visao=precisa-acao'`; `entities/order/model/__tests__/pedidosHref.test.ts:7-43` | ✅ |
| MAI-08 | tudo em zero: seção visível, zeros, sem frase festiva | `QueueTiles.test.tsx:73-82` | ✅ |

### P1 — Mês e semana

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| MAI-09 | uma RPC admin nova, sem argumento de data, pelo dono do dia | `InicioPage.test.tsx:70` (`args: []`); `packages/core/src/hooks/__tests__/useStoreOverview.test.ts:92`; `overviewSchema.test.ts` réguas `hojePorStoreDay`, `mesPeloDiaDoBanco`, `recortePorStoreDayStart`, `semRelogioDoServidor` (`:113-124`, `:109-112`) | ✅ |
| MAI-10 | 7 barras, R$ mil com 1 casa, `—` sem venda, "hoje" na última, total no cabeçalho, mais alta = maior, destaque em hoje | `widgets/week-chart/__tests__/WeekChart.test.tsx:15-21` (`'0,4sex' … '1,1hoje'`), `:24-28` (84 px no maior, 4 px de piso), `:30-37` (accent só em hoje), `:57-61` (`R$ 5.806`); probe "7 dias … o dia sem venda vem com 0; segunda é dow 1" | ⚠️ "com uma casa" não diz o que sai num milhar exato: `thousandsLabel(1000)` = `"1"`, não `"1,0"` |
| MAI-11 | "Fat. de <mês de Brasília>", soma, "N pedidos pagos" (singular em 1) | `widgets/month-cards/__tests__/MonthCards.test.tsx:13-20`, `:30-37`; probe "março: … 4 vendas, R$ 510" | ❌ **A32 sobreviveu**: `:22-28` deveria provar o mês do banco contra o aparelho, mas o relógio falso (`2025-12-31T23:59-03:00`) já é janeiro em UTC — ler `new Date().toISOString()` dá o mesmo `janeiro` |
| MAI-12 | primeira venda da vida no mês, convidada por e-mail, cadastro por `customer_id` | probe "só c73 e g3: a convidada de fevereiro (e-mail com outra caixa) e a cadastrada que adotou o pedido antigo não contam"; `overviewSchema.test.ts:135-142` (`clientesPeloVinculo`); `MonthCards.test.tsx:39-44` | ✅ |
| MAI-13 | ≤ 4 por peças, variações somadas, empate por nome, "1 peça", vazio explicado | probe "a órfã pelo nome congelado, o produto pelo nome do catálogo (variações somadas), empate por nome, limit 4"; `widgets/top-jewels/__tests__/TopJewels.test.tsx:12-39`; `labels.test.ts:113-119` | ✅ |

### P1 — Últimos pedidos

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| MAI-14 | 4 mais recentes, qualquer estado, nome, `formatOrderNumber`, há quanto tempo, total com centavos, selo de `orderSituation` | `widgets/recent-orders/__tests__/RecentOrders.test.tsx:15-36`, `:38-44` (contra `lido_em`), `:46-52`; probe "os 4 mais recentes por created_at, de qualquer estado (Pix pendente incluso)" | ✅ |
| MAI-15 | "Ver todos" ⇒ `/pedidos?visao=tudo`; linhas não são links | `RecentOrders.test.tsx:54-72` | ✅ |
| MAI-16 | sem pedido: "ainda não há pedidos" | `RecentOrders.test.tsx:74-79` | ✅ |

### P1 — Falha, recusa e frescor

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| MAI-17 | falha sem dado: frase + "Tentar de novo", nenhum número; os outros blocos seguem | `InicioPage.test.tsx:91-118` (cada leitura falha sozinha), `:120-140` (pendura sozinha), `:142-153` ("Tentar de novo" relê só a dela); widgets `…:134-148`, `QueueTiles.test.tsx:121-128` etc. | ✅ |
| MAI-18 | releitura falha: números ficam, "Atualizado às" (hora de Brasília do `lido_em`), aviso; nunca esqueleto | `InicioPage.test.tsx:157-204` (`/^Atualizado às 11h30\.$/`, a mais antiga, `NAO_ATUALIZOU`, sem `aria-busy`) | ✅ |
| MAI-19 | puxar no topo relê tudo, mostra e tira "Atualizando…" | `InicioPage.test.tsx:332-350`; `shared/ui/__tests__/PullToRefresh.test.tsx:40-95`, `:112` (`overscroll-behavior-y: contain`) | ✅ |
| MAI-20 | Realtime relê; um canal; fecha ao sair da aba | `InicioPage.test.tsx:269-314` | ✅ |
| MAI-21 | volta ao primeiro plano relê; virada pela duração do servidor | `InicioPage.test.tsx:352-375`; `useStoreOverview.test.ts:145-194`; `useStoreMovement.test.ts:216-236` | ✅ |
| MAI-22 | `42501` ⇒ `retryAdminCheck` ⇒ recusa da `72` com "Sair"; nunca números | `InicioPage.test.tsx:208-254`; `app/__tests__/inicioComClientReal.test.tsx:66` (client real); `features/access-check/model/__tests__/useRecusaDePapel.test.tsx:46-117` | ✅ |
| MAI-23 | só RPC admin, nunca `orders` pelo PostgREST | `InicioPage.test.tsx:72` — `leiturasDeDado().sort()` = `['rpc:store_movement', 'rpc:store_overview']` | ✅ |
| MAI-24 | falha de rede ≠ recusa | `InicioPage.test.tsx:256-265`, `:103-104`; `useRecusaDePapel.test.tsx:68-88` | ✅ |
| MAI-25 | resposta antiga que chega depois é descartada | `InicioPage.test.tsx:377-396` | ✅ |
| MAI-26 | sem conexão: tela da `72`; SW sem resposta das leituras | `app/__tests__/swSemDadosDaLoja.test.ts:34-42` (`runtimeCaching` indefinido, nada casa `supabase.co`); `InicioPage.test.tsx:400-429` (cai e volta) | ✅ |

### P1 — A tela no celular

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| MAI-27 | sem rolagem do body em 360/412; faixa rola dentro; alvos ≥ 44 px | proxy de classe: `QueueTiles.test.tsx:101-109`, `MovementHero.test.tsx:113-118`, `RecentOrders.test.tsx:66-72`; 🌐 `prova-navegador.md` §Layout (`scrollWidth` 360=360 e 412=412, faixa `scrollLeft` 456 com `window.scrollX` 0, nenhum alvo < 44 px) | ✅ 🌐 |
| MAI-28 | `R$ 99.999` e `R$ 9.999,99` numa linha | `MovementHero.test.tsx:104-111`, `MonthCards.test.tsx:46-54` (`whitespace-nowrap`, `grid-cols-2`, `min-w-0`); 🌐 `prova-navegador.md` (R$ 99.999 e R$ 9.999,90 numa linha) | ✅ 🌐 |
| MAI-29 | rodapé do Backoffice presente | `InicioPage.test.tsx:83-87` | ✅ |
| MAI-30 | esqueleto com `aria-busy`; nome acessível rótulo, período, valor | `MovementHero.test.tsx:41-50`, `:122-132`; `InicioPage.test.tsx:75-81`; widgets "carregando" | ✅ |
| MAI-31 | esqueleto e troca de período não se movem | `MovementHero.test.tsx:128-131` (todo `animate-pulse` com `motion-reduce:animate-none`); `PullToRefresh.test.tsx:97` | ⚠️ "a troca de período não se move" não tem asserção: os botões não têm `transition-*` hoje, mas nada recusa que ganhem |

**Status**: 30/31 com evidência e resultado da spec · 1 sem discriminação (MAI-11, A32) · 3 lacunas de precisão (MAI-05, MAI-10, MAI-31).

### Edge Cases

- [x] Segunda-feira: Semana = Hoje — regra do `store_movement` da `71` (não mexida aqui); o probe mede segunda como `dow 1`.
- [x] Dia 1: "do mês" = Hoje — probe (C às 00:00 do dia 1 entra em março; A e B, 21:30 e 23:59 do dia 28, não).
- [x] Pago ontem e cancelado hoje sai de tudo — probe (D cancelado fora da semana, do mês, das joias); `overviewSchema` `vendaUmaVez`.
- [x] Convidada em setembro e outubro não é nova — probe (G1, com o e-mail em outra caixa).
- [x] Cadastrada com pedido de convidada antigo no mesmo e-mail — probe (F1/F2).
- [x] Menos de 4 produtos — `TopJewels.test.tsx:29-32`.
- [x] Conexão cai e volta — `InicioPage.test.tsx:400-429` e o conserto D1 da prova em navegador.
- [x] Sair da conta com a Início aberta — `InicioPage.test.tsx:316-328`.

### Success Criteria

- [x] Números da Início = `/admin` e `/admin/pedidos` no mesmo instante — probe (paridade com as consultas do painel) e `prova-navegador.md` (PostgREST com `toPostgrestFilter`, 18·10·1·0 e a união 29).
- [x] Qualquer fuso do aparelho — os testes rodam com `TZ=UTC` e instantes em que UTC e Brasília discordam (menos o mês: A32).
- [x] Rede, papel, RPC derrubada nunca põem número que não veio de leitura boa — MAI-17/22/24.
- [x] Prova em navegador em 360 e 412 no build servido — `prova-navegador.md`.

---

## Discrimination sensor (forma expandida — dinheiro e acesso)

Arnês: `scratchpad/sensor.py`. Cada mutação no **arquivo real**, primeira ocorrência (todas com 1 ocorrência),
os grupos rodados, e a restauração **byte a byte** com SHA-256 conferido por mutante (53/53 `sha_ok`). No
fim, `shasum -c` dos 22 arquivos tocados: 0 diferenças; `git status --porcelain` e `git diff` com o mesmo
hash de antes do sensor. Sem `git stash`. Morte por compilação: o log contém `Transform failed`/`SyntaxError`/
`syntax error at or near` (nenhuma ocorreu). Grupos: `core` (suíte inteira), `madm` (suíte inteira), `guards`
(`filaComDonoUnico` + `overviewSchema`), `probe` (`01-resumo.sql`, que reaplica a migration dentro da
transação, então mede o arquivo mutado).

| # | Arquivo | Mutação | Grupos que reprovaram | Resultado |
| --- | --- | --- | --- | --- |
| Q01 | `core/orders/queue.ts` | bloco aguardando conta `material_enviado` | core, guards | morto (asserção) |
| Q02 | `queue.ts` | união sem "sem-rastreio" | core, guards | morto (asserção) |
| Q03 | `queue.ts` | união ignora `unionRule` (R1) | core, guards | morto (asserção) |
| Q04 | `queue.ts` | PostgREST `and(` → `or(` | core | morto (asserção) |
| Q05 | `queue.ts` | SQL `in (…)` perde o 1º valor | core, guards | morto (asserção) |
| Q06 | `queue.ts` | Pix aguardando conta `approved` | core, guards | morto (asserção) |
| S01 | migration | borda superior do dia `<` → `<=` | probe | morto (asserção) |
| S02 | migration | `left join vendas` → `join` | probe | morto (asserção) |
| S03 | migration | `count(v.id)` → `count(*)` na semana | probe | morto (asserção) |
| S04 | migration | joias agregadas `order by j.nome` | probe | morto (asserção) |
| S05 | migration | primeira venda por `max` | guards, probe | morto (asserção) |
| S06 | migration | clientes novas só de hoje | probe | morto (asserção) |
| S07 | migration | mês começa um dia antes | guards, probe | morto (asserção) |
| S08 | migration | venda inclui cancelado | guards, probe | morto (asserção) |
| S09 | migration | `precisa_acao` sem sem-rastreio | guards, probe | morto (asserção) |
| S10 | migration | `a_separar` conta `shipped` | guards, probe | morto (asserção) |
| S11 | migration | joia pelo nome congelado mesmo com produto | probe | morto (asserção) |
| S12 | migration | sem `has_role`/`42501` | guards, probe | morto (asserção) |
| S13 | migration | recentes `asc` | guards, probe | morto (asserção) |
| S14 | migration | `expira_em` por `store_day_start(hoje) + 1 day` | — | **equivalente** (America/Sao_Paulo sem horário de verão desde 2019: as duas formas dão o mesmo instante) |
| A01 | `movement-hero/model/numeros.ts` | ticket só `—` com `null` | madm | morto (asserção) |
| A02 | `core/stats/labels.ts` | "Bom dia" a partir de `> 5` | core | morto (asserção) |
| A03 | `labels.ts` | "Boa tarde" até `<= 18` | core | morto (asserção) |
| A04 | `MovementHero.tsx` | saudação pela hora do aparelho | madm | morto (asserção) |
| A05 | `useRecusaDePapel.ts` | `42501` não chama `retryAdminCheck` | madm | morto (asserção) |
| A06 | `useRecusaDePapel.ts` | reconfere a cada montagem (laço) | madm | morto (asserção) |
| A07 | `InicioPage.tsx` | `42501` deixa o dado antigo na tela | madm | morto (asserção) |
| A08 | `core/hooks/useStoreOverview.ts` | `retryUnlessDenied` repete o `42501` | core, madm | morto (asserção) |
| A09 | `entities/stats/api/leituras.ts` | movimento sem `retryUnlessDenied` | madm | morto (asserção) |
| A10 | `core/hooks/useOrdersRealtime.ts` | `removeChannel` apagado | core, madm | morto (asserção) |
| A11 | `useOrdersRealtime.ts` | efeito sem dependências (canal por render) | core, madm | morto (asserção) |
| A12 | `InicioPage.tsx` | aviso não invalida o resumo | madm | morto (asserção) |
| A13 | `InicioPage.tsx` | `falhou: q.isError` (sem `&& !q.data`) | — | **equivalente** (todo consumidor lê `falhou && !dado` ou `!dado && !falhou`; `naoAtualizou` é calculado à parte) |
| A14 | `InicioPage.tsx` | "Atualizado às" pela leitura mais NOVA | madm | morto (asserção) |
| A15 | `entities/order/model/pedidosHref.ts` | `PARAM_BLOCO` → `filtro` | madm | morto (asserção) |
| A16 | `RecentOrders.tsx` | "há quanto tempo" pelo aparelho | madm | morto (asserção) |
| A17 | `queue-tiles/model/fila.ts` | idade do mais antigo pelo aparelho | madm | morto (asserção) |
| A18 | `fila.ts` | idade com contagem zero | madm | morto (asserção) |
| A19 | `week-chart/model/barras.ts` | "hoje" na primeira barra | madm | morto (asserção) |
| A20 | `barras.ts` | sem piso de altura | madm | morto (asserção) |
| A21 | `labels.ts` | dia sem venda escreve `0` | core, madm | morto (asserção) |
| A22 | `labels.ts` | plural `n <= 1` ("0 peça") | core, madm | morto (asserção) |
| A23 | `TopJewels.tsx` | até 5 joias | madm | morto (asserção) |
| A24 | `app/App.tsx` | provider de volta ao ramo online (D1) | madm | morto (asserção) |
| A25 | `PullToRefresh.tsx` | puxar fora do topo | madm | morto (asserção) |
| A26 | `useStoreOverview.ts` | virada pelo relógio do aparelho | core (madm passou) | morto (asserção) |
| A27 | `core/formatters/price.ts` | `formatPriceWhole` com até 2 casas | core (madm passou) | morto (asserção) |
| A28 | `useRecusaDePapel.ts` | qualquer código vira recusa | madm | morto (asserção) |
| A29 | `MovementHero.tsx` | `aria-pressed` fixo em Hoje | madm | morto (asserção) |
| A30 | `QueueTiles.tsx` | "Ver pedidos" vai a Tudo | madm | morto (asserção) |
| A31 | `WeekChart.tsx` | hoje sem a cor de destaque | madm | morto (asserção) |
| A32 | `MonthCards.tsx` | `monthName(new Date().toISOString())` | — | **SOBREVIVEU** |
| B01 | `backoffice/.../useAdminOrderList.ts` | painel conta "a separar" pela regra da união | core (guarda de fonte) | morto (asserção) |

**Resultado**: 53 injetados · **50 mortos (50 por asserção, 0 por compilação)** · **1 sobrevivente** (A32) ·
2 equivalentes declarados (S14, A13) · 0 inválidos.

Observações do sensor:

- **Seis mutantes de SQL (S01–S04, S06, S11) passam os dois guardas da loja e só morrem no probe**, que não roda
  em suíte automática nenhuma. Estão mortos, mas a proteção deles depende de alguém rodar o probe.
- **A26 e A27 só morrem em `core`**: a página do app é cega a eles. A26 porque o relógio falso do caso da
  virada (`InicioPage.test.tsx:363`) põe a diferença acima de `2^31` ms e o `setTimeout` dispara na hora (o
  resumo é relido de qualquer jeito, e o caso só conta `store_movement` em 50 s); A27 porque as fixturas da
  página não têm faturamento com centavos no Hoje. Os donos em `core` seguram.

---

## Code quality (amostra)

| Item | |
| --- | --- |
| Regra da fila com um dono em `core` e a cópia SQL guardada byte a byte (`AD-057`) | ✅ |
| Nenhuma leitura PostgREST na Início (`MAI-23`) | ✅ |
| Painel reexporta (`toBe`) e não muda de comportamento | ✅ `reexportaDeCore.test.ts`, suíte do painel verde |
| SPEC_DEVIATION declaradas (`useStoreOverview.ts:6`, `pedidosHref.ts:12`) | ✅ declaradas no arquivo, com razão |
| Resíduo do defeito 01 | ⚠️ `apps/backoffice/src/entities/order/api/useAdminOrderList.ts:175` — a idade do mais antigo no painel ainda escreve `.eq('material_status', 'aguardando_material')` à mão, fora de `QUEUE_BLOCKS`; o guarda de fonte de `queue.test.ts:211-214` só olha `orderQuery.ts` |

---

## Lacunas ranqueadas

1. **A32 sobreviveu: `MAI-11`, o nome do mês "de Brasília", não é discriminado contra o relógio do aparelho.**
   `apps/mobile-adm/src/widgets/month-cards/__tests__/MonthCards.test.tsx:22-28`. O relógio falso
   `2025-12-31T23:59-03:00` é `2026-01-01T02:59Z`, então ler o mês do aparelho em UTC dá `janeiro`, como o
   esperado. **Tarefa de conserto**: fixar o relógio no meio de outro mês (ex.: `2026-06-15T12:00Z`) com
   `mes: '2026-10'` e esperar "Fat. de outubro"; reinjetar A32 e ver o caso reprovar.
2. **A semântica da RPC depende de um probe manual** (S01–S04, S06, S11 passam a suíte da loja). Não é
   sobrevivente, porque o probe os mata, mas nada no CI roda o probe. Registrar no fecho que o probe faz
   parte do gate desta migration e de toda que recrie `store_overview`.
3. ⚠️ **`MAI-05`**: o AC diz "o mais antigo há 9 dias" e a tela diz "o mais antigo **parado** há 9 dias"
   (`queueAgeLabel`, tier `stale`). É o comportamento do painel e o que a emenda do design pediu; falta emendar
   o texto do AC.
4. ⚠️ **`MAI-31`**: nenhuma asserção recusa movimento na troca de período (`MovementHero.tsx:57-71` não anima
   hoje).
5. ⚠️ **`MAI-10`**: "R$ mil com uma casa" não define o milhar exato (`thousandsLabel(1000)` = `"1"`).
6. Resíduo de segundo dono no painel: `useAdminOrderList.ts:175` (idade do mais antigo com predicado escrito à
   mão).

Pendências de navegador declaradas pelo autor e não remedidas aqui: app instalado (standalone), virada do dia
com a tela aberta, 3G, `prefers-reduced-motion`.

## Lições destiladas

`L-058` (relógio falso numa borda onde UTC e o esperado coincidem — A32) e `L-059` (semântica de RPC só
provada por probe fora do CI — S01–S04, S06, S11), escritas à mão em `.specs/LESSONS.md` como candidatas.
As lacunas de precisão (MAI-05, MAI-10, MAI-31) são de texto da spec e não viraram lição.

---

# Rodada 2

**Data**: 2026-10-22 · **Verificador**: sub-agente independente, novo (não escreveu o código nem o conserto r1)
**Superfície**: `git diff feature/mobile-adm` + `git status --porcelain` (a maior parte da `73` segue não
rastreada; o conserto r1 foi lido nos arquivos, não por diff). Hash de `git status --porcelain` + `git diff`
antes e depois de todo o sensor: `3e41e430…0e085`, idêntico.

## Veredito: **FAIL ❌** — 4 sobreviventes de comportamento, nenhum defeito de produto encontrado

As seis lacunas da r1 estão fechadas ou registradas. O FAIL vem da amostra nova: duas promessas da spec
(`MAI-18` para o resumo, `MAI-22` na troca de conta) e um guarda (o do painel) têm alcance menor que a regra.
Todas as correções são de teste/guarda.

## As lacunas da r1, uma a uma

| # | Lacuna r1 | Estado | Evidência |
| --- | --- | --- | --- |
| 1 | A32 (`MAI-11`, relógio falso numa borda) | ✅ fechada | `MonthCards.test.tsx:24-46` — aparelho em `2026-06-15T12:00Z` com `mes: '2026-10'` e em `2026-07-15T15:00Z` com `mes: '2026-01'`. A32 (as duas ocorrências e só o rótulo), `monthName(r.lido_em)`, `monthName(r.hoje)` e `toLocaleDateString` do aparelho: os cinco mortos por asserção. Variantes de `MAI-04`: saudação por `getUTCHours()` do `lido_em`, pela hora do aparelho, data por `toLocaleDateString` do `lido_em`, data pelo dia UTC do `lido_em`, `storeHour` com `timeZone: 'UTC'` — todos mortos (`MovementHero.test.tsx:102-130`, `labels.test.ts`) |
| 2 | Probe fora do CI | ⚠️ registrada, não fechada | `BL-050`, `supabase/CLAUDE.md:447-461`, `apps/mobile-adm/CLAUDE.md:156-161`. O comando escrito roda: exit 0, 23 `ok —`, igual a `probes/01-resumo.saida.txt` (`diff` vazio). A r1 escreveu "25 `ok`"; a saída de referência e esta rodada contam 23 |
| 3 | `MAI-05` ("parado") | ✅ fechada | spec emendada (`spec.md:107-113`) com as duas formas; `QueueTiles.test.tsx:44` (`parado há 9 dias`) e `:54` (`há 2 dias`) |
| 4 | `MAI-31` | ✅ fechada | `MovementHero.test.tsx` `movimentosSemPar`: asserção nos três botões antes e depois da troca e em todo nó do esqueleto, com âncora; o sensor chama a MESMA função e tem inversos (`no-transition-x`, o par certo). No arquivo real: `transition-colors` nos botões e o esqueleto sem par (ou com `motion-reduce:opacity-100`) morrem; o inverso real (`transition-colors motion-reduce:transition-none`) passa |
| 5 | `MAI-10` (milhar exato) | ✅ fechada | spec emendada ("com **até** uma casa"); `WeekChart.test.tsx:24-30` e `labels.test.ts` (1000 ⇒ `1`). `minimumFractionDigits: 1` morto em core e no app |
| 6 | Idade do mais antigo à mão no painel | ⚠️ fechada para a SUBSTITUIÇÃO, aberta para o ACRÉSCIMO | `useAdminOrderList.ts:174-180` lê `queueBlock('aguardando').rule`; `queue.test.ts:240-276` (âncora positiva + régua de vocabulário + sensor com inverso). `.filter('material_status','eq',…)` e `.or(` por concatenação: mortos pelas duas réguas. `.eq(COL, ESTADO)` com constantes concatenadas: morto **só pela âncora** — a régua de vocabulário passou. A regra de `core` **mais** um predicado à mão (`.neq('status','cancelled')`): **sobrevive** (P04, abaixo) |

## Gates (um workspace por vez, exit fora de pipe)

| Medida | Resultado | r1 | Delta |
| --- | --- | --- | --- |
| core `pnpm --filter @estrelinha/core test` | **3826/146**, exit 0 | 3811/146 | +15 (`labels.test.ts`, os casos de "até uma casa" × 4 fusos, e `queue.test.ts`) |
| mobile-adm `… test` | **392/39**, exit 0 | 387/39 | +5 (`MonthCards`, `MovementHero` `MAI-31`, `WeekChart`) |
| store `… test --testTimeout=20000` | **5812/317**, exit 0 | 5812/317 | 0 |
| backoffice `… test --testTimeout=20000` | **3643/207**, exit 0 | 3643/207 | 0 |
| `tsc --noEmit -p apps/{mobile-adm,store,backoffice}/tsconfig.app.json` | **0 · 0 · 0** | 0 · 0 · 0 | — |
| probe `01-resumo.sql` (54442, comando de `supabase/CLAUDE.md`) | exit 0, 23 `ok —`, "nenhum pedido PRB- sobrou: 0" | — | igual à saída de referência |

Nenhuma queda; nenhum caso que mudou de relógio regrediu (a régua de cada um continua discordando do valor
esperado no campo medido).

## Discrimination sensor (r2)

Arnês novo (`scratchpad/v2/sensor2.py`): mutação no arquivo real, contagem de ocorrências conferida (a
mutação que não acha o alvo ou não muda o texto é recusada como inválida), suítes inteiras de core e do
app (o painel pelas pastas `src/entities`, `src/features/order-list`, `src/pages/admin`), restauração byte
a byte com SHA-256 conferido por arquivo. Toda morte foi conferida no log: o arquivo que reprova é o do
assunto. Observação: `App.routing.test.tsx` (`MAF-06`, a splash de 600 ms, da `72`) reprovou por tempo em
quatro execuções sob a carga do sensor, sempre AO LADO do arquivo do assunto; o único caso em que ela
reprovou sozinha foi o inverso M31b, que foi rodado de novo duas vezes e passou.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| A32a | `MonthCards.tsx` | `monthName(new Date().toISOString())` nas duas ocorrências | morto (asserção) |
| A32b | `MonthCards.tsx` | idem, só no rótulo visível | morto (asserção) |
| V01 | `MonthCards.tsx` | mês do `lido_em` | morto (asserção) |
| V02 | `MonthCards.tsx` | mês do `hoje` | morto (asserção) |
| V03 | `MonthCards.tsx` | `toLocaleDateString` do aparelho com fuso de Brasília | morto (asserção) |
| V04 | `MovementHero.tsx` | saudação por `getUTCHours()` do `lido_em` | morto (asserção) |
| V05 | `MovementHero.tsx` | saudação pela hora do aparelho | morto (asserção) |
| V06 | `MovementHero.tsx` | data por `toLocaleDateString` do `lido_em` (fuso do aparelho) | morto (asserção) |
| V07 | `MovementHero.tsx` | data pelo dia UTC do `lido_em` | morto (asserção) |
| V08 | `core/stats/labels.ts` | `storeHour` com `timeZone: 'UTC'` | morto (asserção) |
| P01 | `useAdminOrderList.ts` | idade do mais antigo por `.eq(COL, ESTADO)` com constantes concatenadas | morto (asserção, **só pela âncora**) |
| P02 | `useAdminOrderList.ts` | `.filter('material_status', 'eq', 'aguardando_material')` | morto (asserção) |
| P03 | `useAdminOrderList.ts` | `.or('material_status.eq.' + 'aguardando' + '_material')` | morto (asserção) |
| P04 | `useAdminOrderList.ts` | a regra de `core` **+** `.neq('status', 'cancelled')` | **SOBREVIVEU** |
| P05 | `useAdminOrderList.ts` | a regra de `core` + o mesmo predicado por constante | equivalente (mesmo resultado; é o segundo dono só no texto, e a régua não o vê) |
| N01 | `useRecusaDePapel.ts` | o episódio de recusa nunca acaba | morto (asserção) |
| N02 | `useRecusaDePapel.ts` | `reconferidoPara !== null` (a troca de conta não reabre o episódio) | **SOBREVIVEU** |
| N03 | `useRecusaDePapel.ts` | reconfere sem conta | morto (asserção) |
| N04 | `core/hooks/useStoreOverview.ts` | `ACCESS_DENIED_CODE` `'42501'` → `'42502'` | morto (asserção) |
| N05 | `useStoreOverview.ts` | `retryUnlessDenied` repete duas vezes | morto (asserção) |
| N06 | `useStoreOverview.ts` | `staleTime: 60_000` | morto (asserção, só no app) |
| N07 | `useStoreOverview.ts` | `refetchOnWindowFocus: false` | morto (asserção, só no app) |
| N08 | `useStoreOverview.ts` | `{ error }` não lança | morto (asserção) |
| N09 | `core/hooks/useOrdersRealtime.ts` | `canal.unsubscribe()` no lugar de `removeChannel` | **inválido** — morreu por `TypeError: canal.unsubscribe is not a function` (o dublê não tem o método), não por asserção. A remoção do canal está provada pela A10 da r1 |
| N10 | `useOrdersRealtime.ts` | efeito do canal depende de `onChange` (canal por render) | morto (asserção) |
| N11 | `useOrdersRealtime.ts` | o `ref` não acompanha a seta do render | morto (asserção, só em core; a página passa uma seta estável) |
| N12 | `InicioPage.tsx` | recusa não conta como falha (o bloco vira esqueleto) | morto (asserção) |
| N13 | `InicioPage.tsx` | "Atualizado às" só com as DUAS leituras | equivalente pela spec (`MAI-18` fala da releitura que falha com dado; com uma leitura que nunca carregou, a spec não pede a hora) |
| N14 | `InicioPage.tsx` | "Atualizado às" pelo relógio do aparelho | morto (asserção) |
| N15 | `InicioPage.tsx` | "Não consegui atualizar agora." só pelo movimento | **SOBREVIVEU** |
| N16 | `InicioPage.tsx` | `cancelRefetch: false` no movimento (resposta fora de ordem) | morto (asserção, o caso de `MAI-25`) |
| N17 | `InicioPage.tsx` | reler não invalida o movimento | morto (asserção) |
| N18 | `app/App.tsx` | `key={String(online)}` no provider (remonta sobre o MESMO cliente) | equivalente (o cliente e o cache sobrevivem; a remontagem reassina o `onlineManager`) |
| N19 | `App.tsx` | o ramo offline com um segundo provider próprio | equivalente (o provider de fora continua montado) |
| N20 | `App.tsx` | `criarQueryClient()` a cada render, sem `useState` | **SOBREVIVEU** |
| N21 | `movement-hero/model/numeros.ts` | ticket calculado no cliente (`faturamento / vendas`) | morto (asserção) |
| N22 | `numeros.ts` | ticket `0` com zero vendas vira `R$ 0,00` | morto (asserção) |
| N23 | `numeros.ts` | `-` no lugar de `—` | morto (asserção) |
| N24 | `shared/ui/PullToRefresh.tsx` | `then(fim)` sem o ramo da rejeição | morto (asserção) |
| M31a | `MovementHero.tsx` | `transition-colors` nos períodos, sem par | morto (asserção) |
| M31c | `shared/ui/leitura.tsx` | esqueleto sem `motion-reduce:animate-none` | morto (asserção) |
| M31d | `leitura.tsx` | esqueleto com `motion-reduce:opacity-100` no lugar do par | morto (asserção) |
| M10 | `core/stats/labels.ts` | `minimumFractionDigits: 1` (1000 ⇒ `1,0`) | morto (asserção) |
| M31b | `MovementHero.tsx` | **inverso**: `transition-colors motion-reduce:transition-none` | passou (como deve) |

**Resultado**: 43 mutantes + 1 inverso · **34 mortos (34 por asserção, 0 por compilação)** · **4
sobreviventes** (P04, N02, N15, N20) · 4 equivalentes declarados (P05, N13, N18, N19) · 1 inválido (N09).

## Lacunas novas, ranqueadas

1. **N15 — `MAI-18` só é provado para o movimento.** `InicioPage.tsx:77` calcula o aviso pelas duas
   leituras, e a suíte só falha a RELEITURA de `store_movement` (`InicioPage.test.tsx:170-203`). Com o aviso
   ignorando o resumo, uma releitura do resumo que falha deixa a fila, a semana, o mês e os pedidos velhos
   **sem aviso**, e a suíte fica verde. O cabeçalho do arquivo afirma "cada leitura tem o seu caso de erro",
   o que vale para a primeira leitura e não para a releitura. **Conserto**: o mesmo caso com
   `store_overview` falhando na 2ª chamada (números ficam, `NAO_ATUALIZOU` aparece, hora da leitura boa).
2. **N02 — `MAI-22` na troca de conta.** `useRecusaDePapel.ts:47` reabre o episódio quando a conta muda
   (o comentário diz isso), e nenhum caso troca de conta. Com o mutante, a conta B que é recusada depois da
   conta A nunca reconfere o papel: fica com os blocos "não carregou" em vez da recusa com "Sair".
   **Conserto**: conta A recusada, reconferida; conta B entra (sem leitura boa no meio) e é recusada ⇒ uma
   segunda consulta do papel.
3. **P04 — o guarda do painel prova presença, não exclusividade.** `queue.test.ts:250-253` exige que a
   consulta da idade monte o filtro por `queueBlock('aguardando').rule`, e `:255` recusa o vocabulário da
   fila. Um predicado a mais encadeado ao lado da regra (`.neq('status','cancelled')`) passa as duas, e a
   idade do mais antigo do painel deixa de ser a `aguardando_desde` da Início — o "defeito 01" de volta,
   com core e as suítes de pedidos do painel verdes. A régua de vocabulário também não vê constante
   concatenada (P01 morreu só pela âncora). **Conserto**: medir a cadeia da consulta inteira (entre
   `.select('created_at')` e `.order(`) por igualdade, ou um teste de comportamento do `fetchTiles` com um
   dublê que registra os filtros.
4. **N20 — "volta com o dado de antes" não é medido.** `InicioPage.test.tsx:400` diz no nome que a Início
   volta da rede com o dado de antes, mas espera em laço até o número aparecer, então um `QueryClient` novo
   a cada render do `<App />` (cache perdido na volta, esqueleto antes do número) passa. **Conserto**: na
   volta, conferir o número ANTES de a releitura responder (segurar a 2ª chamada).

Fora do sensor, mantidas da r1: `BL-050` (o probe fora do CI) e as pendências de navegador declaradas pelo
autor (standalone, virada do dia com a tela aberta, 3G, `prefers-reduced-motion`).

## Lições

`L-060` nova (guarda por vocabulário cego a constante, e âncora de presença que não recusa acréscimo — P01,
P04); `L-043` (N15) e `L-057` (N02) ganharam a recorrência da `73`. Escritas à mão em `.specs/LESSONS.md`.

## Conserto r2 (autor do conserto ≠ verificador da r2; não é uma rodada de verificação)

**Data**: 2026-10-22. Só teste, dublê e guarda — **nenhum código de produto mudou** (`InicioPage.tsx`,
`App.tsx`, `useRecusaDePapel.ts`, `useAdminOrderList.ts` e `core/hooks/useOrdersRealtime.ts` com o mesmo
SHA-256 depois de cada mutante). Arnês: mutação no arquivo real, alvo contado (≠ 1 ocorrência é recusado
como inválido), restauração conferida por SHA-256, morte classificada pelo log.

| # | Caso novo / reescrito | Mutante reinjetado | Resultado |
| --- | --- | --- | --- |
| N15 | `InicioPage.test.tsx` › frescor: "a releitura do RESUMO que falha também mantém os números…" — `store_overview` falha na 2ª chamada; fila e últimos pedidos ficam, sem frase de falha; o aviso aparece; "Atualizado às 11h20" (a hora do resumo, a leitura boa mais antiga) | o aviso só pelo movimento | morto (asserção, o caso novo) |
| N02 | `useRecusaDePapel.test.tsx` › "a marca é por CONTA…" — `AuthProvider` real; A recusada (2ª consulta a `user_roles`), A sai (`signOut`), B entra (`signInWithPassword`) e é recusada ⇒ 4ª consulta. O caso abre SEM erro antes, para encerrar um episódio que a marca do módulo traga do caso vizinho | `reconferidoPara === conta` → `!== null` | morto (asserção, `expected 3 to be 4` — no passo da conta B). A primeira escrita morria no passo de A, pelo estado do módulo deixado pelo vizinho: corrigida para morrer pelo motivo certo. O código de produto estava certo |
| P04 | `apps/backoffice/src/entities/order/api/useAdminOrderList.test.ts` (novo) — `renderHook` do hook real sobre um dublê `Proxy` que registra TODA chamada de cada consulta; a cadeia da idade é **igual** a `[select(created_at), or(toPostgrestFilter(queueBlock('aguardando').rule)), order(created_at asc), limit(1)]`, e `oldestWaitingAt` chega à tela | `.neq('status','cancelled')` na cadeia | morto (asserção, `Array(5)` ≠ `Array(4)`). Nenhuma asserção existente do painel tocada |
| N20 | `InicioPage.test.tsx` › a rede cai e volta — a releitura da volta fica SEGURADA; espera-se a Início montar e a 2ª chamada sair (nunca o número); ANTES de ela responder: `R$ 1.077`, o bloco `aguardando` com 3, topo sem `aria-busy` e "Atualizado às 11h30"; depois, 11h50 e as releituras seguem | `criarQueryClient()` a cada render do `<App />` | morto (asserção, `toHaveAccessibleName` do faturamento) |
| N09 | `test/fakeSupabase.ts`: o canal ganhou `unsubscribe` (o supabase-js o oferece em `RealtimeChannel`), registrado por `vi.fn` e tirando o canal de `canaisAbertos()` | `canal.unsubscribe()` no lugar de `removeChannel` | morto (asserção, "trocar de aba FECHA o canal"), sem `is not a function` |

**`MAF-06` (a splash de 600 ms, `App.routing.test.tsx`)**: isolado, 5 execuções, 5 × 11/11 verdes; a
suíte do app, 2 execuções, 2 × 394/39 verdes. Não reprovou nenhuma vez sem a carga do sensor da r2:
**observação de flake de carga** (o arquivo reprova por tempo só com outras suítes e mutantes rodando
ao lado). A asserção não foi tocada.

**Gates** (um workspace por vez, exit fora de pipe; loja e painel com `--testTimeout=20000` sem `--`):
core **3826/146** · mobile-adm **394/39** · store **5812/317** · backoffice **3645/208**, todos exit 0.
`tsc --noEmit` 0 · 0 · 0 (mobile-adm, store, backoffice). ESLint mobile-adm 0/0, backoffice 23/5 (a
primeira escrita do teste novo tinha um `any` e levava a 24/5; trocado por `object`).

---

# Rodada 3

**Data**: 2026-10-22 · **Verificador**: sub-agente independente, novo (não escreveu o código nem os consertos
r1/r2) · **Rodada**: 3 de 3 (a última do laço conserto → reverificação).
**Superfície**: o conserto r2 (`InicioPage.test.tsx` N15/N20, `useRecusaDePapel.test.tsx` N02,
`apps/backoffice/src/entities/order/api/useAdminOrderList.test.ts` P04, `test/fakeSupabase.ts` `unsubscribe`)
e uma amostra nova sobre o que as rodadas 1 e 2 menos exercitaram. Nenhum código nem teste editado.

## Veredito: **FAIL ❌** — os quatro sobreviventes da r2 morreram; a amostra nova achou 10 sobreviventes de comportamento, nenhum defeito de produto

Os consertos da r2 são bons: N15, N02, P04 e N20 morrem, cada um pelo caso novo, **isolado** (`-t`, só aquele
caso) e na suíte inteira, e as variantes que o conserto não tentou morrem também. O FAIL é da amostra nova:
cinco ACs (`MAI-12`, `MAI-13`, `MAI-19`, `MAI-30`, `MAI-18`) têm a borda sem régua. Todas as correções são de
teste ou de fixtura do probe; o código de hoje faz o certo em todos os casos medidos.

## Os quatro da r2 e as variantes

| # | Mutação | Resultado | Onde morreu |
| --- | --- | --- | --- |
| N15 | aviso só pelo movimento | morto (asserção) | `InicioPage.test.tsx:187` (suíte e isolado) |
| N15b | aviso só pelo resumo | morto (asserção) | `InicioPage.test.tsx:170` |
| N15c | `\|\|` → `&&` | morto (asserção) | os dois casos de frescor |
| N15d | aviso sem exigir o dado do resumo (`\|\| resumo.isError`) | **SOBREVIVEU** | — (ver lacuna 5) |
| N02 | `reconferidoPara !== null` | morto (asserção) | `useRecusaDePapel.test.tsx:97`, `expected 3 to be 4`, **no passo da conta B**; isolado também morre, e o original isolado passa (1/1) — morte pela regra, não por sobra do vizinho (`L-053`) |
| N02b | a marca pelo e-mail (`user?.email`) | **equivalente** (o e-mail identifica a conta como o id; nenhum comportamento observável difere) | — |
| N02c | marca zerada só no logout | morto (asserção) | `useRecusaDePapel.test.tsx:149` e `InicioPage.test.tsx` |
| N02d | marca nunca zerada | morto (asserção) | idem |
| P04 | `+ .neq('status','cancelled')` | morto (asserção) | `useAdminOrderList.test.ts:65` (`toEqual` da cadeia) |
| P04b | `.limit(2)` | morto (asserção) | idem |
| P04c | `ascending: false` | morto (asserção) | idem |
| P04d | `.or` com a regra de `a-separar` | morto (asserção) | idem |
| P04e | o MESMO número de chamadas, com a condição extra DENTRO do `.or` (`and(<regra>,status.neq.cancelled)`) | morto (asserção) | idem — o `Proxy` registra o argumento, não só o método |
| N20 | `criarQueryClient()` a cada render | morto (asserção) | `InicioPage.test.tsx:422` (isolado também) |
| N20b | `refetchOnReconnect: false` | **equivalente** — na volta da rede o `<Arvore />` remonta, a Início remonta, e `staleTime: 0` + `refetchOnMount` releem; a régua "RELÊ" é satisfeita pelo outro caminho por construção | — |
| N20c | `gcTime: 0` (o cache some quando a Início desmonta no "sem conexão") | morto (asserção) | idem |
| N20d | `useMemo(criarQueryClient, [online])` | morto (asserção) | idem |
| N20e | `refetchOnMount: false` no resumo (`core`) | morto (asserção, só no app) | idem |
| N09 | `void canal.unsubscribe()` no lugar de `removeChannel` | morto (asserção) | "trocar de aba FECHA o canal" (`expected "spy" to be called 1 times`), sem `is not a function` |

O dublê `Proxy` do painel morre pelo motivo certo: a cadeia é registrada por instância de consulta, `consultas`
é zerada no `beforeEach`, e a âncora `daIdade.length >= 1` impede o laço vazio.

## Amostra nova (25 mutantes)

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| J1 | migration, CTE `joias` | desempate `nome desc` só no recorte (o agregado final segue `nome`) | **SOBREVIVEU** (probe 23/23) |
| J2 | migration | `left join products` → `join` (a órfã some) | morto (probe) |
| J3 | migration | `sum(i.quantity)` → `count(*)` | morto (probe) |
| J4 | migration | nome da órfã por `product_id` | morto (probe) |
| C1 | migration, `primeira` | casa só por e-mail (sem `customer_id`) | **SOBREVIVEU** (probe 23/23) |
| C2 | migration | casa só por `customer_id` | morto (probe) |
| C3 | migration | início do mês em UTC nas clientes novas | morto (probe) |
| C4 | migration | e-mail sem `lower` | morto (probe) |
| R1 | migration | recentes `limit 3` | morto (probe) |
| R2 | migration | vendas sem o corte `paid_at <= p_agora` | morto (probe) |
| G1 | `week-chart/model/barras.ts` | piso de 4 px só no dia ZERO (dia com venda pequena vai a 0 px) | **SOBREVIVEU** |
| G2 | `barras.ts` | `hoje` na primeira posição (o rótulo continua certo) | morto (asserção) |
| G3 | `WeekChart.tsx` | `aria-busy` também na falha (`carregando = !r`) | **SOBREVIVEU** |
| G4 | `WeekChart.tsx` | total sem o dia de hoje | morto (asserção) |
| Q1 | `QueueTiles.tsx` | `aria-busy` também na falha | **SOBREVIVEU** |
| Q2 | `queue-tiles/model/fila.ts` | contagens de a-separar e sem-rastreio trocadas | morto (asserção) |
| Q3 | `QueueTiles.tsx` | idade do mais antigo em todos os blocos | morto (asserção) |
| E1 | `pedidosHref.ts` | `lerDestinoDePedidos`: visão vence bloco (o arquivo promete "bloco vence visão") | **SOBREVIVEU** |
| E2 | `pedidosHref.ts` | bloco com os dois parâmetros | morto (asserção) |
| T1 | `PullToRefresh.tsx` | "topo" com folga: `scrollY > 100` | **SOBREVIVEU** |
| T2 | `PullToRefresh.tsx` | `Math.abs` — puxar para CIMA também relê | **SOBREVIVEU** |
| T3 | `PullToRefresh.tsx` | a falha deixa o indicador preso | morto (asserção) |
| T4 | `PullToRefresh.tsx` | limiar 32 | morto (asserção) |
| S1 | `MovementHero.tsx` | os números carregando SEM esqueleto (só o rótulo) | **SOBREVIVEU** |
| S2 | `MovementHero.tsx` | `aria-busy` também na falha | morto (asserção) |
| S3 | `TopJewels.tsx` | carregando mostra "sem venda" no lugar do esqueleto | morto (asserção) |

**Resultado (r3)**: 45 mutantes (20 da superfície da r2 + 25 novos) + 3 reexecuções isoladas · **33 mortos
(33 por asserção, 0 por compilação)** · **10 sobreviventes** (N15d, J1, C1, G1, G3, Q1, E1, T1, T2, S1) ·
**2 equivalentes** declarados (N02b, N20b) · **0 inválidos**. Toda morte foi conferida no log: o arquivo
que reprova é o do assunto (nenhuma por `App.routing.test.tsx`), e as do probe nomeiam a asserção
(`FALHOU — …`).

Arnês: `scratchpad/v3/sensor3.py` (o de r2 com os grupos `probe`, `bo1` e comandos isolados), mutação no
arquivo real, alvo contado (≠ 1 recusado), restauração byte a byte com SHA-256 conferido por arquivo em
toda execução. Ressalva de método: o hash global da árvore tirado antes/depois mudou porque a lista de
arquivos era escolhida por `-newer` (o `mtime` dos arquivos restaurados mudou); o conteúdo foi conferido
pela asserção de SHA-256 por arquivo do arnês, e o probe sem mutante saiu idêntico à saída de referência.

## Gates (um workspace por vez, exit fora de pipe)

| Medida | Resultado | r2 (conserto) |
| --- | --- | --- |
| core `pnpm --filter @estrelinha/core test` | **3826/146**, exit 0 | 3826/146 |
| mobile-adm `… test` | **394/39**, exit 0 | 394/39 |
| store `… test --testTimeout=20000` | **5812/317**, exit 0 | 5812/317 |
| backoffice `… test --testTimeout=20000` | **3645/208**, exit 0 | 3645/208 |
| `tsc --noEmit -p apps/{mobile-adm,store,backoffice}/tsconfig.app.json` | **0 · 0 · 0** | 0 · 0 · 0 |
| probe `01-resumo.sql` (54442) | exit 0, **23** `ok —`, `diff` vazio contra `01-resumo.saida.txt` | igual |

## Lacunas ranqueadas (com o conserto sugerido)

1. **T1 + T2 — `MAI-19` só é provado longe das bordas do gesto.** `PullToRefresh.test.tsx` mede "fora do
   topo" com `scrollY = 120` e só puxa para BAIXO. Com `scrollY > 100` a página rolada 50 px ainda relê
   puxando; com `Math.abs`, rolar para cima no topo relê. **Conserto**: o caso "fora do topo" com
   `scrollY = 1`; um caso que move o dedo de 200 para 100 (`clientY` diminuindo 100 px) e espera
   `onRefresh` não chamado.
2. **S1 — `MAI-30` ("um esqueleto que ocupa o lugar do número") sem régua no topo.** `MovementHero.test.tsx:146`
   confere `aria-busy` e a ausência de número; apagar o `Traco` dos quatro números passa. **Conserto**: no caso
   de carregamento, cada rótulo (Faturamento, Vendas, Ticket médio, Visitas) tem um irmão `aria-hidden` com
   `animate-pulse`; mesma régua nos outros blocos que hoje só conferem `aria-busy`.
3. **C1 — `MAI-12` "cadastro por `customer_id`" não discriminado.** O probe não tem cadastrada cujo pedido
   traz um e-mail DIFERENTE do da conta, então casar só por e-mail dá o mesmo 2. **Conserto**: no probe,
   uma conta com e-mail `x@` e um pedido de fevereiro com `customer_id` dela e `customer_email` `y@`, mais
   uma compra em março ⇒ ela NÃO conta como nova (o C1 a contaria).
4. **J1 — `MAI-13` "empate por nome" no CORTE do 4º lugar.** O probe tem exatamente quatro produtos acima
   do corte, então a ordem do `order by … limit 4` da CTE não decide quem entra. **Conserto**: um quinto
   produto empatado com o 4º em peças, com nome que vem DEPOIS na ordem alfabética ⇒ ele fica de fora (o J1
   o põe dentro e tira o de nome menor).
5. **N15d — a falha da PRIMEIRA leitura do resumo dispara o aviso de releitura.** `InicioPage.test.tsx:107`
   ("o resumo falha…") não recusa `NAO_ATUALIZOU`; com o mutante a tela diz "Não consegui atualizar agora."
   ao lado de blocos que nunca carregaram. **Conserto**: `expect(screen.queryByText(NAO_ATUALIZOU)).toBeNull()`
   nos dois casos de falha inicial (`:91` e `:107`).
6. **G3 + Q1 — `aria-busy` na falha.** Só o `MovementHero` recusa `aria-busy` com `falhou`; no gráfico e na
   fila o bloco em falha pode se anunciar "ocupado" para sempre. **Conserto**: nos casos "falhou sem dado"
   de `WeekChart`, `QueueTiles`, `MonthCards`, `TopJewels` e `RecentOrders`,
   `expect(região).not.toHaveAttribute('aria-busy')`.
7. **G1 — o piso de 4 px num dia com venda pequena.** A fixtura não tem dia com venda abaixo de ~1/168 do
   maior, então o piso só é provado no zero. ⚠️ spec-precision: `MAI-10` não fala de piso (é do protótipo e
   do design). **Conserto**: um dia de R$ 10 com o maior em R$ 2.650 ⇒ `4px`.
8. **E1 — precedência bloco × visão em `lerDestinoDePedidos`.** O arquivo promete "bloco vence visão" e
   nenhum caso manda os dois. ⚠️ spec-precision (a spec diz só "nunca as duas juntas"; o leitor é da `74`).
   **Conserto**: `lerDestinoDePedidos('?visao=tudo&bloco=aguardando')` ⇒ `{ bloco: 'aguardando' }`.

Mantidas das rodadas anteriores: `BL-050` (o probe fora do CI — as lacunas 3 e 4 só se fecham nele) e as
pendências de navegador declaradas pelo autor.

**Fim do laço**: esta é a 3ª reverificação. Pela regra do `validate.md`, as lacunas acima vão ao usuário em
vez de a uma rodada 4.

## Lições

`L-061` (gesto com limiar: régua nas duas bordas e no sentido contrário — T1, T2), `L-062` (fixtura de probe
em que as duas chaves de agrupamento e o corte do `limit` discordam — C1, J1) e `L-063` (bloco de três estados
precisa de asserção de EXCLUSIVIDADE por estado — S1, G3, Q1, N15d), escritas à mão em `.specs/LESSONS.md`
como candidatas; `L-059` ganhou a evidência da r3.

---

# Fecho da r3

**Data**: 2026-10-22 · **Autor = verificador nesta passada**: a r3 era a última rodada, e o fecho
segue o precedente da `72` (sem rodada 4). As oito lacunas ranqueadas da r3 viraram teste ou fixtura do
probe; **nenhum código de produto mudou** — nenhum caso novo reprovou o código de hoje. `BL-050` (o
probe fora do CI) continua aberta.

## As lacunas, uma a uma

| # | Lacuna | Onde | O quê |
| --- | --- | --- | --- |
| 1 | T1 + T2 (`MAI-19`) | `shared/ui/__tests__/PullToRefresh.test.tsx` | `scrollY = 1` não dispara; o dedo subindo (`clientY` 200 → 100) no topo não chama `onRefresh` |
| 2 | S1 (`MAI-30`) | `widgets/movement-hero/__tests__/MovementHero.test.tsx` | carregando: cada um dos quatro rótulos tem UM irmão `aria-hidden` com `animate-pulse`, e a célula só tem o texto do rótulo |
| 3 | C1 (`MAI-12`) | `probes/01-resumo.sql` | a conta `x73@` com pedido de fevereiro pelo `customer_id` dela e e-mail `y73@` (PRB-X1), e outra compra em março (PRB-X2) ⇒ continua 2 clientes novas. A semana (02/03: 2 vendas, R$ 100) e o mês (5 vendas, R$ 550) foram reescritos com o X2, dentro do `begin … rollback` |
| 4 | J1 (`MAI-13`) | idem | um 5º produto com 2 peças, empatado com o 4º, de nome posterior ("Berloque Afetiva Menina…") ⇒ fica fora da lista de 4 |
| 5 | N15d (`MAI-17`/`18`) | `pages/__tests__/InicioPage.test.tsx` | nos dois casos de falha da primeira leitura, `queryByText('Não consegui atualizar agora.')` é nulo |
| 6 | G3 + Q1 (`MAI-30`) | `WeekChart`, `QueueTiles`, `MonthCards`, `TopJewels`, `RecentOrders` (`__tests__`) | `not.toHaveAttribute('aria-busy')` no caso "falhou sem dado" de cada um |
| 7 | G1 (`MAI-10`) | `widgets/week-chart/__tests__/WeekChart.test.tsx` + `spec.md` | um dia de R$ 10 com o maior em R$ 2.650 ⇒ `4px` (com a âncora de que sem piso daria 0). `MAI-10` emendado: o piso de 4 px vale para o dia zero **e** para a venda pequena |
| 8 | E1 | `entities/order/model/__tests__/pedidosHref.test.ts` + `spec.md` | `?visao=tudo&bloco=aguardando` (e a ordem inversa) ⇒ `{ bloco: 'aguardando' }`. `MAI-07` emendado: com os dois no endereço, o bloco vence |

## Os sobreviventes da r3, reinjetados

Arnês: o `sensor3.py` da r3, copiado sem mudança para `scratchpad/fecho/` (mutação no arquivo real,
alvo contado ≠ 1 recusado, restauração byte a byte com SHA-256 conferido por arquivo). Os do probe foram
injetados na **migration**, que o probe reaplica por `\ir`. Depois da rodada: os SHA-256 da migration,
de `PullToRefresh.tsx` e de `InicioPage.tsx` iguais aos de antes, e o banco local igual (54 pedidos, o
mesmo `md5(prosrc)` de `store_overview`).

| # | Mutação | Resultado | Onde morreu |
| --- | --- | --- | --- |
| T1 | `scrollY > 100` | morto (asserção) | `PullToRefresh` › rolada 1 px |
| T2 | `Math.abs` no gesto | morto (asserção) | `PullToRefresh` › dedo SUBINDO |
| S1 | sem `Traco` no lugar dos números | morto (asserção) | `MovementHero` › cada um dos quatro números tem o esqueleto |
| C1 | `primeira` casando só por e-mail | morto (asserção, probe) | `FALHOU — só c73 e g3 …` (linha 158) |
| J1 | `order by pecas desc, nome desc` só no recorte | morto (asserção, probe) | `FALHOU — a órfã … empate por nome — também no corte do 4º …` (linha 165) |
| N15d | aviso com `\|\| resumo.isError` | morto (asserção) | `InicioPage` › o resumo falha |
| G1 | piso só no dia zero | morto (asserção) | `WeekChart` › um dia de R$ 10 |
| G3 | `aria-busy` na falha (`WeekChart`) | morto (asserção) | `WeekChart` › falhou sem dado |
| Q1 | `aria-busy` na falha (`QueueTiles`) | morto (asserção) | `QueueTiles` › falhou sem dado |
| E1 | visão vence bloco | morto (asserção) | `pedidosHref` › bloco e visão juntos |
| G3j | `aria-busy` na falha (`TopJewels`), variante | morto (asserção) | `TopJewels` › falhou sem dado |
| G3r | idem (`RecentOrders`), variante | morto (asserção) | `RecentOrders` › falhou sem dado |
| G3m | idem (`MonthCards`), variante | **equivalente** — o ramo da falha devolve uma `<section>` própria, sem `aria-busy`, ANTES de `carregando` ser lido; nenhum comportamento observável muda | — |

**Resultado**: os 10 sobreviventes da r3 mortos, todos por asserção (0 por compilação), cada um pelo caso
do assunto e só por ele (1 caso reprovando por execução, ou a asserção nomeada do probe). Das três
variantes, 2 mortas e 1 equivalente declarada. Os equivalentes da r3 (N02b, N20b) continuam declarados.

## Gates (um workspace por vez, exit fora de pipe)

| Medida | Resultado | r3 |
| --- | --- | --- |
| core `pnpm --filter @estrelinha/core test` | **3826/146**, exit 0 | 3826/146 |
| mobile-adm `… test` | **399/39**, exit 0 | 394/39 |
| store `… test --testTimeout=20000` | **5812/317**, exit 0 | 5812/317 |
| backoffice `… test --testTimeout=20000` | **3645/208**, exit 0 | 3645/208 |
| `tsc --noEmit -p apps/{mobile-adm,store,backoffice}/tsconfig.app.json` | **0 · 0 · 0** | 0 · 0 · 0 |
| eslint mobile-adm · backoffice | **0/0 · 23/5** (baseline) | — |
| probe `01-resumo.sql` (54442) | exit 0, **23** `ok —`, nenhum `PRB-` sobrou; `01-resumo.saida.txt` atualizado (4 linhas de texto mudaram, nenhuma asserção a menos) | 23 |
