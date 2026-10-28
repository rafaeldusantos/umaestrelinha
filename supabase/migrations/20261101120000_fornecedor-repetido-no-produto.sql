-- O mesmo fornecedor pode aparecer mais de uma vez no mesmo produto.
--
-- A dona compra a mesma peça do mesmo fornecedor por mais de um anúncio — cada um com o seu link. A
-- migration `20261031120000` pôs a chave do vínculo no par (produto, fornecedor), e isso recusava a
-- segunda linha do mesmo fornecedor. A chave passa a ser (produto, posição): cada linha do card
-- Fornecedor é uma vaga própria, e o fornecedor dela pode repetir.
--
-- As linhas existentes seguem válidas: o painel sempre gravou `position` 0..n-1 por produto, e as
-- de antes da `20261031120000` são uma por produto, em 0. A tabela continua só do admin (RLS e
-- `revoke` da feature 80, intocados). Sem escrita de dado.

alter table public.product_suppliers drop constraint if exists product_suppliers_pkey;
alter table public.product_suppliers add constraint product_suppliers_pkey primary key (product_id, position);
