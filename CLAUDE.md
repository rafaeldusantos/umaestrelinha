# CLAUDE.md — Uma Estrelinha

Loja virtual de **joias afetivas artesanais em resina**, feitas à mão por **Adri Muniz** em Porto
Alegre/RS, com material que a própria cliente envia: cinzas de cremação, leite materno, mecha de
cabelo, pelo de pet, dente de leite, coto umbilical, flores e penas. E-commerce D2C. Monorepo com
**loja pública** e **backoffice** deployáveis de forma independente, sobre um único backend Supabase.

**O registro do negócio é sensível e memorial.** Boa parte de quem abre esta loja acabou de perder
alguém. Isso não é tom de marketing — é restrição de produto: nada de linguagem festiva, nada de
emoji comemorativo, nada de trocadilho, nada de urgência fabricada ("últimas unidades", contagem
regressiva). Vocabulário de referência: `../landing-pages/src/content/categorias/uma-estrelinha.json`.

Contexto adicional: `DESIGN.md` (identidade e paleta) e `.specs/STATE.md` (decisões `AD-001`..`AD-018`
e handoff).

> **Este repositório foi a loja Nanita** — bottons de cultura pop —, convertido pela feature
> [`20-rebrand-uma-estrelinha`](.specs/features/20-rebrand-uma-estrelinha/spec.md) sob a decisão
> `AD-016`. A documentação da loja anterior está preservada em
> [`.specs/archive/nanita/`](.specs/archive/nanita/README.md); o **código não tem mais nada dela**, e
> um teste garante isso (ver *Os guardas*, abaixo).

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
  core/          @estrelinha/core        formatters, pricing, menu, hooks cross-app
tools/
  catalog-import/ @estrelinha/catalog-import  importador one-shot da Nuvemshop (Node, à mão)
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

**Importar o catálogo real da Nuvemshop** (`tools/catalog-import`, executado à mão):

```bash
pnpm --filter @estrelinha/catalog-import import                      # import completo
pnpm --filter @estrelinha/catalog-import import -- --dry-run         # lê e mapeia, não grava
pnpm --filter @estrelinha/catalog-import import -- --limit=5         # ensaio com 5 produtos
pnpm --filter @estrelinha/catalog-import import -- --stop-after=categorias
pnpm --filter @estrelinha/catalog-import import -- --report=reports/import.json
```

Credenciais no `.env` da **raiz** (`NUVEMSHOP_*`, `SUPABASE_SERVICE_ROLE_KEY`) — ver `.env.example`.
É **idempotente**: rodar de novo atualiza e cria zero duplicata. Exit ≠ 0 significa que os totais
não fecharam ou que o import parou — não é aviso, é falha.

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
- **Numeração dos itens**: dentro da feature, prefixar os itens de implementação (tasks/entregas) com
  número sequencial de dois dígitos e nome descritivo em kebab-case — `01-nome-implementacao`,
  `02-nome-implementacao`, etc.
- **Commits**: **não** criar commits atômicos em pequenos pedaços durante a implementação. Aguardar
  a conclusão e gerar os commits completos da implementação de uma vez (isso sobrepõe o
  comportamento padrão de commits atômicos da Skill).

### O que vem a seguir

- **`22-material-afetivo`** — a página "Como enviar", os campos por item e o rastreio do material
  dentro do pedido. É o que falta para a loja representar o que o negócio de fato faz. **O bloco de
  redirects saiu daqui**: o endereçamento inteiro virou a feature `23`, já fechada.
- **Sitemap e dados estruturados** (`BL-007`) — o passo seguinte da `23`. Ficaram fora dela de
  propósito: só fazem sentido depois de a URL canônica de cada conteúdo estar decidida, e agora está.

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

### Alias de import
- `@/*` → `src/*` do app atual.
- `@estrelinha/ui`, `@estrelinha/supabase`, `@estrelinha/auth`, `@estrelinha/core` → pacotes
  (consumidos como source via alias do Vite/tsconfig; sem build step por pacote).
- Componentes shadcn por subpath: `@estrelinha/ui/button`, `@estrelinha/ui/dialog`, etc.
  `cn` em `@estrelinha/ui/lib/utils`.

## Convenções

- **Mobile é o caso principal, não o responsivo.** **~90% dos acessos da loja vêm de celular.**
  Isso é premissa de projeto, não detalhe de implementação — vale para desenho, código, teste e QA:
  - **Desenhar e implementar do mobile para cima.** O layout de 390px é o alvo; desktop é a
    adaptação. Quando os dois brigam, o mobile ganha.
  - **Toda tela nova precisa de prova em viewport móvel** — não basta o teste de componente passar
    em jsdom sem viewport. QA e UAT começam em 390×844 e só depois vão para 1440.
  - **O que quebra primeiro no mobile** e deve ser conferido sempre: texto que embrulha em duas
    linhas dentro de pílula ou badge, linha de itens/lanes que estoura a largura, CTA fixo brigando
    com a barra de navegação do sistema, alvo de toque abaixo de 44px, e scroll horizontal do body
    (nunca deve existir — conteúdo largo scrolla dentro do próprio container).
  - **O alvo de 44px tem DOIS auxiliares, e escolher errado quebra o outro** (`shared/lib/touchTarget`):
    `TAP_44` é 44×44 centrado, para disco de ícone e botão quadrado; `TAP_ROW` é 44px de **altura** na
    largura do próprio rótulo, para texto em fluxo. Um quadrado de 44 centrado num link de 130px
    deixaria as pontas fora do alvo. Alvo derivado do tamanho do desenho (`after:-inset-2`) **não
    converge**: dava 44 para o botão de 28px e 32 para o de 16px.
  - **Fluxos de dinheiro no mobile primeiro.** Checkout, PIX e confirmação são validados em celular
    antes de qualquer ajuste de desktop.
