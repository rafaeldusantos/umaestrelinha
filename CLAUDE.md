# CLAUDE.md — Uma Estrelinha

Loja virtual de **joias afetivas artesanais em resina**, feitas à mão por **Adri Muniz** em Porto
Alegre/RS, com material que a própria cliente envia: cinzas de cremação, leite materno, mecha de
cabelo, pelo de pet, dente de leite, coto umbilical, flores e penas. E-commerce D2C. Monorepo com
**loja pública** e **backoffice** deployáveis de forma independente, sobre um único backend Supabase.

**O registro do negócio é sensível e memorial.** Boa parte de quem abre esta loja acabou de perder
alguém. Isso não é tom de marketing — é restrição de produto: nada de linguagem festiva, nada de
emoji comemorativo, nada de trocadilho, nada de urgência fabricada ("últimas unidades", contagem
regressiva). Vocabulário de referência: `../landing-pages/src/content/categorias/uma-estrelinha.json`.

> **Este repositório foi a loja Nanita** — bottons de cultura pop —, convertido pela feature
> [`20-rebrand-uma-estrelinha`](.specs/features/20-rebrand-uma-estrelinha/spec.md) sob a decisão
> `AD-016`. A documentação da loja anterior está preservada em
> [`.specs/archive/nanita/`](.specs/archive/nanita/README.md); o **código não tem mais nada dela**, e
> um teste garante isso (`brandScan.test.ts`).

## Mapa da documentação — leia o arquivo do módulo antes de mexer nele

Este arquivo carrega o que vale em **todo** o repositório. O que é específico de um módulo mora no
`CLAUDE.md` dele, e **não está repetido aqui de propósito**: regra escrita em dois lugares é o
"defeito 01" do projeto (abaixo) aplicado à documentação — as duas cópias divergem sem nada quebrar.

| Ao mexer em | Leia primeiro | O que ele cobre |
| --- | --- | --- |
| `apps/store/**` | [`apps/store/CLAUDE.md`](apps/store/CLAUDE.md) | tokens da loja, ícones, marca, home, página do produto, carrinho, checkout, URLs, guia de material |
| `apps/backoffice/**` | [`apps/backoffice/CLAUDE.md`](apps/backoffice/CLAUDE.md) | sidebar, molde dos formulários, editores de desconto, `/admin/home` e a ponte da prévia, perguntas, Google Shopping |
| `packages/core/**` | [`packages/core/CLAUDE.md`](packages/core/CLAUDE.md) | a regra pura de cada domínio, e por que ela mora lá e não na tela |
| `packages/ui/**` | [`packages/ui/CLAUDE.md`](packages/ui/CLAUDE.md) | shadcn, preset Tailwind, tokens `--estrelinha-admin-*` |
| `supabase/**` | [`supabase/CLAUDE.md`](supabase/CLAUDE.md) | migrations, RLS, edge functions, auth, e-mail, secrets |
| `tools/catalog-import/**` | [`tools/catalog-import/CLAUDE.md`](tools/catalog-import/CLAUDE.md) | o importador da Nuvemshop |
| UI da loja (qualquer) | [`DESIGN.md`](DESIGN.md) | identidade, paleta, tipografia |

Contexto de decisão: [`.specs/STATE.md`](.specs/STATE.md) (decisões `AD-001`..`AD-020` e handoff),
[`.specs/BACKLOG.md`](.specs/BACKLOG.md) (`BL-001`..`BL-016`),
[`.specs/LESSONS.md`](.specs/LESSONS.md).

## Stack

- React 18 + TypeScript + Vite 5
- Tailwind CSS + shadcn/ui + Framer Motion
- Supabase (Auth, DB, Storage, Edge Functions) — backend externo
- Zustand (cart/wishlist/coupon/checkout) + React Query (estado servidor)
- React Router v6
- Monorepo: **pnpm workspaces + Turborepo**

## Layout do monorepo

```
apps/
  store/         @estrelinha/store       loja pública       (Vite, porta 8082)
  backoffice/    @estrelinha/backoffice  painel admin       (Vite, porta 8083)
packages/
  ui/            @estrelinha/ui          shadcn/ui + preset Tailwind + tokens (styles.css)
  supabase/      @estrelinha/supabase    client (via env) + types de domínio
  auth/          @estrelinha/auth        AuthProvider, useAuthContext, useAuth, RequireAdmin
  core/          @estrelinha/core        TODA regra que dois consumidores compartilham
tools/
  catalog-import/ @estrelinha/catalog-import  importador da Nuvemshop (Node, à mão)
supabase/        @estrelinha/functions   migrations + edge functions (backend compartilhado)
eslint.fsd.mjs   fronteiras FSD compartilhadas (eslint-plugin-boundaries)
tsconfig.base.json  base TS + paths dos @estrelinha/*
turbo.json · pnpm-workspace.yaml
```

## Comandos

Sempre na raiz (Turbo orquestra os workspaces):

```bash
pnpm install            # instala tudo (node-linker=hoisted)
pnpm dev                # sobe os dois apps
pnpm dev:store          # só a loja      (:8082)
pnpm dev:backoffice     # só o admin     (:8083)
pnpm build              # build dos dois (dist/ por app)
pnpm test               # vitest em todos
pnpm lint               # eslint em todos
pnpm --filter @estrelinha/store <script>    # rodar num workspace específico
```

**Três armadilhas de medição, e nenhuma delas grita:**

- **`pnpm build` não faz typecheck** — é `vite build` puro e o esbuild remove tipos sem checar. Build
  verde **não** prova ausência de erro de tipo. Para checar de verdade:
  `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` — note o `tsconfig.app.json`, porque o
  `tsconfig.json` de cada app é solution-style (só `references`) e compila **zero** arquivo.
