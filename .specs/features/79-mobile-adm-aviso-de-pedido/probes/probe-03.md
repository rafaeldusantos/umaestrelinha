# Probe 03 — a porta `atelie-avisos` servida (T26)

**Data**: 2026-10-25 · **Script**: `probes/03-porta.ts` · **Alvo**: Supabase **local** (API 54441,
Postgres 54442), a function servida por `supabase functions serve --env-file .env` (edge runtime
1.77.4; as chaves VAPID de dev vêm do `.env` da raiz, nunca escritas aqui), e o **FCM de verdade**
(`fcm.googleapis.com`) para o `test`.
**Veredito: 19 de 19 passos verdes (exit 0), um ACHADO registrado (o teto de 30 s some com a linha
apagada por "gone"), fixturas apagadas, `functions serve` parado, `deno.lock` intocado.**

## Como rodar

```bash
supabase functions serve --env-file .env        # noutro terminal
eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY|DB_URL)=')"
cd .specs/features/79-mobile-adm-aviso-de-pedido/probes
API_URL=$API_URL ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY DB_URL=$DB_URL \
  deno run --no-lock --node-modules-dir=none --allow-net --allow-env 03-porta.ts
```

- **Contas de verdade**: três (`p79-porta-admin-a`, `-admin-b`, `-sem-papel`, `@exemplo.invalid`)
  criadas pela API admin do GoTrue com a service role, duas com `user_roles.role = 'admin'`, e
  **entradas por e-mail e senha** — o JWT que a function valida (`requireAdmin` → `getUser` →
  `has_role`) é o que o GoTrue emitiu, não um assinado no probe.
- **Inscrições sintéticas com chaves válidas**: um par ECDH P-256 gerado no probe (65 bytes, `0x04`) e
  `auth` de 16 bytes, para o `test` cifrar de verdade antes de ir ao FCM. Endpoints
  `https://fcm.googleapis.com/fcm/send/P79-…`; a saída do probe nunca imprime o endpoint inteiro.
- **Fixturas apagadas no `finally`**: inscrições, papéis, a ficha de cliente que `handle_new_customer`
  cria e as contas (pela API admin). Contagens conferidas antes e depois.

## Saída real (segunda execução)

