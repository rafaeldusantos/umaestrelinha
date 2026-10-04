# 59 · Minha Conta V2 — Validation

**Date**: 2026-10-04
**Spec**: `.specs/features/59-minha-conta-v2/spec.md` (69 ACs; `DET-01` na redação de 2026-10-04)
**Diff range**: working tree não commitada sobre `6e57219` (nenhum commit da feature existe)
**Verifier**: sub-agente independente (autor ≠ verificador). Leu spec, context, design, tasks; mediu os gates; rodou probe SQL próprio no banco local; injetou 35 mutações nos arquivos reais.

**Fora do escopo (outra sessão, mesma working tree)**: `.gitignore`, `package.json`, `.specs/qa/**`,
`features/checkout/ui/CardPaymentBrick.tsx` (+ teste), `pages/CheckoutPage.tsx` (+ teste).

---

# Rodada 2 — 2026-10-04

**Verifier**: o mesmo sub-agente independente da rodada 1 (autor ≠ verificador). Não corrigiu código nem teste.
Remediu os gates, re-derivou a cobertura dos seis consertos, re-rodou o arnês da rodada 1 e injetou
24 mutações novas contra os consertos.

## Veredito: ✅ PASS

Os seis itens da rodada 1 estão consertados e provados por asserção. M22 — o único sobrevivente da
rodada 1 — tem agora seis mutações irmãs (N01–N06), e as seis morrem. Das 58 mutações não
equivalentes da rodada 2, **57 morreram por asserção, 0 por compilação, 1 sobreviveu (N23)** — e
N23 é uma fraqueza **herdada do molde** do guarda de movimento, sobre um caso que não existe no
código (ver abaixo), não uma lacuna sobre AC. Não bloqueia.

## Gates (rodada 2)

Cada workspace sozinho, exit code fora de pipe, `--testTimeout=20000` sem `--` nos dois apps.

| Medida | Baseline (`CLAUDE.md`) | Rodada 1 | **Rodada 2** | Resultado |
| --- | --- | --- | --- | --- |
| core | 2459/97 | 2546/102 | **2546/102** | ✅ exit 0 |
| functions | 660/14 | 674/14 | **674/14** | ✅ exit 0 |
| store | 3787/232 | 4199/250 | **4209/251** | ✅ exit 0 (+10/+1: guarda novo 6, `MAT-05` 2, `MobileNav` 2) |
| backoffice | 3024/166 | 3024/166 | **3024/166** | ✅ exit 0 |
| `tsc` store · backoffice | 0 · 0 | 0 · 0 | **0 · 0** | ✅ (log só com avisos do npm) |
| Lint | 26/6 | 26/6 | **26/6** (bo 24/4 · store 2/2) | ✅ (`turbo` sai 1 pela baseline do backoffice) |
| `packages/core/src/payment/**` | intocado | vazio | **`git diff --name-only` e `status --porcelain` vazios** | ✅ |

O número do store bate exatamente o que o orquestrador mediu (4209/251).

## Os seis consertos — evidência

| # | Item | Evidência | |
| --- | --- | --- | --- |
| 1 | `MAT-05` | `useSetMaterialTracking.ts:75-84` invalida `['orders','id',orderId]` **e** o prefixo `['orders','customer']` só com `resultado.ok`. `useSetMaterialTracking.test.tsx` describe "MAT-05": régua de **estado do cache** (`getQueryState(key).isInvalidated`), não "o método foi chamado" — o pedido certo e a lista `['orders','customer','c-1']` ficam `true`, **outro pedido fica `false`**, recusa deixa os dois `false`. A chave da lista conferida contra o dono: `useOrdersByCustomerId` usa `['orders','customer', customerId]` (`useOrders.ts:66`) e é a única lista lida pela conta (`AccountPage.tsx:118`). O resto da cadeia já estava provado: `orderActionState(material_enviado) === null` (`orderActionState.test.ts:48`) e `accountAttention` descarta `material_enviado` (`attention.test.ts:75`). N01–N06 mortos | ✅ |
| 2 | `DET-01` | `spec.md:148` agora diz `paid_at`, com o motivo (`STO-01`). `confirmationHeadline` (`orderMeta.ts:60-67`) implementa exatamente a letra: enviado/entregue/cancelado → nada; `refunded` → nada; senão `paid_at ? 'pago' : 'registrado'`. `orderMeta.test.ts:54-86` cobre os quatro cortes e o caso `approved` sem `paid_at`; a página (`OrderConfirmationPage.test.tsx:111, 291, 769-797`) cobre "É nosso!", "Pedido registrado", os três status sem subtítulo e o reembolso. A linha 64 da spec (`payment_status` para "Pago") é a régua do **selo** (`SIT`), não do subtítulo — as duas convivem sem contradição porque o `DET-01` diz por extenso a exceção. N07–N14 e P01 mortos | ✅ |
| 3 | `DET-09` | `OrderMaterialBlock.tsx:110-119`: `<h2>` "Seu material". `OrderConfirmationPage.test.tsx:474-475` assere o heading por papel+nome e a **ausência** do título antigo; `:452-453, 622-625` cobrem o inverso (material no topo → bloco de baixo ausente). N15 (texto antigo) e N16 (texto fora do heading) mortos | ✅ |
| 4 | `ACB-03` | `movimentoDaContaRespeitaMovimento.test.ts`: 14 arquivos literais (conferidos: são exatamente os 14 `.tsx` de UI novos/reescritos da feature, fora `App.tsx` e `MobileNav.tsx`), CRLF normalizado, linha e bloco na mesma passada, sensores (sem par, variante, outra linha, token exato, prosa com CRLF/LF/glob). Recontado pelo verificador com a mesma régua: **52 tokens, 26 pares, 0 sem par**. N19–N22 mortos | ✅ com 2 notas (abaixo) |
| 5 | comentário de `numeroDoPedidoComDonoUnico.test.ts` | `:284-287` agora diz que a montagem **não** é cobrada ali e aponta onde é (`pagamentoComDonoUnico`, `AccountPage.test.tsx`) — afirmação verdadeira (M19/M20/M27 mortos por esses arquivos) | ✅ |
| 6 | `MobileNav` em `/conta/dados` | `MobileNav.tsx:44-46`: `=== '/conta' \|\| startsWith('/conta/')`. `MobileNav.test.tsx:83-93`: `/conta/dados` acende; `/contato` não. N17 (prefixo cru) e N18 (regra antiga) mortos | ✅ |

### Notas sobre o guarda do `ACB-03` (não bloqueiam)

- **N23 sobreviveu, e é herança do molde**: `movimentoSemPar` descarta qualquer linha que contenha
  `motion-reduce:` (`.filter(a => !a.linha.includes('motion-reduce:'))`) — então
  `transition-colors motion-reduce:opacity-100` passa, com um par que não desliga movimento nenhum.
  O guarda do painel (`animacaoRespeitaMovimento.test.ts:137`) tem a mesma linha. No código de hoje
  os 26 pares são todos `transition-none`/`animate-none` (recontado), então é risco futuro, não
  defeito presente.
- **A âncora mede metade do que existe, e o comentário afirma uma medida que não é a do disco**:
  "Medido no fecho da feature: 26 tokens, 13 deles o próprio par", com `>= 26`/`>= 13`. Recontado
  com a mesma régua: **52 tokens / 26 pares**. A âncora segue útil contra varredura vazia, mas
  deixaria passar a perda de metade dos tokens — e é comentário afirmando uma medida falsa, a mesma
  classe do item 5.
- N22 (o par movido para outra linha dentro de um `cn(...)`) é recusado — rigidez declarada pelo
  guarda ("o par a três linhas não cobre nada"), não falso positivo acidental.
- Fora do escopo do `ACB-03` ("telas novas"): `MobileNav.tsx:30` tem `transition-colors` sem par,
  de antes da feature. A `59` mexeu no arquivo, mas não na linha.

## Re-checagem dos ACs parciais da rodada 1

