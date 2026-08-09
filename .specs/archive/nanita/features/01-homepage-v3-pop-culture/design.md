# HomePage v3 — Pop Culture Redesign — Design

## Design Source

Paper file: **Nanapin** → Page: **Home**
- Desktop: Artboard `HomePage Desktop v3 - Pop Culture` (1440×3929)
- Mobile: Artboard `HomePage Mobile v3 - Pop Culture` (390×4084)

---

## 1. Design Tokens — Mudanças v2 → v3

### 1.1 Paleta de Cores

| Token | v2 (atual) | v3 (novo) | Uso |
|-------|-----------|----------|-----|
| `--nana-bg` | `#F5F3FF` | `#FFF9F5` | Background geral (warm cream) |
| `--nana-bg-alt` | `#FFFFFF` | `#FFFFFF` | Sem mudança |
| `--nana-card` | `#FFFFFF` | `#FFFFFF` | Sem mudança |
| `--nana-elevated` | `#EDE9FE` | `#F3EFF8` | Cards elevados, backgrounds sutis |
| `--nana-text` | `#1E1A3E` | `#1A0F2E` | Texto principal |
| `--nana-text-secondary` | `#6B5FA6` | `#5A4E6F` | Texto secundário |
| `--nana-border` | `#EDE9FE` | `#F0EAF5` | Bordas |
| `--nana-border-hover` | `rgba(124,58,237,0.3)` | `rgba(108,60,233,0.3)` | Bordas hover |
| `--nana-violet` | `#7C3AED` | `#6C3CE9` | Primária brand |
| `--nana-pink` | `#F0057A` | `#FF3B7F` | Accent/CTA pink |
| `--nana-yellow` | `#FFE600` | `#FFD23F` | Badges ("MAIS POPULAR") |
| **NOVO** `--nana-dark` | — | `#1A0F2E` | Footer, marquee bar, botões escuros |

### 1.2 Gradientes

| Token | v2 | v3 |
|-------|----|----|
| `--nana-gradient-cta` | `linear-gradient(135deg, #7C3AED, #F0057A)` | `linear-gradient(135deg, #FF3B7F, #6C3CE9)` |
| `--nana-gradient-hero` | `linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 50%, #F5F3FF 100%)` | `linear-gradient(135deg, #FF3B7F08, #6C3CE908)` |
| `--nana-gradient-card` | `linear-gradient(135deg, rgba(124,58,237,0.04), rgba(240,5,122,0.04))` | `linear-gradient(145deg, #6C3CE9, #3A2578)` |
| **NOVO** `--nana-gradient-dark` | — | `linear-gradient(145deg, #1A0F2E, #2D1B69)` |

### 1.3 Tipografia

| Token | v2 | v3 |
|-------|----|----|
| `font-heading` | Outfit (600-800) | Outfit (600-800) — mantém |
| `font-body` | DM Sans (400-700) | DM Sans (400-700) — mantém |
| **NOVO** `font-display` | — | **Lilita One** (400) — títulos display, hero, section headings |

**Google Fonts a carregar**: Lilita One:400

**Uso do font-display (Lilita One)**:
- Hero headline: 64px desktop / 42px mobile
- Section headings ("Tá Bombando", "Monte seu Kit", etc.): 26px desktop / 24px mobile
- Drop countdown título: 28px
- Logo "NanaPin": 22px

### 1.4 Shadcn/UI Tokens (HSL)

