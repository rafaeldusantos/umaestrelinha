---
id: MAD-envelope-sem-nome-e-sem-materiais
area: MAD
title: Pedido sem nome de cliente e com material sem tipo
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: As frases ficam corretas sem o nome; sem tipos declarados não há chip, só a espera
entry_points: /pedidos/<id> com customer_name vazio e material_kinds vazio
qa_status: blocked-decision
bug_ids: BUG-20261026-a-cliente-no-meio-da-frase
fix_status: pending
retest_status: 
fix_commits: 
evidence: evidence/2026-10-26-mobile-adm-envelope-da-cliente/s8-folha-a-cliente.png;evidence/2026-10-26-mobile-adm-envelope-da-cliente/s6-a-cliente-no-meio-da-frase.png
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: 
---

Sem chips, "há 2 dias" sozinho (ok). Frases: "Use quando A cliente mandar…" e "O material de A cliente está na bancada." — maiúscula no meio e "de A" (decisão: a spec escreve "A cliente").
