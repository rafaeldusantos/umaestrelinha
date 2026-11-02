## TC-FUNC-005: Quem preenche os dados de compra, num pedido montado ou no pagamento de um pedido, conta "No checkout"

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-20
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, ramo J-02b
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** precisa de um pedido montado com link e um pedido pendente de PIX no banco local

### Objetivo

A Adri monta pedidos pelo painel e manda o link; quer ver quando a cliente está fechando a compra, por qualquer
uma das portas.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01; um pedido montado com link `/pedido-montado#<token>`; um pedido pendente com `/pedido/<id>/pagamento`
- Estado de partida: `/ao-vivo`, ninguém na loja

### Condições reais

as da persona

### Passos

1. A cliente abre `/checkout` com joia na sacola
   - **Esperado:** "No checkout" 1
2. A cliente abre o link do pedido montado
   - **Esperado:** "No checkout" 1
3. A cliente abre `/pedido/<id>/pagamento`
   - **Esperado:** "No checkout" 1
4. A cliente abre `/pedido/<id>` (o detalhe do pedido)
   - **Esperado:** sai de "No checkout"; conta em outra linha (olhando, ou com sacola se tiver joia na sacola)

### Esperado e fonte

As três telas de compra contam "No checkout"; o detalhe do pedido não — fonte: PRD LAV-20 item 3; spec D-09

### Variações

| Variação             | Ação                                 | Esperado               |
| -------------------- | ------------------------------------ | ---------------------- |
| sacola + pedido montado | cliente com joia na sacola abre o pedido montado | "No checkout", não "Com joia na sacola" |
