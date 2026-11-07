## TC-FUNC-027: Pedido com oferta do checkout e promoção: as linhas somam o subtotal e cada desconto tem a sua linha

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-05.1, CA-05.2
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-03, passos 5–6
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** cenário preliminar P0 do PRD; corrige o defeito anterior (C-01) que também alcança bump e promoção

### Objetivo

Mesmo sem desconto casado, o resumo do pedido novo mostra cada desconto e fecha.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-04 (promoção progressiva e oferta do checkout)
- Estado de partida: sacola com uma peça em promoção; a oferta do checkout marcada

### Condições reais

As da persona.

### Passos

1. Fechar o pedido com PIX
   - **Esperado:** o pedido gravado
2. Abrir `/pedido/:id` e Minha conta
   - **Esperado:** Subtotal = soma dos preços cheios das linhas; uma linha "Desconto progressivo", uma "Desconto da oferta", "Desconto PIX"; Subtotal − descontos + Frete = Total
3. Somar as linhas dos itens
   - **Esperado:** a soma dos cheios bate o Subtotal

### Esperado e fonte

Fonte: `prd.md` CA-05.1, CA-05.2; o rótulo "Desconto da oferta" do order bump é D-35.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| bump + casado + promoção + cupom | tudo junto | uma linha por desconto; a conta fecha |
