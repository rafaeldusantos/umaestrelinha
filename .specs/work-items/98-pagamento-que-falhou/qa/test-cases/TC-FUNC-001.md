## TC-FUNC-001: "Registrar pagamento" aparece só em pedido não pago e não cancelado

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.1
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-01, passo 1
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** presença/ausência por estado, determinística

### Objetivo

A dona só vê a ação onde ela faz sentido; onde o pedido já foi pago ou cancelado, não há como registrar por engano.

### Pré-condições

- Conta: `admin`
- Massa: M6 (pagamento pendente), M2 (PIX vencido e recusado), M9 (pago), M12 (cancelado)
- Estado de partida: lista de pedidos

### Condições reais

As da persona.

### Passos

1. Abre o pedido M6
   - **Esperado:** "Registrar pagamento" presente
2. Abre os pedidos M2 (vencido) e M2 (recusado)
   - **Esperado:** "Registrar pagamento" presente
3. Abre o pedido M9 (pago) e o M12 (cancelado)
   - **Esperado:** sem "Registrar pagamento"
4. Cola na barra `/admin/pedidos/<M9>/pagamento`
   - **Esperado:** a tela não deixa registrar e diz que o pedido já está pago

### Esperado e fonte

Ação para pendente, recusado ou vencido e não cancelado — fonte: PRD CA-03.1.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| URL de pedido cancelado | colar `/admin/pedidos/<M12>/pagamento` | não deixa registrar e diz o porquê |
