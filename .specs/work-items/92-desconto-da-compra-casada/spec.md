# 92 · Desconto da compra casada (Compre Junto)

Costura de 2026-11-03. PRD r1.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Critérios de aceite: `prd.md`, ao lado. Convenção de cada repositório: o arquivo de instruções dele.

## Escopo

| UC    | Título | Origem |
| ----- | ------ | ------ |
| UC-01 | A dona dá um desconto a um adicional | caso de uso do PRD |
| UC-02 | A cliente vê o desconto no bloco da página do produto | caso de uso do PRD |
| UC-03 | O desconto na sacola e no checkout | caso de uso do PRD |
| UC-04 | O servidor cobra o que a tela mostrou | caso de uso do PRD |
| UC-05 | O pedido mostra o desconto | caso de uso do PRD |
| UC-06 | O relatório de Adesão mostra o desconto concedido | caso de uso do PRD |

**Achados de eval que este Work Item resolve**

`nada` — o repositório não tem relatório de avaliação local (`.specs/evals/` não existe).

**Anexos consultados**

| Insumo (caminho ou URL) | Tipo | O que se tirou | Alimenta |
| ----------------------- | ---- | -------------- | -------- |
| `.specs/work-items/91-compre-junto/discovery.md` | diagnóstico (md) | O mapa do código de dinheiro antes do WI-01 (`pricing.ts`, `mercado-pago/handlers.ts`, `useCheckoutTotals`, `useCartPromotion`); conferido e superado pelo code lookup deste WI | UC-03, UC-04 |
| `.specs/work-items/91-compre-junto/prd.md` › Fora | PRD (md) | As decisões Q-04 (percentual por adicional sobre o preço da peça), Q-05 (concorre por item com bump e promoção, PIX depois — a parte "concorre com o cupom" foi substituída no gate Q-03 deste WI), Q-06 (presença decidida pelo servidor) | UC-01, UC-03, UC-04 |
| `.specs/work-items/WI-01-compre-junto/{spec,prd,prd-review}.md` | WI implementado | O Compre Junto sem desconto que já existe (`AD-072`); a RNF-04 dele ("os descontos só na sacola"), revisada pelo gate Q-02 | UC-02, UC-03 |
| Claude Design, "Uma Estrelinha - Backoffice", `Produto - Compre Junto.html` | fonte de design | ver Design | UC-01, UC-05, UC-06 |
| Claude Design, "Uma Estrelinha - Loja", `Produto - Compre Junto.html` (WI 91) | fonte de design | referência do que já existia; a proposta com desconto está em `Produto - Compre Junto com desconto.html` | UC-02, UC-03 |

## Fora do escopo

Do `prd.md`, verbatim:
- Preço do conjunto fixo e desconto em valor fixo (Q-04 do WI 91 escolheu o percentual) [pedido]
- O desconto no feed do Google e no JSON-LD [código: `packages/core/CLAUDE.md:120-122`]
- O pedido montado pelo painel (feature 89, e o WI 94): a montagem já tem o desconto combinado, e a proposta segue igual, sem desconto casado [gate: Q-07]
- Percentual por peça dentro de uma lista [gate: P-02]
- Diferenciais para um WI seguinte: (a) desconto maior levando mais adicionais; (b) validade do desconto (de/até); (e) aviso no painel quando uma promoção ativa da peça já é maior que o desconto [gate: Q-11]
- A sacola guardar o percentual do momento em que a peça entrou [gate: Q-10]

Máquina de estados: nada (o WI não cria estado; o pedido segue a máquina de sempre).

## Design

Fontes:
- Claude Design, projeto "Uma Estrelinha - Loja" (`69224d8a-17ae-4b1f-a251-a8105b41edc2`), `Produto - Compre Junto com desconto.html` — da seção "Expectativas de UI/UX" do `prd.md`; o bloco e a sacola.
- Claude Design, mesmo projeto, `Pedido - Desconto do Compre Junto.html` — **desenhado depois do handoff**, pela resposta H-01 ("Desenhar antes no Claude Design as telas da loja (checkout, confirmação, e-mail, pedido recusado) e seguir o padrão no painel e no app"); está em `item.md` › Insumos. Cinco telas no painel do protótipo: Checkout · resumo; Checkout · o valor mudou; Link / Minha conta · o valor mudou; Confirmação · Minha conta; E-mail do pedido.
- Claude Design, projeto "Uma Estrelinha - Backoffice" (`e3957c10-bd49-4f3d-9256-04d72a7d0f41`), `Produto - Compre Junto.html` — do `prd.md` e de `item.md` › Insumos; o campo do desconto na aba Compre junto.

Os dois protótipos da loja foram ajustados depois do handoff ao que o gate decidiu (H-03: um rótulo só, sem a frase do cabeçalho do bloco e sem a frase da sacola sobre promoção e cupom; a linha mista na sacola) e conferidos em navegador a 390 e 1440, sem rolagem horizontal.

