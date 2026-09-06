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
| `packages/ui/**` | [`packages/ui/CLAUDE.md`](packages/ui/CLAUDE.md) | shadcn, preset Tailwind, tokens `--estrelinha-admin-*`, **a biblioteca de ícones** (`@estrelinha/ui/icons`, desde a `39`) |
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
    **A `33` (sitemap), a `34` (painel de vendas), a `35` (clientes e pedidos da Nuvemshop), a `37`
    (frete grátis configurável) e a `39` (menu configurável) estão FECHADAS. A `36` (metadados e
    dados estruturados) tem **só `spec.md`** e não foi implementada — o número está consumido de
    qualquer forma; a `38` (performance no celular) está EM ANDAMENTO noutro ramo. A próxima é a
    `40`.**
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
| `35` | o telefone da cliente, que existia no checkout e **não era persistido** — e a coluna crua do status da origem, que viraria um segundo dono de "este pedido foi pago?" | `orders.customer_phone` (snapshot) e as colunas `nuvemshop_*_status`, que **nenhuma tela lê** (`provenanceNotRead.test.ts`) |
| `34` | o contraste WCAG (só a loja tinha), a aritmética de página (só produtos tinha), e os rótulos de `payment_status` em **três** cópias | `@estrelinha/core/color`, `core/paging/pageMath.ts` e `entities/order/api/orderQuery` |
| `37` | **o frete grátis, lido por SETE superfícies em duas leituras que discordavam** — com a faixa em zero, três escondiam o texto e quatro **zeravam o frete**. Zerar o campo no painel escondia o anúncio e liberava frete grátis para todo mundo no caixa | `@estrelinha/core/shipping` (`freeShippingState`), com `freeShippingSingleOwner.test.ts` recusando leitura direta |
| `39` | **o DESENHO do menu, de novo** — `MenuBarPreview.tsx` redesenhava a barra do topo à mão no painel, com a paleta do admin, e anunciava `/crie-seu-botton`, que **nunca foi rota**. É o mesmo defeito que a `25` apagou da Home; no menu ele nunca tinha saído. E, ao lado dele, o **papel** de cada categoria (barra × painel), que uma coluna nova teria dessincronizado no primeiro "mover categoria" | a prévia É a loja, num iframe (`MenuLivePreview`), e o papel é **derivado da árvore** dentro de `menuItems(input, surface)` — a porta única das quatro superfícies |

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
  de `menuTargetRefusal` e `reservedSlugRefusal`. **União por literal de string estreita**, e é por
  isso que `MenuItem` discrimina por `kind: 'category' | 'link'`.
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
| `storeSettingsDefaults.test.ts` | idem | os defaults do TypeScript divergirem do que as migrations gravam; o interruptor do frete grátis nascer ligado; a migration da `37` deixar de ser aditiva (`value \|\|`) ou idempotente (`NOT value ?`). **Sensor embutido**: assere que o parser devolve `undefined` para campo ausente |
| `freeShippingSingleOwner.test.ts` | idem | qualquer arquivo de `apps/**` fora de um allowlist de **dois** ler `free_shipping_threshold`; `freeShippingProgress` ou `FreeShippingBar` voltarem a existir em produção; copy com o valor da faixa cravada em JSX. **Âncora dupla** e **seis sensores embutidos** — o removedor de comentário provado com CRLF, com LF, contra o glob de dois asteriscos que o cegava (`BL-027`, fechada em 2026-09-06: linha e bloco na **mesma** varredura) e contra uma leitura nova escondida atrás desse mesmo glob |
| `importOrder.test.ts` | idem | `App.css` importado **antes** de `@estrelinha/ui/styles.css` no `main.tsx` |
| `reservedSlugs.test.ts` | idem | rota nova no `App.tsx` que não entrou em `ROUTE_SLUGS`; entrada de `ROUTE_SLUGS` que deixou de ser rota. **Bidirecional** |
| `vercelRedirects.test.ts` | idem | `vercel.json` divergir de `LEGACY_REDIRECTS`; `trailingSlash` deixar de ser `false`; redirect usando `permanent` (que produz 308); o catch-all do SPA sair do fim da lista de `rewrites`; os headers de segurança mudarem; o `rewrite` ou o `Content-Type` de `/sitemap.xml` sumirem |
| `robotsSource.test.ts` | idem | `public/robots.txt` perder a linha `Sitemap:`, ganhar uma segunda, declará-la relativa, ou apontar fora de `/sitemap.xml`; uma diretiva `Disallow` entrar de carona |
| `materialTransitions.test.ts` | idem | a máquina de estado do material em **SQL** divergir da em **TypeScript**; `set_material_tracking` escrever coluna além do rastreio e do estado; a migration abrir policy de `UPDATE` em `orders` ou conceder `execute` a `anon` |
| `homeSections.test.ts` | idem | o catálogo de tipos divergir do `check` da migration; a semente divergir de `DEFAULT_HOME_COMPOSITION`; entrar tipo de contagem regressiva ou de prova social; policy de escrita sem `has_role`; `grant` alcançar `anon`; o trigger do hero indelével sumir |
| `faqSchema.test.ts` | idem | a migration da `28` afrouxar: `grant` a `anon`; policy sem `has_role`; `faq_id` deixar de ser `on delete restrict`; sumirem os `check` de 160/600; a view perder `security_invoker` |
| `googleShoppingSchema.test.ts` | idem | a migration da `30` afrouxar; o interruptor do feed nascer ligado; os limites do TypeScript divergirem do `.sql` |
| `menuSchema.test.ts` | idem | a migration da `39` afrouxar: `show_in_menu` deixar de ser **gerada**; o índice parcial sumir na recriação; a semeadura do link "Sobre" perder o `NOT value ?`/`do nothing` (viraria escrita destrutiva a cada `db push`); `grant` alcançar `anon`. **Âncora dupla** e sensor por mutação |
| `menuIconCatalog.test.ts` | idem | chave de `MENU_ICON_KEYS` sem componente em `MENU_ICON_COMPONENTS`, ou o contrário; a loja voltar a importar ícone de `@/shared/ui/icons`. **Bidirecional**, com âncora de contagem |
| `menuSurfaceSingleOwner.test.ts` | idem | qualquer arquivo de `apps/**` ler `show_in_menu` ou `menu_promo` — a primeira é **coluna gerada** e a segunda é legado; quem responde "está no menu?" é `menuItems(…, surface)`, porque a resposta depende do dispositivo. **Zero allowlist**, escrito literalmente, e sensor do ponto cego do comentário |
| `menuSemItemFixo.test.ts` | idem | `FIXED_ENTRIES` (com qualquer um dos dois nomes) voltar a existir; `/crie-seu-botton` reaparecer; destino literal (`to="/…"`) nas quatro superfícies de menu da loja fora do chrome (`/`, `/conta`, `/favoritos`). **Âncora dupla** e quatro sensores |
| `menuSemTeto.test.ts` | idem | `MENU_SLOT_LIMIT`, `slotsUsed`, `menuSlotRefusal`, `menuEntries`, `MenuEntry`, `resolvePromo` ou `ResolvedPromo` voltarem a `apps/**` ou a `packages/core/src/menu/**`; vocabulário de "vaga" nas cinco superfícies de menu; a barra trocar `overflow-x-auto`/`min-w-max` por `flex-wrap` (embrulhar **esconde** o estouro); a **afordância** de rolagem sumir da faixa cheia — o estado medido, os dois degradês e as duas setas rotuladas (`BL-028`). **Âncora dupla** e dez sensores — incluindo a prova de que `MobileMenuEntry` **não** é acusado, e as duas réguas da `BL-028` escritas como **predicado**, para asserção e sensor chamarem a mesma função |
| `sanitizeHtml.test.ts` | idem | a allowlist aceitar atributo, `href` deixar de passar por `new URL`, ou `script`/`style`/`iframe` voltarem a desembrulhar em vez de sumir |
| `importSchema.test.ts` | store `shared/lib/__tests__` | a migration da `35` afrouxar: índice de idempotência virar parcial; `security_invoker` sumir de `customer_directory`; o agregado de telefone da convidada perder o `FILTER (WHERE … IS NOT NULL)`; `handle_new_customer` perder o `security definer`; a adoção por e-mail deixar de recortar `customer_id IS NULL` ou de comparar por `lower()`; `grant` alcançar `anon`. **Cada asserção tem sensor por mutação** |
| `originZipNotRead.test.ts` | backoffice `shared/lib/__tests__` | qualquer arquivo de `apps/**` ler `store_settings.shipping.origin_zip` — o campo é LEGADO e a origem da cotação é o `postal_code` do secret `MELHOR_ENVIO_SENDER_JSON`. Deixá-lo configurável na tela faria a origem da COTAÇÃO e a da ETIQUETA poderem divergir. **Âncora dupla** |
| `quotePayload.test.ts` | `packages/core/src/shipping/__tests__` | `insurance_value` deixar de ser **por unidade** — a API do Melhor Envio já multiplica por `quantity`, e multiplicar aqui segura a carga pelo **quadrado** dela. Carrega **sensor embutido**: assere que a fórmula antiga do backoffice reprova na mesma régua |
| `provenanceNotRead.test.ts` | backoffice `shared/lib/__tests__` | qualquer arquivo de `apps/**` ler `nuvemshop_status`, `nuvemshop_payment_status` ou `nuvemshop_shipping_status` — as colunas cruas do import são **proveniência**, e lê-las daria duas respostas para "este pedido foi pago?". **Âncora dupla** |
| `parse.test.ts` · `recorte.test.ts` · `fixtureSintetica.test.ts` | `tools/catalog-import/src/csv/__tests__` | o CSV deixar de ser lido como Latin-1; o agrupador voltar a tratar linha como pedido (243 em vez de 70); o rastreio `="…"` chegar cru; o recorte ganhar teto e deixar pedido novo de fora; a fixture parar de ser sintética (e-mail fora de `@exemplo.invalid`, documento sem dígito repetido) |
| `orderStatus.test.ts` · `catalogMatch.test.ts` · `order.test.ts` | `tools/catalog-import/src/map/__tests__` | o de-para divergir do `CHECK` do banco (**lido do disco**); `separating` ser produzido; valor fora do vocabulário deixar de abortar; o SKU voltar a casar item; o recorte de parênteses deixar de ser balanceado; a fila de material perder um dos **dois** cortes (terminal e pagamento) |
| `orders.test.ts` | `tools/catalog-import/src/write/__tests__` | a re-execução sobrescrever coluna operacional sem `--ressincronizar-estado`; os itens deixarem de ser imutáveis; a leitura de estado atual sair do `selectAll` |
| `orderList.test.ts` (cobrança) | backoffice `features/order-list/model` | um `chargeMaterialUrl(` de `AdminOrdersPage.tsx` deixar de passar `customer_phone` — o link volta a sair **sem número**, em silêncio |
| `sitemapRoutes.test.ts` | store `app/__tests__` | rota nova no `App.tsx` que não entrou em `SITEMAP_STATIC_PATHS` nem em `NON_INDEXABLE_PATHS`; entrada classificada que deixou de ser rota. **Bidirecional**, e provado nos dois sentidos |
| `routes.test.ts` | store `app/__tests__` | `ROUTE_SLUGS`/`LEGACY_REDIRECTS` divergirem das rotas; `legacyRedirectTo` deixar de casar caminho fixo antes de prefixo |
| `scrollToTop.test.tsx` | idem | o `ScrollToTop` sair do `App.tsx` ou de dentro do `BrowserRouter`; o botão voltar (`POP`) passar a rolar ao topo; mudança só de query string passar a rolar (a busca daria um pulo por tecla); âncora de outra página com alvo existente deixar de ir até ele |
| `brandAssets.test.ts` | idem | ícone referenciado no `index.html` que não existe no disco; `theme-color` fora da paleta; `og:image` fora do projeto |
| `routeSplitting.test.ts` | idem | página do `App.tsx` importada estaticamente em vez de `lazy`; entrada de `lazy` que deixou de ser rota. **Bidirecional** — sem o segundo sentido o arquivo acumula chunk fantasma |
| `viteChunks.test.ts` | idem | um grupo de `manualChunks` sumir do `vite.config.ts`; pacote do `dedupe` ficar fora de todo grupo (duas cópias do React é tela branca, não lentidão) |
| `toasterUnico.test.ts` | idem | o segundo sistema de aviso voltar à loja — `useToast`/`<Toaster>` do Radix, cujo provider saiu. O aviso simplesmente não pinta, e nada acusa |
| `queryClient.test.ts` | idem | o `staleTime` padrão do React Query voltar a zero, ou passar a atropelar a consulta que já decidiu o dela |
| `cardSelect.test.ts` · `renamedColumns.test.ts` | store `entities/product/lib/__tests__` | o `select` enxuto da vitrine deixar de pedir um campo que o card desenha (o mapper coalesce, e a tela renderiza vazia); um `select` nomear coluna que uma migration renomeou para fora |
| `fiacaoDaVitrine.test.ts` | idem | a página parar de passar `index` para o card — a prioridade do LCP volta a `lazy` em toda a listagem, e os 2234 testes do store continuam verdes |
| `renditionSingleOwner.test.ts` | store `shared/lib/__tests__` | qualquer arquivo de `apps/**` ou `packages/**` montar a URL de rendição à mão (`render/image`, `width=`, `quality=`) fora de `core/media/rendition.ts`; largura de `srcset` cravada em JSX; `eager`/`lazy` decidido por `index < 6` fora de `imagePriority`. **Âncora dupla** e sensores por mutação nos dois sentidos |
| `homeComposition.test.tsx` | store `pages/__tests__` | a Home mudar de cara — sequência, literais, limites e as duas cores do título, pelo **DOM renderizado**. **Não perde asserção, só ganha** |
| `copyInstitucional.test.tsx` | idem | copy institucional voltar a prometer o que a loja não cumpre |
| `HomeRendererPreview.test.tsx` | store `widgets/home-renderer` | o invólucro da prévia vazar para o **modo normal** |
| `faqNoDuplicate.test.tsx` | store `entities/product/ui/__tests__` | a descrição voltar a exibir uma pergunta que já está na seção de FAQ |
| `buttonShape.test.ts` | store `shared/ui/__tests__` | ação voltar a pílula; a chave custom de raio voltar ao config |
| `icons.test.ts` | store `shared/lib/__tests__` (varre `packages/ui/src/icons`) | ícone fora da grade `0 0 24 24`; escala × traço ≠ 1,5; cor fora de `ICON_ACCENT`; ícone que não chegou ao barrel. **Mora na suíte da loja porque `packages/ui` não tem runner** — guarda que não roda é pior que guarda nenhum |
| `paths.test.ts` | store `shared/ui/brand/__tests__` | `paths.ts` divergir do SVG-fonte em um caractere; dois `<path>` do mesmo SVG com a mesma espessura |
| `previaUnica.test.ts` | backoffice `features/home-composition` | um segundo desenho da Home **ou do MENU** voltar ao painel; `MenuBarPreview.tsx` reaparecer; um arquivo de `store-menu` importar `menuPanelColumns` ou `resolveMenuBanners` (calcular o desenho do painel da loja **é** o segundo desenho); qualquer dos dois importar de `apps/store`. **Cobre as features `25` e `39`**, com âncora dupla e sensor de CRLF/LF |
| `navItems.test.ts` | backoffice `widgets/admin-layout` | ordem das rotas em `App.tsx` divergir de `navGroups` |
| `adminTokens.test.ts` | backoffice `shared/lib/__tests__` | classe `estrelinha-admin-*` cujo token **não existe no preset**; `amber`/`emerald` virarem hex literal (o dark pararia de acompanhar); chave do preset apontando para variável não declarada; hex do preset divergir do `styles.css`; `text`/`text-secondary`/`text-muted` caírem abaixo de 4,5:1 sobre `card`/`bg`, **em light e dark**; `text-muted` alcançar `text-secondary` (o piso comeria a hierarquia); âmbar ou esmeralda reprovarem sobre o **próprio fundo de 10%**. Carrega **sensor embutido** e **âncora dupla** |
| `faqSuggestion.test.ts` | `packages/core/src/faq/__tests__` | a sugestão cair abaixo de **80%** de precisão ou cobertura contra a distribuição real do catálogo. Carrega **sensor embutido**: assere que contagem bruta **reprova** na mesma régua |
| `block.test.ts` | idem | o extrator perder um dos **dois** arranjos de HTML medidos; `stripFaqBlock` remover bloco sem par extraível |
| `shoppingParity.test.ts` | `packages/core/src/shopping/__tests__` | o feed e o JSON-LD divergirem em preço ou disponibilidade, medidos pelas **serializações reais**. Sensor embutido |
| `purity.test.ts` | idem | um arquivo de `core/shopping` importar React, Supabase ou Deno |
| `urls.test.ts` · `render.test.ts` | `packages/core/src/sitemap/__tests__` | produto fora de `/produtos/:slug`; subcategoria em um segmento; `<loc>` relativa, com barra final ou com query; forma legada presente; `changefreq`/`priority` voltarem; o escape sair na ordem errada. Carrega **sensor embutido**: assere que um gerador ingênuo (`'/' + slug`) **reprova** na mesma régua |
| `readAll.test.ts` | `packages/core/src/paging/__tests__` | leitura truncada aceita; total lido divergir da contagem e passar; página vazia não interromper o laço |
| `catalog.test.ts` · `defaults.test.ts` | `packages/core/src/home/__tests__` | um arquivo de `core/home` importar React ou Supabase; a varredura render menos de 9 arquivos; a semente divergir do que a loja desenha |
| `orderList.test.ts` | backoffice `features/order-list/model` | o "limpar filtros" voltar a ignorar um eixo; a busca perder uma das cinco colunas; `Precisa de ação` deixar de ser a união dos três acionáveis ou passar a incluir o Pix; o lote de material abortar na primeira recusa, ou parar de separar RECUSA de FALHA; o teto de 50 sumir; a cobrança por WhatsApp ganhar urgência fabricada ou passar a nomear o material (`BL-015`) |
| `orderDetail.test.ts` | backoffice `features/order-detail/model` | o histórico deixar de fundir os três fios ou de ordenar por tempo; e-mail que falhou parar de dizer que a cliente não soube; o "próximo passo" bloquear em vez de explicar; `delivered`/`cancelled` deixarem de ser fim de linha |
| `pickSlip.test.ts` | backoffice `features/pick-slip` | a folha perder itens, gravação, material esperado ou endereço; o conteúdo deixar de ser escapado; a folha voltar a carregar CSS do painel; o lote parar de gerar uma folha por pedido |
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
| **Lint** | **27 erros / 5 warnings** — backoffice 25/4 · store 2/1 | `pnpm lint` |
| **Tipos** | **0 · 0 · 0** (store · backoffice · catalog-import) | `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` |
| **Testes** | **7014 em 375 arquivos** — store 2490/161 · backoffice 1914/116 · core 1728/68 · functions 370/7 · catalog-import 512/23 | `pnpm --filter @estrelinha/<w> test` |

