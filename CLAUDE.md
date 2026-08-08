# CLAUDE.md — Nanita Store

Loja virtual de bottons temáticos de cultura pop (anime, K-Pop, games, filmes, séries).
E-commerce D2C. Monorepo com **loja pública** e **backoffice** deployáveis de forma independente,
sobre um único backend Supabase.

Contexto adicional: `.specs/project/PROJECT.md` (visão/stack) e `.lovable/memory/` (decisões e features).

## Stack

- React 18 + TypeScript + Vite 5
- Tailwind CSS + shadcn/ui + Framer Motion
- Supabase (Auth, DB, Storage, Edge Functions) — backend externo
- Zustand (cart/wishlist/coupon) + React Query (estado servidor)
- React Router v6
- Monorepo: **pnpm workspaces + Turborepo**

## Layout do monorepo

```
apps/
  store/         @nanapin/store       loja pública       (Vite, porta 8080)
  backoffice/    @nanapin/backoffice  painel admin       (Vite, porta 8081)
packages/
  ui/            @nanapin/ui          shadcn/ui + preset Tailwind + tokens (styles.css)
  supabase/      @nanapin/supabase    client (via env) + types de domínio
  auth/          @nanapin/auth        AuthProvider, useAuthContext, useAuth, RequireAdmin
  core/          @nanapin/core        formatters, constants, hooks cross-app (settings, coupons)
supabase/        migrations + edge functions (backend compartilhado)
eslint.fsd.mjs   fronteiras FSD compartilhadas (eslint-plugin-boundaries)
tsconfig.base.json  base TS + paths dos @nanapin/*
turbo.json · pnpm-workspace.yaml
```

## Comandos

Sempre na raiz (Turbo orquestra os workspaces):

```bash
pnpm install            # instala tudo (node-linker=hoisted)
pnpm dev                # sobe os dois apps
pnpm dev:store          # só a loja      (:8080)
pnpm dev:backoffice     # só o admin     (:8081)
pnpm build              # build dos dois (dist/ por app)
pnpm test               # vitest em todos
pnpm lint               # eslint em todos
pnpm --filter @nanapin/store <script>       # rodar num app específico
```

## Workflow de specs (Skill `tlc-spec-driven`)

Ao planejar/implementar features, use a Skill **`tlc-spec-driven`** com estas convenções do projeto:

- **Numeração das features**: cada nova feature em `.specs/features/` nasce com prefixo sequencial de
  dois dígitos + nome em kebab-case — `01-homepage-v3-pop-culture`, `02-checkout-mercado-pago`, …
  O número é a **ordem de criação** da spec (nunca de prioridade), e é imutável: features concluídas
  ou abandonadas mantêm o número, e a próxima continua a contagem. Assim a ordenação histórica das
  specs fica legível só pelo `ls`. Ao criar uma nova, conferir o maior número existente e somar 1.
- **Numeração dos itens**: dentro da feature, prefixar os itens de implementação (tasks/entregas) com
  número sequencial de dois dígitos e nome descritivo em kebab-case — `01-nome-implementacao`,
  `02-nome-implementacao`, etc. Isso garante melhor rastreabilidade das specs em `.specs/features/*`.
- **Commits**: **não** criar commits atômicos em pequenos pedaços durante a implementação. Aguardar
  a conclusão e gerar os commits completos da implementação de uma vez (isso sobrepõe o
  comportamento padrão de commits atômicos da Skill).

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
- `@nanapin/ui`, `@nanapin/supabase`, `@nanapin/auth`, `@nanapin/core` → pacotes (consumidos como
  source via alias do Vite/tsconfig; sem build step por pacote).
- Componentes shadcn por subpath: `@nanapin/ui/button`, `@nanapin/ui/dialog`, etc. `cn` em `@nanapin/ui/lib/utils`.

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
  - **Fluxos de dinheiro no mobile primeiro.** Checkout, PIX e confirmação são validados em celular
    antes de qualquer ajuste de desktop.
