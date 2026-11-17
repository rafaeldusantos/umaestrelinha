# Log da implementação por ondas — 103

## T01 — pd-impl-task · review · agente ace2cc1986fefa8bc

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/01-campanha-que-a-loja-ve.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | As duas views usam `with (security_invoker = true)` | A D-07 da tarefa: views sem `security_invoker`, rodando como `postgres` | `supabase/CLAUDE.md` › RLS diz "View pública carrega `security_invoker`", e o arquivo de instruções vence no COMO (regra 4). O defeito some do mesmo jeito: o `where` da view já aplica a vigência, então a sessão de admin recebe só a vigente mesmo com a policy de admin valendo por baixo. Para o visitante, as policies públicas continuam valendo, então a marcação de peça inativa segue fora. A versão sem `security_invoker` ainda deixaria `live_campaigns` (que é atualizável) gravável com os privilégios do dono, caso o privilégio padrão sobrasse. Os probes SQL e HTTP provam o resultado | a migration, o guarda `campanhasSchema.test.ts` (que agora exige `security_invoker`) e os probes. As tarefas 02–04 só consomem as views, e o contrato delas (colunas e linhas) não muda |
| 2 | `live_product_campaigns` filtra por `exists (select 1 from public.live_campaigns lc where lc.id = pc.campaign_id)` | Escrever o predicado de vigência outra vez na segunda view | Assim a vigência fica escrita uma vez só na migration ("defeito 01"). O guarda de paridade confere as duas coisas: o filtro de `live_campaigns` é igual ao da policy e ao de `isCampaignLive`, e a view das marcações pergunta a `live_campaigns` | a migration e `campanhaVigenciaParidade.test.ts` |
| 3 | Embed `product_campaigns:live_product_campaigns(percent, campaigns(id, name, badge_text, band_color, accent_color, ends_at))`: um alias que mantém a chave JSON `product_campaigns` e o `campaigns(...)` aninhado da tabela | Trocar a chave lida pelo mapeador, o que obrigaria a reescrever as fixtures de cerca de 12 testes da loja; achatar as colunas da campanha dentro da view | É a mudança mínima que deixa `Product.campaign` igual. A linha da view só existe para a campanha vigente, então a campanha aninhada é sempre a vigente, também com a sessão de admin. O PostgREST local inferiu as relações pela view: 200, sem PGRST200/201 | `mapProduct.ts` (a 02 edita esse arquivo depois) e tudo que embute `PRODUCT_CAMPAIGNS_EMBED` (listagens, página, Compre Junto, sacola) |
| 4 | Colunas: `live_campaigns` = `id, name, badge_text, band_color, accent_color, ends_at`. `live_product_campaigns` = `product_id, campaign_id, percent` | Expor `starts_at`/`active` ou colunas da campanha na view das marcações | Na dúvida, a menor superfície: são exatamente as colunas que a loja lê hoje | quem consumir as views depois (a 02 só consome) |
| 5 | `revoke all ... from public, anon, authenticated` e depois `grant select ... to anon, authenticated` nas duas views | Só o `grant select` | O privilégio padrão do schema dá escrita a `anon`/`authenticated`. O probe prova que gravar pela view é recusado | a migration e o guarda |
| 6 | Migration `20261130160000_103-campanha-vigente.sql` | Outro prefixo ou nome | É o próximo prefixo livre depois de `20261130150000`, e o nome segue a convenção `<ts>_<WI>-<slug>` das vizinhas | a 02 cria a migration seguinte, que tem de vir depois desta |
| 7 | Probe dividido em `probes/01-campanha-vigente.sql` (transação desfeita) e `probes/01-campanha-vigente-http.mjs` (GET no PostgREST local). O token de admin é assinado com o `JWT_SECRET` de `supabase status` | Um arquivo SQL só; login pela API de auth | O SQL não faz HTTP, e a senha do admin local não é conhecida. O SQL cria, dentro da transação, uma campanha desligada com marcação, para que a prova nunca fique vazia | só os probes |
| 8 | Ajustei duas asserções de teste fora da lista `Testes`: `pages/__tests__/OffersPage.test.tsx` (a chave da resposta dublada `campaigns` virou `live_campaigns`, e o literal do recorte) e `widgets/campaign-offers/model/__tests__/useCampaignOfferProducts.test.tsx` (o literal do recorte) | Deixar os dois vermelhos | Eles verificam a mesma fonte que esta tarefa trocou. A onda 1 roda sem cerca | os dois arquivos de teste. O segundo fica em pasta que a 02 vai editar |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | A campanha vigente é lida de `live_campaigns` e volta como a vigente ou `null`; erro de leitura continua erro tipado | unitário do hook | `apps/store/src/entities/campaign/api/__tests__/useLiveCampaign.test.tsx` | sim | — para a tabela. A asserção do erro tipado (`LiveCampaignQueryError`) passou de primeira: check feito, vermelho |
| 2 | O mapeador lê a campanha pelo embed novo e produz o mesmo `Product.campaign` e os mesmos preços | unitário de `mapProduct` | `apps/store/src/entities/product/lib/__tests__/cardSelect.test.ts` (o recorte do PostgREST de uma linha completa vinda de `live_product_campaigns`) | sim | — |
| 3 | Guarda de schema: as duas views existem com `security_invoker`, filtram pela vigência com `now()`, dão `select` só a `anon`/`authenticated`, não tocam em policy e não escrevem dado | guarda que lê o disco | `apps/store/src/shared/lib/__tests__/campanhasSchema.test.ts` | sim | — (vermelho por falta da migration; cada régua tem sensor por `mutar()`) |
| 4 | Paridade: o filtro de `live_campaigns` é igual a `campaigns_public_read` e a `isCampaignLive` nas 18 bordas, e `live_product_campaigns` herda de `live_campaigns` | guarda de paridade | `apps/store/src/shared/lib/__tests__/campanhaVigenciaParidade.test.ts` | sim | vermelho (troquei `now() < ends_at` por `<=` na migration; 4 casos falharam; restaurado com `cmp`) |
| 5 | `campanhaNaLoja`: a metade negativa continua igual; a positiva passa a exigir `:live_product_campaigns(percent, campaigns(` | guarda que lê o disco | `apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts` | sim | vermelho (voltei o embed do mapeador para a tabela crua; restaurado com `cmp`) |
| 6 | O recorte da vitrine `/ofertas` usa `oferta:live_product_campaigns!inner(campaign_id)` | unitário/componente | `apps/store/src/pages/__tests__/OffersPage.test.tsx`, `apps/store/src/widgets/campaign-offers/model/__tests__/useCampaignOfferProducts.test.tsx` | sim | — |
| 7 | Probe local: com sessão de admin, `campaigns` cru entrega todas (o defeito) e as views só a vigente e as marcações dela; com `anon`, o mesmo de antes; GET HTTP com token de admin responde 200 sem marcação fora da vigência | integração no ambiente local | `.specs/work-items/103-joias-em-oferta-configuravel/probes/01-campanha-vigente.sql` e `01-campanha-vigente-http.mjs` | sim | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103

## Arquivos alterados

supabase/migrations/20261130160000_103-campanha-vigente.sql criado
apps/store/src/entities/campaign/api/useLiveCampaign.ts alterado
apps/store/src/entities/campaign/api/__tests__/useLiveCampaign.test.tsx alterado
apps/store/src/entities/product/lib/mapProduct.ts alterado
apps/store/src/entities/product/lib/__tests__/cardSelect.test.ts alterado
apps/store/src/entities/product/lib/__tests__/precoDeCampanha.test.ts alterado
apps/store/src/entities/product/api/useOfferProducts.ts alterado
apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts alterado
apps/store/src/shared/lib/__tests__/campanhasSchema.test.ts alterado
apps/store/src/shared/lib/__tests__/campanhaVigenciaParidade.test.ts alterado
apps/store/src/pages/__tests__/OffersPage.test.tsx alterado
apps/store/src/widgets/campaign-offers/model/__tests__/useCampaignOfferProducts.test.tsx alterado
.specs/work-items/103-joias-em-oferta-configuravel/probes/01-campanha-vigente.sql criado
.specs/work-items/103-joias-em-oferta-configuravel/probes/01-campanha-vigente-http.mjs criado

## Verificação

- Um arquivo de teste, `pnpm --filter @estrelinha/store exec vitest run <arquivo> --testTimeout=20000` (fonte: `PROJECT.md` › Comandos de verificação): rodado por fatia, todos verdes no fim.
- Tipos, `npx tsc --noEmit -p apps/store/tsconfig.app.json` (fonte: `CLAUDE.md` › Comandos): exit 0, 0 erros. O briefing não trouxe baseline e não medi antes da primeira fatia; comparei com o baseline do `CLAUDE.md` › Baselines (store 0). Nada mudou.
- Verificação mínima, `pnpm --filter @estrelinha/store test --testTimeout=20000` (fonte: `CLAUDE.md` › Baselines), fora de pipe: exit 0, 416 arquivos e 7832 testes passando.
- Lint, `npx eslint <os 11 arquivos tocados>` em `apps/store` (fonte: `CLAUDE.md` › Baselines): exit 0.
- `supabase status` (fonte: `PROJECT.md` › Ambiente local): o banco e a API estavam de pé.
- `supabase migration up --local` (fonte: `PROJECT.md` › Ambiente local): só a `20261130160000` estava pendente, e foi aplicada. Depois rodei `notify pgrst, 'reload schema'` no Postgres local (54442).
- Antes da migration, um `psql` local como admin `authenticated` deu `campaigns` = 3 e `product_campaigns` = 12; como `anon`, 1 e 5. O defeito estava confirmado.
- Probe SQL `01-campanha-vigente.sql`: exit 0, 10 linhas `ok —`.
- Probe HTTP `01-campanha-vigente-http.mjs`: exit 0, 5 linhas `ok —`.
- Os `PRODUCT_SELECT` e `PRODUCT_CARD_SELECT` completos, com e sem o recorte `oferta:`, contra o PostgREST local: os quatro deram 200.

Instruções lidas: `CLAUDE.md` › cabeçalho, › Comandos, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas (a prosa e as linhas da tabela sobre migration/RLS/campanha), › Baselines, › CI e deploy · `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram · `apps/store/CLAUDE.md` › Mobile — o que quebra e não grita, › a exceção `/ofertas` (§Endereçamento) · `packages/core/CLAUDE.md` (inteiro) · `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- A tarefa e o arquivo de instruções divergem sobre `security_invoker`. A D-07 manda criar as views sem ele; `supabase/CLAUDE.md` › RLS diz que view pública carrega `security_invoker`. Segui o arquivo de instruções (decisão 1), e os probes provam que o defeito some do mesmo jeito.
- A RPC de reserva da D-07 não foi necessária: o PostgREST local inferiu `products → live_product_campaigns`, `live_product_campaigns → campaigns` e `live_campaigns → campaign_percents` pela view.
- A prova do probe contra o banco local passou de primeira e não leva check de mutação (sobe infraestrutura). As asserções que a revisão deve ler estão em `probes/01-campanha-vigente.sql` e `probes/01-campanha-vigente-http.mjs`. A metade "antes" reproduziu o defeito nas tabelas cruas, então o probe morde naquilo que o conserto troca.
- Ficaram desatualizados dois documentos que esta tarefa não pedia para editar: `apps/store/CLAUDE.md` (exceção `/ofertas`: "`product_campaigns`, pela leitura pública filtrada por `now()`") e a contagem de migrations de `supabase/CLAUDE.md` › Migrations ("105 arquivos").
- Citações conferidas sem deslocamento relevante: `useLiveCampaign.ts:1-6`/`:47-55`, `20261130120000_102-campanhas.sql:244-248`/`:251-255`, `campanhaNaLoja.test.ts:81-89`/`:91-95`, e os exemplares `compre-junto-adesao.sql`, `campanhasSchema.test.ts`, `campanhaVigenciaParidade.test.ts` e `probes/01-campanhas.sql` do WI 102. Não abri `CampaignOffers.tsx:23-24` nem `FeaturedProducts.tsx:18-19` (RNF-02): a falha da leitura continua erro tipado e nenhum consumidor mudou.
- Para obter os `select` completos para o GET, criei e apaguei um arquivo temporário `apps/store/src/zz-dump-sel.test.ts`. Ele não ficou na árvore.
- Propagação: nenhuma afirmação de 02–04 ficou falsa. A 02 diz que `useLiveCampaign` lê `live_campaigns` e que o embed vem de `live_product_campaigns`, e isso é verdade agora; nenhuma delas afirma a ausência de `security_invoker`.

## Ao humano

nada

## O que devolver no fim

Tarefa: 01
Caso: fechou com divergência
Instruções lidas: `CLAUDE.md` (› Comandos, › O "defeito 01", › Convenções, › Os guardas, › Baselines, › CI e deploy), `supabase/CLAUDE.md` (› Migrations, › RLS — o molde), `apps/store/CLAUDE.md` (› Mobile, › a exceção `/ofertas`), `packages/core/CLAUDE.md`
Testes escritos:
  - leitura da vigente por `live_campaigns`, vigente ou `null`, erro tipado → `apps/store/src/entities/campaign/api/__tests__/useLiveCampaign.test.tsx`
  - mapeador pelo embed novo, mesmo `Product.campaign` e mesmos preços → `apps/store/src/entities/product/lib/__tests__/cardSelect.test.ts`
  - guarda de schema das views (`security_invoker`, `now()`, `grant select` só a `anon`/`authenticated`, sem policy nem escrita, com sensor por mutação) → `apps/store/src/shared/lib/__tests__/campanhasSchema.test.ts`
  - paridade do filtro da view com `campaigns_public_read` e `isCampaignLive`, e a view das marcações herdando de `live_campaigns` → `apps/store/src/shared/lib/__tests__/campanhaVigenciaParidade.test.ts`
  - `campanhaNaLoja.test.ts`: a metade negativa intacta; a positiva exige `:live_product_campaigns(` → `apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts`
  - probe local (admin e anon pelas views, defeito antes e conserto depois, GET HTTP 200 com token de admin) → `.specs/work-items/103-joias-em-oferta-configuravel/probes/01-campanha-vigente.sql` e `01-campanha-vigente-http.mjs`
  - nada ficou sem cobertura
Verificações: os testes dos arquivos alterados passam; `tsc` da loja com 0 erros; suíte da loja com exit 0 (416 arquivos, 7832 testes); eslint dos arquivos tocados com exit 0; `supabase migration up --local` aplicou a `20261130160000`; probe SQL com exit 0 (10 `ok`); probe HTTP com exit 0 (5 `ok`)
Árvore de trabalho: migration `supabase/migrations/20261130160000_103-campanha-vigente.sql` (nova); `useLiveCampaign.ts`, `mapProduct.ts` e `useOfferProducts.ts` alterados; testes `useLiveCampaign.test.tsx`, `cardSelect.test.ts`, `precoDeCampanha.test.ts` (só comentário), `campanhaNaLoja.test.ts`, `campanhasSchema.test.ts`, `campanhaVigenciaParidade.test.ts`, `OffersPage.test.tsx` e `useCampaignOfferProducts.test.tsx` alterados; dois probes novos em `.specs/work-items/103-joias-em-oferta-configuravel/probes/`. Nada commitado.
Citações conferidas: 12 abertas no uso; nenhuma deslocada de forma relevante e nenhuma morta. Não abri `CampaignOffers.tsx` e `FeaturedProducts.tsx` (RNF-02): nenhum consumidor mudou
Caducou: nada

## T01 — pd-impl-review · fixing · agente af4a771a555de437a

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/01-campanha-que-a-loja-ve.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | `teste que não morde` | atrapalha | `.specs/work-items/103-joias-em-oferta-configuravel/probes/01-campanha-vigente-http.mjs:57-61` e `:73-76` | A prova "antes" pelo HTTP só mostra que o admin vê mais campanhas cruas (`campaigns?select=id`). Ela nunca mostra que, com o token de admin, o embed cru `product_campaigns(...)` traz marcação de campanha fora da vigência. Por isso a checagem "depois" (`fora.length` vazio, :75-76) passaria também com o embed antigo e defeituoso sempre que as campanhas fora da vigência do banco local não tiverem marcação. O HTTP não está numa transação e não cria a marcação desligada que o probe SQL cria (`01-campanha-vigente.sql:39-43`), então a asserção depende dos dados do dia. Correção: fazer o mesmo GET com `product_campaigns(percent,campaigns(id))` cru e o token de admin, e exigir ao menos uma marcação fora de `VIGENTES` antes de checar a view. | Bloco `Testes`: "um GET HTTP no PostgREST local (:54441) de `products?select=…,live_product_campaigns(…)` com o token de admin responde 200 sem marcação de agendada"; e `Decisões já tomadas` F9: "O probe desta tarefa refaz a prova antes e depois." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o probe mostra, com sessão de admin, só a campanha vigente e só as marcações dela pelas views e pelo embed HTTP | `probes/01-campanha-vigente.sql:63-123` (admin: o defeito refeito, `live_campaigns` só com a vigente, `live_product_campaigns` só com as marcações dela, com uma campanha desligada marcada criada na transação); `probes/01-campanha-vigente-http.mjs:63-84` | sim no SQL. No HTTP a checagem das marcações depende dos dados (achado 1). O resultado é só execução |
| `useLiveCampaign` e o embed de produto da loja leem das views, e para o visitante nada muda no selo, no preço nem em `/ofertas` | `useLiveCampaign.ts:52` (`from('live_campaigns')`); `mapProduct.ts:57-58` (alias `product_campaigns:live_product_campaigns(...)`, que mantém a chave lida em `:321`); `useOfferProducts.ts:19`; para o visitante, `01-campanha-vigente-http.mjs:86-92` e `01-campanha-vigente.sql:129-151` | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver seção Testes | sim, com a ressalva do achado 1 |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório | — | só execução |

## Obrigações

- Migration só no banco local (`supabase migration up --local`): não há como conferir pelo diff. O diff não traz nenhum comando nem script que use `--linked`. Vai em Não conferido.
- Nenhum literal de domínio e nenhum relógio do aparelho na loja: aplicada. O diff da loja não traz `isCampaignLive`, `Date.now` nem `new Date`. `campanhaNaLoja.test.ts:81-89` (a metade negativa) segue intacto, e só a metade positiva foi reescrita (`:91-96`).
- `strictNullChecks: false`, sem união discriminada por booleano: aplicada. Nenhum tipo novo foi criado.
- Guarda que recusa string, com a forma proibida descrita e não escrita: aplicada. O comentário da migration descreve ("nenhuma policy tocada", "NENHUMA escrita de dado") sem escrever `drop policy`, `grant insert` nem `alter table`. As réguas de `campanhasSchema.test.ts` rodam sobre `semComentario(...)`.

## Testes

- Leitura da vigente em `live_campaigns`, devolvendo a vigente ou `null`, com erro tipado: `entities/campaign/api/__tests__/useLiveCampaign.test.tsx`. Morde: `fromMock` toHaveBeenCalledTimes(1) e CalledWith('live_campaigns'); o caso vazio dá `null`; o caso de erro passou a exigir `toBeInstanceOf(LiveCampaignQueryError)`.
- Mapeador pelo embed novo, com o mesmo `Product.campaign`/preços: `entities/product/lib/__tests__/cardSelect.test.ts:456-517`. Morde: a fixture vem com a chave da relação (`live_product_campaigns`), e `recortar` (`test/postgrestRecorte.ts:89-95`) a devolve sob o alias. Um embed sem alias deixaria `product_campaigns` ausente, e o preço 167.92 e o selo falhariam. O teste também exige o alias `product_campaigns`, que a tabela crua não esteja embutida, e traz um sensor sem o embed.
- Guarda de schema: `shared/lib/__tests__/campanhasSchema.test.ts:391-489`. Morde, com sensores por `mutar()` para `security_invoker`, o filtro de vigência, o filtro por `live_campaigns`, `revoke`/`grant` (lista exata de grants), policy/tabela e escrita de dado. Ele exige `security_invoker` em vez de "sem `security_invoker`", conforme a premissa 1, que se sustenta.
- Paridade: `shared/lib/__tests__/campanhaVigenciaParidade.test.ts:162-198`. Morde: a view responde igual a `isCampaignLive` nos 18 casos de borda, o predicado é igual termo a termo ao `using` da policy, a view das marcações pergunta a `live_campaigns`, e há sensores (fim inclusivo, sem `active`, tabela crua).
- `campanhaNaLoja.test.ts`: a metade negativa foi mantida e a positiva exige `:live_product_campaigns(percent, campaigns(`. Morde.
- Probe local: `probes/01-campanha-vigente.sql` morde no SQL, com uma campanha desligada marcada criada dentro da transação e a escrita pela view recusada. `probes/01-campanha-vigente-http.mjs` morde no 200 e no recorte `!inner`, mas não na ausência de marcação fora da vigência (achado 1).

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Views com `security_invoker = true`, em vez da D-07 | sim | `supabase/CLAUDE.md › RLS — o molde`: "View pública carrega `security_invoker`." A tarefa diz: "Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda". O `where` da view continua recortando a vigência para o admin, e o probe SQL prova isso | sim. `spec.md` (D-07) segue dizendo "sem `security_invoker`", mas não é arquivo de `tasks/`, e as tarefas 02–04 não citam o atributo |
| 2 | `live_product_campaigns` filtra por `exists (… live_campaigns …)` | sim | `CLAUDE.md › O "defeito 01"`; o guarda de paridade cobre as duas coisas | sim |
| 3 | Alias `product_campaigns:live_product_campaigns(...)`, com `campaigns(...)` aninhado da tabela | sim | O mapeador lê `p.product_campaigns` (`mapProduct.ts:321`); as fixtures de `test/checkoutCampanha*.test.tsx` usam a chave `product_campaigns`; nenhum outro select da loja embute a tabela crua (só `server/page.ts`, fora do escopo). A campanha aninhada vem pela marcação, que já é da vigente | sim |
| 4 | Colunas mínimas nas duas views | sim | `LIVE_CAMPAIGN_SELECT` (`useLiveCampaign.ts:19`) e o embed pedem exatamente essas colunas | sim |
| 5 | `revoke all` antes do `grant select` | sim | `supabase/CLAUDE.md › RLS`: "`anon` não alcança escrita em nada." O probe SQL testa a recusa | sim |
| 6 | Prefixo `20261130160000_103-campanha-vigente.sql` | sim | É o próximo depois de `20261130150000_99-…`, com o nome no padrão das vizinhas (`_102-`, `_99-`) | sim. A 02 cria uma migration sem prefixo cravado na tarefa |
| 7 | Probe dividido em SQL e HTTP, com JWT assinado pelo `JWT_SECRET` local | sim | O molde de probe é transação desfeita com `ok —`/`FALHA —`. O HTTP checa que a URL é local (`:23`) | sim (a força da asserção HTTP está no achado 1) |
| 8 | Ajuste de `OffersPage.test.tsx` e `useCampaignOfferProducts.test.tsx` | sim | Os dois assertavam a fonte que a tarefa manda trocar; a onda roda sem cerca | sim. A 02 vai editar a pasta do segundo, e o raio declara isso |

## Não conferido

