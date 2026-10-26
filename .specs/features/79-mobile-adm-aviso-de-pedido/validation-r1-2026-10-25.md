# 79 — Validação (Verificador independente, rodada 1)

> Rodada anterior, preservada aqui porque a rodada do ciclo `81-79` (2026-10-26) foi escrita em `validation.md` pelo atalho `81-79-…`, que aponta para esta mesma pasta.

**Data**: 2026-10-25 · **Verificador**: agente independente (autor ≠ verificador) · **Branch**:
`feat/79-mobile-adm-aviso-de-pedido`, tudo sem commit.

## Veredito: **FAIL — por cobertura** (nenhum defeito de produto aberto)

76 mutantes de comportamento nos arquivos reais: **72 mortos por asserção, 0 por compilação, 4
sobreviventes**. Dos quatro, um é quase equivalente (F11); os outros três são lacunas de régua sobre
regras que o design ou o próprio código prometem (F14, P16, C07). Uma quinta lacuna é de inspeção (a
regra "caminho interno" escrita duas vezes, com uma régua a menos numa das cópias). O código de hoje
se comporta certo em todos os cinco casos — o que falta é a asserção que o prenderia.

Os 42 requisitos têm teste ou probe que os prova, com três exceções declaradas (abaixo): `MAN-39`
(layout, só navegador), `MAN-42` (ordem de publicação, só documentação) e a metade "Chrome/Android
real" de `MAN-01`/`MAN-03`/`MAN-05`/`MAN-08`/`MAN-22`, pendente do usuário.

## Faixa do diff

`git diff --stat` (rastreados): **49 arquivos, +1731 / −111** — código em `packages/core/src/notifications/{precondition,settings,index}.ts`,
`packages/core/src/orders/history.ts`, `packages/auth/src/RequireAdmin.tsx`, `supabase/functions/{send-notification/{dispatch,handlers,index},mercado-pago/{handlers,index},_shared/testing/fakes}.ts`,
`supabase/config.toml`, `apps/mobile-adm/{pwa.config.ts,vercel.json,src/app/App.tsx,src/pages/LoginPage.tsx,src/widgets/account-menu/ui/AccountMenu.tsx,src/features/order-actions/api/gravarAcao.ts,src/entities/order/model/linha.ts}`,
`.github/workflows/supabase-deploy.yml`, `.env.example`, os três `CLAUDE.md`, `STATE.md`, e os testes/guardas estendidos.

Não rastreados (código e testes da `79`): `packages/core/src/notifications/push.ts` (+ teste),
`supabase/migrations/20261026120000_79-avisos-no-celular.sql`,
`supabase/functions/send-notification/{push,budget}.ts` (+ `push.test.ts`, `dispatchPush.test.ts`),
`supabase/functions/_shared/{pushOutcome,webPush}.ts` (+ `pushOutcome.test.ts`, `pushSoNoMotor.test.ts`),
`supabase/functions/atelie-avisos/**`, `apps/mobile-adm/public/sw-avisos.js`,
`apps/mobile-adm/src/features/push-notifications/**`, `apps/mobile-adm/src/pages/AvisosPage.tsx`,
`apps/mobile-adm/src/shared/{api/recusa.ts,lib/destinoDepoisDoLogin.ts}`, `apps/mobile-adm/src/test/push.ts`,
e os testes `avisosComClientReal`, `swAvisos`, `avisosPage`, `recusa`, `destinoDepoisDoLogin`,
`movimentoDosAvisos`, `tomMemorialDosAvisos`, `push` (arnês), `AccountMenu.avisos`, `pushSubscriptionsSchema`.

> **A árvore foi compartilhada durante a verificação.** Entre o início e o fim, outra sessão (QA)
> alterou `docs/qa/README.md` e criou 21 arquivos em `docs/qa/{charters,journeys,scenarios}/`. Nenhum
> deles foi tocado por este verificador. Todos os arquivos que o arnês mutou foram restaurados com o
> SHA-256 conferido igual ao de antes, um a um.

## Suítes de entrada (árvore parada, um workspace por vez, exit fora de pipe)

| Workspace | Testes / arquivos | Exit |
| --- | --- | --- |
| core | 4451 / 176 | 0 |
| functions | 1099 / 26 | 0 |
| mobile-adm | 1982 / 124 | 0 |
| store | 5985 / 323 | 0 |
| backoffice | 3710 / 214 | 0 |

