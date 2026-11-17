# CH-02 · Cor ilegível ou malformada nunca chega a gravar

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-01 Adri, a dona                                                           |
| Tour         | Garbage                                                                       |
| Modo         | por técnica (valor limite e transição de estado)                              |
| Time-box     | 60 min · orçamento 50 ações                                                   |
| Mudança      | a cor do rótulo abaixo de 4,5:1 sobre o fundo da superfície (barra no perfil Padrão e no Black Friday; lista branca) é recusada antes de gravar, com a razão e a medida na frase; código fora de `#RRGGBB` não é cor (C-07); "Usar a cor padrão" e cor só no item principal (C-06, P-04) |
| Viewport     | 1440 × 900; a loja a 1440 × 900 e 390 × 844 para conferir o efeito            |
| Massa        | altera o menu: **só o item C** — termina **sem cor** nas duas superfícies e com o ícone que tinha. Altera o perfil de estilo (Configurações › Dados da loja › "Perfil de estilo da loja") e o **devolve a Padrão** antes do fim. Não toca A, B nem D |
| Driver       | —                                                                             |
| Entrada      | `/admin/menu` no painel (`http://localhost:8083`) · logada como `admin`, menu como CH-01 deixou |
| Jornadas     | J-01 (ramos J-01a, J-01b, J-01c)                                              |
| TC           | TC-FUNC-005, TC-FUNC-006, TC-FUNC-007, TC-FUNC-008, TC-FUNC-009                |

## Missão

Achar qualquer jeito de uma cor ilegível, um código malformado ou um item de submenu chegar a gravar cor no menu — e confirmar que a dona, ao ser recusada, entende por quê e não perde o que digitou.

## Deve tentar

1. No item C, barra `#8A5A2B` (≈1,6:1) e depois lista `#E8C77A` (≈1,6:1): ler a recusa, tentar salvar, recarregar e confirmar que nada gravou; ajustar o código até a medida cruzar 4,5:1 (vermelha → verde) e conferir que o piso é aceito
2. Códigos malformados no campo hex: `E8C77A`, `#12`, `#GGGGGG`, `#E8C77AFF`, `#e8c77a`, e o código colado com espaço em volta
3. Gravar uma cor válida no item C, conferir na loja, depois "Usar a cor padrão" nos dois campos, salvar, e conferir que a loja voltou ao de hoje
4. Abrir um item do submenu (de B) e conferir que não há "Cor do texto"; trocar o perfil para Black Friday, ver a barra da loja a 1440 com o item A, e voltar a Padrão

## Edge cases sugeridos

- Enviar com o campo hex vazio (é "sem cor"?)
- Digitar fora de ordem: código da lista primeiro, depois a barra
- Colar de editor de texto (código com aspas ou travessão)
- Duplo clique no Salvar com a recusa visível
- Recarregar com a recusa na tela
- Desfazer pelo "Usar a cor padrão" e escolher de novo sem salvar entre um e outro
- Voltar do navegador logo depois da recusa

## Fora do escopo

- A escolha do ícone — é do CH-01
- Ícone e cor no submenu e no "ver tudo" — decisão P-04
- O resto de Configurações e o efeito do perfil Black Friday em telas que não sejam a barra do menu (WI 100)
- Recusas pré-existentes do menu (destino inexistente, endereço externo) — a mudança não as toca
- O texto exato da frase de recusa — nenhuma fonte o fixa; confira a superfície e a medida
