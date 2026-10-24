---
id: MAD-pedidos-buscar-por-numero-ou-nome
area: MAD
title: Achar o pedido que a cliente mandou pelo número, nome, e-mail ou rastreio
persona: Adri no celular
journey: J-achar-um-pedido
expected: #0244, 0244 e 244 acham o mesmo pedido; nome, e-mail e rastreio também, sempre dentro do recorte ativo, e o termo não vai para o endereço
entry_points: /pedidos → campo Número, nome, e-mail ou rastreio
qa_status: pass
bug_ids: BUG-20261024-voltar-do-pedido-buscado-perde-a-busca
fix_status: fixed
retest_status: pass (2026-10-24 r2)
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: 
---

Feature `74` (`MAP-10`..`MAP-12`, A12/A13). Colar com espaço antes/depois, só espaços (vale como sem busca), vírgula e parênteses (nunca erro). Digitar rápido: a resposta velha não sobrescreve a nova. Mesmo termo no painel dá o mesmo conjunto.