- **Design system — dois temas.** Leia `DESIGN.md` na raiz antes de mexer em UI da loja.
  - **Loja (`apps/store`) — identidade Nanita v2, "papelaria"** (feature 19). Tokens `--nanita-*` e
    classes `nanita-*` em `apps/store/src/app/App.css` + `apps/store/tailwind.config.ts`. **O chão
    deixou de ser branco**: Papel `#F9F1EE` é o fundo da página e o branco virou o **card**. Rosa em
    343°: Carimbo `#F1678D` (preenchimento) → Selo `#E93A6D` (detalhe) → Carmim `#A62348` (texto de
    dinheiro, AA). Grafite `#2E2028` (texto/superfície escura), Carbono `#7E5769` (secundário, o
    piso), Mata-borrão `#F7D6E0` (faixa), Dobra `#EBDDD7` (divisor), Papelão `#8F7268` (borda de
    campo), Fita `#FFC95C` (badge, **só sobre Grafite**). Fontes: **Fredoka** (display/heading) e
    **DM Sans** (body) — Berkshire Swash saiu. Os `--nana-*` seguem remapeados só por
    compatibilidade; código novo usa `nanita-*`.
    - **A paleta é declarada em DOIS arquivos e eles precisam concordar.** Valor certo num lado e
      velho no outro não quebra build, tipo nem teste de componente: a loja renderiza duas paletas ao
      mesmo tempo e quem descobre é a cliente. `shared/lib/__tests__/palette.test.ts` lê os dois do
      disco, compara, e mede o contraste de cada token sobre Papel.
    - **O chão não entra sozinho.** `--nanita-sugar` na v1 (`#FFEFF6`) sobre Papel dá **1,00:1** —
      mesma luminância. Trocar o fundo sem trocar Mata-borrão e Dobra apaga toda faixa de seção da
      loja: a regra continua no CSS e não aparece na tela. Tem AC e teste próprios.
    - **`--nanita-border` e `--nanita-rule` são dois tokens de propósito.** Divisor é Dobra (1,19:1);
      **borda de campo é Papelão** (3,95:1), porque a WCAG 1.4.11 pede 3:1 de contorno de controle e
      nenhum tom claro chega lá sobre Papel. `fieldBorder.test.ts` varre o fonte e falha se um
      `<input>` voltar para Dobra.
    - **Carmim sobre Grafite lê a 2,18:1 e é proibido.** Toda ação dentro de superfície escura é
      **Carimbo** com texto Grafite (5,22:1) — é a variante `onInk` do botão.
  - **Botão da loja é 14px (`rounded-button`), não pílula** — o inverso da v1. Pílula virou forma de
    **rótulo** (badge, chip de tema, tag, campo de busca), e o **disco** (`rounded-full`) segue sendo
    a assinatura da marca, porque o produto é redondo. `shared/ui/Button` existe porque o `<Button>`
    do shadcn traz `rounded-md` na base e mora em `packages/ui`, que é do backoffice; e
    **`button` é a ÚLTIMA chave de `borderRadius`** porque o `tailwind-merge` não colapsa token
    custom contra t-shirt size (medido) e vence quem vier por último no CSS.
    `shared/ui/__tests__/buttonShape.test.ts` varre o fonte; a allowlist de cinco arquivos existe
    para **forçar quem puser pílula numa ação a escrever por que aquilo é rótulo**.
  - **A marca é SVG, não fonte.** `shared/ui/brand` traz a escada medida na prancha 21:
    `NanitaLockup` ≥140px (**rodapé**) → `NanitaWordmark` ≥110px (**header**, menu, checkout, auth) →
    `NanitaMonogram` ≤48px (favicon, selo). Cada um cai para o degrau de baixo abaixo do piso, e
    header e rodapé usarem marcas diferentes **é a escada funcionando** — na altura de 40px o lockup
    mede 116px de largura, 24px abaixo do próprio piso. SVG **inline**, nunca `<img src>`: o header
    não pode ter estado de carregamento. `paths.ts` é **gerado** dos SVGs de `.specs/brand/nanita-v2/`
    e um teste compara caractere a caractere — são 10KB de coordenada, e transcrever à mão só deforma
    a letra sem quebrar nada visível. **Cada cor é UM `<path>` com `fill-rule="evenodd"`**: separar
    os subpaths pinta o contador das letras por cima do corpo e elas saem maciças com a geometria
    intacta.
  - **Favicon é o monograma N, em duas bases** (prancha 19b): **squircle** de canto 28% na aba
    (`favicon.svg`/`.ico`) e **quadrado sangrado** no `apple-touch-icon`. A variável é quem faz o
    recorte — o navegador não recorta o favicon, e o iOS aplica a própria máscara, então arte
    pré-arredondada deixa sobra de canto. A base só ganha haste ficando mais reta: 2,1px no disco
    contra 2,5px no squircle e 2,6px no quadrado, medidos a 16px sobre um piso de 2px.
  - **Backoffice (`apps/backoffice`)** — segue nos tokens `--nana-*` originais de
    `@nanapin/ui/styles.css` (roxo/rosa/navy) e no preset `packages/ui/tailwind.preset.ts`.
    Não alterar esses arquivos ao mexer na loja. A separação depende da **ordem de dois imports** em
    `main.tsx` (`App.css` depois de `@nanapin/ui/styles.css`); inverter devolve a loja inteira à
    paleta do backoffice sem quebrar nada — `importOrder.test.ts` guarda isso.
