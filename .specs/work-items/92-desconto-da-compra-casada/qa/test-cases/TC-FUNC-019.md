## TC-FUNC-019: A gaveta e o checkout mostram "de/por" na peça e a mesma linha "Desconto do Compre Junto" com o mesmo valor

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03.8
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passos 4–5
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

Marina reconhece, na sacola e no checkout, o mesmo desconto que viu no bloco.

### Pré-condições

- Conta: `anonima`
- Massa: M-01
- Estado de partida: P e a corrente avulsa na sacola, pelo bloco

### Condições reais

As da persona.

### Passos

1. Abrir a gaveta
   - **Esperado:** a corrente com o cheio riscado em cima e o cobrado embaixo, à direita; "Acompanha o … · 15% a menos"; rodapé "Subtotal" (cheios) · "Desconto do Compre Junto − R$ 11,98" · "Total" · "ou R$ Z no PIX · frete calculado no checkout"
2. Abrir `/carrinho`
   - **Esperado:** o mesmo
3. Abrir o checkout
   - **Esperado:** o item com "Acompanha o … · 15% a menos" e "de/por"; "Desconto do Compre Junto − R$ 11,98" no resumo; a nota "O desconto do Compre Junto vale enquanto a joia estiver no mesmo pedido."

### Esperado e fonte

Fonte: `prd.md` CA-03.8; `spec.md` › Design › Loja — Sacola e Checkout · resumo. Sem a frase da sacola sobre
promoção e cupom (H-03).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| duas peças com desconto | marcar a lista também | uma linha só "Desconto do Compre Junto", com a soma |
