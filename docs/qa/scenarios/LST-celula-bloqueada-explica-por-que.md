---
id: LST-celula-bloqueada-explica-por-que
area: LST
title: Célula não editável diz por quê — faixa de preço com grade e sempre disponível
persona: Dora
journey: J-achar-e-corrigir-na-listagem
expected: Produto com variações mostra a faixa "R$ X – Y" com o rótulo "N preços" e a edição inline de preço desabilitada COM explicação de que o preço vive na grade; produto com stock_policy none mostra "sempre disponível" e não edita
entry_points: http://localhost:8081/admin/produtos
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PLS-04` (P2.1 AC 9-10). A própria spec da `13` põe isso nos Edge Cases: desabilitar sem dizer por quê
"lê como bug". Dora é exatamente quem trava — ela clica, nada acontece, e ela não sabe se é ela ou o
sistema.