- **A marca é Nanita. `nanapin` é só identificador técnico.** Todo texto visível — loja, backoffice,
  e-mails transacionais e de auth, `store_settings.store_name`, assunto de e-mail, descritor de
  fatura do cartão — diz **Nanita**. O nome antigo sobrevive **exclusivamente** onde renomear
  quebraria algo, e esses lugares **não devem ser tocados**: escopo npm `@nanapin/*` (imports,
  `paths` do tsconfig, aliases do Vite, `pnpm --filter`), tokens `--nana-*` / classes `nana-*` do
  backoffice, `project_id = "nanapin-store"`, nome do repo e dos projetos Vercel, `admin@nanapin.dev`
  do seed, e-mails de fixture, e os componentes `NanaLogo` / `NanaMascot`. **Nunca faça um
  find-and-replace global de `nanapin`**: as chaves de `localStorage` (`nanapin-cart`,
  `nanapin-wishlist`, `nanapin-coupon`, `nanapin-checkout`, `nanapin-guest-*`,
  `nanapin-product-draft`, `nanapin.admin.*`) fazem parte do contrato com o navegador do cliente —
  renomeá-las **descarta em silêncio o carrinho e a wishlist de quem já visitou a loja**.
  **"Nana" também não é a marca**: é a mascote/persona da criadora (`DESIGN.md`, `NanaMascot`,
  "Oi, eu sou a Nana!" na página Sobre, "Entra no clube da Nana" na newsletter) — não virar
  "Nanita". Na v2 o rosto dela **saiu do hero** (que passou a mostrar o produto, na cartela de pins)
  e **saiu da aba do navegador** (que passou a mostrar o monograma N) — mas segue no 404, nos
  estados vazios e na página Sobre. `NanaLogo` ficou sem consumidor na loja e não deve ser apagado:
  é churn em pacote compartilhado, e o `NanaMascot` de que ele depende continua válido.
- **Supabase**: sem credenciais no código. Cada app tem `.env` (gitignored) com
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (ver `.env.example`). O client
  (`@nanapin/supabase`) lança erro se faltarem.
- **Auth**: `AuthProvider` (de `@nanapin/auth`) envolve cada app no `main.tsx`. Store usa login de
  cliente + admin; backoffice usa `RequireAdmin` (prop `loginPath`, default `/login`).
  - **Loja**: overlay único (`features/auth`) com steps entry → code → name, mais password,
    reset → reset-code → new-password. Login por **código de 6 dígitos** (`signInWithOtp`/
    `verifyOtp`) e **Google** (`signInWithOAuth`). Reset de senha também é por código
    (`verifyOtp` com `type: 'recovery'` + `updateUser({ password })`) — não por link, para não
    depender do `code_verifier` do PKCE ficar no mesmo navegador.
  - **Configuração de auth é versionada**, não é painel: `[auth.external.google]`,
    `[auth.email.smtp]` (Resend) e `[auth.email.template.*]` em `supabase/config.toml`, com os
    templates Nanita em `supabase/templates/*.html` (todos usam `{{ .Token }}`). Secrets no
    `.env` da **raiz** (ver `.env.example`), resolvidos via `env()`. Mudança em `config.toml`
    exige `supabase stop && supabase start` — `db reset` não recarrega auth.
- **O Resend tem DOIS usos, com uma chave.** (1) **SMTP do auth** — quem envia é o GoTrue, via
  `[auth.email.smtp]`; templates em `supabase/templates/*.html`. (2) **API HTTP transacional** —
  quem envia é a edge function `send-email`, via `POST https://api.resend.com/emails`; templates
  em `supabase/functions/send-email/{layout,templates}.ts`. Não confundir: mexer nos e-mails de
  pedido **não** é mexer em `supabase/templates/`.
  **São DOIS remetentes, um domínio — e cada um mora num lugar diferente:** o do auth é
  `admin_email` em `[auth.email.smtp]` do `config.toml` (`acesso@send.nanita.com.br`, valor
  versionado, endereço **nu** — o nome vem de `sender_name`); o dos transacionais é a env
  `RESEND_FROM` (`loja@send.nanita.com.br`, formato RFC 5322 `Nome <addr>`). **`RESEND_FROM` não
  tem efeito nenhum sobre o auth** — foi acreditar o contrário que deixou o auth no remetente de
  sandbox e derrubou todo login por código (`BUG-20260728`). Domínio `send.nanita.com.br`
  verificado no Resend em 2026-08-02; antes disso `onboarding@resend.dev` só entregava para o dono
  da conta. `RESEND_DEV_REDIRECT_TO` é válvula de dev **só dos transacionais** (o GoTrue não tem
  equivalente) e hoje fica vazia.
- **Rotas do backoffice**: mantêm o prefixo `/admin/*` (ex.: `/admin/produtos`). Simplificar para a
  raiz é um trabalho futuro (exigiria reescrever navegação interna).
- **A sidebar do admin tem quatro eixos, ordenados por FILA** — não pelo ciclo de vida do produto:
  **Vendas** (Pedidos, Carrinhos abandonados, Clientes) → **Descontos** (Cupons, Promoções) →
  **Catálogo** (Produtos, Categorias, Mockups) → **Loja** (Menu da loja). Dashboard fica sem cabeçalho
  no topo e Configurações no rodapé, fora dos grupos. `Vendas` vem primeiro porque é o único eixo que
  **acumula**: pedido esperando envio, carrinho esfriando, cliente esperando resposta. Cadastrar e
  curar vitrine são trabalho de quando não há fila — nada piora enquanto esperam. `navGroups`
  (`widgets/admin-layout/model/navItems.ts`) é a fonte, **e as rotas de `app/App.tsx` seguem a mesma
  sequência** — o teste `navItems.test.ts` **lê o `App.tsx` do disco** e compara a ordem textual das
  rotas com a lista; mover um item de grupo sem reordenar as rotas quebra ali.
  - **`Cupons` saiu de `Vendas` na feature 17** e ganhou o grupo `Descontos` junto de `Promoções`
    (`PRM-19`). Pela própria régua dos eixos, cupom nunca foi fila: nada apodrece enquanto um cupom
    espera ser criado, e ele estava no grupo de uso diário só por não ter vizinho. Promoção é a outra
    metade da mesma pergunta — "como eu baixo o preço?" — e as duas passam a ficar onde se procura
    desconto. O grupo entra **entre** `Vendas` e `Catálogo`: desconto ainda é decisão comercial, mais
    perto da venda do que do cadastro.
  - `Loja` tem um item só de propósito: curadoria de vitrine não é cadastro, e dentro de `Catálogo` a
    vizinhança sugeria que era. É o grupo onde entram banners da home, destaques e faixa de avisos.
