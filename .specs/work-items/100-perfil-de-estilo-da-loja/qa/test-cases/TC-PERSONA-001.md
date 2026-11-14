## TC-PERSONA-001: Bia lê todas as telas da cliente no Black Friday, no celular e no computador, sem texto sumindo no fundo

**Tipo:** persona
**Prioridade:** P0
**Origem:** RN-08, RN-03, RN-01
**Autor:** dev
**Persona:** PER-02 Bia
**Jornada:** J-03, passos 1 a 8
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** julgamento visual sobre sete telas em dois viewports, com medida de contraste por amostra

### Objetivo

A prova de RN-08: nas sete telas da cliente, nos dois tamanhos, o perfil novo não esconde nada.

### Pré-condições

- Conta: `cliente-qa` (o código chega no Mailpit local)
- Massa: perfil salvo = Black Friday; para a confirmação, o pedido PIX pendente da `cliente-qa` que a thread criou
  antes do L1 (a URL `/pedido/:id` está no manifesto da massa)
- Estado de partida: Home em 390 × 844

### Condições reais

As da persona; depois 1440 × 900.

### Hipóteses de fricção

1. Parcelas, subtítulos ou rodapé em `ink-soft` `#57524B` ficam fracos sobre `ground-deep` `#F0EADF`
2. O selo "-X%" e o "Novo" se confundem
3. Botão ouro com texto que não é o escuro sólido

### Passos

1. Em 390, percorre Home, categoria, produto, sacola, checkout
   - **Esperado:** em cada tela, as cores do perfil Black Friday e 3 a 5 textos pequenos medidos ≥ 4,5:1 (≥ 3:1 em
     texto grande); sem rolagem horizontal do body
2. Entra em `/conta` com o código do e-mail
   - **Esperado:** a conta legível no perfil
3. Abre a confirmação do pedido dela pela URL `/pedido/:id` do manifesto, sem tocar em nenhuma ação de pagamento
   - **Esperado:** legível no perfil (selo de situação, passos, valores)
4. Repete 1 a 3 em 1440
   - **Esperado:** o mesmo

**Aprovação:** Bia cumpre cada tela dentro de 30 s sem um texto que ela não consiga ler.

### Esperado e fonte

Prova em navegador nos dois viewports, nas telas da cliente, com os pisos de legibilidade — fonte: PRD RN-08, RN-03.

### Variações

| Variação           | Ação                              | Esperado                                   |
| ------------------ | --------------------------------- | ------------------------------------------ |
| fonte a 130 %      | no produto                        | sem sobreposição nem corte                 |
| campo com erro     | envia o contato vazio no checkout | borda `#857A6C` (field) e o erro legível   |
| gaveta de material | abre "Como enviar seu material" num produto que pede | legível no perfil       |
