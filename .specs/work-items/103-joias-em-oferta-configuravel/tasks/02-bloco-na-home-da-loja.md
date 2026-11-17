## 02 · [supabase, packages/core, packages/supabase, apps/store] O bloco "Joias em oferta" na Home da loja — campanha, título, descrição e peças escolhidas

**Status:** done

`UC-01, UC-02, UC-03, UC-04 (lado da loja)` — WI 103

**Objetivo.** A Home pode ter um bloco "Joias em oferta" por campanha, cada um com título, descrição e peças escolhidas, aparecendo na loja só durante a vigência da sua campanha.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` › Layout do monorepo, › Feature-Sliced Design, › O "defeito 01", › Convenções, › Os guardas, › Baselines, › CI e deploy · `packages/core/CLAUDE.md` · `supabase/CLAUDE.md` › Migrations, › RLS — o molde · `apps/store/CLAUDE.md` › Mobile, › A Home é dado, › Produtos em destaque / ProductCarousel, › Modo prévia, › A home não salta. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (UC-01..UC-04; Decisões F1, F2, F10, F13, D-02, D-05, D-06)

**Depende de.** 01 — `useLiveCampaign()` entrega só a vigente (lida de `live_campaigns`) e o embed de produto da loja vem de `live_product_campaigns`. Confira que existe antes de começar.

**Habilita.** 03 e 04 consomem: a coluna `home_sections.campaign_id`, `HomeSection.campaign_id`, as regras e frases de `core/home/campaignOffers.ts` (mostra?, recuo, tetos, recusa, frase da campanha já usada, motivo de não aparecer, aviso de prévia de agendada), o dono "a campanha baixa esta peça?" em `core/campaigns`, e `campaign_offers` repetível no catálogo.

### Critérios de aceite

**UC-01 · Escrever o título e a descrição do bloco**
- CA-01.3 Com o título vazio, o bloco mostra o nome da campanha (o comportamento de hoje); com a descrição vazia, mostra a frase dos percentuais de hoje. [código: apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx:63-66] 
- CA-01.4 O rótulo acima do título continua sendo o texto do selo da campanha. [código: CampaignOffers.tsx:58]
- CA-01.6 O título aceita até 60 caracteres e a descrição até 160; acima disso, salvar é recusado com o motivo e o número. [gate da descoberta: P-06]

**UC-02 · Escolher a campanha do bloco**
- CA-02.2 Durante a vigência da campanha escolhida, o bloco aparece na loja com os percentuais dela; fora da vigência (antes do início, depois do fim, ou desligada), o bloco não aparece. A loja decide comparando a campanha escolhida com a que o banco entrega como vigente. [gate: Q-01, P-04]
- CA-02.4 Todo bloco "Joias em oferta" tem uma campanha escolhida para aparecer na loja; o bloco sem campanha não aparece e o painel pede a escolha. O bloco acrescentado pela bandeja nasce desligado e sem campanha; o editor só salva com uma campanha escolhida, e enquanto não houver campanha a linha do bloco diz que ele não aparece na loja e pede a escolha (ligá-lo não o faz aparecer). [gate: Q-10 (c); prd-review r1: campanha-102-e-103-publicadas-juntas, bloco-novo-nasce-sem-campanha-pela-bandeja]
- CA-02.5 Se a campanha escolhida for apagada, o bloco fica sem campanha e não aparece na loja; a linha do bloco e o editor dizem que ele está sem campanha e pedem a escolha — a mesma mensagem do bloco que ainda não teve campanha. [prd-review r1: campanha-apagada-indistinguivel-de-sem-campanha]
- CA-02.6 A Home pode ter mais de um bloco "Joias em oferta", cada um com a sua campanha. Uma campanha que já tem outro bloco aparece desabilitada na lista, dizendo a posição e o título desse bloco; se mesmo assim duas gravações colidirem, salvar é recusado com a mesma frase. [gate: Q-06, P-07; prd-review r1: seletor-com-escolha-fora-da-lista-e-campanha-ja-usada]

**UC-03 · Escolher as peças da campanha**
- CA-03.2 As peças escolhidas aparecem numa lista que se reordena arrastando, com posição, nome e remover; a loja as mostra nessa ordem. [código: apps/backoffice/CLAUDE.md › editor de "Produtos em destaque"; FeaturedProducts.tsx:13-16]
- CA-03.3 Acima do teto de peças, salvar é recusado com o motivo e o número. O teto é 12 peças, como em "Produtos em destaque". Com peças escolhidas, a fileira mostra todas na ordem da dona: no celular rola na horizontal; no computador continua uma fita que rola, com as setas. Enquanto carrega, reserva uma vaga por peça escolhida. Sem peça escolhida, continua com as quatro primeiras da campanha, como hoje. [gate: Q-03; prd-review r1: doze-pecas-na-fileira-do-bloco]
- CA-03.5 Sem nenhuma peça escolhida, o bloco mostra as primeiras peças da campanha automaticamente, como hoje. [código: useCampaignOfferProducts.ts:32-49; gate: Q-04]

**UC-04 · Peça escolhida que deixa de valer**
- CA-04.2 Peça escolhida que foi tirada da campanha não aparece no bloco, e a vaga fica vazia — a loja não completa com outra peça. [código: apps/backoffice/CLAUDE.md › "A vaga que sobra fica VAZIA, e o painel AVISA"]
- CA-04.4 Peça marcada cujo preço a campanha não baixa não aparece no bloco, como não aparece na vitrine; o editor e a linha do bloco dizem quais peças escolhidas não aparecem por esse motivo. [código: .specs/work-items/102-desconto-de-campanha/spec.md:416 (I-02); prd-review r1: peca-que-a-campanha-nao-barateia-some-sem-aviso]
- CA-04.5 Se todas as peças escolhidas deixaram de valer, o bloco mostra os cartões de percentual sem a fileira de peças. [código: CampaignOffers.tsx:95-96, 23-24]
- CA-04.6 Os cartões de percentual continuam no bloco, como hoje, com ou sem peças escolhidas. [gate: Q-09]

**RNF**
- RNF-01 O bloco sem campanha valendo não reserva espaço nem desenha nada; carregando, também não. [código: CampaignOffers.tsx:17-20; spec 102 I-10]
- RNF-02 A falha da leitura das peças não derruba a Home nem os cartões de percentual. [código: CampaignOffers.tsx:23-24; FeaturedProducts.tsx:18-19]
- RNF-03 A loja nunca decide a vigência pelo relógio do aparelho da cliente. [código: useLiveCampaign.ts:1-6; prd 102 RN-03]
- RNF-04 Em 390 px o bloco e o editor não rolam na horizontal; o editor continua usável com a fonte do sistema a 200 %. [código: prd 102 RN-15; apps/store/CLAUDE.md › Mobile]
- RNF-05 Tom memorial: os textos fixos novos do bloco e do editor não usam urgência, contagem regressiva, escassez nem exclamação. [código: campaignOffers.ts:7-8; prd 102 RN-14]
- RNF-06 Título e descrição têm teto de caracteres que caiba em 390 px sem cortar. Título até 60 caracteres e descrição até 160. [gate: P-06]

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| coluna `home_sections.campaign_id uuid null references campaigns(id) on delete set null` | VOCÊ CRIA (migration nova, só schema) | — | — |
| índice único parcial por campanha (`where type = 'campaign_offers' and campaign_id is not null`), com nome estável que o painel reconhece (D-05) | VOCÊ CRIA | — | `23505` na colisão |
| `home_sections_unique_types_idx` recriado **sem** `campaign_offers` (drop antes do create) | VOCÊ CRIA (mesma migration) | — | — |
| `HomeSection.campaign_id` (`packages/core/src/home/types.ts`) e `DbHomeSection.campaign_id` (`packages/supabase/src/types/home.ts`) | VOCÊ CRIA, **opcional** (`campaign_id?: string \| null`), para não quebrar os literais de `HomeSection` dos testes das duas pontas | — | `string \| null` |
| `mapSection` do painel (`apps/backoffice/src/entities/home/api/useAdminHomeSections.ts`) | JÁ EXISTE. Acrescente só a linha de `campaign_id` (a 03 consome) | — | — |
| teste da bandeja `apps/backoffice/src/features/home-composition/ui/HomeBlockTray.test.tsx` (o caso do bloco ÚNICO, ~`:197-218`) | JÁ EXISTE. Inverta: com `campaign_offers` repetível a bandeja oferece o segundo bloco — sem isto o painel fica vermelho até a 04 | — | — |
| regras do bloco em `packages/core/src/home/campaignOffers.ts`: mostra-se (por id contra a vigente), recuo do título/descrição, tetos 60/160/12 exportados, recusa (`string \| null`), frase da campanha já usada (posição e título do outro bloco), motivo de não aparecer (sem campanha · agendada · encerrada · desligada), aviso de prévia de agendada | VOCÊ CRIA | seção, itens, campanha (ou seu estado), vigente | frases e veredito |
| "a campanha baixa o preço desta peça?" em `packages/core/src/campaigns/` (perto de `price.ts`) | VOCÊ CRIA, a partir de `mapProduct.ts › withCampaign`; a loja passa a delegar | preço, "de/por", variações, percentual | booleano |
| `UNIQUE_SECTION_TYPES` (`packages/core/src/home/catalog.ts`) sem `campaign_offers` | JÁ EXISTE. Altere | — | — |
| `mapSection` da loja (`apps/store/src/entities/home/api/useHomeSections.ts`) | JÁ EXISTE. Acrescente `campaign_id` | — | — |
| registro `campaign_offers` em `apps/store/src/widgets/home-renderer/ui/sectionRenderers.tsx` | JÁ EXISTE. Passe `section` e `items` | — | — |
| `useLiveCampaign()` | JÁ EXISTE (fonte trocada pela 01). Consuma; não altere | — | vigente ou `null` |
| `useProductsByIds` (`apps/store/src/entities/product/api/useProductsByIds.ts`) | JÁ EXISTE. Consuma | ids | produtos com `campaign` |

### Decisões já tomadas

- F1: `on delete set null`, sem retrato do nome; "perdeu a campanha" e "nunca teve" dão a mesma frase.
- F2/CA-02.4: o bloco sem campanha não aparece na loja (ligado ou não).
- F10 / D-02: a migration **não grava dado**; o bloco existente fica sem campanha até a dona escolher.
- P-07 recusada: mais de um bloco, no máximo um por campanha.
- A loja decide "aparece?" comparando `section.campaign_id` com o `id` que `useLiveCampaign()` entrega — nunca por datas (RNF-03, `campanhaNaLoja.test.ts:81-89`).
- Título = `config.title`, descrição = `config.subtitle`; vazios recuam para o nome da campanha e para a frase dos percentuais de hoje; o selo (`badge_text`) continua acima.
- Com itens: as peças escolhidas na ordem da dona, `ProductCarousel` `layout="slider"`, esqueleto com uma vaga por peça escolhida; peça cuja `campaign?.id` não é a da seção, ou que a campanha não barateia, some e a vaga fica vazia (sem completar). Todas fora: só os cartões. Sem itens: as 4 primeiras da campanha, como hoje (`CAMPAIGN_OFFERS_PIECES`).
- D-06: "a campanha baixa esta peça?" sobe para `core/campaigns` com a loja delegando; a metade positiva de `campanhaNaLoja.test.ts` passa a exigir a chamada ao dono — reescrita de propósito.
- D-05: o índice por campanha tem nome estável (exporte-o de `core` se o painel for reconhecê-lo pela mensagem do `23505`); a frase da colisão mora em `core`.
- F13: registre H-10 e I-10 como superados no `spec.md` da 102 (`.specs/work-items/102-desconto-de-campanha/spec.md`, uma nota ao lado de cada linha).
- Os textos fixos novos em `core` (tom memorial, sem exclamação nem urgência).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| migration de índice/tipo da Home | `supabase/migrations/20261130140000_102-joias-em-oferta-na-home.sql` (drop antes do create, comentário de par com `core`) |
| coluna FK + índice parcial | `supabase/migrations/20261130120000_102-campanhas.sql:128-134` (`order_items.campaign_id`) — só a forma (`add column if not exists`, índice `where … is not null`); aquela FK é `on delete restrict`, a desta tarefa é `on delete set null` (Contrato) |
| recusa em `core` | `packages/core/src/home/featured.ts › featuredProductsRefusal` |
| fileira escolhida pela dona | `apps/store/src/widgets/featured-products/ui/FeaturedProducts.tsx:27-58` |
| guarda de migration da Home | `apps/store/src/shared/lib/__tests__/homeSections.test.ts` |

### Testes

- core: o bloco aparece só quando a campanha da seção é a vigente; sem campanha, agendada, encerrada, desligada ou apagada (nula) não aparece, com o motivo de cada uma, e "nunca teve" e "perdeu" dão a mesma frase.
- core: título vazio cai no nome da campanha, descrição vazia na frase dos percentuais; preenchidos aparecem como estão.
- core: a recusa em ordem — sem campanha, título acima de 60 (sem aparar), descrição acima de 160, acima de 12 peças (com o número), item órfão, peça repetida (com o ordinal).
- core: a frase da campanha já usada nomeia a posição e o título do outro bloco; o aviso de prévia de agendada; tom das frases novas.
- core: "a campanha baixa esta peça?" — sem grade, com grade (uma variação basta), "de/por" que já vence a campanha; o mapeador da loja delega e continua dando os mesmos preços.
- core: `catalog.test.ts` — `campaign_offers` repetível (inverter `:66-95` e `:174-186`).
- loja: a seção com campanha diferente da vigente (ou sem campanha) não desenha nada e não reserva espaço.
- loja: título e descrição do `config`, ou os recuos; o selo continua acima.
- loja: as peças escolhidas na ordem, em `slider`, com uma vaga de esqueleto por peça; a peça fora da campanha ou não barateada some sem substituição; todas fora ⇒ só os cartões; sem itens ⇒ as quatro primeiras; falha da leitura das peças mantém os cartões (reescrever `CampaignOffers.test.tsx` `:56-73`, `:139-165`, `:173-222`, `campaignOffers.test.ts:45-60`, `HomeRenderer.test.tsx:109-129`).
- loja: o renderizador passa seção e itens.
- guarda `homeSections.test.ts`: procedência e contagem do índice de tipos passam à migration nova; guarda do índice parcial por campanha, da FK `set null` (nunca cascade) e de "não escreve dado" da migration nova.
- probe local `probes/02-secao-por-campanha.sql` (transação desfeita): dois blocos com campanhas diferentes passam; mesma campanha ⇒ `23505`; dois sem campanha passam; apagar a campanha zera `campaign_id` sem apagar a seção; visitante não grava `home_sections`.

### Obrigações

- Pureza de `core/home` e `core/campaigns`: sem React/Supabase, especificador relativo com `.ts` explícito (alcance do Deno); a âncora de contagem de `catalog.test.ts`/`purity` sobe se nascer arquivo.
- `accentText.test.ts:62-63`: reveja a justificativa do `CampaignOffers.tsx` se o ouro mudar de lugar no markup.
- Migration só no local (`supabase migration up --local`); sem `grant` a `anon`; sem insert/update/delete.
- Mobile primeiro: a fileira em `slider` não pode criar rolagem horizontal do body em 390 px (`minmax(0,…)` em grade).

### Não faça

- Não mude o cadastro de campanhas, o selo, os preços, a vitrine `/ofertas` nem o cupom (Fora do PRD).
- No painel (`apps/backoffice/**`), só a linha de `campaign_id` no `mapSection` e a inversão do teste da bandeja (Contrato) — editor e linha são das tarefas 03 e 04.
- Não ponha `campaign_offers` em `SOURCE_DRIVEN` (os cartões continuam sem peças).
- Não altere as views da 01 nem `useLiveCampaign`.
- Não grave dado na migration (o bloco de hoje fica sem campanha).

### Pronto quando

- [ ] a loja mostra o bloco só quando a campanha da seção é a vigente, com título/descrição configurados ou os recuos
- [ ] as peças escolhidas aparecem na ordem, em fita, e a que deixou de valer some sem substituição
- [ ] dois blocos com campanhas diferentes coexistem e a mesma campanha recusa com `23505` (probe)
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório

---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
