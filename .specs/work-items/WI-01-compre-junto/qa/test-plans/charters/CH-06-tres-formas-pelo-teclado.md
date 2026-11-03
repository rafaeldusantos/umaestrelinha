# CH-06 · As três formas do bloco pelo teclado, indo e voltando

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-03 Helena                                                                 |
| Tour         | Back-Button                                                                   |
| Modo         | com tour                                                                      |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | O bloco abre as escolhas de cada adicional em uma de três formas, escolhida pela dona: "Na linha", "Em folha" (folha no celular, diálogo no computador, com "Incluir no conjunto") e "Com fórmula" (faixa "Esta joia + …" fora do leitor de tela). Critérios: CA-09.1, CA-09.3, CA-09.4, CA-09.5 |
| Viewport     | 1440 × 900 com zoom 200%; a folha também em 390 × 844                         |
| Entrada      | `/produtos/<slug do pingente>` · anônima, sacola vazia; a forma é trocada entre as rodadas pela thread com a conta `admin-painel` (fora da sessão), na ordem "Na linha" → "Em folha" → "Com fórmula" |
| Jornadas     | J-04 (lado da loja), J-01 (secundária)                                        |
| TC           | TC-FUNC-024, TC-FUNC-025, TC-FUNC-026 · com o Dev (não executado na sessão): TC-FUNC-028 |

## Missão

Confirmar que, só com o teclado, a cliente monta o mesmo conjunto nas três formas, que a folha e o diálogo nunca prendem nem perdem o foco, e que voltar no navegador não deixa folha presa nem marca fantasma.

## Deve tentar

1. Em "Em folha": abrir as escolhas com Enter, conferir o foco no título, completar e "Incluir no conjunto"; abrir de novo e fechar com Esc com a escolha incompleta; conferir onde o foco volta e se o adicional ficou marcado.
2. Com a folha ou o diálogo aberto, usar o voltar do navegador; depois avançar.
3. Em "Com fórmula": percorrer com Tab e conferir que a faixa não recebe foco nem é lida, e que nada nela falta na lista.
4. Montar o mesmo conjunto incompleto nas três formas e tentar levar: a mesma mensagem, o mesmo bloqueio, o mesmo total.

## Edge cases sugeridos

- Só teclado do começo ao fim
- Voltar depois de "Levar o conjunto" com a folha ainda aberta
- Recarregar com a folha aberta
- Abrir a URL do produto numa aba nova com a forma "Em folha"
- Zoom 200% com o diálogo aberto (cabe? o botão "Incluir no conjunto" fica alcançável?)
- Movimento reduzido ao abrir e fechar a folha

## Fora do escopo

- A escolha da forma no painel — CH-04
- O conteúdo das regras do bloco (já explorado em CH-01); aqui só a igualdade entre formas
- Leitor de tela real (fora do browser da sessão; a árvore de acessibilidade simula)
- O resto da página do produto (galeria, frete, acordeão): a mudança não toca
