---
id: PNL-variacoes-salvar-e-reabrir-sem-mudar
area: PNL
title: Salvar a peça nova e reabrir
persona: Adri cadastrando peças
journey: J-cadastrar-peca-com-variacoes
expected: O banco tem uma linha por combinação, com posições únicas, e reabrir não suja o formulário
entry_points: /admin/produtos/novo; /admin/produtos/:id/editar
qa_status: pass
bug_ids: BUG-20261026-posicao-repetida-na-grade
fix_status: fixed
retest_status: pass
fix_commits: working tree, sem commit
evidence: 
last_report: reports/2026-10-26-opcoes-e-variacoes-reteste.md
overlaps:
---

OPV-08. Reaberto sem "Alterações não salvas" e com as 6 linhas. O banco tinha posições 0, 1, 3, 4, 4, 5 — consertado em syncGrid; o reteste é por teste de unidade e pela grade em navegador (o produto de teste foi apagado).

Reteste 2026-10-26: tirar e devolver "16" e salvar → posições 1, 2, 4, 5, 6, 7 no banco (únicas); reaberto com sessionStorage limpo, sem "Alterações não salvas" e as mesmas 6 linhas.
