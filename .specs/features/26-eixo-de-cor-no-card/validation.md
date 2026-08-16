# 26 · Eixo de cor no card — Validation

**Date**: 2026-08-15
**Spec**: `.specs/features/26-eixo-de-cor-no-card/spec.md`
**Diff range**: `d1d877f..bfdb42c` (Lote 1 `ce143f2` · Lote 2 `bfdb42c`)
**Verifier**: sub-agente independente (autor ≠ verificador), cobertura re-derivada da spec
**Veredito**: ✅ **PASS** — 15/15 ACs com evidência, 8/8 mutantes mortos, gates verdes.
3 lacunas menores, nenhuma bloqueante (ordenadas ao fim).

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T1 · `mapProduct` emite `tags` | ✅ Done | `map/product.ts:107-114` (`parseTags`) |
| T2 · `catalogoDoProduto` grava `tags` | ✅ Done | `write/products.ts:70` — dentro do objeto compartilhado insert/update |
| T3 · `writeVariantImages` | ✅ Done | `write/products.ts:327-349` |
| T4 · fase 3 acumula o mapa | ✅ Done | `run.ts:191`, `run.ts:205`, `run.ts:209` |
| T5 · relatório conta os dois números | ✅ Done | `report.ts` — `fotosDeVariacao`, linha própria em `toText()` |
| T6 · reimportação medida | ✅ Done | Medição registrada em `tasks.md:93-116`; **não re-executada** por este Verifier (exige Supabase local + credenciais Nuvemshop) |
| T7 · `colorAxis` / `colorPreview` | ✅ Done | `lib/variantSelection.ts:185-236` |
| T8 · `ColorPreview.tsx` | ✅ Done | `ui/ColorPreview.tsx:1-107` |
| T9 · integração no `ProductCard` | ✅ Done | `ui/ProductCard.tsx:236`, `:260` |
| T10 · testes de superfície | ✅ Done | `ui/__tests__/ProductCardSurface.test.tsx:202-364` |

---

## Spec-Anchored Acceptance Criteria

Caminhos relativos à raiz do repo. `ci/` = `tools/catalog-import/src`,
`st/` = `apps/store/src/entities/product`.

