# CH-07 · design-check — a gaveta v2 e o checkout recebendo o CEP

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | design-check |
| Prioridade   | P1 |
| Persona      | PER-01 Luana |
| Tour         | — |
| Modo         | — |
| Time-box     | 60 min · orçamento: 50 ações (nove estados em duas telas) |
| Mudança      | a faixa compacta e os quatro desenhos (M-01, M-02, UC-07..UC-09), o ⓘ (M-03), o frete sem CEP numa linha (M-04), as opções abertas e a linha recolhida (M-05), sem nota (M-06), cupom, totais e botão de 48 px (M-07); a Entrega com "Trazido da sua sacola" (UC-04) |
| Viewport     | 390 × 844 (a largura dos frames do protótipo); 1440 × 900 só onde a fonte tiver frame — sem frame, registre "sem frame para 1440" |
| Massa        | só lê; sacola e rascunho próprios |
| Driver       | — |
| Entrada      | `/` · anônima, sacola vazia; cotação interceptada com a **fixture A** |
| Jornadas     | J-01, J-02 |
| TC           | TC-UI-001, TC-UI-002, TC-UI-003 |

## Missão

Conferir, estado a estado, a gaveta v2 e o bloco Entrega recebendo o CEP contra os protótipos do Work Item,
registrando cada diferença com o valor do design e o observado.

## Deve tentar

1. Os quatro desenhos da faixa: abaixo da faixa sem CEP; acima sem CEP (Sul e Sudeste); acima com 01310-100
   (liberado); com 40020-000 (fora). E o balão do ⓘ aberto num deles.
2. O rodapé: sem CEP; opções abertas; frete escolhido recolhido; cupom recolhido; totais com o frete; botão.
3. O checkout › Entrega logo depois de "Finalizar Pedido": a linha "Trazido da sua sacola · Bela Vista — São Paulo/SP"
   e o cartão da opção marcada.

## Edge cases sugeridos

- Estado de erro do campo ("CEP inválido") contra o desenhado.
- Foco no campo de CEP (borda e anel `primary`).
- Hover no botão "Finalizar Pedido" em 1440.

## Fora do escopo

- Estados que a v2 não desenha (calculando, falha, sem opção, retirada RS, sacola vazia): sem régua de design.
- Dados de exemplo do protótipo (preços, prazos, nomes, "R$ 401,83", faixa de R$ 300 no protótipo do checkout) não
  são régua; valem os da loja.
- Divergências já resolvidas na costura: o cabeçalho "Frete para 01310-100 · São Paulo/SP" (vale a v2); o 700 de
  "Frete grátis para Sul e Sudeste" (vale a v2); a v2 marcar o PAC — vale "a mais barata"; as linhas de desconto nos
  totais continuam (a v2 só mostra Subtotal, Frete e Total).
- Checkout com região, painel, barra de confiança, aviso de login e página do produto: o design não os mostra.

## Design

**Fonte de design:** "Uma Estrelinha - Black Friday" · `claude_design` · https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Sacola+v2.html (arquivos `bf-sacola-v2.jsx`, `bf-sacola-v2.css`, `bf-dados.jsx`, `sf.css`) · de `item.md` › Insumos. Cópia publicada (página "Sacola v2 (compacta)", `sacola-v2.html`): https://claude.ai/artifact/2yUJyqwYr6tipVWQEh8xdd — a costura registra que ela não abriu para a conta do Dev; use o MCP.

**Fonte de design (checkout):** "Uma Estrelinha - Loja" · `claude_design` · projeto `69224d8a-17ae-4b1f-a251-a8105b41edc2`, `Sacola - Prévia de frete.html` (`sf-checkout.jsx`) · de `spec.md` › Design; cópia migrada: `link` · https://claude.ai/code/artifact/41e4046b-6433-4e30-9670-f714f2dc2b75 · de `item.md` › Insumos.

| Tela do app (rota)                 | No design (frame, nó ou arquivo)                      | Viewports com frame | Estados a conferir |
| ---------------------------------- | ----------------------------------------------------- | ------------------- | ------------------ |
| gaveta da sacola (sobre `/`) — faixa | `Black Friday - Sacola v2.html` › faixa do frete grátis | 390                 | abaixo · alcançada sem CEP · liberado · fora · balão do ⓘ aberto |
| gaveta da sacola — rodapé           | `Black Friday - Sacola v2.html` › rodapé (frete, cupom, totais, botão) | 390 | sem CEP · erro "CEP inválido" · opções abertas · recolhido · cupom recolhido |
| `/checkout` › Entrega               | `Sacola - Prévia de frete.html` › `sf-checkout.jsx`    | 390                 | aberto com o CEP da sacola, a linha "Trazido da sua sacola", a opção marcada |

Medidas que o `item.md` registra do protótipo em 390 × 844 (régua de apoio, não de pixel): faixa de 55 px, rodapé de
244 px sem CEP e 265 px com CEP, área das peças de 486 px.
