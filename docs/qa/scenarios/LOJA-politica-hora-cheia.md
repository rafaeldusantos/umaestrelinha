---
id: LOJA-politica-hora-cheia
area: LOJA
title: A política de privacidade declara a hora cheia da primeira visita
persona: Cliente com conta da loja
journey: J-ler-a-politica-de-privacidade
expected: Em /politica-de-privacidade, a seção Medição de audiência traz o parágrafo do Apêndice A da spec da 83, palavra por palavra (a data e a hora cheia da sua primeira visita naquele dia (por exemplo, 14h)), no lugar do da 71, legível em 390 sem rolagem horizontal
entry_points: /politica-de-privacidade
qa_status: fail
bug_ids: BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200
fix_status: open
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-27-mobile-adm-loja-ao-vivo.md
overlaps: 
---

Feature `83` (`LAV-66`). A aprovação do texto pela Adri é pré-condição do deploy: um pass aqui prova que a loja mostra o texto da spec, não que ele foi aprovado.
