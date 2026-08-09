---
id: LST-desfazer-da-edicao-inline
area: LST
title: O Desfazer do toast restaura o valor anterior no banco
persona: Dora
journey: J-achar-e-corrigir-na-listagem
expected: Salvar uma edição inline mostra toast com ação Desfazer; usar o Desfazer devolve o valor anterior na tela E no banco (confirmado por F5)
entry_points: http://localhost:8081/admin/produtos
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps: LST-editar-na-celula-com-teclado
---

`PLS-03` AC 8. Dora é a persona certa: ela digita no lugar errado e precisa da rede. Um desfazer que só
volta na tela é pior que nenhum — ela acredita que voltou.
