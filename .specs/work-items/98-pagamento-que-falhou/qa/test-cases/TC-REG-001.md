## TC-REG-001: Pedido já pago avança de status como antes, sem pedir registro

**Tipo:** regression
**Prioridade:** P1
**Origem:** CA-03.9
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-03, passo 1
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o próximo passo e o lote passaram a ler a regra de `core` (`NEXT_STATUS` ← `PROXIMO`); é o canário do fluxo de todo dia

### Objetivo

O dia a dia da dona com pedidos pagos pela loja não ganha nenhum passo a mais.

### Pré-condições

- Conta: `admin`
- Massa: M9 (pago pela loja, em Pago) e outro pago em Separando
- Estado de partida: `/admin/pedidos/<M9>`

### Condições reais

As da persona.

### Passos

1. Usa o próximo passo em M9
   - **Esperado:** vai a Separando direto, sem a tela de registrar
2. Usa "Outro status" no pedido em Separando
   - **Esperado:** os destinos de sempre, sem a tela de registrar
3. Usa o lote "Avançar status" em dois pagos
   - **Esperado:** os dois avançam um passo; nenhum fica de fora

### O que mudou

O próximo passo, o "Outro status" e o lote passaram a desviar o não pago para "Registrar pagamento", e o lote lê a sequência de status de `core`.

### Pontos de contato com outras jornadas

J-03 (o mesmo lote com não pagos), fila de material e e-mails de status (portão da 88).

### Esperado e fonte

Só o pedido NÃO pago é desviado — fonte: PRD CA-03.9; costura Decisão 20.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Registrado à mão | avançar M7 para Separando | avança como um pago pela loja |
