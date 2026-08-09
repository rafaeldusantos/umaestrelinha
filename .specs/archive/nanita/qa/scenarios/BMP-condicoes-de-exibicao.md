---
id: BMP-condicoes-de-exibicao
area: BMP
title: Order bump só aparece quando as quatro condições valem
persona: Marina
journey: J-bump-exibido-cobrado
expected: Some quando desligado, produto inexistente, stock_total = 0, ou produto já no carrinho
entry_points: http://localhost:8080/checkout
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: 
---

Os quatro casos negativos, um por um. O de 'ja' no carrinho' tem uma consequência deliberada: o servidor
**ainda desconta** por `product_id`, entao esse item sai com o desconto configurado. Conferir que é
isso que acontece, e não um erro.
