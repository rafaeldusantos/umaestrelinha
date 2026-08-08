---
id: BLK-massa-so-o-que-esta-ligado
area: BLK
title: Só os campos com interruptor ligado são alterados, e a seleção é a capturada
persona: Nana
journey: J-reprecificar-em-massa
expected: Campos desligados não mudam nada nos produtos afetados; é possível selecionar todos os N do filtro (não só a página visível); e a operação usa os ids capturados na seleção, mesmo se o filtro mudar depois
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

`PLS-05` AC 2 + `PLS-06` AC 3 + o edge case do filtro reavaliado. O risco é de alcance: um campo que
"vaza" muda dado em dezenas de produtos de uma vez, e ninguém procura o que não pediu para mudar.

Verificar no banco os campos **não** ligados dos produtos afetados — é a única forma de ver o vazamento.