### Loja — Bloco Compre Junto (UC-02)
- Cartão na coluna de informação: título "Compre junto", parágrafo "Peças que eu escolhi para acompanhar esta joia. Marque as que quiser levar." (sem a frase "Levando junto, algumas saem com desconto." — H-03).
- Linha de cada adicional: caixa de marcar (alvo 44), foto 64×80, nome (o da lista ou do produto), resumo da escolha, e o preço: sem desconto, o preço; com desconto, o preço da variação escolhida riscado, o preço levando junto (`round(cheio × (100 − pct)) / 100`) e embaixo "{N}% a menos levando junto". Leitor de tela: "de {cheio} por {junto}"; o nome acessível da caixa termina com ", N% a menos levando junto".
- Peças de uma lista (faixa que rola dentro dela): cada cartão com o "de/por"; sem a frase.
- Total, com pelo menos uma peça marcada: "Desconto do Compre Junto" e "− R$ X" acima de "Total do conjunto" (já descontado), "R$ Y no PIX" sobre o total descontado; a nota "O botão de compra leva a joia e as peças marcadas. Cada uma entra na sacola como uma linha própria, e você pode tirar qualquer uma depois." ganha " O desconto vale enquanto a joia estiver no mesmo pedido." quando há desconto.
- Só peças sem desconto marcadas: o total sem a linha do desconto e sem a frase da nota.
- Estados do WI-01 inalterados (carregando 320, falha some, esgotada some, combinação indisponível trava o botão, "Chaveiro" tira as correntes e o desconto delas).
- Barra fixa do celular: o total descontado e "Conjunto · N peças"; no computador, a nota "A joia e 1 peça marcada · R$ X" com o total descontado.

### Loja — Sacola (UC-03)
- Linha da peça com desconto: o valor cheio riscado em cima e o cobrado embaixo, à direita; "Acompanha o {joia} · N% a menos"; com mais unidades que a joia, "1 com desconto, 1 a preço cheio" e o valor = junto × n + cheio × (qtd − n).
- A joia sai da sacola: a peça volta ao preço cheio, "Acompanha" some e aparece "O desconto de N% volta com o {joia} na sacola." (só para a peça que entrou pelo Compre Junto — CA-03.3).
- Rodapé: "Subtotal" (soma dos preços cheios), "Desconto do Compre Junto − R$ X", "Total", "ou R$ Z no PIX · frete calculado no checkout". Sem a frase sobre promoção e cupom (H-03).
- O protótipo aplica o desconto pela marca e guarda o percentual na linha — artifício de protótipo, declarado no próprio arquivo; vale o PRD (presença, CA-03.4; releitura, CA-03.12).

### Loja — Checkout · resumo (UC-03, CA-03.8)
- Item: miniatura 56 com a quantidade, nome, variação, "Acompanha o {joia} · N% a menos", e na linha mista "1 com desconto, 1 a preço cheio"; o valor com "de/por".
- Faixa do cupom "{CÓDIGO} aplicado − R$ X" (o cupom acumula: incide sobre o subtotal já com o Compre Junto).
- Linhas: Subtotal (cheio) · Frete · Desconto do Compre Junto · (Desconto progressivo, se houver) · Cupom {CÓDIGO} · Desconto PIX (N%) · Total. Nota: "O desconto do Compre Junto vale enquanto a joia estiver no mesmo pedido."
- Exemplo do protótipo: 372,00 − 11,65 − 36,04 − 16,22 + 18,90 = 326,99.

### Loja — Checkout · o valor mudou (UC-04, CA-04.3)
- `role="alert"`: título "O valor do seu pedido mudou"; "Desde que você montou a sacola, o desconto do Compre Junto do **{peça}** mudou. Por isso o pagamento não seguiu. Nada foi cobrado."; dois cartões "Antes" (riscado) e "Agora"; "Confirmar com o novo total" (principal) e "Voltar à sacola".

### Loja — Link do pedido / Minha conta · o valor mudou (UC-04, CA-04.3)
- "Pedido #NNNN"; título "O valor deste pedido mudou"; "Depois que este pedido foi feito, o desconto de uma das peças mudou, e o pagamento não pode seguir pelo valor de antes. Nada foi cobrado." e "Fale comigo para combinarmos como seguir com o seu pedido."; "Falar pelo WhatsApp" e "Escrever por e-mail" (o contato vem de `store_settings`, com o portão de `PolicyContact`).

### Loja — Confirmação e Minha conta (UC-05, CA-05.2)
- "Itens do pedido": a linha mista partida em duas (uma com "Acompanha o {joia} · N% a menos" e "de/por", outra a preço cheio), cada uma com "{variação} · N unidade(s)".
- Resumo: Subtotal (cheio) · Frete · Desconto do Compre Junto · Cupom · Desconto PIX · Total, e a conta fecha. Pedido antigo (sem o preço cheio) fica como hoje.

### Loja — E-mail do pedido (UC-05, CA-05.2)
- Tabela: "N× {nome}", a variação, e "Compre Junto · N% a menos" na linha com desconto; o valor com o cheio riscado acima do cobrado.
- Totais: Subtotal · Frete · Desconto do Compre Junto · Cupom · Desconto PIX · Total.

