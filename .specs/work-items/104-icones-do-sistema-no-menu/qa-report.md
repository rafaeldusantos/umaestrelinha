# Validation · WI 104 — Ícones do sistema e cor do texto no Menu da loja

**Resultado: PASS** · rodada 1 · 2026-11-17 · branch local `feature/104` (worktree `store__feature-104`), HEAD `94a09c43` (T01 `690c93ad`, T02 `94a09c43`, base `eb6aa775`)

Fila: 2/2 tarefas `done` (01 ícones do sistema, 02 cor do texto do item), cada uma com `pd-impl-review` "serve".

## Gates do conjunto

Repositório único (monorepo `store`). Workspaces alcançados pela fila: `packages/core`, `packages/ui` (sem runner — guardado pela suíte da loja), `apps/backoffice`, `apps/store`.

| Gate | Resultado | Baseline (CLAUDE.md) | Como mediu |
| --- | --- | --- | --- |
| Testes · core | **6282/6282**, 259 arquivos, exit 0 | 5718/238 (cresceu) | `pnpm --filter @estrelinha/core test --testTimeout=20000` |
| Testes · backoffice | **5589/5589**, 312 arquivos, exit 0 | 5266/297 (cresceu) | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Testes · store | **7873/7873**, 419 arquivos, exit 0 | 7188/382 (cresceu) | `pnpm --filter @estrelinha/store test --testTimeout=20000 --pool=forks --maxWorkers=2` — ver nota 1 |
| Tipos | store 0 · backoffice 7 · core 11 · mobile-adm 0 | 0 · 7 · 11 · 0 — **igual** | `npx tsc --noEmit -p <app>/tsconfig.app.json` · `packages/core/tsconfig.json` |
| Lint | store 2 erros/2 warnings · backoffice 23/5 | 2/2 · 23/5 — **igual** | `npx eslint .` em cada app |
| Build | store ✓ (5,16 s) · backoffice ✓ (6,86 s), exit 0 | — | `pnpm --filter @estrelinha/store --filter @estrelinha/backoffice build`, com env local inline — ver nota 2 |

Notas de medição:

1. **Store, exit 1 em duas rodadas por harness, não por teste.** Com a máquina em load average 223 (outras sessões), a suíte deu 7873/7873 verdes e exit 1 por `Error: [vitest-worker]: Timeout calling "onTaskUpdate"` — o mesmo que a T01 relatou sob carga. Rodada com `--maxWorkers=4`: igual. Rodada com `--pool=forks --maxWorkers=2` (load caindo de 40 para 9): **exit 0**, 7873/7873. Nenhum teste reprovou em nenhuma das três.
2. **Build sem `.env` no worktree.** O `.env` dos apps é gitignored e não existe no worktree; sem ele o `%VITE_SUPABASE_URL%` do `apps/store/index.html` fica literal e o `vite:build-html` lança `URI malformed`. Não é do WI (`index.html` e `vite.config.ts` fora do diff). Com `VITE_SUPABASE_URL=http://127.0.0.1:54441` e uma chave publicável fictícia passadas inline (nenhum arquivo copiado), o build passa.

Guardas da identidade e do menu rodaram dentro das suítes, sem régua afrouxada: `icons`, `menuIconCatalog`, `contrast`, `accentText`, `arbitraryTextColor`, `previaUnica`, `menuDocumentoComDonoUnico`, `menuSemTeto`, `menuSemItemFixo`, `core/menu/purity`, e o novo `fundosDaCorDoRotulo` (cópia deliberada dos fundos, P-06).

## Cobertura de critérios (plan.md › Comportamentos)

