---
id: PNL-menu-desligar-celular
area: PNL
title: Desligar um item ou filho só no celular
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: Item com Celular desligado some da folha do celular e continua na barra do computador; filho desligado some só do painel daquele dispositivo; desligado nos dois fica esmaecido com Fora do menu
entry_points: /admin/menu → chaves Computador / Celular da linha
qa_status: pass
bug_ids: 
fix_status: 
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-09-fora-do-menu.png
last_report: reports/2026-10-28-backoffice-menu-montado-pela-dona.md
overlaps: LOJA-menu-depois-de-gravar-390-e-1440
---

Feature `86`. MNM-28, MNM-29, MNM-30, MNM-32 (o alternador da prévia não muda as chaves). A contagem N no computador · M no celular acompanha. Nome acessível das chaves diz o item e o dispositivo, e o estado (aria-pressed).
