#!/usr/bin/env bash
# Work Item 90 · tarefa 01 — a ação `ping` da function `visit` SERVIDA, contra o banco LOCAL (54441/54442).
#
# Pré-requisito: `supabase functions serve visit` de pé (sem --linked; nada aqui toca o hospedado), e a
# migration 20261104120000_presenca-na-loja.sql aplicada no local.
#
# O que prova, pelo caminho real gateway → function → RPC:
#   1. só `apikey` (chave PUBLICÁVEL), sem Authorization, + Origin casando ⇒ 200 `gravada`, e a linha da
#      presença com tipo de página, joia (resolvida pelo slug), sacola, origem e aparelho (`celular`, do UA);
#   2. user agent de robô ⇒ `robô`, nada gravado;
#   3. sem Origin ⇒ `interno`, nada gravado;
#   4. Origin de homologação ⇒ `interno` (decidido no SQL), nada gravado;
#   5. o preflight traz `Access-Control-Max-Age`;
#   6. pulso e visita do MESMO IP não se derrubam: 30 visitas esgotam o teto da visita (a 31ª é 429) e o
#      pulso do mesmo IP segue 200; 120 pulsos esgotam o teto do pulso (o 121º é 429) e a visita do mesmo
#      IP segue 200. O teto é por isolate: o `functions serve` local atende com um worker só.
#
# Estado: `store_settings.analytics.production_host` é semeado como `localhost` SÓ no banco local e
# restaurado por `trap` (inclusive em falha). As linhas gravadas pela prova (presença, minuto, marca de
# sacola e as visitas) são apagadas, e `store_visit_counter` volta ao estado lido antes.
#
# Saída esperada: só linhas `ok —`, e exit 0.
set -euo pipefail

DB="postgresql://postgres:postgres@127.0.0.1:54442/postgres"
URL="http://127.0.0.1:54441/functions/v1/visit"
APIKEY="${APIKEY:-$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["PUBLISHABLE_KEY"])')}"
UA_IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
UA_ROBO='Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
ORIGEM='http://localhost:8082'

novo_id() { python3 -c 'import uuid; print(uuid.uuid4())'; }
q() { psql "$DB" -v ON_ERROR_STOP=1 -At -c "$1"; }

PRESENCAS=()
VISITAS=()

HOST_ANTES="$(q "select coalesce(value->>'production_host', '<ausente>') from public.store_settings where key = 'analytics'")"
CONTADOR_ANTES="$(q "select coalesce((select row_to_json(c)::text from public.store_visit_counter c), 'ausente')")"
SLUG="$(q "select slug from public.products where slug is not null order by slug limit 1")"
PRODUTO="$(q "select id from public.products where slug = '$SLUG' limit 1")"

restaurar() {
  for id in "${PRESENCAS[@]:-}"; do
    [ -n "$id" ] || continue
    q "delete from public.store_presence where presence_id = '$id'; delete from public.store_presence_minutes where presence_id = '$id'; delete from public.store_presence_carts where presence_id = '$id'" >/dev/null
  done
  for id in "${VISITAS[@]:-}"; do
    [ -n "$id" ] || continue
    q "delete from public.store_visits where visitor_id = '$id'" >/dev/null
  done
  if [ "$CONTADOR_ANTES" = "ausente" ]; then
    q "delete from public.store_visit_counter" >/dev/null
  else
    q "update public.store_visit_counter c set started_at = v.started_at, last_recorded_at = v.last_recorded_at, capped_day = v.capped_day
       from json_populate_record(null::public.store_visit_counter, '$CONTADOR_ANTES'::json) v where c.id" >/dev/null
  fi
  if [ "$HOST_ANTES" = "<ausente>" ]; then
    q "update public.store_settings set value = value - 'production_host' where key = 'analytics'" >/dev/null
  else
    q "update public.store_settings set value = jsonb_set(value, '{production_host}', to_jsonb('$HOST_ANTES'::text)) where key = 'analytics'" >/dev/null
  fi
}
trap restaurar EXIT

q "update public.store_settings set value = jsonb_set(value, '{production_host}', '\"localhost\"') where key = 'analytics'" >/dev/null

falhou=0
ok() { echo "ok — $1"; }
falha() { echo "FALHA — $1"; falhou=1; }

# $1 = id, $2 = origem ('' para nenhuma), $3 = user agent, $4 = IP — devolve "corpo\nstatus"
pulsar() {
  local corpo="{\"id\":\"$1\",\"page\":\"joia\",\"product\":\"$SLUG\",\"cart\":2,\"source\":\"instagram\"}"
  local args=(-s -w '\n%{http_code}' -X POST "$URL?action=ping" -H "apikey: $APIKEY" -H 'Content-Type: application/json'
              -H "User-Agent: $3" -H "X-Forwarded-For: $4" -d "$corpo")
  [ -n "$2" ] && args+=(-H "Origin: $2")
  curl "${args[@]}"
}
visitar() { # $1 = id, $2 = IP
  curl -s -w '\n%{http_code}' -X POST "$URL" -H "apikey: $APIKEY" -H 'Content-Type: application/json' \
    -H "User-Agent: $UA_IPHONE" -H "Origin: $ORIGEM" -H "X-Forwarded-For: $2" -d "{\"id\":\"$1\"}"
}
status_de() { printf '%s' "$1" | tail -n1; }
desfecho_de() { printf '%s' "$1" | sed '$d' | python3 -c 'import json,sys; print(json.load(sys.stdin).get("desfecho"))'; }
linhas() { q "select count(*) from public.store_presence where presence_id = '$1'"; }

