---
id: MAD-acao-com-leitor-de-tela
area: MAD
title: Agir num pedido só com o leitor de tela
persona: Equipe com TalkBack
journey: J-registrar-material-e-envio
expected: O rodapé e o botão do cartão anunciam a ação e o pedido, Salvando… é anunciado, a confirmação é anunciada sem roubar o foco, o erro fica até a próxima ação, e com menos movimento a folha e a confirmação aparecem paradas
entry_points: /pedidos/<id> → rodapé e folha; /pedidos → botão do cartão
qa_status: fail
bug_ids: [BUG-20261024-folha-fecha-e-foco-cai-no-body, BUG-20261024-botao-do-cartao-sem-o-pedido-no-nome]
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: MAD-pedidos-com-leitor-de-tela
---

Feature `75` (`MAA-34`, `MAA-35`). Árvore de acessibilidade: `role="status"` na confirmação, `role="alert"` no erro, `aria-disabled` durante a espera, a folha como diálogo com título e foco preso. TalkBack real: `blocked-verify`.
