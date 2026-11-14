# J-01 · Ver o frete na sacola, com o frete grátis liberado, e seguir ao checkout sem redigitar o CEP

**Valor:** Luana sabe, ainda na sacola, quanto paga de entrega para São Paulo e que o frete grátis vale para ela, e
chega ao checkout com o mesmo Total e o endereço já preenchido — falta só o número.
**Persona:** PER-01 Luana (principal) · PER-04 Teresa (secundária, com conta)
**Prioridade:** P0
**Critérios de origem:** CA-01, CA-02, CA-03, CA-04, CA-05, CA-09, CA-14, CA-16
**Charters:** CH-01 · **TC:** TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-FUNC-006, TC-FUNC-007

## Entrada

| Origem             | URL / caminho          | Estado de partida                                  |
| ------------------ | ---------------------- | -------------------------------------------------- |
| navegação interna  | `/` → página de um produto | anônima, sacola vazia, rascunho do checkout vazio (aba nova) |

## Passos

| #  | A persona…                                                     | Deve ver                                                                                     | Em até | Fricção prevista                         | TC          |
| -- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ | ---------------------------------------- | ----------- |
| 1  | põe na sacola uma peça abaixo de R$ 450 e abre a gaveta        | a faixa "Faltam R$ X para o frete grátis" com o ⓘ, a barra, e o campo "CEP para calcular o frete" com "Calcular" no rodapé | 5 s | o rodapé cobre as peças                  | TC-FUNC-001, TC-FUNC-005 |
| 2  | toca no ⓘ                                                      | o balão diz a regra: a partir de R$ 450,00, Sul (PR, SC, RS) e Sudeste (SP, RJ, MG, ES), conferida pelo CEP; nenhum "liberado" | 3 s | alvo pequeno                              | TC-FUNC-005 |
| 3  | digita 01310-100 e toca "Calcular"                              | as opções (PAC, SEDEX) com prazo e valor, a mais barata marcada, a linha "Frete · PAC" e o Total com o frete | 5 s | —                                         | TC-FUNC-002, TC-FUNC-003 |
| 4  | toca na opção mais barata                                      | a lista recolhe numa linha: serviço, prazo, CEP 01310-100, valor                              | 2 s | CEP cortado na linha                      | TC-FUNC-004 |
| 5  | aumenta a quantidade até o subtotal passar de R$ 450            | a faixa vira destaque em ouro "Frete grátis liberado"; o PAC sai "Grátis" com o valor riscado; o Total sem frete | 5 s | Total pisca ou demora                     | TC-FUNC-006 |
| 6  | toca "Finalizar Pedido" e preenche o Contato                    | no bloco Entrega: CEP 01310-100, rua, bairro, cidade e UF preenchidos, "Trazido da sua sacola · Bela Vista — São Paulo/SP", o PAC marcado e o foco no Número | 8 s | digitar o CEP de novo                    | TC-FUNC-007 |
| 7  | confere o Resumo do pedido                                     | "Frete · PAC" Grátis e o mesmo Total que a sacola mostrava                                  | 3 s | Total diferente                           | TC-JOURNEY-001 |

**Tempo total esperado:** 31 s de tela — dentro da paciência dela (60 s confusa).

## Objetivo

- **Observável:** o Resumo do checkout mostra o frete PAC "Grátis" e o mesmo Total que a gaveta mostrava; o bloco
  Entrega tem o CEP, o endereço e a opção vindos da sacola, esperando só o número.
- **Efeitos colaterais:** — (nenhum pedido criado: a jornada para antes de pagar).

## Saída

- **Natural:** no checkout, pronta para escolher o pagamento.

## Desvios e abandono

| Ramo  | No passo | Quando                                       | A persona…                         | Deve acontecer                                                                 | TC          |
| ----- | -------- | -------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------ | ----------- |
| J-01a | 3        | digita só 7 dígitos                          | toca "Calcular"                    | "CEP inválido" junto do campo, nenhuma consulta de frete                        | TC-FUNC-001 |
| J-01b | 3        | a consulta do frete falha                     | tenta de novo, ou segue ao checkout | "Não consegui consultar o frete agora…" com "Tentar de novo"; Total sem frete; "Finalizar Pedido" funciona; nenhum "Frete padrão" | TC-FUNC-010 |
| J-01c | 5        | volta a quantidade para baixo da faixa       | olha a faixa e o Total             | a faixa volta a "Faltam R$ X", o PAC deixa de ser grátis e o Total soma o frete | TC-FUNC-009 |

## Fronteiras

Cotação do Melhor Envio (edge function `melhor-envio`, interceptada na rodada local — ver Ambiente da execução) e a
busca de endereço pelo CEP (ViaCEP, serviço público).

## Modos de falha

- O Total da gaveta e o do checkout divergem (dois donos do total).
- O checkout não recebe o CEP e a cliente redigita tudo — a promessa central da prévia some.
