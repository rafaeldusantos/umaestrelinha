# Probe 01 — a biblioteca de Web Push (T02, TQ2)

**Data**: 2026-10-25 · **Script**: `probes/01-biblioteca.ts` · **Biblioteca**: `jsr:@negrel/webpush@0.5.0`
(dependências resolvidas: `@negrel/http-ece@0.7.0`, `@std/encoding@1.0.11`, `@std/bytes@1.0.6`)
**Runtimes**: Deno 2.7.5 (passos 1–5) e `supabase-edge-runtime-1.77.4` (compatível com Deno v2.1.4,
passo 6), servido por `supabase functions serve --no-verify-jwt` no local (porta 54441).

**Veredito: os seis passos verdes. O portão de risco está aberto; a escolha da biblioteca fica.**

## Como rodar

```bash
cd .specs/features/79-mobile-adm-aviso-de-pedido/probes
# passos 1–5
deno run --no-lock --allow-net --allow-env --allow-read 01-biblioteca.ts
# passo 6: exige uma function de sonda servida (ver abaixo)
P79_ANON=<anon key local> deno run --no-lock --allow-net --allow-env --allow-read 01-biblioteca.ts \
  --sonda=http://127.0.0.1:54441/functions/v1/p79-sonda
```

A decifração é escrita no próprio probe com WebCrypto (RFC 8291 §3.3–3.4 sobre RFC 8188): HKDF com
`auth` como sal e `"WebPush: info\0" ‖ ua_public ‖ as_public` como info; depois CEK e nonce do sal do
cabeçalho; AES-GCM; recorte do delimitador `0x02` do último registro. Nada da biblioteca é usado para
decifrar — o que se prova é que o que ela cifra, um leitor independente abre.

## Saída real (última execução, exit 0)

```
ok   — 1 chaves geradas, exportadas (JWK) e reimportadas: JSON de 420 caracteres com publicKey/privateKey (kty=EC, crv=P-256); applicationServerKey igual antes/depois: true; 65 bytes
ok   — 2 inscrição sintética: p256dh 65 bytes (0x04), auth 16 bytes
ok   — 3 pushTextMessage contra o servidor local: capturas: 1; erro: nenhum
ok   — 4a Content-Encoding: Content-Encoding: aes128gcm
ok   — 4b TTL: TTL: 3600
ok   — 4c Authorization VAPID: Authorization: vapid t=<JWT ES256>, k=<65 bytes>; assinatura ES256 válida contra k: true; aud=http://127.0.0.1:61902; sub=mailto:P79@exemplo.invalid; exp em 3600 s; k == applicationServerKey: true
ok   — 4d corpo decifrado (RFC 8291/8188, WebCrypto) de volta ao JSON enviado: corpo 208 bytes; rs=65536; idlen=65; cifrado 122 bytes; decifrado == enviado: true; JSON: {"title":"Pedido #0244 pago","body":"R$ 189,00","url":"/pedidos/P79","tag":"pedido-P79-owner_order_paid"}
ok   — 5a 410 → PushMessageError, isGone() === true: {"classe":"PushMessageError","gone":true,"http":410}
ok   — 5b 429 → PushMessageError, isGone() === false: {"classe":"PushMessageError","gone":false,"http":429}
ok   — 5c 404 → PushMessageError, isGone() === false (achado: a lib só chama 410 de gone; o 404 é do adaptador): {"classe":"PushMessageError","gone":false,"http":404}
ok   — 6 o mesmo import dentro de uma function servida (functions serve): HTTP 200; resposta: {"ok":true,"runtime":"edge","lib":"jsr:@negrel/webpush@0.5.0"}; pedidos que a function mandou ao servidor do probe: 1; Content-Encoding: aes128gcm; corpo decifrado == enviado: true
TODOS OS PASSOS OK
```

O passo 6 decifra também o corpo que saiu **de dentro do edge runtime** (para `host.docker.internal`,
o servidor de captura do probe): o `jsr:` resolve no container e a cifra é a mesma.

## Achados para as tasks seguintes

1. **`isGone()` é só o 410.** O fonte (`subscriber.ts:155`) é `response.status === 410`. O 404 sai
   como `PushMessageError` com `isGone() === false`. O design (§4.2, `MAN-04`) trata 404 **e** 410 como
   "apagar": o adaptador puro (`_shared/pushOutcome.ts`, T12) tem de decidir pelo **status**
   (`e.response.status`), nunca por `isGone()`. Medido no passo 5c.
2. **A lib não aceita `signal`** (R3 do design confirmado no fonte): `fetch(endpoint, { method, headers, body })`
   sem `AbortSignal`. O prazo é `Promise.race`, como o design manda.
3. **`aud` do JWT é a origem do endpoint** (`new URL(endpoint).origin`), e `exp` é +1 h fixo. `TTL`
   padrão da lib é 2419200 (28 dias) quando não passado; o adaptador deve passar o próprio.
4. **`ApplicationServer.new({ contactInformation, vapidKeys })`** gera um par ECDH novo a cada
   instância (as chaves de cifra, não as VAPID) — custo de uma geração de chave por envio se o
   adaptador instanciar por mensagem; instanciar uma vez por `createWebPushSender` evita.
5. O JSON de `exportVapidKeys` tem 420 caracteres e é o valor de `VAPID_KEYS`.

## A function de sonda (temporária, apagada)

`supabase/functions/p79-sonda/index.ts` — gerava chaves, inscrevia o par do probe e chamava
`pushTextMessage` para o servidor de captura. **Apagada** ao fim; `ls supabase/functions` voltou a ser
igual ao da T01 (`_shared admin-users checkout google-analytics google-feed melhor-envio mercado-pago
send-notification visit`), e `git status supabase/` vazio. O `functions serve` foi parado (nenhum
container de edge runtime ficou de pé).

## As chaves de dev

Geradas pelo passo 1 e gravadas pelo `--gravar-env` no `.env` da **raiz** (`git check-ignore -v .env`
→ `.gitignore:25:.env`): `VAPID_KEYS` (o JSON JWK das duas metades) e `VAPID_SUBJECT`. Nenhuma chave
aparece neste arquivo, no script ou em qualquer arquivo versionado — a saída do probe imprime só
tamanhos e formas.

## `deno.lock`

As execuções deste probe sem `--no-lock` gravaram as entradas do `@negrel/webpush` no `deno.lock` da
raiz. O arquivo foi devolvido ao conteúdo do `HEAD` (ver `probe-02.md`) e as instruções acima passaram
a usar `--no-lock`.
