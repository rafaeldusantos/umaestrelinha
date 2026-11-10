## TC-INT-002: Pedido registrado entra na venda do Dashboard e da Início pela data informada, e sai ao desfazer

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-03.7, CA-03.11, RNF-01
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-02, passo 5
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a venda se lê em duas telas (Dashboard do painel e Início do app); a data informada deve cair num dia diferente de hoje para separar "data do pagamento" de "data do registro"

### Objetivo

O número de vendas que a dona acompanha bate com o que entrou de verdade, no dia em que entrou.

### Pré-condições

- Conta: `admin`
- Massa: M6 com total conhecido; venda de ontem e de hoje anotadas no Dashboard e na Início do app
- Estado de partida: `/admin/pedidos/:id/pagamento`

### Condições reais

As da persona; o app em 390.

### Passos

1. Registra com a data de ontem (depois da criação do pedido)
   - **Esperado:** a venda de ontem cresce pelo total do pedido; a de hoje não
2. Confere a Início do app do ateliê
   - **Esperado:** o mesmo
3. Desfaz com motivo
   - **Esperado:** a venda de ontem volta ao número anotado, no Dashboard e na Início

### Esperado e fonte

Entra pela data do pagamento; sai ao desfazer — fonte: PRD CA-03.7, CA-03.11.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Registro às 23h30 de Brasília | data informada às 23h30 | conta no dia de Brasília, não no dia UTC seguinte |
