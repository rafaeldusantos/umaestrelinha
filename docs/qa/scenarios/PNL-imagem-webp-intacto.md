---
id: PNL-imagem-webp-intacto
area: PNL
title: Um WebP que já cabe é gravado como foi enviado
persona: Adri cadastrando peças
journey: J-enviar-foto-pelo-painel
expected: Pela galeria do produto, enviar um WebP de 1024px: o objeto no Storage tem o mesmo SHA-256 do arquivo
entry_points: /admin/produtos/:id/editar → Adicionar imagens
qa_status: pass
bug_ids: BUG-20261029-produto-inexistente-abre-formulario-vazio
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-29-qualidade-das-imagens/87-qa-06-painel-resumo-1440.png
last_report: reports/2026-10-29-qualidade-das-imagens.md
overlaps: PNL-midia-adicionar-pelo-resumo
---

IMG-12, pela tela (a prova-navegador chamou o motor direto).
