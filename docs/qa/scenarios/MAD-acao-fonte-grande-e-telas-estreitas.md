---
id: MAD-acao-fonte-grande-e-telas-estreitas
area: MAD
title: Usar as ações com letra grande em telas de 360 a 412
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Em 360, 390 e 412 px e com a fonte a 130 % e 200 %, o rodapé fica acima das abas sem cobrir o último bloco, folha, botão do cartão e confirmação quebram sem sobrepor nem cortar, todo alvo tem 44 px e o body não rola para o lado
entry_points: /pedidos/<id> com rodapé; folha do rastreio; /pedidos com botão no cartão
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: MAD-pedidos-fonte-grande-e-telas-estreitas
---

Feature `75` (`MAA-31`, `MAA-33`). Nome de cliente de 56 caracteres (fixtura N2 da prova). Medir `scrollWidth`, sobreposição por `getBoundingClientRect` e o último bloco rolável acima do rodapé.
