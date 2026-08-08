---
id: CHK-cta-valor-por-metodo
area: CHK
title: Rótulo do CTA mostra o valor do metodo escolhido
persona: Marina
journey: J-compra-pix-celular
expected: Com pix_discount_percent = 5, o rótulo em PIX e em cartao mostram valores DIFERENTES
entry_points: http://localhost:8080/checkout
qa_status: pass
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence: docs/qa/evidence/2026-07-28-checkout-08-09/
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: CHK-bump-exibido-igual-cobrado
---

CHK-06. O rótulo tem de trazer o valor exato do metodo selecionado, não um total generico.
Se PIX e cartao mostram o mesmo número com desconto PIX ligado, o rótulo está errado.

No mobile este texto vive dentro de uma pílula no rodape — conferir que não embrulha em duas linhas.
