# QA Run Report — 2026-10-23 — mobile-adm-inicio-reteste-2

- **Scope:** branch `feat/73-mobile-adm-inicio`, conserto das duas *Decisions for a Human* dos relatórios
  `2026-10-22-mobile-adm-inicio.md` e `2026-10-22-mobile-adm-inicio-reteste.md`, decididas pelo
  orquestrador pelas recomendações do QA: o selo fala com o ateliê
  (`BUG-20261022-situacao-fala-com-a-cliente-no-atelie`) e a linha de Últimos pedidos quebra com a fonte
  grande (`BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima`). Jornadas vizinhas: a Início inteira e
  o canary do voltar do Android.
- **Cadence tier:** sanity (+ reteste)
- **Build:** working tree sobre `e9e68ed0` (sem commit), `pnpm --filter @estrelinha/mobile-adm build` +
  `vite preview --port 4375`; bundle servido `index-9_euSy7b.js` + `index-C9E7HkT-.css`, conferido pela
  rede em contextos novos com o service worker **bloqueado** · **Environment:** http://localhost:4375,
  Supabase local real (API :54441, Postgres :54442), conta de QA `adri.qa@exemplo.invalid`;
  `admin@umaestrelinha.dev` não tocada.
- **Started:** 2026-10-23T03:05Z · **Status:** closed (2026-10-23T03:25Z)

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri no celular | Mobile User | Android 412×915 e 360×800, toque, pt-BR | CH-inicio-numeros-certos-do-dia (selo), CH-voltar-do-android-no-atelie (canary) |
| Equipe com TalkBack | Accessibility-Reliant | Android 360×800 e 412×915, fonte raiz 100/130/175/200 %, pt-BR | CH-inicio-com-leitor-de-tela (reteste) |

## Flows in Scope

- `J-acompanhar-a-loja` (`../journeys/J-acompanhar-a-loja.md`)
- `J-entrar-no-atelie` (canary)

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-inicio-numeros-certos-do-dia | J-acompanhar-a-loja / MAD-inicio-abrir-e-entender-o-dia (selo do ateliê) | Adri no celular | Money | Fixed | BUG-20261022-situacao-fala-com-a-cliente-no-atelie (retest pass) | working tree (sem commit) |
| 2 | CH-inicio-com-leitor-de-tela | J-acompanhar-a-loja / MAD-inicio-com-leitor-de-tela (fonte grande) | Equipe com TalkBack | Feature | Fixed | BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima (retest pass) | working tree (sem commit) |
| 3 | CH-inicio-numeros-certos-do-dia | J-acompanhar-a-loja / Início inteira (período, Precisa de você) | Adri no celular | Money | Pass | | |
| 4 | CH-voltar-do-android-no-atelie | J-entrar-no-atelie / MAD-navegar-pelas-quatro-abas (canary) | Adri no celular | Back-Button | Pass | | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

### Selo do ateliê — Adri no celular

- **Fixturas (Supabase local, restauradas ao fim):** os 4 últimos pedidos eram #0182
  `material_enviado`, #0181 `aguardando_material`, #0180 e #0179 pagos sem material. Para cobrir os
  estados, #0180 → `material_recebido` e #0179 → `payment_status = pending`; numa segunda passada,
  #0180 → `status = shipped` e #0179 → `payment_status = refunded`.
- **Walk:** entrar, abrir a Início, ler "Últimos pedidos", recarregar. Selo por linha, conferido contra o
  banco (leitura independente) e depois do recarregar:

  | Pedido | Banco | Selo (antes) | Selo (agora) | Tom |
  | --- | --- | --- | --- | --- |
  | #0182 | `approved` · `material_enviado` | Aguardando seu material | **Material a caminho** | wait |
  | #0181 | `approved` · `aguardando_material` | Aguardando seu material | **Aguardando material** | wait |
  | #0180 | `approved` · `material_recebido` | Em produção | **Material recebido** | progress |
  | #0179 | `pending` · sem material | Aguardando pagamento | Aguardando pagamento | wait |
  | #0180 | `shipped` | A caminho | **Enviado** | progress |
  | #0179 | `refunded` | Reembolsado | **Estornado** | neutral |

  Nenhum selo com pronome da cliente. `pass`
- **Evidence:** `ultimos-412-100.png`, `ultimos-360-100.png`, `ultimos-360-enviado-estornado.png`
  (em `evidence/2026-10-23-mobile-adm-inicio-reteste-2/`)

### Fonte grande — Equipe com TalkBack (reteste)

- **Walk:** sessão nova em 360 e em 412, fonte raiz a 100, 130, 175 e 200 %, com as fixturas acima
  (inclusive "Aguardando pagamento", a linha que estourava).

  | Fonte | 360: scrollWidth · linha | 412: scrollWidth · linha |
  | --- | --- | --- |
  | 100 % | 360 · lado a lado (protótipo) | 412 · lado a lado (protótipo) |
  | 130 % | 360 · quebra nas 4 | 412 · quebra só nas 2 de selo longo |
  | 175 % | 360 · quebra; selo longo em 2 linhas | 412 · quebra |
  | 200 % | 360 · quebra; selo em 2 linhas | 412 · quebra; selo longo em 2 linhas |

  Em todas as 8 medidas: estouro 0 (selo e coluna dentro da linha), nome × coluna sem sobreposição,
  total × selo sem sobreposição, rótulo nunca cortado, e nenhum número da Início pintado sobre outro.
  Antes: 364 px a 175 % e 416 px a 200 % em 360. `pass`