```
contagens antes: {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9,"customers":11,"user_roles":3}
ok   — sem Authorization ⇒ 401; com a anon key ⇒ 401: 401 {"error":"Não autenticado"} · 401 {"error":"Não autenticado"}
ok   — conta sem papel: as seis ações ⇒ 403, e nada gravado: config 403 Acesso restrito ao admin · status 403 Acesso restrito ao admin · subscribe 403 Acesso restrito ao admin · events 403 Acesso restrito ao admin · unsubscribe 403 Acesso restrito ao admin · test 403 Acesso restrito ao admin · push_subscriptions 0→0
ok   — config (admin) ⇒ 200 com a chave pública: 65 bytes, prefixo 0x04: 200, 87 caracteres, 65 bytes, prefixo 0x04
ok   — status de um endereço desconhecido ⇒ subscribed false: 200 {"subscribed":false,"events":[]}
ok   — subscribe (dono novo) ⇒ 200, a linha da conta A com os quatro eventos: 200 {"events":["owner_order_received","owner_order_paid","owner_payment_rejected","owner_material_incoming"]}; linha da conta A, ["owner_order_received","owner_order_paid","owner_payment_rejected","owner_material_incoming"]
ok   — status do endereço inscrito ⇒ subscribed true com os quatro: 200 {"subscribed":true,"events":["owner_order_received","owner_order_paid","owner_payment_rejected","owner_material_incoming"]}
ok   — events com um subconjunto válido ⇒ 200 e gravado: 200 {"events":["owner_order_paid"]}
ok   — events com evento fora dos quatro ⇒ 400, nada gravado: 400 {"error":"unknown_event"}
ok   — subscribe de novo, MESMO dono ⇒ os eventos escolhidos ficam: 200 {"events":["owner_order_paid"]}
ok   — subscribe com host fora da lista, http: ou chave curta ⇒ 400, nada gravado: 400 host_not_allowed · 400 not_https · 400 invalid_p256dh; a conta A segue com 1 linha
ok   — troca de dono: a conta B inscreve o endereço da A ⇒ a linha passa a B, os eventos voltam aos quatro, e a A não o vê mais: subscribe B 200 {"events":["owner_order_received","owner_order_paid","owner_payment_rejected","owner_material_incoming"]}; linha da conta B; status A {"subscribed":false,"events":[]}; events A 404 not_found; linhas no endereço: 1
ok   — unsubscribe existente ⇒ 200 e a linha some; ausente ⇒ 200 também: 200 {"ok":true} · 200 {"ok":true}; linha ausente
ok   — a 11ª inscrição despeja a usada há mais tempo (o 5º endereço, por last_used_at), e a conta fica com 10: antes 10; subscribe 200; depois 10; o 5º saiu; o 1º ficou; a 11ª entrou
ok   — test de um endereço sem linha da conta ⇒ 404, e o teto de 30 s NÃO consumido: 404 {"error":"not_found"}
     desfecho do FCM: HTTP da porta 410 {"error":"gone"} em 221 ms; a linha foi APAGADA
ok   — test contra o FCM real (endereço sintético) ⇒ um desfecho da porta coerente com o que aconteceu à linha: 410 gone; linha apagada
ACHADO — test de OUTRO aparelho logo depois de o testado ter sido apagado (gone): 410 {"error":"gone"} (a spec pede 429 a cada 30 s por conta; a linha de epT2 foi apagada)
ok   — test de OUTRO aparelho da mesma conta com o testado ainda inscrito ⇒ 429 cooldown (o teto é por conta): primeiro 410 {"error":"gone"} · segundo 429 {"error":"cooldown"}; a linha do segundo ficou, sem envio
ok   — o test não escreve em order_notifications: 11 → 11
ok   — nenhum corpo de resposta ecoou um endpoint: nenhum
contagens depois: {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9,"customers":11,"user_roles":3}
ok   — fixturas P79- apagadas: contagens iguais às de antes: {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9,"customers":11,"user_roles":3} → {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9,"customers":11,"user_roles":3}
TODOS OS PASSOS OK
```

Log da function no `functions serve` (só hosts, nunca o endpoint inteiro — `MAN-37`):

```
{"action":"atelie-avisos:test","status":"gone","host":"fcm.googleapis.com","http":410}
```

## O desfecho do FCM

O FCM de verdade, diante de um endereço `…/fcm/send/P79-…` que nunca existiu (com o pedido cifrado em
`aes128gcm` e assinado com a VAPID de dev), responde **HTTP 410**, em 220–520 ms. A porta lê isso como
`gone`: **apaga a linha** e responde **410 `{"error":"gone"}`** ao app (que volta ao estado
`desligado`). Nas duas execuções, e nas cinco chamadas ao FCM das duas, o desfecho foi o mesmo.

## Leitura

