# STATE

## Decisions

### AD-001
- **Decision**: A integração de pagamento do Mercado Pago usa a **API de Orders** (`POST /v1/orders`, `GET /v1/orders/{id}`, `POST /v1/orders/{id}/cancel`). Código novo não usa a API de Pagamentos (`/v1/payments`).
- **Reason**: O painel do MP rotula a Payments API como "Versão anterior" e apresenta Orders como recomendada no ponto de escolha da integração; a conta de sandbox do projeto já está configurada como Orders. Com painel em Orders e código em Payments, o webhook chega como `type: "order"` e nenhum pedido transiciona para `approved`.
- **Trade-off**: A Payments API não tem sunset publicado, então a migração foi escolha de oportunidade — feita antes de queimar a validação manual de sandbox, para não rodar o roteiro de 5 cenários duas vezes. Perde-se a documentação e os exemplos mais abundantes da API antiga.
- **Scope**: `supabase/functions/mercado-pago`, `packages/core/src/payment`
- **Date**: 2026-07-28
- **Status**: active

### AD-002
- **Decision**: Lógica de montagem de payload e de interpretação de resposta de gateway de pagamento vive em `packages/core/src/payment/*` como **função pura**, testada com vitest. Edge functions ficam restritas a I/O: auth, leituras/escritas no banco, `fetch`, log.
- **Reason**: A feature 08 fechou com zero testes em `supabase/functions/**` e o gap BMP-04 passou justamente por classificar como "manual" uma propriedade aritmética pura. Puxar a lógica decidível para o domínio move a prova do sandbox para o test runner.
- **Trade-off**: Mais arquivos, e cada arquivo novo importado pela edge function exige `supabase stop && supabase start` no ambiente local (bind mount por arquivo do edge runtime).
- **Scope**: `supabase/functions/**`, `packages/core/src/payment/**`
- **Date**: 2026-07-28
- **Status**: active

### AD-003
- **Decision**: Enquanto a loja não tiver UI de desafio 3DS, pagamento de **cartão** que volta do MP em `action_required` com `status_detail` diferente de `waiting_transfer` é tratado como **recusa** (`payment_status = 'rejected'`), não como pendência.
- **Reason**: Sem tela de challenge, o desafio nunca é apresentado — mapear para `pending` deixaria a cliente presa num pedido que só resolve quando o expirador de 24h passa. Como a transição `rejected → pending|approved` é permitida, ela segue podendo repagar, inclusive por PIX.
- **Trade-off**: Cartões que exigem 3DS não convertem no cartão. Aceito porque o PIX absorve a venda.
- **Scope**: `supabase/functions/mercado-pago`, checkout da loja
- **Date**: 2026-07-28
- **Status**: active

### AD-004
- **Decision**: Handlers de edge function recebem suas dependências por parâmetro (`Deps` com `supabase`, `fetch`, `env`) e vivem em módulo separado do wiring; o arquivo com `Deno.serve` fica só com env, client real e roteamento. O layer é testado em **vitest**, no workspace `@nanapin/functions` declarado em `supabase/package.json`.
- **Reason**: Torna o I/O testável sem instalar o Deno e sem um segundo runner no repo — o `esm.sh` e o `Deno.env` deixam de ser importados pelo módulo sob teste. Fecha o gap que a 08 deixou (`08/validation.md:414`), em vez de apenas encolhê-lo.
- **Trade-off**: Um dublê de `supabase-js` escrito à mão pode divergir do client real; por isso o roteiro de sandbox continua obrigatório como prova de concordância. O workspace fica em `supabase/`, não em `supabase/functions/`, para o `node_modules` não nascer no diretório que o edge runtime bind-monta.
- **Scope**: `supabase/functions/**`
- **Date**: 2026-07-28
- **Status**: active

### AD-005
- **Decision**: E-mail transacional tem **duas portas e um motor**. O motor é
  `supabase/functions/send-email/sender.ts`. A porta HTTP (`handlers.ts`, action `send`, papel admin
  manual) serve o **backoffice**. A `mercado-pago` chama o motor por **import relativo `.ts`, no mesmo
  processo** — sem `fetch` de function para function.
- **Reason**: O hop HTTP entre duas functions do mesmo deploy não compra nada e custa três coisas: um
  mecanismo de auth interna inventado só para ele (a alternativa óbvia — comparar o bearer com a
  `SUPABASE_SERVICE_ROLE_KEY` — usa uma credencial de acesso **total** ao banco como bearer do
  privilégio mais fraco do sistema), um **segundo cold start** justamente no caminho do PIX, e mais um
  `fetch` capaz de pendurar. Sem o hop, a pergunta de auth interna deixa de existir.
- **Trade-off**: Consertar template exige redeploy das duas functions. E um `throw` no módulo de
  e-mail cairia no catch de `route` da `mercado-pago` e viraria **500 no pagamento** — logo o
  `try/catch` em volta da chamada é carga estrutural e tem teste próprio (TRG-06).
- **Scope**: `supabase/functions/send-email`, `supabase/functions/mercado-pago`
- **Date**: 2026-07-30
- **Status**: active

### AD-006
- **Decision**: Idempotência de efeito externo (envio de e-mail) é garantida por **RPC de
  reivindicação atômica** — `claim_order_email`, uma única statement com
  `on conflict (order_id, type) do update … where status <> 'sent' returning id` — sobre índice único
  **não parcial**. Nunca por checagem-antes-de-inserir no client.
- **Reason**: O caminho ingênuo (checa → insere `pending` → envia → marca `sent`) com índice único
  **parcial** `where status = 'sent'` **não previne envio duplo**: dois chamadores concorrentes passam
  a checagem, os dois inserem `pending` (nenhuma constraint violada, porque nenhum está `sent`), os
  dois enviam, e o segundo `update` falha **depois da entrega** — e-mail duplicado *mais* linha de
  auditoria perdida. Não é hipotético: duplo toque no CTA do PIX gera dois `create-payment` e o
  webhook do MP retenta em qualquer não-2xx. Além disso `supabase-js` **não sabe expressar** esse
  `on conflict … where` (`.upsert()` não tem `where`), então a RPC não é estilo: é a única forma
  correta. Mesmo molde de `apply_payment_approval`.
- **Trade-off**: Mais uma migration e duas RPCs para manter. Linha em `failed` é reivindicável de novo
  (retentativa manual do admin); só `sent` é terminal.
- **Scope**: `supabase/migrations`, `supabase/functions/send-email`
- **Date**: 2026-07-30
- **Status**: active

### AD-007
- **Decision**: O contrato de disparo é **dirigido por estado**: o chamador informa só
  `{ type, order_id }`, e o servidor **relê** o pedido e exige que o estado case com o tipo
  (`order_received`: `payment_status='pending'` + `mp_order_id`; `order_paid`: **`paid_at`**;
  `order_shipped`: `status='shipped'` + `tracking_code`). Destinatário e conteúdo nunca vêm do
  chamador.
- **Reason**: "O destinatário vem do banco" sozinho evita relay de spam mas não evita algo pior: um
  chamador autorizado mandando "pagamento aprovado" de pedido **não pago**. Com a releitura, qualquer
  bug de chamador vira 422 em vez de a loja mentir para a cliente. E a pré-condição de `order_paid`
  tem de ser `paid_at`, não `status='paid'`: a RPC `apply_payment_approval` escreve `payment_status` e
  `paid_at` e **nunca toca `orders.status`**, então a condição óbvia faria o e-mail nunca sair.
- **Trade-off**: Uma leitura extra por envio. E a falha de pré-condição precisa sair **antes** do
  claim, para a tentativa seguir retentável — é o que faz o par "marcar enviado" + "salvar rastreio"
  funcionar em qualquer ordem.
- **Scope**: `supabase/functions/send-email`
- **Date**: 2026-07-30
- **Status**: active

### AD-008
- **Decision**: Chamada de saída não-crítica no caminho de request é **`await` limitado por
  `AbortController` explícito** (2500ms a partir de `create-payment`, 8000ms do webhook), nunca
  trabalho em background.
- **Reason**: `EdgeRuntime.waitUntil` não tem **nenhum** precedente no repo, só poderia viver no
  `index.ts` (que é deliberadamente sem teste), **morre no recycle do worker** (`policy =
  "per_worker"`) deixando linha `pending` órfã que nada reconcilia, e quebraria as asserções síncronas
  dos testes de handler. O `await` limitado é a mesma medicina que `BUG-20260728-edge-runtime-sem-dns`
  já ensinou: limite as chamadas de saída. `AbortController` explícito e não `AbortSignal.timeout()`
  pelo motivo já registrado em `useCreatePayment.ts` — fake timers controlam o primeiro, não o segundo.
- **Trade-off**: O caminho do cliente paga a latência do e-mail (teto de 2,5s contra os 15s do front).
  E o ramo de abort em si não é coberto por teste: `createFakeFetch` ignora `init.signal` — declarado
  na matriz de cobertura em vez de fingido.
- **Scope**: `supabase/functions/**`
- **Date**: 2026-07-30
- **Status**: active

### AD-009
- **Decision**: A feature `07-product-catalog-admin` é **fatiada em quatro**, pelas **costuras de deploy**,
  não por tela: `07` encolhe para **fundação + dinheiro** (modelo, `@nanapin/core`, `create-payment`,
  RPC de baixa, loja lendo o modelo novo); nascem `11-product-form-v2`, `12-product-media-studio` e
  `13-product-bulk-ops`. Os 55 requisitos e as 42 tasks são **movidos, não reescritos**. O `context.md`
  do `07` continua sendo o **contexto de programa** (decodificação dos 9 artboards do Paper) e é
  referenciado pelas outras três. **Supera a A1 da spec do 07**, que registrava "uma spec só" como
  confirmado pelo usuário.
- **Reason**: Fatiar por tela cortaria o caminho do dinheiro em quatro: a invariante "o valor cobrado é
  o da variação escolhida" atravessa schema + core + edge function + carrinho + checkout, e ficaria com
  quatro donos. Pela costura de deploy, o trecho com risco financeiro fica **indivisível e primeiro**,
  e o que sobra são três frentes sem risco de dinheiro que fecham de forma independente. O ganho real
  não é "spec menor" — é **paralelismo** (13 roda junto com 11) e escopo fechável sem esperar o resto.
- **Trade-off**: Quatro cabeçalhos (Problem/Goals/Out of Scope/Assumptions) para manter em vez de um, e
  as A1–A15 distribuídas. Três dependências passam a ser **entre features**, não entre fases — e
  dependência entre features não tem gate automático: viram pré-condição declarada no topo do
  `tasks.md` de cada uma. `VAR-13` (remover `products.variants`) é a única task que depende das **três**
  frentes e fecha na `13`, com pré-condição explícita.
- **Scope**: `.specs/features/{07-product-catalog-admin,11-product-form-v2,12-product-media-studio,13-product-bulk-ops}`
- **Date**: 2026-07-31
- **Status**: active

### AD-010
- **Decision**: **T27** (os inputs mascarados `MoneyInput` / `WeightInput` / `DimensionInput`) sai da
  fase do formulário e entra na **fundação (`07`)**, junto com os formatters puros de que depende.
- **Reason**: `13-product-bulk-ops` precisa deles em duas tasks (edição inline da listagem e grade
  rápida). Deixá-los na `11` faria a `13` esperar por **uma task no meio do formulário** — o
  paralelismo prometido pelo fatiamento seria falso. São 3 componentes de apresentação que só dependem
  de `@nanapin/core/formatters`; não têm nada de formulário neles.
- **Trade-off**: O requisito `PFM-10` fica com o prefixo do formulário morando na feature de fundação —
  o prefixo vira histórico, não localização. Preferido a renumerar o ID e quebrar as referências já
  escritas em `design.md` e `tasks.md`.
- **Scope**: `.specs/features/07-product-catalog-admin`, `.specs/features/11-product-form-v2`
- **Date**: 2026-07-31
- **Status**: active

### AD-011
- **Decision**: **Geração de texto por IA fica fora de escopo** — mas só o que o desenho de fato rotula
  como IA: **"Sugerir com IA"** (descrição, aba Geral) e **"Gerar com IA"** (título e descrição de SEO).
  A geração de **alt-text** (`PMD-01`, e a opção "Gerar alt-text de cada render" do estúdio) **fica
  dentro** do escopo, implementada como **função pura determinística por template** — nome do produto +
  rótulo da variação ou do mockup (`"Botton Sailor Moon — Lua Prateada · Na mão"`), sem chamada externa.
- **Reason**: Os dois botões de IA estão desenhados sem uma única AC, não aparecem em nenhum dos 22
  itens que o próprio desenho priorizou, e o projeto não tem provedor de IA — entrar agora arrasta
  escolha de modelo, chave, custo por chamada, latência no caminho do save e fallback quando a API cai.
  Nenhuma dessas perguntas foi feita. O alt-text é caso diferente: os artboards dizem "Alt gerado
  automaticamente" e "Gerar", **nunca** "com IA", e um alt derivado de nome + variação é determinístico,
  testável e resolve o que a acessibilidade e o SEO precisam.
- **Trade-off**: O Paper segue mostrando dois botões que a implementação não terá — divergência conhecida
  entre desenho e spec, registrada aqui de propósito em vez de silenciada. Os artboards **não** foram
  alterados: mexer no desenho é decisão de produto. Candidata a feature futura.
- **Correção de rota**: a primeira versão desta decisão colocava o alt-text junto dos dois botões de IA.
  Estava errado — o desenho não os equipara, e o alt-text não precisa de modelo nenhum.
- **Backlog**: registrado como **BL-001** em [`BACKLOG.md`](./BACKLOG.md), com as 6 perguntas que
  precisam de resposta antes de virar feature. Os botões **permanecem no Paper** — decisão do usuário
  em 2026-07-31: adiar, não descartar.
- **Scope**: `.specs/features/1{1,2}-*`, artboards `Produto — aba Geral`, `aba SEO`, `aba Mídia`,
  `Estúdio de mockup — ampliado`
- **Date**: 2026-07-31
- **Status**: active

### AD-012
- **Decision**: **Tipo declarado não é schema.** `DbCategory` declarava `parent_id`, `banner_url` e
  `color_accent` havia meses; o banco nunca teve as três. A migration
  `20260801150000_categories-hierarchy-and-counts.sql` cria as colunas **para alcançar o código**, e
  não o contrário. Junto vem a view `category_product_counts` (`security_invoker = true`), que passa
  a ser a **única** fonte de contagem por categoria — o FK legado `products.category_id` não conta
  mais nada em tela nova.
