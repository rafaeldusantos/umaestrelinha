---
id: PRD-rascunho-sobrevive-ao-f5
area: PRD
title: Alterar um campo e dar F5 oferece restaurar o rascunho
persona: Nana
journey: J-nao-perder-o-trabalho-no-formulario
expected: A tela mostra "Rascunho salvo automaticamente · há N s"; depois de um F5 o formulário do mesmo produto oferece restaurar; e um save bem-sucedido descarta o rascunho daquele produto
entry_points: http://localhost:8081/admin/produtos/:id/editar
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PFM-13` (P1.7 AC 6-8). O defeito original: um F5 perdia tudo, sem rascunho nem guarda de saída — e o
formulário do produto é a tela mais longa do backoffice.

Chaveado por produto no `sessionStorage` (`nanapin-product-draft`): o rascunho do produto A não pode
aparecer ao abrir o produto B. Conferir também que `sessionStorage` cheio/indisponível falha em silêncio
sem quebrar o formulário.