| Critério | Resultado que a spec fixa | `file:line` + expressão | Result |
| --- | --- | --- | --- |
| **COR-01** grava `image_url` com a URL do Storage da imagem cujo `images[].id` == `variants[].image_id` | a URL daquela imagem, casada por id | `ci/__tests__/run.test.ts:238` — `expect(fotos(of).get(1348437201)).toBe('…/nuvemshop/302967873/1217733178.webp')`; `:241` — a **outra** variação do mesmo produto recebe `…/1217733184.webp`; `ci/write/__tests__/products.test.ts:390` — `expect(gravadas(of).get(11)).toBe(AZUL)`; `:375` — `expect(op.filtro!.coluna).toBe('nuvemshop_id')` | ✅ PASS |
| **COR-02a** variação **sem** `image_id` → `null` | `null`, nunca outra imagem, nunca a capa | `ci/write/__tests__/products.test.ts:402` — `expect(gravadas(of).get(13)).toBeNull()` | ✅ PASS |
| **COR-02b** variação cujo **upload falhou** → `null` | `null`, nunca outra imagem, nunca a capa | `ci/write/__tests__/products.test.ts:416` — `expect(escrito).toBeNull()` **e** `:417` — `expect([CAPA, AZUL, ROSA]).not.toContain(escrito)`; ponta a ponta `ci/__tests__/run.test.ts:266` — `expect(escritos.every(u => u === null)).toBe(true)` sobre 37 escritas; vínculo fora da galeria (caso real) `run.test.ts:255` — `expect(fotos(of).get(1250310075)).toBeNull()` | ✅ PASS |
| **COR-03** relatório conta com-foto e sem-foto, **em linha própria, os dois** | dois números separados | `ci/__tests__/report.test.ts:101` — `expect(r.toText()).toContain('variações     com foto 1 · sem foto 2')`; `:93` — `toEqual({ com: 3, sem: 1 })`; `products.test.ts:457` — `toEqual({ com: 2, sem: 1 })` | ✅ PASS |
| **COR-04a** vínculo que mudou na origem é **corrigido** | a URL nova, não a preservada | `ci/write/__tests__/products.test.ts:430` — linha existente tem `AZUL`, mapeamento aponta 902 → `expect(gravadas(of).get(15)).toBe(ROSA)` | ✅ PASS |
| **COR-04b** re-execução produz **as mesmas URLs** | resultado idêntico ao da 1ª execução | `products.test.ts:442` — `expect(of('update','product_variants')).toHaveLength(3)` e `:443` — `[[21,AZUL],[22,null],[23,null]]` (escrita incondicional impede URL velha sobreviver). **Sem asserção de segunda execução**: a função é pura e não lê estado anterior, então a idempotência é verdadeira por construção — mas não é medida | ⚠️ Gap menor (G2) |
| **COR-05** `--dry-run` não escreve `image_url` | zero escritas | `ci/__tests__/run.test.ts:275` — `expect([...fotos(of).keys()]).toHaveLength(0)` e `:276` — `{ com: 0, sem: 0 }`; `products.test.ts:469` — `expect(ops).toHaveLength(0)` | ✅ PASS |
| **COR-06** tags de string por vírgula: trim · vazias fora · dedupe **preservando ordem** | `' a , , b , a '` → `['a','b']` | `ci/map/__tests__/product.test.ts:246` — `expect(comTags(' a , , b , a ')).toEqual(['a','b'])`; `:242` — `'Leite Materno, Cinzas'` → `['Leite Materno','Cinzas']`; `:251` — fixture real → `['Afetivo','Ateliê da Prata','Pingente Afetivo']` (ordem de publicação); forma da origem: `ci/nuvemshop/__tests__/apiShape.test.ts:92` — `expect(typeof p.tags).toBe('string')` | ✅ PASS |
| **COR-07** sem tag → `[]`, nunca `['']`, nunca `null` | `[]` | `product.test.ts:258` — `expect(row.tags).toEqual([])` e `:259` — `not.toContain('')`; `:264-267` — os 5 produtos reais, todos array, nenhum com `''` | ✅ PASS |
| **COR-08** grava tags **no update** e **sobrescreve** | valor anterior substituído | **Asserção do update, separada da do insert**: `products.test.ts:321` — linha existente com `tags: ['Nome Velho']`, origem manda `['Renomeada']` → `expect(update.tags).toEqual(['Renomeada'])`. Insert: `:307` — `expect(insert.tags).toEqual(['Afetivo','Pingente Afetivo'])`. Sobrescrita para vazio: `:335` — `expect(update.tags).toEqual([])` | ✅ PASS |
| **COR-09** nome `text-[14px]` · `font-display` · `font-medium` · `leading-[20px]` · `line-clamp-2` · altura reservada **40px** | os números exatos | `st/ui/__tests__/ProductCardSurface.test.tsx:188` — `toHaveClass('text-[14px]','leading-[20px]','line-clamp-2')`; `:191` — `not.toHaveClass('line-clamp-1')`; `:196` — `toHaveClass('min-h-[40px]')`; `:177` — `toHaveClass('font-display','font-medium','text-estrelinha-ink')` | ✅ PASS — números, não "mudou" (`L-024` respeitada) |
| **COR-10** placa com ≥2 cores; **sem** placa nos três outros casos, palco intacto | placa ausente e palco idêntico | Presente: `:211`. Sem grade: `:217` + `:218` — `container.querySelector('.aspect-\\[4\\/5\\].rounded-xl.bg-estrelinha-ground-deep')` não-nulo. Grade sem eixo Cor: `:228`. Eixo com 1 valor: `:233`. Regra pura: `st/lib/__tests__/variantSelection.test.ts:322`, `:326`, `:333`; `colorAxis` `:306`, `:312` (`'Cor do quadrinho'` → `null`), `:316` | ✅ PASS |
| **COR-11** placa é **um** controle, abre o seletor que já existe, **não navega**; miniaturas não são controles | `QuickAddDrawer` no desktop, `VariantSheet` no mobile, URL inalterada | `:241` — `expect(placa().querySelectorAll('button, a, [role="button"]')).toHaveLength(0)` + âncora `:242` 3 `<img>`; desktop `:251` — `getByRole('button',{name:'Fechar seleção de variações'})` (rótulo exclusivo de `QuickAddDrawer.tsx:42`); mobile `:261` — `getByRole('button',{name:/^Adicionar à sacola/})` (`VariantSheet.tsx:103`); não navega `:252` e `:262` — `queryByText('rota-produto')).toBeNull()`, com rota real montada em `:70` | ✅ PASS |
| **COR-12** até **4** a partir de `md`, até **3** abaixo; última vaga vira `+N` | asserção **positiva nas duas metades** | **Metade celular (positiva)**: `:282` — `expect(um).toHaveClass('block')`, `:283` idem `dois`, `:285` — `expect(contador).toHaveClass('flex','md:hidden')`, `:300` idem. **Metade `md:` (positiva)**: `:287` — `expect(tres).toHaveClass('hidden','md:block')`, `:288` idem `quatro`, `:296` — `expect(terceira).toHaveClass('hidden','md:block')`, `:298` — `expect(contadorMd).toHaveClass('hidden','md:flex')`. Contadores exatos `:284` `+2`, `:297` `+2`, `:299` `+3`. 3 cores sem `hidden`: `:272` — `expect(vagas().filter(v => v.classList.contains('hidden'))).toEqual([])`. Constantes: `variantSelection.test.ts:339` — `toBe(4)`, `:340` — `toBe(3)`. Regra pura: `:361` 5/4 → 3 thumbs, `:362` `overflow` **2**; `:371` 4/3 → 2 thumbs, `:372` `overflow` **2** | ✅ PASS — as duas metades são `toHaveClass` sobre a classe literal `md:…` (`L-029` respeitada) |
| **COR-13** thumb 32×32 r6 · gap 6 · padding 6 · `surface` · borda 1px `#8C8073` · r12 · inset 14 · altura 44 | os pixels do board | `:308-316` — `toHaveClass('h-11','p-1.5','gap-1.5','rounded-md','border','border-estrelinha-field','bg-estrelinha-surface')`; `:321` — `toHaveClass('absolute','bottom-3.5','left-3.5')`; `:328` e `:331` — todas as vagas com `h-8 w-8` e `rounded-sm`, ancoradas em `todas.length`. **Mapeamento classe→px conferido no disco**: `apps/store/tailwind.config.ts:76-83` declara `sm 6px` e `md 12px`; `h-11`=44px, `3.5`=14px, `1.5`=6px | ✅ PASS (indireto — ver nota N1) |
| **COR-14** escolhida **2px `ink`**; demais **1px `#8C8073`** | as duas bordas | `:340` — `toHaveClass('border-2','border-estrelinha-ink')`; `:341` — `toHaveClass('border','border-estrelinha-field')`; `:342` — `not.toHaveClass('border-2')`. Regra pura: `variantSelection.test.ts:425` — `[false,true,false]`; `:430` — `[false,false]` | ✅ PASS |
| **COR-15** cor sem foto → palco vazio `ground-deep`, **sem `<img>`**; nunca a foto de outra cor | zero `<img>` sem `src` | `:361` — `expect(imagens).toHaveLength(1)` (âncora) e `:362` — `expect(imagens.filter(img => !img.getAttribute('src'))).toEqual([])`; `:351` — a com foto tem `src='prata.webp'`, `:352` — a sem foto `querySelector('img')` é `null`, `:353` — `toHaveClass('bg-estrelinha-ground-deep')`. Regra pura: `variantSelection.test.ts:394` — `thumbs[1].imageUrl` `null`, `:395` — `['prata.webp', null]`; `:411` — com dois eixos, a foto é a da primeira **linha** daquela cor que tenha foto | ✅ PASS |

