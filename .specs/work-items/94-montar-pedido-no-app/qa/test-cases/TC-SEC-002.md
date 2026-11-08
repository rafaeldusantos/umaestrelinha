## TC-SEC-002: Nada da cliente fica guardado no celular nem no endereço das telas da montagem

**Tipo:** security
**Prioridade:** P0
**Origem:** UC-02, UC-04 (D-15, D-16, D-42)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-03, passos 1–3
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** conferência do armazenamento do browser, do `history.state` e da URL (sinal de confiança do CFR)

### Objetivo

Um celular perdido ou emprestado não carrega CPF, endereço nem contato de cliente.

### Pré-condições

- Conta: `admin-atelie`
- Massa: cliente nova com nome, e-mail, telefone, CPF e endereço; uma peça; cupom; combinado com motivo; observação
- Estado de partida: `/pedidos/montar`

### Condições reais

As da persona.

### Passos

1. Preenche tudo, passo a passo; em cada passo, lê a URL e o `history.state`
   - **Esperado:** a URL é sempre `/pedidos/montar`; o `state` só com `doApp` e o número do passo
2. Lê `localStorage` e `sessionStorage`
   - **Esperado:** só a chave `estrelinha-montagem-rascunho` da montagem, com peças (peça, variação, quantidade, gravação), cupom e o valor do combinado, o id da conta — nenhum nome, e-mail, telefone, CPF, endereço, observação ou motivo
3. Lê o console
   - **Esperado:** nenhum dado da cliente nem o texto colado
4. Fecha a montagem com "Descartar"
   - **Esperado:** a chave apagada

### Esperado e fonte

"Nada disso fica guardado no celular: some ao fechar a montagem." — fonte: PRD › Passo 1; spec D-15, D-16, D-42.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| texto colado | lê com a folha "Colar texto" | o texto não aparece em storage nem no console |
| o link do pedido montado | abre o pedido montado | o token não vai a storage |