| Comportamento | Requisito | Evidência |
| --- | --- | --- |
| sem `Authorization` e com a anon key ⇒ 401 | `MAN-23` | 401 `Não autenticado` nos dois |
| conta **sem papel**: as seis ações recusadas, nada gravado | `MAN-23` | 403 nas seis; `push_subscriptions` 0 → 0 |
| `config` devolve a chave pública do MESMO secret | `MAN-37` | 87 caracteres, 65 bytes, prefixo `0x04` |
| `status` desconhecido/inscrito | `MAN-36` | `subscribed:false` · `subscribed:true` com os quatro |
| `subscribe` de dono novo ⇒ os quatro eventos | `MAN-25`, A5 | a linha da conta A com os quatro |
| `events` subconjunto válido / evento fora | `MAN-14`, `MAN-25` | 200 gravado · 400 `unknown_event`, nada gravado |
| `subscribe` do MESMO dono mantém os eventos | `MAN-27` | `["owner_order_paid"]` mantido |
| endpoint fora da lista, `http:`, chave curta | `MAN-25` | 400 `host_not_allowed` · `not_https` · `invalid_p256dh`; nada gravado |
| **troca de dono** do mesmo endereço | `MAN-27` | a linha passa à conta B, eventos de volta aos quatro, uma linha só; a A vê `subscribed:false` e o `events` dela dá 404 |
| `unsubscribe` existente e ausente | `MAN-15` | 200 e 200; a linha some |
| **o despejo da 11ª** pelo `last_used_at` | `MAN-28` | com o **5º** endereço envelhecido, é ele que sai (o 1º fica); a conta fica com 10 |
| `test` de endereço sem linha da conta | `MAN-31` | 404, e o teto **não** consumido |
| `test` contra o FCM real | `MAN-31`, `MAN-35` | 410 do FCM ⇒ linha apagada ⇒ 410 `gone` ao app |
| teto de 30 s por conta, com a linha testada viva | `MAN-33` | dois `test` simultâneos em dois aparelhos: o 1º vai ao FCM, o 2º recebe **429 `cooldown`** e não envia |
| o `test` não escreve em `order_notifications` | `MAN-31` | 11 → 11 |
| nenhum corpo ecoa o endpoint | `MAN-37` | nenhum, em todas as respostas |
| fixturas apagadas | — | `orders` 78, `order_notifications` 11, `push_subscriptions` 0, `auth.users` 9, `customers` 11, `user_roles` 3 — iguais às da T01 e às de antes |

## Conserto (2026-10-25)

O achado abaixo foi consertado: o teto mora **por conta** em `public.push_test_claims`, fora da
inscrição (`design.md` §4.4). A terceira execução do `03-porta.ts` (contra a migration editada e a
porta sem `last_test_at` no `subscribe`) deu **20/20, exit 0**, com o passo novo:

```
     desfecho do FCM: HTTP da porta 410 {"error":"gone"} em 300 ms; a linha foi APAGADA; o teto da conta gravado
ok   — test de OUTRO aparelho logo depois do testado (apagado se gone) ⇒ 429 cooldown: o teto é da conta: primeiro 410 (linha apagada) · segundo 429 {"error":"cooldown"}; a linha de epT2 ficou, sem envio
contagens depois: {"orders":78,"order_notifications":11,"push_subscriptions":0,"push_test_claims":0,"auth_users":9,"customers":11,"user_roles":3}
```

O mesmo caso, só no banco, é `probes/05-teto-do-teste.ts`: com a regra antiga **reprova** (A=true, a
linha de A apagada, B=true; exit 1) e com a nova passa (B=false; exit 0, duas execuções).

## ACHADO — o teto de 30 s mora na linha, e a linha "gone" o leva junto

A primeira execução tinha o passo "test de OUTRO aparelho da mesma conta dentro de 30 s ⇒ 429" logo
depois do teste no FCM, e ele **reprovou**: deu **410**, não 429. A causa está na forma, não num erro
de código: `claim_push_test` decide pelo `last_test_at` das **linhas** da conta, e a porta grava esse
instante na linha do aparelho testado. Quando o FCM responde 410, a porta (corretamente, `MAN-35`)
apaga essa linha — e o teto da conta some com ela. O teste seguinte, noutro aparelho da mesma conta,
sai na hora.

- **Consequência**: só com aparelhos cuja inscrição o serviço de push já descartou. Cada teste nesse
  caminho apaga uma linha, então o "atalho" se esgota em no máximo 10 testes (o teto de inscrições da
  conta). Não há envio a terceiros, e com um aparelho vivo o teto vale (passo do 429 acima).
- **Não consertado aqui**: é forma da migration e do `design.md` (§4.4), aprovados; a decisão fica com
  o orquestrador (ex.: gravar o instante do teste numa coluna da conta, ou não apagar a linha antes de
  30 s). O passo do probe foi reescrito para provar o teto **com a linha viva** e o achado ficou
  impresso como `ACHADO —`, fora da contagem de passos.
