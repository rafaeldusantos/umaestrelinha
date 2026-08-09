---
id: CAT-criar-inline-sem-perder-rascunho
area: CAT
title: Criar categoria pelo formulário do produto já a deixa marcada, sem perder o rascunho
persona: Nana
journey: J-organizar-categorias
expected: Buscar uma categoria inexistente no formulário do produto oferece "Criar categoria <termo>" (⌘⏎); o diálogo curto salva, a nova categoria já vem marcada no produto, e nada do rascunho do produto se perde
entry_points: http://localhost:8081/admin/produtos/novo
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps: PRD-taxonomia-nao-suja
---

`PFM-05` AC 3. É o caminho real do cadastro: a lojista descobre no meio do formulário que a categoria do
drop novo não existe. Perder o rascunho aqui custa o cadastro inteiro.

Edge case declarado: se ela cria a categoria e desiste do produto, a categoria **permanece** — é objeto
próprio, e o comportamento previsível é melhor que um rollback surpresa.