**Este número é da ÁRVORE MESCLADA — a `39` encontrando a `38` na `master`** (merge de 2026-09-06),
e não a soma de duas baselines. Os cinco workspaces foram medidos **um por vez**, com exit code
capturado fora de pipe, e os cinco passam limpos.

| Workspace | `39` sozinha | `38` sozinha (`master`) | **Árvore mesclada** |
| --- | --- | --- | --- |
| store | 2212/144 | 2270/152 | **2490/161** |
| backoffice | 1908/116 | 1789/109 | **1914/116** |
| core | 1691/67 | 1524/61 | **1728/68** |
| functions | 350/7 | 370/7 | **370/7** |
| catalog-import | 509/23 | 512/23 | **512/23** |

**O merge acrescentou 7 casos, e nenhum deles é herança de uma das pontas** — são o trabalho que só
existe porque as duas se encontraram. Os banners do menu passaram a pedir a foto no tamanho da vaga
(`renditionUrl`/`renditionSrcSet`), que a `39` **não pôde** usar porque o módulo vivia só na
`master`, e o `design.md` dela registra isso por escrito:

| Onde | Casos | O quê |
| --- | --- | --- |
| store `MegaMenu.test.tsx` | **+2** | a vaga de 320px pede 640 no `src`, `srcset` de `[320, 640]` e `sizes`; e o par — arte de fora do Storage sai **inalterada**, sem `srcset` inventado |
| store `MobileMenu.test.tsx` | **+2** | o mesmo, na vaga quadrada de 104px da folha do celular |
| backoffice `MenuBannerEditor.test.tsx` | **+2** | o mesmo, na miniatura de 64px do painel |
| backoffice `shared/lib/__tests__/uploadImage.test.ts` | **+1** | o sensor de que o endereço ANTIGO do upload não pode voltar a gravar `cacheControl` — os 3 casos do `PRF-05` não são novos, **mudaram de arquivo** |

