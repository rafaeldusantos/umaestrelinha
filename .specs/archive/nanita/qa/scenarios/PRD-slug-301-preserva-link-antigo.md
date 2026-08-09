---
id: PRD-slug-301-preserva-link-antigo
area: PRD
title: Mudar o slug de produto publicado com 301 mantém o link do Stories vivo
persona: Marina
journey: J-mudar-url-sem-quebrar-link
expected: Ao alterar o slug de um produto publicado aparece aviso âmbar de 301 com toggle ligado por padrão; depois de salvar, abrir a URL antiga na loja (celular, aba nova) chega à página do produto
entry_points: http://localhost:8081/admin/produtos/:id/editar; http://localhost:8080/produto/<slug-antigo>
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PFM-04` (P1.5 AC 6-7) na gravação + `PST-07` (feature `07`) na resolução. Único cenário de backoffice
cuja prova final é **mobile**: o link divulgado é do Stories e o clique real acontece no navegador do
Instagram.

Inclui a regra sutil do AC 9: se o slug novo já estava em `product_redirects` apontando para outro
produto, o registro conflitante é removido — slug ativo vence redirect, senão um produto vivo fica
inalcançável.
