# 67 — Design

**Spec**: `.specs/features/67-filtros-nas-variacoes/spec.md` · **Context**: `context.md`
**Status**: Draft. Abordagem recomendada abaixo, aguardando o "pode seguir"

Telas do painel no Paper, arquivo **Uma Estrelinha**, página **"67 · Filtros nas variações —
painel"**:

| Artboard | O que fixa |
| --- | --- |
| `67 · Sugestões — fila por motivo (1440)` | à esquerda a lista de motivos (busca, grupo, fonte Todas/Opção/Nome/Tag, "N peças"); à direita o motivo aberto, com cabeçalho "Cor = “Prata 925” ⇒ Acabamento › Prata 925", selo âmbar "N trocam a marcação da peça toda", colunas **Variações que casam** ("26 de 144") e **Hoje** ("Sem marcação" / "Peça toda → troca", em âmbar), e a barra fixa "Recusar N" + "Aprovar N nesta opção" (os dois agem **sobre a seleção**) |
| `67 · Bloco no produto — pela peça e pelas variações (1440)` | "Na peça toda" (o bloco da `66`) e "Pelas variações": um cartão por eixo e uma linha por texto de opção (miniatura, "52 variações ativas", chips "Grupo › Valor", "+ Marcar"). A sugestão é um chip **tracejado**, com a faixa "Sugestão: … — motivo · Recusar · Aceitar". "Sem variação ativa" vem em selo âmbar, com o chip apagado e removível. O popover de "Marcar" tem busca, os valores agrupados e "Já vale para a peça toda" desabilitado. Eixos sem marcação nem sugestão (Letra, Com gravação) aparecem **recolhidos** |
| `67 · Sugestões — 390px (motivo aberto)` | a mesma fila no celular: voltar de 44px, a lista em coluna e a barra fixa com "Recusar" + "Aprovar 70" de 48px |

A loja **não** foi desenhada. O card ganha só a troca de foto, preço e link (VFL-12), sem elemento
novo.

---

## Abordagens consideradas (todas entregam o mesmo escopo)

| | Abordagem | Custo | Veredito |
| --- | --- | --- | --- |
| **A** | **Regra pura em `core/filters` sobre o que a vitrine já carrega**: as variações vêm no card, e o produto ganha um embed das marcações por opção. `core` decide quem passa e qual variação abre | +1 embed na vitrine; regra nova testada sem banco | **Recomendada.** É o molde da `66` (faceta no navegador, sem ida ao banco por toque) e mantém **um** dono de "quem passa" |
| B | RPC/view no Postgres que devolve (produto, variação) que casam | uma ida ao banco por toque; a contagem disjuntiva teria de ser reescrita em SQL | Recusada: seriam **dois donos** da regra, um em SQL para quem passa e outro em `core` para as contagens, que hoje ficam no navegador |
| C | Trigger que materializa a marcação por opção como marcação da peça (`product_filter_values`) | migration + trigger | Recusada: é o "defeito 01" na forma de coluna derivável. E perde a exigência de mesma variação (VFL-09), que é a regra que importa |

---

## Dados: uma migration, `20261019120000_67-filtros-nas-variacoes.sql`

Aditiva e idempotente, e **sem escrita de dado**. A migration da `66` é imutável (já está aplicada
em produção).

