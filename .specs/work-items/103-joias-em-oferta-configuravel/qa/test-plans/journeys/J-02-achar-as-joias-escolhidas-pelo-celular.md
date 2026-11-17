# J-02 · Achar pelo celular as joias escolhidas em oferta e chegar à peça com o preço da campanha

**Valor:** a cliente entende, pelo título e pelas peças que a dona escolheu, o que está em oferta e quanto vai pagar.
**Persona:** PER-02 Marina (principal) · —
**Prioridade:** P0
**Critérios de origem:** CA-01.4, CA-02.2, CA-03.2, CA-03.3, CA-04.6, RNF-02, RNF-04, RNF-06
**Charters:** CH-02, CH-07 (cfr) · **TC:** TC-JOURNEY-002, TC-FUNC-008, TC-UI-001

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| direta (link do story) | `http://localhost:8082/` | sem login, sacola vazia; B-1 configurado pelo CH-01 (C-VIG, título, descrição, P-1..P-3) |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1 | abre a Home e desce até as ofertas | o bloco com o selo, o título e a descrição da dona, os cartões de percentual | 4 s | o título longe do desconto (hipótese 3) | TC-FUNC-008 |
| 2 | passa as peças | as três peças na ordem da dona, numa fileira que rola de lado sem empurrar a página | 5 s | não perceber que há mais (hipótese 1) | TC-UI-001 |
| 3 | toca numa peça | a página da peça com o selo e o preço da campanha | 4 s | a Home pular enquanto carrega (hipótese 2) | TC-JOURNEY-002 |
| 4 | volta e toca em "Ver todas" | `/ofertas` com as peças da campanha | 4 s | — | TC-JOURNEY-002 |

**Tempo total esperado:** ~20 s — dentro da paciência da persona (60 s).

## Objetivo

- **Observável:** a página de uma das peças escolhidas, com o selo de "Dia das Mães" e o preço da campanha
- **Efeitos colaterais:** —

## Saída

- **Natural:** `/ofertas` ou a sacola

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-02a | 1–2 | a rede está lenta | espera | o bloco reserva uma vaga por peça escolhida; nada salta quando as peças chegam | TC-UI-001 |
| J-02b | 2 | a leitura das peças falha | segue descendo | a Home continua de pé e o bloco mostra os cartões de percentual | TC-FUNC-008 (variação) |

## Fronteiras

nenhuma

## Modos de falha

- o bloco mostra as quatro primeiras da campanha em vez das escolhidas, ou outra ordem
- a fileira cria rolagem horizontal do corpo em 390 px
