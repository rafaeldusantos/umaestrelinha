# 88 — Validation

**Date**: 2026-10-30
**Spec**: `.specs/features/88-aviso-opcional-nas-acoes-do-pedido/spec.md`
**Diff range**: nada commitado. A árvore de trabalho de 2026-10-30 (`git status --porcelain`, menos `.specs/`): 47 arquivos modificados, 22 novos (inclusive `features/order-notice/**`).
**Verifier**: sub-agente independente (autor ≠ verificador). Não escreveu a feature, não consertou nada.

## Veredito: **FAIL ❌**

Há um defeito de produto (AVS-07 no gesto 6) e um mutante sobrevivente (CRG-09). O resto das ACs está coberto com evidência, e 47 dos 48 mutantes morreram por asserção.

---

## Gate (medido por este verificador)

Um workspace por vez, `--testTimeout=20000` sem o `--`, exit capturado fora de pipe.

| Medida | Resultado |
| --- | --- |
| core | 4990/192, exit 0 |
| functions | 1247/34, exit 0 |
| backoffice | 4694/257, exit 0 (rodado de novo e limpo depois do sensor; veja abaixo) |
| store | 6271/336, exit 0 (rodado de novo e limpo) |
| mobile-adm | 2281/140, exit 0 (rodado de novo e limpo) |
| tsc backoffice · mobile-adm · core | 0 · 0 · 11 (os 11 herdados) |
| eslint backoffice | 23 erros / 5 avisos (= baseline) |
| probe `01-aviso-pulado.sql` (banco local, 54442) | exit 0, 22 `ok —` |
| probe `02-motor.sh` | **não rodado por mim.** Ele sobe `supabase functions serve`, o que derrubaria o edge runtime local que outras sessões usam. Usei a saída de referência `02-motor.saida.txt`. O lado do motor está coberto por teste de unidade (os mutantes F1..F4 morreram) |

Contagem contra a T01 (`baseline.md`): backoffice +178/+13 · core +66/+2 · store +40/+1 · functions +17/+1 · mobile-adm +2/0. Nenhum teste removido. A reescrita de `AdminOrdersPage.test.tsx` (o lote de material agora passa pelo diálogo) muda comportamento que a spec mandou mudar, e não perdeu asserção.

> Incidente de método, declarado: o primeiro lote de mutantes rodou **por engano ao mesmo tempo** que a primeira medição do gate de backoffice/store/mobile-adm. Por isso os três workspaces foram medidos de novo depois do sensor, com a árvore parada: os números acima são os dessa segunda rodada, e são idênticos. Os logs dos mutantes foram conferidos: nenhuma morte veio de `timed out`, todas vieram de asserção.

---

## ACs ancoradas na spec

