---
id: 99
titulo: Frete grátis por região (Sul e Sudeste) e a prévia de frete na sacola
tipo: feature
entrada: prd
fase: done
criado: 2026-11-13
---
## Descrição
Pedido de 2026-11-13, dentro do planejamento da Black Friday:

"Para a promoção de Frete Grátis já temmos um componentes na Loja que da essa opçao, ele tem um ativo que mostra quanto falta para a pessoa ganhar o frete grátis, mas precisamos que ajuste apenas para validar para CEPs Sul e Sudeste. Desenhe essa tela do Drawer do Carrinho no Claude Design também." · "Frete Grátis para Compras acima de R$450 para as regioes do sul e sudeste." · "Ajustar ferte grátis apenas para CEPS sul e sudeste"

Na mesma sessão:
- "Feature 99 - Pode absorver a 97." — a prévia de frete na sacola (WI 97) entra neste item; a pasta da 97 fica como registro.
- "Antes de começar melhorar o Prototipo a linha do \"Faltam R$xxx para frete grátis\" quando estiver completo podemos dar um destaque e remover a frase abaixo \"Vale para...\" para deixar menor a altura ocupada pelo componente.. deixar o informativo em um tooltipo informativo (celular ao clicar mostra). Acho que precisamos tentar rever o bloco fotter do Drawer - Calcular frete, cupom, subtotal e total (remover a frase \"Frete Calculado com o seu CEP...\" ) pois esse fotter do Drawer está ocupando quase todo o Drawer." — feito no protótipo `Black Friday - Sacola v2.html`.

## Insumos
- PRD: `prd.md` (escrito nesta sessão; absorve `../97-previa-de-frete-na-sacola/prd.md`)
- Protótipo: Claude Design, projeto "Uma Estrelinha - Black Friday" (`4abe021d-d77e-4fe7-affd-524180315fa3`), página **`Black Friday - Sacola v2.html`** (`bf-sacola-v2.jsx`, `bf-sacola-v2.css`, `bf-dados.jsx`, `sf.css`) — https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Sacola+v2.html. A v1 (`Black Friday - Sacola.html`) fica no projeto para comparação. O Claude Design avulso sai do ar até 2026-12-14: copiar o que for preciso antes disso.
- Cópia publicada das telas (o Claude Design avulso sai do ar até 2026-12-14): https://claude.ai/artifact/2yUJyqwYr6tipVWQEh8xdd — índice das páginas do projeto; a deste item é **Sacola v2 (compacta)** (`sacola-v2.html`), com a v1 (`sacola-v1.html`) para comparação.
- Protótipo da 97 (fluxo do checkout recebendo o CEP): `Sacola - Prévia de frete.html`, projeto "Uma Estrelinha - Loja", migrado para https://claude.ai/code/artifact/41e4046b-6433-4e30-9670-f714f2dc2b75
- A regra do frete grátis: `packages/core/src/shipping/freeShipping.ts` (`freeShippingState`, `freeShippingRefusal`) e `packages/core/src/hooks/useFreeShipping.ts`
- As superfícies que a leem: `CartDrawer.tsx`, `drawerFacts.ts`, `DeliveryBlock.tsx`, `OrderSummary.tsx`, `features/shipping-calc`, `TrustBar.tsx`, `AuthOverlay.tsx`, `ProposalCheckoutPage.tsx`, `cartStore.ts`; no servidor, `supabase/functions/checkout/proposal.ts` e `supabase/functions/mercado-pago/handlers.ts`; no painel, `ShippingMaterialSection.tsx`
- Medidas do protótipo (390×844): faixa de 86 → 55 px (43 liberado/fora); rodapé de 347/319 → 244/265 px; área dos itens de 336 → 486 px

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| prd-review r1 | 2026-11-14 | `changes_requested_blocking` respondido inline a pedido · 10 aplicados ao `prd.md` · 9 em Decisões (PR-11 fora, dívida) |
| handoff | 2026-11-14 | `pass` inline a pedido · design (MCP) e código lidos · 10 conflitos conferidos · 19 decisões → `spec.md` Decisões (D-01..D-19) |
| fila | 2026-11-14 | aprovada pelo árbitro (com correção CA-13/CA-22/CA-23 e RN-17..20) · 01–11 · ondas W1..W6 · auditoria `a fila serve com correção` (6 corrigidos, 0 ao humano) |
| execução | 2026-11-14 | autorizada junto da aprovação da fila: 01–11 |
| validation 1 | 2026-11-14 | `PASS` · gates verdes contra a baseline · CA-13/CA-22 (medida)/CA-23 (medida) → QA em navegador · ressalva: timeout do worker na suíte da loja com paralelismo padrão (exit 0 com 2 workers) |
| QA · Gate 1 — plano | 2026-11-14 | aprovado pelo árbitro (política do humano) · 26/26 critérios · 30 TC · 8 charters em 5 lotes · cotação interceptada (sem sandbox) · massa preparada pela thread no local |
| QA · Gate 3 — veredito | 2026-11-14 | fail · 7 bugs novos (critical 1 · high 1 · low 5: BUG-001..BUG-007) · nenhuma transição · qa/qa-result.md |
| QA · perguntas ao produto | 2026-11-14 | 1 respondida pela recomendação (o mesmo Total com o mesmo meio de pagamento) · destino `ajusta o plano` · qa/decisoes-produto.md |
| QA · Gate 3 — veredito (rodada 2, confirmação) | 2026-11-14 | partial · 0 bugs novos · transições: BUG-001..BUG-007 open → resolved · riscos residuais: CH-07 design-check blocked (protótipo ilegível, sem escopo do Claude Design), TC-FUNC-006 sem o RS, CA-05 e CA-10 missing · confirmado pelo árbitro (política do humano) · qa/qa-result.md |
| fix tasks | 2026-11-14 | 3 lotes da QA rodada 1 aprovados pelo orquestrador: 12 (BUG-001, BUG-002) · 13 (BUG-003, BUG-006, BUG-007) · 14 (BUG-004, BUG-005) · waves-fix.md `ONDAS: 12,13,14` |
| validation 2 | 2026-11-14 | `PASS` · Re-Validation das fix tasks 12–14 (apps/store): testes 7646/413 · tipos 0/0 · lint 2/2 · build 3/3 · bugs seguem `open` até o reteste da QA |
