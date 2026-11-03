## TC-INT-001: O pedido do conjunto com uma peça que exige material entra na fila de material do painel

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-04.5
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-02, efeitos colaterais
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** o efeito aparece em outro app (painel), no mesmo banco local

### Objetivo

O ateliê fica sabendo que precisa esperar o material da cliente, mesmo quando só o adicional exige.

### Pré-condições

- Conta: anonima (compra); `admin-painel` (conferência)
- Massa: M-01 sem material e A3 com material
- Estado de partida: pedido criado em TC-JOURNEY-002 com A3

### Condições reais

As da persona; o painel em 1440.

### Passos

1. No painel, abrir Pedidos e a visão da fila de material
   - **Esperado:** o pedido do conjunto aparece na fila

### Esperado e fonte

"O pedido feito com o conjunto entra na fila de material se qualquer peça exige material" — fonte: PRD CA-04.5.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| nenhuma peça com material | pedido só com peças sem material | fora da fila |
