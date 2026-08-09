---
id: PRD-cadastro-com-grade-happy
area: PRD
title: Cadastrar produto com 2 eixos e preço por linha, até aparecer na loja
persona: Nana
journey: J-cadastrar-produto-com-grade
expected: O produto publicado aparece em /produto/<slug> com os dois seletores, a faixa "a partir de R$ X" e o preço da combinação escolhida igual ao gravado em product_variants
entry_points: http://localhost:8081/admin/produtos/novo
qa_status: pass
bug_ids: BUG-20260802-loja-nao-mostra-nenhum-produto
fix_status: fixed
retest_status: pass
fix_commits: eca8b64
evidence: docs/qa/evidence/2026-08-02-backoffice-catalogo-11-14/loja-produto-nao-encontrado.png
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

A walk completa da feature `11`: 5 abas (`PFM-01`), eixos livres com presets e teto de 3 (`PFM-07`),
grade com preço absoluto por linha agrupada pelo 1º eixo e rodapé `N variações · faixa R$ X – Y · Z un.`
(`PFM-08` AC 7-8, 13), aviso de precedência da grade sobre o preço padrão (`PFM-15`).

Só está andado quando a loja mostra o resultado — o preço cobrado é recalculado no servidor a partir de
`product_variants.price`, então uma grade gravada que a vitrine não lê é produto que existe e não vende.
Conferir a linha no banco, não a tela (`AD-012`).
