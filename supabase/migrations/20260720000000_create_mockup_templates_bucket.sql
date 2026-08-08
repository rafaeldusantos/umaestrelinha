-- =====================================================================
-- Bucket público 'mockup-templates' — assets de template de mockup
-- (fundo + overlay). Leitura pública; escrita restrita a admin via
-- public.has_role(auth.uid(), 'admin') — RLS escopada (STATE.md [2026-07-18]),
-- diferente do bucket product-images legado (escrita liberada a authenticated).
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('mockup-templates', 'mockup-templates', true)
on conflict (id) do nothing;

drop policy if exists "Public read access to mockup templates" on storage.objects;
create policy "Public read access to mockup templates"
on storage.objects for select to public
using (bucket_id = 'mockup-templates');

drop policy if exists "Admins can upload mockup templates" on storage.objects;
create policy "Admins can upload mockup templates"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'mockup-templates'
  and public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Admins can update mockup templates" on storage.objects;
create policy "Admins can update mockup templates"
on storage.objects for update to authenticated
using (
  bucket_id = 'mockup-templates'
  and public.has_role(auth.uid(), 'admin')
)
with check (
  bucket_id = 'mockup-templates'
  and public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Admins can delete mockup templates" on storage.objects;
create policy "Admins can delete mockup templates"
on storage.objects for delete to authenticated
using (
  bucket_id = 'mockup-templates'
  and public.has_role(auth.uid(), 'admin')
);
