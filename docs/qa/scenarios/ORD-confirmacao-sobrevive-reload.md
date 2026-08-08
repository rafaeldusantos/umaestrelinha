---
id: ORD-confirmacao-sobrevive-reload
area: ORD
title: Confirmacao do pedido sobrevive a um reload
persona: Marina
journey: J-compra-pix-celular
expected: Recarregar /pedido/:id continua mostrando mascote, número, valor pago e a timeline no estágio certo
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

A confirmacao era estado interno do checkout e **morria no reload**: o carrinho é limpo na aprovação,
entao a página caia em 'carrinho vazio'. Virou rota própria.

Conferir também: uma única pílula geleia na tela ('Acompanhar pedido'), com 'Ver mais pins' em contorno.
