---
id: LOJA-imagem-foto-principal-celular
area: LOJA
title: A foto principal do produto chega em 1080 no celular @3x
persona: Cliente navegando pelo menu
journey: J-ver-a-joia-nitida
expected: Em 390×844 DPR 3 a foto principal é pedida a width=1080 uma vez (nem 720 do palco escondido, nem segunda largura do preload); peso ≤ 2× o da de 720; nítida na tela
entry_points: /produtos/:slug
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-29-qualidade-das-imagens/87-qa-02-palco-390-dpr3.png
last_report: reports/2026-10-29-qualidade-das-imagens.md
overlaps: 
---

IMG-02, IMG-03. Medir o peso pela resposta, comparar com a de 720 da mesma foto, e olhar a foto ampliada em captura `scale: device`.
