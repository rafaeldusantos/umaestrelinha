-- Compre Junto — o desconto ao levar junto, por adicional.
--
-- Cada adicional de uma joia (`product_buy_together`) pode dar um percentual inteiro de 1 a 50 à
-- peça quando ela vai no mesmo pedido que a joia. Nulo = sem desconto: o adicional funciona como
-- antes, e é o que todo adicional que já existe passa a ter (sem default, sem backfill).
--
-- Os limites são os de `@estrelinha/core/buy-together` (`BUY_TOGETHER_DISCOUNT_MIN`/`_MAX`); o
-- painel recusa antes de gravar com a frase de `core`, e este `check` recusa a gravação que não vem
-- da tela. A leitura pública e a escrita só de admin são as policies que a tabela já tem: nenhuma
-- policy, nenhum `grant`, nenhum dado.

alter table public.product_buy_together
	add column if not exists discount_percent integer
		check (discount_percent is null or discount_percent between 1 and 50);

comment on column public.product_buy_together.discount_percent is
	'Desconto ao levar junto, em percentual inteiro de 1 a 50, sobre o preço da peça quando a joia principal está no mesmo pedido. Nulo = sem desconto.';
