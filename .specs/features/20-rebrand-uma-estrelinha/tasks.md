# 20 · Rebrand Uma Estrelinha — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tasks com a skill `tlc-spec-driven`: **ative-a pelo nome e siga o fluxo de Execute e
as Critical Rules dela.** Não procure os arquivos da skill por caminho de sistema. A skill é a fonte
da verdade do fluxo completo (ciclo por task, delegação a sub-agentes, revisão de adequação,
Verifier, sensor de discriminação).

**Se a skill não puder ser ativada, PARE e avise — não prossiga sem ela.**

---

**Spec**: [`spec.md`](./spec.md) · **Design**: [`design.md`](./design.md) · **Contexto**: [`context.md`](./context.md)
**Status**: Approved — 2026-08-08 · execução por lotes com sub-agentes

---

## Test Coverage Matrix

> Gerada do codebase, das diretrizes do projeto e da spec — confirmar antes do Execute.
> **Diretrizes encontradas:** `CLAUDE.md` (raiz), `.specs/STATE.md` (`AD-001`..`AD-016`),
> `apps/*/vitest.config.ts`, `packages/core/vitest.config.ts`, `supabase/vitest.config.ts`,
> `.github/workflows/ci.yml`.

| Camada | Tipo de teste | Expectativa de cobertura | Padrão de local | Comando |
| --- | --- | --- | --- | --- |
| UI da loja (`entities`, `features`, `widgets`, `pages`) | unit (vitest + RTL) | Toda AC visível da spec; **prova em viewport móvel** para tela nova (`CLAUDE.md`: 90% do acesso é celular) | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| Domínio / lib da loja (`shared/lib`, `*/lib`, `*/model`) | unit | Todos os ramos; 1:1 com as ACs; todo edge case listado | `apps/store/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| **Testes-guarda de identidade** (paleta, contraste, borda de campo, varredura de marca, forma de botão, ordem de import) | unit lendo **do disco** | Cada guarda com **âncora de contagem** obrigatória (`expect(files.length).toBeGreaterThan(N)`) — sem ela, um erro de caminho faz a suíte varrer zero arquivo e passar em silêncio | `apps/store/src/shared/{lib,ui}/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| UI do backoffice | unit (vitest + RTL) | Manter o que existe; nenhum teste pode encolher | `apps/backoffice/src/**/*.test.tsx` (colocado) | `pnpm --filter @estrelinha/backoffice test` |
| `packages/core` (domínio puro, inclui `payment/pricing`) | unit | Todos os ramos; nenhum resultado de dinheiro pode mudar nesta feature | `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Handlers de edge function | unit com deps injetadas (`AD-004`) | Caminhos felizes + falha; `index.ts` (wiring `Deno.serve`) fica de fora, por decisão declarada | `supabase/functions/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Migrations / SQL | **none** + prova de execução | `AD-012`: tipo escrito à mão **não é schema**. Migration que grava se prova com `supabase db reset` + probe HTTP contra o banco local — nunca por inspeção de tipo | `supabase/migrations/*.sql` | `supabase db reset` + probe |
| Config (`vite.config`, `tsconfig`, `.env`, `config.toml`, `package.json`) | **none** | Gate de build apenas | — | gate `build` |

**Nota sobre `pnpm build`:** ele **não faz typecheck** (é `vite build` puro; o esbuild remove tipos
sem checar). Build verde não prova ausência de erro de tipo. O typecheck real é
`npx tsc --noEmit -p apps/<app>/tsconfig.app.json` — note o `tsconfig.app.json`, porque o
`tsconfig.json` de cada app é solution-style e compila zero arquivo.

**Nota sobre `pnpm lint`:** ele **não olha `packages/`** (`BL-002`). `payment/pricing.ts` — o código
de dinheiro — é type-checado e testado, mas nunca passa por ESLint. Fora do escopo desta feature;
ligar move a baseline.

## Gate Check Commands

> Geradas do codebase — confirmar antes do Execute.

| Nível | Quando usar | Comando |
| --- | --- | --- |
| **quick** | Depois de task que mexe em um workspace só | `pnpm --filter @estrelinha/<ws> test` |
| **full** | Depois de task que atravessa workspaces (rename, tokens, pacotes) | `pnpm test` |
| **build** | Fim de fase, e toda task de config/migration | `pnpm test && pnpm lint && npx tsc --noEmit -p apps/store/tsconfig.app.json && npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` |
| **db** | Toda task com migration | `supabase db reset` completa **e** probe HTTP prova a gravação (`AD-012`) |

**Baselines de referência** (herdadas; **T2 as remede** e o número medido passa a valer):

| | herdado |
| --- | --- |
| lint | 30 err / 9 warn (backoffice 28/7 · store 2/2) |
| `tsc` | 0 · 0 |
| testes da loja | 979 em 77 arquivos |

O gate de toda fase é **"sem erro novo"**, não "lint limpo".

---

## Execution Plan

Fases ordenadas, executadas em sequência; tasks dentro da fase executam em ordem.

### Fase 0 — Fundação (5 tasks)

```
T1 → T2 → T3 → T4 → T5
```

### Fase 1 — Rename barulhento (4 tasks)

O `tsc` é o juiz. Errar aqui quebra alto.

```
T6 → T7 → T8 → T9
```

### Fase 2 — Remoção do domínio botton (7 tasks)

Antes da paleta, de propósito: re-tematizar código que vai ser apagado é trabalho jogado fora.

```
T10 → T11 → T12 → T13 → T14 → T15 → T16
```

### Fase 3 — Paleta e rename silencioso (7 tasks)

A fase de maior risco. Errar aqui **não quebra nada** — por isso ela começa e termina construindo
os juízes que não existem naturalmente.

```
T17 → T18 → T19 → T20 → T21 → T22 → T23
```

### Fase 4 — Marca e ativos (5 tasks)

```
T24 → T25 → T26 → T27 → T28
```

### Fase 5 — Chrome e passe visual (5 tasks)

```
T29 → T30 → T31 → T32 → T33
```

### Fase 6 — Copy e e-mail (5 tasks)

```
T34 → T35 → T36 → T37 → T38
```

### Fase 7 — Documentação e baselines (3 tasks)

```
T39 → T40 → T41
```

---

## Task Breakdown

### T1 — `.gitignore` revisado e repositório inicializado

**O quê**: revisar o `.gitignore` (excluir `dist/`, `.turbo/`, `.playwright-cli/`, `node_modules/`,
`.env`), rodar `git init` e criar o commit de baseline herdada.
**Onde**: `.gitignore`, raiz
**Depende de**: nenhuma · **Reusa**: `.gitignore` existente
**Requisito**: `INF-01`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] `git status` não lista `dist/`, `.turbo/`, `.playwright-cli/` nem `.env`
- [ ] Commit inicial existe e a árvore está limpa
- [ ] Mensagem registra que a baseline vem da Nanita e cita `AD-016`

