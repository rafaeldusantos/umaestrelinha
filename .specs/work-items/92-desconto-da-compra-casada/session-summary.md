# WI 92 · Desconto da compra casada (Compre Junto) — resumo da sessão

2026-11-03 · branch local `feature/92` (worktree `store__feature-92`, base `master` em `4c6e9a16`) · nada foi enviado ao remoto.

## O caminho

1. **Descoberta** (`wi-discovery`) → `discovery.md` e o rascunho de `prd.md`. No meio dela, a pedido do usuário, o desconto foi desenhado no Claude Design ("Uma Estrelinha - Loja", `Produto - Compre Junto com desconto.html`).
2. **Gate da descoberta** (página, 17 itens): 11 perguntas e 6 premissas respondidas. As que mudaram decisões anteriores: **Q-03**, o desconto acumula com o cupom (substitui a parte "concorre com o cupom" da Q-05 do WI 91); **Q-02**, o desconto aparece já no bloco (revisa a RNF-04 do WI-01); **C-01**, a linha do pedido passa a guardar o preço cobrado, também para bump e promoção. A montagem de pedido pelo painel (Q-07) ficou fora.
3. **PRD Tech Review r1**: 18 achados (`changes_requested_blocking`, com 2 bloqueios: o resumo do pedido contava o desconto duas vezes, F1; o desconto por quantidade não cabia numa linha única, F2). A pedido do usuário, 15 foram ratificados pela recomendação e só F4 (o pedido recusado pelo teto) e F7 (o par recíproco) foram à página. Registro em `prd-review.md`, decisões D-01..D-13.
4. **Lookups** (dois de design, um de código) e **handoff principal** (só os 3 itens de negócio, preferência gravada em memória): H-01 desenhar antes as telas da loja (feito: `Pedido - Desconto do Compre Junto.html`, cinco telas); H-02 "desconto concedido" = cheio − pago; H-03 um rótulo só, "Desconto do Compre Junto".
5. **Costura** `spec.md` (D-01..D-24) → **fila** de 8 tarefas, devolvida uma vez por Têmis (4 correções: um dono para a conta do preço com desconto, a paridade bloco = sacola na 04, três arquivos sem dono, as dependências) e aprovada; **auditoria** `wi-task-audit`: "a fila serve com correção", 2 citações mortas corrigidas.
6. **Implementação por ondas** `01 | 02,03 | 04 | 05,08 | 06,07`, uma tarefa por `wi-impl-task` com revisão `wi-impl-review`, commitada pelo orquestrador.
7. **Validation 1**: PASS.

## O que foi feito, por tarefa

| Tarefa | Commit | Repositório / camadas | O que entregou |
| --- | --- | --- | --- |
| T01 | `4450b914` | core · supabase · backoffice (19 arquivos) | migration `20261107130000_compre-junto-desconto.sql` (`product_buy_together.discount_percent`, `check` 1–50); `buyTogetherDiscountedPrice` em `core/buy-together/discount.ts`; constantes e recusa em `rules.ts`; `AddonConfig.discountPercent`; o campo, a recusa e a prévia/faixa na aba Compre junto do painel; `useBuyTogetherLists` com os preços das variações; guarda `compreJuntoDescontoSchema`; probe `01` |
| T02 | `68e528ee` | core · store (11) | `bundleTotal` → `{ total, discount }`; o "de/por" (`AddonPrice.tsx`), a linha "Desconto do Compre Junto", o total e o PIX descontados e a nota no bloco; a barra fixa |
| T03 | `ac505fa8` | core · store (29) | `allocateBuyTogetherDiscount` (`core/buy-together/cartDiscount.ts`) e a entrada/saída opcional em `resolveOrderPricing` (RNF-02 provada por objeto inteiro); a precedência `claimPieces` extraída de `availability.ts`; `core/pricing/types.ts` (D-12); `useCartBuyTogether`, `useCartPromotion`, `useCheckoutTotals`, a gaveta e o `OrderSummary` com a linha mista e a frase da volta |
| T04 | `4422e0bd` | supabase · store · core (38) | migration `20261107140000_compre-junto-desconto-no-pedido.sql` (`orders.buy_together_discount`, `orders.order_bump_discount`, `order_items.full_unit_price`); `resolveOrderLines`/`joinOrderRows`; a `checkout` com as colunas e o guarda `chavesDoPedido`; o `create-payment` recalculando pela configuração e pela marca validada, regravando as linhas, a guarda pela soma dos descontos com o 422 `buy_together_price_changed`, o pin e o GA4; as telas "o valor do seu pedido mudou" (checkout) e "o valor deste pedido mudou" (link e Minha conta); paridade bloco = sacola e `displayedEqualsCharged` estendido; probes `02` e `03` |
| T05 | `165e324b` | core · store · functions (16) | `orderSummary` em `core/orders/summary.ts` (alcançável pelo Deno); `OrderItemsSummary` (confirmação e Minha conta) e o e-mail do pedido com o "de/por", a linha partida e uma linha por desconto |
| T08 | `519bc8e1` | supabase · backoffice · store teste (5) | migration `20261107150000_compre-junto-adesao-desconto.sql` (RPC recriada com `desconto_concedido`); a coluna na tabela e nos cartões da Adesão; o guarda passou a ler a migration vigente; probe `05-adesao` |
| T06 | `c0a43872` | backoffice · store teste (4) | a página do pedido do painel pela regra de `core/orders`; o guarda de tom ampliado às quatro pontas e com "economiz" na régua |
| T07 | `dfca7cfc` | mobile-adm · supabase (11) | migration `20261107160000_compre-junto-desconto-na-lista-de-pedidos.sql` (`order_list` recriada); `BlocoValores`/`BlocoItens` pela regra de `core/orders`; probe `02-lista` da feature 74 |
| — | `4f563e5d` | `.specs/STATE.md`, probe da 74 | complemento da Validation: o `AD-073` (T03) e a nota do probe `02-lista` (T07), que ficaram fora dos commits das tarefas |

