# Estabilidade da home — Tasks

**Commits:** um commit só, no fim (convenção do projeto, `BL-012` — sobrepõe o commit atômico por
tarefa da Skill). O gate por tarefa continua sendo o teste passando.

**Ordem:** T01 é independente; T02 → T03 têm dependência; T04, T05, T06 são independentes entre si.

---

## T01 — A árvore de categorias passa a ter um dono

**Requisitos:** PRF-20 (1, 2, 3, 4, 5)

- Extrair de `entities/category/api/useCategories.ts` uma **fábrica de opções de query**
  (`categoriesQueryOptions()`) com `queryKey: ['categories']` e o `queryFn` de hoje.
- `useCategories()` passa a consumi-la — comportamento idêntico, mesma chave.
- `entities/product/api/useProducts.ts`: trocar o `from('categories').select('id, parent_id, slug')`
  de dentro do `queryFn` por `queryClient.fetchQuery(categoriesQueryOptions())`, com o
  `queryClient` vindo de `useQueryClient()` no corpo do hook.
- O ramo `if (!self) return []` (`URL-04`) permanece intacto.

**Done when**
- Quatro `useProducts` distintos em paralelo produzem **uma** chamada a `categories`.
- `useProducts` com slug inexistente ainda devolve `[]`.
- Guarda novo: nenhum arquivo de `apps/store/**` fora de `useCategories.ts` faz
  `from('categories')` com `parent_id` no select. **Âncora de contagem** obrigatória.

---

## T02 — O esqueleto do card ganha guarda de paridade de caixa

**Requisitos:** PRF-17 (3, 4)

**CORREÇÃO DE ESCOPO (2026-09-06).** `entities/product/ui/ProductCardSkeleton.tsx` **já existe** —
a `CategoryPage` o usa desde a feature `32`, e ele já está medido em **431px** contra o card, já é
`aria-hidden`, e já reusa `aspect-[4/5]`, `mt-4`, `gap-[5px]` e `min-h-[40px]`. Criar um segundo
seria o "defeito 01" na cara. **Esta tarefa deixa de ser "criar" e passa a ser "guardar".**

O que sobra é a lacuna que o próprio `apps/store/CLAUDE.md` declara por escrito:

> As medidas são uma segunda escrita das do `ProductCard` e **nenhum teste de componente pega a
> divergência**: jsdom devolve 0 para toda medida de layout.

Um teste de componente não pega. Um guarda que lê **os dois arquivos do disco** e compara as classes
de caixa, pega — não a altura em pixels (que jsdom não sabe), mas a **âncora estrutural** de que as
duas caixas declaram as mesmas classes.

**Done when**
- Guarda `cardSkeletonBox.test.ts` lê os dois arquivos e falha se qualquer uma das quatro classes de
  caixa existir num e não no outro. **Âncora dupla**: os dois arquivos achados **e** as quatro
  classes casadas.
- **Sensor**: remover `min-h-[40px]` de um dos lados reprova o guarda.

---

## T03 — A fileira reserva a altura enquanto carrega

**Requisitos:** PRF-17 (1, 2)
**Depende de:** T02

- `ProductCarousel` ganha `loading?: boolean` e `skeletonCount?: number`.
- A guarda de saída passa a ser `if (products.length === 0 && !loading) return null` — coleção
  vazia **resolvida** continua sumindo.
- Carregando, a grade desenha `skeletonCount` esqueletos nas mesmas vagas
  (`min-w-[220px] max-w-[220px] snap-start md:min-w-0 md:max-w-none`).
- `HomeCollectionRow` passa `loading={isPending}` e `skeletonCount={vagas}`.

**Done when**
- Carregando: a seção, o título e N esqueletos aparecem.
- Resolvido e vazio: `null`.
- Resolvido com produtos: nenhum esqueleto.
- Os testes existentes de `ProductCarousel` e `HomeCollectionRow` continuam passando.

---

## T04 — O hero não nasce invisível

**Requisitos:** PRF-19 (1, 2, 3)

- `widgets/hero-banner/ui/HeroBanner.tsx`: o variant `item` perde `opacity` das duas pontas —
  `hidden: { y: 20 }`, `show: { y: 0, transition: ... }`. O deslize continua.
- Conferir os demais `motion.*` do arquivo pela mesma régua.

**Done when**
- Guarda `heroSemOpacidadeZero.test.ts` lê `HeroBanner.tsx` do disco e falha se `opacity: 0`
  (ou `opacity:0`) aparecer num variant de entrada. **Âncora**: o arquivo tem de ser lido e os
  variants encontrados.
- **Sensor**: reintroduzir `opacity: 0` reprova o guarda.

---

## T05 — A bolha do WhatsApp não muda a caixa do contêiner

**Requisitos:** PRF-18

- Contêiner fixo ganha `relative`; o botão-teaser sai do fluxo com
  `absolute bottom-full right-0 mb-3`.
- O painel `open` fica como está — abre depois de gesto, e o CLS ignora 500 ms após entrada.

**Done when**
- Teste de componente: com o teaser visível, o teaser declara `absolute` e `bottom-full`.
- O contêiner declara `relative`.

---

## T06 — O verde do teaser passa na régua, e um guarda impede a volta

**Requisitos:** A11Y-01, A11Y-02

- `WhatsAppFloat.tsx:121`: `text-[hsl(142_70%_38%)]` → `text-[hsl(142_71%_30%)]` (4,88:1).
- Guarda novo `arbitraryTextColor.test.ts`:
  - varre `apps/store/src/**` por `text-[hsl(...)]`, `text-[#...]`, `text-[rgb(...)]`;
  - allowlist de **um** valor: `hsl(142_71%_30%)`, com a razão medida no comentário;
  - calcula a razão contra `#ffffff` e exige ≥ 4,5:1;
  - **âncora de contagem**: zero arquivo varrido reprova.

**Done when**
- O guarda passa com o valor novo e **reprova** com o antigo (sensor por mutação).
- `contrast.test.ts` continua passando sem alteração.

---

## Gate final

1. `pnpm --filter @estrelinha/store test` — **um workspace por vez**, exit code capturado fora de
   pipe.
2. `pnpm --filter @estrelinha/backoffice test` (T01 toca `entities/category`, compartilhado? — não,
   mas remedir por segurança).
3. `npx tsc --noEmit -p apps/store/tsconfig.app.json` → 0.
4. `pnpm lint` → 27/5, sem regressão.
5. `git diff --name-only` prova `packages/core/src/payment/**` intocado.
6. Verifier independente → `validation.md`.
7. Baselines em `CLAUDE.md` (raiz) e `apps/store/CLAUDE.md` atualizadas.
