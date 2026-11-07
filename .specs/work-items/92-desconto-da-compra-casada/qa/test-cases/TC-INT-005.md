## TC-INT-005: O preço da corrente no feed do Google e no JSON-LD da página não muda

**Tipo:** integration
**Prioridade:** P2
**Origem:** RNF-04
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** n/a
**Charter:** — (fica com o Dev)
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** `shoppingParity.test.ts` intocado e verde (`qa-report.md`)

### Objetivo

O preço anunciado fora da loja continua o preço cheio da peça, sem o desconto que só vale com a joia.

### Pré-condições

- Conta: `anonima`
- Massa: M-01
- Estado de partida: feed e página servidos no local

### Condições reais

As da persona.

### Passos

1. Ler o preço da corrente no feed e no JSON-LD da página dela
   - **Esperado:** o preço de catálogo, igual ao de antes do WI

### Esperado e fonte

Fonte: `prd.md` RNF-04; Fora ("O desconto no feed do Google e no JSON-LD").

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| JSON-LD da página do pingente | ler | o preço só da joia |