- `probes/01-campanha-vigente.sql` e `probes/01-campanha-vigente-http.mjs` aparecem `??` (sem intent-to-add) e foram julgados inteiros pelo escopo da tarefa. Sem baseline, não há prova de que só existam estes dois arquivos nessa pasta por obra desta tarefa (o `ls` mostra só os dois).
- A aplicação da migration só no local (`--local`) e o resultado dos probes: só a execução mostra.
- Se as suítes que dublam o client com fixtures de `campaigns` aninhado (`ProductCardCampaign`, `leiturasDoPrecoEfetivo`, `campaignPricing`, `checkoutCampanha*`) e guardas como `marcacaoSoPorAcao.test.ts` seguem verdes: só a execução mostra.
- Fora de `alterados`: o comentário de `apps/store/src/widgets/campaign-offers/model/useCampaignOfferProducts.ts:23` ainda diz que quem decide é a RLS de `product_campaigns`. Isso não foi julgado.
- Instruções lidas: `CLAUDE.md › Comandos`, `› O "defeito 01"`, `› Convenções que valem em todo o repositório`, `› Os guardas` (tabela e regra "descreva a forma proibida"), `› Baselines`, `› CI e deploy`; `supabase/CLAUDE.md › Migrations`, `› RLS — o molde que os guardas cobram`; `apps/store/CLAUDE.md › Mobile — o que quebra e não grita`, e o trecho da exceção `/ofertas` (linhas 136 e 209-219, por busca); `packages/core/CLAUDE.md`, só pelo índice de títulos (o diff não toca `core`); lições de QA em `/Users/rafael.santos/.claude/feature/-Users-rafael.santos-Projetos-uma-estrelinha-store/licoes-qa.md`, sem padrão repetido no diff.

## T01 — pd-impl-task · done · agente ace2cc1986fefa8bc

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/01-campanha-que-a-loja-ve.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 7 | Probe local: com sessão de admin, as tabelas cruas entregam o que está fora da vigência e o embed cru traz marcação dessas campanhas (o defeito); as views entregam só a vigente e as marcações dela; com `anon`, o mesmo de antes; o GET HTTP com token de admin responde 200 sem marcação fora da vigência | integração no ambiente local | `.specs/work-items/103-joias-em-oferta-configuravel/probes/01-campanha-vigente-http.mjs` | sim | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103

## Arquivos alterados

.specs/work-items/103-joias-em-oferta-configuravel/probes/01-campanha-vigente-http.mjs alterado

## Verificação

- Rodei `node .specs/work-items/103-joias-em-oferta-configuravel/probes/01-campanha-vigente-http.mjs` contra o PostgREST local. É o probe da própria tarefa (bloco `Testes`), não um comando dos arquivos de instrução. Saiu com exit 0 e 6 linhas `ok —`.
- A linha nova é a prova "antes" do embed: com o token de admin, o embed cru `product_campaigns(percent,campaigns(id))` trouxe 7 marcações de campanhas fora da vigência. Só depois disso o probe confere o embed novo, que trouxe as 5 marcações, todas da vigente.

Instruções lidas: as mesmas da implementação; não reli nada.

## Divergências e descobertas

- Achado 1 aplicado. O probe HTTP agora exige, antes de checar a view, que o embed cru com o token de admin traga ao menos uma marcação fora de `VIGENTES`. Sem isso ele sai com `FALHA` e diz que a prova seria vazia.
- O probe HTTP continua dependendo dos dados do banco local. Ele não grava nada e, ao contrário do SQL, não roda em transação. Hoje a dependência aparece como `FALHA` explícita, não mais como verde vazio.

## Ao humano

nada

## O que devolver no fim

Tarefa: 01
Caso: fechou com divergência
Instruções lidas: `CLAUDE.md` (› Comandos, › O "defeito 01", › Convenções, › Os guardas, › Baselines, › CI e deploy), `supabase/CLAUDE.md` (› Migrations, › RLS — o molde), `apps/store/CLAUDE.md` (› Mobile, › a exceção `/ofertas`), `packages/core/CLAUDE.md`
Testes escritos:
  - leitura da vigente por `live_campaigns`, vigente ou `null`, erro tipado → `apps/store/src/entities/campaign/api/__tests__/useLiveCampaign.test.tsx`
  - mapeador pelo embed novo, mesmo `Product.campaign` e mesmos preços → `apps/store/src/entities/product/lib/__tests__/cardSelect.test.ts`
  - guarda de schema das views (`security_invoker`, `now()`, `grant select` só a `anon`/`authenticated`, sem policy nem escrita, com sensor por mutação) → `apps/store/src/shared/lib/__tests__/campanhasSchema.test.ts`
  - paridade do filtro da view com `campaigns_public_read` e `isCampaignLive`, e a view das marcações herdando de `live_campaigns` → `apps/store/src/shared/lib/__tests__/campanhaVigenciaParidade.test.ts`
  - `campanhaNaLoja.test.ts`: a metade negativa intacta; a positiva exige `:live_product_campaigns(` → `apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts`
  - probe local: admin e anon pelas views; o defeito antes (tabelas cruas e embed cru com token de admin trazendo marcação fora da vigência) e o conserto depois; GET HTTP 200 com token de admin → `.specs/work-items/103-joias-em-oferta-configuravel/probes/01-campanha-vigente.sql` e `01-campanha-vigente-http.mjs`
  - nada ficou sem cobertura
Verificações:
  - testes dos arquivos alterados: passando
  - `tsc` da loja: 0 erros
  - suíte da loja: exit 0 (416 arquivos, 7832 testes)
  - eslint dos arquivos tocados: exit 0
  - `supabase migration up --local`: aplicou a `20261130160000`
  - probe SQL: exit 0 (10 `ok`)
  - probe HTTP depois da correção: exit 0 (6 `ok`)
Árvore de trabalho:
  - migration nova: `supabase/migrations/20261130160000_103-campanha-vigente.sql`
  - código alterado: `useLiveCampaign.ts`, `mapProduct.ts`, `useOfferProducts.ts`
  - testes alterados: `useLiveCampaign.test.tsx`, `cardSelect.test.ts`, `precoDeCampanha.test.ts` (só comentário), `campanhaNaLoja.test.ts`, `campanhasSchema.test.ts`, `campanhaVigenciaParidade.test.ts`, `OffersPage.test.tsx`, `useCampaignOfferProducts.test.tsx`
  - dois probes novos em `.specs/work-items/103-joias-em-oferta-configuravel/probes/`
  - nada commitado
Citações conferidas: 12 abertas no uso; nenhuma deslocada de forma relevante e nenhuma morta. Não abri `CampaignOffers.tsx` nem `FeaturedProducts.tsx` (RNF-02), porque nenhum consumidor mudou
Caducou: nada

## T02 — pd-impl-task · review · agente a5a244f7529acc7c4

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/02-bloco-na-home-da-loja.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | "A campanha baixa esta peça?" é `campaignLowersPrice(price, comparePrice, variants, percent): boolean` em `packages/core/src/campaigns/price.ts`, e `withCampaign` do mapeador da loja delega a ela | um arquivo novo em `core/campaigns` | a tarefa pede o dono perto de `price.ts`. Num arquivo novo, a âncora literal de 9 arquivos de `campaigns/__tests__/denoReach.test.ts` teria de mudar | tarefa 03 (a leitura "não barateada" no painel) e 04 consomem esse nome |
| 2 | API de `core/home/campaignOffers.ts`: `campaignOffersShows(section, liveCampaignId)`, `campaignOffersTitle(config, nome)`, `campaignOffersDescription(config, percents)`, `campaignOffersRefusal(campaignId, config, items)`, `campaignOffersTakenText(posição, título)`, `campaignOffersHiddenReason(campaignId, status)`, `campaignOffersScheduledPreviewNote(startsAt)`, `CAMPAIGN_OFFERS_NO_CAMPAIGN`, `CAMPAIGN_OFFERS_TITLE_MAX` (60), `CAMPAIGN_OFFERS_DESCRIPTION_MAX` (160), `CAMPAIGN_OFFERS_PIECES_MAX` (12), `CAMPAIGN_OFFERS_CAMPAIGN_INDEX` | uma recusa que recebe a seção inteira | segue o molde de `featuredProductsRefusal(config, items)`, com a campanha como primeiro argumento | tarefas 03 e 04 consomem todas as assinaturas |
| 3 | `campaignOffersHiddenReason`: id vazio, ou id sem estado (`status` null, ou seja a campanha não está na lista), devolve `CAMPAIGN_OFFERS_NO_CAMPAIGN`. Quem chama só pergunta depois de ler as campanhas | um quinto motivo, "carregando" | "perdeu" e "nunca teve" dão a mesma frase (F1). O estado de carregamento é da tela, não da regra | tarefa 04 (a linha precisa esperar a leitura das campanhas) |
| 4 | Uma frase só serve de motivo de não aparecer e de recusa de salvar sem campanha: "O bloco está sem campanha e não aparece na loja. Escolha uma campanha." | duas frases | F1, e as duas pedem a mesma ação da dona | tarefas 03 e 04 |
| 5 | `campaignOffersTakenText(position, title)`: `position` é a posição na lista da Home a partir de 1; `title` chega já resolvido pelo chamador (o da dona ou o recuo) | posição a partir de 0, ou o título cru | é o número que a dona lê na lista | tarefa 03 (seletor e recusa do `23505`) |
| 6 | Título ou descrição só com espaços valem como vazios e recuam. Preenchidos aparecem sem aparar. A recusa conta o comprimento sem aparar | aparar antes de contar | o critério diz "como estão"; o molde `categoryList` conta sem aparar | tarefa 03 (contador) |
| 7 | `CAMPAIGN_OFFERS_PIECES_MAX = FEATURED_PRODUCTS_MAX`, por referência | escrever um segundo 12 | o critério diz "como em Produtos em destaque": uma cópia seria um segundo dono do número | só `core/home` (o teste fixa o 12 como literal) |
| 8 | Na loja, "tem peça escolhida" se decide pela presença de linhas em `section.items` (a curadoria crua), e as peças se buscam pelos `items` resolvidos. Todas as escolhidas fora do ar mostram só os cartões, sem completar | decidir pelos itens resolvidos | sem isso, o bloco cujas escolhidas saíram todas do ar cairia nas "4 primeiras" e completaria a vaga (CA-04.2) | só o widget da loja |
| 9 | "Fora da campanha" e "não barateada" se resolvem por um filtro só, `p.campaign?.id === campanha.id`: o mapeador já entrega `campaign: null` para a peça que a campanha não baixa e para a peça sem marcação vigente | perguntar a `campaignLowersPrice` de novo no widget | uma segunda pergunta seria um segundo dono da regra | widget da loja |
| 10 | A fileira escolhida mantém o título "Algumas das peças em oferta" e o "Ver todas". O id de lista do GA continua `ofertas-${campanha.id}`; o nome da lista passa a ser o título exibido | um título novo para a fileira, ou um id de lista por seção | menor superfície. Só uma campanha é vigente por vez, então o id não colide | eventos GA4 da fileira |
| 11 | Migration `supabase/migrations/20261130170000_103-joias-em-oferta-por-campanha.sql`, FK `home_sections_campaign_id_fkey`, índice `home_sections_campaign_offers_campaign_idx`, `comment on column`. A migration não tem `grant` | gravar dado; nomes gerados pelo Postgres | F10/D-02; D-05 pede nome estável | a guarda `homeSections.test.ts` lê o arquivo por nome; o painel (03) reconhece o `23505` pelo nome do índice |
| 12 | `useCampaignOfferProducts` só é chamado com o id da campanha quando o bloco aparece e não tem escolha; `useProductsByIds` só com ids quando aparece e tem escolha | pedir as duas leituras sempre | nenhuma ida ao banco para um bloco que não desenha nada | widget da loja |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | core: o bloco aparece só quando a campanha da seção é a vigente; sem campanha, agendada, encerrada, desligada ou apagada não aparece, cada uma com seu motivo, e "nunca teve" = "perdeu" | domínio | packages/core/src/home/__tests__/campaignOffers.test.ts | sim | — |
| 2 | core: título vazio cai no nome da campanha, descrição vazia na frase dos percentuais; preenchidos aparecem como estão | domínio | idem | sim | — |
| 3 | core: a recusa em ordem — sem campanha, título > 60 (sem aparar), descrição > 160, mais de 12 peças (com o número), item órfão, peça repetida (com o ordinal) | domínio | idem | sim | — |
| 4 | core: a frase da campanha já usada, o aviso de prévia da agendada, o nome do índice e o tom das frases novas | domínio | idem | sim | — |
| 5 | core: "a campanha baixa esta peça?" — sem grade, com grade (uma variação basta), "de/por" que já vence; o mapeador da loja delega e dá os mesmos preços | domínio | packages/core/src/campaigns/__tests__/price.test.ts; apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts; precoDeCampanha/leiturasDoPrecoEfetivo/mapProduct (regressão) | sim | — |
| 6 | core: `campaign_offers` repetível (`catalog.test.ts` invertido) | domínio | packages/core/src/home/__tests__/catalog.test.ts | sim | — |
| 7 | `campaign_id` mapeado na loja e no painel (linha sem a coluna ⇒ null) | aplicação | apps/store/src/entities/home/api/__tests__/useHomeSections.test.tsx; apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts | sim | — |
| 8 | loja: seção com campanha diferente da vigente, sem campanha ou com a campanha carregando não desenha nada nem reserva espaço | frontend | apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx | sim | — |
| 9 | loja: título e descrição do `config`, ou os recuos; o selo continua acima | frontend | idem | sim | vermelho (o caso do recuo passou de primeira; quebrei os recuos em `core` e ele ficou vermelho) |
| 10 | loja: escolhidas na ordem, em `slider`, uma vaga de esqueleto por peça; a peça fora da campanha ou não barateada some sem substituição; todas fora ⇒ só os cartões; falha da leitura mantém os cartões | frontend | idem | sim | — |
| 11 | loja: sem itens ⇒ as quatro primeiras da campanha (comportamento que já existia) | frontend | idem | sim | vermelho (troquei a fileira automática por vazio e 1 vaga: 3 casos ficaram vermelhos) |
| 12 | loja: o renderizador passa seção e itens; outra campanha em vigência ⇒ o bloco não aparece | frontend | apps/store/src/widgets/home-renderer/ui/__tests__/HomeRenderer.test.tsx | sim | — |
| 13 | guarda `homeSections.test.ts`: o índice de tipos vem da migration nova (6 tipos, `drop` antes do `create`); índice parcial por campanha; FK `set null` (nunca cascade nem restrict); a migration nova não escreve dado nem tem `grant` | domínio (lê o disco) | apps/store/src/shared/lib/__tests__/homeSections.test.ts | sim | vermelho (`cascade` e índice sem o recorte: 2 casos vermelhos; `campaign_offers` de volta no índice: âncora vermelha) |
| 14 | bandeja: oferece o segundo "Joias em oferta" | frontend | apps/backoffice/src/features/home-composition/ui/HomeBlockTray.test.tsx | sim | vermelho (pus `campaign_offers` de volta em `UNIQUE_SECTION_TYPES`: o caso ficou vermelho) |
| 15 | probe local: duas campanhas diferentes passam; mesma campanha ⇒ `23505` nomeando o índice; dois blocos sem campanha passam; apagar a campanha zera `campaign_id` sem apagar a seção; visitante lê `campaign_id` da seção ativa, não lê a desligada e não grava `home_sections` | integração no ambiente local | .specs/work-items/103-joias-em-oferta-configuravel/probes/02-secao-por-campanha.sql | sim | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103

## Arquivos alterados

packages/core/src/campaigns/price.ts — alterado
packages/core/src/campaigns/__tests__/price.test.ts — alterado
packages/core/src/home/campaignOffers.ts — alterado
packages/core/src/home/__tests__/campaignOffers.test.ts — alterado
packages/core/src/home/catalog.ts — alterado
packages/core/src/home/__tests__/catalog.test.ts — alterado
packages/core/src/home/types.ts — alterado
packages/supabase/src/types/home.ts — alterado
apps/store/src/entities/product/lib/mapProduct.ts — alterado
apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts — alterado
apps/store/src/entities/home/api/useHomeSections.ts — alterado
apps/store/src/entities/home/api/__tests__/useHomeSections.test.tsx — alterado
apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx — alterado
apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx — alterado
apps/store/src/widgets/home-renderer/ui/sectionRenderers.tsx — alterado
apps/store/src/widgets/home-renderer/ui/__tests__/HomeRenderer.test.tsx — alterado
apps/store/src/shared/lib/__tests__/homeSections.test.ts — alterado
apps/backoffice/src/entities/home/api/useAdminHomeSections.ts — alterado
apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts — alterado
apps/backoffice/src/features/home-composition/ui/HomeBlockTray.test.tsx — alterado
supabase/migrations/20261130170000_103-joias-em-oferta-por-campanha.sql — criado
.specs/work-items/103-joias-em-oferta-configuravel/probes/02-secao-por-campanha.sql — criado
.specs/work-items/102-desconto-de-campanha/spec.md — alterado (F13: nota "Superado pelo WI 103" nas linhas H-10 e I-10)

## Verificação

- Baseline de tipos capturada antes da primeira fatia (o briefing não trouxe uma): store 0 · backoffice 7 · core 11, igual à tabela de `CLAUDE.md` › Baselines.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros, igual ao baseline.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (CLAUDE.md › Comandos): 7 erros, os mesmos do baseline por arquivo e código, todos em `ProposalStateBadge.test.tsx`. Nenhum novo.
- `npx tsc --noEmit -p packages/core/tsconfig.json` (CLAUDE.md › Comandos): 11 erros, os mesmos do baseline. Nenhum novo.
- Um arquivo de teste, `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md › Comandos de verificação), rodado por fatia: verde em todas.
- Verificação mínima (CLAUDE.md › Baselines e PROJECT.md: a suíte de cada workspace tocado, exit fora de pipe):
  - `pnpm --filter @estrelinha/core test --testTimeout=20000`: exit 0, 6234 testes / 258 arquivos.
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: exit 0, 7854 / 416.
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: a 1ª rodada saiu com exit 1 por uma falha intermitente sem relação com esta tarefa (ver Divergências). A 2ª rodada saiu com exit 0, 5450 / 308.
- `supabase status` (PROJECT.md › Ambiente local): local de pé, `linked_project: null`.
- `supabase migration up --local` (PROJECT.md › Ambiente local): aplicou `20261130170000_103-joias-em-oferta-por-campanha.sql`.
- `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54442 ... -f probes/02-secao-por-campanha.sql`: todas as verificações `ok`, transação desfeita (`ROLLBACK`).
- Extra, fora da verificação declarada: `npx eslint` nos arquivos tocados da loja e do painel, sem nenhum aviso.

Instruções lidas: `CLAUDE.md` › Layout do monorepo, › Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas (a tabela filtrada pelas linhas de home, campanha, pureza, catálogo e accentText; o arquivo tem 152 KB), › Baselines, › CI e deploy · `packages/core/CLAUDE.md` (inteiro) · `supabase/CLAUDE.md` › Migrations, › RLS — o molde · `apps/store/CLAUDE.md` › Mobile, › A home não salta, › A Home é dado, › Produtos em destaque / ProductCarousel, › Modo prévia · `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local · as lições de QA do projeto (`licoes-qa.md`).

## Divergências e descobertas

- Probe: o critério de pronto "a mesma campanha recusa com `23505`" foi provado no banco local. O probe (`02-secao-por-campanha.sql`) é integração no ambiente local e passou de primeira sem check de mutação. A revisão deve olhar as asserções dele. Acrescentei uma verificação que o bloco `Testes` não pedia: o visitante lê `campaign_id` da seção ativa. A loja decide por essa coluna, e sem a leitura pública o bloco nunca apareceria.
- Fatias que passaram de primeira e levaram o check de mutação, todas com resultado vermelho:
  - o recuo de título e descrição no widget (o comportamento já existia);
  - a fileira automática;
  - a inversão da bandeja (a mudança em `core` veio antes do teste);
  - os casos novos da guarda `homeSections.test.ts`.