| AC | Rodada 1 | Rodada 2 |
| --- | --- | --- |
| MAT-05 | ❌ | ✅ (item 1) |
| DET-01 | ⚠️ divergência | ✅ (spec e código concordam: `paid_at`) |
| DET-09 | ⚠️ deviation | ✅ (copy "Seu material") |
| ACB-03 | ⚠️ parcial | ✅ (guarda; notas acima) |
| LST-04 | ⏳ navegador | ⏳ navegador (inalterado) |

**Placar**: 68/69 ✅ · 1 ⏳ (`LST-04`, só navegador) · 0 ❌.

## Discrimination Sensor — rodada 2

Mesmo arnês (`sensor.mjs`: lança se o alvo some, restaura e compara byte a byte, classifica asserção × compilação). Todas as restaurações byte-idênticas; `git status --short` depois do sensor: 87 entradas, nenhuma nova além das da feature e da outra sessão.

### Mutações novas contra os consertos

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| N01 | `useSetMaterialTracking.ts` | sem invalidar o pedido (o antigo M22) | ✅ asserção |
| N02 | idem | sem invalidar a lista da conta | ✅ asserção |
| N03 | idem | lista → `['orders','email']` (chave errada) | ✅ asserção |
| N04 | idem | pedido → `['orders','id']` (todos os pedidos) | ✅ asserção ("outro pedido" deixa de ser `false`) |
| N05 | idem | sem o `if (!resultado.ok) return` (recusa invalida) | ✅ asserção |
| N06 | idem | id errado na chave | ✅ asserção |
| N07 | `orderMeta.ts` | `delivered` fora do corte | ✅ asserção (2) |
| N08 | idem | `cancelled` fora do corte | ✅ asserção (2) |
| N09 | idem | `shipped` fora do corte | ✅ asserção (2) |
| N10 | idem | sem o corte de `refunded` | ✅ asserção (2) |
| N11 | idem | `paid_at` → `payment_status === 'approved'` | ✅ asserção (3) |
| N12 | idem | sempre `'pago'` | ✅ asserção (4) |
| N13 | idem | literal "Pedido registrado" trocado | ✅ asserção (2) |
| N14 | `OrderConfirmationPage.tsx` | subtítulo não renderizado | ✅ asserção (3) |
| N15 | `OrderMaterialBlock.tsx` | título volta a "Material da sua joia" | ✅ asserção |
| N16 | idem | "Seu material" fora do `<h2>` | ✅ asserção |
| N17 | `MobileNav.tsx` | `startsWith('/conta')` sem barra | ✅ asserção (`/contato`) |
| N18 | idem | regra antiga (só `=== '/conta'`) | ✅ asserção |
| N19 | `OrderList.tsx` | par `motion-reduce:` removido | ✅ asserção (guarda) |
| N20 | `AddressCard.tsx` | par do `animate-pulse` removido | ✅ asserção (guarda) |
| N21 | `AccountPage.tsx` | par do `ITEM_NAV` removido | ✅ asserção (guarda) |
| N22 | `AddressCard.tsx` | par movido para outra linha de um `cn()` | ✅ asserção (rigidez declarada) |
| **N23** | `OrderList.tsx` | par trocado por `motion-reduce:opacity-100` | ❌ **sobreviveu** — herança do molde (nota acima) |
| N24 | `OrderMaterialBlock.tsx` | selo fixo em `MATERIAL_STATUS_LABELS['material_recebido']` | ✅ asserção ("Aguardando material") |

### Arnês da rodada 1, re-rodado

M01–M10, M12–M21, M23–M32, M11b, M11c, P01: **34/34 mortos por asserção** (M22 substituído por N01 — o alvo mudou de texto; M11 segue equivalente e fora da conta). P01, que na rodada 1 era sonda de alinhamento, agora é mutação de falha: a spec diz `paid_at`.

**Total**: 58 mutações não equivalentes · **57 mortas por asserção** · 0 por compilação · **1 sobrevivente (N23)**, fora de AC.

## Buracos criados pelos consertos — procurados

- **Invalidação por prefixo**: `['orders','customer']` alcança a lista de qualquer cliente no cache
  — inofensivo (um navegador tem uma sessão). `useOrdersByEmail` (`['orders','email',…]`) não é
  invalidado, e não precisa: não tem consumidor nenhum em `apps/store` (código morto, de antes).
- **Mover a regra do subtítulo para `paid_at`** não deixou ramo descoberto: os quatro cortes, o
  reembolso com `paid_at` e o `approved` sem `paid_at` têm caso próprio (N07–N12).
- **Trocar o título do bloco** não quebrou o inverso: com o material no topo, o bloco de baixo
  continua provadamente ausente pelo heading novo **e** pelo antigo.
- **"Material a caminho" literal** não tem asserção no bloco — o selo é provado por
  `MATERIAL_STATUS_LABELS[status]` em dois estados (N24 morto). Dono único em `core`, aceitável.

## Pendências que só o navegador prova (inalteradas)

As sete da rodada 1 continuam, menos a 7ª (o `MobileNav` em `/conta/dados`, agora provado em
unidade). Em 390×844 e 1440×900: `scrollWidth ≤ 390` em `/conta`, `/conta/dados`, `/pedido/:id`
(`LST-04`); `truncate` do número e avatar sem encolher; lateral de 264 e pendências lado a lado em
1440; bolha sobre o último bloco com `pb-36`; o link do Melhor Rastreio abrindo a página do pacote
(premissa); ≤ 2 toques da conta até "Gerar novo PIX"/"Enviar código"; e, novo, a reprodução de
`MAT-05` de ponta a ponta (gravar o código e ver a pendência sumir da conta ao voltar).

---

# Rodada 1 (histórico)

## Veredito: ❌ FAIL — 1 mutante sobrevivente sobre AC em escopo (`MAT-05`), mais 3 itens menores a decidir

Os gates estão todos na baseline ou melhores, o código da `59` é sólido, e 32 de 33 mutações não
equivalentes morreram **por asserção** (zero mortes por compilação). O FAIL vem de **uma** lacuna de
discriminação real e de uma divergência literal não declarada contra a spec. Nenhuma das duas exige
redesenho.

---

## Gate Check

Cada workspace rodado sozinho, exit code capturado fora de pipe, `--testTimeout=20000` (sem `--`) nos dois apps.

| Medida | Baseline (`CLAUDE.md`) | Medido agora | Delta | Resultado |
| --- | --- | --- | --- | --- |
| core | 2459/97 | **2546/102** | +87/+5 | ✅ exit 0 |
| functions | 660/14 | **674/14** | +14 | ✅ exit 0 |
| store | 3787/232 | **4199/250** | +412/+18 | ✅ exit 0 |
| backoffice | 3024/166 | **3024/166** | 0 | ✅ exit 0 |
| catalog-import | 512/23 | não remedido | — | não tocado pela feature |
| `tsc` store · backoffice | 0 · 0 | **0 · 0** | — | ✅ |
| Lint | 26/6 (bo 24/4 · store 2/2) | **26/6** (bo 24/4 · store 2/2) | 0 | ✅ nenhum achado em arquivo da `59` |
| `packages/core/src/payment/**` | intocado | `git diff --name-only` e `status --porcelain` vazios | — | ✅ |
| `podePagarComPix.ts` (`PEN-08`) | intocado | sem diff | — | ✅ |

- O `turbo run lint` parou no backoffice (exit 1 por baseline); o store foi medido à parte: 2 erros/2 avisos, os mesmos da baseline (`ShareButtons`, `ShippingCalc`, `ProductInfo`).
- **O store inclui trabalho da outra sessão.** O fecho da T28 registrou 4186/250; os +13 entre 4186 e 4199 coincidem com os arquivos de checkout fora de escopo. O delta atribuível à `59` é ≈ +399/+18.
- **Quedas de contagem, todas declaradas e com contrapartida**: `OrderTimeline.test.tsx` (14) apagado → os 14 reaparecem marcados "(herdado)" em `OrderJourney.test.tsx`; `features/checkout/api/__tests__/useCepLookup.test.tsx` (7) **movido** para `entities/address/api/__tests__/` (mesma contagem).
- **Falhas externas citadas no pedido**: `brandScan.test.ts` (sobre `CardPaymentBrick.test.tsx`, outra sessão) e `situacaoComDonoUnico.test.ts` (sobre `orderMeta.ts`) estão **verdes** na árvore atual. As chaves de `CONFIRMATION_HEADLINES` são `pago`/`registrado`.
- `CLAUDE.md` ainda não tem as baselines novas (a linha da `59` diz que ela "ainda não foi" fechada). Isso é tarefa do fecho, não falha.

