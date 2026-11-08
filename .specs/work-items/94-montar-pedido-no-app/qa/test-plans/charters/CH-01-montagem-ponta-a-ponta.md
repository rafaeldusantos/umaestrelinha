# CH-01 · A montagem de ponta a ponta no celular

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-01 Adri no WhatsApp                                                       |
| Tour         | Feature                                                                       |
| Modo         | por cenário (J-01 sem a IA, depois J-02)                                      |
| Time-box     | 90 min · orçamento: 70 ações                                                  |
| Mudança      | o botão "Montar pedido" e a visão Montados (UC-01); a montagem em 4 passos com a barra e os motivos (UC-02, D-21); cliente cadastrada (UC-03, D-26) e nova (UC-04, MON-03, D-13); peças com foto (UC-06, D-22, D-37); revisão e "Criar link" (UC-08, D-30, D-40); a ficha e o endereço gravados ao criar (UC-04, D-16, D-32); a saída depois de "Criar link" — o voltar leva a Montados, com a montagem fora do histórico (UC-02, D-43) |
| Viewport     | 390 × 844                                                                     |
| Entrada      | `http://localhost:8084/pedidos` · logada como `admin-atelie`, sem rascunho no aparelho |
| Jornadas     | J-01, J-02                                                                    |
| TC           | TC-SMOKE-001, TC-SMOKE-002, TC-JOURNEY-002, TC-FUNC-001, TC-FUNC-002, TC-FUNC-006, TC-FUNC-007, TC-FUNC-008, TC-FUNC-009, TC-FUNC-010, TC-FUNC-016, TC-FUNC-017, TC-FUNC-018, TC-FUNC-019, TC-FUNC-024, TC-FUNC-025, TC-INT-001, TC-PERSONA-001 |

## Missão

Confirmar que a Adri, só com o celular, monta um pedido para uma cliente nova (digitando) e outro para uma
cliente cadastrada, do toque em "Montar pedido" ao pedido montado com o link, sem parar sem saber por quê —
e que a ficha e o endereço só existem depois de "Criar link".

## Deve tentar

1. Rodar primeiro o smoke (TC-SMOKE-001, TC-SMOKE-002): se falhar, pare e registre — o resto testa um build quebrado
2. Em cada passo, deixar um campo de fora de propósito e ler o motivo na barra; conferir que o botão só liga quando o motivo some
3. Cliente nova com um e-mail que já tem ficha: "Usar a ficha dela" e, noutra rodada, "Corrigir o e-mail"; depois de criar, conferir no painel que não nasceu segunda ficha
4. Antes de "Criar link", abrir o painel (outra aba, 1440) e conferir que a ficha nova e o endereço ainda não existem; depois, que existem uma vez só
5. Ao fim de cada jornada, já no pedido montado, voltar uma vez (`history.back`): tem de cair em Montados com o cartão novo, e um segundo voltar não reabre a montagem (Q-01, D-43). Cair na montagem vazia — o comportamento do código de hoje — é bug P1

## Edge cases sugeridos

- Duplo toque em "Criar link" e em "Acrescentar"
- CEP inexistente (`99999-999`) e CEP de cidade sem rua (digitado à mão, rua já escrita)
- Busca de cliente só com os dígitos do telefone, e com o termo colado com espaços
- Cliente cadastrada sem endereço salvo (a entrega nasce em "A cliente preenche no link")
- Peça com uma variação esgotada e outra com estoque 3, já com 2 na sacola
- Nome de joia longo e gravação no teto, em 390
- Voltar ao passo 1 pelo "Alterar" da revisão e trocar a cliente

## Fora do escopo

- A folha "Colar texto" e a leitura por IA (CH-02); cupom, promoção e combinado em profundidade (CH-03)
- O voltar do Android dentro da montagem, sair e o rascunho (CH-04); o pedido montado depois de criado (CH-06)
- A aba Clientes e o detalhe do pedido (pré-existentes; só o que a TC-SEC-003 confere)
- Registrar um pedido já pago por fora — fora do WI (PRD); "Colar texto" no painel — WI seguinte
- A Política de Privacidade — fora do WI (risco aceito no PRD)