**Os 3 casos do `PRF-05` da `38` não caem em lugar nenhum, e a mudança de casa é a razão de terem
se mexido.** A `38` pôs `cacheControl: STORAGE_CACHE_CONTROL` em
`features/product-form/lib/uploadProductImage.ts`; a `39` mudou o motor de upload para
`shared/lib/uploadImage.ts` e o merge automático manteve as duas coisas sem conflito — com o
resultado de o painel voltar a gravar **uma hora** de cache e o guarda ler um arquivo que já não faz
upload nenhum. Peça certa, endereço errado, suíte verde. O conserto foi portar a constante para o
endereço novo e mover os casos com ela.

**A soma não é aritmética, e não deve ser lida como se fosse.** As duas features mexeram nos mesmos
arquivos de teste (`SearchOverlay.test.tsx`, `routing.test.tsx`, `MegaMenu.test.tsx`,
`uploadProductImage.test.ts`), e cada baseline escrita abaixo é anterior aos últimos commits da
própria feature — a `38` registra esse envelhecimento no bloco dela. **O número que vale é o
medido**, e ele foi medido aqui.

Lint ficou em **27/5** (backoffice 25/4 · store 2/1) e tipos em **0 · 0 · 0**, os dois medidos na
árvore mesclada. `pnpm build` passa nos dois apps. `packages/core/src/payment/**` não teve uma linha
alterada pelo merge — conferido pelo diff de nomes de arquivo do merge.