---

## Probe SQL independente (banco local, transação com `ROLLBACK`)

Feito pelo verificador, não copiado das notas da T05. Objetos conferidos em `pg_proc`/`pg_trigger`/`pg_indexes`: `customer_order_events` com `prosecdef = t` e `search_path=""`; `guard_customer_identity` com `prosecdef = f`; índice `... (customer_id) WHERE is_default`; `has_function_privilege`: `anon` = **f**, `authenticated` = **t**. Base: 0 pedidos `NP-%`, 35 `NS-%` (renumeração já aplicada; os `NS-` intactos).

| Como | Ação | Resultado |
| --- | --- | --- |
| `authenticated` (cliente comum, `sub` = dona do pedido) | `customer_order_events(pedido dela)` | 2 linhas (`pending,shipped`), sem `note` |
| idem | `customer_order_events(pedido de outra)` / `(uuid inexistente)` | **0 / 0** linhas |
| idem | `update customers set email` | ❌ `O e-mail de acesso nao pode ser alterado por aqui.` |
| idem | `update customers set user_id` | ❌ recusado (FK; o gatilho tem a régua própria, provada pelo guarda) |
| idem | `update set name, phone` | ✅ 1 linha |
| idem | `cpf` vazio → preenchido | ✅ 1 linha |
| idem | `cpf` preenchido → outro | ❌ `O CPF ja informado nao pode ser alterado por aqui.` |
| `authenticated` **admin** (`has_role`) | trocar e-mail e CPF | ✅ 1 linha |
| `service_role` | trocar e-mail e CPF | ✅ 1 linha |
| `anon` | `customer_order_events(...)` | ❌ `permission denied for function customer_order_events` |
| postgres | 2º endereço `is_default` da mesma cliente | ❌ `duplicate key ... addresses_one_default` |

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ coberto com asserção no resultado da spec · ⚠️ parcial / divergência / só navegador · ❌ gap.
Caminhos curtos: `core/` = `packages/core/src/orders/__tests__/`; `fn/` = `supabase/functions/checkout/__tests__/`; demais relativos a `apps/store/src/`.

### P1 — Situação (SIT)

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| SIT-01..09 | os 9 literais, primeira regra vence | `core/situation.test.ts:21-80` — `expect(orderSituation(...).label).toBe('Cancelado'…'Aguardando pagamento')`; ordem entre regras `:90-135` (M01, M02 mortos) | ✅ |
| SIT-10 | fora do vocabulário → "Aguardando pagamento", sem lançar | `core/situation.test.ts:139-157` | ✅ |
| SIT-11 | um dono em `core`; guarda recusa 2ª tabela em `apps/store/**` | `shared/lib/__tests__/situacaoComDonoUnico.test.ts:157-174` (âncora dupla), `:221-281` (duas formas, sensores, inverso); M29 (tabela injetada em `OrderList.tsx`) morto | ✅ — nota: as pendências não desenham selo, então "chamada pelas pendências" é vácua, sem segunda tabela |
| SIT-12 | " · chega até 8 out" / " em 12 ago" (1º `delivered`) | `core/situation.test.ts:211-257`; `entities/order/ui/__tests__/OrderSituationBadge.test.tsx:137-153` | ✅ |
| SIT-13 | régua do Paper, ≥ 4,5:1, zero `yellow/blue/purple/green/red-*` | `OrderSituationBadge.test.tsx:18-109`; `shared/lib/__tests__/contrast.test.ts:180-202`; `pages/__tests__/AccountPage.test.tsx:367-376` | ✅ — nota: `border-l-[#A6534F]` cru em `AttentionList.tsx:50` e `OrderActionPanel.tsx:175,190` (borda, não texto; nenhum guarda o alcança) |

### P1 — Lista da conta (LST)

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| LST-01 | saudação · abas (contagem) · atenção · lista, nessa ordem | `AccountPage.test.tsx:171-196` — `compareDocumentPosition` nos 4; `pedidos.textContent === 'Pedidos2'` | ✅ |
| LST-02 | miniatura 56, "Pedido {n}", "2 out 2026 · 1 peça", selo, total; linha = link, ≥ 44 | `widgets/order-list/ui/__tests__/OrderList.test.tsx:38-59`; página real `AccountPage.test.tsx:208-216` (M20, M27 mortos) | ✅ |
| LST-03 | `formatOrderNumber`, Outfit 600 16, `truncate`, sem empurrar o total | `OrderList.test.tsx:61-74` (`truncate`/`font-body`/`text-base`/`font-semibold`, `minmax(0,1fr)`, `whitespace-nowrap`) | ✅ forma · ⚠️ o corte só em navegador |
| LST-04 | `body.scrollWidth ≤ 390` | — (jsdom = 0) | ⚠️ **pendente de navegador** |
| LST-05 | avatar 48 sem encolher; e-mail `truncate` | `AccountPage.test.tsx:220-230` | ✅ forma |
| LST-06 | "Você ainda não fez nenhum pedido." + Home | `OrderList.test.tsx:126-131`; `AccountPage.test.tsx:312-318` | ✅ |
| LST-07 | esqueleto de 3 linhas, sem "Carregando" | `OrderList.test.tsx:133-139`; `AccountPage.test.tsx:292-299` | ✅ |
| LST-08 | erro + "Tentar de novo", nunca lista vazia | `entities/order/api/__tests__/useOrders.test.tsx` (rejeita, `message === 'timeout'`; M10 morto); `OrderList.test.tsx:141-151`; `AccountPage.test.tsx:301-310` (`refetch` chamado) | ✅ |
| LST-09 | sem sessão abre login com retorno | `AccountPage.test.tsx:112-117, 274-288` | ✅ |
| LST-10 | ≥1024: lateral 264, pendências lado a lado, colunas | `AccountPage.test.tsx:321-351`; `OrderList.test.tsx:96-122` (celular **e** `lg`, positivas); `AttentionList.test.tsx:317-323` (`grid-cols-1` + `lg:grid-cols-2`) | ✅ forma · layout real em navegador |

### P1 — Precisa da sua atenção (PEN)

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| PEN-01 | "Aguardamos o seu material", nº, 1ª peça que exige; "Informar código de envio" → `#material`; "Como enviar" | `entities/order/lib/__tests__/attention.test.ts:56-76`; `widgets/order-attention/ui/__tests__/AttentionList.test.tsx:221-240` (M25, M31 mortos) | ✅ |
| PEN-02 | "Pagamento pendente", valor, "Pagar com PIX" → `orderPaymentPath` | `AttentionList.test.tsx:242-251`; `attention.test.ts:78-88` | ✅ |
| PEN-03 | expirado/recusado ≤ 7 d → título por motivo, valor, "Gerar novo PIX" | `AttentionList.test.tsx:253-272`; `attention.test.ts:90-99` | ✅ |
| PEN-04 | > 7 d → "O pagamento não foi concluído" + WhatsApp, nenhum botão de PIX em tela nenhuma | conta `AttentionList.test.tsx:274-291`; detalhe `pages/__tests__/OrderConfirmationPage.test.tsx:649-666` (M23 morto) | ✅ |
| PEN-05 | função pura com constante; 6d23h oferece, 7d1min não | `core/repix.test.ts:24-40` (M03 morto pela fronteira de 7 d exatos) | ✅ |
| PEN-06 | pagamento antes de material; mais antiga primeiro | `attention.test.ts:135-151` (M06 morto) | ✅ |
| PEN-07 | sem pendência, bloco inteiro ausente | `AttentionList.test.tsx:327-337` (`toBeEmptyDOMElement`); página `AccountPage.test.tsx:198-206` (M19 morto) | ✅ |
| PEN-08 | `podePagarComPix` intocado; regra irmã | sem diff em `podePagarComPix.ts`; `core/repix.test.ts:63-66` | ✅ |

