---
id: MED-imagem-por-variacao-na-loja
area: MED
title: A variação com imagem própria troca a foto em destaque na loja
persona: Marina
journey: J-foto-e-alt-do-produto
expected: Apontar uma imagem da galeria para a variação faz a página do produto trocar a imagem em destaque ao escolher aquela combinação; variação sem imagem própria usa a principal; e remover da galeria uma imagem usada por variação faz a variação voltar à principal, sem referência quebrada
entry_points: http://localhost:8081/admin/produtos/:id/editar; http://localhost:8080/produto/<slug>
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PMD-06` + `PFM-17` (P3.2 AC 1-3). O selo `Mockup` (`PMD-03`, `images[].source`) é conferido na mesma
passada: imagem vinda do estúdio mostra o selo, enviada à mão não.

Marina no celular é quem fecha: é lá que a troca de imagem acontece de verdade.
