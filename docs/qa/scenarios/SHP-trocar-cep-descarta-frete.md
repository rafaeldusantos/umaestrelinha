---
id: SHP-trocar-cep-descarta-frete
area: SHP
title: Trocar o CEP depois de escolher o frete descarta a seleção
persona: Rui
journey: J-frete-real-melhor-envio
expected: Seleção zerada, shipping_cost volta a 0, CTA desabilita e o pedido em curso é invalidado
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

Nunca cobrar o frete de um CEP antigo. Cobre também a corrida: resposta de uma cotação anterior
chegando depois não pode sobrescrever o resultado do CEP novo.
