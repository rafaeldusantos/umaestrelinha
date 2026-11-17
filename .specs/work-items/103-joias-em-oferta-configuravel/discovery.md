# Descoberta — WI 103 · Joias em oferta configurável

> Relatório do `wi-discovery` em 2026-11-14. Repositório: o monorepo (apps/store, apps/backoffice,
> packages/core, packages/supabase, supabase/). `apps/mobile-adm` fora.
>
> Instruções lidas: `CLAUDE.md` (linhas 1–237), `apps/backoffice/CLAUDE.md` (1–568), `apps/store/CLAUDE.md`
> (endereçamento, Home, destaque, prévia), `packages/core/CLAUDE.md` e `supabase/CLAUDE.md` inteiros; os
> insumos da WI 102 (`prd.md` inteiro, `spec.md` 160–199 e 395–434).

## Diagnóstico

### Já existe e serve
| O que | Onde | Cobre o que do pedido |
| ----- | ---- | --------------------- |
| O tipo `campaign_offers` no catálogo da Home, rótulo "Joias em oferta", único | `packages/core/src/home/catalog.ts:23`, `:46`, `:115`; `supabase/migrations/20261130140000_102-joias-em-oferta-na-home.sql:27-59` | A seção do pedido. Não precisa de tipo novo |
| Campos de texto da seção: `config.title` e `config.subtitle` | `packages/core/src/home/types.ts:139-142` | Título e descrição cabem no `config` jsonb sem migration. Molde: `FeaturedProductsEditor.tsx:81-103` grava, `FeaturedProducts.tsx:44-45` lê |
| Peças escolhidas em `home_section_items.product_id`, FK `on delete set null`, ordem e `label_snapshot` | `supabase/migrations/20260815120000_24-home-gerenciavel.sql:91-107`, `:115-119` | Onde guardar as peças escolhidas e a ordem |
| "Curadoria é a PRESENÇA de itens": sem item vale o automático | `packages/core/src/home/types.ts:169-177`; `resolve.ts:163-180` | Sem peça escolhida, o automático de hoje, sem flag |
| `curateSection` e `toNewItems` | `apps/backoffice/src/entities/home/api/useAdminHomeSections.ts:288-333`; `features/home-composition/model/sectionDraft.ts:93-94` | Gravar as peças, sem coluna nova |
| `ProductPicker` sobre `ProductSearchField` | `features/home-composition/ui/ProductPicker.tsx:24-50` | Escolher peça, congelando slug e rótulo |
| Lista de campanhas do painel | `apps/backoffice/src/entities/campaign/api/campaignRead.ts:13-24` | Fonte do seletor |
| `useCampaignsOpenForMarking`: agendadas e em vigência, pela ordem do início | `campaignRead.ts:36-40`; `entities/campaign/model/campaign.ts:37-44` | Leitura natural de "campanhas ativas" |
| `campaignStatus` e `CampaignStatusPill` | `packages/core/src/campaigns/status.ts:21-27`; `apps/backoffice/src/entities/campaign/index.ts:11` | Dizer o estado da campanha escolhida |
| Filtro de produtos por campanha no painel | `apps/backoffice/src/entities/product/api/useAdminProducts.ts:265-271` | Precedente de recorte por `product_campaigns!inner` |
| A loja lê produto por id com a campanha mapeada | `apps/store/src/entities/product/api/useProductsByIds.ts:24-29`; `entities/product/lib/mapProduct.ts:55-56`, `:161` | Buscar as peças escolhidas e saber se ESTA campanha as barateia |
| Bloco que pinta peças escolhidas na ordem da dona | `apps/store/src/widgets/featured-products/ui/FeaturedProducts.tsx:27-58` | Molde da fileira |
| Embed `product:products(slug)` nas duas leituras da Home | `apps/store/src/entities/home/api/useHomeSections.ts:98`; `apps/backoffice/src/entities/home/api/useAdminHomeSections.ts:134` | Item de produto já chega com slug |
| "Está no ar?" de item de produto, igual nas duas pontas | `apps/store/src/widgets/home-renderer/model/useResolvedHome.ts:100-115`; `apps/backoffice/src/features/home-composition/model/useAdminResolvedHome.ts:124-142` | Peça despublicada sai e conta em `droppedCount` |
| Cartões de percentual, "Ver todas", fileira pelo `ProductCarousel` | `apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx:69-106`; `packages/core/src/home/campaignOffers.ts:31-50` | Continuam; muda a fonte das peças e dos textos |
| Vigência decidida pelo banco (policy pública) | `supabase/migrations/20261130120000_102-campanhas.sql:245-248`, `:271-277`; `apps/store/src/entities/campaign/api/useLiveCampaign.ts:1-6` | A loja compara o id escolhido com o vigente, sem relógio do aparelho |
| No máximo uma campanha ligada em vigência (exclusão) | `102-campanhas.sql:42-43` | Escolher campanha = "mostre quando ESTA estiver valendo" |

