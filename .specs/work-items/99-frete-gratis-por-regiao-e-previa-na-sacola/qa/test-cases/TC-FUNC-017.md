## TC-FUNC-017: Pagar um pedido montado não lê nem apaga o CEP da sacola

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-12 (PRD 97 RN-06)
**Autor:** dev
**Persona:** PER-02 Cida
**Jornada:** J-04, passos 1 e 4 (ramo J-04b)
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** depende do link de pedido montado da massa

### Objetivo

O pedido que a Adri montou é outro carrinho: abri-lo não pode puxar nem apagar o CEP e a escolha da sacola de Cida.

### Pré-condições

- Conta: cliente-salvador
- Massa: o link de pedido montado; uma peça; fixture A
- Estado de partida: sacola com uma peça e 40020-000 calculado na gaveta, com o PAC escolhido

### Condições reais

As da persona.

### Passos

1. Abre o link do pedido montado
   - **Esperado:** o formulário de entrega do pedido montado vazio — sem o 40020-000 da sacola, sem "Trazido da sua
     sacola"
2. Preenche outro CEP (01310-100) no pedido montado e segue ao pagamento
   - **Esperado:** o pedido montado segue com o CEP dele
3. Volta à loja e abre a gaveta
   - **Esperado:** a mesma peça, o CEP 40020-000 e o PAC escolhido, como antes

### Esperado e fonte

Pagar um pedido montado não lê nem apaga o CEP da sacola, e a gaveta não escreve no rascunho dele — fonte: PRD 97
CA-12, RN-06.

### Variações

| Variação                  | Ação                                                   | Esperado                                  |
| ------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| Calcula na gaveta depois  | com o pedido montado aberto noutra aba, calcula outro CEP na gaveta e recarrega o pedido montado | o pedido montado não recebe o CEP da gaveta |
