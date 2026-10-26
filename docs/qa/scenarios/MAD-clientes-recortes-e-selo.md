---
id: MAD-clientes-recortes-e-selo
area: MAD
title: Trocar de recorte e ver o selo Em aberto nas mesmas linhas
persona: Adri no celular
journey: J-achar-uma-cliente
expected: Compraram mais de uma vez = 2 ou mais pagas; Com pedido em aberto = pago e em andamento; o selo aparece nas mesmas linhas do chip; o endereço leva só ?recorte= por substituição
entry_points: /clientes → chips
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/76-clientes/sessao.json
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: MAD-clientes-bate-com-o-painel
---

Feature `76` (`MAC-07`..`MAC-09`, Q2b. Pix expirado ou rejeitado NÃO é em aberto. Valor desconhecido em ?recorte= abre em Todas. O voltar do Android não empilha chips. Comparar a contagem com o Voltaram do painel.)