### Existe e precisa mudar
| O que | Onde | O que falta |
| ----- | ---- | ----------- |
| O editor do bloco, sem campo (decisão da 102) | `apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx:1-27` | Título, descrição, seletor de campanha, lista de peças; reescrever o comentário `:3-6` |
| O registro do editor, sem recusa | `features/home-composition/ui/sectionEditors.tsx:100-101` | `refusal` vinda de `core` (molde `featuredProductsRefusal`, `packages/core/src/home/featured.ts:46-62`) |
| O teste do editor afirma o contrário | `CampaignOffersEditor.test.tsx:9-23` | Inverter |
| O resumo da linha da Home | `HomeSectionRow.tsx:122-125` | Dizer campanha, estado e peças |
| O renderizador da loja não passa seção nem itens | `apps/store/src/widgets/home-renderer/ui/sectionRenderers.tsx:83-85` | Passar `section` e `items` |
| O widget usa nome da campanha e frase fixa | `CampaignOffers.tsx:58`, `:63`, `:66` | Título/descrição configurados com recuo; esconder quando a escolhida não é a vigente |
| As peças: as 4 primeiras da campanha | `useCampaignOfferProducts.ts:32-49`; `campaignOffers.ts:21-22` | Escolhidas na ordem da dona; sem escolha, o automático |
| Textos fixos do bloco em `core` | `packages/core/src/home/campaignOffers.ts:1-8`, `:25`, `:35-36` | Padrões e recusas novos |
| Doc do tipo diz "Sem campos" | `packages/core/src/home/types.ts:40-45`; `catalog.ts:44-46` | Reescrever |
| `SectionEditorProps` não carrega campanha | `sectionEditors.tsx:58-68` | Receber e alterar a campanha |
| Gravação da seção só grava `config` | `useAdminHomeSections.ts:183-190`; `AdminHomePage.tsx:203-214` | Porta que grava só a coluna nova |
| Rascunho e prévia só levam `config` e `items` | `sectionDraft.ts:102-108`, `:121-158`; `packages/core/src/home/preview.ts:61-62` | A campanha no rascunho, na prévia e no "não salvo" |
| Mapeadores da seção nas duas pontas | `useAdminHomeSections.ts:88-95`; `useHomeSections.ts:98`; tipo `HomeSection` (`types.ts:242-251`) | Ler a coluna nova |
| `ProductSearchField` não restringe o conjunto | `apps/backoffice/src/entities/product/ui/ProductSearchField.tsx:59-83` | Parâmetro de recorte por ids + leitura das peças da campanha |
| Guarda dos tipos da Home | `apps/store/src/shared/lib/__tests__/homeSections.test.ts:196-222` | Só muda se recriar `check`/índice |
| Guardas da prévia e da busca | `previaUnica.test.ts:228-235`; `buscaDeProdutoComDonoUnico.test.ts:553-562` (BUS-23) | Editor novo no sensor; seletor pelo dono da busca |
| `toNewItems.test.ts` (8 colunas) | `features/home-composition/model/__tests__/toNewItems.test.ts` | Não muda se a campanha morar na seção |
| Testes que fixam o título como nome da campanha | `apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx:140-162`; `packages/core/src/home/__tests__/campaignOffers.test.ts` | Conforme Q-02 |
| Exceção de contraste do widget | `apps/store/src/shared/lib/__tests__/accentText.test.ts:62` | Rever se o markup do título mudar |

### Não existe
| O que | Camada | Como procurou |
| ----- | ------ | ------------- |
| Referência da seção da Home a uma campanha | dados | migrations 24, 64 e 102 lidas; `config` proíbe referência (`types.ts:93-96`, `24-home-gerenciavel.sql:64-65`). Precisa de migration |
| Leitura no painel das peças marcadas numa campanha | contratos | grep `product_campaigns` em `apps/`: só escrita (`campaignWrite.ts:128-130`), embed por peça e filtro paginado |
| Regra pura do bloco configurável (recusa, "esta seção mostra esta campanha?") | regra | `campaignOffers.ts` só tem frases; `resolve.ts:123-124` motivo vazio |
| Motivo de "não vai aparecer" pela campanha escolhida | regra / UI | `resolve.ts:104-125`; `HomeSectionRow.tsx:122-125` |
| Prévia mostrando campanha agendada | UI / dados | policy pública só entrega a vigente (`102-campanhas.sql:245-248`, `:271-277`) |