**As duas dívidas que a `39` registrou somaram +22, todas no store**, medidas em 2026-09-06 um
workspace por vez e com exit code capturado. **Nenhum arquivo novo de teste**: as duas cresceram
dentro dos arquivos que já guardavam o assunto.

| Dívida | Onde | Delta |
| --- | --- | --- |
| **`BL-027`** — o ponto cego do removedor de comentário do guarda do frete grátis | store `freeShippingSingleOwner.test.ts` (15 → 17) | **+2**, os dois sensores novos (o glob que cegava, e a leitura fora do allowlist ao lado dele). Nenhuma asserção de regra tocada, e nenhuma passou a reprovar — o ponto cego não escondia leitura nenhuma |
| **`BL-028`** — a barra cheia sem afordância de rolagem para mouse | store `Header.test.tsx` (26 → 38) e `menuSemTeto.test.ts` (15 → 23) | **+20**: 12 casos de estado (cabe · começo · meio · fim · fim fracionário · os dois cliques · rótulos · alvo de 44 · a camada fora do `<nav>` · o teclado intacto) e 8 de forma, com as duas réguas escritas como **predicado** para asserção e sensor chamarem a mesma função |

Lint ficou em **27/5** (store 2/1 · backoffice 25/4) e tipos em **0 · 0**, sem mexer. Core,
functions e catalog-import não foram tocados e foram remedidos assim mesmo: 1691/67, 350/7 e 509/23.
`packages/core/src/payment/**` não teve uma linha alterada.

