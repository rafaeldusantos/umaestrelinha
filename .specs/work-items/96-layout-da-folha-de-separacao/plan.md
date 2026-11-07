# 96 · Layout da folha de separação, também em lote

Costura de 2026-11-07. Sem PRD — improvement sem PRD.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Convenção de cada repositório: o arquivo de instruções dele.

## Diagnóstico

A folha de separação é um documento HTML próprio, montado por `buildPickSlipHtml` e aberto numa janela
por `openPickSlips` (`apps/backoffice/src/features/pick-slip/lib/pickSlip.ts:127-168`). Hoje:

- o item não tem foto (`itemHtml`, `pickSlip.ts:63-81`) e a quantidade sai no mesmo corpo de 13px
  (`.qtd`, `pickSlip.ts:145`);
- o nome da cliente e a data dividem o subtítulo cinza de 12px (`pickSlip.ts:86-87`);
- há um bloco "Material esperado" (`pickSlip.ts:97-102`);
- o bloco Entrega só tem o endereço (`pickSlip.ts:104-107`); o serviço de frete mora em
  `orders.shipping_method` ("PAC", "SEDEX", "Retirada no escritório", gravado em
  `apps/store/src/features/checkout/lib/buildOrderPayload.ts:169` e
  `supabase/functions/checkout/handlers.ts:222`), coluna que `DbOrder` não declara
  (`packages/supabase/src/types/index.ts:310-375`);
- **a folha em lote sai quase vazia**: `AdminOrdersPage.tsx:662` e `:863` passam as linhas de
  `order_list`, que não têm itens, endereço, frete nem observação (`ORDER_LIST_SELECT`,
  `entities/order/api/orderQuery.ts:288`). O resultado é "Sem itens carregados" e "—" no endereço.
  Só a página de um pedido (`AdminOrderPage.tsx:354`) passa os dados completos.

Cabe sem PRD: um app (Backoffice), uma regra pequena nova em `core` (o rótulo do frete), nenhuma
migration, nenhum contrato consumido por outro repositório.

**Achados de eval que este Work Item resolve**

nada — o repositório não tem relatório de avaliação local (`.specs/evals/` não existe).

**Anexos consultados**

nada — o usuário não informou insumo nenhum.

## Comportamentos

| #    | O que precisa passar a ser verdade |
| ---- | ---------------------------------- |
| C-01 | Cada item da folha mostra a foto da peça numa moldura fixa; sem foto, a moldura fica vazia, sem imagem quebrada nem texto "undefined". A folha só manda imprimir depois de as fotos carregarem |
| C-02 | O nome da cliente aparece em destaque no cabeçalho, em linha própria, fora do subtítulo cinza |
| C-03 | A data do pedido aparece ao lado do número do pedido (`Pedido #0244 · 07/11/2026`) |
| C-04 | A quantidade de cada item aparece em destaque (corpo maior, negrito) |
| C-05 | O bloco "Material esperado" (estado do material e código do envelope) sai da folha |
| C-06 | O bloco Entrega mostra o tipo de frete escolhido acima do endereço; a retirada sai como "Retirada no escritório"; sem frete gravado, a linha não aparece |
| C-07 | Havendo Recado da cliente (`orders.notes`) ou Observação do admin (`order_admin_notes`), cada um sai na folha do seu pedido, na folha de um pedido e no lote |
| C-08 | A folha gerada pela lista de Pedidos (botão do cabeçalho e barra de lote) lê os dados completos de cada pedido e gera um documento só, uma folha por pedido, com C-01..C-07 em todas. Máximo de 10 pedidos por lote: acima disso, saem os 10 primeiros e a tela avisa quantos ficaram de fora |

## Fora do escopo

- O app do ateliê (`apps/mobile-adm`) e a loja, exceto o rótulo do frete do app passar a delegar ao
  dono novo em `core` (ver P6).
- A curadoria de `material_kinds` (`BL-015`).
- Qualquer mudança de schema ou de RLS.

## Design

Fontes: nenhuma. Pergunta feita no chat em 2026-11-07 ("tem protótipo, ou sigo sem design?"); resposta do
usuário: "pode seguir sem design pois é um item simples".

O layout segue os sete itens do pedido, preto no branco para impressão, como a folha já é
(`pickSlip.test.ts:80-86`). Premissas de desenho, sem decisão de produto:

- **Cabeçalho**: `<h1>` "Pedido #N · dd/mm/aaaa"; abaixo, o nome da cliente em 16–18px, negrito.
- **Item**: linha em grade `quantidade | foto | nome`. Quantidade em ~18px negrito ("2×"); foto em moldura
  de 56px com borda fina; nome, variação e gravação como hoje.
- **Entrega**: primeira linha o frete, em negrito; abaixo, o endereço.
- **Observações**: Recado e Observação nos blocos com borda que já existem.

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store

- **Instruções** — `CLAUDE.md` (raiz, inteiro), `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`;
  `supabase/CLAUDE.md` só para a RLS
