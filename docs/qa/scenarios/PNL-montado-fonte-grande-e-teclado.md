---
id: PNL-montado-fonte-grande-e-teclado
area: PNL
title: Montar só com teclado e conferir a 390 com fonte grande
persona: Adri montando uma venda
journey: J-montar-pedido-para-a-cliente
expected: A montagem e a proposta funcionam só com teclado, com foco visível e devolvido, e a 390 com 130/200 % nada rola de lado
entry_points: /admin/pedidos/montar; /admin/pedidos/montados/:id
qa_status: fail
bug_ids: BUG-20261031-sem-telefone-rola-de-lado-com-fonte-200; BUG-20261031-variacoes-da-peca-sao-cem-paradas-de-tab; BUG-20261031-foco-cai-no-body-ao-renovar-ou-cancelar-proposta; BUG-20261031-trocar-variacao-solta-o-foco
fix_status: fixed (3 bugs)
retest_status: pass (3 bugs); novo BUG-20261031-trocar-variacao-solta-o-foco
fix_commits:
evidence:
last_report: reports/2026-10-31-pedido-montado-reteste.md
overlaps: LOJA-montado-fonte-grande-e-teclado
---

A T27 consertou cinco pontos a 200 %; reconferir e procurar o resto.
