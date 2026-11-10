## TC-SEC-002: Link de cartão adulterado ou incompleto não mostra o pedido, e o código some da barra de endereço

**Tipo:** security
**Prioridade:** P1
**Origem:** CA-05.2, CA-05.6
**Autor:** dev
**Persona:** PER-04 Cliente que recebeu o link pelo WhatsApp
**Jornada:** J-04, passo 1, ramo J-04c
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o código fora da barra é decisão da costura (token no fragmento, `replaceState`)

### Objetivo

Só quem recebeu o link certo vê o pedido; um print da tela ou o histórico do navegador não entrega o código.

### Pré-condições

- Conta: `anonima`
- Massa: M14 (link vivo)
- Estado de partida: sem sessão

### Condições reais

As da persona.

### Passos

1. Abre o link vivo e, depois de carregar, lê a barra de endereço
   - **Esperado:** `/pagar-com-cartao` sem o `#<código>`
2. Abre o link com um caractere do código trocado
   - **Esperado:** nenhum dado de pedido; frase sem jargão, com a saída de falar com a loja
3. Abre `/pagar-com-cartao` sem fragmento
   - **Esperado:** o mesmo
4. Abre o link vivo e confere a página
   - **Esperado:** nenhum e-mail, telefone, CPF ou endereço da cliente na tela

### Esperado e fonte

Abre sem login só pelo código certo; o código não fica exposto — fonte: PRD CA-05.2, CA-05.6; costura Decisão 5; tarefa 06 (token no fragmento, `replaceState`, `page_view` sem fragmento).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Muitas tentativas | abrir 30 códigos inventados seguidos | a página continua respondendo sem dado; se recusar por excesso, diz para tentar depois |