**Tests**: none · **Gate**: none
**Commit**: `chore: baseline herdada da Nanita (ver AD-016)`

---

### T2 — Instalar o workspace e **medir** as baselines

**O quê**: `pnpm install` na raiz e medição real de lint, `tsc` e contagem de testes; o resultado é
anotado no topo deste arquivo como baseline vigente.
**Onde**: raiz · **Depende de**: T1 · **Reusa**: baselines herdadas como referência
**Requisito**: `INF-01`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] `pnpm install` completa e `node_modules/` da raiz existe
- [ ] `pnpm lint`, `npx tsc --noEmit` nos dois apps e `pnpm test` rodam e os números são **anotados**
- [ ] Qualquer divergência das baselines herdadas é registrada com hipótese, não ignorada

**Tests**: none · **Gate**: build
**Commit**: `chore: mede as baselines de lint, tipo e teste da cópia herdada`

---

### T3 — Supabase local na faixa 54341–54349

**O quê**: `config.toml` com `project_id = "uma-estrelinha-store"` e todas as portas movidas para a
faixa livre; `supabase start` sobe convivendo com as outras duas instâncias da máquina.
**Onde**: `supabase/config.toml`
**Depende de**: T2 · **Reusa**: `config.toml` atual (só os valores de porta e id mudam)
**Requisito**: `INF-02`, `REN-02` (parcial)

**Tools** — MCP: nenhum (MCP do Supabase não autorizado) · CLI: `supabase start` / `db reset` / `psql`

**Done when**:
- [ ] API 54341 · DB 54342 · shadow 54340 · pooler 54349 · Studio 54343 · Inbucket 54344 · analytics 54347 · `inspector_port` 8085
- [ ] `supabase start` sobe **com `nanapin-store` e `ingressos` ativos**, sem colisão
- [ ] `http://127.0.0.1:54341` responde
- [ ] `additional_redirect_urls` apontam para 8082/8083

**Tests**: none · **Gate**: db
**Commit**: `chore(supabase): instância local própria na faixa 54341-54349`

---

### T4 — `.env`, `.env.example` e portas dos apps

**O quê**: `.env` e `.env.example` dos dois apps e da raiz apontando para a instância nova; portas
dos dev servers em 8082 (loja) e 8083 (backoffice).
**Onde**: `apps/*/.env*`, `.env*` da raiz, `apps/*/vite.config.ts`
**Depende de**: T3 · **Reusa**: `.env.example` atual
**Requisito**: `INF-03`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] `VITE_SUPABASE_URL` = `http://127.0.0.1:54341` nos dois apps
- [ ] `pnpm dev` sobe a loja em 8082 e o backoffice em 8083
- [ ] `.env.example` documenta **toda** credencial de produção pendente (`C-08`) com o passo de troca
- [ ] Nenhum `.env` real entra no commit

**Tests**: none · **Gate**: build
**Commit**: `chore(env): aponta os dois apps para a instância local nova`

---

### T5 — Remover `lovable-tagger`

**O quê**: remover o plugin `lovable-tagger` dos dois `vite.config.ts` e do `package.json` da raiz.
**Onde**: `apps/*/vite.config.ts`, `package.json`
**Depende de**: T4 · **Reusa**: —
**Requisito**: `INF-03`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Nenhuma referência a `lovable-tagger` no repositório
- [ ] `pnpm dev` e `pnpm build` funcionam nos dois apps
- [ ] `pnpm install` regenera o lockfile sem o pacote

**Tests**: none · **Gate**: build
**Commit**: `chore: remove o lovable-tagger, dependência de uma plataforma abandonada`

---

### T6 — Renomear os pacotes do workspace

**O quê**: os quatro `packages/*/package.json` (+ `supabase/package.json`) passam a `@estrelinha/*`,
e `tsconfig.base.json` reescreve os `paths`.
**Onde**: `packages/{ui,supabase,auth,core}/package.json`, `supabase/package.json`, `tsconfig.base.json`
**Depende de**: T5 · **Reusa**: estrutura atual — é rename puro
**Requisito**: `REN-01`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Os cinco `name` são `@estrelinha/*`
- [ ] `tsconfig.base.json` mapeia `@estrelinha/*` e nenhum `@nanapin/*`
- [ ] `subpath exports` de `@estrelinha/core` e `@estrelinha/ui` preservados byte a byte

**Tests**: none · **Gate**: none (o repositório fica quebrado até T8 — dependência declarada)
**Commit**: `refactor: pacotes do workspace passam a @estrelinha/*`

---

### T7 — Aliases de Vite e Vitest

**O quê**: os quatro aliases em cada um dos quatro configs (`vite.config` e `vitest.config` dos dois
apps) e o alias de `packages/core/vitest.config.ts`.
**Onde**: `apps/*/vite.config.ts`, `apps/*/vitest.config.ts`, `packages/core/vitest.config.ts`
**Depende de**: T6 · **Reusa**: — · **Requisito**: `REN-01`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Os cinco configs resolvem `@estrelinha/*` e nenhum `@nanapin/*`
- [ ] O `dedupe` do Vite da loja permanece intacto

**Tests**: none · **Gate**: none (idem T6)
**Commit**: `refactor: aliases de Vite e Vitest apontam para @estrelinha/*`

---

### T8 — Reescrever os imports e regerar o lockfile

**O quê**: passe mecânico `@nanapin/` → `@estrelinha/` em todo especificador de import (921 linhas),
nos `pnpm --filter` dos scripts da raiz, e `pnpm install` regerando `pnpm-lock.yaml` do zero.
**Onde**: `apps/**`, `packages/**`, `supabase/**`, `package.json`, `pnpm-lock.yaml`
**Depende de**: T7 · **Reusa**: — · **Requisito**: `REN-01` (AC 2)

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Zero ocorrência de `@nanapin/` no repositório
- [ ] `pnpm install` resolve o workspace inteiro sem erro, com lockfile **regerado** (não editado)
- [ ] `npx tsc --noEmit` = 0 nos dois apps — **este é o juiz desta fase**
- [ ] `pnpm test` volta à contagem medida em T2, sem teste a menos
- [ ] `pnpm dev:store` e `pnpm dev:backoffice` funcionam

**Tests**: none (rename mecânico; o oráculo é `tsc` + a suíte existente) · **Gate**: build
**Commit**: `refactor: todo import passa a @estrelinha/*, lockfile regerado`

