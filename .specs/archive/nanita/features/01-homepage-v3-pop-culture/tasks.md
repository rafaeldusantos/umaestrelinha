# HomePage v3 — Pop Culture Redesign — Tasks

**Design**: `.specs/features/01-homepage-v3-pop-culture/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Foundation (Sequential)

Design tokens e tipografia — tudo depende disso.

```
T1 → T2 → T3
```

### Phase 2: Componentes Independentes (Parallel OK)

Cada componente pode ser desenvolvido em paralelo após tokens.

```
       ┌→ T4  (HeroBanner)    ─┐
       ├→ T5  (MarqueeBar)    ─┤
       ├→ T6  (DropCountdown) ─┤
T3 ────├→ T7  (CategoryGrid)  ─┤──→ T13
       ├→ T8  (ProductCard)   ─┤
       ├→ T9  (MonteSeuKit)   ─┤
       ├→ T10 (TrendingTags)  ─┤
       ├→ T11 (SocialProof)   ─┤
       └→ T12 (Newsletter)    ─┘
```

### Phase 3: Composição (Sequential)

Montar a página com todos os componentes prontos.

```
T13 (HomePage composition) → T14 (Review visual)
```

---

## Task Breakdown

### T1: Atualizar Google Fonts e Tailwind Config

**What**: Adicionar Lilita One ao HTML e configurar `font-display` no Tailwind.
**Where**: `index.html`, `tailwind.config.ts`
**Depends on**: None
**Requirement**: P1-DesignSystem

**Done when**:
- [ ] `index.html` carrega Lilita One via Google Fonts
- [ ] `tailwind.config.ts` tem `font-display: ["Lilita One", ...]`
- [ ] `tailwind.config.ts` cores `nana-yellow` e `nana-dark` adicionadas
- [ ] Build sem erros

**Tests**: none
**Gate**: build

---

### T2: Atualizar CSS Variables (index.css)

**What**: Migrar todas as CSS variables para a paleta v3.
**Where**: `src/index.css`
**Depends on**: T1
**Requirement**: P1-DesignSystem

**Done when**:
- [ ] `--nana-bg` atualizado para `#FFF9F5`
- [ ] `--nana-text` atualizado para `#1A0F2E`
- [ ] `--nana-violet` atualizado para `#6C3CE9`
- [ ] `--nana-pink` atualizado para `#FF3B7F`
- [ ] `--nana-elevated` atualizado para `#F3EFF8`
- [ ] `--nana-text-secondary` atualizado para `#5A4E6F`
- [ ] `--nana-border` atualizado para `#F0EAF5`
- [ ] `--nana-yellow` atualizado para `#FFD23F`
- [ ] `--nana-dark` adicionado como `#1A0F2E`
- [ ] Gradientes atualizados (cta, hero, card, dark novo)
- [ ] Tokens HSL do shadcn atualizados para match
- [ ] Remove import do Syne (não usado)
- [ ] Build sem erros

**Tests**: none
**Gate**: build

---

### T3: Validar tokens globais

**What**: Verificar que build compila, dev server roda, e cores renderizam corretamente.
**Where**: Terminal + browser
**Depends on**: T2

**Done when**:
- [ ] `bun run build` passa sem erros
- [ ] Dev server mostra background warm cream
- [ ] Nenhum componente existente quebrado visualmente
- [ ] Fonte Lilita One carrega no browser

**Tests**: none (visual check)
**Gate**: build

---

### T4: Redesenhar HeroBanner [P]

**What**: Reescrever HeroBanner com layout split, tipografia Lilita One multicolorida, CTAs e social proof.
**Where**: `src/components/home/HeroBanner.tsx`
**Depends on**: T3
**Requirement**: P1-Hero

**Done when**:
- [ ] Layout split: texto esquerda, grid imagens direita (desktop)
- [ ] Layout stack vertical (mobile)
- [ ] Título em Lilita One 64px com 3 cores (dark, pink, purple)
- [ ] Pill badge "Drops toda sexta" com borda sutil
- [ ] CTA primário gradient pink + CTA secundário outlined
- [ ] Social proof avatares + texto
- [ ] Decorative shapes flutuantes
- [ ] Framer Motion animações preservadas
- [ ] Build sem erros

**Tests**: none
**Gate**: build

---

### T5: Criar MarqueeBar (substituir TrustBar) [P]

**What**: Criar componente MarqueeBar com animação marquee contínua, substituindo TrustBar.
**Where**: `src/components/home/MarqueeBar.tsx` (novo), deletar `TrustBar.tsx`
**Depends on**: T3
**Requirement**: P1-Marquee

