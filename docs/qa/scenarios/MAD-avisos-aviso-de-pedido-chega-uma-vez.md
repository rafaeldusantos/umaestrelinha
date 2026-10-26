---
id: MAD-avisos-aviso-de-pedido-chega-uma-vez
area: MAD
title: O aviso do pedido pago chega uma vez
persona: Adri no celular
journey: J-receber-aviso-de-pedido
expected: Dois disparos de payment_approved no mesmo pedido dão UM aviso Pedido #NNNN pago / R$ valor; na tela de bloqueio só número e valor; com o evento desligado, nenhum
entry_points: Chrome real e Android, gatilho pelo servidor
qa_status: blocked-verify
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-25-mobile-adm-avisos-no-celular.md
overlaps:
---

Feature `79` (MAN-01, MAN-05, MAN-08). Só num Chrome com FCM ou no Android real: o Playwright dubla o push e não prova a chegada.
