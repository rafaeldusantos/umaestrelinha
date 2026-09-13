-- =====================================================================
-- 49 · checkout sem conta (CSC, IDN, PED)
--
-- O QUE ESTAVA ERRADO ANTES DESTA MIGRATION
--
-- Nao havia caminho de compra sem sessao. `/checkout` trancava em `user`, e
-- `orders`/`order_items` so tinham policy de INSERT para `authenticated`, com
-- `customer_id` escopado por `customers.user_id = auth.uid()`. Quem chegava ao
-- caixa sem conta batia numa parede -- e numa loja memorial essa parede cobra
-- burocracia de quem acabou de perder alguem.
--
-- O QUE ESTA MIGRATION ACRESCENTA
--
-- 1. Tres colunas em `orders`, todas aditivas:
--    - `client_request_id`  idempotencia de "criar pedido" (PED-04)
--    - `guest_access_hash`  SHA-256 do token de posse (PED-05)
--    - `guest_access_expires_at`  validade desse acesso
-- 2. `public.account_exists(text)` -- a pergunta "este e-mail ja tem conta?",
--    que a edge function faz por `service_role` e mais ninguem (IDN-01/IDN-08).
--
-- POR QUE O TOKEN VAI SO COMO HASH
--
-- O texto puro e uma capability: quem o tem le e paga o pedido. Guardado em
-- claro, um dump do banco viraria acesso a todo pedido de convidada. O original
-- vive so no navegador de quem comprou (`estrelinha-order-access`).
--
-- POR QUE O INDICE E PARCIAL
--
-- `client_request_id` e nulo em todo pedido anterior a esta feature e em todo
-- pedido criado por outro caminho (importador da Nuvemshop, por exemplo). Um
-- indice unico total recusaria o segundo nulo em bancos que tratam nulo como
-- valor -- e, mais importante, declararia uma regra que nao e verdade: a
-- unicidade vale entre TENTATIVAS DE CHECKOUT, nao entre pedidos.
--
-- POR QUE `account_exists` E `security definer` E FECHADA
--
-- `auth.users` nao e legivel por `anon` nem por `authenticated`, e nao deve
-- ser. A funcao responde um BOOLEANO -- nunca uma linha -- e mesmo assim so
-- `service_role` pode chama-la: o teto por IP que protege a pergunta vive na
-- edge function, e uma porta direta pelo PostgREST passaria por fora dele.
--
-- O QUE ESTA MIGRATION NAO FAZ, DE PROPOSITO
--
-- Nao derruba as policies de INSERT de `orders`/`order_items`. Elas deixam de
-- ser usadas (a loja passa a gravar pela edge function, com service role), mas
-- entre o `db push` e o deploy da Vercel ha uma janela em que aba ja aberta
-- ainda insere pelo caminho antigo -- e fecha-la a forca custaria venda. Quem
-- impede o segundo gravador e `pedidoComDonoUnico.test.ts`, que le `apps/**`
-- do disco. Derrubar as policies esta registrado no BACKLOG.
--
-- Nao semeia, nao atualiza e nao apaga NENHUMA linha. E aditiva e idempotente.
--
-- `AD-017` venceu em 2026-08-17: migration aplicada e imutavel, correcao vem
-- em migration nova. Por isso nada aqui edita arquivo anterior.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. orders -- o acesso da convidada e a idempotencia da criacao
-- ---------------------------------------------------------------------

alter table public.orders
  add column if not exists client_request_id       text,
  add column if not exists guest_access_hash       text,
  add column if not exists guest_access_expires_at timestamptz;

comment on column public.orders.client_request_id is
  'Idempotencia de create-order (PED-04): a mesma tentativa de checkout repetida por falha de rede devolve o MESMO pedido, em vez de criar um segundo e uma segunda conta. Nulo em pedido importado e em pedido anterior a feature 49.';

comment on column public.orders.guest_access_hash is
  'SHA-256 (hex) do token de posse do pedido de convidada (PED-05). O texto puro NUNCA e gravado: ele vive so no navegador de quem comprou. Nulo em pedido criado com sessao, que prova posse pelo JWT.';

comment on column public.orders.guest_access_expires_at is
  'Validade do acesso de convidada -- criacao + 7 dias. Depois disso o caminho e entrar por codigo em /conta, que funciona porque o pedido tem customer_id.';

create unique index if not exists idx_orders_client_request_id
  on public.orders (client_request_id)
  where client_request_id is not null;

-- ---------------------------------------------------------------------
-- 2. account_exists -- "este e-mail ja tem conta?"
-- ---------------------------------------------------------------------
--
-- `lower()` nos dois lados, pela mesma razao que `handle_new_customer` ja
-- compara assim desde a 35: o arquivo real da Nuvemshop traz e-mail em caixa
-- alta, e comparar cru deixaria a mesma pessoa como duas.
--
-- E-mail vazio responde `false` sem consultar nada. A edge function ja recusa
-- entrada vazia com 400, mas a funcao nao pode depender disso: `lower(trim(''))`
-- casaria com uma linha de e-mail vazio se um dia existisse uma.

create or replace function public.account_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when coalesce(trim(p_email), '') = '' then false
    else exists (
      select 1
        from auth.users u
       where lower(u.email) = lower(trim(p_email))
         and u.deleted_at is null
    )
  end;
$$;

comment on function public.account_exists(text) is
  'IDN-01/IDN-08: responde se um e-mail ja tem conta em auth.users. Booleano, nunca linha. Fechada a anon e authenticated de proposito -- o teto por IP que protege a pergunta vive na edge function checkout, e uma porta direta pelo PostgREST passaria por fora dele.';

revoke all on function public.account_exists(text) from public;
revoke all on function public.account_exists(text) from anon;
revoke all on function public.account_exists(text) from authenticated;
grant execute on function public.account_exists(text) to service_role;
