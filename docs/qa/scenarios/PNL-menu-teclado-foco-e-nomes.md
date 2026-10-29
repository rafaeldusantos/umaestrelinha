---
id: PNL-menu-teclado-foco-e-nomes
area: PNL
title: Montar o menu só com teclado e leitor de tela
persona: Equipe com TalkBack
journey: J-montar-o-menu-da-loja
expected: Todas as ações (adicionar, editar, mover, chaves, remover, submenu) são alcançáveis por teclado, o foco entra e volta dos diálogos e da folha, e cada controle tem nome acessível em português
entry_points: /admin/menu em 1440 teclado; árvore de acessibilidade
qa_status: pass
bug_ids: BUG-20261028-foco-cai-no-body-ao-fechar-dialogos-do-menu;BUG-20261026-fechar-do-modal-em-ingles; BUG-20261029-foco-cai-no-body-ao-continuar-editando-o-banner; BUG-20261029-seletor-reaberto-depois-da-aba-pagina-foca-a-aba
fix_status: fixed
retest_status: verified
fix_commits:
evidence: reports/2026-10-28-backoffice-menu-montado-pela-dona.md; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-05-foco-depois-de-tirar-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-06-vazio-foco-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-05-continuar-editando-foco-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-03-reaberto-foco-busca-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-03-reaberto-foco-busca-1440.png
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4.md
overlaps: 
---

Feature `86`. Alça de arraste é aria-hidden por desenho; o caminho é Mover. Re-found esperado: o X do Dialog anuncia Close (BUG-20261026-fechar-do-modal-em-ingles). Salvando…/Salvo e as recusas anunciados (região viva)?

**Rodada 3 (2026-10-29).** "Continuar editando" devolve o foco ao Título (ou a "Voltar"), Descartar ao ⋯ — verified. O seletor abre com o foco na busca na primeira vez e no submenu (R04), mas reaberto depois de sair pela aba Página foca a aba "Categoria" (novo Low). Close em inglês segue (anterior, fora).

**Rodada 4 (2026-10-29).** Seletor reaberto depois de sair pela aba Página (Esc e depois de recusa), e depois de sair pela própria aba Categoria, em 390 e 1440: foco em `busca-categoria`, aba Categoria selecionada, recusa limpa; digitar "botan" sem clicar filtra. Submenu reaberto idem. `BUG-20261029-seletor-reaberto-…` verified. (O "Close" em inglês segue aberto, fora.)
