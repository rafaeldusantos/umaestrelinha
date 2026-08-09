# BUG-20260801 — `seed.sql` usa TEMP TABLE e quebra o `supabase db reset`

- **Descoberto em**: 2026-08-01, no pre-flight do gate SQL da feature `07-product-catalog-admin`
- **Severidade**: média — não afeta produção; **quebra o gate de verificação de toda migration**
- **Status**: aberto · **workaround em uso**: sim
- **Condição**: pré-existente. Não é regressão de nenhuma feature em curso.

## O que acontece

`pnpm supabase db reset` aplica **todas** as migrations com sucesso e morre no passo de seed:

```
Applying migration 20260730120000_order_emails.sql...
Seeding data from supabase/seed.sql...
failed to send batch: ERROR: relation "_pal" does not exist (SQLSTATE 42P01)
{"_tag":"Error","error":{"code":"LegacyGoChildExitError","message":"failed to bootstrap the local database: exit 1"}}
```

O banco fica **com schema e sem dados** — estado que passa despercebido se ninguém olhar a saída, porque
as migrations aparecem todas como aplicadas.

## Causa raiz

`supabase/seed.sql` monta uma paleta de categorias em objetos **de sessão**:

- linha 59 — `CREATE TEMP TABLE _pal (...)`, referenciada depois nas linhas 76 e 142
- linha ~40 — a função `pg_temp.nana_marker(...)`, usada nas linhas 75, 93, 95, 96

O CLI do Supabase envia o arquivo de seed em **lotes** (`failed to send **batch**`). Objetos `TEMP` e
`pg_temp` vivem só enquanto a sessão que os criou existir — entre lotes eles somem, e a primeira
referência posterior estoura.

Não é bug do `_pal` em si: é a combinação *objeto de sessão* × *envio em lotes*.

## Prova

Mesmo arquivo, **sessão única**, roda limpo:

```bash
pnpm supabase db reset --no-seed
docker exec -i supabase_db_nanapin-store psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < supabase/seed.sql
# exit 0 — só um NOTICE inofensivo do DROP TABLE IF EXISTS inicial
```

Resultado conferido: `categories = 8` · `products = 32` · `product_variants = 10`.

## Workaround em uso

Os dois comandos acima, adotados como o gate `sql` da feature `07`
(ver [`07-product-catalog-admin/tasks.md`](../../../.specs/features/07-product-catalog-admin/tasks.md),
seção *Gate Check Commands*).

## Conserto sugerido (não feito — fora do escopo da 07)

Trocar os objetos de sessão por objetos que sobrevivem ao lote. O caminho mais barato:

1. `_pal` vira **CTE** nos dois `INSERT` que a consomem, ou uma tabela real criada e dropada no fim do
   próprio arquivo.
2. `pg_temp.nana_marker` vira função no schema `public` criada no início do seed e dropada no fim
   (ou uma expressão inline, já que só monta um SVG data-URI).

Depois disso, `supabase db reset` volta a ser um comando só.

## Observação sobre versão do CLI

O CLI foi instalado como devDependency da raiz em 2026-08-01 (`supabase@2.110.0`) — antes disso não
havia binário nesta máquina. **Não foi possível determinar qual versão a equipe usava antes**, então não
dá para afirmar se o comportamento de lotes mudou entre versões ou se o seed sempre foi frágil. O que é
certo: com `2.110.0`, quebra; e a causa está no `seed.sql`, não no CLI.
