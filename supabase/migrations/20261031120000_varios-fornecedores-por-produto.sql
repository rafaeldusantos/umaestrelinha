-- Vários fornecedores por produto (melhoria da feature 80).
--
-- A mesma peça pode ser comprada de mais de um fornecedor, cada um com o link dela. Até aqui o
-- vínculo tinha `product_id` como chave — um fornecedor por produto. A chave passa a ser o PAR
-- (produto, fornecedor): o mesmo fornecedor não entra duas vezes no mesmo produto, e `position`
-- guarda a ordem em que a dona os listou.
--
-- As linhas que já existem continuam válidas (uma por produto, `position` 0). A tabela continua só
-- do admin (RLS e `revoke` da feature 80, intocados). Sem escrita de dado.

alter table public.product_suppliers
	add column if not exists position integer not null default 0 check (position >= 0);

alter table public.product_suppliers drop constraint if exists product_suppliers_pkey;
alter table public.product_suppliers add constraint product_suppliers_pkey primary key (product_id, supplier_id);
