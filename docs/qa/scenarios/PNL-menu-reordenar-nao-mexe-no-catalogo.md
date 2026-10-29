---
id: PNL-menu-reordenar-nao-mexe-no-catalogo
area: PNL
title: Reordenar o menu não muda outras telas da loja
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: Depois de arrastar e mover itens, categories.sort_order fica byte a byte igual e a grade da Home e o rodapé mantêm a ordem
entry_points: /admin/menu (arraste no notebook)
qa_status: pass
bug_ids: 
fix_status: 
retest_status:
fix_commits:
evidence: reports/2026-10-28-backoffice-menu-montado-pela-dona.md
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
overlaps: 
---

Feature `86`. Success Criterion 2, MNM-18. Retrato de `categories` (id, sort_order, active, menu_*) antes e depois, comparado com cmp. Abrir a Home e o rodapé da loja e comparar.
