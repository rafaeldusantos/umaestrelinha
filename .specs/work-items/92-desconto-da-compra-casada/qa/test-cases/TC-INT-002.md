## TC-INT-002: O pagamento ignora preço e marca forjados no pedido e recalcula pelo banco

**Tipo:** integration
**Prioridade:** P0
**Origem:** CA-04.1
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 6
**Charter:** — (fica com o Dev; forjar requisição é fora do QA real-user)
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** coberto por `mercado-pago/__tests__/buyTogetherCharge.test.ts`; cenário preliminar "corpo forjado" (segurança, P0)

### Objetivo

Ninguém paga menos que a regra mexendo no que o navegador manda.

### Pré-condições

- Conta: `anonima`
- Massa: M-01
- Estado de partida: um pedido criado com `unit_price` menor e com a marca "acompanha" forjada no corpo

### Condições reais

As da persona.

### Passos

1. Chamar o `create-payment` desse pedido
   - **Esperado:** o pedido recalculado pela configuração do banco e pelo preço de catálogo; o `unit_price` e a marca do corpo ignorados; o pedido gravado com os valores certos (ou recusado pelo teto quando mais caro)

### Esperado e fonte

Fonte: `prd.md` CA-04.1.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| desconto forjado no total | `buy_together_discount` maior no corpo | ignorado como teto inválido; recalculado |
