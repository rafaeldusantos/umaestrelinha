# CH-01 · A dona destaca o item com ícone do sistema e cor

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-01 Adri, a dona                                                           |
| Tour         | Feature                                                                       |
| Modo         | por cenário (J-01)                                                            |
| Time-box     | 60 min · orçamento 50 ações                                                   |
| Mudança      | o seletor de ícone ganha o grupo "Do sistema" com dez ícones (Etiqueta, Porcentagem, Presente, Coração, Cupom, Frete, Calendário, Informação, Dúvida, Início), separado de "Da Uma Estrelinha", com a busca alcançando os dois (C-01, C-02, C-04); o editor do item principal ganha "Cor do texto" com dois campos — barra do computador e lista do celular — cada um com seletor de cor, código hex, "Usar a cor padrão" e a medida de contraste (C-06, C-07); a prévia ao lado mostra ícone e cor (C-03); o documento do menu grava a chave e as cores (C-05) |
| Viewport     | 1440 × 900 (a prévia mostra Celular 390 × 844 e Computador 1024 × 768); a loja a 390 × 844 e 1440 × 900 no passo final |
| Massa        | altera o menu: item A (ícone `etiqueta`, barra `#E8C77A`, lista `#8A5A2B`) e item B (ícone `presente`, só lista `#8A5A2B`). **Deixe-os assim no fim** — CH-03 e CH-04 leem esse estado |
| Driver       | —                                                                             |
| Entrada      | `/admin/menu` no painel (`http://localhost:8083`) · logada como `admin`, menu v2 com os itens A–D, perfil Padrão |
| Jornadas     | J-01                                                                          |
| TC           | TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-UI-001  |

## Missão

Confirmar que a dona acha o ícone de etiqueta entre os dois grupos do seletor, dá ao item uma cor para cada fundo vendo o efeito na prévia, e encontra tudo gravado — no painel recarregado e na loja — sem que nada mais mude.

## Deve tentar

1. Antes de mexer, registrar o estado de partida: screenshot da lista do menu e da loja a 390 (folha aberta) e a 1440 (barra), com os itens A–D visíveis
2. No item A, abrir o seletor e rolar até "Do sistema" sem buscar; depois buscar por nome ("etiqueta", "coracao", "Calendário") e por chave de um ícone da marca já existente (ex.: `gota-afetiva`) e por um termo sem resultado; escolher a Etiqueta
3. Dar à barra `#E8C77A` pelo seletor de cor nativo e à lista `#8A5A2B` digitando o código; olhar a prévia em Celular e em Computador antes de salvar; salvar; recarregar e reabrir o item A
4. No item B, escolher o Presente e só a cor da lista `#8A5A2B`; salvar; conferir a loja a 1440 e a 390 (barra de B como antes, folha de B em `#8A5A2B`)

## Edge cases sugeridos

- Recarregar logo depois de Salvar (a gravação chegou?)
- Duplo clique no Salvar
- Trocar para outro item com a cor escolhida e não salva, e voltar
- Fechar o seletor de ícone com Esc sem escolher (o ícone anterior continua)
- Busca com acento e caixa trocados ("PORCENTAGEM", "duvida", "informação")
- Depois de gravar a cor, mudar só o nome do item e salvar — a cor tem de continuar (variação de TC-FUNC-003)
- Voltar do navegador com o editor aberto

## Fora do escopo

- Ícone e cor nos itens do submenu e no "ver tudo em X" — decisão P-04; ausência não é achado
- Relógio, raio e estrela de cinco pontas entre os ícones do sistema — fora por decisão (tom memorial)
- Adicionar, remover, reordenar itens, banners, chaves Computador | Celular, seletor de destino, conflito "o menu mudou em outra janela" — pré-existentes, a mudança não os toca
- `/admin/home`, `/admin/faixa-de-avisos` e outras prévias do painel
- O hover rosa dos botões do painel (dívida conhecida da tela)
- Cor ilegível, código malformado e "Usar a cor padrão" — são do CH-02
