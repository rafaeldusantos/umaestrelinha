---
id: LST-visoes-filtros-e-busca
area: LST
title: Visões com contagem, filtros em chips e busca que cobre SKU e tag
persona: Nana
journey: J-achar-e-corrigir-na-listagem
expected: As visões (Todos, Ativos, Rascunhos, Sem estoque, Sem imagem, Sem SEO, Agendados) filtram e mostram contagem; cada filtro ativo é um chip com valor e × que o remove; e a busca acha por nome, SKU de variação e tag
entry_points: http://localhost:8081/admin/produtos
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PLS-02` (P2.1 AC 3-6). Buscar por SKU de variação é o que a lojista faz com a etiqueta na mão — e é a
parte da busca que exige join, logo a que mais provavelmente ficou de fora.

`Salvar visão atual` persiste em `localStorage` por navegador (`A22`) — não é tabela, então não sobrevive
a outro navegador, e isso é declarado, não bug.

Dívida declarada que não é achado: a visão `Sem estoque` para produto com grade depende de uma view no
Postgres que a `13` deixou aberta e a `14` manteve declarada.