- **Editor de desconto é TELA, não modal** (feature 18). Cupom e promoção se cadastram em rota própria
  — `/admin/{cupons,promocoes}/novo` e `/:id/editar` —, no mesmo molde de `/admin/produtos/novo`. A
  modal de promoção não cabia: vigência e chaves se sobrepunham em 1366px e o repetidor de faixas, que
  existe para **comparar linhas**, ficava com menos altura que a lista de categorias. A rota também é
  compartilhável e sobrevive ao F5 — com a modal, recarregar perdia o que estava sendo editado.
  - **As duas telas compartilham a moldura**, e isso é o ponto: `shared/ui/FormPageHeader` (trilha
    `Descontos / <listagem> / <registro>`, selo `Alterações não salvas`, `Cancelar` + primário com
    `⌘S`) e o corpo em coluna principal + aside de 330. Telas irmãs que se parecem custam menos para
    aprender. O que diverge é o que TEM de divergir: cupom tem código, promoção tem faixas.
  - **O primário segue `gradient-cta`.** Os boards desenharam o CTA em violeta chapado; adotar isso só
    aqui deixaria as duas telas como as únicas sem gradiente em oito telas de admin. A padronização é
    para a casa, não para o board.
  - **`<input type="date">` não é usado em Descontos** — `shared/ui/DateField` (`Popover` + `Calendar`
    + `ptBR`) é. O nativo é um controle diferente em cada navegador, e no Firefox do Windows não abre
    calendário nenhum. O vazio diz o que significa (`Vale desde já` / `Sem fim`), nunca a data de hoje.
  - **A tradução dia ⇄ ISO é UMA**, em `shared/lib/dateOnly`. Existiam duas discordantes: a promoção
    lia por componentes locais e o cupom cortava a string (`iso.slice(0,10)`, componentes UTC) — igual
    em fuso negativo, um dia errado em qualquer fuso positivo. **A gravação segue meia-noite local**;
    que "válido até 30/09" morra às 00:00 de 30/09 é outro defeito, dos leitores de vigência, e está
    em `BL-004` (caminho de dinheiro, AC própria).
  - **Duplicar cupom NÃO grava**: abre `/admin/cupons/novo?from=<id>` com tudo copiado menos o código
    (vazio e focado) e nasce pausado. `coupons.code` é `UNIQUE` **e** é o texto que a cliente digita —
    um `NANA10-COPIA` automático publicaria um código que ninguém escolheu. Duplicar **promoção**
    grava na hora (`PRM-22`) porque `promotions.name` é decorativo e não colide.
  - **Pausar cupom manda `{ id, active }` e nada mais.** Acrescentar campos reescreveria o cupom com o
    que a listagem tem em cache, que pode estar velho. Mesma disciplina do patch de pausar promoção,
    por motivo diferente (lá é a RPC que trata chave presente como "substituir").
  - **`Expirado` e `Esgotado` não são a mesma cor.** Saíam os dois em `destructive`, e o remédio de cada
    um é diferente: esgotado se reabre subindo o limite, expirado se prorroga mudando a data. A regra
    é `features/coupon-list/model/couponStatus` — quatro estados, e `!active` vence tudo porque é a
    única decisão explícita da dona. `couponStats` alimenta os três cartões que antes eram calculados
    a cada render e **nunca renderizados**; "cupons ativos" usa o mesmo veredito da coluna Status, não
    a coluna `active` crua.
- **Conjunto de produtos é CATEGORIA — só ela** (`AD-014`, feature 16). Na loja, "coleção" já é a
  categoria: `/colecao/:slug` renderiza `CategoryPage` a partir de `categories`, o widget da home se
  chama "Coleções" e o 404 diz "Coleção não encontrada". A tela `/admin/colecoes` e a tabela
  `collections` **foram removidas** — a tabela nunca existiu em migration nenhuma (`PGRST205`), o hook
  engolia o erro e a tela mostrava grade vazia para sempre. **Não recriar**: `categories` já faz tudo
  o que ela prometia, e melhor — vínculo N:N ordenado (`product_categories.position`), hierarquia
  (`parent_id`) e página de verdade. O que falta dela é conjunto por regra ("categoria automática"),
  registrado como backlog em `.specs/features/16-menu-navegacao-loja/spec.md`. `drops` é uma quarta
  palavra para a mesma ideia: tabela existe, uma linha de seed, **nenhum código a lê**.
