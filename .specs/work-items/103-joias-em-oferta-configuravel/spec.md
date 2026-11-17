# 103 · Joias em oferta configurável — título, descrição, campanha e peças escolhidas no bloco da Home

Costura de 2026-11-16. PRD r1.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Critérios de aceite: `prd.md`, ao lado. Convenção de cada repositório: o arquivo de instruções dele.

## Escopo

| UC    | Título | Origem |
| ----- | ------ | ------ |
| UC-01 | Escrever o título e a descrição do bloco | caso de uso do PRD |
| UC-02 | Escolher a campanha do bloco | caso de uso do PRD |
| UC-03 | Escolher as peças da campanha | caso de uso do PRD |
| UC-04 | Peça escolhida que deixa de valer | caso de uso do PRD |
| UC-05 | Conferir na prévia | caso de uso do PRD |
| UC-06 | A loja só mostra campanha em vigência, também para quem é admin | caso de uso do PRD |

RNF-01..RNF-08 do `prd.md` valem para todas as telas.

**Achados de eval que este Work Item resolve**

`nada` — o repositório não tem relatório de avaliação local (`.specs/evals/` não existe), e o Work Item não vem de achado de eval.

**Anexos consultados**

| Anexo | Tipo | O que se tirou | Alimenta |
| ----- | ---- | -------------- | -------- |
| `.specs/work-items/102-desconto-de-campanha/` (`prd.md`, `spec.md`) | WI de origem | H-10 e I-10 da 102 (bloco único, sem campos, título = nome da campanha) são superados por este WI; I-02 (peça só é "de campanha" quando a campanha baixa o preço) continua valendo | UC-01, UC-02, UC-04 |
| `apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx` | código | o editor sem campo de hoje e o comentário "segundo dono do nome da campanha" que se reescreve | UC-01..UC-03 |
| `packages/core/src/home/campaignOffers.ts` | código | as frases do bloco e os cartões de percentual; `CAMPAIGN_OFFERS_PIECES = 4` (o automático) | UC-01, UC-03, UC-04 |
| `apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx`, `model/useCampaignOfferProducts.ts` | código | o bloco na loja: selo acima, nome como título, frase dos percentuais, as 4 primeiras peças | UC-01..UC-04 |
| `supabase/migrations/20261130140000_102-joias-em-oferta-na-home.sql` | código | o índice `home_sections_unique_types_idx` com `campaign_offers` | UC-02 |
| `supabase/migrations/20261130120000_102-campanhas.sql` | código | exclusão de vigências entre ativas (`:42-43`), policy pública de vigência (`:244-248`, `:270-277`) e as de admin `for all` (`:250-255`, `:279-284`) | UC-02, UC-06 |
| Claude Design `Black Friday - Home.html` (projeto `4abe021d-…`) | link de design da 102 | não lido: o servidor MCP `claude-design` recusa o login (FIRST_PARTY_AUTH_REJECTED) | — |
| https://claude.ai/artifact/SQehnBNiiQmbnjkY3QQpbq | protótipo informado pelo humano em 2026-11-16 | lido (pacote exportado do Claude Design, decodificado sem execução): "Painel — Campanhas, faixa de avisos e perfil de estilo". Não tem a tela do bloco "Joias em oferta" nem `/admin/home`; a única menção é a dica do campo nome da campanha: "Aparece no título da vitrine (/ofertas) e no bloco de ofertas da Home." (comportamento da 102, superado pelo título configurável com recuo). Padrões aproveitáveis: contador "n / teto" ao lado do rótulo, recusa com ícone de alerta abaixo do campo, lista ordenada com subir/descer/tirar | UC-01, UC-03 (padrões) |

## Fora do escopo

- Mudar o cadastro de campanhas, o selo, os preços, a vitrine `/ofertas` ou o cupom.
- Escolher peça que não está marcada na campanha.

## Design

