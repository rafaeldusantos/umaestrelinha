---
id: MAD-acao-marcar-como-retirado
area: MAD
title: Marcar como retirado um pedido de retirada no escritório
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Um pedido de retirada em separação mostra Marcar como retirado (nunca rastreio nem Marcar como enviado) e grava entregue com uma linha de histórico
entry_points: /pedidos/<id> de retirada em separating → Marcar como retirado
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: 
---

Feature `75` (`MAA-16`, `MAA-38`, A14/A16, G7). Em nenhum status a retirada mostra folha, "Informar/Alterar" ou "Marcar como enviado" — nem no rodapé, nem na Entrega, nem no cartão. O painel continua com o comportamento dele.