| AC | Resultado definido pela spec | Evidência (`file:line` — asserção) | Resultado |
| --- | --- | --- | --- |
| AVS-01 | diálogo antes de qualquer escrita | `apps/backoffice/src/pages/admin/AdminOrderPage.aviso.test.tsx:197` — `expect(registro.escritas).toEqual([])` e `invocacoes` vazio, com o diálogo aberto | ✅ |
| AVS-02 | mudança, caixa marcada, nome do e-mail, e-mail da cliente, verbo | `AdminOrderPage.aviso.test.tsx:200-202` (`'Pedido postado'`, `'Para lu.prado@example.com:'`, `'O pedido #1042 passa de Em Separação para Enviado.'`), botão `'Mudar para Enviado'` em `:211` | ✅ |
| AVS-03 | marcada ⇒ corpo de sempre | `:216` — `toEqual({ order_id: 'o1', trigger: 'order_status_changed' })` | ✅ |
| AVS-04 | desmarcada ⇒ `customer:false`; motor pula só `customer`, a dona sai | `:228` corpo com `customer: false`; `supabase/functions/send-notification/__tests__/dispatchSkip.test.ts:134,146,167` (RPC skip, zero provedor para a cliente, a dona sai por e-mail e push); `handlers.test.ts:1016` (`notify` ignora a opção); frase da caixa em `NoticeDialog.test.tsx:91` | ✅ |
| AVS-05 | Voltar/Esc/fora ⇒ nada; o seletor volta ao vazio | `AdminOrderPage.aviso.test.tsx:246,297`; Esc e clique fora em `NoticeDialog.test.tsx` (AVS-05) | ✅ |
| AVS-06 | zero previstos ⇒ sem diálogo e "nenhum aviso sai" | `:325` — `'Status: Pago · nenhum aviso sai nesta mudança'` | ✅ |
| AVS-07 | frase pelo desfecho real (4 formas) | `:208` (avisada), `:222` (caixa vence o `sent:true`), `:235` (não saiu), `:268` (já enviado); cancelamento `:423,:430,:437` | ❌ **defeito no gesto 6** (veja Gap 1). ⚠️ o texto difere: spec "o e-mail não saiu **—** o pedido foi alterado", código "o e-mail não saiu**;** o pedido foi alterado" |
| AVS-08 | caixa no diálogo de cancelamento; desligado ⇒ uma linha | `:394` (caixa, desmarcada ⇒ `customer:false`), `:451` (linha "desligado em Configurações → Notificações") | ✅ |
| AVS-09 | `cancelOrder` com `avisarCliente` | `:394`; mutante P9 morto | ✅ |
| AVS-10 | só o que teria saído grava `skipped`, por RPC só da service role | `dispatchSkip.test.ts:183,192,201` (desligado, pré-condição, sem e-mail ⇒ nem RPC); probe 01: `service_role executa`, `anon/authenticated NÃO` | ✅ |
| AVS-11 | `sent`/`pending` intocados; `failed`/`skipped` ⇒ `skipped` | probe 01 (`sent: skip devolve null`, `pending: … fica pending`, `failed ⇒ skipped`); `avisoPuladoSchema.test.ts`; D1 e D2 mortos pelo guarda **e** pelo probe | ✅ |
| AVS-12 | linha "Aviso à cliente não enviado: <nome>", "Você escolheu não avisar", avião de 44 px com nome acessível | `packages/core/src/orders/__tests__/history.test.ts:221`; `OrderHistory.test.tsx:42` (44×44), `:58`; app `ItensValoresEntregaHistorico.test.tsx:216` | ✅ ⚠️ "na hora do registro": a linha usa `sent_at ?? created_at`, e o upsert de `skip_order_notification` não atualiza `created_at`. Um `failed→skipped`, ou um segundo pulo do mesmo evento, mostra a hora ANTIGA, não a da escolha. Spec ambígua; não testado |
| AVS-13 | o avião chama `action=send`; sucesso/falha/desligado | `AdminOrderPage.aviso.test.tsx:530,540,548,554`; a mesma linha vai de `skipped` a `sent` no probe 01 (`o finish converte a linha que era skipped em sent`) | ✅ |
| AVS-14 | `customerNoticeFor` puro, `{send, alreadySent}` | `packages/core/src/notifications/__tests__/notice.test.ts:39-167`; C1..C5 mortos | ✅ |
| AVS-15 | shipped sem rastreio ⇒ `[]`; com ⇒ `['order_shipped']` | `notice.test.ts:40,44` | ✅ |
| AVS-16 | retirada pela regra do `orderStateFailure` | `notice.test.ts:94,100` | ✅ |
| AVS-17 | guarda com âncora, sensores e metade positiva | `apps/backoffice/src/shared/lib/__tests__/avisoComDonoUnico.test.ts`; G1 (injetar `const avisaCliente = order.status === 'shipped'` na página) morto | ✅ (a metade positiva exige `useGestoComAviso` + `aviso=` no lugar de "o diálogo de cancelamento chama"; é razoável, porque o diálogo recebe a previsão e não calcula) |
| AVS-18 | alcançável pelo Deno | `notifications/__tests__/purity.test.ts`; C12 (tirar o `.ts` de um import de `notice.ts`) morto | ✅ |
| AVS-19 | uma leitura, a contagem, "já recebeu", caixa do lote | `AdminOrdersPage.aviso.test.tsx:192,226`; P12 e P16 mortos | ✅ |
| AVS-20 | soma zero ⇒ sem diálogo | `:308,:349` | ✅ |
| AVS-21 | cartão: portão, estado só nele, desfecho em aviso | `:419,:444,:465,:482`; P26 morto | ✅ |
| AVS-22 | "Ver o e-mail" | `features/order-notice/__tests__/NoticeDialog.test.tsx:254,288` | ✅ |
| AVS-23 | sem diálogo ⇒ nenhum `skipped` | P29 (`gravar(false)` no caminho sem diálogo) morto; `OrderCancelDialog.test.tsx:84` | ✅ |
| AVS-24 | gatilho sem a opção reivindica `skipped` | probe 01 (`claim_order_notification reivindica a linha skipped`); `dispatchSkip.test.ts:234`; F3 morto | ✅ |
| CRG-01 | indicador + gerúndio + `aria-busy` | `ActionButton.test.tsx:24`; `AdminOrderPage.aviso.test.tsx:281`; P14 morto | ✅ |
| CRG-02 | outros controles desabilitados; o 2º clique não grava | `OrderNextStep.test.tsx:58`; `NoticeDialog.test.tsx:175` (duplo clique); P6 morto | ✅ |
| CRG-03 | `revalidar` sem `loading`; campo mantido | `useAdminOrder.revalidar.test.ts:105`; `AdminOrderPage.aviso.test.tsx:492`; P7 morto | ✅ (a rolagem e o foco só se provam em navegador, e não há prova em navegador) |
| CRG-04 | a releitura falha ⇒ o pedido fica, faixa com "Tentar de novo" | `useAdminOrder.revalidar.test.ts:133`; `AdminOrderPage.aviso.test.tsx:505`; P28 morto | ✅ |
| CRG-05 | a falha mantém o texto e diz o que não mudou | `OrderHistory.test.tsx:114`; P18 e P19 mortos | ✅ |
| CRG-06 | esqueleto na primeira carga | `AdminOrderPage.aviso.test.tsx:472` | ✅ |
| CRG-07 | o diálogo fecha só depois do desfecho; na falha, aberto | `:256`; `OrderCancelDialog.test.tsx:105`; P4 e P11 mortos | ✅ no pedido. ⚠️ **No lote o diálogo fecha AO CONFIRMAR** (`AdminOrdersPage.tsx`, `executar` devolve `null` na hora). É um conflito com CRG-10 (o progresso fica na barra que o diálogo cobriria). Está declarado só no `tasks.md`, sem `SPEC_DEVIATION` no código. Precisa da confirmação do usuário |
| CRG-08 | estado só na linha que reenvia | `OrderHistory.test.tsx:86,101`; P27 morto | ✅ |
| CRG-09 | região viva anuncia o gerúndio e o **resultado** | `ActionButton.test.tsx:202` (o hook isolado) | ❌ **P24 sobreviveu**: apagar `anunciar(frase)` de `concluir` (`useGestoComAviso.ts:123`) deixa a suíte verde. O resultado dos gestos nunca é lido na região viva por um teste da página nem do hook do gesto |
| CRG-10 | "Avançando 7 de 30…" com barra determinada | `AdminOrdersPage.aviso.test.tsx:361,394`; `OrderBulkBar.test.tsx`; P13 morto | ✅ |
| CRG-11 | resumo: mudaram, recusados, falharam, e-mails | `:242,:267`; `loteComAviso.test.ts` | ✅ |
| CRG-12 | a tabela fica, "Atualizando…" | `:361`; P15 e P20 mortos | ✅ |
| CRG-13 | linhas-esqueleto | `:497` | ✅ |

