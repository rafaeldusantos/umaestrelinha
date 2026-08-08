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

**Baselines de referência** (herdadas; **T2 as remediu** — a coluna "medido" é a que vale):

| | herdado | **medido em T2 (2026-08-08)** |
| --- | --- | --- |
| lint | 30 err / 9 warn (backoffice 28/7 · store 2/2) | **30 err / 9 warn** (backoffice 28/7 · store 2/2) — idêntico |
| `tsc` | 0 · 0 | **0 · 0** (store · backoffice) — idêntico |
| testes da loja | 979 em 77 arquivos | **986 em 78 arquivos** |
| testes do backoffice | — | **1102 em 68 arquivos** |
| testes de `core` | — | **759 em 30 arquivos** |
| testes de `functions` | — | **251 em 4 arquivos** |
| **total do monorepo** | — | **3098 testes em 180 arquivos** |

**Divergência registrada (T2):** a loja mede 986/78, e não 979/77. Hipótese: o número herdado foi
anotado no `validation.md` da feature 19 **antes** dos últimos commits dela — os arquivos de teste
mais recentes da árvore (`Footer.test.tsx`, `brand.test.tsx`) são de 2026-08-04, o mesmo dia do
fecho. Diferença de +1 arquivo / +7 testes, toda ela **a mais**; nenhum teste desapareceu. O número
medido passa a ser a baseline vigente.

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

### Fase 3 — Paleta e rename silencioso (8 tasks)

A fase de maior risco. Errar aqui **não quebra nada** — por isso ela começa e termina construindo
os juízes que não existem naturalmente.

```
T17 → T18 → T19 → T20 → T21 → T22 → T22b → T23
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
- [x] `git status` não lista `dist/`, `.turbo/`, `.playwright-cli/` nem `.env`
- [x] Commit inicial existe e a árvore está limpa
- [x] Mensagem registra que a baseline vem da Nanita e cita `AD-016`

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
- [x] `pnpm install` completa e `node_modules/` da raiz existe
- [x] `pnpm lint`, `npx tsc --noEmit` nos dois apps e `pnpm test` rodam e os números são **anotados**
- [x] Qualquer divergência das baselines herdadas é registrada com hipótese, não ignorada

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
- [x] API 54341 · DB 54342 · shadow 54340 · pooler 54349 · Studio 54343 · Inbucket 54344 · analytics 54347 · `inspector_port` 8085
- [x] `supabase start` sobe **com `nanapin-store` e `ingressos` ativos**, sem colisão
  — verificado com `nanapin-store` **em execução** (23 contêineres convivendo). O `ingressos` estava
  **parado** na hora do teste; as faixas 54330–54339 e 54341–54349 são disjuntas por construção.
- [x] `http://127.0.0.1:54341` responde
- [x] `additional_redirect_urls` apontam para 8082/8083

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
- [x] `VITE_SUPABASE_URL` = `http://127.0.0.1:54341` nos dois apps
- [x] `pnpm dev` sobe a loja em 8082 e o backoffice em 8083
- [x] `.env.example` documenta **toda** credencial de produção pendente (`C-08`) com o passo de troca
- [x] Nenhum `.env` real entra no commit

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
- [x] Nenhuma referência a `lovable-tagger` no repositório
- [x] `pnpm dev` e `pnpm build` funcionam nos dois apps
- [x] `pnpm install` regenera o lockfile sem o pacote

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
- [x] Os cinco `name` são `@estrelinha/*`
- [x] `tsconfig.base.json` mapeia `@estrelinha/*` e nenhum `@nanapin/*`
- [x] `subpath exports` de `@estrelinha/core` e `@estrelinha/ui` preservados byte a byte

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
- [x] Os cinco configs resolvem `@estrelinha/*` e nenhum `@nanapin/*`
- [x] O `dedupe` do Vite da loja permanece intacto

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
- [x] Zero ocorrência de `@nanapin/` no repositório
- [x] `pnpm install` resolve o workspace inteiro sem erro, com lockfile **regerado** (não editado)
- [x] `npx tsc --noEmit` = 0 nos dois apps — **este é o juiz desta fase**
- [x] `pnpm test` volta à contagem medida em T2, sem teste a menos
- [x] `pnpm dev:store` e `pnpm dev:backoffice` funcionam

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
- [x] `name` da raiz é `uma-estrelinha-monorepo`
- [x] Admin de seed é `admin@umaestrelinha.dev`, e o teste de login usa o mesmo
- [x] `supabase db reset` completa e o login do admin funciona no backoffice
  — **parcial**: o `reset` aplica as 40 migrations e falha no seed pelo defeito herdado (`pg_temp` /
  tabela temporária `_pal`), que a T16 já prevê. O seed foi aplicado pelo fallback documentado no
  próprio `seed.sql` (`docker exec … psql`), e o **login foi provado por probe HTTP** contra o banco
  local (`AD-012`): token 200 para `admin@umaestrelinha.dev`, `has_role('admin', uid)` = `true`,
  e `admin@nanapin.dev` devolvendo `400 invalid_credentials`.
- [x] `pnpm test` sem teste a menos

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
- [x] Nenhum arquivo de mockup em `apps/backoffice/src`
- [x] `navItems.test.ts` passa — a ordem textual das rotas bate com `navGroups`
- [x] `/admin/mockups` responde a 404 do backoffice — sem rota declarada, cai no `path="*"`; asserido
  em `navItems.test.ts`, que lê o `App.tsx` do disco