- **Reason**: O sintoma era invisível pelo caminho normal: `PGRST204` só aparece no **save**, e
  ninguém salvava categoria com frequência. Nem `pnpm build` (não checa tipo), nem `pnpm test` (o
  hook era mockado), nem `tsc` (o tipo *declarava* as colunas, então o código estava "certo") tinham
  como pegar. Só um probe HTTP contra o banco real acusou. Lição registrada: **quando o tipo é
  escrito à mão, ele é uma afirmação, não uma verificação** — e a prova de que uma tela grava é
  gravar.
- **Trade-off**: `updated_at` nasce com `default now()`, então toda linha antiga fica carimbada com
  o momento da migration — a primeira semana de "o que mudou recentemente" mente, e não há histórico
  de onde derivar a verdade. Aceito e declarado no comentário da migration.
- **Divergências deliberadas do artboard** (em [`14/validation.md`](./features/14-catalogo-refinamentos/validation.md)):
  `Mesclar` **cortada** pelo usuário no aceite (e **removida do Paper**, para desenho e código não
  divergirem); **`Destacar na home` não implementado** — precisaria de coluna nova **e** de a loja
  ter a faixa "Explore por tema", que não existe; o artboard **fica como está**, pelo mesmo critério
  da `AD-011`.
- **Scope**: `supabase/migrations/20260801150000_*`, `apps/backoffice/src/{entities/category,features/category-list,pages/admin/AdminCategoriesPage.tsx}`
- **Date**: 2026-08-01
- **Status**: active

### AD-013
- **Decision**: **Um campo por dado, mesmo quando o gateway já tem o dele.** No checkout, o
  documento do pagador é coletado **uma vez só**, e quem coleta depende do método: no PIX é o campo
  do bloco 3; no cartão é o **próprio CardPayment Brick**, de onde a loja lê
  `getFormData().payer.identification` e grava em `customers.cpf` **antes** do `create-payment`.
  Pela mesma regra, o e-mail do Brick é suprimido preenchendo `initialization.payer.email` a partir
  do bloco Contato, e o botão "Pagar" do Brick é suprimido com
  `customization.visual.hidePaymentButton`, com submissão externa por
  `window.cardPaymentBrickController.getFormData()`.
- **Reason**: O guard de `handlers.ts` (`if (!orderPayer.identification) → 422 missing_payer_cpf`)
  roda **antes** do branch de método, então `customers.cpf` é obrigatório para os dois — o que
  tentava justificar um campo nosso também no cartão. Mas o Brick **já** pede documento em MLB, e o
  desenho anterior somava a isso um segundo botão de pagar e um segundo campo de e-mail: três
  duplicações numa tela de dinheiro, todas relatadas como confusão em uso real. Ler o documento do
  Brick fecha as três com um único CTA.
- **Trade-off**: A ordem do CTA passa a ser `getFormData()` → `saveCpf` → criar pedido →
  `create-payment`, ou seja **o pedido só nasce depois de o cartão validar** — bom para não deixar
  `pending` órfão, mas significa que a criação do pedido agora depende de um retorno do SDK do
  Mercado Pago. E `getFormData()` **não tem comportamento documentado para formulário inválido**, o
  que obriga a tratar as duas formas de falha (promise rejeitada e retorno sem `token`). No PIX nada
  disso muda.
- **Scope**: `apps/store/src/features/checkout/{ui/CardPaymentBrick.tsx,ui/PaymentBlock.tsx,lib/cardBrick.ts}`, `apps/store/src/pages/CheckoutPage.tsx`
- **Date**: 2026-08-02
- **Status**: active

### AD-014
- **Decision**: **Conjunto de produtos é CATEGORIA, e o menu da loja é um recorte dela — não uma
  entidade própria.** A tela `/admin/colecoes`, a tabela `collections` e os tipos `DbCollection` /
  `CollectionRule` foram **removidos**. O menu vive em duas colunas de `public.categories`:
  `show_in_menu` (vaga na barra do topo, válida em **qualquer profundidade** da árvore) e
  `menu_promo jsonb` (`{ category_id, badge?, title?, subtitle? }`). A ordem é a `sort_order` que já
  existia. A regra é uma função pura em `@nanapin/core/menu`, consumida pelas quatro superfícies nos
  dois apps: `/admin/menu`, `MegaMenu`, `MobileMenu` e o roll-up de `/colecao/:slug`.
- **Reason**: Três motivos independentes apontavam para o mesmo lugar. (1) `public.collections`
  **nunca existiu** — nenhuma migration, nada em `.lovable/sql/`, `PGRST205` no banco vivo — e
  `useAdminCollections` engolia o erro (`setCollections([])`), então a tela mostrou grade vazia em
  todos os ambientes desde o split do monorepo. Terceira ocorrência do `AD-012`, e a pior: nas outras
  duas havia DDL em algum lugar. (2) Na loja a palavra **já tinha dono**: `/colecao/:slug` renderiza
  `CategoryPage` a partir de `categories`, o widget da home se chama "Coleções", o 404 diz "Coleção
  não encontrada". (3) `categories` é estritamente mais capaz do que `collections` prometia — vínculo
  N:N **ordenado** (`product_categories.position`) contra `product_ids text[]`, hierarquia por
  `parent_id`, e uma página real. Uma tabela `menu_items` própria seria uma **segunda árvore** ao lado
  da que já existe, e as duas divergiriam no primeiro rename — o mesmo defeito que o `CLAUDE.md` já
  registra na página de carrinho.
- **Trade-off**: Perde-se **conjunto por regra** (`type: 'auto'`), a única capacidade exclusiva de
  Coleções; virou backlog "categoria automática" na spec da 16, e os cinco campos que as regras liam
  (`is_featured`, `is_new`, `compare_price`, `created_at`, `stock_total`) seguem sendo colunas reais.
  E `menu_promo.category_id` mora dentro de jsonb, **onde não cabe FK**: apagar o destino não dispara
  `on delete set null`, então a validação do destino é obrigatória na leitura (`resolvePromo`) e é
  critério de aceite, não zelo. `drops` continua sendo uma quarta palavra para a mesma ideia — tabela
  existe, uma linha de seed, nenhum código a lê; ficou fora de escopo por ter dado.
- **Scope**: `packages/core/src/menu/**`, `public.categories`, `apps/backoffice/src/{pages/admin/AdminMenuPage.tsx,features/store-menu/**}`, `apps/store/src/{entities/category/**,widgets/header/ui/MegaMenu.tsx,widgets/mobile-menu/**}`
- **Date**: 2026-08-02
- **Status**: active

### AD-015
- **Decision**: **Desconto por item nunca soma.** Quando duas regras alcançam o mesmo item, vale o
  **menor preço unitário** — nunca a composição das duas. E entre **promoção e cupom**, vale o **menor
  total do pedido**, decidido por `resolveOrderPricing` em `@nanapin/core/payment/pricing`, que calcula o
  pedido nos dois caminhos e escolhe. Vale para qualquer oferta futura: upsell, brinde, combo,
  progressivo por valor.
- **Reason**: Empilhar é o comportamento *default por construção*, não uma escolha: `resolveCouponDiscount`
  recebe o subtotal **já descontado** pelo order bump, então qualquer desconto novo que entre antes dele
  passa a compor sem ninguém decidir isso. Foi o que a 17 descobriu ao desenhar o switch "acumula com
  cupom": sem esta regra, o switch nasceria ligado e **mentindo**. Duas consequências boas de fixar o
  "menor vence": (1) o resultado fica **independente da ordem de aplicação** das regras, o que é
  propriedade testável em vez de comentário — `perItemMin` calcula bump e progressivo a partir do preço
  **cheio** e compara; (2) margem de kit não é consumida por composição acidental (5 bottons a R$ 4,60 com
  cupom de 15% sairia a R$ 19,55).
- **Trade-off**: Cliente com cupom na mão e itens em promoção **não usa os dois** — o resumo tem de dizer
  qual venceu e qual foi descartado, senão o desconto "desaparece" sem explicação (é AC, `PRM-17`). E a
  comparação é pelo **total final**, não pelo desconto, porque cupom `free_shipping` mexe no frete: comparar
  descontos faria ele perder de uma promoção que desconta menos dinheiro. O modo empilhado segue existindo
  como `promotions.stacks_with_coupon`, mas é **opt-in por promoção**, nunca o default.
- **Scope**: `packages/core/src/payment/pricing.ts`, `supabase/functions/mercado-pago/handlers.ts`,
  `apps/store/src/{entities/cart,features/checkout}/**`
- **Date**: 2026-08-03
- **Status**: active

### AD-016
- **Decision**: **O repositório deixa de ser a Nanita e passa a ser a Uma Estrelinha** — joias afetivas
  artesanais em resina com material do cliente. A conversão é fatiada em **três features, pelas costuras
  de deploy**, não por tela: **`20-rebrand-uma-estrelinha`** (fundação, renomeação técnica, identidade
  visual, remoção do domínio botton), **`21-catalogo-nuvemshop`** (importação one-shot do catálogo real,
  com imagens no Storage) e **`22-material-afetivo`** (página "Como enviar", campos por item, rastreio do
  material no pedido). Os 50 requisitos da spec original são **movidos, não reescritos**.
  Junto vai a decisão que o `CLAUDE.md` herdado proíbe: **`nanapin` é renomeado**, inclusive escopo npm
  (`@estrelinha/*`), `project_id`, tokens (`--estrelinha-*`) e chaves de `localStorage`.
- **Reason**: Três motivos independentes. (1) **Volume** — 50 requisitos são ~50 tasks, ~7 lotes de
  sub-agente; a `19` fechou com 32 e a `07` foi fatiada com menos que isso (`AD-009`). Um bloqueio no meio
  da renomeação travaria trabalho que não tem relação com ele. (2) **Dependência real** — a `21` precisa
  da `20` de pé (o importador escreve com o escopo npm novo) e a `22` precisa de catálogo real para ser
  testada com produto de verdade; a ordem não é preferência, é pré-requisito. (3) **A proibição de
  renomear `nanapin` existia para proteger o `localStorage` de clientes VIVOS da Nanita** — carrinho e
  wishlist órfãos. A Uma Estrelinha não tem um navegador sequer com estado desta loja, então o risco que a
  regra protege não existe; mantê-la só perpetuaria o nome de outro produto em 921 linhas de import.
- **Trade-off**: Renomear o identificador técnico custa ~1.000 linhas de edição mecânica e invalida o
  `pnpm-lock.yaml`, que precisa ser regerado. E fatiar em três significa que a loja fica **sem catálogo
  real durante toda a `20`** — o seed de desenvolvimento é o que sustenta a prova visual até a `21` rodar.
  Aceito: o alternativo (importar antes de renomear) faria o importador nascer escrevendo `@nanapin/*`.
- **Scope**: repositório inteiro — `apps/**`, `packages/**`, `supabase/**`, raiz
- **Date**: 2026-08-08
- **Status**: active

### AD-017
- **Decision**: **Enquanto este banco não for implantado, a história de migration pode ser reescrita.**
  As duas `*_create_store_settings.sql` (duplicatas byte-a-byte uma da outra) passam a gravar os
  defaults da Uma Estrelinha direto, e a `20260801170000_rebrand_store_settings_nanita.sql` — que
  existia **só** para consertar o valor daquelas duas — é **apagada**. Consequência: a task de
  rebrand de `store_settings` (`T34`) encolhe para os defaults em TypeScript, sem migration.
  **Esta permissão expira no primeiro `supabase db push` para um projeto hospedado.** A partir daí
  vale a regra normal: migration aplicada é imutável, e correção vem em migration nova.
- **Reason**: O `project_id` virou `uma-estrelinha-store` em 2026-08-08 e nenhum `db push` foi feito.
  Não existe `supabase_migrations.schema_migrations` remoto para divergir — a história só é
  reproduzida do zero, por `db reset`. Nessas condições, carregar uma migration cujo propósito
  inteiro é desfazer o valor da anterior é dívida sem contrapartida. E a alternativa (allowlist na
  varredura de marca) tem custo real: uma allowlist de `supabase/migrations/` deixaria de detectar
  resíduo numa migration **nova**, que é exatamente o caso que a varredura existe para pegar.
- **Trade-off**: Perde-se o registro de que a loja já se chamou outra coisa nos defaults — mas esse
  registro está preservado em `.specs/archive/nanita/` e nas decisões `AD-001`..`AD-015`. E cria-se
  uma regra com data de validade, que é sempre pior do que uma regra estável: se alguém implantar o
  banco e depois reescrever migration por hábito, o dano é silencioso. Por isso a expiração está
  escrita na própria decisão e o `CLAUDE.md` (`T40`) a repete.
- **Scope**: `supabase/migrations/**`
- **Date**: 2026-08-08
- **Status**: active

### AD-018
- **Decision**: **As URLs da loja nova seguem o formato da loja em produção**, e não o inverso.
  Produto em `/produtos/:slug`; categoria **raiz na raiz do domínio** (`/:slug`); subcategoria em
  `/:pai/:filha`, que é a forma canônica. `/produto/:slug` e `/colecao/:slug` continuam resolvendo,
  com **301** para o canônico. **Consequência que vale para toda feature futura: o namespace de rota
  e o de slug de categoria são o MESMO.** Toda rota nova de um segmento tem de ser conferida contra
  os slugs de categoria, e todo slug de categoria contra as rotas — por lista de palavras reservadas
  validada no cadastro, com teste que quebra quando a lista e as rotas divergirem.
- **Reason**: O tráfego orgânico que as landing pages construíram aponta para os endereços atuais, e
  medição do `<link rel="canonical">` do site real (2026-08-09) mostrou **três** formatos indexados —
  nenhum deles servido pela loja nova. Preservar o *slug*, que a `21` entrega, é necessário e
  **insuficiente**: o que quebra é o caminho. A alternativa (servir `/colecao/:slug` e redirecionar
  tudo com 301) removeria o custo do namespace compartilhado e foi apresentada; o usuário escolheu
  manter o padrão de produção em 2026-08-09.
- **Trade-off**: Categoria na raiz é a fonte do custo. Uma categoria chamada "sobre", ou uma rota
  `/ajuda` criada existindo categoria homônima, faz **uma das duas sumir sem aviso** — e some em
  produção, não em teste. A lista de reservadas é a contrapartida obrigatória dessa escolha, não um
  refinamento: sem ela a decisão é uma armadilha com prazo indeterminado. Aceita-se também servir a
  subcategoria em duas formas (um e dois segmentos), com canonical apontando para a de dois.
- **Scope**: `apps/store/src/app/App.tsx`, `.specs/features/23-urls-e-seo`, cadastro de categoria no
  backoffice
