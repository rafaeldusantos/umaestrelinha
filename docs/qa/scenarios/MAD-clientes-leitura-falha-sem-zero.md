---
id: MAD-clientes-leitura-falha-sem-zero
area: MAD
title: Falha de leitura nunca vira número nem lista vazia
persona: Adri no celular
journey: J-achar-uma-cliente
expected: Primeira leitura com 500 ou rede cortada: Não consegui carregar as clientes. + Tentar de novo; releitura falhando com dado: lista mantida + Não consegui atualizar agora.
entry_points: /clientes com rede ruim
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: 
---

Feature `76` (`MAC-12`, `MAC-13`. Atualizado às é o lido_em da RPC (Brasília), nunca o relógio do aparelho: mudar o relógio do aparelho. Offline total: tela de Sem conexão da 72, nada servido pelo service worker (build servido).)
