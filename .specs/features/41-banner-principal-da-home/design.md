# Banner principal da Home — Design

**Spec**: `.specs/features/41-banner-principal-da-home/spec.md`
**Contexto**: `.specs/features/41-banner-principal-da-home/context.md`
**Status**: Approved

---

## Decisões ativas conferidas antes de desenhar

Lidas em `.specs/STATE.md` `## Decisions` (`AD-001`..`AD-028`). As que **restringem** este desenho:

| Decisão | Como este desenho se conforma |
| --- | --- |
| `AD-014` — id em `jsonb` não dispara `on delete set null`; referência vai para coluna com FK | Os slides são linhas de `home_section_items`, **não** um array no `config`. É o motivo principal da Abordagem A abaixo |
| `AD-019` — a prévia da Home é a **loja num iframe** | O painel não desenha o carrossel. Nenhum arquivo de `home-composition` importa o widget da loja (`previaUnica.test.ts`) |
| `AD-012` — tipo escrito à mão é afirmação, não verificação | A coluna nova é provada por **probe HTTP contra o banco local**, não por inspeção de tipo. Vira item de `Done when` |
| `AD-027` — o que a dona liga e desliga tem interruptor próprio, e nasce **desligado** | A seção nasce `active = false`, como todo bloco (`HOME-10`). Não há segundo interruptor |
| `AD-028` — o menu é curado **por dispositivo** | O predicado "arte desta superfície, com recuo para a da outra" já existe em `menuBannerArt`. Este desenho **não o reescreve** — extrai o dono único |

Duas decisões **novas** saem daqui (`AD-029`, `AD-030`) e estão na tabela *Tech Decisions*.

---

## Exploração de abordagens

### Onde moram os slides

| | Abordagem | Prós | Contras | Veredito |
| --- | --- | --- | --- | --- |
| **A** | **`home_section_items` + coluna `image_mobile_url`** | FK real com `on delete set null`; reusa `curateSection`, `DraftItem`, `destinationRefusal`, `label_snapshot`, o `check` de destino único e o índice `(section_id, position)` | Uma coluna nova numa tabela existente | **Escolhida** |
| B | Array `slides[]` dentro do `config jsonb`, como `menu_banners` | Sem migration de coluna | **Recria o defeito que a `AD-014` fechou**: id em jsonb não dispara `on delete set null`, então toda leitura precisaria validar o destino em runtime. E contraria a fronteira escrita em `HomeSectionConfig` ("guarda só texto, número e URL — nunca referência") | Recusada |
| C | Tabela nova `home_carousel_slides` | Isolamento | Dois donos de "itens curados de uma seção" — o "defeito 01" com outro nome | Recusada |

### O motor do carrossel

| | Abordagem | Prós | Contras | Veredito |
| --- | --- | --- | --- | --- |
| **A** | **Trilho com `scroll-snap` nativo** — um container que rola na horizontal, um slide por vaga | Arrasto do dedo **de graça** e sem sequestrar a rolagem vertical (`BNR-37` por construção); zero JS de gesto; zero dependência nova; reusa o padrão de rolagem que a barra do menu já usa (`useOverflowAffordance`) | O índice ativo é derivado da posição de rolagem, e **jsdom devolve 0** para toda medida — a lógica precisa ser pura e testada fora do DOM | **Escolhida** |
| B | `embla-carousel` | Pronto e testado | Dependência nova com `BL-029` aberta sobre o peso do JS inicial. Um carrossel de 4 imagens não justifica | Recusada |
| C | Trilho com `translateX` e arrasto por `pointer events` | Controle total | Reimplementa arrasto, inércia e `touch-action` à mão — tudo o que o `scroll-snap` já faz certo em ~90% dos acessos | Recusada |

### A arte por dispositivo

`<picture>` com `<source media="(min-width: 768px)">` apontando para a arte de computador e o `<img>`
caindo na de celular. **O navegador baixa uma só** (`BNR-21`), e cada fonte leva o próprio `srcset` de
rendição. `768px` é o mesmo ponto de corte que o hero e o restante da Home já usam (`md:` do Tailwind).

---

## Architecture Overview

