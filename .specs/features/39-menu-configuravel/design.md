# Menu configurável — Design

**Spec**: `.specs/features/39-menu-configuravel/spec.md`
**Contexto**: `.specs/features/39-menu-configuravel/context.md`
**Status**: Draft

---

## Decisões de projeto que este design obedece

Lidas em `.specs/STATE.md` antes de qualquer escolha. Só as que alcançam esta feature:

| Decisão | Como este design conforma |
| --- | --- |
| `AD-012` — tipo escrito à mão é afirmação, não verificação | Toda coluna nova é **provada por probe HTTP** contra o banco local (`PATCH` com `Prefer: return=representation`) **antes** de entrar em `DbCategory`. É tarefa própria, não zelo. |
| `AD-014` — conjunto de produtos é categoria; o menu é um recorte dela | Mantido para **categorias**. O **item de link** não é conjunto de produtos: não tem página, filha nem produto, e por isso não entra em `categories`. Ver `AD-028`. |
| `AD-017` — migration aplicada é imutável | Tudo em migration nova. `menu_promo` **não é apagada**: vira legado não lido, como `shipping.origin_zip`. |
| `AD-018` — canônica de categoria em 1–2 segmentos | Nenhum href de menu é montado à mão: sai de `categoryHref` / `productPath`. |
| `AD-021` — a prova de rota servida é o `Content-Type` entregue | Não alcança esta feature (nada é servido por edge function). |
| `AD-027` — funcionalidade que liga/desliga tem booleano próprio | `menu_desktop` / `menu_mobile` são dois booleanos explícitos, não "o array vazio". |
| `AD-028` (esta feature) | É o registro do que está desenhado abaixo. |

**Lições confirmadas**: `python scripts/lessons.py list --status confirmed` devolve **vazio** (todas as 28 lições estão em `candidate`). Nada carregado como guia — o `CLAUDE.md` já codifica as que importam aqui (âncora de contagem, `strictNullChecks: false`).

---

## Arquitetura

A regra inteira é uma função pura em `@estrelinha/core/menu`, alimentada por **duas** fontes de dado
e consumida por **cinco** superfícies. Nenhuma superfície decide nada.

```mermaid
graph TD
    CAT[(categories<br/>menu_desktop · menu_mobile<br/>icon · menu_banners)] --> CORE
    SET[(store_settings.menu<br/>links[])] --> CORE
    PRD[(products<br/>destino de banner)] -.lazy.-> CORE
    CORE["@estrelinha/core/menu<br/>menuItems(input, surface)"] --> HDR[Header + MegaMenu<br/>desktop]
    CORE --> MOB[MobileMenu<br/>390]
    CORE --> ADM["/admin/menu"]
    CORE --> PRV[Prévia · iframe da loja]
    UI["@estrelinha/ui/icons<br/>MENU_ICON_COMPONENTS"] --> HDR
    UI --> MOB
    UI --> ADM
    CORE -. chaves .-> UI
```

**A escolha de arquitetura, e as duas que foram descartadas** (exigência da fase Design para escopo
Large — as três entregam o mesmo escopo):

| Abordagem | Por que não / por que sim |
| --- | --- |
| **(escolhida) Duas booleanas em `categories` + papel derivado da árvore + links em `store_settings`** | Zero tabela nova, zero coluna de papel, e o dado do menu continua morando **na própria categoria** — que é o que a `AD-014` decidiu. O custo é o comparador de ordem ter de fundir duas fontes, e ele é uma função de 6 linhas em `core`. |
| Tabela `menu_items` (uma linha por item, com `kind`, `sort_order`, `parent_item_id`) | É a **segunda árvore** que a `16` recusou: rename de categoria não chega nela, e as duas divergem no primeiro dia. Seria a única forma de ter ordem por dispositivo — que a Q1 descartou. |
| Uma coluna `menu jsonb` na categoria, com tudo dentro (`{desktop, mobile, icon, banners}`) | Menos migrations, mas torna impossível **indexar** "quem está no menu" e transforma toda leitura numa varredura de jsonb. E o `AD-027` acabou de dizer que interruptor é booleano explícito, não campo dentro de blob. |

