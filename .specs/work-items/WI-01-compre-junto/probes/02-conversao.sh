#!/usr/bin/env bash
# Probe da conversão de `products.buy_together_ids` em adicionais, contra o banco LOCAL (:54442).
# Roda dentro de UMA transação que termina em ROLLBACK: nada do que ele semeia fica no banco.
# Prova: até 3, na ordem do array, id inexistente / a própria joia / repetido descartados e as
# posições renumeradas sem buraco, joia que já tem adicional intocada, e segunda execução sem efeito.
set -u
PGURL=${PGURL:-postgresql://postgres:postgres@127.0.0.1:54442/postgres}
case "$PGURL" in *127.0.0.1*|*localhost*) ;; *) echo "FALHA — o probe só roda contra o banco local"; exit 2;; esac
MIG="$(cd "$(dirname "$0")/../../../.." && pwd)/supabase/migrations/20261105130000_compre-junto-conversao.sql"
falhas=0
ok()  { echo "ok — $1"; }
bad() { echo "FALHA — $1 ($2)"; falhas=$((falhas+1)); }

SAIDA=$(psql "$PGURL" -v ON_ERROR_STOP=1 -At <<SQL
begin;
create temp table alvo as select id, row_number() over (order by id) as n from products order by id limit 7;
-- A: array com inexistente, ela mesma, repetido e 5 válidos -> 3 primeiros válidos, na ordem
update products set buy_together_ids = array[
  '00000000-0000-0000-0000-00000000dead'::uuid,
  (select id from alvo where n = 2),
  (select id from alvo where n = 1),
  (select id from alvo where n = 2),
  (select id from alvo where n = 3),
  (select id from alvo where n = 4),
  (select id from alvo where n = 5)
] where id = (select id from alvo where n = 1);
-- B: joia que já tem adicional (da dona): não é tocada
update products set buy_together_ids = array[(select id from alvo where n = 3)] where id = (select id from alvo where n = 6);
insert into product_buy_together (product_id, position, kind, target_product_id)
  select (select id from alvo where n = 6), 0, 'product', (select id from alvo where n = 7);
-- C: array vazio -> nada
\i $MIG
select 'A_alvos|' || coalesce(string_agg(t.n::text || '@' || a.position, ',' order by a.position), '')
  from product_buy_together a join alvo t on t.id = a.target_product_id where a.product_id = (select id from alvo where n = 1);
select 'A_tipos|' || count(*) filter (where kind = 'product') || '/' || count(*) from product_buy_together where product_id = (select id from alvo where n = 1);
select 'B|' || string_agg(t.n::text || '@' || a.position, ',') from product_buy_together a join alvo t on t.id = a.target_product_id where a.product_id = (select id from alvo where n = 6);
select 'total1|' || count(*) from product_buy_together where product_id in (select id from alvo);
\i $MIG
select 'total2|' || count(*) from product_buy_together where product_id in (select id from alvo);
rollback;
SQL
)
echo "$SAIDA" | grep -E '^(A_|B\||total)' > /tmp/wi-probe-conversao.txt
v() { grep "^$1|" /tmp/wi-probe-conversao.txt | cut -d'|' -f2; }
[ "$(v A_alvos)" = "2@0,3@1,4@2" ] && ok "até 3, na ordem, sem inexistente/própria/repetido, posições 0..2" || bad "A_alvos" "$(v A_alvos)"
[ "$(v A_tipos)" = "3/3" ] && ok "todos do tipo produto" || bad "A_tipos" "$(v A_tipos)"
[ "$(v B)" = "7@0" ] && ok "joia que já tinha adicional não é tocada" || bad "B" "$(v B)"
[ "$(v total1)" = "4" ] && ok "total depois da 1ª execução (3 + 1)" || bad "total1" "$(v total1)"
[ "$(v total2)" = "4" ] && ok "2ª execução sem efeito (idempotente)" || bad "total2" "$(v total2)"
psql "$PGURL" -At -c "select 'residuo|' || count(*) from product_buy_together" | grep -q '|0$' && ok "nada ficou no banco (rollback)" || bad "residuo" "linhas sobraram"
exit $falhas
