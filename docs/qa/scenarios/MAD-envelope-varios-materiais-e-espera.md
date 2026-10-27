---
id: MAD-envelope-varios-materiais-e-espera
area: MAD
title: Vários itens com materiais diferentes e há quanto tempo espera
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: Um chip por material distinto, na ordem de sempre, sem o item que não exige material; a espera diz o que mede
entry_points: /pedidos/<id> com 3 itens
qa_status: blocked-decision
bug_ids: BUG-20261026-idade-da-espera-sem-contexto
fix_status: pending
retest_status: 
fix_commits: 
evidence: 
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: 
---

G: "Leite materno", "Flores"; o item sem material (penas) não entra. A espera "há 5 dias" fica ao lado dos chips sem dizer do quê, logo abaixo de "Pedido feito há 5 dias"; com código, ela convive com "Informado pela cliente há 2 dias" (A3, decisão).
