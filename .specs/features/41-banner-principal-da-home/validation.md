# Banner principal da Home — Validation

**Date**: 2026-09-06
**Spec**: `.specs/features/41-banner-principal-da-home/spec.md` (52 ACs, `BNR-01`..`BNR-52`)
**Diff range**: `f1e973d..3d7e23a` (branch `feat/41-banner-principal-da-home`, commit único)
**Verifier**: sub-agente independente — **o autor NÃO é o verificador**. A cobertura foi re-derivada
do zero, com a régua **evidência-ou-zero**: AC sem `arquivo:linha` + expressão de asserção conta
como **não coberta**, e asserção que existe mas não mede o desfecho da spec conta como **lacuna**.

> **Veredito: ❌ FAIL.** A feature entrega o carrossel inteiro — regra, migration, widget, hook,
> editor e guardas — com qualidade acima da média do repositório. O que a derruba é a **outra metade
> da P1-E**: a `AD-029` foi aplicada só no banco. **O painel continua recusando desligar a Chamada
> principal**, com um teste vivo asserindo a recusa. `BNR-40` e `BNR-41` reprovam, e com eles o
> objetivo declarado da história ("o Banner principal poder ocupar o topo da Home").

---

## Sumário

| Eixo | Resultado |
| --- | --- |
| **Spec-anchored check** | **41/52 ✅** · **4 ❌ GAP** · **7 ⚠️ spec-precision / evidência ausente** |
| **Gate** | 7307 testes em 388 arquivos — **todos os 5 workspaces passam**; as reprovações do lote são a flake de 5 s conhecida, provada isolada |
| **Sensor de discriminação** | **21 mutações · 17 mortas · 4 sobreviventes** |
| **Lint / tipos / build** | 27 erros · 5 warnings (baseline) · tipos 0·0 · `pnpm build` verde |
| **`packages/core/src/payment/**`** | **0 arquivos alterados** (`git diff --name-only`) |

---

## 1 · Gate — medido, um workspace por vez, exit code fora de pipe

| Workspace | Comando | Testes / arquivos | Exit | Baseline declarada | Confere? |
| --- | --- | --- | --- | --- | --- |
| core | `pnpm --filter @estrelinha/core test` | **1811 / 70** | **0** | 1811/70 | ✅ |
| store | `pnpm --filter @estrelinha/store test` | **2634 / 169** | 1 ⚠️ | 2634/169 | ✅ (contagem) |
| backoffice | `pnpm --filter @estrelinha/backoffice test` | **1980 / 119** | 1 ⚠️ | 1980/119 | ✅ (contagem) |
| functions | `pnpm --filter @estrelinha/functions test` | **370 / 7** | **0** | 370/7 | ✅ |
| catalog-import | `pnpm --filter @estrelinha/catalog-import test` | **512 / 23** | **0** | 512/23 | ✅ |
| **Total** | | **7307 / 388** | | 7307/388 | ✅ |

**As contagens declaradas pelo autor estão CERTAS** — as cinco conferem no HEAD da branch. Foi
medido de propósito, porque a baseline deste projeto já saiu errada duas vezes.

⚠️ **As duas reprovações são a flake de carga, não defeito** — e as duas foram provadas:

| Reprovação | Sintoma | Isolada |
| --- | --- | --- |
| store `homeComposition.test.ts` › "nada no app importa os dois módulos" | `Test timed out in 5000ms` num teste que varre disco | **passa** (`vitest run` do arquivo: 2 arquivos, exit 0) |
| backoffice `AdminProductsPage` (2) · `AdminQuickGridPage` (1) · `AdminLayout` (2) | idem, 5 casos | **passam** (`vitest run` dos 3 arquivos: exit 0) |

A segunda leva do backoffice foi induzida por mim: rodei `tsc` em paralelo na primeira execução. A
re-execução isolada do workspace ainda reprovou 5 casos — os mesmos —, e os três arquivos passam
sozinhos. É exatamente a flake que o `CLAUDE.md` descreve e que motiva o `--concurrency=1` no CI.

**Outros gates:**

