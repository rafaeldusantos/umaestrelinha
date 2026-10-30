---
id: PNL-aviso-aviao-envia-depois
area: PNL
title: Enviar depois pelo avião do histórico
persona: Adri despachando pedidos
journey: J-mudar-pedido-com-ou-sem-aviso
expected: Tocar o avião envia o e-mail pulado: o botão mostra o gerúndio e a linha vira o e-mail enviado (ou diz que não saiu)
entry_points: /admin/pedidos/:id
qa_status: pass
bug_ids: BUG-20261030-aviao-que-falha-apaga-a-escolha;BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido
fix_status: fixed
retest_status: pass
fix_commits:
evidence: evidence/2026-10-30-aviso-opcional-reteste/
last_report: reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
overlaps:
---

Feature `88`: AVS-13;AVS-24;CRG-08.
