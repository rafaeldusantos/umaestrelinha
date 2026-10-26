# Probe 02 — o banco das inscrições (T08)

**Data**: 2026-10-25 · **Script**: `probes/02-banco.ts` · **Alvo**: Supabase **local** (API 54441,
Postgres 54442), com a migration `20261026120000_79-avisos-no-celular.sql` aplicada só no local (T06).
**Veredito: 20 de 20 passos verdes, duas execuções seguidas (exit 0), fixturas apagadas.**

## Como rodar

```bash
eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY|JWT_SECRET|DB_URL)=')"
cd .specs/features/79-mobile-adm-aviso-de-pedido/probes
API_URL=$API_URL ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY JWT_SECRET=$JWT_SECRET DB_URL=$DB_URL \
  deno run --no-lock --node-modules-dir=none --allow-net --allow-env --allow-read --allow-sys 02-banco.ts
```

O que o probe faz, e como:

- **PostgREST de verdade** para `anon`, `authenticated` e `service_role`. O JWT de `authenticated` é
  assinado no próprio probe (HS256 com o `JWT_SECRET` local) para duas contas: a **dona da linha** e
  uma conta **admin** já existente no banco (só leitura; nada é gravado nela).
- **Duas conexões Postgres** (`npm:postgres@3.4.4`) para a corrida de `claim_push_test`: a conexão A
  abre uma transação, chama a RPC e segura 1,2 s antes do `commit`; a B chama 200 ms depois. Depois,
  as duas sem pausa (`Promise.all`).
- **O `check` de canal** é exercitado dentro de uma transação desfeita (`rollback` forçado), então
  nenhuma linha de `order_notifications` chega a existir.
- **Fixturas**: três contas `p79-…@exemplo.invalid` criadas em `auth.users` e endpoints
  `https://fcm.googleapis.com/fcm/send/P79-…`; apagadas no `finally` (inscrições, a ficha de cliente
  que o trigger `handle_new_customer` cria, e as contas).

## Saída real (segunda execução)

```
contagens antes: {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9}
ok   — service_role grava pelo PostgREST: POST 201; events nasceu ["owner_order_received","owner_order_paid","owner_payment_rejected","owner_material_incoming"]
ok   — o default de events são os quatro owner_* (A5): ["owner_order_received","owner_order_paid","owner_payment_rejected","owner_material_incoming"]
ok   — service_role lê pelo PostgREST: GET 200, 1 linha(s)
ok   — anon: select/insert/update/delete recusados: select 401 42501 · insert 401 42501 · update 401 42501 · delete 401 42501
ok   — authenticated (conta A, dona da linha): select/insert/update/delete recusados: select 403 42501 · insert 403 42501 · update 403 42501 · delete 403 42501
ok   — authenticated (admin): select/insert/update/delete recusados: select 403 42501 · insert 403 42501 · update 403 42501 · delete 403 42501
ok   — a linha seguiu intocada depois das tentativas: ["owner_order_received","owner_order_paid","owner_payment_rejected","owner_material_incoming"]
ok   — unique(endpoint): o mesmo aparelho não vira duas linhas (MAN-27): 23505 push_subscriptions_endpoint_key
ok   — check de events: fora dos quatro recusado; vazio e subconjunto aceitos: fora: 23514 push_subscriptions_events_check · vazio: aceitou · um: aceitou
ok   — claim_push_test: anon e authenticated (admin) recusados pelo PostgREST: anon 401 42501 · admin 403 42501
ok   — as recusas não gravaram last_test_at: 0 linha(s) com last_test_at
ok   — claim_push_test com duas conexões concorrentes: exatamente uma true, e a segunda esperou a trava: A=true → A commit → B=false depois de 1012 ms
ok   — duas chamadas simultâneas sem pausa: exatamente uma true: [false,true]
ok   — dentro de 30 s ⇒ false (mesmo noutro aparelho da conta): false
ok   — endpoint de outra conta ⇒ false, e nada gravado na conta B: ok=false; last_test_at de B: null
ok   — service_role chama a RPC pelo PostgREST (conta B, primeira vez) ⇒ true: 200 true
ok   — depois de 30 s ⇒ true de novo: true
ok   — order_notifications aceita channel = 'push' e recusa 'sms' (MAN-34): push: aceitou (desfeito) · sms: 23514 order_notifications_channel_check
ok   — apagar a conta leva as inscrições junto (MAN-29): 2 → 0
contagens depois: {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9}
ok   — fixturas P79- apagadas: contagens iguais às de antes: {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9} → {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9}
TODOS OS PASSOS OK
```

## Leitura

