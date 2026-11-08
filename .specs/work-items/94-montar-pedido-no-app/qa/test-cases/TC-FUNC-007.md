## TC-FUNC-007: A entrega da cliente cadastrada aceita outro endereço salvo, um endereço novo ou deixar a cliente preencher no link

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-03
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-02, passo 3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

O pedido vai para o endereço que a cliente pediu na conversa, sem mexer na ficha.

### Pré-condições

- Conta: `admin-atelie`
- Massa: cliente com dois endereços salvos; outra sem endereço
- Estado de partida: passo 1, cliente escolhida

### Condições reais

As da persona.

### Passos

1. Abre o cartão "Entrega"
   - **Esperado:** "Endereço padrão", o outro "Endereço salvo" (endereço · CEP), "Outro endereço" ("Digite ou cole de uma mensagem."), "A cliente preenche no link" ("Ela informa o endereço ao concluir.")
2. Escolhe o outro salvo e segue até a revisão
   - **Esperado:** a revisão mostra esse endereço
3. Escolhe "Outro endereço"
   - **Esperado:** o formulário com "Colar de uma mensagem", CEP, Rua, Número, Complemento ("Opcional"), Bairro, Cidade, UF e "Salvar no cadastro da cliente" ligado ("Só é gravado quando você criar o link.")
4. Escolhe "A cliente preenche no link"
   - **Esperado:** a revisão diz "A cliente preenche o endereço no link."
5. Escolhe a cliente sem endereço
   - **Esperado:** a entrega nasce em "A cliente preenche no link"

### Esperado e fonte

Fonte: PRD › Passo 1 (opções da cadastrada); spec Design › Passo 1.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| convidada | escolhe a convidada | sem endereço salvo; nasce em "preenche no link" |
| "Outro endereço" com "Salvar" desligado | cria o link | o endereço não entra na ficha (TC-INT-001) |