- **`pnpm lint` não olha `packages/`** — nenhum pacote tem script `lint`, e `pnpm lint` é
  `turbo run lint`. `payment/pricing.ts`, o código de dinheiro do projeto, é type-checado e testado
  mas **nunca passa por ESLint** (`BL-002`).
- **`pnpm test | tail` esconde a falha** — o código de saída que sai do pipe é o do `tail`. Capture o
  de verdade.

**Supabase local roda na faixa 54341–54349**, escolhida para conviver com as outras instâncias da
máquina (54320–54329 e 54330–54339 já estavam ocupadas):

| Serviço | Porta |
| --- | --- |
| API (`VITE_SUPABASE_URL`) | **54341** |
| Postgres | 54342 · shadow 54340 · pooler 54349 |
| Studio | 54343 |
| **Mailpit** (todo e-mail de dev cai aqui) | **54344** |
| analytics · edge inspector | 54347 · 8085 |

`project_id = "uma-estrelinha-store"`. `supabase start` sobe **junto** com as outras instâncias —
nunca use `supabase stop --all`, que derruba as dos outros projetos.

## Workflow de specs (Skill `tlc-spec-driven`)

Ao planejar/implementar features, use a Skill **`tlc-spec-driven`** com estas convenções do projeto:

- **Numeração das features**: cada nova feature em `.specs/features/` nasce com prefixo sequencial de
  dois dígitos + nome em kebab-case. O número é a **ordem de criação** da spec (nunca de prioridade),
  e é imutável: features concluídas ou abandonadas mantêm o número, e a próxima continua a contagem.
  Ao criar uma nova, conferir o maior número existente e somar 1 — **incluindo o que está em
  `.specs/archive/nanita/features/`**, que vai de `01` a `19`. A contagem é uma só.
  - **A `31` está OCUPADA e não tem spec** (o guia de material, commit `fcd3942`). O número foi
    consumido pelo trabalho que está no código e documentado em `apps/store/CLAUDE.md`; pela regra de
    imutabilidade acima ele não volta. A spec ausente está registrada em *Estado conhecido*, abaixo.
  - **A `32` foi escrita RETROATIVAMENTE** (rolagem infinita da categoria): o código ficou 12 dias na
    árvore sem commit, e a spec nasceu dele, não antes dele. É a saída correta quando isso acontece —
    a `31` mostrou o que custa a alternativa —, mas **não** vira precedente para inverter a ordem.
    **A `33` (sitemap) e a `34` (painel de vendas) já existem; a próxima é a `35`.**
- **Numeração dos itens**: dentro da feature, prefixar os itens de implementação (tasks/entregas) com
  número sequencial de dois dígitos e nome descritivo em kebab-case — `01-nome-implementacao`,
  `02-nome-implementacao`, etc.
- **Commits**: **não** criar commits atômicos em pequenos pedaços durante a implementação. Aguardar
  a conclusão e gerar os commits completos da implementação de uma vez (isso sobrepõe o
  comportamento padrão de commits atômicos da Skill).
  - **`BL-012` está FECHADO, e foi por aqui** (decisão do usuário, 2026-08-15). As features `20`..`24`
    tinham praticado o contrário — um commit por task, seguindo a Skill —, e a divergência entre a
    regra escrita e a prática era pior que qualquer uma das duas. A partir da `25` vale o que está
    escrito acima. **O custo é conhecido e aceito**: perde-se a correspondência 1:1 entre commit e
    "done when", e o `git bisect` passa a apontar para um commit que contém várias tasks.
- **Ao fechar uma feature, atualize as baselines** deste arquivo (lint, tipos, testes) e o
  `CLAUDE.md` do módulo que ela mexeu. Baseline velha é pior que baseline nenhuma: ela faz o gate da
  feature seguinte comparar contra um número que já não existe.

## Feature-Sliced Design (dentro de cada app)

Camadas, do mais privilegiado ao menos: **app → pages → widgets → features → entities → shared**.
Regra de import (validada por `eslint-plugin-boundaries`, hoje em modo `warn`): uma camada só
importa de camadas **estritamente abaixo**. Cross-import na mesma camada é tolerado na transição.

- `app/` — providers, router, `App.tsx`, `RuntimeSettingsLoader`. `main.tsx` fica na raiz de `src/`.
- `pages/` — uma rota compõe widgets/features/entities.
- `widgets/` — blocos compostos (header, footer, cart-drawer, admin-layout, sales-chart…).
- `features/` — ações do usuário (checkout, apply-coupon, product-form, csv-import…).
- `entities/` — entidades de negócio (product, cart, order, category, customer…), com segmentos `ui/`, `api/`, `model/`, `lib/`.
- `shared/` — utilitários locais do app (ex.: `shared/ui/AdminTable`, `shared/ui/FormCard`).

Cada slice tem um barrel `index.ts` (public API). **Novo código deve importar do slice**
(`@/entities/product`) e não de caminhos profundos.

**Quando um widget precisa de algo que outro widget tem, a resposta é `packages/core`, não um
import lateral.** Foi assim que `MATERIAL_GUIDE_PATH` acabou em `@estrelinha/core/routes`: quem linka
para o guia é `entities`/`widgets`, e pela regra de camadas eles não podem importar de outro widget.

### Alias de import
- `@/*` → `src/*` do app atual.
- `@estrelinha/ui`, `@estrelinha/supabase`, `@estrelinha/auth`, `@estrelinha/core` → pacotes
  (consumidos como source via alias do Vite/tsconfig; sem build step por pacote).
