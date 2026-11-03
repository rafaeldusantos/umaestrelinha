## TC-FUNC-023: O valor do pedido é o total mostrado na sacola e no checkout, sem efeito da marca "acompanha"

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-04.6, RNF-04, CA-05.4
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-02, passos 4–5
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** exibido = cobrado. Por decisão do humano (D-02 do plano), o "cobrado" é o valor do pedido gravado, mostrado em `/pedido/:id/pagamento` e no painel; o QR do PIX não é exigido (a `mercado-pago` local pode não subir)

### Objetivo

A cliente paga exatamente o que viu.

### Pré-condições

- Conta: anonima; `admin-painel` para a conferência no painel
- Massa: sacola com o conjunto de M-01 (três peças)
- Estado de partida: gaveta aberta

### Condições reais

As da persona.

### Passos

1. Anotar o subtotal da sacola e abrir o checkout
   - **Esperado:** o subtotal do checkout = subtotal da sacola; nenhum desconto de "compra junto"
2. Concluir como convidada com PIX e anotar o total do checkout
   - **Esperado:** o pedido é criado e a cliente chega a `/pedido/:id/pagamento`
3. Ler o valor na tela de pagamento
   - **Esperado:** o valor do pedido mostrado = total do checkout (frete e descontos do pedido incluídos ali). O QR do PIX pode não aparecer no ambiente local: a ausência dele não reprova o caso
4. No painel, abrir o pedido
   - **Esperado:** o total do pedido = o mesmo valor; o preço unitário de cada item = o da sacola

### Esperado e fonte

O valor do pedido gravado (tela de pagamento e painel) = total da sacola e do checkout — fonte: PRD CA-04.6, RNF-04, CA-05.4 ("A marca 'acompanha' é informativa: ela não muda preço nem desconto"); decisão D-02 do plano.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| cupom válido | aplica cupom | o desconto aparece no checkout e o valor do pedido = total do checkout |
| QR gerado | a `mercado-pago` local sobe | registrar se o valor do PIX = valor do pedido (não é condição do caso) |
