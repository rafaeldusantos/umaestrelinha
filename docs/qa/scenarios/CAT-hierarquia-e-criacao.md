---
id: CAT-hierarquia-e-criacao
area: CAT
title: Criar categoria filha grava de verdade e aparece sob o pai
persona: Nana
journey: J-organizar-categorias
expected: Criar uma categoria com pai e slug automático grava sem erro e ela aparece sob o pai na árvore; a tela usa a mesma linguagem da listagem v2 (visões com contagem, busca por nome ou slug, seleção, barra de massa, inspetor)
entry_points: http://localhost:8081/admin/categorias
qa_status: blocked-verify
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`RFN-09` AC 1. **Este é o cenário do `AD-012`:** `DbCategory` declarava `parent_id`, `banner_url` e
`color_accent` havia meses, o banco não tinha nenhuma das três, e **toda gravação de categoria falhava
com `PGRST204`** sem nada pegar — o build não checa tipo, o `tsc` achava o código certo porque o tipo
mentia, e os testes mockavam o client.

Logo: **prove que grava.** Conferir a linha em `categories` depois de salvar, não a tela.
