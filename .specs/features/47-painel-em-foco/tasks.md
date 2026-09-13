# Painel em foco — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tasks com a Skill **`tlc-spec-driven`**: ative-a **pelo nome** e siga o fluxo de
Execute e as Critical Rules dela. Não procure os arquivos da skill por caminho de disco. A skill é a
fonte de verdade do fluxo completo (ciclo por task, delegação a sub-agentes, revisão de adequação,
Verifier, sensor de discriminação).

**Se a skill não puder ser ativada, PARE e avise — não prossiga sem ela.**

### Convenções deste repositório que valem em toda task

1. **Um commit por task é a regra da skill; neste repositório ela é SOBRESCRITA** pelo `CLAUDE.md`:
   *não criar commits atômicos em pedaços durante a implementação; aguardar a conclusão e gerar os
   commits completos de uma vez* (`BL-012`, decisão do usuário). O campo `Commit` de cada task abaixo
   é o **rótulo da mudança**, e vira mensagem só no fecho.
2. **Rode um workspace por vez.** Duas suítes concorrentes saturam a máquina e produzem timeout de 5s
   em testes que varrem disco.
3. **Capture o exit code FORA de pipe.** `pnpm … test | tail` devolve o código do `tail`.
   Use `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`.
4. **Baseline é do disco, não do último commit nem do `CLAUDE.md`.** T1 existe por isso.
5. **`pnpm build` não faz typecheck.** O typecheck é `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`.
6. **Guarda não se conserta afrouxando.** Toda régua nova nasce com **âncora de contagem** e **sensor**.

---

**Design**: `.specs/features/47-painel-em-foco/design.md`
**Spec**: `.specs/features/47-painel-em-foco/spec.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerada do código, das diretrizes do projeto e da spec — confirmar antes do Execute.
> **Diretrizes encontradas**: `CLAUDE.md` (raiz), `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`,
> `apps/backoffice/vitest.config.ts`, `packages/core/package.json`. Amostradas 10 suítes existentes
> (`AdminLayout.test.tsx`, `navCollapse.test.ts`, `HomeLivePreview.test.tsx`, `MenuLivePreview.test.tsx`,
> `HomeSectionList.test.tsx`, `MenuPanelEditor.test.tsx`, `previaUnica.test.ts`, `preview.test.ts`,
> `AdminMenuPage.test.tsx`, `AdminHomePage.test.tsx`). **Sem limiar de cobertura configurado** — a
> expectativa abaixo vem das diretrizes escritas, não de um número de runner.

| Camada de código | Tipo de teste exigido | Expectativa de cobertura | Padrão de localização | Comando |
| --- | --- | --- | --- | --- |
| **Regra pura em `packages/core`** | unit | Todos os ramos; **1:1 com as ACs da spec**; todo caso de borda listado tem teste. Proibido importar React/Supabase (`catalog.test.ts` guarda) | `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| **Modelo/lib de app** (`widgets/*/model`, `shared/lib`) | unit | Todos os ramos + o caminho de falha (storage que lança). 1:1 com as ACs | co-locado `*.test.ts` | `pnpm --filter @estrelinha/backoffice test` |
| **Componente de UI** (`*/ui/*.tsx`) | unit (RTL + jsdom) | Toda AC alcançável sem medir layout. **Teste de fio renderiza a página/layout REAL** — nunca uma composição montada dentro do arquivo de teste (lição da `44`) | co-locado `*.test.tsx` | `pnpm --filter @estrelinha/backoffice test` |
| **Página** (`pages/admin/*.tsx`) | unit (RTL + jsdom) | Presença/ausência de nó, fiação entre colunas, e a **declaração de grade lida do disco** quando o que importa é layout | co-locado `*.test.tsx` | `pnpm --filter @estrelinha/backoffice test` |
| **Guarda que lê o fonte do disco** | unit | **Âncora de contagem obrigatória** (a varredura achou o que mede) **e sensor por mutação** (a forma errada reprova na mesma régua). Sem âncora, um caminho errado varre zero arquivo e passa em silêncio | co-locado `*.test.ts(x)` | `pnpm --filter @estrelinha/backoffice test` |
| **Tipos / config** | none | — (gate de build e `tsc`) | — | gate de build |

## Gate Check Commands

> Gerados do código — confirmar antes do Execute. **Sempre um workspace por vez, exit code fora de pipe.**

| Nível | Quando usar | Comando |
| --- | --- | --- |
| **Quick** | Depois de task que só toca um workspace | `pnpm --filter @estrelinha/<ws> test; echo "exit=$?"` |
| **Full** | Depois de task que toca `core` **e** `backoffice` | `pnpm --filter @estrelinha/core test; echo "exit=$?"` **e depois** `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"` |
| **Build** | Fim de fase, e no fecho | `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` · `pnpm lint` · `pnpm build` |

**Baseline de referência (a confirmar em T1)** — o que o `CLAUDE.md` diz hoje: store **2955/189** ·
backoffice **2023/119** · core **2128/80** · functions **436/8** · catalog-import **512/23**.
Três das cinco já estavam desatualizadas no fecho da `45`; **não confie, meça**.

---

## Execution Plan

Fases são ordenadas e rodam em sequência; dentro da fase, as tasks rodam na ordem listada.

### Fase 1 — Fundação: a régua, a geometria e a preferência (sem tela)

```
T1 ──┬──→ T2
     ├──→ T3
     ├──→ T4
     └──→ T5
```

### Fase 2 — O trilho de ícones

```
T1 ──→ T6 ──┐
T3, T4, T5 ─┴──→ T7
```

### Fase 3 — As larguras e a altura

```
T1 ──┬──→ T8
     └──→ T9
```

### Fase 4 — A tela cheia

```
T1 ──→ T10 ──┐
T2 ──────────┴──→ T11 ──┐
                  T12 ──┴──→ T13
```

### Fase 5 — A lista de seções

```
T1 ──→ T14 ──→ T15
```

### Fase 6 — O menu

```
T1 ──→ T16 ──→ T17 ──→ T18
```

### Fase 7 — Fecho

```
T18 ──→ T19
```

---

## Task Breakdown

### T1: Medir e registrar a baseline de entrada

