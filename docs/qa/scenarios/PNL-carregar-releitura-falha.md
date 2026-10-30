---
id: PNL-carregar-releitura-falha
area: PNL
title: Releitura falhando mantém o pedido
persona: Adri despachando pedidos
journey: J-mudar-pedido-com-ou-sem-aviso
expected: Com a releitura falhando, o pedido continua na tela com o aviso e Tentar de novo
entry_points: /admin/pedidos/:id
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-30-aviso-opcional/06-releitura-falha-390.png
last_report: reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md
overlaps:
---

Feature `88`: CRG-04.
