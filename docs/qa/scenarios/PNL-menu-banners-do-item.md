---
id: PNL-menu-banners-do-item
area: PNL
title: Banners do painel no item do menu
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: O item mantém até 2 banners por dispositivo com arte por dispositivo, a contagem N no computador · M no celular, e a loja desenha no painel do item (inclusive de link)
entry_points: /admin/menu → ⋯ → Editar → banners
qa_status: pass
bug_ids: BUG-20261028-banner-em-edicao-some-ao-trocar-de-aba-ou-esc; BUG-20261029-foco-cai-no-body-ao-continuar-editando-o-banner
fix_status: fixed
retest_status: verified
fix_commits:
evidence: evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-14a-banner-antes-de-trocar-aba.png; evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-14b-banner-sumiu-ao-voltar.png; evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-15-banner-no-mega-menu-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-08-descartar-banner-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-11-loja-1440-mega-banner.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-12-loja-390-folha-joias.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-05-continuar-editando-foco-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-06-banner-botanicas-recusado-1440.png
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3.md
overlaps: 
---

Feature `86`. MNM-33, MNM-34. Upload vai para home-images/menu no Storage LOCAL; apagar os objetos de teste no fim. Nunca provado em navegador.

**Rodada 3 (2026-10-29).** Foco do "Continuar editando" consertado; destino digitado `/botanicas` recusado ao salvar banners, sem escrita; Descartar apagou a arte do Storage.
