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
    (frete grátis configurável), a `38` (performance no celular), a `39` (menu configurável), a
    `40` (estabilidade da home), a `41` (banner principal da home), a `44` (gaveta de material), a
    `45` (as políticas da loja), a `46` (as perguntas frequentes da loja), a `47` (painel em foco) e
    a `49` (checkout sem conta) estão FECHADAS. A `36` (metadados e dados estruturados) tem **só
    `spec.md`** e não foi implementada — o número está consumido de qualquer forma. A `48` (usuários
    do painel) é de **outra sessão** e tem spec própria. A próxima é a `50`.**
  - **A `46` e a `47` correram EM PARALELO, em worktrees separados**, e é o segundo caso do projeto
    (o primeiro, a `45`, dividiu uma working tree só). O que mudou: a divisão foi por **árvore**, não
    por arquivo — a `47` nasceu de um `git worktree` sobre o HEAD local e trouxe a `46` por
    `merge --ff-only` antes de começar. Funcionou melhor que a `45`, **e mesmo assim vazou**: a `46`
    deixou duas suítes reprovando e um erro de `tsc` que a `47` herdou e teve de registrar na
    baseline para não confundi-los com regressão própria. **Worktree separado isola a edição, não a
    medição.**
  - **A `45` foi executada em uma working tree COMPARTILHADA com outra sessão**, e é o primeiro caso
    do projeto. A outra entregou `/cuidados-com-sua-joia-afetiva` sobre o `PolicyDocument` da `45` e
    **removeu `/politicas`** — o que revogou dois requisitos da `45` no meio da execução
    (`POL-15`/`POL-16`, registrados como superseded na `spec.md` dela, não apagados). O que fez isso
    funcionar foi dividir a **propriedade dos arquivos** por escrito antes de editar, com atenção
    especial às **âncoras de contagem compartilhadas** (`ROUTE_SLUGS`, `SITEMAP_STATIC_PATHS`, as
    contagens de `routeSplitting`/`sitemapRoutes` e o `<loc>` do sitemap): duas sessões somando +1
    cada na mesma âncora produzem um número que nenhuma das duas mediu. Aqui o líquido era **zero**
    — uma rota saiu e outra entrou —, e só se sabe disso conversando.
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

**Quando um widget precisa de algo que outro widget tem, a resposta é uma camada ESTRITAMENTE
ABAIXO — nunca um import lateral.** Qual camada depende de onde estão os consumidores (`AD-033`):

- **Apps ou serviços diferentes** (loja × painel, loja × edge function) ⇒ `packages/core`. Foi assim
  que `MATERIAL_GUIDE_PATH` acabou em `@estrelinha/core/routes`, e é o caso de `core/menu`,
  `core/home`, `core/shopping`, `core/shipping` e `core/media`.
