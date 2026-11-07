## TC-INT-001: Gravação direta no banco de percentual fora de 1 a 50 é recusada

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-01.2
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-02, ramo J-02a
**Charter:** — (fica com o Dev; a sessão não grava no banco por fora da tela)
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** já provado pelo probe `probes/01-desconto-do-adicional.sh` (11 `ok`) e por `compreJuntoDescontoSchema.test.ts`; a QA só confere que a evidência existe

### Objetivo

Mesmo quem grava sem passar pela tela não deixa um desconto inválido para a loja aplicar.

### Pré-condições

- Conta: service role do banco local (Dev)
- Massa: um `product_buy_together` de M-01
- Estado de partida: Supabase local

### Condições reais

As da persona.

### Passos

1. Gravar `discount_percent` = 0, 51 e nulo por HTTP no banco local
   - **Esperado:** 0 e 51 recusados (`check`, 23514); nulo aceito

### Esperado e fonte

Fonte: `prd.md` CA-01.2 ("Gravação direta no banco também é recusada"); `qa-report.md` (probe `01`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| 1 e 50 | gravar | aceitos |
