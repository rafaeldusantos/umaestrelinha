# Log da implementação por ondas — 94

## T03 — wi-impl-task · review · agente a057a2054ff7da5fe

Tarefa: .specs/work-items/94-montar-pedido-no-app/tasks/03-leitura-do-texto-por-ia.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidi | O que descartei | Por quê | O que fica errado junto se a premissa estiver errada |
|---|---|---|---|---|
| 1 | Rodei `pnpm install --frozen-lockfile --prefer-offline` no worktree, porque ele não tinha `node_modules` (sem isso não havia `tsc` nem `vitest`). Levou 3,2 s e não mudou nenhum arquivo versionado | Abortar; usar o `node_modules` do repositório principal | O comando termina sozinho, é offline e respeita o lockfile. Sem ele, nenhuma verificação rodaria | A 01, que corre ao mesmo tempo, encontra o `node_modules` já instalado. Se ela também instalou, as duas instalações correram em paralelo, o que é inofensivo com `--frozen-lockfile` |
| 2 | Formato da resposta 200: `{ contact?, address, found }`. No modo `address` a chave `contact` não existe. `found` é o número de campos preenchidos. Texto sem dados devolve 200 com tudo vazio e `found: 0` | Responder 422 `empty` para texto sem dados | A tela "Preenchi N de M campos" precisa da contagem. Texto vazio não é erro do servidor, e o app decide a frase | A 06, que consome a resposta (propagado ao contrato dela) |
| 3 | Os desfechos são os da `seo-suggest`: 502 `upstream` (prazo de 15 s, 5xx, rede), 422 `refusal`/`truncated`/`invalid` (também quando o JSON não é objeto), 503 `not_configured`, 429 `limited`, 400 `bad_request`. Texto acima de 2.000 caracteres responde **413 `too_long`** | 400 genérico para texto longo; 503 para o modelo fora do ar | O 413 separa o texto longo de um corpo malformado. O 502 repete o padrão da porta irmã | A 06 trata 502 e 503 como "fora do ar" (propagado) |
| 4 | O teto conta antes de o corpo ser lido, no molde da `seo-suggest`: um texto recusado por tamanho também gasta uma das 30 leituras | Deixar o teto só para as leituras válidas | É a ordem do exemplar, e o requisito era: papel, depois chave, depois teto | Nenhum, fora o próprio handler |
| 5 | Modelo `claude-haiku-5-5` com esforço `low`, `maxTokens` 2048 e dois schemas fixos, um por modo. No modo `address` o schema nem pede campos de contato, e o `parse` os descarta mesmo que venham | Esforço `medium` como a `seo-suggest`; um schema único | Extração de campos é tarefa curta. Com dois schemas, "o modo address não lê contato" vale nas duas pontas | Custo e latência da leitura. Quem trocar o esforço precisa provar contra o modelo real |
| 6 | `parse.ts` normaliza assim: telefone sem o DDI 55 e com `maskPhone`; CPF com `maskCpf` só quando o dígito verificador confere; e-mail pelo `normalizeEmail`; CEP com `maskCep` só com 8 dígitos; UF só se existir na lista das 27; texto livre em uma linha e com teto por campo (nome 120, rua 160, número 20, complemento, bairro e cidade 80). O que não confere vira `''` | Devolver o valor cru marcado como "suspeito" | O critério diz "o que não passa vira vazio" | O formato dos campos que a 06 preenche |
| 7 | `mergeCep(address, answer \| null)` devolve `{ address, fromCep }`. Quando a resposta do serviço vem com um campo vazio (CEP genérico de cidade, sem rua), fica o valor do texto. A resposta do serviço é descrita por um tipo estrutural (`CepServiceAnswer`), igual a `CepLookupResult` | Apagar a rua do texto quando o serviço não a conhece; importar o tipo de `core/hooks` | "O CEP manda" só faz sentido onde o serviço tem o dado. O tipo vindo de `hooks` arrastaria o React Query para dentro de uma folha que o Deno precisa alcançar | A frase "O CEP conferiu rua, bairro e cidade" da 06, que é montada a partir de `fromCep` |
| 8 | `parse.ts` e `mergeCep.ts` entraram no barril `core/customers/index.ts`, e a âncora do `denoReach` subiu de 12 para 18 arquivos (os dois novos e as quatro folhas de `validators`) | Deixar os dois fora do barril | A tarefa pede o `denoReach` cobrindo os arquivos novos, e esse guarda caminha a partir do barril | O guarda `denoReach` de `core/customers` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `parse` aplica `maskPhone`/`maskCep`; CPF com dígito errado e e-mail inválido viram vazio; o modo address não devolve contato | core | `packages/core/src/customers/__tests__/parse.test.ts` (15) | sim | — |
| 2 | `mergeCep`: o CEP manda quando o serviço conhece; sem resposta, fica o texto | core | `packages/core/src/customers/__tests__/mergeCep.test.ts` (5) | sim | — |
| 3 | `requireAdmin` antes de tudo; 503 sem chave; 429 no teto da conta | functions | `supabase/functions/customer-parse/__tests__/handlers.test.ts` | sim | — |
| 4 | Modo address sem contato; texto acima de 2.000 recusado; prazo e 5xx viram "fora do ar"; saída cortada, recusada ou inválida vira desfecho próprio | functions | idem (27 casos no arquivo) | sim | — |
| 5 | O log tem só o tamanho e o desfecho, nunca o texto | functions | idem | sim | vermelho (pôr `text` no log derrubou o caso; restaurado e conferido com `cmp`) |
| 6 | Guardas: `claudeSoNaPorta` com `customer-parse`, `denoReach` com os arquivos novos, `wiringResolve` | functions e core | `claudeSoNaPorta.test.ts`, `denoReach.test.ts`, `wiringResolve.test.ts` | sim | — (o `denoReach` ficou vermelho pela âncora de contagem antes de ser atualizado; ganhou também um sensor novo) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

packages/core/src/customers/parse.ts — criado
packages/core/src/customers/mergeCep.ts — criado
packages/core/src/customers/__tests__/parse.test.ts — criado
packages/core/src/customers/__tests__/mergeCep.test.ts — criado
packages/core/src/customers/index.ts — alterado
packages/core/src/customers/__tests__/denoReach.test.ts — alterado
supabase/functions/customer-parse/index.ts — criado
supabase/functions/customer-parse/handlers.ts — criado
supabase/functions/customer-parse/prompt.ts — criado
supabase/functions/customer-parse/__tests__/handlers.test.ts — criado
supabase/functions/_shared/__tests__/claudeSoNaPorta.test.ts — alterado
supabase/config.toml — alterado
.specs/work-items/94-montar-pedido-no-app/tasks/06-folha-colar-texto.md — alterado (propagação do contrato)

## Verificação

- `pnpm --filter @estrelinha/core exec vitest run <arquivo> --testTimeout=20000`, um arquivo por fatia (fonte: `PROJECT.md` › Comandos de verificação): parse 15/15, mergeCep 5/5, `customers/__tests__/` inteiro 165/165.
- `pnpm --filter @estrelinha/functions exec vitest run <arquivo>` (fonte: `PROJECT.md`): handlers 27/27; `claudeSoNaPorta` + `wiringResolve` 54/54.
- `npx tsc --noEmit -p packages/core/tsconfig.json` (fonte: `CLAUDE.md` › Comandos): 11 erros, os mesmos do baseline que medi antes da primeira fatia (mesmos arquivos, códigos e contagens: carousel 5, pickHomeBanners 1, pickHomeCollections 1, urls 2, `packages/supabase/src/client.ts` 2). Nenhum é novo.
- Verificação mínima (fonte: `CLAUDE.md` › Baselines, suíte do workspace tocado):
  - `pnpm --filter @estrelinha/functions test`: exit 0, 1513/41.
  - `pnpm --filter @estrelinha/core test --testTimeout=20000`: exit 1, 5480/5481. A única falha é `src/proposals/__tests__/purity.test.ts`, cuja âncora acusa `photo.ts` e `piece.ts`. Esses dois arquivos são trabalho em andamento da 01, dentro da cerca dela; não toquei neles.
- Guardas da suíte da loja que varrem `supabase/functions` (`brandScan`, `claudeSoNoServidor`, `marcacaoSoPorAcao`, `fusoComDonoUnico`, `notificationSingleOwner`, `numeroDoPedidoComDonoUnico`, `ownerEmailComDonoUnico`, `pedidoComDonoUnico`): exit 0, 2793 casos em 111 arquivos. A montagem dos caminhos no comando provavelmente falhou, e o vitest rodou um lote maior do que só esses oito.
- Instruções lidas: `CLAUDE.md` (raiz, recebido inteiro no contexto); `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Os módulos, › customers, › proposals, › Convenções de tipo (a tarefa cita › Dinheiro, que não li); `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram, › Edge functions, › order-proposals e o pedido que nasce de uma proposta, › Secrets; `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- O worktree não tinha `node_modules` (premissa 1).
- A suíte do `core` está vermelha num guarda da 01 (`proposals/purity.test.ts`), pelos arquivos que ela está escrevendo agora. Não é desta tarefa.
- Citações conferidas: `seo-suggest/index.ts:18-28` (bate), `claudeSoNaPorta.test.ts:33` `INDEXES` (bate), a âncora `:141-147` (corresponde aos casos de `INDEXES` em 141–152), `customers/denoReach.test.ts`, `validators/index.ts:1-6` (bate: o barril não tem `.ts`), `_shared/claudePort.ts` e `rateLimit.ts` (batem). Nenhuma citação estava morta.
- Atualizei comentários que deixaram de ser verdade: a frase "lida SÓ pela function seo-suggest" junto do `ANTHROPIC_API_KEY` no `config.toml`, e o cabeçalho e o nome do caso 2 do `claudeSoNaPorta`.
- Propaguei para a 06 o formato real da resposta e dos desfechos da `customer-parse`, e os nomes exportados de `parse.ts` e `mergeCep.ts`. Só a linha da tabela de Contrato mudou.
- Ficou sem execução: a function não rodou contra o modelo real nem no edge runtime local; a tarefa não exige o probe. O texto do prompt e o esforço `low` não foram medidos contra o `claude-haiku-5-5`. A tipagem de `handlers.ts` e `prompt.ts` não passa por `tsc` (nenhum comando declarado cobre `supabase/functions`); só o vitest os carrega.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); packages/core/CLAUDE.md (› Quando um código pertence…, › Pureza, › Os módulos, › customers, › proposals, › Convenções de tipo); supabase/CLAUDE.md (› Migrations, › RLS, › Edge functions, › order-proposals…, › Secrets); .specs/project/PROJECT.md (› Comandos de verificação, › Ambiente local)
Testes escritos:
  - requireAdmin primeiro / 503 sem chave / 429 no teto → supabase/functions/customer-parse/__tests__/handlers.test.ts
  - modo address sem contato / > 2.000 recusado (413) / prazo e 5xx = 502 upstream / truncated, refusal e invalid = 422 próprio → idem
  - log só com tamanho e desfecho → idem (com check de mutação: vermelho)
  - parse: máscaras, CPF com dígito errado, e-mail inválido → packages/core/src/customers/__tests__/parse.test.ts
  - mergeCep: o CEP manda / sem resposta fica o texto → packages/core/src/customers/__tests__/mergeCep.test.ts
  - guardas: claudeSoNaPorta (INDEXES com customer-parse), denoReach (âncora 18 e sensor novo), wiringResolve (deriva sozinho)
  - sem cobertura: nenhum comportamento do bloco Testes
Verificações: arquivos de teste das fatias verdes; tsc do core = baseline (11 herdados); functions 1513/41 com exit 0; core 5480/5481 (a falha é proposals/purity, trabalho em andamento da 01); guardas da loja que varrem as functions verdes
Árvore de trabalho: criados core/customers/{parse,mergeCep}.ts e os testes deles, e supabase/functions/customer-parse/{index,handlers,prompt}.ts e o teste; alterados customers/index.ts, customers/__tests__/denoReach.test.ts, _shared/__tests__/claudeSoNaPorta.test.ts e supabase/config.toml; o node_modules foi instalado (não é versionado). Nada commitado
Citações conferidas: 7 abertas; a âncora :141-147 corresponde aos casos de INDEXES em 141–152; nenhuma morta
Propagado: 06 — a linha do Contrato da customer-parse (formato 200 { contact?, address, found } e os desfechos 503/502/422/429/413/400/401/403) e os nomes de parse.ts e mergeCep.ts
```

## T03 — wi-impl-review · done · agente aab95cb65a4f4ad95

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/03-leitura-do-texto-por-ia.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a function responde com campos conferidos nos dois modos, e com os desfechos de recusa, falta de chave, limite e fora do ar | `supabase/functions/customer-parse/handlers.ts`: `route` (requireAdmin → 503 not_configured → 429 limited → corpo 400/413 → modelo; 502 upstream, 422 refusal/truncated/invalid, 200 `{contact?, address, found}`); `index.ts` só faz a fiação; `config.toml` `[functions.customer-parse] verify_jwt = false` | sim |
| `parse` e `mergeCep` cobertos em `core` | `packages/core/src/customers/__tests__/parse.test.ts`, `mergeCep.test.ts` | sim |
| cada comportamento do bloco `Testes` coberto por um teste escrito | ver a seção Testes | sim |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- `index.ts` só faz a fiação, e a regra fica em `handlers.ts` com as dependências injetadas: aplicado. `index.ts` lê o env, monta o client, a porta (`createClaudeJson`, ou `null` quando falta a chave) e `createRateLimiter(30, 600_000)`, e chama `Deno.serve`. É o mesmo molde da `seo-suggest`.
- Todo import relativo leva `.ts`, `import type` incluso, e nenhum pacote entra no grafo: aplicado. Isso vale para `handlers.ts`, `prompt.ts`, `parse.ts` (importa só das folhas `validators/{cpf,phone,email,cep}.ts`, que não importam nada) e `mergeCep.ts` (só `import type ... './parse.ts'`). O `denoReach` foi ampliado para 18 arquivos e a `purity.test.ts` de customers continua valendo para os novos.
- A API da Anthropic não é chamada nos testes: aplicado. O teste do handler usa a porta dublada (`porta`/`portaProibida`) e nunca importa `_shared/claude.ts`.

## Testes

- `requireAdmin` vem antes de tudo: `handlers.test.ts`. Sem header, responde 401 mesmo com `claude: null` e com o teto estourado. Sem papel, responde 403 sem gastar o teto. `has_role` com erro dá 403. A porta usada aqui lança se for chamada. A asserção morde.
- 503 sem `ANTHROPIC_API_KEY`: o caso `claude: null` confere o status e o corpo `{reason:'not_configured'}`, e que só `has_role` tocou o banco. Morde.
- 429 no teto: são 30 respostas 200, a 31ª dá 429 sem chamar o modelo, e outra conta continua passando. Morde.
- Modo `address` sem contato: as chaves da resposta são exatamente `['address','found']`, e o corpo não contém nome nem telefone, mesmo com o modelo devolvendo os dois. Morde.
- Texto acima de 2.000 caracteres: 2.001 dá 413 sem chamar o modelo, e exatamente 2.000 passa (o limite foi testado). Morde.
- Prazo e 5xx viram "fora do ar": o 529 vira 502, e o prazo foi testado com relógio falso (o signal não está abortado em `PARSE_BUDGET_MS-1` e está abortado em `PARSE_BUDGET_MS`). Morde.
- Saída truncada, recusada ou inválida vira desfecho próprio: cada uma dá 422 `{reason}` exato com uma única chamada, e JSON que não é objeto dá 422 invalid. Morde.
- O log tem só o tamanho e o desfecho: as linhas trazem `result`/`chars`/`mode`/`found`, e o log inteiro não contém nenhum pedaço do texto. O mesmo vale no caso do 413. Morde.
- Em `core`, `parse`: os testes literais conferem `maskPhone`/`maskCep`, CPF com dígito errado e com dígitos repetidos virando vazio, e-mail inválido virando vazio, UF inexistente e o DDI 55 retirado. `mergeCep` cobre o CEP conhecido mandando, `null` e `manual` mantendo o que o texto trouxe, a resposta parcial e a não mutação da entrada. Morde.
- Guardas: `claudeSoNaPorta` tem `INDEXES` com `customer-parse/index.ts`, e as réguas 2 e 3 cobrem o arquivo. `denoReach` (customers) tem âncora para `parse.ts`/`mergeCep.ts`, um sensor novo e a contagem de 18. `wiringResolve` se deriva sozinho. Mordem.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `pnpm install --frozen-lockfile` no worktree | sim | nenhum arquivo versionado alterado aparece fora de `alterados` | sim |
| 2 | 200 `{contact?, address, found}`; texto sem dados dá 200 com `found: 0` | sim | o critério "Texto sem dados: a folha fica aberta" é da tela (06); o contrato só pede "campos lidos" | sim. A 06:48 foi propagada com esta forma |
| 3 | Desfechos copiados da `seo-suggest`, com 413 `too_long` | sim | o contrato pede "4xx texto acima de 2.000"; `seo-suggest/handlers.ts` usa 502/422/503/429/400 | sim. A 06:48 lista todos |
| 4 | O teto conta antes de o corpo ser lido | sim | é a mesma ordem de `seo-suggest/handlers.ts` (`limiter.hit` antes de `req.text()`) e de D-11 | sim |
| 5 | `claude-haiku-5-5`, esforço `low`, 2048 tokens, um schema por modo | sim | D-10 pede "`claude-haiku-5-5` e esforço explícito"; o esforço é explícito em `prompt.ts` | sim |
| 6 | Normalização em `parse.ts` (máscaras, CPF só com dígito válido, UF entre as 27, teto por campo) | sim | o contrato diz "o que não passa vira vazio" | sim. A 06 consome pelo barril |
| 7 | `mergeCep` → `{address, fromCep}`, com campo vazio do serviço mantendo o do texto; tipo `CepServiceAnswer` estrutural | sim | a forma é idêntica a `CepLookupResult` (`core/hooks/useCepLookup.ts:16-23`); importar o tipo de `hooks` arrastaria o React Query para o grafo do Deno | sim. A 06:49 foi propagada |
| 8 | `parse.ts`/`mergeCep.ts` no barril, e o `denoReach` sobe para 18 | sim | a tarefa pede o `denoReach` cobrindo os novos; o guarda caminha a partir do barril; a `purity.test.ts` de customers usa piso `>= 8`, sem número cravado | sim |

## Não conferido

- `.specs/work-items/94-montar-pedido-no-app/tasks/06-folha-colar-texto.md` está como `??` (o diretório `tasks/` inteiro está sem intent-to-add), então não há baseline. Li o arquivo como está, e as linhas 13, 48, 49, 56 e 93 batem com o contrato entregue. Mas "a 03 só corrigiu as afirmações que a sua mudança tornou falsas" fica sem prova por diff e depende da palavra do implementador.
- Os testes passando, os tipos e o grafo do Deno de verdade: só a execução prova (eu não rodo testes).
- O cabeçalho de `apps/store/src/shared/lib/__tests__/claudeSoNoServidor.test.ts:11` ainda diz que a porta é UMA (`seo-suggest`). A afirmação ficou desatualizada, mas o arquivo não está em `alterados`, a régua só varre `apps/**` e não quebra com a function nova. Fica registrado, sem virar achado.
- O registro de `customer-parse`/`parse`/`mergeCep` em `supabase/CLAUDE.md`/`packages/core/CLAUDE.md` é da 06, pela própria tarefa. Não cobrei.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (raiz, já carregado no contexto): › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `packages/core/CLAUDE.md` › Pureza, › customers (e o índice de títulos); `supabase/CLAUDE.md` › Edge functions (trecho sobre fiação, o bundler e a tabela de `verify_jwt`).

## T01 — wi-impl-task · review · agente a2eeeb68f791ae676

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/01-regras-da-montagem-no-core.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Módulo novo `packages/core/src/product-search/` (`text.ts` com `dobrarTexto`/`palavrasDoTermo`, `search.ts` com `buscarProdutos`/`RESULTADOS_VISIVEIS`/tipos, `index.ts`), subpath `@estrelinha/core/product-search` em `package.json`. Os nomes em português ficam iguais aos do painel | Nomes em inglês; pôr a busca dentro de `core/product` | O reexport por referência exige o mesmo símbolo. `core/product` importa `@estrelinha/supabase/types`, e assim a busca deixaria de ser alcançável fora do Vite | 07 (o app importa `@estrelinha/core/product-search`) e o guarda `buscaDeProdutoComDonoUnico` |
| 2 | A regra da foto fica em `core/proposals/photo.ts`, folha sem import: `fotoDaLinha(variacao, peca)` = `image_url` da variação aparado → `capaDaLinha(peca)`. `capaDaLinha` é `capa` (o apelido de `images->0->>url`) → `image_url` → `null`, e mora no mesmo arquivo | Uma assinatura que recebesse o array `images` inteiro; `capaDaLinha` em outro arquivo | A leitura do painel e a `precificar` da 02 já pedem `capa:images->0->>url`, e esta assinatura encaixa nas duas. Uma folha só deixa o caminho Deno com um arquivo | 02 (`precificar` passa `{ image_url }` da variação e a linha da peça com `capa`), 07 |
| 3 | O mapeamento puro sobe como `mapearPecaParaProposta(produto, linhas)` em `core/proposals/piece.ts`, junto com `textoDoEstoque` e os tipos `PecaParaProposta`/`VariacaoDaPeca`/`MedidasDaPeca`/`LinhaDaPeca`. Importa `../pricing/index.ts`, `../pricing/types.ts` e `../material/material.ts` (folhas Deno), e é exportado pelo barril de `proposals` | Mesmo nome do tipo (`pecaParaProposta`); `piece.ts` fora do barril | Nome de valor distinto do tipo evita confusão. Com o barril, o app importa de `@estrelinha/core/proposals`. O custo é que `checkout` e `order-proposals`, que importam `proposals/index.ts`, passam a carregar `pricing` e `material`. Os dois são alcançáveis pelo Deno, e o boot foi medido depois | 07; grafo Deno de `checkout`/`order-proposals` |
| 4 | `LINK_WITHOUT_STORE` entra em `core/proposals/link.ts`, sem arquivo novo | Um `copy.ts` novo em `proposals` | A frase é sobre o link, e um arquivo novo aumentaria a âncora do purity sem ganho | 04 |
| 5 | A âncora de `proposals/__tests__/purity.test.ts` passa de 7 para 9 arquivos e agora exige os vizinhos `pricing/*` e `material/material.ts` | Afrouxar para `arrayContaining` | Âncora cravada é a régua do guarda; ela foi ampliada, não afrouxada | nenhum |
| 6 | Os casos da busca e da dobra sobem para `core/product-search/__tests__/{search,text}.test.ts`, sem perder asserção. No painel ficam só a pureza de `entities/product/lib` (`buscarProdutos.test.ts`) e o bloco dos antigos declarantes (`texto.test.ts`). Os casos de `capaDaLinha` saem de `useProductCovers.test.ts` para `core/proposals/__tests__/photo.test.ts`. `useProductVariants.test.ts` e o caso de `textoDoEstoque` em `VariantPicker.test.tsx` ficam como estavam: provam a leitura e a tela pelo reexport | Duplicar os casos nos dois lugares | Pela tarefa, os testes sobem com a regra; duplicar seria um segundo dono do teste | nenhum |
| 7 | O `ESCOPO` de `buscaDeProdutoComDonoUnico` ganha `packages/core/src/product-search`, e `DONO_DA_DOBRA` passa a `packages/core/src/product-search/text.ts`. Entraram uma âncora (o dono está na varredura) e um sensor (a declaração de volta no endereço antigo do painel é acusada) | Varrer `packages/core` inteiro | `material.ts` tem `normalize('NFD')` de outra função. Varrer o pacote todo ampliaria a régua além da tarefa, e ampliar ao app é da 07 | 07 (amplia ao app) |
| 8 | Boot local feito com `supabase functions serve --env-file` (chaves externas inválidas), limitado a um único comando e encerrado nele. O edge runtime estava parado e ficou parado de novo | Não subir nada (regra 8 do procedimento) | A Obrigação da tarefa manda subir, conferir e encerrar. O processo terminou dentro do próprio comando e o container voltou ao estado em que estava | nenhum |
| 9 | Atualizei também `apps/backoffice/CLAUDE.md` (o bullet "A dobra mora em `shared/lib/texto.ts`" ficou falso) e acrescentei a linha `./product-search` na tabela de módulos de `packages/core/CLAUDE.md` | Corrigir só as duas linhas citadas | Pela raiz, o CLAUDE.md do módulo mexido se atualiza. Deixar a afirmação falsa seria documentação divergente | 07 lê essas seções |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | A busca e a dobra movidas passam com os casos de antes | Unidade (core) | `packages/core/src/product-search/__tests__/search.test.ts`, `text.test.ts` | sim (44) | vermelho (sem `normalize`: 7 caíram; `every`→`some`: 11 caíram; sem posto: 6 caíram) |
| 2 | A foto da linha nos três recuos e o nulo; `capaDaLinha` | Unidade (core) | `packages/core/src/proposals/__tests__/photo.test.ts` | sim (9) | vermelho (4 mutantes, todos mortos) |
| 3 | O mapeamento da peça e `textoDoEstoque` em core | Unidade (core) | `packages/core/src/proposals/__tests__/piece.test.ts` | sim (12) | vermelho (6 mutantes: filtro de ativas, foto, política, material, estoque livre, peso — todos mortos) |
| 4 | O painel reexporta cada símbolo por referência (`toBe`); uma cópia reprova | Guarda | `apps/backoffice/src/app/__tests__/regrasDaMontagemNoCore.test.ts` | sim (18) | vermelho (cópia da frase em `copy.ts` e `dobrarTexto` embrulhada em `texto.ts`: os dois caíram por asserção; cópia de `capaDaLinha`: 3 caíram) |
| 5 | `denoReach` de `core/pricing` (grafo de 3 arquivos, `import type` incluso) e a folha da foto | Guarda | `packages/core/src/pricing/__tests__/denoReach.test.ts`; `proposals/__tests__/purity.test.ts` (âncora 9); bloco "photo.ts é folha" em `photo.test.ts` | sim | vermelho (um `import type` de pacote injetado no `grid.ts` real: 3 caíram) |
| 6 | `buscaDeProdutoComDonoUnico` aponta o dono em core, sem perder sensor | Guarda | `apps/backoffice/src/shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts` | sim (22) | — (vermelho antes do conserto: a âncora L-035 caiu ao mover a dobra; depois, uma dobra devolvida ao `texto.ts` real foi acusada) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

packages/core/src/product-search/index.ts criado
packages/core/src/product-search/text.ts criado
packages/core/src/product-search/search.ts criado
packages/core/src/product-search/__tests__/text.test.ts criado
packages/core/src/product-search/__tests__/search.test.ts criado
packages/core/src/proposals/photo.ts criado
packages/core/src/proposals/piece.ts criado
packages/core/src/proposals/__tests__/photo.test.ts criado
packages/core/src/proposals/__tests__/piece.test.ts criado
packages/core/src/pricing/__tests__/denoReach.test.ts criado
apps/backoffice/src/app/__tests__/regrasDaMontagemNoCore.test.ts criado
packages/core/src/proposals/index.ts alterado
packages/core/src/proposals/link.ts alterado
packages/core/src/proposals/__tests__/purity.test.ts alterado
packages/core/package.json alterado
packages/core/CLAUDE.md alterado
supabase/CLAUDE.md alterado
apps/backoffice/CLAUDE.md alterado
apps/backoffice/src/shared/lib/texto.ts alterado
apps/backoffice/src/shared/lib/__tests__/texto.test.ts alterado
apps/backoffice/src/shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts alterado
apps/backoffice/src/entities/product/lib/buscarProdutos.ts alterado
apps/backoffice/src/entities/product/lib/__tests__/buscarProdutos.test.ts alterado
apps/backoffice/src/entities/product/lib/estoque.ts alterado
apps/backoffice/src/entities/product/api/useProductCovers.ts alterado
apps/backoffice/src/entities/product/api/__tests__/useProductCovers.test.ts alterado
apps/backoffice/src/entities/product/api/useProductVariants.ts alterado
apps/backoffice/src/features/order-proposal/model/copy.ts alterado

## Verificação

- Tipos `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (instruções › Comandos): 7 erros, todos em `ProposalStateBadge.test.tsx`. São os mesmos 7 da baseline medida antes da primeira fatia; nenhum é novo.
- Tipos `npx tsc --noEmit -p packages/core/tsconfig.json` (instruções): 11 erros (carousel 5, pickHomeBanners 1, pickHomeCollections 1, sitemap/urls 2, supabase/client 2). São os mesmos 11 da baseline; nenhum é novo.
- Tipos `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json`: 0 erros.
- Um arquivo de teste: `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md › Comandos de verificação), usado em cada fatia e nos mutantes, todos verdes ao final.
- Verificação mínima (instruções › Baselines; suíte do workspace tocado e a da loja; exit fora de pipe):
  - core: 5499/229, exit 0.
  - backoffice: 5175/288, exit 0.
  - store: 7058/377, exit 0.
  - functions: 1513/41, exit 0.
- `npx eslint` nos 11 arquivos do painel tocados: exit 0, sem achado.
- `deno check --no-lock` em `order-proposals`, `mercado-pago` e `checkout`: zero erro de resolução de módulo. Sobram 7 erros de tipo estrito, anteriores a esta tarefa e fora dos arquivos dela (`buy-together/cartDiscount.ts:200`, `payment/pricing.ts:490`).
- Boot local: `supabase status` mostrou o banco de pé e o edge runtime parado. Rodei `supabase functions serve --env-file <arquivo com chaves inválidas>` e encerrei no mesmo comando. Resultados: `order-proposals?action=list` sem header deu 401 `Não autenticado`; `mercado-pago?action=create-payment` deu 400 pelo handler; `checkout?action=get-order` deu 403 pelo handler. Nenhum `BOOT_ERROR` no log, e o edge runtime terminou parado de novo.

Instruções lidas:
- `CLAUDE.md` (raiz, no contexto) › Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy
- `apps/backoffice/CLAUDE.md` › A busca de produto: um dono para as cinco telas › Montar pedido para a cliente
- `packages/core/CLAUDE.md` › Quando um código pertence › Pureza › Os módulos › Dinheiro › customers › proposals › Convenções de tipo
- `supabase/CLAUDE.md` › Migrations › RLS › Edge functions › order-proposals › Secrets
- `.specs/project/PROJECT.md` › Comandos de verificação › Ambiente local

## Divergências e descobertas

- O que `packages/core/CLAUDE.md:501-503` e `supabase/CLAUDE.md:506-509` diziam já era falso antes desta tarefa: `pricing` não importa pacote nenhum (`types.ts` local), e as três functions sobem no local. Corrigi pelo que medi.
- O `shared/lib/texto.ts` do painel dizia em comentário que a classe de acento estava "em escape", mas os combinantes estavam literais no fonte. A cópia em `core` usa o escape `̀-ͯ`: a mesma classe, com o mesmo comportamento.
- Todas as citações conferiram, nenhuma morta e nenhuma deslocada.
- `regrasDaMontagemNoCore` prova `LINK_WITHOUT_STORE` pela fonte, além do `toBe`: string é primitivo, então uma cópia colada também seria `toBe` à original.
- Os arquivos de `customers/`, `customer-parse/`, `claudeSoNaPorta.test.ts` e `config.toml` que aparecem na árvore são da 03 e não foram tocados.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 01
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/backoffice/CLAUDE.md › A busca de produto, › Montar pedido para a cliente; packages/core/CLAUDE.md › Quando um código pertence, › Pureza, › Os módulos, › Dinheiro, › customers, › proposals, › Convenções de tipo; supabase/CLAUDE.md › Migrations, › RLS, › Edge functions, › order-proposals, › Secrets; .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local
Testes escritos: busca movida — packages/core/src/product-search/__tests__/search.test.ts e text.test.ts; foto da linha nos três recuos — packages/core/src/proposals/__tests__/photo.test.ts; mapeamento da peça e texto do estoque — packages/core/src/proposals/__tests__/piece.test.ts; reexport por referência — apps/backoffice/src/app/__tests__/regrasDaMontagemNoCore.test.ts; denoReach de pricing — packages/core/src/pricing/__tests__/denoReach.test.ts, e folha da foto em photo.test.ts e na âncora de proposals/__tests__/purity.test.ts; dono da dobra em core — buscaDeProdutoComDonoUnico.test.ts (escopo, dono, âncora e sensor novos). Nada ficou sem cobertura.
Verificações: tsc backoffice 7 e core 11, idênticos à baseline; mobile-adm 0. Suítes core 5499/229, backoffice 5175/288, store 7058/377 e functions 1513/41, todas com exit 0. eslint dos arquivos do painel limpo. deno check sem erro de resolução. Boot local das três functions sem BOOT_ERROR (order-proposals 401 sem header).
Árvore de trabalho: 11 arquivos criados e 17 alterados (lista em Arquivos alterados); nada commitado.
Citações conferidas: 12 abertas ao usar; nenhuma deslocou, nenhuma morta. Duas afirmações dos CLAUDE.md citados já eram falsas e foram corrigidas.
```

## T01 — wi-impl-review · done · agente a2c5e509dce259694

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/01-regras-da-montagem-no-core.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o painel monta propostas como antes, com a busca, a capa e a peça vindas de `core` (suíte do backoffice verde) | `buscarProdutos.ts`, `texto.ts`, `estoque.ts`, `useProductCovers.ts` e `copy.ts` reexportam de `core`. `useProductVariants.ts` delega a `mapearPecaParaProposta`. O corpo de `piece.ts` é o mesmo do mapeamento que saiu do painel (o recuo da foto agora passa por `fotoDaLinha`, com o mesmo resultado) | sim no código; a suíte verde é só execução |
| a regra da foto da linha existe em `core` com os três recuos | `packages/core/src/proposals/photo.ts` (`fotoDaLinha`: variação → `capaDaLinha`, que é `capa` = `images->0->>url` → `image_url` → `null`) | sim |
| o boot local das três functions conferido e os dois CLAUDE.md corrigidos | `supabase/CLAUDE.md` (bloco antigo do `Failed resolving types` substituído) e `packages/core/CLAUDE.md` (o aviso do `import type` de pacote substituído pelo grafo medido) | os textos sim; o boot em si é só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- `.ts` explícito, `import type` incluso, e forma proibida descrita em comentário em vez de escrita: aplicada. `product-search/index.ts`, `search.ts`, `proposals/piece.ts` e `index.ts` usam `.ts` em todo relativo. `photo.ts` e `text.ts` são folhas sem import. Os comentários não escrevem nenhum especificador sem extensão.
- Só o mapeamento sobe e a leitura fica no painel: aplicada. `lerPecaParaProposta` continua em `useProductVariants.ts` com o client e só chama `mapearPecaParaProposta`. O import de `@estrelinha/supabase/types` saiu do arquivo.
- Boot local das três functions, encerrando o que subiu: o que foi medido está declarado na premissa 8 e no texto dos dois CLAUDE.md. A medição só a execução prova.
- Correção de `supabase/CLAUDE.md` e `packages/core/CLAUDE.md`: aplicada, nas seções citadas pela tarefa (as linhas deslocaram pouco).
- Gate com as suítes da loja e do painel: só execução.

## Testes

- Busca movida com os casos de antes: `packages/core/src/product-search/__tests__/search.test.ts` e `text.test.ts`. Contei as asserções: 71 → 64 + 7 (as 7 que ficaram são a pureza em `buscarProdutos.test.ts`) e 42 → 35 + 7 (as 7 que ficaram estão em `texto.test.ts`). Os casos foram transportados e mordem como antes.
- Foto da linha nos três recuos: `packages/core/src/proposals/__tests__/photo.test.ts`. Cobre variação com foto, variação sem foto (nula, vazia, só espaço) caindo na galeria, sem galeria caindo na coluna antiga, e nada dando `null`. A pureza da folha também está ali. Morde.
- Reexport por `toBe`: `apps/backoffice/src/app/__tests__/regrasDaMontagemNoCore.test.ts`. São 11 pares literais e 1 âncora. A frase é string, então `toBe` não pega uma cópia dela; para ela a prova é pela fonte (o painel não declara a frase), com sensor. O sensor "cópia de função reprova" é fraco, mas é a mesma régua `toBe`. Morde.
- `denoReach` de `core/pricing` e dos arquivos novos: `packages/core/src/pricing/__tests__/denoReach.test.ts` tem âncora cravada de 3 arquivos e sensores de pacote, de `import type` sem extensão e o inverso de comentário. A âncora de `proposals/__tests__/purity.test.ts` passou a 9 arquivos com os vizinhos `pricing/*` e `material/material.ts`. `photo.test.ts` prova que a folha não tem import. Morde.
- `buscaDeProdutoComDonoUnico`: `DONO_DA_DOBRA` aponta `packages/core/src/product-search/text.ts`, e o escopo inclui o módulo. Ganhou uma âncora (o dono está na varredura) e um sensor (a declaração de volta em `shared/lib/texto.ts` é acusada). Nenhum sensor anterior foi removido. Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Módulo `core/product-search` com nomes em português e subpath no `package.json` | sim | `@estrelinha/core/*` resolve por alias nos três apps e no `tsconfig.base.json`. `core/product` importa pacote | sim |
| 2 | `fotoDaLinha(variacao, peca)` com `capa` = `images->0->>url`, na folha `photo.ts` | sim | a tarefa 02 (contrato da `precificar`) já manda pedir `capa:images->0->>url`. D-05 pede o mesmo recuo | sim (02, 07) |
| 3 | `piece.ts` no barril de `proposals`, importando folhas de `pricing` e `material` | sim | `material.ts` não tem import. O grafo de `pricing` é coberto pelo `denoReach` novo e o de `proposals` pelo `purity` ampliado | sim (07; o grafo Deno de `checkout`/`order-proposals` está declarado) |
| 4 | `LINK_WITHOUT_STORE` em `link.ts` | sim | o contrato diz "em `packages/core/src/proposals/`" | sim (04) |
| 5 | âncora do `purity` de 7 → 9 arquivos, mais vizinhos | sim | a âncora continua cravada (`toEqual` da lista) | sim |
| 6 | os testes sobem com a regra, sem duplicar | sim | a contagem de asserções fecha | sim |
| 7 | o escopo do guarda ganha só `core/product-search` | sim | o Não faça proíbe ampliar ao app (é da 07) | sim (07) |
| 8 | boot local com `functions serve --env-file` e chaves externas inválidas | sim | `supabase/CLAUDE.md` manda conter os secrets com valor inválido. Não usou `stop --all` | sim |
| 9 | atualizou `apps/backoffice/CLAUDE.md` e a tabela de módulos de `packages/core/CLAUDE.md` | sim | a raiz manda atualizar o CLAUDE.md do módulo mexido. O bullet antigo ficaria falso | sim |

## Não conferido

- O que só a execução prova: as suítes (core, backoffice, loja) verdes, `tsc` de `piece.ts` (a chamada `requiresMaterial(produto)` com `LinhaDaPeca`) e o boot local das três functions. Sobre o boot, há uma nuance no texto dos CLAUDE.md: a Obrigação pedia 401 sem header nas três, e o texto registra 401 só na `order-proposals`, com `mercado-pago` e `checkout` "respondendo pelo handler". Fica como medida declarada pelo implementador.
- Todos os arquivos de `alterados` aparecem no diff (adicionados com intent-to-add ou modificados). Não houve arquivo sem baseline.
- Uma observação que não vira achado, por ser comentário herdado (regra 4): `packages/core/src/product-search/text.ts:14` diz que a classe `ACENTOS` está "em escape", mas os combinantes estão escritos literalmente no regex, conferido por `od -c`. O original do painel tinha o mesmo descompasso.
- Instruções lidas: `CLAUDE.md` (raiz, já no contexto, por inteiro). Os trechos de `packages/core/CLAUDE.md`, `supabase/CLAUDE.md` e `apps/backoffice/CLAUDE.md` alcançados pelo diff: `packages/core/CLAUDE.md` › Os módulos (tabela) e › proposals; `supabase/CLAUDE.md` › order-proposals e o pedido que nasce de uma proposta; `apps/backoffice/CLAUDE.md` › A busca de produto: um dono para as cinco telas. As demais seções citadas pela tarefa nesses três arquivos não foram lidas por inteiro.

## T02 — wi-impl-task · review · agente a2b2fa371d77f31fb

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/02-link-sempre-e-endereco-no-painel.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O `get` responde `token` no nível de cima (ao lado de `state`/`actions`). `actions` vem de `proposalActions(state, { linkAvailable })`, e `linkAvailable` é verdadeiro só quando a cifra existe e a chave configurada consegue decifrá-la | Pôr o token dentro de `proposal`; decidir pela simples presença da cifra | Com cifra gravada e chave ausente ou trocada, decidir pela presença faria o `renew` recusar (a proposta "tem cifra") enquanto a tela oferece "Gerar link novo". A mesma pergunta (`tokenDisponivel`) decide o `get` e o `renew` | O contrato do `get` que a tarefa 04 consome; o `renew` |
| 2 | `proposalActions(state, input = {})`. Sem a entrada, a aberta conta como "sem link" e pode renovar. Ganha o campo `renewLabel` ('Renovar prazo' \| 'Gerar link novo' \| null) e as constantes `RENEW_EXPIRED_LABEL` e `RENEW_WITHOUT_LINK_LABEL` | Parâmetro obrigatório; rótulo calculado em cada tela | É o padrão mais seguro e muda o mínimo para quem já chama (Builder, cancel). O rótulo fica com um dono só, para o app e o painel | Tarefas 04 e 09; quem compara `actions` com `toEqual` |
| 3 | Cifra AES-GCM em `supabase/functions/_shared/tokenCipher.ts`, no formato `v1.`+base64url(iv‖cifra). Chave no secret `PROPOSAL_TOKEN_KEY` (32 bytes em base64). Chave ausente ou inválida ⇒ `null`, e a function grava só o hash | Uma chave derivada de outro secret; cifra sem prefixo de versão | O prefixo permite trocar o formato depois. A chave opcional cumpre D-28 | O hospedado: sem esse secret, tudo funciona como antes |
| 4 | O `renew` grava `token_cipher` no mesmo `update` do hash. Sem chave, grava `token_cipher: null` | Deixar a cifra antiga quando não há chave | A cifra antiga seria de um token que acabou de morrer | Nenhum fora da function |
| 5 | O `get` tira da linha `token_cipher`, `token_hash` e `idempotency_key` antes de responder (`semCifra`) | Retirar só a cifra | Mesmo que uma leitura futura traga essas colunas, a credencial não sai | Nenhum |
| 6 | Endereço na RPC: grava só com `p->'save_address' = 'true'::jsonb` e com CEP e rua preenchidos. Vira padrão só quando a ficha ainda não tem padrão. Não duplica: compara CEP, rua, número e complemento. Fica depois de a ficha ser resolvida e antes do retorno de "sem mudança" | Sempre `is_default=false` (como o painel fazia); sempre inserir | Respeita `addresses_one_default`, permite editar a proposta várias vezes com a caixa marcada sem duplicar, e o primeiro endereço passa a servir no checkout | O cadastro da cliente; a tarefa 09 (o app manda `save_address`) |
| 7 | "Salvar no cadastro" vem marcada ao montar (`emptyAddress`, botão "Outro endereço"). Vem desmarcada ao editar (`draftFromProposal`). O payload só manda `true` com cliente escolhida e endereço digitado (sem `savedId`) | Manter o padrão desmarcado de antes | É o que o Design pede. Ao editar, regravar sem a Adri pedir seria surpresa | A montagem do painel |
| 8 | O link recém-criado vai do Builder para a página da proposta pelo estado da navegação. Com a chave configurada o `get` o devolve de novo; sem ela, esse é o único caminho até a tela | Manter o `sessionStorage` (o `linkMemory.ts`) | A obrigação manda remover `linkMemory`, e o D-28 manda manter o comportamento de hoje quando não há chave | Só a navegação Builder → página |
| 9 | As confirmações continuam em `window.confirm`. A expirada confirma com `proposalRenewText`; o recuo "Gerar link novo" confirma com `RENEW_WARNING` | Criar folha ou diálogo novo | A página já confirma assim (Cancelar também); mudar o tipo de confirmação seria ampliar o escopo | Só a página da proposta |
| 10 | Três textos ficam em `core/proposals/link.ts`, porque o app e o painel leem os mesmos: `proposalRenewText` (prazo novo = agora + `PROPOSAL_LINK_DAYS`, primeiro nome, "a cliente" quando não há nome), `PROPOSAL_ORIGIN_LABEL` ('Pedido montado') e `PROPOSAL_SAVE_FAILED`. O painel os reexporta com os nomes de antes (`ORDER_ORIGIN_PREFIX`, `SAVE_FAILED`) | Escrever cada texto no painel | Evita o "defeito 01" (o mesmo dado com dois donos), e o D-25 pede uma origem só | Tarefas 04 e 09, propagado |
| 11 | O Builder mostra `SAVE_FAILED` quando o erro não traz `code` ou traz `save_failed`; nos outros códigos (prices_changed, version_conflict…) mostra a frase do servidor | Trocar toda falha por `SAVE_FAILED` | A frase do PRC-02 e as recusas específicas continuam sendo ditas | Só a montagem |
| 12 | Cancelada e concluída passam a mostrar o cartão com "Link encerrado." e nenhuma ação. Antes, essas propostas não mostravam cartão nenhum | Manter sem cartão | É o que o Design pede | Página da proposta |
| 13 | Migration aplicada no banco local com `psql -1 -f` e registrada em `supabase_migrations.schema_migrations` | `supabase migration up --local` | O banco local tem `20261107130000..160000` aplicadas (de outro ramo) e não tem as `20261110*` deste ramo. O `migration up` exigiria `--include-all` e aplicaria migrations que não são desta tarefa. A raiz do CLAUDE.md permite `psql` na porta 54442 | O estado do banco local |
| 14 | O link do botão da concluída passa a dizer "Ver o pedido #NNNN" | Manter "Ver pedido" | É o texto dos critérios | Página da proposta |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `proposalActions` renova só a expirada ou a aberta sem link (sensor: com link não renova) | unidade (core) | packages/core/src/proposals/__tests__/state.test.ts | sim | vermelho (3 falhas com `semLink = aberta`) |
| 2 | `proposalRenewText`, `PROPOSAL_ORIGIN_LABEL`, `PROPOSAL_SAVE_FAILED` | unidade (core) | packages/core/src/proposals/__tests__/link.test.ts | sim | — |
| 3 | `get` devolve o token só da aberta com cifra; não devolve cifra nem hash; o log não carrega nenhum dos dois | unidade (functions) | supabase/functions/order-proposals/__tests__/handlers.test.ts | sim | vermelho (sem o recorte de estado: 3 falhas) |
| 4 | `save` passa `save_address`; com chave grava a cifra junto, sem chave só o hash | unidade (functions) | idem | sim | vermelho (save_address forçado; cifra apagada) |
| 5 | `renew`: recusa a aberta com cifra; aceita a aberta sem cifra e ela sai cifrada; renova a expirada com hash e cifra no mesmo `update`; sem chave a cifra fica nula | unidade (functions) | idem | sim | vermelho (sem `linkAvailable`; cifra fora do update) |
| 6 | A foto gravada segue variação → `images[0]` → `image_url` | unidade (functions) | idem | sim | vermelho (expressão antiga) |
| 7 | Página: o link vem do `get` sem "Gerar link novo"; sem token, "Gerar link novo" chama `renew` e mostra o link novo; Renovar só na expirada, com a frase nova; campo só leitura que seleciona tudo; mensagem do WhatsApp escrita; nada no storage | página real | apps/backoffice/src/pages/admin/AdminProposalPage.test.tsx | sim | vermelho (token ignorado: 8 falhas; frase trocada: 1; rótulo fixo: 6) |
| 8 | A montagem manda `save_address` (marcada por padrão; desmarcada vai false) e não escreve em `addresses`; a falha diz `SAVE_FAILED` | página real + unidade | AdminProposalBuilderPage.test.tsx, model/__tests__/draft.test.ts, ui/__tests__/CustomerAddress.test.tsx | sim | vermelho (save_address forçado false: 2; mensagem antiga: 1) |
| 9 | A origem "Pedido montado" | página real | apps/backoffice/src/pages/admin/AdminOrderPage.origem.test.tsx | sim | — (passou pelo vermelho ao trocar o rótulo) |
| 10 | A RPC grava proposta e endereço na mesma transação (falha ⇒ nada); respeita `addresses_one_default`; não sobe a versão pela cifra nem pela observação; não cria segunda ficha; achável pelo hash | integração local (probe) | .specs/work-items/94-montar-pedido-no-app/probes/01-link-e-endereco.sql | sim (19 `ok —`) | não se aplica |
| 11 | Guardas: `pedidoMontadoSchema` (hash + cifra, nunca token em claro; vigente nova), `observacaoDaPropostaSchema` (vigente do save = 94), guarda novo `linkSempreSchema` (a 95 + as trocas do 94, byte a byte) | guarda de fonte | apps/store/src/shared/lib/__tests__/{pedidoMontadoSchema,observacaoDaPropostaSchema,linkSempreSchema}.test.ts | sim | — (cada régua tem sensor por mutação dentro do arquivo) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

supabase/migrations/20261111120000_94-link-sempre-e-endereco.sql criado
supabase/functions/_shared/tokenCipher.ts criado
supabase/functions/order-proposals/handlers.ts alterado
supabase/functions/order-proposals/index.ts alterado
supabase/functions/order-proposals/__tests__/handlers.test.ts alterado
supabase/config.toml alterado
supabase/CLAUDE.md alterado
.env.example alterado
packages/core/src/proposals/state.ts alterado
packages/core/src/proposals/link.ts alterado
packages/core/src/proposals/__tests__/state.test.ts alterado
packages/core/src/proposals/__tests__/link.test.ts alterado
packages/core/CLAUDE.md alterado
apps/backoffice/src/features/order-proposal/model/linkMemory.ts removido
apps/backoffice/src/features/order-proposal/model/proposalLink.ts criado
apps/backoffice/src/features/order-proposal/index.ts alterado
apps/backoffice/src/features/order-proposal/model/copy.ts alterado
apps/backoffice/src/features/order-proposal/model/draft.ts alterado
apps/backoffice/src/features/order-proposal/api/proposalsApi.ts alterado
apps/backoffice/src/features/order-proposal/ui/ProposalLinkCard.tsx alterado
apps/backoffice/src/features/order-proposal/ui/AddressSection.tsx alterado
apps/backoffice/src/features/order-proposal/ui/ProposalOrigin.tsx alterado
apps/backoffice/src/pages/admin/AdminProposalPage.tsx alterado
apps/backoffice/src/pages/admin/AdminProposalBuilderPage.tsx alterado
apps/backoffice/src/entities/customer/api/useCustomerSearch.ts alterado
apps/backoffice/src/entities/customer/api/__tests__/useCustomerSearch.test.ts alterado
apps/backoffice/src/features/order-proposal/api/__tests__/proposalsApi.test.ts alterado
apps/backoffice/src/features/order-proposal/model/__tests__/draft.test.ts alterado
apps/backoffice/src/features/order-proposal/ui/__tests__/CustomerAddress.test.tsx alterado
apps/backoffice/src/pages/admin/AdminProposalPage.test.tsx alterado
apps/backoffice/src/pages/admin/AdminProposalBuilderPage.test.tsx alterado
apps/backoffice/src/pages/admin/AdminOrderPage.origem.test.tsx alterado
apps/backoffice/CLAUDE.md alterado
apps/store/src/shared/lib/__tests__/linkSempreSchema.test.ts criado
apps/store/src/shared/lib/__tests__/pedidoMontadoSchema.test.ts alterado
apps/store/src/shared/lib/__tests__/observacaoDaPropostaSchema.test.ts alterado
.specs/work-items/94-montar-pedido-no-app/probes/01-link-e-endereco.sql criado
.specs/work-items/94-montar-pedido-no-app/tasks/04-montados-e-pedido-montado-no-app.md alterado
.specs/work-items/94-montar-pedido-no-app/tasks/09-revisar-e-criar-link.md alterado

## Verificação

- Um arquivo de teste: `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (fonte: PROJECT.md › Comandos de verificação). Todas as fatias verdes.
- Tipos: `npx tsc --noEmit -p <projeto>` (fonte: CLAUDE.md › Comandos).
  - store: 0. backoffice: 7. mobile-adm: 0. `apps/store/tsconfig.server.json`: 0. core: 11.
  - Comparação: não recebi baseline, então comparei com a baseline do CLAUDE.md (0 nos apps, core 11).
  - Os 7 do backoffice são TS2593/TS2304 em `features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx`, um arquivo que já estava commitado (4c6e9a16) e que não toquei; nenhum erro em arquivo meu. O erro que eu tinha introduzido (TS2741 em `proposalsApi.test.ts`) foi corrigido.
  - Os 11 do core são os herdados, idênticos.
- Verificação mínima (fonte: CLAUDE.md › Baselines): cada workspace rodado sozinho, com exit lido fora de pipe, todos exit 0.
  - core 5509/229
  - functions 1541/41
  - backoffice 5182/288
  - store 7091/378
  - mobile-adm 2407/152
- Lint: `npx eslint .`, backoffice 23/5 e store 2/2 (iguais à baseline), sem achado em arquivo meu.
- Probe contra o banco local, com `psql -v ON_ERROR_STOP=1 -f` (fonte: PROJECT.md › Ambiente local; molde do probe da 89): exit 0, 19 `ok —`.
- Migration aplicada no local com `psql -1 -f` na porta 54442 e registrada em `schema_migrations` (fonte: CLAUDE.md › CI e deploy).
- PostgREST local: `products?select=id,image_url,capa:images->0->>url` responde com `capa` preenchida e `image_url` null (o caso que a regra antiga gravaria sem foto); `order_proposals?select=id,token_cipher` responde 200.

Instruções lidas:
- CLAUDE.md (raiz, no contexto)
- apps/backoffice/CLAUDE.md › A busca de produto: um dono para as cinco telas; › Montar pedido para a cliente
- packages/core/CLAUDE.md › Quando um código pertence a este pacote; › Pureza; › Os módulos; › customers; › proposals; › Convenções de tipo (de › Dinheiro, só o título)
- supabase/CLAUDE.md › Migrations; › RLS — o molde que os guardas cobram; › Edge functions; › order-proposals e o pedido que nasce de uma proposta; › Secrets
- .specs/project/PROPOSAL.md › Comandos de verificação; › Ambiente local

## Divergências e descobertas

- **Baseline de tipos:** o CLAUDE.md declara tipos do backoffice em 0, mas há 7 erros herdados em `ProposalStateBadge.test.tsx` (commit 4c6e9a16, faltam os imports do vitest). Não é desta tarefa.
- **Estado do banco local diferente da pasta de migrations:** o banco local tem aplicadas `20261107130000..160000`, que não existem neste worktree, e não tem as `20261110120000..160000` deste ramo. Apliquei só a migration desta tarefa, por `psql` (decisão 13). As `20261110*` continuam pendentes no local; não são minhas.
- **Function não exercitada no edge runtime local:** o edge runtime local está parado e `functions serve` é processo de longa duração (regra 8). A function foi provada por unidade, a RPC pelo probe, e o `select` com `capa:images->0->>url` pelo PostgREST.
- **Secret novo no config.toml, ausente do `.env` local:** acrescentei `PROPOSAL_TOKEN_KEY = "env(PROPOSAL_TOKEN_KEY)"` ao `[edge_runtime.secrets]`, mas a variável não existe no `.env` do worktree (gitignored, não toquei). Não confirmei como o CLI se comporta com `env()` de variável ausente no próximo `supabase start`/`functions serve`. Se reclamar, acrescente `PROPOSAL_TOKEN_KEY=` vazio no `.env`.
- **Achado do PostgREST:** produtos importados têm `image_url` null e a foto só em `images[0]`. Com a regra antiga, a linha da proposta era gravada sem foto; D-05 corrige isso.
- **Testes removidos:** os 3 testes de `gravarEnderecoDaCliente` foram apagados junto com a função (obrigação da tarefa). A escrita do endereço agora é provada pelo probe e pela página real.
- **Citações conferidas:** `handlers.ts:314/321/403`, `state.ts:55`, `copy.ts:14/20`, `useCustomerSearch.ts:145-165`, `AdminProposalBuilderPage.tsx:110-128`, `AdminOrderPage.origem.test.tsx:97`, `pedidoMontadoSchema:153-156/293/309-312`, `observacaoDaPropostaSchema:33-38/182-191`, migration 95 `:32-246/52-55/201-223`, `59-minha-conta.sql:150-151`, `supabase-deploy.yml:165-190`, `supabase/CLAUDE.md:216`. Todas no lugar; nenhuma morta. A `state.ts:55` deslocou 4 linhas (a função está em `:51`).
- **Propagado na tarefa 04:**
  - o rótulo de origem da D-25 passa a ter nome: `PROPOSAL_ORIGIN_LABEL` (`core/proposals/link.ts`);
  - D-17 passa a apontar para `proposalRenewText` e para `actions.renewLabel` do `get`.
- **Propagado na tarefa 09:** D-20 passa a apontar para `PROPOSAL_SAVE_FAILED` (`core/proposals/link.ts`).
- Nenhuma fatia ficou verde no check de mutação.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 02
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/backoffice/CLAUDE.md › A busca de produto, › Montar pedido para a cliente; packages/core/CLAUDE.md › Quando um código pertence, › Pureza, › Os módulos, › customers, › proposals, › Convenções de tipo; supabase/CLAUDE.md › Migrations, › RLS, › Edge functions, › order-proposals, › Secrets; .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local
Testes escritos:
  - core: state.test.ts (proposalActions, com sensor de que a aberta com link não renova); link.test.ts (proposalRenewText, PROPOSAL_ORIGIN_LABEL, PROPOSAL_SAVE_FAILED)
  - functions: handlers.test.ts
      · createTokenCipher
      · get com token só da aberta com cifra, sem cifra nem hash na resposta ou no log
      · save com save_address e com/sem cifra
      · renew nos casos aberta com cifra, aberta sem cifra, expirada e sem chave
      · foto variação → images[0] → image_url
  - painel (página real): AdminProposalPage.test.tsx (link do get, "Gerar link novo" sem token, Renovar só na expirada com a frase nova, campo só leitura, mensagem escrita, nada no storage); AdminProposalBuilderPage.test.tsx (save_address marcado e desmarcado, nenhuma escrita em addresses, SAVE_FAILED); AdminOrderPage.origem.test.tsx ("Pedido montado")
  - painel (unidade): draft.test.ts; CustomerAddress.test.tsx
  - probe local: probes/01-link-e-endereco.sql (transação única, addresses_one_default, versão que não sobe, ficha única, achável pelo hash)
  - guardas: linkSempreSchema (novo), pedidoMontadoSchema e observacaoDaPropostaSchema migrados para a vigente nova
  - sem cobertura: a function rodando no edge runtime local (parado; subir é processo longo)
Verificações:
  - tsc: store 0, backoffice 7 (herdados, ProposalStateBadge.test.tsx), mobile-adm 0, server 0, core 11 (herdados)
  - suítes, todas exit 0: core 5509, functions 1541, backoffice 5182, store 7091, mobile-adm 2407
  - lint: 23/5 e 2/2
  - probe: exit 0, 19 ok
  - migration aplicada só no local
Árvore de trabalho: os arquivos listados em "Arquivos alterados"; nada commitado
Citações conferidas: 16 abertas; state.ts:55 deslocou (função em :51); nenhuma morta
Propagado: 04 (PROPOSAL_ORIGIN_LABEL na D-25; proposalRenewText e actions.renewLabel na D-17); 09 (PROPOSAL_SAVE_FAILED na D-20)
```

## T02 — wi-impl-review · fixing · agente a833917c664212054

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/02-link-sempre-e-endereco-no-painel.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | nível trocado | atrapalha | .specs/work-items/94-montar-pedido-no-app/probes/01-link-e-endereco.sql (inteiro; nenhuma linha trata de foto) · supabase/functions/order-proposals/__tests__/handlers.test.ts (bloco "a foto gravada na linha (D-05)") | A gravação de `images[0]` para a peça sem foto de variação só está provada em unidade, com o dublê `createFakeSupabase` devolvendo um campo `capa` já pronto. O probe local não toca nisso. Por isso a leitura `capa:images->0->>url` (handlers.ts:331) nunca rodou contra o PostgREST de verdade. Se a sintaxe do apelido com o caminho JSON ou a forma de `products.images` estiver errada, a suíte continua verde. | Bloco `Testes`: "Integração local (probe): … peça sem foto por variação grava `images[0]`." |
| 2 | identificador de processo | atrapalha | supabase/functions/order-proposals/handlers.ts:32, :34, :82, :415, :608, :674, :782 · packages/core/src/proposals/link.ts:22, :28, :91 · apps/backoffice/src/pages/admin/AdminProposalPage.test.tsx (nomes de teste como "D-14: reaberta…", "D-28: sem token…", "D-17: renovar…") · supabase/functions/_shared/tokenCipher.ts · supabase/migrations/20261111120000_94-link-sempre-e-endereco.sql:1 ("WI 94, D-04, D-14, D-28") | O código e os testes novos trazem os ids das decisões do WI (`D-04`, `D-14`, `D-17`, `D-20`, `D-25`, `D-28`) e a chave "WI 94", em comentários e em nomes de teste. Todos são novos nesta tarefa. | regra do workflow: identificador de processo não entra no código |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o painel mostra o link de uma proposta aberta reaberta e copia sem gerar link novo | handlers.ts `tokenDisponivel`/`get` (devolve `token`); AdminProposalPage.tsx `linkDoServidor`/`linkVivo`; ProposalLinkCard.tsx (campo só leitura, Copiar, WhatsApp); teste "D-14: reaberta, o link vem do `get`" | sim |
| Renovar só na expirada, com a frase nova, salvo o recuo sem cifra de D-28 | core state.ts `proposalActions(state, { linkAvailable })` + `renewLabel`; handlers.ts `renew` (409 para a aberta com link); link.ts `proposalRenewText`; AdminProposalPage.tsx `renovar` (confirma com a frase nova na expirada) | sim |
| o endereço vai ao cadastro pela gravação da proposta, e uma falha não deixa nada gravado | migration 20261111120000 (o bloco `save_address` dentro de `save_order_proposal`); handlers.ts `p.save_address`; draft.ts `toSavePayload`; Builder sem `gravarEnderecoDaCliente`; probe linhas 161–182 (a falha desfaz tudo) | sim |
| a origem "Pedido montado" no painel | core link.ts `PROPOSAL_ORIGIN_LABEL`; copy.ts reexporta como `ORDER_ORIGIN_PREFIX`; AdminOrderPage.origem.test.tsx | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes; falta o achado 1 | não (achado 1) |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

- Migration só no banco local, com prefixo único depois do último em disco: `20261111120000` vem depois de `20261110160000`. O implementador aplicou com `psql` em vez de `supabase migration up --local` (premissa 13), e a raiz do CLAUDE.md permite `psql` na porta 54442. Aplicada.
- O secret opcional no `[edge_runtime.secrets]` e no `.env.example`, fora da lista obrigatória: `PROPOSAL_TOKEN_KEY` está em supabase/config.toml e em .env.example, e o workflow de deploy não foi tocado. Aplicada.
- Atualizar supabase/CLAUDE.md:216 (SEG-01) e a seção do `order-proposals`: a linha da tabela de functions foi reescrita (hash + cifra) e um parágrafo do WI 94 entrou na seção do `order-proposals` e na lista de secrets. Aplicada.
- Remover `linkMemory.ts`, a chave `estrelinha.admin.proposal-link.*` e `LINK_NOT_IN_MEMORY`, mantendo o recuo "Gerar link novo": o arquivo foi apagado, nenhuma referência sobrou em apps/packages/supabase, `LINK_UNAVAILABLE` cobre o recuo e há teste do recuo. Aplicada.
- Apagar `gravarEnderecoDaCliente` e a chamada no Builder: as duas saíram, junto com `EnderecoParaGravar` e os testes dela. Aplicada.
- Provar a gravação contra o banco local (`AD-012`): o probe 01-link-e-endereco.sql cobre a RPC. A parte da foto não foi provada no banco (achado 1). Aplicada em parte.

## Testes

- Unidade (functions), `get` com token só da aberta com cifra, sem cifra e sem hash na resposta ou no log: handlers.test.ts, describe "get — o link enquanto aberta (D-14)". Cobre aberta e vista com chave; expirada, cancelada e concluída sem token; cifra sem chave. Confere que a cifra e o hash não aparecem no texto da resposta nem nos logs, e que o select pede `token_cipher` e não `token_hash`. A asserção morde.
- Unidade (functions), `save` passa `save_address`, `renew` nos três casos, e sem chave só o hash: describes "save — a cifra e o save_address" e "renew — só a expirada, ou a aberta sem link". Cobre a aberta com cifra (409, nada gravado), a aberta sem cifra com chave (sai com cifra que decifra o token), a expirada (um update só, hash e cifra do mesmo token), sem chave (`token_cipher: null`) e a chave trocada. A asserção morde.
- Unidade (functions), a foto variação → `images[0]` → `image_url`: describe "a foto gravada na linha". A asserção morde, mas sobre o dublê.
- Unidade (core), `proposalActions` com sensor: state.test.ts tem os casos com link e sem link, o SENSOR "com link, renovar some" e a expirada nos dois valores. A asserção morde.
- Página real (painel): AdminProposalPage.test.tsx cobre o link do `get` sem "Gerar link novo", o "Gerar link novo" chamando `renew` e mostrando o link novo, "Renovar prazo" só na expirada com `proposalRenewText` e regex exato, e a aberta sem Renovar. AdminProposalBuilderPage.test.tsx cobre `save_address: true`/`false`, a ausência de escrita em `addresses` e a falha com `SAVE_FAILED`. AdminOrderPage.origem.test.tsx cobre "Pedido montado · P-0001". A asserção morde.
- Integração local (probe): 01-link-e-endereco.sql cobre a mesma transação (a falha desfaz proposta e ficha), `addresses_one_default`, a versão que não sobe pela cifra nem pela observação, a ficha única e a busca pelo hash. A peça sem foto por variação gravando `images[0]` não aparece (achado 1). A abertura pela `get-proposal`/checkout só está provada por uma contagem `where token_hash = …`, sem passar pela function.
- Guardas: pedidoMontadoSchema.test.ts tem `hashECifraNuncaOToken` com três sensores e a vigente migrada, também com sensor. observacaoDaPropostaSchema.test.ts aponta a vigente do save para a migration nova, aplica as réguas da nota à vigente e mantém o sensor da 89. linkSempreSchema.test.ts é novo: confere a igualdade com a 95 depois de desfeitas as trocas, com sensores de cada troca e um `mutar` que lança. A asserção morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `token` no nível de cima do `get`; `linkAvailable` = a cifra existe e decifra | sim | A linha do Contrato do `renew` ("recusa a não expirada que tem cifra"). A cifra que não abre cai no recuo de D-28, que manda manter o comportamento de hoje sem a chave. | sim (a tarefa 04 consome `token` e `renewLabel`) |
| 2 | `proposalActions(state, input = {})` com `renewLabel` e constantes | sim | Os chamadores (Builder usa só `.edit`; o `cancel` da function usa só `.cancel`). Nenhum consumidor em apps/mobile-adm ou na loja. | sim |
| 3 | AES-GCM `v1.` + base64url, chave opcional; chave inválida ⇒ `null` | sim | tokenCipher.ts; index.ts; D-28 | sim |
| 4 | O `renew` grava a cifra no mesmo update; sem chave, `null` | sim | handlers.ts `renew`; o teste "sem a chave" | sim |
| 5 | O `get` tira cifra, hash e chave de idempotência | sim | `semCifra`; o teste confere o texto da resposta | sim |
| 6 | Endereço só com `true` booleano + CEP e rua; padrão só sem padrão; sem duplicar; antes do "sem mudança" | sim | A migration; `addresses_one_default`; o probe | sim (a tarefa 09 manda `save_address`, já propagado) |
| 7 | Marcada ao montar, desmarcada ao editar; manda só com cliente e endereço digitado | sim | A Design da tarefa ("marcada por padrão (só com cliente escolhida)"); draft.ts; draft.test.ts | sim |
| 8 | O link do Builder vai à página pelo estado da navegação, sem sessionStorage | sim | A obrigação de remover `linkMemory`; D-28 | sim |
| 9 | As confirmações continuam em `window.confirm` | sim | A página já confirmava assim antes (HEAD) | sim |
| 10 | Três textos em core/proposals/link.ts, reexportados pelo painel | sim | O "defeito 01" da raiz; D-25 | sim (a 04 e a 09 citam `PROPOSAL_ORIGIN_LABEL`, `proposalRenewText` e `PROPOSAL_SAVE_FAILED`) |
| 11 | `SAVE_FAILED` só para erro sem `code` ou `save_failed` | sim | O Builder; o teste D-20 | sim |
| 12 | Cancelada e concluída com o cartão "Link encerrado." | sim | A Design ("Cancelada/concluída: link morto, sem ação") | sim |
| 13 | `psql -1 -f` e registro manual em `schema_migrations` | sim | A raiz CLAUDE.md › CI e deploy ("aplique no local (`supabase migration up` ou `psql` na porta 54442)") | sim (só o banco local) |
| 14 | "Ver o pedido #NNNN" | sim | Critério "Concluída: 'Ver o pedido #0262'" | sim |

## Não conferido

- Não rodei testes nem o probe. Os resultados (o probe com 19 `ok —` declarados, as suítes dos workspaces, `tsc`, lint) dependem de execução.
- Sem probe ou chamada real, não confirmei se a projeção PostgREST `capa:images->0->>url` funciona no `products` local.
- A abertura pela `get-proposal`/checkout só está provada por proxy (contagem pelo hash no SQL), sem passar pela function `checkout`.
- `linkMemory.ts` aparece como deletado e staged (`D `); o conteúdo antigo foi lido por `git show HEAD:`.
- Instruções lidas: CLAUDE.md da raiz (carregado inteiro no contexto, inclusive › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy). Os CLAUDE.md de apps/backoffice, packages/core e supabase não foram lidos pelas seções citadas: conferi só os trechos que o diff alterou. As regras deles que o diff poderia contrariar (as seções › Montar pedido para a cliente, › proposals, › Migrations, › RLS, › Edge functions, › order-proposals, › Secrets) ficam sem conferência própria.

## T02 — wi-impl-task · done · agente a2b2fa371d77f31fb

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/02-link-sempre-e-endereco-no-painel.md
Situação: fechou

Apliquei os dois achados da revisão.

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 15 | Achado 1: criei um segundo probe local, `02-foto-e-link-pela-function.mjs`. Ele importa o `handlers.ts` real (o Node 24 tira os tipos) e o roda com o supabase-js real apontado para 127.0.0.1:54441. Só `auth.getUser` é trocado, para devolver uma conta admin real do banco local; o `has_role` roda de verdade. No fim o probe apaga tudo o que gravou. | Um script que só fizesse `curl` no `select`. Subir `supabase functions serve`. | O `curl` provaria a sintaxe, não a cadeia. O `serve` fica rodando, o que a regra 8 proíbe. Assim o caminho completo roda contra o PostgREST de verdade: `capa:images->0->>url` → `fotoDaLinha` → RPC → `order_proposal_items.product_image`. | Só o probe |
| 16 | Achado 2: tirei `D-nn` e "WI 94" de todo o código, testes, migration, config e `.env.example` que eu tinha escrito. Mantive o nome do arquivo da migration (`…_94-…`, convenção declarada no CLAUDE.md), os caminhos de probe em `.specs/` citados em comentário (a 95 faz igual) e os ids que já estavam no HEAD (`AD-070`, `AD-004`, `A-12`…). | Mexer nos ids antigos | Não são desta tarefa | Nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 12 | Peça sem foto na variação e na coluna antiga grava `images[0]` pela leitura `capa:images->0->>url` no PostgREST real. O mesmo probe confere ainda: cifra gravada, `get` devolve o token sem cifra nem hash, `renew` recusa a aberta com link, `save_address` vai para a ficha. | integração local (probe) | .specs/work-items/94-montar-pedido-no-app/probes/02-foto-e-link-pela-function.mjs | sim (10 `ok —`) | vermelho: com a regra antiga da foto, o probe falha na linha `images[0]`; arquivo restaurado (cmp) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

Da implementação:
- supabase/migrations/20261111120000_94-link-sempre-e-endereco.sql criado
- supabase/functions/_shared/tokenCipher.ts criado
- supabase/functions/order-proposals/handlers.ts alterado
- supabase/functions/order-proposals/index.ts alterado
- supabase/functions/order-proposals/__tests__/handlers.test.ts alterado
- supabase/config.toml alterado
- supabase/CLAUDE.md alterado
- .env.example alterado
- packages/core/src/proposals/state.ts alterado
- packages/core/src/proposals/link.ts alterado
- packages/core/src/proposals/__tests__/state.test.ts alterado
- packages/core/src/proposals/__tests__/link.test.ts alterado
- packages/core/CLAUDE.md alterado
- apps/backoffice/src/features/order-proposal/model/linkMemory.ts removido
- apps/backoffice/src/features/order-proposal/model/proposalLink.ts criado
- apps/backoffice/src/features/order-proposal/index.ts alterado
- apps/backoffice/src/features/order-proposal/model/copy.ts alterado
- apps/backoffice/src/features/order-proposal/model/draft.ts alterado
- apps/backoffice/src/features/order-proposal/api/proposalsApi.ts alterado
- apps/backoffice/src/features/order-proposal/ui/ProposalLinkCard.tsx alterado
- apps/backoffice/src/features/order-proposal/ui/AddressSection.tsx alterado
- apps/backoffice/src/features/order-proposal/ui/ProposalOrigin.tsx alterado
- apps/backoffice/src/pages/admin/AdminProposalPage.tsx alterado
- apps/backoffice/src/pages/admin/AdminProposalBuilderPage.tsx alterado
- apps/backoffice/src/entities/customer/api/useCustomerSearch.ts alterado
- apps/backoffice/src/entities/customer/api/__tests__/useCustomerSearch.test.ts alterado
- apps/backoffice/src/features/order-proposal/api/__tests__/proposalsApi.test.ts alterado
- apps/backoffice/src/features/order-proposal/model/__tests__/draft.test.ts alterado
- apps/backoffice/src/features/order-proposal/ui/__tests__/CustomerAddress.test.tsx alterado
- apps/backoffice/src/pages/admin/AdminProposalPage.test.tsx alterado
- apps/backoffice/src/pages/admin/AdminProposalBuilderPage.test.tsx alterado
- apps/backoffice/src/pages/admin/AdminOrderPage.origem.test.tsx alterado
- apps/backoffice/CLAUDE.md alterado
- apps/store/src/shared/lib/__tests__/linkSempreSchema.test.ts criado
- apps/store/src/shared/lib/__tests__/pedidoMontadoSchema.test.ts alterado
- apps/store/src/shared/lib/__tests__/observacaoDaPropostaSchema.test.ts alterado
- .specs/work-items/94-montar-pedido-no-app/probes/01-link-e-endereco.sql criado
- .specs/work-items/94-montar-pedido-no-app/tasks/04-montados-e-pedido-montado-no-app.md alterado
- .specs/work-items/94-montar-pedido-no-app/tasks/09-revisar-e-criar-link.md alterado

Novo nesta correção:
- .specs/work-items/94-montar-pedido-no-app/probes/02-foto-e-link-pela-function.mjs criado

## Verificação

Só o que a correção rodou:

- Probe 02: `SERVICE_ROLE_KEY="$(supabase status -o json | jq -r .SERVICE_ROLE_KEY)" node .specs/work-items/94-montar-pedido-no-app/probes/02-foto-e-link-pela-function.mjs`. Exit 0, 10 `ok —`; com o mutante da foto, exit 1. Fonte: PROJECT.md › Ambiente local (banco local, porta 54441).
- Migration reaplicada no banco local com `psql -1 -f` (porta 54442), porque mudou o comentário dentro do corpo da função. Exit 0. Fonte: CLAUDE.md › CI e deploy.
- Probe 01 rodado de novo: exit 0, 20 linhas `ok —`. Pelo grep a contagem passou de 19 para 20, mas o arquivo não mudou.
- Arquivos de teste das partes tocadas, todos exit 0 (fonte: PROJECT.md):
  - core `src/proposals`: 99
  - functions `order-proposals` + `_shared`: 314
  - store, os três guardas: 191
  - backoffice, páginas e features da proposta: 195
- Tipos, comparados com a baseline do CLAUDE.md (fonte: CLAUDE.md › Comandos):
  - backoffice: 7 erros, todos herdados de `ProposalStateBadge.test.tsx`, nenhum novo
  - core: 11, herdados
  - mobile-adm: 0

Instruções lidas: as mesmas da implementação.

## Divergências e descobertas

- O probe 02 escreve no banco local e apaga o que gravou no `finally`; a última asserção dele confere que nada ficou.
- Ele exige uma peça local com galeria, sem `image_url` e com uma variação ativa sem foto e sem opções. O catálogo local tem essa peça (747 produtos com galeria).

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 02
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/backoffice/CLAUDE.md › A busca de produto, › Montar pedido para a cliente; packages/core/CLAUDE.md › Quando um código pertence, › Pureza, › Os módulos, › customers, › proposals, › Convenções de tipo; supabase/CLAUDE.md › Migrations, › RLS, › Edge functions, › order-proposals, › Secrets; .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local
Testes escritos:
  - core: state.test.ts (proposalActions, com sensor); link.test.ts (proposalRenewText, PROPOSAL_ORIGIN_LABEL, PROPOSAL_SAVE_FAILED)
  - functions: handlers.test.ts (cifra; get com token só da aberta com cifra, sem cifra nem hash na resposta ou no log; save com save_address e com ou sem cifra; renew nos casos aberta com cifra, aberta sem cifra, expirada e sem chave; foto variação → images[0] → image_url)
  - painel, página real: AdminProposalPage.test.tsx, AdminProposalBuilderPage.test.tsx, AdminOrderPage.origem.test.tsx
  - painel, unidade: draft.test.ts, CustomerAddress.test.tsx
  - probes locais: 01-link-e-endereco.sql (a RPC: uma transação, addresses_one_default, versão que não sobe, ficha única, achável pelo hash); 02-foto-e-link-pela-function.mjs (o handler real contra o PostgREST local: images[0] na linha, cifra, get com token, renew recusado, save_address)
  - guardas: linkSempreSchema (novo); pedidoMontadoSchema e observacaoDaPropostaSchema migrados
  - sem cobertura: a function dentro do edge runtime (parado; o probe 02 roda o mesmo handler fora dele)
Verificações:
  - tsc: store 0, backoffice 7 herdados, mobile-adm 0, server 0, core 11 herdados
  - suítes inteiras na implementação, todas exit 0: core 5509, functions 1541, backoffice 5182, store 7091, mobile-adm 2407
  - arquivos tocados de novo na correção: verdes
  - lint: 23/5 e 2/2
  - probes 01 e 02: exit 0
  - migration aplicada só no local
Árvore de trabalho: os arquivos listados em "Arquivos alterados"; nada commitado
Citações conferidas: 16 abertas; state.ts:55 tinha deslocado (a função está em :51); nenhuma morta
Propagado: 04 (PROPOSAL_ORIGIN_LABEL na D-25; proposalRenewText e actions.renewLabel na D-17); 09 (PROPOSAL_SAVE_FAILED na D-20)
```

## T04 — wi-impl-task · review · agente a3a378bdc91dc1cc4

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/04-montados-e-pedido-montado-no-app.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A `list` ganhou, por proposta, `lines` (`product_name`, `product_image`, `variant_label`, `quantity`), com teto `LINHAS_NA_LISTA = 4` (exportado) e `lines_count`, mais o `agora` do servidor no topo da resposta. Uma leitura só de `order_proposal_items` com `.in('proposal_id', ids)`. Se essa leitura falha, a resposta é 502 | Teto maior; `now` em inglês; devolver a lista sem as peças quando a leitura falha | `agora` é o nome do Contrato. Um cartão sem as peças diria "nenhuma peça" de um pedido que tem; por isso falha vira 502, como já fazia a leitura das propostas | `handlers.ts › list`; painel (`ProposalsList`) recebe campos novos, aditivos; 05 a 10 consomem `lines`/`agora` |
| 2 | O detalhe lê o `get` dentro de `lerComPapel`, e o `lido_em` vira o relógio de "montado há N dias" | Mudar o `get` (o Não faça proíbe); usar o relógio do aparelho | O `get` não traz a hora do servidor; `lerComPapel` traz a confirmação do papel e o `lido_em` juntos | `features/order-proposal/model/useMontados.ts`; 09 ("Editar") lê pela mesma chave |
| 3 | O selo usa `PROPOSAL_STATE_LABELS` de `core`. A vista aparece como "Aberta — vista pela cliente" | Escrever no app o rótulo "Vista pela cliente" do desenho | Um segundo rótulo do mesmo estado seria o defeito 01 (o painel lê o de `core`) | `SeloDoMontado`; a QA pode notar a diferença de texto em relação ao desenho |
| 4 | `traduzir` subiu para `shared/api/traduzir.ts` e ficou genérico: recebe um `LeitorDoErro` por porta (o padrão é o dos avisos). Junto vai `invocar`, para que um `invoke` que rejeita vire falha e não exceção. Na porta dos montados o slug é `code`, ou a frase quando não há código, e a frase e o `totalRelido` vêm junto (`ErroDaProposta`) | Duas cópias da tradução; só o slug | A tela mostra a frase da function, e o `prices_changed` precisa do total relido | Portas dos avisos e dos montados; as portas de 06 e 08 |
| 5 | "Gerar link novo" (aberta sem token) chama `renew` direto, sem folha. O link novo fica só no estado da tela, preso à conta | Abrir a folha de renovar | A frase da folha (`proposalRenewText`, "O link venceu em…") não vale para uma proposta aberta, e o cartão já avisa que o link anterior para de funcionar | `PedidoMontadoPage`, `useAcoesDoMontado` |
| 6 | A observação interna é editável em todo estado, menos no concluído (o botão some ali) | Mostrar "Editar" também na concluída | O servidor recusa com 409 `NOTE_ON_ORDER` na concluída; um botão que sempre falha é pior | A tela; se a decisão humana for outra, é uma linha |
| 7 | O tom ganhou guarda próprio, `tomMemorialDosMontados.test.ts`. Nele a régua de material acusa "pelos" só no plural | Pôr as pastas em `tomMemorialDeClientes` | Lá "pelo" reprova "Enviar pelo WhatsApp", texto do desenho. A diferença está declarada no cabeçalho e tem sensor nos dois sentidos | Escopo `features/order-proposal/`, `widgets/proposal-list/`, `pages/PedidoMontadoPage.tsx`; 05 a 09 entram ali |
| 8 | O movimento foi para `movimentoDosPedidos.test.ts` (lista literal, âncoras 39 arquivos, 16 tokens e 14 pares, `SheetContent` com três folhas) | `movimentoDeClientes` | Os montados ficam na aba Pedidos | Próximas tarefas acrescentam arquivos nessa lista |
| 9 | Hook genérico de folha no histórico: `shared/lib/useFolhaNaEntrada.ts`, com o marcador só no `state` | Reusar `useFolhaNoHistorico`, que é preso a `LinhaDaLista`; pôr o hook dentro de `features/order-proposal` | Dentro da feature, a régua 5 de `semDadoDeClienteNoAparelho` o acusaria; o marcador é só a chave da folha | As folhas de cancelar, renovar e observação; 05 e 07 podem reusar |
| 10 | O título do documento do pedido montado é o literal `'Pedido montado · Ateliê'` | Montar o título com o número | A régua 3 de `semDadoDeClienteNoAparelho` recusa título montado | `PedidoMontadoPage` |
| 11 | As faixas de estado (concluída, expirada, cancelada) usam fundo neutro (`ground-deep`) | As classes de tom `*-soft` | `Selo.test.tsx` recusa classe de pílula de tom fora do dono | Visual; QA |
| 12 | A observação reusa a `FolhaDaObservacao` de `features/order-actions` com um adaptador; `devolverFoco` passou a ser exportado pelo barril de `order-actions` | Uma segunda folha de observação | Duas folhas da mesma observação divergiriam (defeito 01) | `order-actions/index.ts` (uma linha acrescentada) |
| 13 | O aviso de sucesso (toast) é uma região `role="status"` dentro da página | O `AvisoDaAcao` global da 75 | O global é por pedido e preso ao módulo da ação de pedido | `PedidoMontadoPage` |
| 14 | O cartão "Cliente" mostra contato, documento (`documentoDoMontado`, com `documentLabel` e `maskDocument` de `core`) e endereço (`enderecoDoMontado`; sem rua, "A cliente preenche o endereço no link."). A exceção literal de `semDadoSensivelDeClienteNoApp` cobre só `tipos.ts` e `frases.ts`, com sensor na aba Clientes | Não mostrar documento nem endereço | D-16 (texto da 05) diz que o pedido montado os mostra; D-08 prevê a exceção | `semDadoSensivelDeClienteNoApp` (PERMITIDAS); 05 acrescenta os arquivos dela |
| 15 | Cartão da lista sem foto; as peças em texto, com "· e mais N" quando passam do teto | Fotos no cartão | O desenho pede só "Nome · variação" | `ListaDeMontados` |
| 16 | O chip diz "Montados · N aberto(s)"; com zero abertos ou sem a contagem, só "Montados" | "Montados · 0 abertos" | Contagem sem dado não é afirmada | `rotuloDoChip` |
| 17 | A aba Pedidos lê sempre a `list` (para o chip). Na visão Montados a lista de pedidos não é lida (`useListaDePedidos(…, { habilitada })`) e a busca some | Ler a `list` só dentro da visão | Sem a leitura, o chip fora da visão não teria contagem | `PedidosPage`, `useListaDePedidos` (parâmetro opcional novo) |
| 18 | `VITE_STORE_URL` fixada no `vitest.config.ts` do app; `origemDaLoja` lê a env na chamada | Ler a env no carregamento do módulo | Sem isso a suíte mediria o `.env` de quem roda | Config de teste do app |
| 19 | `prices_changed` no `renew`: a mesma folha mostra a frase e o total relido; confirmar manda `expected_total` | Recusar sem caminho para seguir | É o fluxo do painel (`renewProposal(id, expectedTotal)`) | `useAcoesDoMontado` |
| 20 | A função da porta que grava a observação chama-se `gravarObservacaoDoMontado` | `gravarObservacao` | O nome já existe em `order-actions` | 09 se usar |
| 21 | Em `acoesComClientReal`, a asserção "nenhuma function depois do update vazio" passou a excluir `/functions/v1/order-proposals` | Deixar a régua contar a leitura da `list` | Essa leitura do chip não é o aviso que a régua protege; o aviso continua contado | Esse teste |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `list` traz as peças resumidas com teto e o `agora` | Unidade (functions) | `supabase/functions/order-proposals/__tests__/handlers.test.ts` (+2 casos) | sim | vermelho (teto 4→5 e a ordenação apagada, os dois mortos) |
| 2 | `?visao=montados` e `/pedidos/montados/<id>` no dono do endereço | Unidade | `entities/order/model/__tests__/pedidosHref.test.ts` (+4) | sim | — |
| 3 | A porta: nome literal por ação, frase e código, recusa só pelo `42501`, rede é falha | Unidade | `features/order-proposal/api/__tests__/portaDePropostas.test.ts` (10) | sim | vermelho (slug invertido; recusa removida de `traduzir`) |
| 4 | "Montados" pelo endereço; chip ao fim com a contagem; cartões com a meta de cada estado; vazio e falha | Página real (`montarApp`) | `pages/__tests__/pedidosMontados.test.tsx` | sim | vermelho (ordem do chip; contagem só de `open`) |
| 5 | Link do `get`; "Sem telefone"; copiar e WhatsApp chamam `log-sent` e entram no histórico; sem token, "Gerar link novo" chama `renew` e mostra o link novo; sem `VITE_STORE_URL`, `LINK_WITHOUT_STORE`; peças com foto; cartão Cliente | Página real | `pedidosMontados.test.tsx` | sim | vermelho (`log-sent` apagado; link renovado ignorado) |
| 6 | Ações por estado; observação salva por `note` | Página real | `pedidosMontados.test.tsx` | sim | vermelho (cancelar mostrado fora da aberta) |
| 7 | Conta sem papel em cada ação ⇒ recusa da 72 e nenhum dado em instante nenhum; 403 com o relógio de pé ⇒ falha; rede ⇒ falha | Client real | `app/__tests__/montadosComClientReal.test.tsx` (16) | sim | vermelho (403 sempre recusa; recusa fora da vigia; rede perguntando o papel) |
| 8 | Guardas: `escritaSoPelaPorta`, `leituraSoComPapel`, `semDadoSensivelDeClienteNoApp`, `semDadoDeClienteNoAparelho`, `barraNoCaminho`, `rotasSobGuarda`, `abasSaoAsRotas`, `enderecoDePedidosComDonoUnico` (sem alteração, verde), tom (`tomMemorialDosMontados`, novo) e movimento | Guarda de fonte | os arquivos citados | sim | vermelho (`!` injetado nas frases reprova o guarda de tom) |
| 9 | A troca de conta esquece o pedido montado e o link renovado | Página real | `app/__tests__/trocaDeContaLimpaCache.test.tsx` (+1) | sim | ficou verde |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

supabase/functions/order-proposals/handlers.ts alterado
supabase/functions/order-proposals/__tests__/handlers.test.ts alterado
apps/mobile-adm/.env.example alterado
apps/mobile-adm/CLAUDE.md alterado
apps/mobile-adm/vitest.config.ts alterado
apps/mobile-adm/src/app/App.tsx alterado
apps/mobile-adm/src/app/__tests__/acoesComClientReal.test.tsx alterado
apps/mobile-adm/src/app/__tests__/rotasSobGuarda.test.ts alterado
apps/mobile-adm/src/app/__tests__/trocaDeContaLimpaCache.test.tsx alterado
apps/mobile-adm/src/app/__tests__/montadosComClientReal.test.tsx criado
apps/mobile-adm/src/entities/order/index.ts alterado
apps/mobile-adm/src/entities/order/model/pedidosHref.ts alterado
apps/mobile-adm/src/entities/order/model/__tests__/pedidosHref.test.ts alterado
apps/mobile-adm/src/entities/order/api/useListaDePedidos.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado
apps/mobile-adm/src/features/order-actions/index.ts alterado
apps/mobile-adm/src/features/order-slice/index.ts alterado
apps/mobile-adm/src/features/order-slice/ui/ChipsDeRecorte.tsx alterado
apps/mobile-adm/src/features/push-notifications/api/portaDeAvisos.ts alterado
apps/mobile-adm/src/features/order-proposal/index.ts criado
apps/mobile-adm/src/features/order-proposal/api/portaDePropostas.ts criado
apps/mobile-adm/src/features/order-proposal/api/__tests__/portaDePropostas.test.ts criado
apps/mobile-adm/src/features/order-proposal/model/tipos.ts criado
apps/mobile-adm/src/features/order-proposal/model/frases.ts criado
apps/mobile-adm/src/features/order-proposal/model/useMontados.ts criado
apps/mobile-adm/src/features/order-proposal/model/useAcoesDoMontado.ts criado
apps/mobile-adm/src/features/order-proposal/ui/SeloDoMontado.tsx criado
apps/mobile-adm/src/features/order-proposal/ui/CartaoDoLink.tsx criado
apps/mobile-adm/src/features/order-proposal/ui/FolhaDeConfirmacao.tsx criado
apps/mobile-adm/src/widgets/proposal-list/index.ts criado
apps/mobile-adm/src/widgets/proposal-list/ui/ListaDeMontados.tsx criado
apps/mobile-adm/src/pages/PedidosPage.tsx alterado
apps/mobile-adm/src/pages/PedidoMontadoPage.tsx criado
apps/mobile-adm/src/pages/__tests__/pedidosMontados.test.tsx criado
apps/mobile-adm/src/shared/api/traduzir.ts criado
apps/mobile-adm/src/shared/config/loja.ts criado
apps/mobile-adm/src/shared/lib/useFolhaNaEntrada.ts criado
apps/mobile-adm/src/shared/lib/__tests__/tomMemorialDosMontados.test.ts criado
apps/mobile-adm/src/shared/lib/__tests__/movimentoDosPedidos.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/novaAbaAvisada.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoSensivelDeClienteNoApp.test.ts alterado
apps/mobile-adm/src/test/montados.ts criado
apps/mobile-adm/src/widgets/tab-bar/model/tabs.ts alterado
apps/mobile-adm/src/widgets/tab-bar/__tests__/abasSaoAsRotas.test.ts alterado
apps/mobile-adm/src/widgets/tab-bar/__tests__/barraNoCaminho.test.ts alterado
.specs/work-items/94-montar-pedido-no-app/tasks/05-montagem-casca-e-cliente.md alterado

## Verificação

- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (fonte: `CLAUDE.md` §Comandos): 0 erros. Não houve `baseline` na entrada e eu não rodei a conferência antes da primeira fatia. Comparei com a baseline do `CLAUDE.md` (mobile-adm 0): nenhum erro novo. `tsconfig.node.json` também deu 0. Esse comando regravou `tsconfig.node.tsbuildinfo`; devolvi o arquivo ao conteúdo de HEAD com `git show` (`git status` limpo para ele).
- `npx eslint .` em `apps/mobile-adm` (fonte: `CLAUDE.md` §Baselines): 0/0, igual à baseline.
- Um arquivo de teste: `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (fonte: `PROJECT.md` › Comandos de verificação), rodado a cada fatia.
- Verificação mínima (fonte: `CLAUDE.md` §Baselines, a suíte do workspace tocado mais as da loja e do painel), exit fora de pipe:
  - mobile-adm: **2481/156**, exit 0. Uma execução anterior reprovou 1 caso por contenção em `useFolhaNoHistorico.test.tsx`; ele passou isolado duas vezes e na suíte remedida (o flake já está documentado no `CLAUDE.md`).
  - functions: **1543/41**, exit 0.
  - store: **7091/378**, exit 0.
  - backoffice: **5182/288**, exit 0.
- Instruções lidas: `CLAUDE.md` (raiz; a cópia da raiz do repositório principal, que veio no contexto) › Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; `apps/mobile-adm/CLAUDE.md` (inteiro); `supabase/CLAUDE.md` › Migrations, RLS — o molde que os guardas cobram, Edge functions, `order-proposals` e o pedido que nasce de uma proposta, Secrets; `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- **Check de mutação que ficou verde (fatia 9).** Apaguei os dois resets do link renovado na troca de conta (`setRenovado(null)` no efeito e a comparação `renovado.conta === conta`) e o caso de `trocaDeContaLimpaCache` seguiu verde. Motivo: na troca de conta o `RequireAdmin` desmonta a página (passa pelo `fallback`), então o estado da tela já some pela desmontagem. A proteção no hook é redundante hoje; o teste mede o desfecho, que vale.
- **Fatias de página e de client real passaram de primeira.** Não sobem infraestrutura (dublê e client real com `fetch` nosso). Mesmo assim fiz o check de mutação em todas, e todos os mutantes morreram (tabela acima).
- **Comportamento que só a execução prova, sem execução.** A nova leitura de `order_proposal_items` na `list` (`.in('proposal_id', …)` e `.order`) foi testada contra o dublê de `_shared/testing/fakes.ts`, não contra o PostgREST local. Não rodei o probe nos moldes de `probes/02-foto-e-link-pela-function.mjs` para a `list`.
- **Desvio do D-08: tom.** As pastas novas não entraram em `tomMemorialDeClientes`, porque a régua de material dele ("pelos?") reprova "Enviar pelo WhatsApp". O tom ficou num guarda próprio, `tomMemorialDosMontados` (decisão 7). O movimento entrou em `movimentoDosPedidos`, não em `movimentoDeClientes`.
- **Desvio do D-08: exceção de dado sensível.** A exceção em `semDadoSensivelDeClienteNoApp` cobre só o documento, nos dois arquivos de `features/order-proposal/model/`. As páginas da montagem ainda não existem (são da 05), e as colunas `address_*` não são termo recusado.
- **Memória do aparelho.** O `get` devolve à memória do app o documento e o endereço completos. A régua de `semDadoSensivel` mede o fonte, não a rede, e o contrato do `get` (da 02) não muda nesta tarefa.
- **Prova de layout fica para a QA** (obrigação da tarefa): alvo de 44 px, `body` sem rolagem lateral em 390, o chip longo "Montados · N abertos" na faixa de chips e o cartão escuro do link. jsdom devolve 0 para layout.
- **Propagado: tarefa 05, linha "Depende de".** Corrigi o que a 04 entrega: os nomes da porta e das ações; `INVOCACAO_ACEITA` como mapa por porta; `traduzir` em `shared/api/traduzir.ts`; os guardas de tom e movimento; e a exceção de `semDadoSensivel`, que é só do documento, por arquivo e texto, ficando para a 05 acrescentar os arquivos dela.
- Citações conferidas: o exemplar `portaDeAvisos.ts:57-82` (é a função `traduzir`; as linhas casaram), `avisosComClientReal`, `useFolhaNoHistorico`, `storeOrigin.ts`, `handlers.ts › note`/`list`, `tabs.ts:51-52` (`barraNoCaminho`), e no Contrato `COLUNAS_DA_LISTA` (`:145-157`) e `list` (`:526-557`). Estas duas deslocaram (agora `:154-166` e `:539-575`) e foram relocalizadas pelo nome. Nenhuma citação morta.
- Depende de: `LINK_WITHOUT_STORE` existe em `core/proposals/link.ts`, e o `get` devolve `token` só da aberta com cifra (conferidos antes de escrever).

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; apps/mobile-adm/CLAUDE.md (inteiro); supabase/CLAUDE.md › Migrations, RLS — o molde que os guardas cobram, Edge functions, order-proposals e o pedido que nasce de uma proposta, Secrets; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - Unidade (functions), list com as peças resumidas, o teto e o agora: supabase/functions/order-proposals/__tests__/handlers.test.ts (+2)
  - Página real, "Montados" por ?visao=montados, chip ao fim com a contagem, cartões com a meta por estado: apps/mobile-adm/src/pages/__tests__/pedidosMontados.test.tsx (+ pedidosHref.test.ts)
  - Página real, cartão do link, "Sem telefone", copiar e WhatsApp chamando log-sent com o histórico, "Gerar link novo" chamando renew e mostrando o link novo, LINK_WITHOUT_STORE: pedidosMontados.test.tsx
  - Página real, ações por estado e observação salva por note: pedidosMontados.test.tsx
  - Client real, conta sem papel em cada ação ⇒ recusa e nenhum dado; rede é falha: apps/mobile-adm/src/app/__tests__/montadosComClientReal.test.tsx
  - Guardas: escritaSoPelaPorta, leituraSoComPapel, semDadoSensivelDeClienteNoApp (exceção literal com sensor, inclusive na aba Clientes), semDadoDeClienteNoAparelho, barraNoCaminho, rotasSobGuarda, abasSaoAsRotas, enderecoDePedidosComDonoUnico (verde sem alteração), tom (tomMemorialDosMontados.test.ts, novo) e movimento (movimentoDosPedidos.test.ts), mais trocaDeContaLimpaCache (+1)
  - Sem cobertura: a leitura nova da list contra o PostgREST local (só contra o dublê); layout em navegador (fica para a QA)
Verificações: tsc mobile-adm 0 (tsconfig.app e node); eslint mobile-adm 0/0; suítes exit 0 — mobile-adm 2481/156, functions 1543/41, store 7091/378, backoffice 5182/288
Árvore de trabalho: a function order-proposals (list), o app (feature order-proposal, widget proposal-list, PedidoMontadoPage, a visão Montados em PedidosPage/ChipsDeRecorte/pedidosHref, a rota e a barra de abas, shared/api/traduzir.ts, shared/config/loja.ts, shared/lib/useFolhaNaEntrada.ts), os guardas, o .env.example e o vitest.config do app, apps/mobile-adm/CLAUDE.md, e a tarefa 05; nada commitado
Citações conferidas: 9 abertas ao usar; deslocadas e relocalizadas pelo nome: handlers.ts COLUNAS_DA_LISTA (:145-157 → :154-166) e list (:526-557 → :539-575); nenhuma morta
Propagado: 05 — a linha "Depende de" passa a descrever o que a 04 entregou (porta e ações, INVOCACAO_ACEITA por porta, traduzir em shared/api/traduzir.ts, os guardas de tom e movimento, e a exceção de semDadoSensivel só do documento, por arquivo e texto, com a 05 acrescentando os arquivos dela)
```

## T04 — wi-impl-review · fixing · agente ad7fc9b9476728d18

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/04-montados-e-pedido-montado-no-app.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | ------------------ | ------------- | --------- | ---------------------------------------------- |
| 1 | `identificador de processo` | atrapalha | `apps/mobile-adm/src/features/order-proposal/api/portaDePropostas.ts:8,17`; `model/useMontados.ts:10`; `model/useAcoesDoMontado.ts:17,47`; `model/frases.ts:9,125,141`; `model/tipos.ts:4`; `ui/CartaoDoLink.tsx:9-14`; `pages/PedidoMontadoPage.tsx:102`; `pages/PedidosPage.tsx:64`; `widgets/proposal-list/ui/ListaDeMontados.tsx:23`; `entities/order/model/pedidosHref.ts:70`; `shared/api/traduzir.ts:8`; `shared/config/loja.ts:2`; `shared/lib/useFolhaNaEntrada.ts:5`; `features/order-slice/ui/ChipsDeRecorte.tsx:16`; `widgets/tab-bar/model/tabs.ts:49`; `app/App.tsx:38`; `supabase/functions/order-proposals/handlers.ts:169`; e nos nomes de teste (`rotasSobGuarda.test.ts` "o pedido montado (…, WI 94)", `barraNoCaminho.test.ts` "o pedido montado (WI 94, …)", `leituraSoComPapel.test.ts` "régua 3 (WI 94)", `escritaSoPelaPorta.test.ts` "WI 94: na porta dos montados…", `semDadoSensivelDeClienteNoApp.test.ts` "WI 94 — as exceções…") | Comentários e nomes de teste do código novo citam a chave do Work Item ("WI 94") e as chaves de decisão da spec ("D-01", "D-06", "D-07", "D-14/D-28", "D-16", "D-23", "D-25"). Alguns comentários narram a mudança em vez de explicar o código: `acoesComClientReal.test.tsx:159` "(WI 94: a aba Pedidos lê…)" e `rotasSobGuarda.test.ts:67` "WI 94: e para CATORZE…". Nenhum arquivo de instruções lido declara por escrito a convenção de citar essas chaves | regra do workflow: identificador de processo não entra no código |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a Adri abre "Montados" pelo chip e vê os cartões com peças e meta | `features/order-slice/ui/ChipsDeRecorte.tsx` (chip ao fim, `montados`); `pages/PedidosPage.tsx` (`ehVisaoMontados`, `rotuloDoChip(contarAbertos)`); `widgets/proposal-list/ui/ListaDeMontados.tsx` (`metaDoCartao`, `pecasDoCartao`); `handlers.ts › list` (`lines`, `lines_count`, `agora`) | sim |
| no pedido montado aberto, copia ou envia o link e o histórico registra o envio | `features/order-proposal/ui/CartaoDoLink.tsx`; `model/useAcoesDoMontado.ts › enviar` → `registrarEnvio` (`log-sent`) e depois relê; `frases.ts › rotuloDoEvento` ("Link enviado · copiado/WhatsApp") | sim |
| cancela a aberta e renova a expirada pela folha | `PedidoMontadoPage.tsx:342-393` (as duas `FolhaDeConfirmacao`, `proposalRenewText`, `actions.renewLabel`); `useAcoesDoMontado › cancelar/renovar`, com o `prices_changed` | sim |
| a observação interna é editada | `PedidoMontadoPage.tsx:306-327, 394-410` (`FolhaDaObservacao` reusada) → `gravarObservacaoDoMontado` (`note`) | sim, fora da concluída (premissa 6) |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- **Toda function do app por uma porta com nome literal por ação; recusa só pelo `42501`; rede é falha.** Aplicada: `portaDePropostas.ts`, com um literal por ação e a tradução em `shared/api/traduzir.ts`. O guarda `escritaSoPelaPorta` usa `INVOCACAO_ACEITA` por porta.
- **Toda leitura do app por `lerComPapel`.** O detalhe passa por `lerComPapel` (`useMontados.ts:lerDetalhe`). A `list` vai pela porta: a recusa sai do 401/403 → `conferirPapel` (`42501`), o mesmo jeito das leituras da porta dos avisos (`usePushNoAparelho`). Não é leitura PostgREST, e `leituraSoComPapel` (régua 3) prova que a porta não tem `.from(`.
- **Tom memorial e `motion-reduce:` na mesma linha.** O tom tem guarda próprio (`tomMemorialDosMontados.test.ts`). O movimento entrou em `movimentoDosPedidos.test.ts`, com 5 arquivos novos e âncoras de 16 tokens e 14 pares. Os chips usam `transition-colors motion-reduce:transition-none` e a folha traz os pares de estado.
- **Prova de layout é de navegador.** Fica para a QA; nada aqui.
- **O gate inclui as suítes da loja e do painel.** Só execução.
- **Na troca de conta, a memória da tela some.** Aplicada: `useAcoesDoMontado` zera o link renovado e os avisos quando a conta muda, e prende o link à conta. Teste em `trocaDeContaLimpaCache.test.tsx` (chaves `atelie-montados` e `atelie-montado`, e o `tok-de-a` ausente do DOM).
- **Atualizar `apps/mobile-adm/CLAUDE.md`.** Aplicada: a seção "Pedidos montados (WI 94)", as linhas de rota e as linhas da tabela de guardas.

## Testes

- **Unidade (functions): `list` com as linhas resumidas, o teto e o `agora`.** Em `supabase/functions/order-proposals/__tests__/handlers.test.ts`. Morde: ordem por `position` com a entrada fora de ordem, teto de 4, `lines_count`, uma linha de outra proposta misturada, uma leitura só com `.in`, o `select` sem preço nem gravação, e 502 quando a leitura falha.
- **Página real: Montados por `?visao=montados`, o chip ao fim com a contagem, os cartões com a meta por estado.** Em `pages/__tests__/pedidosMontados.test.tsx`. Morde: o último chip, 7 chips, um único pressionado, as metas dos 5 estados escritas por extenso, "e mais 2", o `href`, e `order_list` não lido.
- **Página real: o link do `get`, "Sem telefone", copiar e WhatsApp com `log-sent` e o histórico, "Gerar link novo" chamando `renew`, sem `VITE_STORE_URL`.** Mesmo arquivo. Morde: o link exato, a mensagem exata, o `wa.me`, os corpos de `log-sent` e de `renew`, a ordem do histórico, o link novo e a frase `LINK_WITHOUT_STORE` via `vi.stubEnv`.
- **Página real: as ações por estado e a observação pela `note`.** Mesmo arquivo. Morde: os 4 estados, com presença e ausência de cada botão, a frase de `proposalRenewText` e o corpo da `note`.
- **Client real: conta sem papel em cada ação ⇒ a recusa; rede é falha.** Em `app/__tests__/montadosComClientReal.test.tsx`: `list` e `get` com a recusa e nenhum dado em instante nenhum (amostrado a cada 50 ms); as 4 escritas em 403 com a recusa, em 403 com o relógio de pé (falha) e sem rede (falha). Morde.
- **Guardas.** `escritaSoPelaPorta` (mapa por porta, com sensor do nome de uma porta na outra), `leituraSoComPapel` (régua 3 na porta nova), `semDadoSensivelDeClienteNoApp` (exceções por linha exata, com sensor na aba Clientes e noutro arquivo do pedido montado), `semDadoDeClienteNoAparelho` (pastas e página), `barraNoCaminho` (com o inverso `/clientes/montados/abc`), `rotasSobGuarda` (com mutação para fora do bloco), `abasSaoAsRotas` (três subrotas), tom e movimento. `enderecoDePedidosComDonoUnico` não foi alterado: a régua genérica (`[?&]visao=`) já alcança o endereço novo fora do dono. Os sensores mordem.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `list` com `lines` (teto 4), `lines_count`, `agora`; 502 se a leitura das peças falha | sim | Contrato da tarefa; `handlers.ts:571-612` | sim (o painel recebe campos aditivos e o 502 novo) |
| 2 | o detalhe por `lerComPapel`, com o `lido_em` como relógio | sim | Não faça (não alterar o `get`); `useMontados.ts:lerDetalhe` | sim |
| 3 | o selo usa `PROPOSAL_STATE_LABELS` de `core` | sim | defeito 01 (CLAUDE.md raiz) | sim |
| 4 | `traduzir` genérico em `shared/api`, mais `invocar` e `ErroDaProposta` | sim | Contrato ("VOCÊ MOVE"); `portaDeAvisos.ts` passou a importar | sim |
| 5 | "Gerar link novo" chama `renew` direto, sem folha | sim | D-14/D-28 ("sem token, Gerar link novo chama renew"); a folha usa `proposalRenewText`, frase da expirada | sim |
| 6 | a observação não é editável na concluída | sim | `handlers.ts:1098,1114` recusa a concluída com 409 (código anterior à tarefa). O AC e D-30 dizem "em qualquer estado", mas mudar a regra do servidor não cabia na tarefa | sim |
| 7 | guarda de tom próprio, acusando "pelos" só no plural | sim | `tomMemorialDosMontados.test.ts`, com sensores nos dois sentidos | sim |
| 8 | o movimento entra em `movimentoDosPedidos` | sim | `movimentoDosPedidos.test.ts`, âncoras 39/16/14 | sim |
| 9 | `useFolhaNaEntrada` em `shared/lib` | sim | `useFolhaNaEntrada.ts`; `useFolhaNoHistorico` está preso a `LinhaDaLista` | sim |
| 10 | título do documento literal | sim | `PedidoMontadoPage.tsx:142` | sim |
| 11 | faixas de estado em `ground-deep` | sim | não conferi `Selo.test.tsx` | sim |
| 12 | reusa `FolhaDaObservacao`, com `devolverFoco` exportado | sim | `order-actions/index.ts:44` | sim |
| 13 | o aviso é `role="status"` dentro da página | sim | `PedidoMontadoPage.tsx:177-182` | sim |
| 14 | documento e endereço no cartão Cliente; exceção por linha exata | sim | D-08 e D-16; `semDadoSensivelDeClienteNoApp` | sim |
| 15 | cartão da lista sem foto | sim | Design: "peças 'Nome · variação' juntas por ' · '" | sim |
| 16 | o chip diz só "Montados" com zero abertos | sim | `rotuloDoChip`; nenhum texto da tarefa exige o zero | sim |
| 17 | a aba Pedidos sempre lê a `list`; na visão Montados, a lista de pedidos não é lida | sim | `PedidosPage.tsx`; `useJanelaPaginada` já aceita `habilitada` | sim (o efeito em `acoesComClientReal` está na premissa 21) |
| 18 | `VITE_STORE_URL` fixada no `vitest.config` | sim | o mesmo padrão do CLAUDE.md raiz (Baselines › `import.meta.env`) | sim |
| 19 | `prices_changed` na mesma folha, com `expected_total` | sim | `handlers.ts:945` devolve `summary` | sim |
| 20 | o nome `gravarObservacaoDoMontado` | sim | não colide com o de `order-actions` | sim |
| 21 | `acoesComClientReal` exclui `/functions/v1/order-proposals` da conta | sim | a régua continua contando as outras functions (o aviso); a exclusão nomeia só a leitura do chip | sim |

## Não conferido

- `.specs/work-items/94-montar-pedido-no-app/tasks/05-montagem-casca-e-cliente.md` está untracked (a pasta `tasks/` inteira é `??`). Sem baseline, não há como provar o que a propagação mudou nem se ela tocou só afirmações tornadas falsas: isso depende da palavra do implementador. Os arquivos 06 a 10 não foram alterados, e não achei nenhuma afirmação neles que a tarefa tenha tornado falsa.
- `Selo.test.tsx` (a razão da premissa 11) não foi aberto.
- Os rótulos do histórico ("Pedido montado", "Link enviado · copiado") divergem dos do painel (`apps/backoffice/src/features/order-proposal/model/copy.ts:35-47`, "Criada", "link copiado"). O app segue o Design desta tarefa, e o painel está fora do recorte. Fica registrado, não é achado.
- O que só a execução prova: suítes passando (inclusive as da loja e do painel, cujos guardas varrem `apps/**`), lint e tipos.
- Instruções lidas: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `apps/mobile-adm/CLAUDE.md` › Rotas, › Pedidos (feature 74, as linhas 220-240), › A Loja ao vivo, › Pedidos montados (WI 94), › tabela de guardas (os trechos alterados); `supabase/CLAUDE.md` › índice de títulos e › `order-proposals` e o pedido que nasce de uma proposta. Não li › Migrations, › RLS, › Edge functions (o corpo) nem › Secrets: o diff não toca migration, RLS nem secret.

## T04 — wi-impl-task · done · agente a3a378bdc91dc1cc4

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/04-montados-e-pedido-montado-no-app.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada

## Fatias

nada

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

Tudo o que a tarefa alterou, na implementação e na correção. A correção só tirou "WI 94" e as chaves "D-nn" de comentários e de nomes de teste; o que ela tocou leva a marca "(correção)".

supabase/functions/order-proposals/handlers.ts alterado (correção)
supabase/functions/order-proposals/__tests__/handlers.test.ts alterado
apps/mobile-adm/.env.example alterado
apps/mobile-adm/CLAUDE.md alterado
apps/mobile-adm/vitest.config.ts alterado (correção)
apps/mobile-adm/src/app/App.tsx alterado (correção)
apps/mobile-adm/src/app/__tests__/acoesComClientReal.test.tsx alterado (correção)
apps/mobile-adm/src/app/__tests__/rotasSobGuarda.test.ts alterado (correção)
apps/mobile-adm/src/app/__tests__/trocaDeContaLimpaCache.test.tsx alterado (correção)
apps/mobile-adm/src/app/__tests__/montadosComClientReal.test.tsx criado (correção)
apps/mobile-adm/src/entities/order/index.ts alterado
apps/mobile-adm/src/entities/order/model/pedidosHref.ts alterado (correção)
apps/mobile-adm/src/entities/order/model/__tests__/pedidosHref.test.ts alterado
apps/mobile-adm/src/entities/order/api/useListaDePedidos.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado (correção)
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado (correção)
apps/mobile-adm/src/features/order-actions/index.ts alterado
apps/mobile-adm/src/features/order-slice/index.ts alterado
apps/mobile-adm/src/features/order-slice/ui/ChipsDeRecorte.tsx alterado (correção)
apps/mobile-adm/src/features/push-notifications/api/portaDeAvisos.ts alterado (correção)
apps/mobile-adm/src/features/order-proposal/index.ts criado
apps/mobile-adm/src/features/order-proposal/api/portaDePropostas.ts criado (correção)
apps/mobile-adm/src/features/order-proposal/api/__tests__/portaDePropostas.test.ts criado (correção)
apps/mobile-adm/src/features/order-proposal/model/tipos.ts criado (correção)
apps/mobile-adm/src/features/order-proposal/model/frases.ts criado (correção)
apps/mobile-adm/src/features/order-proposal/model/useMontados.ts criado (correção)
apps/mobile-adm/src/features/order-proposal/model/useAcoesDoMontado.ts criado (correção)
apps/mobile-adm/src/features/order-proposal/ui/SeloDoMontado.tsx criado
apps/mobile-adm/src/features/order-proposal/ui/CartaoDoLink.tsx criado (correção)
apps/mobile-adm/src/features/order-proposal/ui/FolhaDeConfirmacao.tsx criado
apps/mobile-adm/src/widgets/proposal-list/index.ts criado
apps/mobile-adm/src/widgets/proposal-list/ui/ListaDeMontados.tsx criado (correção)
apps/mobile-adm/src/pages/PedidosPage.tsx alterado (correção)
apps/mobile-adm/src/pages/PedidoMontadoPage.tsx criado (correção)
apps/mobile-adm/src/pages/__tests__/pedidosMontados.test.tsx criado (correção)
apps/mobile-adm/src/shared/api/traduzir.ts criado (correção)
apps/mobile-adm/src/shared/config/loja.ts criado (correção)
apps/mobile-adm/src/shared/lib/useFolhaNaEntrada.ts criado (correção)
apps/mobile-adm/src/shared/lib/__tests__/tomMemorialDosMontados.test.ts criado (correção)
apps/mobile-adm/src/shared/lib/__tests__/movimentoDosPedidos.test.ts alterado (correção)
apps/mobile-adm/src/shared/lib/__tests__/novaAbaAvisada.test.ts alterado (correção)
apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts alterado (correção)
apps/mobile-adm/src/shared/lib/__tests__/semDadoSensivelDeClienteNoApp.test.ts alterado (correção)
apps/mobile-adm/src/test/montados.ts criado (correção)
apps/mobile-adm/src/widgets/tab-bar/model/tabs.ts alterado (correção)
apps/mobile-adm/src/widgets/tab-bar/__tests__/abasSaoAsRotas.test.ts alterado (correção)
apps/mobile-adm/src/widgets/tab-bar/__tests__/barraNoCaminho.test.ts alterado (correção)
.specs/work-items/94-montar-pedido-no-app/tasks/05-montagem-casca-e-cliente.md alterado

## Verificação

- Busca pelas chaves de processo (`WI 94`, `D-nn`, `T0n`, `UC-`, `C-nn`) em todo `.ts`/`.tsx` que a tarefa tocou ou criou: nenhuma ocorrência sobrou.
- Os dois comentários que narravam a mudança agora explicam o código. Em `acoesComClientReal.test.tsx`, o comentário diz por que a leitura da `order-proposals` fica fora da conta. Em `rotasSobGuarda.test.ts`, a linha "e para CATORZE…" saiu.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (fonte: `CLAUDE.md` §Comandos): 0 erros.
- `npx eslint .` no mobile-adm (fonte: `CLAUDE.md` §Baselines): 0/0.
- Suíte do mobile-adm, `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` (fonte: `CLAUDE.md` §Baselines): 2481/156, exit 0.
- Arquivo de teste da function, `vitest run functions/order-proposals/__tests__/handlers.test.ts` (forma de `PROJECT.md`): 132 passaram, exit 0.
- As suítes da loja e do painel não foram rodadas de novo: a correção só mexeu em texto de comentário e em nomes de teste. Na implementação, as duas deram exit 0.
- Instruções lidas: as mesmas da implementação.

## Divergências e descobertas

- O `apps/mobile-adm/CLAUDE.md` continua citando "WI 94" na seção nova e na tabela dos guardas. É arquivo de instruções, não código nem teste, e o próprio arquivo já cita features por número. Por isso ficou fora do achado.
- Os comentários antigos que citam "feature `79`", "T17" e outros não foram tocados: já estavam no repositório antes desta tarefa.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; apps/mobile-adm/CLAUDE.md (inteiro); supabase/CLAUDE.md › Migrations, RLS — o molde que os guardas cobram, Edge functions, order-proposals e o pedido que nasce de uma proposta, Secrets; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - Unidade (functions), list com as peças resumidas, o teto e o agora: supabase/functions/order-proposals/__tests__/handlers.test.ts (+2)
  - Página real, "Montados" por ?visao=montados, chip ao fim com a contagem, cartões com a meta por estado: apps/mobile-adm/src/pages/__tests__/pedidosMontados.test.tsx (+ pedidosHref.test.ts)
  - Página real, cartão do link, "Sem telefone", copiar e WhatsApp chamando log-sent com o histórico, "Gerar link novo" chamando renew e mostrando o link novo, LINK_WITHOUT_STORE: pedidosMontados.test.tsx
  - Página real, ações por estado e observação salva por note: pedidosMontados.test.tsx
  - Client real, conta sem papel em cada ação ⇒ recusa e nenhum dado; rede é falha: apps/mobile-adm/src/app/__tests__/montadosComClientReal.test.tsx
  - Guardas: escritaSoPelaPorta, leituraSoComPapel, semDadoSensivelDeClienteNoApp (exceção literal com sensor, inclusive na aba Clientes), semDadoDeClienteNoAparelho, barraNoCaminho, rotasSobGuarda, abasSaoAsRotas, enderecoDePedidosComDonoUnico (verde sem alteração), tom (tomMemorialDosMontados.test.ts, novo) e movimento (movimentoDosPedidos.test.ts), mais trocaDeContaLimpaCache (+1)
  - Sem cobertura: a leitura nova da list contra o PostgREST local (só contra o dublê); layout em navegador (fica para a QA)
Verificações: tsc mobile-adm 0; eslint mobile-adm 0/0; suítes exit 0 — mobile-adm 2481/156 (remedida depois da correção), functions 1543/41 na implementação (o arquivo de teste da order-proposals, 132, remedido depois da correção), store 7091/378 e backoffice 5182/288 na implementação; a correção (só comentários e nomes de teste, sem nenhuma chave de processo restante) não as remediu
Árvore de trabalho: a function order-proposals (list), o app (feature order-proposal, widget proposal-list, PedidoMontadoPage, a visão Montados em PedidosPage/ChipsDeRecorte/pedidosHref, a rota e a barra de abas, shared/api/traduzir.ts, shared/config/loja.ts, shared/lib/useFolhaNaEntrada.ts), os guardas, o .env.example e o vitest.config do app, apps/mobile-adm/CLAUDE.md, e a tarefa 05; nada commitado
Citações conferidas: 9 abertas ao usar; deslocadas e relocalizadas pelo nome: handlers.ts COLUNAS_DA_LISTA (:145-157 → :154-166) e list (:526-557 → :539-575); nenhuma morta
Propagado: 05 — a linha "Depende de" passa a descrever o que a 04 entregou (porta e ações, INVOCACAO_ACEITA por porta, traduzir em shared/api/traduzir.ts, os guardas de tom e movimento, e a exceção de semDadoSensivel só do documento, por arquivo e texto, com a 05 acrescentando os arquivos dela)
```

## T05 — wi-impl-task · review · agente a6c79787eb78ead04

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/05-montagem-casca-e-cliente.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Pôr as três leituras de cliente da montagem (busca em `customer_list`, ficha por e-mail exato, endereços salvos em `addresses`) num arquivo só, `entities/customer/api/clientesDaMontagem.ts`, cada uma dentro de `lerComPapel`. Em `semDadoSensivelDeClienteNoApp`, a régua 1b passa a aceitar exatamente uma linha com termo restrito num arquivo de cliente: `.from('addresses')` nesse arquivo, com sensor. | Ler os endereços em `features/order-proposal/api` para não mexer na 1b. | O contrato da tarefa manda criar a leitura em `entities/customer/api/`. Um arquivo a mais importando o client é menos superfície que três. | Os guardas `leituraSoComPapel`, `escritaSoPelaPorta` (agora 11 importadores do client) e `semDadoSensivelDeClienteNoApp`. As tarefas 06 e 09 (ficha e endereço lido/gravado) consomem esses hooks e chaves. |
| 2 | Uma **entrada-sentinela** no histórico (`passoDaMontagem: 0`) abaixo do passo 1. O voltar no passo 1 cai nela, ainda na mesma tela: sem nada preenchido sai (`navigate(-1)`), com algo preenchido mostra "Sair sem criar o link?" (essa pergunta não ganha entrada própria no histórico). | `useBlocker`. | O app usa `BrowserRouter`, e `useBlocker` só existe com data router. Interceptar o gesto seria pior. | `usePassosDaMontagem`. As folhas das tarefas 06 e 07 precisam preservar `passoDaMontagem` no `state`; `useFolhaNaEntrada` já faz isso. Também a tarefa 10 (o "Sair" com rascunho). |
| 3 | Montagem aberta direto pelo endereço (sem estado): a entrada vira `/pedidos` por substituição e a montagem é empilhada por cima. F5 num passo do meio volta à sentinela e recomeça no passo 1, vazia. | Restaurar o estado. | D-16: nada fica no aparelho. Assim o "x" e o voltar sempre têm para onde ir. | Tarefa 10 (o rascunho mudará o que volta depois do F5). |
| 4 | O estado, o redutor, os motivos do bloqueio e as frases ficam no app (`features/order-proposal/model/montagem.ts` e `frasesDaMontagem.ts`). Nada vai para `core`. | Subir os motivos para `core`. | O contrato só lista consumo de `core`. Os motivos são do desenho do app; a regra de domínio que eles usam (e-mail, CEP) já é de `core`. | Se o painel (feature 89) escreve os mesmos motivos, passam a ser duas cópias. Tarefas 07 a 09 estendem `motivoDoPasso…` aqui. |
| 5 | Busca vazia lista as 25 primeiras por nome (`CUSTOMER_PAGE_SIZE`), sem paginação. A ficha por e-mail é consultada sem debounce, a cada e-mail válido. | Paginação; debounce no e-mail. | Menor superfície. Durante a consulta da ficha a barra não bloqueia por ela. | `clientesDaMontagem.ts`, `MontarPedidoPage.tsx`. |
| 6 | Rua, bairro, cidade e UF ficam `readOnly` enquanto o CEP não tem 8 dígitos ou o serviço não respondeu. Depois da resposta (achado ou não) ficam editáveis. | Travar para sempre quando o CEP é achado. | "Libera para digitar" pede a trava antes; editar depois do achado não é proibido. | `FormularioDeEndereco` (a tarefa 06 marca os campos lidos). |
| 7 | A entrega é derivada quando ainda não foi escolhida (`entrega: null`): cadastrada com ficha vai para o endereço padrão (`is_default`, senão o primeiro) ou para o link se não houver endereço salvo; a convidada vai para o link sem ler endereços; a cliente nova vai para "Informar o endereço agora". "Endereço salvo" só aparece com mais de um endereço. | Gravar o padrão no estado num efeito. | Não precisa de efeito e não cria corrida com a leitura. | `MontarPedidoPage.tsx`; a tarefa 09 lê `entrega`/`enderecoSalvoId`. |
| 8 | O aviso de "Usar a ficha dela" é um bloco `role="status"` na própria tela. Some na próxima escolha (segmento, cliente, entrega), não ao digitar. | Usar `AvisoDaAcao` (das ações do pedido). | Aquele aviso tem dono e prazo próprios da `75`. | `MontarPedidoPage.tsx`. |
| 9 | Duas extensões no guarda `semDadoDeClienteNoAparelho`. Régua 5: aceita `{ doApp: true, passoDaMontagem: <número ou nome> }` e mais nada. Régua 6: aceita `montarPedidoHref(` e o recuo `-<identificador>`. Com sensores nos dois sentidos. | Mover a navegação para fora das pastas que o guarda varre. | É o que D-08 pede, e esconder do guarda seria fugir dele. | O guarda; as tarefas 06, 07 e 10 navegam com a mesma forma. |
| 10 | No passo 4 não há "Continuar". Os passos 2 a 4 não têm motivo de bloqueio. | — | O botão "Criar link" e os bloqueios dos passos 2 a 4 são das tarefas 07, 08 e 09. | Tarefas 07, 08 e 09. |
| 11 | O "só navega até o passo alcançado" fica num lugar só, `irPara` do hook. Tirei a mesma condição do botão da página. | Manter as duas. | O check de mutação mostrou que a cópia da página escondia a do hook (ver Divergências). | `usePassosDaMontagem`. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | "Montar pedido" em Pedidos abre a montagem (tela cheia, passo 1, sem barra de abas, só o número do passo no `history.state`) | página real (app) | `src/pages/__tests__/montarPedido.test.tsx` | sim | ficou verde (não verificado — ver Divergências) |
| 2 | o indicador só navega até o passo alcançado | página real | idem | sim | vermelho (depois de tirar a condição duplicada da página; antes ficou verde) |
| 3 | o motivo do bloqueio aparece escrito na barra (e em `aria-describedby`) | página real | idem | sim | vermelho (motivo de e-mail com ficha removido ⇒ caso do e-mail com ficha falhou) |
| 4 | o voltar recua um passo; no passo 1, com algo, pede confirmação; sem nada, sai; o "x" pergunta ou fecha direto; o voltar fecha a folha | página real | idem | sim | vermelho (a sentinela saindo sempre ⇒ caso da confirmação falhou) |
| 5 | cadastrada: busca por nome, e-mail e dígitos do telefone; vazia lista todas; sem resultado mostra a frase | página real | idem | sim | vermelho (filtro `or` da busca removido) |
| 6 | cadastrada: entrega no padrão, outro salvo, outro endereço (com "Salvar no cadastro"), "A cliente preenche no link"; convidada e ficha sem endereço vão para o link | página real | idem | sim | vermelho (convidada derivada para "padrão") |
| 7 | nova: máscaras do WhatsApp e do documento; motivos em ordem; e-mail com ficha com "Usar a ficha dela" (com e sem CEP) e "Corrigir o e-mail"; CEP conhecido preenche; CEP não achado ou serviço fora libera; endereço incompleto bloqueia; trocar o segmento limpa | página real | idem | sim | vermelho no e-mail com ficha; o resto ficou verde sem check (ver Divergências) |
| 8 | conta sem papel na busca e nos endereços ⇒ a recusa e nenhum dado da cliente; rede caída é falha | client real (app) | `src/app/__tests__/montagemComClientReal.test.tsx` | sim | vermelho (a leitura dos endereços sem `lerComPapel` ⇒ caso dos endereços falhou) |
| 9 | guardas: `leituraSoComPapel`, `semDadoDeClienteNoAparelho` (régua 5 com o marcador; sem storage), `rotasSobGuarda`, `barraNoCaminho`, tom, movimento, `semDadoSensivelDeClienteNoApp`, `abasSaoAsRotas`, `escritaSoPelaPorta` | guarda | os arquivos listados em Arquivos alterados | sim | sensores novos em cada régua ampliada (acusa e não acusa) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/CLAUDE.md alterado
apps/mobile-adm/src/app/App.tsx alterado
apps/mobile-adm/src/app/__tests__/rotasSobGuarda.test.ts alterado
apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx criado
apps/mobile-adm/src/entities/customer/index.ts alterado
apps/mobile-adm/src/entities/customer/model/linha.ts alterado
apps/mobile-adm/src/entities/customer/api/clientesDaMontagem.ts criado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado
apps/mobile-adm/src/entities/order/index.ts alterado
apps/mobile-adm/src/entities/order/model/pedidosHref.ts alterado
apps/mobile-adm/src/features/order-proposal/index.ts alterado
apps/mobile-adm/src/features/order-proposal/model/montagem.ts criado
apps/mobile-adm/src/features/order-proposal/model/frasesDaMontagem.ts criado
apps/mobile-adm/src/features/order-proposal/model/usePassosDaMontagem.ts criado
apps/mobile-adm/src/features/order-proposal/ui/CampoDaMontagem.tsx criado
apps/mobile-adm/src/features/order-proposal/ui/FormularioDeEndereco.tsx criado
apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx criado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx criado
apps/mobile-adm/src/pages/PedidosPage.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.test.tsx criado
apps/mobile-adm/src/shared/lib/__tests__/movimentoDosPedidos.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoSensivelDeClienteNoApp.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/tomMemorialDosMontados.test.ts alterado
apps/mobile-adm/src/widgets/tab-bar/__tests__/abasSaoAsRotas.test.ts alterado
apps/mobile-adm/src/widgets/tab-bar/__tests__/barraNoCaminho.test.ts alterado
apps/mobile-adm/src/widgets/tab-bar/model/tabs.ts alterado

## Verificação

- Tipos: `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (fonte: CLAUDE.md §Comandos). Exit 0, 0 erros. Contra o baseline: não veio `baseline` e não rodei uma medição antes da primeira fatia; comparei com o "Tipos 0" da tabela de baselines do CLAUDE.md. Nenhum erro novo. `packages/core` não foi tocado.
- Um arquivo de teste: `pnpm --filter @estrelinha/mobile-adm exec vitest run <arquivo> --testTimeout=20000` (fonte: PROJECT.md §Comandos de verificação). `montarPedido.test.tsx` 22/22; `montagemComClientReal.test.tsx` 5/5; os guardas alterados, rodados juntos, verdes.
- Verificação mínima, suíte de cada workspace com exit fora de pipe (fonte: CLAUDE.md §Baselines; o app muda, então loja e painel entram):
  - `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000`: exit 0, 2521/158.
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: exit 0, 7091/378.
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: exit 0, 5182/288.
- Lint: `npx eslint .` em `apps/mobile-adm` (fonte: CLAUDE.md §Baselines). 0 erros e 0 avisos, igual ao baseline 0/0. Na primeira rodada saíram 5 avisos `react-refresh/only-export-components`; corrigi tirando as frases dos componentes para `model/frasesDaMontagem.ts`.
- Nenhum timeout.

Instruções lidas: `CLAUDE.md` (raiz) › Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy (lido da cópia carregada no contexto da sessão); `apps/mobile-adm/CLAUDE.md` inteiro; `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, Pureza, Os módulos, Dinheiro, customers, proposals, Convenções de tipo; `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- **Ordem do ciclo TDD.** A maior parte da implementação foi escrita antes dos testes de página, não fatia a fatia com o vermelho primeiro. Compensei com seis checks de mutação com restauração por cópia, conferida por `cmp` byte a byte. Cinco morderam de primeira. Um **ficou verde**: tirar `n > alcancado` do hook não derrubava nada, porque a página repetia a mesma condição no clique. Removi a cópia da página (decisão 11); de novo mutado, o teste do indicador falhou.
- Fatias de página que passaram sem nenhuma mutação: a abertura por "Montar pedido", o preenchimento pelo CEP (achado e não achado), as máscaras e a troca de segmento. Os testes são jsdom sem infraestrutura; a revisão deve ler essas asserções sabendo que ninguém viu o vermelho delas.
- `montagemComClientReal`, caso "conta sem papel na busca": ele roda sobre o arnês do client real (jsdom, sem rede de verdade). Mutei só o caso irmão dos endereços, que falhou; o da busca passou sem check.
- A tarefa diz `[packages/core]` no título, mas nada em `core` precisou mudar: tudo o que o contrato nomeia já existia e foi só consumido. `payment/**` intocado.
- Não abri `spec.md` nem `prd.md` da costura, apesar do "Trecho da costura" da tarefa: a regra 5 deste processo proíbe. O desenho saiu só do bloco Design da tarefa.
- As colunas novas (`COLUNAS_DA_MONTAGEM`, `COLUNAS_DO_ENDERECO_SALVO`) foram conferidas contra `information_schema.columns` no banco local (porta 54442), em vez de afirmadas.
- Na primeira rodada da suíte do app, `useFolhaNoHistorico.test.tsx` (`fechar() consome a entrada da folha`) falhou uma vez. Passou isolado e nas duas rodadas completas seguintes. Arquivo de outra feature, não tocado: tratei como instabilidade.
- Ficaram sem execução e são da QA em navegador: alvo de 44 px, ausência de rolagem lateral, a barra fixa sobre o conteúdo em 390, e o gesto real de voltar do Android.
- Não propaguei nada: nenhuma afirmação das tarefas 06 a 10 ficou falsa. Nota útil para a 06 e a 07: as folhas da montagem devem usar `useFolhaNaEntrada`, que preserva `passoDaMontagem` no `state`.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 05
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy; apps/mobile-adm/CLAUDE.md (inteiro); packages/core/CLAUDE.md › Quando um código pertence, Pureza, Os módulos, Dinheiro, customers, proposals, Convenções de tipo; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: a abertura por "Montar pedido", o indicador até o passo alcançado e o motivo na barra — src/pages/__tests__/montarPedido.test.tsx; o voltar do Android (recua um passo, confirmação no passo 1, sem nada sai direto, o "x" pergunta ou fecha, o voltar fecha a folha, a montagem aberta direto) — idem; cliente cadastrada (busca por nome, e-mail e dígitos; vazia lista todas; sem resultado; padrão; outro salvo; outro endereço com "Salvar no cadastro"; link; convidada e ficha sem endereço) — idem; cliente nova (máscaras, motivos em ordem, e-mail com ficha com Usar/Corrigir, Usar a ficha com e sem CEP, CEP conhecido, CEP não achado e serviço fora, endereço incompleto, troca de segmento) — idem; conta sem papel na busca e nos endereços ⇒ recusa e nenhum dado, rede caída ⇒ falha — src/app/__tests__/montagemComClientReal.test.tsx; guardas — leituraSoComPapel, escritaSoPelaPorta, semDadoDeClienteNoAparelho (régua 5 com o marcador, régua 6 com montarPedidoHref e o recuo, sensores), semDadoSensivelDeClienteNoApp (duas exceções exatas, 1b, colunas, sensores), rotasSobGuarda, abasSaoAsRotas, barraNoCaminho, tomMemorialDosMontados, movimentoDosPedidos. Sem cobertura: layout (44 px, rolagem lateral), que é da QA em navegador.
Verificações: tsc do mobile-adm 0 erros; eslint do mobile-adm 0/0; suítes com exit 0 — mobile-adm 2521/158, store 7091/378, backoffice 5182/288; 6 checks de mutação, todos mortos ao fim (1 ficou verde no início e foi corrigido)
Árvore de trabalho: 10 arquivos criados e 18 alterados em apps/mobile-adm (lista em Arquivos alterados); nada commitado
Citações conferidas: 5 abertas no uso (recovery/model/passos.ts, order-actions/model/useFolhaNoHistorico.ts, entities/customer/api/useCliente.ts + shared/api/lerComPapel.ts, backoffice useCustomerSearch.ts › lerClientePorEmail — na linha citada, core/customers/search.ts › APP_CUSTOMER_SEARCH/buildAppCustomerSearch/limparTermoColado — na linha citada; useCepLookup, validadores e a 04 conferidos); nenhuma deslocada, nenhuma morta
```

## T05 — wi-impl-review · fixing · agente a2aadea3199b4382d

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/05-montagem-casca-e-cliente.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | identificador de processo | atrapalha | apps/mobile-adm/src/pages/MontarPedidoPage.tsx:35 (`(WI 94, \`MON-12\`, D-12, D-16, D-21)`), :45; features/order-proposal/model/usePassosDaMontagem.ts:9; model/montagem.ts:6, :8, :122; model/frasesDaMontagem.ts:4; ui/PassoDaCliente.tsx:25, :32; ui/FormularioDeEndereco.tsx:10, :16; ui/CampoDaMontagem.tsx (cabeçalho); entities/customer/api/clientesDaMontagem.ts:12, :18, :22, :91; entities/customer/model/linha.ts (os dois blocos novos); entities/order/model/pedidosHref.ts (bloco de `montarPedidoHref`); app/App.tsx (linha nova da rota); pages/PedidosPage.tsx (linha nova do comentário); e os comentários novos dos guardas (`semDadoDeClienteNoAparelho`, `semDadoSensivelDeClienteNoApp`, `leituraSoComPapel`, `escritaSoPelaPorta`, `movimentoDosPedidos`, `tomMemorialDosMontados`) | A chave do Work Item (`WI 94`), as decisões da spec (`D-02`, `D-08`, `D-12`, `D-13`, `D-16`, `D-21`, `D-26`) e os UC (`MON-02/03/12`) foram escritos em comentários do código e dos testes, em 35 linhas novas. O identificador não existia no código antes desta tarefa: no HEAD, `git grep "WI 94"` em `apps/` e `packages/` só acha arquivos `CLAUDE.md`/`.env.example`. A tarefa 04, do mesmo WI e já commitada (`e2b18e88`), escreveu o código de `features/order-proposal` sem nenhum desses identificadores. | regra do workflow: identificador de processo não entra no código |
| 2 | teste que não morde | atrapalha | apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts:145 | A régua 5 aceita como valor do marcador **qualquer** identificador em minúscula (`[a-z][A-Za-z0-9]*`). Assim, `{ doApp: true, passoDaMontagem: email }` e `{ doApp: true, passoDaMontagem: nome }` passam. É exatamente o dado de cliente no `history.state` que a régua existe para recusar. O sensor da linha 243 só prova a forma com ponto (`c.email`). O código usa só o literal `0` e a variável `n` (`usePassosDaMontagem.ts:59`), então dá para estreitar a régua sem reprovar o código. | Tarefa, D-08: "o marcador de passo no `history.state` passa a ser aceito pela régua 5 dele (hoje só `{ doApp: true }`), sem dado de cliente." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a montagem abre de Pedidos, com os 4 passos e o voltar do Android | `PedidosPage.tsx` (Link com `passoDaMontagem: 0`), `App.tsx` (rota irmã auto-fechada dentro do `RequireAdmin`), `usePassosDaMontagem.ts` (sentinela, recuo por passo, aberta direto, F5), `MontarPedidoPage.tsx` (casca, indicador, barra com motivo, folha de sair por `useFolhaNaEntrada`) | sim |
| o passo 1 escolhe cadastrada ou cadastra nova, com a entrega e o endereço obrigatório quando informado | `PassoDaCliente.tsx`, `FormularioDeEndereco.tsx`, `montagem.ts` (`motivoDoPassoCliente`, `enderecoCompleto` exige CEP, rua, número, bairro, cidade e UF), `clientesDaMontagem.ts` (busca, ficha por e-mail, endereços, os três em `lerComPapel`) | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `pages/__tests__/montarPedido.test.tsx`, `app/__tests__/montagemComClientReal.test.tsx` e os guardas | sim (ver Testes) |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório | — | só execução |

## Obrigações

- **Toda function por uma porta com nome literal; recusa só pelo `42501`; rede é falha.** Nenhuma function nova. As leituras ficam em `lerComPapel`, e a recusa vem de `useRecusaDePapel` (`MontarPedidoPage.tsx:64-67`). O client real prova a recusa por `42501` e a rede caída como falha (`montagemComClientReal.test.tsx:70-104`). Aplicada.
- **Toda leitura por `lerComPapel`.** As três leituras de `clientesDaMontagem.ts:329-365`. O arquivo entrou em `HOOKS_DE_CLIENTE`/`IMPORTAM_O_CLIENT` (`leituraSoComPapel`) e em `escritaSoPelaPorta`. Aplicada.
- **Tom memorial e `motion-reduce:`.** `MontarPedidoPage` entra em `tomMemorialDosMontados`; os quatro arquivos de UI entram em `movimentoDosPedidos` (âncora 43). Nenhum literal com `!` nem animação nova. Aplicada.
- **Layout se prova na QA.** Declarado no `CLAUDE.md` do módulo. Aplicada.
- **O gate inclui as suítes da loja e do painel.** Só execução.
- **Atualizar `apps/mobile-adm/CLAUDE.md`.** Seção "Montar pedido (WI 94)", linha da rota e linhas da tabela de guardas (`barraNoCaminho`, `escritaSoPelaPorta`, `tomMemorialDosMontados`, `montagemComClientReal`). Aplicada.

## Testes

- **"Montar pedido" abre a montagem; o indicador só navega até o passo alcançado; o motivo aparece na barra.** `montarPedido.test.tsx:130-176`. A asserção morde: confere `aria-disabled`, que o clique no passo 2/4 não alcançado deixa a tela no lugar, e o `aria-describedby` do motivo.
- **O voltar recua um passo, fecha a folha e, no passo 1, pede confirmação; o fechar pergunta só com algo preenchido.** `montarPedido.test.tsx:180-249`. Morde: confere o passo exibido depois de cada `history.back()`, a folha que some com o voltar voltando ao passo 2, "Sair" levando a `/pedidos` e a saída direta sem nada preenchido.
- **Cliente cadastrada: busca por nome, e-mail e dígitos do telefone; padrão; outro salvo; outro endereço; a cliente preenche no link.** `montarPedido.test.tsx:253-333`. Morde: o dublê filtra pelo `.or` real. Também cobre o endereço em linha, o radio "Trabalho" marcado, o motivo de endereço incompleto e a convidada sem leitura de `addresses` (contagem de cadeias).
- **Cliente nova: máscara; e-mail com ficha; CEP conhecido; CEP não achado; endereço incompleto bloqueia.** `montarPedido.test.tsx:342-447`. Morde: valores mascarados exatos, a frase da ficha por extenso, o `readonly` antes e depois e os dois casos de CEP (`{erro:true}` e o `fetch` que lança).
- **Client real: conta sem papel na busca e nos endereços.** `montagemComClientReal.test.tsx:61-133`. Morde: há o par com 200 que prova o alvo, a varredura de "nenhum texto dela" em ~80 instantes e o caso da rede caída.
- **Guardas.** `leituraSoComPapel` e `escritaSoPelaPorta` (entradas literais, contagem 11); `rotasSobGuarda` (a rota dentro do bloco, com o mutante que a move para fora); `barraNoCaminho` (com e sem a barra final); `abasSaoAsRotas` (subrota nova); `semDadoSensivelDeClienteNoApp` (as duas exceções por arquivo e texto, com sensor nos dois sentidos); tom e movimento (escopo literal). `semDadoDeClienteNoAparelho` cobre a régua 5 e a 6, mas a régua 5 não morde a forma `passoDaMontagem: <identificador de dado>` (achado 2).

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | As três leituras num arquivo só, em `entities/customer/api/clientesDaMontagem.ts`; a régua 1b aceita uma linha com `.from('addresses')` | sim | O Contrato manda criar a leitura em `entities/customer/api/` dentro de `lerComPapel`. O molde do painel (`useCustomerSearch.ts:96-110`) é o mesmo. A exceção é por arquivo e texto exatos, com sensor | sim |
| 2 | Entrada-sentinela `passoDaMontagem: 0`, sem `useBlocker` | sim | `useFolhaNaEntrada` preserva o `state` (`useFolhaNaEntrada.ts:39-40`), então a folha mantém o passo. O `CLAUDE.md` do módulo diz que "nada é interceptado" | sim |
| 3 | Aberta direto vira `/pedidos` + montagem por cima; F5 recomeça no passo 1 | sim | D-16 ("nada fica no aparelho") | sim (a tarefa 10 está listada) |
| 4 | Estado, redutor, motivos e frases no app, nada em `core` | sim | O painel tem uma regra própria, com outras frases e outros critérios (`backoffice/.../draft.ts:209-235`, `createLinkRefusal`), e nunca a levou a `core`. Não há regra idêntica com dois leitores. O Contrato só lista consumo de `core` | sim |
| 5 | Busca vazia lista as 25 primeiras; ficha por e-mail sem debounce, sem bloquear enquanto consulta | sim | A janela em que se avança antes da ficha chegar fecha na tarefa 09 ("No passo 4 vale a soma dos bloqueios dos outros passos"), e a consulta da ficha segue ativa em qualquer passo | sim |
| 6 | Rua, bairro, cidade e UF `readOnly` até o CEP responder; editáveis depois | sim | `useCepLookup` sempre devolve `manual: true` na falha (`core/hooks/useCepLookup.ts:43-56`). O Design pede "libera para digitar" | sim |
| 7 | Entrega derivada quando `null`; "Endereço salvo" só com mais de um endereço | sim | Design: "padrão ao escolher, ou 'A cliente preenche' sem endereço salvo" | sim |
| 8 | Aviso de "Usar a ficha" como bloco `role="status"`, não `AvisoDaAcao` | sim | Nada no arquivo de instruções o contradiz | sim |
| 9 | Régua 5 aceita `{ doApp: true, passoDaMontagem: <número ou nome> }`; régua 6 aceita `montarPedidoHref(` e `-<identificador>` | em parte | A forma de aceitar está certa (D-08). "Nome" é largo demais: aceita um identificador de dado da cliente (achado 2) | sim |
| 10 | Passo 4 sem "Continuar"; passos 2 a 4 sem motivo | sim | "Não faça": "Não implemente os passos 2, 3 e 4 … além do esqueleto da casca" | sim |
| 11 | "Só navega até o alcançado" num lugar só (`irPara`) | sim | `usePassosDaMontagem.ts:102-113`. O botão da página só chama `irPara` | sim |

## Não conferido

- Nada foi executado: testes, `tsc`, lint e as suítes da loja e do painel ficaram de fora (são `só execução`).
- Layout em navegador (alvo de 44 px, rolagem lateral, barra fixa) ficou para a QA, por instrução da tarefa.
- Um caso de borda visto na leitura e não provado: com a tela já na sentinela e a pergunta aberta, o "x" ainda está na tela. Tocá-lo empilharia a segunda folha (`folhaDeSair`) junto da `folhaDaSentinela`. Precisa de navegador para dizer se há defeito.
- "Usar a ficha dela", sem CEP, de uma convidada ou de uma ficha sem endereço salvo: a entrega vem em "A cliente preenche no link", mas o aviso diz "A entrega veio no endereço padrão dela." O Design só prescreve essa frase para o caso "sem CEP". Não registrei como achado.
- Os arquivos de `alterados` aparecem como `M`/`A` no índice (intent-to-add aplicado). O diff alcança todos, e nenhum precisou de julgamento sem baseline.
- Instruções lidas: `CLAUDE.md` (raiz, no contexto) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `apps/mobile-adm/CLAUDE.md` › A árvore, › Clientes, › Montar pedido (WI 94), › Identidade, › Navegação, › Os guardas do app (trechos do diff), › Testes; `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › customers, › proposals (índice de títulos para o resto).

## T05 — wi-impl-task · done · agente a6c79787eb78ead04

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/05-montagem-casca-e-cliente.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 9 | A régua 5 de `semDadoDeClienteNoAparelho` passa a aceitar só `{ doApp: true }` e `{ doApp: true, passoDaMontagem: <um dígito ou o identificador n> }`. Um dígito porque a montagem tem passos de 0 a 4; `n` porque é o parâmetro do construtor dos passos em `usePassosDaMontagem`. A régua 6 ficou como estava (`montarPedidoHref(` e o recuo `-<identificador>`). | Aceitar qualquer identificador em minúscula, que era o que estava na implementação. | Era o furo do achado 2: aceitava `passoDaMontagem: email`. | O guarda. As tarefas 06, 07 e 10 têm de navegar com esta mesma forma: o literal ou a variável `n`. Qualquer outro nome passa a ser acusado. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 9 | guarda `semDadoDeClienteNoAparelho`: o marcador do passo sem dado de cliente | guarda | `src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts` | sim (42/42) | vermelho: com a régua larga de volta, os 4 sensores novos (`email`, `nome`, `telefone`, `12`) falharam; restaurei pela cópia e o `cmp` confirmou byte a byte |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

Achado 1 — tirei a chave do Work Item, as decisões D-xx e os MON-xx dos comentários que esta tarefa tinha escrito:
apps/mobile-adm/src/app/App.tsx alterado
apps/mobile-adm/src/entities/customer/api/clientesDaMontagem.ts criado
apps/mobile-adm/src/entities/customer/model/linha.ts alterado
apps/mobile-adm/src/entities/order/model/pedidosHref.ts alterado
apps/mobile-adm/src/features/order-proposal/model/frasesDaMontagem.ts criado
apps/mobile-adm/src/features/order-proposal/model/montagem.ts criado
apps/mobile-adm/src/features/order-proposal/model/usePassosDaMontagem.ts criado
apps/mobile-adm/src/features/order-proposal/ui/CampoDaMontagem.tsx criado
apps/mobile-adm/src/features/order-proposal/ui/FormularioDeEndereco.tsx criado
apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx criado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx criado
apps/mobile-adm/src/pages/PedidosPage.tsx alterado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/movimentoDosPedidos.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoSensivelDeClienteNoApp.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/tomMemorialDosMontados.test.ts alterado

Achados 1 e 2:
apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts alterado

## Verificação

- Tipos: `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (fonte: CLAUDE.md §Comandos). Exit 0, 0 erros; o baseline também é 0.
- Lint: `npx eslint .` em `apps/mobile-adm` (fonte: CLAUDE.md §Baselines). 0 erros, 0 avisos.
- Um arquivo de teste: `pnpm --filter @estrelinha/mobile-adm exec vitest run src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts --testTimeout=20000` (fonte: PROJECT.md). 42/42.
- Suítes completas (fonte: CLAUDE.md §Baselines), todas com exit 0:
  - mobile-adm: 2525/158
  - store: 7091
  - backoffice: 5182
- `grep` por `WI 94`, `D-nn` e `MON-nn` em `apps/mobile-adm/src`, nos arquivos alterados e nos criados: nenhuma ocorrência. Os que ainda aparecem no repositório são de antes e estão em `packages/core` e `docs/`, fora desta tarefa.

## Divergências e descobertas

- Achado 1: tirei os identificadores só das linhas que esta tarefa escreveu. O diff contra o HEAD mostra que nenhuma linha anterior foi alterada. Os comentários continuam explicando o código, sem a referência ao processo.
- O `apps/mobile-adm/CLAUDE.md` continua citando WI 94 e D-xx. Deixei como está: é documentação e não entra na regra do código, e a tarefa 04 fez o mesmo.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 05
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy; apps/mobile-adm/CLAUDE.md (inteiro); packages/core/CLAUDE.md › Quando um código pertence, Pureza, Os módulos, Dinheiro, customers, proposals, Convenções de tipo; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: a abertura por "Montar pedido", o indicador até o passo alcançado e o motivo na barra — src/pages/__tests__/montarPedido.test.tsx; o voltar do Android (recua um passo, confirmação no passo 1, sem nada sai direto, o "x" pergunta ou fecha, o voltar fecha a folha, a montagem aberta direto) — idem; cliente cadastrada (busca por nome, e-mail e dígitos do telefone; vazia lista todas; sem resultado; endereço padrão; outro salvo; outro endereço com "Salvar no cadastro"; a cliente preenche no link; convidada e ficha sem endereço) — idem; cliente nova (máscaras, motivos em ordem, e-mail com ficha com "Usar a ficha dela"/"Corrigir o e-mail", "Usar a ficha dela" com e sem CEP, CEP conhecido, CEP não achado e serviço fora do ar, endereço incompleto, troca de segmento) — idem; conta sem papel na busca e nos endereços ⇒ a recusa e nenhum dado dela, rede caída ⇒ falha — src/app/__tests__/montagemComClientReal.test.tsx; guardas — leituraSoComPapel, escritaSoPelaPorta, semDadoDeClienteNoAparelho (régua 5 só com um dígito ou `n` no marcador, régua 6 com montarPedidoHref e o recuo, sensores), semDadoSensivelDeClienteNoApp (duas exceções exatas, régua 1b, colunas, sensores), rotasSobGuarda, abasSaoAsRotas, barraNoCaminho, tomMemorialDosMontados, movimentoDosPedidos. Sem cobertura: layout (alvo de 44 px, rolagem lateral), que é da QA em navegador.
Verificações: tsc do mobile-adm 0 erros; eslint do mobile-adm 0/0; suítes com exit 0 — mobile-adm 2525/158, store 7091, backoffice 5182; 7 checks de mutação, todos mortos no fim (1 ficou verde na implementação e foi corrigido; 1 na régua estreitada pela correção)
Árvore de trabalho: 10 arquivos criados e 18 alterados em apps/mobile-adm, da implementação e da correção (lista em Arquivos alterados do relatório da implementação); nada commitado
Citações conferidas: 5 abertas no uso; nenhuma deslocada, nenhuma morta
```

## T06 — wi-impl-task · review · agente a4ce637c62d1d5f55

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/06-folha-colar-texto.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A folha usa `shared/lib/useFolhaNaEntrada('colar-texto')`. | Imitar `useFolhaNoHistorico`, como a tarefa sugere. | A montagem e o pedido montado já usam `useFolhaNaEntrada`, que é o mesmo mecanismo sem a regra do pedido. É o padrão do repositório. | nenhum |
| 2 | Mapa dos desfechos sem campos: 422 (`refusal`/`truncated`/`invalid`) e `found` 0 dão a frase "Não encontrei…". 503, 502, outros 4xx com slug (400/413), 5xx e rede dão "fora do ar". 429 tem frase própria. Todo desfecho de erro troca "Cancelar" por "Preencher à mão". | Uma frase nova para o 422. Manter "Cancelar" nos erros que não são "sem dados". | O 422 não preencheu nada, como o texto sem dados. O desenho diz "depois de erro, Preencher à mão". | `useLeituraDoTexto.ts` (`fraseDoErro`) |
| 3 | A frase do 429: "Foram muitas leituras em pouco tempo. Espere alguns minutos para ler de novo, ou preencha à mão — nada do que você já fez se perde." | — | D-11 pede frase própria no tom do app, com a montagem seguindo igual. | `frasesDaMontagem.ts` (`LEITURAS_DEMAIS`) |
| 4 | A leitura preenche só os campos que achou. O que ela não achou fica como estava. | Limpar os campos não achados. | Não apagar o que a Adri já digitou. O "Desfazer" volta exatamente ao estado de antes. | `montagem.ts` (`aplicarLeitura`) |
| 5 | Marcas: uma segunda leitura soma marcas às da primeira. Editar um campo tira a marca dele. O serviço de CEP completando um campo (ação `endereco` com `origem: 'cep'`) não tira a marca. | Reiniciar as marcas a cada leitura. Tratar o CEP completando como edição. | O efeito do formulário redispara depois da leitura e apagaria as marcas que acabaram de entrar. | `montagem.ts`, `FormularioDeEndereco` (prop nova `aoCompletarPeloCep`), `PassoDaCliente` |
| 6 | Só o campo CEP diz "Lido do texto — conferido no serviço de CEP." quando o serviço conferiu. Os outros campos preenchidos dizem "Lido do texto — confira.", inclusive os que vieram do serviço. | Uma marca específica para rua, bairro, cidade e UF vindos do CEP. | É a leitura literal do desenho ("CEP: …"). | `PassoDaCliente` (`marcaDe`) |
| 7 | "O CEP conferiu …" nomeia rua, bairro e cidade, e omite a UF. | Listar a UF também. | O exemplo da tarefa diz "rua, bairro e cidade" com a UF conferida. | `frasesDaMontagem.ts` (`resumoDaLeitura`) |
| 8 | N em "Preenchi N de M" é o número de campos preenchidos depois do CEP. M é 11 (contato e endereço) ou 7 (só endereço). | Copiar o "7 de 11" do exemplo. | O exemplo é incoerente: com 3 campos faltando, sobram 8 de 11. | `resumoDaLeitura` |
| 9 | O efeito de CEP do `FormularioDeEndereco` passou a juntar por `mergeCep`: campo vazio na resposta do serviço não apaga o que já está escrito. | Manter a sobrescrita crua da tarefa 05. | Sem isso, um CEP de cidade (sem rua) apagaria a rua lida do texto logo depois da leitura. Fica uma regra só para as duas junções. | Formulário de endereço da montagem: também muda o caso digitado à mão (CEP de cidade deixa de limpar a rua digitada) |
| 10 | Escolher ou trocar de cliente, e sair de "Outro endereço" (`entrega` ≠ `outro`), descartam a leitura, as marcas e o snapshot do Desfazer. "Usar a ficha dela" converte a leitura para só endereço (as marcas de contato saem); sem CEP completo, descarta tudo. | Manter o aviso apontando para campos que não estão na tela. | O aviso falaria de campos invisíveis. | `montagem.ts` |
| 11 | As linhas "Leitura desfeita." e "Os campos voltaram ao que estava antes." saem no bloco `role="status"` que a página já tem. | Criar um sistema de toast. | O app não tem toast na montagem, e a regra 6 proíbe ampliar escopo. | `MontarPedidoPage` |
| 12 | A porta passa a resposta de novo por `parseCustomerText` e recalcula `encontrados`. | Confiar na forma crua da resposta. | O contrato é "campos ou erro traduzido": a tela nunca recebe um campo fora da forma. | `portaDeLeitura.ts` |
| 13 | "Lendo o texto…" cobre também a espera do serviço de CEP. O hook usa o mesmo `useCepLookup` (mesma chave de cache do formulário) e junta por `mergeCep` antes de fechar a folha. "Cancelar" não fecha durante a leitura. | Fechar a folha antes de conferir o CEP. | O aviso precisa saber o que o CEP conferiu. | `useLeituraDoTexto.ts`, `FolhaColarTexto.tsx` |
| 14 | O título do cartão escuro usa `font-display text-lg text-estrelinha-on-primary`. | O rótulo `ink-soft` em caixa alta dos cartões claros. | Sobre o fundo `ink`, o `ink-soft` fica sem contraste. | `PassoDaCliente` (`Cartao`) |
| 15 | Duas exceções novas em `semDadoSensivelDeClienteNoApp`, por arquivo e texto exatos: a linha de `montagem.ts` que leva o documento lido ao campo, e `documento: 'CPF',` em `frasesDaMontagem.ts`. | Contornar o termo no código. | Segue o precedente D-16 da montagem. Contornar o termo seria esconder o dado do guarda, não removê-lo. | Guarda `semDadoSensivelDeClienteNoApp` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Cliente nova lê contato e endereço (porta no modo `contact_and_address`); "Lendo o texto…" desligado; o sucesso fecha a folha e marca os campos | página real | `pages/__tests__/montarPedido.colarTexto.test.tsx` › "lê pela porta no escopo…" | sim | vermelho (retirado o `lendo` do `disabled` da folha; retirada a junção do CEP) |
| 2 | A folha: título do escopo, "O texto não fica guardado.", contador, "Ler o texto" desligado com texto vazio, corte em 2.000 | página real | idem › "a folha tem o título…" e "o texto é cortado em 2.000…" | sim | não feito (o comportamento é do próprio componente novo) |
| 3 | O aviso conta os campos e nomeia os que faltaram | página real | idem › "o aviso conta os campos…" | sim | vermelho (sem a junção do CEP) |
| 4 | Editar um campo tira a marca dele, e só dele | página real | idem › "editar um campo lido…" | sim | vermelho (`semAsMarcasDe` sem efeito) |
| 5 | "Desfazer" volta exatamente ao estado anterior | página real | idem › "\"Desfazer\" volta exatamente…" | sim | vermelho (`desfazer-leitura` devolvendo o estado) |
| 6 | "Ler outro texto" reabre a folha no mesmo escopo | página real | idem › "\"Ler outro texto\" reabre…" | sim | não feito |
| 7 | "Outro endereço" da cadastrada lê só o endereço e não muda a ficha | página real | idem › "pede só o endereço, e nada da ficha muda…" | sim | vermelho (modo fixo em `contact_and_address` na porta) |
| 8 | O CEP manda quando o serviço conhece o CEP | página real | idem › "o CEP manda…" | sim | ficou verde com uma junção quebrada de cada vez; vermelho com as duas quebradas juntas |
| 9 | Sem resposta do serviço de CEP (não conhece / fora do ar), fica o que o texto trouxe | página real | idem › it.each "sem resposta do serviço de CEP…" | sim | não feito |
| 10 | Texto sem dados mantém a folha aberta com "Preencher à mão"; 503, 502, rede e 429 com as frases, sem perder nada | página real | idem › it.each "os desfechos sem campos" | sim | vermelho no 429 (slug `limited` desligado) |
| 11 | O voltar do Android fecha a folha | página real | idem › "o voltar do Android fecha a folha…" | sim | não feito |
| 12 | E-mail lido que já tem ficha: "Usar a ficha dela" vira leitura só de endereço | página real | idem › "o e-mail lido que já tem ficha…" | sim | vermelho (sem a junção do CEP) |
| 13 | Conta sem papel na porta da leitura ⇒ a recusa; 403 com o relógio de pé ⇒ falha; rede caída ⇒ falha sem perguntar o papel | client real | `app/__tests__/montagemComClientReal.test.tsx` › "a porta da leitura do texto colado…" | sim | vermelho (retirado `leitura.erroBruto` da vigia; recusa tratada como falha) |
| 14 | Guardas: `escritaSoPelaPorta` (porta da leitura, `INVOCACAO_ACEITA`, `IMPORTAM_O_CLIENT`, com sensor), `leituraSoComPapel`, `semDadoDeClienteNoAparelho`, tom (`tomMemorialDosMontados`), movimento (`movimentoDosPedidos`) | guarda de fonte | os cinco arquivos de guarda | sim | não feito (mudaram listas, âncoras e um sensor novo; a régua não mudou) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/api/portaDeLeitura.ts criado
apps/mobile-adm/src/features/order-proposal/model/useLeituraDoTexto.ts criado
apps/mobile-adm/src/features/order-proposal/ui/FolhaColarTexto.tsx criado
apps/mobile-adm/src/pages/__tests__/montarPedido.colarTexto.test.tsx criado
apps/mobile-adm/src/features/order-proposal/index.ts alterado
apps/mobile-adm/src/features/order-proposal/model/frasesDaMontagem.ts alterado
apps/mobile-adm/src/features/order-proposal/model/montagem.ts alterado
apps/mobile-adm/src/features/order-proposal/ui/CampoDaMontagem.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/FormularioDeEndereco.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx alterado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx alterado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/movimentoDosPedidos.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoSensivelDeClienteNoApp.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/tomMemorialDosMontados.test.ts alterado
apps/mobile-adm/CLAUDE.md alterado
packages/core/CLAUDE.md alterado
supabase/CLAUDE.md alterado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.colarTexto.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação): 18/18, exit 0.
- `… vitest run src/app/__tests__/montagemComClientReal.test.tsx` (PROJECT.md): 8/8, exit 0.
- `… vitest run src/entities/order/api/__tests__ src/shared/lib/__tests__` (PROJECT.md, os guardas): 531/531, exit 0.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md › Comandos): exit 0, 0 erros. Contra o baseline: o orquestrador não passou baseline, e eu rodei a conferência só depois da implementação, não antes da primeira fatia. O resultado bate com o baseline escrito em CLAUDE.md › Baselines (mobile-adm 0). Não mudei código de `packages/core`.
- `npx eslint .` em `apps/mobile-adm` (CLAUDE.md › Baselines): exit 0, 0/0, igual ao baseline.
- Verificação mínima (CLAUDE.md › Baselines, a suíte do app e as da loja e do painel, exit fora de pipe):
  - `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000`: 2549/159, exit 0.
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: 7091/378, exit 0.
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: 5182/288, exit 0.
- Checks de mutação nos arquivos reais: 11 mutantes, todos restaurados pela cópia e conferidos com `cmp`.
- Instruções lidas:
  - `CLAUDE.md` (raiz, no contexto) › Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy;
  - `apps/mobile-adm/CLAUDE.md` › O que existe hoje, O acesso é o MESMO do Backoffice, A árvore, Ações no pedido, Clientes, Avisos no celular, Pedidos montados, Montar pedido, PWA, Identidade, Navegação, Os guardas do app, Testes (arquivo de 71 KB, lido por seção);
  - `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, Pureza, Os módulos, customers, order-actions, proposals, Convenções de tipo (a seção Dinheiro não foi lida);
  - `supabase/CLAUDE.md` › Migrations, RLS — o molde que os guardas cobram, Edge functions (com `admin-users`), order-proposals e o pedido que nasce de uma proposta, Secrets;
  - `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- **O ciclo não foi vertical.** Escrevi a implementação antes do arquivo de testes da página. Nenhum teste da página foi visto vermelho antes de existir o código. Para compensar, rodei os checks de mutação da tabela `Fatias` nos arquivos reais.
- **"O CEP manda" tem duas garantias.** A junção `mergeCep` no hook da leitura e o efeito de CEP do `FormularioDeEndereco` produzem os mesmos valores. Quebrar só uma das duas deixa o teste "o CEP manda" verde; com as duas quebradas ele fica vermelho. A junção do hook não é redundante: é ela que alimenta o aviso ("O CEP conferiu…") e a marca do CEP, e três testes morrem sem ela.
- **Mudança de comportamento na tarefa 05.** Com `mergeCep` no efeito do formulário, um CEP digitado que o serviço conhece sem rua (CEP de cidade) deixa de apagar a rua já escrita. Não há teste para esse caso; o bloco `Testes` não o pede.
- **Desvio de forma.** O exemplar `useFolhaNoHistorico` foi trocado por `useFolhaNaEntrada`, que é o que a montagem já usa (decisão 1).
- **Comportamentos não cobertos pelo bloco `Testes`.** A porta em 401/403 na página com o dublê ficou de fora; a recusa e a falha estão provadas sobre o client real. Não escrevi teste unitário próprio de `portaDeLeitura.ts`; ela é exercida pela página e pelo client real.
- **Layout fica para a QA.** Alvo de 44 px, rolagem lateral em 390 e a folha com o teclado do Android só se provam em navegador (jsdom devolve 0).
- **Propagado:** nada. Nenhuma afirmação de 07 a 10 ficou falsa.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 06
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, por seção: Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy); apps/mobile-adm/CLAUDE.md (por seção); packages/core/CLAUDE.md (por seção: Quando um código pertence…, Pureza, Os módulos, customers, order-actions, proposals, Convenções de tipo; Dinheiro não lida); supabase/CLAUDE.md (Migrations, RLS, Edge functions, order-proposals, Secrets); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: pages/__tests__/montarPedido.colarTexto.test.tsx — Cliente nova lê contato e endereço; "Outro endereço" da cadastrada lê só endereço sem mudar a ficha; "Lendo o texto…" desligado; sucesso fecha e marca; editar tira a marca; o aviso conta e nomeia os que faltaram; Desfazer volta exatamente; Ler outro texto reabre no mesmo escopo; o CEP manda; sem resposta do CEP fica o texto; texto sem dados com "Preencher à mão"; 503/502/rede/429 com as frases; o voltar do Android fecha a folha; e-mail lido com ficha vira só endereço. app/__tests__/montagemComClientReal.test.tsx — conta sem papel na porta ⇒ recusa; 403 com relógio de pé ⇒ falha; rede caída ⇒ falha. Guardas: escritaSoPelaPorta (porta da leitura em INVOCACAO_ACEITA/IMPORTAM_O_CLIENT, com sensor), leituraSoComPapel, semDadoDeClienteNoAparelho, tomMemorialDosMontados, movimentoDosPedidos. Sem cobertura: teste unitário próprio da porta (exercida pela página e pelo client real); layout (QA, em navegador).
Verificações: vitest do arquivo novo 18/18; montagemComClientReal 8/8; guardas 531/531; tsc mobile-adm 0 erros (só depois da implementação; igual ao baseline de CLAUDE.md); eslint mobile-adm 0/0; suítes mobile-adm 2549/159, store 7091/378, backoffice 5182/288, todas exit 0; 11 mutantes nos arquivos reais (o "o CEP manda" só fica vermelho com as duas junções quebradas juntas)
Árvore de trabalho: criados portaDeLeitura.ts, useLeituraDoTexto.ts, FolhaColarTexto.tsx e montarPedido.colarTexto.test.tsx; alterados montagem.ts, frasesDaMontagem.ts, CampoDaMontagem.tsx, FormularioDeEndereco.tsx, PassoDaCliente.tsx, index.ts, MontarPedidoPage.tsx, montagemComClientReal.test.tsx, cinco guardas, e os CLAUDE.md de apps/mobile-adm, packages/core e supabase; nada commitado
Citações conferidas: 8 abertas (portaDePropostas.ts, portaDeAvisos.ts, useFolhaNoHistorico, customer-parse/handlers.ts, core/customers/parse.ts, mergeCep.ts, useCepLookup, os arquivos do passo 1 da 05); nenhuma deslocada nem morta. O exemplar useFolhaNoHistorico foi trocado pelo useFolhaNaEntrada que a montagem já usa
```

## T06 — wi-impl-review · fixing · agente ae763bb1aacca2dbb

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/06-folha-colar-texto.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | `raio subdeclarado` | atrapalha | apps/mobile-adm/src/features/order-proposal/model/montagem.ts:163 e :190-191 | O "Desfazer" guarda e devolve o `EstadoDaMontagem` inteiro (`antesDaLeitura: estado` / `return estado.antesDaLeitura ?? estado`), `pecas` incluído. O mesmo redutor já trata o caso parecido de outro jeito: `case 'modo'` (:172) preserva `pecas: estado.pecas` de propósito, e o campo diz "As peças (os passos 2 a 4 entram depois)" (:51-52). Quando a tarefa 07 puser a sacola nesse estado, um "Desfazer" feito depois de a Adri acrescentar peças vai apagar as peças sem aviso. O raio da premissa 4 lista só `montagem.ts (aplicarLeitura)` e não cita a 07, a 08 nem a 10. Hoje nenhum comportamento sai errado, porque `pecas` não muda em ação nenhuma. | Tarefa 07: "**Habilita.** 08 (a sacola alimenta o resumo do passo 3), 10 (o rascunho guarda as peças)". Tarefa 06, Design: "Desfazer (volta exatamente ao estado de antes; …)" fica no aviso do **passo 1**. Precedente no próprio redutor: `return { ...montagemVazia(), modo: acao.modo, pecas: estado.pecas, … }` |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a folha lê os dois escopos e preenche os campos marcados, com Desfazer | `FolhaColarTexto.tsx`, `useLeituraDoTexto.ts`, `portaDeLeitura.ts`, `montagem.ts` (`aplicarLeitura`, `desfazer-leitura`), `PassoDaCliente.tsx` (`marcaDe`, `AvisoDaLeitura`), `MontarPedidoPage.tsx` | sim |
| os desfechos sem dados, fora do ar e limite têm frase e não perdem nada | `useLeituraDoTexto.ts` (`fraseDoErro`, `terminarSemCampos`), `frasesDaMontagem.ts` (`SEM_DADOS_NO_TEXTO`, `LEITURA_FORA_DO_AR`, `LEITURAS_DEMAIS`), botão "Preencher à mão" na folha | sim |
| os CLAUDE.md registram a `customer-parse` e o `parse`/`mergeCep` | `supabase/CLAUDE.md` (tabela de functions, seção própria, secret `ANTHROPIC_API_KEY`), `packages/core/CLAUDE.md` (tabela de módulos e seção customers), `apps/mobile-adm/CLAUDE.md` | sim. Conferi contra o código da function: teto 30/600 000 ms, prazo de 15 s, `claude-haiku-5-5`, `verify_jwt = false` |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `montarPedido.colarTexto.test.tsx`, `montagemComClientReal.test.tsx`, os guardas | sim (detalhe em Testes) |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- Function por porta com nome literal, recusa só pelo `42501`, rede é falha: cumprida. `portaDeLeitura.ts` invoca `'customer-parse'` literal pela `traduzir` das portas. O hook só repassa como recusa o que `isAccessDenied` reconhece, e o resto é "fora do ar". `INVOCACAO_ACEITA` e `IMPORTAM_O_CLIENT` foram ampliados.
- Toda leitura por `lerComPapel`: cumprida. A porta não lê tabela, e isso está provado pela régua 3 nova em `leituraSoComPapel.test.ts`.
- Tom memorial e `motion-reduce:` na mesma linha: cumprida. `FolhaColarTexto.tsx` traz os pares de `data-[state]` no overlay e no conteúdo; o arquivo entrou em `movimentoDosPedidos` e as frases novas entraram em `tomMemorialDosMontados`. Não achei `!` nem emoji nos literais.
- Prova de layout no navegador: não se aplica aqui (é da QA).
- O gate inclui as suítes da loja e do painel: só execução.
- O texto colado só vive na memória da folha: cumprida. O texto está no `useState` de `Corpo`, que desmonta ao fechar. A página real confere `location.href` e `history.state`, e os três arquivos novos entraram no escopo de `semDadoDeClienteNoAparelho`.

## Testes

- Cliente nova lê contato e endereço / "Outro endereço" lê só o endereço e não muda a ficha: `montarPedido.colarTexto.test.tsx`. A asserção morde: confere o `mode` no corpo da invocação, e uma resposta com `contact` no modo `address` não chega ao DOM.
- "Lendo o texto…" desligado, sucesso fecha a folha e marca, editar tira a marca, o aviso conta e nomeia, Desfazer volta, Ler outro texto no mesmo escopo: mesmo arquivo. A asserção morde: usa promessa pendente, `toHaveAccessibleDescription` e as linhas exatas do aviso. O Desfazer parte de campos já digitados.
- O CEP manda / sem resposta do serviço fica o texto: mesmo arquivo, com `it.each` para "não conhece" e "fora do ar". A asserção morde.
- Sem dados com "Preencher à mão", fora do ar (503, 502, rede), 429, e o voltar do Android: mesmo arquivo. A asserção morde: confere a frase, a ausência de "Cancelar" e que o "Nome" já digitado continua.
- Client real, conta sem papel ⇒ recusa e rede caída é falha: `montagemComClientReal.test.tsx`, que inclui o par "403 com o relógio de pé ⇒ falha". A asserção morde.
- Guardas `escritaSoPelaPorta` (com sensores para a porta da leitura), `semDadoDeClienteNoAparelho`, tom e movimento: atualizados, com âncoras novas.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `useFolhaNaEntrada('colar-texto')` | sim | `shared/lib/useFolhaNaEntrada.ts` existe e a página já o usa em `sair-da-montagem` | sim |
| 2 | 422 dá "sem dados"; 503/502/outros/rede dão "fora do ar"; 429 tem frase própria; erro troca "Cancelar" por "Preencher à mão" | sim | Design: "Botões 'Cancelar' (depois de erro, 'Preencher à mão', que fecha)"; o contrato de 422 não tem frase prescrita | sim |
| 3 | frase do 429 | sim | D-11, sem `!` e sem urgência | sim |
| 4 | preenche só o que achou; Desfazer volta ao estado anterior | sim no comportamento | o snapshot é o estado inteiro | não: ver achado 1 (tarefa 07) |
| 5 | marcas somam; editar tira; o CEP completando não tira | sim | o motivo bate (o efeito do formulário redispara depois da leitura) | sim |
| 6 | só o CEP leva a marca "conferido no serviço de CEP" | sim | o Design diz "(CEP: 'Lido do texto — conferido no serviço de CEP.')" | sim |
| 7 | o aviso omite a UF | sim | o critério de aceite diz "O CEP conferiu rua, bairro e cidade." | sim |
| 8 | N = campos preenchidos depois do CEP; M = 11 ou 7 | sim | o exemplo "7 de 11" com 3 faltando é incoerente | sim |
| 9 | o formulário junta por `mergeCep` | sim | declarou o efeito no caso digitado à mão | sim |
| 10 | trocar de cliente ou de entrega descarta a leitura; "Usar a ficha" converte | sim | o Design: "as marcas de contato saem junto"; coberto por teste | sim |
| 11 | "Leitura desfeita." sai no `role="status"` da página | sim | não há toast no app | sim |
| 12 | a porta reaplica `parseCustomerText` | sim | contrato "campos ou erro traduzido"; `packages/core/CLAUDE.md` registra os dois leitores | sim |
| 13 | "Lendo…" cobre a espera do CEP; usa o mesmo `useCepLookup` | sim | `useCepLookup` nunca lança (converge para `manual`), então a espera não trava | sim |
| 14 | título do cartão escuro em `on-primary` | sim | o contraste sobre `ink` | sim |
| 15 | duas exceções em `semDadoSensivelDeClienteNoApp` | sim | precedente D-16 (`PassoDaCliente.tsx` `rotulo="CPF (opcional)"`), exceções por arquivo e texto exatos | sim |

## Não conferido

- Não rodei testes, typecheck nem lint (só execução).
- Não conferi o arquivo de spec (§3 e §7) da costura; julguei pela própria tarefa.
- Os arquivos marcados `M` (`montagem.ts`, `PassoDaCliente.tsx`, `FormularioDeEndereco.tsx`, `MontarPedidoPage.tsx` e outros) têm baseline no commit da T05 (`a94b675c`), então o diff é só desta tarefa. Os criados aparecem como `A` (com intent-to-add), e nenhum arquivo ficou sem baseline.
- Não abri `.specs/project/PROJECT.md`.

Instruções lidas: `CLAUDE.md` (raiz, carregado no contexto) › Comandos, › Alias de import, › O "defeito 01", › Convenções, › Os guardas, › Baselines, › CI e deploy; `apps/mobile-adm/CLAUDE.md` e `packages/core/CLAUDE.md` › customers e `supabase/CLAUDE.md` › Edge functions, › Secrets, só nos trechos que o diff tocou. Não li por inteiro `apps/mobile-adm/CLAUDE.md`, `packages/core/CLAUDE.md` (Pureza, Dinheiro, proposals, Convenções de tipo) nem `supabase/CLAUDE.md` (Migrations, RLS).

## T06 — wi-impl-task · done · agente a4ce637c62d1d5f55

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/06-folha-colar-texto.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

O único achado foi aplicado: o "Desfazer" agora volta o passo 1 ao estado de antes da leitura e deixa as peças como estão.

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 4 | A leitura preenche só os campos que achou; o resto fica como estava. O "Desfazer" (`desfazer-leitura`) devolve o estado de antes da leitura, mas mantém o `pecas` atual: `{ ...estado.antesDaLeitura, pecas: estado.pecas }`. | Limpar os campos não achados. Devolver o `EstadoDaMontagem` inteiro, com as peças da hora da leitura. | O "Desfazer" fica no aviso do passo 1 e só deve mexer no passo 1. É o mesmo padrão do `case 'modo'`, que já preserva `pecas`. | `montagem.ts` (`aplicarLeitura`, `desfazer-leitura`). Tarefa 07: a sacola que entrar em `EstadoDaMontagem` precisa continuar em `pecas`, ou o `desfazer-leitura` precisa preservar também o campo novo. Tarefas 08 e 10, que leem a sacola: com essa condição, nada a corrigir. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 15 | "Desfazer" volta os campos do passo 1 e mantém as peças acrescentadas depois da leitura | domínio (redutor) | `features/order-proposal/model/__tests__/montagem.desfazer.test.ts` | sim | vermelho (com `estado.antesDaLeitura` devolvido inteiro, o teste falha; arquivo restaurado e conferido com `cmp`) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

A tarefa inteira, da implementação e da correção:

apps/mobile-adm/src/features/order-proposal/api/portaDeLeitura.ts criado
apps/mobile-adm/src/features/order-proposal/model/useLeituraDoTexto.ts criado
apps/mobile-adm/src/features/order-proposal/ui/FolhaColarTexto.tsx criado
apps/mobile-adm/src/pages/__tests__/montarPedido.colarTexto.test.tsx criado
apps/mobile-adm/src/features/order-proposal/model/__tests__/montagem.desfazer.test.ts criado
apps/mobile-adm/src/features/order-proposal/index.ts alterado
apps/mobile-adm/src/features/order-proposal/model/frasesDaMontagem.ts alterado
apps/mobile-adm/src/features/order-proposal/model/montagem.ts alterado
apps/mobile-adm/src/features/order-proposal/ui/CampoDaMontagem.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/FormularioDeEndereco.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx alterado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx alterado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/movimentoDosPedidos.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoSensivelDeClienteNoApp.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/tomMemorialDosMontados.test.ts alterado
apps/mobile-adm/CLAUDE.md alterado
packages/core/CLAUDE.md alterado
supabase/CLAUDE.md alterado

## Verificação

Comandos da correção, todos com exit 0:
- `pnpm --filter @estrelinha/mobile-adm exec vitest run` com `montagem.desfazer.test.ts` e `montarPedido.colarTexto.test.tsx`, `--testTimeout=20000` (comando de um arquivo do PROJECT.md): 19/19.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros, igual ao baseline do CLAUDE.md (mobile-adm 0).
- `npx eslint src/features/order-proposal` em `apps/mobile-adm` (CLAUDE.md › Baselines): 0/0.
- `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` (verificação mínima do CLAUDE.md): 2550 testes em 160 arquivos.

Não rodei de novo as suítes da loja e do painel: a correção só mudou `montagem.ts` e um teste novo do app. Elas passaram na implementação (store 7091/378, backoffice 5182/288).

Instruções lidas: as mesmas da implementação; a correção não reabriu nenhuma.

## Divergências e descobertas

- O raio da premissa 4 estava subdeclarado: não citava as tarefas 07, 08 e 10. Corrigido no bloco `Decisões e premissas`.
- Nenhuma afirmação de 07, 08 ou 10 ficou falsa, então não houve nada a propagar.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 06
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, por seção: Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy); apps/mobile-adm/CLAUDE.md (por seção); packages/core/CLAUDE.md (por seção: Quando um código pertence…, Pureza, Os módulos, customers, order-actions, proposals, Convenções de tipo; Dinheiro não lida); supabase/CLAUDE.md (Migrations, RLS, Edge functions, order-proposals, Secrets); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: pages/__tests__/montarPedido.colarTexto.test.tsx — Cliente nova lê contato e endereço; "Outro endereço" da cadastrada lê só o endereço e não muda a ficha; "Lendo o texto…" desligado; o sucesso fecha e marca; editar tira a marca; o aviso conta e nomeia os que faltaram; Desfazer volta exatamente; Ler outro texto reabre no mesmo escopo; o CEP manda; sem resposta do CEP fica o texto; texto sem dados com "Preencher à mão"; 503/502/rede/429 com as frases; o voltar do Android fecha a folha; e-mail lido com ficha vira só endereço. model/__tests__/montagem.desfazer.test.ts — Desfazer mantém as peças. app/__tests__/montagemComClientReal.test.tsx — conta sem papel na porta ⇒ a recusa; 403 com o relógio de pé ⇒ falha; rede caída ⇒ falha. Guardas: escritaSoPelaPorta (a porta da leitura em INVOCACAO_ACEITA e IMPORTAM_O_CLIENT, com sensor), leituraSoComPapel, semDadoDeClienteNoAparelho, tomMemorialDosMontados, movimentoDosPedidos. Sem cobertura: teste unitário próprio da porta (ela é exercida pela página e pelo client real); layout fica para a QA, em navegador.
Verificações: arquivo novo da página 18/18; montagem.desfazer 1/1; montagemComClientReal 8/8; guardas 531/531; tsc mobile-adm 0 erros; eslint mobile-adm 0/0; suíte do app 2550/160, loja 7091/378, painel 5182/288, todas exit 0; 12 mutantes nos arquivos reais (o teste "o CEP manda" só fica vermelho com as duas junções do CEP quebradas juntas)
Árvore de trabalho: criados portaDeLeitura.ts, useLeituraDoTexto.ts, FolhaColarTexto.tsx, montarPedido.colarTexto.test.tsx e montagem.desfazer.test.ts; alterados montagem.ts, frasesDaMontagem.ts, CampoDaMontagem.tsx, FormularioDeEndereco.tsx, PassoDaCliente.tsx, index.ts, MontarPedidoPage.tsx, montagemComClientReal.test.tsx, cinco guardas e os CLAUDE.md de apps/mobile-adm, packages/core e supabase; nada commitado
Citações conferidas: 8 abertas; nenhuma deslocada nem morta. O exemplar useFolhaNoHistorico foi trocado pelo useFolhaNaEntrada, que a montagem já usa
```

## T07 — wi-impl-task · review · agente a3f19c6233aa66450

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/07-passo-pecas.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A etiqueta "<promoção> · 15%" (na folha e na linha da sacola) fica para a 08. Nesta tarefa nenhuma promoção aparece nem entra na conta: o preço da linha é o cheio. | Ler `promotions` no app para mostrar a etiqueta | Seguindo D-02: o painel tira a promoção de `useActivePromotions`, que lê `promotions`. A tarefa manda deixar a etiqueta para a 08 quando ela exigir essa leitura. | 08 (precisa desenhar a etiqueta com o `preview`) |
| 2 | O placeholder da busca é "Nome da joia", e não "Nome da joia ou SKU". | Prometer SKU; criar uma busca por SKU no app | `buscarProdutos` (core) busca só pelo nome. Uma busca por SKU no app seria uma segunda regra de busca, que o "Não faça" proíbe. | o texto do campo; 08–10 não dependem dele |
| 3 | O catálogo é lido por `useCatalogoDaMontagem` (chave `atelie-montagem-catalogo`, `staleTime: Infinity`). Faz a contagem `head` e lê as páginas com `readAllPages`, para peças e variações ativas, tudo dentro de `lerComPapel`. Leitura sem contagem é falha. | Ler sem contagem (parar na página curta); ler as variações por peça a cada abertura da folha | D-27 pede o catálogo uma vez. São ~700 peças e ~3.200 variações, acima do teto de 1.000 do PostgREST. Leitura cortada pareceria um catálogo menor. | 09/10, que reabrem a montagem e leem do mesmo cache |
| 4 | O estado `pecas` da montagem deixou de ser um número e virou `LinhaDaSacola[]`: `chave`, `pecaId`, `variacaoId` (`null` na peça sem grade), `quantidade`, `gravacao` aparada, e o retrato `nome`/`rotulo`/`foto`/`preco` cheio/`pedeMaterial`. Ações novas: `acrescentar-peca`, `atualizar-peca`, `remover-peca`. | Guardar só ids e reler o catálogo a cada desenho | A linha precisa desenhar a foto escolhida mesmo antes do catálogo responder de novo. As ações seguem o padrão do redutor que já existe. | 08 (manda peças ao `preview`), 09 (revisar), 10 (rascunho guarda variação, quantidade, gravação) |
| 5 | "Só há N em estoque." usa N = estoque da variação. O teto soma a mesma peça+variação já na sacola, menos a própria linha que está sendo editada. Fora de `stock_policy = track` não há teto e o texto é "Estoque livre". | N = estoque menos o que já está na sacola | É o texto literal do desenho, e D-22 diz que o teto soma a sacola. | só a folha |
| 6 | Variação sem preço (`preco: null`) desliga o botão com "Esta variação está sem preço no catálogo. Escolha outra." | Usar o preço base como recuo | O servidor recusaria essa linha (comentário de `piece.ts`). Recuar para o preço base mostraria um preço que não é o cobrado. | só a folha; uma frase fora do desenho |
| 7 | O aviso "Peça acrescentada." / "Peça atualizada." / "Peça removida." usa o `aviso` (role="status") que a página já tem, com "<nome> · <variação>". | Criar um sistema de toast | O app não tem toast. Esta página e a do pedido montado já mostram o aviso assim. | a página da montagem |
| 8 | O rótulo do eixo dos chips são os nomes das opções da primeira variação, separados por " · ". Sem nenhum, "Variação". | Expor `options` em `PecaParaProposta` (core) | O contrato diz "consuma, não altere" o mapeamento de `core`. | só a folha |
| 9 | "a partir de R$ X" usa o menor preço entre as variações ativas, incluindo as esgotadas. O estoque é a soma das variações (ou `estoqueTotal` sem grade). | Excluir as esgotadas do mínimo | É o mesmo conjunto que a folha mostra. O desenho não distingue. | a linha da busca |
| 10 | O catálogo só é lido quando o passo 2 está na tela (`enabled: passo === 2`); depois fica no cache. | Ler ao abrir a montagem | Ler a partir do passo 1 seria custo de rede sem uso. | 09 (Alterar → passo 2 reaproveita o cache) |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Busca pela regra de core (sem acento, várias palavras em qualquer ordem) e linha com capa e "a partir de R$ … · N em estoque · pede material"; catálogo lido com o papel e uma vez só | página real (app) | apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx (3 casos) | sim | vermelho (busca trocada por `includes`; "a partir de" com 1 variação; `staleTime` 0) |
| 2 | A folha abre na primeira variação com estoque; a foto troca por variação e recua para a capa; esgotada desligada; acima do estoque somando a sacola, a frase e o botão desligado; gravação só se a peça aceita; editar reabre com "Salvar"; o voltar fecha | página real (app) | idem (5 casos) | sim | vermelho (sem a soma da sacola; variação inicial = primeira; foto grande = capa; `grava` sempre; chip esgotado ligado; sem `exceto` da linha editada; busca não limpa) |
| 3 | A sacola mostra a foto da variação (sem foto própria, a capa); peça sem foto com a moldura da estrela; remover tira a linha | página real (app) | idem (1 caso) | sim | vermelho (foto da linha = capa; remover sem efeito) |
| 4 | Conta sem papel na leitura do catálogo ⇒ a recusa; rede caída ⇒ falha, nunca recusa | client real (app) | apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx (+2 casos) | sim | vermelho (`catalogo.error` fora da vigia); o `!recusada` do passo 2 ficou verde |
| 5 | Guarda `buscaDeProdutoComDonoUnico` com o app no escopo, e o sensor: uma segunda dobra no app reprova | guarda (backoffice) | apps/backoffice/src/shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts (+1 sensor, âncoras) | sim | vermelho (dobra injetada em `sacola.ts` real: 2 casos caem) |
| 6 | `leituraSoComPapel` e `escritaSoPelaPorta` com a entrada literal nova | guarda (app) | leituraSoComPapel.test.ts (+2 casos, um deles sensor), escritaSoPelaPorta.test.ts | sim | vermelho (os sensores da exportação e da chamada fora de `lerComPapel` acusam) |
| 7 | Tom e movimento nos arquivos novos | guarda (app) | tomMemorialDosMontados.test.ts, movimentoDosPedidos.test.ts | sim | — |

Nota de método: o código foi escrito antes dos testes da fatia, então nenhuma fatia passou pelo vermelho no próprio ciclo. Por isso cada fatia levou o check de mutação: o arquivo copiado para fora, a mutação aplicada, o teste rodado, a cópia devolvida e conferida com `cmp`.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/entities/product/api/catalogoDaMontagem.ts criado
apps/mobile-adm/src/entities/product/index.ts criado
apps/mobile-adm/src/features/order-proposal/model/sacola.ts criado
apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx criado
apps/mobile-adm/src/features/order-proposal/ui/PassoDasPecas.tsx criado
apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx criado
apps/mobile-adm/src/features/order-proposal/index.ts alterado
apps/mobile-adm/src/features/order-proposal/model/montagem.ts alterado
apps/mobile-adm/src/features/order-proposal/model/__tests__/montagem.desfazer.test.ts alterado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.test.tsx alterado
apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx alterado
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/movimentoDosPedidos.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/tomMemorialDosMontados.test.ts alterado
apps/backoffice/src/shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts alterado

## Verificação

- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (instruções, CLAUDE.md §Comandos): exit 0, 0 erros. A baseline do CLAUDE.md é 0.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (instruções): exit 2, 7 erros, todos em `apps/backoffice/src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (TS2593/TS2304, `describe`/`it`/`expect` sem tipos). Esse arquivo já está commitado (`4c6e9a16`) e eu não o toquei. Nenhum erro está em arquivo que eu alterei. Nenhum `baseline` veio na entrada e não rodei a conferência antes da primeira fatia; comparei contra a baseline do CLAUDE.md (0) e contra a autoria por git.
- Um arquivo de teste por vez, `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md §Comandos de verificação): montarPedido.pecas 9/9; montarPedido 22/22; montagemComClientReal 10/10; leituraSoComPapel + escritaSoPelaPorta 58/58; movimentoDosPedidos + tomMemorialDosMontados 25/25; buscaDeProdutoComDonoUnico 23/23. Todos exit 0.
- Verificação mínima (instruções, CLAUDE.md §Baselines: a suíte do workspace tocado mais as da loja e do painel), um workspace por vez, exit fora de pipe:
  - mobile-adm: 2563/161, exit 0
  - backoffice: 5183/288, exit 0
  - store: 7091/378, exit 0
- `npx eslint` nos arquivos novos e alterados de produção do app: exit 0, sem achados.

Instruções lidas: CLAUDE.md (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; apps/mobile-adm/CLAUDE.md (inteiro); apps/backoffice/CLAUDE.md › A busca de produto: um dono para as cinco telas, › Montar pedido para a cliente; packages/core/CLAUDE.md › Quando um código pertence a este pacote, › Pureza, › Os módulos, › Dinheiro, › customers, › proposals, › Convenções de tipo; .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- **Promoção:** a etiqueta "<promoção> · 15%" dos critérios de aceite não foi feita, por D-02 (decisão 1). A 08 precisa desenhá-la a partir do `preview`.
- **SKU:** o desenho pede busca por "Nome da joia ou SKU", mas a regra de core não busca SKU. O campo diz "Nome da joia" (decisão 2).
- **Mutação que ficou verde:** tirar o `!recusada` da renderização do passo 2 não derruba nenhum teste (`montagemComClientReal`). Com a RPC recusada, `lerComPapel` descarta a resposta, então nenhuma peça chega à tela mesmo sem esse guarda. Ele só protege o catálogo já em cache depois de uma recusa posterior. Fica para a revisão olhar.
- **Par ausente no client real:** não há caso "par" (catálogo desenhado) sobre o client real. O arnês `clientReal.ts` não devolve `Content-Range`, a contagem vem `null` e a leitura falha de propósito. Mudar o arnês exigiria mudar as duas cópias pareadas (`clientRealPareado`). A leitura bem-sucedida está provada no dublê (`montarPedido.pecas`), e o caso da recusa no client real afirma que a leitura de `products` saiu.
- **Tipos do backoffice:** os 7 erros em `ProposalStateBadge.test.tsx` vêm de commit anterior (`4c6e9a16`), não desta tarefa.
- **Propriedade de arquivo:** `montarPedido.test.tsx` e `montagem.desfazer.test.ts`, da 05/06, foram ajustados. O passo 2 agora pede ao menos uma peça: o caso "o voltar recua um passo" ganhou o acréscimo de uma peça antes de seguir, e o desfazer usa uma linha da sacola no lugar do número. Nenhuma asserção foi afrouxada.
- **Não feito:** `apps/mobile-adm/CLAUDE.md` não foi atualizado com o passo 2 e diz ainda "Os passos 2 a 4 têm só o esqueleto". Pelo `waves.md`, a 07 não tem posse desse arquivo; ele é da 10.
- **Fora daqui:** layout (alvo de 44 px, rolagem lateral, folha a 390/200 %) não foi conferido, como a tarefa manda. É da QA.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 07
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; apps/mobile-adm/CLAUDE.md; apps/backoffice/CLAUDE.md › A busca de produto (51, AD-036), › Montar pedido para a cliente (89, AD-070); packages/core/CLAUDE.md › Quando um código pertence…, Pureza, Os módulos, Dinheiro, customers, proposals, Convenções de tipo; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: busca + linha com capa/resumo + catálogo uma vez → pages/__tests__/montarPedido.pecas.test.tsx (3); folha (variação inicial com estoque, foto que troca e recua à capa, esgotada desligada, estoque somando a sacola, gravação só se grava, editar com "Salvar", voltar fecha) → idem (5); sacola com a foto da variação, moldura da estrela, remover → idem (1); conta sem papel no catálogo ⇒ recusa, rede ⇒ falha → app/__tests__/montagemComClientReal.test.tsx (+2); guardas: buscaDeProdutoComDonoUnico com o app no escopo e sensor da segunda dobra no app; leituraSoComPapel (entrada literal + régua + sensor) e escritaSoPelaPorta; tomMemorialDosMontados e movimentoDosPedidos com os arquivos novos. Sem cobertura: a etiqueta de promoção (adiada para a 08 por D-02) e o par "catálogo desenhado" sobre o client real (o arnês não devolve Content-Range)
Verificações: tsc mobile-adm 0 erros; tsc backoffice 7 erros, todos em ProposalStateBadge.test.tsx, de commit anterior (4c6e9a16), nenhum em arquivo desta tarefa; testes dos arquivos alterados verdes; suítes mobile-adm 2563/161, backoffice 5183/288, store 7091/378, todas exit 0; eslint dos arquivos de produção do app 0
Árvore de trabalho: criados entities/product/api/catalogoDaMontagem.ts, entities/product/index.ts, features/order-proposal/model/sacola.ts, ui/FolhaDaVariacao.tsx, ui/PassoDasPecas.tsx, pages/__tests__/montarPedido.pecas.test.tsx (todos em apps/mobile-adm/src); alterados features/order-proposal/index.ts, model/montagem.ts (pecas vira LinhaDaSacola[], ações de peça, motivo do passo 2), pages/MontarPedidoPage.tsx (passo 2 e folha), e os testes montagem.desfazer, montarPedido, montagemComClientReal, leituraSoComPapel, escritaSoPelaPorta, movimentoDosPedidos, tomMemorialDosMontados; no painel, buscaDeProdutoComDonoUnico.test.ts. Nada commitado
Citações conferidas: 7 abertas (useProductVariants.ts:31 capa:images->0->>url, conferida; buscaDeProdutoComDonoUnico.test.ts:33 ESCOPO, conferida; useCliente/clientesDaMontagem + lerComPapel; useFolhaNoHistorico, cujo mecanismo é o useFolhaNaEntrada; mapearPecaParaProposta em core/proposals/piece.ts; FotoDaPeca.tsx; capaDaLinha/fotoDaLinha em core/proposals/photo.ts). Nenhuma deslocou nem estava morta
Caducou: 05 · o caso "o voltar recua um passo" (e o "Passos 2 a 4 têm só o esqueleto" do CLAUDE.md do app) supunha que "Continuar" no passo 2 avança sem peça · o passo 2 agora exige ao menos uma peça ("Acrescente ao menos uma peça."); o teste ganhou o acréscimo de uma peça antes de seguir
```

## T07 — wi-impl-review · fixing · agente aaaf10dca596042fd

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/07-passo-pecas.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | identificador de processo | atrapalha | apps/mobile-adm/src/features/order-proposal/model/sacola.ts:58 e apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx:46 | O comentário cita a decisão da spec pelo número: `(D-22)`. Em HEAD, `git grep "(D-NN)"` em `apps/mobile-adm/src` não acha nada, então o identificador é novo. A revisão da tarefa 05 já tinha apontado a mesma forma (`D-12`, `D-16`…) no implement-log, e ela foi tirada do código. | regra do workflow: identificador de processo não entra no código |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a Adri acrescenta, edita e remove peças com foto, sem passar do estoque somado | `model/sacola.ts` (`passaDoEstoque`, `jaNaSacola` com `exceto`, `linhaDaEscolha`), `ui/FolhaDaVariacao.tsx`, `ui/PassoDasPecas.tsx`, as ações `acrescentar-peca`/`atualizar-peca`/`remover-peca` em `model/montagem.ts`, e `confirmarPeca` em `MontarPedidoPage.tsx` | sim. A etiqueta de promoção do critério de aceite ficou para a 08, como a D-02 permite (premissa 1) |
| a busca é a de `core`, e o guarda recusa uma segunda no app | `buscarPecas` → `buscarProdutos` (`core/product-search`). O `ESCOPO` de `buscaDeProdutoComDonoUnico.test.ts` agora inclui `apps/mobile-adm/src`, com âncora e sensor | sim |
| cada comportamento do bloco `Testes` coberto por um teste escrito | `pages/__tests__/montarPedido.pecas.test.tsx`, `app/__tests__/montagemComClientReal.test.tsx` e os guardas | sim. `renditionSingleOwner` não mudou: o escopo dele já é `apps`/`packages`, e a única URL de rendição continua saindo de `FotoDaPeca` → `renditionUrl` |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar a unidade | — | só execução |

## Obrigações

- Function por porta com nome literal; recusa só pelo `42501`; rede é falha: esta tarefa não chama function nenhuma. A leitura do catálogo usa `retryUnlessDenied` e passa pela vigia `useRecusaDePapel`. O teste com o client real mostra a rede caída como falha do bloco, sem recusa.
- Toda leitura por `lerComPapel`: cumprida. Em `catalogoDaMontagem.ts`, `lerPecas` e `lerVariacoes` não são exportadas e só são chamadas dentro de `lerComPapel`. `leituraSoComPapel` prova isso com régua e sensor.
- Tom memorial e `motion-reduce:`: cumprida. Os literais estão em `sacola.ts` sem `!` nem emoji. A folha leva o par `motion-reduce:` no overlay e no conteúdo. Os arquivos novos entraram em `tomMemorialDosMontados` e em `movimentoDosPedidos`.
- Prova de layout fica para a QA: nada foi feito aqui, e não precisava.
- Gate com as suítes da loja e do painel: o guarda do painel foi tocado. A execução não foi conferida.

## Testes

- Busca pela regra de `core` e cada linha com capa e resumo: `montarPedido.pecas.test.tsx`, "lê o catálogo com o papel…" e "a busca é a de `core`…". A asserção morde: confere o texto exato do resumo, o `src` da capa, a moldura com a estrela, a busca sem acento e com palavras fora de ordem, e o "Nenhuma joia com “xyz”.".
- Folha: variação inicial com estoque, foto que troca e volta à capa, esgotada desligada: "abre na primeira variação com estoque…". Morde: compara `aria-pressed`, `toBeDisabled` e o `src` da foto grande nas duas direções.
- Acima do estoque somando a sacola, com a frase e o botão desligado: "a quantidade não passa do estoque — somando…". Morde: o estoque é 3, com 2 já na sacola; confere também que outra variação não soma.
- Gravação só quando a peça aceita: "a gravação só aparece…". Morde: `maxLength` 12, o contador, e a ausência do campo em Rosé e no Anel.
- Editar reabre com "Salvar": "acrescentar fecha a folha…". Morde: o chip preservado, o valor gravado, "Salvar · R$ 378,00", e a linha que não soma com ela mesma.
- Sacola com a foto da variação, moldura da estrela e remover: "cada linha mostra a foto…". Morde: o `src` de Ouro, a capa quando falta foto própria (Rosé), o `svg` no lugar da foto, e a linha removida junto com o aviso.
- Client real, conta sem papel na leitura do catálogo ⇒ recusa: `montagemComClientReal.test.tsx`. Morde: confere que `products` foi lido, o redirecionamento para `/login`, e que o nome da joia não aparece em instante nenhum. Tem o par da rede caída.
- Guardas:
  - `buscaDeProdutoComDonoUnico`: âncora com mais de 150 arquivos do app, mais um sensor da dobra sintética no app.
  - `leituraSoComPapel`: entrada literal nova, régua com 4 `from`, mais um sensor de leitura exportada ou solta.
  - `escritaSoPelaPorta`: lista de importadores do client com 13 entradas, conferida por igualdade.
  - `movimentoDosPedidos` e `tomMemorialDosMontados`: os arquivos novos entraram.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Etiqueta de promoção adiada para a 08 | sim | A D-02 da própria tarefa: "se ela exigir ler `promotions`, deixe a etiqueta para a 08 e diga no retorno". O painel tira a promoção de `priceDraft(…, promotions)`. | sim, lista a 08. Ressalva: o texto da tarefa 08 ainda não pede a etiqueta na folha nem na linha da sacola. O orquestrador precisa levar isso à 08 |
| 2 | Placeholder "Nome da joia", sem SKU | sim | `spec.md:141` recusa filtrar por SKU como "artifício"; `core/product-search` não busca por SKU | sim |
| 3 | Catálogo com contagem e `readAllPages`, dentro de `lerComPapel`, `staleTime: Infinity` | sim | A D-27, o teto do PostgREST, e o teste "lido uma vez" | sim, 09 e 10 |
| 4 | `pecas` virou `LinhaDaSacola[]` | sim | O redutor e os consumidores (`itensDaBarra`, `montagemPreenchida`, o teste de desfazer) foram ajustados no diff | sim, 08, 09 e 10 |
| 5 | N = estoque da variação; o teto soma a sacola menos a própria linha | sim | A D-22 e o texto literal do desenho | sim |
| 6 | Variação sem preço desliga o botão, com uma frase | sim | `piece.ts` não usa o preço base como recuo para a variação; a frase não tem `!` | sim |
| 7 | O aviso usa o `role="status"` da página | sim | O app não tem toast, e as outras páginas fazem igual | sim |
| 8 | O rótulo do eixo vem das chaves de `valores` da primeira variação | sim | O contrato diz para não alterar o mapeamento de `core` | sim |
| 9 | "a partir de" usa o menor preço, contando as esgotadas | sim | O desenho não distingue | sim |
| 10 | O catálogo só é lido no passo 2 | sim | `enabled: passos.passo === 2`, e o teste do client real confere que `products` não foi lido antes | sim |

## Não conferido

- Não rodei testes, `tsc` nem lint (fora do papel desta revisão). A contagem do sensor `movimentoDosPedidos` (≥24/22) e as âncoras numéricas só a execução confirma.
- A propagação da etiqueta de promoção para a tarefa 08: o arquivo dela não menciona a etiqueta da folha nem a da linha da sacola. Isso não é achado desta tarefa, porque ela mandava só "dizer no retorno". Fica para o orquestrador decidir onde a etiqueta entra.
- `MontarPedidoPage.tsx`, `montagem.ts` e os guardas também foram tocados pelas tarefas 05 e 06. Julguei só as mudanças que esta tarefa explica.
- Todos os arquivos de `alterados` aparecem no diff (os novos com intent-to-add). Não houve arquivo sem baseline.

Instruções lidas: CLAUDE.md (raiz, pelo contexto carregado: Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy); apps/mobile-adm/CLAUDE.md › índice de títulos e › Montar pedido (WI 94); apps/backoffice/CLAUDE.md e packages/core/CLAUDE.md não lidos por seção — as regras citadas (dono da busca, mapeamento de `core`) foram conferidas direto no código (`packages/core/src/proposals/piece.ts`, `photo.ts`, `product-search`).

## T07 — wi-impl-task · done · agente a3f19c6233aa66450

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/07-passo-pecas.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada

## Fatias

nada

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

A correção alterou só dois arquivos: apps/mobile-adm/src/features/order-proposal/model/sacola.ts e apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx. Abaixo, tudo o que a tarefa alterou, da implementação e da correção:

apps/mobile-adm/src/entities/product/api/catalogoDaMontagem.ts criado
apps/mobile-adm/src/entities/product/index.ts criado
apps/mobile-adm/src/features/order-proposal/model/sacola.ts criado
apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx criado
apps/mobile-adm/src/features/order-proposal/ui/PassoDasPecas.tsx criado
apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx criado
apps/mobile-adm/src/features/order-proposal/index.ts alterado
apps/mobile-adm/src/features/order-proposal/model/montagem.ts alterado
apps/mobile-adm/src/features/order-proposal/model/__tests__/montagem.desfazer.test.ts alterado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.test.tsx alterado
apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx alterado
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/movimentoDosPedidos.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/tomMemorialDosMontados.test.ts alterado
apps/backoffice/src/shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts alterado

## Verificação

Achado 1 aplicado: o `(D-22)` saiu dos comentários em `sacola.ts:58` e `FolhaDaVariacao.tsx:46`. O texto do comentário ficou igual, só sem o identificador. Um `grep "D-[0-9][0-9]"` na produção de `features/order-proposal`, `entities/product` e `MontarPedidoPage.tsx` não acha mais nada.

- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.pecas.test.tsx --testTimeout=20000` (PROJECT.md §Comandos de verificação): 9/9 passam, exit 0.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (instruções, CLAUDE.md §Comandos): exit 0, 0 erros, igual à baseline (0).

Instruções lidas: nada de novo nesta correção (as mesmas da implementação).

## Divergências e descobertas

nada

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 07
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; apps/mobile-adm/CLAUDE.md; apps/backoffice/CLAUDE.md › A busca de produto (51, AD-036), › Montar pedido para a cliente (89, AD-070); packages/core/CLAUDE.md › Quando um código pertence…, Pureza, Os módulos, Dinheiro, customers, proposals, Convenções de tipo; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: busca + linha com capa/resumo + catálogo lido uma vez → pages/__tests__/montarPedido.pecas.test.tsx (3); folha (abre na primeira variação com estoque, foto que troca e recua à capa, esgotada desligada, estoque somando a sacola, gravação só se a variação grava, editar com "Salvar", voltar fecha) → idem (5); sacola com a foto da variação, moldura da estrela, remover → idem (1); conta sem papel no catálogo ⇒ recusa, rede ⇒ falha → app/__tests__/montagemComClientReal.test.tsx (+2); guardas: buscaDeProdutoComDonoUnico com o app no escopo e sensor da segunda dobra no app; leituraSoComPapel (entrada literal + régua + sensor) e escritaSoPelaPorta; tomMemorialDosMontados e movimentoDosPedidos com os arquivos novos. Sem cobertura: a etiqueta de promoção (adiada para a 08 por D-02) e o par "catálogo desenhado" sobre o client real (o arnês não devolve Content-Range)
Verificações: implementação — tsc mobile-adm 0 erros; tsc backoffice 7 erros, todos em ProposalStateBadge.test.tsx, de commit anterior (4c6e9a16), nenhum em arquivo desta tarefa; testes dos arquivos alterados verdes; suítes mobile-adm 2563/161, backoffice 5183/288, store 7091/378, todas exit 0; eslint dos arquivos de produção do app 0. Correção — montarPedido.pecas 9/9 e tsc mobile-adm 0
Árvore de trabalho: criados entities/product/api/catalogoDaMontagem.ts, entities/product/index.ts, features/order-proposal/model/sacola.ts, ui/FolhaDaVariacao.tsx, ui/PassoDasPecas.tsx, pages/__tests__/montarPedido.pecas.test.tsx (em apps/mobile-adm/src); alterados features/order-proposal/index.ts, model/montagem.ts, pages/MontarPedidoPage.tsx e os testes montagem.desfazer, montarPedido, montagemComClientReal, leituraSoComPapel, escritaSoPelaPorta, movimentoDosPedidos, tomMemorialDosMontados; no painel, buscaDeProdutoComDonoUnico.test.ts. A correção tirou o identificador de processo de dois comentários (sacola.ts, FolhaDaVariacao.tsx). Nada commitado
Citações conferidas: 7 abertas (useProductVariants.ts:31 capa:images->0->>url; buscaDeProdutoComDonoUnico.test.ts:33 ESCOPO; useCliente/clientesDaMontagem + lerComPapel; useFolhaNoHistorico, cujo mecanismo é o useFolhaNaEntrada; mapearPecaParaProposta em core/proposals/piece.ts; FotoDaPeca.tsx; capaDaLinha/fotoDaLinha em core/proposals/photo.ts). Nenhuma deslocou nem estava morta
Caducou: 05 · o caso "o voltar recua um passo" (e o "Passos 2 a 4 têm só o esqueleto" do CLAUDE.md do app) supunha que "Continuar" no passo 2 avança sem peça · o passo 2 agora exige ao menos uma peça ("Acrescente ao menos uma peça."); o teste ganhou o acréscimo de uma peça antes de seguir
```

## T08 — wi-impl-task · review · agente a11f15a9222fb8f5d

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/08-passo-descontos-e-preview.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O cupom recusado mostra o texto da loja que já existe: "Cupom inválido." e "Cupom válido apenas no primeiro pedido." (os de `couponRefusal`/`precificar`). | Os textos do Design da tarefa ("Cupom não encontrado.", "Este cupom vale só para a primeira compra."). | O critério de aceite e o Contrato pedem "o texto da loja". Criar frases novas só para o app daria dois donos do mesmo texto. | Só a tela do passo 3 e os testes. A tarefa 09 não cita esses textos. |
| 2 | "Este cupom pede o e-mail da cliente." (D-29) fica em `precificar` como `COUPON_NEEDS_EMAIL`. Vale quando o cupom é de primeira compra e não há e-mail, ou o e-mail não passa em `isValidEmail`. | Pôr a regra só no `preview`. Tratar e-mail inválido como e-mail válido. | O `save` e o `renew` sempre chegam com e-mail válido, então só a prévia cai nessa regra. Não muda nada do que já existia. | `order-proposals/handlers.ts` (`precificar`, que o `save` e o `renew` também usam). |
| 3 | Desconto combinado que zera os itens, ou em % de 100 ou mais: a prévia responde **200** com o resumo sem o desconto e `manual_refusal: "O desconto não pode zerar o pedido."`. | Responder 422, como diz o Contrato. Nesse caso a tela não teria resumo sem o desconto. | O critério diz que a recusa aparece logo e não entra na conta. Com 422 o resumo velho continuaria mostrando o desconto. A regra do "% ≥ 100" fica no servidor (`recusaDoCombinado`), não no app. | O contrato do `preview`, que é lido pela tarefa 09. |
| 4 | O motivo do desconto combinado não vai à prévia. A prévia recebe só `{kind, value}` e passa a `core` um texto fixo interno (`MOTIVO_DA_PREVIA`). | Mandar o motivo, ou deixar `core` recusar a prévia por falta de motivo. | O motivo não muda o dinheiro e é só da tela. Assim o resumo continua vivo antes de ele ser escrito, e o motivo não sai do aparelho. Ele continua obrigatório ao continuar (pelo bloqueio do passo) e no `save`. | O `preview` e o app. |
| 5 | A resposta do `preview` tem `{ summary: resumo(), coupon: {code,type,value,first_order_only}\|null, manual_refusal, items_pix: {percent,total}\|null }`. O PIX é `proposalPricing(lockProposal(price), pix, frete 0)` com a porcentagem lida de `store_settings.payment`. Com o PIX desligado, sem desconto ou com a leitura falhando, vem `null`. | O nome `pix` para o campo. Ler `store_settings` pelo app. | O guarda `regraDePedidoSoNoCore` acusa `pix:` como chave de mapa. E o app não tem porta de leitura para `store_settings`. A conta é a mesma do link e do `create-payment`. | O contrato do `preview` (tarefa 09). `tipos.ts` do app. |
| 6 | "Aplicar" o cupom usa a mesma prévia, com o código digitado (`useAplicarCupom`). O cupom só entra no estado quando a prévia o aceita. Se a prévia passar a recusar um cupom já aplicado (as peças ou o e-mail mudaram), o cupom sai e a recusa aparece no campo. | Ler `coupons` no app, ou chamar `validateCoupon`. | D-02: o app não lê cupons. | O estado da montagem (`cupom`), que a tarefa 10 guarda no rascunho. |
| 7 | O nome do cupom ao lado do código foi para `core` (`packages/core/src/coupons/label.ts`, `couponLabel`). Ganhou a variante "na primeira compra". O `rotuloDoCupom` do painel agora chama essa função e dá a mesma saída de antes. | Escrever uma segunda cópia do rótulo no app. | "Defeito 01": a mesma frase teria dois leitores (painel e app). | `packages/core/src/coupons`, `apps/backoffice/.../model/coupon.ts` e o app. |
| 8 | O estado da montagem ganhou `cupom: CupomAplicado\|null` e `combinado: {ligado, tipo, valor, motivo}`. Trocar o segmento (Cliente cadastrada ou nova) e "Desfazer" a leitura mantêm os dois, como já mantinham as peças. A tentativa do passo 3 fica em estado da página. | Guardar a tentativa no redutor. | O formato que a tarefa 10 vai guardar fica igual: cupom e valor, sem o motivo. | `montagem.ts`, tarefa 10. |
| 9 | No passo 3 o total da barra é o `items_total` da última prévia. Nos outros passos continua "—". "Continuar" fica ligado no passo 3. O motivo do bloqueio usa `motivoDoPassoDescontos`: primeiro a recusa do servidor, depois `manualDiscountRefusal` de `core`, e só aparece na barra depois da tentativa. | Desligar o botão no passo 3. | É o que o Design pede. | `MontarPedidoPage.tsx`. |
| 10 | O resumo vivo é um hook próprio (`useResumoDaMontagem`). Ele usa `AbortController`, que vai como `signal` do `invoke`, e descarta a resposta antiga mesmo que ela chegue. Não espera o fim da digitação. | React Query com `keepPreviousData`. Esperar o fim da digitação. | "A cada mudança, com a anterior cancelada" (D-02). Assim o teste vê o cancelamento direto pelo `signal`. | Só o app. |
| 11 | A prova da conta sem papel com o client real ficou na **porta** (`conferirResumo`), e não no `<App />` inteiro. | Chegar ao passo 3 pelo `<App />` sobre o client real. | O arnês `clientReal.ts` não devolve `Content-Range`, e sem isso a leitura do catálogo do passo 2 falha ("veio sem a contagem"). Mudar o arnês exigiria mudar a cópia da loja (`clientRealPareado`), que não é desta tarefa. | Só o teste. Que a recusa lançada leva a tela à vigia é o mesmo caminho das outras portas da montagem, já provado. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `preview` sem papel recusa antes de ler qualquer coisa; não chama RPC nem grava | Unidade (functions) | `supabase/functions/order-proposals/__tests__/handlers.test.ts` › autorização (`preview` em `ACOES`) e › preview › "não chama RPC nem grava" | sim | — |
| 2 | `preview` devolve o mesmo resumo que o `save`; cupom recusado com o texto da loja (primeira compra por e-mail); sem e-mail, "Este cupom pede o e-mail da cliente."; o combinado que zera fica fora da conta; o PIX | Unidade (functions) | mesmo arquivo, `describe('preview')` | sim | vermelho (tirar a regra D-29; tirar a conta de novo sem o combinado) |
| 3 | Aplicar e remover cupom; desconto combinado em R$ e em %; motivo obrigatório depois da tentativa; "O desconto não pode zerar o pedido." fora da conta; o resumo vivo cancela a chamada anterior; a linha do PIX | Página real (app) | `apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx` | sim | vermelho (8 mutações: sem `vigente`, sem `abort`, motivo na barra sem tentativa, combinado fora do corpo, rótulo sem a primeira compra, recusa do cupom genérica, sem a linha do PIX, remover sem tirar o cupom) |
| 4 | Conta sem papel no `preview` ⇒ a recusa; 403 com o relógio de pé ⇒ falha; rede caída ⇒ falha sem perguntar o papel | Client real (app) | `apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx` › "a porta da prévia…" | sim | vermelho (porta engolindo a recusa) |
| 5 | Guardas: `escritaSoPelaPorta` aceita a ação `preview`; nenhum `from('promotions'\|'coupons'\|'orders')` no app | Guarda (app) | `escritaSoPelaPorta.test.ts`, `leituraSoComPapel.test.ts` (régua 5 nova, com sensores) | sim | vermelho (os guardas acusaram a porta antes da atualização; a régua 5 acusou um `from('coupons')` injetado) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

supabase/functions/order-proposals/handlers.ts alterado
supabase/functions/order-proposals/index.ts alterado
supabase/functions/order-proposals/__tests__/handlers.test.ts alterado
supabase/CLAUDE.md alterado
packages/core/src/coupons/label.ts criado
packages/core/src/coupons/index.ts alterado
apps/backoffice/src/features/order-proposal/model/coupon.ts alterado
apps/mobile-adm/src/features/order-proposal/api/portaDePropostas.ts alterado
apps/mobile-adm/src/features/order-proposal/index.ts alterado
apps/mobile-adm/src/features/order-proposal/model/montagem.ts alterado
apps/mobile-adm/src/features/order-proposal/model/tipos.ts alterado
apps/mobile-adm/src/features/order-proposal/model/descontos.ts criado
apps/mobile-adm/src/features/order-proposal/model/useResumoDaMontagem.ts criado
apps/mobile-adm/src/features/order-proposal/model/useAplicarCupom.ts criado
apps/mobile-adm/src/features/order-proposal/ui/PassoDosDescontos.tsx criado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx criado
apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx alterado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado

## Verificação

- Tipos `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros. Baseline 0, sem mudança.
- Tipos `npx tsc --noEmit -p packages/core/tsconfig.json` (CLAUDE.md): 11 erros, os mesmos do baseline por arquivo e código (comparados com `diff`). Nenhum novo.
- Tipos `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (CLAUDE.md): 7 erros, todos em `apps/backoffice/src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (TS2593/TS2304, faltam os globais do vitest). Esse arquivo já estava no commit `4c6e9a16` e esta tarefa não o tocou. Nenhum erro em arquivo tocado aqui.
- Um arquivo de teste por fatia, `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md › Comandos de verificação): todos verdes.
  - `order-proposals/handlers.test.ts`: 150/150
  - `montarPedido.descontos.test.tsx`: 10/10
  - `montagemComClientReal.test.tsx`: 14/14
  - `escritaSoPelaPorta` + `leituraSoComPapel`: 61/61
- Verificação mínima (CLAUDE.md › Baselines: a suíte de cada workspace tocado e a da loja; código de saída lido fora de pipe), todas com saída 0:

| Suíte | Arquivos | Testes |
|---|---|---|
| mobile-adm | 162 | 2580 |
| functions | 41 | 1561 |
| core | 229 | 5510 |
| backoffice | 288 | 5183 |
| store | 378 | 7091 |

- Lint `npx eslint .` em `apps/mobile-adm` (CLAUDE.md): 1 erro, `no-irregular-whitespace` em `src/pages/__tests__/montarPedido.pecas.test.tsx:110`. É da tarefa 07, não desta. O mesmo erro que eu tinha em `montarPedido.descontos.test.tsx` foi corrigido.

Instruções lidas:
- `CLAUDE.md` (raiz): já estava no contexto, inteira, inclusive as seções citadas.
- `apps/mobile-adm/CLAUDE.md`, por seção: › O que existe hoje, › O acesso, › A árvore, › Pedidos montados, › Montar pedido, › PWA, › Identidade, › Navegação, › Os guardas do app, › Testes.
- `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram, › Edge functions, › order-proposals e o pedido que nasce de uma proposta, › customer-parse. A seção › Secrets não foi lida: a tarefa não tocou secret.
- `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Os módulos, › Dinheiro, › customers, › order-actions, › proposals, › Convenções de tipo.
- `.specs/project/PROJECT.md` › Comandos de verificação e › Ambiente local.

## Divergências e descobertas

- Divergência dentro da própria tarefa: o Design traz textos de cupom ("Cupom não encontrado.", "Este cupom vale só para a primeira compra.") diferentes dos da loja, e o critério de aceite e o Contrato pedem "o texto da loja". Segui a loja (decisão 1).
- Divergência com o Contrato: o combinado que zera volta como 200 com `manual_refusal`, não como 422 (decisão 3).
- Citações conferidas, as duas deslocadas e relocalizadas pelo alvo: o `switch` de `handlers.ts:1087-1105` estava em ~1170 (a ação desconhecida em ~1197); `resumo` estava em 448 e `precificar` em 333 (a tarefa dizia 314).
- O comentário de `index.ts:3` não listava a ação `note`. Corrigi junto com a `preview`.
- O arnês do client real não alcança o passo 3: o `fetch` falso não devolve `Content-Range` e a leitura do catálogo falha. A prova da conta sem papel com o client real ficou na porta (decisão 11). Fica como lacuna para a revisão.
- Fora de escopo, não consertado:
  - os 7 erros de tipo no backoffice, em `ProposalStateBadge.test.tsx`, que contradizem a linha de baseline 0 do CLAUDE.md;
  - o erro de lint `no-irregular-whitespace` em `montarPedido.pecas.test.tsx`, da tarefa 07 (o baseline do app era 0/0).
- Documentação: acrescentei a ação `preview` na linha `order-proposals` da tabela de `supabase/CLAUDE.md`. Ficou de fora:
  - `couponLabel` na tabela de módulos de `packages/core/CLAUDE.md`: `coupons` nem aparece nela;
  - "Os passos 2 a 4 têm só o esqueleto" em `apps/mobile-adm/CLAUDE.md`, que já estava falso desde a 07;
  - o número de invocações aceitas pela porta dos montados (agora 7) na tabela de guardas do app.
  Os dois CLAUDE.md são da tarefa 10, pelo `waves.md`.
- Propagação: nenhuma afirmação das tarefas 09 e 10 ficou falsa. A 09 consome o resumo do `preview` (forma na decisão 5). A 10 guarda `estado.cupom` e o valor de `estado.combinado`, sem o motivo, como ela já prevê.
- Nenhuma fatia passou de primeira num teste que sobe infraestrutura. Todas são jsdom ou unidade, e todas levaram o check de mutação.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 08
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/mobile-adm/CLAUDE.md; supabase/CLAUDE.md (Migrations, RLS, Edge functions, order-proposals, customer-parse); packages/core/CLAUDE.md (Quando pertence, Pureza, Os módulos, Dinheiro, customers, order-actions, proposals, Convenções de tipo); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos:
  - preview recusa sem papel antes de ler, sem RPC nem gravação: supabase/functions/order-proposals/__tests__/handlers.test.ts (ACOES com 'preview' e "não chama RPC nem grava")
  - preview = resumo do save; cupom recusado com o texto da loja; sem e-mail "Este cupom pede o e-mail da cliente."; combinado que zera fora da conta; PIX: mesmo arquivo, describe('preview')
  - página real (cupom aplicar/remover, combinado R$/%, motivo depois da tentativa, recusa que zera fora da conta, cancelamento da prévia anterior, linha do PIX): apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx
  - client real, conta sem papel no preview ⇒ recusa: apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx, NA PORTA (o arnês não alcança o passo 3: o fetch falso não devolve Content-Range e o catálogo do passo 2 falha)
  - guardas: escritaSoPelaPorta.test.ts (ação preview, 7 invocações) e leituraSoComPapel.test.ts (régua 5: nenhum from('promotions'|'coupons'|'orders'), com sensores)
Verificações:
  - tsc: mobile-adm 0; core 11 (iguais ao baseline); backoffice 7, preexistentes em ProposalStateBadge.test.tsx, que esta tarefa não tocou
  - suítes completas com saída 0: mobile-adm 2580/162 · functions 1561/41 · core 5510/229 · backoffice 5183/288 · store 7091/378
  - lint do mobile-adm: 1 erro preexistente da 07 (montarPedido.pecas.test.tsx:110)
Árvore de trabalho: function order-proposals (ação preview, D-29 em precificar, index.ts comentário); core/coupons/label.ts (couponLabel) + barril; backoffice model/coupon.ts delega a core; app: porta conferirResumo, model/descontos.ts, useResumoDaMontagem, useAplicarCupom, ui/PassoDosDescontos.tsx, montagem.ts (cupom e combinado), tipos.ts, MontarPedidoPage (passo 3, total da barra, tentativa); testes e guardas; supabase/CLAUDE.md (linha da order-proposals). Nada commitado.
Citações conferidas: 7 abertas. Duas deslocaram e foram relocalizadas pelo alvo: o switch de handlers.ts:1087-1105 (em ~1170) e precificar em :314 (em 333). Nenhuma morta.
```

## T08 — wi-impl-review · fixing · agente a6068dd7a529f3f64

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/08-passo-descontos-e-preview.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | `teste que não morde` | atrapalha | `apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx:281` (e a fiação sem prova em `apps/mobile-adm/src/pages/MontarPedidoPage.tsx:133`) | O teste "conta sem papel" só prova que `conferirResumo` lança a recusa. Ninguém prova que a tela chega à vigia. Os dois erros novos, `resumo.erroBruto` e `cupomAplicavel.erroBruto`, entram no array de `useRecusaDePapel` na linha 133. Se os dois saírem do array, todos os testes continuam verdes. No passo 3 nenhuma outra leitura está ativa (o catálogo só lê no passo 2). Sem essa fiação, a conta sem papel continuaria na tela com o resumo antigo, sem recusa e sem falha. A premissa 11 diz que é "o mesmo caminho das outras portas, já provado". Não é: cada hook novo tem a sua própria entrada no array, e a porta da leitura do texto foi provada pelo `<App />` (linha 165 do mesmo arquivo). A prova pela página com o dublê era possível: `montarPedido.descontos.test.tsx` já monta o `<App />`, chega ao passo 3, e o dublê tem `falharRpc`/`responderRpc` para o `atelie_clock`. | Bloco Testes: "Client real (app): conta sem papel no `preview` ⇒ a recusa." · Obrigações: "recusa só pelo `42501` de `conferirPapel`" |
| 2 | `identificador de processo` | atrapalha | `supabase/functions/order-proposals/handlers.ts:1223`, `:1235`; `apps/mobile-adm/src/features/order-proposal/model/useAplicarCupom.ts:20`; `apps/mobile-adm/src/features/order-proposal/model/useResumoDaMontagem.ts:23` | Comentários novos citam as chaves de decisão do Work Item ("D-02", "D-29"). Nenhum outro arquivo de `apps/mobile-adm/src` cita uma chave dessas. | regra do workflow: identificador de processo não entra no código |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o resumo do passo 3 vem do `preview`, com cupom, desconto combinado e PIX | `handlers.ts` › `preview`/`pixDosItens`; `useResumoDaMontagem.ts`; `PassoDosDescontos.tsx` (linhas do resumo e `resumo-pix`); `MontarPedidoPage.tsx` (total da barra) | sim |
| as recusas têm o texto da loja e não entram na conta | cupom: 422 `coupon_refused` com o texto de `couponRefusal`/`precificar`, mais `COUPON_NEEDS_EMAIL`. Combinado: `recusaDoCombinado` e a segunda conta sem ele, com `manual_refusal`. App: o cupom só entra se a prévia o devolve; o cupom recusado no resumo vivo sai do estado | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `handlers.test.ts` (preview), `montarPedido.descontos.test.tsx`, `montagemComClientReal.test.tsx`, os dois guardas | em parte (achado 1) |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- Toda function do app por uma porta com nome literal por ação; recusa só pelo `42501`; rede é falha. Aplicada: `conferirResumo` em `portaDePropostas.ts` com `'order-proposals?action=preview'` literal, pela tradução de `shared/api/traduzir.ts`. `escritaSoPelaPorta` foi ampliado para 7 invocações. A fiação da recusa na tela não tem prova (achado 1).
- Toda leitura do app por `lerComPapel`. Aplicada: o diff não faz leitura de tabela nova no app. A régua 5 de `leituraSoComPapel` recusa `from('promotions'|'coupons'|'orders')`.
- Tom memorial e `motion-reduce:`. Aplicada: não há `!` nem emoji nos literais novos, e `PassoDosDescontos.tsx` não tem `transition-*`/`animate-*`.
- Prova de layout é de navegador. Não se aplica aqui (fica para a QA).
- O gate inclui as suítes da loja e do painel. Só execução.
- `index.ts` só wiring. Aplicada: só o comentário mudou (`index.ts:3`).

## Testes

- Functions: `preview` recusa sem papel antes de ler qualquer coisa e não chama RPC nem grava. Está em `handlers.test.ts`: `preview` entrou em `ACOES`, então os casos 401/403/has_role falhando asserem `reads=[]` e nada escrito; o caso "não chama RPC nem grava" assere `rpcs=['has_role']` e as tabelas abertas. Morde.
- Functions: mesmo resumo que o `save` e a recusa do cupom com o texto da loja. Está em `handlers.test.ts`: o resumo da prévia é comparado `toEqual` com o do `save`; primeira compra com e sem compra anterior; "Este cupom pede o e-mail da cliente." com e-mail vazio e com e-mail inválido, sem abrir `orders`. Morde.
- Página real: aplicar e remover cupom; combinado em R$ e em %; motivo obrigatório depois da tentativa; recusa que zera fora da conta; cancelamento (pelo `signal.aborted` e pela resposta atrasada descartada); a linha do PIX. Está em `montarPedido.descontos.test.tsx`, com os números escritos à mão no dublê. Morde.
- Client real: conta sem papel no `preview` ⇒ a recusa. Está em `montagemComClientReal.test.tsx:249-302`, mas só na porta. Não morde na fiação da tela (achado 1).
- Guardas: `escritaSoPelaPorta.test.ts` (com `preview` na régua, a âncora em 7 e o sensor) e `leituraSoComPapel.test.ts` (régua 5 pela AST, com âncora e sensores). Mordem.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Texto da loja ("Cupom inválido.", "Cupom válido apenas no primeiro pedido.") no lugar das frases do Design | sim | O critério diz "Cupom com a regra e os textos da loja", e o Contrato diz "422 com o texto da loja" | sim; a tarefa 09 não cita esses textos |
| 2 | `COUPON_NEEDS_EMAIL` dentro de `precificar` (vale também no `save` e no `renew`) | sim | D-29 cita `handlers.ts:423` de `precificar`. O `save` exige e-mail válido antes de precificar (`handlers.ts:787`). O Contrato diz "Consuma", não "não altere" | sim |
| 3 | Combinado que zera: 200 com `manual_refusal` no lugar de 422 | sim | O Design diz "aparece logo e não entra na conta". Com 422 não haveria resumo sem o desconto | sim; a tarefa 09 só diz "o resumo pelo `preview`" |
| 4 | O motivo não vai à prévia (`MOTIVO_DA_PREVIA`) | sim | Atende "Não guarde o motivo". O teste assere que o motivo não está no corpo enviado | sim |
| 5 | A resposta é `{summary, coupon, manual_refusal, items_pix}` e não `resumo()` puro | sim | `resumo()` (`handlers.ts:498`) não traz o PIX nem o cupom para nomear, e o critério pede os dois. A conta do PIX é a mesma do `create-payment` (`proposalPricing`) | sim (tarefa 09 e `tipos.ts`) |
| 6 | "Aplicar" pela mesma prévia; o cupom recusado no resumo vivo sai do estado | sim | D-02 diz que o app não lê cupons | sim |
| 7 | `couponLabel` em `core`, com o painel delegando | sim | `packages/core/CLAUDE.md` › Quando um código pertence: "Dois consumidores leem a mesma regra". A saída do painel ficou igual. `label.ts` usa `.ts` explícito e entra no grafo do `denoReach` pelo `index.ts` | sim |
| 8 | `cupom` e `combinado` no estado, mantidos ao trocar o segmento e ao desfazer a leitura | sim | Mesmo tratamento que `pecas` já tinha no redutor. Ao trocar a cliente, o resumo vivo confere o cupom de novo com o e-mail novo | sim (tarefa 10) |
| 9 | Total da barra pela prévia; "Continuar" ligado no passo 3; o motivo só depois da tentativa | sim | É o que o Design pede | sim |
| 10 | Hook próprio com `AbortController` e o `signal` no `invoke` | sim | D-02: "com a anterior cancelada". O teste vê o `signal.aborted` | sim |
| 11 | A prova com o client real ficou só na porta | em parte | A escolha do nível se sustenta: o arnês do client real não alcança o passo 3. A frase "o mesmo caminho das outras portas, já provado" não se sustenta: a fiação de `resumo.erroBruto`/`cupomAplicavel.erroBruto` (`MontarPedidoPage.tsx:133`) é nova e ficou sem prova, e a página com o dublê podia prová-la (achado 1) | sim |

## Não conferido

- Se as suítes, o `tsc` e os guardas da loja e do painel passam. Só a execução mostra.
- Se o `supabase.functions.invoke` da versão instalada repassa `signal` ao `fetch`. O teste só vê a opção registrada pelo dublê.
- `apps/mobile-adm/src/features/order-proposal/model/montagem.ts`, `tipos.ts`, `portaDePropostas.ts`, `index.ts` e `MontarPedidoPage.tsx` também foram tocados por tarefas anteriores da corrida. Julguei só o que esta tarefa explica no diff.
- Todos os arquivos de `alterados` aparecem no `git diff` (os novos com intent-to-add). Não houve arquivo sem baseline.

Instruções lidas: `CLAUDE.md` (raiz, recebido inteiro no contexto); `apps/mobile-adm/CLAUDE.md` › Pedidos montados (WI 94), › Montar pedido (WI 94), › Identidade, › Navegação, › Os guardas do app, › Testes; `supabase/CLAUDE.md` › Edge functions, › order-proposals e o pedido que nasce de uma proposta; `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › proposals, › Convenções de tipo. Não li `supabase/CLAUDE.md` › Migrations, › RLS e › Secrets, nem `packages/core/CLAUDE.md` › Os módulos, › Dinheiro e › customers: o diff não tem migration nem secret, e não toca dinheiro de `core` nem `customers`.

## T08 — wi-impl-task · done · agente a11f15a9222fb8f5d

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/08-passo-descontos-e-preview.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 11 | A recusa do `preview` tem duas provas. A porta é provada sobre o client real (`montagemComClientReal.test.tsx`), e o 403 do `preview` com `atelie_clock` em `42501` chega à vigia e leva ao Login. Agora isso também se prova pela página real com o dublê (`montarPedido.descontos.test.tsx`, "passo 3 · a conta sem papel"), um caso para o resumo vivo e outro para o "Aplicar". Ficou declarado que cada hook novo (`resumo.erroBruto`, `cupomAplicavel.erroBruto`) precisa da própria prova na vigia. | A afirmação anterior, de que era "o mesmo caminho das outras portas, já provado". | O achado 1 está certo: cada hook tem a sua entrada no array de `useRecusaDePapel`, e no passo 3 não há outra leitura ativa. | Só os testes. Nenhuma mudança de código de produção. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 4 | Conta sem papel no `preview` (resumo vivo e "Aplicar") ⇒ a recusa da tela de entrada (Login), nunca a frase de falha do resumo ou do cupom | Página real (app) + porta sobre o client real | `apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx` › "passo 3 · a conta sem papel" (2 casos) · `apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx` (a porta) | sim | vermelho: tirar `resumo.erroBruto` do array da vigia derruba o caso do resumo; tirar `cupomAplicavel.erroBruto` derruba o caso do "Aplicar". O arquivo foi restaurado pela cópia e conferido com `cmp`. |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

Na correção:
apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx alterado
apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx alterado
apps/mobile-adm/src/features/order-proposal/model/useAplicarCupom.ts alterado
apps/mobile-adm/src/features/order-proposal/model/useResumoDaMontagem.ts alterado
supabase/functions/order-proposals/handlers.ts alterado

Lista completa da tarefa (implementação e correção):
supabase/functions/order-proposals/handlers.ts alterado
supabase/functions/order-proposals/index.ts alterado
supabase/functions/order-proposals/__tests__/handlers.test.ts alterado
supabase/CLAUDE.md alterado
packages/core/src/coupons/label.ts criado
packages/core/src/coupons/index.ts alterado
apps/backoffice/src/features/order-proposal/model/coupon.ts alterado
apps/mobile-adm/src/features/order-proposal/api/portaDePropostas.ts alterado
apps/mobile-adm/src/features/order-proposal/index.ts alterado
apps/mobile-adm/src/features/order-proposal/model/montagem.ts alterado
apps/mobile-adm/src/features/order-proposal/model/tipos.ts alterado
apps/mobile-adm/src/features/order-proposal/model/descontos.ts criado
apps/mobile-adm/src/features/order-proposal/model/useResumoDaMontagem.ts criado
apps/mobile-adm/src/features/order-proposal/model/useAplicarCupom.ts criado
apps/mobile-adm/src/features/order-proposal/ui/PassoDosDescontos.tsx criado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx criado
apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx alterado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado

## Verificação

Todos os comandos vêm do arquivo de instruções (CLAUDE.md › Comandos/Baselines) e do PROJECT.md › Comandos de verificação.

**Os testes dos arquivos alterados:**
- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.descontos.test.tsx --testTimeout=20000`: 12/12. O check de mutação foi feito nas duas entradas da vigia.
- `pnpm --filter @estrelinha/functions exec vitest run functions/order-proposals/__tests__/handlers.test.ts --testTimeout=20000`: 150/150. A correção só mexeu em comentários.

**A conferência de tipos e o lint:**
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json`: 0 erros, o mesmo do baseline.
- `npx eslint .` em `apps/mobile-adm`: 1 erro, que já existia em `montarPedido.pecas.test.tsx:110` (tarefa 07). Nenhum erro novo.

**As suítes inteiras** (saída 0, lida fora de pipe):
- mobile-adm: 2582/162.
- store: 7091/378.

Instruções lidas: as mesmas da implementação, sem releitura.

## Divergências e descobertas

- Achado 1 aceito. A afirmação de que a fiação estava "já provada" não era verdade. O mutante do revisor (tirar as duas entradas do array) passava. Agora cada entrada tem um caso que a derruba.
- Achado 2 aceito. Saíram "D-02" e "D-29" dos comentários de `handlers.ts`, `useAplicarCupom.ts` e `useResumoDaMontagem.ts`. Ficaram as citações `AD-070` e `AD-034` que já estavam no cabeçalho de `handlers.ts` antes desta tarefa: são decisões de arquitetura do projeto, citadas no código pelo repositório inteiro.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 08
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/mobile-adm/CLAUDE.md; supabase/CLAUDE.md (Migrations, RLS, Edge functions, order-proposals, customer-parse); packages/core/CLAUDE.md (Quando pertence, Pureza, Os módulos, Dinheiro, customers, order-actions, proposals, Convenções de tipo); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos:
  - preview recusa sem papel antes de ler, sem RPC nem gravação: supabase/functions/order-proposals/__tests__/handlers.test.ts (ACOES com 'preview' e "não chama RPC nem grava")
  - preview = o resumo do save; o cupom recusado com o texto da loja; sem e-mail, "Este cupom pede o e-mail da cliente."; o combinado que zera fora da conta; o PIX: mesmo arquivo, describe('preview')
  - página real (aplicar e remover o cupom; o combinado em R$ e em %; o motivo depois da tentativa; a recusa que zera fora da conta; o cancelamento da prévia anterior; a linha do PIX; a conta sem papel no resumo vivo e no "Aplicar" ⇒ a recusa): apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx
  - client real, conta sem papel no preview ⇒ a recusa: apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx, na porta (o arnês não chega ao passo 3: o catálogo pede o Content-Range). Que a recusa chega à vigia é provado pela página real, acima.
  - guardas: escritaSoPelaPorta.test.ts (a ação preview, 7 invocações) e leituraSoComPapel.test.ts (a régua 5: nenhum from('promotions'|'coupons'|'orders'), com sensores)
Verificações:
  - tsc: mobile-adm 0; core 11 (os mesmos do baseline); backoffice 7, que já existiam em ProposalStateBadge.test.tsx (arquivo que esta tarefa não tocou)
  - suítes, saída 0: mobile-adm 2582/162 e store 7091/378 (remedidas na correção); functions 1561/41, core 5510/229 e backoffice 5183/288 (da implementação)
  - lint do mobile-adm: 1 erro que já existia, da 07
Árvore de trabalho:
  - function order-proposals: a ação preview, a recusa sem e-mail em precificar e o comentário do index.ts
  - core: coupons/label.ts (couponLabel) e o barril; o rotuloDoCupom do backoffice agora chama ele
  - app: a porta conferirResumo, descontos.ts, useResumoDaMontagem, useAplicarCupom, PassoDosDescontos, o cupom e o combinado em montagem.ts, tipos.ts, e o passo 3 na MontarPedidoPage
  - testes e guardas; supabase/CLAUDE.md (a linha da order-proposals)
  - nada commitado
Citações conferidas: 7 abertas; duas deslocadas e relocalizadas pelo alvo (o switch de handlers.ts:1087-1105, em ~1170; precificar :314, em 333); nenhuma morta
```

## T09 — wi-impl-task · review · agente ad4e121c9f4d5b4de

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/09-revisar-e-criar-link.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A cotação é uma porta própria (`api/portaDaCotacao.ts`, literal `'melhor-envio?action=quote'`) chamada por uma LEITURA `lerCotacao` dentro de `lerComPapel`. A recusa da conta sem papel vem da `atelie_clock` (`42501`) | Recusa só pela tradução 401/403 da porta | A `quote` é pública na function: ela nunca devolve 403, então sem `lerComPapel` a conta sem papel nunca seria recusada na cotação. "Toda leitura do app por `lerComPapel`" | `useCotacaoDaRevisao.ts`, `escritaSoPelaPorta`, `leituraSoComPapel` (14 importadores do client) |
| 2 | Editar entra na MESMA rota `/pedidos/montar`, com a proposta marcada em memória de módulo (`model/montadoEmEdicao.ts`: `marcarEdicao` / `edicaoMarcada` / `esquecerEdicao`), com o mesmo `state` `{ doApp: true, passoDaMontagem: 0 }` | Rota nova `/pedidos/montados/:id/editar` (mexe em `App.tsx`, `pedidosHref.ts` e em três guardas, fora da posse); id no `history.state` (o guarda `semDadoDeClienteNoAparelho` recusa uma terceira chave); id na URL | Mais fácil de desfazer e menor superfície. Custo: F5 durante a edição perde a marca e a montagem recomeça vazia como criação (o título deixa de ser "Editar pedido montado") | MontarPedidoPage e PedidoMontadoPage; a tarefa 10 (o rascunho não deve sobrescrever a montagem reaberta) |
| 3 | O desfecho da gravação (o aviso "Link criado." / "Alterações salvas." e, ao criar, o link da resposta do `save`) passa ao pedido montado por memória de módulo (`deixarDesfecho` / `tomarDesfecho`), presa ao id e à conta. `useAcoesDoMontado` lê esse desfecho na primeira renderização. O efeito de troca de conta passou a disparar só quando a conta MUDA (antes também rodava na montagem e apagava o aviso inicial) | Passar pelo `history.state`, ou exigir a cifra para o link aparecer | Sem `PROPOSAL_TOKEN_KEY`, o token só existe na resposta do `save`. Memória não é armazenamento | `useAcoesDoMontado.ts`, PedidoMontadoPage |
| 4 | Navegação depois de gravar. Criar: `navigate(pedidoMontadoHref(id), { replace: true })`, sem `doApp`. Editar: `passos.sair()`, que recua até a entrada do pedido montado de onde o Editar saiu | Recuar até `/pedidos` e depois empilhar o pedido (duas navegações com `history.go` assíncrono) | Não há como recuar e empilhar com segurança. Custo: o voltar do Android a partir do pedido criado cai na entrada do passo 3, e a montagem recomeça vazia (o comportamento de F5 já documentado); o "voltar" do cabeçalho leva à visão Montados | MontarPedidoPage |
| 5 | O `save` leva `expected_total` = o `items_total` da última prévia. O passo 4 fica bloqueado com "Conferindo o resumo…" até haver prévia. O bloqueio do passo 4 soma os motivos dos passos 1, 2 e 3 e o `adminNoteRefusal` da observação | Mandar sem total | A gravação exige o total que a Adri viu (PRC-02) | `model/revisao.ts` › `motivoDaRevisao` |
| 6 | Num 409 `prices_changed`: mostrar a frase da function no topo, reler a prévia (`resumo.tentarDeNovo`) e reler o catálogo (`reprecificar`: preço, foto e medidas de cada linha). Não desenhar o `summary` do 409 à parte | Desenhar o `summary` do 409 diretamente | A prévia é a mesma `precificar` do `save`; um dono só para os números na tela | `useCriarLink.precosMudaram` (contador) |
| 7 | Outra falha: `PROPOSAL_SAVE_FAILED` para 5xx e rede. Num 4xx com frase (409 `not_open`, 422 de cupom etc.) mostra a frase da function | Sempre a frase genérica | A frase específica é a que o painel já mostra (`motivoDaFalha`) e diz o que fazer | `useCriarLink.ts` |
| 8 | `save_address` = entrega "Outro endereço" (digitado agora) e "Salvar no cadastro" ligado. O endereço salvo da ficha nunca é salvo de novo. Na cliente cadastrada, `customer_document` vai `null` | Seguir o interruptor em qualquer entrega | Molde do painel (`toSavePayload`: o salvo já está na ficha). O app não lê o documento da ficha (D-16) | `revisao.ts` › `corpoDoSave` |
| 9 | Editar reabre a montagem a partir do `get`. Com `customer_id`: a cadastrada (`pedidos: 0`). Sem `customer_id`: a cliente nova com o contato gravado. Entrega "Outro endereço" com o endereço gravado (ou "no link"), "Salvar no cadastro" desligado. Peças com `list_price`, a foto gravada e medidas nulas. Volta o combinado com o motivo, e a observação. O cupom volta como CÓDIGO e é reconferido pela prévia (`useAplicarCupom`) | Recriar o cupom sem conferir | O app não tem a regra do cupom, e ela pode ter mudado. Custo: o passo 1 da edição mostra "0 pedidos" para a ficha | `revisao.ts` › `montagemDoMontado`; `PecaDoMontado`/`PedidoMontado` ganharam campos que o `get` já devolve |
| 10 | A nota "O link vale 7 dias, até dd/mm" usa o relógio do SERVIDOR (`useRelogioDaMontagem`, que é `lerComPapel` sobre `atelie_clock`). Sem ele, a frase sai sem o dia. No Editar, a nota é "Editar mantém o link…" | Relógio do aparelho | Nenhuma conta de prazo pelo relógio do aparelho | `revisao.ts` › `notaDaRevisao` |
| 11 | A prévia do frete não mostra a retirada no escritório. "grátis" só com cupom de frete grátis | Ler `store_settings` no app para a retirada | Fora do critério de aceite; seria uma leitura a mais | `PassoRevisar.tsx` |
| 12 | `LinhaDaSacola` ganhou `medidas` (as da peça, com o peso da variação) para o corpo da cotação via `toQuoteProducts` | Medidas padrão sempre | O peso move o preço (`quotePayload.ts`) | `sacola.ts`, `linhaDaEscolha`, e a fixture de `montagem.desfazer.test.ts` |
| 13 | "Editar" fica ao lado de "Cancelar este pedido" numa grade `auto-fit`, com fundo `ink` | — | Design ("ao lado") | PedidoMontadoPage |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | A revisão mostra as peças com foto primeiro, depois cliente e entrega, cada bloco com "Alterar" levando ao passo certo | página real (app) | `pages/__tests__/montarPedido.revisar.test.tsx` › "as peças vêm primeiro…", "%s leva ao passo certo" (3 casos) | sim | não vi o vermelho antes (a implementação veio antes do teste) |
| 2 | A prévia da cotação só aparece com endereço completo | página real (app) | idem › "com CEP e rua, a prévia do frete…", "sem endereço…" | sim | vermelho (`enderecoCotavel` trocado para `true`) |
| 3 | Criar link manda a escolha com `save_address` e a observação e abre o pedido montado; ficha nova | página real (app) | idem › "manda a escolha com `save_address`…", "cliente nova com o endereço digitado…", "Criando o link… desligado" | sim (a da cliente nova falhou primeiro, por defeito da fixture `customer_list`) | vermelho (`save_address` sem o recorte da entrega; `tomarDesfecho` → `null`) |
| 4 | 409 mostra a frase da PRC-02 com o resumo relido; outra falha mostra a frase de "nada foi enviado" | página real (app) | idem › "preço mudado no servidor (409)…", "outra falha…" | sim | vermelho (sem `resumo.tentarDeNovo()`) |
| 5 | Editar de um pedido montado aberto abre a montagem preenchida e salva mantendo o link | página real (app) | idem › "Editar abre a montagem preenchida…", "o pedido montado concluído não oferece Editar" | sim | vermelho (`observacao` não reaberta) |
| 6 | Conta sem papel no `save` e na cotação ⇒ a recusa; rede caída é falha | client real (app) | `app/__tests__/montagemComClientReal.test.tsx` › "a gravação do passo 4 (`save`)…" (5) e "a prévia do frete do passo 4…" (4) | sim | vermelho (`lerCotacao` sem `lerComPapel`: 3 casos falharam) |
| 7 | Guardas: `escritaSoPelaPorta` (porta da cotação e ação `save`), tom e movimento | guarda | `escritaSoPelaPorta.test.ts` (caso novo da porta da cotação), `leituraSoComPapel.test.ts`, `movimentoDosPedidos.test.ts`, `tomMemorialDosMontados.test.ts` (alcança a pasta), `semDadoSensivelDeClienteNoApp.test.ts` (sensor novo) | sim | não se aplica (guarda de fonte; o sensor novo prova os dois sentidos) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/api/portaDaCotacao.ts criado
apps/mobile-adm/src/features/order-proposal/model/montadoEmEdicao.ts criado
apps/mobile-adm/src/features/order-proposal/model/revisao.ts criado
apps/mobile-adm/src/features/order-proposal/model/useCotacaoDaRevisao.ts criado
apps/mobile-adm/src/features/order-proposal/model/useCriarLink.ts criado
apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx criado
apps/mobile-adm/src/pages/__tests__/montarPedido.revisar.test.tsx criado
apps/mobile-adm/src/features/order-proposal/api/portaDePropostas.ts alterado
apps/mobile-adm/src/features/order-proposal/index.ts alterado
apps/mobile-adm/src/features/order-proposal/model/montagem.ts alterado
apps/mobile-adm/src/features/order-proposal/model/sacola.ts alterado
apps/mobile-adm/src/features/order-proposal/model/tipos.ts alterado
apps/mobile-adm/src/features/order-proposal/model/useAcoesDoMontado.ts alterado
apps/mobile-adm/src/features/order-proposal/model/useMontados.ts alterado
apps/mobile-adm/src/features/order-proposal/model/__tests__/montagem.desfazer.test.ts alterado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/pages/PedidoMontadoPage.tsx alterado
apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx alterado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/movimentoDosPedidos.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoSensivelDeClienteNoApp.test.ts alterado

## Verificação

- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (instruções, `CLAUDE.md` §Comandos): exit 0, 0 erros. O `baseline` não veio na entrada e não foi capturado antes da primeira edição. A primeira rodada (já com edições) acusou erros só meus, consertados. O `CLAUDE.md` registra 0 para o mobile-adm, e o final é 0: nada mudou contra ele.
- `pnpm --filter @estrelinha/mobile-adm exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md › Comandos de verificação), por arquivo: `montarPedido.revisar.test.tsx` 13/13; `montagemComClientReal.test.tsx` 23/23; os 5 guardas, 131/131.
- Verificação mínima (instruções, `CLAUDE.md` §Baselines: a suíte do workspace tocado mais a da loja e a do painel, um por vez, exit fora de pipe):
  - `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000`: exit 0, 2608/163;
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: exit 0, 7091/378;
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: exit 0, 5183/288.
- `npx eslint .` em `apps/mobile-adm` (instruções §Baselines): 1 erro, que não é meu — `no-irregular-whitespace` em `src/pages/__tests__/montarPedido.pecas.test.tsx:110` (da tarefa 07). O meu, o mesmo NBSP em `montarPedido.revisar.test.tsx`, foi consertado.
- Nenhum timeout.

Instruções lidas: `CLAUDE.md` (raiz, no contexto) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `apps/mobile-adm/CLAUDE.md` (inteiro); `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram, › Edge functions (com `order-proposals` e o pedido que nasce de uma proposta, e `melhor-envio` — cotação e etiquetas), › Secrets; `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- Ciclo invertido: a implementação foi escrita antes do teste da página. O vermelho foi provado depois, pelo check de mutação (6 mutantes, todos vermelhos, restaurados pela cópia e conferidos com `cmp`). A fatia 1 (ordem dos blocos e "Alterar") ficou sem mutação própria: a revisão adversarial deve ler essas asserções sabendo que ninguém viu o vermelho delas.
- A `melhor-envio?action=quote` é pública (sem `requireAdmin`). A obrigação "recusa só pelo 42501 de `conferirPapel`" na cotação só se cumpre porque a cotação roda como leitura dentro de `lerComPapel` (decisão 1).
- Lint do mobile-adm: a baseline do `CLAUDE.md` é 0/0, e a árvore tem 1 erro vindo da tarefa 07 (`montarPedido.pecas.test.tsx:110`, um NBSP literal na regex). Não consertado: não é desta tarefa.
- `apps/mobile-adm/CLAUDE.md` › "Montar pedido" ainda diz "Os passos 2 a 4 têm só o esqueleto". Não editei: a documentação do app é da tarefa 10 (ela atualiza `apps/mobile-adm/CLAUDE.md`), que deve descrever os passos 2 a 4, o Editar, a porta da cotação e a memória `montadoEmEdicao`.
- Guardas ampliados, com âncoras e contagens:
  - `escritaSoPelaPorta`: catorze importadores do client, `save` nas ações dos montados (8 invocações), porta da cotação (1);
  - `leituraSoComPapel`: 14 importadores, os montados com 8 invocações, régua 3 para a cotação;
  - `movimentoDosPedidos`: 47 arquivos, com `PassoRevisar.tsx`; tokens e pares sem mudança (24/22);
  - `semDadoSensivelDeClienteNoApp`: três exceções exatas em `model/revisao.ts` (o documento no corpo do `save` e no Editar, D-16). A régua "UMA vez cada" passou a valer por arquivo, com sensor novo.
- Nada ficou sem execução por falta de ambiente local: a tarefa não tem migration nem probe. Os testes usam o dublê e o supabase-js real com `fetch` falso.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 09
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; apps/mobile-adm/CLAUDE.md (inteiro); supabase/CLAUDE.md › Migrations, RLS — o molde que os guardas cobram, Edge functions (order-proposals e o pedido que nasce de uma proposta; melhor-envio), Secrets; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - revisão (peças com foto primeiro, cliente, entrega, "Alterar" no passo certo; prévia só com endereço completo): apps/mobile-adm/src/pages/__tests__/montarPedido.revisar.test.tsx (describe "passo 4 · a revisão", 7 casos)
  - Criar link (`save_address` + observação, abre o pedido montado; ficha nova; 409 com a frase da PRC-02 e o resumo relido; outra falha "nada foi enviado"; "Criando o link…"): idem (describe "passo 4 · Criar link", 5 casos)
  - Editar (montagem preenchida pelo `get`, salva com id/version e mantém o link; concluída sem Editar): idem (describe "Editar um pedido montado aberto", 2 casos)
  - client real (conta sem papel no `save` e na cotação ⇒ recusa; rede caída ⇒ falha): apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx (9 casos novos)
  - guardas: escritaSoPelaPorta (porta da cotação, ação `save`), leituraSoComPapel, movimentoDosPedidos (+PassoRevisar), tomMemorialDosMontados (alcança a pasta), semDadoSensivelDeClienteNoApp (exceções do passo 4 + sensor)
  - sem cobertura: layout (44 px, sem rolagem lateral) é da QA em navegador; a retirada no escritório na prévia do frete não foi implementada (fora dos critérios)
Verificações: tsc do mobile-adm 0; mobile-adm 2608/163 exit 0; store 7091/378 exit 0; backoffice 5183/288 exit 0; eslint mobile-adm 1 erro, que é da tarefa 07 (montarPedido.pecas.test.tsx:110)
Árvore de trabalho: 7 arquivos criados e 15 alterados em apps/mobile-adm/src (lista em Arquivos alterados); nada commitado
Citações conferidas: 5 abertas ao usá-las (portaDePropostas.ts, shippingPreview.ts:26-53 › quoteBody, core/shipping › toQuoteProducts, handlers.ts › save/prices_changed, que deslocou: agora em :817-818, e core/proposals/link.ts › PROPOSAL_SAVE_FAILED); nenhuma morta
Caducou: 04 · o comentário de PedidoMontadoPage dizia que "Editar" é de outra tarefa · esta tarefa o implementou (o comentário do código foi atualizado; o arquivo da tarefa 04 não foi reescrito)
```

## T09 — wi-impl-review · fixing · agente ab52928492a672354

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/09-revisar-e-criar-link.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | `teste que não morde` | atrapalha | `apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx:304-427`; fiação sem prova em `apps/mobile-adm/src/pages/MontarPedidoPage.tsx:221,223` | Os casos "conta sem papel" do `save` e da cotação só provam que a PORTA lança `recusa()` (`salvarMontado`/`lerCotacao` chamados direto). Nenhum teste prova que a tela chega à recusa: tirar `criar.erroBruto` ou `cotacao.consulta.error` da lista de `useRecusaDePapel` deixa a suíte verde, e a conta sem papel tocaria "Criar link" sem ver nada (o hook só grava `erroBruto` e devolve `null`). O comentário em `montagemComClientReal.test.tsx:305-307` diz que isso "é provado pela página real, em `pages/__tests__/montarPedido.revisar.test.tsx`", mas esse arquivo não tem nenhum caso com `42501`/`SEM_ACESSO`. A tarefa 08 tem o caso equivalente da prévia pela página (`montarPedido.descontos.test.tsx:386-408`) | Testes: "Client real (app): conta sem papel no `save` e na cotação ⇒ a recusa; rede caída é falha." |
| 2 | `identificador de processo` | atrapalha | `apps/mobile-adm/src/shared/lib/__tests__/semDadoSensivelDeClienteNoApp.test.ts:40` | O comentário novo cita a chave de decisão da spec "D-16" ("o documento vai ao cadastro da cliente NESTA gravação, D-16"). O implement-log já registrou essa mesma classe numa rodada anterior (as chaves D-xx e "WI 94" no código). `git grep` na HEAD não acha "D-16" em `apps/mobile-adm/src`, então a ocorrência é nova | regra do workflow: identificador de processo não entra no código |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a Adri cria o link pela revisão, com a ficha e o endereço gravados juntos | `revisao.ts:95-132` (`corpoDoSave`, com `save_address` e a observação); `portaDePropostas.ts` › `salvarMontado` (`order-proposals?action=save`); `MontarPedidoPage.tsx` › `gravar`. A RPC grava a proposta e o endereço numa transação (`handlers.ts:858-860`) | sim |
| a recusa de preço e a falha têm as frases e não deixam nada pela metade | `useCriarLink.ts`: o 409 `prices_changed` mostra a frase da function e soma ao contador; o 5xx e a rede caem em `PROPOSAL_SAVE_FAILED`; o 4xx com frase mostra a frase. A página relê a prévia e o catálogo (`reprecificar`). Uma gravação só no servidor | sim |
| Editar reabre a montagem preenchida e salva no mesmo link | `PedidoMontadoPage.tsx` (Editar → `marcarEdicao` e navega); `revisao.ts:144-204` (`montagemDoMontado`); `MontarPedidoPage` (`carregar`, alvo `editar` com `id`/`version`, sem `idempotency_key`; o `get` não gera token) | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `montarPedido.revisar.test.tsx`, `montagemComClientReal.test.tsx` e os guardas; a recusa na tela ficou sem cobertura (achado 1) | não (achado 1) |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

- **Function por porta com nome literal; recusa só pelo `42501`; rede é falha.** Aplicada. `portaDaCotacao.ts` usa `'melhor-envio?action=quote'` e `portaDePropostas.ts` usa `'order-proposals?action=save'`, as duas pela tradução `traduzir`. `escritaSoPelaPorta` aceita as duas, com sensor.
- **Toda leitura por `lerComPapel`.** Aplicada. `lerCotacao` e `useRelogioDaMontagem` passam por `lerComPapel`; o detalhe do Editar já passava (`useMontado`). `leituraSoComPapel` ganhou a régua da porta da cotação.
- **Tom memorial e `motion-reduce:`.** Aplicada. Os literais novos de `revisao.ts` e `PassoRevisar.tsx` não têm `!`, emoji nem urgência. `PassoRevisar.tsx` não tem animação e entrou no escopo de `movimentoDosPedidos`. `tomMemorialDosMontados` varre `features/order-proposal/`.
- **Prova de layout é de navegador.** Não se aplica aqui (é da QA).
- **O gate inclui as suítes da loja e do painel.** Só execução.

## Testes

- **Revisão: peças com foto primeiro, cliente e entrega, "Alterar" leva ao passo certo; prévia só com endereço completo.** `montarPedido.revisar.test.tsx:172-227`. Morde: confere a ordem dos blocos por igualdade, o `src` da foto, o destino de cada "Alterar" (`it.each`), o corpo exato da cotação e a ausência de chamada sem endereço.
- **Criar link com `save_address` e a observação; abre o pedido montado; 409 com a frase e o resumo relido; outra falha com "nada foi enviado".** `montarPedido.revisar.test.tsx:230-351`. Morde: confere `save_address` falso (endereço salvo) e verdadeiro (ficha nova), a observação aparada, o total relido (`[120, 132]`), a mesma chave de idempotência, a frase do 500 e a trava do segundo toque. A releitura da SACOLA no 409 (`reprecificar`) não tem asserção (o catálogo do teste não muda), mas o bloco Testes pede só o resumo.
- **Editar abre a montagem preenchida e salva mantendo o link.** `montarPedido.revisar.test.tsx:383-427`. Morde: confere `id`/`version` sem `idempotency_key`, o combinado, a gravação, a observação, a volta ao pedido montado e "Alterações salvas.". A volta do cupom pelo `aplicar` não tem caso.
- **Client real: conta sem papel no `save` e na cotação ⇒ a recusa; rede caída é falha.** `montagemComClientReal.test.tsx:304-433`. Morde no nível da porta; a recusa na tela não está provada (achado 1).
- **Guardas.** `escritaSoPelaPorta` (caso novo da porta da cotação, com sensores nos dois sentidos e a âncora de 8 + 1 invocações), `leituraSoComPapel` (régua 3 da porta da cotação, igualdade com 14 importadores), `movimentoDosPedidos` (47 arquivos), `semDadoSensivelDeClienteNoApp` (as três linhas exatas de `revisao.ts`, com sensor). Mordem pela leitura das asserções.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Porta da cotação própria, chamada dentro de `lerComPapel` | sim | Obrigação "Toda leitura por `lerComPapel`"; o 403 da `quote` nunca sai | sim |
| 2 | Editar na mesma rota, com a marca em memória de módulo | sim | `apps/mobile-adm/CLAUDE.md` › Montar pedido (nada na URL, a régua do `history.state`) | sim. Lista a tarefa 10, mas `tasks/10-rascunho-da-montagem.md` não menciona o Editar (ver Não conferido) |
| 3 | O desfecho em memória de módulo, preso ao id e à conta; o efeito de troca de conta só na mudança | sim | `useAcoesDoMontado.ts` (`tomarDesfecho` na primeira renderização) | sim |
| 4 | Criar: `replace` para o pedido; Editar: `passos.sair()` | sim | — | sim |
| 5 | `expected_total` vem da prévia; o bloqueio do passo 4 soma os motivos | sim | `handlers.ts:798-818` (PRC-02) | sim |
| 6 | 409: a frase, a releitura da prévia e do catálogo | sim | Design "sacola e resumo relidos" | sim |
| 7 | 5xx/rede ⇒ `PROPOSAL_SAVE_FAILED`; 4xx com frase ⇒ a frase | sim | `traduzir.ts` (5xx ⇒ `falhou`); o 500 da RPC cai na frase genérica | sim |
| 8 | `save_address` só para "Outro endereço"; o documento vai `null` para a cadastrada | sim | `apps/backoffice/.../draft.ts:287` usa a mesma regra (`savedId === null`) | sim |
| 9 | Editar reabre a partir do `get`; o cupom volta como código e é reconferido | sim, com custo declarado | `medidas: null` na edição faz a cotação usar as medidas padrão até um 409, o que o raciocínio da premissa 12 admite mover o preço da prévia. É só prévia, não grava nada | sim |
| 10 | O prazo da nota vem do relógio do servidor | sim | `lerComPapel` devolve `lido_em` | sim |
| 11 | A prévia do frete não mostra a retirada | sim | Fora do critério de aceite | sim |
| 12 | `medidas` em `LinhaDaSacola` para a cotação | sim | `toQuoteProducts` (core) | sim |
| 13 | "Editar" ao lado de "Cancelar", numa grade `auto-fit` | sim | Design "ao lado de Cancelar este pedido" | sim |

## Não conferido

- **A execução.** Testes, `tsc` e lint não foram rodados. A cobertura e o veredito de cada teste vêm da leitura das asserções.
- **O Editar de uma proposta cujo `get` responde 404** (`tipo: 'nao-achou'`). `carregada` nunca vira verdadeiro e o esqueleto "Carregando o pedido montado" fica para sempre, sem frase. É um caso de corrida, que só a execução mostra.
- **A folha de sair durante o Editar** continua dizendo "Sair sem criar o link?". O desenho não especifica o Editar e a folha é da tarefa 10. A premissa 2 lista a tarefa 10 no raio, mas o arquivo da 10 não foi propagado com nada sobre a montagem reaberta.
- **Documentação desatualizada.** `apps/mobile-adm/CLAUDE.md` › Montar pedido ainda diz "Os passos 2 a 4 têm só o esqueleto". Esta tarefa não pediu atualizar o arquivo de instruções (a 10 pede), e ele não está em `alterados`.
- **Mudanças de tarefas anteriores no mesmo diff.** Em `tipos.ts`, `montagem.ts`, `index.ts`, `useMontados.ts` e nos guardas, só julguei as mudanças que esta tarefa explica.
- **Arquivos sem intent-to-add.** Nenhum: todos os arquivos criados aparecem como `A` no `git status` e entram no diff.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (o conteúdo carregado no contexto: Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy); `apps/mobile-adm/CLAUDE.md` › Pedidos montados (WI 94), › Montar pedido (WI 94), › Testes, e o índice de títulos. `supabase/CLAUDE.md` não foi lido: a tarefa não altera nada em `supabase/`. Do contrato da function conferi só `supabase/functions/order-proposals/handlers.ts:770-890` (o `save`).

## T09 — wi-impl-task · done · agente ad4e121c9f4d5b4de

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/09-revisar-e-criar-link.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 6 | Conta sem papel no `save` e na cotação ⇒ a recusa chega à TELA, não só à porta | página real (app) | `apps/mobile-adm/src/pages/__tests__/montarPedido.revisar.test.tsx` › describe "a conta que perde o papel no passo 4" (2 casos novos) | sim | vermelho nos dois — tirar `criar.erroBruto` da lista de `useRecusaDePapel` derruba o caso do "Criar link"; tirar `cotacao.consulta.error` derruba o da prévia do frete (restaurados pela cópia, `cmp` ok) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/api/portaDaCotacao.ts criado
apps/mobile-adm/src/features/order-proposal/model/montadoEmEdicao.ts criado
apps/mobile-adm/src/features/order-proposal/model/revisao.ts criado
apps/mobile-adm/src/features/order-proposal/model/useCotacaoDaRevisao.ts criado
apps/mobile-adm/src/features/order-proposal/model/useCriarLink.ts criado
apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx criado
apps/mobile-adm/src/pages/__tests__/montarPedido.revisar.test.tsx criado
apps/mobile-adm/src/features/order-proposal/api/portaDePropostas.ts alterado
apps/mobile-adm/src/features/order-proposal/index.ts alterado
apps/mobile-adm/src/features/order-proposal/model/montagem.ts alterado
apps/mobile-adm/src/features/order-proposal/model/sacola.ts alterado
apps/mobile-adm/src/features/order-proposal/model/tipos.ts alterado
apps/mobile-adm/src/features/order-proposal/model/useAcoesDoMontado.ts alterado
apps/mobile-adm/src/features/order-proposal/model/useMontados.ts alterado
apps/mobile-adm/src/features/order-proposal/model/__tests__/montagem.desfazer.test.ts alterado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/pages/PedidoMontadoPage.tsx alterado
apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx alterado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/movimentoDosPedidos.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoSensivelDeClienteNoApp.test.ts alterado

Nesta correção mudaram: `montarPedido.revisar.test.tsx` (2 casos), `montagemComClientReal.test.tsx` (o comentário passou a apontar o describe que existe), `semDadoSensivelDeClienteNoApp.test.ts` (saiu "D-16") e `model/revisao.ts` (saiu a citação `PRC-01`/`PRC-02`, mesma classe do achado 2, achada no `git diff`).

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.revisar.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação): 15/15, exit 0; com cada mutação, 1 falha.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (instruções §Comandos): exit 0, nenhum erro (o mesmo do baseline do `CLAUDE.md`, 0).
- Suítes (instruções §Baselines), um workspace por vez, exit fora de pipe:
  - mobile-adm: 2610/163, exit 0;
  - store: 7091/378, exit 0;
  - backoffice: 5183/288, exit 0.
- `npx eslint .` em `apps/mobile-adm`: 1 erro, o mesmo de antes — `montarPedido.pecas.test.tsx:110`, da tarefa 07, não meu.

Instruções lidas: as mesmas da implementação (nada relido).

## Divergências e descobertas

- Achado 1: o caso da cotação vai pelo Editar, porque nele a nota do prazo não lê o relógio. Assim a cotação é a única leitura que confere o papel ao entrar no passo 4. Pela criação, o `useRelogioDaMontagem` também recusaria, e tirar `cotacao.consulta.error` da lista continuaria verde.
- Achado 2, estendido: além do "D-16", saiu o `PRC-01`/`PRC-02` do comentário de `model/revisao.ts`, achado varrendo o diff da tarefa.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 09
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; apps/mobile-adm/CLAUDE.md (inteiro); supabase/CLAUDE.md › Migrations, RLS — o molde que os guardas cobram, Edge functions (order-proposals e o pedido que nasce de uma proposta; melhor-envio), Secrets; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - revisão (peças com foto primeiro, cliente, entrega, "Alterar" no passo certo; prévia só com endereço completo): apps/mobile-adm/src/pages/__tests__/montarPedido.revisar.test.tsx (describe "passo 4 · a revisão", 7 casos)
  - Criar link (`save_address` + observação, abre o pedido montado; ficha nova; 409 com a frase da PRC-02 e o resumo relido; outra falha "nada foi enviado"; "Criando o link…"): idem (describe "passo 4 · Criar link", 5 casos)
  - Editar (montagem preenchida pelo `get`, salva com id/version e mantém o link; concluída sem Editar): idem (describe "Editar um pedido montado aberto", 2 casos)
  - conta sem papel no `save` e na cotação ⇒ a recusa NA TELA: idem (describe "a conta que perde o papel no passo 4", 2 casos — correção da revisão)
  - client real (conta sem papel no `save` e na cotação ⇒ recusa da porta; rede caída ⇒ falha): apps/mobile-adm/src/app/__tests__/montagemComClientReal.test.tsx (9 casos novos)
  - guardas: escritaSoPelaPorta (porta da cotação, ação `save`), leituraSoComPapel, movimentoDosPedidos (+PassoRevisar), tomMemorialDosMontados (alcança a pasta), semDadoSensivelDeClienteNoApp (exceções do passo 4 + sensor)
  - sem cobertura: layout (44 px, sem rolagem lateral) é da QA em navegador; a retirada no escritório na prévia do frete não foi implementada (fora dos critérios)
Verificações: tsc do mobile-adm 0; mobile-adm 2610/163 exit 0; store 7091/378 exit 0; backoffice 5183/288 exit 0; eslint mobile-adm 1 erro, que é da tarefa 07 (montarPedido.pecas.test.tsx:110)
Árvore de trabalho: 7 arquivos criados e 15 alterados em apps/mobile-adm/src (lista em Arquivos alterados); nada commitado
Citações conferidas: 5 abertas ao usá-las (portaDePropostas.ts, shippingPreview.ts:26-53 › quoteBody, core/shipping › toQuoteProducts, handlers.ts › save/prices_changed, que deslocou: agora em :817-818, e core/proposals/link.ts › PROPOSAL_SAVE_FAILED); nenhuma morta
Caducou: 04 · o comentário de PedidoMontadoPage dizia que "Editar" é de outra tarefa · esta tarefa o implementou (o comentário do código foi atualizado; o arquivo da tarefa 04 não foi reescrito)
```

## T10 — wi-impl-task · review · agente a2214cc953245168d

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/10-rascunho-da-montagem.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Chave `estrelinha-montagem-rascunho`, em **`localStorage`**, com dono único em `features/order-proposal/model/rascunho.ts` | `sessionStorage` | No PWA instalado, o Android encerra o processo que fica em segundo plano, e a sessão da aba morre junto. O rascunho precisa sobreviver a isso. Não conferi num PWA instalado de verdade (é prova de navegador ou Android): a escolha segue o que o `sessionStorage` garante | o rascunho no aparelho; a lista de chaves do `CLAUDE.md` |
| 2 | O rascunho guarda as peças só pela identidade (peça, variação, quantidade, gravação). Ao retomar, a linha é refeita do catálogo relido, com o preço de hoje. A peça que saiu do catálogo não volta e é contada no aviso | Guardar a `LinhaDaSacola` inteira (nome, foto, preço) | O contrato pede "variação, quantidade, gravação". Assim o preço guardado nunca fica velho, e a régua por termo não esbarra em `nome` | `montagemDoRascunho`/`retomadaDoRascunho`; a montagem pede o catálogo enquanto há rascunho pendente |
| 3 | O cupom volta como o `CupomAplicado` inteiro, e a prévia do passo 3 o confere de novo (se não valer mais, sai pela regra de sempre) | Guardar só o código e reaplicar como no Editar | Sem a cliente, o e-mail vem vazio, e reaplicar recusaria cupom de primeira compra antes de ela ser escolhida | passo 3 depois da retomada |
| 4 | O rascunho fica preso ao id da conta (`conta`). O rascunho de outra conta, ou ilegível, é apagado ao ser lido | Apagar só na troca de conta | Também cobre a sessão que expira com o app fechado e a entrada depois com outra conta | `lerRascunho` |
| 5 | Salvar automático a cada mudança, só na montagem nova, só pela conta que a abriu, e nunca enquanto o guardado ainda não voltou. Editar um pedido montado não lê nem grava rascunho | Guardar só ao sair | Bloqueio do celular ou processo encerrado não passam por evento nenhum da tela | `MontarPedidoPage` |
| 6 | A folha com "Guardar rascunho" e "Descartar" (ink cheio) só aparece quando há peças. Sem peças, fica a folha de antes ("Sair", e a frase de antes) | Três botões sempre | Sem peça não há o que guardar, e os testes da tarefa 05 seguem valendo | folha de sair e da sentinela |
| 7 | `FolhaDeConfirmacao` ganhou a prop opcional `alternativa`. Com ela, os três botões se empilham sempre | Folha nova só para a montagem | É a menor superfície. As outras folhas não mudam (o prop é opcional) | `FolhaDeConfirmacao` (cancelar e renovar não usam a prop) |
| 8 | O apagar na troca de conta e no sair fica em `LimparCacheNaTrocaDeConta` (`App.tsx`), ao lado de `esquecerAcoes` | Apagar dentro da página | A página desmonta ao sair. É o mesmo lugar onde mora o resto do que é da conta | `App.tsx` |
| 9 | A régua do guarda `semDadoDeClienteNoAparelho` ficou em duas metades. Ali: a exceção estreita (só `localStorage`, só no dono) e a régua por termo sobre o código do dono, mais uma âncora que lê a outra metade. A régua por execução, com sentinelas e os seis sensores, ficou em `features/order-proposal/model/__tests__/rascunhoSemDadoDaCliente.test.ts` | Tudo em `shared/lib/__tests__` importando `features` | O eslint-boundaries avisava 3 warnings (`shared` → `features`/`entities`). Seria regressão de lint | os dois guardas |
| 10 | `guardarRascunho` grava uma forma montada campo por campo, e `lerRascunho` filtra campo por campo | Gravar o objeto recebido | Defesa nas duas pontas: um campo a mais não chega ao aparelho nem volta dele | dono |
| 11 | `test/setup.ts` apaga o rascunho antes de cada caso (import dinâmico, como o vizinho) | Limpar em cada arquivo | O `localStorage` do jsdom dura o arquivo inteiro. Sem isso, os testes da montagem já existentes retomariam o rascunho do caso anterior | todos os testes do app |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | A montagem guarda as peças e os descontos sem dado da cliente. Fechado o app e reaberto, a montagem volta com peças, cupom e valor do desconto, sem a cliente e sem o motivo | página real | `apps/mobile-adm/src/pages/__tests__/montarPedido.rascunho.test.tsx` | sim | — |
| 2 | Fechar com peças oferece guardar ou descartar. Descartar apaga, guardar mantém, o voltar do passo 1 faz a mesma pergunta, e sem peça a folha é a de antes | página real | idem | sim | — (o caso "sem peça" já passava antes, e é regressão de comportamento existente) |
| 3 | Criar link apaga o rascunho | página real | idem | sim | — |
| 4 | A troca de conta (A → B) e o sair apagam o rascunho. A volta da aba mantém | página real (`<App />`) | `apps/mobile-adm/src/app/__tests__/trocaDeContaLimpaCache.test.tsx` | sim | — (A → B e sair vermelhos antes do código; a volta da aba já passava) |
| 5 | Dono único da chave, testes inclusos | guarda | `apps/mobile-adm/src/shared/lib/__tests__/rascunhoComDonoUnico.test.ts` | sim | vermelho (a chave escrita na `MontarPedidoPage` reprova) |
| 6 | Exceção estreita, e nada da cliente no rascunho, por termo e por execução, com sensores para nome, e-mail, telefone, CPF, endereço e motivo | guarda | `semDadoDeClienteNoAparelho.test.ts` + `features/order-proposal/model/__tests__/rascunhoSemDadoDaCliente.test.ts` | sim | vermelho (3 mutações: `sessionStorage` no dono; o espalhamento de `combinado` com o motivo; `lerRascunho` devolvendo o objeto cru). Todas restauradas por cópia, conferidas com `cmp` |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/model/rascunho.ts criado
apps/mobile-adm/src/features/order-proposal/model/__tests__/rascunhoSemDadoDaCliente.test.ts criado
apps/mobile-adm/src/pages/__tests__/montarPedido.rascunho.test.tsx criado
apps/mobile-adm/src/shared/lib/__tests__/rascunhoComDonoUnico.test.ts criado
apps/mobile-adm/src/features/order-proposal/model/montagem.ts alterado
apps/mobile-adm/src/features/order-proposal/model/usePassosDaMontagem.ts alterado
apps/mobile-adm/src/features/order-proposal/ui/FolhaDeConfirmacao.tsx alterado
apps/mobile-adm/src/features/order-proposal/index.ts alterado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/app/App.tsx alterado
apps/mobile-adm/src/app/__tests__/trocaDeContaLimpaCache.test.tsx alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/tomMemorialDosMontados.test.ts alterado
apps/mobile-adm/src/test/setup.ts alterado
CLAUDE.md alterado
apps/mobile-adm/CLAUDE.md alterado

## Verificação

- Um arquivo de teste: `pnpm --filter @estrelinha/mobile-adm exec vitest run <arquivo> --testTimeout=20000`, do `PROJECT.md` › Comandos de verificação (rodei como `pnpm exec vitest run` dentro de `apps/mobile-adm`). Rodaram verdes: o teste de rascunho da página (8), `trocaDeContaLimpaCache` (16), `rascunhoComDonoUnico` (8), `semDadoDeClienteNoAparelho` + `rascunhoSemDadoDaCliente` + `tomMemorialDosMontados` (87 juntos).
- Tipos, do arquivo de instruções (`CLAUDE.md` › Comandos): `npx tsc --noEmit -p apps/<app>/tsconfig.app.json`.
  - mobile-adm: **0**.
  - store: **0**.
  - backoffice: **7**, todos em `src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (commit `4c6e9a16`, anterior ao WI). Herdados, nenhum em arquivo meu.
  - `packages/core`: 11, herdados.
  - Não veio `baseline` na entrada. Comparei contra a linha *Tipos* do `CLAUDE.md` e o git: nenhum erro em arquivo tocado.
- Verificação mínima (`CLAUDE.md` › Baselines): cada suíte um workspace por vez, exit 0 fora de pipe.
  - mobile-adm: **2650/166**, exit 0.
  - store: **7091/378**, exit 0.
  - backoffice: **5183/288**, exit 0.
- Lint (`npx eslint .` em cada app):
  - store: 2/2.
  - backoffice: 23/5.
  - mobile-adm: 1/0. O erro é `no-irregular-whitespace` em `src/pages/__tests__/montarPedido.pecas.test.tsx:110`, já commitado pela tarefa 07, e não é meu. Os meus 3 warnings de fronteira foram removidos (decisão 9).
- Instruções lidas:
  - `CLAUDE.md` (raiz, no contexto) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy.
  - `apps/mobile-adm/CLAUDE.md` por seção (o arquivo tem 72 KB): § O que existe hoje, § O acesso é o MESMO do Backoffice, § A árvore, § Pedidos montados, § Montar pedido, § PWA, § Identidade, § Navegação, § Os guardas do app, § Testes.
  - `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- A tarefa pedia a régua por execução dentro de `semDadoDeClienteNoAparelho`. Ela foi para o lado do dono por causa das fronteiras FSD (o arquivo de instruções vence), e o guarda a ancora (decisão 9).
- Os testes da página que passaram de primeira sem check de mutação (sobem o `<App />` inteiro, sem infraestrutura): "sem peça, a folha é a de antes" e "a volta da aba com o MESMO usuário mantém o rascunho". Os dois guardam comportamento que já existia.
- A sobrevivência do `localStorage` no PWA instalado do Android e o layout da folha com três botões (44 px, sem rolagem lateral) ficaram sem prova: são de navegador ou de Android real, para a QA.
- Achados herdados, não consertados:
  - backoffice com 7 erros de tipo em `ProposalStateBadge.test.tsx`;
  - mobile-adm com lint 1/0 em `montarPedido.pecas.test.tsx:110` (tarefa 07).
  - Os dois estão registrados no `CLAUDE.md` › Baselines.
- Mudei o texto da linha *Testes* das Baselines. A diferença contra a linha anterior não é toda desta tarefa (as tarefas 01–09 do WI 94 não remediram), e isso está escrito no parágrafo novo.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 10
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções, › Os guardas, › Baselines, › CI e deploy; apps/mobile-adm/CLAUDE.md (por seção: O que existe hoje, O acesso, A árvore, Pedidos montados, Montar pedido, PWA, Identidade, Navegação, Os guardas do app, Testes); .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local
Testes escritos: volta depois de saída involuntária e nada da cliente no aparelho → apps/mobile-adm/src/pages/__tests__/montarPedido.rascunho.test.tsx; guardar/descartar/Criar link apaga → idem; troca de conta e sair apagam, volta da aba mantém → apps/mobile-adm/src/app/__tests__/trocaDeContaLimpaCache.test.tsx; dono único da chave → apps/mobile-adm/src/shared/lib/__tests__/rascunhoComDonoUnico.test.ts; exceção estreita + régua por termo → apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts, régua por execução com sensores de nome/e-mail/telefone/CPF/endereço/motivo → apps/mobile-adm/src/features/order-proposal/model/__tests__/rascunhoSemDadoDaCliente.test.ts. Sem cobertura aqui: a sobrevivência no PWA instalado e o layout da folha (navegador/Android, QA)
Verificações: tsc mobile-adm 0, store 0, backoffice 7 herdados (ProposalStateBadge.test.tsx), core 11 herdados; suítes mobile-adm 2650/166, store 7091/378, backoffice 5183/288, todas exit 0; lint store 2/2, backoffice 23/5, mobile-adm 1/0 herdado (tarefa 07); mutação: 4 checks, todos vermelhos e restaurados por cópia com cmp
Árvore de trabalho: criados rascunho.ts, rascunhoSemDadoDaCliente.test.ts, montarPedido.rascunho.test.tsx, rascunhoComDonoUnico.test.ts; alterados montagem.ts, usePassosDaMontagem.ts, FolhaDeConfirmacao.tsx, order-proposal/index.ts, MontarPedidoPage.tsx, App.tsx, trocaDeContaLimpaCache.test.tsx, semDadoDeClienteNoAparelho.test.ts, tomMemorialDosMontados.test.ts, test/setup.ts, CLAUDE.md, apps/mobile-adm/CLAUDE.md; nada commitado
Citações conferidas: 3 (apps/store/src/shared/lib/visits/visitor.ts, apps/store/src/shared/lib/__tests__/visitanteComDonoUnico.test.ts, trocaDeContaLimpaCache) e a linha Depende de (a montagem com os passos 1 a 4 e o Criar link, presente); nenhuma deslocada nem morta
```

## T10 — wi-impl-review · fixing · agente a5bb22e752838e285

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/10-rascunho-da-montagem.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | obrigação furada | atrapalha | CLAUDE.md:606-607 (linhas **Lint** e **Tipos** da tabela de Baselines) | Só a linha **Testes** da tabela foi atualizada. Lint e tipos foram medidos no fecho, e o parágrafo novo (linha ~610) registra mobile-adm em lint **1/0** e backoffice em tipos **7**. Mesmo assim, as linhas da tabela, que são o gate da próxima feature, continuam dizendo "mobile-adm 0/0" e "0 · 0 · 0 · 0 · 0". Quem comparar contra a tabela vai ler esses números como regressão própria | Tarefa › Obrigações: "Atualize `CLAUDE.md` da raiz › … › Baselines (testes, tipos e lint medidos no fecho, um workspace por vez, exit fora de pipe)"; CLAUDE.md › Baselines: "compare contra estes números e **atualize-os aqui** quando mudarem de verdade" |
| 2 | identificador de processo | atrapalha | apps/mobile-adm/src/app/App.tsx:98; apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts:22, :317; apps/mobile-adm/src/shared/lib/__tests__/rascunhoComDonoUnico.test.ts:9; apps/mobile-adm/src/app/__tests__/trocaDeContaLimpaCache.test.tsx:444 | Comentários novos citam a chave do Work Item e a decisão ("WI 94", "WI 94, D-15") | regra do workflow: identificador de processo não entra no código |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a montagem volta depois de uma saída involuntária com as peças e os descontos | `rascunho.ts` (`rascunhoDaMontagem`, `lerRascunho`, `retomadaDoRascunho`); `MontarPedidoPage.tsx`: o salvar automático a cada mudança, e a retomada quando o catálogo chega; o redutor ganhou `retomar-rascunho` em `montagem.ts` | sim |
| a saída voluntária pergunta guardar ou descartar | `MontarPedidoPage.tsx`: as duas `FolhaDeConfirmacao` com `alternativa` "Guardar rascunho" e confirmar "Descartar" quando há peças; `FolhaDeConfirmacao.tsx` com o prop opcional | sim |
| nenhum dado da cliente no aparelho, provado pelo guarda | `rascunho.ts` grava e lê a forma campo por campo; `semDadoDeClienteNoAparelho.test.ts` (a exceção estreita e a régua por termo); `rascunhoSemDadoDaCliente.test.ts` (a régua por execução, com sentinelas e seis sensores) | sim |
| as baselines e a lista de chaves atualizadas no `CLAUDE.md` | a lista de chaves está atualizada (CLAUDE.md, Convenções). Nas Baselines, só a linha Testes; Lint e Tipos não (achado 1) | em parte |
| cada comportamento do bloco `Testes` coberto por um teste escrito | ver Testes | sim |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- **Porta com nome literal, recusa só pelo `42501`**: nada de function nova. A tarefa não acrescenta porta.
- **Toda leitura por `lerComPapel`**: não há leitura nova. O catálogo é o `useCatalogoDaMontagem` que já existia, agora ligado também enquanto há rascunho pendente (`MontarPedidoPage.tsx`, `useCatalogoDaMontagem(passos.passo === 2 || rascunhoPendente !== null)`).
- **Tom memorial e `motion-reduce:`**: os literais novos (`SAIR_FRASE_COM_RASCUNHO`, `GUARDAR_RASCUNHO`, `DESCARTAR`, `RASCUNHO_RETOMADO`, `RASCUNHO_SEM_CLIENTE`, `pecasForaDoCatalogo`, em `montagem.ts`) não têm `!`, emoji nem urgência. O botão novo da folha não tem animação. Duas frases entraram como âncora em `tomMemorialDosMontados.test.ts`.
- **Prova de layout é de navegador**: não aplicável aqui. Nenhuma asserção de layout foi feita em jsdom.
- **O gate inclui loja e painel**: o CLAUDE.md registra store 7091/378 e backoffice 5183/288 medidos (os números em si dependem da execução).
- **Atualizar CLAUDE.md raiz (chaves e Baselines) e `apps/mobile-adm/CLAUDE.md`**: a lista de chaves e o `apps/mobile-adm/CLAUDE.md` (a seção do rascunho e as linhas dos guardas) estão atualizados. Nas Baselines, só a linha Testes; Lint e Tipos não (achado 1).

## Testes

- **Página real: recarrega e reabre com peças, cupom e valor, sem cliente e sem motivo.** `montarPedido.rascunho.test.tsx`, "o app encerrado no meio…", com `unmount` e `montarApp` de novo. A asserção morde: confere a sacola com o Colar, o cupom SAUDADE10, o switch ligado, o valor "20", o motivo vazio, a busca de clientes aberta e o corpo da prévia levando o cupom e o desconto.
- **Página real: fechar oferece guardar ou descartar; descartar apaga; guardar mantém; Criar link apaga.** Mesmo arquivo, quatro casos mais o da sentinela e o "sem peça".
  - "Descartar" e "Criar link" mordem: sem o `apagarRascunho`, o salvar automático deixa a chave preenchida e a asserção `guardado()` nulo reprova.
  - "Guardar" confere o efeito (o rascunho continua e a montagem volta). Esse efeito é sustentado também pelo salvar automático. É o comportamento pedido, então não é achado.
- **Troca de conta apaga.** `trocaDeContaLimpaCache.test.tsx`, três casos novos (A → B, sair, e a volta da aba com o mesmo usuário). Os dois primeiros mordem: sem o `apagarRascunho` em `App.tsx`, a chave fica. O terceiro é o inverso.
- **Guardas.**
  - `rascunhoComDonoUnico.test.ts`: varre os três apps, testes inclusos, com âncora e com o import de `RASCUNHO_KEY` exigido. Tem sensores para o teste irmão, as aspas e o CRLF/LF/glob.
  - `semDadoDeClienteNoAparelho.test.ts`: a exceção só para `localStorage` e só no dono, com sensores que acusam `sessionStorage`, `indexedDB` e `console` no dono e `localStorage` fora dele. Tem também a régua por termo, com seis sensores.
  - `rascunhoSemDadoDaCliente.test.ts`: a régua por execução sobre `guardarRascunho`/`lerRascunho` reais, com seis sensores mais a carona barrada. A asserção morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `localStorage`, chave `estrelinha-montagem-rascunho`, dono em `model/rascunho.ts` | sim | O "Não faça" da tarefa proíbe `sessionStorage` sem prova no PWA. A escolha vai no retorno e no CLAUDE.md | sim |
| 2 | Guarda só a identidade das peças e refaz as linhas do catálogo relido | sim | O contrato diz "peças (variação, quantidade, gravação)". `retomadaDoRascunho` usa `linhaDaEscolha` | sim |
| 3 | O cupom volta inteiro, e a prévia o confere de novo | sim | O teste mostra o cupom chegando ao corpo da prévia | sim |
| 4 | O rascunho fica preso ao id da conta, e o de outra conta é apagado na leitura | sim | `lerRascunho`, rascunho.ts:142 | sim |
| 5 | Salvar automático só na montagem nova, só pela conta que a abriu, e nunca com rascunho pendente | sim | MontarPedidoPage, o efeito do salvar automático | sim |
| 6 | A folha com três botões só quando há peças | sim | O passo 3 (descontos) não é alcançável sem peça, então "algo preenchido" sem peça não tem desconto a guardar | sim |
| 7 | Prop opcional `alternativa` em `FolhaDeConfirmacao` | sim | Cancelar e renovar não a passam, e o layout delas fica igual sem ela | sim |
| 8 | O apagar fica em `LimparCacheNaTrocaDeConta` | sim | O mesmo lugar de `esquecerTermos` e `esquecerAcoes` (App.tsx:94-99) | sim |
| 9 | O guarda dividido em duas metades por causa da fronteira FSD | sim | A regra FSD do CLAUDE.md (`shared` não importa `features`). Há âncora cruzada lendo a outra metade | sim |
| 10 | Forma gravada e forma lida montadas campo por campo | sim | `formaGravada`, `pecaLida`, `cupomLido`, `combinadoLido` | sim |
| 11 | `setup.ts` apaga o rascunho antes de cada caso | sim | O molde do vizinho (`esquecerReconferencia`, por import dinâmico) | sim |

## Não conferido

- A sobrevivência do `localStorage` num PWA instalado no Android, e o layout dos três botões empilhados (alvo de 44 px, 360 px): são de navegador ou de QA.
- O resultado das suítes, do lint e dos tipos: não rodei nada. Os números do CLAUDE.md são a palavra do implementador.
- Se o catálogo falhar ao carregar, o rascunho fica pendente e o salvar automático fica parado na sessão. É caso de execução; não virou achado.
- Os quatro arquivos novos têm intent-to-add (aparecem como `A`) e foram julgados pelo diff.
- Instruções lidas: CLAUDE.md (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy (pelo contexto carregado); apps/mobile-adm/CLAUDE.md lido pelo diff e pelas seções da montagem e da tabela de guardas tocadas.

## T10 — wi-impl-task · done · agente a2214cc953245168d

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/10-rascunho-da-montagem.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 4 | A troca de conta e o sair apagam o rascunho (mudou só o comentário) | página real | `apps/mobile-adm/src/app/__tests__/trocaDeContaLimpaCache.test.tsx` | sim | — |
| 5 | Dono único da chave (mudou só o comentário) | guarda | `apps/mobile-adm/src/shared/lib/__tests__/rascunhoComDonoUnico.test.ts` | sim | — |
| 6 | Exceção estreita e régua por termo (mudaram só os comentários) | guarda | `apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts` | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

Tudo o que a tarefa alterou, da implementação e da correção:

apps/mobile-adm/src/features/order-proposal/model/rascunho.ts criado
apps/mobile-adm/src/features/order-proposal/model/__tests__/rascunhoSemDadoDaCliente.test.ts criado
apps/mobile-adm/src/pages/__tests__/montarPedido.rascunho.test.tsx criado
apps/mobile-adm/src/shared/lib/__tests__/rascunhoComDonoUnico.test.ts criado
apps/mobile-adm/src/features/order-proposal/model/montagem.ts alterado
apps/mobile-adm/src/features/order-proposal/model/usePassosDaMontagem.ts alterado
apps/mobile-adm/src/features/order-proposal/ui/FolhaDeConfirmacao.tsx alterado
apps/mobile-adm/src/features/order-proposal/index.ts alterado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/app/App.tsx alterado
apps/mobile-adm/src/app/__tests__/trocaDeContaLimpaCache.test.tsx alterado
apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts alterado
apps/mobile-adm/src/shared/lib/__tests__/tomMemorialDosMontados.test.ts alterado
apps/mobile-adm/src/test/setup.ts alterado
CLAUDE.md alterado
apps/mobile-adm/CLAUDE.md alterado

A correção tocou: CLAUDE.md, apps/mobile-adm/src/app/App.tsx, apps/mobile-adm/src/app/__tests__/trocaDeContaLimpaCache.test.tsx, apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts e apps/mobile-adm/src/shared/lib/__tests__/rascunhoComDonoUnico.test.ts.

## Verificação

- **Testes**: rodei `pnpm exec vitest run <arquivos> --testTimeout=20000` em `apps/mobile-adm`, a forma de um arquivo do `PROJECT.md` › Comandos de verificação. Arquivos: `trocaDeContaLimpaCache`, `semDadoDeClienteNoAparelho` e `rascunhoComDonoUnico`. Resultado: 77 de 77 passando, exit 0.
- **Tipos**: `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json`, comando do `CLAUDE.md` › Comandos, deu 0 erros, sem mudança contra a medição do fecho.
- **Instruções lidas**: as mesmas da implementação.

## Divergências e descobertas

- **Achado 1**: atualizei as linhas **Lint** e **Tipos** da tabela de Baselines com o que foi medido no fecho.
  - **Lint**: 26 erros / 7 warnings, com mobile-adm em **1/0**. O erro herdado está nomeado na linha (`no-irregular-whitespace` em `montarPedido.pecas.test.tsx:110`, da tarefa 07).
  - **Tipos**: `0 · 7 · 0 · 0 · 0`. Os 7 do backoffice estão todos em `ProposalStateBadge.test.tsx`, do commit `4c6e9a16`, anterior ao WI 94. A linha diz isso.
  - catalog-import e `tsconfig.server.json` não foram remedidos, e a linha declara isso.
- **Achado 2**: tirei "WI 94" e "D-15" dos comentários de código e de teste nos cinco pontos apontados. Conferi os outros arquivos que a tarefa tocou e não sobrou nenhum identificador de processo.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 10
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções, › Os guardas, › Baselines, › CI e deploy; apps/mobile-adm/CLAUDE.md (por seção: O que existe hoje, O acesso, A árvore, Pedidos montados, Montar pedido, PWA, Identidade, Navegação, Os guardas do app, Testes); .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local
Testes escritos: volta depois de saída involuntária e nada da cliente no aparelho → apps/mobile-adm/src/pages/__tests__/montarPedido.rascunho.test.tsx; guardar/descartar/Criar link apaga → idem; troca de conta e sair apagam, volta da aba mantém → apps/mobile-adm/src/app/__tests__/trocaDeContaLimpaCache.test.tsx; dono único da chave → apps/mobile-adm/src/shared/lib/__tests__/rascunhoComDonoUnico.test.ts; exceção estreita + régua por termo → apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts; régua por execução com sensores de nome/e-mail/telefone/CPF/endereço/motivo → apps/mobile-adm/src/features/order-proposal/model/__tests__/rascunhoSemDadoDaCliente.test.ts. Sem cobertura aqui: a sobrevivência no PWA instalado e o layout da folha (navegador/Android, QA)
Verificações: tsc mobile-adm 0, store 0, backoffice 7 herdados (ProposalStateBadge.test.tsx), core 11 herdados; suítes mobile-adm 2650/166, store 7091/378, backoffice 5183/288, exit 0 as três; lint store 2/2, backoffice 23/5, mobile-adm 1/0 herdado (tarefa 07); mutação: 4 checks, todos vermelhos e restaurados por cópia com cmp. Correção: 3 arquivos de teste, 77/77 verdes; tsc mobile-adm 0; tabela de Baselines (Testes, Lint, Tipos) atualizada
Árvore de trabalho: criados rascunho.ts, rascunhoSemDadoDaCliente.test.ts, montarPedido.rascunho.test.tsx, rascunhoComDonoUnico.test.ts; alterados montagem.ts, usePassosDaMontagem.ts, FolhaDeConfirmacao.tsx, order-proposal/index.ts, MontarPedidoPage.tsx, App.tsx, trocaDeContaLimpaCache.test.tsx, semDadoDeClienteNoAparelho.test.ts, tomMemorialDosMontados.test.ts, test/setup.ts, CLAUDE.md, apps/mobile-adm/CLAUDE.md; nada commitado
Citações conferidas: 3 (apps/store/src/shared/lib/visits/visitor.ts, apps/store/src/shared/lib/__tests__/visitanteComDonoUnico.test.ts, trocaDeContaLimpaCache) e a linha Depende de (a montagem com os passos 1 a 4 e o Criar link, presente); nenhuma deslocada nem morta
```

## T15 — wi-impl-task · review · agente a2c77f462db39d9bf

Tarefa: .specs/work-items/94-montar-pedido-no-app/tasks/15-bug-6-cartao-da-cliente.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Não alterar `api/portaDeLeitura.ts`. O telefone e o número de pedidos já vêm em `ClienteDaMontagem` (`phone`, `pedidos`, lidos de `customer_list` por `clientesDaMontagem.ts`), então o defeito estava só no desenho do cartão | Mexer em alguma leitura | `portaDeLeitura.ts` é a porta da leitura de texto colado (`customer-parse`) e não tem relação com o cartão. O dado já chegava à tela; só não era desenhado. D-02 continua valendo: nada lê `orders` | nenhum |
| 2 | As frases novas ficam em `model/frasesDaMontagem.ts`: `pedidosNaLoja(n)` (reaproveita `pedidosDaCliente`, então sai no singular com "1 pedido na loja") e `SEM_TELEFONE_NO_CARTAO = 'sem telefone'`. Esse arquivo está fora do Contrato, mas também não está na cerca da onda | Escrever as frases direto no `PassoDaCliente.tsx`, ou reusar `SEM_TELEFONE_NA_REVISAO` de `revisao.ts` | `apps/mobile-adm/CLAUDE.md` diz que as frases do passo 1 moram em `frasesDaMontagem.ts`. `revisao.ts` está na cerca de outra tarefa e pertence a outro passo. A mudança só acrescenta exports | só `frasesDaMontagem.ts`; `linhaDaCliente` continua igual (a lista de busca segue usando) |
| 3 | O cartão ficou assim: na linha da inicial, o nome e embaixo "N pedidos na loja"; abaixo, o e-mail e depois o telefone formatado por `maskPhone` (o mesmo da revisão), ou "sem telefone" em tom suave. A classe do nome não mudou | Juntar tudo numa linha só com "·" | É a ordem que a spec dá (nome, "N pedidos na loja", e-mail, telefone ou "sem telefone"). A tipografia do nome é da tarefa 20 | o cartão "Cliente" do passo 1; a tarefa 20 mexe no nome dentro dele |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | o cartão da cliente escolhida mostra o telefone e o número de pedidos dela na loja | página (vitest) | `apps/mobile-adm/src/pages/__tests__/montarPedido.test.tsx` — "o cartão da escolhida mostra o nome, "N pedidos na loja", o e-mail e o telefone" e "o cartão da escolhida sem telefone diz "sem telefone", e um pedido sai no singular" | sim | — (os dois ficaram vermelhos antes do fix: "Unable to find … 2 pedidos na loja" / "1 pedido na loja") |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx alterado
apps/mobile-adm/src/features/order-proposal/model/frasesDaMontagem.ts alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.test.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.colarTexto.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação). Antes do fix: 2 falharam, 22 passaram, os dois casos novos vermelhos. Depois: 24/24, exit 0.
- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.colarTexto.test.tsx src/pages/__tests__/montarPedido.test.tsx --testTimeout=20000` (PROJECT.md): 42/42, exit 0.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md › Comandos): exit 0, 0 erros. Não veio `baseline`; a linha *Tipos* do CLAUDE.md dá o mobile-adm em 0, então não há erro novo.
- `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` (verificação mínima, CLAUDE.md › Baselines): 2656 de 2657 passaram, 166 de 167 arquivos. A única falha foi `montarPedido.colarTexto.test.tsx`, que asseria a forma antiga do cartão (`'juliana@exemplo.invalid · 2 pedidos'`). Reescrevi a asserção para a forma nova (e-mail e "2 pedidos na loja" no cartão) e o arquivo passou, 18/18. Não rodei a suíte inteira de novo depois disso, porque as outras tarefas da onda seguiam editando a árvore.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines: a suíte da loja quando o app muda), rodado duas vezes: 7091/7091 testes e 378/378 arquivos passaram nas duas. O exit foi 1 nas duas por um único "Unhandled Error: [vitest-worker]: Timeout calling "onTaskUpdate"", o RPC do worker estourando o prazo enquanto os agentes paralelos usavam a máquina. Nenhum teste falhou.

Instruções lidas: CLAUDE.md (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; apps/mobile-adm/CLAUDE.md › Montar pedido (WI 94), lido por seção (75 KB, índice por `grep -n '^#'`); .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- O Contrato põe `api/portaDeLeitura.ts` na posse desta tarefa, mas o arquivo é a porta do `customer-parse` e não participa do cartão. Não toquei nele (decisão 1).
- Mexi em dois arquivos fora do Contrato, nenhum deles na cerca da onda. Em `model/frasesDaMontagem.ts` acrescentei duas frases. Em `pages/__tests__/montarPedido.colarTexto.test.tsx` uma asserção conferia o texto antigo do cartão (`"e-mail · 2 pedidos"`, a forma que o bug descreve como observada). Ela passou a conferir o e-mail e "2 pedidos na loja" dentro do cartão. A régua não ficou mais fraca: o caso continua provando que a ficha não muda.
- O arquivo temporário `${TMPDIR}/wi-impl-saida.txt` é o mesmo para todos os agentes da onda. Uma leitura minha pegou a saída de `montarPedido.voltar.test.tsx`, que outra tarefa estava rodando. Passei a gravar no scratchpad da sessão. Os resultados acima são todos dos meus próprios arquivos.
- A suíte da loja deu exit 1 duas vezes só pelo timeout de RPC do worker do vitest, com todos os testes verdes. É a contenção da máquina com as tarefas paralelas, não uma regressão.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 15
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; apps/mobile-adm/CLAUDE.md (por seção: › Montar pedido (WI 94)); .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local
Testes escritos: "o cartão da cliente escolhida mostra o telefone e o número de pedidos dela na loja" — dois casos em apps/mobile-adm/src/pages/__tests__/montarPedido.test.tsx (com telefone e "2 pedidos na loja"; sem telefone ⇒ "sem telefone" e "1 pedido na loja"), os dois vermelhos antes do fix. Nada ficou sem cobertura
Verificações: os dois arquivos de teste da montagem, 42/42; tsc do mobile-adm, 0 erros; suíte do mobile-adm, 2656/2657 — a falha era a asserção da forma antiga em montarPedido.colarTexto, reescrita e verde em 18/18; suíte da loja, 7091/7091 nas duas rodadas, com exit 1 só por um timeout de RPC do worker do vitest (contenção dos agentes paralelos)
Árvore de trabalho: apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx (o cartão), apps/mobile-adm/src/features/order-proposal/model/frasesDaMontagem.ts (pedidosNaLoja, SEM_TELEFONE_NO_CARTAO), apps/mobile-adm/src/pages/__tests__/montarPedido.test.tsx (+2 casos), apps/mobile-adm/src/pages/__tests__/montarPedido.colarTexto.test.tsx (a asserção da forma antiga do cartão); nada commitado
Citações conferidas: 2 abertas (as duas linhas do Contrato). PassoDaCliente.tsx está lá. portaDeLeitura.ts está lá, mas é a porta do texto colado e não participa do cartão, então não foi alterado
```

## T16 — wi-impl-task · review · agente af265983652f944c0

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/16-bug-8-previa-de-entrega.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A configuração da retirada (`shipping.pickup_enabled` e `material`) vem do hook de `core` `useStoreSettings`, a mesma leitura pública de `store_settings` que a loja e o painel já fazem. Não passa por `lerComPapel` | Uma leitura própria no app, dentro de `lerComPapel` | `store_settings` tem leitura pública e a linha do escritório é mostrada a qualquer cliente do RS. O painel (`ShippingPreview.tsx`) faz a mesma coisa. Os guardas `leituraSoComPapel` e `escritaSoPelaPorta` olham só os arquivos do app, e o app não passou a importar o client | `useCotacaoDaRevisao.ts`. A chave `['store_settings']` fica no cache do app, e não é dado de nenhuma conta |
| 2 | A retirada é calculada por um hook novo, `useRetiradaDaRevisao(endereco)`, em `useCotacaoDaRevisao.ts`, e chamada dentro do `PassoRevisar`, que já recebe o `endereco` | Calcular na `MontarPedidoPage` e passar pela prop `cotacao` | A `MontarPedidoPage` está na cerca de outra tarefa desta onda | `PassoRevisar.tsx`, `useCotacaoDaRevisao.ts`. As tarefas 20 e 22, que também tocam `PassoRevisar.tsx`, encontram o bloco Entrega com a linha nova |
| 3 | A linha da retirada mostra "Retirada no escritório", embaixo a linha do escritório (`pickupLocation`) e "grátis". Não mostra prazo | Um prazo do tipo "a partir de …", que a loja calcula com `addBusinessDays(hoje, …)` | O cálculo do prazo usa o relógio do aparelho, que o app evita. O painel, que é a referência do bug, também não mostra prazo na retirada | só a linha da retirada em `PassoRevisar.tsx`. O "com prazo e preço" do Esperado fica cumprido para as opções do Melhor Envio. Na retirada, só o preço |
| 4 | A retirada aparece mesmo quando a cotação falha (a frase da falha fica junto) ou vem vazia. Nesse caso "Nenhuma entrega disponível para este CEP." some. Enquanto a cotação carrega, fica só "Cotando o frete…" | Mostrar a retirada só quando a cotação deu certo | É o que o `ShippingPreview` do painel faz. A retirada não depende do Melhor Envio | `PassoRevisar.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | CEP do RS, retirada ligada e escritório completo: PAC, SEDEX e "Retirada no escritório", grátis | página (vitest, `<App />` real) | `montarPedido.revisar.test.tsx` › a retirada no escritório na prévia › CEP do RS com a retirada ligada… | sim | — |
| 2 | CEP do RS com a cotação vazia: só a retirada, sem "Nenhuma entrega disponível" | página | idem › CEP do RS com a cotação sem opção… | sim | — |
| 3 | CEP de fora do RS: sem a retirada, mesmo ligada | página | idem › CEP de fora do RS… | sim | vermelho |
| 4 | CEP do RS com a retirada desligada: sem a retirada | página | idem › CEP do RS com a retirada desligada… | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/model/useCotacaoDaRevisao.ts alterado
apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.revisar.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.revisar.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação)
  - antes de qualquer mudança: 15/15
  - testes novos sem o fix: 2 falharam (as fatias 1 e 2)
  - com o fix: 19/19, exit 0
- Check de mutação nas fatias 3 e 4, que passaram de primeira: arquivo copiado para o scratchpad, quebrado com `sed`, devolvido pela cópia e conferido com `cmp`.
  - CEP fixo em `'90010000'`: a fatia 3 falhou
  - `enabled: true` fixo: a fatia 4 falhou
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros, igual à baseline 0.
- `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` (CLAUDE.md › Baselines): 2658/2665 passaram, 7 falharam, nenhuma por esta tarefa.
  - Cinco falhas por contenção (a máquina rodava ~40 processos vitest de outras tarefas): queryClient, BuscaDeClientes, PullToRefresh e escritaSoPelaPorta deram "Hook timed out in 10000ms"; useFolhaNoHistorico é sensível à contenção. Rodados de novo isolados: 5 arquivos, 65/65, exit 0.
  - Duas falhas na área da tarefa 12, que roda em paralelo: `FolhaDaVariacao.test.tsx` (toque duplo) e `montarPedido.pecas.test.tsx` (classes da folha da variação).
  - Esta rodada foi para segundo plano por eu ter esquecido o parâmetro de timeout. Esperei terminar e li o resultado antes de seguir.
- Suíte da loja, só os guardas que varrem `apps/**` (`src/shared/lib/__tests__`): 2826/2826, 112 arquivos, exit 0. A suíte inteira da loja não rodou: esta tarefa não toca código da loja, e a máquina estava sob contenção.
- Backoffice `src/shared/lib/__tests__` e `src/app/__tests__`: 282/282, exit 0.

Instruções lidas: CLAUDE.md (raiz, já carregado no contexto: Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines); apps/mobile-adm/CLAUDE.md › topo e "O que existe hoje", › Pedidos montados (WI 94), › Montar pedido (WI 94), › Os guardas do app, › Testes (o arquivo tem 75 KB, lido por seção); .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- O teste novo da cotação vazia precisava de outra resposta do Melhor Envio, e `filaDeInvocacao` do dublê só acrescenta respostas à fila. A fila do `beforeEach` passou a ler a variável `opcoesDaCotacao`, que volta ao padrão PAC e SEDEX a cada teste. Os testes existentes do arquivo seguem com as mesmas asserções, todos verdes.
- Achado: o teste que já existia, com CEP de Porto Alegre, nunca configurava `store_settings`, então ninguém tinha olhado a retirada. Com a tabela sem resposta, o dublê lança, o hook cai nos defaults (escritório vazio) e a retirada não aparece. Esse teste continua verde sem mudança.
- Os testes rodam sobre o dublê. Não houve prova em navegador nem contra o Supabase local; isso é da QA no reteste do BUG-008.
- Nada propagado: as tarefas 20 e 22 tocam `PassoRevisar.tsx`, mas nenhuma afirmação delas ficou falsa.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 16
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines); apps/mobile-adm/CLAUDE.md (topo, Pedidos montados, Montar pedido, Os guardas do app, Testes)
Testes escritos: apps/mobile-adm/src/pages/__tests__/montarPedido.revisar.test.tsx › "a retirada no escritório na prévia":
  - CEP do RS com a retirada ligada: as opções e a "Retirada no escritório", grátis (vermelho antes do fix)
  - CEP do RS com a cotação vazia: a retirada sozinha (vermelho antes do fix)
  - CEP de fora do RS: sem a retirada (verde de primeira; o check de mutação deu vermelho)
  - CEP do RS com a retirada desligada: sem a retirada (verde de primeira; o check de mutação deu vermelho)
  Nada sem cobertura no vitest. Layout em 390 e navegador ficam para a QA.
Verificações:
  - arquivo de teste: 19/19
  - tsc do mobile-adm: 0 erros
  - suíte do mobile-adm: 2658/2665. Cinco falhas por contenção, verdes isoladas (65/65); duas na área da tarefa 12, que roda em paralelo
  - guardas da loja: 2826/2826
  - guardas do backoffice: 282/282
Árvore de trabalho: alterados useCotacaoDaRevisao.ts (o hook useRetiradaDaRevisao), PassoRevisar.tsx (a linha da retirada na prévia) e montarPedido.revisar.test.tsx. Nada commitado.
Citações conferidas: 4 (os quatro itens do Contrato, todos JÁ EXISTE e no lugar) e pickup.ts (consumido, não alterado). Nenhuma deslocada, nenhuma morta.
```

## T15 — wi-impl-review · done · agente adab2c8a86a5240dc

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/15-bug-6-cartao-da-cliente.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-006: o Esperado acontece seguindo os Passos (cartão "Cliente" com nome, "N pedidos na loja", e-mail e o telefone ou "sem telefone") | `PassoDaCliente.tsx:300-309`: o nome não mudou; embaixo dele `pedidosNaLoja(pedidos)`; depois o e-mail; depois `maskPhone(phone)`, ou `SEM_TELEFONE_NO_CARTAO` em `ink-soft` | sim (a medida em navegador fica com o reteste do QA) |
| cada comportamento de `Testes` coberto por teste escrito, vermelho antes do fix | `montarPedido.test.tsx:292-314`, dois casos | sim pela leitura: `getByText('2 pedidos na loja')`, `'(51) 98888-7777'` e `'sem telefone'` são buscas de texto exato. A linha antiga, "e-mail · N pedidos", não satisfaz nenhuma delas |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. As decisões já tomadas foram respeitadas:
- Nenhuma leitura nova. `orders` não é lido (D-02).
- O número de pedidos vem de `ClienteDaMontagem.pedidos`, que já chegava da leitura de clientes.
- `portaDeLeitura.ts` ficou intocado. Isso é permitido: o Contrato diz "altere só o necessário".

## Testes

- **O cartão da escolhida mostra o telefone e o número de pedidos.** Arquivo: `apps/mobile-adm/src/pages/__tests__/montarPedido.test.tsx:292`. O caso é a página real (`abrirPelaListaDePedidos` e depois `escolher`), na região "Cliente". A fixture tem `phone: '51988887777'` e `orders_total: 2`. A asserção morde: as buscas são por texto exato do valor formatado, e há também a ausência de "sem telefone".
- **O caso sem telefone e com um pedido.** Mesmo arquivo, linha 303. Morde: exige `'1 pedido na loja'` no singular e `'sem telefone'`.
- **O ajuste em `montarPedido.colarTexto.test.tsx:337-338`.** A asserção antiga cravava a linha juntada "e-mail · 2 pedidos", que a mudança acabou. Ela virou duas buscas exatas do e-mail e de "2 pedidos na loja". É o novo comportamento, não um afrouxamento.
- O nível bate com o que o bloco `Testes` declara: componente/página no vitest.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Não alterar `portaDeLeitura.ts`; o dado já chegava em `ClienteDaMontagem` | sim | O diff não toca leitura nenhuma. A fixture de `customer_list` já traz `phone` e `orders_total`, e o cartão os lê de `estado.cliente`. A decisão da tarefa ("o número de pedidos vem do que a leitura de clientes já expõe") bate | sim, nenhum outro arquivo alcançado |
| 2 | As frases novas ficam em `model/frasesDaMontagem.ts` (`pedidosNaLoja` reaproveita `pedidosDaCliente`, mais `SEM_TELEFONE_NO_CARTAO`), sem reusar a constante de `revisao.ts` | sim | `apps/mobile-adm/CLAUDE.md` › Montar pedido diz que "as frases do passo 1 [vêm] de `model/frasesDaMontagem.ts`". A mudança só acrescenta exports. `linhaDaCliente` segue em uso na lista de busca (`PassoDaCliente.tsx:199`) | sim |
| 3 | A forma do cartão: nome com "N pedidos na loja" embaixo; depois o e-mail e o telefone (ou "sem telefone" em tom suave). A classe do nome não mudou | sim | Segue a ordem do Esperado do bug (spec › Design › Passo 1). A classe do nome está idêntica no diff, então não invade a tarefa 20. A busca, o colar e o endereço ficaram intocados, então não invade a tarefa 21 | sim |

## Não conferido

- Não rodei os testes nem medi o cartão em 390: a execução não é desta revisão.
- O guarda `semDadoSensivelDeClienteNoApp` foi lido só pelo cabeçalho e pela lista de exceções. Ele recusa o documento e o endereço; o telefone já estava nas colunas lidas. A suíte dele não foi executada.
- Os quatro arquivos de `alterados` aparecem como `M` no `git status`, então há baseline. Eu não separei, dentro do diff, o que outra tarefa da onda possa ter mexido nesses arquivos. Tudo o que li no diff é explicado por esta tarefa.

Instruções lidas: `apps/mobile-adm/CLAUDE.md` › Montar pedido (WI 94), lido parcialmente; `CLAUDE.md` (raiz) › Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, que vieram no contexto da sessão.

## T16 — wi-impl-review · fixing · agente af335b038ed43c741

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/16-bug-8-previa-de-entrega.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | `premissa derrubada` | atrapalha | apps/mobile-adm/src/features/order-proposal/model/useCotacaoDaRevisao.ts:57-58 (`useRetiradaDaRevisao` chama `useStoreSettings()`) | A premissa 1 lê `store_settings` pelo PostgREST fora de `lerComPapel`, pelo hook de `core`. O hook importa o client, então a leitura nunca aparece no guarda `leituraSoComPapel`, que só olha o import direto. A justificativa ("leitura pública, o painel faz igual") não se sustenta neste app. Aqui a montagem já lê uma tabela pública, o catálogo de `products`, dentro de `lerComPapel` (`entities/product/api/catalogoDaMontagem.ts`, citado no cabeçalho de `leituraSoComPapel.test.ts`). O painel não tem essa regra, então não serve de precedente. Não há comportamento errado, porque o dado é público. A forma é que diverge da regra do app. | `apps/mobile-adm/CLAUDE.md:227`: "**Toda leitura passa por `lerComPapel`** (`shared/api/lerComPapel.ts`, `MAP-36`..`38`)". `apps/mobile-adm/CLAUDE.md:335`: "`shared/api/lerComPapel.ts` (toda leitura; a RPC `atelie_clock` em paralelo, a recusa vence)". Cabeçalho de `leituraSoComPapel.test.ts`: "no app do ateliê, toda leitura de tabela pelo PostgREST passa por `lerComPapel`" |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-008: o Esperado acontece seguindo os Passos | `PassoRevisar.tsx:108-110,181-209` (a linha "Retirada no escritório" com a linha do escritório e "grátis", ao lado das opções do Melhor Envio, e a frase da prévia mantida). A regra vem de `pickupAvailable`/`pickupLocation` (`core`). Sem prazo na retirada: premissa 3, que bate com o painel | sim (o efeito na tela, só execução) |
| cada comportamento do bloco Testes coberto por teste escrito, vermelho antes do fix | `montarPedido.revisar.test.tsx:220-269` | sim para a cobertura. O vermelho antes do fix só a execução prova |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. As decisões já tomadas foram cumpridas:
- A regra da retirada é consumida de `core/shipping` (`pickupAvailable`, `pickupLocation`, `PICKUP_METHOD_NAME`), sem ser reescrita.
- `packages/core/src/shipping/pickup.ts` não está em `alterados`.
- A linha "Total" do resumo não foi tocada no diff.
- `MontarPedidoPage` não foi tocada, conforme a premissa 2.

## Testes

- "CEP do RS com a retirada disponível mostra 'Retirada no escritório'". Arquivo: `montarPedido.revisar.test.tsx:232-238`. É a página real com a configuração dublada em `store_settings`, e a asserção morde:
  - confere por igualdade a lista inteira de `opcao-de-entrega`, com o texto exato da linha do escritório e "grátis";
  - um segundo caso (240-247) prova a retirada sozinha com a cotação vazia, sem "Nenhuma entrega disponível".
- "CEP de fora do RS, não". Arquivo: `montarPedido.revisar.test.tsx:249-259`. A asserção morde:
  - a retirada está ligada e o escritório completo, e só o CEP é de SP. Ignorar o CEP faria a lista igualitária reprovar;
  - há ainda um caso com a retirada desligada (261-267), que pega um `enabled` ignorado.
- O nível pedido era componente/página (vitest), e o teste está nesse nível.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | A configuração da retirada vem de `useStoreSettings` (`core`), fora de `lerComPapel` | não | `apps/mobile-adm/CLAUDE.md:227` e `:335` ("toda leitura"). O caso análogo é o catálogo público da montagem, lido dentro de `lerComPapel`. O precedente do painel (`ShippingPreview.tsx:8`) é de outro app, sem essa regra. A exceção escrita do app (`store_movement`, CLAUDE.md:446) vale só para uma RPC que recusa sozinha, o que `store_settings` não faz | sim: só `useCotacaoDaRevisao.ts` e a chave `['store_settings']`. A correção pode tocar a allowlist de `leituraSoComPapel`/`escritaSoPelaPorta`, se nascer um leitor novo |
| 2 | `useRetiradaDaRevisao(endereco)` é chamado dentro de `PassoRevisar` | sim | `MontarPedidoPage` não está na posse desta tarefa. `PassoRevisar` já recebe `endereco` | sim (as tarefas 20 e 22 tocam `PassoRevisar.tsx`, e estão declaradas) |
| 3 | A retirada sai sem prazo, só com o escritório e "grátis" | sim | `apps/backoffice/src/features/order-proposal/ui/ShippingPreview.tsx:92-99` também não mostra prazo na retirada. O app evita o relógio do aparelho (`apps/mobile-adm/CLAUDE.md:450-451`) | sim |
| 4 | A retirada aparece mesmo com a cotação falha ou vazia. "Nenhuma entrega" some quando há retirada. Durante a carga fica só "Cotando o frete…" | sim | Bate com `ShippingPreview.tsx:65-76`, ramos idênticos | sim |

## Não conferido

- O vermelho antes do fix e os testes passando: só a execução prova.
- O layout da linha nova em 390 (quebra da linha do escritório, sem rolagem lateral) é da QA em navegador.
- Os três arquivos de `alterados` aparecem como `M` no `git status`, e o diff foi lido inteiro. Nenhuma mudança alheia a esta tarefa apareceu neles.
- Instruções lidas:
  - `CLAUDE.md` (raiz), entregue no contexto: › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines;
  - `apps/mobile-adm/CLAUDE.md`, por seções: › Pedidos (linhas 222-240), › Clientes (333-338), › A Loja ao vivo (440-451), › Pedidos montados e › Montar pedido (WI 94) (480-560), › PWA, › Identidade, › Navegação, › a tabela dos guardas (678, 682).

## T12 — wi-impl-task · review · agente a57df0fff57778ddd

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/12-bugs-2-18-folha-da-variacao.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A proteção contra o duplo toque fica na própria folha: uma `useRef` (`confirmou`) no `Corpo` da `FolhaDaVariacao` faz o botão confirmar uma vez só a cada abertura (o `Corpo` desmonta quando a folha fecha, e a trava zera junto). | Deduplicar em `confirmarPeca` (MontarPedidoPage.tsx, cercado por outra tarefa) ou em `sacola.ts` (o redutor recusaria duas linhas iguais) | `MontarPedidoPage.tsx` é de outra tarefa desta onda. A causa está na folha: o voltar que fecha a folha é assíncrono e o Radix deixa o conteúdo montado durante a animação de saída. Recusar linhas iguais em `sacola` também bloquearia duas linhas iguais acrescentadas de propósito. | `FolhaDaVariacao.tsx`; o "Salvar" da edição passa pela mesma trava |
| 2 | Acima do estoque, o texto "Só há N em estoque." toma o lugar do "N em estoque" no mesmo ponto da linha da quantidade, como `<span id="motivo-da-folha" role="alert">`. O `aria-describedby` do botão continua apontando para ele. O aviso SEM_PRECO fica onde já estava. | Manter o `<p>` de alerta embaixo e só esconder a linha de estoque | O protótipo diz que a linha "vira" o aviso. Com a troca no mesmo lugar, nunca aparecem as duas. | `FolhaDaVariacao.tsx` |
| 3 | Chip escolhido: `bg-estrelinha-primary` com `border-estrelinha-primary`. O rótulo e a linha de estoque do chip ficam os dois em `text-estrelinha-on-primary`. | Deixar a linha de baixo em `ink-soft` | `ink-soft` sobre o fundo primário não daria contraste. O protótipo pede on-primary. | `FolhaDaVariacao.tsx` |
| 4 | Aviso de material: `EnvioIcon` (`@estrelinha/ui/icons`) com `h-5 w-5 shrink-0 text-estrelinha-primary`, ao lado da frase, numa caixa `data-parte="aviso-de-material"`. Segui a forma de `EnvelopeDaCliente.tsx`. | Usar um ícone do lucide | O app já usa o caminhão da marca como "envio", e a biblioteca tem um desenho só para ele. | `FolhaDaVariacao.tsx` |
| 5 | O teste do duplo toque é de componente (a folha sozinha, com o `controle` aberto fixo e `usePromocaoDasLinhas` dublado). Não é pela página. | Teste pela página real | Pela página, o jsdom desmonta o conteúdo do Radix na hora, sem animação de saída: o segundo clique cai num nó solto e o teste fica verde mesmo com o defeito. Medi isso duas vezes, uma delas segurando o `history.go`. Na página, o teste não ficaria vermelho antes do conserto. | só os testes |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Dois toques seguidos em "Acrescentar" deixam uma linha só, com a quantidade escolhida | componente | `apps/mobile-adm/src/features/order-proposal/ui/__tests__/FolhaDaVariacao.test.tsx` | sim | — (vermelho antes do conserto: "called 2 times") |
| 2 | Chip escolhido, aviso de material e linha de estoque com as classes e os textos do protótipo (token exato) | página (`<App />` real) | `apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx`, describe "passo 2 · a folha da variação segue o protótipo" | sim | — (vermelho antes do conserto: classes do chip, ícone e as duas linhas de estoque) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx — alterado
apps/mobile-adm/src/features/order-proposal/ui/__tests__/FolhaDaVariacao.test.tsx — criado
apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx — alterado

## Verificação

- Um arquivo de teste (PROJECT.md › Comandos de verificação): `pnpm --filter @estrelinha/mobile-adm exec vitest run <arquivo> --testTimeout=20000`. Antes do conserto, os dois casos novos ficaram vermelhos pelo motivo certo. Depois do conserto, FolhaDaVariacao.test.tsx e montarPedido.pecas.test.tsx dão 11/11 verdes.
- Tipos (CLAUDE.md › Comandos): `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` dá exit 0 e 0 erros. Não recebi `baseline` e não medi um antes de começar; com 0 erros não há o que comparar.
- Verificação mínima (CLAUDE.md › Baselines, via PROJECT.md):
  - Suíte do mobile-adm: `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` deu 2630 verdes e 35 reprovados em 169 arquivos.
  - Os 35 reprovaram por contenção: era sempre o primeiro caso de cada arquivo, com "Hook timed out in 10000ms" ou o efeito disso (`client` indefinido no `afterEach`). As tarefas paralelas estavam rodando suítes na mesma máquina, e nenhum desses arquivos foi tocado por mim.
  - Rodei de novo só os 35 arquivos: 35/35 arquivos e 505/505 casos verdes. Com isso o app fecha 2665/2665.
  - Suíte da loja: `pnpm --filter @estrelinha/store test --testTimeout=20000` deu exit 0, com 378 arquivos e 7091 casos.
- Lint (só os três arquivos): `npx eslint` dá exit 0. Ele pegou um NBSP literal que eu tinha colado no teste, já trocado pelo escape ` `.
- Instruções lidas:
  - CLAUDE.md (raiz), por inteiro, vindo no contexto.
  - apps/mobile-adm/CLAUDE.md (75 KB, lido por seção): › topo e O que existe hoje; › A árvore; › Montar pedido (WI 94); › PWA; › Identidade; › Navegação; › Os guardas do app; › Testes.
  - .specs/project/PROJECT.md › Comandos de verificação; › Ambiente local.

## Divergências e descobertas

- O teste do duplo toque não pôde ser pela página: o jsdom desmonta o conteúdo do Radix na hora, sem a animação de saída que, no Chromium, deixa o botão alcançável no segundo toque (premissa 5). A fiação da página não muda (o mesmo `aoConfirmar`). Falta provar em navegador que o duplo toque real fica com uma linha só; isso é do reteste do QA.
- Na primeira rodada, a suíte do mobile-adm teve 35 reprovações por contenção de máquina (tarefas paralelas). Todas passaram rodadas de novo isoladamente.
- `TMPDIR/wi-impl-saida.txt` era compartilhado com as tarefas paralelas e a saída se misturava; passei a gravar a saída no scratchpad da sessão.
- Nada a propagar: as tarefas seguintes que citam `FolhaDaVariacao.tsx` (a 20, sobre o preço) não afirmam nada que o conserto tenha tornado falso.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 12
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz); apps/mobile-adm/CLAUDE.md (por seção: topo, A árvore, Montar pedido (WI 94), PWA, Identidade, Navegação, Os guardas do app, Testes); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: (1) duplo toque → uma confirmação só, com quantidade 2 — apps/mobile-adm/src/features/order-proposal/ui/__tests__/FolhaDaVariacao.test.tsx (componente; pela página o jsdom não reproduz a folha montada durante a animação de saída); (2) chip escolhido em primary/on-primary, aviso de material com o EnvioIcon em primary (traços iguais aos do ícone), linha de estoque que vira "Só há 3 em estoque." no mesmo lugar, uma só, com role=alert e aria-describedby — apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx. Os dois vermelhos antes do conserto.
Verificações: arquivos de teste 11/11 verdes; tsc mobile-adm 0 erros; suíte mobile-adm 2665/2665 (35 reprovaram por timeout de contenção na primeira rodada e passaram rodados de novo); suíte da loja 7091/378, exit 0; eslint dos três arquivos limpo
Árvore de trabalho: alterado apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx; criado apps/mobile-adm/src/features/order-proposal/ui/__tests__/FolhaDaVariacao.test.tsx; alterado apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx. PassoDasPecas.tsx e sacola.ts não precisaram mudar
Citações conferidas: 3 (os três arquivos do Contrato), nenhuma deslocada ou morta; exemplar do ícone em features/order-actions/ui/EnvelopeDaCliente.tsx
```

## T12 — wi-impl-review · done · agente a832a3a36b8ef8422

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/12-bugs-2-18-folha-da-variacao.md
Veredito: serve

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| | nada | | | | |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-002: o Esperado ("Uma linha só na sacola") acontece seguindo os Passos | `FolhaDaVariacao.tsx`: `confirmou = useRef(false)` no `Corpo`, e o `onClick` do botão sai cedo no segundo toque. O `Corpo` desmonta ao fechar, então a trava volta a zero a cada abertura. `confirmarPeca` sempre fecha a folha (`MontarPedidoPage.tsx:370-378`), então a trava nunca deixa um botão morto com a folha aberta | sim (no código). O duplo toque real no Chromium, só execução |
| BUG-018: chip primário com texto on-primary, aviso com o ícone de envio em primária, "N em estoque" trocado por "Só há N em estoque." | `FolhaDaVariacao.tsx`: o chip escolhido com `border-estrelinha-primary bg-estrelinha-primary` e os dois spans em `text-estrelinha-on-primary`; o `EnvioIcon` com `text-estrelinha-primary` dentro de `data-parte="aviso-de-material"`; um ternário `passou ? soHaEmEstoque : emEstoque` no mesmo lugar, e o `<p>` de baixo foi removido | sim |
| cada comportamento do bloco Testes coberto por um teste escrito, vermelho antes do fix | `FolhaDaVariacao.test.tsx` e o `describe` novo em `montarPedido.pecas.test.tsx` | só execução (o vermelho antes do fix). Pela leitura, as duas asserções mordem |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. O `Contrato` dá posse sobre `FolhaDaVariacao.tsx`, `PassoDasPecas.tsx` e `sacola.ts`. Só `FolhaDaVariacao.tsx` foi alterado, dentro da posse. O `MontarPedidoPage.tsx`, que é de outra tarefa, não foi tocado.

## Testes

- **"dois toques seguidos em 'Acrescentar' deixam uma linha só na sacola, com a quantidade escolhida"**: `apps/mobile-adm/src/features/order-proposal/ui/__tests__/FolhaDaVariacao.test.tsx:46`.
  - O `controle` fica aberto fixo e cada clique tem o seu `act`.
  - Assere `aoConfirmar` com `toHaveBeenCalledTimes(1)` e com `{ variacao: null, quantidade: 2, gravacao: '' }`.
  - Morde: sem a trava, o segundo clique chama de novo, porque a folha continua montada.
  - O nível declarado é "componente/página", e o teste é de componente. Não houve troca de nível.
- **"o chip escolhido, o aviso de material e a linha de estoque com as classes e os textos do protótipo (token exato)"**: `apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx:376-429`, pela página real. Morde em todas as partes:
  - Os tokens são exatos, comparados por split de classe, com os negativos ao lado (`bg-estrelinha-ground-deep`, `text-estrelinha-ink`, `text-estrelinha-ink-soft`).
  - O chip não escolhido também é conferido, como contraprova.
  - Os traços do SVG são comparados com o `EnvioIcon` renderizado, então um ícone trocado não passa.
  - "3 em estoque" some e "Só há 3 em estoque." aparece uma vez só, dentro do bloco da quantidade, com `role="alert"` e `text-estrelinha-alert`.
  - O `aria-describedby` aponta para o id do aviso.
  - De volta ao teto, a linha volta a ser o estoque.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | trava por `useRef` no `Corpo` da folha | sim | `confirmarPeca` (`MontarPedidoPage.tsx:370-378`) sempre fecha a folha, então a trava nunca deixa o botão morto com a folha aberta. A posse de `MontarPedidoPage.tsx` é de outra tarefa. Recusar linhas iguais em `sacola` mudaria a regra da sacola | sim: o "Salvar" passa pela mesma trava, e isso está declarado |
| 2 | "Só há N em estoque." troca a linha de estoque no mesmo lugar, como `<span role="alert" id="motivo-da-folha">` | sim | O Esperado do BUG-018 diz "a linha 'N em estoque' vira 'Só há N em estoque.'". O aviso SEM_PRECO segue com o mesmo id, sem os dois na tela juntos (`!passou &&`) | sim |
| 3 | chip escolhido em primária, com rótulo e estoque em on-primary | sim | O Esperado do BUG-018 pede "preenchido em primária com texto on-primary" | sim |
| 4 | `EnvioIcon` de `@estrelinha/ui/icons` | sim | `apps/mobile-adm/CLAUDE.md:261` cita o ícone de envio da marca no envelope. A regra lucide-primeiro (`:654`) é só para os ícones das abas | sim |
| 5 | o teste do duplo toque é de componente | sim | O bloco Testes aceita "componente/página". Pelo `apps/mobile-adm/CLAUDE.md` › Testes, a fiação pede a página real, mas aqui o comportamento é da própria folha. A justificativa, de que no jsdom o Radix desmonta na hora, explica por que pela página o teste não ficaria vermelho | sim |

## Não conferido

- O vermelho antes do fix e os testes passando: só a execução prova.
- O duplo toque em navegador real, durante a animação de saída do Radix.
- O contraste visual do chip desligado (`disabled:opacity-50`) quando ele também é o escolhido: só no navegador.
- Os três arquivos aparecem no diff: `M`, `A` (com intent-to-add) e `M`. Nenhum ficou sem baseline.

Instruções lidas: `CLAUDE.md` (raiz, já no contexto: Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines); `apps/mobile-adm/CLAUDE.md` › índice de títulos, › Montar pedido (WI 94), › Identidade, › Navegação (os ícones), › Testes, e a linha 261 (o ícone de envio).

## T16 — wi-impl-task · done · agente af265983652f944c0

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/16-bug-8-previa-de-entrega.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 (revista) | A configuração da retirada (`shipping.pickup_enabled` e `material`) agora é lida dentro de `lerComPapel`. A leitura de `store_settings` mora num arquivo novo, `features/order-proposal/api/configuracaoDaRetirada.ts`, e pede só as duas chaves (`select('key, value').in('key', ['shipping','material'])`), com os defaults da loja por cima. A função que toca a tabela não é exportada e só é chamada de dentro de `lerComPapel`, no molde do `catalogoDaMontagem.ts`. O hook `useRetiradaDaRevisao` usa uma chave própria, `atelie-montagem-retirada`, e não chama mais o `useStoreSettings` de `core` | ler pelo `useStoreSettings` de `core`, fora de `lerComPapel` (a versão anterior, apontada pelo achado 1) | a regra do app é "toda leitura passa por `lerComPapel`" (`apps/mobile-adm/CLAUDE.md`) e o app já lê uma tabela pública, o catálogo, desse jeito | `useCotacaoDaRevisao.ts`, `PassoRevisar.tsx`, o arquivo novo e os dois guardas que listam quem importa o client: `leituraSoComPapel.test.ts` e `escritaSoPelaPorta.test.ts`, que passaram de 14 para 15 arquivos. Uma tarefa futura que crie outro arquivo importando o client encontra a lista com 15 |
| 5 | A leitura da configuração só roda com a prévia pronta (`useRetiradaDaRevisao(endereco, cotacao.pronta)`). Uma recusa nessa leitura não vai para a vigia da página: fica sem dado e a retirada não aparece. A recusa chega à página pela cotação, que roda junto e passa pela mesma conferência | ligar o erro dessa leitura à vigia da página | a vigia é ligada em `MontarPedidoPage.tsx`, que está na cerca de outra tarefa desta onda | `PassoRevisar.tsx`. Se a cotação deixar de passar por `lerComPapel`, a recusa desta leitura fica sem quem a reporte |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 5 | A leitura da configuração da retirada passa por `lerComPapel` (`42501` vence a tabela), pede só `shipping` e `material`, usa os defaults e repassa o erro da tabela | unitário (vitest com o dublê) | `features/order-proposal/api/__tests__/configuracaoDaRetirada.test.ts` | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/model/useCotacaoDaRevisao.ts alterado
apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.revisar.test.tsx alterado
apps/mobile-adm/src/features/order-proposal/api/configuracaoDaRetirada.ts criado
apps/mobile-adm/src/features/order-proposal/api/__tests__/configuracaoDaRetirada.test.ts criado
apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts alterado
apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts alterado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run <arquivos> --testTimeout=20000` (comando de `PROJECT.md › Comandos de verificação`), sobre `leituraSoComPapel`, `escritaSoPelaPorta`, `configuracaoDaRetirada`, `montarPedido.revisar`, `montagemComClientReal`, `trocaDeContaLimpaCache` e `src/shared/lib/__tests__`: 549/550 na primeira rodada.
  - A falha foi o sensor do próprio guarda, que crava o tamanho da lista em 14. Passou a 15.
  - `leituraSoComPapel` rodado de novo: 42/42.
  - `configuracaoDaRetirada` e `montarPedido.revisar` juntos: 23/23, exit 0.
- Check de mutação: tirei `lerComPapel` de `lerConfiguracaoDaRetirada`. O caso do `42501` deu vermelho. Restaurei pela cópia e o `cmp` confirmou o arquivo igual. Os dois sensores novos de `leituraSoComPapel` (leitura exportada, leitura fora de `lerComPapel`) passam.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (`CLAUDE.md › Comandos`): 0 erros, igual à baseline de 0.
- Guardas da loja que varrem `apps/**` (`src/shared/lib/__tests__`): 2826/2826, exit 0.
- Guardas do backoffice (`src/shared/lib/__tests__` e `src/app/__tests__`): 282/282, exit 0.
- A suíte inteira do mobile-adm não foi rodada de novo nesta correção. Na implementação ela deu 2658/2665: cinco falhas por contenção, verdes isoladas; duas na área da tarefa 12.

Instruções lidas: as mesmas da implementação. `apps/mobile-adm/CLAUDE.md` (topo, Pedidos montados, Montar pedido, Os guardas do app, Testes); `CLAUDE.md` da raiz.

## Divergências e descobertas

- **Dois guardas fora do Contrato.** `leituraSoComPapel.test.ts` e `escritaSoPelaPorta.test.ts` comparam por igualdade a lista de quem importa o client. O arquivo novo entrou na lista, com régua e dois sensores próprios em `leituraSoComPapel`. Os textos e a âncora que diziam "catorze" passaram a "quinze". Nenhuma asserção foi afrouxada.
- **Documentação com número velho.** `apps/mobile-adm/CLAUDE.md:682` diz "doze arquivos" para o `escritaSoPelaPorta`. Já estava velho antes desta correção (a lista tinha 14). Não atualizei, porque não está na posse desta tarefa. O número certo agora é 15.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 16
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines); apps/mobile-adm/CLAUDE.md (topo, Pedidos montados, Montar pedido, Os guardas do app, Testes)
Testes escritos: apps/mobile-adm/src/pages/__tests__/montarPedido.revisar.test.tsx › "a retirada no escritório na prévia":
  - CEP do RS com a retirada ligada: as opções e "Retirada no escritório", grátis (vermelho antes do fix)
  - CEP do RS com a cotação vazia: só a retirada (vermelho antes do fix)
  - CEP de fora do RS: sem a retirada (o check de mutação deu vermelho)
  - retirada desligada: sem a retirada (o check de mutação deu vermelho)
  Na correção: features/order-proposal/api/__tests__/configuracaoDaRetirada.test.ts — a leitura passa por lerComPapel, pede só as duas chaves, usa os defaults e repassa o erro (o check de mutação deu vermelho). Layout em 390 e navegador ficam para a QA.
Verificações:
  - arquivos de teste tocados: verdes
  - guardas do mobile-adm, da loja (2826/2826) e do backoffice (282/282): verdes
  - tsc do mobile-adm: 0 erros
  - suíte inteira do mobile-adm (na implementação): 2658/2665. Cinco falhas por contenção, verdes isoladas; duas na área da tarefa 12
Árvore de trabalho:
  - useCotacaoDaRevisao.ts: o hook useRetiradaDaRevisao
  - PassoRevisar.tsx: a linha da retirada na prévia
  - api/configuracaoDaRetirada.ts (novo): a leitura de store_settings dentro de lerComPapel, com o teste dela
  - montarPedido.revisar.test.tsx: os quatro testes da retirada
  - leituraSoComPapel.test.ts e escritaSoPelaPorta.test.ts: a lista de quem importa o client passou de 14 para 15
  Nada commitado.
Citações conferidas: 4 do Contrato, mais pickup.ts e o cabeçalho de leituraSoComPapel. Nenhuma deslocada, nenhuma morta.
```

## T11 — wi-impl-task · review · agente a2954056e5675e341

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/11-bugs-1-7-voltar-da-montagem.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | BUG-001: "Criar link" (montagem nova) chama `passos.concluirNoMontado(id)`, em `usePassosDaMontagem`. Ele recua `lido + 1` entradas, até a entrada de ANTES da sentinela. No `popstate` desse recuo, troca essa entrada por `montadosHref()` (replace) e empilha `pedidoMontadoHref(id)` com `{ doApp: true }`. Resultado no histórico: [… , Montados, pedido montado], sem a montagem. | Manter o `navigate(pedidoMontadoHref, { replace: true })`, que deixa os passos 1 a 3 no histórico. Mexer em `history.*` à mão, que o guarda `semDadoDeClienteNoAparelho` proíbe. | O navegador não apaga entradas. Recuar e reescrever é o único jeito de tirar a montagem do histórico, e o avançar fica sem ela, porque o empilhar corta as entradas da frente. O `doApp` faz o "Voltar" do pedido montado usar `navigate(-1)` e cair em Montados. | Quem abriu a montagem de `/pedidos` (de qualquer recorte) volta para Montados, não para o recorte de antes (pedido pela D-43). Editar ("Salvar alterações") não muda: continua em `passos.sair()`. |
| 2 | BUG-007: quando o voltar cai na sentinela com algo preenchido, o hook empilha de novo o passo 1 e liga `perguntarAoSair`. A página abre a MESMA `folhaDeSair` (`useFolhaNaEntrada`) por cima, numa entrada própria. Saí da folha à parte (`folhaDaSentinela`, sem entrada própria) e também de `perguntandoNaSentinela`/`voltarAoPrimeiro`. | Manter a folha desenhada na sentinela. Com ela, o voltar seguinte sai da montagem. | Com entrada própria, o voltar fecha a folha e a montagem fica no passo 1. "Continuar montando" é `fechar` (−1), e "Sair"/"Descartar"/"Guardar rascunho" usam `sair(true)`, que recua o mesmo número de entradas do "x". | `MontarPedidoPage.tsx` e `usePassosDaMontagem.ts`: a API do hook mudou (`perguntarAoSair`, `perguntaAtendida` e `concluirNoMontado` no lugar de `perguntandoNaSentinela` e `voltarAoPrimeiro`). Nenhum outro consumidor: grep vazio. |
| 3 | `FolhaDeConfirmacao.tsx` e `useCriarLink.ts` ficaram sem mudança. | Mexer neles. | O fix não precisou. | nenhum |
| 4 | Os testes ficaram num arquivo novo, `montarPedido.voltar.test.tsx`. | Acrescentar os casos a `montarPedido.test.tsx`. | `montarPedido.test.tsx` tem trabalho de outra tarefa desta onda na árvore. | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Voltar depois de criar o link cai em Montados com o cartão novo; um segundo voltar e o avançar não reabrem a montagem | página (`<App />`, histórico real do jsdom) | `apps/mobile-adm/src/pages/__tests__/montarPedido.voltar.test.tsx` › "cai em Montados com o cartão novo…" | sim (vermelho antes: `/pedidos/montar` em vez de `/pedidos`) | — |
| 2 | Voltar com a folha "Sair sem criar o link?" aberta fecha a folha e mantém o passo 1 com a cliente | página (`<App />`) | idem › "fecha a folha e a montagem fica no passo 1…" | sim (vermelho antes: `/pedidos` em vez de `/pedidos/montar`) | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/model/usePassosDaMontagem.ts alterado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.voltar.test.tsx criado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.voltar.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação): vermelho, 2/2 falhando, antes do fix; verde, 2/2, depois.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (instruções, CLAUDE.md › Comandos): exit 0, nenhum erro. Baseline 0, nada mudou.
- `npx eslint` nos três arquivos (CLAUDE.md › Baselines, lint): exit 0, sem erros nem avisos.
- Verificação mínima (CLAUDE.md › Baselines: a suíte do workspace tocado, mais a da loja):
  - Suíte inteira do mobile-adm, `--testTimeout=20000`: 2659 passaram e 6 reprovaram de 2665, numa execução com outras tarefas rodando ao mesmo tempo na mesma árvore. Cinco dos arquivos (`useListaDeClientes`, `useListaDePedidos`, `usePedido`, `useFolhaNoHistorico`, `usePushNoAparelho`) rodaram de novo sozinhos e passaram: 159/159, exit 0. O sexto (`montarPedido.pecas`, área da tarefa 12) também passou: 194/194, exit 0, no lote de `montarPedido.*`, `pedidosMontados`, `semDadoDeClienteNoAparelho` e `montagemComClientReal`.
  - Suíte da loja, só os guardas que varrem `apps/**` (`src/shared/lib/__tests__` e `src/app/__tests__`): 3123/3123, exit 0. A suíte inteira da loja e a do painel não rodaram nesta tarefa.
- Instruções lidas: `CLAUDE.md` (raiz, já no contexto: Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines); `apps/mobile-adm/CLAUDE.md` › Pedidos montados, › Montar pedido, › Navegação, › Testes, mais o índice de títulos e a lista do que existe hoje; `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- A suíte inteira do mobile-adm foi parar em segundo plano por engano: a primeira chamada saiu sem o parâmetro de timeout. Esperei o fim antes de seguir.
- O `$TMPDIR/wi-impl-saida.txt` é o mesmo arquivo para todas as tarefas desta onda, que gravam nele ao mesmo tempo. Daí em diante gravei as saídas no scratchpad desta sessão.
- O `apps/mobile-adm/CLAUDE.md` › Montar pedido não descreve o voltar depois de "Criar link" (D-43), nem a folha da sentinela como entrada própria. Não editei esse arquivo: está fora da posse desta tarefa, e o fecho da feature o atualiza.
- Ambiente local (Supabase) não usado: os testes rodam sobre o dublê do client.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 11
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz › Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines); apps/mobile-adm/CLAUDE.md (› Pedidos montados, › Montar pedido, › Navegação, › Testes); .specs/project/PROJECT.md (› Comandos de verificação, › Ambiente local)
Testes escritos: BUG-001 — apps/mobile-adm/src/pages/__tests__/montarPedido.voltar.test.tsx › "cai em Montados com o cartão novo; um segundo voltar e o avançar não reabrem a montagem"; BUG-007 — idem › "fecha a folha e a montagem fica no passo 1, com a cliente escolhida". Os dois vermelhos antes do fix. Nada sem cobertura.
Verificações: arquivo novo 2/2 verde; tsc do mobile-adm 0 erros; eslint dos três arquivos limpo; suíte do mobile-adm 2659/2665 numa rodada com as outras tarefas rodando ao mesmo tempo, e os arquivos que reprovaram passaram ao rodar de novo sozinhos (159/159 e 194/194); guardas da loja (shared/lib e app) 3123/3123. A suíte inteira da loja e a do painel não rodaram.
Árvore de trabalho: alterados apps/mobile-adm/src/features/order-proposal/model/usePassosDaMontagem.ts e apps/mobile-adm/src/pages/MontarPedidoPage.tsx; criado apps/mobile-adm/src/pages/__tests__/montarPedido.voltar.test.tsx. Nada commitado.
Citações conferidas: 4 (os quatro arquivos do Contrato; todos existiam, nenhum deslocado nem morto; FolhaDeConfirmacao.tsx e useCriarLink.ts ficaram sem mudança)
```

## T11 — wi-impl-review · done · agente a4a647775d1cd8f2d

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/11-bugs-1-7-voltar-da-montagem.md
Veredito: serve

Não encontrei nenhum achado nos três arquivos alterados. As quatro premissas se sustentam e o raio de alcance declarado confere.

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-001: o Esperado acontece seguindo os Passos | `usePassosDaMontagem.ts` `concluirNoMontado` e `MontarPedidoPage.tsx:361` (`gravar` → `passos.concluirNoMontado(salvo.id)`). Na criação a partir do passo 4, `lido` vale 4 e o recuo é de 5 entradas: cai na entrada de antes da sentinela. No `popstate` ele faz `replace` para `montadosHref()` e empilha `pedidoMontadoHref(id)` com `{ doApp: true }`. A montagem sai do histórico, e o avançar não a reabre porque o empilhar corta as entradas da frente. | sim (no código); a confirmação depende de execução |
| BUG-007: o Esperado acontece seguindo os Passos | No hook, o ramo da sentinela com algo preenchido faz `setPerguntar(true)` e depois `empilhar(1)`. Na página, o `useEffect` sobre `perguntarAoSair` chama `perguntaAtendida()` e depois `folhaDeSair.abrir()`. Pelo `useFolhaNaEntrada`, a folha entra numa entrada própria e preserva o `state`, então `lido` continua 1. O voltar fecha a folha. "Sair" chama `sair(true)` e recua 1+1+1 = 3 entradas, até a de antes da sentinela. | sim (no código); a confirmação depende de execução |
| cada comportamento do bloco Testes coberto por teste escrito, vermelho antes do fix | `montarPedido.voltar.test.tsx`, dois casos. Lendo as asserções, os dois reprovariam com o código antigo: o antigo fazia `replace` e o primeiro voltar caía em `/pedidos/montar`; o voltar com a folha da sentinela levava para fora de `/pedidos/montar`. | depende de execução (ninguém viu o vermelho) |
| testes dos arquivos alterados passando | — | depende de execução |
| verificação mínima de fechar unidade de trabalho | — | depende de execução |

## Obrigações

A tarefa não tem bloco `Obrigações`.

Restrições conferidas:
- **Nenhum dado da cliente no `history.state`.** O pedido montado é empilhado com `{ doApp: true }`, e a folha só acrescenta o marcador `folhaDaTela`.
- **Nenhuma escrita direta no histórico.** O hook só usa `window.addEventListener('popstate')` e nenhum `history.pushState`/`replaceState`. O guarda `semDadoDeClienteNoAparelho` (regra "history à mão", linha 170) não o alcança.

## Testes

- **Voltar depois de "Criar link" cai em Montados com o cartão novo; um segundo voltar e o avançar não reabrem a montagem.** Teste em `apps/mobile-adm/src/pages/__tests__/montarPedido.voltar.test.tsx`, no `describe('o voltar depois de "Criar link"')`. Usa `<App />` real (`montarApp`) e o histórico real do jsdom (`history.back`/`forward`). O nível bate com o que o bloco `Testes` pede. A asserção morde:
  - confere o pathname `/pedidos` com `visao=montados`;
  - confere um `cartao-do-montado` com "Helena Prado";
  - confere que, depois do segundo voltar e dos dois avançar, a tela não está na montagem;
  - confere que o último avançar cai em `/pedidos/montados/<id>`.
- **Voltar com a folha "Sair sem criar o link?" aberta fecha a folha e mantém o passo.** Teste no mesmo arquivo, no `describe('o voltar com a folha ...')`, pela página real. A asserção morde:
  - não há mais `dialog`;
  - o pathname continua `/pedidos/montar`;
  - aparece "Passo 1 de 4 · Cliente" com a Helena na região Cliente.
  O teste também exercita "Sair" (para em `/pedidos`), que pega um erro na contagem de `sair(true)`.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | "Criar link" chama `concluirNoMontado`, que recua `lido + 1` entradas, troca a entrada por Montados e empilha o pedido montado com `doApp` | sim | Bate com a D-43 citada na tarefa ("a criação do link substitui as entradas dos passos, e um segundo voltar não reabre a montagem"). Não escreve no histórico à mão: o guarda proíbe só `pushState`/`replaceState`. Editar continua em `passos.sair()` (`MontarPedidoPage.tsx:351`). | sim. A troca da entrada de antes da sentinela por Montados, qualquer que fosse o recorte, está declarada. |
| 2 | A folha da sentinela vira a mesma `folhaDeSair`, com entrada própria; a API do hook muda | sim | Com o `state` preservado pelo `useFolhaNaEntrada`, `lido` fica em 1 com a folha aberta, e `sair(true)` recua exatamente até a entrada de antes da sentinela. Procurei `perguntandoNaSentinela`, `voltarAoPrimeiro`, `perguntarAoSair` e `concluirNoMontado` em `apps/mobile-adm/src` e em `tasks/`: só aparecem nos dois arquivos alterados. | sim |
| 3 | `FolhaDeConfirmacao.tsx` e `useCriarLink.ts` ficam sem mudança | sim | A posse desses arquivos era opcional ("altere só o necessário ao fix"). | sim |
| 4 | Os testes vão para um arquivo novo | sim | Nenhuma exigência da tarefa fixa o arquivo dos testes. | sim |

## Não conferido

- A execução dos testes, a verificação mínima e o vermelho antes do fix. Esta revisão não roda código, e `sem mutação` veio vazio.
- A janela intermediária do recuo em `concluirNoMontado`. Entre o `popstate` e o `replace`, a rota de antes da sentinela (Pedidos) chega a montar por um instante. Só a execução no navegador mostra se isso pisca na tela; o teste não mede.
- Os três arquivos aparecem no diff: os dois alterados com `M`, o teste com intent-to-add (`A`). Não há arquivo sem baseline.

Instruções lidas: `CLAUDE.md` (raiz), carregado no contexto. Seções conferidas: › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines. Não abri `apps/mobile-adm/CLAUDE.md` por inteiro. No lugar dele, conferi direto o guarda `apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts` (regras 4 e 5) e o precedente de `eslint-disable-next-line react-hooks/exhaustive-deps` no próprio `usePassosDaMontagem.ts` e em `useFolhaNaEntrada.ts`.

## T21 — wi-impl-task · review · agente a7ef5ffebfa763956

Tarefa: .specs/work-items/94-montar-pedido-no-app/tasks/21-bug-17-passo-da-cliente.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A inicial de 44 px virou uma prop opcional `media` em `entities/customer/ui/Inicial.tsx`, que fica fora da posse da tarefa. O tamanho padrão (40 px) e o `grande` (56 px) não mudaram | Classe com seletor arbitrário no pai sobrepondo `h-10`, ou desenhar o círculo de novo dentro do `PassoDaCliente` | O círculo tem um dono só (o "defeito 01" do repositório). Uma prop opcional é a menor superfície e é fácil de desfazer. O seletor arbitrário deixaria `h-10` e `h-11` no mesmo nó | `Inicial.tsx`, usado também em Clientes. O padrão continua o mesmo, e a suíte do mobile-adm passa nas telas de Clientes |
| 2 | "Endereço de entrega" é um `Cartao` próprio, depois do cartão Entrega, só na Cliente nova e só com "Informar o endereço agora" marcado. No cartão Entrega ficam as duas opções | Pôr o título dentro de `FormularioDeEndereco`, ou mudar também o "Outro endereço" da cliente cadastrada | O bug descreve só a cliente nova. O formulário é o mesmo nos dois modos, então um título dentro dele mudaria também o da cadastrada, que o bug não pede. Por isso `FormularioDeEndereco.tsx` não foi alterado | `PassoDaCliente.tsx`. O formulário da cadastrada continua dentro das opções de entrega: se o protótipo também o separar, isso vira outro bug |
| 3 | A frase "Endereço de entrega" ficou em `model/frasesDaMontagem.ts` (`ENDERECO_DE_ENTREGA`). Esse arquivo fica fora da posse da tarefa | Uma constante local no componente | O `CLAUDE.md` do app diz que as frases do passo 1 moram em `frasesDaMontagem.ts`, e ele manda no COMO. Nenhuma tarefa desta onda tem posse desse arquivo | `frasesDaMontagem.ts`: uma linha nova, só acrescentada |
| 4 | O cartão dos resultados é o `<ul aria-label="Clientes">` com `rounded-lg` (20 px na escala do design system), `border-estrelinha-line` e `bg-estrelinha-surface`. Cada linha ganhou `px-4` | Um `<div>` de cartão em volta da lista | A escala do design system diz que o raio 20 é o `lg` ("caixa"). Pôr as classes no próprio `ul` não muda a árvore que os testes da página leem (`list` "Clientes") | `PassoDaCliente.tsx` |
| 5 | O convite ficou com o título em `font-body text-[15px] font-medium`, o ícone em `text-estrelinha-accent` e o respiro em `p-[18px]`. Isso entrou na variante `escuro` do `Cartao`, que só o convite usa | Um componente só para o convite | Só o convite usa a variante escura, então a mudança alcança só ele. Ouro sobre `ink` mede 4,78:1, e como objeto gráfico passa | `PassoDaCliente.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Os resultados da busca ficam num cartão (superfície, borda, raio de caixa), com a inicial de 44 px | componente (vitest) | `features/order-proposal/ui/__tests__/PassoDaCliente.test.tsx` › "os resultados da busca vêm num cartão…" | sim | — |
| 2 | Convite: título 15 px 500 na fonte do corpo, ícone em ouro, respiro de 18 px | componente | idem › "o convite … tem título de 15 px 500…" | sim | — |
| 3 | O e-mail da cliente nova mostra o exemplo "nome@email.com" | componente | idem › "o e-mail da cliente nova traz o exemplo…" | sim | — |
| 4 | O endereço da cliente nova é um bloco próprio "Endereço de entrega", depois do cartão Entrega e fora das opções | componente | idem › "o endereço da cliente nova é um bloco próprio…" | sim | — |
| 5 | Com "A cliente preenche no link" o bloco de endereço não aparece (o inverso da fatia 4) | componente | idem › "com 'A cliente preenche no link'…" | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx alterado
apps/mobile-adm/src/features/order-proposal/model/frasesDaMontagem.ts alterado
apps/mobile-adm/src/entities/customer/ui/Inicial.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/__tests__/PassoDaCliente.test.tsx criado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/features/order-proposal/ui/__tests__/PassoDaCliente.test.tsx --testTimeout=20000`. Origem: `PROJECT.md` › Comandos de verificação. Antes do fix: 4 falhas e 1 caso passando (o inverso). Depois: 5/5. Check de mutação no inverso (tirei a condição `entregaEfetiva === 'outro'`): o caso ficou vermelho. Restaurei pela cópia, `cmp` conferiu o arquivo byte a byte, e voltou a 5/5.
- Os testes da página e os guardas do app, com o mesmo comando sobre `src/pages/__tests__/montarPedido*`, `src/shared/lib/__tests__`, `src/app/__tests__/montagemComClientReal.test.tsx` e `src/features/order-proposal`: 37 arquivos, 574/574, exit 0.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json`. Origem: `CLAUDE.md` › Comandos. 0 erros, igual à baseline (o mobile-adm está em 0).
- `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000`. Origem: `CLAUDE.md` › Baselines, a verificação mínima. 2682/2685, com 3 falhas, todas em arquivos que a tarefa 17 está editando agora: `pedidoMontado.desenho.test.tsx` (2 casos) e `Selo.test.tsx`, que acusa `pages/PedidoMontadoPage.tsx`. Nenhuma falha toca o que esta tarefa alterou.
- `pnpm --filter @estrelinha/store test --testTimeout=20000`. Origem: `CLAUDE.md` › Baselines (a suíte da loja quando o app muda). 378 arquivos, 7091/7091 passando. O exit foi 1 por um erro só, "vitest-worker: Timeout calling onTaskUpdate": é a máquina contendida pelas outras suítes da onda rodando junto, e nenhum teste falhou.

Instruções lidas: `CLAUDE.md` (raiz, no contexto da sessão: Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines); `apps/mobile-adm/CLAUDE.md` (75 KB, lido por seção) › O que existe hoje, › Pedidos montados (WI 94), › Montar pedido (WI 94), › Identidade, › Navegação, › Os guardas do app, › Testes; `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- Mexi em dois arquivos fora da posse da tarefa, registrados nas decisões 1 e 3: `entities/customer/ui/Inicial.tsx` (a prop `media`) e `model/frasesDaMontagem.ts` (a frase nova). Nenhum deles é das tarefas 14 ou 17.
- `FormularioDeEndereco.tsx` estava na posse, mas não precisou mudar: o título e o bloco próprio foram resolvidos no `PassoDaCliente`.
- A suíte do mobile-adm tem 3 falhas da tarefa 17, que roda em paralelo (`PedidoMontadoPage.tsx` e `pedidoMontado.desenho.test.tsx`). Não são desta tarefa e eu não as toquei.
- Na suíte da loja, o vitest registrou um erro de worker (timeout de RPC) por contenção, com todos os testes passando.
- O "Outro endereço" da cliente cadastrada continua com o formulário dentro das opções de entrega (decisão 2). O reteste do QA pode conferir esse ponto contra o protótipo.
- O protótipo `Montar Pedido.dc.html` não está no repositório. As medidas vieram da tabela Design × implementado do bug.
- As medidas de pixel (44 px, 18 px, 15 px) foram provadas por classe exata, não por medição, porque o jsdom não mede layout. A prova de layout é da QA, em navegador.
- Rodei a suíte da loja uma vez sem passar `timeout` à ferramenta, e ela foi para segundo plano. Esperei em primeiro plano até ela terminar, antes de ler o resultado.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 21
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; apps/mobile-adm/CLAUDE.md (por seção: O que existe hoje, Pedidos montados, Montar pedido, Identidade, Navegação, Os guardas do app, Testes); .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local
Testes escritos: apps/mobile-adm/src/features/order-proposal/ui/__tests__/PassoDaCliente.test.tsx — os resultados da busca em cartão com a inicial de 44 px; o convite (título 15 px 500 na fonte do corpo, ícone em ouro, respiro de 18 px); o exemplo "nome@email.com" no e-mail; o endereço da cliente nova como bloco próprio "Endereço de entrega" depois do cartão Entrega; o inverso (com "no link" o bloco some). Os quatro primeiros ficaram vermelhos antes do fix; o inverso passou de primeira e o check de mutação o deixou vermelho. As medidas de pixel ficaram por classe exata: o jsdom não mede layout, e a medição é da QA
Verificações: o teste da tarefa 5/5; os testes da página, os guardas e o client real da montagem 574/574; tsc do mobile-adm 0 erros; suíte do mobile-adm 2682/2685, com as 3 falhas nos arquivos da tarefa 17 em paralelo (PedidoMontadoPage, pedidoMontado.desenho); suíte da loja 7091/7091, com um erro de worker por contenção
Árvore de trabalho: PassoDaCliente.tsx (alterado), frasesDaMontagem.ts (alterado, fora da posse: a frase "Endereço de entrega"), entities/customer/ui/Inicial.tsx (alterado, fora da posse: a prop `media` de 44 px), ui/__tests__/PassoDaCliente.test.tsx (criado); nada commitado
Citações conferidas: 3 (PassoDaCliente.tsx e FormularioDeEndereco.tsx do Contrato, e a dependência da tarefa 15, que está no commit 87f2120b); nenhuma deslocada nem morta
```

## T21 — wi-impl-review · done · agente ac574d496cdc58c7c

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/21-bug-17-passo-da-cliente.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| nada |  |  |  |  |  |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-017: o Esperado acontece seguindo os Passos | `PassoDaCliente.tsx`: a lista `ul aria-label="Clientes"` agora tem `rounded-lg border border-estrelinha-line bg-estrelinha-surface` e cada linha `px-4`. A inicial usa `<Inicial media />`, que dá `h-11 w-11` (44 px). O `Cartao` escuro tem `p-[18px]` e o h2 `font-body text-[15px] font-medium`. O ícone `MessageSquareText` está em `text-estrelinha-accent`. O e-mail tem `placeholder="nome@email.com"`. O `FormularioDeEndereco` saiu do radiogroup e foi para um `Cartao titulo={ENDERECO_DE_ENTREGA}` depois do cartão Entrega, só quando a entrega é `'outro'`. As sete linhas da tabela Design × implementado aparecem no diff | sim; a medida em pixel fica para a QA em navegador |
| cada comportamento do bloco Testes coberto por um teste escrito, vermelho antes do fix | `features/order-proposal/ui/__tests__/PassoDaCliente.test.tsx` (arquivo novo) | sim pela leitura: cada asserção pega um token que o código antigo não tinha. O vermelho de antes só a execução prova |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. O Contrato dá posse sobre `PassoDaCliente.tsx`, que foi alterado só no necessário ao fix, e sobre `FormularioDeEndereco.tsx`, que não foi alterado (premissa 2). Os arquivos alterados fora da posse, `Inicial.tsx` e `frasesDaMontagem.ts`, foram registrados nas premissas, como o `Não faça` exige.

## Testes

- **A busca na estrutura do protótipo**: caso 1 de `PassoDaCliente.test.tsx`. Confere os tokens exatos do cartão na lista, e a inicial com `h-11`/`w-11` e sem `h-10`/`w-10`. A asserção morde.
- **O convite na estrutura do protótipo**: caso 2 do mesmo arquivo. Confere `p-[18px]` e a ausência de `p-4`. No título, confere `font-body`, `text-[15px]` e `font-medium`, sem `font-display` nem `text-lg`. Confere o ícone em `text-estrelinha-accent`. A asserção morde.
- **O placeholder do e-mail**: caso 3. Confere o atributo pelo rótulo "E-mail". A asserção morde.
- **O formulário de endereço na estrutura do protótipo**: casos 4 e 5. Conferem a região própria com o heading, o CEP dentro dela e fora do radiogroup, a região fora do cartão Entrega e depois dele na ordem do documento, as duas opções ainda juntas no cartão Entrega, e a ausência da região na entrega por link. As asserções mordem. O nível (componente, vitest) é o declarado.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Prop opcional `media` (44 px) em `Inicial.tsx` | sim | O padrão e o `grande` estão intactos no diff. Os outros usos (`LinhaDoCliente.tsx:50`, `CabecalhoDaCliente.tsx:21`, `PassoDaCliente.tsx:299`) não passam a prop. A decisão segue o "defeito 01" da raiz | sim |
| 2 | Bloco "Endereço de entrega" próprio só na cliente nova; `FormularioDeEndereco` sem alteração | sim | O bug descreve só a cliente nova e o Contrato só autoriza o necessário. O teste da página que lê o radiogroup "Entrega" (`montarPedido.test.tsx:319`) é o fluxo da cadastrada, que não mudou | sim |
| 3 | `ENDERECO_DE_ENTREGA` em `frasesDaMontagem.ts` | sim | `apps/mobile-adm/CLAUDE.md` › Montar pedido diz que "as frases do passo 1 [vêm] de `model/frasesDaMontagem.ts`". A mudança é só um acréscimo | sim |
| 4 | Classes do cartão no próprio `ul` | sim | Não muda o nome acessível `list` "Clientes". `rounded-lg` já é o raio dos outros `Cartao` do mesmo arquivo | sim |
| 5 | A mudança vai na variante `escuro` do `Cartao` | sim | No arquivo, a única chamada com `escuro` é o convite (`TEM_OS_DADOS_NUMA_MENSAGEM`). Ouro como cor de ícone (objeto gráfico) não é texto | sim |

## Não conferido

- A execução: não rodei os testes, o `tsc` nem o lint. Também não conferi que os testes de página (`montarPedido*.test.tsx`) e os guardas de `tomMemorialDosMontados` seguem verdes.
- A fidelidade ao protótipo `Montar Pedido.dc.html`: o protótipo não está no repositório, então conferi só contra a tabela do bug.
- Não confirmei se `accentText.test.ts` (que mora na suíte da loja) varre `apps/mobile-adm`. A leitura das primeiras linhas sugere que só a loja.
- O arquivo de teste está com intent-to-add (`A`). Os quatro alterados aparecem no diff, então não há problema de baseline.

Instruções lidas: `CLAUDE.md` (raiz, carregado no contexto: Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines); `apps/mobile-adm/CLAUDE.md`, lido pelas seções › Montar pedido (WI 94) e pela tabela de guardas (busca por montagem/order-proposal/accent), não por inteiro.

## T17 — wi-impl-task · review · agente ad5b5398975d01618

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/17-bugs-9-11-15-pedido-montado.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | "Cancelado por você" é escrito sempre, sem comparar o `actor_email` do evento com a conta que está olhando | comparar com a sessão e escrever "por <nome>" quando foi outra conta | A costura pede o texto literal, e a solução escolhida expõe menos e é mais fácil de desfazer. Com dois acessos no painel (feature 48), o texto erra quando quem cancelou foi a outra conta | `frases.ts` (o rótulo `cancelled`), e só o histórico do pedido montado no app |
| 2 | A conclusão traz o número do pedido como segundo argumento opcional de `rotuloDoEvento(e, p.order_number)`, formatado por `formatOrderNumber` (`core`) | um campo novo no evento, ou o número montado na página | O número já vem na leitura do `get`; a formatação de `core` mantém um dono só (`numeroDoPedidoComDonoUnico` passou) | `frases.ts` e `PedidoMontadoPage.tsx` |
| 3 | A faixa da Concluída usa um componente novo, `FaixaDoTom`, exportado de `shared/ui/Selo.tsx` e lido do mesmo mapa tom → classe da pílula | escrever `bg-estrelinha-done-soft text-estrelinha-done` na página, ou exportar `PILULA_DO_TOM` como objeto | O guarda `Selo.test.tsx` recusa a classe de pílula fora do dono. Exportar um objeto daria um aviso de `react-refresh` (o lint do app está em 0/0) | `shared/ui/Selo.tsx`, que não estava na posse desta tarefa (ver Divergências) |
| 4 | "Ver o pedido" vai para um rodapé fixo (`RodapeDoMontado`, dentro da página) com o mesmo desenho e o mesmo mecanismo do `RodapeDaAcao`: `RODAPE_NO_FIM`, `registrarRodape`/`publicarAlturaDoRodape` e a reserva `RESERVA_DO_RODAPE` | um `sticky` dentro do fluxo, ou extrair um componente de rodapé compartilhado | Segue o padrão do rodapé que o app já tem, sem tocar `features/order-actions` | `PedidoMontadoPage.tsx`; o aviso do layout sobe acima do rodapé também nesta tela |
| 5 | Só a Concluída ganhou o rodapé fixo e o tom de concluído. "Renovar prazo" da Expirada continua no fluxo, e as faixas da Expirada e da Cancelada continuam com raio 20 e o tom neutro | levar Renovar ao rodapé e mudar o raio das três faixas | O Esperado do BUG-011 fala só da Concluída; não ampliei o escopo | se o protótipo também quer o rodapé na Expirada, isso vira bug novo do reteste |
| 6 | Os tons sobre `ink` que o protótipo nomeia: `on-ink-border` = `border-white/[.12]`, `on-ink-surface` = `bg-white/10`; o sobretítulo em `text-white/80` | criar tokens no preset | Os dois tokens não existem no preset, e sigo o precedente de `AgoraNaLoja.tsx` (branco a 12 %, 62 % e 80 %) | `CartaoDoLink.tsx` |
| 7 | "Enviar pelo WhatsApp" usa `bg-estrelinha-whatsapp` com texto `ink`, `font-display` 700 a 15 px, e deixou de usar `WHATSAPP_FUNDO`/`WHATSAPP_TEXTO` | manter o verde-escuro com texto branco | É o que o protótipo pede. Pelo cálculo, ink sobre #25D366 dá cerca de 7:1 (passa de 4,5:1); a razão não foi medida por teste | `CartaoDoLink.tsx`; `shared/config/whatsapp.ts` continua servindo o lembrete e a ficha da cliente |
| 8 | "Editar" como secundário é `BOTAO_SECUNDARIO` com borda `primary` (o precedente de `VerCliente`). "Cancelar este pedido" como ghost é fundo transparente, sem borda, texto centrado na cor `alert`. Os dois ficam empilhados em `flex flex-col` | ghost em `ink-soft` | Não abri o protótipo (a regra 5 proíbe ler fonte de design). A cor destrutiva mantém o sentido da ação | `PedidoMontadoPage.tsx` |
| 9 | O ponto e o fio da linha do tempo são `span` com posição absoluta, colocados DEPOIS do rótulo no `li`: ponto `accent` no mais recente e `line` nos outros; o fio existe em todos menos no último | pôr o ponto como primeiro filho | O teste existente `pedidosMontados.test.tsx` lê `e.firstChild?.textContent` como rótulo; assim ele não precisou ser alterado | `PedidoMontadoPage.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | As quatro linhas do Histórico com o texto da costura (renovar, cancelar, concluída com o número do pedido, aberto pela cliente), mais a linha do tempo (ponto em ouro no mais recente, e o fio) | página (vitest, `<App />` real) | `apps/mobile-adm/src/pages/__tests__/pedidoMontado.desenho.test.tsx` › "o que o Histórico diz" (3 casos) | sim | — |
| 2 | A faixa da Concluída com o tom de concluído e raio 12, e "Ver o pedido #0262" num rodapé fixo com reserva no fim do conteúdo | página (vitest) | idem › "a concluída" (o caso da faixa e do rodapé) | sim | — |
| 2b | A Cancelada continua sem rodapé e com a faixa neutra | página (vitest) | idem › "a cancelada continua sem rodapé…" | sim | — (guarda de regressão; passou de primeira porque o comportamento já existia) |
| 3 | O cartão do link, a mensagem e as ações da Aberta no desenho do protótipo | página (vitest) | idem › "a aberta segue o protótipo" (o cartão, a mensagem, Editar/Cancelar) | sim | — |
| 3b | A ordem: link, mensagem, cliente, peças, observação, histórico, ações | página (vitest) | idem › "a ordem…" | sim | vermelho (mudei o Histórico de lugar na página: o teste caiu; restaurei pela cópia e conferi com `cmp`) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/pages/PedidoMontadoPage.tsx alterado
apps/mobile-adm/src/features/order-proposal/model/frases.ts alterado
apps/mobile-adm/src/features/order-proposal/ui/CartaoDoLink.tsx alterado
apps/mobile-adm/src/shared/ui/Selo.tsx alterado
apps/mobile-adm/src/pages/__tests__/pedidoMontado.desenho.test.tsx criado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/pedidoMontado.desenho.test.tsx --testTimeout=20000` (comando de um arquivo, do PROJECT.md › Comandos de verificação):
  - antes do fix: 7 falhas e 2 verdes;
  - depois: 9 de 9 verdes.
- Mesmo comando com mais dois arquivos, `pedidosMontados.test.tsx` e `Selo.test.tsx`: 38 de 38 verdes.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md › Comandos): exit 0, 0 erros. O baseline é 0, então nada mudou.
- `npx eslint src` em `apps/mobile-adm` (CLAUDE.md › Baselines): 1 erro, `no-irregular-whitespace` em `src/pages/__tests__/montarPedido.casca.test.tsx:98`, um arquivo da tarefa 14/21 que roda em paralelo. Os meus arquivos têm 0 erros e 0 avisos.
- Suíte do workspace `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` (verificação mínima, CLAUDE.md › Baselines), três rodadas:
  - 1ª: 7 falhas. Seis em `montarPedido.casca.test.tsx` (de outra tarefa) e uma no guarda `Selo.test.tsx` contra esta tarefa, corrigida pela premissa 3.
  - 2ª: 2690/2692. As 2 falhas são em `montarPedido.rascunho.test.tsx`, que está sendo editado por outra tarefa.
  - O mesmo `montarPedido.rascunho.test.tsx` rodado isolado depois: 8/8 verde.
- Suíte da loja `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines: obrigatória quando o app muda): exit 0, 7091/7091 em 378 arquivos.

Instruções lidas:
- `CLAUDE.md` (raiz, arquivo grande): as seções › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, como carregadas no contexto.
- `apps/mobile-adm/CLAUDE.md` (75 KB, lido por seção): › topo e "O que existe hoje", › A árvore, › Pedidos montados (WI 94), › Montar pedido (WI 94), › PWA, › Identidade, › Navegação, › Os guardas do app, › Testes.
- `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- **Arquivo fora da posse**: `apps/mobile-adm/src/shared/ui/Selo.tsx` ganhou o export aditivo `FaixaDoTom`, porque o guarda `Selo.test.tsx` ("nenhum outro arquivo de produção escreve uma classe de pílula de tom") recusou a faixa escrita com as classes na página. A mudança é aditiva, e o `Selo` e o resto do arquivo ficaram como estavam.
- **Fatias que passaram de primeira**:
  - "a cancelada continua sem rodapé": guarda de regressão de um comportamento que já existia.
  - "a ordem…": passou porque a ordem já era a esperada. O check de mutação deu vermelho, então a asserção morde.
- **Falhas da suíte que não são desta tarefa**: `montarPedido.casca.test.tsx` (6 casos, e o erro de lint de espaço irregular) e, numa rodada, `montarPedido.rascunho.test.tsx` (2 casos, verde isolado). Os dois pertencem às tarefas 14/21, que rodam em paralelo na mesma árvore.
- **O que o jsdom não prova**: que o rodapé fica realmente preso ao pé da tela em 390×844, a altura publicada e a ausência de rolagem lateral. Os testes conferem os tokens (`fixed`, `bottom-0`, a reserva); a prova de layout fica com o reteste da QA.
- **Nenhuma afirmação de tarefa seguinte** de `tasks/` ficou falsa. As tarefas 22 e 23 tocam outras partes de `PedidoMontadoPage.tsx` (o sinal do desconto e a foto da peça), e não mexi nelas.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 17
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz: › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines); apps/mobile-adm/CLAUDE.md (por seção: topo, A árvore, Pedidos montados, Montar pedido, PWA, Identidade, Navegação, Os guardas do app, Testes)
Testes escritos: apps/mobile-adm/src/pages/__tests__/pedidoMontado.desenho.test.tsx — (1) as quatro linhas do Histórico mais a linha do tempo (3 casos); (2) a faixa da Concluída em done-soft/done com raio 12, e "Ver o pedido #0262" em rodapé fixo com reserva (mais o par da Cancelada sem rodapé); (3) o cartão do link, a mensagem em caixa ground-deep, a ordem e Editar/Cancelar empilhados (4 casos). Todos vermelhos antes do fix, menos os dois guardas de regressão (ordem, com check de mutação vermelho; cancelada sem rodapé). Sem cobertura: a fixação real do rodapé em navegador (o jsdom não mede layout).
Verificações: o arquivo novo 9/9; com pedidosMontados e Selo, 38/38; tsc do mobile-adm 0 erros; eslint dos arquivos tocados 0/0; suíte do mobile-adm 2690/2692 (as 2 falhas em montarPedido.rascunho, de outra tarefa, verde isolado); suíte da loja 7091/7091.
Árvore de trabalho: alterados apps/mobile-adm/src/pages/PedidoMontadoPage.tsx, apps/mobile-adm/src/features/order-proposal/model/frases.ts, apps/mobile-adm/src/features/order-proposal/ui/CartaoDoLink.tsx, apps/mobile-adm/src/shared/ui/Selo.tsx (export aditivo FaixaDoTom, fora da posse, exigido pelo guarda Selo.test.tsx); criado apps/mobile-adm/src/pages/__tests__/pedidoMontado.desenho.test.tsx. Nada commitado.
Citações conferidas: 4 (os quatro arquivos do Contrato, todos presentes); nenhuma deslocada, nenhuma morta.
```

## T14 — wi-impl-task · review · agente a3075b9e15db9dd06

Tarefa: .specs/work-items/94-montar-pedido-no-app/tasks/14-bugs-4-5-12-13-casca-da-montagem.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | BUG-005: o resumo do servidor (`useResumoDaMontagem`) passa a conferir a partir do passo 2 (`passos.passo >= 2`). O total da barra só aparece com peças na sacola (`estado.pecas.length > 0`), então uma prévia antiga não fica na barra depois de a última peça sair | Calcular o total no app (preço × quantidade), o que vai contra a regra de que "nenhum número é calculado aqui". Usar a prévia de `usePromocaoDasLinhas`, que vai sem cupom e sem desconto combinado: o total do passo 2 discordaria do total do passo 3 | O total da barra fica o mesmo número do servidor em todos os passos, coerente com o cupom e o combinado já escolhidos | No passo 2 saem agora duas prévias por mudança, a do resumo e a das promoções. Quando não há cupom nem combinado, os corpos são iguais. O passo 1, inclusive com um rascunho retomado, continua com "—", porque o resumo não confere a cada letra digitada no e-mail. Isso está fora do Esperado do bug |
| 2 | BUG-013: no passo 3, antes da tentativa, a barra mostra só a recusa do servidor ao desconto combinado (`estado.combinado.ligado && recusaDoCombinado`). Os outros motivos, como o motivo vazio, continuam esperando o toque em "Continuar". A frase sob o campo, em `PassoDosDescontos`, fica onde está | Mostrar todo motivo do passo 3 logo, o que contradiz a regra da tarefa 08 ("só depois da tentativa"). Tirar a frase de debaixo do campo, que o bug não pede | O Esperado pede só que a recusa apareça logo na barra. A regra da 08 continua valendo para o resto | Só `MontarPedidoPage.tsx`. `PassoDosDescontos.tsx` não foi tocado |
| 3 | BUG-004: o cabeçalho fica preso ao topo só em tela alta (`[@media(min-height:640px)]:sticky`). O "x" passa a `h-[48px] w-[48px]` e os botões do indicador a `min-h-[44px]`, em px, para os alvos de toque não crescerem com a fonte da raiz | Esconder a barra com o campo focado, o que contradiz o Esperado ("o botão da barra visível"). Mudar o `<meta viewport>` (`interactive-widget`), que está fora da posse da tarefa e vale para o app inteiro | Esta é a menor mudança que separa o cabeçalho da barra a 200 %. Os alvos de 48 e 44 px são medida física | Em telas com menos de 640 px de altura, o cabeçalho rola junto com o conteúdo para qualquer tamanho de fonte. No Chrome do Android o teclado não redimensiona o viewport de layout, então lá quem segura a sobreposição é o cabeçalho mais baixo (px), e não a media query |
| 4 | BUG-012: atual em `accent`, os feitos (n < atual) em `primary`, o passo já alcançado e à frente do atual em `primary/40`, o resto em `line`. O rótulo de 12 px fica visível, com o atual em `font-semibold ink` e os demais em `ink-soft`. O `aria-label` "Passo n: Nome" foi mantido | Pintar de `line` todo passo à frente, como no protótipo, que não prevê voltar a um passo | Mantém a pista de que o passo à frente já alcançado é navegável | Só o indicador |
| 5 | BUG-013: o botão ficou com `min-w-[190px]` em vez de `w-[190px]` | Largura fixa de 190 px | A 200 % o rótulo "Continuar" passa de 190 px e quebraria dentro do botão | Os dois botões da barra |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O total aparece na barra no passo 2 assim que há peça; "—" sem peças, e de novo ao remover | página (vitest) | `montarPedido.casca.test.tsx` › "—" sem peças; com a peça… | sim | — |
| 2 | O indicador com os nomes visíveis (12 px), a barra de 4 px, o atual em accent com `aria-current`, os feitos em primária, os demais em line; título 17 px e subtítulo 12 px | página (vitest) | `montarPedido.casca.test.tsx` › cada segmento… / o título a 17 px… | sim | — |
| 3 | O motivo na cor de espera (13 px, acima do total, em `aria-describedby`), o botão com 190 px, e a recusa do combinado a 100 % na barra antes da tentativa | página (vitest) | `montarPedido.casca.test.tsx` › o motivo na cor de espera… / no passo 3, o desconto combinado que zeraria… | sim | — |
| 3b | Sem a recusa do servidor, a barra não cobra nada antes da tentativa (guarda da regra da 08) | página (vitest) | `montarPedido.casca.test.tsx` › no passo 3, sem a recusa do servidor… | sim (passou de primeira) | vermelho |
| 4 | A 200 %, o cabeçalho e a barra não se sobrepõem: régua de classe (sticky só com `min-height:640px`, controles em px) | página (vitest) | `montarPedido.casca.test.tsx` › o cabeçalho só fica preso ao topo em tela alta… | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.casca.test.tsx criado
apps/mobile-adm/src/pages/__tests__/montarPedido.rascunho.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.casca.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação): antes do fix, 6 de 7 vermelhos pelas razões esperadas; depois, 7/7, exit 0.
- `… exec vitest run src/pages/__tests__/montarPedido.rascunho.test.tsx --testTimeout=20000` (PROJECT.md): 8/8, exit 0.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md › Comandos): exit 0, sem erros. Não veio `baseline` e não rodei uma medida de entrada; o resultado é 0, igual ao valor da tabela de Baselines.
- `npx eslint` nos três arquivos, em apps/mobile-adm (CLAUDE.md › Baselines, a medida de lint): 0 problemas.
- `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` (CLAUDE.md › Baselines, a verificação mínima): 2692/173, exit 0. Na primeira rodada, `Selo.test.tsx` reprovou acusando `pages/PedidoMontadoPage.tsx`, um arquivo de outra tarefa desta onda; na segunda passou.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines: a suíte da loja quando o app muda): 7091/378, exit 0.

Instruções lidas: `CLAUDE.md` (raiz, no contexto) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines. `apps/mobile-adm/CLAUDE.md` (75 KB) lido por seção: › O que existe hoje, › A árvore, › Pedidos montados (WI 94), › Montar pedido (WI 94), › PWA, › Identidade, › Navegação, › Os guardas do app, › Testes. `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- **Teste da tarefa 10 ajustado.** `montarPedido.rascunho.test.tsx` (`conferirRetomada`) assertava o corpo da ÚLTIMA prévia. Com o resumo conferindo desde o passo 2, a última chamada passa a ser a das promoções, que vai sem cupom. A asserção agora olha as prévias desta abertura (recortadas a partir de antes de `conferirRetomada`) e exige que uma delas leve o cupom e o desconto. Ela não ficou mais fraca, porque as prévias da montagem anterior ficam fora do recorte. O check de mutação deu vermelho: com a retomada sem cupom, o teste reprova.
- **O teclado no Chrome do Android não muda o viewport de layout** quando falta `interactive-widget=resizes-content` no `index.html`. Então `[@media(min-height:640px)]` não reage ao teclado num aparelho real; reage em telas baixas e na simulação do QA (390 × 500). No celular, quem segura a sobreposição é o cabeçalho mais baixo. A medida a 200 % fica para o reteste em navegador, porque o jsdom não mede layout.
- A fatia 3b passou de primeira, por guardar um comportamento que já existia. O check de mutação (o motivo inteiro na barra antes da tentativa) deu vermelho.
- Não houve propagação: nenhuma afirmação das tarefas 15 a 23 ficou falsa. A 20 (tipografia do total) e a 18 (confirmação) continuam corretas.
- Na primeira rodada da suíte, `Selo.test.tsx` reprovou acusando `PedidoMontadoPage.tsx`, um arquivo de outra tarefa desta onda. Não toquei nele; na segunda rodada estava verde.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 14
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines; apps/mobile-adm/CLAUDE.md por seção (O que existe hoje, A árvore, Pedidos montados, Montar pedido, PWA, Identidade, Navegação, Os guardas do app, Testes); .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: apps/mobile-adm/src/pages/__tests__/montarPedido.casca.test.tsx — o total no passo 2 ("—" sem peças, e de novo ao remover); o indicador com os nomes visíveis, aria-current, accent/primária/line, a barra de 4 px, título 17 px e subtítulo 12 px; o motivo em wait a 13 px acima do total, o botão com min-w-[190px], a recusa do combinado a 100 % na barra antes da tentativa (e a vizinha: sem a recusa, nada antes da tentativa); a 200 %, a régua de classe (sticky só com min-height:640px, controles em px). A medida real a 200 % fica para o reteste em navegador (o jsdom não mede layout).
Verificações: o arquivo novo, vermelho antes (6/7) e 7/7 depois; montarPedido.rascunho 8/8; tsc do mobile-adm 0 erros; eslint 0; suíte do mobile-adm 2692/173, exit 0; suíte da loja 7091/378, exit 0
Árvore de trabalho: apps/mobile-adm/src/pages/MontarPedidoPage.tsx (alterado), apps/mobile-adm/src/pages/__tests__/montarPedido.casca.test.tsx (criado), apps/mobile-adm/src/pages/__tests__/montarPedido.rascunho.test.tsx (alterado: a asserção do corpo da prévia retomada, porque o resumo agora confere desde o passo 2)
Citações conferidas: 4 (os quatro itens do Contrato; nenhuma deslocada nem morta. montagem.ts, useResumoDaMontagem.ts e PassoDosDescontos.tsx foram lidos e não precisaram mudar)
```

## T17 — wi-impl-review · done · agente a080e0cf10ea374a5

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/17-bugs-9-11-15-pedido-montado.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-009: o Esperado acontece seguindo os Passos | `frases.ts` (EVENTOS: "Aberto pela cliente", "Prazo renovado · link novo, o anterior parou de funcionar", "Cancelado por você"; `rotuloDoEvento(e, numeroDoPedido)` acrescenta "· pedido #NNNN" só em `completed`, por `formatOrderNumber`); `PedidoMontadoPage.tsx` passa `p.order_number` | sim (o percurso no navegador é só execução) |
| BUG-011: o Esperado acontece seguindo os Passos | `PedidoMontadoPage.tsx`: a faixa da concluída virou `FaixaDoTom tom="done"` com `rounded-md` (12 px pela escala do DS); "Ver o pedido #N" foi para `RodapeDoMontado` (`fixed inset-x-0 bg-estrelinha-surface` + o fio por sombra + `RODAPE_NO_FIM`, que traz o `bottom-0`), com reserva e a altura publicada como no `RodapeDaAcao` | sim (a posição na tela é só execução) |
| BUG-015: o Esperado acontece seguindo os Passos | `CartaoDoLink.tsx` (o sobretítulo de 11 px/600/maiúsculas, a caixa do link com borda `white/[.12]` sem `font-mono`, o WhatsApp `bg-estrelinha-whatsapp` com texto ink e display 700 a 15 px, "Copiar link" translúcido com borda e texto `on-primary`, a nota a 13 px 300, `p-[18px]`, a mensagem numa caixa `ground-deep` `rounded-md`); `PedidoMontadoPage.tsx` (o ponto e o fio do histórico; Editar `BOTAO_SECUNDARIO` com borda primary; Cancelar ghost centrado; os dois em `flex flex-col`) | sim |
| cada comportamento do bloco `Testes` coberto, vermelho antes do fix | `pedidoMontado.desenho.test.tsx` | só execução (as asserções leem classes e textos que o diff mudou, então teriam reprovado antes) |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. As cercas foram conferidas: o diff não mexe no sinal do desconto, na foto da peça nem na function `order-proposals`. `Selo.tsx` está fora da posse da tarefa e o implementador registrou isso, como `Não faça` exige.

## Testes

- As quatro linhas do Histórico (renovar, cancelar, aberto pela cliente; concluída com `#0262`): `pedidoMontado.desenho.test.tsx:49-81`. Compara com `toEqual` sobre os textos escritos por extenso, na ordem. Morde.
- A faixa da Concluída com o tom de concluído e "Ver o pedido" fora do fim da rolagem: `:101-124`. Confere por token exato `bg-estrelinha-done-soft`, `text-estrelinha-done` e `rounded-md`, e a ausência de `ground-deep`/`rounded-lg`. Confere o rodapé `fixed bottom-0 inset-x-0 bg-estrelinha-surface` com o link dentro dele, um único link, e a reserva. Também confere o inverso, a cancelada sem rodapé. Morde. A "dobra" em si não é medida, porque o jsdom não mede layout; o proxy declarado é o `fixed`.
- O cartão do link, a mensagem e as ações da Aberta em ordem e desenho: `:128-199`. Lê classes por token exato nos dois sentidos (tem e não tem). Confere que o `style` inline do WhatsApp sumiu. A ordem é conferida por `compareDocumentPosition`. O contêiner das ações é conferido como `flex-col` e sem `grid`, e o cancelar ainda abre a folha. Morde. O nível é página pelo `<App />` real, igual ao que o bloco `Testes` declara.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | "Cancelado por você" fixo, sem comparar com a conta da sessão | sim | O Esperado do BUG-009 cita o texto literal da costura | sim |
| 2 | Número do pedido como 2º argumento opcional de `rotuloDoEvento`, formatado por `formatOrderNumber` | sim | `frases.ts` já importa `formatOrderNumber` de `core` (linhas 1, 43 e 182); o parâmetro é opcional e nenhum outro chamador de produção quebra | sim |
| 3 | `FaixaDoTom` em `shared/ui/Selo.tsx`, lida do mesmo `PILULA_DO_TOM` | sim | O cabeçalho de `Selo.tsx` diz que "o mapa tom → classe mora só aqui"; o guarda `Selo.test.tsx` varre só produção e recusa `done-soft` fora do dono. A divergência de posse está registrada | sim |
| 4 | Rodapé fixo próprio na página, com `registrarRodape`/`publicarAlturaDoRodape`/`RESERVA_DO_RODAPE` | sim | É o mesmo mecanismo do `RodapeDaAcao` (`features/order-actions/model/rodape.ts`), exportado pelo barrel; página importando de features respeita a regra FSD | sim (o aviso do layout passa a subir também aqui, e isso está declarado) |
| 5 | Só a Concluída ganha rodapé e tom; Expirada e Cancelada ficam iguais | sim | O BUG-011 fala só da Concluída; a decisão não amplia o escopo | sim |
| 6 | `on-ink-border`/`on-ink-surface` = `white/[.12]`/`white/10`, e o sobretítulo `white/80` | sim | O precedente existe em `widgets/store-live/ui/AgoraNaLoja.tsx:43,82` | sim |
| 7 | WhatsApp com `bg-estrelinha-whatsapp` e texto ink, deixando `WHATSAPP_FUNDO`/`WHATSAPP_TEXTO` | sim | O token `whatsapp` está no dono da paleta (`packages/ui/src/tokens/estrelinha.ts:64`, "Só o botão do WhatsApp"), e a loja já usa o mesmo par (`MaterialDrawerWhatsApp.tsx:36`, `GuideWhatsAppCta.tsx:46`). `shared/config/whatsapp.ts` continua servindo o lembrete | sim |
| 8 | Editar = `BOTAO_SECUNDARIO` com borda primary; Cancelar ghost em `alert`; empilhados | sim | `shared/ui/campo.ts:13` tem `w-full`, `text-estrelinha-primary` e `min-h-12`; o `cn` deixa o `text-base` vencer o `text-sm`. `hover:bg-estrelinha-alert-soft` não é classe que o guarda de pílula acusa | sim |
| 9 | Ponto e fio como `span` absolutos DEPOIS do rótulo | sim | O teste `pedidosMontados.test.tsx` lê `firstChild` como rótulo, e o teste novo também | sim |

## Não conferido

- Não conferi nada pelo protótipo `Montar Pedido.dc.html` (fonte de design, não lida): os valores exatos de cada classe estão conferidos só contra as tabelas "Design × implementado" dos bugs.
- Não sei se o protótipo também põe "Renovar prazo" da Expirada no rodapé (premissa 5). Isso fica para o reteste.
- A razão de contraste de ink sobre `#25D366` não tem teste. O guarda `contrast.test.ts` cobre tokens de texto sobre fundos da loja, não esse par.
- Que os testes passem e tenham reprovado antes do fix só a execução mostra.
- `git status` mostra o arquivo de teste como `A` (intent-to-add), então todos os cinco alterados têm baseline no diff.

Instruções lidas: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md` › Pedidos montados (WI 94), › Identidade, › Navegação, › Os guardas do app.

## T14 — wi-impl-review · done · agente ae6526a1b0a7797b4

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/14-bugs-4-5-12-13-casca-da-montagem.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-004: o Esperado acontece seguindo os Passos | `MontarPedidoPage.tsx:429` (o cabeçalho é `[@media(min-height:640px)]:sticky`), o "x" em `h-[48px] w-[48px]`, os passos do indicador em `min-h-[44px]` | o código bate com o pedido; que campo e barra fiquem visíveis a 200 % só a execução mostra (régua de classe aqui, medida no reteste) |
| BUG-005: o Esperado acontece seguindo os Passos | `MontarPedidoPage.tsx:215-219` (a prévia a partir de `passo >= 2`) e `:337` (`totalNaBarra` com peças) | sim |
| BUG-012: o Esperado acontece seguindo os Passos | `MontarPedidoPage.tsx:447-470`: o segmento `h-1`, as cores accent/primary/line, o rótulo `text-[12px]` visível, o título `text-[17px]` e o subtítulo `text-[12px]` | sim |
| BUG-013: o Esperado acontece seguindo os Passos | `MontarPedidoPage.tsx:328-329` (a recusa do combinado na barra antes da tentativa), `:603` (`text-[13px] text-estrelinha-wait`, acima do total), `:620` e `:630` (`min-w-[190px]`) | sim |
| cada comportamento de `Testes` com teste vermelho antes do fix | `montarPedido.casca.test.tsx` | só execução (o vermelho não é visível no diff); as asserções dependem do que o fix mudou |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Quanto ao Contrato: só `MontarPedidoPage.tsx` mudou, e só no cabeçalho, no indicador, na barra e na condição do resumo. `montagem.ts`, `useResumoDaMontagem.ts` e `PassoDosDescontos.tsx` não foram tocados, e todos estão na posse da tarefa. Nada do `Não faça` foi tocado:
- a tipografia do total continua `font-display text-lg`;
- o voltar e o histórico não mudaram;
- a folha "Colar texto" não mudou.

## Testes

| Comportamento | Onde está o teste | A asserção morde? |
|---|---|---|
| O total aparece no passo 2 com peça na sacola; "—" sem peças | `montarPedido.casca.test.tsx`, "a barra fixa · o total no passo das peças" | sim. Pede `R$ 120,00` ainda em "Passo 2 de 4", o que falha com o `passo >= 3` de antes; e pede "—" antes e depois de remover a peça |
| Indicador com os nomes e o atual destacado (`aria-current`) | idem, "o cabeçalho · o indicador de passos" | sim. Confere rótulo visível sem `aria-hidden`, `text-[12px]`, segmento `h-1`, o atual em accent sem primary, o feito em primary sem accent, e `aria-current` mudando de passo. Há também um caso que confere 17 e 12 px no título e no subtítulo |
| O motivo na cor de espera e a recusa do combinado dentro da barra | idem, "a barra fixa · o motivo do bloqueio e o botão" | sim. Confere `text-estrelinha-wait` com `text-[13px]` e a ausência de `text-estrelinha-ink`; a posição antes do total por `compareDocumentPosition`; `aria-describedby`; e a recusa a 100 % na barra antes do toque. O par negativo também está lá: o motivo vazio fica fora da barra, e sem recusa não há `#motivo-do-bloqueio` |
| A 200 % o cabeçalho e a barra não se sobrepõem (régua de classe) | idem, "a fonte do sistema a 200 %" | sim, por token exato: sem `sticky` puro, com a variante de altura, `h-[48px]`/`w-[48px]`, `min-h-[44px]` e a ausência de `min-h-11` |

O ajuste em `montarPedido.rascunho.test.tsx` não afrouxa nada. A asserção deixou de ler "a última prévia", porque agora saem duas por mudança no passo 2. Ela passou a exigir, entre as prévias desta abertura, uma que leve o cupom e o desconto retomados. A régua é a mesma, e o recorte `slice(antes)` impede que uma prévia da montagem anterior satisfaça a asserção.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O resumo do servidor a partir do passo 2; o total só com peças | sim | O Esperado do BUG-005 e o comentário de `MontarPedidoPage.tsx:121` ("nenhum número calculado aqui"); o total vem de `resumo.previa.summary.items_total` | sim. Os testes que leem a última prévia no passo 2 (`promocao.test.tsx:146,163`) conferem só `lines`, que as duas prévias levam; `descontos.test.tsx` lê no passo 3. A tarefa 20 (tipografia do total) não é tocada |
| 2 | Antes da tentativa, o passo 3 leva à barra só a recusa do servidor ao combinado | sim | O Esperado do BUG-013 ("aparece logo") e a regra da tarefa 08 para os outros motivos; `PassoDosDescontos.tsx` não foi tocado | sim |
| 3 | `sticky` só com altura ≥ 640 px; o "x" e os passos em px | sim | O Esperado do BUG-004 (o botão da barra visível); os dois cenários do bug (390×500 e 320×568) ficam abaixo de 640 px; nenhuma linha de `apps/mobile-adm/CLAUDE.md` proíbe alvo em px (`shared/ui/campo.ts` já fala em "alvo de 48 px") | sim. Nenhum outro arquivo depende do `sticky` do cabeçalho |
| 4 | O passo alcançado à frente em `primary/40` | sim | O Esperado do bug fixa o atual em accent, os feitos em primary e "os demais" em line. Manter a pista de navegação para o passo já alcançado é decisão dele; a ausência de teste para essa cor não contraria o bloco `Testes` | sim |
| 5 | `min-w-[190px]` em vez de `w-[190px]` | sim | O botão "Continuar" a 100 % tem 119 px, então mede 190; a 200 % o rótulo cresce sem quebrar | sim |

## Não conferido

- Se a variante arbitrária `[@media(min-height:640px)]:sticky` é gerada pelo Tailwind do app, e a medida real a 130 % e 200 %. Isso só a execução mostra, e fica para o reteste do QA.
- O vermelho antes do fix e a suíte verde. Não rodo testes.
- Se `montarPedido.promocao.test.tsx` e `montagemComClientReal.test.tsx` passam com a segunda prévia no passo 2. Pela leitura, não dependem da ordem das prévias; a confirmação é por execução.
- Os três arquivos aparecem no diff (dois `M`, o teste novo como `A`), então havia baseline para todos.

Instruções lidas:
- `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md`, a raiz que veio no contexto, com as mesmas seções citadas pela tarefa. A cópia do worktree não foi lida em separado.
- `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/apps/mobile-adm/CLAUDE.md`, lido só pelas linhas que tratam de fonte grande, px, rem, protótipo e alvos de toque. O arquivo tem 763 linhas e não foi lido por inteiro.

## T13 — wi-impl-task · review · agente aca6046bbdbba6944

Tarefa: .specs/work-items/94-montar-pedido-no-app/tasks/13-bug-3-folha-colar-texto.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Desistir da leitura é `cancelar()` em `useLeituraDoTexto`: um contador de vez (`vez`) renovado a cada `ler` e a cada `cancelar`. A resposta de uma leitura vencida não entra (nem campos, nem frase de erro), e o `cancelar` solta a trava, `lendo`, `pendente` (a espera do CEP) e `erro` | Abortar a requisição (AbortController na porta `portaDeLeitura.ts`) | A porta não é da posse desta tarefa, e descartar a resposta basta para o UC-05 (nada gravado, nada perdido). Se nunca for abortada, a function ainda roda e conta no limite por conta | `useLeituraDoTexto.ts` e quem chama a leitura (só a página) |
| 2 | A recusa (`42501`) que volta de uma leitura já cancelada ainda chega a `erroBruto`, e daí à vigia de papel | Descartar a recusa junto com o resto | A recusa é sobre a conta, não sobre os campos. Escondê-la só a adiaria até a próxima leitura | a vigia de papel da página |
| 3 | A página cancela de dois jeitos. O `controle` passado à folha tem `fechar` embrulhado (cancela antes do `navigate(-1)`), o que cobre "Cancelar" e Esc sem esperar o popstate. E um efeito cancela quando a folha fica fechada com `lendo` ligado, o que cobre o voltar do Android | Só o efeito, ou só o embrulho | Só o efeito deixaria uma janela até o popstate; só o embrulho não alcançaria o voltar do Android | `MontarPedidoPage.tsx`, só a fiação da folha |
| 4 | Na folha, "Cancelar" e o `onOpenChange` (Esc) passam a fechar sempre. "Ler o texto" continua desligado durante a leitura | Manter a trava e só mudar a aparência | A spec só desliga "Ler o texto" | `FolhaColarTexto.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | "Cancelar" durante "Lendo o texto…" fecha a folha (também Esc e o voltar do Android) | página (vitest) | `apps/mobile-adm/src/pages/__tests__/montarPedido.colarTexto.test.tsx` › describe "desistir durante 'Lendo o texto…'…" (casos Cancelar, Esc, voltar) | sim | — |
| 2 | A resposta que chega depois do cancelar não muda campo nem mostra o aviso; uma leitura nova depois funciona | página (vitest) | mesmo arquivo, os mesmos casos mais "depois de cancelar, uma leitura nova vai à porta e preenche" | sim | — |

Os 4 casos novos ficaram vermelhos antes do conserto, pelos motivos certos: a folha não fechava; o nome virava "Paula Lima"; o cartão sumia.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/model/useLeituraDoTexto.ts — alterado
apps/mobile-adm/src/features/order-proposal/ui/FolhaColarTexto.tsx — alterado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx — alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.colarTexto.test.tsx — alterado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.colarTexto.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação):
  - antes do fix: 4 vermelhos (os novos), 18 verdes;
  - depois: os 4 novos verdes, 2 vermelhos de fora desta tarefa (ver Divergências).
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md › Comandos): exit 0, sem erro. É o mesmo que a baseline `0`: nada novo.
- `npx eslint` nos 4 arquivos tocados: exit 0.
- Verificação mínima (CLAUDE.md › Baselines e apps/mobile-adm/CLAUDE.md › Testes: o app, mais a loja e o painel):
  - `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000`: 2696/2698. As 2 falhas são as mesmas da linha acima.
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: 7091/7091 casos, 378/378 arquivos verdes. Mesmo assim o exit foi 1, por "Unhandled Error: [vitest-worker]: Timeout calling onTaskUpdate": contenção, com outra tarefa rodando na mesma máquina; nenhum caso reprovou.
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: 5183/5183, exit 0.

Instruções lidas:
- CLAUDE.md (raiz): › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines (lidas pelo índice e pelas seções)
- apps/mobile-adm/CLAUDE.md (75 KB, lido pelo índice e por seção): › topo/O que existe hoje, › A árvore, › Montar pedido (WI 94), › Testes
- .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local

## Divergências e descobertas

- **Fora desta tarefa: 2 casos de `montarPedido.colarTexto.test.tsx` reprovam** (as duas variantes de "sem resposta do serviço de CEP…, fica o que o texto trouxe", linha ~360).
  - Antes da minha edição de produto eles passavam.
  - A causa é a mudança da tarefa 19, em paralelo, em `FormularioDeEndereco.tsx`: `DICA_CEP_NAO_ACHADO` saiu de um `<p role="status">` e virou o `erro` do campo CEP.
  - Por isso a descrição acessível do CEP agora é "Lido do texto — confira. Não achei este CEP. Confira, ou preencha o endereço à mão.", e a asserção pede só "Lido do texto — confira.".
  - Não toquei nem na asserção nem no arquivo da tarefa 19. Cabe à 19, ou ao orquestrador, ajustar a asserção ao comportamento novo.
- Na tarefa 13 `Depende de` a 11. Conferi: o voltar da montagem está no lugar (`montarPedido.voltar.test.tsx` e a sentinela de `usePassosDaMontagem`).
- 3 citações conferidas (os três arquivos do Contrato), nenhuma deslocada nem morta.
- Nada a propagar: a 22 só cita o contador da folha, que não mudou.
- A leitura cancelada não é abortada na rede: a function ainda roda e conta no limite por conta (decisão 1).
- Desligar o "nada fecha enquanto lê" também afeta a folha durante a espera do CEP; o `cancelar` limpa `pendente`.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 13
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; apps/mobile-adm/CLAUDE.md (por seção: topo, A árvore, Montar pedido (WI 94), Testes); .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local
Testes escritos: os dois comportamentos ficam em apps/mobile-adm/src/pages/__tests__/montarPedido.colarTexto.test.tsx, describe "desistir durante 'Lendo o texto…': a folha fecha, e nada do que ela digitou muda":
  - "Cancelar" fecha durante a leitura, e a resposta tardia não muda campo nem mostra o aviso
  - Esc fecha, e a resposta tardia é descartada
  - o voltar do Android fecha, e a resposta tardia é descartada
  - depois de cancelar, uma leitura nova vai à porta e preenche
  Os quatro ficaram vermelhos antes do fix. Nada ficou sem cobertura.
Verificações:
  - o arquivo de teste: os 4 novos verdes; 2 vermelhos que vêm da mudança paralela da tarefa 19 em FormularioDeEndereco.tsx (o aviso do CEP não achado entrou na descrição do campo), não desta tarefa
  - tsc mobile-adm: 0 erros
  - eslint dos arquivos tocados: limpo
  - suíte mobile-adm: 2696/2698, as mesmas 2
  - store: 7091/7091 casos verdes, exit 1 só por timeout de RPC do worker do vitest, sob contenção
  - backoffice: 5183/5183
Árvore de trabalho: apps/mobile-adm/src/features/order-proposal/model/useLeituraDoTexto.ts (cancelar e o contador de vez); apps/mobile-adm/src/features/order-proposal/ui/FolhaColarTexto.tsx ("Cancelar" e Esc fecham sempre); apps/mobile-adm/src/pages/MontarPedidoPage.tsx (fiação da folha: o fechar cancela, e o efeito cobre o voltar); apps/mobile-adm/src/pages/__tests__/montarPedido.colarTexto.test.tsx (4 casos). Nada commitado.
Citações conferidas: 3 (os três do Contrato); nenhuma deslocada, nenhuma morta
```

## T19 — wi-impl-task · review · agente a832898da5d9166aa

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/19-bug-14-campo-com-erro.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O estado de erro mora no `CampoDaMontagem`, numa prop nova e opcional `erro`. Com ela o campo mostra a frase abaixo dele em `text-estrelinha-alert` (id `<id>-erro`, `role="status"`), põe `aria-invalid` e junta o id da frase ao da `marca` no `aria-describedby`. O CEP não achado passa a frase por essa prop, e o `<p>` solto do `FormularioDeEndereco` saiu | Uma classe de erro em `shared/ui/campo.ts`, que a tarefa proíbe. Manter o `<p>` solto e só ligar o `aria-describedby` | A tarefa diz que o estado de erro é do campo da montagem. A frase continua no mesmo lugar, logo abaixo do CEP. Quem não passa `erro` não muda nada | Todos os usos de `CampoDaMontagem` (aditivo; só o CEP o usa por enquanto) |
| 2 | A borda de erro é `border-estrelinha-alert`, juntada por `cn` (twMerge). Assim ela substitui a cor de borda `border-estrelinha-field` de `CAMPO`, em vez de as duas classes chegarem juntas ao DOM | Concatenar as duas classes, o que deixaria a ordem da folha de estilo decidir a cor | A mesma lição do `TAP_44`: duas classes que brigam sem fusão dão um resultado que depende da ordem do CSS | `CampoDaMontagem` e o campo do cupom |
| 3 | A constante `BORDA_DE_ERRO` ficou num arquivo próprio, `ui/bordaDeErro.ts` | Exportá-la de `CampoDaMontagem.tsx` | Um `.tsx` que exporta uma constante ao lado do componente faz o `react-refresh/only-export-components` acusar, e a baseline de lint do app é 0/0 | nenhum |
| 4 | A frase de erro do campo é `role="status"`, como já era a do CEP | `role="alert"` | Mantém o anúncio de antes, menos intrusivo enquanto a Adri digita. O cupom já era `role="alert"` e continua assim | `CampoDaMontagem` |
| 5 | No cupom, o input em si não mudou: ganhou `aria-invalid` e a borda de erro quando há recusa. O `aria-describedby` já apontava a recusa | Trocar o input do cupom por `CampoDaMontagem` | É o menor fix; o campo do cupom tem outra forma (botão "Aplicar" ao lado, rótulo por `aria-label`) | `PassoDosDescontos.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O CEP não achado deixa o campo com `aria-invalid`, o `aria-describedby` apontando a frase, a borda e o texto de erro (e o CEP achado, sem nada disso) | página (vitest) | `apps/mobile-adm/src/pages/__tests__/montarPedido.test.tsx` › "o CEP não achado marca o campo como erro…" | sim | — |
| 2 | O cupom recusado, o mesmo (e o campo sem recusa, sem erro) | página (vitest) | `apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx` › "o cupom recusado marca o campo como erro…" | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/ui/CampoDaMontagem.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/FormularioDeEndereco.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/PassoDosDescontos.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/bordaDeErro.ts criado
apps/mobile-adm/src/pages/__tests__/montarPedido.test.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.colarTexto.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run <os dois arquivos> --testTimeout=20000 -t 'marca o campo como erro'` (PROJECT.md › Comandos de verificação): antes do fix, 2 vermelhos, ambos por falta de `aria-invalid`. Depois do fix, os dois arquivos inteiros passam, 38/38.
- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.colarTexto.test.tsx src/features/order-proposal --testTimeout=20000` (PROJECT.md): 53/53, depois de ajustar a asserção da descrição do CEP (ver Divergências).
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros. O baseline do mobile-adm era 0 e continua 0.
- `npx eslint .` em `apps/mobile-adm` (CLAUDE.md › Baselines): exit 0, baseline 0/0 mantida.
- Verificação mínima (CLAUDE.md › Baselines: a suíte do workspace tocado mais as da loja e do painel, exit fora de pipe):
  - mobile-adm: 2698/173, exit 0
  - store: 7091/378, exit 0
  - backoffice: 5183/288, exit 0

Instruções lidas: CLAUDE.md › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines (lidas pelo texto carregado no contexto da sessão); apps/mobile-adm/CLAUDE.md (75 KB, lido pelo índice de títulos) › O que existe hoje, › O acesso é o MESMO do Backoffice (parcial), › Montar pedido (WI 94), › PWA, › Identidade, › Navegação, › Testes; .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- **Um teste existente caiu por consequência direta do fix.** Em `montarPedido.colarTexto.test.tsx` (o caso "sem resposta do serviço de CEP…", para CEP desconhecido e para serviço fora do ar), a descrição acessível do CEP passou a ser "Lido do texto — confira. Não achei este CEP. Confira, ou preencha o endereço à mão.". A frase de erro agora está ligada ao campo, que é exatamente o que este bug pede. A asserção foi reescrita com o texto exato completo, então ficou mais apertada, não mais frouxa.
  - O arquivo estava modificado e sem commit por outra tarefa da onda (a 13, provavelmente). A edição foi uma substituição de uma ocorrência única, feita sobre o conteúdo do disco no momento. A tarefa 13 deve conferir que não sobrescreve essa linha.
- **Os comandos das duas tarefas brigavam pelo mesmo arquivo de saída.** O temporário `${TMPDIR}/wi-impl-saida.txt` era escrito ao mesmo tempo pela tarefa paralela, e uma leitura minha saiu misturada com a saída dela. Daí em diante gravei no scratchpad da sessão.
- Os testes de borda e de cor da frase são proxy de classe: jsdom não pinta nada. A borda de fato só se confere em navegador, no reteste do QA.
- O `Depende de` (tarefas 14 e 21) confere: os commits `ffd8d360` e `011c60de` estão na árvore, e os três arquivos do Contrato existem.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 19
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz: › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines); apps/mobile-adm/CLAUDE.md (por seção: Montar pedido (WI 94), Identidade, Navegação, Testes, O que existe hoje)
Testes escritos: CEP não achado → montarPedido.test.tsx "o CEP não achado marca o campo como erro…"; cupom recusado → montarPedido.descontos.test.tsx "o cupom recusado marca o campo como erro…"; os dois vermelhos antes do fix. A borda real (pixel) só o navegador prova, no reteste do QA
Verificações: tsc mobile-adm 0; eslint mobile-adm 0/0; vitest mobile-adm 2698/173, store 7091/378, backoffice 5183/288, os três com exit 0
Árvore de trabalho: CampoDaMontagem.tsx (prop `erro`), FormularioDeEndereco.tsx (o CEP não achado vai como `erro`), PassoDosDescontos.tsx (`aria-invalid` e a borda no cupom), bordaDeErro.ts (novo), montarPedido.test.tsx, montarPedido.descontos.test.tsx, montarPedido.colarTexto.test.tsx (a descrição do CEP agora inclui a frase de erro); nada commitado
Citações conferidas: 3 (os três arquivos do Contrato), nenhuma deslocada nem morta
```

## T13 — wi-impl-review · done · agente a27bf96d08a263d65

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/13-bug-3-folha-colar-texto.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-003: o Esperado acontece seguindo os Passos | `FolhaColarTexto.tsx`: o "Cancelar" chama `controle.fechar()` direto, sem a trava `if (!lendo)`, e o `onOpenChange` fecha com `!abrir` (Esc). `MontarPedidoPage.tsx` passa `controleDaLeitura.fechar`, que chama `cancelarLeitura()` antes do `fechar`, e um efeito cancela quando a folha está fechada e `lendo` está ligado (o voltar do Android). Em `useLeituraDoTexto.ts`, `vez`/`minha` descartam a resposta vencida (campos, frase e o `setPendente`), e `cancelar` limpa `pendente`, `lendo`, `trava` e `erro` | sim |
| cada comportamento do bloco Testes coberto, vermelho antes do fix | `montarPedido.colarTexto.test.tsx`, novo describe "desistir durante 'Lendo o texto…'" | as asserções mordem (o código antigo reprovaria cada uma, ver Testes); o vermelho de fato é só execução |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. "Decisões já tomadas" foi conferido:
- "Ler o texto" segue desligado durante a leitura (`disabled={lendo || …}`, sem mudança).
- "Cancelar" deixou de ser travado.
- UC-05 ("nada se perde"): a resposta descartada não chega a `aoLer`.

## Testes

- **"Cancelar" durante "Lendo o texto…" fecha a folha**: `montarPedido.colarTexto.test.tsx`, caso "'Cancelar' fecha a folha durante a leitura…".
  - Ele assere `toBeEnabled()` e `folha()` ausente depois do clique, com a resposta ainda segurada.
  - No código antigo, `if (!lendo)` deixaria a folha aberta. Morde.
- **A resposta que chega depois do cancelar não muda campo nem mostra o aviso**: mesmo caso, depois de `soltar()`, e os casos de Esc e do voltar do Android.
  - `nadaMudou()` confere Nome "Ju", o e-mail digitado, Número vazio, que não há descrição "Lido do texto", que o aviso da leitura está ausente e que o cartão continua.
  - Com a resposta PAULA (found 9) entrando, Nome viraria "Paula Lima". Morde nos três caminhos: o Esc reprovaria já no fechar (a trava antiga do `onOpenChange`), e o voltar reprovaria no `nadaMudou`.
- **Caso extra**: depois de cancelar, uma leitura nova vai à porta (2 invocações) e preenche. Prova que `cancelar` solta a trava.
- Nível: página real, vitest. Bate com o declarado.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `cancelar()` com um contador `vez`, descartando a resposta vencida, sem abortar a requisição | sim | A porta `portaDeLeitura.ts` está fora da posse do Contrato. A tarefa e o UC-05 pedem só que nada mude e nada se perca, não que a requisição seja abortada | sim: o hook e o único chamador, `MontarPedidoPage.tsx` (conferido por busca) |
| 2 | A recusa `42501` de uma leitura cancelada ainda chega a `erroBruto` | sim | O `apps/mobile-adm/CLAUDE.md`, em "Colar texto", diz que a recusa entra na MESMA vigia das leituras da página. Com a leitura vencida, o código não mexe em `trava` nem em `lendo` (`minha === vez.current`) | sim |
| 3 | O `fechar` embrulhado mais um efeito de folha fechada com `lendo` ligado | sim | O fechamento da leitura bem-sucedida usa `fecharFolhaDeLeitura.current`, o `fechar` cru, e o efeito do `pendente` desliga `lendo` no mesmo lote. Por isso o efeito de cancelar não dispara na leitura que deu certo | sim: só a fiação da folha |
| 4 | "Cancelar" e o Esc fecham sempre; "Ler o texto" segue desligado durante a leitura | sim | A tarefa diz: "Spec › Design › Folha · Colar texto: 'Ler o texto' desligado vazio e durante a leitura; 'Cancelar' não é desligado." | sim |

## Não conferido

- `montarPedido.colarTexto.test.tsx:360-362`: o diff reescreve uma asserção já existente, no describe "'Outro endereço'…". A descrição do CEP passa a incluir "Não achei este CEP. Confira, ou preencha o endereço à mão.".
  - Esta tarefa não explica essa mudança. Ela é provavelmente de outra tarefa da onda que mexe no campo com erro e no CEP (por exemplo a 19).
  - Não virou achado. Também não conferi se ela é um afrouxamento ou a consequência legítima de outro conserto.
- Que os testes passam e que estiveram vermelhos antes do fix: só a execução mostra.
- Instruções lidas:
  - `CLAUDE.md` (raiz): o conteúdo completo, carregado no contexto (Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines).
  - `apps/mobile-adm/CLAUDE.md`: as seções "Montar pedido (WI 94)" e "Testes", e o índice de títulos.

## T19 — wi-impl-review · done · agente affdbfe233921b91a

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/19-bug-14-campo-com-erro.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-014: o Esperado do bug acontece seguindo os Passos dele | CEP: `FormularioDeEndereco.tsx:87` passa `erro={resposta?.manual ? DICA_CEP_NAO_ACHADO : null}`. `CampoDaMontagem.tsx:56-75` põe `border-estrelinha-alert` por `cn` (sai o `field`), `aria-invalid`, o id `<id>-erro` no `aria-describedby` e a frase em `text-estrelinha-alert`. O `<p>` em tinta (`text-estrelinha-ink`) saiu. Cupom: `PassoDosDescontos.tsx:125-129` põe a borda de erro e `aria-invalid`. O `aria-describedby` já apontava a recusa | sim (a cor de verdade só se vê em navegador, e isso é da QA) |
| cada comportamento do bloco `Testes` coberto por um teste escrito, vermelho antes do fix | `montarPedido.test.tsx:465`, `montarPedido.descontos.test.tsx:272` | só execução (o vermelho antes); as asserções mordem, ver Testes |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Confiro as `Decisões já tomadas`: `shared/ui/campo.ts` não foi alterado (não aparece no diff) e o estado de erro mora no campo da montagem (`CampoDaMontagem` e `bordaDeErro.ts`). Aplicado.

## Testes

- **CEP não achado** (`apps/mobile-adm/src/pages/__tests__/montarPedido.test.tsx:465`): o teste usa a página real. Antes, com o CEP achado, ele confere que o campo está sem `aria-invalid`, tem a borda `field` e não tem `alert`. Depois, com o CEP não achado, confere:
  - `aria-invalid="true"`;
  - o id da frase está em `aria-describedby` e a descrição acessível bate;
  - o campo tem `border-estrelinha-alert` e não tem `border-estrelinha-field`, por token exato;
  - a frase tem `text-estrelinha-alert` e não tem `text-estrelinha-ink`.

  Morde: com o código de antes, o campo não tinha `aria-invalid` e a frase vinha em `ink`.
- **Cupom recusado** (`apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx:272`): antes da recusa, o teste confere que não há `aria-invalid` e que a borda é `field`. Depois, confere `role=alert` com "Cupom inválido.", `aria-invalid="true"`, o id da recusa em `aria-describedby`, a borda `alert` presente e a `field` ausente. Morde: antes do fix, o input do cupom não tinha `aria-invalid` nem a borda de erro.
- **Ajuste em teste existente** (`montarPedido.colarTexto.test.tsx:360`): a descrição acessível do CEP agora junta a marca e a frase de erro. É consequência direta do fix (os dois ids no `aria-describedby`) e deixa a asserção mais rígida, não mais frouxa.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Prop `erro` opcional no `CampoDaMontagem`; o `<p>` solto do CEP saiu | sim | A tarefa: "o estado de erro mora no campo da montagem". O grep mostra que só o CEP passa `erro` | sim |
| 2 | `border-estrelinha-alert` juntada por `cn` (twMerge), no lugar da `field` de `CAMPO` | sim | Bate com a lição do `TAP_44` no CLAUDE.md raiz. Os testes assertam que a `field` sai | sim (os dois usos achados pelo grep) |
| 3 | `BORDA_DE_ERRO` num arquivo próprio, `ui/bordaDeErro.ts` | sim | A baseline de lint do mobile-adm é 0/0 e o `react-refresh/only-export-components` acusaria a constante dentro de um `.tsx` | sim |
| 4 | A frase de erro do campo segue com `role="status"` | sim | É o mesmo papel do `<p>` de antes, e a tarefa não pede outro | sim |
| 5 | O cupom mantém o input e ganha só `aria-invalid` e a borda | sim | O `aria-describedby` já apontava `${id}-recusa-do-cupom`. O fix é mínimo, como o Contrato pede ("altere só o necessário") | sim |

## Não conferido

- `montarPedido.colarTexto.test.tsx`: o diff traz também o bloco `describe('desistir durante "Lendo o texto…"…')` (cerca da linha 409 em diante), que esta tarefa não explica. Parece de outra tarefa da onda (a 13, da folha "Colar texto"; `FolhaColarTexto.tsx` também está modificado e não consta de `alterados`). Não julguei esse bloco.
- Não verifiquei que o `cn` de `@estrelinha/ui/lib/utils` funde `border-estrelinha-field` com `border-estrelinha-alert`; os testes que provam isso só a execução confirma. O contraste e a cor renderizada em 390 também ficam para a QA.
- Todos os arquivos de `alterados` aparecem no diff (`bordaDeErro.ts` como `A`), então nenhum ficou sem baseline.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (fornecido no contexto; o da worktree não foi aberto à parte) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md` › índice de títulos, › Montar pedido (WI 94), › Identidade, mais grep por erro, `alert` e `aria-invalid`.

## T22 — wi-impl-task · review · agente a813e53e3d4d08ff2

Tarefa: .specs/work-items/94-montar-pedido-no-app/tasks/22-bug-19-textos-da-montagem.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Troquei o texto das constantes `VALOR_EM_REAIS`/`VALOR_EM_PERCENTUAL` para "Desconto (R$)"/"Desconto (%)" e mantive os nomes | Renomear as constantes | A menor superfície: os nomes são internos e só `PassoDosDescontos.tsx` os lê | nenhum (as constantes saem no barrel, mas só uma tela as usa) |
| 2 | Criei `TOTAL = 'Total'` em `descontos.ts` e usei só na última linha do resumo do passo 4. O resumo do passo 3 continua em "Itens" | Trocar `ITENS` para "Total" em todo lugar | O bug fala só do passo 4, e mudar o passo 3 sem a fonte dizer seria ampliar o escopo | Passo 3 (`PassoDosDescontos.tsx`): se o protótipo também pedir "Total" ali, falta trocar |
| 3 | O contador "0 / 2000" foi corrigido em `contadorDoTexto`, em `model/frasesDaMontagem.ts`, que fica fora da lista de posse. A `FolhaColarTexto.tsx` só chama essa função | Montar o texto direto na `FolhaColarTexto.tsx` | A frase tem um dono só, e `FolhaColarTexto` é o único lugar que a chama. Escrevê-la de novo na tela daria dois donos para o mesmo texto | `frasesDaMontagem.ts`, uma linha |
| 4 | Na `PedidoMontadoPage`, os três descontos (promoção, cupom e combinado) passaram a usar `menos()` de `descontos.ts`, que formata com `formatPrice` do core e o sinal U+2212 | Trocar o hífen só na linha do combinado | O bug nomeia "o sinal do desconto". Com a troca, a página usa o mesmo formatador do resumo da montagem e do `BlocoValores` | `PedidoMontadoPage.tsx` |
| 5 | Atualizei para os textos novos os testes das páginas que usavam os rótulos antigos como seletor ou valor esperado (`getByLabelText('Valor em reais')`, `'ItensR$ 120,00'`, `'0/2000'`) | Deixar como estava | O valor esperado mudou por causa do bug, e nenhuma asserção foi afrouxada | 5 arquivos de teste de página (abaixo) |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Passo 3: o rótulo do valor do combinado é "Desconto (R$)" / "Desconto (%)" | página (vitest) | `montarPedido.descontos.test.tsx`, `montarPedido.casca.test.tsx`, `montarPedido.rascunho.test.tsx` (`getByLabelText`) | sim, depois de vermelho em 15 casos | — |
| 2 | Passo 4: a última linha do resumo é "Total" | página (vitest) | `montarPedido.revisar.test.tsx` (`revisao-total` = "TotalR$ 120,00" e "TotalR$ 132,00") | sim, depois de vermelho em 2 casos | — |
| 3 | Pedido montado: cada desconto sai com "− R$ …" (U+2212) | página (vitest) | `pedidosMontados.test.tsx` › "cada desconto sai com o sinal de menos (U+2212), nunca o hífen" (novo) | sim, depois de vermelho (recebia "-") | — |
| 4 | Folha "Colar texto": o contador é "0 / 2000" | página (vitest) | `montarPedido.colarTexto.test.tsx` ("0 / 2000" e "2000 / 2000") | sim, depois de vermelho em 2 casos | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/features/order-proposal/model/descontos.ts alterado
apps/mobile-adm/src/features/order-proposal/model/frasesDaMontagem.ts alterado
apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx alterado
apps/mobile-adm/src/pages/PedidoMontadoPage.tsx alterado
apps/mobile-adm/src/pages/__tests__/pedidosMontados.test.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.colarTexto.test.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.revisar.test.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.casca.test.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.rascunho.test.tsx alterado

## Verificação

- Um arquivo de teste (do `PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/mobile-adm exec vitest run <os 6 arquivos de página> --testTimeout=20000`. Antes da correção: 19 casos falharam, mais o caso novo do sinal (falhou com "-" no lugar de "−"). Depois: 99/99 passaram (com `pedidoMontado.desenho.test.tsx` incluído).
- Tipos (do `CLAUDE.md` › Comandos): `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` terminou com 0 erros. Não veio baseline e não medi antes; como deu zero, não há o que comparar.
- Verificação mínima (`CLAUDE.md` › Baselines, via `PROJECT.md`): suíte do mobile-adm passou, 2701/173, exit 0. Suíte da loja passou, 7091/378, exit 0.
- Extra: `npx eslint` nos arquivos tocados, exit 0.

Instruções lidas: `CLAUDE.md` (raiz, já no contexto, por inteiro); `apps/mobile-adm/CLAUDE.md` › topo e "O que existe hoje", › Pedidos montados (WI 94), › Montar pedido (WI 94), › Testes (o arquivo tem 75 KB, li pelo índice); `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- O contrato põe o contador em `FolhaColarTexto.tsx`, mas a frase vem de `contadorDoTexto` em `model/frasesDaMontagem.ts`, que não está na lista de posse. Corrigi lá (premissa 3).
- O contrato lista `model/revisao.ts`, `model/frases.ts` e `ui/PassoDosDescontos.tsx`, mas nenhum deles precisou mudar: os textos de passo 3 e passo 4 moram em `descontos.ts`.
- Os testes de página que usavam os textos antigos também foram atualizados, embora não estejam na lista de posse (premissa 5).
- Nada para propagar: nenhuma tarefa seguinte cita os textos antigos.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 22
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/mobile-adm/CLAUDE.md (topo, Pedidos montados, Montar pedido, Testes); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: rótulo do combinado "Desconto (R$)"/"Desconto (%)" — montarPedido.descontos/casca/rascunho.test.tsx (getByLabelText); "Total" na última linha da revisão — montarPedido.revisar.test.tsx; "− R$" (U+2212) nos três descontos do pedido montado — pedidosMontados.test.tsx (caso novo); contador "0 / 2000" — montarPedido.colarTexto.test.tsx. Todos falharam antes da correção; nada ficou sem cobertura.
Verificações: tsc mobile-adm 0 erros; os 7 arquivos de página 99/99; suíte do mobile-adm 2701/173 exit 0; suíte da loja 7091/378 exit 0; eslint dos arquivos tocados 0
Árvore de trabalho: descontos.ts, frasesDaMontagem.ts, PassoRevisar.tsx, PedidoMontadoPage.tsx e os testes pedidosMontados, montarPedido.colarTexto, .revisar, .descontos, .casca e .rascunho (nada commitado)
Citações conferidas: 7 (as linhas do Contrato). descontos.ts, PassoRevisar.tsx e PedidoMontadoPage.tsx conferem; o contador está em frasesDaMontagem.ts, não na FolhaColarTexto; revisao.ts, frases.ts e PassoDosDescontos.tsx não precisaram mudar. Nenhuma citação morta.
```

## T22 — wi-impl-review · done · agente a6b2ef49830054696

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/22-bug-19-textos-da-montagem.md
Veredito: serve

Não achei nada que derrube o diff. As quatro linhas da tabela do bug estão cumpridas no código e cada uma tem asserção no DOM. As cinco premissas se sustentam, e o raio declarado confere.

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-019: o Esperado acontece seguindo os Passos | Passo 3: `descontos.ts:110-111` ("Desconto (R$)"/"Desconto (%)"), lido em `PassoDosDescontos.tsx:203`. Passo 4: `descontos.ts:127` `TOTAL` em `PassoRevisar.tsx:150`. Sinal: `PedidoMontadoPage.tsx:322,328,334` passam a usar `menos()` (`descontos.ts:130`: U+2212 + `formatPrice` do core). Contador: `frasesDaMontagem.ts:71` `${n} / ${max}`, lido por `FolhaColarTexto.tsx:63` | sim |
| cada comportamento do bloco `Testes` coberto, vermelho antes do fix | os quatro textos são asseridos com o valor novo, e cada asserção reprovaria com o texto antigo | sim (o vermelho em si só a execução prova) |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Quanto ao `Não faça`:
- **Medidas e tipografia:** o diff não toca em classe nenhuma, só em textos.
- **Arquivo fora da posse:** `frasesDaMontagem.ts` está fora da lista do Contrato, e o toque foi declarado na premissa 3.
- **Decisão "o valor em dinheiro sai do formatador de core; o sinal é U+2212":** aplicada nos três descontos do pedido montado.

## Testes

- **Passo 3, rótulo do combinado:** `montarPedido.descontos.test.tsx` busca os campos por `getByLabelText('Desconto (R$)')` e `getByLabelText('Desconto (%)')`, e `casca` e `rascunho` fazem o mesmo. A asserção morde: com o rótulo antigo, o campo não é encontrado.
- **Passo 4, última linha do resumo:** `montarPedido.revisar.test.tsx:185,364` espera `'TotalR$ 120,00'` e `'TotalR$ 132,00'` no `revisao-total`. Morde.
- **Pedido montado, sinal do desconto:** caso novo em `pedidosMontados.test.tsx` (≈ linha 300). Ele lê o `dd` irmão de cada `dt` (Promoção, Cupom SAUDADE10, Desconto combinado) e exige `'− R$ …'` exato com U+2212. Morde: com o hífen a igualdade falha.
- **Folha "Colar texto", contador:** `montarPedido.colarTexto.test.tsx:154,166` espera `'0 / 2000'` e `'2000 / 2000'` por `getByText` exato. Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Trocar o texto de `VALOR_EM_REAIS`/`VALOR_EM_PERCENTUAL` e manter os nomes | sim | o único leitor fora de teste é `PassoDosDescontos.tsx:33-34,203`; nenhum outro uso de "Valor em" no app | sim |
| 2 | `TOTAL` só no passo 4; o passo 3 continua "Itens" | sim | a tabela do bug cita "Total" só no Passo 4; `PassoDosDescontos.tsx:284` segue com `ITENS`; nenhum outro `TOTAL` exportado no barrel (`export *`), então não há conflito de nome | sim |
| 3 | Corrigir o contador em `contadorDoTexto` (`frasesDaMontagem.ts`), fora da posse | sim | o único chamador é `FolhaColarTexto.tsx:63`; escrever a frase de novo na tela daria dois donos para o mesmo texto; nenhum teste de unidade cravava `n/max` | sim |
| 4 | Os três descontos do pedido montado passam a usar `menos()` | sim | o bug fala do "sinal do desconto"; `menos` está no barrel por `export * from './model/descontos'`; `formatPrice` continua importado e em uso na página (linhas 309, 317, 340, 457) | sim |
| 5 | Atualizar os seletores e os valores esperados nos testes de página | sim | só mudou o valor esperado; nenhuma asserção ficou mais fraca | sim |

## Não conferido

- O diff de `montarPedido.pecas.test.tsx`, `MontarPedidoPage.tsx` e `model/sacola.ts` está na árvore, mas esses arquivos não estão em `alterados`. Pertencem a outra tarefa da onda e não foram julgados.
- O texto do protótipo `Montar Pedido.dc.html` não está no repositório. Usei como referência a tabela do bug.
- Não conferi o vermelho de cada teste antes do fix, se os testes passam, `tsc` nem lint: isso só a execução mostra.
- Os dez arquivos de `alterados` aparecem como `M` em `git status`, então o diff tem baseline e nada ficou sem prova por falta dela.

Instruções lidas: `CLAUDE.md` (raiz, carregado no contexto: Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines); `apps/mobile-adm/CLAUDE.md` › Pedidos montados (WI 94), › Montar pedido (WI 94), › Os guardas do app, › Testes (início).

## T18 — wi-impl-task · review · agente adcafc9282a0287cd

Tarefa: .specs/work-items/94-montar-pedido-no-app/tasks/18-bug-10-confirmacao-peca-acrescentada.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O toast é local da `MontarPedidoPage`, posto dentro da barra fixa da montagem (`absolute bottom-full mb-2`): ele flutua sobre a barra qualquer que seja a altura dela, que muda com a linha do motivo | Reusar o host global `AvisoDaAcao` (`mostrarAviso`), ou criar uma altura nova em `shared/ui/alturas.ts` | Pelo `AVISO_NO_FIM`, o host global ficaria em cima da barra da montagem. O prazo dele é 5 s, e o protótipo pede 3,2 s. E `alturas.ts` está fora da posse desta tarefa | `MontarPedidoPage.tsx` |
| 2 | "Peça atualizada." e "Peça removida." usam o mesmo toast de "Peça acrescentada." | Manter as duas no bloco estático do topo | É a mesma confirmação da sacola, no mesmo lugar. Deixá-las no topo repetiria o BUG-010 com outra frase | `MontarPedidoPage.tsx`; os casos que já existiam (`getByRole('status')`) passam sem mudança |
| 3 | O prazo é `PRAZO_DA_CONFIRMACAO_MS = 3200`, em `model/sacola.ts`, ao lado das frases da sacola. A `chave` muda a cada confirmação, então a nova reinicia o prazo e o prazo da velha não a apaga (como no `AvisoDaAcao`) | Usar 3000 ou 5000 | 3200 ms é o `showToast` do protótipo | `sacola.ts` (exportado pelo barril) |
| 4 | Mostrar a confirmação esvazia o bloco `aviso` do topo, como o `setAviso` já fazia. Os outros avisos (rascunho retomado, usar a ficha, leitura desfeita) continuam no bloco do topo, sem mudança | Levar todos os avisos para o toast | Os outros avisos estão fora do BUG-010 (regra 6) | `MontarPedidoPage.tsx` |
| 5 | Visual: cartão `bg-estrelinha-ink`, texto `text-estrelinha-surface`, `Check` do lucide em `text-estrelinha-accent` (o ouro como ícone, nunca como texto), `pointer-events-none`, sem animação | Animar a entrada do toast | Sem movimento não há par `motion-reduce:` a declarar, e o toast não rouba o toque do "Continuar" | `MontarPedidoPage.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | A confirmação flutua sobre a barra, em tinta com o check dourado, e some sozinha em cerca de 3 s | página (vitest, `<App />` real) | `apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx` › "flutua sobre a barra, em tinta com o check dourado, e some sozinha em cerca de 3 s" | sim | — (vermelho antes do fix; check extra no prazo: 99999 e 2000 ms, os dois vermelhos; restaurado pela cópia, `cmp` igual) |
| 2 | Trocar de passo apaga a confirmação | página (vitest) | idem › "trocar de passo apaga a confirmação: ela não segue para Descontos" | sim | — (vermelho antes do fix) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/features/order-proposal/model/sacola.ts alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/montarPedido.pecas.test.tsx --testTimeout=20000` (fonte: `PROJECT.md` › Comandos de verificação): vermelho antes (2 casos novos falhando), verde depois, 12/12.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (fonte: `CLAUDE.md` › Comandos): exit 0, 0 erros. Igual ao baseline (0).
- Verificação mínima (fonte: `CLAUDE.md` › Baselines / `PROJECT.md`):
  - `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000`: exit 0, 2701/173.
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: na primeira rodada, exit 1, com 7091/378 testes passando e 1 erro de infraestrutura do vitest (`Timeout calling "onTaskUpdate"`, contenção com a tarefa paralela). Na segunda, exit 0, 7091/378.
- `npx eslint` nos três arquivos: limpo.

Instruções lidas: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md` (75 KB, lido pelo índice) › abertura e "O que existe hoje", › A árvore, › Pedidos montados (WI 94), › Montar pedido (WI 94), › PWA, › Identidade, › Navegação, › Os guardas do app, › Testes; `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.

## Divergências e descobertas

- A tarefa 22 grava no mesmo `${TMPDIR}/wi-impl-saida.txt`, e a primeira leitura da minha saída trouxe falhas dela (casca, colarTexto, descontos). A partir daí, toda saída foi gravada só no scratchpad desta sessão. Fica o registro para o orquestrador: duas tarefas paralelas no mesmo arquivo temporário misturam as saídas.
- O erro "Timeout calling onTaskUpdate" da suíte da loja é de contenção, não de teste: a segunda rodada saiu limpa.
- Nenhuma citação morta nem deslocada: `MontarPedidoPage.tsx` e `sacola.ts` estão onde o Contrato diz. A linha `Depende de` (11 a 14) confere: os arquivos e a sacola existem.
- Não propaguei nada: nenhuma tarefa seguinte cita a confirmação da peça.
- A posição sobre a barra e o fundo tinta só se medem em navegador (jsdom não mede layout); fica para o reteste do QA.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 18
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz, pelas seções citadas); apps/mobile-adm/CLAUDE.md (pelo índice e pelas seções de alcance geral e da montagem)
Testes escritos: "flutua sobre a barra, em tinta com o check dourado, e some sozinha em cerca de 3 s" e "trocar de passo apaga a confirmação: ela não segue para Descontos", os dois em apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx, vermelhos antes do fix; nada ficou sem cobertura (a posição em pixels é da QA, em navegador)
Verificações: o arquivo de teste 12/12; tsc do mobile-adm 0 erros; suíte do mobile-adm 2701/173, exit 0; suíte da loja 7091/378, exit 0 na segunda rodada (a primeira teve um timeout de RPC do vitest, por contenção, com todos os testes passando); eslint limpo
Árvore de trabalho: apps/mobile-adm/src/pages/MontarPedidoPage.tsx, apps/mobile-adm/src/features/order-proposal/model/sacola.ts, apps/mobile-adm/src/pages/__tests__/montarPedido.pecas.test.tsx (nada commitado)
Citações conferidas: 2 (os dois itens do Contrato); nenhuma deslocada, nenhuma morta
```

## T18 — wi-impl-review · done · agente a2b96a076bc410ca6

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/18-bug-10-confirmacao-peca-acrescentada.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-010: o Esperado acontece seguindo os Passos (um toast sobre a barra, fundo tinta, check dourado, some em cerca de 3 s) | `MontarPedidoPage.tsx`: o toast fica dentro de `barra-da-montagem` (`absolute bottom-full mb-2`), com `bg-estrelinha-ink`, `text-estrelinha-surface` e `Check` em `text-estrelinha-accent`. O prazo é `PRAZO_DA_CONFIRMACAO_MS = 3200` (`sacola.ts`), com a guarda por `chave`. O efeito sobre `passos.passo` limpa o toast, então ele não chega aos Descontos, ao Revisar nem fica ao lado do alerta do "Criar link". `mostrarConfirmacao` esvazia o bloco `aviso` do topo | sim |
| cada comportamento do bloco `Testes` coberto por um teste escrito, vermelho antes do fix | `montarPedido.pecas.test.tsx`, describe "passo 2 · a confirmação da peça" (dois casos) | sim pela leitura; o vermelho de antes, só execução |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar unidade do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Os itens de `Contrato` foram cumpridos: em `MontarPedidoPage.tsx` só a confirmação mudou, e em `sacola.ts` só entrou a constante do prazo. O cabeçalho, a barra (o conteúdo dela) e o voltar não foram tocados, como pede o `Não faça` (tarefas 11 e 14).

## Testes

- **"a confirmação some depois do tempo dela"**: o caso "flutua sobre a barra… e some sozinha em cerca de 3 s". O teste morde. Ele procura o `status` dentro de `barra()`, então reprovaria com o bloco antigo no topo. Confere a classe `bg-estrelinha-ink` no cartão e `text-estrelinha-accent` no svg. Exige um só `status` na tela. Depois de 2500 ms o texto ainda está lá, e depois de 3500 ms sumiu. Esse par reprova um prazo de 5000 e também a ausência de prazo. O `shouldAdvanceTime` acrescenta poucos ms reais, que não mudam esses limites.
- **"e ao trocar de passo"**: o caso "trocar de passo apaga a confirmação". O teste morde. Depois de `continuar` e mais 50 ms, bem antes dos 3200 ms, ele confirma que está em "Passo 3 de 4 · Descontos" e que o texto sumiu. Como o toast vive na barra, que persiste entre os passos, apagar o efeito sobre `passos.passo` faria o caso reprovar.
- O nível é o declarado (componente/página, vitest, pela página real).

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O toast é local da página, dentro da barra fixa, sem o `AvisoDaAcao` global | sim | O `apps/mobile-adm/CLAUDE.md:285` descreve o `AvisoDaAcao` com 5 s, e a tarefa pede 3,2 s sobre a barra da montagem (o `showToast` do protótipo). Nenhuma linha das instruções obriga a montagem a usar esse host. `alturas.ts` não foi tocado | sim, só `MontarPedidoPage.tsx` |
| 2 | Atualizada e removida usam o mesmo toast | sim | Os casos que já existiam (`getByRole('status')`, linhas 300, 320 e 372 do teste) continuam com um único `status`, porque `mostrarConfirmacao` esvazia o `aviso` | sim |
| 3 | `PRAZO_DA_CONFIRMACAO_MS = 3200` em `sacola.ts`, com a guarda por `chave` | sim | Bate com o Esperado da tarefa. A limpeza do efeito e a comparação de `chave` impedem que o prazo velho apague a confirmação nova | sim, a constante sai pelo barril e entra só na página |
| 4 | Os outros avisos seguem no bloco do topo | sim | As linhas 228, 416 e 556 seguem com `setAviso`, e o BUG-010 trata só da confirmação da peça | sim |
| 5 | Visual em ink/surface/accent como ícone, `pointer-events-none`, sem animação | sim | O ouro aparece só no ícone. Sem `transition-*` nem `animate-*` não há par `motion-reduce:` a exigir, e o ícone tem `aria-hidden` | sim |

## Não conferido

- O vermelho antes do fix, a suíte passando, o `tsc` e o lint dependem de execução, que esta revisão não faz.
- A posição real em 390 × 844 depende de navegador: o toast sobre a barra sem cobrir o "Continuar", e o comportamento com a linha do motivo. O jsdom não mede layout, então isso fica para a QA.
- Os três arquivos aparecem como `M` no `git status`, ou seja, têm baseline. O diff foi julgado inteiro, e nenhuma mudança do recorte ficou sem explicação nesta tarefa.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (raiz, a cópia carregada no contexto: › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines); `apps/mobile-adm/CLAUDE.md` do worktree › Montar pedido (WI 94), › PWA, › Identidade, › Navegação, › Os guardas do app (até a linha 680), mais as linhas 285 e 301 (o `AvisoDaAcao` e as `alturas`) achadas por busca.

## T23 — wi-impl-task · review · agente add61e4a5b5cffed2

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/23-bug-20-medidas.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O "secundário com contorno" virou `border border-estrelinha-primary` (1 px, texto `primary`, fundo transparente). É a mesma classe que o botão "Guardar rascunho" (a `alternativa`) e o "Editar" do pedido montado já usam | `border-2` ou borda `field` | o repositório já tem o caso igual no mesmo arquivo (regra 1). A tabela do bug não diz a espessura | os botões "Manter", "Continuar montando", "Cancelar"/"Preencher à mão"; mais nada |
| 2 | Raio 8 no segmento "Em reais / Em %" como `rounded-[8px]`, nos dois botões | um token novo de raio | `packages/ui` está proibido nesta tarefa. Este app já usa raio arbitrário (`rounded-[12px]`, `rounded-[6px]`) | o seletor do passo 3 |
| 3 | O botão escolhido também ganhou `border-2`, na cor `primary` (a mesma do fundo) | borda só no desligado | assim os dois botões têm a mesma caixa e nada salta ao trocar | o seletor do passo 3 |
| 4 | O "segmento escolhido" foi lido como o seletor "Em reais / Em %", que é o que o Contrato nomeia. O seletor "Cliente nova / Cadastrada" de `PassoDaCliente.tsx` (também `rounded-sm`) não foi tocado | trocar também o de `PassoDaCliente` | esse arquivo está fora da posse desta tarefa, e o raio das faixas está registrado no BUG-011 | se o protótipo quiser raio 8 também em "Cliente nova / Cadastrada", isso fica para outra tarefa |
| 5 | O "gap interno" do cartão de Montados é o `gap` do flex-col do link do cartão: passou de `gap-2` para `gap-2.5`. O `p-4` e o `pt-2` das peças ficaram como estavam | mexer no padding | 8 → 10 px corresponde ao gap observado | o cartão da lista de Montados |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Os botões de ficar das folhas têm contorno ("Manter", "Continuar montando", "Cancelar"/"Preencher à mão") | componente | `apps/mobile-adm/src/features/order-proposal/ui/__tests__/botaoSecundarioDasFolhas.test.tsx` | sim | — |
| 2 | "Manter" com contorno, pela página real | página | `apps/mobile-adm/src/pages/__tests__/pedidoMontado.desenho.test.tsx` › medidas | sim | vermelho |
| 3 | A foto da peça no pedido montado é 48 × 60 | página | idem | sim | — |
| 4 | O cartão de Montados tem `gap-2.5` | página | idem | sim | — |
| 5 | No seletor "Em reais / Em %", o escolhido tem `rounded-[8px]` e o desligado `border-2 border-estrelinha-field`, e eles trocam ao trocar | página | `apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx` › medidas | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/pages/PedidoMontadoPage.tsx — alterado
apps/mobile-adm/src/features/order-proposal/ui/PassoDosDescontos.tsx — alterado
apps/mobile-adm/src/widgets/proposal-list/ui/ListaDeMontados.tsx — alterado
apps/mobile-adm/src/features/order-proposal/ui/FolhaDeConfirmacao.tsx — alterado
apps/mobile-adm/src/features/order-proposal/ui/FolhaColarTexto.tsx — alterado
apps/mobile-adm/src/features/order-proposal/ui/__tests__/botaoSecundarioDasFolhas.test.tsx — criado
apps/mobile-adm/src/pages/__tests__/pedidoMontado.desenho.test.tsx — alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx — alterado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md › Comandos de verificação), arquivo a arquivo: vermelho antes de cada fix, verde depois. No fim, `descontos`, `rascunho`, `colarTexto` e `botaoSecundarioDasFolhas` juntos: 47/47. `pedidoMontado.desenho` e `pedidosMontados`: 33/33.
- Check de mutação da fatia 2 (a única que passou de primeira): tirei o contorno do "Manter" em `FolhaDeConfirmacao.tsx` e o teste ficou vermelho (exit 1). Restaurei pela cópia, `cmp` confirmou o arquivo idêntico, e o teste voltou ao verde.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros. Não veio baseline na entrada; a tabela de Baselines dá 0 para o mobile-adm, então não há nada novo.
- Verificação mínima (CLAUDE.md › Baselines, mais "Gate de qualquer mudança aqui" do `apps/mobile-adm/CLAUDE.md`), com `pnpm --filter @estrelinha/<w> test --testTimeout=20000`, exit fora de pipe:
  - mobile-adm: 2708/174, exit 0
  - store: 7091/378, exit 0
  - backoffice: 5183/288, exit 0
- `npx eslint` nos 8 arquivos tocados: limpo.
- Instruções lidas: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines. O `apps/mobile-adm/CLAUDE.md` tem mais de 60 KB, então li o índice e as seções › Pedidos montados (WI 94), › Montar pedido (WI 94), › Identidade, › Testes. Também `.specs/project/PROJECT.md` › Comandos de verificação e › Ambiente local.

## Divergências e descobertas

- O `apps/mobile-adm/CLAUDE.md` foi lido por seções, e não inteiro como a tarefa pede: tem 75 KB, acima do limite de leitura integral.
- A tabela do bug não diz qual era o "segmento escolhido". Usei o do Contrato ("Em reais / Em %"). O seletor "Cliente nova / Cadastrada" de `PassoDaCliente.tsx` também tem `rounded-sm` e ficou como estava (decisão 4).
- Nenhuma citação `caminho:linha` deslocada nem morta. Não propaguei nada.
- As medidas reais em navegador (390 × 844) não foram feitas: são da QA. O jsdom só confere a classe.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 23
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; apps/mobile-adm/CLAUDE.md por seções (› Pedidos montados (WI 94), › Montar pedido (WI 94), › Identidade, › Testes — o arquivo tem 75 KB); .specs/project/PROJECT.md › Comandos de verificação, › Ambiente local
Testes escritos: a foto 48×60, "Manter" com contorno e o gap-2.5 do cartão de Montados em apps/mobile-adm/src/pages/__tests__/pedidoMontado.desenho.test.tsx; o raio 8 do escolhido e a borda 2 px field do desligado em apps/mobile-adm/src/pages/__tests__/montarPedido.descontos.test.tsx; o contorno de "Manter", "Continuar montando", "Guardar rascunho" e "Cancelar"/"Preencher à mão" em apps/mobile-adm/src/features/order-proposal/ui/__tests__/botaoSecundarioDasFolhas.test.tsx. Todos vermelhos antes do fix. O "Manter" pela página passou depois do fix da unidade e foi provado por mutação (vermelho). Sem cobertura: a medida em pixels no navegador (o jsdom não mede layout; fica para a QA)
Verificações: vitest arquivo a arquivo verde; tsc do mobile-adm 0 erros; suítes mobile-adm 2708/174, store 7091/378 e backoffice 5183/288, as três com exit 0; eslint dos arquivos tocados limpo
Árvore de trabalho: PedidoMontadoPage.tsx (foto 48×60), PassoDosDescontos.tsx (rounded-[8px] + border-2 field/primary), ListaDeMontados.tsx (gap-2.5), FolhaDeConfirmacao.tsx e FolhaColarTexto.tsx (o botão de ficar com border border-estrelinha-primary); um teste novo e dois testes alterados. Nada commitado
Citações conferidas: 4 do Contrato abertas ao usar; nenhuma deslocada nem morta. A divergência é a leitura do "segmento escolhido" (o do Contrato; o de PassoDaCliente fica fora da posse)
```

## T23 — wi-impl-review · done · agente aa072ad21b55da353

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/23-bug-20-medidas.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-020: o Esperado do bug acontece seguindo os Passos | foto 48 × 60: `PedidoMontadoPage.tsx:304` (`tamanho={48} altura={60}`). Raio 8 no segmento escolhido e borda de 2 px `field` no desligado: `PassoDosDescontos.tsx:195`. Gap de 10 px: `ListaDeMontados.tsx:72` (`gap-2.5`). Contorno: `FolhaDeConfirmacao.tsx:67` ("Manter"/"Continuar montando") e `FolhaColarTexto.tsx:75` ("Cancelar"/"Preencher à mão") | sim. As cinco linhas da tabela "Design × implementado" têm mudança no diff |
| Cada comportamento do bloco `Testes` coberto por um teste escrito, vermelho antes do fix | `pedidoMontado.desenho.test.tsx` (foto, "Manter", gap), `montarPedido.descontos.test.tsx` (segmento), `botaoSecundarioDasFolhas.test.tsx` (as duas folhas) | a cobertura está lá. O vermelho antes do fix é só execução: pela leitura, cada asserção reprovaria com as classes antigas |
| Testes dos arquivos alterados passando | — | só execução |
| Verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. A decisão "alvo de toque ≥ 44 px continua valendo" foi respeitada: os botões das folhas seguem `min-h-12`, o segmento segue `min-h-11`, e os testes conferem as duas classes.

## Testes

- **Foto 48 × 60**: `pedidoMontado.desenho.test.tsx`, "a foto da peça é 48 × 60". Lê `style.width`/`style.height` de cada `foto-da-peca`, que é exatamente o que `FotoDaPeca` escreve (`style={{ width: tamanho, height: altura }}`). Tem âncora: `fotos.length > 0`. Morde.
- **Raio 8 no segmento e borda 2 px `field` no desligado**: `montarPedido.descontos.test.tsx`. Confere por token exato: `rounded-[8px]` e a ausência de `rounded-sm` no escolhido; `border-2` + `border-estrelinha-field` no desligado. Confere de novo depois de trocar o tipo, nos dois sentidos. Morde.
- **Gap de 10 px no cartão de Montados**: `pedidoMontado.desenho.test.tsx`, com a página real em `/pedidos?visao=montados`. Exige `gap-2.5` e recusa o token `gap-2`. Morde.
- **Botões secundários com contorno**: `botaoSecundarioDasFolhas.test.tsx` cobre os dois componentes, inclusive a variante com `alternativa` e o rótulo "Preencher à mão". O token exato `border` é diferente de `border-2`. O sensor inverso confere que "Cancelar pedido", o botão principal, não ganha borda. `pedidoMontado.desenho.test.tsx` prova a fiação de "Manter" pela página real. Morde.

O nível está certo nos três arquivos: componente ou página, em vitest, como o bloco `Testes` declara.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Secundário como `border border-estrelinha-primary` (1 px) | sim | o "Guardar rascunho" (`alternativa`) em `FolhaDeConfirmacao.tsx` já usava exatamente essa classe; a tabela do bug não dá a espessura | sim. `FolhaDaObservacao.tsx:143` e `FolhaDoRastreio.tsx:203` (`features/order-actions`) têm o mesmo botão sem contorno, mas são do pedido, ficam fora da posse e os botões deles não estão no bug |
| 2 | `rounded-[8px]` arbitrário | sim | `packages/ui` é proibido pelo `Não faça`; o app já usa raio arbitrário | sim |
| 3 | `border-2` também no escolhido, na cor do fundo | sim | mantém a mesma caixa nos dois estados; nada no protótipo citado contradiz | sim |
| 4 | "Segmento escolhido" lido como o seletor "Em reais / Em %"; o de `PassoDaCliente` não foi tocado | sim | os Passos e a evidência (`CH-09-17-combinado-zera.png`) apontam o passo 3; `PassoDaCliente.tsx` não está no Contrato; o raio das faixas está no BUG-011 | sim. A ressalva sobre "Cliente nova / Cadastrada" está declarada |
| 5 | Gap interno = o `gap` do flex-col do link do cartão (`gap-2` → `gap-2.5`) | sim | 8 → 10 px bate com a tabela do bug (Observado 8, Protótipo 10) | sim |

## Não conferido

- O vermelho antes do fix e a passagem dos testes não foram conferidos: só a execução mostra. Pela leitura, cada asserção reprovaria nas classes antigas.
- A medida em navegador (390 × 844) não foi conferida: é da QA.
- `botaoSecundarioDasFolhas.test.tsx` aparece como `A` (intent-to-add) e está no diff; nenhum arquivo ficou sem baseline.

Instruções lidas: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines (vindo no contexto); `apps/mobile-adm/CLAUDE.md` › Pedidos montados (WI 94), › Montar pedido (WI 94), › PWA — só a casca, › Identidade, mais o índice de títulos.

## T20 — wi-impl-task · review · agente a9d9361284b938cfa

Tarefa: .specs/work-items/94-montar-pedido-no-app/tasks/20-bug-16-tipografia-de-destaque.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Corrigi "Total dos itens" e o nome da cliente do pedido montado em `apps/mobile-adm/src/pages/PedidoMontadoPage.tsx`, que não está no Contrato | Mexer só em `PassoRevisar.tsx`, que é o arquivo citado no Contrato | O bug observa "Total dos itens" com Outfit 500 14 px ao abrir um pedido montado (Passos 2). Esse texto (`TOTAL_DOS_ITENS`, testid `total-dos-itens`) só existe em `PedidoMontadoPage.tsx`; o `PassoRevisar` diz "Total" e não é nenhuma das cinco telas. A onda 6 tem só esta tarefa, então não há disputa de arquivo | `PedidoMontadoPage.tsx`: só duas classes mudaram |
| 2 | Não mexi em `PassoRevisar.tsx` | Aplicar o destaque também ao "Total" do passo 4 | O passo 4 não é nenhuma das cinco linhas da tabela "Design × implementado", e a regra 6 proíbe ampliar escopo | nenhum. Se o QA quiser o "Total" do Revisar no mesmo estilo, é um bug novo |
| 3 | Pus o destaque do nome em dois lugares: a cliente escolhida no passo 1 (`PassoDaCliente`) e o cartão Cliente do pedido montado | Mudar também os nomes da lista de busca e do cartão de Montados | Os Passos do bug apontam a cliente escolhida e o nome no pedido montado aberto; o resto não é citado | os dois arquivos |
| 4 | Escrevi as classes direto em cada elemento (`font-display font-bold text-estrelinha-primary` mais o tamanho) | Criar uma constante compartilhada em `shared/ui` | É o que o repositório já faz (`RecentOrders`, `WeekChart`, `LinhaDoPedidoDaCliente`), e evita arquivo novo fora da posse. Tamanhos: 16 px = `text-base`, 18 px = `text-lg`, nome = `text-[17px]`. O nome fica em `ink`, porque o Esperado não pede a cor primária para ele | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Total do cartão de Montados: serifa 700, primária, 16 px | página (vitest) | `apps/mobile-adm/src/pages/__tests__/pedidosMontados.test.tsx` › "o total do cartão na tipografia de destaque…" | sim | — |
| 2 | "Total dos itens" em serifa 700 primária 18 px; nome da cliente em serifa 700 17 px (pedido montado) | página (vitest) | `apps/mobile-adm/src/pages/__tests__/pedidoMontado.desenho.test.tsx` › "Pedido montado · a tipografia de destaque" | sim | — |
| 3 | Total da barra: serifa 700, primária, 18 px | página (vitest) | `apps/mobile-adm/src/pages/__tests__/montarPedido.casca.test.tsx` › "a barra fixa · a tipografia do total" | sim | — |
| 4 | Preço da folha da variação: serifa 700, primária, 16 px | componente (vitest) | `apps/mobile-adm/src/features/order-proposal/ui/__tests__/FolhaDaVariacao.test.tsx` › "FolhaDaVariacao · o preço" | sim | — |
| 5 | Nome da cliente escolhida no passo 1: serifa 700, 17 px | componente (vitest) | `apps/mobile-adm/src/features/order-proposal/ui/__tests__/PassoDaCliente.test.tsx` › "o nome da cliente escolhida em serifa 700 a 17 px" | sim | — |

Os cinco testes ficaram vermelhos antes do fix por falha de asserção de classe (token exato), nenhum por erro de compilação ou elemento não achado.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

## Arquivos alterados

apps/mobile-adm/src/widgets/proposal-list/ui/ListaDeMontados.tsx alterado
apps/mobile-adm/src/pages/MontarPedidoPage.tsx alterado
apps/mobile-adm/src/pages/PedidoMontadoPage.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx alterado
apps/mobile-adm/src/pages/__tests__/pedidosMontados.test.tsx alterado
apps/mobile-adm/src/pages/__tests__/pedidoMontado.desenho.test.tsx alterado
apps/mobile-adm/src/pages/__tests__/montarPedido.casca.test.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/__tests__/FolhaDaVariacao.test.tsx alterado
apps/mobile-adm/src/features/order-proposal/ui/__tests__/PassoDaCliente.test.tsx alterado

## Verificação

- Um arquivo de teste, `pnpm exec vitest run <arquivo> --testTimeout=20000` dentro de `apps/mobile-adm` (fonte: `PROJECT.md` › Comandos de verificação). Os cinco arquivos ficaram vermelhos antes do fix. Depois do fix, os arquivos de `pages/__tests__/montarPedido*`, `pedidosMontados`, `pedidoMontado.desenho`, `features/order-proposal` e `widgets/proposal-list` deram 18 arquivos e 186 testes, todos passando, exit 0.
- Tipos, `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (fonte: `CLAUDE.md` › Comandos): exit 0 e 0 erros. Baseline `0`, sem mudança.
- Verificação mínima: suíte do mobile-adm, `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` (fonte: `CLAUDE.md` › Baselines e `apps/mobile-adm/CLAUDE.md` › Testes): exit 0, 2713 testes em 174 arquivos.
- Suíte da loja: rodei só os guardas, `pnpm --filter @estrelinha/store exec vitest run src/shared/lib/__tests__ --testTimeout=20000`, exit 0, 2826 testes em 112 arquivos. A suíte inteira não rodou, para caber no limite de tempo do comando.
- Suíte do painel: rodei só os guardas, `src/shared/lib/__tests__` e `src/app/__tests__`, exit 0, 282 testes em 25 arquivos. A suíte inteira também não rodou.
- Lint, `npx eslint` nos arquivos de produção alterados do mobile-adm: exit 0, sem problemas.

Instruções lidas: `CLAUDE.md` › Comandos; `CLAUDE.md` › Alias de import; `CLAUDE.md` › O "defeito 01"; `CLAUDE.md` › Convenções que valem em todo o repositório; `CLAUDE.md` › Os guardas; `CLAUDE.md` › Baselines (pela cópia do contexto mais o índice do worktree); `apps/mobile-adm/CLAUDE.md` › O que existe hoje; `apps/mobile-adm/CLAUDE.md` › Pedidos montados (WI 94); `apps/mobile-adm/CLAUDE.md` › Montar pedido (WI 94); `apps/mobile-adm/CLAUDE.md` › Identidade; `apps/mobile-adm/CLAUDE.md` › Testes; `.specs/project/PROJECT.md` › Comandos de verificação; `.specs/project/PROJECT.md` › Ambiente local.

## Divergências e descobertas

- O Contrato erra um arquivo. Ele lista `PassoRevisar.tsx` para "Total dos itens", mas o valor observado no bug mora em `PedidoMontadoPage.tsx`. Corrigi o arquivo onde o valor mora, fora da posse escrita (decisão 1), e deixei `PassoRevisar.tsx` sem alteração.
- Pela regra do tamanho, `CLAUDE.md` (408 KB) e `apps/mobile-adm/CLAUDE.md` (75 KB) foram lidos por seção, não inteiros.
- Não fiz prova em navegador. O tamanho e a cor estão provados por token de classe; a medida em 390 × 844 fica para o reteste do QA.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 20
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, por seção: Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines); apps/mobile-adm/CLAUDE.md (por seção: O que existe hoje, Pedidos montados, Montar pedido, Identidade, Testes); .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: cinco valores, um caso cada, todos vermelhos antes do fix:
  - total do cartão de Montados — pages/__tests__/pedidosMontados.test.tsx
  - "Total dos itens" e nome da cliente no pedido montado — pages/__tests__/pedidoMontado.desenho.test.tsx
  - total da barra — pages/__tests__/montarPedido.casca.test.tsx
  - preço da folha da variação — features/order-proposal/ui/__tests__/FolhaDaVariacao.test.tsx
  - nome da cliente escolhida — features/order-proposal/ui/__tests__/PassoDaCliente.test.tsx
  Sem cobertura: a medida em pixel (jsdom não mede), que fica para o reteste do QA.
Verificações:
  - testes dos arquivos alterados: 186/186, exit 0
  - tsc do mobile-adm: 0 erros (baseline 0)
  - suíte do mobile-adm: 2713/174, exit 0
  - guardas da loja: 2826/112, exit 0; guardas do painel: 282/25, exit 0 (as suítes inteiras dos dois não rodaram)
  - eslint dos arquivos alterados: 0 problemas
Árvore de trabalho: ListaDeMontados.tsx, MontarPedidoPage.tsx, PedidoMontadoPage.tsx (fora do Contrato, ver divergência), FolhaDaVariacao.tsx, PassoDaCliente.tsx e os cinco arquivos de teste acima; nada commitado
Citações conferidas: 5 do Contrato. PassoRevisar.tsx existe mas não contém "Total dos itens": o valor está em PedidoMontadoPage.tsx. Nenhuma citação morta.
Propagado: nada (não há tarefa seguinte depois da 20)
```

## T20 — wi-impl-review · done · agente a6894fdcd11a68e2e

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/tasks/20-bug-16-tipografia-de-destaque.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-016: o Esperado do bug acontece seguindo os Passos | Os cinco valores do bug. (1) O total do cartão de Montados, em `ListaDeMontados.tsx:87`: `font-display text-base font-bold text-estrelinha-primary`. (2) "Total dos itens", em `PedidoMontadoPage.tsx:339`: `font-display text-lg font-bold text-estrelinha-primary`. (3) O total da barra, em `MontarPedidoPage.tsx:656`: `font-display text-lg font-bold text-estrelinha-primary`. (4) O preço da folha da variação, em `FolhaDaVariacao.tsx:120`: `font-display text-base font-bold text-estrelinha-primary`. (5) O nome da cliente, em `PassoDaCliente.tsx:301` e `PedidoMontadoPage.tsx:287`: `font-display text-[17px] font-bold`. Os tamanhos batem com 16/18/18/16 e 17 px, e as cores vêm dos tokens do preset. | sim (em navegador, só execução) |
| cada comportamento do bloco `Testes` coberto por um teste escrito por ele, vermelho antes do fix | Os quatro arquivos de teste da seção Testes abaixo, que cobrem os cinco valores | asserção confere; o vermelho antes do fix é só execução |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Ela tem a "Decisão já tomada" de usar fontes e cores pelos tokens do preset. Foi cumprida: as cores usadas são `text-estrelinha-primary` e `font-display`, sem hex e sem cor arbitrária, e nem `packages/ui` nem o `tailwind.config` foram tocados.

## Testes

- **Total do cartão de Montados**: `pages/__tests__/pedidosMontados.test.tsx`, pelo `<App />` real. Confere por token exato `font-display`, `font-bold`, `text-estrelinha-primary` e `text-base`, e a ausência de `font-medium`. Morde: sem o fix, o elemento só tinha `font-medium`.
- **"Total dos itens" e o nome no pedido montado**: `pages/__tests__/pedidoMontado.desenho.test.tsx`. Usa `temClasse` e `semClasse` por token exato, e o nome tem de não ter `text-base` nem `font-medium`, que eram as classes de antes. Morde.
- **Total da barra**: `pages/__tests__/montarPedido.casca.test.tsx`, pela página real. Confere `font-bold` e `text-estrelinha-primary`, e a ausência de `text-estrelinha-ink`. Morde: antes já havia `font-display` e `text-lg`, e são as duas outras classes que derrubam o teste.
- **Preço da folha**: `features/order-proposal/ui/__tests__/FolhaDaVariacao.test.tsx`. Confere por token exato e a ausência de `text-estrelinha-ink`. Morde.
- **Nome da cliente escolhida no passo 1**: `features/order-proposal/ui/__tests__/PassoDaCliente.test.tsx`. Confere `font-display`, `font-bold` e `text-[17px]`, e a ausência de `text-base`. Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Corrigir "Total dos itens" e o nome em `PedidoMontadoPage.tsx`, que está fora do Contrato | sim | `TOTAL_DOS_ITENS` (`model/frases.ts:133`) e o testid `total-dos-itens` só se usam em `PedidoMontadoPage.tsx`. O Passo 2 do bug fala do pedido montado aberto. O "Não faça" permite tocar arquivo fora da posse desde que registrado, e ele registrou. | sim. As tarefas 22 e 23 também tocam esse arquivo, mas em outros trechos (o sinal do desconto e a foto da peça) e proíbem mudar tipografia, então não há colisão. |
| 2 | Não mexer em `PassoRevisar.tsx` | sim | O passo 4 não está entre as cinco linhas da tabela "Design × implementado". O Contrato só autoriza alterar "o necessário ao fix", e não obriga a mudar o arquivo. | sim |
| 3 | Destacar o nome em dois lugares: a cliente escolhida no passo 1 e o cartão Cliente do pedido montado | sim | Os Passos 2 e 3 do bug citam exatamente esses dois lugares | sim |
| 4 | Escrever as classes direto em cada elemento, sem constante compartilhada, e deixar o nome sem a cor primária | sim | Nenhuma linha de `apps/mobile-adm/CLAUDE.md` pede constante de tipografia. O Esperado não dá a cor primária ao nome ("display 700, 17 px"). | sim |

## Não conferido

- A renderização real da fonte (Libre Baskerville 700) e das medidas em 390 × 844: depende de navegador e é da QA.
- O vermelho antes do fix e a suíte passando: depende de execução.
- Os dez arquivos aparecem no diff como `M`, então há baseline e nenhum ficou sem prova por falta dela.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (o da raiz, carregado no contexto: › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines); `apps/mobile-adm/CLAUDE.md` › Pedidos montados (WI 94), › Montar pedido (WI 94), › PWA, › Identidade, › Testes, mais o índice de títulos.