### Edge cases

- [x] configurações ainda não lidas ⇒ os padrões (`notice.test.ts`, *edge cases da spec*)
- [x] sem `customer_email` ⇒ `[]` (C2 morto)
- [x] voltar o status ⇒ sem diálogo (`notice.test.ts:85`, `AdminOrderPage.aviso.test.tsx:325`)
- [x] teto de 50 do lote (`acionarLote` corta em `BULK_LIMIT`; `loteComAviso.test.ts`)
- [~] o pedido muda em outra aba: o resultado vem de `emailSent` (A-09). Sem teste dedicado
- [~] "Avançar mesmo assim": passa por `mudarStatus`, o mesmo caminho. Sem teste dedicado

---

## Sensor de discriminação

Cada mutante: o arquivo copiado para o scratchpad, o original alterado, os testes relevantes rodados, o arquivo restaurado e o SHA-256 conferido (o harness lança se não bater). Para a migration, o probe 01 também rodou, porque ele reaplica o arquivo do disco.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| C1 | core `notifications/notice.ts` | sem o filtro de "já enviado" | morto (asserção) |
| C2 | idem | sem a checagem de `customer_email` | morto |
| C3 | idem | sem `orderStateFailure` | morto |
| C4 | idem | sem o filtro de público `customer` | morto |
| C5 | idem | `sentCustomerEvents` conta `skipped` | morto |
| C6 | core `orders/history.ts` | o ramo `skipped` nunca casa | morto |
| C7 | idem | o detalhe "Você escolheu não avisar" trocado | morto |
| C8 | core `order-actions/notify.ts` | `{cliente:false}` quando `avisarCliente` é `undefined` | morto |
| C9 | idem | `customer:false` some do corpo | morto |
| C10 | core `order-actions/status.ts` | a escolha não é repassada | morto |
| C11 | core `order-actions/materialTracking.ts` | idem | morto |
| C12 | core `notice.ts` | import sem `.ts` (Deno) | morto |
| F1 | `send-notification/dispatch.ts` | pula também os eventos da dona | morto |
| F2 | `handlers.ts` | a porta `notify` pode pular | morto |
| F3 | `handlers.ts` | pula com `customer` ausente | morto |
| F4 | `dispatch.ts` | o `null` da RPC tratado como pulado | morto |
| D1 | migration | o upsert sobrescreve `sent` | morto (guarda + probe: "sent: skip devolve null") |
| D2 | migration | o upsert sobrescreve `pending` | morto (guarda + probe) |
| P1 | `useGestoComAviso.ts` | a frase pelo `emailSent` antes da caixa | morto |
| P2 | idem | "já enviado" abre o diálogo | morto |
| P3 | `useNoticeGate.ts` | a caixa não volta marcada | morto |
| P4 | idem | o diálogo fecha também na falha | morto |
| P5 | `NoticeDialog.tsx` | Esc fecha durante a gravação | morto |
| P6 | `usePendingAction.ts` | sem a trava do 2º clique | morto |
| P7 | `useAdminOrder.ts` | `revalidar` liga `loading` | morto |
| P8 | `AdminOrderPage.tsx` | previsão sobre o estado ATUAL (não o de destino) | morto |
| P9 | idem | o cancelamento não repassa a caixa | morto |
| P10 | `OrderCancelDialog.tsx` | a caixa não volta marcada ao reabrir | morto |
| P11 | idem | fecha mesmo na falha | morto |
| P12 | `AdminOrdersPage.tsx` | o lote ignora os envios lidos | morto |
| P13 | `bulkMaterial.ts` | sem `onProgress` | morto |
| P14 | `ActionButton.tsx` | sem `aria-busy` | morto |
| P15 | `useAdminOrderList.ts` | `revalidar` liga `loading` | morto |
| P16 | `sentEmails.ts` | sem o filtro `status = sent` | morto |
| P17 | `AdminOrderPage.tsx` | o avião usa o reenvio cego (perde "desligado") | morto |
| P18 | `OrderHistory.tsx` | a nota esvazia na falha | morto |
| P19 | `AdminOrderPage.tsx` | o rastreio esvazia antes de gravar | morto |
| P20 | `AdminOrdersPage.tsx` | o lote relê como carga inicial | morto |
| P21 | `NoticeEmails.tsx` | a caixa não fica desabilitada durante a gravação | morto |
| P22 | `OrderHistory.tsx` | o nome acessível do avião sem o e-mail | morto |
| P23 | `OrderMaterialCard.tsx` | a chave do envelope trocada (o gerúndio no botão errado) | morto |
| **P24** | `useGestoComAviso.ts:123` | **o resultado não vai para a região viva** | **SOBREVIVEU** |
| P25 | `usePendingAction.ts` | o gerúndio não é anunciado | morto |
| P26 | `AdminOrdersPage.tsx` | o estado acende em todos os cartões | morto |
| P27 | `OrderHistory.tsx` | o estado acende em todas as linhas | morto |
| P28 | `useAdminOrder.ts` | a releitura falha vira erro de página | morto |
| P29 | `useGestoComAviso.ts` | o caminho sem diálogo grava `customer:false` | morto |
| G1 | `AdminOrderPage.tsx` | uma decisão de aviso à mão (`status === 'shipped'`) | morto pelo guarda AVS-17 |

**48 injetados · 47 mortos por asserção · 0 mortos por compilação · 1 sobrevivente · 0 equivalentes.**

### Probe de defeito (fora do sensor)

Dois testes temporários sobre a página real (o arnês de `AdminOrderPage.aviso.test.tsx`) rodaram e foram **apagados** em seguida:

