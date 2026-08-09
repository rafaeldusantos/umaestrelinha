---
id: BMP-exibido-igual-cobrado
area: BMP
title: Valor cobrado com o bump é idêntico ao exibido, ao centavo
persona: Marina
journey: J-bump-exibido-cobrado
expected: orders.total no banco == valor que o rótulo do CTA exibia no momento do acionamento
entry_points: http://localhost:8080/checkout
qa_status: blocked-verify
bug_ids: BUG-20260728-edge-runtime-sem-dns
fix_status:
retest_status:
fix_commits:
evidence:
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: CHK-cta-valor-por-metodo
---

**O cenário mais importante do ciclo.** Este defeito reapareceu duas vezes: na 08 a base do cupom era
arredondada em um lado e não no outro (3 x R$ 29,90 + cupom 15% exibia 72,43 e cobrava 72,44); na 09 o
Verifier deixou BMP-04 como 'Needs Fix na cláusula idêntico ao exibido'.

Combinações obrigatorias: bump + cupom `percent`, bump + cupom `fixed` que excede o subtotal,
bump + desconto PIX, bump + cupom `free_shipping`.

Anotar o valor do rótulo **antes** de acionar e comparar com `SELECT total FROM orders`. Divergência de
um centavo é FALHA, não arredondamento aceitavel.