- Componentes shadcn por subpath: `@estrelinha/ui/button`, `@estrelinha/ui/dialog`, etc.
  `cn` em `@estrelinha/ui/lib/utils`.
- **As edge functions não usam alias nenhum**: Deno resolve por caminho relativo com extensão
  explícita (`../../../packages/core/src/shopping/identity.ts`). Ver `supabase/CLAUDE.md`.
- **Um módulo de `core` só é alcançável fora do Vite quando TODO especificador relativo do grafo dele
  tem `.ts` explícito — e isso inclui `import type`.** Medido na feature `33`: `core/shopping` era
  importável por `node` e por Deno; `core/menu` **não era**, porque o barrel fazia `export * from
  './menu'`. Nada acusava, porque Vite e vitest resolvem as duas formas. Pior: o Deno resolve o grafo
  de **tipos** também, e um `import type { X } from '@estrelinha/supabase/types'` derrubava o worker
  com `Failed resolving types` **antes da primeira linha rodar**. Por isso `MenuPromo` passou a ser
  declarado em `core/menu` e **reexportado** por `@estrelinha/supabase/types`, e não o contrário: quem
  usa o tipo é a regra, e o pacote de tipos só descreve a coluna. **Ao criar módulo em `core` que uma
  edge function possa vir a consumir, escreva a extensão desde o primeiro import.**

## O "defeito 01": dois donos do mesmo dado

**É o erro que mais custou a este projeto, e o que mais features existiram para desfazer.** Vale a
pena reconhecê-lo antes de escrever qualquer linha, porque a propriedade que o torna caro é sempre a
mesma: **duas escritas da mesma regra não quebram nada**. Build, `tsc` e teste de componente passam
com as duas cópias divergindo, e quem descobre é a cliente ou o Google.

| Feature | O que tinha dois donos | Como ficou |
| --- | --- | --- |
| `16` | a regra do menu, uma cópia por tela | `@estrelinha/core/menu` |
| `24` | a **derivação** da home, uma na loja e outra no painel | `@estrelinha/core/home/derive.ts` |
| `25` | o **desenho** da home, `HomePreview.tsx` redesenhando o `home-renderer` | a prévia É a loja, num iframe |
| `27` | o preço com Pix, arredondado de dois jeitos | `@estrelinha/core/payment/pix` |
| `30` | a oferta do Google, uma no feed e outra na landing page | `@estrelinha/core/shopping` |
| `31` | o conteúdo do guia de material (`model/fichas.ts`) | `widgets/material-guide/model/guide.ts` |
| `33` | o escape de XML e a leitura completa paginada, cada um com um consumidor prestes a virar dois | `@estrelinha/core/xml` e `@estrelinha/core/paging` |

Consequências práticas, nesta ordem:

1. **Se dois consumidores leem a mesma regra, ela vai para `packages/core`** — mesmo que hoje só um
   leia, quando o segundo é previsível.
2. **Uma coluna nova que já é derivável de outra é um segundo dono.** Foi por isso que o menu não
   ganhou `menu_order` (usa a `sort_order` que já existia) e que a curadoria da home é a **presença**
   de itens, não uma flag `mode: 'auto' | 'manual'`.
3. **Cópia deliberada existe, mas vem com guarda que lê os dois do disco e compara.** A máquina de
   estado do material vive em TypeScript **e** em SQL porque só o banco impede requisição forjada e
   só o TypeScript produz motivo legível — e `materialTransitions.test.ts` lê a migration e compara
   transição a transição.

## Convenções que valem em todo o repositório

- **Mobile é o caso principal, não o responsivo.** **~90% dos acessos da loja vêm de celular.**
  Isso é premissa de projeto, não detalhe de implementação — vale para desenho, código, teste e QA:
  - **Desenhar e implementar do mobile para cima.** O layout de 390px é o alvo; desktop é a
    adaptação. Quando os dois brigam, o mobile ganha.
  - **Toda tela nova precisa de prova em viewport móvel** — não basta o teste de componente passar
    em jsdom sem viewport. **jsdom devolve 0 para toda medida de layout**, então nenhum teste de
    componente encosta em largura, scroll ou sobreposição. QA e UAT começam em 390×844 e só depois
    vão para 1440.
  - **O que quebra primeiro no mobile** e deve ser conferido sempre: texto que embrulha em duas
    linhas dentro de pílula ou badge, linha de itens/lanes que estoura a largura, CTA fixo brigando
    com a barra de navegação do sistema, alvo de toque abaixo de 44px, e scroll horizontal do body
    (nunca deve existir — conteúdo largo scrolla dentro do próprio container).
  - **Grade com item largo precisa de `minmax(0, …)` NO MOBILE, não só a partir de `md`.** Sem ele a
    coluna implícita é `auto`, cujo mínimo automático é o **min-content do item** — e `overflow-x-auto`
    dentro do item não salva ninguém, porque quem não pode encolher é a trilha. Custou **toda página
    de produto rolando na horizontal no celular** (`scrollWidth` 634 numa viewport de 390), achado só
    em navegador real na auditoria da `27`. Detalhe em `apps/store/CLAUDE.md`.
  - **Fluxos de dinheiro no mobile primeiro.** Checkout, PIX e confirmação são validados em celular
    antes de qualquer ajuste de desktop.
