# 99 · Frete grátis por região (Sul e Sudeste) e a prévia de frete na sacola

Costura de 2026-11-14. PRD r1.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Critérios de aceite: `prd.md`, ao lado. Convenção de cada repositório: o arquivo de instruções dele.

O `prd.md` desta pasta lê o PRD da 97 (`../97-previa-de-frete-na-sacola/prd.md`), que vale inteiro com as mudanças
M-01..M-07. Os critérios dos dois são a definição de pronto.

## Escopo

| UC | Título | Origem |
| -- | ------ | ------ |
| UC-01 (97) | Calcular o frete na sacola (com M-04) | caso de uso do PRD 97, mudado pela 99 |
| UC-02 (97) | Escolher a forma de envio (com M-05) | caso de uso do PRD 97, mudado pela 99 |
| UC-03 (97) | Ver o total com o frete (com M-06, M-07) | caso de uso do PRD 97, mudado pela 99 |
| UC-04 (97) | Seguir para o checkout | caso de uso do PRD 97 |
| UC-05 (97) | A sacola mudou depois do cálculo | caso de uso do PRD 97 |
| UC-06 (97) | Quando a cotação não responde | caso de uso do PRD 97 |
| M-01..M-03 | A faixa compacta, o destaque e o ⓘ | mudança da v2 (PRD 99) |
| UC-07 | A faixa sem CEP | caso de uso do PRD 99 |
| UC-08 | A faixa com CEP de uma região da campanha | caso de uso do PRD 99 |
| UC-09 | A faixa com CEP fora da campanha | caso de uso do PRD 99 |
| UC-10 | O checkout | caso de uso do PRD 99 |
| UC-11 | As outras superfícies que anunciam o frete grátis | caso de uso do PRD 99 |
| UC-12 | O painel | caso de uso do PRD 99 |

**Achados de eval que este Work Item resolve**

`nada`: o repositório não tem relatório de avaliação local (`.specs/evals/` não existe).

**Anexos consultados**

| Insumo (caminho ou URL) | Tipo | O que se tirou | Alimenta |
| ----------------------- | ---- | -------------- | -------- |
| `prd.md` (99, r1) | PRD | UC-07..UC-12, RN-13..RN-20, CA-14..CA-26, M-01..M-07 | todos |
| `../97-previa-de-frete-na-sacola/prd.md` | PRD absorvido | UC-01..UC-06, RN-01..RN-12, CA-01..CA-13 | UC-01..UC-06 |
| Claude Design `4abe021d-…` › `Black Friday - Sacola v2.html` | protótipo | a gaveta v2 inteira (seção Design) | M-01..M-07, UC-01..03, UC-07..09 |
| Claude Design `69224d8a-…` › `Sacola - Prévia de frete.html` (`sf-checkout.jsx`) | protótipo | o checkout recebendo o CEP | UC-04 |
| `https://claude.ai/artifact/2yUJyqwYr6tipVWQEh8xdd` | cópia publicada | não abriu ("artifact not found" para esta conta); a fonte foi lida pelo MCP | — |
| `https://claude.ai/code/artifact/41e4046b-…` | protótipo 97 migrado | não lido: é a v1 que a v2 substitui; o checkout foi lido pelo projeto de origem | — |
| `freeShipping.ts`, `useFreeShipping.ts` e as superfícies listadas no `item.md` | código | ver Código | todos |
| Medidas do protótipo no `item.md` (faixa 86→55 px, rodapé 244/265 px, área 486 px) | medida | o alvo de CA-23 | M-07, CA-23 |

## Fora do escopo

Do PRD 99 (verbatim):
- Frete grátis por estado ou por faixa de CEP escolhida à mão (só as cinco regiões).
- Faixa de valor diferente por região.
- O desconto de campanha (WI 102), o perfil de cores (WI 100) e a faixa de avisos (WI 101). A faixa do frete grátis
  usa os tokens; com o perfil Black Friday ligado ela muda de cor sozinha.
- Mudar a cotação do Melhor Envio.

Do PRD 97 (verbatim):
- Levar para a sacola o CEP calculado na página do produto (`ShippingCalc`) — Pergunta 4.
- Lembrar o CEP entre visitas (`localStorage`).
- Estimativa de frete sem CEP (faixa padrão, "a partir de").
- Mudar o cálculo de frete da página do produto.
- Qualquer mudança em `packages/core/src/payment/**` além de passar o frete cotado como entrada.

Também fora (Decisões): a conferência do frete no servidor no pedido comum (Pergunta 2 da 99) e o zero de qualquer opção
no pedido montado (PR-11).

## Design

Fontes: Claude Design, projeto "Uma Estrelinha - Black Friday" (`4abe021d-d77e-4fe7-affd-524180315fa3`), página
`Black Friday - Sacola v2.html` (`bf-sacola-v2.jsx`, `bf-sacola-v2.css`, `bf-dados.jsx`, `sf.css`, `bf.css`,
`ds/tokens/colors.css`) — link de `item.md` › Insumos e do cabeçalho do `prd.md`. Para o checkout: projeto "Uma
Estrelinha - Loja" (`69224d8a-17ae-4b1f-a251-a8105b41edc2`), `Sacola - Prévia de frete.html` (`sf-checkout.jsx`) —
link de `item.md` › Insumos (protótipo da 97). Lidas pelo MCP `claude-design` em 2026-11-14.

