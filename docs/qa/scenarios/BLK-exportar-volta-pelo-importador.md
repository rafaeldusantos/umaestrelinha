---
id: BLK-exportar-volta-pelo-importador
area: BLK
title: O CSV exportado é relido pelo Importar CSV sem edição manual
persona: Nana
journey: J-agir-na-selecao-sem-perder-catalogo
expected: Exportar baixa um CSV apenas com os selecionados, nas mesmas colunas que o Importar CSV aceita; produto com grade leva o base_price (não a faixa); e o arquivo baixado é aceito de volta pelo importador sem edição
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

`RFN-03` (`A26`). O valor não é "baixou um arquivo" — é fechar o ciclo exportar → editar no Excel →
reimportar. Um CSV que o próprio importador recusa é meio caminho que parece pronto.
