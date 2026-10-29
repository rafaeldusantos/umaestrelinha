---
id: LOJA-imagem-rede-lenta
area: LOJA
title: Em 4G lento a foto principal ainda aparece rápido o bastante
persona: Cliente navegando pelo menu
journey: J-ver-a-joia-nitida
expected: Com rede Slow 4G a foto principal aparece; o LCP medido é registrado com 720 (antes) e 1080 (agora), e a diferença é declarada
entry_points: /produtos/:slug
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: medida no relatório (vite preview, Slow 4G, CPU 4x)
last_report: reports/2026-10-29-qualidade-das-imagens.md
overlaps: 
---

Custo aceito na spec (≤2× bytes). Medir, não opinar.
