# CH-06 · O pedido montado e o link que a cliente recebe

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-02 Adri interrompida                                                      |
| Tour         | Feature                                                                       |
| Modo         | por cenário (J-04)                                                            |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | a visão Montados e os cartões (UC-01, D-34, D-35); o pedido montado: o link sempre enquanto aberto, WhatsApp e Copiar com histórico, as peças com foto, a observação, Editar, Cancelar, Renovar só depois de vencer e "Gerar link novo" sem cifra (UC-09; D-14, D-17, D-28, D-31, D-36, D-41); o link guardado como hash + cifra e aberto na loja pelo hash (UC-09, SEG-01); a origem "Pedido montado" (D-25) |
| Viewport     | 390 × 844 (o app e a loja)                                                    |
| Entrada      | `/pedidos?visao=montados` · logada como `admin-atelie`; a ponta da loja em `http://localhost:8082/pedido-montado#<token>` numa aba anônima (PER-06 só abre e confere — sem trocar de persona na exploração) |
| Jornadas     | J-04                                                                          |
| TC           | TC-SMOKE-003, TC-JOURNEY-004, TC-FUNC-001, TC-FUNC-027, TC-FUNC-028, TC-FUNC-029, TC-FUNC-030, TC-FUNC-031, TC-INT-002, TC-INT-003, TC-SEC-003 |

## Missão

Confirmar que, dias depois, a Adri acha o pedido montado, copia o MESMO link que a cliente tem e que ele abre
na loja com os preços travados — e que nenhuma ação (Editar, Renovar, Cancelar) mata o link sem ela saber.

**Dependência de ambiente:** o link sempre disponível exige `PROPOSAL_TOKEN_KEY` (32 bytes em base64) no
`.env` das functions locais; sem ela, o cartão mostra "Gerar link novo" (D-28) — rode TC-FUNC-031 nesse estado
e marque TC-FUNC-027/TC-INT-002 `blocked` (ambiente). O app precisa de `VITE_STORE_URL` apontando para a loja
local (`http://localhost:8082`). Proposta **expirada** de massa: a validade passada no banco local.

## Deve tentar

1. Copiar o link, sair do pedido montado, recarregar o app, voltar e copiar de novo: o mesmo link; abrir na loja
2. Renovar a expirada e conferir que o link antigo não abre mais e o novo abre; cancelar uma aberta e abrir o link
3. Editar uma aberta, trocar uma peça e salvar: o mesmo link abre com o conteúdo novo
4. Conferir a observação interna: editar no pedido montado e ver que a loja (o link) não a mostra

## Edge cases sugeridos

- Duplo toque em "Copiar link" e em "Cancelar pedido"
- Voltar depois de cancelar e de renovar
- Pedido montado sem telefone ("Sem telefone — copie o link.")
- Mesmo pedido montado aberto no app e no painel ao mesmo tempo, renovar num e copiar no outro
- Lista de Montados com os cinco estados e com nenhum montado (estado vazio)
- Nome de cliente longo e quatro peças no cartão, em 390

## Fora do escopo

- O checkout da loja além de abrir `/pedido-montado` e concluir com PIX (feature 89)
- O painel (CH-07), salvo como segunda aba no edge case acima
- Duplicar pedido montado (só no desenho do painel, não pedido)
- A montagem em si (CH-01, CH-03)
