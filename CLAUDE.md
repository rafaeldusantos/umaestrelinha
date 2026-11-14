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
| `apps/mobile-adm/**` | [`apps/mobile-adm/CLAUDE.md`](apps/mobile-adm/CLAUDE.md) | o painel do ateliê no celular (`AD-056`): PWA só-casca, acesso igual ao do Backoffice, splash, abas, sem conexão |
| `packages/core/**` | [`packages/core/CLAUDE.md`](packages/core/CLAUDE.md) | a regra pura de cada domínio, e por que ela mora lá e não na tela |
| `packages/ui/**` | [`packages/ui/CLAUDE.md`](packages/ui/CLAUDE.md) | shadcn, preset Tailwind, tokens `--estrelinha-admin-*`, **a biblioteca de ícones** (`@estrelinha/ui/icons`, desde a `39`) |
| `supabase/**` | [`supabase/CLAUDE.md`](supabase/CLAUDE.md) | migrations, RLS, edge functions, auth, e-mail, secrets |
| `tools/catalog-import/**` | [`tools/catalog-import/CLAUDE.md`](tools/catalog-import/CLAUDE.md) | o importador da Nuvemshop |
| UI da loja (qualquer) | [`DESIGN.md`](DESIGN.md) | identidade, paleta, tipografia |

Contexto de decisão: [`.specs/STATE.md`](.specs/STATE.md) (decisões `AD-001`..`AD-020` e handoff),
[`.specs/BACKLOG.md`](.specs/BACKLOG.md) (`BL-001`..`BL-016`),
[`.specs/LESSONS.md`](.specs/LESSONS.md). Estado das frentes abertas: [`docs/estado-conhecido.md`](docs/estado-conhecido.md);
histórico das baselines: [`docs/baselines-historico.md`](docs/baselines-historico.md).

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
  mobile-adm/    @estrelinha/mobile-adm  painel do ateliê no celular, PWA (Vite, porta 8084)
packages/
  ui/            @estrelinha/ui          shadcn/ui + preset Tailwind + tokens (styles.css) + tokens da marca (tokens/estrelinha.ts)
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
pnpm dev                # sobe os três apps
pnpm dev:store          # só a loja      (:8082)
pnpm dev:backoffice     # só o admin     (:8083)
pnpm dev:mobile-adm     # só o ateliê    (:8084)
pnpm build              # build dos três (dist/ por app; a loja gera também .server/page.mjs, a função api/page; o ateliê, manifest.webmanifest e sw.js)
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

**Supabase local roda na faixa 54440–54449**, escolhida para conviver com as outras instâncias da
máquina (54320–54329 e 54330–54339 já estavam ocupadas; ProductDock usa 55321–55327) e fora da faixa
que o Hyper-V/WinNAT reservou (54293–54392 — conferir com `netsh interface ipv4 show excludedportrange protocol=tcp`):

