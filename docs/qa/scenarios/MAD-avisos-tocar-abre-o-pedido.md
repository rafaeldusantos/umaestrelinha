---
id: MAD-avisos-tocar-abre-o-pedido
area: MAD
title: Tocar o aviso abre o pedido
persona: Adri no celular
journey: J-receber-aviso-de-pedido
expected: Tocar o aviso abre /pedidos/<id> (foca a janela aberta ou abre uma); com a sessão vencida, o login volta ao pedido depois de entrar
entry_points: toque no aviso
qa_status: blocked-verify
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-25-mobile-adm-avisos-no-celular.md
overlaps:
---

Feature `79` (MAN-03, MAN-21). Só num Chrome com FCM ou no Android real: o Playwright dubla o push e não prova a chegada.
