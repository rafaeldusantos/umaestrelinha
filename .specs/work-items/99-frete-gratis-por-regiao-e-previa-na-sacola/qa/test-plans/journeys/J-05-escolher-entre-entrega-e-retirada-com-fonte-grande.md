# J-05 · Escolher entre entrega em Porto Alegre e retirada no escritório, com a fonte grande, indo e voltando da sacola

**Valor:** Teresa, com a conta dela e a fonte em 200 %, calcula o frete na sacola, decide entre entrega e retirada, e
o checkout respeita o que ela escolheu — sem perder o endereço salvo nem o que acabou de calcular.
**Persona:** PER-04 Teresa (principal) · PER-02 Cida (secundária, com conta)
**Prioridade:** P1
**Critérios de origem:** CA-07, CA-09 (com o endereço salvo), CA-10, CA-24
**Charters:** CH-03 · **TC:** TC-JOURNEY-003, TC-FUNC-008, TC-FUNC-009, TC-FUNC-011, TC-FUNC-020

## Entrada

| Origem            | URL / caminho | Estado de partida                                                                  |
| ----------------- | ------------- | ---------------------------------------------------------------------------------- |
| navegação interna | `/`           | deslogada; a conta `cliente-com-endereco` tem endereço salvo em Porto Alegre/RS (90010-000); sacola vazia |

## Passos

| #  | A persona…                                                         | Deve ver                                                                                  | Em até | Fricção prevista                           | TC          |
| -- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------ | ------------------------------------------ | ----------- |
| 1  | lê a barra de confiança da Home e entra pelo aviso de login          | a barra e o aviso de entrada anunciam o frete grátis com "para Sul e Sudeste"            | 8 s | texto cortado a 200 %                      | TC-FUNC-020 |
| 2  | abre um produto e olha o cálculo de frete da página                  | uma linha de texto com a faixa e a região; nenhuma opção zerada nem riscada               | 5 s | —                                          | TC-FUNC-020 |
| 3  | põe a peça na sacola e calcula com 90010-000                         | os grupos "Envio a domicílio" e "Retirar em"; a mais barata de domicílio marcada; a retirada não marcada | 8 s | retirada pré-marcada                      | TC-FUNC-011 |
| 4  | escolhe a retirada                                                 | o resumo diz "Retirada no escritório · Grátis"                                            | 3 s | —                                          | TC-FUNC-011 |
| 5  | segue ao checkout                                                  | a retirada marcada; como o CEP é o do endereço salvo, o endereço salvo inteiro (com número) e o bloco recolhido como hoje | 8 s | endereço salvo trocando o CEP da sacola    | TC-FUNC-008 |
| 6  | volta à sacola, aumenta a quantidade, volta ao checkout              | a cotação refeita com o mesmo CEP; a escolha mantida; a faixa e o Total acompanham       | 10 s | escolha perdida                            | TC-FUNC-009 |

**Tempo total esperado:** 42 s.

## Objetivo

- **Observável:** o checkout dela mostra a forma escolhida na sacola (retirada ou entrega) e o endereço certo, e todo
  valor e CEP está legível a 200 %.
- **Efeitos colaterais:** — (para antes de pagar).

## Saída

- **Natural:** no checkout, pronta para pagar.

## Desvios e abandono

| Ramo  | No passo | Quando                                           | A persona…                     | Deve acontecer                                                                    | TC          |
| ----- | -------- | ------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------- | ----------- |
| J-05a | 3        | ela calcula na sacola com o CEP da filha (01310-100), diferente do salvo | segue ao checkout | vale o CEP da sacola: endereço da busca, "Trazido da sua sacola", foco no Número; o endereço salvo não entra | TC-FUNC-008 |
| J-05b | 6        | ela recarrega o checkout no meio                  | recarrega                      | o rascunho (CEP e escolha) continua na mesma aba                                  | TC-JOURNEY-003 |

## Fronteiras

Cotação interceptada; ViaCEP; login por código (Mailpit local).

## Modos de falha

- O valor ou o CEP cortado a 200 % — ela não sabe o que está pagando.
- O endereço salvo e o CEP da sacola brigando no checkout.