```sql
-- 1 · Marcação por opção da peça (VFL-01..08). Identidade = (peça, eixo, texto, valor).
create table if not exists public.product_option_filter_values (
  product_id   uuid not null references public.products(id) on delete cascade,
  option_name  text not null constraint pofv_option_name_len  check (char_length(option_name)  between 1 and 120),
  option_value text not null constraint pofv_option_value_len check (char_length(option_value) between 1 and 120),
  value_id     uuid not null references public.filter_values(id) on delete cascade,
  primary key (product_id, option_name, option_value, value_id)
);
create index if not exists pofv_value_idx on public.product_option_filter_values (value_id);

-- 2 · Recusas (VFL-21, VFL-30). Alvo "peça toda" = option_name = '' e option_value = ''.
--     A recusa é por ALVO, não por fonte: recusar "Tag Prata925 ⇒ Prata 925 (peça)" também
--     cala "Nome contém 'prata 925' ⇒ Prata 925 (peça)", porque é a mesma afirmação.
create table if not exists public.filter_suggestion_dismissals (
  product_id   uuid not null references public.products(id) on delete cascade,
  value_id     uuid not null references public.filter_values(id) on delete cascade,
  option_name  text not null default '',
  option_value text not null default '',
  created_at   timestamptz not null default now(),
  primary key (product_id, value_id, option_name, option_value)
);

-- 3 · Termos de sugestão (VFL-35..37). ≤ 10 termos, cada um 1..40.
create or replace function public.filter_suggest_terms_valid(t text[]) returns boolean
  language sql immutable as $$
  select cardinality(t) <= 10
     and coalesce((select bool_and(char_length(x) between 1 and 40) from unnest(t) x), true)
$$;
alter table public.filter_values
  add column if not exists suggest_terms text[] not null default '{}';
-- constraint criada só se não existir (bloco do $ com pg_constraint), check (filter_suggest_terms_valid(suggest_terms))
```

- **O teto de 120** é sanidade, não regra de negócio. **Medir o maior texto de opção do catálogo
  antes de cravá-lo** (task 01). Se o real passar de 120, o número sobe, e quem decide é o dado.
- **RLS** (molde da `66`): `product_option_filter_values` é lida em público só com grupo ativo
  **e** peça ativa, e escrita com `has_role` no `using` **e** no `with check`.
  `filter_suggestion_dismissals` **não tem leitura pública**: é admin no `for all`, com
  `with check`. Nada a `anon`.
- Guarda **`variantFiltersSchema.test.ts`** (store `shared/lib/__tests__`, molde de
  `productFiltersSchema`): `if not exists` nas duas tabelas e na coluna; as cascatas; os 10 e 40
  **importados** de `core` (`FILTER_SUGGEST_TERMS_MAX`, `FILTER_NAME_MAX`); a policy pública da
  marcação por opção com as **duas** condições (grupo ativo **e** peça ativa); recusas sem
  `to anon` e sem `for select … using (true)`; `with check` em toda escrita; nenhuma escrita de
  dado. `mutar()` lança quando não acha o alvo, e há uma régua por comando (`L-033`).
- **Ordem de publicação**: a do `AD-050`, porque a vitrine passa a pedir a tabela nova por embed.
  Primeiro a migration, sozinha, e depois o código.

---

## `packages/core/src/filters/`: a regra nova (`.ts` explícito, sem import de pacote)

| Arquivo | Exporta | Consumidores |
| --- | --- | --- |
| `types.ts` (+) | `OptionMark { option_name; option_value; value_id }`; `FilterableVariant { id; option_values: Record<string,string>; is_active }`; `FilterableProduct` ganha `option_marks?: readonly OptionMark[]` e `variants?: readonly FilterableVariant[]` (opcionais: a peça da `66` continua válida) | todos |
| `match.ts` (novo) | `matchProduct(product, selection, catalog, opts) → { passes: boolean; variant: V \| null }`, `variantCarries(variant, marks, valueIds)` | `facets.ts`, loja |
| `facets.ts` (≠) | `passesSelection` e `facetCounts` passam a delegar a `matchProduct`; `visibleGroups` conta como presente o valor marcado por opção **com variação ativa** | loja |
| `suggest.ts` (novo) | `foldTokens(texto)`, `termMatches(termo, texto)`, `suggestMarks(input) → Suggestion[]`, `groupSuggestions(list) → SuggestionGroup[]`, `suggestionReason(s) → string` | painel (fila **e** formulário: VFL-31, uma função) |
| `rules.ts` (+) | `FILTER_SUGGEST_TERMS_MAX = 10`, `suggestTermRefusal(term, outros, nomeDoValor) : string \| null` | painel, guarda |

