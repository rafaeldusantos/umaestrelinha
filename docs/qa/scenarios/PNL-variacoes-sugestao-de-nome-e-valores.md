---
id: PNL-variacoes-sugestao-de-nome-e-valores
area: PNL
title: Escolher o nome sugerido e usar os valores do catálogo
persona: Adri cadastrando peças
journey: J-cadastrar-peca-com-variacoes
expected: Digitar "tam" mostra Tamanho; escolher mostra até 3 conjuntos mais usados daquele nome (um toque aplica o conjunto) e os chips, que ficam enquanto sobrar valor não usado (revisto em 2026-10-26, decisão pela recomendação do QA)
entry_points: /admin/produtos/novo; /admin/produtos/:id/editar
qa_status: pass
bug_ids: BUG-20261026-usar-os-valores-junta-o-catalogo-inteiro;BUG-20261026-sugestao-de-valores-some-no-primeiro-clique;BUG-20261026-chips-ocupam-a-tela-depois-do-conjunto
fix_status: fixed
retest_status: pass
fix_commits: working tree, sem commit
evidence: evidence/2026-10-26-opcoes-e-variacoes/81qa-sugestao-nome-390.png;evidence/2026-10-26-opcoes-e-variacoes/81qa-valores-sugeridos-390.png;evidence/2026-10-26-opcoes-e-variacoes-reteste/R1-conjuntos-390.png;evidence/2026-10-26-opcoes-e-variacoes-reteste/R1-conjunto-longo-390.png;evidence/2026-10-26-opcoes-e-variacoes-reteste/R1-conjuntos-1440.png
last_report: reports/2026-10-26-opcoes-e-variacoes-reteste.md
overlaps:
---

OPV-18..20. O nome sugerido funciona; o bloco de valores junta os 50 valores de Tamanho do catálogo inteiro (9..26, mm, cm, P/M/G) e some no primeiro chip. Decisão de produto.

Reteste 2026-10-26: "Tamanho" mostra 3 conjuntos ("6mm, 8mm", "45cm, 50cm", "16, 17, 18", todos em 3 produtos); tocar em "16, 17, 18" cria 3 linhas ativas e o conjunto sai, dando lugar a "P (0,8x0,9cm), M (1x1,1cm)"; os chips ficam sem os usados. O conjunto mais longo de "Cor" embrulha dentro do cartão em 390 (240 × 110). Aberto como decisão: o bloco continua com 936 px depois do conjunto (BUG-20261026-chips-ocupam-a-tela-depois-do-conjunto).
