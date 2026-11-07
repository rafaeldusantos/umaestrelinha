## TC-FUNC-018: O desconto PIX incide sobre o valor já com o desconto do Compre Junto

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03.7
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 5
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a ordem das linhas do resumo é a do painel (decisão Q-01, 2026-11-04)

### Objetivo

Quem paga no PIX recebe o desconto do PIX em cima do preço que já tem o Compre Junto.

### Pré-condições

- Conta: `anonima`
- Massa: M-01; desconto PIX da loja (N %)
- Estado de partida: P e a corrente avulsa na sacola; checkout aberto

### Condições reais

As da persona.

### Passos

1. Escolher PIX
   - **Esperado:** "Desconto PIX (N%)" = N % × (subtotal − desconto do Compre Junto [− cupom]), a centavo; o resumo na ordem Subtotal · Desconto do Compre Junto · (Cupom) · Desconto PIX · Frete · Total, e o Total fecha
2. Trocar para cartão
   - **Esperado:** some a linha do PIX; o desconto do Compre Junto continua

### Esperado e fonte

Fonte: `prd.md` CA-03.7; a ordem do resumo pela decisão Q-01 do Gate 1 (a do painel do pedido).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| no bloco | ler "R$ Y no PIX" | Y sobre o total já descontado (TC-FUNC-007) |