| Token | v2 HSL | v3 HSL |
|-------|--------|--------|
| `--primary` | `263 84% 55%` | `255 83% 57%` (≈ #6C3CE9) |
| `--accent` | `330 98% 48%` | `346 100% 62%` (≈ #FF3B7F) |
| `--background` | `263 100% 97%` | `25 100% 98%` (≈ #FFF9F5) |
| `--foreground` | `250 40% 17%` | `258 51% 12%` (≈ #1A0F2E) |
| `--border` | `263 68% 94%` | `270 30% 94%` (≈ #F0EAF5) |
| `--ring` | `263 84% 55%` | `255 83% 57%` |

### 1.5 Border Radius (sem mudanças)

Mantém: `--radius: 0.75rem`, `rounded-2xl: 1.25rem`, `pill: 999px`

**Novo padrão**: `rounded-[20px]` para product cards e kit cards

---

## 2. Seções da HomePage — Ordem e Layout

### Desktop (1440px)

```
┌──────────────────────────────────┐
│         Desktop Header           │ ← tokens atualizados
├──────────────────────────────────┤
│     Hero (text left | imgs right)│ ← REDESIGN
├──────────────────────────────────┤
│       Marquee Trust Bar          │ ← NOVO (substitui TrustBar)
├──────────────────────────────────┤
│  Drop Countdown  │  Categories   │ ← COMBINADOS lado a lado
├──────────────────────────────────┤
│     Trending Products (4 cols)   │ ← REDESIGN
├──────────────────────────────────┤
│     Monte Seu Kit (3 tiers)      │ ← REDESIGN
├──────────────────────────────────┤
│     Fan Picks (4 cols)           │ ← REDESIGN
├──────────────────────────────────┤
│ Trending Tags │ Social Proof     │ ← NOVO (combinados)
├──────────────────────────────────┤
│       Newsletter CTA             │ ← REDESIGN
├──────────────────────────────────┤
│         Desktop Footer           │ ← tokens atualizados
└──────────────────────────────────┘
```

### Mobile (390px)

```
┌─────────────────┐
│  Mobile Header  │
├─────────────────┤
│   Hero (stack)  │
├─────────────────┤
│  Marquee Bar    │
├─────────────────┤
│  Drop Alert     │
├─────────────────┤
│  Categories     │
├─────────────────┤
│ Trending (2col) │
├─────────────────┤
│ Monte Kit       │
├─────────────────┤
│ Fan Picks (2col)│
├─────────────────┤
│ Trending Tags   │
├─────────────────┤
│ Social Proof    │
├─────────────────┤
│ Newsletter CTA  │
├─────────────────┤
│ Mobile Footer   │
├─────────────────┤
│ Mobile Bottom   │
└─────────────────┘
```

---

## 3. Specs por Componente

### 3.1 HeroBanner

**Layout Desktop**: Flex row, `justify-between`, `align-center`, padding `64px 80px 80px`
**Layout Mobile**: Flex column, padding `32px 20px`

**Conteúdo texto (esquerda)**:
- Pill badge: "Drops toda sexta — novos pins semanais", bg gradient sutil, border pink/30%, rounded-full
- Título: Lilita One 64px/70px desktop, 42px/46px mobile
  - Linha 1: "Cole no peito," → `#1A0F2E`
  - Linha 2: "carrega no" → `#FF3B7F`
  - Linha 3: "coração." → `#6C3CE9`
- Subtítulo: DM Sans 18px/28px, `#5A4E6F`, max-w 460px
- CTAs:
  - Primário: gradient pink→dark pink, rounded-[16px], padding 16px 32px, texto branco, ícone arrow
  - Secundário: outlined, border 2px `#1A0F2E`, rounded-[16px], padding 14px 28px
- Social proof: 3 avatares sobrepostos + "+2.000 colecionadores felizes" DM Sans 14px

**Conteúdo imagens (direita)**: Grid 2×2 de 180×200px rounded-[20px] com product images
**Mobile**: Esconde grid de imagens, mostra decorative shapes

**Decorative shapes**: 3 retângulos com rounded corners, rotações, gradientes sutis (absoluto)

### 3.2 MarqueeBar (substitui TrustBar)

**Background**: `#1A0F2E` (dark)
**Height**: 44px desktop, 38px mobile
**Texto**: branco, DM Sans 14px/16px desktop, 12px/14px mobile
**Itens**: "⚡ Frete Grátis acima de R$150" ✦ "Pix com 5% off" ✦ "Parcele em 12x" ✦ "Troca Garantida em 7 dias" ✦ "Drops toda sexta"
**Animação**: CSS marquee contínuo (duplicar conteúdo, translate-x animation)

### 3.3 DropCountdown (redesign)

**Container desktop**: 460px largura, gradient escuro `(145deg, #1A0F2E → #2D1B69)`, rounded-24px, padding 40px 36px
**Container mobile**: full-width, mesmas specs

**Conteúdo**:
- Pill: "Drop nesta sexta", bg `#FF3B7F33`, text `#FF3B7F`, uppercase, Outfit 700 12px
- Título: "Novos pins chegando!", Lilita One 28px, branco
- Timer: 4 blocos (dias/horas/min/seg), bg `rgba(255,255,255,0.1)`, rounded-12px
  - Número: Outfit 700 32px, branco
  - Label: DM Sans 12px, `rgba(255,255,255,0.6)`
- CTA: "Ativar lembrete" com ícone sino, bg transparente, border branco/20%, rounded-full

**Decorative shapes**: 2 retângulos coloridos (absoluto)

### 3.4 CategoryGrid (redesign)

**Header**: "Coleções" Lilita One 26px + "Ver todas →" DM Sans 16px link
**Grid Desktop**: 3 colunas × 2 linhas, gap 16px, cards 244×140px
**Grid Mobile**: 2 colunas × 3 linhas, gap 10px

**Category Card**:
- Gradient background (145deg, #6C3CE9 → #3A2578) — cada categoria cor diferente
- rounded-[18px], padding 16px
- Texto: nome Outfit 800 20px branco, contagem DM Sans 12px branco/70%
- Ícone: 40px × 40px (mobile) para categorias com emoji

### 3.5 ProductCard (redesign)

**Container**: flex-col, gap 12px
**Imagem**: aspect square (280px desktop), rounded-[20px], bg `#F3EFF8`
- Badge "NEW": absolute top-left, bg white, rounded-full, DM Sans 11px, `#FF3B7F`
- Badge "Destaque": absolute top-left, bg `#FF3B7F`, text white
- Botão wishlist: absolute top-right, heart icon, 32×32
- Botão add: absolute bottom-right, rounded-full, bg `#1A0F2E`, ícone +, 36×36

**Info**:
- Categoria: DM Sans 12px, `#5A4E6F`, uppercase
- Nome: DM Sans 15px, `#1A0F2E`, font-weight 600
- Preço: DM Sans 16px, `#FF3B7F`, font-weight 700
- Preço antigo: line-through, `#9B8EC4`, 13px (quando aplicável)

### 3.6 MonteSeuKit (redesign)

**Header**: "Monte seu Kit" Lilita One 26px + "— quanto mais, mais barato" DM Sans 16px muted
**Layout Desktop**: 3 cards lado a lado, flex, gap 16px, grow 1
**Layout Mobile**: Horizontal compacto + CTA full-width

**Kit Card (tier normal)**:
- bg `#F3EFF8`, rounded-[20px], padding 32px 24px, flex-col center, gap 12px
- Ícones: 3-5 círculos coloridos representando bottons
- Quantidade: Outfit 800 40px, `#1A0F2E`
- "bottons por": DM Sans 14px, `#5A4E6F`
- Preço: Lilita One 24px, `#6C3CE9`
- Per-unit: DM Sans 12px, muted
- CTA: bg `#1A0F2E`, text white, rounded-12px, full-width

**Kit Card (tier popular — 5 bottons)**:
- bg gradient `(145deg, #6C3CE9 → #3A2578)`, text tudo branco
- Badge "MAIS POPULAR": absolute top, bg `#FFD23F`, text `#1A0F2E`, rounded-8px
- CTA: bg white, text `#1A0F2E`

### 3.7 TrendingTags (NOVO)

**Header**: "Explore por Tema" Lilita One 26px
**Layout**: flex wrap, gap 12px
**Tag pill**: bg gradient `(135deg, #6C3CE9 → #3A2578)`, text white, DM Sans 600 14px, rounded-full, padding 10px 20px
**Tags**: #NarutoClassic, #BTS, #StudioGhibli, #OnePiece, #Pokémon, #Blackpink, #JujutsuKaisen, #StarWars, #DemonSlayer, #StrayKids, #DragonBall, #Twice

### 3.8 SocialProof (NOVO)

**Container**: bg `#F3EFF8`, rounded-24px, padding 32px
**Header**: "O que a galera diz" Outfit 700 22px + "+2.000 clientes felizes" DM Sans 14px muted

**Testimonial Card**:
- bg white, rounded-16px, padding 18px, gap 12px
- 5 estrelas SVG (14×14, amarelas `#FFD23F`)
- Citação: DM Sans 14px, `#1A0F2E`, entre aspas
- Footer: Avatar 32px rounded-full + Nome Outfit 600 14px + Cidade DM Sans 12px muted

**Desktop**: Lado a lado com TrendingTags (Tags 760px | Social 480px)
**Mobile**: Stacked abaixo de TrendingTags

### 3.9 NewsletterBanner (redesign)

**Container**: gradient `(135deg, #6C3CE9 → #FF3B7F)`, rounded-24px
**Layout Desktop**: flex row, conteúdo esquerda (960px) + highlight direita (320px)

**Conteúdo esquerda**:
- Título: "Entra pro Clube NanaPin" Lilita One 32px branco
- Subtítulo: DM Sans 16px branco/80%
- Form: input bg white/90% + botão "Quero 10% OFF" bg white text violet, rounded-full
- Disclaimer: DM Sans 12px branco/60%

**Highlight direita**:
- "10%" grande (Lilita One 48px branco), "OFF" abaixo
- "no primeiro pedido" DM Sans 14px branco/80%

**Mobile**: Stack vertical, "10% OFF" topo, form full-width

---

## 4. Arquivos Impactados

### Tema/Design System
- `src/index.css` — CSS variables, utility classes
- `tailwind.config.ts` — fonts, colors
- `index.html` — Google Fonts link

### Componentes HomePage
- `src/components/home/HeroBanner.tsx` — redesign completo
- `src/components/home/TrustBar.tsx` → renomear para `MarqueeBar.tsx`
- `src/components/home/DropCountdown.tsx` — redesign
- `src/components/home/CategoryGrid.tsx` — redesign
- `src/components/home/ProductCarousel.tsx` — redesign cards
- `src/components/home/MonteSeuKit.tsx` — redesign completo
- `src/components/home/NewsletterBanner.tsx` — redesign
- **NOVO** `src/components/home/TrendingTags.tsx`
- **NOVO** `src/components/home/SocialProof.tsx`

### Página
- `src/pages/HomePage.tsx` — nova composição de seções

### Store Components (afetados por tokens)
- `src/components/store/ProductCard.tsx` — redesign visual
