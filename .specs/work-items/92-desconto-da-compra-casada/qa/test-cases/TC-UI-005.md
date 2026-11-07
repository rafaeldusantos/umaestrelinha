## TC-UI-005: Checkout, "o valor mudou", confirmação e e-mail conferem com o protótipo "Pedido - Desconto do Compre Junto"

**Tipo:** ui
**Prioridade:** P2
**Origem:** exploratório — conferência contra o protótipo desenhado no handoff (H-01; CA-03.8, CA-04.3, CA-05.2)
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** n/a
**Charter:** CH-09
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** sem o MCP do Claude Design, `not-run`; a ordem das linhas do resumo não se compara com o protótipo — a régua é o painel (decisão Q-01, 2026-11-04)

### Objetivo

As telas do dinheiro são as que a dona aprovou.

### Pré-condições

- Conta: `anonima` e `cliente-loja`
- Massa: os pedidos de TC-FUNC-013 e TC-JOURNEY-004; o aviso de TC-JOURNEY-005 e TC-JOURNEY-006
- Estado de partida: as telas provocadas nos charters anteriores

### Condições reais

Os viewports dos frames.

### Protótipo e tela

Claude Design, projeto `69224d8a-17ae-4b1f-a251-a8105b41edc2`, `Pedido - Desconto do Compre Junto.html`, as cinco
telas: Checkout · resumo; Checkout · o valor mudou; Link / Minha conta · o valor mudou; Confirmação · Minha conta;
E-mail do pedido · `/checkout`, `/pedido/:id`, `/conta`, o e-mail no Mailpit.

### Propriedades a comparar

Os rótulos literais, a faixa do cupom ("{CÓDIGO} aplicado − R$ X"), o `role="alert"` e os cartões "Antes"/"Agora",
os botões e o contato, a linha partida da confirmação com o "de/por" da linha, a tabela e os totais do e-mail. A
**ordem** das linhas do resumo não é comparada com o protótipo: ela segue o painel (Q-01) e se confere em
TC-FUNC-026 e TC-INT-004.

### Passos

1. Ler cada uma das cinco telas e comparar com a tela da loja
   - **Esperado:** igual, ou diferenças registradas; diferença de ordem do resumo frente ao protótipo não é achado

### Esperado e fonte

Fonte: o protótipo; o PRD e as decisões do Gate 1 prevalecem.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| "Desconto da oferta" | o rótulo do bump no resumo | registrar se o frame não o desenha (sem régua) |
