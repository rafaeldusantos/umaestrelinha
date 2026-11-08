# CH-04 · Voltar, sair e o rascunho da montagem

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-02 Adri interrompida                                                      |
| Tour         | Back-Button                                                                   |
| Modo         | com tour                                                                      |
| Time-box     | 90 min · orçamento: 70 ações                                                  |
| Mudança      | os passos e as folhas como entradas do histórico, a sentinela do passo 1 e o indicador (UC-02, D-12); o voltar depois de "Criar link" leva a Montados, com a montagem fora do histórico (UC-02, D-43 — decidido pelo humano na Q-01, 2026-11-08); a folha de sair com "Guardar rascunho"/"Descartar" (UC-02, D-18); o rascunho no aparelho só com peças e descontos, preso à conta (UC-02, D-15, D-19, D-42); a barra de abas fora das rotas novas |
| Viewport     | 390 × 844                                                                     |
| Entrada      | `/pedidos` → "Montar pedido" · logada como `admin-atelie`, sem rascunho       |
| Jornadas     | J-03, J-01 (saída)                                                            |
| TC           | TC-JOURNEY-003, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-SEC-002, TC-REG-001 |

## Missão

Confirmar que o voltar do Android, o "x", o F5 e o app fechado no meio nunca jogam fora a sacola sem
perguntar, nunca refazem o que já foi confirmado, que depois de "Criar link" o voltar leva a Montados sem
reabrir a montagem, e que o que volta do aparelho é só peças e descontos — nenhum dado da cliente.

## Deve tentar

1. Voltar (`history.back`, o voltar do Android no browser) em cada passo, com e sem folha aberta; no passo 1 com nada e com algo preenchido
2. Fechar a aba no passo 3 com peças, cupom e combinado; reabrir `/pedidos/montar` e ler "Rascunho retomado: …"
3. Inspecionar o `localStorage` (`estrelinha-montagem-rascunho`), o `history.state` e a URL em cada passo: nenhum nome, e-mail, telefone, CPF, endereço, observação nem motivo
4. Guardar rascunho, sair da conta, entrar de novo: o rascunho não volta
5. Criar um link e voltar duas vezes: a primeira cai em Montados (`/pedidos?visao=montados`) com o cartão novo, a segunda sai de Pedidos sem passar por passo nenhum da montagem (TC-FUNC-003, Q-01, D-43). O código de hoje cai na montagem vazia — registre como bug P1, com o `history.length` e as URLs de cada voltar como evidência

## Edge cases sugeridos

- F5 num passo do meio (recomeça no passo 1, com o rascunho)
- Deep link direto para `/pedidos/montar` numa aba nova
- Voltar e avançar repetido pelo indicador de passos
- Voltar depois de "Criar link" com uma folha do pedido montado aberta (cancelar, observação): a folha fecha primeiro, o voltar seguinte leva a Montados
- Avançar (`history.forward`) depois de voltar a Montados: não reabre a montagem
- F5 durante o Editar de um pedido montado (D-41: recomeça vazia, sem rascunho)
- Peça do rascunho que saiu do catálogo antes de reabrir (desativar no painel)
- Girar o celular no meio do passo 2

## Fora do escopo

- A sobrevivência do rascunho no PWA instalado no Android real (o processo encerrado pelo sistema): não alcançável no browser da sessão — vai a Fora da cobertura
- O gesto físico de voltar do Android: simulado por `history.back`
- O conteúdo de cada passo (CH-01, CH-03) e a leitura (CH-02)
- O detalhe do pedido (`/pedidos/:id`) e a folha de rastreio (feature 75, pré-existentes)
