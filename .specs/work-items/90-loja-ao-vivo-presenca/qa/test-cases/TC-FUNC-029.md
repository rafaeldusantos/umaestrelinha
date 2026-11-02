## TC-FUNC-029: Sem o período anterior medido inteiro, nenhuma variação aparece

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-51
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, ramo J-03a
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** o estado normal do local logo depois da publicação; o marco de início da medição na semana atual

### Objetivo

Comparar com uma semana que a loja não mediu inteira inventaria uma queda; a Adri prefere não ver número.

### Pré-condições

- Conta: `admin-atelie`
- Massa: o marco de início da medição depois do início da semana anterior (ou nesta semana)
- Estado de partida: Acessos

### Condições reais

as da persona

### Passos

1. Lê a Semana
   - **Esperado:** os quatro números sem "vs semana anterior"
2. Lê Hoje com o marco de início em hoje
   - **Esperado:** "Com sacola" sem variação (ontem não foi medido inteiro)

### Esperado e fonte

A variação não aparece sem o período anterior contado até o ponto, nem antes de ele ter sido medido inteiro desde a publicação — fonte: PRD LAV-51

### Variações

| Variação                | Ação                           | Esperado                     |
| ----------------------- | ------------------------------ | ---------------------------- |
| "Contando desde {data}"  | lê a nota de início da contagem | aparece como antes (Fase 1)  |
