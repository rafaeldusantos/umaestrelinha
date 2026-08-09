---
id: BMP-marcar-desmarcar-nao-acumula
area: BMP
title: Marcar e desmarcar o bump várias vezes não acumula desconto
persona: Léo
journey: J-bump-exibido-cobrado
expected: Depois de 3 ciclos de marcar/desmarcar, um único item com o desconto aplicado uma única vez
entry_points: http://localhost:8080/checkout
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: 
---

`applyOrderBump` **não é idempotente por composicao** — quem chama tem de passar preço cheio + o objeto
`bump`, nunca uma lista já descontada. Duas aplicacoes seguidas dariam metade da metade.
