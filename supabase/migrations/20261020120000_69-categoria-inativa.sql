-- =============================================================================================
-- 69 · categoria inativa redireciona para a mãe (SSV-14..17)
--
-- A loja servida pela Vercel lê o catálogo com a chave PUBLICÁVEL, e a policy
-- "public read categories" só devolve linha com `active = true`. Uma categoria desligada no painel
-- é, para a loja, igual a uma que nunca existiu — e a URL dela, já indexada, cairia em 404. A
-- feature quer o contrário: 301 para o ancestral ativo mais próximo, ou para `/` se não houver.
--
-- Esta função é a ÚNICA porta para essa pergunta, e responde só um uuid:
--
--   null                                    ⇒ não existe categoria INATIVA com esse slug
--                                             (slug inexistente, ou categoria ativa — quem resolve
--                                             essa é a leitura normal da árvore)
--   '00000000-0000-0000-0000-000000000000'  ⇒ inativa, e nenhum ancestral está ativo (⇒ '/')
--   outro                                   ⇒ id do ancestral ATIVO mais próximo
--
-- Por que `security definer`: a linha inativa é exatamente a que a RLS esconde de `anon`. Abrir a
-- policy vazaria nome, descrição e arte de toda categoria desligada; a função atravessa a RLS e
-- devolve só um id — de uma categoria ATIVA, que já é pública (SSV-17). Quem monta o caminho é
-- `categoryHref` sobre a árvore ativa: um dono só da canônica.
--
-- "Ativa" é `active is true`, a mesma régua da policy (`active = true`): `null` não é público, e
-- por isso conta como inativa nos dois sentidos.
--
-- A subida por `parent_id` tem teto de profundidade: `categories_parent_not_self` impede só o
-- auto-laço, e um ciclo maior (A → B → A) faria o CTE recursivo andar para sempre. Com o teto, a
-- cadeia sem ativa até ali responde o sentinela.
--
-- Aditiva: cria uma função, e não semeia, não atualiza e não apaga nenhuma linha.
-- =============================================================================================

create or replace function public.category_fallback(p_slug text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  with recursive alvo as (
    select c.id, c.parent_id
    from public.categories c
    where c.slug = p_slug
      and c.active is not true
  ),
  cadeia as (
    select c.id, c.parent_id, c.active, 1 as profundidade
    from public.categories c
    join alvo a on c.id = a.parent_id
    union all
    select c.id, c.parent_id, c.active, k.profundidade + 1
    from public.categories c
    join cadeia k on c.id = k.parent_id
    where k.active is not true
      and k.profundidade < 32
  )
  select case
    when not exists (select 1 from alvo) then null
    else coalesce(
      (select k.id from cadeia k where k.active is true order by k.profundidade limit 1),
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  end
$$;

revoke all on function public.category_fallback(text) from public;
grant execute on function public.category_fallback(text) to anon, authenticated;

comment on function public.category_fallback(text) is
  'Feature 69 (SSV-14..17). Para um slug de categoria INATIVA, o id do ancestral ATIVO mais proximo (subindo parent_id, com teto de profundidade contra ciclo). null = nao existe categoria inativa com esse slug (inexistente ou ativa); 00000000-0000-0000-0000-000000000000 = inativa sem ancestral ativo (redireciona para /). Security definer para atravessar a RLS que esconde a linha inativa, devolvendo so um id de categoria ja publica; le apenas id, slug, parent_id e active.';
