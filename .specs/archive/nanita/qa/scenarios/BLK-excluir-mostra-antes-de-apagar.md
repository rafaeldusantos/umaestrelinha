---
id: BLK-excluir-mostra-antes-de-apagar
area: BLK
title: Excluir em massa lista os produtos e exige a palavra EXCLUIR antes de apagar
persona: Dora
journey: J-agir-na-selecao-sem-perder-catalogo
expected: A etapa 1 lista nome, preço e status de cada produto e informa quantos são (seleção grande mostra os primeiros N e "e mais X"); a etapa 2 só habilita a ação com a palavra EXCLUIR digitada (minúsculas aceitas); cancelar em qualquer etapa não exclui nada e preserva a seleção
entry_points: http://localhost:8081/admin/produtos
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps: BLK-excluir-nao-orfana-pedido
---

`RFN-02` (`A27`). Excluir é a única ação da barra **sem desfazer**: `useUndoBuffer` restaura valores, não
linhas apagadas. As duas etapas são a única proteção que existe.

Dora é a persona: ela é quem lê a lista, reconhece um produto que não devia estar ali e cancela. Exigir
caixa exata em `EXCLUIR` seria hostilidade — `excluir` minúsculo é aceito por decisão de spec.