1. **Gesto 6 (o código do envelope), "Material a caminho" ligado, caixa MARCADA, o motor respondendo `sent: true`.** O aviso disse `"Código de rastreio do material registrado — o e-mail não saiu; o pedido foi alterado"`. É **falso**: o e-mail saiu.
   - Causa: `useAdminOrders.setMaterialTracking` (`apps/backoffice/src/entities/order/api/useAdminOrders.ts:241-243`) devolve `{ ok: true, reason: null }` e descarta `r.emailSent`. O gesto então lê `emailSent === true` como falso.
   - O teste do card (`OrderMaterialCard.test.tsx:117`) passa porque dubla `onSetTracking`. O teste da página (`AdminOrderPage.aviso.test.tsx:377`) só exercita a caixa desmarcada, cuja frase vem da caixa. É a lição do projeto "teste não monta a árvore que prova", na forma do dublê que devolve o que o hook real não devolve.
2. **"Já enviado" com o motor respondendo `sent: true`.** A frase vira "a cliente foi avisada". Hoje isso não é alcançável no painel: os gatilhos dos gestos 1–5 e 7 não produzem eventos da dona, e o gesto 6 descarta `emailSent` (item 1). Fica registrado como risco abaixo.

---

## Gaps ordenados

1. **AVS-07: no gesto 6 com a caixa marcada, a frase diz que o e-mail não saiu quando ele saiu.** `apps/backoffice/src/entities/order/api/useAdminOrders.ts:241-243` (`setMaterialTracking` não devolve `emailSent`). Conserto: devolver `emailSent: r.emailSent`. Teste necessário: o caso da página com a caixa marcada e `respostaTrigger: { sent: true }` no gesto 6. **Cuidado**: com `emailSent` devolvido, o `sent: true` de `material_tracking_set` também pode vir **só do aviso à dona** (`owner_material_incoming` por e-mail ou push), e aí a frase diria "a cliente foi avisada" sem ela ter sido. O motor precisa responder pela cliente (por exemplo, `results` filtrados por público `customer`), ou a spec precisa dizer que `emailSent` conta a dona. Hoje esse é um gap de precisão da spec (A-09 × A-04).
2. **CRG-09: o resultado do gesto não tem prova na região viva.** P24 sobrevive em `apps/backoffice/src/features/order-notice/model/useGestoComAviso.ts:123`. Falta uma asserção, pela página real, de que a região `aria-live="polite"` contém a frase do desfecho depois de um gesto.
3. **CRG-07 × CRG-10 no lote**: o diálogo do lote fecha ao confirmar (`AdminOrdersPage.tsx`, `executar` em `acionarLote`). Desvio declarado só no `tasks.md`, sem `SPEC_DEVIATION` no código. Decisão do usuário: aceitar e emendar a CRG-07 para o lote, ou não.
4. **AVS-12, a hora**: `skip_order_notification` não atualiza `created_at`, e a linha usa `sent_at ?? created_at`. Um `failed→skipped`, ou um segundo pulo, aparece no histórico na hora antiga. A spec diz "na hora do registro" e não diz qual. Não testado.
5. **AVS-07, o texto**: a spec escreve "o e-mail não saiu — o pedido foi alterado"; o código e o teste usam "; ". Cosmético, mas o teste prova o texto do código e não o da spec.

## Lacunas de precisão da spec

- O `emailSent` de AVS-07/A-09 não diz se conta os avisos à dona (gap 1).
- "Na hora do registro" (AVS-12) não diz se a hora é da primeira linha ou da escolha (gap 4).
- CRG-07 vale para "o diálogo de aviso"; o lote usa o mesmo diálogo, mas CRG-10 manda o progresso para a barra (gap 3).

## Qualidade do código

- Dono único: a previsão mora em `core` (`customerNoticeFor`), e o motor e o painel compõem as mesmas peças. O guarda AVS-17 tem sensor provado (G1).
- Uma re-derivação pequena: `AdminOrderPage` (`eventosDoCancelamento`) e `notaDaDonaPara` filtram `eventsForTrigger` por `EVENT_AUDIENCE` para montar frases. É por público, não por nome, e o guarda permite. Não decide se pergunta.
- Os testes de página montam a árvore real (o client é o único dublê). A exceção que custou o gap 1 é o card testado com `onSetTracking` dublado.
- `packages/core/src/payment/**` não foi tocado.

## Integridade

Os 84 arquivos de produção e de teste da feature tiveram o SHA-256 gravado antes da primeira ação e conferido no fim: **84/84 iguais**. Os dois testes temporários foram apagados (`git status` não mostra nenhum `zz_*`). Nenhum commit, stash, checkout, reset ou clean.

---

## Rodada 2

**Date**: 2026-10-30 · **Verifier**: sub-agente independente, não escreveu a feature nem o conserto, não consertou nada.
**Escopo**: os 5 gaps da r1, o que o conserto pode ter aberto (consumidores de `emailSent`/`sent`), gates, sensor.

### Veredito r2: **FAIL ❌**

Quatro dos cinco gaps da r1 estão fechados com evidência. O gap 2 (CRG-09) **fechou só no caminho que a r1 nomeou** (`concluir` de `useGestoComAviso`). Os outros pontos em que um gesto anuncia o próprio resultado continuam sem asserção: o cancelamento com sucesso, o avião, o "Reenviar" e a falha do gesto sem diálogo. Quatro mutantes que apagam esses anúncios sobrevivem à suíte (N11, N13, N22, N23). Nenhum defeito de produto novo: o código anuncia certo, mas o teste não prova.

### Gate (medido por este verificador, árvore parada, antes do sensor)

| Medida | Resultado |
| --- | --- |
| core | **4994/192**, exit 0 |
| functions | **1250/34**, exit 0 |
| backoffice | **4701/257**, exit 0 |
| store | **6275/336**, exit 0 |
| mobile-adm | **2281/140**, exit 0 |
| tsc backoffice · mobile-adm · core | 0 · 0 · **11** (herdados) |
| eslint backoffice | 23 erros / 5 avisos (= baseline) |
| probe `01-aviso-pulado.sql` (54442, `begin … rollback`, reaplica a migration do disco) | exit 0, **23** `ok —` (inclui "failed ⇒ skipped renova created_at") |
| probe `02-motor.sh` | não rodado (instrução) |

