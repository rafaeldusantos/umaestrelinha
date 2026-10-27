---
id: MAD-inicio-trocar-periodo
area: MAD
title: Trocar entre Hoje, Ontem e Semana
persona: Adri no celular
journey: J-acompanhar-a-loja
expected: Os quatro números trocam para o período tocado sem nova leitura, e só ele fica marcado
entry_points: /
qa_status: untested
bug_ids: 
fix_status: 
retest_status:
fix_commits:
evidence: evidence/2026-10-22-mobile-adm-inicio/CH-numeros-02-ontem.png
last_report: reports/2026-10-22-mobile-adm-inicio.md
overlaps: 
---

Feature `73` (`MAI-02`, `MAI-03`).

Reaberto em 2026-10-27 pela feature `83`: a Início ganhou o cartão "Visitas hoje" entre a faixa e "Precisa de você", o período da faixa passou a ser controlado pela página (levado a `/ao-vivo` e de volta por `history.state`) e a releitura de 30 s.