Fontes:
- Claude Design `Black Friday - Home.html` (link da seção "Expectativas de UI/UX" do PRD e de `item.md` › Insumos) — inacessível nesta sessão (MCP `claude-design` sem login). Decidido seguir sem ela (registrado na retomada de 2026-11-14 do `item.md`, por delegação do humano).
- https://claude.ai/artifact/SQehnBNiiQmbnjkY3QQpbq (informado pelo humano em 2026-11-16, `item.md` › Insumos) — lido; não tem as telas do escopo (D-01).

Referência do bloco na loja: o componente já construído e com QA na 102 (`apps/store/src/widgets/campaign-offers/`). Molde do editor: o editor de "Produtos em destaque" (`FeaturedProductsEditor.tsx`, FormCards Conteúdo e Peças escolhidas), mais o contador `CharCounter` (`CategoryListEditor.tsx`).

### Editor do bloco (painel, `/admin/home`)
Não há protótipo. Comportamento pelo PRD e pelo molde: FormCard **Conteúdo** (Título, até 60, com contador; Descrição, até 160, com contador; recuo dito na dica: vazio usa o nome da campanha / a frase dos percentuais); FormCard **Campanha** (seletor com rótulo; opções em vigência + agendadas na ordem do início, com estado e vigência; a atual aparece mesmo encerrada/desligada, com o estado; campanha de outro bloco desabilitada com "posição e título" do outro bloco; avisos: sem campanha, agendada — "a prévia só mostra o bloco a partir do início" —, fora de vigência); FormCard **Peças escolhidas** (busca restrita às marcadas; sem campanha, indisponível com o motivo; lista arrastável com posição, nome, remover; teto 12; avisos de peças que saíram da campanha, do ar ou que a campanha não barateia). Estados: leitura das marcações carregando / falhou ("não conseguiu conferir a campanha", nenhuma peça sai).

### Linha do bloco (painel, lista da Home)
Resumo com a campanha e o estado; motivo de não aparecer (sem campanha, agendada, encerrada, desligada); peças que não aparecem.

### Bloco na loja (Home)
Igual ao de hoje (selo acima do título, cartões de percentual, "Ver todas"), com título e descrição configurados (recuo), aparecendo só quando a campanha escolhida é a vigente, e a fileira das peças escolhidas na ordem, em fita que rola (celular e computador, com setas), esqueleto por peça escolhida.

Divergências entre fontes: nada — só uma fonte foi lida, e ela não cobre as telas.

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103 (monorepo)

- **Instruções** — `CLAUDE.md` › Layout do monorepo, Feature-Sliced Design, O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy · `apps/backoffice/CLAUDE.md` › Molde dos formulários, `/admin/home` — a composição, Editor de "Produtos em destaque", A busca de produto: um dono, Gravar NÃO desmonta a tela (VIV-05), A ponte da prévia · `apps/store/CLAUDE.md` › Mobile, a exceção `/ofertas`, A Home é dado, Produtos em destaque / ProductCarousel, Modo prévia · `packages/core/CLAUDE.md` (inteiro) · `supabase/CLAUDE.md` › Migrations, RLS — o molde.
- **Recorte** — UC-01..UC-06 e RNF-01..RNF-08 (todos).