- **Design system.** Leia `DESIGN.md` na raiz antes de mexer em UI da loja. O resumo operacional:
  - **A loja (`apps/store`) usa os tokens `--estrelinha-*`** (`app/App.css` + `tailwind.config.ts`),
    e o **backoffice usa `--estrelinha-admin-*`** (`packages/ui/src/styles.css` +
    `packages/ui/tailwind.preset.ts`) — que são o roxo/rosa/navy herdado, com **valores inalterados**.
    O sufixo `admin` existe para deixar claro que aquele namespace **não é a marca da loja**. Re-skin
    do painel está fora de escopo (`C-05`): painel interno não carrega marca.
  - A separação depende da **ordem de dois imports** em `main.tsx` (`App.css` **depois** de
    `@estrelinha/ui/styles.css`); inverter devolve a loja inteira à paleta do painel sem quebrar nada
    — `importOrder.test.ts` guarda isso.
  - **A paleta é declarada em DOIS arquivos e eles precisam concordar.** Valor certo num lado e velho
    no outro não quebra build, tipo nem teste de componente: a loja renderiza duas paletas ao mesmo
    tempo e quem descobre é a cliente. `palette.test.ts` lê os dois do disco e compara.
  - **`accent` (#B8945F) nunca é texto sobre claro** — 2,66:1. O único uso de texto dele é sobre
    `ink`, onde mede 4,78:1. **Nem com opacidade**: `ink/80` dentro de uma superfície `accent` cai
    para ~3,6:1, e a 45% para ~2,1:1 — foi defeito real, achado na Fase 5 da feature 20.
  - **Borda de controle é `field` (#8C8073, 3,63:1), nunca `line`** (1,25:1, que é divisor). A WCAG
    1.4.11 pede 3:1 de contorno de controle e nenhum tom claro chega lá sobre o chão.
  - **Botão é `rounded-sm` (6px); pílula é forma de RÓTULO** (badge, chip, tag, campo de busca), e o
    **disco** (`rounded-full`) segue sendo assinatura de ação circular.
- **A marca é SVG inline, nunca `<img src>`** — o header não pode ter estado de carregamento.
  `shared/ui/brand` traz a escada medida, e cada degrau **cai para o de baixo abaixo do próprio piso**:

  | degrau | componente | piso | onde aparece |
  | --- | --- | ---: | --- |
  | 1 | `EstrelinhaLockup` | **600px** | e-mail, papelaria, embalagem, `og-image.png` |
  | 2 | `EstrelinhaSignature` | **190px** | header (202px), rodapé, menu, checkout, auth |
  | 3 | `EstrelinhaSymbol` | **48px** | favicon, selo, superfície pequena |

  **O lockup completo não cabe em nenhuma tela da loja, e isso é resultado medido, não descuido**: a
  marca é monoline, o traço é fração fixa da largura, e a 48px de altura o lockup mediria 176px de
  largura com a assinatura em 0,29px — abaixo de 1px o traço vira cinza de antialias. A coluna de
  marca do rodapé tem 337px e a viewport de projeto, 390.
  `paths.ts` é **gerado** dos SVGs de `.specs/brand/uma-estrelinha/` (`_gen-paths.mjs`) e um teste
  compara caractere a caractere. **Um `<path>` por PAPEL DE TRAÇO** — aqui o que divide os paths é a
  espessura, que é geometria; `fill-rule="evenodd"` não se aplica, porque nada nesta marca preenche.
- **Favicon é o SÍMBOLO REDUZIDO, em duas bases**: canto de 6% na aba (o navegador não arredonda
  favicon) e **quadrado sangrado** no `apple-touch-icon` (o iOS aplica a própria máscara, e arte
  pré-arredondada deixa sobra de canto). O canto é quase reto porque o extremo deste desenho é a
  **ponta da estrela, na diagonal** — squircle de 28% custaria 15% da espessura do traço, e o board
  pede ao menos 1,3px de linha a 16px.
- **A marca é Uma Estrelinha, e o identificador técnico é `estrelinha`.** Não há mais nome herdado
  para preservar em lugar nenhum — escopo npm, tokens, `project_id`, chaves de storage e e-mails de
  fixture foram todos convertidos.
  - **A regra que proibia renomear o identificador antigo foi REVOGADA** (`AD-016`), e o porquê
    importa: ela existia para proteger o `localStorage` de clientes **vivos** da loja anterior —
    renomear a chave do carrinho descarta em silêncio a sacola de quem já visitou. A Uma Estrelinha
    **não tem um navegador sequer com estado desta loja**, então o risco que a regra protegia não
    existe. **A regra volta a valer a partir do primeiro cliente real**: daí em diante, renomear
    chave de `localStorage` é descartar carrinho e wishlist de gente de verdade.
  - Chaves em uso hoje: `estrelinha-cart`, `estrelinha-wishlist`, `estrelinha-coupon`,
    `estrelinha-checkout` (**`sessionStorage`**), `estrelinha-guest-consent`, `estrelinha-guest-email`,
    `estrelinha-recent-searches`, `estrelinha-product-draft`, `estrelinha.admin.*`.
- **`AD-017` tem data de validade, e ela ainda não venceu.** Enquanto este banco **não for
  implantado**, a história de migration pode ser reescrita — foi assim que os defaults de
  `store_settings` passaram a nascer corretos, sem migration de correção. **A permissão expira no
  primeiro `supabase db push` para um projeto hospedado.** A partir daí vale a regra normal:
  migration aplicada é imutável, e correção vem em migration nova. Se você implantar o banco,
  **apague este parágrafo** — deixá-lo é convidar alguém a reescrever história já aplicada.
- **Supabase**: sem credenciais no código. Cada app tem `.env` (gitignored) com
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (ver `.env.example`). O client
  (`@estrelinha/supabase`) lança erro se faltarem.
- **Auth**: `AuthProvider` (de `@estrelinha/auth`) envolve cada app no `main.tsx`. Store usa login de
  cliente + admin; backoffice usa `RequireAdmin` (prop `loginPath`, default `/login`).
  - **Loja**: overlay único (`features/auth`) com steps entry → code → name, mais password,
    reset → reset-code → new-password. Login por **código de 6 dígitos** (`signInWithOtp`/
    `verifyOtp`) e **Google** (`signInWithOAuth`). Reset de senha também é por código
    (`verifyOtp` com `type: 'recovery'` + `updateUser({ password })`) — não por link, para não
    depender do `code_verifier` do PKCE ficar no mesmo navegador.
  - **Configuração de auth é versionada**, não é painel: `[auth.external.google]` e
    `[auth.email.template.*]` em `supabase/config.toml`, com os templates em
    `supabase/templates/*.html` (todos usam `{{ .Token }}`). Mudança em `config.toml` exige
    `supabase stop && supabase start` — **`db reset` não recarrega auth**.
  - **`magic_link` E `confirmation` são ambos necessários**: `signInWithOtp({shouldCreateUser:true})`
    dispara o de signup para e-mail novo e o magic link para e-mail existente. Configurar só um deixa
    metade dos casos no template padrão, que entrega **link** em vez do código.
- **O SMTP do auth está DESLIGADO de propósito, e o remetente é uma pendência declarada.**
  - Hoje o e-mail de login cai no **Mailpit** (`http://127.0.0.1:54344`), e é assim que se testa.
  - O remetente de produção seria `acesso@send.umaestrelinha.com.br`, mas o domínio **ainda não está
    verificado no Resend** — medido em 2026-08-08: envio a partir dele devolve **403 "not authorized
    to send"**. Ligar o SMTP nessas condições derruba **todo** o login por código, e já derrubou uma
    vez (`BUG-20260728`). O bloco `[auth.email.smtp]` está no `config.toml`, **comentado**, com o
    passo exato de troca (incluindo o `curl` de verificação); a mesma pendência está no `.env.example`.
  - **São DOIS remetentes, dois lugares, um domínio.** O do auth é `admin_email` em
    `[auth.email.smtp]` — endereço **nu**, porque o nome de exibição vem de `sender_name` e o GoTrue
    monta `From: "Nome" <addr>`. O dos transacionais é a env `RESEND_FROM`, em **RFC 5322**
    (`Nome <addr>`). **Reusar `RESEND_FROM` no `admin_email` produz `"Nome" <Nome <addr>>` —
    malformado, e todo envio de auth falha.** Confundir os dois é a causa raiz do `BUG-20260728`.
- **O Resend tem DOIS usos, com uma chave.** (1) **SMTP do auth** — quem envia é o GoTrue; templates
  em `supabase/templates/*.html`. (2) **API HTTP transacional** — quem envia é a edge function
  `send-email`, via `POST https://api.resend.com/emails`; templates em
  `supabase/functions/send-email/{layout,templates}.ts`. Não confundir: mexer nos e-mails de pedido
  **não** é mexer em `supabase/templates/`. `RESEND_DEV_REDIRECT_TO` é válvula de dev **só dos
  transacionais** (o GoTrue não tem equivalente) e hoje fica vazia.
- **E-mail não carrega webfont, e a pilha de fallback É a decisão de design.** Gmail e Outlook não
  baixam fonte: os cinco templates (três de auth, três transacionais) usam **Georgia** no display —
  serifado como o display da loja, porque cair de serifa para sans muda família e largura de uma vez
  — e **Helvetica/Arial** no corpo. Tudo inline, layout em `<table>`, sem `<style>`, sem `<link>`,
  sem `background-image`.
- **Rotas do backoffice**: mantêm o prefixo `/admin/*` (ex.: `/admin/produtos`). Simplificar para a
  raiz é um trabalho futuro (exigiria reescrever navegação interna).
- **A sidebar do admin tem quatro eixos, ordenados por FILA** — não pelo ciclo de vida do produto:
  **Vendas** (Pedidos, Carrinhos abandonados, Clientes) → **Descontos** (Cupons, Promoções) →
  **Catálogo** (Produtos, Categorias) → **Loja** (Menu da loja). Dashboard fica sem cabeçalho no topo
  e Configurações no rodapé, fora dos grupos. `Vendas` vem primeiro porque é o único eixo que
  **acumula**: pedido esperando envio, carrinho esfriando, cliente esperando resposta. Cadastrar e
  curar vitrine são trabalho de quando não há fila — nada piora enquanto esperam. `navGroups`
  (`widgets/admin-layout/model/navItems.ts`) é a fonte, **e as rotas de `app/App.tsx` seguem a mesma
  sequência** — o teste `navItems.test.ts` **lê o `App.tsx` do disco** e compara a ordem textual das
  rotas com a lista; mover um item de grupo sem reordenar as rotas quebra ali.
  - `Loja` tem um item só de propósito: curadoria de vitrine não é cadastro, e dentro de `Catálogo` a
    vizinhança sugeria que era. É o grupo onde entram banners da home, destaques e faixa de avisos.
- **Editor de desconto é TELA, não modal.** Cupom e promoção se cadastram em rota própria —
  `/admin/{cupons,promocoes}/novo` e `/:id/editar` —, no mesmo molde de `/admin/produtos/novo`. A rota
  é compartilhável e sobrevive ao F5; com modal, recarregar perdia o que estava sendo editado.
  - **As duas telas compartilham a moldura**: `shared/ui/FormPageHeader` (trilha
    `Descontos / <listagem> / <registro>`, selo `Alterações não salvas`, `Cancelar` + primário com
    `⌘S`) e o corpo em coluna principal + aside de 330. O que diverge é o que TEM de divergir: cupom
    tem código, promoção tem faixas.
  - **`<input type="date">` não é usado em Descontos** — `shared/ui/DateField` (`Popover` + `Calendar`
    + `ptBR`) é. O nativo é um controle diferente em cada navegador, e no Firefox do Windows não abre
    calendário nenhum. O vazio diz o que significa (`Vale desde já` / `Sem fim`), nunca a data de hoje.
  - **A tradução dia ⇄ ISO é UMA**, em `shared/lib/dateOnly`. Existiam duas discordantes — iguais em
    fuso negativo, um dia erradas em qualquer fuso positivo.
  - **Duplicar cupom NÃO grava**: abre `/admin/cupons/novo?from=<id>` com tudo copiado menos o código
    (vazio e focado) e nasce pausado. `coupons.code` é `UNIQUE` **e** é o texto que a cliente digita.
    Duplicar **promoção** grava na hora, porque `promotions.name` é decorativo e não colide.
  - **Pausar cupom manda `{ id, active }` e nada mais.** Acrescentar campos reescreveria o cupom com o
    que a listagem tem em cache, que pode estar velho.
  - **`Expirado` e `Esgotado` não são a mesma cor** — o remédio de cada um é diferente: esgotado se
    reabre subindo o limite, expirado se prorroga mudando a data. A regra é
    `features/coupon-list/model/couponStatus`, e `!active` vence tudo porque é a única decisão
    explícita da dona.
- **A URL da loja tem UM formato, e ele é o da loja em produção** (`AD-018`, feature `23`):

  | conteúdo | canônica | também resolve |
  | --- | --- | --- |
  | produto | `/produtos/:slug` | `/produto/:slug` — **301** |
  | categoria raiz | `/:slug` | `/colecao/:slug` e `/categoria/:slug` — **301** |
  | subcategoria | `/:pai/:filha` | `/:filha` sozinha — **200**, com canonical para a de dois |

  - **A fonte é uma só: `@estrelinha/core/routes`** — `ROUTE_SLUGS`, `INFRA_SLUGS`, `RESERVED_SLUGS`,
    `productPath`, `categoryPath` e `LEGACY_REDIRECTS`. Módulo puro, sem React nem Supabase, porque os
    guardas precisam importá-lo dentro de um teste que lê arquivo do disco. Quem monta a canônica de
    uma categoria é `categoryHref` (`@estrelinha/core/menu`), que sobe até o **pai imediato** e para
    ali: a canônica tem no máximo **dois** segmentos, mesmo numa árvore de três níveis.
  - **Categoria na raiz significa que o namespace de rota e o de slug de categoria são O MESMO.** Uma
    categoria chamada "sobre" encobriria `/sobre`; uma rota `/ajuda` nova encobriria a categoria
    `ajuda`. O React Router **ranqueia por especificidade, não pela ordem das linhas**, então quem
    vence é sempre a rota e quem some é sempre a categoria — em silêncio, e em produção. Por isso a
    lista de reservadas **não é zelo, é a contrapartida obrigatória da escolha**: `reservedSlugRefusal`
    recusa no cadastro (nas **duas** superfícies, porque criar deriva o slug do nome e editar aceita
    digitação livre) e `reservedSlugs.test.ts` impede a lista de divergir do `App.tsx`.
  - **A barra final não é canônica**: `trailingSlash: false` no `vercel.json`. Os `<Link>`, o router, a
    tag canônica e o destino do 301 concordam numa forma só; a URL indexada com barra paga **um** salto
    308 antes do 301. Aceitar as duas sem canonicalizar seria conteúdo duplicado.
  - **O 301 mora no edge, com espelho no router.** Só o edge devolve status HTTP de verdade — que é o
    que preserva link equity e o que `curl -I` mede. O espelho existe porque `pnpm dev` e o vitest não
    têm Vercel na frente: sem ele a rota legada só quebraria no dia do cutover. As duas pontas leem
    `LEGACY_REDIRECTS`, e `vercelRedirects.test.ts` compara o `vercel.json` do disco com ela.
    `statusCode: 301`, nunca `permanent: true` — este produz **308**, e os dois campos não coexistem.
  - **O destino do 301 de categoria tem UM segmento**, não dois: o edge não conhece a árvore e não tem
    como saber de que pai a filha pende. A forma de um segmento resolve com 200 e declara canonical
    para a de dois, então o legado chega ao conteúdo em um salto.
  - **Slug renomeado não perde a página**: `product_redirects` e `category_redirects`. A precedência é
    fixa e vale nas duas pontas — **conteúdo vivo > redirect > 404** —, e a escrita **apaga** o
    redirect cujo `from_slug` virou slug ativo (`persistRedirect`, `persistCategoryRedirect`). Sem
    isso a mesma URL seria conteúdo e redirect ao mesmo tempo, e a resposta dependeria da ordem da
    consulta. A leitura do redirect só sai **depois** de o slug falhar, nas duas entidades.
  - **URL desconhecida não baixa o catálogo.** `useProducts(undefined)` devolve a loja inteira; com a
    categoria na raiz, toda URL errada passaria por ali. `useProducts` tem `enabled`, ligado só quando
    a rota resolve, e slug desconhecido devolve `[]`. O 404 é o `NotFound` do projeto nas duas páginas
    de catálogo — nunca tela branca, nunca a listagem completa.
  - **A tag canônica é injetada por JS** (`useCanonical`), e `curl` não a vê: a loja é SPA sem SSR. A
    verificação é partida — `curl -I` prova status e `Location`; a canônica se prova em navegador
    headless. Não é falha escondida, é o método.
- **Conjunto de produtos é CATEGORIA — só ela** (`AD-014`). Na loja, "coleção" já é a categoria: a
  `CategoryPage` é renderizada a partir de `categories` (hoje em `/:slug` e `/:pai/:filha` — ver o
  bloco de URLs acima), o widget da home se chama "Coleções" e o 404 diz "Coleção não encontrada". A
  tabela `collections` **nunca existiu em migration nenhuma** (`PGRST205`), o hook engolia o erro e a
  tela mostrava grade vazia para sempre. **Não recriar**: `categories` já faz tudo — vínculo N:N
  ordenado (`product_categories.position`), hierarquia (`parent_id`) e página de verdade.
- **O menu da loja é um recorte de `categories`, não uma árvore própria.** Duas colunas mandam:
  `show_in_menu` (a vaga na barra do topo, **válida em qualquer profundidade**) e `menu_promo jsonb`
  (`{ category_id, badge?, title?, subtitle? }`, nulo = sem card). A curadoria é `/admin/menu`; a
  **ordem é a `sort_order` que já existia** — sem coluna `menu_order`, porque dois donos do mesmo dado
  é o "defeito 01" do projeto.
  - A regra vive em `@estrelinha/core/menu` (`menuEntries`, `menuSlotRefusal`, `resolvePromo`,
    `descendantIds`, `bySortOrder`) e é consumida pelas **quatro** superfícies nos dois apps. Foi ter
    a regra em cada tela que produziu o bug original: o `Header` fazia `.slice(0, 4)` de uma lista
    chapada e a barra do topo mostrava o contêiner de tudo mais uma filha que empatou em
    `sort_order = 0`. Por isso `bySortOrder` desempata por nome: sem isso a barra muda entre dois
    carregamentos.
  - **`menu_promo.category_id` não tem FK** (mora em jsonb): apagar o destino não dispara
    `on delete set null`. Quem lê **precisa** de `resolvePromo`, que devolve `null` para destino
    inexistente ou inativo. É AC, não zelo.
  - **`menuEntries` não trunca em `MENU_SLOT_LIMIT`.** Cinco marcadas devolvem cinco, e o contador do
    admin mostra "5 de 4". Truncar esconderia a quinta da única tela onde ela pode ser desmarcada.
  - **`browseCategories`** (grade da home, rodapé) **pula o guarda-chuva**: uma raiz sozinha é
    contêiner, não escolha. Não confundir com `pickTrendingCategories`, que é deliberadamente
    **folha** — as pílulas de "Em alta agora" são sobre o que bomba, não sobre como navegar.
  - **`useProducts(slug)` faz roll-up da descendência** (`descendantIds`): sem isso o "Ver todos →" do
    menu levaria a uma página sem os produtos que o menu acabou de listar.
- **O carrinho é a gaveta, e só ela.** `widgets/cart-drawer` é a única superfície de sacola. Todo
  caminho que levava a `/carrinho` **abre a gaveta**: header, aba da `MobileNav`, o "Ver carrinho" do
  toast, e o "Voltar ao carrinho" do checkout. A rota `/carrinho` sobrevive como **atalho** — recupera
  o `?recover=<id>` dos e-mails de carrinho abandonado, abre a gaveta e redireciona para `/`. Quem
  abre é o `cartUiStore` (Zustand **efêmero**, em `entities/cart` — fora do `cartStore`, que é
  persistido, porque um booleano de UI ali reabriria a gaveta na visita seguinte). **Não recriar uma
  página de carrinho**: duas superfícies para a mesma lista significavam dois lugares para consertar
  cada regra — foi assim que a remoção de item com variação ficou quebrada nas duas.
- **Na página do produto, quem compra no celular é a barra fixa.** O CTA da coluna de informação é
  `hidden md:flex` e o `widgets/product-buy-bar` é `md:hidden`: **nunca os dois**. O estado de compra
  é um só, `entities/product/model/useProductPurchase`, montado pela `ProductPage` e passado às duas.
  Os eixos de variação saem em **chips** (`VariantPicker surface="page"`), não em `<select>`.
- **Uma barra de rodapé por vez, e a moldura do topo se recolhe** (`shared/lib/storeChrome`,
  `shared/lib/useScrollDirection`). Header + barra de compra + `MobileNav` empilhados somavam
  **197px — 30% de um iPhone SE**. Duas regras desfazem isso:
  - **`ownsBottomBar(pathname)`** decide quem ocupa o rodapé. Onde a página traz a própria barra
    (hoje só `/produto/*`), o `StoreLayout` **não monta o `MobileNav`**. É um **predicado puro
    compartilhado**, e não um `useLocation` dentro do `MobileNav`, porque a resposta tem consequência
    em dois arquivos.
  - **As duas barras têm a mesma altura** (`BOTTOM_BAR_H`), e é isso que deixa a reserva de espaço ser
    incondicional. Essa reserva fica **depois do `<Footer/>`**, não como `pb` do `main`: reservar
    antes dele deixava a última faixa do rodapé atrás da barra.
  - **O header se recolhe no scroll para baixo e volta no scroll para cima**, só no mobile
    (`md:translate-y-0` trava o desktop). `sticky` + `translate`, nunca `fixed` nem desmontar: assim
    ele segue ocupando os 64px no fluxo e esconder/mostrar **não causa reflow**. **A barra de compra
    nunca se esconde** — o CTA é a finalidade da página.
  - Cuidado ao pôr `position: fixed` dentro do `<header>`: ele carrega `transform`, que cria
    containing block — o elemento passaria a se medir pelo header, não pela viewport. É por isso que
    `MobileMenu` mora no `StoreLayout`.
- **Checkout é one-page**: três blocos numa única tela — `1 Contato`, `2 Entrega`, `3 Pagamento` —
  com resumo persistente e **um único CTA**. Não existe passo "Revisão". As regras de completude,
  bloco aberto e invalidação do pedido são domínio puro em `@estrelinha/core/checkout`
  (`resolveBlocks`, `isOrderStale`); o rascunho + o `order_id` em curso vivem no `checkoutStore`
  (Zustand em **`sessionStorage`**). A rota `/checkout` fica **fora do `StoreLayout`** (header próprio
  + CTA fixo no rodapé) e por isso monta o `AuthOverlay` por conta própria. A confirmação é a rota
  `/pedido/:id` (lê o pedido do banco), nunca estado interno da página — assim ela sobrevive ao
  reload; o carrinho e o cupom são limpos **só** na aprovação.
- **Desconto por item é server-side, sempre.** `mercado-pago/index.ts` recalcula `unit_price` a
  partir de `products.base_price` e **descarta** o valor enviado pelo cliente. Logo, qualquer desconto
  por item calculado no front seria **exibido e não cobrado**. O order bump aplica o desconto dentro
  de `calculateOrderTotals` (`@estrelinha/core/payment/pricing`), a mesma função que a edge function
  usa. A loja e o servidor passam **preço cheio + o objeto `bump`** — nunca uma lista já descontada
  (`applyOrderBump` não é idempotente por composição).
- **Desconto por quantidade é PROMOÇÃO CADASTRADA, não constante de código.** As faixas vivem em
  `promotions` + `promotion_tiers`, com escopo por `promotion_categories` (FK real — array e jsonb não
  têm). A regra é pura, e o ponto de entrada único é **`resolveOrderPricing`**: a loja
  (`useCheckoutTotals`, `useCartPromotion`) e a `mercado-pago/handlers.ts` chamam a MESMA função.
  - **`AD-015` — desconto por item nunca soma.** Duas regras no mesmo item ⇒ vence o **menor preço**
    (`perItemMin`, calculado a partir do preço cheio nas duas pontas, o que torna o resultado
    independente da ordem de aplicação). Entre promoção e cupom ⇒ vence o **menor total final** —
    pelo total e não pelo desconto, porque cupom `free_shipping` mexe no frete. Empilhar é opt-in por
    promoção (`stacks_with_coupon`), nunca o default.
  - **Elegibilidade sai da view `promotion_eligible_products`** (categoria + descendência), nos dois
    lados. **Nunca de `Product.category_links`**: aquele campo vem do snapshot do carrinho em
    `localStorage` e pode ter dias.
  - **O pedido registra o desconto exibido** (`orders.promotion_discount`), e ele é **teto, não
    valor**: `create-payment` cobra sempre o próprio recálculo e devolve **422
    `promotion_no_longer_valid`** quando o recalculado é MENOR que o exibido — cobrar mais caro do que
    a tela prometeu é o que essa guarda existe para impedir.
  - **`orders.promotion_id` é `null` de propósito quando duas promoções aplicam** (FK única não
    representa "duas"). Logo "este pedido teve promoção?" se pergunta por `promotion_discount > 0`.
  - **Todo item que entra na conta usa `cartItem.unitPrice`** (preço da variação), nunca
    `product.price`. Com grade, usar a base fazia a loja exibir e gravar um valor que o servidor não
    cobrava — o defeito está **congelado** por teste em `handlers.test.ts`.

## Os guardas — o que trava o quê

A identidade tem uma propriedade ruim: **errar nela não quebra nada**. Uma classe que deixou de
existir sai sem cor, um token divergente renderiza duas paletas, um remap que virou texto ouro sobre
claro passa em build, `tsc` e teste de componente. Por isso a loja carrega testes que leem o **fonte
do disco**, e cada um tem **âncora de contagem** — sem ela, um caminho errado varre zero arquivo e
passa em silêncio, que é a pior falha possível num teste desse tipo.

| Guarda | Onde | O que derruba a suíte |
| --- | --- | --- |
| `palette.test.ts` | `shared/lib/__tests__` | `App.css` e `tailwind.config.ts` divergirem num único token; a escala de raio mudar |
| `contrast.test.ts` | idem | qualquer token de texto abaixo de 4,5:1 sobre `ground`/`ground-deep`/`surface`; `accent` deixar de ser proibido como texto |
| `fieldBorder.test.ts` | idem | um `<input>`/`<Input>`/`<select>`/`<textarea>` voltar a `line` ou `accent` |
| `accentText.test.ts` | idem | texto ouro fora da lista curta; `ink` **com opacidade** dentro de superfície `accent` |
| `touchTarget.test.ts` | idem | controle abaixo de 44px que não adotou `TAP_44`/`TAP_ROW`; a medida deixar de morar num lugar só |
| `brandScan.test.ts` | idem | **qualquer** ocorrência da marca anterior em `apps/`, `packages/`, `supabase/` ou nas configs da raiz |
| `storeSettingsDefaults.test.ts` | idem | os defaults do TypeScript divergirem do que as migrations gravam |
| `importOrder.test.ts` | idem | `App.css` importado **antes** de `@estrelinha/ui/styles.css` no `main.tsx` |
| `reservedSlugs.test.ts` | idem | rota nova no `App.tsx` que não entrou em `ROUTE_SLUGS`; entrada de `ROUTE_SLUGS` que deixou de ser rota. **Bidirecional**: a lista recusa slug de categoria, e entrada morta recusaria nome que já está livre |
| `vercelRedirects.test.ts` | idem | `vercel.json` divergir de `LEGACY_REDIRECTS` em `source`, `destination` ou status; `trailingSlash` deixar de ser `false`; qualquer redirect usar `permanent` (que produz 308) |
| `buttonShape.test.ts` | `shared/ui/__tests__` | ação voltar a pílula; a chave custom de raio voltar ao config |
| `paths.test.ts` | `shared/ui/brand/__tests__` | `paths.ts` divergir do SVG-fonte em um caractere; dois `<path>` do mesmo SVG com a mesma espessura |
| `brandAssets.test.ts` | `app/__tests__` | ícone referenciado no `index.html` que não existe no disco; `theme-color` fora da paleta; `og:image` fora do projeto; fonte da identidade anterior no `<link>` |
| `navItems.test.ts` | backoffice | ordem das rotas em `App.tsx` divergir de `navGroups` |
| `apiShape.test.ts` | `tools/catalog-import` | a Nuvemshop mudar a forma de um campo que o mapeamento lê; a fixture perder um dos casos de borda; a origem passar a ter campo de ordenação de categoria |
| `db.test.ts` (`selectAll`) | idem | uma leitura de "o que já existe" voltar a usar `select` simples e ser truncada em 1.000 linhas pelo PostgREST |

**Nenhum deles é opcional, e nenhum se conserta afrouxando a asserção.** A `fieldBorder` já custou 16
campos com contraste de 1,19:1 por varrer só as tags HTML minúsculas enquanto a loja monta quase todo
campo com o `<Input>` do shadcn — a regra existia, o token existia, o teste existia, e os três nunca
se encontraram. Lição que virou padrão: **âncora dupla** (arquivos lidos **e** controles encontrados),
e a régua nunca pode ser o objeto medido (a âncora de escopo do `brandScan` escreve os diretórios
literalmente, em vez de iterar a constante que deveria guardar).

## Estado conhecido / dívidas

- **Baseline de lint vigente (medida de novo no fecho da feature 23, 2026-08-09): 30 erros / 8
  warnings** — backoffice 28/7 · store 2/1. Igual à do fecho da `20`: zero erro novo em três features
  seguidas. São erros **pré-existentes**, em boa parte `@typescript-eslint/no-explicit-any`
  nos hooks admin (`entities/*/api/useAdmin*`). O gate de qualquer feature é **"sem erros novos"**,
  não "lint limpo": compare contra este número e atualize-o aqui quando ele mudar de verdade.
  - **Atenção: `pnpm lint` não olha `packages/`.** Nenhum dos pacotes tem script `lint`, e
    `pnpm lint` é `turbo run lint` — então `payment/pricing.ts`, que é o código de dinheiro do
    projeto, é type-checado e testado mas **nunca passa por ESLint**. Registrado como `BL-002` no
    `BACKLOG.md`: ligar o lint ali move a baseline.
- **`pnpm build` não faz typecheck**: é `vite build` puro e o esbuild remove tipos sem checar. Build
  verde **não** prova ausência de erro de tipo. Para checar de verdade:
  `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` — note o `tsconfig.app.json`, porque o
  `tsconfig.json` de cada app é solution-style (só `references`) e compila zero arquivo.
  **Baseline de tipos: store 0 · backoffice 0 · catalog-import 0. Zero é a baseline: qualquer erro
  de tipo é novo.** O importador tem `tsconfig.json` próprio (não é solution-style):
  `npx tsc --noEmit -p tools/catalog-import/tsconfig.json`.
- **Baseline de testes (fecho da feature 23, medida com `turbo run test --force`, exit 0 capturado de
  verdade): 3672 testes em 211 arquivos** — store 1256/98 · backoffice 1090/67 · core **799/27** ·
  functions 258/4 · catalog-import 269/15.
  - **`core` subiu de 725 para 799, e isso é esperado**: o crescimento veio de `routes/` (o módulo
    novo de endereçamento) e de `menu/` (`categoryHref`). O que **não pode** mudar é o código de
    dinheiro — `packages/core/src/payment/**` fechou a feature 23 sem uma linha alterada, conferido
    por `git status` no gate. Continua valendo: identidade visual e importação de catálogo não têm
    por que mexer em `core`.
  - `pnpm test` roda os quatro workspaces em paralelo e **já produziu flake de RTL sob carga** —
    falhas de timeout em suítes pesadas que passam isoladas e na segunda execução. Rode por workspace
    antes de investigar.
  - **Cuidado com `pnpm test | tail`**: o código de saída que sai do pipe é o do `tail`, não o do
    teste. Capture o de verdade.
- **`strictNullChecks` está `false`** em `tsconfig.base.json`, e nesse modo **união discriminada por
  literal booleano não estreita**: com `{ ok: true } | { ok: false; reason: string }`, ler
  `verdict.reason` no ramo do `else` é erro de compilação (TS2339). Para veredito com motivo, devolva
  `string | null` — não tem ramo para esquecer — ou discrimine por literal de **string**.
- **Tipo escrito à mão é afirmação, não verificação** (`AD-012`). `DbCategory` declarava três colunas
  que o banco não tinha, e **toda gravação de categoria falhava com `PGRST204`** — nada pegava: o
  build não checa tipo, o `tsc` achava o código certo (o tipo mentia), e os testes mockavam o client.
  Ao mexer numa tela que grava, **prove que ela grava**: probe HTTP contra o banco local, não
  inspeção de tipo. Segunda ocorrência: `DbAbandonedCart` descrevia uma tabela que não existia em
  migration nenhuma.
- Fronteiras FSD em `warn`: há 1 violação conhecida no store (`entities/product/ProductInfo` importa
  `features/share-product`). Corrigir extraindo a interação para uma feature.
- Imports ainda usam caminhos profundos em muitos lugares (pré-barrel). Migrar para os barrels de
  slice incrementalmente.
- **Avaliações não existem.** Não há tabela `product_reviews`, e o módulo de avaliações de
  demonstração foi **removido**: depoimento inventado sobre a morte de alguém tem peso ético
  diferente de depoimento inventado sobre um acessório. A mesma régua tirou da home o contador de
  "drop" e a prova social fabricada.
- **O `seed.sql` não tem mais catálogo.** Depois de `supabase db reset` a loja fica **sem produto e
  sem categoria** até `pnpm --filter @estrelinha/catalog-import import` rodar (feature `21`). Cupons
  e usuário admin continuam no seed. A limpeza da seção 0 leva `AND nuvemshop_id IS NULL` em todo
  `DELETE`: sem isso, executar o seed avulso **depois** do import apagaria a categoria real
  `joias-afetivas` e, por cascade, os vínculos de produto dela.
- **O catálogo real tinha um resíduo da marca anterior, e ele é da Nuvemshop, não do código**: a
  categoria "Brinquedos" da loja usa como *handle* o nome da marca anterior. **Ela não é mais
  importada** (feature `23`): entrou em `CURATED_EXCLUDED`, junto de "Rastreio", que não é categoria
  de produto. O catálogo passou de **39 para 37 categorias**.
  - **São duas listas de curadoria, com desfechos diferentes.** `CURATED_INACTIVE` (Black Friday e
    Profissões) preserva a linha desativada, e reativar é um clique em `/admin/categorias`;
    `CURATED_EXCLUDED` não emite a linha **e apaga** a que já existir no banco. O relatório do import
    tem uma seção para cada — juntá-las diria "curada" para dois desfechos que exigem ações
    diferentes de quem lê.
  - **As duas listas são chaveadas por `nuvemshop_id`, nunca por slug**, por dois motivos
    independentes: slug muda na origem (curadoria presa a um slug renomeado deixa de aplicar, em
    silêncio), e um daqueles slugs **é a marca anterior** — chavear por slug plantaria aquela string
    em código novo e derrubaria a `brandScan`. Vale para o comentário também: descrever o caso sem
    escrever a string faz parte da regra.
  - **Filha de categoria excluída viraria raiz em silêncio** (é como `parentOf` trata pai ausente). As
    duas excluídas são folhas, e o teste assere isso **na fixture** em vez de assumir. O corte
    acontece antes de qualquer derivação, então a `sort_order` das raízes continua contígua.

## Backend (supabase/)

- `supabase/migrations/*` — schema. `supabase/functions/melhor-envio` — edge function de frete (a API
  **exige** identificação no `User-Agent`).
- `supabase/functions/mercado-pago` — edge function de pagamento (**API de Orders**: `POST /v1/orders`,
  `GET /v1/orders/{id}`, `POST /v1/orders/{id}/cancel` — a API de Pagamentos `/v1/payments` não é
  usada em código novo, ver `AD-001`). `index.ts` é só wiring (env + client + `Deno.serve`); a lógica
  vive em `handlers.ts` com dependências injetadas, testada em `@estrelinha/functions` (`AD-004`).
  Actions `create-payment` (auth manual + recálculo server-side) e `webhook` (`type: "order"`,
  assinatura HMAC, transições idempotentes via RPC `apply_payment_approval`). A URL de notificação
  fica **só no painel do MP** — a Orders API valida o corpo por schema fechado e recusa
  `notification_url`. Secrets `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` no `.env` da
  **raiz**, resolvidos no local por `[edge_runtime.secrets]` do `config.toml` (`env()`, exige
  `supabase stop && supabase start`); no hospedado, `supabase secrets set`.
- `supabase/functions/send-email` — edge function de **e-mail transacional** pela API HTTP do Resend.
  Três tipos: `order_received` (PIX criado), `order_paid` (aprovação), `order_shipped` (postado com
  rastreio).
  - **Contrato dirigido por estado** (`AD-007`): o corpo aceita **só** `{ type, order_id }`. O
    destinatário vem de `orders.customer_email` lido com a service role, e a function **relê** o
    pedido e exige que o estado case com o tipo — `order_paid` só sai com `paid_at` preenchido (a RPC
    `apply_payment_approval` **não** toca `orders.status`, então `status='paid'` seria a condição
    errada). Estado incompatível ⇒ 422, sem efeito e retentável.
  - **Duas portas, um motor** (`AD-005`): a porta HTTP (`?action=send`, `verify_jwt=false` + papel
    admin manual via `has_role`) é do **backoffice**. A `mercado-pago` importa `sender.ts` **direto,
    no mesmo processo** — sem hop HTTP, para não inventar auth interna nem pagar um segundo cold start
    no caminho do PIX.
  - **Idempotência é do banco** (`AD-006`): tabela `order_emails` + RPC `claim_order_email`, que
    reivindica o par `(order_id, type)` numa única statement (`on conflict … do update … where
    status <> 'sent'`). Índice único **não parcial** — um índice `where status='sent'` só detectaria a
    colisão **depois** da entrega. `supabase-js` não expressa esse `on conflict`.
  - **Falha de e-mail nunca altera o pagamento**: a chamada é `await` limitado por `AbortController`
    (2500ms do `create-payment`, 8000ms do webhook — nunca trabalho em background, `AD-008`) e vive
    dentro de `try/catch`. Um throw ali viraria **500 na cobrança**.
  - Secrets: `RESEND_API_KEY`, `RESEND_FROM`, `STORE_PUBLIC_URL` (origem **da loja**, não do Supabase)
    e `RESEND_DEV_REDIRECT_TO`.
- Dev local roda contra Supabase local (`http://127.0.0.1:54341`) conforme `.env` dos apps. **Não há
  projeto Supabase hospedado nem projeto Vercel da Uma Estrelinha** — o guia de deploy em
  `.specs/archive/nanita/DEPLOY.md` descreve a infraestrutura da loja anterior: o *procedimento* vale,
  os identificadores não.
