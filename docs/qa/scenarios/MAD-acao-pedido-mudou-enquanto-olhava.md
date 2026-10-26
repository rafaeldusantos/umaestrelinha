---
id: MAD-acao-pedido-mudou-enquanto-olhava
area: MAD
title: Agir num pedido que o painel mudou com a tela aberta
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Com o pedido mudado no painel, a ação não grava nada e a tela diz Este pedido mudou enquanto você olhava., relê, e o rodapé mostra a ação do estado novo; uma folha aberta para uma ação que deixou de valer fecha com a mesma frase
entry_points: /pedidos/<id> aberto no celular + /admin/pedidos/<id> no painel
qa_status: fail
bug_ids: [BUG-20261024-tentar-de-novo-diz-falha-sem-tentar]
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: MAD-pedido-muda-com-a-tela-aberta
---

Feature `75` (`MAA-21`, `MAA-26`, A4/A25). Casos: cancelar no painel com a folha Marcar como enviado aberta (nada gravado, nem o código); mudar o status no painel e tocar o rodapé antes do Realtime chegar; Realtime chegando com a folha aberta.
