---
id: BLK-excluir-nao-orfana-pedido
area: BLK
title: Excluir produto já vendido falha de forma legível, sem levar o histórico do pedido
persona: Nana
journey: J-agir-na-selecao-sem-perder-catalogo
expected: Excluir um produto cujas variações já foram vendidas relata a falha em linguagem de loja ("X excluídos · Y falharam" com o motivo), nunca um erro de FK cru — e o pedido antigo continua legível com item, preço e rótulo da variação
entry_points: http://localhost:8081/admin/produtos
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps: BLK-excluir-mostra-antes-de-apagar; PRD-excluir-variacao-vendida
---

`RFN-01` AC 8 encontrando a armadilha de banco de `PFM-08` AC 9a: a FK
`order_items.variant_id → product_variants(id)` é `NO ACTION`. Duas formas de falhar, ambas graves — erro
cru na cara da lojista, ou (se algum dia ganhar `CASCADE`) item de pedido pago desaparecendo.

O histórico do pedido tem defesa própria (`order_items.variant_label` e `variant_options` congelam o
rótulo na compra), e é isso que se confere na página do pedido depois da tentativa.