**What**: medir os cinco workspaces do **disco**, com a árvore limpa, e escrever os números neste
arquivo (bloco *Baseline medida*), junto de lint e tipos.
**Where**: `.specs/features/47-painel-em-foco/tasks.md` (bloco no fim)
**Depends on**: None
**Reuses**: o ritual do `CLAUDE.md` — um workspace por vez, exit code fora de pipe
**Requirement**: pré-requisito de *Success Criteria* (sem regressão)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Os cinco workspaces medidos **um por vez**, cada um com `echo "exit=$?"` fora de pipe
- [ ] `pnpm lint` e `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` registrados
- [ ] `git status --short` vazio no momento da medição (baseline de árvore limpa)
- [ ] Divergências contra o `CLAUDE.md` **anotadas explicitamente**, não corrigidas em silêncio

**Tests**: none (a matriz pede `none` para artefato que não é código)
**Gate**: none
**Commit**: `docs(47): baseline de entrada, medida do disco`

---

### T2: `previewFrame` — o dono único do tamanho do quadro

**What**: acrescentar `PreviewBox`, `PreviewFrame`, `previewFrame(device, box, fullscreen)` e trocar
`previewMetrics` para receber o `frame`; a **folga entra aqui**.
**Where**: `packages/core/src/home/preview.ts` (+ `packages/core/src/home/__tests__/preview.test.ts`)
**Depends on**: T1
**Reuses**: `PREVIEW_DEVICES`, `previewScale` — estendidos, não substituídos
**Requirement**: `FOCO-16`, `FOCO-17`, `FOCO-18`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `previewFrame('desktop', box, false)` → `1024 × 768`, escala pelo **menor** dos dois eixos
- [ ] `previewFrame('desktop', box, true)` → largura `1024`, escala **exatamente `1`**, altura
      `max(768, box.height − FOLGA)` — com caso de `box.height` **menor** que 768
- [ ] `previewFrame('mobile', box, true)` → `390 × 844` **idêntico** ao modo normal (`FOCO-18`)
- [ ] `box` em `0` (jsdom antes do layout) devolve escala `1`, como hoje
- [ ] `previewMetrics(frame)` imprime a altura **realmente usada** (`1024 × 948 · 100%`)
- [ ] **Sensor embutido**: a fórmula antiga (escalar a altura do computador em tela cheia) reprova
      na mesma régua
- [ ] `catalog.test.ts` continua provando que `core/home` não importa React nem Supabase
- [ ] Gate: `pnpm --filter @estrelinha/core test; echo "exit=$?"`
- [ ] Contagem: **≥ 10 casos novos**, e o total de `core` **não cai**

**Tests**: unit
**Gate**: quick
**Commit**: `feat(47): previewFrame — um dono só para o tamanho do quadro`

---

### T3: `focusRoutes` — quais rotas pedem foco

**What**: criar `FOCUS_ROUTES` e `isFocusRoute(pathname)`, casando por `isNavActive`.
**Where**: `apps/backoffice/src/widgets/admin-layout/model/focusRoutes.ts` (+ `.test.ts`)
**Depends on**: T1
**Reuses**: `isNavActive` — **a mesma** função que marca o item ativo
**Requirement**: suporte a `FOCO-01`, `FOCO-07`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `/admin/home`, `/admin/home/abc`, `/admin/menu` → `true`
- [ ] `/admin`, `/admin/produtos`, `/admin/homologacao` (prefixo que **não** é a rota) → `false`
- [ ] **Âncora**: toda entrada de `FOCUS_ROUTES` existe em `navGroups` — uma rota de foco que não é
      destino de navegação seria um endereço que o trilho não sabe marcar
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`
- [ ] Contagem: **≥ 6 casos novos**

**Tests**: unit
**Gate**: quick
**Commit**: `feat(47): as rotas que pedem foco, ao lado de navGroups`

---

### T4: `navRail` — a preferência de trilho

**What**: `STORAGE_KEY`, `readExpanded`, `useNavRail(focus, storage)`; grava `'expandido'` e
**remove** a chave ao recolher.
**Where**: `apps/backoffice/src/widgets/admin-layout/model/navRail.ts` (+ `.test.ts`)
**Depends on**: T1
**Reuses**: molde de `navCollapse.ts` (`try/catch` mudo, estado inicializado uma vez)
**Requirement**: `FOCO-05`, `FOCO-06`, `FOCO-11`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Chave ausente → `recolhido === true` em rota de foco; `false` fora dela
- [ ] Valor `'expandido'` → `recolhido === false`
- [ ] Valor lixo (`'true'`, `'{}'`, `''`) → lido como ausente
- [ ] `storage.getItem` que **lança** → padrão, sem exceção subindo
- [ ] `storage.setItem` que **lança** → o estado em memória ainda alterna
- [ ] Recolher de volta **remove** a chave (`removeItem` chamado; `getItem` volta `null`)
- [ ] **`FOCO-11`**: asserção de que este módulo **não** lê nem escreve
      `estrelinha.admin.nav-collapsed` — as duas chaves são literais e distintas
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`
- [ ] Contagem: **≥ 9 casos novos**

**Tests**: unit
**Gate**: quick
**Commit**: `feat(47): a preferência do trilho, com a ausência significando o padrão`

---

### T5: Tirar o ponto cego do guarda do `<aside>`

**What**: estender `classesDe` em `AdminLayout.test.tsx` para enxergar
`className={cn('literal', …)}`, **mantendo** âncora e sensor. **Só o teste** — o `AdminLayout.tsx`
não muda nesta task.
**Where**: `apps/backoffice/src/widgets/admin-layout/ui/AdminLayout.test.tsx`
**Depends on**: T1
**Reuses**: a própria régua de hoje — nenhuma asserção existente é removida ou enfraquecida
**Requirement**: `FOCO-10`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `classesDe` concatena os **literais de string** dentro de `cn(...)`, além do `className="…"`
- [ ] A **âncora** de hoje (`classesDe('aside') !== ''`) continua passando com o arquivo atual
- [ ] **Sensor A** (o de hoje, preservado): a declaração antiga sem `sticky`/`h-screen`/`self-start`
      reprova
