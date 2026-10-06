# 61 · Google Analytics 4 — Validation

> **Veredito vigente (Rodada 3, 2026-10-06): ✅ PASS.** Os 13 sobreviventes das rodadas 1 e 2
> morreram, todos por asserção, e 15 mutantes novos em áreas pouco amostradas morreram também,
> todos por asserção. Zero sobrevivente, zero equivalente. Gates verdes, lint igual à baseline
> (26 / 7), `payment/**` intocado. O que segue aberto é prova em navegador e operação, não teste.
> Ver **Rodada 3**, no fim do arquivo.
>
> *Veredito da rodada 2 (superado): ❌ FAIL — por cobertura, de novo, e mais estreito.*
> Os cinco sobreviventes da rodada 1 morreram, todos por asserção. O conserto de `EVT-11` está certo
> e defendido nos dois sentidos. Mas a rodada 2 achou **quatro** buracos reais de teste em ACs P1,
> um deles numa AC alterada nesta rodada (`ANL-04`, texto exato). Nenhum defeito de produto. Ver
> **Rodada 2**, no fim do arquivo. Iteração 2 de 3.

**Veredito da rodada 1: ❌ FAIL — por cobertura, não por comportamento.** Nenhum defeito de produto foi
encontrado: todo comportamento mutado que sobreviveu está **correto no código hoje**. O FAIL é
porque cinco mutantes de comportamento real sobreviveram (a regra da skill: sobrevivente é fix task),
e dois deles estão em cima de um AC P1 com texto fixado pela spec (`PRV-01`) e de uma promessa de
segurança (`CMP-07`, "sem a chave secreta em log nenhum"). Todos os consertos são **só de teste**.

**Date**: 2026-10-06
**Spec**: `.specs/features/61-google-analytics/spec.md`
**Diff range**: árvore sem commit sobre `HEAD` (`82f03e7`), excluídos `.gitignore`, `package.json` da
raiz e `.claude/launch.json` (fora da feature)
**Verifier**: sub-agente independente (autor ≠ verificador). Não li relatório de autor como evidência;
toda linha abaixo foi medida nesta sessão, salvo a prova em navegador, que é do fecho (T26) e está
marcada como tal.

---

## Gates (medidos por mim, um workspace por vez, exit code fora de pipe)

| Medida | Resultado |
| --- | --- |
| core `pnpm --filter @estrelinha/core test` | **2660 / 109**, exit 0 |
| functions `pnpm --filter @estrelinha/functions test` | **902 / 18**, exit 0 |
| store `… test --testTimeout=20000` | **4541 / 270**, exit 0 |
| backoffice `… test --testTimeout=20000` | **3119 / 173**, exit 0 |
| catalog-import | **512 / 23**, exit 0 |
| `tsc --noEmit -p apps/store/tsconfig.app.json` | exit 0 (0 erros) |
| `tsc --noEmit -p apps/backoffice/tsconfig.app.json` | exit 0 (0 erros) |
| `git diff --name-only HEAD -- packages/core/src/payment` (+ não rastreados) | **vazio** |
| `pnpm lint` / `pnpm build` | **não medidos por mim** (fora do pedido) |

Total **11734 em 593**, contra a tabela do `CLAUDE.md` (11201 em 564): **+533 / +29**. Nenhuma queda
de workspace.

### Probe contra o banco local (`ANL-06`, Success Criterion "anon não lê a chave")

Supabase local de pé (:54341). Medido por mim com `curl`:

| Quem | Operação em `analytics_secrets` | Resposta |
| --- | --- | --- |
| `anon` | `select` | **401** `42501 permission denied` |
| `anon` | `insert` | **401** `42501` |
| JWT `authenticated` sem papel | `select` | **403** `42501` |
| JWT `authenticated` sem papel | `insert` | **403** `42501` |
| `anon` | function `google-analytics?action=status` | **401** `Não autenticado` |
| JWT forjado | function `…?action=save-secret` | **401** |

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ provada · 🟡 provada só por proxy (classe/atributo; layout em jsdom é 0) ·
❌ lacuna · ⚠️ spec-precision gap.

### P1 — Painel (`ANL-*`)

| AC | Saída que a spec define | Evidência (arquivo:linha) | Resultado |
| --- | --- | --- | --- |
| ANL-01 | `/admin/google`, abas Analytics e Shopping, cada uma com `Ligado`/`Desligado` próprio | `apps/backoffice/src/pages/admin/AdminGooglePage.test.tsx:64,75,81`; `shared/lib/__tests__/googleSections.test.ts:17`; mutante B8 morto | ✅ |
| ANL-02 | `/admin/google-shopping` → `/admin/google/shopping`, tela Shopping sem perder bloco | `app/__tests__/rotasDoGoogle.test.tsx:104,110,125`; `GoogleShoppingPanel.test.tsx` migrado (21 → 24 casos); B7 morto | ✅ |
| ANL-03 | recusa `^G-[A-Z0-9]{6,12}$` após trim+upper, frase exata | `packages/core/src/analytics/__tests__/ids.test.ts:9,22,36`; `AnalyticsPanel.test.tsx:157-209`; C1 morto | ✅ |
| ANL-04 | ligar sem ID válido gravado é recusado, dizendo que falta o ID | `AnalyticsPanel.test.tsx:122,131`; B2 morto | ✅ (⚠️ a frase não é fixada pela spec) |
| ANL-05 | chave guardada pelo servidor; painel mostra "Guardada no servidor" + data; nunca a devolve | `supabase/functions/google-analytics/__tests__/handlers.test.ts:122,193`; `AnalyticsPanel.test.tsx:211,231`; F12, B4 mortos | ✅ |
| ANL-06 | anon / não admin não lê nem grava | `google-analytics/__tests__/handlers.test.ts:52-106`; `_shared/__tests__/auth.test.ts:126-164`; `analyticsSchema.test.ts:207-264`; **probe acima**; F13 morto | ✅ (ver sobrevivente F16) |
| ANL-07 | ligado sem chave ⇒ aviso de que as compras não são enviadas + passo a passo | `AnalyticsPanel.test.tsx:308,320,326,332,431`; B3 morto | ✅ |
| ANL-08 | desligar ⇒ loja não carrega gtag e servidor não envia | `app/__tests__/analytics.test.tsx` ("medição desligada ⇒ nenhum script"); `mercado-pago/__tests__/analytics.test.ts:255`; `AnalyticsPanel.test.tsx:114`; S13, B1 mortos | ✅ |
| ANL-09 | 390×844 sem rolagem horizontal; alvos ≥ 44px | `AnalyticsPanel.test.tsx:149`, `AdminGooglePage.test.tsx:98` (classe); **navegador do fecho** (`admin-proof.json`: links 44px, `scrollWidth 390 = clientWidth`) | 🟡 jsdom + navegador do fecho |

### P1 — Aviso e preferências (`AVS-*`)

| AC | Saída que a spec define | Evidência | Resultado |
| --- | --- | --- | --- |
| AVS-01 | texto exato, link para a política, Aceitar principal, Preferências discreto ≥44, X, sem "Google" | `widgets/cookie-notice/ui/__tests__/CookieNotice.test.tsx` "sem resposta, aparece com o texto EXATO", "não nomeia o Google", "botão principal", "alvo de 44px"; S38 morto | ✅ texto · 🟡 estilo e alvo (classe) |
| AVS-02 | desligada ⇒ aviso existe, sem "Estatísticas" | `CookieNotice.test.tsx` "medição DESLIGADA no painel ⇒ a folha não mostra Estatísticas" + sensor; S11 morto | ✅ |
| AVS-03 | Aceitar/X fecham e persistem, não recusam; seguir navegando mede; desde a 1ª página | `CookieNotice.test.tsx` "responder o aviso"; `cookieConsentStore.test.ts:63,76`; `shared/lib/analytics/__tests__/analytics.test.ts` "a fila de antes da configuração"; `app/__tests__/analytics.test.tsx` "o primeiro page_view chega ao gtag mesmo com a configuração lenta"; S8 morto | ✅ |
| AVS-04 | folha com Necessários (sem interruptor) e Estatísticas ligada; Aceitar todos + Salvar escolhas | `CookieNotice.test.tsx` "Preferências abre a folha…" (textos literais do Apêndice A) | ✅ |
| AVS-05 | recusa ⇒ zero eventos dali em diante, `_ga`/`_ga_*` apagados, vale nas próximas visitas | `CookieNotice.test.tsx` "desligar Estatísticas e salvar ⇒ nenhum evento sai" (mede a fila do gtag); `cookieConsentStore.test.ts:89`; `analytics.test.ts` clearGaCookies; S3, S4, S7, S9, S1b mortos; **navegador do fecho**: `collectAfterNav 0`, `collectAfterF5 0`, `cookiesAfterSave []` | ✅ |
| AVS-06 | link "Preferências de cookies" no rodapé reabre a folha | `widgets/footer/ui/__tests__/Footer.test.tsx` "o rodapé oferece o caminho de volta… ABRE a folha"; S32 morto | ✅ |
| AVS-07 | sem rolagem horizontal; não cobre a barra de compra; folha fecha por X e voltar; ausente em `/checkout` e `/pedido/:id/pagamento`, volta fora delas | `CookieNotice.test.tsx` "telas de dinheiro", "INVERSO", "gesto de voltar", "acima da barra fixa"; `app/__tests__/analytics.test.tsx` AVS-07 ×3; S10, S12 mortos; **navegador do fecho**: `buyBarHit.hitIsButton true`, `noticeVisibleCheckout false`, overflow 390/390 | ✅ comportamento · 🟡 sobreposição só no navegador |
| AVS-08 | prévia ⇒ sem aviso, sem folha, sem evento | `app/__tests__/analytics.test.tsx` "prévia do painel ⇒ nenhum script e nenhum page_view", "na prévia do painel o aviso não aparece" | ✅ (S15 é equivalente — ver mutantes) |

