---
id: PNL-lote-cartao-do-celular
area: PNL
title: Registrar recebimento pelo cartão do celular
persona: Adri despachando pedidos
journey: J-avancar-pedidos-em-lote
expected: No cartão do celular a pergunta aparece, só aquele cartão mostra o estado, e o resultado vem em aviso
entry_points: /admin/pedidos (barra de lote, cartão do celular)
qa_status: pass
bug_ids: BUG-20261030-recebi-o-material-sem-o-pedido-no-nome
fix_status: fixed
retest_status: pass
fix_commits:
evidence: evidence/2026-10-30-aviso-opcional-reteste/
last_report: reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
overlaps:
---

Feature `88`: AVS-21.