| Serviço | Porta |
| --- | --- |
| API (`VITE_SUPABASE_URL`) | **54441** |
| Postgres | 54442 · shadow 54440 · pooler 54449 |
| Studio | 54443 |
| **Mailpit** (todo e-mail de dev cai aqui) | **54444** |
| analytics · edge inspector | 54447 · 8085 |

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
    do painel) é de **outra sessão** e tem spec própria. **A `50` (produtos em destaque), a `51` (a
    busca de produto do painel), a `52` (entrega de e-mail comprovada), a `53` (a aba de
    Notificações), a `54` (templates de e-mail de auth), a `55` (configurações por seções) e a `56`
    (Notificações legíveis, e o padrão das Configurações) também estão FECHADAS. A `57`
    (os avisos para a dona, e o endereço que os recebe) e a `58` (pagamento PIX em rota própria)
    também estão FECHADAS. A `59` (Minha Conta V2) também está FECHADA. A `60` (a marca no
    cabeçalho dos e-mails) também está FECHADA. A `61` (Google Analytics 4 na loja) também está
    FECHADA. A `62` (título e metadados por rota) também está FECHADA — é a primeira fatia da `36`,
    que continua só com `spec.md`. A `63` (retirada no escritório), a `64` (lista de categorias na
    Home) e a `65` (convite para o Instagram na Home) também estão FECHADAS, com commit. A `66`
    (filtros de produto) também está FECHADA, com commit. A `67` (os filtros enxergam as variações)
    também está FECHADA, com commit. A `68` (SEO por variação) também está FECHADA, com commit — a
    prova em produção só existe depois do deploy. A `69` (o `<head>` servido de dentro da Vercel:
    produto com cache, categoria e páginas fixas com título no HTML, 404 de verdade e imagens no
    sitemap) também está FECHADA, com commit e em produção (`HIT` e `pdx1` medidos). A `70` (o
    sitemap servido de dentro da Vercel, e o `robots.txt` gerado de `STORE_PUBLIC_URL`) está
    IMPLEMENTADA, sem commit. A `71` (visitas únicas no Dashboard: o contador próprio, o bloco
    "Movimento da loja" e a régua de dia de Brasília no banco) está IMPLEMENTADA, sem commit,
    verificada em três rodadas (a terceira FAIL por uma lacuna de cobertura, G9, não consertada). A
    `72`..`79` são o programa mobile-adm (`AD-056`): o painel do ateliê no celular, em
    `apps/mobile-adm`. A `72` (fundação), a `73` (a Início, `AD-057`), a `74` (Pedidos, `AD-058`), a
    `75` (ações no pedido, `AD-059`), a `76` (Clientes, `AD-060`/`AD-061`) e a `79` (o aviso de pedido
    no celular, Web Push no Android, `AD-062`) estão IMPLEMENTADAS e foram mergeadas na `master` em
    2026-10-26 pela branch de integração `feature/mobile-adm`; o detalhe de cada uma (verificação, QA,
    migrations aplicadas só no local e o que falta provar no Android real) está no `STATE.md` e em
    *Estado conhecido*. A `77` e a `78` são rascunhos, a detalhar ao abrir. A `80` (o fornecedor da
    peça no painel, `AD-064` — nasceu `AD-057` e foi renumerada no merge, porque o número já era da
    `73`) está IMPLEMENTADA e commitada. A `81` (opções e variações do produto: a grade que acompanha as
    opções sem "Regerar", as sugestões derivadas do catálogo e a imagem escolhida e enviada na própria
    linha, `AD-063`) está IMPLEMENTADA e commitada, com prova em navegador, QA e **reteste de QA**
    (`docs/qa/reports/2026-10-26-opcoes-e-variacoes-reteste.md`: os quatro bugs e as três decisões —
    conjuntos mais usados, chips que permanecem, frase da pausa — passam em 390, 1440 e fonte 200 %; um
    bug novo consertado, o aviso de pausa que não saía depois de religar a linha; uma decisão nova
    aberta, o bloco de sugestões que continua com ~940px no celular depois de escolher um conjunto,
    mais as duas de antes — o "Close" em inglês e os alvos pequenos do editor). A `82` (o envelope da cliente no app do ateliê: registrar,
    ler e copiar o código de entrada do material, `AD-065`) está IMPLEMENTADA e commitada, verificada,
    provada em navegador e com QA (bugs consertados e retestados). A `83` (Loja ao vivo, Fase 1:
    a seção Acessos em `/ao-vivo` e o cartão "Visitas hoje" da Início, a hora cheia da primeira visita
    em `store_visits.first_hour`, `AD-066`) está IMPLEMENTADA e commitada, verificada em três rodadas
    (as três FAIL só por cobertura, lacunas fechadas sem rodada 4), provada em navegador e com QA e
    reteste de QA (dois bugs consertados, um esperando decisão); falta o Android real. A `82` e a `83`
    correram em paralelo (a `83` num worktree) e foram mescladas na `master` em 2026-10-27; no merge,
    o backlog e as lições da `83` foram renumerados (+1) por colidirem com os da `82`
    (`BL-056`..`BL-059`, `L-075`..`L-082`). A `84` (SEO do produto: não bloqueia, prévia servida e
    sugestão por IA com `claude-haiku-5-5`, `AD-067`) está IMPLEMENTADA, sem commit, verificada em três
    rodadas (lacunas da r3 fechadas sem rodada 4), provada em navegador e contra a Claude API real no
    ambiente local, com QA e reteste (5 bugs consertados e retestados). A `85` (resumo com imagens do
    produto) é de outra sessão, num worktree próprio. A `86` (o menu montado pela dona: lista explícita do menu principal e do submenu, no lugar das chaves na árvore de categorias) está IMPLEMENTADA, verificada, QA ready (23 tasks, sem migration, `AD-068`; três rodadas do Verificador, a 3ª FAIL só por cobertura, com as lacunas H01..H03 fechadas sem rodada 4): o menu virou o documento `store_settings.menu` v2, com o legado convertido na leitura até a primeira gravação (`BL-060` apaga o legado depois). A `87` (a qualidade das imagens: rendição de 1080 nas vagas de largura cheia, zoom de 1600 só com o ponteiro, e o envio do painel a 0.92, suavização `high`, teto de 2400 e sem recompressão do que já cabe) está IMPLEMENTADA, sem commit, verificada (r1 FAIL só por cobertura, lacunas fechadas sem rodada 2) e com QA (5 sessões `Pass`, nenhum defeito da `87`). A `88` (o aviso à cliente vira escolha nas ações do pedido do painel, e os estados de carregamento da lista e do pedido, `AD-069`) está IMPLEMENTADA, sem commit, verificada em três rodadas (a 3ª FAIL só por cobertura, lacunas fechadas sem rodada 4; 24 tasks), com QA feito (`docs/qa/reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md`) e os 7 bugs dele consertados com teste vermelho antes e mutante morto (decisões `A-14` e `A-15` pela recomendação do QA, confirmadas pelo usuário em 2026-10-30), com **dois retestes em navegador** (`docs/qa/reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md` e o adendo dele): o primeiro verificou 6 e reabriu o da rolagem a 390/200 %, achando um bug novo de foco; os dois foram consertados (opção (a) da decisão) e verificados no segundo — **os 8 bugs da `88` estão `verified`**. Falta: o avião com envio de verdade, leitor de tela real e a fonte do sistema num celular real; o "Close" em inglês segue fora. A migration `20261102120000_88-aviso-pulado.sql` (status `skipped` e a RPC `skip_order_notification`) está aplicada **só no banco local**, e a **ordem de publicação é migration → function `send-notification` → bundle do painel**. A `89` (o pedido montado pelo painel: proposta com preço travado e link de checkout pronto na loja, `AD-070`) está IMPLEMENTADA, **sem commit** (27 tasks), com prova em navegador (`.specs/features/89-pedido-montado-pelo-painel/prova-navegador.md`: montada em 1440, concluída com PIX em 390×844, o pedido no painel com a origem e o mesmo total, 390 sem rolagem a 100/130/200 % nas telas novas, e cinco defeitos achados e consertados) e **sem Verifier independente nem QA**. A migration `20261103120000_89-pedido-montado.sql` está aplicada **só no banco local**; ordem de publicação **migration → functions (`order-proposals` nova, `checkout`, `mercado-pago`) → bundles**. A `order-proposals` e a `mercado-pago` importam `core/pricing/index.ts`; o `import type` de pacote que impedia o boot **local** das duas saiu no commit `ac505fa8` (os tipos passaram a `core/pricing/types.ts`), e as duas sobem no local (medido em 2026-11-09). Para servir as functions no local sem chamar serviço externo de verdade, use `supabase functions serve --env-file <arquivo>` com chaves externas **inválidas** (Mercado Pago, Resend) — nunca o `.env` da raiz, que tem as chaves de servidor. A próxima livre é a `90`.**
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
| `56` | **o contador de caracteres, escrito CINCO vezes à mão dentro de um card** — e ausente dos quatro campos com limite das outras seções, onde o teto ia embutido no rótulo ("Título padrão (até 60 caracteres)") com o número **cravado na frase**, longe do `maxLength` que de fato limita. Ao lado dele, a **mesma string de classes** do botão de salvar escrita em três arquivos de Configurações, um deles já sem o `h-11` | `shared/ui/CharCounter.tsx` e `shared/ui/SettingsSaveButton.tsx`, com `contadorComDonoUnico.test.ts` recusando a sexta escrita dentro de Configurações |
| `58` | **DUAS superfícies montando o mesmo pagamento PIX** — o bloco 3 do acordeão do checkout e um diálogo em `/conta`, e a segunda já nascia errada: montava sem `amount`, então o valor em destaque (`CNF-01`) não aparecia justamente para quem voltava a pagar. Ao lado, o **`#` do número do pedido**, colado à mão em quatro grafias ao mesmo tempo — a loja sem prefixo, a conta e o painel com um, o e-mail com outro | a rota `/pedido/:id/pagamento` é a **única** casa do PIX (`AD-042`), com `pagamentoComDonoUnico.test.ts` recusando `qrcode.react`, o pedido de PIX e o retorno de `PixPayment.tsx`; e `formatOrderNumber` em `@estrelinha/core/orders` (`AD-043`), com `numeroDoPedidoComDonoUnico.test.ts` recusando o prefixo colado nas duas grafias e nas duas formas de juntar |
| `62` | **o `<head>` de cada rota, que não tinha dono nenhum** — 17 de 18 páginas herdavam o `<title>` do `index.html`, e a página de produto servida trazia o JSON-LD da joia ao lado do título e do card **da loja**. Com o GA4 ligado, todo `page_view` saía com o mesmo título. Escrito no cliente e no servidor separadamente, o título da aba e o do card do WhatsApp divergiriam | `@estrelinha/core/seo` (`AD-048`), lido pelo hook `usePageMeta` **e** pela `product-page`; `metaPorRota.test.ts` exige a chamada em toda página `lazy`, e `seo.test.ts` exige que a tabela das rotas fixas cubra `SITEMAP_STATIC_PATHS` ∪ `NON_INDEXABLE_PATHS` nos dois sentidos |
| `63` | **"este pedido é de retirada?" e "a retirada está disponível?", perguntados por SETE lugares** — a calculadora e o checkout da loja, a confirmação e a conta, a function `checkout` (que recusa a forjada), a `melhor-envio` (que não gera etiqueta), o motor de e-mail e o painel. Escrita em cada um, a loja ofereceria a retirada que o servidor recusa, ou o e-mail diria "postamos" de uma peça que a cliente busca no balcão | `packages/core/src/shipping/pickup.ts` (`AD-049`), **sem import nenhum** para ser alcançável pelo Deno por caminho; a identidade é `shipping_service_id = 'retirada'`, e a retirada mora FORA da cotação (`ShippingQuote` intocado); `shipping/__tests__/denoReach.test.ts` e `retiradaSemEtiqueta.test.ts` guardam as duas pontas que nenhuma outra ferramenta lê |
| `50` | **o esqueleto de carga e a revalidação, que eram a MESMA chamada** — `fetchSections()`/`fetchCategories()` significavam "carregar" e "revalidar" ao mesmo tempo, e a tela só sabia ler a primeira: toda gravação trocava a árvore por `<TableSkeleton/>`, o que **desmontava o `<iframe>` da prévia** e recarregava a loja a cada clique. E, ao lado, dois campos **de tela** do rascunho a um `insert` de distância de virar `PGRST204` | `fetchX(modo)` com o tipo `FetchMode` em **um** arquivo (`shared/lib/fetchMode.ts`) — dois nomes para o mesmo modo seriam o defeito no tamanho de um tipo, e o terceiro hook nasceria com um terceiro nome —, mais `toNewItems` como a única tradução rascunho → colunas, com `toNewItems.test.ts` recusando a oitava chave |
| `68` | **o endereço de uma variação, e a pergunta "esta opção tem página?"** — `?variant=` tinha **dois construtores** (o `offerLink` do feed e o card da `67`, à mão, com `encodeURIComponent`), e a regra de quais opções viram página teria **quatro leitores** (a página, a `product-page`, o sitemap e o painel). Escrita em cada um, o sitemap anunciaria uma URL que a página não declara canônica — e o juiz seria o Google, semanas depois | `variantPath` em `core/shopping/offer.ts` (o `<g:link>` delega a ele) e `core/seo/variant.ts` (`indexableOptions`, `productHead`), com `paginaDeOpcaoComDonoUnico.test.ts` recusando a montagem à mão e exigindo a chamada nos quatro (`AD-052`) |
| `75` | **a escrita do pedido, que ia ganhar um SEGUNDO autor** — o app do ateliê passaria a gravar status, rastreio e material do mesmo pedido que o painel grava, e a sequência "update → histórico → aviso" estava escrita dentro de `useAdminOrders`. Duas cópias divergiriam sem nada quebrar — e a do painel já tinha o defeito: um `update` que a RLS ou a guarda filtrava respondia sem erro e sem linha, e passava como sucesso, gravando histórico e avisando a cliente. Ao lado, o lembrete do WhatsApp (`chargeMaterial*`) com o segundo leitor previsto | `@estrelinha/core/order-actions` (`AD-059`), com o client e o notificador injetados e o efeito conferido por `.select('id')`; o painel delega e o app chama pela porta única `gravarAcao`; `pedidoGravadoSoPeloDono.test.ts` (allowlist de UMA declaração, `cancelOrder`) e `escritaSoPelaPorta.test.ts` recusam a volta; o lembrete subiu para `core/orders/charge.ts` com o painel reexportando (`toBe`) |
| `69` | **o `<head>` servido, que ia ganhar uma SEGUNDA casa** — a edge function `product-page` já montava o de produto no Deno, e categoria, página fixa e 404 precisavam do mesmo trabalho num segundo runtime (a função da Vercel). Escrito nos dois, a regra de canônica, de cache e de status divergiria entre produto e o resto. E `resolveCategoryRoute` vivia em `entities/category` da loja, com o servidor prestes a precisar da mesma decisão | `@estrelinha/core/page` (`AD-053`): `classifyPath` + `servePage` + `applyHead`, chamados pela função `api/page`; `resolveCategoryRoute` subiu para `core/page` e a loja reexporta (`toBe`); o código da `product-page` saiu do repositório, com `paginaDeOpcaoComDonoUnico` exigindo `productHead` em `core/page/serve.ts` |
| `86` | **o MENU, que tinha dois donos com significados diferentes** — a `sort_order` da árvore ordenava a barra do topo **e** a grade da Home e o rodapé, e as colunas `menu_desktop`/`menu_mobile`/`menu_banners` de cada categoria eram a curadoria. Reordenar o menu reordenava a Home; um link não podia ter submenu; a mesma categoria não podia estar em dois submenus | o documento `store_settings.menu` (`{ version: 2, items }`, `AD-068`), lido pela porta `menuItems` de `core/menu/structure.ts` e gravado só por `useStoreMenu`; o legado é convertido na leitura (`legacyMenuDocument`) até a primeira gravação, sem migration. `menuDocumentoComDonoUnico.test.ts` recusa escrita das colunas antigas e um terceiro leitor da linha crua |

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
    `estrelinha-recent-searches`, `estrelinha-product-draft`, `estrelinha.admin.*`,
    `estrelinha-cookie-consent` (o aviso e as preferências de cookies, feature `61`) e
    `estrelinha-google-login` (**`sessionStorage`** — marca o retorno do login pelo Google para o
    evento `login`, feature `61`) e `estrelinha-instagram-invite` (o convite para o Instagram na
    Home já foi visto neste navegador, feature `65`), `estrelinha-card-link-token` e `estrelinha-card-link-checkout` (**`sessionStorage`** — o token do link de cartão e o rascunho da página `/pagar-com-cartao`, WI 98; donos `features/card-link/model/cardLinkToken.ts` e `useCardLinkCheckoutStore`), `estrelinha-visitor` (o código aleatório do
    navegador e o prazo da próxima contagem de visita, feature `71`) e `estrelinha-nao-contar` (a
    marca de "não contar este navegador", feature `71`). As duas do contador têm **um** dono,
    `apps/store/src/shared/lib/visits/visitor.ts`, e `visitanteComDonoUnico.test.ts` recusa a chave em
    qualquer outro arquivo dos dois apps, testes inclusos. A presença na loja (Loja ao vivo, Fase 2) tem mais duas: `estrelinha-presenca` (o id
    aleatório da presença, que troca à meia-noite de Brasília pelo prazo do servidor) e
    `estrelinha-presenca-origem` (**`sessionStorage`** — só a faixa de origem do pouso da aba). O dono
    é `apps/store/src/shared/lib/presence/presence.ts`, e `presencaComDonoUnico.test.ts` recusa a
    chave em qualquer outro arquivo dos três apps, testes inclusos.
    O app do ateliê tem uma: `estrelinha-montagem-rascunho` (WI 94 — o rascunho da montagem de um
    pedido: só as peças, o cupom e o tipo e o valor do desconto combinado, preso ao id da conta, para a
    volta involuntária; **`localStorage`**, porque no app instalado o Android encerra o processo e a
    sessão da aba morre junto). O dono é `apps/mobile-adm/src/features/order-proposal/model/rascunho.ts`,
    e `rascunhoComDonoUnico.test.ts` recusa a chave em qualquer outro arquivo dos três apps, testes
    inclusos; `semDadoDeClienteNoAparelho.test.ts` aceita armazenamento só ali, e só `localStorage`.
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
| `palette.test.ts` | store `shared/lib/__tests__` | `App.css` e `tailwind.config.ts` divergirem num único token; a escala de raio mudar. **Desde a `72`**: o objeto de cores, raio, sombra e fontes do config da loja **e** do `apps/mobile-adm` deixar de SER (`toBe`) o de `packages/ui/src/tokens/estrelinha.ts` — uma cópia literal com os mesmos valores reprova (sensor) |
| `fontesDoAteliePareadas.test.ts` | idem (lê `apps/store/public/fonts` e `apps/mobile-adm/public/fonts`) | (feature `72`) um dos três `woff2` copiados para o app do ateliê divergir da loja no SHA-256, faltar ou sobrar. Âncora cravada de 3 arquivos dos dois lados e sensor com um buffer alterado |
| `contrast.test.ts` | idem | qualquer token de texto abaixo de 4,5:1 sobre `ground`/`ground-deep`/`surface`; `accent` deixar de ser proibido como texto |
| `fieldBorder.test.ts` | idem | um `<input>`/`<Input>`/`<select>`/`<textarea>` voltar a `line` ou `accent` |
| `accentText.test.ts` | idem | texto ouro fora da lista curta; `ink` **com opacidade** dentro de superfície `accent` |
| `touchTarget.test.ts` | idem | controle abaixo de 44px que não adotou `TAP_44`/`TAP_ROW`; a medida deixar de morar num lugar só |
| `brandScan.test.ts` | idem | **qualquer** ocorrência da marca anterior em `apps/`, `packages/`, `supabase/` ou nas configs da raiz |
| `storeSettingsDefaults.test.ts` | idem | os defaults do TypeScript divergirem do que as migrations gravam; o interruptor do frete grátis nascer ligado; a migration da `37` deixar de ser aditiva (`value \|\|`) ou idempotente (`NOT value ?`). **Sensor embutido**: assere que o parser devolve `undefined` para campo ausente. **Desde o WI 99**: o padrão das regiões do frete grátis deixar de ser as cinco de `core/shipping/region.ts`, na mesma ordem; a migration `20261130150000_99-frete-gratis-por-regiao.sql` gravar outra lista, deixar de ser aditiva ou idempotente (a guarda só citada em comentário não conta), alcançar outra chave que não `shipping`, ou escrever além do `update`. Um sensor por régua |
| `freeShippingSingleOwner.test.ts` | idem | qualquer arquivo de `apps/**` fora de um allowlist de **dois** ler `free_shipping_threshold`; `freeShippingProgress` ou `FreeShippingBar` voltarem a existir em produção; copy com o valor da faixa cravada em JSX. **Âncora dupla** e **seis sensores embutidos** — o removedor de comentário provado com CRLF, com LF, contra o glob de dois asteriscos que o cegava (`BL-027`, fechada em 2026-09-06: linha e bloco na **mesma** varredura) e contra uma leitura nova escondida atrás desse mesmo glob. **Desde o WI 99 o escopo inclui `supabase/functions`** (a `checkout` e a `mercado-pago` recalculam o frete grátis do pedido montado), com duas réguas novas: (1) o campo das regiões lido fora de um allowlist de **dois** — o editor do painel e o `RuntimeSettingsLoader`, que copia o que `freeShippingConfigOf` devolve, nunca o jsonb cru —, com a metade positiva (o editor e as duas functions passam pelo dono); (2) uma faixa de CEP por região escrita fora de `core/shipping/region.ts`, em `apps/**`, `supabase/functions` e `packages/**`, com a âncora das dez faixas achadas no dono. Sensores com CRLF, LF e o glob, e os inversos |
| `sacolaECheckoutMesmoTotal.test.tsx` | store `src/test` | (WI 99, `CA-04`/`CA-16`/`CA-17`) a gaveta e o checkout darem Totais diferentes para a mesma sacola, o mesmo CEP e a mesma opção. As duas telas montadas de verdade, uma depois da outra (a gaveta, depois o bloco Entrega e o resumo), sobre as stores reais e a mesma cotação dublada no client: CEP de SP e do RS com a faixa alcançada e o frete grátis em Sul + Sudeste ("liberado" nas duas, o PAC "Grátis" com o valor riscado, Total sem frete), CEP da BA ("só para Sul e Sudeste", sem barra, o frete somado nas duas), e com cupom e promoção. **Não lê fonte**: é a paridade provada por execução |
| `alvoDeToqueNaoRoubaPosicao.test.ts` | store `shared/lib/__tests__` (varre `apps/**` e `packages/ui/**`) | um controle posicionado perder a posição para **um dos TRÊS auxiliares** — `TAP_44`/`TAP_ROW` da loja e, desde a `55`, `SWITCH_TAP_44` do painel, **lido do disco** (importá-lo criaria o segundo dono que o guarda existe para impedir), com a extração lançando quando não acha —, **nas duas formas de juntar classe**: `cn(classes, TAP_44)`, onde o `relative` do auxiliar **apaga** o `absolute` na fusão do `twMerge`; e `` `${TAP_44} absolute …` ``, onde não há fusão, as **duas** classes chegam ao DOM e `.relative` vence por vir **depois** de `.absolute` na folha com a mesma especificidade. A régua **calcula** — chama o `cn` de verdade e recusa o par ambíguo —, nunca confere a ordem dos argumentos, que é o proxy que falhou quando a forma mudou. **Âncora tripla** (arquivos lidos, **as duas formas** encontradas, e o `relative` ainda presente nos auxiliares) e **dez sensores**, incluindo o inverso das duas formas, o par que prova que controle em fluxo **não** é acusado, e o que prova que posição escrita por **outra** interpolação não é atribuída ao literal |
| `importOrder.test.ts` | idem | `App.css` importado **antes** de `@estrelinha/ui/styles.css` no `main.tsx` |
| `variantFiltersSchema.test.ts` | store `shared/lib/__tests__` (lê a migration da `67`) | a migration das marcações por opção afrouxar: `if not exists` sumindo; as cascatas; os limites (120, 10 termos, 40) divergirem de `core` (**importados**); a leitura pública da marcação por opção perder uma das **duas** condições (grupo ativo **e** peça ativa); as recusas ganharem leitura pública; `with check` faltando; escrita de dado. Uma régua por comando (`L-033`) e `mutar()` que lança |
| `marcacaoPorOpcaoComDonoUnico.test.ts` | idem (varre `apps/store/**`) | qualquer arquivo da loja fora de `mapProduct.ts` citar a tabela das marcações por opção ou o campo `option_marks` — quem decide é `matchProduct` em `core`. Metade positiva: a listagem chama `matchProduct` e `facetCounts` |
| `marcacaoSoPorAcao.test.ts` | idem (varre `apps/**`, `packages/**` e `supabase/functions`) | **pela AST do TypeScript**: escrita nas três tabelas de marcação/recusa fora do allowlist literal de portas; tabela que não resolve para literal (acusada em qualquer arquivo); export novo de um arquivo-porta sem classificação (**colhido do disco**, por igualdade); uso de uma porta — chamada, `?.(`, genérico, referência, alias de import ou de barril — fora dos chamadores de Salvar, Aprovar, marcação em massa e Recusar; RPC chamada que não está na lista literal; migration que escreva nessas tabelas. É o Success Criterion "nenhuma sugestão vira marcação sem um toque da Adri". O cabeçalho declara o que **não** mede |
| `reservedSlugs.test.ts` | idem | rota nova no `App.tsx` que não entrou em `ROUTE_SLUGS`; entrada de `ROUTE_SLUGS` que deixou de ser rota. **Bidirecional** |
| `vercelRedirects.test.ts` | idem | `vercel.json` divergir de `LEGACY_REDIRECTS`; `trailingSlash` deixar de ser `false`; redirect usando `permanent` (que produz 308); o catch-all deixar de ser a função `api/page?__path=/:path*` ou sair do fim da lista de `rewrites` (desde a `69`; nenhum rewrite volta a `/index.html`); `regions` deixar de ser `pdx1`; um `rewrite` para `*.supabase.co` além do sitemap e do feed, ou um override de `Content-Type` em `/produtos/:slug` voltarem; os headers de segurança mudarem; o `rewrite` ou o `Content-Type` de `/sitemap.xml` sumirem |
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
| `menuDocumentoComDonoUnico.test.ts` | store `shared/lib/__tests__` (varre `apps/**`, `supabase/functions` e, na régua 2, `packages/*/src`) | (feature `86`, `AD-068`) quatro réguas: (1) as colunas `menu_desktop`/`menu_mobile`/`menu_banners` como CHAVE de objeto em produção, fora do mapeador de leitura da loja (`useCategories.ts`, exceção de UM com a metade positiva: ele lê e não escreve); (2) uma chamada de escrita (`.update(`/`.insert(`/`.upsert(` e as portas de escrita de categoria do painel) cujo argumento nomeie uma das três — zero exceção; (3) um terceiro arquivo tocando a linha crua do menu (`settings.menu` ou a chave `menu` de `store_settings`) além do `useMenu` da loja e do `useStoreMenu` do painel, os dois chamando `parseMenuDocument(`, e qualquer `version` comparado em `apps/**`; (4) a tela do menu (`AdminMenuPage.tsx` + `features/store-menu/**`) falando com tabela que não seja `store_settings` ou nomeando porta de escrita de categoria. Âncora dupla em cada régua, sensores com CRLF/LF/glob e os inversos (leitura, `select`, `Omit`, a porta fora da tela). **Desde a `86`, `menuSemTeto` nomeia `MenuTree.tsx` no lugar de `MenuSlotList.tsx` e `previaUnica` ancora em `MenuTree`/`MenuTargetPicker`/`useStoreMenu`** — os alvos apagados mudaram de alvo, sem perder régua |
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
| `authEmailTemplates.test.ts` | store `shared/lib/__tests__` (varre `supabase/templates/`) | qualquer um dos 3 templates de auth (`magic_link`, `confirmation`, `recovery`) perder `{{ .Token }}` ou ganhar `{{ .ConfirmationURL }}`; `<style>`/`<link>`/`@font-face`/`<script>` entrarem (a régua varre fora do comentário do topo — que CITA essas formas em prosa de propósito, a mesma armadilha que já mordeu `authSenderDomain.test.ts`); cor hex fora da paleta de `ESTRELINHA` (`layout.ts`, lido como texto — nunca importado, por não ter precedente cruzar para o workspace de `supabase/functions`); `#B8945F` virar `color:` (texto); o casco (faixa, wordmark, fio, card, caixa do código, rodapé) divergir entre os 3 fora das 3 regiões que legitimamente variam (título, parágrafo de abertura, nota final); o preheader oculto sumir, ganhar `<style>`, ou deixar de repetir o parágrafo de abertura já aprovado. **Nenhum outro comando lê `supabase/templates/`** — são 3 arquivos colados à mão num dashboard sem `config pull`. **Desde a `60`** também recusa, fora do comentário, `<svg`, o wordmark em texto, a ausência da imagem `{{ .SiteURL }}/email/…` e o fio dourado longe dela |
| `brandHeader.test.ts` | `supabase/functions/send-notification/__tests__` (lê `supabase/templates/`) | a tag da marca dos e-mails mudar de forma (`src`, 202 × 44, `alt`, o estilo do texto alternativo a **17px**, e nada de `height`/`max-width` — o `height:auto` fazia a caixa quebrada crescer); origem vazia deixar de devolver o wordmark de antes; e **os três templates de auth deixarem de conter, byte a byte, `brandHeader('{{ .SiteURL }}')`** — a função é importada, e é a guarda da cópia deliberada (`AD-045`). Sensores: o template com o wordmark antigo e o com a URL escrita por extenso reprovam |
| `emailBrandImage.test.ts` | store `shared/lib/__tests__` | `apps/store/public/email/assinatura-v1@3x.png` deixar de medir **3×** a caixa de `EMAIL_BRAND` (lida de `layout.ts` como texto), ganhar pixel transparente, perder o fundo #283A4A nos cantos, perder o traço #F7F3EC (a arte POSITIVA seria invisível na faixa), passar de 40 KB, ou **mudar de conteúdo** — o SHA-256 está fixado, porque e-mail entregue aponta para o `v1` para sempre. Decodificador de PNG próprio que **lança** fora do que sabe ler, e sensores com PNG sintético para cada régua |
| `emailCheckWorkflow.test.ts` | idem (varre `.github/workflows/`) | o `email-check.yml` medir a si mesmo em vez da produção: **qualquer literal do domínio verificado**, inclusive em comentário; a declaração de cegueira sumindo (o parágrafo que diz que ele NÃO prova SMTP nem templates do GoTrue — apagá-lo faz o próximo leitor achar que o auth está coberto); o remetente do auth virando literal em vez de vir de `config.toml`; 429/timeout deixarem de ser **indisponibilidade**; o passo 1 largando o par `200` **+** chave `from` (sem os dois, um bundle velho responde **400** com JSON válido e o sensor acusa "configuração errada" com o defeito sendo deploy velho). **Também guarda a `DLV-26`**: o passo de divergência do `Supabase Deploy` avisa e **nunca** falha o job. Recorte por bloco, que devolve `null` e **reprova** — a primeira escrita usava `[\s\S]*?` sobre o arquivo inteiro e casava o passo ERRADO |
| `pedidoComDonoUnico.test.ts` | idem (varre `apps/store/**` e `apps/backoffice/**`) | qualquer arquivo de produção gravar em `orders` ou `order_items` pelo PostgREST — desde a `49` quem grava é a edge function `checkout`, e as policies de `INSERT` continuam abertas no banco de propósito (`BL-030`), então **este guarda é a única contenção**. **Zero allowlist**, âncora dupla, e sensores que provam: as duas formas de gravação (compacta e quebrada em linhas), que **ler** não é acusado, que um `insert` em outra tabela no meio não é atribuído a `orders`, e o removedor de comentário com CRLF e LF |
| `pagamentoComDonoUnico.test.ts` | store `shared/lib/__tests__` (varre `apps/store/**`) | uma SEGUNDA superfície de pagamento PIX (feature `58`, `AD-042`). Três réguas: importar `qrcode.react` fora de `features/order-payment`; **pedir um PIX** ao `create-payment` de qualquer arquivo de produção fora do dono; e `PixPayment.tsx` voltar ao disco ou ao barrel. A régua do pedido exige o **fecho** (`,`/`}`/`)`) depois do literal, que é o que separa *chamar* a porta de *declarar* a porta — sem ele o guarda nascia acusando `useCreatePayment.ts`, o arquivo que ele existe para proteger. A do QR casa o `from`, e não o nome do componente, senão dublar a biblioteca num teste do próprio dono passaria a ser proibido. **Âncora dupla**, **allowlist de UM** e a **metade positiva**: o dono chama a porta e desenha o QR, e as duas telas (`/conta` e `/pedido/:id`) LINKAM para a rota — sem ela, apagar a ação deixaria a ausência verdadeira e vazia |
| `numeroDoPedidoComDonoUnico.test.ts` | store `shared/lib/__tests__` (varre `apps/**` e `supabase/functions/**`) | o `#` colado ao número à mão — **interpolação** (template literal e JSX) e **concatenação** —, nas duas grafias do identificador (`order_number` e `orderNumber`, que é o mesmo dado com outro nome de prop). Antes da `58` havia **quatro** grafias convivendo. **Metade positiva**: as oito superfícies chamam `formatOrderNumber`, e o lado Deno o alcança por caminho relativo **com `.ts` explícito**. Recorte à direita por token exato (`L-034`) |
| `orderNumberSchema.test.ts` | idem (lê a migration da `58`) | a sequência sumir, nascer em outro número, o `default` deixar de usar `lpad(…, 4, '0')`, a migration escrever dado, ou `orders.order_number` perder o índice único. **Sensor por mutação em cada asserção** |
| `minhaContaSchema.test.ts` | store `shared/lib/__tests__` (lê a migration da `59`) | a migration afrouxar, **uma régua por comando** (`L-033`): `customer_order_events` perder `security definer`, `search_path = ''`, o filtro por `auth.uid()` ou o `revoke` de `anon`, ou passar a devolver `note`/`created_by`; o gatilho `guard_customer_identity` deixar de recusar `email`, `user_id` ou o `cpf` já preenchido, ou virar `security definer` (perderia a saída por `current_user`); o índice de endereço padrão deixar de ser **parcial**; a renumeração deixar de recortar `like 'NP-%'` ou tocar `NS-%`. `mutar()` **lança** quando a mutação não muda nada |
| `situacaoComDonoUnico.test.ts` | store `shared/lib/__tests__` (varre `apps/store/**`) | uma segunda tabela de rótulos de status do pedido na loja — entrada de mapa ou `case` com o vocabulário de `orders.status`/`payment_status` como chave. Quem responde "em que pé está este pedido?" é `orderSituation` (`@estrelinha/core/orders`), desenhado por `OrderSituationBadge`. Era o defeito da conta: 5 rótulos à mão contra 6 status do banco, e o pedido **pago** aparecia "Pendente". **Zero allowlist**, âncora no dono em `core`, sensores de CRLF/LF/glob e o inverso. Pegou o próprio autor na `59`: um mapa de subtítulo com chave `paid` |
| `movimentoDaContaRespeitaMovimento.test.ts` | store `shared/lib/__tests__` | classe de `transition-*`/`animate-*` sem par `motion-reduce:` **que desligue movimento** na mesma linha, nas 14 telas da conta e do detalhe do pedido (`ACB-03`). **Escopo literal** (molde de `animacaoRespeitaMovimento` do painel) e régua **mais estreita** que o molde: `motion-reduce:opacity-100` não vale como par (mutante sobrevivente da verificação, rodada 2). Âncora 52 tokens / 26 pares, medida com a própria régua |
| `orderAccessSingleOwner.test.ts` | idem | qualquer arquivo fora de `entities/order/model/orderAccess.ts` citar `estrelinha-order-access` — o token é a **única** credencial de um pedido de convidada, e uma segunda leitura à mão faria a confirmação abrir vazia logo depois de ela pagar; o dono trocar `localStorage` por `sessionStorage` (fechar a aba apagaria o caminho de volta) |
| `desafioDeCodigoUnico.test.ts` | idem | um segundo campo de 6 dígitos em `apps/store/**` fora de `features/auth/ui/steps` — com o passo existente vêm o reenvio, o cooldown de 60s e a distinção entre código errado e expirado. **Tem o sentido positivo junto**: o desafio do checkout precisa **conter** `AuthCodeStep`, senão a ausência de um segundo campo seria verdadeira por não haver campo nenhum |
| `denoReach.test.ts` | `packages/core/src/checkout/__tests__` | um especificador relativo sem `.ts` — `import type` incluso — nos arquivos que a edge function importa por caminho (`identity.ts`, `guestAccess.ts`), ou um import de React/Supabase/Deno neles. O barrel fica **fora do escopo**, com a razão escrita no arquivo. Leitor injetável, com sensor de `import type`, do par com extensão, de CRLF e do removedor de comentário — que **reprovou o próprio arquivo certo** na primeira escrita, porque o cabeçalho dele cita `from './types'` em prosa |
| `http.test.ts` | `supabase/functions/_shared/__tests__` | uma segunda **declaração** de `corsHeaders` nas functions (eram TRÊS, idênticas, até a `49`); `mercado-pago` ou `send-notification` deixarem de reexportar a MESMA referência — a asserção é `toBe`, e não `toEqual`, porque igualdade estrutural passaria com uma cópia colada |
| `originZipNotRead.test.ts` | backoffice `shared/lib/__tests__` | qualquer arquivo de `apps/**` ler `store_settings.shipping.origin_zip` — o campo é LEGADO e a origem da cotação é o `postal_code` do secret `MELHOR_ENVIO_SENDER_JSON`. Deixá-lo configurável na tela faria a origem da COTAÇÃO e a da ETIQUETA poderem divergir. **Âncora dupla**, e desde a `55` o arquivo medido é `ShippingMaterialSection.tsx` — a asserção POSITIVA ao lado da negativa foi quem pegou a mudança de endereço |
| `quotePayload.test.ts` | `packages/core/src/shipping/__tests__` | `insurance_value` deixar de ser **por unidade** — a API do Melhor Envio já multiplica por `quantity`, e multiplicar aqui segura a carga pelo **quadrado** dela. Carrega **sensor embutido**: assere que a fórmula antiga do backoffice reprova na mesma régua |
| `provenanceNotRead.test.ts` | backoffice `shared/lib/__tests__` | qualquer arquivo de `apps/**` ler `nuvemshop_status`, `nuvemshop_payment_status` ou `nuvemshop_shipping_status` — as colunas cruas do import são **proveniência**, e lê-las daria duas respostas para "este pedido foi pago?". **Âncora dupla** |
| `parse.test.ts` · `recorte.test.ts` · `fixtureSintetica.test.ts` | `tools/catalog-import/src/csv/__tests__` | o CSV deixar de ser lido como Latin-1; o agrupador voltar a tratar linha como pedido (243 em vez de 70); o rastreio `="…"` chegar cru; o recorte ganhar teto e deixar pedido novo de fora; a fixture parar de ser sintética (e-mail fora de `@exemplo.invalid`, documento sem dígito repetido) |
| `orderStatus.test.ts` · `catalogMatch.test.ts` · `order.test.ts` | `tools/catalog-import/src/map/__tests__` | o de-para divergir do `CHECK` do banco (**lido do disco**); `separating` ser produzido; valor fora do vocabulário deixar de abortar; o SKU voltar a casar item; o recorte de parênteses deixar de ser balanceado; a fila de material perder um dos **dois** cortes (terminal e pagamento) |
| `orders.test.ts` | `tools/catalog-import/src/write/__tests__` | a re-execução sobrescrever coluna operacional sem `--ressincronizar-estado`; os itens deixarem de ser imutáveis; a leitura de estado atual sair do `selectAll` |
| `orderList.test.ts` (cobrança) | backoffice `features/order-list/model` | um `chargeMaterialUrl(` de `AdminOrdersPage.tsx` deixar de passar `customer_phone` — o link volta a sair **sem número**, em silêncio |
| `metaPorRota.test.ts` | store `pages/__tests__` | uma página `lazy` do `App.tsx` sem `usePageMeta(` em **código** — o hook não reverte ao desmontar (`AD-048`), então a página que esquece herda o título da ANTERIOR. **Âncora cravada** (18 páginas) e sensores: a página sem a chamada, a chamada só em comentário (CRLF e LF), e o colhedor achando página nova e ignorando a citada em prosa |
| `seo.test.ts` · `denoReach.test.ts` · `variant.test.ts` | `packages/core/src/seo/__tests__` | (feature `68`) a regra de quais opções têm página (SVR-01..07), o título de opção com a marca só até 60 caracteres e nunca cortado, a descrição começando pelo texto, a canônica da opção ser byte a byte o `<g:link>` da representante; o `denoReach` passou a exigir **exatamente 15** arquivos no grafo (era `≥ 7`), incluindo `seo/variant.ts` e os de `shopping`. E, de antes: a tabela de metadado das rotas fixas divergir de `SITEMAP_STATIC_PATHS` ∪ `NON_INDEXABLE_PATHS` (**bidirecional**, âncora 16); dois títulos fixos iguais; rota desconhecida deixar de **lançar**; a marca sair em dobro (`\| Uma Estrelinha`, `\| UE`); a descrição derivada passar de 160 ou cortar palavra. O segundo caminha o grafo **transitivo** de `core/seo` (que a function `sitemap` resolve no Deno, desde a `69`) e recusa especificador relativo sem `.ts` — `import type` incluso — ou import de pacote |
| `denoReach.test.ts` (shipping) | `packages/core/src/shipping/__tests__` | `pickup.ts` ganhar um import — relativo sem `.ts` (`import type` incluso) ou de pacote. Três functions o importam por caminho relativo (`checkout`, `melhor-envio`, `send-notification` via `core/notifications` e `core/orders`), e o barrel de `shipping` **não** é alcançável pelo Deno (`estimate.ts` usa alias). Remove comentário depois de normalizar CRLF. **Desde o WI 99, `region.ts` está na mesma régua**: folha sem import nenhum, alcançada por `freeShipping.ts` e, por ele, pelas functions `checkout` (`proposal.ts`) e `mercado-pago` (`handlers.ts`); sensor de import relativo sem `.ts` |
| `retiradaSemEtiqueta.test.ts` · `melhor-envio/__tests__/handlers.test.ts` | `supabase/functions/_shared/__tests__` e `supabase/functions/melhor-envio/__tests__` | **Desde a rodada 3 da verificação RET-15 é provada por EXECUÇÃO**: `handleCreate` saiu do `index.ts` para `melhor-envio/handlers.ts` (`AD-004`), com o client, a chamada à API (`meFetch`) e o remetente **injetados**, e o teste de unidade alimenta uma linha de retirada e assere `422 pickup_order` **e zero chamadas** ao `meFetch` injetado **e** nenhuma gravação em `orders` — com o **par** dos Correios chegando ao carrinho, para "zero chamadas" não ser verdade num handler que nunca chama nada. A leitura de `orders` do dublê só devolve `shipping_service_id` quando o `select` o pede, então a coluna também é provada executando. As três rodadas anteriores guardavam pela fonte e cada uma achou formas novas que passavam (recusa aninhada noutro `if`, em arrow nunca chamada, `meFetch` com outro nome, helper de módulo antes do portão, `try/finally`, `order` sombreado); execução nenhuma dessas burla. O guarda de fonte **encolheu** para o que o vitest não alcança: o `index.ts` importa `handleCreate` de `./handlers.ts` (com extensão), não declara um próprio, e o `case "create"` o chama com **exatamente** `{ supabase: adminClient(), meFetch, sender: ME_SENDER }` e o `body`; `meFetch` é função do `index.ts` que chama `fetch`; todo import de `handlers.ts` é relativo com `.ts`; e dentro de `handleCreate` o `body` é lido **uma vez**, desestruturando só `order_id` e `service_id` — o que torna genérico o que o teste de corpo hostil (`force`, `debug`, `bypass`…) só amostra. Pela AST, com âncoras e sensores para cada régua |
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
| `buttonShape.test.ts` | store `shared/ui/__tests__` | ação voltar a pílula; a chave custom de raio voltar ao config — desde a `72` lida no **dono** (`packages/ui/src/tokens/estrelinha.ts`), não mais no `tailwind.config.ts` da loja |
| `rotasSobGuarda.test.ts` (ateliê) | mobile-adm `app/__tests__` | (feature `72`) rota do app fora do bloco do `RequireAdmin` (menos `/login` e, desde a Fase 6, os três passos de `/recuperar`, com a razão escrita na lista); o bloco sem `loginPath="/login"`, `fallback={<Splash />}` e `unknownFallback`; mais de um `</Route>`. Molde do guarda do painel, âncora tripla e sete sensores |
| `passosSaoRotas.test.ts` | mobile-adm `features/recovery/__tests__` | (feature `72`, `MAF-24`) `PASSOS_DA_RECUPERACAO` e as rotas `/recuperar…` do `App.tsx` divergirem, ou uma rota desenhar o passo errado. Bidirecional, com sensores |
| `splashEstatica.test.tsx` | mobile-adm `app/__tests__` | (feature `72`, `MAF-27`/`MAF-28`) o `index.html` sem o ícone da aba ou com um ícone que não é o PNG de 192 do disco; a splash estática do `#root` sem o lockup **idêntico** ao asset que a `Splash` importa, com cor digitada em vez de `ESTRELINHA_COLORS`, sem o primeiro quadro da animação do React, ou o plugin desligado do `vite.config.ts`. Sensores: um byte do lockup trocado, a raiz ausente (o build lança) |
| `reentradaComClientReal.test.tsx` · `contratoComClientReal.test.tsx` | mobile-adm `app/__tests__` | (feature `72`, Fase 6) **sobre o supabase-js real**: o `INITIAL_SESSION` nulo de uma leitura que falhou desfazendo o `unknown`; a volta da aba pondo `loading` ao reperguntar o papel; o dedupe `emVoo`; e, desde o fecho da r3, os resets das refs — sair com a checagem em voo e entrar de novo ficando deslogado (X06), o "Tentar de novo" com uma repergunta em voo preso no `loading` (X07), a reentrada da mesma conta sem a splash (X05) e o `not-admin` conferido reperguntado a cada evento (X04) |
| `clientRealPareado.test.ts` | mobile-adm `test/__tests__` (lê os dois `clientReal.ts`) | (fecho da r3 da `72`) a cópia do arnês do client real na loja divergir da do app fora do comentário do topo. Âncora (os dois lidos, cada cabeçalho cita o guarda, o corte não apaga demais), dois sensores e o inverso |
| `checkoutSobreviveAVoltaDaAba.test.tsx` · `contaSobreviveAVoltaDaAba.test.tsx` | store `pages/__tests__` | (feature `72`) o `SIGNED_IN` da volta da aba, para o mesmo usuário, desmontando o checkout ou a conta ("Carregando..." e o nó trocado) — o `CheckoutPage` e a `AccountPage` reais sob o `AuthProvider` e o client reais. A vizinha do checkout prova que a mesma vigia enxerga o "Carregando..." de uma identidade nova |
| `abasSaoAsRotas.test.ts` | mobile-adm `widgets/tab-bar/__tests__` | `TABS` e as rotas do `App.tsx` do ateliê divergirem, nos dois sentidos (aba sem rota, rota sem aba) |
| `swSemDadosDaLoja.test.ts` · `manifest.test.ts` · `vercelConfig.test.ts` | mobile-adm `app/__tests__` | (feature `72`) o service worker ganhar `runtimeCaching`, casar o host do banco ou pré-carregar `json` (`MAF-20`); um campo do manifest (`MAF-01`), a cor digitada em vez de vir de `ESTRELINHA_COLORS`, um ícone com tamanho diferente do declarado (lido do cabeçalho PNG) ou a fiação com o `VitePWA`; os headers de `MAF-04`, `sw.js`/manifest em cache, o rewrite da SPA capturando os dois |
| `lockupDaSplashPareado.test.ts` · `Splash.test.tsx` | mobile-adm `features/splash/__tests__` | (feature `72`) a cópia do lockup negativo da splash divergir do SVG-fonte de `.specs/brand` (byte a byte, com sensor); a splash ganhar `<img>`, perder os 300/120 px ou o rótulo, ou uma animação sem `motion-reduce:animate-none` no mesmo nó |
| `dialogGridTrack.test.ts` | store `shared/lib/__tests__` (varre `packages/ui/src/dialog.tsx` e `alert-dialog.tsx`) | `DialogContent` ou `AlertDialogContent` declararem `grid` sem trilha de piso zero. A coluna implícita `auto` toma como base a maior contribuição de **min-content** dos filhos, e `truncate` (que é `white-space: nowrap`) contribui com a linha inteira — `min-w-0` e `overflow` no caminho dão piso zero ao item, **não teto à contribuição**. Medido: trilha de 1141px num cartão de 660. **Mora na suíte da loja pelo mesmo motivo que `icons.test.ts`**; varre os dois arquivos porque o `alert-dialog` é cópia literal da mesma linha do shadcn. **Âncora dupla** (arquivos lidos **e** classe encontrada em cada um), **quarta âncora** lendo o preset para provar que `grid-cols-1` É `minmax(0, 1fr)`, e seis sensores — inclusive o par que prova que `grid` casa por token e não por prefixo de `grid-cols-1` |
| `icons.test.ts` | store `shared/lib/__tests__` (varre `packages/ui/src/icons`) | ícone fora da grade `0 0 24 24`; escala × traço ≠ 1,5; cor fora de `ICON_ACCENT`; ícone que não chegou ao barrel. **Mora na suíte da loja porque `packages/ui` não tem runner** — guarda que não roda é pior que guarda nenhum |
| `paths.test.ts` | store `shared/ui/brand/__tests__` | `paths.ts` divergir do SVG-fonte em um caractere; dois `<path>` do mesmo SVG com a mesma espessura |
| `previaUnica.test.ts` | backoffice `features/home-composition` | um segundo desenho da Home, do MENU **ou do CARROSSEL** voltar ao painel; `MenuBarPreview.tsx` reaparecer; um arquivo de `store-menu` importar `menuPanelColumns` ou `resolveMenuBanners` (calcular o desenho do painel da loja **é** o segundo desenho); qualquer dos dois importar de `apps/store`. **Cobre as features `25`, `39`, `41` e `47`**, com âncora dupla e sensor de CRLF/LF. A régua do carrossel é a **mecânica** (`snap-x`, `scroll-snap`, `aria-roledescription="carrossel"`, `setInterval`), não o nome do arquivo — "só uma mini-prévia para conferir a ordem dos banners" é o pedido razoável que traz o defeito de volta. **Desde a `47`** também recusa a tela cheia virando prévia nova: arquivo `…Preview` novo nas duas pastas de UI, um segundo `<iframe>` em qualquer arquivo, ou o palco ramificando por tipo de seção dentro do modo. O sensor **cria um palco sintético em `mkdtemp` e chama a régua de verdade** — simular o que ela devolveria não prova régua nenhuma |
| `animacaoRespeitaMovimento.test.ts` | backoffice `shared/lib/__tests__` | uma classe de `transition-*` ou `animate-*` sem o par `motion-reduce:` **na mesma linha**, em qualquer dos **nove** arquivos de UI em escopo — os oito que a `50` tocou mais o `ProductSearchField` da `51`, que **entrou na mesma task em que nasceu**, com as âncoras de contagem subidas junto (8/4 → 14/7). A régua é de **token exato** (`(?![-\w])`, `L-034`): `animate-spin` é dispensado — é indicador de progresso, não enfeite, e congelá-lo apagaria o único sinal de que a gravação está em curso —, mas `animate-spinner` e `animate-spin-slow` **são acusados**. **Âncora TRIPLA** (arquivos lidos · tokens de movimento encontrados · pares encontrados) e sete sensores: a classe sem par reprova e com par passa, `hover:` na frente não desculpa, `transition` pelado é acusado, a prosa que explica a regra **não** é (com CRLF **e** com LF), e o par a três linhas de distância não cobre nada. **O escopo é literal e estreito de propósito** — ver a dívida em *Estado conhecido* |
| `layoutDoCarrossel` (`ProductCarouselLayout.test.tsx`) | store `widgets/product-carousel/ui/__tests__` | as três formas do `ProductCarousel` (`row`, `slider`, `grid`) saírem de mais de um mapa, ou uma delas mudar de classe. `row` é a Home de hoje e é **imóvel** (`HOME-04`); `slider` rola nos dois tamanhos e `grid` embrulha em 2 colunas no celular e 4 a partir de `md`. Régua por **token exato**, com asserção positiva no celular **e** no `md` (`L-029`) — sem as duas, a metade fácil provaria a AC inteira |
| `toNewItems.test.ts` | backoffice `features/home-composition/model/__tests__` | um campo **de tela** do rascunho (`key`, `product_slug`) chegar ao `insert`. A régua é **igualdade de chaves** com as **oito** colunas desde a `64` (`title` entrou; eram sete), nunca "contém as oito": uma régua de presença aprova o oitavo campo, que é exatamente o que ela existe para recusar. É o modo de falha do `AD-012` — `PGRST204` em produção, com a curadoria inteira perdida e nada na tela —, invisível para `tsc` (as sete colunas são opcionais), para o `build` e para o teste do editor, que mocka o client |
| `buscaDeProdutoComDonoUnico.test.ts` | backoffice `shared/lib/__tests__` | **três réguas, ZERO allowlist** (feature `51`, `AD-036`). (1) qualquer arquivo de `apps/backoffice/src/**` fora de `entities/product/api/**` consultar `products` **filtrando por nome** — e a régua casa **as duas formas**, porque o dono não usa a que a spec presumia: ele monta `` `name.ilike.%…%` `` como **string** para o `.or()`, e a chamada de método que existe no arquivo é sobre `sku`. Uma régua só de método teria nascido **verde sobre nada** (`L-033`). O recorte à esquerda é por token exato, senão `customer_name.ilike.` — a busca de PEDIDO, legítima — cairia junto (`L-034`). (2) a **declaração** da dobra de busca fora de `shared/lib/texto.ts`: a régua **caminha pela cadeia de chamadas** e acusa a que **termina** no acento — o gerador de slug e a normalização de tag continuam depois dele (hífen, espaço) e são outra função, e o sensor prova que um slug que perca a junção por hífen **volta a ser acusado**. (3) o catálogo virando `<option>`/`<SelectItem>` fora de `entities/product/**`; **o alcance desta terceira é o NOME da variável, e isso está declarado no arquivo** — uma régua puramente estrutural acusaria as doze listas de categoria do painel, que têm a forma idêntica. **Âncora dupla**, com a terceira ancorada no extrator de JSX (o dono é `<ul>` de `<li>` por `BUS-17`, então não há ocorrência legítima nele — fingir uma seria âncora falsa), e **treze sensores**, incluindo o glob de dois asteriscos (`BL-027`), o CRLF, o LF, e os inversos que provam que a busca de pedido, o gerador de slug e as listas de categoria **não** são acusados |
| `navItems.test.ts` | backoffice `widgets/admin-layout` | ordem das rotas em `App.tsx` divergir de `navGroups` |
| `settingsSections.test.ts` | backoffice `shared/lib/__tests__` | o registro das 4 seções de Configurações mudar de ordem, ganhar slug fora de kebab-case, ou `findSettingsSection` deixar de devolver `null` para slug inexistente, vazio e ausente — é lá que `CFG-18` mora, num lugar só. Também recusa duas descrições iguais (duas linhas do rail indistinguíveis abaixo do rótulo) e uma cópia no lugar da referência do registro |
| `ownerEmailComDonoUnico.test.ts` | store `shared/lib/__tests__` (varre `apps/**` e `supabase/functions/**`) | qualquer arquivo de produção NOMEAR `notifications_email` fora do formulário que o edita — o campo só tem uma razão para aparecer num app, que é ser editado, e qualquer outra ocorrência é alguém resolvendo o destinatário dos avisos à mão. **Allowlist de UM**, e a régua vem com a **metade POSITIVA**: os três consumidores (`recipientFor`, a pré-condição e o aviso do painel) têm de CHAMAR `resolveOwnerEmail`/`ownerContactMissing` — sem ela, apagar as três chamadas deixaria a regra de ausência verdadeira e vazia (`originZipNotRead`). Recusa também a forma exata que a `57` removeu (`general.email === ''` como decisão de destinatário), que voltaria por "simplificação" levando a queda junto. Inverso provando que `general.email` — o e-mail **público**, lido por `PolicyContact` — não é acusado |
| `catalog.test.ts` | `packages/core/src/notifications/__tests__` | os três mapas de apresentação divergirem dos 15 eventos (chave a mais **ou** a menos); **um nome de evento virar CÓPIA do rótulo de histórico** — os dois mapas respondem perguntas diferentes (*"que evento é este?"* × *"o que aconteceu com este pedido?"*), e a cópia faz a tela de configuração intitular cada card no passado, acima de um interruptor desligado; nome no particípio de "enviado" mesmo sem ser cópia literal; nome ou descrição vazio, repetido ou longo demais; descrição que não começa por "Enviado" (ela responde QUANDO, nunca O QUE) ou que leve exclamação; chave de ícone fora do vocabulário, órfã, ou repetida entre dois eventos. A **pureza** do módulo não é remedida aqui: `purity.test.ts`, ao lado, já lista o diretório do disco e alcança o arquivo novo por construção |
| `eventIcons.test.ts` | backoffice `features/notification-settings/ui/__tests__` | chave de `NOTIFICATION_ICON_KEYS` sem componente **ou** componente sem chave — **bidirecional**, no molde de `menuIconCatalog.test.ts`, porque o `tsc` pega só o primeiro sentido. Guarda também o **percurso inteiro** (evento → chave → componente), que os dois mapas podem satisfazer isoladamente e quebrar juntos |
| `contadorComDonoUnico.test.ts` | backoffice `shared/ui/__tests__` | uma segunda escrita do contador de caracteres dentro de Configurações — a forma "comprimento colado numa barra", nas duas grafias (interpolação de template e chave de JSX). **Escopo LITERAL e estreito**, com o motivo escrito no arquivo: a primeira escrita varria o painel inteiro e nascia acusando **sete** ocorrências em cinco arquivos fora de Configurações, que **não são a mesma função** (duas aparam antes de contar, duas escrevem o sufixo "caracteres") — e guarda que nasce reprovando sete vezes é guarda que alguém desliga. **Allowlist de UM** (o dono), âncora dupla (arquivos lidos **e** a forma encontrada no dono), e sensores com os dois inversos (`.length` sem barra, e divisão POR comprimento) mais o removedor de comentário com CRLF, LF e o glob de dois asteriscos |
| `panels.test.tsx` | backoffice `widgets/settings-sections/model/__tests__` | o registro das seções e o mapa `slug → painel` divergirem, **nos dois sentidos**: seção sem painel abre o vazio, painel sem seção fica no bundle sem ninguém alcançar. O `tsc` pega só o primeiro (`Record<SettingsSectionSlug, …>`). Também recusa duas seções compartilhando o mesmo componente — o erro que passa por completude |
| `rotasDeConfiguracoes.test.ts` | backoffice `app/__tests__` | as duas rotas de Configurações deixarem de ser **irmãs auto-fechadas**. A forma idiomática do react-router (rota-mãe com filhos aninhados) faz o `indexOf('</Route>')` de `rotasSobGuarda` fechar no lugar errado e **encolher o guarda de autorização do painel inteiro**. Também recusa um `<Navigate>` na rota-mãe (`CFG-17`) e as duas rotas montando componentes diferentes. O parser caminha por profundidade de `{}` em vez de regex — `element={<X />}` contém um `/>` dentro da tag, e a primeira escrita declarava **toda** rota auto-fechada; quem acusou foram os dois sensores |
| `semAbaEmConfiguracoes.test.ts` | backoffice `shared/lib/__tests__` | qualquer arquivo de `apps/backoffice/src/**` chamar uma seção de Configurações de "aba" — os **seis** rótulos inequívocos das abas mortas, os **quatro** rótulos de seção novos, e a forma `Configurações → <rótulo>`. **`Geral` e `SEO` sozinhos ficam de fora, com o motivo escrito no arquivo**: o formulário de produto tem abas de verdade com esses nomes, e um guarda que nasce reprovando outra tela é um guarda que alguém desliga. A forma com seta descarta as seções VIVAS por lookahead — sem isso ela acusava `Configurações → Dados da loja` (a copy nova) e `→ Frete e Material` (por `Frete` ser prefixo). **Allowlist de UM** (o próprio guarda) com o caso que prova que outro arquivo de teste seria acusado |
| `focusRoutes.test.ts` | idem | rota de foco que não é destino da navegação — a âncora varre `navGroups` **+ `footerNavItems`** desde a `55`, que é o que o trilho renderiza (varrer só metade era a régua medindo menos que a regra); `/admin/homologacao` passar a contar como Home por prefixo cru. Guarda também a **inversão** da `55`: `/admin/configuracoes` PEDE foco, e os outros dois destinos do rodapé não |
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
| `urls.test.ts` · `render.test.ts` | `packages/core/src/sitemap/__tests__` | produto fora de `/produtos/:slug`; subcategoria em um segmento; `<loc>` relativa, com barra final ou com query **que não seja `?variant=` de opção indexável** (a `SMP-07` foi revogada nessa forma pela `68` — `utm`, `&` extra e `?variant=` de opção não indexável continuam reprovando, e SVR-28 é provada nos dois sentidos: sitemap ⊆ autocanônicas e autocanônicas ⊆ sitemap); forma legada presente; `changefreq`/`priority` voltarem; o escape sair na ordem errada. Carrega **sensor embutido**: assere que um gerador ingênuo (`'/' + slug`) **reprova** na mesma régua |
| `readAll.test.ts` | `packages/core/src/paging/__tests__` | leitura truncada aceita; total lido divergir da contagem e passar; página vazia não interromper o laço |
| `catalog.test.ts` · `defaults.test.ts` | `packages/core/src/home/__tests__` | um arquivo de `core/home` importar React ou Supabase; a varredura render menos de 10 arquivos; a semente divergir do que a loja desenha. **Invertido na `64`**: nenhum tipo está mais "em breve" (`COMING_SOON` vazio) e os onze tipos prontos são listados por extenso — ao lado dele, `HomeRenderer.test.tsx` (store) passou a exigir componente para **todo** tipo do registro e `HomeBlockTray.test.tsx` (backoffice) a oferecer "Lista de categorias" habilitada |
| `categoryListSchema.test.ts` | store `shared/lib/__tests__` (lê a migration da `64`) | `home_section_items.title` sem `add column if not exists`; o número do `check` divergir de `CATEGORY_LIST_ITEM_TITLE_MAX` (**importado** de `@estrelinha/core/home` — a tela recusaria o que o banco aceita, ou o contrário); `grant` alcançar `anon`; a migration escrever dado. **Âncora dupla** (arquivo lido e número extraído) e `mutar()` que **lança** sem alvo, com um sensor por asserção |
| `orderList.test.ts` | backoffice `features/order-list/model` | o "limpar filtros" voltar a ignorar um eixo; a busca perder uma das cinco colunas; `Precisa de ação` deixar de ser a união dos três acionáveis ou passar a incluir o Pix; o lote de material abortar na primeira recusa, ou parar de separar RECUSA de FALHA; o teto de 50 sumir; a cobrança por WhatsApp ganhar urgência fabricada ou passar a nomear o material (`BL-015`) |
| `orderDetail.test.ts` | backoffice `features/order-detail/model` | o histórico deixar de fundir os três fios ou de ordenar por tempo; e-mail que falhou parar de dizer que a cliente não soube; o "próximo passo" bloquear em vez de explicar; `delivered`/`cancelled` deixarem de ser fim de linha |
| `pickSlip.test.ts` | backoffice `features/pick-slip` | a folha perder itens, gravação, material esperado ou endereço; o conteúdo deixar de ser escapado; a folha voltar a carregar CSS do painel; o lote parar de gerar uma folha por pedido |
| `apiShape.test.ts` | `tools/catalog-import` | a Nuvemshop mudar a forma de um campo que o mapeamento lê; a fixture perder um caso de borda |
| `db.test.ts` (`selectAll`) | idem | uma leitura de "o que já existe" voltar a `select` simples e ser truncada em 1.000 linhas pelo PostgREST |
| `handlers.test.ts` (sitemap) | `supabase/functions/sitemap/__tests__` | um caminho degradado responder 200; **um corpo de erro carregar `<urlset>`**; o `Content-Type` da resposta boa deixar de ser `application/xml`. **Desde a `68`**: leitura de variações ou de marcações falhando ou truncada (acima de 1.000) também é degradada, nunca um sitemap 200 sem as páginas de opção |
| `paginaDeOpcaoComDonoUnico.test.ts` | store `shared/lib/__tests__` (varre `apps/store/src`, `apps/store/server`, `apps/backoffice` e `supabase/functions`, só produção) | fora de `packages/core`: `?variant=` montado à mão (interpolação ou concatenação), chamada a `brandedTitle(`, ou o travessão emendando um nome e um texto de opção (feature `68`, SVR-39/40). **Metade positiva**: a `ProductPage` e `core/page/serve.ts` (desde a `69`; nenhuma edge function chama mais) chamam `productHead`, o `ProductCard` chama `variantPath`, e `core/sitemap/urls.ts` chama `indexableOptions`. A régua do travessão exige os **dois lados** e tem inverso provando que dez templates de copy com travessão não são acusados. Âncora dupla, sensores de CRLF/LF/glob |
| `serve.test.ts` · `classify.test.ts` · `head.test.ts` · `categoryRoute.test.ts` · `productHead.test.ts` · `purity.test.ts` | `packages/core/src/page/__tests__` | (feature `69`) a resposta de cada caminho: status (200/301/404), `Cache-Control` por ramo (`s-maxage=300` página · `60` 404 · `3600` fixa e app · `no-store` erro), `noindex` **no HTML** do 404, `Location` exato, a precedência ativa > `category_redirects` > inativa > 404, erro de leitura nunca virando 404, `applyHead` sem tag duplicada; os 90 casos que eram da `product-page` moraram aqui. `purity` recusa React, Supabase, `node:`, Deno e alias |
| `images.test.ts` · `imagesDenoReach.test.ts` (core `page`) · `images.test.ts` (core `sitemap`) · `wiring.test.ts` (function `sitemap`) | idem | (feature `69`) `productPageImages` com o `[0]` byte a byte o `og:image` da página; `<image:image>` só na `<url>` de produto, escapado, até 1.000, namespace declarado; a function pedindo `images`, `stock_policy`, `image_url` e `stock` (sem `stock` a representante muda e a primeira foto deixa de ser o `og:image`); o grafo de `images.ts` alcançável pelo Deno |
| `rotasDeApp.test.ts` · `paginasFixasServidas.test.ts` | store `app/__tests__` | (feature `69`) `APP_ROUTE_PATTERNS` divergir do `App.tsx` (**bidirecional**, âncora 25 rotas / 14 de app); página de `SITEMAP_STATIC_PATHS` − `/` não classificada `static` ou servida sem o `<title>`, a descrição e a canônica de `staticPageMeta`, e o inverso |
| `categoryFallbackSchema.test.ts` | store `shared/lib/__tests__` (lê a migration da `69`) | `category_fallback` perder `security definer`, `search_path = ''` ou `stable`; ler coluna além de `id`/`slug`/`parent_id`/`active`; `execute` alcançar papel além de `anon`/`authenticated`; escrever dado; o sentinela `00000000-…` mudar. Uma régua por comando e `mutar()` que lança |
| `page.test.ts` | store `server/__tests__` | (feature `69`) a função `api/page` pedir as colunas e os filtros certos (dublê que registra tabela, `eq`, `order` e args de RPC), reconstruir a URL de `__path` preservando `?variant=` (e recusando `//host`), e responder `no-store` sem env. **Nunca nomeia a chave de serviço** |
| `sitemapCheckWorkflow.test.ts` | store `shared/lib/__tests__` (lê `.github/workflows/sitemap-check.yml`) | o passo da canônica do sensor diário perder a comparação de **origem** (SVR-41 — a canônica servida tem a origem de onde o sitemap foi buscado), a igualdade canônica == `<loc>` da opção (SVR-34), ou passar a falhar com zero `?variant=` (SVR-35); literal de domínio, slug ou id no passo (SVR-36). Recorte por bloco que devolve `null` e **reprova**, e `mutar()` que lança sem alvo |
| `visitasSchema.test.ts` | store `shared/lib/__tests__` (lê a migration da `71`) | **uma régua por comando** (`L-033`): `store_visits` com coluna além de `visitor_id`/`day` ou sem PK nas duas; as duas tabelas sem RLS, sem `revoke all` dos três papéis ou com `create policy`; `prune_store_visits` `definer` ou com `grant`; `record_store_visit`/`store_clock` sem `definer`, sem `search_path = ''` ou **sem `grant execute … to service_role`** (o `revoke … from public` o tira junto); `store_movement` sem `has_role` **no corpo**, com `execute` a `anon`; chamada sem `public.` nos corpos; `sum(` sem `coalesce(`; `ate`/`agora` sem `::bigint`; o nome do fuso fora de `store_time_zone()`, repetido ou diferente de `STORE_TIME_ZONE` (**importado**); `current_date`, `now()::date`, `paid_at::date`, `date_trunc('week'`, offset fixo; o teto de 5.000 e a poda de 7 dias; o agendamento do `pg_cron` fora do `if exists` ou com `create extension`; escrita de dado fora de função. Âncora: arquivo + 2 tabelas + 9 funções + o bloco do `pg_cron`; `mutar()` que lança |
| `overviewSchema.test.ts` | store `shared/lib/__tests__` (lê a migration da `73`) | (feature `73`) **uma régua por comando** (`L-033`): `store_overview` sem `has_role` ⇒ `42501` antes de qualquer leitura, sem `security definer`, sem `search_path = ''` ou `stable`; `execute` a `anon`/`public`; a venda sem o par do `AD-055` (`approved` **e** `<> 'cancelled'`); recorte de dia por `current_date`, `now()::date`, `date_trunc('month', now())` ou sem `store_day_start`; o `limit 4` das joias ou dos recentes sumindo; chamada sem `public.`; escrita de dado. Âncora: arquivo, função e as 8 CTEs; 22 sensores com `mutar()` que lança |
| `filaComDonoUnico.test.ts` | idem (lê a migration da `73` e importa `core/orders`) | (feature `73`, `AD-057`) a cópia SQL da regra da fila divergir do dono: cada um dos 4 blocos de `QUEUE_BLOCKS` exige **exatamente** `count(*) filter (where <toSqlPredicate(bloco)>)` na migration, e "Precisa de ação" o `or` dos três (`needsActionSqlPredicate`) — nunca a soma; a idade (`aguardando_desde`) e a fila sem recorte de data. Um sensor por bloco e por régua, e um mutante em `queue.ts` que derruba o guarda |
| `fusoComDonoUnico.test.ts` | idem (varre `apps/*/src`, `apps/store/server`, `packages/*/src` e `supabase/functions`, só produção) | o nome do fuso da loja escrito fora de `packages/core/src/time/zone.ts` — **sem allowlist**. Metade positiva: as quatro escritas antigas (`core/orders/situation.ts`, o `copy.ts` e o `AnalyticsSecretField.tsx` do GA no painel, `orderMeta.ts` da loja) **importam e usam** `STORE_TIME_ZONE`. A do importador fica fora, declarada |
| `visitanteComDonoUnico.test.ts` | idem (varre `apps/*/src`, **testes inclusos**) | as duas chaves do contador fora de `shared/lib/visits/visitor.ts`; os testes do contador deixarem de **importar** as constantes. Allowlist de um (o próprio guarda), com o caso que prova que um teste irmão **seria** acusado |
| `parametroNaoContarComDonoUnico.test.ts` | idem (varre `apps/*/src` e os quatro `packages/*/src`, testes inclusos) | o nome do parâmetro de "não contar" escrito fora de `core/visits/optOut.ts` (token com fronteira de hífen, `L-034` — a chave do armazenamento, que termina com o mesmo nome, passa). **Metade positiva**: o `VisitCounter` chama `readOptOutParam` e o menu da conta chama `optOutHref`. Allowlist de três, literal (o dono, o teste do dono e o guarda) |
| `contadorSemGa.test.ts` | idem (lê `shared/lib/visits/**` e `app/VisitCounter.tsx`) | o contador lendo o interruptor do GA4, o ID de medição ou `canMeasure` — desligar o GA4 não pode zerar as visitas. Sensor: `analytics/index.ts` **seria** acusado |
| `politicaDoContador.test.ts` | store `pages/__tests__` | o contador existir sem o parágrafo do Apêndice A na `PrivacyPolicyPage` (`VIS-37`); uma palavra trocada no parágrafo reprova |
| `contadorMontado.test.tsx` | store `app/__tests__` | o `VisitCounter` fora do `App.tsx`, dentro das `Routes` ou sem `!previewMode` |
| `denoReach.test.ts` · `bots.test.ts` | `packages/core/src/visits/__tests__` | uma folha de `visits` (ou `time/zone.ts`) com import, `import type` incluso; o barril com especificador sem `.ts`; a lista de robôs diferente de **20** ou classificando um dos cinco inversos (Safari de iPhone, Chrome de Android, Instagram, WhatsApp, `CUBOT_X30`) — com o sensor de que um `/bot/i` ingênuo reprova na mesma régua |
| `rateLimit.test.ts` | `supabase/functions/_shared/__tests__` | a `checkout` deixar de reexportar a **mesma** referência de `createRateLimiter`/`clientIp` (`toBe`); uma segunda declaração nas functions |
| `AdminDashboard.test.tsx` | backoffice `pages/admin` | o bloco "Movimento da loja" deixar de ser o primeiro irmão do cabeçalho; mais de **um** `supabase.channel(` com o Dashboard montado (re-render incluso); o aviso do canal deixar de reler as estatísticas **e** o movimento (provado pelo que muda na tela); os dois cards de "hoje" em UTC voltarem (`VIS-35`, assunção pendente). Página real e widget real |
| `semPessoas.test.ts` | backoffice `widgets/store-movement/__tests__` | "pessoas" ou "usuários" nos literais do bloco (`VIS-41`): o número é de navegadores. Desde a `83` lê também `core/stats/counterNotes.ts`, para onde as notas subiram |
| `visitasPorHoraSchema.test.ts` | store `shared/lib/__tests__` (lê a migration da `83` e toda migration que altera `store_visits`) | (feature `83`, `AD-066`) uma régua por comando: `store_visits` com coluna além de `day`/`visitor_id`/`first_hour` (todo `add`, `rename` ou troca de tipo, em qualquer migration — `L-035`); `first_hour` sem o `check` 0–23; `store_hour` fora de `store_time_zone()` ou com `execute`; o `insert` sem `store_hour(p_agora)`, sem `on conflict do nothing` ou com um `update` de `store_visits`; `record_store_visit` sem o `grant` à service role, o teto ou a poda; `store_movement` sem `has_role` ⇒ `42501` antes do primeiro `select`; `periodos` divergindo byte a byte da `71` (por fragmento); a largura da faixa divergindo de `ACCESS_BAND_LABELS` (**importado** de `core/live`); mais de UM `from public.store_visits` no corpo (o snapshot). `visitasSchema` passou a aplicar as réguas dele também à migration **vigente**, por `visitasRegras.ts`. `mutar()` que lança |
| `notasDoContadorNoCore.test.ts` | backoffice `app/__tests__` | (feature `83`) as três notas do contador e `formatCount` do painel deixarem de ser as de `core/stats/counterNotes.ts` por referência (`toBe`) — uma cópia com o mesmo texto reprova |
| `aoVivoSemRelogioDoAparelho.test.ts` · `tomDaLojaAoVivo.test.ts` · `periodosComDonoUnico.test.ts` · `aoVivoComClientReal.test.tsx` | mobile-adm `shared/lib/__tests__` e `app/__tests__` | (feature `83`) o relógio do aparelho nos arquivos da `83` e em `core/live` (allowlist de UM, `useSegundosDesde.ts`); emoji, `!`, urgência e "pessoa(s)" nos literais; a lista de períodos fora do dono; a recusa sobre o client real. Detalhe em `apps/mobile-adm/CLAUDE.md` |
| `idDoVisitanteSoNoEnvio.test.ts` | store `shared/lib/__tests__` (varre `apps/store/src` e `apps/backoffice/src`, só produção) | (feature `71`, `VIS-12`) um segundo consumidor do id do navegador: fora de `shared/lib/visits`, só `app/VisitCounter.tsx` importa ou reexporta `ensureVisitorId`, `postVisit` ou `readMarker` — por import nomeado, de namespace, `export … from` ou `import()` dinâmico; dentro da pasta, só `send.ts` faz rede (`fetch`, `sendBeacon`, `XMLHttpRequest`); e o `VisitCounter` não faz rede própria. Nasceu do conserto r1 da verificação: até ali "o id não vai em outra requisição" era verdade só por leitura |
| `fornecedorSchema.test.ts` | store `shared/lib/__tests__` (lê a migration da `80`) | (feature `80`, `AD-064`) uma régua por comando: as duas tabelas sem `if not exists`; o teto do nome e do link divergirem de `@estrelinha/core/suppliers` (**importados**); o nome deixar de ser único por `lower(btrim(name))`; o vínculo perder a chave `product_id` com `on delete cascade` ou o `on delete restrict` do fornecedor; o `check` do link perder o `^https?://`; RLS desligada, `revoke all … from anon` ausente, policy sem `has_role` no `using` **e** no `with check`, `to public`, uma **segunda** policy; `grant` ao anon; escrita de dado. `mutar()` que lança — e o sensor da policy carrega o **nome da tabela**, porque os dois corpos são idênticos e a mutação só do corpo acertava a tabela errada |
| `fornecedorForaDaLoja.test.ts` | idem (varre `apps/store/src`, `apps/store/server` e `supabase/functions`) | (feature `80`) o nome de `suppliers`/`product_suppliers` como token em qualquer arquivo que serve a cliente — inclusive as edge functions, que rodam com a chave de serviço e ignoram o RLS. Allowlist de dois (os dois guardas), âncora por escopo e piso de 300 arquivos, sensores com CRLF e o inverso |
| `infoGutter.test.tsx` | backoffice `widgets/store-movement/ui/__tests__` | o `PopoverContent` do ⓘ perder o `collisionPadding={16}` ou o teto `w-[min(18rem,calc(100vw-32px))]` (token exato) — sem eles o balão encosta na borda da tela em 390, achado na prova de ponta a ponta da `71` (molde de `stripEPopover.test.tsx`) |
| `atelieClockSchema.test.ts` | store `shared/lib/__tests__` (lê a migration da `74`) | (feature `74`, `AD-058`) **uma régua por comando** (`L-033`): `atelie_clock` sem `security definer`, `search_path = ''` ou `stable`; com argumento; a recusa (`has_role` ⇒ `42501`) deixando de ser o PRIMEIRO comando do corpo; `lido_em` fora de `now()`; `from`/`join`/`select` no corpo; `execute` a `public`/`anon` ou a papel além de `authenticated`; escrita de dado; `has_role` sem `public.`. Âncora, 17 sensores, `mutar()` que lança. E `atelie_clock` entrou na lista literal de `marcacaoSoPorAcao` |
| `regrasDoPedidoNoCore.test.ts` | backoffice `app/__tests__` | (feature `74`) um dos 17 símbolos que subiram para `core/orders` (visões, recorte, busca, linha, `rowSummary`, `nextStep`, `buildHistory`, `shippingLine`, rótulos e tons de pagamento) deixar de ser reexportado pelo painel **por referência** (`toBe`) — uma cópia com o mesmo valor reprova (sensor). Mora em `app/` porque de `entities/` o import de `features/` é fronteira FSD ao contrário |
| `regraDePedidoSoNoCore.test.ts` | mobile-adm `shared/lib/__tests__` | (feature `74`, `MAP-49`) entrada de mapa ou `case` com chave dos vocabulários de visão, status, pagamento ou meio (**importados** de `core`), ou predicado de recorte (`status`, `material_status`, `payment_status`, `payment_method`, `tracking_code`) pela chamada ou pela string de `.or()`, em qualquer arquivo de produção do app. **Não** acusa `.eq('id')`/`.eq('order_id')` nem `rowSummary(row).action === …` (inversos, E8). Âncora dupla (83 arquivos + `applyOrderSlice(q, slice)` no hook), CRLF/LF/glob, allowlist de UMA linha literal (`'a-separar': 'a_separar'` da `73`) |
| `leituraSoComPapel.test.ts` | mobile-adm `entities/order/api/__tests__` | (feature `74`, `MAP-37`) **pela AST**: o client importado fora de `lerComPapel.ts` e dos dois hooks; nos hooks, `supabase` usado além de receptor de `.from(`, ou um `.from(` alcançável fora de uma função passada a `lerComPapel(` — a RLS de `orders` daria a uma conta sem papel os pedidos DELA, sem erro |
| `enderecoDePedidosComDonoUnico.test.ts` | mobile-adm `entities/order/__tests__` | (feature `74`, `MAP-04`) o endereço da aba Pedidos lido ou escrito fora de `pedidosHref.ts` — os nomes dos parâmetros como literal, o fragmento de query num texto, `useSearchParams`. Allowlist de UM |
| `movimentoDosPedidos.test.ts` | mobile-adm `shared/lib/__tests__` | (feature `74`, `MAP-45`) classe de `transition-*`/`animate-*` sem par `motion-reduce:` que DESLIGUE movimento, na mesma linha, nos 21 arquivos de UI da `74` (escopo literal, régua estreita da `59`). Âncora 4 tokens / 2 pares, medida com a própria régua |
| `pedidosComClientReal.test.tsx` | mobile-adm `app/__tests__` | (feature `74`, `MAP-36`..`MAP-38`, Success Criterion 3) o `<App />` real sobre o supabase-js REAL, em `/pedidos` e `/pedidos/<id>`: `order_list` com as linhas DA CLIENTE e `atelie_clock` em 403 `42501` ⇒ a recusa da `72`, e **nenhum** texto delas no DOM em nenhum dos ~80 instantes lidos; com `order_list` em 500 a recusa ainda vence (E2); a RPC sem rede ⇒ falha de leitura, nunca a recusa. Par com a RPC em 200 provando que as linhas aparecem. Cinco mutantes de `lerComPapel` (ordem trocada, erro da RPC ignorado, dado antes da confirmação, `Promise.all`, rede como recusa) mortos por asserção |
| `stepsDenoReach.test.ts` | `packages/core/src/material/__tests__` | (feature `74`) o grafo de `material/steps.ts` (e o de `stats/labels → time/zone`) com especificador relativo sem `.ts` — `import type` incluso — ou import de pacote |
| `avisoPuladoSchema.test.ts` | store `shared/lib/__tests__` (lê a migration da `88`) | (feature `88`, `AD-069`) **uma régua por comando** (`L-033`): o `check` de `order_notifications.status` sem `skipped`, não derrubado antes de recriado, ou o da `42` ainda contado como vigente; `skip_order_notification` sem `security definer`, sem `search_path = ''`, com `execute` além da `service_role` (o `revoke` de `public`/`anon`/`authenticated`), ou com o upsert convertendo outra coisa que `failed`/`skipped` (`sent` e `pending` ficam); escrita de dado. Âncora: arquivo, função, `check` e as criadoras da pasta; `mutar()` que lança. O comportamento é do probe `01-aviso-pulado.sql` |
| `avisoComDonoUnico.test.ts` | backoffice `shared/lib/__tests__` (varre a produção do painel, menos `features/notification-settings/**`, por nome) | (feature `88`, `AVS-17`) decidir "este gesto manda e-mail à cliente?" fora de `customerNoticeFor`: status de destino comparado com literal numa linha que fala de aviso/e-mail, o interruptor do evento lido à mão (`resolveEventSettings` ou o caminho cru até `enabled`), a pré-condição do motor chamada direto, nome de evento como literal. **Metade positiva**: `useGestoComAviso`, `AdminOrderPage` e `AdminOrdersPage` chamam `customerNoticeFor` em código, e o diálogo de cancelamento recebe a previsão por prop. Âncora (arquivos, escopo, os três pontos), sensores por forma com os inversos (a coluna "sem código" da lista, os interruptores do GA e do Shopping) e CRLF/LF. O cabeçalho declara o limite: a régua do status é por linha |
| `pedidoGravadoSoPeloDono.test.ts` | store `shared/lib/__tests__` (varre `apps/*/src` e `packages/*/src`, só produção) | (feature `75`, `MAA-39`, `AD-059`) **pela AST**: escrita PostgREST (`update`/`insert`/`upsert`/`delete`) em `orders` ou `order_status_history` fora de `packages/core/src/order-actions` — a cadeia seguida por `await`, parênteses, `as`, `!` e o alias do builder; tabela que não resolve para literal acusada em qualquer arquivo; builder que escapa sem `select` nem escrita acusado. **Allowlist literal de UMA entrada, por declaração**: o corpo de `cancelOrder` no painel (uma escrita nova no mesmo arquivo, fora dela, é acusada). Metade positiva: o painel e a porta do app chamam o dono. As functions e o importador são outros donos por construção, fora do escopo, declarado |
| `escritaSoPelaPorta.test.ts` | mobile-adm `entities/order/api/__tests__` | (feature `75`, `MAA-29`) **pela AST**: no app, nenhuma escrita de tabela, nenhuma `functions.invoke`, nenhuma `rpc(` fora de `lerComPapel.ts`; o client importado por EXATAMENTE quatro arquivos (os três da `74` e a porta `gravarAcao.ts`), e na porta só como valor passado, nunca receptor; metade positiva: a porta chama `runAppAction(` e `conferirPapel(` |
| `fraseDaAcaoSoNoCore.test.ts` | mobile-adm `shared/lib/__tests__` | (feature `75`, A11, `AD-008`) **pela AST**, sem allowlist: as cinco frases fixas da ação (falha, e-mail, aviso de postagem, "mudou", "rastreio salvo") escritas em qualquer literal de produção do app — string, pedaço de template, texto de JSX. Âncora positiva: as cinco existem em `core/orders/appAction.ts`, lido do disco; inversos (`ACCESS_UNCHECKED`, o rótulo "E-mail"); comentário fora por construção |
| `lembreteNoCore.test.ts` | backoffice `app/__tests__` | (feature `75`, `MAA-28`) `chargeMaterialText`/`chargeMaterialUrl` e companhia subiram para `core/orders/charge.ts` e o painel os reexporta **por referência** (`toBe`) — uma cópia com o mesmo comportamento reprova |
| `useAdminOrders.delega.test.ts` | backoffice `entities/order/api` | (feature `75`, `MAA-27`, A24) o painel delega as três escritas ao dono e traduz cada desfecho para a forma de retorno de sempre, uma linha da tabela de §3.3 por caso — inclusive o que ele NÃO passa (`expectedFrom`, `statusIn`); zero linhas vira "Nenhum pedido foi alterado." também no painel (TQ8, `n — confirmar`) |
| `purity.test.ts` (order-actions) | `packages/core/src/order-actions/__tests__` | (feature `75`) o dono da escrita importar React, `@estrelinha/*`, alias, URL ou relativo sem `.ts` (`import type` incluso), ou o supabase-js como VALOR — o client e o notificador são INJETADOS, e o supabase-js só entra em `import type`. Âncora de contagem e de uso, sensores nos dois sentidos |
| `acoesComClientReal.test.tsx` | mobile-adm `app/__tests__` | (feature `75`, `MAA-21`..`MAA-23`, Success Criterion 2) o `<App />` real sobre o supabase-js REAL, pelo rodapé e pelo cartão: PATCH 200 `[]` + `atelie_clock` 403 `42501` ⇒ a recusa da `72` e **nenhuma** confirmação — lida no `body` a cada 50 ms **e** num `MutationObserver` (a releitura recusada desmonta a tela no mesmo passo em que a confirmação apareceria); `not_admin` da RPC ⇒ recusa; PATCH 500 ⇒ falha, nunca recusa; a rede da conferência caída ⇒ nem recusa nem reconferência; o PATCH do rastreio sem `shipping_carrier` e com `status=in.(separating,shipped)`. Três mutantes no `gravarAcao.ts` real mortos por asserção |
| `clientesSchema.test.ts` · `emAbertoComDonoUnico.test.ts` | store `shared/lib/__tests__` (leem a migration da `76`) | (G9, G10, feature `76`) a migration acrescentar fora do fim das views, perder `security_invoker`, ganhar `grant`/`drop`/escrita de dado; o filtro SQL de "em aberto" divergir byte a byte de `openOrdersSqlFilter('v')` (o par `approved` + os quatro status). Uma régua por comando, `mutar()` que lança |
| `regrasDeClienteNoCore.test.ts` | backoffice `app/__tests__` | (G11) `voltaram` do painel deixar de ser o recorte de `core/customers` por referência (`toBe`), ou a lista dos seis recortes do painel mudar |
| `purity.test.ts` · `denoReach.test.ts` (customers) | `packages/core/src/customers/__tests__` | (G12) `core/customers` importar React, Supabase, alias ou `node:`, ou um especificador relativo sem `.ts` (`import type` incluso) no grafo transitivo |
| `enderecoDeClientesComDonoUnico.test.ts` · `regraDeClienteSoNoCore.test.ts` · `semDadoSensivelDeClienteNoApp.test.ts` | mobile-adm `entities/customer/__tests__` e `shared/lib/__tests__` | (G1, G3, G4, feature `76`) o endereço de Clientes fora de `clientesHref.ts`; recorte, filtro ou `ilike` escritos à mão no app; `cpf`, endereço completo, nota ou `nuvemshop_*` nas colunas lidas. Detalhe na tabela de `apps/mobile-adm/CLAUDE.md` |
| `whatsappComDonoUnico.test.ts` · `semDadoDeClienteNoAparelho.test.ts` · `tomMemorialDeClientes.test.ts` · `movimentoDeClientes.test.ts` | mobile-adm `shared/lib/__tests__` | (G5..G8) `wa.me` fora de `core`; dado de cliente em storage, console, título, URL ou `history.state`; emoji, urgência e "ranking" nos literais; movimento sem par `motion-reduce:` |
| `clientesComClientReal.test.tsx` | mobile-adm `app/__tests__` | (feature `76`, sobre o client REAL) as linhas DA CLIENTE do outro lado e `atelie_clock` em 403 `42501` ⇒ a recusa e nenhum texto dela em ~80 instantes, em `/clientes`, `/clientes/:id` e no "Ver cliente"; a recusa vence a falha da consulta; rede caída é falha, nunca recusa. Cinco mutantes de `lerComPapel`/`useJanelaPaginada` mortos |
| `pushSubscriptionsSchema.test.ts` | store `shared/lib/__tests__` (lê a migration da `79`) | (feature `79`, `AD-062`) **uma régua por comando** (`L-033`): `push_subscriptions` sem RLS, com **qualquer** `create policy` (nem `authenticated`: a porta é a function), sem `revoke` dos papéis de cliente, com `grant` além da service role, sem a cascata da conta, sem `endpoint` único ou sem as chaves obrigatórias; o teto do teste voltando para a inscrição (ele é **por conta**, em `push_test_claims`, e sobrevive a apagar a linha); `claim_push_test` conferindo o teto **antes** de saber se o aparelho é da conta ou na ordem grava/confere invertida; o `default` e o `check` de `events` divergindo de `PUSH_EVENTS` (**importado** de `core`); o prefixo da migration repetido; escrita de dado. `mutar()` que lança |
| `pushSoNoMotor.test.ts` | `supabase/functions/_shared/__tests__` (varre as functions e os apps) | (feature `79`) a biblioteca de Web Push importada fora de `_shared/webPush.ts` ou fora da versão `0.5.0` exata; `webPush.ts` importado por outro arquivo que não os três `index.ts` (`send-notification`, `mercado-pago`, `atelie-avisos`), ou importado sem **chamar** `createWebPushSender(`; `push_subscriptions` citada em produção fora dos donos. Sensores com CRLF/LF e o caminho relativo resolvido |
| `avisosComClientReal.test.tsx` · `swAvisos.test.ts` · `tomMemorialDosAvisos.test.ts` · `movimentoDosAvisos.test.ts` | mobile-adm `app/__tests__` e `shared/lib/__tests__` | (feature `79`) a recusa da porta só pelo `42501` de `conferirPapel` (rede e 403 com o relógio de pé são falha); o worker dos avisos sem rede nem cache e abrindo só caminho interno; tom memorial e movimento sem par. Detalhe em `apps/mobile-adm/CLAUDE.md` |
| `compreJuntoSchema.test.ts` · `compreJuntoConversaoSchema.test.ts` · `compreJuntoNoPedidoSchema.test.ts` | store `shared/lib/__tests__` (leem as três migrations do Compre Junto, WI-01) | uma régua por comando, `mutar()` que lança: as listas e os adicionais com `grant` a `anon`, policy de escrita sem `has_role` no `using` e no `with check`, o vínculo adicional→lista deixando de ser `restrict`, os tetos (3 adicionais, 12 peças, 40 caracteres) divergindo de `core/buy-together` (**importados**); a conversão de `products.buy_together_ids` sem recorte (repetiria por cima do que a dona montou) ou com `delete`/`drop column` de carona; as colunas da marca em `order_items` (`accompanies_product_ids text[]`, `accompanies_list_ids uuid[]`) ganhando `not null`, default ou chave estrangeira |
| `compreJuntoAdesaoSchema.test.ts` | store `shared/lib/__tests__` (lê a migration do relatório de adesão, WI-01) | `buy_together_adoption` sem `security definer`, `search_path = ''` ou `stable`; a recusa (`has_role` ⇒ `42501`) depois da primeira leitura; `execute` além de `authenticated`; o período fora de 7/30/90 (⇒ `22023`); **a régua de venda diferente da do `store_movement` VIGENTE** (colhido do disco: a última migration que o recria) — comparada por fragmento, nos dois sentidos; o recorte sem `store_day(p_agora)`/`store_day_start(v_desde)` ou com relógio do servidor; os dois arrays da marca desaninhados separados; a peça cujo principal não está no pedido contando; a linha contando mais de uma vez nas peças, por joia ou por lista; a linha "direto no produto" ou as listas sem venda sumindo; a peça que mais sai sem a variação; leitura das peças das listas ou dos adicionais (o histórico passaria a depender da lista de hoje); divisão sem `case`; escrita de dado; nome sem `public.`. 26 sensores. O comportamento é do probe `.specs/work-items/WI-01-compre-junto/probes/05-adesao.sh` |
| `compreJuntoSemColunaAntiga.test.ts` | backoffice `shared/lib/__tests__` (varre o painel, testes inclusos) | (WI-01) qualquer arquivo do painel nomear `buy_together_ids` — a coluna antiga continua no banco até uma migration futura, e um `insert`/`update` que a mandasse viraria `PGRST204` no `drop column`. Allowlist de UM (o próprio guarda) |
| `tomDoCompreJunto.test.ts` · `chavesDoItemDoPedido.test.ts` · `purity.test.ts` (buy-together) | store `entities/product/ui/__tests__`, store `features/checkout/lib/__tests__` e `packages/core/src/buy-together/__tests__` | (WI-01) urgência, escassez, prova social, exclamação ou emoji nos textos do bloco e de `core/buy-together`; as chaves que a loja manda em cada item do pedido divergindo das colunas que a function `checkout` grava (lidas do disco, nos dois sentidos — chave nova na loja que a function não lista é descarte silencioso); `core/buy-together` com especificador relativo sem `.ts` (`import type` incluso), React, Supabase, Deno, alias ou `node:` no grafo transitivo — a function `checkout` o importa por caminho |

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

