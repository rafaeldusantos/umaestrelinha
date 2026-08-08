---
id: MED-upload-rejeita-antes-de-comprimir
area: MED
title: Arquivo de 12 MB é rejeitado nominalmente, antes de entrar no canvas
persona: Nana
journey: J-foto-e-alt-do-produto
expected: A copy da dropzone diz "PNG, JPG ou WebP até 8 MB · convertidas para WebP 1600 px"; um arquivo de 12 MB é rejeitado nomeando arquivo e motivo sem travar a aba; e num lote de 6 com 2 inválidos os 4 válidos sobem com progresso individual
entry_points: http://localhost:8081/admin/produtos/:id/editar
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps: BLK-grade-rapida-imagem-na-celula
---

`PMD-02` + `PMD-04` (P2.4 AC 4, 6-7). O defeito era a copy mentir: dizia `máx. 5MB` e `handleFiles` não
validava tamanho algum — um arquivo de 40 MB entrava, ia para o canvas e travava a aba.

A prova é **dupla**: rejeitar **e** não ter passado pelo canvas. Rejeitar depois de comprimir é o mesmo
defeito com mensagem. Falha parcial não cancela o lote (edge case da spec).
