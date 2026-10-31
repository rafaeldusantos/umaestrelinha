# 89 — Prova em navegador (T27)

2026-10-31, Chromium (Playwright), dev servers da loja (`:8082`) e do painel (`:8083`) contra o Supabase
**local** (`:54441`/`:54442`), functions servidas por `supabase functions serve`. Bloqueados por rota:
`*.supabase.co`, `*.google-analytics.com`, `*.googletagmanager.com` e `**/g/collect*`. A loja rodou
com `navigator.webdriver` neutralizado (o filtro de robô da `71`).

## Ambiente — o que foi preciso montar, e o que vazou para fora

- **`order-proposals` e `mercado-pago` NÃO sobem no edge runtime local** (CLI 2.121): `worker boot
  error … Failed resolving types. Relative import path "@estrelinha/supabase/types"`, vindo do
  `import type` sem caminho de `packages/core/src/pricing/index.ts` e `grid.ts`. **É anterior à 89**
  (a `63` já registrou o 503 da `mercado-pago`; `deno check` da `mercado-pago` em HEAD dá os mesmos 4
  erros) — a `order-proposals` herda porque importa `core/pricing/index.ts`. O `--import-map` do
  `functions serve` não foi honrado no grafo de tipos. **Para a prova**, os dois `import type` foram
  trocados por aliases `any` locais, servidos, e **restaurados** ao fim com SHA-256 conferido
  (`git diff` de `packages/core/src/pricing/` vazio). Registrado como risco abaixo; o deploy de
  produção da `mercado-pago` tolera o mesmo import desde agosto, mas a `order-proposals` nunca foi
  publicada.
- **`--env-file` não isola tudo**: `[edge_runtime.secrets]` do `config.toml` resolve o `.env` da raiz
  para as chaves que o arquivo não traz. O arquivo da prova tinha só `STORE_PUBLIC_URL`,
  `ADMIN_PUBLIC_URL` e uma `RESEND_API_KEY` inválida de propósito. Consequências medidas:
  - **E-mail**: nenhum saiu — o motor registrou `resend_unauthorized` (401) para `order_received` e
    `owner_order_received`.
  - **Melhor Envio**: a cotação da prévia (painel) e do bloco Entrega (loja) foi à API **de produção**
    (`MELHOR_ENVIO_ENV=production` no `.env`) — só `quote`, leitura, sem etiqueta.
  - **Mercado Pago**: a chamada direta ao `create-payment` real (abaixo) criou um PIX na conta de
    **teste** (`TESTUSER…` no payload do QR) — sandbox, sem dinheiro.
- Dados que ficaram **no banco local**: a proposta `P-0001` (cliente "Helena Prova Oitenta e Nove",
  `helena.prova89@exemplo.invalid`), o pedido `#0220` (`c8f5baa0-…`), a ficha e a conta de convidada,
  e o cupom `PROVA89` (desativado ao fim).

## Montar em 1440 (painel)

`/admin/pedidos/montar`, "Cliente nova" com nome, e-mail e telefone; endereço preenchido; duas peças:
"Anel Afetivo Aliança com Coto Umbilical em Prata 925" na variação `Prata 925 · Sim · 17` com
gravação "Theo", e "Anel Afetivo com Leite materno coração cravejado" em `Folheado a prata · 17`;
cupom `PROVA89` (10 %); desconto combinado de R$ 20 com motivo "Cliente antiga".

| Linha do resumo | Valor | Conferência |
| --- | --- | --- |
| Subtotal | R$ 1.071,00 | 866 + 205 |
| Cupom | − R$ 107,10 | 10 % |
| Desconto combinado | − R$ 20,00 | |
| Total das peças | R$ 943,90 | gravado em `order_proposals.items_total` |
| no PIX | R$ 877,83 | 943,90 × 0,93 |

"Criar link" levou a `/admin/pedidos/montados/<id>` com `P-0001 · Aberta`, "Vale até 07/11/2026" e o
link `http://localhost:8082/pedido-montado#<token>` (token no fragmento). "Copiar link" pôs o mesmo
endereço na área de transferência e chamou `order-proposals?action=log-sent` com `{ id, channel: 'copy' }`;
o histórico ganhou "Link enviado · link copiado".

