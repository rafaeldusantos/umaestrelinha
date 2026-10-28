---
id: PNL-midia-regressoes-da-pagina
area: PNL
title: O que a página tinha antes continua: aba Mídia ausente, foto apontada por variação, guarda de saída
persona: Adri cadastrando peças
journey: J-ver-e-cuidar-das-fotos-da-peca
expected: Abas sem 'Mídia' e nenhum link interno levando a ela; remover no modal uma foto usada por variação limpa a imagem da linha (clearMissingVariantImages) e o Salvar grava isso; a guarda de saída e o 'Há um rascunho não salvo' só aparecem depois de uma edição de verdade
entry_points: /admin/produtos/:id/editar → aba Preços & variações; modal Mídia
qa_status: fail
bug_ids: BUG-20261028-produto-abre-com-alteracoes-nao-salvas;BUG-20261028-modal-de-imagem-da-variacao-solta-o-foco
fix_status: pending
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-08-variacao-antes.png;evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-09-variacao-depois.png
last_report: reports/2026-10-28-backoffice-resumo-com-imagens.md
overlaps: PNL-variacoes-imagem-na-linha-e-envio;PNL-variacoes-salvar-e-reabrir-sem-mudar
---

MOD-01, MOD-03 (variação), RES-02. O terceiro ponto falha hoje por um defeito anterior à 85 (o bug ligado); registrar o resultado sem confundi-lo com regressão da 85.