- **A marca é Uma Estrelinha, e o identificador técnico é `estrelinha`.** Não há mais nome herdado
  para preservar em lugar nenhum — escopo npm, tokens, `project_id`, chaves de storage e e-mails de
  fixture foram todos convertidos. `brandScan.test.ts` recusa **qualquer** ocorrência da marca
  anterior em `apps/`, `packages/`, `supabase/` ou nas configs da raiz.
  - **A regra que proibia renomear o identificador antigo foi REVOGADA** (`AD-016`), e o porquê
    importa: ela existia para proteger o `localStorage` de clientes **vivos** da loja anterior —
    renomear a chave do carrinho descarta em silêncio a sacola de quem já visitou. A Uma Estrelinha
    **não tem um navegador sequer com estado desta loja**, então o risco que a regra protegia não
    existe. **A regra volta a valer a partir do primeiro cliente real**: daí em diante, renomear
    chave de `localStorage` é descartar carrinho e wishlist de gente de verdade.
  - Chaves em uso hoje: `estrelinha-cart`, `estrelinha-wishlist`, `estrelinha-coupon`,
    `estrelinha-checkout` (**`sessionStorage`**), `estrelinha-guest-consent`, `estrelinha-guest-email`,
    `estrelinha-recent-searches`, `estrelinha-product-draft`, `estrelinha.admin.*`.
- **Sem credenciais no código.** Cada app tem `.env` (gitignored) com `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY` (ver `.env.example`); o client (`@estrelinha/supabase`) lança erro
  se faltarem. Secrets de servidor ficam no `.env` da **raiz**. Detalhe em `supabase/CLAUDE.md`.
- **`strictNullChecks` está `false`** em `tsconfig.base.json`, e nesse modo **união discriminada por
  literal booleano não estreita**: com `{ ok: true } | { ok: false; reason: string }`, ler
  `verdict.reason` no ramo do `else` é erro de compilação (TS2339). Para veredito com motivo, devolva
  `string | null` — não tem ramo para esquecer — ou discrimine por literal de **string**. É o formato
  de `menuSlotRefusal` e `reservedSlugRefusal`.
- **Tipo escrito à mão é afirmação, não verificação** (`AD-012`). `DbCategory` declarava três colunas
  que o banco não tinha, e **toda gravação de categoria falhava com `PGRST204`** — nada pegava: o
  build não checa tipo, o `tsc` achava o código certo (o tipo mentia), e os testes mockavam o client.
  Ao mexer numa tela que grava, **prove que ela grava**: probe HTTP contra o banco local, não
  inspeção de tipo. Segunda ocorrência: `DbAbandonedCart` descrevia uma tabela que não existia em
  migration nenhuma.
- **Avaliações não existem.** Não há tabela `product_reviews`, e o módulo de avaliações de
  demonstração foi **removido**: depoimento inventado sobre a morte de alguém tem peso ético
  diferente de depoimento inventado sobre um acessório. A mesma régua tirou da home o contador de
  "drop" e a prova social fabricada, e `homeSections.test.ts` **assere a ausência** — nenhum tipo de
  contagem regressiva ou de prova social entra no catálogo de blocos.

## Os guardas — o que trava o quê

A identidade tem uma propriedade ruim: **errar nela não quebra nada**. Uma classe que deixou de
existir sai sem cor, um token divergente renderiza duas paletas, um remap que virou texto ouro sobre
claro passa em build, `tsc` e teste de componente. Por isso o repositório carrega testes que leem o
**fonte do disco**, e cada um tem **âncora de contagem** — sem ela, um caminho errado varre zero
arquivo e passa em silêncio, que é a pior falha possível num teste desse tipo.

A maioria mora em `apps/store/src/shared/lib/__tests__` por acidente de origem, **não** porque
guardem só a loja: `materialTransitions`, `homeSections`, `faqSchema` e `googleShoppingSchema` leem
migrations, e `vercelRedirects` lê o `vercel.json`.