- **Dois widgets do MESMO app** ⇒ `entities/`. Foi assim que o conteúdo do guia de material saiu de
  `widgets/material-guide/model/` para `entities/material/model/` na feature `44`, lido pela página
  do guia e pela gaveta da página do produto. Levá-lo a `core` custaria uma dependência
  `core → @estrelinha/ui` (o tipo `EstrelinhaIconName`), que `core/menu/__tests__/purity.test.ts`
  proíbe — ou um segundo vocabulário de ícones em `core`, que é uma cópia para evitar uma cópia.

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
| `44` | **o mesmo conteúdo, agora com DOIS leitores** — a página do guia e a gaveta da página do produto —, e o tom `alerta` do aviso, que a gaveta ia copiar | `entities/material/model/` (`AD-033`) e `entities/material/ui/MaterialAviso`, com `donoUnicoDoGuia.test.ts` recusando a segunda declaração e o import lateral |
| `33` | o escape de XML e a leitura completa paginada, cada um com um consumidor prestes a virar dois | `@estrelinha/core/xml` e `@estrelinha/core/paging` |
| `35` | o telefone da cliente, que existia no checkout e **não era persistido** — e a coluna crua do status da origem, que viraria um segundo dono de "este pedido foi pago?" | `orders.customer_phone` (snapshot) e as colunas `nuvemshop_*_status`, que **nenhuma tela lê** (`provenanceNotRead.test.ts`) |
| `34` | o contraste WCAG (só a loja tinha), a aritmética de página (só produtos tinha), e os rótulos de `payment_status` em **três** cópias | `@estrelinha/core/color`, `core/paging/pageMath.ts` e `entities/order/api/orderQuery` |
| `37` | **o frete grátis, lido por SETE superfícies em duas leituras que discordavam** — com a faixa em zero, três escondiam o texto e quatro **zeravam o frete**. Zerar o campo no painel escondia o anúncio e liberava frete grátis para todo mundo no caixa | `@estrelinha/core/shipping` (`freeShippingState`), com `freeShippingSingleOwner.test.ts` recusando leitura direta |
| `41` | **a arte por dispositivo, que a `39` já tinha escrito duas vezes** — `menuBannerArt` em `core` e o mesmo predicado recalculado no painel por truthiness da string crua. Com o carrossel da Home os consumidores viraram quatro | `@estrelinha/core/media/surfaceArt.ts`, com `menuBannerArt` **delegando** e `surfaceArtSingleOwner.test.ts` recusando a volta (`AD-030`) |
| `47` | **a folga entre o palco e o quadro da prévia**, declarada uma vez em cada palco (`HomeLivePreview.tsx:33` e `MenuLivePreview.tsx:31`). Mudar uma e não a outra fazia as duas prévias escalarem diferente — build, `tsc` e teste de componente verdes | `previewFrame(device, box, fullscreen)` em `@estrelinha/core/home`, que recebe a **caixa** e aplica a folga dentro de `core`; `folgaDoPalco.test.ts` recusa a volta, inclusive na forma sem nome |
| `39` | **o DESENHO do menu, de novo** — `MenuBarPreview.tsx` redesenhava a barra do topo à mão no painel, com a paleta do admin, e anunciava `/crie-seu-botton`, que **nunca foi rota**. É o mesmo defeito que a `25` apagou da Home; no menu ele nunca tinha saído. E, ao lado dele, o **papel** de cada categoria (barra × painel), que uma coluna nova teria dessincronizado no primeiro "mover categoria" | a prévia É a loja, num iframe (`MenuLivePreview`), e o papel é **derivado da árvore** dentro de `menuItems(input, surface)` — a porta única das quatro superfícies |
| `49` | **três donos de uma vez, e o pior deles ainda não existia.** (1) "Este e-mail pode seguir como convidada?" ia nascer **duas vezes** — uma na tela, para mostrar o desafio de código, outra no servidor, para recusar a gravação —, e divergir faria a loja deixar passar quem o servidor recusa. (2) "Como nasce um pedido" ia ficar com **dois caminhos**, o `insert` do navegador para quem tem sessão e a function para a convidada. (3) `corsHeaders` já estava escrito **três vezes** nas edge functions, e a function nova seria a quarta | `resolveCheckoutIdentity` em `@estrelinha/core/checkout`, chamado igual pela tela e pelo servidor; **uma** function grava todos os pedidos, com `pedidoComDonoUnico.test.ts` recusando a volta; e `_shared/http.ts`, de onde as outras **reexportam** (`toBe`, não `toEqual`) |
| `50` | **o esqueleto de carga e a revalidação, que eram a MESMA chamada** — `fetchSections()`/`fetchCategories()` significavam "carregar" e "revalidar" ao mesmo tempo, e a tela só sabia ler a primeira: toda gravação trocava a árvore por `<TableSkeleton/>`, o que **desmontava o `<iframe>` da prévia** e recarregava a loja a cada clique. E, ao lado, dois campos **de tela** do rascunho a um `insert` de distância de virar `PGRST204` | `fetchX(modo)` com o tipo `FetchMode` em **um** arquivo (`shared/lib/fetchMode.ts`) — dois nomes para o mesmo modo seriam o defeito no tamanho de um tipo, e o terceiro hook nasceria com um terceiro nome —, mais `toNewItems` como a única tradução rascunho → colunas, com `toNewItems.test.ts` recusando a oitava chave |

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
| `alvoDeToqueNaoRoubaPosicao.test.ts` | store `shared/lib/__tests__` (varre `apps/**` e `packages/ui/**`) | um controle posicionado perder a posição para `TAP_44`/`TAP_ROW`, **nas duas formas de juntar classe**: `cn(classes, TAP_44)`, onde o `relative` do auxiliar **apaga** o `absolute` na fusão do `twMerge`; e `` `${TAP_44} absolute …` ``, onde não há fusão, as **duas** classes chegam ao DOM e `.relative` vence por vir **depois** de `.absolute` na folha com a mesma especificidade. A régua **calcula** — chama o `cn` de verdade e recusa o par ambíguo —, nunca confere a ordem dos argumentos, que é o proxy que falhou quando a forma mudou. **Âncora tripla** (arquivos lidos, **as duas formas** encontradas, e o `relative` ainda presente nos auxiliares) e **dez sensores**, incluindo o inverso das duas formas, o par que prova que controle em fluxo **não** é acusado, e o que prova que posição escrita por **outra** interpolação não é atribuída ao literal |
| `importOrder.test.ts` | idem | `App.css` importado **antes** de `@estrelinha/ui/styles.css` no `main.tsx` |
| `reservedSlugs.test.ts` | idem | rota nova no `App.tsx` que não entrou em `ROUTE_SLUGS`; entrada de `ROUTE_SLUGS` que deixou de ser rota. **Bidirecional** |
| `vercelRedirects.test.ts` | idem | `vercel.json` divergir de `LEGACY_REDIRECTS`; `trailingSlash` deixar de ser `false`; redirect usando `permanent` (que produz 308); o catch-all do SPA sair do fim da lista de `rewrites`; os headers de segurança mudarem; o `rewrite` ou o `Content-Type` de `/sitemap.xml` sumirem |
| `robotsSource.test.ts` | idem | `public/robots.txt` perder a linha `Sitemap:`, ganhar uma segunda, declará-la relativa, ou apontar fora de `/sitemap.xml`; uma diretiva `Disallow` entrar de carona |
| `chaveDeServidorForaDoNavegador.test.ts` | store `shared/lib/__tests__` (varre `apps/**`) | qualquer arquivo dos **dois apps** nomear `SUPABASE_SERVICE_ROLE_KEY`, carregar a string `service_role` ou chamar `auth.admin.*` — a chave ignora toda RLS, e um `createClient` com ela em `apps/**` **funcionaria perfeitamente**, entregando o banco inteiro a qualquer visitante. A porta é a function `admin-users` (`AD-034`). **Âncora TRIPLA** (arquivos lidos · um arquivo de cada app nomeado, `L-035` · a porta legítima encontrada) e **treze sensores**, incluindo as três formas de `auth.admin.`, o CRLF, o LF, o glob de dois asteriscos (`BL-027`) e os **dois inversos** que provam que `functions.invoke` e a auth do próprio usuário não são acusados. **Allowlist de UM**, escrito literalmente — o próprio guarda, que precisa carregar as formas proibidas nos sensores —, com um caso provando que outro arquivo de teste **seria** acusado |
| `rotasSobGuarda.test.ts` | backoffice `app/__tests__` | qualquer rota `/admin/*` do `App.tsx` ficar **fora** do `<Route>` cujo element é o `RequireAdmin` — menos `/admin/login`, que precisa estar fora e tem asserção própria dizendo isso. Mede **posição**, não presença: `navItems.test.ts` lê o mesmo arquivo com um regex plano e é **cego a aninhamento**, o que deixou duas telas vazarem com 2328 testes verdes. Também recusa o `RequireAdmin` perder o `loginPath="/admin/login"` (sem ele a lojista é mandada para a tela de cliente da LOJA). **Âncora tripla** — arquivo lido, bloco **recortado** (recorte que falha devolve `null` e REPROVA, em vez de virar bloco vazio que aprova tudo), e exatamente **um** `</Route>`, para que aninhar um Route com filhos faça o guarda gritar em vez de encolher. Seis sensores, incluindo o inverso e o `RequireAdmin` sumindo |
| `adminUsersSchema.test.ts` | idem | a migration da `48` afrouxar: `guard_last_admin` deixar de decidir por **contagem** (e passar a comparar identidade); o `id <> old.id` sumir do `count` — sem ele o trigger é `before`, a linha ainda conta, e o guarda **nunca dispara**; o trigger virar só `before delete`, liberando rebaixar o último admin por `update`; o `pg_advisory_xact_lock` sumir, deixando duas remoções simultâneas passarem as duas; o `errcode 23514` virar genérico; `grant` alcançar `anon`; escrita de dado entrar na migration. **Âncora dupla** e **onze sensores por mutação** |
| `materialTransitions.test.ts` | idem | a máquina de estado do material em **SQL** divergir da em **TypeScript**; `set_material_tracking` escrever coluna além do rastreio e do estado; a migration abrir policy de `UPDATE` em `orders` ou conceder `execute` a `anon` |
| `homeSections.test.ts` | idem | o catálogo de tipos divergir do `check` **vigente** (o da migration da `41`, que recria a constraint); a semente divergir de `DEFAULT_HOME_COMPOSITION`; entrar tipo de contagem regressiva ou de prova social; policy de escrita sem `has_role`; `grant` alcançar `anon`. **Desde a `41` guarda a TROCA do guarda do banco nos dois sentidos** (`AD-029`): `guard_last_active_home_section` existe e decide por **contagem** (nunca pelo tipo da linha), **e** `guard_hero_home_section` foi derrubado — função e trigger. Também recusa `insert`/`update`/`delete` de dado na migration da `41` |
| `faqSchema.test.ts` | idem | a migration da `28` afrouxar: `grant` a `anon`; policy sem `has_role`; `faq_id` deixar de ser `on delete restrict`; sumirem os `check` de 160/600; a view perder `security_invoker` |
| `googleShoppingSchema.test.ts` | idem | a migration da `30` afrouxar; o interruptor do feed nascer ligado; os limites do TypeScript divergirem do `.sql` |
| `menuSchema.test.ts` | idem | a migration da `39` afrouxar: `show_in_menu` deixar de ser **gerada**; o índice parcial sumir na recriação; a semeadura do link "Sobre" perder o `NOT value ?`/`do nothing` (viraria escrita destrutiva a cada `db push`); `grant` alcançar `anon`. **Âncora dupla** e sensor por mutação |
| `menuIconCatalog.test.ts` | idem | chave de `MENU_ICON_KEYS` sem componente em `MENU_ICON_COMPONENTS`, ou o contrário; a loja voltar a importar ícone de `@/shared/ui/icons`. **Bidirecional**, com âncora de contagem |
| `menuSurfaceSingleOwner.test.ts` | idem | qualquer arquivo de `apps/**` ler `show_in_menu` ou `menu_promo` — a primeira é **coluna gerada** e a segunda é legado; quem responde "está no menu?" é `menuItems(…, surface)`, porque a resposta depende do dispositivo. **Zero allowlist**, escrito literalmente, e sensor do ponto cego do comentário |
| `menuSemItemFixo.test.ts` | idem | `FIXED_ENTRIES` (com qualquer um dos dois nomes) voltar a existir; `/crie-seu-botton` reaparecer; destino literal (`to="/…"`) nas quatro superfícies de menu da loja fora do chrome (`/`, `/conta`, `/favoritos`). **Âncora dupla** e quatro sensores |
| `menuSemTeto.test.ts` | idem | `MENU_SLOT_LIMIT`, `slotsUsed`, `menuSlotRefusal`, `menuEntries`, `MenuEntry`, `resolvePromo` ou `ResolvedPromo` voltarem a `apps/**` ou a `packages/core/src/menu/**`; vocabulário de "vaga" nas cinco superfícies de menu; a barra trocar `overflow-x-auto`/`min-w-max` por `flex-wrap` (embrulhar **esconde** o estouro); a **afordância** de rolagem sumir da faixa cheia — o estado medido, os dois degradês e as duas setas rotuladas (`BL-028`). **Âncora dupla** e dez sensores — incluindo a prova de que `MobileMenuEntry` **não** é acusado, e as duas réguas da `BL-028` escritas como **predicado**, para asserção e sensor chamarem a mesma função |
| `sanitizeHtml.test.ts` | idem | a allowlist aceitar atributo, `href` deixar de passar por `new URL`, ou `script`/`style`/`iframe` voltarem a desembrulhar em vez de sumir |
| `categoryTreeSingleOwner.test.ts` | idem | qualquer arquivo de `apps/store/**` fora de `useCategories.ts` abrir `from('categories')` — a árvore tem **um** dono, e é a chave `['categories']` que o header já preenche. **Zero allowlist**, âncora dupla e sensor de comentário |
| `arbitraryTextColor.test.ts` | idem | cor de texto **arbitrária** (`text-[hsl(…)]`, `text-[#…]`, `text-[rgb(…)]`) fora de um allowlist de dois, ou com contraste abaixo de 4,5:1 **contra o fundo declarado**. `contrast.test.ts` mede tokens e não alcança essa sintaxe. O guarda **calcula** a razão — não confia no comentário |
| `cardSkeletonBox.test.ts` | store `entities/product/ui/__tests__` | o `ProductCard` e o `ProductCardSkeleton` divergirem numa das quatro classes que produzem altura. jsdom devolve 0 para layout, então nenhum teste de componente pega — este lê os dois do disco. Modela o **par** (`min-h-[40px]` no card × `h-[40px]` no esqueleto), e a régua é de **token exato**, porque `'min-h-[40px]'.includes('h-[40px]')` é `true` |
| `semMaterialNaPaginaDoProduto.test.ts` | store `entities/product/ui/__tests__` | a página do produto voltar a dizer **QUAL** material — `MaterialNotice`, `material_kinds`, `materialKindsOf`, `materialKindLabel`, `MATERIAL_KIND_LABELS`, `materialSummary` ou `materialAnchor`, em **qualquer** arquivo de `entities/product/ui`, `widgets/product-buy-bar` ou `ProductPage.tsx`; `MaterialNotice.tsx` reaparecer no disco. **A `44` ESTREITOU a régua**: `requiresMaterial` saiu dela — a página voltou a poder dizer que *existe* material (é o que acende a linha "Como enviar seu material de DNA") e continua proibida de dizer *qual*. A gravação (`MAT-03`) nunca foi acusada. **Âncora dupla**, **sete sensores** (um por forma, não um bloco) **mais o sensor inverso** provando que `requiresMaterial` passa, mais a prova de que o escopo é fronteira e não vazio (o dono do conteúdo, fora do escopo, é acusado pela mesma régua) |
| `donoUnicoDoGuia.test.ts` | store `entities/material/model/__tests__` | uma segunda declaração de `FICHAS_DE_MATERIAL`, `CARTOES_DE_MATERIAL`, `PREPARO_EM_CASA`, `PASSOS_DO_ENVIO`, `ATALHOS_DE_MATERIAL`, `VIDEOS_DE_PREPARO`, `FORMAS_DE_ENVIO` ou `CHECKLIST_DO_ENVIO` fora de `entities/material/model`; `widgets/material-guide/model` voltar a existir; a gaveta e o guia importarem um do outro; `MATERIAIS_SEM_ANCORA` deixar de ser vazio. A régua procura **declaração**, nunca menção — proibir o consumo seria proibir o uso que ela existe para proteger. **Âncora dupla** e remoção de comentário com CRLF, LF e o glob de dois asteriscos |
| `politicaComDonoUnico.test.ts` | store `pages/__tests__` | o mesmo **título de seção** de política ser declarado em dois arquivos de `pages/` — são **três** documentos `PolicyDocument` (trocas, privacidade, cuidados com a joia), e "Cuidados com a peça" × "Cuidados gerais com a joia" é o par que vai divergir; qualquer arquivo de `apps/store/**` linkar para `/politicas`, **com ou sem fragmento** — a rota foi removida, então o endereço nu também é 404. A régua procura **declaração**, nunca menção, e o recorte é `(?![-\w])` e **não** `\b`: `-` não é caractere de palavra, então `\b` não fecha nada e `/politicas-de-trocas-e-devolucoes` seria acusado junto (`L-034`). **Âncora dupla** (arquivos lidos + títulos encontrados + pelo menos três declarantes) e **sete sensores**, incluindo o inverso que prova que as duas políticas VIVAS passam |
| `rotuloCurto.test.ts` | idem | entrada de `ATALHOS_DE_MATERIAL` sem `rotuloCurto`, com rótulo vazio ou acima de **20 caracteres**; `rotulo` deixar de ser o título completo (o seletor do guia usa ele, a gaveta usa o curto). **Âncora de contagem** derivada das três origens — um mapa que perdesse `...PREPARO_EM_CASA` passaria com 8 entradas conformes |
| `heroSemOpacidadeZero.test.ts` | store `widgets/hero-banner/ui/__tests__` | o elemento do LCP voltar a nascer invisível — `opacity: 0` em **qualquer** lugar do `HeroBanner.tsx`, variant ou prop inline. Também recusa apagar a animação inteira: o pedido é entrar **sem esconder**, não deixar de entrar. **Ampliado na `41`** para a classe utilitária, o valor arbitrário (`opacity-[0]`) e o `fade-in` do `tailwindcss-animate` |
| `heroCarouselSemOpacidadeZero.test.ts` | store `widgets/hero-carousel/ui/__tests__` | a mesma régua no bloco da `41`, em **cinco grafias**: objeto do framer, `style` inline, classe utilitária (`opacity-0` e `opacity-[0]`, com prefixo), `invisible`, e as **animações de entrada** — o `fade-in` do `tailwindcss-animate` **e** o `animate-fade-in`/`animate-scale-in`/`animate-slide-up` do preset deste repositório, que compilam para opacidade zero e **não contêm a palavra `opacity`**. Varre o widget **e o registro `tipo → componente`**, porque a AC diz "em nenhum ponto do caminho até ele". **Âncora quádrupla** (a quarta lê o preset e prova que as classes acusadas EXISTEM mesmo) e dezesseis sensores, incluindo o par que prova que `opacity: 0.5`, `opacity-70`, `fade-in-50`, `zoom-in-95`, `animate-bounce-cart` e `bg-…/90` **não** são o defeito |
| `surfaceArtSingleOwner.test.ts` | store `shared/lib/__tests__` (varre `apps/**` e `packages/**`) | qualquer arquivo de produção fora de `core/media/surfaceArt.ts` decidir **entre a arte de celular e a de computador** — `\|\|`, `??` ou ternário, **inclusive quebrados em linhas**, que é a forma que o Prettier produz sozinho. A régua exige **uma de cada superfície**: a primeira escrita acusou `CollectionFeature.tsx:55`, que é outra regra ("a arte do item vence a do destino") e legítima. Também recusa o dono **deixar de ser chamado** por `core/menu` e `core/home`. Pega também as formas **sem operador nenhum**: o array das duas artes e a reatribuição condicional (`if (!image) image = …`). **Âncora dupla** e treze sensores — o ternário cuja condição é a superfície (a forma que a primeira régua deixava passar, e exatamente como `menuBannerImage` estava escrito), o `\|\|` quebrado em linhas, o CRLF, o LF, o glob de dois asteriscos (`BL-027`), e os três pares que provam que linhas vizinhas de objeto, `if` com **outra** variável e **lista de nomes de campo** não são acusados — este último achado contra `MenuBannerEditor.tsx:103`, que percorre nomes de coluna para limpar campo vazio |
| `importSchema.test.ts` | store `shared/lib/__tests__` | a migration da `35` afrouxar: índice de idempotência virar parcial; `security_invoker` sumir de `customer_directory`; o agregado de telefone da convidada perder o `FILTER (WHERE … IS NOT NULL)`; `handle_new_customer` perder o `security definer`; a adoção por e-mail deixar de recortar `customer_id IS NULL` ou de comparar por `lower()`; `grant` alcançar `anon`. **Cada asserção tem sensor por mutação** |
| `checkoutSchema.test.ts` | store `shared/lib/__tests__` | a migration da `49` afrouxar: coluna sem `if not exists`; o índice de `client_request_id` deixar de ser único **ou** deixar de ser parcial; `account_exists` perder o `security definer` ou o `search_path` vazio; a comparação deixar de ser por `lower()`; `grant` alcançar `anon`; a migration passar a escrever dado. **E guarda uma dependência que ela NÃO escreve**: o `WHERE NOT EXISTS` de `customer_directory` (migration `35`), que é o que impede a convidada de aparecer **duas vezes** na tela de Clientes agora que ela vira `customers` de verdade. **Cada asserção tem sensor por mutação** |
| `wiringResolve.test.ts` | `supabase/functions/_shared/__tests__` | o `index.ts` de qualquer edge function **chamar um nome que ela não importa nem declara**. Percorre a **AST do TypeScript** e olha só `CallExpression` com callee `Identifier` — string, comentário, tipo, `obj.metodo()` e arrow `async (…) =>` ficam de fora **por construção**, não por lista de exceções (a primeira escrita era por regex e acusou oito falsos positivos). **Existe porque `index.ts` é o único arquivo do repositório que NENHUMA ferramenta lê**: nenhum teste o importa (`AD-004` manda a lógica para `handlers.ts`), `pnpm build` não o vê, `tsc` não o alcança (`esm.sh` + `Deno`) e `pnpm lint` não olha `supabase/`. Custou `mercado-pago` **fora do ar em produção por seis dias** — `500 WORKER_ERROR` em toda requisição, `create-payment` e webhook mortos — por um `createResendProvider` sem import. **Âncora DERIVADA** (um `index.ts` para cada diretório de function, contado do disco — número cravado já nasceu errado uma vez **e** cada um com ao menos uma chamada na AST, senão um parser quebrado aprovaria todos). Guarda também as **envs do remetente** (`T8`): nenhum entrypoint cita a aposentada `RESEND_FROM`, e os dois que compõem citam as **duas** metades e dez sensores, incluindo o defeito real reinjetado |
| `entregaDeEmailSchema.test.ts` | store `shared/lib/__tests__` | a migration da `52` afrouxar: `using (true)` voltar a `order_notes` ou a `order_status_history`; um `drop policy` faltando; `create policy` sem `has_role`; **o `with check` omitido** — a meia-correção que fecha a leitura e deixa a GRAVAÇÃO aberta, e que um teste de leitura não pega; `to public` em vez de `to authenticated`; `revoke` de `anon` sumindo; escrita de dado entrar. **Guarda a queda nos DOIS sentidos**: as três peças de compatibilidade da `42` (view `order_emails` + as duas RPCs) caem **e** as três do motor (`order_notifications`, `claim_order_notification`, `finish_order_notification`) não. **Âncora tripla** e **8 mutantes injetados no arquivo real**. O helper `mutar()` **lança** quando a mutação não muda nada — dois sensores já tinham virado no-op em silêncio por perderem o alvo do `.replace()` |
| `emailCheckWorkflow.test.ts` | idem (varre `.github/workflows/`) | o `email-check.yml` medir a si mesmo em vez da produção: **qualquer literal do domínio verificado**, inclusive em comentário; a declaração de cegueira sumindo (o parágrafo que diz que ele NÃO prova SMTP nem templates do GoTrue — apagá-lo faz o próximo leitor achar que o auth está coberto); o remetente do auth virando literal em vez de vir de `config.toml`; 429/timeout deixarem de ser **indisponibilidade**; o passo 1 largando o par `200` **+** chave `from` (sem os dois, um bundle velho responde **400** com JSON válido e o sensor acusa "configuração errada" com o defeito sendo deploy velho). **Também guarda a `DLV-26`**: o passo de divergência do `Supabase Deploy` avisa e **nunca** falha o job. Recorte por bloco, que devolve `null` e **reprova** — a primeira escrita usava `[\s\S]*?` sobre o arquivo inteiro e casava o passo ERRADO |
| `pedidoComDonoUnico.test.ts` | idem (varre `apps/store/**` e `apps/backoffice/**`) | qualquer arquivo de produção gravar em `orders` ou `order_items` pelo PostgREST — desde a `49` quem grava é a edge function `checkout`, e as policies de `INSERT` continuam abertas no banco de propósito (`BL-030`), então **este guarda é a única contenção**. **Zero allowlist**, âncora dupla, e sensores que provam: as duas formas de gravação (compacta e quebrada em linhas), que **ler** não é acusado, que um `insert` em outra tabela no meio não é atribuído a `orders`, e o removedor de comentário com CRLF e LF |
| `orderAccessSingleOwner.test.ts` | idem | qualquer arquivo fora de `entities/order/model/orderAccess.ts` citar `estrelinha-order-access` — o token é a **única** credencial de um pedido de convidada, e uma segunda leitura à mão faria a confirmação abrir vazia logo depois de ela pagar; o dono trocar `localStorage` por `sessionStorage` (fechar a aba apagaria o caminho de volta) |
| `desafioDeCodigoUnico.test.ts` | idem | um segundo campo de 6 dígitos em `apps/store/**` fora de `features/auth/ui/steps` — com o passo existente vêm o reenvio, o cooldown de 60s e a distinção entre código errado e expirado. **Tem o sentido positivo junto**: o desafio do checkout precisa **conter** `AuthCodeStep`, senão a ausência de um segundo campo seria verdadeira por não haver campo nenhum |
| `denoReach.test.ts` | `packages/core/src/checkout/__tests__` | um especificador relativo sem `.ts` — `import type` incluso — nos arquivos que a edge function importa por caminho (`identity.ts`, `guestAccess.ts`), ou um import de React/Supabase/Deno neles. O barrel fica **fora do escopo**, com a razão escrita no arquivo. Leitor injetável, com sensor de `import type`, do par com extensão, de CRLF e do removedor de comentário — que **reprovou o próprio arquivo certo** na primeira escrita, porque o cabeçalho dele cita `from './types'` em prosa |
| `http.test.ts` | `supabase/functions/_shared/__tests__` | uma segunda **declaração** de `corsHeaders` nas functions (eram TRÊS, idênticas, até a `49`); `mercado-pago` ou `send-notification` deixarem de reexportar a MESMA referência — a asserção é `toBe`, e não `toEqual`, porque igualdade estrutural passaria com uma cópia colada |
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
| `dialogGridTrack.test.ts` | store `shared/lib/__tests__` (varre `packages/ui/src/dialog.tsx` e `alert-dialog.tsx`) | `DialogContent` ou `AlertDialogContent` declararem `grid` sem trilha de piso zero. A coluna implícita `auto` toma como base a maior contribuição de **min-content** dos filhos, e `truncate` (que é `white-space: nowrap`) contribui com a linha inteira — `min-w-0` e `overflow` no caminho dão piso zero ao item, **não teto à contribuição**. Medido: trilha de 1141px num cartão de 660. **Mora na suíte da loja pelo mesmo motivo que `icons.test.ts`**; varre os dois arquivos porque o `alert-dialog` é cópia literal da mesma linha do shadcn. **Âncora dupla** (arquivos lidos **e** classe encontrada em cada um), **quarta âncora** lendo o preset para provar que `grid-cols-1` É `minmax(0, 1fr)`, e seis sensores — inclusive o par que prova que `grid` casa por token e não por prefixo de `grid-cols-1` |
| `icons.test.ts` | store `shared/lib/__tests__` (varre `packages/ui/src/icons`) | ícone fora da grade `0 0 24 24`; escala × traço ≠ 1,5; cor fora de `ICON_ACCENT`; ícone que não chegou ao barrel. **Mora na suíte da loja porque `packages/ui` não tem runner** — guarda que não roda é pior que guarda nenhum |
| `paths.test.ts` | store `shared/ui/brand/__tests__` | `paths.ts` divergir do SVG-fonte em um caractere; dois `<path>` do mesmo SVG com a mesma espessura |
| `previaUnica.test.ts` | backoffice `features/home-composition` | um segundo desenho da Home, do MENU **ou do CARROSSEL** voltar ao painel; `MenuBarPreview.tsx` reaparecer; um arquivo de `store-menu` importar `menuPanelColumns` ou `resolveMenuBanners` (calcular o desenho do painel da loja **é** o segundo desenho); qualquer dos dois importar de `apps/store`. **Cobre as features `25`, `39`, `41` e `47`**, com âncora dupla e sensor de CRLF/LF. A régua do carrossel é a **mecânica** (`snap-x`, `scroll-snap`, `aria-roledescription="carrossel"`, `setInterval`), não o nome do arquivo — "só uma mini-prévia para conferir a ordem dos banners" é o pedido razoável que traz o defeito de volta. **Desde a `47`** também recusa a tela cheia virando prévia nova: arquivo `…Preview` novo nas duas pastas de UI, um segundo `<iframe>` em qualquer arquivo, ou o palco ramificando por tipo de seção dentro do modo. O sensor **cria um palco sintético em `mkdtemp` e chama a régua de verdade** — simular o que ela devolveria não prova régua nenhuma |
| `animacaoRespeitaMovimento.test.ts` | backoffice `shared/lib/__tests__` | uma classe de `transition-*` ou `animate-*` sem o par `motion-reduce:` **na mesma linha**, em qualquer dos **nove** arquivos de UI em escopo — os oito que a `50` tocou mais o `ProductSearchField` da `51`, que **entrou na mesma task em que nasceu**, com as âncoras de contagem subidas junto (8/4 → 14/7). A régua é de **token exato** (`(?![-\w])`, `L-034`): `animate-spin` é dispensado — é indicador de progresso, não enfeite, e congelá-lo apagaria o único sinal de que a gravação está em curso —, mas `animate-spinner` e `animate-spin-slow` **são acusados**. **Âncora TRIPLA** (arquivos lidos · tokens de movimento encontrados · pares encontrados) e sete sensores: a classe sem par reprova e com par passa, `hover:` na frente não desculpa, `transition` pelado é acusado, a prosa que explica a regra **não** é (com CRLF **e** com LF), e o par a três linhas de distância não cobre nada. **O escopo é literal e estreito de propósito** — ver a dívida em *Estado conhecido* |
| `layoutDoCarrossel` (`ProductCarouselLayout.test.tsx`) | store `widgets/product-carousel/ui/__tests__` | as três formas do `ProductCarousel` (`row`, `slider`, `grid`) saírem de mais de um mapa, ou uma delas mudar de classe. `row` é a Home de hoje e é **imóvel** (`HOME-04`); `slider` rola nos dois tamanhos e `grid` embrulha em 2 colunas no celular e 4 a partir de `md`. Régua por **token exato**, com asserção positiva no celular **e** no `md` (`L-029`) — sem as duas, a metade fácil provaria a AC inteira |
| `toNewItems.test.ts` | backoffice `features/home-composition/model/__tests__` | um campo **de tela** do rascunho (`key`, `product_slug`) chegar ao `insert`. A régua é **igualdade de chaves** com as sete colunas, nunca "contém as sete": uma régua de presença aprova o oitavo campo, que é exatamente o que ela existe para recusar. É o modo de falha do `AD-012` — `PGRST204` em produção, com a curadoria inteira perdida e nada na tela —, invisível para `tsc` (as sete colunas são opcionais), para o `build` e para o teste do editor, que mocka o client |
| `buscaDeProdutoComDonoUnico.test.ts` | backoffice `shared/lib/__tests__` | **três réguas, ZERO allowlist** (feature `51`, `AD-036`). (1) qualquer arquivo de `apps/backoffice/src/**` fora de `entities/product/api/**` consultar `products` **filtrando por nome** — e a régua casa **as duas formas**, porque o dono não usa a que a spec presumia: ele monta `` `name.ilike.%…%` `` como **string** para o `.or()`, e a chamada de método que existe no arquivo é sobre `sku`. Uma régua só de método teria nascido **verde sobre nada** (`L-033`). O recorte à esquerda é por token exato, senão `customer_name.ilike.` — a busca de PEDIDO, legítima — cairia junto (`L-034`). (2) a **declaração** da dobra de busca fora de `shared/lib/texto.ts`: a régua **caminha pela cadeia de chamadas** e acusa a que **termina** no acento — o gerador de slug e a normalização de tag continuam depois dele (hífen, espaço) e são outra função, e o sensor prova que um slug que perca a junção por hífen **volta a ser acusado**. (3) o catálogo virando `<option>`/`<SelectItem>` fora de `entities/product/**`; **o alcance desta terceira é o NOME da variável, e isso está declarado no arquivo** — uma régua puramente estrutural acusaria as doze listas de categoria do painel, que têm a forma idêntica. **Âncora dupla**, com a terceira ancorada no extrator de JSX (o dono é `<ul>` de `<li>` por `BUS-17`, então não há ocorrência legítima nele — fingir uma seria âncora falsa), e **treze sensores**, incluindo o glob de dois asteriscos (`BL-027`), o CRLF, o LF, e os inversos que provam que a busca de pedido, o gerador de slug e as listas de categoria **não** são acusados |
| `navItems.test.ts` | backoffice `widgets/admin-layout` | ordem das rotas em `App.tsx` divergir de `navGroups` |
| `focusRoutes.test.ts` | idem | rota de foco que não é destino de `navGroups` — o trilho recolheria sem saber qual ícone acender; `/admin/homologacao` passar a contar como Home por prefixo cru |
| `navRail.test.ts` | idem | recolher passar a **gravar** em vez de apagar a chave (a ausência deixaria de significar "siga o padrão"); valor de lixo virar um terceiro estado; `localStorage` que lança derrubar a navegação; o trilho **tocar** na chave do `navCollapse` — as duas preferências têm donos separados |
| `NavRail.test.tsx` | idem | o trilho deixar de renderizar **exatamente** os destinos de `navGroups` + `footerNavItems`, na ordem deles (**âncora derivada da fonte**, nunca escrita à mão); rótulo virar texto visível; mais de um destino marcado; alvo abaixo de 44 (por **token exato** — `h-11` é substring de `min-h-11`); `TAP_44` ser importado ou copiado da loja. Sensor do removedor de comentário: a régua procura **uso**, e o próprio arquivo cita `TAP_44` na prosa |
| `folgaDoPalco.test.ts` | backoffice `shared/lib/__tests__` | qualquer arquivo de `apps/backoffice/**` declarar a folga do palco — `FOLGA`, ou a forma sem nome (`caixa.width - 40` no cálculo da escala). O dono é `previewFrame`, em `core`. **Âncora dupla** (arquivos lidos **e** os dois palcos encontrados) e sensores nos dois sentidos, incluindo a prova de que a chamada correta **não** é acusada |
| `useFullscreenStage.test.ts` | idem | `Escape` agir com o modo desligado; o ouvinte sobreviver ao desmonte; as classes do modo deixarem de ter um dono só — os dois palcos as recebem daqui, e por isso não podem divergir |
| `AdminLayout.test.tsx` | idem | a sidebar deixar de ser fixa (`sticky`/`top-0`/`h-screen`/`self-start` no `aside`, **nos dois estados de largura**), o `<nav>` perder `min-h-0`, a raiz ganhar `overflow-hidden`, a barra do celular deixar de ser `sticky`; o Dashboard virar grupo colapsável; grupo colapsado que contém a rota atual parar de avisar. **Desde a `47`**: o trilho sumir de `/admin/home`, de `/admin/menu` ou da subrota do editor; o controle de recolher aparecer **fora** das rotas de foco ou dentro da gaveta do celular; a preferência não sobreviver à remontagem. **Âncora** (a varredura tem de achar os três elementos) e **três sensores** — a declaração antiga reprova, um `cn()` sem os invariantes reprova, e um `className` que a régua **não consegue ler** devolve vazio e derruba a âncora |
| `navCollapse.test.ts` | idem | o storage vazio deixar de significar "tudo aberto"; a lista de colapsáveis virar segunda cópia dos rótulos de `navGroups`; a régua do "onde estou" divergir de `isNavActive` |
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

