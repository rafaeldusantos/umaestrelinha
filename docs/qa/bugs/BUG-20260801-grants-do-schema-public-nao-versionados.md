# BUG-20260801 — grants do schema `public` não estão nas migrations

- **Descoberto em**: já era conhecido informalmente; **registrado** em 2026-08-01, ao verificar a RLS
  da feature `07-product-catalog-admin` (T5)
- **Severidade**: média — só ambiente local; mascara verificação de RLS e deixa a loja em 401
- **Status**: aberto · **workaround em uso**: sim (só para teste)
- **Condição**: pré-existente e **global** — não é de nenhuma tabela específica

## O que acontece

Depois de `supabase db reset`, os papéis `anon` e `authenticated` ficam **sem DML** em todo o schema
`public`:

```
categories        -> anon: REFERENCES,TRIGGER,TRUNCATE
products          -> anon: REFERENCES,TRIGGER,TRUNCATE
product_variants  -> anon: REFERENCES,TRIGGER,TRUNCATE
orders            -> anon: REFERENCES,TRIGGER,TRUNCATE
...
```

Nenhum `SELECT`, `INSERT`, `UPDATE` ou `DELETE`. Qualquer leitura como `anon` falha antes de a RLS ser
sequer avaliada:

```
ERROR: permission denied for table product_variants
HINT:  Grant the required privileges to the current role with: GRANT SELECT ON public.product_variants TO anon;
```

Efeito prático: **a loja local responde 401** depois de todo reset.

## Por que importa além do 401

Grant e RLS são camadas diferentes, e o grant vem primeiro. Com o grant faltando, **é impossível
verificar localmente se uma policy está certa** — tudo falha pelo mesmo motivo, e uma policy
acidentalmente permissiva passaria despercebida, porque o erro de permissão a esconde.

Foi exatamente o risco enfrentado na T5 da `07`: sem isolar as duas camadas, "anon não vê variação de
produto inativo" seria um falso positivo.

## Causa raiz

Num projeto Supabase hospedado, os grants em `public` vêm de `ALTER DEFAULT PRIVILEGES` configurado no
bootstrap do projeto. Esse bootstrap **não está nas migrations do repositório**, então o `db reset`
local recria o schema sem ele. Tabelas novas nascem no mesmo estado das antigas — não é regressão de
quem cria tabela.

## Workaround para verificar RLS (não corrige o 401)

Conceder o DML **dentro de uma transação** e derrubar no fim. Isola a policy do grant sem alterar o
banco:

```sql
begin;
grant select, insert on public.<tabela> to anon;
set local role anon;
-- ... asserções sobre a policy ...
reset role;
rollback;   -- o GRANT é transacional e some junto
```

Foi assim que a T5 provou as 4 policies novas.

## Conserto sugerido (não feito — é infraestrutura, não feature)

Uma migration de bootstrap que declare os grants do projeto, algo como:

```sql
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on <as tabelas que a app escreve> to authenticated;
alter default privileges in schema public grant select on tables to anon, authenticated;
```

Precisa de revisão tabela a tabela — sair concedendo `all tables` para `authenticated` é o tipo de
atalho que transforma RLS em única linha de defesa. Por isso não foi feito de passagem.

## Relacionado

- Memória do projeto: *"Supabase local grants gap — `supabase db reset` deixa a loja em 401"*
- [`BUG-20260801-seed-temp-table-quebra-db-reset.md`](./BUG-20260801-seed-temp-table-quebra-db-reset.md)
  — outro problema do mesmo `db reset`, independente deste