| Guarda | Onde | O que derruba a suíte |
| --- | --- | --- |
| `palette.test.ts` | store `shared/lib/__tests__` | `App.css` e `tailwind.config.ts` divergirem num único token; a escala de raio mudar |
| `contrast.test.ts` | idem | qualquer token de texto abaixo de 4,5:1 sobre `ground`/`ground-deep`/`surface`; `accent` deixar de ser proibido como texto |
| `fieldBorder.test.ts` | idem | um `<input>`/`<Input>`/`<select>`/`<textarea>` voltar a `line` ou `accent` |
| `accentText.test.ts` | idem | texto ouro fora da lista curta; `ink` **com opacidade** dentro de superfície `accent` |
| `touchTarget.test.ts` | idem | controle abaixo de 44px que não adotou `TAP_44`/`TAP_ROW`; a medida deixar de morar num lugar só |
| `brandScan.test.ts` | idem | **qualquer** ocorrência da marca anterior em `apps/`, `packages/`, `supabase/` ou nas configs da raiz |
| `storeSettingsDefaults.test.ts` | idem | os defaults do TypeScript divergirem do que as migrations gravam |
| `importOrder.test.ts` | idem | `App.css` importado **antes** de `@estrelinha/ui/styles.css` no `main.tsx` |
| `reservedSlugs.test.ts` | idem | rota nova no `App.tsx` que não entrou em `ROUTE_SLUGS`; entrada de `ROUTE_SLUGS` que deixou de ser rota. **Bidirecional** |
| `vercelRedirects.test.ts` | idem | `vercel.json` divergir de `LEGACY_REDIRECTS`; `trailingSlash` deixar de ser `false`; redirect usando `permanent` (que produz 308); o catch-all do SPA sair do fim da lista de `rewrites`; os headers de segurança mudarem; o `rewrite` ou o `Content-Type` de `/sitemap.xml` sumirem |
| `robotsSource.test.ts` | idem | `public/robots.txt` perder a linha `Sitemap:`, ganhar uma segunda, declará-la relativa, ou apontar fora de `/sitemap.xml`; uma diretiva `Disallow` entrar de carona |
| `materialTransitions.test.ts` | idem | a máquina de estado do material em **SQL** divergir da em **TypeScript**; `set_material_tracking` escrever coluna além do rastreio e do estado; a migration abrir policy de `UPDATE` em `orders` ou conceder `execute` a `anon` |
| `homeSections.test.ts` | idem | o catálogo de tipos divergir do `check` da migration; a semente divergir de `DEFAULT_HOME_COMPOSITION`; entrar tipo de contagem regressiva ou de prova social; policy de escrita sem `has_role`; `grant` alcançar `anon`; o trigger do hero indelével sumir |
| `faqSchema.test.ts` | idem | a migration da `28` afrouxar: `grant` a `anon`; policy sem `has_role`; `faq_id` deixar de ser `on delete restrict`; sumirem os `check` de 160/600; a view perder `security_invoker` |
| `googleShoppingSchema.test.ts` | idem | a migration da `30` afrouxar; o interruptor do feed nascer ligado; os limites do TypeScript divergirem do `.sql` |
| `sanitizeHtml.test.ts` | idem | a allowlist aceitar atributo, `href` deixar de passar por `new URL`, ou `script`/`style`/`iframe` voltarem a desembrulhar em vez de sumir |
| `sitemapRoutes.test.ts` | store `app/__tests__` | rota nova no `App.tsx` que não entrou em `SITEMAP_STATIC_PATHS` nem em `NON_INDEXABLE_PATHS`; entrada classificada que deixou de ser rota. **Bidirecional**, e provado nos dois sentidos |
| `routes.test.ts` | store `app/__tests__` | `ROUTE_SLUGS`/`LEGACY_REDIRECTS` divergirem das rotas; `legacyRedirectTo` deixar de casar caminho fixo antes de prefixo |
| `brandAssets.test.ts` | idem | ícone referenciado no `index.html` que não existe no disco; `theme-color` fora da paleta; `og:image` fora do projeto |
| `homeComposition.test.tsx` | store `pages/__tests__` | a Home mudar de cara — sequência, literais, limites e as duas cores do título, pelo **DOM renderizado**. **Não perde asserção, só ganha** |
| `copyInstitucional.test.tsx` | idem | copy institucional voltar a prometer o que a loja não cumpre |
| `HomeRendererPreview.test.tsx` | store `widgets/home-renderer` | o invólucro da prévia vazar para o **modo normal** |
| `faqNoDuplicate.test.tsx` | store `entities/product/ui/__tests__` | a descrição voltar a exibir uma pergunta que já está na seção de FAQ |
| `buttonShape.test.ts` | store `shared/ui/__tests__` | ação voltar a pílula; a chave custom de raio voltar ao config |
| `icons.test.ts` | store `shared/ui/icons/__tests__` | ícone fora da grade `0 0 24 24`; escala × traço ≠ 1,5; cor fora de `ICON_ACCENT`; ícone que não chegou ao barrel |
| `paths.test.ts` | store `shared/ui/brand/__tests__` | `paths.ts` divergir do SVG-fonte em um caractere; dois `<path>` do mesmo SVG com a mesma espessura |
| `previaUnica.test.ts` | backoffice `features/home-composition` | um segundo desenho da Home voltar ao painel; o painel importar de `apps/store` |
| `navItems.test.ts` | backoffice `widgets/admin-layout` | ordem das rotas em `App.tsx` divergir de `navGroups` |
| `faqSuggestion.test.ts` | `packages/core/src/faq/__tests__` | a sugestão cair abaixo de **80%** de precisão ou cobertura contra a distribuição real do catálogo. Carrega **sensor embutido**: assere que contagem bruta **reprova** na mesma régua |
| `block.test.ts` | idem | o extrator perder um dos **dois** arranjos de HTML medidos; `stripFaqBlock` remover bloco sem par extraível |
| `shoppingParity.test.ts` | `packages/core/src/shopping/__tests__` | o feed e o JSON-LD divergirem em preço ou disponibilidade, medidos pelas **serializações reais**. Sensor embutido |
| `purity.test.ts` | idem | um arquivo de `core/shopping` importar React, Supabase ou Deno |
| `urls.test.ts` · `render.test.ts` | `packages/core/src/sitemap/__tests__` | produto fora de `/produtos/:slug`; subcategoria em um segmento; `<loc>` relativa, com barra final ou com query; forma legada presente; `changefreq`/`priority` voltarem; o escape sair na ordem errada. Carrega **sensor embutido**: assere que um gerador ingênuo (`'/' + slug`) **reprova** na mesma régua |
| `readAll.test.ts` | `packages/core/src/paging/__tests__` | leitura truncada aceita; total lido divergir da contagem e passar; página vazia não interromper o laço |
| `catalog.test.ts` · `defaults.test.ts` | `packages/core/src/home/__tests__` | um arquivo de `core/home` importar React ou Supabase; a varredura render menos de 9 arquivos; a semente divergir do que a loja desenha |
| `apiShape.test.ts` | `tools/catalog-import` | a Nuvemshop mudar a forma de um campo que o mapeamento lê; a fixture perder um caso de borda |
| `db.test.ts` (`selectAll`) | idem | uma leitura de "o que já existe" voltar a `select` simples e ser truncada em 1.000 linhas pelo PostgREST |
| `handlers.test.ts` (sitemap) | `supabase/functions/sitemap/__tests__` | um caminho degradado responder 200; **um corpo de erro carregar `<urlset>`**; o `Content-Type` da resposta boa deixar de ser `application/xml` |

