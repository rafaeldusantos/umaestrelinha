---
id: PNL-aviso-fechar-sem-gravar
area: PNL
title: Fechar o diálogo sem gravar
persona: Adri despachando pedidos
journey: J-mudar-pedido-com-ou-sem-aviso
expected: Voltar, Esc e clique fora não gravam nada; no Outro status o seletor volta ao vazio
entry_points: /admin/pedidos/:id
qa_status: pass
bug_ids: BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido
fix_status: fixed
retest_status: pass
fix_commits:
evidence: evidence/2026-10-30-aviso-opcional-reteste/
last_report: reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
overlaps:
---

Feature `88`: AVS-05.
