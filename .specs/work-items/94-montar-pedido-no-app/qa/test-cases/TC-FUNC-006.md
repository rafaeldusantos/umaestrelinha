## TC-FUNC-006: A busca de cliente cadastrada acha por nome, e-mail ou telefone e põe a entrega no endereço padrão

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-03 (D-26)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-02, passos 1–2; ramo J-02c
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

A Adri acha a cliente com o que tem na conversa (nome, e-mail ou o número do WhatsApp).

### Pré-condições

- Conta: `admin-atelie`
- Massa: cliente com conta, telefone e endereço padrão; uma convidada (comprou sem conta)
- Estado de partida: `/pedidos/montar`, "Cliente cadastrada"

### Condições reais

As da persona.

### Passos

1. Com a busca vazia
   - **Esperado:** a lista das clientes (inicial, nome, "e-mail · N pedidos", seta)
2. Busca pelo nome, depois pelo e-mail, depois só pelos dígitos do telefone (`51999991234`)
   - **Esperado:** a mesma cliente nas três
3. Busca a convidada pelo e-mail
   - **Esperado:** ela aparece
4. Escolhe a cliente com endereço
   - **Esperado:** cartão "Cliente" com "Trocar" (nome, "N pedidos na loja", e-mail, telefone); "Entrega" em "Endereço padrão"
5. Busca um nome que não existe
   - **Esperado:** "Ninguém com “q”. Se for a primeira compra, use Cliente nova."

### Esperado e fonte

Fonte: PRD › Passo 1 ("busca por nome, e-mail ou telefone (inclui convidadas). Escolhida, a entrega vem no endereço padrão"); spec Design › Passo 1; D-26 (sem CPF).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| busca por CPF | digita um CPF | não acha pelo CPF (D-26) |
| telefone colado com máscara e espaços | cola "(51) 99999-1234 " | acha |
| "Trocar" | toca | volta à busca, a entrega se desfaz |
