#!/usr/bin/env bash
# Feature 71 · task 11 — a function `visit` SERVIDA, contra o banco LOCAL (54441/54442).
#
# Pré-requisito: `supabase functions serve visit` de pé (sem --linked; nada aqui toca o hospedado).
#
# O que prova (VIS-13, VIS-14, VIS-23, VIS-29 pelo caminho real gateway → function → RPC):
#   1. só `apikey` (chave PUBLICÁVEL), sem Authorization, + Origin casando ⇒ `gravada`, 1 linha;
#   2. a segunda chamada com o mesmo id ⇒ `repetida`, continua 1 linha;
#   3. user agent HeadlessChrome ⇒ `robô`, nenhuma linha nova;
#   4. sem Origin ⇒ `interno`, nenhuma linha nova;
#   5. Origin de homologação ⇒ `interno`, nenhuma linha nova;
#   6. `ate` e `agora` saem INTEIROS no JSON.
#
# Estado: `store_settings.analytics.production_host` é semeado como `localhost` SÓ no banco local e
# restaurado ao valor lido antes, por `trap` (inclusive em falha). As linhas gravadas pela prova são
# apagadas e `store_visit_counter` volta ao estado lido antes (apagado se não existia).
set -euo pipefail

DB="postgresql://postgres:postgres@127.0.0.1:54442/postgres"
URL="http://127.0.0.1:54441/functions/v1/visit"
APIKEY="${APIKEY:-$(supabase status -o json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["PUBLISHABLE_KEY"])')}"
ID="$(python3 -c 'import uuid; print(uuid.uuid4())')"
UA_IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

q() { psql "$DB" -v ON_ERROR_STOP=1 -At -c "$1"; }

HOST_ANTES="$(q "select coalesce(value->>'production_host', '<ausente>') from public.store_settings where key = 'analytics'")"
CONTADOR_ANTES="$(q "select coalesce((select row_to_json(c)::text from public.store_visit_counter c), 'ausente')")"
LINHAS_ANTES="$(q "select count(*) from public.store_visits")"
echo "antes: production_host=$HOST_ANTES · contador=$CONTADOR_ANTES · linhas=$LINHAS_ANTES"

restaurar() {
  q "delete from public.store_visits where visitor_id = '$ID'" >/dev/null
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
  echo "restaurado: production_host=$(q "select coalesce(value->>'production_host', '<ausente>') from public.store_settings where key = 'analytics'") · contador=$(q "select coalesce((select row_to_json(c)::text from public.store_visit_counter c), 'ausente')") · linhas=$(q "select count(*) from public.store_visits")"
}
trap restaurar EXIT

q "update public.store_settings set value = jsonb_set(value, '{production_host}', '\"localhost\"') where key = 'analytics'" >/dev/null

linhas_do_id() { q "select count(*) from public.store_visits where visitor_id = '$ID'"; }

chamar() { # $1 = origem ('' para nenhuma), $2 = user agent
  local args=(-s -w '\n%{http_code}' -X POST "$URL" -H "apikey: $APIKEY" -H 'Content-Type: application/json' -H "User-Agent: $2" -d "{\"id\":\"$ID\"}")
  [ -n "$1" ] && args+=(-H "Origin: $1")
  curl "${args[@]}"
}

falhou=0
confere() { # $1 = nome, $2 = resposta (corpo\nstatus), $3 = status esperado, $4 = desfecho, $5 = linhas esperadas
  local corpo status desfecho linhas
  corpo="$(printf '%s' "$2" | sed '$d')"; status="$(printf '%s' "$2" | tail -n1)"
  desfecho="$(printf '%s' "$corpo" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("desfecho"))')"
  linhas="$(linhas_do_id)"
  if [ "$status" = "$3" ] && [ "$desfecho" = "$4" ] && [ "$linhas" = "$5" ]; then
    echo "ok   $1 — $status $desfecho, linhas do id = $linhas · $corpo"
  else
    echo "FALHA $1 — esperado $3 $4 linhas=$5, veio $status $desfecho linhas=$linhas · $corpo"; falhou=1
  fi
}

R1="$(chamar 'http://localhost:8082' "$UA_IPHONE")"; confere 'só apikey + Origin casando' "$R1" 200 gravada 1
# `ate` e `agora` inteiros: nenhum ponto decimal no JSON entregue.
if printf '%s' "$R1" | sed '$d' | python3 -c 'import json,sys; d=json.load(sys.stdin); assert isinstance(d["ate"], int) and isinstance(d["agora"], int); assert "." not in sys.argv[1]' "$(printf '%s' "$R1" | sed '$d')"; then
  echo "ok   ate/agora inteiros"
else echo "FALHA ate/agora não inteiros"; falhou=1; fi
R2="$(chamar 'http://localhost:8082' "$UA_IPHONE")"; confere 'segunda chamada, mesmo id' "$R2" 200 repetida 1
q "delete from public.store_visits where visitor_id = '$ID'" >/dev/null
R3="$(chamar 'http://localhost:8082' 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/129.0.0.0 Safari/537.36')"
confere 'user agent HeadlessChrome' "$R3" 200 'robô' 0
R4="$(chamar '' "$UA_IPHONE")"; confere 'sem Origin' "$R4" 200 interno 0
R5="$(chamar 'https://umaestrelinha-store-five.vercel.app' "$UA_IPHONE")"; confere 'Origin de homologação' "$R5" 200 interno 0

exit $falhou
