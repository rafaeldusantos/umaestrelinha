## TC-JOURNEY-003: Cliente com PIX vencido gera um código novo pela conta e chega ao pagamento do mesmo pedido

**Tipo:** journey
**Prioridade:** P1
**Origem:** CA-01.1, CA-01.2
**Autor:** dev
**Persona:** PER-03 Cliente que voltou ao pedido
**Jornada:** J-05, passos 1–2
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** o código novo é criado pelo Mercado Pago; no ambiente local (chaves inválidas) a cobrança não se cria e o caso fica `blocked` depois da chegada à rota; o percurso até lá se confere no browser

### Objetivo

A cliente cujo PIX venceu paga o mesmo pedido sem refazer a compra.

### Pré-condições

- Conta: `cliente`
- Massa: M2 (PIX vencido há 2 dias, pendente, não cancelado)
- Estado de partida: `/conta`, logada

### Condições reais

As da persona.

### Entrada

`http://localhost:8082/conta`.

### Passos com tempo

1. Lê as pendências — **Esperado:** o pedido com "Gerar novo PIX" e a data-limite (7 dias depois do pedido) (15 s)
2. Toca em "Gerar novo PIX" — **Esperado:** `/pedido/:id/pagamento` do mesmo pedido, gerando o código (5 s)
3. Espera o QR — **Esperado:** o QR e o valor do pedido (no local: `blocked` pelo Mercado Pago, e a tela diz que não conseguiu, com saída) (15 s)

### Objetivo e efeitos

- O QR novo do mesmo pedido; o anterior deixa de valer (TC-INT-007)

### Caminho de abandono

A geração falha (local): a tela explica e oferece tentar de novo ou falar com a loja, sem perder o pedido.

### Esperado e fonte

"Gerar novo PIX" com data-limite e chegada ao pagamento do mesmo pedido — fonte: PRD CA-01.2; costura "O que já serve" (`repix.ts`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| A partir do pedido | abrir `/pedido/:id` e gerar dali | mesma oferta, mesma chegada |
| PIX recusado | repetir com o pedido M2 recusado | mesma oferta |
