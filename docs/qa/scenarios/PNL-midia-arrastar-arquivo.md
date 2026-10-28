---
id: PNL-midia-arrastar-arquivo
area: PNL
title: Soltar arquivos no card Resumo e no modal Mídia
persona: Adri cadastrando peças
journey: J-ver-e-cuidar-das-fotos-da-peca
expected: Ao arrastar por cima, o card mostra 'Solte para enviar'; soltar envia igual ao botão; sair do card sem soltar tira o véu; no modal, soltar e colar entram pelo mesmo caminho
entry_points: Resumo; modal Mídia
qa_status: blocked-verify
bug_ids: 
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-24-depois-do-veu.png
last_report: reports/2026-10-28-backoffice-resumo-com-imagens.md
overlaps: 
---

ADI-02 e o arraste da galeria. A T12 usou DragEvent sintético; o arrasto nativo do Finder/Explorer é verificação humana (blocked-verify em navegador automatizado). Arrastar algo que não é arquivo (texto, link) não pode disparar envio.
