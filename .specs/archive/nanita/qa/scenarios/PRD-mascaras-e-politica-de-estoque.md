---
id: PRD-mascaras-e-politica-de-estoque
area: PRD
title: Colar R$ da planilha, digitar peso em gramas e escolher a política de estoque
persona: Nana
journey: J-cadastrar-produto-com-grade
expected: "R$ 1.234,56" colado vira 1234.56 no banco; "18" no peso exibe "18 g" e persiste 0.018 kg; texto sem número não vira NaN; a política é um segmentado de 3 modos e "Não controlar" desabilita a coluna Estoque da grade
entry_points: http://localhost:8081/admin/produtos/:id/editar
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PFM-10` (consumo dos inputs mascarados entregues pela `07`) + `PFM-09`. Nana cola da planilha onde
controla custos — é o caminho real, não um caso de borda.

`0,018` kg digitado à mão é convite a errar uma ordem de grandeza, e peso errado é frete errado: o valor
vai para a cotação do Melhor Envio. Conferir o **banco**, não o campo.
