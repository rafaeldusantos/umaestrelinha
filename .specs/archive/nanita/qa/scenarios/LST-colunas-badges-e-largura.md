---
id: LST-colunas-badges-e-largura
area: LST
title: Colunas Produto e Status com badges, menu Colunas e a tela usando a janela inteira
persona: Nana
journey: J-achar-e-corrigir-na-listagem
expected: A coluna Produto mostra thumb, nome, contagem de variações, slug e badges de pendência (sem imagem, grade incompleta); Status mostra Ativo/Esgotado/Rascunho ou a data de agendamento; o menu Colunas mostra/oculta e alterna densidade; Novo produto ▾ oferece as 3 portas; e a listagem ocupa a largura da janela em 1920 px
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

`PLS-04` AC 11-12 + `PLS-09` AC 13-14 + `RFN-08` AC 2. O `max-w-6xl` era herança de quando a listagem
tinha 5 colunas; hoje tem 8 e a tabela apertava enquanto sobrava tela dos dois lados.

O badge `grade incompleta` vem de `PST-10` (feature `07`) e é o que avisa que um produto tem variação
ativa sem preço — a ponte entre esta tela e `PRD-linha-sem-preco-nao-vende`.