---

## Reuso — o que já existe e será usado

| Peça | Onde | Como entra |
| --- | --- | --- |
| `ancestorsOf`, `categoryHref`, `pathLabel`, `descendantIds`, `bySortOrder` | `packages/core/src/menu/menu.ts` | Ficam como estão. `bySortOrder` vira a base do comparador que funde categorias e links |
| `categoryPath`, `productPath`, `ROUTE_SLUGS` | `@estrelinha/core/routes` | `ROUTE_SLUGS` é a régua do destino interno digitado (NAV-10) |
| `resolvePromo` | `core/menu/menu.ts` | **Evolui** para `resolveMenuBanners` (lista, por superfície, com imagem e três tipos de destino). A regra "destino inválido ⇒ não renderiza" é preservada literalmente |
| `useStoreSettings` | `@estrelinha/core/hooks` | Passa a ler a chave `menu`; nenhuma consulta nova na loja |
| `uploadImageBlob` (bucket + pasta parametrizáveis desde a `24`) | `apps/backoffice/src/features/product-form/lib/uploadProductImage.ts` | Sobe a arte do banner. **Precisa sair de `features/product-form`** para `shared/lib` — hoje seria import feature→feature |
| ~~`renditionUrl` / `renditionSrcSet`~~ | ~~`@estrelinha/core/media`~~ | **CORRIGIDO no lote 3**: esse módulo é da feature `38`, que **não está nesta branch** (saímos de `feat/37-*`). A arte do banner sai em `<img loading="lazy">`; servir no tamanho da vaga volta quando a `38` mergear |
| Ponte da prévia (`PREVIEW_PARAM`, `isPreviewWindow`, `PREVIEW_DEVICES`, `previewScale`, `previewMetrics`, `previewSrc`) | `packages/core/src/home/preview.ts` | **Reusada como está**, sem mover: `core/menu/preview.ts` importa dela e define só o canal próprio (`MENU_PREVIEW_SOURCE`). Um `?preview=1` só, dois canais de rascunho |
| `HomeLivePreview` | `apps/backoffice/.../home-composition/ui` | Molde do palco (iframe + escala + alternador). O de menu é irmão, não cópia: o que difere é o payload |
| `reorderWithinParent` | `apps/backoffice/src/features/category-list` | O arraste de categoria continua sendo o dele |
| `TAP_44` | `apps/store/src/shared/lib/touchTarget` | Toda linha nova do celular |

---

## Componentes

### 1. `@estrelinha/core/menu` — o dono da regra

- **Local**: `packages/core/src/menu/{menu.ts,icons.ts,target.ts,banners.ts,preview.ts,index.ts}`
- **Pureza**: sem React, sem Supabase, sem `window`. Extensão `.ts` explícita em todo import (o
  módulo já é alcançável por Deno e não pode deixar de ser).
- **Interfaces**:

