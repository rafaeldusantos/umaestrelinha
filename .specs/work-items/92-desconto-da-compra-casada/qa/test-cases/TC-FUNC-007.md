## TC-FUNC-007: Com peças marcadas, o bloco mostra "Desconto do Compre Junto" acima do total já descontado e o PIX sobre esse total

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-02.2
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 2
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

Marina sabe quanto o conjunto vai custar, já com o desconto, e quanto no PIX.

### Pré-condições

- Conta: `anonima`
- Massa: M-01; desconto PIX da loja configurado
- Estado de partida: página de P, nada marcado

### Condições reais

As da persona.

### Passos

1. Marcar a corrente avulsa (15 %)
   - **Esperado:** "Desconto do Compre Junto" e "− R$ 11,98" acima de "Total do conjunto"; o total = preço de P + R$ 67,92; "R$ Y no PIX" com Y = total descontado com o desconto PIX
2. Marcar também a corrente da lista (10 %)
   - **Esperado:** o desconto passa a somar as duas peças; o total e o PIX recalculam
3. Desmarcar as duas e marcar só o adicional sem percentual
   - **Esperado:** o total sem a linha do desconto

### Esperado e fonte

Um rótulo só, "Desconto do Compre Junto", e o PIX sobre o total descontado — fonte: `prd.md` CA-02.2 (H-03);
`spec.md` › Design › Loja — Bloco.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| quantidade da joia no computador | 1440, quantidade 2 de P | o total soma 2 × P; a linha do desconto segue a das peças marcadas |
