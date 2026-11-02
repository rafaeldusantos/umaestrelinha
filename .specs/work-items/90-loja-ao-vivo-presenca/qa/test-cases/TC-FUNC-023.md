## TC-FUNC-023: O relógio errado do celular não muda os números, as barras nem o frescor

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-61
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-06, ramo J-06c
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** relógio do contexto do app emulado 2 h adiantado e 2 h atrasado

### Objetivo

Celular com hora errada não pode dizer à Adri que tem gente quando não tem, nem que a leitura é de agora quando é
velha.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01; 1 cliente presente
- Estado de partida: `/ao-vivo` com relógio normal; anota os números

### Condições reais

relógio do app 2 h adiantado

### Passos

1. Abre a Loja ao vivo com o relógio adiantado
   - **Esperado:** os mesmos números, as mesmas 30 barras e o mesmo funil do relógio normal
2. Lê o frescor logo depois de uma leitura
   - **Esperado:** "Atualizado agora", não "há 7200 s"
3. Repete com o relógio 2 h atrasado
   - **Esperado:** o mesmo

### Esperado e fonte

Janelas, faixas e "agora" vêm do servidor — fonte: PRD LAV-61; spec D-14

### Variações

| Variação                  | Ação                           | Esperado            |
| ------------------------- | ------------------------------ | ------------------- |
| Acessos com relógio errado | abre Hoje com o relógio adiantado | os mesmos números e a mesma faixa em andamento |
