# Menu configurável — evidência de execução

> **Isto é evidência PARCIAL, escrita durante a implementação, não um relatório de verificação.**
>
> Quem escreve este arquivo é quem está implementando a feature, e por isso ele só registra **o que
> foi medido** — comando, resposta crua e data. Ele não julga se a feature cumpre a spec, não fecha
> critério de aceite e não substitui o `validation.md` do **Verifier**, que é escrito por olhos
> frescos contra o `spec.md`.
>
> O relatório final é do Verifier. As seções abaixo são insumo dele.

---

## Probes (T7)

**Quando**: 2026-09-05 · **Onde**: Supabase local (`http://127.0.0.1:54341`), banco com o catálogo
real importado (37 categorias, 680 produtos) — **sem `db reset`**, como manda `supabase/CLAUDE.md`
para migration nova sobre banco com catálogo.

**Por que este probe existe**: `AD-012`. `DbCategory` já declarou três colunas que o banco não tinha
e **toda gravação de categoria falhou com `PGRST204`** — sem que build, `tsc` ou teste de componente
acusassem, porque o tipo mentia e os testes mockavam o client. A regra que saiu dali é que o tipo
escrito à mão é **afirmação**, e a verificação é HTTP contra o banco. **Nenhuma linha da T8 foi
escrita antes desta seção.**

`Prefer: return=representation` em todo `PATCH` não é enfeite: PostgREST responde **204 sem gravar
nada** a um update que casou zero linhas sob RLS, e um probe que só olhasse o status "provaria" uma
coluna inexistente. O passo 8 abaixo mostra exatamente essa forma de falso verde (`200` com `[]`).

### Preparação — a migration aplicada à mão, três vezes

```
$ docker cp supabase/migrations/20260905130000_39-menu-configuravel.sql \
      supabase_db_uma-estrelinha-store:/tmp/39.sql
$ docker exec supabase_db_uma-estrelinha-store \
      psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/39.sql
```

**1ª execução** (sobre o estado da feature 16 — 2 categorias com `show_in_menu`, 1 com `menu_promo`):

```
ALTER TABLE
COMMENT · COMMENT · COMMENT
DO
COMMENT · COMMENT
CREATE INDEX
UPDATE 0          <- limpeza de `icon`: o catálogo importado não tem emoji gravado
COMMENT
INSERT 0 1        <- a chave `menu` semeada
exit=0
```

**2ª e 3ª execuções** (idempotência):

```
NOTICE: column "menu_desktop" of relation "categories" already exists, skipping
NOTICE: column "menu_mobile"  of relation "categories" already exists, skipping
NOTICE: column "menu_banners" of relation "categories" already exists, skipping
DO                <- o bloco guardado não roda: `show_in_menu` já é gerada
NOTICE: relation "categories_show_in_menu_idx" already exists, skipping
UPDATE 0
INSERT 0 0        <- `on conflict (key) do nothing`
exit=0
```

Idempotência medida por **hash do estado**, não por leitura do log — antes e depois da 3ª execução:

```
$ psql -At -c "select md5(string_agg(id||':'||menu_desktop||':'||menu_mobile||':'||show_in_menu
                ||':'||coalesce(menu_banners::text,'-')||':'||coalesce(icon,'-'), '|' order by id))
                from public.categories"
     antes: 67171ec19c2acc49020b750c67508aed
    depois: 67171ec19c2acc49020b750c67508aed
$ psql -At -c "select md5(value::text) from public.store_settings where key='menu'"
     antes: 2ddd6c774c0dc135b1a8e0e79742162a
    depois: 2ddd6c774c0dc135b1a8e0e79742162a
```

Estado resultante da conversão, lido do catálogo do sistema:

```
$ psql -c "select attname, attgenerated, attnotnull from pg_attribute
            where attrelid='public.categories'::regclass and attname in (...)"
   attname    | attgenerated | attnotnull
--------------+--------------+------------
 icon         |              | f
 menu_banners |              | f
 menu_desktop |              | t
 menu_mobile  |              | t
 menu_promo   |              | f          <- PRESERVADA (legado não lido)
 show_in_menu | s            | t          <- 's' = generated always … stored

$ psql -c "select pg_get_expr(adbin, adrelid) from pg_attrdef where …"
 (menu_desktop OR menu_mobile)

$ psql -c "select indexdef from pg_indexes where indexname='categories_show_in_menu_idx'"
 CREATE INDEX categories_show_in_menu_idx ON public.categories USING btree (sort_order) WHERE show_in_menu
```