- Backoffice, flake: na 1ª rodada da suíte, `src/pages/admin/__tests__/AdminCampaignFormPage.test.tsx` › "tirar o 15% com 12 peças é recusado…" falhou (`Unable to find … pilula-do-percentual`). O arquivo passou sozinho (20/20) e na 2ª rodada inteira. É a intermitência de suíte do painel sob carga que o `CLAUDE.md` › CI descreve. A tarefa não toca esse arquivo nem a tela dele.
- `accentText.test.ts:62-63`, conferido: o ouro do `CampaignOffers.tsx` não mudou de lugar no markup (o número do terceiro cartão continua em `text-estrelinha-accent`), e a justificativa segue valendo. Nada alterado.
- Coluna `campaign_id` adicionada à `.specs/.../103/...`? Não: a mudança de schema foi aplicada só no Supabase local. Esse banco é o mesmo da árvore principal (`project_id` igual), então ele agora tem a migration `20261130170000`, que só existe no branch `feature/103`.
- Na pasta `probes/` do WI 103 já havia arquivos nomeados `02-gravacao-do-painel.sh` … `05-sacola-e-checkout.sh`, sem relação com esta tarefa. Criei `02-secao-por-campanha.sql` ao lado, como a tarefa nomeia, e não toquei nos outros.
- Comentários que diziam "único na Home, sem campos" foram atualizados em `core/home/catalog.ts`, `core/home/types.ts` e no cabeçalho de `campaignOffers.ts`, porque a mudança desta tarefa os tornou falsos.
- Nenhuma citação morta. As citações conferidas no uso não tinham deslocado: `CampaignOffers.tsx`, `FeaturedProducts.tsx`, as duas migrations exemplares, `featured.ts`, `mapProduct.ts › withCampaign`, `campanhaNaLoja.test.ts:81-89`, `catalog.test.ts:66-95/174-186`, `HomeRenderer.test.tsx:109-129`, `HomeBlockTray.test.tsx:197-218`, `useHomeSections.ts`, `useAdminHomeSections.ts`, `sectionRenderers.tsx`, `useProductsByIds.ts`, `useLiveCampaign.ts`.
- `Depende de` 01, conferido: `useLiveCampaign` lê `live_campaigns`, e o embed `PRODUCT_CAMPAIGNS_EMBED` lê `live_product_campaigns`.
- Propagação: nenhuma afirmação dos arquivos 03 e 04 ficou falsa, porque eles nomeiam só o módulo e o conceito. Os nomes concretos estão na decisão 2 deste relatório.
- Sem prova em navegador (é da Validation): os 390 px do slider e a ausência de rolagem horizontal do body ficaram só com o proxy de classe (`flex overflow-x-auto`, sem `md:grid`).

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 02
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (› Layout, › Comandos, › FSD, › defeito 01, › Convenções, › Os guardas — filtrado, › Baselines, › CI e deploy); packages/core/CLAUDE.md (inteiro); supabase/CLAUDE.md (› Migrations, › RLS — o molde); apps/store/CLAUDE.md (› Mobile, › A home não salta, › A Home é dado, › Produtos em destaque / ProductCarousel, › Modo prévia); .specs/project/PROJECT.md (› Comandos de verificação, › Ambiente local)
Testes escritos: core aparece/motivos, recuos, recusa em ordem, frase usada/aviso de prévia/índice/tom — packages/core/src/home/__tests__/campaignOffers.test.ts; "baixa esta peça?" — packages/core/src/campaigns/__tests__/price.test.ts + delegação do mapeador em apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts; repetível — packages/core/src/home/__tests__/catalog.test.ts; campaign_id mapeado — apps/store/src/entities/home/api/__tests__/useHomeSections.test.tsx e apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts; loja (não aparece, título/descrição/selo, escolhidas em ordem/slider/esqueleto/somem/só cartões/falha, automáticas) — apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx; renderizador passa seção e itens — apps/store/src/widgets/home-renderer/ui/__tests__/HomeRenderer.test.tsx; guarda da migration — apps/store/src/shared/lib/__tests__/homeSections.test.ts; bandeja — apps/backoffice/src/features/home-composition/ui/HomeBlockTray.test.tsx; probe — .specs/work-items/103-joias-em-oferta-configuravel/probes/02-secao-por-campanha.sql. Sem cobertura: a ausência de rolagem horizontal em 390 px (só o proxy de classe; a medida é da Validation em navegador)
Verificações: tsc store 0 / backoffice 7 / core 11, iguais ao baseline; suítes core 6234 ok, store 7854 ok, backoffice 5450 ok (a 1ª rodada teve um flake em AdminCampaignFormPage.test.tsx, sem relação com a tarefa; ele passou sozinho e na 2ª rodada); migration aplicada no local com `supabase migration up --local`; probe local todo ok, desfeito; eslint dos arquivos tocados sem aviso
Árvore de trabalho: 21 arquivos alterados e 2 criados (lista em Arquivos alterados), inclusive a nota F13 em .specs/work-items/102-desconto-de-campanha/spec.md; nada commitado
Citações conferidas: 16 abertas no uso; nenhuma deslocada, nenhuma morta
Caducou: nenhuma
```

## T02 — pd-impl-review · fixing · agente a0e05a9ee1bf45005

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/02-bloco-na-home-da-loja.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | convenção violada | atrapalha | apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx:15 | O import novo é `import { useProductsByIds } from '@/entities/product/api/useProductsByIds'`, um caminho profundo, mas o barrel `apps/store/src/entities/product/index.ts:3` já reexporta o hook (`export * from './api/useProductsByIds'`). O exemplar `FeaturedProducts.tsx:2` comete o mesmo desvio, mas é código anterior à tarefa. Corrigir exige ajustar também o `vi.mock` de `CampaignOffers.test.tsx`. | CLAUDE.md › Feature-Sliced Design: "Cada slice tem um barrel `index.ts` (public API). **Novo código deve importar do slice** (`@/entities/product`) e não de caminhos profundos." |
| 2 | teste que não morde | atrapalha | packages/core/src/home/__tests__/campaignOffers.test.ts:204-215 | Nenhum teste prova que o teto de peças é cobrado antes do item órfão e da peça repetida. O caso "acima de 12" usa 13 ids distintos e o caso "item órfão" usa 3 itens. Se a checagem de `campaignOffers.ts:170` fosse movida para depois do laço por item, a suíte continuaria verde. Já a ordem campanha → título → descrição → teto está provada. | Tarefa › Testes: "core: a recusa em ordem — sem campanha, título acima de 60 (sem aparar), descrição acima de 160, acima de 12 peças (com o número), item órfão, peça repetida (com o ordinal)." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a loja mostra o bloco só quando a campanha da seção é a vigente, com título/descrição configurados ou os recuos | `CampaignOffers.tsx` (`campaignOffersShows`, `campaignOffersTitle`, `campaignOffersDescription`); `core/home/campaignOffers.ts`; `useHomeSections.ts` mapSection; `sectionRenderers.tsx` | sim |
| as peças escolhidas aparecem na ordem, em fita, e a que deixou de valer some sem substituição | `CampaignOffers.tsx`: `ids.map(porId.get).filter(p.campaign?.id === campanha.id)`, `layout: 'slider'`, `skeletonCount: ids.length`, `temEscolha` pela curadoria crua | sim |
| dois blocos com campanhas diferentes coexistem e a mesma campanha recusa com `23505` (probe) | migration `20261130170000_103-joias-em-oferta-por-campanha.sql` (índice parcial nomeado); probe `probes/02-secao-por-campanha.sql` passos 1–3 | só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver seção Testes | sim, com a ressalva do achado 2 |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório | — | só execução |

## Obrigações

- **Pureza de `core/home` e `core/campaigns`, com `.ts` explícito:** aplicada. `campaignOffers.ts` importa só `../campaigns/text.ts`, `../campaigns/status.ts` (type), `../routes/routes.ts`, `./carousel.ts`, `./featured.ts` e `./types.ts` (type), e o grafo transitivo também usa `.ts`. Não nasceu arquivo em `core`, então as âncoras de contagem não mudam. `price.ts` continua folha.
- **`accentText.test.ts:62-63`:** o markup do ouro não mudou de lugar; só os textos do título e da descrição trocaram. Não há o que rever.
- **Migration só no local, sem `grant` a `anon`, sem insert/update/delete:** a migration não tem `grant` nem escrita de dado, e a guarda nova do `homeSections.test.ts` assere isso. Que ela foi aplicada só no local não dá para conferir lendo.
- **Mobile primeiro, fita em `slider`:** a fileira é a do `ProductCarousel` em `layout="slider"`, que já é dono das vagas; o diff não cria grade nova. Ver Não conferido.

## Testes

- **core, aparece/motivo, "nunca teve" e "perdeu" iguais:** `packages/core/src/home/__tests__/campaignOffers.test.ts` (`campaignOffersShows`, `campaignOffersHiddenReason`). Morde: as frases são comparadas literalmente e os três caminhos de "sem campanha" com `toBe`.
- **core, título/descrição e recuos:** mesmo arquivo. Morde, inclusive título só com espaços e preenchido "como está".
- **core, recusa em ordem:** mesmo arquivo. Morde em sem campanha, título sem aparar (61 com espaços), descrição antes do teto, teto com o número, órfão e repetida com ordinal. A ordem teto → órfão não está provada (achado 2).
- **core, frase da campanha já usada, aviso de prévia de agendada, tom:** mesmo arquivo. Morde (frases literais; regex de tom com `!`).
- **core, "a campanha baixa esta peça?":** `packages/core/src/campaigns/__tests__/price.test.ts` cobre sem grade, com grade (uma variação basta), "de/por" que vence, "de" da variação única, variação sem preço e sem percentual. A delegação do mapeador está em `apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts`, que exige `campaignLowersPrice(` no mapeador. "Os mesmos preços" fica com o `precoDeCampanha.test.ts` existente, que não mudou.
- **core, `catalog.test.ts` repetível:** invertido nos dois pontos (`UNIQUE_SECTION_TYPES` com 6 e `sectionMeta.unique: false`), mais o caso nomeado. Morde.
- **loja, outra campanha ou sem campanha não desenha nem reserva:** `CampaignOffers.test.tsx` cobre outra vigente, `campaign_id: null`, coluna ausente, carregando e erro (tudo com `toBeEmptyDOMElement`), e também que não pede peças. Morde.
- **loja, título/descrição/recuos e selo acima:** `CampaignOffers.test.tsx`, com `compareDocumentPosition` entre selo e título. Morde.
- **loja, fileira:** `CampaignOffers.test.tsx` cobre ordem da dona contra a ordem da resposta; `slider` por tokens (o `row` reprovaria por `md:grid`); 6 esqueletos para 6 escolhidas; peça sem campanha ou de outra campanha some sem completar; todas fora → só cartões; nenhuma resolvida → só cartões; falha → cartões ficam; sem itens → as 4 primeiras e 4 esqueletos. Morde.
- **loja, renderizador passa seção e itens:** `HomeRenderer.test.tsx` cobre título do `config` e peças na ordem dos itens, mais a outra campanha vigente. Morde.
- **guarda `homeSections.test.ts`:** procedência do índice de tipos movida para a migration nova, contagem 6, drop antes do create, índice parcial com nome de `core`, FK `set null` sem cascade/restrict, "não escreve dado", com sensores. Morde.
- **probe local:** `.specs/work-items/103-joias-em-oferta-configuravel/probes/02-secao-por-campanha.sql` (fatia sem mutação). As asserções mordem: cada passo lança `FALHA` (P0001), que os handlers de `unique_violation`/`insufficient_privilege` não engolem; o 23505 confere o nome do índice; apagar a campanha confere contagem 1 e `campaign_id` nulo; o visitante confere leitura da ativa, não leitura da desligada, e recusa de insert e de update. Tudo dentro de `begin … rollback`.
- **Extras:** `useHomeSections.test.tsx` e `useAdminHomeSections.test.ts` (mapeamento de `campaign_id`, ausente vira `null`) e `HomeBlockTray.test.tsx`, invertido como o Contrato manda.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `campaignLowersPrice` em `core/campaigns/price.ts`, com o mapeador delegando | sim | Contrato ("perto de `price.ts`"); D-06. Equivale ao `baixou` antigo: mesmo `pieceComparePrice` e mesmas variações com preço não nulo | sim (03 consome; 04 via 03) |
| 2 | API de `core/home/campaignOffers.ts` | sim | molde `featuredProductsRefusal(config, items)`; `string \| null` como manda `packages/core/CLAUDE.md › Convenções de tipo`; exporta tetos, índice e frases que o Contrato lista | sim |
| 3 | `campaignOffersHiddenReason`: id vazio ou sem estado → "sem campanha"; carregando é da tela | sim | F1; CA-02.5 | sim (04) |
| 4 | Uma frase só para o motivo e a recusa sem campanha | sim | F1/CA-02.5 ("a mesma mensagem"); tom sem exclamação | sim |
| 5 | `campaignOffersTakenText(position a partir de 1, título resolvido)` | sim | CA-02.6 ("dizendo a posição e o título") | sim (03) |
| 6 | Só espaços valem como vazio no recuo; a recusa conta sem aparar | sim | molde `categoryListRefusal` ("contado **sem aparar**", `packages/core/CLAUDE.md › home`); Testes ("sem aparar") | sim (03, contador) |
| 7 | `CAMPAIGN_OFFERS_PIECES_MAX = FEATURED_PRODUCTS_MAX` | sim | CA-03.3 ("como em Produtos em destaque"); "defeito 01" | sim |
| 8 | "Tem escolha" pela presença de `section.items`; busca pelos itens resolvidos | sim | `apps/store/CLAUDE.md › A Home é dado` ("A vaga que sobra fica VAZIA"); `resolve.ts` usa a mesma regra ("Curadoria é a PRESENÇA de itens") | sim |
| 9 | Filtro único `p.campaign?.id === campanha.id` | sim | o mapeador devolve `campaign: null` quando `campaignLowersPrice` é falso ou não há marcação | sim |
| 10 | Mantém "Algumas das peças em oferta"/"Ver todas"; id GA `ofertas-${id}`; nome da lista = título exibido | sim | nenhum teste ou instrução lido fixa o nome da lista; a busca no store por `ofertas-`/`joias-em-oferta` não achou outro dependente | sim |
| 11 | Migration, nomes estáveis de FK e índice, `comment on column`, sem `grant` | sim | `supabase/CLAUDE.md › RLS` (sem grant a `anon`); leitura por `select('*, …')` nas duas pontas; o probe passo 5 prova a leitura do visitante | sim (guarda e 03 listados) |
| 12 | Cada hook só é habilitado no ramo que desenha | sim | `useProductsByIds` com `enabled: ids.length > 0`; `useCampaignOfferProducts(null)` | sim |

## Não conferido

- Nada foi executado: testes, `tsc`, lint, aplicação da migration e o probe ficam com a execução.
- O probe `.specs/work-items/103-joias-em-oferta-configuravel/probes/02-secao-por-campanha.sql` está `??`, sem intent-to-add. É arquivo novo e foi lido inteiro. Sem baseline, só a palavra do implementador garante que ele não tocou em outro arquivo da pasta do WI 103.
- Rolagem horizontal em 390 px, fonte a 200 % e CLS só se medem em navegador; ficam com a Validation e a QA.
- Que a migration só foi aplicada no local (`supabase migration up --local`) não se prova lendo o diff.
- A equivalência de preços do mapeador depois da delegação não foi conferida rodando; confiei no `precoDeCampanha.test.ts` existente e na leitura do código.
- `campaignOffers.test.ts:45-60`, citado no bloco Testes entre os testes da loja, só existe em `packages/core`. Ali a mudança foi o cabeçalho do arquivo, e não houve outra reescrita a conferir.
- Instruções lidas:
  - `CLAUDE.md` › Layout do monorepo, › Feature-Sliced Design (com Alias de import), › O "defeito 01", › Convenções que valem em todo o repositório, › Baselines, › CI e deploy. › Os guardas foi lido só por busca de termos (home, campanha, migration, core, accent) e não por inteiro.
  - `packages/core/CLAUDE.md` › Quando um código pertence…, › Pureza, › Os módulos, › Dinheiro, › `home`, › Convenções de tipo. As outras seções de módulo não foram lidas.
  - `supabase/CLAUDE.md` › Migrations, › RLS — o molde.
  - `apps/store/CLAUDE.md` › Mobile, › A home não salta enquanto carrega, › A Home é dado, › Produtos em destaque (com `ProductCarousel` tem TRÊS formas), › Modo prévia.
  - Lições de QA: `/Users/rafael.santos/.claude/feature/-Users-rafael.santos-Projetos-uma-estrelinha-store/licoes-qa.md`. Nenhum padrão repetido no diff: falha e carregamento nunca viram valor padrão no bloco. A prévia do rascunho com `campaign_id` é das tarefas 03 e 04.

## T02 — pd-impl-task · done · agente a5a244f7529acc7c4

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/02-bloco-na-home-da-loja.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 13 | Achado 1: o widget importa `useProductsByIds` do barrel `@/entities/product`. O `vi.mock('@/entities/product/api/useProductsByIds')` do teste continuou como estava | trocar o mock pelo barrel inteiro | O barrel reexporta o módulo que o mock substitui, e o vitest mocka pelo id do módulo, então o mock continua valendo. A prova é que os casos de escolhidas asserem `escolhidas.pedidos` e o desenho das peças vindas do mock, e seguem verdes. Mockar o barrel inteiro exigiria `importOriginal` de um módulo que puxa supabase e mais oito hooks | só `CampaignOffers.tsx` e o teste dele |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 3 | core: a recusa em ordem — agora com o teto cobrado antes do item órfão e da peça repetida | domínio | packages/core/src/home/__tests__/campaignOffers.test.ts | sim | vermelho (com a cobrança do teto movida para depois do laço por item, o caso novo falhou; restaurei pela cópia, `cmp` igual, verde de novo) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103

## Arquivos alterados

apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx — alterado
packages/core/src/home/__tests__/campaignOffers.test.ts — alterado

## Verificação

- `pnpm --filter @estrelinha/core exec vitest run src/home/__tests__/campaignOffers.test.ts --testTimeout=20000` (PROJECT.md › Comandos de verificação): 32 passaram.
- `pnpm --filter @estrelinha/store exec vitest run src/widgets/campaign-offers src/widgets/home-renderer src/pages/__tests__/homeComposition.test.tsx --testTimeout=20000` (PROJECT.md): 83 passaram.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros, igual ao baseline.
- `npx eslint src/widgets/campaign-offers` (store): sem aviso.
- Não rodei de novo as suítes completas: a correção tocou um import de um widget e um arquivo de teste, e os arquivos de teste dos dois rodaram.

Instruções lidas: sem releitura; as da implementação seguem valendo.

## Divergências e descobertas

- `FeaturedProducts.tsx:2` faz o mesmo import profundo, mas é código anterior à tarefa e não foi alterado (regra 6: sem refatoração oportunista).

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 02
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (› Layout, › Comandos, › FSD, › defeito 01, › Convenções, › Os guardas — filtrado, › Baselines, › CI e deploy); packages/core/CLAUDE.md (inteiro); supabase/CLAUDE.md (› Migrations, › RLS — o molde); apps/store/CLAUDE.md (› Mobile, › A home não salta, › A Home é dado, › Produtos em destaque / ProductCarousel, › Modo prévia); .specs/project/PROJECT.md (› Comandos de verificação, › Ambiente local)
Testes escritos: core aparece/motivos, recuos, recusa em ordem (inclusive o teto antes do órfão e da repetida), frase usada/aviso de prévia/índice/tom — packages/core/src/home/__tests__/campaignOffers.test.ts; "baixa esta peça?" — packages/core/src/campaigns/__tests__/price.test.ts + delegação do mapeador em apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts; repetível — packages/core/src/home/__tests__/catalog.test.ts; campaign_id mapeado — apps/store/src/entities/home/api/__tests__/useHomeSections.test.tsx e apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts; loja (não aparece, título/descrição/selo, escolhidas em ordem/slider/esqueleto/somem/só cartões/falha, automáticas) — apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffers.test.tsx; renderizador passa seção e itens — apps/store/src/widgets/home-renderer/ui/__tests__/HomeRenderer.test.tsx; guarda da migration — apps/store/src/shared/lib/__tests__/homeSections.test.ts; bandeja — apps/backoffice/src/features/home-composition/ui/HomeBlockTray.test.tsx; probe — .specs/work-items/103-joias-em-oferta-configuravel/probes/02-secao-por-campanha.sql. Sem cobertura: a ausência de rolagem horizontal em 390 px (só o proxy de classe; a medida é da Validation em navegador)
Verificações: tsc store 0 / backoffice 7 / core 11, iguais ao baseline; suítes core 6234 ok, store 7854 ok, backoffice 5450 ok (a 1ª rodada teve um flake em AdminCampaignFormPage.test.tsx, sem relação com a tarefa; ele passou sozinho e na 2ª rodada); migration aplicada no local com `supabase migration up --local`; probe local todo ok, desfeito; eslint dos arquivos tocados sem aviso. Na correção: o teste de campaignOffers (32 ok), os do widget, do renderizador e de homeComposition (83 ok), tsc da loja 0
Árvore de trabalho: 21 arquivos alterados e 2 criados, inclusive a nota F13 em .specs/work-items/102-desconto-de-campanha/spec.md; a correção mexeu de novo em CampaignOffers.tsx (import pelo barrel) e em campaignOffers.test.ts (caso da ordem do teto); nada commitado
Citações conferidas: 16 abertas no uso; nenhuma deslocada, nenhuma morta
Caducou: nenhuma
```

## T03 — pd-impl-task · review · agente a126e2194d2eb75f0

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/03-editor-do-bloco-no-painel.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O seletor de campanha é um grupo de botões de opção (`role="radiogroup"`, nome "Campanha do bloco"). Cada opção mostra o nome, a `CampaignStatusPill`, a vigência (`campaignPeriodLabel`) e, quando outro bloco já usa a campanha, a frase de `campaignOffersTakenText` | `<select>` nativo ou o `Select` do Radix | A opção desabilitada precisa dizer a posição e o título do outro bloco. Isso não cabe num `<option>` no celular. Uma lista quebra a linha em 390 px | o `CampaignOffersEditor.tsx` e os testes dele |
| 2 | Título e descrição ficam sem `maxLength`. O contador `CharCounter` mostra o estouro (`61/60`) e a recusa de `core` barra a gravação com o motivo e o número | o `maxLength` do molde `CategoryListEditor` | O CA-01.6 pede que a gravação seja recusada com o motivo. Com `maxLength` a recusa ficaria inalcançável pela tela | o editor |
| 3 | O hook das marcações (`useCampaignMarks`/`fetchCampaignMarks`) e a leitura das peças escolhidas (`useCampaignPiecesState`/`fetchCampaignPieces`) ficam em `entities/campaign/api/campaignMarks.ts`. A regra pura e as frases dos avisos (`campaignPieceStates`, `piecesOffAirText`, `piecesNotLoweredText`, `piecesOutOfCampaignText`, `listaDeNomes`) ficam em `entities/campaign/model/campaignPieces.ts` | pôr a leitura em `entities/product/api`; escrever as frases dentro do editor | O editor e a linha da tarefa 04 vão ler as mesmas respostas e as mesmas frases. Assim cada frase tem um dono só | tarefa 04 (propagado) |
| 4 | A leitura das peças é `products` por id, com `base_price`, `original_price` e `product_variants(price, compare_price)`, todas as variações. "Barateia?" é `campaignLowersPrice(base_price, original_price, variants, percent)` | filtrar as variações ativas | A loja usa `price = base_price` e `compare_price = original_price` (`mapProduct`). A RLS pública entrega todas as variações de uma peça ativa | aviso "não barateia" no editor e na linha (04) |
| 5 | Ordem dos estados por peça: `apagada` → `fora-do-ar` → `fora-da-campanha` → `nao-barateada` → `no-ar` | outra ordem | É a ordem em que a loja descarta: existir, estar no ar, estar marcada, a campanha baixar o preço | 04 |
| 6 | A conferência contra as marcações é a mesma ao abrir (CA-04.3) e ao trocar de campanha (CA-03.6). Roda uma vez por campanha, quando a leitura chega. As peças não marcadas e as apagadas (`product_id` nulo) saem do rascunho, e os nomes acumulam entre trocas. Se a leitura falhar, nada sai | dois mecanismos separados; limpar a lista de saídas a cada troca | Um dono só para "o que sai". Acumular evita perder o aviso de peça já removida | o editor |
| 7 | A busca de peças só aparece com campanha escolhida E marcações lidas. Enquanto carrega ou com falha, ela não aparece e a tela diz por quê. Com zero peças marcadas, a tela diz isso | mostrar o catálogo enquanto carrega | Sem as marcações não há como restringir a busca. "Não permita escolher peça não marcada" | o editor |
| 8 | A campanha já usada por outro bloco não é recusada pelo editor antes de gravar: o seletor a desabilita, e a colisão (`23505` do índice) é traduzida pela página | cobrar na `refusal` | A recusa precisaria do nome da campanha. Pelo seletor esse estado só se alcança numa corrida entre duas gravações. "Repetida" na recusa do editor é a peça repetida (de `core`) | `AdminHomePage`, o editor |
| 9 | Na colisão, `handleSave` relê com `fetchSections('revalidar')`, que agora devolve as linhas lidas (`HomeSection[] \| null`, aditivo). Com elas monta `campaignCollisionText` e cai na mensagem do banco se o outro bloco não estiver na releitura. A página passa a chamar `useCampaigns` para o nome da campanha (recuo do título) | mostrar o texto cru do banco; montar a frase com a lista antiga | A lista antiga é justamente a que não via o outro bloco. O CA-02.6 pede a mesma frase do seletor | o retorno de `useAdminHomeSections.fetchSections`; `AdminHomePage` |
| 10 | `updateSectionConfig(id, config, campaignId?)`: com o terceiro argumento, manda `{ config, campaign_id }`; sem ele, continua `{ config }`. `HomeWriteError` ganhou `code?` opcional | uma porta nova só para a campanha | Uma escrita só, antes de `curateSection`. As outras seções não mudam o payload (provado por teste) | o hook da Home; as próximas tarefas que gravem seção |
| 11 | `SectionEditorProps` ganhou `campaignId`, `onCampaignChange` e `sections` obrigatórios. `refusal` ganhou um terceiro argumento opcional (a campanha do rascunho). `SectionSaveDraft.campaign_id` e `applyDraft` levam a campanha à prévia. `draftChanged` compara a campanha | props opcionais | Obrigatórios, o `tsc` acha todo construtor. O único fora do casco era o teste do `CategoryListEditor`, ajustado | todos os editores da Home; `CategoryListEditor.test.tsx` |
| 12 | `ProductSearchField` ganhou `permitidos` (recorte por id, repassado a `buscarProdutos` nas duas chamadas, então o denominador respeita o recorte) e `rotuloDoConjunto` (padrão `no catálogo`; o bloco usa `na campanha`). `OpcoesDaBusca.permitidos`: lista vazia oferece nenhuma peça, nunca todas | um componente de busca próprio | É o dono único da busca (BUS-23/F11). Os padrões preservam as outras cinco superfícies | o componente compartilhado e `core/product-search` |
| 13 | Ordinal feminino (`ordinalF`: "1ª", "Remover a 1ª peça") na posição e nos `aria-label` da lista | o `ordinal` masculino do molde `FeaturedProductsEditor` | "peça" é feminino | o editor |
| 14 | Campanha agendada: o aviso é `campaignOffersScheduledPreviewNote`. Encerrada ou desligada: `campaignOffersHiddenReason`. Id que não está mais entre as campanhas vale como sem campanha (a mesma frase) | mostrar os dois avisos para a agendada | O CA-05.2 pede só a nota da prévia; o motivo de não aparecer da agendada diz o mesmo | o editor |
| 15 | A campanha atual que está fora da lista (encerrada ou desligada) entra ordenada pelo início, junto das outras. O relógio do editor é `Date.now()` uma vez por abertura | pôr a atual no topo | Mantém "na ordem do início" | o editor |
| 16 | Subir e descer como `Button` ghost `h-11 w-11` com `aria-label`, ao lado do arraste nativo, como alternativa acessível (D-01). Selos por peça "fora do ar" e "sem desconto" | só o arraste | Pedido do Design (D-01) e alvo de 44 px | o editor |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Recorte por ids em `buscarProdutos` (`permitidos`; total e vazio dentro do recorte) | domínio | packages/core/src/product-search/__tests__/search.test.ts | sim | — |
| 2 | `ProductSearchField` com recorte: lista, contador `N na campanha`, vazio e "já está no bloco" dentro do recorte | frontend | apps/backoffice/src/entities/product/ui/__tests__/ProductSearchField.test.tsx | sim | — |
| 3 | Hook das marcações (contagem, páginas por `product_id`, erro tipado que nunca vira vazio), leitura das peças, estado por peça e frases | aplicação/domínio | apps/backoffice/src/entities/campaign/__tests__/campaignMarks.test.tsx | sim | — |
| 4 | `applyDraft` leva a campanha à prévia; `draftChanged` acusa a troca | unidade | apps/backoffice/src/features/home-composition/model/__tests__/applyDraft.test.ts | sim | — |
| 5 | A gravação manda `{ config, campaign_id }` em revalidação, o erro chega com `code`, e a releitura devolve as linhas | aplicação | apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts | sim | vermelho (`code` e `revalidar`: 2 checks) |
| 6 | A campanha usada por outro bloco (posição e título), a colisão reconhecida pelo código e pelo índice | domínio | apps/backoffice/src/features/home-composition/model/__tests__/campaignOffersTaken.test.ts | sim | — |
| 7 | O editor (pelo casco real): campos e contadores; opções na ordem com estado e vigência; a atual encerrada ou desligada; a de outro bloco desabilitada; sem campanha e campanha apagada com a mesma frase; busca só das marcadas; reordenar, subir, descer, remover; troca de campanha tirando peças, e Cancelar; ao abrir, tiradas e apagadas saem e o editor abre alterado; leitura falhando, nada sai; avisos "saíram do ar", "não barateia" e "agendada"; recusas (sem campanha, título 61, descrição 161, 13 peças, peça repetida) sem `onSave` e com o rascunho na tela; a gravação válida | frontend | apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.test.tsx (invertido) | sim | — |
| 8 | A página grava a seção (`config` e `campaign_id`) antes dos itens, com payload em igualdade exata; o `23505` do índice vira a frase de CA-02.6; outro `23505` não; a campanha chega à prévia | frontend | apps/backoffice/src/pages/admin/AdminHomePage.test.tsx | sim | — |
| 9 | Guardas: `previaUnica` (editor novo na âncora do DST-02), `animacaoRespeitaMovimento` (arquivo em escopo), `buscaDeProdutoComDonoUnico`, `toNewItems` (inalterado) | guarda que lê o fonte | previaUnica.test.ts, animacaoRespeitaMovimento.test.ts, buscaDeProdutoComDonoUnico.test.ts, toNewItems.test.ts | sim | vermelho (`grid-cols-2` e `transition-opacity` injetados derrubam as duas réguas) |
| 10 | Probe local: seção com `config` e `campaign_id`, depois os itens; a peça escolhida chega ao banco; colisão `23505`; leitura das marcações e das peças | integração (Supabase local) | .specs/work-items/103-joias-em-oferta-configuravel/probes/03-gravacao-do-painel.sh | sim (12 ok, 0 falhas) | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103

## Arquivos alterados

packages/core/src/product-search/search.ts — alterado
packages/core/src/product-search/__tests__/search.test.ts — alterado
apps/backoffice/src/entities/product/ui/ProductSearchField.tsx — alterado
apps/backoffice/src/entities/product/ui/__tests__/ProductSearchField.test.tsx — alterado
apps/backoffice/src/entities/campaign/index.ts — alterado
apps/backoffice/src/entities/campaign/api/campaignMarks.ts — criado
apps/backoffice/src/entities/campaign/model/campaignPieces.ts — criado
apps/backoffice/src/entities/campaign/__tests__/campaignMarks.test.tsx — criado
apps/backoffice/src/entities/home/api/useAdminHomeSections.ts — alterado
apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts — alterado
apps/backoffice/src/features/home-composition/index.ts — alterado
apps/backoffice/src/features/home-composition/model/sectionDraft.ts — alterado
apps/backoffice/src/features/home-composition/model/sectionRefusals.ts — alterado
apps/backoffice/src/features/home-composition/model/campaignOffersTaken.ts — criado
apps/backoffice/src/features/home-composition/model/__tests__/campaignOffersTaken.test.ts — criado
apps/backoffice/src/features/home-composition/model/__tests__/applyDraft.test.ts — alterado
apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx — alterado
apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.test.tsx — alterado
apps/backoffice/src/features/home-composition/ui/HomeSectionEditor.tsx — alterado
apps/backoffice/src/features/home-composition/ui/ProductPicker.tsx — alterado
apps/backoffice/src/features/home-composition/ui/sectionEditors.tsx — alterado
apps/backoffice/src/features/home-composition/ui/CategoryListEditor.test.tsx — alterado
apps/backoffice/src/features/home-composition/__tests__/previaUnica.test.ts — alterado
apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts — alterado
apps/backoffice/src/pages/admin/AdminHomePage.tsx — alterado
apps/backoffice/src/pages/admin/AdminHomePage.test.tsx — alterado
.specs/work-items/103-joias-em-oferta-configuravel/probes/03-gravacao-do-painel.sh — criado
.specs/work-items/103-joias-em-oferta-configuravel/tasks/04-linha-do-bloco-e-bandeja.md — alterado (propagação: só a linha do Contrato)

## Verificação

- Um arquivo de teste: `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (fonte: `PROJECT.md` › Comandos de verificação). Rodado por fatia; todos verdes no fim.
- Tipos (fonte: `CLAUDE.md` › Comandos):
  - `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`: 7 erros, todos em `ProposalStateBadge.test.tsx` (TS2304 ×3, TS2593 ×4). Igual ao baseline. Um TS2739 novo em `CategoryListEditor.test.tsx` (props novas) foi corrigido.
  - `npx tsc --noEmit -p packages/core/tsconfig.json`: 11. Igual ao baseline; nenhum em arquivo tocado.
  - `npx tsc --noEmit -p apps/store/tsconfig.app.json`: 0. Igual ao baseline.
- Verificação mínima (fonte: `CLAUDE.md` › Baselines, suíte do workspace tocado mais a da loja, exit fora de pipe):
  - `pnpm --filter @estrelinha/core test --testTimeout=20000`: exit 0, 6240/258.
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: exit 0, 5521/310.
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: exit 0, 7854/416.
  - Todos acima das baselines registradas, sem falha.
- Extra, sem ser exigido: `npx eslint` nas pastas tocadas do backoffice, exit 0.
- Probe: `bash .specs/work-items/103-joias-em-oferta-configuravel/probes/03-gravacao-do-painel.sh` contra o Supabase local (:54441, de pé por `supabase status`): 12 ok, 0 falhas, e limpou o que criou.
- Instruções lidas:
  - `CLAUDE.md` › Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Baselines.
  - `CLAUDE.md` › Os guardas: só as linhas de `previaUnica`, `animacaoRespeitaMovimento`, `buscaDeProdutoComDonoUnico`, `toNewItems`, `contadorComDonoUnico` e `movimentoDaConta…`. A tabela inteira tem ~93 KB e não foi lida por inteiro.
  - `apps/backoffice/CLAUDE.md` › Molde dos formulários, › `/admin/home` — a composição, › O editor de "Produtos em destaque", › O editor da "Lista de categorias", › A busca de produto, › Gravar NÃO desmonta a tela, › O movimento do painel, › A ponte da prévia.
  - `packages/core/CLAUDE.md`, inteiro.
  - `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.
  - Lições de QA (`licoes-qa.md`).

## Divergências e descobertas

- O Design pede o contador "n / teto" (com espaços). Usei o `CharCounter` padrão (`n/limite`), como o molde `CategoryListEditor` que a tarefa manda imitar.
- Fatias que passaram de primeira:
  - No hook, "o erro chega com `code`" e "revalida sem esqueleto". O check do segundo ficou verde com a implementação quebrada (`'inicial'`), porque o React agrupava os renders. Reforcei a asserção com a releitura segurada e `loadings` sem `true`; a mutação passou a dar vermelho.
  - Na página, "outro `23505` segue com a mensagem do banco" e "o rascunho leva a campanha à prévia": comportamento já existente (mensagem do banco) ou já entregue pela fatia de `applyDraft`. São testes de frontend, sem check de mutação; a revisão deve ler a asserção.
  - No editor, "campanha em vigência: nenhum aviso" é uma asserção de ausência que passou no vermelho também. Mesmo caso: revisar.
- O probe (fatia 10) sobe contra o banco e passou de primeira, sem check, como manda a regra.
- O que só o navegador prova e não foi provado: RNF-04 (390 px sem rolagem horizontal e fonte a 200 %) e a prévia de verdade mostrando o rascunho. O jsdom não mede layout; isso fica com a Validation e as skills de QA.
- Citações conferidas ao usar, 18 no total:
  - Batem com o código (algumas com poucas linhas de deslocamento): `campaign.ts:37-44` (`campaignsOpenForMarking`), `useAdminProducts.ts:265-272` (filtro por campanha, por volta da linha 263), `useAdminResolvedHome.ts:124-142`, `FeaturedProductsEditor.tsx:188-246`, `ProductSearchField.tsx:52-59` (doc de `selecionados`), `sectionDraft.ts:1-5`.
  - `packages/core/src/home/types.ts:232-238` aponta o `label_snapshot`, que nomeia a peça perdida; não aponta a frase "saiu do ar".
  - Não abertas: `20261130120000_102-campanhas.sql:245-248` (usei a migration da 103 e `campaignOffers.ts`), `.specs/work-items/102-desconto-de-campanha/spec.md:416` (fonte de design de outro WI; regra 5) e `apps/store/CLAUDE.md › Mobile` (fora da lista de leitura).
- Nenhuma citação morta. Nenhum exemplar veio do histórico do Git.
- Propagado para a tarefa 04: a linha do Contrato "hook das marcações e estado das peças escolhidas" agora traz os nomes e as formas reais (`useCampaignMarks`, `useCampaignPiecesState`, os estados, `piecesOffAirText`/`piecesNotLoweredText`/`piecesOutOfCampaignText`).
- A árvore já tinha `.specs/work-items/102-desconto-de-campanha/spec.md` modificado antes de mim. Não é desta tarefa e não toquei.
- Lições de QA aplicadas com teste:
  - [estado de falha]: a leitura das marcações que falha não vira lista vazia, nenhuma peça sai e a tela avisa.
  - [prévia]: a campanha do rascunho chega à prévia.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (› Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções, › Os guardas — linhas dos guardas citados, › Baselines) · apps/backoffice/CLAUDE.md (› Molde dos formulários, › /admin/home — a composição, › Editor de "Produtos em destaque", › Lista de categorias, › A busca de produto, › Gravar NÃO desmonta a tela, › O movimento do painel, › A ponte da prévia) · packages/core/CLAUDE.md (inteiro) · .specs/project/PROJECT.md (› Comandos de verificação, › Ambiente local)
Testes escritos:
  - campos, contador e seletor com rótulo — CampaignOffersEditor.test.tsx (Conteúdo)
  - opções na ordem com estado; atual encerrada ou desligada; tomada desabilitada com posição e título — CampaignOffersEditor.test.tsx (Campanha — as opções)
  - sem campanha a busca some e diz por quê; com campanha só as marcadas; contador, vazio e "já está no bloco" dentro do recorte — CampaignOffersEditor.test.tsx (Peças) + ProductSearchField.test.tsx (`permitidos`) + core search.test.ts
  - sem campanha e campanha apagada com a mesma frase — CampaignOffersEditor.test.tsx (Sem campanha)
  - troca de campanha tira as não marcadas e diz quais; Cancelar desfaz — CampaignOffersEditor.test.tsx (Trocar a campanha)
  - ao abrir: tiradas saem e o editor abre alterado; leitura falhando, nada sai e avisa; apagada nomeada — CampaignOffersEditor.test.tsx (Ao abrir)
  - avisos "não barateia", "saíram do ar", agendada — CampaignOffersEditor.test.tsx (Os avisos) + campaignMarks.test.tsx (estado e frases)
  - recusa pelo casco real (sem campanha, tetos, peça repetida) — CampaignOffersEditor.test.tsx (A recusa)
  - gravação: seção antes dos itens, payload exato; 23505 do índice vira a frase; outro 23505 não — AdminHomePage.test.tsx + useAdminHomeSections.test.ts + campaignOffersTaken.test.ts
  - applyDraft leva a campanha — applyDraft.test.ts
  - guardas: previaUnica (editor novo no DST-02), buscaDeProdutoComDonoUnico, animacaoRespeitaMovimento (arquivo em escopo), toNewItems (inalterado), CampaignOffersEditor.test.tsx invertido
  - probe local — probes/03-gravacao-do-painel.sh
  - sem cobertura: RNF-04 (390 px e fonte a 200 %), que só o navegador mede (Validation)
Verificações: tsc backoffice 7 (= baseline), core 11 (= baseline), store 0; suítes core 6240, backoffice 5521 e store 7854, todas com exit 0; eslint nas pastas tocadas sem erro; probe local 12 ok, 0 falhas
Árvore de trabalho: 28 arquivos (6 criados, 22 alterados) em packages/core/src/product-search, apps/backoffice/src/{entities/campaign, entities/home, entities/product/ui, features/home-composition, pages/admin, shared/lib/__tests__}, o probe 03 e a linha do Contrato da tarefa 04; nada commitado
Citações conferidas: 18 abertas ao usar; deslocamento só de poucas linhas (useAdminProducts:265-272, por volta de 263); types.ts:232-238 aponta o label_snapshot, não a frase "saiu do ar"; nenhuma morta
Propagado: 04 — a linha do Contrato "hook das marcações e estado das peças escolhidas" com os nomes e as formas reais (useCampaignMarks, useCampaignPiecesState, os estados por peça, piecesOffAirText/piecesNotLoweredText/piecesOutOfCampaignText)
```

## T03 — pd-impl-review · fixing · agente ab591bf14638bd415

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/03-editor-do-bloco-no-painel.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | critério descoberto | atrapalha | apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx:142-145 (com apps/backoffice/src/entities/campaign/api/campaignMarks.ts:136-143) | Se `fetchCampaignPieces` falha, `useCampaignPiecesState` devolve `states: null` com `error` preenchido. O editor só lê `pecas.states` e ignora `pecas.error` e `pecas.loading`. Com isso os avisos "saíram do ar" e "não barateia" somem sem nada dizer que a conferência falhou, e a tela fica igual à de um bloco em que toda peça aparece. As marcações têm aviso de falha (`marcacoes-com-erro`); a leitura das peças não tem. | CA-04.4: "o editor e a linha do bloco dizem quais peças escolhidas não aparecem por esse motivo"; licoes-qa.md: "[estado de falha] leitura que falha ou ainda carrega nunca vira valor padrão na tela … → enquanto não sabe, desabilita e avisa" |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o editor salva título, descrição, campanha e peças, e a prévia mostra o rascunho antes de salvar | CampaignOffersEditor.tsx (Conteúdo, Campanha, Peças); HomeSectionEditor.tsx:103,120 (`campaign_id` no rascunho e no `onSave`); sectionDraft.ts `applyDraft`/`draftChanged`; AdminHomePage.tsx:219-243 (`updateSectionConfig(id, config, campaign_id)` antes de `curateSection`) | sim |
| sem campanha não salva e diz por quê; campanha já usada aparece desabilitada e, na colisão, a frase de CA-02.6 | sectionRefusals.ts `campaignOffersSectionRefusal` (frase de `core`); CampaignOffersEditor.tsx:236-275 (`disabled` mais a frase de `campaignsTaken`); AdminHomePage.tsx:227-238 (`isCampaignCollision` → `campaignCollisionText`, e outro `23505` segue com a mensagem do banco) | sim |
| a busca só oferece as peças marcadas e a troca de campanha tira as que não estão na nova | search.ts `permitidos`; ProductSearchField.tsx; CampaignOffersEditor.tsx:119-139 (conferência por campanha) e 411-442 (busca só com marcações lidas) | sim |
| o probe prova que a seção e a peça escolhida chegam ao banco local | probes/03-gravacao-do-painel.sh, passos 3-4 (`config`+`campaign_id`, depois os itens, depois a releitura) | só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório | — | só execução |

## Obrigações

- O editor não desenha vitrine: CampaignOffersEditor.tsx não tem `<img>`, `grid-cols-N`, `snap-*`, `…Preview` nem `<iframe>`. Entrou na âncora e na lista de suspeitos do `DST-02` em previaUnica.test.ts:229,236. Aplicada.
- Nenhum `products` filtrado por nome fora de `entities/product/api`: `fetchCampaignPieces` filtra por `.in('id', …)` (campaignMarks.ts:108). Aplicada.
- `motion-reduce:` em toda classe de transição ou animação: o editor não tem nenhuma. Ele entrou no escopo de animacaoRespeitaMovimento.test.ts:111, e a âncora `FONTES.length === ARQUIVOS.length` sobe sozinha. Aplicada.
- Gravar não desmonta (`'revalidar'`): useAdminHomeSections.ts `updateSectionConfig` → `fetchSections('revalidar')`, e a colisão relê também com `'revalidar'` (AdminHomePage.tsx:228). Há teste no hook. Aplicada.
- FSD pelo barrel: o editor e a página importam de `@/entities/campaign` (barrel, index.ts:8-10). `ProductPicker` continua no `ProductSearchField` de antes. Aplicada.

## Testes

- Título, descrição com contador e seletor com rótulo: CampaignOffersEditor.test.tsx "os dois campos têm rótulo e contador…". Morde (texto do contador e `radiogroup` pelo nome).
- Seletor (em vigência e agendadas por início, com estado; a atual encerrada ou desligada; a de outro bloco desabilitada com posição e título): CampaignOffersEditor.test.tsx "Campanha — as opções" (4 casos), mais campaignOffersTaken.test.ts. Morde (ordem exata das opções, `toBeDisabled`, frase de `core` com posição 2).
- Sem campanha a busca não aparece; com campanha, só as marcadas; contador, vazio e "já está no bloco" dentro do recorte: CampaignOffersEditor.test.tsx "Peças — a busca…", ProductSearchField.test.tsx "`permitidos`…" (4 casos) e search.test.ts (5 casos). Morde (lista exata, `2 na campanha`, recorte vazio ≠ catálogo).
- Sem campanha, inclusive a apagada, com a mesma frase: CampaignOffersEditor.test.tsx "Sem campanha…" (3 casos, `textContent` igual a `CAMPAIGN_OFFERS_NO_CAMPAIGN`). Morde.
- Troca de campanha tira as não marcadas e diz quais; Cancelar desfaz: CampaignOffersEditor.test.tsx "Trocar a campanha…". Morde na remoção. O caso de Cancelar só assere `onCancel` chamado e `onSave` não chamado, o que basta porque Cancelar navega e descarta o rascunho.
- Ao abrir (as tiradas saem e o editor abre alterado; falha de leitura não tira nada e avisa; a apagada sai nomeada): CampaignOffersEditor.test.tsx "Ao abrir…" (5 casos, inclusive a leitura que chega depois). Morde ("Alterações não salvas" presente ou ausente, lista exata).
- Avisos "não barateia", "saíram do ar" e agendada: CampaignOffersEditor.test.tsx "Os avisos…" e campaignMarks.test.tsx (frases e `campaignPieceStates`, com o caso de variação que baixa). Morde.
- Recusa pelo `HomeSectionEditor` real (sem campanha, tetos, repetida): CampaignOffersEditor.test.tsx "A recusa, pelo casco" (sem campanha, 61, 161, 13 peças, repetida, mais o caso positivo). Morde (`onSave` não chamado, `role="alert"`, valor digitado mantido).
- Gravação da seção antes dos itens, em igualdade exata; `23505` do índice vira a frase; outro `23505` não: AdminHomePage.test.tsx (`toHaveBeenCalledWith` exato, `invocationCallOrder`, os dois `23505`) e useAdminHomeSections.test.ts (`update` com `toEqual({ config, campaign_id })`). Morde.
- `applyDraft` leva a campanha à prévia: applyDraft.test.ts (3 casos) mais `draftChanged` (3 casos). Morde. O caso `data-campanhas` de AdminHomePage.test.tsx passaria sem a mudança, porque a seção já vem com `c-natal`, mas o de applyDraft.test.ts cobre o comportamento.
- Guardas: previaUnica.test.ts e animacaoRespeitaMovimento.test.ts estendidos; CampaignOffersEditor.test.tsx invertido (o registro agora exige `Body` e `refusal`). `buscaDeProdutoComDonoUnico` e `toNewItems` não foram tocados.
- Probe: probes/03-gravacao-do-painel.sh, 12 checagens. Cada uma compara valor exato e o `exit $falhas` reprova se alguma falhar.
- Fatia de `sem mutação` (o probe): pela leitura as asserções mordem. A ordem seção → itens é a do script e não é medida; o que a prova é o `invocationCallOrder` em AdminHomePage.test.tsx.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | seletor `radiogroup` com rádios nativos e a frase da campanha usada | sim | Design pede "seletor com rótulo acessível"; a régua 3 de BUS-23 é sobre catálogo de produto, não se aplica | sim |
| 2 | sem `maxLength`; `CharCounter` mais a recusa de `core` | sim | CA-01.6 pede a recusa "com o motivo e o número", que `maxLength` tornaria inalcançável | sim |
| 3 | hooks em `entities/campaign/api/campaignMarks.ts` e regra e frases em `model/campaignPieces.ts` | sim | Contrato admite `entities/campaign`; a tarefa 04 (linha 43) já cita esses nomes | sim (04 propagada) |
| 4 | peças por id com todas as variações; `campaignLowersPrice(base_price, original_price, variants, percent)` | sim | mapProduct.ts:257 chama a mesma função; RLS `product_variants_public_read` (migration 20260801120400) entrega todas as variações de peça ativa | sim |
| 5 | ordem apagada → fora do ar → fora da campanha → não barateada → no ar | sim | nada a contradiz | sim |
| 6 | uma conferência por campanha, nos nomes acumulados; falha não tira nada; apagada = `product_id` nulo | sim | FK `home_section_items.product_id … on delete set null` (migration 20260815120000:98); CA-04.3 e CA-03.6 | sim |
| 7 | busca só com campanha e marcações lidas | sim | "Não permita escolher peça não marcada" | sim |
| 8 | campanha usada não é cobrada na `refusal`; o seletor a desabilita e a página traduz o `23505` | sim | CA-02.6 só exige a frase na colisão; D-05 | sim |
| 9 | `fetchSections` devolve `HomeSection[] \| null`; `useCampaigns` na página | sim | Mudança aditiva. Os consumidores são só AdminHomePage e o próprio hook (o `useEffect` não usa o retorno) | sim |
| 10 | `updateSectionConfig(id, config, campaignId?)`; `HomeWriteError.code?` | sim | Contrato pede "Grave `{ config, campaign_id }`". Payload das outras seções provado em AdminHomePage.test.tsx | sim |
| 11 | `SectionEditorProps` com três props obrigatórias; `refusal` com terceiro argumento | sim | O único teste que monta editor fora do casco é CategoryListEditor.test.tsx (grep de `onConfigChange` em testes), e foi ajustado | sim |
| 12 | `permitidos` e `rotuloDoConjunto` no `ProductSearchField` e em `OpcoesDaBusca`; lista vazia não oferece nenhuma peça | sim | F11; Contrato "o denominador `disponiveis` respeita o recorte" (ProductSearchField.tsx:167) | sim |
| 13 | `ordinalF` | sim | packages/core/CLAUDE.md: "`ordinalF` nasceu em `carousel.ts`… o `sectionRefusals.ts` do painel reexporta o de `core`"; o editor importa dali | sim |
| 14 | agendada mostra a nota da prévia; encerrada ou desligada mostra o motivo; id desconhecido vale como sem campanha | sim | CA-05.2; `campaignOffersHiddenReason` de `core` trata status nulo como sem campanha | sim |
| 15 | a atual fora da lista entra ordenada pelo início; relógio `Date.now()` por abertura | sim | CA-02.1 "na ordem do início" | sim |
| 16 | subir e descer como `Button` `h-11 w-11` com `aria-label`; selos por peça | sim | Design D-01 | sim |

## Não conferido

- `.specs/work-items/103-joias-em-oferta-configuravel/` inteira está `??` (sem intent-to-add): o probe `probes/03-gravacao-do-painel.sh` e `tasks/04-linha-do-bloco-e-bandeja.md` não têm baseline. O probe foi julgado inteiro, pelo escopo da tarefa. Na 04 só conferi a linha 43, a do contrato que a 03 propaga. Fica sem prova que a propagação mexeu só nas afirmações que a 03 tornou falsas e em nada mais do arquivo.
- Execução: testes, `tsc`, lint e o probe (o relato de 12 ok vem do implementador) não foram rodados.
- RNF-04 (390 px e fonte a 200 %) depende de navegador; fica com a Validation.
- O `message` de um `23505` real do PostgREST contendo o nome do índice está provado só pelo probe, que não rodei.
- Instruções lidas: CLAUDE.md › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas (as linhas de previaUnica, animacaoRespeitaMovimento, toNewItems, buscaDeProdutoComDonoUnico e as relacionadas à Home), › Baselines · apps/backoffice/CLAUDE.md › Molde dos formulários, › `/admin/home` — a composição, › O editor de "Produtos em destaque", › O editor da "Lista de categorias", › A busca de produto, › Gravar NÃO desmonta a tela, › O movimento do painel, › A ponte da prévia · packages/core/CLAUDE.md › cabeçalho, › Quando um código pertence a este pacote, › Pureza, › Os módulos, › `home`, › Convenções de tipo (as outras seções de módulos alheios à tarefa não foram lidas) · licoes-qa.md (inteiro).

## T03 — pd-impl-task · done · agente a126e2194d2eb75f0

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/03-editor-do-bloco-no-painel.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 17 | Quando a leitura das peças escolhidas falha, o editor mostra um aviso (`pecas-sem-conferencia`): não conseguiu conferir se as peças estão no ar e se a campanha baixa o preço delas, então não sabe quais aparecem; o motivo do banco vai junto. Enquanto a leitura carrega, mostra `pecas-conferindo`. Os dois avisos só aparecem quando as marcações já foram lidas sem erro. A falha e a carga das marcações continuam com o aviso que já tinham (`marcacoes-com-erro`, `marcacoes-carregando`), sem segunda mensagem. | Esconder os avisos sem dizer nada (o comportamento de antes, que é o defeito); bloquear a gravação. | Uma leitura que falha não pode passar por "todas as peças aparecem" (licoes-qa [estado de falha]). Ela informa, não muda o que se grava, por isso não bloqueia. | Só o editor (`CampaignOffersEditor.tsx`). O hook não mudou. A tarefa 04 consome o mesmo `error` e `loading` de `useCampaignPiecesState`. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 7b | A leitura das peças escolhidas que falha é dita na tela (e nenhum aviso de "fora do ar" aparece no lugar); enquanto carrega, a tela diz que está conferindo | frontend | apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.test.tsx | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103

## Arquivos alterados

apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx — alterado
apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.test.tsx — alterado

## Verificação

- Testes, pelo comando de `PROJECT.md` › Comandos de verificação (`pnpm --filter @estrelinha/backoffice exec vitest run <arquivos> --testTimeout=20000`): `CampaignOffersEditor.test.tsx`, `previaUnica.test.ts`, `animacaoRespeitaMovimento.test.ts` e `AdminHomePage.test.tsx` passaram, 175/175. Os dois casos novos falharam antes da correção e passaram depois.
- Tipos, pelo comando de `CLAUDE.md` › Comandos (`npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`): 7 erros, todos em `ProposalStateBadge.test.tsx`, como no baseline. Nada novo.
- `npx eslint` nos dois arquivos alterados: exit 0.
- Instruções lidas: as mesmas da implementação.

## Divergências e descobertas

nada

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (› Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções, › Os guardas — linhas dos guardas citados, › Baselines) · apps/backoffice/CLAUDE.md (› Molde dos formulários, › /admin/home — a composição, › Editor de "Produtos em destaque", › Lista de categorias, › A busca de produto, › Gravar NÃO desmonta a tela, › O movimento do painel, › A ponte da prévia) · packages/core/CLAUDE.md (inteiro) · .specs/project/PROJECT.md (› Comandos de verificação, › Ambiente local)
Testes escritos:
  - campos, contador e seletor com rótulo — CampaignOffersEditor.test.tsx (Conteúdo)
  - opções na ordem com estado; a atual encerrada/desligada; a tomada desabilitada com posição e título — CampaignOffersEditor.test.tsx (Campanha — as opções)
  - sem campanha a busca some e diz por quê; com campanha só as marcadas; contador, vazio e "já está no bloco" dentro do recorte — CampaignOffersEditor.test.tsx (Peças) + ProductSearchField.test.tsx (`permitidos`) + core search.test.ts
  - sem campanha e campanha apagada com a mesma frase — CampaignOffersEditor.test.tsx (Sem campanha)
  - troca de campanha tira as peças não marcadas e diz quais; Cancelar desfaz — CampaignOffersEditor.test.tsx (Trocar a campanha)
  - ao abrir: as tiradas saem e o editor abre alterado; leitura das marcações falhando ⇒ nada sai e avisa; a apagada é nomeada — CampaignOffersEditor.test.tsx (Ao abrir)
  - avisos "não barateia", "saíram do ar" e agendada; leitura das peças falhando ou carregando é dita na tela (correção) — CampaignOffersEditor.test.tsx (Os avisos) + campaignMarks.test.tsx
  - recusa pelo casco real (sem campanha, tetos, peça repetida) — CampaignOffersEditor.test.tsx (A recusa)
  - gravação: seção antes dos itens, payload exato; 23505 do índice ⇒ a frase; outro 23505 não — AdminHomePage.test.tsx + useAdminHomeSections.test.ts + campaignOffersTaken.test.ts
  - applyDraft leva a campanha — applyDraft.test.ts
  - guardas: previaUnica, buscaDeProdutoComDonoUnico, animacaoRespeitaMovimento, toNewItems (inalterado); CampaignOffersEditor.test.tsx invertido
  - probe local — probes/03-gravacao-do-painel.sh
  - sem cobertura: RNF-04 (390 px e fonte a 200 %), que só se mede no navegador (fica com a Validation)
Verificações: tsc backoffice 7 (= baseline), core 11 (= baseline), store 0; suítes core 6240, backoffice 5521, store 7854, todas exit 0 (implementação); na correção, os 4 arquivos afetados 175/175 e o tsc do backoffice de novo em 7; eslint sem erro; probe local 12 ok / 0 falhas
Árvore de trabalho: 28 arquivos (6 criados, 22 alterados) em packages/core/src/product-search, apps/backoffice/src/{entities/campaign, entities/home, entities/product/ui, features/home-composition, pages/admin, shared/lib/__tests__}, o probe 03 e a linha do Contrato da tarefa 04; a correção tocou só CampaignOffersEditor.tsx e o teste dele; nada commitado
Citações conferidas: 18 abertas ao usar; uma deslocada poucas linhas (useAdminProducts:265-272, perto de 263); types.ts:232-238 aponta o label_snapshot, não a frase "saiu do ar"; nenhuma morta
Propagado: 04 — a linha do Contrato "hook das marcações e estado das peças escolhidas" com os nomes e as formas reais (useCampaignMarks, useCampaignPiecesState, os estados por peça, piecesOffAirText/piecesNotLoweredText/piecesOutOfCampaignText)
```

## T04 — pd-impl-task · review · agente acf397ca196c04f32

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/04-linha-do-bloco-e-bandeja.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O bloco sem campanha, e o bloco cuja campanha não está entre as lidas (apagada), mostram `CAMPAIGN_OFFERS_NO_CAMPAIGN` **mesmo desligados**. Com campanha escolhida, o motivo do estado (agendada, encerrada, desligada) só aparece com o bloco ligado | Mostrar o motivo da campanha também com o bloco desligado; ou seguir só a regra geral da linha (aviso só para seção ligada) | F2 e CA-02.4 pedem que a linha peça a escolha do bloco novo, que nasce desligado. Para o resto, a linha segue a regra `HOME-09` das outras: em seção desligada, "Desligada" já responde | `HomeSectionRow.tsx` (linha do bloco); a Validation, ao conferir a linha |
| 2 | Enquanto as campanhas carregam ou se a leitura falha, a linha diz "lendo a campanha…" ou "não foi possível ler a campanha" e não mostra aviso | Usar `campaignOffersHiddenReason(id, null)`, que daria "sem campanha" | É a lição de QA [estado de falha], e é o mesmo critério do editor (03) | `HomeSectionRow.tsx` |
| 3 | O resumo é `Campanha “<nome>” · <campaignStatusLine>`. Não usei a pílula `CampaignStatusPill` nem o título do bloco | Pôr a pílula ao lado do resumo; ou citar o título da dona | A frase do estado tem dono (`core/campaigns/text.ts`) e embrulha dentro do `line-clamp-2`. Uma pílula `shrink-0` a mais na linha estreita (rail de 380/560, 390 px) disputaria a largura | `HomeSectionRow.tsx` |
| 4 | O relógio do painel é lido uma vez por montagem da lista (`useState(() => Date.now())` em `HomeSectionList`) e passado às linhas | Um relógio por linha; ou `Date.now()` a cada render | É o mesmo critério do editor do bloco: o estado não pisca enquanto a dona trabalha | `HomeSectionList.tsx` |
| 5 | Os avisos das peças vêm do hook da 03 (`useCampaignPiecesState`) com `piecesOffAirText`, `piecesNotLoweredText` e `piecesOutOfCampaignText`, num subcomponente que só monta quando a campanha do bloco foi encontrada. A falha da leitura é dita ("Não foi possível conferir as peças escolhidas: …") | Contar pelo `droppedCount` de `useAdminResolvedHome`, que não nomeia a peça; ou ler as peças com a campanha apagada, o que marcaria toda peça como "fora da campanha" | CA-04.1 pede que a linha nomeie a peça, e a regra "barateia?" é do hook e de `core`. Incluí também as peças fora da campanha porque o objetivo pede "quais peças escolhidas não aparecem" | `HomeSectionRow.tsx`; a linha passa a ler `product_campaigns` e `products` por bloco com campanha (a chave de cache é a mesma do editor) |
| 6 | Novas props de `HomeSectionList`: `campaigns`, `campaignsLoading` e `campaignsError`, todas opcionais. `AdminHomePage` repassa o que já lia de `useCampaigns()` | A linha chamar `useCampaigns()` sozinha | O contrato da tarefa diz que a linha recebe "seção, campanhas". Props opcionais não mexem nos outros consumidores e testes da lista | `HomeSectionList.tsx`, `AdminHomePage.tsx` |
| 7 | Os avisos das peças usam ícone âmbar (`text-estrelinha-admin-amber`, que já existe no painel) e texto `text-muted-foreground`. O aviso de ausência continua `text-destructive`. O texto dos avisos passou a ir num `<span class="min-w-0 break-words">`, também nas outras linhas | Texto em âmbar | O texto âmbar poderia esbarrar no contraste vigiado por `adminTokens`. O `break-words` cumpre a obrigação de 390 px (texto longo embrulha dentro do próprio container) | `HomeSectionRow.tsx`; nenhum teste dependia da forma do `<p>` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | A bandeja acrescenta "Joias em oferta" desligado e sem campanha (payload sem `campaign_id`, `active: false`) | aplicação (hook) | `apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts` › "Joias em oferta nasce DESLIGADO e SEM campanha…" | sim | vermelho |
| 1b | A bandeja oferece o segundo "Joias em oferta" | frontend | `HomeBlockTray.test.tsx` › "Joias em oferta é REPETÍVEL…" (escrito pela 02; conferido, verde) | sim | não se aplica (teste da 02, não meu) |
| 2 | A linha diz a campanha e o estado. Fora de vigência diz que o bloco não vai aparecer e por quê (agendada, encerrada, desligada) | frontend | `HomeSectionList.ofertas.test.tsx` › "a campanha e o estado" (4 casos) | sim | — |
| 3 | Sem campanha, ou com a campanha apagada, a linha mostra a mesma frase pedindo a escolha, mesmo ligado. O bloco novo, desligado e sem campanha, também mostra a frase | frontend | idem › "sem campanha e LIGADO", "a campanha apagada…", "o bloco novo da bandeja" | sim | — |
| 3b | Carregando ou com falha na leitura das campanhas, a linha não diz "sem campanha". Bloco desligado com campanha escolhida não ganha aviso | frontend | idem (3 casos) | sim | vermelho (os 3 casos passaram de primeira; cada guarda quebrado deu vermelho) |
| 4 | A linha conta "1 das 3 saiu do ar" nomeando a peça, diz qual peça a campanha não barateia e mostra a falha da leitura | frontend (hook real sobre o dublê do client) | idem › "as peças escolhidas que não aparecem" (3 casos) | sim | — |
| 5 | A linha acende ao trocar só a campanha (assinatura com `campaign_id`) | frontend | idem › "trocar só a campanha acende a linha, e só ela" | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103

## Arquivos alterados

apps/backoffice/src/features/home-composition/ui/HomeSectionRow.tsx alterado
apps/backoffice/src/features/home-composition/ui/HomeSectionList.tsx alterado
apps/backoffice/src/pages/admin/AdminHomePage.tsx alterado
apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts alterado
apps/backoffice/src/features/home-composition/ui/HomeSectionList.ofertas.test.tsx criado

## Verificação

- Baseline de tipos capturado antes da primeira fatia (`npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`, de `CLAUDE.md` §Comandos): 7 erros, todos em `ProposalStateBadge.test.tsx` (3 TS2304 e 4 TS2593).
- Um arquivo de teste por fatia, com `pnpm --filter @estrelinha/backoffice exec vitest run <arquivo> --testTimeout=20000` (de `PROJECT.md` › Comandos de verificação): verde nas duas fatias, 14/14 no arquivo novo.
- Testes vizinhos: `home-composition` inteiro, `AdminHomePage.test.tsx`, `entities/home`, `animacaoRespeitaMovimento` e `adminTokens` passaram (27 arquivos, 662 testes).
- Tipos no fecho, com o mesmo comando (de `CLAUDE.md`): 7 erros, os mesmos do baseline por arquivo, código e quantidade. Nada novo.
- `npx eslint` nos 5 arquivos tocados (de `CLAUDE.md` §Baselines): exit 0.
- Verificação mínima (de `PROJECT.md`, que remete a `CLAUDE.md` §Baselines):
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: exit 0, 311 arquivos e 5538 testes.
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: exit 0, 416 arquivos e 7854 testes.

Instruções lidas: `CLAUDE.md` › Feature-Sliced Design, › O "defeito 01", › Os guardas (só as linhas de interesse ao painel e à Home), › Baselines, e também › Comandos, › Convenções e o cabeçalho · `apps/backoffice/CLAUDE.md` › `/admin/home` — a composição, › Gravar NÃO desmonta a tela (VIV-05), › O movimento do painel · `packages/core/CLAUDE.md` › cabeçalho, › Quando pertence, › Pureza, › Os módulos, › `home`, › Convenções de tipo (as seções de outros módulos não foram lidas) · `.specs/project/PROJECT.md` › Comandos de verificação · `licoes-qa.md`.

## Divergências e descobertas

- **Ordem das fatias:** os 14 casos de `HomeSectionList.ofertas.test.tsx` foram escritos de uma vez e vistos vermelhos juntos (11 vermelhos, 3 verdes de primeira). A implementação veio depois, num passo só. A fatia 1 seguiu o ciclo um teste por vez.
- **Contrato vs. o que usei:** o contrato manda consumir `useAdminResolvedHome`/`droppedCount`. A linha do bloco usa o estado das peças do hook da 03, porque `droppedCount` não nomeia a peça (decisão 5). `useAdminResolvedHome` continua alimentando a lista sem mudança.
- **Resumo antigo era falso:** o texto "o título e os percentuais vêm da campanha em vigência" já não valia desde a 02, porque cada bloco tem a sua campanha. Foi substituído.
- **Fatia 1 já existia:** `createSection` já inseria sem `campaign_id`, e a bandeja já oferecia o segundo bloco desde a 02. Não precisou mudar código; o check de mutação confirmou que a asserção morde.
- **Citações:** nenhuma deslocou e nenhuma estava morta. `useAdminResolvedHome.ts:124-142` bate com o ramo de produto.
- **Sem execução contra o banco:** nenhum comportamento desta tarefa foi conferido contra o banco local. As leituras são as do hook da 03, aqui sobre o dublê do client.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, por seção: Feature-Sliced Design, O "defeito 01", Os guardas, Baselines, Comandos, Convenções), apps/backoffice/CLAUDE.md (/admin/home — a composição, Gravar NÃO desmonta a tela, O movimento do painel), packages/core/CLAUDE.md (cabeçalho, Quando pertence, Pureza, Os módulos, home, Convenções de tipo)
Testes escritos: 
  - campanha e estado; fora de vigência, que não vai aparecer e por quê; sem campanha ou apagada, a mesma frase mesmo ligado → apps/backoffice/src/features/home-composition/ui/HomeSectionList.ofertas.test.tsx ("a campanha e o estado")
  - "N das M saíram do ar" nomeando a peça, e as não barateadas → idem ("as peças escolhidas que não aparecem")
  - acende ao trocar a campanha (assinatura com campaign_id) → idem ("acende ao trocar a campanha")
  - bandeja: segundo "Joias em oferta" oferecido (HomeBlockTray.test.tsx da 02, conferido); o novo nasce desligado e sem campanha → apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts, e a linha pedindo a escolha → HomeSectionList.ofertas.test.tsx ("o bloco novo da bandeja")
  - nada ficou sem cobertura
