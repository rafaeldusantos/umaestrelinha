---
id: SHP-opcoes-com-data-de-entrega
area: SHP
title: Cada opção de envio mostra transportadora, preço e data
persona: Marina
journey: J-frete-real-melhor-envio
expected: Opções mostram data ('Chega entre 4 e 6 de agosto'), nunca prazo generico em dias
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

Antes da 08 os três prazos eram string fixa ('6-10 dias uteis'). A data é
`hoje + handling_days + delivery_range` em dias uteis (seg-sex).

No mobile cada linha de opção tem radio + transportadora + preço: conferir que a linha não estoura
a largura nem embrulha o nome do serviço.
