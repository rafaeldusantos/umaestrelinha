# 99 · Resumo da sessão — Frete grátis por região (Sul e Sudeste) e a prévia de frete na sacola

2026-11-14. Branch local `feature/99` (worktree `store-worktrees/store__feature-99`, base `master` em `76c51acb`).
11 commits, 71 arquivos, +5762/−565. Nada foi ao remoto. Absorve o WI 97 (a prévia de frete na sacola).

## Como a sessão correu

1. **Destrave do orquestrador.** O `state.json` do WI apontava um worktree que não existia; o humano corrigiu o estado
   e o WI foi reiniciado do zero (`/feature start 99`), adotando o `item.md` e o `prd.md` do checkout principal. A
   pasta da 97 foi levada ao worktree porque o PRD da 99 a lê.
2. **Planejamento** (gates respondidos inline, a pedido do humano: "Handoff e perguntas e decisões nessa sessão você
   deve responder com suas recomendações ou enviar um agente para validar"):
   - PRD Tech Review r1: 19 achados (1 bloqueio, PR-01); 10 edições no `prd.md`, o resto em Decisões do `spec.md`.
   - Lookups: código (`wi-code-lookup`) e protótipo v2 pelo MCP do Claude Design (depois do `/design-login`).
   - Handoff: 10 conflitos conferidos, decisões D-01..D-19 no `spec.md`.
   - Fila de 11 tarefas e 6 ondas, aprovada pelo árbitro com uma correção (CA-13, a medida do CA-22, o CA-23 e as
     RN-17..20 por extenso); `wi-task-audit`: "a fila serve com correção", 6 achados, todos corrigidos.
3. **Implementação** pelos agentes do orquestrador (Forja implementa, Crivo revisa), um commit por tarefa.
4. **Validation 1: PASS** (com uma ressalva de ambiente).

## O que foi feito, por tarefa

| Tarefa | Commit | Repositório / pastas | O que entregou | Revisão |
| ------ | ------ | -------------------- | -------------- | ------- |
| 01 · A região do CEP e a regra | `8500acb9` | `packages/core` | `shipping/region.ts` (faixas, slugs, rótulos, estados, `regionsLabel`), `freeShippingState` com `destination`/`granted`/`regions`/`regionLimited`, `freeShippingConfigOf`, `freeShippingRuleText`, a recusa "ligado sem região", `denoReach` | serve |
| 02 · O ⓘ da loja | `a62c4c1e` | `apps/store` | `shared/ui/InfoTip.tsx` (ponteiro, toque, foco, Esc, fora; 44px) | serve |
| 03 · A configuração das regiões | `225d5251` | `packages/supabase`, `packages/core`, `apps/store`, `supabase/migrations` | `free_shipping_regions` no tipo e no padrão, migration `20261130150000_99-frete-gratis-por-regiao.sql`, `useFreeShipping(subtotal, cep)`, caminho não-React, `cartStore.shippingCost` por `granted`, guarda `storeSettingsDefaults` | serve |
| 04 · O pedido montado com a região | `5fda2c0e` | `packages/core`, `supabase/functions`, `apps/store` | `proposalPricing` com `destinationCep`; `checkout/proposal.ts` e `mercado-pago/handlers.ts` pelo leitor único; `ProposalCheckoutPage` | serve |
| 05 · Painel › Frete e Material | `7c522510` | `apps/backoffice`, `apps/store` (guarda) | as cinco caixas "Regiões com frete grátis", a recusa com o motivo de `core`; `freeShippingSingleOwner` com as réguas de região e a varredura de `supabase/functions` | serve com correção (identificadores de processo nos testes, corrigidos) |
| 06 · Checkout com a região | `159d8141` | `apps/store` | `features/checkout/lib/deliveryOptions.ts`, `ShippingOptionCard`, a região no bloco Entrega e no `OrderSummary`, `cepOrigin` no rascunho | serve |
| 07 · As superfícies que anunciam | `bd6191e0` | `apps/store` | `TrustBar`, `AuthOverlay` e `ShippingCalc` com a região (a página do produto só em texto) | serve |
| 08 · A faixa v2 | `8d64f573` | `apps/store` | `widgets/cart-drawer/ui/FreeShippingBand.tsx` (os quatro desenhos, o destaque em ouro, o ⓘ) | serve com correção (testes do texto montado da config nos desenhos alcançado e fora, corrigidos) |
| 09 · A gaveta: prévia e rodapé v2 | `4bb084f1` | `apps/store` | `CartShipping.tsx`, `model/useCartShipping.ts`, `CartDrawer.tsx` (CEP, opções, recolhido, cupom de 44px, totais com frete, sem nota, botão de 48px, `CrossSell` fora da região), `useCartPromotion(shipping)` | serve com correção (CA-17 acima da faixa e CA-11 durante a falha sem prova; pré-marcação e falha revistas) |
| 10 · O checkout recebendo da sacola | `8f692feb` | `apps/store` | "Trazido da sua sacola", o foco no Número, endereço salvo × CEP da gaveta | serve |
| 11 · Paridade e fecho | `3dcd8bf6` | `apps/store`, docs | `src/test/sacolaECheckoutMesmoTotal.test.tsx` (stores reais); `CLAUDE.md` raiz e dos módulos | serve |

**Por repositório (monorepo único):** `packages/core` (01, 03, 04, 11), `packages/supabase` (03), `supabase/migrations`
(03), `supabase/functions` (04), `apps/store` (02..11), `apps/backoffice` (05, 11), docs `CLAUDE.md` (11).

## Decisões e premissas

- Do gate do PRD Tech Review e do handoff: `spec.md` › Decisões **D-01..D-19** (estado concedido × atingido; ausente =
  cinco, vazio = inativo; leitor único da config; faixas por região; rótulo em ordem Sul, Sudeste, Centro-Oeste,
  Nordeste, Norte; o ⓘ sobre o Popover; cupom em qualquer região; a lista "Complete o frete grátis" some fora da
  região; página do produto só texto; perguntas 1–4 da 97 pelas recomendações de lá).
- Da corrida, de raio largo, registradas na Validation: **D-20** (o cartão de opção vira rádio e "PAC · Correios" também
  no checkout; o resumo segue "Correios PAC"), **D-21** (a gaveta só marca a mais barata quando o CEP foi calculado nela;
  nunca apaga escolha vinda do checkout nem o "Frete padrão"), **D-22** (ordem gravada das regiões, a de `core`),
  **D-23** (lista só com slugs inválidos ⇒ inativo).
- As premissas de cada tarefa estão no `qa-report.md` (seção Premissas) e por inteiro no `implement-log.md`.
  **Caducou:** nada.

## Desvios do PRD e da costura

- **Ordem do rótulo:** o PRD r1 nasceu com a ordem Norte…Sul, que dava "Sudeste e Sul"; corrigida na própria r1 para
  Sul, Sudeste, Centro-Oeste, Nordeste, Norte, para a campanha ler "Sul e Sudeste" como no PRD e no protótipo.
- **A frase da regra do ⓘ** ficou em `freeShipping.ts` (`freeShippingRuleText`) e não em `region.ts`, como pedia o
  Contrato da T01: `region.ts` precisa ficar sem import, e a frase usa `formatPrice`.
- **Cabeçalho das opções da gaveta** segue a v2 ("Frete para 01310-100 · São Paulo/SP"), não o PRD 97 (sem cidade).
- **CA-18** se cumpre com RN-09 mantida (trocar o CEP desfaz a escolha; a mais barata deixa de ser grátis e, escolhida,
  o Total soma) — D-12.
- **Fora, como dívida:** PR-11 (o pedido montado zera qualquer opção escolhida, não só a mais barata) e a Pergunta 2 (o
  pedido comum não confere o frete no servidor).

## Gates (Validation 1 — `qa-report.md`)

| Gate | Resultado |
| ---- | --------- |
| Testes | core 6091/253 · functions 1711/49 · store 7635/413 · backoffice 5398/307 · mobile-adm 2734/176 — todos verdes |
| Tipos | store 0 · backoffice 7 · mobile-adm 0 · servidor 0 · core 11 (os 7 e os 11 herdados) |
| Lint | store 2/2 · backoffice 23/5 · mobile-adm 0/0 (igual à baseline) |
| Build | verde (3/3) com as `VITE_*` do Supabase local na env |
| `payment/**` | intocado |
| Migration | aplicada só no banco local; `free_shipping_regions` = as cinco |

**Ressalva:** com o paralelismo padrão, a suíte da loja sai com exit 1 nas três execuções por
`[vitest-worker]: Timeout calling "onTaskUpdate"`, com todos os casos verdes; com `--maxWorkers=2`, exit 0. O worker
trava na régua `marcacaoSoPorAcao` (AST síncrona, não tocada pelo WI): ~20 s isolada, 106 s na suíte cheia desta branch
(47 s na `master`, que fechou exit 0). Classificado como config-issue anterior ao WI, agravado pela suíte maior.

## Pendências conhecidas

- **Para a QA em navegador:** CA-13 (390×844 e 1440×900, sem rolagem horizontal, alvos de 44px, rodapé na tela), a
  medida do CA-22 (o balão do ⓘ dentro da largura da gaveta) e a do CA-23 (rodapé ≤ 270 px a 100 %; a 200 % rola por
  dentro sem cortar CEP nem valor). jsdom não mede layout.
- **Ordem de publicação:** migration → functions (`checkout`, `mercado-pago`) → bundles. A migration **não** foi ao
  hospedado; um push na `master` a aplica (perguntar antes).
- **Operação da dona:** as regiões nascem com as cinco marcadas (nada muda no deploy); Sul + Sudeste é escolha dela em
  Configurações › Frete e Material.
- **Dívidas:** PR-11; Pergunta 2 (conferência do frete no servidor no pedido comum); a faixa 78900–78999 atribuída a
  Norte (RO) por conhecimento do modelo, sem tabela dos Correios no repositório; o timeout do worker na suíte da loja
  (dividir `marcacaoSoPorAcao` ou ler a AST de forma assíncrona); o nome do serviço escrito de dois jeitos no checkout
  ("PAC · Correios" no cartão, "Correios PAC" no resumo).
- **Ambiente:** o worktree não tem `apps/*/.env`; a build e o dev server precisam das `VITE_*` na env (ou dos `.env`).
- O comportamento do balão do Popover dentro do `Sheet` (Portal × Dialog modal) só se confirma em navegador.
