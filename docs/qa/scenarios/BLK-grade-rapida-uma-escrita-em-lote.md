---
id: BLK-grade-rapida-uma-escrita-em-lote
area: BLK
title: Criar N produtos usa um insert de produtos, um de variações e um refetch
persona: Nana
journey: J-cadastrar-lote-grade-rapida
expected: A rede registra um insert de produtos, um de variações e um único refetch da listagem — não N de cada
entry_points: http://localhost:8081/admin/produtos/grade-rapida
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PLS-08` (P2.3 AC 10). O requisito nasceu de um defeito medido: `handleBatchImport` chamava
`createProduct` num laço e cada `createProduct` terminava em `fetchProducts()` — 40 produtos = 40
`SELECT`s do catálogo inteiro.

**Um lote que cria os produtos certos com N requisições falha este cenário mesmo com a tela verde.**
Contar requisições é parte da sessão, não zelo extra.
