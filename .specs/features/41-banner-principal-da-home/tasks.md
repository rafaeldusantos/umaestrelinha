# Banner principal da Home — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tasks com a Skill `tlc-spec-driven`: **ative-a pelo nome e siga o fluxo de Execute e
as Critical Rules dela.** Não procure os arquivos da skill por caminho de sistema de arquivos.

**Se a skill não puder ser ativada, PARE e avise — não prossiga sem ela.**

Convenção do projeto que **sobrepõe** o padrão da skill: **não criar commits atômicos por task.**
Os commits saem de uma vez, ao fim da implementação (`CLAUDE.md`, `BL-012` fechado em 2026-08-15).

---

**Design**: `.specs/features/41-banner-principal-da-home/design.md`
**Status**: Done — T1..T18 completas em 2026-09-06. Falta a verificação independente.

---

## Test Coverage Matrix

> Gerada do código, das diretrizes do projeto e da spec. Diretrizes encontradas: `CLAUDE.md` (raiz),
> `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`,
> `supabase/CLAUDE.md`, `apps/*/vitest.config.ts`. **Não há limiar de cobertura configurado** — o
> gate do projeto é "sem regressão" contra a baseline, mais os guardas que leem o disco.

| Camada | Tipo de teste | Expectativa de cobertura | Padrão de local | Comando |
| --- | --- | --- | --- | --- |
| Regra pura de domínio (`packages/core/**`) | unit | Todos os ramos; 1:1 com as ACs da spec; todo caso de borda listado | `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Widget / componente da loja | unit (RTL + jsdom) | Todo comportamento observável por DOM: atributos, texto, presença/ausência. **Nunca** medida de layout — jsdom devolve 0 | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| Editor / tela do painel | unit (RTL + jsdom) | Toda recusa, todo aviso, e o par painel × loja de todo predicado compartilhado | `apps/backoffice/src/**/*.test.tsx` | `pnpm --filter @estrelinha/backoffice test` |
| Guarda que lê arquivo do disco (migration, fonte, config) | unit | **Âncora de contagem obrigatória** + sensor por mutação de cada asserção | `apps/*/src/**/__tests__/*.test.ts` | o do workspace onde mora |
| Migration SQL | unit (via guarda que lê o `.sql`) + **probe HTTP contra o banco local** | Toda cláusula que a spec cobra, mais a prova de que grava (`AD-012`: tipo é afirmação, probe é verificação) | `apps/store/src/shared/lib/__tests__/homeSections.test.ts` | guarda + `curl` contra `:54341` |
| Tipos / barrels / registros | none | — (gate de build e `tsc`) | — | `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` |

## Gate Check Commands

> **Sempre um workspace por vez, e sempre com o exit code capturado FORA de pipe** — `pnpm test | tail`
> devolve o código do `tail` (`CLAUDE.md`). Duas suítes concorrentes saturam a máquina e produzem
> timeout de 5s em teste que varre disco.

| Nível | Quando | Comando |
| --- | --- | --- |
| Quick · core | Task que só mexe em `packages/core` | `pnpm --filter @estrelinha/core test` |
| Quick · store | Task que mexe em `apps/store` | `pnpm --filter @estrelinha/store test` |
| Quick · backoffice | Task que mexe em `apps/backoffice` | `pnpm --filter @estrelinha/backoffice test` |
| Full | Task que cruza workspaces | os três acima, **um por vez** |
| Build | Fim de fase e fecho | `npx tsc --noEmit -p apps/store/tsconfig.app.json` · idem backoffice · `pnpm build` |

---

## Execution Plan

### Fase 1 — Fundação: o dono único da arte e o banco (3 tasks)

```
T1 → T2 → T3
```

### Fase 2 — `packages/core/home`: o tipo, as réguas e a resolução (5 tasks)

```
T4 → T5 → T6 → T7 → T8
```

### Fase 3 — A loja desenha (5 tasks)

```
T9 → T10 → T11 → T12 → T13
```

### Fase 4 — O painel edita (4 tasks)

```
T14 → T15 → T16 → T17
```

### Fase 5 — Fecho (1 task)

```
T18
```

---

## Task Breakdown

### T1: Extrair `surfaceArt` — o dono único da arte por dispositivo

**What**: Criar o módulo puro que responde "qual arte esta superfície usa, e ela foi reaproveitada?".
**Where**: `packages/core/src/media/surfaceArt.ts` (novo) + `packages/core/src/media/index.ts`
**Depends on**: None
**Reuses**: o corpo de `menuBannerImage`/`menuBannerArt` (`packages/core/src/menu/banners.ts`)
**Requirement**: BNR-22 · `AD-030`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `surfaceImage(desktop, mobile, surface)` devolve a arte **gravada** da superfície, com espaço aparado; `"   "` **não** é arte
- [ ] `surfaceArt(desktop, mobile, surface)` devolve `{ image, imageReused }`, com recuo para a outra superfície
- [ ] Todo import do módulo tem extensão `.ts` explícita (alcance por Deno)
- [ ] Exportado pelo barrel de `@estrelinha/core/media`
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit — todos os ramos: só desktop, só mobile, os dois, nenhum, `""`, `"   "`, `null`, `undefined`, nos dois sentidos de superfície
**Gate**: quick · core

---

### T2: `menuBannerArt` passa a delegar

**What**: Trocar o corpo de `menuBannerImage`/`menuBannerArt` por uma chamada a `surfaceArt`, **sem mudar comportamento**.
**Where**: `packages/core/src/menu/banners.ts`
**Depends on**: T1
**Reuses**: T1
**Requirement**: BNR-22 · `AD-030`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `menuBannerImage` e `menuBannerArt` não contêm mais a régua — só a chamada
- [ ] **Nenhum** teste da `39` foi alterado, e todos passam (é a prova de que o comportamento não mudou)
- [ ] Nenhum import novo de `@estrelinha/supabase` entra em `core/menu` (o grafo de tipos do Deno)
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit — os que já existem (`banners.test.ts`) valem como regressão; acrescentar 1 caso amarrando os dois vereditos (`menuBannerArt` == `surfaceArt`) para a delegação não poder ser desfeita em silêncio
**Gate**: quick · core

---

### T3: Migration `41` — coluna, tipo novo e troca do guarda

**What**: A migration idempotente, e a reescrita do bloco `HOME-08` do guarda que lê o `.sql`.
**Where**: `supabase/migrations/20260906120000_41-banner-principal-da-home.sql` (novo) · `apps/store/src/shared/lib/__tests__/homeSections.test.ts`
**Depends on**: None
**Reuses**: o molde de `drop constraint if exists` + `add constraint` da migration da `24`
**Requirement**: BNR-06, BNR-42..BNR-46 · `AD-029`

**Tools**: MCP: NONE (o MCP do Supabase não está autorizado nesta sessão) · Skill: NONE

**Done when**:
- [ ] `add column if not exists image_mobile_url text` em `home_section_items`, com `comment on column`
- [ ] `check (type in (…))` recriado com `hero_carousel` — **11 tipos**
- [ ] `guard_hero_home_section` e `trg_home_sections_hero_guard` **removidos**
- [ ] `guard_last_active_home_section` + `trg_home_sections_last_active_guard` criados, recusando `UPDATE active = false` e `DELETE` da última ativa, com `errcode = '23514'`
- [ ] **Zero** `insert`/`update`/`delete` de dado na migration
- [ ] `homeSections.test.ts` reescrito: assere o guarda novo **e** que o antigo não existe mais; âncora de contagem sobe para 11
- [ ] **Probe** (`AD-012`): `supabase db reset` local, `insert` de item com `image_mobile_url` via PostgREST devolve 201 e relê o valor; desligar a última seção ativa devolve `23514`
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit (guarda que lê o `.sql` do disco, com sensor por mutação de cada asserção nova) + probe HTTP
**Gate**: quick · store + probe

---

### T4: O tipo `hero_carousel` nos tipos de `core/home`

**What**: `HomeSectionType`, `HomeBannerWidth`, `config.width`, `HomeSectionItem.image_mobile_url`, `ResolvedItem.imageMobileUrl`.
**Where**: `packages/core/src/home/types.ts` · `packages/core/src/home/resolve.ts` (só o campo do `ResolvedItem`)
**Depends on**: None
**Reuses**: a documentação de fronteira que já está em `HomeSectionConfig`
**Requirement**: BNR-06, BNR-20, BNR-21

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Os cinco pontos acima declarados e documentados (por que `width` cabe no `config` e o destino não — `AD-014`)
- [ ] `npx tsc --noEmit -p apps/store/tsconfig.app.json` e o do backoffice em **0**

**Tests**: none (camada de tipo — gate de build, conforme a matriz)
**Gate**: build

---

### T5: O catálogo aceita o tipo novo

**What**: `HOME_SECTION_TYPES`, `LABELS` ("Banner principal"), fora de `UNIQUE_SECTION_TYPES` e de `COMING_SOON`.
**Where**: `packages/core/src/home/catalog.ts`
**Depends on**: T3, T4
**Reuses**: `sectionMeta`
**Requirement**: BNR-01, BNR-03, BNR-05, BNR-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `sectionMeta('hero_carousel')` devolve `{ label: 'Banner principal', unique: false, limit: null, comingSoon: false }`
- [ ] `catalog.test.ts` (core) e `homeSections.test.ts` (store) passam com a contagem em 11
- [ ] Gate: `pnpm --filter @estrelinha/core test` **e** `pnpm --filter @estrelinha/store test`

**Tests**: unit — o `sectionMeta` do tipo novo e a âncora de contagem nos dois lados
**Gate**: full

---

### T6: `core/home/carousel.ts` — constantes e aritmética pura

**What**: vagas, teto, intervalo, normalização de largura, índice circular e índice a partir da rolagem.
**Where**: `packages/core/src/home/carousel.ts` (novo) + barrel
**Depends on**: T1, T4
**Reuses**: `SlotSpec` de `core/home/layout`, `surfaceArt` de T1
**Requirement**: BNR-13, BNR-20, BNR-22, BNR-26, BNR-30

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `HERO_CAROUSEL_SLOTS` = `{ desktop: 1440×540, mobile: 780×975 }`
- [ ] `HERO_CAROUSEL_MAX_SLIDES = 6`, `HERO_CAROUSEL_INTERVAL_MS = 6000`
- [ ] `heroCarouselWidth(config)` → `'full'` para ausente, `null`, `''` e valor desconhecido
- [ ] `heroSlideArt(item, surface)` delega em `surfaceArt` (sem segunda régua)
- [ ] `nextSlideIndex(current, total, step)` circula nos dois sentidos e trata `total = 0/1`
- [ ] `slideIndexFromScroll(scrollLeft, slideWidth, total)` arredonda para a vaga mais próxima, satura nas pontas e trata `slideWidth = 0` (que é o que jsdom devolve)
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit — 1:1 com as ACs acima, incluindo os bordos (`total` 0 e 1, `slideWidth` 0, rolagem fracionária)
**Gate**: quick · core

---

### T7: As recusas do slide

**What**: o ramo do tipo novo em `configRefusal`, e `heroCarouselSlidesRefusal(items)` — arte, `alt`, destino, teto — na ordem, com o número do slide na frente.
**Where**: `packages/core/src/home/refusals.ts` · `packages/core/src/home/carousel.ts`
**Depends on**: T6
**Reuses**: `destinationRefusal`, `ctaHrefRefusal`, `ordinal` (o do painel fica no painel)
**Requirement**: BNR-10, BNR-11, BNR-12, BNR-13

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Slide sem arte nenhuma → `«Nº banner: envie a arte. Sem imagem não há banner.»`
- [ ] Slide com arte e sem `alt` → recusa própria, nomeando o slide
- [ ] Slide sem destino → a frase de `destinationRefusal`, **sem** segunda redação
- [ ] 7º slide → recusa dizendo o teto e mandando criar outra seção
- [ ] Todo veredito é `string | null` (nunca união discriminada por booleano — `strictNullChecks: false`)
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit — uma asserção por AC acima, mais a ordem entre elas (arte antes de `alt`, `alt` antes de destino) e o caso do slide órfão nomeado pelo `label_snapshot`
**Gate**: quick · core

---

### T8: `resolveHomeSections` conhece o carrossel

**What**: `SOURCE_DRIVEN` + `EMPTY_SOURCE_REASON` para o tipo novo.
**Where**: `packages/core/src/home/resolve.ts`
**Depends on**: T4, T5
**Reuses**: a máquina de `resolveHomeSections` inteira
**Requirement**: BNR-28, BNR-29, BNR-49

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Seção ligada e sem slide → `renders: false` com `«Não vai aparecer: nenhum banner enviado.»`
- [ ] Seção com todos os slides fora do ar → o motivo de "os N escolhidos saíram do ar", com `droppedCount` certo
- [ ] Seção com 1 de 3 fora do ar → renderiza os 2, `droppedCount = 1`
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit — os três casos acima, mais o de seção desligada
**Gate**: quick · core

---

### T9: `useHeroCarousel` — índice, giro e pausa

**What**: o hook que mantém o índice colado na rolagem real e gira só quando deve.
**Where**: `apps/store/src/widgets/hero-carousel/model/useHeroCarousel.ts` (novo)
**Depends on**: T6
**Reuses**: `nextSlideIndex`/`slideIndexFromScroll` (T6), `useReducedMotion` do framer-motion
**Requirement**: BNR-30, BNR-31, BNR-32, BNR-33

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Com `total >= 2`, avança sozinho a cada 6 s (tempo controlado por `vi.useFakeTimers`)
- [ ] Com `total <= 1`, **nenhum** temporizador é criado
- [ ] `mouseenter` / `focusin` / `pointerdown` pausam; `mouseleave` / `focusout` retomam
- [ ] `prefers-reduced-motion: reduce` ⇒ não gira, e `goTo` usa `behavior: 'auto'`
- [ ] O índice sai da posição de rolagem, **nunca** de um contador paralelo
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit — um caso por AC acima, com `matchMedia` injetado para o ramo reduzido
**Gate**: quick · store

---

### T10: O widget `HeroCarousel`

**What**: o desenho do carrossel na loja, em `full` e em `wide`.
**Where**: `apps/store/src/widgets/hero-carousel/ui/HeroCarousel.tsx` + `index.ts` (novos)
**Depends on**: T6, T9
**Reuses**: `renditionUrl`/`renditionSrcSet`, `TAP_44`, o molde de `<picture>` da loja
**Requirement**: BNR-17..BNR-27, BNR-34..BNR-39

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `full` sem `container`; `wide` com `container` + raio, e **nenhum** `w-screen`
- [ ] `<picture>` com `<source media="(min-width: 768px)">` na arte de computador e `<img>` na de celular
- [ ] Vaga com proporção declarada por dispositivo (altura conhecida antes da imagem)
- [ ] 1º slide `loading="eager"` + `fetchpriority="high"`; demais `lazy`
- [ ] **Nenhum** `opacity: 0` no arquivo
- [ ] Trilho `snap-x snap-mandatory` com slides `snap-center shrink-0 w-full`
- [ ] Bolinhas e setas só com 2+ slides, rotuladas, com alvo de 44 px
- [ ] `aria-roledescription`, `aria-live="polite"` com "Banner N de M"
- [ ] Destino externo abre com `target="_blank"` + `rel="noopener noreferrer"`
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit — um caso por AC acima (atributos e presença/ausência; **nenhuma** medida de layout)
**Gate**: quick · store

---

### T11: Ligar o widget à Home

**What**: registrar o renderer e fazer `useResolvedHome` carregar a arte de celular.
**Where**: `apps/store/src/widgets/home-renderer/ui/sectionRenderers.tsx` · `apps/store/src/widgets/home-renderer/model/useResolvedHome.ts` · `apps/store/src/entities/home/api/*` (o `select`)
**Depends on**: T8, T10
**Reuses**: `HOME_SECTION_RENDERERS`, `resolveItem`
**Requirement**: BNR-17, BNR-21, BNR-28

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `hero_carousel → HeroCarousel` no registro
- [ ] Os **cinco** pontos que montam `ResolvedItem` passam `imageMobileUrl` explicitamente (`null` onde não há)
- [ ] `resolveItem` leva `item.image_mobile_url` para os três tipos de destino
- [ ] O `select` da Home pede a coluna nova (senão o mapper coalesce e a tela renderiza vazia — a lição de `cardSelect.test.ts`)
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit — `resolveItem` com arte de celular nos três destinos; o registro desenhando o widget; e o `select` nomeando a coluna
**Gate**: quick · store

---

### T12: Guarda — o carrossel não nasce invisível

**What**: `heroCarouselSemOpacidadeZero.test.ts`, no molde do guarda do hero da `40`.
**Where**: `apps/store/src/widgets/hero-carousel/ui/__tests__/heroCarouselSemOpacidadeZero.test.ts` (novo)
**Depends on**: T10
**Reuses**: `heroSemOpacidadeZero.test.ts`
**Requirement**: BNR-25

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Recusa `opacity: 0` em **três** grafias: variant do framer, prop inline e classe utilitária
- [ ] Âncora: a varredura tem de encontrar o arquivo e ao menos um `<img`
- [ ] Sensor: injetar cada uma das três grafias faz a suíte reprovar
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit (guarda que lê o disco, com âncora e sensor)
**Gate**: quick · store

---

### T13: Guarda — a arte por dispositivo tem um dono

**What**: `surfaceArtSingleOwner.test.ts` — ninguém fora de `core/media/surfaceArt.ts` reimplementa o recuo.
**Where**: `apps/store/src/shared/lib/__tests__/surfaceArtSingleOwner.test.ts` (novo)
**Depends on**: T1, T2
**Reuses**: o molde de `freeShippingSingleOwner.test.ts` (removedor de comentário de linha **e** de bloco na mesma varredura — `BL-027`)
**Requirement**: BNR-22, BNR-47 · `AD-030`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Varre `apps/**` e `packages/**`; recusa ternário ou `||` entre `image_desktop`/`image_mobile` (e entre `image_url`/`image_mobile_url`) fora do dono
- [ ] **Âncora dupla**: arquivos lidos **e** ocorrências legítimas encontradas
- [ ] Sensor de comentário provado com CRLF **e** LF
- [ ] Sensor por mutação: uma reimplementação injetada em `apps/backoffice` reprova
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit (guarda que lê o disco, com âncora dupla e sensores)
**Gate**: quick · store

---

### T14: O rascunho e a gravação carregam a arte de celular

**What**: `DraftItem`, `NewHomeSectionItem`, `mapRow` e `curateSection` ganham `image_mobile_url`.
**Where**: `apps/backoffice/src/features/home-composition/model/sectionDraft.ts` · `apps/backoffice/src/entities/home/api/useAdminHomeSections.ts`
**Depends on**: T3, T4
**Reuses**: toda a máquina de rascunho e a gravação "apaga e reescreve"
**Requirement**: BNR-07, BNR-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `toDraftItems` / `toNewItems` / `draftChanged` / `applyDraft` levam o campo
- [ ] `mapRow` lê a coluna, e o `select` a pede
- [ ] `curateSection` grava a coluna — **provado por probe HTTP** contra o banco local (`AD-012`)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit — ida e volta do campo no rascunho, e `draftChanged` acusando mudança só nele
**Gate**: quick · backoffice + probe

---

### T15: `HeroCarouselEditor`

**What**: a tela do bloco — largura, lista de slides, duas vagas de arte, `alt`, destino e os avisos.
**Where**: `apps/backoffice/src/features/home-composition/ui/HeroCarouselEditor.tsx` (novo)
**Depends on**: T6, T7, T14
**Reuses**: `BannerGridEditor` (destino e envio), `uploadHomeImage` + `aspectRatioWarning`, `surfaceArt` (o aviso de reaproveitamento)
**Requirement**: BNR-07..BNR-16, BNR-47, BNR-48, BNR-50

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Seletor de largura `full` / `wide`, com o estado atual visível
- [ ] Por slide: arte de computador, arte de celular, `alt`, destino de três modos
- [ ] Aviso de proporção por vaga; aviso de reaproveitamento vindo de `surfaceArt` (**o mesmo predicado da loja**)
- [ ] Destino apagado é nomeado pelo `label_snapshot`
- [ ] Aviso de slides excedentes, com o excedente apagável
- [ ] Falha de envio mostra o motivo e preserva o rascunho
- [ ] **Nenhum** desenho do carrossel nesta tela
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit — um caso por AC acima, **mais** o par painel × loja do predicado da arte (o mesmo veredito nos dois, no mesmo teste)
**Gate**: quick · backoffice

---

### T16: Registrar o editor e a recusa

**What**: `heroCarouselRefusal` em `sectionRefusals.ts` e a entrada em `SECTION_EDITORS`.
**Where**: `apps/backoffice/src/features/home-composition/model/sectionRefusals.ts` · `.../ui/sectionEditors.tsx`
**Depends on**: T7, T15
**Reuses**: `configRefusal` + `heroCarouselSlidesRefusal` (T7) — **nenhuma regra nova nasce aqui**
**Requirement**: BNR-01, BNR-10..BNR-13

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `SECTION_EDITORS.hero_carousel = { Body, refusal }`
- [ ] `heroCarouselRefusal` só **compõe** as réguas de `core`, sem redigir nenhuma
- [ ] O bloco aparece na bandeja sem "em breve", e um segundo é aceito
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit — a composição da recusa (ordem e repasse) e a bandeja oferecendo o bloco
**Gate**: quick · backoffice

---

### T17: `previaUnica` cobre o carrossel

**What**: estender o guarda para recusar um segundo desenho do carrossel no painel.
**Where**: `apps/backoffice/src/features/home-composition/__tests__/previaUnica.test.ts`
**Depends on**: T15
**Reuses**: o guarda que já cobre as features `25` e `39`
**Requirement**: BNR-51 · `AD-019`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Recusa arquivo de `home-composition` que importe o widget da loja ou redesenhe o trilho/slides
- [ ] Âncora de contagem atualizada
- [ ] Sensor: um `HeroCarouselPreview.tsx` injetado reprova
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit (guarda que lê o disco, com âncora e sensor)
**Gate**: quick · backoffice

---

### T18: Fecho — baselines, documentação e verificação

**What**: medir os cinco workspaces, atualizar as baselines e os `CLAUDE.md` que a feature tocou.
**Where**: `CLAUDE.md` (raiz) · `apps/store/CLAUDE.md` · `apps/backoffice/CLAUDE.md` · `packages/core/CLAUDE.md` · `supabase/CLAUDE.md` · `.specs/STATE.md` (Handoff)
**Depends on**: T17
**Reuses**: —
**Requirement**: Success Criteria

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Os cinco workspaces medidos **um por vez**, com exit code capturado fora de pipe
- [ ] Baseline de testes, lint e tipos atualizada na raiz, com o delta por workspace
- [ ] `git diff --name-only` confirma **zero** linha em `packages/core/src/payment/**`
- [ ] `npx tsc --noEmit` em 0 nos dois apps; `pnpm build` passa
- [ ] A dívida "o menu do carrossel nasce vazio e ligar é passo de operação" registrada em *Estado conhecido*
- [ ] Handoff da `41` escrito no `STATE.md`

**Tests**: none (task de medição e documentação)
**Gate**: build

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5

Fase 1:  T1 ──→ T2 ──→ T3
Fase 2:  T4 ──→ T5 ──→ T6 ──→ T7 ──→ T8
Fase 3:  T9 ──→ T10 ─→ T11 ─→ T12 ─→ T13
Fase 4:  T14 ─→ T15 ─→ T16 ─→ T17
Fase 5:  T18
```

**Empacotamento em lotes (~7 tasks):** Fase 1 + Fase 2 = **8** (lote 1) · Fase 3 = **5** (lote 2) ·
Fase 4 + Fase 5 = **5** (lote 3). Três lotes ⇒ a oferta de sub-agentes se aplica; a execução inline
sequencial é a alternativa válida.

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 módulo novo | ✅ |
| T2 | 1 arquivo, delegação | ✅ |
| T3 | 1 migration + 1 bloco de guarda (coesos: a regra e a prova dela) | ✅ |
| T4 | 1 arquivo de tipos (+1 campo em `resolve.ts`) | ✅ |
| T5 | 1 arquivo de catálogo | ✅ |
| T6 | 1 módulo novo | ✅ |
| T7 | 2 arquivos coesos (a régua e o ramo dela) | ✅ |
| T8 | 1 arquivo | ✅ |
| T9 | 1 hook | ✅ |
| T10 | 1 componente | ✅ |
| T11 | 3 arquivos de fiação, um só conceito ("ligar o widget") | ⚠️ OK — coeso |
| T12 | 1 guarda | ✅ |
| T13 | 1 guarda | ✅ |
| T14 | 2 arquivos, um só campo atravessando | ✅ |
| T15 | 1 componente | ✅ |
| T16 | 2 registros coesos | ✅ |
| T17 | 1 guarda | ✅ |
| T18 | documentação e medição | ✅ |

---

## Diagram-Definition Cross-Check

| Task | `Depends on` (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | — | início da Fase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | — | T2 → T3 (ordem, sem dependência real) | ✅ |
| T4 | — | início da Fase 2 | ✅ |
| T5 | T3, T4 | T4 → T5 (T3 é de fase anterior) | ✅ |
| T6 | T1, T4 | T5 → T6 (T1/T4 anteriores) | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T4, T5 | T7 → T8 (T4/T5 anteriores) | ✅ |
| T9 | T6 | Fase 2 → Fase 3 | ✅ |
| T10 | T6, T9 | T9 → T10 | ✅ |
| T11 | T8, T10 | T10 → T11 | ✅ |
| T12 | T10 | T11 → T12 | ✅ |
| T13 | T1, T2 | Fase 1 → Fase 3 | ✅ |
| T14 | T3, T4 | Fase 3 → Fase 4 | ✅ |
| T15 | T6, T7, T14 | T14 → T15 | ✅ |
| T16 | T7, T15 | T15 → T16 | ✅ |
| T17 | T15 | T16 → T17 | ✅ |
| T18 | T17 | Fase 4 → Fase 5 | ✅ |

Nenhuma task depende de task de fase posterior. ✅

---

## Test Co-location Validation

| Task | Camada criada/alterada | A matriz exige | A task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | regra pura (`core`) | unit | unit | ✅ |
| T2 | regra pura (`core`) | unit | unit | ✅ |
| T3 | migration SQL + guarda de disco | unit + probe | unit + probe | ✅ |
| T4 | tipos | none | none | ✅ |
| T5 | regra pura (`core`) | unit | unit | ✅ |
| T6 | regra pura (`core`) | unit | unit | ✅ |
| T7 | regra pura (`core`) | unit | unit | ✅ |
| T8 | regra pura (`core`) | unit | unit | ✅ |
| T9 | hook da loja | unit | unit | ✅ |
| T10 | widget da loja | unit | unit | ✅ |
| T11 | fiação da loja | unit | unit | ✅ |
| T12 | guarda de disco | unit | unit | ✅ |
| T13 | guarda de disco | unit | unit | ✅ |
| T14 | modelo + API do painel | unit | unit + probe | ✅ |
| T15 | editor do painel | unit | unit | ✅ |
| T16 | registro do painel | unit | unit | ✅ |
| T17 | guarda de disco | unit | unit | ✅ |
| T18 | documentação | none | none | ✅ |

Nenhuma ❌. Nenhuma task produz código não verificado, e nenhuma difere teste para outra.
