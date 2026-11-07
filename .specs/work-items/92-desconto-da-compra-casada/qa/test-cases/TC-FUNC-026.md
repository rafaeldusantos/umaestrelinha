## TC-FUNC-026: Na confirmação e em Minha conta, a linha mista vira duas, a peça com desconto mostra "de/por" e o resumo fecha

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-05.1, CA-05.2
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 7 (e J-03, passo 6, com PER-04)
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** Minha conta se confere com PER-04 no CH-03 (conta `cliente-loja`); a ordem das linhas do resumo segue o painel (decisão Q-01, 2026-11-04); as linhas dos itens seguem a Design da confirmação (D-38)

### Objetivo

Depois de pagar, a cliente vê o que comprou, quanto cada peça custou e uma conta que fecha, na mesma ordem que a
dona vê no painel.

### Pré-condições

- Conta: `anonima` (confirmação); `cliente-loja` (Minha conta)
- Massa: o pedido de TC-FUNC-013 (linha mista, PIX)
- Estado de partida: pedido gravado

### Condições reais

As da persona.

### Passos

1. Abrir `/pedido/:id`
   - **Esperado:** em "Itens do pedido", a corrente em duas linhas — uma com "Acompanha o … · 15% a menos" e o "de/por" da linha (R$ 79,90 riscado, R$ 67,92), outra a preço cheio — cada uma com "{variação} · 1 unidade"
2. Ler o resumo
   - **Esperado:** na ordem Subtotal (soma dos preços cheios) · Desconto do Compre Junto · Desconto PIX · Frete · Total; Subtotal − descontos + Frete = Total, a centavo
3. Entrar em Minha conta (PER-04) e abrir o pedido
   - **Esperado:** o mesmo resumo, na mesma ordem

### Esperado e fonte

Fonte: `prd.md` CA-05.1, CA-05.2; `spec.md` › Design › Confirmação e Minha conta (as linhas dos itens, D-38); a ordem
das linhas do resumo pela decisão Q-01 do Gate 1 (a régua é o painel do pedido). O Frete antes dos descontos é bug;
o "de/por" sobre o total da linha, como na Design, não é.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| com cupom | o pedido de TC-JOURNEY-004 | a linha do cupom entre o Compre Junto e o PIX, antes do Frete; a conta fecha |
