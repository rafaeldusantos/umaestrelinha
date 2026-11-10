## TC-FUNC-007: Bloco Pagamento mostra meio pelo nome, data, quem registrou, observação e comprovantes, e o histórico registra o gesto

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04.1, CA-03.6, RNF-08
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-02, passo 1
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** leitura determinística sobre M7

### Objetivo

Meses depois, a dona sabe como aquele pedido foi pago, quem registrou e com qual prova — sem abrir o WhatsApp.

### Pré-condições

- Conta: `admin`
- Massa: M7 (registrado à mão com "Transferência", data e hora conhecidas, observação, três comprovantes)
- Estado de partida: `/admin/pedidos/<M7>`

### Condições reais

As da persona.

### Passos

1. Lê o bloco Pagamento
   - **Esperado:** "Transferência" (nunca o valor técnico `transferencia`), a data e a hora do pagamento em Brasília, o nome de quem registrou, a observação, os três comprovantes por nome
2. Lê o histórico
   - **Esperado:** "Pagamento registrado manualmente", com quem e quando
3. Repete com um pedido registrado com "Cartão de crédito" e um com "Outro"
   - **Esperado:** "Cartão de crédito (link de outro gateway ou maquininha)" e "Outro"

### Esperado e fonte

Meio pelo nome, data, quem, observação, comprovantes; linha de histórico — fonte: PRD CA-04.1, CA-03.6, RNF-08; rótulos de `core/orders/labels.ts` (voz `admin`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Observação longa | registro com observação de 500 caracteres e quebras de linha | lida inteira, sem estourar o bloco |
| Pago pela loja | abrir M9 | bloco de sempre, com o meio pelo nome e a data em Brasília, sem campos do registro manual |
