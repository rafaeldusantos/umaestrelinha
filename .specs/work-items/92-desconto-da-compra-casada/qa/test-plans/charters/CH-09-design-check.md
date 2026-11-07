# CH-09 · design-check — o desconto do Compre Junto contra os protótipos

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | design-check                                                                  |
| Prioridade   | P2                                                                            |
| Persona      | PER-01 Marina (a aba do painel é aberta com `admin-painel` só para a conferência visual) |
| Tour         | —                                                                             |
| Modo         | —                                                                             |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | o "de/por", a linha do desconto e a nota no bloco, e a faixa que rola dentro das peças de uma lista (CA-02.1..02.3; a faixa exigida pela decisão Q-02 de 2026-11-04); a linha e o rodapé da sacola (CA-03.2, CA-03.3, CA-03.8); o resumo do checkout (CA-03.8); as duas telas de "o valor mudou" (CA-04.3); a confirmação, Minha conta e o e-mail (CA-05.2); o campo "Desconto ao levar junto" no painel (CA-01.1) |
| Viewport     | os de cada frame (390 e 1440 nos protótipos da loja; 1440 e abaixo de 1024 no painel) |
| Entrada      | `/produtos/<slug de P>` · anônima; `/admin/produtos/<id de P>/editar` · `admin-painel` |
| Jornadas     | —                                                                             |
| TC           | TC-UI-004, TC-UI-005, TC-UI-006                                                |

## Missão

Conferir, tela a tela, o que o WI desenhou contra o que a loja e o painel entregam, registrando cada diferença com o
valor do design e o observado.

## Fora do escopo

- O que o protótipo traz como artifício: o desconto aplicado pela marca e o percentual guardado na linha da sacola
  (declarado no arquivo; vale o PRD — presença e releitura).
- O "Selo" do painel do protótipo (descartado no gate, Q-06).
- A frase do cabeçalho do bloco e a frase da sacola sobre promoção e cupom (tiradas no handoff, H-03).
- A ajuda do painel que diz que o desconto concorre com o cupom (contradiz CA-03.6; vale o PRD).
- A **ordem** das linhas do resumo (checkout, confirmação, Minha conta, e-mail) frente ao protótipo: a régua é o
  painel do pedido (decisão Q-01 de 2026-11-04), conferida em TC-FUNC-026 e TC-INT-004 — diferença de ordem frente ao
  protótipo não é achado desta sessão.
- Telas sem frame: a recusa e a prévia do painel, o painel do pedido, a Adesão, o app do ateliê — registrar "sem
  frame", não comparar.

## Design

**Fonte de design:** Claude Design · `claude_design` · de `item.md` › Insumos e `prd.md` › Expectativas de UI/UX.
Sem o MCP `claude-design` na sessão, a sessão é `not-run` por `design`.

- Loja: https://claude.ai/design/p/69224d8a-17ae-4b1f-a251-a8105b41edc2?file=Produto+-+Compre+Junto+com+desconto.html
- Loja: https://claude.ai/design/p/69224d8a-17ae-4b1f-a251-a8105b41edc2?file=Pedido+-+Desconto+do+Compre+Junto.html
- Loja (referência do WI-01, sem desconto): https://claude.ai/design/p/69224d8a-17ae-4b1f-a251-a8105b41edc2?file=Produto+-+Compre+Junto.html
- Painel: https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Produto+-+Compre+Junto.html

| Tela do app (rota)  | No design (frame, nó ou arquivo) | Viewports com frame | Estados a conferir                 |
| ------------------- | -------------------------------- | ------------------- | ---------------------------------- |
| `/produtos/:slug` — bloco Compre junto | `Produto - Compre Junto com desconto.html` › bloco | 390 · 1440 | só peças sem desconto · peça com desconto marcada · "Chaveiro" tirando as correntes |
| `/produtos/:slug` — peças da lista | `Produto - Compre Junto com desconto.html` › a faixa das peças da lista | 390 · 1440 | a faixa que rola dentro dela, cada cartão com "de/por" e sem a frase; a grade no lugar da faixa é achado (Q-02) |
| `/produtos/:slug` — barra fixa | `Produto - Compre Junto com desconto.html` › barra fixa / nota do computador | 390 · 1440 | com desconto |
| gaveta da sacola | `Produto - Compre Junto com desconto.html` › sacola | 390 · 1440 | linha com desconto · linha mista · a joia saiu ("O desconto de N% volta…") |
| `/checkout` — resumo | `Pedido - Desconto do Compre Junto.html` › Checkout · resumo | as do frame | com cupom e PIX · linha mista (a ordem das linhas não se compara — Q-01) |
| `/checkout` — o valor mudou | `Pedido - Desconto do Compre Junto.html` › Checkout · o valor mudou | as do frame | alerta |
| `/pedido/:id` e `/conta` — o valor mudou | `Pedido - Desconto do Compre Junto.html` › Link / Minha conta · o valor mudou | as do frame | com contato |
| `/pedido/:id` e `/conta` | `Pedido - Desconto do Compre Junto.html` › Confirmação · Minha conta | as do frame | linha partida · resumo (a ordem não se compara — Q-01) |
| e-mail do pedido (Mailpit ou prévia em `/admin/configuracoes/notificacoes` com o `order_id`) | `Pedido - Desconto do Compre Junto.html` › E-mail do pedido | o do frame | com desconto e cupom (a ordem dos totais não se compara — Q-01) |
| `/admin/produtos/:id/editar` — aba Compre junto | Backoffice `Produto - Compre Junto.html` › bloco "Desconto ao levar junto" | 1440 · abaixo de 1024 | preenchido (o protótipo mostra desabilitado com "10" e "WI 92 · depois" — a etiqueta e o desabilitado não são régua) |
