# 35 · Clientes e pedidos da Nuvemshop — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tasks com a Skill `tlc-spec-driven`: **ative-a pelo nome** e siga o fluxo de Execute
e as Critical Rules dela. Não procure arquivos da skill por caminho.

**Se a skill não puder ser ativada, PARE e avise.**

⚠️ **Convenção do projeto que sobrepõe a Skill** (`CLAUDE.md`): **não** criar commit atômico por task.
Aguardar a conclusão e gerar os commits completos de uma vez (`BL-012`).

✅ **Sem bloqueio externo.** Os dois CSV estão em mãos. A leitura de pedidos não faz chamada de rede.

**Spec**: [`spec.md`](spec.md) · **Design**: [`design.md`](design.md) · **Medição**: [`medicao.md`](medicao.md)
**Status**: **Done** — 2026-08-30. Ver [`validation.md`](validation.md).

---

## Test Coverage Matrix

> Diretrizes encontradas: `CLAUDE.md` (raiz), `tools/catalog-import/CLAUDE.md`,
> `packages/core/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `tools/catalog-import/vitest.config.ts`.
> Amostradas: `map/__tests__/product.test.ts`, `map/__tests__/variant.test.ts`,
> `write/__tests__/products.test.ts`, `write/__tests__/db.test.ts`,
> `nuvemshop/__tests__/apiShape.test.ts`, `shared/lib/__tests__/materialTransitions.test.ts`,
> `features/order-list/model/__tests__/orderList.test.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Parser de CSV (`csv/**`) | unit | Toda armadilha medida tem caso: Latin-1, aspas escapadas, `="…"`, linha de continuação, `dd/mm/yyyy` | `tools/catalog-import/src/csv/__tests__/*.test.ts` | `pnpm --filter @estrelinha/catalog-import test` |
| Regra pura (`map/**`) | unit | 1:1 com as ACs; **toda** tripla observada + as não observadas do vocabulário; **sensor obrigatório** | `tools/catalog-import/src/map/__tests__/*.test.ts` | idem |
| Escrita (`write/**`) | unit com `DbLike` falso | Insert, update, preservação de operacional, itens imutáveis, `selectAll` paginado | `tools/catalog-import/src/write/__tests__/*.test.ts` | idem |
| Orquestração (`run`/`report`/`cli`) | unit | Balance fecha; abort dá relatório parcial; `--stop-after`; piso de casamento reprova | `tools/catalog-import/src/__tests__/*.test.ts` | idem |
| Migration SQL | guarda que **lê o `.sql` do disco** | Vocabulário, `security definer`, ordem de drop/recreate das três views, sem `grant` a `anon`; **âncora de contagem** | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Guarda de proveniência | varredura de fonte | Nenhum arquivo de `apps/**` lê `nuvemshop_*_status`; **âncora dupla** | `apps/backoffice/src/shared/lib/__tests__/provenanceNotRead.test.ts` | `pnpm --filter @estrelinha/backoffice test` |
| Prova contra o banco (`AD-012`) | probe SQL | Contagens, amostragem, re-execução, adoção por e-mail, taxa de casamento | — (em `validation.md`) | `docker exec … psql` |
| Prova em navegador real | manual, 390×844 **e** 1440 | `AD-024`; sem scroll horizontal no body | — (em `validation.md`) | `pnpm dev:backoffice` |

**Por que probe e navegador são linhas da matriz:** build não faz typecheck, jsdom devolve 0 para
toda medida de layout, e `AD-012` exige provar que grava contra o banco. A `34` achou **três**
defeitos só em navegador real.

## Gate Check Commands

| Gate | Quando | Comando |
| --- | --- | --- |
| Quick | Task com teste unitário só | `pnpm --filter @estrelinha/catalog-import test` |
| Full | Task que mexe em migration ou em `apps/**` | os três workspaces, **um de cada vez** |
| Build | Fim de fase | `npx tsc --noEmit -p tools/catalog-import/tsconfig.json` · `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` · `pnpm lint` · `pnpm build` |

⚠️ **Um workspace por vez** — duas suítes concorrentes produzem timeout de 5s em testes que varrem
disco (medido na `34`). E **`pnpm test | tail` esconde a falha**: o exit code que sai do pipe é o do
`tail`.

