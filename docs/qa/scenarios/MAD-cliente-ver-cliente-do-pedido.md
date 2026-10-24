---
id: MAD-cliente-ver-cliente-do-pedido
area: MAD
title: Do pedido à cliente pelo Ver cliente
persona: Adri no celular
journey: J-ver-uma-cliente
expected: Ver cliente (44 px) resolve a pessoa por leitura pareada, mostra espera sem sair do lugar, e abre a ficha certa; pessoa não achada diz Não encontrei esta cliente. na linha e não navega; vale para convidada e para conta
entry_points: /pedidos/<id> → Ver cliente
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: MAD-pedido-abrir-e-entender
---

Feature `76` (`MAC-21`, A11. O id da convidada é derivado no banco (md5 do e-mail): conferir que a ficha aberta é a do e-mail do pedido. Toque duplo = uma navegação. Voltar da ficha leva ao pedido.)