- **O menu da loja é um recorte de `categories`, não uma árvore própria.** Duas colunas mandam:
  `show_in_menu` (a vaga na barra do topo, **válida em qualquer profundidade** — no banco real os
  universos são filhas de "Bottons") e `menu_promo jsonb` (`{ category_id, badge?, title?, subtitle? }`,
  nulo = sem card). A curadoria é `/admin/menu`; a **ordem é a `sort_order` que já existia** — sem
  coluna `menu_order`, porque dois donos do mesmo dado é o "defeito 01" do projeto.
  - A regra vive em `@nanapin/core/menu` (`menuEntries`, `menuSlotRefusal`, `resolvePromo`,
    `descendantIds`, `bySortOrder`) e é consumida pelas **quatro** superfícies nos dois apps. Foi ter
    a regra em cada tela que produziu o bug original: o `Header` fazia `.slice(0, 4)` de uma lista
    chapada e a barra dizia **"Bottons · Academia · Anime · K-Pop"** — o contêiner de tudo e uma filha
    que empatou em `sort_order = 0`. Por isso `bySortOrder` desempata por nome: sem isso a barra muda
    entre dois carregamentos.
  - **`menu_promo.category_id` não tem FK** (mora em jsonb): apagar o destino não dispara
    `on delete set null`. Quem lê **precisa** de `resolvePromo`, que devolve `null` para destino
    inexistente ou inativo. É AC, não zelo.
  - **`menuEntries` não trunca em `MENU_SLOT_LIMIT`.** Cinco marcadas devolvem cinco, e o contador do
    admin mostra "5 de 4". Truncar esconderia a quinta da única tela onde ela pode ser desmarcada —
    era o comportamento do `.slice` original.
  - **Nada de página de carrinho, nada de segunda árvore**: `widgets/mobile-menu` é a folha de tela
    cheia do celular (board `1SF-0`) e `widgets/header/MegaMenu` é o painel do desktop (board
    `1QB-0`). O `menuUiStore` é Zustand **efêmero** em `entities/category` — fora do storage (um
    booleano de UI persistido reabriria o menu na visita seguinte) e fora do widget (o gatilho está no
    `Header`, e widget não importa widget). Mesmo molde do `cartUiStore`.
  - **`browseCategories`** (grade da home, rodapé) **pula o guarda-chuva**: uma raiz sozinha é
    contêiner, não escolha, então a navegação começa nas filhas dela. Filtrar por `parent_id === null`
    deixaria a grade com **um tile escrito "Bottons"** — `trendingCategories.ts` já havia registrado
    isso. Não confundir com `pickTrendingCategories`, que é deliberadamente **folha**: as pílulas de
    "Em alta agora" são sobre o que bomba, não sobre como navegar.
  - **`useProducts(slug)` faz roll-up da descendência** (`descendantIds`): `/colecao/anime` mostra os
    produtos de "Naruto". Sem isso o "Ver todos →" do menu levaria a uma página sem os produtos que o
    menu acabou de listar — o `CategoryMultiSelect` **não** marca o pai automaticamente.
- **O carrinho é a gaveta, e só ela.** `widgets/cart-drawer` é a única superfície de sacola da loja
  (boards "Desktop/Mobile Cart Drawer - v3"). Todo caminho que levava a `/carrinho` **abre a gaveta**:
  header, aba da `MobileNav`, o "Ver carrinho" do toast de adicionado, e o "Voltar ao carrinho" do
  checkout. A rota `/carrinho` sobrevive como **atalho** — recupera o `?recover=<id>` dos e-mails de
  carrinho abandonado, abre a gaveta e redireciona para `/`; não renderiza lista nenhuma. Quem abre é
  o `cartUiStore` (Zustand **efêmero**, em `entities/cart` — não no widget, porque os chamadores estão
  em camadas que não podem importar `widgets/`; e fora do `cartStore` porque aquele é persistido e um
  booleano de UI ali reabriria a gaveta na visita seguinte). O painel é montado uma vez por layout:
  `StoreLayout` e `CheckoutPage` (esta por ficar fora do layout, mesmo motivo do `AuthOverlay`).
  **Não recriar uma página de carrinho**: duas superfícies para a mesma lista significavam dois
  lugares para consertar cada regra — e foi assim que a remoção de item com variação ficou quebrada
  nas duas (a chave do `cartStore` leva o `variantId`, e nenhuma das telas o passava).
- **Na página do produto, quem compra no celular é a barra fixa.** Boards "Desktop/Mobile Product
  Detail - v3". O CTA da coluna de informação é `hidden md:flex` e o `widgets/product-buy-bar` é
  `md:hidden`: **nunca os dois**, porque duas ações primárias em geleia na mesma tela é o que o
  DESIGN.md §8 proíbe — e porque duas superfícies para a mesma compra é a forma de bug que já custou
  a remoção de item com variação. O estado de compra é um só, `entities/product/model/
  useProductPurchase`, montado pela `ProductPage` e passado às duas.
  Os eixos de variação saem em **chips** (`VariantPicker surface="page"`), não em `<select>`.
