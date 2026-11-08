## TC-FUNC-018: A gravação aparece só na peça que aceita, com o teto, e a peça que pede material avisa

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-06
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-02, passo 3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

O nome que a cliente pediu para gravar vai no pedido, e a Adri sabe que a peça vai pedir material.

### Pré-condições

- Conta: `admin-atelie`
- Massa: peça que aceita gravação (com teto); peça sem gravação; peça que pede material
- Estado de partida: passo 2

### Condições reais

As da persona.

### Passos

1. Abre a peça com gravação
   - **Esperado:** "O que gravar", dica "Nome, data ou uma palavra", contador n/teto, "Opcional. Deixe em branco se ela preferir a peça sem gravação."
2. Digita além do teto
   - **Esperado:** para no teto
3. Abre a peça sem gravação
   - **Esperado:** sem campo de gravação
4. Abre a peça que pede material
   - **Esperado:** "Pede material da cliente. Depois de pago, o pedido entra na fila de material como os da loja."; na sacola, a etiqueta "Pede material da cliente"

### Esperado e fonte

Fonte: PRD › Passo 2 ("gravação só se a peça aceita (mesmo teto), aviso de material"); spec Design › folha da variação.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| gravação com acento e emoji | digita "Vó Lúcia 💛" | aparece igual na sacola e na revisão |
