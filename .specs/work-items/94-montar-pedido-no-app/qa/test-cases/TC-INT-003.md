## TC-INT-003: Quando a cliente conclui no link, o pedido montado vira Concluída com o número do pedido nos dois apps

**Tipo:** integration
**Prioridade:** P1
**Origem:** UC-01, UC-09 (D-25)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-04, passos 5–6
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** a conclusão passa pelo checkout da loja (PIX local, feature 89); pode depender do `mercado-pago` local — se não subir, `blocked` (ambiente)

### Objetivo

A Adri vê no app que a cliente concluiu e chega ao pedido de verdade.

### Pré-condições

- Conta: `admin-atelie` (app); `anonima` (loja)
- Massa: pedido montado aberto montado pelo app
- Estado de partida: o link aberto na loja

### Condições reais

As da persona.

### Passos

1. (loja) Conclui com PIX
   - **Esperado:** o pedido criado
2. (app) Abre Montados
   - **Esperado:** o cartão "Concluída" com "Virou o pedido #NNNN"; o contador do chip caiu um
3. Abre o pedido montado e toca em "Ver o pedido #NNNN"
   - **Esperado:** o detalhe do pedido no app; o histórico do montado com "Concluído pela cliente · pedido #NNNN"
4. Abre o pedido no painel
   - **Esperado:** a origem "Pedido montado"

### Esperado e fonte

Fonte: PRD › Pedidos · Montados ("Virou o pedido #0262"), › Pedido montado (Concluída: "Ver o pedido #0262"); spec D-25.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| cliente só abre o link | abre sem concluir | "Aberta — vista pela cliente" e "Aberto pela cliente" no histórico |
