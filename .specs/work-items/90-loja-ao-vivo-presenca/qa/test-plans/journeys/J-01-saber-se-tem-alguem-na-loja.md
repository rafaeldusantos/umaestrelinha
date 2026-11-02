# J-01 · Saber, pelo Início, se tem alguém na loja agora

**Valor:** a Adri descobre em um olhar quantas pessoas estão na loja e chega à Loja ao vivo com um toque.
**Persona:** PER-01 Adri (principal) · PER-02 Adri à noite, fonte 200 % (secundária)
**Prioridade:** P0
**Critérios de origem:** LAV-01, LAV-02, LAV-03, LAV-05, LAV-10, LAV-11, LAV-12
**Charters:** CH-01, CH-06, CH-08 · **TC:** TC-SMOKE-001, TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-018, TC-FUNC-019

## Entrada

| Origem             | URL / caminho                 | Estado de partida                                                  |
| ------------------ | ----------------------------- | ------------------------------------------------------------------ |
| direta (PWA aberto) | http://localhost:8084/        | logada como `admin-atelie`; uma cliente (PER-03) com a loja aberta numa joia, com estatística aceita |

## Passos

| # | A persona…                                   | Deve ver                                                                                 | Em até | Fricção prevista                     | TC             |
| - | -------------------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ------------------------------------ | -------------- |
| 1 | abre o Início                                | abaixo da faixa escura e antes de "Precisa de você", o cartão "Agora na loja" com o número e "pessoa"/"pessoas" | 3 s | traços demorando a virar número | TC-SMOKE-001, TC-FUNC-001 |
| 2 | lê a linha do funil e o mini gráfico          | "{x} com joia na sacola · {y} no checkout", partes zeradas somem; 15 barras, a última dourada | 2 s | — | TC-FUNC-001 |
| 3 | espera a cliente entrar ou sair               | o número muda sozinho em até 30 s + 60 s, sem tocar em nada                                | 90 s   | ela acha que a tela está parada      | TC-FUNC-021    |
| 4 | toca no cartão                                | a tela "Loja ao vivo" abre, com o `h1` e o frescor                                        | 2 s    | —                                    | TC-FUNC-002    |
| 5 | lê o bloco "Agora na loja"                    | o mesmo número do cartão, "pessoas nos últimos 5 minutos", 30 barras com a de agora igual ao número | 3 s | os dois números divergirem | TC-JOURNEY-001, TC-FUNC-003 |

**Tempo total esperado:** ~10 s sem o passo 3 — dentro da paciência dela (20 s por número).

## Objetivo

- **Observável:** o número do cartão do Início e o número grande da Loja ao vivo dizem a mesma quantidade de
  pessoas que estão de fato com a loja aberta
- **Efeitos colaterais:** —

## Saída

- **Natural:** a Adri volta ao Início pelo "Voltar", ou fica na Loja ao vivo (J-02)

## Desvios e abandono

| Ramo  | No passo | Quando                                       | A persona…               | Deve acontecer                                                          | TC          |
| ----- | -------- | -------------------------------------------- | ------------------------ | ----------------------------------------------------------------------- | ----------- |
| J-01a | 1        | a leitura falha (rede)                       | toca em "Tentar de novo" | "Não consegui carregar." e "Tentar de novo" no cartão; o número volta    | TC-FUNC-018 |
| J-01b | 1        | a loja não está sendo medida (sem host de produção) | lê o cartão       | a mesma frase de Acessos, nunca "Ninguém na loja agora" nem um número   | TC-FUNC-019 |
| J-01c | 1        | ninguém na loja                              | lê o cartão              | "Ninguém na loja agora", gráfico visível, cartão nunca escondido        | TC-FUNC-018 |

## Fronteiras

Cruza a loja (8082) → function `visit` → banco local → app do ateliê (8084). A presença só existe se a loja
avisou; o app só lê.

## Modos de falha

- A cliente na loja não aparece no app (o aviso não sai, ou é recusado como robô/host interno)
- O número do cartão e o da tela divergem
