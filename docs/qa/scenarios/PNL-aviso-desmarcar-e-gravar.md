---
id: PNL-aviso-desmarcar-e-gravar
area: PNL
title: Desmarcar a caixa e gravar sem avisar
persona: Adri despachando pedidos
journey: J-mudar-pedido-com-ou-sem-aviso
expected: Com a caixa desmarcada a mudança grava, a chamada leva customer:false e o Histórico mostra 'Aviso à cliente não enviado' com o avião
entry_points: /admin/pedidos/:id
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-30-aviso-opcional-reteste/
last_report: reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
overlaps:
---

Feature `88`: AVS-04;AVS-10;AVS-12.
