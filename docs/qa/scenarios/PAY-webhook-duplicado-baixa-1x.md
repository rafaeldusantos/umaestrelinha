---
id: PAY-webhook-duplicado-baixa-1x
area: PAY
title: Webhook reentregue não baixa o estoque duas vezes
persona: Rui
journey: J-retomar-pagamento-falho
expected: Com a mesma notificação entregue 2-3x, products.stock_total decrementa exatamente 1x
entry_points: webhook: POST /functions/v1/mercado-pago?action=webhook
qa_status: blocked-verify
bug_ids: BUG-20260728-edge-runtime-sem-dns
fix_status:
retest_status:
fix_commits:
evidence:
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: 
---

Idempotência herdada da 02, mas a **Orders API mudou o formato** da notificação na 09 — e o MP entregou
2 notificações por order durante a validação de sandbox. Reconferir.

Conferir também: assinatura invalida devolve 401 e não altera nada.
