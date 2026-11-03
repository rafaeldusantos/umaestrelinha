## TC-FUNC-027: Sem forma gravada, o painel mostra "Na linha" marcada e a loja abre as escolhas na linha

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-09.2
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-04, passo 1
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** estado de partida do banco local (sem a chave `buy_together`)

### Objetivo

A loja tem um comportamento definido antes de a dona escolher qualquer coisa.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01; nenhuma forma gravada
- Estado de partida: logada; loja em outra aba

### Condições reais

As da persona.

### Passos

1. Abrir o menu Compre Junto
   - **Esperado:** "Na linha" marcada
2. Na loja, marcar um adicional de M-01
   - **Esperado:** as escolhas abrem ali mesmo, na linha

### Esperado e fonte

Fonte: PRD CA-09.2.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
