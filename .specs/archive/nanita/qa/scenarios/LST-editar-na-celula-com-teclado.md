---
id: LST-editar-na-celula-com-teclado
area: LST
title: Corrigir preço ou estoque na célula, com Enter, Tab e Esc
persona: Nana
journey: J-achar-e-corrigir-na-listagem
expected: Clicar na célula abre input inline; Enter salva, Tab avança para a próxima célula editável, Esc cancela sem gravar; e o valor novo continua lá depois de um F5
entry_points: http://localhost:8081/admin/produtos
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps: LST-desfazer-da-edicao-inline
---

`PLS-03` (P2.1 AC 7). O ganho inteiro da listagem v2 mora aqui: corrigir 12 preços sem abrir 12
formulários. Nana é teclado-primeiro, então `Tab` que não avança quebra o fluxo mesmo com o save
funcionando.

O F5 é obrigatório na verificação: valor que só existe no estado otimista da tela é o defeito clássico
desta feature.