```mermaid
graph TD
    A[/admin/home · bandeja/] -->|acrescenta hero_carousel| B[(home_sections)]
    C[HeroCarouselEditor] -->|slides: arte desktop, arte mobile, alt, destino| D[(home_section_items)]
    C -->|width: full | wide| B
    D -.on delete set null.-> E[(categories / products)]

    B --> F[useHomeSections]
    D --> F
    F --> G[resolveHomeSections · core/home]
    G --> H[HomeRenderer]
    H --> I[HeroCarousel · widgets/hero-carousel]

    I --> J[picture: source desktop / img mobile]
    J --> K[surfaceArt · core/media]
    L[menuBannerArt · core/menu] --> K

    C -->|iframe ?preview=1| H
```

O caminho é o que já existe para a grade de banners; o que entra é **um tipo**, **uma coluna** e **um
widget**. Nenhuma peça de infraestrutura nova.

---

## Code Reuse Analysis

### O que já existe e vai ser usado

| Peça | Onde | Como |
| --- | --- | --- |
| `home_section_items` | `supabase/migrations/20260815120000_*.sql` | Os slides **são** linhas dela. Ganha uma coluna |
| `destinationRefusal` | `packages/core/src/home` | A régua de "exatamente um destino para salvar". Não reescrever |
| `ctaHrefRefusal` | idem | O caminho digitado tem de ser rota que a loja serve |
| `configRefusal` | idem | A validação do `config` por tipo; ganha o ramo do tipo novo |
| `label_snapshot` | `home_section_items` | Nomear o destino apagado (`BNR-48`) |
| `DraftItem` / `curateSection` | backoffice `home-composition` / `entities/home` | O rascunho e a gravação "apaga e reescreve a lista". Ganham um campo |
| `uploadHomeImage` + `aspectRatioWarning` | backoffice `home-composition/lib` | Envio da arte e aviso de proporção (`BNR-14`). Bucket `home-images` já existe |
| `renditionUrl` / `renditionSrcSet` | `packages/core/src/media` | O dono único da URL de rendição (`BNR-23`) |
| `menuBannerArt` | `packages/core/src/menu/banners.ts` | **Passa a delegar** no dono único extraído (`BNR-22`) |
| `TAP_44` | store `shared/lib` | O alvo de toque de bolinhas e setas (`BNR-36`) |
| `useOverflowAffordance` | store `shared/lib` | Padrão de "estado vindo da posição real de rolagem", da `BL-028` |
| `sectionMeta` / `HomeBlockTray` | core + backoffice | O bloco entra na bandeja sem tela nova |

### Pontos de integração

| Sistema | Como conecta |
| --- | --- |
| `HOME_SECTION_RENDERERS` | Uma entrada nova, `hero_carousel → HeroCarousel` |
| `SECTION_EDITORS` | Uma entrada nova, `hero_carousel → { Body, refusal }` |
| `resolveHomeSections` | O tipo entra em `SOURCE_DRIVEN` e ganha frase em `EMPTY_SOURCE_REASON` |
| RLS | Nenhuma política nova: a coluna herda a da tabela. O requisito é **não afrouxar** |

---

## Components

### `surfaceArt` — o dono único da arte por dispositivo

- **Propósito**: responder "qual arte esta superfície usa, e ela é reaproveitada da outra?" — uma vez, para todo o repositório.
- **Local**: `packages/core/src/media/surfaceArt.ts`
- **Interface**:
  - `surfaceImage(desktop: string | null | undefined, mobile: string | null | undefined, surface: 'desktop' | 'mobile'): string | null` — a arte **gravada** desta superfície, com espaço aparado.
  - `surfaceArt(desktop, mobile, surface): { image: string | null; imageReused: boolean }` — com recuo para a outra.
- **Depende de**: nada. Módulo puro, sem React, sem Supabase, com extensão `.ts` explícita em todo import (regra de alcance do Deno).
- **Reusa**: é a **extração** de `menuBannerArt`/`menuBannerImage`, que passam a delegar. O comportamento medido da `39` — `"   "` **não é arte** — vem junto e continua provado pelos testes que já existem.

### `core/home/carousel.ts` — as constantes e as réguas do tipo novo