### P1 — Eventos (`EVT-*`)

| AC | Evidência | Resultado |
| --- | --- | --- |
| EVT-01 page_view por pathname, não por query | `app/__tests__/analytics.test.tsx` "PageViewTracker pelo App" (App real); S14, S16 mortos | ✅ |
| EVT-02 view_item_list (categoria, busca, carrossel, relacionados, favoritos) com `index` | `pages/__tests__/listagensMedidas.test.tsx:120,144,176,191,203,220`; `events.test.ts:37,48`; S17, S18, C9 mortos | ✅ |
| EVT-03 select_item com lista e índice | `listagensMedidas.test.tsx:162,203`; S19 morto | ✅ |
| EVT-04 view_item BRL/value/item | `pages/__tests__/produtoMedido.test.tsx:96` | ✅ |
| EVT-05 add_to_cart um evento com qty; restauração não emite | `produtoMedido.test.tsx:116,130`; `sacolaMedida.test.tsx:169`; S20 morto | ✅ |
| EVT-06 remove_from_cart com a quantidade retirada | `sacolaMedida.test.tsx:135,147,159`; S21 morto | ✅ |
| EVT-07 view_cart ao abrir com itens | `sacolaMedida.test.tsx:100,111,120`; S22 morto | ✅ |
| EVT-08 add_to_wishlist só ao marcar | `produtoMedido.test.tsx:140`; `sacolaMedida.test.tsx:180`; `medicaoComDonoUnico.test.ts:124-145`; S23 morto | ✅ |
| EVT-09 search no envio, não por tecla | `pages/__tests__/buscaMedida.test.tsx:44,51,73,80` (Dropdown e SearchPage) | ✅ Dropdown/Page · 🟡 **SearchOverlay só pelo guarda de texto** (S24 sobreviveu a `buscaMedida`; S24b morreu só pela metade positiva de `medicaoComDonoUnico`) |
| EVT-10 begin_checkout um por entrada, nenhum com sacola vazia | `pages/__tests__/CheckoutPage.test.tsx` "EVT-10 …" ×2; S25 morto | ✅ |
| EVT-11 add_shipping_info com `shipping_tier` | `CheckoutPage.test.tsx` "EVT-11"; S26 morto | ✅ ⚠️ (ver gap de precisão 3) |
| EVT-12 add_payment_info com `payment_type` | `CheckoutPage.test.tsx` "EVT-12"; `events.test.ts:126`; S27 morto | ✅ ⚠️ (valor de `payment_type` não fixado pela spec) |
| EVT-13 item: `publicProductId`, brand, slug da categoria de exibição pela mesma função nos dois lados | `core/analytics/__tests__/items.test.ts:18-62`; `core/product/__tests__/displayCategory.test.ts:27-129`; `entities/product/lib/__tests__/itemCategoryParity.test.ts:174-198`; `mercado-pago/__tests__/analytics.test.ts:388-439`; `cardSelect.test.ts`/`mapProduct.test.ts`; C7, C8, S33, S34, S37 mortos | ✅ |
| EVT-14 sem dado pessoal nem gravação | `items.test.ts:59,65` (igualdade de chaves); `purchase.test.ts:139`; `sacolaMedida.test.tsx:126`; C3 morto | ✅ |
| EVT-15 guarda de dono único do gtag | `shared/lib/__tests__/medicaoComDonoUnico.test.ts:97-117,292-340`; S35 morto por injeção no arquivo real | ✅ |
| EVT-16/17 login/sign_up com `method` (P2) | `features/auth/model/__tests__/authAnalytics.test.tsx:46,55,64,75,91,108` | ✅ ⚠️ valores de `method` (`codigo`/`senha`/`google`) não fixados pela spec |

### P1 — Compra no servidor (`CMP-*`)

| AC | Evidência | Resultado |
| --- | --- | --- |
| CMP-01 checkout envia `client_id`/`session_id`/recusa; servidor guarda | `CheckoutPage.test.tsx` "CMP-01" ×3; `supabase/functions/checkout/__tests__/createOrder.test.ts:800-875`; probe do fecho (`probe.log`: colunas existem); F1, F2, F3, S28, S29 mortos | ✅ |
| CMP-02 um `purchase` na primeira aplicação, com `transaction_id`, value, BRL, shipping, coupon, discount, itens | `mercado-pago/__tests__/analytics.test.ts:103,117,163`; `handlers.test.ts` "cartão aprovado AGORA ⇒ UM envio", "webhook approved com applied=true"; `core/.../purchase.test.ts:71`; F7, F9 mortos | ✅ ⚠️ (gap de precisão 1: `transaction_id`) |
| CMP-03 aprovação repetida não gera segundo | `analytics.test.ts:210,221`; `handlers.test.ts` "webhook reentregue", "CORRIDA cartão + webhook"; F4, F8 mortos | ✅ |
| CMP-04 recusa ⇒ não envia, marca "não enviado por recusa" | `analytics.test.ts:243`; `purchase.test.ts:29`; C11 morto | ✅ |
| CMP-05 sem `client_id` ⇒ sintético do pedido | `analytics.test.ts:369`; `purchase.test.ts:39-53,128`; C6 morto | ✅ |
| CMP-06 desligada/sem chave ⇒ não envia, pagamento segue | `analytics.test.ts:255,270,280,289`; C4 morto | ✅ |
| CMP-07 falha/demora ⇒ pagamento segue, `failed`, **sem a chave em log** | `analytics.test.ts:301,309,316,335,349`; `handlers.test.ts` "sendPurchase que LANÇA…" ×2; F5, F10b, F11 mortos | ✅ comportamento · ❌ **o log é provado só contra um dublê que não carrega a URL** (F6 sobreviveu) |
| CMP-08 homologação ⇒ `traffic_type=internal` | `core/.../host.test.ts:8-43`; `purchase.test.ts:133`; `analytics.test.ts:376`; S6, C2, C5 mortos | ✅ |
| CMP-09 guarda: `purchase` não montado em `apps/**` | `medicaoComDonoUnico.test.ts:118-121,303-320`; S36 morto | ✅ |

### P1 — Política (`PRV-*`)

| AC | Saída que a spec define | Evidência | Resultado |
| --- | --- | --- | --- |
| PRV-01 | seção "Medição de audiência" com o **texto aprovado** do Apêndice A: o que coleta, o que não coleta, base legal, como recusar | `politicaComDonoUnico.test.ts` (só o **título** e a contagem 10) | ❌ **lacuna** — S30 (a seção passa a dizer que **envia** nome, e-mail, CPF e a gravação) e S31 (base legal trocada por "consentimento") **sobreviveram** a `PrivacyPolicyPage.test.tsx` + `politicaComDonoUnico.test.ts` (46/46 verdes). O `tasks.md` (T25) pedia "os literais da seção nova"; só a regex da lista foi acrescentada |
| PRV-02 | lista com Google Analytics, exatamente 4 | `pages/__tests__/PrivacyPolicyPage.test.tsx:131,134` | ✅ |
| PRV-03 | sem remarketing/anúncio personalizado/publicidade comportamental | `PrivacyPolicyPage.test.tsx:161` | ✅ |

### P2

