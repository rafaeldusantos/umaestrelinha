## TC-INT-004: Cancelar pelo painel fecha a cobrança aberta, mantém a escolha do aviso e não manda o e-mail de falta de pagamento

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-06.3, CA-06.6
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-03, passo 6
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** o fechamento no Mercado Pago responde "não fechada" no local (chaves inválidas) — conferir que foi tentado; a cobrança realmente fechada fica `blocked`

### Objetivo

O pedido que a dona cancela não pode mais ser pago pelo QR antigo, e a cliente recebe só o que a dona escolheu.

### Pré-condições

- Conta: `admin`
- Massa: dois M1 (PIX pendente com cobrança em aberto); "Pedido cancelado por falta de pagamento" ligado só nesta rodada
- Estado de partida: `/admin/pedidos/<M1>`

### Condições reais

As da persona.

### Passos

1. Cancela o primeiro com a caixa de aviso desmarcada
   - **Esperado:** pedido cancelado; a cobrança aberta foi fechada (no local, a tentativa registrada); Mailpit sem e-mail
2. Cancela o segundo com a caixa marcada
   - **Esperado:** Mailpit: o e-mail de cancelamento de sempre; nunca o "cancelado por falta de pagamento"
3. Abre `/pedido/<M1>` como cliente (outra janela)
   - **Esperado:** sem oferta de pagar; sem dizer "por falta de pagamento"

### Esperado e fonte

Cancelar fecha a cobrança; o e-mail novo só sai no automático; a caixa continua como hoje — fonte: PRD CA-06.3, CA-06.6; costura Decisões 2 e 23 (H-01).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Pedido de cartão com link | cancelar um M3 com link de cartão vivo | o link passa a mostrar "cancelado" (TC-FUNC-017) |
