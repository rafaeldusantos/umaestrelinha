---
id: PNL-menu-primeiro-acesso-sem-v2
area: PNL
title: Abrir o menu antes da primeira gravação mostra o menu de hoje
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: Sem version 2 no banco, a tela lista exatamente os itens que a loja mostra hoje (com Celular desligado onde a loja do celular não mostra), e abrir a tela não grava nada
entry_points: /admin/menu com store_settings.menu legado (sem version)
qa_status: pass
bug_ids: 
fix_status: 
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-01-legado-banner-1440.png
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
overlaps: LOJA-menu-igual-antes-de-gravar
---

Feature `86`. MNM-01, MNM-34, MNM-40. Conferir no banco que `value` continua sem `version` depois de abrir, recarregar e abrir em outra aba. Os banners de `categories.menu_banners` aparecem no item da categoria. A primeira ação grava o v2 inteiro, com os banners e os `links` legados preservados.
