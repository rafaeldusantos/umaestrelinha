# J-04 · Reabrir um pedido montado dias depois, mandar o mesmo link e a cliente abri-lo na loja

**Valor:** quando a cliente diz "perdi o link", a Adri o acha e reenvia o MESMO link, sem gerar outro e sem
matar o que a cliente já tinha.
**Persona:** PER-02 Adri interrompida (principal) · PER-06 Juliana (secundária, só a ponta da loja) ·
PER-03 (secundária, no CFR)
**Prioridade:** P0
**Critérios de origem:** UC-01, UC-09 (D-14, D-17, D-28, D-31, D-35, D-36, D-41)
**Charters:** CH-06, CH-08 · **TC:** TC-JOURNEY-004, TC-FUNC-001, TC-FUNC-027, TC-FUNC-028, TC-FUNC-029,
TC-FUNC-030, TC-FUNC-031, TC-INT-002, TC-INT-003, TC-SMOKE-003

## Entrada

| Origem            | URL / caminho                          | Estado de partida                                                       |
| ----------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| navegação interna | `/pedidos` → chip "Montados · N abertos" | logada como `admin-atelie`; massa: pedido montado aberto criado com `PROPOSAL_TOKEN_KEY` configurada, com telefone |

## Passos

| #  | A persona…                                  | Deve ver                                                                         | Em até | Fricção prevista                  | TC          |
| -- | ------------------------------------------- | -------------------------------------------------------------------------------- | ------ | --------------------------------- | ----------- |
| 1  | toca no chip "Montados"                      | "N pedidos montados · os mais recentes primeiro" e os cartões                    | 3 s    | —                                 | TC-FUNC-001 |
| 2  | toca no cartão da cliente                    | o pedido montado com "Link para <nome>" e o link em caixa                        | 3 s    | link ausente (fricção 3)          | TC-FUNC-027 |
| 3  | toca em "Copiar link"                        | "Link copiado." e "Link enviado · copiado" no histórico                          | 2 s    | —                                 | TC-FUNC-027 |
| 4  | (Juliana) abre o link no celular             | a página do pedido montado da loja com as peças e o preço travados               | 6 s    | link "não disponível"              | TC-INT-002  |
| 5  | (Juliana) conclui no link                    | o pedido criado na loja                                                          | 60 s   | —                                 | TC-INT-003  |
| 6  | a Adri reabre o pedido montado               | "Concluída", "Virou o pedido #NNNN" e "Ver o pedido #NNNN"                       | 3 s    | —                                 | TC-INT-003, TC-FUNC-028 |

**Tempo total esperado:** ~1 min do lado da Adri.

## Objetivo

- **Observável:** o link copiado é o mesmo que a cliente já tinha e abre na loja; depois da conclusão, o cartão diz "Virou o pedido #NNNN"
- **Efeitos colaterais:** o pedido nasce com a origem "Pedido montado" (D-25)

## Saída

- **Natural:** "Ver o pedido #NNNN" leva ao detalhe do pedido no app.

## Desvios e abandono

| Ramo  | No passo | Quando                              | A persona…                          | Deve acontecer                                                                                              | TC          |
| ----- | -------- | ----------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------- |
| J-04a | 2        | o link venceu                       | toca em "Renovar prazo"             | a folha "O link venceu em {dd/mm}. Os preços são conferidos de novo e sai um link novo, que vale até {dd/mm}. Mande o novo para {nome}."; o link antigo para de abrir | TC-FUNC-028, TC-INT-002 |
| J-04b | 2        | a cliente desistiu                  | toca em "Cancelar este pedido"      | a folha "Cancelar P-NNNN?"; depois "Pedido montado cancelado."; o link diz que não está mais disponível      | TC-FUNC-028, TC-INT-002 |
| J-04c | 2        | a cliente quer trocar uma peça      | toca em "Editar"                    | a montagem com o que foi gravado; salvar mantém o mesmo link                                                | TC-FUNC-029 |
| J-04d | 2        | a proposta foi criada sem a chave da cifra | procura o link              | "Gerar link novo" no lugar do link                                                                          | TC-FUNC-031 |
| J-04e | 2        | sem telefone na ficha               | procura o WhatsApp                  | "Sem telefone — copie o link."                                                                              | TC-FUNC-027 |

## Fronteiras

**Cruza a loja** (`apps/store`, `/pedido-montado`, function `get-proposal`/`checkout` pelo hash do token) e a
cifra nova do token (`PROPOSAL_TOKEN_KEY`, opcional). Ganha prioridade na regressão.

## Modos de falha

- O link mostrado ao reabrir não é o que a cliente tem (abre "não disponível")
- Renovar aparece num pedido aberto e mata o link em uso
