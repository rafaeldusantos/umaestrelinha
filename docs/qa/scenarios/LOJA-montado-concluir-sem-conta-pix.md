---
id: LOJA-montado-concluir-sem-conta-pix
area: LOJA
title: Concluir o pedido montado sem conta até a tela do PIX
persona: Cliente de luto pelo link
journey: J-concluir-pedido-montado
expected: A página mostra Seu pedido com as peças travadas e o prazo; trocar o número da casa e escolher entrega e PIX leva a /pedido/:id/pagamento com o mesmo total; o pedido nasce com proposal_id e a proposta fica Concluída
entry_points: /pedido-montado#<token>
qa_status: pass
bug_ids: 
fix_status:
retest_status: pass
fix_commits:
evidence:
last_report: reports/2026-10-31-pedido-montado-reteste.md
overlaps: PNL-montado-venda-com-cupom-e-combinado
---

CON-01..CON-06, CON-11, CON-12 (sem conta), PRC-03..PRC-06. Success Criterion: < 2 min até o PIX a 390×844. Sacola estrelinha-cart com outra peça deve continuar intacta.
