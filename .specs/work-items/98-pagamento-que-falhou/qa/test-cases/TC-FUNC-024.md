## TC-FUNC-024: Pedido cancelado por falta de pagamento diz a razão e oferece o WhatsApp no pedido e na conta

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-06.5, CA-01.3
**Autor:** dev
**Persona:** PER-03 Cliente que voltou ao pedido
**Jornada:** J-06, passos 2–4
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a massa M13 é produzida pelo job (a thread o executa); a tela é determinística

### Objetivo

A cliente que volta depois dos 7 dias entende por que o pedido não existe mais e sabe com quem falar para retomar.

### Pré-condições

- Conta: `cliente`
- Massa: M13 (cancelado pelo job por falta de pagamento) e M12 (cancelado pela admin), nesta conta; WhatsApp da loja configurado
- Estado de partida: `/conta`

### Condições reais

As da persona.

### Passos

1. Abre `/pedido/<M13>`
   - **Esperado:** "Pedido cancelado por falta de pagamento", a frase de retomar a peça falando com a Adri pelo WhatsApp, e "Conversar no WhatsApp"; nenhuma oferta de pagar
2. Lê `/conta`
   - **Esperado:** o mesmo estado para M13
3. Abre `/pedido/<M12>`
   - **Esperado:** cancelado, sem dizer "por falta de pagamento"
4. Toca em "Conversar no WhatsApp" em M13
   - **Esperado:** o WhatsApp da loja

### Esperado e fonte

Diz que foi por falta de pagamento e mostra o WhatsApp, em `/pedido/:id` e `/conta` — fonte: PRD CA-06.5, CA-01.3; texto de `OrderActionPanel.tsx`.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| PIX vencido além dos 7 dias | M2b (anterior ao corte, ainda pendente) | sem "Gerar novo PIX" (a janela passou) e sem "cancelado por falta de pagamento" |