Iguais aos números do fecho da T28/T29 (`baseline.md`, `tasks.md`).

## Evidência por requisito

| Req | Evidência (arquivo de teste / probe) | Valor da spec asserido? | Mutantes que a prendem |
| --- | --- | --- | --- |
| MAN-01 | `send-notification/__tests__/push.test.ts` (uma chamada ao `sender` por aparelho); `dispatchPush.test.ts`; `mercado-pago/__tests__/handlers.test.ts` (webhook real ⇒ aviso de `owner_order_paid`) | sim (título e corpo exatos) | F12, F18 |
| MAN-02 | `push.test.ts` (o filtro `contains` lido pelo dublê) | sim | F07 |
| MAN-03 | `swAvisos.test.ts` (foco + `navigate`, `openWindow` nos dois outros casos) | sim (`/pedidos/x`) | A06, A07, A08, C03 |
| MAN-04 | `push.test.ts` (gone ⇒ apagada, as outras enviadas); `pushOutcome.test.ts` (404 e 410) | sim | F03, F19 |
| MAN-05 | `push.test.ts` (`claim` nulo ⇒ zero envios; `failed` reivindicável); `mercado-pago` (webhook duas vezes ⇒ um aviso) | sim | F24, F01 |
| MAN-06 | `precondition.test.ts` (estado sem contato); `dispatchPush.test.ts` (três desfechos do e-mail + push sai) | sim | C05, F16 |
| MAN-07 | `push.test.ts` (429/5xx mantém, uma chamada só); `pushOutcome.test.ts` | sim | F04, F20, F21, F23 |
| MAN-08 | `core/.../push.test.ts` (as quatro frases por extenso, `#0244`, `R$ 189,00` com NBSP); `tomMemorialDosAvisos` | sim (frase inteira) | C01 |
| MAN-09 | `push.test.ts` (`push:2/3` com `p_error = null`); `history.test.ts`; `PedidoPage.test.tsx`; `AdminOrderPage.test.tsx` | sim (`Entregue a 2 de 3 aparelhos`) | F01, F02, C06 |
| MAN-10 | `usePushNoAparelho.test.tsx`, `avisosPage.test.tsx` (montar não pede permissão) | sim | A18 |
| MAN-11 | idem (concedida ⇒ `subscribe` com `userVisibleOnly: true` e a chave da porta ⇒ quatro ligados) | sim | A19 |
| MAN-12 | idem (frase exata, sem interruptor, nada gravado) | sim | A16 |
| MAN-13 | idem (frase exata, sem botão) | sim | — |
| MAN-14 | `atelie-avisos` `handlers.test.ts` (`events` só da conta); hook e página (otimista, volta) | sim | P07, P14, A11, A14 |
| MAN-15 | `pararAvisosDesteAparelho.test.ts`; página; porta (`unsubscribe` só da conta) | sim | P08, A03 |
| MAN-16 | `portaDeAvisos.test.ts`; `avisosComClientReal.test.tsx`; página (frase exata) | sim | A01, A02, A12 |
| MAN-17 | `AccountMenu.avisos.test.tsx`; `rotasSobGuarda.test.ts` | sim | — |
| MAN-18 | `push.test.ts` (sem papel ⇒ apagada; `has_role` que erra ⇒ nem envia nem apaga) | sim | F06 (F11 sobreviveu, quase equivalente) |
| MAN-19 | `push.test.ts` (orçamento curto ⇒ `budget_exhausted` + `finish`); `dispatchPush.test.ts` (exceção ⇒ `unexpected_error`); `mercado-pago` (push que lança ⇒ resposta idêntica) | sim | F08, F15 — **F14 sobreviveu** (lacuna 1) |
| MAN-20 | `push.test.ts` (zero elegíveis ⇒ `no_device`, sem `claim`) | sim | F05 |
| MAN-21 | `destinoDepoisDoLogin.test.ts`; `LoginPage.test.tsx` pelo `<App />` real; `AdminLoginPage.test.tsx` (painel inalterado) | sim | A09, A10, A20 — **lacuna 4** (`/\`) |
| MAN-22 | `swAvisos.test.ts` (mostra sempre; nenhum ramo de visibilidade existe no arquivo) | sim | — (provado por ausência de ramo; Android pendente) |
| MAN-23 | `pushSubscriptionsSchema.test.ts`; `atelie-avisos` (toda ação × 401/403/`has_role` que erra); `portaDeAvisos`; `avisosComClientReal`; probe 02 (anon 401, authenticated 403 `42501`) | sim | P01, P02, S04 |
| MAN-24 | `chaveDeServidorForaDoNavegador.test.ts` (`VAPID_KEYS` e JWK privada, com sensores) | sim | (provado pelos sensores do próprio guarda; não remutado) |
| MAN-25 | `core push.test.ts` (hosts, chaves); porta (recusa sem gravar); motor (2ª volta apaga) | sim | C02, C04, P15, F22 |
| MAN-26 | `push.test.ts` (log do motor sem o endpoint) | sim, **no motor** | F09 — **P16 sobreviveu** no log da porta (lacuna 2) |
| MAN-27 | porta (`subscribe` de outra conta passa ao chamador, eventos voltam aos quatro); guarda (`unique`); probe 02/03 | sim | P04, P12 |
| MAN-28 | porta (11ª despeja a mais antiga por `last_used_at`); probe 03 | sim | P05, P06 |
| MAN-29 | `pushSubscriptionsSchema` (`on delete cascade`); probe 02 (cascata 2→0) | sim | S06 |
| MAN-30 | `AccountMenu.avisos.test.tsx` (ordem porta → navegador → `signOut`; frase exata; dois botões; foco; recusa sai direto); `pararAvisosDesteAparelho.test.ts` | sim | A03, A04, A15 |
| MAN-31 | `core push.test.ts` (`PUSH_TEST_MESSAGE`); porta (`test` sem `order_notifications`); `swAvisos` (url `/`) | sim | P10, P11 |
| MAN-32 | porta (falha ⇒ 502); hook e página (frase exata) | sim | — |
| MAN-33 | porta (`false` ⇒ 429; 404 antes do `claim`); guarda (trava → dono → teto → grava, 30 s); probe 05 (antes/depois) | sim | P09, P13, S01, S02, S05, S07, A13 |
| MAN-34 | `history.test.ts` (`(Celular)`); `PedidoPage.test.tsx` | sim | C08 |
| MAN-35 | `swSemDadosDaLoja.test.ts` (sem `fetch`/`caches`); hook (`desligado` sem inscrição conhecida) | sim | A17 |
| MAN-36 | porta (`status` de outra conta ⇒ `subscribed: false`); hook e página | sim | P03, A17 |
| MAN-37 | `push.test.ts` (sem `push` ⇒ `no_provider`); porta (`config`/`test` 503); `dispatchPush` (fora do relatório — `SPEC_DEVIATION` declarado na T10) | sim | P17 |
| MAN-38 | `history.test.ts` (falha sem `emailType`); `AdminOrderPage.test.tsx` (par com/sem "Reenviar"); `send` com `channel: 'push'` ⇒ 400; `dispatchEvent` sem push | sim | F13, F17, C07 sobreviveu (lacuna 3) |
| MAN-39 | **só navegador**: `prova-navegador.md`, 144/144 combinações (360/390/412/1440 × 100/130/200 %) — jsdom não mede layout | n/a | — |
| MAN-40 | `avisosPage.test.tsx` (nomes de `NOTIFICATION_EVENT_NAMES` na ordem; `min-h-12` por token exato) | sim | — |
| MAN-41 | `avisosPage.test.tsx` (`aria-busy`, desabilitado); `movimentoDosAvisos.test.ts` | sim | — |
| MAN-42 | **só documentação** (`supabase/CLAUDE.md`, `CLAUDE.md`, `STATE.md`) e os guardas da migration; nenhum teste prova uma ordem de deploy (não é testável por suíte) | n/a | S03 |

## Sensor de discriminação — 76 mutantes

Arnês: `scratchpad/verificador/arnes.mjs` (fora da árvore). SHA-256 guardado antes, conteúdo original
reescrito depois, SHA-256 conferido igual (todos `sha_ok`); o arnês **lança** quando o alvo não existe
ou é ambíguo (todos os 76 conferidos únicos antes de rodar). Morte por asserção = exit 1 com um caso
`×` nomeado e nenhum `SyntaxError`/`Transform failed`/`ReferenceError` no log.

| Id | Alvo | Mutação | Resultado | Teste que matou |
| --- | --- | --- | --- | --- |
| C01 | `core/notifications/push.ts` | valor `/ 100` | morto (asserção) | `core push.test.ts` |
| C02 | idem | sufixo `.notify.windows.com` sem o ponto (aceita `evilnotify.windows.com`) | morto | idem |
| C03 | idem | url `/pedido/` | morto | idem |
| C04 | idem | porta explícita aceita | morto | idem |
| C05 | `precondition.ts` | `no_owner_contact` para todo evento | morto | `precondition.test.ts` |
| C06 | `orders/history.ts` | `x <= y` (contagem com X = Y) | morto | `history.test.ts` |
| C07 | idem | só `failed` vira "não chegou" (`pending` cai no ramo do e-mail, com `emailType`) | **SOBREVIVEU** | — |
| C08 | idem | canal push rotulado "E-mail" | morto | `history.test.ts` |
| F01 | `send-notification/push.ts` | `sent` só com `entregues === total` | morto | `push.test.ts` |
| F02 | idem | parcial com `p_error` preenchido | morto | `push.test.ts`, `mercado-pago/handlers.test.ts` |
| F03 | idem | `gone` não apaga | morto | `push.test.ts` |
| F04 | idem | `failed` (429/5xx) apaga | morto | idem |
| F05 | idem | zero elegíveis medido antes do filtro de papel (claim com só sem-papel) | morto | idem |
| F06 | idem | `has_role` que erra apaga | morto | idem |
| F07 | idem | filtro `contains` sem o evento | morto | idem |
| F08 | idem | orçamento `< 0` | morto | idem |
| F09 | idem | log com o endpoint inteiro | morto | idem |
| F10 | idem | `last_used_at` em ninguém | morto | idem |
| F11 | idem | `ehAdmin !== false` (nulo vira admin) | **SOBREVIVEU** (quase equivalente: `has_role` devolve booleano) | — |
| F12 | `dispatch.ts` | gatilho sem a metade push | morto | `dispatchPush.test.ts`, `mercado-pago` |
| F13 | idem | reenvio (`dispatchEvent`) com push | morto | `dispatchPush.test.ts` |
| F14 | idem | **push EXECUTADO antes do e-mail**, relatório na mesma ordem | **SOBREVIVEU** | — |
| F15 | idem | `return deliverPush` sem `await` (o `catch` próprio não pega) | morto | `dispatchPush.test.ts` |
| F16 | idem | push com `preconditionFailure` (contato) | morto | `dispatchPush.test.ts`, `mercado-pago` |
| F17 | `send-notification/handlers.ts` | `send` aceita `channel: 'push'` | morto | `handlers.test.ts` |
| F18 | `mercado-pago/handlers.ts` | `fireTrigger` sem repassar `push` | morto | `mercado-pago/handlers.test.ts` |
| F19 | `_shared/pushOutcome.ts` | 404 não é `gone` | morto | `pushOutcome.test.ts` |
| F20 | idem | 429 é `gone` | morto | idem |
| F21 | idem | prazo vencido ⇒ `sent` | morto | idem |
| F22 | `send-notification/push.ts` | 2ª volta de `pushEndpointRefusal` removida | morto | `push.test.ts` |
| F23 | `_shared/pushOutcome.ts` | rede ⇒ `gone` | morto | `pushOutcome.test.ts` |
| F24 | `send-notification/push.ts` | `claim` nulo ignorado | morto | `push.test.ts`, `mercado-pago` |
| P01 | `atelie-avisos/handlers.ts` | `config` sem `requireAdmin` | morto | `atelie-avisos/handlers.test.ts` |
| P02 | idem | `unsubscribe` sem `requireAdmin` | morto | idem |
| P03 | idem | `status` sem conferir a conta | morto | idem |
| P04 | idem | `mesmoDono` = linha existe (outra conta mantém eventos) | morto | idem |
| P05 | idem | despejo além de 11 | morto | idem |
| P06 | idem | despejo pela mais recente | morto | idem |
| P07 | idem | `events` sem `.eq('user_id')` | morto | idem |
| P08 | idem | `unsubscribe` sem `.eq('user_id')` | morto | idem |
| P09 | idem | `false` do `claim_push_test` não recusa | morto | idem |
| P10 | idem | `test` com `gone` não apaga | morto | idem |
| P11 | idem | `test` lê linha de outra conta | morto | idem |
| P12 | idem | outra conta assumindo mantém os eventos | morto | idem |
| P13 | idem | 404 do `test` depois do `claim` (endpoint alheio consome o teto) | morto | idem |
| P14 | idem | `events` sem `pushEventsRefusal` | morto | idem |
| P15 | idem | `subscribe` sem `pushKeysRefusal` | morto | idem |
| P16 | idem | **log do `subscribe` com o endpoint inteiro** | **SOBREVIVEU** | — |
| P17 | idem | `config` sem VAPID devolve 200 | morto | idem |
| S01 | migration | sem `pg_advisory_xact_lock` | morto | `pushSubscriptionsSchema.test.ts` |
| S02 | idem | teto de 3 s | morto | idem |
| S03 | idem | `check` de canal sem `push` | morto | `orderNotificationsSchema`, `pushSubscriptionsSchema` |
| S04 | idem | `execute` a `authenticated` | morto | `pushSubscriptionsSchema` |
| S05 | idem | "o aparelho é da conta?" sem `user_id` | morto | idem |
| S06 | idem | sem `on delete cascade` em `push_subscriptions` | morto | idem |
| S07 | idem | `on conflict do nothing` (o teto não renova) | morto | idem |
| A01 | `portaDeAvisos.ts` | conferência que falha por rede ⇒ recusa | morto | `portaDeAvisos.test.ts` |
| A02 | idem | 401 sem conferir o papel | morto | idem |
| A03 | `pararAvisosDesteAparelho.ts` | navegador antes da porta | morto | `pararAvisos…`, `AccountMenu.avisos`, `avisosPage` |
| A04 | idem | 4xx com slug da porta tratado como sucesso | morto | `pararAvisos…` |
| A05 | `public/sw-avisos.js` | `//host` aceito | morto | `swAvisos.test.ts` |
| A06 | idem | sem o `catch` do `navigate` | morto | idem |
| A07 | idem | foco sem `navigate` | morto | idem |
| A08 | idem | sem `notification.close()` | morto | idem |
| A09 | `destinoDepoisDoLogin.ts` | `//host` aceito | morto | `destinoDepoisDoLogin.test.ts`, `LoginPage.test.tsx` |
| A10 | `packages/auth/RequireAdmin.tsx` | `state` sem `from` | morto | `LoginPage.test.tsx` |
| A11 | `usePushNoAparelho.ts` | interruptor sem voltar na falha | morto | hook e página |
| A12 | idem | `inscrever` falhando sem `unsubscribe()` | morto | hook e página |
| A13 | idem | teste sem trava de um por vez | morto | hook |
| A14 | idem | interruptor não otimista | morto | hook e página |
| A15 | `AccountMenu.tsx` | recusa da porta ⇒ pergunta em vez de sair | morto | `AccountMenu.avisos` |
| A16 | `usePushNoAparelho.ts` | negada ⇒ `desligado` | morto | hook e página |
| A17 | idem | inscrição desconhecida ⇒ `ligado` | morto | hook e página |
| A18 | idem | abrir a tela pede permissão | morto | hook e página |
| A19 | idem | `userVisibleOnly: false` | morto | hook, `avisosComClientReal` |
| A20 | `LoginPage.tsx` | sempre `/` depois de entrar | morto | `LoginPage.test.tsx` |

**Total: 76 · 72 mortos por asserção · 0 por compilação · 4 sobreviventes (F14, P16, C07, F11).**

## Lacunas ranqueadas

1. **A ordem de EXECUÇÃO e-mail → push não tem régua** (F14). `supabase/functions/send-notification/dispatch.ts:445`
   (`forEvent`): o design §4.2 exige "o e-mail do evento antes do push do evento (o push é o último a
   gastar orçamento)", e é isso que sustenta `MAN-19` no caixa do PIX (2,5 s). O único caso,
   `dispatchPush.test.ts:215` ("a ordem no relatório"), assere a ordem do **relatório**, verdadeira
   nos dois mundos: executar o push primeiro e montar o relatório na ordem antiga passa a suíte
   inteira. **Caso que falta**: um `sender` dublê que registra o instante (ou a contagem de e-mails
   já enviados pelo provider) no momento da chamada, e assere que o e-mail do mesmo evento já saiu;
   e/ou um orçamento que só cabe UM envio, assegurando que o gasto vai ao e-mail.
