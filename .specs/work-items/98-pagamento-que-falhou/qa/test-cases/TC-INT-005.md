## TC-INT-005: Pagamento aprovado pelo link de cartão tem o mesmo efeito de um pagamento no checkout

**Tipo:** integration
**Prioridade:** P0
**Origem:** CA-05.5
**Autor:** dev
**Persona:** PER-04 Cliente que recebeu o link pelo WhatsApp
**Jornada:** J-04, passos 3–4
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** depende do Brick e da cobrança real do Mercado Pago, indisponíveis no local (chaves inválidas) — na execução fica `blocked`, não bug; o efeito da aprovação (o mesmo corpo de "pago") é provado pelo probe 09 da Validation

### Objetivo

A cliente que pagou pelo link tem o pedido seguindo como qualquer outro pago.

### Pré-condições

- Conta: `anonima`
- Massa: M14 (link vivo); chave pública de teste do Mercado Pago (ausente no local)
- Estado de partida: `/pagar-com-cartao#<código>`

### Condições reais

As da persona.

### Passos

1. Paga com um cartão de teste aprovado
   - **Esperado:** espera e aprovado na tela
2. Confere o pedido (cliente e painel)
   - **Esperado:** pago, com a data; selo e jornada de pago para a cliente; e-mail de pagamento confirmado; estoque e cupom baixados uma vez; venda no Dashboard; o link deixa de valer

### Esperado e fonte

Mesmo efeito do checkout — fonte: PRD CA-05.5.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Cartão recusado no link | pagar com cartão de teste recusado | aviso de recusa; o link continua valendo para outra tentativa |