---

## Execution Plan

### Fase 1 — Ler o arquivo
```
T01
```
### Fase 2 — O destino
```
T02 → T03
```
### Fase 3 — A regra pura
```
T04 → T05 → T06
```
### Fase 4 — A escrita
```
T07 → T08
```
### Fase 5 — A prova
```
T09 → T10
```

**Empacotamento** (~7 tasks/worker, fases inteiras): `[F1+F2+F3]` = 6 · `[F4+F5]` = 4 → **2
workers**. Nenhuma fase partida.

---

## Task Breakdown

### T01: O parser, o agrupador e o recorte

**What**: Ler os dois CSV corretamente e entregar 35 pedidos com seus 59 itens.
**Where**: `tools/catalog-import/src/csv/parse.ts`, `csv/recorte.ts`, `csv/types.ts`,
`src/__fixtures__/vendas.csv`, `src/__fixtures__/clientes.csv` + testes
**Depends on**: None
**Requirement**: ESP-01, ESP-02, ESP-07, ESP-30

**Done when**:
- [x] Decodifica **Latin-1**; teste assere que `Não está embalado` chega íntegro, que a leitura como UTF-8 o quebra, e que um arquivo UTF-8 falha ALTO na conferência de cabeçalho (sem corte de BOM: em Latin-1 ele é código morto)
- [x] Confere o cabeçalho: **60 colunas**, primeira `Número do Pedido`; coluna ausente **falha**
      nomeando qual
- [x] Agrupa **243 linhas em 70 pedidos**; `Número do Pedido` sem linha-cabeça **aborta**
- [x] `unescapeSpreadsheet`: `="AD779152389BR"` → `AD779152389BR`, `=""` → `null`
- [x] `parseBrDate` cobre `dd/mm/yyyy hh:mm:ss` **e** `dd/mm/yyyy`
- [x] Recorte `>= 135` deixa **35** pedidos; teste assere que **`#170` entraria** (a faixa não tem
      teto) e que `#134` não
- [x] **Fixture SINTÉTICA**: reproduz a *forma* (continuação, parênteses aninhados, `="…"`, caixa
      alta no e-mail, os 5 arranjos de status) com dados inventados. Um teste assere que **nenhum
      CPF nem e-mail do arquivo real** aparece em `src/__fixtures__/`
- [x] Âncora de contagem em toda varredura

**Tests**: unit · **Gate**: quick

---

### T02: Migration 35 — proveniência, contato, idempotência

**What**: Blocos 1 e 2 do design.
**Where**: `supabase/migrations/20260830120000_35-clientes-e-pedidos-nuvemshop.sql`
**Depends on**: None (paralelizável com a Fase 1)
**Requirement**: ESP-16, ESP-24, ESP-26

**Done when**:
- [x] `orders`: `nuvemshop_id bigint` + índice único **simples**; `nuvemshop_status`,
      `nuvemshop_payment_status`, `nuvemshop_shipping_status` (texto **em português, cru**),
      `nuvemshop_synced_at`
- [x] `orders`: `customer_phone text`, `customer_document text`
- [x] `COMMENT ON COLUMN` em cada coluna de proveniência dizendo que **nenhuma tela a lê**
- [x] Nenhum `grant` alcança `anon`
- [x] `supabase db reset` aplica limpo; probe SQL confirma as colunas

**Tests**: guarda de migration (em T03) · **Gate**: full

---

### T03: `customer_directory` v2, trigger de reencontro, guardas

**What**: Blocos 3 e 4 da migration, mais os dois testes que a protegem.
**Where**: a mesma migration + `apps/backoffice/src/shared/lib/__tests__/provenanceNotRead.test.ts` +
`apps/store/src/shared/lib/__tests__/importSchema.test.ts`
**Depends on**: T02
**Requirement**: ESP-16, ESP-22, ESP-23, ESP-25

**Done when**:
- [x] As três views (`customer_directory`, `customer_list`, `customer_stats`) caem e sobem **na
      ordem**, em transação; `security_invoker` preservado onde já existia