- **O que já serve**
  - Título e descrição no `config` jsonb sem migration: `packages/core/src/home/types.ts:139-142` (`title`, `subtitle`).
  - Peças em `home_section_items.product_id` (FK `set null`, `position`, `label_snapshot`): migration 24; FKs guardadas em `homeSections.test.ts:428-450`.
  - Curadoria = presença de itens; sem item, o automático: `core/home/resolve.ts:163-180`, `types.ts:169-177`.
  - `curateSection` (`useAdminHomeSections.ts › curateSection`, 288-333) e `toNewItems` (`sectionDraft.ts › toNewItems`, 93-94; 8 colunas).
  - `ProductPicker` (`features/home-composition/ui/ProductPicker.tsx:24-51`) sobre `ProductSearchField`; `selecionados` desabilita com "já está no bloco" (`ProductSearchField.tsx:52-59`, `:305-311`).
  - Campanhas do painel: `entities/campaign/api/campaignRead.ts › fetchCampaigns/useCampaigns` (16-34); em vigência + agendadas na ordem do início: `entities/campaign/model/campaign.ts › campaignsOpenForMarking` (37-44), `useCampaignsOpenForMarking` (37-40).
  - Estado da campanha: `core/campaigns/status.ts › campaignStatus`, `CAMPAIGN_STATUS_LABELS` (12-27); `CampaignStatusPill` (`entities/campaign/index.ts:11`); `core/campaigns/text.ts › campaignStatusLine`, `campaignPeriodLabel`.
  - Uma campanha ligada em vigência por vez: `102-campanhas.sql:42-43`.
  - Leitura de produto por id com campanha mapeada: `apps/store/src/entities/product/api/useProductsByIds.ts:24-51`; `mapProduct.ts › mapDbToProduct`.
  - Filtro "esta campanha barateia" no automático: `useCampaignOfferProducts.ts:46`.
  - Fileira escolhida pela dona: `widgets/featured-products/ui/FeaturedProducts.tsx:27-58`; `ProductCarousel` `layout="slider"` (`apps/store/CLAUDE.md` › ProductCarousel).
  - "Está no ar?" nas duas pontas: `useResolvedHome.ts:100-115`; `useAdminResolvedHome.ts:124-142`.
  - Cartões, "Ver todas", `null` sem campanha: `CampaignOffers.tsx:47-50`, `:69-91`; `core/home/campaignOffers.ts › campaignPercentCards` (43-50).
  - Selo acima do título: `CampaignOffers.tsx:58` (`badge_text`); recuos: `campaignOffersIntro` (35-36), nome em `CampaignOffers.tsx:63`.
  - Recibo "Salvo" sem desmontar a prévia: `AdminHomePage.tsx:206-227` (`marcarSalvo`); falha mantém rascunho: `HomeSectionEditor.tsx:100-114`; recusa em `role="alert"`: `HomeSectionEditor.tsx:104-107`, `:139-148`.
  - `shared/ui/CharCounter.tsx` (usado em `CategoryListEditor.tsx`).
  - Ponte da prévia: `core/home/preview.ts:58-63`, `:137-163`; `apps/store/src/entities/home/model/useHomePreview.ts:64-88`.
  - Functions leem campanha com service role e `isCampaignLive` (`supabase/functions/_shared/campaigns.ts:34-45`): preço cobrado fora do alcance do UC-06; página servida usa a chave publicável sem sessão (`apps/store/server/page.ts`).

