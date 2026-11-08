## TC-FUNC-013: Colar o endereço de uma cliente cadastrada preenche só o endereço e nunca muda a ficha dela

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-05
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-02, ramo J-02a
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** depende da leitura real pelo modelo

### Objetivo

Um texto colado nunca reescreve a ficha de quem já é cliente.

### Pré-condições

- Conta: `admin-atelie`
- Massa: cliente cadastrada; um texto com OUTRO nome, outro e-mail, outro telefone e um endereço
- Estado de partida: passo 1, cliente escolhida, "Outro endereço"

### Condições reais

As da persona.

### Passos

1. Toca em "Colar de uma mensagem"
   - **Esperado:** "Colar o endereço" / "Eu leio só o endereço. Os dados da ficha dela não mudam."
2. Cola o texto e lê
   - **Esperado:** só os campos do endereço preenchidos e marcados
3. Olha o cartão "Cliente"
   - **Esperado:** nome, e-mail e telefone da ficha, inalterados
4. Cria o link e abre a ficha no painel
   - **Esperado:** nome, e-mail e telefone como antes

### Esperado e fonte

"em 'Outro endereço' de cliente cadastrada, lê só o endereço — nunca troca dados de uma ficha que existe" — fonte: PRD › Ler os dados de uma mensagem.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| texto sem endereço | cola só nome e e-mail | a frase de "sem dados"; nada muda |