| AC | Evidência | Resultado |
| --- | --- | --- |
| ANL-10 último `sent` (formatOrderNumber, data, valor) + contagens de 30 dias por recusa/falha | `AnalyticsPanel.test.tsx:355,374,387,397,402`; `useLastPurchaseSend.test.ts:70-129`; B5, B6, B9 mortos | ✅ |
| ANL-11 "Nenhuma compra enviada ainda" | `AnalyticsPanel.test.tsx:348`; B10 morto | ✅ |

### Edge cases

| Caso | Evidência | Resultado |
| --- | --- | --- |
| gtag bloqueado | `analytics.test.ts` "gtag que lança (extensão)…" | ✅ |
| leitura de `store_settings` falha ⇒ não carrega | `useStoreSettings.test.ts:200` (via `fetchAllSettings`); `app/__tests__/analytics.test.tsx` "sem a chave no banco" | ✅ pelo caminho que devolve defaults · ❌ o recuo do **hook** (`data` indefinido) não tem teste — C10 sobreviveu |
| `localStorage` lança | `cookieConsentStore.test.ts:118,134` | ✅ |
| F5 em `/pedido/:id` sem `purchase` do navegador | estrutural: nenhum builder de `purchase` existe na loja (`events.test.ts:147`, CMP-09) | ✅ |
| ID muda ⇒ usa o novo | **nenhum teste** (só o comentário de `loadGtag`) | ❌ lacuna menor |

### Success Criteria

| Critério | Estado |
| --- | --- |
| PIX com aba fechada ⇒ um `purchase` no DebugView | **não provado** (o fecho não percorreu o `purchase` ponta a ponta nem abriu o DebugView) — passo de operação pendente |
| webhook reenviado ⇒ sem segundo `purchase` (dublê) | ✅ `handlers.test.ts` "webhook reentregue", "CORRIDA…" |
| recusa ⇒ zero requisições a GA/GTM | ✅ navegador do fecho (`collectAfterNav 0`, `collectAfterF5 0`) |
| anon não lê a chave (probe HTTP) | ✅ probe desta verificação |
| 390×844 sem rolagem e alvos ≥ 44px, painel e aviso | ✅ navegador do fecho (`store-proof.json`, `admin-proof.json`) |

---

## Discrimination Sensor

Arnês próprio (`scratchpad/verifier/mut.mjs`): aplica a mutação no **arquivo real**, roda só os
testes pertinentes (`pnpm --filter <ws> exec vitest run --testTimeout=20000 <padrão>`), restaura e
**compara byte a byte** (lança se divergir), e **lança se a string-alvo não for encontrada ou for
ambígua**. Todas as 79 restaurações conferiram idênticas.

**79 mutantes: 69 mortos por asserção · 1 morto por compilação · 9 sobreviventes**, dos quais
**5 são lacuna real**, 3 são equivalentes/inválidos e 1 só morre pelo guarda de texto.

| # | Alvo | Mutação | Resultado | Quem matou |
| --- | --- | --- | --- | --- |
| C1 | `core/analytics/ids.ts` | ID aceita 3+ caracteres | ✅ asserção | `ids.test` "recusa G-ABC" |
| C2 | `core/analytics/host.ts` | `www.` deixa de ser produção | ✅ asserção | `host.test` "o www…" |
| C3 | `core/analytics/items.ts` | item espalha a entrada | ✅ asserção | `items.test` (16 casos) |
| C4 | `core/analytics/purchase.ts` | sem chave ⇒ envia | ✅ asserção | `purchase.test` "sem chave (CMP-06)" |
| C5 | idem | corpo sem `traffic_type` | ✅ asserção | `purchase.test` CMP-08 |
| C6 | idem | `client_id` sintético aleatório | ✅ asserção | "é determinístico" |
| C7 | `core/product/displayCategory.ts` | desempate por `position` invertido | ✅ asserção | "empate em sort_order ⇒ menor position" |
| C8 | idem | categoria inativa concorre | ✅ asserção | "categoria INATIVA é null" |
| C9 | `core/analytics/events.ts` | `index` da entrada ignorado | ✅ asserção | "página 2 começa no 24" |
| **C10** | `core/hooks/useStoreSettings.ts` | recuo do hook ⇒ `enabled: true` | ❌ **SOBREVIVEU** | — |
| C11 | `purchase.ts` | recusa ignorada | ✅ asserção | "ligado + chave + recusou" |
| F1 | `checkout/handlers.ts` | id do GA aceita qualquer texto | ✅ asserção | "id fora do formato (letra)…" |
| F2 | idem | `analytics_declined` por truthiness | ✅ asserção | "recusa que não é booleano estrito" |
| F3 | idem | ids não entram no pedido (fiação) | ✅ asserção | 9 casos |
| F4 | `mercado-pago/analytics.ts` | reivindicação sem `is null` | ✅ asserção | 24 casos (o dublê enxerga o filtro) |
| F5 | idem | não-2xx gravado `sent` | ✅ asserção | "resposta não-2xx ⇒ failed" |
| **F6** | idem | log com `err.message` em vez de `err.name` | ❌ **SOBREVIVEU** | — |
| F7 | idem | desconto sem promoção e Pix | ✅ asserção | "o corpo é o esperado, campo a campo" |
| F8 | `mercado-pago/handlers.ts` | webhook envia sem `applied` | ✅ asserção | "webhook reentregue" |
| F9 | idem | cartão aprovado não envia (fiação) | ✅ asserção | "cartão aprovado AGORA" |
| F10 | idem | `try` → `if (true)` | ⚠️ **compilação** (mutante inválido meu) | arquivo não carregou |
| F10b | idem | `firePurchase` relança o erro | ✅ asserção | "sendPurchase que LANÇA" ×2 |
| F11 | `analytics.ts` | erro pós-reivindicação deixa `sending` | ✅ asserção | "erro inesperado DEPOIS de reivindicar" |
| F12 | `google-analytics/handlers.ts` | `status` devolve o valor | ✅ asserção | "o CORPO INTEIRO é só isso" |
| F13 | idem | GET passa sem auth | ✅ asserção | 4 casos de autorização |
| F14 | idem | aceita espaço no meio | ✅ asserção | "recusa com espaço no meio" |
| F15 | idem | log do sucesso com a chave | ✅ asserção | "o log do sucesso também não carrega a chave" |
| **F16** | `_shared/auth.ts` | `has_role` nulo (sem erro) vira permissão | ❌ **SOBREVIVEU** | — |
| S1 | `shared/lib/analytics/index.ts` | corpo do laço trocado, guarda intacta | ⚪ inválido (equivalente — guarda continuou) | — |
| S1b | idem | guarda `canMeasure` da fila removida | ✅ asserção | "com recusa, a fila é descartada" |
| S2 | idem | Google Signals ligado | ✅ asserção | config `toEqual` |
| S3 | idem | `ga-disable` nunca ligado | ✅ asserção | applyConsent + CookieNotice |
| S4 | idem | só `_ga` apagado | ✅ asserção | clearGaCookies |
| S5 | idem | `session_id` formato novo não lido | ✅ asserção | gaIds formato novo |
| S6 | idem | evento sem `traffic_type` | ✅ asserção | traffic_type navegador |
| S7 | `cookieConsentStore.ts` | recusa não apaga cookies | ✅ asserção | cookieConsentStore:89 |
| S8 | idem | o X recusa | ✅ asserção | "o X também fecha… NÃO recusa" |
| S9 | idem | recusa não vale na visita seguinte | ✅ asserção | cookieConsentStore:89 |
| S10 | `CookieNotice.tsx` | aviso aparece no pagamento PIX | ✅ asserção | "telas de dinheiro" |
| S11 | `CookiePreferencesSheet.tsx` | Estatísticas com medição desligada | ✅ asserção | AVS-02 |
| S12 | idem | voltar não fecha a folha | ✅ asserção | "o gesto de voltar fecha a folha" |
| S13 | `AnalyticsLoader.tsx` | gtag carregado com medição desligada | ✅ asserção | "medição desligada ⇒ nenhum script" |
| S14 | `App.tsx` | `PageViewTracker` fora do App (fiação) | ✅ asserção | 5 casos pelo App real |
| S15 | `App.tsx` | `setPreviewMode(false)` | ⚪ equivalente | na prévia o carregador não monta: a fila nunca é esvaziada nem o gtag carregado |
| S16 | `PageViewTracker.tsx` | query string vira página | ✅ asserção | "mudança SÓ de query string" |
| S17 | `useTrackList.ts` | índice relativo à leva | ✅ asserção | "a leva seguinte… índice na lista" |
| S18 | idem | rerender repete | ✅ asserção | idem |
| S19 | `ProductCard.tsx` | `select_item` com o índice do card | ✅ asserção | RelatedProducts |
| S20 | `useProductPurchase.tsx` | `add_to_cart` com quantity 1 | ✅ asserção | "quantidade 3 ⇒ UM evento" |
| S21 | `CartDrawerRow.tsx` | quantidade que fica | ✅ asserção | "diminuir de 3 para 1" |
| S22 | `CartDrawer.tsx` | sacola vazia emite | ✅ asserção | "abrir a sacola VAZIA" |
| S23 | `toggleWishlist.ts` | desfavoritar emite | ✅ asserção | produto e sacola |
| S24 | `SearchOverlay.tsx` | overlay não emite `search` | ⚠️ sobreviveu a `buscaMedida` | — |
| S24b | idem (com `medicaoComDonoUnico`) | idem | ✅ asserção — **só pelo guarda de texto** | metade positiva |
| S25 | `CheckoutPage.tsx` | `useBeginCheckout([])` | ✅ asserção | EVT-10 |
| S26 | `DeliveryBlock.tsx` | `shipping_tier` fixo | ✅ asserção | EVT-11 |
| S27 | `PaymentBlock.tsx` | cartão medido como pix | ✅ asserção | EVT-12 |
| S28 | `CheckoutPage.tsx` | recusa não viaja | ✅ asserção | CMP-01 com recusa |
| S29 | `buildOrderPayload.ts` | com recusa o `client_id` viaja | ✅ asserção | CMP-01 com recusa |
| **S30** | `PrivacyPolicyPage.tsx` | "Não enviamos…" → "Enviamos ao Google o seu nome, e-mail, telefone, CPF, endereço e o texto gravado" | ❌ **SOBREVIVEU** | — |
| **S31** | idem | "legítimo interesse" → "seu consentimento" | ❌ **SOBREVIVEU** | — |
| S32 | `Footer.tsx` | link não abre a folha | ✅ asserção | AVS-06 |
| S33 | `mapProduct.ts` | `nuvemshop_id` não mapeado | ✅ asserção | cardSelect/mapProduct |
| S34 | idem | card select sem `nuvemshop_id` | ✅ asserção | cardSelect |
| S35 | `CartDrawer.tsx` | `window.gtag(` num widget | ✅ asserção | EVT-15 guarda |
| S36 | idem | `'purchase'` montado na loja | ✅ asserção | CMP-09 guarda |
| S37 | `shared/lib/analytics/items.ts` | `item_category` volta à coluna legada | ✅ asserção | itemCategoryParity (7) |
| S38 | `CookieNotice.tsx` | aviso nomeia o Google | ✅ asserção | texto EXATO |
| S39 | `AnalyticsLoader.tsx` | `applyConsent()` do carregador removido | ⚪ equivalente | `persistir` da store já o chama; com recusa persistida `canMeasure` não carrega o gtag |
| B1 | `AnalyticsPanel.tsx` | ligar apaga `production_host` | ✅ asserção | "ESPALHANDO o valor atual" |
| B2 | idem | régua sobre o rascunho | ✅ asserção | "a régua é sobre o ID GRAVADO" |
| B3 | idem | aviso sem leitura concluída | ✅ asserção | "leitura em curso ou falha" |
| B4 | `AnalyticsSecretField.tsx` | valor fica no estado após guardar | ✅ asserção | "o valor NÃO fica no DOM" |
| B5 | `useLastPurchaseSend.ts` | as duas contagens contam falha | ✅ asserção | 2 casos |
| B6 | idem | último envio é o mais antigo | ✅ asserção | "o `sent` mais recente" |
| B7 | backoffice `App.tsx` | redirect sem `replace` | ✅ asserção | rotasDoGoogle |
| B8 | `AdminGooglePage.tsx` | Shopping mostra o estado do Analytics | ✅ asserção | 3 casos |
| B9 | `LastPurchaseCard.tsx` | número sem `formatOrderNumber` | ✅ asserção | "número já com # não ganha o segundo" |
| B10 | idem | literal da ausência | ✅ asserção | ANL-11 |