- `npx tsc --noEmit -p apps/store/tsconfig.app.json` → **exit 0**
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` → **exit 0**
- `pnpm lint` → **29 problemas no backoffice (25 erros, 4 warnings) + 3 na loja (2 erros, 1 warning)**
  = **27 erros / 5 warnings**, idêntico à baseline. Nenhum erro novo.
- `pnpm build` → **exit 0**, 2 tasks
- `git diff --name-only f1e973d..3d7e23a -- packages/core/src/payment/` → **vazio**

---

## 2 · Checagem ancorada na spec

Regra de leitura: **PASS** só quando a asserção mede o desfecho que a spec define. "Existe teste"
não é evidência; a expressão está reproduzida em cada linha.

### P1-A — O bloco existe e entra na Home

| AC | Desfecho definido pela spec | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| **BNR-01** | bandeja oferece "Banner principal", **sem** "em breve" | `apps/backoffice/…/HomeBlockTray.test.tsx:132` — `expect(bloco).toHaveTextContent('Banner principal')` + `:133` `expect(bloco).not.toHaveTextContent('em breve')` + `:134` `expect(bloco).not.toBeDisabled()`; e `packages/core/…/catalog.test.ts:170` — `expect(sectionMeta('hero_carousel')!.comingSoon).toBe(false)` | ✅ PASS |
| **BNR-02** | seção nova nasce `active = false` | `apps/backoffice/…/useAdminHomeSections.ts:130` — `.insert({ type, position, active: false, config: {} })`. Teste: `HomeBlockTray.test.tsx:139` — `expect(screen.getByText(/nasce desligada/)).toBeInTheDocument()` — **mede a FRASE na tela, não o payload**, e é genérico ao tipo | ⚠️ Evidência indireta |
| **BNR-03** | tipo repetível, fora de `UNIQUE_SECTION_TYPES` | `packages/core/…/catalog.test.ts:99` — `expect(UNIQUE_SECTION_TYPES).not.toContain('hero_carousel')` + `:100` `expect(sectionMeta('hero_carousel')!.unique).toBe(false)`; e `resolve.test.ts:365` — duas seções `hero_carousel` resolvem: `expect(resolvidas.filter(r => r.renders)).toHaveLength(2)` | ✅ PASS |
| **BNR-04** | aceita em **qualquer** posição, **inclusive acima da Chamada principal** | — **nenhuma asserção**. `HomeSectionList.test.tsx:219` prova arrasto genérico (`newsletter` → `hero`), mas nada exercita `hero_carousel`, e a segunda metade ("acima do hero") é inseparável de `BNR-40`: hoje a Home não pode ficar sem o hero, então "acima dele" nunca é "no topo" | ❌ GAP |
| **BNR-05** | teto de 30 recusa por `sectionCapRefusal` | `HomeBlockTray.test.tsx:90` — bloco `o teto de 30`, régua genérica do catálogo; nada nomeia `hero_carousel` | ⚠️ Coberto genericamente |
| **BNR-06** | catálogo TS == `check` da migration, com âncora de contagem | `apps/store/…/homeSections.test.ts:171` — `expect(TIPOS_DO_CHECK).toHaveLength(11)`; `:234` — `expect([...TIPOS_DO_CHECK].sort()).toEqual([...HOME_SECTION_TYPES].sort())`; **bidirecional** em `:237` e `:242`. `catalog.test.ts:37` — `expect(HOME_SECTION_TYPES).toHaveLength(11)` | ✅ PASS |

### P1-B — Arte por dispositivo, descrição e destino

| AC | Desfecho definido pela spec | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| **BNR-07** | quatro campos por slide | `HeroCarouselEditor.test.tsx:146` — `expect(screen.getByLabelText('Arte do computador do 1º banner')).toBeInTheDocument()` + `:147` a do celular + `:158-159` `getByLabelText('Descrição da imagem')` e `getByLabelText('Leva para · 1º banner')` | ✅ PASS |
| **BNR-08** | três modos, **no máximo um** gravado | `packages/core/…/carousel.test.ts:199` — `expect(heroCarouselSlidesRefusal([slide({ product_id: 'p-1' })])).toBe('1º banner: Escolha um destino só: uma coleção, um produto ou um caminho da loja.')`. A tela: `DestinoDoItem.tsx:76,80` grava `{category_id, product_id: null, href: null}` — **sem teste no contexto do carrossel** (o de `BannerGridEditor.test.tsx` cobre a grade) | ⚠️ PASS parcial |
| **BNR-09** | `label_snapshot` congelado na escolha | `DestinoDoItem.tsx:76` — `onChange({ category_id: id, …, label_snapshot: alvo?.name ?? null })`; consumo provado em `HeroCarouselEditor.test.tsx:394` — `expect(screen.getByTestId('slide-perdido-0')).toHaveTextContent('“Prata 925” foi apagado.')`. **Nenhum teste assere a ESCRITA do snapshot pelo editor do carrossel** | ⚠️ PASS parcial |
| **BNR-10** | recusa `«Nº banner: envie a arte. Sem imagem não há banner.»` | `carousel.test.ts:164` — `expect(heroCarouselSlidesRefusal([slide({image_url:null,image_mobile_url:null})])).toBe('1º banner: envie a arte. Sem imagem não há banner.')` — **frase exata da spec**; espaço em branco em `:170`; caminho de gravação em `HeroCarouselEditor.test.tsx:204` | ✅ PASS |
| **BNR-11** | recusa própria por falta de `alt` | `carousel.test.ts:176` — `expect(motivo).toContain('1º banner: descreva a arte.')` + `:178` `expect(motivo).toContain('leitor de tela')`; gravação recusada em `HeroCarouselEditor.test.tsx:212` — `expect(onSave).not.toHaveBeenCalled()` | ✅ PASS |
| **BNR-12** | recusa pela régua existente, **sem segunda redação** | `carousel.test.ts:186` — `expect(heroCarouselSlidesRefusal([slide({category_id:null})])).toBe('1º banner: Escolha o destino: uma coleção, um produto ou um caminho da loja.')`; e `carousel.ts:125` — `const motivo = destinationRefusal(item)` | ✅ PASS |
| **BNR-13** | teto de 6, **recusa por motivo**, nunca botão apagado | `carousel.test.ts:235` — `expect(motivo).toContain('Cabem 6 banners')` + `:240` `expect(motivo).toContain('segundo bloco')`; `HeroCarouselEditor.test.tsx:240` — `expect(screen.getByTestId('acrescentar-slide')).not.toBeDisabled()` | ✅ PASS |
| **BNR-14** | avisa e **grava assim mesmo** | `HeroCarouselEditor.test.tsx:342` — `expect(screen.getByTestId('recado-image_url-0')).toHaveTextContent('1440 × 540 px')` + `:347` `expect(gravado().items[0].image_url).toBe('https://cdn/torta.webp')` | ✅ PASS |
| **BNR-15** | falha preserva o rascunho | `HeroCarouselEditor.test.tsx:371` — `expect(gravado().items[0].image_url).toBe('https://cdn/arte-computador.webp')` (a anterior sobrevive) + `:388` `expect(screen.getByLabelText('Descrição da imagem')).toHaveValue('texto que a dona digitou')` | ✅ PASS |
| **BNR-16** | ordem da lista vira `position` | `HeroCarouselEditor.test.tsx:190` — `expect(gravado().items.map(i => i.alt)).toEqual(['primeiro','segundo'])`; e `applyDraft.test.ts:132` | ✅ PASS |

### P1-C — A loja desenha o carrossel

| AC | Desfecho definido pela spec | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| **BNR-17** | renderiza na posição da seção | `sectionRenderers.tsx:67` — `hero_carousel: ({section,items}) => items.length ? <HeroCarousel …/> : null`. Teste da fiação: nenhum caso específico do tipo; a composição é provada por `resolve.test.ts:294` | ⚠️ Coberto por vizinhança |
| **BNR-18** | `full` sem container, **sem rolagem horizontal no `body`** | `HeroCarousel.test.tsx:56` — `expect(faixa.className).not.toContain('container')`; `:64` — `expect(…className).not.toContain('w-screen')`. **A ausência de rolagem horizontal NÃO é medida** — jsdom devolve 0 para layout; é proxy de forma, declarado | ⚠️ Proxy (declarado) |
| **BNR-19** | `wide` no container, com raio | `HeroCarousel.test.tsx:71` — `expect(faixa.className).toContain('container')` + `:73` `expect(within(faixa).getByRole('region').className).toContain('rounded-lg')` | ✅ PASS |
| **BNR-20** | ausente ⇒ `full` | `HeroCarousel.test.tsx:78` — `expect(…dataset.largura).toBe('full')`; `carousel.test.ts:80-92` — `heroCarouselWidth({})`, `null`, `undefined`, `'gigante'`, `''` **todos** `.toBe('full')` | ✅ PASS |
| **BNR-21** | arte por dispositivo, **uma só baixada** | `HeroCarousel.test.tsx:98` — `expect(source.getAttribute('media')).toBe('(min-width: 768px)')`; `:99` `srcset` contém `a-d.jpg`; `:100` o `<img>` contém `a-m.jpg`. O "uma só" é propriedade do `<picture>`, não medida | ✅ PASS |
| **BNR-22** | herança com **um dono** em `core`, chamado por loja **e** painel | `packages/core/…/carousel.test.ts:125` — `expect(heroSlideArt(item,surface)).toEqual(surfaceArt(item.image_url,item.image_mobile_url,surface))` sobre 4 itens × 2 superfícies; guarda `surfaceArtSingleOwner.test.ts:190` — `expect(foraDoDono.map(…)).toEqual([])`, com âncora dupla (`:164` `producao.length > 300`, `:172` a régua acha o sintético) | ✅ PASS (com furo de régua — ver §3) |
| **BNR-23** | rendição pelo dono único | `HeroCarousel.test.tsx:124-126` — `expect(src).toContain('render/image')`, `toContain('width=780')`, `toContain('resize=contain')`; `:143` arte de fora do Storage sai **inalterada** e sem `srcset` | ✅ PASS |
| **BNR-24** | 1º `eager` + `fetchpriority=high`; os demais `lazy` | `HeroCarousel.test.tsx:159` — `expect(primeiro.getAttribute('loading')).toBe('eager')` + `:160` `.toBe('high')`; `:170-171` os demais `'lazy'` e `fetchpriority` **`toBeNull()`** | ✅ PASS |
| **BNR-25** | 1º slide sem `opacity: 0` **em nenhum ponto do caminho até ele** | `heroCarouselSemOpacidadeZero.test.ts:71` — `expect(nasceInvisivel(fonte)).toBe(false)`, âncora dupla (`:59` `fonte.length > 1000`, `:65-66` `<img>`/`<picture>` presentes). **A régua lê UM arquivo** (`:35` `CARROSSEL = resolve(HERE,'../HeroCarousel.tsx')`) — o "caminho até ele" não é varrido | ⚠️ Escopo menor que a AC (ver §3) |
| **BNR-26** | vaga com altura conhecida | `HeroCarousel.test.tsx:181-186` — o `style` contém `780 / 975` e `1440 / 540`; `:193-194` — `expect(slide.className).toContain('aspect-[var(--vaga-celular)]')` e `'md:aspect-[var(--vaga-computador)]'`. CLS real não medido (declarado) | ✅ PASS (proxy declarado) |
| **BNR-27** | clique navega; **externo abre com `target="_blank"` + `rel`** | `HeroCarousel.test.tsx:205` — `expect(…getAttribute('href')).toBe('/leite-materno')`; `:211-212` cada slide ao seu destino. **Segunda metade não implementada** — `SPEC_DEVIATION` em `HeroCarousel.tsx:32-36`, e a spec a declara como inalcançável na tabela de suposições | ✅ PASS (1ª metade) · ⚠️ desvio declarado |
| **BNR-28** | slide com destino fora do ar é **pulado** | `resolve.test.ts:308` — `expect(r.items.map(i=>i.id)).toEqual(['a'])` + `expect(r.droppedCount).toBe(1)` | ✅ PASS |
| **BNR-29** | seção vazia não renderiza, com motivo | `resolve.test.ts:286` — `expect(r.renders).toBe(false)` + `expect(r.hiddenReason).toBe('Não vai aparecer: nenhum banner enviado.')` — **frase exata da spec** | ✅ PASS |

### P1-D — O carrossel gira, e para quando a cliente pede

| AC | Desfecho definido pela spec | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| **BNR-30** | 2+ slides ⇒ avança a cada **6 s** | `useHeroCarousel.test.ts:61-65` — `advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS)` → `expect(index).toBe(1)` → de novo → `.toBe(2)`; `:78` — `INTERVAL-1` mantém `0`; `carousel.test.ts:60` — `expect(HERO_CAROUSEL_INTERVAL_MS).toBe(6000)` | ✅ PASS |
| **BNR-31** | 1 slide ⇒ estático, sem bolinha/seta/giro | `HeroCarousel.test.tsx:224` — `expect(screen.queryByRole('button')).toBeNull()`; `useHeroCarousel.test.ts:88` — `expect(criar).not.toHaveBeenCalled()` (spy em `setInterval`) | ✅ PASS |
| **BNR-32** | pausa em hover **e em foco**, retoma ao sair | `useHeroCarousel.test.ts:114-120` (hover) e `:126-132` (foco). **As duas asserções de pausa são VÁCUAS** — 3 slides + 3 intervalos volta a 0 sozinho. Mutante sobrevivente #2 e #3 (§3) | ❌ GAP (asserção não discrimina) |
| **BNR-33** | `prefers-reduced-motion` não gira, controles vivos | `useHeroCarousel.test.ts:176` — `expect(result.current.reduced).toBe(true)` + `:178` `advanceTimersByTime(INTERVAL*4)` → `expect(index).toBe(0)` (4 intervalos ≠ múltiplo de 3 ⇒ **discrimina**); `:187-191` `next()`/`prev()` funcionam | ✅ PASS |
| **BNR-34** | bolinhas rotuladas dizendo **qual** banner | `HeroCarousel.test.tsx:243` — `expect(screen.getByRole('button',{name:'Ver o banner 1: Prata 925'})).toBeInTheDocument()`; `:251-252` `aria-current` `'true'`/`'false'` | ✅ PASS |
| **BNR-35** | setas no computador, rotuladas | `HeroCarousel.test.tsx:269-275` — `getByRole('button',{name:'Banner anterior'})`, `'Próximo banner'`, `className` contém `hidden` e `md:flex` | ✅ PASS |
| **BNR-36** | alvo ≥ 44 px pela medida única | `HeroCarousel.test.tsx:304-305` — para **todo** `getAllByRole('button')`: `expect(botao.className).toContain('before:h-11')` e `'before:w-11'` | ✅ PASS |
| **BNR-37** | arrasto troca slide **sem sequestrar a rolagem vertical** | `HeroCarousel.test.tsx:348-350` — `overflow-x-auto`, `snap-x`, `snap-mandatory`; `:367` — não contém `flex-wrap`. **O gesto em si e o não-sequestro não são medidos** — são propriedade do `scroll-snap` nativo, e jsdom não rola | ⚠️ Proxy (declarado) |
| **BNR-38** | `aria-live="polite"`, `aria-roledescription`, "1 de 4" | `HeroCarousel.test.tsx:315` — `expect(regiao.getAttribute('aria-roledescription')).toBe('carrossel')`; `:322-323` — slide `'slide'` e `aria-label` `'2 de 2'`; `:330-331` — `aria-live` `'polite'` e texto `'Banner 1 de 3'`; `:338` acompanha a troca | ✅ PASS |
| **BNR-39** | slide oculto **sai do teclado e do leitor de tela** | — **nenhuma asserção, e nenhuma implementação**. Os 4 slides são `<Link>` sempre focáveis; não há `inert`, `tabIndex={-1}` nem `aria-hidden`. `design.md:261` declara "realizado por construção, e a redação diverge", mas **a propriedade que ele diz continuar provada não é asserida em lugar nenhum**, e não há `SPEC_DEVIATION` no código | ❌ GAP |

### P1-E — A Chamada principal vira opção

| AC | Desfecho definido pela spec | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| **BNR-40** | desligar o hero **é aceito**, e a loja deixa de desenhá-lo | **REPROVA.** `HomeSectionRow.tsx:142` — `const indelevel = section.type === 'hero'`; `:215-219` — no lugar do `<Switch>` sai um `<Lock aria-label="A chamada principal não pode ser desligada" />`. E há **teste vivo asserindo a recusa**: `HomeSectionList.test.tsx:123` — `expect(within(linha('hero')).queryByRole('switch')).toBeNull()` e `:128` `expect(linha('hero')).toHaveTextContent('Sempre no ar')` | ❌ **GAP (AC reprovada)** |
| **BNR-41** | remover o hero **é aceito** | **REPROVA.** `deleteSection` existe em `useAdminHomeSections.ts:169` e é exportado em `:254`, mas **nenhuma tela o consome** — `AdminHomePage.tsx:44-54` não o desestrutura, e a única ocorrência fora do hook é o mock em `AdminHomePage.test.tsx:44`. Não há UI de remoção de seção para tipo nenhum | ❌ **GAP (AC reprovada)** |
| **BNR-42** | recusa ao desligar a última ativa, `23514`, **qualquer tipo** | `homeSections.test.ts:432-434` — `expect(corpoDoGuarda).toMatch(/select\s+count\(\*\)\s+into\s+restantes/)`, `toContain('where active and id <> old.id')`, `not.toContain("'hero'")`; `:441` — `toContain("using errcode = '23514'")` | ✅ PASS (fonte SQL) |
| **BNR-43** | recusa ao remover a última ativa | `homeSections.test.ts:422-424` — `expect(corpoDoGuarda).toContain("tg_op = 'DELETE'")` e `toContain('old.active is not true')`; `:454` — o trigger é `before update or delete` | ✅ PASS (fonte SQL) |
| **BNR-44** | painel mostra o motivo do banco, **sem reescrever** | `useAdminHomeSections.ts:161-167` — `setSectionActive` devolve `writeError` cru, sem redação; `homeSections.test.ts:446` — `expect([...corpoDoGuarda.matchAll(/raise exception/g)]).toHaveLength(1)` (a mensagem tem um dono). **Não há teste do painel exibindo a mensagem do banco** | ⚠️ Evidência indireta |
| **BNR-45** | migration troca o guarda, **idempotente** | `homeSections.test.ts:460-465` — `toContain('drop trigger if exists trg_home_sections_hero_guard …')` e `'drop function if exists public.guard_hero_home_section()'`; `:470-471` — a 41 **não** recria o guarda antigo; `:517+` — toda criação é `or replace`/`trigger` com `drop if exists` do mesmo nome; `:498` — `add column if not exists` | ✅ PASS |
| **BNR-46** | migration **não altera linha semeada** | `homeSections.test.ts:508-511` — `expect(LIMPO_41).not.toMatch(/\binsert\s+into\b/i)`, `not.toMatch(/\bupdate\s+public\./i)`, `not.toMatch(/\bdelete\s+from\b/i)` | ✅ PASS |

### P2 / P3

| AC | Desfecho definido pela spec | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| **BNR-47** | painel avisa qual arte falta, **com o mesmo predicado** | `HeroCarouselEditor.test.tsx:283` — `expect(screen.getByTestId('arte-reaproveitada-image_mobile_url-0')).toHaveTextContent('A loja vai reaproveitar a arte do computador.')`; `:314-318` — o caso `"   "` compara os **dois** vereditos no mesmo teste: `expect(heroSlideArt(item,'mobile')).toEqual({image:'https://cdn/arte-computador.webp',imageReused:true})` | ✅ PASS |
| **BNR-48** | destino apagado é **nomeado** pelo rótulo congelado | `HeroCarouselEditor.test.tsx:394` — `toHaveTextContent('“Prata 925” foi apagado.')`; `:401` — sem `label_snapshot` **não** é chamado de apagado; `carousel.test.ts:192-196` — o motivo contém `'Prata 925'` e `'foi apagado'` | ✅ PASS |
| **BNR-49** | motivo da linha vem de `resolveHomeSections` | `resolve.test.ts:286` — `expect(r.hiddenReason).toBe('Não vai aparecer: nenhum banner enviado.')`; `HomeSectionRow.tsx:146` — `const avisoDeAusencia = section.active && !renders ? hiddenReason : null` (lê o campo, não escreve frase) | ✅ PASS |
| **BNR-50** | avisa quantos **não aparecem** e permite apagá-los | `HeroCarouselEditor.test.tsx:265-268` — `expect(screen.getByTestId('slides-excedentes')).toHaveTextContent('Cabem 6 banners neste bloco, e há 8')` + `:269` `expect(screen.getByTestId('slide-7')).toBeInTheDocument()` (o excedente continua desenhado, logo apagável); `:273` — seis não disparam aviso | ✅ PASS |
| **BNR-51** | prévia é a loja num iframe, **sem segundo desenho** | `previaUnica.test.ts:160` — `expect(infratores.map(…)).toEqual([])` sobre `/snap-x\|snap-mandatory\|scroll-snap\|aria-roledescription=["'{]?carrossel/`; âncora em `:167` (`existsSync(editor)`) e `:177` (`previasEm(UI)).toEqual(['HomeLivePreview.tsx']`); sensor em `:184` | ✅ PASS |
| **BNR-52** | desligar preserva os slides; religar traz de volta | — **nenhuma asserção**. É comportamento herdado do `active` (o `update` manda só `{active}`, `useAdminHomeSections.ts:161`), mas a AC existe justamente para não se perder por acidente no editor novo, e nada a mede | ⚠️ Sem evidência |

**Status**: ❌ **4 GAPs** (`BNR-04`, `BNR-32`, `BNR-39`, `BNR-40`, `BNR-41` — cinco ACs em quatro
lacunas, porque 40 e 41 são a mesma causa) · ⚠️ **7 evidências indiretas ou proxies declarados**.

---

## 3 · Sensor de discriminação — 21 mutações, 17 mortas, 4 sobreviventes

Todas as mutações foram aplicadas na árvore, medidas, e **revertidas por `git checkout --`**. A
árvore terminou limpa (`git status --porcelain` vazio, à parte de um `.specs/features/42-*`
**não relacionado a esta feature e não criado por mim**).

### Mortas (17)

| # | Arquivo | Mutação | Suíte | Killed? |
| --- | --- | --- | --- | --- |
| M1 | `core/media/surfaceArt.ts:78` | `imageReused: outra !== null` → `false` | core (surfaceArt+carousel+banners) | ✅ |
| M2 | `core/media/surfaceArt.ts:33` | tira o `trim()` do `arte()` | core | ✅ |
| M3 | `core/media/surfaceArt.ts:71-78` | **inverte a ordem do recuo** (a outra superfície vence) | core | ✅ |
| M4 | `core/home/carousel.ts:80` | `heroCarouselWidth` devolve o valor **cru** | core | ✅ |
| M5 | `core/home/carousel.ts:165` | `slideIndexFromScroll` **sem saturar** | core | ✅ |
| M6 | `core/home/carousel.ts:105` | teto cobrado **depois** do conteúdo | core | ✅ |
| M7 | `HeroCarousel.tsx:94` | apaga `loading={primeiro ? …}` → sempre `lazy` | store hero-carousel | ✅ |
| M8 | `HeroCarousel.tsx:131` | tira `snap-mandatory` | store | ✅ |
| M9 | `HeroCarousel.tsx:140` | tira as classes `aspect-[var(--vaga-…)]` | store | ✅ |
| M10 | `useHeroCarousel.ts:88` | `total > 1` → `total > 0` (temporizador com 1 slide) | store | ✅ |
| M11b | `useHeroCarousel.ts:165` | `onMouseEnter` vira no-op | store | ✅ |
| M11d | `useHeroCarousel.ts:88` | **todas** as pausas desligadas | store | ✅ |
| M12 | `useHeroCarousel.ts:88` | gira mesmo com `prefers-reduced-motion` | store | ✅ |
| M13 | migration 41 | guarda decide por **tipo** (`old.type = 'hero'`) em vez de contagem | store homeSections | ✅ |
| M14 | migration 41 | **não derruba** `guard_hero_home_section` nem o trigger | store homeSections | ✅ |
| M15 | migration 41 | tira o `if not exists` da coluna | store homeSections | ✅ |
| M17 | `HeroCarousel.tsx:81` | `<source media>` invertido (`max-width: 767px`) | store | ✅ |
| M18 | `HeroCarousel.tsx:82` | `srcSet` do `<source>` sem rendição | store | ✅ |
| M16 | `HeroCarouselEditor.tsx:211` | lê `item[campo]` **cru** em vez de `heroSlideArt` (o defeito que `AD-030` existe para impedir) | backoffice home-composition **e** store `surfaceArtSingleOwner` | ✅ (os dois) |

### Sobreviventes (4)

#### S1 — `useHeroCarousel.ts:171` · a pausa do TOQUE não é discriminada

```diff
-      onPointerDown: () => setTocando(true),
+      onPointerDown: () => {},
```

**Suíte: `src/widgets/hero-carousel` → 66/66 passed, exit 0.**

**Por que nenhum teste pega**: `useHeroCarousel.test.ts:135-146` monta **3 slides** e avança
**`INTERVAL * 3`**. Com a pausa quebrada o carrossel gira 3 vezes e volta ao índice 0 — que é
exatamente o valor que a asserção `expect(result.current.index).toBe(0)` espera. **"Pausado" e
"girando um ciclo inteiro" são indistinguíveis nessa aritmética.** É o caminho do celular, ~90% dos
acessos: com ele quebrado, o banner troca debaixo do dedo de quem está lendo.

#### S2 — `useHeroCarousel.ts:169` · a pausa do FOCO não é discriminada

```diff
-      onFocus: () => setSobre(true),
+      onFocus: () => {},
```

**Suíte: `src/widgets/hero-carousel/model` → exit 0.**

Mesma causa, em `useHeroCarousel.test.ts:123-133`. `BNR-32` cobra **as duas** metades ("o ponteiro
está sobre o carrossel, **ou** o foco do teclado está dentro dele"); só a do ponteiro tem asserção
que discrimina, e ela discrimina por acidente — via o teste de `:157` ("soltar o dedo NÃO retoma
enquanto o ponteiro continua"), não via o próprio teste de hover, que é igualmente vácuo.

**Correção sugerida**: avançar um número de intervalos que **não** seja múltiplo do total (o próprio
teste de `BNR-33` já faz certo: `INTERVAL * 4` com 3 slides), ou asserir sobre `setInterval` não ter
sido chamado durante a pausa.

#### S3 — `surfaceArtSingleOwner.test.ts` · a régua é **por linha**, e o Prettier fura

```diff
-  const { image, imageReused } = heroSlideArt(item, vaga.dispositivo === 'computador' ? 'desktop' : 'mobile')
+  const propria = item[vaga.campo]
+  const image =
+    propria ||
+    item.image_url ||
+    item.image_mobile_url
+  const imageReused = !propria && !!image
```

**Guarda: `surfaceArtSingleOwner.test.ts` → exit 0 (não acusa).**

**Por que**: `RECUO_A_MAO` usa `[^\n]*` em todas as alternativas e roda linha a linha
(`linhas.forEach`). Um `||` quebrado em linhas — a forma que o **Prettier produz sozinho** quando a
expressão passa da largura — põe `image_mobile_url` e `image_url` em linhas diferentes e a régua fica
cega. Confirmado: a variante em **uma** linha (S3b, com nomes intermediários e ternário) **é** pega
(exit 1), então o furo é especificamente a quebra de linha.

**Mitigação parcial que existe hoje**: neste arquivo o defeito é morto pelo teste de
**comportamento** do editor (`HeroCarouselEditor.test.tsx` → exit 1). Mas o guarda existe justamente
para o **quinto consumidor**, que ainda não tem teste de comportamento — e para ele o furo é total.

**Correção sugerida**: rodar a régua sobre uma janela de N linhas (ou sobre o fonte com quebras
normalizadas dentro de expressão), como `previaUnica` faz com o fonte inteiro.

#### S4 — `heroCarouselSemOpacidadeZero.test.ts` · a régua guarda a GRAFIA, não a regra

Três furos, o segundo grave:

| Variante | Mutação | Guarda |
| --- | --- | --- |
| S4a | `className="… opacity-[0] transition-opacity"` (valor arbitrário do Tailwind) | **exit 0** — `/(?:^\|[\s"'`:[])opacity-0(?![\d.])/` não casa `opacity-[0]` |
| **S4b** | `className="h-full w-full object-cover animate-in fade-in duration-700"` | **exit 0** |
| S4c | envolver o widget em `<div className="opacity-0">` **no `sectionRenderers.tsx`** | **exit 0** — a régua lê **só** `HeroCarousel.tsx` |

**S4b é a repetição literal da lição da feature 40**, e não é hipotética:
`packages/ui/tailwind.preset.ts:173` carrega **`tailwindcss-animate`**, e `animate-in fade-in` já é a
grafia idiomática de entrada nesta loja — `WhatsAppFloat.tsx:76`, `:134` e `:169` a usam hoje.
`fade-in` compila para `--tw-enter-opacity: 0`, ou seja: **o elemento nasce em opacidade zero, o
Chrome não o conta como pintado, e o LCP volta a atrasar — sem que a string `opacity` apareça no
arquivo.** É uma classe, parece inofensiva, e o guarda inteiro não a vê. (O guarda irmão da feature
40, `heroSemOpacidadeZero.test.ts:57`, tem o **mesmo** furo.)

**S4c** é uma lacuna de escopo contra a letra da AC: `BNR-25` diz "em **nenhum ponto do caminho até
ele**", e a régua varre um arquivo só.

**Correção sugerida**: acrescentar `animate-in`/`fade-in`/`animate-fade` e a forma arbitrária
`opacity-\[0(?:\.0+)?\]` à régua, e estender o escopo ao invólucro que registra o renderer.

---

## 4 · Casos de borda da spec

| Edge case | Evidência | Result |
| --- | --- | --- |
| seção ligada e sem slide ⇒ não renderiza, com motivo | `resolve.test.ts:286` — `hiddenReason` = frase exata | ✅ |
| arte 404 ⇒ vaga mantém altura e mostra o `alt` | — não medido (jsdom não carrega imagem) | ⚠️ Navegador |
| leitura falha ⇒ piso `DEFAULT_HOME_COMPOSITION` sem este tipo | `core/home/__tests__/defaults.test.ts` (pré-existente) + `hero_carousel` fora da semente (`homeSections.test.ts:276`) | ✅ |
| dois slides no mesmo destino ⇒ aceito | — nenhuma asserção; `heroCarouselSlidesRefusal` não olha duplicidade, logo aceita por construção | ⚠️ |
| `href` que a loja não serve ⇒ régua existente | `carousel.test.ts:207` — `expect(motivo).toContain('1º banner:')` | ✅ |
| `config.width` desconhecido ⇒ `full` | `carousel.test.ts:91` e `HeroCarousel.test.tsx:82` | ✅ |
| tipo desconhecido ⇒ Home pula a seção | comportamento pré-existente, coberto em `resolve.test.ts` | ✅ |
| seção `full` primeira ⇒ encosta no cabeçalho | — não medido (layout) | ⚠️ Navegador |
| troca de arte ⇒ a anterior fica no Storage | declarado *Out of Scope* | ✅ (declarado) |

---

## 5 · Qualidade de código

| Princípio | Status | Nota |
| --- | --- | --- |
| Código mínimo | ✅ | Nenhuma abstração de uso único; `DestinoDoItem` foi extraído **porque** ganhou o segundo consumidor |
| Mudanças cirúrgicas | ✅ | 52 arquivos, e os de fora do escopo (`useResolvedHome`, `useAdminResolvedHome`) mudam só pelo campo novo obrigatório |
| Sem avanço de escopo | ✅ | Os sete itens de *Out of Scope* seguem fora |
| Segue os padrões | ✅ | Recusa é `string \| null` (a armadilha do `strictNullChecks: false`); extensão `.ts` explícita em `core/media` para Deno; guarda com âncora dupla e sensor |
| Asserção mede o valor da spec | ⚠️ | Frases de recusa são comparadas **literalmente** contra a spec (`BNR-10`, `BNR-29`) — exemplar. Mas `BNR-32` assere um valor que a aritmética produz sozinha |
| Todo teste mapeia um requisito | ✅ | Nenhum teste órfão encontrado no diff |
| Guardas não afrouxados | ✅ | `homeSections`, `previaUnica` e `catalog` **subiram** de régua junto com a regra; nenhuma asserção enfraquecida |
| Queda de contagem | ✅ | Nenhuma. Os cinco workspaces só cresceram |
| `payment/` intocado | ✅ | `git diff --name-only` vazio |
| **`AD-029` aplicada por inteiro** | ❌ | A decisão diz "o hero **pode ser desligado e removido**". No banco, sim. **Na única porta que a Adri tem, não.** Ver §6 |

---

## 6 · A lacuna principal — `AD-029` parou no banco

A `AD-029` está escrita em `.specs/STATE.md` como:

> **A Home não tem bloco indelével.** A "Chamada principal" (`hero`) passa a ser uma seção como
> qualquer outra — **pode ser desligada e removida**.

E o handoff registra: *"hero desligável e apagável"*, medido por probe SQL no banco local. **Isso é
verdade — e é só metade.** O painel não mudou:

```
apps/backoffice/src/features/home-composition/ui/HomeSectionRow.tsx:139-142

  // O hero não desliga nem se remove (`HOME-08`). Esconder o controle aqui é UX; quem torna "Home
  // com zero seções" impossível é o trigger da migration. …
  const indelevel = section.type === 'hero'
```

e, em `:215-219`, o `<Switch>` é substituído por um cadeado com
`aria-label="A chamada principal não pode ser desligada"`.

**Consequência de produto**: depois deste deploy, a Adri abre `/admin/home`, acrescenta o Banner
principal, arrasta-o para o topo — e a Chamada principal continua acima dele, com um cadeado no
lugar do interruptor. **É exatamente o estado que a P1-E existe para acabar**, e que a própria spec
descreve no *Problem Statement*: *"enquanto a Chamada principal for indelével, o carrossel nunca pode
ocupar o topo — ele entraria abaixo de um hero que a dona não pode desligar."*

**Por que nada acusou**: `design.md` cobre `AD-029` só do lado da migration; `tasks.md` mapeia
`BNR-42`..`BNR-46` à T3 e **não mapeia `BNR-40` nem `BNR-41` a task nenhuma**. E
`HomeSectionList.test.tsx:120-131` continua asserindo a recusa — o painel está **verde a favor do
comportamento que a spec manda remover**. É o formato clássico de defeito deste projeto: peças
certas, endereço errado, suíte verde.

**Correção**: `indelevel` deixa de existir; toda linha ganha `<Switch>`; a recusa passa a ser a do
banco, exibida sem reescrever (`BNR-44`, cujo caminho já existe em `useAdminHomeSections.ts:161`).
`HomeSectionList.test.tsx` troca o bloco `HOME-08` por asserções de que **todas** as linhas têm
interruptor e de que o motivo do banco chega à tela. Para `BNR-41`, `deleteSection` precisa de UI —
hoje ele é código morto.

---

## 7 · O que NÃO foi verificado

- **Nada em navegador.** jsdom devolve 0 para toda medida de layout, então **CLS, LCP, arrasto,
  largura real e a ausência de rolagem horizontal do `body` não estão medidos** — as asserções
  correspondentes (`BNR-18`, `BNR-26`, `BNR-37`) são proxy de forma, e o próprio autor as declara
  assim. Os Success Criteria da spec pedem 390×844, Slow 4G e CPU 4×: **continuam por fazer**.
- **Nada contra o Supabase hospedado.** A migration foi probeada pelo autor no banco **local**; o
  `Supabase Deploy` a aplica no push em `master`.
- **`BNR-27` (destino externo)** — divergência **declarada** pelo autor na tabela de suposições da
  spec e como `SPEC_DEVIATION` em `HeroCarousel.tsx:32-36`. Confirmada como corretamente declarada;
  **não contada como achado**.

---

## 8 · Fix plans

### Fix 1 — o painel precisa deixar desligar e remover a Chamada principal · **Blocker**

- **Root cause**: `AD-029` foi implementada só na migration. `HomeSectionRow.tsx:142` mantém o
  travamento por tipo, e `HomeSectionList.test.tsx:120-131` o assere.
- **Onde**: `apps/backoffice/src/features/home-composition/ui/HomeSectionRow.tsx`,
  `HomeSectionList.test.tsx`; e, para `BNR-41`, ligar `deleteSection` a uma ação de tela em
  `AdminHomePage.tsx`.
- **Done when**: a linha do hero tem `<Switch>`; desligar com outra seção ativa chama
  `setSectionActive('…', false)`; desligar a última ativa exibe a mensagem **do banco**, sem
  reescrita; existe caminho de remoção. Testes novos em lugar das três asserções de `HOME-08`.

### Fix 2 — as asserções de pausa não discriminam · **Major**

- **Root cause**: `INTERVAL * 3` com 3 slides volta ao índice 0; "pausado" e "girando" colidem.
- **Onde**: `apps/store/src/widgets/hero-carousel/model/__tests__/useHeroCarousel.test.ts:110-146`.
- **Done when**: as mutações S1 e S2 reprovam. Usar um número de intervalos não múltiplo do total
  (como `BNR-33` já faz) ou asserir sobre o `setInterval`.

### Fix 3 — o guarda de opacidade não vê `animate-in fade-in` · **Major**

- **Root cause**: régua ancorada na grafia `opacity: 0` / `opacity-0`. `tailwindcss-animate` está no
  preset e `fade-in` já é usado na loja; ele nasce em opacidade zero sem escrever a palavra.
- **Onde**: `heroCarouselSemOpacidadeZero.test.ts:46-53` — **e o irmão**
  `apps/store/src/widgets/hero-banner/ui/__tests__/heroSemOpacidadeZero.test.ts:57`, que tem o mesmo furo.
- **Done when**: S4a, S4b e S4c reprovam. Acrescentar `animate-in`/`fade-in` e
  `opacity-\[0(?:\.0+)?\]` à régua, e estender o escopo ao invólucro do renderer.

### Fix 4 — o guarda de dono único é cego a `||` quebrado em linhas · **Major**

- **Root cause**: `RECUO_A_MAO` casa por linha (`[^\n]*`); o Prettier quebra a expressão sozinho.
- **Onde**: `apps/store/src/shared/lib/__tests__/surfaceArtSingleOwner.test.ts:142-149`.
- **Done when**: S3 reprova. Janela de N linhas, ou normalização de quebra dentro de expressão.

### Fix 5 — `BNR-39` sem implementação e sem asserção · **Minor**

- **Root cause**: `design.md:261` declara a AC "realizada por construção" com redação divergente, mas
  a propriedade que ele afirma continuar valendo não é asserida, e não há `SPEC_DEVIATION` no código.
- **Done when**: ou um teste assere a propriedade (nenhum focável visualmente oculto enquanto
  focado), ou a divergência entra no código como `SPEC_DEVIATION` e na tabela de suposições da spec —
  como `BNR-27` já está.

### Fix 6 — ACs sem evidência própria · **Minor**

`BNR-04` (posição livre para `hero_carousel`, e o topo real), `BNR-52` (desligar preserva os slides),
`BNR-02`/`BNR-05` (hoje só genéricos), `BNR-08`/`BNR-09` (o snapshot escrito **pelo editor do
carrossel**), `BNR-44` (o painel exibindo a mensagem do banco).

---

## 9 · Traceabilidade

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| BNR-01, 03, 06, 07, 10..16, 19..24, 26, 28..31, 33..38, 42, 43, 45..51 | Pending | ✅ Verified |
| BNR-18, 25, 27, 37 | Pending | ✅ Verified com proxy/desvio declarado |
| BNR-02, 05, 08, 09, 44, 52 | Pending | ⚠️ Evidência indireta |
| **BNR-04, 32, 39** | Pending | ❌ Needs Fix |
| **BNR-40, BNR-41** | Pending | ❌ **Needs Fix (AC reprovada)** |

---

## Summary

**Overall**: ❌ **Not Ready** — a metade de loja da feature está pronta e bem guardada; a P1-E está
pela metade.

**O que funciona** (medido, não afirmado): o catálogo de 11 tipos casando com o `check` nos dois
sentidos; a régua de recusa com as frases exatas da spec e na ordem que a spec declara; a arte por
dispositivo com **um** dono em `core/media`, provada por igualdade de veredito entre `heroSlideArt` e
`surfaceArt` e por guarda de dono único; a rendição pelo dono único, com arte externa saindo
inalterada; `eager`+`fetchpriority` só no primeiro slide; a vaga com altura antes da imagem; o giro
de 6 s, o `prefers-reduced-motion`, as bolinhas rotuladas por **nome** do banner, o `TAP_44` em todo
controle, o `aria-live` acompanhando a troca; a migration idempotente, sem escrita de dado e
derrubando o guarda antigo; o editor com aviso de proporção que **grava assim mesmo**, falha de envio
que preserva o rascunho, teto com motivo em texto e destino apagado nomeado; e a prévia continuando a
ser a loja num iframe.

**O que reprova**: a Chamada principal **continua indelével no painel** (`BNR-40`, `BNR-41`), com um
teste vivo asserindo a trava — o que anula o objetivo da feature, porque o Banner principal não pode
ocupar o topo. E quatro mutantes sobreviveram: as duas pausas do carrossel (toque e foco) têm
asserção vácua, e os dois guardas novos são fura­dos por grafias equivalentes — `animate-in fade-in`,
que **já é usado nesta loja** e produz o mesmo defeito de LCP, e um `||` quebrado em linhas pelo
Prettier.

**Próximo passo**: Fix 1 (Blocker) antes de qualquer merge; Fix 2, 3 e 4 no mesmo lote, porque os
três são "o teste passa e o defeito volta". Depois, a prova em navegador em 390×844 — que é a única
que mede o que esta feature promete em CLS e LCP.