- **Date**: 2026-08-09
- **Status**: active — **implementada pela feature [`23-urls-e-seo`](./features/23-urls-e-seo/spec.md)
  em 2026-08-09** (T1–T20). A fonte única virou `@estrelinha/core/routes`; a contrapartida obrigatória
  (lista de reservadas + guarda bidirecional contra o `App.tsx`) está de pé em `reservedSlugs.test.ts`,
  e o `vercel.json` está preso a `LEGACY_REDIRECTS` por `vercelRedirects.test.ts`. O que fica por
  medir é a implantação, não a decisão: **não há projeto Vercel da Uma Estrelinha** (`C-08`), então os
  301 se provam pela configuração lida do disco e pelo espelho no router.

### AD-019
- **Decision**: **A prévia da Home no painel é a LOJA, carregada num `<iframe>`** em `?preview=1`, com
  o rascunho não salvo entregue por `postMessage`. O painel **não desenha seção da Home** — nem
  esquema, nem mini-mapa, nem "só um fallback para quando o iframe não carrega". O contrato das
  mensagens tem um dono, `@estrelinha/core/home/preview.ts`, e o guarda `previaUnica.test.ts` impede a
  volta de um segundo desenho.
- **Reason**: A `24` eliminou a segunda escrita da **derivação** movendo `pickHomeCollections` e
  companhia para `core/home` — e deixou viva a segunda escrita do **desenho**: `HomePreview.tsx`, 277
  linhas no backoffice redesenhando o que `widgets/home-renderer` (130 linhas) já desenhava, em apps
  que não se importam. A divergência **não quebra nada**: build, `tsc` e teste de componente passam com
  o painel prometendo um arranjo que a loja não renderiza — que é exatamente o defeito que a `24`
  existiu para eliminar, sobrevivendo num outro arquivo. Dois sintomas mediram o custo: a prévia tinha
  **380px de 1440** (nenhuma representação de desktop cabe ali) e não havia alternador de dispositivo
  numa loja com ~90% de acessos móveis. O iframe resolve os três de uma vez, e resolve de graça um
  quarto: **a separação de tokens** — renderizar widget da loja dentro do painel traria
  `--estrelinha-*` para o documento de `--estrelinha-admin-*`, que é o que `importOrder.test.ts` e
  `palette.test.ts` guardam. Outro documento, outra folha.
- **Trade-off**: A prévia passa a **depender da loja estar no ar** e de `VITE_STORE_URL` — sem ela o
  palco mostra estado vazio declarado, e a lista segue funcionando. Em produção exige
  `frame-ancestors` (`BL-013`), e o modo de falhar é **quadro branco sem erro**, porque a recusa é do
  navegador. E jsdom não carrega o documento do iframe: a cobertura se parte — o **contrato** em
  `core`, o **desenho** na loja, a **ponte** no painel. Aceito porque o alternativo é manter dois
  desenhos divergindo em silêncio, que foi o que a feature mediu.
- **Scope**: `packages/core/src/home/preview.ts`, `apps/store/src/{entities/home,widgets/home-renderer,pages/HomePage.tsx,app/App.tsx}`,
  `apps/backoffice/src/features/home-composition`, `apps/backoffice/src/shared/lib/storeOrigin.ts`
- **Date**: 2026-08-15
- **Status**: active — **implementada pela feature [`25-previa-real-da-home`](./features/25-previa-real-da-home/spec.md)**
  em 2026-08-15 (T1–T14).

## Handoff

### ATUAL — 2026-08-16 · `28-perguntas-frequentes` **IMPLEMENTADA** (T1–T28)

**Estado**: 28 tasks em 6 fases, todas fechadas. **Commits agrupados no fim**, pela convenção do
`CLAUDE.md` (`BL-012`). Gate verde, medido por workspace com exit code capturado de verdade.
**Nada em andamento.** Falta o **Verifier** independente (`validation.md`).

#### O que a `28` entrega

A seção "Perguntas Frequentes" da página do produto era um `<dl>` cravado com **duas perguntas
genéricas**, iguais nos 691 produtos. As perguntas reais — **3.476 pares em 687 produtos (99,4%)** —
estavam presas dentro de `products.description`. Agora são cadastro: biblioteca compartilhada,
vínculo ordenado por produto, resposta própria quando a peça responde diferente, e sugestão
determinística por categoria.

| | onde |
| --- | --- |
| Domínio puro — chave, resolução, fronteira do bloco, ranking | `packages/core/src/faq/**` |
| As duas tabelas, as duas views, RLS | `supabase/migrations/20260816120000_28-perguntas-frequentes.sql` |
| A loja lê e para de repetir | `entities/product/{api/useProductFaqs,ui/ProductFaq}` · `ProductDescription` |
| A semente do catálogo | `tools/catalog-import/src/write/faqs.ts` |
| `/admin/perguntas` — biblioteca, uso, lote por categoria | `features/faq-library/**` |
| Aba `Perguntas` do produto, com sugestões | `features/product-form/ui/tabs/FaqTab.tsx` |
| O aviso do bloco que a loja não mostra | `features/product-form/ui/DescriptionFaqNotice.tsx` |

**Gate de fecho medido**:

| | valor |
| --- | ---: |
| Testes | **5.085** em **284** arquivos |
| store · backoffice · core · functions · catalog-import | 1768/126 · 1496/94 · 1218/44 · 279/4 · 324/16 |
| Lint | **30 erros / 8 warnings** — store 2/1 · backoffice 28/7 — baseline exata, zero novo |
| Tipos | store **0** · backoffice **0** · catalog-import **0** |

`packages/core/src/payment/` **intocado** — `git status --porcelain` naquele diretório devolve vazio.

#### As três decisões do usuário, e o que cada uma custou

| Pergunta | Escolha | Consequência paga |
| --- | --- | --- |
| O bloco de FAQ que sobra na descrição | **A loja filtra no render** | O painel mostra texto que a loja não exibe. Pago por `DescriptionFaqNotice`: aviso com contagem + botão de remoção por clique da dona |
| A "inteligência" da sugestão | **Determinística agora, IA depois** | `BL-014`. Em troca, uma régua que **mede**: 84,0% / 83,5% no top-5, com sensor que reprova a fórmula errada |
| A mesma pergunta com respostas diferentes | **67 entradas + `answer_override`** | Um leitor único (`resolveProductFaqs`) e a regra de que override idêntico ao padrão vira `null` |

#### O que a execução expôs, e que vale registrar

- **Um produto do catálogo repete a mesma pergunta na descrição.** `Anel Afetivo Aliança com Coto
  Umbilical em Prata 925` traz "As joias são realmente feitas à mão?" duas vezes, e a PK
  `(product_id, faq_id)` recusou o lote inteiro — a primeira execução real caiu com `23505`
  **depois** de gravar 2.500 vínculos. O plano passou a deduplicar por produto (vence a primeira
  aparição), com contador próprio no relatório. **Nenhum teste de unidade pegaria**: só o dado real
  tem o caso.
- **Dois números da spec estavam medidos com régua diferente da do código**, e foram corrigidos com
  a explicação: 3.476 → **3.475** vínculos (a duplicata) e 1.044 → **977** respostas próprias (a spec
  comparou a resposta **crua**; o extrator compara a **normalizada**). Replicar a normalização do
  extrator em SQL devolve exatamente 977.
- **Guarda que varre o próprio fonte reprova o próprio comentário.** Três asserções quebraram porque
  o comentário do arquivo cita, de propósito, o literal que a varredura proíbe. Virou
  `apps/store/src/test/sourceScan.ts` — a varredura mede **o que roda**, não o que explica.
- **`Select` do Radix não abre no jsdom sem `PointerEvent`.** Dois arquivos de teste já carregavam a
  própria cópia do stub; virou `apps/backoffice/src/test/radix.ts`.
- **A armadilha do `QueryClientProvider` voltou, duas vezes.** `ProductPage.test.tsx` e
  `AdminProductFormPage.test.tsx` dublam hooks em vez de prover o client — a segunda ficou **verde
  com 14 erros não tratados e exit 1**, que é o modo de falhar mais fácil de ignorar.

#### ⚠️ A árvore tem trabalho de OUTRA feature, e ele NÃO foi commitado aqui

Durante esta sessão apareceu a feature **`29-pagina-sobre`** na mesma árvore: `spec.md`,
`AboutPage.tsx`, `EstrelinhaStarIcon.tsx`, `AboutPage.test.tsx` novo e edições em
`copyInstitucional.test.tsx` e `accentText.test.ts`. **Os commits da `28` deixaram tudo isso de
fora** — está intacto na árvore, sem stage.

Duas consequências, declaradas em vez de escondidas:

1. **A baseline do store registrada (1768/126) é a da `28`**, medida antes de a `29` chegar. Com a
   árvore de hoje a suíte dá **1771/126** sem o arquivo novo da `29` e **1784/127** com ele — os 3 e os
   16 a mais são dela. Reconferir quando a `29` fechar. Os outros quatro workspaces são só da `28`.
2. **`AboutPage.test.tsx` reprova 1 de 16 isolada, agora.** É a `29` em andamento, não flake — e não é
   defeito da `28`. Numa das medições do gate isso foi lido como flake de RTL; a leitura estava
   errada e está corrigida aqui e no `CLAUDE.md`.

#### Pendências desta feature

- **O Verifier independente não rodou** (autor ≠ verificador): sub-agentes são proibidos nesta
  sessão, então cabe o passe standalone de `validate.md`. `28/validation.md` não existe.
- **A `24` e a `27` seguem sem `validation.md`.** Continuam pendentes, como estavam.
- **A curadoria das perguntas é decisão da dona**, como a do material e a da Home.
- **`BL-015`** nasceu aqui: `material_kinds` diz menos que a descrição.

---

### 2026-08-15 · `25-previa-real-da-home` **IMPLEMENTADA** (T1–T14)

**Estado**: 14 tasks em 5 fases. **Commits agrupados no fim** — e essa é a primeira feature assim,
pela decisão que fechou a `BL-012` (o `CLAUDE.md` manda; as `20`..`24` tinham praticado o contrário).
Gate verde, medido por workspace com exit code capturado de verdade. **Nada em andamento.**

#### O que a `25` entrega

A prévia de `/admin/home` deixou de ser um desenho do painel e passou a ser **a loja**, num iframe,
mostrando o rascunho ainda não salvo. `HomePreview.tsx` (277 linhas) foi apagado: a Home tem um
desenho só, e ele mora em `apps/store`. Ver `AD-019`.

| | onde |
| --- | --- |
| O contrato das 4 mensagens + `isPreviewWindow`, `parsePreviewMessage`, `previewScale` | `packages/core/src/home/preview.ts` |
| Modo prévia da loja (consulta desligada, clique que seleciona, sem rastreador) | `entities/home/model/useHomePreview.ts` · `pages/HomePage.tsx` · `app/App.tsx` |
| Invólucro e contorno, **só em modo prévia** | `widgets/home-renderer/ui/PreviewSectionFrame.tsx` |
| A ponte (origem exata, dupla checagem de remetente, debounce) | `features/home-composition/model/usePreviewBridge.ts` |
| O palco: barra, alternador Celular/Computador, escala, estado vazio | `features/home-composition/ui/HomeLivePreview.tsx` |
| Layout invertido (rail 380 + palco), rascunho ao vivo, realce por cursor | `pages/admin/AdminHomePage.tsx` |
| Um leitor só de `VITE_STORE_URL` | `shared/lib/storeOrigin.ts` |

**Gate de fecho medido**:

| | valor |
| --- | ---: |
| Testes | **4.595** em **259** arquivos |
| store · backoffice · core · functions · catalog-import | 1562/116 · 1388/86 · 1090/38 · 279/4 · 276/15 |
| Lint | **30 erros / 8 warnings** — baseline exata, zero novo |
| Tipos | store **0** · backoffice **0** |

`packages/core/src/payment/` **intocado** — quarta feature seguida.

#### A contabilidade de testes, declarada

Entraram **121**, saíram **14**. Os 14 eram de `HomePreview.test.tsx` e mediam "a prévia mostra a
ordem e os textos reais" — asserção que virou **verdadeira por construção** e que
`homeComposition.test.tsx` já mede na loja. É a exceção à regra de "queda só vale se o número
reaparece do outro lado", e está declarada no `CLAUDE.md` em vez de escondida no líquido.

#### O que a execução expôs

- **Cinco asserções da `24` apontavam para o esquema apagado.** Foram **reescritas contra a nova
  superfície, não afrouxadas**: o contorno virou `data-highlight` no palco dublado, a
  não-remontagem virou identidade do nó do palco, e o `postMessage` ganhou teste próprio em
  `usePreviewBridge.test.tsx`. `AdminHomePage.test.tsx` foi de 26 para 34.
- **`@testing-library/user-event` não é dependência do backoffice** — os testes de lá usam `fireEvent`.
- **A palavra de estado da linha virou `sr-only`**: com o rail em 380px ela custava ~50px do nome da
  seção, que truncava. `HomeSectionList.test.tsx` continua medindo por texto, porque `sr-only` não tira
  do DOM.

#### Pendências

- **O Verifier independente**: nesta sessão sub-agentes são proibidos, então rodou como passe
  standalone (`validate.md`) — o relatório está em `25-previa-real-da-home/validation.md`.
- **A `24` ainda não tem `validation.md`.** Continua pendente, como estava.
- **`BL-013`** — `frame-ancestors` em produção, bloqueado por `C-08`.
- **`VITE_STORE_URL`** precisa ser preenchida no `.env` local do backoffice para a prévia acender.

---

### 2026-08-15 · `24-home-gerenciavel` **IMPLEMENTADA** (T1–T35) · falta o **Verifier**

**Estado**: árvore **limpa**, 35 tasks em 6 fases, **um commit atômico por task** (mais os fechos de
fase). Gate verde, medido de verdade. **Nada em andamento.**

---

#### O que a `24` entrega

A composição da Home saiu do `.tsx` e virou **dado**. Antes, mudar a ordem dos blocos, o texto do
hero ou a arte de um banner era edição de código; e reordenar a vitrine mexia na **barra do topo**,
porque as duas liam `categories.sort_order`. Agora a Home mora em `home_sections` +
`home_section_items`, e `/admin/home` é onde a dona arrasta, liga, desliga e edita.

| | onde |
| --- | --- |
| Domínio da composição — catálogo de 10 tipos, semente, ordem, resolução, recusas, arranjos, derivação | `packages/core/src/home/**` |
| As duas tabelas, RLS, trigger do hero indelével, bucket `home-images` | `supabase/migrations/*_24-home-gerenciavel.sql` |
| A loja lê do banco, com `DEFAULT_HOME_COMPOSITION` como piso | `entities/home` + `widgets/home-renderer` |
| Hero com foto opcional, grade de banners com 4 arranjos e banner livre | `widgets/hero-banner` · `widgets/home-banners` |
| Destaque em coleção (tipo novo, com desenho) | `widgets/collection-feature` |
| `/admin/home` — lista arrastável, bandeja de blocos, prévia esquemática | `features/home-composition` |
| Editor de seção como **rota** (`/admin/home/:sectionId`), trocando só a coluna da lista | `pages/admin/AdminHomePage.tsx` |
| Cinco editores: hero, grade de banners, seções de texto, fileiras de coleção, destaque | `features/home-composition/ui/*Editor.tsx` |

