---
id: PAY-cpf-persistido-e-preenchido
area: PAY
title: CPF é salvo e volta preenchido na compra seguinte
persona: Marina
journey: J-recompra-endereco-salvo
expected: customers.cpf gravado após a compra; no checkout seguinte o campo já vem preenchido
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

Prova no banco, não na tela. `.update()` no Supabase **não lanca quando a RLS nega** — devolve 0 linhas
sem `error`. Uma tela dizendo 'salvo' não prova nada; conferir `SELECT cpf FROM customers`.
