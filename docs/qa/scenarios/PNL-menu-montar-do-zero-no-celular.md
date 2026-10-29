---
id: PNL-menu-montar-do-zero-no-celular
area: PNL
title: Montar um menu de 5 itens com submenu, do zero, no celular
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: Em 390, partindo do vazio, ela monta 5 itens (categorias e uma página) com submenu em menos de 5 minutos, e recarregar mostra o mesmo
entry_points: /admin/menu com menu v2 vazio; 390x844 toque
qa_status: pass
bug_ids: 
fix_status: 
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-02-vazio-390.png; evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-03-primeiro-item-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-10-montar-reordenar-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-10-montar-reordenar-390.png
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4.md
overlaps: PNL-menu-adicionar-categoria-com-filhas
---

Feature `86`. Goal da spec (5 itens em < 5 min, 390). MNM-04 (vazio com a ação), MNM-07, MNM-08. Cronometrar. Seletor e editor abrem como folha de largura cheia.

**Rodada 4 (2026-10-29).** 390 com toque: "Coleção Fragmentos" pela busca entrou no fim, aviso "Item adicionado".