### Painel — aba Compre junto do produto (UC-01)
- O bloco "Desconto ao levar junto", por último em cada adicional; hoje desabilitado, com "10" fixo e a etiqueta "WI 92 · depois"; campo de texto com sufixo "%", nome acessível "Desconto em percentual"; em 1440 o texto à esquerda e o campo numa coluna de 120; abaixo de 1024 empilha.
- **O design não mostra**: o estado vazio, a recusa (1–50, inteiro), a prévia "a corrente sai a R$ X com esta joia" e a faixa "de R$ X a R$ Y", nem o "Na loja" da lateral citando o percentual. Segue o padrão do painel (H-01).
- A ajuda do protótipo diz "Concorre com promoções e cupom pela regra de sempre: vale o menor preço." — **contradiz** CA-03.6 (o cupom acumula); vale o PRD.

### Painel — Adesão (UC-06) e painel do pedido (UC-05)
- O protótipo está no estado do WI-01: sem coluna "desconto concedido" e, no pedido, um preço por item e o cartão Pagamento com Subtotal · Desconto Pix · Frete · Total. **O design não mostra** o que o WI pede; segue o padrão das telas (H-01).

### App do ateliê
- Sem fonte de design; segue o padrão de `BlocoValores`/`BlocoItens` (H-01).

Divergências entre fontes: o protótipo do painel diz que o desconto concorre com o cupom e o da loja (antes do ajuste) também; valeu o PRD (CA-03.6), decidido no gate da descoberta (Q-03) e no handoff (H-03). O rótulo "Desconto por levar junto" do bloco virou "Desconto do Compre Junto" (H-03).

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

