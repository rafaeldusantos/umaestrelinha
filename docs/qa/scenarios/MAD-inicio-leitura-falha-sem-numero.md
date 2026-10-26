---
id: MAD-inicio-leitura-falha-sem-numero
area: MAD
title: Uma leitura falha e o bloco não mostra número falso
persona: Adri no celular
journey: J-acompanhar-a-loja
expected: O bloco que falhou diz que não carregou e oferece Tentar de novo, sem zero; os outros seguem; uma releitura que falha mantém os números com a hora deles
entry_points: /
qa_status: pass
bug_ids: 
fix_status: 
retest_status:
fix_commits:
evidence: evidence/2026-10-22-mobile-adm-inicio/CH-rede-01-resumo-falhou-360.png; evidence/2026-10-22-mobile-adm-inicio/CH-rede-02-releitura-falhou-360.png; evidence/2026-10-22-mobile-adm-inicio/CH-rede-04-3g-esqueleto-360.png
last_report: reports/2026-10-22-mobile-adm-inicio.md
overlaps: 
---

Feature `73` (`MAI-17`, `MAI-18`, `MAI-24`). Falha provocada bloqueando só uma RPC no navegador.