> **Guarda que recusa uma STRING é quebrado pela prosa que explica o defeito.** Aconteceu duas vezes
> com formas diferentes: o bundler do `supabase start` morreu por um comentário que escrevia um
> import proibido por extenso (merge da `48` com a `49`), e o `authSenderDomain.test.ts` reprovou na
> feature `52` porque a documentação nova citava o subdomínio antigo ao contar como ele quebrou a
> loja — **dois arquivos, os dois escritos para impedir o defeito que reintroduziram**.
> A regra: **descreva a forma proibida, não a escreva**. Se o texto precisa mesmo dela, ele pertence
> a `.specs/`, que é o escopo que esses guardas excluem.

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
| **Lint** | **26 erros / 6 warnings** — backoffice 24/4 · store 2/2 | `pnpm lint` |
| **Tipos** | **0 · 0 · 0** (store · backoffice · catalog-import) | `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` |
| **Testes** | **9742 em 498 arquivos** — store **3493/220** · backoffice **2711/148** · core **2372/93** · functions **654/14** · catalog-import 512/23 | `pnpm --filter @estrelinha/<w> test --testTimeout=20000` (store e backoffice) |

**A feature `52` (entrega de e-mail comprovada) somou +188 em TRÊS workspaces**, medidos em
2026-09-19 um por vez, com exit code capturado fora de pipe e `--testTimeout=20000` na loja:
**store 3376/218 → 3493/220** (+117/+2 — o guarda da migration, 43, e o do `email-check.yml`, 74) e
**functions 599/13 → 654/14** (+55 — a porta `config-check`, com o dublê que **lança** em qualquer
acesso ao banco, tornando "não toca no banco" medido em vez de suposto; e o guarda de wiring que
achou a function de pagamento fora do ar) e **core 2356/92 → 2372/93**
(+16 — `senderFrom`, o dono único da composição do remetente, na T8). Backoffice e catalog-import
**não foram tocados e foram remedidos** — idênticos (2711/148 e 512/23). Lint em **26/6** e tipos em **0 · 0 · 0**, sem mexer; `packages/core/src/payment/**`
sem uma linha alterada, conferido por `git status --porcelain` (zero arquivos).

> **A suíte da loja reprovou 1 caso, e o culpado era a documentação desta própria feature.**
> `authSenderDomain.test.ts` recusa o subdomínio antigo em qualquer arquivo fora de `.specs/` — e os
> textos novos do `.env.example` e do `config.toml`, escritos para **explicar** como aquele domínio
> derrubou a loja, o citavam por extenso. Dois arquivos, os dois existindo para impedir o defeito que
> reintroduziram. É a segunda ocorrência desta classe no repositório (a primeira matou o
> `supabase start` por um comentário com um import proibido), e virou regra na seção dos guardas.

> **Duas réguas desta feature nasceram medindo a coisa errada, e os sensores acharam as duas.**
> (1) `/\[1\/7\][\s\S]*?"\$COD" != "200"/` sobre o arquivo inteiro **atravessa passos**: com a
> ocorrência do passo 1 mutada, ela casava a do passo 5 e seguia verde — media "existe um `!= 200`
> em algum lugar depois do passo 1". Trocada por recorte de bloco que devolve `null` e **reprova**.
> (2) A janela de 200 caracteres de `authLidoDoConfigToml` reprovou o arquivo **certo** quando o
> `grep` de uma linha virou um `awk` de várias — régua calibrada pela forma que o código tinha no dia
> em que ela foi escrita.

> **O `config.toml` tem DOIS `admin_email`, e o placeholder vem primeiro.** O da seção `[inbucket]`
> (`admin@email.com`, linha 100) precede o do `[auth.email.smtp]` (linha 289). A extração do passo 7
> do `Email check` é **recortada pelo bloco** por isso: um `grep | head -1` que tolerasse o `#`
> pegaria o placeholder, e o sensor passaria a provar um endereço que não é de ninguém — 200 do
> Resend sobre um domínio que não é nosso.

> **A `52` não ligou o SMTP local, e a razão é melhor que a decisão.** A pendência `C-08` mandava
> ligar para validar que o remetente é aceito pela chave; quem faz isso agora é o `Email check`, todo
> dia, sem efeito colateral. Ligar custaria o Mailpit (dev deixa de funcionar offline e passa a
> mandar e-mail real, sujeito a limite) e não compraria garantia nova. A pergunta que expôs isso —
> *"por que SMTP, se os transacionais saem pela API HTTP?"* — também abriu a `BL-045`: o **Send Email
> Hook** faria o GoTrue chamar uma function nossa, e aí o SMTP deixaria de ser usado.

**A feature `51` (a busca de produto do painel, com dono único) somou +172 em UM workspace**,
medidos em 2026-09-14/15 um por vez, com exit code capturado fora de pipe e `--testTimeout=20000` na
loja e no painel: **backoffice 2539/140 → 2711/148** (a dobra com dono, a régua pura, os dois hooks
de leitura, o componente compartilhado, as cinco superfícies, o guarda novo, e os **+7 que a
verificação independente cobrou**). Os outros quatro
**não foram tocados e foram remedidos assim mesmo**, e os quatro vieram **idênticos** — store
3376/218, core 2356/92, functions 599/13, catalog-import 512/23. Tipos em **0 · 0**, `pnpm build`
verde nos dois apps, e `packages/core/src/payment/**` e `supabase/**` sem uma linha alterada
(`git diff --name-only` e `git status --porcelain` = zero arquivos).

> **A verificação independente devolveu PASS, e mesmo assim cobrou +7 — os dois buracos que ela
> nomeou são a assinatura de sempre: a asserção verdadeira nos DOIS mundos.**
>
> - **`BUS-16` era mais larga que a implementação.** A AC diz "criado, alterado ou apagado **pelo
>   painel**", e os três caminhos de **lote** — import de CSV, edição em massa e grade rápida —
>   gravam em `products` sem passar por `createProduct`. Eles reliam a **listagem**, que não é o
>   pool, e por até `PRODUCT_POOL_STALE_TIME` as cinco telas de busca ficariam sem as peças
>   recém-importadas, sem nada em tela dizendo por quê. A régua nova é a **chave** invalidada, nunca
>   "`invalidateQueries` foi chamado": invalidar a chave errada chamaria o método do mesmo jeito.
> - **`BUS-26` não tinha asserção própria, e o comentário do dublê AFIRMAVA que tinha.** Ele dizia
>   que devolver o `products` à página do produto "cairia no render"; o verificador fez exatamente
>   isso e a suíte ficou **14/14 verde** — aqueles casos nunca abriam a aba *Relacionados*, então
>   `products={undefined}` não chegava a renderizar nada. Quem prendia a regressão era só o `tsc`.
>   **Comentário que afirma sensibilidade inexistente é pior que comentário nenhum**, porque ele
>   encerra a investigação. Três casos novos abrem a aba e semeiam o pool com uma peça que o dublê
>   **não** devolve — ver a peça é ver o pool —, e a mutação foi reinjetada no arquivo real: os 3
>   novos caem e os **14 antigos seguem verdes**, que é a medida exata da cegueira deles.
>
> **E a correção quase custou o dobro do que comprou**: pôr `useQueryClient()` em
> `useAdminProductList` derrubou **22 casos em 2 arquivos** com `No QueryClient set` — *no render, e
> não na asserção*, que é a `L-030` do projeto acontecendo com quem tinha acabado de avisar sobre
> ela. Em produção nunca falta (o `App.tsx` embrulha o painel inteiro); o que faltava era o provedor
> no `renderHook`. E o caso novo da aba precisou de **`fireEvent.mouseDown`, não `click`**: o
> `TabsTrigger` do Radix troca de aba no `onMouseDown`, e `click` não dispara mousedown — a aba não
> mudava e o caso reprovava por "não achei o rótulo", que se lê como defeito do componente errado.

> **O LINT CAIU de 27/6 para 26/6, e a queda tem causa nomeada.** O erro que sumiu é o
> `no-explicit-any` de `data.map((p: any) => …)` em `useAdminProducts.ts` — o mapeamento do catálogo
> inteiro, que **deixou de existir** quando o hook parou de carregá-lo (`BUS-27`). Baseline que cai
> também precisa ser anotada: senão a feature seguinte compara contra folga que não existe mais.

