## TC-FUNC-020: Pedido de cartão nunca cobrado não aparece nas pendências da conta

**Tipo:** functional
**Prioridade:** P2
**Origem:** CA-02.3
**Autor:** dev
**Persona:** PER-03 Cliente que voltou ao pedido
**Jornada:** J-05, passo 1
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** ausência na lista de pendências

### Objetivo

A cliente que desistiu no checkout antes de cobrar não é lembrada de um pagamento que nunca tentou.

### Pré-condições

- Conta: `cliente`
- Massa: M5 (cartão criado e nunca cobrado)
- Estado de partida: `/conta`

### Condições reais

As da persona.

### Passos

1. Lê as pendências de `/conta`
   - **Esperado:** M5 não está nas pendências
2. Abre `/pedido/<M5>` pela lista de pedidos
   - **Esperado:** sem o convite do WhatsApp do cartão

### Esperado e fonte

Abandonado no checkout não aparece nas pendências — fonte: PRD CA-02.3; costura Decisão 9.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| — | — | — |
