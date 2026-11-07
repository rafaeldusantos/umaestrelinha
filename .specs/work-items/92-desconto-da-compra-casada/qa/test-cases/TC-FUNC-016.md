## TC-FUNC-016: Peça em promoção ou marcada como oferta do checkout sai pelo menor preço da linha, sem somar descontos

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03.5
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-03, ramo J-03a
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** cenários preliminares do PRD: promoção (P0) e order bump (P1)

### Objetivo

Os descontos da mesma peça nunca se somam: vale o que der o menor preço.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-01; M-04 (promoção progressiva numa corrente; a oferta do checkout com uma corrente)
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Levar P com a corrente que tem promoção maior que o casado
   - **Esperado:** a linha pelo preço da promoção; o rodapé com o desconto da promoção (ex.: "Desconto progressivo") e sem o do Compre Junto dessa peça
2. Levar P com a corrente que tem promoção menor que o casado
   - **Esperado:** a linha pelo desconto casado; sem desconto da promoção nessa peça
3. No checkout, marcar a oferta do checkout com a corrente que já tem desconto casado
   - **Esperado:** vale o menor preço da linha entre a oferta e o casado; o resumo não soma os dois

### Esperado e fonte

Fonte: `prd.md` CA-03.5; `AD-015` emendado pelo `AD-073` (D-06).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| a oferta é a própria corrente com quantidade 2 | — | a oferta vale para a linha da sacola (D-18); nenhuma unidade com dois descontos |