**Gate de fecho medido** (por workspace, exit 0 capturado de verdade, nunca por `| tail`):

| | valor |
| --- | ---: |
| Testes | **4.488** em **251** arquivos |
| store · backoffice · core · functions · catalog-import | 1528/113 · 1345/82 · **1060/37** · 279/4 · 276/15 |
| Lint | **30 erros / 8 warnings** — baseline exata, zero novo |
| Tipos | store **0** · backoffice **0** · catalog-import **0** |

`packages/core/src/payment/` **intocado** — `git diff --name-only 83a3853..HEAD -- packages/core/src/payment`
devolve **vazio**. Nenhuma decisão de dinheiro passou a depender da composição da Home.

---

#### Os seis contratos que valem para toda feature futura

1. **Curadoria é a PRESENÇA de itens, não uma flag.** Ter itens é o override; não ter é a derivação.
   "Voltar ao automático" é um `delete`. Uma flag `auto`/`manual` seria dois donos do mesmo dado, com
   um estado (`manual` + zero itens) que a loja não sabe distinguir de automático.
2. **A vaga que sobra fica VAZIA.** Escolhida fora do ar é pulada e **não** é substituída pela
   derivação. A loja pula, o painel avisa com o número ("1 das 3 saiu do ar") e marca a linha.
3. **Reordenar a Home não toca em `categories.sort_order`.** Era metade do problema que abriu a
   feature. A ordem da Home é `position`, nas duas tabelas.
4. **A derivação tem UM dono: `@estrelinha/core/home/derive.ts`.** `pickHomeCollections`,
   `pickHomeBanners` e `pickTrendingCategories` saíram de `apps/store` na T35, porque o painel havia
   sido obrigado a reescrevê-las (o backoffice não importa de `apps/store`) e a deriva já começara.
5. **Erro de leitura cai no piso semeado, nunca em página em branco.** `DEFAULT_HOME_COMPOSITION` é
   ao mesmo tempo a semente da migration e o fallback do hook — e `homeSections.test.ts` prende os
   dois um ao outro, lendo a migration do disco.
6. **Editor de seção é ROTA, e ela troca só a coluna da lista.** A prévia continua sendo a mesma
   árvore de React e **não remonta** — asserido por identidade do nó do DOM, porque é a razão de a
   rota existir neste formato.

---

#### O que a execução expôs, e que vale registrar

- **Congelar a Home ANTES de mexer nela foi o que tornou `HOME-04` verificável.** A T1 assere o
  **DOM renderizado** — sequência, literais, limites, as duas cores do título — e a regra do gate é
  "não perde asserção, só ganha". Ela foi de 9 para 14 asserções ao longo da feature, com **56 linhas
  adicionadas e 0 removidas** na fase que reescreveu a página inteira.
- **O upsert de reordenação precisa mandar `type` junto**: `{ id, position }` devolve
  `23502 null value in column "type"`, porque o upsert do PostgREST é `insert … on conflict`.
- **`insert` em lote exige as mesmas chaves em todos os objetos** (`PGRST102`).
- **O CHECK de destino é `<= 1`, não `= 1`** — provado no probe: com `= 1`, apagar a categoria de
  destino faria o `DELETE` **falhar** em vez de esvaziar a FK.
- **"Saiu do ar" é resposta da RLS, não filtro do cliente**: produto despublicado volta com
  `product: null` e o `product_id` intacto.
- **A grade de banners aparece como "não vai aparecer" com dado REAL** — nenhuma das 37 categorias do
  catálogo importado tem `banner_url`.

---

#### Pendências desta feature

- **O Verifier independente ainda não rodou** (autor ≠ verificador), e `24/validation.md` não existe.
  É o próximo passo, com checagem ancorada na spec e sensor de discriminação.
- **A curadoria da Home é decisão da dona**, como a do material. A composição semeada é a de hoje;
  subir arte em `/admin/categorias` é o que acende a grade de banners.
- **Os dois blocos de P3** (`product_carousel`, `category_grid`) estão no catálogo **sem renderer e
  sem editor**, esmaecidos na bandeja com "em breve". A ausência é declarada.
- **`BL-012` precisa de decisão do usuário**: o `CLAUDE.md` pede commits agrupados no fim da
  implementação e a Skill `tlc-spec-driven` exige um commit atômico por task. As features `20`..`24`
  seguiram a Skill — a regra do arquivo não vem sendo praticada há cinco features, e isso é pior que
  qualquer uma das duas isolada. **Não foi alterada por conta própria.**

---

**Bloqueios conhecidos**:
- **Resend**: `send.umaestrelinha.com.br` não verificado (403 medido em 2026-08-08). SMTP do auth
  desligado de propósito, e-mail de dev no Mailpit.
- Commits locais sem push. O remoto `origin` está configurado
  (`github.com/rafaeldusantos/umaestrelinha`) e nenhuma branch remota é conhecida localmente.

**Curadoria pendente, que é decisão da dona e não código**: `show_in_menu = 0` nas 37 categorias,
então a barra do topo está vazia (`/admin/menu`); nenhuma categoria tem `banner_url`, então a grade
de banners da Home não desenha (`/admin/categorias`). Admin local:
`admin@umaestrelinha.dev` / `admin123`, porta 8083.

**Backlog aberto**: `BL-007` (sitemap e dados estruturados), `BL-008` (teto de 1.000 do PostgREST em
`fetchStatusCounts`), **`BL-009`** (`SUPABASE_URL` com fallback de outro projeto), **`BL-010`**
(consolidar as duas reordenações), **`BL-011`** (imagem órfã no Storage), **`BL-012`** (a divergência
de convenção de commits), `BL-00Z` (endereço por WhatsApp), mais os anteriores.

**Ambiente**: Supabase local de pé na faixa 54341–54349, catálogo real no banco (689 produtos · 3.356
variações · 37 categorias · 3.660 imagens no Storage), mais as 7 seções semeadas da Home.


## Handoff — histórico

As entradas abaixo são os snapshots das sessões anteriores, preservados. A seção `## Handoff` acima
carrega **só o estado atual**; este apêndice existe porque as sessões anteriores acumulavam, e apagar
o que outra pessoa guardou de propósito não é decisão de quem passou por último.

### ANTERIOR — 2026-08-09 · `22-material-afetivo` implementada (T1–T21)

**Estado**: árvore **suja de propósito** (convenção de commit do projeto: os commits vêm de uma vez,
depois da verificação). Gate verde, medido de verdade. **Nada em andamento.**

---

#### O que a `22` entrega

A loja passou a representar o que o negócio de fato faz: uma joia afetiva **exige que a cliente envie
pelo correio um material insubstituível**, e agora isso está escrito antes da compra, registrado no
pedido e visível numa fila. Antes era combinado por WhatsApp e não existia tela que respondesse
"quais pedidos ainda esperam material?".

| | onde |
| --- | --- |
| `/como-enviar-o-material` — 4 passos, **10 fichas** com âncora, endereço e checklist | `pages/HowToSendMaterialPage.tsx` + `widgets/material-guide` |
| Aviso de material nas **duas** superfícies de compra, cada material levando à ficha dele | `entities/product/ui/MaterialNotice.tsx` |
| Campo de gravação com limite do cadastro, contador e bloqueio | `entities/product/ui/EngravingField.tsx` |
| Gravação na **chave da linha** do carrinho | `entities/cart/model/cartStore.ts` (v2 → **v3**, preservando a sacola) |
| Snapshot no pedido + estado inicial da fila | `CheckoutPage` + `useCreateOrder` |
| Rastreio da remessa **da cliente**, por RPC | `/pedido/:id` → `widgets/order-material` |
| Fila, filtro e card no admin | `AdminOrdersPage` + `features/order-management/ui/OrderMaterialCard.tsx` |
| 5º e-mail transacional (`material_received`) | `supabase/functions/send-email` |
| Cadastro do material no produto e endereço do ateliê em Configurações | `features/product-form/ui/MaterialCard.tsx` · aba `Material` |
| **Semente** dos 689 produtos do catálogo real | `tools/catalog-import` + `inferMaterial` |

**Gate de fecho medido** (`turbo run test --force`, exit 0 capturado de verdade, nunca por `| tail`):

| | valor |
| --- | ---: |
| Testes | **3.983** em **221** arquivos |
| store · backoffice · core · functions · catalog-import | 1365/104 · 1145/70 · **918/28** · 279/4 · 276/15 |
| Lint | **30 erros / 8 warnings** — baseline exata, zero novo |
| Tipos | store **0** · backoffice **0** · catalog-import **0** |

`packages/core/src/payment/` **intocado** (`git status` limpo naquele diretório). Nenhuma decisão de
dinheiro passou a depender do material.

**A semente foi medida contra os 689 nomes reais do banco, não contra fixture:**

| | |
| --- | ---: |
| produtos que passam a exigir material | **422 de 689 (61%)** |
| com **dois ou mais** materiais | **62** |
| leite materno · cinzas · cabelo · coto · pet · dente · flores · penas | 147 · 127 · 85 · 51 · 49 · 25 · 10 · 2 |

Bate com a medição da spec em cinzas (127), cabelo (85), coto (51) e dente (25). **Duas divergências
são deliberadas e vieram de olhar os nomes:**

- **`flores` dá 10, não os 25 do `ilike '%flor%'`** — porque no catálogo real *flor é FORMA* antes de
  ser material: "Berloque Afetivo Flor Lisa", "Pingente Menina Com Flor" e, o caso decisivo, **"Joia
  Afetiva Flor com Cinzas de Cremação"**, onde o material é cinzas. A regra exige plural ou o
  qualificador *natural*. Errar para menos é barato: quase todo produto de flor declara outro
  material junto e entra na fila do mesmo jeito.
- **`penas` dá 2 porque a regra passou a aceitar o SINGULAR** — os dois produtos dizem "Pena de
  Pássaro". A primeira versão só casava plural e perdia os dois. O `\b` inicial é o que impede
  "apenas" de casar.

---

#### Os cinco contratos que valem para toda feature futura

1. **"Exige material" e "quais materiais" são DOIS dados**, e `products.requires_material` é
   **nullable**: `null` = "nunca decidido". É o marcador que deixa o importador semear sem apagar a
   curadoria da dona. Ninguém compara a coluna crua — todo consumidor passa por `requiresMaterial()`.
   Lista vazia com `true` é a **peça de material livre**, e a tela diz `a combinar`, nunca vazio.
2. **`orders.material_tracking_code` ≠ `orders.tracking_code`.** Entrada × saída. Reusar a segunda
   faria "postamos sua joia" sair com o código do envelope que a cliente mandou.
3. **Escrita de estado só por RPC.** `set_material_status` (admin) e `set_material_tracking` (dona do
   pedido **ou** admin) são `security definer` e escrevem um campo. **Nenhuma policy de `UPDATE` em
   `orders` foi aberta** — PAY-10 segue intacta, e há teste que assere isso lendo a migration.
4. **O salto `aguardando_material → material_recebido` é obrigatório**, não atalho: informar o
   rastreio é opcional e a maioria dos pedidos nunca passa por `material_enviado`.
5. **Gravação é variação, não coluna nova.** O eixo `Com gravação` já precificava (33 de 35 produtos
   cobram a mais). A feature acrescentou o texto e o teto por produto — e o texto entrou na **chave da
   linha do carrinho**, senão duas gravações viram quantidade 2.

---

#### O que a execução expôs, e que vale registrar

- **A varredura de forma (`buttonShape`) e a de fronteira FSD pegaram duas coisas de verdade.** Os
  chips de material entraram na allowlist de pílula com motivo escrito (mesmo precedente da nuvem de
  categorias da busca); o teste que importava `widgets` de dentro de `entities` foi **partido em
  dois** — a prova da barra fixa mora em `widgets/product-buy-bar`, que é onde ela pertence.
- **Um `useMutation` dentro de um widget condicional obriga toda página que o monta a ter
  `QueryClientProvider`.** O `OrderMaterialBlock` chamava a mutação **antes** do `return null`, e
  isso derrubou 17 testes da confirmação de pedido que nunca precisaram de provider. O formulário
  virou componente próprio, e o bloco sai antes de qualquer hook de dados.
- **Dublê de hook que devolve objeto literal novo a cada render causa laço infinito** quando a página
  tem `useEffect([data])`. O teste da aba Material travou sem mensagem nenhuma até a referência ficar
  estável. Vale para qualquer teste de `AdminSettingsPage`.
- **`vi.hoisted` roda antes dos imports** — o corpo dele não pode ler constante importada.
- **`fireEvent.click` não troca aba do Radix**; é `mouseDown`.
- **O Postgres local segfaulta** com `set local role anon` + chamada a função `security definer`
  revogada — e **reproduz com a `claim_order_email`, que é anterior a esta feature**. É artefato do
  probe por `psql`, não do produto: pelo caminho real (PostgREST) as duas RPCs devolvem **401
  permission denied** e o banco não cai. Provado nas duas formas.

---

#### Pendências desta feature

- **O Verifier independente ainda não rodou** (autor ≠ verificador), e `22/validation.md` não existe.
  É o próximo passo, com checagem ancorada na spec e sensor de discriminação.
- **Os commits ainda não foram criados** — a árvore está suja de T1 a T21, pela convenção do projeto.
- **A curadoria do material é decisão da dona.** A semente inferiu do nome; a Adri revisa em
  `/admin/produtos`. Editar um produto grava `true`/`false` e tira a linha de `null` para sempre.
- **O endereço do ateliê está vazio** (`store_settings.material`). Enquanto estiver, a página "Como
  enviar" **não mostra endereço nenhum** — mostra o convite a falar pela loja. É de propósito:
  endereço pela metade é material insubstituível postado para lugar nenhum.

---

**Bloqueios conhecidos**:
- **Resend**: `send.umaestrelinha.com.br` não verificado (403 medido em 2026-08-08). SMTP do auth
  desligado de propósito, e-mail de dev no Mailpit. O `material_received` cai no Mailpit como os
  outros quatro.
- **71 commits locais sem push** (os desta sessão ainda não existem). O remoto `origin` está
  configurado (`github.com/rafaeldusantos/umaestrelinha`) e nenhuma branch remota é conhecida
  localmente.

