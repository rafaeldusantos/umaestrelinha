## TC-INT-006: O preço anunciado ao Google da joia não muda por causa do Compre Junto

**Tipo:** integration
**Prioridade:** P1
**Origem:** RNF-03
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** n/a
**Charter:** CH-01 (não executado na sessão: fica com o Dev)
**Situação:** ativo
**Automação:** target `integration` · status `missing`
**Spec:** —
**Nota:** o JSON-LD servido e o feed não são vistos pela persona; coberto por `shoppingParity.test.ts` intocado e `payment/**` sem diff (qa-report)

### Objetivo

O Google continua anunciando o preço da joia, não o do conjunto.

### Pré-condições

- Conta: anonima
- Massa: M-01 com Compre Junto
- Estado de partida: loja local servida

### Condições reais

As da persona.

### Passos

1. Ler o JSON-LD da página de M-01 e o item de M-01 no feed local
   - **Esperado:** o preço e a disponibilidade da joia, iguais aos de antes do Compre Junto

### Esperado e fonte

Fonte: PRD RNF-03.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
