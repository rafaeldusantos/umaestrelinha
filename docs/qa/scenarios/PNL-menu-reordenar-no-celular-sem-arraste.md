---
id: PNL-menu-reordenar-no-celular-sem-arraste
area: PNL
title: Reordenar o menu no celular sem arrastar
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: Pelo ⋯ Mover para cima/baixo (desabilitados nas pontas) a ordem muda na lista, na prévia e na loja; no submenu também
entry_points: /admin/menu em 390, toque
qa_status: pass
bug_ids: BUG-20261028-toque-duplo-em-mover-anda-duas-posicoes
fix_status: fixed
retest_status: verified
fix_commits:
evidence: reports/2026-10-28-backoffice-menu-montado-pela-dona.md; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-10-montar-reordenar-390.png
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4.md
overlaps: PNL-menu-reordenar-nao-mexe-no-catalogo
---

Feature `86`. MNM-18, MNM-19, MNM-23. O arraste HTML5 não funciona com toque: o caminho do celular é o Mover. Conferir que depois de mover o foco/o menu ⋯ não some e a linha movida fica visível. O arraste real com o dedo no Android é blocked-verify.

**Rodada 3 (2026-10-29).** 390 com toque: dois "Mover para cima" = duas posições, 1 PATCH cada, foco volta ao ⋯.

**Rodada 4 (2026-10-29).** Dois "Mover para cima" com toque: 1 PATCH cada, foco de volta ao ⋯, banco na ordem nova, body 390.