### Por que cada sobrevivente sobreviveu

- **S30 / S31 — `PRV-01` sem o literal.** O guarda da política conta títulos e confere o nome da
  seção; nenhum teste lê o corpo. Reescrever a seção para afirmar o **oposto** (que nome, e-mail, CPF e
  a gravação vão ao Google; que a base é consentimento) deixa 46/46 verdes. É `L-036` exato: a AC tem
  duas metades — a seção existe **e** diz X —, e só a primeira tem asserção.
- **F6 — dublê que não enxerga.** O teste de log (`analytics.test.ts:349`) é verdadeiro nos dois
  mundos porque `createFakeFetch({ networkError: true })` rejeita com uma mensagem que **não contém a
  URL**. O `fetch` real do Deno rejeita com `error sending request for url (…)` — com a query string,
  e nela o `api_secret`. Hoje o código registra só `err.name` (correto), mas nada impede a troca por
  `err.message`, que vazaria a chave secreta no log de produção.
- **C10 — o recuo do hook não é exercitado.** Os casos de `useStoreSettings.test.ts:171,200` passam
  por `fetchAllSettings`, que devolve defaults em erro. A linha `data?.analytics ?? DEFAULT_ANALYTICS`
  (o estado antes da leitura, ou uma rejeição do `queryFn`) não tem caso: trocá-la por "ligado" deixa
  75/75 verdes. Na loja, isso faria a folha mostrar "Estatísticas" durante a carga; numa rejeição de
  rede, o carregador (`isFetched` vira verdadeiro) carregaria o gtag com a medição desligada no banco.
- **F16 — `has_role` que devolve `null` sem erro.** O teste "autenticada sem papel" usa `false`.
  `isAdmin !== true` → `isAdmin === false` deixa 112/112 verdes. Risco prático baixo (`has_role` é
  `exists(...)`, nunca nulo), mas é o dono único de autorização de **quatro** functions.
- **S24 — o `search` do overlay só é provado por texto.** Comportamento não medido em
  `buscaMedida.test.tsx`; quem o segura é a metade positiva de `medicaoComDonoUnico` (regex de
  chamada). Proxy aceitável, registrado.

---

## Spec-precision gaps

1. **`CMP-02` — `transaction_id` = "número do pedido".** O código manda o `order_number` **cru**
   (`0244`, `NS-169`, sem `#`), enquanto o `design.md` (Code Reuse) diz `formatOrderNumber`. A escolha
   está justificada em comentário (`core/analytics/purchase.ts`) e provada em `purchase.test.ts:102,107`,
   mas **sem `// SPEC_DEVIATION`** (`L-026`) e sem a spec/design atualizados. Consequência real: o
   `transaction_id` do GA4 não bate com o "#0244" que aparece no painel e no e-mail.
2. **`EVT-11` × `EVT-12` usam políticas opostas para "escolhido".** O frete conta a **pré-seleção**
   automática do mais barato (`DeliveryBlock.tsx`, efeito sobre `serviceName`); o pagamento conta **só
   o toque** (`PaymentBlock.tsx`). As duas são defensáveis; a spec não diz qual, e a divergência entre
   irmãos do mesmo funil não está registrada.
3. **`EVT-12` `payment_type`, `EVT-16/17` `method`, `ANL-04` frase** — valores não fixados pela spec
   (`PIX`/`Cartão de crédito`, `codigo`/`senha`/`google`, "Falta o ID de medição…"). Os testes fixam o
   que o código faz; ninguém pode dizer se é o que a dona espera ler no relatório.
4. **`ANL-06` mistura dois sujeitos** ("o banco **ou** o servidor SHALL recusar"). Provado nos dois,
   mas a AC aceitaria um só.

---

## O que só o navegador prova

Medido **no fecho (T26)**, Chrome real, 390×844 e 1440 (`scratchpad/store-proof.json`,
`admin-proof.json`, 20 capturas). Conferi os JSON; não repeti a sessão.

| Item | Provado? |
| --- | --- |
| aviso: rolagem horizontal zero (390/390), alvos 44 (X, Preferências, interruptor, Salvar), Aceitar 168×48 | ✅ |
| aviso não cobre a barra de compra (`elementFromPoint` = botão) | ✅ |
| aviso ausente no checkout | ✅ |
| percurso: `view_item_list`, `page_view`, `select_item`, `view_item`, `add_to_cart`, `view_cart`, `begin_checkout`, `search` na fila; `item_id` = id Nuvemshop, `item_category` = slug | ✅ |
| recusa ⇒ cookies apagados, **0** `/g/collect` depois de navegar e depois de F5 | ✅ |
| painel `/admin/google`: links 44px, sem rolagem, redirect legado, chave "Guardada no servidor" após recarregar | ✅ |
| `add_shipping_info` / `add_payment_info` no navegador | **não** (só jsdom) |
| `purchase` ponta a ponta (webhook real → `/mp/collect`) | **não** |
| DebugView do GA4 | **não** |

