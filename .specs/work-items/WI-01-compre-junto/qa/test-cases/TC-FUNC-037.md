## TC-FUNC-037: O adicional que aponta para um produto inativo aparece marcado "saiu do ar" na aba do produto

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.7
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** n/a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** o selo não está no desenho (spec › Design); a régua é o PRD

### Objetivo

A dona vê, na própria joia, que um adicional deixou de ser oferecido.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01 com A2 = peça P; P desativada
- Estado de partida: aba "Compre junto" de M-01

### Condições reais

As da persona.

### Passos

1. Abrir a aba "Compre junto" de M-01
   - **Esperado:** o adicional A2 marcado como "saiu do ar"; os outros sem marca
2. Na loja, abrir M-01
   - **Esperado:** A2 não aparece no bloco

### Esperado e fonte

Fonte: PRD CA-02.7.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| reativar P | reativa e reabre a aba | sem marca; A2 volta à loja |