- **Uma barra de rodapé por vez, e a moldura do topo se recolhe** (`shared/lib/storeChrome`,
  `shared/lib/useScrollDirection`). Header + barra de compra + `MobileNav` empilhados somavam
  **197px — 30% de um iPhone SE**. Duas regras desfazem isso:
  - **`ownsBottomBar(pathname)`** decide quem ocupa o rodapé. Onde a página traz a própria barra
    (hoje só `/produto/*`), o `StoreLayout` **não monta o `MobileNav`** — a barra de compra vai a
    `bottom-0`. É o que Nike, Zara, Farfetch e o app da Amazon fazem na página de produto, e a mesma
    decisão que já tinha tirado o checkout do layout. É um **predicado puro compartilhado**, e não um
    `useLocation` dentro do `MobileNav`, porque a resposta tem consequência em dois arquivos.
  - **As duas barras têm a mesma altura** (`BOTTOM_BAR_H`), e é isso que deixa a reserva de espaço
    ser incondicional. Essa reserva fica **depois do `<Footer/>`**, não como `pb` do `main`: o fim do
    documento é o rodapé, e reservar antes dele deixava a última faixa do `Footer` atrás da barra —
    era um bug em toda a loja.
  - **O header se recolhe no scroll para baixo e volta no scroll para cima**, só no mobile
    (`md:translate-y-0` trava o desktop). `sticky` + `translate`, nunca `fixed` nem desmontar: assim
    ele segue ocupando os 64px no fluxo e esconder/mostrar **não causa reflow**. `focus-within`
    revela para o teclado. **A barra de compra nunca se esconde** — Amazon e ASOS *atrasam* a barra
    de compra, nenhum dos dois a retrai; o CTA é a finalidade da página.
  - Cuidado ao pôr `position: fixed` dentro do `<header>`: ele agora carrega `transform`, que cria
    containing block — o elemento passaria a se medir pelo header, não pela viewport. É por isso que
    `MobileMenu` mora no `StoreLayout`.
- **O "Compre Junto" do board não foi implementado, e não é esquecimento.** O desconto de 10% do
  combo cairia na regra abaixo: `mercado-pago` recalcula `unit_price` a partir de
  `products.base_price`, então o combo seria **exibido e não cobrado**. Fazê-lo de verdade exige uma
  regra de pacote dentro de `calculateOrderTotals` + cadastro do combo — feature, não desenho.
- **Avaliações são conteúdo de demonstração** (`entities/review/model/productReviews.ts`, com o
  aviso no topo). Não existe tabela `product_reviews`: nem migration, nem RLS, nem moderação. O
  histograma, a nota do cabeçalho e os cards saem todos daquele módulo, de propósito — quando a
  tabela existir, `useProductReviews` vira query e nenhuma tela muda.
- **Checkout é one-page** (`08-checkout-one-page`): três blocos numa única tela — `1 Contato`,
  `2 Entrega`, `3 Pagamento` — com resumo persistente e **um único CTA**. Não existe passo
  "Revisão"; os componentes do fluxo antigo de 5 passos foram apagados. As regras de completude,
  bloco aberto e invalidação do pedido são domínio puro em `@nanapin/core/checkout`
  (`resolveBlocks`, `isOrderStale`); o rascunho + o `order_id` em curso vivem no `checkoutStore`
  (Zustand em **`sessionStorage`**). A rota `/checkout` fica **fora do `StoreLayout`** (header
  próprio + CTA fixo no rodapé) e por isso monta o `AuthOverlay` por conta própria. A confirmação
  é a rota `/pedido/:id` (`OrderConfirmationPage` lê o pedido do banco), nunca estado interno da
  página — assim ela sobrevive ao reload; o carrinho e o cupom são limpos **só** na aprovação.
- **Desconto por item é server-side, sempre.** `mercado-pago/index.ts` recalcula `unit_price` a
  partir de `products.base_price` e descarta o valor enviado pelo cliente. Logo, qualquer desconto
  por item calculado no front seria **exibido e não cobrado**. O order bump aplica o desconto
  dentro de `calculateOrderTotals` (`@nanapin/core/payment/pricing`), a mesma função que a edge
  function usa, lendo `store_settings.checkout`. A loja e o servidor passam **preço cheio + o
  objeto `bump`** para essa função — nunca uma lista já descontada (`applyOrderBump` não é
  idempotente por composição). Vale para qualquer oferta futura (upsell, brinde, combo).