```ts
export type MenuSurface = 'desktop' | 'mobile'

/** Uma categoria, do ponto de vista do menu. `show_in_menu` NÃO existe aqui — é coluna gerada. */
export interface MenuCategory {
  id: string; name: string; slug: string; description?: string | null
  parent_id: string | null; sort_order: number; active: boolean
  menu_desktop: boolean; menu_mobile: boolean
  icon?: string | null            // chave do catálogo; valor fora dele = sem ícone
  menu_banners?: unknown          // jsonb cru, validado por resolveMenuBanners
  product_count?: number
}

/** Um item de link, como gravado em store_settings.menu -> links[]. */
export interface MenuLink {
  id: string; label: string; href: string
  icon?: string | null
  desktop: boolean; mobile: boolean
  sort_order: number
}

export type MenuItem =
  | { kind: 'category'; id; name; href; icon: MenuIconKey | null; sortOrder: number
      slug: string; path: string; children: MenuCategory[]; hasPanel: boolean }
  | { kind: 'link'; id; name; href; icon: MenuIconKey | null; sortOrder: number
      external: boolean }

/** A ÚNICA porta. Funde as duas fontes, filtra pela superfície e ordena. Nunca trunca. */
export const menuItems = (
  input: { categories: readonly MenuCategory[]; links: readonly MenuLink[] },
  surface: MenuSurface,
): MenuItem[]

/** Colunas do painel: até 8 por coluna, na ordem recebida. */
export const menuPanelColumns = (children: readonly MenuCategory[], max?: number): MenuCategory[][]

/** Um destino, resolvido — ou null. Dono único, usado pelo link E pelo banner (NAV-31). */
export type MenuTarget =
  | { kind: 'category'; id: string } | { kind: 'product'; id: string } | { kind: 'url'; href: string }
export const resolveMenuTarget = (
  ctx: { categories: readonly MenuCategory[]; products?: readonly MenuProduct[] },
  target: unknown,
): { href: string; external: boolean; name: string | null; description: string | null } | null

/** Por que este destino não pode ser gravado — ou null. `string | null`, nunca união booleana. */
export const menuTargetRefusal = (target: unknown): string | null

export const resolveMenuBanners = (ctx, raw: unknown, surface: MenuSurface): ResolvedBanner[]
export const menuBannerRefusal = (list: readonly unknown[]): string | null   // > 2

export const MENU_ICON_KEYS: readonly MenuIconKey[]
export const MENU_ICON_LABELS: Record<MenuIconKey, string>
export const menuIconKey = (raw: unknown): MenuIconKey | null   // inválido ⇒ null (NAV-19)
```

- **A derivação do papel** (NAV-06), dentro de `menuItems`:
  `marcada(c, surface) && !(c.parent_id && marcada(pai, surface))` ⇒ entrada da barra.
  Marcada e com pai marcado ⇒ **item do painel do pai**, e some da barra.
- **O que SAI**: `MENU_SLOT_LIMIT`, `slotsUsed`, `menuSlotRefusal`, `resolvePromo`, `MenuEntry`,
  `menuEntries`. `MenuPromo` sai de `@estrelinha/supabase/types` junto (a reexportação da `33` passa
  a ser `MenuBanner`).

### 2. `@estrelinha/ui/icons` — o desenho, alcançável pelos dois apps

- **Local**: `packages/ui/src/icons/**` (mudança de casa de `apps/store/src/shared/ui/icons/**`)
- **Interfaces**: os 29 componentes atuais + `MENU_ICON_COMPONENTS: Record<MenuIconKey, IconComponent>`
- **Por quê**: o seletor do painel tem de desenhar o **mesmo glifo** que a loja, e
  `apps/backoffice` não importa `apps/store` (`previaUnica.test.ts`).
- **Migração mecânica**: 30 arquivos movidos, **15 arquivos da loja** trocam
  `@/shared/ui/icons` → `@estrelinha/ui/icons`; `icons.test.ts` e `paths.test.ts` vão junto.
  O barrel antigo **não** fica reexportando: dois caminhos para o mesmo ícone é o defeito 01.

### 3. Banco

```sql
-- categorias: a curadoria por superfície
alter table public.categories
  add column if not exists menu_desktop boolean not null default false,
  add column if not exists menu_mobile  boolean not null default false,
  add column if not exists menu_banners jsonb;

-- backfill 1: quem estava no menu entra nos dois
update public.categories set menu_desktop = true, menu_mobile = true where show_in_menu;
-- backfill 2: as filhas ativas de quem estava no menu viram itens de painel (a loja mostrava todas)
update public.categories c set menu_desktop = true, menu_mobile = true
  from public.categories p
 where c.parent_id = p.id and p.show_in_menu and c.active and not c.menu_desktop;
-- backfill 3: o card vira banner nos dois dispositivos
update public.categories
   set menu_banners = jsonb_build_object(
         'desktop', jsonb_build_array(<card convertido>),
         'mobile',  jsonb_build_array(<card convertido>))
 where menu_promo is not null and menu_banners is null;

-- show_in_menu deixa de ser escrita e passa a ser DERIVADA (o índice cai junto e volta)
alter table public.categories drop column show_in_menu;
alter table public.categories
  add column show_in_menu boolean generated always as (menu_desktop or menu_mobile) stored;
create index if not exists categories_show_in_menu_idx on public.categories (sort_order)
  where show_in_menu;

-- o ícone reusa a coluna morta `icon` (hoje com emoji do catálogo anterior)
update public.categories set icon = null where icon is not null and icon !~ '^[a-z][a-z0-9-]*$';

-- os itens de link, e a semeadura do "Sobre" (NAV-08)
insert into public.store_settings (key, value) values ('menu', jsonb_build_object('links',
  jsonb_build_array(jsonb_build_object('id','sobre','label','Sobre','href','/sobre',
    'icon', null, 'desktop', true, 'mobile', true, 'sort_order', 100))))
on conflict (key) do nothing;
```