- **O que muda**
  - `campaign_offers` deixa de ser único: `core/home/catalog.ts:37-47` (`UNIQUE_SECTION_TYPES`); índice `home_sections_unique_types_idx` recriado sem ele (molde `20261130140000:53-59`, drop antes do create). A bandeja (`HomeBlockTray.tsx:41-56`, via `core/home/refusals.ts › uniqueTypeRefusal`) passa a oferecer o segundo bloco sozinha.
  - `createSection` (`useAdminHomeSections.ts:168-180`) já grava `config: {}` desligado; o bloco nasce sem campanha (nulo).
  - Gravação: `updateSectionConfig` (`useAdminHomeSections.ts:183-190`, chamado em `AdminHomePage.tsx:206-216`) passa a gravar `{ config, campaign_id }` antes de `curateSection`; `23505` do índice novo → a frase de CA-02.6.
  - Mapeadores: `useAdminHomeSections.ts › mapSection` (88-95), `apps/store/src/entities/home/api/useHomeSections.ts › mapSection` (63-70), `core/home/types.ts › HomeSection` (242-251), `packages/supabase/src/types/home.ts › DbHomeSection` (68-76) ganham `campaign_id` (nulo). O `select('*…')` já traz a coluna.
  - Doc "referência só em itens" (`core/home/types.ts:93-96`, `packages/supabase/src/types/home.ts:63-66`) e doc "sem campos, único" (`types.ts:40-45`, `catalog.ts:44-45`, `campaignOffers.ts:1-8`, `CampaignOffers.tsx:14-28`, `sectionRenderers.tsx:83-84`, `sectionEditors.tsx:100`, `HomeSectionRow.tsx:122-125`) se reescrevem.
  - `CampaignOffersEditor.tsx:1-29` reescrito no molde do `FeaturedProductsEditor`.
  - Registro do editor: `sectionEditors.tsx:100-101`; `refusal?: (config, items)` (`:70-79`) e `SectionEditorProps` (`:58-68`) passam a receber a campanha do rascunho e as outras seções.
  - Rascunho: `HomeSectionEditor.tsx:27-30`, `:84-88`; `sectionDraft.ts › draftChanged/itemsChanged` (102-108), `applyDraft` (121-158) levam a campanha.
  - Linha: `HomeSectionRow.tsx:122-125` (resumo), `:206` (`avisoDeAusencia` de `hiddenReason`); `EMPTY_SOURCE_REASON.campaign_offers = ''` (`core/home/resolve.ts:124`). Assinatura de linha recém-salva: `HomeSectionList.tsx:93-99` inclui `campaign_id`.
  - Busca: `ProductSearchField.tsx:38-112` (props), `:142-159` (`buscarProdutos` + `disponiveis`); `core/product-search/search.ts › OpcoesDaBusca` (70-73) ganha recorte por ids, aplicado também ao denominador.
  - Renderizador: `sectionRenderers.tsx:85` passa `section` e `items`.
  - Widget: `CampaignOffers.tsx:44-47` (qualquer vigente), `:63`, `:66`; fileira: `useCampaignOfferProducts.ts:32-49`, `CampaignOffers.tsx:96-106` (sem `layout`, `skeletonCount={4}`).
  - `campaign_offers` fora de `SOURCE_DRIVEN` (`resolve.ts:84-96`).
  - UC-06: `apps/store/src/entities/campaign/api/useLiveCampaign.ts › toLiveCampaign` (25-45), `liveCampaignQueryOptions` (47-56); `mapProduct.ts › PRODUCT_CAMPAIGNS_EMBED` (55-56) usado em `PRODUCT_SELECT` (`:68`) e no enxuto (`:161`), `toProductCampaign` (212-232); `useOfferProducts.ts:18`, `:21`, `:37` (`oferta:product_campaigns!inner(campaign_id)`). Consumidores alcançados: `CampaignOffers.tsx:44`, `pages/OffersPage.tsx:82`.

- **O que nasce**
  - Migration (prefixo depois de `20261130150000`): `home_sections.campaign_id` FK `campaigns(id)` `on delete set null`; índice único parcial `where type = 'campaign_offers' and campaign_id is not null`; recriação do índice de tipos únicos sem `campaign_offers`. Só schema.
  - Migration do UC-06: leitura da vigência aplicada no banco (D-07).
  - Regras puras do bloco em `packages/core/src/home/campaignOffers.ts`: "esta seção mostra a vigente?" (por id), recuo do título/descrição, tetos 60/160/12, recusa, frase da campanha já usada, motivo de "não vai aparecer", aviso de prévia de agendada.
  - "A campanha baixa o preço desta peça?" em `packages/core/src/campaigns/` (D-06).
  - Hook das marcações de uma campanha em `apps/backoffice/src/entities/campaign/api/` (paginado, erro tipado).
  - Seletor de campanha no editor.
  - Probes em `.specs/work-items/103-joias-em-oferta-configuravel/probes/` (molde `102/probes/01-campanhas.sql`, `02-gravacao-do-painel.sh`).