- **Desconto por quantidade é PROMOÇÃO CADASTRADA, não constante de código** (feature 17). As faixas
  do kit (3 / 5 / 10) vivem em `promotions` + `promotion_tiers`, com escopo por `promotion_categories`
  (FK real — array e jsonb não têm, e a `AD-014` já pagou essa lição). A regra é pura, em
  `@nanapin/core/payment/pricing`, e o ponto de entrada único é **`resolveOrderPricing`**: a loja
  (`useCheckoutTotals`, `useCartPromotion`) e a `mercado-pago/handlers.ts` chamam a MESMA função, e é
  isso que encolheu a superfície espelhada à mão que o topo de `useCheckoutTotals.ts` avisava não
  mudar de um lado só.
  - **`AD-015` — desconto por item nunca soma.** Duas regras no mesmo item ⇒ vence o **menor preço**
    (`perItemMin`, calculado a partir do preço cheio nas duas pontas, o que torna o resultado
    independente da ordem de aplicação). Entre promoção e cupom ⇒ vence o **menor total final** — pelo
    total e não pelo desconto, porque cupom `free_shipping` mexe no frete. Empilhar é opt-in por
    promoção (`stacks_with_coupon`), nunca o default.
  - **Elegibilidade sai da view `promotion_eligible_products`** (categoria + descendência), nos dois
    lados. **Nunca de `Product.category_links`**: aquele campo vem do snapshot do carrinho em
    `localStorage` e pode ter dias — elegibilidade velha divergiria do servidor e geraria 422 no
    pagamento.
  - **O pedido registra o desconto exibido** (`orders.promotion_discount`), e ele é **teto, não
    valor**: `create-payment` cobra sempre o próprio recálculo (`PAY-03`) e devolve **422
    `promotion_no_longer_valid`** quando o recalculado é MENOR que o exibido — cobrar mais caro do que
    a tela prometeu é o que essa guarda existe para impedir. Recalculado igual ou maior passa direto.
  - **`orders.promotion_id` é `null` de propósito quando duas promoções aplicam** (FK única não
    representa "duas"). Logo "este pedido teve promoção?" se pergunta por `promotion_discount > 0`.
  - **Todo item que entra na conta usa `cartItem.unitPrice`** (preço da variação), nunca
    `product.price`. Antes da 17, `useCheckoutTotals` e as linhas do `OrderSummary` usavam a base: com
    grade, a loja exibia e gravava um valor que o servidor não cobrava. A 17 alinhou os quatro
    leitores, e o defeito está **congelado** por teste em `handlers.test.ts` (valor derivado da base ⇒
    422 + zero chamada ao MP). Pedido com grade passa a persistir `subtotal` diferente do de antes.

## Estado conhecido / dívidas

- `pnpm lint` falha por erros **pré-existentes**, em boa parte `@typescript-eslint/no-explicit-any`
  nos hooks admin (`entities/*/api/useAdmin*`). Não são regressão. **Baseline medida em 2026-08-01:
  backoffice 32 err / 8 warn · store 9 err / 8 warn = 41 err / 16 warn.** Depois do fecho da feature
  07 (Fase 4): **backoffice 32 / 8 · store 5 / 8 = 37 err / 16 warn** — a consolidação dos três
  mappers de produto da loja num só apagou 4 `no-explicit-any`. Depois das telas de Categoria
  (2026-08-02): **backoffice 29 / 7 · store 4 / 2 = 33 err / 9 warn** — a reescrita da `CategoryPage`
  a partir dos boards levou junto 1 erro e 5 warnings. **Baseline vigente (2026-08-02, fecho da
  feature 16): backoffice 28 / 7 · store 2 / 2 = 30 err / 9 warn.** Apagar Coleções levou 1 erro, e o
  mapper único de `useCategories` levou 2 (`select('*')` tipado por interface em vez de `any`). O gate
  de qualquer feature é **"sem erros novos"**, não "lint limpo" — compare contra este número, e
  atualize-o aqui quando ele mudar de verdade (o valor anterior, 28/7, ficou defasado silenciosamente
  entre as features 08 e 10). **A 17 fechou nos mesmos 30 / 9** (medido nos seis gates de fase), então
  o número segue vigente.
  - **Atenção: `pnpm lint` não olha `packages/`.** Nenhum dos dois pacotes (`core`, `supabase`) tem
    script `lint`, e `pnpm lint` é `turbo run lint` — então `payment/pricing.ts`, que é o código de
    dinheiro do projeto, é type-checado e testado mas **nunca passa por ESLint**. Descoberto na 17,
    registrado como `BL-002` no `BACKLOG.md`: ligar o lint ali move a baseline e por isso não entrou
    no meio de uma feature cujo gate é "sem erros novos".
- `pnpm build` **não faz typecheck**: é `vite build` puro e o esbuild remove tipos sem checar. Build
  verde **não** prova ausência de erro de tipo. Para checar de verdade:
  `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` — note o `tsconfig.app.json`, porque o
  `tsconfig.json` de cada app é solution-style (só `references`) e compila zero arquivo.
  **Baseline de tipos vigente (fecho da feature 16, 2026-08-02): store 0 · backoffice 0** — os 4
  erros de `import.meta.env` sumiram com `"types": ["vite/client"]`, e os 9 de `VariantsTable.tsx`
  com a feature `11`. Zero é a baseline agora: **qualquer erro de tipo é novo.** Na 14 o `tsc` pegou
  um TS2352 que o build não pegou — terceira ocorrência da mesma armadilha.
- **`strictNullChecks` está `false`** em `tsconfig.base.json`, e nesse modo **união discriminada por
  literal booleano não estreita**: com `{ ok: true } | { ok: false; reason: string }`, ler
  `verdict.reason` no ramo do `else` é erro de compilação (TS2339). Descoberto na 16, ao desenhar
  `canEnterMenu`. Para veredito com motivo, devolva `string | null` — não tem ramo para esquecer — ou
  discrimine por literal de **string**.
