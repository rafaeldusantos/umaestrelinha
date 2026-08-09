---
id: SHP-fronteira-frete-gratis
area: SHP
title: Subtotal exatamente igual ao threshold libera o frete gratis
persona: Léo
journey: J-frete-real-melhor-envio
expected: Com threshold 150 e subtotal 150,00 exatos, a opção mais barata mostra 'Gratis' com preço riscado
entry_points: http://localhost:8080/checkout
qa_status: blocked-verify
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence:
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: 
---

A comparação é `>=`, não `>`. Esta igualdade exata **ja sobreviveu a um mutante** — todos os testes
usavam subtotal 200 contra threshold 150, e a fronteira não tinha sensor.

Conferir também o lado de baixo: 149,99 não libera.