> **O número do STORE inclui trabalho de OUTRA sessão, e isso precisa estar escrito.** A `51` não
> encostou em `apps/store/**`; as bandeiras de pagamento do rodapé (`Footer.tsx`, `Footer.test.tsx`,
> `public/pagamentos/`) estavam na árvore sem commit quando esta feature correu. O 3376/218 é o mesmo
> número que a linha acima já registrava — **idêntico, não somado** —, mas quem ler o delta desta
> feature não deve atribuir aquele trabalho a ela.

> **A suíte da LOJA reprovou por causa de um arquivo do PAINEL, e o achado é de método.**
> `brandScan.test.ts` varre `apps/`, `packages/` e `supabase/` — inclusive **testes** —, e o caso que
> prova que a dobra alcança o `ñ` usava `dobrarTexto('Mañana')`, cuja saída **contém a marca
> anterior** como substring. O caso trocou de palavra e continua provando exatamente a mesma coisa.
> A regra prática: **o gate de uma feature do painel inclui a suíte da loja**, porque os guardas de
> lá varrem os dois apps — e um workspace verde não é o gate.

> **O filtro de nome do dono NÃO tinha a forma que a spec presumiu, e uma régua ingênua teria
> nascido verde sobre nada.** `useAdminProducts` monta `` `name.ilike.%…%` `` como **string** para o
> `.or()` do PostgREST; a chamada de método que existe naquele arquivo é sobre `sku`, em
> `product_variants`. Um guarda que só casasse `.ilike('name'` varreria o painel inteiro, encontraria
> **zero** e passaria — num guarda cuja asserção é uma ausência, isso não reprova: **aprova em
> silêncio**. É `L-033` de novo (régua por comando, nunca uma para a família), e o conserto foi casar
> as duas formas com sensor para cada. O recorte à esquerda é por token exato, senão
> `customer_name.ilike.` — a busca de PEDIDO, legítima — cairia junto (`L-034`).

> **`BUS-23` foi ESCRITA, e o alcance dela está declarado em vez de escondido.** A régua que recusa
> o catálogo virando `<option>`/`<SelectItem>` é ancorada no **nome** da variável, não na estrutura:
> uma régua estrutural ("uma iteração produzindo uma opção") acusaria as **doze** listas legítimas de
> categoria e de coleção do painel, que têm a forma idêntica, e um guarda que nasce reprovando doze
> vezes é um guarda que alguém desliga. **E a âncora dela não pôde ser a de sempre**: o dono é `<ul>`
> de `<li>` por exigência de `BUS-17`, então não existe ocorrência legítima dentro dele — inventar
> uma para satisfazer a forma da âncora seria uma âncora falsa. Ela é ancorada no **extrator de
> JSX**, que precisa continuar enxergando as doze listas que ela tem de NÃO acusar.

**As bandeiras de pagamento do rodapé somaram +5 no store**, medidos em 2026-09-14 com exit code
capturado fora de pipe e `--testTimeout=20000`: **3371/218 → 3376/218**, no arquivo que já guardava o
rodapé (`Footer.test.tsx`, 20 → 25). Os outros quatro workspaces **não foram tocados e não foram
remedidos** — a linha da tabela é a soma de um número medido com quatro de 2026-09-14. Lint ficou em
**2/2** no store e tipos em **0**; `pnpm build` verde, e os três guardas novos tiveram a sensibilidade
provada por **injeção real no arquivo real** (o CDN de volta em `PAYMENTS`, o Hipercard na fileira, e
o `loading="lazy"` removido), cada um derrubando **só** o caso que o nomeia.

> ⚠️ **O `--` antes da flag ENGOLE a flag, e a suíte volta ao teto de 5 s sem avisar.** Medido na
> verificação da `50`: `pnpm --filter <ws> test -- --testTimeout=20000` repassa o `--` **literal** ao
> vitest, o teto continua em 5000 ms, e o painel reprova 1 caso por timeout num arquivo alheio ao que
> se está medindo (`AdminLayout.test.tsx`, na ocasião). As duas formas que **funcionam** são
> `pnpm --filter <ws> test --testTimeout=20000` (sem o `--`) e
> `pnpm --filter <ws> exec vitest run --testTimeout=20000`. **A forma de invocar é parte da
> medição**: com a flag engolida, a reprovação parece defeito do arquivo que caiu, e o arquivo muda a
> cada execução.

**A feature `50` (produtos em destaque, e o painel que não recarrega) somou +278 em três
workspaces**, medidos em 2026-09-14 um por vez, com exit code capturado fora de pipe e
`--testTimeout=20000` na loja e no painel: **backoffice +194/+4** (o editor novo, o seletor, os dois
hooks com modo de leitura, o cabeçalho com `Salvo`, o movimento da lista, três guardas e os **+17 que
as duas rodadas de verificação independente cobraram**),
**store +49/+3** (`useProductsByIds`, o bloco, as três formas do `ProductCarousel`) e **core +35/+1**
(o módulo `featured` e o catálogo invertido). `functions` e `catalog-import` **não foram tocados e
foram remedidos** — idênticos. Lint ficou em **27/6** (backoffice 25/4 · store 2/2), tipos em
**0 · 0**, `pnpm build` verde nos dois apps, e `packages/core/src/payment/**` sem uma linha alterada,
conferido por `git diff --name-only -- packages/core/src/payment` (zero arquivos).

> **A baseline de entrada desta tabela estava velha em +3/+1 no store**, e é a **sexta** feature
> seguida a encontrar isso: a linha dizia `3319/214` e o disco tinha **3322/215** no commit
> `6c362bd`, de outra sessão. O delta acima é calculado sobre a **entrada medida**
> (core 2321/91 · store 3322/215 · backoffice 2345/136 · functions 599/13 · catalog-import 512/23 =
> 9099/478), nunca sobre o número que estava escrito aqui. **Meça com a árvore parada, antes de tocar
> em qualquer coisa** — e some conferindo.

> **Nenhuma migration, e é isso que `DST-23` prova.** O tipo `product_carousel` já estava no `check`
> desde a feature `24`, esperando renderer e editor; `display` é **valor** em `config jsonb`
> (`AD-014`). `homeSections.test.ts` fechou a feature **sem uma asserção tocada** — e o guarda que
> mudou foi `catalog.test.ts`, **invertido** e não descartado: ele asseria que
> `['product_carousel','category_grid']` eram "em breve", e passou a asserir que **só `category_grid`**
> é. Sem a inversão, entregar o bloco deixaria um guarda verde a favor do estado que a feature
> removeu — que é exatamente o que a `41` achou no cadeado do hero.

> **`ANI-07` é a AC que não se prova pelo resultado, e sim pela ORDEM.** "A animação não atrasa a
> gravação" é verdadeira nos dois mundos quando o teste só espera o fim: com a requisição atrás de um
> `setTimeout(…, 300)` a linha some do mesmo jeito, só que 300 ms depois. O caso que a prende
> (`HomeSectionList.test.tsx:528`) clica no `Remover`, **não põe um único `await` entre as duas
> asserções** e cobra as duas no mesmo tique — `onRemove` já foi chamado **e** a linha já carrega
> `data-saindo`. A mutação foi reinjetada no arquivo real: com o `setTimeout` na frente da chamada,
> reprovam três casos (o de `ANI-07` e os dois de `FOCO-25`, que medem a mesma chamada).
> **Microtarefa não roda entre duas linhas síncronas de teste**, e é essa propriedade do JavaScript
> que torna a asserção de ordem possível sem relógio falso.

> **O interruptor otimista precisou de um dublê que ENXERGA a janela** (`VIV-10`). Com a escrita
> respondendo na hora, "otimista" e "pessimista" produzem exatamente a mesma tela no fim, e toda
> asserção sobre o meio é verdadeira nos dois mundos — medido: a primeira escrita do caso "a
> revalidação não pisca" **sobreviveu** à remoção do otimismo. O conserto foi dar ao dublê um
> `segurarEscritas` (irmão do `segurarLeituras` que a fase 4 criou) e medir o valor **enquanto a
> releitura está no ar**. Os três mutantes — sem otimismo, sem a volta em caso de falha, e a
> revalidação piscando — foram reinjetados no hook real, e cada um derruba pelo menos um caso.

> **O guarda do movimento tem escopo LITERAL de oito arquivos, e isso é declarado, não escondido.**
> O painel carrega ~50 classes de `transition-*` de antes desta feature, **nenhuma com par**; uma
> régua sobre `apps/backoffice/**` nasceria reprovando cinquenta vezes, e guarda que nasce vermelho é
> guarda que alguém desliga. Os oito são os arquivos de UI que a `50` tocou — e duas classes antigas
> que moravam neles **ganharam o par** no caminho (`AdminMenuPage.tsx`, a aba Computador/Celular;
> `HomeSectionEditor.tsx`, o botão de remover). O resto fica como dívida, abaixo.

**A feature `48` (usuários do painel) somou +324 em quatro workspaces**, medidos em 2026-09-13 um por
vez e com exit code capturado fora de pipe: **backoffice +117/+7** (as duas telas, os dois diálogos,
o hook, o cartão de senha, o fluxo de recuperação e o guarda das rotas), **core +86/+4** (as recusas
puras e a pureza do módulo), **functions +73/+1** (a `admin-users`, mais 8 casos nos dublês de
`_shared/testing`) e **store +48/+2** (os dois guardas novos — a migration e a chave de servidor).
`catalog-import` não foi tocado e foi remedido — idêntico. `packages/core/src/payment/**` sem uma
linha alterada, conferido por `git status --porcelain`.

