## TC-FUNC-012: Pedido avançado à mão sem pagamento mostra "Pagamento não registrado" com a ação de registrar

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.16
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-03, passo 4
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** depende da massa M10 (pedido antigo levado adiante antes da mudança)

### Objetivo

Os pedidos que a dona já levou adiante sem pagamento antes desta mudança ficam visíveis e registráveis.

### Pré-condições

- Conta: `admin`
- Massa: M10 (Separando, pagamento pendente, sem registro)
- Estado de partida: `/admin/pedidos/<M10>`

### Condições reais

As da persona.

### Passos

1. Lê o bloco Pagamento
   - **Esperado:** "Pagamento não registrado", com a ação de registrar
2. Usa a ação e registra
   - **Esperado:** o aviso some; o bloco mostra o registro; o status continua Separando (o pedido não volta nem pula)

### Esperado e fonte

"Pagamento não registrado" com a ação de registrar — fonte: PRD CA-03.16; texto de `core/orders/paymentAlerts.ts` (`PAYMENT_NOT_RECORDED_LABEL`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Enviado e Entregue | mesmo cenário em Enviado e Entregue | o mesmo aviso e ação |
