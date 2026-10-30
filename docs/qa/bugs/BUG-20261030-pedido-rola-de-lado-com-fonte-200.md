# BUG-20261030-pedido-rola-de-lado-com-fonte-200: A página do pedido rola para o lado no celular com a fonte em 200 %

- **Status:** verified (2026-10-30, segundo reteste em navegador; working tree, sem commit) — reaberto no primeiro reteste, consertado pela opção (a) da decisão
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri despachando pedidos
- **Journey Step:** J-mudar-pedido-com-ou-sem-aviso, passo 'Histórico'
- **Scenarios:** PNL-aviso-fonte-grande-e-telas
- **Found:** 2026-10-30 · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md
- **AC:** convenção mobile do CLAUDE.md (fora dos ACs da 88)

## Summary

Em 390 com a fonte a 200 %, document.scrollWidth = 589: a fileira de filtros do Histórico (Tudo · Status · E-mails · Notas, flex sem quebra) vai até 589 px e todos os cartões da página até 421. O diálogo de aviso e a linha do avião (88 × 88) cabem; o estouro é da página, anterior à 88 (a fileira de filtros já estava no HEAD).

## Reproduction

- **Charter:** CH-aviso-fonte-grande-e-leitor · **Tour:** Feature Tour
- **Environment:** Chromium 390×844, html font-size 200 %

1. Abrir um pedido em 390×844.
2. Pôr a fonte do sistema em 200 %.
3. Medir document.documentElement.scrollWidth.

**Expected:** Nenhuma rolagem horizontal do body (CLAUDE.md, mobile primeiro).
**Actual:** scrollWidth 589 (130 %: 390, sem estouro).

## Evidence

- evidence/2026-10-30-aviso-opcional/13-historico-390-200.png
- evidence/2026-10-30-aviso-opcional/14-pedido-390-200.png

## Fix (2026-10-30)

A fileira de filtros do Histórico passou a `flex min-w-0 max-w-full flex-wrap gap-1`: embrulha no
próprio container em vez de empurrar a página.

- Arquivo: `features/order-detail/ui/OrderHistory.tsx`.
- Teste (vermelho antes): `OrderHistory.test.tsx`, por token exato (`flex-wrap`, `min-w-0`) — o jsdom
  não mede layout, então **a medida de `scrollWidth` em 390 a 200 % fica para o reteste em navegador**.
  Mutante Q7 morto por asserção.

## Regressed (2026-10-30, reteste) — conserto parcial

- **Retested:** 2026-10-30, Adri despachando pedidos, Chromium 390×844, `html { font-size: 200% }` (mesmo método do QA) · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
- **Result:** a fileira de filtros do Histórico agora embrulha ("Tudo · Status" / "E-mails · Notas") e deixou de ser a causa (era 589). Mas `document.documentElement.scrollWidth` continua **431** (≠ 390) nos pedidos QA88R-01, -02 e -03; a 130 % é 390. As folhas que passam da tela: os sete cartões da página (`SECTION`, largura 373 a partir de x=48, direita em 421) e o botão "Folha de separação" do cabeçalho (`whitespace-nowrap`, 363 px, direita em 411) — a coluna toma o min-content do botão sem quebra. No print, o valor do item sai cortado ("R$ 100,0"). É o "todos os cartões da página até 421" do relatório original, que o conserto Q7 não alcançou.
- **Também medido (fora do escopo original do bug, mesma causa):** a lista `/admin/pedidos` e a Fila de material a 390/200 % dão `scrollWidth` **478**, com "Exportar N do filtro" (370 px) e "Folha de separação" (361 px), os dois `whitespace-nowrap`, saindo da tela. A 130 %: 390 nas duas.
- **Evidência:** `evidence/2026-10-30-aviso-opcional-reteste/r7-historico-390-200.png`, `evidence/2026-10-30-aviso-opcional-reteste/r7-lista-390-200.png`, `evidence/2026-10-30-aviso-opcional-reteste/r7-fila-material-390-200.png`.