**Nenhum deles é opcional, e nenhum se conserta afrouxando a asserção.** A `fieldBorder` já custou 16
campos com contraste de 1,19:1 por varrer só as tags HTML minúsculas enquanto a loja monta quase todo
campo com o `<Input>` do shadcn — a regra existia, o token existia, o teste existia, e os três nunca
se encontraram. Lição que virou padrão: **âncora dupla** (arquivos lidos **e** controles encontrados),
e a régua nunca pode ser o objeto medido (a âncora de escopo do `brandScan` escreve os diretórios
literalmente, em vez de iterar a constante que deveria guardar).

## Baselines — o gate de qualquer feature

O gate é **"sem regressão"**, não "tudo limpo": compare contra estes números e **atualize-os aqui**
quando mudarem de verdade.

| Medida | Baseline | Como medir |
| --- | --- | --- |
| **Lint** | **30 erros / 8 warnings** — backoffice 28/7 · store 2/1 | `pnpm lint` |
| **Tipos** | **0 · 0 · 0** (store · backoffice · catalog-import) | `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` |
| **Testes** | **5581 em 307 arquivos** — store 1922/132 · backoffice 1556/97 · core 1418/55 · functions 350/7 · catalog-import 335/16 | `pnpm --filter @estrelinha/<w> test` |

Os cinco workspaces foram remedidos em **2026-08-29**, por workspace e com exit code capturado, e os
cinco passam limpos. A feature `33` (sitemap) somou **+87** em três deles: **core +55** (a regra pura
do sitemap, a paginação extraída e a classificação de rota), **functions +13** (a function nova) e
**store +19** (`sitemapRoutes` e `robotsSource`, mais as vizinhas do `vercelRedirects`). Backoffice e
catalog-import não mudaram — e é isso que se espera de uma feature que não encosta neles.

> **A baseline anterior do store estava 3 testes curta, e o erro era de bookkeeping.** Ela dizia
> **1874/129**; o número medido no HEAD da `31`, por `git stash` em 2026-08-29, é **1877/129**. Nada
> havia sido removido — o fecho da `31` simplesmente registrou um número que não era o da árvore. O
> delta da `32` é **+24**, não os +27 que a diferença contra o número errado sugeria, e o total sai
> de 5468 (não 5465) para 5492. **A lição vale mais que a correção: baseline anotada de memória, ou
> de uma execução anterior à última alteração, mente sem quebrar nada** — meça na hora de escrever.
Os erros de lint são **pré-existentes**, em boa parte `@typescript-eslint/no-explicit-any` nos hooks
admin (`entities/*/api/useAdmin*`). **Zero é a baseline de tipos: qualquer erro de tipo é novo.**

**Regras de leitura da baseline de testes:**

- **Queda só vale se o número reaparece do outro lado.** Duas exceções foram declaradas até hoje: a
  `25` (os 14 casos de `HomePreview.test.tsx`, que viraram verdadeiros por construção quando a prévia
  passou a ser a loja) e a `31` (os 14 de `HowToSendMaterialPage.test.tsx`, reescrito de 14 para 34
  no mesmo lugar). Fora dessas, queda é deleção silenciosa.
- **Asserção de guarda pode ser reescrita quando a régua ganha casos, nunca afrouxada** — e a
  reescrita tem de **ganhar vizinha**. Se uma precisou ser enfraquecida, o comportamento mudou.
- **Teste que reprova isolado nunca é flake.** `pnpm test` roda os cinco workspaces em paralelo e já
  produziu falha de timeout de RTL sob carga (medida hoje: `AdminCouponFormPage.test.tsx` reprovou no
  paralelo e passou isolada, com os 1556 verdes). **Rode por workspace antes de investigar** — mas
  se reprovar sozinho, é defeito.
- **O código de dinheiro não muda por acaso.** `packages/core/src/payment/**` fechou as features 22,
  23, 24 e 25 **sem uma linha alterada**, conferido por `git diff --name-only` no gate. Identidade
  visual, importação de catálogo, composição de home e prévia não têm por que mexer em `payment/`.
- **Teste que lê `import.meta.env` mede a MÁQUINA, não o código.** Duas ocorrências, e a segunda só
  apareceu quando houve CI:
  - `storeOrigin.test.ts` afirmava "sem env devolve `null`" chamando `storeOrigin(undefined)`, que cai
    no **parâmetro default** lido de `import.meta.env` no carregamento do módulo: passava em quem não
    tinha `VITE_STORE_URL` e falhava em quem tinha. Corrigido na `27` com `vi.stubEnv` +
    `vi.resetModules()` + import dinâmico.
  - **O client de `@estrelinha/supabase` LANÇA no carregamento do módulo** sem `VITE_SUPABASE_URL` e
    `VITE_SUPABASE_PUBLISHABLE_KEY` — de propósito, para que falta de configuração não vire fallback
    silencioso. Mas o `.env` é gitignored: quem fornecia os valores era a máquina de quem já tinha
    rodado a loja. A suíte passava local e **morria no CI, em 8 arquivos, antes da primeira
    asserção**. Os dois `vitest.config.ts` agora fixam os valores em `test.env`. No backoffice a
    fixação é **preventiva**: ele passa hoje só porque 109 arquivos mockam o client à mão, o que é
    coincidência mantida a dedo, não propriedade do app.

## CI e deploy

Três workflows em `.github/workflows/`:

