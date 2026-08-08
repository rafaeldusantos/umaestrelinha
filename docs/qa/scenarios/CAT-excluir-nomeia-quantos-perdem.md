---
id: CAT-excluir-nomeia-quantos-perdem
area: CAT
title: Excluir categoria com produtos nomeia quantos ficam sem ela e exige confirmação
persona: Dora
journey: J-organizar-categorias
expected: Excluir uma categoria que tem produtos abre confirmação dizendo quantos produtos ficam sem ela; cancelar não muda nada; confirmar remove só a categoria — os produtos continuam existindo e a vitrine não fica com link morto
entry_points: http://localhost:8081/admin/categorias
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`RFN-09` AC 3. Categoria é taxonomia de navegação: excluir sem aviso deixa produto sem caminho e link
morto na loja — e quem paga é a cliente, não o admin.

Dora é a persona: ela limpa o que "parece duplicado" sem saber quantos produtos dependem daquilo.
