# CH-NN · <título curto>

<!--
Um arquivo por charter: test-plans/charters/CH-NN-<slug>.md. Quem executa é o wi-qa-explorer, sem poder
perguntar a você — tudo o que ele precisa está aqui. Como preencher: references/execution/charters.md,
tours.md, edge-cases.md; cfr.md no tipo cfr; design-check.md no tipo design-check.
Remova as seções que não são do tipo, e este comentário.
-->

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório · cfr · design-check                                             |
| Prioridade   | P0 · P1 · P2 · P3                                                             |
| Persona      | PER-NN <nome>                                                                 |
| Tour         | Feature · Money · Garbage · Back-Button · Multi-Tab · Network · Locale · Paste · Autofill · Interrupt — `—` no cfr e no design-check |
| Modo         | com tour · por técnica · por cenário · livre — `—` no cfr e no design-check   |
| Time-box     | 30 · 60 · 90 min — 45 no cfr · orçamento: 25 · 50 · 70 ações — 35 no cfr      |
| Mudança      | <o que o Work Item muda nesta superfície, com os critérios: C-03, P1-AC02>    |
| Viewport     | 1280 · 768 · 375 — o da persona                                               |
| Entrada      | <rota de partida, relativa à URL do app> · estado de partida (<logada como…, carrinho vazio…>) |
| Jornadas     | J-NN, … · `—`                                                                 |
| TC           | TC-…, TC-…                                                                    |

## Missão

<Uma frase, em termos da persona: o que procurar e por que importa.>

## Deve tentar

<!-- 2 a 4 coisas específicas. "Testar o formulário" não é específico. -->

1. <ação concreta>
2. <ação concreta>

## Edge cases sugeridos

<!-- De 5 a 10 de references/execution/edge-cases.md que esta superfície pede. -->

- <caso>

## Fora do escopo

<!-- O que a sessão não deve explorar, e o que já se sabe quebrado. Nunca vazio. Inclui o que a costura deixa
fora e as telas vizinhas que a mudança não toca: o que a sessão vir ali é sugestão de backlog, não pergunta. -->

- <superfície ou fluxo>

## CFR

<!-- Só no tipo cfr. -->

**Jornadas:** J-NN, J-NN — <por que estas: a maior superfície da mudança>

| Categoria             | Na rodada | Por quê, se fora                           |
| --------------------- | --------- | ------------------------------------------ |
| Usabilidade           | sim · não |                                            |
| Acessibilidade        | sim · não |                                            |
| Performance percebida | sim · não |                                            |
| Compatibilidade       | sim · não |                                            |
| Recuperação de erro   | sim · não |                                            |
| Paridade com produção | sim       | sempre — é a condição da rodada            |

## Design

<!-- Só no tipo design-check. A fonte sai das fontes de design da Fase 0 (item.md › Insumos, prd.md ›
Expectativas de UI/UX, PROJECT.md › Fontes de design) — copie o link ou caminho, não reescreva. -->

**Fonte de design:** <nome> · `<tool: figma · claude_design · link · arquivo>` · <url ou caminho> · de <item.md · prd.md · PROJECT.md>

| Tela do app (rota)  | No design (frame, nó ou arquivo) | Viewports com frame | Estados a conferir                 |
| ------------------- | -------------------------------- | ------------------- | ---------------------------------- |
| <rota>              | <nome do frame · node-id>        | 1280 · 375          | padrão · erro · vazio · carregando |
