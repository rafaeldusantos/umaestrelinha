---
id: PNL-menu-previa-acompanha
area: PNL
title: A prévia acompanha cada mudança
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: Cada ação aparece na prévia sem recarregar o iframe; Computador mostra a barra/mega menu e Celular abre a folha; o item tocado abre o painel/acordeão dele
entry_points: /admin/menu coluna Prévia (1440) ou aba Prévia (<lg)
qa_status: pass
bug_ids: BUG-20261028-previa-da-home-no-celular-abre-o-menu;BUG-20261028-ver-na-loja-da-home-abre-o-painel
fix_status: fixed
retest_status: verified
fix_commits:
evidence: evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-04-previa-celular-390.png; evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-21-canario-home-previa-com-folha-aberta-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-01-home-previa-celular-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-02-menu-previa-celular-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-11-home-previa-celular-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-11-home-previa-celular-1440.png
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4.md
overlaps: 
---

Feature `86`. MNM-13, MNM-32. Conferir que o iframe não recarrega (sem navegação nova no frame). Em < lg, alternar Itens do menu | Prévia não perde o que estava aberto.

**Rodada 4 (2026-10-29).** Prévia Celular = folha da loja em 390; Computador = barra em 1440; `/admin/home` em Celular: `innerWidth` 390, 0 diálogos.