2. **O log da porta pode vazar o endpoint inteiro sem nada acusar** (P16).
   `supabase/functions/atelie-avisos/handlers.ts:159` (e as outras linhas de log com `host`, 229, 246,
   250, 255). O cabeçalho do arquivo (linha 21) promete "O log traz só o host"; o teste
   (`atelie-avisos/__tests__/handlers.test.ts:112`) silencia `console.log` e nunca o lê — só prova que
   o **corpo** não ecoa o endpoint. A letra de `MAN-26` nomeia o motor (coberto, F09), mas o endpoint
   é a mesma credencial nos dois lados. **Caso que falta**: espiar `console.log` em `subscribe`,
   `test` (sent/gone/failed) e asserir que nenhuma linha contém a string do endpoint, só o host.
3. **Linha de push `pending` no histórico não tem caso** (C07). `packages/core/src/orders/history.ts:161`:
   hoje toda linha de push não `sent` vira "O aviso no celular não chegou." sem `emailType`. Trocar o
   predicado para `status === 'failed'` deixa uma linha `pending` (o motor reivindicou e morreu antes do
   `finish`) cair no ramo do e-mail — com "A cliente NÃO foi avisada" e `emailType`, ou seja, o
   botão "Reenviar" num push (contra `MAN-38`) — e a suíte fica verde. **Caso que falta**: em
   `history.test.ts`, um push `status: 'pending'` sem `emailType` e sem a frase do e-mail.