### Gaveta da sacola v2

Coluna de largura `min(440px, 100%)`, fundo `surface`, sobre véu. De cima para baixo: cabeçalho, faixa do frete grátis,
lista das peças (rola por dentro), rodapé fixo (borda superior `line`, folga da área segura, altura máxima 72 % da
gaveta, rola por dentro): bloco do Frete, Cupom recolhido, Totais, "Finalizar Pedido".

**A faixa do frete grátis** — só com o interruptor ligado.
- Abaixo da faixa (sem CEP, ou com CEP que não está fora): fundo `ground-deep`, padding 9px 20px 11px, 7px entre linha
  e barra. Linha (altura mínima 22px): à esquerda "Faltam R$ 48,17 para o frete grátis" + ⓘ (12,5px/18, 600,
  `primary`); à direita "R$ 401,83 / R$ 450,00" (11px, 500, `ink-soft`, não encolhe). Barra de 5px, trilho branco,
  preenchimento `primary`, raio 999, `role="progressbar"` 0–100 com rótulo "Progresso para o frete grátis"; a largura
  anima em 400ms (sem animação com menos movimento). Balão: "Compras a partir de R$ 450,00 têm frete grátis para
  entregas no Sul (PR, SC, RS) e no Sudeste (SP, RJ, MG, ES). A região é conferida pelo CEP."
- Acima da faixa, sem CEP, regiões limitadas: fundo `accent`, padding 10px 20px, sem barra, `role="status"`; selo de
  20px (círculo `ink` com ✓ de 12px em `accent`); "Frete grátis para Sul e Sudeste" + ⓘ (13px, 700, `ink`). Balão: a
  regra + " Informe o CEP abaixo para confirmar."
- Acima da faixa, CEP da campanha: o mesmo destaque, "Frete grátis liberado" + ⓘ. Balão: "Entrega em São Paulo/SP,
  região Sudeste. A forma de envio mais barata sai sem custo." (RS: "Entrega em Porto Alegre/RS, região Sul. …").
- CEP fora da campanha, qualquer subtotal: fundo `ground-deep`, padding 10px 20px, sem barra e sem valor/faixa,
  `role="status"`; "Frete grátis só para Sul e Sudeste" + ⓘ (12,5px, 500, `ink-soft`). Balão: "Para Salvador/BA, o
  frete é o da cotação. " + a regra inteira.
- Interruptor desligado: sem faixa.

**O ⓘ (sobreposição)** — círculo de 17px, contorno 1,5px na cor do texto da faixa, "i" de 10,5px em 700, 6px depois do
texto; área de toque ampliada por pseudo-elemento (≥ 44px); rótulo "Sobre o frete grátis", `aria-expanded`. Abre ao
passar o ponteiro e fecha ao sair; clique de mouse mantém; toque alterna; abre no foco; Esc fecha; toque/clique fora
fecha. Balão `role="tooltip"`, a 12px de cada borda da gaveta, logo abaixo da faixa (sobre a lista); fundo `ink`,
texto `on-primary`, 12,5px/18, raio md, padding 10px 12px, sombra `shadow-ink`; entra em 150ms subindo 4px, só sem
menos movimento.

**O bloco do frete no rodapé**
- Sem CEP (M-04): sem título; uma linha, 8px de intervalo, padding 10px 20px, borda inferior `line`. Campo de 44px,
  borda `field`, raio sm, fundo branco, 14px `ink`, ícone de envio de 18px em `primary` dentro, a 12px da esquerda (texto
  a 40px); placeholder "CEP para calcular o frete" (`ink-soft`); rótulo acessível "CEP para calcular o frete e o
  prazo"; `inputMode` numérico, `autocomplete="postal-code"`, máximo 9, máscara `00000-000`; em foco borda e anel
  `primary`. Botão "Calcular": 44px, padding 0 16px, contorno 2px `primary`, fundo transparente, 13px 600 `primary`, não
  encolhe. Enviar com menos de 8 dígitos: borda `alert`, `aria-invalid`, linha "CEP inválido" (12px, `alert`,
  `role="alert"`) abaixo; o erro some ao digitar. Enter no campo calcula.
- Opções abertas (logo depois de calcular, a mais barata já marcada e somando no Total): cabeçalho (12,5px, `ink-soft`,
  altura mínima 24px) "Frete para **01310-100** · São Paulo/SP" (CEP em `ink` 600) e, à direita, "Trocar CEP" (13px 600
  `primary`, sublinhado, área de 44px) que volta ao estado sem CEP. Grupo de rádios "Forma de envio", cartões com 8px de
  intervalo, cada um `role="radio"`: altura mínima 52px, padding 8px 12px, borda 2px `line`, raio md, fundo branco;
  escolhido borda `ink` e fundo `ground`; rádio de 20px; "PAC · Correios" (14/18, 600) e "Chega entre 24 e 28 de
  novembro" (12,5/16, `ink-soft`); à direita o valor (display 15px, 700, `primary`), ou "Grátis" com o preço cheio
  riscado embaixo (12px, `ink-soft`). Transições de 150ms com par sem movimento. Tocar numa opção escolhe e recolhe.
