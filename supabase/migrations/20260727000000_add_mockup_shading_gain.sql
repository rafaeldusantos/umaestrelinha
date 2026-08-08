-- Intensidade do sombreamento procedural do domo aplicado sobre a arte na composição.
-- 0 = desligado · 1 = reproduz a iluminação medida na foto do fundo · >1 exagera o relevo.
alter table public.mockup_templates
  add column if not exists shading_gain numeric not null default 1;

comment on column public.mockup_templates.shading_gain is
  'Ganho do sombreamento procedural do domo (0 = desligado, 1 = luz medida da foto do fundo).';
