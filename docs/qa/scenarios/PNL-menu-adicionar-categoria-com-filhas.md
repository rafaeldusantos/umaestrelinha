---
id: PNL-menu-adicionar-categoria-com-filhas
area: PNL
title: Adicionar categoria que tem subcategorias
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: O item entra no fim, com o nome da categoria, sem ícone, nos dois dispositivos, e o submenu nasce com todas as subcategorias ativas na ordem da árvore
entry_points: /admin/menu → Adicionar item ao menu → Categoria
qa_status: pass
bug_ids: 
fix_status: 
retest_status:
fix_commits:
evidence: reports/2026-10-28-backoffice-menu-montado-pela-dona.md
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
overlaps: 
---

Feature `86`. MNM-07, MNM-08, MNM-09, MNM-13. Buscar sem acento (`acessorios`). Subcategoria inativa NÃO entra. O toast diz quantos itens entraram no submenu. Adicionar uma subcategoria (não raiz) como item principal também deve funcionar.
