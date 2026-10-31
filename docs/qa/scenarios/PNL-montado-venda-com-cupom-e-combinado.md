---
id: PNL-montado-venda-com-cupom-e-combinado
area: PNL
title: Montar venda de duas peças com cupom e desconto combinado
persona: Adri montando uma venda
journey: J-montar-pedido-para-a-cliente
expected: O resumo mostra subtotal, cupom, desconto combinado e total iguais ao gravado em order_proposals, e Criar link abre a proposta Aberta com o link
entry_points: /admin/pedidos → Montar pedido
qa_status: pass
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-31-pedido-montado.md
overlaps: LOJA-montado-concluir-sem-conta-pix
---

MON-01, MON-05, MON-07..MON-09, MON-11, PRC-01. Independent Test da spec. Cronometrar contra o Success Criterion (< 3 min em 1440).