**Status**: ✅ 15/15 ACs com `file:line` e valor asserido igual ao que a spec fixa.
1 meia-AC (`COR-04b`) verdadeira por construção mas não medida.

### Nota N1 — `COR-13` é asserida por classe, não por pixel

As asserções são sobre nomes de classe (`h-11`, `rounded-md`, `p-1.5`). A tradução para pixel foi
conferida por este Verifier lendo `apps/store/tailwind.config.ts:76-83` — `sm` é 6px e `md` é 12px na
escala do DS, e a escala é guardada por `palette.test.ts`. A medição em navegador do autor
(`tasks.md:189-201`) bate. Não é lacuna, mas a cadeia tem dois elos: se a escala mudar, é a
`palette.test.ts` que derruba a suíte, não estas asserções.

---

## Edge Cases

| Caso da spec | Evidência | Result |
| --- | --- | --- |
| Produto sem grade (120 de 680) → sem placa, palco idêntico | `ProductCardSurface.test.tsx:217` + `:218`; `variantSelection.test.ts:326` | ✅ |
| Grade sem eixo Cor (175) → sem placa | `ProductCardSurface.test.tsx:228`; `variantSelection.test.ts:333` | ✅ |
| Eixo Cor com 1 valor → sem placa | `ProductCardSurface.test.tsx:233`; `variantSelection.test.ts:322` | ✅ |
| Eixo Cor 5 valores, **desktop** → 3 miniaturas + `+2` | `variantSelection.test.ts:361` + `:362`; `ProductCardSurface.test.tsx:296` + `:297` | ✅ |
| Eixo Cor 3 valores, **mobile** → 3 miniaturas, sem contador | `variantSelection.test.ts:351` + `:352`; `ProductCardSurface.test.tsx:270` + `:272` | ✅ |
| **Nenhuma variação de cor tem foto → placa com as vagas vazias** | **Não localizada.** O caso mais próximo, `ProductCardSurface.test.tsx:357`, é `['prata.webp', null, null]` — uma das três **tem** foto. Busca feita sobre os dois arquivos de teste: nenhuma chamada com todas as fotos `null` | ❌ **Gap G1** |
| Origem renomeia a tag → update sobrescreve | `products.test.ts:321` | ✅ |
| Origem remove todas as tags → grava `[]` | `products.test.ts:335`; `product.test.ts:258` | ✅ |
| Upload da foto falha → `image_url` null naquela variação; **produto entra** | `products.test.ts:416` + `:417`; `run.test.ts:266`. A metade "produto entra" é o teste pré-existente `run.test.ts:209` — `expect(of('insert','products')).toHaveLength(5)` sob falha total de imagem | ✅ |

