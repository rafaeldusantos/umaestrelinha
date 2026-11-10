## TC-INT-006: Pagar de novo cobra o valor da primeira cobrança; pedido montado cobra o da proposta

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-01.5, CA-01.6, CA-05.3
**Autor:** dev
**Persona:** PER-04 Cliente que recebeu o link pelo WhatsApp
**Jornada:** J-04, passo 2
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** o valor exibido se confere no browser; o valor cobrado é da function (probe 07 da Validation) — no local a cobrança não se cria

### Objetivo

A cliente paga de novo o que combinou na compra, mesmo que a promoção tenha acabado ou o preço mudado.

### Pré-condições

- Conta: `anonima` (link) e `cliente` (PIX novo)
- Massa: M15 — pedido de catálogo cuja promoção acabou (e cujo cupom esgotou) depois da primeira cobrança, com link de cartão; pedido montado com pagamento vencido; um pedido gravado fora da loja (sem cobrança calculada)
- Estado de partida: o link e `/pedido/:id`

### Condições reais

As da persona.

### Passos

1. Abre o link do pedido de catálogo
   - **Esperado:** o valor é o da primeira cobrança, não o recalculado de hoje; nenhuma recusa de "o valor mudou"
2. A thread chama a cobrança desse pedido na function servida
   - **Esperado:** o valor cobrado é o da primeira cobrança
3. No pedido montado, gera o pagamento de novo
   - **Esperado:** cobra o valor da proposta
4. No pedido gravado fora da loja
   - **Esperado:** nunca cobra o total gravado no pedido; é calculado como hoje

### Esperado e fonte

Valor travado da primeira cobrança; montado pela proposta; gravado fora da loja nunca pelo valor gravado — fonte: PRD CA-01.5, CA-01.6, CA-05.3; costura Decisão 4.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Preço do produto subiu | a thread sobe o preço depois da primeira cobrança | o valor não muda |
