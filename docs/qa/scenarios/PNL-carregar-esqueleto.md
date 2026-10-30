---
id: PNL-carregar-esqueleto
area: PNL
title: Abrir o pedido e a lista com esqueleto
persona: Adri despachando pedidos
journey: J-mudar-pedido-com-ou-sem-aviso
expected: Primeira abertura do pedido e da lista mostra esqueleto com a grade, nunca Carregando...
entry_points: /admin/pedidos/:id
qa_status: pass
bug_ids: BUG-20261030-lista-diz-nada-esperando-enquanto-carrega
fix_status: fixed
retest_status: pass
fix_commits:
evidence: evidence/2026-10-30-aviso-opcional-reteste/
last_report: reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
overlaps:
---

Feature `88`: CRG-06;CRG-13.
