## TC-FUNC-034: Uma lista em uso não pode ser apagada, e o painel diz em quais joias ela está

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.7
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-06, ramo J-06b
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** recusa escrita, sem confirmação de exclusão

### Objetivo

A dona não tira, sem querer, a corrente de dez pingentes de uma vez.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-02 em uso em M-01 e M-03
- Estado de partida: editor de M-02

### Condições reais

As da persona.

### Passos

1. Tocar "Excluir lista"
   - **Esperado:** a lista não é excluída; "Esta lista está em uso em 2 joias (<M-01> e <M-03>). Tire-a delas antes de excluir."
2. Tirar a lista dos adicionais de M-01 e M-03 e excluir de novo
   - **Esperado:** "Lista “Correntes” excluída."; ela some do índice

### Esperado e fonte

Fonte: PRD CA-01.7; texto do protótipo do painel.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| mais de 3 joias | lista em uso em 5 | até 3 nomes e " e outras" |
