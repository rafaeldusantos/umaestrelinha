-- Filtros iniciais da loja — grupos, valores e marcações (features 66 e 67)
--
-- Script de OPERAÇÃO, não migration: as migrations não podem escrever nessas tabelas
-- (`marcacaoSoPorAcao.test.ts`). Fica fora de `supabase/migrations/` de propósito: os guardas leem
-- aquela pasta, e um script de dado não deve ser confundido com schema.
--
-- Como rodar:
--   local:      psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 -f supabase/operacoes/filtros-iniciais.sql
--   produção:   SQL Editor do projeto hgkrsfpupypxtygjgthf, colando o arquivo inteiro
--               (ou: ./node_modules/.bin/supabase db query --linked -f supabase/operacoes/filtros-iniciais.sql)
--
-- Idempotente: grupo e valor entram por slug com `on conflict do nothing` (não sobrescreve o que a
-- Adri já editou no painel), e marcação repetida é no-op pela chave primária. Rodar duas vezes dá o
-- mesmo resultado. Não apaga nada.
--
-- As regras leem o NOME da peça, as CATEGORIAS e o TEXTO das variações ativas — nunca um id, porque
-- local e produção não compartilham UUID.
--
--   Tipo de joia      peça toda, pelo nome/categoria; POR OPÇÃO quando a variação muda o tipo
--                     (eixo "Modelo": Berloque × Pingente; eixo de elo: Chaveiro × o resto)
--   Metal / Cor       POR OPÇÃO, do texto da variação ("Prata 925 Folheado a Ouro Rose" ⇒ Prata 925 +
--                     Rosé); pelo nome só quando nenhuma variação diz o metal/a cor
--   Material afetivo  peça toda, pelo nome (material_kinds diz menos que o nome — BL-015)
--   Gravação          POR OPÇÃO, eixo "Com gravação" = Sim
--
-- ⚠️ Os grupos nascem ATIVOS: a loja passa a mostrar os filtros, e as opções marcadas ganham página
-- própria no sitemap (feature 68). Para revisar antes de mostrar, troque `true` por `false` em
-- `is_active` abaixo e ligue no painel depois.

begin;

-- ---------------------------------------------------------------------
-- 1 · Grupos e valores
-- ---------------------------------------------------------------------

insert into public.filter_groups (name, slug, is_active, sort_order) values
	('Tipo de joia',     'tipo-de-joia',     true, 0),
	('Metal',            'metal',            true, 1),
	('Cor',              'cor',              true, 2),
	('Material afetivo', 'material-afetivo', true, 3),
	('Gravação',         'gravacao',         true, 4)
on conflict (slug) do nothing;

insert into public.filter_values (group_id, name, slug, sort_order)
select g.id, v.name, v.slug, v.ord
from (values
	('tipo-de-joia', 'Pingente',        'pingente',        0),
	('tipo-de-joia', 'Colar',           'colar',           1),
	('tipo-de-joia', 'Anel',            'anel',            2),
	('tipo-de-joia', 'Pulseira',        'pulseira',        3),
	('tipo-de-joia', 'Brinco',          'brinco',          4),
	('tipo-de-joia', 'Berloque',        'berloque',        5),
	('tipo-de-joia', 'Chaveiro',        'chaveiro',        6),
	('tipo-de-joia', 'Corrente',        'corrente',        7),
	('tipo-de-joia', 'Decorativo',      'decorativo',      8),
	('metal',        'Prata 925',       'prata-925',       0),
	('metal',        'Aço inoxidável',  'aco-inoxidavel',  1),
	('metal',        'Folheado',        'folheado',        2),
	('cor',          'Dourado',         'dourado',         0),
	('cor',          'Prateado',        'prateado',        1),
	('cor',          'Rosé',            'rose',            2),
	('material-afetivo', 'Leite materno',  'leite-materno',  0),
	('material-afetivo', 'Cinzas',         'cinzas',         1),
	('material-afetivo', 'Cabelo',         'cabelo',         2),
	('material-afetivo', 'Pelo de pet',    'pelo-de-pet',    3),
	('material-afetivo', 'Dente de leite', 'dente-de-leite', 4),
	('material-afetivo', 'Coto umbilical', 'coto-umbilical', 5),
	('material-afetivo', 'Flores',         'flores',         6),
	('material-afetivo', 'Penas',          'penas',          7),
	('gravacao',     'Com gravação',    'com-gravacao',    0)
) as v(group_slug, name, slug, ord)
join public.filter_groups g on g.slug = v.group_slug
on conflict (group_id, slug) do nothing;

