## TC-INT-007: Código PIX novo, registro à mão e cancelamento fecham a cobrança anterior no meio de pagamento

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-01.4, CA-03.5a, CA-06.3
**Autor:** dev
**Persona:** PER-03 Cliente que voltou ao pedido
**Jornada:** J-05, passo 2
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** o fechamento acontece no Mercado Pago; no local responde "não fechada" — a tentativa se confere pelo probe 06 da Validation, o fechamento real fica `blocked`

### Objetivo

A cliente não consegue pagar duas vezes o mesmo pedido com um QR ou link antigo.

### Pré-condições

- Conta: `cliente`; `admin` para registrar e cancelar
- Massa: M2 com cobrança anterior; M1 com cobrança aberta (registrar); M1 com cobrança aberta (cancelar); M3 com link vivo (registrar)
- Estado de partida: os pedidos

### Condições reais

As da persona.

### Passos

1. Gera o PIX novo de M2
   - **Esperado:** a cobrança anterior é fechada no meio de pagamento
2. A Adri registra M1 à mão
   - **Esperado:** o PIX em aberto é fechado; o link de cartão de M3, registrado à mão, deixa de valer (TC-FUNC-017)
3. A Adri cancela o outro M1
   - **Esperado:** a cobrança aberta é fechada

### Esperado e fonte

Código novo invalida o anterior; registrar e cancelar fecham o que está aberto — fonte: PRD CA-01.4, CA-03.5a, CA-06.3; costura Decisões 2 e 3.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Aprovação chega mesmo assim | o QR antigo é pago depois de fechado | o pedido não repete efeitos e mostra o selo (TC-FUNC-013) |
