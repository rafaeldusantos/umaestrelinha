-- =====================================================================
-- 61 · Google Analytics 4 (ANL, CMP)
--
-- O QUE ESTA MIGRATION ACRESCENTA
--
-- 1. A chave `analytics` em `store_settings` -- o ID de medicao, o
--    interruptor e o host de producao. Os tres sao PUBLICOS por natureza: o
--    ID aparece no HTML de qualquer pagina que carrega o gtag, e a tabela tem
--    leitura aberta a `anon` de proposito (a loja le a configuracao sem
--    sessao).
-- 2. `public.analytics_secrets` -- onde mora a chave secreta do Measurement
--    Protocol. Ela NAO pode morar em `store_settings`: aquela tabela e legivel
--    por qualquer visitante, e a chave estaria publicada.
-- 3. Cinco colunas em `orders`: os identificadores do GA que o checkout
--    captura (CMP-01), a recusa da medicao (CMP-04) e o resultado do envio do
--    `purchase` pelo servidor (CMP-07).
--
-- POR QUE `analytics_secrets` NAO TEM POLICY NENHUMA
--
-- Com RLS ligada e zero policy, `anon` e `authenticated` nao leem nem gravam
-- linha alguma -- nem uma cliente logada, nem uma admin pelo navegador. Quem
-- grava e a edge function `google-analytics` (exige admin e usa service role,
-- `AD-034`); quem le e a `mercado-pago`, tambem por service role. Uma policy
-- "so para admin" abriria a chave ao navegador da admin, e o painel nunca
-- precisa ve-la de volta (ANL-05: so de escrita).
--
-- O `revoke` de `anon` e `authenticated` e a segunda camada: os default
-- privileges do Supabase concedem tudo a esses papeis em tabela nova, e sem o
-- revoke a unica contencao seria a RLS. Nenhum `grant` aqui, de proposito.
--
-- POR QUE `enabled` NASCE FALSE
--
-- Mesmo molde do Google Shopping (30) e do frete gratis (37): ligar a medicao
-- e ato explicito da dona. O ID ja vem semeado para poupar um passo.
--
-- `AD-017` venceu em 2026-08-17: migration aplicada e imutavel, correcao vem
-- em migration nova. Nada aqui edita arquivo anterior.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. store_settings.analytics
-- ---------------------------------------------------------------------
-- O formato do INSERT segue o das duas `*_create_store_settings.sql` e o da
-- 30 de proposito: `storeSettingsDefaults.test.ts` extrai os defaults desta
-- forma exata para compara-los com o TypeScript. O `do nothing` e o que
-- protege a escolha da dona em todo `db push` futuro.
INSERT INTO public.store_settings (key, value) VALUES
  ('analytics', jsonb_build_object(
    'enabled', false,
    'measurement_id', 'G-SQL517XDQZ',
    'production_host', 'umaestrelinha.com.br'
  ))
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. analytics_secrets -- a chave do Measurement Protocol
-- ---------------------------------------------------------------------
create table if not exists public.analytics_secrets (
  key text primary key check (key = 'ga4_api_secret'),
  value text not null check (char_length(value) between 1 and 128),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

comment on table public.analytics_secrets is
  'Chave secreta do Measurement Protocol do GA4 (ANL-05). Sem policy de proposito: so service_role le e grava. Gravada pela function google-analytics (admin), lida pela mercado-pago. Nunca devolvida ao navegador.';

alter table public.analytics_secrets enable row level security;

revoke all on public.analytics_secrets from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. orders -- os ids do GA e o resultado do envio do purchase
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists ga_client_id       text,
  add column if not exists ga_session_id      text,
  add column if not exists analytics_declined boolean not null default false,
  add column if not exists ga_purchase_status text
    constraint orders_ga_purchase_status_check
    check (ga_purchase_status in ('sending', 'sent', 'failed', 'skipped_declined', 'skipped_disabled')),
  add column if not exists ga_purchase_at     timestamptz;

comment on column public.orders.ga_client_id is
  'client_id do GA4 lido do cookie _ga no checkout (CMP-01). Nulo quando o gtag nao rodou (bloqueador, recusa, cookie limpo).';

comment on column public.orders.ga_session_id is
  'session_id do GA4 lido do cookie _ga_<id> no checkout (CMP-01).';

comment on column public.orders.analytics_declined is
  'A cliente recusou a medicao (Estatisticas desligada) quando criou o pedido. Pedido assim nao gera purchase (CMP-04).';

comment on column public.orders.ga_purchase_status is
  'Resultado do envio do purchase pelo servidor (CMP-02..07). Nulo = ainda nao tentado; sending = reivindicado; sent/failed; skipped_declined/skipped_disabled = nao enviado de proposito.';

comment on column public.orders.ga_purchase_at is
  'Quando o envio do purchase terminou (sent ou failed).';