Verificações: tsc backoffice 7 erros, igual ao baseline (todos em ProposalStateBadge.test.tsx); eslint nos arquivos tocados limpo; suíte backoffice 311 arquivos / 5538 testes, exit 0; suíte store 416 / 7854, exit 0
Árvore de trabalho: alterados HomeSectionRow.tsx, HomeSectionList.tsx, AdminHomePage.tsx, useAdminHomeSections.test.ts; criado HomeSectionList.ofertas.test.tsx; nada commitado
Citações conferidas: 9 abertas (HomeSectionRow.tsx, HomeSectionList.tsx, campaignOffers.ts, entities/campaign: campaignMarks.ts e campaignPieces.ts, useAdminResolvedHome.ts:124-142, HomeBlockTray.tsx e o teste dele, CampaignStatusPill.tsx, core/campaigns/text.ts › campaignStatusLine); nenhuma deslocou, nenhuma morta
```

## T04 — pd-impl-review · done · agente abd02af2dd31cb4e7

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/04-linha-do-bloco-e-bandeja.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a linha diz campanha, estado e o motivo de não aparecer, inclusive sem campanha | `HomeSectionRow.tsx`, `leituraDaCampanha`: o resumo é `Campanha “nome” · campaignStatusLine`, o aviso vem de `campaignOffersHiddenReason(id, estado)` e, sem id ou com id fora da lista lida, de `CAMPAIGN_OFFERS_NO_CAMPAIGN`. `avisoDeAusencia` usa `ofertas.aviso` quando o bloco é campaign_offers | sim |
| a linha nomeia as peças fora do ar e as não barateadas | `HomeSectionRow.tsx`, `PecasDoBloco`: `useCampaignPiecesState` com `piecesOffAirText`, `piecesNotLoweredText` e `piecesOutOfCampaignText`, todos da 03 | sim |
| a bandeja acrescenta outro bloco "Joias em oferta", desligado e sem campanha | O `insert({ type, position, active: false, config: {} })` já existe em `useAdminHomeSections.ts:185`. A bandeja repetível tem o teste da 02 (`HomeBlockTray.test.tsx:206`). O teste novo está em `useAdminHomeSections.test.ts` | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `HomeSectionList.ofertas.test.tsx` e `useAdminHomeSections.test.ts` (ver Testes) | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- `motion-reduce:` na mesma linha de classe que move: o diff não acrescenta nenhuma classe `transition-*` ou `animate-*`. As duas linhas continuam no escopo de `animacaoRespeitaMovimento.test.ts:43-44`. Cumprida, sem nada a aplicar.
- Tom memorial nos textos: os avisos vêm de `core/home/campaignOffers.ts` e de `entities/campaign/model/campaignPieces.ts`. Os textos fixos novos da linha ("sem campanha", "lendo a campanha…", "não foi possível ler a campanha", "Não foi possível conferir as peças escolhidas: …") não têm urgência, escassez nem exclamação. Cumprida.
- 390 px: o texto de cada aviso vai num `<span className="min-w-0 break-words">`, tanto no aviso de ausência quanto em `PecasDoBloco`. O resumo mantém o `line-clamp-2` que já existia. A largura real em navegador fica para a Validation. Aplicada.

## Testes

- A linha diz a campanha escolhida e o estado; fora de vigência, que o bloco não vai aparecer e por quê; sem campanha ou com a campanha apagada, a mesma frase pedindo a escolha, mesmo ligado. Coberto em `HomeSectionList.ofertas.test.tsx:151-212`, nos casos em vigência, agendada, encerrada, desligada, sem campanha ligado e id apagado. As frases são comparadas por igualdade de texto (`toBe`), não por `contains`. Os casos de carregamento e de falha das campanhas também têm teste. Morde.
- A linha conta "N das M saíram do ar" nomeando a peça e diz quais peças a campanha não barateia. Coberto em `HomeSectionList.ofertas.test.tsx:252-261`, com igualdade exata de "1 das 3 saiu do ar: “Anel Lua”…" e da frase de "Brinco Sol". Os dados passam pelo hook verdadeiro sobre o dublê do client. Morde.
- A linha acende ao trocar a campanha (assinatura com `campaign_id`). Coberto em `HomeSectionList.ofertas.test.tsx:292-308`, onde só o `campaign_id` muda. A assinatura antiga (`active`, `position`, `config`, `items`) não acenderia a linha, e o teste confere que só uma linha acende e que ela apaga depois de `ACENDE_MS`. Morde.
- A bandeja oferece o segundo bloco e o novo nasce desligado e sem campanha, com a linha pedindo a escolha:
  - A oferta do segundo bloco é o teste da 02, `HomeBlockTray.test.tsx:206`, que existe. É a fatia sem mutação, e a asserção foi lida.
  - O nascimento desligado e sem campanha está em `useAdminHomeSections.test.ts`, com `toEqual` exato do insert, que recusaria um `campaign_id: null` ou um `active: true`.
  - O pedido de escolha na linha está em `HomeSectionList.ofertas.test.tsx:214-220`: o switch aparece desmarcado e o aviso é igual a `SEM_CAMPANHA`.

  Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O bloco sem campanha (ou com a campanha apagada) avisa mesmo desligado; com campanha, o motivo só aparece com o bloco ligado | sim | CA-02.4 e F2 pedem o aviso do bloco novo, que nasce desligado. CA-02.3 cita `HOME-09`, e o comentário já existente em `HomeSectionRow.tsx` diz: "seção LIGADA que mesmo assim não vai aparecer. A desligada não precisa de aviso". O estado continua no resumo mesmo com o bloco desligado | sim |
| 2 | Enquanto as campanhas carregam ou se a leitura falha, a linha não mostra aviso nem "sem campanha" | sim | Lição de QA [estado de falha]. A doc de `campaignOffersHiddenReason` diz: "Quem chama só pergunta depois de ler as campanhas: 'ainda carregando' não é 'sem campanha'". O bloco sem id avisa antes do check de carregamento, o que é correto | sim |
| 3 | O resumo usa `campaignStatusLine` em vez da pílula | sim | A tarefa, em `Siga a forma de`, aceita `campaignStatusLine` como exemplar do estado | sim |
| 4 | O relógio é lido uma vez por montagem da lista | sim | A Decisão diz "relógio do painel, como o resto do painel"; nada no arquivo de instruções contradiz | sim |
| 5 | Os avisos das peças vêm do hook da 03 num subcomponente; a falha da leitura é dita; as peças fora da campanha também são listadas | sim | `Não faça`: "pergunte ao dono de `core/campaigns` pelo hook da 03", e a regra "barateia?" não foi reescrita. O hook usa as chaves `admin-campaign-marks` e `admin-campaign-pieces`, compartilhadas com o editor | sim. A `QueryClientProvider` existe em `app/App.tsx:49`, e os testes antigos da lista não montam `PecasDoBloco`, porque `campaigns` vale `[]` por padrão |
| 6 | Props opcionais `campaigns`, `campaignsLoading` e `campaignsError` em `HomeSectionList`, repassadas por `AdminHomePage` | sim | O contrato diz "Entra: seção, campanhas". `AdminHomePage` já chamava `useCampaigns()` | sim |
| 7 | Ícone âmbar, texto `text-muted-foreground`, e `<span min-w-0 break-words>` também no aviso das outras linhas | sim | O token `estrelinha-admin-amber` é vigiado por `adminTokens.test.ts` e o comentário de origem diz que ele já existe. A troca para span só embrulha o texto | sim |

## Não conferido

- `HomeSectionList.ofertas.test.tsx:263-268` ("sem nenhuma peça fora, nenhum aviso de peça") espera só a chamada a `products` aparecer em `h.calls`, e não o fim da leitura. Pela leitura do código, a asserção de ausência pode rodar antes de os estados chegarem. Esse caso não consta do bloco `Testes`, e o efeito real só a execução mostra.
- `PecasDoBloco` monta também para bloco com campanha e sem peça escolhida. Nesse caso, uma falha na leitura das marcações mostraria "Não foi possível conferir as peças escolhidas" mesmo sem nenhuma peça escolhida. O efeito depende de execução, e nenhuma linha da tarefa trata esse caso.
- A largura em 390 px e a fonte a 200 % (RNF-04) dependem de layout real (jsdom devolve 0); ficam para a Validation.
- Os testes passarem e a verificação de fechamento só a execução prova.
- Todos os `alterados` aparecem no diff, e `HomeSectionList.ofertas.test.tsx` entrou com intent-to-add (`A`), então nenhum ficou sem baseline.

Instruções lidas: `CLAUDE.md` › Feature-Sliced Design (com Alias de import), › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas (só as linhas de `animacaoRespeitaMovimento`, `adminTokens` e `previaUnica`), › Baselines (o cabeçalho); `apps/backoffice/CLAUDE.md` › `/admin/home` — a composição, › Gravar NÃO desmonta a tela (VIV-05), › O movimento do painel; `packages/core/CLAUDE.md` › introdução, › Quando um código pertence a este pacote, › Pureza, › Os módulos, › `home` — derivação e contrato da prévia. Lido também `/Users/rafael.santos/.claude/feature/-Users-rafael.santos-Projetos-uma-estrelinha-store/licoes-qa.md`.

## T07 — pd-impl-task · review · agente a1117b677f169e493

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/07-bug-3-home-rola-de-lado-no-celular.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Causa: o `<span className="sr-only">De </span>` do preço riscado do card de campanha é `position: absolute` e não tem ancestral posicionado dentro da fita. O bloco de contenção dele fica fora do trilho `overflow-x-auto`, então o overflow não o recorta: na posição estática (x≈503 no 3º card) ele alarga o documento. A correção foi `relative` no `<span>` do preço riscado em `apps/store/src/entities/product/ui/ProductCard.tsx` (ramo `campanha && hasDiscount`). O texto escondido continua lá, agora preso ao próprio preço | (a) `relative` no trilho do `ProductCarousel` (`LAYOUTS`): mudaria a classe da forma `row`, que é "imóvel" e está presa por token exato em `ProductCarouselLayout.test.tsx`. (b) Apagar o `sr-only`: a tarefa proíbe. (c) `overflow-hidden`/`contain` no bloco ou na seção: esconde o sintoma sem conter a causa | A causa está no card. É a menor superfície: só aquele `<span>` muda. `relative` sem deslocamento não move nenhum pixel, e o card é o mesmo em toda fileira | Todo `ProductCard` de peça em campanha com preço riscado, na Home, nas listagens e em outras fileiras. Nenhuma mudança visual esperada. Quem confirma é o reteste do QA em navegador |
| 2 | Alterei o card em `entities/product/ui/ProductCard.tsx`. O Contrato da tarefa situa "o cartão da peça" sob `widgets/product-carousel/`, mas o arquivo real é outro | Mexer em `widgets/product-carousel/` só para cumprir o caminho do Contrato | O Contrato autoriza alterar o card se a causa estiver nele, e ela está. Só o caminho citado estava impreciso | nenhum além do #1 |
| 3 | Teste novo em arquivo próprio (`CampaignOffersRecorte.test.tsx`), com o `ProductCard` de verdade e peças montadas por `mapDbToProduct`. Ele confere por classe que todo `.sr-only` da fita tem um ancestral posicionado dentro dela (vale também se a própria fita for posicionada) | Acrescentar o caso a `CampaignOffers.test.tsx` | Esse arquivo dubla o `ProductCard` com uma `div`, então o caso não teria o `sr-only` | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | A fileira do bloco contém o seu conteúdo: o "De " escondido de cada preço riscado fica preso a um ancestral posicionado dentro da fita, conferido por classe | componente | `apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffersRecorte.test.tsx`. Falhou antes do fix ("sem ancestral posicionado dentro da fita"), com a âncora de 3 "De " passando, e passou depois | sim | — |
| 2 | Os guardas que leem a fileira e o card seguem passando (`ProductCarouselLayout.test.tsx`, `cardSkeletonBox.test.ts`, `homeComposition.test.tsx`) | fonte / componente | testes existentes, sem edição | sim | — (guardas existentes, rodados como regressão: não é teste novo, e não houve check) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103

## Arquivos alterados

apps/store/src/entities/product/ui/ProductCard.tsx alterado
apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffersRecorte.test.tsx criado

## Verificação

- Um arquivo de teste (do `PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/store exec vitest run src/widgets/campaign-offers/ui/__tests__/CampaignOffersRecorte.test.tsx --testTimeout=20000`. Antes do fix: exit 1, 1 falha pela asserção esperada. Depois: exit 0, 1/1.
- Guardas e testes vizinhos (mesmo comando, em lote): os testes `ProductCard*`, `cardSkeletonBox.test.ts`, `widgets/product-carousel`, `widgets/campaign-offers`, `widgets/home-collections`, `pages/__tests__/homeComposition.test.tsx` e os guardas de disco `accentText`, `paginaDeOpcaoComDonoUnico`, `marcacaoPorOpcaoComDonoUnico`, `medicaoComDonoUnico`, `renditionSingleOwner`, `touchTarget` e `contrast`. Exit 0, 20 arquivos, 433 testes.
- Tipos (`CLAUDE.md` › Comandos): `npx tsc --noEmit -p apps/store/tsconfig.app.json`. Exit 0, 0 erros. Não veio `baseline` no briefing; usei o de `CLAUDE.md` › Baselines (store 0), e não há mudança contra ele.
- Verificação mínima (`CLAUDE.md` › Baselines, suíte do workspace tocado): `pnpm --filter @estrelinha/store test --testTimeout=20000`. Exit 0, fora de pipe: 417 arquivos, 7855 testes.
- Extra: `npx eslint` nos dois arquivos tocados. Exit 0.

Instruções lidas: `CLAUDE.md` › título e abertura, › Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/store/CLAUDE.md` › abertura, › Design system, › Mobile, › A home não salta, › A Home é dado, › Produtos em destaque / `ProductCarousel` (e Modo prévia); `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local; `licoes-qa.md` (a lição do "De … por …" foi respeitada: o texto continua lá).

## Divergências e descobertas

- O Contrato cita o card sob `apps/store/src/widgets/product-carousel/`, mas o card mora em `apps/store/src/entities/product/ui/ProductCard.tsx`. A causa estava nele (ver #2).
- A medida real fica para o reteste do QA: `scrollWidth` da página em 390 px, a 100 % e a 200 % de fonte. jsdom não mede layout, então o teste é proxy por classe, como a tarefa prevê.
- O mesmo padrão (`sr-only` absoluto sem ancestral posicionado próximo) existe em `ProductInfo.tsx:123,142` e em `buy-together/AddonPrice.tsx:37`. Não sei se algum deles fica dentro de um contêiner que rola, e não mexi: está fora do escopo.
- Nada a propagar: a tarefa 08 não cita o card nem a fileira. Nenhuma tarefa fechada caducou.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 07
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (por seção: Comandos, Feature-Sliced Design, O "defeito 01", Convenções, Os guardas, Baselines); apps/store/CLAUDE.md (por seção: Mobile, A Home é dado, Produtos em destaque / ProductCarousel, A home não salta)
Testes escritos: a fileira contém o seu conteúdo — apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffersRecorte.test.tsx (vermelho antes do fix, verde depois); os guardas da fileira e do card (ProductCarouselLayout.test.tsx, cardSkeletonBox.test.ts, homeComposition.test.tsx) são existentes e seguem verdes. Sem cobertura: a medida real em navegador (scrollWidth em 390 px a 100 % e 200 %), que é do reteste do QA
Verificações: vitest do arquivo novo (vermelho → verde); lote de 20 arquivos de guardas e vizinhos, 433 verdes; tsc da loja com 0 erros (baseline 0); suíte da loja com 7855/7855, exit 0; eslint dos dois arquivos limpo
Árvore de trabalho: apps/store/src/entities/product/ui/ProductCard.tsx (relative no span do preço riscado da campanha); apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffersRecorte.test.tsx (novo)
Citações conferidas: 2 (CampaignOffers.tsx, widgets/product-carousel/). O card citado sob product-carousel está em entities/product/ui/ProductCard.tsx; nenhuma citação morta
```

