## TC-FUNC-022: O desconto combinado exige motivo e o que zeraria o pedido fica fora da conta

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-07 (D-39)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-02, passo 5; ramo J-02b
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

O desconto acertado na conversa entra com o porquê registrado, e o total nunca fica zero ou negativo.

### Pré-condições

- Conta: `admin-atelie`
- Massa: sacola com itens de R$ 200,00
- Estado de partida: passo 3

### Condições reais

As da persona.

### Passos

1. Liga "Desconto combinado"
   - **Esperado:** "O valor que você acertou com ela na conversa."; "Em reais | Em %"; valor; "Motivo" (n/120); "Só para você. A cliente não vê o motivo."
2. Digita R$ 30 sem motivo e toca em "Continuar"
   - **Esperado:** "Escreva o motivo — ele fica no histórico." e o motivo na barra
3. Escreve o motivo
   - **Esperado:** o combinado (−) no resumo; "Continuar" liga
4. Troca para % e digita 100
   - **Esperado:** "O desconto não pode zerar o pedido." aparece logo; o desconto sai da conta
5. Em R$, digita 199,50 (itens abaixo de R$ 1,00)
   - **Esperado:** a mesma recusa; o total nunca negativo

### Esperado e fonte

"Desconto combinado (R$ ou %) com motivo obrigatório (120, interno). Itens abaixo de R$ 1,00 → 'O desconto não pode zerar o pedido.' e o desconto não entra na conta" — fonte: PRD › Passo 3; spec D-39.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| motivo com 121 caracteres | cola | para em 120 |
| 99,99 % | digita | recusa se os itens ficarem abaixo de R$ 1,00 |
| o motivo no link | cria o link e abre na loja | o motivo não aparece |
