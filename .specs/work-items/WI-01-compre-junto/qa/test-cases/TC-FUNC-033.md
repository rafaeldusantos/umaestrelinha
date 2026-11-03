## TC-FUNC-033: A peça da lista que saiu do ar aparece marcada no painel

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.5
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** n/a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** o lado da loja (a peça pulada) é TC-FUNC-021

### Objetivo

A dona percebe que uma peça da lista não está sendo oferecida e decide se a tira.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-02 com uma peça desativada no painel
- Estado de partida: índice do Compre Junto

### Condições reais

As da persona.

### Passos

1. Olhar a linha da lista no índice
   - **Esperado:** o aviso "1 peça saiu do ar"
2. Abrir o editor
   - **Esperado:** a linha da peça marcada: "Esta peça saiu do ar. A loja a pula em todas as joias até ela voltar; tire-a da lista se não for voltar."

### Esperado e fonte

Fonte: PRD CA-01.5; texto do protótipo do painel.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| busca de peça | busca a peça fora do ar para acrescentar a outra lista | resultado desabilitado com "Fora do ar" |
