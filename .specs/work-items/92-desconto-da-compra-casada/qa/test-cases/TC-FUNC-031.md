## TC-FUNC-031: No app do ateliê, o detalhe do pedido mostra o desconto do Compre Junto na ordem do painel, com descontos e PIX antes do Frete

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05.3
**Autor:** dev
**Persona:** PER-03 Adri (ateliê)
**Jornada:** J-06, passos 2–3
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** decisão Q-01 (2026-11-04): o app segue a ordem das linhas do painel; hoje o app põe o Frete antes (`qa-report.md`), e essa diferença é bug. As linhas dos itens seguem o padrão de `BlocoItens` (D-38)

### Objetivo

No celular, a Adri reconhece cada peça e o desconto do pedido, na mesma ordem em que os vê no painel.

### Pré-condições

- Conta: `admin-painel`
- Massa: o pedido de TC-FUNC-013 (linha mista)
- Estado de partida: app do ateliê, aba Pedidos

### Condições reais

As da persona.

### Passos

1. Abrir o pedido
   - **Esperado:** nos itens, a corrente em duas linhas, a com desconto com o preço cheio riscado ("de/por", no padrão de `BlocoItens`)
2. Ler o bloco de valores
   - **Esperado:** na ordem Subtotal · Desconto do Compre Junto · Desconto PIX · Frete · Total, os mesmos valores e a mesma ordem do painel do pedido

### Esperado e fonte

Fonte: `prd.md` CA-05.3; `spec.md` › Design › App do ateliê (D-38); decisão Q-01 do Gate 1 (a régua da ordem é o
painel). O app mostrar o total da linha não é bug.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| com cupom | o pedido de TC-JOURNEY-004 | a linha do cupom entre o Compre Junto e o PIX, antes do Frete |
