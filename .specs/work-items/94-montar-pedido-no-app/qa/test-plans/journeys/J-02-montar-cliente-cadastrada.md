# J-02 · Montar pelo celular o pedido de uma cliente que já comprou, com o desconto combinado

**Valor:** a cliente de volta recebe o pedido no endereço que já tem cadastrado, com o desconto que a Adri
acertou, sem nada ser redigitado.
**Persona:** PER-01 Adri no WhatsApp (principal) · — (secundária)
**Prioridade:** P0
**Critérios de origem:** UC-02, UC-03, UC-05, UC-06, UC-07, UC-08
**Charters:** CH-01, CH-03 · **TC:** TC-JOURNEY-002, TC-FUNC-006, TC-FUNC-007, TC-FUNC-013, TC-FUNC-019,
TC-FUNC-020, TC-FUNC-022, TC-FUNC-023, TC-FUNC-024, TC-FUNC-025, TC-SMOKE-002

## Entrada

| Origem            | URL / caminho                     | Estado de partida                                            |
| ----------------- | --------------------------------- | ------------------------------------------------------------ |
| navegação interna | `/pedidos` → "Montar pedido"      | logada como `admin-atelie`; massa: cliente cadastrada com endereço padrão e um segundo endereço salvo |

## Passos

| #  | A persona…                                         | Deve ver                                                                 | Em até | Fricção prevista | TC          |
| -- | -------------------------------------------------- | ------------------------------------------------------------------------ | ------ | ---------------- | ----------- |
| 1  | busca a cliente pelos dígitos do telefone           | a cliente com "e-mail · N pedidos"                                       | 5 s    | —                | TC-FUNC-006 |
| 2  | escolhe a cliente                                   | cartão "Cliente" com "Trocar"; "Entrega" já no "Endereço padrão"         | 2 s    | —                | TC-FUNC-006 |
| 3  | troca para o outro endereço salvo                   | o endereço salvo escolhido                                               | 5 s    | —                | TC-FUNC-007 |
| 4  | acrescenta duas peças, uma com gravação             | a sacola com a foto de cada variação e a gravação                        | 60 s   | chip pequeno     | TC-FUNC-018, TC-FUNC-019 |
| 5  | liga o desconto combinado em %, escreve o motivo    | o resumo vivo com o combinado depois da promoção e do cupom              | 20 s   | —                | TC-FUNC-022, TC-FUNC-023 |
| 6  | revisa e toca em "Criar link"                       | o pedido montado com o link                                              | 10 s   | —                | TC-FUNC-024, TC-FUNC-025 |

**Tempo total esperado:** ~2 min.

## Objetivo

- **Observável:** o pedido montado aberto, com o total igual ao da revisão e o motivo do combinado fora da vista da cliente
- **Efeitos colaterais:** a ficha existente não muda de nome, e-mail nem telefone

## Saída

- **Natural:** o pedido montado; depois, Montados.

## Desvios e abandono

| Ramo  | No passo | Quando                                    | A persona…                                     | Deve acontecer                                                                 | TC          |
| ----- | -------- | ----------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ | ----------- |
| J-02a | 3        | a cliente mandou um endereço novo         | escolhe "Outro endereço" › "Colar de uma mensagem" | a folha "Colar o endereço" preenche só o endereço; a ficha não muda          | TC-FUNC-013 |
| J-02b | 5        | o combinado zeraria o pedido              | digita 100 %                                   | "O desconto não pode zerar o pedido." e o desconto fora da conta              | TC-FUNC-022 |
| J-02c | 1        | a cliente não aparece na busca            | lê a frase                                     | "Ninguém com “q”. Se for a primeira compra, use Cliente nova."                 | TC-FUNC-006 |

## Fronteiras

O serviço de CEP; a cotação do Melhor Envio na prévia; a `customer-parse` só no ramo J-02a.

## Modos de falha

- A leitura no "Outro endereço" troca nome, e-mail ou telefone da ficha
- O total do pedido montado difere do da revisão
