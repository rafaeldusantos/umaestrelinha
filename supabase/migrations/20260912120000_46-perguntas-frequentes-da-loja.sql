-- =====================================================================
-- Feature 46 — Perguntas frequentes da loja
-- FAQL-26, FAQL-27, FAQL-29
-- =====================================================================
--
-- A loja ganha `/perguntas-frequentes`. O conteúdo NÃO é uma tabela nova: é a biblioteca `faqs` da
-- feature 28. O que nasce aqui é o SEGUNDO tipo de vínculo sobre ela — o primeiro é `product_faqs` —,
-- e a simetria entre os dois é o desenho inteiro.
--
-- Duas tabelas de pergunta e resposta no mesmo projeto seriam o "defeito 01" nascendo dentro do
-- corpus que o agente de IA vai ler depois. Com a biblioteca única a deduplicação vem de graça:
-- `faqs.question_key` já é `unique`, e a pergunta que hoje está em dezenas de produtos entra na
-- página sem virar uma segunda.
--
-- ⚠️ **A migration da 28 NÃO é editada, e isso é regra e não preferência.** `AD-017` venceu em
-- 2026-08-17: migration aplicada é imutável. O `db push` compara a LISTA de arquivos com o que já foi
-- aplicado e **não reexamina o conteúdo do que passou** — reescrever o `check` lá deixaria o banco
-- local (que vem de `db reset`) e o hospedado divergindo sem que nada acusasse: nem o push, nem o
-- build, nem o teste. Correção vem em migration nova, e ela é este arquivo.

-- ---------------------------------------------------------------------
-- 1 · O teto da resposta sobe de 600 para 4000 (FAQL-26)
-- ---------------------------------------------------------------------
--
-- Medido no conteúdo escrito pela dona: a resposta de "Quais materiais são utilizados na fabricação
-- das joias afetivas?" tem ~1.350 caracteres e **não cabe** em 600. O modo de falhar é ruim: o insert
-- sai com 23514, que na tela do painel vira "falha ao salvar" sem dizer o motivo.
--
-- A direção é de **afrouxamento**, e é isso que torna o `drop`+`add` seguro numa tabela com 67 linhas
-- em produção: nenhuma linha existente pode violar um limite MAIOR que o que ela já respeita. O `add`
-- revalida a tabela inteira, e com 67 linhas é instantâneo.
--
-- ⚠️ **Os dois `check` sobem JUNTOS, de propósito.** O teto é compartilhado: `FAQ_ANSWER_MAX` é o
-- mesmo número em `faqRefusal` (o editor da biblioteca) e no `maxLength` da resposta própria do
-- produto (`FaqTab.tsx`). Subir só o de `faqs` faria a tela do produto aceitar 4000 caracteres que o
-- banco recusa em 601 — exatamente a divergência que `faqSchema.test.ts` existe para impedir.

alter table public.faqs drop constraint if exists faqs_answer_len;
alter table public.faqs add constraint faqs_answer_len
	check (char_length(btrim(answer)) between 1 and 4000);

alter table public.product_faqs drop constraint if exists product_faqs_override_len;
alter table public.product_faqs add constraint product_faqs_override_len
	check (answer_override is null or char_length(btrim(answer_override)) between 1 and 4000);

-- ---------------------------------------------------------------------
-- 2 · faq_page_items — a colocação na página (FAQL-27)
-- ---------------------------------------------------------------------
--
-- Colunas em `faqs` (`show_on_faq_page`, `faq_page_position`, `category`) foram recusadas: confundem
-- CONTEÚDO com COLOCAÇÃO. A ordem na página não é propriedade da pergunta — é propriedade de onde ela
-- está, como `product_faqs.position` já demonstra. E uma flag booleana onde cabe presença de linha é
-- o que `/admin/home` já recusou uma vez ("curadoria é a PRESENÇA de itens, não uma flag").

