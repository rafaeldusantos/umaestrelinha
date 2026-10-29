---
id: PNL-menu-renomear-e-voltar-ao-padrao
area: PNL
title: Dar nome próprio a um item e voltar ao nome da categoria
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: Com Usar o nome da categoria desligado ela grava um nome de até 40 com contador; vazio é recusado; religar volta a acompanhar a categoria renomeada em /admin/categorias
entry_points: /admin/menu → ⋯ → Editar nome, ícone e banners
qa_status: pass
bug_ids: 
fix_status: 
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-13-nome-so-espacos-1440.png
last_report: reports/2026-10-28-backoffice-menu-montado-pela-dona.md
overlaps: 
---

Feature `86`. MNM-14, MNM-15, MNM-16, MNM-26 (o mesmo no item de submenu). Renomear a categoria em `/admin/categorias` com o padrão ligado e conferir a loja; com nome próprio, a loja NÃO muda. Testar 40 e 41 caracteres, emoji e acento no contador.