**Curadoria pendente, que é decisão da dona e não código**: `show_in_menu = 0` nas 37 categorias,
então a barra do topo está vazia. São 4 vagas (`MENU_SLOT_LIMIT`), válidas em qualquer profundidade,
em `/admin/menu` (`admin@umaestrelinha.dev` / `admin123`, porta 8083).

**Backlog aberto**: `BL-007` (sitemap e dados estruturados), **`BL-008`** (o teto de 1.000 do
PostgREST em `fetchStatusCounts` — herdado, agora com um segundo consumidor), `BL-00Z` (endereço por
WhatsApp), mais os anteriores.

**Ambiente**: Supabase local de pé na faixa 54341–54349, catálogo real no banco (689 produtos · 3.356
variações · 37 categorias · 3.660 imagens no Storage). A migration `20260811120000` foi aplicada
**por `psql`**, não por `db reset`, para não destruir o catálogo importado — e registrada em
`supabase_migrations.schema_migrations`. Um `db reset` a reproduz do zero.

---

---

### ANTERIOR — 2026-08-09 · `23-urls-e-seo` **FECHADA** — foi este fecho que destravou a `22`

**Estado**: nada em andamento. Árvore limpa, gate verde, **9 commits** desta sessão — 7 da `23` mais 2
da reescrita da spec da `22`.

---

#### `23-urls-e-seo` — fechada e validada

No go-live o domínio passa a apontar para a loja nova, e **toda URL indexada quebrava** — não pelo
slug, que a `21` já preservava, mas pelo **caminho**. `AD-018` decidiu adotar o formato de produção.

| conteúdo | canônica agora | também resolve |
| --- | --- | --- |
| produto | `/produtos/:slug` | `/produto/:slug` — **301** |
| categoria raiz | `/:slug` | `/colecao/:slug`, `/categoria/:slug` — **301** |
| subcategoria | `/:pai/:filha` | `/:filha` — **200** com canonical para a de dois |

**Gate de fecho medido** (`turbo run test --force`, exit 0 capturado de verdade, nunca por `| tail`):

| | valor |
| --- | ---: |
| Testes | **3.672** em **211** arquivos |
| store · backoffice · core · functions · catalog-import | 1256/98 · 1090/67 · **799/27** · 258/4 · 269/15 |
| Lint | **30 erros / 8 warnings** — baseline exata, zero novo |
| Tipos | store **0** · backoffice **0** · catalog-import **0** |

`packages/core/src/payment/` **intocado**. Verifier independente: **8/8 ACs**, **13 mutações, 13
mortas**. Prova em navegador headless (`vite preview` + Chromium, 390×844 e 1440×900, catálogo real):
10 URLs, `overflow-x = 0` em todas — está em [`23/validation.md`](./features/23-urls-e-seo/validation.md).

**Contratos novos que valem para toda feature futura:**

- **`@estrelinha/core/routes` é a fonte única do endereçamento**: `ROUTE_SLUGS`, `INFRA_SLUGS`,
  `RESERVED_SLUGS`, `isReservedSlug`, `reservedSlugRefusal`, `productPath`, `categoryPath`,
  `LEGACY_REDIRECTS`, `legacyRedirectTo`. Módulo puro, sem dependência, para os guardas poderem
  importá-lo de dentro de um teste que lê arquivo do disco.
- **Rota nova de um segmento precisa entrar em `ROUTE_SLUGS`**, senão `reservedSlugs.test.ts` quebra —
  e é ele que impede a rota de encobrir uma categoria homônima. Vale já para
  `/como-enviar-o-material`, da `22`.
- **`categoryHref(categories, id)`** (`@estrelinha/core/menu`) é a única função que transforma
  categoria em URL canônica. No máximo dois segmentos, com o pai imediato.
- **`RelatedProducts`** recebe `category` + `categories`, não mais `categorySlug`.
- **`useProducts(slug, { enabled })`**, e slug desconhecido devolve `[]`, nunca o catálogo inteiro.
- **`category_redirects`** (migration `20260810120000`) espelha `product_redirects`. Escrita em
  `persistCategoryRedirect`, leitura em `useCategoryRedirect`.
- **Importador**: `CURATED_EXCLUDED` por `nuvemshop_id` — o catálogo passou de **39 para 37**
  categorias.

**O que ficou por medir, e está declarado**: o **301 por HTTP**. Não existe projeto Vercel da Uma
Estrelinha (`C-08`); o que está provado é a configuração, presa a `LEGACY_REDIRECTS` por guarda que lê
o `vercel.json` do disco, mais o espelho client-side. A virada de DNS é operação.

---

#### `22-material-afetivo` — spec reescrita, **zero pergunta aberta**, próximo passo é **Design**

As três perguntas bloqueantes foram respondidas pela Adri em 2026-08-09, e **medir o catálogo antes de
escrever derrubou duas suposições** que a primeira redação tinha como certas. As duas estão
registradas dentro da própria spec, na seção *O que a medição mudou* — não apagadas.

| | o que a spec dizia | o que o catálogo mostrou |
| --- | --- | --- |
| Material | a cliente escolhe na página do produto | **zero eixo de material** em 3.356 variações; o material está no NOME (169 leite · 127 cinzas · 85 cabelo · 51 coto). Uma peça exige **dois**. Virou propriedade do produto |
| Gravação | campo novo a construir | **já é eixo de variação** — 35 produtos, 626 variações, 3º maior do catálogo — e **33 dos 35 cobram a mais** (mediana R$ 42, até R$ 112) |

**Respostas da Adri, todas fechadas:**

1. As peças de um pedido **chegam juntas** ⇒ rastreio **por pedido**.
2. Peça de material livre: a escolha é **pelo WhatsApp**, fora da loja. A loja nunca pergunta.
3. Gravação é opção por produto, e **o limite de caracteres é editável no painel**.
4. Material chegando errado ou insuficiente: **não acontece** — sem estado extra.
5. A cliente informa o **rastreio da remessa dela** em `/pedido/:id`, **opcional**; a Adri também pode
   informar pelo painel (é o caso do WhatsApp).
6. Endereço de envio **na página de compra**. Mandar por WhatsApp virou `BL-00Z`.

**Três coisas que o Design precisa tratar e que não são óbvias:**

- **`orders` NÃO tem policy de `UPDATE` para cliente, de propósito** (PAY-10 — para ninguém adulterar
  `payment_status`). Então `MAT-11` **não é um `PATCH`**: é RPC `security definer` que escreve só o
  campo de rastreio, no molde de `apply_payment_approval` e `claim_order_email`.
- **"Exige material" e "quais materiais" são DOIS dados.** Lista vazia não pode significar "não
  exige" — é justamente a peça de material livre, que exige e entra na fila sem saber qual.
- **`material_enviado` é estado opcional**, então `aguardando_material → material_recebido` **direto**
  é transição obrigatória, não atalho.

**11 requisitos** (`MAT-01`..`MAT-11`), todos `Pending`. `MAT-11` é novo; `MAT-02`, `MAT-03`, `MAT-04`
e `MAT-06` mudaram de conteúdo mantendo o ID.

---

**Bloqueios conhecidos**:
- **Resend**: `send.umaestrelinha.com.br` não verificado (403 medido em 2026-08-08). SMTP do auth
  desligado de propósito, e-mail de dev no Mailpit. Pendência declarada pelo usuário — e a `22`
  acrescenta um tipo de e-mail (`material_received`), que vai cair no Mailpit como os outros.
- **71 commits locais sem push.** O remoto `origin` está configurado
  (`github.com/rafaeldusantos/umaestrelinha`) e nenhuma branch remota é conhecida localmente.

**Curadoria pendente, que é decisão da dona e não código**: `show_in_menu = 0` nas 37 categorias, então
a barra do topo está vazia. São 4 vagas (`MENU_SLOT_LIMIT`), válidas em qualquer profundidade, em
`/admin/menu` (`admin@umaestrelinha.dev` / `admin123`, porta 8083).

**Backlog aberto**: `BL-007` (sitemap e dados estruturados — o passo seguinte natural da `23`),
`BL-00Z` (endereço por WhatsApp), mais os anteriores.

**Ambiente**: Supabase local de pé na faixa 54341–54349, catálogo real no banco (689 produtos · 3.356
variações · **37 categorias** · 3.660 imagens no Storage).

---


### ANTERIOR — 2026-08-09 · `21-catalogo-nuvemshop` **FECHADA** + `BUG-20260809` corrigido

**Estado**: nada em andamento. Árvore limpa, gate verde, 8 commits da `21` + 2 do conserto do bug.

**O catálogo real está no banco**: 689 produtos · 3.356 variações · 39 categorias · 3.660 imagens no
Storage. Import idempotente (`pnpm --filter @estrelinha/catalog-import import`), exit 0, relatório
conferindo com o previsto. Os 689 slugs são idênticos aos da Nuvemshop.

**Gate medido no fecho** (`turbo run test --force`, exit 0 capturado de verdade):

| | valor |
| --- | ---: |
| Testes | **3.445** em 200 arquivos |
| store · backoffice · core · functions · catalog-import | 1153 · 1055 · **725** · 258 · 254 |
| Lint | 30 erros / 8 warnings — baseline, zero novos |
| Tipos | store 0 · backoffice 0 · catalog-import 0 |

`core` intacto: nem o import nem o conserto tocaram o código de dinheiro.

**Quatro defeitos que só a execução real expôs** (todos corrigidos e cobertos por teste): pool que não
cancelava na falha; blip de rede matando o import; **PostgREST truncando `select` em 1.000 linhas**, o
mais grave, que quebrava a idempotência na segunda execução; e `products.stock_total` nunca escrito,
deixando 60 produtos com estoque real como "Indisponível".

**Próximo passo recomendado**: **feature `23-urls-e-seo`** — Design → Tasks → Execute. Ela está
**destravada**: as duas perguntas abertas foram respondidas em 2026-08-09 e viraram `AD-018`. É
pré-requisito de go-live, e a `22` não é.

**Bloqueios conhecidos**:
- A **`22`** precisa de três respostas da Adri antes de implementar: rastreio do material por pedido
  ou por item, o enum de material, e o limite de caracteres da gravação.
- **Resend**: `send.umaestrelinha.com.br` não verificado (403 medido em 2026-08-08). SMTP do auth
  desligado de propósito, e-mail de dev no Mailpit. Pendência declarada pelo usuário.
- **62 commits locais sem push.** O remoto `origin` está configurado
  (`github.com/rafaeldusantos/umaestrelinha`) e nenhuma branch remota é conhecida localmente.

**Curadoria pendente, que é decisão da dona e não código**: `show_in_menu = 0` nas 39 categorias, então
a barra do topo está vazia. São 4 vagas (`MENU_SLOT_LIMIT`), válidas em qualquer profundidade, em
`/admin/menu` (`admin@umaestrelinha.dev` / `admin123`, porta 8083).

**Backlog aberto pela sessão**: peso da listagem de categoria (3,1 MB — e por que cortar
`description` degradaria a busca em silêncio) e as quatro consultas de catálogo que ainda engolem
erro (React Query guarda o vazio como sucesso e não repete a tentativa).

**Ambiente**: Supabase local de pé na faixa 54341–54349. `supabase_vector` em `Restarting` — condição
pré-existente, não introduzida por esta sessão.

### 2026-08-08 · `20-rebrand-uma-estrelinha` · **FASES 6 e 7 FECHADAS (T34–T41)**

O repositório deixou de ser a loja anterior **em todas as superfícies**: código, schema, ativos,
e-mail, copy e documentação. `AD-016` e `AD-017` são as decisões que governam isso.

**Números medidos no fecho** (`turbo run test --force`, exit 0 capturado de verdade):

| | valor |
| --- | --- |
| testes | **3188 em 185 arquivos** — store 1150/90 · backoffice 1055/65 · core **725/26** · functions 258/4 |
| lint | **30 err / 8 warn** (backoffice 28/7 · store 2/1) — baseline exata, zero erro novo |
| `tsc` | **0 · 0** |
| `turbo run build` | exit 0 |
| `supabase db reset` | exit 0, com probe |

**`@estrelinha/core` fechou em 725/26, exatamente como entrou na feature** — nenhum resultado de
dinheiro mudou em nenhuma das sete fases.

#### O que as duas fases entregaram

1. **`store_settings` deixou de mentir** (T34). O SQL já estava certo desde a T22b; o TypeScript ainda
   dizia o nome antigo. `storeSettingsDefaults.test.ts` lê as duas migrations do disco e compara campo
   a campo — mesma classe de defeito da paleta em dois arquivos, e igualmente invisível.
2. **`og:image` saiu do CDN do template original** (T35) e virou `public/og-image.png`, gerado do
   **lockup** por `_build-og.ps1`. É a única superfície do produto onde o degrau 1 da escada de marca
   cabe: piso de 600px de largura, card de 1200.
3. **Os cinco e-mails vestiram a identidade** (T36, T37) — três de auth e três transacionais, todos
   inline, em `<table>`, **sem webfont**, com Georgia no display e Helvetica/Arial no corpo.
4. **A varredura de marca fechou em ZERO** (T38), com a lista `PENDENTE` vazia. Junto foram as três
   pendências herdadas: os `aria-label` de busca, o texto de "Cuidados" (que ainda falava em alfinete e
   metal) e toda persona da loja anterior.
5. **O histórico foi arquivado, não apagado** (T39): 19 features, a árvore de QA, os docs de programa,
   a identidade v2 e o `DEPLOY.md` estão em `.specs/archive/nanita/`, com um README explicando o que
   ali ainda vale e o que não vale mais.
6. **`CLAUDE.md` e `DESIGN.md` foram reescritos** (T40, T41) contra o estado real do repositório —
   cada porta, cada chave de storage e cada razão de contraste foi conferida no fonte ou medida antes
   de ser escrita.

#### A decisão mais consequente do lote: o SMTP do auth ficou DESLIGADO

Probe contra a API do Resend, com a chave deste projeto, em 2026-08-08:

```
from acesso@send.umaestrelinha.com.br  →  403 "not authorized to send"
from acesso@send.<domínio anterior>    →  200
```

Trocar o remetente para um domínio não verificado derruba **todo** o login por código — já derrubou
uma vez (`BUG-20260728`). Manter o domínio da marca anterior assinando e-mail desta loja é pior. Com
o bloco `[auth.email.smtp]` **comentado**, o Mailpit local entrega e nenhuma das duas coisas acontece
— e é o que a própria spec pede no edge case "domínio ainda não verificado".

Provado de ponta a ponta depois de `supabase stop && supabase start`: `confirmation` (e-mail novo),
`magic_link` (e-mail existente) e `recovery` chegaram no Mailpit com a identidade nova, e os dois
`verifyOtp` devolveram sessão. O passo exato de troca (com o `curl` de verificação) está no
`config.toml` e no `.env.example`.

