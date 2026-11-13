# Log da implementação por ondas — 101

## T01 — wi-impl-task · review · agente aeacfea651f0b91a7

Tarefa: .specs/work-items/101-faixa-de-avisos/tasks/01-regra-da-faixa-e-regua-de-destino.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Reusei o `ordinal` masculino que já existe em `packages/core/src/home/carousel.ts:96` (`${n}º`), importado em `announcements/refusals.ts`. Não criei um ordinal novo | Declarar um ordinal masculino próprio em `core/announcements`, como a tarefa pedia | A tarefa supôs que só existia o `ordinalF` (feminino). Mas o `ordinal` masculino existe, e o `packages/core/CLAUDE.md` e o comentário dele dizem que escrever um terceiro "seria o defeito 01". O arquivo de instruções vence | `core/announcements`; as frases das recusas que as tarefas 03 e 04 exibem |
| 2 | A recusa dos destinos `//` e `/\` em `ctaHrefRefusal` tem frase própria: "Este endereço leva para fora da loja. Use um caminho da loja, começando com uma só “/” — por exemplo, “/ofertas”." No menu, a mesma entrada recebe a frase de endereço externo que já existia | Reusar "O endereço precisa começar com “/”…" (confunde, porque `//host` começa com `/`). Usar a frase da tarefa 04 como texto da régua | A frase precisa fazer sentido para um endereço que começa com `/`. A tarefa diz que, se a régua do dono tiver outra frase, a dela vale | o painel da Home, os blocos de banner e destaque, o menu, a tarefa 04 (propagada) |
| 3 | Toda recusa de aviso sai no formato `"Nº aviso: <motivo>"`, como `heroCarouselSlidesRefusal`. As frases decididas ("Sem destino, o rótulo do link não aparece.", "Descreva a arte: …") ficam literais depois do prefixo | Frases sem ordinal, ou com "o 2º aviso …" no meio da frase | Segue o molde do repositório, e a tarefa exige o ordinal | o texto exibido pelo painel (tarefa 04, propagada) |
| 4 | O canal de prévia tem também a mensagem `ready` (loja → painel), além de `draft` e `show` | Só `draft` e `show`, como diz o contrato | As pontes que as tarefas 03 e 04 devem imitar (`useMenuPreview`, `useMenuPreviewBridge`) dependem do aperto de mão `ready`. Essas tarefas não podem alterar `core/announcements`. Acrescentar é fácil de desfazer | tarefas 03 e 04 |
| 5 | `parseAnnouncementPreviewMessage(data, itemCount)` recebe o tamanho da lista como parâmetro obrigatório. Recusa `show` com índice que não seja inteiro, negativo, ou `>= min(itemCount, 5)`. O `draft` é normalizado por `normalizeAnnouncements`, e `announcements` que não é objeto é recusado | Validar o índice só contra o teto de 5 | O bloco Testes pede recusa de índice "fora da lista", e só quem recebe conhece a lista | tarefas 03 e 04 (assinatura) |
| 6 | Normalização: o teto de 5 vale para os avisos reconhecidos. Primeiro descarto lixo e tipo desconhecido, depois corto do sexto aviso em diante. Campo do outro tipo é descartado, mas o aviso fica. Campo que não é string vira `''`. `id` ausente vira `aviso-N`. Só `enabled === true` liga | Cortar a lista crua antes de filtrar. Descartar o aviso inteiro quando tem campo do outro tipo | Item de tipo desconhecido não é aviso. O contrato diz "campo do outro tipo é descartado" | tarefas 02 e 03 (o que a faixa desenha) |
| 7 | Um aviso é "válido" quando `announcementRefusal === null`, e a mesma régua vale para o destino. Os tetos contam o texto aparado | Uma validade própria de `announcementBarExists` | Um dono só: o painel e a loja não podem discordar sobre se um aviso aparece | tarefas 02, 03 e 04 |
| 8 | `core/announcements` importa `ctaHrefRefusal` de `home/refusals.ts`. Esse arquivo tem imports sem `.ts` (`'../routes'` etc.), e não os alterei | Acrescentar `.ts` nos imports de `home/refusals.ts`, `catalog.ts`, `layout.ts` e `types.ts` | A função `api/page` é empacotada por esbuild com `moduleResolution: bundler`, que resolve imports sem extensão. Deno não lê este módulo. Mexer nesses imports seria refatoração oportunista | tarefa 02 (bundle da função) |
| 9 | Alturas: `ANNOUNCEMENT_BAR_HEIGHT = { mobile: 'calc(2 * 1.125rem + 1rem)', desktop: '3rem' }`. Vagas: `ANNOUNCEMENT_ART_SLOTS = { desktop: {1440,48}, mobile: {780,96} }`. Os tipos ficam numa folha sem import | Reusar `SlotSpec` e `DeviceSurface` de home e media | Folha sem import pode ser alcançada de qualquer runtime, inclusive `packages/supabase` | tarefas 03 e 04 |
| 10 | Rodei `pnpm install --frozen-lockfile --offline` no worktree | Criar symlink para o `node_modules` do repositório principal | O worktree não tinha `node_modules` e nenhum comando de teste rodava. O install terminou sozinho e não alterou o lockfile | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `ctaHrefRefusal` e `internalMenuHrefRefusal` recusam `//host` e `/\host` e continuam aceitando `/ofertas` e `/a/b` | unidade | `packages/core/src/home/__tests__/refusals.test.ts`, `packages/core/src/menu/__tests__/refusals.test.ts` | sim | — |
| 2 | A faixa existe só com o interruptor ligado e ao menos um aviso válido | unidade | `packages/core/src/announcements/__tests__/exists.test.ts` | sim | — (o vermelho foi por módulo ausente; o mutante "interruptor" abaixo também o derruba) |
| 3 | Recusas em ordem e com ordinal (vazio, rótulo sem destino, tetos 40/60/20, conjunto 90, artes, alt, destino externo, mais de 5) | unidade | `packages/core/src/announcements/__tests__/refusals.test.ts` | sim | vermelho (7 mutantes: conjunto, rótulo, alt, destino, limite, interruptor, aparar; todos mortos) |
| 4 | Normalização na leitura: corte no sexto, lixo nunca lança, tipo desconhecido e campo do outro tipo descartados | unidade | `packages/core/src/announcements/__tests__/normalize.test.ts` | sim | — |
| 5 | O catálogo de tipos não tem contagem regressiva, estoque nem prova social | unidade | `packages/core/src/announcements/__tests__/catalog.test.ts` | sim | vermelho (tipo proibido injetado no catálogo) |
| 6 | O canal de prévia aceita só o próprio carimbo, recusa as mensagens da Home e do menu, e recusa `show` fora da lista | unidade | `packages/core/src/announcements/__tests__/preview.test.ts` | sim | — |
| 7 | Pureza do módulo: sem React, Supabase ou alias; todo relativo com `.ts`, `import type` incluso | unidade | `packages/core/src/announcements/__tests__/purity.test.ts` | sim | vermelho (import sem `.ts`; import de `@tanstack/react-query`) |
| 8 | `useStoreSettings` devolve `announcements` desligada sem a linha, e não descarta a linha | unidade (hook) | `packages/core/src/hooks/__tests__/useStoreSettings.test.ts` | sim | — |
| 9 | `storeSettingsDefaults`: a chave nasce desligada, o default é a referência de `core`, e nenhuma migration a grava | guarda da loja | `apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts` | sim | vermelho (default ligado; migration-sensor temporária criada e apagada) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101

## Arquivos alterados

packages/core/src/announcements/types.ts criado
packages/core/src/announcements/refusals.ts criado
packages/core/src/announcements/normalize.ts criado
packages/core/src/announcements/preview.ts criado
packages/core/src/announcements/index.ts criado
packages/core/src/announcements/__tests__/exists.test.ts criado
packages/core/src/announcements/__tests__/refusals.test.ts criado
packages/core/src/announcements/__tests__/normalize.test.ts criado
packages/core/src/announcements/__tests__/catalog.test.ts criado
packages/core/src/announcements/__tests__/preview.test.ts criado
packages/core/src/announcements/__tests__/purity.test.ts criado
packages/core/package.json alterado
packages/core/CLAUDE.md alterado
packages/core/src/home/refusals.ts alterado
packages/core/src/home/__tests__/refusals.test.ts alterado
packages/core/src/menu/refusals.ts alterado
packages/core/src/menu/__tests__/refusals.test.ts alterado
packages/core/src/hooks/useStoreSettings.ts alterado
packages/core/src/hooks/__tests__/useStoreSettings.test.ts alterado
packages/supabase/src/types/settings.ts alterado
apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts alterado
.specs/work-items/101-faixa-de-avisos/tasks/04-tela-faixa-de-avisos-do-painel.md alterado (propagação)

## Verificação

- Um arquivo de teste: `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`, do `PROJECT.md` (§Comandos de verificação), a cada fatia. Vermelho e depois verde, como em `Fatias`.
- Tipos, de `CLAUDE.md` §Comandos/§Baselines. O baseline não veio na entrada; comparei contra a tabela de Baselines do `CLAUDE.md`, por arquivo, código de erro e quantidade:
  - `npx tsc --noEmit -p packages/core/tsconfig.json`: 11 erros, os mesmos herdados (carousel.test 5, pickHomeBanners 1, pickHomeCollections 1, sitemap urls.test 2, supabase client 2), nenhum em arquivo tocado.
  - `apps/store/tsconfig.app.json`: 0.
  - `apps/backoffice/tsconfig.app.json`: 7, todos em `ProposalStateBadge.test.tsx`, como no baseline.
  - `apps/store/tsconfig.server.json`: 0.
  - `apps/mobile-adm/tsconfig.app.json`: 0.
  - Nenhum erro novo.
- Verificação mínima, de `CLAUDE.md` §Baselines: as três suítes, um workspace por vez, exit fora de pipe, `--testTimeout=20000`. Gate de três workspaces exigido pela tarefa.
  - core: exit 0, 5794/244.
  - store: exit 0, 7190/382.
  - backoffice: exit 0, 5266/297.
- Nenhum timeout.

Instruções lidas: `packages/core/CLAUDE.md` (inteiro); `packages/ui/CLAUDE.md › Os tokens daqui são os do PAINEL, não os da loja` (com as subseções de tokens da marca e ordem dos imports); `CLAUDE.md › O "defeito 01": dois donos do mesmo dado` · `› Convenções que valem em todo o repositório` · `› Alias de import` · `› Os guardas — o que trava o quê` · `› Baselines`; `.specs/project/PROJECT.md › Comandos de verificação` e `› Ambiente local`.

## Divergências e descobertas

- **Divergência tarefa × instruções (ordinal):** a tarefa manda declarar um ordinal masculino em `core/announcements`, mas o `ordinal` masculino já existe em `home/carousel.ts`, e o `packages/core/CLAUDE.md` proíbe uma terceira cópia. Segui as instruções (decisão 1).
- **Propagado para a tarefa 04:** ela afirmava que a recusa de destino exibe "Use um caminho da loja, começando com / (ex.: /ofertas). Endereço de fora não é aceito.", e que o alt vazio exibe "Descreva a arte: …" sem prefixo. Corrigi as duas afirmações:
  - A recusa passa a ser a frase de `announcementRefusal`, que é a de `ctaHrefRefusal` com o prefixo "Nº aviso: ". As frases exatas estão escritas lá.
  - O alt vazio passa a ser "Nº aviso: Descreva a arte: …".
- **Canal de prévia:** inclui `ready` além de `draft` e `show`, e a assinatura do parser exige `itemCount` (decisões 4 e 5). Nenhuma afirmação das tarefas 03 e 04 ficou falsa: a 04 cita "draft/show", o que continua verdadeiro.
- **Pureza:** `core/announcements/__tests__/purity.test.ts` olha só os arquivos do módulo, no molde de `core/page`, e não o grafo transitivo. O grafo alcança `home/refusals.ts`, que tem imports sem `.ts`; o esbuild resolve (decisão 8).
- **Ambiente:** o worktree estava sem `node_modules`. Rodei `pnpm install --offline`, que terminou em 3 s e não alterou o lockfile.
- **Mutante da migration:** criei e apaguei um arquivo temporário (`supabase/migrations/29991231000000_sensor-faixa.sql`); ele não ficou na árvore.
- **Fatias 1, 2, 4, 6 e 8:** passaram pelo vermelho no próprio ciclo; nas fatias 2, 4 e 6 o vermelho foi por módulo ou export ausente. As fatias 3, 5, 7 e 9 passaram de primeira e levaram o check de mutação, todos vermelhos.

Caducou: nada

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 01
Caso: fechou com divergência
Instruções lidas: packages/core/CLAUDE.md; packages/ui/CLAUDE.md › Os tokens daqui são os do PAINEL (com as subseções de tokens da marca e ordem dos imports); CLAUDE.md › O "defeito 01" · › Convenções que valem em todo o repositório · › Alias de import · › Os guardas — o que trava o quê · › Baselines; .specs/project/PROJECT.md › Comandos de verificação · › Ambiente local
Testes escritos:
  - faixa existe só ligada e com aviso válido → packages/core/src/announcements/__tests__/exists.test.ts
  - normalização (sexto ignorado, lixo/tipo desconhecido/campo do outro tipo, nunca lança) → __tests__/normalize.test.ts
  - recusas em ordem com ordinal (vazio, rótulo sem destino, 40/60/20, conjunto 90, artes, alt, destino externo, mais de 5) → __tests__/refusals.test.ts
  - catálogo sem contagem regressiva/estoque/prova social → __tests__/catalog.test.ts
  - ctaHrefRefusal e internalMenuHrefRefusal recusam //host e /\host e aceitam /ofertas e /a/b → packages/core/src/home/__tests__/refusals.test.ts, packages/core/src/menu/__tests__/refusals.test.ts
  - canal de prévia: só o próprio carimbo, recusa Home e menu, show fora da lista recusado → __tests__/preview.test.ts
  - pureza (sem React/Supabase/alias, relativo com .ts, import type incluso) → __tests__/purity.test.ts
  - storeSettingsDefaults: announcements nasce desligada, default é o de core, nenhuma migration grava → apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts
  - useStoreSettings devolve announcements desligada sem a linha, e não descarta a linha → packages/core/src/hooks/__tests__/useStoreSettings.test.ts
  Nenhum comportamento sem cobertura.
Verificações:
  - core 5794/244, store 7190/382, backoffice 5266/297, exit 0 nos três
  - tsc: core 11 (herdados), store 0, backoffice 7 (herdados), store server 0, mobile-adm 0 — nenhum novo
  - check de mutação: 12 mutantes nas fatias que passaram de primeira, todos vermelhos
