---
id: MAD-acao-folha-e-voltar-do-android
area: MAD
title: Fechar a folha do rastreio pelo voltar sem sair do pedido
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: O voltar fecha a folha sem mudar o endereço, o voltar seguinte leva à lista no mesmo recorte e posição, e F5 com a folha aberta abre o pedido sem a folha e sem voltar morto
entry_points: /pedidos?visao=... → pedido → Marcar como enviado → voltar
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: MAD-pedido-voltar-mantem-recorte
---

Feature `75` (`MAA-32`, A23). Também: Agora não, toque no fundo, sucesso — cada um consome a entrada de histórico. Foco vai ao campo e fica preso na folha; o campo fica acima do teclado virtual (aparelho: `blocked-verify` para o teclado real). O gesto do sistema é `blocked-verify`.