**Done when**:
- [ ] Background `#1A0F2E`, texto branco
- [ ] 5 itens trust com ✦ separadores
- [ ] Animação CSS marquee contínua (infinite scroll)
- [ ] Conteúdo duplicado para loop seamless
- [ ] Responsivo (38px mobile, 44px desktop)
- [ ] `TrustBar.tsx` removido
- [ ] Build sem erros

**Tests**: none
**Gate**: build

---

### T6: Redesenhar DropCountdown [P]

**What**: Reescrever DropCountdown com visual de card escuro, pill badge, timer e CTA.
**Where**: `src/components/home/DropCountdown.tsx`
**Depends on**: T3
**Requirement**: P1-DropCategories

**Done when**:
- [ ] Container com gradient escuro e rounded-24px
- [ ] Pill "Drop nesta sexta" com bg pink/20%, text pink
- [ ] Título "Novos pins chegando!" em Lilita One branco
- [ ] Timer com 4 blocos (dias/horas/min/seg) em bg branco/10%
- [ ] CTA "Ativar lembrete" com ícone sino
- [ ] Decorative shapes
- [ ] Lógica de countdown preservada
- [ ] Build sem erros

**Tests**: none
**Gate**: build

---

### T7: Redesenhar CategoryGrid [P]

**What**: Reescrever CategoryGrid com cards gradient e layout responsivo.
**Where**: `src/components/home/CategoryGrid.tsx`
**Depends on**: T3
**Requirement**: P1-DropCategories

**Done when**:
- [ ] Header "Coleções" + "Ver todas →"
- [ ] Cards com gradient backgrounds, rounded-[18px]
- [ ] Nome em Outfit 800, contagem em DM Sans
- [ ] Grid 3×2 desktop, 2×3 mobile
- [ ] Cada categoria com cor/gradiente distinto
- [ ] Links para páginas de categoria preservados
- [ ] Build sem erros

**Tests**: none
**Gate**: build

---

### T8: Redesenhar ProductCard [P]

**What**: Atualizar ProductCard com novo visual (badges, botões overlay, preço colorido).
**Where**: `src/components/store/ProductCard.tsx`
**Depends on**: T3
**Requirement**: P1-Products

**Done when**:
- [ ] Imagem rounded-[20px] com bg `#F3EFF8`
- [ ] Badge "NEW" / "Destaque" absolute top-left
- [ ] Botão wishlist heart absolute top-right
- [ ] Botão add (+) absolute bottom-right, bg dark, rounded-full
- [ ] Categoria label em uppercase 12px
- [ ] Preço em `#FF3B7F` bold
- [ ] Preço antigo com line-through quando aplicável
- [ ] Framer Motion animações preservadas
- [ ] Build sem erros

**Tests**: none
**Gate**: build

---

### T9: Redesenhar MonteSeuKit [P]

**What**: Reescrever MonteSeuKit com 3 tier cards (normal/popular/normal).
**Where**: `src/components/home/MonteSeuKit.tsx`
**Depends on**: T3
**Requirement**: P1-MonteKit

**Done when**:
- [ ] Header "Monte seu Kit" + subtítulo muted
- [ ] 3 cards: tier 3 (normal), tier 5 (popular/gradient), tier 10 (normal)
- [ ] Tier 5: gradient roxo, badge "MAIS POPULAR" amarelo, CTA branco
- [ ] Tiers normais: bg elevated, CTA dark
- [ ] Preço por unidade em cada card
- [ ] Ícones de bottons coloridos no topo de cada card
- [ ] Mobile: layout compacto + CTA full-width "Montar meu Kit →"
- [ ] Build sem erros

**Tests**: none
**Gate**: build

---

### T10: Criar TrendingTags [P]

**What**: Criar novo componente TrendingTags com pills de hashtags clicáveis.
**Where**: `src/components/home/TrendingTags.tsx` (novo)
**Depends on**: T3
**Requirement**: P2-Tags

**Done when**:
- [ ] Heading "Explore por Tema" em Lilita One
- [ ] Pills com gradient roxo, texto branco, rounded-full
- [ ] 12 tags temáticas (NarutoClassic, BTS, StudioGhibli, etc.)
- [ ] Cada tag navega para `/search?q=[tag]`
- [ ] Layout flex-wrap responsivo
- [ ] Build sem erros

**Tests**: none
**Gate**: build

---

### T11: Criar SocialProof [P]

**What**: Criar novo componente SocialProof com testimonials.
**Where**: `src/components/home/SocialProof.tsx` (novo)
**Depends on**: T3
**Requirement**: P2-Social

**Done when**:
- [ ] Container bg `#F3EFF8`, rounded-24px
- [ ] Header "O que a galera diz" + "+2.000 clientes felizes"
- [ ] 2 testimonial cards: bg white, rounded-16px
- [ ] Cada card: 5 estrelas + citação + avatar/nome/cidade
- [ ] Dados estáticos (hardcoded por enquanto)
- [ ] Build sem erros

