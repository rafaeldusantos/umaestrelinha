---
id: MAD-acao-marcar-como-enviado
area: MAD
title: Salvar o rastreio no balcão do correio e marcar como enviado
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: A folha Marcar como enviado aceita o código, grava rastreio e depois status shipped com uma linha de histórico, dispara um aviso de postagem, fecha só depois do sucesso, e a transportadora do pedido fica intacta
entry_points: /pedidos/<id> em separating, entrega por transportadora → Marcar como enviado
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: 
---

Feature `75` (`MAA-10`, `MAA-13`, A7/A9/A23/A25). A frase da folha é a sem código anterior ("A cliente recebe o e-mail de postagem assim que você salvar o código."). Conferir `tracking_code`, `shipping_carrier` **inalterado**, `status`, a linha `separating → shipped` e **um** `order_shipped` em `order_notifications`. O campo abre com o teclado de texto em maiúsculas, nunca numérico.
