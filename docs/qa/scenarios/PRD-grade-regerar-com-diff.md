---
id: PRD-grade-regerar-com-diff
area: PRD
title: Regerar do cruzamento mostra o diff antes e preserva o que já tinha preço
persona: Nana
journey: J-cadastrar-produto-com-grade
expected: Regerar exibe "N a criar · M a remover" antes de aplicar, e as combinações que já existiam mantêm preço, promo, estoque, SKU, peso e imagem
entry_points: http://localhost:8081/admin/produtos/:id/editar
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PFM-08` AC 6 + o edge case de reduzir os eixos de 3 para 2: nenhuma variação pode sumir sem a lojista
confirmar. É o caminho onde um bug apaga trabalho pago — 20 linhas de preço preenchidas à mão.

Cancelar o diff tem que deixar a grade intacta.
