## TC-FUNC-005: Sem CEP e abaixo da faixa, a faixa diz quanto falta e o ⓘ explica para onde o frete grátis vale

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-14 (PRD 99; UC-07, M-01, M-03)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passos 1 e 2
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** texto lido da configuração; determinístico com a massa Sul + Sudeste

### Objetivo

Luana precisa saber quanto falta para o frete grátis e, antes de se animar, que ele só vale para Sul e Sudeste — sem
a loja dizer "liberado" antes de saber para onde vai.

### Pré-condições

- Conta: anonima
- Massa: configuração ligada, R$ 450, Sul + Sudeste; uma peça abaixo de R$ 450
- Estado de partida: gaveta aberta, sem CEP

### Condições reais

As da persona.

### Passos

1. Olha o topo da gaveta
   - **Esperado:** uma linha "Faltam R$ X para o frete grátis" com o ⓘ ao lado, à direita "R$ subtotal / R$ 450,00", e
     a barra embaixo; X = 450 − subtotal das peças; nenhum "liberado"; nenhuma exclamação
2. Toca no ⓘ
   - **Esperado:** o balão: "Compras a partir de R$ 450,00 têm frete grátis para entregas no Sul (PR, SC, RS) e no
     Sudeste (SP, RJ, MG, ES). A região é conferida pelo CEP."
3. Toca fora do balão
   - **Esperado:** o balão fecha

### Esperado e fonte

"Faltam R$ X", barra, ⓘ com a regra e as regiões lidas da configuração, nenhum "liberado" — fonte: PRD 99 CA-14,
UC-07, M-01, M-03.

### Variações

| Variação                     | Ação                                        | Esperado                                                  |
| ---------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| CEP incompleto no campo      | digita 5 dígitos sem calcular                | a faixa continua igual (CEP incompleto vale como sem CEP) |
| Com a peça em preço de campanha | se houver peça "de/por" no banco local    | o X é calculado sobre o valor já com o preço da campanha (RN-19) |
