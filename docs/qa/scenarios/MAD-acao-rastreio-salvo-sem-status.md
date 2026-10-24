---
id: MAD-acao-rastreio-salvo-sem-status
area: MAD
title: Ver o código salvo e o pedido não marcado como enviado, e tentar de novo
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Com o status falhando depois do rastreio, a tela diz O código ficou salvo, mas o pedido não foi marcado como enviado. e Tentar de novo grava só o status, com um aviso de postagem só
entry_points: folha Marcar como enviado → Salvar com o PATCH do status falhando
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: 
---

Feature `75` (`MAA-15`). A guarda do rastreio (A25) restringe este estado a falha de rede/5xx no segundo passo ou à corrida entre os dois passos. Forçar por interceptação do segundo PATCH.
