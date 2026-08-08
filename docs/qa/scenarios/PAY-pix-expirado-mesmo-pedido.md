---
id: PAY-pix-expirado-mesmo-pedido
area: PAY
title: PIX expirado gera código novo no mesmo pedido
persona: Rui
journey: J-retomar-pagamento-falho
expected: Novo código emitido para o MESMO order_id; nenhum pedido novo criado; aponta para /conta
entry_points: http://localhost:8080/checkout
qa_status: blocked-verify
bug_ids: BUG-20260728-edge-runtime-sem-dns
fix_status:
retest_status:
fix_commits:
evidence:
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: 
---

Conferir a contagem de pedidos no banco antes e depois de gerar o segundo código. Um pedido novo aqui
seria pedido órfão no painel do MP.