- **`menu_promo` NÃO é apagada.** Vira legado não lido, no molde de `shipping.origin_zip`: apagá-la
  faria o painel antigo morrer com `PGRST204` na janela entre o `db push` e o deploy da Vercel, que
  rodam em paralelo. Quem impede uma tela de voltar a lê-la é o guarda.
- **`show_in_menu` gerada** é o que protege a **loja publicada** na mesma janela: o JS antigo
  continua lendo a coluna e vendo a verdade.
- **`categories.icon` reusada** em vez de coluna nova: ela existe desde a migration inicial, guarda
  emoji do catálogo anterior e **não é lida por nenhuma tela** (varredura em `apps/**`). Uma coluna
  `menu_icon` ao lado dela seria um segundo dono de "o ícone desta categoria".
- **RLS não muda**: `public read categories using (active = true)` e `admin full categories` já
  alcançam colunas novas da mesma tabela. `store_settings` idem. Nenhum `grant` para `anon`.

### 4. Loja

| Componente | Mudança |
| --- | --- |
| `entities/category/api/useMenu.ts` | Passa a receber `surface` e a fundir categorias + `settings.menu.links`. Continua **sem consulta própria** |
| `entities/category/api/useCategories.ts` | `CategoryRow` ganha `menu_desktop`, `menu_mobile`, `menu_banners`, `icon`; **perde** `emoji` (campo fantasma — ver Riscos) e `menu_promo` |
| `entities/menu/api/useMenuTargets.ts` (novo) | Resolve destinos de **produto** dos banners do painel aberto. Lazy: só monta quando o painel abre, como o `TrendingLane` fazia |
| `widgets/header/ui/Header.tsx` | A faixa de departamentos vira `overflow-x-auto` com `min-w-max` (NAV-04), **sem** item em JSX, e não renderiza quando `items.length === 0` |
| `widgets/header/ui/MegaMenu.tsx` | Item com ícone; painel = colunas (`menuPanelColumns`) + "ver tudo em X" + até 2 banners. **`TrendingLane` sai** |
| `widgets/header/ui/navItem.ts` | Ganha a vaga de ícone de largura fixa; a regra de cor não muda |
| `widgets/mobile-menu/ui/MobileMenu.tsx` | Linhas com ícone; filhas curadas; banner **dentro** do acordeão; sem "Sobre" em JSX; sem promo no rodapé |
| `widgets/home-renderer` / `app/App.tsx` | Passam a escutar o canal de menu da prévia (P2) |

### 5. Painel

| Componente | Mudança |
| --- | --- |
| `pages/admin/AdminMenuPage.tsx` | Alternador de superfície; duas colunas (editor / prévia); estado de rascunho |
| `features/store-menu/ui/MenuSlotList.tsx` | Reescrita: linhas de categoria **e** de link, chip de ícone, switch da superfície, aviso cruzado. `FIXED_ENTRIES` **apagada** |
| `features/store-menu/ui/MenuPanelEditor.tsx` (novo) | Marca/desmarca subcategorias do painel |
| `features/store-menu/ui/MenuBannerEditor.tsx` (renomeia `MenuPromoEditor`) | Dois slots, arte por dispositivo, seletor de destino |
| `features/store-menu/ui/MenuIconPicker.tsx` (novo) | Grade de `MENU_ICON_COMPONENTS` + "sem ícone" (+ busca, P3) |
| `features/store-menu/ui/MenuLinkDialog.tsx` (novo) | Rótulo, destino (com `menuTargetRefusal`), ícone |
| `features/store-menu/ui/MenuLivePreview.tsx` (novo) | Irmão do `HomeLivePreview` — iframe + escala + alternador |
| `features/store-menu/model/useMenuLinks.ts` (novo) | Lê/grava `store_settings.menu` |
| `features/store-menu/ui/MenuBarPreview.tsx` | **APAGADO** — é o segundo desenho |
| `shared/lib/uploadImage.ts` (novo) | `uploadImageBlob` sai de `features/product-form/lib` para cá; `product-form` passa a importar daqui |

