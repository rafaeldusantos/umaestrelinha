---
id: MAD-aovivo-voltar-mantem-periodo
area: MAD
title: Voltar à Início mantém o período
persona: Adri no celular
journey: J-ver-a-loja-ao-vivo
expected: Com Ontem na Início, abrir pelo cartão e voltar (botão Voltar ou gesto do Android) devolve a Início em Ontem; F5 em /ao-vivo mantém o período; link colado sem estado abre em Hoje e o Voltar vai a / por substituição
entry_points: /; /ao-vivo
qa_status: fail
bug_ids: BUG-20261027-f5-desfaz-o-periodo-escolhido-na-loja-ao-vivo
fix_status: open
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-27-mobile-adm-loja-ao-vivo.md
overlaps: MAD-pedido-voltar-mantem-recorte
---

Feature `83` (`LAV-04`, `LAV-06`, `LAV-50`). Valor de período inválido em `history.state` ⇒ Hoje. O gesto real do Android fica `blocked-verify`.
