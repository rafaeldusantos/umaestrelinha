## TC-FUNC-030: A conversão sai com uma casa decimal, e com zero visitas aparece "—"

**Tipo:** functional
**Prioridade:** P2
**Origem:** LAV-51
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, ramo J-03b
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** —

### Objetivo

A Adri lê a conversão sem divisão por zero nem casas demais.

### Pré-condições

- Conta: `admin-atelie`
- Massa: um período com 3 vendas e 70 visitas; um período com zero visitas
- Estado de partida: Acessos

### Condições reais

as da persona

### Passos

1. Lê a Conversão do período com 3 vendas e 70 visitas
   - **Esperado:** 4,3 % (vendas ÷ visitas, uma casa decimal)
2. Lê a Conversão do período com zero visitas
   - **Esperado:** "—"
3. Confere os quatro números a 390
   - **Esperado:** quatro cartões, nenhum espremido; com fonte grande, uma coluna

### Esperado e fonte

Vendas ÷ visitas com 1 casa; "—" com zero — fonte: PRD LAV-51 item 4, LAV-63

### Variações

| Variação          | Ação                 | Esperado    |
| ----------------- | -------------------- | ----------- |
| conversão redonda  | 1 venda em 10 visitas | 10,0 %      |