---

## Discrimination Sensor

Executado em estado descartável: mutação aplicada na árvore, teste rodado, `git checkout -- <file>`
imediato. `git status --short` conferido vazio após **cada** mutação, e ao fim (árvore limpa,
`HEAD` em `bfdb42c`).

| # | File | Mutação | Testes que quebraram | Killed? |
| --- | --- | --- | --- | --- |
| M1 | `ci/write/products.ts:335-337` | `null` da variação sem vínculo vira a **primeira URL do mapa** (a capa) | **6** — `run.test.ts` COR-01 (`{com:37,sem:0}` ≠ `{com:34,sem:3}`) e COR-02; `products.test.ts` COR-02 ×2, COR-04, COR-03 | ✅ Killed |
| M2 | `st/lib/variantSelection.ts:234` | `overflow` sempre `0` | **4** — `variantSelection.test.ts` COR-12 ×2 (`+0` ≠ `2`); `ProductCardSurface.test.tsx` COR-12 ×2 (5 vagas viraram 4 e 3) | ✅ Killed |
| M3 | `st/ui/ColorPreview.tsx:41` | borda da escolhida: `border-2 ink` → `border field` (1px) | **1** — `ProductCardSurface.test.tsx:336` COR-14 | ✅ Killed |
| M4 | `ci/map/product.ts:111` | parser para de **deduplicar** | **1** — `product.test.ts:245` (`['a','b','a']` ≠ `['a','b']`) | ✅ Killed |
| M5 | `ci/map/product.ts:111` | parser devolve `['']` para string vazia | **4** — `product.test.ts` COR-06 e COR-07 ×2 (`['']` ≠ `[]`); `products.test.ts:338` | ✅ Killed |
| M6 | `ci/run.ts:196-200` | outcome `failed` **entra** no mapa | **1** — `run.test.ts:258` COR-02: as URLs cruas do CDN apareceram onde a AC exige `null` | ✅ Killed |
| M7 | `st/ui/ProductCard.tsx:260` | nome volta a `line-clamp-1` | **1** — `ProductCardSurface.test.tsx:184` COR-09 | ✅ Killed |
| M8 | `st/ui/ColorPreview.tsx:98` | 4ª vaga: `hidden md:block` → `block` | **2** — `ProductCardSurface.test.tsx` COR-12 ×2 | ✅ Killed |

**Sensor depth**: 8 mutações (acima do mínimo de 5 para caminho crítico).
**Result**: **8/8 killed** — ✅ PASS. Nenhum mutante sobreviveu.

---

## Gate Check