- **Exemplares**
  | Tipo | Siga a forma de |
  | ---- | --------------- |
  | Editor do bloco | `FeaturedProductsEditor.tsx` (Conteúdo 81-106, Peças escolhidas 142-259) |
  | Teto de caracteres | `CategoryListEditor.tsx` + `shared/ui/CharCounter.tsx` |
  | Recusa em `core` | `core/home/featured.ts › featuredProductsRefusal` (46-88), `categoryList.ts › categoryListRefusal` |
  | Composição da recusa no painel | `features/home-composition/model/sectionRefusals.ts › productCarouselRefusal` |
  | Fileira escolhida na loja | `widgets/featured-products/ui/FeaturedProducts.tsx:27-58` |
  | Migration de índice/tipo da Home | `20261130140000_102-joias-em-oferta-na-home.sql` |
  | Coluna FK + índice parcial (só a forma; aquela FK é `restrict`) | `20261130120000_102-campanhas.sql:128-134` (`order_items.campaign_id`) |
  | Leitura `security definer` | `20261107120000_compre-junto-adesao.sql` |
  | Guarda de migration | `homeSections.test.ts`, `campanhasSchema.test.ts` |
  | Hook com erro tipado | `useLiveCampaign.ts`; paginação `readAllPages` (`useProductPool`) |
  | Filtro por campanha no PostgREST | `useAdminProducts.ts:265-272` |
  | Probes | `102/probes/01-campanhas.sql`, `02-gravacao-do-painel.sh` |

- **Obrigações transversais** — defeito 01 (regra lida por dois consumidores vai a `core`; cópia deliberada com guarda); coluna derivável é segundo dono (sem retrato do nome, F1); migration aplicada é imutável e só no local; molde de migration (`if not exists`, drop antes de create, zero escrita de dado, nada a `anon`); "prove que grava" (`AD-012`: probe HTTP no :54441 e payload em igualdade exata); `toNewItems` única tradução rascunho → colunas (a campanha não entra em item); `strictNullChecks: false` (recusa `string | null`); literais do bloco em `core`; pureza de `core/home` (especificador relativo com `.ts`); busca com dono único (BUS-23, três réguas); o editor não desenha vitrine (`AD-019`, `previaUnica.test.ts`); gravar não desmonta (`VIV-05`, `fetch('revalidar')`); mobile primeiro 390 px; tom memorial; `motion-reduce:` na mesma linha; FSD (`warn`); baseline sem regressão (`CLAUDE.md` › Baselines).

- **Testes**
  - **core (vitest):** o bloco aparece só quando a campanha da seção é a vigente; sem campanha/agendada/encerrada/desligada/apagada não aparece, cada uma com o seu motivo, e "nunca teve" e "perdeu" dão a mesma frase; recuo do título e da descrição; recusa em ordem (sem campanha, título > 60, descrição > 160, > 12 peças com o número, item órfão, repetida com o ordinal); frase da campanha já usada com posição e título; "a campanha baixa esta peça?" (sem grade, com grade, "de/por" que já vence); tom das frases novas; `catalog.test.ts` com `campaign_offers` repetível.
  - **painel (componente):** campos e seletor com rótulo; opções, escolha atual fora da lista, campanha usada desabilitada; sem campanha a busca não aparece e a tela diz por quê; com campanha, só as marcadas; troca de campanha tira as não marcadas e diz quais; Cancelar desfaz; ao abrir, as tiradas saem e o editor abre alterado; leitura falha ⇒ nada sai e avisa; apagada sai nomeada; avisos de "não barateia", "fora do ar" e prévia de agendada; recusa provada pelo `HomeSectionEditor` real; gravação seção → itens com payload em igualdade exata; `23505` ⇒ frase de CA-02.6; linha com campanha, estado e motivo, acendendo ao trocar a campanha; `applyDraft` leva a campanha; a bandeja oferece o segundo bloco; `ProductSearchField` com recorte (contador, vazio e "já está no bloco" valendo dentro do recorte).
  - **loja (componente):** campanha diferente da vigente não desenha nada; título/descrição do `config` ou os recuos; peças na ordem em `slider`, esqueleto por peça; peça fora da campanha ou não barateada some sem substituição; todas fora ⇒ só cartões; sem itens ⇒ as quatro primeiras; falha das peças mantém os cartões; o renderizador passa seção e itens.
  - **guardas que leem o disco:** `homeSections.test.ts` (procedência do índice e contagem passam à migration nova; guarda do índice parcial por campanha e da FK `set null`); `campanhasSchema.test.ts` e `campanhaVigenciaParidade.test.ts` (o objeto novo do UC-06 entra na régua e na paridade); `campanhaNaLoja.test.ts` (`:81-89` continua; a metade positiva `:91-95` é reescrita de propósito se o embed ou o "barateia?" mudarem); `previaUnica.test.ts` (editor novo na âncora `DST-02`); `buscaDeProdutoComDonoUnico.test.ts`; `toNewItems.test.ts` (não muda); `accentText.test.ts:62-63`; `animacaoRespeitaMovimento.test.ts`; `catalog.test.ts` (pureza e contagem).
  - **testes que fixam o comportamento de hoje e mudam:** `catalog.test.ts:66-95`, `:174-186`; `HomeBlockTray.test.tsx:197-218`; `CampaignOffersEditor.test.tsx:9-23`; `HomeRenderer.test.tsx:109-129`; `CampaignOffers.test.tsx` (`:56-73`, `:139-165`, `:173-222`); `campaignOffers.test.ts:45-60`; `useLiveCampaign.test.tsx:29-47`.
  - **integração local (probes):** schema em transação desfeita (dois blocos com campanhas diferentes passam; mesma campanha ⇒ `23505`; dois sem campanha passam; apagar a campanha zera `campaign_id` sem apagar a seção; visitante não grava nem lê agendada); gravação do painel por HTTP com token de admin (seção com `config` e `campaign_id`, depois itens; a peça chega ao banco; leitura das marcações); UC-06 antes e depois com token de admin.
  - **sem execução possível no vitest (vai à QA):** 390 px / fonte 200 %, esqueleto/CLS da fileira, prévia real no iframe.

