## TC-SEC-003: CPF e endereço completo aparecem só na montagem e no pedido montado, nunca em Clientes nem no detalhe do pedido

**Tipo:** security
**Prioridade:** P1
**Origem:** UC-04, UC-09 (D-08, D-16)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-04, passo 2
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a exceção à regra de privacidade do app é estreita (D-08)

### Objetivo

O app só mostra o dado sensível onde a Adri precisa dele para montar e conferir.

### Pré-condições

- Conta: `admin-atelie`
- Massa: cliente com CPF e endereço salvos, com um pedido montado e um pedido comum
- Estado de partida: o pedido montado dela

### Condições reais

As da persona.

### Passos

1. Olha o pedido montado
   - **Esperado:** o CPF e o endereço da entrega, quando informados
2. Abre a aba Clientes e a ficha dela
   - **Esperado:** sem CPF nem endereço completo (como antes do WI)
3. Abre o detalhe de um pedido comum dela
   - **Esperado:** sem CPF nem endereço completo

### Esperado e fonte

"Fora delas (aba Clientes, detalhe do pedido), o app continua sem mostrar CPF nem endereço completo." — fonte: PRD › Passo 1; spec D-08, D-16.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
