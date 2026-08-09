# Refinamentos do Catálogo — Relatório de Verificação

**Feature**: `14-catalogo-refinamentos` · **Escopo deste relatório**: **Fase 3 (T51–T58)** — a tela de
Categorias. As Fases 1 e 2 fecharam em sessão anterior.
**Data**: 2026-08-01 · **Modo**: **standalone** (sem sub-agentes — o usuário não os pediu; é o
fallback previsto pelo skill).
**Veredito**: **PASS**

---

## O que a Fase 3 encontrou antes de escrever código

A T52 estava escrita como uma task só, presumindo que Categorias era um problema de UI. Não era.

**A tabela `categories` não tinha `parent_id`, `banner_url` nem `color_accent`** — nenhuma migration
jamais as criou — enquanto `DbCategory`, `CategoryFormDialog`, `useAdminCategories`,
`CategoryMultiSelect` e a loja (`useCategories`) **todos** liam e escreviam essas colunas.

Reproduzido contra o banco local com o payload exato do formulário, **antes** de qualquer mudança:

```
POST /rest/v1/categories
{"code":"PGRST204","message":"Could not find the 'banner_url' column of 'categories' in the schema cache"}
```

Consequências que estavam em produção:

1. **Toda criação e toda edição de categoria falhava.** Não é regressão desta feature — é um defeito
   pré-existente que só apareceu porque o critério da T52 era "a tela grava".
2. **A árvore era código morto.** `useAdminCategories.tree` agrupava por `parent_id`, que nunca
   existiu: tudo voltava como raiz, sempre.
3. **A contagem de produtos usava o FK legado.** `select('*, products(count)')` conta por
   `products.category_id`; a fonte real desde a `04` é `product_categories`, e o formulário de
   produto **só** escreve lá. Os números coincidiam (32 e 32) porque o dado é anterior à virada — o
   primeiro produto novo faria a contagem divergir em silêncio.

Por isso a T52 virou sete tasks (T52–T58), com a migration primeiro.

---

## Cobertura por AC (evidência ou zero)

