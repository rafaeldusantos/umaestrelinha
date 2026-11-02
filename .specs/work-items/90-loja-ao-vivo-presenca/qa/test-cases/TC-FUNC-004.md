## TC-FUNC-004: Olhando, com sacola e no checkout somam o total e ninguém conta duas vezes

**Tipo:** functional
**Prioridade:** P0
**Origem:** LAV-20, LAV-21, §10.2
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, passos 2, 4, 5
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** critério de aceite §10.2; três contextos de cliente em estados conhecidos

### Objetivo

A Adri lê o funil como "quem está fazendo o quê agora"; se a mesma pessoa aparece em duas linhas, a soma passa
do total e ela não sabe em que acreditar.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01; 3 contextos de cliente
- Estado de partida: `/ao-vivo`, ninguém na loja

### Condições reais

as da persona

### Passos

1. Cliente A olha uma joia, sem sacola
   - **Esperado:** "Olhando joias" 1; "Com joia na sacola" 0; "No checkout" 0; total 1
2. Cliente B põe uma joia na sacola e fica na página da joia
   - **Esperado:** "Olhando joias" 1; "Com joia na sacola" 1; total 2
3. Cliente C, com joia na sacola, abre o checkout
   - **Esperado:** "No checkout" 1; "Com joia na sacola" continua 1 (C não conta ali); total 3; 1 + 1 + 1 = 3
4. Lê as barras de proporção
   - **Esperado:** cada uma das três linhas com largura de um terço do trilho
5. Todas saem (espera até 5 min)
   - **Esperado:** as três barras vazias

### Esperado e fonte

As três primeiras linhas são exclusivas, somam o total e têm barra proporcional — fonte: PRD LAV-20, LAV-21, §10.2

### Variações

| Variação                                  | Ação                                            | Esperado                                  |
| ----------------------------------------- | ----------------------------------------------- | ----------------------------------------- |
| cliente com sacola volta do checkout       | C volta à sacola                                | sai de "No checkout", entra em "Com joia na sacola" |
| sacola sem joia na categoria               | B vai a uma categoria com a sacola cheia         | continua em "Com joia na sacola"          |