- **Propósito**: o que a loja e o painel precisam saber sobre o carrossel, num lugar só.
- **Local**: `packages/core/src/home/carousel.ts`
- **Interface**:
  - `HERO_CAROUSEL_SLOTS: { desktop: SlotSpec; mobile: SlotSpec }` — `1440×540` e `780×975`.
  - `HERO_CAROUSEL_MAX_SLIDES = 6`
  - `HERO_CAROUSEL_INTERVAL_MS = 6000`
  - `heroCarouselWidth(config): 'full' | 'wide'` — normaliza; valor desconhecido vira `full` (`BNR-20`).
  - `heroCarouselRefusal(items): string | null` — teto de slides (`BNR-13`).
  - `heroSlideArt(item, surface)` — delega em `surfaceArt`.
  - `nextSlideIndex(current, total, step)` — a aritmética circular, pura e testável fora do DOM.
  - `slideIndexFromScroll(scrollLeft, slideWidth, total)` — o índice a partir da posição de rolagem.
- **Depende de**: `core/media/surfaceArt`, `core/home/layout` (`SlotSpec`).

### `HeroCarousel` — o widget da loja

- **Propósito**: desenhar o carrossel na Home.
- **Local**: `apps/store/src/widgets/hero-carousel/`
- **Interface**: `({ section, items }: SectionRenderProps)`
- **Estrutura**:
  - `<section>` com `bg-estrelinha-ground`; `full` sem `container`, `wide` com `container` + `rounded-lg overflow-hidden`.
  - Trilho: `flex overflow-x-auto snap-x snap-mandatory` com `scrollbar` escondida; cada slide `snap-center shrink-0 w-full`.
  - Cada slide é um `<Link>` (ou `<a target="_blank">` quando externo) envolvendo o `<picture>`.
  - Vaga com `aspect-[...]` por dispositivo ⇒ altura conhecida antes da imagem (`BNR-26`).
  - Primeiro slide: `loading="eager"` + `fetchpriority="high"`; demais `lazy` (`BNR-24`).
  - **Nenhum `opacity: 0`** em ponto nenhum do arquivo (`BNR-25`).
  - Bolinhas e setas só com 2+ slides; `TAP_44`; `aria-label` nomeando o banner.
  - `aria-roledescription="carrossel"` na região, e um `aria-live="polite"` com "Banner N de M".
- **Depende de**: `useHeroCarousel` (abaixo), `core/home/carousel`, `core/media`.

### `useHeroCarousel` — o índice, o giro e a pausa

- **Propósito**: manter o índice em sincronia com a rolagem real e girar quando (e só quando) deve.
- **Local**: `apps/store/src/widgets/hero-carousel/model/useHeroCarousel.ts`
- **Interface**: `useHeroCarousel(total: number) → { index, trackRef, goTo(i), next(), prev(), paused, handlers }`
- **Regras**:
  - Gira a cada `HERO_CAROUSEL_INTERVAL_MS` **só** com `total >= 2` (`BNR-30`, `BNR-31`).
  - Pausa em `mouseenter`, `focusin` e `pointerdown`; retoma em `mouseleave`/`focusout` (`BNR-32`).
  - `useReducedMotion()` do framer-motion (já é dependência) ⇒ sem giro automático, controles vivos (`BNR-33`); e o `scrollTo` usa `behavior: 'auto'` em vez de `'smooth'`.
  - O índice sai de `slideIndexFromScroll` num listener de `scroll` — **a posição real manda**, nunca um contador paralelo.

### `HeroCarouselEditor` — o editor do painel

- **Propósito**: editar largura e slides.
- **Local**: `apps/backoffice/src/features/home-composition/ui/HeroCarouselEditor.tsx`
- **Estrutura**: seletor de largura (`full` / `wide`) + lista de slides. Cada slide: duas vagas de arte (computador e celular, com aviso de proporção e de reaproveitamento), `alt`, e o seletor de destino de três modos.
- **Reusa**: o corpo do `BannerGridEditor` para destino e envio de arte, e `menuBannerArt`→`surfaceArt` para o aviso de reaproveitamento — **o mesmo predicado que a loja usa** (`BNR-47`).
- **Não reusa** e **não escreve**: nenhum desenho do carrossel. A prévia é a loja no iframe (`AD-019`).

### Migration `20260906120000_41-banner-principal-da-home.sql`

Quatro movimentos, todos idempotentes:

