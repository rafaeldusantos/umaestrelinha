---
id: PNL-midia-produto-sem-imagem
area: PNL
title: Peça sem foto: vazio no Resumo e a pendência abrindo o modal
persona: Adri cadastrando peças
journey: J-ver-e-cuidar-das-fotos-da-peca
expected: 'Nenhuma imagem ainda' + Adicionar imagens no lugar da principal; a pendência de imagens do checklist abre o modal Mídia (não uma aba)
entry_points: /admin/produtos/novo; pendência imagens do Pronto para publicar
qa_status: pass
bug_ids: BUG-20261028-foco-cai-no-body-quando-a-pendencia-de-imagem-se-resolve;BUG-20261028-linhas-de-envio-ficam-na-tela
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-25-novo-sem-imagem-390.png;evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-26-novo-depois-remover-390.png
last_report: reports/2026-10-28-backoffice-resumo-com-imagens.md
overlaps: 
---

RES-05, MOD-06 — os dois não foram provados em navegador na T12 (nenhum produto sem foto). Usar peça nova TESTE-85-QA-.