- **Instruções** — `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções, Os guardas, Baselines, CI e deploy, Estado conhecido; `packages/core/CLAUDE.md` › Dinheiro, Pureza, Os módulos (`buy-together`, `proposals`), Convenções de tipo; `apps/store/CLAUDE.md` › Página do produto, O bloco Compre Junto, O botão único leva o conjunto, Carrinho/chrome/checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido, O pedido montado; `apps/backoffice/CLAUDE.md` › Molde dos formulários, Pedidos e a fila de material, Compre Junto › Adesão, Compre Junto › a aba do produto; `supabase/CLAUDE.md` › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, mercado-pago, send-notification, checkout, order-proposals; `apps/mobile-adm/CLAUDE.md` › Pedidos, Os guardas do app; `.specs/LESSONS.md` › L-013, L-014, L-015.
- **Recorte** — UC-01..UC-06.

### O que já serve
- O ponto único do total, chamado igual pela loja e pelo servidor: `packages/core/src/payment/pricing.ts:472-502` (`resolveOrderPricing`), em `useCheckoutTotals.ts:163-172`, `useCartPromotion.ts:157-164`, `mercado-pago/handlers.ts:654-662`.
- Entrada opcional com saída idêntica, inclusive na forma: `pricing.ts:37-45`, `:375-391` (`manualDiscount`).
- `AD-015` por item: `pricing.ts:345-351` (`perItemMin`), `:360-366` (`resolveChargedItems`); arredondamento por item `:243-250`, `:141`; PIX depois `:379-382`; cupom sobre o subtotal já com bump `:82-83`, `:435-445`.
- Bump e promoções lidos do banco no servidor: `mercado-pago/handlers.ts:542-559`, `:571-616`; guarda de teto 422 `:668-701`; pedido lido com `select("*")` `:337-338`; preço de catálogo por linha `:428-540`.
- Marca "acompanha" validada pelo servidor: `core/buy-together/marks.ts:35-54`; `checkout/handlers.ts:274-287`; colunas `20261106120000_compre-junto-no-pedido.sql:25-27`.
- Disponibilidade e precedência dos adicionais: `core/buy-together/availability.ts:124-172` (`claimed` em `:152-160`, `hiddenOnVariantIds` `:129-131`, `liberated` `:92-106`).
- "Acompanha" some com o principal: `cartStore.ts:140-148` (`companionsOf`); `CartDrawerRow.tsx:39`.
- PIX do conjunto: `core/buy-together/total.ts:22`; barra fixa lendo o total do bloco: `useBuyAction.ts:12, 106`, `ProductBuyBar.tsx:79, 126`, `ProductInfo.tsx:265-268`.
- Telas do pedido já leem `orders`/`order_items` com `*`: `useAdminOrder.ts:158, 190`; `useOrder.ts:94`; `checkout/handlers.ts:673`.
- Snapshot do pedido: `20261106120000_compre-junto-no-pedido.sql:5-7`.
- A proposta fica fora por construção: `core/proposals/pricing.ts:99-118`; `mercado-pago/handlers.ts:413-426`.
- O relatório soma `unit_price * quantity` das linhas marcadas: `20261107120000_compre-junto-adesao.sql:63-76`.
- Variações da peça no painel: `BuyTogetherTab.tsx:15, 172, 319, 435` (`useProductVariants`).

### O que muda
- `pricing.ts` › `CalculateOrderTotalsInput` `:19-46`, `OrderPricingInput` `:404-407`, `PricingItem` `:5-10`: entrada opcional do desconto casado e `variant_id?` no item; ausente, saída idêntica (RNF-02).
- `pricing.ts` › `resolveChargedItems` `:360-366` (volta cedo em `:362`): o casado nos dois caminhos; a alocação por unidades.
- `pricing.ts` › `priceOnePath` `:428-456` (`promotionDiscount` em `:451`): base = min(bump, casado); `buyTogetherDiscount` à parte (D-06).
- `pricing.ts` › `resolveOrderPricing`/`OrderPricingOutcome` `:409-418, 472-502`: o descartado só quando desconta.
- `pricing.ts` › `applyOrderBump` `:126-144` (`quantity === 1` em `:136`): decide pela linha original.
- `core/buy-together/total.ts` › `bundleTotal` `:13-19`: total e desconto do conjunto (D-04).
- `core/buy-together/availability.ts` › `AddonConfig` `:36-46` (`discountPercent`); a precedência `:152-160` extraída (D-05).
- `core/buy-together/rules.ts:20-62`: constantes 1 e 50 e a recusa `string | null`.
- `core/pricing/index.ts:19-25` e `core/pricing/grid.ts:6`: `import type` de pacote → tipos locais (D-12).
- Loja: `useBuyTogetherData.ts:63-68, 72-109` (select e mapeamento); `useBuyTogether.ts:45-84, 230-290`; `AddonRow.tsx:50, 98`, `BuyTogetherBlock.tsx:39-96`, `AddonPanel.tsx`, `AddonSheet.tsx`, `FormulaStrip.tsx`; `useCartPromotion.ts:139-174`, `CartDrawer.tsx:49, 269-273`, `CartDrawerRow.tsx:39, 91`; `useCheckoutTotals.ts:47-102, 136-243` (e o `outcome` do `catch` `:184-198`); `OrderSummary.tsx:40-44, 153, 183-222, 279-296`; `buildOrderPayload.ts:64-136, 145-188`; `OrderItemsSummary.tsx:6-9, 16-27, 85-106`, `useOrders.ts:15, 157`, `useOrder.ts:14-42`; `useCreatePayment.ts:46` e `features/order-payment` (o 422 novo).
- Functions: `checkout/handlers.ts:207-234` (`COLUNAS_DO_PEDIDO`) e `:245-260` (`COLUNAS_DOS_ITENS`); `mercado-pago/handlers.ts:429-432` (select dos itens), `:474-540`, `:684-701` (guarda), `:716-727`, `:732-744` (gravação — C-01), `:479-486` (pin); `mercado-pago/analytics.ts:52, 98, 123, 208`; `send-notification/handlers.ts:269`, `dispatch.ts:166`, `render/layout.ts:155-256, 350-371`, `render/sample.ts:41-42`.
- Painel: `addons.ts:15-29, 35-43, 139-155, 158-173`; `persistAddons.ts:42-66`; `useProductForm.ts:222`; `BuyTogetherTab.tsx`; `useBuyTogetherLists.ts:16` (só `base_price`); `AdminOrderPage.tsx:569-571, 728-740`; `features/buy-together-adoption`.
- App do ateliê: `apps/mobile-adm/src/entities/order/model/linha.ts:21-32, 69-106`; `BlocoValores.tsx:42-48`; `BlocoItens.tsx:55`.
- Banco: `order_list` (`20261028120000_82-envelope-da-cliente.sql:82-104`) recriada com as colunas novas no fim; `buy_together_adoption` (`20261107120000_compre-junto-adesao.sql:63-178`) recriada.
- Tipos: `packages/supabase/src/types/buyTogether.ts:21-32`; `packages/supabase/src/types/index.ts:509`.

### O que nasce
- A regra do desconto casado em `packages/core/src/buy-together/` (folha nova, imports relativos com `.ts`): percentual por par (principal, peça), o maior entre joias, a precedência dentro da joia, a alocação por unidades (maior percentual primeiro, linha de maior preço primeiro, desempate pela ordem da linha), o par recíproco pela marca validada (senão a de menor preço cheio), a variação escondida e a não liberada.
- A regra única do resumo do pedido em `packages/core/src/orders/` (folha alcançável pelo Deno): Subtotal pela soma dos preços cheios, uma linha por desconto, Total = `orders.total`, recuo para pedido antigo.
- Migration nova (aditiva, só local): `product_buy_together.discount_percent integer null check (discount_percent is null or discount_percent between 1 and 50)`; `orders.buy_together_discount` e `orders.order_bump_discount` `numeric(10,2) not null default 0 check (>= 0)`; `order_items.full_unit_price numeric(10,2) null check (>= 0)`; `order_list` e `buy_together_adoption` recriadas.
- O hook da configuração dos adicionais pelos principais da sacola, em `apps/store/src/entities/*` (abaixo de `widgets` e `features`).
- A guarda de schema da migration nova; a guarda irmã de `chavesDoItemDoPedido` (D-10); o caminho "o valor deste pedido mudou" na loja; o campo e a prévia no painel; o probe de integração em `.specs/work-items/92-desconto-da-compra-casada/probes/`; o `AD-073` em `.specs/STATE.md`.

### Exemplares
| Tipo de mudança | Siga a forma de |
| --- | --- |
| Entrada opcional com saída idêntica | `pricing.ts` › `manualDiscount` (`:37-45`, `:375-391`) |
| Regra pura alcançável pelo Deno | `core/buy-together/marks.ts`, `rules.ts` |
| Recusa com teto em constante | `rules.ts` › `listNameRefusal` / `addonCountRefusal` |
| Servidor lendo configuração e decidindo em TS | `mercado-pago/handlers.ts:542-616` |
| Guarda de teto 422 | `mercado-pago/handlers.ts:668-701` |
| Coluna aditiva e nula | `20261106120000_compre-junto-no-pedido.sql:25-33` |
| `check` de intervalo em `product_buy_together` | `20261105120000_compre-junto.sql:66` |
| Coluna de desconto no pedido | `20260803130100_promotion-eligibility-and-order-columns.sql:92-101` |
| Recriar `order_list` | `20261028120000_82-envelope-da-cliente.sql:82-104` |
| Recriar RPC com a guarda lendo a vigente | `compreJuntoAdesaoSchema.test.ts:94-101`; `pagamentoMarcaPagoSchema.test.ts` |
| Guarda de chaves por igualdade | `chavesDoItemDoPedido.test.ts` |
| Rascunho, diff e gravação do adicional | `addons.ts` (`addonsChanged`), `persistAddons.ts` |
| Prévia de preço no painel | `features/promotion-form/ui/PromotionShowcaseCard.tsx` |
| Teste de página real | `AdminProductFormPage.compreJunto.test.tsx`; `apps/store/src/pages/__tests__/ProductPageBuyTogether.test.tsx` |
| Resumo de valores do app | `BlocoValores.tsx` (`Linha` com `data-parte`) |

### Obrigações transversais
- "Defeito 01": a regra do desconto, a precedência e a composição do resumo com um dono em `packages/core`, chamados pela loja e pelo servidor.
- Coluna derivável é segundo dono: `orders.buy_together_discount` é o **teto exibido** (D-03), não derivável na criação — mantido de propósito, com o significado escrito na migration.
- Alcance pelo Deno (RNF-03): todo especificador relativo com `.ts`, `import type` incluso; nunca escrever a forma proibida por extenso num comentário.
- `payment/**` muda por declaração, com RNF-02 provada por valor e o `AD-073` emendando o `AD-015`.
- `strictNullChecks: false`: vereditos `string | null`.
- `AD-012`: gravação provada por probe HTTP no banco local.
- Payload de gravação em igualdade exata (painel e loja).
- Migration só local (`AD-017`); push com migration nova pede pergunta.
- `order_list` só aceita coluna no fim.
- Ordem de publicação: migration → functions → bundles.
- `index.ts` só faz wiring (`AD-004`).
- Mobile primeiro, 390×844; `TAP_44`/`TAP_ROW`; sem rolagem horizontal.
- Tom memorial (RNF-06); D-09 amplia o guarda.
- Nenhuma regra no app do ateliê; o total é `orders.total`.
- Movimento com par `motion-reduce:` nos arquivos em escopo dos guardas.
- Baselines: "sem regressão"; `tsc` por `tsconfig.app.json`; um workspace por vez com `--testTimeout=20000`.

### Testes
- **Unidade (`core`)**: RNF-02 por objeto inteiro; 10% sobre a variação com PIX depois; quantidade (1 joia × 2 correntes; duas joias somam; maior percentual primeiro; linha de maior preço primeiro); promoção maior vence sem somar; bump vence; cupom acumula e o descartado só é nomeado quando desconta; duas joias com percentuais diferentes; precedência dentro da joia; par recíproco com e sem marca; variação escondida e não liberada; atribuição em `buyTogetherDiscount`; CA-02.4 (bloco = sacola sem promoção nem cupom); `displayedEqualsCharged` estendido; o resumo fecha e o pedido antigo cai no formato de antes; a recusa (0, 51, 10,5).
- **Functions**: o pagamento ignora `unit_price` e marca forjados; recusa quando o desconto piorou e segue quando ficou igual ou mais barato; grava o cobrado e o cheio por linha e os descontos no pedido; o pin cobrado pelo preço cheio numa segunda tentativa; a criação guarda as colunas novas; o e-mail com "de/por" e uma linha por desconto; o `purchase` com o cobrado e o desconto casado.
- **Loja e painel (componente e página real)**: o bloco com "de/por", a frase, a linha do desconto e a nota; a barra fixa; a gaveta e o checkout com a linha mista e a frase da volta; tirar a joia; a peça pelo catálogo; o percentual relido; a confirmação; o painel recusa e grava, a prévia e a faixa; o pedido no painel e no app; a Adesão.
- **Integração (Supabase local)**: o `check` da coluna (probe SQL em transação desfeita); a gravação do painel por HTTP (extensão de `WI-01-compre-junto/probes/03-adicionais-no-produto.sh`); a criação do pedido com as colunas novas; o `create-payment` contra o runtime local depois de D-12 (mesmo total, 422 quando o percentual cai); a RPC recriada (`05-adesao.sh` com fixtura de desconto); `order_list` e as chaves exatas do app (`.specs/features/74-mobile-adm-pedidos/probes/02-lista.ts`); a prévia do e-mail.
- **Navegador**: 390×844 e 1440, sem rolagem horizontal, no bloco, na gaveta, no checkout, na confirmação, no painel e no app.
- **Guardas que vão reprovar, e por quê**: `chavesDoItemDoPedido.test.ts:82, 92-95` (coluna nova do item); `checkout/__tests__/createOrder.test.ts:1225-1238` (o select do `create-payment` e o `not.toMatch(/accompanies/)` — inverter com sensor, D-11); `core/buy-together/__tests__/purity.test.ts:58, 60` (lista e contagem de arquivos); `compreJuntoAdesaoSchema.test.ts:28` (caminho fixo — ler a vigente, D-07); `tomDoCompreJunto.test.ts:13-24, 31` (escopo e régua, D-09); os testes do `create-payment` que asserem o `update` com o preço de catálogo (C-01); `persistAddons.test.ts` e `AdminProductFormPage.compreJunto.test.tsx` (payload exato); `pricing.test.ts`, `orderBump.test.ts`, `progressive.test.ts` só se a RNF-02 quebrar.

### Depende / Expõe
| Direção | Dado | Formato | Momento | Artefato |
|---|---|---|---|---|
| expõe | percentual do adicional | `product_buy_together.discount_percent integer null` (1–50) | leitura pública por embed | migration nova; policy de leitura `20261105120000_compre-junto.sql:132-135` |
| depende | percentual gravado pelo painel | `upsert`/`insert` com `discount_percent` | Salvar do produto | `persistAddons.ts:58-66` |
| expõe | colunas do pedido criado (casado, bump) | `numeric(10,2)` no corpo de `create-order` | `checkout?action=create-order` | `checkout/handlers.ts:207-234` |
| expõe | preço cheio da linha | `full_unit_price numeric(10,2)` | `create-order` | `checkout/handlers.ts:245-260` |
| depende | marca validada | `accompanies_product_ids text[]` | lida pelo `create-payment` | `checkout/handlers.ts:274-287` |
| expõe | recusa por desconto que piorou | 422 com código novo | `mercado-pago?action=create-payment` | `mercado-pago/handlers.ts:684-701` |
| expõe | pedido com descontos e preço cheio | colunas de `orders`/`order_items` | depois do `create-payment` | `mercado-pago/handlers.ts:716-744` |
| expõe | colunas novas para o app | `order_list` com as colunas no fim | detalhe no app | migration nova |
| expõe | desconto concedido | chave nova no `jsonb` da RPC | `rpc('buy_together_adoption')` | migration nova |
| depende | colunas do pedido no e-mail | select explícito | motor de notificação | `send-notification/handlers.ts:269`, `dispatch.ts:166` |

## Fronteira entre repositórios

`nada` — Topologia de repositório único (monorepo). O contrato entre as unidades que sobem separadas está em **Depende / Expõe**, acima, e a ordem de publicação é migration → functions → bundles.

## Cobertura dos UCs

| UC | Reivindicado por |
|---|---|
| UC-01 | monorepo (`core/buy-together`, migration, painel) |
| UC-02 | monorepo (`core/buy-together`, loja) |
| UC-03 | monorepo (`core/payment`, `core/buy-together`, loja) |
| UC-04 | monorepo (`core/payment`, functions `checkout` e `mercado-pago`, loja) |
| UC-05 | monorepo (`core/orders`, migration, functions, loja, e-mail, painel, app do ateliê) |
| UC-06 | monorepo (migration da RPC, painel) |

## Decisões

| # | A pergunta | A resposta | Quem decidiu |
|---|---|---|---|
| D-01 | O resumo do pedido conta o desconto duas vezes; o desconto do bump não é gravado | "Decisão: cada linha guarda o preço cheio e o cobrado; o pedido guarda cada desconto por item (Compre Junto, promoção, oferta do checkout)." `prd.md` CA-05.1 e CA-05.2 trocados | o humano no gate do PRD Tech Review (`resumo-do-pedido-nao-fecha-com-linha-liquida` · `tech_prd_edit` · r1, ratificado pela recomendação a pedido) |
| D-02 | "Até a quantidade da joia" numa linha única | "Decisão: no cálculo e no pedido a linha da peça se parte em duas (com desconto / a preço cheio); o order bump continua decidindo pela linha da sacola." CA-03.2 trocado | idem (`desconto-ate-a-quantidade-na-linha-unica` · `tech_prd_edit` · r1) |
| D-03 | A guarda do teto comparada desconto a desconto | "Decisão: a guarda compara a soma dos descontos por item exibidos (Compre Junto, promoção, oferta do checkout) com a recalculada." CA-04.3 trocado | idem (`teto-por-componente-recusa-pedido-mais-barato` · `tech_prd_edit` · r1) |
| D-04 | Total do bloco × sacola com promoção ou cupom | "Decisão: o bloco calcula só a joia e as peças com o desconto casado; promoção e cupom ficam na sacola." CA-02.4 trocado | idem (`total-do-bloco-diverge-com-promocao-ou-cupom` · `tech_prd_edit` · r1) |
| D-05 | O percentual dentro da mesma joia | "Decisão: a regra que escolhe o percentual dentro de uma joia é a que escolhe o que a página mostra." CA-03.9 trocado | idem (`percentual-dentro-da-mesma-joia` · `tech_prd_edit` · r1) |
| D-06 | Como o casado se compõe com promoção e cupom | "Decisão: a base dos dois caminhos é o item com o menor entre a oferta do checkout e o desconto casado; a promoção é medida sobre essa base e só conta se vencer algum item; AD novo emenda o AD-015." CA-03.6 trocado. O AD é o `AD-073` (o próximo livre no worktree; conferir no merge com os WIs 93 e 94) | idem (`atribuicao-do-desconto-em-priceonepath` · `tech_prd_edit` · r1) |
| D-07 | "Desconto concedido" sem dado; o guarda lê a migration pelo nome | "O preço cheio na linha (F1) alimenta a coluna; o guarda passa a ler a migration vigente da função (molde de store_movement); o probe da adesão ganha fixtura com desconto" | idem (`desconto-concedido-sem-dado-por-linha` · `tech` · r1) |
| D-08 | Os outros leitores de `unit_price` | "O GA4 e a etiqueta passam a ler o preço cobrado; o pin personalizado continua lendo o preço cheio da linha; pedido antigo fica como está" | idem (`outros-leitores-de-unit-price` · `tech` · r1) |
| D-09 | O guarda de tom não alcança as telas novas | "Ampliar o escopo do guarda aos arquivos das frases novas, com âncora que nomeie um de cada ponta, e acrescentar 'economiz' à régua". `ProductInfo.tsx` (o "Economize" do `compare_price`, anterior a este WI) fica fora do escopo, declarado | idem (`guarda-de-tom-nao-alcanca-as-telas-novas` · `tech` · r1) + a conferência |
| D-10 | A coluna do teto descartada em silêncio | "Estender o cruzamento por igualdade às chaves do pedido (guarda irmão de chavesDoItemDoPedido) e pôr a coluna nova nas duas pontas" | idem (`coluna-nova-descartada-em-silencio` · `tech` · r1) |
| D-11 | Par recíproco | "CA-03.10 No par recíproco vale o desconto da peça levada pelo bloco (a que tem a marca 'acompanha')". Complemento técnico: o servidor só usa a marca que ele validou (`checkout/handlers.ts:270-287`); sem marca válida em nenhuma, vale a de menor preço cheio da unidade. A asserção `not.toMatch(/accompanies/)` de `createOrder.test.ts:1231-1237` é invertida com sensor | o humano no gate do PRD Tech Review (`reciproco-menor-preco-contradiz-o-bloco` · `negocio` · r1) + a conferência |
| D-12 | O `mercado-pago` não sobe no local | "Trocar o import type de pacote em core/pricing por tipo local, para o mercado-pago subir no local" | o humano no gate do PRD Tech Review (`create-payment-nao-sobe-local` · `tech` · r1) |
| D-13 | O pedido recusado pelo teto | "CA-04.3 (complemento) Recusado o pagamento, no checkout a cliente vê o total novo e confirma a compra outra vez; pelo link do pedido ou por Minha conta, a página diz que o valor deste pedido mudou e mostra o contato da loja." A mensagem atual "Recarregue a sacola para ver o novo total" (`mercado-pago/handlers.ts:696`) sai; código de 422 próprio, reconhecido pela loja | o humano no gate do PRD Tech Review (`pedido-recusado-pelo-teto-sem-saida` · `negocio` · r1) |
| D-14 | Telas sem protótipo | "Desenhar antes no Claude Design as telas da loja (checkout, confirmação, e-mail, pedido recusado) e seguir o padrão no painel e no app" — desenhadas em `Pedido - Desconto do Compre Junto.html` | o humano no gate principal (H-01) |
| D-15 | "Desconto concedido" na Adesão | "Todo desconto das peças levadas junto (preço cheio − pago), qualquer que seja a origem" — sem coluna de desconto casado por linha; a RPC soma `(full_unit_price − unit_price) * quantity` das linhas marcadas, e linha sem `full_unit_price` (pedido antigo) conta 0 | o humano no gate principal (H-02) |
| D-16 | O texto do desconto | "'Desconto do Compre Junto' em todo lugar; tirar a frase do cabeçalho; tirar a frase da sacola" — CA-02.2 trocado | o humano no gate principal (H-03) |
| D-17 | Onde moram os descontos por item | `orders.buy_together_discount` e `orders.order_bump_discount` (`numeric(10,2) not null default 0`, no molde de `promotion_discount`) e `order_items.full_unit_price` (nulo no pedido antigo e no montado). Quem grava o definitivo é o `create-payment` (recalculado); a loja manda os exibidos na criação, que viram o teto | a conferência |
| D-18 | O bump com a linha partida | O cálculo roda sobre as linhas da sacola; a partição em "com desconto / a preço cheio" acontece depois, na saída. O servidor junta as linhas de `order_items` da mesma peça (`product_id`, `variant_id`, personalização) antes de recalcular, para o bump não valer duas vezes | a conferência |
| D-19 | Desempate entre linhas partidas de mesmo preço | pela ordem das linhas (índice), igual na loja e no servidor | a conferência |
| D-20 | Principal sem grade × `hidden_on_variant_ids` | com `variant_id` nulo do principal, a regra de esconder não se aplica (o adicional vale) — o mesmo que `availability.ts:129-131` faz na página | a conferência |
| D-21 | A precedência da peça tem dono só na página | extraída de `availability.ts:152-160` para uma função pura que `resolveAddons` e a regra do desconto chamam, sem ler estoque | a conferência (obrigação "defeito 01") |
| D-22 | O relatório de promoções muda de número | aceito: `orders.promotion_discount` passa a medir só o que a promoção desconta além do casado e da oferta do checkout (`usePromotions.ts:399-418`); pedido antigo fica como está | a conferência |
| D-23 | O nome da coluna do preço cheio | `full_unit_price` (não `list_price`, que é da proposta montada) | a conferência |
| D-24 | O artigo fixo "o" em "Acompanha o …" | fica como está no WI-01 (é a frase de lá); fora deste WI | a conferência |
| D-25 | O nome e o lugar da função do preço com desconto | `buyTogetherDiscountedPrice(unitPrice, percent)` em `packages/core/src/buy-together/discount.ts` (sem import); percentual nulo devolve o preço; `AddonConfig.discountPercent` é **opcional** (ausente = sem desconto) | a corrida (T01, premissas 1–2) |
| D-26 | A forma de `bundleTotal` | recebe `addons: { price, discountPercent? }[]` e devolve `{ total, discount }`; a sacola recebe o preço CHEIO da peça e recalcula | a corrida (T02, premissas 1–2) |
| D-27 | A regra do desconto na sacola | `allocateBuyTogetherDiscount` em `core/buy-together/cartDiscount.ts`; entrada `buyTogether?` em `resolveOrderPricing`, saída `buyTogetherDiscount?`/`buyTogetherLines?` só quando a entrada veio; `resolveOrderLines` e `joinOrderRows` (`core/payment/orderLines.ts`) dão as linhas do pedido e os descontos por tipo; os tipos locais de `core/pricing` em `pricing/types.ts` | a corrida (T03, premissas 1–3, 13; T04, premissas 1–2) |
| D-28 | CA-03.2 dentro de uma lista | cada unidade de joia dá UMA unidade de desconto por adicional (slot); numa lista com duas peças diferentes, recebe a de maior preço | a corrida (T03, premissa 4) |
| D-29 | Par recíproco com as duas marcadas | recebe a de menor preço cheio da unidade; empate pela ordem na sacola | a corrida (T03, premissa 6) |
| D-30 | O frescor da configuração na sacola | `useCartBuyTogether` com `staleTime: 0` (CA-03.12), lendo as linhas da sacola e os principais citados pelas marcas | a corrida (T03, premissa 8) |
| D-31 | O servidor regrava as linhas do pedido | o `create-payment` atualiza, insere ou apaga linhas de `order_items` para casar com as partes recalculadas; leitura sem ordenação (sem coluna de posição) | a corrida (T04, premissas 3–4) |
| D-32 | Os códigos do 422 do teto | `buy_together_price_changed` quando o casado caiu, `promotion_no_longer_valid` quando foi a promoção ou o bump; todo 422 leva `displayed_total`, `total` e `piece`; a frase da promoção virou "Um desconto deste pedido mudou. Nada foi cobrado." | a corrida (T04, premissas 5–6) |
| D-33 | A leitura da configuração falhando no pagamento | 500 "Não foi possível calcular o pedido. Tente de novo." antes do Mercado Pago | a corrida (T04, premissa 7) |
| D-34 | O 422 do PIX vindo do checkout | a rota do pagamento tira o pedido do rascunho e volta ao `/checkout` com `{ priceChanged }`; "Confirmar com o novo total" cria outro pedido | a corrida (T04, premissa 10) |
| D-35 | O formato do resumo do pedido | `orderSummary` em `core/orders/summary.ts`; formato novo só quando TODAS as linhas têm `full_unit_price` (o pedido montado continua no formato antigo); o bump se chama "Desconto da oferta" | a corrida (T05, premissas 1–4) |
| D-36 | A ordem e o preço no painel do pedido | o painel mostra o preço da unidade com "de/por" e põe os descontos antes do Frete (o recorte de design da tarefa); a loja e o app põem o Frete antes — mesma composição, ordem diferente (observação para a QA) | a corrida (T06, premissas 1–3; T07, premissa 1) |
| D-38 | A ordem do resumo nas três pontas | a ordem do painel do pedido (descontos e PIX antes do Frete) vale; a loja (confirmação, Minha conta, e-mail) e o app passam a segui-la — revisa D-36; a diferença é bug da loja e do app. O preço por item (unidade × total da linha) não muda | Q-01 do plano de QA, resposta C (2026-11-03) |
| D-39 | A faixa das peças da lista | a faixa que rola dentro do bloco, do protótipo, é exigida neste WI — revisa a premissa 7 da T02; a grade de hoje é bug | Q-02 do plano de QA, resposta B (2026-11-03) |
| D-37 | O `discount` do `purchase` (GA4) | soma `buy_together_discount`; o bump continua embutido em `unit_price` e fora do `discount` | a corrida (T04, premissa 9) |

## Não resolvido

- **O número `AD-073`**: livre neste worktree; os WIs 93 e 94 correm em paralelo e podem reivindicar o mesmo. Conferir no merge (precedente do merge da `48` com a `49`).
- **O prefixo da migration**: o timestamp da migration nova deve ser conferido contra as migrations dos WIs paralelos antes do merge (`version` é a chave de `schema_migrations`).
- **Android real e leitor de tela**: fora do que este WI prova; ficam para a QA, como nos WIs anteriores.
