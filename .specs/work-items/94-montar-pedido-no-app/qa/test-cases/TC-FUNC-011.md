## TC-FUNC-011: Ler o texto da conversa preenche contato e endereço, marca cada campo lido e diz o que faltou

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-05 (D-10)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passos 2–3
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** depende da leitura real pelo modelo; a regra de normalização tem teste de unidade (`core/customers/parse`)

### Objetivo

A Adri cola a conversa e confere, campo a campo, o que foi lido — nunca um campo preenchido sem aviso.

### Pré-condições

- Conta: `admin-atelie`
- Massa: a conversa sintética do CH-02 (sem complemento)
- Estado de partida: passo 1, "Cliente nova"; `ANTHROPIC_API_KEY` local

### Condições reais

As da persona.

### Passos

1. Toca em "Colar texto da conversa"
   - **Esperado:** "Colar o texto da conversa" / "Eu leio e preencho os campos da cliente e da entrega. Você confere tudo antes de seguir."; "O texto não fica guardado."; contador n/2000; "Ler o texto" desligado
2. Cola e toca em "Ler o texto"
   - **Esperado:** "Lendo o texto…" desligado; depois a folha fecha
3. Olha os campos
   - **Esperado:** nome, e-mail, WhatsApp, CPF e endereço preenchidos, cada um com "Lido do texto — confira."; o CEP com "Lido do texto — conferido no serviço de CEP."
4. Lê o aviso no topo
   - **Esperado:** "Preenchi N de M campos. Confira antes de seguir." e "Não achei: complemento." com o que o CEP conferiu; "Ler outro texto" e "Desfazer"; o cartão "Tem os dados numa mensagem?" sumiu
5. Abre o painel na ficha (busca pelo e-mail lido)
   - **Esperado:** nenhuma ficha nem endereço gravados pela leitura

### Esperado e fonte

Fonte: PRD › Ler os dados de uma mensagem; spec Design › Folha · Colar texto.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| o CEP manda | texto com CEP real e rua errada | rua, bairro, cidade e UF do serviço de CEP, não do texto |
| texto de 2.100 caracteres | cola | corta em 2.000; contador 2000/2000 |
| colar com emoji, aspas curvas, quebras | cola | nenhum caractere estranho nos campos |
| telefone com +55 e CPF com pontos | cola | máscaras do app: `(51) 99999-1234`, `123.456.789-09` |
| CPF com dígito errado | cola | o CPF fica vazio e entra em "Não achei" |
