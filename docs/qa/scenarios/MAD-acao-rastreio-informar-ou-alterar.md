---
id: MAD-acao-rastreio-informar-ou-alterar
area: MAD
title: Informar ou alterar o rastreio de um pedido já enviado ou entregue
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Informar/Alterar na Entrega abre a folha com o título e a frase certos para cada par status × código, grava só o código, e a confirmação nunca promete e-mail de postagem que não vai sair
entry_points: /pedidos/<id> shipped ou delivered → Entrega → Informar ou Alterar
qa_status: fail
bug_ids: [BUG-20261024-folha-afirma-aviso-que-falhou]
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: 
---

Feature `75` (`MAA-11`, `MAA-14`, A10/A10b/A11). Os quatro casos: `shipped` sem código (Salvar rastreio, frase da postagem), `shipped` com código (Alterar, "…não gera outro e-mail."), `delivered` sem e com código ("O código aparece no pedido dela.", confirmação "Rastreio salvo." sem e-mail). Alterar para o mesmo código: confirma sem citar e-mail. Conferir que "Alterar" num `shipped` com código não cria um segundo `order_shipped`.