Os três backfills, medidos: **2** categorias estavam na barra da feature 16
(`personalizados`, `joias-afetivas`); depois da migration há **20** com `menu_desktop and
menu_mobile` — as 2 mais as 18 filhas ativas que o `MegaMenu` já mostrava. `joias-afetivas` é a única
com `menu_banners` preenchido, convertido do `menu_promo` que ela tinha.

### Os probes HTTP

Categoria de sonda criada e apagada ao fim (`slug = 'sonda-39-menu'`, `active = false`); o hash do
catálogo depois da limpeza é **idêntico** ao de antes do probe (`67171ec1…`), então nenhuma curadoria
real foi tocada.

**1. `POST /rest/v1/categories` — as colunas nascem com o default certo** → `HTTP 201`

```json
[{"id":"39393939-0000-4000-8000-000000000039","name":"Sonda 39","slug":"sonda-39-menu",
  "icon":null,"menu_promo":null,"menu_desktop":false,"menu_mobile":false,
  "menu_banners":null,"show_in_menu":false}]
```

**2. `PATCH` das quatro colunas novas, com `Prefer: return=representation`** → `HTTP 200`

```
$ curl -s -X PATCH "$URL/categories?id=eq.$ID" -H "apikey: $SR" -H "Authorization: Bearer $SR" \
    -H 'Content-Type: application/json' -H 'Prefer: return=representation' \
    -d '{"menu_desktop":true,"menu_mobile":false,"icon":"corrente",
         "menu_banners":{"desktop":[{"target":{"kind":"category","id":"3939…0039"},
                                     "badge":"Novo","title":"Sonda",
                                     "image_desktop":"https://exemplo.invalid/a.jpg"}],
                         "mobile":[]}}'
```

```json
[{"id":"39393939-0000-4000-8000-000000000039", …,
  "icon":"corrente",
  "menu_desktop":true, "menu_mobile":false,
  "menu_banners":{"mobile": [], "desktop": [{"badge": "Novo", "title": "Sonda",
     "target": {"id": "39393939-0000-4000-8000-000000000039", "kind": "category"},
     "image_desktop": "https://exemplo.invalid/a.jpg"}]},
  "show_in_menu":true}]
```

**Os valores voltam persistidos, não ecoados** — é `HTTP 200` com corpo, não `204`. O jsonb chega de
volta na forma exata que `menuBannerSlots` e `resolveMenuBanners` esperam (`{desktop:[], mobile:[]}`,
`target: {kind, id}`).

**3. Leitura de volta com `select` explícito das colunas novas** → `HTTP 200`

```json
[{"id":"3939…0039","menu_desktop":true,"menu_mobile":false,"show_in_menu":true,
  "icon":"corrente","menu_banners":{…},"menu_promo":null}]
```

Nomear as colunas no `select` é o que separa "a coluna existe" de "a coluna veio no `*`": o defeito
da feature 35 (`orders.customer_phone` gravado em 35/35 pedidos e ausente de toda tela) nasceu de uma
view que enumera colunas uma a uma.

**4. e 5. A derivada acompanha as duas booleanas** → `HTTP 200` nas duas

```json
{"menu_desktop":false,"menu_mobile":true,  "show_in_menu":true}     ← só o celular
{"menu_desktop":false,"menu_mobile":false, "show_in_menu":false}    ← nenhuma
```

**6. `PATCH` direto em `show_in_menu` — a RECUSA** → `HTTP 400`

```json
{"code":"428C9",
 "details":"Column \"show_in_menu\" is a generated column.",
 "hint":null,
 "message":"column \"show_in_menu\" can only be updated to DEFAULT"}
```

É o comportamento que a T6 procurava: a coluna continua **legível** pelo JS publicado da loja durante
a janela entre o `db push` e o deploy da Vercel, e deixa de ter dois donos porque **não aceita
escrita**. O custo declarado no cabeçalho da migration é a outra ponta desta mesma resposta: o
`/admin/menu` **antigo** falha ao gravar enquanto a janela durar.

**7. `store_settings.menu` lido pela chave publicável (`anon`)** → `HTTP 200`