create table if not exists public.faq_page_items (
	-- **`faq_id` é a PK, e não uma coluna a mais.** A página é UMA, então a mesma pergunta não pode
	-- estar duas vezes nela. Em `product_faqs` a PK é composta porque existem 680 produtos; aqui o
	-- "produto" é singular e some da chave.
	--
	-- `on delete restrict`, igual à irmã e pelo mesmo motivo: apagar uma entrada em uso removeria a
	-- resposta da página (e das até 453 páginas de produto) em silêncio. O caminho reversível é
	-- `faqs.is_active = false`, que tira de todas de uma vez e volta com um clique.
	faq_id uuid primary key references public.faqs(id) on delete restrict,
	-- O assunto é propriedade da COLOCAÇÃO. Gravado na pergunta, ele viajaria junto para qualquer
	-- outra superfície que a reusasse — a página do produto inclusive, que não tem assunto nenhum.
	--
	-- O vocabulário é FECHADO e espelhado por `FAQ_PAGE_CATEGORIES` (`@estrelinha/core/faq`);
	-- `faqPageSchema.test.ts` lê este arquivo do disco e compara os dois lados, item a item.
	category text not null,
	position integer not null default 0,
	-- `null` = usa a resposta da biblioteca. Mesmo molde de `product_faqs.answer_override`, e mesma
	-- regra de gravação: override idêntico ao padrão grava `null` (`faqOverrideOf`), senão o mesmo
	-- texto passaria a ter dois donos e editar a biblioteca deixaria de alcançar a página.
	answer_override text,
	created_at timestamptz not null default now(),
	constraint faq_page_items_category_check
		check (category in ('sobre','o-processo','envio-do-material','materiais-e-acabamentos','personalizacao','cuidados')),
	constraint faq_page_items_override_len
		check (answer_override is null or char_length(btrim(answer_override)) between 1 and 4000)
);

-- Sem `updated_at` e sem trigger: nada aqui tem histórico de edição. O texto mora em `faqs`, que já
-- carrega o `set_faqs_updated_at` da feature 28.

-- A ordem em que a página desenha: assunto, depois posição. A PK indexa `faq_id` e não serve a esta
-- leitura, que é a única que a loja faz.
create index if not exists faq_page_items_order_idx on public.faq_page_items (category, position);

comment on table public.faq_page_items is
	'Quais perguntas da biblioteca aparecem em /perguntas-frequentes, sob que assunto, em que ordem, e com que resposta quando ela difere do padrão (feature 46). É o segundo tipo de vínculo sobre faqs; o primeiro é product_faqs.';

comment on column public.faq_page_items.category is
	'O assunto sob o qual a página agrupa a pergunta. Vocabulário fechado, espelhado por FAQ_PAGE_CATEGORIES em @estrelinha/core/faq — a ORDEM daquela constante é a ordem em que a página exibe os grupos.';

-- ---------------------------------------------------------------------
-- 3 · RLS (FAQL-29)
-- ---------------------------------------------------------------------
--
-- **Habilitar RLS aqui é obrigatório, e não zelo.** `20260801130000_public_schema_grants.sql` concede
-- privilégio de tabela a `anon`/`authenticated` e repete o mesmo default privilege para toda tabela
-- nova — a postura padrão do Supabase, em que o portão é o RLS. Tabela nova que nascesse sem RLS
-- estaria escancarada, com escrita anônima inclusive.

alter table public.faq_page_items enable row level security;

-- ⚠️ **A colocação é lida publicamente SEM CONDIÇÃO, e é deliberado** — a mesma decisão de
-- `product_faqs`, pelo mesmo motivo.
--
-- A alternativa óbvia seria condicionar à entrada ativa. Ela é pior por um motivo concreto: o vínculo
-- para uma entrada desativada não chegaria ao navegador, e o ramo "pular a vaga" de `resolveFaqPage`
-- NUNCA rodaria em produção — o código existiria sem nada exercitá-lo. Com a leitura aberta, o embed
-- do PostgREST devolve `faq: null` com o `faq_id` intacto.
--
-- Não há vazamento: o conteúdo mora em `faqs`, que continua filtrando por `is_active`. O que fica
-- legível é um uuid, um assunto e uma posição.
drop policy if exists "public read faq page items" on public.faq_page_items;
create policy "public read faq page items" on public.faq_page_items
	for select to public
	using (true);

-- `to authenticated` + `has_role` no `using` **e** no `with check`.
--
-- Os dois lados testam coisas diferentes: o `using` decide quais linhas a pessoa ALCANÇA
-- (update/delete), o `with check` decide o que ela pode DEIXAR GRAVADO (insert/update). Só o `using`
-- deixaria um não-admin inserir livremente, porque `insert` não tem linha antiga para filtrar.
drop policy if exists "admin full faq page items" on public.faq_page_items;
create policy "admin full faq page items" on public.faq_page_items
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

-- Esta migration não emite privilégio de tabela nenhum, e a policy de escrita é `to authenticated` —
-- `anon` não é `authenticated`. `faqPageSchema.test.ts` assere as duas coisas lendo este arquivo do
-- disco.
