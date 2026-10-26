---
id: MAD-acao-aviso-falha-gravacao-vale
area: MAD
title: Salvar uma ação com o envio do e-mail falhando
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Com a send-notification falhando, a gravação vale, não aparece erro, e a confirmação não diz que a cliente recebeu e-mail
entry_points: /pedidos/<id> → Recebi o material ou Marcar como enviado com send-notification em erro
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: 
---

Feature `75` (`MAA-24`, A11/A12, `AD-008`). O histórico do pedido mostra a falha do aviso (frase da `74`, B03), não "enviado".