- Frete escolhido recolhido (M-05): a linha inteira é um botão, altura mínima 52px, padding 7px 20px, borda inferior
  `line`: ícone de envio de 20px em `primary`; "PAC · Correios" (13,5/18, 600) e embaixo "Chega entre 24 e 28 de novembro
  · CEP 01310-100" (12/16, `ink-soft`, quebra, sem corte); o valor (display 14px, 700, `primary`, "Grátis" quando
  zerado); chevron em `ink-soft`. Rótulo acessível "Frete: PAC, grátis, para o CEP 01310-100. Ver as opções" (ou com o
  valor), `aria-expanded="false"`. Tocar reabre as opções.
- Calculando, falha, sem opção, retirada RS e sacola vazia **não estão na v2**: valem os textos e comportamentos do PRD
  97 (UC-01 calculando, UC-06, UC-02 retirada, CA-01), no desenho do design system.

**Cupom recolhido** (M-07): botão de largura total, altura mínima 44px, padding 0 20px, borda inferior `line`, "Tem um
cupom?" (13,5px, 500) e chevron. O aberto e o aplicado seguem o componente de hoje.

**Totais** (M-07): padding 10px 20px 0, 3px entre linhas, 12,5px/18, rótulo `ink-soft`, valor 600. "Subtotal (3
itens)"; "Frete · PAC" (ou "Retirada no escritório") com "Grátis" em `primary` ou o valor — só com frete escolhido ou
opções abertas; as linhas de desconto de hoje continuam; "Total" com margem 5px, padding 7px, borda superior `line`,
rótulo display 16px 700 `ink`, valor display 18px 700. **Nenhuma nota abaixo do Total**, em nenhum estado (M-06).

**Finalizar Pedido**: contêiner padding 10px 20px 14px (20px embaixo a partir de 768px); largura total, 48px, raio md,
fundo `primary` (hover `primary-strong`), texto branco, display 15px 700, ícone de sacola de 20px, 10px de intervalo.

### Checkout · Entrega com o CEP da sacola

Bloco Entrega aberto: campo CEP preenchido; abaixo dele "Trazido da sua sacola · Bela Vista — São Paulo/SP" (13px,
`ink-soft`, `role="status"`, precedido de um ponto de 6px em `accent`); Rua, Bairro, Cidade e UF preenchidos pela busca
(como hoje ao digitar); o foco no Número; "Forma de envio" com a opção da gaveta já marcada, no mesmo cartão da gaveta;
CEP do RS mostra os grupos "Envio a domicílio" e "Retirar em". Resumo: "Frete · PAC" ou "Retirada no escritório", com o
valor ou "Grátis".

### O que o design não mostra

O checkout com região (UC-10, CA-16..18), o painel (UC-12), TrustBar/AuthOverlay/ShippingCalc com a região (UC-11), a
fonte a 200 % e a medida do rodapé (CA-23): seguem o PRD e o design system do repositório.

Divergências entre fontes:
- Cabeçalho das opções: PRD 97 "Frete para 01310-100"; v2 "Frete para 01310-100 · São Paulo/SP". **Vale a v2** (a
  conferência: a v2 é o protótipo mais novo, e a cidade vem da mesma busca do CEP da PR-17; sem a busca, sai só o CEP).
- "Frete grátis para Sul e Sudeste" em 700 (v2) e o M-02 que cita o negrito só no "liberado": **vale a v2** (a
  conferência).
- Linha "Trazido da sua sacola": o protótipo do checkout traz "Bela Vista — São Paulo/SP". **Vale o formato do PRD 97**
  ("Bairro — Cidade/UF"), que é o mesmo do protótipo (a conferência).
- O protótipo do checkout tem faixa de R$ 300 e sem região: é exemplo; vale o PRD (UC-10).
- A v2 marca o PAC ao calcular: **vale "a mais barata"** do PRD 97 (UC-02); coincide nos dados de exemplo (a
  conferência).
- Totais: a v2 mostra só Subtotal, Frete e Total; **valem as linhas de desconto de hoje** mais o Total de
  `resolveOrderPricing` (RN-04 da 97) (a conferência).

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

