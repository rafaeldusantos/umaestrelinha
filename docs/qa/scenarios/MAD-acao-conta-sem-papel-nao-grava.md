---
id: MAD-acao-conta-sem-papel-nao-grava
area: MAD
title: Uma conta sem papel tenta agir em pedidos
persona: Cliente com conta da loja
journey: J-registrar-material-e-envio
expected: Nenhum pedido muda no banco e a tela leva à recusa da 72, inclusive para os pedidos dela própria
entry_points: /pedidos/<id de um pedido dela> → qualquer ação; admin que perde o papel com o pedido aberto
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: MAD-pedidos-conta-sem-papel-nao-ve-pedidos
---

Feature `75` (`MAA-23`, A3). A conta sem papel não chega a ver o rodapé pela leitura (`74`); o caminho real é a admin que perde o papel em `/admin/usuarios` com o detalhe aberto e toca a ação: o `update` afeta zero linhas, `set_material_status` devolve `not_admin`, e a tela vai à recusa. Conferir `orders` antes e depois.
