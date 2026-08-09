---
id: PRD-checklist-e-resumo-dizem-a-verdade
area: PRD
title: Checklist com progresso e Resumo mostrando a faixa de preço, sem -Infinity
persona: Nana
journey: J-nao-perder-o-trabalho-no-formulario
expected: O checklist mostra badge "N de M", barra de progresso e a ação por item pendente (Ir → / Gerar), bloqueando Salvar e publicar mas não Salvar rascunho; o Resumo mostra "Faixa de preço R$ X – Y" quando há grade; e preço 0 com custo preenchido não renderiza card de margem
entry_points: http://localhost:8081/admin/produtos/:id/editar
qa_status: pass
bug_ids: BUG-20260802-gerar-do-seo-nao-gera-nada
fix_status: fixed
retest_status: pass
fix_commits: 7ba37ef
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PFM-14` + `PFM-12` (P1.7 AC 4-5, 12-13) + `RFN-07` (AC 4-7). O `-Infinity` era literal: a margem dividia
por `form.price` guardando só contra `cost_price > 0`.

O Resumo mostrar `base_price` em vez da faixa **não é detalhe de layout** — é o defeito que o programa
`07`→`14` existiu para matar: produto com grade não vende pelo `base_price`.