- [ ] **Sensor B** (novo): uma declaração em `cn()` **sem** os invariantes reprova — provando que a
      extensão mede, e não só deixa de falhar
- [ ] **Sensor C** (novo): um `className` dinâmico que a régua **não** consegue ler produz âncora
      vazia e **reprova** — o ponto cego não pode voltar por outra sintaxe
- [ ] Nenhuma asserção de hoje foi apagada (contagem do arquivo **sobe**)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`
- [ ] Contagem: **≥ 3 casos novos** neste arquivo, total do workspace não cai

**Tests**: unit (guarda que lê fonte do disco)
**Gate**: quick
**Commit**: `test(47): o guarda do aside passa a enxergar className dinâmico`

---

### T6: `NavRail` — o trilho de 56px

**What**: o componente do trilho: marca, botão de expandir, destinos com tooltip, separadores de
grupo, rodapé.
**Where**: `apps/backoffice/src/widgets/admin-layout/ui/NavRail.tsx` (+ `.test.tsx`)
**Depends on**: T1
**Reuses**: `navGroups`, `footerNavItems`, `isNavActive`, `@estrelinha/ui/tooltip`
**Requirement**: `FOCO-02`, `FOCO-03`, `FOCO-09`

**Tools**: MCP: `paper` (ler medidas exatas do artboard `47 · Home em foco — 1440 (lista)`) · Skill: NONE

**Done when**:
- [ ] Renderiza **exatamente** os destinos de `navGroups` + `footerNavItems`, **na ordem deles**
- [ ] **Âncora de contagem derivada da fonte**: o número esperado é computado de
      `navGroups.flatMap(...)`, nunca escrito à mão — um grupo novo não pode passar despercebido
- [ ] Cada destino tem **nome acessível** igual ao rótulo (`getByRole('link', { name })`)
- [ ] Nenhum rótulo **visível** (o texto do item não está no DOM como texto visível)
- [ ] O destino da rota atual está marcado, e **só ele**
- [ ] `FOCO-09`: toda caixa clicável declara **44px** — asserção por **token exato**
      (`(?:^|\s)h-11(?![-\w])`), porque `h-11` é substring de `min-h-11`
- [ ] **`TAP_44` NÃO é importado nem copiado** — asserção explícita de que o arquivo não o referencia
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`
- [ ] Contagem: **≥ 8 casos novos**

**Tests**: unit
**Gate**: quick
**Commit**: `feat(47): o trilho de ícones, da mesma fonte que a sidebar`

---

### T7: Fiar o trilho no `AdminLayout`

**What**: o `<aside>` passa a `cn(INVARIANTES, recolhido ? 'w-14' : 'w-60')` e ramifica entre
`<NavRail/>` e `<NavContent/>`; o botão de recolher entra no `NavContent` **só** em rota de foco.
**Where**: `apps/backoffice/src/widgets/admin-layout/ui/AdminLayout.tsx` (+ `AdminLayout.test.tsx`)
**Depends on**: T3, T4, T5, T6
**Reuses**: `NavContent` de hoje, intocado no que não é o botão
**Requirement**: `FOCO-01`, `FOCO-03`, `FOCO-04`, `FOCO-07`, `FOCO-08`, `FOCO-10`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Renderizando o **layout real** em `/admin/home` com storage limpo: o trilho aparece
- [ ] Em `/admin/home/abc`: idem (subrota)
- [ ] Em `/admin/produtos`: sidebar de 240 **e nenhum** botão de recolher (`FOCO-07`)
- [ ] Clicar no botão expande; desmontar e remontar mantém expandido; clicar de novo recolhe e a
      chave some (fio completo `FOCO-04` + `FOCO-05`)
- [ ] **Fio provado na árvore REAL**: apagar `<NavRail/>` do `AdminLayout.tsx` faz a suíte reprovar
      (verificado por injeção, mutação descartada) — nenhum teste monta a própria composição
- [ ] O `aside` mantém `sticky top-0 self-start h-screen` nos **dois** estados (régua de T5)
- [ ] `hidden md:block` intacto: abaixo de `md` nada muda (`FOCO-08`)
- [ ] `navCollapse` continua funcionando no estado expandido (`FOCO-11`, pelo layout real)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"` + `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`
- [ ] Contagem: **≥ 10 casos novos**, e os **20 de hoje** em `AdminLayout.test.tsx` continuam lá

**Tests**: unit
**Gate**: build
**Commit**: `feat(47): a navegação recolhe nas duas telas de prévia`

---

### T8: A coluna de edição da Home a 440

**What**: `lg:grid-cols-[380px_…]` → `lg:grid-cols-[440px_…]`, com a declaração guardada do disco.
**Where**: `apps/backoffice/src/pages/admin/AdminHomePage.tsx` (+ `AdminHomePage.test.tsx`)
**Depends on**: T1
**Reuses**: a própria declaração de grade
**Requirement**: `FOCO-12`, `FOCO-14`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A grade declara `440px` na primeira coluna e `minmax(0,1fr)` na segunda
- [ ] **Âncora**: a varredura acha a declaração (não casa string vazia)
- [ ] **Sensor**: `380px` reprova na mesma régua
- [ ] `FOCO-14`: asserção de que `AdminHomePage.tsx` **não** importa nada de `admin-layout` — a
      página não lê o estado do trilho, e a largura tem um dono só
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`
- [ ] Contagem: **≥ 3 casos novos**

**Tests**: unit
**Gate**: quick
**Commit**: `feat(47): a coluna de edição da Home a 440`

---

### T9: O corpo do Menu com altura de tela

**What**: a grade de `/admin/menu` ganha `lg:h-[calc(100vh-11rem)]`, a coluna da esquerda
`lg:overflow-y-auto`, e o palco passa a ocupar a altura toda.
**Where**: `apps/backoffice/src/pages/admin/AdminMenuPage.tsx` (+ `AdminMenuPage.test.tsx`)
**Depends on**: T1
**Reuses**: o molde **literal** de `AdminHomePage.tsx` — mesma altura, mesmo `min-h-0`
**Requirement**: `FOCO-13`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A grade declara a mesma altura de `/admin/home`, lida **das duas páginas do disco** e
      **comparada** — se uma mudar e a outra não, reprova
- [ ] A coluna da esquerda declara `lg:overflow-y-auto` **e** `min-h-0`/`min-w-0`
- [ ] **Sensor**: a declaração sem altura (a de hoje) reprova
- [ ] **Registrado como pendência de navegador**: `11rem` é suposição de altura de cabeçalho; a
      prova é em 1440 e em 1024, e entra no `validation.md`
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`
- [ ] Contagem: **≥ 4 casos novos**

