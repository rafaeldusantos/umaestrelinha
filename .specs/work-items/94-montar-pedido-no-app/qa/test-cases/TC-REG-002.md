## TC-REG-002: A montagem do painel segue criando o pedido montado que a cliente conclui no link

**Tipo:** regression
**Prioridade:** P1
**Origem:** UC-10 (D-04, D-20)
**Autor:** dev
**Persona:** PER-04 Adri no computador
**Jornada:** J-05, passo 5
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a gravação do painel mudou (endereço pela function, `save_order_proposal` recriada)

### Objetivo

A montagem que a Adri já usava no computador continua chegando ao link.

### Pré-condições

- Conta: `admin-atelie`; `anonima` (loja)
- Massa: cliente cadastrada; duas peças; cupom
- Estado de partida: painel › montar pedido

### Condições reais

As da persona.

### O que mudou

A RPC de gravação recriada (endereço na mesma transação), o cartão do link vindo do servidor, a origem "Pedido montado".

### Pontos de contato com outras jornadas

J-04 (o link na loja), o checkout da loja (feature 89).

### Passos

1. Monta no painel com cupom e cria
   - **Esperado:** o pedido montado com o link
2. Abre o link na loja
   - **Esperado:** as peças e o total da montagem
3. Abre no app, em Montados
   - **Esperado:** o mesmo pedido montado, com o mesmo total e o mesmo link

### Esperado e fonte

Fonte: spec UC-10, D-04; spec da 89 (a montagem do painel).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