- [x] Parte B agrega `phone`/`cpf` do pedido **mais recente** que os tenha
- [x] `has_account` continua `true` só para quem está em `customers` — `AD-023` intacta
- [x] `handle_new_customer`: o `insert` **não muda**; o `update` é aditivo, `where customer_id is
      null`, comparação por `lower()`, `security definer` preservado
- [x] `provenanceNotRead.test.ts` com **âncora dupla** (arquivos lidos **e** ocorrências)
- [x] `importSchema.test.ts` lê o `.sql` e assere vocabulário, ausência de `grant` a `anon`,
      `security definer`, e a ordem de drop/recreate
- [x] **Sensibilidade provada por injeção**: quebrar cada asserção derruba a suíte

**Tests**: unit + guarda de migration · **Gate**: full

---

### T04: O de-para de status, fechado e tipado

**What**: Vocabulários em pt-BR, as duas tabelas, a desambiguação de `Recusado`, o erro.
**Where**: `tools/catalog-import/src/map/orderStatus.ts` + `__tests__/orderStatus.test.ts`
**Depends on**: T01
**Reuses**: `PaymentStatus`/`OrderStatus` de `@estrelinha/supabase/types`
**Requirement**: ESP-09, ESP-10, ESP-11, ESP-12, ESP-13

**Done when**:
- [x] `Record<StatusPagamento, …>` e `Record<StatusEnvio, …>` **totais nos dois lados**
- [x] `Cancelado` vence os outros eixos
- [x] `Recusado` → `expired` com `Vencimento` e sem `Data de pagamento`; → `rejected` caso contrário.
      **Os dois ramos testados**, mesmo `rejected` não ocorrendo no recorte
- [x] Teste varre o produto cartesiano (3 × 3 × 4 = 36) e assere que **nenhuma** entrada produz
      `'separating'`
- [x] As **5 triplas medidas** têm teste nominal com o destino de `medicao.md`
- [x] Valor fora do vocabulário lança `UnknownVocabularyError` nomeando valor e `Número do Pedido`
- [x] **Sensor**: `Status do Envio = 'Teletransportado'` **derruba** a suíte
- [x] Sem import de React, Supabase client ou Node

**Tests**: unit 1:1 + sensor · **Gate**: quick

---

### T05: O snapshot do pedido e os dois cortes de material

**What**: `mapOrder` — linha de `orders`, linhas de `order_items`, material derivado.
**Where**: `tools/catalog-import/src/map/order.ts` + `__tests__/order.test.ts`
**Depends on**: T04
**Reuses**: `initialMaterialStatus` de `@estrelinha/core/material`
**Requirement**: ESP-03..ESP-06, ESP-18, ESP-19, ESP-21, ESP-24

**Done when**:
- [x] `created_at` é a `Data` da origem; dinheiro do snapshot, `total` ao centavo
- [x] `order_number` é `NS-${Número do Pedido}`
- [x] `customer_id` sempre `null`; `customer_email`, `customer_phone`, `customer_document`
      normalizados; `CPF / CNPJ` igual a `-` vira `null`
- [x] `material_status` sai de `initialMaterialStatus` com os **dois cortes** — terminal **e**
      pagamento. Teste dedicado para cada um, e um que assere que sem o corte de pagamento a fila
      seria **8** em vez de **4**
- [x] E-mail ausente vira `sem-email+<id>@importado.invalid` (nenhum caso real; o teste existe assim
      mesmo)
- [x] Pedido sem item é mapeado, com `nao_aplicavel`
- [x] `coupon_code` recebe o texto; `coupon_id` fica `null`

**Tests**: unit 1:1 + edge cases · **Gate**: quick

---

### T06: O casamento com o catálogo, e a recusa de casar errado

**What**: `stripVariant`, o índice e `matchItem`.
**Where**: `tools/catalog-import/src/map/catalogMatch.ts` + `__tests__/catalogMatch.test.ts`
**Depends on**: T05
**Requirement**: ESP-08, ESP-31

**Done when**:
- [x] Ordem fixa: nome exato → nome sem a variação → SKU único
- [x] `stripVariant` é **balanceado**; teste com `(Folheado a ouro (Prata 925))` e com
      `(2 cm, Não, Sem Corrente)`
- [x] **Sensor do recorte ingênuo**: um teste assere que cortar pelo primeiro `(` faz um caso medido
      **deixar de casar** — a régua tem de distinguir as duas implementações
