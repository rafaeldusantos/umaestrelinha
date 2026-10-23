---
id: MAD-navegar-pelas-quatro-abas
area: MAD
title: Navegar pelas quatro abas e voltar com o botão do Android
persona: Adri no celular
journey: J-entrar-no-atelie
expected: Cada aba abre com o título e a marcação de atual; o voltar retorna à anterior; na raiz sai do app
entry_points: /; /pedidos; /clientes; /descontos
qa_status: pass
bug_ids: BUG-20261022-menu-da-conta-nao-fecha
fix_status: fixed
retest_status: pass
fix_commits: working tree, sem commit
evidence: evidence/2026-10-22-mobile-adm-fundacao-reteste/R5-menu-aberto.png; evidence/2026-10-22-mobile-adm-fundacao-reteste/R10-aba-inicio-foco.png
last_report: reports/2026-10-23-mobile-adm-inicio-reteste-2.md
overlaps: 
---

A saída do app pelo voltar na raiz é `blocked-verify` (aparelho); em navegador mede-se a volta entre abas.

Canary 2026-10-23 (reteste 2 da Início): três abas e o voltar ×3 devolveram `/clientes`, `/pedidos`, `/`, com
a Início relida e sem erro no console.
