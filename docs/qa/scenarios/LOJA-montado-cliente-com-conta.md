---
id: LOJA-montado-cliente-com-conta
area: LOJA
title: Concluir com a conta que já existe, sem pedir código
persona: Cliente com conta pelo link
journey: J-concluir-pedido-montado
expected: Com o e-mail da proposta já tendo conta, logada ou não, a conclusão não pede código, o pedido aparece em /conta dela e o e-mail não pode ser trocado
entry_points: /pedido-montado#<token>
qa_status: pass
bug_ids: BUG-20261031-segundo-link-da-mesma-cliente-paga-o-pedido-anterior
fix_status: fixed
retest_status: pass
fix_commits:
evidence:
last_report: reports/2026-10-31-pedido-montado-reteste.md
overlaps: 
---

CON-12, A-07, A-08. Duas variantes: deslogada; logada com OUTRA conta (o pedido deve ir para a conta do e-mail da proposta).

2026-10-31: logada com OUTRA conta (Joana), o link da Marta concluiu sem código e o pedido #0267 foi para a conta da Marta (A-08 ok). Falhou o segundo link da mesma cliente na mesma aba (bug).
