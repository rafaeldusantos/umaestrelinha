## TC-FUNC-023: Com a sacola montada, a dona muda o percentual e a sacola mostra o valor novo ao ser reaberta

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.12
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-04, ramos J-04a e J-04e
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a releitura se confere reabrindo a gaveta ou recarregando (D-30); não se espera mudança com a gaveta aberta

### Objetivo

A sacola nunca mostra um desconto que não vale mais.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-01 (corrente avulsa a 15 %)
- Estado de partida: P e a corrente na sacola; gaveta fechada

### Condições reais

As da persona.

### Passos

1. (A corrente passa de 15 % para 5 % no painel)
   - **Esperado:** —
2. Abrir a gaveta
   - **Esperado:** "5% a menos" e o valor com 5 %; o rodapé recalculado
3. (O percentual sobe para 25 %) e recarregar `/carrinho`
   - **Esperado:** 25 %

### Esperado e fonte

Fonte: `prd.md` CA-03.12 (Q-10; a sacola não guarda o percentual — Fora).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| percentual apagado | a dona apaga | a corrente a preço cheio, sem linha do desconto |
