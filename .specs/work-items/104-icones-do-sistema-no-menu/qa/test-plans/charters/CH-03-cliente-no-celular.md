# CH-03 · A cliente no celular chega pelo item destacado

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-02 Cliente no celular                                                     |
| Tour         | Feature                                                                       |
| Modo         | por cenário (J-02)                                                            |
| Time-box     | 30 min · orçamento 25 ações                                                   |
| Mudança      | a folha do menu do celular desenha o ícone do sistema do item principal e o rótulo na cor escolhida para a lista branca — no link direto e no acordeão; cor não escolhida = como hoje (C-03, C-06) |
| Viewport     | 390 × 844                                                                     |
| Massa        | só lê — o menu como CH-01 e CH-02 deixaram: A (Etiqueta, lista `#8A5A2B`), B (Presente, lista `#8A5A2B`, com submenu), C (sem cor), D (ícone da marca) |
| Driver       | —                                                                             |
| Entrada      | `/` na loja (`http://localhost:8082`) · anônima                               |
| Jornadas     | J-02                                                                          |
| TC           | TC-JOURNEY-002, TC-FUNC-010                                                   |

## Missão

Confirmar que quem nunca viu a loja reconhece no celular o item destacado pelo ícone e pela cor, lê o rótulo no branco e chega à página dele com um toque, sem confundir o rótulo colorido com outra coisa.

## Deve tentar

1. Abrir o menu, achar o item A, conferir a Etiqueta e a cor computada do rótulo (`#8A5A2B`), tocar e chegar à página
2. Abrir o acordeão de B: o rótulo em `#8A5A2B` aberto e fechado, o chevron marcando o aberto, os filhos e o "ver tudo" na cor de hoje
3. Conferir C e D: C com o rótulo da cor de hoje; D com o ícone da marca de antes
4. Abrir a folha, abrir o acordeão de B, fechar pelo voltar do navegador e reabrir

## Edge cases sugeridos

- Girar para 844 × 390 com a folha aberta
- Viewport mínima 320 × 568
- Rótulo longo com ícone (se algum item tiver nome longo) — o ícone empurra o texto para fora?
- Tocar duas vezes rápido no item A
- Movimento reduzido ao abrir o acordeão

## Fora do escopo

- A barra do computador — é do CH-04
- Ícone e cor no submenu e no "ver tudo" — decisão P-04; a ausência não é achado
- Banners do menu, visibilidade por dispositivo, outros elementos da folha (conta, favoritos)
- A página de destino do item (só conta chegar a ela)