---

## Modelo de dado (TypeScript)

```ts
// packages/supabase/src/types — descreve a coluna, nada mais
export interface DbCategory {
  /* … existentes … */
  menu_desktop: boolean
  menu_mobile: boolean
  /** Coluna GERADA (`menu_desktop or menu_mobile`). Legado de leitura; nenhuma tela pode lê-la. */
  show_in_menu: boolean
  /** LEGADO — o card da feature 16, não lido. Substituída por `menu_banners`. */
  menu_promo: unknown | null
  menu_banners: MenuBanners | null
  /** Chave do catálogo de ícones (`MENU_ICON_KEYS`). Emoji do catálogo anterior foi limpo. */
  icon: string | null
}

// packages/core/src/menu — o dono da FORMA (declarado aqui, reexportado por supabase/types)
export interface MenuBanner {
  target: MenuTarget
  badge?: string; title?: string; subtitle?: string
  image_desktop?: string; image_mobile?: string
}
export interface MenuBanners { desktop: MenuBanner[]; mobile: MenuBanner[] }

// packages/supabase/src/types/settings.ts
export interface MenuSettings { links: MenuLink[] }
export const DEFAULT_MENU: MenuSettings = { links: [] }   // a migration semeia o "Sobre"
```

**Uma arte por dispositivo, dentro do MESMO banner** (e não dois banners): o que muda entre 640×380 e
1:1 é o recorte da foto, não o anúncio. Dois objetos fariam a dona escrever o título duas vezes e
divergir. Falta da arte da superfície ⇒ usa a outra (NAV-34).

---

## Tratamento de erro

| Cenário | Como é tratado | O que a cliente/dona vê |
| --- | --- | --- |
| Destino de banner apagado ou inativo | `resolveMenuBanners` devolve a lista **sem ele** | O painel encolhe; nada quebra |
| Chave de ícone desconhecida | `menuIconKey` devolve `null` | Item sem ícone, sem espaço reservado |
| `menu_banners` com jsonb malformado | Validado campo a campo; o que não valida some | Painel só com a lista |
| Terceiro banner | `menuBannerRefusal` devolve motivo; a gravação não acontece | Toast com o motivo |
| Destino interno que não resolve | `menuTargetRefusal` na gravação | Toast com a lista de rotas válidas |
| Falha de leitura de categorias/links | Superfície de erro explícita com "tentar de novo" | Nunca lista vazia (é o defeito das Coleções) |
| Falha de gravação | Toast dizendo o que não salvou + refetch | Estado volta ao do banco |
| Loja sem itens na superfície | A faixa não renderiza | Header com marca, busca e ações |
| Itens não cabem na barra | Rolagem horizontal **dentro da faixa** | Nada some; `body` não rola |

---

## Riscos e preocupações (achados lendo o código desta feature)

