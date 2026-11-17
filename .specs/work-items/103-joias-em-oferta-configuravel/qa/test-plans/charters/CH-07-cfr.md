# CH-07 · CFR — o editor do bloco e o bloco na Home

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | cfr                                                                           |
| Prioridade   | P1                                                                            |
| Persona      | PER-01 Adri (no painel); a loja numa aba sem login, como a cliente a vê       |
| Tour         | —                                                                             |
| Modo         | —                                                                             |
| Time-box     | 45 min · orçamento: 35 ações                                                  |
| Mudança      | o editor do bloco (Conteúdo, Campanha, Peças escolhidas, avisos, recusas) e o bloco na Home (título, descrição, fileira das escolhidas, ausência sem campanha) — RNF-01, RNF-04, RNF-05, RNF-06, RNF-07, RNF-08 |
| Viewport     | 390 × 844 e 1440 × 900; fonte a 130 % e 200 %                                 |
| Massa        | **altera** o título de B-1 (acrescenta " teste" e devolve ao original, salvando as duas vezes); o resto só lê |
| Driver       | `—`                                                                           |
| Entrada      | `/admin/home` no painel (`:8083`) · logada como `admin-loja`; outra aba da loja (`:8082`) **sem** login |
| Jornadas     | J-01, J-02                                                                    |
| TC           | TC-CFR-001, TC-CFR-002, TC-CFR-003 — 3 TC em 35 ações                         |

## Missão

Refazer como auditoria a configuração do bloco e a visita da cliente à Home, procurando onde o editor deixa de ser
usável no celular, com fonte grande ou só pelo teclado, onde o bloco desloca ou estoura a página, e onde um texto
novo quebra o tom memorial.

## Deve tentar

1. Editor de B-1 em 390 × 844 com fonte a 200 %: chegar a todo campo, ao seletor, à lista e ao Salvar; nenhuma
   rolagem horizontal
2. Só teclado: Tab pelo editor, subir e descer uma peça, provocar uma recusa (título com 61) e ver se ela é
   anunciada (alerta)
3. Na loja, recarregar a Home em 390 × 844 com rede lenta: o bloco reserva espaço só para as peças escolhidas, o
   rodapé não salta; fonte a 200 %: título e descrição não cortam
4. Ler os textos fixos novos do editor (dicas, avisos, recusas) e do bloco

## Edge cases sugeridos

- Movimento reduzido na fileira e nas linhas do painel que acendem ao salvar
- Viewport 320 × 568 no bloco
- Fonte a 130 %
- Foco visível no seletor de campanha e nos botões de subir/descer

## Fora do escopo

- os outros blocos e editores da Home, o cadastro de campanhas, a sacola — mesmo na mesma tela, o que não mudou
  neste WI é `pré-existente`
- leitor de tela real (só a árvore de acessibilidade)
- tema escuro (a loja não tem)

## CFR

**Jornadas:** J-01, J-02 — são a maior superfície da mudança: o editor inteiro e o bloco na Home.

| Categoria             | Na rodada | Por quê, se fora                           |
| --------------------- | --------- | ------------------------------------------ |
| Usabilidade           | sim       |                                            |
| Acessibilidade        | sim       |                                            |
| Performance percebida | sim       |                                            |
| Compatibilidade       | sim       |                                            |
| Recuperação de erro   | sim       |                                            |
| Paridade com produção | sim       | sempre — é a condição da rodada            |
