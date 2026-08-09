-- =============================================================================
-- Uma Estrelinha — Seed de desenvolvimento / testes
-- =============================================================================
-- Roda automaticamente em `supabase db reset` (config.toml → [db.seed]).
-- Também pode ser executado avulso:
--   docker exec -i supabase_db_uma-estrelinha-store psql -U postgres -d postgres < supabase/seed.sql
--
-- É IDEMPOTENTE: upsert por `code` (cupons) e por `email` (admin). Rodar duas
-- vezes atualiza o que já existe e não duplica nada.
--
-- ACESSO AO BACKOFFICE (dev): admin@umaestrelinha.dev / admin123  (ver seção 5).
--
-- -----------------------------------------------------------------------------
-- ESTE ARQUIVO NÃO TEM MAIS CATÁLOGO — e isso é deliberado (feature 21)
-- -----------------------------------------------------------------------------
-- Até a feature 21 ele inseria 7 categorias, 16 produtos e 24 variações
-- inventadas, que sustentavam a prova visual enquanto não havia catálogo real.
-- O catálogo real agora entra pelo importador:
--
--   pnpm --filter @estrelinha/catalog-import import
--
-- A consequência é declarada, não escondida: **depois de `supabase db reset` a
-- loja fica sem catálogo até o import rodar.** Foi a escolha feita em favor de
-- ter uma fonte só — peça inventada ao lado de peça real, numa loja onde cada
-- peça carrega o material que uma cliente enviou, é confusão que não compensa.
-- O importador é idempotente e guarda as imagens baixadas em cache, então a
-- re-execução depois de um reset custa pouco.
--
-- -----------------------------------------------------------------------------
-- SEM OBJETO DE SESSÃO — a razão de este arquivo ter sido reescrito
-- -----------------------------------------------------------------------------
-- A versão anterior declarava duas funções `pg_temp.*` e uma `CREATE TEMP TABLE
-- _pal`. A CLI envia o seed em LOTES, e objeto temporário é ligado à sessão: o
-- lote seguinte não o enxergava. O `db reset` quebrava ora com
-- `schema "pg_temp" does not exist`, ora com `relation "_pal" does not exist`,
-- conforme onde o corte caía — e o mesmo arquivo aplicado inteiro por
-- `docker exec … psql` passava, o que provava que o defeito era o transporte.
--
-- Daqui em diante: **nada de `pg_temp.*`, nada de `CREATE TEMP TABLE`.** Tudo o
-- que precisa ser reaproveitado vira CTE dentro da própria instrução, e a
-- instrução é autossuficiente qualquer que seja o corte do lote.
--
-- TOM: o registro é sensível e memorial. Nada de trocadilho, de "corre" nem de
-- linguagem de lançamento. Vale para o que restou aqui — a descrição dos cupons
-- é texto que a cliente lê no checkout.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. LIMPEZA DE CATÁLOGO DE DESENVOLVIMENTO
-- -----------------------------------------------------------------------------
-- Duas gerações de catálogo inventado saem aqui:
--
--  (a) O seed EMBUTIDO na migration inicial (20260414121021) — 6 categorias e 12
--      produtos da loja anterior. Migration é história e história não se
--      reescreve, mas ela roda a cada `db reset`.
--  (b) O catálogo de desenvolvimento da Uma Estrelinha — 16 produtos e 7
--      categorias que este arquivo mesmo inseria até a feature 21. Ele existia
--      para sustentar a prova visual enquanto não havia catálogo real; o real
--      entra pelo importador (`tools/catalog-import`), e manter os dois lado a
--      lado poria peça inventada na vitrine junto com peça de verdade.
--
-- Lista explícita de slugs, e não "apaga o que não está no seed": um banco de
-- desenvolvimento costuma ter produto cadastrado à mão, e uma limpeza por
-- exclusão apagaria o trabalho de quem estava testando.
--
-- ⚠️ `AND nuvemshop_id IS NULL` NÃO É ZELO — é o que impede um acidente com
-- perda real. O cabeçalho deste arquivo documenta a execução avulsa
-- (`docker exec … < supabase/seed.sql`), e a categoria `joias-afetivas` existe
-- nas DUAS origens: era slug do catálogo de dev e é slug de uma categoria real
-- da Nuvemshop. Sem o predicado, rodar o seed depois do import apagaria a
-- categoria REAL e, por `on delete cascade`, os 508 vínculos de produto dela.
-- O predicado diz exatamente o que se quer dizer: apague a linha inventada,
-- nunca a importada.
--
-- `product_variants`, `product_categories`, `wishlist`, `reviews` e
-- `product_redirects` saem por `on delete cascade`. `order_items` não referencia
-- `products` (o pedido guarda o snapshot), então histórico de pedido não é
-- afetado. DELETE é idempotente por natureza: a segunda execução casa zero linha.
DELETE FROM public.products
WHERE nuvemshop_id IS NULL
  AND slug IN (
    -- (a) catálogo embutido na migration inicial
    'naruto-uzumaki','sailor-moon','bts-jungkook','blackpink-logo','darth-vader',
    'harry-potter-hogwarts','arctic-monkeys','gojo-satoru','zelda-triforce',
    'stranger-things','pikachu','tanjiro-kamado',
    -- (b) catálogo de desenvolvimento da Uma Estrelinha (removido na feature 21)
    'anel-afetivo-masculino','anel-leite-materno','chaveiro-dente-de-leite',
    'colar-gota-memoria','colar-ponto-de-luz','coleira-memoria-cinzas',
    'joia-esfera-cinzas','pingente-coracao-cinzas','pingente-coto-umbilical',
    'pingente-dente-de-leite','pingente-patinha-pelos','pingente-placa-masculina',
    'pingente-redondo-leite','piramide-arvore-da-vida','piramide-pet-ultimo-passeio',
    'pulseira-esfera-estrelas'
  );

