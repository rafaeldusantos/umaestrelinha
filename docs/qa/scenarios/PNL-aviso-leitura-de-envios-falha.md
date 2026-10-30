---
id: PNL-aviso-leitura-de-envios-falha
area: PNL
title: Leitura dos envios falhando na página do pedido
persona: Adri despachando pedidos
journey: J-mudar-pedido-com-ou-sem-aviso
expected: Observar o que a página faz quando order_notifications falha (decisão aberta da 88)
entry_points: /admin/pedidos/:id
qa_status: pass
bug_ids: BUG-20261030-leitura-de-envios-falha-em-silencio
fix_status: fixed
retest_status: pass
fix_commits:
evidence: evidence/2026-10-30-aviso-opcional-reteste/
last_report: reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
overlaps:
---

Feature `88`: A-01;A-09.
