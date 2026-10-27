---
id: MAD-envelope-informar-codigo
area: MAD
title: Registrar o código que a cliente mandou pelo WhatsApp
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: Informar código do envelope grava pela RPC, o aviso diz que o pedido passou para A caminho, e o pedido relido mostra o código com Registrado por você agora
entry_points: /pedidos/<id> aguardando_material sem código → Informar código do envelope
qa_status: pass
bug_ids: 
fix_status: 
retest_status: 
fix_commits: 
evidence: evidence/2026-10-26-mobile-adm-envelope-da-cliente/s2-codigo-invisivel.png
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: 
---

Feature `82` (`ENV-01`..`ENV-08`). P82-A: rede `set_material_tracking` → `send-notification?action=trigger` (`material_tracking_set`) → releitura; aviso em 1,7 s; foco no `h1` (o botão sumiu). Banco: `material_enviado`, `set_by = admin`. Histórico com "Você registrou o rastreio do envelope".