- **Tipo escrito à mão é afirmação, não verificação** (`AD-012`). `DbCategory` declarava
  `parent_id`, `banner_url` e `color_accent` havia meses; o banco não tinha nenhuma das três, e
  **toda gravação de categoria falhava com `PGRST204`**. Nada pegava: o build não checa tipo, o
  `tsc` achava o código certo (o tipo mentia), e os testes mockavam o client. Ao mexer numa tela que
  grava, **prove que ela grava** — probe HTTP contra o banco local, não inspeção de tipo.
  Segunda ocorrência, 2026-08-02: `DbAbandonedCart` descrevia uma tabela `abandoned_carts` que
  **não existia em migration nenhuma** — o DDL tinha ficado em `.lovable/sql/003_abandoned_carts.sql`,
  script de colar no dashboard. Banco novo (ou `db reset`) nascia sem a tabela e o checkout dava
  `PGRST205` em silêncio. **Os três scripts de `.lovable/sql/` já estão em `supabase/migrations/`;
  são histórico, não fonte — nada ali deve ser rodado à mão.**
- Fronteiras FSD em `warn`: há 1 violação conhecida no store (`entities/product/ProductInfo`
  importa `features/share-product`). Corrigir extraindo a interação para uma feature.
- Imports ainda usam caminhos profundos em muitos lugares (pré-barrel). Migrar para os barrels
  de slice incrementalmente.

## Backend (supabase/)

- `supabase/migrations/*` — schema. `supabase/functions/melhor-envio` — edge function de frete.
- `supabase/functions/mercado-pago` — edge function de pagamento (Mercado Pago, **API de Orders**:
  `POST /v1/orders`, `GET /v1/orders/{id}`, `POST /v1/orders/{id}/cancel` — a API de Pagamentos
  `/v1/payments` não é usada em código novo, ver `AD-001`). `index.ts` é só wiring (env + client +
  `Deno.serve`); a lógica vive em `handlers.ts` com dependências injetadas, testada em
  `@nanapin/functions` (`AD-004`). Actions `create-payment` (auth manual + recálculo server-side) e
  `webhook` (`type: "order"`, assinatura HMAC, transições idempotentes via RPC
  `apply_payment_approval`). A URL de notificação fica **só no painel do MP** — a Orders API valida o
  corpo por schema fechado e recusa `notification_url`. Secrets `MERCADO_PAGO_ACCESS_TOKEN`
  e `MERCADO_PAGO_WEBHOOK_SECRET` no `.env` da **raiz**, resolvidos no local por
  `[edge_runtime.secrets]` do `config.toml` (`env()`, mesmo padrão dos secrets de auth — exige
  `supabase stop && supabase start`); no hospedado, `supabase secrets set`. Ver `.env.example` da
  raiz. A loja usa `VITE_MP_PUBLIC_KEY` (Bricks) no `.env` do app store.
- `supabase/functions/send-email` — edge function de **e-mail transacional** pela API HTTP do Resend
  (`10-emails-transacionais`). Três tipos: `order_received` (PIX criado), `order_paid` (aprovação),
  `order_shipped` (postado com rastreio). Mesmo molde da `mercado-pago`: `index.ts` só wiring,
  lógica em `handlers.ts`/`sender.ts` com deps injetadas, testada em `@nanapin/functions`.
  - **Contrato dirigido por estado** (`AD-007`): o corpo aceita **só** `{ type, order_id }`. O
    destinatário vem de `orders.customer_email` lido com a service role, e a function **relê** o
    pedido e exige que o estado case com o tipo — `order_paid` só sai com `paid_at` preenchido
    (a RPC `apply_payment_approval` **não** toca `orders.status`, então `status='paid'` seria a
    condição errada). Estado incompatível ⇒ 422, sem efeito e retentável.
  - **Duas portas, um motor** (`AD-005`): a porta HTTP (`?action=send`, `verify_jwt=false` + papel
    admin manual via `has_role`) é do **backoffice**. A `mercado-pago` importa `sender.ts`
    **direto, no mesmo processo** — sem hop HTTP, para não inventar auth interna nem pagar um
    segundo cold start no caminho do PIX.
  - **Idempotência é do banco** (`AD-006`): tabela `order_emails` + RPC `claim_order_email`, que
    reivindica o par `(order_id, type)` numa única statement (`on conflict … do update … where
    status <> 'sent'`). Índice único **não parcial** — um índice `where status='sent'` só
    detectaria a colisão **depois** da entrega. `supabase-js` não expressa esse `on conflict`.
  - **Falha de e-mail nunca altera o pagamento**: a chamada é `await` limitado por
    `AbortController` (2500ms do `create-payment`, 8000ms do webhook — nunca trabalho em
    background, `AD-008`) e vive dentro de `try/catch`. Um throw ali viraria **500 na cobrança**.
  - Secrets: `RESEND_API_KEY`, `RESEND_FROM`, `STORE_PUBLIC_URL` (origem **da loja**, não do
    Supabase) e `RESEND_DEV_REDIRECT_TO` — todos em `[edge_runtime.secrets]`.
- Dev local roda contra Supabase local (`http://127.0.0.1:54321`) conforme `.env` dos apps.
