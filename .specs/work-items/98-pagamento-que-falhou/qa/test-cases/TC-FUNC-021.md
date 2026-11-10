## TC-FUNC-021: Pedido cancelado não oferece pagamento em nenhuma tela da cliente

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.4
**Autor:** dev
**Persona:** PER-03 Cliente que voltou ao pedido
**Jornada:** J-05, passo 5, ramo J-05a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** inclui o endereço do pagamento colado na barra

### Objetivo

A cliente não paga um pedido que a loja já cancelou.

### Pré-condições

- Conta: `cliente`
- Massa: M12 (PIX, cancelado pela admin)
- Estado de partida: `/conta`

### Condições reais

As da persona.

### Passos

1. Abre `/pedido/<M12>` e `/conta`
   - **Esperado:** sem "Pagar com PIX", sem "Gerar novo PIX", sem convite de cartão
2. Cola `/pedido/<M12>/pagamento` na barra
   - **Esperado:** não gera código; diz que o pedido está cancelado

### Esperado e fonte

Pedido cancelado não oferece pagamento em tela nenhuma — fonte: PRD CA-02.4.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Cancelado com o QR aberto | a thread cancela M1 com `/pedido/<M1>/pagamento` aberto; ela recarrega | não oferece mais pagar |