> Nota de leitura: `dataLayerPageViews` do `store-proof.json` lista o produto duas vezes e não lista a
> categoria. É artefato do arnês do fecho (o `path` é o `location.pathname` **na hora da colheita**,
> não o `page_location` do evento), não defeito do `PageViewTracker`.

---

## Lacunas ranqueadas (fix tasks — todas de TESTE)

1. **`PRV-01` sem literal** — em `PrivacyPolicyPage.test.tsx`, asserir os três parágrafos de "Medição
   de audiência" por texto exato (Apêndice A), com o inverso que reprova "enviamos … nome". Mata S30/S31.
2. **`CMP-07` log da chave contra dublê cego** — em `mercado-pago/__tests__/analytics.test.ts:349`,
   um cenário em que o `fetch` rejeita com `new TypeError('error sending request for url (' + url + ')')`
   (a forma do Deno) e a asserção de que nenhuma linha contém `api_secret`/`CHAVE`. Mata F6.
3. **Recuo do hook `useAnalyticsSettings`** — caso com o `queryFn` **rejeitando** (e um com `data`
   ainda indefinido) asserindo `enabled: false`. Mata C10.
4. **`requireAdmin` com `has_role` → `{ data: null, error: null }`** ⇒ 403. Mata F16.
5. **`SPEC_DEVIATION` em `purchase.ts`** e decisão escrita sobre `transaction_id` cru × `#0244`;
   alinhar `design.md`.
6. Menores: caso de troca de ID (`loadGtag` com outro ID configura o novo sem segundo script);
   `search` do `SearchOverlay` por comportamento; registrar na spec a política de "escolhido" de
   `EVT-11`/`EVT-12`.

---

## Lições candidatas

- **(`L-036` de novo, em política)** AC de texto jurídico com "o texto aprovado" é AC de literal: um
  guarda que conta seções e confere títulos aprova a seção reescrita para afirmar o oposto. A régua
  de política precisa ler o **corpo**.
- **(dublê cego, forma nova)** "Nenhum log contém a chave" só discrimina se o dublê produz o erro
  **com a forma do runtime real** — o `fetch` do Deno embute a URL na mensagem; um `networkError`
  genérico torna a asserção verdadeira nos dois mundos.
- **Recuo de hook só por função vizinha**: provar "falha ⇒ desligado" pela função de busca que já
  devolve defaults deixa sem dente o `?? DEFAULT` do hook, que é o caminho da rejeição real.
- **Autorização boolean-estrita precisa do caso `null`**: `!== true` × `=== false` são iguais com
  `true/false` e opostos com `null`; o dono único de admin merece o terceiro valor.
- **Mutante do arnês**: classificar compilação × asserção por presença de "N failed" nomeado, não por
  palavra-chave no log — a primeira classificação desta verificação marcou como "compilação" todas as
  mortes que tinham caso nomeado reprovando (reclassificadas à mão pela linha `Tests N failed`; a única
  morte por carga de arquivo foi F10).

---

## Summary

**Overall**: ⚠️ Issues — comportamento correto, cobertura com 5 buracos reais.
**Spec-anchored**: 48 requisitos verificados; **1 lacuna P1** (`PRV-01` corpo), **1 parcial**
(`CMP-07` log), 4 gaps de precisão.
**Sensor**: 79 injetados · 69 mortos por asserção · 1 por compilação · 9 sobreviventes (5 reais,
3 equivalentes/inválidos, 1 só por guarda de texto).
**Gate**: 11734 / 593 verdes, tipos 0 · 0, `payment/**` intocado.

---

# Rodada 2 — 2026-10-06

**Veredito: ❌ FAIL — por cobertura.** Nenhum defeito de produto encontrado. Os **cinco**
sobreviventes da rodada 1 (S30, S31, F6, C10, F16) morreram, os cinco por **asserção**. O
comportamento mudado entre as rodadas (`EVT-11`: o frete passou a medir só o toque) está correto
contra o texto novo da spec e preso nos dois sentidos (D1 e D2/D3/D4/D6 mortos). O FAIL vem de
**quatro buracos de teste em ACs P1**, achados ao procurar o buraco do conserto e a vizinhança dele
(A1, E2, D8, D9) — um deles numa AC **alterada nesta rodada** (`ANL-04`, que passou a fixar texto
exato).

**Verifier**: sub-agente independente, rodada 2. Toda linha abaixo foi medida nesta sessão.

## Arnês

`scratchpad/verifier/r2/mut2.mjs`: aplica a mutação no **arquivo real**, roda os testes pertinentes
(`pnpm --filter <ws> exec vitest run --testTimeout=20000 <padrão>`), restaura e confere o **SHA-256**
do arquivo antes × depois (lança se divergir); lança se o alvo não for achado, se for ambíguo, ou se
a mutação for no-op. **Classificação só pela linha `Tests N failed`**: exit ≠ 0 com N > 0 = asserção;
exit ≠ 0 sem essa linha = compilação. As 34 restaurações (28 mutantes + 6 remedições) conferiram o
SHA, e `git status --short` ficou idêntico antes e depois.

Os sobreviventes de padrão estreito foram **remedidos contra a suíte INTEIRA da loja** (`src/`,
270 arquivos / 4549 casos) para descartar morte em arquivo não previsto — sufixo `w` na tabela.

## Os cinco sobreviventes da rodada 1

| # | Mutação (idêntica à da rodada 1) | Resultado | Quem matou |
| --- | --- | --- | --- |
| C10 | recuo do hook `useAnalyticsSettings` ⇒ `enabled: true` | ✅ **asserção** (2 failed) | `useStoreSettings.test.ts` "leitura ainda PENDENTE ⇒ DESLIGADO" e "`queryFn` que REJEITA ⇒ DESLIGADO" |
| F6 | log com `err.message` em vez de `err.name` | ✅ **asserção** (2 failed) | `mercado-pago/__tests__/analytics.test.ts` "rede que cai com a URL na mensagem ⇒ `failed`, e NENHUM log tem a chave ou a query" — o dublê agora rejeita com a forma do Deno |
| F16 | `has_role` nulo vira permissão (`!== true` → `=== false`) | ✅ **asserção** (4 failed) | `_shared/__tests__/auth.test.ts` "has_role devolvendo null sem erro → 403" |
| S30 | "Não enviamos…" → "Enviamos ao Google o seu nome…" | ✅ **asserção** (2 failed) | `PrivacyPolicyPage.test.tsx` "três parágrafos aprovados, na ordem" + "não afirma que a loja ENVIA" |
| S31 | "legítimo interesse" → "seu consentimento" | ✅ **asserção** (2 failed) | idem + "a base legal é o legítimo interesse" |

## Mutantes novos (o buraco do conserto e a vizinhança)

