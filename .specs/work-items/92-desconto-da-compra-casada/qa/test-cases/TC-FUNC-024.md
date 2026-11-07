## TC-FUNC-024: O valor do pedido gravado é o total que o checkout mostrou, ao centavo, no PIX e no cartão

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-04.2, RNF-01
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 6 e ramo J-01d
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** no local o cartão não é alcançável na tela (Brick sem SDK); no cartão confere-se só o total mostrado no checkout — o cobrado do cartão fica com `displayedEqualsCharged.test.ts` (Dev)

### Objetivo

Marina paga o que o checkout mostrou, nem um centavo diferente.

### Pré-condições

- Conta: `anonima`
- Massa: M-01; `mercado-pago` local servida (o `create-payment` recalcula e regrava antes de chamar o Mercado Pago)
- Estado de partida: P e as duas correntes (uma linha mista) na sacola

### Condições reais

As da persona.

### Passos

1. No checkout, escolher PIX e anotar o Total
   - **Esperado:** —
2. Confirmar o pagamento
   - **Esperado:** `/pedido/:id/pagamento` mostra o mesmo valor, ao centavo
3. Recarregar a tela de pagamento
   - **Esperado:** o mesmo valor; nenhum pedido novo
4. Abrir `/pedido/:id`
   - **Esperado:** o mesmo Total
5. Repetir até o passo 1 com cartão
   - **Esperado:** o Total do cartão = Subtotal − descontos (sem PIX) + Frete; registrar que o pagamento não é alcançável

### Esperado e fonte

Fonte: `prd.md` CA-04.2, RNF-01; o "cobrado" no local é o pedido gravado (premissa 🟡 do plano).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| duplo clique em confirmar | — | um pedido só |
| rede lenta | Slow 3G no confirmar | aviso de que está trabalhando; um pedido só |