- **Recorte** — C-01..C-08
- **O que já serve**
  - documento próprio com quebra por pedido e escape: `pickSlip.ts:49-54`, `:127-149`
  - os blocos de Recado e Observação: `pickSlip.ts:109-121`
  - a regra da foto (snapshot vence, capa do catálogo onde falta): `packages/core/src/orders/itemPhoto.ts:27-32`;
    os ids que podem ir a `in('id', …)`: `itemPhoto.ts:18-19` (`catalogProductIds`)
  - a capa por id, degradando para mapa vazio: `entities/order/api/useAdminOrder.ts:264-276` (`lerProdutos`, não exportada)
  - a rendição pública do Storage: `packages/core/src/media/rendition.ts:156` (`renditionUrl`); o bucket é público
  - a retirada: `packages/core/src/shipping/pickup.ts:16-18` (`PICKUP_SERVICE_ID`, `PICKUP_METHOD_NAME`, `isPickupOrder`)
  - as colunas da observação: `ORDER_ADMIN_NOTE_COLUMNS` (`core/order-actions`), leitura em
    `features/order-admin-note/api/useOrderAdminNote.ts:25-33`
  - RLS de admin em `orders`/`order_items` (`20260414121021_…sql:215-216`) e `order_admin_notes`
    (`20261108120000_95-observacao-do-pedido.sql:50`)
  - o molde de teto do lote: `features/order-list/model/bulkMaterial.ts:29` (`BULK_LIMIT = 50`, aplicado em
    `AdminOrdersPage.tsx:257`); a folha tem teto próprio de **10** (P4)
- **O que muda**
  - `pickSlip.ts`: `PickSlipItem` ganha `image`; `PickSlipOrder` ganha `shipping_method` e
    `shipping_service_id`; `itemHtml` com foto e quantidade em destaque; cabeçalho com data e nome;
    o bloco Material esperado e os imports de `:22` saem; Entrega com o frete; o comentário de
    `:1-19` e o de `admin_note` (`:42-45`, "a folha em lote não") reescritos
  - `openPickSlips` (`pickSlip.ts:157-168`): abrir a janela **no clique** (o `window.open` depois de um
    `await` cai no bloqueio de popup), escrever "Preparando a folha…", preencher quando a leitura voltar,
    e chamar `print()` só depois do `load` das imagens; fechar a janela e avisar se a leitura falhar
  - `DbOrder`: declarar `shipping_method?: string | null` (`AD-012`)
  - `AdminOrdersPage.tsx:662` e `:863` (e `OrderBulkBar.tsx:96`): handler assíncrono que lê os ids pelo
    carregador novo, com estado ocupado
  - `AdminOrderPage.tsx:354`: passa a usar o mesmo carregador para o id dele (P5)
- **O que nasce**
  - `entities/order/api/pickSlipOrders.ts`: lê `orders` por `.in('id', ids)` com colunas nomeadas,
    `order_items` e `order_admin_notes` por `.in('order_id', ids)`, e `products(id, images)` por
    `.in('id', catalogProductIds(itens))`; monta `PickSlipOrder[]` na ordem dos ids, com a foto por
    `itemPhoto` + `renditionUrl`. Falha de `orders`/`order_items` lança (nada impresso);
    falha de `order_admin_notes` degrada para folha sem Observação (P3); falha de `products` degrada
    para foto nenhuma
  - `packages/core/src/orders/delivery.ts`: `shippingMethodLabel(o)` — retirada pelo
    `shipping_service_id` vence; senão o `shipping_method` aparado; vazio devolve `null`
  - `packages/core/src/time`: formatação de data completa (dd/mm/aaaa) no `STORE_TIME_ZONE` (P7)
- **Exemplares**
  - leitura por lote de ids que lança: `entities/order/api/sentEmails.ts:18-35`
  - capa do catálogo: `useAdminOrder.ts:264-276`
  - foto com moldura vazia: `AdminOrderPage.tsx:516-534`
  - rótulo em `core` alcançável pelo Deno: `core/orders/delivery.ts` (`shippingLine`)
  - teste de conteúdo da folha: `features/pick-slip/__tests__/pickSlip.test.ts`
  - teste de página com o client dublado: `pages/admin/AdminOrderPage.observacao.test.tsx`
  - botão ocupado: `ActionButton` (feature `88`)
- **Obrigações transversais**
  - "defeito 01": o rótulo do frete tem dois leitores (app e folha) ⇒ `core`; a foto usa `itemPhoto`
  - `core/orders`: especificador relativo com `.ts`, sem import de pacote (`denoReach`, `purity`)
  - `renditionSingleOwner` (suíte da loja): URL de rendição só por `renditionUrl`
  - `buscaDeProdutoComDonoUnico`: `products` só por id
  - `provenanceNotRead`: não nomear as colunas `nuvemshop_*_status`
  - `fusoComDonoUnico`: o fuso só por `STORE_TIME_ZONE`
  - `PED-08`: falha de leitura nunca imprime "Sem itens" como se o pedido estivesse vazio
  - popup bloqueado avisa; botão com estado ocupado e `aria-busy`
  - preto no branco, sem token do painel no CSS da folha
  - gate: backoffice, core e store (os guardas da loja varrem `apps/**`), um workspace por vez,
    `--testTimeout=20000` sem o `--`; `tsc` do painel e de `core` (11 herdados); lint 23/5