## T07 — pd-impl-review · done · agente a45b1924ec4e334db

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/07-bug-3-home-rola-de-lado-no-celular.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-003: em 390 px, a 100 % e a 200 % de fonte, a página não rola de lado e só a fileira rola | `apps/store/src/entities/product/ui/ProductCard.tsx:383`: `relative` no `<span>` do preço riscado, no ramo `campanha && hasDiscount`. Antes, nenhum ancestral entre o `sr-only` e a fita (`ProductCarousel.tsx:214-219`, `overflow-x-auto`) tinha posição. O único `relative` do card fica no palco da imagem (`:288`), que não é ancestral do preço. O diagnóstico se sustenta | só execução (reteste em navegador) |
| as outras fileiras da Home seguem iguais (os testes delas passando) | `relative` sem deslocamento nem z-index, e nenhuma classe do `LAYOUTS` mudou | só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `apps/store/src/widgets/campaign-offers/ui/__tests__/CampaignOffersRecorte.test.tsx` cobre o recorte. Os guardas são testes que já existiam e só precisam continuar passando | sim |
| testes dos arquivos alterados, passando — só deles | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- Teste antes do código, com o vermelho declarado no retorno: o teste reprovaria sem o fix. Antes do `relative`, a busca por ancestral posicionado sai da fita: `span` → `div.flex-col` → `div.mt-4` → `Link.block` → `motion.div.group` → vaga → fita, e nenhum deles tem posição. Não vi o retorno do implementador, então não confiro se ele declarou o vermelho (ver Não conferido).
- Guardas de fonte que leem os arquivos tocados seguem passando, sem afrouxar: nenhum guarda foi editado. `cardSkeletonBox.test.ts` compara só as classes que produzem altura, e `relative` não é uma delas. Que eles passem, só a execução prova.
- Texto novo em português, com acento e no tom memorial: cumprida. O comentário em `ProductCard.tsx:378-382` e o nome e o cabeçalho do teste estão em português, sem urgência.

