---
id: PRD-slug-mora-so-em-seo
area: PRD
title: O slug tem um único campo, na aba SEO, e Geral só mostra a URL
persona: Nana
journey: J-mudar-url-sem-quebrar-link
expected: A aba Geral exibe a URL como linha de leitura com o link "Editar em SEO →" e nenhum campo editável de slug; o campo "URL personalizada" existe só na aba SEO
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

`PFM-02` (P1.5 AC 1). Antes havia **dois** campos editáveis para o mesmo dado (Geral e SEO) — a lojista
editava um e o outro sobrescrevia.

Conferir também que a URL exibida usa o domínio certo (`nanita.com.br`): o `STORE_URL_PREFIX` do
`SlugField` mostrava `nanapin.com.br` até o rebrand, ou seja mostrava à lojista uma URL pública que não
existe.
