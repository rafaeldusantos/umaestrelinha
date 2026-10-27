---
id: MAD-envelope-outra-aba-com-folha-aberta
area: MAD
title: O pedido muda em outra aba com a folha aberta
persona: Adri no celular
journey: J-registrar-envelope-da-cliente
expected: Se o pedido deixou de aceitar o código, a folha fecha com Este pedido mudou enquanto você olhava. e o foco no título; se ainda aceita, ela fica com o digitado
entry_points: duas abas no /pedidos/<id>
qa_status: pass
bug_ids: 
fix_status: 
retest_status: 
fix_commits: 
evidence: evidence/2026-10-26-mobile-adm-envelope-da-cliente/s4-aba2-depois-do-recebimento.png;evidence/2026-10-26-mobile-adm-envelope-da-cliente/s7-app-depois-do-painel.png
last_report: reports/2026-10-26-mobile-adm-envelope-da-cliente.md
overlaps: MAD-acao-pedido-mudou-enquanto-olhava
---

Aba 1 registra "Recebi o material" ⇒ aba 2 fecha a folha, alerta "Este pedido mudou…", foco `h1`, cartão "Informado pela cliente há 2 dias · chegou agora". Painel grava o código com a folha do app aberta ⇒ a folha fica com o digitado (Edge Case).