## Concluir em 390×844, contexto anônimo (loja)

- A página abriu com o `<title>` **"Pedido montado | Uma Estrelinha"**, `<h1>` "Seu pedido", as duas
  peças travadas (variação, gravação "Theo", quantidade, preço) e o resumo com "Desconto combinado"
  **sem o motivo**. O fragmento saiu da barra (`/pedido-montado`) e o token ficou só em
  `sessionStorage` (`estrelinha-proposal-token`), nunca em `localStorage`.
- Total com SEDEX (R$ 24,03) e PIX 7 %: **R$ 901,86** (943,90 + 24,03 − 66,07). CTA "Pagar R$ 901,86
  com PIX".
- Concluir ⇒ `/pedido/c8f5baa0-…/pagamento`, "PEDIDO #0220 · AGUARDANDO PAGAMENTO", R$ 901,86. O
  `create-payment` foi **dublado na rota** nesta etapa (QR sintético); o corpo enviado foi
  `{ order_id, method: 'pix', idempotency_key, access_token }` — o token de **convidada** do pedido,
  não o da proposta.
- **No banco**: `orders` `#0220` com `subtotal 1071`, `discount 107.10`, `manual_discount 20.00`,
  `shipping_cost 24.03`, `total 901.86`, `proposal_id` preenchido, e-mail o da proposta; `order_items`
  com `unit_price` 866 e 205 e `engraving_text 'Theo'`; a proposta `completed` com `order_id`; eventos
  `created → link_sent ×2 → viewed → completed`.
- **Paridade com o `create-payment` REAL (`PRC-06`)**: chamado direto contra a function local com o
  token de convidada, o ramo travado gravou `subtotal 1071.00 · pix_discount 66.07 · total 901.86` —
  o mesmo número que a página desenhou — e devolveu o QR da conta de teste.
- **Reabrir o link concluído** num aparelho/aba novo foi direto a `/pedido/c8f5baa0-…` (`CON-07`).
- **Token fora do corpo**: com todas as requisições do contexto anônimo registradas (429 na reabertura),
  o token da proposta apareceu **só** no corpo de `functions/v1/checkout?action=get-proposal` — nunca
  em URL, cabeçalho, outra requisição ou `localStorage`. O GA4 não está configurado no local; o
  `page_view` sem `#` está provado por `pageViewSemFragmento.test.tsx` (tracker real), não aqui.
- Aprovação: o PIX sandbox não pode ser pago; aprovei por `apply_payment_approval` no banco local.
  Recarregada, a rota de pagamento foi para `/pedido/:id` (pago). O sondar da convidada (5 s) não
  avançou a aba enquanto ela estava em segundo plano — o Chromium segura timer de aba oculta; não é
  medida do código.

## No painel, depois

`/admin/pedidos/c8f5baa0-…`: "Pedido #0220 · Pago" com **"Montado pelo painel · P-0001"** no subtítulo,
e no Pagamento "Desconto combinado — Cliente antiga − R$ 20,00", "Desconto Pix − R$ 66,07", Frete
R$ 24,03, **Total R$ 901,86** — igual ao que a cliente pagou. A aba "Montados" mostra
`P-0001 · Helena … · R$ 943,90 · 31/10/2026 · Concluída · Pedido #0220`.

## Rolagem horizontal a 390 (`document.documentElement.scrollWidth`)

Fonte escalada pela raiz (`html { font-size: N% }`).

| Tela | 100 % | 130 % | 200 % antes | 200 % depois |
| --- | --- | --- | --- | --- |
| `/pedido-montado` (loja) | 390 | 390 | **448** | 390 |
| `/pedido/:id/pagamento` | 390 | 390 | 390 | 390 |
| `/admin/pedidos?visao=montados` | 390 | 390 | 390 | 390 |
| `/admin/pedidos/montar` (vazio) | 390 | 390 | **553** | 390 |
| `/admin/pedidos/montar` (peça + desconto) | 390 | 390 | **442** | 390 |
| `/admin/pedidos/montados/:id` | 390 | 390 | **527** | 390 |
| `/admin/pedidos/:id` (o pedido montado) | 390 | 390 | 544 | 544 — **anterior à 89**, ver abaixo |

