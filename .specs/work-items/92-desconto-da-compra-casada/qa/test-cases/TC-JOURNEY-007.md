## TC-JOURNEY-007: A dona confere no painel e na Adesão quanto um pedido teve de desconto

**Tipo:** journey
**Prioridade:** P1
**Origem:** CA-05.3, CA-06.2
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-05, passos 1–3
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** depende de pedidos pagos gravados pela thread (M-07); a ordem das linhas do painel é a régua (decisão Q-01, 2026-11-04) e passa como está

### Objetivo

Provar que a dona, saindo do pedido e indo ao relatório, vê os mesmos números de desconto.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-07 (pedidos pagos com desconto casado), e o pedido de TC-JOURNEY-001
- Estado de partida: `/admin/pedidos`

### Condições reais

As da persona (1440).

### Entrada

`/admin/pedidos` → o pedido com desconto.

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | --- | --- | --- |
| 1 | abre o pedido | no cartão de valores, na ordem Subtotal · Desconto do Compre Junto − R$ X · Desconto PIX · Frete · Total, com o mesmo X da loja; a peça com "de/por" (no painel, o da unidade — D-36) | 10 s |
| 2 | abre `/admin/compre-junto/adesao` | a coluna "desconto concedido" e o valor pago líquido nas peças levadas junto | 15 s |
| 3 | compara | o concedido do período = soma de (cheio − pago) das peças levadas pelo bloco nos pedidos pagos | 60 s |

### Objetivo e efeitos

- Os números do pedido e do relatório fecham entre si.

### Caminho de abandono

Trocar o período para 7 dias sem pedidos: a Adesão no estado vazio de sempre.

### Esperado e fonte

Fonte: `prd.md` CA-05.3, CA-06.2; D-15 ("desconto concedido" = cheio − pago, linha sem preço cheio conta 0);
decisão Q-01 do Gate 1 (a ordem do painel vale).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| pedido com bump na corrente levada junto | ver na Adesão | o concedido conta o desconto que venceu na linha (o do bump) |