## Testes

- O recorte da fileira, conferido por classe: `CampaignOffersRecorte.test.tsx:115-139`. A asserção morde.
  - Usa o `ProductCard` de verdade, não o dublê de `CampaignOffers.test.tsx`.
  - Confere que o seletor da fita acerta o trilho (o `overflow-x-auto`, linha 127).
  - Uma âncora de 3 `"De "` impede que uma fileira vazia passe em silêncio (linha 131).
  - Para cada `.sr-only`, exige que o primeiro ancestral posicionado exista e esteja dentro da fita, ou seja a própria fita (`fita.contains`).
  - Sem o fix, a busca chega a `null` e o teste reprova.
- Guardas `ProductCarouselLayout.test.tsx`, `cardSkeletonBox.test.ts` e `homeComposition.test.tsx`: não foram alterados (`git status` mostra só os dois `alterados`). Que passem, só a execução prova.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Causa: o `sr-only` absoluto não tem ancestral posicionado dentro da fita. Correção: `relative` no `<span>` do preço riscado | sim | `ProductCard.tsx:261-288,362-386` e `ProductCarousel.tsx:55-74,214-219`. Fica de pé a proibição da tarefa ("Não troque o `row`/`slider`"), e com ela a regra de `apps/store/CLAUDE.md` › ProductCarousel: `row` é "imóvel" e preso por token exato. Também fica de pé "O texto escondido para leitor de tela continua existindo" | sim. O card é o mesmo em toda fileira, e nenhuma tarefa seguinte em `tasks/` (08) cita `ProductCard`, `sr-only` ou `product-carousel` |
| 2 | Alterar o card em `entities/product/ui/ProductCard.tsx`, embora o Contrato o situe em `widgets/product-carousel/` | sim | `widgets/product-carousel/` só tem `index.ts` e `ui/ProductCarousel.tsx`, e o card vem de `entities/product/index.ts:15`. O Contrato permite alterar "o cartão da peça com o preço riscado" se a causa estiver nele | sim |
| 3 | Teste em arquivo próprio, com o card real montado por `mapDbToProduct` | sim | `CampaignOffers.test.tsx:38` dubla `@/entities/product/ui/ProductCard`, então ali não haveria `sr-only`. O `eslint-disable no-explicit-any` repete o de `CampaignOffers.test.tsx:18`, que é convenção já existente | sim |

## Não conferido

- O retorno do implementador não veio no briefing. Por isso não confiro se ele declarou o vermelho antes do fix (Obrigações, primeiro item). A leitura da asserção mostra que o teste reprovaria sem o fix.
- O que só a execução prova:
  - que o teste passa, com os mocks, `mapDbToProduct` entregando `campaign` e `framer-motion` em jsdom;
  - que os guardas citados seguem verdes;
  - a medida real do `scrollWidth` em 390 px, a 100 % e a 200 % de fonte, que é do reteste do QA.
- Ambos os `alterados` aparecem no diff, e o arquivo novo como `A`: houve baseline, e nada ficou sem prova por falta dele.

Lições de QA conferidas: `/Users/rafael.santos/.claude/feature/-Users-rafael.santos-Projetos-uma-estrelinha-store/licoes-qa.md`. A lição de acessibilidade "De … por …" continua cumprida, porque o `sr-only` ficou.

Instruções lidas:
- `CLAUDE.md` › Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório. Em › Os guardas, só as linhas que citam o card ou a fileira (`cardSkeletonBox`, `ProductCarouselLayout`). A seção › Baselines não foi lida por inteiro.
- `apps/store/CLAUDE.md` › Mobile — o que quebra e não grita, › Produtos em destaque / `ProductCarousel` tem TRÊS formas. Ficaram sem leitura integral › A Home é dado e › A home não salta: só passei pelo índice e por trechos.

## T05 — pd-impl-task · review · agente a6b6510988b4295f0

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/05-bugs-1-4-barra-do-editor-do-bloco.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A causa do BUG-001 está em `model/sectionDraft.ts`, um arquivo que o Contrato não lista. Corrigi ali: `draftChanged` e `itemsChanged` agora comparam a curadoria por `curadoriaParaComparar`, que pega as colunas de `toNewItems` e fixa a ordem delas (chaves ordenadas). Com isso, a ordem em que as chaves foram escritas deixa de contar. | (a) Mexer em `HomeSectionEditor.tsx` ou em `CampaignOffersEditor.tsx`. A causa não está em nenhum dos dois, e o Contrato só autoriza mexer neles "se a causa estiver aqui". (b) Reordenar as chaves do objeto que o `ProductPicker` monta. Isso continuaria dependendo da ordem de escrita, e o próximo construtor de item cairia no mesmo erro. | Diagnóstico: o `ProductPicker` monta o item com `product_id` antes de `category_id`. O item relido do banco passa por `toDraftItems`, que põe `category_id` antes. Como `draftChanged` comparava com `JSON.stringify`, o resultado dependia da ordem das chaves e acusava alteração depois de gravar, sempre que a lista tinha peça acrescentada. Isso bate com o QA: só tirar peças e reabrir o editor dão "limpo", porque as duas pontas vêm de `toDraftItems`. `toNewItems` continua sendo o único dono de "o que vai para o banco", e o comparador só fixa a ordem. | O recibo e o selo de pendência de todos os editores da Home que usam `draftChanged`, e a decisão de `AdminHomePage.handleSave` de reescrever a curadoria (`itemsChanged`). Isso corrige também o editor "Produtos em destaque", que usa o mesmo `ProductPicker` e tinha o mesmo defeito latente. Nenhuma tarefa seguinte afirma o contrário. |
| 2 | BUG-004: só acrescentei `flex-wrap` à fila de ações (`Cancelar` e o primário) do `FormPageHeader`. Altura, ordem e `whitespace` dos botões ficaram iguais. | `min-w-0` na fila. Deixaria a fila mais estreita que o botão, e o botão estouraria por dentro dela. Também descartei deixar o rótulo do botão quebrar linha, porque mudaria a altura de 40 px, o que o `Não faça` proíbe. | Pela medida do QA, cada botão cabe sozinho em 390 px a 200 % ("Salvar seção" mede 293 px). O que estoura é a fila sem quebra. A linha de fora já tinha `flex-wrap`, então a fila desce para baixo do título e agora quebra por dentro. Os outros consumidores só mudam quando a fila não cabe numa linha. | Os consumidores do `FormPageHeader`: cupom, promoção e editor da Home. Os testes deles passam. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Gravar o bloco com uma peça acrescentada termina com "Salvo" e sem "Alterações não salvas" | componente, jsdom | `CampaignOffersEditor.test.tsx` › "gravar com uma peça acrescentada dá "Salvo" e tira a pendência" | sim (vermelho antes do fix) | — |
| 1b | Mexer num campo depois do "Salvo" devolve a pendência | componente, jsdom | `CampaignOffersEditor.test.tsx` › "mexer num campo depois do "Salvo" devolve a pendência" | sim (vermelho antes do fix) | — |
| 2 | As gravações que já davam "Salvo" continuam dando (só a campanha, sem peças, só tirando peças) | componente, jsdom | `CampaignOffersEditor.test.tsx` › "as gravações que já davam "Salvo" continuam dando…" | sim (verde de primeira: é guarda de regressão) | vermelho (anulei o `'salvo'` em `FormPageHeader`, o teste falhou, restaurei pela cópia e conferi com `cmp`) |
| 3 | A fila de ações do cabeçalho quebra linha em vez de forçar largura | fonte (leitura de classes) | `FormPageHeader.test.tsx` › "a fila de `Cancelar` e do primário quebra linha…" | sim (vermelho antes do fix) | — |
| 3b | A linha de fora também quebra, e a fila desce para baixo do título | fonte (leitura de classes) | `FormPageHeader.test.tsx` › "a linha de fora também quebra…" | sim (verde de primeira) | vermelho (tirei o `flex-wrap` da linha de fora, o teste falhou, restaurei pela cópia e conferi com `cmp`) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103

## Arquivos alterados

apps/backoffice/src/features/home-composition/model/sectionDraft.ts — alterado
apps/backoffice/src/shared/ui/FormPageHeader.tsx — alterado
apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.test.tsx — alterado
apps/backoffice/src/shared/ui/FormPageHeader.test.tsx — alterado

## Verificação

- Um arquivo de teste: `pnpm --filter @estrelinha/backoffice exec vitest run <arquivo> --testTimeout=20000` (fonte: `PROJECT.md` › Comandos de verificação).
  - `CampaignOffersEditor.test.tsx`: 2 falhas antes do fix, 40/40 depois.
  - `FormPageHeader.test.tsx`: 1 falha antes do fix, 26/26 depois.
  - Testes dos arquivos tocados e dos consumidores, juntos (`home-composition`, `shared/ui`, `animacaoRespeitaMovimento`, `folgaDoPalco`, `AdminHomePage`, `AdminCouponFormPage`, `AdminPromotionFormPage`): 43 arquivos, 825 testes, todos passando.
- Tipos: `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (fonte: `CLAUDE.md` › Comandos/Baselines). Deu 7 erros, todos em `ProposalStateBadge.test.tsx` (3× TS2304 e 4× TS2593), que são exatamente os 7 do baseline. Nenhum erro novo.
- Verificação mínima (fonte: `CLAUDE.md` › Baselines, via `PROJECT.md`):
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: exit 0, 311 arquivos e 5543 testes passando.
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: exit 0, 417 arquivos e 7855 testes passando.
- `npx eslint` nos 4 arquivos tocados: exit 0.

Instruções lidas:
- `CLAUDE.md` › Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas (primeira parte lida por inteiro; o resto da tabela filtrado pelas linhas de backoffice e painel), › Baselines
- `apps/backoffice/CLAUDE.md` › Molde dos formulários, › `/admin/home` — a composição, › Gravar NÃO desmonta a tela, › O movimento do painel, › A ponte da prévia
- `packages/core/CLAUDE.md`, por inteiro
- `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local
- `licoes-qa.md`

## Divergências e descobertas

