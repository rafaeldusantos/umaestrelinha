---
id: PRD-erro-em-aba-fechada-aponta
area: PRD
title: Salvar com pendência em aba fechada bloqueia e aponta a aba e o campo
persona: Dora
journey: J-nao-perder-o-trabalho-no-formulario
expected: O save é bloqueado, a aba com pendência exibe um badge com a contagem de erros, e clicar no badge abre a aba e foca o primeiro campo inválido — nunca um toast genérico "Erro ao salvar produto"
entry_points: http://localhost:8081/admin/produtos/novo
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PFM-11` (P1.7 AC 1-3). A regressão mais provável de toda a `11`, e a mais invisível: o `required` do
preço vivia dentro do `TabsContent value="precos"` e o `Tabs` do Radix **desmonta o conteúdo inativo** —
salvar de outra aba passava batido. A validação tinha que sair do input.

Dora é a persona certa: ela preenche o que entende (nome, foto) e não sabe que existe uma aba de preço.
