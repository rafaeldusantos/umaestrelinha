---
id: PNL-midia-fonte-grande-e-telas
area: PNL
title: Resumo, zoom e modal em 360/390/412 e 1440 com a fonte a 130 % e 200 %
persona: Adri cadastrando peças
journey: J-ver-e-cuidar-das-fotos-da-peca
expected: Miniaturas embrulham sem rolagem horizontal, rótulos (Editar mídia, Adicionar imagens, Abrir ↗, linhas de progresso, fatos) legíveis e dentro do card; contador e alt do zoom legíveis; modal com os controles alcançáveis
entry_points: /admin/produtos/:id/editar
qa_status: fail
bug_ids: BUG-20261028-resumo-corta-fatos-e-adicionar-com-fonte-200
fix_status: pending
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-20-resumo-390-fonte200.png;evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-21-resumo-card-390-fonte200.png;evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-22-zoom-390-fonte200.png;evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-23-modal-390-fonte200.png
last_report: reports/2026-10-28-backoffice-resumo-com-imagens.md
overlaps: PNL-seo-fonte-grande-e-telas
---

Rolagem do body que vier do SlugField (aba Geral) é anterior à 84 — separar dela o que for do Resumo.