- [x] O formulário de produto segue funcionando sem o botão do estúdio
- [x] `pnpm --filter @estrelinha/backoffice test` passa; **1055 em 65 arquivos** (era 1102/68)

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
- [x] Nenhum módulo de mockup em `packages/`
- [x] `packages/core/src/index.ts` e `media/index.ts` não exportam nada de mockup
- [x] `npx tsc --noEmit` = 0 nos dois apps
- [x] `pnpm --filter @estrelinha/core test` passa; **725 em 26 arquivos** (era 759/30)
- ⚠️ **Executada DEPOIS da T12** — ver Registro de execução

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
- [x] Os três diretórios/arquivos não existem
- [x] Nenhum link interno (header, footer, menu, mobile-nav) aponta para a rota removida
- [x] A rota antiga cai na 404 própria da loja, com teste (`app/__tests__/routes.test.ts`)
- [x] `pnpm --filter @estrelinha/store test` passa; **989 em 79 arquivos** (era 986/78)
- ⚠️ **Executada ANTES da T11** — ver Registro de execução

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(store): remove o kit de pins e a prévia de mockup`

---

### T13 — Migration de remoção de `mockup_templates` e do bucket

**O quê**: migration idempotente que apaga a tabela, os objetos do bucket e o bucket.
**Onde**: `supabase/migrations/<timestamp maior que todos>_remove-mockups.sql`
**Depende de**: T12 · **Reusa**: molde das migrations existentes · **Requisito**: `PIN-01`, `PIN-02`, `COP-02`

**Tools** — Skill: `supabase` · CLI: `supabase db reset` / `psql` (MCP do Supabase não autorizado nesta sessão)

**Done when**:
- [x] Prefixo de timestamp **maior que todos os existentes** — `20260808200541` (o topo era `20260803130200`)
- [x] `DROP ... IF EXISTS` em tudo: roda em banco que nunca teve e em banco que tinha
- [x] Nenhum objeto órfão sobra no storage após o `db reset` — objetos, bucket e as 4 policies saem
- [x] Rodar duas vezes completa sem erro (exit 0 nas duas, por `psql`)
- [x] **Probe contra o banco local prova a remoção** (`AD-012`): `to_regclass`/`to_regproc` nulos,
  buckets/objetos/policies em 0, versão registrada em `schema_migrations`

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
- [x] Nenhuma das três strings existe no fonte
- [x] Produto sem medida cadastrada mostra ficha **curta**, nunca inventada
- [x] Testes cobrem: com medida, sem medida, e sem nenhum dado (ficha vazia)
- [x] `pnpm --filter @estrelinha/store test` passa; **991 em 79 arquivos**

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
- [x] Nenhum depoimento fabricado é renderizado na loja
- [x] A página de produto continua íntegra sem o bloco (layout não colapsa)
- [x] Teste cobre a página de produto sem avaliações — ordem no documento + ausência de estrela e nota
- [x] `pnpm --filter @estrelinha/store test` passa; **994 em 79 arquivos**

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
- [x] Zero string do domínio anterior no arquivo — **exceto a lista de slugs que ele apaga** (ver Registro)
- [x] Hierarquia de categoria sobrevive ao `db reset` (`BL-003`): raiz + 6 filhas, com `parent_id` também no `DO UPDATE`
- [x] `supabase db reset` completa até o fim, sem objeto de sessão nenhum
- [x] Loja abre com produtos de joia e a home renderiza as coleções — probe REST anônimo devolve o catálogo
- [x] Rodar o seed duas vezes não duplica (contagens idênticas)

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
- [x] Os valores batem com os tokens do Paper e com `../landing-pages/src/styles/global.css`
- [x] `palette.test.ts` falha se um valor divergir entre os dois arquivos (provado invertendo um valor de propósito e revertendo)
- [x] `borderRadius` remapeado para a escala do DS: `sm 6 · md 12 · lg 20 · full 999`
- [x] **A chave `button` (14px) é REMOVIDA.** Ela existia para contornar um conflito que não existe mais: o `<Button>` do shadcn traz `rounded-md` na base, e o `tailwind-merge` **não** colapsa token custom contra t-shirt size — mas colapsa dois t-shirt sizes. Medido em 2026-08-08 neste repositório: `twMerge('rounded-md','rounded-button')` → `"rounded-md rounded-button"` (as duas), enquanto `twMerge('rounded-md','rounded-sm')` → `"rounded-sm"`. Como o CTA da Uma Estrelinha é `rounded-sm` (6px, confirmado em `../landing-pages/src/components/CtaFinal.astro`), a maquinaria toda cai
- [x] `shared/ui/Button` **permanece** — ele carrega as variantes, os tamanhos e o `min-h-11` (alvo de toque de 44px), que nada disso vem do shadcn. Mas o comentário de topo dele, que hoje justifica a existência do componente pelo conflito de raio, **precisa ser reescrito**: aquela justificativa deixou de ser verdade, e comentário que mente custa mais caro que comentário nenhum
- [x] Sombras recalibradas do rosa para o slate

- [x] Os 47 usos de `rounded-button` varridos para `rounded-sm` — consequencia direta da chave sair
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
- [x] Todo token de texto ≥ 4,5:1 sobre `ground`, `ground-deep` e `surface`
- [x] `accent` (2,66:1) e `accent-strong` (3,55:1) marcados como **proibidos como texto sobre claro**
- [x] `accent` sobre `ink` (4,78:1) declarado como o **único** uso de texto do acento
- [x] `on-primary` sobre `primary` (8,40:1) coberto
- [x] Falha nomeia token e razão medida, não só "falhou"

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
- [x] Zero classe `nanita-*` / `nana-*` nesses dois diretórios
- [x] Os testes de "nenhuma classe fora da paleta" que já existem (checkout, timeline, PIX) são **atualizados** para a paleta nova, nunca removidos
- [x] `pnpm --filter @estrelinha/store test` passa; contagem **não encolhe**

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
- [x] Zero classe `nanita-*` / `nana-*` em `apps/store/src`
- [x] Toda chave de `localStorage`/`sessionStorage` começa com `estrelinha-`, e os testes que citam as chaves são atualizados
- [x] `buttonShape.test.ts` e `importOrder.test.ts` reescritos para os nomes novos, **com a âncora de contagem preservada**
- [x] `pnpm --filter @estrelinha/store test` passa; contagem não encolhe

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
- [x] Todo `<input>`, `<select>`, `<textarea>` e controle equivalente usa `field`
- [x] A varredura falha se um controle voltar a `line` (1,25:1) ou `accent` (2,66:1)
- [x] Âncora de contagem presente (`toBeGreaterThan(50)` ou o número real medido)
- [x] Provado apontando a varredura para um caminho inexistente: ela **falha**, não passa

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
- [x] Zero `--nana-*` / `nana-` no repositório
- [x] Cada valor hex do painel é **idêntico** ao de antes (diff prova)
- [x] O backoffice renderiza exatamente igual (comparação visual antes/depois)
- [x] `NanaLogo` e `NanaMascot` removidos, e nada os importa
- [x] `pnpm test` passa; contagem não encolhe

**Tests**: unit · **Gate**: full
**Commit**: `refactor(ui): tokens do painel passam a --estrelinha-admin-*, valores intactos`

---

### T22b — Marca antiga fora das migrations legadas

> **Nasceu de [`AD-017`](../../STATE.md)**, registrada depois da aprovação do plano. Não estava no
> breakdown original: a spec dizia "zero ocorrência em `supabase/`" sem que ninguém tivesse olhado o
> que havia nas migrations. Há — e não em comentário, em **dado**.

**O quê**: as duas `*_create_store_settings.sql` passam a gravar os defaults da Uma Estrelinha, e a
`20260801170000_rebrand_store_settings_nanita.sql` é **apagada** (existia só para consertar o valor
daquelas duas).
**Onde**: `supabase/migrations/20260416000000_create_store_settings.sql`,
`supabase/migrations/20260417015945_create_store_settings.sql`,
`supabase/migrations/20260801170000_rebrand_store_settings_nanita.sql` (delete),
`supabase/migrations/20260727120100_customer_address_update_rls.sql` (só um comentário cita o
contêiner antigo)
**Depende de**: T22 · **Reusa**: — · **Requisito**: `REN-05` (habilita a AC 1 da T23)

**Tools** — Skill: `supabase` · CLI: `supabase db reset` / `psql`

**Done when**:
- [x] Zero `NanaPin` / `nanapin` / `nanita` em `supabase/migrations/**`
- [x] As duas `create_store_settings` continuam **duplicatas byte-a-byte** uma da outra — elas já eram, e divergi-las agora criaria um resultado que depende de qual das duas roda por último
- [x] `20260801170000_*` não existe mais
- [x] `supabase db reset` completa e um **probe confirma** que `store_settings.general->>'store_name'` já vale `Uma Estrelinha` **sem nenhuma migration de correção** (`AD-012`: prova de execução, não inspeção de tipo)
- [x] O comentário no topo da migration inicial registra que ela foi reescrita sob `AD-017`, e que a permissão **expira no primeiro `db push`**

- ⚠️ **Gate `db` NAO executado** — o engine do Docker Desktop respondeu 500 em toda chamada de API na sessao do lote 3. Ver Registro de execucao.
**Tests**: none (SQL) + probe · **Gate**: db + build
**Commit**: `refactor(db): marca da Uma Estrelinha nas migrations legadas (AD-017)`

---

### T23 — `brandScan.test.ts` — a varredura de marca

**O quê**: teste novo que varre `apps/`, `packages/`, `supabase/`, os `index.html` e as configs da
raiz procurando `nanapin`, `nanita` e `nana`, e falha com arquivo e linha.
**Onde**: `apps/store/src/shared/lib/__tests__/brandScan.test.ts`
**Depende de**: T22 · **Reusa**: padrão de varredura de `fieldBorder.test.ts` e `buttonShape.test.ts`
**Requisito**: `REN-05` (AC 1)

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [x] Zero ocorrência reportada
- [x] **Âncora de contagem** presente e provada: apontar para caminho inexistente faz o teste **falhar**
- [x] Allowlist mínima, com **comentário justificando cada entrada** (`.specs/archive/nanita/**` e o próprio arquivo do teste)
- [x] Provado inserindo `nanita-jam` num arquivo qualquer: o teste falha nomeando arquivo e linha

- ⚠️ **"Zero ocorrencia" nao foi atingido, por ordem de fila** — 42 arquivos das Fases 4-6 entram numa lista PENDENTE com dono e prazo. Ver Registro de execucao.
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
- [x] Os SVGs existem e abrem sem erro
- ⚠️ **Adaptado**: a marca e MONOLINE (`fill="none"`), nao preenchimento — nao ha contador para vazar e
  `fill-rule` nao tem efeito sobre path que nao preenche. O que vale aqui e **um `<path>` por PAPEL DE
  TRACO**, porque espessura e geometria. Consolidado e registrado no README e no Registro de execucao
- [x] `README.md` do diretório registra o board de origem e a data

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
- [x] `paths.ts` é gerado, nunca digitado
- [x] O teste compara caractere a caractere e tem âncora de contagem (quantos paths espera)
- [x] Alterar um caractere no SVG-fonte faz o teste falhar

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
- [x] SVG **inline**, nunca `<img src>` — o header não pode ter estado de carregamento
- [x] Cada componente tem `role="img"` e nome acessível
- [x] A escada é testada: abaixo do piso, o componente renderiza o degrau de baixo
- [x] Header e rodapé usarem marcas diferentes é o **comportamento esperado**, com teste dizendo isso
  — aqui a divergencia caiu entre **header do celular** (simbolo) e **header do desktop / rodape**
  (assinatura), porque o lockup completo nao cabe em nenhuma superficie da loja. Ver Registro
- [x] `pnpm --filter @estrelinha/store test` passa; contagem não encolhe

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
- ⚠️ **Adaptado**: a aba exibe o **simbolo reduzido**, com recorte proprio. O selo circular (`7BA-0`)
  carrega anel e 25 glifos de assinatura curva, que a 16px medem 0,23px e 0,08px. Ver Registro
- [x] `apple-touch-icon` é **sangrado** (o iOS aplica a própria máscara; arte pré-arredondada deixa sobra de canto)
- [x] A haste do símbolo tem espessura mínima legível a 16px — **1,28px nominal**, medida no raster
- [x] `brandAssets.test.ts` confere que cada arquivo referenciado no `index.html` existe no disco

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
- [x] Nenhuma fonte da identidade anterior é requisitada (rede limpa)
- [x] `display`/`heading` = Libre Baskerville; `body` = Outfit
- [x] Os pesos carregados são os que o DS declara (300–700 em Outfit; 400/700 + itálico em Libre Baskerville)
- [x] A loja renderiza sem FOUT visível de fonte faltando

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

### T34 — `store_settings`: defaults em TypeScript

> **Encolhida por [`AD-017`](../../STATE.md).** Nasceu com uma migration de rebrand condicionada ao
> valor antigo, no molde da `20260801170000`. Ela deixou de ser necessária: a **T22b** reescreveu os
> defaults direto nas migrations legadas, então um `db reset` já nasce com os valores certos e não há
> banco implantado com valor velho para corrigir. Sobrou o lado TypeScript.

**O quê**: os defaults de `store_settings` no TypeScript passam a ser os da Uma Estrelinha.
**Onde**: `packages/supabase/src/types/settings.ts`
**Depende de**: T22b (que já corrigiu o lado SQL) · **Reusa**: —
**Requisito**: `COP-01`

**Tools** — MCP: nenhum · Skill: nenhuma

**Done when**:
- [ ] `DEFAULT_GENERAL.store_name`, `.email` e `DEFAULT_SEO.title` são da Uma Estrelinha
- [ ] Os valores do TypeScript são **idênticos** aos que as migrations gravam (um teste compara os dois; divergir aqui é o mesmo defeito da paleta em dois arquivos, e não quebra nada visível)
- [ ] `whatsapp_message` no tom do negócio, sem linguagem festiva
- [ ] Probe contra o banco local confirma que `store_settings` já contém os valores certos após `db reset` — sem migration nova (`AD-012`: prova de execução, não inspeção de tipo)

**Tests**: unit · **Gate**: full + db
**Commit**: `feat: defaults de store_settings da Uma Estrelinha`

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
Fase 3:  T17 → T18 → T19 → T20 → T21 → T22 → T22b → T23
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
| 3 | 3 | T17–T23 (8) |
| 4 | 4 + 5 | T24–T33 (10) |
| 5 | 6 + 7 | T34–T41 (8) |

**5 lotes · 42 tasks** (T22b entrou depois da aprovação, por `AD-017`). Depois do último commit, um **Verifier** independente roda automaticamente
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

### T3 · `supabase db reset` falha no seed — defeito **herdado**, endereçado na T16

`supabase start` sobe e semeia; `supabase db reset` aplica todas as 40 migrations e então falha em
`Seeding data from supabase/seed.sql` com `ERROR: schema "pg_temp" does not exist (SQLSTATE 3F000)`.
A causa é o próprio `seed.sql`, que declara `pg_temp.xesc` e `pg_temp.nana_marker` (linhas 27 e 34) —
funções temporárias, ligadas à sessão, que não sobrevivem ao envio em lote da CLI.

Não tem relação com a mudança de porta (uma falha de esquema não vem de `port =`), e a T16 já a
prevê no seu "Done when": *"`supabase db reset` completa até o fim, sem depender de tabela temporária
inexistente"*. Fica registrado aqui como **estado herdado conhecido**, não como regressão da T3.

### T9 · o defeito do seed, medido

A T3 registrou a falha; a T9 a delimitou. `supabase db reset` quebra em dois pontos distintos do
`seed.sql` conforme o corte do lote da CLI — ora `schema "pg_temp" does not exist`, ora
`relation "_pal" does not exist`. Os dois são o mesmo defeito: objetos de **sessão** (as funções
`pg_temp.xesc` / `pg_temp.nana_marker` e a tabela temporária `_pal`) que não sobrevivem ao envio
fatiado.

Aplicar o mesmo arquivo por `docker exec -i supabase_db_uma-estrelinha-store psql -U postgres -d
postgres < supabase/seed.sql` — o fallback que o cabeçalho do próprio seed documenta — completa sem
erro. Isso prova que o problema é o transporte da CLI, não o SQL. A correção é da T16.

### Fase 2 - T10 a T16: a poda

**Contagem de teste, por task** (baseline de entrada: 3098 em 180 — loja 986/78 · backoffice 1102/68
· core 759/30 · functions 251/4):

| task | workspace | antes | depois | o que explica |
| --- | --- | --- | --- | --- |
| T10 | backoffice | 1102 / 68 | **1055 / 65** | −3 arquivos de teste (`applyPlan`, `renderPlan`, `MockupStudioDialog`) foram junto com o módulo. Dentro do que fica: −1 (`Gerar mockup abre o estúdio`, do botão removido) e +1 (`Mockups saiu da navegação`) |
| T12 | loja | 986 / 78 | **989 / 79** | +1 arquivo (`app/__tests__/routes.test.ts`, 3 testes). `custom-pin` e `mockup-preview` não tinham teste próprio |
| T11 | core | 759 / 30 | **725 / 26** | −4 arquivos (`composeMockup`, `mockupGeometry`, `domeShading`, `loadImage`), −34 testes, todos dos módulos removidos |
| T13 | — | — | — | SQL: sem teste, com probe |
| T14 | loja | 989 / 79 | **991 / 79** | +2 ACs novas (as três frases não saem da função; ficha vazia) |
| T15 | loja | 991 / 79 | **994 / 79** | +2 na `ProductPage` (integridade do layout, ausência de depoimento) e +1 na varredura de `routes.test.ts` |
| T16 | — | — | — | SQL: sem teste, com probe |

**Total ao fim do lote: 3025 testes em 174 arquivos** (loja 994/79 · backoffice 1055/65 · core
725/26 · functions 251/4). Os **−73** são inteiramente dos 7 arquivos de teste que saíram junto com
seus módulos; **nenhum teste de código que permanece encolheu** — os três que mudaram de asserção
(`navItems`, `MobileMenu`, `Header`) inverteram o veredito porque o requisito inverteu: o item some,
e o teste passa a provar que ele não voltou.

Lint ao fim do lote: **30 err / 8 warn** (backoffice 28/7 · store 2/1) — um warning a menos que a
baseline, de arquivo removido. `tsc` = **0 · 0**.

#### T11 e T12 foram trocadas de ordem, de propósito

`features/mockup-preview` e `CustomPinPage` (loja) importavam `useMockups` e `composeMockup` de
`@estrelinha/core`. Executar a T11 antes da T12 deixaria o `tsc` da loja em erro — violando o
terceiro "Done when" da **própria T11** ("`npx tsc --noEmit` = 0 nos dois apps"). A ordem executada
foi T10 → **T12 → T11** → T13…, cada commit compilando por conta própria; o estado final é idêntico
ao planejado. A alternativa — commitar uma árvore que não compila — não passaria no gate.

#### `ImageSource` mantém `'mockup'`: decisão registrada

A `PIN-01` enumera o que sai, e `ImageSource` (`'upload' | 'mockup' | 'import'`) não está na lista:
ela descreve a **origem gravada** em `products.images`, não uma capacidade do produto. Tirar o valor
obrigaria a reescrever o selo da galeria, o `summaryFacts` e seis testes de código que permanece —
encolhimento de cobertura sem AC que o peça. O tipo ganhou o porquê no próprio comentário, e
`normalizeImages` já cai em `'upload'` para qualquer valor fora da lista.

#### T13 · o `DELETE` em `storage.objects` é bloqueado por trigger

`storage.protect_delete()` é um trigger de statement que recusa DELETE direto nas tabelas de storage
com `42501` ("Use the Storage API instead"). O destravamento é o mecanismo previsto pela própria
função — ela lê a GUC `storage.allow_delete_query`. A migration usa `set` (e não `set local`: fora de
bloco de transação o `set local` só emite WARNING e não vale) e `reset` no fim, devolvendo o
guarda-corpo. Limite honesto, documentado no arquivo: o SQL apaga o **registro** do objeto; o blob no
backend só sai pela Storage API — irrelevante no local, e o bucket nunca foi usado no hospedado.

#### T14 · "de diâmetro" saiu junto, como quarta verdade de botton

A task nomeia três strings. O rótulo `Tamanho: 3,8 cm de diâmetro` não estava na lista, mas afirma a
**forma** do produto — só um disco tem diâmetro. Virou `Tamanho: 3,8 cm`. As asserções
correspondentes mudaram de valor esperado porque o resultado esperado mudou; nenhuma foi
enfraquecida — passaram de `toContain` para `toEqual` da lista inteira, que é mais estrito.

Consequência do mesmo passe: com ficha possivelmente vazia, `ProductDetailsAccordion` deixa de montar
a seção "Detalhes do Produto" quando não há nada a dizer (e abre "Cuidados"). O texto de "Cuidados"
ainda fala em alfinete e metal — é **copy**, escopo da T38, e por isso não foi tocado aqui.

#### T16 · o que sobrou de vocabulário antigo no seed, e por quê

O arquivo tem duas ocorrências deliberadas do domínio anterior: a **lista de slugs que ele apaga**
(`naruto-uzumaki`, `anime`, `kpop`…) e o comentário que explica a limpeza. Elas existem porque a
migration inicial `20260414121021` carrega um seed **embutido** com 6 categorias e 12 bottons, e roda
a cada `db reset`. Migration é história e não se reescreve; então o seed apaga aquelas linhas por
lista explícita — e não por exclusão ("apaga o que não está aqui"), que levaria junto o produto que
alguém cadastrou à mão para testar. Nenhuma ocorrência de `nanita` / `nanapin` / `nana` sobrou.

A seção de `drops` foi removida em vez de reescrita: a tabela existe, **nenhum código a lê** (o
`DropCountdown` calcula a data no próprio componente), e semear uma linha ali seria inventar um
"lançamento" — vocabulário que não é desta loja.

Efeito colateral esperado do fixture novo: o trigger de `base_price` recalcula o preço dos quatro
produtos com grade para o **menor preço de linha** (aço inoxidável), então `pingente-coracao-cinzas`
persiste 139,90 e não os 179,90 do `VALUES`. É a regra "a partir de" funcionando, não desvio.

### Fase 3 — T17 a T23: a paleta e o rename silencioso

**Contagem de teste, por task** (baseline de entrada: 3025 em 174 — loja 994/79 · backoffice 1055/65
· core 725/26 · functions 251/4):

| task | workspace | antes | depois | o que explica |
| --- | --- | --- | --- | --- |
| T17 | loja | 994 / 79 | **985 / 79** | `palette.test.ts` reescrito: mede a paridade dos dois arquivos, a escala de raio e as sombras (37 testes). Os −9 são as asserções de contraste que mediam a paleta papelaria — a T18 as reescreve para a paleta nova |
| T18 | loja | 985 / 79 | **1020 / 80** | +1 arquivo (`contrast.test.ts`, 35 testes): 12 pares de texto sobre claro, 6 de acento proibido, o único uso de texto do acento, o par do primário e os 6 do instrumento |
| T19 | loja | 1020 / 80 | **1020 / 80** | remap mecânico; nenhum teste novo, nenhum a menos |
| T20 | loja | 1020 / 80 | **1020 / 80** | idem |
| T21 | loja | 1020 / 80 | **1028 / 80** | +8 no `fieldBorder` reescrito: 2 âncoras, 3 cores proibidas, 3 superfícies |
| T22 | monorepo | 3053 / 175 | **3059 / 175** | rename puro; o teste da mascote inverteu, não saiu |
| T22b | — | — | — | SQL: sem teste |
| T23 | monorepo | 3059 / 175 | **3065 / 176** | +1 arquivo (`brandScan.test.ts`, 6 testes) |

**Total ao fim do lote: 3065 testes em 176 arquivos** (loja 1034/81 · backoffice 1055/65 · core
725/26 · functions 251/4). Lint **30 err / 8 warn** — idêntico à baseline de entrada. `tsc` **0 · 0**.

#### O que os quatro guardas provaram, e como

Cada guarda foi apontado para o defeito que ele existe para pegar, e observado **falhar**:

| guarda | injeção | o que a falha disse |
| --- | --- | --- |
| `palette.test.ts` | um dígito de `--estrelinha-primary` no App.css | 2 testes, nomeando o token e os dois valores |
| `palette.test.ts` (âncora) | leitura apontada para outro arquivo | "a leitura do App.css encontrou a paleta inteira" falha, e com ela 15 comparações |
| `contrast.test.ts` | valor de `accent` trocado por um tom escuro | `accent sobre ground: 6.64:1 — passou de 4.5:1, a regra "nunca texto" mudou` |
| `fieldBorder.test.ts` | um `<Input>` devolvido a `line` | `features/checkout/ui/ContactBlock.tsx:123 <Input>` |
| `fieldBorder.test.ts` (âncoras) | caminho inexistente · lista de tags vazia | ENOENT · "expected 0 to be greater than 20" |
| `brandScan.test.ts` | `// nanita-jam` num arquivo qualquer | `apps/store/src/shared/lib/storeChrome.ts:33  // nanita-jam` |
| `brandScan.test.ts` (âncoras) | `ROOT` inexistente · escopo sem `packages`/`supabase` · entrada de PENDENTE já limpa | ENOENT · "expected 0 to be greater than 10" · o arquivo nomeado |

#### T21 · a varredura anterior tinha um furo, e ele custou 16 campos

A `fieldBorder.test.ts` da feature 19 procurava só as tags HTML minúsculas (`<input>`, `<textarea>`,
`<select>`). Esta loja monta quase todo campo com o `<Input>` do shadcn — **maiúsculo**. Resultado:
os três campos de contato, quatro de endereço, o de cupom, o de pagamento, o do PIX e os seis passos
de autenticação ficaram com `border-nanita-border` (1,19:1) desde o fecho da 19, **com o teste verde
o tempo todo**. A regra existia, o token existia, o teste existia, e os três nunca se encontraram.

Duas lições entraram nos guardas novos. A primeira: uma **segunda âncora**, contando controles
encontrados e não só arquivos lidos — a de arquivos passava. A segunda: a âncora de escopo do
`brandScan` escreve os três diretórios **literalmente**, em vez de iterar a constante `ESCOPO` que
deveria guardar; medido, tirar `supabase` de `ESCOPO` fazia a asserção encolher junto e seguir verde.
Régua e objeto medido não podem ser a mesma coisa.

#### T22b · as duas `create_store_settings` NÃO eram duplicatas byte-a-byte

A task afirmava que eram, e que bastava preservá-las assim. Medição antes de mexer: **2936 vs 2845
bytes, md5 diferentes**. Divergiam em duas coisas — a primeira em CRLF e a segunda em LF, e a segunda
terminando com `;;`. O SQL era equivalente, então o resultado não dependia da ordem; o risco real era
a próxima edição "de uma só". As duas saem do lote com o mesmo md5 e com o aviso no topo.

O cabeçalho de `AD-017` foi posto nas **duas**, e não só na inicial como a task pedia: pôr em uma só
seria, ela mesma, a primeira divergência.

Além dos três campos de marca, a `description` de SEO saiu do vocabulário de botton — ela mora no
mesmo `INSERT`, e deixá-la obrigaria a T34 a reeditar estas migrations para casar TypeScript e SQL.

#### ⚠️ T22b · o gate `db` NÃO foi executado — pendência para o fecho da feature

O engine do Docker Desktop respondeu **500 em toda chamada de API** durante o lote (`docker ps`,
`docker version`, nos dois endpoints, com e sem `DOCKER_API_VERSION` fixado; a distro WSL
`docker-desktop` estava rodando). Sem Docker não há Supabase local, então `supabase db reset` e o
probe HTTP não rodaram.

Reiniciar o Docker Desktop derrubaria as **outras duas instâncias Supabase da máquina**
(`nanapin-store` e `ingressos`), com as quais a T3 trabalhou para conviver — efeito colateral que não
cabe a esta task causar sem pedido.

A mudança está verificada **estaticamente** (md5 idêntico, zero resíduo em `supabase/migrations/**`,
nada referencia a migration apagada), e a `AD-012` diz explicitamente que isso **não é prova**.
Pendência: rodar `supabase db reset` e provar por probe que `store_settings.general->>'store_name'`
já vale `Uma Estrelinha` sem migration de correção. A **T34** tem gate `db` e depende exatamente
deste fato — é o lugar natural para cobrá-lo.

#### T23 · "zero ocorrência" é impossível nesta posição da fila, e a lista PENDENTE é a resposta

A T23 pede zero ocorrência de marca em `apps/`, `packages/` e `supabase/`. Medido: **42 arquivos**
ainda citam a marca anterior, e nenhum deles é resíduo de descuido — são os componentes de marca em
SVG (Fase 4), a copy e o chrome (Fase 5) e o e-mail, o auth e os metadados (Fase 6). A própria T38 já
declarava esta varredura como "o fecho da varredura".

Duas saídas ruins foram descartadas: fazer o trabalho das Fases 4–6 aqui (o lote invadiria três fases
de outros workers) e uma allowlist sem prazo (esconderia o resíduo em `supabase/functions/` que a
varredura existe para pegar — a mesma razão pela qual a `AD-017` recusou allowlist de migrations).

A saída adotada é uma **segunda lista, `PENDENTE`, com dono e com autodestruição**: cada entrada
nomeia a task que a remove, um arquivo já limpo derruba o teste até a linha sair, e uma entrada sem
`T<n>` no motivo também derruba. Resíduo em qualquer arquivo fora das duas listas continua sendo
falha imediata, com caminho e linha.

**O que NÃO foi adiado**, por não ter task dona e por não envolver decisão de desenho: as chaves de
storage do backoffice (`nanapin.admin.product-views`, `.product-columns`, `nanapin-product-draft`) e
a do WhatsApp (`nana_wa_seen_v1`); o **descritor de fatura do cartão** (`NANITA` → `UMA ESTRELINHA`,
nos dois lados que o emitem — `packages/core/src/payment/orders.ts` e a edge function do Mercado
Pago); o domínio no preview de slug e de SEO do admin; os comentários que citavam tokens já extintos;
e ~110 fixtures de teste (`NANA10`, `cdn.nanita`, `@nanita.dev`, `Nana Pin`, `store_name: 'Nanita'`).

#### Onde o remap mecânico produziu leitura visual duvidosa

O remap entrega o token certo; ele não decide se aquele elemento **devia** ser ouro. Os 52 usos de
`glaze`/`butter` viraram `accent`, e a revisão um a um achou:

| lugar | o que era | o que ficou | veredito |
| --- | --- | --- | --- |
| `features/newsletter/NewsletterBanner` | painel inteiro em rosa Carimbo | **painel inteiro em ouro `accent`** | ⚠️ **para a T30.** É a maior superfície chapada da loja; ouro em bloco pesa diferente de rosa em bloco, e a faixa de newsletter tem board própria (`5MC-0`) |
| `features/checkout/OrderBump` (4 usos) | selo, thumb, checkbox e preço | ouro sobre `bg-estrelinha-ink` | ✅ correto — 4,78:1, o único uso de texto que o acento tem |
| `features/auth/AuthOverlay` | ícone em véu de tinta | ouro sobre superfície escura | ✅ correto |
| `entities/product` e demais preenchimentos | preenchimento e detalhe | ouro | ✅ correto — nenhum é texto sobre claro |

**Nenhum uso de `accent` como texto sobre superfície clara sobrou** — conferido por busca dirigida, e
é a regra que a `contrast.test.ts` mede. Os dois `text-estrelinha-accent` da loja estão os dois
dentro de `bg-estrelinha-ink`.

#### Decisões tomadas no caminho

- **Os tokens `nanita-*` seguiram declarados até a T20.** Assim T17, T18 e T19 renderizam uma paleta
  coerente em vez de meia loja sem cor, e cada commit é revisável isoladamente. A alternativa —
  aliasar os nomes velhos para os valores novos — criaria, por três commits, a terceira fonte de
  verdade que a `palette.test.ts` existe para impedir.
- **Os tokens HSL do shadcn eram um terceiro lugar onde a paleta vivia**, e nenhum `nanita-` aparecia
  neles. Deixados como estavam, `<Dialog>`, `<Select>` e `<Input>` seguiriam rosa dentro de uma loja
  slate. A primeira conversão, feita à mão, **errou 6 dos 8 tons** por arredondamento; a segunda saiu
  de script e foi conferida valor a valor.
- **O bloco de compatibilidade `--nana-*` do App.css foi apagado, não renomeado.** Ele existia para
  ~300 usos de classe legada que o remap zerou; o único consumo restante vinha do `@apply` de `body`
  do pacote compartilhado, e as duas linhas de `body` do App.css já o sobrescrevem.
- **`NanaLogo` e `NanaMascot` TINHAM consumidor**, ao contrário do previsto no plano: a loja os usava
  no 404 e em dois pontos da confirmação de pedido. As três chamadas saíram junto (`COP-07`), e o
  teste que asseria a mascote **inverteu** em vez de sair — passa a provar que o cabeçalho da
  confirmação fica de pé sem ela. Que a persona não POSSA voltar é a `brandScan` que garante, e no
  repositório inteiro.
- **A chave `pill` do raio ficou.** A escala do DS (`sm 6 · md 12 · lg 20 · full 999`) não tem
  pílula, mas `rounded-pill` é a forma de **rótulo** em 43 lugares, e a separação ação/rótulo/disco
  sobreviveu à troca de identidade — só o valor da ação mudou, de 14px para 6px.
- **O `<Checkbox>` do checkout ficou em `ink-soft` (6,00:1), e não em `field` (3,63:1).** A varredura
  cobra o **piso** (nunca `line`, nunca `accent`); trocar 6:1 por 3,63:1 só para uniformizar o nome
  do token reduziria contraste sem ganho para ninguém.
- **A reescrita de `buttonShape.test.ts`, prevista para a T20, aconteceu em parte na T17.** O teste
  "`button` é a ÚLTIMA chave da escala" precisava mudar no mesmo commit em que a chave saiu, senão a
  T17 fecharia com a suíte vermelha. Ele agora prova o inverso — que a chave custom **não voltou** —
  e a allowlist de rótulo seguiu intacta, com a âncora de contagem preservada.

### Fase 4 — T24 a T28: a marca, os ícones e as fontes

**Contagem de teste, por task** (baseline de entrada: 3065 em 176 — loja 1034/81 · backoffice 1055/65
· core 725/26 · functions 251/4):

| task | workspace | antes | depois | o que explica |
| --- | --- | --- | --- | --- |
| T24 | — | — | — | ativos SVG: sem teste próprio (a T25 é quem os compara com o gerado) |
| T25 | loja | 1034 / 81 | **1056 / 81** | `paths.test.ts` reescrito: 2 âncoras + 4 degraus × 5 asserções (caractere a caractere, espessura, viewBox, proporção, papel não partido) = 30 testes, contra 8 |
| T27 | loja | 1056 / 81 | **1061 / 81** | `brandAssets.test.ts` reescrito: a lista de arquivos passa a ser derivada do `index.html`, e entram as três medições de espessura a 16px |
| T26 | loja | 1061 / 81 | **1062 / 81** | `brand.test.tsx` (21) e `Footer.test.tsx` (5) reescritos para a marca nova |
| T28 | loja | 1062 / 81 | **1068 / 81** | +6 em `brandAssets`: âncora do `<link>`, pesos exatos, as quatro famílias proibidas e a origem única |

**Total ao fim do lote: 3099 testes em 176 arquivos** (loja 1068/81 · backoffice 1055/65 · core
725/26 · functions 251/4). Lint **30 err / 8 warn** (backoffice 28/7 · store 2/1) — idêntico à
baseline de entrada. `tsc` **0 · 0**.

> **`pnpm test` falhou uma vez com 5 testes do backoffice em 4 arquivos, e voltou verde sozinho.**
> `pnpm --filter @estrelinha/backoffice test` isolado deu 1055/65 nas duas vezes, e o lote não tocou
> nenhum fonte do backoffice (só `public/favicon.ico`). São flakes de RTL sob carga: o Turbo roda os
> quatro workspaces em paralelo nesta máquina. O gate final foi rodado com o código de saída
> capturado de verdade — **0**. Cuidado com `pnpm test | tail`: o código de saída que sai do pipe é o
> do `tail`, não o do teste.

#### A escada, medida — e um resultado que muda o desenho da loja

A marca da Uma Estrelinha é **monoline**: todo desenho é traço, e o traço é uma **fração fixa da
largura**. Reduzir não borra a letra — **apaga a linha**. Abaixo de ~1px o traço não ocupa um pixel
inteiro e sai como cinza de antialias, não como a cor da marca. Daí os três pisos:

| degrau | componente | traço estrutural mais fino | piso | rende no piso |
| --- | --- | --- | ---: | --- |
| 1 | `EstrelinhaLockup` | assinatura **1,5** em 900 = 0,167% | **600px** | 1,00px · caixa alta 10px |
| 2 | `EstrelinhaSignature` | marca **2,4** em 450,06 = 0,533% | **190px** | 1,01px · tipografia 1,33px |
| 3 | `EstrelinhaSymbol` | marca **2,46** em 100 = 2,46% | **48px** | 1,18px |

**O 48px não é escolha nossa** — a nota de `74N-0` diz *"Use de 48px para cima"*, e 2,46% × 48 =
**1,18px**. É o piso de legibilidade desta identidade, medido pelo board e reusado nos três degraus.

**O lockup completo não aparece em lugar nenhum da loja, e isso é resultado, não descuido.** A coluna
de marca do rodapé no board `5MC-0` tem 337px e a viewport de projeto tem 390px: nenhuma comporta
600px. O lockup é o formato de e-mail, papelaria e embalagem. O análogo da Nanita — "o lockup a 40px
de altura mede 116px de largura, 24px abaixo do próprio piso" — aqui é: **a 48px de altura o lockup
mede 176px de largura, 424px abaixo do próprio piso, com a assinatura em 0,29px.**

Onde a divergência de marcas aparece de fato é entre **header do celular** e **header do desktop /
rodapé**: 202px no desktop (a vaga que o board reserva, 202×48) rende a assinatura; 150px no celular
fica abaixo do piso e rende o símbolo — que é exatamente o que o board mobile `6AU-0` desenha
(símbolo pequeno ao lado do nome). Mesma chamada, dois desenhos, com teste dizendo isso.

O terceiro degrau chama-se `EstrelinhaSymbol`, e não `EstrelinhaSeal` como o plano sugeria: no board,
**"Selo" é o carimbo circular de embalagem** (`7BA-0`), com anel e assinatura curva. Usar esse nome
para a redução chamaria de selo o que não é.

#### T24 · `fill-rule="evenodd"` não transfere, e forçá-lo seria cargo cult

A regra estrutural herdada existia porque a marca anterior era **preenchimento**: os contadores das
letras eram buracos, e separar os subpaths pintava o miolo por cima do corpo. Esta marca é
`fill="none"` em tudo. Não há contador para vazar, e `fill-rule` não tem efeito nenhum sobre um path
que não preenche — o atributo entraria inerte, sugerindo uma regra que não está valendo.

**O que transfere é a consolidação, com outro critério: um `<path>` por PAPEL DE TRAÇO**, porque aqui
o que divide os paths é a **espessura**, que é geometria. O export do Paper vem partido (um `<path>`
por sub-elemento da camada) e foi consolidado: lockup 8→4, assinatura 7→3, símbolo 4→2, selo 6→4.
O guarda correspondente também mudou de forma: `paths.test.ts` falha se **dois `<path>` do mesmo SVG
tiverem a mesma espessura** — o sintoma de um papel partido.

A normalização também resolveu o `style="stroke: …"` que o Paper emite **por cima** do atributo
`stroke=`. Cor declarada em dois lugares no mesmo arquivo é a armadilha da paleta em dois arquivos,
na escala de um SVG.

#### T25 · `pathsLegado.ts` viveu um commit, de propósito

`paths.ts` é o nome que os três componentes antigos importavam. Gerar o novo por cima deixaria o
commit da T25 sem compilar, e um commit que não compila não passa no gate — o mesmo impasse que a
Fase 2 resolveu trocando a ordem de T11 e T12. Aqui a saída foi congelar a geometria antiga num
arquivo com nome próprio (**sem a string da marca no nome**, para não obrigar `brandAssets.test.ts` a
entrar na `PENDENTE` junto), com entrada própria na lista e dono declarado. A T26 apagou os quatro.

Prova de que o teste caractere a caractere funciona: um dígito alterado no SVG-fonte
(`M31.54` → `M31.55`) derruba a suíte nomeando os dois valores.

#### T27 · executada ANTES da T26, e o ícone não é o selo circular

**Ordem trocada:** `brandAssets.test.ts` asseria que o favicon usa *o mesmo path do lockup* — um
acoplamento entre o ícone e a geometria da marca. Apagar os componentes legados na T26 quebraria essa
asserção antes de a T27 ter reescrito o ícone, e a alternativa seria remover a asserção num commit
para devolvê-la no seguinte. A T27 só depende de `paths.ts` (T25), então rodou primeiro. Estado final
idêntico ao planejado.

**A arte do ícone é o SÍMBOLO REDUZIDO, não o selo circular** que a `IDN-07` nomeia. O selo (`7BA-0`)
carrega o anel e 25 glifos de assinatura curva: a 16px o anel mede **0,23px** e a assinatura
**0,08px** — uma mancha cinza, e a violação direta do outro "Done when" da própria T27 ("espessura
mínima legível a 16px"). O board resolve isso na prancha do favicon, medido: *"abaixo de 32px o
símbolo completo vira mancha: as pétalas e as fagulhas fecham"*, e a redução *"usa traço 8,0,
calibrado para render pelo menos 1,3px de linha a 16px"*. A tira de escala do board (64 · 48 · 32 ·
24 · 16) usa a **redução nos cinco tamanhos**. O selo fica no diretório de marca como ativo de
carimbo, etiqueta e embalagem — o uso que o board lhe dá.

**A base quase não tem canto, e a inversão em relação à marca anterior é geométrica.** Lá o desenho
era o monograma N — um glifo vertical, com os extremos nos eixos —, então a base mais reta dava a
haste mais grossa e o squircle era barato. **Aqui o extremo é a ponta da estrela, na DIAGONAL** —
exatamente onde um canto arredondado come área:

| base | maior escala que cabe | traço a 16px |
| --- | ---: | ---: |
| disco (r 50%) | 0,724 | 0,93px |
| squircle (r 28%) | 0,856 | 1,10px |
| **canto 6%** | 1,000 | **1,28px** ← a aba |
| **quadrado sangrado** | 1,000 | **1,28px** ← o `apple-touch-icon` |

Só a base quase reta entrega o 1,3px que o board pede; o squircle custaria 15% do traço. **A variável
continua sendo quem faz o recorte**: canto próprio na aba (o navegador não arredonda favicon),
sangrado no iOS (o sistema aplica a própria máscara, e arte pré-arredondada deixa sobra de canto).

**Medido no raster** (`_build-ico.mjs`, linha do meio, tinta clara sobre a placa): 16px → **1px
sólido** + antialias · 48px → 4px (**1,33px** equivalente a 16px) · 180px → 15px (**1,33px**
equivalente). O nominal geométrico é 1,28px; a 16px o grid de pixel quantiza para 1 sólido.

A placa é `primary-strong` `#283A4A` com a marca em `on-primary` `#F7F3EC` — as cores do avatar na
prancha `734-0` ("04 · AVATAR", `backgroundColor: var(--color-primary-strong)`).

#### T28 · `App.css` entrou no escopo, porque é onde as fontes se aplicam

A task lista `index.html` e `tailwind.config.ts`. Mas `h1..h6` e `.estrelinha-eyebrow` declaram
`font-family` **literal** em `App.css`: mudar só os dois arquivos listados deixaria a loja pedindo
Libre Baskerville na rede e renderizando Fredoka na tela — exatamente a classe de defeito silencioso
que a `palette.test.ts` existe para impedir, com fonte no lugar de cor.

**O peso dos títulos passou de 600 para 700.** Libre Baskerville existe em 400, 700 e itálico de 400
— não há 500 nem 600 (confirmado por `get_font_family_info`, contra o Google Fonts). Pedir 600 já
renderizava 700 pela regra de font matching do CSS, então o número não mudava nada na tela; mudava o
que a próxima pessoa acredita ao ler o arquivo. Outfit é variável (100–900), então vai como faixa
`300..700`: uma requisição, os cinco pesos do DS.

**O fallback do display é serif (Georgia), não `system-ui`.** Enquanto a webfont não chega, um título
serifado caindo em sans muda de família **e** de largura, e a página inteira se remonta quando a
fonte carrega.

Os comentários e títulos de teste que nomeavam as fontes antigas em seis outros arquivos foram
atualizados junto (nenhuma asserção mudou — todas testam classe, não nome de família). Comentário que
mente custa mais caro que comentário nenhum, e a regra já valia desde a T17.

#### A lista `PENDENTE` da `brandScan`, ao fim do lote

**42 → 25 entradas: 17 removidas.** T25 tirou `__tests__/paths.test.ts` (e pôs `pathsLegado.ts`);
T27 tirou `public/favicon.svg`; T26 tirou 14 (os três componentes, `pathsLegado`, `index.ts`,
`brand.test.tsx`, e os oito consumidores/testes que só citavam a marca no import, no `aria-label` ou
numa asserção); T28 tirou `tailwind.config.ts`.

**Uma entrada mudou de dono, não saiu:** `widgets/footer/ui/Footer.tsx` continua citando a marca
anterior nas três URLs de rede social e em duas linhas de copy. Isso é trabalho da **T30**, e o
motivo na lista passou a dizer isso.
