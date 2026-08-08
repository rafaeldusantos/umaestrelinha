---
id: BLK-massa-previa-bate-com-a-conta
area: BLK
title: Prévia do impacto de +10% bate com a conta feita à mão antes de escrever
persona: Nana
journey: J-reprecificar-em-massa
expected: A Prévia do impacto mostra antes → depois das primeiras linhas afetadas, o ticket médio antes e depois e os avisos — e o resultado aplicado bate com a prévia em 3 linhas conferidas à mão
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

`PLS-06` (P2.2 AC 4, 8). A prévia é a única coisa entre a boa intenção e o catálogo reprecificado errado.
Uma prévia que **mostra** um número e **grava** outro é pior que nenhuma prévia: a lojista confere,
aprova e o dano fica invisível.

Inclui os modos `Definir valor`, `Aumentar %`, `Diminuir %` e `Arredondar` (com `terminar em ,90`).
Cancelar não pode escrever nada.
