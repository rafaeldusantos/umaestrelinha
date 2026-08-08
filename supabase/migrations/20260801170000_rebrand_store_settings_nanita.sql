-- Rebrand NanaPin -> Nanita nos defaults de `store_settings`.
--
-- Por que uma migration nova em vez de editar `*_create_store_settings.sql`: aquelas duas já foram
-- aplicadas (e são duplicatas byte-a-byte uma da outra, então editar exigiria manter as duas em
-- sincronia). Esta resolve os dois casos de uma vez — num `db reset` roda depois dos INSERT, e num
-- banco já existente corrige o dado que está lá.
--
-- Cada UPDATE é condicionado ao valor antigo, por dois motivos: é idempotente (rodar de novo não
-- faz nada) e não sobrescreve um nome que a admin já tenha editado no painel.
--
-- `nanapin` segue vivo como identificador técnico (escopo npm, project_id, chaves de localStorage,
-- tokens --nana-*) e não deve ser renomeado — ver CLAUDE.md.
--
-- ⚠️ Nasceu como `20260801140000_…` e **nunca rodou**: esse timestamp já estava em
-- `supabase_migrations.schema_migrations` por `20260801140000_drop-legacy-product-columns.sql`. A CLI
-- chaveia a história pela VERSÃO (o prefixo numérico), não pelo nome do arquivo — então considerou
-- esta aplicada e a pulou em silêncio, aqui e no hospedado. Duas migrations nunca podem compartilhar
-- o prefixo; ao criar uma, confira o maior timestamp já existente.

UPDATE public.store_settings
SET value = jsonb_set(value, '{store_name}', '"Nanita"')
WHERE key = 'general' AND value->>'store_name' = 'NanaPin';

UPDATE public.store_settings
SET value = jsonb_set(value, '{email}', '"contato@nanita.com.br"')
WHERE key = 'general' AND value->>'email' = 'contato@nanapin.com.br';

-- Duas variantes gravadas: a acentuada (defaults do TS) e a sem acento (seed das migrations).
UPDATE public.store_settings
SET value = jsonb_set(value, '{title}', '"Nanita — Bottons temáticos de pop culture"')
WHERE key = 'seo' AND value->>'title' IN (
  'NanaPin — Bottons temáticos de pop culture',
  'NanaPin - Bottons tematicos de pop culture'
);
