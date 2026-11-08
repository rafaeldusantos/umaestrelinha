## TC-INT-002: O link copiado de um pedido montado reaberto abre na loja com os preços travados, e o renovado ou cancelado deixa de abrir

**Tipo:** integration
**Prioridade:** P0
**Origem:** UC-09 (D-14, D-28)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-04, passo 4; ramos J-04a, J-04b
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** cruza app → loja (`/pedido-montado`, o token conferido pelo hash); exige `PROPOSAL_TOKEN_KEY`

### Objetivo

O link que a Adri reenvia é o que funciona para a cliente.

### Pré-condições

- Conta: `admin-atelie` (app); `anonima` (loja, aba anônima)
- Massa: um pedido montado aberto; um expirado; um aberto para cancelar
- Estado de partida: Montados

### Condições reais

As da persona; a loja em 390.

### Passos

1. Copia o link do aberto reaberto e abre na loja
   - **Esperado:** a página do pedido montado com as peças (a mesma foto da sacola) e o total da revisão
2. Renova o expirado; abre o link antigo e o novo
   - **Esperado:** o antigo não abre o pedido; o novo abre
3. Cancela um aberto e abre o link dele
   - **Esperado:** a loja diz que o pedido não está mais disponível

### Esperado e fonte

Fonte: PRD › Pedido montado (link sempre; "o link antigo morre" ao renovar; cancelado); spec D-14, D-28, Design › Pedido montado ("Quem abrir o link lê que este pedido não está mais disponível.").

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| painel | copia o mesmo pedido no painel | o mesmo link |