```json
[{"key":"menu","value":{"links": [{"id": "sobre", "href": "/sobre", "icon": null,
   "label": "Sobre", "mobile": true, "desktop": true, "sort_order": 100}]}}]
```

**8. `anon` não escreve `store_settings`** → `HTTP 200` com **`[]`**

```
$ curl -s -X PATCH "$URL/store_settings?key=eq.menu" -H "apikey: $AN" … -d '{"value":{"links":[]}}'
[]
```

Corpo vazio: a RLS não casou linha nenhuma. **É este o falso verde que `AD-012` descreve** — sem
`return=representation` esta resposta seria um `204` indistinguível de sucesso. Conferido depois: a
chave `menu` continua com o "Sobre" (hash `2ddd6c77…` inalterado).

**9. Limpeza** → `HTTP 204`; `select count(*) … where slug='sonda-39-menu'` devolve **0**.

### O que este probe NÃO prova

- Que a tela grava. Ele fala com o PostgREST, não com o `AdminMenuPage` — a prova daquilo é da fase 5.
- Que a migration roda a partir do zero (`supabase db reset`). Ela foi aplicada **sobre o catálogo
  real**, de propósito, porque é o caminho que o `db push` fará em produção e porque o `seed.sql` não
  tem catálogo desde a feature 21. O caminho do reset entra no gate final da feature.
- Que o hospedado aceita. Nada foi enviado para `hgkrsfpupypxtygjgthf`.

---

## Sensores por mutação (T9, T11)

Cada guarda novo teve pelo menos uma asserção provada por **injeção de falha**: a régua é aplicada a
uma cópia mutada do texto real, dentro do próprio arquivo de teste, e o caso falha se a mutação
**passar**. Sem isso, uma asserção que sempre passa é indistinguível de uma que funciona.

### `menuSchema.test.ts` (T9) — sensores embutidos, rodam na suíte

| Asserção sensoreada | A mutação injetada | Prova |
| --- | --- | --- |
| `show_in_menu` é coluna **gerada** | trocar `generated always as (…) stored` por `not null default false` | a régua reprova a coluna comum |
| `menu_promo` **não** é apagada | acrescentar `drop column menu_promo;` ao texto | a régua acusa a remoção |
| os backfills vêm **antes** do `drop column show_in_menu` | mover o `drop` para antes do primeiro `update` | a régua acusa a inversão |
| a semeadura é `on conflict (key) do nothing` | trocar por `do update set value = excluded.value` | a régua reprova o upsert |
| nenhum `grant` alcança `anon` | acrescentar `grant update on public.categories to anon;` | a régua acusa |
| o índice parcial volta | remover o `create index … where show_in_menu` | a régua acusa a ausência |

### `menuIconCatalog.test.ts` (T11) — sensores embutidos, rodam na suíte

| Asserção sensoreada | A mutação injetada | Prova |
| --- | --- | --- |
| toda chave de `MENU_ICON_KEYS` tem componente | remover uma chave do registro copiado | a régua acusa a chave órfã |
| nenhum arquivo da loja importa `shared/ui/icons` | um caminho falso com o import antigo | a régua acusa o caminho de volta |

### `icons.test.ts` (T10) — âncoras de contagem preservadas na mudança de casa

A varredura passou a apontar para `packages/ui/src/icons`, e as âncoras que impedem "varrer zero
arquivo e passar em verde" continuam as mesmas: `TODOS.length >= 12`, `PixIcon.tsx` presente,
`comTraco === CONJUNTO.length`, `comGrupo >= 5`, `comRealce >= 5`. Sensor por caminho: apontar o
`ICONS_DIR` para o diretório **antigo** faz `readdirSync` lançar `ENOENT` — a varredura vazia não é
alcançável.

---

## Pendente para o Verifier

- **Navegador real em 390 e 1440.** Nada abaixo desta linha foi medido em navegador: jsdom devolve 0
  para toda medida de layout, e a AC do estouro da barra (`NAV-04`) é justamente medida de layout.
- **A janela de deploy.** A recusa do passo 6 protege a loja e quebra o `/admin/menu` antigo. É custo
  declarado no cabeçalho da migration, e a checagem em produção é do fecho da feature.
- **`supabase db reset` limpo**, com a migration rodando do zero.