Os números batem com o que o conserto declarou no `tasks.md` (+4 core, +3 functions, +7 backoffice, +4 store, mobile-adm igual). Nenhum teste removido. O caso `ok` de `useAdminOrders.delega.test.ts` reescrito como `it.each([true, false])` **ganhou** discriminação (o antigo só tinha `false`).

### Os 5 gaps da r1

| # | Gap da r1 | Evidência r2 (`file:line` — asserção) | Estado |
| --- | --- | --- | --- |
| 1 | AVS-07: `emailSent` no gesto 6 e o significado de `emailSent` | motor: `supabase/functions/send-notification/handlers.ts:183` (`customer_sent` = `ok` **e** público `customer`); provado em `__tests__/handlers.test.ts:508,517,532` (`body.customer_sent` `true` / `false` com `sent: true` / sempre presente). Recuo: `packages/core/src/order-actions/notify.ts:27-28`; `__tests__/notify.test.ts:57,62,67,72` (só a dona ⇒ `false`; truthy ≠ `true` ⇒ `false`; motor antigo recua). Gesto 6: `useAdminOrders.ts:246` devolve `emailSent`; `AdminOrderPage.aviso.test.tsx:434` (`customer_sent: true` ⇒ "a cliente foi avisada por e-mail") e `:443` (`sent: true, customer_sent: false` ⇒ nenhuma frase "a cliente foi avisada", e "o e-mail não saiu"). Lote: `AdminOrdersPage.aviso.test.tsx:282` ("2 marcadas · nenhum e-mail saiu") e `:294`. Demais gestos e cancelamento leem o mesmo `triggerOrderNotification` (N01–N03, N07–N09, N15–N18, N21 mortos) | ✅ fechado |
| 2 | CRG-09: o resultado na região viva | `AdminOrderPage.aviso.test.tsx:343-363` lê `[aria-live="polite"]` depois do gesto, com e sem diálogo; P24 reinjetado **morre** (R-P24). **Mas** o resultado do cancelamento (`AdminOrderPage.tsx:227`), do avião (`:268`), do "Reenviar" (`:283`) e a falha do gesto sem diálogo (`useGestoComAviso.ts:144`) não são lidos na região por nenhum teste: N13, N22, N23 e N11 sobrevivem | ⚠️ **parcial** |
| 3 | AVS-12: a hora da escolha | migration `20261102120000_88-aviso-pulado.sql:53-54` (`error = null, created_at = now()` no `do update`); guarda `avisoPuladoSchema.test.ts:249-258` (régua + 3 sensores); probe 01 linha 91-102 (linha `failed` com dois dias, `created_at = now()` depois do pulo). N19 e N20 mortos pelo guarda **e** pelo probe (`PROBE FALHOU`, exit 3) | ✅ fechado |
| 4 | AVS-07: a redação com travessão | `useGestoComAviso.ts:82` ("o e-mail não saiu — o pedido foi alterado"); cancelamento `AdminOrderPage.tsx` ("O e-mail não saiu — o pedido foi cancelado"); N14 (ponto e vírgula no cancelamento) morto | ✅ fechado |
| 5 | CRG-07: a exceção do lote | emenda em `spec.md` (CRG-07: "O diálogo do LOTE é a exceção declarada") e comentário em `AdminOrdersPage.tsx:291` | ✅ fechado (por decisão de spec) |

**Gaps fechados: 4/5** (o 2 está parcial).

### O que o conserto poderia ter quebrado (os consumidores de `emailSent`/`sent`)

- **App do ateliê (`gravarAcao` → `triggerOrderNotification` com 2 argumentos; `runAppAction`; `actionConfirmation`).** O app passa a ler `customer_sent`. As frases dele (`core/orders/appAction.ts:244-330`) só citam e-mail de evento de cliente, então o campo mais estreito é o significado certo para elas. Os testes do app dublam o motor antigo (`{ sent: true }`, `acoesDoPedido.test.tsx:37`) e só exercitam o **recuo**. Por isso N01/N03 não derrubam o mobile-adm. A leitura nova é provada em `core`, que é quem o app chama. É uma observação, não um gap: o app não tem leitura própria.
- **`mercado-pago`** chama `dispatchTrigger` direto e não lê `sent` nem `customer_sent` (`mercado-pago/handlers.ts:106`). Sem efeito.
- **Avião / reenvio (`action=send`)**: responde `sent` pelo **primeiro** resultado de **um** evento pedido por nome (`handlers.ts:121-133`). O evento reenviado é o da linha `skipped`, de público cliente, então `sent` já é "a cliente recebeu". **Está certo** e não precisava de `customer_sent`.
- **Porta `notify` (cliente)**: também devolve `customer_sent`. É inofensivo, e `customer` do corpo continua ignorado (`handlers.ts:159`).
- **"Já enviado" com `sent: true` (risco 2 da r1)**: com `customer_sent`, o aviso à dona não acende mais "a cliente foi avisada". Como cada gatilho produz **no máximo um** evento de cliente (`core/notifications/triggers.ts:45-90`), um gesto por "já enviado" tem `customer_sent: false` por construção. Fechado.
- **`created_at` renovado**: ninguém mais lê `order_notifications.created_at` além da linha do histórico (`core/orders/history.ts:207,220`) e da view antiga da `42` (só lista). Sem efeito colateral.
- **Janela de deploy**: um painel novo com um motor antigo recua para `sent`, e aí volta o comportamento da r1 (a dona conta como cliente). Está declarado no código e na spec. Some com o deploy da function.