**A feature `39` (menu configurável) somou +484 em três workspaces**, medidos em 2026-09-05 um por
vez, na ordem, e com exit code capturado: **core +198/+7**, **store +181/+9** e **backoffice
+105/+6**. Functions e catalog-import não foram tocados. Lint ficou em **27/5** e tipos em **0 · 0**,
sem mexer; `packages/core/src/payment/**` e `supabase/functions/mercado-pago/**` seguem intocados —
conferido por `git diff --name-only`. **Três quedas declaradas**, e nenhuma é deleção silenciosa:

| Queda | Onde | Por quê |
| --- | --- | --- |
| **−3 e −3** | store `MegaMenu.test.tsx` (19 → 31) e `MobileMenu.test.tsx` (15 → 30) | saíram a faixa `TrendingLane` (3 produtos automáticos por `is_featured`, que a Adri não escolhia nem via) e o card `menu_promo` (retângulo de cor sem imagem). Os dois arquivos **cresceram** na mesma reescrita: entram os banners com arte, o ícone, as colunas curadas e o item de link |
| **−0** | backoffice `MenuBarPreview.tsx` | apagado — era o **segundo desenho** da barra, com os tokens do admin, anunciando `/crie-seu-botton`, que nunca foi rota. **Não custou contagem**: nunca teve teste. `previaUnica.test.ts` cobre as duas features e recusa a volta |
| **−34** | core `menu.test.ts` (58 → 24) | saíram `menuEntries` (10), `slotsUsed`/`menuSlotRefusal` (6) e `resolvePromo` (13) — funções **apagadas** na T30, que liam um booleano só e não conheciam dispositivo. O que as substituiu tem cobertura maior (`menuItems.test.ts` 62, `banners.test.ts` 46). Os 3 casos de `URL-03` **não** caíram: foram reescritos contra `menuItems`, no mesmo arquivo |

