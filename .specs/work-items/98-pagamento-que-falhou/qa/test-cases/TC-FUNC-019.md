## TC-FUNC-019: Cartão recusado ou sem resposta mostra o convite para falar pelo WhatsApp, sem oferecer outro pagamento

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.1, CA-02.2, CA-02.3
**Autor:** dev
**Persona:** PER-03 Cliente que voltou ao pedido
**Jornada:** J-05, passos 1 e 3
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** os dois estados de cartão com tentativa de cobrança

### Objetivo

A cliente cujo cartão não passou sabe que pode resolver com a Adri, sem a loja oferecer um caminho que ela não decidiu oferecer.

### Pré-condições

- Conta: `cliente`
- Massa: M3 (cartão recusado), M4 (cartão pendente com tentativa sem resposta); WhatsApp da loja configurado
- Estado de partida: `/conta`

### Condições reais

As da persona.

### Passos

1. Abre `/pedido/<M3>`
   - **Esperado:** "O pagamento com cartão não foi concluído", "Fale comigo pelo WhatsApp que eu te ajudo a resolver o pagamento deste pedido." e "Conversar no WhatsApp"
2. Abre `/pedido/<M4>`
   - **Esperado:** "O pagamento com cartão ainda não foi confirmado", a mesma frase e o mesmo botão
3. Procura, nos dois, pagar de novo por cartão ou trocar para PIX
   - **Esperado:** não há
4. Lê `/conta`
   - **Esperado:** os dois aparecem nas pendências com o mesmo convite
5. Toca em "Conversar no WhatsApp"
   - **Esperado:** abre o WhatsApp da loja com a mensagem sobre o pedido

### Esperado e fonte

Informativo do WhatsApp, sem pagar de novo por cartão nem trocar para PIX — fonte: PRD CA-02.1, CA-02.2, CA-02.3; textos de `apps/store/src/widgets/order-action/ui/OrderActionPanel.tsx`.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Sem WhatsApp configurado | massa com o número da loja vazio | o informativo fica só com o texto, sem botão quebrado |
| Cartão vencido | pedido de cartão com pagamento vencido | o selo não diz "PIX expirou" (costura, Não resolvido) — registrar o que aparece |
