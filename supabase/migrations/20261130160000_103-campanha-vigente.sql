-- =============================================================================================
-- A campanha que a loja vê — a vigência aplicada pelo banco, também para a sessão de admin
--
-- DUAS views de leitura e NENHUMA escrita de dado, nenhuma tabela, nenhuma coluna, nenhuma policy
-- tocada. A loja lia `campaigns` e `product_campaigns` crus e confiava na policy pública para
-- recortar a vigência. Com uma sessão de admin aberta na loja ou na prévia, a policy de admin
-- (`for all`, que vale também para leitura) entrega TODAS as campanhas e marcações — e a loja
-- mostrava selo e preço de campanha agendada, encerrada ou desligada. As policies ficam como estão:
-- o painel precisa ler todas as campanhas pela de admin.
--
-- `live_campaigns`: as colunas da campanha que a loja lê, só da ligada com `starts_at <= now() <
-- ends_at` pelo relógio do banco — o mesmo predicado da policy pública `campaigns_public_read` e de
-- `isCampaignLive` (`core/campaigns/live.ts`), conferido por `campanhaVigenciaParidade.test.ts`.
--
-- `live_product_campaigns`: as marcações só da campanha que `live_campaigns` entrega. Ela não repete
-- o predicado: pergunta à outra view, e a vigência fica escrita UMA vez nesta migration.
--
-- `security_invoker`: as views rodam com a RLS de quem consulta. Para o visitante, as policies
-- públicas continuam valendo por baixo (a marcação de peça inativa não chega, como antes); para o
-- admin, o filtro da view é o que recorta a vigência. Nenhuma das duas abre leitura que a RLS não
-- abriria.
--
-- O privilégio padrão do schema público daria tudo (inclusive escrita, porque `live_campaigns` é
-- atualizável) a `anon` e `authenticated`: ele sai, e entra só o `select`.
--
-- O embed da loja (`live_product_campaigns` dentro de `products`, e `campaign_percents` dentro de
-- `live_campaigns`) depende de o PostgREST inferir a relação pela view, a partir das chaves
-- estrangeiras das tabelas de baixo; o probe `01-campanha-vigente` prova pelo HTTP local.
-- =============================================================================================

create or replace view public.live_campaigns with (security_invoker = true) as
	select id, name, badge_text, band_color, accent_color, ends_at
	from public.campaigns
	where active and starts_at <= now() and now() < ends_at;

create or replace view public.live_product_campaigns with (security_invoker = true) as
	select pc.product_id, pc.campaign_id, pc.percent
	from public.product_campaigns pc
	where exists (select 1 from public.live_campaigns lc where lc.id = pc.campaign_id);

revoke all on public.live_campaigns from public, anon, authenticated;
revoke all on public.live_product_campaigns from public, anon, authenticated;

grant select on public.live_campaigns to anon, authenticated;
grant select on public.live_product_campaigns to anon, authenticated;