E 1440 sem rolagem na montagem (`1440/1440`).

## Defeitos achados e consertados (teste vermelho antes, em todos)

1. **A linha da peça media 6.732px em 1440** — a peça real tem 108 variações e a lista seguia aberta
   depois da escolha. `VariantPicker` recolhe para a escolhida + "Trocar variação (N opções)" acima de
   `VARIACOES_SEMPRE_ABERTAS` (6); depois: 362px. +4 casos em `VariantPicker.test.tsx`.
2. **O histórico da proposta mostrava o uuid do autor** (`HIS-01` pede o autor). A function resolve o
   e-mail de cada autor distinto (`auth.admin.getUserById`) e devolve `actor_email`; o painel o mostra
   e nunca o uuid. O dublê da página punha um e-mail em `actor` — descrevia um contrato que o servidor
   não tinha. +1 caso na function, +1 e a fixture corrigida em `AdminProposalPage.test.tsx`.
3. **A aba "Montados" sumia 300 ms depois de aberta, e o F5 nunca a abria.** O debounce da busca
   reroda quando `setSearchParams` troca de identidade e `setQuery` reescrevia a URL a partir da
   consulta de pedidos, que não conhece `montados`. `setQuery` não reescreve consulta que não mudou.
   +3 casos em `AdminOrdersPage.montados.test.tsx` (os anteriores asseriam antes do debounce); os 3
   morrem com o mutante reinjetado (SHA-256 conferido).
4. **`/pedido-montado` rolava de lado a 200 %**: a linha do bloco fechado (disco + rótulo + "Alterar")
   pedia 381px em 262. A casca é `CollapsedBlock`, a mesma do `/checkout` — o defeito era dele também.
   A linha embrulha (`flex-wrap gap-x-3 gap-y-1`). +2 casos (`CollapsedBlockQuebra.test.tsx`).
5. **Painel a 200 %**: o e-mail no subtítulo de `RecordPageHeader` (uma palavra só), o par "Cliente
   cadastrada / Cliente nova", o seletor de quantidade, o par "Em reais / Em percentual", a linha
   "Desconto combinado — motivo" (proposta e pedido) e o e-mail do autor no histórico. Cada um com o
   token que o deixa quebrar ou embrulhar, e uma régua de token exato no teste do componente.

## Não consertado — registrado

- **O cartão "Material afetivo" do pedido rola de lado a 390/200 %** (544): os botões
  "Marcar material como recebido" e "Colocar em produção" são `whitespace-nowrap`. Anterior à 89 (o
  reteste da `88` mediu um pedido sem material pendente). Fora do escopo.
- **`core/pricing` com `import type` de pacote** — derruba o boot local da `order-proposals` e da
  `mercado-pago`. A saída que o projeto já usou para `MenuPromo` (`CLAUDE.md`, *Alias de import*) é
  declarar os tipos em `core` e o pacote de tipos reexportar. **Antes do primeiro deploy da `order-proposals`, conferir que ela sobe no
  hospedado.**
- **O endereço montado pode ser trocado pelo CEP na loja**: com um CEP que resolve, `DeliveryBlock`
  (ADR-01) preenche e trava rua/bairro/cidade com o resultado da consulta — a rua digitada no painel
  ("Rua dos Andradas") virou a do CEP 90010-000 ("Rua Siqueira Campos"). É o comportamento de sempre
  do checkout; aqui ele contraria um endereço que a Adri já conferiu. Decisão de produto.
- **"Sacola intocada" não foi medida em navegador com sacola cheia** (o contexto anônimo começou sem
  sacola); está provada pela página real em `ProposalCheckoutPage.test.tsx` (T26).
- Cartão, TalkBack e o Android real não foram percorridos.
