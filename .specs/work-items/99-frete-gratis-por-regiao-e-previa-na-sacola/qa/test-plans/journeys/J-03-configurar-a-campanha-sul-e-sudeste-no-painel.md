# J-03 · Ligar o frete grátis da Black Friday só para Sul e Sudeste e ver valendo na loja

**Valor:** Adri configura a campanha sozinha, o painel impede a configuração que não faria sentido, e a loja passa a
dizer a regra certa sem deploy.
**Persona:** PER-03 Adri (principal) · —
**Prioridade:** P0
**Critérios de origem:** CA-19, CA-20 (e CA-06, o interruptor desligado)
**Charters:** CH-05 · **TC:** TC-FUNC-018, TC-FUNC-019

## Entrada

| Origem  | URL / caminho                                    | Estado de partida                                                  |
| ------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| direta  | `/admin/configuracoes/frete-e-material` (painel) | logada como `admin-loja`; as cinco regiões marcadas (o padrão da migration) |

## Passos

| #  | A persona…                                                         | Deve ver                                                                                   | Em até | Fricção prevista                         | TC          |
| -- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------ | ---------------------------------------- | ----------- |
| 1  | abre Frete e Material                                               | o interruptor do frete grátis, a faixa e "Regiões com frete grátis" com cinco caixas (Norte, Nordeste, Centro-Oeste, Sudeste, Sul) e o texto de ajuda com os estados de cada região | 3 s | não acha onde fica                        | TC-FUNC-018 |
| 2  | com as cinco marcadas, interruptor ligado e faixa R$ 450, confere a loja numa segunda aba (sacola ≥ R$ 450, sem CEP e com 40020-000) | "Frete grátis liberado" sem CEP e também com o CEP da BA, como antes do Work Item | 10 s | —                                         | TC-FUNC-019 |
| 3  | desmarca todas as regiões e salva                                   | o salvar é recusado com o motivo (escolher ao menos uma região, ou desligar o frete grátis); nada gravado | 3 s | grava em silêncio                         | TC-FUNC-018 |
| 4  | marca Sul e Sudeste e salva                                         | confirmação de salvo                                                                       | 3 s | —                                         | TC-FUNC-018 |
| 5  | volta à aba da loja, recarrega e calcula com 40020-000 e com 01310-100 | BA: "Frete grátis só para Sul e Sudeste"; SP: "Frete grátis liberado"                     | 10 s | precisa de deploy                         | TC-FUNC-018 |

**Tempo total esperado:** 29 s.

## Objetivo

- **Observável:** a configuração gravada é interruptor ligado, faixa R$ 450, Sul + Sudeste, e a loja aplica a regra
  por região sem deploy.
- **Efeitos colaterais:** a configuração vale para toda sessão da loja — é a massa das sessões seguintes.

## Saída

- **Natural:** painel em Frete e Material, com a campanha configurada.

## Desvios e abandono

| Ramo  | No passo | Quando                                 | A persona…                       | Deve acontecer                                                                 | TC          |
| ----- | -------- | -------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------ | ----------- |
| J-03a | 3        | ela desmarca tudo por engano           | tenta salvar                     | recusa com o motivo; ela marca de novo e salva                                  | TC-FUNC-018 |
| J-03b | 3        | ela desliga o frete grátis com nenhuma região | salva                      | grava (desligado com lista vazia é gravável); a loja não mostra faixa nem "Grátis" em nenhuma opção | TC-FUNC-019 |

## Fronteiras

Nenhuma além do banco local (`store_settings`).

## Modos de falha

- O painel grava "ligado sem região" e a campanha fica inativa sem aviso.
- A loja só reflete depois de deploy ou de limpar cache.
