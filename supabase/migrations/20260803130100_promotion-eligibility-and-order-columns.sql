-- Feature 17 / T2 — a elegibilidade vira VIEW, e o pedido ganha o espelho da promoção.
--
-- PRM-10 (+ a base de PRM-12).
--
-- Por que a elegibilidade é view lida na hora, e não snapshot no pedido (D1):
--
-- `supabase/functions/mercado-pago/handlers.ts` recalcula `unit_price` a partir de
-- `products.base_price` e **não sabe a que categoria um item pertence**. Escopo por categoria é dado
-- novo no caminho do dinheiro, e havia duas formas de levá-lo até lá:
--
--   (a) congelar a elegibilidade na criação do pedido — mas a criação do pedido é caminho que o
--       CLIENTE influencia, e um dado sobre desconto escrito ali é vetor de fraude;
--   (b) usar `Product.category_links`, que a loja já carrega — mas ele vem do snapshot do carrinho,
--       que é **persistido em `localStorage`** e pode ter DIAS. Elegibilidade com dias de idade
--       divergiria da do servidor e geraria 422 no pagamento: a falha exata que esta feature existe
--       para impedir.
--
-- Então: uma leitura a mais no `create-payment`, contra a mesma view que a loja lê. Mesmo precedente
-- de `category_product_counts` (`AD-012`), que passou a ser a única fonte de contagem por categoria.
-- Custo declarado: +1 query no caminho do pagamento.

-- ---------------------------------------------------------------------
-- promotion_eligible_products — categoria + DESCENDENTES (A9)
-- ---------------------------------------------------------------------
--
-- O roll-up não é generalidade gratuita. No banco real a única raiz é "Bottons" e todos os universos
-- (Anime, K-Pop, Games…) são FILHAS dela:
--
--     Bottons › {Academia, Anime, K-Pop, Filmes, Bandas, Games, Séries, Mangá, Kawaii}
--
-- Escopo "Bottons" **sem** roll-up não pegaria produto nenhum, porque nenhum produto está ligado
-- diretamente ao guarda-chuva. É a mesma razão que fez `descendantIds` existir na feature 16 — aqui
-- a mesma ideia vira CTE recursiva, do lado do banco, para os dois consumidores lerem uma resposta só.
--
-- `security_invoker = true` (PG 15+): sem isso a view roda com os direitos do DONO e vira furo de
-- RLS — anon leria a elegibilidade de campanha futura ainda não publicada. Com isso ela obedece às
-- policies de `promotion_categories`, `categories` e `product_categories`, exatamente como as tabelas
-- por baixo. É o mesmo motivo pelo qual `promotion_categories` tem policy de leitura pública: sem
-- ela, esta view devolveria zero linhas para a loja.
--
-- SPEC_DEVIATION: `union` no lugar do `union all` que o design.md escreveu.
-- Reason: num CTE recursivo, `union all` NÃO termina se a árvore de categorias tiver ciclo (A→B,
-- B→A). O único constraint que existe é `categories_parent_not_self`, que barra só o auto-pai — um
-- ciclo de dois é gravável hoje. `union` descarta linhas repetidas a cada iteração, então o ciclo
-- esvazia a working table e a recursão para. Esta view roda DENTRO do caminho do pagamento: `union
-- all` trocaria um dado inconsistente por um `create-payment` pendurado. O resultado é idêntico em
-- árvore acíclica (o `distinct` final já deduplicava), então a mudança não altera comportamento
-- nenhum — só remove o modo de falha. A feature 16 já tinha chegado à mesma conclusão nas três
-- cópias TypeScript da subida da árvore, cada uma com seu limite de profundidade e sua guarda de
-- ciclo.
create or replace view public.promotion_eligible_products
	with (security_invoker = true) as
with recursive tree as (
	select pc.promotion_id, pc.category_id
	  from public.promotion_categories pc
	union
	select t.promotion_id, c.id
	  from public.categories c
	  join tree t on c.parent_id = t.category_id
)
select distinct t.promotion_id, pl.product_id
  from tree t
  join public.product_categories pl on pl.category_id = t.category_id;

comment on view public.promotion_eligible_products is
	'Produtos elegíveis por promoção: as categorias vinculadas MAIS toda a descendência por parent_id (A9). Única fonte de elegibilidade nos dois lados — loja e create-payment. Promoção sem nenhuma linha em promotion_categories não aparece aqui, então não desconta de ninguém: nunca vira "toda a loja".';

grant select on public.promotion_eligible_products to anon, authenticated, service_role;

-- A view junta por `category_id` nas duas pontas. `product_categories (category_id)` já tem índice
-- desde a `04` (`product_categories_category_idx`); o lado da promoção não tinha.
create index if not exists promotion_categories_category_id_idx
	on public.promotion_categories (category_id);

-- ---------------------------------------------------------------------
-- orders.promotion_id / orders.promotion_discount — o espelho no pedido
-- ---------------------------------------------------------------------
--
-- Molde de `coupon_id` / `coupon_code` da migration de cupons.
--
-- `promotion_discount` é usado **APENAS como teto** na guarda do `create-payment`: recalculado menor
-- que o registrado ⇒ 422 `promotion_no_longer_valid`; recalculado igual ou maior ⇒ cobra o
-- recalculado. O valor cobrado é SEMPRE o recálculo do servidor, então um cliente que escreva um
-- número absurdo aqui não forja desconto — só se auto-inflige um 422 (`PAY-03` intacto).
--
-- Sem registrar nada, o servidor não teria como saber que o desconto piorou entre a criação do
-- pedido e o pagamento — e cobraria mais que o exibido, em silêncio.
--
-- `on delete set null` e não `cascade`: apagar uma promoção não pode apagar histórico de pedido.
alter table public.orders
	add column if not exists promotion_id       uuid,
	add column if not exists promotion_discount numeric(10,2);

-- FK e defaults em statements próprios e nomeados, pelo mesmo motivo já registrado na `04` e na
-- `20260801150000`: constraint/default escritos INLINE num `add column if not exists` são ignorados
-- **em silêncio** quando a coluna já existe.
update public.orders set promotion_discount = 0 where promotion_discount is null;

alter table public.orders
	alter column promotion_discount set default 0,
	alter column promotion_discount set not null;

do $$
begin
	if not exists (
		select 1 from pg_constraint
		 where conname = 'orders_promotion_id_fkey'
		   and conrelid = 'public.orders'::regclass
	) then
		alter table public.orders
			add constraint orders_promotion_id_fkey
			foreign key (promotion_id)
			references public.promotions (id)
			on delete set null;
	end if;
end $$;

comment on column public.orders.promotion_discount is
	'Desconto de promoção REGISTRADO na criação do pedido. Serve de TETO na guarda do create-payment (PRM-12), nunca de valor cobrado — o cobrado é sempre o recalculado server-side.';

create index if not exists idx_orders_promotion_id on public.orders (promotion_id);

-- Os números da listagem (PRM-24) somam `promotion_discount` de pedidos pagos nos últimos 30 dias.
create index if not exists idx_orders_promotion_paid_at
	on public.orders (paid_at) where promotion_id is not null;
