---
id: PNL-imagem-png-transparente-na-home
area: PNL
title: A arte PNG transparente da Lista de categorias mantém o alfa
persona: Adri cadastrando peças
journey: J-enviar-foto-pelo-painel
expected: Enviar PNG circular de cantos transparentes no bloco Lista de categorias: o objeto gravado mantém alfa 0 nos cantos (WebP com alfa, ou o próprio PNG se a saída for PNG)
entry_points: /admin/home → Lista de categorias
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-29-qualidade-das-imagens/87-qa-06-painel-resumo-1440.png
last_report: reports/2026-10-29-qualidade-das-imagens.md
overlaps: 
---

Regressão de A-14 da feature 64 com o motor novo.
