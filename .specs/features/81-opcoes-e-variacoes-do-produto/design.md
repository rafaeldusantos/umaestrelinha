# 81 — Design

**Spec**: `spec.md` (OPV-01..28). Escopo: só `apps/backoffice`. **Sem migration, sem `core`.**

## Decisão de arquitetura (AD-063)

**A grade passa a ser derivada das opções no momento da EDIÇÃO, por uma função pura, e nunca na
leitura.** O botão "Regerar do cruzamento" era a fronteira entre "editar opções" e "mexer na grade";
sem ele, quem sincroniza é a página, chamando `syncGrid` a cada mudança das opções emitida pelo
`OptionsEditor`. A abertura do produto **não** chama `syncGrid` (OPV-08): o banco pode guardar uma
grade que diverge do cruzamento (órfãs vendidas e pausadas), e sincronizar na leitura sujaria o
formulário e apagaria linhas sem ninguém pedir.

Por que não em `packages/core`: os consumidores são uma tela só (o formulário do produto). A grade
rápida monta a grade dela no salvar, por `cartesian` de `core`, e fica fora (Out of Scope). Se um
segundo consumidor aparecer, `syncGrid` sobe para `core/pricing/grid.ts` ao lado de `diffGrid`.

## Componentes

| # | Arquivo | Papel | Requisitos |
| --- | --- | --- | --- |
| 1 | `features/product-form/model/gridSync.ts` (novo) | `syncGrid` puro: reconcilia linhas com as opções a partir de uma **mudança tipada** | OPV-01..03, 05..07, 09, 23, 24 |
| 2 | `features/product-form/model/orphans.ts` (novo) | `applyOrphanChecks(variants, results)` — aplica remoção/pausa **por id** | OPV-04, 25 |
| 3 | `entities/product/lib/optionLibrary.ts` (novo) | `buildOptionLibrary(rows)` puro: nomes e valores derivados, agrupados por `dobrarTexto` | OPV-18..20, A2, A3 |
| 4 | `entities/product/api/useOptionLibrary.ts` (novo) | Leitura de `products.options` do catálogo inteiro, molde de `useProductPool` | OPV-21, 22 |
| 5 | `features/product-form/ui/OptionsEditor.tsx` | Rótulos, mudança tipada, recusa de nome duplicado, sugestões | OPV-17..20, 23 |
| 6 | `features/product-form/ui/VariantImagePicker.tsx` (novo) | Botão 48px + modal de imagens + envio | OPV-11..15, 26, 28 |
| 7 | `features/product-form/ui/VariantsTable.tsx` (+ `GridToolbar`, `gridActions`) | Célula de imagem vira o picker; "Regerar" sai | OPV-10, 11, 28 |
| 8 | `pages/admin/AdminProductFormPage.tsx` | Fiação: `syncGrid` nas mudanças, checagem das órfãs, biblioteca, upload, card removido | OPV-04, 08, 14..16, 27 |
| 9 | `pages/admin/AdminQuickGridPage.tsx` | Só recebe a biblioteca e a nova assinatura do editor | OPV-17..20 |

Apagados: `RegenerateGridDialog.tsx`, `VariantImageCard.tsx` (+ teste), `buildRegeneratePlan`/
`applyRegenerate` de `gridActions.ts` (e os casos deles em `gridActions.test.ts`/`GridActions.test.tsx`
— **queda declarada**, os comportamentos que importam reaparecem em `gridSync.test.ts`).

### 1. `syncGrid`

```ts
export interface GridDefaults { price: number; compare_price: number; weight_kg: number }

/** Uma operação do editor — o que a tela FEZ, não o array resultante. */
export type OptionsChange =
  | { kind: 'values'; index: number }              // acrescentou/removeu valores
  | { kind: 'rename'; index: number }              // digitou no nome
  | { kind: 'addOption' }
  | { kind: 'removeOption'; index: number }
  | { kind: 'move'; from: number; to: number }

export interface GridSyncState {
  options: ProductOption[]       // as opções que a grade atual reflete (a última reconciliação)
  variants: ProductVariant[]
}

export interface GridSyncResult {
  options: ProductOption[]       // novo "refletido" (pode ficar igual ao anterior se pulou)
  variants: ProductVariant[]     // mesma referência quando nada mudou (OPV-09)
  orphans: ProductVariant[]      // linhas com id REAL que saíram do cruzamento — a página checa pedidos
  skipped: 'incomplete' | 'duplicate' | null
}

export const syncGrid = (
  state: GridSyncState,
  nextOptions: ProductOption[],
  change: OptionsChange,
  defaults: GridDefaults,
  productId: string,
): GridSyncResult
```