#### Três defeitos que os gates pegaram, e valem para a próxima feature

1. **`pnpm test` não é o mesmo juiz que `pnpm lint`.** A T34 fechou com a suíte verde e introduziu 3
   erros de lint (emoji em classe de caractere) que só apareceram no gate de build da T36. Task com
   gate `full` não cobre lint.
2. **Varredura de repositório estoura o timeout de 5s do vitest sob carga.** A `brandScan` lê 400+
   arquivos e ficou vermelha por lentidão, não por resíduo, com os quatro workspaces rodando em
   paralelo. Resolvido com memorização da leitura + limite próprio — **nenhuma asserção mudou**.
3. **Teste de copy não pode repetir a regex da marca.** Os dois arquivos novos da T38 se acusavam na
   própria varredura, e a saída fácil seria pô-los na allowlist — que os isentaria para sempre. Eles
   provam o que a `brandScan` não sabe ver: vocabulário e tom.

#### Pendências abertas (nenhuma bloqueia o desenvolvimento)

- **`send.umaestrelinha.com.br` não verificado no Resend** (`C-08`). Enquanto isso: SMTP do auth
  desligado, `RESEND_FROM` vazio, e-mail no Mailpit. Passo de troca documentado nos dois arquivos.
- **Sem projeto Supabase hospedado e sem projeto Vercel.** `AD-017` (reescrever migration) **continua
  válida até o primeiro `db push`** — e o `CLAUDE.md` manda apagar o parágrafo quando isso acontecer.
- **`BL-002`**: `pnpm lint` não olha `packages/`, e `payment/pricing.ts` — o código de dinheiro —
  nunca passa por ESLint.
- **Catálogo é o `seed.sql` de desenvolvimento** (7 categorias, 16 produtos, 24 variações).

#### Próximo passo

1. **Verifier independente** da feature 20 (autor ≠ verificador), com checagem ancorada na spec e
   sensor de discriminação, escrevendo `20-rebrand-uma-estrelinha/validation.md`.
2. **`21-catalogo-nuvemshop`** — importação one-shot do catálogo real, com imagens no Storage.
3. **`22-material-afetivo`** — página "Como enviar", campos por item e rastreio do material no pedido.
   É o que falta para a loja representar o que o negócio de fato faz.

### ANTERIOR — 2026-08-03 · `17-promocoes-desconto-progressivo` · **FEATURE FECHADA (24/24 tasks + 4 fixes, Verifier PASS)**

- **O que a feature resolveu.** O preço do kit era constante dentro de um componente da home, e
  qualquer desconto por quantidade calculado no front seria **exibido e não cobrado** —
  `mercado-pago` recalcula `unit_price` de `products.base_price` e descarta o valor do cliente. Agora o
  desconto por quantidade é **promoção cadastrada** (`/admin/promocoes`), a regra é pura em
  `@nanapin/core/payment/pricing`, e loja e servidor chamam **`resolveOrderPricing`** — o mesmo ponto.
  Ver `AD-015` acima e o bloco novo no `CLAUDE.md`.
- **Gate de fecho (MEDIDO pelo Verifier com `npx turbo test --force`, não por cache)**: core **759** ·
  store **841** · backoffice **997** · functions **251** = **2848** (+311 desde a 16) · `pnpm lint`
  **30 err / 9 warn** = baseline exata · `tsc` store **0** · backoffice **0**.
- **Sensor de discriminação: 7 mutações, 7 mortas, 0 sobreviventes** (na 2ª passada; 8/8 na 1ª).
  Inverter `perItemMin`, tirar o `Math.min` de `tierUnitPrice`, escolher a menor faixa, inverter a
  comparação promoção↔cupom, inverter a guarda de teto, ignorar a view de elegibilidade e contar
  produtos em vez de unidades — tudo morre em teste.

#### O bloqueador que o Verifier achou (e que a 18 não deve reintroduzir)

`useCheckoutTotals` montava `pricingItems` do **preço base** (`item.product.price`) enquanto a gaveta e
o servidor usavam o **preço da variação**. Com a guarda de teto nova isso virou **422
`promotion_no_longer_valid` em pagamento legítimo, reproduzível para sempre** — variação mais barata ⇒
desconto gravado maior que o recalculado. A divergência era anterior à feature (a loja já exibia e
gravava base em pedido com grade, e o e-mail mostrava R$ 50,00 numa linha de R$ 18,40); a 17 a tornou
bloqueante e a consertou nos quatro leitores. **O defeito está congelado por teste**
(`handlers.test.ts:1583`: valor derivado da base ⇒ 422 + zero chamada ao MP).
**Consequência de dado**: pedido com grade passa a persistir `subtotal` diferente do de antes.

#### O que mudou de contrato

- `Cupons` saiu de `Vendas` e nasceu o grupo **`Descontos`** (Cupons + Promoções) entre `Vendas` e
  `Catálogo`. `navItems.test.ts` agora **lê `app/App.tsx` do disco** e compara a ordem textual das
  rotas com `navGroups` — mover item de grupo sem reordenar rota quebra ali.
- `upsert_promotion` exige `name` em TODO payload (sem `coalesce`), e **chave ausente preserva**
  `tiers`/`category_ids` enquanto chave presente substitui (vazio = limpa). Pausar manda
  `{ id, name, active: false }`.
- Nunca chamar `set_kit_showcase` depois de um `upsert_promotion`: o upsert já desliga a vitrine
  anterior (o índice único parcial exige essa ordem). `useSetKitShowcase` segue **sem consumidor de
  UI** — trocar vitrine hoje exige abrir o editor.
- `orders.promotion_id` é `null` de propósito quando duas promoções aplicam ⇒ "teve promoção?" se
  pergunta por `promotion_discount > 0`.
- A view de elegibilidade usa `union` e não `union all`: com ciclo na árvore de categorias o `union
  all` **não termina**, e hoje um 2-ciclo é gravável.

#### Correções de spec durante a execução

- **`PRM-15` AC 1 foi emendada**: dizia "a linha de desconto **e o subtotal já descontado**", o que é
  contraditório — subtotal líquido ao lado de linha de desconto lê como desconto aplicado duas vezes.
  Passou a ser subtotal **cheio** + linha + total descontado, nas duas superfícies.
- **T24 não existia no plano.** A guarda de teto compara contra o que a loja grava na criação do
  pedido, e nenhuma task escrevia esse valor: `PRM-12` nasceu inerte e foi fechado por task nova.
- Três `SPEC_DEVIATION` aceitos, todos com medição no lugar: sem `paused_at` não se data a pausa por
  `updated_at`; índice único **parcial** não pode ser `DEFERRABLE`, então "uma statement" era
  impossível; e a métrica de pedidos com promoção usa `promotion_discount > 0`.

#### Estado do repositório neste fecho

- **Commit único**, por decisão do usuário nesta sessão (sobrepõe o commit-por-task da skill): a árvore
  ficou suja de T1 a T24 e o commit veio depois do Verifier passar. Sem checkpoint intermediário —
  se algo precisar ser desfeito, é manual.
- Lições destiladas: **L-013 … L-018** em `.specs/lessons.json`, todas como `candidate` (recorrência 1).

#### Próximo passo sugerido

- **Feature 18 — `Monte seu kit`**: os boards estão no Paper (página `Home`, quatro boards `17 · …`).
  Ela consome `promotions` marcada como `is_kit_showcase`, a view de elegibilidade e
  `resolveOrderPricing`; **não define preço nenhum**. Ler `context.md` da 17, seção "Fronteira com a 18".
- Cinco decisões de produto ficaram abertas no fecho: a faixa "Na loja vai aparecer" do board do editor
  (desenhada, sem AC, não implementada), o menu `⋯` do board contra o lápis+lixeira do código,
  `useSetKitShowcase` sem consumidor, e os itens `BL-002`/`BL-003` do `BACKLOG.md`.
- **Flakiness não identificada**: 1 em 7 rodadas forçadas deu `@nanapin/store` 1 failed / 840 passed,
  sem nome capturado; as outras 6 deram 841/841. Nenhum arquivo desta feature falhou em nenhuma. O
  suspeito é o timer do `input-otp` em `src/test/setup.ts`, **não confirmado**.

### Histórico — 2026-08-02 · `16-menu-navegacao-loja` · **FEATURE FECHADA (21/21 tasks, T1–T21)**

- **O bug não era futuro, era vivo.** Probe HTTP no banco local mostrou a árvore real
  `Bottons › {Academia, Anime, K-Pop, Filmes, Bandas, Games, Séries, Mangá, Kawaii}` — e como o
  `Header` fazia `.slice(0, 4)` de uma lista chapada ordenada por `sort_order`, **a barra do topo da
  loja dizia "Bottons · Academia · Anime · K-Pop"**: o contêiner de tudo mais uma filha que empatou em
  `sort_order = 0` com ele. A mesma lista alimentava a grade da home, o rodapé e a busca, e
  `/colecao/bottons` mostrava 4 produtos num catálogo de 32. Antes de ser "menu novo", a feature é **a
  loja aprender a ler a árvore que o backoffice já escreve** desde a `14`.
- **Coleções saiu do produto** (`AD-014`): `public.collections` nunca existiu em ambiente nenhum.
- **Gate de fecho (MEDIDO)**: `pnpm test` exit 0 — core **645** · store **759** · functions 232 ·
  backoffice **901** = **2537** (+122 na feature) · `tsc` store **0** · backoffice **0** · `pnpm lint`
  **30 err / 9 warn** contra baseline 33/9 — **3 a menos, zero novo**.
- **Prova visual** em 390×844 e 1440 contra os boards `1SF-0` e `1QB-0`, com Playwright e dados reais.
  `scrollWidth === clientWidth` em 390px.

#### Dois defeitos que só a prova visual pegou

1. **Dois botões de fechar** empilhados na folha mobile — o `SheetContent` do shadcn traz um X próprio
   de 16px no canto. Resolvido com a prop `hideClose`, que já existia, e guardado por asserção
   (`queryByRole('button', { name: 'Close' })` é nulo).
2. **O `Esc` do mega menu fechava e reabria no mesmo tique.** Devolver o foco à entrada dispara o
   `onFocus` dela, que abre o painel — com teclado era impossível fechar. Resolvido com uma trava de
   **um** evento (`ignoreNextFocus`). O teste de `Esc` falhava antes e passa depois: é ele a prova.

#### O que mudou de contrato

- `@nanapin/core/menu` é novo: `menuEntries`, `menuSlotRefusal`, `slotsUsed`, `resolvePromo`,
  `descendantIds`, `bySortOrder`, `ancestorsOf`, `pathLabel`, `MENU_SLOT_LIMIT`. 48 testes.
- `bySortOrder` **saiu** de `categoryTree.ts` e `categoryPaths.ts` **mudou de casa** para
  `entities/category/lib/` — havia **três** cópias da subida da árvore de pais nos dois apps, cada uma
  com o seu limite de profundidade (8, 5, 4) e a sua guarda de ciclo.
- `DbCategory` e `Category` ganharam `show_in_menu` e `menu_promo`; `Category` (loja) ganhou `active`,
  para o filtro não depender só da RLS (a policy `admin full categories` é `FOR ALL`, então admin
  logado **na loja** veria categoria oculta).
- `useAdminCategories` expõe `error` — falha de leitura deixou de ser indistinguível de "lista vazia",
  que foi o que fez Coleções parecer "sem conteúdo" por meses.
- `useProducts(slug)` faz **roll-up** da descendência. `useCategories` manteve a forma pública.
- `Header` perdeu o `AnimatePresence` de 80 linhas; o teste "o menu mobile abre a busca em tela cheia"
  **mudou de casa** para `MobileMenu.test.tsx` com a mesma asserção.

#### Correções de spec durante a execução