### `matchProduct`: a regra de VFL-09..11

```
S = resolverSelecao(selection)                        // grupo → ids (já existe)
G_peça   = { G ∈ S : product.filter_value_ids ∩ S_G ≠ ∅ }
R        = S \ G_peça                                 // grupos que só a variação pode satisfazer
se R = ∅:  passes = productPass(product);  variant = null              // card de hoje (VFL-13)
senão:
  candidatas = variants ativas, por position, onde
      ∀ G ∈ R: ∃ m ∈ option_marks, m.value_id ∈ S_G, v.option_values[m.option_name] = m.option_value
      ∧ variantPass(v)                                // preço e estoque DA VARIAÇÃO (VFL-10)
  variant = primeira com prefer(v) (estoque), senão a primeira          // VFL-11
  passes  = variant ≠ null
```

- `opts = { productPass, variantPass, prefer }` são funções. Preço, estoque e desconto são regra da
  **loja** (`passesSystem`), e `core` não os conhece, como hoje com `systemPass`.
- **`facetCounts` é reescrita** como "a peça passaria com `S_G := {v}`?", para cada valor
  presente. O atalho de hoje ("uma falha só ⇒ conta no grupo que falhou") deixa de valer, porque a
  mesma variação tem de satisfazer **vários** grupos ao mesmo tempo. O custo é desprezível: ~20
  valores presentes × 702 peças × ~5 variações.
- Os testes da `66` em `facets.test.ts` **continuam verdes sem edição** (peça sem `option_marks` ⇒
  comportamento idêntico). É a régua de não-regressão da troca de algoritmo: se um caso antigo
  precisar mudar, o comportamento mudou.

### `suggestMarks`: a regra de VFL-18..21

```
para cada peça p, para cada valor v (de grupo de qualquer estado), termos = [v.name, ...v.suggest_terms]:
  fonte 'option': para cada (eixo e, texto t) presente numa variação ATIVA de p:
       se ∃ termo: termMatches(termo, t)  →  alvo (e, t)
  fonte 'name':   termMatches(termo, p.name)                 →  alvo peça
  fonte 'tag':    ∃ tag: termMatches(termo, tag) ou termMatches(semEspaço(termo), semEspaço(tag)) → alvo peça
descarta se: a marcação equivalente existe; há recusa para (p, v, alvo);
             alvo peça e a sugestão por opção do mesmo v já existe? (não descarta: são alvos diferentes)
termMatches(termo, texto) = tokens(termo) aparecem CONTÍGUOS em tokens(texto)
tokens = NFD → sem marca combinante → minúsculas → split por não-alfanumérico → sem vazios
```

- O grupo de motivo é `(fonte, eixo dobrado, texto exato, value_id, tipo de alvo)`. "Cor = Prata
  925" em 73 peças vira **uma** linha da fila. O **eixo dobrado** junta "Tipos de elo" e "Tipo de
  Elo"? **Não**: o motivo mostra a grafia real da peça, e a dobra serve só ao casamento do termo. As
  cinco grafias do eixo de elo viram cinco linhas, e isso é aceito porque a Adri vê de onde vem cada
  uma.
- `foldTokens` vive em `core` porque `core` não alcança `apps/backoffice/shared/lib/texto.ts`. O
  guarda da `51` (`buscaDeProdutoComDonoUnico`) varre só `apps/backoffice/src/**`. **Conferir no
  gate** que ele não acusa a chamada do painel a `core`.

---

## Painel (`apps/backoffice`)

