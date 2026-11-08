# J-05 · Reabrir no computador um pedido montado, copiar o link e renovar o vencido

**Valor:** no painel, a Adri reenvia o link que a cliente já tem sem gerar outro, só renova o que venceu, e o
endereço que ela marca para salvar vai para a ficha da cliente.
**Persona:** PER-04 Adri no computador (principal) · — (secundária)
**Prioridade:** P1
**Critérios de origem:** UC-10 (D-14, D-17, D-20, D-25, D-28, D-32)
**Charters:** CH-07 · **TC:** TC-JOURNEY-005, TC-FUNC-032, TC-FUNC-033, TC-REG-002

## Entrada

| Origem            | URL / caminho                                     | Estado de partida                                                 |
| ----------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| navegação interna | `http://localhost:8083/admin` → "Pedidos montados" | logada como `admin-atelie`; massa: um pedido montado aberto (criado pelo app) e um vencido |

## Passos

| #  | A persona…                                     | Deve ver                                                                    | Em até | Fricção prevista                     | TC          |
| -- | ---------------------------------------------- | --------------------------------------------------------------------------- | ------ | ------------------------------------ | ----------- |
| 1  | abre o pedido montado criado pelo app           | o cartão "Link para a cliente" com o link e "Vale até {validade}"           | 3 s    | "Gerar link novo" no lugar (fricção 1) | TC-FUNC-032 |
| 2  | clica em "Copiar link"                          | o link copiado é o mesmo do app                                             | 2 s    | —                                    | TC-FUNC-032 |
| 3  | procura "Renovar" no aberto                      | não há; "Renovar" só no vencido                                             | 5 s    | quer mais prazo (fricção 2)          | TC-FUNC-032 |
| 4  | abre o vencido e renova                          | o diálogo de renovar com a frase nova; um link novo                         | 10 s   | —                                    | TC-FUNC-032 |
| 5  | monta um pedido novo com endereço e "Salvar no cadastro da cliente" marcada | o pedido montado criado                         | 90 s   | endereço não salvo (fricção 3)       | TC-FUNC-033 |
| 6  | abre a ficha da cliente                          | o endereço salvo uma vez                                                    | 5 s    | —                                    | TC-FUNC-033 |

**Tempo total esperado:** ~2 min.

## Objetivo

- **Observável:** o link copiado no painel abre na loja; o endereço marcado está na ficha, sem duplicata
- **Efeitos colaterais:** "Link enviado · copiado" no histórico (visto também no app)

## Saída

- **Natural:** a lista de pedidos montados.

## Desvios e abandono

| Ramo  | No passo | Quando                               | A persona…            | Deve acontecer                                                                          | TC          |
| ----- | -------- | ------------------------------------ | --------------------- | --------------------------------------------------------------------------------------- | ----------- |
| J-05a | 5        | a gravação falha                     | lê a mensagem e tenta de novo | "Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo."; nem pedido montado nem endereço gravados | TC-FUNC-033 |
| J-05b | 5        | o endereço já está salvo na ficha    | marca salvar de novo  | nenhum endereço duplicado                                                               | TC-FUNC-033 |

## Fronteiras

Cruza o app (o mesmo pedido montado, criado lá) e a loja (o link).

## Modos de falha

- O painel e o app mostram links diferentes para o mesmo pedido montado
- O endereço é gravado mesmo com a proposta recusada