- **Depende / Expõe** — interno ao monorepo: o banco expõe `home_sections.campaign_id` às duas leituras da Home e a leitura da vigência aplicada no banco à loja; o painel depende do `23505` do índice por campanha; o painel expõe `HomeSection.campaign_id` dentro do rascunho da prévia (`PreviewDraftMessage.sections`); a loja publicada lê `campaign_id` na janela entre `db push` e deploy da Vercel.

## Fronteira entre repositórios

`nada` — Topologia de repositório único (`PROJECT.md` › Topologia: conferência de fronteira "não").

## Cobertura dos UCs

| UC | Reivindicado por |
| -- | ---------------- |
| UC-01 | monorepo (painel, core, loja) |
| UC-02 | monorepo (supabase, core, painel, loja) |
| UC-03 | monorepo (core, painel, loja) |
| UC-04 | monorepo (core, painel, loja) |
| UC-05 | monorepo (painel, core/home/preview, loja) |
| UC-06 | monorepo (supabase, loja) |

## Decisões

| # | A pergunta | A resposta | Quem decidiu |
| - | ---------- | ---------- | ------------ |
| F1 | CA-02.5: "perdeu" × "nunca escolheu" sem retrato do nome | (a) FK `on delete set null`, sem retrato; mesma mensagem para "perdeu" e "nunca teve". Trecho do `prd.md` (CA-02.5) trocado em r1 | o humano no gate do PRD Tech Review (`campanha-apagada-indistinguivel-de-sem-campanha` · `tech_prd_edit` · r1), pela recomendação por delegação |
| F2 | CA-02.4: a bandeja grava o bloco sem campanha antes do editor | (a) nasce desligado e sem campanha pela bandeja; o editor exige a campanha. Trecho do `prd.md` (CA-02.4) trocado em r1 | idem (`bloco-novo-nasce-sem-campanha-pela-bandeja` · `tech_prd_edit` · r1) |
| F9 | X-01: as policies permissivas somam e a sessão de admin vê campanha fora de vigência | provar no local e consertar com leitura que aplica a vigência no banco. **Provado em 2026-11-16** no banco local: com `role authenticated` e o `sub` de `admin@umaestrelinha.dev`, `select … from campaigns` devolve 3 linhas (Natal agendada, Black Friday encerrada, Dia das Mães em vigência) e `product_campaigns` as marcações das três; `anon` vê só Dia das Mães | o humano no gate do PRD Tech Review (`x01-confirmado-pelo-codigo-e-conserto-no-servidor` · `tech` · r1) |
| F10 | Forma da migration e da gravação da seção | a forma proposta, migration sem escrita de dado: coluna `home_sections.campaign_id` FK `set null`, índice único parcial por campanha, índice de tipos únicos recriado sem `campaign_offers`, guarda dos tipos atualizada, gravação seção → itens, regra do recuo em `core` | idem (`forma-da-migration-e-gravacao-da-secao` · `tech` · r1) |
| F11 | Leitura das marcações e recorte da busca | parâmetro de recorte por ids no `ProductSearchField` + hook de marcações em `entities/campaign` | idem (`leitura-das-marcacoes-e-recorte-da-busca` · `tech` · r1) |
| F13 | H-10 e I-10 da 102 superados | registrar como superados no `spec.md` da 102 | idem (`decisoes-da-102-superadas` · `none` · r1) |
| D-01 | O protótipo informado (`SQehnBNiiQmbnjkY3QQpbq`) não tem a tela do bloco nem `/admin/home`; validar contra o quê? | Seguir o molde do editor de "Produtos em destaque" e o componente da loja da 102; do protótipo valem os padrões (contador "n / teto" ao lado do rótulo, recusa com ícone abaixo do campo, lista ordenada com subir/descer/tirar como alternativa acessível ao arraste). A dica "aparece no título … do bloco de ofertas da Home" é comportamento da 102, superado pelo recuo (CA-01.3) | o humano no gate principal — respondido pela recomendação, por delegação explícita nesta conversa ("Handoff e perguntas e decisões nessa sessão você deve responder com suas recomendaçoes"), inline a pedido |
| D-02 | A linha Q-10 das Decisões do gate diz que a migration aponta o bloco de hoje para a vigente; CA-02.4/F3 dizem que a migration não grava dado | Vale o F3 e o CA-02.4: a migration não grava dado; o bloco de hoje fica sem campanha até a dona escolher. A linha Q-10 do `prd.md` foi anotada como superada (Histórico de revisões, "handoff · 2026-11-16") | idem |
| D-03 | "Fora: mudar o selo, os preços, a vitrine `/ofertas`" × o conserto do UC-06, que troca a fonte que os alimenta | O conserto troca **só a fonte da leitura** (a vigência aplicada no banco); para o visitante nada muda no selo, no preço nem na vitrine. É o UC-06 que o PRD pôs dentro; o Fora vale para mudanças de comportamento | idem |
| D-04 | A mesma soma de policies existe em `products` (`"admin full products" FOR ALL TO authenticated`, `20260414121021_….sql:211`): com sessão de admin, a loja mostra peça despublicada (CA-04.1 falharia nessa sessão) | Fora deste WI: o UC-06 trata de campanha. Registrado em **Não resolvido** como dívida para WI próprio; a QA mede o CA-04.1 como visitante | idem |
| D-05 | Quem traduz o `23505` do índice por campanha na frase de CA-02.6 | O painel reconhece a violação **pelo nome do índice novo** e mostra a frase de `core` (a mesma do seletor: posição e título do outro bloco); outro `23505` segue com a mensagem do banco (`AD-029` intacto) | idem |
| D-06 | "A campanha baixa o preço desta peça?" só existe no mapeador da loja (`mapProduct.ts › withCampaign`) e o painel precisa dela (CA-04.4) | A regra sobe para `packages/core/src/campaigns/` (perto de `price.ts`), com a loja delegando; a metade positiva de `campanhaNaLoja.test.ts:91-95` é reescrita para exigir a chamada ao dono. O painel lê, para as peças escolhidas, o preço, o "de/por" e as variações, e pergunta ao dono | idem |
| D-07 | Forma do conserto do UC-06 | Views `live_campaigns` e `live_product_campaigns` (donas = `postgres`, sem `security_invoker`, com `active and starts_at <= now() and now() < ends_at` pelo relógio do banco), `grant select` a `anon` e `authenticated`; a loja lê a campanha vigente de `live_campaigns` e embute `live_product_campaigns(…)` no lugar de `product_campaigns(…campaigns(…))`, inclusive no recorte `!inner` de `useOfferProducts`. A tarefa prova o embed pelo PostgREST local (sem `PGRST200/201`); se o PostgREST não inferir a relação, cai para RPC `security definer` com `search_path = ''` e registra. O predicado entra em `campanhaVigenciaParidade.test.ts` e o objeto em `campanhasSchema.test.ts` | idem |
| D-08 | A leitura das marcações de uma campanha pode passar de 1.000 linhas | Leitura paginada (`readAllPages`), erro tipado que nunca vira "nenhuma" | idem |
| I-01 | D-07 pedia as views sem `security_invoker` | As duas views nasceram **com** `security_invoker = true` (`supabase/CLAUDE.md` › RLS); o `where` da view aplica a vigência, então o admin recebe só a vigente mesmo com a policy de admin por baixo, e o visitante continua sob as policies públicas. `live_product_campaigns` filtra por `exists` em `live_campaigns` (a vigência escrita uma vez). `revoke all` antes do `grant select` a `anon`/`authenticated`. Probes SQL e HTTP provam | T01 (pd-impl-task, premissas 1, 2, 5), confirmada na revisão |
| I-02 | Como a loja embute as marcações vigentes sem reescrever o mapeador | Alias `product_campaigns:live_product_campaigns(percent, campaigns(…))`: a chave JSON e `Product.campaign` não mudam; o PostgREST local inferiu a relação pela view (200, sem `PGRST200/201`), sem cair na RPC | T01 (premissa 3) |
| I-03 | A API de `core/home/campaignOffers.ts` | `campaignOffersShows`, `…Title`, `…Description`, `…Refusal(campaignId, config, items)`, `…TakenText(posição a partir de 1, título)`, `…HiddenReason`, `…ScheduledPreviewNote`, `CAMPAIGN_OFFERS_NO_CAMPAIGN` (uma frase para "sem campanha" e "apagada"), tetos 60/160 e `CAMPAIGN_OFFERS_PIECES_MAX = FEATURED_PRODUCTS_MAX` por referência; título/descrição só com espaços recuam, a recusa conta sem aparar. "Barateia?" é `campaignLowersPrice` em `core/campaigns/price.ts` | T02 (premissas 1–7) |
| I-04 | Recorte da busca | `ProductSearchField` ganhou `permitidos` (lista vazia oferece nenhuma peça, nunca todas, e o denominador respeita o recorte) e `rotuloDoConjunto`; os padrões preservam as outras cinco superfícies | T03 (premissa 12) |
| I-05 | Contrato dos editores da Home e da gravação | `SectionEditorProps` com `campaignId`, `onCampaignChange` e `sections` obrigatórios; `updateSectionConfig(id, config, campaignId?)` manda `campaign_id` só com o terceiro argumento; `fetchSections('revalidar')` devolve as linhas lidas (para a frase do `23505`); `HomeWriteError.code?` | T03 (premissas 9–11) |
| I-06 | Título e descrição sem `maxLength` | O contador mostra o estouro e a recusa de `core` barra a gravação com o motivo e o número (CA-01.6 alcançável pela tela). O contador é o `CharCounter` padrão (`n/limite`), não o "n / teto" com espaços do protótipo (D-01) — divergência visual só, para a QA conferir | T03 (premissa 2 e Divergências) |
| I-07 | Linha do bloco na lista | Sem campanha ou com a campanha apagada, a linha avisa mesmo desligada; com campanha, o motivo só com o bloco ligado (`HOME-09`). Carregando ou falha na leitura das campanhas não vira "sem campanha". Os avisos das peças vêm do hook da 03 e nomeiam a peça | T04 (premissas 1, 2, 5) |

## Não resolvido

- **Peça despublicada visível a uma sessão de admin na loja** (D-04): `products` tem policy `for all to authenticated` de admin somada à pública. Fora deste WI; pede WI próprio.
- **Prova em navegador** (390 px, fonte 200 %, CLS da fileira, prévia no iframe com sessão de admin): não se mede no vitest; vai à QA (`pd-qa-validation`).
- **As telas do bloco sem protótipo** (D-01): a conferência visual da QA é contra o molde, não contra design.
