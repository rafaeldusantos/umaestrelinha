---
id: BLK-grade-rapida-colar-e-criar
area: BLK
title: Colar 8 linhas do Excel e criar só as válidas, herdando os padrões do lote
persona: Nana
journey: J-cadastrar-lote-grade-rapida
expected: Colar com ⌘V distribui as linhas em células aplicando as máscaras pt-BR; o rodapé mostra "7 prontas · 1 com erro"; criar gera só as 7, como rascunho, com a grade do cruzamento dos padrões herdando o preço da linha, e mantém a linha com erro na tela
entry_points: http://localhost:8081/admin/produtos/grade-rapida
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PLS-07` (P2.3 AC 1-9). O happy path do drop: 20 itens numa tela em vez de 20 formulários.

A herança dos padrões é onde o silêncio é caro — se um padrão não é aplicado, o produto nasce sem
categoria ou sem grade e ninguém vê, porque a linha **foi** criada. Conferir no banco o que herdou:
`product_categories`, `products.options` e `product_variants`.