Revisões: T02, T06, T07, T08 "serve"; T01, T03, T04, T05 "serve com correção" (corrigidas antes do commit).

## Decisões e premissas

- As decisões dos gates e das conferências estão em `spec.md` › Decisões (D-01..D-24) e as premissas de raio largo da corrida em D-25..D-37. As que mais mudam comportamento:
  - **AD-073** emenda o `AD-015`: o desconto do Compre Junto é por item e empilha com o cupom.
  - CA-03.2 numa lista: uma unidade de desconto por adicional; com duas peças diferentes da mesma lista, recebe a de maior preço (D-28).
  - Par recíproco com as duas marcadas: a de menor preço cheio (D-29).
  - O `create-payment` regrava `order_items` para casar com as partes recalculadas (D-31); leitura da configuração falhando ⇒ 500 antes do Mercado Pago (D-33).
  - O 422 do PIX vindo do checkout volta ao `/checkout` e "Confirmar com o novo total" cria outro pedido (D-34).
  - O resumo novo só quando todas as linhas têm `full_unit_price`; o bump se chama "Desconto da oferta" (D-35).
  - GA4: `discount` soma o casado; o bump segue fora (D-37).

## Desvios do PRD e da costura

- **Ordem das linhas no painel do pedido** (D-36): o painel põe os descontos antes do Frete (o recorte de design da T06); a loja e o app põem o Frete antes. Mesma composição, ordem diferente — CA-05.3 pede "a mesma composição"; observação para a QA.
- **O painel mostra o preço da unidade** com "de/por"; a loja mostra o total da linha.
- **"N unidade(s)"** só no pedido novo; o pedido antigo continua "Qtd: N" (T05, para não mudar pedido antigo).
- **A frase da promoção no 422** mudou para "Um desconto deste pedido mudou. Nada foi cobrado." (D-13 tirou o "Recarregue a sacola").
- **A faixa de rolagem das peças da lista** do protótipo não foi implementada; os cartões continuam na grade de hoje com o "de/por" (T02, premissa 7).
- Pedido antigo no painel e no app passa a ter os rótulos de `core` ("Desconto PIX") e o app deixou de mostrar "Promoção" ao lado do subtotal líquido (o defeito L-014, corrigido de propósito).

## Gates (Validation 1 — `qa-report.md`)

- **Testes**, um workspace por vez, exit 0 os cinco: core 5374/219 · store 6976/371 · backoffice 5115/282 · mobile-adm 2371/149 · functions 1460/40 (21296, 0 falhas).
- **Tipos**: store 0 · store server 0 · mobile-adm 0 · core 11 herdados (os mesmos da baseline) · backoffice 7, **anteriores ao WI** (`ProposalStateBadge.test.tsx`, do commit base `4c6e9a16`, não tocado).
- **Lint**: store 2/2 · backoffice 23/5 · mobile-adm 0/0 — na baseline.
- **Build**: `pnpm build` verde (env local).
- **Integração local**: probes `01` (11 ok), `02` (8 ok), `05-adesao` e `02-lista` passaram nas tarefas; **`03-cobranca-no-runtime` executado na Validation**: 4 ok — o `create-payment` sobe no runtime local, grava o total da tela, dá 422 quando o percentual cai e não cria order no Mercado Pago (runtime servido com valores inválidos para todas as chaves externas e encerrado ao fim).
- **Cobertura**: 38/38 critérios (CA-01.1..CA-06.2 e RNF-01..07).

## Pendências conhecidas

- **QA real-user** (a `wi-qa-validation`): a medida em navegador das telas reais em 390×844 e 1440 (RNF-05) ainda não foi feita — jsdom não mede layout; os protótipos foram medidos.
- **Quatro migrations aplicadas só no banco local** (`20261107130000`..`20261107160000`). Ordem de publicação: migrations → functions (`checkout`, `mercado-pago`, `send-notification`) → bundles. O push para a `master` remota as aplica em produção: pede pergunta explícita ao usuário.
- **No merge**: conferir que `AD-073` e os prefixos de migration `20261107130000`..`160000` não colidem com os WIs 93 e 94, que correm em paralelo.
- **Documentação a atualizar no fecho**: `packages/core/CLAUDE.md` e `supabase/CLAUDE.md` ainda dizem que `mercado-pago` não sobe no runtime local (D-12 resolveu); a tabela de Baselines e a de guardas do `CLAUDE.md` da raiz (guardas novos: `compreJuntoDescontoSchema`, `chavesDoPedido`, `summaryDenoReach`, `blocoIgualSacola`; ampliados: `tomDoCompreJunto`, `compreJuntoAdesaoSchema`, `purity` de `buy-together`).
- **Dívida da `master`, não deste WI**: os 7 erros de tipo de `ProposalStateBadge.test.tsx` (backoffice).
- **O relatório de promoções** (`usePromotions`) passa a medir só o que a promoção desconta além do casado e da oferta (D-22) — o número muda para pedidos novos.
- **O histórico da Adesão** só tem "desconto concedido" para pedidos feitos depois do deploy (linhas sem `full_unit_price` contam 0).