DELETE FROM public.categories
WHERE nuvemshop_id IS NULL
  AND slug IN (
    -- (a) catálogo embutido na migration inicial
    'anime','kpop','filmes','bandas','games','series',
    -- (b) catálogo de desenvolvimento da Uma Estrelinha (removido na feature 21)
    'dente-de-leite','joias-afetivas','leite-materno','masculina','maternidade',
    'pet','uma-estrelinha'
  );


-- -----------------------------------------------------------------------------
-- 4. CUPONS  (para testar o fluxo de desconto no checkout)
-- -----------------------------------------------------------------------------
-- Os cinco formatos que o checkout precisa exercitar: percentual, valor fixo,
-- percentual com teto de usos, frete grátis e um vencido (que tem de recusar).
-- Os pisos de `min_order` acompanham a faixa de preço real do catálogo.
INSERT INTO public.coupons (code, description, type, value, min_order, max_uses, active, valid_until) VALUES
  ('ACOLHER10',   '10% off em qualquer pedido',           'percent',       10,   0, NULL, true, now() + interval '90 days'),
  ('MEMORIA20',   'R$20 off acima de R$200',              'fixed',         20, 200, NULL, true, now() + interval '90 days'),
  ('PRIMEIRA15',  '15% off acima de R$300 (100 usos)',    'percent',       15, 300,  100, true, now() + interval '90 days'),
  ('ENVIOGRATIS', 'Frete grátis acima de R$250',          'free_shipping',  0, 250, NULL, true, now() + interval '90 days'),
  ('VENCIDO',     'Cupom vencido — para testar a recusa', 'percent',       20,   0, NULL, true, now() - interval '1 day')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  type        = EXCLUDED.type,
  value       = EXCLUDED.value,
  min_order   = EXCLUDED.min_order,
  max_uses    = EXCLUDED.max_uses,
  active      = EXCLUDED.active,
  valid_until = EXCLUDED.valid_until;

-- Sem seção de `drops`: a tabela existe, mas nenhum código a lê (o
-- `DropCountdown` da home calcula a data no próprio componente). Semear uma
-- linha ali era inventar um "lançamento" — vocabulário que não é desta loja.


-- -----------------------------------------------------------------------------
-- 5. USUÁRIO ADMIN  (acesso ao backoffice — :8083 /admin/*)
-- -----------------------------------------------------------------------------
-- admin@umaestrelinha.dev / admin123  — SOMENTE desenvolvimento local.
--
-- Sem isto, um `supabase db reset` derruba a conta e o backoffice fica
-- inacessível até alguém recriar o usuário na mão (a senha vira um hash bcrypt
-- irrecuperável). `RequireAdmin` valida via public.user_roles + has_role().
--
-- Escreve direto em auth.users/auth.identities porque o GoTrue não expõe
-- criação de usuário confirmado sem service_role key. A identity é obrigatória:
-- sem ela o login por senha falha.
DO $$
DECLARE
  v_email text := 'admin@umaestrelinha.dev';
  v_pass  text := 'admin123';
  v_id    uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = v_email;

  IF v_id IS NULL THEN
    -- UUID fixo: mantém o id estável entre resets (facilita fixtures/queries).
    v_id := 'a95dfd7f-04b4-46b4-8999-337bebcc0f26'::uuid;

    -- Os campos de token vão como '' (não NULL): o GoTrue lê essas colunas
    -- como string e quebra o login com NULL.
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_pass, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', 'Admin Uma Estrelinha', 'email_verified', true),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      provider, provider_id, user_id, identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      'email', v_id::text, v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email,
                         'email_verified', true, 'phone_verified', false),
      now(), now(), now()
    );
  ELSE
    -- Já existe (inclusive com outro id): só realinha senha e confirmação.
    UPDATE auth.users
       SET encrypted_password = extensions.crypt(v_pass, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at         = now()
     WHERE id = v_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
