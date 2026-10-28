# 85 — O Resumo com as imagens do produto · Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Commits**: NÃO criar commit por task. Vale a regra do projeto (`CLAUDE.md`, *Commits*) e a
> preferência do usuário: commit só quando ele pedir. "Gate passa" substitui "commit atômico" como
> marco de fim de task.

---

**Design**: `.specs/features/85-resumo-com-imagens-do-produto/design.md`
**Status**: Done (2026-10-28) — T01–T14, Verifier r2 PASS, QA, reteste e prova do adendo — Verifier r2 PASS, QA e reteste feitos; ver `validation.md` e `docs/qa/reports/`

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found:
> `CLAUDE.md` (raiz: baselines, guardas, "mobile primeiro", jsdom mede 0), `apps/backoffice/CLAUDE.md`,
> `apps/backoffice/vitest.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`model/*.ts`) | unit | todos os ramos; 1:1 com as ACs; limites cravados com o número da spec (7, 8, 48) além da constante | `features/product-form/model/**/*.test.ts` | `pnpm --filter @estrelinha/backoffice exec vitest run <arq> --testTimeout=20000` |
| Hook (`useProductImageUpload`) | unit (renderHook, motor dublado) | sucesso, falha parcial, lote vazio, dois lotes concorrentes, ordem no fim | `features/product-form/model/*.test.ts` | idem |
| Componente de UI | component (RTL) | toda AC da story + edge cases; token exato de classe para medida (jsdom mede 0) | `features/product-form/ui/*.test.tsx` | idem |
| Página (fiação) | component pela **página real** | cada fio: Resumo↔modal, Resumo↔zoom, checklist↔modal, sem aba Mídia, sem Prévia, ordem dos cards, salvar bloqueado no envio | `pages/admin/AdminProductFormPage*.test.tsx` | idem |
| Layout real (390/1024/1440) | prova em navegador | foto acima da dobra em 390, zero rolagem horizontal, 72px medidos, modal em tela cheia em 390 | `prova-navegador.md` | Playwright contra o dev server local |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | task com teste de unidade/componente | `pnpm --filter @estrelinha/backoffice exec vitest run <arquivos da task> --testTimeout=20000` |
| Full | fim de fase | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` **e** `pnpm --filter @estrelinha/store test --testTimeout=20000` (os guardas da loja varrem o painel) — exit code fora de pipe |
| Build | fim da feature | Full + `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (0) + `cd apps/backoffice && npx eslint .` (≤ 23/5) + `pnpm --filter @estrelinha/backoffice build` |

---

## Execution Plan

### Phase 1: Regra e dono do envio
```
T01 → T02 → T03 → T04
```
### Phase 2: Componentes
```
T05 → T06 → T07 → T08
```
### Phase 3: Integração e prova
```
T09 → T10 → T11 → T12
```

---

## Task Breakdown

### T01: Recorte do Resumo (`mediaSummary.ts`)
**What**: `SUMMARY_THUMB_LIMIT = 7`, `SWIPE_PX = 48` e `summaryThumbs(images)` ⇒ `{ main, thumbs, rest }` (`rest = max(0, n − 8)`).
**Where**: `apps/backoffice/src/features/product-form/model/mediaSummary.ts` (+ `.test.ts`)
**Depends on**: None · **Requirement**: RES-03, RES-04, RES-09, ZOM-04
**Done when**:
- [ ] 0, 1, 2, 8, 9 e 28 imagens: principal, número de miniaturas (0/0/1/7/7/7) e `rest` (0/0/0/0/1/20)
- [ ] uma asserção crava `7` e `48` literalmente, além de ler a constante
- [ ] Gate quick passa
**Tests**: unit · **Gate**: quick

### T02: `videoFact`
**What**: `videoFact(form)` ⇒ `'sim' | 'não'`, aparando espaço.
**Where**: `features/product-form/model/summaryFacts.ts` (+ teste existente)
**Depends on**: None · **Requirement**: MOD-05
**Done when**: [ ] vazio, só espaço, URL ⇒ não/não/sim · [ ] Gate quick
**Tests**: unit · **Gate**: quick

### T03: `useProductImageUpload`
**What**: o dono único do envio, extraído do `handleFiles` do `ImageGallery` (design, Abordagem A).
**Where**: `features/product-form/model/useProductImageUpload.ts` (+ `.test.ts`)
**Depends on**: None · **Reuses**: `uploadProductImages`, `uploadFailureMessage` · **Requirement**: ADI-03, ADI-04, ADI-05, ADI-06
**Done when**:
- [ ] `onUploaded` recebe só as URLs enviadas, na ordem; lote parcial ⇒ um toast por falha e os outros seguem
- [ ] `progress` por arquivo; dois lotes concorrentes ⇒ `uploading` só volta a `false` no fim do **último** (o caso com o primeiro lote terminando antes)
- [ ] `onUploadingChange` chamado com `true`/`false` nas bordas
- [ ] lista vazia não chama o motor
- [ ] Gate quick
**Tests**: unit · **Gate**: quick

### T04: Checklist sem aba Mídia
**What**: `TabId`/`TAB_IDS` sem `'midia'`; o item `image` com `tab: null` (`ChecklistItem.tab: TabId | null`).
**Where**: `model/validateProduct.ts`, `model/checklist.ts`, `checklist.test.ts`, `ui/PublishChecklist.test.tsx`
**Depends on**: None · **Requirement**: MOD-01, MOD-06
**Done when**: [ ] `tsc` do painel 0 · [ ] teste do checklist assere `tab: null` no item `image` e nenhum item com `'midia'` · [ ] Gate quick
**Tests**: unit · **Gate**: quick

### T05: `ImageGallery` sem estado de envio
**What**: recebe `upload`, `progress` e `uploading` por prop; perde o `useState` de envio e o `onUploadingChange`. Ordenar, remover, alt, Gerar, selo e colar ficam iguais.
**Where**: `ui/ImageGallery.tsx`, `ui/ImageGallery.test.tsx`
**Depends on**: T03 · **Requirement**: MOD-02, ADI-06
**Done when**:
- [ ] os casos que existem passam **sem asserção afrouxada** (só a montagem muda, com o hook real e o motor dublado)
- [ ] arrastar, colar e escolher arquivo chamam o `upload` recebido
- [ ] Gate quick
**Tests**: component · **Gate**: quick

### T06: `ImageLightbox`
**Where**: `ui/ImageLightbox.tsx` (+ `.test.tsx`) · **Depends on**: T01 · **Requirement**: ZOM-02..06, edge "imagem removida"
**Done when**:
- [ ] abre no índice dado; contador `n / N`; alt ou nada
- [ ] `→`/`←`, "Próxima"/"Anterior" e laço nos dois sentidos; com 1 imagem, sem setas
- [ ] gesto: 49px troca, 47px não troca (o limite da spec, 48)
- [ ] `Esc`, Fechar e o fundo fecham; o foco volta ao botão que abriu (pela composição real com um botão de origem)
- [ ] setas e Fechar com `h-11 w-11` ou maior (token exato)
- [ ] `index >= images.length` ⇒ chama `onClose`
- [ ] Gate quick
**Tests**: component · **Gate**: quick

### T07: `ProductMediaSummary`
**Where**: `ui/ProductMediaSummary.tsx` (+ `.test.tsx`) · **Depends on**: T01, T03 · **Reuses**: `renditionUrl`, `renditionSrcSet`
**Requirement**: RES-03, RES-04, RES-05, RES-09, ZOM-01, ADI-01, ADI-02, ADI-03
**Done when**:
- [ ] principal com `alt` (ou `Imagem 1`), `srcset` de rendição, botão "Ampliar imagem 1 de N"
- [ ] 2..8 imagens ⇒ n−1 miniaturas; 9+ ⇒ 7 miniaturas + "+N" ("Ver mais N imagens") que pede o índice 8; miniaturas com `h-[72px] w-[72px]` e `src` de rendição de 144
- [ ] vazio: "Nenhuma imagem ainda" e o controle de adicionar
- [ ] "Adicionar" abre o `<input type=file multiple accept=image/…>`; escolher chama `upload`
- [ ] soltar arquivo no card chama `upload`; `dragover` com `Files` mostra "Solte para enviar"; soltar **texto** não chama nada
- [ ] `progress` desenha uma linha por arquivo
- [ ] "Editar mídia · N sem descrição" conta os alt vazios; sem faltantes, só "Editar mídia"
- [ ] `onError` de miniatura ⇒ fundo com o número, o ladrilho continua lá
- [ ] Gate quick
**Tests**: component · **Gate**: quick

### T08: `ProductMediaDialog`
**Where**: `ui/ProductMediaDialog.tsx` (+ `.test.tsx`) · **Depends on**: T05 · **Requirement**: MOD-02, MOD-04, MOD-07
**Done when**:
- [ ] título "Mídia", galeria, campo "Vídeo (URL YouTube/Vimeo)" ligado a `video_url`, "Concluir"
- [ ] fechar (Concluir, `Esc`, X) não desfaz mudança nenhuma (não há Cancelar)
- [ ] em < lg a classe de tela cheia está presente (token exato)
- [ ] Gate quick
**Tests**: component · **Gate**: quick

### T09: Fiação na página
**What**: tirar a aba Mídia e o card Prévia; Resumo com `ProductMediaSummary` no topo do card; áreas de grade; modal, zoom e checklist ligados; `uploading` = galeria ‖ variação.
**Where**: `pages/admin/AdminProductFormPage.tsx`, `AdminProductFormPage.test.tsx`, `AdminProductFormPage.variacoes.test.tsx`
**Depends on**: T02, T04, T06, T07, T08 · **Requirement**: RES-01, RES-02, RES-06, RES-07, RES-08, MOD-01, MOD-03, MOD-05, MOD-06, ADI-03
**Done when** (todos pela **página real**, `L-teste-nao-monta-a-arvore`):
- [ ] as abas são Geral · Perguntas · Preços & variações · SEO · Relacionados (o caso antigo de 6 abas reescrito, não apagado)
- [ ] a ordem dos títulos na coluna é Publicação → Resumo → Pronto para publicar → Fornecedor (reescreve `:181`), e "Prévia na loja" não existe
- [ ] o Resumo aparece **uma vez**, e no DOM antes do `tablist`
- [ ] "Abrir na loja ↗" no Resumo com o `href` de `storeUrlFor`
- [ ] clicar na 3ª miniatura abre o zoom em "3 / N"
- [ ] "Editar mídia" abre o modal; remover a principal lá ⇒ o Resumo mostra a seguinte sem fechar; marca "Alterações não salvas"
- [ ] remover no modal a foto apontada por variação limpa a variação (`clearMissingVariantImages`, pelo caminho do modal)
- [ ] vídeo digitado no modal ⇒ "Vídeo · sim"
- [ ] produto sem imagem: clicar "Ao menos uma imagem" no checklist abre o modal
- [ ] envio no ar pelo Resumo ⇒ salvar desabilitado; envio da variação no ar + galeria terminando ⇒ continua desabilitado
- [ ] `variacoes.test.tsx` chega à galeria pelo "Editar mídia" (asserção da foto intocada)
- [ ] Gate Full
**Tests**: component (página) · **Gate**: full

### T10: Limpeza e guardas
**What**: apagar `StorefrontPreview.tsx` e o teste dele (sem consumidor); pôr os 3 arquivos de UI novos no escopo de `animacaoRespeitaMovimento.test.ts`, com as âncoras subindo junto; `apps/backoffice/CLAUDE.md` (a coluna lateral e o modal Mídia).
**Depends on**: T09 · **Requirement**: RES-02
**Done when**: [ ] `grep -r StorefrontPreview apps/` vazio · [ ] o guarda com as âncoras novas passa e reprova com um `transition-` sem par injetado · [ ] Gate Full
**Tests**: guarda · **Gate**: full

### T11: Gate da feature e baselines
**Depends on**: T10
**Done when**: [ ] Build gate inteiro, exit code fora de pipe · [ ] delta de testes do backoffice e do store medido contra a entrada (medir a entrada **antes** de T01, árvore parada) · [ ] `CLAUDE.md` (raiz): linha *Testes* e o parágrafo da `85`; "A próxima livre é a `86`"
**Tests**: — · **Gate**: build

### T12: Prova em navegador
**What**: dev server local (Supabase :54441, `*.supabase.co` bloqueado), produto com 6 e com ≥ 9 fotos, em 390×844, 1024 e 1440.
**Where**: `.specs/features/85-resumo-com-imagens-do-produto/prova-navegador.md`
**Depends on**: T11 · **Requirement**: Success Criteria 1 e 3, RES-04 (72px medidos), RES-06, MOD-07, ZOM-06
**Done when**:
- [ ] 390: `hero.bottom ≤ 844` sem rolar; `scrollWidth == 390` com e sem modal
- [ ] miniaturas medem 72×72 (`getBoundingClientRect`)
- [ ] envio real de um PNG pelo Resumo (arrastar e escolher), a foto aparecendo como miniatura; **não salvar** o produto
- [ ] zoom: teclado, setas, Esc e foco de volta
- [ ] defeito achado ⇒ teste vermelho antes do conserto
**Tests**: navegador · **Gate**: —

---

## Pre-approval checks

**Granularity**: cada task é um arquivo ou um componente com o teste dele; T09 é a única de fiação e não se divide sem quebrar a página no meio. ✅

**Diagram ↔ Depends on**

| Task | Depends on | Fase anterior/na ordem? |
| --- | --- | --- |
| T01–T04 | — | ✅ |
| T05 | T03 | ✅ |
| T06 | T01 | ✅ |
| T07 | T01, T03 | ✅ |
| T08 | T05 | ✅ |
| T09 | T02, T04, T06, T07, T08 | ✅ |
| T10 | T09 | ✅ |
| T11 | T10 | ✅ |
| T12 | T11 | ✅ |

**Test co-location**

| Task | Camada | Matriz pede | Task tem | |
| --- | --- | --- | --- | --- |
| T01, T02, T04 | regra pura | unit | unit | ✅ |
| T03 | hook | unit | unit | ✅ |
| T05–T08 | UI | component | component | ✅ |
| T09 | página | component pela página real | idem | ✅ |
| T10 | guarda/doc | guarda | guarda | ✅ |
| T12 | layout | navegador | navegador | ✅ |

**Depois de T12**: Verifier independente (automático), depois QA (`qa-report` → `qa-execution`), consertos e reteste.

---

## Adendo (2026-10-28): ordem pelo teclado

### T13: botões de ordem no modal Mídia
**What**: em `ui/ImageGallery.tsx`, por foto: "←", "Tornar principal", "→" (MOD-08), foco que segue a foto e anúncio em região viva (MOD-09), e 2 colunas em 390 (MOD-10). Arrastar continua igual.
**Where**: `ui/ImageGallery.tsx`, `ui/ImageGallery.test.tsx`, `pages/admin/AdminProductFormPage.midia.test.tsx`
**Depends on**: T12 · **Requirement**: MOD-08, MOD-09, MOD-10
**Done when**:
- [x] testes 1:1 com as ACs, inclusive limites (1ª e última), `alt`/`source` viajando, foco na posição nova, texto do anúncio, e token exato da grade em 2 colunas
- [x] pela página real: "Tornar principal" na 4ª foto ⇒ o Resumo mostra a nova principal e "Alterações não salvas"
- [x] mutantes nos três botões e no foco mortos por asserção
- [x] Gate Full + tsc + eslint
**Tests**: component · **Gate**: full

### T14: prova em navegador do adendo
**Depends on**: T13 · 390 e 1440, produto de 28 fotos: altura da lista do modal (antes 13.208px), alvos ≥ 44, só teclado (Tab, Enter) movendo uma foto até a principal, foco e anúncio. Não salvar produtos reais.
