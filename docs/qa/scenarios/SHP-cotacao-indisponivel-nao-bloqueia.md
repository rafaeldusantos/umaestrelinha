---
id: SHP-cotacao-indisponivel-nao-bloqueia
area: SHP
title: Melhor Envio fora do ar não impede a compra
persona: Marina
journey: J-frete-real-melhor-envio
expected: Aparece opção única 'Frete padrão' com default_shipping_cost e um aviso; a compra conclui
entry_points: http://localhost:8080/checkout
qa_status: fail
bug_ids: BUG-20260728-frete-fallback-sem-aviso
fix_status:
retest_status:
fix_commits:
evidence: docs/qa/evidence/2026-07-28-checkout-08-09/
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: 
---

Perder a venda é pior que cobrar o flat configurado. O aviso tem de ser visível — falha de terceiro
silenciosa é pior que falha explicita.

Forcar derrubando a edge function `melhor-envio` ou bloqueando a rota no browser.
