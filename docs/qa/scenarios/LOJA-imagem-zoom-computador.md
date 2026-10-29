---
id: LOJA-imagem-zoom-computador
area: LOJA
title: O zoom do computador amplia uma foto de 1600 só depois do ponteiro
persona: Cliente navegando pelo menu
journey: J-ver-a-joia-nitida
expected: Sem ponteiro: zero pedidos width=1600. Com ponteiro: um pedido da foto ativa e a camada nítida. Trocar de foto e voltar o ponteiro: o 1600 da foto nova
entry_points: /produtos/:slug em 1440
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-29-qualidade-das-imagens/87-qa-05-zoom-1440.png
last_report: reports/2026-10-29-qualidade-das-imagens.md
overlaps: 
---

IMG-15, IMG-16. Conferir a nitidez do zoom contra a de antes (720 a 250 %).
