---
id: MAD-aovivo-leitura-falha-tentar-de-novo
area: MAD
title: Leitura falha: Não consegui carregar. e Tentar de novo
persona: Adri no celular
journey: J-ver-a-loja-ao-vivo
expected: Falha sem dado: Não consegui carregar. + Tentar de novo, nenhum número nem zero, sem aria-busy; Tentar de novo relê; falha de releitura com dado mantém os números e só troca o frescor
entry_points: /ao-vivo
qa_status: fail
bug_ids: BUG-20261027-tentar-de-novo-da-loja-ao-vivo-solta-o-foco
fix_status: open
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-27-mobile-adm-loja-ao-vivo.md
overlaps: MAD-aovivo-linha-de-frescor
---

Feature `83` (`LAV-55`). Carregando: Traço no lugar dos números e do gráfico, seletor desabilitado. Depois de Tentar de novo o foco não pode cair no body.
