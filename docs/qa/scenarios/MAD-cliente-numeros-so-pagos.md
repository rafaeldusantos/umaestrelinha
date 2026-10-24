---
id: MAD-cliente-numeros-so-pagos
area: MAD
title: Compras, no total e ticket médio, e a frase de que contam só os pagos
persona: Adri no celular
journey: J-ver-uma-cliente
expected: Três números iguais a customer_list; ticket médio com travessão (nunca R$ 0,00) para quem nunca pagou; frase dizendo que contam só pedidos pagos
entry_points: /clientes/<id>
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/76-clientes/sessao.json
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: 
---

Feature `76` (`MAC-16`, A9. Convidada, conta, cadastro sem compra, só Pix expirado.)
