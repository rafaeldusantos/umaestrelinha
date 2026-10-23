# 80 — Tasks

**Entrada medida** (2026-10-22, árvore em `41ea7040`, um workspace por vez, exit fora de pipe):
backoffice **3654/207** · store **5733/312**. Tipos 0, lint do painel 23/5.

**Commits:** nenhum por task — tudo no fim, quando o usuário pedir (regra do `CLAUDE.md` e da
memória do usuário).

**Gate de cada task:** `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (e a da loja
quando a task toca guarda dela) + `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`.

| # | Task | Onde | Requisitos | Status |
| --- | --- | --- | --- | --- |
| 01 | `01-migration-e-guarda-do-schema` — as duas tabelas, RLS, e o guarda que lê a migration; probe HTTP no banco local (anon não lê; admin grava; nome único sem maiúsculas; link inválido recusado) | `supabase/migrations/…_80-fornecedor-da-peca.sql`, store `shared/lib/__tests__/fornecedorSchema.test.ts`, `probes/` | FOR-01..04 | ✅ |
| 02 | `02-entidade-fornecedor` — regra pura (recusa do link, casamento de nome, rótulo do link) e o hook de leitura | backoffice `entities/supplier/**` | FOR-07, 08, 10, 16 | ✅ |
| 03 | `03-gravacao` — estado do formulário, carga, snapshot e `persistSupplier` | `features/product-form/model/**` | FOR-11..15 | ✅ |
| 04 | `04-card-da-aba-precos` — `SupplierNameField` (sugestão), `SupplierCard`, ajuda do Custo, recusas no save | `features/product-form/ui/**`, `PricingTab`, a página | FOR-05..10, 14 | ✅ |
| 05 | `05-card-da-coluna-lateral` | a página | FOR-16 | ✅ |
| 06 | `06-listagem` — coluna, filtro no servidor, chip, visões antigas | `entities/product/api`, `features/product-list/**`, a página | FOR-17..19 | ✅ |
| 07 | `07-fornecedor-fora-da-loja` — guarda que recusa as duas tabelas em `apps/store` | store `shared/lib/__tests__/fornecedorForaDaLoja.test.ts` | FOR-03 | ✅ |
| 08 | `08-fecho` — gates completos, prova em navegador (390 e 1440), baselines e documentação | `CLAUDE.md`, `apps/backoffice/CLAUDE.md` | todos | ✅ |
