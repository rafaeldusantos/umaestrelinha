-- =====================================================================
-- Grants de tabela do schema public para anon / authenticated / service_role
-- =====================================================================
--
-- Sintoma que esta migration mata: depois de `supabase db reset`, TODA chamada ao PostgREST
-- volta `42501 permission denied for table <x>` — loja em branco, login do admin quebrado
-- (`user_roles`, `customers`), edge function com service role idem. O reset "passa", então o
-- sintoma lê como bug de frontend.
--
-- Causa: RLS e políticas sempre estiveram nas migrations; os GRANTs de tabela por baixo delas,
-- não. Eles foram aplicados fora de banda em algum momento e só sobreviviam no volume local
-- existente. Um banco novo nasce com anon/authenticated/service_role tendo apenas
-- TRUNCATE/REFERENCES/TRIGGER no public — nada de SELECT/INSERT/UPDATE/DELETE. E o
-- `ALTER DEFAULT PRIVILEGES` do papel `postgres` (dono das migrations) reproduz essa mesma
-- restrição em toda tabela nova, então não bastava corrigir as tabelas existentes.
--
-- Por que GRANT ALL a anon/authenticated é seguro aqui: é a postura padrão do Supabase — o
-- gate é o RLS, não o grant. Todas as 20 tabelas do public têm `relrowsecurity = true`. Se uma
-- tabela nova nascer sem RLS, o grant abaixo a expõe: **habilitar RLS é obrigatório**.
--
-- Por que NÃO há grant de rotina aqui: `apply_payment_approval`, `claim_order_email` e
-- `finish_order_email` são security definer com `revoke ... from anon, authenticated`
-- explícito nas suas migrations. Um `GRANT ALL ON ALL ROUTINES` desfaria essas revogações e
-- entregaria a aprovação de pagamento ao anon. RPC nova que o cliente precise chamar recebe
-- `grant execute` nominal na própria migration (molde: `increment_coupon_usage`).

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- Tabelas/sequences criadas daqui para frente pelo `postgres`, que é quem roda as migrations.
-- (O default privilege do `supabase_admin` já concede tudo; e o `postgres` não pode alterá-lo —
-- `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` falha com "permission denied".)
alter default privileges in schema public
	grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
	grant all on sequences to anon, authenticated, service_role;