Regras, nesta ordem:

1. **Pular** (OPV-23/24): se alguma opção com valores tem nome vazio, ou dois nomes coincidem por
   `dobrarTexto` → devolve `variants` intacto, `options` = `state.options` (o refletido **não** avança),
   `skipped` com o motivo.
2. **Re-chavear** as linhas para os nomes de `nextOptions`, casando opção refletida ↔ opção nova:
   - `rename`/`values`/`move`: casamento por **posição após aplicar a operação** (o refletido é
     permutado igual em `move`). A chave antiga de cada linha passa a ser o nome novo (OPV-05). É isso
     que torna OPV-24 verdadeira: enquanto o nome está vazio o refletido guarda o nome antigo; quando
     um nome volta, o re-chaveamento parte dele.
   - `removeOption`: a chave daquela opção é **apagada** de cada linha; linhas que colidem na mesma
     combinação mantêm a **primeira** (ordem da grade), as demais viram órfãs (OPV-07/A5).
   - `addOption`: nada a re-chavear até a opção ganhar nome e valores; quando ganha (próximo `values`
     com a opção que antes não estava no refletido), cada linha existente recebe o **primeiro** valor
     dela (OPV-06/A4).
3. `diffGrid(linhasRechaveadas, cartesian(nextOptions))` → `toKeep` (mesmo objeto, OPV-03),
   `toCreate`, `toRemove`.
4. Criar `toCreate` com OPV-02: `is_active: true`, `price: defaults.price > 0 ? price : null`, idem
   `compare_price` e `weight_kg`, `stock: 0`, `sku/image_url/name: null`, `id: tempVariantId()`,
   `position` contínuo.
5. `toRemove` com id temporário some; com id real vai para `orphans` **e sai de `variants`?** — **não**:
   fica em `variants` até a checagem (a página decide via `applyOrphanChecks`). Assim uma falha de
   rede nunca apaga uma linha vendida.
6. Se nada foi criado, removido ou re-chaveado → devolve `state.variants` (mesma referência).

Linhas já pausadas que são órfãs **e** que a página já marcou como "vendidas" não são re-oferecidas
como órfãs (a página guarda o conjunto de ids conferidos, evitando consultas repetidas).

### 2. `applyOrphanChecks`

```ts
export type OrphanVerdict = { id: string; outcome: 'remove' | 'pause'; label: string }
export const applyOrphanChecks = (variants: readonly ProductVariant[], verdicts: readonly OrphanVerdict[]):
  { variants: ProductVariant[]; paused: string[] }
```

Opera **por id** sobre a grade ATUAL (OPV-25): `remove` filtra, `pause` põe `is_active: false`. Id que
não está mais na grade é ignorado. `outcome = 'pause'` vem de `orders > 0` **ou** `verified === false`
(mesma régua de `bulkDelete`, `VariantsTable.tsx`). A página reaproveita `checkVariantOrders`.

### 3. `buildOptionLibrary`

```ts
export interface OptionLibraryEntry { name: string; count: number; values: string[] }
export const buildOptionLibrary = (rows: readonly { options: ProductOption[] | null }[]): OptionLibraryEntry[]
export const findLibraryEntry = (library: readonly OptionLibraryEntry[], name: string): OptionLibraryEntry | null
```

- Agrupa nomes por `dobrarTexto(name.trim())`; exibe a grafia mais frequente (A3); `count` = nº de
  produtos que têm aquele nome.
- Ordem: `count` desc, empate `localeCompare('pt-BR')` (A2).
- Valores: começa pela sequência do **produto mais representativo** (o primeiro produto, na ordem de
  leitura, com o maior número de valores daquele nome); acrescenta os demais por frequência desc,
  deduplicando por `dobrarTexto` (A2). Valores vazios descartados.
- **Não** importa `buscarProdutos` nem filtra produto: `buscaDeProdutoComDonoUnico.test.ts` recusa
  filtro por nome de produto fora de `entities/product/api` — a biblioteca não filtra produto nenhum.

### 4. `useOptionLibrary`

- Chave `[...PRODUCT_POOL_KEY, 'options']` — começa pela do pool, então a invalidação que quem grava
  produto já faz (`invalidateProductPool`) a alcança de graça (OPV-22), como `useProductMarkingPool`.