- **Testes** — decisão: **ajustar e criar**
  - ajustar `pickSlip.test.ts`: inverter `:56-59` (a folha não tem Material esperado nem o envelope);
    cabeçalho com data e nome em destaque; quantidade em destaque; foto com `<img>` de rendição e `alt`
    escapado, e moldura vazia sem foto; frete acima do endereço (PAC, SEDEX, retirada; ausente sem frete);
    lote de dois pedidos com recado, observação, itens, endereço e frete de cada um
  - criar `pickSlipOrders.test.ts` (client dublado registrando a cadeia, molde `sentEmails`): os `.in`,
    o recorte de `catalogProductIds`, a falha de `orders`/`order_items` que lança, a degradação de
    `order_admin_notes` e de `products`, a ordem dos ids,
    `itemPhoto`
  - criar casos em `core` para `shippingMethodLabel` e a data no fuso da loja
  - página: `AdminOrdersPage` real — barra e cabeçalho leem os ids e entregam pedidos completos; sem
    seleção usa a página; teto de 10 com aviso (P4); leitura que falha avisa e não imprime; popup bloqueado avisa.
    `AdminOrderPage.observacao.test.tsx:204-214` ajustado para o carregador
  - só a execução prova: a leitura `.in` real contra o PostgREST e a RLS (probe HTTP no local), a espera
    das imagens antes do `print()`, o bloqueio de popup e a impressão — prova em navegador na Validation/QA

## Fronteira entre repositórios

nada — um repositório só.

## Cobertura

| # | Reivindicado por |
|---|---|
| C-01 | store (`pickSlip.ts`, `pickSlipOrders.ts`, `core/orders/itemPhoto.ts`) |
| C-02 | store (`pickSlip.ts`) |
| C-03 | store (`pickSlip.ts`, `core/time`) |
| C-04 | store (`pickSlip.ts`) |
| C-05 | store (`pickSlip.ts`) |
| C-06 | store (`pickSlip.ts`, `core/orders/delivery.ts`, `DbOrder`) |
| C-07 | store (`pickSlip.ts`, `pickSlipOrders.ts`) |
| C-08 | store (`pickSlipOrders.ts`, `AdminOrdersPage.tsx`, `OrderBulkBar.tsx`) |

## Perguntas e respostas

| # | A pergunta | A recomendação (premissa do plano) | A resposta |
|---|---|---|---|
| P1 | A WI 95 decidiu (N6) que a folha em lote **não** leva a Observação do admin. Este pedido diz o contrário. Reverter? | Sim: o lote leva Recado e Observação de cada pedido | ratificada no gate |
| P2 | Qual foto: a da peça no momento da compra (regra `itemPhoto`, a mesma da tela do pedido) ou a foto da **variação** escolhida? | A regra `itemPhoto` (foto da compra, capa do catálogo onde falta), igual à tela do pedido | ratificada no gate |
| P3 | Se a leitura da Observação falhar no lote, imprimir sem ela ou não imprimir? | (era) Não imprimir e avisar — superada pela resposta | "Imprimir sem observação, não é obrigatório" |
| P4 | Seleção acima de 50 pedidos ("Selecionar todos do filtro") | (era) Imprimir os 50 primeiros e avisar — superada pela resposta | "Máximo 10 pedidos por lote" — aplicado como: acima de 10, saem os 10 primeiros e a tela avisa quantos ficaram de fora |
| P5 | A folha de um pedido usa o mesmo carregador do lote? | Sim: uma montagem só, para as duas folhas não divergirem | ratificada no gate |
| P6 | O rótulo do frete nasce em `core`; o app do ateliê, que tem a mesma regra escrita à mão (`BlocoValores.tsx:33`), passa a delegar? | Sim, uma linha no app | ratificada no gate |
| P7 | A linha "Material: cinzas" de cada item (`pickSlip.ts:75-79`) é outra coisa que o bloco "Material esperado". Fica? | Fica: o pedido remove o bloco, não o material da peça | ratificada no gate |

## Riscos

- O `print()` antes das fotos carregarem sai sem fotos; o comportamento varia por navegador.
- A janela aberta antes da leitura fica em "Preparando…" se a leitura demorar; com erro, ela precisa
  fechar, senão sobra uma aba em branco.
- A folha que sai sem a Observação quando a leitura dela falha (P3) não diz isso na folha; quem
  imprime não sabe que havia uma nota. Decisão do usuário: a nota não é obrigatória.
- A lista de colunas do carregador é uma segunda forma de ler o pedido, ao lado do `select('*')` de
  `useAdminOrder` — mitigado por P5 (a folha só lê pelo carregador).

## Não resolvido

nada — as sete perguntas foram respondidas no gate de 2026-11-07.