| Gate | Comando | Resultado |
| --- | --- | --- |
| Testes · store | `pnpm --filter @estrelinha/store test` | ✅ **1597 passed** / 116 files (baseline 1562/116 → **+35**) |
| Testes · catalog-import | `pnpm --filter @estrelinha/catalog-import test` | ✅ **299 passed** / 15 files (baseline 276/15 → **+23**) |
| Testes · core | `pnpm --filter @estrelinha/core test` | ✅ **1090 passed** / 38 files (baseline 1090/38 → **0**) |
| Testes · backoffice | `pnpm --filter @estrelinha/backoffice test` | ⚠️ **1387 passed / 1 failed** — `storeOrigin.test.ts:23`. **Pré-existente**, provado abaixo |
| Tipos · store | `npx tsc --noEmit -p apps/store/tsconfig.app.json` | ✅ exit **0**, `grep -c "error TS"` = **0** |
| Tipos · catalog-import | `npx tsc --noEmit -p tools/catalog-import/tsconfig.json` | ✅ exit **0**, `grep -c "error TS"` = **0** |
| Lint | `pnpm lint` | ✅ backoffice **28 erros / 7 warnings** + store **2 / 1** = **30/8** — idêntico à baseline, **zero erro novo** (oitava feature seguida) |
| Dinheiro | `git diff d1d877f..HEAD --name-only \| grep packages/core/src/payment` | ✅ **0 arquivos**. `packages/` inteiro: **0 arquivos** |

**Contagem total**: 4595 → **4653** testes (**+58**), 259 → **259** arquivos. Nenhuma queda —
nenhum teste foi apagado ou afrouxado. `functions` (279/4) intocada: o diff não alcança `supabase/`.

### A falha do backoffice é pré-existente — três provas independentes

1. **O diff não toca o backoffice**: `git diff d1d877f..HEAD --name-only -- apps/backoffice packages/`
   devolve **0 arquivos**.
2. **Os dois arquivos envolvidos são byte a byte idênticos** entre `d1d877f` e `HEAD`:
   `git diff d1d877f..HEAD -- apps/backoffice/src/shared/lib/storeOrigin.ts …/__tests__/storeOrigin.test.ts`
   sai **vazio**. O último commit a tocá-los é `f6fc41f` — da feature **25**.
3. **O gatilho não está no git**: a falha depende de `VITE_STORE_URL` existir em
   `apps/backoffice/.env`, que é **untracked** (`git ls-files` → 0). O arquivo é o mesmo nos dois
   commits porque o git não o versiona.

Causa raiz (confirmada de forma independente): `storeOrigin(base = STORE_URL)` usa **parâmetro
default**, e default dispara para `undefined`. O caso `expect(storeOrigin(undefined)).toBeNull()`
então lê a env e recebe `'http://localhost:8082'`. Diagnóstico do autor: correto.

---

## Os dois achados do autor do Lote 2 — verificados de forma independente

### Achado A — `${TAP_44} absolute` resolve para `position: relative`. **CONFIRMADO e PRÉ-EXISTENTE.**

Não repeti a medição do autor; refiz a cadeia por outro caminho.

1. **A composição existe**: `ProductCard.tsx:206` (favorito) e `:220` (o `+`) usam
   `` `${TAP_44} absolute …` ``, e `shared/lib/touchTarget.ts:29-30` mostra que `TAP_44` **começa
   com `relative`**. As duas classes de `position` chegam juntas ao mesmo `class`.
2. **Quem vence é a folha, não a ordem do atributo** — e a folha foi construída, não presumida.
   Build real do Tailwind 3.4.19 com um HTML de sonda contendo `class="relative absolute"`:

   ```
   1:.absolute {
   5:.relative {
   ```

   Mesma especificidade (uma classe), então vence a **última** — `.relative`. Confirmado também na
   fonte: `node_modules/tailwindcss/lib/corePlugins.js:685-699` declara as utilidades de `position`
   na ordem `static, fixed, absolute, relative, sticky`.
3. **É anterior a esta feature**: `git show d1d877f:apps/store/src/entities/product/ui/ProductCard.tsx`
   já traz `${TAP_44} absolute` nas linhas **205** e **219**. A feature 26 só deslocou as linhas em
   um.

**Consequência**: favorito e `+` caem no fluxo dentro de um palco `overflow-hidden`
(`ProductCard.tsx:182`) — invisíveis, em toda a loja. **Não é regressão da 26.**

