#!/usr/bin/env bash
# Probe contra o Postgres LOCAL (:54442): a marca "acompanha" em `order_items`.
#   1. as duas colunas (arrays alinhados por posição) existem, com o tipo certo, nulas e sem default
#   2. nenhuma chave estrangeira nelas (apagar lista usada num pedido antigo não esbarra)
#   3. o `order_items` antigo lê igual: as colunas de antes, byte a byte, e as novas nulas
#   4. uma linha com DOIS principais (um de lista, um avulso) grava, e apagar a lista não esbarra —
#      numa transação DESFEITA
# Uso: ANTES=<md5 das colunas antigas, medido antes de aplicar a migration> ./04-marca-no-pedido.sh
# Nunca aponte para ambiente remoto. Não deixa nada gravado.
set -u
D=postgresql://postgres:postgres@127.0.0.1:54442/postgres
falhas=0
ok()  { echo "ok — $1"; }
bad() { echo "FALHA — $1 ($2)"; falhas=$((falhas+1)); }
q() { psql "$D" -Atc "$1"; }

cols=$(q "select string_agg(column_name||':'||udt_name||':'||is_nullable||':'||coalesce(column_default,'-'), ',' order by column_name) from information_schema.columns where table_schema='public' and table_name='order_items' and column_name like 'accompanies%'")
[ "$cols" = "accompanies_list_ids:_uuid:YES:-,accompanies_product_ids:_text:YES:-" ] && ok "colunas nulas, sem default ($cols)" || bad "colunas" "$cols"

fk=$(q "select count(*) from pg_constraint where conrelid='public.order_items'::regclass and contype='f' and pg_get_constraintdef(oid) ilike '%accompanies%'")
[ "$fk" = 0 ] && ok "sem chave estrangeira nas colunas novas" || bad "chave estrangeira" "$fk"

ANTIGAS="id, order_id, product_id, product_name, product_image, size, finish, quantity, unit_price, variant_id, price_source, variant_label, variant_options, requires_material, material_kinds, engraving_text"
agora=$(q "select md5(string_agg(row_to_json(t)::text, '|' order by id)) from (select $ANTIGAS from public.order_items) t")
if [ -n "${ANTES:-}" ]; then
  [ "$agora" = "$ANTES" ] && ok "order_items antigo lê igual ($agora)" || bad "order_items antigo mudou" "$ANTES → $agora"
else
  echo "aviso — ANTES não informado; md5 de agora: $agora"
fi
nulas=$(q "select count(*) from public.order_items where accompanies_product_ids is not null or accompanies_list_ids is not null")
echo "info — linhas com marca hoje: $nulas"

saida=$(psql "$D" -At -v ON_ERROR_STOP=1 <<'SQL' 2>&1
begin;
insert into public.buy_together_lists (id, name) values ('0b6c1f7e-1111-4a2b-9c3d-000000000001', 'Probe marca');
insert into public.orders (id, customer_name, customer_email, payment_method, subtotal, discount, shipping_cost, total)
  values ('0b6c1f7e-2222-4a2b-9c3d-000000000002', 'Probe', 'probe@exemplo.invalid', 'pix', 10, 0, 0, 10);
insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, accompanies_product_ids, accompanies_list_ids)
  values ('0b6c1f7e-2222-4a2b-9c3d-000000000002', 'adicional', 'Corrente', 1, 10, array['principal', 'outro'], array['0b6c1f7e-1111-4a2b-9c3d-000000000001'::uuid, null]);
delete from public.buy_together_lists where id = '0b6c1f7e-1111-4a2b-9c3d-000000000001';
select array_to_string(accompanies_product_ids, ',') || '|' || array_to_string(accompanies_list_ids, ',', 'avulsa') from public.order_items where order_id = '0b6c1f7e-2222-4a2b-9c3d-000000000002';
rollback;
SQL
)
echo "$saida" | grep -q 'principal,outro|0b6c1f7e-1111-4a2b-9c3d-000000000001,avulsa' \
  && ok "dois principais gravam alinhados, e a lista apaga sem esbarrar no pedido (desfeito)" || bad "gravar marca e apagar lista" "$saida"

echo "falhas: $falhas"
exit $falhas