4. **"Caminho interno" tem dois donos, e um deles tem uma régua a menos** (inspeção, sem mutante).
   `apps/mobile-adm/public/sw-avisos.js:18` recusa `//` **e** `/\`; `apps/mobile-adm/src/shared/lib/destinoDepoisDoLogin.ts:13`
   recusa só `//`, e `destinoDepoisDoLogin.test.ts:11` não tem o caso da barra invertida
   (`new URL('/\\x.com', origem)` resolve para `https://x.com/`). Não é explorável hoje — `state.from`
   só nasce do `pathname` do próprio `RequireAdmin`, e o navegador normaliza `\` no caminho —, mas é o
   "defeito 01" no tamanho de um predicado: as duas cópias já divergem. **Caso que falta**: `{ from: '/\\host' }` ⇒ `/`,
   ou um dono único da regra lido pelos dois (o SW é JS puro sem build, então a saída provável é um
   teste que compara os dois predicados sobre a mesma tabela de entradas).
5. **`has_role` com `data` não booleano** (F11, quase equivalente). `send-notification/push.ts:157`
   usa `=== true`; `!== false` passaria. A RPC devolve booleano, então só um caso de dublê com `null`
   o prenderia. Baixa prioridade.

## O que NÃO foi provado (não é falha do verificador)

- **Chrome real e Android real** (T28 metade, TQ5/TQ6): a inscrição de verdade no FCM, o aviso
  chegando na tela de bloqueio com só número e valor, o webhook repetido dando um aviso só, o toque
  abrindo `/pedidos/<id>`, `MAN-22` com o app em primeiro plano, e o login que volta ao pedido com a
  sessão vencida. Pendente do usuário, com o roteiro em `prova-navegador.md`.
- **`MAN-39`** só por navegador (144 medidas da T28; jsdom devolve 0 para layout). Não remedido aqui.
- **A semântica SQL** (atomicidade da corrida de `claim_push_test`, permissões, cascata) só por probe
  contra o banco local (`probes/02`, `03`, `05`); este verificador **não** tocou no banco e só mutou a
  migration contra os guardas de fonte da loja.
- **`_shared/webPush.ts`** (o único `jsr:`) fica fora do vitest por desenho (TQ4); provado só pelo
  probe 01 da T02. Nenhum mutante foi aplicado nele.
- **`MAN-42`** é ordem de publicação: documentada, não testável por suíte.

## Estado da árvore ao sair

`git status --porcelain` comparado com o do início: idêntico em tudo o que é da `79`; as únicas
diferenças são `docs/qa/README.md` e 21 arquivos novos em `docs/qa/`, da outra sessão. Este
verificador criou só este arquivo na árvore. Nenhum commit, `stash`, `checkout`, `reset` ou
`restore`; nenhum comando no banco nem nas functions servidas.

---

## Apêndice — conserto das lacunas da r1 (2026-10-25, pelo autor)

As cinco lacunas acima viraram as tasks V01–V05 do `tasks.md`, cada uma com caso novo e o mutante
correspondente reinjetado no arquivo real: F14, P16 (duas linhas de log), C07, a regra antiga de
`destinoDepoisDoLogin` e F11 — **todos mortos por asserção**, SHA-256 conferido na restauração. A lacuna
4 levou uma mudança de produto pequena: `destinoDepoisDoLogin` recusa `/\` como o worker já recusava, e
`caminhoInternoPareado.test.ts` guarda a cópia deliberada. Este apêndice é do autor, não do Verificador.