**Observação própria, que o autor não registrou**: a placa desta feature **não** usa `TAP_44`
(`ColorPreview.tsx:92` é `absolute bottom-3.5 left-3.5` puro), então ela se posiciona **corretamente**.
O card passa a ter um elemento absoluto que funciona ao lado de dois que não funcionam — o que torna
o defeito A mais visível, não menos.

### Achado B — as 4 vagas (160px) sobrepõem o `+` em 768 e 1024. **ARITMÉTICA CORRETA.**

Recalculei do zero a partir das classes, sem usar os números do autor.

Largura da placa com 4 vagas (`ColorPreview.tsx:92` + `:29`), em `border-box`:

```
borda 1×2  +  padding 6×2  +  miniatura 32×4  +  gap 6×3  =  2 + 12 + 128 + 18 = 160px
```

Com `left-3.5` (14px), a placa termina em **174px**. O `+` (`ProductCard.tsx:220`:
`right-3.5`, `w-[38px]`) começa em `cardWidth − 14 − 38 = cardWidth − 52`.

**Sobreposição ⟺ `174 > cardWidth − 52` ⟺ `cardWidth < 226px`.**

| largura medida do card (autor) | `+` começa em | placa termina em | veredito recalculado |
| ---: | ---: | ---: | --- |
| 134,7px (768, categoria com trilho) | 82,7px | 174px | placa **25,3px mais larga que o card inteiro** |
| 220px (1024, categoria) | 168px | 174px | **6px de sobreposição** ✔ bate com o autor |
| 305,3px (1440) | 253,3px | 174px | 79,3px de folga ✔ bate com o autor |
| 220px (390, carrossel — **3 vagas**, 122px) | 168px | 136px | 32px de folga ✔ bate com o docblock |

O `md:` começa em 768px, então as duas larguras problemáticas estão **dentro** da faixa onde a 4ª
vaga é renderizada. **Achado B é real.**

**Acréscimo próprio**: em 134,7px o defeito **não depende do achado A**. O palco é
`overflow-hidden` (`ProductCard.tsx:182`), então a placa é **cortada** em 134,7px — a 4ª vaga
(x de 135 a 167) fica **inteiramente fora da tela**, hoje, com a árvore como está. O autor
descreveu 768 como "placa maior que o card" e condicionou o problema ao conserto do achado A; a
metade do corte já acontece. Não há scroll horizontal (o `overflow-hidden` o impede), o que
explica por que a medição de scroll do autor (390→390, 1440→1440) não acusou nada.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ `writeVariantImages` (23 linhas), `colorPreview` (22), `ColorPreview.tsx` (107) |
| Mudança cirúrgica | ✅ `ProductCard.tsx`: +24/−2, só o `<h3>` e a linha da placa |
| Sem escopo extra | ✅ Nenhuma migration, nenhuma coluna nova — as duas já existiam, como a spec previu |
| Segue os padrões | ✅ `colorAxis`/`colorPreview` entraram no módulo que **já é dono** da classe (`variantSelection.ts`), não num segundo lugar; `tags` entrou **dentro** de `catalogoDoProduto`, com o comentário explicando por que diverge da semente de material |
| Spec-anchored (valor asserido == valor da spec) | ✅ 15/15 |
| Cobertura por camada (domínio 1:1; superfície feliz+borda) | ✅ regra pura e DOM têm provas separadas e não redundantes |
| Todo teste mapeia a uma AC / edge case / done-when | ✅ os 58 novos citam `COR-xx` no `describe` ou no `it` |
| Diretrizes documentadas seguidas | ✅ `CLAUDE.md` (mobile-first, âncora de contagem, `L-024`, `L-029`); ver N2 |

### Nota N2 — a placa é um `<button>` com `rounded-md` (12px)

`CLAUDE.md` diz "**Botão é `rounded-sm` (6px)**", e `apps/store/tailwind.config.ts:80` reserva
`md` (12px) para **campo**. A placa (`ColorPreview.tsx:92`) é um `<button>` com `rounded-md` —
porque `COR-13` fixa 12px, então é **mandado pela spec**, não descuido. `buttonShape.test.ts` não
acusa: aquele guarda varre `rounded-pill` em tags de ação, não exige `rounded-sm`. Fica registrado
porque a regra do `CLAUDE.md` ganhou uma exceção que não está escrita em lugar nenhum.

---

## Lacunas, por gravidade

