---
id: BLK-massa-desfazer-de-30s
area: BLK
title: Desfazer de 30 s devolve os valores anteriores, e falha parcial é relatada honestamente
persona: Nana
journey: J-reprecificar-em-massa
expected: Aplicar mostra toast "X alterados (· Y falharam)" com Desfazer · 30 s; o desfazer restaura os valores capturados antes da escrita apenas nos itens efetivamente alterados; e depois de 30 s ou de um reload o desfazer desaparece
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

`PLS-06` AC 9-11 (`A23`). Não existe `undo` transacional: é um segundo `update` com o snapshot
pré-escrita. Logo o caso que importa é o **parcial** — se 9 de 12 mudaram, o desfazer cobre 9.

O buffer viver em memória e sumir no reload é declarado (`A23`), não bug. Estoque com produtos de
`stock_policy = 'none'` na seleção: eles são ignorados **e** a tela diz quantos (AC 5).