| Comportamento | Requisito | Evidência |
| --- | --- | --- |
| `anon` recusado nas quatro operações | `MAN-23` | 401 `42501` em select/insert/update/delete |
| `authenticated` recusado — **a dona da linha e o admin** | `MAN-23` | 403 `42501` nas quatro, nas duas contas |
| `service_role` lê e grava | A16 | POST 201, GET 200 |
| `default` de `events` = os quatro `owner_*` | A5 | a linha nasceu com os quatro |
| `unique(endpoint)` | `MAN-27` | `23505 push_subscriptions_endpoint_key` |
| `check` de `events` | `MAN-25` (base) | fora dos quatro: `23514`; vazio e subconjunto aceitos |
| `claim_push_test` fechada a `anon`/`authenticated` | `MAN-33` | 401/403 `42501`, e nenhum `last_test_at` gravado |
| corrida com a trava segurada | `MAN-33` | `A=true → A commit → B=false depois de ~1020 ms`: a B **esperou** a trava |
| corrida sem pausa | `MAN-33` | exatamente uma `true` |
| dentro de 30 s, outro aparelho da mesma conta | `MAN-33` | `false` (o teto é por conta) |
| endpoint de outra conta | `MAN-33`, A16 | `false`, e nada gravado na outra conta |
| passados 30 s | `MAN-33` | `true` de novo (o tempo foi empurrado para trás, não esperado) |
| `order_notifications.channel = 'push'` | `MAN-34` | aceito (desfeito); `'sms'` → `23514 order_notifications_channel_check` |
| cascata ao apagar a conta | `MAN-29` | 2 inscrições → 0 |
| fixturas apagadas | — | `orders` 78, `order_notifications` 11, `push_subscriptions` 0, `auth.users` 9 — iguais às da T01 e às de antes do probe |

## Um efeito colateral achado e desfeito

A primeira execução (e as do probe 01) **gravaram o `deno.lock` da raiz** (+37 linhas: o
`@negrel/webpush` e o `postgres`). O arquivo foi devolvido ao conteúdo do `HEAD` e as instruções dos
dois probes passaram a usar `--no-lock`; a segunda execução não tocou nele (`git status deno.lock`
vazio). Quando a T12 puser `jsr:@negrel/webpush@0.5.0` num arquivo de function, a entrada do lock é
dela.

## Reexecução depois do conserto do probe da T26 (2026-10-25)

O teto passou a morar em `push_test_claims` (por conta). O probe ganhou a recusa da tabela nova a `anon` e
`authenticated` (dona e admin), a leitura pela service role e a cascata do teto; as conferências que liam
`last_test_at` passaram a ler `push_test_claims`. **24 de 24 passos verdes, exit 0:**

```
contagens antes: {"orders":78,"order_notifications":11,"push_subscriptions":0,"push_test_claims":0,"auth_users":9}
ok   — service_role grava pelo PostgREST: POST 201; events nasceu ["owner_order_received","owner_order_paid","owner_payment_rejected","owner_material_incoming"]
ok   — o default de events são os quatro owner_* (A5): ["owner_order_received","owner_order_paid","owner_payment_rejected","owner_material_incoming"]
ok   — service_role lê pelo PostgREST: GET 200, 1 linha(s)
ok   — anon: select/insert/update/delete recusados: select 401 42501 · insert 401 42501 · update 401 42501 · delete 401 42501
ok   — authenticated (conta A, dona da linha): select/insert/update/delete recusados: select 403 42501 · insert 403 42501 · update 403 42501 · delete 403 42501
ok   — authenticated (admin): select/insert/update/delete recusados: select 403 42501 · insert 403 42501 · update 403 42501 · delete 403 42501
ok   — anon: push_test_claims select/insert recusados: select 401 42501 · insert 401 42501
ok   — authenticated (conta A, dona da linha): push_test_claims select/insert recusados: select 403 42501 · insert 403 42501
ok   — authenticated (admin): push_test_claims select/insert recusados: select 403 42501 · insert 403 42501
ok   — service_role lê push_test_claims pelo PostgREST: GET 200
ok   — a linha seguiu intocada depois das tentativas: ["owner_order_received","owner_order_paid","owner_payment_rejected","owner_material_incoming"]
ok   — unique(endpoint): o mesmo aparelho não vira duas linhas (MAN-27): 23505 push_subscriptions_endpoint_key
ok   — check de events: fora dos quatro recusado; vazio e subconjunto aceitos: fora: 23514 push_subscriptions_events_check · vazio: aceitou · um: aceitou
ok   — claim_push_test: anon e authenticated (admin) recusados pelo PostgREST: anon 401 42501 · admin 403 42501
ok   — as recusas não gravaram o teto (push_test_claims): 0 linha(s) da conta A em push_test_claims
ok   — claim_push_test com duas conexões concorrentes: exatamente uma true, e a segunda esperou a trava: A=true → A commit → B=false depois de 1004 ms
ok   — duas chamadas simultâneas sem pausa: exatamente uma true: [true,false]
ok   — dentro de 30 s ⇒ false (mesmo noutro aparelho da conta): false
ok   — endpoint de outra conta ⇒ false, e nada gravado na conta B: ok=false; linhas da conta B em push_test_claims: 0
ok   — service_role chama a RPC pelo PostgREST (conta B, primeira vez) ⇒ true: 200 true
ok   — depois de 30 s ⇒ true de novo: true
ok   — order_notifications aceita channel = 'push' e recusa 'sms' (MAN-34): push: aceitou (desfeito) · sms: 23514 order_notifications_channel_check
ok   — apagar a conta leva as inscrições e o teto junto (MAN-29): inscrições 2 → 0 · teto 1 → 0
contagens depois: {"orders":78,"order_notifications":11,"push_subscriptions":0,"push_test_claims":0,"auth_users":9}
ok   — fixturas P79- apagadas: contagens iguais às de antes: {"orders":78,"order_notifications":11,"push_subscriptions":0,"push_test_claims":0,"auth_users":9} → {"orders":78,"order_notifications":11,"push_subscriptions":0,"push_test_claims":0,"auth_users":9}
TODOS OS PASSOS OK
```
