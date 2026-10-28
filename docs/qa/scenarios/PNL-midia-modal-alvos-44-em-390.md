---
id: PNL-midia-modal-alvos-44-em-390
area: PNL
title: Re-medir os alvos de toque do modal Mídia em 390
persona: Adri cadastrando peças
journey: J-ver-e-cuidar-das-fotos-da-peca
expected: Em 390×844 o modal ocupa a tela sem rolagem horizontal; Remover imagem n (sempre visível, sem depender de hover), Gerar, campo de alt, X, Concluir e vídeo medem ≥ 44px de altura
entry_points: Resumo → Editar mídia
qa_status: pass
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-05-modal-editado-390.png
last_report: reports/2026-10-28-backoffice-resumo-com-imagens.md
overlaps: 
---

MOD-07. A medida em navegador da T12 foi ANTES do conserto (remover 18×18, Gerar 73×24, alt 328×32); o conserto em ImageGallery.tsx só está provado por token (validation.md Fix 4). Remedir com getBoundingClientRect no [role=dialog], produto de 6 e de 28 fotos.
