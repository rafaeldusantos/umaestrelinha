---
id: PRD-slug-disponibilidade-antes-do-save
area: PRD
title: Slug duplicado é detectado enquanto se digita, não no insert
persona: Nana
journey: J-mudar-url-sem-quebrar-link
expected: Digitar um slug existente mostra "Já existe" em vermelho com sugestão de sufixo e bloqueia o Salvar apontando o campo; um slug livre mostra "Disponível" em verde, com debounce (a consulta não roda a cada tecla)
entry_points: http://localhost:8081/admin/produtos/:id/editar
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PFM-03` (P1.5 AC 4-5). O defeito 15: o slug duplicado só falhava quando o `UNIQUE` do banco estourava,
virando o toast genérico "Erro ao salvar produto" — depois de a lojista ter preenchido a tela inteira.

O debounce faz parte do requisito: sem ele são N consultas por palavra digitada.
