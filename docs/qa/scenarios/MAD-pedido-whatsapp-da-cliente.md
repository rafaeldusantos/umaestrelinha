---
id: MAD-pedido-whatsapp-da-cliente
area: MAD
title: Chamar a cliente no WhatsApp a partir do pedido
persona: Adri no celular
journey: J-ver-um-pedido
expected: O link WhatsApp abre wa.me com o número da cliente normalizado, em nova aba, sem mensagem pronta; sem telefone válido, nem link nem telefone
entry_points: /pedidos/<id> → WhatsApp
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-pedido-abrir-e-entender
---

Feature `74` (`MAP-22`, A21). Verificar o destino do link (número com 55), não só que existe. Abrir o app do WhatsApp de verdade é `blocked-verify`.

Reset em 2026-10-24 (qa-report, feature 76): o BlocoCliente passa a usar whatsappChatUrl e ganha Ver cliente; a rota /clientes/:id entra na aba Clientes.