1. `alter table public.home_section_items add column if not exists image_mobile_url text;`
2. Recria o `check (type in (…))` de `home_sections` com `hero_carousel` acrescentado (o `drop constraint if exists` + `add constraint` que a migration da `24` já usa).
3. `drop trigger if exists trg_home_sections_hero_guard` + `drop function if exists public.guard_hero_home_section()`.
4. Cria `public.guard_last_active_home_section()` e o gatilho `trg_home_sections_last_active_guard`, que recusa **desligar ou apagar a última seção ativa**, com `errcode = '23514'`.

**Nenhum `insert`, `update` ou `delete` de dado** — a Home semeada não é tocada (`BNR-46`).

---

## Data Models

```typescript
// packages/core/src/home/types.ts
export type HomeSectionType =
  | 'hero' | 'trust_bar' | 'banner_grid' | 'collection_rows' | 'brand_statement'
  | 'trending_tags' | 'newsletter' | 'collection_feature' | 'product_carousel'
  | 'category_grid'
  | 'hero_carousel'          // novo

/** A largura de uma seção de banner principal. */
export type HomeBannerWidth = 'full' | 'wide'

export interface HomeSectionConfig {
  // …
  /** `hero_carousel`. Ausente ou desconhecido ⇒ `full`. */
  width?: HomeBannerWidth
}

export interface HomeSectionItem {
  // …
  /** A arte do computador. Nome herdado — é a coluna que já existia. */
  image_url: string | null
  /** A arte do celular. `null` ⇒ usa a do computador, e a loja declara o reaproveitamento. */
  image_mobile_url: string | null
}

export interface ResolvedItem {
  // …
  imageUrl: string | null
  /** Só o carrossel lê; as outras seções recebem `null`. */
  imageMobileUrl: string | null
}
```

**Relações**: inalteradas. `category_id`/`product_id` continuam `on delete set null`; `section_id`
continua `on delete cascade`.

---

## Error Handling Strategy

| Cenário | Tratamento | O que a Adri / a cliente vê |
| --- | --- | --- |
| Envio da arte falha | `uploadHomeImage` devolve `error`; o editor mostra e **preserva o rascunho** | Mensagem no editor; nada digitado se perde |
| Proporção divergente | Avisa, **grava assim mesmo** | Aviso âmbar ao lado da vaga |
| Slide sem arte / sem `alt` / sem destino | `heroCarouselRefusal` → `configRefusal` → `destinationRefusal`, na ordem, com o número do slide na frente | Recusa em texto, antes de qualquer escrita |
| 7º slide | Recusa por motivo, **nunca** botão apagado | "Cabem 6 banners… crie uma segunda seção" |
| Destino apagado | Linha vira órfã (`set null`); a loja pula, o painel nomeia pelo `label_snapshot` | Slide some da loja; painel diz qual coleção era |
| Seção ligada e vazia | `resolveHomeSections` devolve `renders: false` + motivo | Linha do painel explica; a Home não desenha buraco |
| Última seção ativa | O banco recusa (`23514`); o painel exibe o motivo **do banco** | "…não é possível desligar a última seção ativa" |
| Arte responde 404 | A vaga mantém a proporção; o `alt` aparece | Sem colapso e sem deslocamento |

---

## Risks & Concerns

