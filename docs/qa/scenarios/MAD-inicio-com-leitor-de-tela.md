---
id: MAD-inicio-com-leitor-de-tela
area: MAD
title: Ler a Início só pelo que o leitor de tela anuncia
persona: Equipe com TalkBack
journey: J-acompanhar-a-loja
expected: Cada número é lido com o rótulo e o período, as regiões têm nome, os blocos da fila são links com o texto inteiro e o esqueleto é aria-busy
entry_points: /
qa_status: untested
bug_ids: BUG-20261022-numeros-se-sobrepoem-com-fonte-grande; BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima
fix_status: fixed
retest_status: pass
fix_commits: working tree, sem commit
evidence: evidence/2026-10-23-mobile-adm-inicio-reteste-2/ultimos-360-200.png; evidence/2026-10-23-mobile-adm-inicio-reteste-2/inicio-360-200.png; evidence/2026-10-22-mobile-adm-inicio-reteste/R1-texto-150-360.png
last_report: reports/2026-10-23-mobile-adm-inicio-reteste-2.md
overlaps: 
---

Feature `73` (`MAI-30`, `MAI-31`). Em navegador pela árvore de acessibilidade; TalkBack real é de aparelho.

QA 2026-10-22: o estouro dos números com a fonte grande foi consertado e retestado. O estouro de
"Últimos pedidos" a 175 %+ ficou aberto como decisão de desenho
(`BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima`, P3). TalkBack real é de aparelho.

Reteste 2026-10-23: a linha de "Últimos pedidos" quebra com a fonte grande (nome em cima, total e selo
embaixo) e o selo desce para uma segunda linha em vez de ser cortado; zero rolagem horizontal em 360 e
412, de 100 % a 200 % (`BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima`, verified).

Reaberto em 2026-10-27 pela feature `83`: a Início ganhou o cartão "Visitas hoje" entre a faixa e "Precisa de você", o período da faixa passou a ser controlado pela página (levado a `/ao-vivo` e de volta por `history.state`) e a releitura de 30 s.