Árvore de trabalho: criado packages/core/src/announcements/ (5 arquivos + 6 testes); alterados packages/core/package.json, packages/core/CLAUDE.md, home/refusals.ts (+teste), menu/refusals.ts (+teste), hooks/useStoreSettings.ts (+teste), packages/supabase/src/types/settings.ts, apps/store/.../storeSettingsDefaults.test.ts; tasks/04 (propagação). Nada commitado.
Citações conferidas: 13 abertas, nenhuma deslocou; os intervalos de linha coincidem com o alvo: home/refusals.ts:134-157, menu/refusals.ts:87-97, carousel.ts:105, settings.ts:20,22 e 417-421, useStoreSettings.ts:30-31 e 53-54, storeSettingsDefaults.test.ts:581-595, buy-together/settings.ts, featured.ts, menu/preview.ts, page/__tests__/purity.test.ts, page/classify.ts:7. Nenhuma morta. Divergência: o ordinal masculino que a tarefa supunha inexistente existe (carousel.ts:96).
Propagado: tarefa 04 — a recusa de destino passou de "Use um caminho da loja…" para a frase de announcementRefusal/ctaHrefRefusal com o prefixo "Nº aviso: " (externo, // e /\ escritos por extenso); o alt vazio ganhou o prefixo "Nº aviso: ".
```

## T01 — wi-impl-review · done · agente a8af19867f0e21805

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos/tasks/01-regra-da-faixa-e-regua-de-destino.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| `announcementBarExists` responde `true` só com o interruptor ligado e ao menos um aviso válido | `packages/core/src/announcements/refusals.ts:110-114`, que usa a mesma régua `announcementRefusal`; `__tests__/exists.test.ts` | sim |
| A recusa de destino externo devolve o motivo, e `//host` e `/\host` são recusados pelas duas réguas | `home/refusals.ts:143-145`, `menu/refusals.ts:91`, `announcements/refusals.ts:81-83` | sim |
| O catálogo de tipos assere a ausência de contagem regressiva, estoque e prova social | `announcements/types.ts:14`; `__tests__/catalog.test.ts:17-30`, com sensor | sim |
| `useStoreSettings` devolve `announcements` com o padrão desligado quando a linha não existe | `hooks/useStoreSettings.ts:56-58`; `hooks/__tests__/useStoreSettings.test.ts:240-255` | sim |
| Cada comportamento do bloco `Testes` coberto por um teste escrito | ver a seção Testes | sim |
| Os testes dos arquivos alterados passam | — | só execução |
| A verificação mínima do arquivo de instruções (o gate de três workspaces) | — | só execução |

## Obrigações

- **`.ts` explícito em todo especificador relativo de `core/announcements`, `import type` incluso.** Aplicado nos cinco arquivos: `index.ts`, `normalize.ts:6`, `preview.ts:8-9`, `refusals.ts:7-17` e `types.ts`, que é uma folha sem import. Um teste guarda isso: `purity.test.ts:79-87`.
- **Vereditos `string | null`.** Aplicado: `announcementRefusal` e `announcementsRefusal` devolvem `string | null`. O `Announcement` é discriminado por literal de string, `kind`.
- **Gate de três workspaces (core, loja e painel).** Não dá para conferir sem executar. Fica como `só execução`.
- **Entrada do módulo `announcements` no `packages/core/CLAUDE.md`.** Aplicado: a linha na tabela de subpaths (:60) e a seção nova "`announcements` — a faixa de avisos tem UM dono".

## Testes

- **A faixa existe só ligada e com um aviso válido.** Em `__tests__/exists.test.ts`. Cobre ligada, desligada, lista vazia, só inválidos, um válido entre inválidos e `null`/`undefined`. Morde.
- **A leitura normaliza o valor gravado.** Em `__tests__/normalize.test.ts`. Cobre o sexto aviso em diante, tipo desconhecido, campo do outro tipo (por igualdade de chaves), `null`, número e texto solto, sem lançar. Morde.
- **As recusas, em ordem e com ordinal.** Em `__tests__/refusals.test.ts`. Cobre aviso vazio, rótulo sem destino, o vazio antes do rótulo, cada teto por campo no limite e um acima, o teto conjunto com cada campo dentro do seu teto, as duas artes, a descrição, o destino externo (`https://`, `//`, `/\`) e mais de 5. A frase é comparada por igualdade exata. Morde.
- **O catálogo sem os tipos proibidos.** Em `__tests__/catalog.test.ts`. Faz igualdade com `['text','image']` e varre por regex, com sensor. Morde.
- **`ctaHrefRefusal` e `internalMenuHrefRefusal`.** Os casos foram acrescentados aos testes existentes: `home/__tests__/refusals.test.ts:229-241` e `menu/__tests__/refusals.test.ts:72-82`. Recusam `//host` e `/\host` e aceitam `/ofertas` e `/a/b`. Morde.
- **O canal de prévia.** Em `__tests__/preview.test.ts`. Recusa os carimbos da Home e do menu nos três `type`. Recusa o `show` com índice fora da lista de 3, negativo, fracionário ou de outro tipo. O rascunho chega normalizado. Morde.
- **Pureza.** Em `__tests__/purity.test.ts`. Tem âncora de contagem dos cinco arquivos, âncora do extrator (≥ 9 imports) e um sensor. Varre os imports diretos do módulo, que é o que o bloco `Testes` pede.
- **`storeSettingsDefaults`.** Em `storeSettingsDefaults.test.ts:598-618`. Confere o default por identidade (`toBe`) com o de `core`, que nasce desligado, e varre as migrations sem comentário, com piso de mais de 50 arquivos. Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Reusar o `ordinal` masculino de `home/carousel.ts` | sim | `carousel.ts:89-96`: "Escrever um terceiro `ordinal` seria o 'defeito 01'". A tarefa manda o arquivo de instruções vencer | sim |
| 2 | Frase própria em `ctaHrefRefusal` para `//` e `/\`; no menu, a frase do endereço externo | sim | A tarefa: "se a régua do dono tiver outra frase, a do dono vale". A frase foi propagada para a tarefa 04, linhas 63-66. O `HeroCarousel.tsx` da loja só cita a régua em comentário | sim |
| 3 | O prefixo "Nº aviso: " em toda recusa | sim | O molde `heroCarouselSlidesRefusal`; a tarefa 04, linha 66, já diz "Nº aviso: " | sim |
| 4 | A mensagem `ready`, além de `draft` e `show` | sim | É aditiva. É o aperto de mão das pontes que as tarefas 03 e 04 mandam imitar (`useMenuPreview` e `useMenuPreviewBridge`) | sim. A tarefa 04, linha 82, ainda diz "`draft`/`show`", mas segue verdadeira, porque `ready` só se soma |
| 5 | `parseAnnouncementPreviewMessage(data, itemCount)`, que recusa o `show` fora da lista | sim | O bloco Testes pede a recusa do índice "fora da lista" | sim (tarefas 03 e 04) |
| 6 | Ordem da normalização: filtra primeiro, corta depois; campo de outro tipo ou ausente vira `''`; `id` ausente vira `aviso-N`; só `=== true` liga | sim | O contrato: "item de tipo desconhecido ou campo do outro tipo é descartado; do sexto em diante ignorado" | sim |
| 7 | Validade de um aviso = `announcementRefusal === null`; os tetos contam o texto aparado | sim | É um dono só, como o defeito 01 do arquivo de instruções exige | sim |
| 8 | Importar de `home/refusals.ts`, que tem imports sem `.ts`, sem alterá-lo | sim | A obrigação cobre os especificadores **de** `core/announcements`, e estão todos com `.ts`. O grafo transitivo (`../routes`, `./catalog`, os tipos) não importa pacote nem React. `carousel.ts` já importava `./refusals.ts`. A função `api/page` é empacotada por esbuild (`apps/store/scripts/build-server.mjs`, `bundle: true`) | sim (tarefa 02) |
| 9 | As alturas e vagas como constantes folha, sem reusar `SlotSpec` | sim | Bate com os valores de H-04 e do contrato | sim |
| 10 | `pnpm install --frozen-lockfile --offline` no worktree | sim | Nenhum arquivo de lockfile em `alterados` | sim |

## Não conferido

- **Execução.** Não rodei as suítes nem o `tsc`. Os testes passando e o gate de três workspaces (core, loja e painel) ficam como `só execução`.
- **O bundle da função `api/page`.** A premissa 8 afirma que o esbuild resolve os imports sem extensão do grafo transitivo de `home/refusals.ts`. Isso só um build prova; não dá para conferir lendo.
- **Arquivos novos sem baseline.** Todos estão como `A` (intent-to-add), então o diff alcança tudo. Não houve arquivo `??` sem baseline.

Instruções lidas: a tarefa (inteira); `packages/core/CLAUDE.md` › a tabela de subpaths e a seção nova `announcements`; o CLAUDE.md da raiz (recebido no contexto: O "defeito 01", Convenções / `strictNullChecks`, Alias de import, Os guardas, Baselines). `packages/ui/CLAUDE.md` › tokens não foi lido: o diff não toca em `packages/ui`.

## T02 — wi-impl-task · review · agente ae2b2ec14500b4853

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos/tasks/02-html-servido-diz-se-a-faixa-existe.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A função nova se chama `markAnnouncementBar(html, exists: boolean \| null)`. O nome do atributo foi exportado como `ANNOUNCEMENT_BAR_ATTRIBUTE = 'data-faixa'` em `packages/core/src/page/head.ts`. | Deixar o literal só dentro da função. | O nome do atributo passa a ter um dono só, e a loja pode importar a constante. | Tarefa 03: pode importar a constante em vez de escrever o literal. O contrato dela (`data-faixa`, `"1"`/`"0"`/ausente) não mudou. |
| 2 | A configuração é lida uma vez, no começo de `servePage`, para todo tipo de caminho (inclusive o `notfound` por classificação). O ramo de produto recebe essa mesma promessa e não chama `readSettings` de novo. A marcação acontece no fim, em `marcarFaixa`. | Ler a configuração dentro de cada ramo. | Assim a leitura corre em paralelo com o catálogo e nunca acontece duas vezes. | `packages/core/src/page/serve.ts` |
| 3 | Resposta HTML de falha de catálogo (o shell intacto com `no-store`) também leva o veredito quando a configuração respondeu. | Deixar o shell de falha sem o atributo. | A regra diz "toda resposta HTML", e essa resposta já não é cacheada. | Tarefa 03 (lê o atributo; para ela é inofensivo) |
| 4 | O 301 não é marcado nem muda de cache, mesmo com a configuração falhando. | Pôr `no-store` também no 301. | O redirect não tem corpo HTML; a regra de `no-store` (H-18) vale para "ramo HTML". | `serve.ts` |
| 5 | `readSettings` que responde sem o campo `announcementBar` é tratado como `null` ("não sei"). Chave `announcements` ausente no banco vira `"0"`, porque a normalização a lê como faixa desligada. | Tratar o campo ausente como `false`. | Diante da dúvida, sai sem atributo e sem cache, em vez de cachear um "não existe". | `serve.ts`, `server/page.ts` |
| 6 | A retirada do `index.html` mora num helper testável, `tirarShellDaSaida` em `scripts/shell.mjs`, com a condição `!env.VERCEL` (string vazia não conta como Vercel), no molde de `robots.mjs`. | Pôr a lógica direto no `build-server.mjs`. | Fica testável e segue o precedente do `build-robots`. | `apps/store/scripts/*` |
| 7 | Na prova local usei, só para leitura, o `apps/store/.env` do repositório principal (o worktree não tem `.env` da loja; o arquivo aponta para a porta 54441). A chave `announcements` foi gravada temporariamente no banco local por `psql` (porta 54442) e apagada no fim; a chave voltou a não existir, como antes. | Copiar o `.env` para o worktree. | Não deixa arquivo com credencial no worktree. | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O atributo sai uma vez só, o `lang` fica, e o HTML sem `<html>` volta intacto | unidade (`head.ts`) | `packages/core/src/page/__tests__/head.test.ts` › `markAnnouncementBar — …` (8 casos) | sim | — |
| 2 | `servePage` grava `"1"`/`"0"` em Home, produto, categoria, página fixa, rota de app (checkout) e 404 | unidade (`core/page`) | `serve.test.ts` › `servePage — o <html> diz se a faixa de avisos existe` (it.each em 8 caminhos × 2 estados, mais `lang`, leitura única e leitura em paralelo) | sim | — (vizinha "lida UMA vez" passou de primeira: mutante com segunda leitura ⇒ vermelho) |
| 3 | Configuração que falha ⇒ sem atributo, status de sempre, `no-store` | unidade | `serve.test.ts` (it.each em 8 caminhos) e `server/__tests__/page.test.ts` › "a leitura de `store_settings` que falha" | sim | — no core; no `page.test.ts`, que passou de primeira: mutante sem o `no-store` ⇒ vermelho |
| 4 | O caminho com extensão continua 404 sem ler o catálogo, e lê só `store_settings` | unidade | `serve.test.ts` › "caminho com extensão ⇒ 404 sem ler o catálogo — só store_settings" (reescrito); vizinha "SSV-22: a página fixa não toca no catálogo" (reescrito) | sim | — |
| 5 | A função pede `announcements` no `.in('key', …)` e traduz pela regra de `core` | unidade (`server/page.test.ts`, dublê que registra a chamada) | "as três chaves numa consulta", it.each de 5 estados que dão `false`, o par válido+inválido, a rota de app e a Home | sim | — ("erro LANÇA" passou de primeira: mutante sem o `throw` ⇒ vermelho) |
| 6 | O build tira `dist/index.html` com `VERCEL` definido e o mantém sem ela | unidade (`scripts/__tests__/shell.test.ts`, script executado de verdade) | `build-server.mjs — o index.html sai da saída publicada só na Vercel` (3 casos) | sim | — ("`VERCEL` vazio" passou de primeira: mutante `=== undefined` ⇒ vermelho) |
| 7 | `vercelRedirects` e `paginasFixasServidas` seguem verdes, com a âncora de 2 rewrites | guardas | `vercelRedirects.test.ts`, `paginasFixasServidas.test.ts`, `rotasDeApp.test.ts`, `sitemap.test.ts`, `paginaDeOpcaoComDonoUnico`, `chaveDeServidorForaDoNavegador`, `fusoComDonoUnico` | sim (147/147) | não se aplica (comportamento existente; nenhuma asserção mudou) |
| 8 | Integração local: `api/page.mjs` contra o Supabase local nos estados ligada, desligada e ausente | integração no ambiente local | `node --env-file` com script no scratchpad | sim | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101

## Arquivos alterados

packages/core/src/page/head.ts alterado
packages/core/src/page/serve.ts alterado
packages/core/src/page/classify.ts alterado
packages/core/src/page/__tests__/head.test.ts alterado
packages/core/src/page/__tests__/serve.test.ts alterado
packages/core/src/page/__tests__/productHead.test.ts alterado
apps/store/server/page.ts alterado
apps/store/server/__tests__/page.test.ts alterado
apps/store/scripts/shell.mjs alterado
apps/store/scripts/build-server.mjs alterado
apps/store/scripts/__tests__/shell.test.ts alterado
apps/store/src/app/__tests__/paginasFixasServidas.test.ts alterado
apps/store/CLAUDE.md alterado

## Verificação

- **Tipos.** Fonte: o arquivo de instruções (`CLAUDE.md` §Comandos). Não havia `baseline`, então medi antes da primeira fatia.
  - `npx tsc --noEmit -p packages/core/tsconfig.json`: 11 erros, idênticos aos do baseline por arquivo, código e quantidade (11 herdados).
  - `npx tsc --noEmit -p apps/store/tsconfig.app.json`: 0, como no baseline.
  - `npx tsc --noEmit -p apps/store/tsconfig.server.json`: 0, como no baseline.
- **Um arquivo de teste.** Fonte: `PROJECT.md` §Comandos de verificação. Forma: `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`.
  - `head.test.ts`: 32/32. `src/page`: 292/292. `server/__tests__/page.test.ts`: 44/44. `scripts/__tests__/shell.test.ts`: 10/10.
  - Os 7 guardas listados na fatia 7: 147/147.
- **Verificação mínima.** Fonte: o arquivo de instruções (§Baselines).
  - Suíte de `core` (`pnpm --filter @estrelinha/core test --testTimeout=20000`): exit 0, 5832 testes em 244 arquivos.
  - Suíte da loja (`pnpm --filter @estrelinha/store test --testTimeout=20000`): 7202 testes em 382 arquivos, todos passando, mas **exit 1 nas duas rodadas**. A causa é um erro do runner, `Error: [vitest-worker]: Timeout calling "onTaskUpdate"`, sem nenhum teste reprovado; ver Divergências.
- **Lint.** `npx eslint` nos 6 arquivos tocados da loja: exit 0.
- **Integração local.**
  - `pnpm --filter @estrelinha/store build`, sem `VERCEL`: exit 0, e `dist/index.html` ficou.
  - Importei `apps/store/api/page.mjs` com `node --env-file` (API 54441) e chamei `/`, um produto, `/joias-afetivas`, `/checkout` e `/a/b/c`:
    - chave ausente: `data-faixa="0"`;
    - ligada com aviso válido: `"1"`;
    - desligada: `"0"`;
    - API apontada para uma porta fechada (`127.0.0.1:1`): sem atributo e `no-store`.
  - Nos casos com leitura boa, o cache ficou o de cada ramo: `3600` na Home e no checkout, `300` no produto e na categoria, `60` no 404.
  - O banco local foi restaurado (zero linhas `announcements`).

Instruções lidas: `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md › O HTML servido — a função api/page` · `› A home não salta enquanto carrega` · `› Quem pode enquadrar a loja`; `CLAUDE.md › Os guardas — o que trava o quê` · `› Estado da infraestrutura` · `› CI e deploy` · `› Baselines`; `.specs/project/PROJECT.md › Comandos de verificação` · `› Ambiente local`.

## Divergências e descobertas

- **A suíte da loja saiu com exit 1 duas vezes, com 7202/7202 testes passando.** O erro é do runner do vitest (`Timeout calling "onTaskUpdate"`), não de teste. É a mesma assinatura que `CLAUDE.md` registra como contenção, e a tarefa 04 rodava em paralelo na mesma máquina.
- **Testes reescritos, nenhum afrouxado.** Toda resposta HTML passou a levar o atributo; as asserções foram trocadas, e não enfraquecidas:
  - os `toBe(SHELL)` de `serve.test.ts` passaram a comparar com o literal `SHELL_SEM_FAIXA`;
  - "shell sem </head>" ganhou a vizinha "shell sem <html> volta intacto";
  - "página fixa não toca no banco" e "caminho com extensão não lê nada" viraram "não toca no catálogo, lê só `store_settings`", conferindo cada leitura do catálogo;
  - em `productHead.test.ts`, "leitura que falha: shell intacto" passou a esperar o shell com `data-faixa="0"`;
  - em `server/page.test.ts`, "rota de app sem nenhuma leitura" virou "lê só `store_settings`".
- **Comentários e documentação atualizados (H-13):** `classify.ts:3,55` e `serve.ts:6`, mais o comentário de dublê em `paginasFixasServidas.test.ts`. A seção `apps/store/CLAUDE.md › O HTML servido` agora explica a Home pela função, o `index.html` fora da saída na Vercel, `data-faixa` com os três estados e o risco do tempo da Home (H-24).
- **Fatias que passaram de primeira sem check de mutação:** a integração local (não é arquivo de teste) e os guardas da fatia 7, que já existiam e não mudaram.
- **Nenhuma citação morta nem deslocada.** As citações da tarefa batem com a árvore; `classify.ts:67` é o `if (path === '/')` uns poucos números acima.
- **Nada a propagar:** nenhuma afirmação da tarefa 03 ficou falsa. A constante `ANNOUNCEMENT_BAR_ATTRIBUTE` está disponível para ela, sem mudar o contrato.
- A RLS pública de `store_settings` entrega a chave `announcements` à chave publicável; a prova local mostrou isso.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 02
Caso: fechou com divergência
Instruções lidas: packages/core/CLAUDE.md (inteiro); apps/store/CLAUDE.md › O HTML servido — a função api/page · › A home não salta enquanto carrega · › Quem pode enquadrar a loja; CLAUDE.md › Os guardas — o que trava o quê · › Estado da infraestrutura · › CI e deploy · › Baselines; .specs/project/PROJECT.md › Comandos de verificação · › Ambiente local
Testes escritos:
  - o atributo uma vez, o lang fica, o HTML sem <html> volta intacto: packages/core/src/page/__tests__/head.test.ts
  - "1"/"0" em Home, produto, categoria, página fixa, rota de app (checkout) e 404: packages/core/src/page/__tests__/serve.test.ts
  - configuração que falha ⇒ sem atributo, status de sempre, no-store: serve.test.ts e apps/store/server/__tests__/page.test.ts
  - caminho com extensão 404 sem catálogo, lendo só store_settings: serve.test.ts (reescrito, com a vizinha da página fixa)
  - a função pede announcements e traduz pela regra de core: apps/store/server/__tests__/page.test.ts
  - o build tira dist/index.html só com VERCEL: apps/store/scripts/__tests__/shell.test.ts
  - vercelRedirects/paginasFixasServidas seguem verdes: guardas existentes
  - integração local: script com node --env-file contra a API 54441, fora do repositório
  Nada ficou sem cobertura.
Verificações: tsc core 11 (idênticos ao baseline) · store app 0 · server 0; arquivos de teste tocados verdes; suíte core exit 0 (5832); suíte store 7202/7202 passando, mas exit 1 nas duas rodadas por "Timeout calling onTaskUpdate" do runner (contenção, sem teste reprovado); eslint dos arquivos da loja exit 0; build local verde; prova local nos três estados (ligada "1", desligada "0", ausente "0") e com a leitura falhando (sem atributo, no-store)
Árvore de trabalho: packages/core/src/page/{head.ts,serve.ts,classify.ts}, packages/core/src/page/__tests__/{head,serve,productHead}.test.ts, apps/store/server/page.ts, apps/store/server/__tests__/page.test.ts, apps/store/scripts/{shell.mjs,build-server.mjs}, apps/store/scripts/__tests__/shell.test.ts, apps/store/src/app/__tests__/paginasFixasServidas.test.ts, apps/store/CLAUDE.md; nada commitado
Citações conferidas: 20 abertas no uso; nenhuma deslocada de forma relevante; nenhuma morta
```

## T02 — wi-impl-review · done · agente a79bec43e57908cc2

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos/tasks/02-html-servido-diz-se-a-faixa-existe.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| Toda resposta HTML da função, Home inclusive, traz `data-faixa="1"` ou `"0"` conforme a regra de `core` | `serve.ts`: `servePage` passa toda resposta por `marcarFaixa`, que marca quando `Content-Type` é HTML. O veredito vem de `server/page.ts` `readSettings` (`announcementBarExists(normalizeAnnouncements(valor('announcements')))`). `/` já era `app`, e o catch-all `/:path*` do `vercel.json` cobre a Home | sim |
| A leitura que falha deixa o atributo ausente e a resposta `no-store` | `lerConfiguracoes` devolve `announcementBar: null` quando a leitura falha ou o campo não vem; `marcarFaixa` então troca `Cache-Control` para `PAGE_CACHE.error` e não grava atributo | sim |
| O build publicado na Vercel não leva `dist/index.html`; o local leva | `scripts/shell.mjs` `tirarShellDaSaida` (`!env.VERCEL` ⇒ mantém), chamado em `build-server.mjs` depois do `build()` | sim |
| A prova local com `api/page.mjs` contra o banco local mostra os três estados | relatada pelo implementador (premissa 7 e linha 8 de `sem mutação`) | só execução |
| Cada comportamento do bloco `Testes` coberto por um teste escrito | ver a seção Testes | sim |
| Testes dos arquivos alterados passando | — | só execução |
| Verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

- `core/page` sem alias e com `.ts` explícito: cumprida. O import novo em `serve.ts` é `./head.ts`, e `head.ts` não ganhou import. `server/page.ts` usa o alias `@estrelinha/core/announcements` do mesmo jeito que já usava para `@estrelinha/core/page`, resolvido pelos `paths` do `tsconfig.server.json`.
- Asserção de guarda reescrita só com vizinha, nunca afrouxada: cumprida.
  - "caminho com extensão ⇒ 404 sem ler nada" virou "sem ler o catálogo". Agora assere os seis leitores de catálogo não chamados, `readSettings` chamado uma vez, `data-faixa="0"` e o cache de 60.
  - SSV-22 ganhou a mesma forma.
  - `paginasFixasServidas.test.ts` mudou só no comentário, e nenhuma asserção caiu.
  - No `page.test.ts`, "rota de app sem leitura" passou a asserir que só `store_settings` é lido.
- Chave de serviço fora de `apps/**`: cumprida. Nenhuma ocorrência no diff.

## Testes

- Atributo `"1"`/`"0"` em Home, produto, categoria, página fixa, rota de app e 404: `serve.test.ts`, `describe('servePage — o <html> diz se a faixa de avisos existe')`. São dois `it.each` sobre 8 ramos, incluindo os 404 de produto e de categoria, com igualdade exata da tag e contagem de ocorrências. Morde.
- Leitura de configuração que falha ⇒ sem atributo, status inalterado e `no-store`: `it.each` sobre os mesmos 8 ramos, mais o par com a leitura boa mantendo 3600 s. Também em `page.test.ts` (Home com o PostgREST em erro ⇒ `no-store` e o shell byte a byte). Morde.
- Atributo uma vez só, `lang` mantido, HTML sem `<html>` intacto: `head.test.ts`, `describe('markAnnouncementBar…')`, por igualdade de string, com substituição e remoção quando o veredito é `null`. Morde.
- Caminho com extensão continua 404 sem ler o catálogo, lendo só `store_settings`: `serve.test.ts` (reescrito, ver Obrigações). Morde.
- A função pede `announcements` no `.in('key', …)` e traduz pela regra de `core`: `page.test.ts`, com o filtro exato e `toHaveLength(1)`. Cobre os casos desligada, vazia, inválida, jsonb lixo e `enabled` não booleano, mais o par inválido + válido ⇒ `true`. Morde.
- Build tira `dist/index.html` com `VERCEL` e mantém sem ela: `shell.test.ts`, que roda o script de verdade num diretório temporário. O `VERCEL` herdado sai do ambiente, `VERCEL=''` é provado como "não é Vercel", e o bundle precisa conter o shell (prova a ordem: embutir antes de apagar). Morde.
- `vercelRedirects` e `paginasFixasServidas` verdes: guardas que já existiam. A asserção não mudou, e passar é só execução.
- Integração local: só execução, relatada.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `markAnnouncementBar` e a constante `ANNOUNCEMENT_BAR_ATTRIBUTE = 'data-faixa'` exportada | sim | O contrato da 03 (`tasks/03-*.md:112`) consome `data-faixa` com `"1"`/`"0"`/ausente, e isso não mudou | sim |
| 2 | Configuração lida uma vez no topo de `servePage`, e o produto recebe a mesma promessa | sim | Contrato: "em paralelo com as leituras do ramo". Provado pelos testes "UMA vez" e "em paralelo" | sim |
| 3 | O shell de falha de catálogo também leva o veredito | sim | Contrato: "toda resposta HTML". Já sai `no-store` | sim |
| 4 | O 301 não é marcado nem muda de cache | sim | H-18 fala de "ramo HTML"; o 301 não tem `Content-Type` HTML | sim |
| 5 | Campo ausente ⇒ `null`; chave ausente no banco ⇒ `"0"` | sim | `normalizeAnnouncements(undefined)` devolve `{enabled:false}` e `announcementBarExists` dá `false`. Sobre o campo ausente, a decisão é conservadora e não contradiz nada | sim |
| 6 | Helper `tirarShellDaSaida` em `shell.mjs`, com `!env.VERCEL` | sim | O precedente é `build-robots.mjs`/`robots.mjs` (helper testável e o ramo por `VERCEL`). O `build` do `package.json` roda `build-server` por último, então nenhum passo depois dele lê `dist/index.html` | sim |
| 7 | Prova local com o `.env` do repositório principal só para leitura; chave gravada temporariamente no banco local e apagada | sim | A regra é só ambiente local (54441/54442), e nada foi gravado no worktree | sim |

## Não conferido

- A prova de integração (build e `api/page.mjs` contra o banco local nos três estados) e o resultado das suítes: só a execução prova, e eu não rodo nada.
- Se a Vercel, sem `dist/index.html`, de fato encaminha `/` ao catch-all `/:path*`. É comportamento de plataforma, e só um preview publicado prova.
- `packages/core/src/home/refusals.ts` importa sem `.ts`, e `core/announcements` puxa esse arquivo. Isso é da 01, não de `alterados`; o esbuild resolve sem extensão.
- Todos os arquivos de `alterados` aparecem como `M` no `git status`, então o diff tem baseline e nenhum precisou ser julgado inteiro.

Instruções lidas: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/packages/core/CLAUDE.md (pelo índice de títulos e a tabela "Os módulos", não por inteiro, apesar de a tarefa mandar ler por inteiro); /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/apps/store/CLAUDE.md › O HTML servido — a função api/page (pelo diff); CLAUDE.md da raiz › Os guardas — o que trava o quê, › Estado da infraestrutura, › CI e deploy, › Baselines (pela cópia do contexto da sessão). Não li `apps/store/CLAUDE.md` › A home não salta enquanto carrega nem › Quem pode enquadrar a loja.

## T04 — wi-impl-task · review · agente ae452c0148cd86c73

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos/tasks/04-tela-faixa-de-avisos-do-painel.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O rascunho de cada aviso guarda os campos dos dois tipos. `paraGravar` monta o aviso de `core` só com os campos do tipo escolhido, e essa forma vai tanto para o `upsert` quanto para a prévia | Gravar o rascunho cru e deixar a limpeza para `normalizeAnnouncements` | A decisão já tomada diz "o que se grava é só o do tipo escolhido". Montando a forma exata, o payload do teste pode ser conferido em igualdade exata, sem chave do outro tipo | `features/announcement-bar/model/rascunho.ts`; o valor gravado em `store_settings['announcements']` |
| 2 | Em que campo a frase de recusa aparece é decidido por `campoDaRecusa`: casa o final da frase com `ctaHrefRefusal`, e para os outros campos olha o que está vazio ou acima do teto (pelas constantes de `core`). A frase em si é sempre a de `announcementRefusal` | Mostrar a frase uma vez só, no rodapé do aviso; ou reescrever as frases no painel | A tarefa pede o motivo no campo, e `core` devolve uma única frase por aviso. Só o lugar é decidido aqui, nunca o texto | `rascunho.ts`. Se `core` mudar a ordem das cobranças, a frase continua certa, mas pode aparecer no campo errado |
| 3 | Os campos de texto não têm `maxLength`. O contador conta o texto aparado (`count`), como a régua de `core`, e passar do teto mostra a recusa | `maxLength` no `<input>` | Com `maxLength`, as recusas de teto (40/60/20 e o teto conjunto de 90) nunca apareceriam, e a tarefa pede que sejam testadas e exibidas | `AnnouncementFields.tsx` |
| 4 | O rascunho nasce do valor gravado uma vez só, na primeira leitura. Releituras depois disso não sobrescrevem o que está sendo editado | Ressincronizar a cada mudança de `data`, como no `BuyTogetherFormCard` | Releitura por foco ou por invalidação apagaria o que a dona está escrevendo | Só a página |
| 5 | A ponte reenvia "mostre o aviso N" logo depois de cada rascunho (o que tem atraso), além do envio imediato | Só o envio imediato | A loja recusa um índice que ainda não está na lista dela (`parseAnnouncementPreviewMessage`). Sem o reenvio, um aviso recém-acrescentado nunca iria para a frente da prévia | A ponte; o recebedor da tarefa 03 recebe um "mostre" a mais, idempotente |
| 6 | A arte vai para `home-images/announcements`. A tela apaga só a arte enviada nesta sessão e ainda não gravada, quando ela é trocada ou quando o aviso sai | Bucket próprio; apagar também artes já gravadas | Um bucket novo exigiria migration, que a tarefa proíbe. Apagar arte gravada antes de salvar quebraria a faixa publicada | `lib/uploadAnnouncementImage.ts`; caminhos no Storage |
| 7 | O botão-resumo de um aviso de texto vazio mostra "Aviso de texto" (o design só define o caso de imagem, "Aviso de imagem") | Linha vazia | Um alvo de 44px sem rótulo visível | `rascunho.ts › tituloDoAviso` |
| 8 | A prévia abre no Celular e tem o seletor Celular/Computador dentro do palco, com um iframe só | Dois iframes lado a lado | `previaUnica` exige um iframe por palco. A loja é mobile-first | `AnnouncementLivePreview.tsx` |
| 9 | Trilha "Loja › Faixa de avisos" como `<nav aria-label="Trilha">` acima do `PageHeader`, escondida abaixo de `md` (o mesmo critério do `RecordPageHeader`) | Mudar o `PageHeader`, que não tem trilha | Menor alcance: não toca componente compartilhado | Só a página |
| 10 | Sem alteração não salva, o Salvar fica desabilitado. Com alteração, a barra diz "Alterações não salvas." Falha ao gravar mostra "Não foi possível salvar: …" na barra | Toast | A barra já é onde a tela dá o recibo ("Salvo. …") | Só a página |
| 11 | O probe local ficou em `.specs/work-items/101-faixa-de-avisos/probes/04-faixa-no-banco.sh` | Script fora do repositório | É o mesmo lugar em que os probes dos outros Work Items ficam, e assim pode ser rodado de novo | Nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | A página grava `{ enabled, items }` em igualdade exata; trocar de tipo não leva os campos do outro; aviso sem destino vira texto | componente | `apps/backoffice/src/pages/admin/AdminAnnouncementsPage.test.tsx › gravar a faixa` | sim | vermelho (M1: campo do outro tipo vazando para o payload) |
| 2 | Destino externo (`https://`, `//host`) recusado no campo antes de qualquer rede, Salvar desabilitado, frase da barra | componente | idem › o destino é um caminho da loja | sim | vermelho (M2: recusa fora do campo; M6: Salvar sem a recusa) |
| 3 | Rótulo sem destino, imagem sem texto alternativo, contadores 40/60/20 e teto conjunto; recusa visível com o aviso recolhido | componente | idem › as recusas e os contadores | sim | vermelho (M6) |
| 4 | "+ Adicionar aviso" some com 5; subir, descer e tirar; um aviso aberto por vez | componente | idem › a lista de avisos | sim | vermelho (M4: limite; M8: mover) |
| 5 | Ajuda do atraso no interruptor, frase do atraso depois de salvar, ajuda de tom no card | componente | idem › as frases do atraso e do tom | sim | vermelho (M7: a frase do "Salvo" apagada) |
| 6 | O envio de cada arte chama o motor do `uploadImage`, na pasta da faixa, e grava a URL no campo certo; a falha mostra a mensagem | componente | idem › o envio da arte | sim | vermelho (M5: pasta trocada) |
| 7 | A ponte manda o rascunho com a origem exata e "mostre o aviso N" no anterior/próximo; o aviso novo vai à frente depois do rascunho; desligada, a prévia diz que a loja abre sem a faixa | componente (iframe dublado) | idem › a ponte da prévia | sim | vermelho (M3: `'*'` no lugar da origem; M9: reenvio do "mostre" apagado, que sobreviveu à primeira versão e ganhou o caso próprio) |
| 8 | A rota está sob o `RequireAdmin`, na ordem de `navGroups`, e é rota de foco | componente (guarda de fonte) | `app/__tests__/rotasSobGuarda.test.ts`, `widgets/admin-layout/model/navItems.test.ts`, `focusRoutes.test.ts`; `NavRail.test.tsx`, que deriva a lista de `navGroups` | sim | — (navItems e focusRoutes foram vermelhos antes do código; o caso novo de rotasSobGuarda também levou o check: tirar a rota deu vermelho) |
| 9 | `previaUnica` varre a pasta nova, aceita o terceiro palco com `<iframe>` e recusa palco que leia campo de aviso | componente (guarda de fonte) | `features/home-composition/__tests__/previaUnica.test.ts` | sim | vermelho (G1: palco lendo `.highlight`; G2: segundo `<iframe>` na lista) |
| 10 | `animacaoRespeitaMovimento` com os quatro arquivos de UI novos na lista literal e as âncoras subindo para 68/33 | componente (guarda de fonte) | `shared/lib/__tests__/animacaoRespeitaMovimento.test.ts` | sim | vermelho (A1: par `motion-reduce:` tirado da lista de avisos) |
| 11 | Integração local: o admin grava a chave, a leitura anônima vê o mesmo valor, a anônima não grava | integração (Supabase local :54441) | `.specs/work-items/101-faixa-de-avisos/probes/04-faixa-no-banco.sh` | sim (5 `ok —`) | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101

## Arquivos alterados

apps/backoffice/src/pages/admin/AdminAnnouncementsPage.tsx criado
apps/backoffice/src/pages/admin/AdminAnnouncementsPage.test.tsx criado
apps/backoffice/src/features/announcement-bar/index.ts criado
apps/backoffice/src/features/announcement-bar/model/rascunho.ts criado
apps/backoffice/src/features/announcement-bar/model/useAnnouncementsPreviewBridge.ts criado
apps/backoffice/src/features/announcement-bar/lib/uploadAnnouncementImage.ts criado
apps/backoffice/src/features/announcement-bar/ui/AnnouncementLivePreview.tsx criado
apps/backoffice/src/features/announcement-bar/ui/AnnouncementList.tsx criado
apps/backoffice/src/features/announcement-bar/ui/AnnouncementFields.tsx criado
apps/backoffice/src/app/App.tsx alterado
apps/backoffice/src/widgets/admin-layout/model/navItems.ts alterado
apps/backoffice/src/widgets/admin-layout/model/focusRoutes.ts alterado
apps/backoffice/src/app/__tests__/rotasSobGuarda.test.ts alterado
apps/backoffice/src/widgets/admin-layout/model/navItems.test.ts alterado
apps/backoffice/src/widgets/admin-layout/model/focusRoutes.test.ts alterado
apps/backoffice/src/features/home-composition/__tests__/previaUnica.test.ts alterado
apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts alterado
apps/backoffice/src/shared/lib/__tests__/folgaDoPalco.test.ts alterado
apps/backoffice/CLAUDE.md alterado
.specs/work-items/101-faixa-de-avisos/probes/04-faixa-no-banco.sh criado

## Verificação

- Tipos: `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`, do arquivo de instruções (`CLAUDE.md` §Comandos). Baseline medido antes da primeira fatia: 7 erros, todos em `ProposalStateBadge.test.tsx`. Depois: os mesmos 7, mesmo arquivo e mesma quantidade. Nenhum erro novo.
- Um arquivo de teste: `pnpm --filter @estrelinha/backoffice exec vitest run <arquivo> --testTimeout=20000`, do `PROJECT.md` › Comandos de verificação. Cada fatia verde, e 13 checks de mutação, todos vermelhos como esperado, restaurados pela cópia e conferidos com `cmp`.
- Verificação mínima, do `CLAUDE.md` §Baselines (a suíte do workspace tocado mais a da loja), um workspace por vez, exit fora de pipe:
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: exit 0, 5292/298. A primeira volta reprovou 1 caso em `folgaDoPalco.test.ts`: a âncora contava dois palcos, e o terceiro é desta tarefa. A âncora foi reescrita para três, sem afrouxar, e a suíte remedida deu verde.
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: exit 0, 7202/382 (com a árvore incluindo o trabalho da tarefa 02, que estava em andamento).
- Lint: `npx eslint` nos arquivos tocados do painel, sem nenhum aviso.
- Integração local: o probe rodou contra `http://127.0.0.1:54441`, com a `ANON_KEY` de `supabase status -o env`. 5 `ok —`, exit 0. O estado anterior da chave foi devolvido.

Instruções lidas: `DESIGN.md` › §6, §7, §8 · `apps/backoffice/CLAUDE.md` › A sidebar tem quatro eixos · A coluna é FIXA · O modo de foco · Molde dos formulários · Gravar NÃO desmonta a tela · O movimento do painel · A ponte da prévia · `/admin/menu` · `CLAUDE.md` › Feature-Sliced Design · Convenções que valem em todo o repositório · Os guardas · Baselines (já no contexto) · `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- `useStoreSettings` (`fetchAllSettings`) nunca devolve erro: quando a leitura falha, ele cai nos padrões. Por isso o `InfoBanner` com "Tentar de novo" pedido em H-23 não pode aparecer hoje; uma leitura que falha aparece como faixa desligada e sem avisos. O banner está escrito e ligado a `isError`. Registrado também em `apps/backoffice/CLAUDE.md`.
- Mais um guarda teve de mudar além dos que a tarefa citava: `folgaDoPalco.test.ts`, cuja âncora pedia exatamente dois palcos. Agora pede três, com a lista reescrita.
- O check de mutação M9 sobreviveu na primeira versão (o reenvio do "mostre" depois do rascunho não tinha teste). O caso próprio foi acrescentado e o mutante passou a dar vermelho.
- A fatia de integração local (o probe) passou de primeira, sem check de mutação, porque sobe infraestrutura. A revisão deve ler as asserções do `04-faixa-no-banco.sh`.
- Os testes da página ficaram vermelhos só pelo import ausente antes da implementação. Por isso cada comportamento levou um check de mutação próprio (coluna `Mutação`).
- Fora do que roda em jsdom, e portanto sem prova: layout em 390 e 1440, sem rolagem horizontal; a grade de 2 colunas na coluna de 560px; a altura da tela (`calc(100vh-3rem)`, copiada de `/admin/menu`); o arrasto real. A prova em navegador é da Validation e do QA.
- Nenhuma tarefa de número maior para propagar, e nada que tenha caducado.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: DESIGN.md (§6–§8); apps/backoffice/CLAUDE.md › A sidebar · A coluna é FIXA · O modo de foco · Molde dos formulários · Gravar NÃO desmonta · O movimento do painel · A ponte da prévia · /admin/menu; CLAUDE.md › Feature-Sliced Design · Convenções · Os guardas · Baselines; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: gravação exata, só o tipo escolhido e sem destino (AdminAnnouncementsPage.test.tsx › gravar a faixa); destino externo e //host (› o destino é um caminho da loja); rótulo sem destino, alt vazio, contadores 40/60/20, teto conjunto e recusa recolhida (› as recusas e os contadores); adicionar até 5, subir/descer/tirar, um aberto por vez (› a lista de avisos); ajuda do atraso, frase depois de salvar e ajuda de tom (› as frases do atraso e do tom); envio das duas artes na pasta da faixa e falha de envio (› o envio da arte); ponte com origem exata, show no anterior/próximo, show depois do rascunho, desligada (› a ponte da prévia); rota sob RequireAdmin (rotasSobGuarda.test.ts), ordem de navGroups (navItems.test.ts), rota de foco (focusRoutes.test.ts; NavRail.test.tsx derivado); previaUnica com o terceiro palco e a recusa do palco que desenha; animacaoRespeitaMovimento com 4 arquivos e âncoras 68/33; probe local 04-faixa-no-banco.sh. Sem cobertura: layout em viewport real (jsdom não mede; é da Validation/QA); o InfoBanner de erro de leitura, inalcançável porque useStoreSettings não devolve erro
Verificações: tsc backoffice 7 erros = baseline (ProposalStateBadge.test.tsx); suíte backoffice 5292/298 exit 0; suíte store 7202/382 exit 0; eslint dos arquivos tocados limpo; probe local 5 ok, exit 0; 13 mutantes, todos mortos por asserção
Árvore de trabalho: criados features/announcement-bar/** (model/rascunho.ts, model/useAnnouncementsPreviewBridge.ts, lib/uploadAnnouncementImage.ts, ui/AnnouncementLivePreview.tsx, ui/AnnouncementList.tsx, ui/AnnouncementFields.tsx, index.ts), pages/admin/AdminAnnouncementsPage.tsx e .test.tsx, .specs/work-items/101-faixa-de-avisos/probes/04-faixa-no-banco.sh; alterados App.tsx, navItems.ts, focusRoutes.ts, os guardas rotasSobGuarda, navItems, focusRoutes, previaUnica, animacaoRespeitaMovimento e folgaDoPalco, e apps/backoffice/CLAUDE.md. Nada commitado
Citações conferidas: 14 abertas ao usar (App.tsx:53-60/160, navItems.ts:100-112, focusRoutes.ts:27-37, useStoreSettings.ts:164-177, uploadImage.ts, preview.ts, AdminMenuPage.tsx, MenuLivePreview.tsx, useMenuPreviewBridge.ts, BuyTogetherFormCard.tsx + AdminBuyTogetherForm.test.tsx, uploadBannerImage.ts, HeroCarouselEditor.tsx, shared/ui/*, ListItemRow/MenuTree). Deslocadas: uploadImage.ts (validateImageFile em :66, uploadImageBlob em :129, deleteStorageImage em :175, em vez de :66/:183/:229), AdminMenuPage (o layout está em ~:356/436/463, conferido pelo alvo); nenhuma morta
```

## T04 — wi-impl-review · fixing · agente a99beabfcc315c785

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos/tasks/04-tela-faixa-de-avisos-do-painel.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | premissa derrubada | atrapalha | apps/backoffice/src/features/announcement-bar/model/rascunho.ts:109-116 | `campoDaRecusa` olha os campos numa ordem diferente da de `announcementRefusal` **hoje**, e não só se `core` mudar no futuro, como diz a premissa 2. Em `packages/core/src/announcements/refusals.ts:46-51`, `core` cobra primeiro "trecho e texto vazios", depois "rótulo sem destino", e só então os tetos. `campoDaRecusa` olha primeiro os tetos e depois o rótulo sem destino. Dois casos concretos: (a) trecho com 41 caracteres e rótulo sem destino: a frase "Nº aviso: Sem destino, o rótulo do link não aparece." aparece no campo "Trecho em destaque"; (b) trecho e texto vazios com rótulo preenchido: a frase "escreva o trecho em destaque ou o texto…" aparece no campo "Rótulo do link". A barra e o Salvar desabilitado continuam certos; o erro é só o campo em que a frase aparece. | Tarefa, H-09: "o motivo aparece no campo"; PR-6/H-19: "as recusas vêm de `core/announcements` e aparecem no campo". A premissa 2 afirma escolher o campo "pela mesma pergunta que a frase responde", e a ordem de cobranças de `core` contradiz isso. |
| 2 | identificador de processo | atrapalha | apps/backoffice/src/shared/lib/__tests__/folgaDoPalco.test.ts:53 | Um comentário de teste cita o Work Item: "A Faixa de avisos trouxe o terceiro palco (WI 101)". | regra do workflow: identificador de processo não entra no código |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| A tela grava `{ enabled, items }` e a loja lê de volta pelo banco local | `AdminAnnouncementsPage.tsx:143-153` (`useUpdateSettings` com a chave `announcements`); teste de igualdade exata em `AdminAnnouncementsPage.test.tsx:95-126`; probe `04-faixa-no-banco.sh` (o admin grava, a leitura anônima vê o mesmo valor, a anônima não grava) | sim; o probe é só execução |
| Destino externo é recusado com o motivo; aviso sem destino é aceito como texto | `rascunho.ts:90-101` + `AnnouncementFields.tsx:45-56`; testes em `:145-186` | sim |
| Até 5 avisos, ordenáveis, com tipo texto ou imagem e as duas artes | `AnnouncementList.tsx` (arrastar, subir, descer, tirar), `AdminAnnouncementsPage.tsx:260` (`ANNOUNCEMENT_LIMIT`), `AnnouncementFields.tsx:60-192` | sim |
| A prévia é a loja num iframe, com "Aviso N de M" | `AnnouncementLivePreview.tsx:150-168` (`previewSrc`, `previewFrame`, `useFullscreenStage`); `AdminAnnouncementsPage.tsx:301-325` | sim |
| A ajuda de tom e o aviso do atraso aparecem | `AdminAnnouncementsPage.tsx:43,234,240,275` | sim |
| Cada comportamento do bloco `Testes` coberto por um teste escrito | ver seção Testes | sim |
| Testes dos arquivos alterados passando | — | só execução |
| Verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

- Rota nova auto-fechada dentro do `RequireAdmin`: aplicada em `App.tsx:130`, com asserção nova em `rotasSobGuarda.test.ts:117-123`.
- Nada de `framer-motion` nem `matchMedia`; transição com par `motion-reduce:` na mesma linha: aplicada. `AdminAnnouncementsPage.tsx:212` e `AnnouncementList.tsx:19` têm o par. O `animate-spin` em `AnnouncementFields.tsx:169` é indicador de progresso e fica dispensado pela régua.
- O teste da página prova que grava (payload em igualdade exata), e o probe prova o banco: aplicada (`test.tsx:107-125` + o probe).
- Alvos de 44 px: aplicada. O resumo e os ícones têm `min-h-11`/`h-11 w-11`, e o interruptor recebe `switchClassName={SWITCH_TAP_44}`.
- O gate inclui a suíte da loja: não dá para conferir sem rodar.
- `apps/backoffice/CLAUDE.md` atualizado (sidebar, foco, terceira ponte): aplicada. Entraram a tabela da sidebar, a nota "TRÊS pontes" e a seção nova `/admin/faixa-de-avisos`.

## Testes

- Grava `{ enabled, items }` em igualdade exata: `AdminAnnouncementsPage.test.tsx:95`. O `toEqual` cobre o payload inteiro do `upsert`, e o teste vizinho `:128` confere as chaves do tipo. A asserção morde.
- Destino externo e `//host` recusados no campo, Salvar desabilitado com a frase da barra: `:160`, `:176`. Morde, inclusive conferindo que nenhuma escrita saiu.
- Rótulo sem destino, imagem sem texto alternativo, contadores 40/60/20 e teto conjunto: `:190`, `:202`, `:214`, `:228`. Morde. Os testes não forçam estouro só do texto (60) nem só do rótulo (20); os contadores desses dois são conferidos sem estouro.
- "+ Adicionar aviso" some com 5; subir, descer e tirar; um aviso aberto por vez: `:254`, `:263`, `:298`. Morde.
- Ajuda do atraso, frase depois de salvar, ajuda de tom no card: `:314`, `:327`. Morde.
- Envio de cada arte pelo motor, URL no campo certo, falha mostra a mensagem: `:341` (bucket e pasta, `src` de cada miniatura, proporção, payload gravado) e `:375`. Morde.
- A ponte manda o rascunho com a origem exata e "mostre o aviso N" no anterior e no próximo, com o iframe dublado: `:387`, `:439`, `:471`. Morde (igualdade exata da mensagem e da origem).
- A rota sob `RequireAdmin`, na ordem de `navGroups`, como rota de foco: `rotasSobGuarda.test.ts:117`, `navItems.test.ts` (listas de destinos e rótulos reescritas), `focusRoutes.test.ts` (lista exata com cinco entradas + o vizinho de prefixo). `NavRail` deriva a lista de `navGroups` e não precisou mudar.
- `previaUnica` com o terceiro palco: `previaUnica.test.ts`. Ganhou a contagem de palcos e de iframes com a pasta nova, mais um bloco com âncora e sensor que recusa o palco que leia campo de aviso. Morde.
- `animacaoRespeitaMovimento` com os 4 arquivos novos e as âncoras de 63/31 para 68/33. As contagens conferem com a leitura dos arquivos (+5 tokens / +2 pares).
- Integração local: `04-faixa-no-banco.sh`, 5 `ok —`. É untracked e não teve check de mutação; pela leitura, as cinco verificações discriminam (status 20x, igualdade JSON exata, anônima recusada, valor sem mudança, estado restaurado).

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O rascunho guarda os dois tipos; `paraGravar` monta só o tipo escolhido | sim | "Decisões já tomadas" da tarefa; `normalize.ts:19-44` monta as chaves na mesma ordem | sim |
| 2 | `campoDaRecusa` decide o campo; a frase é a de `core` | não (achado 1) | `refusals.ts:46-66`: a ordem de `core` já diverge da de `campoDaRecusa` hoje | sim |
| 3 | Sem `maxLength`; o contador conta o texto aparado | sim | `CharCounter` aceita `count`; a régua de `core` também conta aparado | sim |
| 4 | O rascunho nasce do gravado uma vez só | sim | O `sujo` compara o rascunho com o gravado relido, então a barra não mente | sim |
| 5 | Reenvia "mostre" depois de cada rascunho | sim | `useAnnouncementsPreviewBridge.ts:82-89`; teste `:439` | sim (a tarefa 03 recebe uma mensagem idempotente) |
| 6 | A arte vai para `home-images/announcements` | sim | As policies de `home-images` só filtram por bucket (`20260815120000_24-home-gerenciavel.sql:244-271`); o menu usa o mesmo bucket com a pasta `menu` | sim |
| 7 | Rótulo "Aviso de texto" para o aviso de texto vazio | sim | O design não define esse caso | sim |
| 8 | Um iframe só, abrindo no Celular, com seletor | sim | `previaUnica` exige um iframe por palco; `CLAUDE.md` do app: "O alternador abre em Celular" | sim |
| 9 | Trilha escondida abaixo de `md`, sem mexer no `PageHeader` | sim | `CLAUDE.md` do app, *Molde dos formulários*: "A trilha é `hidden md:flex`" | sim |
| 10 | Salvar desabilitado sem alteração; "Alterações não salvas."; falha na barra | sim | H-23 / `SettingsSaveButton` | sim |
| 11 | O probe fica em `.specs/work-items/101-…/probes/` | sim | É o mesmo lugar dos probes dos outros Work Items | sim |

## Não conferido

- O probe `.specs/work-items/101-faixa-de-avisos/probes/04-faixa-no-banco.sh` está `??`, sem intent-to-add. Julguei o arquivo inteiro pelo escopo da tarefa, mas não tenho baseline do diff.
- H-23, a metade do erro de leitura: como o próprio implementador registrou em `apps/backoffice/CLAUDE.md`, `useStoreSettings` cai nos padrões quando a leitura falha. O `InfoBanner` com "Tentar de novo" (`AdminAnnouncementsPage.tsx:174-187`) é inalcançável hoje, e uma leitura que falha aparece como faixa desligada e vazia. Se a dona editar nesse estado e salvar, o que estava gravado é sobrescrito. O conserto pediria alterar um hook que o Contrato marca como "Consuma; não altere", então não registrei como achado.
- Não rodei nada: testes, `tsc`, lint e a suíte da loja que o gate exige ficam com a execução.
- O layout em 390, 1024 e 1440, o arrastar com o mouse e a ausência de rolagem horizontal só a validação em navegador prova.

Instruções lidas: `apps/backoffice/CLAUDE.md` › A sidebar, › A coluna é FIXA (só o título), › O modo de foco, › Molde dos formulários, › Gravar NÃO desmonta, › O movimento do painel, › A ponte da prévia, › `/admin/menu` (início); `CLAUDE.md` (raiz) › Feature-Sliced Design, › Convenções que valem em todo o repositório, › Os guardas — o que trava o quê, › Baselines (já carregados no contexto). Não li `DESIGN.md` §6–§8.

## T04 — wi-impl-task · done · agente ae452c0148cd86c73

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos/tasks/04-tela-faixa-de-avisos-do-painel.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 2 (revista) | `campoDaRecusa` agora olha os campos na mesma ordem de `announcementRefusal`: trecho e texto vazios → campo "Texto"; rótulo sem destino → campo "Rótulo do link"; depois os tetos por campo; o teto do conjunto → campo "Texto". Destino e arte continuam como antes. A frase continua vindo só de `core` | A ordem anterior (tetos antes do rótulo sem destino e do aviso vazio), que punha a frase no campo errado já hoje | O achado 1 está certo: a ordem antiga contradizia `refusals.ts:46-51`. Se `core` mudar a ordem, `campoDaRecusa` tem de mudar junto, e os dois testes novos acusam isso | `features/announcement-bar/model/rascunho.ts`; só o campo em que a frase aparece |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 3 | A recusa aparece no campo que `core` cobra primeiro: (a) trecho acima do teto + rótulo sem destino → campo do rótulo; (b) trecho e texto vazios + rótulo → campo do texto | componente | `AdminAnnouncementsPage.test.tsx › as recusas e os contadores` (dois casos novos) | sim | vermelho (a ordem antiga reinjetada derrubou os dois casos novos; restaurada pela cópia, `cmp` ok) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101

## Arquivos alterados

apps/backoffice/src/pages/admin/AdminAnnouncementsPage.tsx criado
apps/backoffice/src/pages/admin/AdminAnnouncementsPage.test.tsx criado
apps/backoffice/src/features/announcement-bar/index.ts criado
apps/backoffice/src/features/announcement-bar/model/rascunho.ts criado
apps/backoffice/src/features/announcement-bar/model/useAnnouncementsPreviewBridge.ts criado
apps/backoffice/src/features/announcement-bar/lib/uploadAnnouncementImage.ts criado
apps/backoffice/src/features/announcement-bar/ui/AnnouncementLivePreview.tsx criado
apps/backoffice/src/features/announcement-bar/ui/AnnouncementList.tsx criado
apps/backoffice/src/features/announcement-bar/ui/AnnouncementFields.tsx criado
apps/backoffice/src/app/App.tsx alterado
apps/backoffice/src/widgets/admin-layout/model/navItems.ts alterado
apps/backoffice/src/widgets/admin-layout/model/focusRoutes.ts alterado
apps/backoffice/src/app/__tests__/rotasSobGuarda.test.ts alterado
apps/backoffice/src/widgets/admin-layout/model/navItems.test.ts alterado
apps/backoffice/src/widgets/admin-layout/model/focusRoutes.test.ts alterado
apps/backoffice/src/features/home-composition/__tests__/previaUnica.test.ts alterado
apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts alterado
apps/backoffice/src/shared/lib/__tests__/folgaDoPalco.test.ts alterado
apps/backoffice/CLAUDE.md alterado
.specs/work-items/101-faixa-de-avisos/probes/04-faixa-no-banco.sh criado

Na correção mudaram só estes três: `rascunho.ts`, `AdminAnnouncementsPage.test.tsx` e `folgaDoPalco.test.ts`.

## Verificação

- `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminAnnouncementsPage.test.tsx src/shared/lib/__tests__/folgaDoPalco.test.ts --testTimeout=20000` (comando do `PROJECT.md`): exit 0, 27/27 (22 da página, 5 da folga do palco).
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (comando do `CLAUDE.md`): os mesmos 7 erros do baseline, todos em `ProposalStateBadge.test.tsx`. Nenhum erro novo.
- `npx eslint` nos três arquivos que a correção tocou: limpo.
- A suíte completa do painel e a da loja não foram rodadas de novo. A correção mudou uma função usada só pela página e dois arquivos de teste, e os dois foram rodados.

Instruções lidas: as mesmas da implementação.

## Divergências e descobertas

- Achado 2: o comentário em `folgaDoPalco.test.ts` ficou "A Faixa de avisos trouxe o terceiro palco; a lista foi reescrita, não afrouxada.", sem o identificador do Work Item.
- Procurei outros identificadores de processo nos arquivos de código e de teste que esta tarefa tocou e não achei nenhum. `apps/backoffice/CLAUDE.md` cita "WI 101", como as outras seções dele citam números de feature. É documentação, não código, e ficou como está.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: DESIGN.md (§6–§8); apps/backoffice/CLAUDE.md › A sidebar · A coluna é FIXA · O modo de foco · Molde dos formulários · Gravar NÃO desmonta · O movimento do painel · A ponte da prévia · /admin/menu; CLAUDE.md › Feature-Sliced Design · Convenções · Os guardas · Baselines; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: gravação exata, só o tipo escolhido e aviso sem destino (AdminAnnouncementsPage.test.tsx › gravar a faixa); destino externo e //host (› o destino é um caminho da loja); rótulo sem destino, alt vazio, contadores 40/60/20, teto conjunto, recusa com o aviso recolhido e a recusa no campo que core cobra primeiro, nos dois casos (› as recusas e os contadores); adicionar até 5, subir/descer/tirar, um aberto por vez (› a lista de avisos); ajuda do atraso, frase depois de salvar e ajuda de tom (› as frases do atraso e do tom); envio das duas artes na pasta da faixa e falha de envio (› o envio da arte); ponte com origem exata, "mostre" no anterior/próximo, "mostre" depois do rascunho, prévia desligada (› a ponte da prévia); rota sob RequireAdmin (rotasSobGuarda.test.ts), ordem de navGroups (navItems.test.ts), rota de foco (focusRoutes.test.ts; NavRail.test.tsx derivado); previaUnica com o terceiro palco; animacaoRespeitaMovimento com 4 arquivos e âncoras 68/33; folgaDoPalco com três palcos; probe local 04-faixa-no-banco.sh. Sem cobertura: layout em viewport real (jsdom não mede; é da Validation/QA); o InfoBanner de erro de leitura, que não pode aparecer porque useStoreSettings não devolve erro
Verificações: implementação — tsc do painel com os 7 erros do baseline; suíte do painel 5292/298 exit 0; suíte da loja 7202/382 exit 0; eslint limpo; probe local 5 ok; 13 mutantes, todos mortos por asserção. Correção — página e folgaDoPalco 27/27 exit 0; tsc com os mesmos 7; eslint limpo; a ordem antiga reinjetada derrubou os 2 casos novos
Árvore de trabalho: criados features/announcement-bar/**, pages/admin/AdminAnnouncementsPage.tsx e .test.tsx, o probe .specs/work-items/101-faixa-de-avisos/probes/04-faixa-no-banco.sh; alterados App.tsx, navItems.ts, focusRoutes.ts, os guardas rotasSobGuarda, navItems, focusRoutes, previaUnica, animacaoRespeitaMovimento e folgaDoPalco, e apps/backoffice/CLAUDE.md. Nada commitado
Citações conferidas: 14 abertas ao usar. Deslocadas: uploadImage.ts (validateImageFile/uploadImageBlob/deleteStorageImage em :66/:129/:175, e não :66/:183/:229) e o layout de AdminMenuPage, relocalizado pelo alvo. Nenhuma morta
```

## T03 — wi-impl-task · aborted · agente a3fd82d0f446d0478

(sem resposta: error)

## T03 — wi-impl-task · aborted · agente a703546d43feac41a

(sem resposta: error)

## T03 — wi-impl-task · review · agente aa1ccbb66f90358c7

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos/tasks/03-faixa-de-avisos-na-loja.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O cabeçalho só se recolhe depois que a faixa sai da tela porque `useScrollDirection` soma à zona do topo (64) a altura **medida** (`offsetHeight`) do elemento `#avisos-da-loja`. O id é `ANNOUNCEMENT_BAR_ID`, em `shared/lib/storeChrome.ts`. O `Header.tsx` não mudou. | Passar a altura ao hook pelo `Header`: ele teria de importar a decisão de existência de outro widget, um import lateral proibido pelo `AD-033`. Descartei também somar uma constante em rem, que não acompanha a fonte do sistema a 200 %. | O hook já está em `shared`, o elemento existe só onde a faixa é desenhada, e a medida acompanha a fonte do sistema. | `useScrollDirection.ts` e `storeChrome.ts`. Quem mudar o id da faixa quebra o recolhimento; o teste do hook prende isso. |
| 2 | A regra de existência (`useAnnouncementBar`) e o recebedor da prévia (`useAnnouncementPreview`) ficaram em `widgets/announcement-bar/model/`, como o Contrato pede. | Mover os dois para `entities/`. | Com a decisão 1, nenhum outro widget precisa deles. | O widget. |
| 3 | A "primeira troca de rota" é a chave do histórico diferente da chave da carga do documento. A chave da carga é lida quando o módulo carrega (`history.state.key`, ou `'default'`). Somei uma trava no componente para que voltar à primeira entrada pelo histórico não devolva a decisão ao atributo. | Usar só a trava no componente: ela zera quando a faixa remonta ao voltar do checkout. Usar só `key !== 'default'`: ela falha no recarregamento de uma entrada já navegada. | Cumpre a H-03 também quando a faixa remonta. | `useAnnouncementBar.ts`. |
| 4 | O hook do giro ganhou `intervalMs` (padrão `HERO_CAROUSEL_INTERVAL_MS`, 6000). Um valor `<= 0` quer dizer "não gira sozinho" e é o que a prévia usa. O nome `useHeroCarousel` continua o mesmo. | Um terceiro parâmetro booleano só para a prévia. | É a menor superfície; o Banner principal chama sem o parâmetro e não muda. | `shared/lib/useHeroCarousel.ts`. `previaUnica.test.ts` não precisou aprender nome novo. |
| 5 | Em prévia, decide o rascunho; o publicado vale só até o rascunho chegar (texto da H-21). O item do bloco Testes "o banco não é lido para os avisos" ficou provado assim: com rascunho, o publicado não influencia nada. | Desligar `useStoreSettings` em prévia. A consulta é a mesma do menu, então não há como desligá-la só para os avisos. | A H-21 diz isso por extenso. | Widget. |
| 6 | "Mostre o aviso N" usa o índice da lista **crua** do rascunho (é o que a ponte do painel manda). Traduzo esse índice para a posição na lista de avisos válidos pelo `id`; se o aviso pedido é inválido, a mensagem é ignorada. | Usar o índice direto na lista exibida, o que desalinharia sempre que houvesse um aviso inválido no meio. | Contrato da ponte da tarefa 04. | Widget e ponte da 04, sem mudança nela. |
| 7 | Aviso que o painel recusaria (`announcementRefusal`) é pulado na faixa, nunca apagado. Por isso um aviso de texto sem destino só aparece sem rótulo, já que a régua recusa rótulo sem destino. | Desenhar o aviso inválido. | É a mesma régua de `announcementBarExists`. | Widget. |
| 8 | A entrada de cada aviso é a animação `@keyframes estrelinha-faixa-entra` (`translateY(6px)` → 0, 300 ms), declarada no fim de `app/App.css`, com `motion-reduce:animate-none`. | Alternar a classe de transição a cada frame (mais estado), ou usar as animações do preset, que começam em opacidade zero. | Não mexe em opacidade, e o guarda novo confere o quadro. | `App.css`; `palette`, `contrast` e `importOrder` seguem verdes. |
| 9 | A régua "nasce invisível" (`nasceInvisivel`) e a de tom (`tomProibido`) foram extraídas para `src/test/nasceInvisivel.ts` e `src/test/tomProibido.ts`. Os guardas de origem importam e reexportam, sem nenhuma asserção tocada. | Copiar as regexes (um segundo dono) ou importar um arquivo `.test` dentro de outro (as suítes rodariam duas vezes). | Uma régua só para os dois leitores. | `heroCarouselSemOpacidadeZero.test.ts` e `tomDoCompreJunto.test.ts` ganharam import e reexport. `heroSemOpacidadeZero.test.ts` (hero-banner) continua com a cópia dele: era anterior e está fora do escopo. |
| 10 | O teste "aparece na Home, numa categoria e num produto, e não no checkout nem em `/pedido-montado`" tem duas metades. A primeira é de componente: o `StoreLayout` real monta a faixa antes do `<header>` nas três rotas. A segunda lê o `App.tsx` do disco (molde de `contadorMontado`): `/`, `/produtos/:slug` e `/:slug` dentro do bloco do `StoreLayout`; `/checkout`, `/pedido-montado`, `/pedido/:id/pagamento`, `/pagar-com-cartao` e `*` fora. Vem com sensor. | Renderizar o `<App />` inteiro com todas as páginas lazy dubladas. | O exemplar apontado é o guarda de disco, e o layout real prova a montagem. | `StoreLayoutFaixa.test.tsx`. |
| 11 | `StoreLayout.test.tsx` e `StoreLayoutOverlays.test.tsx` ganharam um `vi.mock('@/widgets/announcement-bar', …)`, sem nenhuma asserção tocada. | Dar um QueryClient a esses testes. | A faixa lê a configuração pelo React Query, e sem provider esses testes quebrariam no render; ali a faixa não é o assunto. | Os dois arquivos de teste. |
| 12 | As setas são `h-11 w-11` (o próprio alvo, sem `TAP_44` e sem `absolute`), com uma caixa visível de 32×40 dentro, chevron de 16 px em `ink` e anel de foco `ink`. Não pus fundo de hover. | Hover com `ink/NN`: `accentText` recusa `ink` com opacidade dentro de superfície ouro. | PR-9 e a regra de texto chapado em superfície ouro. | Widget. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O Banner principal segue igual com o hook no endereço novo (a suíte do hook passa em `shared/lib`, byte a byte igual; `HeroCarousel.test.tsx` não foi tocado) | componente | `shared/lib/__tests__/useHeroCarousel.test.ts`, `widgets/hero-carousel/ui/__tests__/*` | sim | vermelho |
| 2 | O cabeçalho não se recolhe enquanto a faixa está na tela | unidade do hook | `shared/lib/__tests__/useScrollDirection.test.tsx` (3 casos novos) | sim | — |
| 3 | `"1"` reserva a vaga na primeira renderização; `"0"` não desenha; sem atributo decide a configuração | componente | `widgets/announcement-bar/ui/__tests__/AnnouncementBar.test.tsx` | sim | — |
| 4 | Depois da primeira troca de rota a configuração decide; `"1"` com configuração vazia deixa a vaga sem texto até a troca de rota | componente | idem | sim | — |
| 5 | Gira a cada 6 s; pausa com ponteiro, foco e dedo e retoma ao sair; com movimento reduzido não gira (e as setas seguem); um aviso só não liga temporizador | componente, relógio falso | idem | sim | — |
| 6 | As setas dão a volta e têm rótulo; ficam ausentes com um aviso só; `hidden md:flex h-11 w-11` | componente | idem | sim | — |
| 7 | O aviso de texto é um link inteiro (destaque, texto e rótulo); sem destino é texto sem link e sem rótulo | componente | idem | sim | — |
| 8 | Região "Avisos da loja", sem `aria-live` | componente | idem | sim | — |
| 9 | Aviso de imagem: `<picture>` com uma fonte por dispositivo, rendição da vaga e texto alternativo | componente | idem | sim | — |
| 10 | Em prévia: o rascunho manda, não gira, "mostre o aviso N" troca o aviso, outro carimbo e outra origem são ignorados | componente | idem | sim | — |
| 11 | Aparece na Home, numa categoria e num produto, e não em `/checkout` nem em `/pedido-montado` | componente + disco | `widgets/store-layout/ui/__tests__/StoreLayoutFaixa.test.tsx` | sim | — (metade de disco: sensor embutido) |
| 12 | Nada nasce em opacidade zero na faixa | guarda de disco | `widgets/announcement-bar/ui/__tests__/faixaSemOpacidadeZero.test.ts` | sim | vermelho |
| 13 | Os textos do widget sem urgência, escassez, prova social, exclamação nem emoji | guarda de disco | `widgets/announcement-bar/ui/__tests__/tomDaFaixa.test.ts` | sim | vermelho |
| 14 | `accentText`, `contrast`, `touchTarget`, `alvoDeToqueNaoRoubaPosicao` e `fieldBorder` seguem verdes | guardas existentes | suíte da loja | sim | não se aplica (guardas já existentes) |

As fatias 3 a 10 passaram pelo vermelho do módulo inexistente. Por cima, reinjetei 9 mutantes nos arquivos reais, com restauração por cópia e `cmp`; 8 morreram por asserção. O que sobreviveu foi "a prévia não gira": `preview ? 0` trocado por `undefined` passou verde porque 18 s com três avisos dão a volta e caem de novo no primeiro. Corrigi a asserção (6 s e 12 s) e o mutante passou a morrer, assim como "movimento reduzido" no hook.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101

## Arquivos alterados

apps/store/CLAUDE.md alterado
apps/store/src/app/App.css alterado
apps/store/src/entities/product/ui/__tests__/tomDoCompreJunto.test.ts alterado
apps/store/src/shared/lib/__tests__/useScrollDirection.test.tsx alterado
apps/store/src/shared/lib/__tests__/useHeroCarousel.test.ts criado (movido de widgets/hero-carousel/model/__tests__/, conteúdo idêntico)
apps/store/src/shared/lib/useHeroCarousel.ts criado (movido de widgets/hero-carousel/model/, com `intervalMs`)
apps/store/src/shared/lib/storeChrome.ts alterado
apps/store/src/shared/lib/useScrollDirection.ts alterado
apps/store/src/test/nasceInvisivel.ts criado
apps/store/src/test/tomProibido.ts criado
apps/store/src/widgets/announcement-bar/index.ts criado
apps/store/src/widgets/announcement-bar/model/useAnnouncementBar.ts criado
apps/store/src/widgets/announcement-bar/model/useAnnouncementPreview.ts criado
apps/store/src/widgets/announcement-bar/ui/AnnouncementBar.tsx criado
apps/store/src/widgets/announcement-bar/ui/__tests__/AnnouncementBar.test.tsx criado
apps/store/src/widgets/announcement-bar/ui/__tests__/faixaSemOpacidadeZero.test.ts criado
apps/store/src/widgets/announcement-bar/ui/__tests__/tomDaFaixa.test.ts criado
apps/store/src/widgets/hero-carousel/index.ts alterado
apps/store/src/widgets/hero-carousel/model/useHeroCarousel.ts removido (movido)
apps/store/src/widgets/hero-carousel/model/__tests__/useHeroCarousel.test.ts removido (movido)
apps/store/src/widgets/hero-carousel/ui/HeroCarousel.tsx alterado
apps/store/src/widgets/hero-carousel/ui/__tests__/heroCarouselSemOpacidadeZero.test.ts alterado
apps/store/src/widgets/store-layout/ui/StoreLayout.tsx alterado
apps/store/src/widgets/store-layout/ui/__tests__/StoreLayout.test.tsx alterado
apps/store/src/widgets/store-layout/ui/__tests__/StoreLayoutOverlays.test.tsx alterado
apps/store/src/widgets/store-layout/ui/__tests__/StoreLayoutFaixa.test.tsx criado

## Verificação

- Baseline de tipos (não veio na entrada; rodei antes da primeira fatia): `npx tsc --noEmit -p apps/store/tsconfig.app.json`, do `CLAUDE.md` §Comandos, deu exit 0 e **0 erros**. No fechamento, o mesmo comando deu exit 0 e **0 erros**: nada mudou contra a baseline.
- Arquivo de teste por fatia: `pnpm --filter @estrelinha/store exec vitest run <arquivo> --testTimeout=20000`, do `PROJECT.md` §Comandos de verificação. Verde nas fatias: hook 23, `useScrollDirection` 14, widget e guardas 39, layout 31.
- Verificação mínima: `pnpm --filter @estrelinha/store test --testTimeout=20000`, do `CLAUDE.md` §Baselines. Rodei duas vezes: **386 arquivos e 7257 testes passaram nas duas**, mas o exit foi 1 nas duas por **um** `Error: [vitest-worker]: Timeout calling "onTaskUpdate"`. É contenção do worker: o load average estava em 123, e o `CLAUDE.md` já registra esse mesmo erro como contenção, não teste. Nenhum teste reprovou.
- O gate inclui o painel (`previaUnica` lê o nome do hook): `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` deu exit 0, 298 arquivos e 5294 testes.
- `npx eslint` nos arquivos tocados da loja deu exit 0, sem achados. Fiz isso a mais; não é um dos três comandos.
- Instruções lidas: `DESIGN.md` (§2 Paleta, §6, §7, §8); `packages/ui/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › Design system · › Mobile · › O HTML servido — a função `api/page` · › A home não salta enquanto carrega · › Banner principal · › A Home é dado · › Modo prévia · › Carrinho, chrome e checkout · › Menu (consumo); `CLAUDE.md` (raiz, já em contexto: Feature-Sliced Design, Convenções, Os guardas, Baselines); `.specs/project/PROJECT.md` › Comandos de verificação · › Ambiente local.

## Divergências e descobertas

- **Retomada**: a árvore não tinha nenhum trabalho desta tarefa. O `git status` mostrava só `.specs/work-items/101-faixa-de-avisos/` não rastreado, e as tarefas 01, 02 e 04 já estavam commitadas. Nenhuma fatia estava pronta; fiz todas do zero.
- **Contrato × instrução, sem divergência de fundo**: o Contrato manda alterar `Header.tsx:124-138`. Não alterei, porque a soma da altura ficou dentro de `useScrollDirection` (decisão 1).
- **Citação que deslocou**: `previaUnica.test.ts:184` agora é :189 (a asserção `not.toMatch(/setInterval|useHeroCarousel/)`); relocalizei pelo alvo. Não precisou mudar, porque o nome do hook não mudou. `StoreLayout.tsx:88` relocalizado pelo `<Header />`. As outras citações conferiram: `index.ts:2`, `useScrollDirection.ts:28`, `Header.tsx:53-54`, `HeroCarousel.tsx` (Arte, `pauseHandlers`, `VAGAS`), `useMenuPreview.ts:59-104`, `preview.ts` (`isPreviewWindow`), `rendition.ts:156,177`, `App.tsx:222,238,245,246,248`.
- **Mutante que ficou verde**: o primeiro "a prévia não gira" e o "movimento reduzido não gira" usavam 18 s com 3 avisos, o que dá a volta e cai de novo no primeiro. Ficaram verdes com a implementação quebrada; corrigi a asserção (passos de 6 s e 12 s) e o mutante passou a morrer.
- **Fatias que passaram de primeira sem check de mutação**: as metades de disco de `StoreLayoutFaixa.test.tsx` (as rotas do App já estavam certas), protegidas pelo sensor embutido; e os guardas existentes (`accentText`, `contrast`, `touchTarget`, `alvoDeToqueNaoRoubaPosicao`, `fieldBorder`).
- **Contenção**: as duas rodadas da suíte da loja saíram com exit 1 por um único `Timeout calling "onTaskUpdate"` do worker, com 7257 de 7257 passando; o load da máquina era 123.
- **Sem execução, por ser de navegador e não desta tarefa**: CA-05 (captura idêntica com a faixa desligada), CA-06 (CLS em rede lenta), CA-07 (390 e 1440 sem rolagem lateral, texto de duas linhas sem corte, fonte a 200 %), o recolhimento real do cabeçalho com a faixa medida e a arte `object-contain` com o ouro sobrando dos lados. O jsdom devolve 0 para layout. Ficam para a Validation e o QA.
- **Duplicata que ficou**: `heroSemOpacidadeZero.test.ts` (hero-banner) continua com uma cópia própria da régua `nasceInvisivel`, anterior a esta tarefa e fora do escopo.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: DESIGN.md (§2, §6–§8); packages/ui/CLAUDE.md; apps/store/CLAUDE.md › Design system · › Mobile · › O HTML servido — a função api/page · › A home não salta enquanto carrega · › Banner principal · › A Home é dado · › Modo prévia · › Carrinho, chrome e checkout · › Menu (consumo); CLAUDE.md › Feature-Sliced Design · › Convenções · › Os guardas · › Baselines; .specs/project/PROJECT.md › Comandos de verificação · › Ambiente local
Testes escritos:
  - vaga com "1" antes da configuração; "0" não desenha; sem atributo decide a configuração — widgets/announcement-bar/ui/__tests__/AnnouncementBar.test.tsx
  - troca de rota passa a decisão à configuração; "1" com configuração vazia fica sem texto até a troca — idem
  - giro de 6 s, pausa com ponteiro, foco e dedo e retomada, movimento reduzido sem giro, um aviso sem temporizador — idem (relógio falso)
  - setas dão a volta, rótulos, ausentes com um aviso — idem
  - aviso de texto como link inteiro; sem destino vira texto sem rótulo — idem
  - região "Avisos da loja" sem aria-live — idem
  - aviso de imagem com <picture>, fonte por dispositivo, rendição da vaga e alt — idem
  - prévia: o rascunho manda, sem giro, "mostre o aviso N", carimbo e origem alheios ignorados — idem
  - Home, categoria e produto com faixa; checkout, /pedido-montado, PIX, link de cartão e 404 sem — widgets/store-layout/ui/__tests__/StoreLayoutFaixa.test.tsx (layout real + App.tsx lido do disco)
  - cabeçalho não se recolhe com a faixa na tela — shared/lib/__tests__/useScrollDirection.test.tsx
  - Banner principal igual com o hook movido — shared/lib/__tests__/useHeroCarousel.test.ts (idêntico byte a byte) + HeroCarousel.test.tsx intocado
  - nada em opacidade zero — widgets/announcement-bar/ui/__tests__/faixaSemOpacidadeZero.test.ts
  - tom memorial — widgets/announcement-bar/ui/__tests__/tomDaFaixa.test.ts
  - guardas accentText, contrast, touchTarget, alvoDeToqueNaoRoubaPosicao, fieldBorder: suíte da loja verde
  Sem cobertura automatizada: CA-05, CA-06, CA-07 e as medidas de layout (jsdom devolve 0) — ficam para a Validation e o QA em navegador.
Verificações: tsc da loja 0 erros (baseline 0); arquivos de teste das fatias verdes; suíte da loja 7257 de 7257 passando em duas rodadas, mas exit 1 nas duas por um único "Timeout calling onTaskUpdate" do worker (contenção, load 123); suíte do painel exit 0, 5294 de 5294; eslint dos arquivos tocados limpo; 9 mutantes reinjetados, 8 mortos de primeira e 1 que só morreu depois de corrigir a asserção (giro que dava a volta em 18 s)
Árvore de trabalho: widget novo apps/store/src/widgets/announcement-bar/ (ui, model, guardas); hook movido para apps/store/src/shared/lib/useHeroCarousel.ts (+ intervalMs) e a suíte dele para shared/lib/__tests__; StoreLayout monta <AnnouncementBar /> antes do <Header />; useScrollDirection soma a altura medida de #avisos-da-loja (ANNOUNCEMENT_BAR_ID em storeChrome); @keyframes estrelinha-faixa-entra no App.css; réguas extraídas para src/test/nasceInvisivel.ts e src/test/tomProibido.ts; mock da faixa em StoreLayout.test e StoreLayoutOverlays.test; seção da faixa no apps/store/CLAUDE.md. Nada commitado.
Citações conferidas: 14 abertas ao usar. Deslocaram: previaUnica.test.ts:184 → :189 e StoreLayout.tsx:88 (relocalizada pelo <Header />). Mortas: nenhuma. Header.tsx:124-138 conferida e não alterada (a soma da altura ficou no useScrollDirection).
```

## T03 — wi-impl-review · fixing · agente a6d28b16687a9b366

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos/tasks/03-faixa-de-avisos-na-loja.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | critério descoberto | atrapalha | apps/store/src/widgets/announcement-bar/model/useAnnouncementBar.ts:90 e apps/store/src/widgets/announcement-bar/ui/AnnouncementBar.tsx:137 | Em prévia, `posicao = { index, vez: show.vez }` é um objeto novo a cada render. O efeito `useEffect(() => { if (show) goTo(show.index) }, [show, goTo])` roda então depois de todo render. Depois que chega o primeiro "mostre o aviso N", cada clique em "Próximo aviso" ou "Aviso anterior" muda o índice, provoca um render e o efeito devolve a faixa ao aviso N. As setas que a faixa desenha no quadro de 1024 da prévia ficam inertes. O próprio código diz o contrário: `useAnnouncementPreview.ts:22` fala em "depois de a faixa ter andado pelas setas". Nenhum teste de prévia clica numa seta depois de um `show`. A correção é dar ao efeito uma dependência estável, como `show?.vez` e `show?.index`, ou memorizar `posicao`. | UC-01: "**Computador**: setas de anterior/próximo nas pontas (alvo de 44 px)"; Design: "[seta "Aviso anterior"] [conteúdo] [seta "Próximo aviso"]" |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| A faixa aparece acima do cabeçalho na Home, numa categoria e num produto, e não no checkout nem em `/pedido-montado` | `StoreLayout.tsx` (a faixa montada antes do `<Header />`); `App.tsx` já deixa checkout, PIX, pedido montado, link de cartão e 404 fora do layout; prova em `StoreLayoutFaixa.test.tsx` | sim |
| Com o atributo "existe", a altura está reservada na primeira renderização | `useAnnouncementBar.ts` (`atributo === '1'` ⇒ visível); `AnnouncementBar.tsx` (`h-[var(--faixa-celular)] md:h-[var(--faixa-computador)]`, com as variáveis de `ANNOUNCEMENT_BAR_HEIGHT`) | sim |
| Gira a 6 s, pausa com ponteiro, foco e dedo, e não gira com movimento reduzido | `shared/lib/useHeroCarousel.ts` (padrão `HERO_CAROUSEL_INTERVAL_MS`, `pauseHandlers`, `reduced`); `pauseHandlers` espalhados na `<section>` | sim |
| Aviso de imagem com `<picture>` e texto alternativo; aviso sem destino é texto | `ArteDoAviso` e `Aviso` em `AnnouncementBar.tsx` | sim |
| O Banner principal segue verde com o hook no endereço novo | `HeroCarousel.tsx:13` importa de `@/shared/lib/useHeroCarousel`; a suíte foi movida idêntica (diff vazio contra `HEAD`) | só execução |
| Cada comportamento do bloco `Testes` coberto por um teste escrito | ver a seção Testes | sim |
| Testes dos arquivos alterados passando | — | só execução |
| Verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- **FSD**: o widget importa só de `@/shared/lib/*`, `@estrelinha/core/*`, `@estrelinha/ui` e lucide. O `StoreLayout` (widget) importa o barril `@/widgets/announcement-bar`, o mesmo padrão que ele já usava com header, footer e mobile-nav. O hook foi movido para `shared/lib` justamente para evitar o import lateral entre `hero-carousel` e `announcement-bar`. Aplicada.
- **`motion-reduce:` na mesma linha; nada de `opacity-0` nem `fade-in`/`scale-in`/`slide-up`**: `animate-[estrelinha-faixa-entra_300ms_ease-out] motion-reduce:animate-none` (`AnnouncementBar.tsx`, div do aviso). O keyframe no `App.css` só usa `transform`. Aplicada.
- **Nada de `ink/NN` dentro de `accent`**: só `text-estrelinha-ink` e `ring-estrelinha-ink`, sólidos. Aplicada.
- **Alvo de 44 px, nunca `TAP_44` com `absolute`**: `SETA` usa `h-11 w-11`, sem `TAP_44` e sem `absolute`, e o teste confere as duas coisas. Aplicada.
- **`minmax(0, …)` desde o celular**: não há grade no widget. O miolo é flex, e o conteúdo tem `min-w-0`. Aplicada, não se aplica a grade.
- **O gate inclui a suíte do painel (`previaUnica`)**: o nome do hook não mudou, e `previaUnica.test.ts:189` continua procurando `useHeroCarousel`. Rodar é com a execução.
- **A seção da faixa no `apps/store/CLAUDE.md`**: acrescentada em "A faixa de avisos — acima do cabeçalho (WI 101)", com o atributo, a regra de existência e o hook em `shared/lib`. Aplicada.

## Testes

- **`data-faixa` "1"/"0"/ausente**: `AnnouncementBar.test.tsx` › "quando a faixa existe", três casos. Morde: confere a classe da vaga, `--faixa-computador = 3rem` e o texto vazio.
- **Depois da troca de rota a configuração decide; com "1" e configuração vazia, vaga sem texto**: dois casos no mesmo `describe`, com navegação real pelo `MemoryRouter`. Morde.
- **Giro a 6 s, pausa com ponteiro, foco e dedo, retoma, movimento reduzido, um aviso sem temporizador**: "o giro", com relógio falso. 5999 ms contra 6000 ms, mouse, focus/blur, pointer e `matchMedia` dublado; `getTimerCount() === 0` com um aviso e `> 0` com três. Morde.
- **Setas dão a volta, têm rótulo, ausentes com um aviso só**: "as setas". Morde.
- **Aviso de texto como link inteiro; sem destino, texto sem link e sem rótulo**: `textContent` exato e as classes do destaque e do rótulo. Morde.
- **Região "Avisos da loja" sem `aria-live`**: confere a região e os descendentes. Morde.
- **Aviso de imagem**: um `<picture>`, uma `<source>` com `media`, rendições de 1440 e de 780, `alt`. Morde.
- **Prévia (rascunho manda, não gira, "mostre o aviso N", carimbo e origem ignorados)**: "em prévia no painel". Morde. Não há caso de seta depois de um `show` (achado 1).
- **Na Home, numa categoria e num produto; fora do checkout e de `/pedido-montado`**: `StoreLayoutFaixa.test.tsx`. Usa o `StoreLayout` real e lê as rotas do `App.tsx` do disco, com âncora e sensor; segue o molde indicado (`contadorMontado`). Morde.
- **O cabeçalho não se recolhe enquanto a faixa está na tela**: `useScrollDirection.test.tsx`, três casos (100 ainda é topo, 117 já não é, e sem faixa 100 não é topo). Morde.
- **O Banner principal segue igual**: `shared/lib/__tests__/useHeroCarousel.test.ts` é idêntico ao antigo; `HeroCarousel.test.tsx` não aparece no diff.
- **Nada em opacidade zero**: `faixaSemOpacidadeZero.test.ts`, com âncora, o keyframe recortado do CSS e dois sensores. Morde.
- **Tom**: `tomDaFaixa.test.ts`, com âncora nos três rótulos, sensor e inverso. Morde.
- **Guardas existentes verdes**: só execução (item 14, `sem mutação`).

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Zona do topo soma o `offsetHeight` de `#avisos-da-loja`; `Header.tsx` intocado | sim | Contrato (`useScrollDirection.ts:28`); `AD-033`; o teste do hook | sim |
| 2 | Hooks em `widgets/announcement-bar/model/` | sim | Contrato da tarefa | sim |
| 3 | "Troca de rota" = chave do histórico diferente da chave da carga, mais uma trava | sim | H-03; o `BrowserRouter` usa `state.key`, ou `'default'` quando não há | sim |
| 4 | `intervalMs` no hook, com `<= 0` sendo "não gira" | sim | Contrato ("com o intervalo por parâmetro, padrão 6000"); o Banner chama sem o parâmetro | sim |
| 5 | Em prévia, o publicado vale até o rascunho chegar; a consulta continua ligada | sim | H-21 diz isso por extenso. O `apps/store/CLAUDE.md › Modo prévia` (consulta desligada) é a regra da Home, e a tarefa decide outra coisa para a faixa | sim |
| 6 | O índice de "mostre o aviso N" é o da lista crua, traduzido pelo `id` | sim | `parseAnnouncementPreviewMessage` usa a contagem da lista crua; a tarefa 04 manda N ao tocar anterior/próximo | sim |
| 7 | O aviso inválido é pulado pela mesma régua (`announcementRefusal`) | sim | `announcementBarExists` e o teste "o aviso inválido é pulado" | sim |
| 8 | Keyframe `estrelinha-faixa-entra` em `App.css` | sim | Design ("deslocamento vertical de 6 px em 300 ms"); a obrigação de opacidade | sim |
| 9 | Réguas extraídas para `src/test/` e reexportadas | sim | `src/test/sourceScan` já mora ali e é o precedente; nenhuma asserção dos guardas foi tocada | sim |
| 10 | Montagem pelo `StoreLayout` real mais a leitura de disco do `App.tsx` | sim | "Siga a forma de" aponta `contadorMontado.test.tsx`, que lê o disco | sim |
| 11 | `vi.mock` da faixa em `StoreLayout.test.tsx` e `StoreLayoutOverlays.test.tsx` | sim | Só o mock entrou no diff; nenhuma asserção mudou | sim |
| 12 | Setas `h-11 w-11` com caixa de 32×40 por dentro, sem fundo de hover | sim | PR-9; `apps/store/CLAUDE.md › Design system` (proíbe `ink/NN` em superfície ouro) | sim |

## Não conferido

- `apps/store/src/shared/lib/useHeroCarousel.ts` e `apps/store/src/shared/lib/__tests__/useHeroCarousel.test.ts` aparecem como `??`, sem intent-to-add, e não estão em `alterados`. A remoção de `widgets/hero-carousel/model/` também não está. Comparei os dois contra as versões antigas em `HEAD`:
  - a suíte é idêntica;
  - o hook mudou só no comentário e no parâmetro `intervalMs`.

  Sem baseline no `git diff`, julguei esses arquivos pela comparação manual e não pela lista que recebi.
- Só a execução prova: CLS, layout a 390, 1440 e fonte a 200 % (o texto é `text-[13px] leading-[18px]` em px dentro de uma vaga em rem), a contagem do `accentText`/`touchTarget` e a suíte do painel.
- Não li `apps/store/src/entities/menu/model/useMenuPreview.ts` linha a linha, que é o exemplar do recebedor.

Instruções lidas: `CLAUDE.md` da raiz, carregado no contexto (› Feature-Sliced Design, › Convenções que valem em todo o repositório, › Os guardas — o que trava o quê, › Baselines); `apps/store/CLAUDE.md` › Design system, › Mobile — o que quebra e não grita, › A home não salta enquanto carrega, › Modo prévia, › Carrinho, chrome e checkout, e a seção nova › A faixa de avisos. Não li `DESIGN.md`, `packages/ui/CLAUDE.md`, `apps/store/CLAUDE.md` › Banner principal, › A Home é dado, › Menu (consumo) nem › O HTML servido.

## T03 — wi-impl-task · done · agente aa1ccbb66f90358c7

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos/tasks/03-faixa-de-avisos-na-loja.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 13 | O efeito de "mostre o aviso N" agora depende de dois primitivos: o contador do pedido (`show?.vez`) e a posição (`show?.index`). O `goTo` passou a ser lido por ref. Assim cada pedido vale uma vez só, e as setas da prévia voltam a andar. | Memorizar `posicao` em `useAnnouncementBar` com `useMemo`. Descartei porque o `goTo` muda de identidade quando a lista muda, e o efeito voltaria a disparar e a devolver a faixa ao aviso pedido. | É a dependência estável que o achado pede. Pedir de novo o mesmo aviso depois de andar pelas setas continua valendo, porque o contador muda a cada pedido. | `AnnouncementBar.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 10 | Em prévia, depois de "mostre o aviso N", as setas continuam andando, e pedir o mesmo aviso de novo volta a valer | componente | `widgets/announcement-bar/ui/__tests__/AnnouncementBar.test.tsx` (caso novo) | sim | — (o caso novo ficou vermelho antes do conserto) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101

## Arquivos alterados

A tarefa inteira, implementação e correção:

apps/store/CLAUDE.md alterado
apps/store/src/app/App.css alterado
apps/store/src/entities/product/ui/__tests__/tomDoCompreJunto.test.ts alterado
apps/store/src/shared/lib/__tests__/useScrollDirection.test.tsx alterado
apps/store/src/shared/lib/__tests__/useHeroCarousel.test.ts criado (movido de widgets/hero-carousel/model/__tests__/, conteúdo idêntico)
apps/store/src/shared/lib/useHeroCarousel.ts criado (movido de widgets/hero-carousel/model/, com `intervalMs`)
apps/store/src/shared/lib/storeChrome.ts alterado
apps/store/src/shared/lib/useScrollDirection.ts alterado
apps/store/src/test/nasceInvisivel.ts criado
apps/store/src/test/tomProibido.ts criado
apps/store/src/widgets/announcement-bar/index.ts criado
apps/store/src/widgets/announcement-bar/model/useAnnouncementBar.ts criado
apps/store/src/widgets/announcement-bar/model/useAnnouncementPreview.ts criado
apps/store/src/widgets/announcement-bar/ui/AnnouncementBar.tsx criado (a correção mexeu nele)
apps/store/src/widgets/announcement-bar/ui/__tests__/AnnouncementBar.test.tsx criado (a correção mexeu nele)
apps/store/src/widgets/announcement-bar/ui/__tests__/faixaSemOpacidadeZero.test.ts criado
apps/store/src/widgets/announcement-bar/ui/__tests__/tomDaFaixa.test.ts criado
apps/store/src/widgets/hero-carousel/index.ts alterado
apps/store/src/widgets/hero-carousel/model/useHeroCarousel.ts removido (movido)
apps/store/src/widgets/hero-carousel/model/__tests__/useHeroCarousel.test.ts removido (movido)
apps/store/src/widgets/hero-carousel/ui/HeroCarousel.tsx alterado
apps/store/src/widgets/hero-carousel/ui/__tests__/heroCarouselSemOpacidadeZero.test.ts alterado
apps/store/src/widgets/store-layout/ui/StoreLayout.tsx alterado
apps/store/src/widgets/store-layout/ui/__tests__/StoreLayout.test.tsx alterado
apps/store/src/widgets/store-layout/ui/__tests__/StoreLayoutOverlays.test.tsx alterado
apps/store/src/widgets/store-layout/ui/__tests__/StoreLayoutFaixa.test.tsx criado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/widgets/announcement-bar/ui/__tests__/AnnouncementBar.test.tsx --testTimeout=20000` (comando do `PROJECT.md`): antes do conserto, 1 caso reprovou de 30 (o caso novo). Depois, `src/widgets/announcement-bar` inteiro passou: 40 de 40, exit 0.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (comando do `CLAUDE.md`): exit 0, 0 erros, igual à baseline (0).
- `npx eslint src/widgets/announcement-bar` em `apps/store`: exit 0.
- Instruções lidas: as mesmas da implementação, sem nova leitura.

## Divergências e descobertas

Não rodei de novo a suíte inteira da loja nem a do painel. A correção mexe só em um efeito de `AnnouncementBar.tsx` e no teste dele.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: DESIGN.md (§2, §6–§8); packages/ui/CLAUDE.md; apps/store/CLAUDE.md › Design system · › Mobile · › O HTML servido — a função api/page · › A home não salta enquanto carrega · › Banner principal · › A Home é dado · › Modo prévia · › Carrinho, chrome e checkout · › Menu (consumo); CLAUDE.md › Feature-Sliced Design · › Convenções · › Os guardas · › Baselines; .specs/project/PROJECT.md › Comandos de verificação · › Ambiente local
Testes escritos:
  - vaga reservada com "1" antes de a configuração chegar; "0" não desenha; sem o atributo, decide a configuração — widgets/announcement-bar/ui/__tests__/AnnouncementBar.test.tsx
  - a troca de rota passa a decisão à configuração; "1" com configuração vazia fica sem texto até a troca — idem
  - giro de 6 s; pausa com ponteiro, foco e dedo, e retomada; com movimento reduzido não gira; um aviso só não liga temporizador — idem (relógio falso)
  - as setas dão a volta e têm rótulo, e somem com um aviso só — idem
  - aviso de texto como link inteiro; sem destino vira texto, sem rótulo — idem
  - região "Avisos da loja", sem aria-live — idem
  - aviso de imagem com <picture>, uma fonte por dispositivo, rendição da vaga e alt — idem
  - prévia: o rascunho manda, a faixa não gira, "mostre o aviso N" funciona e as setas continuam andando depois dele, carimbo e origem alheios ignorados — idem
  - Home, categoria e produto com faixa; checkout, /pedido-montado, PIX, link de cartão e 404 sem faixa — widgets/store-layout/ui/__tests__/StoreLayoutFaixa.test.tsx (layout real e App.tsx lido do disco)
  - o cabeçalho não se recolhe com a faixa na tela — shared/lib/__tests__/useScrollDirection.test.tsx
  - o Banner principal fica igual com o hook movido — shared/lib/__tests__/useHeroCarousel.test.ts (idêntico byte a byte) e HeroCarousel.test.tsx intocado
  - nada nasce em opacidade zero — widgets/announcement-bar/ui/__tests__/faixaSemOpacidadeZero.test.ts
  - tom memorial — widgets/announcement-bar/ui/__tests__/tomDaFaixa.test.ts
  - guardas accentText, contrast, touchTarget, alvoDeToqueNaoRoubaPosicao e fieldBorder: verdes na suíte da loja
  Sem cobertura automatizada: CA-05, CA-06, CA-07 e as medidas de layout (o jsdom devolve 0). Ficam para a Validation e o QA em navegador.
Verificações:
  - tsc da loja: 0 erros (baseline 0).
  - Arquivos de teste das fatias: verdes. Na correção, o widget passou 40 de 40.
  - Suíte da loja: 7257 de 7257 passaram nas duas rodadas, mas o exit foi 1 nas duas por um único "Timeout calling onTaskUpdate" do worker. É contenção da máquina (load em 123), não teste reprovado.
  - Suíte do painel: exit 0, 5294 de 5294.
  - eslint dos arquivos tocados: limpo.
  - 9 mutantes reinjetados: 8 morreram de primeira; 1 (o giro que dava a volta em 18 s) só morreu depois de eu corrigir a asserção.
  - Correção da revisão: o efeito de "mostre o aviso N" deixou de rodar a cada render. Caso novo de prévia, vermelho antes do conserto e verde depois.
Árvore de trabalho:
  - widget novo em apps/store/src/widgets/announcement-bar/ (ui, model e guardas);
  - hook movido para apps/store/src/shared/lib/useHeroCarousel.ts (com intervalMs), e a suíte dele para shared/lib/__tests__;
  - o StoreLayout monta <AnnouncementBar /> antes do <Header />;
  - useScrollDirection soma à zona do topo a altura medida de #avisos-da-loja (ANNOUNCEMENT_BAR_ID, em storeChrome);
  - @keyframes estrelinha-faixa-entra no App.css;
  - réguas extraídas para src/test/nasceInvisivel.ts e src/test/tomProibido.ts;
  - mock da faixa em StoreLayout.test e StoreLayoutOverlays.test;
  - seção da faixa no apps/store/CLAUDE.md.
  Nada commitado.
Citações conferidas: 14, abertas na hora de usar. Deslocaram: previaUnica.test.ts:184, agora :189, e StoreLayout.tsx:88, relocalizada pelo <Header />. Mortas: nenhuma. Header.tsx:124-138 conferida e não alterada: a soma da altura ficou no useScrollDirection.
```

## T05 — wi-impl-task · review · agente ac63f2350107fdd09

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos/tasks/05-bug-2-faixa-depois-da-troca-de-rota.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Não alterei código de produção. O BUG-002 não se reproduz no código da HEAD (`fe757bc5`): nem no jsdom, nem num Chromium real rodando o build. Só acrescentei os testes que faltavam. | Um "conserto" especulativo do hook, como trocar a detecção por chave do histórico por uma comparação de caminho, ou mexer no `AnnouncementBar.tsx` ou no `Header.tsx`. | Não há defeito a corrigir. O hook já devolve a decisão à configuração depois da troca de rota, nos dois sentidos, e já mantém isso ao voltar à entrada da carga. Medi assim: (a) o teste que já existia em `AnnouncementBar.test.tsx` ("depois da primeira troca de rota… '0' deixa de valer") passa; (b) um experimento descartável com `BrowserRouter` e o `StoreLayout` real no jsdom passa; (c) um Chromium headless (Playwright de script, que termina sozinho e sem servidor) serviu o `apps/store/dist` da HEAD por `route.fulfill`, com o `<html data-faixa>` injetado e a configuração vindo do Supabase local. Resultado nas quatro combinações: "0"+ligada e "1"+desligada mudam depois de navegar e não voltam ao atributo ao voltar à entrada da carga; "0"+desligada e "1"+ligada ficam iguais o tempo todo, como deveriam. Sem defeito reproduzível, um teste vermelho de verdade não existe, e um conserto às cegas violaria a menor superfície. | O bug segue `open` até o reteste. Se o QA reproduzir de novo no dev server (`pnpm dev:store`), a causa é do ambiente de dev ou do método de interceptação, e precisa de diagnóstico em navegador, que esta tarefa não pode fazer (regra 8). |
| 2 | Os testes novos entraram verdes desde a primeira execução. No lugar do vermelho antes do conserto, rodei o check de mutação no hook. | Forçar um vermelho artificial, com um teste que simulasse uma causa inexistente. | O `tdd` manda o check de mutação para comportamento que já existia. Os dois mutantes morreram por asserção (ver `Fatias`). | Só o arquivo de teste. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Entrada "0" com a faixa ligada: sem faixa na carga, com os avisos depois de navegar | componente (MemoryRouter que navega) | `AnnouncementBar.test.tsx` › "entrada "0" com a faixa ligada…" | sim | vermelho (M2: tirar a guarda `!navegou.current` do ramo do atributo) |
| 2 | Entrada "1" com a faixa desligada: a vaga na carga, e ela some depois de navegar | componente | `AnnouncementBar.test.tsx` › "entrada "1" com a faixa desligada…" | sim | vermelho (M2) |
| 3 | Voltar pelo histórico à entrada da carga continua decidindo pela configuração, nos dois sentidos | componente | `AnnouncementBar.test.tsx` › "voltar pelo histórico… atributo "0"" e "… atributo "1"" | sim | vermelho (M1: a trava virou comparação simples, `navegou.current = key !== CHAVE_DA_CARGA`; os dois casos de volta caem) |

Restaurei o hook da cópia feita fora do repositório; `cmp` conferiu byte a byte.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101

## Arquivos alterados

apps/store/src/widgets/announcement-bar/ui/__tests__/AnnouncementBar.test.tsx — alterado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/widgets/announcement-bar/ui/__tests__/AnnouncementBar.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação): exit 0, 34/34.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): exit 0, 0 erros. Não havia `baseline` na entrada; a baseline do CLAUDE.md para a loja é 0, então sem mudança.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines, a suíte do workspace tocado): 386/386 arquivos e 7262/7262 testes passando. O exit foi 1, por um único `Error: [vitest-worker]: Timeout calling "onTaskUpdate"`. É contenção do worker com a máquina carregada (a onda roda em paralelo), não um teste reprovado. O CLAUDE.md já registra essa assinatura como contenção.
- Diagnóstico, fora da verificação da tarefa: o script de Chromium headless contra o `dist` da HEAD e o Supabase local está em /private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/41aab634-ec4f-436b-b86c-3ead69d83a5b/scratchpad/diag/diag.cjs. Passou nos quatro cenários.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (no contexto; seções Feature-Sliced Design, Os guardas, Baselines e Comandos). `.specs/project/PROJECT.md › Comandos de verificação` e `› Ambiente local`. Não abri o `apps/store/CLAUDE.md` (a tarefa pede a seção sobre `data-faixa`): sem mudança de produto, a leitura não alteraria nada; fica registrado.

## Divergências e descobertas

- **BUG-002 não reproduzido.** Na HEAD, o comportamento esperado já existe no jsdom (MemoryRouter e BrowserRouter, com o `StoreLayout` real) e num Chromium real rodando o build de produção. Leitura medida no Chromium, entrada "0" com a faixa ligada: na carga, sem região; em `/busca` depois do link "Coleções", região com "Black Friday…"; em `/` pelo "Início", com faixa; voltando à carga pelo histórico, com faixa. A sessão CH-05 do QA rodou no **dev server**, com o documento interceptado pelo `network route` do agent-browser. Hipóteses, nenhuma provada: (a) o agent-browser casou mais de um documento com a rota, ou a navegação foi um carregamento completo e não uma troca de rota; (b) algo próprio do Vite dev, como uma reavaliação de módulo por HMR, que recalcularia `CHAVE_DA_CARGA`. Recomendo que o reteste rode também sobre o build (`vite preview`, como no CH-07) e confira `history.state` e `performance.getEntriesByType('navigation')` depois do clique.
- Não alterei o `apps/store/CLAUDE.md` nem o `useAnnouncementBar.ts`.
- Os testes novos passaram de primeira e levaram o check de mutação, que deu vermelho nos dois mutantes. Os testes são de componente, sem infraestrutura.
- O exit 1 da suíte da loja foi a contenção `onTaskUpdate`, com todos os testes passando (registrado acima).

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 05
Caso: fechou com divergência
Instruções lidas: /Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md (Feature-Sliced Design, Os guardas, Baselines, Comandos); .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local. O apps/store/CLAUDE.md não foi lido (sem mudança de produto)
Testes escritos: apps/store/src/widgets/announcement-bar/ui/__tests__/AnnouncementBar.test.tsx — describe "depois da primeira troca de rota, decide a configuração": (1) entrada "0" + ligada ⇒ faixa com os avisos depois de navegar; (2) entrada "1" + desligada ⇒ a vaga some depois de navegar; (3) voltar à entrada da carga segue com a configuração, nos sentidos "0" e "1". Nenhum ficou vermelho antes, porque o defeito não se reproduz na HEAD; no lugar disso, check de mutação no hook, dois mutantes, os dois mortos por asserção
Verificações: vitest do arquivo, 34/34 (exit 0); tsc da loja com 0 erros; suíte da loja com 7262/7262 testes e 386/386 arquivos passando, exit 1 só pela contenção "Timeout calling onTaskUpdate"; Chromium headless contra o build da HEAD com o Supabase local: os quatro cenários corretos
Árvore de trabalho: apps/store/src/widgets/announcement-bar/ui/__tests__/AnnouncementBar.test.tsx (alterado: os testes novos). Nenhum código de produção alterado
Citações conferidas: 2 de 2 (useAnnouncementBar.ts › useAnnouncementBar com CHAVE_DA_CARGA e a trava navegou; @estrelinha/core/announcements › announcementBarExists e @estrelinha/core/page › ANNOUNCEMENT_BAR_ATTRIBUTE). Nenhuma deslocada, nenhuma morta
```

## T05 — wi-impl-review · done · agente ae3f1e5ce7de50960

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos/tasks/05-bug-2-faixa-depois-da-troca-de-rota.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| com a entrada `"0"` e a faixa ligada, a primeira troca de rota mostra a faixa | `useAnnouncementBar.ts` (o hook que já existia, não alterado): `if (key !== CHAVE_DA_CARGA) navegou.current = true` e, depois disso, `visible: existeNaConfiguracao`. Teste: `AnnouncementBar.test.tsx:207` (o caso de entrada "0" com a faixa ligada) | sim, pela leitura do código. Só a execução mostra se o sintoma que a QA viu no dev server reaparece |
| com a entrada `"1"` e a faixa desligada, a primeira troca de rota tira a vaga | o mesmo ramo do hook. Teste: `AnnouncementBar.test.tsx:219` | sim, pela leitura do código |
| cada comportamento do bloco `Testes` coberto por um teste escrito | os quatro casos novos, em `AnnouncementBar.test.tsx:206-252` | sim. O "vermelho antes do conserto" não se aplica, porque não houve conserto (ver Premissas) |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. As cercas do bloco `Não faça` foram respeitadas: o diff toca só o arquivo de teste. `packages/core/src/announcements/**`, `api/page`, `core/page` e `Header.tsx` ficaram intocados, e o hook marcado `JÁ EXISTE` continua igual.

## Testes

- **Entrada "0" com a faixa ligada.** Antes de navegar, nada é desenhado. Depois de navegar, a região "Avisos da loja" aparece com "Destaque 1" (`AnnouncementBar.test.tsx:207`). O widget é montado com um `MemoryRouter` que navega pelo `useNavigate`, sem recriar a composição à mão, como o bloco `Testes` pede. A asserção morde: um hook que ignorasse a navegação manteria `visible:false`.
- **Entrada "1" com a faixa desligada.** Na carga, a vaga existe e está vazia. Depois de navegar, ela some (`AnnouncementBar.test.tsx:219`). A asserção morde: sem a troca de rota pesando na decisão, a vaga continuaria lá.
- **Voltar pelo histórico à entrada da carga.** Há dois casos, um com "0" e outro com "1" (`AnnouncementBar.test.tsx:231` e `:243`). O `navigate(-1)` volta à chave `'default'`, que é igual a `CHAVE_DA_CARGA`. Se a trava `navegou` fosse trocada por uma comparação simples de chave, o atributo voltaria a decidir e os dois casos reprovariam. Os dois sentidos estão cobertos.
- **O teste novo reprova antes do conserto.** Não há conserto, então não há vermelho a ver. No lugar dele, o implementador declara um check de mutação no hook com dois mutantes mortos. A leitura das asserções confirma que elas matariam a remoção da trava e a remoção da detecção de troca de rota.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Não alterar código de produção, porque o BUG-002 não se reproduz na HEAD (nem no jsdom, nem no build num Chromium). Só acrescentar testes. | Sim. Nada no repositório contradiz a decisão. | O hook já implementa a regra da tarefa ("a partir da primeira troca de rota, decide a configuração", com a trava), do jeito que `apps/store/CLAUDE.md › A faixa de avisos` descreve. Procurei outros leitores do atributo e não achei: `data-faixa` só é lido em `useAnnouncementBar.ts`. O `StoreLayout` monta `<AnnouncementBar />` sem condição, e nenhum CSS ou componente (o `Header` incluído) olha o atributo. A tarefa deixou o diagnóstico com quem executa ("Sem causa raiz presumida"). | Sim. O bug segue `open` até o reteste, e a decisão não alcança contrato nem outro arquivo. |
| 2 | No lugar do vermelho, rodar o check de mutação. | Sim. | É consequência da premissa 1, e as asserções lidas matam os mutantes descritos. | Sim, alcança só o arquivo de teste. |

## Não conferido

- Não consegui conferir se a reprodução que a QA viu (dev server em :8082, com o documento interceptado) vem do ambiente ou de alguma diferença entre o dev e o build. Isso só aparece rodando, e fica para o reteste do QA.
- Não conferi os resultados das medições do implementador no Chromium e no jsdom, nem as mortes dos mutantes: são afirmações de execução.
- A baseline das alterações existe: o arquivo aparece em `git diff` como modificado, sem `??`.
- Instruções lidas: `apps/store/CLAUDE.md › A faixa de avisos — acima do cabeçalho (WI 101)`; o trecho de `apps/store/CLAUDE.md` sobre `data-faixa` em *O HTML servido*, só pela busca, sem ler a seção inteira; e `CLAUDE.md` (raiz), já no contexto, nas seções Feature-Sliced Design, Os guardas e Baselines. Não li a seção "A home não salta enquanto carrega".

## T06 — wi-impl-task · review · agente ac9417113cf2bd6f9

Tarefa: .specs/work-items/101-faixa-de-avisos/tasks/06-bug-1-alternativo-junto-das-artes.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Criei em `core` a função `announcementRefusals(item, index): string[]` (todos os motivos, na ordem da tela). `announcementRefusal` passou a devolver o primeiro dessa lista (`?? null`). | Mudar a assinatura de `announcementRefusal` para devolver uma lista. | A mudança fica só somando: loja, `api/page`, `normalize` e `announcementBarExists` continuam com o mesmo `string \| null` e o mesmo veredito. A regra continua com um dono só, em `core`. | `core/announcements` e os consumidores dele (loja, função `api/page`, painel). O veredito não muda, e os casos antigos seguem verdes. |
| 2 | Só o aviso de imagem devolve vários motivos (cada arte que falta e o texto alternativo). O destino só é cobrado quando nada mais falta. O aviso de texto continua com um motivo só, o primeiro que falha. | Juntar também os motivos do texto e o do destino. | A tarefa diz que o aviso de texto fica como está. Cobrar o destino ao lado das vagas vazias mudaria o que a tela mostra hoje sem o bug pedir. | `core/announcements/refusals.ts` e as recusas no painel |
| 3 | No painel, `recusasPorCampo` põe cada motivo de imagem numa vaga vazia, em ordem (computador, celular, alternativo). O destino continua reconhecido pela frase de `ctaHrefRefusal`, como `campoDaRecusa` já fazia. | Casar pelo sufixo da frase, ou levar o nome do campo para `core`. | É o mesmo jeito que `campoDaRecusa` já usava para escolher o lugar. A regra de quais motivos valem continua em `core`, e a superfície de `core` fica menor. | `features/announcement-bar/model/rascunho.ts`. Se `core` mudar a ordem das cobranças de imagem, o casamento em ordem erra o campo. |
| 4 | `AnnouncementFields` passou a receber `recusas: Partial<Record<CampoDoAviso, string>>` no lugar de `recusa` + `campoRecusado`. Com o aviso recolhido, aparece um parágrafo por motivo dentro do mesmo `data-testid="recusa-recolhida-N"`. | Mostrar só o primeiro motivo com o aviso recolhido. | A dona vê todas as pendências também com o aviso recolhido, e os testes antigos (que leem um pedaço do texto) continuam valendo. | `AnnouncementFields.tsx`, `AnnouncementList.tsx`. Esse componente só é usado ali. |
| 5 | Mantive `recusaDoAviso` em `rascunho.ts` e no `index.ts` da feature, embora a lista não o use mais. | Apagar o export. | Não tirei nada da API do slice por conta própria. Na regra 6, apagar seria refatoração que a tarefa não pede. | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Aviso de imagem só com a arte do computador e o alternativo vazio ⇒ os dois motivos (arte do celular e descrição); sem nenhuma arte ⇒ os três, em ordem | domínio | `packages/core/src/announcements/__tests__/refusals.test.ts` › "todos os motivos de um aviso de imagem, juntos" | sim | — |
| 2 | Duas artes e o alternativo só com espaços ⇒ só o motivo da descrição; aviso completo ⇒ nenhum motivo | domínio | idem | sim | — |
| 3 | O veredito de `announcementRefusal`/`announcementsRefusal` (o primeiro motivo) não muda; o aviso de texto continua com um motivo só | domínio | idem, "o primeiro motivo da lista…" e "todos os motivos de um aviso de texto" | sim | vermelho (`[0]` trocado por `.slice(-1)[0]`; o teste falhou, restaurei pela cópia e conferi com `cmp`) |
| 4 | Painel, pela página real: só com a arte do computador enviada, a tela mostra ao mesmo tempo o motivo da arte do celular e o do alternativo. A barra diz "Corrija o que está marcado para salvar." e o Salvar fica desabilitado. Recolhido, o cabeçalho mostra as duas pendências. | frontend | `apps/backoffice/src/pages/admin/AdminAnnouncementsPage.test.tsx` › "com só a arte do computador, a tela cobra a arte do celular e a descrição ao mesmo tempo" | sim | — (vermelho antes do conserto: `recusa-alt-0` não existia) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101

## Arquivos alterados

packages/core/src/announcements/refusals.ts alterado
packages/core/src/announcements/__tests__/refusals.test.ts alterado
apps/backoffice/src/features/announcement-bar/model/rascunho.ts alterado
apps/backoffice/src/features/announcement-bar/ui/AnnouncementFields.tsx alterado
apps/backoffice/src/features/announcement-bar/ui/AnnouncementList.tsx alterado
apps/backoffice/src/pages/admin/AdminAnnouncementsPage.test.tsx alterado

## Verificação

- Teste de um arquivo (origem: `PROJECT.md` › Comandos de verificação):
  - `pnpm --filter @estrelinha/core exec vitest run src/announcements/__tests__/refusals.test.ts --testTimeout=20000`: 5 vermelhos antes, todos verdes depois.
  - `src/announcements` inteiro: 76/76.
  - `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminAnnouncementsPage.test.tsx --testTimeout=20000`: 1 vermelho antes, 23/23 depois.
- Tipos (origem: `CLAUDE.md` › Comandos), comparados com o baseline do `CLAUDE.md` › Baselines (não veio `baseline` na entrada):
  - `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`: 7 erros, todos em `ProposalStateBadge.test.tsx`. São os mesmos 7 herdados; nenhum novo.
  - `npx tsc --noEmit -p packages/core/tsconfig.json`: 11 erros, a mesma distribuição dos herdados; nenhum novo.
  - `npx tsc --noEmit -p apps/store/tsconfig.app.json`: 0.
- Verificação mínima (origem: `CLAUDE.md` › Baselines: suíte do workspace tocado, mais a suíte da loja porque o painel mudou), um workspace por vez, exit fora de pipe:
  - core 5838/244, exit 0
  - backoffice 5295/298, exit 0
  - store 7262/386, exit 0
- Lint extra nos arquivos tocados: `npx eslint src/features/announcement-bar src/pages/admin/AdminAnnouncementsPage.test.tsx`, exit 0.

Instruções lidas:
- `CLAUDE.md` (raiz, por inteiro, no contexto)
- `packages/core/CLAUDE.md` › topo, Quando um código pertence, Pureza, Os módulos, `announcements`, Convenções de tipo
- `apps/backoffice/CLAUDE.md` › topo, Molde dos formulários, `/admin/faixa-de-avisos`
- `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local

## Divergências e descobertas

- O `apps/backoffice/CLAUDE.md` (seção `/admin/faixa-de-avisos`) e a tabela de módulos do `packages/core/CLAUDE.md` ainda citam só `announcementRefusal` e `campoDaRecusa`. Agora existem também `announcementRefusals` (core) e `recusasDoAviso`/`recusasPorCampo` (painel). Não atualizei a documentação: fica para o fecho do WI.
- `recusaDoAviso` ficou sem consumidor no painel, mas continua exportado (decisão 5).
- Não havia tarefas seguintes em `tasks/` (a 06 é a última), então não houve o que propagar. Nas tarefas fechadas 01 e 04, nenhuma afirmação ficou falsa: `announcementRefusal` continua devolvendo o mesmo primeiro motivo.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 06
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz); packages/core/CLAUDE.md (topo, módulos, announcements, convenções de tipo); apps/backoffice/CLAUDE.md (topo, molde dos formulários, /admin/faixa-de-avisos); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos:
  - core, imagem só com a arte do computador e o alternativo vazio ⇒ dois motivos; sem nada ⇒ três (refusals.test.ts)
  - core, duas artes e o alternativo só com espaços ⇒ só o alternativo; completo ⇒ nenhum (refusals.test.ts)
  - core, veredito de announcementRefusal/announcementsRefusal inalterado, texto com um motivo só (refusals.test.ts; check de mutação vermelho)
  - painel, página real: só a arte do computador ⇒ motivo do celular e do alternativo juntos, barra "Corrija…", Salvar desabilitado, e o recolhido com os dois (AdminAnnouncementsPage.test.tsx)
  Nada ficou sem cobertura.
Verificações: tsc do backoffice com 7 e do core com 11 (os herdados, nenhum novo), tsc da loja 0; suítes core 5838/244, backoffice 5295/298 e loja 7262/386, todas com exit 0; eslint dos arquivos tocados limpo
Árvore de trabalho: packages/core/src/announcements/refusals.ts, packages/core/src/announcements/__tests__/refusals.test.ts, apps/backoffice/src/features/announcement-bar/model/rascunho.ts, apps/backoffice/src/features/announcement-bar/ui/AnnouncementFields.tsx, apps/backoffice/src/features/announcement-bar/ui/AnnouncementList.tsx, apps/backoffice/src/pages/admin/AdminAnnouncementsPage.test.tsx (nada commitado)
Citações conferidas: 3 (as três linhas do Contrato: refusals.ts, os consumidores de announcementsRefusal/announcementBarExists e os arquivos do painel). Nenhuma deslocada, nenhuma morta.
```

## T06 — wi-impl-review · aborted · agente a9b952201d484e736

(sem resposta: error)

## T06 — wi-impl-task · review · agente ace1ff575a5044017

Tarefa: .specs/work-items/101-faixa-de-avisos/tasks/06-bug-1-alternativo-junto-das-artes.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Função nova `announcementRefusals` em `core` (devolve `string[]`, todos os motivos). `announcementRefusal` passa a ser o primeiro elemento dela (`[0] ?? null`) | Trocar o retorno de `announcementRefusal` para lista | A tarefa manda uma mudança aditiva. Os outros consumidores (`announcementsRefusal`, `announcementBarExists`, `normalize`, `api/page`, loja) continuam com o mesmo veredito, válido ⇔ `null`. Os casos antigos ficaram intocados | `packages/core/src/announcements/refusals.ts` e o barrel; os leitores não mudam |
| 2 | Só o aviso de imagem junta os motivos (cada arte que falta e o alternativo). O aviso de texto continua com um motivo só, e o destino só é cobrado quando nada mais falta | Juntar também os motivos do texto e do destino | A tarefa tira o aviso de texto do bug e não deixa mudar a regra dele | core e a tela do painel |
| 3 | O painel casa cada motivo de imagem com a vaga vazia, na ordem `imageDesktop, imageMobile, alt` (`recusasPorCampo`), e não lê o conteúdo da frase. O destino continua reconhecido por `campoDaRecusa` | Reconhecer o campo pelo texto da frase também na imagem | A frase continua só em `core`. Quem decide o que falta é `core`, e o painel só escolhe onde cada frase aparece | `model/rascunho.ts`; `AnnouncementFields` mudou de props (`recusa` e `campoRecusado` viraram `recusas` por campo); `AnnouncementList` |
| 4 | Recolhido, o aviso mostra todos os motivos, um `<p>` para cada, dentro de `recusa-recolhida-N` | Mostrar só o primeiro | Segue a mesma regra de "tudo de uma vez" | `ui/AnnouncementList.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Imagem com só a arte do computador e o alternativo vazio cobra a arte do celular e o alternativo; com as duas artes e o alternativo só com espaços, cobra só o alternativo; completo, nenhum; o veredito de `announcementRefusal` e `announcementsRefusal` não muda | domínio | packages/core/src/announcements/__tests__/refusals.test.ts | sim | retomada (check feito: `return [faltam[0]]` ⇒ 2 casos vermelhos; restaurado pela cópia, `cmp` ok) |
| 2 | Página real: depois de enviar só a arte do computador, aparecem os motivos da arte do celular e do alternativo juntos, a barra diz "Corrija…" e o Salvar fica desabilitado (recolhido também lista os dois) | componente (página real) | apps/backoffice/src/pages/admin/AdminAnnouncementsPage.test.tsx | sim | retomada (o mesmo mutante em core ⇒ o caso novo vermelho; restaurado) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101

## Arquivos alterados

packages/core/src/announcements/refusals.ts alterado
packages/core/src/announcements/__tests__/refusals.test.ts alterado
apps/backoffice/src/features/announcement-bar/model/rascunho.ts alterado
apps/backoffice/src/features/announcement-bar/ui/AnnouncementFields.tsx alterado
apps/backoffice/src/features/announcement-bar/ui/AnnouncementList.tsx alterado
apps/backoffice/src/pages/admin/AdminAnnouncementsPage.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/core exec vitest run src/announcements --testTimeout=20000`. Origem: PROJECT.md. Resultado: 76/76, exit 0.
- `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminAnnouncementsPage.test.tsx --testTimeout=20000`. Origem: PROJECT.md. Resultado: 23/23, exit 0.
- Check de vermelho (a implementação antiga de devolver só o primeiro motivo, reinjetada pela cópia): core 2 casos vermelhos e backoffice 1 caso vermelho. Arquivo restaurado e conferido com `cmp`.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`. Origem: CLAUDE.md. Resultado: 7 erros, todos em `ProposalStateBadge.test.tsx`, iguais ao baseline herdado. Nenhum novo.
- `npx tsc --noEmit -p packages/core/tsconfig.json`. Origem: CLAUDE.md. Resultado: 11 erros, os herdados (carousel 5, pickHomeBanners 1, pickHomeCollections 1, sitemap/urls 2, supabase/client 2). Nenhum novo.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json`. Origem: CLAUDE.md. Resultado: 0.
- Verificação mínima, suítes dos workspaces tocados mais a da loja, com exit fora de pipe. Origem: CLAUDE.md §Baselines e PROJECT.md:
  - core 5838/244, exit 0
  - backoffice 5295/298, exit 0
  - store 7262/386, exit 0
- Extra: `npx eslint` nos arquivos tocados do painel: limpo.

Instruções lidas:
- CLAUDE.md (raiz, no contexto) › O "defeito 01" · Os guardas · Baselines
- packages/core/CLAUDE.md › topo, Quando um código pertence, Pureza, Os módulos, `announcements`, Convenções de tipo
- apps/backoffice/CLAUDE.md › topo, Molde dos formulários, `/admin/faixa-de-avisos`
- .specs/project/PROJECT.md › Comandos de verificação, Ambiente local

## Divergências e descobertas

- Retomada: as duas fatias já estavam na árvore, com o teste e a implementação feitos pela corrida interrompida. Não reescrevi nada: rodei os testes (verdes) e fiz o check de vermelho nas duas.
- O texto de apps/backoffice/CLAUDE.md (§faixa-de-avisos) e de packages/core/CLAUDE.md (§announcements) ainda cita só `announcementRefusal` e `campoDaRecusa`. A tela agora usa `announcementRefusals` e `recusasPorCampo`. Não atualizei a documentação, porque isso é do fecho do WI (regra 6).
- Nenhuma tarefa seguinte da fila (esta é a última, 06); nada a propagar.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 06
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz: defeito 01, guardas, baselines), packages/core/CLAUDE.md (topo, módulos, announcements, convenções de tipo), apps/backoffice/CLAUDE.md (topo, molde dos formulários, faixa-de-avisos), .specs/project/PROJECT.md (comandos, ambiente local)
Testes escritos:
  - core: packages/core/src/announcements/__tests__/refusals.test.ts. Casos: "todos os motivos de um aviso de imagem, juntos" (só a arte do computador ⇒ celular + alternativo; as três; alternativo só com espaços ⇒ só ele; completo ⇒ nenhum; o primeiro motivo é o de announcementRefusal e announcementsRefusal) e "todos os motivos de um aviso de texto" (continua um só). Casos antigos intocados.
  - painel: apps/backoffice/src/pages/admin/AdminAnnouncementsPage.test.tsx. Caso: "com só a arte do computador, a tela cobra a arte do celular e a descrição ao mesmo tempo" (os dois alertas, a barra, o Salvar desabilitado e o recolhido).
  - Os dois reprovam com a regra antiga (check de vermelho feito). Nada ficou sem cobertura.
Verificações:
  - Testes dos arquivos: verdes (core 76, painel 23).
  - tsc: backoffice 7, core 11, store 0. Todos herdados, nenhum novo.
  - Suítes completas com exit 0: core 5838/244, backoffice 5295/298, store 7262/386.
  - eslint dos arquivos do painel: limpo.
Árvore de trabalho:
  - packages/core/src/announcements/refusals.ts (+announcementRefusals)
  - packages/core/src/announcements/__tests__/refusals.test.ts
  - apps/backoffice/src/features/announcement-bar/model/rascunho.ts (recusasDoAviso, recusasPorCampo)
  - apps/backoffice/src/features/announcement-bar/ui/AnnouncementFields.tsx
  - apps/backoffice/src/features/announcement-bar/ui/AnnouncementList.tsx
  - apps/backoffice/src/pages/admin/AdminAnnouncementsPage.test.tsx
  - Nada commitado.
Citações conferidas: 3 (refusals.ts e os seus consumidores pelo barrel; a pasta features/announcement-bar; AdminAnnouncementsPage). Nenhuma deslocada nem morta.
```

## T06 — wi-impl-review · done · agente abe97d092dcc2dd21

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos/tasks/06-bug-1-alternativo-junto-das-artes.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| com só a arte do computador e o alternativo vazio, o painel mostra os dois motivos juntos e o Salvar desabilitado | `packages/core/src/announcements/refusals.ts` (o ramo `image` junta os motivos em `faltam`), `model/rascunho.ts` (`recusasDoAviso`, `recusasPorCampo`), `ui/AnnouncementFields.tsx` (`recusas[campo]` por campo), `ui/AnnouncementList.tsx` (a lista inteira, aberta e recolhida). Testado em `AdminAnnouncementsPage.test.tsx` ("com só a arte do computador…") | sim |
| o veredito de validade do aviso para a loja e a função continua o mesmo | `announcementRefusal` = `announcementRefusals(...)[0] ?? null`. Para o aviso de texto e para o destino, o primeiro motivo é o de antes. Para a imagem, o primeiro motivo segue a ordem antiga (computador → celular → alternativo). `announcementsRefusal`/`announcementBarExists` não foram tocados. O caso novo "o primeiro motivo da lista é o que…" prova isso | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `refusals.test.ts` (4 casos de imagem e 1 de texto) e `AdminAnnouncementsPage.test.tsx` (1 caso) | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Conferi cada restrição de `Decisões já tomadas`:
- **Textos não mudam**: as três frases e o ordinal estão iguais no diff de `refusals.ts`.
- **Um dono só**: os motivos vêm de `core`, e o painel só escolhe o campo onde cada frase aparece. `recusasPorCampo` olha quais vagas estão vazias para decidir **onde** a frase vai, não **se** há recusa. O `campoDaRecusa` de antes já fazia esse mesmo exame.
- **Mudança aditiva**: `announcementRefusals` é função nova, e `announcementRefusal` mantém a assinatura `string | null`.
- **Aviso de texto como está**: cada ramo do texto devolve uma lista de um elemento só, na mesma ordem de antes.

Cerca `Não faça`: nenhum arquivo de `apps/store/src/widgets/announcement-bar/**` nem da função `api/page` está entre os alterados. O diff não tem `maxLength` nem trava de upload.

## Testes

- **core, só a arte do computador e o alternativo vazio ⇒ os dois motivos**: `refusals.test.ts`, "só com a arte do computador…", com `toEqual` sobre a lista exata. Morde: o código antigo devolvia um motivo só.
- **core, duas artes e alternativo só com espaços ⇒ o motivo do alternativo**: "com as duas artes e o alternativo só com espaços". Morde, porque a asserção é sobre a lista exata.
- **core, completo ⇒ nenhum**: "completo, nenhum motivo", com e sem `href`. Morde.
- **core, o veredito de `announcementBarExists`/`announcementsRefusal` não muda**: os casos antigos estão intocados (o diff só acrescenta). Há ainda um caso novo que compara `announcementRefusal`/`announcementsRefusal` com o primeiro motivo. Morde.
- **painel, pela página real**: `AdminAnnouncementsPage.test.tsx`, que envia só a arte do computador. Ele assere três coisas, todas pelo texto exato:
  - `recusa-imageMobile-0` **e** `recusa-alt-0` estão na tela, e `recusa-imageDesktop-0` está ausente;
  - aparece "Corrija o que está marcado para salvar." e o Salvar fica desabilitado;
  - recolhido, as duas frases continuam na tela.

  Antes do conserto, `recusa-alt-0` não existia, então o teste reprova no código antigo: morde. O nível é o declarado (página real).

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `announcementRefusals` nova, e `announcementRefusal` = `[0] ?? null` | sim | A tarefa diz: "Se a forma de devolver vários motivos exigir função nova em `core`, a que existe continua devolvendo o mesmo veredito… e a mudança é aditiva". O barrel (`index.ts`) usa `export * from './refusals.ts'`, então a função já fica exposta sem precisar editá-lo | sim. Os leitores não mudam, e nenhuma tarefa seguinte da pasta `tasks/` depende disso (06 é a última) |
| 2 | Só o aviso de imagem junta os motivos, e o destino só é cobrado quando nada mais falta | sim | A tarefa diz "O aviso de **texto** fica como está". O destino já era cobrado por último antes da mudança | sim |
| 3 | O painel casa cada motivo de imagem com a vaga vazia, em ordem (`recusasPorCampo`), e `AnnouncementFields` troca `recusa`/`campoRecusado` por `recusas` | sim | O `campoDaRecusa` anterior já decidia o lugar olhando as vagas vazias. A ordem de `CAMPOS_DA_IMAGEM` é a mesma de `core` | sim. `AnnouncementFields` só é usado por `AnnouncementList.tsx`. O guarda `animacaoRespeitaMovimento.test.ts` cita o arquivo pelo caminho, e o diff não acrescenta classe de movimento |
| 4 | Recolhido, o aviso mostra todos os motivos, um `<p>` cada, dentro de `recusa-recolhida-N` | sim | Segue a regra do bug: "corrigir tudo de uma vez" | sim. Nenhum teste usa `recusa-recolhida-N` como `<p>` específico |

## Não conferido

- Nada foi executado: a suíte, o `tsc` e o lint são só execução.
- **Observação, não achado**: `recusaDoAviso` (`apps/backoffice/src/features/announcement-bar/model/rascunho.ts:92`, ainda exportada pelo barrel `features/announcement-bar/index.ts:10`) ficou sem nenhum consumidor depois desta tarefa, nem em produção nem em teste. Antes, `AnnouncementList` a usava. Não virou achado porque nenhuma linha da tarefa nem do arquivo de instruções proíbe deixá-la.
- **Observação, não achado**: `apps/backoffice/CLAUDE.md:953-955` ainda descreve a tela como "só escolhe o campo… (`campoDaRecusa`)" e "recolhido, o aviso recusado mostra a frase", no singular. Agora são `recusasPorCampo` e as frases juntas. A tarefa não manda atualizar a documentação; quem fechar o WI precisa fazer isso.
- Nenhum arquivo de `alterados` veio `??`: os seis aparecem como `M` em `git status`, então o diff tem baseline.

Instruções lidas: `packages/core/CLAUDE.md › announcements — a faixa de avisos tem UM dono (WI 101)` e a linha `./announcements` da tabela de módulos · `apps/backoffice/CLAUDE.md › /admin/faixa-de-avisos — a faixa acima do cabeçalho da loja (WI 101)` · `CLAUDE.md` (raiz) › `O "defeito 01": dois donos do mesmo dado` · `Os guardas — o que trava o quê` · `Baselines` (carregado no contexto).
