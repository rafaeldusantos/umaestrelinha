---
id: PNL-aviso-teclado-e-leitor
area: PNL
title: Teclado e leitor de tela nos diálogos e no avião
persona: Adri despachando pedidos
journey: J-mudar-pedido-com-ou-sem-aviso
expected: O foco entra no diálogo e volta ao botão de origem; a região viva anuncia o gerúndio e o resultado; o avião tem nome acessível
entry_points: /admin/pedidos/:id
qa_status: fail
bug_ids: BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido;BUG-20261030-recebi-o-material-sem-o-pedido-no-nome;BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar;BUG-20261026-fechar-do-modal-em-ingles
fix_status: fixed
retest_status: fail
fix_commits:
evidence: evidence/2026-10-30-aviso-opcional-reteste/
last_report: reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
overlaps:
---

Feature `88`: CRG-09;AVS-12.
