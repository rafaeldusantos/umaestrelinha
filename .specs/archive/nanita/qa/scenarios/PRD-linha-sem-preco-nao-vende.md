---
id: PRD-linha-sem-preco-nao-vende
area: PRD
title: Variação ativa sem preço marca a linha e bloqueia o publicar
persona: Nana
journey: J-cadastrar-produto-com-grade
expected: A linha ativa sem preço fica com borda de erro e a frase "sem preço a variação não entra na loja", Salvar e publicar é bloqueado, e o rodapé calcula a faixa só sobre linhas ativas com preço
entry_points: http://localhost:8081/admin/produtos/:id/editar
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PFM-08` AC 11 + 13. É a pendência mais provável no uso real: a lojista gera 6 linhas e preenche 5.

A regra vem da `07`/T2, que decidiu que variação sem preço **nasce pausada e não vendável** — porque
ativa e sem preço a loja mostraria a combinação, a cliente compraria, e o servidor cairia no fallback
de `base_price`. Undercharge esperando acontecer.