### P1 — Detalhe do pedido (DET)

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| DET-01 | "Meus pedidos" só com sessão; h1 "Pedido #N" uma vez; "Feito em …"; selo; subtítulo "É nosso!" quando **`payment_status = 'approved'`** e não enviado/cancelado; "Pedido registrado" sem aprovação; nada depois | `OrderConfirmationPage.test.tsx:192-232, 532-586, 762-791` (M07, M28 mortos) | ⚠️ **divergência não declarada**: o predicado é `paid_at`, não `payment_status`. `entities/order/lib/__tests__/orderMeta.test.ts:81` assere **o contrário da letra da spec** ("approved sem paid_at não é 'É nosso!'"), e a sonda P01 (trocar para `payment_status === 'approved'`) **é derrubada** por 3 casos. A justificativa (`orderMeta.ts:119-121`: andar junto com a frase de e-mail do `STO-01`) é boa, mas está só no código |
| DET-02 | 1º bloco depois do título = estado que pede ação, um só | `OrderConfirmationPage.test.tsx:593-695` (`header.nextElementSibling`); `widgets/order-action/lib/__tests__/orderActionState.test.ts:27-97`; `ui/__tests__/OrderActionPanel.test.tsx:79-184` (M23, M32 mortos) | ✅ |
| DET-03 | cartão "Rastreio do pacote", código, transportadora, "Acompanhar entrega" (nova aba), "Copiar" + aviso | `entities/order/ui/__tests__/OrderTrackingCard.test.tsx:41-120`; página `OrderConfirmationPage.test.tsx:698-706` | ✅ · ⚠️ URL do Melhor Rastreio é premissa |
| DET-04 | sem código, sem cartão | `OrderTrackingCard.test.tsx:32`; `OrderConfirmationPage.test.tsx:708-713` | ✅ |
| DET-05 | as etapas, com material só quando exige | `entities/order/ui/__tests__/OrderJourney.test.tsx:47-64`; `core/journey.test.ts:38-63` | ✅ |
| DET-06 | data da fonte de cada etapa, 1º registro, nunca `updated_at` | `core/journey.test.ts:169-218`; `OrderJourney.test.tsx:128-166` (M04 morto) | ✅ |
| DET-07 | "Previsão: entre {min} e {max}" / um dia | `OrderJourney.test.tsx:171-222` | ✅ |
| DET-08 | cancelado → "Pedido cancelado" com data do `cancelled` | `OrderJourney.test.tsx:227-250`; página `OrderConfirmationPage.test.tsx:668-683` (aparece **uma** vez; M32 morto) | ✅ |
| DET-09 | bloco **"Seu material"**, selo de `MATERIAL_STATUS_LABELS`, código, `#material` | `widgets/order-material/ui/__tests__/OrderMaterialBlock.test.tsx:273-287` (âncora nas duas formas); selo e código nos casos da feature 22 (`:166-188`) | ⚠️ **SPEC_DEVIATION declarada**: o título continua "Material da sua joia" (`OrderMaterialBlock.tsx:115`) |
| DET-10 | peças: miniatura, nome, opções sem separador solto, qtd, gravação, valor; resumo que soma, rótulo do cupom | `entities/order/ui/__tests__/OrderItemsSummary.test.tsx:53-179` (soma provada como propriedade, `:130-155`) | ✅ |
| DET-11 | forma de pagamento + data; endereço do snapshot em linhas; CEP sem quebrar | `entities/order/ui/__tests__/OrderPaymentDelivery.test.tsx:30-88` (5 formas + desconhecida) | ✅ |
| DET-12 | "Alguma dúvida…" + "Conversar" com o nº; some sem número | `widgets/order-help/ui/__tests__/OrderHelp.test.tsx:23-53`; página `OrderConfirmationPage.test.tsx:741-759`; `shared/lib/__tests__/whatsapp.test.ts:8-27` (M18 morto) | ✅ |

### P1 — Código do material (MAT)

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| MAT-01 | "Envie o seu material", "Código de rastreio do envio", "Enviar código", "Como embalar e enviar o material" | `OrderMaterialBlock.test.tsx:202-212`; página `OrderConfirmationPage.test.tsx:605-624` | ✅ |
| MAT-02 | RPC `set_material_tracking`, nenhum gravador novo | `OrderMaterialBlock.test.tsx:214-227` (`rpc` chamado com `p_order_id`/`p_code`; `from` nunca) | ✅ |
| MAT-03 | vazio/espaço não vai à rede; "Informe o código de rastreio." | `OrderMaterialBlock.test.tsx:229-245` (M09 morto) | ✅ |
| MAT-04 | frase de `materialTrackingMessage`, texto continua | `OrderMaterialBlock.test.tsx:247-260` (M24 morto) | ✅ |
| MAT-05 | gravou → estado do topo sai, bloco mostra "Material a caminho" + código, pendência some na próxima leitura | `OrderMaterialBlock.test.tsx:262-270` só assere `campo === ''` | ❌ **GAP** — **M22 sobreviveu**: apagar `qc.invalidateQueries(['orders','id',orderId])` de `useSetMaterialTracking.ts:78` deixa os 92 casos dos três arquivos relevantes verdes. Nenhum teste prova que o pedido é relido, que o topo sai ou que "Material a caminho" aparece. E a chave da lista da conta (`['orders','customer',id]`) não é invalidada por ninguém — a "próxima leitura" depende do `staleTime` |
| MAT-06 | sem sessão, sem campo; "Para informar o código, fale com a gente" + WhatsApp | `OrderMaterialBlock.test.tsx:289-327` (duas formas, inverso; M08 morto) | ✅ |

### P1 — Datas da linha do tempo (LIN)

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| LIN-01 | `security definer`, `search_path` vazio, só `status`+`created_at`, só da dona | `shared/lib/__tests__/minhaContaSchema.test.ts:250-310`; **probe SQL** acima; loja `entities/order/api/__tests__/useOrder.test.tsx` (`rpc('customer_order_events', { p_order_id })`; M11c morto) | ✅ |
| LIN-02 | alheio e inexistente → 0 linhas | **probe SQL** (0 / 0) | ✅ |
| LIN-03 | `grant` a `authenticated`, `revoke` de `anon`/`public`, sem `note`/`created_by`; guarda do disco | `minhaContaSchema.test.ts:259-335` (M12 morto); probe (`anon` sem `execute`) | ✅ |
| LIN-04 | `get-order` devolve os mesmos eventos, mesmo formato | `fn/getOrder.test.ts` bloco "os eventos da linha do tempo" — dublê-função que **enxerga** o `.eq('order_id')`, ordem, sem colunas internas, recusa sem leitura (M17, M30 mortos); loja `useOrder.test.tsx` (convidada) | ✅ |
| LIN-05 | uma montagem pura em `core`, chamada pelos dois caminhos | `core/journey.ts` + `OrderJourney.tsx`; `useOrder` normaliza os dois para `status_events` (M11b morto: falha da RPC vira `[]`) | ✅ |

### P2 — Meus dados (DAD)

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| DAD-01 | "Dados pessoais" (+ "Editar"), "Endereço de entrega" (+ "Alterar"), "Sair da conta" | **página real** `AccountPage.test.tsx:398-427` | ✅ |
| DAD-02 | grava nome + WhatsApp só dígitos em `customers`; nome em `full_name` | `features/auth/__tests__/authContext.test.tsx` (`update({ name:'Ana Nunes', phone:'51998765432' })`, `.select()` por ordem de chamada, `updateUser`); `AccountPage.test.tsx:429-442` | ✅ |
| DAD-03 | nome < 2 ou WhatsApp ≠ 10–11 → não grava, diz o motivo | `features/edit-profile/model/__tests__/profileRefusal.test.ts` (M26 morto); `ProfileCard.test.tsx:202-220` | ✅ |
| DAD-04 | e-mail com cadeado + literal, sem campo | `features/edit-profile/ui/__tests__/ProfileCard.test.tsx:85-103` | ✅ |
| DAD-05 | CPF preenchido mascarado `•••.…-••` + cadeado + literal; vazio editável uma vez, DV | `ProfileCard.test.tsx:107-175`; servidor `fn/createOrder.test.ts` (filtro `cpf.is.null,cpf.eq.`; M15 morto) | ✅ |
| DAD-06 | banco recusa e-mail, CPF preenchido, `user_id`; admin e service role podem; por probe | **probe SQL** acima; `minhaContaSchema.test.ts:338-420` | ✅ |
| DAD-07 | formulário de endereço com `maskCep` + consulta, grava padrão, no máximo um | `features/edit-address/ui/__tests__/AddressCard.test.tsx:110-192`; índice `minhaContaSchema.test.ts:422-443` (M13 morto) + **probe** (2º padrão recusado); checkout `fn/createOrder.test.ts` (1º endereço padrão; M16 morto) | ✅ · SPEC_DEVIATION declarada (formulário próprio) |
| DAD-08 | aviso literal; próximo caixa preenchido | `AddressCard.test.tsx:175-192` (texto + `getQueryData(['default-address','c1'])`) | ✅ — nota: a régua do aviso é `/Vale para as próximas compras/`, não a frase inteira |
| DAD-09 | falha mantém o digitado e mostra o erro | `ProfileCard.test.tsx:236-246`; `AddressCard.test.tsx:195-223` | ✅ |

