---
id: PNL-variacoes-imagem-na-linha-e-envio
area: PNL
title: Escolher e enviar a foto da variação pela linha
persona: Adri cadastrando peças
journey: J-cadastrar-peca-com-variacoes
expected: Botão 48 px na linha; modal com as fotos e "Usar a principal"; o envio entra na Mídia e fica escolhido
entry_points: /admin/produtos/novo; /admin/produtos/:id/editar
qa_status: pass
bug_ids: BUG-20261026-fechar-do-modal-em-ingles
fix_status: pending
retest_status: 
fix_commits: 
evidence: evidence/2026-10-26-opcoes-e-variacoes/81qa-modal-2imgs-390.png;evidence/2026-10-26-opcoes-e-variacoes/81qa-modal-sem-imagens-390.png;evidence/2026-10-26-opcoes-e-variacoes/81qa-modal-1440.png;evidence/2026-10-26-opcoes-e-variacoes-reteste/R6-modal-duas-fotos-390.png
last_report: reports/2026-10-26-opcoes-e-variacoes-reteste.md
overlaps:
---

OPV-11..15, OPV-26. Duas fotos enviadas de uma vez: as duas na Mídia, a primeira escolhida. Sem fotos: "Este produto ainda não tem imagens.". O X do primitivo se anuncia "Close".

Reteste 2026-10-26: botão 48 × 48; envio de duas fotos pelo modal → modal fecha, a primeira na linha, as duas em products.images; "Imagem 2" troca a miniatura; 1440 modal 512 px centrado. O "Close" em inglês segue aberto (decisão).