# 1 — gravada, com as faixas
ID1="$(novo_id)"; PRESENCAS+=("$ID1")
R="$(pulsar "$ID1" "$ORIGEM" "$UA_IPHONE" 198.51.100.10)"
if [ "$(status_de "$R")" = 200 ] && [ "$(desfecho_de "$R")" = gravada ]; then ok "só apikey + Origin casando ⇒ 200 gravada"; else falha "esperado 200 gravada, veio $R"; fi
LINHA="$(q "select page_kind || '|' || coalesce(product_id::text, '') || '|' || cart_items || '|' || source || '|' || device from public.store_presence where presence_id = '$ID1'")"
if [ "$LINHA" = "joia|$PRODUTO|2|instagram|celular" ]; then ok "a presença guarda joia (id do slug), sacola, origem e aparelho celular"; else falha "linha inesperada: $LINHA"; fi
if printf '%s' "$R" | sed '$d' | python3 -c 'import json,sys; d=json.load(sys.stdin); assert isinstance(d["ate"], int) and isinstance(d["agora"], int)'; then ok "ate/agora inteiros na resposta"; else falha "ate/agora não inteiros"; fi

# 2 — robô
ID2="$(novo_id)"; PRESENCAS+=("$ID2")
R="$(pulsar "$ID2" "$ORIGEM" "$UA_ROBO" 198.51.100.11)"
if [ "$(desfecho_de "$R")" = 'robô' ] && [ "$(linhas "$ID2")" = 0 ]; then ok "robô ⇒ robô, nada gravado"; else falha "robô: $R"; fi

# 3 — sem Origin
ID3="$(novo_id)"; PRESENCAS+=("$ID3")
R="$(pulsar "$ID3" '' "$UA_IPHONE" 198.51.100.12)"
if [ "$(desfecho_de "$R")" = interno ] && [ "$(linhas "$ID3")" = 0 ]; then ok "sem Origin ⇒ interno, nada gravado"; else falha "sem Origin: $R"; fi

# 4 — Origin de homologação (decidido no SQL)
ID4="$(novo_id)"; PRESENCAS+=("$ID4")
R="$(pulsar "$ID4" 'https://umaestrelinha-store-five.vercel.app' "$UA_IPHONE" 198.51.100.13)"
if [ "$(desfecho_de "$R")" = interno ] && [ "$(linhas "$ID4")" = 0 ]; then ok "Origin de homologação ⇒ interno, nada gravado"; else falha "homologação: $R"; fi

# 5 — preflight
# O gateway LOCAL (Kong do `supabase start`) responde o OPTIONS sozinho, sem chegar à function — medido
# em 2026-11-01: `Server: kong`, `Content-Length: 0`, sem os headers do `corsHeaders`. Aí não há como provar
# o Max-Age no local; a prova é o teste da function com deps injetadas (`visit/__tests__/ping.test.ts`).
PRE="$(curl -s -o /dev/null -D - -X OPTIONS "$URL?action=ping" -H "Origin: $ORIGEM" -H 'Access-Control-Request-Method: POST' | tr -d '\r')"
MAXAGE="$(printf '%s\n' "$PRE" | awk -F': ' 'tolower($1)=="access-control-max-age"{print $2}')"
if [ -n "$MAXAGE" ] && [ "$MAXAGE" -ge 600 ]; then ok "preflight com Access-Control-Max-Age ($MAXAGE)"
elif printf '%s\n' "$PRE" | grep -qi '^server: kong' && ! printf '%s\n' "$PRE" | grep -qi '^access-control-allow-headers'; then
  echo "pulado — o Kong local responde o preflight sem chegar à function (provado por ping.test.ts)"
else falha "preflight sem Max-Age"; fi

# 6a — 30 visitas do IP A esgotam a visita; o pulso do IP A segue de pé
IP_A=198.51.100.20
for _ in $(seq 1 30); do V="$(novo_id)"; VISITAS+=("$V"); visitar "$V" "$IP_A" >/dev/null; done
V="$(novo_id)"; VISITAS+=("$V")
if [ "$(status_de "$(visitar "$V" "$IP_A")")" = 429 ]; then ok "a 31ª visita do mesmo IP ⇒ 429"; else falha "a 31ª visita não deu 429"; fi
ID5="$(novo_id)"; PRESENCAS+=("$ID5")
if [ "$(status_de "$(pulsar "$ID5" "$ORIGEM" "$UA_IPHONE" "$IP_A")")" = 200 ]; then ok "com a visita esgotada, o pulso do mesmo IP ⇒ 200"; else falha "a visita esgotada derrubou o pulso"; fi

# 6b — 120 pulsos do IP B esgotam o pulso; a visita do IP B segue de pé
IP_B=198.51.100.21
ID6="$(novo_id)"; PRESENCAS+=("$ID6")
for _ in $(seq 1 120); do pulsar "$ID6" "$ORIGEM" "$UA_IPHONE" "$IP_B" >/dev/null; done
if [ "$(status_de "$(pulsar "$ID6" "$ORIGEM" "$UA_IPHONE" "$IP_B")")" = 429 ]; then ok "o 121º pulso do mesmo IP ⇒ 429"; else falha "o 121º pulso não deu 429"; fi
V="$(novo_id)"; VISITAS+=("$V")
if [ "$(status_de "$(visitar "$V" "$IP_B")")" = 200 ]; then ok "com o pulso esgotado, a visita do mesmo IP ⇒ 200"; else falha "o pulso esgotado derrubou a visita"; fi

exit $falhou