### Sensor de discriminação r2

Mesmo método da r1: arquivo copiado para `scratchpad/verifier2/bak`, mutação por substituição exata (o harness lança se o alvo não aparece exatamente 1 vez), testes relevantes, restauração e SHA-256 conferido. Na migration, o probe 01 também rodou. Logs em `scratchpad/verifier2/mlogs/`. Nenhuma morte por compilação nem por `timed out`.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| N01 | core `order-actions/notify.ts` | `customer_sent === true \|\| sent === true` | morto (core, backoffice) |
| N02 | idem | `'customer_sent' in data` → `data.customer_sent` (o `false` cai no recuo) | morto |
| N03 | idem | o recuo lê `customer_sent` em vez de `sent` | morto |
| N04 | `send-notification/handlers.ts` | `customer_sent` sem o `r.ok` | morto |
| N05 | idem | `.some` → `.every` | morto |
| N06 | idem | `sent` passa a contar só a cliente | morto |
| N07 | `useAdminOrders.ts` `setMaterialTracking` | `emailSent: true` no sucesso | morto |
| N08 | idem | `emailSent: true` na recusa | morto |
| N09 | idem `cancelOrder` | `emailSent: true` | morto |
| N10 | `useGestoComAviso.ts` `fraseDoResultado` | "já enviado" antes de `emailSent`/`perguntou` | sobreviveu: **equivalente** (cada gatilho produz ≤ 1 evento de cliente, então `alreadySent` não vazio implica nenhum diálogo e `customer_sent: false`) |
| N11 | idem, gesto sem diálogo | falha não vai à região viva (`:144`) | **SOBREVIVEU** |
| N12 | idem, gesto com diálogo | falha não vai à região viva (`:174`) | sobreviveu: **equivalente na prática** (a falha fica no diálogo em `role="alert"`, `NoticeDialog.tsx:78`) |
| N13 | `AdminOrderPage.tsx` cancelamento | sucesso não vai à região viva (`:227`) | **SOBREVIVEU** |
| N14 | idem | "não saiu; o pedido foi cancelado" | morto |
| N15 | `AdminOrdersPage.tsx` lote de material | `emailSent: r.ok` | morto |
| N16 | idem, cartão "Recebi o material" | `emailSent: true` | morto |
| N17 | `OrderMaterialCard.tsx` envelope | `emailSent: true` | morto |
| N18 | idem, estado do material | `emailSent: true` | morto |
| N19 | migration | sem `error = null` | morto (guarda + probe) |
| N20 | migration | `created_at = n.created_at` | morto (guarda + probe) |
| N21 | `bulkMaterial.ts` lote de status | `emailSent: !r.error` | morto |
| N22 | `AdminOrderPage.tsx` avião | o desfecho não vai à região viva (`:268`) | **SOBREVIVEU** |
| N23 | idem, "Reenviar" | o desfecho não vai à região viva (`:283`) | **SOBREVIVEU** |

Reinjeções da r1 (amostra): **R-P24** (`anunciar(frase)` de `concluir`), **R-C1** (sem o filtro "já enviado"), **R-F1** (pula também a dona), **R-P4** (o diálogo fecha na falha), **R-P29** (`gravar(false)` sem diálogo), **R-P7** (`revalidar` liga `loading`): **6/6 mortos por asserção**.

**29 injetados (23 novos + 6 reinjeções) · 23 mortos por asserção · 0 por compilação · 4 sobreviventes (N11, N13, N22, N23) · 2 equivalentes (N10, N12).**

### Gaps ordenados (r2)

1. **CRG-09: o resultado do cancelamento não tem prova na região viva.** `apps/backoffice/src/pages/admin/AdminOrderPage.tsx:227` (`gesto.anunciar(frase)`); N13 sobrevive. O cancelamento é o gesto 7 e não passa por `concluir`, então o conserto r1 não o alcançou. Falta o mesmo `regiaoVivaDiz` depois de "Confirmar cancelamento".
2. **CRG-09 (com AVS-13/CRG-08): o desfecho do avião e do "Reenviar" não tem prova na região viva.** `AdminOrderPage.tsx:268` e `:283`; N22 e N23 sobrevivem.
3. **CRG-09: a falha do gesto sem diálogo não tem prova na região viva.** `useGestoComAviso.ts:144`; N11 sobrevive. Sem diálogo, o erro vai só para o toast, que nos testes é dublado. A falha do caminho com diálogo está coberta pelo `role="alert"` do diálogo (N12, equivalente).

Os quatro se resolvem com teste, sem mudar código de produto.

### Integridade

Os 76 arquivos do diff (fora de `.specs/`) tiveram o SHA-256 gravado antes da primeira ação (`scratchpad/verifier2/sha-inicio.txt`) e conferido no fim: **76/76 iguais**, e a lista de arquivos modificados ou novos é a mesma. Nenhum commit, stash, checkout, reset ou clean. Nenhum mutante rodou em paralelo com o gate.

---

## Rodada 3

**Date**: 2026-10-30 · **Verifier**: sub-agente independente. Não escreveu a feature nem os consertos e não consertou nada.
**Escopo**: os 3 gaps da r2 (CRG-09), a feature inteira de novo contra AVS-01..24, CRG-01..13, os edge cases e os Success Criteria, os gates e um sensor em áreas que r1 e r2 não mutaram.

### Veredito r3: **FAIL ❌** (só cobertura, nenhum defeito de produto)

Os três gaps da r2 estão fechados, e os quatro mutantes que os provavam (N11, N13, N22, N23) morrem por asserção. O sensor novo mostrou que **o mesmo AC da r2 (CRG-09) ainda tem um ponto de anúncio sem asserção**: a nota interna (V20). Há mais três sobreviventes em caminhos que nenhuma rodada olhou: a falha de leitura no cartão do celular (V14), o motivo "sem e-mail" no cancelamento (V04) e o teto de 50 no diálogo do lote (V28). Nos quatro casos o código de produto faz a coisa certa. O que falta é a régua. Esta era a última rodada (limite de 3 iterações), então a decisão volta ao usuário.