| Task / AC | `file:line` + asserção | Resultado esperado | Coberto |
| --------- | ---------------------- | ------------------ | ------- |
| T52 — colunas criadas, save volta a funcionar | probe HTTP contra o banco local (abaixo) | 201 com a linha gravada | ✅ |
| T52 — `check (parent_id is distinct from id)` | probe SQL (abaixo) | `violates check constraint` | ✅ |
| T52 — view com contagem | probe SQL (abaixo) | Anime 6 · K-Pop 5 · … | ✅ |
| T53 AC1 — contagem da view, nunca `products(count)` | `useAdminCategories.test.ts` — `expect(callsTo('category_product_counts')).toHaveLength(1)` e `expect(categorySelect).not.toContain('products(count)')` | view lida; FK legado ausente | ✅ |
| T53 AC1 — costura, ausência = zero | `useAdminCategories.test.ts` — `expect(byId).toEqual({ anime: 6, sailor: 12, kpop: 0 })` | `kpop` sem linha na view vale 0 | ✅ |
| T53 AC2 — um update para N ids | `useAdminCategories.test.ts` — `expect(updates).toHaveLength(1)` + `toContainEqual({ method: 'in', args: ['id', ['anime','kpop']] })` | 1 update com `.in` | ✅ |
| T53 AC3 — contagem que falha não derruba a lista | `useAdminCategories.test.ts` — `expect(result.current.categories).toHaveLength(3)` + `every(c => c.product_count === 0)` | lista intacta, zeros | ✅ |
| T54 AC1 — pai soma as filhas | `categoryTree.test.ts` — `expect(rowFor(rows,'anime').totalCount).toBe(27)` | 6 + 12 + 9 | ✅ |
| T54 AC2 — busca casa nome e slug, sem acento | `categoryTree.test.ts` — `expect(idsOf(comAcento)).toEqual(['series'])` para `search: 'series'` em "Filmes & Séries" | casa | ✅ |
| T54 AC2 — pai fica quando só a filha casa | `categoryTree.test.ts` — `expect(idsOf(found)).toEqual(['anime','chainsaw'])` | filha nunca órfã na tela | ✅ |
| T54 AC3 — cascata | `categoryTree.test.ts` — `expect(selected.sort()).toEqual(['anime','chainsaw','sailor'])` | filhas entram no update | ✅ |
| T54 AC4 — arraste recusa outro pai | `categoryTree.test.ts` — `expect(reorderWithinParent(catalog(),'sailor','kpop')).toBeNull()` | `null` | ✅ |
| T54 AC5 — ciclo não trava | `categoryTree.test.ts` — `expect(idsOf(rows).sort()).toEqual(['a','b'])` com A↔B | as duas visíveis como raiz | ✅ |
| T55 AC1 — interruptor grava sem abrir inspetor | `CategoryTable.test.tsx` — `expect(onToggleActive).toHaveBeenCalledWith('anime', false)` + `expect(onOpen).not.toHaveBeenCalled()` | grava, não abre | ✅ |
| T55 AC2 — caret esconde a filha | `CategoryTable.test.tsx` — `expect(screen.queryByTestId('categoria-sailor')).toBeNull()` com `collapsedIds: ['anime']` | filha some, pai fica | ✅ |
| T55 AC3 — linha abre o inspetor | `CategoryTable.test.tsx` — `expect(onOpen).toHaveBeenCalledWith('sailor')` | id certo | ✅ |
| T56 AC1 — `Salvar` leva as colunas do PGRST204 | `CategoryInspector.test.tsx` — `expect(onSave).toHaveBeenCalledWith('anime', expect.objectContaining({ banner_url: 'https://cdn/capa.webp', parent_id: null }))` | payload com as colunas novas | ✅ |
| T56 AC2 — pai não oferece a própria nem filha | `CategoryInspector.test.tsx` — `expect(opcoes).toEqual(['Nenhuma — categoria raiz','K-Pop'])` | só as elegíveis | ✅ |
| T56 AC3 — cancelar não grava | `CategoryInspector.test.tsx` — `expect(onSave).not.toHaveBeenCalled()` após editar e cancelar | nada gravado | ✅ |
| T57 AC1 — exclusão nomeia o estrago | `CategoryDeleteDialog.test.tsx` — `expect(screen.getByText(/18 vínculos com produtos/))` e `getByText(/1 subcategoria/)` | números na tela antes de apagar | ✅ |
| T57 AC1 — confirmação exigida | `CategoryDeleteDialog.test.tsx` — botão `toBeDisabled()` até `EXCLUIR` digitado | atrito deliberado | ✅ |
| T57 AC2 — `Mostrar`/`Ocultar` em um update | `AdminCategoriesPage.test.tsx` — `expect(hook.updateCategoriesBatch).toHaveBeenCalledWith(expect.arrayContaining(['anime','sailor','chainsaw']), { active: false })` | 1 chamada, com cascata | ✅ |
| T57 AC3 — `Mesclar` não existe | `CategoryDeleteDialog.test.tsx` — `expect(screen.queryByRole('button', { name: /Mesclar/ })).toBeNull()` | ausente | ✅ |
| T58 AC1 — sem alça fora do modo | `AdminCategoriesPage.test.tsx` — `expect(screen.getByTestId('categoria-anime')).not.toHaveAttribute('draggable','true')` | não arrastável | ✅ |
| T58 AC2 — soltar entre irmãs grava | `AdminCategoriesPage.test.tsx` — `expect(hook.updateSortOrders).toHaveBeenCalledWith([{id:'chainsaw',sort_order:1},{id:'sailor',sort_order:2}])` | só o que mudou | ✅ |
| T58 AC2 — outro pai recusa | `AdminCategoriesPage.test.tsx` — `expect(hook.updateSortOrders).not.toHaveBeenCalled()` + toast explicando | nada gravado | ✅ |
| T58 AC3 — tabela + inspetor | `AdminCategoriesPage.test.tsx` — `expect(screen.getByLabelText('Editar Anime')).toBeInTheDocument()` após clique | inspetor abre | ✅ |
| T58 AC4 — ≥ 12 testes | 79 testes novos na Fase 3 | ≥ 12 | ✅ |

### Probes contra o banco local (T52 — DDL não tem teste unitário)

```
-- antes da migration
POST /rest/v1/categories → PGRST204 "Could not find the 'banner_url' column"

-- depois
POST /rest/v1/categories → 201 [{"id":"d2c968d2…","parent_id":null,"banner_url":null,
                                 "color_accent":"#7C3AED","updated_at":"2026-08-02T00:40:27Z"}]

select c.name, coalesce(v.product_count,0) from categories c
  left join category_product_counts v on v.category_id = c.id order by c.sort_order;
  → Anime 6 · K-Pop 5 · Filmes 4 · Bandas 3 · Games 5 · Séries 3 · Mangá 2 · Kawaii 4   (soma 32)

update categories set parent_id = id where slug='teste-t52-probe';
  → ERROR: violates check constraint "categories_parent_not_self"
```

