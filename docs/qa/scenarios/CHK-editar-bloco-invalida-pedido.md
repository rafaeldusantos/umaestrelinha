---
id: CHK-editar-bloco-invalida-pedido
area: CHK
title: Editar um bloco depois de criar o pedido invalida o pedido
persona: Rui
journey: J-retomar-pagamento-falho
expected: Retentativa sem edicao reusa o order_id; com edicao, o próximo CTA cria um pedido novo
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

CHK-08. Existe porque `orders` não tem policy de UPDATE para `authenticated`: um bloco editado não
persistiria e a function cobraria o frete/endereço antigos.

Os dois caminhos precisam ser andados separadamente — é facil provar um e assumir o outro.