| Peça | Onde | Nota |
| --- | --- | --- |
| Rota `/admin/filtros/sugestoes` | `App.tsx`, irmã **auto-fechada** das três da `66`, dentro do `RequireAdmin` | estática vence `:groupId` no ranking do react-router v6, e um caso de teste prova isso. `rotasSobGuarda`, `rotasDeConfiguracoes`-style e `focusRoutes` conferidos |
| `entities/filter/api/useOptionMarks.ts` | leitura e escrita de `product_option_filter_values` por peça e por valor | `fetchX(modo)` (`50`) |
| `entities/filter/api/useSuggestionDismissals.ts` | ler todas as recusas e gravar em lote | `upsert(..., { ignoreDuplicates: true })` |
| `entities/product/api/useProductMarkingPool.ts` (+) | `PRODUCT_MARKING_COLUMNS` ganha `options, product_variants(option_values, is_active), product_filter_values(value_id), product_option_filter_values(option_name, option_value, value_id)` | `readAllPages` já é o dono. Conferir o tamanho da resposta (3.380 variações), medido na task |
| `features/filter-suggestions/` (novo) | `model/fila.ts` (recortes, seleção, contagem da troca), `ui/SuggestionQueue.tsx`, `ui/ReasonList.tsx`, `ui/ReasonDetail.tsx` | chama `suggestMarks` + `groupSuggestions` de `core`. "Aprovar" = upsert numa chamada por tabela; **VFL-27**: para os que trocam, grava a opção **antes** de apagar a da peça toda, numa segunda chamada |
| `pages/admin/AdminFilterSuggestionsPage.tsx` | 2 colunas ≥ `lg`, lista → detalhe no celular (molde de Configurações `55`) | — |
| `features/product-form/ui/FilterValuesCard.tsx` (≠) | as seções "Na peça toda" e "Pelas variações"; `OptionMarkRow`, `MarkPopover` e `SuggestionStrip` | o estado `option_marks` no `useProductForm`; "Aceitar" mexe só no estado (VFL-30) |
| `features/product-form/model/optionMarks.ts` (novo) | `remapOnAxisRename(prev, next, marks)`, `pruneRemovedOptions(options, marks)`, `diffOptionMarks(saved, next)` | pura e testada. A renomeação é detectada por **posição** do eixo em `options` (`position` já existe) |
| `features/product-form/model/persistProduct.ts` (≠) | nova etapa `'filtros-opcao'` depois de `'grade'`: apaga as que saíram, insere as novas | molde de `product_filter_values` (linha ~260). Falha ⇒ `{ ok:false, step }` (VFL-08) |
| `features/filter-bulk-assign` (≠, P2) | a coluna "Hoje" com "Peça toda" / "Por opção: Cor = …", o atalho "Ver N sugestões" e o "Remover" que apaga as duas formas | — |
| `features/filter-editor` (≠, P2) | o campo de termos no valor, com `suggestTermRefusal` | contador `CharCounter` |
| `AdminFiltersPage` (+) | o link "Sugestões (N)" no cabeçalho | N = soma da fila, mesma função |
| Confirmação de remover valor (`66`, `FLT-07`) | soma as marcações por opção ao número | edge case da spec |

## Loja (`apps/store`)