**Tests**: none
**Gate**: build

---

### T12: Redesenhar NewsletterBanner [P]

**What**: Reescrever NewsletterBanner com gradient, destaque "10% OFF" e form.
**Where**: `src/components/home/NewsletterBanner.tsx`
**Depends on**: T3
**Requirement**: P2-Newsletter

**Done when**:
- [ ] Container gradient violet→pink, rounded-24px
- [ ] Desktop: conteúdo esquerda + "10% OFF" direita
- [ ] Mobile: stack vertical com "10% OFF" no topo
- [ ] "Entra pro Clube NanaPin" em Lilita One branco
- [ ] Form: input + botão "Quero 10% OFF"
- [ ] Disclaimer "Sem spam..."
- [ ] Lógica de submit preservada
- [ ] Decorative shapes
- [ ] Build sem erros

**Tests**: none
**Gate**: build

---

### T13: Compor HomePage com novas seções

**What**: Atualizar HomePage.tsx para montar todas as seções na ordem v3 com layouts combinados.
**Where**: `src/pages/HomePage.tsx`
**Depends on**: T4, T5, T6, T7, T8, T9, T10, T11, T12
**Requirement**: Todos

**Done when**:
- [ ] Import e render de todas as seções na ordem correta
- [ ] Seção Drop + Categories em layout side-by-side (desktop) / stack (mobile)
- [ ] Seção Tags + Social Proof em layout side-by-side (desktop) / stack (mobile)
- [ ] MarqueeBar no lugar de TrustBar
- [ ] ProductCarousel usa "Tá Bombando" com badge HOT
- [ ] ProductCarousel usa "A Galera Ama" com estrelas
- [ ] Build sem erros

**Tests**: none
**Gate**: build

---

### T14: Revisão visual final

**What**: Comparar resultado com Paper artboards e ajustar detalhes.
**Where**: Todos os componentes
**Depends on**: T13

**Done when**:
- [ ] Desktop match visual com Paper "HomePage Desktop v3 - Pop Culture"
- [ ] Mobile match visual com Paper "HomePage Mobile v3 - Pop Culture"
- [ ] Sem regressões em rotas existentes
- [ ] Performance: LCP < 2.5s

**Tests**: none (visual review)
**Gate**: build

---

## Pre-Approval Checks

### Check 1: Task Granularity ✅

| Task | Atomic? | Reason |
|------|---------|--------|
| T1 | ✅ | 2 arquivos config, mesmo concern (fonts/colors config) |
| T2 | ✅ | 1 arquivo (index.css) |
| T3 | ✅ | Validação, não produz código |
| T4 | ✅ | 1 componente (HeroBanner) |
| T5 | ✅ | 1 componente (MarqueeBar) |
| T6 | ✅ | 1 componente (DropCountdown) |
| T7 | ✅ | 1 componente (CategoryGrid) |
| T8 | ✅ | 1 componente (ProductCard) |
| T9 | ✅ | 1 componente (MonteSeuKit) |
| T10 | ✅ | 1 componente novo (TrendingTags) |
| T11 | ✅ | 1 componente novo (SocialProof) |
| T12 | ✅ | 1 componente (NewsletterBanner) |
| T13 | ✅ | 1 arquivo composição (HomePage) |
| T14 | ✅ | Revisão visual, sem código novo |

### Check 2: Diagram-Definition Cross-Check ✅

| Task | Depends on (def) | Matches diagram? |
|------|-------------------|------------------|
| T1 | None | ✅ Start node |
| T2 | T1 | ✅ T1 → T2 |
| T3 | T2 | ✅ T2 → T3 |
| T4 | T3 | ✅ T3 → T4 (parallel) |
| T5 | T3 | ✅ T3 → T5 (parallel) |
| T6 | T3 | ✅ T3 → T6 (parallel) |
| T7 | T3 | ✅ T3 → T7 (parallel) |
| T8 | T3 | ✅ T3 → T8 (parallel) |
| T9 | T3 | ✅ T3 → T9 (parallel) |
| T10 | T3 | ✅ T3 → T10 (parallel) |
| T11 | T3 | ✅ T3 → T11 (parallel) |
| T12 | T3 | ✅ T3 → T12 (parallel) |
| T13 | T4-T12 | ✅ All parallel → T13 |
| T14 | T13 | ✅ T13 → T14 |

### Check 3: Test Co-location ✅

Nenhum TESTING.md existe. Projeto não tem cobertura de testes nos componentes visuais. Todos os tasks usam `gate: build` (TypeScript + Vite build check).
