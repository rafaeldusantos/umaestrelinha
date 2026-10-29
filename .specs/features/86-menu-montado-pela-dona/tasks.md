# 86 — O menu montado pela dona: Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

**Overrides deste projeto (valem sobre a skill):**
- **Sem commit por task e sem commit no fim** — só quando o usuário pedir (`CLAUDE.md` › Commits, e a
  preferência registrada do usuário). Sub-agentes não usam `git stash`.
- **Testes, probes e provas só contra o ambiente local** (Supabase em `:54441`); a prova em navegador
  bloqueia `*.supabase.co` por rota.
- **Sem migration nesta feature.** Se alguma task concluir que precisa de uma, PARE e pergunte.
- Depois da última task: Verifier independente → QA (`qa-report` + `qa-execution`) → conserto e
  reteste, de ponta a ponta.

---

**Design**: `.specs/features/86-menu-montado-pela-dona/design.md`
**Status**: Concluído — verificado (3 rodadas + fecho) e QA ready (2026-10-29, base `d101ca2f`, árvore principal (`master`), sem commits)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found:
> `CLAUDE.md` (raiz: guardas com âncora dupla e sensor, "teste não monta a árvore que prova",
> mobile-first com prova em 390, baselines sem regressão), `apps/backoffice/CLAUDE.md`,
> `apps/store/CLAUDE.md`, `packages/core/CLAUDE.md`, `vitest.config.ts` de cada workspace.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| `core/menu` (forma, leitura, conversão, porta, recusas, ponte) | unit | todo ramo; 1:1 com os MNM; todo edge case da spec; sensor de pureza e de alcance Deno | `packages/core/src/menu/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Painel — model (ops puras, hook de gravação) | unit (hook com dublê do client que **registra** filtros e devolve só o que o `select` pediu) | toda op; conflito, falha e rollback; recusa antes da rede | `apps/backoffice/src/features/store-menu/model/*.test.ts` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Painel — UI (componentes) | component (RTL) | happy + edge + erro de cada MNM do componente; alvo ≥ 44 por token exato; nomes acessíveis | `apps/backoffice/src/features/store-menu/ui/*.test.tsx` | idem |
| Painel — página | component pela **`AdminMenuPage` real** (fiação) | cada fluxo da spec ponta a ponta na página: adicionar, editar, reordenar, remover, dispositivos, prévia | `apps/backoffice/src/pages/admin/AdminMenuPage.test.tsx` | idem |
| Loja — hooks e widgets do menu | component pelo **`Header` real** e pelo `MobileMenu` | legado idêntico ao de hoje; documento v2; filho por `href`; link com painel; banners por nó | `apps/store/src/{entities/category,entities/menu,widgets/header,widgets/mobile-menu}/**/__tests__/*` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Guardas de fonte | unit (lê o disco) | âncora dupla + sensor por régua + inverso | `apps/store/src/shared/lib/__tests__/*.test.ts` | idem store |
| Gravação real | probe HTTP contra o banco local | grava, conflita, não toca `categories` | `.specs/features/86-menu-montado-pela-dona/probes/*` | script do probe |
| Layout | prova em navegador | 390×844 e 1440×900, sem rolagem horizontal, alvos ≥ 44, prévia nos dois dispositivos | `.specs/features/86-menu-montado-pela-dona/prova-navegador.md` | Playwright |

## Gate Check Commands

> Generated from codebase — confirm before Execute. Um workspace por vez, exit code fora de pipe,
> `--testTimeout=20000` **sem** o `--` antes.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick (core) | tasks só de `packages/core` | `pnpm --filter @estrelinha/core test` |
| Quick (painel) | tasks só do painel | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Quick (loja) | tasks só da loja | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Full | toda task que muda `core` ou um guarda (os guardas da loja varrem os dois apps) | core + backoffice + store, um por vez |
| Build | fim de cada fase | Full + `npx tsc --noEmit -p apps/store/tsconfig.app.json` · `-p apps/backoffice/tsconfig.app.json` · `-p packages/core/tsconfig.json` (11 herdados) + `npx eslint .` em `apps/store` e `apps/backoffice` (2/2 · 23/5) + `pnpm build` |

---

## Execution Plan

### Phase 1: Medida e núcleo (`core/menu`)

```
T01 → T02 → T03 → T04 → T05 → T06
```

### Phase 2: A loja lê o documento

```
T07 → T08 → T09 → T10
```

### Phase 3: O modelo do painel

```
T11 → T12 → T13
```

### Phase 4: A tela do painel

```
T14 → T15 → T16 → T17 → T18 → T19
```

### Phase 5: Limpeza, guardas e prova

```
T20 → T21 → T22 → T23
```

---

## Task Breakdown

### T01: Medir a entrada (baseline)

**What**: Medir testes, tipos e lint dos workspaces tocados com a árvore parada e registrar em `baseline.md`.
**Where**: `.specs/features/86-menu-montado-pela-dona/baseline.md`
**Depends on**: None
**Reuses**: formato de `baseline.md` da `85`
**Requirement**: gate de todas

**Done when**:
- [ ] core, backoffice, store medidos um por vez, exit code fora de pipe, com o comando da tabela acima
- [ ] tipos (3 projetos) e lint (2 apps) registrados; divergência da tabela do `CLAUDE.md` anotada

**Tests**: none (medição) · **Gate**: —


**Status (2026-10-28): ✅ concluída.** `baseline.md`: core 4767/186 · backoffice 4301/240 · store 6176/330, os três exit 0; tipos 0 · 0 · core 11 herdados; lint store 2/2 · backoffice 23/5. Nenhuma divergência da tabela do `CLAUDE.md`.
---

### T02: Forma e leitura do documento

**What**: `core/menu/structure.ts` com os tipos de `design.md` › Data Models e `parseMenuDocument`.
**Where**: `packages/core/src/menu/structure.ts`, `packages/core/src/menu/index.ts`, `packages/core/src/menu/__tests__/structure.test.ts`
**Depends on**: T01
**Reuses**: `menuIconKey`, `menuBannerSlots`
**Requirement**: MNM-01, MNM-36 (nó com destino sumido fica)

**Done when**:
- [ ] `null`/array/sem `version: 2` ⇒ `null`; nó sem `id`, alvo inválido ou não-objeto é descartado; categoria inexistente **fica**
- [ ] `structure.ts` importa só `./menu.ts`/`./icons.ts` com `.ts` explícito (inclusive `import type`); `menu.ts` **não** importa `structure.ts`; os `denoReach` de `core` seguem verdes com as mesmas âncoras
- [ ] `purity.test.ts` de `core/menu` alcança o arquivo novo
- [ ] Gate full passa; contagem registrada

**Tests**: unit · **Gate**: full


**Status (2026-10-28): ✅ concluída.** `structure.ts` (tipos, `parseMenuDocument`, `menuNodeState`, `menuNodeName`) + `__tests__/structure.test.ts` (35). `menu.ts` não importa `structure.ts` (guardado no próprio teste, com sensor). `purity.test.ts` alcança o arquivo novo por construção (lê o diretório). **SPEC_DEVIATION**: `structure.ts` também faz `import type { MenuBanners } from './banners.ts'` (o tipo de `MenuRootNode.banners` do design), com `.ts`. Core 4878/190 no fecho do lote.
---

### T03: Conversão do legado

**What**: `legacyMenuDocument(categories, links)` — o menu de hoje (as duas superfícies unidas) como documento v2.
**Where**: `structure.ts`, `__tests__/legacy.test.ts`; `menuItems` atual renomeado `legacyMenuItems` em `menu.ts`
**Depends on**: T02
**Reuses**: `legacyMenuItems` (o `menuItems` de hoje), `categories.menu_banners`
**Requirement**: MNM-34, MNM-40, Success Criterion 3

**Done when**:
- [ ] item só no computador ⇒ `desktop: true, mobile: false`, e o inverso; filhos com as chaves de cada superfície
- [ ] ordem = a de hoje (`byMenuOrder`); links legados viram nós `link` com rótulo e ícone; banners copiados da categoria
- [ ] determinística: duas chamadas devolvem documentos iguais, ids estáveis derivados do alvo (`cat:<id>`, `link:<id>`)
- [ ] Gate full passa

**Tests**: unit · **Gate**: full


**Status (2026-10-28): ✅ concluída.** `menuItems` de `menu.ts` virou `legacyMenuItems` (e os tipos `LegacyMenuItem`/`LegacyMenuCategoryItem`/`LegacyMenuLinkItem` — o nome `MenuItem` passou à saída nova). `legacyMenuDocument` em `structure.ts` + `__tests__/legacy.test.ts` (13). **Testes antigos reescritos só no import**: `menuItems.test.ts` (62) e `menu.test.ts` (URL-03) importam `legacyMenuItems as menuItems` e `LegacyMenuCategoryItem as MenuCategoryItem` — nenhuma asserção tocada, continuam medindo o mesmo motor.
---

### T04: A porta `menuItems` lê o documento (e os widgets da loja compilam)

**What**: `menuItems({ categories, document, links }, surface)` em `structure.ts` com a saída nova (`MenuItem`/`MenuChild`); `menuPanelColumns` genérico; `MegaMenu` e `MobileMenu` passam a usar `child.href`/`child.name`.
**Where**: `structure.ts`, `menu.ts` (`menuPanelColumns`), `index.ts`, `apps/store/src/widgets/header/ui/MegaMenu.tsx`, `apps/store/src/widgets/mobile-menu/ui/MobileMenu.tsx`, testes de `core` e dos dois widgets
**Depends on**: T03
**Requirement**: MNM-15, MNM-27..30, MNM-35, MNM-36, MNM-39

**Done when**:
- [ ] `document` ausente ⇒ `menuItems(legacyMenuDocument(...))`, e a saída da loja de hoje (fixture real da `39`) é **igual** à de antes, item a item, nas duas superfícies
- [ ] `label: null` usa o nome atual da categoria; renomear a categoria muda o nome (MNM-15)
- [ ] invisível na superfície, inativo ou apagado não sai — item e filho; categoria inativa leva o submenu junto
- [ ] `hasPanel` = filho visível **ou** banner na superfície, para categoria **e** link
- [ ] sem teto na raiz (20 itens ⇒ 20)
- [ ] `MegaMenu`/`MobileMenu`: filho não-filha (outra categoria, link) leva ao `href` dele — caso pelo `Header` real
- [ ] tipos 0 na loja; gate full passa

**Tests**: unit + component · **Gate**: full


**Status (2026-10-28): ✅ concluída.** Porta em `structure.ts` + `__tests__/structureMenuItems.test.ts` (27: equivalência item a item com `legacyMenuItems` nas duas superfícies sobre a árvore real da 16/39, inclusive o `href` dos filhos igual ao `categoryPath(filha.slug, item.slug)` de antes) e `apps/store/.../HeaderMenuDocumento.test.tsx` (3, `Header` + `MegaMenu` + porta reais; mutante no `to` do filho reinjetado e morto). `menuPanelColumns` genérico. **SPEC_DEVIATION**: `MenuItem` ganhou `categoryId: string \| null` — o `useMenuBanners` ainda acha os banners pela categoria até T08. O painel continua no motor legado (`AdminMenuPage`/`MenuSlotList` importam `legacyMenuItems`), porque grava por id de CATEGORIA; a prévia dele converte o legado em documento (`MenuLivePreview`). **Testes antigos reescritos** (fixtures, réguas iguais): `MegaMenu.test.tsx` e `MobileMenu.test.tsx` (o filho virou `MenuChild`, com o `href` que o widget montava antes). Store 6179/331.
---

### T05: Recusas e limites

**What**: `core/menu/refusals.ts` — `MENU_LABEL_MAX`, `MENU_SUBMENU_LIMIT`, `menuNodeLabelRefusal`, `internalMenuHrefRefusal`, `menuDocumentRefusal`.
**Where**: `packages/core/src/menu/refusals.ts`, `__tests__/refusals.test.ts`
**Depends on**: T02
**Reuses**: `menuTargetRefusal`, `menuBannerRefusal`
**Requirement**: MNM-10, MNM-12, MNM-14, MNM-16, MNM-24, MNM-25, MNM-31

**Done when**:
- [ ] 40 aceita, 41 recusa; vazio e só espaços recusam; `null` aceita
- [ ] `https://…`, `http://…`, `//host`, vazio e rota inexistente recusam com motivo legível; `/sobre`, `/produtos/x` e caminho de categoria aceitam
- [ ] 24 filhos aceita, 25 recusa; categoria repetida na raiz recusa; repetida no **mesmo** submenu recusa; em submenus diferentes aceita
- [ ] link externo **já gravado** passa em `menuDocumentRefusal` (MNM-31); só a criação usa `internalMenuHrefRefusal`
- [ ] `menuSemTeto.test.ts` segue verde (nenhum nome proibido); gate full passa

**Tests**: unit · **Gate**: full


**Status (2026-10-28): ✅ concluída.** `refusals.ts` + `__tests__/refusals.test.ts` (32). `menuSemTeto.test.ts` verde (nenhum símbolo proibido, nenhum "vaga"). Exportado pelo barril.
---

### T06: Ponte da prévia com o documento

**What**: `MenuPreviewDraft = { categories, document }`; `open` carrega id de nó; mensagem em forma desconhecida ⇒ `null`.
**Where**: `packages/core/src/menu/preview.ts`, `__tests__/preview.test.ts`
**Depends on**: T02
**Requirement**: MNM-13, MNM-32

**Done when**:
- [ ] rascunho sem `document` válido (inclusive a forma `{ categories, links }` da `39`) ⇒ `null`
- [ ] gate full passa (o painel e a loja ainda compilam: consumidores ajustados aqui só no tipo, comportamento em T10/T19)

**Tests**: unit · **Gate**: full


**Status (2026-10-28): ✅ concluída.** `MenuPreviewDraft = { categories, document }`; a forma `{ categories, links }` da 39 e documento inválido ⇒ `null`. **Testes antigos reescritos**: `preview.test.ts` (os 3 casos de `links` viraram 7 do documento, régua mais apertada), `useMenu.test.tsx` (os 3 rascunhos de NAV-44 passaram à forma nova, asserções iguais), `useMenuPreview.test.tsx` (fixture), `MenuLivePreview.test.tsx` (o rascunho leva `legacyMenuDocument` e o `open` leva `cat:`/`link:` — +1 caso). Backoffice 4302/240. **Build gate do lote**: core 4878/190 · backoffice 4302/240 · store 6179/331 (exit 0 os três); tipos 0 · 0 · core 11; lint 2/2 · 23/5; `pnpm build` da loja e do painel verdes.
---

### T07: `useMenu` lê o documento

**What**: a loja passa `parseMenuDocument(settings.menu)` à porta; com rascunho, `draft.document`.
**Where**: `apps/store/src/entities/category/api/useMenu.ts` + teste
**Depends on**: T04, T06
**Requirement**: MNM-28..30, Success Criterion 3, `L-037`

**Done when**:
- [ ] sem v2 ⇒ menu igual ao de hoje; com v2 ⇒ o documento; settings ainda carregando ⇒ nenhum item inventado (sem `DEFAULT_MENU` como estado)
- [ ] gate quick (loja) passa

**Tests**: component · **Gate**: quick


**Status (2026-10-28): ✅ concluída.** `useMenu` passa `parseMenuDocument(settings.menu)` à porta (sem v2 ⇒ `links` legados ⇒ o menu de hoje); com rascunho, `draft.document`. **Settings ainda carregando ⇒ `[]`** (`L-037`): sem a linha não se sabe se há v2, e desenhar o legado nesse meio-tempo faria a barra pular para a montagem nova — é uma mudança de comportamento de propósito (antes, as categorias apareciam antes dos links chegarem). `MenuSettings` (`packages/supabase/src/types/settings.ts`) ganhou `version?: 2; items?: unknown[]` — **SPEC_DEVIATION**: `unknown[]`, e não `MenuRootNode[]` como no design, porque quem diz o que do jsonb vale é `parseMenuDocument`, e importar `structure.ts` dali aumentaria o grafo que o Deno resolve. +4 casos em `useMenu.test.tsx` (v2 vence as colunas; `version: 1` ⇒ legado; carga ⇒ vazio com sensor; rascunho vence a carga). Mutante `if (!carregou) return []` apagado reinjetado: morto.

---

### T08: Banners por nó

**What**: `useMenuBanners(item, surface)` lê `item.banners`; `MegaMenu` e `MobileMenu` o chamam com o item.
**Where**: `apps/store/src/entities/menu/api/useMenuTargets.ts`, `MegaMenu.tsx`, `MobileMenu.tsx`, testes
**Depends on**: T07
**Requirement**: MNM-33, MNM-27

**Done when**:
- [ ] banner de um item de **link** aparece no painel dele (pelo `Header` real)
- [ ] item sem banner nem filho é link direto, sem seta
- [ ] gate quick (loja) passa

**Tests**: component · **Gate**: quick


**Status (2026-10-28): ✅ concluída.** `useMenuBanners(item, surface)` lê `item.banners` (nenhuma leitura de `categories.menu_banners`); `MegaMenu` e `MobileMenu` passam o item. `abrePainel = item.hasPanel` para categoria **e** link; o painel só abre para quem tem painel (o `open` da prévia a um item sem painel não desenha painel vazio). Link **externo** com painel ganha os mesmos gatilhos de hover/foco. Prova pelo `Header` REAL com `useMenu`, `useMenuBanners`, `useCategories`, `useStoreSettings` e `useMenuPreview` reais (só o client dublado, registrando tabela/filtros): `widgets/header/ui/__tests__/MenuDocumentoReal.test.tsx` (10 casos, T07–T10). **Testes antigos reescritos só na fixture/dublê, réguas iguais**: `useMenuTargets.test.tsx` (os 7 `useMenuBanners('joias', …)` passaram a `useMenuBanners(painel, …)` com o jsonb no nó; +2 casos: banner de item de link resolve; a coluna da categoria não é lida, com sensor) e `MobileMenu.test.tsx` (o dublê de `useMenuBanners` registra `item.id` em vez do id de categoria). Mutantes reinjetados no arquivo real, todos mortos por asserção: `abrePainel` exigindo categoria (2 casos), `raw` nulo no hook (4), `aberto` exigindo categoria (3).

---

### T09: Link com submenu no celular

**What**: `MobileMenu` abre o acordeão para qualquer `hasPanel` (categoria ou link) e o "Ver tudo" leva ao `href` do item.
**Where**: `apps/store/src/widgets/mobile-menu/ui/MobileMenu.tsx` + teste
**Depends on**: T08
**Requirement**: MNM-27, MNM-28

**Done when**:
- [ ] link com filhos abre; alvo ≥ 44 (`touchTarget.test.ts` verde); gate quick (loja) passa

**Tests**: component · **Gate**: quick


**Status (2026-10-28): ✅ concluída.** `MobileMenuEntry` decide por `hasPanel`, não por `kind`: link com filho ou banner abre o acordeão; "ver tudo em X" leva ao `href` do item (`<a target=_blank>` quando externo). Provado no `MenuDocumentoReal.test.tsx` (link com filhos abre, filho em `/joias/aneis`, "ver tudo" no endereço do link, `min-h-11` por token exato; link só com banner abre e mostra o banner sem "ver tudo"; link sem painel segue link direto). `touchTarget.test.ts` verde. Mutante `if (item.kind === 'link' || !item.hasPanel)` reinjetado: morto (3 casos).

---

### T10: A loja recebe o rascunho novo

**What**: `useMenuPreview` aceita o rascunho `{ categories, document }` e o `open` por id de nó.
**Where**: `apps/store/src/entities/menu/model/useMenuPreview.ts` + teste
**Depends on**: T07
**Requirement**: MNM-13, MNM-32

**Done when**:
- [ ] rascunho novo redesenha o `Header` real sem recarregar; forma antiga é ignorada; `open` abre o painel do nó
- [ ] gate quick (loja) passa; **build** da fase 2 passa

**Tests**: component · **Gate**: build


**Status (2026-10-28): ✅ concluída, sem mudança de código em `useMenuPreview`** — o lote 1 já trocou o contrato em `core/menu/preview.ts`, e o hook só repassa o que `parseMenuPreviewMessage` aceita. Provado pelo `Header` real (`MenuDocumentoReal.test.tsx`, bloco T10): o rascunho `{ categories, document }` troca a barra sem remontar, `open` com o **id do nó** abre o painel (com o banner do nó de link), e a forma antiga `{ categories, links }` é ignorada (a barra segue a do banco).

**Build gate da fase 2 (2026-10-28)**: store **6195/332** (era 6179/331: +16/+1 — `useMenu` +4, `useMenuTargets` +2, `MenuDocumentoReal` +10), exit 0; tipos store 0 · server 0; lint store 2/2; `pnpm build` verde.

---

### T11: Operações do documento (puras)

**What**: `documentOps.ts` — `addRootNode`, `addChildNode`, `moveNode`, `removeNode`, `updateNode`, `toggleSurface`.
**Where**: `apps/backoffice/src/features/store-menu/model/documentOps.ts` + teste
**Depends on**: T05
**Requirement**: MNM-08, MNM-09, MNM-11, MNM-18, MNM-20..23, MNM-28, MNM-29

**Done when**:
- [ ] raiz nova entra no **fim**, sem ícone, nos dois dispositivos; categoria com filhas ativas leva as filhas na ordem da árvore (inativas não)
- [ ] mover nas pontas é no-op; remover raiz leva o submenu; nenhuma op devolve a mesma referência quando muda
- [ ] gate quick (painel) passa

**Tests**: unit · **Gate**: quick


**Status (2026-10-28): ✅ concluída.** `features/store-menu/model/documentOps.ts` + `documentOps.test.ts` (26). API: `addRootNode(doc, { target, label? }, categories, gerarId?)` · `addChildNode(doc, parentId, { target, label? }, gerarId?)` · `moveNode(doc, parentId | null, from, to)` · `removeNode(doc, nodeId)` · `updateNode(doc, nodeId, { label?, target?, icon?, banners? })` (ícone/banners ignorados em filho) · `toggleSurface(doc, nodeId, surface, next)`. **Contrato de identidade**: op que muda devolve documento novo (e só as listas do caminho); op que **não** muda (ponta, nó inexistente, valor igual) devolve o **mesmo** documento — é o que deixa `apply` pular a rede. `gerarId` padrão `crypto.randomUUID`. Rótulo de link é aparado; o teto de 24 filhos não é cortado aqui (é recusa de `menuDocumentRefusal`, antes da rede). Nenhuma op toca categoria.

---

### T12: `useStoreMenu` — ler e gravar com conflito

**What**: o hook do design (leitura das duas fontes, `apply(op)`, `Salvando…/Salvo`, conflito por `updated_at`, rollback).
**Where**: `apps/backoffice/src/features/store-menu/model/useStoreMenu.ts` + teste
**Depends on**: T11
**Reuses**: dublê do client que **registra** filtros (`L-040`, memória "dublê que não enxerga")
**Requirement**: MNM-05, MNM-37, MNM-38, MNM-41

**Done when**:
- [ ] a gravação filtra por `key = 'menu'` **e** `updated_at = visto` (o dublê registra os dois); zero linhas ⇒ conflito e documento local de volta
- [ ] erro ⇒ rollback e nunca `saved`; recusa local ⇒ nenhuma chamada de rede
- [ ] sem v2 ⇒ documento convertido; a 1ª `apply` grava v2 inteiro
- [ ] **nenhuma** chamada a `categories` com escrita (o dublê registra)
- [ ] gate quick (painel) passa

**Tests**: unit · **Gate**: quick


**Status (2026-10-28): ✅ concluída.** `features/store-menu/model/useStoreMenu.ts` + `useStoreMenu.test.ts` (16, dublê que registra tabela/método/argumentos e devolve só as colunas pedidas, com sensor de que ele enxerga escrita em `categories`). Retorno: `{ document, categories, state: 'loading'|'error'|'ready', error, saving: 'idle'|'saving'|'saved', conflict, apply(op), reload() }`; `apply(op: (doc) => MenuDocument)` devolve `null` (gravou ou nada a gravar) ou `{ kind: 'recusa'|'conflito'|'falha', message }`. Lê `store_settings` (`value, updated_at`, `eq('key','menu')`, `maybeSingle`) e as categorias por `useAdminCategories` (só leitura). Grava `update({ value }).eq('key','menu').eq('updated_at', visto).select('updated_at')`; linha ausente ⇒ `insert` (23505 = conflito). Otimista; zero linhas ⇒ conflito, documento volta ao confirmado, `conflict: true`; erro ⇒ rollback, nunca `saved`; resposta sem `updated_at` ⇒ falha. `saved` por `STORE_MENU_SALVO_MS` (2000). As `apply` são **serializadas** numa fila (a segunda grava com o `updated_at` devolvido pela primeira). **Decisão — o que fica no `value`**: as chaves existentes (inclusive os `links` legados) são **preservadas**, `version`/`items` entram por cima; com v2 os `links` ficam inertes (ninguém lê) e servem de rede para reverter à mão. Constantes exportadas: `STORE_MENU_KEY`, `STORE_MENU_SALVO_MS`, `STORE_MENU_CONFLICT_MESSAGE`, `STORE_MENU_SAVE_FAILURE`, `STORE_MENU_LOAD_FAILURE`. Oito mutantes reinjetados no arquivo real (sem o filtro de `updated_at`, zero linhas como sucesso, sem rollback, sem recusa local, sem preservar o `value`, sem fila, sem o curto do no-op, 23505 como falha): todos mortos por asserção.

---

### T13: Probe contra o banco local

**What**: probe HTTP com sessão de admin no Supabase local: grava v2, relê, conflita com `updated_at` velho, confere `categories.sort_order`/`menu_*` byte a byte iguais.
**Where**: `.specs/features/86-menu-montado-pela-dona/probes/01-gravacao.*`
**Depends on**: T12
**Requirement**: MNM-18, MNM-37, MNM-41, Success Criterion 2

**Done when**:
- [ ] probe sai 0 com cada `ok —` impresso; anônimo recusado ao gravar; restaura o `store_settings.menu` original no fim

**Tests**: integration (probe) · **Gate**: probe + build da fase 3


**Status (2026-10-28): ✅ concluída.** `probes/01-gravacao.mjs` (Node 24, importa `core/menu` por caminho `.ts`) + saída em `probes/01-gravacao.saida.txt`: **15 `ok —`, exit 0** contra `127.0.0.1:54441`/`54442` (o script recusa outra URL). Login do admin do seed; PATCH v2 com `key` + `updated_at` visto ⇒ 1 linha e `updated_at` novo do gatilho; releitura idêntica e aceita por `parseMenuDocument`; `links` preservados; `updated_at` velho ⇒ 0 linhas e documento intacto; anon ⇒ 0 linhas (RLS) e menu intacto; retrato md5 de `categories` (`id|sort_order|menu_desktop|menu_mobile|menu_banners|updated_at`, 37 linhas) igual antes e depois, com **sensor** (o retrato muda numa `sort_order` alterada dentro de transação desfeita); `store_settings.menu` restaurado ao valor original no `finally` (o **valor** volta byte a byte; o `updated_at` da linha fica o da restauração — declarado).

**Build gate da fase 3 (2026-10-28)**, um workspace por vez, exit fora de pipe: core **4878/190** (=) · backoffice **4344/242** (era 4302/240: +42/+2 — `documentOps` 26, `useStoreMenu` 16) · store **6195/332** · functions **1230/33** (=, remedido porque `packages/supabase` mudou); tipos store 0 · backoffice 0 · server 0 · mobile-adm 0 · core 11 herdados; lint store 2/2 · backoffice 23/5; `pnpm build` verde. Nenhuma queda.

---

### T14: `MenuTargetPicker`

**What**: o seletor com abas Categoria (busca por `dobrarTexto`, caminho, "Inativa", "Já está…") e Página da loja (lista + outro endereço).
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuTargetPicker.tsx` + teste
**Depends on**: T05
**Requirement**: MNM-07, MNM-10, MNM-11, MNM-12, MNM-22, MNM-25

**Done when**:
- [ ] "anel" acha "Anéis"; usada aparece desabilitada com o motivo certo para raiz × submenu
- [ ] endereço recusado mostra o motivo da recusa de `core` e não chama `onPick`
- [ ] em 390 vira folha de baixo; alvos ≥ 44 (token exato); gate quick (painel) passa

**Tests**: component · **Gate**: quick


**Status (2026-10-28): ✅ concluída.** `ui/MenuTargetPicker.tsx` + `MenuTargetPicker.test.tsx` (28). Abas Categoria (busca por `dobrarTexto` no nome **e** no caminho; "Inativa"; "N subcategorias entram no submenu" só no modo raiz, contando as ativas; usada desabilitada com o motivo de `MOTIVO_USADA` — "Já está no menu" × "Já está neste submenu") e Página da loja (lista `PAGINAS_DA_LOJA` + "Outro endereço da loja" validado por `internalMenuHrefRefusal`, nome com `CharCounter` 40 e `menuNodeLabelRefusal`). Folha de baixo abaixo de `sm` (`max-sm:bottom-0 …`). Alvos `min-h-11` por token exato, com sensor. **Arquivos novos de apoio**: `model/paginasDaLoja.ts` (caminhos de `SITEMAP_STATIC_PATHS` sem a Home, título de `staticPageMeta` sem a marca, e um **nome curto de menu** por rota conhecida — **SPEC_DEVIATION**: o título de SEO da política de trocas tem 47 caracteres e não cabe no teto de 40; o nome curto é vocabulário de menu, com queda para o título) e `model/textosDoMenu.ts` (`MOTIVO_USADA`, `fraseDoSubmenu`, fora do `.tsx` por Fast Refresh). **A Home (`/`) não é oferecida** na lista (é a marca); digitável em "Outro endereço".

---

### T15: `MenuItemEditor`

**What**: nome padrão × próprio (contador `CharCounter`), ícone (`MenuIconPicker`, só raiz), atalho para banners, "Remover do menu".
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuItemEditor.tsx` + teste
**Depends on**: T05
**Requirement**: MNM-14, MNM-16, MNM-17, MNM-26

**Done when**:
- [ ] ligar "Usar o nome da categoria" grava `label: null`; vazio é recusado com motivo; item de submenu sem ícone; link sem o interruptor
- [ ] gate quick (painel) passa

**Tests**: component · **Gate**: quick


**Status (2026-10-28): ✅ concluída.** `ui/MenuItemEditor.tsx` + `MenuItemEditor.test.tsx` (21). Diálogo (folha de baixo em 390): "Usar o nome da categoria" (`Switch` com `SWITCH_TAP_44`, mostra o nome atual; ligado ⇒ `label: null`), "Nome no menu" com `CharCounter` 40 (aparado; vazio/espaços/41 recusados com motivo, sem chamar `onSave`), `MenuIconPicker` só no item principal, caixa "Banners do painel" (contagem `N no computador · M no celular` pela mesma `bannersGravados`) com "Editar banners" que troca a vista do diálogo para o `MenuBannerEditor` com alternador de dispositivo próprio. Rodapé Remover do menu | Cancelar | Salvar. Falha devolvida por `onSave` aparece no editor, que continua aberto.

---

### T16: `MenuBannerEditor` no nó

**What**: o editor da `39` lê e grava `node.banners` (via op) em vez de `categories.menu_banners`.
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuBannerEditor.tsx` + teste
**Depends on**: T11
**Requirement**: MNM-33

**Done when**:
- [ ] nenhuma chamada a `updateCategory`; banner de item de link editável; gate quick (painel) passa

**Tests**: component · **Gate**: quick


**Status (2026-10-28): ✅ concluída.** `MenuBannerEditor` trocou a prop `host: AdminCategory` por `item: MenuBannerHost` (`{ id, name, banners }`) e `categories: readonly MenuCategory[]`; o jsonb vem do nó e sai por `onSave` (a página grava com `updateNode(doc, id, { banners })`). **Testes reescritos só na fixture**: `MenuBannerEditor.test.tsx` passa `item={{ id, name, banners }}` com o mesmo jsonb (27 casos intactos); o dublê do client passou a registrar tabela/método, e +3 casos (banner de item de LINK editável; salvar entrega o jsonb e nenhuma escrita vai à rede nem toca `categories`; sensor do dublê). `MenuEntryEditor.tsx` (a apagar em T20) só ajustado para compilar (`item={{ id: host.id, name: host.name, banners: host.menu_banners }}`).

---

### T17: `MenuTree`

**What**: a lista principal + submenu: alça de arrasto, "Mover para cima/baixo", chaves PC/Celular, selos (inativa, apagada, fora do menu), contagem 0/24, vazio.
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuTree.tsx` + teste
**Depends on**: T11
**Requirement**: MNM-01..04, MNM-06, MNM-18, MNM-19, MNM-23, MNM-24, MNM-28..30, MNM-35, MNM-36

**Done when**:
- [ ] categoria fora do menu **não** é desenhada (fixture com 37 categorias e 3 itens ⇒ 3 linhas)
- [ ] "Mover…" desabilitado nas pontas; item apagado só oferece "Remover do menu"
- [ ] movimento com par `motion-reduce:`; alvos ≥ 44; gate quick (painel) passa

**Tests**: component · **Gate**: quick


**Status (2026-10-28): ✅ concluída.** `ui/MenuTree.tsx` + `MenuTree.test.tsx` (27). Só os nós do documento (37 categorias, 3 itens ⇒ 3 linhas); por item: alça (arraste `draggable` no `<li>`, dado `lista|índice`, arraste entre listas é ignorado), ícone ou "sem", nome, selo (inativa · apagada · "Fora do menu", esmaecido), meta (`Categoria · Joias › Anéis · N no submenu · nome próprio` / `Link · /sobre · sem submenu`), chaves PC | Celular (`aria-pressed`), abrir submenu (`aria-expanded`), menu ⋯ (Editar · Mover para cima/baixo, desabilitados nas pontas · Remover). Item apagado: sem chaves nem submenu, ⋯ só com "Remover do menu". Submenu: cabeçalho, contador `N/24`, filhos com alça, chaves, ↑ ↓ (desabilitados nas pontas), editar, tirar; vazio "Sem submenu: na loja, “Nome” é um link direto."; "+ Adicionar ao submenu" desabilitado a 24 com o motivo. Transições com par `motion-reduce:`; alvos ≥ 44 por token exato. A contagem do cabeçalho do card vem por prop (a página a calcula com `menuItems`).

---

### T18: `MenuRemoveConfirm`

**What**: confirmação que nomeia o item e quantos filhos saem junto.
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuRemoveConfirm.tsx` + teste
**Depends on**: T17
**Requirement**: MNM-20, MNM-21

**Done when**:
- [ ] foco inicial em "Cancelar"; texto diferente para categoria e link; gate quick (painel) passa

**Tests**: component · **Gate**: quick


**Status (2026-10-28): ✅ concluída.** `ui/MenuRemoveConfirm.tsx` + `MenuRemoveConfirm.test.tsx` (7). `AlertDialog`: "Remover “Nome” do menu?", "Os N itens do submenu saem junto." (singular e ausência com 0), "A categoria/página continua existindo na loja, só deixa de aparecer no menu."; foco inicial em Cancelar (`onOpenAutoFocus`), provado por `document.activeElement`.

---

### T19: `AdminMenuPage` reescrita

**What**: a página compõe `useStoreMenu` + `MenuTree` + seletor + editor + confirmação + prévia; alternador só da prévia; vista Itens/Prévia no celular; ponte com o rascunho novo.
**Where**: `apps/backoffice/src/pages/admin/AdminMenuPage.tsx`, `features/store-menu/model/useMenuPreviewBridge.ts`, `AdminMenuPage.test.tsx`
**Depends on**: T12, T14..T18, T10
**Requirement**: MNM-01..41 (fiação), `previaUnica`

**Done when**:
- [ ] **pela página real**: adicionar categoria com filhas, editar nome, trocar ícone, reordenar, remover com confirmação, desligar Celular, conflito e falha — cada um com a prévia recebendo o rascunho
- [ ] a página não chama `updateCategory`/`updateSortOrders` (dublê registra)
- [ ] `previaUnica.test.ts` verde sem tocar nele; gate full + build da fase 4

**Tests**: component (página real) · **Gate**: build


**Status (2026-10-28): ✅ concluída.** `AdminMenuPage.tsx` reescrita sobre `useStoreMenu` + `MenuTree` + `MenuTargetPicker` + `MenuItemEditor` + `MenuRemoveConfirm` + `MenuLivePreview`. Cabeçalho com o subtítulo do protótipo, selo `Salvando…`/`Salvo` (do `saving` do hook) e "Ver na loja"; faixa de erro de leitura com "Tentar de novo" (nunca o vazio), faixa de conflito com "Recarregar", toasts de recusa/conflito/falha; toast ao adicionar raiz ("“Joias” entrou no fim do menu com 3 itens no submenu."); alternador Computador/Celular **na coluna da prévia**, trocando só a prévia (`MNM-32`); abas "Itens do menu" | "Prévia" abaixo de `lg`; molde de altura/largura de `/admin/home` mantido. O id do item novo é gerado antes da gravação (para a prévia abri-lo). Contagem do card por `menuItems` (a porta da loja). `MenuLivePreview` passou a receber `document` e o id do nó direto (sem `legacyMenuDocument`, sem traduzir `cat:`/`link:`; id fora do documento ⇒ `open: null`); `useMenuPreviewBridge` sem mudança. Barril de `store-menu` exporta os componentes novos, `documentOps` e `useStoreMenu` (e ainda os antigos, até T20 — `previaUnica` exige `MenuSlotList` no barril).

**Testes reescritos (declarado caso a caso):**
- `AdminMenuPage.test.tsx` — **reescrito inteiro** pela página REAL (só o client dublado, registrando tabela/método/args e devolvendo só o que o `select` pede; `useAdminCategories`, `useStoreMenu`, árvore, diálogos e palco reais) — 75 `it(` → 45. Um `afterEach` exige **zero escrita em `categories`** em todo caso (com sensor). Saíram, por medirem comportamento que a spec 86 remove: `NAV-40/06` (lista da árvore e filha no painel) → `MNM-01..03` (só o documento, 37 categorias × 3 linhas); `NAV-05` (contador "5 itens") → contagem por dispositivo via `menuItems`; `NAV-03` (21ª categoria entra) → `MenuTree` sem teto + `structureMenuItems` (20 itens); `NAV-01/02/37` (chave grava `menu_desktop`, aviso cruzado, alternador troca a lista) → `MNM-28` (chave grava `mobile` do nó) + `MNM-32` (alternador troca só a prévia, lista e contagem iguais); `NAV-07` (inativa marcada) → `MenuTree` `MNM-35`; `NAV-38/39` (arraste grava `sort_order`, recusa entre ramos) → reordenar por ⋯, por arraste e no submenu gravando só `store_settings`; arraste entre listas ignorado em `MenuTree`; `NAV-41` (duas faixas por fonte) → uma faixa de leitura com "Tentar de novo" que relê (`MNM-05`) — a falha de `categories` também cai nela (`state: 'error'` do hook); `NAV-42` (toast de `updateCategory`) → conflito e falha de rede (`MNM-37/38`); bloco "item de link" (`upsert` de `links`, `MenuLinkDialog`) → seletor Página da loja e editor de link; bloco `FOCO-28/29/31` e `48` (`MenuEntryEditor` em abas dentro da linha) → `MenuItemEditor` em diálogo (T15) e fluxos de editar nome/ícone/banners pela página; `max-w-full` da linha → `MenuTree` (`truncate` com `max-w-full`/`min-w-0`, a medir no navegador em T23). **Mantidos com régua igual**: `FOCO-13` (altura e largura lidas do disco, **verbatim**, 9 casos), `FOCO-35..37` (vista do celular, rótulos agora "Itens do menu" | "Prévia", pílula × barra com sensor), `VIV-03` (mesmo nó `<iframe>` depois de gravar e de reordenar), `VIV-04` (`Salvando…` → `Salvo` com par `motion-reduce:`), o iframe da loja em `?preview=1`. Novos: adicionar categoria com filhas ativas no fim + toast + rascunho e `open` na prévia, filtros `key` + `updated_at`, "Já está no menu", página com nome sugerido, externo recusado sem rede, nome próprio, ícone, banners no nó, nome vazio recusado, remover com confirmação/cancelar/volta a ser escolhível, filho sai sem confirmação, submenu com "Já está neste submenu", conflito e falha com rollback e sem `Salvo`. Sensor de mutação (4 mutantes reinjetados na página, SHA-256 conferido na restauração): chave sem op (4 falhas), sem selecionar o novo (1), remover raiz sem confirmação (3), `openId` nulo (1) — todos mortos por asserção.
- `MenuLivePreview.test.tsx` — fixture: `links={LINKS}` → `document={DOC}` (`DOC = legacyMenuDocument(CATEGORIAS, LINKS)`, os mesmos ids), `openId` passa o id do nó (`cat:joias`, `link:sobre`); o rascunho agora é o documento **por referência** (`toBe(DOC)`, régua mais apertada que o `toEqual` da conversão). 28 casos, mesmas réguas.
- `animacaoRespeitaMovimento.test.ts` — escopo literal +2 (`MenuTree.tsx`, `MenuTargetPicker.tsx`), âncoras 48/23 → **54/26**, medidas pela própria régua.

**Ficaram sem uso (para T20 apagar)**: `ui/MenuSlotList.tsx`, `ui/MenuPanelEditor.tsx` (+test), `ui/MenuEntryEditor.tsx` (+test), `ui/MenuLinkDialog.tsx` (+test), `model/useMenuLinks.ts` (+test), e as exportações deles no barril. `previaUnica.test.ts` exige `MenuSlotList` no barril e `menuSemTeto.test.ts` nomeia `MenuSlotList.tsx` como superfície — os dois mudam de alvo em T20/T21. `reorderWithinParent` (`features/category-list`) deixou de ser importado pela tela do menu.

**Build gate da fase 4 (2026-10-28)**, um workspace por vez, exit fora de pipe: backoffice **4404/246** (era 4344/242: +60/+4 — `MenuTargetPicker` 28, `MenuItemEditor` 21, `MenuTree` 27, `MenuRemoveConfirm` 7, `MenuBannerEditor` +3, `AdminMenuPage` reescrita 75 `it(` → 45), exit 0 · store **6195/332** (=), exit 0 · core **4878/190** (=), exit 0; tipos store 0 · backoffice 0 · core 11 herdados; lint backoffice 23/5 · store 2/2; `pnpm build` verde. `previaUnica`, `folgaDoPalco`, `texto`, `touchTarget`, `menuSemTeto`, `menuSemItemFixo` verdes sem serem tocados.

---

### T20: Remover a tela antiga

**What**: apagar `MenuSlotList`, `MenuPanelEditor`, `MenuEntryEditor`, `MenuLinkDialog`, `useMenuLinks` e os testes deles; tirar as escritas de menu de `useAdminCategories`.
**Where**: `apps/backoffice/src/features/store-menu/**`, `apps/backoffice/src/entities/category/api/useAdminCategories.ts`
**Depends on**: T19
**Requirement**: AD-068

**Done when**:
- [ ] queda de testes **declarada** no `tasks.md` com onde cada caso reaparece (regra da baseline)
- [ ] tipos 0; gate full passa

**Tests**: — (remoção; os substitutos já existem) · **Gate**: full


**Status (2026-10-28): ✅ concluída.** Apagados `ui/MenuSlotList.tsx`, `ui/MenuPanelEditor.tsx` (+test),
`ui/MenuEntryEditor.tsx` (+test), `ui/MenuLinkDialog.tsx` (+test), `model/useMenuLinks.ts` (+test) e as
exportações deles no barril de `store-menu`. `reorderWithinParent` (`features/category-list`)
**fica**: `AdminCategoriesPage` ainda o usa. `useAdminCategories` não tinha escrita específica de menu
(o `updateCategory` é genérico); a escrita das três colunas passou a ser recusada **pelo tipo**:
`CategoryUpdate = Partial<Omit<DbCategory, 'menu_desktop' | 'menu_mobile' | 'menu_banners'>>` em
`updateCategory`/`updateCategoriesBatch`. As colunas seguem no `CATEGORY_SELECT` (leitura, para
`legacyMenuDocument`). `useAdminCategories.test.ts`: os três payloads de exemplo `{ menu_desktop }`
viraram `{ active }` (o caso mede releitura, não o campo; nenhuma asserção tocada).
`bannersGravados.ts` só no comentário.

**Queda declarada: backoffice −66/−4** (medida rodando os 4 arquivos antes de apagar), **+2** portados:

| Arquivo apagado | Casos | Onde reaparecem |
| --- | --- | --- |
| `MenuPanelEditor.test.tsx` | 16 | o painel de filhas por superfície e a contagem "N de M" deixaram de existir (o submenu é lista explícita): `MenuTree.test.tsx` (submenu na ordem gravada, contador N/24, vazio "link direto", filho inativo/apagado com selo, chaves por filho); o corte em uma coluna do mega menu → `menuPanelColumns` (core, intacto) |
| `MenuEntryEditor.test.tsx` | 14 | o card de abas virou o diálogo `MenuItemEditor` (`MenuItemEditor.test.tsx`: nome, ícone, banners por dispositivo, "Editar banners" com dispositivo escolhível); **FOCO-32** (a contagem é EXATAMENTE `bannersGravados`, e não existe contagem paralela no arquivo) **portado** — +2 casos em `MenuItemEditor.test.tsx`; "o arquivo não se chama …Preview" → `previaUnica.test.ts` (pasta inteira) |
| `MenuLinkDialog.test.tsx` | 13 | o cadastro de link virou a aba "Página da loja" do `MenuTargetPicker` (`MenuTargetPicker.test.tsx`: lista, outro endereço recusado com o motivo de `core`, nome com contador) e o editor de link (`MenuItemEditor`); remover → `MenuRemoveConfirm.test.tsx` e a página; ícone → `MenuItemEditor` |
| `useMenuLinks.test.ts` | 23 | leitura tolerante do jsonb → `parseMenuDocument` (`structure.test.ts`, core); a recusa do destino → `internalMenuHrefRefusal`/`menuTargetRefusal` (`refusals.test.ts`, core); gravação, falha, linha ausente e "ligar numa superfície não toca a outra" → `useStoreMenu.test.ts` e `documentOps.test.ts` (`toggleSurface`); `proximaPosicao` deixou de existir (a ordem é a do documento) |

**Guardas que mudaram de ALVO, sem perder régua**: `previaUnica.test.ts` (âncora `MenuSlotList`/
`MenuPanelEditor`/`useMenuLinks` → `MenuTree`/`MenuTargetPicker`/`useStoreMenu`; o barril deve exportar
`MenuTree` por regex; sensor: o barril com o export renomeado reprova, SHA-256 conferido na
restauração) e `menuSemTeto.test.ts` (superfície `MenuSlotList.tsx` → `MenuTree.tsx`, ainda cinco;
sensor: `MenuTree.tsx` fora do disco reprova a âncora). `menuSemItemFixo` e `menuSurfaceSingleOwner`
sem mudança (a página ainda chama `menuItems`; o `CATEGORY_SELECT` ainda lê as colunas por dispositivo).

---

### T21: Guardas

**What**: `menuDocumentoComDonoUnico.test.ts` (nenhum arquivo de `apps/**` escreve `menu_desktop`/`menu_mobile`/`menu_banners`; o documento só é lido por `parseMenuDocument`; a tela do menu não chama escrita em `categories`) + revisão de `menuSurfaceSingleOwner`, `menuSemTeto`, `menuSemItemFixo`.
**Where**: `apps/store/src/shared/lib/__tests__/`
**Depends on**: T20
**Requirement**: MNM-18, AD-068

**Done when**:
- [ ] âncora dupla + sensor por régua (CRLF, LF, glob de dois asteriscos) + inverso; reinjetar uma escrita em `categories` na página reprova
- [ ] nenhum guarda afrouxado; gate full passa

**Tests**: unit (guarda) · **Gate**: full


**Status (2026-10-28): ✅ concluída.** `apps/store/src/shared/lib/__tests__/menuDocumentoComDonoUnico.test.ts`
(18 casos), quatro réguas escritas como predicado: (1) as três colunas como **chave de objeto** em
produção de `apps/**` + `supabase/functions`, com exceção de UM (o mapeador de leitura da loja,
`useCategories.ts`, e a metade positiva: ele chama `.select(` e não tem escrita); (2) chamada de escrita
(`.update(`/`.insert(`/`.upsert(` e as portas `updateCategory`/`updateCategoriesBatch`/`createCategory`/
`moveCategories`) cujo argumento (parênteses balanceados) nomeie uma das três — **zero exceção**, também
em `packages/*/src`; (3) os arquivos que tocam a linha crua do menu (`settings.menu`, `STORE_MENU_KEY`,
`eq('key','menu')`) são **exatamente** `useMenu.ts` (loja) e `useStoreMenu.ts` (painel), e os dois
chamam `parseMenuDocument(`; nenhum `version` comparado em `apps/**`; (4) a tela do menu
(`AdminMenuPage.tsx` + `features/store-menu/**`) só nomeia `.from('store_settings')` (tabela não literal
é acusada) e nenhuma porta de escrita de categoria. Âncoras: varredura > 400 arquivos nos dois apps + a
function do feed + `core/menu/structure.ts`; régua 1 acha ≥ 6 chaves no mapeador; régua 2 acha
`{ value }` e `{ key: STORE_MENU_KEY, value }` na porta e > 50 escritas no escopo; régua 4 acha a tela
(> 10 arquivos) e `store_settings`. Sensores: CRLF e LF, o glob de dois asteriscos num comentário de
linha, as três grafias da chave, escrita quebrada em linhas, os inversos (leitura `row.menu_desktop`,
o `select`, o `Omit`, `update({ active })`, `useAdminCategories()` só lendo) e a fronteira (fora da
tela, `AdminCategoriesPage` **é** acusada pela régua 4 — o escopo não é vazio).

**Reinjeção nos arquivos reais** (restauração por cópia, SHA-256 conferido): uma escrita em
`categories` no fim de `AdminMenuPage.tsx` (`.from('categories').update({ sort_order })`) → régua 4
reprova; `h.updateCategory('x', { active: true })` na página → régua 4 reprova; `.update({\n menu_mobile:
false,\n})` em `MenuTree.tsx` → réguas 1 e 2 reprovam; `parseMenuDocument(raw)` trocado por `(raw as any)`
em `useMenu.ts` → régua 3 (metade positiva) reprova. Os quatro mortos por asserção.

---

### T22: Documentação

**What**: `apps/backoffice/CLAUDE.md` (a tela do menu), `apps/store/CLAUDE.md` (o header lê o documento), `packages/core/CLAUDE.md` (`core/menu`), `CLAUDE.md` (tabela de guardas, baseline, `BL` do legado), `BACKLOG.md` (o `BL` novo: apagar `legacyMenuDocument` e as colunas depois de v2 em produção).
**Where**: os arquivos citados
**Depends on**: T21

**Done when**:
- [ ] nenhum texto descreve a forma proibida por extenso fora de `.specs/`; suíte da loja verde (os guardas leem prosa)

**Tests**: none · **Gate**: quick (loja)


**Status (2026-10-28): ✅ concluída.** `apps/backoffice/CLAUDE.md`: a seção `/admin/menu` reescrita
para a `86` (documento, peças, legado convertido, conflito por `updated_at`, lista só do documento,
seletor, alternador só da prévia, banners do nó, guardas), mantendo os itens da `39`/`47` que valem.
`apps/store/CLAUDE.md`: "Menu (consumo)" abre com o header lendo o documento (legado até a 1ª
gravação, `hasPanel` de link, banners do nó, settings carregando ⇒ vazio, prévia `{ categories,
document }`). `packages/core/CLAUDE.md`: a linha de `./menu` e a subseção `structure.ts`/`refusals.ts`.
`CLAUDE.md` raiz: a `86` na numeração ("IMPLEMENTADA, sem commit"), a linha da `86` na tabela do
"defeito 01", `menuDocumentoComDonoUnico` na tabela de guardas (com os retargets) e as baselines do
fecho. `.specs/BACKLOG.md`: **`BL-060`** (apagar `legacyMenuDocument`/`legacyMenuItems`, as colunas
`menu_desktop`/`menu_mobile`/`menu_banners`/`show_in_menu` e os `links` legados depois de v2 em
produção). A suíte da loja correu **depois** das edições: verde.

---

### T23: Prova em navegador e gate final

**What**: painel e loja de dev contra o banco local: 390×844 e 1440×900, montar um menu do zero, conferir a loja.
**Where**: `.specs/features/86-menu-montado-pela-dona/prova-navegador.md`
**Depends on**: T22

**Done when**:
- [ ] sem rolagem horizontal; alvos ≥ 44; prévia nos dois dispositivos; a loja (header e folha) igual à prévia
- [ ] antes de gravar: a loja mostra o menu de hoje (legado), igual ao `HEAD` anterior
- [ ] gate build completo, comparado com `baseline.md`

**Tests**: e2e manual medido · **Gate**: build


**Status (2026-10-28): ✅ concluída.** `prova-navegador.md`. Antes de gravar, a loja e o painel mostram
o legado, **igual** ao `menuItems` do `HEAD` anterior (`diff` vazio nas duas superfícies); o header não
tem `layout-shift` próprio. O menu foi montado em 1440 (categoria com filhas, página, nome próprio +
ícone, arraste real, "Mover…", Celular desligado, filho tirado, remoção com confirmação) com a prévia
acompanhando, e a loja em 8082 ficou igual à prévia nos dois dispositivos. `categories` intacta (`cmp`)
e `store_settings.menu` restaurado (`diff` vazio). **Três defeitos achados e consertados, cada um com
teste que reprovou antes**: (1) o nome do item espremido a 29 px (raiz) e 11 px (submenu) em 390 →
`MenuTree.tsx` (`flex-wrap`, `basis-40`/`basis-28`, controles `ml-auto`), +2 casos em
`MenuTree.test.tsx`; (2) "Ver na loja" era `href="/"` (abria o painel) → `storeOrigin()`, +1 caso em
`AdminMenuPage.test.tsx` — **o mesmo defeito segue em `AdminHomePage.tsx:254`, fora do escopo**;
(3) a prévia do celular não abria a folha (o latch da `38` não montava o `MobileMenu`, anterior à `86`)
→ `StoreLayout.tsx` abre/fecha a folha pelo quadro na prévia, +3 casos em `StoreLayoutOverlays.test.tsx`,
dois mutantes mortos.

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T01 ──→ T02 ──→ T03 ──→ T04 ──→ T05 ──→ T06
Phase 2:  T07 ──→ T08 ──→ T09 ──→ T10
Phase 3:  T11 ──→ T12 ──→ T13
Phase 4:  T14 ──→ T15 ──→ T16 ──→ T17 ──→ T18 ──→ T19
Phase 5:  T20 ──→ T21 ──→ T22 ──→ T23
```

23 tasks ⇒ ~3 lotes de sub-agente (Fase 1 · Fases 2+3 · Fases 4+5, cortes em fronteira de fase). A
oferta de sub-agentes é feita no início do Execute.

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T01 | medição | ✅ |
| T02 | 1 arquivo (forma + leitura) | ✅ |
| T03 | 1 função | ✅ |
| T04 | 1 função + 2 consumidores que deixariam de compilar | ⚠️ coeso (merge-forward: sem os widgets o `tsc` quebra) |
| T05 | 1 arquivo de recusas | ✅ |
| T06 | 1 arquivo | ✅ |
| T07..T10 | 1 hook/widget cada | ✅ |
| T11 | 1 arquivo de ops | ✅ |
| T12 | 1 hook | ✅ |
| T13 | 1 probe | ✅ |
| T14..T18 | 1 componente cada | ✅ |
| T19 | 1 página (+ a ponte que só ela usa) | ⚠️ coeso |
| T20 | remoção | ✅ |
| T21 | 1 guarda + revisão | ✅ |
| T22 | documentação | ✅ |
| T23 | prova | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T01 | — | início | ✅ |
| T02 | T01 | T01→T02 | ✅ |
| T03 | T02 | T02→T03 | ✅ |
| T04 | T03 | T03→T04 | ✅ |
| T05 | T02 | fase 1, após T04 (ordem sequencial; dependência real só de T02) | ✅ |
| T06 | T02 | fase 1, após T05 | ✅ |
| T07 | T04, T06 | fase 1 → T07 | ✅ |
| T08 | T07 | T07→T08 | ✅ |
| T09 | T08 | T08→T09 | ✅ |
| T10 | T07 | fase 2, após T09 | ✅ |
| T11 | T05 | fase 1 → fase 3 | ✅ |
| T12 | T11 | T11→T12 | ✅ |
| T13 | T12 | T12→T13 | ✅ |
| T14 | T05 | fase 1 → fase 4 | ✅ |
| T15 | T05 | fase 4, após T14 | ✅ |
| T16 | T11 | fase 3 → fase 4 | ✅ |
| T17 | T11 | fase 3 → fase 4 | ✅ |
| T18 | T17 | T17→T18 | ✅ |
| T19 | T10, T12, T14..T18 | fases 2–4 → T19 | ✅ |
| T20 | T19 | T19→T20 | ✅ |
| T21 | T20 | T20→T21 | ✅ |
| T22 | T21 | T21→T22 | ✅ |
| T23 | T22 | T22→T23 | ✅ |

Nenhuma dependência aponta para fase posterior.

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T01 | — | none | none | ✅ |
| T02, T03, T05, T06 | core | unit | unit | ✅ |
| T04 | core + widgets da loja | unit + component | unit + component | ✅ |
| T07..T10 | loja | component | component | ✅ |
| T11, T12 | painel model | unit | unit | ✅ |
| T13 | gravação real | probe | probe | ✅ |
| T14..T18 | painel UI | component | component | ✅ |
| T19 | página | component (página real) | component (página real) | ✅ |
| T20 | remoção | — | substitutos em T14..T19 | ✅ (remover não cria código) |
| T21 | guarda | unit | unit | ✅ |
| T22 | docs | none | none | ✅ |
| T23 | layout | prova em navegador | prova em navegador | ✅ |

---

## Gate final (Build, fecho da Fase 5 — 2026-10-28)

Um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`, depois de todas as edições
(código e documentação):

| Medida | Entrada (`baseline.md`) | Fecho | Exit |
| --- | --- | --- | --- |
| core | 4767 / 186 | **4878 / 190** (+111/+4) | 0 |
| backoffice | 4301 / 240 | **4343 / 242** (+42/+2; inclui a queda declarada de −66/−4 da T20 e +2 portados) | 0 |
| store | 6176 / 330 | **6216 / 333** (+40/+3) | 0 |
| functions | 1230 / 33 (fase 3) | **1230 / 33** (=) | 0 |
| tipos | store 0 · backoffice 0 · core 11 | store 0 · backoffice 0 · server 0 · mobile-adm 0 · core 11 herdados | — |
| lint | store 2/2 · backoffice 23/5 | store 2/2 · backoffice 23/5 | — |
| `pnpm build` | — | verde | 0 |

Fase 5 sozinha (contra o fecho da fase 4: backoffice 4404/246 · store 6195/332): backoffice −61/−4
(−66 apagados, +2 portados de FOCO-32, +3 da prova: 2 em `MenuTree`, 1 em `AdminMenuPage`), store
+21/+1 (`menuDocumentoComDonoUnico` 18, `StoreLayoutOverlays` +3). Core e functions idênticos.

---

## Fechamento (pedido do usuário em 2026-10-28) — orquestrado por agentes

1. **Verifier independente** (autor ≠ verificador): checagem ancorada na spec, sensor de mutação, `validation.md`. FAIL ⇒ tarefas de correção ⇒ nova rodada (máx. 3).
2. **QA**: `qa-report` (planejar personas, jornadas e registro de bugs em `docs/qa/`) → `qa-execution` (sessão de usuário real em navegador, 390 e 1440, contra o ambiente local).
3. **Correção**: cada bug vira tarefa `F<NN>` com teste que reprova antes; reteste de QA; repetir até nenhum bug aberto.
4. **Gate final** (Build, um workspace por vez) → **commit único** na `master` → conferir que não sobe migration (`git diff --name-only origin/master..HEAD -- supabase/migrations`, esperado vazio) → **push** → acompanhar o CI (`ci.yml`, `supabase-deploy.yml`) e o deploy da Vercel → conferir loja e painel publicados.

---

## Correções da verificação r1 (2026-10-28)

O Verifier r1 (`validation.md`) reprovou por cobertura: M34 (MNM-37) e M36 (MNM-30) sobreviveram, mais
gaps de precisão em MNM-09 × MNM-24, MNM-34 no painel e MNM-31 pela tela. Cada correção começou por um
teste que reprova (ou pelo mutante do Verifier reinjetado, quando o produto já estava certo e faltava a
régua); os mutantes foram reinjetados nos arquivos reais, um por vez, e restaurados com SHA-256 conferido
(`sha_ok` em todos). Nenhum teste foi afrouxado.

| Fix | AC | O quê | Onde | Mutantes reinjetados | Status |
| --- | --- | --- | --- | --- | --- |
| F01 | MNM-37 | sair do conflito: "Recarregar" na faixa limpa a faixa e a próxima ação grava com o `updated_at` relido; par no hook com `conflict` voltando a `false` | `AdminMenuPage.test.tsx` (+1), `useStoreMenu.test.ts` (+1) | **M34** (`setConflict(false)` fora de `reload()`): morto por asserção nos 2 casos novos | ✅ |
| F02 | MNM-30 | o esmaecido por token exato (`opacity-60`) no contêiner da linha, marcado por `data-testid="linha-<id>"` (sem subir o DOM a partir do texto), com o inverso nos itens ligados; o mesmo no filho (`filho-<id>`) | `MenuTree.tsx` (só o `data-testid`), `MenuTree.test.tsx` (+1, e o caso do nome reescrito para cobrar o que ele afirma) | **M36** (sem `opacity-60` na raiz): morto; sem `opacity-60` no filho: morto; inverso (`opacity-60` sempre): morto | ✅ (vermelho antes: o `data-testid` não existia) |
| F03 | MNM-09 / MNM-24 (revistos) | `addRootNode` leva as **24 primeiras** filhas ativas da árvore; a página avisa "As outras N subcategorias não entraram: o submenu tem o máximo de 24 itens."; o seletor diz "24 das N subcategorias entram no submenu"; o teto só recusa a op que **aumenta** um submenu acima de 24 | `core/menu/refusals.ts`, `documentOps.ts`, `useStoreMenu.ts`, `textosDoMenu.ts`, `MenuTargetPicker.tsx`, `AdminMenuPage.tsx`; testes em `refusals.test.ts` (+8), `documentOps.test.ts` (+2), `useStoreMenu.test.ts` (+1), `AdminMenuPage.test.tsx` (+2) | sem o `.slice` (2 mortos), `menuDocumentRefusal(proximo)` sem o anterior no hook (2), "só cresce" apagado (core 3, painel 1), `>` → `>=` (core 3), M14 sem teto (core 5), a frase do seletor (1), o aviso de fora apagado (1), `Math.min` apagado (1) | ✅ (vermelho antes: 4 em core, 1 em documentOps, 1 no hook, 1 na página) |
| F04 | MNM-34 | a 1ª `apply` sem v2 grava `items[n].banners` igual à coluna `menu_banners` legada | `useStoreMenu.test.ts` (+1) | **M21** (legado sem banners): agora morre também na suíte do painel | ✅ |
| F05 | MNM-31 | pela página real, com um externo legado (`https://instagram.com/…`) no documento: editar o nome grava com o endereço intacto, reordenar grava, e o seletor não cria externo ("Outro endereço" recusa `https://`, sem rede; a lista de páginas só tem caminhos) | `AdminMenuPage.test.tsx` (+3) | M13 (aceita `https://`): morto no caso novo; **equivalente declarado**: apagar `if (menuHrefIsExternal(…)) return null` de `enderecoDoNo` passa, porque `menuTargetRefusal` já aceita `https://` — só um legado `http://` distinguiria, e a 39 nunca deixou gravar `http://` | ✅ |
| F06 | — | lição `L-083` à mão ("teste cujo nome afirma uma propriedade precisa asserir essa propriedade", citando a 86/M36) | `.specs/LESSONS.md` | — | ✅ |

### Decisão de desenho (F03)

- **`menuDocumentRefusal(doc, anterior = null)`** (em `core`, aditivo): o teto do submenu compara com o
  documento de antes da operação, **pelo id do item principal**. Acima de 24 recusa só se o submenu
  **cresceu**; item que o anterior não tem conta como vindo de zero; **sem `anterior`**, a régua é a
  estrita (acima de 24 recusa) — é o que vale para quem não sabe de onde o documento veio. As outras
  recusas (rótulo, endereço, repetida, banners) seguem valendo igual num submenu acima do teto.
- **`useStoreMenu` passa `base`** (o documento local ou o confirmado sobre o qual a op rodou): com 30
  filhos convertidos do legado, tirar, mover, renomear e desligar gravam; adicionar o 31º recusa antes
  da rede.
- **O corte mora em `addRootNode`** (`.slice(0, MENU_SUBMENU_LIMIT)` depois do `bySortOrder`), então o
  documento que sai dele nunca é recusado pelo teto. **O aviso é da página**, que já contava as filhas
  ativas: `frasesDoNovo` diz `min(filhas, 24)` itens e acrescenta `fraseDasSubcategoriasDeFora` (em
  `textosDoMenu.ts`). O seletor ganhou `fraseDasFilhasQueEntram` para não anunciar "30 subcategorias
  entram" quando entram 24.
- Escolhido no lugar de tirar o teto de `menuDocumentRefusal` para as ops de adicionar: assim a régua
  continua num dono só (`core`), e uma escrita que não passe por `addChildNode` (um leitor futuro) é
  coberta do mesmo jeito.

### Gate (um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`)

| Medida | Antes (fecho da Fase 5) | Depois | Exit |
| --- | --- | --- | --- |
| core | 4878 / 190 | **4886 / 190** (+8) | 0 |
| backoffice | 4343 / 242 | **4355 / 242** (+12) | 0 |
| store | 6216 / 333 | **6216 / 333** (=) | 0 |
| tipos | store 0 · backoffice 0 · core 11 | store 0 · backoffice 0 · core 11 herdados (nenhum em `menu/`) | — |
| lint | store 2/2 · backoffice 23/5 | store 2/2 · backoffice 23/5 | — |

---

## Correções do QA r1 (2026-10-29)

O QA r1 (`docs/qa/reports/2026-10-28-backoffice-menu-montado-pela-dona.md`) abriu nove bugs atribuídos à
`86` (Q09 é anterior, mesmo conserto). Cada correção começou por um teste que reprovou antes; nenhum
teste foi afrouxado — as duas asserções que mudaram (o `shrink-0` dos controles em `MenuTree.test.tsx`
e o "permission denied" na faixa de erro) foram substituídas pela régua oposta, porque o requisito
mudou. Cada bug ganhou a seção "Correção" e o status `fixed — aguardando reteste`.

| Q | Bug | O quê | Onde | Teste que prova | Status |
| --- | --- | --- | --- | --- | --- |
| Q01 | previa-da-home-no-celular-abre-o-menu (High) | a folha só abre sozinha na prévia do MENU (`useMenuPreview().draft !== null`) | `apps/store/.../StoreLayout.tsx` | `StoreLayoutOverlays.test.tsx` (+2; os 2 do menu recebem o rascunho) · navegador: Home 0 diálogos, Menu 1 | ✅ aguardando reteste |
| Q02 | resposta-perdida-tela-diz-que-nao-salvou | erro na escrita ⇒ relê; igual ao enviado ⇒ Salvo com o `updated_at` relido; releitura falhou ⇒ `STORE_MENU_SAVE_UNKNOWN` e a próxima ação relê antes (sem conflito falso) | `useStoreMenu.ts` | `useStoreMenu.test.ts` bloco Q02 (+5) | ✅ aguardando reteste |
| Q03 | outro-endereco-aceita-pagina-que-nao-existe | só endereço que existe (rota fixa, categoria ativa, peça à venda por uma leitura de `slug`); normalizado por `menuHrefKey`; página repetida recusada em `core` e desabilitada no seletor | `core/menu/{menu,refusals}.ts`, `store-menu/model/enderecoDaLoja.ts`, `entities/product/api/activeProductBySlug.ts`, `MenuTargetPicker.tsx`, `AdminMenuPage.tsx` | core `refusals.test.ts` (+7) · `enderecoDaLoja.test.ts` (6) · `MenuTargetPicker.test.tsx` (+8) · `AdminMenuPage.test.tsx` (+3) | ✅ aguardando reteste |
| Q04 | toque-duplo-em-mover-anda-duas-posicoes | trava por `ref` + `moverDesabilitado` enquanto grava (⋯, setas, arraste) | `AdminMenuPage.tsx`, `MenuTree.tsx` | `AdminMenuPage.test.tsx` Q04 (+2) | ✅ aguardando reteste |
| Q05 | banner-em-edicao-some-ao-trocar-de-aba-ou-esc | rascunho por dispositivo; Esc/fechar/Voltar com alteração pergunta; descartar (e salvar) apaga do Storage a arte não gravada | `MenuBannerEditor.tsx`, `MenuItemEditor.tsx`, `lib/uploadBannerImage.ts`, `shared/lib/uploadImage.ts` (`deleteStorageImage`) | `MenuItemEditor.test.tsx` Q05 (+7) · `uploadImage.test.ts` (+3) | ✅ aguardando reteste |
| Q06 | controles-do-menu-saem-da-tela-com-fonte-grande | controles `min-w-0 max-w-full flex-wrap` (sem `shrink-0`), nomes `break-words`, os dois "Adicionar" com `whitespace-normal` | `MenuTree.tsx` | `MenuTree.test.tsx` Q06 (+5) · navegador 360/390/412 × 100/130/200 %: `scrollWidth` = janela, 0 reticências, 0 alvos < 44 | ✅ aguardando reteste (editor e seletor: Q06b) |
| Q06b | o mesmo bug — o editor do item e o seletor a 200 % | ícones: cabeçalho `flex-wrap`, busca `h-11`, cela `min-h-[76px]`; editor: par de dispositivo `flex-wrap`, botões com texto `whitespace-normal h-auto min-h-11`, folha `max-sm:p-4`; banners: cabeçalho, ações e cabeça do banner `flex-wrap`, todos os alvos 44; seletor: folha com a altura da tela no celular, `p-3`/`gap-2`, descrição `max-sm:sr-only`, rodapé lado a lado embrulhando | `MenuIconPicker.tsx`, `MenuItemEditor.tsx`, `MenuBannerEditor.tsx`, `MenuTargetPicker.tsx` | Q06b nos quatro testes (+4 +4 +3 +5 = +16) · navegador 360/390/412 × 100/130/200 %: body e diálogo sem rolagem lateral, 0 alvos < 44 (fora o X de `packages/ui`), área da lista a 200 % de 1–41 px para 361–465 px | ✅ aguardando reteste |
| Q07 | foco-cai-no-body-ao-fechar-dialogos-do-menu | alvo de foco pendente por `data-testid`, aplicado no `onCloseAutoFocus` e a cada render | `AdminMenuPage.tsx`, os três diálogos (prop `onCloseAutoFocus`) | `AdminMenuPage.test.tsx` Q07 (+9) | ✅ aguardando reteste |
| Q08 | erro-de-leitura-do-menu-mostra-typeerror | `error` sempre `STORE_MENU_LOAD_FAILURE`; detalhe "Confira a internet e tente de novo." | `useStoreMenu.ts`, `AdminMenuPage.tsx` | `useStoreMenu.test.ts` (reescrito + 1) · `AdminMenuPage.test.tsx` (+1, 1 reescrito) | ✅ aguardando reteste |
| Q09 | ver-na-loja-da-home-abre-o-painel (anterior à 86) | `storeOrigin()` como em `/admin/menu` | `AdminHomePage.tsx` | `AdminHomePage.test.tsx` (+2) | ✅ aguardando reteste |

**Ficaram abertos, fora do escopo** (anteriores à 86, componentes compartilhados com decisão humana
pendente): `BUG-20261028-voltar-depois-da-folha-perde-a-rolagem`,
`BUG-20261028-dialogos-animam-com-movimento-reduzido`, `BUG-20261026-fechar-do-modal-em-ingles`,
`BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200`.

### Decisões de desenho

- **Q01**: o discriminador é o canal (só a prévia do menu manda rascunho `MENU_PREVIEW_SOURCE`), não um
  parâmetro novo — que seria um segundo dono de "esta janela é uma prévia".
- **Q02**: a releitura compara o `value` por igualdade estrutural sem ordem de chave (o jsonb reordena).
  Quando nem a releitura responde, a frase é "Não deu para confirmar se salvou" e a ação seguinte relê
  antes de gravar; se o banco tem o valor incerto, a op parte do gravado (a tela passa a mostrar a
  verdade), senão a guarda de `updated_at` acusa o conflito real.
- **Q03**: a regra pura de repetição mora em `core` (`menuHrefKey` + `menuDocumentRefusal`, tolerando a
  repetição que já existia no documento anterior, como o teto do submenu); a de existência mora no
  painel, porque a peça depende do banco. `/perguntas-frequentes/<pergunta>` e `/produtos` puro são
  recusados.
- **Q05**: "Salvar banners" grava o rascunho dos dois dispositivos; "Voltar" com alteração também pede
  confirmação (desmontava o editor e perdia o rascunho do mesmo jeito).
- **Q05 × guarda**: o apagar do Storage foi para `shared/lib/uploadImage.ts` — `menuDocumentoComDonoUnico`
  (suíte da loja) recusa qualquer `.from(` não literal em `features/store-menu/**`, e acusou o primeiro
  rascunho.
- **Q08**: o título da faixa já diz "Não foi possível carregar o menu"; repetir `STORE_MENU_LOAD_FAILURE`
  no detalhe duplicaria a frase, então o detalhe diz o que fazer.

### Gate (um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`)

| Medida | Antes (fecho da verificação r1) | Depois | Exit |
| --- | --- | --- | --- |
| core | 4886 / 190 | **4893 / 190** (+7) | 0 |
| backoffice | 4355 / 242 | **4405 / 243** (+50/+1, `enderecoDaLoja.test.ts`) | 0 |
| backoffice, depois do Q06b | 4405 / 243 | **4421 / 243** (+16) | 0 |
| store, depois do Q06b | 6218 / 333 | **6218 / 333** | 0 |
| store | 6216 / 333 | **6218 / 333** (+2) | 0 |
| tipos | store 0 · backoffice 0 · core 11 | store 0 · backoffice 0 · core 11 herdados | — |
| lint | store 2/2 · backoffice 23/5 | store 2/2 · backoffice 23/5 (zero nos arquivos tocados) | — |
| Q06b: tipos e lint | backoffice 0 · 23/5 | backoffice **0** · **23/5** (zero em `features/store-menu/ui`) | — |
| `pnpm build` | verde | verde | 0 |

## Correções do QA r2 (2026-10-29)

O reteste (`docs/qa/reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md`) abriu três bugs
da `86` e dois paper cuts. Cada correção começou por um teste que reprovou antes (confirmado vermelho);
nenhum teste foi afrouxado. **Duas asserções de `core` mudaram pela régua oposta, porque o requisito
mudou (R01)**: `internalMenuHrefRefusal('/nao-existe')` e o link `/nao-existe` no documento eram
recusados por não estarem em `ROUTE_SLUGS`; agora a forma bem feita passa (a existência é do painel), e
a vizinha exige a recusa do mal formado (`/nao existe`). `useStoreMenu.test.ts` passou a exigir
`kind: 'incerto'` (R02). Cada bug ganhou "Correção" e status `fixed — aguardando reteste`.

| R | Bug / paper cut | O quê | Onde | Teste que prova | Status |
| --- | --- | --- | --- | --- | --- |
| R01 | caminho-de-colecao-passa-no-seletor-e-e-recusado-ao-gravar (Medium) | `menuLinkPathRefusal` em `core` julga só a FORMA do link (caminho interno bem formado passa: rota fixa, categoria de 1–2 segmentos, `/produtos/<slug>`; recusa `javascript:`, espaço, aspas, `<>`, `//`, `.`/`..`), sem listar rotas; `internalMenuHrefRefusal` e `menuDocumentRefusal` a usam. Existência só em `conferirEnderecoDaLoja`. Banner (`menuTargetRefusal`) intocado | `core/menu/refusals.ts`; comentários em `enderecoDaLoja.ts`, `activeProductBySlug.ts` | core `refusals.test.ts` "R01" (+16, 8 vermelhos) · `enderecoDaLoja.test.ts` propriedade (+10, 4 vermelhos com a régua antiga reinjetada) · `AdminMenuPage.test.tsx` R01 (+3, vermelhos com a régua antiga) · navegador 390: filha e raiz gravam (2 PATCH) | ✅ aguardando reteste |
| R02 | incerteza-de-gravacao-com-titulo-nao-salvou (Low) | desfecho `incerto` no hook; título "Não deu para confirmar", sem `destructive` | `useStoreMenu.ts`, `AdminMenuPage.tsx`, barril exporta `STORE_MENU_SAVE_UNKNOWN` | `AdminMenuPage.test.tsx` R02 (+1) | ✅ aguardando reteste |
| R03 | foco-cai-no-body-ao-continuar-editando-o-banner (Low) | o controle focado ao abrir a pergunta recebe o foco de volta em "Continuar editando" (senão o primeiro campo da folha) | `MenuItemEditor.tsx` | `MenuItemEditor.test.tsx` R03 (+3, `document.activeElement`) | ✅ aguardando reteste |
| R04 | paper cut: seletor abre com foco na aba | `onOpenAutoFocus` foca a busca da aba Categoria | `MenuTargetPicker.tsx` | `MenuTargetPicker.test.tsx` R04 (+1) · navegador: foco `busca-categoria` | ✅ aguardando reteste |
| R05 | paper cut: reticências a 200 % | `truncate` → `break-words` nos nomes e caminhos das duas abas | `MenuTargetPicker.tsx` | `MenuTargetPicker.test.tsx` R05 (+2, token exato) · navegador 390/200 %: 0 elementos com `text-overflow: ellipsis` (37 linhas em Categoria, 7 em Página), body 390 = janela, diálogo 388/388 | ✅ aguardando reteste |

### Decisão de desenho (R01)

Eram dois donos de "este endereço vale?": o seletor (existência, com o catálogo e o banco) e a régua
de `core` (só `ROUTE_SLUGS`), e o segundo recusava ao gravar o que o primeiro aceitou. Agora são duas
perguntas com um dono cada: **forma** em `core` (`menuLinkPathRefusal`, pura, alcançável pelo Deno —
sem import novo), **existência** no painel, só na criação. Gravar não reconfere existência (o
documento já gravado com um link para coleção que depois saiu do ar continua editável; a loja o
desenha como link). O destino de **banner** ficou na régua da 39 (`menuTargetRefusal`, rotas fixas),
de propósito: lá a coleção é escolhida pelo nome, e afrouxar não era necessário — com isso o
comentário `NAV-31` ("a mesma validação do item de link") deixa de ser literal, e está declarado em
`refusals.ts`.

### Gate (um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`)

| Medida | Antes (correções do QA r1) | Depois | Exit |
| --- | --- | --- | --- |
| core | 4893 / 190 | **4909 / 190** (+16) | 0 |
| backoffice | 4421 / 243 | **4441 / 243** (+20) | 0 |
| store | 6218 / 333 | **6218 / 333** | 0 |
| tipos | store 0 · backoffice 0 · core 11 | store 0 · backoffice 0 · core 11 herdados | — |
| lint | store 2/2 · backoffice 23/5 | store 2/2 · backoffice 23/5 (zero nos arquivos tocados) | — |

`store_settings.menu` restaurado depois da prova em navegador (`diff` vazio, `updated_at` incluso).

## Correções do QA r3 (2026-10-29)

O reteste r3 (`docs/qa/reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3.md`) abriu dois
bugs Low da `86` e deixou um resíduo anotado no da incerteza. Cada correção começou por um teste que
reprovou antes (confirmado vermelho, 20 casos); nenhum teste foi afrouxado. **Uma asserção antiga foi
invertida pelo requisito (S01)**: `conferirEnderecoDaLoja('/aneis')` exigia a recusa — era o bug —, e
passou a exigir a canônica `/joias-afetivas/aneis`, com a vizinha `/inventada` recusada ao lado. Cada
bug ganhou "Correção" e status `fixed — aguardando reteste`. Sem migration, sem `core`.

| S | Bug | O quê | Onde | Teste que prova | Status |
| --- | --- | --- | --- | --- | --- |
| S01 | filha-num-segmento-recusada-no-outro-endereco (Low) | a categoria é decidida por `resolveCategoryRoute` (`core/page`, a régua da loja, `AD-018`) sobre as ativas: a forma curta de uma filha ativa passa e grava `rota.canonical` (= `categoryHref`) com query/fragmento; inativa ("fora do ar"), slug repetido entre ativas, pai errado e 3 segmentos recusam, cada um com motivo verdadeiro | `enderecoDaLoja.ts` (`MOTIVO_COLECAO_FORA_DO_AR`, `MOTIVO_COLECAO_AMBIGUA`) | `enderecoDaLoja.test.ts` "S01" (+10, com a propriedade em `menuDocumentRefusal`) e +2 na propriedade R01 · `AdminMenuPage.test.tsx` "S01" (+3) · navegador 390/1440: `/COLAR-E-CORRENTES/` ⇒ 1 PATCH, banco `/joias-e-acessorios/colar-e-correntes`; `/black-friday`, `/profissoes` "fora do ar" sem PATCH | ✅ aguardando reteste |
| S02 | seletor-reaberto-depois-da-aba-pagina-foca-a-aba (Low) | o zero do seletor sai do `useEffect` e vai para o render em que `open` vira verdadeiro: o 1º quadro aberto já é a aba Categoria com a busca | `MenuTargetPicker.tsx` | `MenuTargetPicker.test.tsx` "S02" (+2, reabertura depois de Esc e de recusa na aba Página, `document.activeElement`) · navegador 390/1440: reaberto ⇒ `busca-categoria` / `aba-categoria` nos 4 casos | ✅ aguardando reteste |
| S03 | resíduo de incerteza-de-gravacao-com-titulo-nao-salvou | depois do `incerto`, o hook relê sozinho pela fila (`STORE_MENU_RELEITURA_MS` 0·1·2·4·8·15 s, e no `online`/`focus`): valor enviado ⇒ confirmado + `Salvo`; versão já vista ⇒ nada; outra ⇒ conflito verdadeiro | `useStoreMenu.ts` | `useStoreMenu.test.ts` "S03" (+3; o dublê ganhou `leiturasComErro`) · `AdminMenuPage.test.tsx` "S03" (+1, pela página real, sem toque) · navegador 390/1440: tela `true`/banco `false` no aviso; liberada a rede, tela `false` em ~1,3 s, `Salvo`, sem conflito, zero PATCH novo | ✅ aguardando reteste |

### Decisão de desenho (S03)

A releitura em segundo plano passa pela **mesma fila** das `apply`, para nunca correr junto de uma
gravação, e só age se a incerteza que ela foi resolver ainda é a vigente (uma `apply` que chegou antes
já a resolveu pelo caminho do Q02). Quando o banco tem uma terceira versão, ela acusa o conflito em vez
de adotar a versão nova: é a mesma resposta que a próxima ação daria, e adotar em silêncio poria a
mudança de outra janela na tela sem a dona saber de onde veio. Na prova apareceu que o supabase-js
refaz sozinho o GET que falha por rede (três tentativas), então o aviso de incerteza leva alguns
segundos para aparecer — comportamento anterior à `86`, não mexido.

### Gate (um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`)

| Medida | Antes (correções do QA r2) | Depois | Exit |
| --- | --- | --- | --- |
| core | 4909 / 190 | **4909 / 190** | 0 |
| backoffice | 4441 / 243 | **4462 / 243** (+21) | 0 |
| store | 6218 / 333 | **6218 / 333** | 0 |
| tipos | store 0 · backoffice 0 · core 11 | store 0 · backoffice 0 · core 11 herdados | — |
| lint | store 2/2 · backoffice 23/5 | store 2/2 · backoffice 23/5 (zero nos arquivos tocados) | — |

`store_settings.menu` restaurado depois de cada rodada da prova em navegador (`diff` vazio, `updated_at`
incluso). Evidência: `docs/qa/evidence/2026-10-29-backoffice-menu-montado-pela-dona-correcoes-r3/`.

## Correções da verificação r2 (2026-10-29)

A r2 (`validation.md`, *Rodada 2*) reprovou por cobertura, com 5 sobreviventes (N08, N11, N14, N35,
N38) e nenhum defeito de produto. As quatro correções são **só de teste**. Cada mutante foi
reinjetado no arquivo real e restaurado por cópia, com SHA-256 conferido (`sha_ok` nos 9). Todos
morreram por asserção, nenhum por compilação. **Nenhum conserto de produção**: a página já desenhava
`menu-erro` para a falha de categorias (`state === 'error'` cobre as duas leituras).

| G | O quê | Onde | Mutante reinjetado | Resultado |
| --- | --- | --- | --- | --- |
| G01 | Com relógio falso, trocado depois de montar: depois de resolver (`Salvo`), 5 min de relógio sem leitura nova. Com a rede caída, os degraus 0·1·2·4·8·15·15·15 s vêm **escritos por extenso** (1 ms antes não lê, no instante lê uma vez). `online` relê na hora, no meio do degrau de 15 s, resolve e para. Sem incerteza, `online` não lê. A constante é conferida num caso à parte | `useStoreMenu.test.ts` "G01" (+5) | **N08** (sem `if (!enviado) return` e reagendando sempre) · **N09** (2º degrau 60 s) · **N11** (sem o ouvinte `online`) | N08 morto (2: "expected 26 to be 3"); N09 morto (2, e o laço sozinho: "no degrau de 1000 ms"); N11 morto (1) ✅ |
| G02 | `menuLinkPathRefusal`, `internalMenuHrefRefusal` e `menuDocumentRefusal` recusam aspas duplas, aspas simples, crase, `<`, `>`, `\`, `\n`, `\r` e tab na query/âncora, com caminho bem formado antes | core `refusals.test.ts` R01 (+9, `it.each`) | **N14** (sem a linha da régua do `resto`) | morto (9) ✅ |
| G03 | Remover o item do MEIO (`n-presentes`) foca `acoes-n-sobre`. Tirar o filho do MEIO de um submenu de três foca `tirar-c-pulseiras` | `AdminMenuPage.test.tsx` Q07 (+2) | **N35** (`itens[k - 1] ?? itens[k + 1]`) · **N35c** (o mesmo em `removerFilho`) | os dois mortos (1 cada) ✅ |
| G04 | Com `categories` falhando, o hook fica em `state 'error'` com `error === STORE_MENU_LOAD_FAILURE` e `document` nulo, e o `reload` relê. Pela página real, a faixa `menu-erro` aparece sem o erro cru e nunca o vazio, e "Tentar de novo" relê. Os dois dublês ganharam `erroCategorias` | `useStoreMenu.test.ts` (+1), `AdminMenuPage.test.tsx` (+1) | **N38** (o erro de categorias cru no `error`) · **N38s** (o `state` ignorando o erro de categorias) | N38 morto (1, no hook); N38s morto (2, hook e página) ✅ |

### Gate (um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`)

| Medida | Antes (correções do QA r3) | Depois | Exit |
| --- | --- | --- | --- |
| core | 4909 / 190 | **4918 / 190** (+9) | 0 |
| backoffice | 4462 / 243 | **4471 / 243** (+9) | 0 |
| store | 6218 / 333 | **6218 / 333** | 0 |
| tipos | store 0 · backoffice 0 · core 11 | store 0 · backoffice 0 · core 11 herdados | — |
| lint | store 2/2 · backoffice 23/5 | store 2/2 · backoffice 23/5 | — |
| `pnpm build` | verde | verde | 0 |

## Fecho das lacunas da r3 (2026-10-29)

A r3 (`validation.md`, *Rodada 3*) reprovou por cobertura, com 3 sobreviventes (F16, F17, F25) e nenhum defeito de produto. Fechadas sem rodada 4 (precedente `72`/`73`/`83`), **só com testes**, pelo implementador (não por Verifier). Cada mutante reinjetado no arquivo real e restaurado por cópia, SHA-256 conferido.

| H | O quê | Onde | Mutante | Resultado |
| --- | --- | --- | --- | --- |
| H01 | a reconciliação que relê OUTRA versão acusa conflito, sem Salvo e sem escrita nova | `useStoreMenu.test.ts` S03 (+1) | F17 | morto por asserção ✅ |
| H02 | `focus` relê na hora durante a incerteza; sem incerteza, não lê | `useStoreMenu.test.ts` G01 (+2) | F16 | morto por asserção ✅ |
| H03 | filho externo do acordeão do celular é `<a target="_blank" rel="noopener noreferrer">`; o interno não | `MobileMenu.test.tsx` (+1) | F25 | morto por asserção ✅ |

Gate: core **4918/190** · backoffice **4474/243** · store **6219/333**, os três exit 0; tipos 0 · 0 · core 11 herdados; lint 2/2 · 23/5; `pnpm build` verde. Lição `L-084`.
