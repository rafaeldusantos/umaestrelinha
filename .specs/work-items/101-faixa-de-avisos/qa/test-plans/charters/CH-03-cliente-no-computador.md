# CH-03 · O cliente que vem do Google, no computador

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P1 |
| Persona      | PER-04 Rodrigo |
| Tour         | Feature |
| Modo         | com tour |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | no computador: faixa de 48 px, setas de 44 px nas pontas, pausa com ponteiro e foco, a arte do computador num `<picture>`; o hook do giro do Banner principal mudou de lugar (UC-01, UC-02, CA-02, CA-03, CA-07, RN-06) |
| Viewport     | 1440 × 900 (e 1024, 768, 767 e 390 nas variações) |
| Massa        | só lê a faixa do manifesto e a Home local como está |
| Driver       | — |
| Entrada      | `http://localhost:8082/<caminho de C1>` · sem sessão |
| Jornadas     | J-03 |
| TC           | TC-FUNC-015, TC-FUNC-016, TC-UI-002, TC-REG-001 |

## Missão

Confirmar que o Rodrigo, no computador, percorre os avisos pelas setas sem o aviso trocar sob o ponteiro, vê a arte da campanha inteira e nítida, e que o Banner principal da Home continua girando como antes.

## Deve tentar

1. Usar as setas e o ponteiro sobre a faixa, medindo os alvos e o tempo de troca.
2. Ir ao aviso de imagem e conferir as imagens que a página baixou; estreitar a janela e recarregar.
3. Abrir a Home e observar o Banner principal ao mesmo tempo que a faixa.

## Edge cases sugeridos

- Larguras 1024, 768 e 767 (as setas aparecem a partir de 768)
- Viewport enorme (2560 × 1440) — a arte contida, o miolo em 1280
- Zoom do navegador a 200 %
- Duplo clique na seta
- Tab até a faixa e espera

## Fora do escopo

- O painel: CH-01, CH-04, CH-05
- O conteúdo do Banner principal (artes, destinos) e o resto da Home — só o giro e a pausa
- O CLS e a acessibilidade a fundo: CH-07
- Botão de fechar a faixa, faixa por página, contador (PRD › Fora)
