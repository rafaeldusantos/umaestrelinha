---
id: PNL-variacoes-imagem-na-linha-e-envio
area: PNL
title: Escolher e enviar a foto da variação pela linha
persona: Adri cadastrando peças
journey: J-cadastrar-peca-com-variacoes
expected: Botão 48 px na linha; modal com as fotos e "Usar a principal"; o envio entra na Mídia e fica escolhido
entry_points: /admin/produtos/novo; /admin/produtos/:id/editar
qa_status: pass
bug_ids: BUG-20261026-fechar-do-modal-em-ingles;BUG-20261028-modal-de-imagem-da-variacao-solta-o-foco
fix_status: pending
retest_status: 
fix_commits: 
evidence: evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-10-variacao-modal.png;evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-27-variacao-28-390.png
last_report: reports/2026-10-28-backoffice-resumo-com-imagens.md
overlaps: PNL-midia-adicionar-pelo-resumo;PNL-midia-regressoes-da-pagina
---

OPV-11..15, OPV-26. Duas fotos enviadas de uma vez: as duas na Mídia, a primeira escolhida. Sem fotos: "Este produto ainda não tem imagens.". O X do primitivo se anuncia "Close".

Reteste 2026-10-26: botão 48 × 48; envio de duas fotos pelo modal → modal fecha, a primeira na linha, as duas em products.images; "Imagem 2" troca a miniatura; 1440 modal 512 px centrado. O "Close" em inglês segue aberto (decisão).

Reaberto em 2026-10-28 (ciclo da `85`): a aba Mídia virou o modal Mídia e as fotos aparecem no Resumo. "O envio entra na Mídia" agora se confere no Resumo (miniatura nova no fim) e no modal Mídia; o resultado esperado não muda.
