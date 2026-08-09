---
id: BLK-duplicar-nasce-rascunho
area: BLK
title: Duplicar cria cópias como rascunho, com slug próprio livre, num único insert
persona: Nana
journey: J-agir-na-selecao-sem-perder-catalogo
expected: Cada selecionado gera uma cópia como rascunho, com "(cópia)" no nome e slug próprio; se o slug da cópia colidir, recebe sufixo até ficar livre; e os originais não são tocados
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

`RFN-01` (AC 3) + o edge case do slug. Nascer **rascunho** é a proteção: uma cópia ativa entraria na
vitrine com o nome "(cópia)" à vista da cliente.

O `UNIQUE` do banco não pode ser a primeira linha de defesa — duplicar 12 produtos e receber erro de
constraint no meio deixa metade criada.
