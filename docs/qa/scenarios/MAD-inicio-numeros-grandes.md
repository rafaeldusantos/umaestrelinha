---
id: MAD-inicio-numeros-grandes
area: MAD
title: Ver números grandes caberem nos cards
persona: Adri no celular
journey: J-acompanhar-a-loja
expected: R$ 99.999 no faturamento, R$ 9.999,99 no ticket e o mês de seis dígitos cabem numa linha em 360 e 412, sem rolagem lateral
entry_points: /
qa_status: untested
bug_ids: BUG-20261022-numeros-se-sobrepoem-com-fonte-grande
fix_status: fixed
retest_status: pass
fix_commits: working tree, sem commit
evidence: evidence/2026-10-22-mobile-adm-inicio/CH-numeros-03-grandes-412.png; evidence/2026-10-22-mobile-adm-inicio/CH-numeros-04-grandes-360.png; evidence/2026-10-22-mobile-adm-inicio-reteste/R1-texto-100-360.png; evidence/2026-10-22-mobile-adm-inicio-reteste/R1-texto-100-412.png
last_report: reports/2026-10-22-mobile-adm-inicio-reteste.md
overlaps: 
---

Feature `73` (`MAI-27`, `MAI-28`).

Reaberto em 2026-10-27 pela feature `83`: a Início ganhou o cartão "Visitas hoje" entre a faixa e "Precisa de você", o período da faixa passou a ser controlado pela página (levado a `/ao-vivo` e de volta por `history.state`) e a releitura de 30 s.