### P2 — Número legível (NUM)

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| NUM-01 | só `NP-%`, por `created_at`, `lpad(nextval)` | `minhaContaSchema.test.ts:445-476` (M14 morto) | ✅ |
| NUM-02 | idempotente pelo recorte | `minhaContaSchema.test.ts:478-488`; banco com 0 `NP-` depois de aplicada | ✅ |
| NUM-03 | migration nova, guarda prova recorte/idempotência/`NS-` intacto | `minhaContaSchema.test.ts:490-500`; 35 `NS-` intactos no banco | ✅ |

### P3 — Acabamentos (ACB)

| AC | Resultado da spec | Evidência | |
| --- | --- | --- | --- |
| ACB-01 | sem tamanho/acabamento → só a quantidade, sem ponto solto | `OrderItemsSummary.test.tsx:53, 121` | ✅ |
| ACB-02 | a bolha não cobre o último bloco | `AccountPage.test.tsx:383-391` (`pb-36`/`md:pb-24`); `widgets/whatsapp-float/ui/__tests__/WhatsAppFloat.test.tsx:117-130` (régua relacional; bolha ausente em `/pedido/*`) | ✅ forma · ⚠️ navegador |
| ACB-03 | animações novas respeitam `prefers-reduced-motion` | só `AddressCard.test.tsx:104` (`motion-reduce:animate-none`) | ⚠️ **parcial**: o grep confirma par `motion-reduce:` em toda `transition`/`animate-` dos 14 arquivos novos, mas nenhum guarda os cobre |

**Placar**: 63 ✅ · 4 ⚠️ (DET-01 divergência, DET-09 deviation de copy, ACB-03 parcial, LST-04 navegador) · 1 ❌ (MAT-05) · e os ⚠️ de navegador marcados ao lado de LST-03/05/10, DET-03, ACB-02 são pendências de prova, não gaps de teste.

---

## Discrimination Sensor (P0-tier — auth, dinheiro, dados)

Arnês `sensor.mjs` (scratchpad): copia o arquivo real em memória, **lança** se o alvo não existe, aplica a mutação, roda os arquivos de teste do workspace, restaura e confere **byte a byte** (`Buffer.compare`). Morte classificada por asserção × compilação.

| # | Arquivo | Mutação | Resultado | Morto por |
| --- | --- | --- | --- | --- |
| M01 | `core/orders/situation.ts` | reembolsado antes de enviado | ✅ morto | asserção (`expected 'refunded' to be 'shipped'`) |
| M02 | idem | `material_enviado` fora de "aguardando" | ✅ | asserção (SIT-05) |
| M03 | `core/orders/repix.ts` | `<=` → `<` na janela | ✅ | asserção (7 d exatos) |
| M04 | `situation.ts` `firstEventAt` | primeiro → último evento | ✅ | asserção (3 casos) |
| M05 | `entities/order/lib/attention.ts` | sem exclusão de cancelado | ✅ | asserção |
| M06 | idem | mais nova primeiro | ✅ | asserção (PEN-06) |
| M07 | `entities/order/lib/orderMeta.ts` | `shipped` fora do corte do subtítulo | ✅ | asserção (2) |
| M08 | `widgets/order-material/.../OrderMaterialBlock.tsx` | portão de sessão → `true` | ✅ | asserção (MAT-06) |
| M09 | idem | `code.trim() === ''` → `code === ''` | ✅ | asserção (só espaço) |
| M10 | `entities/order/api/useOrders.ts` | erro → `[]` | ✅ | asserção (LST-08) |
| M11 | `entities/order/api/useOrder.ts` | `error` → `throw` dentro do `try` | **equivalente** | o `catch` engole e devolve `[]` — mesma saída; substituído por M11b/M11c |
| M11b | idem | `catch` relança | ✅ | asserção (`isError` deixa de ser `false`) |
| M11c | idem | não chama a RPC | ✅ | asserção (7) |
| M12 | migration | sem `revoke … from anon` | ✅ | asserção |
| M13 | migration | índice sem `where is_default` | ✅ | asserção |
| M14 | migration | `like 'NP-%'` → `like 'N%'` | ✅ | asserção |
| M15 | `checkout/handlers.ts` | sem `.or('cpf.is.null,cpf.eq.')` | ✅ | asserção |
| M16 | idem | endereço sempre `is_default: true` | ✅ | asserção |
| M17 | idem | `.eq('order_id')` → `.eq('id')` | ✅ | asserção (o dublê enxerga o filtro) |
| M18 | `shared/lib/whatsapp.ts` | portão de 10 → 1 dígito | ✅ | asserção |
| M19 | `pages/AccountPage.tsx` | `<AttentionList>` não montado | ✅ | asserção (4) |
| M20 | idem | `OrderList` recebe `[]` | ✅ | asserção |
| M21 | `app/App.tsx` | rota `/conta/dados` removida | ✅ | asserção (`routing`, `sitemapRoutes` bidirecional) |
| **M22** | `entities/order/api/useSetMaterialTracking.ts` | sem `invalidateQueries` após gravar | ❌ **SOBREVIVEU** | 92/92 verdes (`useSetMaterialTracking`, `OrderMaterialBlock`, `OrderConfirmationPage`) |
| M23 | `widgets/order-action/lib/orderActionState.ts` | sem o estado `repix` | ✅ | asserção (3) |
| M24 | `OrderMaterialBlock.tsx` | limpa o campo na recusa | ✅ | asserção (MAT-04) |
| M25 | `attention.ts` | qualquer peça conta como "exige material" | ✅ | asserção (2) |
| M26 | `features/edit-profile/model/profileRefusal.ts` | `NOME_MIN` 2 → 1 | ✅ | asserção (4) |
| M27 | `widgets/order-list/ui/OrderList.tsx` | link pelo número, não pelo id | ✅ | asserção (4) |
| M28 | `pages/OrderConfirmationPage.tsx` | "Meus pedidos" sem portão de sessão | ✅ | asserção |
| M29 | `OrderList.tsx` | tabela `{ shipped: 'Enviado' }` injetada | ✅ | asserção (`situacaoComDonoUnico`) |
| M30 | `handlers.ts` | `select` pede `note` | ✅ | asserção |
| M31 | `widgets/order-attention/ui/AttentionList.tsx` | link do material sem `#material` | ✅ | asserção |
| M32 | `OrderConfirmationPage.tsx` | jornada também no cancelado | ✅ | asserção ("Pedido cancelado" 2×) |
| P01 | `orderMeta.ts` | **sonda de alinhamento**, não falha: `paid_at` → `payment_status === 'approved'` (a letra do `DET-01`) | derrubada | asserção (3) — prova que os testes codificam `paid_at`, não a spec |

**Profundidade**: P0 (≥ 5 por ramo de risco). **Resultado**: 34 mutações de falha, **32 mortas por asserção**, 0 por compilação, 1 equivalente, **1 sobrevivente (M22)** → ❌.

---

## Desvios declarados — julgamento

