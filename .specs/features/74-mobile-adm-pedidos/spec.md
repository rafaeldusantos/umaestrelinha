# 74 — mobile-adm: Pedidos (lista e detalhe, leitura)

> **RASCUNHO**: escopo e histórias P1 do programa mobile-adm (`AD-056`). Ao abrir a feature, rodar
> o Specify completo (varredura das dimensões implícitas, portão de fechamento) e o Design. Roteiro e
> decisões comuns: `.specs/features/72-mobile-adm-fundacao/spec.md`. Depende da `72`.
> Telas: Claude Design `a780eec8-…`, `Ateliê Admin.dc.html`. — telas **Pedidos** e **Pedido**.

## Problem Statement
Ela precisa achar um pedido e ver em que pé ele está (pagamento, material, entrega), com o próximo
passo claro, sem o computador.

## Escopo
- Lista com os recortes do protótipo: *Precisa de ação*, *Pix aguardando*, *Fila de material*,
  *A separar*, *Em trânsito*, *Concluídos*. Busca por número, nome e e-mail. Rolagem paginada.
- Linha: número (`formatOrderNumber`), cliente, total, selo de status e de pagamento, "há N dias".
- Detalhe: cliente (WhatsApp, "Ver cliente"), **material afetivo** (os quatro passos), itens com
  gravação, subtotal, frete, cupom, total, entrega e **histórico**.
- **Só leitura.** As ações ficam na `75`.

## Regras que sobem para `core`
`features/order-list/model` (`rowSummary`, `filterChips`), `features/order-detail/model`
(`nextStep`, `history`) e os rótulos de `entities/order/api/orderQuery`. A leitura é a view
`order_list` que o painel já usa. "Precisa de ação" é a união dos três acionáveis, **sem** o Pix
(regra de `orderList.test.ts`). A retirada no escritório usa `core/shipping/pickup.ts`.

## P1 — critérios
1. WHEN um recorte é tocado THEN a lista SHALL mostrar exatamente os pedidos que o mesmo recorte mostra no Backoffice. A prova lê o predicado de `core`, não uma cópia. (`MAP-01`)
2. WHEN a busca tem texto THEN ela SHALL procurar nas mesmas colunas da busca do Backoffice (`#0244`, `0244` e `244` acham o mesmo pedido). (`MAP-02`)
3. WHEN a lista passa de uma página THEN as próximas SHALL carregar ao rolar, sem repetir nem pular pedido. (`MAP-03`)
4. WHEN um pedido é aberto THEN o detalhe SHALL mostrar o próximo passo de `nextStep` e o histórico fundido e ordenado por tempo. (`MAP-04`)
5. WHEN o pedido é de retirada THEN a entrega SHALL dizer retirada no escritório, nunca transportadora. (`MAP-05`)
6. WHEN um recorte está vazio THEN a lista SHALL dizer "Nada por aqui." (`MAP-06`)

## Perguntas abertas
- Os recortes guardados (`savedViews`) do painel entram ou ficam só no computador?
- O detalhe mostra as notas internas (`order_notes`)? O protótipo não mostra.
