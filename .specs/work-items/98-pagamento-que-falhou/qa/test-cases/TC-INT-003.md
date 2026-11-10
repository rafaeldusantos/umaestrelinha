## TC-INT-003: Estoque e uso do cupom baixam uma vez ao registrar e voltam ao desfazer

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-03.4, CA-03.11
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-02, passo 5
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** estoque da variação em Produtos e usos do cupom em Cupons, no painel

### Objetivo

O estoque que a dona vê é o real: a peça vendida por fora sai uma vez, e volta se o registro foi engano.

### Pré-condições

- Conta: `admin`
- Massa: M6 com uma variação de estoque conhecido (ex.: 5) e um cupom com usos conhecidos
- Estado de partida: Produtos e Cupons anotados

### Condições reais

As da persona.

### Passos

1. Registra o pagamento do pedido
   - **Esperado:** estoque da variação 5 → 5 − quantidade; usos do cupom +1
2. Tenta registrar de novo (outra aba, voltar e confirmar)
   - **Esperado:** nada muda
3. Desfaz com motivo
   - **Esperado:** estoque e usos voltam ao anotado

### Esperado e fonte

Baixa como num pagamento pela loja; volta ao desfazer — fonte: PRD CA-03.4, CA-03.11; costura Decisão 6 (devolve o efetivamente baixado).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Estoque mudou entre registrar e desfazer | a thread ajusta o estoque depois do registro | o desfazer devolve só a quantidade baixada pelo registro |
| Peça sob encomenda | pedido de produto sem controle de estoque | nada baixa, nada volta |
