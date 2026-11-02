-- =====================================================================
-- Compre Junto — a marca "acompanha" no pedido
-- =====================================================================
--
-- O pedido guarda, NO MOMENTO DA COMPRA, de quais joias principais e de quais listas cada peça
-- adicional veio. É snapshot, como `variant_label` e `engraving_text`: editar ou apagar a lista
-- depois não muda o pedido nem o relatório de adesão.
--
-- - São ARRAYS alinhados por posição: a mesma linha pode acompanhar mais de um principal (na sacola
--   ela diz "Acompanha o X e o Y"), e a lista da posição i é a de origem do principal da posição i
--   (elemento nulo na peça escolhida direto no produto). Quem grava os dois juntos é a function
--   `checkout`, pela regra de `core/buy-together/marks.ts`.
-- - O principal é TEXTO porque `order_items.product_id` é texto (o import da Nuvemshop grava ids
--   que não são uuid). A lista é uuid.
-- - As duas são NULAS: a linha comum, o bump e o pedido montado pelo painel não têm marca, e uma
--   coluna obrigatória derrubaria a gravação de todos eles.
-- - SEM chave estrangeira: uma FK para a lista impediria apagar lista usada num pedido antigo, ou
--   apagaria o histórico junto. O valor é informativo; quem o valida é a function `checkout`, que
--   descarta a marca cujo principal não está no pedido.
-- - A marca nunca decide preço nem desconto: o `create-payment` recalcula pelas colunas de preço de
--   sempre e não lê estas duas.
--
-- Aditiva e reexecutável. Nenhuma escrita de dado, nenhuma concessão nova.

alter table public.order_items
	add column if not exists accompanies_product_ids text[],
	add column if not exists accompanies_list_ids uuid[];

comment on column public.order_items.accompanies_product_ids is
	'Compre Junto: os produtos principais que esta peça acompanhava na compra (snapshot), na ordem. Nulo na peça comum.';

comment on column public.order_items.accompanies_list_ids is
	'Compre Junto: a lista de origem de cada principal, na mesma posição de accompanies_product_ids, com elemento nulo quando a peça foi escolhida direto no produto. Sem chave estrangeira, de propósito.';
