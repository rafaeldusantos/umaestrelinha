---
id: BLK-barra-oferece-as-seis-acoes
area: BLK
title: A barra de massa oferece as seis ações, e Ativar/Pausar mudam o status numa operação
persona: Nana
journey: J-agir-na-selecao-sem-perder-catalogo
expected: Com linhas selecionadas a barra mostra Editar em massa, Ativar, Pausar, Duplicar, Exportar e Excluir com a contagem de itens; Ativar e Pausar aplicam numa operação, com o toast "X alterados · Y falharam" e o desfazer de 30 s
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

`RFN-01` + `RFN-02` (`14`/P1.1 AC 1-2), a lacuna nº 1 da `13`: existiam duas ações de seis — a lojista
selecionava 12 produtos e a única coisa possível era abrir um painel.

O fecho é na vitrine: pausar 12 produtos tem que tirá-los da loja.
