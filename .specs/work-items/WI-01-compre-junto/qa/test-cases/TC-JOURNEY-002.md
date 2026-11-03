## TC-JOURNEY-002: Do conjunto ao pedido como convidada, pelo valor visto, com "acompanha" na confirmação

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-04.6, CA-05.2, CA-04.5, RNF-04
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-02, passos 1–6
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** fluxo de dinheiro P0. Por decisão do humano (D-02 do plano), o "cobrado" é o valor do pedido gravado, mostrado em `/pedido/:id/pagamento` e no painel; o QR do PIX não é exigido

### Objetivo

A cliente fecha o pedido do conjunto pelo total que viu e o pedido registra o que foi comprado junto.

### Pré-condições

- Conta: anonima (checkout sem conta); `admin-painel` para a conferência no painel
- Massa: M-01 com A1 (lista com peça de gravação) e A3 (exige material)
- Estado de partida: sacola vazia

### Condições reais

As da persona (390 × 844).

### Entrada

Navegação interna para `/produtos/<slug de M-01>`.

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | preenche a gravação do pingente e da corrente | campo de gravação dentro do bloco, com contador | 15 s |
| 2 | marca A3 | entra normalmente, sem dizer qual material | 5 s |
| 3 | leva o conjunto | três linhas na gaveta, gravações nas linhas certas | 5 s |
| 4 | finaliza a compra como convidada, PIX, e anota o total | total do checkout = subtotal da sacola (+ frete, − descontos do pedido) | 90 s |
| 5 | conclui | `/pedido/:id/pagamento` com o valor do pedido = total do checkout; o QR pode faltar no local sem reprovar | 10 s |
| 6 | abre a confirmação `/pedido/:id` | cada adicional "acompanha o <pingente>" | 5 s |

### Objetivo e efeitos

Pedido criado com as três peças, e o valor gravado (tela de pagamento e painel) é o total do checkout. No painel (conta `admin-painel`), o total do pedido é o mesmo valor, os itens adicionais dizem que acompanham o pingente e o pedido está na fila de material.

### Caminho de abandono

Fechar a aba na tela do pagamento e reabrir o link do pedido: o mesmo pedido, sem duplicar.

### Esperado e fonte

Exibido = cobrado (valor do pedido gravado); marca no pedido — fonte: PRD CA-04.6, CA-05.2, RNF-04; decisão D-02 do plano.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| recarregar no envio | recarrega ao concluir | um pedido só |
| cupom válido | aplica cupom no checkout | o desconto aparece no checkout; o valor do pedido é o total mostrado ali |