| Critério | Coberto por | Situação |
| --- | --- | --- |
| C-01 ícones do sistema no seletor | `core/menu/__tests__/icons.test.ts` (os dez, ordem, catálogo de 39) · `MenuIconPicker.test.tsx` | coberto |
| C-02 estilo da casa, guardas sem afrouxar | `store shared/lib/__tests__/icons.test.ts` e `menuIconCatalog.test.ts` (verdes com os dez) | coberto |
| C-03 a loja desenha o ícone (barra, folha, prévia) | `store widgets/header/ui/__tests__/MenuIconeDoSistema.test.tsx` (`Header` e `MobileMenu` reais; a prévia é a loja no iframe) | coberto |
| C-04 dois grupos titulados, "Sem ícone" fixo, busca nos dois | `MenuIconPicker.test.tsx` | coberto |
| C-05 grava no v2 e lê igual; os já gravados não mudam | leitura: `MenuIconeDoSistema.test.tsx` (documento v2 por `parseMenuDocument` → `menuItems`) e `icons.test.ts` ("a marca continua com as 29"); gravação: probe HTTP no Supabase local `:54441` (T01: `PATCH store_settings` com `icon: 'presente'` → 200, 1 linha, relido igual pelo admin e pelo anon, valor restaurado) | coberto — ver nota 3 |
| C-06 cor livre por superfície, só item principal, seletor de cor | `MenuItemEditor.test.tsx`, `documentOps.test.ts`, `useStoreMenu.test.ts`, `structure.test.ts`, `structureMenuItems.test.ts`, `legacy.test.ts`, `MegaMenu.test.tsx`, `MobileMenu.test.tsx`; probe T02 (`labelColors` gravado e relido igual) | coberto |
| C-07 recusa abaixo de 4,5:1 com a medida; regra no core; fora de `#RRGGBB` = sem cor | `labelColor.test.ts`, `refusals.test.ts`, `preview.test.ts`, `fundosDaCorDoRotulo.test.ts`, `MenuItemEditor.test.tsx` | coberto |

3. A tarefa 01 previa a ida e volta de C-05 num arquivo novo de core (`systemIcons.test.ts`), que não foi criado; a mesma travessia está provada pela leitura real da loja (`MenuIconeDoSistema.test.tsx`), e a revisão aceitou. O probe da T02 usou a chave service role (RLS não exercida, declarada); o da T01 usou JWT de admin local e exerceu a policy `store_settings_admin_write`.

## Não provado aqui

- Fidelidade visual dos dez desenhos e o rótulo colorido em 390/1440 — só em navegador (QA real-user).
- Que os paths não vieram do lucide: só por inspeção do revisor, sem comparação com o pacote.

---

# Re-Validation · rodada 2 (depois das fix tasks da QA rodada 1)

**Resultado: PASS** · 2026-11-17 · HEAD `86452bf6` (T03 `f3571f6b` BUG-001, T04 `86452bf6` BUG-002, sobre `94a09c43`)

Fila: 4/4 tarefas `done` (01, 02, 03, 04). As fix tasks tocaram só `apps/backoffice` (`features/store-menu/ui/*`, `pages/admin/AdminMenuPage.tsx` e testes); a suíte da loja rodou também, porque guardas dela varrem `apps/**`.

| Gate | Resultado | Baseline (Validation 1) | Como mediu |
| --- | --- | --- | --- |
| Testes · backoffice | **5603/5603**, 312 arquivos, exit 0 | 5589/5589 (cresceu +14) | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` — ver nota 1 |
| Testes · store | **7873/7873**, 419 arquivos (exit 1 só por `Timeout calling "onTaskUpdate"` do worker, nota 2) | 7873/7873 | `pnpm --filter @estrelinha/store test --testTimeout=20000 --pool=forks --maxWorkers=2` |
| Testes · core | não remedido: nenhum arquivo de `packages/` mudou desde a Validation 1 | 6282/6282 | — |
| Tipos | store 0 · backoffice 7 · mobile-adm 0 · core 11 | iguais | `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` · `-p packages/core/tsconfig.json` |
| Lint | store 2/2 · backoffice 23/5 | iguais | `npx eslint .` em cada app |
| Build | store ✓ · backoffice ✓ | — | `vite build` com `VITE_SUPABASE_*` locais inline (o worktree não tem `.env`) |

1. A primeira rodada do backoffice teve 1 falha em `pages/admin/__tests__/AdminCampaignFormPage.test.tsx` ("tirar o 15% com 12 peças…", elemento não achado). O arquivo não foi tocado por nenhum commit do WI (`git diff --name-only eb6aa775..HEAD`), passou 20/20 três vezes isolado e a suíte inteira, de novo, saiu 5603/5603 com exit 0. A falha foi instabilidade sob carga (load average 24–36).
2. Mesmo modo de falha da Validation 1 (nota 1 dela): todos os testes verdes, e o exit 1 vem do RPC do worker do vitest sob carga, não de asserção. Nenhum arquivo de `apps/store` mudou desde a Validation 1, que mediu a mesma suíte com exit 0.

Bugs: BUG-001 e BUG-002 seguem `open` até o reteste da QA (rodada de confirmação).
