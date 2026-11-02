## TC-FUNC-025: Visitas e Vendas da Loja ao vivo são os mesmos da faixa do Início em Hoje, Ontem e Semana

**Tipo:** functional
**Prioridade:** P0
**Origem:** §10.1, LAV-51
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, passos 1–3
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** critério de aceite §10.1; comparação direta de texto entre as duas telas

### Objetivo

Dois números diferentes para a mesma coisa fazem a Adri desconfiar dos dois.

### Pré-condições

- Conta: `admin-atelie`
- Massa: visitas e vendas em hoje, ontem e nesta semana (CH-05 › Ambiente)
- Estado de partida: Início

### Condições reais

as da persona

### Passos

1. Anota Visitas e Vendas da faixa do Início em Hoje, Ontem e Semana
   - **Esperado:** os seis números
2. Abre a Loja ao vivo › Acessos e lê Hoje, Ontem e Semana
   - **Esperado:** Visitas e Vendas idênticos aos anotados, período a período
3. Troca de período várias vezes
   - **Esperado:** os números mudam na hora, sem nova leitura e sem traços
4. Lê os quatro rótulos
   - **Esperado:** "Visitas", "Com sacola", "Vendas", "Conversão" — sem "Visitantes únicos" à parte

### Esperado e fonte

Números idênticos para o mesmo período — fonte: PRD §10.1, LAV-51 (item 1 e ⚠️ de unificar)

### Variações

| Variação                         | Ação                                     | Esperado                   |
| -------------------------------- | ---------------------------------------- | -------------------------- |
| uma visita nova entre as leituras | uma cliente nova pousa e as duas telas releem | os dois números sobem juntos |