| Desvio | Julgamento |
| --- | --- |
| Gatilho com 3ª saída (`current_user not in ('authenticated','anon')`), função **não** `security definer` | ✅ **legítimo**. Pelo PostgREST a cliente é sempre `authenticated`; o probe confirmou a recusa. O guarda tem régua e sensor para a saída alargada e para `security definer`. Risco residual: uma futura função `security definer` acessível a `authenticated` que escreva em `customers` passaria — vale uma linha no `supabase/CLAUDE.md` |
| `DAD-07` com formulário próprio | ✅ legítimo (o do checkout é acoplado ao `checkoutStore`); campos, `maskCep` e `useCepLookup` (movido para `entities/address`) são os mesmos |
| Estado do topo "cancelado" desenhado pela `OrderJourney` | ✅ legítimo e provado: "Pedido cancelado" aparece **uma** vez (M32 morto) |
| Bloco de baixo com copy da feature 22 ("Material da sua joia") vs `DET-09` "Seu material" | ⚠️ **aceitável, mas pede ratificação do usuário**. O argumento ("os casos vivos da 22 assertam a frase") é o mesmo que a T18 usou para o título e que o usuário **revogou** no `DET-01`. Inverter os casos seria o mesmo movimento |
| Sem folga no fim de `/pedido/:id` | ✅ legítimo: `WhatsAppFloat` devolve `null` em `/pedido/` (provado em `WhatsAppFloat.test.tsx:130`), e a reserva da barra inferior é do `StoreLayout` |
| Guardas `pagamentoComDonoUnico`/`numeroDoPedidoComDonoUnico` reapontados para os widgets | ✅ legítimo para o primeiro (ganhou "a página monta `<AttentionList`"; M19 morto por ele). ⚠️ O segundo diz em comentário que "a montagem dos dois pela página é cobrada logo abaixo" — **não é**, nesse arquivo. A montagem do `OrderList` está provada por outro caminho (`AccountPage.test.tsx`, M20/M27 mortos), então não é lacuna de cobertura; é comentário que afirma uma sensibilidade que o arquivo não tem |
| **Não declarado**: subtítulo do `DET-01` por `paid_at` em vez de `payment_status` | ⚠️ ver gap 2 |

---

## Edge cases da spec

- [x] Itens sem foto → quadrado neutro (`OrderList.test.tsx:81`, `OrderItemsSummary.test.tsx:100`)
- [x] Pedido `NS-`/`credit_card`/`boleto`/`manual` → mesma régua, rótulo legível (`OrderPaymentDelivery.test.tsx:30-45`)
- [x] Dois `shipped` → o primeiro (`core/journey.test.ts:191`)
- [x] `delivery_estimate_min = max` → "Previsão: {d MMM}" (`OrderJourney.test.tsx:177`)
- [x] Pedido adotado por e-mail → aparece como qualquer outro (lista por `customer_id`, sem filtro extra)
- [x] Relógio errado → limite aceito; a janela é oferta (`repix.ts` comentado)

---

## Pendências que só o navegador prova (não são falhas)

Medir em **390×844** e **1440×900**, dev server em :8082 (o banco local está de pé):

1. `/conta`, `/conta/dados`, `/pedido/:id`: `document.body.scrollWidth ≤ 390` com o número mais longo (`NS-…`) e um e-mail longo (`LST-04`, Success Criteria).
2. O `truncate` do número cortando sem empurrar o total; o avatar sem encolher (`LST-03`, `LST-05`).
3. A coluna lateral de 264 e as pendências lado a lado em 1440 (`LST-10`).
4. A bolha do WhatsApp sobre o último bloco da conta, com a folga `pb-36` (`ACB-02`).
5. **O link do Melhor Rastreio** (`https://www.melhorrastreio.com.br/rastreio/{code}`) abrir a página do pacote — premissa não confirmada (`DET-03`).
6. Da conta até "Gerar novo PIX"/"Enviar código" em ≤ 2 toques (Success Criteria).
7. Notado de passagem: o `MobileNav` só acende "Conta" em `pathname === '/conta'` (`widgets/mobile-nav/ui/MobileNav.tsx:44`), então em `/conta/dados` nenhuma aba da barra inferior fica ativa. Não é AC; vale conferir.

---

## Fix Plans

### Fix 1 (Major) — `MAT-05` sem prova; mutante M22 sobrevive
- **Causa**: o único caso de `MAT-05` (`OrderMaterialBlock.test.tsx:262`) mede que o campo esvazia. Que o pedido é relido, que o topo dá lugar ao bloco com "Material a caminho" e que a pendência some não tem asserção nenhuma.
- **Tarefa**: (a) em `useSetMaterialTracking.test.tsx`, assertar a **chave** invalidada no sucesso (`['orders','id',orderId]`) e a ausência dela na recusa; (b) decidir se a lista da conta (`['orders','customer',…]`) também deve ser invalidada — hoje a "próxima leitura" depende do `staleTime`; se sim, invalidar e assertar a chave; (c) opcional: um caso de página com `QueryClient` real em que o `useOrder` relido devolve `material_enviado` e a tela troca "Envie o seu material" por "Material a caminho".
- **Done when**: M22 reinjetado derruba pelo menos um caso por asserção.

### Fix 2 (Minor, decisão do usuário) — predicado do subtítulo do `DET-01`
- **Causa**: spec diz `payment_status = 'approved'`; código e `orderMeta.test.ts:81` dizem `paid_at`. Em produção as duas colunas andam juntas (`apply_payment_approval`), mas importados e correções manuais podem separá-las.
- **Tarefa**: ou atualizar a redação do `DET-01` para `paid_at` (com o motivo do `STO-01`) ou mudar `confirmationHeadline` e inverter o caso `:81`. Registrar como `SPEC_DEVIATION` se ficar como está.

### Fix 3 (Minor, decisão do usuário) — título "Seu material" (`DET-09`)
- Ratificar o desvio ou inverter os casos da feature 22 para "Seu material", como foi feito com o título no `DET-01`.

### Fix 4 (Minor) — `ACB-03` sem guarda
- Estender um guarda de movimento (molde de `animacaoRespeitaMovimento.test.ts` do painel) aos 14 arquivos de UI novos da `59`, com âncora de contagem; e corrigir o comentário de `numeroDoPedidoComDonoUnico.test.ts:284-285`.

---

## Requirement Traceability Update

| Requisito | Novo status |
| --- | --- |
| SIT-01..13, LST-01..03, LST-05..10, PEN-01..08, DET-02..08, DET-10..12, MAT-01..04, MAT-06, LIN-01..05, DAD-01..09, NUM-01..03, ACB-01..02 | ✅ Verified (com as pendências de navegador listadas) |
| LST-04 | ⏳ Pending browser |
| DET-01 | ⚠️ Verified com divergência a decidir (Fix 2) |
| DET-09 | ⚠️ Deviation a ratificar (Fix 3) |
| MAT-05 | ❌ Needs Fix (Fix 1) |
| ACB-03 | ⚠️ Partial (Fix 4) |

---

## Lições propostas (não gravadas — o orquestrador decide)

1. **Mutação dentro de `try` cujo `catch` devolve o mesmo valor é equivalente**: injetar `throw` num ramo que um `catch` adjacente converte na mesma saída não testa nada; mute o `catch` (relançar) ou a chamada. (M11)
2. **AC de "a tela muda depois de gravar" exige asserção sobre a releitura** (chave invalidada ou estado relido), não sobre o efeito local do formulário; "o campo esvaziou" é verdade com o cache intocado. (M22, `MAT-05`)
3. **Teste que codifica uma regra diferente da letra da spec é desvio não declarado**: quando o código escolhe outra coluna com bom motivo, o motivo vai para a spec ou para um `SPEC_DEVIATION`, não só para o comentário. (P01, `DET-01`)

---

## Summary

**Overall**: ❌ Not Ready — falta uma correção pequena (Fix 1). Os Fixes 2 e 3 são decisões de copy/regra, não de código.

**Spec-anchored**: 63/69 ✅ · 4 ⚠️ · 1 ❌ (+ pendências de navegador)
**Sensor**: 32/33 mutações não equivalentes mortas por asserção (M22 sobreviveu)
**Gate**: core 2546/102 · functions 674/14 · store 4199/250 · backoffice 3024/166 · tsc 0·0 · lint 26/6 · `payment/**` intocado

