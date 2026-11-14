# J-04 · Pagar o pedido montado pela Adri, com entrega em Salvador

**Valor:** Cida abre o link que a Adri mandou, informa o endereço de Salvador e paga o que a loja de fato cobra —
com o frete, mesmo com a faixa alcançada — sem que isso mexa na sacola que ela já tinha.
**Persona:** PER-02 Cida (principal) · —
**Prioridade:** P0
**Critérios de origem:** CA-21, CA-12
**Charters:** CH-06 · **TC:** TC-INT-001, TC-FUNC-017

## Entrada

| Origem                     | URL / caminho                               | Estado de partida                                                                 |
| -------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| link (WhatsApp, simulado)  | o link de `/pedido-montado` preparado na massa | logada como `cliente-salvador`; sacola com uma peça e o CEP 40020-000 calculado na gaveta |

## Passos

| #  | A persona…                                               | Deve ver                                                                              | Em até | Fricção prevista                      | TC          |
| -- | -------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ | ------------------------------------- | ----------- |
| 1  | abre o link do pedido montado                             | as peças montadas (≥ R$ 450) e o próprio formulário de entrega, vazio — não o CEP da sacola | 5 s | confunde com a sacola                  | TC-FUNC-017 |
| 2  | informa o endereço com 40020-000 e escolhe a forma de envio | o frete cobrado (sem "Grátis") e o Total somando o frete                               | 8 s | "Grátis" que some depois                | TC-INT-001  |
| 3  | segue ao pagamento                                       | o pedido nasce com o frete no Total (no local o PIX não conclui: chave inválida)       | 8 s | —                                     | TC-INT-001  |
| 4  | volta à loja e abre a gaveta da sacola                    | a sacola e o CEP 40020-000 calculados antes continuam como estavam                     | 3 s | CEP apagado                            | TC-FUNC-017 |

**Tempo total esperado:** 24 s.

## Objetivo

- **Observável:** o pedido do pedido montado aparece (na tela de pagamento e em `/conta`) com o frete cobrado no Total;
  a sacola dela segue intacta.
- **Efeitos colaterais:** um pedido `pending` no banco local, consumindo o link da massa.

## Saída

- **Natural:** na tela de pagamento do pedido (ou na falha do PIX local), depois de volta à loja.

## Desvios e abandono

| Ramo  | No passo | Quando                                   | A persona…                     | Deve acontecer                                                         | TC          |
| ----- | -------- | ---------------------------------------- | ------------------------------ | ---------------------------------------------------------------------- | ----------- |
| J-04a | 2        | ela digita primeiro um CEP de SP e corrige para o da BA | troca o CEP          | o "Grátis" some e o Total sobe antes do pagamento                       | TC-INT-001  |
| J-04b | 3        | o pagamento falha (local, chave inválida) | volta à loja                  | a sacola não foi esvaziada nem perdeu o CEP                             | TC-FUNC-017 |

## Fronteiras

Edge functions `checkout` (criação do pedido) e `mercado-pago` (cobrança), servidas no local com chaves externas
inválidas; cotação interceptada.

## Modos de falha

- O servidor zera o frete de um pedido montado fora da região (a tela pode até mostrar certo).
- O pedido montado lê ou apaga o rascunho da sacola.
