-- Feature 74 — mobile-adm: Pedidos. A confirmação de papel na mesma leitura (`MAP-36`, `MAP-37`,
-- `MAP-53`, `AD-058`).
--
-- UMA função nova, `public.atelie_clock`, sem argumento: recusa com `42501` quem não é admin e
-- devolve o instante do banco (`lido_em`). Sem tabela, sem coluna, sem escrita de dado, e sem
-- leitura de tabela nenhuma — a única chamada é `has_role`.
--
-- Por que ela existe: a lista e o detalhe de pedidos do app do celular leem `order_list` e as
-- tabelas do pedido pelo PostgREST, e a RLS de `orders` e `order_items` devolve à conta sem papel
-- admin os pedidos DELA como cliente, sem erro. O app chama esta função EM PARALELO com cada
-- leitura (`entities/order/api/lerComPapel.ts`) e só desenha o dado se ela respondeu: a recusa
-- vence, mesmo que a consulta tenha trazido linhas.
--
-- Guardas: `atelieClockSchema.test.ts` (forma desta migration) e `marcacaoSoPorAcao.test.ts`
-- (o nome entra na lista literal de RPCs chamadas). Semântica provada por probe contra o banco
-- local (`.specs/features/74-mobile-adm-pedidos/probes/01-relogio.sql`).
-- ---------------------------------------------------------------------------------------------

create or replace function public.atelie_clock()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'acesso restrito ao painel' using errcode = '42501';
  end if;
  return jsonb_build_object('lido_em', now());
end;
$$;

revoke execute on function public.atelie_clock() from public, anon;
grant execute on function public.atelie_clock() to authenticated;