**O que funciona**: as três regras puras de `core` (com fronteiras exatas); a migration, provada pelo guarda e por probe SQL independente (gatilho, função, índice, `anon`); o `get-order` com dublê que enxerga o filtro; as páginas montando os widgets reais (provado por mutação); o dono único do selo com guarda que pega uma tabela injetada.

---

## Prova em navegador (2026-10-04)

**Quem mediu**: sub-agente de prova em navegador (não editou código nem teste). Chromium headless
(`chromium_headless_shell-1234`, Playwright 1.62 do `@playwright/cli` global), `deviceScaleFactor` 1.

**Arnês**:
- Dev server próprio (`pnpm dev:store`). A porta **8082 estava ocupada por outro processo** (pid 9580,
  de outra sessão, não tocado), então o Vite subiu em **8083** — o servidor medido é o desta working
  tree. Encerrado ao fim (só o processo iniciado aqui).
- **Bundle servido conferido antes de medir**: `GET /src/pages/AccountPage.tsx` contém `AttentionList`
  e `WHATSAPP_FLOAT_CLEARANCE`; `AttentionList.tsx` servido contém "Precisa da sua atenção";
  `OrderList.tsx` servido contém "Seus pedidos".
- **Rede interceptada, banco não usado**: UM handler sobre `127.0.0.1:54341` que despacha por caminho
  (evita a armadilha da ordem inversa de registro do Playwright): `/auth/v1/user|token|logout`,
  `rest/v1/user_roles` (vazio), `customers`, `orders` (lista e `id=eq.`), `rpc/customer_order_events`,
  `addresses`, `store_settings` (`general.whatsapp = (51) 99876-5432`), `categories` (vazio). Respeita
  `Accept: vnd.pgrst.object` para `.single()`. Sessão semeada em `localStorage['sb-127-auth-token']`
  (chave derivada de `VITE_SUPABASE_URL=http://127.0.0.1:54341`). Não casadas: só `categories` e
  `POST /functions/v1/mercado-pago?action=create-payment` (disparada ao chegar na rota de pagamento;
  respondida 500 — fora do que se mede aqui).
- **Fixtures** (o spread `...extra` por último, armadilha da `58`): 5 pedidos — PIX `expired` criado
  há 2 dias com `order_number = 'NP-MUBBLKLYGOMR'`; pago com material `aguardando_material` (`#0244`,
  2 peças, gravação); enviado `#0231` com `tracking_code QJ482913507BR`, `Correios`, estimativa e 4
  eventos de histórico; entregue `#0198`; legado `NS-1043` sem foto. E-mail
  `rafael.duarte.santos.compras@gmail.com`, nome de peça de 62 caracteres.

### Medidas

| # | Item | 390 × 844 | 1440 × 900 |
| --- | --- | --- | --- |
| 1 | `scrollWidth` doc/body — `/conta`, `/conta/dados`, `/pedido/{enviado, material, expirado}` (`LST-04`) | **390/390 nas 5** | **1440/1440 nas 5** |
| 2 | Título da linha (Outfit 600 16px) | **24px = 1 line-height** nas 5; `#NP-MUBBLKLYGOMR` corta com reticências (129px) | **todas cortadas em 38px — "Pe…"** (ver defeito 1) |
| 2 | Total dentro do cartão | borda direita **325 ≤ 374** nas 5 linhas | 1163 ≤ 1216 |
| 2 | Avatar | **48×48** | 56×56 (`lg:h-14`) |
| 2 | E-mail da fixture | cabe (261px de 298 disponíveis) — não precisa cortar | corta (196px) |
| 2 | E-mail de estresse (62 car.) | **corta** (414 > 298), avatar 48×48, body 390 | corta (414 > 196), body 1440 |
| 3 | `<aside>` | — | **264px** |
| 3 | Cabeçalho das colunas | — | visível, "PEDIDO DATA SITUAÇÃO TOTAL", 33px |
| 3 | Pendências lado a lado | empilhadas | **mesmo `top` (253)**, 338px cada |
| 4 | Alvos < 44px — `/conta` (10), `/conta/dados`, `/pedido/enviado` (6), `/pedido/expirado` (5) | **nenhum** | — |
| 4 | Alvos < 44px — `/pedido/material` (7) | **`input` "Código de rastreio do envio": 21px** (defeito 2); "Como embalar e enviar o material": 20px **com `::before` de 44px** (`TAP_ROW`, ok) | — |
| 5 | `ACB-02` — fim do container da conta alinhado ao fim da viewport, bolha visível (3,2 s) | `/conta`: último bloco **700** × topo da bolha **708** (folga 8px); `/conta/dados`: **700 × 708**; `padding-bottom` 144px; `MobileNav` em 779 | — |
| 5 | Bolha em `/pedido/:id` | **ausente** (0 `div.fixed.bottom-20`) | — |
| 6 | Toques até "Gerar novo PIX" | **1** (pendência → `/pedido/{id}/pagamento`); pela linha: **2** (linha → botão no topo do detalhe, y=607) | — |
| 6 | Toques até "Enviar código" | **1** (pendência → `/pedido/{id}#material`); campo **visível sem rolar** (top 586, botão até 663 de 844); **não recebe foco** | — |
| 7 | `DET-01` no enviado | h1 **"Pedido #0231"** (Libre Baskerville, 34px, 1 linha); **sem subtítulo caloroso**; número aparece **1×** na página | — |
| 7 | `DET-03` | cartão "Rastreio do pacote · QJ482913507BR · Enviado por Correios"; "Acompanhar entrega" → `https://www.melhorrastreio.com.br/rastreio/QJ482913507BR`, `target=_blank`; "Copiar" presente | — |

**Link do Melhor Rastreio (premissa de `DET-03`) — CONFIRMADA.** `curl -sI` → `301` para
`/app/QJ482913507BR`; `curl -sL` → `200 https://www.melhorrastreio.com.br/app/QJ482913507BR` (1
redirect). É SPA: renderizado no Chromium, a página roteia para `/app/correios/QJ482913507BR`, com o
código **preenchido no campo** e a transportadora detectada como Correios — página de rastreio do
pacote, não home nem 404. (O código é sintético, então o resultado fica em esqueleto/sem eventos.)

### Defeitos achados (por gravidade)

1. **Major — no computador (`lg`, 1024 e 1440) a coluna "Pedido" da lista colapsa para 38px e TODO
   título vira "Pe…"**: o número do pedido fica ilegível em todas as linhas, inclusive `#0244`.
   Causa provável: `widgets/order-list/ui/OrderList.tsx`, `GRADE`/`CABECALHO` em `lg` —
   `56px minmax(0,1fr) 120px 230px 110px 20px` + `gap-x-4` somam **616px fixos** num cartão de ~654px
   úteis (container `max-w-5xl` − lateral 264 − gap 40 − padding), e o `1fr` fica com 38px. Medido
   igual em 1024 (coluna 38px). Fere `LST-03` ("cortando só se não couber" — aqui nada cabe) e o
   quadro desktop de `LST-10`. jsdom não pode ver: medida de layout.
2. **Major (pré-existente, agora em destaque) — o campo "Código de rastreio do envio" mede 21px de
   altura em 390.** `widgets/order-material/ui/OrderMaterialBlock.tsx:299`: o `input` tem
   `h-12 flex-1` dentro de `flex flex-col … sm:flex-row`; em coluna, `flex: 1 1 0%` anula o `h-12`.
   A mesma linha está no `HEAD`, mas a `59` fez deste formulário o **estado do topo** e o destino de
   1 toque da pendência — é o alvo da ação principal, abaixo de 44px e visivelmente achatado ao lado
   do botão de 48px (print `material-anchor-390.png`).
3. **Minor (copy, conforme a letra de `DET-01`) — no pedido com PIX expirado** o cabeçalho diz
   "Pedido registrado" + "Estamos aguardando a confirmação do pagamento. Avisamos por e-mail assim que
   ele cair…", e logo abaixo o topo diz "O código PIX expirou". A frase promete uma confirmação que
   não virá. Decisão de copy, não de código.
