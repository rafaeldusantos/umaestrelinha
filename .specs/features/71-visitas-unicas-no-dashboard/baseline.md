# 71 · Visitas únicas no Dashboard — Baseline de entrada

Medida em **2026-10-22**, com a árvore parada, **antes** de qualquer código desta feature.

- HEAD: `9270c03a` (`fix(store): balão do WhatsApp com largura própria…`), branch `master`.
- `git status --porcelain`: só `?? .specs/features/71-visitas-unicas-no-dashboard/` (spec, design,
  tasks). Nenhum arquivo de código modificado.

## Testes

Um workspace por vez, na ordem abaixo, `pnpm --filter @estrelinha/<w> test --testTimeout=20000`
(**sem** o `--`), exit code capturado fora de pipe.

| Workspace | Testes | Arquivos | Falhas | Exit | Duração |
| --- | --- | --- | --- | --- | --- |
| store | **5350** | **299** | 0 | 0 | 42 s |
| backoffice | **3511** | **199** | 0 | 0 | 39 s |
| core | **3414** | **133** | 0 | 0 | 5 s |
| functions | **890** | **19** | 0 | 0 | 2 s |
| catalog-import | **512** | **23** | 0 | 0 | 1 s |
| **Total** | **13677** | **673** | **0** | | |

> **A tabela do `CLAUDE.md` estava velha em +1 no store** (dizia 5349/299). O caso a mais veio do
> commit `9270c03a` (o balão do WhatsApp), o único que tocou teste da loja depois da última
> atualização da tabela (`eead7b2e`). **Não é desta feature.** O delta da `71` se calcula contra os
> números desta página, nunca contra a linha do `CLAUDE.md`.
>
> O `stderr` do backoffice (`Upload error: { message: 'boom' }`, releitura que falha em
> `useAdminHomeSections`/`useAdminCategories`) e o `stdout` JSON das functions são saída esperada
> de casos de falha simulada — os casos passam.

## Lint

`pnpm lint` (exit 1, esperado com a baseline não-zero). O turbo para no primeiro workspace que
falha, então a loja foi medida também sozinha (`pnpm --filter @estrelinha/store lint`).

| Workspace | Erros | Warnings |
| --- | --- | --- |
| backoffice | 24 | 5 |
| store | 2 | 2 |
| **Total** | **26** | **7** |

Bate com a tabela do `CLAUDE.md` (26/7). Lembrete: `pnpm lint` não olha `packages/` nem `supabase/`
(`BL-002`).

## Tipos

| Projeto | Erros | Exit |
| --- | --- | --- |
| `apps/store/tsconfig.app.json` | 0 | 0 |
| `apps/backoffice/tsconfig.app.json` | 0 | 0 |
| `apps/store/tsconfig.server.json` | 0 | 0 |

Qualquer erro de tipo depois desta medição é novo.

## Supabase local

- `supabase status` (sem `--all`): de pé em `127.0.0.1:54441` (API) / `54442` (Postgres).
  Containers `db`, `rest`, `auth`, `kong`, `storage`, `realtime`, `studio`, `inbucket` etc. **up**.
- **Parados**: `supabase_edge_runtime_uma-estrelinha-store` e `supabase_pooler_uma-estrelinha-store`.
  O edge runtime parado importa para esta feature (a function de registro de visita): para provar
  por execução local será preciso `supabase stop` (sem `--all`) + `supabase start`, que também
  resolve o bind-mount obsoleto de arquivo novo em `packages/core` (achado da `53`/`56`).
- **Migrations**: 63 no disco, 63 em `supabase_migrations.schema_migrations`, conjunto de versões
  **idêntico** (`diff` vazio). A mais recente nos dois é `20261020120000`
  (`20261020120000_69-categoria-inativa.sql`). A migration desta feature precisa de timestamp
  **maior** que esse e diferente de qualquer outro prefixo existente.

## Falhas pré-existentes

Nenhuma reprovação de teste e nenhum erro de tipo na entrada. Os 26 erros / 7 warnings de lint são
a baseline conhecida, não desta feature.