| # | Alvo | Mutação | Resultado | Quem matou / por que sobreviveu |
| --- | --- | --- | --- | --- |
| D1 | `DeliveryBlock.tsx`, efeito | a pré-seleção TAMBÉM emite (toque **e** efeito) | ✅ asserção | "EVT-11: a pré-seleção automática (opção única) NÃO emite" |
| D2 | `select` | emite com o nome da opção **anterior** | ✅ asserção | "EVT-11: tocar numa opção ⇒ … SEDEX" |
| D3 | `select` | toque não emite | ✅ asserção | "EVT-11: tocar…" + metade positiva de `medicaoComDonoUnico` |
| D4 | `select` | toque emite duas vezes | ✅ asserção | `toHaveLength(1)` |
| D5 / D5w | `select` | re-toque na opção **já** selecionada não emite | ❌ **sobreviveu** (suíte inteira) | spec-precision — ver abaixo |
| D6 | `select` | `shipping_tier` = `serviceId` | ✅ asserção | `.toBe('SEDEX')` |
| D7 / D7w | `checkoutAnalytics.ts` | `add_shipping_info` sem o cupom | ❌ **sobreviveu** (suíte inteira) | spec-precision — ver abaixo |
| D8 / D8w | idem | `add_shipping_info` com `items: []` | ❌ **sobreviveu** (suíte inteira) | **lacuna** (`EVT-13`) |
| D9 / D9w | idem | `add_payment_info` com `items: []` | ❌ **sobreviveu** (suíte inteira) | **lacuna** (`EVT-13`) |
| D10 / D10w | idem | `begin_checkout` sem o cupom | ❌ **sobreviveu** (suíte inteira) | spec-precision — ver abaixo |
| E1 | `core/analytics/events.ts` | rótulo `PIX` → `Pix` | ✅ asserção | `events.test.ts` "EVT-12 … payment_type do PIX e do cartão" |
| E2 | `PaymentBlock.tsx` | tocar em **PIX** mede `card` | ❌ **sobreviveu** | **lacuna** (`EVT-12`, metade PIX) |
| G1 | `loadGtag` | configuração nunca leva `traffic_type` | ✅ asserção | "fora do host de produção, a CONFIGURAÇÃO leva traffic_type" |
| G2 | idem | configuração SEMPRE leva (inclusive produção) | ✅ asserção | "no host de produção … SEM traffic_type" (`toEqual`) |
| G3 | idem | configuração ignora `production_host` | ✅ asserção | idem |
| G4 | idem | régua invertida | ✅ asserção (2 failed) | os dois casos |
| G5 | `enviar` | evento manual perde `traffic_type` | ✅ asserção | "fora do host de produção, todo evento leva traffic_type=internal" |
| G6 | `loadGtag` | `traffic_type: 'interno'` | ✅ asserção | `toEqual` da configuração |
| G7 / G7w | `AnalyticsLoader.tsx` | `loadGtag` chamado com a configuração do módulo ainda nula (a config sairia `internal` **em produção**) | ❌ **sobreviveu** (suíte inteira) | lacuna menor — ver abaixo |
| A1 | backoffice `AnalyticsPanel.tsx` | a 2ª frase do texto de `ANL-04` trocada ("Ligue de novo mais tarde.") | ❌ **sobreviveu** | **lacuna** (`ANL-04`, texto exato) |
| P3 | `PrivacyPolicyPage.tsx` | "O Google recebe o seu nome…" (sem a palavra "envia") | ✅ asserção | "três parágrafos aprovados" |
| P4 | idem | quarto parágrafo ("usamos para anúncios") | ✅ asserção | idem (`toEqual` da lista) |
| P5 | idem | some "nada mais é enviado do seu navegador" | ✅ asserção | idem |

**Total da rodada 2: 28 mutantes** (5 reinjetados + 23 novos) · **20 mortos por asserção** ·
**0 por compilação** · **8 sobreviventes**: **4 lacunas** (A1, E2, D8, D9), **1 lacuna menor** (G7)
e **3 spec-precision** (D5, D7, D10). Nenhum equivalente.

### A régua nova do "envia" da política

Provada fora da suíte (`r2/rx.mjs`, a mesma expressão): sobre o texto **atual** da seção devolve
`null`; acusa "Enviamos ao Google…", "Os dados enviados ao Google…", "A loja envia…", "NÃO SÓ
enviamos…" e "não enviamos e enviamos o CPF"; poupa "Nós não enviamos…" e "NÃO enviamos". **Não**
vê "enviar", "envio", "enviaremos" nem "mandamos" — aceitável porque a asserção forte é a igualdade
dos três parágrafos (P3, P4, P5 morreram por ela); a régua do "envia" é reforço. Ressalva: o
**sensor** dela redeclara o regex como literal em vez de usar a mesma constante da asserção — se
alguém mudar uma, a outra não acompanha.

### Por que cada sobrevivente sobreviveu

- **A1 — `ANL-04` fixa o texto, o teste não.** A spec agora diz *"o texto exato, 'Falta o ID de
  medição. Grave um ID válido no campo abaixo antes de ligar.'"*. O teste compara o DOM com a
  constante **importada** (`toBe(MISSING_ID_REFUSAL)`) e confere a constante só por
  `/Falta o ID de medição/`. Trocar a segunda frase deixa 38/38 verdes — o padrão do `PIX_SLOW_MS`
  da `58`: teste que importa a própria constante mede o componente contra si mesmo.
- **E2 — `EVT-12` provado só pela metade do cartão.** O caso da loja toca só em "cartão"; a rodada 1
  matou o mutante cartão→pix (S27), e ninguém prendeu o inverso. Tocar em PIX e medir `Cartão de
  crédito` deixa 189/189 verdes.
- **D8 / D9 — os itens dos eventos de funil nunca são asseridos na loja.** `add_shipping_info` e
  `add_payment_info` saindo com `items: []` deixam a suíte inteira da loja verde (4549/4549). Os casos
  de `EVT-11`/`EVT-12` conferem só `shipping_tier`/`payment_type`. Consequência real: as duas etapas
  do meio do funil sem produto no GA4. Pré-existente, não criado pelo conserto.
- **G7 — o `traffic_type` da configuração depende da ORDEM implícita no carregador.** `loadGtag` lê
  `settings` do módulo; o `AnalyticsLoader` grava antes de chamar, e nenhum teste pelo App confere a
  configuração num host de produção. Um rearranjo que chame `loadGtag` com o estado ainda nulo faria
  **todos** os eventos automáticos de produção saírem `internal` — sumindo dos relatórios — com a
  suíte verde. O mutante é artificial; o buraco é real e nasceu com o acréscimo do `traffic_type` na
  configuração.
- **D5 — re-toque na opção já selecionada.** O código emite (cada toque é um toque — a leitura
  literal de `EVT-11`, e o que `PaymentBlock` também faz). Suprimir o re-toque sobrevive porque
  nenhum caso toca duas vezes. A spec não diz se re-tocar a mesma opção é escolha nova.
- **D7 / D10 — o cupom no `add_shipping_info` e no `begin_checkout`.** O comentário de
  `checkoutAnalytics.ts` promete o mesmo cupom nos três eventos; o texto de `EVT-10`/`EVT-11` não
  nomeia cupom. Sem asserção na loja.

## Conferência das ACs alteradas

| AC | Texto da spec (rodada 2) | Código | Teste | Resultado |
| --- | --- | --- | --- | --- |
| CMP-02 | `transaction_id` = `order_number` **cru**, sem `#` (decisão registrada) | `core/analytics/purchase.ts:131` | `purchase.test.ts:102,107` (`'0244'`, `'NS-169'`, nunca `#`) | ✅ — gap de precisão 1 da rodada 1 fechado por decisão escrita; `design.md:71,115` alinhado |
| EVT-11 | só o **toque**; pré-seleção e rascunho não emitem | `DeliveryBlock.tsx` `select` → `trackShippingInfo(option.serviceName)`; o efeito não emite | `CheckoutPage.test.tsx:2543,2554,2563`; D1–D4, D6 mortos | ✅ — "a mais barata do endereço salvo" não tem caso próprio, mas passa pelo mesmo efeito que D1 prova |
| EVT-12 | toque em PIX ou cartão, `PIX`/`Cartão de crédito` exatos; pré-seleção não emite | `PaymentBlock.tsx:209-242` | `CheckoutPage.test.tsx:2572,2581`; `events.test.ts:129` | ❌ **parcial** — metade PIX não presa na loja (E2) |
| EVT-13 | todo evento com itens leva o item no formato | `itens()` em `checkoutAnalytics.ts` | formato provado em `core` e `itemCategoryParity`; nos eventos de funil da loja só `begin_checkout` | ❌ **parcial** — D8/D9 |
| EVT-16 | `login` com `codigo`/`senha`/`google` | `useAuthFlow.ts` | `authAnalytics.test.tsx:52,86,102` (`toEqual` exato) | ✅ — gap de precisão da rodada 1 fechado pela spec |
| EVT-17 | `sign_up` só `codigo` | idem | `authAnalytics.test.tsx:61` | ✅ |
| ANL-04 | texto **exato** fixado | `AnalyticsPanel.tsx:39` (bate com a spec) | `AnalyticsPanel.test.tsx:126-127` | ❌ **lacuna** — A1 |
| AVS-07 | ausente em `/checkout` e `/pedido/:id/pagamento`, volta fora | `CookieNotice` | `CookieNotice.test.tsx:120,132`; `app/__tests__/analytics.test.tsx:193,199,205` | ✅ |

`traffic_type` na configuração (`CMP-08` estendido aos eventos automáticos): os dois sentidos presos
por `toEqual` (G1–G4, G6 mortos); o evento manual continua levando (G5 morto). A ordem no
carregador não é presa (G7). Documento: a spec cobre "todo evento" (tabela de decisões); o
`design.md:124` ainda descreve o `traffic_type` só no envio manual.

## Gates (medidos nesta rodada, um por vez, exit code fora de pipe)

