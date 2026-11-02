# J-02 · Entender o que a cliente está fazendo na loja, do pouso ao checkout

**Valor:** a Adri vê, sem identificar ninguém, se quem está na loja está olhando, com joia na sacola ou no
checkout, quais joias estão sendo vistas, de onde a pessoa veio e se usa celular.
**Persona:** PER-01 Adri (principal) · PER-03 Lúcia (secundária — é quem gera a presença)
**Prioridade:** P0
**Critérios de origem:** LAV-20, LAV-21, LAV-22, LAV-30, LAV-31, LAV-32, LAV-40, LAV-45, LAV-65, §10.2, R-01
**Charters:** CH-01, CH-04 · **TC:** TC-FUNC-004, TC-FUNC-005, TC-FUNC-006, TC-FUNC-007, TC-FUNC-008, TC-FUNC-009, TC-FUNC-010, TC-FUNC-011, TC-FUNC-012, TC-FUNC-013, TC-SEC-005, TC-JOURNEY-002

## Entrada

| Origem             | URL / caminho                       | Estado de partida                                                       |
| ------------------ | ----------------------------------- | ----------------------------------------------------------------------- |
| navegação interna  | http://localhost:8084/ao-vivo       | logada como `admin-atelie`; na loja, contexto da cliente pronto para pousar por um link com `utm_source=instagram` |

## Passos

| # | A persona…                                                            | Deve ver                                                                                        | Em até | Fricção prevista                         | TC          |
| - | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ | ---------------------------------------- | ----------- |
| 1 | (a cliente pousa numa joia vinda do Instagram, celular)                | — na loja nada muda                                                                             | 3 s    | a página da joia mais lenta              | —           |
| 2 | relê a Loja ao vivo                                                   | 1 pessoa; "Olhando joias" 1; a joia na lista C com foto e "1 pessoa"; Instagram 1; "1 de 1" no celular | 75 s | o atraso de até 60 s + 15 s parece falha | TC-FUNC-009, TC-FUNC-012, TC-FUNC-013 |
| 3 | (a cliente abre o Guia de envio do material)                          | a linha do Guia com o ícone de envio; "Ninguém olhando uma joia agora." não aparece               | 75 s   | —                                        | TC-FUNC-010 |
| 4 | (a cliente põe a joia na sacola)                                      | "Com joia na sacola" 1, "Olhando joias" 0; total 1                                               | 75 s   | contar duas vezes                        | TC-FUNC-004 |
| 5 | (a cliente vai ao checkout)                                           | "No checkout" 1, "Com joia na sacola" 0, e a nota sobre Carrinhos abandonados, sem prazo          | 75 s   | a nota citar prazo                       | TC-FUNC-004, TC-FUNC-006 |
| 6 | lê "Compraram (últimos 30 min)"                                        | só o número, sem barra; conta o pedido aprovado nos últimos 30 min                                | 3 s    | —                                        | TC-FUNC-007 |
| 7 | confere que nada identifica a cliente                                 | nenhum nome, e-mail ou cidade em lugar nenhum da tela                                             | 5 s    | —                                        | TC-SEC-005  |

**Tempo total esperado:** ~6 min de relógio, por causa do atraso declarado (60 s do aviso + 15 s da leitura);
alguns segundos de atenção da Adri por passo.

## Objetivo

- **Observável:** os blocos B–E descrevem o que a cliente fez, e Olhando + Sacola + Checkout = o número grande
- **Efeitos colaterais:** nenhum na loja; a cliente conclui o que veio fazer

## Saída

- **Natural:** a Adri volta ao Início; a cliente segue para o pagamento ou fecha a aba (J-05)

## Desvios e abandono

| Ramo  | No passo | Quando                                       | A persona…              | Deve acontecer                                                         | TC             |
| ----- | -------- | -------------------------------------------- | ----------------------- | ---------------------------------------------------------------------- | -------------- |
| J-02a | 5        | a cliente fecha a aba no checkout             | relê a tela             | a cliente sai do total em até 5 min; a nota do checkout some com ela   | TC-JOURNEY-002 |
| J-02b | 5        | a cliente segue para o pagamento de um pedido feito, ou abre um pedido montado | relê | continua em "No checkout"; em `/pedido/:id` sai de "No checkout"        | TC-FUNC-005    |
| J-02c | 2        | a cliente veio sem referência                 | relê                    | conta em "Direto", e a nota em letra pequena explica os links abertos dentro dos apps | TC-FUNC-012 |

## Fronteiras

Loja → function `visit` (pulso) → banco local → app. "Compraram" vem de `orders`, outro dono.

## Modos de falha

- O funil soma mais ou menos que o total
- A joia vista não aparece na lista, ou aparece sem foto e sem nome