| Peça | Onde | Nota |
| --- | --- | --- |
| `PRODUCT_OPTION_MARKS_EMBED = 'product_option_filter_values(option_name, option_value, value_id)'` em `PRODUCT_SELECT` e `PRODUCT_CARD_SELECT` | `entities/product/lib/mapProduct.ts` | o mapper produz `option_marks: []` quando ausente. `cardSelect.test.ts` ganha o campo |
| `nuvemshop_id` em `product_variants(…)` do card | idem | **sem ele o `?variant=` sai com o UUID** em vez do id que o Google já indexou (`publicVariantId`). Por isso entra |
| `features/category-filters/model/filters.ts` (≠) | `filterProducts` devolve `{ product, variant }[]` via `matchProduct`; `passesSystemVariant(p, v, f)` com o preço `v.price ?? p.price` e o estoque da variação | `L-013`: as fixtures **divergem** preço da peça e da variação |
| `CategoryPage` / `SearchPage` (≠) | passam `matchedVariant` ao card | as duas pelo mesmo hook do slice (VFL-17) |
| `entities/product/ui/ProductCard.tsx` (≠) | prop opcional `matchedVariant`: `to = productPath(slug) + '?variant=' + publicVariantId(v)`, foto `v.image_url ?? imagemEmDestaque`, preço e preço-de da variação | sem a prop ⇒ card idêntico (VFL-13). `fiacaoDaVitrine` ganha a régua da prop, para a página **renderizada** passá-la (`teste-nao-monta-a-arvore-que-prova`) |
| Guarda **`marcacaoPorOpcaoComDonoUnico.test.ts`** (VFL-38) | store `shared/lib/__tests__` | em `apps/store/**`, só `mapProduct.ts` cita `product_option_filter_values` e só `core` lê `option_marks` para decidir. Zero allowlist além do mapper, âncora dupla e sensores de CRLF/LF/glob |

---

## Code reuse

`readAllPages` (`core/paging`), `fetchMode` (`50`), `dobrarTexto` (busca da fila, `51`),
`publicVariantId` (`core/shopping/identity.ts`), `findVariantByPublicId` (a página já abre na
variação), `persistProduct` por etapa, `CharCounter`, `TAP_44`/`SWITCH_TAP_44`, e o casco da
marcação em massa da `66` (a fila reaproveita as peças de lista e de barra fixa).

## Risks & Concerns

| Risco | Mitigação |
| --- | --- |
| **O embed novo na vitrine** pode falhar por RLS ou por nome (`PGRST200`) e esvaziar a loja | probe HTTP contra o banco local como `anon`, com grupo ativo e inativo (`AD-012`), antes da task da loja. Ordem de publicação: migration antes do bundle |
| **A troca de algoritmo de `facetCounts`** pode mudar contagem de quem não tem marcação por opção | os casos da `66` ficam **intocados** como régua. Mais um teste de propriedade: sem `option_marks`, o novo algoritmo e o antigo dão o mesmo resultado em fixtures geradas |
| **A identidade por texto** se perde se o painel reescrever `options` com outra grafia | `remapOnAxisRename` + `pruneRemovedOptions` no save, testados. **Medido em 2026-10-18**: o importador (`tools/catalog-import/src/map/product.ts:154`, `buildOptions(raw)`) reescreve `options` **com o texto da Nuvemshop**. A marcação sobrevive à re-importação enquanto a origem não mudar a grafia; se mudar, a linha cai em "Sem variação ativa" no painel (VFL-07), que é o sinal visível. Declarado, não consertado |
| **Teto de 120** no texto de opção | medido: o maior eixo tem **20** caracteres e o maior texto **40**. 120 dá folga de 3× sem recusar dado real |
| **Payload da fila** (3.380 variações + marcações) | medir o tempo de `lerCatalogoParaMarcar` estendido no banco local, e paginar por `readAllPages` como hoje |
| **`ProductCard` tem estado de cor próprio** (`corEscolhida`) | a foto da variação é o **valor inicial** do palco; tocar numa cor continua trocando (fora de escopo mudar a fileira) |
| **Rota estática × `:groupId`** | caso de teste com `MemoryRouter` em `/admin/filtros/sugestoes` montando a página certa |
| **`buscaDeProdutoComDonoUnico`** acusar a dobra nova | ela mora em `core`, fora do escopo do guarda. Conferir no gate e, se ele acusar a chamada, a régua está certa e a peça vai para o lugar que ela manda |

## O que só o navegador prova (entra na prova da feature)

O card abrindo na variação (foto e preço) em 390 e 1440; a página caindo nela; a fila em 390 sem
rolagem horizontal do body e com a barra fixa fora da barra do sistema; a seção "Pelas variações"
com 5 cores e 3 grupos; o popover de "Marcar" dentro da coluna do formulário.