- **Causa raiz fora do Contrato.** O BUG-001 nascia em `sectionDraft.ts` (`draftChanged`/`itemsChanged`), não nos três arquivos listados (decisão 1). `HomeSectionEditor.tsx` e `CampaignOffersEditor.tsx` não foram alterados.
- **Defeito latente da mesma família, que deixei sem corrigir.** Por não estar no bloco `Testes`, só registrei. `draftChanged` ainda compara o `config` com `JSON.stringify`, e o Postgres devolve as chaves do jsonb reordenadas (por tamanho e depois por bytes: `title` antes de `subtitle`). Num bloco novo em que a dona escreva a descrição antes do título, o editor deve seguir mostrando "Alterações não salvas" depois de gravar. Pela mesma regra, `title` vem antes de `subtitle` na releitura, então o caso é escrever primeiro a descrição. Isso só a execução no navegador prova; recomendo que o reteste do QA confira.
- **Também corrigido, sem teste próprio.** O editor "Produtos em destaque" usa o mesmo `ProductPicker` e tinha o mesmo defeito, que a correção resolve. Não escrevi teste para ele, por não ser comportamento deste lote.
- **BUG-004 conferido só pelas classes.** O jsdom não mede layout, então a medida real em 390 × 844 a 200 % fica para o reteste do QA. Ligado à lição de QA "[acessibilidade] a 200 %": com a fila quebrando, o cabeçalho fixo (`sticky top-14`) fica mais alto no celular. Vale o reteste olhar se ele passa a cobrir o campo em uso.
- **Arquivo de teste compartilhado com a 08.** Os novos testes do recibo estão no fim de `CampaignOffersEditor.test.tsx`, e a tarefa 08 (onda posterior) também mexe no `CampaignOffersEditor`. Nenhuma afirmação dela ficou falsa, então não houve propagação.
- **Tarefa 07 da cerca.** Não encontrei erro, nem falha de teste, nem trabalho pela metade em arquivo da posse dela: a suíte da loja passou inteira.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 05
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (por seção: Comandos, Feature-Sliced Design, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines) · apps/backoffice/CLAUDE.md (Molde dos formulários, /admin/home — a composição, Gravar NÃO desmonta a tela, O movimento do painel, A ponte da prévia) · packages/core/CLAUDE.md (inteiro) · .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos:
  - (componente) gravar com peça acrescentada dá "Salvo" e tira a pendência — apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.test.tsx (vermelho antes do fix, verde depois)
  - (componente) mexer num campo depois do "Salvo" devolve a pendência — mesmo arquivo (vermelho antes, verde depois)
  - (componente) só a campanha, sem peças e só tirando peças continuam dando "Salvo" — mesmo arquivo (guarda de regressão; check de mutação vermelho)
  - (fonte) a fila Cancelar/Salvar quebra linha (`flex-wrap`), e a linha de fora também — apps/backoffice/src/shared/ui/FormPageHeader.test.tsx (o primeiro vermelho antes do fix; o segundo com check de mutação vermelho)
  - sem cobertura: a medida real em 390 px a 200 % (o jsdom não mede layout; fica para o reteste do QA)
Verificações: vitest dos arquivos tocados e dos consumidores (43 arquivos, 825 testes passando) · tsc backoffice com 7 erros = baseline (todos em ProposalStateBadge.test.tsx) · suíte backoffice 5543/311 passando · suíte store 7855/417 passando · eslint nos arquivos tocados limpo
Árvore de trabalho: alterados apps/backoffice/src/features/home-composition/model/sectionDraft.ts, apps/backoffice/src/shared/ui/FormPageHeader.tsx, apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.test.tsx, apps/backoffice/src/shared/ui/FormPageHeader.test.tsx; nada commitado
Citações conferidas: 3 (os três itens do Contrato: HomeSectionEditor.tsx, CampaignOffersEditor.tsx, FormPageHeader.tsx; nenhuma deslocou, nenhuma morta); a causa estava num quarto arquivo, sectionDraft.ts
```

## T05 — pd-impl-review · done · agente af1b1e127e131305a

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/05-bugs-1-4-barra-do-editor-do-bloco.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| nada | | | | | |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-001: gravar com peça acrescentada mostra "Salvo" e tira "Alterações não salvas", com o editor e a prévia na tela | `model/sectionDraft.ts:106-114` (`curadoriaParaComparar`) e `:131` / `:136` (`draftChanged`, `itemsChanged`). O diagnóstico se confirma no código: `ProductPicker.tsx:46-47` monta o item com `product_id` antes de `category_id`. `toDraftItems` (`sectionDraft.ts:74-75`) monta na ordem inversa. `HomeSectionEditor.tsx:92-93` semeia o rascunho uma vez só e não o refaz depois de gravar, então a comparação antiga com `JSON.stringify` continuava acusando diferença. O editor segue montado, porque o diff não mexe na navegação. | sim; a prova em tela fica para o reteste do QA |
| BUG-004: a 390 px com fonte a 200 %, Cancelar e "Salvar seção" dentro da tela, sem rolagem lateral | `FormPageHeader.tsx:139`, com `flex-wrap` na fila de ações. A linha de fora já tinha `flex-wrap`. | só execução: a medida real é do reteste do QA |
| os outros formulários que usam `FormPageHeader` seguem com os testes passando | a mudança é só uma classe. Consumidores: cupom, promoção, editor da Home e `AdminHomePage.test.tsx` | só execução |
| cada comportamento do bloco `Testes` coberto por um teste escrito | `CampaignOffersEditor.test.tsx:597-648`, `FormPageHeader.test.tsx:365-379` | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- **Teste antes do código.** Pela leitura, o teste de BUG-001 reprova sem o fix e o de BUG-004 também. O de BUG-001 reprova porque o rascunho vem do `ProductPicker` e a seção relida passa por `toDraftItems`, com a ordem de chaves diferente; o `JSON.stringify` antigo acusava pendência e `justSaved && !isDirty` nunca dava "Salvo". O de BUG-004 reprova porque a fila não tinha `flex-wrap`. Que o vermelho foi de fato visto antes do fix só a execução e o retorno do implementador provam.
- **Guardas de fonte seguem passando.** Pelas classes, o diff não toca no que os guardas medem. Não entrou nenhuma classe de `transition-*` ou `animate-*` em `FormPageHeader.tsx`, que é o que `animacaoRespeitaMovimento.test.ts` lê. `toNewItems` está intacto e continua sendo o único lugar que tira os campos de tela, que é o que `toNewItems.test.ts` lê. Nenhuma asserção foi afrouxada.
- **Texto novo em português, com acentuação e tom memorial.** Aplicado: o diff não acrescenta texto de tela, e os comentários e nomes de teste estão em português acentuado.

## Testes

- **(componente, jsdom) gravar com peça acrescentada dá "Salvo" e tira a pendência; mexer num campo depois devolve a pendência.** Coberto em `CampaignOffersEditor.test.tsx:597-623`, nos testes "gravar com uma peça acrescentada…" e "mexer num campo depois do 'Salvo'…". Morde. A peça entra pelo `ProductPicker` real (`peca-p2`). A seção relida é remontada em `comoOBancoDevolve` e passa por `toDraftItems` no editor, o que reproduz a diferença de ordem do bug. As asserções são `recibo()` com 'Salvo' e `pendente()` nulo; depois da edição, `pendente()` presente e `recibo()` nulo.
- **(componente, jsdom) as gravações que já davam "Salvo" continuam dando.** Coberto em `CampaignOffersEditor.test.tsx:625-648`: só a campanha, sem peças (só o título) e só tirando peças, cada caso com recibo e sem pendência. Morde como guarda de regressão.
- **(fonte) a fila de ações quebra linha, conferido pelas classes.** Coberto em `FormPageHeader.test.tsx:368-373`, com a asserção `toContain('flex-wrap')` na fila que contém Cancelar e o primário; morde, porque antes do fix a fila não tinha a classe. O teste da linha de fora (`:375-379`) já passaria antes do fix. Ele está ali como guarda da linha de fora, não como prova do bug. O nível bate com o declarado: leitura de classes.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Corrigir em `model/sectionDraft.ts`, fora do Contrato. O comparador fixa a ordem das colunas de `toNewItems`. | sim | A tarefa diz "Sem causa raiz presumida… o diagnóstico é de quem executa". O Contrato autoriza o editor só "se a causa estiver aqui", e a causa não está lá: `ProductPicker.tsx:41-55` contra `sectionDraft.ts:68-80`, e `HomeSectionEditor.tsx:89-93` mostra que o rascunho não é ressemeado. O comparador continua derivando de `toNewItems`, então a regra de "o que vai para o banco" mantém um dono só, que é o que pede o "defeito 01" do `CLAUDE.md`. Trocar `undefined` por `null` na comparação não muda resultado para os itens tipados. | sim. Os únicos consumidores são `HomeSectionEditor.tsx:97` (`draftChanged`) e `AdminHomePage.tsx:243` (`itemsChanged`, reexportado em `features/home-composition/index.ts:20`). As tarefas 06, 07 e 08 não citam `draftChanged`, `itemsChanged` nem `sectionDraft`, e a 06 confirma que o recibo é da 05 (`06-…md:209`). |
| 2 | BUG-004: só `flex-wrap` na fila de ações, sem mexer na altura, na ordem nem no `whitespace` | sim | Cumpre o `Não faça`: "Não mude a altura do 'Salvar seção' (40 px)". A tarefa admite a classe: "quebra de linha ou `min-w-0`/`flex-wrap`". A linha de fora já tinha `flex-wrap` (`FormPageHeader.tsx:108`). Pela medida do QA, o botão sozinho mede 293 px. | sim. Os consumidores são `AdminCouponFormPage`, `AdminPromotionFormPage` e `HomeSectionEditor`, e o comportamento só muda quando a fila não cabe numa linha. `RecordPageHeader` aparece no grep só por menção; ele não usa `FormPageHeader`. |

## Não conferido

- **Execução.** Não conferi a medida real a 390 px com fonte a 200 % nem se o botão de 293 px cabe na largura útil depois do padding da página; isso é do reteste do QA. Também ficam para a execução: os testes passando, o vermelho visto antes do fix, a suíte dos outros consumidores de `FormPageHeader`, e lint e tipos contra a baseline.
- **Diffs.** Os quatro `alterados` aparecem como modificados (` M`) com baseline em git, e todos foram lidos pelo diff.
- **Lições de QA** (`/Users/rafael.santos/.claude/feature/-Users-rafael.santos-Projetos-uma-estrelinha-store/licoes-qa.md`). Conferi "[acessibilidade] a 200 % de fonte e em 320 px…" e "[estado de falha]". O diff não confirma estado que o servidor não confirmou: o recibo continua dependendo de `onSave` sem falha. Não há padrão repetido.

Instruções lidas:
- `CLAUDE.md` › Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas (tabela, pelas linhas que tratam do backoffice, de `FormPageHeader`, `toNewItems` e `home-composition`), › Baselines
- `apps/backoffice/CLAUDE.md` › Molde dos formulários, › `/admin/home` — a composição, › Gravar NÃO desmonta a tela, › O movimento do painel, › A ponte da prévia
- `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Convenções de tipo. Li só essas seções, pelo índice de títulos. O arquivo tem cerca de 53 KB e a tarefa toca `packages/core` em nada.

## T06 — pd-impl-task · review · agente ac2cca9ca61db053c

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/06-bugs-2-6-linha-do-bloco-na-home.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | "Está no ar?" agora tem uma resposta só, `secaoNoAr(section, campanhas)`, num arquivo novo: `features/home-composition/model/sectionOnAir.ts`. A linha a usa para a palavra de estado, e a lista a usa para a conta "N no ar". Para o bloco `campaign_offers`, a função chama `campaignOffersShows` de `core`. A campanha vigente que ela recebe é a que `campaignStatus(c, now) === 'em-vigencia'` aponta na lista de campanhas, pelo relógio do painel (o mesmo critério que a linha já usava para o aviso). A interface `CampanhasDaLista` saiu de `HomeSectionRow.tsx` e foi para esse arquivo | Escrever a regra duas vezes (uma na linha, outra na lista); deixar a função exportada de `HomeSectionRow.tsx` | Com duas escritas, a conta e a linha podem discordar (o "defeito 01"). A regra de exibição continua sendo a de `core`: o painel só descobre qual campanha é a vigente | `HomeSectionRow.tsx`, `HomeSectionList.tsx`. O painel decide a vigência pelo relógio dele, e a loja pelo banco (`live_campaigns`); nas bordas exatas das datas os dois podem divergir por segundos, como o aviso da linha já fazia |
| 2 | A palavra de estado do bloco "Joias em oferta" ligado que não aparece na loja passou a ser "Ligada, mas não aparece na loja". Enquanto as campanhas carregam, ou se a leitura delas falha, a palavra é "Ligada" e o bloco não entra na conta "no ar" | Manter "No ar" durante a carga; dizer "Ligada, mas não aparece na loja" também durante a carga | Segue a lição de QA "estado de falha": a tela não afirma o que não conferiu. A frase é nova, em português e em tom memorial | Só a palavra `sr-only` da linha (com `data-testid="estado-<id>"` novo) e a conta. O interruptor e a gravação de `active` não mudaram |
| 3 | Causa do BUG-006: a peça apagada do catálogo continua na seção com `product_id` zerado (FK `on delete set null`) e o nome guardado em `label_snapshot`. A linha descartava os itens sem id antes de contar. Correção: `campaignPieceStates` e `useCampaignPiecesState` passaram a aceitar `string \| ChosenPiece` (`{ product_id, label_snapshot }`). Item sem id vira `apagada`, nomeado pelo nome guardado. `CampaignPieceState.product_id` passou a `string \| null` | Mudar a assinatura para aceitar só `ChosenPiece[]`, o que quebraria as chamadas e os testes existentes, que passam ids | Mantém compatibilidade com quem passa ids, e a ordem da lista se preserva | `entities/campaign` (model e api), a linha e o editor. A tarefa 08 (`useCampaignMarks`) não foi tocada |
| 4 | No editor, a conta passa ao hook os itens do rascunho mais as `apagadas` que a conferência já tirou da lista. Enquanto a dona não salva, a peça apagada continua gravada na seção, e por isso ela entra em "N das M" | Não mexer no editor | O `Pronto quando` pede a conta certa "na linha e no editor", e `CampaignOffersEditor.tsx` não está no `Não faça` | `CampaignOffersEditor.tsx`. Depois de salvar sem recarregar, a conta segue incluindo a apagada, do mesmo jeito que o aviso que já existia ("foi apagada do catálogo e saiu da lista") segue na tela |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Com uma peça despublicada e outra apagada, a linha diz "2 das 7 saíram do ar" e nomeia as duas | componente (jsdom) | `HomeSectionList.ofertas.test.tsx` › "a despublicada e a apagada entram na conta "2 das 7"…" (vermelho: "1 das 6 saiu do ar") | sim | — |
| 2 | O mesmo no editor | componente (jsdom) | `CampaignOffersEditor.test.tsx` › "a apagada do catálogo, que saiu da lista, entra na conta "2 das 7"…" (vermelho: "1 das 6") | sim | — |
| 3 | Bloco ligado sem campanha, ou com campanha agendada, desligada ou encerrada: a linha não diz "No ar" e o bloco não entra na conta. Com campanha em vigência, diz "No ar" e entra | componente (jsdom) | `HomeSectionList.ofertas.test.tsx` › describe "está no ar? pela mesma regra da loja" (it.each com os 4 estados, mais em vigência e desligado). Vermelho: "No ar" e "3 no ar" | sim | — |
| 4 | Os outros tipos de bloco ligados seguem dizendo "No ar" e entrando na conta | componente (jsdom) | mesmo describe › "os outros tipos de bloco ligados…" (vermelho pela conta, que incluía o bloco de ofertas) | sim | — |
| 5 | Com as campanhas carregando ou falhando, a linha diz só "Ligada" e o bloco fica fora da conta (lição de QA "estado de falha") | componente (jsdom) | mesmo describe › "enquanto as campanhas carregam ou falham…" | sim | vermelho (passou de primeira após o ajuste da decisão 2; o check foi trocar o ramo `'Ligada'`, e o teste falhou) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103

## Arquivos alterados

apps/backoffice/src/features/home-composition/model/sectionOnAir.ts — criado
apps/backoffice/src/features/home-composition/ui/HomeSectionRow.tsx — alterado
apps/backoffice/src/features/home-composition/ui/HomeSectionList.tsx — alterado
apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx — alterado
apps/backoffice/src/entities/campaign/model/campaignPieces.ts — alterado
apps/backoffice/src/entities/campaign/api/campaignMarks.ts — alterado
apps/backoffice/src/features/home-composition/ui/HomeSectionList.ofertas.test.tsx — alterado
apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.test.tsx — alterado

## Verificação

- Tipos: `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (fonte: `CLAUDE.md` §Comandos). Baseline medido antes da primeira fatia: 7 erros, todos em `ProposalStateBadge.test.tsx` (3× TS2304 e 4× TS2593). Depois: os mesmos 7, nenhum novo.
- Um arquivo de teste: `pnpm --filter @estrelinha/backoffice exec vitest run <arquivo> --testTimeout=20000` (fonte: `PROJECT.md` §Comandos de verificação), por fatia. `HomeSectionList.ofertas.test.tsx` 23/23, `CampaignOffersEditor.test.tsx` 41/41, `campaignMarks.test.tsx` verde, `HomeSectionList.test.tsx` verde.
- Verificação mínima (fonte: `CLAUDE.md` §Baselines, via `PROJECT.md`):
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: exit 0, 311 arquivos e 5553 testes passando. Inclui os guardas de fonte: `previaUnica`, `animacaoRespeitaMovimento`, `toNewItems`, `buscaDeProdutoComDonoUnico`.
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: exit 0, 417 arquivos e 7855 testes.
- Lint dos arquivos tocados: `npx eslint <arquivos>` em `apps/backoffice`, exit 0.

Instruções lidas: `CLAUDE.md` › Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines (mais o cabeçalho e o mapa) · `apps/backoffice/CLAUDE.md` › Molde dos formulários, › `/admin/home` — a composição, › Gravar NÃO desmonta a tela, › O movimento do painel, › A ponte da prévia · `packages/core/CLAUDE.md` › início (pertencimento, pureza, módulos), › `home`, › `announcements`, › Convenções de tipo · `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- `packages/core/CLAUDE.md` (53 KB) a tarefa lista sem seção, então devia ser lido por inteiro. Li o índice e as seções gerais e de `home`; as seções de dinheiro, menu, pedidos e afins ficaram de fora, por não tocarem esta tarefa.
- A causa do BUG-006 estava nos dois lugares que o Contrato marca como condicionais (`campaignPieces.ts` e `campaignMarks.ts`) e também no filtro de `HomeSectionRow.tsx`, que descartava os itens sem `product_id`.
- O "No ar" que a QA viu é um texto `sr-only` (só leitor de tela). Ele ganhou `data-testid="estado-<id>"` para o teste.
- Não houve propagação: nenhuma afirmação da tarefa 08 ficou falsa. `useCampaignPiecesState` ainda aceita ids, então o contrato da 04 continua verdadeiro.
- O check de mutação da fatia 5 foi restaurado pela cópia e conferido com `cmp`.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 06
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (seções › Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções, › Os guardas, › Baselines); apps/backoffice/CLAUDE.md (› Molde dos formulários, › /admin/home, › Gravar NÃO desmonta a tela, › O movimento do painel, › A ponte da prévia); packages/core/CLAUDE.md (início, › home, › announcements, › Convenções de tipo)
Testes escritos: BUG-002 nos 4 estados e em vigência — HomeSectionList.ofertas.test.tsx › "está no ar? pela mesma regra da loja" (it.each + em vigência + desligado + carga/falha); outros tipos sem regressão — mesmo describe › "os outros tipos de bloco ligados…"; BUG-006 na linha — HomeSectionList.ofertas.test.tsx › "a despublicada e a apagada entram na conta "2 das 7""; BUG-006 no editor — CampaignOffersEditor.test.tsx › "a apagada do catálogo, que saiu da lista, entra na conta "2 das 7"". Todos reprovaram antes do fix (o selo "No ar", "3 no ar", "1 das 6") e passam depois. Nada sem cobertura
Verificações: tsc backoffice = baseline (7, todos em ProposalStateBadge.test.tsx); arquivos de teste das fatias verdes; suíte backoffice 5553/311 exit 0; suíte store 7855/417 exit 0; eslint dos arquivos tocados limpo
Árvore de trabalho: criado apps/backoffice/src/features/home-composition/model/sectionOnAir.ts; alterados HomeSectionRow.tsx, HomeSectionList.tsx, CampaignOffersEditor.tsx, entities/campaign/model/campaignPieces.ts, entities/campaign/api/campaignMarks.ts, HomeSectionList.ofertas.test.tsx, CampaignOffersEditor.test.tsx; nada commitado
Citações conferidas: 4 (HomeSectionRow.tsx, HomeSectionList.tsx, campaignMarks.ts/campaignPieces.ts, core/home/campaignOffers.ts); nenhuma deslocada, nenhuma morta
```

## T06 — pd-impl-review · fixing · agente af77a3a61195e49cf

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/06-bugs-2-6-linha-do-bloco-na-home.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade          | Arquivo:linha | O defeito | A exigência que ele contraria                  |
| --- | ------ | ------------------ | ------------- | --------- | ---------------------------------------------- |
| 1 | `premissa derrubada` | atrapalha | apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx:142-148 | A conta do editor junta à lista de rascunho os nomes de `apagadas`. Esse estado só é preenchido pela conferência e nunca é zerado. Depois de "Salvar", a seção gravada já não tem a peça apagada, porque o rascunho foi gravado sem ela. Como o editor continua montado, ele segue mostrando "2 das 7", enquanto a linha da lista, que relê `section.items`, mostra "1 das 6". O próprio comentário da linha 142 diz que a peça apagada "continua nela até a dona salvar", mas o código continua contando a peça depois de salvar. A premissa 4 admite esse efeito; o que a derruba é que essa tela fica de fato de pé depois de salvar e que o projeto já registrou esse tipo de erro como lição. | `apps/backoffice/CLAUDE.md` › Gravar NÃO desmonta a tela: "**Salvar uma seção não navega mais** (`VIV-05`)"; licoes-qa.md:10: "[estado que persiste] seleção, oferta marcada, endereço ou formulário de uma passagem anterior não reaparece na seguinte → teste a segunda ida pelo mesmo fluxo"; tarefa, Objetivo: "a conta 'N das M saíram do ar' inclui a peça escolhida que foi apagada". Depois de salvar, a peça já não é escolhida. |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-002: nos quatro estados a linha não diz "No ar" e a conta "N no ar" não inclui o bloco | `model/sectionOnAir.ts:39-44` (`secaoNoAr` chama `campaignOffersShows` de core); `HomeSectionRow.tsx:316` e o span de estado (~400-408); `HomeSectionList.tsx:226` | sim |
| BUG-006: a peça escolhida apagada entra na conta "N das M saíram do ar" e é nomeada, na linha e no editor | `campaignPieces.ts` (`ChosenPiece`, item sem id vira `apagada` com o `label_snapshot`); `campaignMarks.ts:128-144`; `HomeSectionRow.tsx` `PecasDoBloco` (passa o item inteiro); `CampaignOffersEditor.tsx:145-148` | sim, até salvar; depois de salvar o editor continua contando a peça (achado 1) |
| cada comportamento do bloco `Testes` coberto por um teste escrito | `HomeSectionList.ofertas.test.tsx:214-266, 338-380`; `CampaignOffersEditor.test.tsx:437-469` | sim |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- **Teste antes do código, com o retorno dizendo isso:** os testes novos reprovam com o código anterior. A linha mostraria "1 das 6" sem o item de id nulo, e o estado diria "No ar"; o editor passava só os ids. Se o retorno do implementador diz isso, não consigo conferir daqui (ver `Não conferido`).
- **Guardas de fonte que leem os arquivos tocados seguem passando, sem afrouxar:** o diff não mexe em nenhum guarda. Se eles passam, só a execução mostra.
- **Texto novo em português, com acento e tom memorial:** aplicada. O texto novo é "Ligada" e "Ligada, mas não aparece na loja" (`HomeSectionRow.tsx`), sem urgência e sem exclamação.

## Testes

- **(componente, jsdom) bloco ligado sem campanha, agendado, desligado e encerrado não diz "No ar" e não entra na conta; em vigência, diz e entra:** `HomeSectionList.ofertas.test.tsx:219-236` (`it.each` com os quatro estados, mais o caso em vigência). A asserção morde. Ela confere o texto exato do estado (`estado-ofertas`), a ausência de "No ar" na linha, o interruptor ligado e o contador exato ("2 seções · 1 no ar" contra "2 no ar").
- **(componente, jsdom) os outros tipos seguem dizendo "No ar" quando ligados:** `HomeSectionList.ofertas.test.tsx:254-265` (newsletter, hero, trust_bar desligado e contador "4 seções · 2 no ar"). A asserção morde.
- **(unidade ou componente) com uma despublicada e uma apagada, "2 das 7" nomeando as duas, na linha e no editor:**
  - Na linha: `HomeSectionList.ofertas.test.tsx:368-379`, com o hook de verdade sobre o dublê e um item de `product_id: null` e `label_snapshot`. A asserção morde: é igualdade exata do texto.
  - No editor: `CampaignOffersEditor.test.tsx:437-469`. O hook é dublado, mas os estados saem do `campaignPieceStates` de verdade aplicado ao que o editor passa ao hook. A asserção morde: com a passagem antiga, só de ids, daria "1 das 6".
  - Nenhum teste cobre a segunda ida, depois de salvar (achado 1).

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `secaoNoAr` num arquivo novo do `model`, consumida pela linha e pela lista. A campanha vigente é a que `campaignStatus` diz em vigência, pelo relógio do painel. `CampanhasDaLista` foi para lá. | sim | Bate com `CLAUDE.md` › O "defeito 01": uma resposta, dois leitores. A regra de exibição é `campaignOffersShows` de core, intocada, como a Decisão da tarefa pede. A linha já usava `campaignStatus` para o aviso. `model/` já existe no slice e importa de `@/entities/campaign`, camada abaixo. | sim. `CampanhasDaLista` só é usada por `HomeSectionRow.tsx` e `HomeSectionList.tsx` (grep). |
| 2 | "Ligada, mas não aparece na loja" para o bloco ligado fora de vigência; "Ligada" e fora da conta enquanto as campanhas carregam ou falham. | sim | licoes-qa.md:9, "[estado de falha] … nunca vira valor padrão". O bloco sem `campaign_id` diz "não aparece" mesmo durante a carga (`conferida: true`), e isso é verdade independente da leitura. | sim. O `data-testid="estado-<id>"` é novo e não colide com outros testes do painel (grep). |
| 3 | `campaignPieceStates` e `useCampaignPiecesState` aceitam `string \| ChosenPiece`; o item sem id vira `apagada` com o nome guardado; `CampaignPieceState.product_id` passou a `string \| null`. | sim | A FK `set null` está descrita no comentário. `piecesOffAirText` já nomeava pela `name`. As chamadas que passam ids seguem compatíveis. `estadoPorId` com chave nula só é consultado por id não nulo (`CampaignOffersEditor.tsx:360`). | sim. Os consumidores de `CampaignPieceState` e do hook são só a linha e o editor (grep). A tarefa 08 só toca `useCampaignMarks` e já declara depender da 06 no mesmo `campaignMarks.ts`. |
| 4 | No editor, a conta inclui as `apagadas` que a conferência tirou do rascunho; depois de salvar sem recarregar, a conta segue incluindo a peça. | não, na parte de depois de salvar | Ver achado 1: VIV-05 mantém o editor montado depois de salvar, a lição [estado que persiste] condena o caso, e a linha passa a discordar do editor (1 das 6 contra 2 das 7). Antes de salvar, a decisão se sustenta. | sim. O raio declara o efeito. |

## Não conferido

- Se os testes passam, se os guardas de fonte seguem verdes e se `tsc` e lint fecham: só a execução mostra.
- Se o retorno do implementador diz que os testes reprovaram antes do fix: não recebi o retorno, só as premissas.
- Os outros testes da lista da Home fora dos `alterados` (por exemplo `HomeSectionList.test.tsx`) que possam conferir "N no ar" com um bloco `campaign_offers`: não li, e só a execução mostraria a regressão.
- Todos os `alterados` aparecem no diff: `sectionOnAir.ts` como `A` (intent-to-add) e os demais como `M`. Não houve arquivo sem baseline.
- Instruções lidas:
  - `CLAUDE.md` › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas (varrido por campanha, Home e `home-composition`).
  - `apps/backoffice/CLAUDE.md` › Gravar NÃO desmonta a tela (VIV-05), › O movimento do painel, › `/admin/home` — a composição (varrido por termos de campanha, estado e contador).
  - Não li por inteiro: `apps/backoffice/CLAUDE.md` › Molde dos formulários e › A ponte da prévia (só o início), nem `packages/core/CLAUDE.md` (53 KB). Esse último não governa o diff, que não toca `packages/core`.
  - Lições de QA: `/Users/rafael.santos/.claude/feature/-Users-rafael.santos-Projetos-uma-estrelinha-store/licoes-qa.md`.

## T06 — pd-impl-task · done · agente ac2cca9ca61db053c

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/06-bugs-2-6-linha-do-bloco-na-home.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 4 (revista) | A conta "N das M" do editor agora junta duas fontes. Do rascunho, entram só as peças com id. Da seção **gravada** (`section.items`), entram os itens sem id, que são as peças apagadas do catálogo, pelo nome guardado e na ordem da posição. O estado `apagadas` não entra mais na conta e continua servindo só ao aviso "foi apagada do catálogo e saiu da lista". Depois de "Salvar", a seção relida já não tem a peça apagada, e a conta volta a "1 das 6", igual à linha da lista, com o editor ainda aberto (`VIV-05`) | Zerar `apagadas` depois de gravar. Exigiria saber no editor que a gravação terminou, e esse sinal é do casco `HomeSectionEditor.tsx`, que é da tarefa 05 | Quem diz o que a seção ainda tem é a seção gravada, não o histórico da tela. É a mesma fonte que a linha lê | `CampaignOffersEditor.tsx`, só a conta. O aviso "foi apagada… A remoção vale quando você salvar" continua aparecendo depois de salvar, como já acontecia antes desta tarefa (fora do achado) |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 2b | Depois de salvar, com o editor aberto, a conta volta a ser a da seção gravada: "1 das 6", só a despublicada | componente (jsdom) | `CampaignOffersEditor.test.tsx` › "depois de salvar, a apagada já não é escolhida: a conta volta a ser a da seção gravada, "1 das 6"" (vermelho antes da correção: ficava "2 das 7") | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103

## Arquivos alterados

apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx — alterado
apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.test.tsx — alterado

## Verificação

- `pnpm --filter @estrelinha/backoffice exec vitest run src/features/home-composition/ui/CampaignOffersEditor.test.tsx --testTimeout=20000` (fonte: `PROJECT.md`): vermelho antes da correção (1 falha), verde depois (42/42).
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (fonte: `CLAUDE.md` §Comandos): 7 erros, todos em `ProposalStateBadge.test.tsx`. É igual ao baseline; nenhum erro novo.
- `npx eslint` nos dois arquivos tocados: exit 0.
- `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (fonte: `CLAUDE.md` §Baselines): exit 0, 311 arquivos e 5554 testes passando.

