---
id: CHK-pix-celular-happy
area: CHK
title: Fechar compra com PIX no celular, ponta a ponta
persona: Marina
journey: J-compra-pix-celular
expected: /pedido/:id mostra o pedido pago com a timeline em 'Pago', e recarregar a página mantem a confirmacao
entry_points: http://localhost:8080/checkout
qa_status: fail
bug_ids: BUG-20260728-edge-runtime-sem-dns;BUG-20260728-header-mobile-diverge-do-board
fix_status:
retest_status:
fix_commits:
evidence: docs/qa/evidence/2026-07-28-checkout-08-09/
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: 
---

O caminho principal da loja em 390x844. Não termina no 'PIX gerado': termina em `/pedido/:id`
sobrevivendo a um reload, com `orders.payment_status = approved` e `paid_at` no banco.

Conferir no percurso: 3 blocos numerados, zero passo 'Revisao', barra de resumo colapsavel no topo,
CTA fixo no rodape com o valor, e a faixa de confiança logo abaixo do CTA.
