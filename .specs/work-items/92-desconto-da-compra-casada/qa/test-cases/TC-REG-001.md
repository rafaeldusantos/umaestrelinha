## TC-REG-001: Sem nenhum percentual configurado, a sacola, o checkout e o pedido ficam como antes

**Tipo:** regression
**Prioridade:** P0
**Origem:** RNF-02
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01 (com M-10)
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** canário: a compra comum, que não usa o desconto, não pode mudar

### Objetivo

Quem compra sem Compre Junto com desconto não vê nada diferente nem paga diferente.

### Pré-condições

- Conta: `anonima`
- Massa: M-10 (joia e peça sem percentual); com e sem cupom
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### O que mudou

O ponto único do total (`resolveOrderPricing`) ganhou a entrada opcional do desconto casado; a linha do pedido passou a guardar o cobrado e o cheio.

### Pontos de contato com outras jornadas

Toda compra da loja passa por este cálculo; o order bump, as promoções e o cupom também.

### Passos

1. Levar a joia e a peça sem percentual, aplicar o cupom e ir ao checkout com PIX
   - **Esperado:** nenhuma linha "Desconto do Compre Junto", nenhum "de/por" que não existia; os totais como antes
2. Fechar o pedido
   - **Esperado:** `/pedido/:id` com o resumo fechando e o Total do checkout

### Esperado e fonte

Fonte: `prd.md` RNF-02 ("Sem a configuração nova, o cálculo de qualquer pedido fica idêntico ao de hoje").

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| só a oferta do checkout | marcar o bump | como antes; o resumo do pedido novo ganha "Desconto da oferta" (C-01, declarado) |
