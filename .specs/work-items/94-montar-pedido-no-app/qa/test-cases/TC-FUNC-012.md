## TC-FUNC-012: Editar um campo lido tira a marca, e Desfazer devolve exatamente o que havia antes da leitura

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-05
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passo 3
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** depende da leitura real pelo modelo

### Objetivo

A Adri confia no que conferiu e consegue voltar atrás de uma leitura ruim sem perder o que já tinha digitado.

### Pré-condições

- Conta: `admin-atelie`
- Massa: a conversa sintética do CH-02
- Estado de partida: passo 1, "Cliente nova", com o nome já digitado à mão ("Ju") antes da leitura

### Condições reais

As da persona.

### Passos

1. Lê o texto
   - **Esperado:** os campos lidos com a marca; o nome trocado pelo lido
2. Edita o telefone lido
   - **Esperado:** a marca do telefone some; as outras ficam
3. Toca em "Desfazer"
   - **Esperado:** o toast "Leitura desfeita." / "Os campos voltaram ao que estava antes."; o nome volta a "Ju", os outros campos vazios, sem marcas, e o cartão "Tem os dados numa mensagem?" de volta
4. Toca em "Ler outro texto" e lê de novo
   - **Esperado:** a folha abre vazia e a leitura nova preenche

### Esperado e fonte

"editar o campo tira a marca […] Desfazer (volta exatamente ao estado anterior)" — fonte: PRD › Ler os dados de uma mensagem; spec Design › Folha · Colar texto.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| o serviço de CEP completa depois | lê e espera | completar pelo CEP não tira a marca |
| Desfazer depois de editar | edita e desfaz | tudo volta ao antes da leitura |