- [x] SKU que aponta para >1 produto vira **órfão**; teste nominal com um dos 61 medidos
- [x] Órfão preserva nome, preço e quantidade; `variant_id = null`;
      `product_id = 'nuvemshop:<nome normalizado>'`
- [x] Normalização remove acento e caixa, mas **não** pontuação — teste que prova

**Tests**: unit 1:1 + sensor · **Gate**: quick

---

### T07: A escrita idempotente

**What**: `writeOrders` — lote, casamento por `nuvemshop_id`, colunas operacionais preservadas,
itens imutáveis, histórico e notas.
**Where**: `tools/catalog-import/src/write/orders.ts` + `__tests__/orders.test.ts`
**Depends on**: T02, T06
**Reuses**: `selectAll`, `unwrap`, `DbLike`
**Requirement**: ESP-15, ESP-20, ESP-26, ESP-27, ESP-28

**Done when**:
- [x] Leitura do estado atual passa por `selectAll` — teste que **prova a paginação**, no molde do
      `db.test.ts`
- [x] `COLUNAS_SNAPSHOT` sempre; `COLUNAS_OPERACIONAIS` só no INSERT
- [x] Teste que **prova a preservação**: pedido local em `shipped` com origem `Não está embalado`
      continua `shipped` após a re-execução
- [x] `--ressincronizar-estado` sobrescreve; teste prova o inverso
- [x] **Itens imutáveis**: pedido existente não tem itens tocados; `--reimportar-itens` apaga e
      regrava o conjunto do pedido
- [x] `order_status_history` só com transições **datadas**: `Data`→`pending`, `Data de
      pagamento`→`paid`, `Data de envío`→`shipped`, `Data e hora do cancelamento`→`cancelled`
- [x] `order_notes` para material inferido
- [x] `dryRun` não grava nada

**Tests**: unit com `DbLike` falso · **Gate**: quick

---

### T08: A fase 4 do `run`, o relatório e o CLI

**What**: Ligar tudo: fase nova, flags, seções do relatório, o piso de casamento.
**Where**: `tools/catalog-import/src/run.ts`, `report.ts`, `cli.ts` + testes
**Depends on**: T07
**Requirement**: ESP-14, ESP-20, ESP-29, ESP-30, ESP-31

**Done when**:
- [x] `StopAfter` ganha `'pedidos'`; a fase roda **depois** das imagens
- [x] Flags: `--vendas=<path>`, `--clientes=<path>`, `--ressincronizar-estado`, `--reimportar-itens`
- [x] Aviso em log antes da fase quando o catálogo local tem 0 produtos
- [x] `Entity` ganha `pedidos` e `itens`; `balance` fecha para os dois
- [x] Relatório ganha: **distribuição observada** (tripla → contagem → destino), `itens órfãos` com
      **taxa**, `fora do recorte`, `totais que não fecham`, `sem telefone`, `fila de material`
      (nominal), `clientes sem pedido` (do CSV de clientes), `clientes derivados`
- [x] Teste assere que a soma da distribuição é **igual** ao número de pedidos lidos
- [x] **Taxa de casamento < 50% falha o gate** com exit ≠ 0
- [x] Abort dá relatório parcial e exit ≠ 0

**Tests**: unit · **Gate**: build

---

### T09: Prova contra o banco (AD-012)

**What**: Rodar de verdade contra o Supabase local e provar por probe.
**Where**: `validation.md`
**Depends on**: T08, **e o catálogo importado antes** (fases 1–3)
**Requirement**: ESP-03, ESP-14, ESP-21..ESP-23, ESP-25..ESP-27, ESP-31

**Done when**:
- [x] `orders` com `nuvemshop_id` não nulo == **35**; `order_items` == **59**
- [x] Três pedidos amostrados conferidos campo a campo contra o CSV
- [x] `customer_directory` ganha **33** pessoas, todas `has_account = false`
- [x] Exatamente **4** em `aguardando_material` — `#163`, `#165`, `#166`, `#169`
- [x] Taxa de casamento medida ≥ 50%, e **100%** nos 4 da fila
- [x] Segunda execução: `criados: 0`, `count(*)` inalterado
- [x] `status` alterado à mão **sobrevive** à terceira execução
- [x] Usuário criado com e-mail histórico: pedidos adotados, `customer_directory` devolve **uma**
      linha para o e-mail
