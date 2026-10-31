---
id: PNL-montado-duplo-clique-criar-link
area: PNL
title: Criar link com duplo clique cria uma proposta só
persona: Adri montando uma venda
journey: J-montar-pedido-para-a-cliente
expected: Dois cliques rápidos em Criar link produzem uma proposta no banco
entry_points: /admin/pedidos/montar
qa_status: pass
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-31-pedido-montado.md
overlaps: 
---

Implicit sweep: idempotência do Criar link.

2026-10-31: duas rodadas de duplo clique, uma proposta em cada (P-0005, P-0009). Na primeira o segundo `save` respondeu 500 (`rpc_failed`, corrida da chave de idempotência) e consumiu o número P-0006 — a Adri vê P-0005 e P-0007. Sem efeito na tela; registrado em Runtime Errors do relatório.