| Workflow | Quando | O que faz |
| --- | --- | --- |
| `ci.yml` | PR **e** push em `master` | `turbo run test --concurrency=1`, depois `pnpm build`. Lint e typecheck rodam com `continue-on-error` |
| `supabase-deploy.yml` | push em `master` (sem filtro de `paths`) | `supabase db push --linked` e, condicionalmente, `supabase functions deploy` |
| `sitemap-check.yml` | **cron diário** + `workflow_dispatch` | Prova a **entrega** de `/sitemap.xml`: tipo entregue, documento parseando, contagem acima do piso, `robots.txt` coerente e uma `<loc>` respondendo 200. Não regenera nada — o sitemap é servido ao vivo |

- **`--concurrency=1` no CI é de propósito**: rodar store e backoffice em paralelo satura o runner de
  2 vCPUs (jsdom é pesado) e a suíte do backoffice fica flaky. É a mesma flake que se vê localmente.
- **Lint e typecheck NÃO bloqueiam o merge** enquanto a baseline não for zerada. Rodam para dar
  visibilidade. O gate de verdade é *teste + build*.
- **O deploy do Supabase roda sem filtro de `paths`**, e isso é decisão declarada: com filtro, um push
  que não tocasse `supabase/**` não gerava execução nenhuma — e **run ausente é indistinguível de run
  quebrado** na aba Actions. O custo de rodar sempre fica contido no passo `mudou`, que só deploya as
  functions quando `supabase/functions/**` mudou de fato.
- **`db push` NÃO é condicionado por diff, e a assimetria é deliberada**: sem migration pendente ele
  já é no-op, e decidir por diff arriscaria pular uma migration que ficou para trás num push que
  falhou. **Estado de banco se decide pelo estado, nunca pelo diff.**

## Estado da infraestrutura

**O projeto Supabase hospedado é `hgkrsfpupypxtygjgthf`** — criado em 2026-08-16, é o que está nos
`rewrites` do `apps/store/vercel.json` e o que fechou a `BL-016`. Os dois apps têm `vercel.json`
completo (framework, `installCommand` na raiz do monorepo, headers de cache e de segurança).

**Medido em 2026-08-29 contra o projeto hospedado — o que está de pé e o que não está:**

- **O schema ESTÁ aplicado.** `supabase migration list --linked`: **44 de 44**, `local` == `remote`,
  zero pendente. E o **catálogo está lá**: 680 produtos (todos ativos), 3.245 variações, 35
  categorias, 67 perguntas e 3.475 vínculos, 7 seções de home, Storage servindo imagem real.
- **As TRÊS edge functions estão implantadas** (`google-feed`, `product-page` e, desde 2026-08-29, a
  `sitemap` da feature `33`), e a loja provisória está no ar em
  `umaestrelinha-store-five.vercel.app` (o painel, em `umaestrelinha-backoffice.vercel.app`).
  `STORE_PUBLIC_URL` aponta para a loja provisória — **valor que tem de mudar antes de ligar o
  feed**, senão os `<g:link>` das 3.233 ofertas nascem apontando para o `.vercel.app`.
- **`/produtos/:slug` FUNCIONA** desde 2026-08-29: 200 com `text/html; charset=utf-8` e o JSON-LD no
  `<head>`, conferido em três produtos. A Supabase reescreve `text/html` para `text/plain` no domínio
  compartilhado (`BUG-20260829`), e quem desfaz isso é um header no `vercel.json` — **comportamento
  não documentado da Vercel, do qual o catálogo inteiro agora depende** (`AD-021`).
- **A Vercel NÃO cacheia `rewrite` para host externo** — 4 batidas, 4 `X-Vercel-Cache: MISS`, ~1s
  cada, apesar do `s-maxage=300`. Toda visita a produto atravessa a edge function, que busca o shell
  e consulta o banco. Era a incerteza que a `AD-020` declarou; a condição de revisão que ela mesma
  escreveu foi atingida, e a saída é a `BL-017`.
- **`application/xml` TAMBÉM é reescrito pelo gateway `*.supabase.co`.** Medido em 2026-08-29 contra
  a function `sitemap`: ela responde `application/xml; charset=utf-8` e chega **`text/plain`**, com
  `nosniff` acrescentado e o `Cache-Control` intacto — **assinatura idêntica à do `BUG-20260829`**. A
  pergunta que a `AD-021` deixou aberta está respondida: **a reescrita não é específica de
  `text/html`**. Quem desfaz é o header do `vercel.json`, agora em duas rotas.
- **A prova de que uma rota servida está de pé é o `Content-Type` ENTREGUE, nunca o status.** O
  `curl -I` que este arquivo prescrevia teria declarado o `BUG-20260829` verde — status 200, corpo
  certo, entrega inutilizável. Confira o tipo e a presença do JSON-LD no corpo:
  `curl -sD - -o /dev/null <url> | grep -i content-type`.
- **O banco local e o hospedado NÃO compartilham identidade.** Mesmo slug, UUID diferente; mesmo
  `type` de seção, id diferente. Qualquer cópia de dado entre os dois é por **slug/tipo**, jamais por
  id — e `home_section_items` carrega `image_url` apontando para o Storage **local**, que em produção
  vira banner quebrado.
- **`supabase/.temp/project-ref` foi corrigido** para `hgkrsfpupypxtygjgthf` em 2026-08-29 (dizia
  `zwvrqtjvaltpbevjqzks`, um ref que **nem existe na conta** — link morto). A armadilha continua
  valendo como regra: confira com `supabase projects list` e re-linke antes de qualquer comando que
  escreva no hospedado. (O CI não usa este arquivo: ele linka pela **variable**
  `SUPABASE_PROJECT_REF` do environment `production` — variable e não secret, porque o ref não é
  segredo e mascará-lo em log só atrapalha quem estiver depurando.)