## Fix (2026-10-30, conserto do reteste — opção (a) do relatório de reteste)

Medido no Chromium antes de mexer (390×844, `html { font-size: 200% }`): a coluna da página do pedido
era a trilha implícita `auto` (tomava o min-content: 373 px numa tela de 294); "Folha de separação",
"Nota interna" e "Cancelar pedido" e, na lista, "Exportar N do filtro" eram `whitespace-nowrap` com altura
fixa; o preço do item tinha `w-[110px]` fixo (o valor a 200 % mede 134 → "R$ 100,0"); os números da
cliente ("Compras" · "Gastou") eram `grid-cols-2` fixo; e, na lista/Fila, o botão "Recebi o material" do
cartão (`nowrap`) empurrava o do WhatsApp para fora.

- `shared/ui/acoesDoCabecalho.ts` (novo, dono único das ações do `PageHeader` e do `RecordPageHeader`):
  `flex min-w-0 max-w-full flex-wrap … max-md:[&_button]:h-auto max-md:[&_button]:min-h-11
  max-md:[&_button]:whitespace-normal`. Só abaixo de `md`; em 1440 os botões seguem 36 px de altura.
  O `shrink-0` do grupo do `RecordPageHeader` saiu.
- `pages/admin/AdminOrderPage.tsx`: a grade com `grid-cols-1` (= `minmax(0, 1fr)`) também no celular; a
  linha do item com `flex-wrap`, nome com piso `min(6rem, o que sobra ao lado da foto)` e quantidade +
  preço num grupo `ml-auto` que desce para baixo do nome quando não cabe; preço `min-w-[110px]
  whitespace-nowrap` (nunca cortado); os números da cliente em `auto-fit` com piso de 8rem.
- `pages/admin/AdminOrdersPage.tsx`: o botão de ação do cartão (só existe abaixo de `md`) com
  `h-auto min-w-0 whitespace-normal`.
- Testes (vermelhos antes, token exato): `PageHeader.test.tsx`, `RecordPageHeader.test.tsx`,
  `AdminOrderPage.test.tsx` (grade, linha do item, números da cliente), `AdminOrdersPage.aviso.test.tsx`
  (botão do cartão). Mutantes L1–L8 mortos por asserção.

## Verified (2026-10-30, segundo reteste)

- **Retested:** Chromium 1228, 390×844 (`isMobile`) a 100/130/200 % e 1440×900, mesmo método do QA.
- **Result:** `document.documentElement.scrollWidth` = **390** em 390 a 100, 130 e 200 % nos pedidos
  QA88F-01, -02 e -03 (era 431), na lista `/admin/pedidos` (era 478) e na Fila de material (era 478); **1440**
  em 1440. O preço do item cabe inteiro ("R$ 100,00": `scrollWidth` 134 = `clientWidth` 134 a 200 %, 110 a
  100 %) e dentro do cartão. Em 1440 nada mudou: botões do cabeçalho 183/136/135 × 36, a linha do item numa
  linha só (74 px), os números da cliente em duas colunas de 144. Em 390 a 100 % a quantidade e o preço da
  linha do item passaram para baixo do nome (antes o nome ficava com ~50 px).
- **Evidência:** `evidence/2026-10-30-aviso-opcional-reteste-2/p-pedido-390-200.png`, `evidence/2026-10-30-aviso-opcional-reteste-2/p-itens-390-200.png`, `evidence/2026-10-30-aviso-opcional-reteste-2/p-lista-390-200.png`,
  `evidence/2026-10-30-aviso-opcional-reteste-2/p-fila-390-200.png`, `evidence/2026-10-30-aviso-opcional-reteste-2/p-pedido-1440-100.png`, `evidence/2026-10-30-aviso-opcional-reteste-2/f-cartao-390-200.png`.
