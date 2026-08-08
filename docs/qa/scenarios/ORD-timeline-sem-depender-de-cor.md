---
id: ORD-timeline-sem-depender-de-cor
area: ORD
title: Estágio do pedido é legivel sem depender de cor
persona: Sofia
journey: J-compra-pix-celular
expected: Concluido/atual/futuro se distinguem por forma (preenchido/anel/contorno) e são anunciados pelo leitor de tela
entry_points: http://localhost:8080/pedido/:id
qa_status: blocked-verify
bug_ids: BUG-20260728-edge-runtime-sem-dns
fix_status:
retest_status:
fix_commits:
evidence:
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: 
---

A timeline monocromatica substituiu cinco badges coloridas de status. O ponto não é estético: quem usa
leitor de tela ou não distingue cores precisa saber em que estágio o pedido está.

Conferir também que 'Pago' lê `paid_at`, não `orders.status` — o RPC de aprovação deixa `status` em
`pending` e grava `payment_status='approved'`; quem olhasse `status` mostraria pedido pago como não pago.
