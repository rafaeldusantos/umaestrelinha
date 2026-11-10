## TC-INT-009: O e-mail "cancelado por falta de pagamento" sai só no cancelamento automático, quando ligado

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-06.6
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-06, passo 1
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** Mailpit (:54444); o job é executado pela thread

### Objetivo

A cliente cujo pedido saiu do caminho sozinho fica sabendo, com o texto que a Adri revisou — e só depois de ela ligar.

### Pré-condições

- Conta: `admin`
- Massa: dois pedidos pendentes não pagos de 8 dias (depois do corte), de clientes diferentes
- Estado de partida: o evento desligado em Notificações

### Condições reais

As da persona.

### Passos

1. Com o evento desligado, a thread executa o job sobre o primeiro
   - **Esperado:** pedido cancelado; Mailpit sem e-mail para a cliente
2. Liga o evento em Notificações; a thread executa o job sobre o segundo
   - **Esperado:** Mailpit: "Pedido <número> cancelado por falta de pagamento" para a cliente, no tom da loja
3. Desliga o evento de novo ao fim
   - **Esperado:** volta ao estado semeado

### Esperado e fonte

E-mail próprio só no automático, nascendo desligado — fonte: PRD CA-06.6; costura Decisões 23 e 24.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Cancelamento pela admin | ver TC-INT-004 | nunca este e-mail |