**Tests**: unit
**Gate**: quick
**Commit**: `feat(47): a prévia do menu para de rolar junto com os editores`

---

### T10: `useFullscreenStage` — o estado e a tecla

**What**: hook com `cheia`, `entrar`, `sair`, `classes`; escuta `Escape` **só** enquanto ativo e
remove o listener ao desmontar.
**Where**: `apps/backoffice/src/shared/lib/useFullscreenStage.ts` (+ `.test.ts`)
**Depends on**: T1
**Reuses**: precedente de `shared/lib/uploadImage.ts` (`BL-009`) — o que dois `features/` precisam
mora em `shared/`
**Requirement**: `FOCO-19` (metade), suporte a `FOCO-15`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `cheia` começa `false`; `entrar()` liga; `sair()` desliga
- [ ] `Escape` com `cheia === true` sai; com `false` **não faz nada**
- [ ] Desmontar com `cheia === true` **remove** o listener (provado por `Escape` depois do unmount
      não lançar nem chamar nada)
- [ ] Outra tecla (`Enter`, `a`) não sai
- [ ] `classes` é `''` quando normal e contém `fixed`/`inset-0`/`z-50` quando cheia — **uma** fonte
      para os dois palcos
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`
- [ ] Contagem: **≥ 6 casos novos**

**Tests**: unit
**Gate**: quick
**Commit**: `feat(47): o estado da tela cheia, com um dono só`

---

### T11: Tela cheia no palco da Home

**What**: `HomeLivePreview` adota `previewFrame`, **apaga sua `FOLGA`**, ganha o botão Tela cheia /
Sair e sai do modo ao selecionar um bloco.
**Where**: `apps/backoffice/src/features/home-composition/ui/HomeLivePreview.tsx` (+ `.test.tsx`)
**Depends on**: T2, T10
**Reuses**: `previewFrame`, `useFullscreenStage`; `usePreviewBridge` **intocado**
**Requirement**: `FOCO-15`, `FOCO-19`, `FOCO-20`, `FOCO-21`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] O botão existe e está rotulado; clicar aplica as `classes` do hook na `<section>`
- [ ] **`FOCO-21` provado por IDENTIDADE DO NÓ**: guardar a referência do `<iframe>`, alternar tela
      cheia duas vezes, e o nó ser **o mesmo objeto** — e o `src` não ter mudado
- [ ] `FOCO-20`: com a tela cheia ativa, a mensagem `select` da ponte **sai do modo** e **então**
      chama `onSelect` — as duas coisas, na ordem
- [ ] `Escape` sai (fio com T10, pelo componente real)
- [ ] A métrica exibida vem de `previewMetrics(previewFrame(...))` — **sem** conta local
- [ ] **`FOLGA` não existe mais neste arquivo** (asserção lendo o fonte)
- [ ] `previa-sem-loja`: sem `VITE_STORE_URL`, o botão de tela cheia **não** é oferecido
- [ ] Gate: `pnpm --filter @estrelinha/core test` **e** `pnpm --filter @estrelinha/backoffice test`, os dois com `echo "exit=$?"`
- [ ] Contagem: **≥ 8 casos novos**

**Tests**: unit
**Gate**: full
**Commit**: `feat(47): a prévia da Home em tela cheia, sem recarregar o iframe`

---

### T12: Tela cheia no palco do Menu

**What**: o mesmo em `MenuLivePreview`, **apagando a segunda `FOLGA`**, e uma régua que recusa a
volta da constante a `apps/backoffice/**`.
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuLivePreview.tsx` (+ `.test.tsx`)
**Depends on**: T2, T10
**Reuses**: idênticos aos de T11
**Requirement**: `FOCO-15`, `FOCO-19`, `FOCO-21`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Botão, `Escape` e identidade do nó do `<iframe>` — as três, como em T11
- [ ] O selo de dispositivo continua **mostrado e não escolhido** (`NAV-37` intacto)
- [ ] **Régua do dono único da folga**: nenhum arquivo de `apps/backoffice/**` declara `FOLGA` (ou
      um literal `- 40` no cálculo de escala). **Âncora dupla** (arquivos lidos **e** os dois palcos
      encontrados) + **sensor** (a declaração antiga reprova)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`
- [ ] Contagem: **≥ 8 casos novos**

**Tests**: unit
**Gate**: quick
**Commit**: `feat(47): a prévia do menu em tela cheia, e a folga com um dono só`

---

### T13: Provar que não nasceu uma segunda prévia

**What**: estender `previaUnica.test.ts` para cobrir o modo de tela cheia, **sem afrouxar** nenhuma
asserção existente.
**Where**: `apps/backoffice/src/features/home-composition/__tests__/previaUnica.test.ts`
**Depends on**: T11, T12
**Reuses**: as réguas de hoje (`PRV-18`, `BNR-51`, `NAV-43`), intactas
**Requirement**: `FOCO-22`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Nenhum arquivo `*Preview*` novo em `home-composition/ui` nem em `store-menu/ui`
- [ ] A tela cheia **não** introduziu ramificação por tipo de seção em palco nenhum
- [ ] Os dois palcos continuam montando **um** `<iframe>` cada, e nenhum outro arquivo monta iframe
- [ ] **Sensor**: um segundo palco sintético (arquivo `FullscreenPreview.tsx` injetado) reprova
- [ ] **Nenhuma asserção de hoje foi removida ou enfraquecida** — contagem do arquivo **sobe**
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`
- [ ] Contagem: **≥ 4 casos novos**

**Tests**: unit (guarda que lê fonte do disco)
**Gate**: quick
**Commit**: `test(47): a tela cheia é um modo, não uma segunda prévia`

---

### T14: O `⋯` no lugar da lixeira

**What**: `HomeSectionRow` troca o botão de lixeira por um `DropdownMenu` com gatilho `⋯`, visível
no hover **e** no foco, sempre tabulável.
**Where**: `apps/backoffice/src/features/home-composition/ui/HomeSectionRow.tsx` (+ `HomeSectionList.test.tsx`)
**Depends on**: T1
**Reuses**: `@estrelinha/ui/dropdown-menu`; o `onRemove` de hoje, **sem** mudar a assinatura
**Requirement**: `FOCO-23`, `FOCO-24`, `FOCO-25`

**Tools**: MCP: `paper` (conferir a forma da linha no artboard aprovado) · Skill: NONE

**Done when**:
- [ ] Nenhuma linha renderiza botão com `aria-label` de remover **diretamente**
- [ ] O `⋯` é alcançável por `Tab` **sem nenhum evento de hover** — provado navegando por foco
- [ ] `focus-within` na linha revela o `⋯` (classe, lida do DOM)
- [ ] Acionar `⋯` → item **Remover** → chama `onRemove` com o id da seção
- [ ] A confirmação (`window.confirm`) e o texto **não mudam** — mesmo caminho de hoje
- [ ] Os casos de hoje que provavam a lixeira são **reescritos, não apagados** (a régua ganhou
      caso; a contagem do arquivo não cai)
- [ ] O `SPEC_DEVIATION` sobre `TAP_44` continua verdadeiro: os alvos seguem 44 reais, sem importar
      o auxiliar da loja
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`
- [ ] Contagem: **≥ 6 casos novos**

**Tests**: unit
**Gate**: quick
**Commit**: `feat(47): remover sai da linha e vira ação de menu`

---

### T15: "Remover esta seção da Home" no rodapé do editor

**What**: a ação destrutiva no rodapé de `HomeSectionEditor`, chamando o **mesmo** `onRemove`.
**Where**: `apps/backoffice/src/features/home-composition/ui/HomeSectionEditor.tsx` (+ teste
co-locado) e a fiação em `AdminHomePage.tsx`
**Depends on**: T14
**Reuses**: `handleRemove` de `AdminHomePage`, já existente
**Requirement**: `FOCO-26`, `FOCO-27`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A ação existe no rodapé do editor e é visualmente destrutiva
- [ ] **Fio provado na PÁGINA REAL**: renderizar `AdminHomePage` no editor de uma seção e acionar a
      remoção chama `deleteSection` — apagar a prop na página reprova (mutação injetada e descartada)
- [ ] `FOCO-27`: quando o hook devolve erro, a mensagem exibida é **a do erro**, sem texto próprio
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"` + `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`
- [ ] Contagem: **≥ 4 casos novos**

**Tests**: unit
**Gate**: build
**Commit**: `feat(47): remover a seção pelo editor dela`

---

### T16: `MenuEntryEditor` — os três editores num card com abas

**What**: card com `Tabs` **Painel · Banners · Ícone**, embrulhando os três editores **sem alterá-los
por dentro**; `key` por `superfície:entrada` para resetar.
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuEntryEditor.tsx` (+ `.test.tsx`) e o barrel
**Depends on**: T1
**Reuses**: `@estrelinha/ui/tabs`; `MenuPanelEditor`, `MenuBannerEditor`, `MenuIconPicker` intactos
**Requirement**: `FOCO-28`, `FOCO-29`, `FOCO-30`, `FOCO-32`

**Tools**: MCP: `paper` (artboard `47 · Menu da loja em foco — 1440`) · Skill: NONE

**Done when**:
- [ ] As três abas existem, e a inicial é **Painel**
- [ ] Cada aba monta o editor correspondente, com as props que ele já recebia
- [ ] Trocar `host` **ou** `surface` volta para **Painel** (`FOCO-30`) — os dois, em casos separados
- [ ] `FOCO-32`: o número na aba *Banners* sai da **mesma** leitura que o `MenuBannerEditor` usa;
      asserção de que não existe contagem paralela no arquivo
- [ ] O nome do arquivo **não** contém `Preview` (`previaUnica`)
- [ ] **Risco do design**: conferir que a grade do `MenuIconPicker` embrulha dentro de 440 — se não,
      corrigir **o contêiner do card**, nunca a medida da célula
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`
- [ ] Contagem: **≥ 8 casos novos**

**Tests**: unit
**Gate**: quick
**Commit**: `feat(47): a entrada do menu se edita num lugar só`

---

### T17: Fiar o card e subir o "Salvando…"

**What**: `AdminMenuPage` passa a montar `MenuEntryEditor` na coluna esquerda, tira o
`MenuIconPicker` da direita, e move o `Salvando…` para as `actions` do `PageHeader`.
**Where**: `apps/backoffice/src/pages/admin/AdminMenuPage.tsx` (+ `AdminMenuPage.test.tsx`)
**Depends on**: T16
**Reuses**: `PageHeader` (`actions`), o estado `salvando` já existente
**Requirement**: `FOCO-29`, `FOCO-31`, `FOCO-33`, `FOCO-34`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] **Fio na PÁGINA REAL**: com uma entrada selecionada, as três abas aparecem; apagar
      `<MenuEntryEditor/>` da página reprova (mutação injetada e descartada)
- [ ] A coluna da direita contém **só** o palco — `MenuIconPicker` não está mais lá (`FOCO-29`)
- [ ] Sem entrada selecionada, `sem-entrada-selecionada` continua aparecendo (`FOCO-31`)
- [ ] `Salvando…` aparece no cabeçalho durante a gravação e **some** depois — provado por
      **ausência do nó**, não por classe de invisibilidade (`FOCO-34`)
- [ ] Nenhum `<p>` de "Salvando…" no fim do documento
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"` + `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`
- [ ] Contagem: **≥ 6 casos novos**

**Tests**: unit
**Gate**: build
**Commit**: `feat(47): o editor da entrada na coluna, e o aviso onde se clica`

---

### T18: As abas Entradas / Prévia abaixo de `lg`

**What**: alternador de **vista** em `/admin/menu`, em forma de **barra de abas sublinhada** — e não
de pílula, para não se confundir com o alternador de dispositivo logo acima.
**Where**: `apps/backoffice/src/pages/admin/AdminMenuPage.tsx` (+ `AdminMenuPage.test.tsx`)
**Depends on**: T17
**Reuses**: o molde de `abas-mobile` de `AdminHomePage`, com a forma trocada por `FOCO-37`
**Requirement**: `FOCO-35`, `FOCO-36`, `FOCO-37`

**Tools**: MCP: `paper` (artboard `47 · Menu da loja — 390px`) · Skill: NONE

**Done when**:
- [ ] O alternador existe e declara `lg:hidden` (`FOCO-36`)
- [ ] Escolher *Prévia* esconde a coluna de entradas e mostra o palco, e vice-versa — pelas classes
      declaradas, já que jsdom não mede layout
- [ ] `FOCO-37`: régua escrita como **predicado**, chamada pela asserção **e** pelo sensor: o
      alternador de dispositivo tem fundo de pílula; o de vista tem borda inferior e **não** tem
      fundo de pílula. **Sensor**: dois controles com a mesma forma reprovam
- [ ] Os alvos do alternador medem ≥ 44px
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"`
- [ ] Contagem: **≥ 6 casos novos**

**Tests**: unit
**Gate**: quick
**Commit**: `feat(47): o menu ganha as abas de vista no celular`

---

### T19: Fecho — medir o delta e passar a documentação

**What**: remedir os cinco workspaces, atualizar as baselines do `CLAUDE.md` da raiz e o
`apps/backoffice/CLAUDE.md`, e registrar as pendências de navegador.
**Where**: `CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `.specs/STATE.md` (Handoff), `tasks.md`
**Depends on**: T18 (e o fecho de todas as anteriores)
**Reuses**: o ritual de fecho do `CLAUDE.md`
**Requirement**: *Success Criteria*

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Cinco workspaces remedidos **um por vez**, exit code fora de pipe; delta contra T1 escrito
- [ ] Lint e tipos comparados contra T1 — **sem regressão**
- [ ] `git diff --name-only` prova `packages/core/src/payment/**` **sem uma linha alterada**
- [ ] Tabela de guardas do `CLAUDE.md` ganha as réguas novas (trilho, folga, forma dos alternadores)
- [ ] `apps/backoffice/CLAUDE.md` descreve o modo de foco e a tela cheia
- [ ] `STATE.md` Handoff atualizado; **pendências declaradas**: prova em navegador (390 · 768 · 1024 ·
      1440), o `11rem` do menu, e a dívida do estado de falha do iframe
- [ ] `pnpm build` verde nos dois apps

**Tests**: none
**Gate**: build
**Commit**: `docs(47): baselines, guardas e handoff`

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7

Fase 1:  T1 ──→ T2 ──→ T3 ──→ T4 ──→ T5      (T2…T5 dependem só de T1)
Fase 2:  T6 ──→ T7
Fase 3:  T8 ──→ T9                            (independentes entre si)
Fase 4:  T10 ──→ T11 ──→ T12 ──→ T13
Fase 5:  T14 ──→ T15
Fase 6:  T16 ──→ T17 ──→ T18
Fase 7:  T19
```

**Empacotamento previsto** (~7 tasks por worker, fases inteiras):

| Lote | Fases | Tasks |
| --- | --- | --- |
| 1 | Fase 1 + Fase 2 | T1 … T7 (7) |
| 2 | Fase 3 + Fase 4 | T8 … T13 (6) |
| 3 | Fase 5 + Fase 6 + Fase 7 | T14 … T19 (6) |

19 tasks ⇒ **3 lotes** ⇒ a oferta de sub-agentes se aplica no Execute (oferecer, nunca despachar sem
aceite).

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | medição + 1 bloco de doc | ✅ |
| T2 | 1 função + tipos, 1 arquivo | ✅ |
| T3 | 1 módulo (constante + predicado), 1 arquivo | ✅ |
| T4 | 1 módulo (hook + leitor), 1 arquivo | ✅ |
| T5 | 1 função de teste estendida, 1 arquivo | ✅ |
| T6 | 1 componente | ✅ |
| T7 | 1 arquivo modificado (fiação) | ✅ |
| T8 | 1 declaração de grade | ✅ |
| T9 | 1 declaração de grade | ✅ |
| T10 | 1 hook | ✅ |
| T11 | 1 componente modificado | ✅ |
| T12 | 1 componente modificado + 1 régua | ⚠️ coeso — a régua da folga só faz sentido quando as **duas** constantes sumiram, e a segunda some aqui |
| T13 | 1 arquivo de guarda estendido | ✅ |
| T14 | 1 componente modificado | ✅ |
| T15 | 1 componente + a fiação na página | ⚠️ coeso — a ação e o fio dela são a mesma entrega; separar produziria código não verificado |
| T16 | 1 componente novo | ✅ |
| T17 | 1 página modificada | ✅ |
| T18 | 1 página modificada | ✅ |
| T19 | documentação | ✅ |

Nenhuma ❌. As duas ⚠️ são coesão declarada, não escopo inflado.

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| --- | --- | --- | --- |
| T1 | None | (raiz) | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1 | T1 → T3 | ✅ |
| T4 | T1 | T1 → T4 | ✅ |
| T5 | T1 | T1 → T5 | ✅ |
| T6 | T1 | T1 → T6 | ✅ |
| T7 | T3, T4, T5, T6 | T3,T4,T5,T6 → T7 | ✅ |
| T8 | T1 | T1 → T8 | ✅ |
| T9 | T1 | T1 → T9 | ✅ |
| T10 | T1 | T1 → T10 | ✅ |
| T11 | T2, T10 | T2,T10 → T11 | ✅ |
| T12 | T2, T10 | T2,T10 → T12 | ✅ |
| T13 | T11, T12 | T11,T12 → T13 | ✅ |
| T14 | T1 | T1 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T1 | T1 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Camada criada/alterada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | nenhuma (documento) | none | none | ✅ |
| T2 | Regra pura em `core` | unit | unit | ✅ |
| T3 | Modelo de app | unit | unit | ✅ |
| T4 | Modelo de app | unit | unit | ✅ |
| T5 | Guarda que lê fonte | unit (âncora + sensor) | unit | ✅ |
| T6 | Componente de UI | unit | unit | ✅ |
| T7 | Componente de UI + guarda | unit | unit | ✅ |
| T8 | Página + guarda | unit | unit | ✅ |
| T9 | Página + guarda | unit | unit | ✅ |
| T10 | Lib de app | unit | unit | ✅ |
| T11 | Componente de UI (+ consome `core`) | unit | unit | ✅ |
| T12 | Componente de UI + guarda | unit | unit | ✅ |
| T13 | Guarda que lê fonte | unit | unit | ✅ |
| T14 | Componente de UI | unit | unit | ✅ |
| T15 | Componente + página | unit | unit | ✅ |
| T16 | Componente de UI | unit | unit | ✅ |
| T17 | Página | unit | unit | ✅ |
| T18 | Página | unit | unit | ✅ |
| T19 | nenhuma (documento) | none | none | ✅ |

Nenhuma ❌ VIOLATION. Nenhuma task produz código não verificado; nenhum teste foi adiado para outra
task.

---

## Baseline medida

> **Medida por T1 em 2026-09-12**, no worktree `../store-47-painel-em-foco` (branch
> `feat/47-painel-em-foco` em `056da12`), com `git status --short` **vazio**, um workspace por vez e
> `echo "exit=$?"` **fora de pipe**. A árvore é a `master` de `15a728b` — ou seja, **inclui a `46`
> inteira**, que outra sessão fechava enquanto esta media.

| Workspace | Entrada (T1) | Saída (T19) | Delta |
| --- | --- | --- | --- |
| store | **3069 / 198** · exit 0 | **3069 / 198** · exit 0 | **0** — não tocado, remedido |
| backoffice | **2073 / 123** · exit **1** (2072 passam, **1 reprova**) | **2204 / 129** · exit **1** (2203 passam, **a mesma 1**) | **+131 / +6** |
| core | **2186 / 84** · exit 0 | **2199 / 84** · exit 0 | **+13** |
| functions | **436 / 8** · exit **1** (435 passam, **1 reprova**) | **436 / 8** · exit **1** (**a mesma 1**) | **0** — não tocado, remedido |
| catalog-import | **512 / 23** · exit 0 | **512 / 23** · exit 0 | **0** — não tocado, remedido |

**Total de entrada: 8276 em 436 arquivos** · **de saída: 8420 em 442** · **delta +144 / +6**, em dois
workspaces. As **duas** reprovações do fecho são **exatamente** as duas herdadas da `46` — nenhuma
terceira apareceu.

> **A flake documentada apareceu duas vezes no fecho, e mudou de arquivo entre as execuções**:
> `CategoryInspector.test.tsx:250` numa, `SlugField.test.tsx:342` na outra — as duas varrem disco e
> as duas estouraram o timeout de 5s sob carga. **As duas passam isoladas** (22/22 e 27/27).
> **A medição definitiva usou `--testTimeout=20000`**, que é o achado que a `46` documentou no
> `CLAUDE.md` enquanto esta feature corria: com ele a flake não aparece, e o workspace fecha em
> **2204, com 2203 passando**. Medir a suíte do painel com o teto padrão de 5s mede a **máquina**, e
> não o código.

Lint: **27 erros / 8 warnings** na entrada e **27 / 8** na saída (backoffice 25/4 · store 2/4) ·
Tipos: backoffice **0 → 0**; store **5 → 5** (todos herdados da `46`, não tocados) ·
`pnpm build` **verde nos dois apps** · `packages/core/src/payment/**` **sem uma linha alterada**,
conferido por `git diff --name-only`.

> **Um warning novo apareceu e foi consertado na origem, não anotado.** `react-refresh/only-export-components`
> acusou `MenuBannerEditor.tsx` quando a leitura `bannersGravados` passou a ser exportada dali para a
> aba "Banners" usar a **mesma** contagem (`FOCO-32`). O conserto não foi silenciar a regra: a função
> foi para `model/bannersGravados.ts`, que é onde ela já devia estar — helper que dois componentes
> consomem não mora dentro de um deles. O dono continua único, e o lint voltou à baseline.

### Onde os testes nasceram

**Contagens LIDAS da saída do runner**, arquivo por arquivo, depois das correções da verificação
independente. A primeira escrita desta tabela tinha quatro linhas erradas — os totais por workspace
batiam, mas a atribuição por arquivo era de memória. **É o mesmo defeito da baseline, um nível
abaixo**: número anotado de cabeça mente sem quebrar nada.

> **A régua que fecha esta tabela é a SOMA, e ela achou o erro que as medições não acharam.** Depois
> de reler as 14 saídas do runner, uma coluna de **entrada** continuava errada — `HomeSectionList`
> estava como 24 e o arquivo tinha **26** em `056da12`. Medir a saída não conserta isso: só a soma
> denuncia. Fechando: `novos (61) + deltas (70) = 131 = 2204 − 2073`. Com a linha errada a conta dava
> 133, e o número de **entrada** do workspace é quem pagava a diferença. **Toda tabela de origem de
> teste precisa fechar contra o delta do workspace** — senão ela vira contabilidade que ninguém
> confere.
>
> | Parcela | Soma |
> | --- | --- |
> | arquivos novos | 8 + 13 + 13 + 8 + 5 + 14 = **61** |
> | deltas em arquivos existentes | 14 + 11 + 10 + 6 + 4 + 7 + 18 = **70** |
> | **total** | **131** = 2204 − 2073 ✓ |

| Arquivo | Entrada → saída |
| --- | --- |
| `core/home/__tests__/preview.test.ts` | 24 → **37** (+13) — `previewFrame`, com o sensor da fórmula antiga |
| `admin-layout/model/focusRoutes.test.ts` | **novo, 8** |
| `admin-layout/model/navRail.test.ts` | **novo, 13** |
| `admin-layout/ui/NavRail.test.tsx` | **novo, 13** |
| `admin-layout/ui/AdminLayout.test.tsx` | 16 → **30** (+14) — 3 da régua de `cn()` e 11 do fio do trilho |
| `shared/lib/useFullscreenStage.test.ts` | **novo, 8** |
| `shared/lib/__tests__/folgaDoPalco.test.ts` | **novo, 5** |
| `home-composition/ui/HomeLivePreview.test.tsx` | 12 → **23** (+11) |
| `store-menu/ui/MenuLivePreview.test.tsx` | 17 → **27** (+10) |
| `home-composition/__tests__/previaUnica.test.ts` | 22 → **28** (+6) |
| `home-composition/ui/HomeSectionList.test.tsx` | 26 → **30** (+4) |
| `store-menu/ui/MenuEntryEditor.test.tsx` | **novo, 14** |
| `pages/admin/AdminHomePage.test.tsx` | 40 → **47** (+7) |
| `pages/admin/AdminMenuPage.test.tsx` | 32 → **50** (+18) |

### O que a verificação independente (autor ≠ verificador) mudou

Ela devolveu **FAIL** na primeira rodada, com **2 mutantes sobreviventes de 18** — e os dois eram
buracos reais, não estilo:

| # | O que sobrevivia | O conserto |
| --- | --- | --- |
| 1 | Apagar o `return () => removeEventListener(...)` de `useFullscreenStage` deixava **52 testes verdes**. O caso asseria `expect(() => teclar('Escape')).not.toThrow()`, **verdade nos dois mundos**: em React 18 um `setState` depois do unmount é no-op silencioso | A régua virou **identidade do handler**: o que entrou no `addEventListener` tem de ser exatamente o que sai no `removeEventListener`, e o saldo de ouvintes tem de fechar em zero. Mais um caso para `sair()`, que é o mesmo vazamento pela outra porta |
| 2 | Trocar a altura do quadro por `PREVIEW_DEVICES[device].height` deixava **26 verdes**: a barra imprimiria `1024 × 948` e o iframe sairia com **768**. `FOCO-16`/`FOCO-17` estavam provados **só em `core`** | O teste passou a **medir o palco**: um `ResizeObserver` dublê entrega uma caixa de verdade (jsdom não implementa o observador, então a caixa ficava `{0,0}` e os dois modos imprimiam o mesmo texto). Três casos novos cobrem palco alto, palco apertado e o celular que não estica |

Mais seis correções de régua, todas da mesma família — **a asserção que passaria sob uma
implementação plausivelmente errada**: o alvo de 44px era filtrado por `includes('h-11')` e depois
cobrado por `h-11` (circular; agora enumera **por papel**, do DOM); dois sensores não chamavam o
extrator da asserção (comparavam literais escritos no próprio caso); e duas asserções provavam a aba
Ícone e o nome do arquivo por coisas que passariam com o componente apagado.

**E duas correções de baseline**: o typecheck do store tem **5** erros herdados, não 1 — só o
primeiro da tela tinha sido contado. **Erro de tipo se conta com `grep -c`, não se lê.**

### Divergências contra o `CLAUDE.md` — anotadas, NÃO corrigidas em silêncio

A tabela do `CLAUDE.md` (fechada na `45`) está desatualizada em **quatro** das cinco linhas. A
diferença é a `46`, que entrou na árvore depois dela:

| Medida | `CLAUDE.md` diz | Medido em T1 | Delta |
| --- | --- | --- | --- |
| store | 2955 / 189 | **3069 / 198** | +114 / +9 |
| backoffice | 2023 / 119 | **2073 / 123** | +50 / +4 |
| core | 2128 / 80 | **2186 / 84** | +58 / +4 |
| functions | 436 / 8 | **436 / 8** | 0 — mas **1 reprova** agora |
| catalog-import | 512 / 23 | **512 / 23** | 0 |
| lint | 27 / 6 | **27 / 8** | +2 warnings (store 2/1 → 2/4) |
| tipos | 0 · 0 · 0 | **0 (bo) · 5 (store)** | +5 erros no store |

**O total de 8054 do `CLAUDE.md` nunca existiu nesta árvore** — é a soma de números anteriores à
`46`. É a lição que a `45` já registrou, acontecendo de novo e pelo mesmo motivo.

### As TRÊS falhas herdadas — da `46`, não desta feature

> **Registro histórico: as três foram consertadas pela própria `46`, e o merge as apagou.** O que
> está escrito abaixo era verdade durante toda a execução da `47`, e é por isso que fica: foi contra
> estes números que o gate dela comparou. A árvore mesclada (2026-09-13) fecha **limpa** —
> 8438 em 444, tipos 0·0·0. Ver a tabela da árvore mesclada no `CLAUDE.md` da raiz.

Nenhuma é tocada aqui. As três nasceram fora desta árvore de trabalho, em arquivos que esta feature
**não possui**, e a regra que a `45` deixou escrita (dividir a propriedade dos arquivos por escrito
quando duas sessões trabalham em paralelo) manda **registrar**, não consertar por conta própria:

| # | Onde | O quê |
| --- | --- | --- |
| 1 | `apps/backoffice/src/features/faq-library/ui/FaqEditorDialog.test.tsx:126` | assere `0 / 600`; a tela mostra `0 / 4000`. A `46` subiu `FAQ_ANSWER_MAX` de 600 para 4000 em `packages/core/src/faq/faq.ts:157` e o literal do teste ficou para trás |
| 2 | `supabase/functions/sitemap/__tests__/handlers.test.ts:70` | assere `toHaveLength(10)` e recebe **11**. A `46` acrescentou `/perguntas-frequentes` aos caminhos estáticos e a **âncora de contagem** da function não acompanhou — exatamente o risco de âncora compartilhada que o `CLAUDE.md` descreve desde a `45` |
| 3 | `apps/store/src/entities/faq/ui/FaqSubjectNav.tsx:33` | `TS2322` — `MutableRefObject<HTMLElement>` num `ref` de `HTMLDivElement`. O typecheck do store sai de **0** e vai a **1** |

**Consequência para o gate desta feature**: "sem regressão" passa a ser medido contra
**3069 · 2073 (1 ✗) · 2186 · 436 (1 ✗) · 512**, e as duas reprovações herdadas têm de continuar
sendo **exatamente essas duas** no fecho. Uma terceira seria regressão desta feature.