- [x] Convidada importada tem `phone` em `customer_directory`
- [x] Distribuição observada colada no `validation.md`

**Tests**: probe SQL registrado · **Gate**: build

---

### T10: Prova em navegador real, 390 e 1440

**What**: Abrir o painel com o histórico dentro.
**Where**: `validation.md`
**Depends on**: T09
**Requirement**: ESP-17, ESP-20, P6-4

**Done when**:
- [x] `/admin/pedidos` em **390×844**: subtítulo, aba `Precisa de ação` e os quatro tiles
      **concordam entre si** (`AD-024`)
- [x] Nenhum scroll horizontal no `body`; `scrollWidth` conferido
- [x] Um pedido importado abre no detalhe com histórico, itens e endereço
- [x] Um pedido com **item órfão** abre sem quebrar, mostrando nome e preço
- [x] Cobrança por WhatsApp de pedido importado gera `wa.me/<numero>`
- [x] `/admin/clientes` mostra as 33 convidadas com `has_account = false`
- [x] Repetir em **1440**
- [x] Baselines de `CLAUDE.md` atualizadas; tabela de guardas ganha as linhas novas

**Tests**: manual com evidência · **Gate**: build

---

## Check 1 — Granularidade

| Task | Atômica? | Nota |
| --- | --- | --- |
| T01 | ✅ | Uma unidade: a leitura do arquivo |
| T02 | ✅ | Um bloco de schema |
| T03 | ✅ | Views + trigger + seus guardas (indivisíveis: a view não sobe sem as dependentes) |
| T04 | ✅ | Um módulo puro |
| T05 | ✅ | Um módulo puro |
| T06 | ✅ | Um módulo puro |
| T07 | ✅ | Um módulo de escrita |
| T08 | ✅ | A ligação |
| T09 | ✅ | Uma prova |
| T10 | ✅ | Uma prova |

## Check 2 — Diagrama × `Depends on`

| Task | Diagrama | `Depends on` | ✓ |
| --- | --- | --- | --- |
| T01 | início F1 | None | ✅ |
| T02 | início F2 | None | ✅ |
| T03 | T02 → T03 | T02 | ✅ |
| T04 | início F3 | T01 | ✅ |
| T05 | T04 → T05 | T04 | ✅ |
| T06 | T05 → T06 | T05 | ✅ |
| T07 | início F4 | T02, T06 | ✅ |
| T08 | T07 → T08 | T07 | ✅ |
| T09 | início F5 | T08 | ✅ |
| T10 | T09 → T10 | T09 | ✅ |

## Check 3 — Co-locação de teste × matriz

| Task | Camada | Exigido | Na task | ✓ |
| --- | --- | --- | --- | --- |
| T01 | `csv/**` | unit, toda armadilha | unit, toda armadilha | ✅ |
| T02 | Migration | guarda que lê o `.sql` | em T03 (mesma migration, um guarda) | ✅ |
| T03 | Migration + varredura | guarda + âncora dupla | ambos | ✅ |
| T04 | `map/**` | unit 1:1 + sensor | unit 1:1 + sensor | ✅ |
| T05 | `map/**` | unit 1:1 + edge | unit 1:1 + edge | ✅ |
| T06 | `map/**` | unit 1:1 + sensor | unit 1:1 + sensor | ✅ |
| T07 | `write/**` | unit com `DbLike` falso | idem | ✅ |
| T08 | `run`/`report` | unit | unit | ✅ |
| T09 | Prova no banco | probe SQL | probe SQL | ✅ |
| T10 | Navegador | manual 390 + 1440 | manual 390 + 1440 | ✅ |

---

## Ferramentas por task

Nenhuma MCP necessária — os servidores `supabase` e `mercadopago` não estão autorizados nesta sessão,
e nada aqui depende deles: o banco local é alcançado por `docker exec … psql` e a fonte é arquivo.

| Task | Skill |
| --- | --- |
| T01–T09 | `tlc-spec-driven` |
| T10 | `tlc-spec-driven` + `playwright-cli` (390×844 e 1440) |
