---
id: PRD-taxonomia-nao-suja
area: PRD
title: Tags com dedupe tolerante e categorias múltiplas que voltam na ordem
persona: Nana
journey: J-cadastrar-produto-com-grade
expected: "Naruto" com "naruto" existente gera aviso âmbar com Usar a existente / Manter sem substituir sozinho; colar três tags cria três chips; o teto de 15 bloqueia com "15 de 15"; e as categorias escolhidas voltam na mesma ordem depois de salvar e recarregar
entry_points: http://localhost:8081/admin/produtos/novo
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps: CAT-criar-inline-sem-perder-rascunho
---

`PFM-06` (AC 6-11) + `PFM-05` (AC 1-4). O defeito original criava `Naruto`, `naruto` e `naruto ` como
coisas diferentes, e isso vaza para os filtros da listagem e da vitrine.

A ordem das categorias não é estética: `product_categories.position` é o desempate de qual categoria a
loja exibe no selo do produto (`PST-06`).
