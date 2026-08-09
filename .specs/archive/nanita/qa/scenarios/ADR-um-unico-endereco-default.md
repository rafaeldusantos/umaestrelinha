---
id: ADR-um-unico-endereco-default
area: ADR
title: Editar o endereço não cria um segundo default
persona: Marina
journey: J-recompra-endereco-salvo
expected: count(*) em addresses com is_default=true para o customer segue 1 antes e depois de editar
entry_points: http://localhost:8080/checkout
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: 
---

Prova no banco. Cobre a policy de UPDATE em `addresses` criada pela 08 — e o fato de que RLS negando
devolve 0 linhas sem erro.