### Gate (árvore parada, antes do sensor)

| Medida | Resultado |
| --- | --- |
| core | **4994/192**, exit 0 |
| functions | **1250/34**, exit 0 |
| backoffice | **4707/257**, exit 0 |
| store | **6275/336**, exit 0 |
| mobile-adm | **2281/140**, exit 0 |
| tsc backoffice · mobile-adm · core | 0 · 0 · **11** (herdados) |
| eslint backoffice | **23 erros / 5 avisos** (= baseline) |
| probe `01-aviso-pulado.sql` (54442) | exit 0, **23** `ok —` |
| probe `02-motor.sh` | não rodado (instrução) |

Batem com o que o conserto da r2 declarou: backoffice 4701 → 4707 e os outros quatro iguais à r2. Nenhum teste removido.

### Os 3 gaps da r2

| # | Gap r2 | Evidência r3 | Estado |
| --- | --- | --- | --- |
| 1 | CRG-09 no cancelamento (N13) | `apps/backoffice/src/pages/admin/AdminOrderPage.aviso.test.tsx:627-640`, `regiaoVivaDiz('Pedido cancelado — a cliente foi avisada por e-mail')`; R-N13 reinjetado ⇒ 1 caso falha (esse) | ✅ |
| 2 | CRG-09 no avião e no "Reenviar" (N22, N23) | `:642-661` (avião enviado / avião que falha) e `:663-687` ("Reenviar" que sai / que não sai), cada um com `regiaoVivaDiz(frase)`; R-N22 e R-N23 ⇒ 2 casos cada | ✅ |
| 3 | CRG-09 na falha sem diálogo (N11) | `:689-699`, `regiaoVivaDiz('Não foi possível mudar o status. Nada foi alterado — tente de novo.')` + `gatilhos()` vazio; R-N11 ⇒ 1 caso | ✅ |

**Gaps da r2 fechados: 3/3.**

### Releitura de ponta a ponta (o que r1/r2 não olharam)

- **AVS-21 (o cartão do celular)**: o portão, o estado só no cartão tocado, "já enviado" com os envios **daquele** pedido e a falha da RPC estão provados (`AdminOrdersPage.aviso.test.tsx:444,469,490,507`; V15 e V16 mortos). **Lacuna**: a leitura dos envios que falha. O código mostra "Não consegui conferir os e-mails já enviados. Nada foi alterado." e retorna (`AdminOrdersPage.tsx:355-361`), mas nenhum teste do cartão exercita isso. Sem o `return` (V14), o gesto **grava** depois de dizer que nada foi alterado, e a suíte fica verde. O lote tem esse caso (`:317`), e o cartão não (`L-064`: duas superfícies, uma régua).
- **AVS-20 (lote sem e-mail)**: provado. V11 (`perguntou ? avisar : false`, que poria `customer:false` num lote sem pergunta) morre em `:333`.
- **CRG-12/13**: provados. V23 (`revalidando` nunca liga) morre no hook e na página; V27 (a lista não trava durante o progresso) morre em `:386`; V22 (barra sem `aria-valuenow`) morre em dois arquivos.
- **AVS-16 (retirada)**: provado só em `core` (`notice.test.ts:94,100`). A página do pedido usa o mesmo `customerNoticeFor`. A divergência conhecida da **lista** (sem `shipping_service_id` no `order_list`) está declarada no `apps/backoffice/CLAUDE.md` e coberta por `A-09`. Não é gap.
- **AVS-22 ("Ver o e-mail")**: provado. V17 (sem `sandbox`) e V18 (sem `orderId`) morrem em `NoticeDialog.test.tsx:262`.
- **AVS-17 (o guarda)**: régua, âncora, sensores e metade positiva conferidos na leitura (`avisoComDonoUnico.test.ts`). G1 morreu na r1. Sem achado novo.
- **A-13 (avião com evento desligado)**: `AdminOrderPage.aviso.test.tsx:601`, frase exata. ✅
- **Edge "as configurações ainda não chegaram"**: `useNotificationSettings` devolve `data?.notifications ?? DEFAULT_NOTIFICATIONS` (`packages/core/src/hooks/useStoreSettings.ts:142-145`), e `customerNoticeFor` também cai nos padrões com `settings` ausente (`notice.test.ts`, edge cases). ✅
- **Edge "cliente sem e-mail"**: provado em `core` (`notice.test.ts:137`, inclusive `'   '`; V25 morto). **No diálogo de cancelamento** a frase própria ("Este pedido não tem e-mail da cliente: nenhum aviso sai.", `OrderCancelDialog.tsx:79`) não tem asserção. Sem ela (V04), um pedido sem e-mail com "Pedido cancelado" ligado diria que o e-mail "está desligado em Configurações". É um motivo falso, e a suíte fica verde.
- **Edge "lote acima de 50 ⇒ o diálogo conta só os 50"**: `runBulk` limita as escritas a 50 (provado em `loteComAviso.test.ts:51`). Mas o corte do **diálogo** (`selecionadas.slice(0, BULK_LIMIT)`, `AdminOrdersPage.tsx:234`) não tem teste. Sem ele (V28), o diálogo listaria e contaria 60 e o botão diria "Avançar 60 pedidos", enquanto só 50 gravam.
- **CRG-09 na nota interna**: a nota tem gerúndio ("Salvando nota…", CRG-01) e anuncia o resultado com `gesto.anunciar('Nota salva')` (`AdminOrderPage.tsx`, `anotar`). É o **único** sinal do sucesso, porque não há toast. Nenhum teste lê a região depois de salvar uma nota (V20).
- **CRG-07 no cancelamento**: "Voltar" desabilitado e `Esc` ignorado durante a gravação estão provados (V06 e V07 mortos em `OrderCancelDialog.test.tsx:105`).
- **A-04 na tela (a nota da dona)**: provado por público (V01 morto em três casos).
- **Observação, não gap**: quando a leitura de `order_notifications` do pedido falha, `useAdminOrder` degrada para `[]` (`useAdminOrder.ts:219`). A previsão então pode perguntar por um e-mail que já saiu. Com a caixa desmarcada, a frase diz "anotado no histórico", mas o motor não grava `skipped` sobre `sent`. A spec (AVS-07, A-09) manda a frase da caixa desmarcada pela caixa, então está conforme a letra. O lote e o cartão tratam a mesma falha como "Nada foi alterado"; a página do pedido não. Fica para a decisão do usuário.

