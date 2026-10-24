---
id: MAD-pedido-abrir-e-entender
area: MAD
title: Abrir um pedido e ler tudo dele numa tela
persona: Adri no celular
journey: J-ver-um-pedido
expected: Cabeçalho, próximo passo, cliente, material com os quatro passos, joias com gravação, valores com total igual ao do pedido, entrega e histórico com notas, todos iguais a /admin/pedidos/<id>; desde a 75 o rodapé mostra a ação do estado (ver J-registrar-material-e-envio)
entry_points: /pedidos → linha; /pedidos/<id>
qa_status: untested
bug_ids: BUG-20261024-pagamento-por-cartao-aparece-como-card, BUG-20261024-falha-de-aviso-diz-enviado
fix_status: fixed
retest_status: pass (2026-10-24 r3)
fix_commits:
evidence: evidence/2026-10-24-mobile-adm-pedidos/r2-390-detalhe-0174-cartao.png; evidence/2026-10-24-mobile-adm-pedidos/r3-390-historico-falha-de-aviso.png
last_report: reports/2026-10-24-mobile-adm-pedidos-reteste-2.md
overlaps: 
---

Feature `74` (`MAP-20`..`MAP-26`, `MAP-28`, `MAP-55`). Um pedido de cada caso: material em cada estado (e enviado: os quatro feitos, Material usado na joia), `nao_aplicavel` sem bloco, cupom + Pix com linhas próprias, enviado sem rastreio, e-mail que falhou (a cliente NÃO foi avisada), nota interna, cancelado (Pedido cancelado, sem bloqueio), item importado sem catálogo. Sem Ver cliente. Sem blockedReason.

Reaberto em 2026-10-24 pelo planejamento da `75`: a superfície mudou (rodapé de ação no detalhe e botão no cartão da lista). O veredito anterior está em `last_report`; o novo vem do re-walk do ciclo `75`.
