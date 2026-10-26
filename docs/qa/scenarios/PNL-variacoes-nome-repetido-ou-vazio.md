---
id: PNL-variacoes-nome-repetido-ou-vazio
area: PNL
title: Repetir o nome de uma opção e apagar o nome de outra
persona: Adri cadastrando peças
journey: J-cadastrar-peca-com-variacoes
expected: Nome repetido mostra a recusa e a grade não muda; nome apagado não perde linha
entry_points: /admin/produtos/novo; /admin/produtos/:id/editar
qa_status: pass
bug_ids: BUG-20261026-conta-do-cruzamento-com-nome-vazio
fix_status: fixed
retest_status: pass
fix_commits: working tree, sem commit
evidence: 
last_report: reports/2026-10-26-opcoes-e-variacoes-reteste.md
overlaps:
---

OPV-23, OPV-24. Com o nome apagado o resumo dizia "3 × 2 × 1 = 2 variações" — consertado.

Reteste 2026-10-26: nome do Aro apagado → "2 = 2 variações" com as 6 linhas mantidas; de volta → "3 × 2 = 6"; "aro" na segunda opção → "Já existe uma opção com este nome." e a grade não muda.
