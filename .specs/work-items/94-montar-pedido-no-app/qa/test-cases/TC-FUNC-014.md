## TC-FUNC-014: Texto sem dados deixa a folha aberta com a frase e o botão Preencher à mão

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-05
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, ramo J-01b
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** depende da leitura real pelo modelo

### Objetivo

Quando colou a mensagem errada, a Adri entende e tem saída.

### Pré-condições

- Conta: `admin-atelie`
- Massa: "obrigada pela atenção, depois eu vejo"
- Estado de partida: passo 1, "Cliente nova", com o e-mail já digitado

### Condições reais

As da persona.

### Passos

1. Cola o texto sem dados e lê
   - **Esperado:** a folha fica aberta com "Não encontrei nome, contato nem endereço neste texto. Confira se colou a mensagem certa, ou preencha à mão."; "Cancelar" virou "Preencher à mão"
2. Toca em "Preencher à mão"
   - **Esperado:** a folha fecha; o e-mail digitado continua; nenhuma marca

### Esperado e fonte

Fonte: PRD › Ler os dados de uma mensagem ("Texto sem dados: a folha fica aberta […] o botão secundário vira Preencher à mão").

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| colar a mensagem certa em seguida | substitui o texto e lê | preenche normalmente |
