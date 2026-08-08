---
id: BLK-grade-rapida-imagem-na-celula
area: BLK
title: A coluna imagem existe na planilha e usa a mesma validação da aba Mídia
persona: Nana
journey: J-cadastrar-lote-grade-rapida
expected: A coluna imagem existe antes de Nome; escolher arquivo usa a mesma validação e conversão da aba Mídia (PNG/JPG/WebP, 8 MB, WebP 1600 px) com miniatura e ação de remover; a imagem entra em products.images como {url, alt, source:'upload'}; e upload que falha deixa a linha criável sem imagem, com o motivo nomeado
entry_points: http://localhost:8081/admin/produtos/grade-rapida
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps: MED-upload-rejeita-antes-de-comprimir
---

`RFN-05` (`14`/P1.3, `A30`). Era lacuna declarada da `13`: cadastrar 20 produtos em lote e depois abrir 20
formulários para pôr foto anula metade do ganho.

O teste é **comparativo**: o mesmo arquivo de 12 MB rejeitado na aba Mídia tem que ser rejeitado aqui,
com a mesma mensagem — reusar `uploadProductImages` era a condição para a coluna existir.