- **MENU-02 estava errada.** Dizia "somente categorias com `parent_id === null`" para a grade da home
  e o rodapé — o que, com o guarda-chuva "Bottons", entregaria **um tile só**. O repositório já sabia:
  `trendingCategories.ts` registra exatamente isso. A regra virou `browseCategories` ("uma raiz sozinha
  é contêiner, não escolha"), e as sugestões de busca saíram da AC: `SearchDropdown` usa as categorias
  para *matching* e a nuvem "Em alta agora" é deliberadamente **folha**.
- **`canEnterMenu` virou `menuSlotRefusal`** (`string | null`): `strictNullChecks: false` no
  `tsconfig.base.json` faz união discriminada por literal **booleano** não estreitar. Registrado em
  `CLAUDE.md` como dívida a evitar.

#### Próximo passo sugerido

Nada bloqueado. Candidatos, em ordem de valor: **(a)** o admin criar subcategorias de verdade — o menu
está pronto e vazio de hierarquia, então o painel desktop hoje mostra só "Em alta" + promo; **(b)** a
coluna "Por estilo" do board `1QB-0`, que ficou fora do V1 por exigir eixo transversal; **(c)**
"categoria automática" (conjunto por regra), o que sobrou de Coleções; **(d)** decidir o destino da
tabela `drops`.

---

### Histórico — 2026-08-01 · `14-catalogo-refinamentos` · **FEATURE FECHADA (16/16 tasks, T43–T58)**

- **Fase 3 (Categorias) completa**: T51 (artboard, aceito pelo usuário) → T52–T58 (implementação).
  Verificação independente em modo *standalone*:
  [`14/validation.md`](./features/14-catalogo-refinamentos/validation.md) — **PASS**, sensor
  **12 mutações / 12 killed / 0 survived**, árvore restaurada e suíte verde depois do sensor.
- **A T52 virou sete tasks** ao descobrir que `categories` não tinha `parent_id`, `banner_url` nem
  `color_accent` — ver `AD-012`. Toda criação e toda edição de categoria falhava com `PGRST204`
  **antes** desta feature; a árvore pai/filho era código morto.
- **Gate de fecho (MEDIDO)**: `pnpm test` exit 0 — core 500 · store 499 · functions 232 ·
  backoffice **803** = **2034** (a Fase 3 acrescentou **+79**) · `pnpm build` exit 0 · `pnpm lint`
  **35 err / 16 warn** (baseline era 36/16 — um a menos, zero novos) · `tsc` store **0** ·
  backoffice **0**.
- **O `tsc` pegou 1 erro que o build não pegou** (TS2352 na asserção do `select` montado em runtime).
  É a terceira vez que essa armadilha aparece; segue valendo: **build verde não prova tipo**.

#### O que mudou de contrato

- `useAdminCategories()` ganhou `updateCategoriesBatch`, `deleteCategoriesBatch` e `updateSortOrders`,
  e passou a expor `product_count` vindo da view. `categories` e `createCategory` seguem iguais — são
  o que `AdminProductFormPage` e `AdminProductsPage` consomem.
- Slice novo: `features/category-list` (domínio em `model/categoryTree.ts`, UI em `ui/`).
- `CategoryFormDialog` agora é **só criação**; a edição é o inspetor.

#### Próximo passo sugerido

Nada bloqueado. Candidatos: `Mesclar` como feature própria (com prévia do que muda), upload de capa
de categoria, e a faixa "Explore por tema" na loja — que é o que faria `Destacar na home` existir.

---

### 2026-08-01 · `13-product-bulk-ops` · **FEATURE FECHADA (5/5 tasks)** — e com ela o PROGRAMA

- **Fases 1 e 2 completas (T38 → T42).** Verificação independente em modo *standalone*:
  [`13/validation.md`](./features/13-product-bulk-ops/validation.md) — **PASS com lacunas
  declaradas**, sensor **13 mutações / 13 killed / 0 survived**, árvore restaurada e `git status`
  limpo.
- **O programa do catálogo (`AD-009`) está fechado**: `07` fundação+dinheiro · `11` formulário v2 ·
  `12` mídia e estúdio · `13` listagem, lote e limpeza. **`VAR-13` rodou**: `products.variants`,
  `sizes` e `finishes` não existem mais no banco nem no código.
- **Gate de fecho (MEDIDO)**: `pnpm test` exit 0 — core 500 · store **499** · functions 232 ·
  backoffice **677** = **1908** (a 13 acrescentou **+139**) · `pnpm build` exit 0 · `pnpm lint`
  **36 err / 16 warn**, idêntico à baseline · `tsc` store **0** · backoffice **4** ·
  `supabase db reset` com o workaround de dois passos: `categories 8 · products 32 ·
  product_variants 30`, e `information_schema` sem as três colunas legadas.

#### Três lacunas REAIS que sobraram (estão no `validation.md` com plano de conserto)

1. **Barra de massa incompleta** (PLS-05 AC 1). Entregues `Editar em massa` e `Limpar seleção`;
   faltam `Duplicar`, `Exportar` e `Excluir`. `Ativar`/`Pausar` existem dentro do painel.
   `Exportar` não tem formato definido em lugar nenhum da spec e `Excluir` em massa é destrutivo
   demais para inferir — as duas precisam de decisão de produto.
2. **Painel de massa sem Categorias e sem `Agendar`** (PLS-06 AC 6-7). `buildBulkPatch` implementa e
   **testa** os dois modos; o que falta é só a UI.
3. **Coluna `imagem` da grade rápida** (PLS-07 AC 3) não existe — seria um terceiro caminho de
   upload, com validação e progresso próprios.

#### Três defeitos reais que os TESTES pegaram (não a leitura)

1. **`async` devolvendo builder do `supabase-js` executa a consulta.** Ele é thenable; a promise o
   adota e o `await` do chamador recebe o resultado no lugar do builder. Conserto: `{ builder }`.
2. **O `Desfazer` do toast lia um `pending` velho** — o toast é montado no render anterior ao
   `capture`, então o closure via `null` e o desfazer não fazia nada, **calado**. O buffer passou a
   viver também num `ref`.
3. **`no-this-alias`** no dublê de canvas da 12, pego pelo gate de lint antes do fecho.

#### O que mudou de contrato

- `useAdminProducts()` continua trazendo o catálogo inteiro **para os seletores** (relacionados,
  compre junto, order bump, coleções). O caminho da listagem agora é **`useAdminProductList(query)`**
  — paginado, com `count` do servidor, `fetchAllFiltered()` (única leitura sem paginar, só sob
  pedido) e `createProductsBatch` / `updateProductsBatch`.
- `MaskedNumberInput` aceita `autoFocus` e `onBlur` (a edição inline precisa dos dois).
- Rota nova: `/admin/produtos/grade-rapida`.

#### Limitações declaradas na camada de dados

- **`Sem estoque` olha `products.stock_total`** — produto com grade tem saldo por variação, e o
  PostgREST não agrega recurso embutido para filtrar o pai. Pede uma **view no Postgres**; é a
  primeira coisa a trocar quando o catálogo misturar os dois modelos em escala.
- **As 7 contagens de visão são 7 requisições `head`**, uma vez por montagem.
- **`updateProductsBatch` faz um update por linha** (o PostgREST não expressa "update many com
  valores distintos"); o que se garante é **um** refetch.
- **As formas de consulta foram conferidas contra o PostgREST local** antes de escritas —
  `images=eq.[]`, `seo_title.eq.`, dois `or=` no mesmo request (o servidor combina com AND) e
  `product_variants!inner` para casar SKU. Vale repetir esse pre-flight em qualquer filtro novo.

#### Nota de flakiness (não é regressão)

`pnpm test` rodando as 4 suítes em paralelo acusou 6 falhas em suítes pesadas, todas com 5–7 s de
duração — **timeout por contenção de máquina**. Isoladas e numa segunda execução completa, todas
passam. Quem vir isso: rode por workspace antes de investigar.

---

### Histórico — 2026-08-01 · `12-product-media-studio` · **FEATURE FECHADA (5/5 tasks)**


- **Fase 1 (T33 → T37) completa.** Verificação independente em modo *standalone*:
  [`12/validation.md`](./features/12-product-media-studio/validation.md) — **PASS**, sensor de
  discriminação **8 mutações / 8 killed / 0 survived**, árvore restaurada e `git status` limpo.
- **Gate de fecho (MEDIDO)**: `pnpm test` exit 0 — core 500 · store **499** · functions 232 ·
  backoffice **538** = **1769** (a 12 acrescentou **+99**) · `pnpm build` exit 0 ·
  `pnpm lint` **36 err / 16 warn**, idêntico à baseline pós-11 · `tsc` store **0** · backoffice **4**
  (todos `import.meta.env`).
- **A `T42` da `13` está DESTRAVADA**: `07`, `11` e `12` estão as três fechadas (A25).

#### O que mudou de contrato (importa para a 13)

- `MockupStudioDialog` trocou `productImages: string[]` / `onGenerated(urls)` por
  `images: ProductImage[]` / `productName` / `onApply(next)`. O estúdio devolve a galeria **já
  aplicada** (anexar × substituir, 1ª como principal, alt-text), não uma lista de URLs.
- `uploadProductImage(file)` devolve `UploadOutcome` (`{ok:true,url}` | `{ok:false,failure}`) e
  existe `uploadProductImages(files, onProgress)` para o lote. `uploadImageBlob(blob, {maxDimension,
  format})` — a assinatura `Blob → url` foi preservada de propósito.
- `toImagePayload` (`features/product-form/lib/imagePayload.ts`) **ficou sem chamador** quando o
  estúdio passou a devolver a lista pronta. Módulo e 7 testes mantidos; a remoção é da T42.

#### Três decisões que valem o olho de quem continuar

1. **Recorte de imagem não existe.** A AC 1 de PMD-01 pede "ações de recorte e remoção", e a tabela
   *Out of Scope* da **mesma spec** exclui recorte no navegador. Contradição interna resolvida pela
   exclusão explícita — declarada no cabeçalho de `ImageGallery.tsx` e na nota 1 do `validation.md`.
2. **O seletor de saída do estúdio não podia ser decorativo.** Por isso `uploadImageBlob` ganhou
   `{maxDimension, format}`: sem isso, escolher "2000 px · PNG" gravaria WebP de 1600 px — a mesma
   classe de mentira entre tela e código que a feature existe para matar.
3. **`product_variants.image_url` é string, não FK.** A limpeza do ponteiro órfão acontece na
   **edição** (`clearMissingVariantImages`) e é tolerada na **leitura** (a galeria da loja cai na
   principal). Só um dos dois lados não bastava.

#### Dívida declarada, não escondida

- **Qualidade visual do composto segue sendo UAT manual** (A12). Canvas real não roda em node; o
  que os testes provam é o plano de render e a política de aplicação.
- **`Camadas` do palco**: `Fundo` e `Arte` aparecem como fixas (`sempre`), não como interruptores.
  São entradas obrigatórias de `composeMockup`, e a engine não podia ser tocada — um interruptor que
  não faz nada seria pior que a etiqueta honesta.
- **Duas lições registradas** (`L-008`, `L-009`) em `lessons.json`, ambas do mesmo tipo: spec que
  fixa texto/medida exata precisa de asserção inteira, e AC que briga com o *Out of Scope* da
  própria spec perde.

---

### Histórico — 2026-08-01 · `07-product-catalog-admin` · **FEATURE FECHADA (21/21 tasks)**

- **Fase 4 (T17 → T20) completa.** Verificação independente rodada em modo *standalone*:
  [`07/validation.md`](./features/07-product-catalog-admin/validation.md) — **PASS**, com sensor de
  discriminação **13 mutações / 13 killed / 0 survived** e md5 de todos os arquivos conferido.
- **Gate de fecho (MEDIDO)**: `pnpm test` exit 0 — core 477 · store **495** · functions 232 ·
  backoffice **118** = **1322** (Fase 4 acrescentou **+84**) · `pnpm build` exit 0 ·
  `pnpm lint` **37 err / 16 warn** (baseline era 41/16 — **4 a menos**, zero novo) ·
  `tsc` store **0** · backoffice **13**.
- **`11-product-form-v2` e `13-product-bulk-ops` estão DESTRAVADAS** e rodam em paralelo. A `12`
  continua esperando a `11` (esqueleto de 5 abas, T21).
- **Contrato de saída entregue**: `product_variants` estendida e populada · `products.options` /
  `stock_policy` / `production_lead_days` · `images` em `jsonb` com **os 12 leitores migrados** ·
  `product_categories` e `product_redirects` com RLS **e lidos pela loja** · tipos alinhados ·
  `@nanapin/core` com `media`, `formatters` e `pricing` · os 3 inputs mascarados em `shared/ui`.

#### Três consertos que a Fase 4 fez e não estavam na lista de nenhuma task

1. **Deriva de typecheck da Fase 3.** O `tsc` da store estava em **7** erros contra **1** na
   baseline: a T11 tornou `variantId`/`unitPrice` obrigatórios em `CartItem` e 6 construtores não
   acompanharam. Passou calado porque **`pnpm build` é `vite build` puro** e o gate da fase era
   build + test. Store agora em **0**.
2. **Colisão de nome tipando `CheckoutTotals.items` errado.** `entities/cart/index.ts` exportava
   `CartItem` **componente** e, via `export *`, `CartItem` **interface** — o valor sombreava o tipo,
   e `useCheckoutTotals.ts` acabou com `items` tipado como um componente React. O componente virou
   `CartItemRow` no barrel (os dois consumidores reais importam por caminho profundo).
3. **A guarda do checkout violava PST-10.** A T16 consultava só `product_variants`, então um produto
   com variação ativa **e `options` vazio** era marcado como "exige variação" — e a loja não mostra
   seletor para ele. A cliente veria "escolha o tamanho" sem ter como obedecer. A leitura agora é do
   **produto** e usa `hasSellableGrid`, a mesma regra da vitrine.

#### Desvios deliberados de escopo, todos declarados

- **Mapper único de produto** (`entities/product/lib/mapProduct.ts`). Havia **3 cópias** e a terceira
  (`useRecoverCart`) já divergia: não mapeava as dimensões de SHP-02, então carrinho recuperado
  cotava frete pelos fallbacks. Com a grade entrando no tipo, 3 cópias = esquecer a grade num
  caminho.
- **`ProductInfo`, não `ProductPage`.** A task listava a página, mas o CTA "Adicionar ao Carrinho"
  vive no `ProductInfo` — é lá que o seletor tem de entrar.
- **`alt` preservado no save do formulário.** A AC 4 pede só "payload `jsonb`"; o caminho curto
  satisfaria a AC **e apagaria o `alt` de todas as fotos** a cada save de preço. Foi adicionado um
  mapa `url → {alt, source}`. Regra extraída para `features/product-form/lib/imagePayload.ts`, com
  teste — o formulário de 500 linhas é escopo da `11`.
- **Stub de `IntersectionObserver`** em `src/test/setup.ts`: sem ele o `whileInView` do
  framer-motion derruba qualquer teste que renderize um `ProductCard`. Vizinho dos stubs de
  `matchMedia`/`ResizeObserver` que já estavam lá.

#### Achado de produto para a 11 ou a 12 (nenhuma AC cobre)

`ProductInfo.tsx` tem um bloco "Detalhes" com medidas **fixas em texto** —
`Tamanho: 3,8 cm de diâmetro`, `Material: metal com acabamento brilhante`. Com grade de 3 tamanhos e
2 acabamentos, esse texto agora **contradiz** o seletor logo acima. É conteúdo de página, não
requisito desta feature. Vale uma task.

#### Nota sobre o sensor de discriminação

O script reescreve os arquivos com `\n` e o Windows converte para `\r\n` — 6 dos 9 arquivos voltaram
com md5 diferente, **por EOL, não por conteúdo** (`git diff --ignore-cr-at-eol` mostra só as
mudanças da fase, e o repo tem `core.autocrlf=true`). Prova final: a suíte completa passa nos mesmos
1322 testes **depois** do sensor. Quem repetir isso em outra máquina: abra com `newline=''`.

---

### Histórico — 2026-08-01 · `07-product-catalog-admin` · Fases 1, 2 e 3

- **16 de 21 tasks feitas.** Falta só a **Fase 4 — Loja** (`T17` → `T18` → `T19` → `T20`): leitores de
  `images`, eixos genéricos na vitrine, categorias N:N e resolução de redirect.
- **Gate de fim de Fase 3 (MEDIDO)**: `pnpm test` exit 0 — functions **232** · core 477 · store **418** ·
  backoffice 111 = **1238** · `pnpm build` exit 0 · `pnpm lint` **41 err / 16 warn**, idêntico à
  baseline, zero problemas novos.
- **O caminho do dinheiro está fechado ponta a ponta**: carrinho chaveado por variação →
  `order_items` com `variant_id` + `price_source` + snapshot → `create-payment` resolvendo por
  `resolveItemPrice` → `apply_payment_approval` baixando da linha vendida.

#### Contexto que mudou tudo nesta fase

O usuário confirmou que **nada está em produção**. Isso destravou duas coisas que estavam paradas:

1. **A pendência de fixture da T2** foi resolvida pela opção (b): o `seed.sql` foi reescrito com grade
   real — 5 produtos com `options`, preço **crescente com o tamanho** (5,90 → 7,90 → 9,40), uma linha
   pausada por produto, e as três políticas de estoque. Preço uniforme não serviria: não distinguiria
   "cobrou pela variação" de "cobrou pelo `base_price`". Estado: 30 variações, 25 ativas, **0 ativas
   sem preço**.
2. **A flag `STRICT_VARIANT_PRICING` (T14) nasce LIGADA**, não desligada. Ela existia para cobrir a
   janela entre o deploy da function e o do bundle; sem aba aberta nem pedido pendente, o valor seguro
   é o estrito. Um default desligado seria cobrar `base_price` por uma variação de R$ 18,40, calado.
   Fica no código, documentada no `.env.example`, para o dia em que houver um segundo deploy.

#### Dois desvios deliberados do plano, ambos para evitar regressão

- **`cartStore` (T11)**: o design sugeria `itemKey = variantId ?? productId`. Sem variação a chave caiu
  em `produto + size + finish`, porque até a **T18** o `ProductCard` adiciona sem `variantId` — chavear
  só pelo produto fundiria dois tamanhos numa linha. Há teste.
- **Guarda do checkout (T16)**: precisou de uma **consulta** a `product_variants`, não prevista na task.
  O tipo `Product` do front não carrega a grade (só na T18), então "este produto exige variação?" não é
  respondível a partir do item do carrinho. A leitura falhar **não** bloqueia a venda — o servidor ainda
  barra com 422.

#### Nota sobre asserções estritas

Três suítes quebraram alto ao ver campos novos em payloads (`orders`, `order_items`), e em todas o
comentário do próprio teste declarava a rigidez (*"toEqual estrito no update: uma coluna extra
quebra"*). **A rigidez estava certa e pegou as mudanças.** Foram estendidas com os valores novos —
derivados dos comentários de cada cenário, ex. `3 × 4,90 + 2,45 = 17,15` — nunca afrouxadas para
`toMatchObject`.

#### Localização real do código de pagamento

As tasks T12–T14 apontam `supabase/functions/mercado-pago/index.ts`. Desde o `AD-004` (feature 09) o
`index.ts` é só wiring e a lógica com deps injetadas vive em **`handlers.ts`** — foi lá. Mesma deriva
que já corrigi no `design.md` na Fase 1.

---

### Histórico — Fases 1 e 2

- **Feature / Fase**: `07-product-catalog-admin` — **Fase 1** (Schema e tipos: T1–T6) e **Fase 2**
  (Núcleo puro e primitivos: T7, T8, T9, T10, T27) **completas**. Um commit por task, cada um com
  gate próprio verde antes de commitar. **11 de 21 tasks feitas.**
- **Próximo**: **Fase 3 — Caminho do dinheiro** (`T11` → `T12` → `T13` → `T14` → `T15` → `T16`). É a
  fase com risco financeiro: `cartStore` v2, `create-payment` por `price_source`,
  `apply_payment_approval` por variação, `CheckoutPage`. Tudo de que ela precisa já existe —
  `resolveItemPrice` (T9) é literalmente a função que o servidor vai rodar.
- **Gate de fim de Fase 2 (MEDIDO)**: `pnpm test` exit 0 — functions 222 · core **477** · store 385 ·
  backoffice **111** = **1195** · `pnpm build` exit 0 · `pnpm lint` **41 err / 16 warn**, idêntico à
  baseline, **zero** problemas novos.
- **Fase 2 acrescentou 193 testes**: `normalizeImages` 26 · máscaras 74 · `resolveItemPrice` e cia. 36 ·
  grade 31 · inputs 26.
- **Três achados durante a Fase 2**, todos corrigidos e registrados nos commits:
  1. **T8 estava parcialmente feita** — "transformar `formatters.ts` em diretório" já tinha acontecido
     na feature 10. Só as máscaras novas faltavam.
  2. **Dois testes meus nasceram errados** e foram corrigidos, não contornados: afirmei que
     `0.018 * 1000` daria `18.000000000000004` (não dá, em nenhum peso real do catálogo) e esperei NBSP
     no sufixo `cm` (ali o separador é espaço comum; o NBSP só aparece onde o `Intl` o emite).
  3. **O SKU do desenho usa DUAS regras diferentes** — prefixo aperta consoantes (`sailor` → `SLR`),
     valor usa primeiras letras (`Brilhante` → `BRI`). Minha primeira versão apertou os dois e produziu
     `BRL`. O exemplo `SLR-45-BRI` do design é o dado que revelou isso.
- **Nota de nomenclatura**: agora existem `@nanapin/core/pricing` (quanto custa **esta linha**) e
  `@nanapin/core/payment/pricing` (quanto dá o **pedido inteiro**). É confuso de propósito evitável, mas
  renomear ripplaria em T12, T28 e T39. O cabeçalho de cada um explicita a divisão.
- **Baselines corrigidas nesta sessão** (estavam defasadas e levariam o próximo a conclusão errada):
  - **lint**: documentado 28/7 → **medido 41/16**. A deriva veio das features 09/10, não da 07.
  - **typecheck**: `pnpm build` **não** checa tipos (`vite build` puro). Baseline real por
    `tsc --noEmit -p apps/<app>/tsconfig.app.json`: store 1 · backoffice 4. **Atenção ao
    `tsconfig.app.json`** — o `tsconfig.json` de cada app é solution-style e compila zero arquivo,
    o que faz `tsc -p tsconfig.json` reportar 0 erros e parecer sucesso.
- **12 erros de tipo abertos DE PROPÓSITO** pela T6, e são entregável, não dívida: são o mapa dos
  leitores que a **T17** (`VAR-11`) vai migrar — `VariantsTable.tsx` (9), `AdminProductsPage.tsx` (1),
  `AdminProductFormPage.tsx` (1), `AdminCollectionsPage.tsx` (1).
  **Caveat**: a loja acusou **0** erros novos e isso **não** significa que está ilesa — ela lê o tipo
  `Product` (frontend), que segue com `images: string[]`, e o mapeamento é frouxo o bastante
  (`strict: false`) para esconder. Os 7 pontos da loja listados em `P1.1b AC 2` continuam valendo.
- **`seed.sql` foi alterado duas vezes, e não por escolha** — as migrations T3 e T4 são destrutivas e o
  seed **escreve** nas colunas afetadas. Sem isso o catálogo local zerava e o gate de toda task
  seguinte quebrava. Agora ele grava `images` como `jsonb` (com `alt` preenchido) e popula
  `product_categories`.
- **PENDÊNCIA DE FIXTURE, aguardando decisão** (não bloqueia a Fase 2): as 10 variações que o seed cria
  nascem `is_active = true` sem preço, deixando **5 produtos com variação ativa e `options` vazio**. Não
  é defeito de migration — o seed roda **depois** das migrations, então o backfill não as alcança; em
  base real as legadas vêm antes e são normalizadas. `PST-10` (Fase 3) trata em runtime. Opções: (a)
  seed cria pausadas, (b) seed ganha grade completa com preço e `options` — fixture bem melhor para
  desenvolver a grade da `11` —, ou (c) fica assim. **Detalhado no `tasks.md` da 07, sob a T2.**
- **Dois bugs pré-existentes registrados** em `docs/qa/bugs/`, ambos do mesmo `db reset` e independentes
  entre si: `BUG-20260801-seed-temp-table-quebra-db-reset` (TEMP TABLE não sobrevive ao envio em lotes
  do CLI — por isso o gate SQL virou dois passos) e
  `BUG-20260801-grants-do-schema-public-nao-versionados` (anon sem DML em todo o `public`; mascara
  verificação de RLS e é o 401 conhecido da loja local).
- **Ambiente**: CLI do Supabase instalado como devDependency da raiz (`supabase@2.110.0`) — não havia
  binário na máquina. `supabase_vector` segue em `Restarting`, condição pré-existente e inalterada.
- **Uncommitted**: nada além de `x.png` (PNG solto na raiz, de 27/jul, aparenta ser lixo — **não
  removido**, é decisão do usuário).
- **Branch**: `feat/checkout-one-page`

### Histórico — 2026-07-31 · fatiamento do catálogo (planejamento, sem código) · **COMMITADO**

- **O que foi feito**: validação dos 9 artboards do Paper (página **Backoffice - Produtos**) contra o
  código — **22 de 22 melhorias confirmadas** — e execução do fatiamento decidido em `AD-009`.
- **Estado**: `07-product-catalog-admin` **encolhida** para fundação+dinheiro; criadas
  `11-product-form-v2`, `12-product-media-studio` e `13-product-bulk-ops`. Cada uma com `spec.md`,
  `design.md` e `tasks.md`; o `context.md` do `07` virou **contexto de programa**, referenciado pelas
  outras três em vez de copiado.
- **Fechamento conferido por script**: 55 requisitos e 42 tasks distribuídos, **sem perda e sem
  duplicata** — cada ID e cada número de task aparece exatamente uma vez no programa. A numeração
  original foi **preservada** de propósito (por isso os números não são contíguos dentro de cada feature).
- **Ordem de execução**: `07` → (`11` ‖ `13`) → `12`. A `12` espera a `11` (esqueleto de 5 abas).
  **`T42` (remoção das colunas legadas) é a única task com barreira sobre features paralelas**: exige
  `07`, `11` **e** `12` fechadas — declarada no topo de `13/tasks.md` e em A25.
- **Três correções de rota feitas durante o fatiamento** (todas registradas):
  1. `AD-010` — `T27` (inputs mascarados) migrou para a `07` e de `features/product-form/ui/inputs/`
     para `shared/ui/inputs/`. Sem isso a `13` esperaria uma task no meio do formulário, e os slices da
     `13` fariam cross-import de camada.
  2. `AD-011` — só os **dois** botões rotulados "com IA" (descrição e SEO) ficam fora de escopo; o
     alt-text **fica dentro**, como template determinístico.
  3. Referência desatualizada corrigida em `07/design.md`: a spec original apontava
     `mercado-pago/index.ts:6-12`, mas desde `AD-004` a lógica vive em `handlers.ts` (o recálculo de
     preço a reescrever está em `handlers.ts:317-327`).
- **Lacuna de produto ainda aberta**: os artboards *aba Geral* e *aba SEO* mostram "Sugerir com IA" e
  "Gerar com IA" que **nenhuma** feature implementa. O Paper **não foi alterado** — mexer no desenho é
  decisão de produto. Se a decisão for remover, é uma edição de artboard; se for implementar, é feature
  nova (provedor, chave, custo, latência no save, fallback).
- **Nada de código foi tocado nesta sessão** — só `.specs/`.
- **Próximo passo**: os commits pendentes abaixo (09 e 10) continuam sendo o bloqueio anterior; o
  fatiamento acrescenta um terceiro conjunto (`.specs/features/{07,11,12,13}-*` + `.specs/STATE.md`).
  Depois disso, Execute da `07`.

### Pendência anterior (feature 10) — inalterada

- **Feature**: `10-emails-transacionais` (`.specs/features/10-emails-transacionais/`)
- **Phase / Task**: Execute — **T1-T11 fechadas**. Verificacao independente rodada (modo *standalone*,
  ver a limitacao declarada em `validation.md`): **PASS**. Falta so **commitar** e executar o **roteiro
  manual do T11**, que exige credencial real do Resend
- **Completed**: Specify, Design, Tasks; T1-T11; sensor de discriminacao **17 mutacoes / 17 killed /
  0 survived**, com `md5` de todos os 7 arquivos conferido restaurado
- **In-progress** (file:line): nenhum
- **Gate baseline (MEDIDO)**: `pnpm turbo run test --force` exit 0 - functions **222** / core **310** /
  backoffice **85** / store **385** = **1.002**. `pnpm build` exit 0. `pnpm lint` fora do gate (divida
  pre-existente). `deno check` **nao executado**: Deno nao instalado nesta maquina - compensado pelo
  probe de boot no edge runtime real
- **ATENCAO, deriva de baseline**: o handoff da 09 registra `818` (functions 81 / store 372), mas o
  medido **antes de qualquer alteracao da 10** era functions **93** / store **384** (md5 de
  `handlers.test.ts` conferido intocado no T3). A divergencia e de bookkeeping da 09 nao-commitada, nao
  regressao. Os numeros acima sao os medidos
- **Next step**: **commitar**. Dois conjuntos, nao um: (1) os **5 commits da 09** que o handoff anterior
  ja pedia, (2) os **9 commits da 10** listados em `10-emails-transacionais/tasks.md`. Misturar deixa o
  diff ilegivel. Depois: executar o roteiro manual do T11
- **Blockers**: nenhum para codigo. Para o roteiro do T11: `RESEND_API_KEY` no `.env` da raiz +
  `RESEND_DEV_REDIRECT_TO` = o e-mail **dono da conta Resend** (o remetente `onboarding@resend.dev` so
  entrega para ele; qualquer outro destinatario volta 403). Depois, `supabase stop && supabase start`
- **Duas assumptions ainda ABERTAS**, declaradas na spec e nao fingidas: o **codigo HTTP do sucesso** do
  Resend e a **shape do JSON de erro** - a documentacao nao traz nenhum dos dois. O codigo aceita
  qualquer 2xx e le `name` defensivamente; o roteiro do T11 mede os valores reais
- **Nao verificado em runtime**: a coercao do enum `app_role` em `rpc('has_role', { _role: 'admin' })`
  via PostgREST. Se falhar, a function **fecha o acesso** (403 + log `admin_check_failed`) - falha
  segura, mas o e-mail de "enviado" nao sairia. Item 5 do roteiro
- **Bug pre-existente EXPOSTO por esta feature**: `'separating'` viola o CHECK de `orders.status` e o
  erro era engolido. A UX-02 fez o erro aparecer, entao agora e visivel. Registrado em
  `docs/qa/bugs/BUG-20260730-separating-viola-check-do-banco.md`; o conserto (migration ou remover da
  UI) e decisao de produto e ficou **fora de escopo**
- **Ambiente**: `supabase_vector` esta em `Restarting` - condicao **pre-existente**, observada antes do
  primeiro comando desta sessao e inalterada
- **Uncommitted files (10)**: `.specs/features/10-emails-transacionais/*`, `.specs/STATE.md`,
  `supabase/functions/send-email/*`, `supabase/functions/_shared/testing/*`,
  `supabase/functions/mercado-pago/{handlers.ts,index.ts,__tests__/*}`,
  `supabase/migrations/20260730120000_order_emails.sql`, `supabase/config.toml`,
  `packages/core/{package.json,src/formatters/*}` (o antigo `src/formatters.ts` foi **removido**),
  `apps/backoffice/src/entities/order/api/*`,
  `apps/backoffice/src/features/order-management/ui/OrderDetailDialog.tsx*`,
  `apps/store/src/pages/OrderConfirmationPage.tsx` + seu teste, `CLAUDE.md`, `.env.example`,
  `docs/qa/bugs/BUG-20260730-*.md`, `docs/qa/charters/CH-primeira-compra-desconfiada.md`,
  `.specs/features/08-checkout-one-page/spec.md`
- **Branch**: `feat/checkout-one-page`
