# Identidade Papelaria (Nanita v2) — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source
of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/19-identidade-papelaria/design.md`
**Status**: Done

---

## Test Coverage Matrix

> Gerada do codebase + `CLAUDE.md` + spec. Guidelines encontradas: `CLAUDE.md` (gates de qualidade:
> "sem erros novos" de lint contra 30 err / 9 warn; `tsc --noEmit` baseline **0**; `pnpm build` não
> faz typecheck; toda tela nova precisa de prova em viewport móvel 390×844), `apps/store/vite.config.ts`
> (vitest jsdom, `src/**/*.{test,spec}.{ts,tsx}`). Sem threshold de cobertura configurado.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Token / tema (`App.css`, `tailwind.config.ts`) | unit | 1:1 com as ACs de `PAP-01`/`PAP-03`: os 10 valores, concordância entre os dois arquivos, os 5 pisos de contraste, a guarda `sugar × paper ≥ 1,15` | `src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @nanapin/store test` |
| Componente de UI compartilhado (`shared/ui/**`) | unit | Todas as variantes/props declaradas no design + os edge cases listados no spec | `src/shared/ui/**/__tests__/*.test.tsx` | `pnpm --filter @nanapin/store test` |
| Regra de repo / varredura de fonte | unit | A regra declarada na AC, provada contra o fonte real (não contra um fixture) | `src/shared/**/__tests__/*.test.ts` | `pnpm --filter @nanapin/store test` |
| Asset estático + `index.html` | unit | Existência, `viewBox`/`rx`, e as quatro declarações de `<link>`/`meta` | `src/app/__tests__/*.test.ts` | `pnpm --filter @nanapin/store test` |
| Widget / feature de home (revestimento) | unit | Regressão dos testes existentes + AC de cor/forma quando a AC nomeia um valor (ritmo do card de coleção, preço em Carmim, fita sobre Grafite) | `src/**/__tests__/*.test.tsx` | `pnpm --filter @nanapin/store test` |
| Documentação (`DESIGN.md`, `CLAUDE.md`, README de marca) | none | — (revisão de leitura) | — | — |

## Gate Check Commands

| Gate Level | Quando | Comando |
|---|---|---|
| **quick** | Depois de task com teste unitário | `pnpm --filter @nanapin/store test` |
| **full** | Depois de task que mexe em token ou em componente consumido por várias telas | `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json` |
| **build** | Fecho de fase | `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json && pnpm --filter @nanapin/store build && pnpm --filter @nanapin/store lint` |
| **visual** | Toda task de home | Screenshot em **390×844** antes de 1440×900, comparado ao artboard 23 / 22 |

Baselines a respeitar (`CLAUDE.md`): `tsc` = **0 erros**; lint = **sem erros novos** contra
30 err / 9 warn (loja: 2 err / 2 warn).

---

## Execution Plan

### Fase 1 — Fundação de token (5 tasks)

Sem isso nada mais faz sentido: a paleta é o alicerce e a guarda de contraste é o que impede a
regressão silenciosa que o README da marca previu.

```
T1 → T2 → T3 → T4 → T5
```

### Fase 2 — Forma do botão (4 tasks)

```
T6 → T7 → T8 → T9
```

### Fase 3 — A marca em vetor (5 tasks)

```
T10 → T11 → T12 → T13 → T14
```

### Fase 4 — Favicon e cabeça do documento (3 tasks)

```
T15 → T16 → T17
```

### Fase 5 — Home: topo e hero (4 tasks)

```
T18 → T19 → T20 → T21
```

### Fase 6 — Home: catálogo e kit (4 tasks)

```
T22 → T23 → T24 → T25
```

### Fase 7 — Home: prova social, newsletter e rodapé (4 tasks)

```
T26 → T27 → T28 → T29
```

### Fase 8 — Documentação e fecho (3 tasks)

```
T30 → T31 → T32
```

---

## Task Breakdown

### T1: Tokens papelaria no `App.css`

**What**: Trocar os 8 valores `--nanita-*`, acrescentar `--nanita-paper` e `--nanita-rule`, remapear
os `--nana-*` legados e os tokens shadcn em HSL para a paleta nova.
**Where**: `apps/store/src/app/App.css`
**Depends on**: None
**Reuses**: estrutura de blocos já existente no arquivo (marca → legado → shadcn)
**Requirement**: PAP-01, PAP-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Os 10 tokens valem exatamente os hexes da AC1 de P1
- [ ] `body` usa `--nanita-paper` (não `#FFFFFF`)
- [ ] `--primary` = Carmim, `--background` = Papel, `--muted-foreground` = Carbono, `--border`/`--input` = Dobra, `--ring` = Carmim, em HSL
- [ ] `.gradient-cta` e as demais classes legadas resolvem para a cor papelaria equivalente
- [ ] Gate: `pnpm --filter @nanapin/store test` (suíte atual continua verde)

**Tests**: none *(a suíte que prova este arquivo nasce em T3 — ver "Resolvendo dependências de compilação" abaixo)*
**Gate**: quick
**Commit**: `feat(store): a paleta papelaria entra nos tokens de CSS`

---

### T2: Tokens papelaria no Tailwind da loja

**What**: Espelhar a paleta em `colors.nanita.*` / `colors.nana.*`, acrescentar `paper` e `rule`,
recalibrar as três sombras para o Selo e remover `fontFamily.logo`.
**Where**: `apps/store/tailwind.config.ts`
**Depends on**: T1
**Reuses**: bloco `theme.extend` existente
**Requirement**: PAP-01, PAP-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `colors.nanita` tem os 10 tokens com os mesmos hexes de T1
- [ ] `boxShadow.nanita-{soft,lift,ink}` derivam de `#E93A6D` / Grafite
- [ ] `fontFamily.logo` removido
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: none *(provado por T3)*
**Gate**: quick
**Commit**: `feat(store): a paleta papelaria entra no Tailwind da loja`

---

### T3: Suíte da paleta — valores, concordância e contraste

**What**: Teste que lê `App.css` **e** `tailwind.config.ts`, prova que concordam, e calcula o
contraste WCAG 2.1 de cada token sobre Papel contra os pisos declarados.
**Where**: `apps/store/src/shared/lib/contrast.ts` (função pura) + `apps/store/src/shared/lib/__tests__/palette.test.ts`
**Depends on**: T2
**Reuses**: —
**Requirement**: PAP-01, PAP-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `contrast(hexA, hexB)` implementa a fórmula de luminância relativa da WCAG 2.1
- [ ] Teste assere os 10 hexes e a **concordância** entre os dois arquivos
- [ ] Teste assere os pisos: `jam` ≥ 4,5 · `plum` ≥ 4,5 · `ink` ≥ 7 · `rule` ≥ 3 · `raspberry` ≥ 3, todos **sobre Papel**
- [ ] Teste assere que `glaze`, `sugar`, `border`, `butter` ficam **abaixo** de 3 (fato registrado, não falha)
- [ ] Teste assere `contrast(sugar, paper) ≥ 1,15` — a guarda contra o defeito de 1,00:1
- [ ] Teste assere `contrast(butter, ink) ≥ 7` e `contrast(glaze, ink) ≥ 4,5`
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json`

**Tests**: unit
**Gate**: full
**Commit**: `test(store): a paleta prova o próprio contraste`

---

### T4: Guarda de ordem de import

**What**: Teste que prova que `main.tsx` importa `App.css` **depois** de `@nanapin/ui/styles.css`.
**Where**: `apps/store/src/shared/lib/__tests__/importOrder.test.ts`
**Depends on**: T3
**Reuses**: leitura de fonte do padrão de `navItems.test.ts` do backoffice (lê o arquivo do disco)
**Requirement**: PAP-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Teste lê `src/main.tsx` do disco e falha se a ordem inverter
- [ ] Mensagem de falha explica a consequência (a loja volta à paleta do backoffice)
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(store): a ordem de import do tema vira invariante`

---

### T5: Fecho da Fase 1 — varredura de regressão de contraste

**What**: Rodar a suíte inteira, o `tsc`, o lint e o build; corrigir o que a troca de valor quebrou
(texto que ficou sobre superfície errada, borda de campo em Dobra) sem mexer em layout.
**Where**: `apps/store/src/**` (correções pontuais)
**Depends on**: T4
**Reuses**: —
**Requirement**: PAP-02, PAP-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Toda borda de **campo** (`input`, `textarea`, `select`) usa `nanita-rule`, não `nanita-border`
- [ ] Nenhum texto em `nanita-glaze` / `nanita-sugar` / `nanita-butter` sobre Papel ou branco
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json && pnpm --filter @nanapin/store build && pnpm --filter @nanapin/store lint`
- [ ] Lint da loja ≤ 2 err / 2 warn (baseline), `tsc` = 0
- [ ] Screenshot de `/`, `/checkout` e `/produto/*` em 390×844

**Tests**: unit (regressão da suíte existente)
**Gate**: build + visual
**Commit**: `fix(store): a paleta nova acerta borda de campo e superfície de texto`

---

### T6: `rounded-button` na escala de raio

**What**: Acrescentar `borderRadius.button = 14px` ao Tailwind da loja, com o comentário que registra
a escala completa (ação / disco / rótulo / campo / caixa / miúdo).
**Where**: `apps/store/tailwind.config.ts`
**Depends on**: T5
**Reuses**: bloco `borderRadius` existente
**Requirement**: PAP-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `rounded-button` resolve para 14px; `rounded-pill` continua 999px
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: none *(config; provado por T7)*
**Gate**: quick
**Commit**: `feat(store): a escala de raio ganha a forma de ação`

---

### T7: `shared/ui/Button` — o botão da loja

**What**: Componente `cva` com raio **na base**, cinco variantes (`primary`, `secondary`, `onInk`,
`inkSolid`, `ghost`), três tamanhos, `asChild` via `Slot`.
**Where**: `apps/store/src/shared/ui/Button.tsx` + `__tests__/Button.test.tsx`
**Depends on**: T6
**Reuses**: `packages/ui/src/button.tsx` (padrão `cva` + `Slot`), `@nanapin/ui/lib/utils` (`cn`)
**Requirement**: PAP-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] As cinco variantes rendem as classes de cor declaradas no design
- [ ] Toda variante carrega `rounded-button` e **nenhuma** carrega `rounded-pill`
- [ ] `asChild` renderiza o filho (`<Link>`) preservando as classes
- [ ] Rótulo em `font-display` peso 600
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json`

**Tests**: unit
**Gate**: full
**Commit**: `feat(store): a loja ganha o próprio botão, e ele não é pílula`

---

### T8: Varredura — pílula deixa de ser forma de ação

**What**: Teste que lê os fontes de `apps/store/src` e falha quando `rounded-pill` aparece na
`className` de um elemento de ação (`<button>`, `<Button`, `<Link ... onClick>`), com allowlist
explícita e justificada para rótulo/campo.
**Where**: `apps/store/src/shared/ui/__tests__/buttonShape.test.ts`
**Depends on**: T7
**Reuses**: padrão de leitura de fonte de T4
**Requirement**: PAP-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] O teste **falha** contra o estado atual (prova que discrimina) antes de T9 corrigir
- [ ] A allowlist lista badge / chip / tag / campo de busca, cada entrada com motivo
- [ ] Gate: `pnpm --filter @nanapin/store test` — com o teste marcado `.fails` ou o ajuste feito em T9

**Tests**: unit
**Gate**: quick
**Commit**: `test(store): a forma de ação vira regra verificável`

---

### T9: Migrar as ações da loja para `rounded-button`

**What**: Passar os ~78 usos de `rounded-pill` em elementos de ação para `rounded-button` (ou para o
`Button` novo, onde couber), preservando pílula em badge/chip/tag/campo e disco onde é disco.
**Where**: `apps/store/src/**` (≈45 arquivos)
**Depends on**: T8
**Reuses**: `shared/ui/Button` de T7
**Requirement**: PAP-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A varredura de T8 passa
- [ ] `OrderConfirmationPage.test.tsx` atualizado para a forma nova (assere 14px, não pílula)
- [ ] Nenhum disco (`rounded-full`) virou 14px
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json && pnpm --filter @nanapin/store build && pnpm --filter @nanapin/store lint`
- [ ] Screenshot de `/`, `/checkout`, `/produto/*`, `/conta` em 390×844

**Tests**: unit
**Gate**: build + visual
**Commit**: `refactor(store): toda ação da loja passa a ter a mesma forma`

---

### T10: `NanitaWordmark`

**What**: Componente SVG inline do wordmark (viewBox `0 0 690.06 172.04`), quatro tons, proporção
4,01:1 travada, queda para monograma abaixo de 110px.
**Where**: `apps/store/src/shared/ui/brand/NanitaWordmark.tsx` + `__tests__/NanitaWordmark.test.tsx`
**Depends on**: T9
**Reuses**: `.specs/brand/nanita-v2/nanita-wordmark.svg` (o path já vetorizado e verificado)
**Requirement**: PAP-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `role="img"` + `aria-label="Nanita"` + `<title>`
- [ ] `width` define `height` pela proporção 4,01:1
- [ ] Abaixo de 110px de largura renderiza o **monograma**, não o wordmark
- [ ] Os quatro tons rendem os `fill` declarados
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json`

**Tests**: unit
**Gate**: full
**Commit**: `feat(store): o wordmark da Nanita vira vetor`

---

### T11: `NanitaLockup` e `NanitaMonogram`

**What**: Lockup completo (wordmark + descritor, viewBox `0 0 690.06 237.8`) com o descritor em Dobra
sobre Grafite, e o monograma isolado (viewBox `0 0 126.87 160.18`) em `currentColor`.
**Where**: `apps/store/src/shared/ui/brand/{NanitaLockup,NanitaMonogram}.tsx` + `index.ts` + `__tests__/`
**Depends on**: T10
**Reuses**: `.specs/brand/nanita-v2/{nanita-logo,nanita-monogram-n}.svg`
**Requirement**: PAP-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Sobre Grafite o descritor é `#EBDDD7` (Dobra), **não** Carbono — asserido por teste
- [ ] Piso de 140px no lockup respeitado (abaixo disso cai para wordmark)
- [ ] Barrel `index.ts` exporta os três
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json`

**Tests**: unit
**Gate**: full
**Commit**: `feat(store): o lockup e o monograma entram como componentes`

---

### T12: A estrutura do path vira teste

**What**: Teste que prova que cada cor do lockup e do wordmark é **um** `<path>` com
`fill-rule="evenodd"` — a estrutura que faz os contadores serem buracos.
**Where**: `apps/store/src/shared/ui/brand/__tests__/paths.test.ts`
**Depends on**: T11
**Reuses**: raciocínio de `.specs/brand/nanita-v2/README.md` §"Os contadores são buracos"
**Requirement**: PAP-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Teste conta `<path>` por cor em cada componente e falha se houver mais de um
- [ ] Teste assere `fill-rule="evenodd"` em cada um
- [ ] Comentário do teste explica **por que** (separar subpaths pinta o contador por cima, na mesma cor)
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(store): os contadores do logo viram invariante de estrutura`

---

### T13: Trocar `NanaLogo` pelos componentes novos

**What**: Header, folha do menu mobile, header do checkout e overlay de auth passam a usar
`NanitaWordmark`; o rodapé usa `NanitaLockup`.
**Where**: `widgets/header/ui/Header.tsx`, `widgets/mobile-menu/ui/MobileMenu.tsx`,
`pages/CheckoutPage.tsx`, `features/auth/ui/AuthOverlay.tsx`, `widgets/footer/ui/Footer.tsx`
**Depends on**: T12
**Reuses**: `shared/ui/brand` de T10–T11
**Requirement**: PAP-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Header mobile em 128px, desktop em 160px (a escada da prancha 21)
- [ ] Rodapé em 150px, acima do piso de 140
- [ ] `Header.test.tsx` atualizado e passando
- [ ] Nenhum `NanaLogo` restante em `apps/store`
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json`
- [ ] Screenshot do header e do rodapé em 390×844

**Tests**: unit
**Gate**: full + visual
**Commit**: `feat(store): header e rodapé passam a usar a marca vetorial`

---

### T14: Aposentar Berkshire Swash

**What**: Remover `.nanita-wordmark` do CSS, trocar a inicial marca-d'água do card de coleção por
Fredoka 700, e reduzir o `<link>` do Google Fonts a Fredoka + DM Sans.
**Where**: `apps/store/src/app/App.css`, `widgets/category-grid/ui/CategoryGrid.tsx`,
`apps/store/index.html`
**Depends on**: T13
**Reuses**: valores do artboard 22 (76px, Fredoka 700, ~50% de opacidade)
**Requirement**: PAP-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `grep -ri "berkshire" apps/store` retorna vazio
- [ ] O `<link>` de fonte pede exatamente `Fredoka` e `DM+Sans`
- [ ] A inicial do card de coleção sai em Fredoka 700
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json && pnpm --filter @nanapin/store build && pnpm --filter @nanapin/store lint`

**Tests**: unit
**Gate**: build
**Commit**: `refactor(store): Berkshire Swash sai — o wordmark não é mais fonte`

---

### T15: Favicon squircle (SVG)

**What**: Escrever `apps/store/public/favicon.svg` — squircle 64×64, `rx` 18 (28%), fundo Carimbo, N
Grafite, com o **mesmo path** do monograma.
**Where**: `apps/store/public/favicon.svg`
**Depends on**: T14
**Reuses**: `.specs/brand/nanita-v2/nanita-monogram-n.svg`
**Requirement**: PAP-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `viewBox="0 0 64 64"`, `rx="18"`, fundo `#F1678D`, N `#2E2028`
- [ ] O N está centrado e a haste mede ≥ 2px quando rasterizado a 16px
- [ ] Comentário no arquivo registra a base (B · squircle) e o porquê
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: none *(asset; provado por T17)*
**Gate**: quick
**Commit**: `feat(store): o favicon vira o monograma N em squircle`

---

### T16: Raster — `.ico`, `apple-touch-icon` e `icon-512`

**What**: Gerar `favicon.ico` (16·32·48 do squircle), `apple-touch-icon.png` (180×180, **quadrado
sangrado**) e `icon-512.png` (squircle) por PowerShell + WPF.
**Where**: `apps/store/public/{favicon.ico,apple-touch-icon.png,icon-512.png}` + script no scratchpad
**Depends on**: T15
**Reuses**: toolchain de `.specs/brand/nanita-v2/_escada-wordmark.ps1`
**Requirement**: PAP-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `.ico` contém três tamanhos (formato Vista+)
- [ ] `apple-touch-icon.png` é 180×180 **sem canto arredondado** (o iOS aplica a máscara)
- [ ] O N do `apple-touch-icon` fica dentro da área segura da máscara
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: none *(asset; provado por T17)*
**Gate**: quick
**Commit**: `feat(store): os ícones rasterizados saem do mesmo N`

---

### T17: `index.html` + suíte de assets de marca

**What**: Declarar os quatro `<link>`/`meta` de ícone, trocar `theme-color` para Carmim, e escrever a
suíte que prova assets + cabeça do documento.
**Where**: `apps/store/index.html` + `apps/store/src/app/__tests__/brandAssets.test.ts`
**Depends on**: T16
**Reuses**: —
**Requirement**: PAP-06, PAP-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `index.html` declara `icon` (svg), `icon` (ico), `apple-touch-icon` e `theme-color="#A62348"`
- [ ] Teste assere existência dos quatro arquivos em `public/`
- [ ] Teste assere `viewBox` e `rx` do `favicon.svg`
- [ ] Teste assere que o `<link>` de fonte **não** menciona Berkshire
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json && pnpm --filter @nanapin/store build && pnpm --filter @nanapin/store lint`

**Tests**: unit
**Gate**: build
**Commit**: `feat(store): a aba do navegador passa a mostrar o N`

---

### T18: Header e barra inferior da home

**What**: Header em branco sobre chão Papel com linha Dobra; `MobileNav` branco com aba ativa em
Carmim, conforme os artboards 23 e 22.
**Where**: `widgets/header/ui/Header.tsx`, `widgets/mobile-nav/ui/MobileNav.tsx`
**Depends on**: T17
**Reuses**: artboards `Mobile Header` e `Mobile Bottom Nav`
**Requirement**: PAP-08

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Header branco `border-b` Dobra; ações em disco; busca em pílula com borda Papelão
- [ ] `MobileNav` branco, rótulos em Carbono, ativa em Carmim
- [ ] O recolher no scroll continua funcionando (não pode regredir)
- [ ] Gate: `pnpm --filter @nanapin/store test`
- [ ] Screenshot em 390×844 comparado ao artboard 23

**Tests**: unit
**Gate**: quick + visual
**Commit**: `feat(store): a moldura da home veste a papelaria`

---

### T19: Hero

**What**: Fundo Mata-borrão, título em duas cores, CTA Carmim + secundário contorno, e a **cartela de
pins** no lugar da mascote.
**Where**: `widgets/hero-banner/ui/HeroBanner.tsx`
**Depends on**: T18
**Reuses**: `shared/ui/Button` de T7; artboard `Hero Section` / `Hero Arte`
**Requirement**: PAP-08

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Linha 1 do título em Grafite, linha 2 em Carmim
- [ ] CTA primário Carmim com seta; secundário `border-2` Grafite
- [ ] Arte = cartela com os cinco pins e o chip "Feito à mão"
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json`
- [ ] Screenshot em 390×844 e 1440×900

**Tests**: unit
**Gate**: full + visual
**Commit**: `feat(store): o hero passa a ser cartela de pins sobre mata-borrão`

---

### T20: Faixa de benefícios e card de drop

**What**: Marquee Grafite com marcas em Carimbo; card de drop Grafite com o dígito vivo em Fita e CTA
Carimbo.
**Where**: `widgets/home-sections/ui/{MarqueeBar,DropCountdown}.tsx`
**Depends on**: T19
**Reuses**: artboards `Marquee Trust Bar` e `Drop Alert`
**Requirement**: PAP-08

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Marquee Grafite, texto Papel, separadores/marcas em Carimbo
- [ ] Contador: três células em véu de branco, a quarta ("SEG") em Fita sobre Grafite
- [ ] CTA "Ativar lembrete" na variante `onInk` (Carimbo, texto Grafite)
- [ ] Gate: `pnpm --filter @nanapin/store test`
- [ ] Screenshot em 390×844

**Tests**: unit
**Gate**: quick + visual
**Commit**: `feat(store): faixa e contador de drop entram na paleta nova`

---

### T21: Fecho da Fase 5

**What**: Gate cheio do topo da home e correção do que o screenshot em 390px acusar.
**Where**: `apps/store/src/widgets/**`
**Depends on**: T20
**Reuses**: —
**Requirement**: PAP-08

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Sem rolagem horizontal do `body` em 390px
- [ ] Todo alvo de toque ≥ 44px
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json && pnpm --filter @nanapin/store build && pnpm --filter @nanapin/store lint`

**Tests**: unit
**Gate**: build + visual
**Commit**: `fix(store): o topo da home fecha em 390px`

---

### T22: Card de coleção

**What**: Ritmo por posição **1º Carimbo → 2º Grafite → demais Mata-borrão**, inicial em Fredoka 700
a 76px sangrando no topo direito, contagem em Carbono/Dobra conforme o fundo.
**Where**: `widgets/category-grid/ui/CategoryGrid.tsx` + `__tests__/`
**Depends on**: T21
**Reuses**: artboard `Grid` da seção Coleções
**Requirement**: PAP-08

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Teste assere o ritmo por índice (0 → Carimbo, 1 → Grafite, ≥2 → Mata-borrão)
- [ ] Sobre Grafite o título é Carimbo e a contagem é Dobra
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json`
- [ ] Screenshot em 390×844

**Tests**: unit
**Gate**: full + visual
**Commit**: `feat(store): o card de coleção ganha o ritmo da papelaria`

---

### T23: Card de produto

**What**: Palco Mata-borrão, selo Grafite em pílula, disco `+` Grafite 38px, coração em disco branco,
categoria Carbono, nome Fredoka 18/500, preço Fredoka 20/600 **Carmim**.
**Where**: `entities/product/ui/ProductCard.tsx` + `__tests__/`
**Depends on**: T22
**Reuses**: artboard `Card Produto`
**Requirement**: PAP-08

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Teste assere preço em Carmim e selo em Grafite (era geleia e tinta)
- [ ] Só o desconto ganha cor de dinheiro; "Novo"/"Últimas"/"Destaque" saem em Grafite
- [ ] Disco `+` continua `rounded-full` (não virou 14px)
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json`
- [ ] Screenshot da grade em 390×844

**Tests**: unit
**Gate**: full + visual
**Commit**: `feat(store): o card de produto veste a papelaria`

---

### T24: Carrossel e cabeçalho de seção

**What**: `ProductCarousel` e `SectionHeading` na paleta nova — "Ver tudo" em Carmim, badge em Fita
sobre Grafite, setas em disco Grafite.
**Where**: `widgets/product-carousel/ui/ProductCarousel.tsx`, `shared/ui/SectionHeading.tsx`
**Depends on**: T23
**Reuses**: artboards das seções `Bombando` e `A galera ama`
**Requirement**: PAP-08

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] "Ver tudo" em Carmim; badge "HOT" em Fita sobre Grafite
- [ ] Setas do carrossel em disco (ativa Grafite, inativa contorno Dobra)
- [ ] Gate: `pnpm --filter @nanapin/store test`
- [ ] Screenshot em 390×844

**Tests**: unit
**Gate**: quick + visual
**Commit**: `feat(store): carrossel e cabeçalho de seção entram na paleta nova`

---

### T25: Monte seu Kit

**What**: Três tiers, o do meio em superfície Grafite com números e CTA Carimbo e a fita "MAIS
POPULAR" em Fita cantada no topo direito; os outros dois em branco com contorno Dobra.
**Where**: `features/custom-pin/ui/MonteSeuKit.tsx` + `__tests__/`
**Depends on**: T24
**Reuses**: artboard `Tiers`
**Requirement**: PAP-08

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Tier destacado: fundo Grafite, dots/número/preço/CTA em Carimbo, "bottons por" em Dobra
- [ ] Fita "MAIS POPULAR" em `nanita-butter` sobre Grafite, canto inferior esquerdo arredondado
- [ ] Tiers laterais em branco, CTA na variante `secondary`
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json && pnpm --filter @nanapin/store build && pnpm --filter @nanapin/store lint`
- [ ] Screenshot em 390×844

**Tests**: unit
**Gate**: build + visual
**Commit**: `feat(store): o Monte seu Kit ganha a faixa grafite do board`

---

### T26: Chips de tema

**What**: `TrendingTags` — chips em pílula, o primeiro em Carimbo e os demais em branco com contorno
Dobra, "Ver todos os temas" em Carmim.
**Where**: `widgets/home-sections/ui/TrendingTags.tsx`
**Depends on**: T25
**Reuses**: artboard `Chips`
**Requirement**: PAP-08

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Chips continuam `rounded-pill` (rótulo, não ação) — a varredura de T8 não acusa
- [ ] Gate: `pnpm --filter @nanapin/store test`
- [ ] Screenshot em 390×844

**Tests**: unit
**Gate**: quick + visual
**Commit**: `feat(store): os chips de tema entram na paleta nova`

---

### T27: Prova social

**What**: `SocialProof` — cards brancos com contorno Dobra sobre bloco Mata-borrão, estrelas em Fita,
avatar em disco.
**Where**: `widgets/home-sections/ui/SocialProof.tsx`
**Depends on**: T26
**Reuses**: artboard `Depoimentos`
**Requirement**: PAP-08

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Cards brancos sobre Mata-borrão, texto Grafite, autoria em Carbono
- [ ] Gate: `pnpm --filter @nanapin/store test`
- [ ] Screenshot em 390×844

**Tests**: unit
**Gate**: quick + visual
**Commit**: `feat(store): a prova social entra na paleta nova`

---

### T28: Newsletter

**What**: Superfície **Carimbo** com texto Grafite, campo branco embutido, botão Grafite (variante
`inkSolid`) e o selo "10% OFF" em disco branco com o número em Carmim.
**Where**: `features/newsletter/ui/NewsletterBanner.tsx` + `__tests__/`
**Depends on**: T27
**Reuses**: artboard `Newsletter`
**Requirement**: PAP-08

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Superfície Carimbo; nenhum texto em Carimbo sobre ela (o texto é Grafite)
- [ ] Botão na variante `inkSolid`, raio 14px
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json`
- [ ] Screenshot em 390×844

**Tests**: unit
**Gate**: full + visual
**Commit**: `feat(store): a newsletter vira bloco carimbo`

---

### T29: Rodapé

**What**: Rodapé Grafite com o lockup (wordmark Carimbo + descritor Dobra), títulos de coluna em
Carimbo, links em Dobra, base com selos de pagamento.
**Where**: `widgets/footer/ui/Footer.tsx`
**Depends on**: T28
**Reuses**: `NanitaLockup` de T11; artboard `Footer`
**Requirement**: PAP-05, PAP-08

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Lockup a 150px, descritor em Dobra
- [ ] Títulos de coluna em Carimbo; links em Dobra
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json && pnpm --filter @nanapin/store build && pnpm --filter @nanapin/store lint`
- [ ] Screenshot em 390×844 e 1440×900 comparados aos artboards 23 e 22

**Tests**: unit
**Gate**: build + visual
**Commit**: `feat(store): o rodapé fecha a home com o lockup`

---

### T30: `DESIGN.md` reescrito

**What**: §2 (paleta), §3 (tipografia), §4 (forma), §5 (componentes), §7 (escopo) e §8 (checklist)
descrevendo a papelaria, com os contrastes medidos sobre Papel.
**Where**: `DESIGN.md`
**Depends on**: T29
**Reuses**: `.specs/brand/nanita-v2/README.md`, prancha 20b
**Requirement**: PAP-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] §2 traz a tabela papelaria e o achado do 1,00:1 ("o chão não entra sozinho")
- [ ] §3 registra que Berkshire Swash saiu e por quê
- [ ] §4/§5 registram a escala de raio e que **botão é 14px, pílula é rótulo**
- [ ] §5 traz a tabela de variantes do `shared/ui/Button`
- [ ] §8 checa os pisos novos
- [ ] Todo hex antigo (`#FF86B5`, `#FF51B9`, `#B0176B`, `#2B1622`, `#7A5C6B`, `#FFEFF6`, `#FFD7E7`) some do documento

**Tests**: none *(documentação — matriz diz "none")*
**Gate**: —
**Commit**: `docs: o DESIGN.md passa a descrever a papelaria`

---

### T31: `CLAUDE.md` e README da marca

**What**: Atualizar o bloco de design do `CLAUDE.md` e registrar a adoção no README de
`.specs/brand/nanita-v2/`.
**Where**: `CLAUDE.md`, `.specs/brand/nanita-v2/README.md`
**Depends on**: T30
**Reuses**: —
**Requirement**: PAP-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `CLAUDE.md` nomeia a paleta papelaria, o botão de 14px, o wordmark vetorial e o favicon
- [ ] As proibições de renomeação (`@nanapin/*`, `--nana-*`, chaves de `localStorage`) seguem intactas
- [ ] O README da marca troca "Ainda não adotada" por o registro da adoção na feature 19
- [ ] `.specs/brand/nanita-v2/` deixa de ser untracked

**Tests**: none
**Gate**: —
**Commit**: `docs: as instruções do projeto passam a descrever a identidade v2`

---

### T32: Fecho — invariantes de convivência

**What**: Provar que o backoffice não foi tocado, que nenhuma chave de `localStorage` mudou, e
atualizar a baseline de lint/tipo no `CLAUDE.md` se ela tiver mudado de verdade.
**Where**: `CLAUDE.md` (baseline), `.specs/STATE.md` (handoff)
**Depends on**: T31
**Reuses**: —
**Requirement**: PAP-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `git diff main --stat` mostra **zero** linha em `apps/backoffice/`, `packages/ui/src/styles.css`, `packages/ui/tailwind.preset.ts`
- [ ] `git diff main` não altera nenhuma string `nanapin-cart|wishlist|coupon|checkout|guest|product-draft`
- [ ] Gate: `pnpm --filter @nanapin/store test && npx tsc --noEmit -p apps/store/tsconfig.app.json && pnpm build && pnpm lint && pnpm test`
- [ ] Baseline de lint conferida e atualizada no `CLAUDE.md` só se mudou de verdade

**Tests**: unit
**Gate**: build
**Commit**: `chore(store): fecha a adoção da identidade papelaria`

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8

Fase 1:  T1 → T2 → T3 → T4 → T5
Fase 2:  T6 → T7 → T8 → T9
Fase 3:  T10 → T11 → T12 → T13 → T14
Fase 4:  T15 → T16 → T17
Fase 5:  T18 → T19 → T20 → T21
Fase 6:  T22 → T23 → T24 → T25
Fase 7:  T26 → T27 → T28 → T29
Fase 8:  T30 → T31 → T32
```

**Empacotamento em lotes (~7 tasks, fases inteiras):**

| Lote | Fases | Tasks | Total |
|---|---|---|---|
| 1 | Fase 1 | T1–T5 | 5 |
| 2 | Fase 2 | T6–T9 | 4 |
| 3 | Fase 3 | T10–T14 | 5 |
| 4 | Fases 4 + 5 | T15–T21 | 7 |
| 5 | Fase 6 | T22–T25 | 4 |
| 6 | Fases 7 + 8 | T26–T32 | 7 |

32 tasks → 6 lotes. Acima do limiar de um lote, então a delegação a sub-agentes é **ofertada** antes
do Execute.

---

## Task Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T1 | 1 arquivo (tokens CSS) | ✅ |
| T2 | 1 arquivo (tokens Tailwind) | ✅ |
| T3 | 1 função + 1 suíte | ✅ |
| T4 | 1 suíte | ✅ |
| T5 | correções pontuais guiadas por 2 regras | ⚠️ coeso — é o gate de regressão da fase |
| T6 | 1 chave de config | ✅ |
| T7 | 1 componente + suíte | ✅ |
| T8 | 1 suíte | ✅ |
| T9 | migração mecânica de 1 padrão | ⚠️ toca ~45 arquivos, mas é **uma** transformação, coberta por T8 |
| T10–T12 | 1 componente / 1 par / 1 suíte | ✅ |
| T13 | 1 substituição em 5 pontos de chamada | ✅ |
| T14 | 1 remoção em 3 arquivos | ✅ |
| T15–T17 | 1 asset / 1 lote de raster / 1 head + suíte | ✅ |
| T18–T20, T22–T29 | 1 widget cada | ✅ |
| T21 | gate de fase | ⚠️ coeso |
| T30–T32 | 1 documento cada / fecho | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
|---|---|---|---|
| T1 | None | — | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | Fase 1 → Fase 2 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | Fase 2 → Fase 3 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | Fase 3 → Fase 4 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | Fase 4 → Fase 5 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | T21 | Fase 5 → Fase 6 | ✅ |
| T23 | T22 | T22 → T23 | ✅ |
| T24 | T23 | T23 → T24 | ✅ |
| T25 | T24 | T24 → T25 | ✅ |
| T26 | T25 | Fase 6 → Fase 7 | ✅ |
| T27 | T26 | T26 → T27 | ✅ |
| T28 | T27 | T27 → T28 | ✅ |
| T29 | T28 | T28 → T29 | ✅ |
| T30 | T29 | Fase 7 → Fase 8 | ✅ |
| T31 | T30 | T30 → T31 | ✅ |
| T32 | T31 | T31 → T32 | ✅ |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Camada tocada | Matriz exige | Task diz | Status |
|---|---|---|---|---|
| T1 | Token / tema | unit | none | ✅ resolvido por **merge forward** — o valor de `App.css` só é provável contra o Tailwind, que nasce em T2; a suíte vive em T3, a primeira task onde os dois existem |
| T2 | Token / tema | unit | none | ✅ idem — T3 é a primeira task testável |
| T3 | Token / tema + função pura | unit | unit | ✅ |
| T4 | Regra de repo | unit | unit | ✅ |
| T5 | Widget/feature (correção) | unit | unit | ✅ |
| T6 | Config de raio | none | none | ✅ (matriz: config sem teste próprio; provado em T7) |
| T7 | Componente compartilhado | unit | unit | ✅ |
| T8 | Regra de repo | unit | unit | ✅ |
| T9 | Widget/feature | unit | unit | ✅ |
| T10 | Componente compartilhado | unit | unit | ✅ |
| T11 | Componente compartilhado | unit | unit | ✅ |
| T12 | Regra de estrutura | unit | unit | ✅ |
| T13 | Widget | unit | unit | ✅ |
| T14 | Widget + head | unit | unit | ✅ |
| T15 | Asset | unit | none | ✅ **merge forward** — o SVG só é asserível junto do `index.html`, em T17 |
| T16 | Asset | unit | none | ✅ idem |
| T17 | Asset + head | unit | unit | ✅ |
| T18–T20, T22–T29 | Widget/feature | unit | unit | ✅ |
| T21 | Gate de fase | unit | unit | ✅ |
| T30, T31 | Documentação | none | none | ✅ |
| T32 | Fecho / invariante | unit | unit | ✅ |

---

## Ferramentas por task

- **MCP `paper`** — todas as tasks de home (T18–T29): valores exatos vêm de `get_jsx` /
  `get_computed_styles` dos artboards 22/23, **nunca** de screenshot.
- **Skill `playwright-cli`** — captura dos screenshots de 390×844 e 1440×900 nos gates visuais.
- **MCP `supabase`** — não autenticado nesta sessão; nenhuma task precisa dele.


---

## Registro de execução

**32 tasks planejadas → 17 commits**, todos com gate verde antes do commit. As tasks foram fundidas
onde separá-las produziria um estado intermediário que compila e não faz sentido — cada fusão está
marcada com `SPEC_DEVIATION` no corpo do commit correspondente.

| Commit | Tasks | O que fechou |
|---|---|---|
| `d8aad76` | T1 | paleta no `App.css` |
| `666a1f9` | T2 | paleta no Tailwind |
| `e22f33b` | T3 | suíte de paleta e contraste (43 testes) |
| `fa9086e` | T4 | guarda de ordem de import |
| `8896b20` | T5 | borda de campo, superfície de texto, guardas de Mata-borrão |
| `4a7cdf4` | T6 | `rounded-button` na escala |
| `0a0aebb` | T7 | `shared/ui/Button` (21 testes) |
| `7d8b25e` | T8 + T9 | varredura de forma + migração de 35 sites |
| `3c7e97b` | T10 + T11 + T12 | a marca em vetor (26 testes) |
| `cac7ccb` | T13 | header e rodapé usam a marca nova |
| `818c6e3` | T14 | Berkshire Swash aposentada |
| `51488fd` | T15 + T16 + T17 | favicon squircle + quadrado + ico + `index.html` (19 testes) |
| `097d149` | T18 | moldura da home |
| `09f0a67` | T19 | hero com a cartela de pins |
| `6433bcc` | T20 + T21 | faixa, contador e alvos de toque |
| `702a94e` | T22 | card de coleção (7 testes) |
| `56db754` | T23 | card de produto (10 testes) |
| `b1bb6b4` | T24 | cabeçalho de seção |
| `191a5c1` | T25 | Monte seu Kit |
| `2b496b6` | T26–T29 | chips, prova social, newsletter, rodapé |
| `c706509` | T30 | `DESIGN.md` |
| `f9e5f63` | T31 | `CLAUDE.md` + README da marca |

### Desvios registrados

| # | Desvio | Motivo |
|---|---|---|
| 1 | `fontFamily.logo` saiu na T14, não na T2 | Tirar o token antes das três chamadas deixaria `font-logo` sem família e o "N" cairia no corpo. |
| 2 | `button` foi movido para a ÚLTIMA chave de `borderRadius` | Descoberto medindo: `twMerge('rounded-md','rounded-button')` devolve as duas classes, e o Tailwind emite na ordem das chaves — declarado entre `sm` e `md`, o nosso raio perderia em silêncio. Tem teste. |
| 3 | T8 e T9 num commit | T8 sozinha deixa a suíte vermelha, e `.fails` para commitar é o que a regra de integridade de teste proíbe. A discriminação foi demonstrada antes: 40 alvos em 24 arquivos. |
| 4 | T10–T12 num commit | Os três componentes são uma cadeia de fallback (lockup → wordmark → monograma) e não têm estado intermediário coerente. |
| 5 | T15–T17 num commit | O SVG e o raster só são asseríveis junto do `index.html` que os declara — merge-forward previsto na própria matriz de cobertura. |
| 6 | A aba do `MobileNav` segue "Carrinho", e não "Sacola" como no artboard | Renomear é texto visível com ripple em `aria-label`, no toast e no `CLAUDE.md`. Fora do escopo de paleta/forma/marca. |
| 7 | Alvos de toque < 44px permanecem no card de produto e nos chips | Os artboards 22/23 os desenham em 36–38px. Crescê-los mudaria a composição do card. Os alvos do **header** foram levados a 44px por pseudo-elemento, sem mudar o tamanho visual. |
| 8 | Dois `#FFEFF6` continuam no `DESIGN.md` | São a EVIDÊNCIA do achado de 1,00:1, que é o argumento central do §1. Removê-los deixaria a decisão sem prova. |