- **`AD-017` VENCEU em 2026-08-17.** O `Supabase Deploy` aplicou as 44 migrations no projeto
  hospedado `hgkrsfpupypxtygjgthf` (run do commit `bf2537e`, `Finished supabase db push.`). **A
  permissão de reescrever história de migration acabou ali.** Daqui em diante vale a regra normal, sem
  exceção: **migration aplicada é imutável, e correção vem em migration nova**. Reescrever um arquivo
  já aplicado faz o banco local e o hospedado divergirem em silêncio — o `db push` só olha o que
  falta, nunca o que mudou no que já passou.
- **O guia de deploy em `.specs/archive/nanita/DEPLOY.md` é da loja anterior**: o *procedimento* vale,
  os identificadores não.

## Estado conhecido / dívidas

- **A feature `31` não tem spec.** O guia de material foi implementado no commit `fcd3942` e está
  documentado em `apps/store/CLAUDE.md`, mas não existe `.specs/features/31-*` nem handoff na
  `STATE.md`. O número segue consumido.
- **A `32` não tem `validation.md`** e não passou por Verifier independente. Os 24 testes cobrem os
  requisitos que jsdom alcança e carregam o sensor da cicatriz da chave (`LST-04`), mas ninguém
  conferiu a feature contra a spec com olhos frescos. Mesma pendência da `22` e da `28`.
- **A `33` tem `validation.md`, mas o autor é o verificador.** A execução foi inline, e o relatório
  declara isso no topo. A evidência é toda medida e os dois guardas novos tiveram a sensibilidade
  provada por injeção de falha — o que reduz o viés, não o elimina. Entra na mesma fila acima.
- **A `33` está implementada e o `rewrite` ainda não foi publicado.** A edge function `sitemap` **já
  está no ar** no projeto hospedado (deploy aditivo, feito para medir o `Content-Type`), mas até o
  push da loja `/sitemap.xml` continua devolvendo o shell da SPA. A prova de fecho é o `curl` do
  `validation.md`, nunca o status code.
- **`STATE.md` e `BACKLOG.md` discordam sobre a `BL-016`.** O `BACKLOG.md` a dá como fechada com o
  ref real; a `AD-020` e o handoff da `30` ainda dizem "o host é marcador, bloqueado por `C-08`".
  Vale o `BACKLOG.md` — mas com a ressalva das functions não implantadas, acima.
- **`BL-013` está FECHADO** (2026-08-16). A loja passou a mandar `Content-Security-Policy:
  frame-ancestors 'self' https://umaestrelinha-backoffice.vercel.app`, **no lugar** do
  `X-Frame-Options: SAMEORIGIN` — aquele header não tem sintaxe para autorizar outra origem, e manter
  os dois deixaria a política com dois donos. `vercelRedirects.test.ts` ganhou três asserções: origem
  exata, ausência de `X-Frame-Options`, e recusa de curinga. **A origem é literal nos dois lados**, e
  trocar o domínio do painel exige mexer no `vercel.json` e no teste — sob pena de a prévia voltar a
  ser quadro branco sem erro.
- **`BL-007`** — sitemap. A `30` levou a metade do dado estruturado; a do sitemap segue aberta.
- **`BL-008`** — `fetchStatusCounts` lê `orders` sem paginação e herda o teto de 1.000 do PostgREST.
  As contagens da fila de material entram no mesmo teto; corretas até 1.000 pedidos.
- **`BL-009`..`BL-011`** — dívidas da `24`, entre elas o `SUPABASE_URL` com fallback hard-coded de
  outro projeto em `uploadProductImage.ts`.
- **`BL-014`** — geração de pergunta por IA, adiada por decisão do usuário em 2026-08-16. Irmã da
  `BL-001`, e as duas devem ser resolvidas juntas (a resposta de infraestrutura é a mesma).
- **`BL-015`** — **`material_kinds` diz menos que a descrição.** Há produto com `material_kinds =
  {cinzas}` cuja descrição enumera cinco materiais, produto com `requires_material = false` cuja
  descrição manda enviar coto e cabelo, e um material (`sangue`) fora de `MATERIAL_KINDS`. É curadoria
  da `22`, e por isso a `28` **proíbe** derivar a resposta "Quais materiais posso usar?" da coluna.
- **Fronteiras FSD em `warn`**: 1 violação conhecida no store (`entities/product/ProductInfo` importa
  `features/share-product`). Corrigir extraindo a interação para uma feature.
- **Imports profundos** (pré-barrel) em muitos lugares. Migrar para os barrels de slice
  incrementalmente.
- **O `seed.sql` não tem mais catálogo.** Depois de `supabase db reset` a loja fica **sem produto e
  sem categoria** até o importador rodar. Cupons e usuário admin continuam no seed. Ver
  `tools/catalog-import/CLAUDE.md`.

### O que espera decisão da dona, não código

Quatro curadorias estão semeadas e esperando a Adri. Nenhuma é bug, e nenhuma se resolve escrevendo
código — mas todas explicam por que uma tela parece vazia:

| O que | Onde ela decide | Por que a tela parece vazia hoje |
| --- | --- | --- |
| Material de cada produto | `/admin/produtos`, aba Geral | a `22` semeou 689 produtos por inferência do nome |
| Vagas do menu | `/admin/menu` | `show_in_menu = 0` nas 37 categorias ⇒ barra do topo vazia |
| Arte da vitrine | `/admin/categorias` | nenhuma das 37 categorias tem `banner_url` ⇒ a grade de banners não aparece |
| Perguntas frequentes | `/admin/perguntas` e a aba `Perguntas` do produto | a `28` semeou 67 entradas e 3.475 vínculos das descrições |
