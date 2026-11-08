## TC-FUNC-002: A barra da montagem diz por que não dá para seguir e libera o botão quando o motivo some

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-02 (D-21)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passos 1–4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** regra determinística por passo

### Objetivo

A Adri nunca fica parada diante de um botão desligado sem saber o que falta.

### Pré-condições

- Conta: `admin-atelie`
- Massa: uma cliente cadastrada; uma peça
- Estado de partida: `/pedidos/montar`, passo 1 vazio

### Condições reais

As da persona.

### Passos

1. Olha a barra sem nada escolhido
   - **Esperado:** "Escolha a cliente para continuar.", "Nenhuma peça ainda", total "—", "Continuar" desligado
2. Em "Cliente nova", deixa o nome vazio; depois o e-mail vazio; depois um e-mail inválido
   - **Esperado:** "Falta o nome da cliente." · "Falta o e-mail da cliente — é por ele que o pedido chega a ela." · "Confira o e-mail da cliente."
3. Com "Informar o endereço agora", deixa o número vazio
   - **Esperado:** "Complete o endereço, ou escolha 'A cliente preenche no link'."
4. Completa tudo
   - **Esperado:** o motivo some e "Continuar" liga
5. No passo 2, segue sem peça
   - **Esperado:** "Acrescente ao menos uma peça."
6. No passo 3, liga o combinado sem motivo e toca em "Continuar"
   - **Esperado:** só então "Escreva o motivo do desconto combinado." aparece
7. Com uma peça, olha a barra
   - **Esperado:** "Itens · 1 peça · frete à parte" e o total

### Esperado e fonte

Fonte: PRD › O que é novo 1 ("motivo escrito quando ele está bloqueado"); spec Design › casca (os motivos literais, o passo 3 que marca a tentativa); D-21.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| CEP novo incompleto | digita 7 dígitos | "Confira o CEP do endereço novo." |
| e-mail com ficha | digita um e-mail cadastrado | "Este e-mail já tem ficha. Use a ficha dela ou corrija o e-mail." |
| combinado que zera | 100 % no passo 3 | "O desconto não pode zerar o pedido." aparece logo |
| passo 4 | chega com dois bloqueios de passos anteriores | a soma dos motivos |
