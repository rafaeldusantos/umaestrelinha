---
id: PNL-midia-falha-de-envio
area: PNL
title: Arquivo não aceito e rede caindo no meio do envio
persona: Adri cadastrando peças
journey: J-ver-e-cuidar-das-fotos-da-peca
expected: Toast com a frase de uploadFailureMessage para o arquivo que falhou; os outros do lote seguem e entram; o Salvar volta a habilitar; nenhuma foto fantasma no Resumo
entry_points: Resumo → Adicionar imagens / soltar; modal Mídia
qa_status: pass
bug_ids: BUG-20261028-lote-com-falhas-so-mostra-o-ultimo-motivo
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-11-gif-pdf-heic-390.png;evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-12-lote-com-falha-390.png;evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-13-toast-rede-390.png;evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-15-offline-390.png
last_report: reports/2026-10-28-backoffice-resumo-com-imagens.md
overlaps: 
---

ADI-05 — não forçado na T12. Casos: GIF/PDF/HEIC arrastado (o seletor filtra, o drop não), arquivo grande, POST do Storage abortado, offline no meio de um lote de 3.
