---
id: MAD-pedidos-com-leitor-de-tela
area: MAD
title: Usar a lista e o detalhe só com o leitor de tela
persona: Equipe com TalkBack
journey: J-achar-um-pedido
expected: Os chips anunciam pressionado, a linha anuncia número e cliente, a aba anuncia Pedidos, N precisam de você, e o foco vai ao h1 com o título do documento certo
entry_points: /pedidos; /pedidos/<id>
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-inicio-com-leitor-de-tela
---

Feature `74` (`MAP-19`, `MAP-33`, `MAP-44`, `MAP-46`, `MAP-55`). Esqueleto com `aria-busy`. Em navegador pela árvore de acessibilidade; TalkBack real é `blocked-verify` (aparelho).

Reaberto em 2026-10-24 pelo planejamento da `75`: a superfície mudou (rodapé de ação no detalhe e botão no cartão da lista). O veredito anterior está em `last_report`; o novo vem do re-walk do ciclo `75`.
