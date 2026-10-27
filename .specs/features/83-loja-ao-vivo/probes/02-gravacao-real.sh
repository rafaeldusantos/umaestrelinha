#!/usr/bin/env bash
# Feature 83 · probe LAV-70 pelo caminho COMPROMETIDO — a hora gravada fora de `begin … rollback`.
#
# `01-acessos.sql` passa `p_agora` à mão. Este roda a corrida da 71 (`concorrencia.sql`, duas sessões
# simultâneas, `record_store_visit(:id)` com o `now()` do servidor, cada uma comprometendo) contra a
# migration JÁ APLICADA no banco local, e confere: UMA linha, `first_hour` não nulo e igual à hora de
# Brasília do relógio do servidor no instante da chamada (lida antes e depois: na virada de hora,
# vale qualquer uma das duas), e a sessão que perdeu a corrida não mexeu na hora.
#
# Limpa o que gravou e devolve `store_visit_counter` ao estado lido antes. Nada aqui usa --linked.
#
#   bash .specs/features/83-loja-ao-vivo/probes/02-gravacao-real.sh
#
# O caminho pela function `visit` (gateway → function → RPC com a chave de serviço) é o
# `function-visit.sh` da 71 e exige `supabase functions serve visit` de pé.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
CORRIDA="$DIR/../../71-visitas-unicas-no-dashboard/probes/concorrencia.sql"
URL="postgresql://postgres:postgres@127.0.0.1:54442/postgres"
TMP="$(mktemp -d)"
ID="$(uuidgen | tr 'A-Z' 'a-z')"
q() { psql "$URL" -X -At -v ON_ERROR_STOP=1 -c "$1"; }

ANTES="$(q "select coalesce((select row_to_json(c)::text from public.store_visit_counter c where id), 'ausente')")"
HORA_ANTES="$(q "select extract(hour from now() at time zone 'America/Sao_Paulo')::int")"

psql "$URL" -X -q -v ON_ERROR_STOP=1 -v id="$ID" -v espera=2 -f "$CORRIDA" > "$TMP/a.log" 2>&1 &
PA=$!
sleep 0.5
psql "$URL" -X -q -v ON_ERROR_STOP=1 -v id="$ID" -v espera=0 -f "$CORRIDA" > "$TMP/b.log" 2>&1 &
PB=$!
wait "$PA"; wait "$PB"
HORA_DEPOIS="$(q "select extract(hour from now() at time zone 'America/Sao_Paulo')::int")"

LINHAS="$(q "select count(*) from public.store_visits where visitor_id = '$ID'")"
HORA="$(q "select coalesce(first_hour::text, 'null') from public.store_visits where visitor_id = '$ID'")"
DIA="$(q "select day::text from public.store_visits where visitor_id = '$ID'")"
DIA_BRT="$(q "select (now() at time zone 'America/Sao_Paulo')::date::text")"
echo "sessão A: $(grep '^RESPOSTA' "$TMP/a.log")"
echo "sessão B: $(grep '^RESPOSTA' "$TMP/b.log")"
echo "linhas=$LINHAS dia=$DIA first_hour=$HORA hora de Brasília antes/depois=$HORA_ANTES/$HORA_DEPOIS"

FALHOU=0
ok() { echo "ok — $1"; }
falha() { echo "FALHOU: $1"; FALHOU=1; }
[ "$LINHAS" = "1" ] && ok "a corrida deixou UMA linha" || falha "esperava 1 linha, veio $LINHAS"
grep -q '"desfecho": "gravada"' "$TMP/a.log" && grep -q '"desfecho": "repetida"' "$TMP/b.log" \
  && ok "A gravou e B respondeu repetida" || falha "desfechos inesperados"
[ "$HORA" != "null" ] && ok "first_hour não é nulo pelo caminho comprometido" || falha "first_hour nulo"
{ [ "$HORA" = "$HORA_ANTES" ] || [ "$HORA" = "$HORA_DEPOIS" ]; } \
  && ok "first_hour = a hora de Brasília da chamada ($HORA)" || falha "first_hour $HORA ≠ $HORA_ANTES/$HORA_DEPOIS"
[ "$DIA" = "$DIA_BRT" ] && ok "o dia é o de Brasília ($DIA)" || falha "dia $DIA ≠ $DIA_BRT"

q "delete from public.store_visits where visitor_id = '$ID'" >/dev/null
if [ "$ANTES" = "ausente" ]; then
  q "delete from public.store_visit_counter where id" >/dev/null
else
  q "update public.store_visit_counter c set started_at = a.started_at, last_recorded_at = a.last_recorded_at, capped_day = a.capped_day from json_populate_record(null::public.store_visit_counter, '$ANTES'::json) a where c.id" >/dev/null
fi
DEPOIS="$(q "select coalesce((select row_to_json(c)::text from public.store_visit_counter c where id), 'ausente')")"
[ "$DEPOIS" = "$ANTES" ] && ok "banco limpo (contador como antes)" || falha "contador não voltou"
rm -rf "$TMP"
exit "$FALHOU"