---

### T9 — `project_id`, nome do monorepo e e-mail do admin de seed

**O quê**: `name` do `package.json` da raiz, `admin@nanapin.dev` do seed e os e-mails de fixture nos
testes que os citam.
**Onde**: `package.json`, `supabase/seed.sql`, `apps/backoffice/src/pages/admin/AdminLoginPage.test.tsx`,
fixtures de `supabase/functions/**/__tests__`
**Depende de**: T8 · **Reusa**: — · **Requisito**: `REN-02`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] `name` da raiz é `uma-estrelinha-monorepo`
- [ ] Admin de seed é `admin@umaestrelinha.dev`, e o teste de login usa o mesmo
- [ ] `supabase db reset` completa e o login do admin funciona no backoffice
- [ ] `pnpm test` sem teste a menos

**Tests**: unit (os testes citados são atualizados junto) · **Gate**: full + db
**Commit**: `refactor: identidade técnica do monorepo e do admin de seed`

---

### T10 — Remover o Mockup Studio do backoffice

**O quê**: `features/mockup-studio`, `entities/mockup`, `AdminMockupsPage`, a rota `/admin/mockups` e
o item de navegação — com `navItems.test.ts` continuando a bater a ordem das rotas contra `navGroups`.
**Onde**: `apps/backoffice/src/{features/mockup-studio,entities/mockup,pages/admin/AdminMockupsPage.tsx,app/App.tsx,widgets/admin-layout/model/navItems.ts}`
**Depende de**: T9 · **Reusa**: `navItems.test.ts` (lê o `App.tsx` do disco)
**Requisito**: `PIN-01`, `PIN-03`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Nenhum arquivo de mockup em `apps/backoffice/src`
- [ ] `navItems.test.ts` passa — a ordem textual das rotas bate com `navGroups`
- [ ] `/admin/mockups` responde a 404 do backoffice
- [ ] O formulário de produto segue funcionando sem o botão do estúdio
- [ ] `pnpm --filter @estrelinha/backoffice test` passa; contagem anotada

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(backoffice): remove o Mockup Studio`

---

### T11 — Remover mockup dos pacotes compartilhados

**O quê**: `packages/core/src/mockup/`, `packages/core/src/hooks/useMockups.ts`, o tipo de mockup em
`packages/supabase`, e os barrels que os exportavam.
**Onde**: `packages/core/src/**`, `packages/supabase/src/types/**`
**Depende de**: T10 · **Reusa**: — · **Requisito**: `PIN-01`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Nenhum módulo de mockup em `packages/`
- [ ] `packages/core/src/index.ts` e `media/index.ts` não exportam nada de mockup
- [ ] `npx tsc --noEmit` = 0 nos dois apps
- [ ] `pnpm --filter @estrelinha/core test` passa; contagem anotada

**Tests**: unit · **Gate**: full
**Commit**: `refactor(core): remove o domínio de mockup dos pacotes`

---

### T12 — Remover as superfícies de pin da loja

**O quê**: `features/mockup-preview`, `pages/CustomPinPage.tsx`, `features/custom-pin` e as rotas que
apontavam para eles.
**Onde**: `apps/store/src/{features/mockup-preview,features/custom-pin,pages/CustomPinPage.tsx,app/App.tsx}`
**Depende de**: T11 · **Reusa**: a 404 da loja · **Requisito**: `PIN-01`, `PIN-04`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Os três diretórios/arquivos não existem
- [ ] Nenhum link interno (header, footer, menu, mobile-nav) aponta para a rota removida
- [ ] A rota antiga cai na 404 própria da loja, com teste
- [ ] `pnpm --filter @estrelinha/store test` passa; contagem anotada

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(store): remove o kit de pins e a prévia de mockup`

---

### T13 — Migration de remoção de `mockup_templates` e do bucket

**O quê**: migration idempotente que apaga a tabela, os objetos do bucket e o bucket.
**Onde**: `supabase/migrations/<timestamp maior que todos>_remove-mockups.sql`
**Depende de**: T12 · **Reusa**: molde das migrations existentes · **Requisito**: `PIN-01`, `PIN-02`, `COP-02`

**Tools** — Skill: `supabase` · CLI: `supabase db reset` / `psql` (MCP do Supabase não autorizado nesta sessão)

**Done when**:
- [ ] Prefixo de timestamp **maior que todos os existentes** (a CLI chaveia pela versão; prefixo repetido faz a migration ser pulada **em silêncio**)
- [ ] `DROP ... IF EXISTS` em tudo: roda em banco que nunca teve e em banco que tinha
- [ ] Nenhum objeto órfão sobra no storage após o `db reset`
- [ ] Rodar duas vezes completa sem erro
- [ ] **Probe contra o banco local prova a remoção** (`AD-012`) — não inspeção de tipo

**Tests**: none (SQL) + probe · **Gate**: db + build
**Commit**: `feat(db): remove a tabela e o bucket de mockup_templates`

---

### T14 — Ficha técnica sem verdades de botton

**O quê**: `productSpecs` deixa de emitir `Material: metal...`, `Fixação: alfinete...` e
`Arte exclusiva <marca>`; passa a sair só do cadastro.
**Onde**: `apps/store/src/entities/product/lib/productFacts.ts` (+ testes)
**Depende de**: T13 · **Reusa**: `formatCm` e a leitura de `width_cm`/`weight_kg` já existentes
**Requisito**: `PIN-05`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Nenhuma das três strings existe no fonte
- [ ] Produto sem medida cadastrada mostra ficha **curta**, nunca inventada
- [ ] Testes cobrem: com medida, sem medida, e sem nenhum dado (ficha vazia)
- [ ] `pnpm --filter @estrelinha/store test` passa; contagem anotada

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(store): ficha técnica sai do cadastro, sem verdades de botton`

---

### T15 — Remover as avaliações de demonstração

**O quê**: `entities/review` (modelo de demonstração, histograma, cards) e os pontos da página de
produto que os consomem.
**Onde**: `apps/store/src/entities/review/**`, `apps/store/src/pages/ProductPage.tsx` e afins
**Depende de**: T14 · **Reusa**: — · **Requisito**: `PIN-07`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Nenhum depoimento fabricado é renderizado na loja
- [ ] A página de produto continua íntegra sem o bloco (layout não colapsa)
- [ ] Teste cobre a página de produto sem avaliações
- [ ] `pnpm --filter @estrelinha/store test` passa; contagem anotada

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(store): remove as avaliações de demonstração`

---

### T16 — `seed.sql` de joia afetiva

**O quê**: reescrever o seed com categorias e produtos das linhas reais (Uma Estrelinha/cinzas, Leite
Materno, Dente de Leite, Pet, Maternidade, Masculina), mantendo a idempotência por `slug`.
**Onde**: `supabase/seed.sql`
**Depende de**: T15 · **Reusa**: estrutura do seed atual (upsert por slug, marcador SVG embutido)
**Requisito**: `PIN-06`

**Tools** — Skill: `supabase` · CLI: `supabase db reset` / `psql` (MCP do Supabase não autorizado nesta sessão)

**Done when**:
- [ ] Zero string do domínio anterior no arquivo
- [ ] Hierarquia de categoria sobrevive ao `db reset` (`BL-003` é conhecido — o seed **não** pode deixar as categorias planas)
- [ ] `supabase db reset` completa até o fim, sem depender de tabela temporária inexistente
- [ ] Loja abre com produtos de joia e a home renderiza as coleções
- [ ] Rodar o seed duas vezes não duplica

**Tests**: none (SQL) + probe · **Gate**: db + build
**Commit**: `feat(db): seed de desenvolvimento com joias afetivas`

---

### T17 — Declarar a paleta Uma Estrelinha nos dois arquivos

**O quê**: os 13 tokens + `--estrelinha-field #8C8073` em `App.css` e `tailwind.config.ts`, com
`palette.test.ts` reescrito para ler os dois do disco e comparar.
**Onde**: `apps/store/src/app/App.css`, `apps/store/tailwind.config.ts`,
`apps/store/src/shared/lib/__tests__/palette.test.ts`
**Depende de**: T16 · **Reusa**: `palette.test.ts` (estrutura), `shared/lib/contrast.ts`
**Requisito**: `IDN-01`

**Tools** — MCP: `paper` (ler tokens do arquivo) · Skill: nenhuma

**Done when**:
- [ ] Os valores batem com os tokens do Paper e com `../landing-pages/src/styles/global.css`
- [ ] `palette.test.ts` falha se um valor divergir entre os dois arquivos (provado invertendo um valor de propósito e revertendo)
- [ ] `borderRadius` remapeado para a escala do DS (`sm 6 · md 12 · lg 20 · full 999`), com `button` permanecendo **a última chave** — o `tailwind-merge` não colapsa token custom contra t-shirt size e quem vence é a última no CSS
- [ ] Sombras recalibradas do rosa para o slate

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): paleta Uma Estrelinha declarada e guardada por teste de paridade`

---

### T18 — Piso de contraste travado por teste

**O quê**: teste que mede cada token sobre cada superfície e falha nomeando token e razão; proíbe
`accent` e `accent-strong` como texto sobre claro.
**Onde**: `apps/store/src/shared/lib/__tests__/contrast.test.ts`
**Depende de**: T17 · **Reusa**: `contrast.ts` (matemática WCAG pura, sem alteração)
**Requisito**: `IDN-02`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Todo token de texto ≥ 4,5:1 sobre `ground`, `ground-deep` e `surface`
- [ ] `accent` (2,66:1) e `accent-strong` (3,55:1) marcados como **proibidos como texto sobre claro**
- [ ] `accent` sobre `ink` (4,78:1) declarado como o **único** uso de texto do acento
- [ ] `on-primary` sobre `primary` (8,40:1) coberto
- [ ] Falha nomeia token e razão medida, não só "falhou"

**Tests**: unit · **Gate**: quick
**Commit**: `test(store): piso de contraste da paleta, medido e travado`

---

### T19 — Remap das classes: `entities` e `features` da loja

**O quê**: aplicar a tabela de remap do `design.md` (`jam→primary`, `plum→ink-soft`,
`sugar→ground-deep`, `glaze`/`butter`→`accent`, `raspberry→accent-strong`, `border→line`,
`rule→field`, `paper→ground`) nesses dois diretórios.
**Onde**: `apps/store/src/entities/**`, `apps/store/src/features/**`
**Depende de**: T18 · **Reusa**: tabela de remap (`design.md` D1) · **Requisito**: `IDN-04`, `REN-03` (parcial)

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Zero classe `nanita-*` / `nana-*` nesses dois diretórios
- [ ] Os testes de "nenhuma classe fora da paleta" que já existem (checkout, timeline, PIX) são **atualizados** para a paleta nova, nunca removidos
- [ ] `pnpm --filter @estrelinha/store test` passa; contagem **não encolhe**

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(store): remap semântico da paleta em entities e features`

---

### T20 — Remap das classes: `widgets`, `pages` e `shared`

**O quê**: a mesma tabela nos três diretórios restantes, incluindo as chaves de `localStorage`
(`nanapin-*` → `estrelinha-*`) que vivem em `entities`/`features` já tocadas e nos `shared`.
**Onde**: `apps/store/src/{widgets,pages,shared}/**` + as chaves de storage do app inteiro
**Depende de**: T19 · **Reusa**: idem · **Requisito**: `IDN-04`, `REN-03`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Zero classe `nanita-*` / `nana-*` em `apps/store/src`
- [ ] Toda chave de `localStorage`/`sessionStorage` começa com `estrelinha-`, e os testes que citam as chaves são atualizados
- [ ] `buttonShape.test.ts` e `importOrder.test.ts` reescritos para os nomes novos, **com a âncora de contagem preservada**
- [ ] `pnpm --filter @estrelinha/store test` passa; contagem não encolhe

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(store): remap da paleta em widgets, pages, shared e chaves de storage`

---

### T21 — Borda de campo: token e varredura

**O quê**: aplicar `--estrelinha-field` em todo controle de formulário e reescrever
`fieldBorder.test.ts` para falhar se um controle usar `line` ou `accent`.
**Onde**: `apps/store/src/**` (controles), `apps/store/src/shared/lib/__tests__/fieldBorder.test.ts`
**Depende de**: T20 · **Reusa**: `fieldBorder.test.ts` (estrutura + âncora) · **Requisito**: `IDN-03`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Todo `<input>`, `<select>`, `<textarea>` e controle equivalente usa `field`
- [ ] A varredura falha se um controle voltar a `line` (1,25:1) ou `accent` (2,66:1)
- [ ] Âncora de contagem presente (`toBeGreaterThan(50)` ou o número real medido)
- [ ] Provado apontando a varredura para um caminho inexistente: ela **falha**, não passa

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): token de borda de campo com 3,63:1, travado por varredura`

---

### T22 — Tokens do backoffice

**O quê**: `--nana-*` → `--estrelinha-admin-*` em `packages/ui/src/styles.css`,
`packages/ui/tailwind.preset.ts` e nos usos do backoffice. **Valores inalterados.**
**Onde**: `packages/ui/**`, `apps/backoffice/src/**`
**Depende de**: T21 · **Reusa**: — é rename puro · **Requisito**: `REN-04`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Zero `--nana-*` / `nana-` no repositório
- [ ] Cada valor hex do painel é **idêntico** ao de antes (diff prova)
- [ ] O backoffice renderiza exatamente igual (comparação visual antes/depois)
- [ ] `NanaLogo` e `NanaMascot` removidos, e nada os importa
- [ ] `pnpm test` passa; contagem não encolhe

**Tests**: unit · **Gate**: full
**Commit**: `refactor(ui): tokens do painel passam a --estrelinha-admin-*, valores intactos`

---

### T23 — `brandScan.test.ts` — a varredura de marca

**O quê**: teste novo que varre `apps/`, `packages/`, `supabase/`, os `index.html` e as configs da
raiz procurando `nanapin`, `nanita` e `nana`, e falha com arquivo e linha.
**Onde**: `apps/store/src/shared/lib/__tests__/brandScan.test.ts`
**Depende de**: T22 · **Reusa**: padrão de varredura de `fieldBorder.test.ts` e `buttonShape.test.ts`
**Requisito**: `REN-05` (AC 1)

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Zero ocorrência reportada
- [ ] **Âncora de contagem** presente e provada: apontar para caminho inexistente faz o teste **falhar**
- [ ] Allowlist mínima, com **comentário justificando cada entrada** (`.specs/archive/nanita/**` e o próprio arquivo do teste)
- [ ] Provado inserindo `nanita-jam` num arquivo qualquer: o teste falha nomeando arquivo e linha

**Tests**: unit · **Gate**: full
**Commit**: `test: varredura de marca com âncora de contagem`

---

### T24 — Exportar a marca do Paper

**O quê**: exportar do board `78R-0` os SVGs de logotipo completo, assinatura e selo circular
(positivo e negativo) para `.specs/brand/uma-estrelinha/`.
**Onde**: `.specs/brand/uma-estrelinha/`
**Depende de**: T23 · **Reusa**: estrutura de `.specs/brand/nanita-v2/` · **Requisito**: `IDN-05`

**Tools** — MCP: `paper` · Skill: nenhuma

**Done when**:
- [ ] Os SVGs existem e abrem sem erro
- [ ] Cada cor é **um** `<path>` com `fill-rule="evenodd"` — subpaths separados pintam o contador das letras por cima do corpo
- [ ] `README.md` do diretório registra o board de origem e a data

**Tests**: none · **Gate**: none
**Commit**: `chore(brand): exporta a marca Uma Estrelinha do Paper`

---

### T25 — Gerar `paths.ts` por script

**O quê**: adaptar `_gen-paths.mjs` para os SVGs novos e gerar `paths.ts`, com teste comparando
caractere a caractere contra o arquivo-fonte.
**Onde**: `.specs/brand/uma-estrelinha/_gen-paths.mjs`, `apps/store/src/shared/ui/brand/paths.ts`,
`apps/store/src/shared/ui/brand/__tests__/paths.test.ts`
**Depende de**: T24 · **Reusa**: `_gen-paths.mjs` da Nanita · **Requisito**: `IDN-06`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] `paths.ts` é gerado, nunca digitado
- [ ] O teste compara caractere a caractere e tem âncora de contagem (quantos paths espera)
- [ ] Alterar um caractere no SVG-fonte faz o teste falhar

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): paths da marca gerados do SVG, com teste caractere a caractere`

---

### T26 — Componentes de marca

**O quê**: `EstrelinhaLockup`, `EstrelinhaSignature`, `EstrelinhaSeal`, cada um caindo para o degrau
de baixo abaixo do próprio piso; substituir os componentes antigos em header, footer, menu, checkout
e auth.
**Onde**: `apps/store/src/shared/ui/brand/**` (+ consumidores)
**Depende de**: T25 · **Reusa**: estrutura e testes de `shared/ui/brand` da 19 · **Requisito**: `IDN-05`

**Tools** — MCP: `paper` (medir os pisos) · Skill: nenhuma

**Done when**:
- [ ] SVG **inline**, nunca `<img src>` — o header não pode ter estado de carregamento
- [ ] Cada componente tem `role="img"` e nome acessível
- [ ] A escada é testada: abaixo do piso, o componente renderiza o degrau de baixo
- [ ] Header e rodapé usarem marcas diferentes é o **comportamento esperado**, com teste dizendo isso
- [ ] `pnpm --filter @estrelinha/store test` passa; contagem não encolhe

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): marca Uma Estrelinha em SVG inline, com escada de redução`

---

### T27 — Favicon e ícones

**O quê**: gerar `favicon.svg`, `favicon.ico`, `icon-512.png` e `apple-touch-icon.png` a partir do
selo circular, nas duas bases; atualizar `brandAssets.test.ts`.
**Onde**: `apps/store/public/`, `apps/backoffice/public/`, `apps/store/src/app/__tests__/brandAssets.test.ts`
**Depende de**: T26 · **Reusa**: `_gen-favicon.mjs`, `_build-ico.mjs` · **Requisito**: `IDN-07`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Aba do navegador exibe o selo, com recorte próprio
- [ ] `apple-touch-icon` é **sangrado** (o iOS aplica a própria máscara; arte pré-arredondada deixa sobra de canto)
- [ ] A haste do símbolo tem espessura mínima legível a 16px
- [ ] `brandAssets.test.ts` confere que cada arquivo referenciado no `index.html` existe no disco

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): favicon e ícones derivados do selo circular`

---

### T28 — Fontes

**O quê**: trocar o `<link>` do Google Fonts para **Libre Baskerville** + **Outfit** e remapear
`fontFamily` no `tailwind.config.ts`.
**Onde**: `apps/store/index.html`, `apps/store/tailwind.config.ts`
**Depende de**: T27 · **Reusa**: — · **Requisito**: `IDN-08`

**Tools** — MCP: `paper` (`get_font_family_info`) · Skill: nenhuma

**Done when**:
- [ ] Nenhuma fonte da identidade anterior é requisitada (rede limpa)
- [ ] `display`/`heading` = Libre Baskerville; `body` = Outfit
- [ ] Os pesos carregados são os que o DS declara (300–700 em Outfit; 400/700 + itálico em Libre Baskerville)
- [ ] A loja renderiza sem FOUT visível de fonte faltando

**Tests**: unit (asserção sobre o `index.html` lido do disco) · **Gate**: quick
**Commit**: `feat(store): tipografia Libre Baskerville + Outfit`

---

### T29 — Header e navegação contra a board

**O quê**: revestir `widgets/header` (incluindo `MegaMenu`) e `widgets/mobile-menu` conforme
`5MC-0` (desktop) e `6AU-0` (mobile).
**Onde**: `apps/store/src/widgets/{header,mobile-menu}/**`
**Depende de**: T28 · **Reusa**: `menuEntries` e a regra de menu de `@estrelinha/core/menu` — **intactas**
**Requisito**: `IDN-09`

**Tools** — MCP: `paper` (`get_jsx`, `get_computed_styles`) · Skill: nenhuma

**Done when**:
- [ ] Valores tirados de `get_computed_styles`, **nunca lidos de screenshot**
- [ ] O recolhimento do header no scroll segue funcionando (`sticky` + `translate`, nunca `fixed` nem desmontar)
- [ ] Nada de `position: fixed` dentro do `<header>` — ele carrega `transform`, que cria containing block
- [ ] Prova em 390×844 e em 1440
- [ ] `pnpm --filter @estrelinha/store test` passa; contagem não encolhe

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): header e navegação na identidade Uma Estrelinha`

---

### T30 — Rodapé e newsletter contra a board

**O quê**: revestir `widgets/footer` e `features/newsletter` conforme as mesmas boards.
**Onde**: `apps/store/src/widgets/footer/**`, `apps/store/src/features/newsletter/**`
**Depende de**: T29 · **Reusa**: `browseCategories` (a regra de vitrine) — intacta · **Requisito**: `IDN-09`, `COP-07`

**Tools** — MCP: `paper` · Skill: nenhuma

**Done when**:
- [ ] Faixa Instagram com `@umaestrelinha.adri`
- [ ] "Entra no clube da Nana" e toda persona anterior removidas
- [ ] A reserva de espaço da barra de rodapé continua **depois** do `<Footer/>`, não como `pb` do `main`
- [ ] Prova em 390×844

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): rodapé e newsletter na identidade Uma Estrelinha`

---

### T31 — Passe visual: home, categoria e produto

**O quê**: revisar tela a tela o resultado do remap — onde ouro entrou no lugar de rosa e a leitura
mudou, ajustar com decisão registrada.
**Onde**: `apps/store/src/{pages/HomePage.tsx,pages/CategoryPage.tsx,pages/ProductPage.tsx,widgets/**}`
**Depende de**: T30 · **Reusa**: — · **Requisito**: `IDN-04`, `IDN-09`

**Tools** — MCP: `paper` · Skill: `playwright-cli` (evidência visual)

**Done when**:
- [ ] Cada uso de `accent` é **preenchimento ou detalhe**, nunca texto sobre claro
- [ ] O hero não exibe mascote nem produto de pin
- [ ] Cada divergência deliberada da board fica registrada no "Registro de execução" deste arquivo
- [ ] Evidência em 390×844 e 1440 para as três telas

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): passe visual em home, categoria e produto`

---

### T32 — Passe visual: carrinho, checkout e conta

**O quê**: o mesmo passe nas telas de dinheiro, sem tocar em regra de preço.
**Onde**: `apps/store/src/widgets/cart-drawer/**`, `apps/store/src/pages/{CheckoutPage,AccountPage,OrderConfirmationPage}.tsx`, `features/checkout/**`
**Depende de**: T31 · **Reusa**: `resolveOrderPricing` e todo `@estrelinha/core/payment` — **intactos**
**Requisito**: `IDN-04`

**Tools** — MCP: nenhum · Skill: `playwright-cli`

**Done when**:
- [ ] **Nenhum teste de dinheiro muda de resultado** — `pnpm --filter @estrelinha/core test` idêntico
- [ ] Os testes de "nenhuma classe fora da paleta" do checkout passam na paleta nova
- [ ] O checkout continua fora do `StoreLayout`, montando o próprio `AuthOverlay` e a própria gaveta
- [ ] Evidência do fluxo completo em 390×844 (`CLAUDE.md`: fluxo de dinheiro se valida no celular primeiro)

**Tests**: unit · **Gate**: full
**Commit**: `feat(store): passe visual no carrinho, checkout e conta`

---

### T33 — Regressão mobile

**O quê**: varredura de regressão do que o `CLAUDE.md` lista como "o que quebra primeiro no mobile".
**Onde**: `apps/store/src/**` (correções pontuais) + testes
**Depende de**: T32 · **Reusa**: `storeChrome.ts`, `useScrollDirection` e seus testes · **Requisito**: `IDN-10`

**Tools** — MCP: nenhum · Skill: `playwright-cli`

**Done when**:
- [ ] `body` **não** rola horizontalmente em nenhuma rota, em 390px
- [ ] Nenhum alvo de toque abaixo de 44px
- [ ] Texto não embrulha em duas linhas dentro de pílula ou badge
- [ ] `ownsBottomBar` continua garantindo **uma** barra de rodapé por vez, e as duas têm a mesma altura
- [ ] Evidência por rota

**Tests**: unit · **Gate**: full
**Commit**: `fix(store): regressões mobile da identidade nova`

---

### T34 — `store_settings`: defaults e migration

**O quê**: defaults do TypeScript e migration condicionada ao valor antigo.
**Onde**: `packages/supabase/src/types/settings.ts`, `supabase/migrations/<timestamp>_rebrand-store-settings.sql`
**Depende de**: T18 (paleta declarada) · **Reusa**: molde de `20260801170000_rebrand_store_settings_nanita.sql`
**Requisito**: `COP-01`, `COP-02`

**Tools** — Skill: `supabase` · CLI: `supabase db reset` / `psql` (MCP do Supabase não autorizado nesta sessão)

**Done when**:
- [ ] `store_name`, `email` e título de SEO da Uma Estrelinha nos defaults **e** no banco
- [ ] Cada `UPDATE` condicionado ao valor antigo: idempotente e não sobrescreve edição da admin
- [ ] Prefixo de timestamp maior que todos os existentes
- [ ] **Probe contra o banco local prova a gravação** (`AD-012`)
- [ ] Rodar a migration duas vezes não muda nada na segunda

**Tests**: unit (defaults) + probe (migration) · **Gate**: db + full
**Commit**: `feat(db): store_settings da Uma Estrelinha`

---

### T35 — `index.html` dos dois apps

**O quê**: title, description, autor, OG/Twitter, `theme-color` e a `og:image` apontando para ativo
do projeto.
**Onde**: `apps/store/index.html`, `apps/backoffice/index.html`
**Depende de**: T34 · **Reusa**: — · **Requisito**: `COP-03`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Nenhuma menção à marca anterior
- [ ] `og:image` é ativo do projeto, nunca o CDN herdado do template
- [ ] `theme-color` é um token da paleta nova
- [ ] Backoffice segue `noindex, nofollow`
- [ ] Teste lê os dois `index.html` do disco e confere

**Tests**: unit · **Gate**: quick
**Commit**: `feat: metadados dos dois apps na identidade Uma Estrelinha`

---

### T36 — Templates de auth e `config.toml`

**O quê**: os três templates (`magic_link`, `confirmation`, `recovery`) na identidade nova, e os
assuntos no `config.toml`. **A troca de remetente fica documentada e pendente** até o domínio ser
verificado no Resend.
**Onde**: `supabase/templates/*.html`, `supabase/config.toml`
**Depende de**: T35 · **Reusa**: estrutura dos templates atuais · **Requisito**: `COP-04`, `COP-05`

**Tools** — Skill: `supabase` · CLI: `supabase db reset` / `psql` (MCP do Supabase não autorizado nesta sessão)

**Done when**:
- [ ] Tudo inline, layout em `<table>`, **sem webfont** — a pilha de fallback é a decisão de design
- [ ] Os três usam `{{ .Token }}` (código de 6 dígitos), nunca link
- [ ] `magic_link` **e** `confirmation` configurados — `signInWithOtp({shouldCreateUser:true})` dispara um para e-mail novo e outro para existente
- [ ] Remetente: se o domínio ainda não estiver verificado, o valor **não muda** e a pendência fica registrada com o passo exato de troca
- [ ] `supabase stop && supabase start` (mudança em `config.toml` exige; `db reset` não recarrega auth)
- [ ] Login por código funciona de ponta a ponta e o e-mail chega

**Tests**: none (HTML/config) + prova manual · **Gate**: db + build
**Commit**: `feat(auth): templates e assuntos na identidade Uma Estrelinha`

---

### T37 — E-mail transacional

**O quê**: `layout.ts` e os templates da edge function `send-email` na paleta e no tom novos;
`RESEND_FROM` documentado como distinto do remetente do auth.
**Onde**: `supabase/functions/send-email/{layout.ts,templates.ts}`, `.env.example`
**Depende de**: T36 · **Reusa**: os testes de `templates.test.ts` e `handlers.test.ts`
**Requisito**: `COP-06`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Paleta do e-mail = paleta da loja, com o contraste medido (glacê e acento **nunca** texto sobre claro)
- [ ] Rodapé e wordmark da Uma Estrelinha
- [ ] `RESEND_FROM` em RFC 5322 e **distinto** do `admin_email` do auth — confundir os dois é a causa raiz do `BUG-20260728`
- [ ] `pnpm --filter @estrelinha/functions test` passa; contagem não encolhe
- [ ] Teste de identidade dos templates atualizado, não removido

**Tests**: unit · **Gate**: full
**Commit**: `feat(email): identidade Uma Estrelinha nos transacionais`

---

### T38 — Copy institucional e pontos de contato

**O quê**: `AboutPage` (Adri Muniz, Porto Alegre, tom sensível), `PoliciesPage`, 404, estados vazios,
`WhatsAppFloat`, `MenuBarPreview` do admin e o `User-Agent` da `melhor-envio`.
**Onde**: `apps/store/src/pages/{AboutPage,PoliciesPage,NotFound}.tsx`,
`apps/store/src/widgets/whatsapp-float/**`, `apps/backoffice/src/features/store-menu/ui/MenuBarPreview.tsx`,
`supabase/functions/melhor-envio/index.ts`
**Depende de**: T37 · **Reusa**: `useGeneralSettings` · **Requisito**: `COP-07`, `COP-08`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Nenhuma persona da loja anterior sobrevive — inclusive no 404 e nos estados vazios
- [ ] WhatsApp lê `store_name` de `store_settings`, com fallback `Uma Estrelinha`
- [ ] `User-Agent` da `melhor-envio` identifica a Uma Estrelinha (a API exige)
- [ ] A `brandScan.test.ts` (T23) passa — **este é o fecho da varredura**
- [ ] `pnpm test` passa; contagem não encolhe

**Tests**: unit · **Gate**: full
**Commit**: `feat: copy institucional e pontos de contato da Uma Estrelinha`

---

### T39 — Arquivar o histórico da Nanita

**O quê**: mover `.specs/features/01-19`, `docs/qa/` e `.lovable/` para `.specs/archive/nanita/`,
preservando as decisões `AD-001`..`AD-015` no `STATE.md`.
**Onde**: `.specs/archive/nanita/`, `.specs/features/`, `docs/`
**Depende de**: T38 · **Reusa**: — · **Requisito**: `DOC-03`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] As 19 specs, os bugs de QA e o `.lovable` estão sob `.specs/archive/nanita/`
- [ ] `AD-001`..`AD-016` permanecem no `STATE.md`
- [ ] `README.md` do arquivo explica o que é aquilo e por que foi preservado
- [ ] A allowlist da `brandScan.test.ts` cobre o diretório arquivado, com justificativa

**Tests**: unit (a varredura confirma a allowlist) · **Gate**: quick
**Commit**: `docs: arquiva o histórico de specs e QA da Nanita`

---

### T40 — `CLAUDE.md` reescrito

**O quê**: instruções do projeto descrevendo a Uma Estrelinha — e a regra que proibia renomear
`nanapin` substituída pelo registro de **por que** ela deixou de valer.
**Onde**: `CLAUDE.md`
**Depende de**: T39 · **Reusa**: estrutura do `CLAUDE.md` atual · **Requisito**: `DOC-01`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Stack, comandos, portas, FSD e convenções refletem o repositório real
- [ ] O escopo `@estrelinha/*` e os tokens `--estrelinha-*` documentados
- [ ] A revogação da regra de `nanapin` explicada, apontando para `AD-016`
- [ ] As features `21` e `22` citadas como o que vem a seguir
- [ ] Nenhuma instrução contradiz o estado do repositório

**Tests**: none · **Gate**: none
**Commit**: `docs: instruções do projeto passam a descrever a Uma Estrelinha`

---

### T41 — `DESIGN.md` e baselines remedidas

**O quê**: `DESIGN.md` com a paleta medida, o papel de cada token e as proibições que os testes
travam; e as baselines finais de lint, tipo e teste registradas no `CLAUDE.md`.
**Onde**: `DESIGN.md`, `CLAUDE.md`
**Depende de**: T40 · **Reusa**: as medições das tasks T17/T18/T21 · **Requisito**: `DOC-02`, `DOC-04`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] Cada token com valor, papel e **razão de contraste medida**
- [ ] As três proibições documentadas: `accent` nunca texto sobre claro; `line` nunca borda de campo; `accent` só é texto sobre `ink`
- [ ] Baselines finais medidas e registradas (lint, `tsc`, contagem de testes por workspace)
- [ ] `Handoff` do `STATE.md` atualizado com o fecho da feature

**Tests**: none · **Gate**: build
**Commit**: `docs: DESIGN.md da Uma Estrelinha e baselines remedidas`

---

## Phase Execution Map

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 7
                                         ↘ Fase 6 ↗

Fase 0:  T1 → T2 → T3 → T4 → T5
Fase 1:  T6 → T7 → T8 → T9
Fase 2:  T10 → T11 → T12 → T13 → T14 → T15 → T16
Fase 3:  T17 → T18 → T19 → T20 → T21 → T22 → T23
Fase 4:  T24 → T25 → T26 → T27 → T28
Fase 5:  T29 → T30 → T31 → T32 → T33
Fase 6:  T34 → T35 → T36 → T37 → T38
Fase 7:  T39 → T40 → T41
```

Execução é estritamente sequencial — não há paralelismo dentro de fase. A Fase 6 depende só de T18
(paleta declarada), mas é executada após a Fase 5 para manter a linearidade dos lotes.

**Empacotamento previsto** (~7 tasks por lote, fases inteiras):

| Lote | Fases | Tasks |
| --- | --- | --- |
| 1 | 0 + 1 | T1–T9 (9) |
| 2 | 2 | T10–T16 (7) |
| 3 | 3 | T17–T23 (7) |
| 4 | 4 + 5 | T24–T33 (10) |
| 5 | 6 + 7 | T34–T41 (8) |

**5 lotes · 41 tasks.** Depois do último commit, um **Verifier** independente roda automaticamente
(autor ≠ verificador), com checagem ancorada na spec e sensor de discriminação, e escreve
`validation.md`.

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1–T5 | 1 arquivo/config cada | ✅ Granular |
| T6, T7 | manifests / configs coesos (5 e 5 arquivos, uma preocupação só) | ⚠️ OK — coeso |
| T8 | rename mecânico de 1 símbolo em N arquivos, oráculo `tsc` | ⚠️ OK — uma preocupação, juiz automático |
| T9 | 1 conceito (identidade técnica), 4 arquivos | ⚠️ OK — coeso |
| T10–T13 | 1 remoção por camada + 1 migration | ✅ Granular |
| T14–T16 | 1 módulo / 1 slice / 1 arquivo | ✅ Granular |
| T17, T18 | 1 declaração + 1 teste | ✅ Granular |
| T19, T20 | remap mecânico, **partido por diretório** para caber no lote | ✅ Granular |
| T21–T23 | 1 token + 1 varredura cada | ✅ Granular |
| T24–T28 | 1 ativo / 1 script / 1 componente cada | ✅ Granular |
| T29–T33 | 1 widget ou 1 grupo de telas cada | ✅ Granular |
| T34–T38 | 1 superfície de comunicação cada | ✅ Granular |
| T39–T41 | 1 documento cada | ✅ Granular |

Nenhuma task ❌. As marcadas ⚠️ são renames mecânicos de **uma única preocupação** com oráculo
automático — partir por arquivo produziria commits que não compilam isoladamente, o que é pior.

---

## Diagram-Definition Cross-Check

| Task | `Depende de` (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | nenhuma | (início) | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 (Fase 0 → Fase 1) | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → T10 (Fase 1 → Fase 2) | ✅ |
| T11–T16 | T10..T15 encadeadas | cadeia da Fase 2 | ✅ |
| T17 | T16 | T16 → T17 (Fase 2 → Fase 3) | ✅ |
| T18–T23 | T17..T22 encadeadas | cadeia da Fase 3 | ✅ |
| T24 | T23 | T23 → T24 (Fase 3 → Fase 4) | ✅ |
| T25–T28 | T24..T27 encadeadas | cadeia da Fase 4 | ✅ |
| T29 | T28 | T28 → T29 (Fase 4 → Fase 5) | ✅ |
| T30–T33 | T29..T32 encadeadas | cadeia da Fase 5 | ✅ |
| T34 | **T18** | T18 → T34 (aresta declarada no mapa) | ✅ |
| T35–T38 | T34..T37 encadeadas | cadeia da Fase 6 | ✅ |
| T39 | T38 | T38 → T39 (Fase 6 → Fase 7) | ✅ |
| T40, T41 | T39, T40 | cadeia da Fase 7 | ✅ |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Task declara | Status |
| --- | --- | --- | --- | --- |
| T1, T2, T4, T5 | Config | none | none | ✅ |
| T3 | Config + Supabase | none + db | none / db | ✅ |
| T6, T7 | Config (manifests, aliases) | none | none | ✅ |
| T8 | Config + imports; oráculo `tsc` + suíte existente | none | none | ✅ |
| T9 | UI do backoffice + SQL | unit + probe | unit | ✅ |
| T10 | UI do backoffice | unit | unit | ✅ |
| T11 | `packages/core` | unit | unit | ✅ |
| T12 | UI da loja | unit | unit | ✅ |
| T13 | Migration | none + probe | none + probe | ✅ |
| T14 | Domínio/lib da loja | unit | unit | ✅ |
| T15 | UI da loja | unit | unit | ✅ |
| T16 | Migration/seed | none + probe | none + probe | ✅ |
| T17, T18 | Guarda de identidade | unit c/ âncora | unit | ✅ |
| T19, T20 | UI da loja | unit | unit | ✅ |
| T21 | Guarda de identidade | unit c/ âncora | unit | ✅ |
| T22 | `packages/ui` + UI do backoffice | unit | unit | ✅ |
| T23 | Guarda de identidade | unit c/ âncora | unit | ✅ |
| T24 | Ativo (SVG) | none | none | ✅ |
| T25, T26, T27 | UI da loja / guarda | unit | unit | ✅ |
| T28 | Config + asserção sobre o HTML | unit | unit | ✅ |
| T29–T33 | UI da loja | unit | unit | ✅ |
| T34 | `packages/supabase` + migration | unit + probe | unit + probe | ✅ |
| T35 | Config + asserção sobre o HTML | unit | unit | ✅ |
| T36 | Templates + config | none + prova manual | none + prova | ✅ |
| T37 | Handlers de edge function | unit | unit | ✅ |
| T38 | UI da loja + backoffice + edge | unit | unit | ✅ |
| T39 | Arquivo + allowlist da varredura | unit | unit | ✅ |
| T40, T41 | Documentação | none | none | ✅ |

Nenhuma ❌ VIOLATION. Nenhum `Tests: none` justificado por "testado em outra task".

---

## Registro de execução

> Preenchido durante o Execute: divergências deliberadas das boards, decisões tomadas no meio do
> caminho, e contagens de teste por task.
