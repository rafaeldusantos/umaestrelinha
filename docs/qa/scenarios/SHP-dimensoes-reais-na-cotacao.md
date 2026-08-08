---
id: SHP-dimensoes-reais-na-cotacao
area: SHP
title: Cotação usa peso e dimensoes reais do produto, não os fallbacks
persona: Marina
journey: J-frete-real-melhor-envio
expected: Produto com weight_kg/width_cm cadastrados produz cotação diferente de produto sem
entry_points: http://localhost:8080/checkout
qa_status: blocked-verify
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence:
last_report: ../reports/2026-07-28-checkout-08-09.md
overlaps: 
---

Os mappers de produto descartavam `weight_kg`/`width_cm`/`height_cm`/`length_cm`, entao a cotação
'real' saia sempre com os fallbacks 11/2/16/0,1 — **frete errado com cara de certo**.

Não dá para verificar isso olhando a tela: precisa comparar duas cotações, uma com dimensao cadastrada
e outra sem, e ver que os valores diferem.