4. **Minor — o h1 "Pedido #NP-MUBBLKLYGOMR" quebra em duas linhas no hífen em 390** (sem rolagem
   horizontal). Some com a migration de `NUM-01`; registrado por ser o pior caso da base.
5. **Observações (não defeitos)**: a folga do `ACB-02` é de **8px** (passa, apertada — qualquer
   crescimento da bolha a zera); o aviso "Vale para as próximas compras…" aparece em `/conta/dados`
   sempre, não só depois de salvar (conferir contra `DAD-08`/desenho); a âncora `#material` não move
   o foco para o campo (não é AC — o campo já está na primeira dobra). O `MobileNav` acende "Conta"
   em `/conta/dados` (pendência 7 da rodada 1 confirmada em navegador).

**Prints** (scratchpad da sessão, `browser59/`): `conta-390.png`, `conta-1440.png`, `dados-390.png`,
`pedido-ship-390.png`, `pedido-ship-1440.png`, `pedido-mat-390.png`, `pedido-exp-390.png`,
`material-anchor-390.png`, `bubble-aligned-conta-390.png`, `bubble-aligned-conta-dados-390.png`,
`melhorrastreio-390.png`. Nos prints de página inteira o `MobileNav` fixo aparece no meio — artefato
da captura, não sobreposição real.

**Não medido aqui**: `MAT-05` de ponta a ponta (gravar o código e ver a pendência sumir) — exige a
RPC real ou um dublê com estado; o envio não foi exercitado.

### Remedição depois das correções (2026-10-04)

**Arnês**: o mesmo da rodada 1 (`browser59/harness.cjs`, sem alteração), Vite próprio em **:8084**
(:8082 seguia com o processo de outra sessão, não tocado; o :8084 foi encerrado ao fim). Script
`browser59/measure-r2.cjs`, resultado em `results-r2.json`. **Bundle servido conferido antes de
medir**: `OrderList.tsx` contém `minmax(120px,1fr)` (2×), `OrderMaterialBlock.tsx` contém
`sm:flex-1`, `clearance.ts` contém `pb-40`, `orderMeta.ts` contém
`'expired' || o.payment_status === 'rejected'`. Uma 6ª fixture só desta rodada (`#0250`,
`material_enviado`, código registrado) exercita o formulário na variante `bloco`. Não casada: só
`categories`.

| # | Item | Resultado |
| --- | --- | --- |
| 1 | Título da linha em **1024** e **1440** | **nenhuma linha corta — nem `#NP-MUBBLKLYGOMR`** (célula 227px, `scrollWidth` = `clientWidth`); `#0244` 167px, `#0231` 165px, `#0198`/`#NS-1043` 258px. Antes: 38px, "Pe…" |
| 1 | Pílula de situação em 1024/1440 | **22px** em todas (line-height 16 + 3+3 de padding = 1 linha), a maior "A caminho · chega até 8 out" com 177px |
| 1 | Total dentro do cartão | borda direita **955 ≤ 1008** (1024) e **1163 ≤ 1216** (1440), nas 6 linhas |
| 1 | **Cabeçalho × colunas** | **TOTAL alinha** (borda direita 955/1163 no cabeçalho e nas 6 linhas). **DATA e SITUAÇÃO NÃO alinham**: em 1024 o cabeçalho põe DATA em x=719 e SITUAÇÃO em 823; nas linhas a data começa em **590–683** e a pílula em **694–787**, variando de linha a linha (ver defeito abaixo) |
| 1 | 390 × 844 (inalterado) | título **24px = 1 linha** nas 6; `#NP-MUBBLKLYGOMR` corta em 129px (como antes); total com borda direita **325 ≤ 374** |
| 2 | Campo "Código de rastreio do envio" (topo, `acao`) em 390 | **48px** de altura (antes 21px), 322px de largura; botão 48px; `flex-direction: column` |
| 2 | Campo da variante `bloco` ("Já postou? Registre o código de rastreio", pedido `material_enviado`) em 390 | **48px** de altura, 316px de largura |
| 3 | `ACB-02` — fim do container alinhado ao fim da viewport, bolha visível (3 s) | `/conta`: último bloco **684** × topo da bolha **708** = **24px**; `/conta/dados`: **684 × 708 = 24px**; `padding-bottom` **160px** (antes 144px, folga 8px). Rolando até o fim do documento o rodapé entra e a folga deixa de fazer sentido (1268px) |
| 4 | `/pedido/{PIX expirado}` em 390 | **sem "Pedido registrado"** e **sem "aguardando a confirmação do pagamento"**; cabeçalho = "Meus pedidos · Pedido #NP-MUBBLKLYGOMR · Feito em 2 out 2026 · 1 peça · R$ 1.289,90 · PIX expirado"; **o primeiro bloco depois do cabeçalho é "O código PIX expirou"** |
| 5 | `scrollWidth` doc/body em `/conta` | **390/390**, **1024/1024**, **1440/1440** |

**Defeito novo achado (Minor, visual) — no computador as colunas Data e Situação ficam em zigue-zague
e não casam com o cabeçalho.** Cada linha é um `grid` próprio (o `<a>` da `Linha`) e o cabeçalho é
outro; com Situação e Total em `auto` e o título em `minmax(120px,1fr)`, cada grade calcula as
trilhas pelo próprio conteúdo: a pílula "Entregue" (81px) deixa o `1fr` com 258px, "A caminho ·
chega até 8 out" (177px) com 165px. A data anda até **93px** entre linhas (590 → 683 em 1024) e fica
**36–129px** à esquerda do rótulo DATA. Visível nos prints `conta-1024-r2.png`/`conta-1440-r2.png`.
Só o Total, ancorado à direita, alinha. Corrigir exige trilhas iguais em todas as grades (larguras
fixas para Situação/Total que caibam no cartão de 688px, ou `subgrid` sob uma grade comum na `<ul>`).
jsdom não pode ver.

**Observação (não pedida, fora dos quatro consertos)**: em **1024 × 768** a bolha do WhatsApp
(x 944–1000, y 688–744) fica **64px sobre o cartão de pedidos** (borda direita 1008) e cobre o
chevron e o fim do total da linha que estiver naquela altura (print `conta-1024-r2.png`). Em 1440
há 144px de folga. Em 1024 o `ACB-02` (folga vertical) não se aplica do mesmo jeito porque a
sobreposição é lateral.

**Prints desta rodada** (`browser59/`): `conta-390-r2.png`, `conta-1024-r2.png`,
`conta-1440-r2.png`, `pedido-mat-390-r2.png`, `pedido-low-390-r2.png`, `pedido-exp-390-r2.png`,
`bubble-aligned-conta-390-r2.png`, `bubble-aligned-conta-dados-390-r2.png`.


### Remedição do alinhamento da lista (orquestrador, 2026-10-04)

O defeito de colunas `auto` (cada linha, sendo uma grade própria, media as colunas pelo próprio
conteúdo) foi corrigido com larguras **fixas e compartilhadas** entre linhas e cabeçalho
(`lg:grid-cols-[56px_minmax(0,1fr)_196px_104px_20px]`). Uma tentativa intermediária com a coluna Data
própria a partir de `xl` foi medida e **descartada**: o miolo do cartão é 618px em 1024, 1280 e 1440,
e o título caía para 102px (até `#NS-1043` cortava). Ficou Pedido (com a data embaixo) · Situação ·
Total — `SPEC_DEVIATION` de `LST-10` no código e na spec.

| Viewport | Cabeçalho (x) | Linhas (x) | Título | Selo | `scrollWidth` |
| --- | --- | --- | --- | --- | --- |
| 390 | — (oculto) | — | 129–144px, só `NP-` corta | 22px (1 linha) | 390 |
| 1024 | Situação 639 · Total→955 | selo 639 · total→955 em todas | 214px, só `NP-` corta | 22px | 1024 |
| 1280 | Situação 767 · Total→1083 | idem, em todas | 214px | 22px | 1280 |
| 1440 | Situação 847 · Total→1163 | idem, em todas | 214px | 22px | 1440 |

Harness: `scratchpad/browser59/align-r3.cjs` sobre o `harness.cjs` da prova (mesmas interceptações e
fixtures), dev server próprio em :8084 com o código servido conferido (`196px_104px_20px`).
