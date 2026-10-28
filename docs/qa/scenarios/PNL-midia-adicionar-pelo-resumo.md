---
id: PNL-midia-adicionar-pelo-resumo
area: PNL
title: Acrescentar fotos pelo botão do Resumo
persona: Adri cadastrando peças
journey: J-ver-e-cuidar-das-fotos-da-peca
expected: Seletor com PNG/JPG/WebP e múltiplos; uma linha de progresso por arquivo; Salvar desabilitado enquanto envia; fotos novas no fim com alt vazio e selo de upload; o progresso continua visível se o modal abrir no meio
entry_points: Resumo → Adicionar imagens
qa_status: pass
bug_ids: BUG-20261028-linhas-de-envio-ficam-na-tela
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-03-enviando-390.png;evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-04-modal-enviando-390.png;evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-06-resumo-depois-modal-390.png
last_report: reports/2026-10-28-backoffice-resumo-com-imagens.md
overlaps: PNL-variacoes-imagem-na-linha-e-envio
---

ADI-01, ADI-03, ADI-04, ADI-06 e o edge case do envio com o modal aberto. Atrasar o POST do Storage por rota para ver a janela.