-- ---------------------------------------------------------------------
-- 2 · O que cada peça é — calculado, ainda sem gravar
-- ---------------------------------------------------------------------

-- Texto dobrado: minúsculas e sem acento. `unaccent` não está instalada em produção.
create temporary table _peca on commit drop as
select
	p.id,
	translate(lower(p.name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') as n,
	array(
		select c.name from public.product_categories pc
		join public.categories c on c.id = pc.category_id
		where pc.product_id = p.id
	) as cats
from public.products p;

-- O tipo pela peça toda. A ordem dos `when` é a decisão: TODO o nome vem antes de QUALQUER categoria
-- ("Pingente Pet Pata" está em Berloques e é pingente), e as categorias largas ("Pingentes afetivos"
-- tem quase tudo) só decidem no fim.
create temporary table _tipo on commit drop as
select id, case
	when n ~ '^(conserto|quadro moldura)' then null
	when n ~ '^aneis? ' then 'anel'
	when n ~ '^brincos? ' then 'brinco'
	when n ~ '^pulseiras? ' then 'pulseira'
	when n ~ '^berloques? ' then 'berloque'
	when n ~ '^(memorial|piramide|quadro|placa|coracao afetivo|gestante)' then 'decorativo'
	when n ~ '^(colar|gargantilha|cola |escapulario)' then 'colar'
	when n ~ '^corrente' then 'corrente'
	when n ~ '^(pingentes?|joia afetiva)' then 'pingente'
	when 'Anéis' = any(cats) then 'anel'
	when 'Brincos' = any(cats) then 'brinco'
	when 'Pulseiras' = any(cats) or 'Pulseiras Afetivas' = any(cats) then 'pulseira'
	when 'Berloques' = any(cats) then 'berloque'
	when 'Pingentes afetivos' = any(cats) or 'Pingentes' = any(cats) then 'pingente'
end as tipo
from _peca;

-- Os pares (eixo, texto) das variações ATIVAS, exatamente como a loja os compara.
create temporary table _opcao on commit drop as
select distinct
	v.product_id as id,
	e.key   as eixo,
	e.value as texto,
	translate(lower(e.key),   'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') as eixo_n,
	translate(lower(e.value), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') as t
from public.product_variants v
cross join lateral jsonb_each_text(v.option_values) e
where v.is_active and e.value <> '';

-- Toda marcação, num lugar só: eixo/texto nulos ⇒ a peça toda.
create temporary table _marca (
	id uuid, eixo text, texto text, grupo text, valor text
) on commit drop;

-- Tipo por opção — eixo "Modelo"
insert into _marca
select id, eixo, texto, 'tipo-de-joia', case when t ~ '^berloque' then 'berloque' else 'pingente' end
from _opcao
where eixo_n = 'modelo' and t ~ '^(berloque|pingente)';

-- Tipo por opção — eixo de elo (Tipos de elo, Tipo de Elo, Tpos de elo, Tipode Elo…): o chaveiro é
-- chaveiro; as outras opções são o tipo da peça.
insert into _marca
select o.id, o.eixo, o.texto, 'tipo-de-joia', case when o.t ~ 'chaveiro' then 'chaveiro' else tp.tipo end
from _opcao o
join _tipo tp on tp.id = o.id
where o.eixo_n ~ '^t[a-z]*\s*de\s*elo$'
  and exists (select 1 from _opcao c where c.id = o.id and c.eixo = o.eixo and c.t ~ 'chaveiro')
  and (o.t ~ 'chaveiro' or tp.tipo is not null);

-- Tipo pela peça toda, quando nenhuma variação muda o tipo
insert into _marca
select tp.id, null, null, 'tipo-de-joia', tp.tipo
from _tipo tp
where tp.tipo is not null
  and not exists (select 1 from _marca m where m.id = tp.id and m.grupo = 'tipo-de-joia');

-- Metal e cor por opção. Só os eixos que descrevem o metal; "Cor do quadrinho" e "Pedra" ficam de fora.
create temporary table _metal_opcao on commit drop as
select id, eixo, texto, t from _opcao
where eixo_n = 'cor' or eixo_n = 'tipo' or eixo_n ~ '^t[a-z]*\s*de\s*elo$';

insert into _marca
select id, eixo, texto, 'metal', case
	when t ~ '\maco\M|inox' then 'aco-inoxidavel'
	when t ~ 'prata 925|^prata$' then 'prata-925'
	when t ~ 'folhead' then 'folheado'
end
from _metal_opcao
where t ~ '\maco\M|inox|prata 925|^prata$|folhead';

insert into _marca
select id, eixo, texto, 'cor', case
	when t ~ 'rose' then 'rose'
	when t ~ 'ouro branco|rodio|natural' then 'prateado'
	when t ~ 'ouro|dourad' then 'dourado'
	when t ~ 'prata' then 'prateado'
end
from _metal_opcao
where t ~ 'rose|ouro|rodio|natural|dourad|prata';

-- Metal pelo nome, só para a peça cujas variações não dizem o metal
insert into _marca
select p.id, null, null, 'metal', x.valor
from _peca p
cross join lateral (values
	('prata-925',      p.n ~ 'prata 925'),
	('aco-inoxidavel', p.n ~ '\maco inox'),
	('folheado',       p.n ~ 'folhead' and p.n !~ 'prata 925')
) as x(valor, casa)
where x.casa
  and not exists (select 1 from _marca m where m.id = p.id and m.grupo = 'metal');

-- Cor pelo nome, idem. "Folheado a Ouro e Ródio" é as duas.
insert into _marca
select p.id, null, null, 'cor', x.valor
from _peca p
cross join lateral (values
	('dourado',  p.n ~ 'folheado a ouro|folheada a ouro'),
	('prateado', p.n ~ 'rodio|folheado a prata|\maco inox' or (p.n ~ 'prata 925' and p.n !~ 'folhead'))
) as x(valor, casa)
where x.casa
  and not exists (select 1 from _marca m where m.id = p.id and m.grupo = 'cor');

-- Material afetivo pelo nome. "Árvore da Vida Flores" é desenho, não flor: só "com/e flores".
insert into _marca
select p.id, null, null, 'material-afetivo', x.valor
from _peca p
cross join lateral (values
	('leite-materno',  p.n ~ 'leite materno'),
	('cinzas',         p.n ~ 'cinza'),
	('cabelo',         p.n ~ '\mcabelos?\M|\mmecha'),
	('pelo-de-pet',    p.n ~ '\mpelos?\M'),
	('dente-de-leite', p.n ~ '\mdentes?\M'),
	('coto-umbilical', p.n ~ '\mcoto\M'),
	('flores',         p.n ~ '\m(com|e) flores\M'),
	('penas',          p.n ~ '\mpenas?\M')
) as x(valor, casa)
where x.casa;

-- Gravação por opção
insert into _marca
select id, eixo, texto, 'gravacao', 'com-gravacao'
from _opcao
where eixo_n = 'com gravacao' and t = 'sim';

-- ---------------------------------------------------------------------
-- 3 · Gravar
-- ---------------------------------------------------------------------

insert into public.product_filter_values (product_id, value_id)
select distinct m.id, fv.id
from _marca m
join public.filter_groups g on g.slug = m.grupo
join public.filter_values fv on fv.group_id = g.id and fv.slug = m.valor
where m.eixo is null
on conflict do nothing;

insert into public.product_option_filter_values (product_id, option_name, option_value, value_id)
select distinct m.id, m.eixo, m.texto, fv.id
from _marca m
join public.filter_groups g on g.slug = m.grupo
join public.filter_values fv on fv.group_id = g.id and fv.slug = m.valor
where m.eixo is not null
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 4 · Relatório — quantas peças ATIVAS cada valor alcança
-- ---------------------------------------------------------------------

select
	g.sort_order, g.name as grupo, fv.name as valor,
	(select count(*) from public.product_filter_values m
	   join public.products p on p.id = m.product_id and p.is_active
	   where m.value_id = fv.id) as pecas_inteiras,
	(select count(distinct m.product_id) from public.product_option_filter_values m
	   join public.products p on p.id = m.product_id and p.is_active
	   where m.value_id = fv.id) as pecas_por_opcao
from public.filter_groups g
join public.filter_values fv on fv.group_id = g.id
order by g.sort_order, fv.sort_order;

commit;
