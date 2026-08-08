-- `product_variants.name` deixa de ser NOT NULL — a última sobra do modelo de dois eixos fixos.
--
-- Sintoma: salvar QUALQUER produto com grade falhava com `23502`
-- (`null value in column "name" of relation "product_variants"`). O insert do formulário manda
-- `name: null` porque, no modelo novo, o rótulo da linha **não é um campo**: é derivado de
-- `option_values` por `variantLabel(options, option_values)` — "Tamanho: 2,5cm". Guardar o rótulo
-- em coluna seria uma segunda verdade que envelhece: renomear um eixo ou um valor deixaria o `name`
-- mentindo, e nada avisaria.
--
-- A coluna nasceu NOT NULL em `20260414121021`, quando a variação ERA um nome digitado à mão. As
-- migrations do programa do catálogo (07/11/12/13) migraram tudo para `option_values` + `options`,
-- mas nenhuma soltou esta constraint: a `20260801120100` até a contornou, inventando
-- `'Variação ' || ord` no backfill com o comentário `-- \`name\` é NOT NULL`. O contorno serviu ao
-- backfill e escondeu o problema do caminho de escrita.
--
-- Terceira ocorrência de `AD-012` (tipo escrito à mão é afirmação, não verificação):
-- `ProductVariant.name` era `string | null` desde a 07, `normalizeVariants` já lia `null`, os dois
-- leitores de UI (`VariantsTable`, `VariantImageCard`) tratam `name` como fallback de linha legada
-- (`variantLabel(...) || variant.name`), e os testes de `persistProduct` mockam o client — então
-- nem `tsc` nem `pnpm test` viam a mentira. Só um insert real contra o banco vê.
--
-- Por que soltar em vez de dropar a coluna: linhas legadas ainda guardam o único rótulo que existe
-- delas (`option_values = '{}'` no backfill), e os dois leitores acima ainda caem nele. Dropar é
-- trabalho de uma limpeza posterior, junto com `price_override` — e depende de nenhuma linha ter
-- `option_values` vazio.
--
-- Nada a migrar: soltar NOT NULL não toca valor existente.

alter table public.product_variants
  alter column name drop not null;

comment on column public.product_variants.name is
  'LEGADO. O rótulo da variação é derivado de option_values (variantLabel), não armazenado. Preenchido apenas em linhas anteriores ao modelo de eixos livres; código novo grava NULL.';