| Medida | Resultado |
| --- | --- |
| core | **2662 / 109**, exit 0 (+2 sobre a rodada 1) |
| functions | **908 / 18**, exit 0 (+6) |
| store `--testTimeout=20000` | **4549 / 270**, exit 0 (+8) |
| backoffice `--testTimeout=20000` | **3119 / 173**, exit 0 (=) |
| catalog-import | **512 / 23**, exit 0 (=) |
| `tsc` store · backoffice | exit 0 · exit 0 |
| `pnpm lint` | backoffice **24 / 5** (turbo parou nele); store medido à parte **2 / 2** ⇒ **26 / 7**, igual à baseline |
| `pnpm build` | exit 0 |
| `git diff --name-only HEAD -- packages/core/src/payment` + não rastreados | **vazio** |

Total **11750 em 593** (+16 sobre a rodada 1, nenhuma queda de workspace).

## Lacunas restantes (fix tasks — todas de TESTE)

1. **`ANL-04`** — asserir o literal da spec na constante:
   `expect(MISSING_ID_REFUSAL).toBe('Falta o ID de medição. Grave um ID válido no campo abaixo antes de ligar.')`. Mata A1.
2. **`EVT-12` metade PIX** — tocar em PIX em `CheckoutPage.test.tsx` e esperar `payment_type: 'PIX'`. Mata E2.
3. **`EVT-13` nos eventos de funil** — asserir `params.items` nos casos de `add_shipping_info` e
   `add_payment_info`. Mata D8/D9.
4. **(menor) ordem do carregador × `traffic_type`** — caso pelo App real com `production_host` igual
   ao host do jsdom, asserindo a configuração **sem** `traffic_type`. Mata G7.
5. **(precisão)** decidir na spec: re-toque na mesma opção conta? (D5); o cupom é parte de
   `EVT-10`/`EVT-11`? (D7/D10). Se sim, um caso cada.
6. **(documento)** `design.md:124` mencionar o `traffic_type` na configuração do gtag; o sensor da
   régua do "envia" usar a mesma constante da asserção.

Fica de fora, como na rodada 1, o que só o navegador e a operação provam: `add_shipping_info` /
`add_payment_info` em navegador, `purchase` ponta a ponta e o DebugView.

## Summary (rodada 2)

**Overall**: ❌ FAIL por cobertura — 4 lacunas de teste em ACs P1 (`ANL-04`, `EVT-12`, `EVT-13` ×2),
nenhuma de produto.
**Rodada 1 fechada**: S30, S31, F6, C10, F16 — 5/5 mortos por asserção.
**Sensor**: 28 injetados · 20 por asserção · 0 por compilação · 8 sobreviventes (4 lacunas, 1 lacuna
menor, 3 spec-precision).
**Gate**: 11750 / 593 verdes, tipos 0 · 0, lint 26/7 (= baseline), build verde, `payment/**` intocado.

---

# Rodada 3 — 2026-10-06 (última do ciclo)

**Veredito: ✅ PASS.** Nenhum defeito de produto encontrado, nem nesta rodada nem nas anteriores. Os
**13** sobreviventes das rodadas 1 e 2 morreram, todos por **asserção**. Os **15** mutantes novos,
em áreas que as duas rodadas anteriores tinham amostrado pouco (aviso de cookies, apagamento dos
cookies do GA, favoritos, listagens, a function `google-analytics`, o payload do pedido, a
reivindicação do `purchase`, as rotas do painel), morreram todos por asserção. **Zero sobrevivente,
zero equivalente, zero morte por compilação.**

**Verifier**: sub-agente independente, rodada 3. Toda linha abaixo foi medida nesta sessão. Desde a
rodada 2, o worker mexeu só em testes e documentos (`AnalyticsPanel.test.tsx`,
`CheckoutPage.test.tsx`, `app/__tests__/analytics.test.tsx`, `PrivacyPolicyPage.test.tsx`, `spec.md`,
`design.md`). Os 13 reinjetados acharam o mesmo texto-alvo da rodada 2 no código de produção, o que
confirma que a produção não mudou entre as rodadas.

## Arnês

`scratchpad/verifier/r3/mut3.mjs`, cópia literal do `r2/mut2.mjs`: mutação no **arquivo real**,
`pnpm --filter <ws> exec vitest run --testTimeout=20000 <padrões>`, restauração com conferência de
**SHA-256** (lança se divergir), e lança se o alvo não for achado, se for ambíguo ou se a mutação for
no-op. **Classificação só pela linha `Tests N failed`.** As 28 restaurações conferiram o SHA, e
`git status --short` ficou **idêntico** antes e depois das duas baterias (diff vazio contra
`r3/status-before.txt`).

## Os 13 sobreviventes das rodadas 1 e 2, reinjetados com a mutação idêntica

| # | AC | Resultado | Quem matou |
| --- | --- | --- | --- |
| C10 | recuo do hook ⇒ ligado | ✅ asserção (2 failed) | `useAnalyticsSettings` "leitura ainda PENDENTE ⇒ DESLIGADO" |
| F6 | `CMP-07` log com `err.message` | ✅ asserção (2 failed) | "rede que cai com a URL na mensagem ⇒ `failed`, e NENHUM log tem a chave" |
| F16 | `has_role` nulo vira permissão | ✅ asserção (4 failed) | "has_role devolvendo null sem erro → 403" |
| S30 | `PRV-01` "Enviamos ao Google…" | ✅ asserção (2 failed) | "tem exatamente os três parágrafos aprovados, na ordem" |
| S31 | `PRV-01` base legal trocada | ✅ asserção (2 failed) | idem |
| **A1** | `ANL-04` 2ª frase trocada | ✅ **asserção** (1 failed) | "ANL-04: ligar SEM ID válido gravado é recusado, com a frase…" — o literal da spec agora está no teste |
| **E2** | `EVT-12` tocar em PIX mede cartão | ✅ **asserção** (1 failed) | "EVT-12: tocar em PIX ⇒ add_payment_info com payment_type PIX" |
| **D5** | `EVT-11` re-toque não emite | ✅ **asserção** (1 failed) | "EVT-11: tocar de novo na opção JÁ selecionada conta" — a spec agora decide (cada toque conta) |
| **D7** | `EVT-11` sem cupom | ✅ **asserção** (1 failed) | "EVT-11: com cupom aplicado, o add_shipping_info leva o código" |
| **D8** | `EVT-13` `add_shipping_info` com `items: []` | ✅ **asserção** (1 failed) | "EVT-11 + EVT-13: o add_shipping_info leva o item da sacola no formato do GA4" |
| **D9** | `EVT-13` `add_payment_info` com `items: []` | ✅ **asserção** (1 failed) | "EVT-12 + EVT-13: o add_payment_info leva o item…" |
| **D10** | `EVT-10` sem cupom | ✅ **asserção** (1 failed) | "EVT-10: com cupom aplicado, o begin_checkout leva o código" |
| **G7** | `CMP-08` ordem do carregador | ✅ **asserção** (1 failed) | `AnalyticsLoader pelo App` "CMP-08: no host de PRODUÇÃO, a configuração do gtag sai SEM traffic_type" |

## Mutantes novos (áreas pouco amostradas)

