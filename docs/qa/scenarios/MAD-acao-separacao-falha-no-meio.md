---
id: MAD-acao-separacao-falha-no-meio
area: MAD
title: Ver a produção registrada e o status não, e tentar de novo
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Com o status falhando depois do material, a tela diz A produção ficou registrada, mas o pedido não passou para separação., e Tentar de novo grava só o status, sem segundo aviso
entry_points: /pedidos/<id> paid + material_recebido → Iniciar separação com a escrita de orders falhando
qa_status: fail
bug_ids: [BUG-20261024-tentar-de-novo-diz-falha-sem-tentar]
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: 
---

Feature `75` (`MAA-40`, G2). Forçar a falha do segundo passo (rota interceptada para o PATCH de `orders`, ou o status mudado no banco entre os dois passos). Conferir que `order_notifications` não ganha um segundo `in_production` e que nada é dito como concluído.
