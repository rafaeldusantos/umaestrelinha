# Menu configurável — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

**Convenção do projeto que SOBREPÕE a Skill** (`CLAUDE.md`): **não** criar um commit por task. Os
commits saem **ao fim da implementação**, agrupados. O `Commit:` de cada task abaixo é o rótulo do
grupo a que ela pertence, não uma promessa de commit atômico.

---

**Design**: `.specs/features/39-menu-configuravel/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerada do código, das diretrizes do projeto e da spec. **Diretrizes encontradas**: `CLAUDE.md`
> (raiz — seções *Os guardas* e *Baselines*), `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`,
> `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`, `apps/*/vitest.config.ts`.

| Camada | Tipo de teste | Expectativa de cobertura | Local | Comando |
| --- | --- | --- | --- | --- |
| Regra pura (`packages/core/src/menu/**`) | unit | **1:1 com as ACs da spec**; toda borda listada tem caso; sem React/Supabase/Deno no grafo | `packages/core/src/menu/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Guarda que lê arquivo do disco (migration, `App.tsx`, fonte de widget) | unit | **Âncora dupla obrigatória** (arquivos lidos **e** alvos encontrados) + **sensor por mutação** de pelo menos uma asserção | `apps/*/src/shared/lib/__tests__/*.test.ts`, `apps/*/src/**/__tests__/*.test.ts` | por workspace |
| Componente da loja (jsdom/RTL) | unit | Todo estado que a AC descreve: presença, ausência, texto, `href`, `rel`, ordem. **Nunca** medida de layout (jsdom devolve 0) | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| Componente do painel (jsdom/RTL) | unit | Idem, mais recusa com motivo e erro de gravação | `apps/backoffice/src/**/*.test.tsx` | `pnpm --filter @estrelinha/backoffice test` |
| Migration `.sql` | guarda que lê o `.sql` | Coluna gerada, índice, backfill idempotente, semeadura, ausência de `grant` a `anon` | `apps/store/src/shared/lib/__tests__/menuSchema.test.ts` | store |
| Tipos (`packages/supabase/src/types/**`) | none — **probe HTTP** | `AD-012`: `PATCH` com `Prefer: return=representation` contra o banco local provando gravação **antes** de o tipo existir | — | probe + build gate |
| Layout real (estouro da barra, 390 × 1440) | none em jsdom — **navegador** | UAT no `validation.md`, com evidência medida | — | `playwright-cli` / navegador |

## Gate Check Commands

> **Um workspace por vez, com exit code capturado** (`CLAUDE.md`: o lote sequencial dos cinco já
> reprovou store e backoffice por timeout de jsdom sob carga, e `pnpm test | tail` esconde a falha).

| Nível | Quando | Comando |
| --- | --- | --- |
| Quick (core) | Task que só mexe em `packages/core` | `pnpm --filter @estrelinha/core test; echo "exit=$?"` |
| Quick (store) | Task que mexe em `apps/store` | `pnpm --filter @estrelinha/store test; echo "exit=$?"` |
| Quick (painel) | Task que mexe em `apps/backoffice` | `pnpm --filter @estrelinha/backoffice test; echo "exit=$?"` |
| Full | Task que cruza workspaces (ícones, tipos) | os três acima, **em sequência**, cada um com exit code |
| Build | Fim de fase | `npx tsc --noEmit -p apps/store/tsconfig.app.json` · `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` · `pnpm build` · `pnpm lint` |

**Baselines a não regredir** (medidas na branch de origem): lint **27 erros / 5 warnings**, tipos
**0 · 0 · 0**, testes **store 2001/135 · backoffice 1786/109 · core 1493/60 · functions 350/7 ·
catalog-import 509/23**. Quedas declaradas e permitidas: `TrendingLane`, `MenuBarPreview`,
`menuSlotRefusal`/`MENU_SLOT_LIMIT` — cada uma anotada com o motivo no fecho.

---

## Progresso

| Lote | Fases | Tasks | Estado | Commit | Medição |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | T1–T5 | ✅ completo | `5dffb6b` | core **1705/66** (+212/+6) · tsc 0 · 0 |
| 2 | 2 + 3 | T6–T11 | ✅ completo | `3c00b09` · `1b97a38` | store **2046/137** (+45/+2) · core 1705/66 · backoffice 1786/109 · lint 27/5 (=) · tsc 0 · 0 · build ✅ |
| 3 | 4 | T12–T18 | ✅ completo | `7697f91` · `test(39): os guardas do menu na loja` | store **2140/142** (+94/+5) · core 1705/66 (=) · backoffice 1786/109 (=) · lint 27/5 (=) · tsc 0 · 0 |
| 4 | 5 | T19–T26 | — | — | — |
| 5 | 6 + 7 | T27–T32 | — | — | — |

**Desvios aceitos no lote 1** (todos documentados no código):

- **T4 antes de T1** — a dependência declarada estava invertida: `MenuItem.icon` é `MenuIconKey` e
  `menuItems` chama `menuIconKey` para cumprir NAV-19.
- **`menuBannerSlots` mora em `menu.ts`**, não em `banners.ts`: `hasPanel` precisa saber se há banner,
  e `banners.ts → target.ts → menu.ts` fecharia **ciclo de import** — que o Vite tolera e o Deno da
  function do sitemap não. O primitivo da forma ficou em `menu.ts`, a resolução em `banners.ts`.
- **`hasPanel` conta a presença do banner, não o resolvido** — destino de produto só resolve quando o
  painel abre (T17), e esperar por ele faria a seta aparecer depois do primeiro hover.
- **`resolveMenuBanners` trunca em 2 na leitura.** Diverge do princípio de `menuEntries` ("nunca
  trunca, o contador acusa"). Aceito porque o terceiro banner só chega por SQL na mão — **mas a
  contrapartida entra na T25**: o editor tem de *acusar* o excedente, senão ele fica invisível e
  indeletável.
- `MenuCategory` ganhou os campos novos como **opcionais** e `show_in_menu` virou opcional/legado —
  sem isso os ~15 consumidores atuais parariam de compilar antes da T12. Nada foi removido.

**Desvios aceitos no lote 2** (todos documentados no código):

- **`icons.test.ts` NÃO foi para `packages/ui`, e `paths.test.ts` não se moveu.** A T10 mandava mover
  os dois junto com a biblioteca. `packages/ui` **não tem script `test` nem `vitest.config.ts`**:
  um teste ali dentro nunca rodaria, e guarda que não roda é pior que guarda nenhum, porque parece
  estar de pé. `icons.test.ts` ficou na suíte da loja (`shared/lib/__tests__`), varrendo
  `packages/ui/src/icons` — a mesma solução que `materialTransitions`, `homeSections` e
  `vercelRedirects` já usam para ler migrations e o `vercel.json`. E `paths.test.ts` guarda
  `shared/ui/brand/paths.ts`, que **não** faz parte da biblioteca de ícones e não mudou de casa.
- **A migration acrescentou `not null` à coluna gerada**, que o design não pedia: sem ele
  `show_in_menu` viraria nullable e `DbCategory.show_in_menu` deixaria de ser `boolean`. As duas
  fontes são `not null`, então a derivada nunca é nula.
- **Os backfills e a conversão vivem num `do $$` guardado por `attgenerated = ''`.** O design escrevia
  os comandos soltos; soltos, a segunda execução leria a coluna já DERIVADA e ligaria nas duas
  superfícies tudo que estivesse ligado em uma — apagando a curadoria da Adri em silêncio.
- **Duas fixtures do painel ganharam os campos novos** (`CategoryFormDialog.test.tsx`,
  `Taxonomy.test.tsx`): `DbCategory` descreve a linha, e a linha traz as colunas novas. A alternativa
  — declará-las opcionais no tipo — seria o `AD-012` de novo, com o tipo dizendo menos que o banco.

**Desvios aceitos no lote 3** (todos documentados no código):

- **A superfície é pedida por nome, e `useMenu` mudou de assinatura** — `useMenu('desktop')` no
  `Header`, `useMenu('mobile')` na folha. Derivar por largura de tela faria o hook responder uma
  coisa na prévia do painel e outra no navegador da cliente.
- **`Category` (o tipo da loja) PERDEU `emoji`, `show_in_menu` e `menu_promo`** e ganhou `icon`,
  `menu_desktop`, `menu_mobile` e `menu_banners`. O design só mandava mexer em `CategoryRow`, mas
  o mapper devolve `Category`: manter os campos no tipo com o mapper sem produzi-los seria o
  `AD-012` de novo. Consequência obrigatória: `SearchOverlay.tsx` perdeu o `{cat.emoji && …}`,
  que **nunca renderizou nada** — a coluna não existe em migration nenhuma.
- **Os banners chegam às telas por `useMenuBanners(categoryId, surface)`**, e não pelo `MenuItem`:
  `MenuCategoryItem` não carrega o jsonb cru, e passar `categories` pelas props do header faria a
  linha crua viajar por três componentes. O hook mora ao lado de `useMenuTargets` (T17).
- **O selo do banner sai em `ink-soft`, e não no ouro do board.** `accent-strong` sobre `ground`
  mede 3,55:1 e o selo é texto de 11px (desktop) e 10px (celular) — reprova os 4,5:1. Mesmo desvio
  que a `31` já declarou três vezes.
- **O ícone muda de tom com o fundo**: `accent` na faixa `primary` do desktop (3,26:1) e
  `accent-strong` na folha branca do celular (3,85:1). O board pinta os dois com o mesmo token;
  `accent` sobre branco mede 2,82:1 e reprova até como objeto gráfico.
- **`accentText.test.ts` passou a varrer `.ts`, e não só `.tsx`.** `navItem.ts` guarda a forma do
  item e declara o ouro do ícone — a régua não alcançava onde a classe mora. Sensor por mutação
  registrado no próprio arquivo.
- **Os dois guardas da T18 carregam uma lista de DÍVIDA EM TRÂNSITO do painel** (4 arquivos em
  `menuSurfaceSingleOwner`, 3 em `menuSemItemFixo`), porque a fase 5 ainda não rodou. Cada entrada
  nomeia a task que a remove, e uma asserção exige que ela **ainda case**: no dia em que a T21
  apagar a leitura, o guarda reprova até a entrada sair. A loja tem **zero** entradas, escrito
  literalmente.
- **`renditionUrl` não foi usado na arte do banner**: o módulo da feature 38 não existe neste
  ramo. A arte sai em `<img loading="lazy">`; trocar para rendition é um `s/src/srcSet/` quando as
  duas features se encontrarem.

**Quedas declaradas do lote 3** (as duas são superfícies que deixaram de existir, e o número
reaparece do outro lado na mesma reescrita):

- `MegaMenu.test.tsx` foi de **19 para 31**: saem os **3** casos de `MENU-13` (a faixa
  `TrendingLane`, 3 produtos automáticos por `is_featured`) e os **3** de `MENU-27/28` (o card
  `menu_promo`, retângulo de cor sem imagem); entram 18 dos banners, do ícone, das colunas e do
  item de link.
- `MobileMenu.test.tsx` foi de **15 para 30**: saem os **3** casos de `MENU-27` (a faixa
  promocional do rodapé da folha, que mostrava o promo da *primeira* entrada que tivesse um);
  entram 18, com o banner **dentro** do acordeão e a prova de que ele é daquela entrada.

**Lacuna conhecida do lote 2, para o Verifier e para o UAT**: a migration foi exercida **três vezes
sobre o banco local com catálogo importado**, nunca a partir do zero. `supabase db reset` não foi
rodado **de propósito** — o `seed.sql` não tem mais catálogo, e resetar destruiria os 680 produtos
importados nesta máquina. O caminho "banco novo" continua **não provado**, e é o que o CI exerce no
projeto hospedado. Quem fechar isto precisa de um banco descartável, não do local.

---

## Execution Plan

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7
```

### Fase 1 — A regra, em `@estrelinha/core/menu` (5)
Nada aqui depende de banco nem de tela. É onde as ACs viram função pura.
```
T1 → T2 → T3 → T4 → T5
```

### Fase 2 — Banco, prova e tipos (4)
```
T6 → T7 → T8 → T9
```

### Fase 3 — Os ícones mudam de casa (2)
```
T10 → T11
```

### Fase 4 — A loja (7)
```
T12 → T13 → T14 → T15 → T16 → T17 → T18
```

### Fase 5 — O painel (8)
```
T19 → T20 → T21 → T22 → T23 → T24 → T25 → T26
```

### Fase 6 — A prévia ao vivo, P2 (3)
```
T27 → T28 → T29
```

### Fase 7 — Fecho (3)
```
T30 → T31 → T32
```

---

## Task Breakdown

### T1: `menuItems` — a fusão das duas fontes e o papel derivado

**What**: criar `MenuSurface`, `MenuCategory`, `MenuLink`, `MenuItem` e a função `menuItems(input, surface)`, que filtra pela superfície, deriva o papel (barra × painel) da árvore, funde categorias e links e ordena por `(sort_order, nome)`. **Não trunca.**
**Where**: `packages/core/src/menu/menu.ts` (evolui), `packages/core/src/menu/__tests__/menuItems.test.ts`
**Depends on**: None
**Reuses**: `ancestorsOf`, `categoryHref`, `pathLabel`, `bySortOrder` (mesmo arquivo)
**Requirement**: NAV-01, NAV-03, NAV-05, NAV-06, NAV-07, NAV-14, NAV-15

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Categoria marcada só no desktop **não** aparece em `menuItems(..., 'mobile')`
- [ ] Filha marcada de pai marcado na mesma superfície **não** vira entrada e aparece em `children` do pai
- [ ] Filha marcada de pai **não** marcado vira entrada da barra
- [ ] Inativa não é devolvida; ciclo `a → b → a` termina
- [ ] Links e categorias saem **na mesma lista ordenada**; empate de `sort_order` desempata por nome com locale `pt-BR`
- [ ] 20 itens ligados devolvem 20 — **nenhuma recusa por contagem existe no módulo**
- [ ] Gate: `pnpm --filter @estrelinha/core test; echo "exit=$?"`

**Tests**: unit · **Gate**: quick (core) · **Commit**: `feat(39): a regra do menu configurável`

---

### T2: `resolveMenuTarget` + `menuTargetRefusal` — o dono único do destino

**What**: um módulo que resolve destino de **categoria, produto ou endereço digitado** para `{ href, external, name, description }`, e uma recusa em texto para a gravação. Interno é normalizado e conferido contra `ROUTE_SLUGS`; externo exige `https://`.
**Where**: `packages/core/src/menu/target.ts`, `packages/core/src/menu/__tests__/target.test.ts`
**Depends on**: T1
**Reuses**: `ROUTE_SLUGS`, `categoryPath`, `productPath` (`@estrelinha/core/routes`), `categoryHref`
**Requirement**: NAV-10, NAV-11, NAV-30, NAV-31

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Categoria/produto apagado ou inativo ⇒ `null` (não renderiza)
- [ ] `/sobre` resolve; `/sobree` é recusado com motivo citando as rotas válidas
- [ ] `http://` externo é recusado; `https://` passa com `external: true`
- [ ] Recusa devolve `string | null` (nunca união discriminada por booleano — `strictNullChecks: false`)
- [ ] Gate: quick (core)

**Tests**: unit · **Gate**: quick (core) · **Commit**: `feat(39): a regra do menu configurável`

---

### T3: `resolveMenuBanners` + `menuBannerRefusal`

**What**: validar o jsonb `menu_banners` por superfície, resolver destino via T2, herdar título/texto do destino, escolher a arte do dispositivo (com fallback para a do outro) e recusar o terceiro banner.
**Where**: `packages/core/src/menu/banners.ts`, `__tests__/banners.test.ts`
**Depends on**: T2
**Reuses**: a regra de `resolvePromo` (destino inválido ⇒ some), que é substituída por esta
**Requirement**: NAV-28, NAV-29, NAV-30, NAV-32, NAV-33, NAV-34, NAV-35

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] jsonb malformado, `null`, array na raiz e destino pendurado ⇒ lista vazia, sem lançar
- [ ] Sem título ⇒ nome do destino; sem texto ⇒ descrição do destino; sem imagem ⇒ banner sem imagem (não some)
- [ ] `image_mobile` ausente na superfície mobile ⇒ usa `image_desktop`, e o retorno **declara** que reaproveitou
- [ ] Três banners ⇒ `menuBannerRefusal` devolve motivo
- [ ] Gate: quick (core)

**Tests**: unit · **Gate**: quick (core) · **Commit**: `feat(39): a regra do menu configurável`

---

### T4: catálogo de chaves de ícone

**What**: `MENU_ICON_KEYS`, `MenuIconKey`, `MENU_ICON_LABELS` e `menuIconKey(raw)` — chave inválida devolve `null`.
**Where**: `packages/core/src/menu/icons.ts`, `__tests__/icons.test.ts`
**Depends on**: T1
**Reuses**: os nomes dos 29 ícones de `apps/store/src/shared/ui/icons/index.ts`
**Requirement**: NAV-19, NAV-21

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [ ] Emoji, string vazia, `null` e chave desconhecida ⇒ `null`
- [ ] O módulo continua puro (sem React) — asserido pelo teste de pureza
- [ ] Gate: quick (core)

**Tests**: unit · **Gate**: quick (core) · **Commit**: `feat(39): a regra do menu configurável`

---

### T5: `menuPanelColumns`

**What**: distribuir as filhas do painel em colunas de até 8, na ordem recebida.
**Where**: `packages/core/src/menu/menu.ts`, `__tests__/panelColumns.test.ts`
**Depends on**: T1
**Requirement**: NAV-24

**Tests**: unit · **Gate**: quick (core) · **Commit**: `feat(39): a regra do menu configurável`

**Done when**:
- [ ] 0 filhas ⇒ `[]`; 8 ⇒ uma coluna; 9 ⇒ duas (8 + 1); 17 ⇒ três
- [ ] A ordem de entrada é preservada dentro e entre colunas

---

### T6: a migration

**What**: `menu_desktop`, `menu_mobile`, `menu_banners`; os três backfills; `show_in_menu` virando **coluna gerada** com o índice parcial recriado; limpeza de `categories.icon`; semeadura de `store_settings.menu` com o link "Sobre".
**Where**: `supabase/migrations/20260905130000_39-menu-configuravel.sql`
**Depends on**: T1
**Reuses**: molde aditivo/idempotente de `20260905120000_37-*` (`value ||` + `NOT value ?`)
**Requirement**: NAV-08

**Tools**: MCP NONE (o servidor `supabase` **não está autorizado nesta sessão** — usar CLI e `curl`) · Skill `supabase`

**Done when**:
- [x] `supabase db reset` roda limpo; segunda execução da migration afeta 0 linhas
- [x] `menu_promo` **não** é apagada; `show_in_menu` existe e é gerada
- [x] O índice parcial existe depois da recriação
- [x] `store_settings` ganha a chave `menu` só se ela não existir
- [x] Gate: build

**Tests**: none (o guarda é T9) · **Gate**: build · **Commit**: `feat(39): o banco do menu configurável`

---

### T7: probe HTTP provando as colunas (`AD-012`)

**What**: provar por `curl` contra o banco local que as colunas novas **gravam e leem** — `PATCH` com `Prefer: return=representation` —, e que `show_in_menu` reflete as duas booleanas sem aceitar escrita.
**Where**: evidência colada em `.specs/features/39-menu-configuravel/validation.md` (seção Probes)
**Depends on**: T6
**Requirement**: NAV-08

**Done when**:
- [x] `PATCH` de `menu_desktop`/`menu_mobile`/`menu_banners`/`icon` devolve os valores persistidos
- [x] `PATCH` de `show_in_menu` **falha** (coluna gerada) — a mensagem fica registrada
- [x] Nenhum tipo foi escrito antes desta prova

**Tests**: none (probe) · **Gate**: build · **Commit**: `feat(39): o banco do menu configurável`

---

### T8: tipos e defaults

**What**: `DbCategory` ganha `menu_desktop`, `menu_mobile`, `menu_banners`, `icon` e marca `show_in_menu`/`menu_promo` como legado; `MenuBanner`/`MenuBanners` declarados em `core/menu` e **reexportados** por `@estrelinha/supabase/types`; `MenuSettings`/`DEFAULT_MENU` + `SettingsKey`.
**Where**: `packages/supabase/src/types/index.ts`, `.../settings.ts`, `packages/core/src/menu/banners.ts`
**Depends on**: T7
**Reuses**: a inversão da `33` (o tipo mora em `core`, o pacote de tipos reexporta)
**Requirement**: NAV-08

**Done when**:
- [x] `npx tsc --noEmit` limpo nos dois apps
- [x] `MenuPromo` deixa de ser exportado; nada mais o importa

**Tests**: none (build gate) · **Gate**: build · **Commit**: `feat(39): o banco do menu configurável`

---

### T9: `menuSchema.test.ts` — o guarda da migration

**What**: guarda que lê o `.sql` do disco e derruba a suíte se ele afrouxar.
**Where**: `apps/store/src/shared/lib/__tests__/menuSchema.test.ts`
**Depends on**: T6
**Reuses**: molde de `storeSettingsDefaults.test.ts` e `importSchema.test.ts`
**Requirement**: NAV-08

**Done when**:
- [x] **Âncora dupla**: o teste assere que leu o arquivo **e** que achou as três colunas
- [x] Assere: `show_in_menu` gerada; índice parcial presente; `on conflict (key) do nothing`; `NOT value ?`/`do nothing` na semeadura; nenhum `grant` alcançando `anon`; o "Sobre" semeado
- [x] **Sensor por mutação**: uma asserção provada por injeção de falha, registrada no `validation.md`
- [x] Gate: quick (store)

**Tests**: unit · **Gate**: quick (store) · **Commit**: `feat(39): o banco do menu configurável`

---

### T10: a biblioteca de ícones muda de casa

**What**: mover os 30 arquivos de `apps/store/src/shared/ui/icons/**` para `packages/ui/src/icons/**`, criar o subpath `@estrelinha/ui/icons`, acrescentar `MENU_ICON_COMPONENTS` e **mover junto** `icons.test.ts` e `paths.test.ts`.
**Where**: `packages/ui/src/icons/**`, `packages/ui/package.json` (exports)
**Depends on**: T4
**Requirement**: NAV-21

**Done when**:
- [x] O barrel antigo **não existe mais** (dois caminhos para o mesmo ícone é o defeito 01)
- [x] `icons.test.ts` e `paths.test.ts` rodam no novo lugar, com as âncoras de contagem intactas
- [x] `MENU_ICON_COMPONENTS` cobre **toda** chave de `MENU_ICON_KEYS`
- [x] Gate: full

**Tests**: unit · **Gate**: full · **Commit**: `refactor(39): os ícones passam a ser dos dois apps`

---

### T11: os 15 imports da loja + `menuIconCatalog.test.ts`

**What**: trocar `@/shared/ui/icons` por `@estrelinha/ui/icons` nos 15 arquivos da loja e criar o guarda bidirecional chave ↔ componente.
**Where**: 15 arquivos de `apps/store/src`, `apps/store/src/shared/lib/__tests__/menuIconCatalog.test.ts`
**Depends on**: T10
**Requirement**: NAV-21

**Done when**:
- [x] Zero ocorrência de `shared/ui/icons` em `apps/store`
- [x] O guarda tem **âncora de contagem** e falha se uma chave ficar sem componente
- [x] Gate: full

**Tests**: unit · **Gate**: full · **Commit**: `refactor(39): os ícones passam a ser dos dois apps`

---

### T12: `useCategories` — colunas novas, campos fantasmas fora

**What**: `CategoryRow` ganha `menu_desktop`, `menu_mobile`, `menu_banners`, `icon`; **perde** `emoji` (coluna que nunca existiu) e `menu_promo`.
**Where**: `apps/store/src/entities/category/api/useCategories.ts` (+ teste)
**Depends on**: T8
**Requirement**: NAV-01

**Done when**:
- [ ] Nenhuma referência a `emoji` sobra no slice
- [ ] Defaults conservadores preservados (`active` cai em `true`; as duas do menu caem em `false`)
- [ ] Gate: quick (store)

**Tests**: unit · **Gate**: quick (store) · **Commit**: `feat(39): a loja lê o menu configurável`

---

### T13: `useMenu(surface)`

**What**: passar a devolver `MenuItem[]` por superfície, fundindo `useCategories` com `settings.menu.links`, **sem consulta nova**.
**Where**: `apps/store/src/entities/category/api/useMenu.ts` (+ teste)
**Depends on**: T12
**Reuses**: `useStoreSettings` (`@estrelinha/core/hooks`)
**Requirement**: NAV-01, NAV-14, NAV-15

**Done when**:
- [ ] Falha de leitura ⇒ `[]` (a loja não quebra)
- [ ] Sem links ⇒ só categorias; sem categorias ⇒ só links
- [ ] Gate: quick (store)

**Tests**: unit · **Gate**: quick (store) · **Commit**: `feat(39): a loja lê o menu configurável`

---

### T14: `Header` — faixa rolável, sem item em JSX

**What**: a faixa de departamentos passa a rolar na horizontal (`overflow-x-auto` + `min-w-max`, **sem** `flex-wrap`), não renderiza quando não há itens, e **perde o link "Sobre" escrito no JSX**.
**Where**: `apps/store/src/widgets/header/ui/Header.tsx`, `navItem.ts` (+ testes)
**Depends on**: T13
**Requirement**: NAV-03, NAV-04, NAV-14

**Done when**:
- [ ] Nenhum `<Link to="/…">` de navegação sobra no arquivo
- [ ] Lista vazia ⇒ a faixa não está no DOM
- [ ] O teste assere as classes de rolagem e a **ausência** de `flex-wrap` (jsdom não mede largura)
- [ ] Gate: quick (store)

**Tests**: unit · **Gate**: quick (store) · **Commit**: `feat(39): a loja lê o menu configurável`

---

### T15: `MegaMenu` — ícone, colunas e banners; sai a faixa automática

**What**: item com ícone e seta só quando há painel; painel = `menuPanelColumns` + "ver tudo em X" + até 2 banners. **`TrendingLane` é removida.**
**Where**: `apps/store/src/widgets/header/ui/MegaMenu.tsx` (+ teste)
**Depends on**: T14
**Requirement**: NAV-17, NAV-18, NAV-20, NAV-22, NAV-25, NAV-26, NAV-28, NAV-35

**Done when**:
- [ ] Entrada sem filhas e sem banner é link direto (sem `aria-expanded`, sem seta)
- [ ] Banner externo sai com `target="_blank"` e `rel="noopener noreferrer"`
- [ ] Sem banner ⇒ nenhum nó reservado
- [ ] A queda dos casos de `TrendingLane` é anotada com o motivo
- [ ] Gate: quick (store)

**Tests**: unit · **Gate**: quick (store) · **Commit**: `feat(39): a loja lê o menu configurável`

---

### T16: `MobileMenu` — ícone, filhas curadas, banner no acordeão

**What**: linhas com ícone; filhas vindas da curadoria do celular; **banner dentro do acordeão** da entrada; sem "Sobre" em JSX; sem o promo único do rodapé.
**Where**: `apps/store/src/widgets/mobile-menu/ui/MobileMenu.tsx` (+ teste)
**Depends on**: T13
**Reuses**: `TAP_44`
**Requirement**: NAV-17, NAV-18, NAV-27, NAV-36

**Done when**:
- [ ] O banner aparece **dentro** do acordeão aberto, e some quando ele fecha
- [ ] Nenhum item de menu escrito em JSX
- [ ] Todo alvo de toque ≥ 44px (`touchTarget.test.ts` continua verde)
- [ ] Gate: quick (store)

**Tests**: unit · **Gate**: quick (store) · **Commit**: `feat(39): a loja lê o menu configurável`

---

### T17: `useMenuTargets` — destino de produto, resolvido tarde

**What**: hook que resolve os destinos de **produto** dos banners do painel aberto (id → slug/nome/ativo), montado só quando o painel abre.
**Where**: `apps/store/src/entities/menu/api/useMenuTargets.ts` (+ teste)
**Depends on**: T15
**Reuses**: o padrão de montagem tardia que a `TrendingLane` usava
**Requirement**: NAV-30

**Done when**:
- [ ] Sem banner de produto ⇒ **nenhuma consulta** é feita
- [ ] Produto inativo ou inexistente ⇒ o banner não renderiza
- [ ] Gate: quick (store)

**Tests**: unit · **Gate**: quick (store) · **Commit**: `feat(39): a loja lê o menu configurável`

---

### T18: os dois guardas da loja

**What**: `menuSemItemFixo.test.ts` (nenhum item de menu em JSX, `FIXED_ENTRIES` inexistente) e `menuSurfaceSingleOwner.test.ts` (nenhum arquivo de `apps/**` lê `show_in_menu` ou `menu_promo`).
**Where**: `apps/store/src/shared/lib/__tests__/`
**Depends on**: T16
**Reuses**: molde de `freeShippingSingleOwner.test.ts` (âncora dupla + sensores)
**Requirement**: NAV-14

**Done when**:
- [ ] **Âncora dupla** nos dois; allowlist explícita e mínima
- [ ] Sensor por mutação registrado no `validation.md`
- [ ] Gate: quick (store)

**Tests**: unit · **Gate**: quick (store) · **Commit**: `test(39): os guardas do menu`

---

### T19: `uploadImageBlob` sai de `product-form`

**What**: mover para `apps/backoffice/src/shared/lib/uploadImage.ts`, fechar o `||` do `SUPABASE_URL` (`BL-009`) e apontar `product-form` para o novo lugar.
**Where**: `apps/backoffice/src/shared/lib/uploadImage.ts` (+ testes movidos)
**Depends on**: T8
**Requirement**: NAV-33

**Done when**:
- [ ] `product-form` importa de `shared/lib`; nenhum import feature→feature
- [ ] O fallback hard-coded de `SUPABASE_URL` não existe mais
- [ ] Os testes existentes de upload passam no novo lugar (sem perda de contagem)
- [ ] Gate: quick (painel)

**Tests**: unit · **Gate**: quick (painel) · **Commit**: `refactor(39): o upload de imagem vira compartilhado`

---

### T20: `useMenuLinks`

**What**: ler e gravar `store_settings.menu.links`, com recusa de destino via `menuTargetRefusal`.
**Where**: `apps/backoffice/src/features/store-menu/model/useMenuLinks.ts` (+ teste)
**Depends on**: T8
**Requirement**: NAV-09, NAV-10, NAV-11, NAV-13

**Done when**:
- [ ] Destino inválido não chega ao banco
- [ ] Remover um link não toca em mais nada da chave `menu`
- [ ] Gate: quick (painel)

**Tests**: unit · **Gate**: quick (painel) · **Commit**: `feat(39): a tela do menu configurável`

---

### T21: `MenuSlotList` reescrita

**What**: lista única de categorias **e** links, com alça de arraste, chip de ícone, switch da superfície corrente, aviso cruzado ("desligada no celular") e contagem que é **informação, não cota**. `FIXED_ENTRIES` apagada.
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuSlotList.tsx` (+ teste)
**Depends on**: T20
**Requirement**: NAV-02, NAV-05, NAV-14, NAV-38, NAV-39

**Done when**:
- [ ] Ligar o 6º, o 10º e o 20º item **não** produz recusa
- [ ] O aviso cruzado nomeia o dispositivo
- [ ] Arraste entre ramos recusa com motivo
- [ ] Gate: quick (painel)

**Tests**: unit · **Gate**: quick (painel) · **Commit**: `feat(39): a tela do menu configurável`

---

### T22: `MenuIconPicker`

**What**: grade com o desenho de verdade (`MENU_ICON_COMPONENTS`), o nome e a opção "sem ícone".
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuIconPicker.tsx` (+ teste)
**Depends on**: T11, T21
**Requirement**: NAV-16, NAV-17, NAV-18

**Done when**:
- [ ] Todo ícone do catálogo é oferecido; "sem ícone" limpa o valor
- [ ] O componente renderizado é o **mesmo** que a loja usa (import de `@estrelinha/ui/icons`)
- [ ] Gate: quick (painel)

**Tests**: unit · **Gate**: quick (painel) · **Commit**: `feat(39): a tela do menu configurável`

---

### T23: `MenuLinkDialog`

**What**: cadastro/edição de item de link — rótulo, destino (com recusa em texto), ícone, ligação por dispositivo.
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuLinkDialog.tsx` (+ teste)
**Depends on**: T20, T22
**Requirement**: NAV-09, NAV-10, NAV-11, NAV-12, NAV-13

**Done when**:
- [ ] Destino inválido mostra o motivo e **não** fecha o diálogo
- [ ] Link não oferece painel, subcategoria nem banner
- [ ] Gate: quick (painel)

**Tests**: unit · **Gate**: quick (painel) · **Commit**: `feat(39): a tela do menu configurável`

---

### T24: `MenuPanelEditor`

**What**: marcar/desmarcar as subcategorias que entram no painel da entrada selecionada, na superfície corrente, com o texto que explica que desmarcar não tira da loja.
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuPanelEditor.tsx` (+ teste)
**Depends on**: T21
**Requirement**: NAV-22, NAV-23, NAV-27

**Done when**:
- [ ] Marcar/desmarcar grava só a booleana da superfície corrente
- [ ] A contagem "N de M" bate com a árvore
- [ ] Gate: quick (painel)

**Tests**: unit · **Gate**: quick (painel) · **Commit**: `feat(39): a tela do menu configurável`

---

### T25: `MenuBannerEditor`

**What**: dois slots por superfície, arte do computador e do celular com aviso do que falta, seletor de destino (categoria, produto ou endereço) e recusa do terceiro.
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuBannerEditor.tsx` (renomeia `MenuPromoEditor`) (+ teste)
**Depends on**: T19, T24
**Reuses**: `shared/lib/uploadImage` (T19), `menuTargetRefusal` (T2)
**Requirement**: NAV-28, NAV-29, NAV-31, NAV-32, NAV-33, NAV-34

**Done when**:
- [ ] Terceiro banner recusado com motivo
- [ ] **Excedente gravado à mão é ACUSADO** — se o jsonb trouxer 3, a tela diz "3 gravados, 2 cabem" e
      deixa apagar o excedente. Contrapartida do desvio do lote 1: `resolveMenuBanners` trunca na
      leitura, e sem este aviso o terceiro ficaria invisível e indeletável
- [ ] A tela diz qual arte falta, e avisa quando está reaproveitando a do outro dispositivo
- [ ] Gate: quick (painel)

**Tests**: unit · **Gate**: quick (painel) · **Commit**: `feat(39): a tela do menu configurável`

---

### T26: `AdminMenuPage` + a morte do segundo desenho

**What**: compor a tela com o alternador Computador/Celular, os quatro editores e os estados de erro; **apagar `MenuBarPreview.tsx`** e estender `previaUnica.test.ts` para cobrir o menu.
**Where**: `apps/backoffice/src/pages/admin/AdminMenuPage.tsx`, `features/store-menu/**`
**Depends on**: T25
**Requirement**: NAV-37, NAV-40, NAV-41, NAV-42

**Done when**:
- [ ] O alternador troca lista, contagem e editores juntos
- [ ] `MenuBarPreview.tsx` não existe; o guarda recusa a volta
- [ ] Falha de leitura vira superfície explícita; falha de gravação diz o que não salvou
- [ ] Os dois casos de `FIXED_ENTRIES` em `AdminMenuPage.test.tsx` são **substituídos**, não removidos
- [ ] Gate: quick (painel)

**Tests**: unit · **Gate**: quick (painel) · **Commit**: `feat(39): a tela do menu configurável`

---

### T27: o canal de prévia do menu (P2)

**What**: `core/menu/preview.ts` — `MENU_PREVIEW_SOURCE`, mensagens `draft`/`open`/`ready` e `parseMenuPreviewMessage`, importando os genéricos de `core/home/preview.ts`.
**Where**: `packages/core/src/menu/preview.ts` (+ teste)
**Depends on**: T1
**Reuses**: `PREVIEW_PARAM`, `isPreviewWindow`, `PREVIEW_DEVICES`, `previewScale`, `previewSrc`
**Requirement**: NAV-43, NAV-47

**Tests**: unit · **Gate**: quick (core) · **Commit**: `feat(39): a prévia ao vivo do menu`

**Done when**:
- [ ] Mensagem sem o carimbo de origem é recusada
- [ ] `parse` devolve `null` (nunca união booleana) para forma inválida

---

### T28: a loja escuta o canal

**What**: em modo prévia, a loja aceita o rascunho de menu e abre o painel da entrada indicada.
**Where**: `apps/store/src/entities/menu/model/useMenuPreview.ts`, `Header`/`MegaMenu` (+ testes)
**Depends on**: T27, T15
**Reuses**: `useHomePreview` como molde
**Requirement**: NAV-44

**Done when**:
- [ ] Fora do iframe, `?preview=1` **não** muda nada
- [ ] Mensagem de outra origem é ignorada
- [ ] Gate: quick (store)

**Tests**: unit · **Gate**: quick (store) · **Commit**: `feat(39): a prévia ao vivo do menu`

---

### T29: `MenuLivePreview` no painel

**What**: o palco — iframe da loja, alternador de dispositivo (390 escalado, nunca encolhido), métrica e recarga.
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuLivePreview.tsx`, `model/useMenuPreviewBridge.ts`
**Depends on**: T28, T26
**Reuses**: `HomeLivePreview` como molde
**Requirement**: NAV-43, NAV-45, NAV-46, NAV-47

**Done when**:
- [ ] Sem `VITE_STORE_URL`, a tela diz isso e **continua editável**
- [ ] O `postMessage` usa a origem exata, nunca `'*'`
- [ ] Gate: quick (painel)

**Tests**: unit · **Gate**: quick (painel) · **Commit**: `feat(39): a prévia ao vivo do menu`

---

### T30: a limpeza de `core/menu` + `menuSemTeto.test.ts`

**What**: remover `MENU_SLOT_LIMIT`, `slotsUsed`, `menuSlotRefusal`, `resolvePromo`, `menuEntries` e `MenuEntry`, agora sem consumidor; criar o guarda que recusa a volta do teto.
**Where**: `packages/core/src/menu/menu.ts`, `apps/store/src/shared/lib/__tests__/menuSemTeto.test.ts`
**Depends on**: T18, T26
**Requirement**: NAV-03

**Done when**:
- [ ] Nenhum arquivo do repositório importa os símbolos removidos
- [ ] O guarda derruba a suíte se "vaga"/`SLOT_LIMIT` voltar, ou se a barra trocar rolagem por `flex-wrap`
- [ ] As quedas de contagem são anotadas com o motivo
- [ ] Gate: full

**Tests**: unit · **Gate**: full · **Commit**: `refactor(39): sai o teto de vagas do menu`

---

### T31: busca no seletor de ícones (P3)

**What**: filtro por nome, sem acento nem caixa.
**Where**: `MenuIconPicker.tsx` (+ teste)
**Depends on**: T22
**Requirement**: NAV-48

**Tests**: unit · **Gate**: quick (painel) · **Commit**: `feat(39): a tela do menu configurável`

**Done when**:
- [ ] "gravacao" acha "Gravação"

---

### T32: documentação e baselines

**What**: atualizar `CLAUDE.md` (raiz: tabela de guardas + baselines medidas; `apps/store`, `apps/backoffice`, `packages/core`, `packages/ui`, `supabase`) e o handoff da `STATE.md`.
**Where**: os cinco `CLAUDE.md` + `.specs/STATE.md`
**Depends on**: T30
**Requirement**: — (regra do projeto: "ao fechar uma feature, atualize as baselines")

**Done when**:
- [ ] Baseline de testes **medida por workspace, um por vez, com exit code capturado**
- [ ] As três quedas declaradas aparecem com o motivo
- [ ] Lint e tipos remedidos

**Tests**: none · **Gate**: build · **Commit**: `docs(39): baselines e guardas do menu configurável`

---

## Phase Execution Map

```
Fase 1:  T1 → T2 → T3 → T4 → T5
Fase 2:  T6 → T7 → T8 → T9
Fase 3:  T10 → T11
Fase 4:  T12 → T13 → T14 → T15 → T16 → T17 → T18
Fase 5:  T19 → T20 → T21 → T22 → T23 → T24 → T25 → T26
Fase 6:  T27 → T28 → T29
Fase 7:  T30 → T31 → T32
```

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 função + tipos do módulo | ✅ |
| T2, T3, T4, T5 | 1 módulo/função cada | ✅ |
| T6 | 1 migration | ✅ |
| T7 | 1 probe | ✅ |
| T8 | 1 conjunto de tipos coeso | ⚠️ 3 arquivos, mesma declaração — coeso |
| T9, T18, T30 | 1 guarda cada (T18 são dois irmãos, mesmo molde) | ⚠️ OK, coeso |
| T10 | 1 movimentação mecânica | ⚠️ 30 arquivos, zero decisão — coeso |
| T11 | 1 troca de import + 1 guarda | ✅ |
| T12–T17 | 1 arquivo/componente cada | ✅ |
| T19–T26 | 1 componente cada | ✅ |
| T27–T29 | 1 módulo cada | ✅ |
| T31, T32 | 1 função / 1 conjunto de docs | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | — | início da Fase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T1 | T3 → T4 (mesma fase, ordem sequencial) | ✅ |
| T5 | T1 | T4 → T5 (mesma fase) | ✅ |
| T6 | T1 | Fase 1 → Fase 2 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T6 | T8 → T9 (mesma fase) | ✅ |
| T10 | T4 | Fase 1 → Fase 3 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T8 | Fase 2 → Fase 4 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T13 | mesma fase, depois de T15 | ✅ |
| T17 | T15 | mesma fase | ✅ |
| T18 | T16 | mesma fase | ✅ |
| T19 | T8 | Fase 2 → Fase 5 | ✅ |
| T20 | T8 | Fase 2 → Fase 5 | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | T11, T21 | Fase 3 → Fase 5; T21 → T22 | ✅ |
| T23 | T20, T22 | mesma fase | ✅ |
| T24 | T21 | mesma fase | ✅ |
| T25 | T19, T24 | mesma fase | ✅ |
| T26 | T25 | T25 → T26 | ✅ |
| T27 | T1 | Fase 1 → Fase 6 | ✅ |
| T28 | T27, T15 | Fases 6 e 4 | ✅ |
| T29 | T28, T26 | Fases 6 e 5 | ✅ |
| T30 | T18, T26 | Fases 4 e 5 → Fase 7 | ✅ |
| T31 | T22 | Fase 5 → Fase 7 | ✅ |
| T32 | T30 | T30 → T32 | ✅ |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1–T5 | Regra pura (core) | unit, 1:1 com AC | unit | ✅ |
| T6 | Migration | guarda que lê `.sql` | none — **coberta por T9** | ⚠️ ver nota |
| T7 | Probe | none (probe) | none | ✅ |
| T8 | Tipos | none (build + probe de T7) | none | ✅ |
| T9 | Guarda de disco | unit + âncora dupla + sensor | unit | ✅ |
| T10, T11 | Biblioteca compartilhada | unit | unit | ✅ |
| T12–T17 | Componente/hook da loja | unit | unit | ✅ |
| T18 | Guarda de disco | unit + âncora dupla + sensor | unit | ✅ |
| T19–T26 | Componente/hook do painel | unit | unit | ✅ |
| T27–T29 | Módulo puro + componentes | unit | unit | ✅ |
| T30 | Guarda de disco | unit + âncora + sensor | unit | ✅ |
| T31 | Componente | unit | unit | ✅ |
| T32 | Documentação | none | none | ✅ |

**Nota sobre T6 (a única exceção, e ela é declarada)**: a migration não é testável no commit em que
nasce — o guarda dela precisa que o arquivo exista para lê-lo do disco, e escrever guarda e migration
na mesma task faria o teste ser escrito olhando a resposta. **Mitigação**: T7 (probe HTTP contra o
banco de verdade) roda **imediatamente depois** e é o que prova o comportamento; T9 congela a forma.
Nenhum código fica sem verificação — o que muda é o instrumento (probe, não teste de unidade), que é
exatamente o que o `AD-012` exige para coluna nova.

---

## Ferramentas por task (resposta ao passo 6 da Skill)

| Recurso | Uso nesta feature |
| --- | --- |
| MCP `supabase` | **Indisponível — o servidor não está autorizado nesta sessão.** Banco local via `supabase` CLI e `curl` (T6, T7) |
| MCP `paper` | Já usado no design (boards `39 · Loja — Mega Menu`, `39 · Loja — Menu (Mobile 390)`, `39 · Painel — /admin/menu`). Consultar `get_jsx`/`get_computed_styles` ao implementar T14–T17 e T21–T26 |
| Skill `supabase` | T6 (migration, RLS, idempotência) |
| Skill `playwright-cli` | UAT em 390 e 1440 (estouro da barra, banner no acordeão) — evidência do `validation.md` |
| Skill `tlc-spec-driven` | Todo o Execute |