- Coluna `options` só; **conta primeiro e pagina** com `readAllPages` (mesmo motivo do pool: o teto de
  1.000 do PostgREST corta sem avisar). Client injetável (`ClienteDeLeitura`), cast num lugar só.
- `staleTime` = `PRODUCT_POOL_STALE_TIME`. Erro ⇒ `{ library: [], error }`; o editor ignora (OPV-21).

### 5. `OptionsEditor`

- Props: `options`, `onChange(next, change: OptionsChange)`, `library?: OptionLibraryEntry[]`.
- Rótulos (OPV-17): "Nome da opção", "Valores", "Adicionar opção", "N de 3 opções · a × b = c
  variações", estado vazio "Sem opções, o produto tem um preço só. Adicione uma opção (Tamanho, Cor…)
  para vender por variação.", aria-labels "Mover <nome> para cima/baixo", "Remover <nome>"; fallback
  "opção N". `datalist` + `PRESETS` saem — as sugestões vêm da biblioteca.
- Nome: combobox `role="combobox"` + `listbox` (molde de `SupplierNameField`), filtrado por
  `dobrarTexto`, até 8 itens, texto livre permitido.
- Valores: com nome conhecido → "Conjuntos mais usados" (até 3, `suggestValueSets`, cada um com
  "em N produtos") e "Valores usados em outros produtos" (chips enquanto sobrar valor não usado,
  `remainingValues`), alvo `min-h-11`. *Revisto em 2026-10-26 pela recomendação do QA, confirmar*: era
  a opção vazia com chips e "Usar os N valores" (a união do catálogo);
  digitando → até 8 sugestões que casam e ainda não estão na opção.
- Nome duplicado → `<p role="alert">Já existe uma opção com este nome.</p>` na segunda ocorrência.

### 6. `VariantImagePicker`

- `<button className="h-12 w-12 …" aria-label="Imagem de <label>">` com `<img object-cover>` ou ícone
  `ImagePlus` em marcador tracejado.
- `Dialog` (`@estrelinha/ui/dialog`, trilha já com `minmax(0,…)`, `dialogGridTrack.test.ts`): grade de
  miniaturas `aria-pressed`, "Usar a principal", "Adicionar imagens" (input file `multiple`
  `accept="image/*"`), progresso simples ("Enviando…"), erro por `uploadFailureMessage`.
- Upload: `uploadProductImages(files)` → `onImagesAdded(uploaded.map(url => ({ url, alt: null,
  source: 'upload' })))` + `onSelect(uploaded[0])` + fecha; `onUploadingChange(true/false)` (OPV-15).

### 7. `VariantsTable`

- Props novas: `images`, `onImagesAdded`, `onUploadingChange`; sai `productId`.
- Célula de imagem: `w-14` e o picker. Sai `ImageOff`, o `RegenerateGridDialog`, `onRegenerate` do
  `GridToolbar` (e o botão dele), e a frase do estado vazio vira a de OPV-10.

### 8. Página

```
const reflected = useRef<ProductOption[]>(form.options carregadas)   // reinicia ao carregar o produto
onOptionsChange(next, change):
   r = syncGrid({ options: reflected.current, variants: form.variants }, next, change, defaults, id)
   reflected.current = r.options
   setFields({ options: next, variants: r.variants })
   para cada órfã ainda não conferida → checkVariantOrders → verdicts → setFields(f => applyOrphanChecks(...))
   paused.length > 0 ⇒ aviso (role="alert") "Estas variações já foram vendidas e ficaram pausadas: …"
```

- Os `defaults` vêm de `form.price`, `form.compare_price`, `form.weight_kg` **no momento** da mudança.
- O card "Imagem por variação" sai; `VariantsTable` recebe `images={form.images}`,
  `onImagesAdded={imgs => setField('images', [...form.images, ...imgs])}`,
  `onUploadingChange={setUploading}` (o mesmo setter da galeria).
- `useOptionLibrary()` → `library` para o editor.

## Riscos e guardas a respeitar

- **L-030**: testes da página com `vi.mock` total do client — `useOptionLibrary` novo pode quebrar o
  render; o hook recebe o client injetável e tem default seguro; conferir os mocks de
  `AdminProductFormPage*.test.tsx`.
- `semAbaEmConfiguracoes`, `brandScan`, `buscaDeProdutoComDonoUnico` (suíte do painel) e os guardas
  da **loja** que varrem `apps/**` — o gate inclui a suíte da loja.
- Teste de página monta a **página real** (memória "teste não monta a árvore que prova").
- jsdom não mede layout: OPV-28 é provado por classe de token exato no teste **e** em navegador.
