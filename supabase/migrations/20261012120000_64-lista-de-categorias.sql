-- Feature 64 — Lista de categorias na Home
--
-- Um movimento só: `home_section_items` ganha o TÍTULO CURTO do item, o texto que a loja escreve
-- embaixo do círculo do bloco "Lista de categorias" (`category_grid`).
--
-- Idempotente de ponta a ponta, e **sem uma única escrita de dado**: nenhuma linha existente é
-- tocada, e nenhum grant novo — as policies `has_role` de escrita e a leitura pública da feature 24
-- já cobrem a coluna.

-- ---------------------------------------------------------------------
-- A coluna (LCT-26)
-- ---------------------------------------------------------------------

alter table public.home_section_items
	add column if not exists title text;

-- ---------------------------------------------------------------------
-- O limite (LCT-27)
-- ---------------------------------------------------------------------
--
-- ⚠️ O 28 é o PAR de `CATEGORY_LIST_ITEM_TITLE_MAX` (`@estrelinha/core/home`, `categoryList.ts`).
-- `categoryListSchema.test.ts` LÊ ESTE ARQUIVO DO DISCO e compara os dois números — mudar um sem o
-- outro derruba a suíte, que é o ponto: a tela recusaria o que o banco aceita, ou o contrário.
--
-- Nomeado e criado à parte, e não inline no `add column`: sobre uma coluna que já existe, o
-- `if not exists` pula a linha inteira, e o `check` escrito ali nunca chegaria a existir.

do $$
begin
	if not exists (
		select 1 from pg_constraint
		where conname = 'home_section_items_title_len'
			and conrelid = 'public.home_section_items'::regclass
	) then
		alter table public.home_section_items
			add constraint home_section_items_title_len
			check (title is null or char_length(title) <= 28);
	end if;
end
$$;

comment on column public.home_section_items.title is
	'O título curto do item, até 28 caracteres (feature 64). Só o bloco Lista de categorias (category_grid) o lê, embaixo do círculo. Não é alt (descrição da imagem) nem label_snapshot (nome congelado da coleção, lido só quando ela é apagada). Vazio ⇒ a loja mostra o nome ATUAL da coleção de destino; quem decide isso é categoryListLabel, em packages/core/src/home/categoryList.ts.';
