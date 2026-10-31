---
id: LOJA-montado-token-fora-de-tudo
area: LOJA
title: Conferir que o token do link não vaza
persona: Cliente de luto pelo link
journey: J-concluir-pedido-montado
expected: O fragmento sai da barra, o token fica só em sessionStorage, não aparece em nenhuma URL, cabeçalho ou outra requisição além do corpo do get-proposal, e a página é noindex
entry_points: /pedido-montado#<token>
qa_status: pass
bug_ids: BUG-20261031-link-novo-na-mesma-aba-mostra-o-antigo
fix_status: fixed
retest_status: pass
fix_commits:
evidence:
last_report: reports/2026-10-31-pedido-montado-reteste.md
overlaps: 
---

SEG-02, SEG-03. Ler o meta robots servido e o sitemap.

2026-10-31: em 1.234 requisições do contexto, o token apareceu só no corpo de `get-proposal` e `create-order`; nunca em URL, cabeçalho, `localStorage`. Exceção: navegar para um link novo na mesma aba deixa o token novo na barra (bug).
