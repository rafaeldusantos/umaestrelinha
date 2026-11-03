## TC-INT-003: Uma marca "acompanha" ou um preço forjados no pedido não mudam o valor, e a marca sem joia no pedido é descartada

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-05.4
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** n/a
**Charter:** CH-02 (não executado na sessão: fica com o Dev)
**Situação:** ativo
**Automação:** target `integration` · status `missing`
**Spec:** —
**Nota:** forjar o corpo do `create-order` não é gesto de persona; provado por `createOrder.test.ts`, `marks.test.ts` e pelo probe `04-marca-no-pedido.sh` (cenário P0 de segurança do PRD)

### Objetivo

Ninguém consegue pagar menos ou forjar a relação de compra junto pelo navegador.

### Pré-condições

- Conta: anonima
- Massa: M-01 e uma peça P
- Estado de partida: checkout montado

### Condições reais

As da persona.

### Passos

1. Enviar o pedido com o preço de P reduzido no corpo
   - **Esperado:** o pedido grava o preço do banco
2. Enviar P com a marca de um principal que não está no pedido
   - **Esperado:** a marca é descartada; P grava como peça comum

### Esperado e fonte

Fonte: PRD CA-05.4; spec › Decisões, 13; cenário preliminar "Cliente forja no corpo do pedido a marca 'acompanha' ou um preço".

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| coluna desconhecida no item | envia uma chave extra no item | não chega a `order_items` |
