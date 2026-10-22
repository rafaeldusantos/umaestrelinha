#!/usr/bin/env bash
# Feature 71 · probe VIS-14 — duas chamadas SIMULTÂNEAS com o mesmo id deixam UMA linha, e as duas
# respondem (`gravada` e `repetida`). Roda contra o banco LOCAL (54442), depois de
# `supabase migration up --local`. Limpa o que gravou e devolve `store_visit_counter` ao estado lido
# antes (apaga a linha se ela não existia).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
URL="postgresql://postgres:postgres@127.0.0.1:54442/postgres"
TMP="$(mktemp -d)"
ID="$(uuidgen | tr 'A-Z' 'a-z')"

ANTES="$(psql "$URL" -Atc "select coalesce((select row_to_json(c)::text from public.store_visit_counter c where id), 'ausente')")"
echo "contador antes: $ANTES"

psql "$URL" -q -v ON_ERROR_STOP=1 -v id="$ID" -v espera=2 -f "$DIR/concorrencia.sql" > "$TMP/a.log" 2>&1 &
PA=$!
sleep 0.5
psql "$URL" -q -v ON_ERROR_STOP=1 -v id="$ID" -v espera=0 -f "$DIR/concorrencia.sql" > "$TMP/b.log" 2>&1 &
PB=$!
wait "$PA"; wait "$PB"

RA="$(grep '^RESPOSTA' "$TMP/a.log")"; RB="$(grep '^RESPOSTA' "$TMP/b.log")"
echo "sessão A: $RA"
echo "sessão B: $RB"
LINHAS="$(psql "$URL" -Atc "select count(*) from public.store_visits where visitor_id = '$ID'")"
echo "linhas do id: $LINHAS"

FALHOU=0
[ "$LINHAS" = "1" ] || { echo "FALHOU: esperava 1 linha"; FALHOU=1; }
echo "$RA" | grep -q '"desfecho": "gravada"' || { echo "FALHOU: A não gravou"; FALHOU=1; }
echo "$RB" | grep -q '"desfecho": "repetida"' || { echo "FALHOU: B não respondeu repetida"; FALHOU=1; }
echo "$RA$RB" | grep -Eq '"ate": [0-9]+,' || { echo "FALHOU: ate não é inteiro"; FALHOU=1; }

# Limpeza: as linhas gravadas e o contador no estado de antes.
psql "$URL" -q -v ON_ERROR_STOP=1 -c "delete from public.store_visits where visitor_id = '$ID'"
if [ "$ANTES" = "ausente" ]; then
  psql "$URL" -q -v ON_ERROR_STOP=1 -c "delete from public.store_visit_counter where id"
else
  psql "$URL" -q -v ON_ERROR_STOP=1 -c "update public.store_visit_counter c set started_at = a.started_at, last_recorded_at = a.last_recorded_at, capped_day = a.capped_day from json_populate_record(null::public.store_visit_counter, '$ANTES'::json) a where c.id"
fi
DEPOIS="$(psql "$URL" -Atc "select coalesce((select row_to_json(c)::text from public.store_visit_counter c where id), 'ausente')")"
echo "contador depois da limpeza: $DEPOIS"
[ "$DEPOIS" = "$ANTES" ] || { echo "FALHOU: contador não voltou ao estado de antes"; FALHOU=1; }
[ "$(psql "$URL" -Atc "select count(*) from public.store_visits where visitor_id = '$ID'")" = "0" ] || { echo "FALHOU: sobrou linha"; FALHOU=1; }

rm -rf "$TMP"
[ "$FALHOU" = "0" ] && echo "ok: concorrência — 1 linha, gravada + repetida, banco limpo"
exit "$FALHOU"