| Preocupação | Onde | Impacto | Mitigação |
| --- | --- | --- | --- |
| **`emoji` é campo fantasma**: `CategoryRow` declara `emoji` e o mapper faz `row.emoji ?? ''`, mas nenhuma migration cria essa coluna | `apps/store/src/entities/category/api/useCategories.ts:17,47` | Terceira ocorrência do `AD-012`. Hoje é inofensivo (leitura), mas ensina que o tipo descreve o banco | Removido na tarefa que reescreve o mapper — arquivo que a feature já toca |
| **`categories.icon` guarda emoji do catálogo anterior** e não é lida por ninguém | migration inicial, `CATEGORY_SELECT` | Reusá-la sem limpar deixa a coluna com dois significados | A migration zera o que não casa `^[a-z][a-z0-9-]*$`; o resolvedor degrada para "sem ícone" |
| **URL digitada pode virar 404 depois** | `context.md` Q3 | Link quebrado no menu, sem aviso | Validação na gravação; **limitação declarada**, não dívida. Recomendado: nova varredura em QA a cada feature que mexer em rotas |
| **`uploadProductImage.ts` tem `SUPABASE_URL` com fallback hard-coded** (`BL-009`) | `apps/backoffice/src/features/product-form/lib/uploadProductImage.ts:23` | Ao mover para `shared/lib`, a dívida se torna compartilhada por mais um consumidor | A tarefa que move **fecha** o `||` (o client já lança sem env; o fallback é inalcançável) |
| **jsdom devolve 0 para toda medida de layout** | todo teste de componente | A AC do estouro da barra (NAV-04) **não é provável em jsdom** | Provada por asserção de classe (`overflow-x-auto` + `min-w-max`, sem `flex-wrap`) no guarda, e por navegador real no UAT — declarado no `validation.md` |
| **A janela entre `db push` e deploy da Vercel** | `.github/workflows` | Loja publicada lendo coluna que sumiu | `show_in_menu` gerada + `menu_promo` preservada; nenhuma coluna lida hoje é removida |
| **Queda de contagem de testes** (TrendingLane, MenuBarPreview, menuSlotRefusal) | baseline do `CLAUDE.md` | "Queda só vale se o número reaparece do outro lado" | As três são **contrapartidas declaradas** na spec; o gate anota cada uma com o motivo |
| `AdminMenuPage.test.tsx` congela `FIXED_ENTRIES` | `apps/backoffice/.../AdminMenuPage.test.tsx:195,204` | Dois casos param de fazer sentido | Substituídos por casos do guarda novo (`menuSemItemFixo`), no mesmo arquivo — não é queda |

---

## Decisões técnicas (só as não óbvias)

| Decisão | Escolha | Motivo |
| --- | --- | --- |
| Onde mora o papel do item (barra × painel) | Derivado da árvore, em `menuItems` | Coluna de papel dessincroniza no primeiro "mover categoria" |
| `show_in_menu` | Coluna **gerada**, proibida de leitura | Protege o deploy sem criar segundo dono |
| Ícone | Reusa `categories.icon`; chaves em `core`, desenhos em `ui` | Uma coluna, um catálogo, um desenho |
| Links | `store_settings.menu.links` (jsonb) | Não é categoria; tabela própria seria RLS + CRUD para 1–3 linhas |
| Ordem | Comparador único fundindo duas fontes por `(sort_order, nome)` | Cada item é dono da própria posição; o comparador é que é único |
| Arte por dispositivo | Dois campos de imagem **no mesmo banner** | O anúncio é um; o recorte é que muda |
| Validador de destino | **Um só**, servindo link e banner | Dois divergiriam, e um aceitaria o que o outro recusa |
| Ponte da prévia | `core/menu/preview.ts` importa os genéricos de `core/home/preview.ts` | Um `?preview=1`, dois canais. Mover os genéricos agora seria refatorar a `25` sem necessidade |
| Estouro da barra | Rolagem horizontal, nunca `flex-wrap` | Embrulhar **esconde** o estouro — decisão que o próprio repositório já tomou duas vezes |
| Tom do ícone | **Muda com o fundo**: `accent` na faixa `primary` (3,26:1), `accent-strong` na folha branca (3,85:1) | Medido no lote 3: `accent` sobre branco dá **2,82:1** e reprova até o piso de 3:1 de objeto gráfico. Os boards do Paper foram corrigidos junto — board e código não podem discordar |
| Selo do banner | `ink-soft`, não `accent-strong` | A 10–11px o ouro mede **3,55:1** e reprova o piso de texto (4,5:1). Board corrigido junto |
