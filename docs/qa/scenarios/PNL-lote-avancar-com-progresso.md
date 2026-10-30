---
id: PNL-lote-avancar-com-progresso
area: PNL
title: Avançar pedidos em lote com progresso e resumo
persona: Adri despachando pedidos
journey: J-avancar-pedidos-em-lote
expected: O lote pergunta uma vez (N enviariam, N já receberam), mostra 'Avançando 7 de N…' e um resumo com e-mails que saíram
entry_points: /admin/pedidos (barra de lote, cartão do celular)
qa_status: pass
bug_ids: BUG-20261030-resumo-do-lote-some-em-quatro-segundos;BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar
fix_status: fixed
retest_status: pass
fix_commits:
evidence: evidence/2026-10-30-aviso-opcional-reteste/
last_report: reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
overlaps:
---

Feature `88`: AVS-19;AVS-20;CRG-10;CRG-11;CRG-12.
