---
id: MAD-envelope-alterar-duas-vezes
area: MAD
title: Alterar o código duas vezes seguidas
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: Cada Salvar grava, o aviso diz Pedido #NNNN atualizado., o foco volta a Alterar e o cartão mostra o último código
entry_points: /pedidos/<id> material_enviado → Alterar
qa_status: blocked-decision
bug_ids: BUG-20261026-codigo-corrigido-nao-reavisa
fix_status: pending
retest_status: 
fix_commits: 
evidence: 
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: 
---

Mesmo código e código novo: as duas vão à RPC (idempotente), aviso e foco certos. **Achado**: só a primeira gravação gera linha em `order_notifications` — a correção do código não reavisa a cliente nem a Adri (decisão).
