---
id: PNL-variacoes-remover-valor-vendido-pausa
area: PNL
title: Remover o valor de uma variação vendida e de uma sem pedido
persona: Adri cadastrando peças
journey: J-cadastrar-peca-com-variacoes
expected: A sem pedido sai; a vendida fica pausada e o aviso a nomeia
entry_points: /admin/produtos/novo; /admin/produtos/:id/editar
qa_status: pass
bug_ids: BUG-20261026-valor-devolvido-volta-pausado;BUG-20261026-aviso-de-pausa-continua-depois-de-reativar
fix_status: fixed
retest_status: pass
fix_commits: working tree, sem commit
evidence: evidence/2026-10-26-opcoes-e-variacoes/81qa-orfa-vendida-390.png;evidence/2026-10-26-opcoes-e-variacoes-reteste/R3-frase-da-pausa-390.png;evidence/2026-10-26-opcoes-e-variacoes-reteste/R3-reativada-sem-aviso-390.png
last_report: reports/2026-10-26-opcoes-e-variacoes-reteste.md
overlaps:
---

OPV-04, OPV-25. Produto 229afd74 (Prata 925 com 1 pedido): pausada + "Estas variações já foram vendidas e ficaram pausadas: Prata 925."; Folheado a Ouro (0 pedidos) saiu. Devolver o valor traz a linha de volta pausada e o aviso continua — decisão de produto.

Reteste 2026-10-26 (a789c7aa, "Folheado a Ouro" com 1 pedido): a frase nova aparece literal, devolver o valor mantém a linha pausada. Ligar "Ativa" deixava o aviso na tela (BUG-20261026-aviso-de-pausa-continua-depois-de-reativar), consertado e retestado: o aviso some.