### Sensor r3

Método: cópia em `scratchpad/verifier3/bak/`. A troca é exata e o arnês lança se o alvo não aparece exatamente 1 vez. Os testes do pacote rodam por filtro de caminho, um mutante por vez, nunca em paralelo com o gate. O arquivo é restaurado e o SHA-256 conferido. Os logs ficam em `scratchpad/verifier3/mlogs/`. A classificação foi refeita pela linha `Tests` de cada log (o classificador automático do arnês leu errado a linha "Failed Tests"): **todas as mortes são por asserção, com 0 por compilação e 0 por `timed out`.**

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| V01 | `useGestoComAviso.ts` | nota da dona filtra `customer` | morto (3) |
| V02 | `NoticeEmails.tsx` | "as N clientes" com N = 1 | morto (2) |
| V03 | `OrderCancelDialog.tsx` | sem o ramo "já enviado" na linha sem caixa | morto |
| **V04** | idem | sem o ramo "pedido sem e-mail" | **SOBREVIVEU** |
| V05 | idem | `comCaixa ? avisar : undefined` → `avisar` | morto |
| V06 | idem | "Voltar" habilitado gravando | morto |
| V07 | idem | `Esc` fecha gravando | morto |
| V08 | `AdminOrdersPage.tsx` | `planejarLote` ignora a máquina do material | morto |
| V09 | idem | `fraseJaRecebeu` sempre `null` | morto |
| V10 | idem | `contarEventos` conta 1 por evento | morto |
| V11 | idem | lote sem pergunta leva `avisarCliente: false` | morto |
| V12 | `bulkMaterial.ts` | anotados sem o recorte `previstos` | morto |
| V13 | idem | ramos "nenhum e-mail saiu" × "nenhum aviso sai" trocados | morto (5) |
| **V14** | `AdminOrdersPage.tsx` | cartão: falha de leitura dos envios não retorna | **SOBREVIVEU** |
| V15 | idem | cartão: frases de recusa × falha trocadas | morto |
| V16 | `useGestoComAviso.ts` | ignora `g.enviados` do cartão | morto |
| V17 | `previa.ts` | iframe sem `sandbox` | morto |
| V18 | idem | prévia sem `orderId` | morto |
| V19 | `AdminOrderPage.tsx` | `eventosDoCancelamento` por público `owner` | morto |
| **V20** | idem | a nota salva não vai à região viva | **SOBREVIVEU** |
| V21 | `useAdminOrder.ts` | a releitura boa não apaga `staleError` | morto (2) |
| V22 | `OrderBulkBar.tsx` | `aria-valuenow={0}` | morto (2) |
| V23 | `useAdminOrderList.ts` | `revalidando` nunca liga | morto (2) |
| V24 | `ActionButton.tsx` | sem o `Loader2` | morto |
| V25 | core `notice.ts` | e-mail sem `trim` | morto |
| V26 | mobile-adm `Historico.tsx` | `skipped` em tom de falha | morto |
| V27 | `AdminOrdersPage.tsx` | `ocupado` sem `progresso` | morto |
| **V28** | idem | o diálogo do lote sem `slice(0, BULK_LIMIT)` | **SOBREVIVEU** |
| V29 | `send-notification/dispatch.ts` | pulo devolvido como `already_sent` | morto (4) |
| R-N13 · R-N22 · R-N23 · R-N11 · R-P8 | reinjeções (r2 e r1) | — | **5/5 mortos** |

**34 injetados (29 novos + 5 reinjeções) · 30 mortos por asserção · 0 por compilação · 4 sobreviventes (V04, V14, V20, V28) · 0 equivalentes.**

### Gaps ordenados (r3) — todos de cobertura, nenhum de produto

1. **CRG-09: a nota interna anuncia "Nota salva" sem asserção.** `apps/backoffice/src/pages/admin/AdminOrderPage.tsx` (`anotar`, `gesto.anunciar('Nota salva')`). V20 sobrevive. É o 5º ponto de anúncio do mesmo AC que a r2 reprovou, e é o único sinal do sucesso (sem toast).
2. **AVS-21 (o comportamento do lote no cartão): a leitura dos envios que falha não tem caso.** `AdminOrdersPage.tsx:355-361`. V14 sobrevive, e o mutante grava depois de dizer "Nada foi alterado".
3. **Edge "lote acima de 50": o corte do diálogo não tem caso.** `AdminOrdersPage.tsx:234`. V28 sobrevive.
4. **AVS-08 + edge "cliente sem e-mail" no cancelamento: a frase própria não tem caso.** `OrderCancelDialog.tsx:79`. V04 sobrevive.

### Integridade

Os 76 arquivos do diff (fora de `.specs/`) tiveram o SHA-256 gravado antes da primeira ação (`scratchpad/verifier3/sha-inicio.txt`) e conferido no fim: **76/76 iguais**, e a lista de modificados e novos é a mesma. Nenhum commit, stash, checkout, reset ou clean. Nenhum processo em segundo plano ficou rodando.