| Preocupação | Onde | Impacto | Mitigação |
| --- | --- | --- | --- |
| **jsdom devolve 0 para toda medida de layout** | todo o widget | O índice vindo da rolagem, a largura do slide e o `snap` **não são testáveis** por teste de componente — e o CLS/LCP tampouco | A aritmética vai para `core` (`slideIndexFromScroll`, `nextSlideIndex`) e é testada pura; o DOM é testado por **atributo** (`loading`, `fetchpriority`, `aria-*`, classes de vaga). A prova de layout é do navegador, e está declarada nos Success Criteria |
| **`useResolvedHome` monta `ResolvedItem` em 5 lugares** (`apps/store/src/widgets/home-renderer/model/useResolvedHome.ts:33,74,96,110,133`) | store | Acrescentar um campo obrigatório ao tipo obriga a tocar os cinco, e esquecer um só aparece na tela | O campo entra como `imageMobileUrl: string \| null` e os ramos que não têm arte de celular passam `null` **explicitamente**; `tsc` não pega omissão porque `strictNullChecks` é `false` — então a cobertura é por teste do `resolveItem` do carrossel |
| **O `check` de tipo é recriado por `drop`+`add`** | migration | Um `check` recriado sem um dos tipos quebraria a gravação de todas as seções daquele tipo | `homeSections.test.ts` compara o conjunto do `check` com `HOME_SECTION_TYPES` **com âncora de contagem** — a asserção já existe e passa a cobrir 11 tipos |
| **O guarda do banco muda de forma** | migration + `homeSections.test.ts` | Trocar um guarda por outro é o momento clássico de ficar sem nenhum | O teste que hoje assere `guard_hero_home_section` é **reescrito para o guarda novo na mesma task**, com asserção de que a função antiga **não existe mais** — os dois sentidos |
| **`strictNullChecks: false` não estreita união booleana** | réguas novas | Um veredito `{ ok: false; reason }` daria TS2339 ao ler `reason` | Toda recusa desta feature é `string \| null`, como as vizinhas |
| **Corrida de dois administradores** | trigger da última ativa | Duas transações simultâneas podem desligar as duas últimas | **Aceita e declarada** na spec. A loja tem uma administradora |
| **`prefers-reduced-motion` exige `matchMedia`**, ausente em jsdom | `useHeroCarousel` | Teste quebra por `matchMedia is not a function` | `useReducedMotion` do framer-motion já trata a ausência; os testes que precisam do ramo reduzido injetam `window.matchMedia` |

---

## Tech Decisions

| Decisão | Escolha | Racional |
| --- | --- | --- |
| Onde moram os slides | `home_section_items` + coluna | `AD-014`: referência precisa de FK de verdade |
| Motor do carrossel | `scroll-snap` nativo | Arrasto e não-sequestro da rolagem de graça; zero dependência (`BL-029` está aberta) |
| Arte por dispositivo | `<picture>` + `<source media>` | O navegador baixa **uma** |
| Ponto de corte | `768px` (`md:`) | O mesmo que a Home inteira já usa |
| Dono do predicado da arte | `core/media/surfaceArt`, com `menuBannerArt` delegando | O "defeito 01": dois consumidores ⇒ `packages/core`. Reescrevê-lo no painel **já** custou uma divergência silenciosa na `39` |
| `BNR-39` ("slide oculto sai do teclado") | **Realizado por construção, e a redação diverge** | Com trilho de rolagem os slides não estão *escondidos*: estão fora da vista num container rolável, e dar Tab neles os traz para a vista — que é o comportamento correto de um scroller, não o foco invisível que a AC queria proibir. **A propriedade cobrada continua sendo provada**: nenhum elemento focável fica visualmente oculto enquanto focado. Registrado aqui e repetido no `validation.md` |

> **Decisões de projeto** — vão para `.specs/STATE.md` `## Decisions`:
> - **`AD-029`** — a Home não tem bloco indelével; a invariante é "sempre resta uma seção ativa".
> - **`AD-030`** — "a arte desta superfície, com recuo para a da outra" tem **um** dono, em `core/media`.

---

## Guardas que esta feature mexe ou cria

| Guarda | O que muda |
| --- | --- |
| `homeSections.test.ts` | O catálogo passa a ter 11 tipos (âncora de contagem sobe). O bloco `HOME-08` é **reescrito** para o guarda da última seção ativa, com asserção de que `guard_hero_home_section` **não existe mais** |
| `previaUnica.test.ts` | Passa a recusar também um segundo desenho do **carrossel** no painel |
| `surfaceArtSingleOwner.test.ts` *(novo)* | Recusa qualquer arquivo de `apps/**` ou `packages/**`, fora de `core/media/surfaceArt.ts`, que reimplemente o recuo de arte (`image_mobile` com `\|\|`, ternário entre as duas artes). **Âncora dupla** e sensor de comentário |
| `heroCarouselSemOpacidadeZero.test.ts` *(novo)* | `opacity: 0` em qualquer ponto de `HeroCarousel.tsx` — variant, classe ou prop inline. Molde de `heroSemOpacidadeZero.test.ts`, e ancorado em **três** grafias, porque a lição da `40` foi que guarda ancorado em sintaxe guarda a sintaxe |
| `touchTarget.test.ts` | Não muda de régua; os controles novos entram na varredura |
| `renditionSingleOwner.test.ts` | Não muda de régua; o widget novo passa a ser varrido |
