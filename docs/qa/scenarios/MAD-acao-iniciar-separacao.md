---
id: MAD-acao-iniciar-separacao
area: MAD
title: Iniciar a separação de um pedido pago
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Iniciar separação leva o pedido de Pago, a separar para Em separação com uma linha de histórico, e com o material na bancada também o põe em produção, uma vez só
entry_points: /pedidos/<id> com status paid → Iniciar separação
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: 
---

Feature `75` (`MAA-06`..`MAA-09`, A5/A6). Dois casos: material `material_recebido` (vai a `em_producao` antes, aviso `in_production`) e pedido sem material (só o status). Material num estado que recusa a transição: o motivo legível de `materialTransitionRefusal`, status intocado (`MAA-09`). Comparar com o painel fazendo "Iniciar produção" + status `separating`.