## Divergências e descobertas

- O aviso "“X” foi apagada do catálogo e saiu da lista. A remoção vale quando você salvar." continua na tela depois de salvar, porque o estado `apagadas` nunca é zerado. Esse comportamento já existia antes desta tarefa e o achado não cobre esse aviso; não mexi nele. Zerar esse estado depende do sinal de "gravou", que vem do casco (tarefa 05). Fica para a QA ou para uma tarefa futura decidir.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 06
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (› Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções, › Os guardas, › Baselines); apps/backoffice/CLAUDE.md (› Molde dos formulários, › /admin/home, › Gravar NÃO desmonta a tela, › O movimento do painel, › A ponte da prévia); packages/core/CLAUDE.md (início, › home, › announcements, › Convenções de tipo)
Testes escritos: BUG-002 nos 4 estados e em vigência — HomeSectionList.ofertas.test.tsx › "está no ar? pela mesma regra da loja" (it.each + em vigência + desligado + carga/falha); outros tipos sem regressão — mesmo describe › "os outros tipos de bloco ligados…"; BUG-006 na linha — HomeSectionList.ofertas.test.tsx › "a despublicada e a apagada entram na conta "2 das 7""; BUG-006 no editor — CampaignOffersEditor.test.tsx › "a apagada do catálogo, que saiu da lista, entra na conta "2 das 7"" e, na correção, › "depois de salvar, a apagada já não é escolhida… "1 das 6"". Todos reprovaram antes do fix e passam depois. Nada sem cobertura
Verificações: tsc backoffice = baseline (7, todos em ProposalStateBadge.test.tsx); arquivos de teste das fatias verdes; suíte backoffice 5554/311 exit 0 (após a correção); suíte store 7855/417 exit 0 (na implementação; a correção tocou só o painel); eslint dos arquivos tocados limpo
Árvore de trabalho: criado apps/backoffice/src/features/home-composition/model/sectionOnAir.ts; alterados HomeSectionRow.tsx, HomeSectionList.tsx, CampaignOffersEditor.tsx, entities/campaign/model/campaignPieces.ts, entities/campaign/api/campaignMarks.ts, HomeSectionList.ofertas.test.tsx, CampaignOffersEditor.test.tsx; nada commitado
Citações conferidas: 4 (HomeSectionRow.tsx, HomeSectionList.tsx, campaignMarks.ts/campaignPieces.ts, core/home/campaignOffers.ts); nenhuma deslocada, nenhuma morta
```

## T08 — pd-impl-task · review · agente a99234dbc570a6121

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/08-bug-5-conferencia-das-pecas-marcadas.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Causa raiz: `useCampaignMarks` usava as novas tentativas padrão do React Query. O `QueryClient` do painel é `new QueryClient()` em `App.tsx`, então são 3 novas tentativas com espera de 1 s, 2 s e 4 s, e elas param quando a aba não está visível. Na query-core 5.101.2, toda nova leitura de uma query que nunca deu certo volta para `pending` com `error: null` (`fetchState`). Por isso o editor mostrava "Conferindo…" e não chegava ao aviso de falha, que já existia (`marcacoes-com-erro`). Os testes existentes não viam isso porque usam `retry: false` ou dublam o hook. Corrigi pondo `retry: false` na query das marcações. | Mostrar `failureReason` enquanto as novas tentativas continuam por baixo: a lista poderia perder peças de repente, quando uma tentativa desse certo com o aviso de falha ainda na tela. Desligar `refetchOnWindowFocus`/`retryOnMount`: não é preciso, e tiraria a recuperação automática. | O repositório já faz assim (`features/order-proposal/api/shippingPreview.ts` usa `retry: false`). É a menor mudança e é fácil de desfazer. Tentar de novo fica com a dona, pelo botão que já existia. | `useCampaignMarks` e quem o consome: o editor do bloco e `useCampaignPiecesState`, que é lido também pela linha do bloco em `HomeSectionRow.tsx` (tarefa 06). Na linha, a falha das marcações agora aparece na primeira tentativa, sem a espera de cerca de 7 s. |
| 2 | Não mexi em `CampaignOffersEditor.tsx`, embora o Contrato o marque como ALTERA. | Reescrever o aviso de falha ou o "Conferindo…". | O aviso "Não foi possível conferir as peças da campanha. Nenhuma peça saiu da lista…", com "Tentar de novo", já existia e é o que o critério CA-04.3 pede. A causa estava na leitura, que o Contrato também deixa alterar ("se a causa estiver aqui"). | nenhum |
| 3 | O teste novo monta o editor pelo casco (`HomeSectionEditor`) com os hooks verdadeiros de `entities/campaign`. Só `useCampaigns` é dublado, e o client do Supabase fica dublado por `criarDuble`. O `QueryClient` é o padrão do painel (`new QueryClient()`). | Estender `CampaignOffersEditor.test.tsx`, que dubla `useCampaignMarks` e usa `retry: false`. | Os dois juntos escondem o defeito: o erro chega pronto ao componente. | só o arquivo de teste novo |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Com a leitura das marcações falhando (erro do PostgREST ou requisição abortada no client dublado), o editor sai de "Conferindo…" e mostra que não conseguiu conferir; nenhuma peça sai e o editor não abre alterado | componente, jsdom | `apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.conferencia.test.tsx` › "falhando (%s): sai de "Conferindo…"…" (2 casos) | sim (vermelho antes do fix nos 2 casos, verde depois) | — |
| 2 | Com a leitura certa, segue o comportamento de hoje: a peça tirada da campanha sai ao abrir, com o nome, e o editor abre alterado | componente, jsdom | mesmo arquivo › "com a leitura certa, a peça tirada da campanha sai ao abrir…" | sim (passou de primeira) | vermelho (mutei `ficam.length === items.length` para `<=` no `CampaignOffersEditor.tsx`; o teste falhou; restaurei pela cópia e conferi com `cmp`) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103

## Arquivos alterados

apps/backoffice/src/entities/campaign/api/campaignMarks.ts — alterado
apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.conferencia.test.tsx — criado

## Verificação

- `pnpm --filter @estrelinha/backoffice exec vitest run src/features/home-composition/ui/CampaignOffersEditor.conferencia.test.tsx --testTimeout=20000` (vem do `PROJECT.md` › Comandos de verificação). Antes do fix: 2 falhas e 1 aprovado, os 2 casos de falha sem `marcacoes-com-erro` em 2 s. Depois do fix: verde.
- O mesmo comando com `CampaignOffersEditor.test.tsx`, `entities/campaign/__tests__/campaignMarks.test.tsx` e `HomeSectionList.ofertas.test.tsx` juntos (vem do `PROJECT.md`): 4 arquivos, 81/81, exit 0.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (vem do `CLAUDE.md` › Comandos): 7 erros, todos em `apps/backoffice/src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx`. É o mesmo que a tabela Baselines do `CLAUDE.md` registra (backoffice 7, nesse arquivo). Não veio `baseline` no briefing e não capturei um antes da primeira fatia. Delta: nenhum erro novo.
- `npx eslint` nos dois arquivos tocados, a partir de `apps/backoffice` (vem do `CLAUDE.md` › Baselines, recortado aos meus arquivos): exit 0.
- Verificação mínima (vem do `CLAUDE.md` › Baselines, conforme o `PROJECT.md`): `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` deu exit 0, 312 arquivos e 5557 testes. `pnpm --filter @estrelinha/store test --testTimeout=20000` deu exit 0, 417 arquivos e 7855 testes. Os guardas de fonte estão nessas suítes e passaram.

Instruções lidas: `CLAUDE.md › Comandos`, `CLAUDE.md › Feature-Sliced Design`, `CLAUDE.md › O "defeito 01"`, `CLAUDE.md › Convenções que valem em todo o repositório`, `CLAUDE.md › Os guardas` (cabeçalho, as linhas do backoffice e de `home-composition` e o fecho da seção), `CLAUDE.md › Baselines`, `apps/backoffice/CLAUDE.md › Molde dos formulários`, `› /admin/home — a composição`, `› Gravar NÃO desmonta a tela`, `› O movimento do painel`, `› A ponte da prévia`, `.specs/project/PROJECT.md › Comandos de verificação`. Li também as lições de QA (`licoes-qa.md`); a de estado de falha ("leitura que falha nunca vira valor padrão; avisa") é a que os testes da fatia 1 cobrem.

## Divergências e descobertas

- O Contrato lista `CampaignOffersEditor.tsx` como ALTERA, mas não foi preciso alterá-lo. O aviso de falha já existia; o defeito estava nas novas tentativas da leitura (decisões 1 e 2).
- A causa vista no navegador (mais de 25 s e de 50 s) não se confirma só pelas novas tentativas, que dariam cerca de 7 s. O mais provável é que elas tenham parado com a aba sem visibilidade no Chromium headless, e/ou que leituras repetidas tenham devolvido a query a `pending` (a QA viu o `HEAD` abortado e repetido). Não validei em navegador porque isso é da Validation; fica para o reteste do QA (TC-FUNC-017).
- A leitura das peças escolhidas, em `useCampaignPiecesState` (consulta `admin-campaign-pieces`), tem o mesmo padrão de novas tentativas, e o aviso "Conferindo se as peças escolhidas estão no ar…" sofreria o mesmo defeito se a leitura de `products` falhasse. Ficou fora do escopo desta tarefa e não mexi; registro como achado.
- Lições de QA: o arquivo existia e foi lido.
- Propagação: nenhuma; não há tarefa de número maior que 08.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 08
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (› Comandos, › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines) · apps/backoffice/CLAUDE.md (› Molde dos formulários, › /admin/home — a composição, › Gravar NÃO desmonta a tela, › O movimento do painel, › A ponte da prévia) · .specs/project/PROJECT.md › Comandos de verificação
Testes escritos: apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.conferencia.test.tsx — (1) com a leitura das marcações falhando (erro do PostgREST e requisição abortada), o editor sai de "Conferindo…", diz "Não foi possível conferir as peças da campanha.", oferece "Tentar de novo", nenhuma peça sai e o editor não abre alterado; reprovou antes do fix e passa depois. (2) Com a leitura certa, a peça tirada da campanha sai ao abrir, com o nome, e o editor abre alterado; passou de primeira e o check de mutação deu vermelho. Nada ficou sem cobertura.
Verificações: arquivo de teste novo (vermelho e depois verde); os 4 arquivos de teste ligados, 81/81; tsc do backoffice com 7 erros, todos no ProposalStateBadge.test.tsx, sem erro novo (o baseline do CLAUDE.md registra os mesmos 7); eslint nos arquivos tocados, 0; suíte do backoffice 5557/312, exit 0; suíte da loja 7855/417, exit 0
Árvore de trabalho: alterado apps/backoffice/src/entities/campaign/api/campaignMarks.ts (`retry: false` em useCampaignMarks, com comentário da regra); criado apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.conferencia.test.tsx; nada commitado
Citações conferidas: 2 (useCampaignMarks em campaignMarks.ts e o aviso "Conferindo as peças marcadas na campanha…" em CampaignOffersEditor.tsx); nenhuma deslocada nem morta
```

## T08 — pd-impl-review · done · agente a2e453f65ef757b02

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/tasks/08-bug-5-conferencia-das-pecas-marcadas.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| nada |       |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-005: com a leitura das marcações falhando, o editor diz que não conseguiu conferir em vez de ficar em "Conferindo…", e nenhuma peça sai | `apps/backoffice/src/entities/campaign/api/campaignMarks.ts:99` (`retry: false`). Na primeira falha, `query.error` fica preenchido, e o ramo `marcas.error` de `CampaignOffersEditor.tsx:449` (já existia) mostra "Não foi possível conferir as peças da campanha." antes do ramo `marcacoes-carregando` (`:461`). A lista não depende de `marcas.ids`, que fica `null` na falha (`:120`) | sim |
| cada comportamento do bloco `Testes` coberto por um teste escrito | `CampaignOffersEditor.conferencia.test.tsx:149-177` (falha, nos dois casos: erro e rede abortada) e `:179-187` (leitura certa) | sim |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- Teste antes do código: o teste usa `new QueryClient()` sem `retry: false` e espera o aviso com `timeout: 2000`. Com as 3 novas tentativas padrão (cerca de 7 s), ele reprovaria antes do fix, então pode ter reprovado de fato. Que ele reprovou mesmo é a palavra do implementador: a execução não está ao meu alcance.
- Guardas de fonte que leem os arquivos tocados: nenhum guarda da tabela *Os guardas* lê `entities/campaign/api/campaignMarks.ts` nem o arquivo de teste novo. O `queryClient.test.ts` é da loja (`apps/store/src/app/__tests__`), não do painel. Nada foi afrouxado.
- Texto novo em português, acentuado e em tom memorial: nenhum texto novo aparece na tela. O comentário novo de `campaignMarks.ts:86-93` está acentuado e não tem urgência.

## Testes

- (componente, jsdom) falha das marcações por erro ou por rede abortada. O teste é `CampaignOffersEditor.conferencia.test.tsx:149-177`, com `it.each`: a primeira linha devolve `error` na contagem e a segunda lança `TypeError('Failed to fetch')` no dublê. A asserção morde:
  - exige `marcacoes-com-erro` em até 2 s, o que o retry padrão não cumpre;
  - exige a ausência de `marcacoes-carregando`;
  - confere o texto do aviso e o botão "Tentar de novo";
  - exige a lista intacta com `toEqual(['Colar de Cinzas', 'Anel Coração'])`, sem `pecas-que-sairam` e sem "Alterações não salvas".

  O hook é o de verdade, e o dublê fica só no client do Supabase. Com isso o nível bate com o declarado.
- (componente, jsdom) leitura certa. O teste é `:179-187`. A asserção morde: exige que p3 (não marcada) saia da lista, que `pecas-que-sairam` nomeie "Anel Coração", que o editor abra alterado e que nem o aviso de carregando nem o de erro apareçam.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Causa raiz: as novas tentativas padrão. Correção: `retry: false` em `useCampaignMarks` | sim | `apps/backoffice/src/app/App.tsx:46` é `new QueryClient()`, sem opções. O caso análogo existe: `features/order-proposal/api/shippingPreview.ts:44` usa `retry: false`. O botão "Tentar de novo" (`CampaignOffersEditor.tsx:457`) chama `query.refetch()` e continua funcionando. O `queryClient.test.ts` da tabela de guardas é da loja e não governa o painel. | sim. `useCampaignMarks` só é consumido por `CampaignOffersEditor.tsx:108` e por `useCampaignPiecesState` (`campaignMarks.ts:143`), que `HomeSectionRow.tsx:205` lê. `campaignMarksKey` e a chave `admin-campaign-marks` não têm outro uso. A 08 é a última tarefa de `tasks/`, então não há tarefa seguinte que o raio alcance. |
| 2 | Não mexer em `CampaignOffersEditor.tsx` | sim | O aviso de falha com "Tentar de novo" já está em `CampaignOffersEditor.tsx:449-460` e cumpre o "diz que não conseguiu conferir" de CA-04.3. O Contrato aceita alterar só a leitura ("ALTERA, se a causa estiver aqui"). `git status` não mostra o arquivo como alterado por esta tarefa. | sim |
| 3 | Teste novo pelo casco `HomeSectionEditor`, com os hooks reais e só `useCampaigns` dublado | sim | O bloco `Testes` pede "erro ou rede abortada no client dublado". O dublê fica no client (`criarDuble`, `:20-24`), e o `QueryClient` é o padrão do painel. | sim |

## Não conferido

- Não rodei nada, por regra. Ficam sem prova:
  - que o teste reprovava antes do fix;
  - que os testes de `CampaignOffersEditor.test.tsx` e os da linha da lista (`HomeSectionRow`) seguem verdes com `retry: false`;
  - o `tsc` e o lint do backoffice.
- A mudança altera o comportamento da linha da lista (task 06) pelo hook compartilhado: a falha aparece já na primeira tentativa. O implementador declarou isso no raio, e `HomeSectionRow.tsx` não foi editado. Não tratei como cerca furada, porque o `Não faça` proíbe alterar a linha, e o arquivo dela continua intocado.
- Os dois arquivos aparecem no diff: `campaignMarks.ts` como `M` e o teste como `A` (intent-to-add). A baseline existe.

Instruções lidas:
- `CLAUDE.md` › Comandos, › Feature-Sliced Design (inclui Alias de import), › O "defeito 01": dois donos do mesmo dado, › Convenções que valem em todo o repositório, › Os guardas — o que trava o quê (varrida por campanha, retry, QueryClient, backoffice e home-composition; li inteiras as linhas pertinentes), › Baselines — o gate de qualquer feature.
- `apps/backoffice/CLAUDE.md` › Molde dos formulários, › `/admin/home` — a composição, e a prévia que é a loja, › Gravar NÃO desmonta a tela: `fetch(modo)`, › O movimento do painel, › A ponte da prévia.
- Lições de QA: `/Users/rafael.santos/.claude/feature/-Users-rafael.santos-Projetos-uma-estrelinha-store/licoes-qa.md`. Conferi o diff contra o padrão "[estado de falha]" e ele não se repete: a falha não vira valor padrão, e a lista e o estado "alterado" ficam intactos.