> **A verificação independente REPROVOU a primeira entrega, e o achado nº 1 é o pior tipo: o contrato
> de autorização do painel inteiro não tinha UMA asserção.** O verificador moveu `/admin/usuarios` e
> `/admin/conta` para fora do `<Route>` do `RequireAdmin` e rodou a suíte completa do backoffice —
> **2328 verdes**. As duas telas (a lista de quem administra a loja, com e-mail e último acesso, e o
> formulário de senha) renderizariam para visitante deslogado. `grep -rn RequireAdmin
> --include=*.test.*` devolvia **uma** ocorrência no painel, e era um comentário.
>
> **O guarda que existia não alcançava, e o motivo é reutilizável**: `navItems.test.ts` lê o
> `App.tsx` com `/path="(\/admin[^"]*)"/g` — um regex **plano**, cego a aninhamento. Para ele, uma
> rota dentro e uma rota fora do bloco guardado são a mesma coisa. **Régua que mede PRESENÇA não mede
> POSIÇÃO**, e autorização é posição. O guarda novo (`app/__tests__/rotasSobGuarda.test.ts`) recorta
> o bloco e compara índices, cobre a **classe** inteira (toda rota `/admin/*`, não só as duas que
> vazaram), e a mutação exata do verificador foi reinjetada no `App.tsx` real para ver as duas
> asserções reprovarem — com o `navItems.test.ts` seguindo verde em 25/25 ao lado.
>
> Os outros dois mutantes sobreviventes tinham a assinatura de sempre — **a asserção verdadeira nos
> dois mundos**: (1) o único teste de `delete` no hook exercitava o ramo de **recusa**, que retorna
> antes da releitura, então apagar o `refetch` de `remove()` deixava a linha da pessoa apagada na
> tela até um F5 — o irmão `revoke` tinha a asserção certa, `remove` não; (2) o caso do `23503`
> montava a corrida com as quatro contagens em **zero**, então a releitura devolvia `null`, a
> resposta caía no literal de fallback, e as duas asserções passavam com a releitura trocada por
> `null`. O conserto foi fazer a contagem **mudar entre as duas leituras** (0 → 4), que é a corrida
> de verdade, e asserir o **número** na frase.
>
> **E uma duplicação foi REMOVIDA em vez de testada**: `passwordChangeRefusal` era chamada no
> `ChangePasswordCard` **e** no `changeOwnPassword`, e as duas se mascaravam — remover qualquer uma
> deixava a suíte verde. A do componente não comprava nada (a do contexto já recusa antes da rede),
> então saiu. `ForgotPasswordFlow` mantém a dele, e ali é carga: `updatePassword` não confere nada.
>
> **A rodada 2 achou a lacuna que o conserto acima CRIOU, e esta é a lição mais reutilizável da
> feature.** Com a régua num dono só, mover o `supabase.auth.getUser()` para **antes** dela em
> `changeOwnPassword` passou a deixar a suíte verde — e `getUser` no supabase-js v2 **vai ao
> servidor** validar o JWT, então a mutação viola a letra de `USR-11`/`USR-23` ("antes de QUALQUER
> chamada de rede"). Na rodada 1 aquele mutante era **inalcançável**, porque o cartão já tinha
> recusado. Consolidar foi certo, e transferiu para a **ordem interna** de uma função uma promessa
> que as duas cópias sustentavam por acidente: **remover uma cópia move o ônus da prova, não o
> elimina.** O conserto é `expect(getUser).not.toHaveBeenCalled()` nos três casos de recusa local.

> ⚠️ **O teto de 5s da contenção alcança a LOJA também, não só o painel.** Medido duas vezes na
> verificação da `48`: a suíte do store reprovou com `Test timed out in 5000ms` em **5 casos de 4
> arquivos, todos de varredura de disco** — e os 4 passam isolados (44/44). Com
> `--testTimeout=20000` a suíte fecha **3176/205, contagem idêntica**. É a mesma assinatura que o
> achado da `46` descreve para o backoffice, e a instrução vale igual aqui: **antes de investigar uma
> reprovação da loja, confira se o erro diz `Test timed out in 5000ms`** — se disser, feche o que
> estiver rodando e remeça sozinho, ou suba o teto.

> **A baseline do backoffice estava velha em +24 quando esta feature começou** (dizia 2204/129, e o
> disco tinha **2228/129**). É a **quinta** feature seguida a encontrar isso. As outras quatro linhas
> batiam — e o motivo de baterem é que a `47` mediu de verdade ao fechar.
>
> **E a medição de entrada foi CONTAMINADA por mim mesmo**: a corrida de `core` pegou o
> `refusals.test.ts` que eu tinha acabado de escrever, e reportou 2221/85 em vez de 2199/84.
> Descontar os 22 casos devolveu o número certo, e o erro só foi visível porque o log nomeia cada
> arquivo. **Meça com a árvore parada** — a regra deste arquivo diz "meça na hora", e faltava dizer
> "antes de tocar em qualquer coisa".

> ⚠️ **Esta feature correu numa working tree COMPARTILHADA com outra sessão** — o quarto caso do
> projeto, depois da `45`, da `46`/`47` e do conserto dos diálogos. A outra sessão commitou quatro
> vezes durante a execução (`403c924`..`f8609b6`, 12:19–12:20), **inclusive a `spec.md` desta
> feature**. Os números acima não sofreram com isso porque aquele trabalho **já estava no disco** às
> 12:36, quando a baseline de entrada foi medida — mas a coincidência é sorte, não método. A âncora
> de contagem compartilhada é **esta tabela**, e é onde duas sessões somando +1 cada produzem um
> número que nenhuma das duas mediu.

> **Um erro de fuso horário quase entrou na listagem de acessos.** A fixture do teste usava
> `2026-09-10T00:00:00Z`, e meia-noite UTC renderizada em Porto Alegre é **o dia anterior** — o teste
> reprovou pedindo `10/09` e recebendo `09/09`. O conserto foi a fixture (meio-dia UTC, mesmo dia
> civil em qualquer fuso de −11 a +11), não a asserção: o componente estava certo, o teste é que
> media a máquina. Mesma família de `storeOrigin.test.ts`.
**Os números acima são da ÁRVORE MESCLADA — a `49` encontrando a `48`** (merge de 2026-09-13), e não
a soma de duas baselines. Os cinco workspaces foram medidos **um por vez**, com exit code capturado
fora de pipe, **depois** do merge, e os cinco passam limpos:

| Workspace | `48` sozinha (`master`) | `49` sozinha | **Árvore mesclada** |
| --- | --- | --- | --- |
| store | 3176/205 | 3271/212 | **3319/214** |
| backoffice | 2345/136 | 2228/129 | **2345/136** |
| core | 2285/88 | 2235/87 | **2321/91** |
| functions | 509/9 | 526/12 | **599/13** |
| catalog-import | 512/23 | 512/23 | **512/23** |

**A soma não é aritmética, e não deve ser lida como se fosse**: o store mesclado tem +2 arquivos
sobre a `49` sozinha e +9 sobre a `48`, e `functions` ganhou casos que **só existem porque as duas se
encontraram** — o guarda do CORS passou a cobrir a quarta function.

> **O merge da `49` com a `48` produziu QUATRO achados, e três são de âncora compartilhada.** O
> primeiro é o mais caro, e é novo neste repositório.
>
> - **As duas migrations nasceram com o MESMO timestamp — `20260913120000`.** Git não acusa: são
>   arquivos de nomes diferentes, o merge é limpo, os testes passam e `pnpm build` fica verde. Quem
>   acusaria é o banco, e tarde: `supabase_migrations.schema_migrations` tem `version` como chave, e
>   **version é só o prefixo numérico** — as duas disputam a mesma linha. O resultado seria uma
>   aplicada e a outra **permanentemente invisível para o `db push`**, sem erro em lugar nenhum,
>   exatamente o modo de falha que `AD-017` descreve ("o `db push` só olha o que falta, nunca o que
>   mudou no que já passou"). A da `48` chegou primeiro; a da `49` foi renomeada para
>   `20260913130000`, e o guarda dela acompanhou. **Antes de mergear feature paralela, compare o
>   prefixo das migrations — não o nome do arquivo.**
> - **As duas sessões reivindicaram `AD-034`.** A `48` chegou à `master` primeiro; a decisão da `49`
>   foi **renumerada para `AD-035`** no merge, com o motivo escrito na própria entrada. É a mesma
>   família do que este arquivo registra desde a `45` — duas sessões somando +1 no mesmo contador —,
>   só que desta vez no log de decisões em vez de na contagem de testes. **As duas não conflitam**:
>   o `AD-034` proíbe `apps/**` de tocar `auth.admin.*`, e a function `checkout` vive em
>   `supabase/functions/`. Conformidade, não exceção.
> - **O guarda do CORS da `49` acusou uma QUARTA cópia, e ela veio da `48`.** `admin-users/handlers.ts`
>   nasceu com a sua própria declaração de `corsHeaders` enquanto as outras três eram unificadas em
>   `_shared/http.ts`, em branches paralelas. O guarda reprovou na **primeira execução da árvore
>   mesclada** e a quarta passou a delegar. É exatamente o trabalho que ele existe para fazer, e o
>   caso mostra por quê: a cópia não veio de descuido, veio de **duas pessoas trabalhando ao mesmo
>   tempo sem se ver**.
> - **O quarto não é de âncora, e é o mais surpreendente: o `supabase start` MORRE por causa de um
>   COMENTÁRIO.** O bundler de functions do CLI varre dependências **por texto e não remove
>   comentário**. As duas features tinham escrito, em prosa, a forma literal de um import sem
>   extensão — para explicar por que ela é proibida —, e o CLI tentou montar arquivos que não
>   existem:
>
>   ```
>   failed to read file: open packages/core/src/admin-users/refusals: no such file or directory
>   failed to read file: open packages/core/src/checkout/types: no such file or directory
>   ```
>
>   O segundo só apareceu depois de o primeiro ser corrigido — a ferramenta para no primeiro. **É o
>   mesmo defeito que os guardas deste repositório combatem — casar MENÇÃO em vez de USO —, agora
>   dentro da ferramenta**, e o modo de falha é o ambiente local inteiro fora do ar. Nenhum teste
>   pega: `pnpm test`, `tsc` e `pnpm build` passam com o comentário ali.
>
>   **Regra prática**: ao explicar em comentário por que um import precisa de `.ts`, **não escreva a
>   forma proibida por extenso** — descreva-a. Vale para todo arquivo alcançável pelo grafo de uma
>   edge function.

**A feature `49` (checkout sem conta) somou +279 em três workspaces**, medidos em 2026-09-13 um por
vez e com exit code capturado fora de pipe, no worktree `49-checkout-sem-conta`: **store +143/+9**
(o convite, o desafio inline, `orderAccess`, `buildOrderPayload` e quatro guardas novos), **core
+36/+3** (`identity`, `guestAccess`, a identidade em `isContactComplete` e o guarda de alcance do
Deno) e **functions +90/+4** (a function `checkout` inteira, a segunda prova de posse do
`create-payment` e o dono único do CORS). Lint ficou em **27/6** e tipos em **0**; `pnpm build`
verde nos dois apps, e `packages/core/src/payment/**` sem uma linha alterada — conferido por
`git status --porcelain`.

> **Dos +279, exatamente 22 vieram DEPOIS da verificação independente**, consertando o que ela
> achou: 11 no store (a fiação do token nas duas pontas, `ENT-05`, `IDN-01`) e 11 em functions (os
> filtros de coluna, o log sem segredo, `ADR-G2`, a colisão de `order_number` e o vazamento de
> `client_request_id`). Nenhuma régua foi afrouxada — são asserções que **faltavam**.

> ⚠️ **A linha do BACKOFFICE mudou sem esta feature encostar nele**, e o registro importa mais que
> o número: a tabela dizia **2204/129** e o medido é **2228/129**, com `git status` e
> `git diff --name-only HEAD -- apps/backoffice packages/ui` devolvendo **zero** arquivo. O `+24`
> **não é desta feature** — é baseline envelhecida, a **quarta** ocorrência seguida (a `45` achou
> três linhas velhas, a `46`, a `47` achou quatro). O total anterior de `8479` portanto nunca
> existiu na árvore. O número acima é **medido**, não somado.

> **Três ACs seriam FALSAS com o plano cumprido à risca**, e as três só apareceram ao implementar:
>
> 1. **`CSC-05` — a convidada nunca receberia a aprovação do PIX.** Ela é detectada por Supabase
>    Realtime, que **respeita RLS**, e a única policy de `SELECT` em `orders` é `TO authenticated`
>    (conferido no banco). Quem compra sem conta é `anon`: o canal conecta, o filtro casa e o
>    payload **nunca chega** — sem erro nenhum. Ela pagaria e ficaria na tela do QR para sempre.
> 2. **`CSC-08` — o pedido órfão não seria pagável.** Com `customer_id` nulo, `buildPayer` não acha
>    CPF e o `create-payment` devolve 422 `missing_payer_cpf`: o pedido existiria, a cliente teria o
>    token, e o pagamento seria recusado por falta de um documento que ela já informou. O recuo para
>    `orders.customer_document` é o que torna a promessa verdadeira.
> 3. **`PED-04` — a retentativa devolveria o pedido SEM o acesso.** A retentativa que importa é
>    aquela em que a primeira resposta se perdeu na rede: o pedido foi gravado, o token foi emitido
>    e a cliente nunca o recebeu. O servidor guarda só o hash, então ele **reemite** e substitui —
>    quem chega ali apresentou o mesmo `client_request_id`, a mesma prova que autorizou a criação.
>
> As três têm a mesma assinatura: **a peça que o plano descreve funciona, e o CAMINHO não fecha.**
> Nenhuma apareceria num teste de unidade das peças — só ao perguntar "e depois, o que acontece?".

> **A verificação independente REPROVOU a primeira entrega, com 6 mutantes sobreviventes em 27, e o
> achado nº 1 é o da `41`/`44` pela terceira vez: as duas pontas provadas e o FIO entre elas não.**
>
> Duas mutações, cada uma sozinha suficiente para a convidada **nunca conseguir pagar**, passavam
> com **o store inteiro verde (3260/3260)**: apagar `rememberAccess(...)` de `CheckoutPage.tsx`
> (o token chega e é jogado fora) e remover `access_token` do corpo em `useCreatePayment.ts` (403
> no caixa). `guestAccess` provava o token, `orderAccess` provava o storage e `createOrder.test.ts`
> provava a emissão — **nenhum teste da loja citava `access_token` num corpo de `create-payment`**.
>
> Os outros quatro, por ordem de utilidade do padrão:
>
> - **Nenhum filtro de coluna de `create-order` era observável.** O dublê compartilhado só enxerga
>   o `.eq()` quando a fixtura é **função**, e todos os cenários usavam fixtura de valor: trocar
>   `client_request_id` por `customer_email` no filtro da idempotência deixava **66/66 verdes** — e
>   faria a segunda compra devolver o pedido da primeira, com a pessoa pagando o pedido errado.
>   **A capacidade do dublê é parte da régua**: um dublê que não enxerga o filtro torna o filtro
>   inauditável, e nada acusa.
> - **A asserção de ordem era verdadeira nos DOIS mundos.** `tabelasGravadas[0] === 'orders'` mais
>   `adminCreateUsers.length === 1` sobrevivia à inversão da ordem — as duas listas são
>   independentes, e `orders` seria a primeira gravação de qualquer jeito. Quem matava o mutante
>   eram os vizinhos, por acidente. A régua virou **temporal**: o dublê é perguntado de dentro do
>   `createUser`, e nesse instante `orders` e `order_items` já têm de estar gravados.
> - **`ADR-G2` tinha só o nome de um `describe`**, sem um caso sequer, e a dimensão *Observabilidade*
>   ("nunca registra o token") não tinha asserção nenhuma — pôr o token no log deixava 518/518
>   verdes.
> - **`BL-031` e um comentário de código afirmavam o OPOSTO do schema.** Diziam que
>   `orders.order_number` era "text sem índice único" e que a colisão seria "silenciosa";
>   `orders_order_number_key` existe desde `20260415090935_…:49` e está aplicada. É `AD-012`
>   cometido dentro da feature que o cita — **afirmação à mão sobre schema, sem verificação** —, e a
>   consequência real era pior que a descrita: colisão **derruba a venda com 500**. O conserto foi
>   o sufixo aleatório, com o caso medindo 40 números distintos sob **relógio fixo**.

**O conserto da posição dos alvos de toque somou +16 em UM workspace**, medidos em 2026-09-13 com
exit code capturado fora de pipe: **store 3111/202 → 3128/203** (o guarda novo, 14, e os dois casos
de posição em `HeroCarousel.test.tsx`; o +1 restante veio da sessão vizinha durante a medição). Os
outros quatro não foram tocados. Tipos em **0**, e `packages/core/src/payment/**` sem uma linha
alterada.

> **O auxiliar de toque apagava a posição do controle, e o sintoma não aparecia em diff nenhum.**
> `TAP_44` começa com `relative` — precisa começar, senão o pseudo de 44px sobe para o ancestral
> posicionado —, e isso colide com o `absolute` do próprio controle de **duas** maneiras: em
> `cn(classes, TAP_44)` o `twMerge` **apaga** o `absolute`; em `` `${TAP_44} absolute …` `` não há
> fusão, as duas classes chegam ao DOM e `.relative` vence por vir **depois** de `.absolute` na folha
> de estilo. Nos dois caminhos o controle cai no fluxo normal, com build, `tsc` e suíte verdes.
>
> Medido no navegador, num palco de 400px: a forma antiga centrava a seta em **600** (200px abaixo da
> faixa); a corrigida, em **200** — o meio exato. Eram **9 pontos**: as 2 setas do Banner principal
> (o defeito relatado), o coração e o "+" do `ProductCard` — **32 elementos na home**, com os botões
> fora do card — e as 5 setas da `ProductGallery`.
>
> **A primeira escrita do guarda só olhava `cn()`, e 7 dos 9 pontos eram template literal.** Ela
> passaria vazia parecendo saudável. É a lição de sempre numa forma nova: **a régua tem de medir a
> propriedade, não o formato em que ela apareceu da primeira vez** — e a âncora que a salvou foi a
> que exige encontrar **as duas formas**, não só uma contagem acima de zero.
>
> **E nenhuma asserção existente pegava isso.** Os 12 casos das setas em `HeroCarousel.test.tsx`
> conferiam rótulo, `hidden`, `md:flex` e `before:h-11` — todos verdadeiros **nos dois mundos**. A
> asserção que faltava é a de token exato nos dois lados: o `absolute` **está** e o `relative`
> **não está**.

**O conserto da trilha dos diálogos somou +10 em UM workspace**, medidos em 2026-09-13 um por vez e
com exit code capturado fora de pipe: **store 3087/200 → 3111/202**. Os outros quatro foram remedidos
e vieram idênticos. Lint ficou em **27/6** e tipos em **0 · 0 · 0**; `pnpm build` verde nos dois apps,
e `packages/core/src/payment/**` sem uma linha alterada.

> ⚠️ **Do +24 do store, só +10 são deste trabalho — e a linha do store já nasceu envelhecendo.**
> A working tree estava sendo **compartilhada com outra sessão** (terceiro caso do projeto, depois da
> `45` e da `46`/`47`), que entregou `folgaDoHeader.test.ts` (+10) e casos em `FaqPage.test.tsx` (+4)
> enquanto esta medição corria — e, **depois** de medida, seguiu para `HeroCarousel` e
> `alvoDeToqueNaoRoubaPosicao.test.ts`, que **não estão** no 3111. O número é um instantâneo honesto
> de 2026-09-13, não o estado da árvore agora.
>
> A propriedade dos arquivos ficou disjunta por sorte, não por combinação: ela em `pages/**`,
> `shared/ui/**` e `widgets/hero-carousel/**`; esta em `packages/ui/src/{dialog,alert-dialog}.tsx` e
> `shared/lib/__tests__/dialogGridTrack.test.ts`. **A âncora de contagem compartilhada é esta
> tabela** — é onde duas sessões somando +1 cada produzem um número que nenhuma das duas mediu. O
> que sobrevive à próxima leitura é o **+10 atribuído**; o total do store, remeça antes de usar como
> gate.

> **O defeito que motivou o guarda estava no PRIMITIVO, não na tela que o exibiu.** A cliente viu
> `AddQuestionDialog` estourando; a causa era `DialogContent` — o `grid` sem trilha —, e a mesma
> linha estava copiada em `alert-dialog.tsx`, servindo as 15 telas de diálogo do painel. Quando uma
> tela quebra num contêiner compartilhado, a busca por "quem mais tem esta linha" não pode parar na
> tela.

> **Nenhuma suíte deste repositório poderia ter pego isso, e não é falha de cobertura.** jsdom
> devolve 0 para toda medida de layout, então `getBoundingClientRect`, `scrollWidth` e trilha de grid
> valem zero lá dentro. A prova foi um **navegador de verdade**: uma página de repro servida pelo
> Vite do painel, montando o diálogo com 66 entradas, e o Chromium medindo `gridTemplateColumns`.
> Vale como método para o próximo defeito de layout — **o guarda que sobra depois lê o fonte do
> disco, porque é o que jsdom alcança**.

> ⚠️ **A suíte da LOJA também precisa de `--testTimeout=20000`** — achado da `49`, e o `CLAUDE.md`
> registrava isso só para o painel. Sem o teto maior, **seis casos reprovam em três arquivos que
> varrem disco** (`routes`, `accentText`, `touchTarget`), todos com `Test timed out in 5000ms`, e
> **o arquivo muda a cada execução** — a assinatura de contenção. Com o teto: **3128/203, exit 0**,
> na mesma árvore em que a execução anterior tinha reprovado. Os três passam isolados.
>
> A armadilha é de diagnóstico: a primeira leitura desta feature concluiu "não são timeouts" porque
> o `grep` foi feito no **arquivo de saída do comando em background** (11 linhas, só o resumo) em
> vez do log completo. Antes de investigar uma reprovação, confira a mensagem no log inteiro.

> ⚠️ **A suíte do backoffice precisa de `--testTimeout=20000` para ser medida com confiança**, e isso
> é achado da `46`, não preferência. Os guardas que varrem disco (`SlugField`, `CategoryInspector`)
> levam segundos cada; sob a contenção da suíte completa eles cruzam o teto padrão de **5s** e
> reprovam por **timeout, nunca por asserção** — e o arquivo que reprova **muda a cada execução**,
> que é a assinatura de contenção. Medido três vezes: passam isolados (49 testes, 4,39s só de
> execução), reprovam 1–2 por vez na suíte cheia, e com o teto em 20s a suíte fecha **123/123**.
> `--no-file-parallelism` também resolve, mas passa de 10 minutos.
>
> **Isto não conserta o CI**, que já roda `--concurrency=1` no nível do turbo. É instrução de
> medição local: antes de investigar uma reprovação do painel, confira se o erro diz
> `Test timed out in 5000ms` — se disser, remeça com o teto maior.
>
> **A `47` confirmou o achado sem saber dele**: a flake apareceu duas vezes no fecho dela, em
> arquivos diferentes (`CategoryInspector` numa execução, `SlugField` na outra), e sumiu com o teto
> maior. Duas sessões chegaram ao mesmo diagnóstico em paralelo.

**Os números acima são da ÁRVORE MESCLADA — a `47` encontrando a `46`** (merge de 2026-09-13), e não
a soma de duas baselines. Os cinco workspaces foram medidos **um por vez**, com exit code capturado
fora de pipe, **depois** do merge, e os cinco passam limpos:

| Workspace | `47` sozinha | `46` sozinha (`master`) | **Árvore mesclada** |
| --- | --- | --- | --- |
| store | 3069/198 | 3087/200 | **3087/200** |
| backoffice | 2204/129 (1 ✗) | 2073/123 | **2204/129** |
| core | 2199/84 | 2186/84 | **2199/84** |
| functions | 436/8 (1 ✗) | 436/8 | **436/8** |
| catalog-import | 512/23 | 512/23 | **512/23** |

> **O merge APAGOU as duas reprovações e os cinco erros de tipo que a `47` carregava na baseline.**
> Ela fechou com `FaqEditorDialog.test.tsx` e o `handlers.test.ts` do sitemap vermelhos, e com o
> typecheck do store em 5 — tudo herdado da `46` pelo `ff-only` do começo, e **registrado em vez de
> consertado**, porque eram arquivos de outra sessão. Os três últimos commits da `46` consertaram os
> três. **A decisão de não consertar de passagem estava certa**, e o registro é o que fez a
> diferença: sem ele, a `47` teria fechado ou escondendo reprovações ou mexendo em arquivo alheio.

**A feature `47` (painel em foco) somou +144 em dois workspaces**, medidos em 2026-09-12/13 um por
vez e com exit code capturado fora de pipe, no worktree `../store-47-painel-em-foco`: **backoffice
2073/123 → 2204/129** (+131/+6) e **core 2186/84 → 2199/84** (+13). Store, functions e
catalog-import não foram tocados por ela e foram remedidos assim mesmo. `pnpm build` verde nos dois
apps, e `packages/core/src/payment/**` sem uma linha alterada.

> **A verificação independente REPROVOU a primeira entrega, e os dois mutantes sobreviventes tinham a
> mesma assinatura: a asserção que é verdadeira nos DOIS mundos.**
>
> 1. Apagar o `removeEventListener` de `useFullscreenStage` deixava **52 testes verdes**. O caso
>    asseria `expect(() => teclar('Escape')).not.toThrow()` — e em React 18 um `setState` depois do
>    unmount é **no-op silencioso**, então não lançar é verdade com o ouvinte vazando. A régua virou
>    **identidade do handler**: o que entra no `addEventListener` tem de ser exatamente o que sai.
> 2. Trocar a altura do quadro por `PREVIEW_DEVICES[device].height` deixava **26 verdes**: a barra
>    imprimiria `1024 × 948` e o iframe sairia com **768**. `FOCO-16`/`FOCO-17` estavam provados **só
>    em `core`**, nunca na superfície — e em jsdom a caixa do palco é `{0,0}`, então os dois modos
>    imprimiam o mesmo texto. O conserto foi **dar ao palco uma medida**: um `ResizeObserver` dublê,
>    porque jsdom não implementa o observador.
>
> **A lição de método é a segunda**: quando a regra pura está testada em `core` com caixas
> sintéticas, é tentador considerar a superfície coberta pelo teste de "a métrica vem do dono". Não
> está — em jsdom, *todos* os caminhos colapsam no mesmo valor de piso, e o teste passa a medir a
> ausência de layout em vez da regra. **Prova de geometria em componente exige palco medido.**

> **A tabela de baselines estava desatualizada em QUATRO das cinco linhas quando esta feature
> começou**, e o total de `8054` **nunca existiu na árvore** — era a soma de números anteriores à
> `46`. Medido do disco com `git status` vazio: store dizia 2955/189 e era **3069/198**; backoffice
> dizia 2023/119 e era **2073/123**; core dizia 2128/80 e era **2186/84**. Só catalog-import batia.
> É a terceira feature seguida a encontrar isto (a `45` achou três linhas velhas, a `44` uma). O
> padrão é estável o bastante para virar regra: **quem fecha a feature mede; quem abre a próxima
> mede de novo.**

> **Dois achados de método, e os dois são o mesmo erro em lugares diferentes: a régua que casa
> MENÇÃO em vez de USO.** O guarda do trilho reprovou o próprio `NavRail.tsx` porque o arquivo
> explica em comentário por que `TAP_44` **não** é importado; o de `HomeLivePreview` reprovou porque o
> arquivo diz em comentário que a `FOLGA` saiu dali. Nos dois casos a régua acusava exatamente o
> arquivo que estava certo. O conserto é o mesmo dos guardas antigos — remover comentário de linha e
> de bloco na **mesma** varredura, com `[^\n\r]` fechando antes do `\r` — e cada um ganhou sensor
> provando que um `import` de verdade **continua** sendo acusado.

> **O ponto cego do `classesDe` era real, e foi consertado ANTES de o componente mudar.** A régua do
> `<aside>` casava só `className="literal"`; a largura do trilho obrigava um `cn()`, e sem a extensão
> a **âncora passaria a medir string vazia** — as quatro asserções de posição continuariam verdes
> sobre nada. A ordem importou: T5 estendeu a régua (com sensor de que um `cn()` sem os invariantes
> reprova, e outro de que uma sintaxe ilegível derruba a âncora) e só T7 tocou no componente.

**A feature `46` (perguntas frequentes da loja) somou +240 em quatro workspaces**, medidos em
2026-09-12 um por vez e com exit code capturado fora de pipe: **store +132/+11** (a página, o slice
`entities/faq`, os dois hooks de `<head>` e três guardas novos), **core +58/+4** (`text`, `page`,
`jsonld` e a pureza de `core/faq`), **backoffice +50/+4** (a curadoria) e **functions +0** (o teste
do sitemap mudou de número, não de contagem). `catalog-import` não foi tocado e foi remedido —
idêntico. Lint ficou em **27/6** e tipos em **0·0·0**; `packages/core/src/payment/**` e
`supabase/functions/mercado-pago/**` não tiveram uma linha alterada, conferido por
`git diff --name-only bd35225..HEAD`.

> **Três consequências apareceram FORA do workspace que a task estava medindo**, e as três valem
> como método:
>
> - **Mudança em `packages/core` tem gate de TRÊS workspaces, não dois.** O gate da task que subiu
>   `FAQ_ANSWER_MAX` rodou core e store; o `FaqEditorDialog` do **painel** lê a mesma constante e o
>   contador dele seguiu dizendo "0 / 600". Os números dele passaram a vir da constante, com âncora
>   ao lado — senão as duas linhas passariam com a constante zerada.
> - **Acrescentar rota a `SITEMAP_STATIC_PATHS` muda a saída da edge function do sitemap**, e o
>   teste dela conta `<loc>`. Foi o guarda bidirecional pegando uma consequência a um workspace de
>   distância.
> - **Seis âncoras de contagem dispararam** ao declarar a rota (17→18 slugs, 20→21 reservados, 6→7
>   institucionais, 16→17 páginas lazy, 21→22 rotas, 10→11 `<loc>`). Todas atualizadas para o número
>   verdadeiro, nenhuma afrouxada — é exatamente o trabalho que elas existem para fazer.


**A feature `45` (as políticas da loja) foi medida em 2026-09-12 na árvore COMBINADA**, um workspace
por vez e com exit code capturado fora de pipe. "Combinada" é literal: **duas sessões trabalharam na
mesma working tree ao mesmo tempo** — a `45` (as duas páginas de política, o `PolicyDocument` e os
guardas) e um trabalho paralelo que entregou `/cuidados-com-sua-joia-afetiva` sobre o mesmo
`PolicyDocument` **e removeu `/politicas`**. Os números abaixo são das duas coisas juntas, e **não
devem ser lidos como delta de uma feature só**.

| Workspace | Entrada medida | Saída | Delta |
| --- | --- | --- | --- |
| store | 2853/184 | **2955/189** | +102/+5 |
| core | 2121/80 | **2128/80** | +7 |
| functions | 436/8 | **436/8** | 0 |
| backoffice | 2023/119 | **2023/119** | 0 — não tocado, remedido |
| catalog-import | 512/23 | **512/23** | 0 — não tocado, remedido |

Lint ficou em **27/6** (backoffice 25/4 · store 2/2), tipos em **0·0·0**, `pnpm build` verde nos dois
apps, e `packages/core/src/payment/**` sem uma linha alterada — conferido por `git diff --name-only`.

> **TRÊS das cinco baselines desta tabela estavam DESATUALIZADAS antes desta feature**, e o achado é
> o mais reutilizável dela. Medidas do disco com a árvore limpa em `3fe19b1`, **antes** de qualquer
> edição: core dizia `1811/70` e era **2121/80** (+310/+10); functions dizia `370/7` e era **436/8**
> (+66/+1); backoffice dizia `2002/119` e era **2023/119** (+21). Só o store batia.
>
> O total anterior (`7548 em 403`) portanto **nunca existiu na árvore** — é a soma de três números
> velhos com dois certos. Pelos deltas, o envelhecimento vem do fecho da `42`/`43`. A correção está
> aplicada acima: o número novo é **medido**, não `7548 + 506`.
>
> É a lição que este arquivo já repete desde a `32` — *"baseline anotada de memória, ou de uma
> execução anterior à última alteração, mente sem quebrar nada"* —, agora com a consequência
> concreta: **uma baseline velha faz o gate da feature seguinte comparar contra folga que não
> existe**, e o erro se acumula em silêncio por features inteiras.

> **O full run de um workspace acha o que o arquivo tocado não acha.** A remoção de `/politicas`
> passou nos testes de `routes.test.ts` e derrubou `core/home/__tests__/refusals.test.ts`, que usava
> `/politicas/troca/prazo` como exemplo de **"uma rota de verdade"**. O caso passou a medir o oposto
> do que o nome dele diz — sem ninguém tocar em `ctaHrefRefusal`. Conserto: fixture sob `/produtos` e
> **a asserção `expect(ROUTE_SLUGS).toContain('produtos')` ao lado**. *Fixture que nomeia uma rota
> precisa provar que ela existe*, senão a próxima remoção o apodrece de novo em silêncio.

**A feature `44` (gaveta de material na página do produto) somou +106 em UM workspace**, medidos em
2026-09-11 com exit code capturado fora de pipe: **store 2747/175 → 2853/184**. Os outros quatro não
foram tocados — `git status` só acusa `apps/store/**` e `.specs/**`. Lint ficou em **27/6**, tipos em
**0·0**, e `packages/core/src/payment/**` não teve uma linha alterada.

> **A baseline de entrada do store NÃO era a que este arquivo dizia.** A tabela registrava 2664/169;
> o medido no início da `44` foi **2747/175**. A diferença (+83/+6) era o trabalho da página do
> produto que estava **na árvore sem commit** e que virou o commit `9d873d6` no meio desta feature —
> não uma baseline errada. É a mesma lição de sempre numa forma nova: **baseline é do que está no
> disco, não do último commit**, e medir na hora é o que separa "+106" de um número inventado.

> **A verificação independente REPROVOU a primeira entrega da `44`, e o achado nº 1 é o da `41`
> repetido letra por letra.** O teste que provava "o fio entre o gatilho e a gaveta" **montava a
> própria árvore**: ele renderizava `<ProductInfo />` e `<MaterialDrawer />` lado a lado, escritos
> dentro do próprio arquivo de teste. Apagar `<MaterialDrawer />` de `ProductPage.tsx` fazia a gaveta
> sumir da loja inteira com **2828 testes verdes** — e o comentário que dizia "este é o caso que
> reprova se a gaveta sair da página" era falso. **Um teste que monta a árvore que quer provar não
> prova árvore nenhuma**: quem monta tem de ser a página.
>
> Os outros três mutantes sobreviventes tinham a mesma assinatura — asserção ao lado do ponto:
> `MaterialAviso` foi extraído **para o tom `alerta` não ter dois donos** e saiu sem uma asserção
> sequer sobre o tom; a gaveta só era testada com `cinzas`, que tem **um** aviso, então
> `avisos.slice(0,1)` passava; e o chip escolhido era provado só por `aria-pressed`, então colapsar
> os dois ramos de classe deixava a cliente tocando num chip que não mudava de cara.

> **Um guarda estreitado é um guarda com sensor nos DOIS sentidos.**
> `semMaterialNaPaginaDoProduto.test.ts` deixou de recusar `requiresMaterial` e continua recusando as
> outras sete formas. Sem o segundo grupo de sensores — **um por forma**, e não um bloco só —, um
> regex que perdesse tudo passaria como "estreitado", e a página do produto voltaria a anunciar
> `material_kinds` com a suíte verde. A sensibilidade foi provada por injeção real no arquivo real:
> `materialKindsOf` em `ProductInfo.tsx` reprova, `requiresMaterial` passa.

> **O mock com dado de mentira custou uma reescrita, e teria custado a feature.** O desenho no Paper
> usava rótulos curtos inventados para os chips; o dado real (`ATALHOS_DE_MATERIAL`) tem títulos como
> `Unhas (humanas ou de pet)`, e com eles os chips ocupam **7 fileiras** e empurram a ficha para fora
> da tela de 390×844. O conserto foi um campo `rotuloCurto` no mesmo registro — não uma segunda
> lista. É `AD-012` noutra roupa, e a mesma armadilha das vagas do carrossel na `41`: **medida
> suposta é afirmação; o dado do repositório é a verificação.**

**A feature `41` (banner principal da home) somou +265 em três workspaces**, medidos em 2026-09-06 um
por vez e com exit code capturado fora de pipe: **store +126/+4** (o widget, o hook, os dois guardas
novos e a fiação), **core +83/+2** (`surfaceArt`, `carousel` e os casos de `resolve`) e **backoffice
+56/+1** (o editor, a remoção de seção e as ACs que a verificação cobrou). Functions e catalog-import
não foram tocados e foram remedidos assim mesmo — idênticos. Lint ficou em **27/5** e tipos em
**0 · 0**, sem mexer; `packages/core/src/payment/**` não teve uma linha alterada, conferido por
`git diff --name-only`.

> **A `41` teve DUAS rodadas de verificação independente, e as duas acharam o mesmo tipo de coisa em
> escalas diferentes.** A rodada 2 achou o achado nº 1 **um nível acima**: as duas pontas da remoção
> de seção estavam provadas — o hook e a lista — e **o fio entre elas não**. Apagar
> `onRemove={handleRemove}` da página fazia o botão sumir da tela inteira com a suíte do backoffice
> verde. É a mesma forma pela qual `deleteSection` viveu uma feature inteira exportada e sem
> consumidor.
>
> **A régua de opacidade errou duas vezes pela mesma razão, e a segunda por UM caractere**: ela via o
> `fade-in` do `tailwindcss-animate` e era cega a `animate-fade-in`, `animate-scale-in` e
> `animate-slide-up` — as três declaradas pelo **próprio preset deste repositório**, as três com
> `opacity: "0"` no primeiro quadro. O caractere anterior ali é um hífen, não um espaço.

> **A verificação independente REPROVOU a primeira entrega, e o achado nº 1 era o pior tipo possível:
> `AD-029` tinha parado no banco.** O trigger fora trocado, mas o painel continuava trancando a
> Chamada principal com um cadeado — e `HomeSectionList.test.tsx` **asseria a trava**, ou seja, a
> suíte estava verde a favor do comportamento que a spec mandava remover. `deleteSection` existia no
> hook desde a feature 24 e **nenhuma tela a consumia**. Resultado: a Adri arrastaria o Banner
> principal para o topo e o hero continuaria acima dele — exatamente o problema que a feature existe
> para resolver, entregue "completo" com 7307 testes passando.
>
> **A lição de método é a mais reutilizável desta feature**: quando uma AC remove uma trava, o teste
> que a defendia tem de ser **invertido**, não deixado de lado — e a busca por "quem mais aplica esta
> regra" não pode parar na camada onde a mudança começou.

**A `41` derrubou a última exceção estrutural da Home: o hero deixou de ser indelével** (`AD-029`).
`HOME-08` nunca existiu para proteger o hero — existiu para tornar impossível uma Home com zero
seções ativas —, e a invariante foi **generalizada**, não apagada: `guard_last_active_home_section`
recusa desligar ou apagar a **última seção ativa**, qualquer que seja o tipo. `homeSections.test.ts`
guarda a troca nos **dois sentidos**: o guarda novo existe **e** o antigo não existe mais. Sem o
segundo sentido, uma migration que criasse um sem derrubar o outro deixaria o hero indelével com a
suíte verde.

> **O `tsc` pegou três construções de `ResolvedItem` que a varredura da loja não tinha**, e isso é
> registro de método, não de bug: `useAdminResolvedHome` (backoffice) monta o mesmo tipo em três
> ramos, e `strictNullChecks: false` **não** dispensa propriedade obrigatória. Campo novo em tipo
> compartilhado se conta com `tsc`, nunca com grep.

**A feature `40` (estabilidade da home) somou +48 em um workspace só**, medidos em 2026-09-06 com
exit code capturado fora de pipe: **store 2490/161 → 2538/165**. Os outros quatro não foram tocados
e foram remedidos assim mesmo — idênticos. Lint ficou em **27/5** e tipos em **0**, sem mexer;
`packages/core/src/payment/**` não teve uma linha alterada, conferido por `git diff --name-only`.

**Quatro arquivos de guarda novos, e os quatro nasceram de um defeito medido no Lighthouse**, não de
zelo: `categoryTreeSingleOwner` (5), `cardSkeletonBox` (8), `heroSemOpacidadeZero` (9) e
`arbitraryTextColor` (11). Os outros +15 cresceram dentro de arquivos que já guardavam o assunto.

> **A verificação independente derrubou TRÊS mutantes desta feature, e os três estavam em cima de um
> AC.** Foi a primeira `validation.md` do projeto com autor ≠ verificador — a fila que a `39`, `37`,
> `35`, `34`, `33` e `32` acumularam —, e o retorno pagou na hora: apagar `loading={isLoading}` do
> `HomeCollectionRow` devolvia **o CLS inteiro** com os 2531 testes verdes; uma chave de categorias
> compartilhada entre as fileiras mas **diferente da do header** media 1 requisição no teste e 2 na
> home; e o guarda do hero, ancorado na sintaxe do variant, não via `<motion.p initial={{ opacity: 0
> }}>` — a porta ao lado, com o mesmo efeito. **Guarda ancorado em sintaxe guarda a sintaxe, não a
> regra.**

**A sidebar fixa e os grupos colapsáveis somaram +32 no backoffice**, medidos em 2026-09-06 um
workspace por vez e com exit code capturado fora de pipe: **1914 em 116 → 1946 em 118**, em dois
arquivos novos (`navCollapse.test.ts`, 16, e `AdminLayout.test.tsx`, 16). Os outros quatro workspaces
não foram tocados e não foram remedidos. Lint ficou em **27/5** (backoffice 25/4) e tipos em
**0·0·0**; `packages/core/src/payment/**` não foi tocado, conferido por `git diff --name-only`.

**O número anterior (7014/375) é da ÁRVORE MESCLADA — a `39` encontrando a `38` na `master`** (merge de 2026-09-06),
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
| `email-check.yml` | **cron diário** + `workflow_dispatch` | Prova que o e-mail **ainda pode sair** (feature `52`). Sete passos: pergunta à produção com o que ela está configurada (`send-notification?action=config-check`), e prova **esse** valor contra o Resend. **Não** prova o SMTP nem os templates do GoTrue, e declara isso por extenso |

- **`--concurrency=1` no CI é de propósito**: rodar store e backoffice em paralelo satura o runner de
  2 vCPUs (jsdom é pesado) e a suíte do backoffice fica flaky. É a mesma flake que se vê localmente.
- **Lint e typecheck NÃO bloqueiam o merge** enquanto a baseline não for zerada. Rodam para dar
  visibilidade. O gate de verdade é *teste + build*.
- **Remoção em produção se ordena pelo que está PUBLICADO, nunca pelo que está no disco.**
  Vale para function, secret e coluna, e a feature `52` violou a regra depois de tê-la escrito para
  outro caso: o `ADR` dela manda apagar a function zumbi **antes** da migration que derruba as RPCs
  que ela chama — e o secret `RESEND_FROM` foi apagado **antes** do deploy do código que deixou de
  lê-lo. O bundle publicado caiu no remetente de caixa-de-areia (200 do Resend, entrega só ao dono
  da conta) e o cano que a feature tinha acabado de abrir fechou de novo, **sem erro em lugar
  nenhum**. As duas metades da regra: o que o código publicado **ainda usa** só se remove depois do
  deploy; o que o código publicado **ainda chama** só se derruba depois de ele sair do ar.
- **O sensor pergunta ao ambiente que executa, e prova o valor que ele reporta** — nunca um valor
  escrito no próprio sensor (`AD-037`, feature `52`). Um `email-check` que chamasse o Resend com o
  remetente escrito no `.yml` mediria a **conta Resend**; o apagão de 2026-09-06 estava num **secret
  do Supabase**, e aquele probe teria ficado verde os treze dias inteiros. Por isso não há um único
  literal de domínio no workflow: ele é derivado do que a produção reporta e conferido contra o que o
  Resend reporta.
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

- **O LOGIN DA LOJA ESTÁ EM REGRESSÃO ATIVA ATÉ ALGUÉM COLAR TRÊS TEMPLATES** (feature `52`).
  É o **único** passo que restou da `52`, e ele ficou mais urgente do que era: o SMTP do auth foi
  **ativado** no dashboard em 2026-09-19, e os três templates **não** foram colados junto.
  - **Antes** de ativar o SMTP, o GoTrue caía no compartilhado da Supabase (~2 e-mails/hora) e
    simplesmente não entregava. **Agora ele entrega** — o e-mail **padrão**, em inglês, com um
    **link** —, enquanto a loja chama `verifyOtp` e pede um código de 6 dígitos que aquele e-mail
    não traz. A cliente recebe algo, tenta e não entra. *Parece* funcionar, e é o pior dos três
    estados possíveis.
  - **Não precisa escrever nada.** Os três existem desde a feature `20`, em `supabase/templates/`,
    com a identidade da loja, tudo inline, sem webfont e com `{{ .Token }}` nos três. É colar em
    `/auth/templates`, mais o **assunto** de cada um — que vive no `config.toml` e, como ele não é
    empurrado, precisa ser digitado no dashboard:

    | Tela | Arquivo | Assunto |
    | --- | --- | --- |
    | Magic Link | `magic_link.html` | `Seu código de acesso — Uma Estrelinha` |
    | Confirm signup | `confirmation.html` | `Seu código de acesso — Uma Estrelinha` |
    | Reset password | `recovery.html` | `Redefinir sua senha — Uma Estrelinha` |

  - **Três bastam, e é medido**: a loja dispara `signInWithOtp` (que vira *Magic Link* para e-mail
    existente e *Confirm signup* para novo) e `resetPasswordForEmail`. Não há `updateUser` nem
    convite, então *Change Email Address* e *Invite user* são inalcançáveis.
  - **A prova de fecho é um login de verdade** — pedir um código na loja e vê-lo chegar com a cara
    da marca e seis dígitos. E **nenhum teste alcança isso**: não há comando que leia o `[auth]` do
    hospedado (a CLI não tem `config pull`), e o `Email check` declara essa cegueira por escrito —
    ele prova que o remetente é aceito, nunca que o template está lá.
  - O que **já** foi feito da `52`, para esta lista não envelhecer de novo: o remetente transacional
    corrigido e medido (`config-check` em produção), os dois secrets novos gravados e o
    `RESEND_FROM` apagado, o `RESEND_API_KEY` criado no cofre do **GitHub**, a function zumbi
    `send-email` removida (`functions list` devolve **oito**, todas do repositório) e a migration da
    RLS aplicada.
- **O `.env` LOCAL É UM SEGUNDO DONO DOS SECRETS DE PRODUÇÃO** (`BL-044`, medido em 2026-09-19).
  `supabase secrets set UMA_CHAVE=valor` rodado da raiz do projeto grava **oito** — a CLI mescla o
  `.env` do diretório atual, sem avisar e sem criar chave nova (então não aparece na contagem).
  Controle: o mesmo comando devolve `{"count":8}` da raiz e `{"count":1}` de um diretório sem `.env`.
  Custou sete secrets de produção sobrescritos com valores de dev, dos quais **um não foi
  restaurado**: `MELHOR_ENVIO_SENDER_JSON`. A cotação de frete funciona (usa só o CEP); a **criação
  de etiqueta** é que pode falhar com 422, e ninguém a exercitou desde então. Procedimento seguro e
  o contrato do digest estão em `supabase/CLAUDE.md` e no `.env.example`.

- **AS TRÊS CÓPIAS DE `slugify` DO PAINEL CONTINUAM TRÊS, e a `51` não as unificou de propósito.**
  Ela levou a **dobra de busca** para `shared/lib/texto.ts` e deixou lá as sete outras ocorrências de
  `normalize('NFD')`: os três `slugify` (`CategoryFormDialog`, `CsvImportDialog`,
  `AdminProductFormPage` — e mais dois quase iguais em `quickGrid` e `buildDuplicates`),
  `normalizeTag` e o gerador de id do `AdminLayout`. **Não são a mesma função**: elas dobram o
  acento **e continuam** — juntam por hífen, recortam o que não é letra —, e o que produzem é
  **endereço**, não termo de busca. Endereço que muda quebra link, então unificá-las é decisão sobre
  geração de slug e merece a própria feature. O guarda da `51` **distingue as duas por construção**
  (ele acusa a cadeia que *termina* no acento) e tem sensor provando que um `slugify` que perdesse a
  junção por hífen voltaria a ser acusado — ou seja, a fronteira está medida, não suposta. O risco
  aberto é o de sempre: cinco escritas do mesmo recorte divergem sem nada quebrar, e a divergência
  aparece como dois slugs diferentes para o mesmo nome.
- **`AdminQuickGridPage.tsx:127` lê `products` SEM `range` e SEM `count`**, e ficou **fora** da `51`
  por decisão de escopo — é caminho de importação de CSV, não de seletor, e é da família `BL-008`. O
  modo de falha está medido e é silencioso: a checagem de slug duplicado monta um `Set` com
  `select('slug')`, e passando de **1.000 produtos** o PostgREST corta sem avisar. A partir dali a
  tela deixa de enxergar parte do catálogo, conclui que o slug está livre e **cria duplicata** — sem
  erro em lugar nenhum. São 702 produtos hoje, 298 de distância. `AdminProductsPage.tsx:173` tem a
  mesma leitura e o mesmo teto. O conserto é `readAllPages`, que já existe e já é o dono desta regra.
- **A `51` NÃO tem prova em navegador**, e ela entra na fila de `32`…`50`. O que a feature entrega é
  **campo, lista e largura** — e jsdom devolve 0 para toda medida de layout, então cada asserção da
  suíte é proxy de forma (classe declarada, atributo, presença de nó). A lista do que falta está em
  *O que só o navegador prova*, no `design.md` dela, e em 390×844 e 1440 é: o campo de busca dentro
  da coluna de edição de **560px** de `/admin/home`, com a lista de 20 abaixo; os chips de "Produtos
  relacionados" embrulhando com nomes longos; o `ProductSearchField` do `DestinoDoItem` **dentro** de
  um slide do carrossel, que já é um cartão aninhado; o alvo de 44px sob o dedo em cada linha de
  resultado; a ausência de rolagem horizontal do corpo nas cinco telas; e — que é o percurso que
  motivou a feature — acrescentar 12 peças ao bloco **Produtos em destaque** **sem a prévia
  recarregar**, que é o que a `50` entregou e que a troca do seletor não pode devolver.
- **O BLOCO "PRODUTOS EM DESTAQUE" NASCE INEXISTENTE, e montá-lo é passo de operação** (feature
  `50`). **Não há migration**: nada foi semeado, nenhuma Home muda no deploy. Para a vitrine de
  campanha existir, a Adri precisa, em `/admin/home`: acrescentar o bloco **"Produtos em destaque"**
  pela bandeja, dar um **título** (obrigatório), escolher as peças no seletor (até **12**, na ordem
  dela), decidir entre **Slider** e **Grade**, **ligar a seção** — todo bloco novo nasce desligado
  (`HOME-10`) — e arrastá-la para onde ela quer na Home. São seis passos, e nenhum acontece sozinho.
  É o mesmo formato de dívida do interruptor do frete grátis (`37`), do menu vazio (`39`) e do Banner
  principal (`41`): sem este registro, a loja fica meses sem o bloco porque ninguém soube que havia
  uma tela.
- **A `50` NÃO tem prova em navegador**, e ela entra na fila de `32`…`49`. O que a feature entrega é
  **largura, coluna e ausência de piscada**, e jsdom devolve 0 para toda medida de layout — toda
  asserção da suíte é proxy de forma (classe declarada, atributo, presença de nó, ordem de chamada).
  A lista do que falta está escrita em *O que só o navegador prova*, no `design.md` dela, e em
  390×844 e 1440 é: a grade de 2 colunas com nome de produto de duas linhas (o par card ×
  esqueleto); a fita do `slider` com 12 itens **sem rolagem horizontal do body** (o defeito que a
  auditoria da `27` mediu, `scrollWidth` 634 numa viewport de 390); o CLS do bloco enquanto os
  produtos chegam; o editor na coluna de 560 com a lista de 12 e o `ProductPicker` aberto; e —
  **que é o olho do pedido** — a prévia **não recarregando** ao salvar, que nenhum teste de jsdom vê.
  Falta também o par de `ANI-05` em navegador: os mesmos percursos com `prefers-reduced-motion`
  ligado e desligado, conferindo que os dois mostram os mesmos estados e só um se move.
- **O guarda do movimento alcança OITO arquivos, e o resto do painel continua sem par.** Medido em
  2026-09-14: `apps/backoffice/src/**` declara **60** classes de `transition-*`/`animate-*` e só as
  desta feature têm `motion-reduce:`. Ampliar `animacaoRespeitaMovimento.test.ts` para o app inteiro
  é trabalho de uma feature própria — ela teria de decidir, classe a classe, o que é movimento
  decorativo (ganha par) e o que é indicador de progresso (não ganha, como `animate-spin`). O guarda
  nasceu estreito de propósito: um que nascesse reprovando cinquenta vezes seria desligado no
  primeiro gate.
- **A `50` não tem `validation.md` nem verificador independente no momento em que este parágrafo foi
  escrito** — os commits e o Verifier vêm depois dela. Os três guardas novos tiveram a sensibilidade
  provada por **injeção real no arquivo real** (o par `motion-reduce:` removido de
  `HomeSectionRow.tsx`, a remoção posta atrás de um `setTimeout` em `HomeSectionList.tsx`, e o
  otimismo e a volta apagados de `useAdminHomeSections.ts`, um de cada vez), e cada mutação derruba
  pelo menos um caso nomeando arquivo e linha.
- **A saída da linha é de OPACIDADE, e a altura não é animada** (`ANI-04`). Animar a altura exigiria
  medi-la — e medida é exatamente o que jsdom não dá —, então a lista "acomoda o espaço" pelo fluxo
  normal do CSS quando a linha sai do DOM. Se em navegador o salto incomodar, a saída pedirá um
  `grid-template-rows: 0fr` ou uma biblioteca de layout; o `design.md` recusa `framer-motion` por uma
  transição, e essa recusa continua valendo até alguém medir.

- **O PAINEL CONTINUA COM UM ACESSO SÓ ATÉ A ADRI CRIAR O SEGUNDO** (feature `48`). A migration
  **não semeia conta nenhuma** — semear criaria uma credencial que ninguém pediu e que ninguém sabe
  a senha. Depois do deploy, `/admin/usuarios` mostra **uma** linha (a do `seed.sql`), e o ponto
  único de falha humano que a feature existe para remover **só some quando ela criar o segundo
  acesso**. É o mesmo formato de dívida do interruptor do frete grátis e do menu vazio: sem este
  registro, a loja fica meses assim porque ninguém soube que havia uma tela.
- **A `48` TEM `validation.md`, com autor ≠ verificador e DUAS rodadas** — a primeira reprovou com 3 mutantes sobreviventes, a segunda passou. O que falta é **prova em navegador**. Os 324 casos foram medidos por
  workspace com exit code fora de pipe, os guardas novos tiveram a sensibilidade provada por
  **injeção real no arquivo real**, a invariante do banco foi provada por **6 probes SQL contra o
  Postgres local**, e o grafo de módulo da edge function foi provado por **`deno check` de verdade**
  (não pela inferência do guarda). **O que falta é exatamente o que jsdom não mede**: em 390×844, a
  tabela de acessos com **quatro** botões de ação na linha (ela vai estourar), os dois diálogos de
  confirmação, e os três campos de senha empilhados com o botão de mostrar/ocultar em cada. Entra na
  fila da `32`, `33`, `34`, `35`, `37`, `39`, `41`, `45` e `47`.
- **Revogar o acesso NÃO derruba a sessão ativa da pessoa** (`A-06` da `48`). Medido nos typings
  (`@supabase/auth-js@2.110.7`): `signOut(jwt, scope?)` exige o JWT dela, e **não existe logout por
  id**. O casco do painel pode seguir na tela até ela recarregar — mas **nada que ela faça grava**,
  porque toda policy de escrita chama `has_role`, avaliado por requisição. Para expulsar de imediato
  seria preciso banir a conta (`ban_duration`), que é mais pesado que tirar o acesso ao painel.
  Limitação declarada, não escondida.
- **Um admin que trabalhou NÃO PODE ser apagado, e isso é do schema** (feature `48`). Quatro FKs
  apontam para `auth.users` sem `ON DELETE`: `orders.customer_id` (via o `CASCADE` de
  `customers.user_id`), `order_notes.created_by`, `order_status_history.created_by` e
  `customer_notes.created_by`. A tela recusa **antes**, nomeando o que bloqueia e com quantos
  registros, e oferece `Remover do painel` como saída. Não é bug: apagar destruiria o histórico da
  loja junto. Mudar isso exigiria `ON DELETE SET NULL` nas três colunas `created_by` — migration
  própria, e uma decisão sobre o que "nota sem autor" significa.
- **Criar um admin cria também uma linha em `customers`, e ADOTA os pedidos órfãos do mesmo e-mail.**
  É o trigger `handle_new_customer` (`ESP-22`) fazendo o trabalho dele. Consequências: a pessoa
  aparece em `/admin/clientes` com zero pedidos, e — se aquele e-mail já comprou como convidada — os
  pedidos passam a ser dela. As duas são corretas; a segunda torna a conta indelével dali em diante.
  **Filtrar admins da listagem de clientes seria criar um segundo dono de "quem é cliente"**, e por
  isso não foi feito.
- **A CONTA DA CONVIDADA NASCE SEM SENHA, e da 2ª compra em diante ela cai no desafio de código**
  (feature `49`, `AD-035`). É consequência direta da decisão do usuário, apresentada com o custo e
  aceita: o e-mail passa a existir em `auth.users` no fecho da primeira compra, então a consulta de
  `identify` responde "tem conta" na seguinte. **A primeira compra fica sem parede nenhuma**; da
  segunda em diante são 6 dígitos. Se o atrito se mostrar caro, a saída seria distinguir "conta que
  já entrou" de "conta criada por compra" — um segundo dono de "tem conta?", e por isso fora de
  escopo agora.
- **A `49` NÃO tem prova em navegador**, e ela entra na fila de `32`…`47`. Falta medir em 390×844 e
  1440: o convite `SignInInvite` embrulhando (é `flex-wrap`, e jsdom devolve 0 para toda medida de
  layout), o alvo de 44px sob o dedo, o desafio de código dentro do bloco Contato sem empurrar o CTA
  para fora da dobra, e o percurso inteiro em aba anônima — `/carrinho` → `/pedido/:id` aprovado.
  **O que jsdom alcançou está provado**; o que ele não mede é proxy de forma.
- **A `49` também não tem `validation.md` nem verificador independente.** Os guardas novos tiveram a
  sensibilidade provada por injeção real (inclusive um que reprovou o próprio arquivo certo, e foi
  consertado por isso), e a migration foi provada por **probe contra o banco local** — sete
  comportamentos de `account_exists`, as três colunas e o índice parcial. Mas ninguém conferiu a
  feature contra a spec com olhos frescos.
- **A enumeração de e-mail é risco aceito e declarado** (`IDN-09`). A ação `identify` responde "este
  e-mail tem conta?" com teto de 20 por IP em 5 minutos, e `account_exists` é fechada a `anon`. O
  risco **já existia**: com a anon key publicada no bundle,
  `signInWithOtp({ shouldCreateUser: false })` do navegador responde a mesma pergunta. O que muda é
  que agora fica barato — e a agravante é que, com a conta de convidada, a resposta passa a
  significar "este e-mail já comprou aqui".
- **`BL-030`, `BL-031` e `BL-032` nasceram da `49`**, todas fora do escopo por decisão: as policies
  de `INSERT` em `orders` continuam abertas no banco (a janela de deploy custaria venda),
  `order_number` segue com prefixo da marca anterior e sem índice único, e os dois hooks de gravação
  client-side ficaram sem consumidor.

- **A `47` NÃO tem prova em navegador, e nela isso pesa mais que a média**: o que a feature entrega é
  **largura** (440 × 872), **escala** (81% e 100%) e **altura de corpo**, e jsdom devolve 0 para toda
  medida de layout — toda asserção da suíte é proxy de forma (classe declarada, atributo, presença de
  nó). Falta medir em 390 · 768 · 1024 · 1440:
  - o `11rem` de `/admin/menu` é **suposição** de altura de cabeçalho copiada da Home, e os dois
    `PageHeader` têm subtítulos de comprimentos diferentes — um que embrulhe em duas linhas estoura a
    viewport;
  - a grade do `MenuIconPicker` (célula fixa de 100px) dentro de um card de 440, que antes vivia numa
    coluna de ~712;
  - o trilho de 56px sob o dedo em 768–1023, que é território de toque;
  - a tela cheia em monitor menor que 1064px de largura, onde o quadro de 1024 não cabe inteiro.
- **O estado de FALHA do iframe da prévia continua sem existir** — e a `47` **não criou** esse modo de
  falha, só ampliou a superfície dele: em tela cheia, um iframe que não carrega ocupa a tela inteira
  em branco. Ficou fora de escopo **por decisão** (`AD-020` proíbe o painel desenhar um fallback da
  loja), não por esquecimento. É dívida registrada.
- **`/politicas` FOI REMOVIDA, e levou Envio e Pagamento com ela** (2026-09-12, decisão do usuário).
  A loja tem três páginas institucionais de texto — `/politicas-de-trocas-e-devolucoes`,
  `/politica-de-privacidade` e `/cuidados-com-sua-joia-afetiva` — e **nenhuma delas diz por onde a
  loja envia, em quanto tempo posta, que aceita Pix e cartão, nem a partir de quanto o frete é
  grátis**. Esses quatro blocos liam `store_settings` (`usePaymentSettings`, `useFreeShipping`) e só
  existiam na `/politicas`. É dívida de conteúdo, não de código: some uma página, some a informação.
  - **A rota saiu SEM 301, estando em `SITEMAP_STATIC_PATHS`** — ou seja, foi anunciada para
    indexação, e está commitada desde `12c8ab7` ("baseline herdada da Nanita"). É exatamente o
    tradeoff que `AD-018` e `LEGACY_REDIRECTS` existem para não deixar acontecer por acidente com
    outros slugs. O conserto, se a decisão mudar, é **uma entrada** em `LEGACY_REDIRECTS`.
- **As duas páginas de política NÃO têm prova em navegador** (feature `45`). Os endereços, o texto, o
  portão do WhatsApp e os guardas estão medidos; o que falta é o que **jsdom não mede**: a medida de
  leitura de 720px, os botões de contato empilhando em 390, o alvo de 44px e a ausência de rolagem
  horizontal do body. Entra na fila da `32`, `33`, `34`, `35`, `37`, `39` e `41`.
  - **O texto jurídico não passou por advogado.** Ele é da dona e foi transportado sem reescrita; o
    que a `45` acrescentou (LGPD, compartilhamento, consentimento) foi conferido contra **o que o
    código faz**, não contra a lei. A `PrivacyPolicyPage` recusa por teste afirmar encarregado de
    dados, perfilamento publicitário ou remarketing — a loja não faz nenhum dos três, e declarar o
    contrário seria assinar documento falso em nome da Adri.

- **O BANNER PRINCIPAL NÃO EXISTE ATÉ A ADRI CRIAR UM, e o hero deixou de ser obrigatório** (feature
  `41`). A migration **não semeia seção nenhuma** — de propósito, porque semear mudaria a Home de
  quem já a tem. Depois do deploy, a Home continua **idêntica**: quem quiser o carrossel no topo
  precisa, em `/admin/home`, acrescentar o bloco **"Banner principal"**, subir as duas artes de cada
  banner, escolher os destinos, **ligar a seção** (todo bloco novo nasce desligado) e arrastá-la para
  cima da "Chamada principal" — que agora pode ser desligada ou removida. São cinco passos, e nenhum
  deles acontece sozinho.
  - **O que a `41` ainda NÃO tem é `validation.md` nem prova em navegador**, e nela a segunda pesa
    mais que a média: o bloco entrega **largura, deslocamento e rotação**, que é exatamente o que
    jsdom não mede (ele devolve 0 para toda medida de layout, e a suíte inteira do widget é proxy de
    forma — atributo, classe e presença). Falta medir em 390×844 e 1440: o CLS da faixa enquanto a
    arte carrega, o LCP do primeiro slide em Slow 4G, o arrasto do dedo sem sequestrar a rolagem
    vertical, e as setas do computador. Entra na mesma fila da `32`, `33`, `34`, `35`, `37` e `39`.
  - **O primeiro olhar de navegador já cobrou o preço, em 2026-09-11**: as duas vagas eram
    **suposição** (a `spec.md` as marcava "confirmar com uma arte real da Adri") e a arte real é
    `1680 × 560` e `720 × 720`. Com as vagas erradas, `object-cover` cortava **90px de cada lado** no
    computador e **~25% da largura** no celular, comendo a primeira letra da frase desenhada dentro
    da arte — e os **83 testes do widget seguiam verdes**, porque todos leem a constante em vez de
    conferi-la contra um arquivo. Medida suposta é afirmação; o arquivo da dona é a verificação
    (`AD-012` noutra roupa). Corrigido em `HERO_CAROUSEL_SLOTS`, com a régua de `BNR-26` **invertida**
    em vez de descartada: ela dizia "o celular é retrato" e teria reprovado a arte real.
- **O MENU NASCE VAZIO NOS DOIS DISPOSITIVOS, e montá-lo é passo de operação** (feature `39`). As 37
  categorias têm `menu_desktop` e `menu_mobile` em `false`, e o único item semeado é o link "Sobre".
  Depois do deploy, a barra do topo mostra **um** item e a folha do celular também — até a Adri
  ligar as coleções em `/admin/menu`, **uma aba por vez**: ligar no computador **não** liga no
  celular. É o mesmo formato de dívida do interruptor do frete grátis: sem este registro, a loja fica
  meses com o menu quase vazio porque ninguém soube que havia uma tela.
- **A `40` é a PRIMEIRA feature com autor ≠ verificador**, e o retorno pagou na primeira execução:
  três mutantes sobreviventes, os três em cima de um AC (ver `validation.md` dela). **A fila de
  pendências de verificação independente parou de crescer aqui** — `32`, `33`, `34`, `35`, `37` e
  `39` continuam abertas.
  - **O que a `40` ainda NÃO tem é prova em navegador**, e nela isso pesa mais que a média: tudo o
    que a feature entrega — deslocamento, tempo de pintura, cascata de rede — é exatamente o que
    jsdom não mede. Toda asserção da suíte é **proxy de forma**. Falta medir em 390×844, Slow 4G e
    4× CPU: o CLS da home, a cascata (uma linha `categories`, quatro `products` juntas), o LCP do
    `<p>` do hero e a bolha do WhatsApp entrando sem mover o botão.
- **O peso do JS inicial continua aberto** (`BL-029`, aberto pela `40`). São 141 KB de `index.js` e
  57 KB de `supabase-js` com **107 KB não usados** — o `realtime-js` é a maior parte do que a home
  não toca. Vale ~3,5 pontos de FCP e mexe no client de dados, então ficou fora do escopo da `40` de
  propósito.
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
  - **Em 2026-09-11 a coluna saiu das duas telas onde ela DECIDIA compra** (decisão do usuário): o
    card "Esta joia é feita com material seu" e a linha da barra fixa sumiram da página do produto, e
    a lista "Quais materiais" saiu do formulário do painel. Sobrou o **interruptor**
    `requires_material`, que é o que põe o pedido na fila. A coluna continua no banco, continua sendo
    congelada em `order_items` pelo checkout e continua sendo lida pela confirmação e pela fila do
    painel — a dívida de curadoria **não** foi fechada, só deixou de ser anunciada à cliente. Guardas:
    `semMaterialNaPaginaDoProduto.test.ts` (loja) e `MaterialCard.test.tsx` (painel).
  - **A feature `44` devolveu o ASSUNTO à página sem devolver a AFIRMAÇÃO.** A linha "Como enviar seu
    material de DNA" acende pelo interruptor e abre uma gaveta onde **a cliente escolhe** o material
    dela. A loja pergunta; não responde por ela. É por isso que o guarda foi *estreitado* e não
    revogado.
  - **A dívida de `requires_material` continua aberta, e agora ela ESCONDE uma tela.** Peça com
    `requires_material = false` cuja descrição manda enviar coto e cabelo **não ganha a linha** — a
    cliente não descobre a gaveta e não tem como saber que precisa enviar algo. Antes da `44` a
    consequência era só um pedido fora da fila; agora é também informação que não chega. O conserto é
    curadoria da dona em `/admin/produtos`, não código.
- **Fronteiras FSD em `warn`**: 2 violações conhecidas no store, as duas em
  `entities/product/ProductInfo` — importa `features/share-product` e, desde 2026-09-11,
  `features/shipping-calc` (a caixa de frete que substituiu `ProductTrustBadges` na coluna de
  informação). Corrigir extraindo a interação para uma feature.
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
| O banner de campanha | `/admin/home`, bloco **Banner principal** | a `41` **não semeia nenhum** ⇒ a Home abre com a "Chamada principal" de sempre. O bloco existe na bandeja e espera arte, destino e o interruptor |
| Perguntas frequentes | `/admin/perguntas` e a aba `Perguntas` do produto | a `28` semeou 67 entradas e 3.475 vínculos das descrições |
| **As peças em destaque** | `/admin/home`, bloco **Produtos em destaque** | a `50` **não semeia nada** ⇒ o bloco nem existe na Home. Ele espera ser acrescentado pela bandeja, ganhar título, receber as peças (até 12, na ordem dela), a escolha Slider/Grade e o interruptor |
| **Quem mais entra no painel** | `/admin/usuarios` | a `48` **não semeia conta nenhuma** ⇒ a lista mostra só a do `seed.sql`. Enquanto for uma linha, o painel segue com um ponto único de falha humano — e o próprio guarda do banco recusa remover o último acesso |