### G1 · `COR-12` tem uma inconsistência interna, e ela vira defeito no dia do conserto do achado A — **Major (spec)**

`COR-12` fixa 4 vagas a partir de `md` e **justifica** a escolha com uma conta feita sobre os 220px
do carrossel da home. Mas `md` começa em **768px**, e nas duas larguras de categoria dentro dessa
faixa o card é **134,7px** e **220px** — abaixo dos **226px** que as 4 vagas exigem. A AC foi
implementada exatamente como escrita (correto: mudar o corte é decisão de spec), e o autor
registrou a divergência em `tasks.md:233-247`. Em 134,7px a 4ª vaga **já é cortada hoje**.
→ Não é falha de implementação nem de teste. É a spec que fixa um número que a própria medição
contradiz. Precisa de decisão: `lg:` em vez de `md:`, ou vagas por largura de contêiner.

### G2 · Edge case "nenhuma variação de cor tem foto" sem asserção — **Minor**

A linha da tabela de edge cases da spec ("Placa com as vagas vazias") não tem teste. O mais
próximo, `ProductCardSurface.test.tsx:357`, deixa **uma** das três com foto. O comportamento está
certo por construção — `colorPreview` (`variantSelection.ts:220-224`) decide a placa por
`hasSellableGrid` + contagem de valores do eixo, e **nunca** olha `imageUrl` —, mas por
evidência-ou-zero a linha conta como não coberta.
→ Fix: um caso `comCor(['Prata','Ouro'], [null, null])` asserindo que a placa existe, tem 2 vagas e
zero `<img>`.

### G3 · `COR-04` meia-coberta: "corrige" sim, "mesmas URLs na re-execução" não — **Minor**

A metade arriscada (correção do vínculo mudado) tem asserção direta em `products.test.ts:430`. A
outra metade — "rodar duas vezes não pode divergir de rodar uma" — não tem teste de segunda
execução. `writeVariantImages` é pura e não lê estado anterior, então a idempotência é verdadeira
por construção; mas `writeProducts`, que **tem** esse teste (`products.test.ts:178`), mostra que a
convenção do repositório é medi-la.
→ Fix: chamar `writeVariantImages` duas vezes com o mesmo mapa e asserir que as duas rodadas
produzem a mesma lista de `[nuvemshop_id, url]`.

---

## Requirement Traceability Update

| Requisito | Status |
| --- | --- |
| `COR-01` · `COR-02` · `COR-03` · `COR-05` | ✅ Verified |
| `COR-04` | ✅ Verified (correção) · ⚠️ idempotência não medida (G3) |
| `COR-06` · `COR-07` · `COR-08` | ✅ Verified |
| `COR-09` · `COR-10` · `COR-11` | ✅ Verified |
| `COR-12` | ✅ Verified como escrita · ⚠️ **spec-precision gap** (G1) |
| `COR-13` · `COR-14` · `COR-15` | ✅ Verified |

---

## Summary

**Overall**: ✅ **Ready** — com uma decisão de spec pendente (G1).

**Spec-anchored check**: 15/15 ACs com `file:line` e valor batendo com a spec · 1 spec-precision gap (`COR-12`)
**Sensor**: 8/8 mutantes mortos
**Gate**: store 1597 · catalog-import 299 · core 1090 · backoffice 1387+1 pré-existente · tipos 0/0 · lint 30/8 (baseline) · `payment/` intocado

**O que funciona**: o importador resolve `variants[].image_id` → URL do Storage e o faz por id (duas
variações do mesmo produto recebendo fotos diferentes está asserido, não suposto); os dois caminhos
de `COR-02` têm asserção separada, com negação explícita contra a capa; tag sobrescreve no update,
com asserção própria; o card tem as duas metades de `COR-12` em asserção positiva sobre a classe
`md:` literal; zero `<img>` sem `src`, com âncora de contagem.

**Problemas**: G1 (spec `COR-12` × largura real do card em 768/1024) · G2 (edge case sem foto
nenhuma) · G3 (idempotência de `writeVariantImages` não medida). Fora do escopo desta feature, mas
confirmados: o `position: relative` do `+` e do favorito (pré-existente, loja inteira) e a falha do
`storeOrigin.test.ts` (feature 25).

**Next steps**: decidir G1 (ponto de corte das 4 vagas) antes de consertar o achado A — os dois se
encontram na mesma tela. G2 e G3 são dois testes curtos.
