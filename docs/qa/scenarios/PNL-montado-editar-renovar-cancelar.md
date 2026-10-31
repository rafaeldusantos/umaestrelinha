---
id: PNL-montado-editar-renovar-cancelar
area: PNL
title: Editar, renovar e cancelar uma proposta aberta
persona: Adri montando uma venda
journey: J-acompanhar-pedidos-montados
expected: Editar mantém o link e sobe a versão (sem mudar não sobe); Renovar dá link novo e avisa que o antigo morreu; Cancelar faz o link dizer indisponível; concluída/cancelada não editam
entry_points: /admin/pedidos/montados/:id
qa_status: pass
bug_ids: BUG-20261031-foco-cai-no-body-ao-renovar-ou-cancelar-proposta
fix_status: fixed
retest_status: pass
fix_commits:
evidence:
last_report: reports/2026-10-31-pedido-montado-reteste.md
overlaps: LOJA-montado-link-morto-ou-mudou
---

LNK-05, LNK-06, HIS-01 (autor como e-mail, nunca uuid), DUP-01.
