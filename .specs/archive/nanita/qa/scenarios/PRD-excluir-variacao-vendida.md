---
id: PRD-excluir-variacao-vendida
area: PRD
title: Excluir variação já vendida é recusado, nomeando os pedidos e oferecendo Pausar
persona: Nana
journey: J-cadastrar-produto-com-grade
expected: A exclusão é recusada com a contagem de pedidos que referenciam a variação e a ação Pausar no lugar — nunca um erro de FK cru, nunca o histórico do pedido perdido
entry_points: http://localhost:8081/admin/produtos/:id/editar
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PFM-08` AC 9a. A FK `order_items.variant_id → product_variants(id)` não tem `ON DELETE`, então excluir
estoura erro de banco cru na cara da lojista — e se algum dia ganhar `CASCADE`, apaga item de pedido
pago.

Cenário de severidade alta: mistura dinheiro (histórico de venda) com uma ação de um clique. Pausar
(`is_active = false`) é o caminho correto — a linha sai da loja e o histórico fica.