- **Achado no caminho, consertado na mesma rodada:** com só a linha quebrando, a 165 %+ em 360 a pílula
  sozinha já é mais larga que a linha (252 px de pílula numa linha de 252 a 165 %; 230 numa de 230 a
  200 %), e o `truncate` cortava "Aguardando pag…" — a opção 2 que o relatório tinha recusado por perder
  a situação. O rótulo passou a descer para uma segunda linha dentro da pílula. É uma pílula de duas
  linhas, que a regra do repositório lista como o que quebra primeiro no celular: aqui é escolha, só a
  165 %+ e só em telas estreitas, porque perder a situação é pior.
- **Evidence:** `ultimos-360-{100,130,175,200}.png`, `ultimos-412-{100,130,175,200}.png`,
  `inicio-360-200.png`, `inicio-412-200.png`

### Vizinhas — Adri no celular

- **Walk (412):** a Início inteira com "Boa noite, Adri." e "sexta-feira, 23 de outubro"; Hoje/Ontem
  trocam (`aria-pressed`); "Aguardando material 18" leva a `/pedidos?bloco=aguardando` e o voltar
  devolve a `/`. Canary: Pedidos → Clientes → Descontos e voltar ×3 ⇒ `/clientes`, `/pedidos`, `/`, a
  Início com as 4 linhas e `scrollWidth` 412. Console sem erro. `pass`
- **Evidence:** `canary-voltar-412.png`

## What Was Fixed

### BUG-20261022-situacao-fala-com-a-cliente-no-atelie
- **Fix:** `orderSituation(o, publico = 'cliente')` em `core/orders/situation.ts`, com
  `SITUATION_LABELS_BY_AUDIENCE` — um mapa, um lugar. As palavras do ateliê vêm de vocabulários que já
  tinham dono: `MATERIAL_STATUS_LABELS` (`core/material`) e os rótulos de `status`/`payment_status` do
  painel, que subiram para `core/orders/labels.ts` (o painel reexporta por referência). O app pede
  `'atelie'`; a loja não passa nada e não mudou. O guarda `situacaoComDonoUnico` passou a varrer também
  `apps/mobile-adm/src`, com âncora e sensor.
- **Regression:** `situationAudience.test.ts` (core, 20) e `RecentOrders.test.tsx` (app); 4 mutantes, 4
  mortos por asserção, SHA-256 conferido na restauração.

### BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima
- **Fix:** a linha é `flex-wrap`, o nome tem piso em rem (`min-w-[min(100%,6rem)]`), a coluna do total e
  do selo cede (`ml-auto min-w-0 max-w-full`, sem `shrink-0`), e o rótulo do selo não é mais cortado.
- **Regression:** bloco "a linha quebra com a fonte grande" em `RecentOrders.test.tsx` (tokens exatos +
  sensor); 3 vermelhos antes do conserto, verdes depois; 4 mutantes, 4 mortos por asserção.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Equipe com TalkBack | J-acompanhar-a-loja step 5 | a 175 %+ em 360 cada pedido ocupa quatro linhas (nome, número, total, selo de duas linhas) — a lista fica comprida | dull | aceito: é o preço de não cortar nem rolar para o lado |

## Runtime Errors Observed

- Nenhum.

## Human Verifications Needed

- [ ] As do relatório principal (linha 14): app instalado, voltar ao primeiro plano e TalkBack real,
  agora com a fonte do sistema no máximo — Últimos pedidos em duas linhas por pedido, sem rolar para o
  lado, e o selo lido inteiro ("Material a caminho").

## Decisions for a Human

- Nenhuma nova.
- **Aceita como limitação declarada — o Realtime fica mudo quando o papel cai** (observação 3 do
  relatório principal): sem o papel de admin, a RLS de `orders` não entrega o aviso do Realtime, e a
  Início fica com os números da última leitura boa (com o "Atualizado às" daquela hora) até o próximo
  foco, puxar ou virada do dia, quando a leitura é recusada. É o mesmo limite do painel (`A-06` da
  `48`: revogar o acesso não derruba a sessão ativa), e a revogação é rara. Registrado em
  `apps/mobile-adm/CLAUDE.md`.

## Learnings

- **O conserto pela recomendação não basta quando a peça de dentro também tem largura**: a linha
  quebrar resolveu a rolagem, mas a 165 %+ a pílula sozinha já passava da linha e o `truncate` cortava o
  selo — a opção que o QA tinha recusado voltou pela porta dos fundos. Medir "cortado" (scrollWidth ×
  clientWidth do rótulo) ao lado de "estourou" é o que achou isso.
- Duas passadas de fixtura cobrem os seis selos que mudam de palavra com quatro linhas na tela; o
  `updated_at` foi restaurado com o gatilho desligado só naquela transação.

## Final Status

- **Exit gate** (um workspace por vez, exit code fora de pipe, `--testTimeout=20000` sem `--` na loja e
  no painel): core **3846/147** · mobile-adm **406/39** · store **5815/317** · backoffice **3648/209**,
  todos exit 0. `tsc` mobile-adm 0 · store 0 · backoffice 0. eslint mobile-adm 0/0, backoffice 23/5
  (baseline).
- **Fixturas:** #0179 e #0180 devolvidas a `pending`/`approved`/`nao_aplicavel` com o `updated_at`
  original; contagens conferidas: `orders` 54, `order_status_history` 22, `order_notifications` 11 (as
  mesmas de antes).
- **Issues by user impact:** Friction 2 (os dois verified).
- **Coverage:** os dois bugs retestados em 2 tamanhos × 4 escalas de fonte, os seis selos que mudam de
  palavra, e as jornadas vizinhas; nada skipped. Parity gap: a fonte do sistema é emulada pela fonte
  raiz; TalkBack e app instalado são de aparelho.
- **Verdict:** ready — os dois itens que esperavam decisão foram consertados e retestados.