- **Instruções** — `CLAUDE.md` (raiz: "O defeito 01", "Convenções que valem em todo o repositório", "Os guardas — o que
  trava o quê", "Baselines", "CI e deploy", "Feature-Sliced Design", "Alias de import"); `apps/store/CLAUDE.md ›
  Carrinho, chrome e checkout`, `› Frete grátis — um interruptor e um dono só (feature 37)`, `› Retirada no
  escritório`, `› A faixa de avisos`, `› Design system`, `› Mobile — o que quebra e não grita`;
  `apps/backoffice/CLAUDE.md › Configurações › quatro seções`, `› Configurações › Frete — o interruptor do frete
  grátis`; `packages/core/CLAUDE.md › Pureza`, `› Os módulos`, `› Dinheiro`, `› proposals`; `supabase/CLAUDE.md › O
  deploy é AUTOMÁTICO`, `› Migrations`, `› Edge functions`, `› order-proposals e o pedido que nasce de uma proposta`.
- **Recorte** — todos os UCs do Escopo.

**O que já serve**
- Cotação com cache por CEP e impressão da sacola: `apps/store/src/features/checkout/api/useShippingQuote.ts:24-45`
  (chave `:32`, `enabled` só com 8 dígitos `:34`, filtro `> 0` `:17-18`) — RN-01, CA-02, CA-03, UC-05.
- Rascunho com `address.cep` e `shipping` e os setters: `features/checkout/model/checkoutStore.ts` › `setAddress`/
  `setShipping` (`:179-180`); padrão `useCheckoutStore` (`:288`), chave `estrelinha-checkout` em `sessionStorage`
  (`:26`, `:256`); o pedido montado tem instância própria `useProposalCheckoutStore` (`:295-298`) — RN-05, RN-06.
- Troca de CEP desfaz a escolha sem apagar na montagem: `DeliveryBlock.tsx:265-278` (`lastCep` nasce com o valor atual)
  — RN-09.
- Busca de endereço pelo CEP: `packages/core/src/hooks/useCepLookup.ts:33`, reexportada por
  `apps/store/src/entities/address/api/useCepLookup.ts`; o preenchimento em `DeliveryBlock.tsx:249-262`.
- Retirada: `apps/store/src/entities/pickup` › `usePickupOptionState`/`usePickupOption`; regra em
  `packages/core/src/shipping/pickup.ts` (`isRsCep` `:30-33`, `pickupAvailable` `:69-75`) — RN-07.
- Prazo e mais barata: `@estrelinha/core/shipping` › `quoteToEstimate`, `formatEstimate`, `cheapestQuoteId` (usados em
  `DeliveryBlock.tsx:304-325`) — RN-02.
- Total por `resolveOrderPricing`; cupom `free_shipping` zera dentro dela: `packages/core/src/payment/pricing.ts:715`,
  `:751` — RN-03/04, CA-06; `payment/**` não muda.
- Custo como entrada do cupom: `features/apply-coupon/ui/CouponInput.tsx:13` (`shippingCost`) — RN-08.
- Recusa `string | null`: `freeShipping.ts` › `freeShippingRefusal` (`:128-134`).
- O servidor do pedido montado já pergunta à regra por `proposalPricing`: `supabase/functions/checkout/proposal.ts:397-409`,
  `supabase/functions/mercado-pago/handlers.ts:1433-1457`, `packages/core/src/proposals/pricing.ts:276-291` (`:280`);
  `address_zip` em `proposal.ts:418` (corpo) e no pedido (`mercado-pago/handlers.ts:361`).
- Leitura das settings com default por chave (merge raso): `packages/core/src/hooks/useStoreSettings.ts:71-78`, `:94-97`.
- Painel: `apps/backoffice/src/shared/ui` › `SWITCH_TAP_44`, `ToggleField`, `InfoBanner`, `FieldGroup`; checkbox do DS
  `@estrelinha/ui/checkbox` (uso em `apps/backoffice/src/features/order-notice/ui/NoticeEmails.tsx:9`, `:37-41`).
- Popover do DS: `packages/ui/src/popover.tsx:10-26` (Radix, em Portal; abre por toque, fecha com Esc e fora).
- Alvo de 44px: `apps/store/src/shared/lib/touchTarget.ts` › `TAP_44` (`:29`), `TAP_ROW` (`:33`).
- Campo de CEP + "Calcular" numa linha: `apps/store/src/features/shipping-calc/ui/ShippingCalc.tsx:91-120`.

**O que muda**
- A regra: `packages/core/src/shipping/freeShipping.ts` › `FreeShippingConfig` (`:27-30`), `FreeShippingState`
  (`:33-47`), `INATIVO` (`:55-61`), `freeShippingState` (`:92-113`), `freeShippingRefusal` (`:128-134`) — destino,
  regiões, `destination`, `granted`, recusa de região (Decisões D-01..D-04).
- Barril: `packages/core/src/shipping/index.ts:6-9` — exportar `region.ts`.
- Hook: `packages/core/src/hooks/useFreeShipping.ts:21-28` — recebe o CEP; comentário `:14` cita consumidores que não
  existem mais.
- Tipo e default: `packages/supabase/src/types/settings.ts` › `ShippingSettings` (`:64-108`), `DEFAULT_SHIPPING`
  (`:196-204`).
- Caminho não-React: `packages/core/src/constants.ts` › `setRuntimeShippingSettings` (`:18-32`),
  `runtimeFreeShippingConfig` (`:45-48`), e `apps/store/src/app/RuntimeSettingsLoader.tsx:16-23`.
- `cartStore.shippingCost`: `apps/store/src/entities/cart/model/cartStore.ts:274-283` (consumidor vivo:
  `features/recover-cart/model/useRecoverCart.ts:100`).
- Pedido montado: `packages/core/src/proposals/pricing.ts` › `ProposalPricingInput` (`:259-266`), `proposalPricing`
  (`:276-291`); `supabase/functions/checkout/proposal.ts:399-409`; `supabase/functions/mercado-pago/handlers.ts:1436-1459`;
  `apps/store/src/pages/ProposalCheckoutPage.tsx:249-255`.
- Bloco Entrega: `apps/store/src/features/checkout/ui/DeliveryBlock.tsx:208` (`useFreeShipping(subtotal)`), `:285-338`
  (opções), `:396-501` (cartões), `:239-246` (semeadura do endereço salvo).
- Resumo: `apps/store/src/features/checkout/ui/OrderSummary.tsx:70`, `:90-105`, `:437`.
- Gaveta: `apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx` — hook `:70`; faixa `:184-216` (o "!" de `:193`);
  `CrossSell` `:248-250`; cupom `:279`; totais `:287-330`; nota `:334-336`; botão `h-[52px]` `:341`.
- Total da sacola: `apps/store/src/entities/cart/model/useCartPromotion.ts:168-213` (`shipping: 0` em `:185`).
- Rascunho: `checkoutStore.ts` — campo de origem do CEP fora de `draft()` (`:244-247`), no `partialize` (`:259-278`) e
  zerado por `reset()` (`:227-242`), no molde de `scope` (`:116`, `:177`, `:277`).
- `TrustBar.tsx:27`, `:48-50` (`apps/store/src/widgets/home-sections/ui/`); `AuthOverlay.tsx:49-52`
  (`apps/store/src/features/auth/ui/`); `ShippingCalc.tsx:21-80`, `:162-219`.
- Painel: `apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx:59-66` (salvar, título fixo da recusa
  em `:62`), `:85-118` (interruptor e faixa), `:43` (leitura crua).

**O que nasce**
- `packages/core/src/shipping/region.ts` — a região do CEP, as cinco regiões, rótulos, estados de cada uma, o rótulo
  "Sul e Sudeste"; folha sem import, molde de `pickup.ts`.
- `apps/store/src/shared/ui/InfoTip.tsx` — o ⓘ da loja (não há barril em `shared/ui`).
- `apps/store/src/features/checkout/lib/deliveryOptions.ts` — as opções de envio compartilhadas (lista, `free`, sem
  fallback para a gaveta, ressincronização do custo escolhido).
- `apps/store/src/features/checkout/ui/ShippingOptionCard.tsx` — o cartão compartilhado, exportado por
  `features/checkout/index.ts`.
- `apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx` — a faixa v2.
- `apps/store/src/widgets/cart-drawer/ui/CartShipping.tsx` — a prévia de frete da gaveta.
- Migration nova em `supabase/migrations/` (o prefixo é apurado na hora: o maior do worktree em 2026-11-14 é
  `20261130140000_102-…`), aditiva e idempotente, para `free_shipping_regions`.

**Exemplares**
| Tipo | Imite |
| ---- | ----- |
| Folha de `core` alcançável pelo Deno | `packages/core/src/shipping/pickup.ts` + `__tests__/pickup.test.ts` + `__tests__/denoReach.test.ts` |
| Recusa `string \| null` e estado com invariantes | `freeShipping.ts` › `freeShippingRefusal`, `freeShippingState`; `__tests__/freeShipping.test.ts` |
| Migration aditiva e idempotente em `store_settings.shipping` | `supabase/migrations/20261011120000_63-retirada.sql:36-39` + `storeSettingsDefaults.test.ts:494-575` |
| ⓘ com Popover | `apps/backoffice/src/widgets/store-movement/ui/StoreMovement.tsx` › `InfoVisitas` (`:49-72`) + `__tests__/infoGutter.test.tsx` |
| Campo de CEP + botão | `apps/store/src/features/shipping-calc/ui/ShippingCalc.tsx:91-120` |
| Cartão de opção | `DeliveryBlock.tsx:413-458` (domicílio), `:466-497` (retirada) |
| Campo fora do rascunho | `checkoutStore.ts` › `scope` (`:116`, `:177`, `:239`, `:277`) |
| Hook de `entities` recebendo valor da tela | `useCheckoutTotals.ts:212-224` |
| Interruptor e recusa no painel | `ShippingMaterialSection.tsx:163-178` + `AdminSettingsPage.test.tsx:743-848`, `:1175-1280` |
| Server passando config ao dono | `supabase/functions/checkout/proposal.ts:397-409` + `checkout/__tests__/proposal.test.ts:416` |
| Anúncio derivado da config | `TrustBar.tsx:48-50`, `AuthOverlay.tsx:50-52` |

**Obrigações transversais**
- `freeShippingSingleOwner.test.ts` (`apps/store/src/shared/lib/__tests__`): allowlist fechado de dois (`:244-254`,
  `:280-287`), âncora ≥ 7 de `useFreeShipping` (`:230`), nenhum valor cravado em copy (`:340`); passa a ter as réguas de
  região (D-05) e a varrer `supabase/functions`.
- `storeSettingsDefaults.test.ts`: bloco novo no molde da 63 (`:494-575`), com parser de lista (`campoAditivo`
  `:100-110` só lê escalar) e sensores com `mutar()` que lança.
- `denoReach.test.ts` (shipping): `ENTRADAS` (`:25`) inclui `region.ts`; comentários descrevem a forma proibida sem
  escrevê-la.
- `packages/core/src/proposals/__tests__/purity.test.ts`: `arrayContaining` aceita o arquivo a mais.
- `freeShipping.test.ts:84`, `:114`, `:123` (`toEqual` com a forma do estado): reescrever ganhando casos, nunca
  `toMatchObject`.
- `accentText.test.ts` (faixa ouro: `bg-estrelinha-accent` + `text-estrelinha-ink` sólido), `contrast.test.ts` e
  `arbitraryTextColor.test.ts` (só tokens; o balão com tokens `estrelinha-*`, não `bg-popover`), `touchTarget.test.ts` e
  `alvoDeToqueNaoRoubaPosicao.test.ts` (ⓘ, "Trocar CEP", chevron, opções), `fieldBorder.test.ts` (campo de CEP com
  `border-estrelinha-field`).
- Tom: sem "!", sem "infelizmente"; o "Faltam … para frete grátis!" de hoje (`CartDrawer.tsx:193`) sai.
- `strictNullChecks: false`: vereditos `string | null`; união por literal de string.
- Movimento: par `motion-reduce:` em toda transição nova da gaveta; o spinner pode girar.
- FSD: `widgets/cart-drawer` importa de `@/features/checkout` (barril) e `@/entities/*`; o frete entra em
  `useCartPromotion` por parâmetro.
- Nenhuma chave nova de storage (o CEP vai no `estrelinha-checkout`).
- Painel: `AdminSettingsPage.test.tsx` `CFG-13` (`:417`), `CFG-14` (`:363-397`), inventário (`:447-512`);
  `semAbaEmConfiguracoes`; `originZipNotRead` ("Melhor Envio" fica em `ShippingMaterialSection.tsx:180-183`).
- Migration só no banco local; ordem de publicação migration → functions (`checkout`, `mercado-pago`) → bundles.
- Fechar a feature: baselines, tabela dos guardas e os `CLAUDE.md` da loja, painel, core e supabase; "O que espera
  decisão da dona" (as regiões nascem com as cinco).
- `packages/core/src/payment/**` intocado.

**Testes** (vitest por workspace; layout em navegador)
- core (unidade): CEP → região nas bordas de cada faixa (inclusive RO, TO, DF/GO, MT, MS), máscara, inválido =
  desconhecida; rótulo das regiões; o estado (desligado nunca concede; cinco regiões sem CEP idêntico a hoje; limitado
  sem CEP abaixo diz quanto falta; acima sem CEP atingido e não concedido; SP/RS acima concedido; BA fora em qualquer
  subtotal; ausente = cinco; lista vazia = inativo); a recusa (ligado sem região; desligado sem região gravável); o
  leitor único da config; `proposalPricing` cobra com CEP fora e zera com dentro.
- functions (handler com dublê): `create-order` do pedido montado com CEP da BA e faixa alcançada grava o frete cotado,
  com SP zero; `create-payment` cobra o mesmo total (CA-21). Arquivos: `supabase/functions/checkout/__tests__/proposal.test.ts`,
  `supabase/functions/mercado-pago/__tests__/proposalCharge.test.ts`.
- loja (componente): a faixa nos quatro desenhos e a ausência de "liberado" sem CEP com regiões limitadas; o ⓘ (ponteiro,
  toque, Esc, fora, rótulo, texto da config); a prévia na gaveta (CA-01..CA-12 da 97 com M-06, CA-26); o checkout com a
  região (CA-17, CA-18) e o resumo; o checkout recebendo da gaveta (CA-09); TrustBar/AuthOverlay/ShippingCalc (CA-24).
- loja (integração, stores reais): o mesmo Total na gaveta e no checkout (CA-04, CA-16, CA-17).
- painel (página real): CA-20.
- guardas: `storeSettingsDefaults`, `freeShippingSingleOwner`, `denoReach`.
- Sem execução nesta etapa (ficam para a prova em navegador e para o probe local): o efeito da migration, o boot das
  functions, CA-13, CA-22 (balão dentro da largura), CA-23.

**Depende / Expõe**
- expõe `store_settings.shipping.free_shipping_regions` (`jsonb` array de slugs; ausente = as cinco), gravado pelo
  painel e lido pela loja e pelas functions.
- expõe `regionOfCep`/`freeShippingState(config, subtotal, destino)` alcançáveis pelo Deno.
- depende de `address_zip` do corpo do `create-order` e de `orders.address_zip` no `create-payment`.
- depende da cotação `melhor-envio?action=quote` pela gaveta.

## Fronteira entre repositórios

`nada`: topologia de repositório único (monorepo). Os contratos entre as pontas estão em Depende / Expõe.

## Cobertura dos UCs

| UC | Reivindicado por |
| -- | ---------------- |
| UC-01..UC-06 (97) | loja (gaveta, checkout) |
| M-01..M-03 | loja (gaveta, ⓘ) |
| UC-07..UC-09 | core (regra) + loja (faixa) |
| UC-10 | core + loja (checkout) + functions (pedido montado) |
| UC-11 | loja (TrustBar, AuthOverlay, ShippingCalc) |
| UC-12 | painel + migration |

## Decisões

| # | A pergunta | A resposta | Quem decidiu |
| - | ---------- | ---------- | ------------ |
| D-01 | Qual a forma do estado sem CEP? (PR-01) | `reached` continua "o valor atingiu a faixa". Nasce `destination: 'inside' \| 'outside' \| 'unknown'` e `granted = reached && (destino dentro, ou todas as regiões marcadas)`. Quem zera frete ou diz "liberado" lê `granted`. Com as cinco regiões, a faixa alcançada diz "Frete grátis liberado" mesmo sem CEP | o humano no gate do PRD Tech Review (PR-01 · `tech_prd_edit` · r1), inline a pedido |
| D-02 | Ausente × vazio × desconhecida (PR-02) | Campo ausente = as cinco. Lista vazia com o interruptor ligado = inativo, e a recusa ao salvar impede gravar. CEP incompleto/desconhecido: na tela, como sem CEP; no servidor, não concede quando as regiões são limitadas. Desligado com lista vazia é gravável | o humano no gate do PRD Tech Review (PR-02 · `tech_prd_edit` · r1), inline a pedido |
| D-03 | Config montada à mão perde as regiões (PR-03) | Um leitor único em `core/shipping` (`freeShippingConfigOf(raw)`) com interruptor, faixa e regiões, chamado por `checkout/proposal.ts`, `mercado-pago/handlers.ts`, `constants.ts`/`RuntimeSettingsLoader` e `useFreeShipping`; `proposalPricing` recebe `destinationCep` | o humano no gate do PRD Tech Review (PR-03 · `tech` · r1), inline a pedido |
| D-04 | Faixas de CEP por região (PR-08) | Tabela em `region.ts`: Sudeste 01000–39999; Sul 80000–99999; Nordeste 40000–65999; Norte 66000–69999, 76800–76999, 77000–77999, 78900–78999; Centro-Oeste 70000–76799, 78000–78899, 79000–79999; fora disso desconhecida. Slugs `norte`, `nordeste`, `centro-oeste`, `sudeste`, `sul`; rótulos "Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"; estados: Norte (AC, AP, AM, PA, RO, RR, TO), Nordeste (AL, BA, CE, MA, PB, PE, PI, RN, SE), Centro-Oeste (DF, GO, MT, MS), Sudeste (SP, RJ, MG, ES), Sul (PR, SC, RS) | o humano no gate do PRD Tech Review (PR-08 · `tech` · r1), inline a pedido |
| D-05 | O guarda do dono único com a região (PR-03, conflito 7 do lookup) | `freeShippingSingleOwner` passa a varrer também `supabase/functions` e a recusar `free_shipping_regions` fora do painel (`ShippingMaterialSection.tsx`), e faixa numérica de CEP por região escrita fora de `region.ts`; sensores para cada régua | a conferência |
| D-06 | O rótulo das regiões (PR-10) | Função em `core` (`region.ts`): com as cinco, sem região (o texto de hoje); com parte, "Sul e Sudeste" em ordem fixa (Sul, Sudeste, Centro-Oeste, Nordeste, Norte), "e" antes da última; e a frase da regra do ⓘ com os estados entre parênteses | o humano no gate do PRD Tech Review (PR-10 · `tech_prd_edit` · r1), inline a pedido |
| D-07 | Guarda de defaults com lista (PR-12) | Estender `storeSettingsDefaults` com parser de `jsonb_build_array`/`'[...]'::jsonb`, igual a `DEFAULT_SHIPPING.free_shipping_regions`, aditiva (`value \|\|`) e idempotente (`NOT value ? 'free_shipping_regions'`) | o humano no gate do PRD Tech Review (PR-12 · `tech` · r1), inline a pedido |
| D-08 | O título da recusa no painel e a leitura crua (PR-13) | O título do aviso de recusa vem do motivo de `freeShippingRefusal`; as caixas leem as regiões pelo leitor único (padrão as cinco) | o humano no gate do PRD Tech Review (PR-13 · `tech` · r1), inline a pedido |
| D-09 | O ⓘ: Tooltip não abre ao toque, Popover não abre ao ponteiro (PR-15) | `InfoTip` na loja sobre o `Popover` do `@estrelinha/ui`, controlado: abre em `pointerenter` (ponteiro `mouse`), fecha em `pointerleave`, clique/toque alterna, foco abre, Esc e fora fecham; `collisionPadding={16}`, largura `w-[min(18rem,calc(100vw-32px))]`, tokens `estrelinha-*`, `TAP_44` sem `absolute` | o humano no gate do PRD Tech Review (PR-15 · `tech` · r1), inline a pedido |
| D-10 | A cidade no ⓘ (PR-17) | `useCepLookup` na gaveta; a UF da busca nunca decide a região (dono `region.ts`); a busca falhando, o ⓘ e o cabeçalho saem sem a cidade | o humano no gate do PRD Tech Review (PR-17 · `tech` · r1), inline a pedido |
| D-11 | Perguntas 1–4 da 97 | (1) vale o CEP da gaveta; se igual ao do endereço salvo, entra o endereço salvo inteiro (número e complemento) e o bloco abre recolhido como hoje; (2) a gaveta marca a mais barata e leva a escolha ao checkout; (3) `add_shipping_info` não é emitido na gaveta; (4) o CEP da página do produto fica fora | o humano no gate do PRD Tech Review, inline a pedido (recomendação do PRD 97) |
| D-12 | CA-18 × RN-09: trocar o CEP desfaz a escolha, então o Total primeiro cai (conflito 2 do lookup) | Mantém RN-09. CA-18 se cumpre assim: trocar SP → BA desfaz a escolha; a mais barata deixa de sair "Grátis" e, escolhida, o Total soma o frete, sem recarregar. Na gaveta, o novo cálculo já marca a mais barata (D-11) | a conferência (handoff inline a pedido) |
| D-13 | Ressincronização do custo escolhido quando a sacola muda ou a faixa é cruzada (incerteza do lookup) | O custo gravado em `shipping` acompanha a opção escolhida a cada cotação/estado novo (UC-05: "com o preço novo"), pela mesma função de `deliveryOptions`, na gaveta e no bloco Entrega; a opção sumiu ⇒ volta à mais barata na gaveta, e no checkout desfaz como hoje | a conferência (handoff inline a pedido) |
| D-14 | Nome do campo de origem do CEP no rascunho | `cepOrigin: 'sacola' \| null`, fora de `draft()`, no `partialize`, zerado por `reset()` e quando o CEP é digitado no checkout | a conferência |
| D-15 | Slug e caminho da migration | `supabase/migrations/<próximo prefixo livre>_99-frete-gratis-por-regiao.sql`; `value \|\| jsonb_build_object('free_shipping_regions', '["norte","nordeste","centro-oeste","sudeste","sul"]'::jsonb)` onde `key = 'shipping' and not value ? 'free_shipping_regions'` | a conferência |
| D-16 | Página do produto e faixa de avisos (PR-06, PR-07) | `ShippingCalc` não zera nem risca frete: com o frete grátis ativo, uma linha de texto com a faixa e a região (sem região com as cinco); a faixa de avisos fica fora | o humano no gate do PRD Tech Review (PR-06, PR-07 · `negocio` · r1), inline a pedido |
| D-17 | O cupom de frete grátis e a lista de sugestões (PR-04, PR-09) | Cupom de frete grátis vale em qualquer região; com ele aplicado, a faixa some. A lista "Complete o frete grátis" some e não busca catálogo com CEP fora | o humano no gate do PRD Tech Review (PR-04, PR-09 · `negocio` · r1), inline a pedido |
| D-18 | `cartStore.shippingCost` sem CEP | Fica sem CEP e lê `granted` (com regiões limitadas nunca zera sem destino) | a conferência |
| D-19 | A gaveta dentro de `/checkout` escreve no mesmo `address.cep` | Sem disputa: o CEP tem um dono (o rascunho); o campo da gaveta mostra o valor do rascunho e grava por `setAddress` | a conferência |
| D-20 | O cartão de opção no checkout (premissa da T06) | O `ShippingOptionCard` é `role="radio"` com `aria-checked` e título "PAC · Correios" também no checkout; o resumo do bloco fechado e a linha do `OrderSummary` seguem "Correios PAC" | a corrida (T06), registrado na Validation |
| D-21 | Quando a gaveta marca a mais barata (premissa da T09) | Só quando o CEP foi calculado na gaveta (`cepOrigin === 'sacola'`); com CEP digitado no checkout e 2+ opções, abrir a sacola não escolhe nada; com a cotação em falha, a gaveta não apaga escolha vinda do checkout nem o "Frete padrão" | a corrida (T09, revisão), registrado na Validation |
| D-22 | A ordem gravada das regiões (premissa da T03) | Padrão e migration na ordem de `core` (`sul, sudeste, centro-oeste, nordeste, norte`); o painel mostra as caixas na ordem Norte…Sul | a corrida (T03), registrado na Validation |
| D-23 | Lista com só slugs inválidos (premissa da T01) | Fica vazia ⇒ frete grátis inativo (o lado que não concede) | a corrida (T01), registrado na Validation |

## Não resolvido

- **PR-11** — `proposalPricing` zera qualquer opção escolhida no pedido montado, e o bloco Entrega só a mais barata.
  Divergência anterior a este item; fica fora como dívida.
- **Pergunta 2 da 99** — o pedido comum não confere o frete no servidor (`checkout/handlers.ts:384`,
  `mercado-pago/handlers.ts:850`); fora, como dívida da família `BL-030`.
- **A faixa 78900–78999** foi atribuída a Norte (RO) por `[conhecimento]`; não há fonte dos Correios no repositório.
  Não toca a campanha (Sul e Sudeste).
- **O balão do ⓘ dentro do `Sheet`** (Portal × Dialog modal, `collisionBoundary`): a confirmar em navegador (CA-22).