---

## Sensor de discriminação

12 mutações de comportamento, aplicadas em cópia e revertidas por cópia de arquivo (**nunca por
git** — nada estava commitado, e um `git checkout` teria revertido os arquivos rastreados para a
versão anterior).

| # | Mutação | Resultado |
| - | ------- | --------- |
| M1 | pai ignora as filhas na contagem | **morto** |
| M2 | busca deixa a filha órfã (pai some) | **morto** |
| M3 | seleção não cascateia | **morto** |
| M4 | arraste aceita outro pai | **morto** |
| M5 | impacto da exclusão conta em dobro | **morto** (ver achado abaixo) |
| M6 | seletor de pai oferece a própria filha | **morto** |
| M7 | linha sempre arrastável | **morto** |
| M8 | colapsar não esconde a filha | **morto** |
| M9 | inspetor não grava a capa | **morto** |
| M10 | `Salvar` habilitado sem alteração | **morto** |
| M11 | contagem do servidor ignorada | **morto** |
| M12 | lote só afeta o primeiro id | **morto** |

**12 mutações · 12 killed · 0 survived.** Árvore restaurada e suíte verde depois do sensor.

### Achado real do sensor (corrigido)

M5 **sobreviveu na primeira passada**: `deletionImpact` é domínio, vive em
`model/categoryTree.ts`, mas os testes unitários dele estavam em `ui/CategoryDeleteDialog.test.tsx`.
Uma mudança futura no domínio, verificada contra o teste do domínio, não seria pega. Os testes
unitários foram movidos para `model/categoryTree.test.ts`, junto do código; o teste do diálogo ficou
só com o que é dele (os números virarem texto). M5 re-executado: **morto**.

---

## Gate medido

| Gate | Resultado |
| ---- | --------- |
| `pnpm test` | **exit 0** — core 500 · store 499 · functions 232 · backoffice **803** = **2034** (+79) |
| `pnpm build` | **exit 0** |
| `pnpm lint` | **35 err / 16 warn** — baseline era 36/16. **Zero erros novos**; nenhum problema em arquivo de categoria |
| `tsc` backoffice | **0** |
| `tsc` store | **0** |

O `tsc` pegou **1 erro que o `pnpm build` não pegou** (TS2352 na asserção de tipo do `select`
montado em runtime), exatamente como o `CLAUDE.md` avisa que aconteceria. Corrigido antes do fecho.

---

## Divergências deliberadas entre desenho e implementação

Registradas aqui para ninguém "consertar" por engano depois.

1. **`Mesclar` não existe** — corte de escopo decidido pelo usuário no aceite do artboard. Mover
   todos os vínculos de N categorias para uma e apagar as origens é irreversível e precisa da
   própria feature, com prévia do que muda. **O artboard foi corrigido**: o desenho não mostra mais
   a ação.
2. **`Destacar na home` não existe no inspetor** — o artboard mostra o interruptor, a implementação
   não o tem. Precisaria de uma coluna nova em `categories` **e** de a loja ler essa coluna numa
   faixa "Explore por tema" que não existe (`apps/store/src/entities/category` não tem nada de
   destaque). Um interruptor ligado a nada é pior que a ausência dele. O artboard **não** foi
   alterado — mexer no desenho é decisão de produto.
3. **`Mover para…` da barra de massa aponta para o inspetor** em vez de abrir um seletor próprio. A
   ação existe e é honesta sobre onde se muda o pai; um segundo seletor de destino, com as mesmas
   regras de ciclo do inspetor, seria duplicar a regra em dois lugares.
4. **A capa é URL, não upload.** O inspetor edita `banner_url` com prévia. Upload seria um terceiro
   caminho de envio (a `12` já tem dois) com validação e progresso próprios — escopo de feature.

## Limitação declarada

**`productLinks` da exclusão conta vínculos, não produtos distintos.** Um botton marcado em "Anime" e
em "Sailor Moon" conta duas vezes quando as duas são excluídas — e isso é comum, porque o formulário
de produto marca pai e filha. Contar produtos distintos exigiria `count(distinct product_id)`, que o
PostgREST não expressa. Por isso o rótulo na tela fala em **vínculos** e a lista prévia mostra a
contagem de cada categoria: o número agregado nunca é apresentado como "produtos afetados".
