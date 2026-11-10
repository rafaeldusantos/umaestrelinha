## TC-FUNC-015: Adri gera o link de cartão e o copia para mandar pelo WhatsApp

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05.4
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-03, passo 5 (J-04 começa aqui)
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a cópia se confere pela área de transferência do contexto do browser

### Objetivo

A dona manda à cliente um link que funciona, sem montar endereço à mão.

### Pré-condições

- Conta: `admin`
- Massa: M3 (cartão recusado, sem link vivo)
- Estado de partida: `/admin/pedidos/<M3>`

### Condições reais

As da persona.

### Passos

1. Toca em "Gerar link de cartão"
   - **Esperado:** o link aparece, no formato `…/pagar-com-cartao#<código>`, com "copiar"
2. Toca em copiar
   - **Esperado:** confirmação de copiado; a área de transferência tem o link inteiro
3. Abre o link copiado numa janela anônima
   - **Esperado:** a tela do TC-JOURNEY-002 para o pedido M3

### Esperado e fonte

A Adri copia o link — fonte: PRD CA-05.4; formato de `core/checkout/cardLink.ts` (`CARD_LINK_PATH`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Duplo clique em gerar | dois cliques seguidos | um link só vale (o último mostrado) |
| Reabrir o pedido | sair e voltar ao pedido | o painel não mostra o código antigo de novo, ou mostra o mesmo que vale — nunca um que não vale |