O gate é **"sem regressão"**, não "tudo limpo": compare contra estes números. Quando mudarem de verdade,
**troque os números desta tabela e registre a medição** — o WI, a data, o delta, como mediu — **no topo de
[`docs/baselines-historico.md`](docs/baselines-historico.md)**. O histórico não volta para cá: este arquivo é
lido por inteiro em toda sessão e em todo subagente, e cada parágrafo a mais é relido em cada chamada.

| Medida | Baseline (Validation do WI 98, 2026-11-10) | Como medir |
| --- | --- | --- |
| **Lint** | **25 erros / 7 warnings** — backoffice 23/5 · store 2/2 · mobile-adm 0/0 | `npx eslint .` em cada app (o `pnpm lint` para no primeiro app que reprova) |
| **Tipos** | **0 · 7 · 0 · 0 · 0** (store · backoffice · catalog-import · `apps/store/tsconfig.server.json` · mobile-adm) e **`packages/core` em 11** — herdados. Os 7 do backoffice estão todos em `apps/backoffice/src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (sem `import` do vitest; commit `4c6e9a16`). catalog-import e `tsconfig.server.json` não remedidos desde a `69` | `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` · `npx tsc --noEmit -p packages/core/tsconfig.json` |
| **Testes** | core **5718/238** · functions **1669/46** · store **7188/382** · backoffice **5266/297** · mobile-adm **2729/175** · catalog-import 512/23 (não remedido desde 2026-11-02) — um workspace por vez, exit 0 fora de pipe, `--testTimeout=20000` sem o `--` | `pnpm --filter @estrelinha/<w> test --testTimeout=20000` (store e backoffice) |

Medições anteriores, os deltas de cada WI e as lições de medição: [`docs/baselines-historico.md`](docs/baselines-historico.md).

## CI e deploy

> **Migration se aplica SÓ no banco local durante o desenvolvimento. Em produção, APENAS quando o
> usuário pedir explicitamente — e "faça push", "envie para a master" ou "faça o merge" NÃO é esse
> pedido.** O `Supabase Deploy` roda `supabase db push --linked` em **todo push em `master`**, então
> levar à `master` remota um commit com migration nova **é** aplicá-la em produção. Por isso:
>
> - **Desenvolvimento**: aplique no local (`supabase migration up` ou `psql` na porta 54442) e prove
>   ali — de preferência numa transação desfeita. Nunca `supabase db push --linked`, nunca
>   `supabase db query --linked` com escrita.
> - **Antes de qualquer push para a `master` remota**, confira se o que sobe traz arquivo novo em
>   `supabase/migrations/` (`git diff --name-only origin/master..HEAD -- supabase/migrations`). Se
>   trouxer e o usuário não pediu a aplicação em produção **com essas palavras**, **pare e pergunte**
>   antes do push — dizendo que o push aplica a migration no banco hospedado.
> - Medido em 2026-10-27: a `20261101120000` (fornecedor repetido no produto) foi aplicada em
>   produção por um push pedido como "envie para master remoto", sem pergunta. Foi o que motivou esta
>   regra.

Três workflows em `.github/workflows/`:

| Workflow | Quando | O que faz |
| --- | --- | --- |
| `ci.yml` | PR **e** push em `master` | `turbo run test --concurrency=1`, depois `pnpm build`. Lint e typecheck rodam com `continue-on-error` |
| `supabase-deploy.yml` | push em `master` (sem filtro de `paths`) | `supabase db push --linked` e, condicionalmente, `supabase functions deploy` |
| `sitemap-check.yml` | **cron diário** + `workflow_dispatch` | Prova a **entrega** de `/sitemap.xml`: tipo entregue, documento parseando, contagem acima do piso, `robots.txt` coerente e uma `<loc>` respondendo 200. Não regenera nada — o sitemap é servido ao vivo. **Desde a `68`**: imprime quantas `<loc>` têm `?variant=` e confere a `rel="canonical"` servida — a de uma peça sem query e, havendo, a de uma opção (igual à própria `<loc>`) —, falhando se a **origem** da canônica não for a de onde o sitemap foi buscado (o `STORE_PUBLIC_URL` esquecido no dia do domínio próprio) |
| `email-check.yml` | **cron diário** + `workflow_dispatch` | Prova que o e-mail **ainda pode sair** (feature `52`). Sete passos: pergunta à produção com o que ela está configurada (`send-notification?action=config-check`), e prova **esse** valor contra o Resend. **Não** prova o SMTP nem os templates do GoTrue, e declara isso por extenso |

- **`--concurrency=1` no CI é de propósito**: rodar store e backoffice em paralelo satura o runner de
  2 vCPUs (jsdom é pesado) e a suíte do backoffice fica flaky. É a mesma flake que se vê localmente.
- **Desde 2026-11-01 o teto de 20 s mora no `vitest.config.ts` da loja e do painel** (`testTimeout`), e
  não só na flag de medição local. Sem ele, o CI rodava com 5 s, e o CI de `master` reprovou três
  pushes seguidos (30/10 a 01/11) por **um** caso de `AdminOrdersPage.aviso.test.tsx` — o lote de 60
  selecionados, que grava 50 pedidos um por vez e levou 13,5 s no runner (4 s sozinho, 7 s na suíte
  local). Esse caso tem teto próprio de 45 s. Os `act(...)` e os *Future Flag Warning* do React Router
  no log são aviso, não reprovação.
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
- **Desde a `69` a `product-page` saiu do repositório** (`AD-053`): o `<head>` servido vem da função
  `api/page` da Vercel. Ela continua implantada no hospedado até ser apagada depois do deploy.
- **As TRÊS edge functions estão implantadas** (`google-feed`, `product-page` e, desde 2026-08-29, a
  `sitemap` da feature `33`). **O domínio próprio está no ar** (domínio adicionado à Vercel em
  2026-10-21): a loja em `umaestrelinha.com.br`, o painel em `backoffice.umaestrelinha.com.br` e o
  ateliê em `atelie.umaestrelinha.com.br`. `www.umaestrelinha.com.br` responde **308** para o
  domínio sem `www`, com caminho e query preservados (redirect do domínio no projeto da Vercel,
  configurado em 2026-11-01 — **não** está no `vercel.json`). O `.vercel.app` provisório continua
  respondendo 200. `STORE_PUBLIC_URL` aponta para `https://umaestrelinha.com.br` nos **três**
  lugares que a leem: a env da Vercel (o `robots.txt` e as `<loc>` do sitemap), o secret da
  Supabase (medido em 2026-11-01: os 2.060 `<link>` do feed estão no domínio próprio) e a
  **variável do GitHub** que o `Sitemap check` usa como origem.
  - ⚠️ **A variável do GitHub ficou para trás no cutover, e o `Sitemap check` reprovou todo dia de
    2026-10-22 a 2026-11-01** — o check buscava o sitemap no `.vercel.app` (o default) e o
    `robots.txt`, já gerado com o domínio novo, apontava para outro host. A loja estava certa; o
    sensor media a origem errada. Trocar `STORE_PUBLIC_URL` é trocar nos três lugares.
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

O estado de cada frente (branch sem merge, ordem de publicação de migrations e functions, o que falta provar)
e o que espera decisão da dona estão em [`docs/estado-conhecido.md`](docs/estado-conhecido.md). Leia antes de
publicar qualquer coisa ou de abrir trabalho numa área com frente aberta; registro novo entra lá, no topo.