| # | Alvo | Mutação | Resultado | Quem matou |
| --- | --- | --- | --- | --- |
| N1 | `CookiePreferencesSheet.tsx` | "Salvar escolhas" sempre grava recusa | ✅ asserção | "sensor: salvar com Estatísticas LIGADA continua medindo" (medido no gtag) |
| N2 | `analytics/index.ts` `clearGaCookies` | apaga só `_ga`, deixa `_ga_<id>` | ✅ asserção | "apaga `_ga` e `_ga_<id>`, e deixa os outros" |
| N3 | `toggleWishlist.ts` | desfavoritar também emite (`EVT-08`) | ✅ asserção (2 failed) | "favoritar pela página ⇒ um evento; desfavoritar ⇒ nenhum" |
| N4 | `useTrackList.ts` | não memoriza os ids ⇒ reemite (`EVT-02`) | ✅ asserção | "a leva seguinte da rolagem infinita emite SÓ os itens novos" |
| N5 | function `google-analytics` `status` | `select('updated_at, value')` | ✅ asserção | "com chave guardada: configured + data, e o CORPO INTEIRO é só isso" |
| N5b | idem | resposta devolve `secret: value` | ✅ asserção (2 failed) | idem |
| N6 | `buildOrderPayload.ts` | com recusa, o `ga_client_id` vai mesmo assim (`CMP-01`) | ✅ asserção | "CMP-01: com RECUSA, o pedido diz analytics_declined true e não leva id nenhum" |
| N7 | `mercado-pago/analytics.ts` | reivindicação sem o filtro `is null` em `ga_purchase_status` | ✅ asserção (26 failed) | o caminho feliz inteiro — o dublê enxerga o filtro |
| N7c | idem | recusa da cliente ignorada (`declined: false`) (`CMP-04`) | ✅ asserção | "a cliente recusou ⇒ `skipped_declined`, zero fetch" |
| N8 | `GoogleSectionLinks.tsx` | toda seção marcada como corrente (`ANL-01`) | ✅ asserção | "a rota-mãe abre Analytics, marcada como a página corrente" |
| N9 | backoffice `App.tsx` | `/admin/google-shopping` sem `replace` | ✅ asserção (2 failed) | "o redirect usa `replace` — o endereço antigo não fica no histórico" |
| N10 | function `checkout` `idsDaMedicao` | `analytics_declined` aceita qualquer truthy (`CMP-01`) | ✅ asserção (3 failed) | "recusa que não é booleano estrito (texto "true") não grava nada" |
| N11 | `cookieConsentStore.ts` | fechar no X vira recusa (`AVS-03`) | ✅ asserção (2 failed) | "o X também fecha e persiste — e NÃO recusa" |
| N12 | `core/analytics/events.ts` `comCupom` | sem cupom, a chave `coupon` vai vazia (`EVT-10`) | ✅ asserção (3 failed) | "EVT-10 begin_checkout — sem cupom, sem a chave coupon" |
| N13 | `analytics/index.ts` `applyConsent` | `ga-disable-<ID>` invertido (`AVS-06`) | ✅ asserção | "recusa liga `ga-disable-<ID>`; aceite desliga" |

**Total da rodada 3: 28 mutantes** (13 reinjetados + 15 novos) · **28 mortos por asserção** · **0 por
compilação** · **0 sobreviventes**.

**Acumulado das três rodadas: 135 injeções** (79 + 28 + 28). Todo sobrevivente real das rodadas 1 e
2 morreu por asserção nesta rodada; os 3 equivalentes/inválidos da rodada 1 seguem declarados lá, com
o porquê.

## Conferência das ACs alteradas

| AC | Texto da spec | Código | Teste | Resultado |
| --- | --- | --- | --- | --- |
| EVT-10 | um `begin_checkout` por entrada; com cupom leva `coupon`; sem cupom **não leva a chave** | `checkoutAnalytics.ts` → `beginCheckoutEvent({ coupon: cupomAtual() })`; `comCupom` em `core` omite a chave vazia | `CheckoutPage.test.tsx:2562,2569`; `events.test.ts` | ✅ — D10 e N12 mortos (os dois sentidos) |
| EVT-11 | só o toque; pré-seleção e rascunho não emitem; **cada toque conta**, inclusive o re-toque; com cupom leva o código | `DeliveryBlock.tsx` `select` emite incondicional; o efeito não emite | `CheckoutPage.test.tsx:2584,2595,2605,2616,2626,2635` | ✅ — D1–D8 mortos entre as rodadas 2 e 3 |
| EVT-12 | toque em PIX ou cartão, `PIX`/`Cartão de crédito`; pré-seleção não emite; com cupom leva o código | `PaymentBlock.tsx` | `CheckoutPage.test.tsx:2644,2653,2665,2674,2685` | ✅ — E1, E2, D9 mortos; metade PIX presa |
| EVT-13 | todo evento com itens leva o item no formato | `itens()` em `checkoutAnalytics.ts` | os eventos do funil asserem `params.items` com `toEqual([ITEM_ESPERADO])` | ✅ — D8, D9 mortos |
| ANL-04 | texto exato *"Falta o ID de medição. Grave um ID válido no campo abaixo antes de ligar."* | `AnalyticsPanel.tsx` | `AnalyticsPanel.test.tsx:129,131` — o DOM **e** a constante comparados ao literal | ✅ — A1 morto |
| CMP-08 | fora do host de produção, `traffic_type=internal` em todo evento (configuração e evento manual) | `loadGtag` + `enviar`, lendo o que o `AnalyticsLoader` gravou antes | `app/__tests__/analytics.test.tsx:147,163` pelo App real, nos dois sentidos; `design.md:120-129` agora descreve os dois lugares e a ordem | ✅ — G1–G7 mortos |

Documentos: o sensor da régua do "envia" da política (`PrivacyPolicyPage.test.tsx:318`) agora usa a
**mesma constante** da asserção (`REGUA_DO_ENVIA`, linha 280) — o ponto da rodada 2 está fechado.

## Gates (medidos nesta rodada, um por vez, exit code fora de pipe)

| Medida | Resultado |
| --- | --- |
| core | **2662 / 109**, exit 0 (=) |
| functions | **908 / 18**, exit 0 (=) |
| store `--testTimeout=20000` | **4559 / 270**, exit 0 (+10 sobre a rodada 2: os casos novos do funil e do App) |
| backoffice `--testTimeout=20000` | **3119 / 173**, exit 0 (=; o literal de `ANL-04` entrou em caso existente) |
| catalog-import | **512 / 23**, exit 0 (=) |
| `tsc` store · backoffice | exit 0 · exit 0 |
| `pnpm lint --continue` | backoffice **24 / 5** · store **2 / 2** ⇒ **26 / 7**, igual à baseline (o exit 1 é a baseline, não regressão) |
| `pnpm build` | exit 0 |
| `git diff --name-only HEAD -- packages/core/src/payment` + `git status --short` nele | **vazio** |

Total **11760 em 593** (+10 sobre a rodada 2; nenhuma queda de workspace).

## Lacunas restantes

Nenhuma de teste em AC P1. O que segue aberto é o que **jsdom não mede** e o que só a operação
prova, como já declarado nas rodadas 1 e 2:

- `add_shipping_info` / `add_payment_info` vistos em navegador real e no DebugView do GA4;
- `purchase` ponta a ponta (Measurement Protocol aceitando o corpo, com `transaction_id` cru);
- o filtro "Tráfego interno" do GA4 ativado (Apêndice B — passo de operação);
- a folha de preferências e o aviso em 390×844 (alvo de 44px, gesto de voltar em celular real).

## Lições candidatas (consolidadas das três rodadas)

- **AC de texto jurídico é AC de literal.** Um guarda que conta seções e confere títulos aprova a
  seção reescrita para afirmar o oposto; a régua de política precisa ler o **corpo** (S30, S31).
- **Teste que importa a própria constante mede o componente contra si mesmo.** Quando a spec fixa um
  texto ou um número, o teste escreve o literal da spec, além de comparar o DOM com a constante
  (A1; a mesma família do `PIX_SLOW_MS` da `58`).
- **Dublê cego, forma nova:** "nenhum log contém a chave" só discrimina se o dublê produz o erro com
  a forma do runtime real — o `fetch` do Deno embute a URL na mensagem (F6).
- **Recuo de hook não se prova pela função vizinha.** Falha ⇒ desligado precisa de caso com o
  `queryFn` rejeitando e com `data` indefinido, senão o `?? DEFAULT` do hook fica sem dente (C10).
- **Autorização boolean-estrita precisa do caso `null`**: `!== true` × `=== false` só divergem no
  terceiro valor (F16).
- **Metade de um par é a metade que sobrevive.** `EVT-12` preso só pelo cartão deixou o PIX livre
  (E2); o mesmo vale para "com cupom"/"sem cupom" (D10 × N12) — cada sentido pede caso próprio.
- **AC "todo evento leva itens" precisa de asserção em CADA evento**, não no primeiro do funil
  (D8, D9).
- **Dependência de ordem implícita entre dois módulos se prova pelo App real**, porque o teste do
  módulo grava o estado à mão e torna a ordem invisível (G7).
- **Sobrevivente de precisão devolve a pergunta à spec.** D5, D7 e D10 sobreviveram enquanto a spec
  era muda; com a decisão escrita (re-toque conta, cupom nos três), viraram casos e morreram.
- **Arnês de mutação:** classificar compilação × asserção pela linha `Tests N failed`, nunca por
  palavra-chave no log; restaurar por SHA-256 e lançar em alvo ausente ou no-op.

## Summary (rodada 3)

**Overall**: ✅ PASS — zero sobrevivente real em AC P1; nenhum defeito de produto em três rodadas.
**Rodadas 1 e 2 fechadas**: 13/13 sobreviventes mortos por asserção.
**Sensor**: 28 injetados · 28 por asserção · 0 por compilação · 0 sobreviventes.
**Gate**: 11760 / 593 verdes, tipos 0 · 0, lint 26 / 7 (= baseline), build verde, `payment/**`
intocado.