## Premissas
| ID | Premissa | Alternativa | O que muda |
| -- | -------- | ----------- | ---------- |
| P-01 | A campanha mora em coluna nova `home_sections.campaign_id` (FK, `on delete set null`), por migration | Item em `home_section_items` com `campaign_id` | `toNewItems` 8→9, `check` de destino, significado da curadoria |
| P-02 | Título e descrição em `config.title` / `config.subtitle`, sem migration | Chaves novas | Só o nome |
| P-03 | "Campanhas ativas" = em vigência + agendadas | Só a vigente | Escolha cosmética; sem preparar antes do início |
| P-04 | A loja mostra o bloco só quando a escolhida é a vigente (por id) | Mostrar a vigente qualquer | CA-02.2 |
| P-05 | "Peça da campanha" = marcada em `product_campaigns`; a loja ainda descarta a que não barateia | O seletor já esconder as que não barateiam | Segundo leitor da regra de preço no painel |
| P-06 | Título até 60, descrição até 160 caracteres | Sem teto | Quebra em 390 px |
| P-07 | O bloco continua único | Um por campanha | Índice, guarda, bandeja |
| P-08 | A 102 está `done`; a migration nova vem depois de `20261130150000` | Migrations da 102 não publicadas | Só a ordem de publicação |

## Perguntas
| ID | Pergunta | Sugestões | Muda |
| -- | -------- | --------- | ---- |
| Q-01 | Quais campanhas o seletor oferece, e o que a loja faz quando a escolhida não está em vigência? | (a) vigência + agendadas; fora, o bloco não aparece e o painel diz por quê · (b) só a vigente · (c) vigência + agendadas; fora, mostra a vigente | CA-02.1, CA-02.2, P-03, P-04 |
| Q-02 | Quais textos título e descrição substituem, e vazios? | (a) título no h2, descrição na frase; vazios = hoje; rótulo do selo acima · (b) obrigatórios · (c) título só na fileira | CA-01.3, CA-01.4, CA-12 da 102 |
| Q-03 | Quantas peças? | (a) 4 · (b) até 12 · (c) até 8 | CA-03.3 |
| Q-04 | Sem peça escolhida, automático? | (a) sim · (b) só cartões · (c) obrigatório | CA-03.5 |
| Q-05 | Sem campanha escolhida, o que vale? | (a) acompanha a vigente · (b) não aparece | CA-02.4, CA-02.5 |
| Q-06 | O bloco continua único? | (a) sim · (b) um por campanha | Escopo, índice |
| Q-07 | Campanha agendada: basta o aviso de prévia? | (a) sim · (b) prévia de agendada | CA-05.2 |
| Q-08 | Peça que deixou a campanha: avisa ou tira sozinho? | (a) avisa · (b) tira ao abrir | CA-04.2, CA-04.3 |
| Q-09 | Os cartões de percentual continuam? | (a) sim · (b) saem com peças escolhidas | Desenho do bloco |

## Conflitos
- **O pedido reverte decisão explícita da 102**: H-10 (`.specs/work-items/102-desconto-de-campanha/spec.md:405`), I-10 (`:424`) e `CampaignOffersEditor.tsx:3-6` ("segundo dono do nome da campanha"). Reconciliação proposta: o título é texto da Home, com recuo para o nome (Q-02).
- **CA-12 da 102** (`prd.md:216`, travado em `CampaignOffers.test.tsx:153-162`): campanha nova herdaria o título digitado; o recuo de Q-02(a) só o preserva com o campo vazio.
- **Onde guardar a campanha**: o `config` não guarda referência e a migration 24 diz que referência mora em `home_section_items` (só categoria e produto). P-01 estende essa regra.
- **RLS e agendada**: a prévia (visitante) não vê campanha agendada nem as marcações dela.
- **Vocabulário**: "campanhas ativas" × `campaigns.active` (ligada) × estados Em vigência/Agendada/Encerrada/Desligada (`packages/core/src/campaigns/status.ts:14-19`).
- **Busca única**: BUS-23 recusa lista própria; o caminho é estender `ProductSearchField`.
- **O teste do editor afirma o oposto** (`CampaignOffersEditor.test.tsx:11`, `:19`).
- Nenhum texto lido tentou dar instrução.

## Incertezas
- **Defeito possível, anterior a esta WI**: `useLiveCampaign` não filtra vigência (`useLiveCampaign.ts:47-55`) e a policy de admin é `for all to authenticated` (`102-campanhas.sql:251-255`); uma sessão admin na loja (inclusive no iframe da prévia) poderia ver campanha agendada/encerrada/desligada. Não confirmado.
- Estado das migrations da 102 no hospedado não verificado.
- Quantas peças uma campanha costuma ter.
- Se o `ProductCarousel` `row` com mais de 4 peças embrulha no computador (não medido).
- `CLAUDE.md` raiz (238–748) e `apps/backoffice/CLAUDE.md` (569–1587) não lidos por inteiro.