**As lacunas que a verificação da `39` achou somaram +25**, medidos em 2026-09-05 um workspace por
vez e com exit code capturado: **store +8** (a régua dos três backfills da migration, a cor do rótulo
da barra e o escopo do dono único) e **backoffice +17/+1** (`MenuPanelEditor.test.tsx`, que não
existia, e o par painel × loja do predicado da arte). Core, functions e catalog-import não mudaram de
contagem. **Duas delas eram mutante sobrevivente**, e é isso que as torna dignas de registro:

- **A migration tinha UMA régua para TRÊS backfills, e era a forma do primeiro.** O segundo traz
  `from public.categories p` entre o `set` e o `where` e escapava dela: reduzi-lo a
  `set menu_desktop = true` deixava os 2182 testes verdes, e no `db push` **todo painel do menu do
  celular nasceria vazio** — ~90% dos acessos — com o do computador intacto. Cada backfill passou a
  ter asserção própria que o nomeia, com sensor ao lado, e as três mutações foram reinjetadas no
  arquivo real para ver a suíte reprovar.
- **`text-estrelinha-on-primary` podia sair de `NAV_ITEM` sem nada acusar.** A metade "o rótulo
  continua em `on-primary`" não tinha asserção nenhuma, e a que existia (`toContain
  ('text-estrelinha-accent')`) casava **também** `accent-strong` — o token que a AC opõe. A régua
  agora é de token exato (`(?:^|\s)token(?![-\w])`), porque `\b` não fecha nada quando o vizinho é
  hífen.
- **O predicado da herança de arte tinha dois donos**: o painel o recalculava por truthiness da
  string crua e `core` apara espaço, então `image_mobile: "   "` fazia a loja reaproveitar a arte do
  computador **sem a tela avisar**. `menuBannerArt`/`menuBannerImage` passaram a ser exportados de
  `@estrelinha/core/menu`, o painel os chama, e um caso novo compara os dois vereditos no mesmo
  teste.
- **O escopo de `menuSurfaceSingleOwner.test.ts` era `['apps']`**, e a function do sitemap pedia
  `show_in_menu` no `select`. A coluna saiu da lista e o escopo passou a incluir
  `supabase/functions/**` — guarda com alcance menor que a regra é allowlist com outro nome.

**A feature `38` (performance no celular) somou +326 em quatro workspaces**, medidos em 2026-09-05 um
por vez e com exit code capturado sem pipe: **store +269**, **core +31** (o módulo `rendition`),
**functions +20** (o `preload` da página do produto) e **catalog-import +3** (a constante de cache).
O backoffice ficou em +3, e `packages/core/src/payment/**` não foi tocado — conferido por
`git diff --name-only`. Lint e tipos não mudaram.

> **A baseline desta feature esteve errada DUAS vezes antes de ser escrita certa**, e as duas foram
> pegas pelo verificador independente, nenhuma pelo autor: primeiro `6127 em 351` — desatualizada
> **e** mal somada —, depois `6454 em 352`, que envelheceu em 4 testes no commit seguinte. É a
> própria lição desta seção acontecendo de novo: **meça na hora de escrever, e some conferindo**.

**A feature `37` (frete grátis configurável) somou +86 em três workspaces**, medidos em 2026-09-05 um
por vez e com exit code capturado: **store +45**, **core +32** (a regra pura, 26, e o hook, 6) e
**backoffice +9** (o interruptor e a recusa de "ligado sem faixa"). Functions e catalog-import não
foram tocados, e `packages/core/src/payment/**` também não — conferido por `git diff --name-only`.
Lint ficou em **27/5** e tipos em **0·0·0**, sem mexer.

**A integração do Melhor Envio somou +26 em três workspaces**, medidos em 2026-09-05 um por vez e com
exit code capturado: **core +17/+1** (`quotePayload`, o dono único do corpo da cotação), **store +5**
(o mapper delegando, e o prazo com `handling_days` na página do produto) e **backoffice +4/+1**
(`originZipNotRead`). Lint ficou em **27/5** e tipos em **0·0·0**. `packages/core/src/payment/**` não
foi tocado.

> **A cotação de frete nunca tinha funcionado, e nada acusava.** As três `MELHOR_ENVIO_*` não
> existiam em lugar nenhum — nem no `config.toml`, nem no `.env.example`, nem na checagem de secrets
> do CI. A function respondia 500 `Unauthenticated.` no local **e em produção**, `DeliveryBlock`
> convertia a falha na opção única "Frete padrão" (SHP-05), e **todo pedido cobrava R$ 9,90 fixo**,
> para qualquer CEP e qualquer peso. Medido no dia do conserto: a mesma sacola cotava R$ 17,89–34,86
> para São Paulo e R$ 62,31–163,64 para Rio Branco.
>
> **Os 46 testes do caminho de frete passavam** — eles mockam `supabase.functions.invoke`, então
> provam o mapeamento e nunca a integração. É a lição do `AD-012` noutra roupa: **mock é afirmação, e
> integração só se prova com probe contra o serviço**. Detalhe em [`supabase/CLAUDE.md`](supabase/CLAUDE.md).

> **A queda de 3 em `drawerFacts.test.ts` (15 → 12) é contrapartida declarada**: os três casos de
> `freeShippingProgress` reapareceram em `core/src/shipping/__tests__/freeShipping.test.ts`, e o
> terceiro teve o **veredito invertido de propósito** — faixa zerada devolvia "frete grátis sempre",
> que era a leitura que custava dinheiro. `FreeShippingBar.tsx` foi apagado **sem** perda de
> contagem: nunca teve teste, porque nunca teve consumidor.

Os cinco workspaces foram remedidos em **2026-08-30**, por workspace e com exit code capturado, e os
cinco passam limpos. A feature `35` (clientes e pedidos da Nuvemshop) somou **+201** em três deles:
**catalog-import +174** (parser de CSV, recorte dos dois negócios, de-para de status, casamento com o
catálogo, snapshot e escrita idempotente), **store +21** (o guarda da migration) e **backoffice +6**
(o guarda de proveniência e a cobrança por WhatsApp com telefone). Core e functions não mudaram.

**O backoffice foi a 1773/108 em 2026-08-30**, fora de feature: a foto e o link do produto na tela
do pedido (`+11` — 6 casos novos em `AdminOrderPage.test.tsx`, e o arquivo novo
`entities/order/api/useAdminOrder.test.ts`, que guarda o recorte dos `product_id` procuráveis).
Lint e tipos não mudaram (25/4 · 0). Os outros quatro workspaces não foram tocados e não foram
remedidos.

> **O lote sequencial dos cinco workspaces REPROVOU store e backoffice, e os dois passam sozinhos.**
> Medido na `35`, com o servidor de dev e um navegador de cima. Não é a mesma flake do `pnpm test`
> paralelo — é a mesma **causa**: jsdom sob carga estoura o timeout de 5s dos testes que varrem
> disco. Antes de investigar uma reprovação, feche o que estiver rodando e repita o workspace
> sozinho; se reprovar sozinho, é defeito.

> **Rode um workspace por vez.** Duas suítes concorrentes saturam a máquina e produzem timeout de 5s
> em testes que varrem disco — medido na `34`, em `routes.test.ts` (store) e `AdminOrdersPage.test.tsx`
> (backoffice), os dois verdes isolados. É a mesma flake que motiva o `--concurrency=1` no CI, e ela
> aparece igual na máquina de quem desenvolve.

**O lint MELHOROU de 30/8 para 27/5**, e não por trabalho de lint: `OrderDetailDialog.tsx` foi apagado
na `34` e levou junto três `no-explicit-any`. Baseline que cai também precisa ser anotada — senão a
próxima feature compara contra folga que não existe mais. **A `35` manteve 27/5**, medido em
2026-08-30 (store 2/1 · backoffice 25/4).

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
  - **Medido em 2026-08-29. Hoje o disco tem 48**, e as pendentes são as das features `37`
    (frete grátis) e `39` (menu configurável) — o `Supabase Deploy` as aplica no push em `master`.
    A da `39` **converte `show_in_menu` em coluna gerada** e é idempotente por construção; a
    conversão é guardada por `attgenerated = ''` justamente porque uma segunda execução sobre a
    coluna já derivada apagaria curadoria em silêncio.
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

- **O MENU NASCE VAZIO NOS DOIS DISPOSITIVOS, e montá-lo é passo de operação** (feature `39`). As 37
  categorias têm `menu_desktop` e `menu_mobile` em `false`, e o único item semeado é o link "Sobre".
  Depois do deploy, a barra do topo mostra **um** item e a folha do celular também — até a Adri
  ligar as coleções em `/admin/menu`, **uma aba por vez**: ligar no computador **não** liga no
  celular. É o mesmo formato de dívida do interruptor do frete grátis: sem este registro, a loja fica
  meses com o menu quase vazio porque ninguém soube que havia uma tela.
- **A `39` NÃO tem `validation.md`.** Os cinco lotes foram medidos por workspace, com exit code
  capturado, e os guardas novos tiveram a sensibilidade provada por injeção real de falha — mas
  ninguém conferiu a feature contra a spec com olhos frescos, e **a prova em navegador não foi
  feita**. Ela importa mais que o normal aqui: o que a feature entrega é **largura** (a barra que
  rola em vez de recusar) e **prévia** (o iframe em 390 e em 1024), e **jsdom devolve 0 para toda
  medida de layout**. A fila de pendências de verificação independente ganhou mais uma.
- **O FRETE GRÁTIS NASCE DESLIGADO, e ligar é passo de operação** (feature `37`, `AD-027`). Depois do
  deploy desta feature a loja **não anuncia nem concede** frete grátis até alguém ligar em
  `/admin/configuracoes` → aba Frete. Decisão do usuário, com o custo declarado e aceito — mas sem
  este registro a loja fica meses assim porque ninguém soube que havia um interruptor.
- **A `37` tem `validation.md`, e o autor também é o verificador.** Quarta seguida. A evidência é
  medida e os guardas novos tiveram a sensibilidade provada por injeção de falha; o que falta é a
  prova em navegador real, em 390 e 1440, com o interruptor nos dois estados — e ela importa mais
  que o normal, porque o que muda ao desligar é **presença de bloco** (a faixa some do topo da gaveta
  e do resumo), e jsdom devolve 0 para toda medida de layout.
- **A `36` tem só `spec.md`** (metadados e dados estruturados): não foi implementada, e o número
  segue consumido.
- **A feature `31` não tem spec.** O guia de material foi implementado no commit `fcd3942` e está
  documentado em `apps/store/CLAUDE.md`, mas não existe `.specs/features/31-*` nem handoff na
  `STATE.md`. O número segue consumido.
- **A `32` não tem `validation.md`** e não passou por Verifier independente. Os 24 testes cobrem os
  requisitos que jsdom alcança e carregam o sensor da cicatriz da chave (`LST-04`), mas ninguém
  conferiu a feature contra a spec com olhos frescos. Mesma pendência da `22` e da `28`.
- **A `35` tem `validation.md`, e o autor também é o verificador.** Terceira seguida. A evidência é
  toda medida — 3 execuções reais do importador contra os arquivos da loja, 9 blocos de probe SQL, e
  navegador em 390 e 1440, onde saiu **um defeito que teste nenhum pegaria**: a coluna
  `orders.customer_phone` estava gravada em 35/35 pedidos, o teste dela passava, e **todo** link de
  cobrança por WhatsApp saía sem número — porque a view `order_list` enumera colunas uma a uma e os
  três chamadores da tela ignoravam o telefone. Três peças certas, resultado errado.
- **A `34` tem `validation.md`, e o autor também é o verificador.** Segunda seguida. A evidência é
  toda medida — probes HTTP, injeção de falha nos guardas novos, e navegador real em 390 e 1440, onde
  saíram três defeitos que teste nenhum pegaria (números que se contradiziam na mesma tela). Ainda
  assim, ninguém de fora conferiu contra a spec.
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
- **`BL-008` foi REDUZIDA, não fechada** (feature `34`). `fetchStatusCounts` deixou de existir: as
  contagens de aba e de tile agora são `select('id', { count: 'exact', head: true })`, então **o
  servidor conta e nenhuma linha atravessa a rede** — não há teto a herdar. As outras leituras sem
  paginação do painel continuam abertas.
- **`BL-009` está FECHADO** (feature `39`, T19). `uploadImageBlob` saiu de `features/product-form/lib`
  para `shared/lib/uploadImage.ts` — o editor de banner do menu precisava dela, e `features/` não
  importa de `features/` —, e o `||` com o `SUPABASE_URL` de **outro projeto** foi apagado no mesmo
  movimento: o client já lança sem a env, então o fallback era inalcançável e mentiroso.
  `BL-010`/`BL-011` seguem abertas.
- **`BL-027` está FECHADO** (2026-09-06). O removedor de comentário de
  `freeShippingSingleOwner.test.ts` passou a fazer linha e bloco na **mesma** varredura, e três
  sensores provam o CRLF, o LF e o glob de dois asteriscos que o cegava. **Nenhuma asserção de regra
  passou a reprovar** — o ponto cego não escondia leitura nenhuma; escondia a *possibilidade* de
  esconder. Achado ao fechar, e **não consertado**: `previaUnica.test.ts` (backoffice) ainda faz
  duas passadas, embora o `BACKLOG.md` o listasse como exemplo da forma correta.
  *(Registrado como `023` e não `018` porque o `018` já estava ocupado.)*
- **`BL-028` está FECHADO** (2026-09-06). A faixa de departamentos ganhou degradê nas bordas e setas
  nas pontas, presentes **só** do lado em que há conteúdo além da dobra — e nenhum quando ela cabe,
  que é o caso normal (3 itens). O estado vem da posição real de rolagem
  (`shared/lib/useOverflowAffordance`), não de contagem de itens. A **roda vertical não foi
  sequestrada** e o teclado continua sendo do navegador. Fica aberto só o item (4) da entrada: avisar
  em `/admin/menu` quando a curadoria não couber em 1440.
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
| O menu de cada dispositivo | `/admin/menu` | `menu_desktop` e `menu_mobile` nascem `false` nas 37 categorias ⇒ barra do topo e folha do celular vazias. **São duas curadorias**, e ligar numa não liga na outra (feature `39`). O único item semeado é o link "Sobre", em `store_settings.menu` |
| Arte da vitrine | `/admin/categorias` | nenhuma das 37 categorias tem `banner_url` ⇒ a grade de banners não aparece |
| Perguntas frequentes | `/admin/perguntas` e a aba `Perguntas` do produto | a `28` semeou 67 entradas e 3.475 vínculos das descrições |
