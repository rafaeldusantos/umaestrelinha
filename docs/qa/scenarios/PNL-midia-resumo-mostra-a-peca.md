---
id: PNL-midia-resumo-mostra-a-peca
area: PNL
title: Abrir a peça e ver a foto principal no Resumo, sem rolar e sem trocar de aba
persona: Adri cadastrando peças
journey: J-ver-e-cuidar-das-fotos-da-peca
expected: Em 390×844 a principal termina acima de 844 (com sessionStorage limpo); Resumo antes das abas (< lg) e entre Publicação e Pronto para publicar (≥ lg); 1 só no DOM; sem Prévia na loja; Abrir ↗ em nova aba; fatos iguais aos de antes; sem rolagem horizontal em 390/1024/1440
entry_points: /admin/produtos/:id/editar
qa_status: pass
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-01-resumo-390.png;evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-07-resumo-1440.png
last_report: reports/2026-10-28-backoffice-resumo-com-imagens.md
overlaps: 
---

RES-01..RES-08, Goals e Success Criteria. Prova T12: principal termina em 684 em 390 sem o aviso de rascunho, 854 com ele. Medir também a dobra de 1440 (Goal, não AC: 618→944).
