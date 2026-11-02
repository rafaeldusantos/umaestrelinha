-- Compre Junto — converte a lista simples antiga (`products.buy_together_ids`) em adicionais.
--
-- Cada peça do array vira um adicional do tipo "produto", até três, na ordem do array. O que não
-- cabe é descartado: id que não existe mais em `products`, a própria joia e a repetição (vale a
-- primeira ocorrência). As posições são renumeradas depois do descarte (0, 1, 2), sem buraco.
--
-- Idempotente por estado: só converte a joia que ainda NÃO tem adicional nenhum. Uma segunda
-- execução não acha nada para converter, e uma joia cuja dona já montou o Compre Junto novo nunca é
-- tocada. A coluna `buy_together_ids` continua no banco — quem a apaga é uma migration futura, depois
-- do deploy do painel que deixou de gravá-la.

insert into public.product_buy_together (product_id, position, kind, target_product_id)
select ranked.product_id, (ranked.rn - 1)::integer, 'product', ranked.target
from (
	select
		distinct_targets.product_id,
		distinct_targets.target,
		row_number() over (
			partition by distinct_targets.product_id
			order by distinct_targets.ord
		) as rn
	from (
		select distinct on (p.id, e.target) p.id as product_id, e.target, e.ord
		from public.products p
		cross join lateral unnest(p.buy_together_ids) with ordinality as e (target, ord)
		join public.products t on t.id = e.target
		where e.target <> p.id
		  and not exists (select 1 from public.product_buy_together a where a.product_id = p.id)
		order by p.id, e.target, e.ord
	) as distinct_targets
) as ranked
where ranked.rn <= 3;
