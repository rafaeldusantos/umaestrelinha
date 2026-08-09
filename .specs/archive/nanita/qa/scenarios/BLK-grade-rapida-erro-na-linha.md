---
id: BLK-grade-rapida-erro-na-linha
area: BLK
title: Erro aparece abaixo da linha na hora, nomeando a URL em conflito
persona: Dora
journey: J-cadastrar-lote-grade-rapida
expected: A linha inválida mostra o erro imediatamente abaixo dela, sem esperar o submit ("Preço é obrigatório", "já existe um produto com a URL /..." nomeando a URL); colar 500 linhas limita o lote a 200 com aviso explícito em vez de travar a aba
entry_points: http://localhost:8081/admin/produtos/grade-rapida
qa_status: skipped
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PLS-07` AC 6 + os edge cases de slug e de teto (`A24`). Numa planilha de 20 linhas, erro que só aparece
no submit obriga a caçar qual linha — e o erro genérico "já existe" não diz qual URL colidiu.
