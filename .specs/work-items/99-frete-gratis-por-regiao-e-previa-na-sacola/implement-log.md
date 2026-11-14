# Log da implementação por ondas — 99

## T01 — wi-impl-task · review · agente adf7ae7be5e9ddc04

Tarefa: .specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/01-regiao-e-regra-do-frete-gratis.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A frase do ⓘ fica em `freeShipping.ts`, como `freeShippingRuleText(config) → string \| null`. Ela importa `formatPrice` de `../formatters/price.ts`, uma folha sem import. O trecho de regiões que entra na frase ("no Sul (PR, SC, RS) e no Sudeste (…)") é `regionsWithStates(slugs)`, em `region.ts`. | Pôr a frase inteira em `region.ts`, como o Contrato pede. | `region.ts` tem de ficar sem import nenhum (Obrigações), e o valor da frase sai de `formatPrice`. Montar a frase da config, com o preço formatado, só cabe em `freeShipping.ts`. | Tarefa 08: ela consome a frase. Propagado no arquivo dela. |
| 2 | `effectiveRegions(valor)`: o que não é lista (ausente, `null`, string, objeto) vale as cinco regiões. Numa lista, ficam só os slugs válidos, sem repetição e na ordem fixa. Se nenhum for válido, a lista fica vazia, e com o interruptor ligado o frete grátis fica inativo. | Tratar uma lista só com slugs inválidos (`['xyz']`) como as cinco. | Lista corrompida que ninguém escolheu não deve conceder frete grátis para o país todo. O resultado vazio cai no lado seguro: não concede. | `freeShippingConfigOf`, o estado e a recusa. As tarefas 03 e 05 leem por aqui. |
| 3 | O estado inativo `INATIVO`, congelado e compartilhado, ganhou `destination: 'unknown'`, `granted: false`, `regions: []` (congelada) e `regionLimited: false`. O destino não é calculado com o frete grátis inativo. | Calcular o destino também no inativo. | Mantém o objeto único e congelado, como manda o exemplar. Nenhum desenho precisa do destino com o frete grátis desligado. | As superfícies das tarefas 06–09 que lerem `destination` com o frete grátis inativo. |
| 4 | `regionOfCep` aceita só `^\d{5}-?\d{3}$`, depois do `trim`. Letra no meio deixa a região desconhecida, mesmo que restem oito dígitos. | Tirar tudo o que não é dígito, como faz `isRsCep`. | "Com letras ⇒ desconhecida" está no bloco Testes. Tirar a letra faria `01a310100` virar um CEP válido. | Toda tela que passar CEP à regra. A máscara e o espaço em volta seguem aceitos. |
| 5 | `regionsLabel` e `regionsWithStates` devolvem `null` com as cinco regiões e também com a lista vazia. | Devolver string vazia para a lista vazia. | Com a lista vazia o frete grátis está inativo e não há o que dizer. | As tarefas 07 e 08. |
| 6 | `freeShippingConfigOf`: interruptor que não é `true` vale desligado; faixa que não é número finito vale 0. As regiões saem sempre preenchidas pelo `effectiveRegions`. | Aceitar `'sim'` ou uma faixa em string numérica. | "Valor inválido descartado", do Contrato, e o desligado como padrão (`AD-027`). | As tarefas 03, 04 e 05. |
| 7 | Na recusa, a faixa é conferida antes da região. A recusa de região só sai com o interruptor ligado e a lista vazia. Campo ausente passa. | — | Mantém intactas as recusas de hoje (Testes). | O painel, tarefa 05. |
| 8 | Rodei `pnpm install --frozen-lockfile --prefer-offline` no worktree. | Abortar por falta de ferramenta. | O worktree não tinha `node_modules`, então não havia `tsc` nem `vitest`. O comando termina sozinho e não sobe processo. A pasta `node_modules` é ignorada pelo Git. | O worktree inteiro, inclusive a tarefa 02, que roda em paralelo. Nenhum arquivo versionado mudou. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | CEP → região, nas bordas de cada faixa; máscara; vazio, incompleto, com letras e 00000 ⇒ desconhecida | unidade (core) | packages/core/src/shipping/__tests__/region.test.ts | sim | vermelho (faixa RO 76800–76999 trocada para Centro-Oeste ⇒ 2 falhas) |
| 2 | Rótulo das regiões e trecho da frase (ordem fixa, "e" antes da última, as cinco ⇒ null) | unidade (core) | region.test.ts | sim | vermelho (o "e" trocado por vírgula ⇒ 4 falhas) |
| 3 | O estado: desligado nunca concede; CA-19 campo a campo; campanha sem CEP, com SP/RS e com BA; regiões ausentes; lista vazia ⇒ inativo; inativo congelado | unidade (core) | packages/core/src/shipping/__tests__/freeShipping.test.ts | sim | — (vermelho no ciclo); check extra: `granted` sem região ⇒ 2 falhas |
| 4 | `freeShippingConfigOf` (completo, sem regiões, lista inválida, null, undefined, {}) | unidade (core) | freeShipping.test.ts | sim | — (vermelho no ciclo); check extra: sem normalizar ⇒ 7 falhas |
| 5 | A frase da regra (`freeShippingRuleText`) | unidade (core) | freeShipping.test.ts | sim | — |
| 6 | A recusa de região; desligado sem região passa; recusas de hoje intactas | unidade (core) | freeShipping.test.ts | sim | — |
| 7 | Guarda `denoReach` com `region.ts` em `ENTRADAS`, sensor de import sem `.ts` | guarda (core) | packages/core/src/shipping/__tests__/denoReach.test.ts | sim | vermelho (import sem `.ts` injetado em `region.ts` ⇒ 7 falhas) |

Toda mutação foi restaurada pela cópia, conferida com `cmp`, e o verde voltou: shipping 190/190.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

packages/core/src/shipping/region.ts — criado
packages/core/src/shipping/__tests__/region.test.ts — criado
packages/core/src/shipping/freeShipping.ts — alterado
packages/core/src/shipping/__tests__/freeShipping.test.ts — alterado
packages/core/src/shipping/__tests__/denoReach.test.ts — alterado
packages/core/src/shipping/index.ts — alterado
.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/08-faixa-v2-da-gaveta.md — alterado (propagação, linha 78)

## Verificação

- Tipos (do arquivo de instruções, `CLAUDE.md` › Comandos/Baselines): `npx tsc --noEmit -p packages/core/tsconfig.json`. O resultado tem 11 erros, iguais ao baseline que medi antes da primeira fatia: carousel 5 TS2345, pickHomeBanners 1 TS2353, pickHomeCollections 1 TS2353, sitemap/urls 1 TS2339 + 1 TS2353, supabase/client 2 TS2339. Nenhum é novo.
- Um arquivo de teste (do `PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/core exec vitest run <arquivo> --testTimeout=20000`.
  - region 49/49
  - freeShipping 57/57
  - denoReach 10/10
  - proposals/purity 6/6
  - shipping inteiro 190/190
- Verificação mínima (do arquivo de instruções, `CLAUDE.md` › Baselines: a suíte do workspace tocado): `pnpm --filter @estrelinha/core test --testTimeout=20000`. Saiu com exit 0, 6075 testes em 252 arquivos.
- `pnpm install --frozen-lockfile --prefer-offline`: exit 0. Foi preciso para ter `tsc` e `vitest` no worktree.

Instruções lidas:
- `CLAUDE.md` (raiz) › O "defeito 01", Convenções que valem em todo o repositório, Alias de import, Os guardas, Baselines
- `packages/core/CLAUDE.md` › Pureza, Os módulos, Dinheiro, Convenções de tipo
- `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local

## Divergências e descobertas

- **Contrato × obrigação:** o Contrato põe "a frase da regra do ⓘ" em `region.ts`, mas a obrigação proíbe import em `region.ts` e a frase precisa de `formatPrice`. A frase ficou em `freeShipping.ts` (premissa 1). Propagado: a linha 78 da tarefa 08 agora diz `freeShippingRuleText(config)`, em `freeShipping.ts`.
- **Guarda `denoReach` sem check de mutação próprio:** ela passou de primeira (é guarda sobre um arquivo que já existia). Fiz um check por injeção real em `region.ts`, que ficou vermelho.
- **Dois vizinhos novos no grafo de `proposals`:** `freeShipping.ts` agora importa `region.ts` e `formatters/price.ts`, as duas folhas sem import. `proposals/__tests__/purity.test.ts` segue verde.
- **Parte de RN-14 que não fiz:** "`freeShippingSingleOwner.test.ts` … ganha as asserções de região" fala de um guarda da suíte da loja, e o bloco Testes desta tarefa não o lista. Não toquei nele; fica para a tarefa que mexer nas superfícies (por exemplo a 11). A suíte da loja não foi rodada, porque nenhum arquivo de `apps/` mudou.
- **Worktree sem dependências:** ele não tinha `node_modules`. Instalei com `pnpm install`, offline-first, e nenhum arquivo versionado mudou.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 01
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › defeito 01, Convenções, Alias de import, Os guardas, Baselines; packages/core/CLAUDE.md › Pureza, Os módulos, Dinheiro, Convenções de tipo; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: CEP→região nas bordas, máscara e inválidos — region.test.ts; rótulo das regiões e trecho da frase — region.test.ts; o estado (desligado, CA-19 campo a campo contra a regra de antes escrita à parte, campanha sem CEP/SP/RS/BA, regiões ausentes, lista vazia, inativo congelado e compartilhado) — freeShipping.test.ts; freeShippingConfigOf — freeShipping.test.ts; frase da regra freeShippingRuleText — freeShipping.test.ts; recusa de região — freeShipping.test.ts; denoReach com region.ts em ENTRADAS + sensor de import sem .ts — denoReach.test.ts. Os três toEqual de antes foram reescritos com os campos novos, ganhando casos (inativo com CEP; acima sem CEP). Nada ficou sem cobertura.
Verificações: tsc packages/core com 11 erros, iguais ao baseline; vitest dos arquivos tocados verde (region 49, freeShipping 57, denoReach 10, proposals/purity 6); suíte do core 6075/252 com exit 0; check de mutação em 5 pontos, todos vermelhos, restaurados pela cópia e conferidos com cmp.
Árvore de trabalho: criados packages/core/src/shipping/region.ts e __tests__/region.test.ts; alterados freeShipping.ts, index.ts (export de region.ts), __tests__/freeShipping.test.ts e __tests__/denoReach.test.ts; tasks/08 linha 78 (propagação). node_modules instalado (ignorado pelo Git).
Citações conferidas: 7 (pickup.ts, pickup.test.ts, freeShipping.ts INATIVO/freeShippingState/freeShippingRefusal, freeShipping.test.ts :84/:114/:123 — as três batiam, denoReach.test.ts ENTRADAS, proposals/__tests__/purity.test.ts, shipping/index.ts); nenhuma deslocada, nenhuma morta.
Propagado: tarefa 08 — "a frase da regra" agora diz onde ela está: freeShippingRuleText(config), em freeShipping.ts, e não em region.ts.
```

## T01 — wi-impl-review · done · agente af03a186519f59eb0

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/01-regiao-e-regra-do-frete-gratis.md
Veredito: serve

## Achados

Nenhum.

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| `regionOfCep` responde as cinco regiões e `null` nas bordas listadas | `region.ts`, `FAIXAS` e `regionOfCep`. As dez faixas batem com D-04, e a regex `^\d{5}-?\d{3}$` roda depois do `trim`. Testes em `region.test.ts`: 20 bordas e 10 casos que dão `null` | sim |
| com as cinco regiões, `freeShippingState` devolve o mesmo que hoje para qualquer CEP e sem CEP, mais os campos novos coerentes | `freeShipping.ts`: `ativo`, `regionLimited`, `granted = remaining <= 0 && (destination === 'inside' \|\| !regionLimited)`. Em `freeShipping.test.ts`, o bloco CA-19 cruza 3 configs, 9 CEPs e 5 subtotais e compara contra a regra antiga escrita à parte | sim |
| com Sul + Sudeste: SP/RS acima concedido; BA `outside`; sem CEP acima `reached` e não `granted` | o bloco "campanha Sul + Sudeste" em `freeShipping.test.ts` | sim |
| a recusa de região existe e o desligado com lista vazia passa | `freeShippingRefusal`: a checagem de lista vazia vem depois da faixa. Os testes cobrem ligado sem região, desligado sem região e a ordem das duas recusas | sim |
| cada comportamento do bloco `Testes` coberto por um teste escrito | ver a seção Testes | sim |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- Os `toEqual` de `freeShipping.test.ts:84/114/123` foram reescritos com os campos novos: `INATIVO_ESPERADO` e o estado completo abaixo da faixa. A obrigação de ganhar casos foi cumprida: entraram o caso do inativo com CEP e o do estado inteiro acima da faixa, sem CEP. Nenhum `toMatchObject`.
- `region.ts` não tem import nenhum, e o teste novo em `denoReach.test.ts` confere isso. `freeShipping.ts` importa `./region.ts` e `../formatters/price.ts`, os dois com a extensão. `price.ts` é folha sem import.
- Os comentários de `region.ts`, `freeShipping.ts` e `denoReach.test.ts` descrevem a forma de import proibida sem escrevê-la. O import sem `.ts` do sensor está dentro de uma string de teste, que é o padrão que os sensores já existentes usam.
- `proposals/__tests__/purity.test.ts`: o grafo novo (`region.ts`, `formatters/price.ts`) só tem caminhos relativos com `.ts` e nenhum pacote, então a régua o aceita. Se a suíte fica verde, só a execução mostra.

## Testes

- CEP → região, nas bordas de cada faixa, com máscara, e os casos que dão desconhecida: `region.test.ts`. A asserção morde: `toBe` exato por borda e `toBeNull` nos inválidos, inclusive `01a310100`.
- Rótulo das regiões em qualquer ordem, uma, três, as cinco, vazia, e a frase da regra: `region.test.ts` e `freeShipping.test.ts` › `freeShippingRuleText`. A asserção morde: as strings são comparadas exatas.
- O estado: desligado com e sem CEP, CA-19 campo a campo, campanha abaixo e acima da faixa sem CEP, SP/RS, BA em qualquer subtotal, regiões ausentes, lista vazia vira inativo, inativo congelado com a mesma identidade (`toBe` e `isFrozen`, também em `regions`). Em `freeShipping.test.ts`, e a asserção morde.
- `freeShippingConfigOf` com o objeto completo, sem o campo, com lista inválida, com `null`, `undefined`, `{}` e com interruptor e faixa inválidos: `freeShipping.test.ts`. A asserção morde, com `toEqual` sobre o objeto inteiro.
- A recusa: os casos novos estão em `freeShipping.test.ts`, e os casos das recusas de hoje seguem no arquivo.
- Guarda: `denoReach.test.ts` ganhou `region.ts` em `ENTRADAS`, uma âncora de conteúdo, um teste de folha sem import e um sensor de import relativo sem `.ts` em `region.ts`. A asserção morde: o resultado esperado é exato.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | A frase do ⓘ fica em `freeShipping.ts` (`freeShippingRuleText`), e o trecho com os estados em `region.ts` (`regionsWithStates`) | sim | O Contrato põe a frase em `region.ts`, mas a Obrigação proíbe import nesse arquivo e a frase precisa de `formatPrice`. Quem monta a frase continua sendo um dono só | sim. Só a tarefa 08 cita a frase ("Compras a partir…"), e a linha 78 dela já aponta `freeShippingRuleText` em `freeShipping.ts`. As tarefas 06, 07 e 09 não consomem a frase |
| 2 | Valor que não é lista vale as cinco. Lista só com slugs inválidos fica vazia, e isso deixa o frete grátis inativo | sim | RN-15 e D-02 cobrem só o campo ausente e a lista vazia, e nada nos dois contradiz a premissa. Ela cai no lado que não concede | sim |
| 3 | O inativo ganhou `destination: 'unknown'`, `granted: false` e `regions` vazia congelada | sim | Contrato e D-01: o estado congelado único segue o molde do `INATIVO` original | sim (06–09) |
| 4 | `regionOfCep` aceita só os oito dígitos, com hífen opcional | sim | O bloco Testes diz que CEP "com letras ⇒ desconhecida" | sim |
| 5 | `regionsLabel` e `regionsWithStates` devolvem `null` com as cinco e com a lista vazia | sim | D-06 manda `null` com as cinco. Com a lista vazia o estado é inativo | sim (07, 08) |
| 6 | `freeShippingConfigOf` descarta interruptor que não é `true` e faixa que não é número finito | sim | Contrato ("valor inválido descartado") e `AD-027` (desligado por padrão) | sim (03, 04, 05) |
| 7 | A faixa é conferida antes da região na recusa | sim | O bloco Testes pede as recusas de hoje intactas, e o teste confere a ordem | sim (05) |
| 8 | Rodou `pnpm install --frozen-lockfile` no worktree | sim | Só mexe em `node_modules`, que o Git ignora. Nenhum arquivo versionado aparece alterado nos caminhos julgados | sim |

## Não conferido

- `.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/08-faixa-v2-da-gaveta.md` não tem baseline: o diretório inteiro do WI está `??`, sem intent-to-add. Julguei o arquivo pelo escopo declarado e confirmei que a linha 78 traz a afirmação propagada. Não há como provar que a propagação mexeu só nessa afirmação, nem que ela foi a única mudança; isso depende da palavra do implementador.
- Testes passando, `tsc` e a suíte de `proposals/purity`: só a execução mostra.
- A asserção "`freeShippingSingleOwner.test.ts` ganha as asserções de região" (RN-14) não está no `Pronto quando` nem nas Obrigações desta tarefa. Ela é citada pelas tarefas 03, 05, 06, 07, 09 e 11, então não foi conferida aqui.
- Instruções lidas: `CLAUDE.md` (raiz) › "O defeito 01", "Convenções que valem em todo o repositório", "Alias de import", "Os guardas — o que trava o quê", "Baselines" (vieram no contexto); `packages/core/CLAUDE.md` › "Quando um código pertence a este pacote", "Pureza", "Os módulos" (lidas; "Dinheiro" só pelo título, e a tarefa não toca `payment/**`).

## T02 — wi-impl-task · review · agente a709bfc7ffd37099a

Tarefa: .specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/02-info-tip-da-loja.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartei | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O clique é tratado no `onClick` do botão, com `preventDefault()` (o alternador do Radix não roda). O tipo do ponteiro vem do `pointerdown` anterior: com mouse o clique fixa o balão (um segundo clique, com ele fixado, fecha); toque, caneta ou Enter/Espaço alternam. | Deixar o alternador do Radix | Ele fecharia o balão que a passagem do mouse acabou de abrir, e o Design pede "clique de mouse mantém aberto". | nenhum |
| 2 | O foco que vem junto de um `pointerdown` não abre o balão. Só o foco sem ponteiro abre (teclado). | Abrir em todo foco | No celular a ordem é `pointerdown → focus → click`: abrir no foco faria o toque fechar logo em seguida o que acabou de abrir. | nenhum |
| 3 | `onOpenAutoFocus` e `onCloseAutoFocus` levam `preventDefault()`. | O padrão do Radix (o foco entra no balão e volta ao botão no fechamento) | O foco entrando no balão tiraria o foco do botão e o fecharia na hora. O foco voltando ao botão depois de o mouse sair o reabriria pelo `onFocus`. O balão não tem nada que receba foco. | nenhum |
| 4 | A perda de foco fecha, e isso inclui tocar ou clicar dentro do próprio balão no computador (o botão perde o foco). | Manter aberto ao clicar no balão | É o comportamento literal de "fecha ao perder o foco". O conteúdo é só texto. | a tarefa 08 e a 09, se quiserem conteúdo clicável dentro do balão |
| 5 | Entrada do balão: `duration-150`, `data-[state=open]:![--tw-enter-scale:1]`, `data-[state=open]:![--tw-enter-translate-y:4px]` e `motion-reduce:!animate-none`, todas com `!important`. | Trocar as classes de animação, ou usar `motion-reduce:animate-none` sem `!` como no painel | O `PopoverContent` já traz `zoom-in-95`, `slide-in-from-top-2` e `animate-in` com seletor `data-[…]`, que é mais específico. O `twMerge` não resolve esses conflitos e a ordem no CSS não é garantida. Sem `!`, o `motion-reduce:animate-none` perderia para o `data-[state=open]:animate-in`. | o visual do balão. Só o navegador prova, na Validation |
| 6 | API: `export default InfoTip`, com as props `label`, `children`, `className?` e `collisionBoundary?: Element \| null \| Array<Element \| null>`. Importa-se por `@/shared/ui/InfoTip`, sem barril. | Export nomeado | Segue `PolicyContact` e `RouteFallback` em `shared/ui`. | tarefas 08 e 09, que consomem o componente |
| 7 | O balão abre e fecha pela passagem do mouse só sobre o botão. Levar o mouse do botão até o balão fecha o balão, a menos que tenha havido clique. | Manter aberto com o mouse sobre o balão | É o que o Design diz ("fecha ao sair"). | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Abre com a passagem do mouse e fecha ao sair; a passagem do dedo não abre; o toque alterna; o clique do mouse mantém aberto | componente | `apps/store/src/shared/ui/__tests__/InfoTip.test.tsx` | sim | vermelho (M4: sem fixar no clique; M5: sem o filtro do foco por ponteiro; M6: a passagem sem filtro de `pointerType`) |
| 2 | Esc fecha; clique fora fecha; foco abre; perder o foco fecha | componente | `InfoTip.test.tsx` | sim | vermelho (M5, M8). Antes, M8 ficou verde: ver Divergências |
| 3 | Rótulo acessível recebido, `aria-expanded` acompanha o estado, `role="tooltip"`, conteúdo em texto ou nó | componente | `InfoTip.test.tsx` | sim | vermelho (M7: sem `role="tooltip"`, 8 casos reprovam) |
| 4 | O botão usa `TAP_44` (token exato) e não tem `absolute`; o balão leva `collisionPadding` 16, a largura limitada (token exato), o `collisionBoundary` e o par `motion-reduce:` na entrada | componente | `apps/store/src/shared/ui/__tests__/InfoTip.declaracao.test.tsx` | sim | vermelho (M1: padding 8; M2: sem `TAP_44`; M3: sem `motion-reduce:`) |

O primeiro vermelho das fatias 1 a 3 foi só o módulo inexistente. Todos os testes passaram de primeira com a implementação, e por isso cada fatia levou o check de mutação: cópia em /tmp, restaurada pela cópia, `cmp` conferido, verde reconfirmado.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/shared/ui/InfoTip.tsx criado
apps/store/src/shared/ui/__tests__/InfoTip.test.tsx criado
apps/store/src/shared/ui/__tests__/InfoTip.declaracao.test.tsx criado

## Verificação

- Conferência de tipos (`CLAUDE.md` §Comandos): `tsc --noEmit -p apps/store/tsconfig.app.json`.
  - O baseline, rodado antes da primeira fatia, deu 0 erros. No fechamento: exit 0, 0 erros, nada mudou contra o baseline.
  - O comando rodou como `./node_modules/.bin/tsc`, porque o `npx tsc` deste worktree imprime "This is not the tsc command you are looking for".
- Um arquivo de teste (`PROJECT.md` §Comandos de verificação): `pnpm --filter @estrelinha/store exec vitest run <arquivo> --testTimeout=20000`.
  - `InfoTip.test.tsx`: 11/11.
  - `InfoTip.declaracao.test.tsx`: 7/7.
  - Guardas das Obrigações, rodados junto (`touchTarget`, `alvoDeToqueNaoRoubaPosicao`, `contrast`, `arbitraryTextColor`, `accentText`, `brandScan`): 8 arquivos, 116 casos, exit 0.
- Verificação mínima (`CLAUDE.md` §Baselines): a suíte do workspace da loja, `pnpm --filter @estrelinha/store test --testTimeout=20000`.
  - 1ª execução: 7486/408 verdes, mas exit 1 por `[vitest-worker]: Timeout calling "onTaskUpdate"`. É contenção de máquina, já registrada no `vitest.config.ts`; a tarefa 01 corria ao mesmo tempo.
  - 2ª execução, com `CI=1` (o limite de 2 workers do próprio config): **7486/408, exit 0**.
- Lint extra: `npx eslint` nos três arquivos novos não acusou nada.

Instruções lidas:
- `CLAUDE.md` › Convenções que valem em todo o repositório, Os guardas — o que trava o quê
- `apps/store/CLAUDE.md` › Design system, Mobile — o que quebra e não grita
- `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local

## Divergências e descobertas

- **Check de mutação que ficou verde (M8), depois corrigido.** Trocar o `fechar()` do `onBlur` por nada deixava os 10 casos verdes. O caso do foco movia o foco para outro botão, e o `onFocusOutside` do Radix já fecha nesse caso, então a asserção estava subsumida. Acrescentei o caso "perder o foco sem que outro elemento o receba também fecha" (o `blur()` vai para o corpo da página, por onde o Radix não passa). Reinjetado, M8 ficou vermelho; restaurado pela cópia, verde.
- **Defeito do teste, não da implementação: o clique fora.** O teste reprovou na primeira escrita porque o Radix só registra o ouvinte de `pointerdown` de fora um tique depois de abrir (`setTimeout(0)`). Corrigi o teste com uma espera de um tique.
- **jsdom 20 não tem `PointerEvent`.** Os testes criam o evento com `createEvent` e gravam o `pointerType` com `defineProperty`.
- **O `motion-reduce:animate-none` sem `!` não desliga a animação de entrada do `PopoverContent`.** O `data-[state=open]:animate-in` é mais específico. Isso vale também para o `InfoVisitas` do painel (o exemplar), que ficou sem conserto porque é fora do escopo.
- **Ficou sem prova automática:** a medida "em 390×844 o balão não passa da largura da gaveta", o visual da entrada (150 ms subindo 4 px) e a vitória de `shadow-estrelinha-ink` sobre o `shadow-md` do primitivo. O `twMerge` lê `shadow-estrelinha-ink` como cor de sombra e mantém as duas classes. As três medidas são do navegador, na Validation.
- **Citações conferidas: 4, nenhuma deslocada ou morta.** São elas: `StoreMovement.tsx` › `InfoVisitas` (linha 49), `infoGutter.test.tsx`, `touchTarget.ts` › `TAP_44` e `packages/ui/src/popover.tsx`.
- Não usei o componente em nenhuma tela, não toquei em `packages/ui` nem nos arquivos da tarefa 01, e não houve propagação para outras tarefas.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 02
Caso: fechou com divergência
Instruções lidas: CLAUDE.md › Convenções que valem em todo o repositório, Os guardas — o que trava o quê; apps/store/CLAUDE.md › Design system, Mobile — o que quebra e não grita; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - mouse abre/fecha ao sair, dedo por cima não abre, toque alterna, clique do mouse mantém aberto — apps/store/src/shared/ui/__tests__/InfoTip.test.tsx
  - Esc fecha, clique fora fecha, foco abre, perda de foco fecha (para outro controle e para o corpo) — InfoTip.test.tsx
  - rótulo acessível, aria-expanded acompanha, role="tooltip" e conteúdo (texto e nó) — InfoTip.test.tsx
  - TAP_44 por token exato e sem absolute, collisionPadding 16, largura w-[min(18rem,calc(100vw-32px))], collisionBoundary repassado, tokens de cor, par motion-reduce: — apps/store/src/shared/ui/__tests__/InfoTip.declaracao.test.tsx
  - sem cobertura: a largura em 390×844 dentro da gaveta e o visual da entrada (navegador, na Validation sobre a gaveta da tarefa 09)
Verificações: tsc da loja 0 erros (baseline 0); os 2 arquivos novos 11/11 e 7/7; guardas touchTarget, alvoDeToqueNaoRoubaPosicao, contrast, arbitraryTextColor, accentText e brandScan verdes; suíte da loja 7486/408 exit 0 (a 1ª execução saiu com exit 1 só pelo "Timeout calling onTaskUpdate", de contenção; remedida com CI=1); 8 mutantes, todos mortos por asserção depois do caso novo de perda de foco
Árvore de trabalho: criados apps/store/src/shared/ui/InfoTip.tsx, apps/store/src/shared/ui/__tests__/InfoTip.test.tsx, apps/store/src/shared/ui/__tests__/InfoTip.declaracao.test.tsx; nada commitado
Citações conferidas: 4 abertas (StoreMovement.tsx › InfoVisitas, infoGutter.test.tsx, touchTarget.ts › TAP_44, packages/ui/src/popover.tsx); nenhuma deslocada nem morta
```

## T02 — wi-impl-review · done · agente aebb0f49ecbf4eee5

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/02-info-tip-da-loja.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o ⓘ abre e fecha pelos seis gestos do Design | `InfoTip.tsx:68-104` (passar o mouse abre e sair fecha, o clique do mouse fixa, o toque alterna, o foco abre e a perda dele fecha); Esc e clique fora vêm do Radix (`InfoTip.tsx:52-57`) | sim |
| rótulo acessível, `aria-expanded`, `role="tooltip"` e alvo de 44px provados | `InfoTip.tsx:62-64,110`; `InfoTip.test.tsx:129-153`; `InfoTip.declaracao.test.tsx:40-46` | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | os dois arquivos de teste (ver Testes) | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

- `touchTarget.test.ts` e `alvoDeToqueNaoRoubaPosicao.test.ts` verdes: o botão usa `cn(TAP_44, …)` sem `absolute` nem outra posição (`InfoTip.tsx:63-67`), e o corpo do arquivo contém `TAP_44`, que é o que a varredura de `touchTarget.test.ts:111-115` cobra. Se as suítes passam é coisa que só a execução mostra.
- `contrast.test.ts` e `arbitraryTextColor.test.ts`: as cores são só tokens (`bg-estrelinha-ink`, `text-estrelinha-on-primary`, `shadow-estrelinha-ink`, `ring-estrelinha-primary`, `border-current`). Os únicos `text-[…]` são tamanhos de fonte (`text-[10.5px]`, `text-[12.5px]`), nenhum é cor. Aplicada.
- Sem barril em `shared/ui`: não existe `index.ts` ali, e os testes importam por `../InfoTip`. Aplicada.

## Testes

- Abre com o ponteiro do mouse e fecha ao sair; o toque alterna; o clique do mouse mantém aberto: `InfoTip.test.tsx:57-87`. A asserção morde. O mutante que ignorasse `fixado` no `pointerLeave` reprova o caso da linha 80, o toque que só abrisse reprova a 2ª asserção da linha 72, e a passagem do dedo que abrisse reprova a linha 66.
- Esc fecha, clique fora fecha, foco abre: `InfoTip.test.tsx:89-125`. Morde. O clique fora é provado pelo `pointerdown` de outro elemento, sem foco envolvido, e a perda de foco tem também o caso que só faz `blur()`.
- Rótulo acessível e `aria-expanded` acompanhando o estado; `role="tooltip"` e o conteúdo recebido: `InfoTip.test.tsx:129-153`, sobre o Popover real do Radix. Morde: o papel padrão do Radix é `dialog`, então tirar `role="tooltip"` derruba `getByRole('tooltip')`.
- `TAP_44` em token exato e sem `absolute`; `collisionPadding` 16; a largura limitada em token exato; o par `motion-reduce:`: `InfoTip.declaracao.test.tsx:40-80`. Morde. Os tokens de `TAP_44` são lidos da constante, com âncora de contagem; as props do conteúdo são colhidas por um dublê que as registra; e o sensor da linha 82 prova a régua de token exato.
- Nível: todos são de componente, como o bloco `Testes` declara.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O clique é tratado no `onClick` com `preventDefault`; o tipo do ponteiro vem do `pointerdown` | sim | O Design pede "clique de mouse mantém aberto" e "toque alterna"; D-09 diz "clique/toque alterna", e para o mouse o Design é mais específico | sim |
| 2 | O foco que vem junto de um `pointerdown` não abre o balão | sim | Sem isso o toque abriria e fecharia na mesma sequência. Teclado continua abrindo (`InfoTip.test.tsx:109`) | sim |
| 3 | `preventDefault` em `onOpenAutoFocus` e em `onCloseAutoFocus` | sim | O balão não tem nada focável; nada no arquivo de instruções ou na tarefa contradiz | sim |
| 4 | A perda de foco fecha, inclusive ao clicar dentro do balão | sim | É a letra do Design ("fecha ao perder"). As tarefas 08 e 09 só põem texto no balão (`08-faixa-v2-da-gaveta.md:31-67`) | sim, as tarefas 08 e 09 estão no raio |
| 5 | Classes de entrada com `!` e `motion-reduce:!animate-none` | sim | O primitivo `packages/ui/src/popover.tsx` traz `data-[state=open]:animate-in zoom-in-95 slide-in-from-*` e não pode ser alterado; a sobrescrita pela classe do consumidor é o caminho que resta. `--tw-enter-translate-y:4px` é o "sobe 4px" | sim (o visual só o navegador prova) |
| 6 | `export default` com as props `label`, `children`, `className?` e `collisionBoundary?`, sem barril | sim | `PolicyContact.tsx:62` e `RouteFallback.tsx:17` são `export default`; as props batem com o `Contrato` | sim: a 08 consome por caminho (`08:77`) e a 09 usa `collisionBoundary` (`09:104,150`) |
| 7 | A passagem do mouse vale só sobre o botão; levar o mouse até o balão fecha, salvo se houve clique | sim | O Design diz "fecha ao sair" | sim |

## Não conferido

- Se as suítes passam (as do componente, `touchTarget`, `alvoDeToqueNaoRoubaPosicao`, `contrast`, `arbitraryTextColor`): só a execução mostra.
- O efeito visual das sobrescritas com `!` (os 150 ms, a subida de 4 px, o desligamento com "menos movimento") e a medida de 390×844: são do navegador, na Validation.
- Como o balão em Portal convive com a gaveta modal (o Sheet do Radix) da tarefa 09, por exemplo se tocar no balão conta como "fora" para a gaveta: é comportamento de execução, e a montagem é de outra tarefa.
- Os três arquivos aparecem como `A` (intent-to-add) e foram julgados inteiros, como criados.
- Instruções lidas: `CLAUDE.md` (raiz) › "Convenções que valem em todo o repositório", "Os guardas — o que trava o quê" (do contexto da sessão); `apps/store/CLAUDE.md` › "Design system", "Mobile — o que quebra e não grita".

## T04 — wi-impl-task · review · agente a569761903d9ec8df

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/04-pedido-montado-com-regiao.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | `proposalPricing` passa a zerar o frete por `freeShippingState(config, base, destinationCep).granted` (antes era `.reached`); a base (subtotal − cupom − avulso) não mudou (RN-19) | Manter `reached` e checar a região à parte | `granted` é o campo que o dono da regra (T01) define para "zera o frete"; com as cinco regiões `granted === reached`, então quem não manda CEP fica igual | `packages/core/src/proposals/pricing.ts`; os três chamadores (página do link, `create-order`, `create-payment`). `order-proposals` e `ProposalSummary` passam `freeShipping: null` e não mudam |
| 2 | Nas duas functions a config sai de `shipping ? freeShippingConfigOf(shipping) : null` (D-03) | Chamar `freeShippingConfigOf(shipping)` sempre, mesmo sem linha | Sem linha, os dois dão o mesmo resultado (desligado). Manter o `null` deixa a forma de antes, e o diff fica menor | `checkout/proposal.ts`, `mercado-pago/handlers.ts` |
| 3 | `create-order` normaliza o CEP do corpo uma vez (`const cep`) e usa o mesmo valor em `destinationCep` e em `p_order.address_zip` | Normalizar duas vezes | Assim o CEP que decide o frete é sempre o que fica gravado. O `create-payment` lê depois esse `order.address_zip` | `checkout/proposal.ts` |
| 4 | `create-payment` usa `order.address_zip` (o pedido é lido com `select("*")`) como `destinationCep` | Reler o endereço da proposta | O pedido guarda o endereço que a cliente editou no link e que o `create-order` usou. É isso que torna os dois totais iguais (CA-21) | `mercado-pago/handlers.ts` › `lockedProposalCharge` |
| 5 | A página passa `address?.cep ?? null` do rascunho do pedido montado | — | É o que o Contrato pede, e `regionOfCep` aceita CEP com máscara | `ProposalCheckoutPage.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `proposalPricing` com Sul + Sudeste e faixa alcançada: CEP da BA cobra, CEP de SP zera, sem CEP cobra; com as cinco regiões, sem CEP zera | unidade (core) | packages/core/src/proposals/__tests__/pricing.test.ts › "frete grátis só para algumas regiões: o CEP do endereço decide" (4 casos) | sim | — |
| 2 | `create-order` do pedido montado: CEP da BA grava o frete cotado (20, total 250); CEP de SP grava 0; linha sem `free_shipping_regions` concede como antes, mesmo para a BA | functions (handler com dublê) | supabase/functions/checkout/__tests__/proposal.test.ts › "frete grátis só para Sul + Sudeste: o CEP do endereço decide no servidor" (3 casos) | sim | — |
| 3 | `create-payment` do pedido montado cobra 58,50 para a BA, o mesmo total que o `create-order` gravou (CA-21); SP 40,00; sem regiões, BA 40,00 como antes | functions (handler com dublê) | supabase/functions/mercado-pago/__tests__/proposalCharge.test.ts › "frete grátis só para Sul + Sudeste: o CEP do pedido decide no servidor" (3 casos) | sim | — |
| 4 | `ProposalCheckoutPage` passa o CEP do endereço: com a faixa alcançada e Sul + Sudeste, o total vai de R$ 237,50 (SP) para R$ 272,50 ao trocar o endereço para a BA | unidade (store) | apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx › "faixa alcançada com o frete grátis só no Sul + Sudeste: o CEP do endereço decide o total" | sim | — |

As quatro fatias passaram pelo vermelho antes da implementação: os casos BA e "sem CEP" no core, o caso BA nas duas functions e o caso SP na página.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

packages/core/src/proposals/pricing.ts alterado
packages/core/src/proposals/__tests__/pricing.test.ts alterado
supabase/functions/checkout/proposal.ts alterado
supabase/functions/checkout/__tests__/proposal.test.ts alterado
supabase/functions/mercado-pago/handlers.ts alterado
supabase/functions/mercado-pago/__tests__/proposalCharge.test.ts alterado
apps/store/src/pages/ProposalCheckoutPage.tsx alterado
apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx alterado

## Verificação

- Um arquivo de teste por vez, `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (fonte: `PROJECT.md` › Comandos de verificação):
  - core `src/proposals/__tests__/` (7 arquivos, inclui `purity.test.ts`): 113/113, exit 0
  - functions `checkout/__tests__/proposal.test.ts`, `mercado-pago/__tests__/proposalCharge.test.ts` e `_shared/__tests__/wiringResolve.test.ts`: 124/124, exit 0
  - store `pages/__tests__/ProposalCheckoutPage.test.tsx`: 24/24, exit 0
- Tipos, `npx tsc --noEmit -p …` (fonte: arquivo de instruções, `CLAUDE.md` § Comandos/Baselines):
  - `packages/core/tsconfig.json`: 11 erros, os mesmos 11 herdados da baseline do `CLAUDE.md`. Nenhum é novo nem está em arquivo que toquei.
  - `apps/store/tsconfig.app.json`: 0 erros, igual à baseline.
- Verificação mínima, suíte de cada workspace tocado, exit capturado fora de pipe (fonte: arquivo de instruções, `CLAUDE.md` § Baselines):
  - functions: 1711/49, exit 0
  - core: 6091/253, exit 0
  - store: 7501/408, todos os testes verdes, mas exit 1. A causa é 1 "Unhandled Error: [vitest-worker]: Timeout calling "onTaskUpdate"", que é contenção do worker e não falha de teste (o `CLAUDE.md` registra o mesmo sintoma em 2026-11-09). A tarefa 03 rodava suítes em paralelo na mesma máquina.
- `packages/core/src/payment/**`: sem diff.

Instruções lidas:
- `CLAUDE.md` (raiz, no contexto da sessão) › O "defeito 01", Alias de import, Os guardas, Comandos, Baselines
- `packages/core/CLAUDE.md` › Quando um código pertence, Pureza, Os módulos, Dinheiro, proposals
- `supabase/CLAUDE.md` › Edge functions, `order-proposals` e o pedido que nasce de uma proposta
- `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local

## Divergências e descobertas

- Citação deslocada: a chamada a `proposalPricing` em `supabase/functions/mercado-pago/handlers.ts` estava em `:1438-1459`. A tarefa já avisava que não era `:1368`. As outras citações (`checkout/proposal.ts:397-409`, `pricing.ts:259-291`, `ProposalCheckoutPage.tsx:249-255`, `proposal.test.ts:416`) bateram com folga de poucas linhas.
- `Depende de` conferido: `freeShippingConfigOf` e `freeShippingState(config, subtotal, destinationCep)` com `granted` existem (tarefa 01, commit `8500acb9`).
- No início eu gravava a saída dos testes em `/tmp/wi-impl-saida.txt`, o mesmo arquivo que a tarefa 03 usava em paralelo. Uma leitura minha misturou as duas saídas. Troquei para `/tmp/wi-impl-t04-*` e confirmei os meus resultados de novo.
- A suíte da loja saiu com exit 1 só pelo timeout de RPC do worker (ver Verificação). Nenhum teste reprovou.
- Comportamento que só a execução real prova: as functions não foram servidas contra o Supabase local. A prova é por dublê, como a tarefa manda ("Não faça deploy de function; a prova é por teste com dublê").
- Nada a propagar: nenhuma tarefa seguinte (05–11) cita `proposalPricing`, `ProposalCheckoutPage`, `checkout/proposal.ts` nem `lockedProposalCharge`.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); packages/core/CLAUDE.md › Pureza, Dinheiro, proposals; supabase/CLAUDE.md › Edge functions, order-proposals e o pedido que nasce de uma proposta; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - unidade (core): packages/core/src/proposals/__tests__/pricing.test.ts › "frete grátis só para algumas regiões: o CEP do endereço decide" (BA cobra, SP zera, sem CEP cobra, cinco regiões sem CEP zera)
  - functions create-order: supabase/functions/checkout/__tests__/proposal.test.ts › "frete grátis só para Sul + Sudeste…" (BA grava o frete cotado, SP grava 0, sem free_shipping_regions concede como antes)
  - functions create-payment: supabase/functions/mercado-pago/__tests__/proposalCharge.test.ts › "frete grátis só para Sul + Sudeste…" (BA cobra 58,50 = o total gravado pelo create-order, CA-21; SP 40,00; sem regiões 40,00)
  - unidade (store): apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx › "faixa alcançada com o frete grátis só no Sul + Sudeste: o CEP do endereço decide o total" (237,50 em SP → 272,50 na BA)
  Nada ficou sem cobertura.
Verificações: arquivos de teste tocados verdes (core 113, functions 124 com wiringResolve e purity, store 24); tsc core 11 erros (os herdados da baseline), store 0; suítes functions 1711/49 exit 0, core 6091/253 exit 0, store 7501/408 todos verdes, mas exit 1 por um "Timeout calling onTaskUpdate" do worker (contenção, a tarefa 03 rodava em paralelo); payment/** sem diff
Árvore de trabalho: packages/core/src/proposals/pricing.ts e __tests__/pricing.test.ts; supabase/functions/checkout/proposal.ts e __tests__/proposal.test.ts; supabase/functions/mercado-pago/handlers.ts e __tests__/proposalCharge.test.ts; apps/store/src/pages/ProposalCheckoutPage.tsx e __tests__/ProposalCheckoutPage.test.tsx — nada commitado
Citações conferidas: 7 abertas; deslocou mercado-pago/handlers.ts (a chamada em :1438-1459, a tarefa já avisava); nenhuma morta
```

## T04 — wi-impl-review · done · agente a48649b32662ab76f

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/04-pedido-montado-com-regiao.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o servidor do pedido montado cobra o frete com CEP fora e faixa alcançada, nos dois caminhos (`create-order` e `create-payment`) | `packages/core/src/proposals/pricing.ts:285` (`freeShippingState(..., input.destinationCep).granted`); `supabase/functions/checkout/proposal.ts:401-408` (`destinationCep: cep`, config por `freeShippingConfigOf`); `supabase/functions/mercado-pago/handlers.ts:1453-1455` (`destinationCep` vem de `order.address_zip`) | sim |
| sem `free_shipping_regions` na linha, o comportamento é o de hoje | `freeShippingConfigOf` → `effectiveRegions(undefined)` = as cinco regiões ⇒ `regionLimited` falso ⇒ `granted === reached`; os testes de `proposal.test.ts` e de `proposalCharge.test.ts` cobrem o caso da BA sem regiões, que concede | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | os quatro arquivos de teste de `alterados` (ver Testes) | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

- Imports relativos com `.ts` explícito nas functions: aplicado. `checkout/proposal.ts:32` e `mercado-pago/handlers.ts:51` importam `../../../packages/core/src/shipping/freeShipping.ts`. Não li `wiringResolve` rodando: ele só lê `index.ts`, e nenhum `index.ts` mudou.
- `proposals/__tests__/purity.test.ts` continua verde: `pricing.ts` não ganhou import novo, só usa o `freeShippingState` que já importava (`pricing.ts:26`). Passar mesmo, só a execução prova.
- `packages/core/src/payment/**` intocado: `git diff --stat` não lista nada.

## Testes

- unidade (core), `packages/core/src/proposals/__tests__/pricing.test.ts:286-314`. Com Sul + Sudeste: BA cobra 20 (total 208), SP zera (188), sem CEP (null e ausente) cobra 20. Com as cinco regiões, sem CEP, zera. A asserção morde: com `.reached` no lugar de `.granted`, os casos da BA e do sem CEP reprovam.
- functions `create-order`, `supabase/functions/checkout/__tests__/proposal.test.ts:457-481`. BA grava `shipping_cost` 20 e total 250; SP grava 0 e total 230; sem `free_shipping_regions`, a BA grava 0. Os itens somam 230 contra uma faixa de 200, então a faixa é alcançada. Morde: sem o `destinationCep`, a BA zeraria.
- functions `create-payment` (CA-21), `supabase/functions/mercado-pago/__tests__/proposalCharge.test.ts:264-286`. BA cobra 58,50 e grava `total` [58,5]; o total gravado vem do recálculo (`handlers.ts:1465-1467`), então a asserção mede o que foi calculado. SP cobra 40,00. Sem regiões, a BA cobra 40,00. Os números estão escritos por extenso, como o arquivo já faz. Morde: ignorar o CEP daria 40,00 para a BA.
- unidade (store), `apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx:353-385`. Com SP, o total é R$ 237,50; trocando para um endereço da BA, R$ 272,50, com faixa de 200 e Sul + Sudeste. Morde: sem `destinationCep`, com as regiões limitadas, o caso de SP já daria 272,50.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `.reached` → `.granted`, com a mesma base | sim | `freeShipping.ts:167-170` define `granted` como o "concedido"; a tarefa pede "o frete zerado só com `granted"`; a base em `pricing.ts:284` não mudou (RN-19) | sim. Os chamadores de `proposalPricing` fora de teste são cinco: a página, `create-order`, `create-payment`, mais `order-proposals/handlers.ts:1269` e `ProposalSummary.tsx:58`, e esses dois passam `freeShipping: null`. `proposalParity.test.ts` também passa `null` ou omite o CEP com as cinco regiões |
| 2 | `shipping ? freeShippingConfigOf(shipping) : null` | sim | D-03 da tarefa; sem a linha, `null` e `freeShippingConfigOf(null)` dão os dois "inativo" | sim |
| 3 | o CEP normalizado uma vez e usado no frete e em `address_zip` | sim | `proposal.ts:401,418`: mesma normalização de antes, sem mudar o que é gravado | sim |
| 4 | `create-payment` usa `order.address_zip` | sim | o pedido é lido com `select("*")` (`handlers.ts:361-362`) e repassado a `lockedProposalCharge` (`:486`); é o CEP que o `create-order` gravou | sim |
| 5 | a página passa `address?.cep ?? null` | sim | é o mesmo `address` que vai em `address_zip` no envio (`ProposalCheckoutPage.tsx:370`); `useShippingSettings` traz a linha crua | sim |

## Não conferido

- Se os testes passam, e se `wiringResolve`/`purity` seguem verdes: não rodei teste, como manda esta revisão.
- `packages/core/CLAUDE.md:510` ainda documenta a assinatura de `proposalPricing` sem `destinationCep`. Esse arquivo não está em `alterados` e a tarefa não pede a mudança (atualizar o CLAUDE.md do módulo é coisa do fecho da feature), então não virou achado.
- Mudança de comportamento que vem da tarefa 01, fora do recorte: `freeShippingConfigOf` só aceita `free_shipping_threshold` numérico, enquanto o `Number(...)` de antes também aceitava string. Não conferi a forma gravada no banco.
- Todos os arquivos de `alterados` aparecem como `M` no diff; nenhum ficou sem baseline.
Instruções lidas: `CLAUDE.md` (raiz, no contexto) › "O defeito 01", "Alias de import", "Os guardas — o que trava o quê"; `packages/core/CLAUDE.md` › "Pureza", "Dinheiro", "proposals"; `supabase/CLAUDE.md` › "Edge functions", "order-proposals e o pedido que nasce de uma proposta".

## T03 — wi-impl-task · review · agente a5cbab8ea337c5ac1

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/03-configuracao-das-regioes.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | `DEFAULT_SHIPPING.free_shipping_regions` é uma lista literal em `packages/supabase`, conferida por teste contra `FREE_SHIPPING_REGIONS` de `core` (no `storeSettingsDefaults`) | importar `FREE_SHIPPING_REGIONS` de `core` | `core` já importa de `@estrelinha/supabase/types`, e `home.ts` desse pacote documenta que tipar a partir de `core` cria ciclo entre pacotes. O contrato previa essa saída | `settings.ts`; o guarda reprova se as duas listas divergirem |
| 2 | A ordem da lista, no padrão e na migration, é a de `core` (`sul, sudeste, centro-oeste, nordeste, norte`) | a ordem do literal do Contrato (`norte … sul`) | o guarda D-07 compara a migration com `DEFAULT_SHIPPING` e o padrão com `core` por igualdade. Uma só ordem evita comparar conjuntos, e `effectiveRegions` já normaliza para essa ordem na leitura | a migration da 99 e o guarda. A tarefa 05 desenha as caixas na ordem Norte…Sul, mas isso é só tela |
| 3 | `free_shipping_regions?: string[]` (opcional, `string[]` e não o union dos slugs) | `RegionSlug[]` | mesmo motivo de ciclo de `HomeSection.type`; quem interpreta é `freeShippingConfigOf` | tipo usado pelas tarefas 05..09 |
| 4 | `constants.ts` importa só `effectiveRegions` de `./shipping/region.ts`, e `runtimeFreeShippingConfig()` normaliza as regiões por ela. O `RuntimeSettingsLoader` monta a config por `freeShippingConfigOf(data.shipping)` e repassa os três campos | `runtimeFreeShippingConfig()` devolver `freeShippingConfigOf(...)` | `constants.ts` está no grafo Deno da function `admin-users` (via `admin-users/refusals.ts`). `region.ts` é folha sem import; `freeShipping.ts` traria junto `formatters/price.ts`. Assim o leitor único (D-03) fica na ponte do loader, e o grafo cresce o mínimo | grafo da `admin-users` (+`region.ts`, e o `purity.test.ts` dela segue verde); o caminho não-React |
| 5 | `setRuntimeShippingSettings` guarda as regiões só se vierem como array (copiado). Sem hidratar, valem as cinco; lista vazia fica vazia | tratar `[]` como ausente | RN-15/D-02: lista vazia com o interruptor ligado deixa o frete grátis inativo | cartStore |
| 6 | Prefixo da migration `20261130150000`: maior prefixo no repositório e nos worktrees (`20261130140000`) + um passo | `20261201120000` | D-15 manda apurar o maior e somar. A árvore da feature-100 roda em paralelo e pode escolher o mesmo; não há como checar em tempo real | colisão de `version` em `schema_migrations` no merge com a feature-100: conferir o prefixo antes de mergear |
| 7 | `useFreeShipping(subtotal = 0, cep?: string \| null)`, memoizado por `enabled`, `threshold`, `regiões.join(',')`, `subtotal` e `cep` | memoizar pelo objeto de settings | o contrato pede memo por primitivas | tarefas 06–09 consomem a assinatura |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | guarda da migration: âncora, valor igual a `DEFAULT_SHIPPING` (e o padrão igual a `core`), aditiva, idempotente, só `shipping`, nenhuma outra escrita, sensores com `mutar()` | guarda (store) | `apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts` (12 casos novos) | sim | — |
| 2 | `runtimeFreeShippingConfig` traz as regiões depois de `setRuntimeShippingSettings`; sem o campo, as cinco; lista vazia fica vazia; cópia defensiva | unidade (core) | `packages/core/src/__tests__/runtimeFreeShippingConfig.test.ts` | sim | — |
| 3 | `useFreeShipping` com CEP passa o destino (`inside`/`outside`); sem CEP com regiões limitadas não concede; lista vazia ⇒ inativo; mudar só o CEP muda o estado | unidade (core) | `packages/core/src/hooks/__tests__/useFreeShipping.test.ts` | sim | — |
| 4 | `useFreeShipping` sem CEP com a linha antiga é igual a hoje (as cinco, concede) | unidade (core) | idem, "sem CEP e com a linha antiga…" | sim | vermelho |
| 5 | referência estável entre renders com as mesmas primitivas (com CEP e regiões) | unidade (core) | idem, "a identidade é estável…" | sim | vermelho |
| 6 | `cartStore.shippingCost` com Sul + Sudeste e faixa alcançada cobra (sem CEP não concede) | unidade (store) | `apps/store/src/entities/cart/model/__tests__/cartStore.test.ts` | sim | — |
| 7 | `cartStore.shippingCost` com as cinco e faixa alcançada zera | unidade (store) | idem | sim | vermelho |
| 8 | `RuntimeSettingsLoader` hidrata as regiões junto do interruptor e da faixa | componente (store) | `apps/store/src/app/__tests__/RuntimeSettingsLoader.test.tsx` | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

packages/supabase/src/types/settings.ts — alterado
supabase/migrations/20261130150000_99-frete-gratis-por-regiao.sql — criado
packages/core/src/constants.ts — alterado
packages/core/src/hooks/useFreeShipping.ts — alterado
packages/core/src/hooks/__tests__/useFreeShipping.test.ts — alterado
packages/core/src/__tests__/runtimeFreeShippingConfig.test.ts — criado
apps/store/src/app/RuntimeSettingsLoader.tsx — alterado
apps/store/src/app/__tests__/RuntimeSettingsLoader.test.tsx — criado
apps/store/src/entities/cart/model/cartStore.ts — alterado
apps/store/src/entities/cart/model/__tests__/cartStore.test.ts — alterado
apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts — alterado
.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/05-painel-regioes-do-frete-gratis.md — alterado (propagação)

## Verificação

- Um arquivo de teste por fatia (`PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`. Cada fatia passou pelo vermelho e fechou verde; também rodaram ao lado `freeShippingSingleOwner.test.ts` (verde, sem edição) e `admin-users/__tests__/purity.test.ts` (verde).
- Check de mutação nas três fatias que passaram de primeira. O arquivo foi restaurado da cópia e conferido com `cmp`:
  - hook, regiões forçadas para `['sul']`: o caso "linha antiga" falhou.
  - hook sem `useMemo`: os dois casos de identidade falharam.
  - cartStore com `granted && regionLimited`: o caso das cinco regiões falhou.
- Tipos (`CLAUDE.md` › Comandos, `npx tsc --noEmit -p …`). Sem `baseline` na entrada; comparei com os números de `CLAUDE.md` › Baselines e não há erro novo:
  - store 0 e mobile-adm 0.
  - backoffice 7, todos herdados em `ProposalStateBadge.test.tsx` (TS2304 ×3, TS2593 ×4).
  - `packages/core` 11, os herdados: `carousel` 5, `pickHomeBanners` 1, `pickHomeCollections` 1, `sitemap/urls` 2, `supabase/client.ts` 2.
- Verificação mínima (`CLAUDE.md` › Baselines), suíte por workspace, exit fora de pipe, `--testTimeout=20000` sem o `--`:
  - core: exit 0, 6091/253.
  - store: exit 0, 7502/409.
  - backoffice: exit 0, 5389/307. Rodei porque `DEFAULT_SHIPPING` é lido pelo painel.
  - Os números incluem o trabalho da tarefa 04, que está na mesma árvore.
- Migration só no local (`PROJECT.md` › Ambiente local):
  - `supabase migration up --local` ⇒ `Applying migration 20261130150000_99-frete-gratis-por-regiao.sql… Migrations applied`.
  - `select value->'free_shipping_regions' from store_settings where key = 'shipping'` ⇒ `["sul", "sudeste", "centro-oeste", "nordeste", "norte"]`. Os outros campos de `shipping` ficaram intactos.
- Probe de idempotência, numa transação desfeita (`rollback`):
  - rodar de novo com a chave já presente ⇒ `UPDATE 0`;
  - com `["sul","sudeste"]` gravado antes, duas execuções ⇒ `UPDATE 0` e `UPDATE 0`, e a lista continua `["sul","sudeste"]`;
  - sem a chave antes ⇒ `UPDATE 1` e volta a ter as cinco;
  - nenhuma outra chave ganhou o campo.
- Instruções lidas:
  - `CLAUDE.md` (raiz) › O defeito 01, Os guardas (`storeSettingsDefaults`, `freeShippingSingleOwner`), CI e deploy, Baselines;
  - `supabase/CLAUDE.md` › O deploy é AUTOMÁTICO, Migrations;
  - `packages/core/CLAUDE.md` › Pureza;
  - `apps/store/CLAUDE.md` › Frete grátis — um interruptor e um dono só (feature 37);
  - `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- Contrato × guarda: o literal da migration no Contrato está na ordem `norte … sul`, e a de `core` é `sul … norte`. Segui a ordem de `core` nos dois lados (premissa 2).
- `constants.ts` está no grafo Deno da function `admin-users`. Por isso o import novo é só `region.ts`, a folha (premissa 4). Esse grafo muda sem mexer em `supabase/functions/**`, então o deploy condicionado das functions não percebe a mudança. A function só ganha a folha `region.ts`; o comportamento dela não muda.
- O `RuntimeSettingsLoader.tsx` passou a escrever o token `free_shipping_regions`, a partir da saída de `freeShippingConfigOf`. Pela D-05, a tarefa 05 vai recusar esse token fora do painel. Propagado para ela.
- Propagado:
  - tarefa 05, D-05: nota de que o `RuntimeSettingsLoader.tsx` e o `packages/core/src/constants.ts` contêm o token `free_shipping_regions`;
  - o `RuntimeSettingsLoader.tsx` continua lendo `free_shipping_threshold` literalmente, e o allowlist de dois segue valendo.
- Citações conferidas ao usar, todas no lugar:
  - `20261011120000_63-retirada.sql:36-39` e o cabeçalho;
  - `storeSettingsDefaults.test.ts:494-575` e `campoAditivo:100-110`;
  - `constants.ts:10-32`;
  - `cartStore.ts:274-283`, que estava em ~275-283 (deslocamento desprezível).
- Ordem de publicação: migration → functions (`checkout`, `mercado-pago`, da tarefa 04) → bundles. A migration não pode subir para a `master` sem pedido explícito: o push a aplica no hospedado.
- Risco de prefixo da migration com a feature-100 em paralelo (premissa 6).

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O defeito 01, Os guardas, CI e deploy, Baselines; supabase/CLAUDE.md › O deploy é AUTOMÁTICO, Migrations; packages/core/CLAUDE.md › Pureza; apps/store/CLAUDE.md › Frete grátis — um interruptor e um dono só (feature 37); .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: guarda da migration e do padrão contra core — apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts (12 casos); runtimeFreeShippingConfig com e sem regiões — packages/core/src/__tests__/runtimeFreeShippingConfig.test.ts (5); useFreeShipping com CEP, sem CEP igual a hoje, mudar só o CEP, identidade estável, lista vazia inativa — packages/core/src/hooks/__tests__/useFreeShipping.test.ts (+7); cartStore.shippingCost com as cinco zera e com Sul + Sudeste cobra — apps/store/src/entities/cart/model/__tests__/cartStore.test.ts (+2); a hidratação do loader — apps/store/src/app/__tests__/RuntimeSettingsLoader.test.tsx (1). Nada sem cobertura.
Verificações:
  - teste de cada arquivo verde, com o vermelho visto antes;
  - três checks de mutação, todos vermelhos;
  - tsc: store 0, backoffice 7 e core 11 herdados, mobile-adm 0;
  - suítes: core 6091/253, store 7502/409, backoffice 5389/307, as três com exit 0;
  - migration aplicada no local, o probe deu as cinco, e a segunda execução e a escolha já gravada ficaram intactas (UPDATE 0).
Árvore de trabalho: os 11 arquivos de código e testes de "Arquivos alterados", mais a propagação em tasks/05; nada commitado.
Citações conferidas: 4 abertas ao usar; cartStore.ts:274-283 deslocou ~1 linha; nenhuma morta.
Propagado:
  - tarefa 05, D-05: nota de que RuntimeSettingsLoader.tsx (via freeShippingConfigOf) e packages/core/src/constants.ts contêm o token free_shipping_regions, para a régua nova contar com eles;
  - divergência registrada: a ordem da lista segue core (sul…norte), não o literal norte…sul do Contrato.
```

## T03 — wi-impl-review · done · agente a319818f6d61c839f

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/03-configuracao-das-regioes.md
Veredito: serve

## Achados

| #   | Classe | Gravidade          | Arquivo:linha | O defeito | A exigência que ele contraria                  |
| --- | ------ | ------------------ | ------------- | --------- | ---------------------------------------------- |
| —   | nada   | —                  | —             | —         | —                                              |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o tipo, o padrão e a migration têm `free_shipping_regions` com as cinco | `packages/supabase/src/types/settings.ts`: o campo opcional `free_shipping_regions?: string[]` e `DEFAULT_SHIPPING.free_shipping_regions` com as cinco; `supabase/migrations/20261130150000_99-frete-gratis-por-regiao.sql`: `value \|\| jsonb_build_object('free_shipping_regions', '[…cinco…]'::jsonb)` com `key = 'shipping' AND NOT value ? 'free_shipping_regions'` | sim |
| a migration aplicada no banco local e o probe registrado | não aparece no diff, depende do retorno do implementador | só execução |
| `useFreeShipping` aceita o CEP e, sem ele, devolve o de hoje | `packages/core/src/hooks/useFreeShipping.ts`: `(subtotal = 0, cep?: string \| null)`, a config montada por `freeShippingConfigOf`, `cep ?? null` passado a `freeShippingState`, memo por `enabled`/`threshold`/`regioes`(join)/`subtotal`/`cep` | sim |
| cada comportamento do bloco `Testes` coberto por um teste escrito | ver seção Testes (o probe só a execução prova) | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- `freeShippingSingleOwner.test.ts` sem edição (`git status` limpo nele). O `RuntimeSettingsLoader.tsx` ainda contém o token `free_shipping_threshold` (`frete.free_shipping_threshold`), o que satisfaz o segundo sentido do allowlist. As regiões passam pelo leitor único: `const frete = freeShippingConfigOf(data.shipping)`. O allowlist fechado de dois continua igual. Cumprida.
- `@estrelinha/core/hooks`: o CEP é opcional e o primeiro parâmetro não mudou, então a assinatura continua compatível. Cumprida.
- Ordem de publicação no retorno (migration → functions → bundles): não sai no diff, porque é item do retorno e não do código. Não conferido.

## Testes

- **`useFreeShipping` com CEP passa o destino** (`packages/core/src/hooks/__tests__/useFreeShipping.test.ts`): com Sul+Sudeste, um CEP de Porto Alegre dá `destination 'inside'` e `granted true`; um CEP de Rio Branco dá `outside` com `reached true` e `granted false`. Morde.
- **Sem CEP igual a hoje** (mesmo arquivo): com a linha antiga sem o campo, as cinco regiões, `regionLimited false`, `reached` e `granted` verdadeiros. Também cobre Sul+Sudeste sem CEP, que dá `granted false`. Morde.
- **Mudar só o CEP muda o estado** (mesmo arquivo): `rerender({ cep })` passa de `granted true` para `outside/false`. Morde.
- **A referência é estável com as mesmas primitivas** (mesmo arquivo): `toBe(primeiro)` depois do rerender com o mesmo CEP. Morde.
- **`runtimeFreeShippingConfig` traz as regiões; sem o campo, as cinco** (`packages/core/src/__tests__/runtimeFreeShippingConfig.test.ts`): `vi.resetModules()` em cada caso. Cobre a hidratação com `['sudeste','sul']`, que sai `['sul','sudeste']`, a hidratação sem o campo, que dá as cinco, a lista vazia guardada vazia e a cópia defensiva. Morde.
- **`cartStore.shippingCost`** (`apps/store/src/entities/cart/model/__tests__/cartStore.test.ts`): com as cinco e subtotal 200 o frete é 0. Com Sul+Sudeste o frete é 9.9 e o total 209.9, e esse caso pegaria a volta de `reached` no lugar de `granted`. Morde.
- **Guarda `storeSettingsDefaults`, bloco da migration nova** (`apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts`):
  - âncora: o arquivo é achado e o `UPDATE public.store_settings` aparece sem os comentários;
  - o parser distingue campo ausente de presente;
  - o padrão é igual a `FREE_SHIPPING_REGIONS` e a migration é igual ao padrão;
  - testa que a migration é aditiva e idempotente, e tem o caso de só a chave `shipping`;
  - tem o caso de nenhuma outra escrita;
  - os sensores usam o `mutar()` que lança (`:498-502`). Um deles cobre a forma citada só em comentário.
  - Morde.
- **Extra, fora do bloco** (`apps/store/src/app/__tests__/RuntimeSettingsLoader.test.tsx`): as regiões do banco chegam a `runtimeFreeShippingConfig`. Esse caso reprovaria se o loader deixasse de passar as regiões. Morde.
- **Probe local**: só a execução prova. Ver Não conferido.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | lista literal em `packages/supabase`, conferida por teste contra `core` | sim | é a saída que o próprio Contrato previa, e o teste de `storeSettingsDefaults.test.ts:660` a confere contra `FREE_SHIPPING_REGIONS` | sim |
| 2 | a ordem de `core` (sul…norte) no padrão e na migration, e não a do literal do Contrato | sim | `FREE_SHIPPING_REGIONS` em `region.ts` declara essa ordem como "a ordem fixa"; `effectiveRegions` normaliza para ela; mesmo conjunto do Contrato. A tarefa 05 (linha 75) aceita "na ordem de `FREE_SHIPPING_REGIONS`" | sim; nenhuma tarefa de 04 a 11 depende da ordem norte…sul |
| 3 | `string[]` opcional, não `RegionSlug[]` | sim | `core` já importa de `@estrelinha/supabase/types`, e a interpretação fica em `freeShippingConfigOf` | sim |
| 4 | `constants.ts` importa só `effectiveRegions` de `./shipping/region.ts` (folha, com `.ts`); o loader monta a config por `freeShippingConfigOf` | sim | `region.ts` não importa nada. `admin-users/__tests__/purity.test.ts` só pede extensão `.ts` e uma âncora `arrayContaining`/`>= 4`, e as duas continuam satisfeitas. D-03 é cumprido no loader e no hook | sim (grafo da `admin-users` cresce de um arquivo folha) |
| 5 | as regiões são guardadas só se vierem como array (cópia); lista vazia fica vazia | sim | RN-15 e D-02; testado em `runtimeFreeShippingConfig.test.ts` | sim |
| 6 | prefixo `20261130150000` | sim | o maior prefixo da pasta era `20261130140000`, e não há prefixo repetido. O risco de colisão no merge com a feature-100 está declarado | sim, declarado |
| 7 | `useFreeShipping(subtotal = 0, cep?: string \| null)`, memo por primitivas | sim | o Contrato pede memo por primitivas com as regiões por `join`. As tarefas 06, 08 e 09 consomem `useFreeShipping(subtotal, cep)` com a mesma forma | sim |

## Não conferido

- **Arquivo sem baseline.** `.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/05-painel-regioes-do-frete-gratis.md` aparece como `??` (sem intent-to-add), e não há o que diffar.
  - Pela leitura, a propagação desta tarefa é o parêntese das linhas 50-54. Ele descreve o `RuntimeSettingsLoader` e o `constants.ts` como de fato ficaram.
  - Sem baseline, não há prova de que o implementador não tocou outras afirmações desse arquivo.
- **Probe local da migration.** Aplicação no 54442, `select value->'free_shipping_regions'` com e sem a chave, e a segunda execução. Depende da saída que o implementador registrou no retorno; não rodo nada.
- **Execução.** Os testes passando, o `tsc` e o lint são só execução.
- **Ordem de publicação no retorno.** É item do retorno, não do diff.
- **Diff misturado com outras tarefas.** O diff da árvore traz arquivos de outras tarefas da onda (`proposals`, `checkout/proposal.ts`, `mercado-pago/handlers.ts`, `ProposalCheckoutPage`). Estão fora de `alterados` e não foram julgados.

Instruções lidas:
- `CLAUDE.md` (raiz) › "O defeito 01", "Os guardas — o que trava o quê" (linhas `storeSettingsDefaults`, `freeShippingSingleOwner`), "CI e deploy", "Baselines"
- `supabase/CLAUDE.md` › "O deploy é AUTOMÁTICO", "Migrations"
- `packages/core/CLAUDE.md` › "Pureza — e por que ela é asserida" (e a tabela "Os módulos")
- `apps/store/CLAUDE.md` › "Frete grátis — um interruptor e um dono só (feature 37)"

## T07 — wi-impl-task · review · agente a3f04bb99516af3d1

Tarefa: .specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/07-superficies-que-anunciam.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Na `TrustBar` mantive a base de hoje (`grátis acima de R$ 450`, sem `formatPrice`) e só acrescentei ` · para <região>` | Trocar por `formatPrice` (`R$ 450,00`) | O contrato pede "o texto de hoje com as cinco", e o teste antigo (`grátis acima de R$ 199`) prende esse texto. A regra de usar `formatPrice` vale para o anúncio novo (`AuthOverlay`, `ShippingCalc`) | só `TrustBar.tsx`. A tarefa 11 (paridade) pode querer unificar o formato |
| 2 | `ShippingCalc`: a linha `Frete grátis acima de R$ 450,00 · para Sul e Sudeste` (texto 12px `ink-soft`) fica logo abaixo do título "Calcular frete e prazo", antes do campo de CEP. Aparece com `useFreeShipping().active` e não depende do CEP | Pôr a linha junto do resultado da cotação, ou fazê-la depender do CEP | A decisão da tarefa: "não depende do CEP consultado". Assim as cotações e a retirada ficam como estão | `ShippingCalc.tsx`. Deslocou as linhas do form, citado pela tarefa 09 (já corrigido) |
| 3 | Cada superfície monta o sufixo direto com `regionsLabel(state.regions)` | Criar um helper compartilhado de frase de anúncio | A tarefa manda consumir `regionsLabel`/`useFreeShipping` sem mexer neles, e um helper novo seria uma superfície a mais. Cada uma já monta a própria frase hoje | nenhum fora dos três arquivos |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | TrustBar com Sul+Sudeste diz "· para Sul e Sudeste" | componente | TrustBar.test.tsx › "com Sul e Sudeste, a segunda linha do envio diz a região" | sim | — |
| 2 | TrustBar com as cinco: texto de hoje | componente | TrustBar.test.tsx › "com as cinco regiões, o texto de hoje…" | sim | vermelho |
| 3 | TrustBar desligado: sem anúncio | componente | TrustBar.test.tsx › "desligado, nenhum anúncio…" | sim | não feito em separado (o anúncio desligado não mudou de código) |
| 4 | AuthOverlay com Sul+Sudeste diz a região | componente | AuthOverlay.test.tsx › "com Sul e Sudeste, o item diz a região" | sim | — |
| 5 | AuthOverlay com as cinco: texto de hoje | componente | AuthOverlay.test.tsx › "com as cinco regiões, o texto de hoje" | sim | vermelho |
| 6 | AuthOverlay desligado: sem o item | componente | AuthOverlay.test.tsx › "desligado, nem o item nem a região" | sim | não feito em separado (ramo intocado) |
| 7 | ShippingCalc ativo mostra a linha com faixa e região (e com as cinco, sem região) | componente | ShippingCalc.test.tsx › "ativo com Sul e Sudeste…", "ativo com as cinco regiões…" | sim | — |
| 8 | ShippingCalc com cotação: nenhuma opção sai "Grátis" nem riscada; só a retirada continua "Grátis" | componente | ShippingCalc.test.tsx › "com a cotação de uma peça acima da faixa…", "CEP do RS: só a retirada continua…" | sim | vermelho |
| 9 | ShippingCalc desligado: sem a linha | componente | ShippingCalc.test.tsx › "desligado: sem a linha de frete grátis" | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/widgets/home-sections/ui/TrustBar.tsx alterado
apps/store/src/widgets/home-sections/ui/__tests__/TrustBar.test.tsx alterado
apps/store/src/features/auth/ui/AuthOverlay.tsx alterado
apps/store/src/features/auth/ui/__tests__/AuthOverlay.test.tsx alterado
apps/store/src/features/shipping-calc/ui/ShippingCalc.tsx alterado
apps/store/src/features/shipping-calc/ui/__tests__/ShippingCalc.test.tsx alterado
.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/09-gaveta-previa-de-frete-e-rodape.md alterado (só a citação que deslocou)

## Verificação

- `npx vitest run` dos três arquivos de teste, mais `freeShippingSingleOwner.test.ts` só lido e rodado, sem alteração (forma do comando de um arquivo do PROJECT.md › Comandos de verificação, rodado em `apps/store`): 60/60, exit 0. Antes do código os casos novos de região tinham dado vermelho: 2 em TrustBar/AuthOverlay e 2 em ShippingCalc.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): exit 0, 0 erros. O baseline é 0 e nada mudou.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines, via PROJECT.md): 410 arquivos e 7534 testes passaram, nenhuma falha. O exit foi 1 por um único `[vitest-worker]: Timeout calling "onTaskUpdate"`, que é contenção do worker e não um teste (o CLAUDE.md já registra o mesmo sintoma). As outras tarefas da onda rodavam na mesma árvore ao mesmo tempo.
- Extra, por iniciativa própria: `npx eslint` nos arquivos tocados deu 1 erro, `no-explicit-any` em `ShippingCalc.tsx:78`. Ele já existia (`(q: any)`, antes na linha 69) e só deslocou; não é desta tarefa.
- Instruções lidas: CLAUDE.md (raiz) › "O defeito 01", "Os guardas — o que trava o quê" (vieram no contexto da sessão); apps/store/CLAUDE.md › "Frete grátis — um interruptor e um dono só (feature 37)", "Página do produto" (arquivo grande, lido pelo índice de títulos); .specs/project/PROJECT.md › Comandos de verificação.

## Divergências e descobertas

- Mutação, explicada: as fatias 2, 3, 5, 6, 8 e 9 passaram de primeira porque o comportamento já existia. Fiz o check em 2, 5, 8 e 9 (mutantes nos arquivos reais, restaurados pela cópia e conferidos com `cmp`), e todos deram vermelho. Nas fatias 3 e 6 (desligado na TrustBar e no AuthOverlay) o ramo de código não mudou e os testes antigos já o prendem, então não rodei mutação separada.
- A citação `ShippingCalc.tsx:91-120` da tarefa 09 deslocou com a linha nova. Propagado: virou `:106-135`.
- As linhas citadas `TrustBar.tsx:27, 48-50` e `AuthOverlay.tsx:49-52` conferiram (o AuthOverlay deslocou 1 linha: `:49-52` contra `:50-52` na tarefa, irrelevante).
- O guarda `freeShippingSingleOwner` segue verde com o uso novo de `useFreeShipping` no `ShippingCalc`.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 07
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O defeito 01, Os guardas; apps/store/CLAUDE.md › Frete grátis (feature 37), Página do produto; .specs/project/PROJECT.md › Comandos de verificação
Testes escritos: TrustBar.test.tsx (Sul+Sudeste com região; cinco = texto de hoje; desligado sem anúncio); AuthOverlay.test.tsx (os mesmos três); ShippingCalc.test.tsx (ativo com faixa e região; cinco sem região; cotação sem "Grátis" nem riscado; CEP RS só a retirada "Grátis"; desligado sem a linha). Nada sem cobertura.
Verificações: testes dos três arquivos mais o guarda freeShippingSingleOwner 60/60; tsc da loja 0 erros; suíte da loja 7534/7534 (exit 1 por um único timeout de RPC do worker, contenção, nenhum teste falhou)
Árvore de trabalho: TrustBar.tsx, AuthOverlay.tsx e ShippingCalc.tsx com os três testes; citação na tarefa 09; nada commitado
Citações conferidas: 4 (TrustBar:27/48-50, AuthOverlay:49-52 com 1 linha deslocada, ShippingCalc, deps regionsLabel/useFreeShipping); nenhuma morta
Propagado: 09 — a citação ShippingCalc.tsx:91-120 virou :106-135 (o form desceu com a linha nova)
```

## T07 — wi-impl-review · done · agente a66cebcd291d1e7a4

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/07-superficies-que-anunciam.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| as três superfícies dizem a região com regiões limitadas e o texto de hoje com as cinco | `TrustBar.tsx` (sufixo ` · para ${regiao}` no `bottom`), `AuthOverlay.tsx` (`BrandPanel`, item de benefício), `ShippingCalc.tsx` (linha nova antes do form). Nos três, `regionsLabel(freteGratis.regions)` devolve `null` com as cinco regiões, e aí não entra sufixo nenhum | sim |
| a página do produto não zera nem risca frete | `ShippingCalc.tsx`: só uma `<p>` de texto. O caminho das cotações e o da retirada ficaram iguais (`granted`/`reached` não são lidos) | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | os três arquivos de teste (detalhe abaixo) | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

- `freeShippingSingleOwner.test.ts`: nenhum valor cravado na copy, porque nos três arquivos o número sai de `freteGratis.threshold`. Nenhum arquivo lê `free_shipping_*` cru: todos passam por `useFreeShipping()`. O `ShippingCalc` vira mais um uso de `useFreeShipping`, então a âncora `toBeGreaterThanOrEqual(7)` (`freeShippingSingleOwner.test.ts:237`) só cresce. Aplicada.
- Tom (RN-17): nenhuma frase nova tem "!" nem "infelizmente". Aplicada.

## Testes

- `TrustBar` (`TrustBar.test.tsx`, describe "a região do frete grátis") cobre três casos: Sul e Sudeste, as cinco regiões, e desligado. A asserção morde. O texto exato é casado com `getByText` e o normalizer identidade. O caso das cinco confere a ausência de `/para Sul/`. O caso desligado confere `para todo o Brasil` e a ausência de `/Sudeste/`.
- `AuthOverlay` (`AuthOverlay.test.tsx`) cobre os mesmos três casos. A asserção morde: casa a frase inteira com `R$ 450,00` e confere a ausência no caso desligado.
- `ShippingCalc` (`ShippingCalc.test.tsx`, describe "o anúncio do frete grátis, com a região"):
  - O caso ativo com Sul e Sudeste roda antes de consultar CEP e prova que a linha não depende do CEP. A asserção morde.
  - O caso das cinco regiões cobre a linha sem a região. A asserção morde.
  - Na cotação com peça de 500 (acima da faixa) e CEP de SP (Sudeste, região elegível), o teste confere `R$ 23,22`/`R$ 41,10` presentes, nenhum "Grátis" e zero `s, del, .line-through`. A asserção morde: um mutante que zerasse ou riscasse o preço derrubaria o caso.
  - No caso de CEP do RS, há exatamente um "Grátis", dentro de "Retirar em", e o domicílio continua `R$ 23,22`. A asserção morde.
  - No caso desligado, a linha não aparece. A asserção morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `TrustBar` mantém a base `grátis acima de R$ ${threshold}`, sem `formatPrice`, e só acrescenta ` · para <região>` | sim | A tarefa tem duas leituras. A favor dele, o Contrato da linha `TrustBar` pede "'… · para Sul e Sudeste' com regiões limitadas; o texto de hoje com as cinco", e o teste antigo prende o texto de hoje. Contra, em "Decisões já tomadas" a linha "Formato" fala de `formatPrice`. O que "nunca cravado" exige, o valor vir da config, está cumprido. O Contrato é a exigência mais específica para a superfície, e nada no arquivo de instruções contradiz a escolha | sim. Fica a nota para a tarefa 11, já declarada por ele |
| 2 | Linha 12px `ink-soft` em `ShippingCalc`, entre o título e o form, só com `active` e sem depender do CEP | sim | Bate com a decisão "a linha aparece com o interruptor ligado e a faixa > 0; não depende do CEP consultado". `active` já implica faixa > 0, porque `threshold` é zero quando está inativo (o tipo em `freeShipping.ts:62`) | sim. A citação `ShippingCalc.tsx:106-135` da tarefa 09 (linha 178) aponta de novo para o form deslocado |
| 3 | Cada superfície monta o sufixo direto com `regionsLabel` | sim | O Contrato diz "Consuma; não altere" para `regionsLabel`/`useFreeShipping`, e o exemplar `TrustBar.tsx:48-50`/`AuthOverlay.tsx:50-52` monta a frase ali mesmo | sim |

## Não conferido

- Não rodei a suíte nem o `freeShippingSingleOwner.test.ts`. Que eles passem só a execução prova.
- Os novos describes de `TrustBar`/`AuthOverlay` mutam `shipping.value` sem restaurar. Hoje eles são os últimos do arquivo. Se isso afeta a ordem de execução, só rodando para saber.
- O layout de 390px da linha nova do `ShippingCalc` e da segunda linha mais longa da `TrustBar` (quebra de linha) não foi conferido. jsdom não mede layout, e essa prova é da Validation/QA.
- Os seis arquivos de `alterados` aparecem como `M` no `git status`, então o baseline existiu. Mesmo assim o diff não separa esta tarefa de mudanças anteriores da corrida nos mesmos arquivos. Não achei nada que esta tarefa não explique.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` › "O defeito 01" e "Os guardas — o que trava o quê" (`freeShippingSingleOwner`), no contexto da sessão; `apps/store/CLAUDE.md` › "Frete grátis — um interruptor e um dono só (feature 37)", com a decisão de 2026-09-11 sobre `ProductTrustBadges`/`ShippingCalc`; e os trechos relevantes de `apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts`.

## T08 — wi-impl-task · review · agente aab9a5f6dd0c39663

Tarefa: .specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/08-faixa-v2-da-gaveta.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A faixa recebe também a prop `cep` (opcional) e tira dela a região do balão "Entrega em …, região Sudeste" com `regionOfCep` | tirar a região da UF de `place`, ou deixar `FreeShippingState` carregar o slug da região | o estado só traz `destination` (dentro, fora ou desconhecido) e não diz qual região. D-10 proíbe que a UF decida a região. E `FreeShippingState`/`freeShippingState` são da tarefa 01 e não se alteram | tarefa 09, que monta a faixa e precisa passar o `cep` (propagado) |
| 2 | `place` tem a forma `{ city, state }`, a mesma de `CepLookupResult`. Sem cidade ou sem UF, o balão diz "na região X" ou "Para este CEP" | uma string já montada "Cidade/UF" | a tarefa 09 passa o resultado de `useCepLookup` direto, sem adaptador | tarefa 09 (propagado) |
| 3 | A frase da regra sai de dentro da faixa: `freeShippingRuleText(freeShippingConfigOf(useShippingSettings()))` | montar uma config a partir do `state` (exigiria escrever a chave `free_shipping_threshold`, que `freeShippingSingleOwner` recusa), ou receber a frase por prop | `freeShippingRuleText` precisa da config e o contrato não a dá. `useFreeShipping` lê a config pelo mesmo caminho, então o `state` e a frase vêm das mesmas settings | quem monta a faixa num teste precisa dublar `useShippingSettings`. A gaveta já faz isso hoje |
| 4 | A barra anima com transição CSS (`transition-[width] duration-[400ms] ease-out motion-reduce:transition-none`) e largura por `style` | o `motion.div` do framer da faixa de hoje | o framer não respeita a classe `motion-reduce:`, e a tarefa pede esse par na barra | nenhum |
| 5 | O ✓ é o `Check` do lucide com `stroke-estrelinha-accent`, dentro de um disco `bg-estrelinha-ink`. O texto da faixa ouro é `text-estrelinha-ink` sólido | `text-estrelinha-accent` no ícone | segue o que a tarefa já decidiu (fica fora da régua de `accentText`). O lucide resolve um ✓ genérico | nenhum |
| 6 | Ordem dos desenhos: inativo ou cupom → nada; CEP fora → linha neutra; `granted` → "liberado"; valor atingido sem `granted` → "para Sul e Sudeste"; senão → "Faltam" com barra | — | segue D-01: o CEP fora vence qualquer valor de sacola | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Abaixo da faixa: "Faltam R$ X para o frete grátis", o valor sobre a faixa, `role="progressbar"` com o valor, sem "liberado" e sem "!" | componente | FreeShippingBand.test.tsx › abaixo da faixa (4 casos) | sim | — |
| 2 | Barra com animação de 400ms e o par `motion-reduce:` | componente | › a largura da barra anima… | sim | vermelho (sem o `motion-reduce:transition-none`) |
| 3 | Valor atingido sem CEP, regiões limitadas: destaque em ouro, "Frete grátis para Sul e Sudeste", sem barra e sem "liberado"; o balão traz a regra mais "Informe o CEP abaixo para confirmar."; o rótulo vem da configuração | componente | › alcançada sem CEP… (3 casos) | sim | — ; e mais um check: vermelho quando a regra sai do balão |
| 4 | Liberada: CEP de SP ("Entrega em São Paulo/SP, região Sudeste…"), sem a busca do CEP ("na região Sul"), e cinco regiões sem CEP (a regra sem falar de região); destaque com `bg-estrelinha-accent` e `text-estrelinha-ink` sem opacidade | componente | › liberada (4 casos) | sim | — |
| 5 | CEP fora (BA), com subtotal abaixo e acima da faixa: linha neutra "Frete grátis só para Sul e Sudeste", sem barra, sem valor, sem "Faltam" e sem "!"; o balão diz "Para Salvador/BA…" ou "Para este CEP…" mais a regra; trocar para um CEP da campanha volta a faixa normal | componente | › CEP fora da campanha (5 casos) | sim | — |
| 6 | Sem faixa com o interruptor desligado | componente | › sem faixa › interruptor | sim (passou de primeira) | vermelho |
| 7 | Sem faixa com cupom de frete grátis: sem CEP, com CEP da campanha e com CEP fora | componente | › sem faixa › cupom (3 casos) | sim (passou de primeira) | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx — criado
apps/store/src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx — criado
.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/09-gaveta-previa-de-frete-e-rodape.md — alterado (propagação: só a linha da faixa no bloco Design)

## Verificação

- Um arquivo de teste (fonte: `PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/store exec vitest run src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx --testTimeout=20000`, rodado em `apps/store`. 21/21 passam, exit 0.
- Guardas (o mesmo comando): `accentText`, `contrast`, `arbitraryTextColor`, `freeShippingSingleOwner`, `touchTarget`, `alvoDeToqueNaoRoubaPosicao` e `brandScan`. 116/116 passam, exit 0.
- Tipos (fonte: `CLAUDE.md` › Comandos): `npx tsc --noEmit -p apps/store/tsconfig.app.json`. 0 erros, baseline 0, nada mudou.
- Lint dos dois arquivos novos: `npx eslint`. 0/0, depois de trocar espaços inseparáveis literais pela escrita ` `.
- Verificação mínima (fonte: `CLAUDE.md` › Baselines, a suíte do workspace): `pnpm --filter @estrelinha/store test --testTimeout=20000`. Exit 1: 7556 passam e 15 reprovam, em 4 arquivos.
  - 14 das reprovações estão em `CheckoutPage.test.tsx`, `blocosDoPedidoMontado.test.tsx` e `ProposalCheckoutPage.test.tsx`, que exercitam o checkout e o `DeliveryBlock` que as tarefas 05/06/07 alteram agora, em paralelo.
  - A 15ª é `marcacaoSoPorAcao.test.ts`, um timeout de 20s por contenção; isolado ele passa 102/102.
  - Nenhum arquivo do repositório importa `FreeShippingBand`: a mudança desta tarefa não alcança essas suítes.

Instruções lidas: CLAUDE.md › Convenções que valem em todo o repositório, Os guardas — o que trava o quê, Comandos, Baselines (o arquivo inteiro estava no contexto); apps/store/CLAUDE.md › Design system, Mobile — o que quebra e não grita, Ícones e marca, Carrinho, chrome e checkout (com A sacola v4), Frete grátis — um interruptor e um dono só (feature 37); .specs/project/PROJECT.md › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- Propagado para a tarefa 09: a linha da faixa no bloco Design agora lista as props de `FreeShippingBand`: `state`, `subtotal`, `cep`, `place` como `{ city, state }`, `freeShippingCoupon` e `collisionBoundary`. A prop `cep` não estava no contrato da 08.
- Contrato divergiu do repositório: o contrato não dava a config que `freeShippingRuleText` exige. A faixa lê `useShippingSettings` por conta própria (decisão 3).
- O matcher padrão de texto da Testing Library colapsa o espaço inseparável que o `Intl` põe no "R$". Os testes usam `getByText` com `normalizer` identidade e comparam o texto cru, como o `tdd` manda para reprojeção.
- O arquivo temporário sugerido (`wi-impl-saida.txt`) é dividido com as tarefas em paralelo. Uma leitura saiu misturada com a saída do `ShippingCalc.test.tsx` de outra tarefa; passei a usar `wi-impl-08*.txt`.
- Uma checagem isolada do `marcacaoSoPorAcao` caiu em segundo plano por falta de timeout. Esperei o resultado em primeiro plano (102/102) antes de fechar.
- Citações conferidas: `CartDrawer.tsx:184-216` (a faixa de hoje, não deslocou), `accentText.test.ts:164-182` (não deslocou), `accentText.test.ts:30` (a régua `ACCENT_TEXT`), `InfoTip.tsx`, `freeShipping.ts`, `region.ts` (`regionsLabel`, `regionOfCep`, `REGION_LABELS`). Nenhuma estava morta.
- `Depende de` conferido: as tarefas 01 (`reached`, `granted`, `destination`, `regions`, `regionsLabel`, `freeShippingRuleText`) e 02 (`InfoTip`) estão no código.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 08
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Convenções que valem em todo o repositório, Os guardas, Comandos, Baselines; apps/store/CLAUDE.md › Design system, Mobile — o que quebra e não grita, Ícones e marca, Carrinho, chrome e checkout, Frete grátis — um interruptor e um dono só (feature 37); .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: apps/store/src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx, 21 casos:
  os quatro desenhos com os textos exatos e os valores da configuração (abaixo da faixa; alcançada sem CEP com regiões limitadas; liberada com CEP de SP, sem a busca do CEP e com as cinco regiões sem CEP; fora com CEP da BA, abaixo e acima da faixa);
  nenhum "liberado" sem CEP com regiões limitadas;
  o balão de cada desenho com a regra da configuração (outra faixa e outras regiões mudam o texto);
  sem faixa com o interruptor desligado e com cupom (sem CEP, com CEP da campanha, com CEP fora);
  a barra com role/valor, sem barra nos desenhos alcançado e fora, o par motion-reduce: e o destaque bg-estrelinha-accent + text-estrelinha-ink sem opacidade;
  a troca de CEP fora → campanha.
  Sem cobertura: o desenho em 390/1440 (jsdom não mede layout; é da Validation).
Verificações: o arquivo de teste 21/21; os guardas accentText, contrast, arbitraryTextColor, freeShippingSingleOwner, touchTarget, alvoDeToqueNaoRoubaPosicao e brandScan 116/116; tsc da loja 0 (baseline 0); eslint dos arquivos novos 0/0; check de mutação em 4 pontos, todos vermelhos. A suíte da loja deu 7556 verdes e 15 vermelhos fora desta tarefa: checkout e DeliveryBlock das tarefas 05/06/07, em curso, e um timeout por contenção que passa isolado.
Árvore de trabalho: criados apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx e __tests__/FreeShippingBand.test.tsx; alterada a linha da faixa em tasks/09-gaveta-previa-de-frete-e-rodape.md. Nada commitado.
Citações conferidas: 6 abertas ao usar; nenhuma deslocou, nenhuma morta
Propagado: tarefa 09: a linha da faixa no bloco Design agora nomeia as props de FreeShippingBand (state, subtotal, cep, place como { city, state }, freeShippingCoupon, collisionBoundary)
```

## T08 — wi-impl-review · fixing · agente a6557b1a1e6edf827

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/08-faixa-v2-da-gaveta.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | comportamento sem teste | atrapalha | apps/store/src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx:188-209 (e 141-153) | O teste de "outra faixa e outras regiões mudam o texto" só existe para o desenho de abaixo da faixa (l.101-109). No desenho alcançado sem CEP, só as regiões variam (l.146-153), a faixa de valor não. No desenho fora da campanha, a configuração nunca varia: o balão e a linha "Frete grátis só para Sul e Sudeste" sempre conferem com a config padrão (`REGRA_SUL_SUDESTE`). Se alguém trocar o `${regra}` do ramo `outside` (FreeShippingBand.tsx:88) ou o `{regioes}` (l.87) por um literal "Sul e Sudeste" / R$ 450,00, os testes continuam passando | Bloco `Testes`: "componente: o balão de cada desenho com o texto da regra montado da configuração (outra faixa e outras regiões mudam o texto)." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| os quatro desenhos e a ausência de faixa provados com os textos exatos | FreeShippingBand.tsx:64, 78-92, 94-105, 109-116, 118-148. Testes: l.75-235 | sim |
| o balão de cada desenho com a regra da configuração | FreeShippingBand.tsx:62, 88, 97, 113, 127. Testes: l.89-109, 141-153, 166-185, 201-209 | em parte: a variação da config não é provada em todo desenho (achado 1) |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | arquivo de teste | em parte (achado 1) |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- `accentText` / `contrast` / `arbitraryTextColor`: só tokens. O texto sobre o ouro é `text-estrelinha-ink` sólido (l.41). O ✓ usa `stroke-estrelinha-accent` sobre `bg-estrelinha-ink` (l.45-47), e nenhum `text-estrelinha-accent` aparece. Os tamanhos arbitrários são de fonte, não de cor. Aplicada.
- `freeShippingSingleOwner`: nenhum valor cravado. A faixa de valor e as regiões vêm do `state` e de `freeShippingRuleText(freeShippingConfigOf(useShippingSettings()))`. Nenhuma chave crua aparece em produção. O teste nomeia `free_shipping_threshold`, mas o guarda exclui `__tests__/`: freeShippingSingleOwner.test.ts:50-51 e 100. Aplicada.
- Tom (RN-17): não há "!" nem "infelizmente" no componente. Os testes cobrem isso nas l.86 e 198. Aplicada.

## Testes

- Os quatro desenhos com os textos exatos e os valores da config: l.76-87, 131-139, 157-164, 176-185, 189-199. As asserções mordem: comparam o texto exato, sem normalizar.
- Nenhum "liberado" sem CEP com regiões limitadas (CA-14, CA-15): l.85 e 138. Morde.
- O balão de cada desenho com a regra montada da config: l.89-109, 141-153, 166-174, 184, 201-209. Mordem pela igualdade exata, mas a variação da config está provada só em parte (achado 1).
- Sem faixa com o interruptor desligado e com o cupom (nos três destinos): l.221-234. A asserção `innerHTML === ''` morde.
- A barra: `role="progressbar"` e `aria-valuenow` em 89, sem barra nos desenhos alcançado e fora (l.137, 163, 197), o par `motion-reduce:` por token exato (l.111-119), e o destaque com `bg-accent` + `text-ink` sem opacidade (l.123-128). Mordem.
- A troca de CEP fora → campanha volta a faixa normal: l.211-217. Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | prop `cep` opcional; a região do balão vem de `regionOfCep` | sim | D-10 ("a UF nunca decide a região"). O estado só expõe `destination`. `regionOfCep` existe em packages/core/src/shipping/region.ts:71 | sim: a tarefa 09, l.150-151, já lista `cep` entre as props |
| 2 | `place` é `{ city, state }`, com o texto de recuo quando falta | sim | `CepLookupResult` tem `city` e `state` (packages/core/src/hooks/useCepLookup.ts:16-20). O recuo segue o Design da tarefa | sim: a tarefa 09, l.151 |
| 3 | a frase da regra é lida dentro da faixa, por `useShippingSettings` | sim | `freeShippingRuleText(config)` exige a config, e o contrato não a passa. É o mesmo caminho que o `useFreeShipping` usa. Nenhuma chave crua em produção | sim: a gaveta já dubla as settings |
| 4 | transição CSS no lugar do framer | sim | a tarefa pede o par `motion-reduce:` na barra | sim |
| 5 | `Check` do lucide com o traço em accent sobre o disco ink, e o texto em ink sólido | sim | Decisões já tomadas (o selo, PR-16) | sim |
| 6 | a ordem: inativo/cupom → fora → granted → reached → faltam | sim | D-01, D-17. Código nas l.64, 78, 94, 109 | sim |

## Não conferido

- `.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/09-gaveta-previa-de-frete-e-rodape.md` está untracked (`??`, o diretório inteiro, sem intent-to-add). Não há baseline. Li só o trecho da propagação (l.149-151, 161, 232), que bate com as premissas 1 e 2. Sem baseline, não consigo provar que o implementador só corrigiu a afirmação propagada e não mexeu em mais nada desse arquivo: isso depende da palavra dele.
- Se os testes passam, e os guardas `accentText`, `contrast`, `touchTarget` e `freeShippingSingleOwner` verdes: só execução.
- Medidas de layout (padding, quebra de linha em 390, alvo de toque do ⓘ, que é do `InfoTip` da tarefa 02): só em navegador.
- `regionsLabel` pode devolver `null` (region.ts:113), o que escreveria "Frete grátis para null". Não verifiquei se, com `state.active`, `state.regions` pode chegar vazio. Por isso não virou achado.

Instruções lidas: /Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md (raiz, injetado no contexto: › Convenções que valem em todo o repositório, › Os guardas — o que trava o quê, incluindo `accentText`, `contrast`, `touchTarget` e `freeShippingSingleOwner`). Não li `apps/store/CLAUDE.md` › Design system, › Carrinho, chrome e checkout, › Frete grátis — um interruptor e um dono só (feature 37), › Mobile — o que quebra e não grita. Para o guarda do frete grátis, conferi a fonte dele: apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts:50-51, 99-100.

## T08 — wi-impl-task · done · agente aab9a5f6dd0c39663

Tarefa: .specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/08-faixa-v2-da-gaveta.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 3 | Valor atingido sem CEP: outra faixa (R$ 300) e outras regiões (Sul e Nordeste) mudam a linha "Frete grátis para Sul e Nordeste" e o balão | componente | FreeShippingBand.test.tsx › alcançada sem CEP… › outra faixa e outras regiões mudam a linha e o balão | sim (passou de primeira) | vermelho: com a linha trocada pelo literal "Sul e Sudeste" |
| 5 | CEP fora: outra faixa (R$ 300) e outra região (Nordeste), com CEP de SP: a linha "Frete grátis só para Nordeste" e o balão "Para São Paulo/SP, o frete é o da cotação. " seguido da regra da configuração | componente | FreeShippingBand.test.tsx › CEP fora da campanha › outra faixa e outras regiões mudam a linha e o balão | sim (passou de primeira) | vermelho nos dois: com `{regioes}` trocado pelo literal "Sul e Sudeste", e com `${regra}` trocado pela regra literal de R$ 450 |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx — criado (implementação; a correção não o alterou)
apps/store/src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx — criado (implementação); alterado na correção (+2 casos)
.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/09-gaveta-previa-de-frete-e-rodape.md — alterado (propagação da implementação)

## Verificação

- Um arquivo de teste (fonte: `PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/store exec vitest run src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx --testTimeout=20000`, rodado em `apps/store`. 23/23, exit 0.
- Check de mutação nos três literais que o achado descreve: os três ficaram vermelhos. O componente foi restaurado da cópia e conferido com `cmp`; a rodada final deu 23/23.
- `npx eslint` no arquivo de teste: 0/0.
- Tipos não foram rodados de novo: a correção só acrescentou casos de teste, sem mudar código de produção.

Instruções lidas: as mesmas da implementação.

## Divergências e descobertas

nada

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 08
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Convenções que valem em todo o repositório, Os guardas, Comandos, Baselines; apps/store/CLAUDE.md › Design system, Mobile — o que quebra e não grita, Ícones e marca, Carrinho, chrome e checkout, Frete grátis — um interruptor e um dono só (feature 37); .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: apps/store/src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx, 23 casos:
  os quatro desenhos com os textos exatos e os valores da configuração (abaixo da faixa; alcançada sem CEP com regiões limitadas; liberada com CEP de SP, sem a busca do CEP e com as cinco regiões sem CEP; fora com CEP da BA, abaixo e acima da faixa);
  nenhum "liberado" sem CEP com regiões limitadas;
  o balão de cada desenho com a regra da configuração, com outra faixa e outras regiões mudando o texto nos desenhos abaixo da faixa, alcançada sem CEP e fora (estes dois acrescentados na correção);
  sem faixa com o interruptor desligado e com cupom (sem CEP, com CEP da campanha, com CEP fora);
  a barra com role e valor, sem barra nos desenhos alcançado e fora, o par motion-reduce: e o destaque bg-estrelinha-accent + text-estrelinha-ink sem opacidade;
  a troca de CEP fora → campanha.
  Sem cobertura: o desenho em 390/1440 (jsdom não mede layout; é da Validation).
Verificações: o arquivo de teste 23/23; os guardas accentText, contrast, arbitraryTextColor, freeShippingSingleOwner, touchTarget, alvoDeToqueNaoRoubaPosicao e brandScan 116/116 (rodados na implementação); tsc da loja 0 (baseline 0); eslint 0/0; check de mutação em 7 pontos, todos vermelhos. A suíte da loja deu 7556 verdes e 15 vermelhos fora desta tarefa: checkout e DeliveryBlock das tarefas 05/06/07, em curso, e um timeout por contenção que passa isolado.
Árvore de trabalho: criados apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx e __tests__/FreeShippingBand.test.tsx; alterada a linha da faixa em tasks/09-gaveta-previa-de-frete-e-rodape.md. Nada commitado.
Citações conferidas: 6 abertas ao usar; nenhuma deslocou, nenhuma morta
Propagado: tarefa 09: a linha da faixa no bloco Design agora nomeia as props de FreeShippingBand (state, subtotal, cep, place como { city, state }, freeShippingCoupon, collisionBoundary)
```

## T06 — wi-impl-task · review · agente aadbde442238ce426

Tarefa: .specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/06-checkout-com-regiao-e-opcoes-compartilhadas.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O `ShippingOptionCard` segue o Design da tarefa: `role="radio"` + `aria-checked`, título "PAC · Correios" (`{serviceName} · {carrier}`), escolhido com borda `ink` e fundo `ground`, rádio com borda `field`, valor em `primary`, transições de 150ms com `motion-reduce:transition-none`. Os testes que buscavam por `button`/`aria-pressed`/"Correios PAC" passaram a buscar por `radio`/`aria-checked`/"PAC · Correios". Só mudou o seletor: nenhuma asserção de comportamento foi tocada | Manter `aria-pressed` e "Correios PAC" no checkout para não mexer em testes | O Design desta tarefa e o da tarefa 09 ("grupo de rádios") pedem o mesmo cartão nas duas telas. Entendi "o checkout é o de hoje" como comportamento, não como marcação | A cara do bloco Entrega no checkout; os seletores em DeliveryBlock.test, CheckoutPage.test (13 linhas), ProposalCheckoutPage.test (2) e blocosDoPedidoMontado.test (2); a tarefa 09, que monta o mesmo cartão |
| 2 | Deixei como estavam o resumo "Frete escolhido" do bloco fechado (uma opção só) e a linha "Frete · Correios PAC" do `OrderSummary` | Trocar também esses dois para "PAC · Correios" | Ficam fora do contrato do cartão; é a menor superfície | Nenhum fora de DeliveryBlock e OrderSummary, mas o nome do serviço fica escrito de dois jeitos na mesma tela |
| 3 | Não criei `radiogroup`: os grupos de hoje ficam como estão (`group` "Envio a domicílio"/"Retirar em", `group` "Forma de envio" no bloco fechado) | Pôr os rádios dentro de `role="radiogroup"` | Trocar o papel do grupo quebraria as consultas `getByRole('group', …)` de hoje. ARIA 1.2 não exige contexto para `radio` | A navegação por leitor de tela. A tarefa 09 decide o grupo dela |
| 4 | Assinatura de `deliveryOptions({ quotes, granted, couponFreeShipping?, selectedId?, fallbackCost?, handlingDays, today })`, que devolve `{ options, cheapestId: string \| null, selected }`. "O fallback é permitido" virou `fallbackCost: number \| null`: com um número e sem cotação, sai o "Frete padrão". `DeliveryOption`, `toShippingDraft` e `DEFAULT_SHIPPING_SERVICE_ID` moram em `lib/deliveryOptions.ts`, e o `DeliveryBlock` reexporta a constante | Um booleano `allowFallback` mais o custo separado | Um campo só, e quem chama decide o "falhou". Na gaveta, sem fallback, basta não passar o campo | Tarefa 09 (consome essa assinatura) |
| 5 | A ressincronização da escolhida (D-13) troca **só o custo** no rascunho (`setShipping({...atual, cost})`). Não mexe em serviço nem datas, não suja o bloco e não vale para a retirada | Regravar o rascunho inteiro da opção | A primeira versão, que regravava também as datas, reprovou um caso do CheckoutPage: as datas do rascunho mudavam sozinhas. D-13 fala só do custo | Bloco Entrega e o Total do resumo. A gaveta (tarefa 09) segue a própria D-13 ("a opção sumiu ⇒ volta à mais barata"), que aqui não implementei: a escolha que some fica como está |
| 6 | `cepOrigin` zera quando `setAddress` recebe um CEP com **dígitos diferentes** dos atuais. Preencher o resto do endereço, ou repetir o mesmo CEP com outra máscara, não zera. Quem grava da gaveta chama `setAddress({cep})` e só **depois** `setCepOrigin('sacola')` | Uma ação separada "digitado no checkout" | O store não sabe quem chamou; a ordem das chamadas basta, e é a ordem que o contrato da tarefa 09 já descreve | Tarefas 09 e 10 (a ordem das chamadas importa) |
| 7 | A faixa do `OrderSummary`: some inteira com o interruptor desligado **ou** com cupom de frete grátis. CEP fora das regiões ⇒ "Frete grátis só para {regiões}" em `ink-soft`, sem "faltam", com qualquer subtotal. Abaixo da faixa ⇒ "Faltam R$ X…". `granted` ⇒ "Frete grátis liberado". Alcançada sem destino conhecido com regiões limitadas ⇒ "Frete grátis para {regiões}" (mesmo ✓ e cor de hoje). O rótulo vem de `regionsLabel`. O sufixo " · frete grátis" da barra do celular passou a seguir `granted`. Não pus ⓘ no resumo | Esconder só o desenho de região quando há cupom; pôr o ⓘ | Imita os desenhos da faixa da gaveta (tarefa 08: "cupom ⇒ a faixa some"). O ⓘ do resumo não está pedido nesta tarefa | Só OrderSummary |
| 8 | `useCheckoutStore` e o tipo `CepOrigin` passaram a sair do barrel `features/checkout/index.ts`, junto com `deliveryOptions` e `ShippingOptionCard` | Deixar a gaveta importar o store por caminho profundo | O contrato da tarefa 09 diz que `useCheckoutStore` vem de `@/features/checkout` | Tarefa 09 |
| 9 | A variante da gaveta se chama `variant="drawer"`: 52px de altura, padding 8px 12px. O padrão é `"checkout"`: 56px, padding 10px 12px | O nome `"gaveta"` | O resto do código usa nomes em inglês nas props (`variant='sidebar' \| 'bar'`) | Tarefa 09 |
| 10 | O `OrderSummary` lê o CEP do `useCheckoutStore` global (`s.address.cep`), como já lê o frete escolhido | Usar `useCheckoutStoreApi` | É a mesma fonte que o componente já usava | Nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `deliveryOptions`: só a mais barata sai `free` com `granted`; nenhuma sem; "Frete padrão" só quando permitido; o custo da escolhida acompanha a cotação nova e o `free` | unidade | apps/store/src/features/checkout/lib/__tests__/deliveryOptions.test.ts (10) | sim | vermelho (o vermelho do ciclo foi o módulo inexistente, então rodei o check também: `granted && mais barata` → `granted` derruba 1; `selected` → primeiro da lista derruba 2) |
| 2 | Bloco Entrega com Sul + Sudeste e faixa alcançada: SP (e RS) ⇒ a mais barata "Grátis" riscada; BA ⇒ nenhuma grátis; cupom ⇒ a BA também fica grátis | componente | DeliveryBlock.test.tsx › "frete grátis por região" | sim | vermelho (passou de primeira; `useFreeShipping(subtotal)` sem o CEP derruba 5) |
| 3 | Trocar SP → BA desfaz a escolha, a mais barata deixa de ser grátis e, escolhida, o frete gravado é 14,90 (o que o Total soma); o custo acompanha a queda do subtotal e a recotação, sem sujar o bloco | componente | DeliveryBlock.test.tsx › "frete grátis por região" (4 casos) | sim | vermelho (sem a ressincronização, caem 3) |
| 4 | `OrderSummary`: liberado com SP; "só para Sul e Sudeste" com BA, acima e abaixo da faixa; "para Sul e Sudeste" sem CEP e acima da faixa; rótulo vindo da configuração; some com cupom de frete grátis; o sufixo da barra segue `granted`; o tom | componente | OrderSummary.test.tsx › "faixa do frete grátis por região" (10) | sim | — |
| 5 | Com as cinco regiões, o checkout é o de hoje | componente | os testes de antes de DeliveryBlock, OrderSummary, CheckoutPage, ProposalCheckoutPage e blocosDoPedidoMontado | sim | — |
| 6 | `cepOrigin` persiste, sai no `reset()`, zera ao digitar outro CEP e não zera com o resto do endereço; fica fora de `draft()`, então `isOrderStale` não muda | unidade | checkoutStore.test.ts › "de onde veio o CEP (cepOrigin)" (5) | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/features/checkout/lib/deliveryOptions.ts criado
apps/store/src/features/checkout/lib/__tests__/deliveryOptions.test.ts criado
apps/store/src/features/checkout/ui/ShippingOptionCard.tsx criado
apps/store/src/features/checkout/index.ts alterado
apps/store/src/features/checkout/ui/DeliveryBlock.tsx alterado
apps/store/src/features/checkout/ui/OrderSummary.tsx alterado
apps/store/src/features/checkout/model/checkoutStore.ts alterado
apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx alterado
apps/store/src/features/checkout/ui/__tests__/OrderSummary.test.tsx alterado
apps/store/src/features/checkout/model/__tests__/checkoutStore.test.ts alterado
apps/store/src/features/checkout/ui/__tests__/blocosDoPedidoMontado.test.tsx alterado
apps/store/src/pages/__tests__/CheckoutPage.test.tsx alterado
apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx alterado

## Verificação

- Um arquivo de teste: `pnpm --filter @estrelinha/store exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md › Comandos de verificação). Por fatia, todos verdes: deliveryOptions 10/10, OrderSummary 63/63, checkoutStore 41/41, DeliveryBlock 79/79.
- Arquivos alterados e vizinhos juntos (o mesmo comando, com CheckoutPage, ProposalCheckoutPage, `src/features/checkout` e os guardas touchTarget, accentText, contrast, fieldBorder, freeShippingSingleOwner, arbitraryTextColor): 35 arquivos, 801/801, exit 0.
- Tipos: `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros, igual ao baseline do store (0). Nenhum erro novo.
- Lint (CLAUDE.md › Baselines, `npx eslint` em apps/store, nos arquivos tocados): exit 0, 0/0.
- Verificação mínima (CLAUDE.md › Baselines: a suíte do workspace tocado, exit fora de pipe): `pnpm --filter @estrelinha/store test --testTimeout=20000`: **7579/7579 testes, 411/411 arquivos**. O exit foi 1 por um único `Unhandled Error: [vitest-worker]: Timeout calling "onTaskUpdate"`. É contenção do worker (outras três tarefas rodam na mesma árvore), não teste reprovado; o CLAUDE.md registra o mesmo sintoma como contenção. Não rodei de novo.
- `packages/core/src/payment/**`: sem diff.
- Instruções lidas: CLAUDE.md › O "defeito 01"; CLAUDE.md › Convenções que valem em todo o repositório; CLAUDE.md › Os guardas — o que trava o quê; CLAUDE.md › Feature-Sliced Design (o conteúdo da raiz que eu tinha em contexto); apps/store/CLAUDE.md › Mobile — o que quebra e não grita; apps/store/CLAUDE.md › Carrinho, chrome e checkout; apps/store/CLAUDE.md › Frete grátis — um interruptor e um dono só (feature 37); apps/store/CLAUDE.md › Retirada no escritório; .specs/project/PROJECT.md › Comandos de verificação e › Ambiente local.

## Divergências e descobertas

- Fatiamento: nas fatias 2 e 3 a implementação do DeliveryBlock entrou antes dos testes, e os testes passaram de primeira. O check de mutação de cada uma deu vermelho (ver `Fatias`).
- Citações cuja linha deslocou, relocalizadas pelo alvo: DeliveryBlock `:208` (o `useFreeShipping`, ~`:203`), `:285-338` (o `options`) e `:396-501` (a lista de opções); OrderSummary `:70`, `:90-105` (a faixa) e `:437` (o sufixo da barra, ~`:436`); checkoutStore, o campo `scope` (`:116`/`:177`/`:239`/`:277`, deslocados poucas linhas). Nenhuma citação morta.
- Testes de antes que reprovaram por esta tarefa e foram ajustados só no seletor (role, aria e texto do cartão): CheckoutPage.test.tsx, ProposalCheckoutPage.test.tsx, blocosDoPedidoMontado.test.tsx e DeliveryBlock.test.tsx. A tarefa permite mexer em CheckoutPage*.test só nesse caso; registro aqui.
- A primeira ressincronização (que regravava também as datas do rascunho) reprovou "grava o CEP com 8 dígitos… snapshot do envio escolhido" no CheckoutPage. Restringi a ressincronização ao custo (decisão 5).
- CA-18, a parte "o Total sobe": no componente, a prova vai até o custo do rascunho (14,90 gravado depois da troca SP → BA). O Total do `OrderSummary` lê esse custo por `useCheckoutTotals`. Não montei a página inteira, para não mexer em CheckoutPage além dos seletores.
- O cartão da variante `drawer` não tem teste próprio: o bloco `Testes` não pede, e o primeiro uso dele é da tarefa 09.
- Unhandled error de contenção do worker na suíte completa (ver `Verificação`).
- Nada de propagação para frente: nenhuma afirmação das tarefas 07–11 ficou falsa.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 06
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Convenções que valem em todo o repositório, Os guardas — o que trava o quê, Feature-Sliced Design; apps/store/CLAUDE.md › Mobile — o que quebra e não grita, Carrinho, chrome e checkout, Frete grátis — um interruptor e um dono só (feature 37), Retirada no escritório; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: deliveryOptions (só a mais barata free com granted; nenhuma sem; fallback só quando permitido; a escolhida acompanha a cotação e o free) — lib/__tests__/deliveryOptions.test.ts; bloco Entrega SP/RS grátis × BA nenhuma, cupom na BA — DeliveryBlock.test.tsx "frete grátis por região"; SP→BA desfaz, deixa de ser grátis, escolhida grava 14,90, e o custo acompanha o subtotal e a recotação sem sujar — idem; OrderSummary liberado/só para/para/some com cupom/sufixo da barra/tom — OrderSummary.test.tsx "faixa do frete grátis por região"; cinco regiões = hoje — os testes de antes, verdes; cepOrigin persiste/reset/zera ao digitar/fora do draft e isOrderStale — checkoutStore.test.ts. Sem cobertura: o "Total sobe" de CA-18 provado só até o custo do rascunho (a página não foi montada); a variante drawer do cartão (primeiro uso na tarefa 09)
Verificações: tsc do store 0 (baseline 0); eslint dos arquivos tocados 0/0; arquivos relacionados e guardas 801/801; suíte do store 7579/7579 testes e 411/411 arquivos, exit 1 por um único Timeout calling "onTaskUpdate" do worker (contenção)
Árvore de trabalho: criados lib/deliveryOptions.ts, lib/__tests__/deliveryOptions.test.ts, ui/ShippingOptionCard.tsx; alterados index.ts, DeliveryBlock.tsx, OrderSummary.tsx, checkoutStore.ts e os testes DeliveryBlock, OrderSummary, checkoutStore, blocosDoPedidoMontado, CheckoutPage, ProposalCheckoutPage (seletores do cartão)
Citações conferidas: 9 abertas; deslocadas e relocalizadas: DeliveryBlock :208/:285-338/:396-501, OrderSummary :70/:90-105/:437, checkoutStore scope; nenhuma morta
```

## T05 — wi-impl-task · review · agente acddb1950936500fd

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/05-painel-regioes-do-frete-gratis.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Na recusa, o aviso usa o motivo de `freeShippingRefusal` como `title`, sem `description`. A asserção existente do FRG-12 passou a ler `chamada.title` com o mesmo regex (`/valor/i` e o negativo de linguagem festiva). Não ficou mais fraca, só lê o campo que a D-08 mudou | `title: motivo` junto com `description: motivo` (a mesma frase duas vezes no aviso), ou um título fixo | D-08 manda o título vir do motivo. Repetir a frase em dois campos seria ruído | `AdminSettingsPage.test.tsx` (FRG-12) |
| 2 | A ordem das caixas é uma constante local `ORDEM_DAS_CAIXAS` (Norte, Nordeste, Centro-Oeste, Sudeste, Sul). A gravação sai de `effectiveRegions`, na ordem fixa de `core`, então Sul + Sudeste grava `['sul','sudeste']` | Derivar a ordem de `[...FREE_SHIPPING_REGIONS].reverse()` ou de `Object.keys(REGION_LABELS)` | A ordem da tela é decisão desta tarefa. Derivá-la de uma ordem de core que existe por outro motivo ficaria implícito e frágil | `ShippingMaterialSection.tsx` |
| 3 | Salvar grava sempre `free_shipping_regions` com a lista lida por `freeShippingConfigOf`. Uma linha antiga, sem o campo, passa a gravar as cinco regiões por escrito | Gravar o `shipping` cru, que manteria o campo ausente | O contrato pede "o upsert com `free_shipping_regions`". Campo ausente e as cinco regiões valem o mesmo para `core` | a linha `store_settings.shipping` gravada pelo painel |
| 4 | O rótulo de cada caixa traz só o nome da região e é o alvo de toque (`flex min-h-11`, `htmlFor` na caixa). Os estados ficam num `span` fora do rótulo, ligado por `aria-describedby`. A ajuda do grupo vai num `fieldset`/`legend` e, com o interruptor desligado, diz "Guardadas. Voltam a valer quando você ligar o frete grátis." | Pôr os estados dentro do `<label>` (molde de `NoticeEmails`) | Com os estados dentro, o nome acessível vira "Norte AC, AP…" e o inventário por `getByLabelText('Norte')` não casa | `ShippingMaterialSection.tsx`, inventário de `AdminSettingsPage.test.tsx` |
| 5 | `ESCOPO` do guarda passou a ser `['apps', 'supabase/functions']`, o que vale também para as réguas antigas (faixa e copy cravada). A régua de `free_shipping_regions` tem allowlist fechada de dois arquivos (o editor e o `RuntimeSettingsLoader`). Na ponte, cada linha com o token tem de ser `free_shipping_regions: frete.free_shipping_regions`, com `frete = freeShippingConfigOf(`. `packages/core` (o dono, onde está `constants.ts`) fica fora desta régua, de propósito | Varrer `packages/core` com uma allowlist das declarações de core | Core é o dono do campo, e listá-lo seria uma allowlist de cemitério | qualquer tarefa seguinte (06–11) que escreva o token cru em `apps/` ou `supabase/functions` vai reprovar no guarda, como deve |
| 6 | A régua das faixas de CEP por região reconhece três formas: (a) slug de região entre aspas junto de um prefixo de 4–5 dígitos na mesma linha; (b) tupla `[ddddd, ddddd`; (c) comparação com limite redondo (`dd000`/`dd999`, com ou sem mais 3 dígitos) numa linha que fala de cep/prefixo/zip. O escopo é `apps`, `supabase/functions` e `packages`, fora `region.ts`. O dono serve de âncora: são ≥10 linhas casadas, as dez faixas | Proibir os números de fronteira lidos do disco, ou qualquer comparação numérica | (a)–(c) dão zero falso positivo no repositório de hoje. A forma (c) só vale com "cep" na linha, para não acusar timeouts de 15000 ms | as tarefas seguintes não podem escrever tabela de faixa de CEP fora de `region.ts` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | As cinco caixas, na ordem e com a ajuda dos estados, vêm marcadas quando a linha não tem o campo; a lista gravada se reflete nelas | página real (painel) | `AdminSettingsPage.test.tsx` › "as cinco caixas aparecem…", "reflete a lista gravada…", e o inventário com as cinco | sim | vermelho (M2: `disabled` removido derrubou 2 casos). O dublê de página não sobe infraestrutura |
| 2 | Desmarcar todas com o interruptor ligado não chama o upsert e o título do aviso é o motivo de `core` (CA-20) | página real (painel) | "CA-20: desmarcar TODAS…" | sim | vermelho (M3: título fixo com o motivo em `description` derrubou o caso). M4 (recusa calculada sobre `shipping` em vez de `gravar`) ficou verde: é mutante equivalente, porque `shipping.free_shipping_regions` já passa por `effectiveRegions` a cada clique |
| 3 | Salvar Sul + Sudeste grava `['sul','sudeste']` junto do resto de `shipping`; remarcar devolve a região; a linha sem o campo grava as cinco | página real (painel) | "CA-20: salvar Sul + Sudeste…", "remarcar…", "a linha sem o campo grava as cinco por escrito" | sim | vermelho (M1: gravar `shipping` em vez de `gravar` derrubou o caso das cinco) |
| 4 | Com o interruptor desligado, as caixas ficam desabilitadas e a lista vazia é gravável; desligar na tela desabilita na hora; rótulo com `htmlFor` e 44px | página real (painel) | "com o interruptor DESLIGADO…", "desligar o interruptor na tela…", "cada caixa tem rótulo…" | sim | vermelho (M2) |
| 5 | As réguas novas de `freeShippingSingleOwner` (regiões e faixas de CEP), com âncora, sensores CRLF/LF/glob e o inverso | guarda (store) | `freeShippingSingleOwner.test.ts` › os dois `describe` novos | sim | vermelho: injetei um arquivo real temporário `supabase/functions/checkout/zzMutante.ts`, com a leitura crua e a tupla, e 2 casos reprovaram nomeando arquivo e linha. Depois apaguei o arquivo |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx alterado
apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx alterado
apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts alterado

## Verificação

- `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminSettingsPage.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação): 104/104, exit 0.
- `pnpm --filter @estrelinha/store exec vitest run src/shared/lib/__tests__/freeShippingSingleOwner.test.ts --testTimeout=20000` (PROJECT.md): 29/29, exit 0.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (CLAUDE.md › Comandos): 7 erros, todos em `ProposalStateBadge.test.tsx` (TS2304 ×3, TS2593 ×4). Batem com a baseline do CLAUDE.md, que registra 7 herdados nesse arquivo: nada novo.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md): 0, igual à baseline.
- `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (CLAUDE.md › Baselines): 5397/5398. A única reprovação foi `AdminOrdersPage.aviso.test.tsx` › "lote de 60" com `Test timed out in 45000ms`, contenção com as tarefas paralelas. Isolado: 29/29, exit 0.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines): 411 arquivos e 7579 testes passaram. O exit 1 veio só de um `Timeout calling "onTaskUpdate"` do worker (contenção, a mesma assinatura registrada no CLAUDE.md), sem nenhum teste reprovado.
- `npx eslint` nos três arquivos tocados: limpo.

Instruções lidas: `CLAUDE.md` (raiz; arquivo grande: o conteúdo inteiro já estava no contexto, incluindo "O defeito 01", "Os guardas — o que trava o quê", "Baselines" e "Comandos") · `apps/backoffice/CLAUDE.md` › "Configurações › quatro seções, não oito abas", "Configurações › Frete — o interruptor do frete grátis" e "Retirada no escritório no painel" · `.specs/project/PROJECT.md` › "Comandos de verificação" e "Ambiente local".

## Divergências e descobertas

- Check de mutação verde (M4): calcular a recusa sobre `shipping` em vez de `gravar` não derruba teste nenhum. É mutante equivalente, porque o estado já guarda a lista normalizada por `effectiveRegions`. Registro para a revisão.
- Citações relocalizadas: `ShippingMaterialSection.tsx:43/:59-66/:62/:85-118/:163-178/:180-183` e `AdminSettingsPage.test.tsx:363-397/:417/:447-512/:743-848/:1175-1280` bateram com o conteúdo nomeado. Os testes de exemplo estavam a algumas linhas de distância (o FRG-12 em ~753-830). A ordem citada como `FREE_SHIPPING_REGIONS` em core é sul, sudeste, centro-oeste, nordeste, norte, e a gravação a segue.
- O escopo do guarda agora inclui `supabase/functions` também para as réguas antigas (`free_shipping_threshold` e copy cravada). Hoje nenhuma function as viola.
- A primeira versão do teste de sucesso usava `expect(toast).not.toHaveBeenCalled()`, o que é defeito do teste: o salvar mostra o toast "Configurações salvas". Troquei por "nenhum toast `destructive`".
- Nada a propagar: as afirmações das tarefas 06–11 sobre `freeShippingSingleOwner` continuam verdadeiras.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 05
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, no contexto: O defeito 01, Os guardas, Baselines, Comandos); apps/backoffice/CLAUDE.md › Configurações › quatro seções; Configurações › Frete — o interruptor; Retirada no escritório no painel; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: AdminSettingsPage.test.tsx — as cinco caixas com a ajuda dos estados e marcadas por padrão (+ o inventário com as cinco); a lista gravada refletida; CA-20 recusa sem upsert com o motivo de core como título; CA-20 Sul + Sudeste grava ['sul','sudeste']; remarcar devolve a região; linha sem o campo grava as cinco; desligado ⇒ caixas desabilitadas e lista vazia gravável; desligar na tela desabilita; rótulo htmlFor e 44px. freeShippingSingleOwner.test.ts — régua de free_shipping_regions (allowlist de dois, os dois sentidos, a forma da ponte, metade positiva no editor e nas duas functions, sensores CRLF/LF/glob e o inverso) e régua das faixas de CEP por região (âncora no dono, três formas, sensores e o inverso). Nada sem cobertura; M4 é mutante equivalente.
Verificações: arquivo do painel 104/104; guarda 29/29; tsc backoffice 7 (= baseline, ProposalStateBadge), store 0; suíte backoffice 5397/5398 (1 timeout de contenção, isolado 29/29); suíte store 7579/7579 (1 erro de worker onTaskUpdate, contenção); eslint limpo.
Árvore de trabalho: apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx; apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx; apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts — nada commitado
Citações conferidas: 12 abertas; os testes de exemplo do FRG-12 estavam a poucas linhas da citação (relocalizados pelo alvo); nenhuma morta
Caducou: nada
```
A divergência: a asserção do FRG-12 passou a ler `title` em vez de `description` (decisão 1, por D-08), e o mutante M4 é equivalente.

## T05 — wi-impl-review · fixing · agente abb314d3db71e5ecb

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/05-painel-regioes-do-frete-gratis.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | identificador de processo | atrapalha | apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx:859, :905, :922 | Os nomes de `describe`/`it` levam UC e critério do Work Item: `(UC-12, CA-20)`, `'CA-20: desmarcar TODAS…'`, `'CA-20: salvar Sul + Sudeste…'` | regra do workflow: identificador de processo não entra no código |
| 2 | identificador de processo | atrapalha | apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx:474, :824 | Os comentários `// WI 99: as cinco regiões do frete grátis.` e `…desde o WI 99 (a recusa pode ser…)` citam a chave do Work Item. O segundo ainda narra a mudança ("desde o WI 99") em vez de explicar a asserção | regra do workflow: identificador de processo não entra no código |
| 3 | identificador de processo | atrapalha | apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts:403, :531 | Os nomes de `describe` citam a regra e as decisões da costura: `(RN-14, D-05)` e `(D-05)` | regra do workflow: identificador de processo não entra no código |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| as cinco caixas no card de Frete, com a ajuda e o padrão | ShippingMaterialSection.tsx: `fieldset` com o `legend` "Regiões com frete grátis", `ORDEM_DAS_CAIXAS` (Norte→Sul), `REGION_STATES` em cada caixa e `regioes` lidas por `freeShippingConfigOf` (campo ausente vale as cinco) | sim |
| a recusa com o motivo de `core`, provada pela ausência do upsert | `salvarFrete`: `freeShippingRefusal(gravar)` → `toast({ title: motivo })` + `return`. O teste CA-20 confere `mutateAsync` sem chamada | sim |
| Sul + Sudeste gravado | `gravar = { ...shipping, free_shipping_regions: [...regioes] }` → `salvar('shipping', gravar)`. O teste confere `['sul','sudeste']` com o resto de `shipping` | sim |
| `freeShippingSingleOwner` com as réguas de região e sensores | freeShippingSingleOwner.test.ts:381-592: allowlist fechada, segundo sentido, ponte, metade positiva, sensores CRLF/LF/glob e o inverso; régua das faixas com âncora no dono, sensor e inverso | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim |
| testes dos arquivos alterados passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- CFG-13: a grade nova é `<ul class="grid gap-2 sm:grid-cols-2">`, sem colunas abaixo de `sm`. O coletor da régua só olha `div`, então a `ul` fica fora da amostra, e mesmo assim cumpre a regra.
- CFG-14: os controles existentes não mudaram. O alvo de 44px da caixa é o `label` (`min-h-11`) e a `li` (`min-h-11`), e o teste novo confere os dois.
- Inventário de campos: aplicado. As cinco regiões entram por extenso em AdminSettingsPage.test.tsx:474-479 e casam por `getByLabelText`, porque o nome acessível é só a região.
- Cada caixa com `Label htmlFor` e alvo de 44px: aplicado. É um `<label htmlFor={id}>` nativo, no molde de `NoticeEmails`.
- `semAbaEmConfiguracoes`: nenhuma "aba" no texto novo. `originZipNotRead`: "Melhor Envio" continua no arquivo (:264, :275).
- Rodar a suíte da loja: só execução.

## Testes

- As cinco caixas, a ajuda dos estados e o padrão marcado (linha sem o campo): AdminSettingsPage.test.tsx, "as cinco caixas aparecem…". Morde: confere a ordem pelos rótulos, `toBeChecked`, e `toHaveAccessibleDescription` com as siglas escritas por extenso.
- Desmarcar todas com o interruptor ligado → sem upsert, e o motivo de core como título: "CA-20: desmarcar TODAS…". Morde: `mutateAsync` sem chamada, `title` igual a `freeShippingRefusal(...)` e `/região/i`.
- Salvar Sul + Sudeste: "CA-20: salvar Sul + Sudeste…". Morde: `['sul','sudeste']` com `default_shipping_cost` e a faixa, e nenhum toast destrutivo. "remarcar uma região" confere a ordem de core (`['sul','norte']`).
- Interruptor desligado → caixas desabilitadas e lista vazia gravável: "com o interruptor DESLIGADO…" e "desligar o interruptor na tela…". Mordem: `toBeDisabled`, e o upsert com `free_shipping_regions: []`.
- Guarda (store): âncoras (os escopos e as dez faixas no dono), sensores com CRLF, LF e o glob, os inversos e a metade positiva. Mordem: os sensores chamam `procurar`/`faixasEm` de verdade.
- Ajuste do FRG-12: a asserção passou a ler `chamada.title` com o mesmo regex, porque o campo mudou. Não ficou mais fraca.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O motivo vai como `title`, sem `description`, e o teste do FRG-12 passa a ler `title` | sim | D-08 ("o título do aviso de recusa vem do motivo de `freeShippingRefusal`") | sim |
| 2 | `ORDEM_DAS_CAIXAS` local, e a gravação na ordem de core | sim | `FREE_SHIPPING_REGIONS` é sul→norte (region.ts:20); a tarefa fixa a ordem Norte→Sul para a tela; o teste aceita a ordem de core | sim |
| 3 | Salvar grava sempre a lista lida por `freeShippingConfigOf` | sim | contrato: "o upsert com `free_shipping_regions`"; `effectiveRegions` trata campo ausente como as cinco (region.ts:96) | sim |
| 4 | Rótulo só com o nome, estados por `aria-describedby`, `fieldset`/`legend` | sim | o inventário usa `getByLabelText(rotulo)` e casa o nome exato; nenhuma linha de apps/backoffice/CLAUD.md contradiz | sim |
| 5 | `ESCOPO = ['apps','supabase/functions']`, allowlist de dois, core fora | sim | D-05 manda varrer `supabase/functions` e contar com o RuntimeSettingsLoader e com core; nenhuma function lê `free_shipping_threshold`; nenhum arquivo de produção fora da allowlist nomeia `free_shipping_regions` hoje (grep); as tarefas 06/08 já esperam "nada lê os campos crus" | sim |
| 6 | A régua das faixas de CEP com três formas, escopo apps/functions/packages, fora region.ts | sim | D-05 ("recusa faixa numérica de CEP por região escrita fora de `region.ts`"); as dez linhas de `FAIXAS` casam a forma (a) | sim |

## Não conferido

- Se as suítes passam (backoffice e store), e se as réguas antigas (FRG-13 e a de `free_shipping_threshold`) com o escopo ampliado a `supabase/functions` seguem verdes: só a execução mostra. O grep não achou `free_shipping_threshold` em produção nas functions.
- A medida de 44px e a ausência de rolagem horizontal em 390: jsdom não mede layout, e isso é da Validation/QA.
- Os três arquivos aparecem como `M` (com baseline) no `git status`. Não houve ponto julgado sem diff.
- Fora de classe, fica só o registro: em ShippingMaterialSection.tsx, o JSDoc do FRG-12 ficou logo acima do JSDoc novo de `regioes`, longe de `salvarFrete`, que é quem ele documenta.

Instruções lidas: /Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md (raiz, já no contexto: "O defeito 01", "Os guardas — o que trava o quê"); apps/backoffice/CLAUDE.md › "Configurações › quatro seções, não oito abas" e "Configurações › Frete — o interruptor do frete grátis".

## T05 — wi-impl-task · done · agente acddb1950936500fd

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/05-painel-regioes-do-frete-gratis.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada

## Fatias

nada. Nenhum comportamento foi reaberto: os três achados só mudam nomes de `describe`/`it` e comentários. Os dois arquivos de teste tocados foram rodados de novo e estão verdes.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx alterado
apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx alterado
apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts alterado

O primeiro veio da implementação; os outros dois foram tocados de novo nesta correção.

## Verificação

- `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminSettingsPage.test.tsx --testTimeout=20000` (comando do PROJECT.md): 104 de 104 passaram, exit 0.
- `pnpm --filter @estrelinha/store exec vitest run src/shared/lib/__tests__/freeShippingSingleOwner.test.ts --testTimeout=20000` (comando do PROJECT.md): 29 de 29 passaram, exit 0.
- `grep` por `UC-`, `CA-nn`, `WI 99`, `RN-14` e `D-nn` nos três arquivos: zero ocorrências escritas por esta tarefa.

## Divergências e descobertas

- Achado 1 aplicado: saiu `(UC-12, CA-20)` do `describe` das regiões e o prefixo `CA-20:` dos dois `it`.
- Achado 2 aplicado: o comentário do inventário ficou "As cinco regiões do frete grátis." O do FRG-12 parou de narrar a mudança e ficou "O motivo de `core` é o título do aviso: a recusa pode ser da faixa ou das regiões, e um título fixo nomearia só uma."
- Achado 3 aplicado: saíram `(RN-14, D-05)` e `(D-05)` dos dois `describe` do guarda.
- O grep ainda acha `AVD-07`/`AVD-08` em `AdminSettingsPage.test.tsx:460` e `:1199`. São da feature 57, anteriores a esta tarefa. Não mexi neles: seria refatoração oportunista, e a regra 6 proíbe.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 05
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, no contexto: O defeito 01, Os guardas, Baselines, Comandos); apps/backoffice/CLAUDE.md › Configurações › quatro seções; Configurações › Frete — o interruptor; Retirada no escritório no painel; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: AdminSettingsPage.test.tsx — as cinco caixas com a ajuda dos estados e marcadas por padrão (+ o inventário com as cinco); a lista gravada refletida; desmarcar todas com o interruptor ligado recusa sem upsert, com o motivo de core como título; Sul + Sudeste grava ['sul','sudeste']; remarcar devolve a região; linha sem o campo grava as cinco; desligado ⇒ caixas desabilitadas e lista vazia gravável; desligar na tela desabilita; rótulo htmlFor e 44px. freeShippingSingleOwner.test.ts — régua de free_shipping_regions (allowlist de dois, os dois sentidos, a forma da ponte, metade positiva no editor e nas duas functions, sensores CRLF/LF/glob e o inverso) e régua das faixas de CEP por região (âncora no dono, três formas, sensores e o inverso). Nada sem cobertura; M4 é mutante equivalente.
Verificações: arquivo do painel 104/104; guarda 29/29 (reconfirmados depois da correção); tsc backoffice 7 (= baseline, ProposalStateBadge), store 0; suíte backoffice 5397/5398 (1 timeout de contenção, isolado 29/29); suíte store 7579/7579 (1 erro de worker onTaskUpdate, contenção); eslint limpo.
Árvore de trabalho: apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx; apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx; apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts — nada commitado
Citações conferidas: 12 abertas; os testes de exemplo do FRG-12 estavam a poucas linhas da citação (relocalizados pelo alvo); nenhuma morta
Caducou: nada
```
A divergência: a asserção do FRG-12 passou a ler `title` em vez de `description` (decisão 1 da implementação, por D-08), e o mutante M4 é equivalente. A correção tirou os identificadores de processo dos nomes de teste e dos comentários.

## T06 — wi-impl-review · done · agente ac849f47b7db04d94

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/06-checkout-com-regiao-e-opcoes-compartilhadas.md
Veredito: serve

## Achados

| #   | Classe | Gravidade          | Arquivo:linha | O defeito | A exigência que ele contraria                  |
| --- | ------ | ------------------ | ------------- | --------- | ---------------------------------------------- |
| —   | nada   | —                  | —             | —         | —                                              |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o bloco Entrega e o resumo seguem `granted` com o CEP do endereço | `DeliveryBlock.tsx:198` (`useFreeShipping(subtotal, address.cep)`) e `granted` passado a `deliveryOptions`; `OrderSummary.tsx:60,75` (`useFreeShipping(cartSubtotal, cep)`), faixa e sufixo da barra lendo `granted`/`destination` | sim |
| CA-18 provado no componente | `DeliveryBlock.test.tsx`, "trocar o CEP de SP para a BA desfaz a escolha…": a escolha vira `null`, PAC deixa de sair "Grátis" e, escolhida de novo, grava `cost: 14.9`. O Total vem de `shipping.cost` (`useCheckoutTotals.ts:213`), então a prova fica no custo gravado, e não no Total desenhado | sim |
| `deliveryOptions`, `ShippingOptionCard` e `cepOrigin` prontos e exportados | `lib/deliveryOptions.ts`, `ui/ShippingOptionCard.tsx`, `checkoutStore.ts` (`cepOrigin`/`setCepOrigin`); `features/checkout/index.ts:13-22` exporta os três, mais `useCheckoutStore` e o tipo `CepOrigin` | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

- `freeShippingSingleOwner`: nenhum dos arquivos alterados lê `free_shipping_threshold` nem `free_shipping_regions` no código de produção. O `OrderSummary` usa `freteGratis.regions` e `regionsLabel`. Os testes mexem em `shippingSettings.free_shipping_regions` só no dublê. Aplicada.
- `touchTarget`/`accentText`/`contrast`/`fieldBorder`, e transições com par `motion-reduce:`: o cartão tem `min-h-[56px]`/`min-h-[52px]` (acima de 44), sem token `accent`, e as duas transições levam `duration-150 motion-reduce:transition-none` (`ShippingOptionCard.tsx:42,50`). Nenhuma transição nova no `OrderSummary`. Aplicada na leitura; se os guardas passam, só a execução diz.
- Tom: "Frete grátis só para {regiões}" e "Frete grátis para {regiões}", sem "!" nem "infelizmente". Há um teste para isso no `OrderSummary.test.tsx`. Aplicada.
- `packages/core/src/payment/**` intocado: nenhum arquivo de `alterados` está ali. Aplicada.

## Testes

- Unidade `deliveryOptions` (`lib/__tests__/deliveryOptions.test.ts`). Só a mais barata sai `free` com `granted`. Nenhuma sai sem `granted`. O fallback aparece só com `fallbackCost`. O `selected` acompanha a cotação nova (24.8 → 31.5) e o `free` (0 ↔ 14.9). Morde: as asserções são de valor exato.
- Componente, Sul + Sudeste com a faixa alcançada (`DeliveryBlock.test.tsx`, "frete grátis por região"). Com SP, PAC sai "Grátis" com "R$ 14,90" `line-through` e o SEDEX não sai grátis. Com o RS, o mesmo. Com a BA, nenhuma sai "Grátis" e o preço não está riscado. Morde, e a asserção é feita dentro de cada cartão (`within(radio)`).
- Componente CA-18: SP → BA desfaz a escolha e o custo passa a 14.9. Morde (ver a ressalva na Cobertura). O mesmo bloco cobre a ressincronização D-13: o subtotal abaixo da faixa leva o custo a 14.9, a cotação nova leva o SEDEX a 31.5, e a ressincronização não suja o bloco. Também cobre o cupom com a BA (as duas opções "Grátis").
- Componente, estados da faixa do `OrderSummary` (`OrderSummary.test.tsx`, "faixa do frete grátis por região"): "liberado" com SP; "só para Sul e Sudeste" com a BA acima e abaixo da faixa, sem "faltam"; "para Sul e Sudeste" sem CEP; "Faltam R$ 50,00" sem CEP abaixo; o rótulo vindo da configuração; a faixa sumindo com o cupom (BA e SP); o sufixo da barra só com `granted`. Morde.
- Componente com as cinco regiões: os testes existentes continuam com `free_shipping_regions` ausente (`afterEach` volta a `undefined`). Só os seletores mudaram, nenhuma asserção de comportamento. Que passam, só a execução diz.
- Unidade `cepOrigin` (`checkoutStore.test.ts`): persiste na `sessionStorage`, zera no `reset()`, zera com outro CEP, fica com o resto do endereço e com o mesmo CEP, e fica fora de `draft()` com `isStale()` falso. Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `role="radio"`/`aria-checked`, título "PAC · Correios", seletores dos testes trocados | sim | O Design da tarefa pede um "botão `role="radio"`" e o título "PAC · Correios". O `Não faça` permite mexer em `CheckoutPage*.test.tsx` quando reprova por esta tarefa, e o diff deles é só de seletor | sim |
| 2 | "Frete escolhido" (bloco fechado) e "Frete · Correios PAC" do `OrderSummary` ficam como estão | sim | O contrato cobre só o cartão. RN-02 fala de paridade gaveta × Entrega, não do resumo. O `ProposalCheckoutPage.test` continua lendo `/Frete · Correios PAC/` | sim |
| 3 | Sem `radiogroup`; os `group` de hoje ficam | sim | Nada na tarefa exige `radiogroup`. A tarefa 09 decide o grupo dela ("Grupo de rádios 'Forma de envio'", 09:133) | sim |
| 4 | Assinatura com `fallbackCost: number \| null` e saída `{ options, cheapestId, selected }` | sim | Cobre todas as entradas e saídas do Contrato. O bloco Entrega passa `default_shipping_cost` só com `quoteFailed` | sim (tarefa 09) |
| 5 | A ressincronização troca só o custo; a escolha que some fica | sim | spec.md D-13: "a opção sumiu ⇒ volta à mais barata na gaveta, e no checkout desfaz como hoje". Hoje o checkout não fazia nada com a escolha que some, e a troca de CEP continua desfazendo pelo efeito `lastCep` (`DeliveryBlock.tsx:259-271`, que roda antes) | sim |
| 6 | `cepOrigin` zera só quando os dígitos do CEP mudam | sim | D-14 e Contrato: "zerado… quando o CEP é digitado no checkout". A ordem `setAddress` → `setCepOrigin('sacola')` bate com o contrato da 09 (09:157). A semeadura do endereço salvo só roda com o CEP vazio (`DeliveryBlock.tsx:233`) | sim (09, 10) |
| 7 | A faixa do resumo: some com o interruptor desligado ou com cupom; fora ⇒ só a linha neutra; os outros três desenhos | sim | Bate com "Decisões já tomadas" e RN-18. `regionsLabel` devolve `null` com as cinco regiões, e aí `reached && !granted` é impossível (`freeShipping.ts`: `granted` = `reached && (inside \|\| !regionLimited)`) | sim |
| 8 | `useCheckoutStore`/`CepOrigin` no barrel | sim | Tarefa 09:160: "`useCheckoutStore`, `cepOrigin` (`@/features/checkout`)" | sim |
| 9 | `variant="drawer"` com 52px e padding 8px 12px; o padrão `"checkout"` com 56px e padding 10px 12px | sim | O Design dá as medidas; a tarefa 09 só diz "variante gaveta" | sim |
| 10 | O `OrderSummary` lê o CEP do store global | sim | O componente já lia `shipping`/`contact` do mesmo store, e `useCheckoutTotals` também | sim |

## Não conferido

- Que os testes passem e que os guardas (`touchTarget`, `contrast`, `accentText`, `freeShippingSingleOwner`) fiquem verdes: só a execução diz. Não rodei nada.
- Layout em 390 e 1440 (a linha do escritório quebrando, a altura de 56px): jsdom não mede, e isso fica para a Validation/QA.
- Os arquivos `alterados` criados aparecem no diff como `A` (intent-to-add). Comparei os modificados com o HEAD do worktree. O HEAD já pode conter trabalho de ondas anteriores; não achei mudança que esta tarefa não explique.
- Instruções lidas: `CLAUDE.md` (raiz, carregado no contexto) › "O defeito 01", "Convenções que valem em todo o repositório", "Os guardas — o que trava o quê", "Feature-Sliced Design"; `apps/store/CLAUDE.md` › "Mobile — o que quebra e não grita", "Carrinho, chrome e checkout", "Frete grátis — um interruptor e um dono só (feature 37)", "Retirada no escritório (feature 63, AD-049)".

## T09 — wi-impl-task · review · agente ac4c7f66be3189983

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/09-gaveta-previa-de-frete-e-rodape.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A lógica do frete da gaveta virou o hook `useCartShipping`, num arquivo novo (`widgets/cart-drawer/model/useCartShipping.ts`). `CartShipping.tsx` só desenha, e também tem o `PickupSource` interno | Tudo dentro de `CartShipping.tsx`, como o Contrato lista | Com hook e constantes no mesmo arquivo do componente, o eslint dava um warning novo (`react-refresh/only-export-components`) e o lint da loja passaria de 2/2. O Total precisa do custo do frete, e o componente não tem como devolvê-lo ao `CartDrawer` | o slice `widgets/cart-drawer`; nenhuma tarefa seguinte cita o arquivo |
| 2 | A sacola com peças virou o componente interno `FilledCart` em `CartDrawer.tsx`. A faixa, a lista e o rodapé moram nele, e ele só existe com a gaveta aberta. A cotação, a busca do CEP, `useCartPromotion` e `useAllProducts` passaram para dentro dele | Chamar as consultas no `CartDrawer`, que fica montado em toda rota | Sem isso, toda página com CEP no rascunho cotaria frete sem a gaveta aberta | `CartDrawer.tsx`; os arnês de teste que montam a gaveta precisam de `QueryClientProvider` |
| 3 | Com um CEP completo já no rascunho, a gaveta abre direto no resultado: cota, e a lista vem recolhida se já houver escolha. Sem CEP, abre no campo, preenchido com o que houver no rascunho | Abrir sempre no campo | Cumpre D-19 e UC-05 ("o CEP continua guardado para a próxima peça") sem a cliente ter de recalcular | tarefa 10: o checkout recebe o mesmo rascunho |
| 4 | Sem escolha válida e com o resultado na tela, a gaveta marca a opção mais barata, mesmo quando o CEP veio do checkout. A retirada nunca é marcada. Se a escolha some da cotação nova, volta a mais barata | Marcar só logo depois de "Calcular" | D-11 e D-13 numa regra só, sem estado extra | quem abre a gaveta de dentro do checkout com 2+ opções e nenhuma escolhida passa a ter a mais barata gravada no rascunho |
| 5 | Falha da cotação ou cotação vazia apaga a escolha do rascunho (`setShipping(null)`), menos a retirada | Manter a escolha antiga | Senão o checkout herdaria um custo velho que a cotação não confirma | DeliveryBlock / tarefa 10 |
| 6 | "Trocar CEP" desfaz a escolha e volta ao campo preenchido com o CEP atual. A faixa volta ao estado sem CEP | Campo vazio | Mais fácil de corrigir um dígito; o CEP continua no rascunho, como a tarefa pede | só a gaveta |
| 7 | O `CouponInput` recebe o custo da opção escolhida. Sem escolha, recebe o valor de antes (`granted ? 0 : default_shipping_cost`, agora pelo `granted`) | Mandar 0 sem escolha | RN-08, sem mudar o caso sem CEP | só a gaveta |
| 8 | Durante a recotação, com a lista recolhida, a linha recolhida mostra o rascunho até a cotação nova chegar. Com a lista aberta, aparecem as vagas de esqueleto | Esqueleto sempre | Evita o salto da linha a cada clique em +/− | só a gaveta |
| 9 | O texto do prazo a partir das datas do rascunho (`draftEstimateLabel`) foi copiado do `DeliveryBlock` para `CartShipping.tsx` | Exportá-lo de `features/checkout` | A tarefa proíbe alterar `DeliveryBlock.tsx` | dívida: duas cópias da mesma função de formatação. Candidata a subir para `deliveryOptions` numa tarefa futura |
| 10 | A gaveta lê e grava o `useCheckoutStore` importado direto, nunca pelo `useCheckoutStoreApi` | Usar o provider | Garante o CA-12 por construção, mesmo que a gaveta um dia fique dentro do provider do pedido montado | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `useCartPromotion(shipping)` soma o frete; sem argumento, é o de hoje; o cupom de frete grátis zera o frete | unidade | `src/entities/cart/model/__tests__/useCartPromotion.test.ts` (4 casos novos) | sim | 2 casos passaram pelo vermelho (`—`); os 2 que passaram de primeira: `vermelho` (cupom → `null`; default → 5) |
| 2 | Com peças, o campo e "Calcular"; vazia, nada (CA-01) | componente | `src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx` | sim | vermelho (mutações M1–M13, ver Divergências) |
| 3 | CEP incompleto ⇒ "CEP inválido", nenhuma chamada à cotação (CA-02) | componente | idem | sim | vermelho (M9) |
| 4 | Calculando: indicador no botão, botão desligado, duas vagas de esqueleto | componente | idem | sim | vermelho (M1 derruba a cadeia) |
| 5 | As opções do `deliveryOptions`, a mais barata marcada, Total com o frete; a segunda leitura no checkout não chama o Melhor Envio de novo (CA-03, CA-04) | componente | idem | sim | vermelho (M1, M5) |
| 6 | Tocar recolhe numa linha; tocar na linha reabre (CA-05) | componente | idem | sim | vermelho (M2) |
| 7 | Faixa alcançada em SP; interruptor desligado; cupom de frete grátis com CEP da BA (CA-06, CA-16, CA-25) | componente | idem | sim | vermelho (M3) |
| 8 | CEP da BA: frete da cotação no Total, sem `CrossSell`, catálogo não buscado (CA-17, CA-26) | componente | idem | sim | vermelho (M4) |
| 9 | CEP do RS: os dois grupos, retirada nunca marcada, "Retirada no escritório · Grátis" (CA-07) | componente | idem | sim | vermelho (M13) |
| 10 | Nenhuma nota abaixo do Total (M-06, CA-08 mudado) | componente | idem + `CartDrawer.test.tsx` (caso invertido) | sim | vermelho (M7) |
| 11 | Mudar a quantidade recota com o mesmo CEP e mantém a opção, com o preço novo; a opção que sumiu volta à mais barata (CA-10) | componente | idem | sim | vermelho (M11) |
| 12 | Falha: a mensagem com "Tentar de novo", Total sem frete, "Finalizar Pedido" funcionando, sem "Frete padrão"; sem opção, a mensagem (CA-11) | componente | idem | sim | vermelho (M12) |
| 13 | Grava no `useCheckoutStore` padrão (CEP, escolha, `cepOrigin`), nunca no `useProposalCheckoutStore` (CA-12) | componente | idem | sim | vermelho (M6) |
| 14 | Classes: cupom recolhido de 44px, botão de 48px, rodapé com `max-h-[72%]` e rolagem, `collisionBoundary` do balão no painel, alvos de 44px, transições com par `motion-reduce:` | componente | idem | sim | vermelho (M8, M10) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/widgets/cart-drawer/model/useCartShipping.ts criado
apps/store/src/widgets/cart-drawer/ui/CartShipping.tsx criado
apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx criado
apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx alterado
apps/store/src/entities/cart/model/useCartPromotion.ts alterado
apps/store/src/entities/cart/model/__tests__/useCartPromotion.test.ts alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawer.test.tsx alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaMedida.test.tsx alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/seloDoCupom.test.tsx alterado
apps/store/src/pages/__tests__/CheckoutPage.test.tsx alterado
apps/store/src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx alterado
apps/store/src/pages/__tests__/checkoutSobreviveAVoltaDaAba.test.tsx alterado
apps/store/src/test/checkoutCampanha.test.tsx alterado
apps/store/src/test/checkoutResumoCampanha.test.tsx alterado

## Verificação

- Tipos, linha de base: `npx tsc --noEmit -p apps/store/tsconfig.app.json` (fonte: CLAUDE.md §Comandos, via PROJECT.md). Exit 0, `limpo`.
- Tipos, no fim: mesmo comando, exit 0. Contra o baseline: 0 → 0, nenhum erro novo.
- Um arquivo de teste: `pnpm --filter @estrelinha/store exec vitest run <arquivo> --testTimeout=20000` (fonte: PROJECT.md §Comandos de verificação), por fatia:
  - `useCartPromotion.test.ts`: 21/21
  - `sacolaComFrete.test.tsx`: 27/27
  - os 8 arquivos de `widgets/cart-drawer`: 120/120
  - os 5 arquivos de checkout donos do arnês: 183/183
- Verificação mínima: `pnpm --filter @estrelinha/store test --testTimeout=20000`, exit fora de pipe (fonte: CLAUDE.md §Baselines, via PROJECT.md). 412 arquivos e 7612 testes passando, exit 0. A primeira volta reprovou 72 casos em `CheckoutPage` e `compreJuntoSacolaECheckout`, porque esses arnês não tinham `QueryClientProvider` nem `useCepLookup` no dublê de `@/entities/address`. Ajustei os arnês sem afrouxar nenhuma asserção e remedi.
- Fora do declarado, `npx eslint .` em `apps/store`: 2 erros e 2 warnings, iguais à linha de base (2/2), nenhum em arquivo tocado.

Instruções lidas:
- `CLAUDE.md` (raiz) › O defeito 01; Convenções que valem em todo o repositório; Os guardas; Feature-Sliced Design. Li pela cópia carregada no contexto da sessão, que é a do repositório principal.
- `apps/store/CLAUDE.md` › Design system; Mobile — o que quebra e não grita; Carrinho, chrome e checkout (com a sacola v4); Frete grátis — um interruptor e um dono só; Retirada no escritório.
- `.specs/project/PROJECT.md` › Comandos de verificação; Ambiente local.

## Divergências e descobertas

- **Implementei antes do vermelho nas fatias de componente.** Escrevi `CartShipping` e o novo `CartDrawer` antes de `sacolaComFrete.test.tsx`, contra o ciclo do `tdd`. Para compensar, rodei 13 mutações nos arquivos reais (auto-seleção, recolher, `granted`, `CrossSell` fora da região, frete no Total, `cepOrigin`, nota, `collisionBoundary`, validação do CEP, cupom de 44px, opção que sumiu, "Frete padrão", retirada marcada). As 13 morreram por asserção. Restaurei pela cópia com `cmp` e rodei de novo depois da separação em `model/` e `ui/`.
- A fatia 1 (`useCartPromotion`) seguiu o ciclo: os 2 casos novos reprovaram antes da implementação.
- **Citação que deslocou:** o Contrato aponta `useCepLookup` em `@/entities/address`. Ele está lá, mas reexportado de `@estrelinha/core/hooks/useCepLookup`. Consumi pelo endereço do Contrato.
- **Citação que deslocou:** `useCartPromotion.ts:168-213` / `:185` batem; a linha `shipping: 0` estava na 185.
- As citações de `CartDrawer.tsx` (faixa `:184-216`, `CrossSell` `:248-250`, cupom `:275-285`, totais `:287-330`, nota `:334-336`, botão `:341`) bateram.
- O exemplar `ShippingCalc.tsx:106-135` bateu. `useCheckoutTotals.ts:212-224` bateu, com deslocamento de ~1 linha.
- **Arnês:** cinco testes da gaveta e cinco do checkout ganharam `QueryClientProvider` ou `useCepLookup` no dublê de `@/entities/address`. Em `CartDrawer.test.tsx`:
  - o caso que afirmava a nota foi invertido para "nenhuma nota";
  - o caso que afirmava o "!" passou para a copy nova da faixa ("Faltam R$ X para o frete grátis");
  - a ausência no caso DESLIGADO acompanha a copy nova.
- Um teste novo usa `staleTime` de 5 minutos no `QueryClient`, que é o do cliente da loja (`app/queryClient.ts`). Com o padrão zero, a segunda leitura no checkout recotaria, e isso não reflete o app.
- **A gaveta fica de fora de dois casos que nasceram do pedido de 2026-11-13:**
  - Não há fallback "Frete padrão", por desenho (UC-06).
  - Na falha da cotação, só "Tentar de novo" (e a retirada, quando o CEP é do RS). A gaveta não mostra o aviso do checkout.
- Nenhum teste sobe infraestrutura (cotação e ViaCEP dublados). Nada foi executado contra o Melhor Envio nem o banco local: a cotação real fica para a Validation.
- **Para a Validation medir em navegador (CA-13, CA-22, CA-23):** em 390×844 e 1440×900, abra a gaveta com 1 peça.
  - Sem CEP: a linha do campo, `textbox` "CEP para calcular o frete e o prazo".
  - Calcular 01310-100 (SP): opções abertas, `radiogroup` "Forma de envio".
  - Tocar uma opção: a lista recolhe no `button` "Frete: … Ver as opções" (`aria-expanded=false`).
  - 90010-000 (RS): os grupos "Envio a domicílio" e `group` "Retirar em".
  - 40020-000 (BA): faixa "Frete grátis só para Sul e Sudeste".
  - Rodapé: `[data-testid=drawer-footer]`; altura ≤ 270px com frete escolhido a 100%; a 200%, o `max-h-[72%]` rola por dentro.
  - Balão (CA-22): o ⓘ da faixa em `[data-testid=free-shipping-band]`; o limite de colisão é o painel `role=dialog`.
  - Falha: para forçar, derrube a function `melhor-envio` local ou intercepte `/functions/v1/melhor-envio*` com 500. Para "sem opção", devolva `[]`.
- Os alvos de 44px: "Trocar CEP" com `TAP_ROW`, a linha recolhida com 52px, "Tentar de novo" com `min-h-11`.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 09
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O defeito 01, Convenções, Os guardas, FSD; apps/store/CLAUDE.md › Design system, Mobile, Carrinho/chrome/checkout, Frete grátis (feature 37), Retirada no escritório; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: unidade — useCartPromotion(shipping) em src/entities/cart/model/__tests__/useCartPromotion.test.ts (4 casos); componente — os demais comportamentos do bloco Testes em src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx (27 casos: CA-01, CA-02, calculando, CA-03/04, CA-05, CA-06/16/25, CA-17/26, CA-07, sem nota, CA-10, CA-11, CA-12, classes/alvos/balão/motion-reduce); CartDrawer.test.tsx com o caso da nota invertido. Sem cobertura aqui: as medidas de CA-13, CA-22 e CA-23 (navegador, na Validation)
Verificações: tsc da loja 0 → 0; arquivos da fatia verdes; suíte da loja 7612/412 com exit 0; eslint da loja na linha de base (2/2)
Árvore de trabalho: criados model/useCartShipping.ts, ui/CartShipping.tsx e __tests__/sacolaComFrete.test.tsx em widgets/cart-drawer; alterados CartDrawer.tsx e useCartPromotion.ts (com o teste), e o arnês de 9 arquivos de teste (5 da gaveta, 5 de checkout). Nada commitado
Citações conferidas: 8 abertas; useCepLookup em @/entities/address é reexportação de core, e useCheckoutTotals deslocou ~1 linha; nenhuma morta
```

## T09 — wi-impl-review · fixing · agente a2bc6cb99aac89527

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/09-gaveta-previa-de-frete-e-rodape.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | teste que não morde | atrapalha | apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx:396-409 | O caso se chama "CEP da BA acima da faixa", mas monta `setCart(2, 60)`, ou seja 120, com a faixa em 150 (`free_shipping_threshold: 150`, :156). Abaixo da faixa o frete é cobrado em qualquer região. Por isso a asserção `Total = R$ 141,50` continua passando com um `granted` que ignore a região, e o CA-17 ("acima da faixa ⇒ frete da cotação somado") fica sem prova na gaveta. Nenhum outro caso usa CEP da BA acima da faixa sem cupom. | Testes: "componente: CEP da BA acima da faixa ⇒ frete da cotação no Total e `CrossSell` ausente, sem buscar o catálogo (CA-17, CA-26)"; CA-17 "CEP 40020-000 (BA), sacola acima da faixa: … frete da cotação somado ao Total" |
| 2 | teste que não morde | atrapalha | apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx:555-561 | O clique em "Finalizar Pedido" só acontece depois de "Tentar de novo" ter dado certo (`respond([PAC])` e `await radios()`), quando a cotação já não está em falha. Assim, "Finalizar Pedido segue funcionando" **durante a falha** não fica provado: um mutante que desligasse o botão quando `failed` passaria. | CA-11 "Falha da cotação ⇒ … Total sem frete; 'Finalizar Pedido' funcionando"; UC-06 "O Total fica sem frete e 'Finalizar Pedido' segue funcionando." |
| 3 | premissa derrubada | atrapalha | apps/store/src/widgets/cart-drawer/model/useCartShipping.ts:133-148 | Premissa 4: o efeito marca a opção mais barata toda vez que há resultado e nenhuma escolha, mesmo quando o CEP foi digitado no checkout. A gaveta também é montada dentro de `/checkout` (`CheckoutPage.tsx:866`). Então a cliente que digitou o CEP no bloco Entrega, viu 2 ou mais opções e ainda não escolheu fica com a mais barata gravada no rascunho só por abrir a sacola. O bloco Entrega resolve esse mesmo caso pelo caminho contrário, de propósito. Além disso, D-11 limita a marcação ao momento do cálculo na gaveta. | `DeliveryBlock.tsx:322`: "Endereço digitado na hora com 2+ opções **não** pré-seleciona: a pessoa está escolhendo." D-11: "a gaveta marca a mais barata ao calcular (a retirada nunca)" |
| 4 | premissa derrubada | atrapalha | apps/store/src/widgets/cart-drawer/model/useCartShipping.ts:139-142 | Premissa 5: com a cotação em falha ou vazia, a gaveta chama `setShipping(null)` para qualquer escolha que não seja a retirada. Isso inclui o "Frete padrão" (`DEFAULT_SHIPPING_SERVICE_ID`) que o próprio bloco Entrega grava quando a cotação falha. Com a gaveta aberta em `/checkout` e a mesma cotação em falha (mesma chave), ela apaga essa escolha. O efeito de pré-seleção do bloco (deps `options`, `cheapestId`, `address.cep`) não volta a rodar, e o checkout fica sem forma de envio. O motivo declarado ("custo velho que a cotação não confirma") não se aplica ao frete padrão, que é a saída que o checkout oferece de propósito quando a cotação falha. | `DeliveryBlock.tsx:5`: "SHP-05: cotação que falha ou volta vazia vira uma única opção 'Frete padrão' com aviso." e `:275-276` "Aqui o 'Frete padrão' é permitido (SHP-05): a compra segue mesmo sem cotação." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a gaveta calcula, mostra, marca, recolhe e soma o frete pelos critérios acima | useCartShipping.ts (calculate, efeito de escolha, select/selectPickup, charge); CartShipping.tsx (os seis estados); CartDrawer.tsx:90 `useCartPromotion(charge?.cost ?? 0)` e a linha do frete :230-242 | sim. A marcação automática vai além de D-11 (achado 3) |
| a faixa v2 e o rodapé compacto montados, sem nota abaixo do Total | CartDrawer.tsx:108-115 (`FreeShippingBand` com as seis props), :149-261 (rodapé `max-h-[72%]`, cupom `min-h-11`, totais com `gap-[3px]`, botão `h-12`, nenhuma nota) | sim |
| CA-12 provado (o rascunho do pedido montado intocado) | sacolaComFrete.test.tsx:580-605; a leitura e a escrita pelo `useCheckoutStore` importado direto (useCartShipping.ts:80-85) | sim, do lado da gaveta |
| no retorno, a lista do que a Validation mede em navegador | — | não conferido (o retorno do implementador não veio) |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | sacolaComFrete.test.tsx e useCartPromotion.test.ts | em parte: CA-17 e CA-11 com asserção fraca (achados 1 e 2) |
| testes dos arquivos alterados, passando | — | só execução |
| a verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- Arnês dos testes da gaveta: `CartDrawer.test.tsx`, `CartDrawerAcompanha.test.tsx`, `sacolaMedida.test.tsx` e `seloDoCupom.test.tsx` ganharam `QueryClientProvider`. `sacolaCampanha.test.tsx` já tinha (linha 108). O caso da nota foi invertido, não apagado: agora afirma que não há nota. Os casos com "!" passaram para "Faltam … para o frete grátis". Aplicada.
- Testes de página/checkout: `CheckoutPage`, `checkoutSobreviveAVoltaDaAba`, `checkoutCampanha` e `checkoutResumoCampanha` ganharam o dublê `useCepLookup`. `compreJuntoSacolaECheckout` ganhou o provider. Nenhuma asserção foi tocada. Aplicada.
- Guardas (`freeShippingSingleOwner`, `touchTarget`, `alvoDeToqueNaoRoubaPosicao`, `accentText`, `contrast`, `fieldBorder`): só execução. Pela leitura: o campo usa `border-estrelinha-field`, os alvos usam `TAP_ROW` e `min-h-11`, e não há leitura de `free_shipping_threshold`.
- FSD: o widget importa do barril `@/features/checkout` e de `@/entities/*`. O frete entra em `useCartPromotion` por parâmetro. Aplicada.
- Tom: nenhum "!" novo nos arquivos alterados; "Não consegui consultar…" na primeira pessoa. Aplicada.
- `packages/core/src/payment/**` intocado: nenhum arquivo dessa pasta em `alterados`. Aplicada.

## Testes

- CA-01, o campo com peças e ausente com a sacola vazia: sacolaComFrete.test.tsx:187. Morde.
- CA-02, CEP inválido sem chamar a cotação: :203. Morde.
- Calculando, com o indicador e duas vagas: :224. Morde.
- CA-03/CA-04, opções do `deliveryOptions`, a mais barata marcada e o Total com o frete: :238 e :289. Morde.
- CA-05, recolher e reabrir: :311. Morde.
- CA-06/CA-16/CA-25, faixa alcançada, interruptor desligado e cupom com BA: :348, :363, :375. Mordem.
- CA-17/CA-26, BA: :396. Morde para o CA-26 (catálogo não buscado). **Não morde para o CA-17** (achado 1).
- CA-07, RS: :428. Morde.
- M-06, sem nota: :448 e CartDrawer.test.tsx (caso invertido). Mordem.
- CA-10, recotação mantendo a opção com o preço novo: :494, mais a opção que sumiu em :512. Mordem.
- CA-11, falha e sem opção: :538 e :564. A mensagem, o Total e a ausência de "Frete padrão" mordem. **"Finalizar Pedido funcionando" durante a falha não morde** (achado 2).
- CA-12: :580 e :599. Morde.
- Unidade `useCartPromotion(shipping)`: useCartPromotion.test.ts, os quatro casos novos. Morde.
- Classes (cupom 44, botão 48, `collisionBoundary`, alvos de 44, `motion-reduce:`): :418, :459, :472. Morde, até onde jsdom alcança.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Hook `useCartShipping` num arquivo próprio; `CartShipping.tsx` só desenha | sim | o Total precisa do custo no `CartDrawer`; exportar o hook do arquivo do componente dá o warning `react-refresh/only-export-components`; nenhuma tarefa seguinte cita o arquivo | sim |
| 2 | `FilledCart` concentra as consultas e só monta com a gaveta aberta | sim | o `CartDrawer` vive montado em toda rota; os arnês ajustados | sim |
| 3 | Com CEP no rascunho, a gaveta abre no resultado | sim | D-19 e UC-05 | sim |
| 4 | Marca a mais barata sempre que há resultado sem escolha, inclusive com o CEP vindo do checkout | não | DeliveryBlock.tsx:322 e D-11 "ao calcular" (achado 3) | o raio declarado cobre a consequência |
| 5 | Falha ou cotação vazia apaga a escolha, menos a retirada | não, para o "Frete padrão" do checkout | DeliveryBlock.tsx:5 e :275-276, SHP-05 (achado 4) | declara DeliveryBlock, mas não o apagamento do frete padrão dentro de `/checkout` |
| 6 | "Trocar CEP" desfaz a escolha e volta ao campo preenchido | sim | RN-09; o CEP continua no rascunho | sim |
| 7 | `CouponInput` recebe o custo escolhido, ou o valor de antes sem escolha | sim | RN-08 | sim |
| 8 | Na recotação com a lista recolhida, mostra o rascunho até chegar a cotação nova | sim | nada na tarefa contradiz | sim |
| 9 | `draftEstimateLabel` copiado do `DeliveryBlock` | sim, sob a cerca | "Não faça" proíbe alterar `DeliveryBlock.tsx` e `deliveryOptions.ts`; a dívida está declarada | sim |
| 10 | `useCheckoutStore` importado direto, nunca pelo provider | sim | CA-12 e RN-06 | sim |

## Não conferido

- O que só a execução prova: os testes, o lint (a justificativa da premissa 1) e os guardas da loja.
- O item de `Pronto quando` sobre a lista para a Validation em navegador: o retorno do implementador não veio junto.
- CA-13, CA-22 e CA-23 (medidas): ficam com a Validation/QA, como a tarefa determina.
- Os seis arquivos novos aparecem com intent-to-add (`A`) e têm baseline no diff. Nada ficou sem prova por esse motivo.
- Instruções lidas: CLAUDE.md da raiz (carregado no contexto) › "O defeito 01", "Convenções que valem em todo o repositório", "Os guardas — o que trava o quê", "Feature-Sliced Design". **`apps/store/CLAUDE.md` não foi aberto** (as seções "Carrinho, chrome e checkout", "Frete grátis…", "Retirada no escritório", "Design system", "Mobile — o que quebra e não grita"). Os achados de `convenção violada` contra esse arquivo não foram buscados.

## T09 — wi-impl-task · done · agente ac4c7f66be3189983

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/09-gaveta-previa-de-frete-e-rodape.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 4 (revista) | A gaveta só marca a opção mais barata quando o CEP do rascunho foi calculado por ela (`cepOrigin === 'sacola'`). Vale para dois casos: não há escolha, ou a escolha sumiu da cotação. Com um CEP digitado no checkout (origem `null`) e 2 ou mais opções, abrir a sacola não escolhe nada: a lista fica aberta, sem marca, e o Total fica sem frete. "Calcular" na gaveta passa a origem para `'sacola'`, e só aí a mais barata vem marcada. Uma escolha que já existe continua acompanhando o custo da cotação nova, em qualquer origem | Marcar a mais barata sempre que houver resultado sem escolha | Achado 3 da revisão: o `DeliveryBlock` não pré-seleciona com 2+ opções de um CEP digitado na hora, e a gaveta também é montada em `/checkout`. D-11 restringe a marcação ao cálculo feito na gaveta | `useCartShipping.ts`; o rascunho de `/checkout`; tarefa 10 (o bloco Entrega recebe o rascunho da gaveta como antes) |
| 5 (revista) | Com a cotação em falha ou vazia, a gaveta só desfaz a escolha se o CEP for dela (`'sacola'`) e se a escolha não for a retirada nem o "Frete padrão" (`DEFAULT_SHIPPING_SERVICE_ID`). Uma escolha que veio do checkout nunca é apagada pela gaveta | Desfazer qualquer escolha que não seja a retirada | Achado 4 da revisão: o "Frete padrão" é a saída do checkout para a falha da cotação (SHP-05). Apagá-lo deixava o checkout sem forma de envio | `useCartShipping.ts`; o rascunho de `/checkout` |
| 11 (nova) | Com a cotação em falha ou vazia, e quando a escolha do rascunho é o "Frete padrão", a gaveta não mostra a linha recolhida. Ela mostra a falha (ou o "sem opção") e o Total sem frete. Nenhum "Frete padrão" é desenhado na gaveta | Mostrar a linha recolhida com a escolha do rascunho | Depois da revisão 5, uma escolha do checkout sobrevive à falha. Sem esta regra, a gaveta desenharia "PAC" ou "Frete padrão" com um valor que não entra no Total, o que contraria o UC-06 e o CA-11 | só a gaveta (`CartShipping.tsx`) |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 8a | CEP da BA acima da faixa (2 × R$ 100, faixa de R$ 150): "Frete grátis só para Sul e Sudeste", sem barra, nenhuma opção "Grátis", "Frete · PAC" R$ 21,50 e Total R$ 221,50 (CA-17) | componente | `src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx` | sim | vermelho (o `granted` trocado por `reached`, que ignora a região) |
| 8b | CEP da BA faltando frete: "Complete o frete grátis" some e o catálogo não é buscado (CA-26). Este é o caso antigo, renomeado | componente | idem | sim | vermelho (M4 da implementação) |
| 12a | Com a cotação em falha, "Finalizar Pedido" está ligado e leva ao checkout. Clicado durante a falha, sem retentar antes (CA-11) | componente | idem | sim | vermelho (`disabled={shipping.failed}` no botão) |
| 15 | Com o CEP digitado no checkout e 2+ opções, abrir a sacola não marca nada. Calcular na gaveta marca a mais barata | componente | idem | sim | vermelho (sem a guarda `!escolhida && !daGaveta`) |
| 16 | O "Frete padrão" gravado pelo checkout sobrevive a abrir a sacola com a cotação em falha, com o CEP de cada origem, e não é desenhado na gaveta | componente | idem (`it.each`) | sim | vermelho (sem a exceção do `DEFAULT_SHIPPING_SERVICE_ID`). Na primeira escrita o caso ficou verde com o mutante, porque lia o rascunho antes da falha chegar. Reescrito para ler depois da mensagem de falha, ficou vermelho |
| 17 | Uma escolha feita no checkout, com a cotação em falha, não vira linha recolhida, não entra no Total e não é apagada | componente | idem | sim | vermelho (sem a guarda da linha recolhida na falha) |
| 18 | Uma escolha da gaveta que a recotação em falha não confirma mais é desfeita | componente | idem | sim | vermelho (sem a condição de origem `'sacola'`) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

`apps/store/src/widgets/cart-drawer/model/useCartShipping.ts`: alterado (pela correção; arquivo criado nesta tarefa)
`apps/store/src/widgets/cart-drawer/ui/CartShipping.tsx`: alterado (pela correção; arquivo criado nesta tarefa)
`apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx`: alterado (pela correção; arquivo criado nesta tarefa)

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/widgets/cart-drawer --testTimeout=20000` (PROJECT.md): 125/125, depois de mudar a premissa 4.
- `pnpm --filter @estrelinha/store exec vitest run src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx --testTimeout=20000` (PROJECT.md): 34/34 no fim.
- Seis mutações no arquivo real, cada uma restaurada pela cópia e conferida com `cmp`: as seis morreram por asserção.
- Suíte da loja: `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md §Baselines, via PROJECT.md): 412 arquivos, 7619 testes, exit 0.
- Tipos: `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md §Comandos, via PROJECT.md): exit 0. Contra o baseline `limpo`: nenhum erro novo.
- Lint, fora dos comandos declarados: `npx eslint .` em `apps/store` deu 2 erros e 2 warnings, iguais à linha de base, nenhum em arquivo tocado.

Instruções lidas: `CLAUDE.md` (raiz) › O defeito 01, Convenções, Os guardas, FSD; `apps/store/CLAUDE.md` › Design system, Mobile, Carrinho/chrome/checkout, Frete grátis (feature 37), Retirada no escritório; `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local. Nada relido na correção.

## Divergências e descobertas

- Ao corrigir a premissa 5 apareceu um defeito novo: uma escolha do checkout que sobrevive à falha da cotação seria desenhada na linha recolhida, com um valor fora do Total. Isso incluía o "Frete padrão". Corrigido pela premissa 11 e coberto pela fatia 17.
- No primeiro check de mutação, o caso do "Frete padrão" ficou verde com a implementação quebrada, porque a asserção lia o rascunho antes da falha chegar. Ajustei a ordem da asserção, e o mesmo mutante passou a ficar vermelho.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 09
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O defeito 01, Convenções, Os guardas, FSD; apps/store/CLAUDE.md › Design system, Mobile, Carrinho/chrome/checkout, Frete grátis (feature 37), Retirada no escritório; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  unidade:
    - useCartPromotion(shipping), em src/entities/cart/model/__tests__/useCartPromotion.test.ts (4 casos)
  componente, em src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx (34 casos):
    - CA-01, CA-02, o estado calculando
    - CA-03/04, CA-05
    - CA-06/16/25
    - CA-17, com a sacola acima da faixa; CA-26
    - CA-07, sem nota
    - CA-10
    - CA-11, com "Finalizar Pedido" provado durante a falha; sem opção
    - CA-12
    - classes, alvos, balão e motion-reduce
    - da correção: a origem do CEP, o "Frete padrão" do checkout, a escolha do checkout na falha
  CartDrawer.test.tsx: o caso da nota invertido
  sem cobertura aqui: as medidas de CA-13, CA-22 e CA-23 (navegador, na Validation)
Verificações:
  - tsc da loja: 0 → 0
  - testes dos arquivos alterados: verdes
  - suíte da loja: 7619 testes em 412 arquivos, exit 0
  - eslint da loja: na linha de base (2/2)
  - mutações: 13 da implementação e 6 da correção, todas mortas por asserção
Árvore de trabalho:
  criados, em widgets/cart-drawer:
    - model/useCartShipping.ts
    - ui/CartShipping.tsx
    - ui/__tests__/sacolaComFrete.test.tsx
  alterados:
    - CartDrawer.tsx
    - useCartPromotion.ts, com o teste
    - o arnês de 9 arquivos de teste: 4 da gaveta (CartDrawer, CartDrawerAcompanha, sacolaMedida, seloDoCupom) e 5 de checkout (CheckoutPage, compreJuntoSacolaECheckout, checkoutSobreviveAVoltaDaAba, checkoutCampanha, checkoutResumoCampanha)
  nada commitado
Citações conferidas:
  - 8 abertas, nenhuma morta
  - useCepLookup em @/entities/address é reexportação de core
  - useCheckoutTotals deslocou ~1 linha
```

## T10 — wi-impl-task · review · agente af7b172f21d976c71

Tarefa: .specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/10-checkout-recebendo-da-sacola.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A opção da gaveta só é desfeita quando ela some da cotação **e** `cepOrigin === 'sacola'`. Um rascunho digitado no checkout fica como hoje | Desfazer também em qualquer rascunho restaurado sem origem | A tarefa pede "sem `cepOrigin`, o bloco é o de hoje". É a superfície menor | DeliveryBlock.tsx |
| 2 | A retirada escolhida na gaveta não é desfeita por esse efeito. Ela não está em `options` e já tem regra própria (`PickupSource`, RET-10) | Tratar a retirada como uma opção que sumiu | Desfazer derrubaria toda retirada do RS, porque `options` nunca a contém | DeliveryBlock.tsx |
| 3 | Com o Bairro faltando na busca, a linha sai "Trazido da sua sacola · Cidade/UF". Com Cidade ou UF faltando, ou `manual`, sai só "Trazido da sua sacola" | Exigir bairro, cidade e UF juntos para mostrar o lugar | É a forma mais fácil de desfazer, e não inventa pontuação solta | só o texto da linha |
| 4 | O foco no Número tem uma trava (`ref`) pela vida do componente. Ele dispara na primeira vez que o bloco está aberto com `cepOrigin === 'sacola'` e o número vazio, e isso inclui o bloco que só abre depois do Contato | Focar só na montagem | Com uma convidada, o Contato abre primeiro e a Entrega abre depois. "Quando o bloco abre" cobre esse caso | DeliveryBlock.tsx |
| 5 | Quando o CEP salvo é igual ao da gaveta, a semeadura grava o endereço salvo inteiro por `setAddress`. A origem continua `'sacola'`, porque os dígitos não mudam, e o bloco não fica sujo, então abre recolhido pela regra de sempre (`blocks()`) | Zerar `cepOrigin` depois de semear | Não precisa: recolhido, a linha não aparece. E zerar quebraria o efeito "a opção sumiu" da gaveta | DeliveryBlock.tsx; o recolhido depende de `resolveBlocks`, que não foi tocado |
| 6 | A linha fica logo abaixo do campo de CEP: `<p role="status">` com `-mt-3`, `text-[13px] text-estrelinha-ink-soft` e um ponto `h-[6px] w-[6px] rounded-full bg-estrelinha-accent` marcado `aria-hidden` | Pôr a linha dentro do contêiner do CEP, que é limitado a `sm:max-w-[200px]` | Com o limite de 200px, a linha "Bela Vista — São Paulo/SP" quebraria no computador | layout; a medida em navegador é da Validation |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Vindo da gaveta, o bloco abre com o CEP, a rua, o bairro, a cidade e a UF da busca, a opção marcada, a linha "Trazido da sua sacola · Bela Vista — São Paulo/SP" e o foco no Número (CA-09) | componente | DeliveryBlock.test.tsx › "abre com o CEP, o endereço da busca…" | sim | — |
| 1b | Sem a busca pelo CEP, a linha diz só "Trazido da sua sacola" | componente | idem › "sem a busca pelo CEP…" | sim | — |
| 1c | O foco no Número acontece uma vez, e não acontece com o número já preenchido; o bloco que abre depois recebe o foco | componente | idem › "o foco no Número acontece uma vez…", "com o número já preenchido…", "o bloco que abre DEPOIS…" | sim | "uma vez": a primeira versão deixava passar a mutação (`ficou verde`) e foi reescrita, depois `vermelho`; "número já preenchido": `vermelho`; "abre DEPOIS": `—` (passou de primeira, é o mesmo efeito da 1) |
| 2 | A opção da gaveta que sumiu da cotação é desfeita | componente | idem › "a opção da gaveta que sumiu…" | sim | — |
| 2b | O preço novo da opção da gaveta vale | componente | idem › "o preço novo da opção da gaveta vale…" | sim | vermelho |
| 2c | A retirada escolhida na gaveta não é desfeita | componente | idem › "a retirada escolhida na gaveta…" | sim | vermelho |
| 3 | Digitar outro CEP no checkout tira a linha | componente | idem › "digitar outro CEP no checkout tira a linha" | sim | — |
| 4 | Conta com endereço salvo do mesmo CEP recebe o endereço inteiro, e o bloco fica completo e limpo; com outro CEP, o endereço salvo não entra | componente | idem › "…MESMO CEP…" e "…OUTRO CEP…" | sim | — (os dois também mataram a mutação da semeadura: `vermelho`) |
| 5 | Sem `cepOrigin`, o bloco é o de hoje: sem linha, sem foco | componente | idem › "sem `cepOrigin`, o bloco é o de hoje…" | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/features/checkout/ui/DeliveryBlock.tsx — alterado
apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx — alterado

## Verificação

- Um arquivo de teste (comando do PROJECT.md › Comandos de verificação): `pnpm --filter @estrelinha/store exec vitest run src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx --testTimeout=20000`. Vermelho antes da implementação (7 falhas), verde depois: 91/91.
- Obrigações, pelo mesmo comando: CheckoutPage*, checkoutSobreviveAVoltaDaAba, compreJuntoSacolaECheckout, ProposalCheckoutPage, `src/features/checkout`, accentText, touchTarget, fieldBorder e `src/widgets/cart-drawer` passaram: 42 arquivos, 861 testes, exit 0.
- Tipos (CLAUDE.md › Comandos): `npx tsc --noEmit -p apps/store/tsconfig.app.json` sai com exit 0. O baseline não veio na entrada; a linha *Tipos* do CLAUDE.md dá 0 para o store. Contra esse 0, nenhum erro novo.
- Lint nos dois arquivos tocados: `npx eslint`, sem saída.
- Verificação mínima (CLAUDE.md › Baselines, suíte do workspace tocado): `pnpm --filter @estrelinha/store test --testTimeout=20000` deu exit 0, 412 arquivos e 7631 testes passando.
- Check de mutação: 8 mutações nos arquivos reais, cada uma restaurada pela cópia e conferida com `cmp`.

Instruções lidas: CLAUDE.md › O "defeito 01": dois donos do mesmo dado; CLAUDE.md › Convenções que valem em todo o repositório; apps/store/CLAUDE.md › Mobile — o que quebra e não grita; apps/store/CLAUDE.md › Carrinho, chrome e checkout; apps/store/CLAUDE.md › O checkout NÃO exige conta; .specs/project/PROJECT.md › Comandos de verificação e Ambiente local.

## Divergências e descobertas

- As linhas da citação deslocaram. Em `DeliveryBlock.tsx`, a semeadura está em :221-236 (a tarefa cita :239-246), o preenchimento pela busca em :238-252 (cita :249-262) e a troca de CEP em :254-268 (cita :265-278). Relocalizei pelo alvo nomeado.
- O preço novo já valia antes desta tarefa, pelo efeito que ressincroniza o custo. Escrevi o teste e o check de mutação confirmou que ele morde.
- O primeiro teste de "o foco acontece uma vez" deixou passar a mutação (`ficou verde`): um rerender com as mesmas dependências não reexecuta o efeito. Reescrevi o teste para fechar e reabrir o bloco, e a mutação passou a reprovar.
- Os testes que passaram de primeira ("número já preenchido", "retirada", "sem `cepOrigin`", "preço novo") levaram o check de mutação e ficaram vermelhos com a implementação quebrada. "O bloco que abre DEPOIS" é a mesma linha de código do CA-09, que passou pelo vermelho.
- O teste da retirada fixa a configuração da retirada em "carregando" (`storeSettings.isFetched = false`), para isolar o efeito novo do `PickupSource`.
- O ponto e a linha (13px, alinhamento abaixo do CEP) não foram medidos em navegador; jsdom não mede layout, e isso é da Validation e do QA.
- `add_shipping_info` não mudou: a opção marcada pela gaveta e o desfazer não emitem nada.
- Nada a propagar: a tarefa 11 não afirma nada sobre o `DeliveryBlock`, a linha ou `cepOrigin`.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 10
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › "O defeito 01", "Convenções que valem em todo o repositório"; apps/store/CLAUDE.md › "Carrinho, chrome e checkout", "O checkout NÃO exige conta", "Mobile — o que quebra e não grita"; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: todos em apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx, describe "DeliveryBlock — o CEP trazido da sacola":
  · CA-09 (CEP, endereço da busca, opção marcada, linha "Trazido da sua sacola · Bela Vista — São Paulo/SP", foco no Número), mais "sem a busca, a frase sozinha", "o foco uma vez", "o foco no bloco que abre depois" e "número já preenchido, sem foco";
  · a opção que sumiu é desfeita; o preço novo vale; a retirada da gaveta não é desfeita;
  · digitar outro CEP tira a linha;
  · endereço salvo do mesmo CEP entra inteiro, completo e sem sujar; de outro CEP, não entra;
  · sem cepOrigin, o bloco é o de hoje.
  Sem cobertura: o "bloco recolhido" em si é decisão de resolveBlocks na CheckoutPage; está provado por isDeliveryComplete verdadeiro e 'delivery' fora de dirty.
Verificações: DeliveryBlock.test.tsx 91/91; obrigações (CheckoutPage*, checkoutSobreviveAVoltaDaAba, compreJunto, ProposalCheckout, features/checkout, cart-drawer, accentText, touchTarget, fieldBorder) 861/861; tsc do store 0; eslint limpo nos dois arquivos; suíte do store 7631/412, exit 0; 8 mutações, todas mortas (uma depois de reescrever o teste)
Árvore de trabalho: apps/store/src/features/checkout/ui/DeliveryBlock.tsx (alterado); apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx (alterado); nada commitado
Citações conferidas: 4 abertas (DeliveryBlock semeadura, preenchimento, troca de CEP; checkoutStore cepOrigin/setCepOrigin; useCartShipping da tarefa 09). Deslocaram: DeliveryBlock :239-246 → :221-236, :249-262 → :238-252, :265-278 → :254-268. Nenhuma morta.
```

## T10 — wi-impl-review · aborted · agente af3389abe6cd1d6f7

(sem resposta: error)

## T10 — wi-impl-task · review · agente ae288d5cad23477e5

Tarefa: .specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/10-checkout-recebendo-da-sacola.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A opção da gaveta que sumiu da cotação é desfeita só quando `cepOrigin === 'sacola'`, e nunca a retirada (`PICKUP_SERVICE_ID`), que não está em `options` | Desfazer qualquer escolha que não esteja na cotação, em qualquer rascunho | É a menor superfície: o rascunho digitado no checkout segue como hoje. A retirada mora fora da cotação (feature 63) e tem regra própria | `DeliveryBlock.tsx` |
| 2 | "Mesmo CEP" é comparado com `stripCep` dos dois lados (gaveta × endereço salvo) | Comparar a string crua | A gaveta pode gravar sem máscara e o endereço salvo vem com ela | `DeliveryBlock.tsx`. Qualquer tarefa seguinte que leia o CEP semeado |
| 3 | O foco no Número fica preso a um ref que só deixa acontecer uma vez por montagem. Dispara quando `open` fica verdadeiro, então também vale para o bloco que abre depois do Contato | Focar só na montagem | D-14 diz "quando o bloco abre", e no checkout o bloco Entrega costuma abrir depois do Contato | `DeliveryBlock.tsx` |
| 4 | Sem rua, cidade e UF vindas da busca (ou com a busca em `manual`), a linha diz só "Trazido da sua sacola". O bairro vazio sai da frase | Mostrar bairro e cidade em branco | Decisão da tarefa ("sem a busca, a frase sozinha") | `DeliveryBlock.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O bloco abre com CEP, endereço da busca, a opção marcada, a linha e o foco no Número (CA-09), mais a linha sem busca, o foco uma vez só, o foco ao abrir depois e nenhum foco com o número já preenchido | componente | `DeliveryBlock.test.tsx` › "o CEP trazido da sacola" (5 casos) | sim | retomada; o check rodou nesta corrida: tirar o `focus()` faz 4 testes falharem, forçar a linha faz 2 falharem |
| 2 | A opção que sumiu da cotação é desfeita; vale o preço novo; a retirada fica | componente | idem (3 casos) | sim | retomada; o check rodou: as duas mutações (desfazer e preço) falham, 1 teste cada |
| 3 | Digitar outro CEP no checkout tira a linha | componente | idem (1 caso) | sim | retomada; a mutação "linha sempre visível" falha |
| 4 | Endereço salvo com CEP igual entra inteiro e o bloco fica completo; com CEP diferente, ele não entra | componente | idem (2 casos) | sim | retomada; as mutações `mesmoCep` e `outroCep` falham, 1 teste cada |
| 5 | Sem `cepOrigin`, o bloco é o de hoje | componente | idem (1 caso) | sim | retomada; morto pela mutação "linha sempre visível" |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/features/checkout/ui/DeliveryBlock.tsx alterado
apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação): exit 0, 91/91.
- Check de mutação: 6 mutantes injetados no `DeliveryBlock.tsx` real, rodando `-t 'sacola'` e `-t 'preço novo'`. Restaurei pela cópia e conferi com `cmp`: os 6 morreram por asserção.
- As obrigações juntas (vitest com o mesmo comando): `CheckoutPage.test.tsx`, `checkoutSobreviveAVoltaDaAba.test.tsx`, `compreJuntoSacolaECheckout.test.tsx`, `accentText`, `touchTarget`, `fieldBorder` e `src/features/checkout/**` deram exit 0, 33 arquivos e 710 testes.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): exit 0 e 0 erros. Não veio baseline e a referência é o 0 do store no CLAUDE.md: sem erro novo.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines, a verificação mínima): exit 0, 412 arquivos e 7631 testes.
- `npx eslint` nos dois arquivos alterados: limpo.
- Instruções lidas: `CLAUDE.md › O "defeito 01": dois donos do mesmo dado`, `CLAUDE.md › Convenções que valem em todo o repositório`; `apps/store/CLAUDE.md › Mobile — o que quebra e não grita` (e o Design system), `apps/store/CLAUDE.md › Carrinho, chrome e checkout`, `apps/store/CLAUDE.md › O checkout NÃO exige conta`; `.specs/project/PROJECT.md › Comandos de verificação`, `› Ambiente local`.

## Divergências e descobertas

- Retomada: a implementação e os 12 testes já estavam na árvore, deixados pela corrida interrompida. Nada foi reescrito: rodei a fatia, fiz o check de mutação e cumpri as obrigações e a verificação mínima.
- As fatias estão como `retomada` na coluna Mutação. Mesmo assim o check de mutação rodou nesta corrida, e todas morreram.
- O `Depende de` confere: `cepOrigin` e `setCepOrigin` estão em `checkoutStore.ts`, e a gaveta (`useCartShipping.ts`) grava `cepOrigin: 'sacola'`.
- As linhas citadas no `DeliveryBlock.tsx` deslocaram por causa do acréscimo desta tarefa: a semeadura está agora em ~231-243, o preenchimento em ~246-259 e a troca de CEP em ~262-275. Relocalizei pelo alvo.
- Não houve propagação.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 10
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Convenções que valem em todo o repositório; apps/store/CLAUDE.md › Mobile — o que quebra e não grita, Carrinho, chrome e checkout, O checkout NÃO exige conta; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx › "DeliveryBlock — o CEP trazido da sacola": CA-09 (CEP, rua/bairro/cidade/UF, opção marcada, linha "Trazido da sua sacola · Bela Vista — São Paulo/SP", foco no Número) e as variantes do foco e da linha sem busca; a opção que sumiu é desfeita, o preço novo vale, a retirada é preservada; outro CEP tira a linha; endereço salvo com o mesmo CEP entra inteiro (completo e limpo), com outro CEP não entra; sem cepOrigin o bloco é o de hoje. Tudo coberto.
Verificações: DeliveryBlock.test.tsx 91/91; CheckoutPage, checkoutSobreviveAVoltaDaAba, compreJuntoSacolaECheckout, accentText, touchTarget, fieldBorder e features/checkout com 710/710; tsc do store com 0 erros; suíte do store com 7631/412 e exit 0; eslint limpo nos dois arquivos; 6 mutantes, 6 mortos por asserção
Árvore de trabalho: apps/store/src/features/checkout/ui/DeliveryBlock.tsx e apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx (alterados, sem commit)
Citações conferidas: 3. As linhas do DeliveryBlock.tsx (semeadura, preenchimento, troca de CEP) deslocaram por causa do acréscimo desta tarefa e foram relocalizadas pelo alvo. Nenhuma morta
```

## T10 — wi-impl-review · done · agente a422413c099127606

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/10-checkout-recebendo-da-sacola.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| CA-09 provado no componente | `DeliveryBlock.tsx`: a linha `role="status"` (13px, `ink-soft`, ponto de 6px em `accent`) logo abaixo do CEP, mostrada quando `daSacola`; o foco no Número por `numberRef` e `focusedNumber`. Teste em `DeliveryBlock.test.tsx`: "abre com o CEP, o endereço da busca, a opção da gaveta marcada, a linha de origem e o foco no Número" | sim |
| a regra do endereço salvo × CEP da gaveta provada | A semeadura usa `mesmoCepDaSacola` (`stripCep` dos dois lados). Testes "MESMO CEP recebe o endereço inteiro…" e "OUTRO CEP: o endereço salvo não entra" | sim |
| cada comportamento do bloco `Testes` coberto por um teste escrito | o `describe('DeliveryBlock — o CEP trazido da sacola')` | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

- `CheckoutPage*.test.tsx` e `checkoutSobreviveAVoltaDaAba.test.tsx` verdes: o diff não toca nesses arquivos nem no arnês deles. O resultado é só execução.
- O ponto em `accent` é decoração: ele é `<span aria-hidden className="… bg-estrelinha-accent">` e não carrega texto, então não é texto ouro. O `accentText` passar é só execução.
- `touchTarget` e `fieldBorder`: o diff não acrescenta controle nem campo. Ele só põe `ref` no `<Input>` do Número, que já existia. O resultado é só execução.

## Testes

- CA-09 (CEP, rua/bairro/cidade/UF, opção marcada, linha exata "Trazido da sua sacola · Bela Vista — São Paulo/SP", foco no Número): `DeliveryBlock.test.tsx`. Morde. Confere o `textContent` exato e `document.activeElement`. Os casos vizinhos cobrem: a frase sem a busca, o foco uma vez só ao fechar e reabrir, o foco quando o bloco abre depois e nenhum foco com o número preenchido.
- A opção que sumiu da cotação é desfeita: morde. Sem o efeito novo, o `serviceId` '9' ficaria no rascunho, porque o efeito do custo sai cedo quando não acha a opção. Para "o preço novo vale": o teste confere `cost: 16.4`. Esse comportamento já existia (o efeito de custo de antes) e o teste o fixa como regressão. A retirada que não é desfeita também tem caso próprio.
- Digitar outro CEP tira a linha: morde. Confere a ausência da linha e `cepOrigin` nulo.
- Endereço salvo com o mesmo CEP: morde. Com o código de antes, `number` seria '' e o teste falharia. Ele confere `isDeliveryComplete` e o bloco não sujo, que é o que faz a página o recolher. O recolhimento em si é decidido pela `CheckoutPage`, fora deste componente.
- Endereço salvo com outro CEP: confere `number`/`complement` vazios e a rua da busca. Já passava com o código de antes, então serve de guarda de regressão. É coerente com D-11.
- Sem `cepOrigin`: sem linha, sem nenhum `status` e sem foco no Número. Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Desfazer a opção que sumiu só com `cepOrigin === 'sacola'`, nunca a retirada | sim | O PRD diz "se a opção sumiu da cotação, a escolha é desfeita… como hoje quando o CEP muda". A retirada fica fora de `options` também no efeito de custo que já existia (`PICKUP_SERVICE_ID`). O efeito sai cedo com `options` vazio, então não desfaz nada enquanto a cotação carrega | sim |
| 2 | "Mesmo CEP" comparado por `stripCep` dos dois lados | sim | `checkoutStore.setAddress` também compara por dígitos ("o mesmo CEP com outra máscara, não mexem na origem") | sim |
| 3 | O foco uma vez por montagem, disparado quando `open` fica verdadeiro | sim | Bate com D-14 ("quando o bloco abre com `cepOrigin === 'sacola'` e o número vazio"). Os casos de abrir depois e de reabrir estão testados | sim |
| 4 | Sem rua, cidade e UF da busca (ou com a busca em `manual`), a frase sozinha; o bairro vazio sai | sim | É a decisão escrita na tarefa: "sem a busca, 'Trazido da sua sacola' sozinho" | sim |

## Não conferido

- A execução dos testes e dos guardas (`accentText`, `touchTarget`, `fieldBorder`) e as suítes da `CheckoutPage`: eu não rodo teste.
- O caso em que o endereço salvo chega depois do primeiro render (a consulta ainda em voo): o foco no Número pode acontecer antes de o número salvo entrar. Só a execução mostraria; não é achado.
- "O bloco abre recolhido" de ponta a ponta: o componente prova completo e não sujo; quem colapsa é a `CheckoutPage`.
- O comentário novo em `DeliveryBlock.tsx:337` cita "feature 63". Não registrei como achado de identificador de processo, porque o identificador já estava no mesmo arquivo antes da tarefa (`:14`, `:207`).
- Os dois arquivos aparecem como `M` no diff, então há baseline. A árvore tem trabalho de outras tarefas, fora destes dois arquivos, que não julguei.

Instruções lidas: não reli os arquivos de instruções por seção nesta rodada. Usei o `CLAUDE.md` da raiz, carregado no contexto (as seções "O defeito 01" e "Convenções que valem em todo o repositório"). Não abri `apps/store/CLAUDE.md` › "Carrinho, chrome e checkout" nem "Mobile — o que quebra e não grita". Nenhum achado se apoia neles, mas a conformidade com essas seções fica sem conferir.

## T11 — wi-impl-task · review · agente accd937e67320ae5b

Tarefa: .specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/11-paridade-e-fecho.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Montei as duas telas reais **uma depois da outra** no mesmo `QueryClient`: primeiro `CartDrawer`, depois `DeliveryBlock` (aberto) com `OrderSummary variant="sidebar"`. O checkout abre sobre o rascunho que a gaveta deixou. | A `CheckoutPage` inteira, que exige uns quinze dublês (auth, pagamento, Brick, conta). E as duas telas montadas juntas, que deixaria os efeitos das duas brigando pelo `shipping`. | É o percurso real da cliente, e cada tela já tem um precedente no repositório (`compreJuntoSacolaECheckout`, `DeliveryBlock.test`). A cotação é dublada no `supabase.functions.invoke`, então os dois lados usam o `useShippingQuote` real. | o arquivo de teste |
| 2 | A forma de pagamento fica em `null`, sem PIX escolhido. | Testar com PIX. | A gaveta não aplica desconto PIX. Com PIX escolhido os dois Totais diferem por definição, e o CA-04 compara "mesma opção, cupom e promoção". | o arquivo de teste |
| 3 | No CA-04 usei cupom fixo de R$ 20 e promoção de 10 % a partir de 2 unidades, acumulável com cupom, e CEP da BA (frete somado). O total esperado, R$ 181,50, foi calculado à mão e é cobrado nas duas telas, além da igualdade entre elas. | Cobrar só a igualdade. | Só a igualdade passaria com as duas telas erradas do mesmo jeito. | o arquivo de teste |
| 4 | Registrei o WI 99 no `CLAUDE.md` raiz no formato do parágrafo do WI 98. | A "mesma forma do WI 102". | O WI 102 não está registrado no `CLAUDE.md` raiz (ver Divergências). | `CLAUDE.md` raiz |
| 5 | Atualizei a contagem de migrations no `supabase/CLAUDE.md` de 71 para 105, contadas do disco. | Deixar o número velho. | A seção nomeia um número que já não existia, e o fecho manda atualizar o que a feature toca. | `supabase/CLAUDE.md` |
| 6 | Também remedi o mobile-adm (2734/176). | Não medir, por não ter sido tocado. | `core` mudou e o app do ateliê consome `core`; a medição é barata. | só a linha de baseline |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | CA-16: CEP de SP e do RS, faixa alcançada, Sul + Sudeste. "liberado", PAC "Grátis" com R$ 21,50 riscado, e o mesmo Total sem frete (R$ 200,00) na gaveta e no checkout | integração (stores reais) | `apps/store/src/test/sacolaECheckoutMesmoTotal.test.tsx` (`it.each` SP/RS) | sim | vermelho |
| 2 | CA-17: CEP da BA. "só para Sul e Sudeste", sem barra, e o mesmo Total com o frete cotado (R$ 221,50) nas duas | integração | idem | sim | não se aplica |
| 3 | CA-04: com cupom e promoção, o mesmo Total (R$ 181,50) nas duas, com a mais barata marcada | integração | idem | sim | não se aplica |

O check de mutação da fatia 1 foi extra (o teste não sobe infraestrutura): troquei `granted: freteGratis.granted` por `granted: false` no `DeliveryBlock.tsx`. Os dois casos de SP/RS ficaram vermelhos, como esperado. Restaurei pela cópia e conferi com `cmp`.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/test/sacolaECheckoutMesmoTotal.test.tsx criado
CLAUDE.md alterado
apps/store/CLAUDE.md alterado
apps/backoffice/CLAUDE.md alterado
packages/core/CLAUDE.md alterado
supabase/CLAUDE.md alterado

## Verificação

Todos os comandos vieram do `CLAUDE.md` (§Comandos e §Baselines). O comando de rodar um arquivo é a forma registrada no `PROJECT.md` §Comandos de verificação.

- `pnpm --filter @estrelinha/store exec vitest run src/test/sacolaECheckoutMesmoTotal.test.tsx --testTimeout=20000` → 4/4 verdes. Depois do conserto do lint também 4/4. Com o mutante, 2 vermelhos e 2 verdes.
- Guardas que leem prosa, rodados depois de editar a documentação (`brandScan`, `authSenderDomain`, `touchTarget`, `folgaDoHeader`, `icons`, `emailCheckWorkflow`, `authEmailTemplates`, `Button`, `AboutPage`, `drawerFacts`, `Header`) → 12 arquivos, 245 casos, exit 0.
- Suítes, um workspace por vez, exit fora de pipe:

| Workspace | Arquivos | Testes | Exit |
|---|---|---|---|
| core | 253 | 6091 | 0 |
| functions | 49 | 1711 | 0 |
| backoffice | 307 | 5398 | 0 |
| store | 413 | 7635 | 0 |
| mobile-adm | 176 | 2734 | 0 |

- Tipos (`npx tsc --noEmit -p …`), sem erro novo contra o baseline:
  - store: 0;
  - mobile-adm: 0;
  - backoffice: 7, todos em `ProposalStateBadge.test.tsx`, herdados;
  - `packages/core`: 11, herdados (carousel 5, pickHomeBanners 1, pickHomeCollections 1, urls 2, `packages/supabase/src/client.ts` 2).
- `npx eslint .` em cada app: store 2/2, backoffice 23/5, mobile-adm 0/0, iguais ao baseline. O arquivo novo saiu limpo depois de trocar um NBSP literal no regex pelo escape ` `.
- Leitura só: `psql` no banco local (porta 54442) confirmou que a migration `20261130150000` está aplicada e que `shipping.free_shipping_regions` tem as cinco regiões.

Instruções lidas:
- `CLAUDE.md` (raiz): idêntico ao da árvore principal, já no contexto. Seções: Os guardas — o que trava o quê; Baselines; Estado conhecido / dívidas; O que espera decisão da dona, não código.
- `apps/store/CLAUDE.md` › Carrinho, chrome e checkout; › Frete grátis — um interruptor e um dono só (feature 37).
- `apps/backoffice/CLAUDE.md` › Configurações › Frete — o interruptor do frete grátis (feature 37).
- `packages/core/CLAUDE.md` › Os módulos.
- `supabase/CLAUDE.md` › Migrations.
- `.specs/project/PROJECT.md` › Comandos de verificação; › Ambiente local.

## Divergências e descobertas

- **WI 102 ausente**: a tarefa diz "na mesma forma dos WIs 98 e 102 já registrados lá", mas o `CLAUDE.md` raiz não registra o WI 102 — nem baseline nem bullet. Segui a forma do WI 98, e o parágrafo do WI 99 avisa que o delta não é a diferença contra o WI 98, porque o WI 102 entrou na `master` sem a tabela ser remedida.
- **Mutação sem check**: as fatias 2 e 3 (BA e cupom + promoção) passaram de primeira sem check de mutação. Elas são de integração; o mutante do `granted` não as alcança por construção. A revisão deve olhar as asserções delas; as duas cobram valores calculados à mão (221,50 e 181,50) nas duas telas.
- **Sem prova em navegador**: a paridade foi provada só em jsdom. Ficou registrado em "Estado conhecido" que Validation, prova em navegador e QA ainda não correram.
- **Dívidas registradas como decididas na tarefa**: PR-11, a Pergunta 2, a faixa 78900–78999 por `[conhecimento]` e a ordem de publicação. O texto delas saiu do que o código diz (`region.ts`, `proposal.ts`, `handlers.ts`), sem abrir a costura.
- **Sem defeito de produto**: nenhum achado.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 11
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Os guardas, Baselines, Estado conhecido / dívidas, O que espera decisão da dona; apps/store/CLAUDE.md › Carrinho, chrome e checkout, Frete grátis (feature 37); apps/backoffice/CLAUDE.md › Configurações › Frete; packages/core/CLAUDE.md › Os módulos; supabase/CLAUDE.md › Migrations; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: apps/store/src/test/sacolaECheckoutMesmoTotal.test.tsx — CA-16 (SP e RS, it.each), CA-17 (BA), CA-04 (cupom + promoção); os três comportamentos do bloco Testes estão cobertos
Verificações: arquivo novo 4/4; guardas que leem prosa 245/245; suítes core 6091/253, functions 1711/49, backoffice 5398/307, store 7635/413, mobile-adm 2734/176, todas exit 0; tsc 0 · 7 · 0 · core 11 (herdados); lint 2/2 · 23/5 · 0/0; mutação no granted do DeliveryBlock ficou vermelha e foi restaurada byte a byte
Árvore de trabalho: criado apps/store/src/test/sacolaECheckoutMesmoTotal.test.tsx; alterados CLAUDE.md, apps/store/CLAUDE.md, apps/backoffice/CLAUDE.md, packages/core/CLAUDE.md, supabase/CLAUDE.md; nada commitado
Citações conferidas: 2 abertas (o contrato das stores reais e o dos cinco CLAUDE.md); nenhuma deslocou; nenhuma morta. A forma "WI 102 já registrado" não bate: o WI 102 não está no CLAUDE.md raiz
```

## T11 — wi-impl-review · done · agente ab8d4a8a03a9f85bb

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/11-paridade-e-fecho.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o teste de paridade passa nos três cenários | `apps/store/src/test/sacolaECheckoutMesmoTotal.test.tsx` (`it.each` SP/RS, o caso da BA, o caso com cupom e promoção) | só execução |
| os cinco `CLAUDE.md` registram a feature, os guardas, a dívida e o que espera a dona | raiz: as linhas dos guardas `storeSettingsDefaults`, `freeShippingSingleOwner`, `denoReach (shipping)` e `sacolaECheckoutMesmoTotal`; o parágrafo de baseline do WI 99; em "Estado conhecido", PR-11, a Pergunta 2, a faixa 78900–78999 e a ordem de publicação; em "O que espera decisão da dona", a linha das regiões. `apps/store`, `apps/backoffice`, `packages/core` e `supabase` com as seções novas | sim |
| as baselines medidas e registradas | parágrafo do WI 99 em "Baselines" do `CLAUDE.md` raiz (core 6091/253 · functions 1711/49 · store 7635/413 · backoffice 5398/307 · mobile-adm 2734/176, tipos, lint) | só execução (os números) |
| cada comportamento do bloco `Testes` coberto por um teste escrito | os três `it` do arquivo novo | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- brandScan e os guardas que leem prosa (descrever a forma proibida, não escrevê-la): cumprida. A prosa nova não traz nenhum import proibido nem a marca anterior. A guarda das migrations aparece só como `value ||` / `NOT value ?`, que é a mesma forma já usada no arquivo.
- Não alterar a regra nem os componentes: cumprida dentro de `alterados`, que só tem o teste novo e os cinco `CLAUDE.md`.

## Testes

- CA-16 (SP e RS acima da faixa, Sul + Sudeste) está em `sacolaECheckoutMesmoTotal.test.tsx`, no `it.each`. A asserção morde. Ela cobra nas duas telas "Frete grátis liberado", o PAC marcado, "Grátis", o riscado `['R$ 21,50']` e o Total fixo `R$ 200,00`, e compara os dois Totais. Com o frete somado, o Total sairia R$ 221,50 e o caso reprovaria.
- CA-17 (BA) está no mesmo arquivo, no segundo `it`. A asserção morde. Ela cobra o texto "só para Sul e Sudeste", a ausência de "liberado" e de `progressbar` nas duas telas, o PAC sem "Grátis" e o Total fixo `R$ 221,50` nas duas. Esta fatia está em `sem mutação`, e a leitura da asserção basta: um Total sem frete (R$ 200,00) reprovaria.
- CA-04 (cupom e promoção) está no mesmo arquivo, no terceiro `it`. A asserção morde. Ela cobra a mais barata marcada, `R$ 181,50` calculado à mão nas duas telas, "Cupom SAUDADE" no resumo e a igualdade entre as duas. Também está em `sem mutação`. Esquecer a promoção (R$ 201,50), o cupom (R$ 201,50) ou o frete (R$ 160,00) reprovaria. Não é tautológico, porque o valor esperado não sai do código.
- Nível: integração, com as stores reais, como o bloco declara.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Montar a gaveta e depois o DeliveryBlock + OrderSummary no mesmo QueryClient | sim | O Contrato pede "as stores reais (`cartStore`, `useCheckoutStore`), a cotação dublada", e o teste faz isso. A `CheckoutPage` inteira não é exigida pela tarefa | sim |
| 2 | Pagamento em `null`, sem PIX | sim | CA-04 compara "mesma opção, cupom e promoção". A gaveta não tem PIX | sim |
| 3 | Valores à mão (R$ 181,50) além da igualdade | sim | Torna a asserção mordente | sim |
| 4 | Registrar no formato do WI 98, porque o WI 102 não está no `CLAUDE.md` raiz | sim | `grep` no `CLAUDE.md` raiz não acha registro do WI 102, só a menção que o próprio diff acrescentou. A afirmação da tarefa ("WIs 98 e 102 já registrados lá") estava errada | sim |
| 5 | Contagem de migrations 71 → 105 | sim | `ls supabase/migrations/*.sql \| wc -l` = 105 | sim |
| 6 | Remedir o mobile-adm | sim | `core` mudou e o mobile-adm o consome. Só a linha de baseline muda | sim |

## Não conferido

- Se o teste passa e se os números de baseline estão certos: depende de execução, e esta revisão não roda teste.
- Se cada réguas descrita nos `CLAUDE.md` existe como está escrito. Conferi por amostra: `freeShippingSingleOwner` com escopo `['apps', 'supabase/functions']`, o allowlist de regiões com dois arquivos e `ESCOPO_FAIXAS` incluindo `packages`; `denoReach` com `region.ts` em `ENTRADAS` e o sensor. O que `storeSettingsDefaults` assere sobre a migration da 99 não foi conferido linha a linha.
- Os cinco `CLAUDE.md` estão versionados e o arquivo de teste aparece como `A` (intent-to-add), então o diff alcança todos os `alterados`.

Instruções lidas: `CLAUDE.md` (raiz) › "Os guardas — o que trava o quê", "Baselines", "Estado conhecido / dívidas", "O que espera decisão da dona, não código", lidas pelo contexto carregado (a versão do checkout principal) e pelo diff da worktree. As seções de `apps/store/CLAUDE.md` › "Frete grátis — um interruptor e um dono só (feature 37)" e "Carrinho, chrome e checkout", de `apps/backoffice/CLAUDE.md` › "Configurações › Frete — o interruptor do frete grátis", de `packages/core/CLAUDE.md` › "Os módulos" e de `supabase/CLAUDE.md` › "Migrations" foram lidas só pelo trecho que o diff alterou, sem a seção inteira.

## T14 — wi-impl-task · review · agente a1ce47cdbbf2e1ad9

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/14-bugs-004-005-gaveta-faixa-frete-gratis.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O balão do ⓘ (BUG-004) passa a usar `collisionPadding={12}` e a largura `w-[var(--radix-popper-available-width)]`. Com a gaveta como `collisionBoundary` (já passada pela faixa), o Radix calcula essa largura como a caixa menos 12 px de cada lado, porque o `shift` dele está ligado no eixo principal: na gaveta de 390 dá 366 px, e o `shift` encosta o balão a 12 px da borda. Conferi no fonte: `@radix-ui/react-popper` 1.3.3 com `@floating-ui/core` 1.8.0, `size` → `availableWidth = maximumClippingWidth` quando `shift.enabled.x` | Largura fixa em `calc(100vw-24px)`, que só vale para a gaveta de largura cheia. Também descartei medir a gaveta por ref em `CartDrawer.tsx`, que é da tarefa 13 | É a menor superfície (só `InfoTip.tsx`) e não depende da largura da gaveta nem de onde o ⓘ está na linha | `InfoTip` é usado só pela `FreeShippingBand` (conferido por grep). Sem `collisionBoundary`, o balão vai de borda a borda da tela, a 12 px de cada lado. O reteste em navegador é que confirma a medida |
| 2 | A altura mínima de 22 px (BUG-005) fica no `<p>` da linha do `Destaque`. Os dois desenhos dourados ganham a classe: "liberado" e "para Sul e Sudeste" sem CEP | Pôr `min-h-[42px]` na faixa inteira | O protótipo põe o `min-height` na linha (`.fg2-l`), e o desenho "para Sul e Sudeste" é a mesma `.fg2.ok` | só `FreeShippingBand.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O `PopoverContent` do ⓘ declara `collisionPadding` 12 e a largura disponível do Radix, sem teto fixo (`w-[min(…)]` ou `w-72`), por token exato (BUG-004) | componente | `apps/store/src/shared/ui/__tests__/InfoTip.declaracao.test.tsx` | sim | — (passou pelo vermelho) |
| 2 | A linha da faixa "liberado" declara `min-h-[22px]`, e a faixa `py-2.5`/`px-5`, por token exato e no próprio nó da linha (BUG-005) | componente | `apps/store/src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx` | sim | — (passou pelo vermelho) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/shared/ui/InfoTip.tsx alterado
apps/store/src/shared/ui/__tests__/InfoTip.declaracao.test.tsx alterado
apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx alterado

## Verificação

- **Os dois arquivos de teste, antes do conserto:** `pnpm --filter @estrelinha/store exec vitest run <arquivos> --testTimeout=20000` (PROJECT.md). 2 casos falharam, os dois novos, como esperado.
- **Depois do conserto:** o mesmo comando, nos dois `InfoTip*`, em `FreeShippingBand` e nos guardas `accentText`, `contrast`, `touchTarget`, `freeShippingSingleOwner` e `arbitraryTextColor` (PROJECT.md). Saiu com exit 0: 8 arquivos, 148 testes.
- **Tipos:** `npx tsc --noEmit -p apps/store/tsconfig.app.json` (arquivo de instruções). Exit 0, com 0 erros, igual ao baseline do store (0).
- **Verificação mínima, suíte da loja:** `pnpm --filter @estrelinha/store test --testTimeout=20000` (arquivo de instruções), rodada duas vezes.
  - **1ª rodada:** os 7639 testes passaram, em 413 arquivos. O exit foi 1 só por um erro do worker, `Timeout calling "onTaskUpdate"`, que é contenção de máquina e não falha de teste.
  - **2ª rodada:** 7640 de 7646 testes passaram, com exit 1 pelo mesmo erro do worker. Os 6 que falharam estão todos em `src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx`, que a tarefa 12 está editando em paralelo, dentro da cerca dela. Esse arquivo não usa `InfoTip` nem `FreeShippingBand`.

Instruções lidas:
- `CLAUDE.md` (raiz) › Comandos, Convenções que valem em todo o repositório, Os guardas — o que trava o quê, Baselines
- `apps/store/CLAUDE.md` › Design system, Mobile — o que quebra e não grita, Carrinho, chrome e checkout (com "A prévia de frete na gaveta…"), Frete grátis — um interruptor e um dono só (com "Por região do CEP")
- `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local

## Divergências e descobertas

- **Asserções mudadas por mudança de valor:** reescrevi o caso de `InfoTip.declaracao.test.tsx` que cravava `collisionPadding` 16 e `w-[min(18rem,calc(100vw-32px))]`. O sensor de token exato do arquivo passou a usar o token novo. É mudança de valor pedida pelo bug, não asserção afrouxada: o caso novo também recusa qualquer teto fixo.
- **Tarefa já fechada que ficou desatualizada:** a 02 (`02-info-tip-da-loja.md:50` e `:67`) afirma `collisionPadding={16}` e a largura `w-[min(18rem,calc(100vw-32px))]`. Não reescrevi; está na linha `Caducou`.
- **Suíte da loja vermelha por trabalho de outra tarefa:** os 6 casos de `DeliveryBlock.test.tsx` que falharam na 2ª rodada são da tarefa 12 em andamento (o `DeliveryBlock.tsx` e o teste dele aparecem como modificados na árvore). Não toquei neles.
- **Erro do worker do vitest:** `Timeout calling "onTaskUpdate"` apareceu nas duas rodadas e deu exit 1 mesmo na rodada sem nenhum teste falhando. É contenção de máquina, a mesma que o CLAUDE.md da raiz já registra.
- **Só o navegador mede:** a largura de 366 px e a altura de 42 px dependem do layout real. Estão provadas pela classe e pela prop declaradas, e a medida fica para o reteste do QA.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 14
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos, Convenções que valem em todo o repositório, Os guardas, Baselines; apps/store/CLAUDE.md › Design system, Mobile — o que quebra e não grita, Carrinho, chrome e checkout, Frete grátis — um interruptor e um dono só (com "Por região do CEP"); .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: BUG-004 — apps/store/src/shared/ui/__tests__/InfoTip.declaracao.test.tsx (collisionPadding 12, largura w-[var(--radix-popper-available-width)] por token exato, sem teto fixo); BUG-005 — apps/store/src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx (linha da faixa "liberado" com min-h-[22px], faixa com py-2.5/px-5, por token exato no nó da linha). A medida real (366 px, 42 px) fica para o reteste em navegador, porque o jsdom não mede layout.
Verificações: os dois arquivos falharam antes do conserto e passaram depois; InfoTip*, FreeShippingBand e os guardas accentText, contrast, touchTarget, freeShippingSingleOwner e arbitraryTextColor passaram (148/148); tsc do store com 0 erros (baseline 0); suíte da loja: 1ª rodada com 7639/7639 testes passando e exit 1 só pelo timeout do worker, 2ª rodada com 7640/7646 e as 6 falhas em DeliveryBlock.test.tsx, da tarefa 12 em paralelo.
Árvore de trabalho: apps/store/src/shared/ui/InfoTip.tsx, apps/store/src/shared/ui/__tests__/InfoTip.declaracao.test.tsx, apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx, apps/store/src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx
Citações conferidas: 4 (FreeShippingBand.tsx, InfoTip.tsx, freeShippingState/freeShippingRuleText consumidos sem alteração, exemplar infoGutter.test.tsx); nenhuma deslocada nem morta
Caducou: tarefa 02 · "collisionPadding={16}; largura w-[min(18rem,calc(100vw-32px))]" (02-info-tip-da-loja.md:50 e :67) · BUG-004 trocou para collisionPadding 12 e a largura disponível do Radix (balão de borda a borda da gaveta, a 12 px de cada lado)
```

## T13 — wi-impl-task · review · agente a20be753a41e0355e

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/13-bugs-003-006-007-gaveta-rodape.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | BUG-006: corrigi pelo botão, com `[&_svg]:size-5` na className do "Finalizar Pedido". O `twMerge` do `Button` substitui o `[&_svg]:size-4` do design system, e o teste confere que ele saiu. O ícone continua com `h-5 w-5` | Mexer no `packages/ui/button.tsx`, ou usar `!important` no ícone | O `h-5 w-5` já estava no ícone, e o 16 px vinha do seletor descendente do `Button`, que tem especificidade maior. Trocar no botão é a menor superfície e não toca nos outros consumidores do `Button` | só o botão "Finalizar Pedido" da gaveta |
| 2 | BUG-003: para caber no teto, cortei 10 px (pela soma das classes) em três pontos e deixei intactos os alvos de toque e as medidas que o QA conferiu contra o protótipo. O `pt` do resumo passou de 10 para 8 (`pt-2`). A linha do Total passou a `leading-6` (24 px no lugar de 28; as fontes continuam em 16 e 18 px). A caixa do CTA passou de `pt-[10px] pb-[14px]` para `pt-2 pb-3` (8 e 12). Pela soma, o rodapé com o frete escolhido e o prazo em duas linhas sai de 273 para 263. O navegador mediu 3 px a mais que a soma antes do conserto, então o esperado no reteste é ~266 px, perto da régua de ~265 do `item.md` | Tentar caber o prazo da linha recolhida numa linha só; reduzir "Tem um cupom?" (44 px) ou o CTA (48 px) | Não dá para garantir o prazo numa linha só pela largura a 390, e encolher alvo de toque viola o CA-13. Não tenho acesso ao protótipo para os paddings do resumo e da caixa do CTA, então escolhi valores fáceis de desfazer | o rodapé da gaveta (resumo e caixa do CTA), visível no reteste do QA do BUG-003. O `md:pb-5` do desktop ficou como estava |
| 3 | Pus os testes novos num `describe` próprio dentro de `sacolaComFrete.test.tsx` | Criar um arquivo novo; usar o `sacolaMedida.test.tsx` | O `sacolaComFrete` já tem o arnês da cotação que o caso do frete recolhido precisa, e está fora da cerca das tarefas 12 e 14. O `sacolaMedida.test.tsx` só testa analytics (`view_cart` e companhia), sem nenhuma medida de layout | só o arquivo de teste |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O ícone do "Finalizar Pedido" declara 20 px (`[&_svg]:size-5`, sem `size-4`) — BUG-006 | componente | sacolaComFrete.test.tsx › "o ícone da sacola no "Finalizar Pedido" tem 20px…" | sim | — |
| 2 | A linha recolhida do frete declara `gap-[10px]`, sem `gap-3` — BUG-007 | componente | sacolaComFrete.test.tsx › "a linha recolhida do frete tem 10px…" | sim | — |
| 3 | As classes do rodapé somam ≤ 270 px com o frete escolhido — BUG-003 | componente | sacolaComFrete.test.tsx › "com o frete escolhido, as classes do rodapé somam no máximo 270px…" | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx — alterado
apps/store/src/widgets/cart-drawer/ui/CartShipping.tsx — alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx — alterado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx --testTimeout=20000` (PROJECT.md): os 3 casos novos ficaram vermelhos antes da implementação, todos por asserção. Depois, verdes.
- `pnpm --filter @estrelinha/store exec vitest run src/widgets/cart-drawer/ui/__tests__ --testTimeout=20000` (PROJECT.md): exit 0, 7 arquivos, 119 testes.
- Guardas `touchTarget`, `accentText` e `contrast`, com o comando de um arquivo do PROJECT.md: exit 0 nos três.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md §Comandos): exit 0. Baseline 0, então nenhum erro novo.
- Verificação mínima, a suíte do store, `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md §Baselines): exit 1, 7639 passaram e 6 falharam, em 413 arquivos. Nenhuma falha é desta tarefa:
  - 4 em `features/checkout/ui/__tests__/DeliveryBlock.test.tsx`, arquivo da tarefa 12 com trabalho em curso (cerca).
  - 2 em `shared/lib/__tests__/marcacaoSoPorAcao.test.ts`, com `Test timed out in 20000ms`: contenção, porque outras tarefas rodavam suítes na mesma máquina. Esse guarda lê RPCs e tabelas, e esta tarefa só mudou strings de classe.
  - Uma segunda rodada isolada desse guarda estourou os 120 s da ferramenta e não terminou. Fica sem resultado.

Instruções lidas: CLAUDE.md (raiz, no contexto) › "Convenções que valem em todo o repositório", "Os guardas — o que trava o quê", "Comandos", "Baselines"; apps/store/CLAUDE.md › "Design system", "Mobile — o que quebra e não grita", "Carrinho, chrome e checkout" (com "A prévia de frete na gaveta…"); .specs/project/PROJECT.md › "Comandos de verificação", "Ambiente local".

## Divergências e descobertas

- O BUG-006 não vinha do ícone: ele já declarava `h-5 w-5`. Quem forçava os 16 px era o `[&_svg]:size-4` do `Button` de `packages/ui`. Qualquer ícone em `Button` da loja tem o mesmo teto, a menos que o botão troque a regra.
- A tarefa manda não afrouxar as asserções de `sacolaMedida.test.tsx`, mas esse arquivo só testa analytics, sem medida de layout. Os testes de medida do rodapé estão em `sacolaComFrete.test.tsx`, e nenhuma asserção dele foi tocada.
- Os 270 px se provam só pela soma das classes. jsdom não mede layout, e a medida real é do reteste em navegador a 390 × 844.
- `marcacaoSoPorAcao.test.ts` estourou o teto de 20 s duas vezes na suíte cheia (contenção, ver Verificação). A rodada isolada ficou sem resultado.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 13
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Convenções, Os guardas, Comandos, Baselines; apps/store/CLAUDE.md › Design system, Mobile — o que quebra e não grita, Carrinho, chrome e checkout; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: BUG-006, ícone de 20 px (`[&_svg]:size-5`, sem `size-4`); BUG-007, `gap-[10px]` na linha recolhida; BUG-003, as classes do rodapé que somam ≤ 270 px com o frete escolhido. Os três em apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx, describe "a gaveta — as medidas do rodapé (régua do protótipo v2)". A altura real fica para o reteste em navegador (jsdom não mede layout)
Verificações: os 3 casos ficaram vermelhos antes e verdes depois; widgets/cart-drawer/ui/__tests__ verde (119/7); touchTarget, accentText e contrast verdes; tsc do store 0. Suíte do store: 6 falhas fora desta tarefa, 4 no DeliveryBlock.test.tsx (tarefa 12, em curso) e 2 de timeout por contenção no marcacaoSoPorAcao.test.ts
Árvore de trabalho: apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx (pt do resumo 8, linha do Total leading-6, caixa do CTA pt-2 pb-3, `[&_svg]:size-5` no "Finalizar Pedido"); apps/store/src/widgets/cart-drawer/ui/CartShipping.tsx (`gap-[10px]` na linha recolhida); apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaComFrete.test.tsx (3 casos novos)
Citações conferidas: 3 (CartDrawer.tsx, CartShipping.tsx, useCartShipping consumido sem alteração); nenhuma deslocada nem morta. O `sacolaMedida.test.tsx` existe, mas testa analytics, não medidas
```

## T13 — wi-impl-review · done · agente a1acba4675f53aafb

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/13-bugs-003-006-007-gaveta-rodape.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-003: o rodapé a 390 × 844, 100 %, com o frete escolhido, mede ≤ 270 px (pela leitura das classes) | `CartDrawer.tsx:192` (`pt-2`), `:244-245` (`leading-6` no Total e no valor), `:253` (`pb-3 pt-2`). Somei as classes: borda 1 + linha do frete 65 + cupom 45 + resumo 84 + caixa do CTA 68 = 263 (antes 273). Com a mesma diferença de +3 que o QA mediu no navegador, fica em ~266 | sim pela soma das classes; só a execução confirma (reteste) |
| BUG-006: ícone do "Finalizar Pedido" de 20 px | `CartDrawer.tsx:258`: `[&_svg]:size-5` no Button. O `twMerge` troca o `[&_svg]:size-4` de `packages/ui/src/button.tsx:8`, que pertence ao mesmo grupo | sim |
| BUG-007: 10 px entre ícone, texto e valor na linha recolhida | `CartShipping.tsx:165`: `gap-3` → `gap-[10px]` | sim |
| cada comportamento do bloco `Testes` coberto por teste escrito | `sacolaComFrete.test.tsx:508-569`, três casos | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

- `touchTarget`, `accentText` e `contrast` verdes; `widgets/cart-drawer/ui/__tests__/*` verdes: nenhum alvo de toque diminuiu (o cupom continua `min-h-11`, o CTA `h-12`, a linha do frete `min-h-[52px]`), e nenhuma cor ou token de texto mudou. Que a suíte passa, só a execução mostra.

## Testes

- O ícone do "Finalizar Pedido" declara 20 px (token exato): `sacolaComFrete.test.tsx:513-522`. A asserção morde. Ela exige `[&_svg]:size-5` e a ausência de `[&_svg]:size-4` na className final do botão renderizado, já depois do `twMerge`. Se a correção sair, as duas asserções falham.
- A linha recolhida declara 10 px de espaço (token exato): `:524-535`. A asserção morde. Ela renderiza a linha real (calcula e escolhe o PAC), exige `gap-[10px]` e recusa `gap-3`. O regex de token exato impede que um casamento parcial passe.
- As classes de altura e espaçamento do rodapé que somam o teto (token exato): `:537-568`. A asserção morde para os três pontos alterados: `pt-2` no `dl`, `leading-6` no dt e no dd do Total, e `pt-2 pb-3` na caixa do CTA. Voltar a `pt-[10px]` ou `pb-[14px]` derruba o teste. Também trava as medidas que não podem encolher (`h-12`, `min-h-11`, `py-[7px]`, `min-h-[52px]`), e `resumo.nextElementSibling === caixaDoCta` garante que não há nota abaixo do Total. Nenhuma asserção de `sacolaMedida.test.tsx` foi tocada.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Corrigir o ícone pelo botão com `[&_svg]:size-5`, sem mexer em `packages/ui/button.tsx` | sim | `packages/ui/src/button.tsx:8` declara `[&_svg]:size-4` na base do botão, e a troca pelo mesmo grupo de utilitário é o caminho de menor alcance. O arquivo de instruções não proíbe sobrescrever a classe no consumidor | sim: o diff só toca a className desse Button |
| 2 | Cortar 10 px em três pontos (o `pt` do resumo, o `leading-6` no Total, o `pt`/`pb` da caixa do CTA) e manter os alvos de toque | sim | A tarefa exige alvos ≥ 44 px e o CTA em 48 px, e os dois estão preservados. O QA não mediu os valores alterados contra o protótipo: o BUG-003 só lista a composição do rodapé. As fontes continuam em 16 e 18 px. Não encontrei linha de instrução que contrarie | sim: só o rodapé da gaveta. `md:pb-5` mantido. Nenhuma tarefa seguinte da fila consome essas classes, até onde o recorte alcança |
| 3 | Pôr os testes num `describe` próprio dentro de `sacolaComFrete.test.tsx` | sim | O arquivo já tinha o arnês de cotação (`calcular`, `radios`) que o caso precisa. A tarefa não fixa o arquivo | sim |

## Não conferido

- Que o rodapé real fica ≤ 270 px no navegador. A diferença de 3 px entre a soma e a medida do QA não tem causa identificada. A soma dá 263 e a estimativa com essa diferença dá ~266, mas só o reteste em 390 × 844 prova.
- Que os valores escolhidos (`pt-2`, `pb-3`, `leading-6`) batem com o protótipo v2: não tive acesso a ele.
- Que as suítes de `touchTarget`, `accentText`, `contrast` e `cart-drawer/ui/__tests__` passam. Isso é execução, e eu não rodei teste nenhum.
- `FreeShippingBand.tsx` e o teste dele também aparecem modificados na árvore, mas estão fora de `alterados`: pertencem à tarefa 14, que roda em paralelo. Não os julguei.
- Os três arquivos de `alterados` aparecem como ` M` (rastreados), então o diff teve baseline e não houve arquivo sem intent-to-add.

Instruções lidas: `CLAUDE.md` (raiz, carregado no contexto: "Convenções que valem em todo o repositório", "Os guardas — o que trava o quê"); `apps/store/CLAUDE.md` › "Design system", "Mobile — o que quebra e não grita", "Carrinho, chrome e checkout" (inclui "A prévia de frete na gaveta…").

## T14 — wi-impl-review · done · agente a7d57dc7b69130d7b

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/14-bugs-004-005-gaveta-faixa-frete-gratis.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-004: o balão a 390 × 844 fica dentro da gaveta, a 12 px de cada borda | `apps/store/src/shared/ui/InfoTip.tsx:116,120`: `collisionPadding={12}` e `w-[var(--radix-popper-available-width)]`. O `collisionBoundary={panel}` já chegava pela faixa (`CartDrawer.tsx:114`). A `cn` do `PopoverContent` (`packages/ui/src/popover.tsx`) troca o `w-72` padrão por essa largura, e o Radix grava `--radix-popper-available-width` no wrapper, que o conteúdo herda | sim na declaração; a medida só a execução prova (reteste) |
| BUG-005: a faixa "Frete grátis liberado" com 42 px | `apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx:49`: `min-h-[22px]` no `<p>` do `Destaque`, que soma com o `py-2.5` já existente. Os dois desenhos dourados usam esse mesmo `Destaque` (linhas 100 e 111) | sim na declaração; os 42 px medidos só a execução prova |
| Cada comportamento do bloco `Testes` coberto por um teste escrito | `InfoTip.declaracao.test.tsx:55-64` e `FreeShippingBand.test.tsx:175-186` | sim |
| Testes dos arquivos alterados passando | — | só execução |
| Verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- Os guardas `accentText`, `contrast`, `touchTarget` e `freeShippingSingleOwner` verdes, junto com `InfoTip*.test.tsx` e `FreeShippingBand.test.tsx`: só a execução prova.
  - Pela leitura do diff, nada novo os acende:
    - nenhum texto em `accent` foi tocado;
    - `min-h-[22px]` não é uma das alturas que `touchTarget` cobra;
    - nenhuma leitura de `free_shipping_threshold` entrou no código.

## Testes

- **BUG-004** — `apps/store/src/shared/ui/__tests__/InfoTip.declaracao.test.tsx:55-64`. A asserção morde:
  - cobra `collisionPadding` 12 nas props colhidas do `PopoverContent` dublado;
  - cobra a largura `w-[var(--radix-popper-available-width)]` por token exato;
  - recusa o teto fixo antigo (`w-[min(...)]`) e o `w-72`.
  - O sensor de token exato foi atualizado para a classe nova.
  - Voltar a 16 ou à largura antiga reprova o teste.
- **BUG-005** — `apps/store/src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx:175-186`. A asserção morde:
  - lê o próprio nó da linha (`<p>`, o pai do texto, e não um vizinho);
  - cobra `min-h-[22px]` por token exato.
  - Tirar a classe reprova o teste.
  - As asserções de `py-2.5` e `px-5` já valiam antes e não somam prova, mas também não enfraquecem nada.
- **Nível:** os dois são de componente, como o bloco `Testes` declara.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `collisionPadding={12}` + `w-[var(--radix-popper-available-width)]` no balão, sem medir a gaveta por ref em `CartDrawer.tsx` | sim | `apps/store/CLAUDE.md` › "A prévia de frete na gaveta…" diz que o ⓘ recebe o painel como `collisionBoundary` "para o balão não passar da largura dela", e a decisão segue isso. A variável existe em `@radix-ui/react-popper` (`index.mjs:153`). `CartDrawer.tsx`, que a cerca protege, ficou intocado | sim: o grep confirma que `InfoTip` e `FreeShippingBand` têm um consumidor só, a `CartDrawer`, e que ela passa `collisionBoundary={panel}`. Nenhuma tarefa seguinte depende do teto antigo. A tarefa 02, já fechada, cita `collisionPadding={16}` e `w-[min(18rem,…)]`; isso caducou, e a tarefa não se reescreve |
| 2 | `min-h-[22px]` no `<p>` do `Destaque`, que serve aos dois desenhos dourados | sim | O protótipo, como a tarefa o descreve, põe o mínimo na linha (`.fg2-l{min-height:22px}`). Os dois desenhos usam o mesmo `Destaque` | sim: só `FreeShippingBand.tsx` |

## Não conferido

- **As medidas reais:** a largura de 366 px, os 12 px de cada borda e a faixa com 42 px. jsdom não mede layout, então só o reteste no navegador prova.
- **O cálculo de `availableWidth` do floating-ui:** a premissa diz que ele dá a caixa menos o padding dos dois lados quando o `shift` está ligado. Isso não foi conferido no fonte de `@floating-ui/core`, porque é comportamento que só a execução mostra.
- **Os guardas e as suítes** que a tarefa exige verdes: não foram rodados (esta revisão não executa teste).
- **Caducidade não registrada no retorno:** o `Pronto quando` e o `Contrato` da tarefa 02 (`collisionPadding={16}`, `w-[min(18rem,calc(100vw-32px))]`) ficaram falsos depois desta mudança. Se o implementador não registrou isso na linha `Caducou` do retorno dele, falta o registro. Não é achado do diff.
- **Baseline:** os quatro arquivos aparecem como `M` em `git status`, então havia baseline para todos.

Instruções lidas:
- `CLAUDE.md` (raiz, carregado no contexto) › "Convenções que valem em todo o repositório", "Os guardas — o que trava o quê" (`accentText`, `contrast`, `touchTarget`, `freeShippingSingleOwner`)
- `apps/store/CLAUDE.md` › "Design system"
- `apps/store/CLAUDE.md` › "Mobile — o que quebra e não grita"
- `apps/store/CLAUDE.md` › "Carrinho, chrome e checkout" (com "A prévia de frete na gaveta…")
- `apps/store/CLAUDE.md` › "Frete grátis — um interruptor e um dono só (feature 37)" (com "Por região do CEP")

## T12 — wi-impl-task · review · agente adf077cb1c44cfc20

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/12-bugs-001-002-checkout-entrega-endereco.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Causa do BUG-001: o efeito da busca do CEP rodava logo depois da semeadura do endereço salvo, na mesma montagem, e trocava a rua salva pela rua geral do CEP (a ViaCEP diz "Rua Siqueira Campos" para 90010-000). Na segunda ida as duas respostas já estão no cache e chegam juntas. Conserto: o `DeliveryBlock` guarda em `camposDoCep` (um ref) o CEP a que Rua, Bairro, Cidade e UF já pertencem: os que vieram semeados do endereço salvo, os que vieram da busca, os que a pessoa digitou ou os preenchidos ao montar. A busca só preenche um CEP que ainda não tem esses campos | Trocar a ordem dos efeitos; fazer a busca ignorar quem tem conta | Ordem de efeito não sobrevive à chegada assíncrona (recarregar). O ref resolve as duas ordens e também preserva o endereço digitado à mão | `DeliveryBlock.tsx`, servindo `/checkout` e `/pedido-montado`. Efeito colateral no pedido montado: a busca deixou de reescrever a rua que a Adri semeou para o mesmo CEP |
| 2 | Alterei `setAddress` (`checkoutStore.ts`), como o Contrato permite quando o conserto exige: quando o CEP muda, o patch esvazia `street`, `neighborhood`, `city` e `state` e põe `manual: false`. O que vem no mesmo patch continua valendo; número e complemento ficam | Esvaziar só dentro do componente | A gaveta troca o CEP com o checkout desmontado (só `setAddress({cep})`), então o componente não teria como saber que os campos guardados eram do CEP anterior. Com o esvaziamento no store vale a regra "o rascunho só guarda esses campos para o próprio CEP", e é ela que torna confiável o valor inicial de `camposDoCep` | Todo chamador de `setAddress` com CEP novo: o bloco Entrega, a gaveta (`useCartShipping`), `semear` do pedido montado (manda o patch inteiro e não é afetado) e os testes. As 32 suítes relacionadas, inclusive as da gaveta, e a suíte inteira da loja ficaram verdes |
| 3 | Com o CEP não localizado, o efeito também grava os quatro campos vazios com `manual: true`. Hoje isso é redundante com o item 2; ficou para deixar a regra explícita no componente | Só `manual: true` | É o comportamento que a tarefa pede (D BUG-002), e a guarda de `camposDoCep` impede que isso apague o que a pessoa digitou | `DeliveryBlock.tsx` |
| 4 | Ao trocar de CEP, número e complemento continuam | Esvaziar os seis campos | Os bugs falam de Rua, Bairro, Cidade e UF. Quem corrige o CEP não deve perder o número | `checkoutStore.ts` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | BUG-001: segunda ida da sacola (retirada → PAC) com o endereço salvo do mesmo CEP mostra a rua salva, com número e complemento, também depois de recarregar (a busca chegando antes do endereço salvo) | componente | `DeliveryBlock.test.tsx` › "o endereço acompanha o CEP" › "cliente com conta: a segunda ida…" | sim | — |
| 1b | BUG-001: a busca chegando DEPOIS do endereço salvo não troca a rua | componente | idem › "a busca do CEP chegando DEPOIS…" | sim | — |
| 2 | BUG-002: troca de 01310-100 (localizado) para 40020-000 (não localizado) deixa os quatro campos vazios e destravados, com a mensagem de hoje | componente | idem › "trocar para um CEP que a busca NÃO localiza…" | sim | — |
| 2b | BUG-002: a gaveta trocou o CEP com o checkout fechado e o endereço do CEP anterior não volta | componente | idem › "a gaveta trocou o CEP com o checkout fechado…" | sim | — |
| 2c | BUG-002 pelo `ProposalCheckoutPage` | componente (página real) | `ProposalCheckoutPage.test.tsx` › "trocar para um CEP que a busca não localiza…" | sim | — |
| 3 | Regressão: trocar para um CEP localizado continua preenchendo pela busca | componente | `DeliveryBlock.test.tsx` › "trocar para um CEP que a busca localiza…" | sim | vermelho |
| 3b | Regressão: o endereço digitado à mão para o CEP não localizado da sacola sobrevive à segunda ida | componente | idem › "o endereço digitado à mão…" | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/features/checkout/ui/DeliveryBlock.tsx alterado
apps/store/src/features/checkout/model/checkoutStore.ts alterado
apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx alterado
apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx alterado

## Verificação

- Um arquivo de teste (`PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/store exec vitest run <arquivo> --testTimeout=20000`.
  - `DeliveryBlock.test.tsx`: 4 vermelhos antes do conserto, 97/97 depois.
  - `ProposalCheckoutPage.test.tsx`: 25/25.
  - Os 5 casos novos de BUG-001/002 reprovam sobre o código original, que tirei de `git show HEAD:` e devolvi pela cópia, conferida com `cmp`.
  - Mutantes M1 (a busca localizada deixa de preencher) e M2 (sem a guarda de `camposDoCep`) foram mortos por asserção. O arquivo foi restaurado e conferido com `cmp`.
- Suítes da obrigação e relacionadas, num lote de 32 arquivos, todas verdes, 744/744: `CheckoutPage*`, `checkoutSobreviveAVoltaDaAba`, `ProposalCheckoutPage`, `src/test/*` (inclui `sacolaECheckoutMesmoTotal`), `touchTarget`, `fieldBorder`, `features/checkout/model` e `ui`, `widgets/cart-drawer` (só leitura).
  - Esse lote passou do timeout de 120 s da ferramenta e foi para o segundo plano sozinho, porque esqueci o parâmetro. Esperei terminar: exit 0.
- Tipos (`CLAUDE.md` §Comandos): `npx tsc --noEmit -p apps/store/tsconfig.app.json` → 0 erros. Baseline 0, então nada mudou.
- Verificação mínima (`CLAUDE.md` §Baselines): `pnpm --filter @estrelinha/store test --testTimeout=20000` → 413 arquivos e 7646 testes passando, mas exit 1 por um único `Error: [vitest-worker]: Timeout calling "onTaskUpdate"`. É contenção do worker, sem teste reprovado: as tarefas 13 e 14 rodavam na mesma árvore, e o `CLAUDE.md` registra o mesmo sintoma.

Instruções lidas: `CLAUDE.md` (raiz) › "O defeito 01", "Convenções que valem em todo o repositório" (do contexto carregado); `apps/store/CLAUDE.md` › "Mobile — o que quebra e não grita", "Carrinho, chrome e checkout" (inclusive "A prévia de frete na gaveta…" e "O checkout NÃO exige conta"); `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- Mudei o contrato de `setAddress` (`checkoutStore.ts`, das tarefas 06 e 10): o CEP novo esvazia Rua, Bairro, Cidade e UF. Nenhuma afirmação das tarefas 13 e 14 ficou falsa, e nenhuma das tarefas fechadas também: a 06 e a 10 só afirmam que `setAddress` zera `cepOrigin`, o que continua verdade.
- Efeito no pedido montado: a busca pelo CEP deixou de reescrever a rua que a Adri semeou para o mesmo CEP. Antes ela reescrevia, que é o mesmo defeito do BUG-001.
- Não confirmei se a ViaCEP localiza o 40020-000 (o "segundo defeito, a confirmar" do relatório de QA). Os testes dublam a busca, e a tarefa não pede rede.
- Comportamento só provado em jsdom: a ordem real de chegada da busca e do endereço salvo foi simulada pelos dublês nas duas ordens, não medida em navegador. Isso fica para o reteste do QA.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 12
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O defeito 01, Convenções que valem em todo o repositório; apps/store/CLAUDE.md › Carrinho, chrome e checkout (com O checkout NÃO exige conta), Mobile — o que quebra e não grita; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - BUG-001 segunda ida retirada → PAC, com e sem recarregar: DeliveryBlock.test.tsx › "cliente com conta: a segunda ida…" e "a busca do CEP chegando DEPOIS…"
  - BUG-002 CEP não localizado ⇒ quatro campos vazios + mensagem: DeliveryBlock.test.tsx › "trocar para um CEP que a busca NÃO localiza…" e "a gaveta trocou o CEP com o checkout fechado…"
  - o mesmo pelo pedido montado: ProposalCheckoutPage.test.tsx › "trocar para um CEP que a busca não localiza…"
  - regressão CEP localizado continua preenchendo: DeliveryBlock.test.tsx › "trocar para um CEP que a busca localiza…"
  - além do pedido: "o endereço digitado à mão… sobrevive à segunda ida"
  - sem cobertura: nada do bloco Testes
Verificações:
  - DeliveryBlock.test.tsx 97/97; ProposalCheckoutPage.test.tsx 25/25
  - lote de 32 suítes da obrigação e relacionadas, 744/744
  - tsc da loja 0 erros (baseline 0)
  - suíte inteira da loja 7646/7646 em 413 arquivos, com 1 erro de worker por contenção ("Timeout calling onTaskUpdate") e nenhum teste reprovado
  - novos testes vermelhos sobre o código original; 2 mutantes mortos
Árvore de trabalho: apps/store/src/features/checkout/ui/DeliveryBlock.tsx, apps/store/src/features/checkout/model/checkoutStore.ts, apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx, apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx (nada commitado)
Citações conferidas: 4 (DeliveryBlock.tsx, checkoutStore.ts, useCepLookup nos dois endereços, ProposalCheckoutPage.tsx); nenhuma deslocou, nenhuma morta
```

## T12 — wi-impl-review · fixing · agente adc8417cf01d4b46f

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/12-bugs-001-002-checkout-entrega-endereco.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | teste que não morde | atrapalha | apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx (diff +1653..+1663, o trecho "Recarregar" do caso "cliente com conta: a segunda ida da sacola…") | A variação "depois de recarregar" monta com a busca respondendo antes e o endereço salvo chegando depois, no rerender. Nessa ordem o código anterior ao conserto também passa. O efeito antigo grava "Rua Siqueira Campos" ao montar, e no rerender a semeadura (`cepOrigin` persistido `'sacola'`, mesmo CEP) põe "Rua dos Andradas" de volta. Assim a asserção final (`Rua dos Andradas…` e `address.street`) passa com e sem o conserto. Ela também passa se a guarda `camposDoCep.current === cep` for removida. O caso inteiro só morde por causa da segunda ida, sem recarregar. A ordem que reproduz o que o QA viu depois de recarregar (o endereço salvo chegando antes da busca ou junto com ela) ficou sem asserção. | Bloco `Testes`: "…o bloco mostra a rua salva, com o número e o complemento (BUG-001); também depois de recarregar." · Pronto quando: "BUG-001: na segunda ida da sacola (retirada → PAC), com e sem recarregar, o bloco Entrega mostra o endereço salvo inteiro" |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| BUG-001: segunda ida (retirada → PAC), com e sem recarregar, mostra o endereço salvo inteiro | `DeliveryBlock.tsx`: o ref `camposDoCep`, iniciado a partir do rascunho na montagem e marcado na semeadura (o diff do arquivo); o efeito da busca não reescreve o CEP cujos campos já existem | sim no código; no teste, a variação de recarregar não discrimina (achado 1) |
| BUG-002: CEP não localizado ⇒ Rua, Bairro, Cidade e UF vazios, no checkout e no pedido montado | `DeliveryBlock.tsx`: o ramo `manual` grava os quatro campos vazios; `checkoutStore.ts`, em `setAddress`, esvazia os quatro ao trocar o CEP (`CAMPOS_DO_CEP_VAZIOS`). O mesmo componente atende `/pedido-montado` | sim |
| cada comportamento do bloco `Testes` coberto por teste escrito | `DeliveryBlock.test.tsx` (6 casos novos), `ProposalCheckoutPage.test.tsx` (1 caso novo) | sim, com a ressalva do achado 1 |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

- `CheckoutPage*.test.tsx`, `checkoutSobreviveAVoltaDaAba.test.tsx`, `ProposalCheckoutPage.test.tsx` e `sacolaECheckoutMesmoTotal.test.tsx` verdes: só a execução prova. No `ProposalCheckoutPage.test.tsx` o mock de `useCepLookup` passou a responder por CEP e, sem entrada, devolve `data: undefined`, como antes. Nenhuma asserção existente foi afrouxada.
- `touchTarget` e `fieldBorder` verdes: o diff não toca em classe nem em controle. Só a execução prova.

## Testes

- BUG-001 (segunda ida, retirada → PAC): `DeliveryBlock.test.tsx`, caso "cliente com conta: a segunda ida da sacola…". A segunda ida morde: com o código antigo a busca em cache reescreve a rua para "Siqueira Campos". A variação de recarregar não morde (achado 1). O caso vizinho "a busca do CEP chegando DEPOIS do endereço salvo não troca a rua" morde.
- BUG-002 no checkout: `DeliveryBlock.test.tsx`, caso "trocar para um CEP que a busca NÃO localiza…". Morde: antes o ramo `manual` gravava só `manual: true` e os campos de São Paulo continuavam lá. O caso "a gaveta trocou o CEP com o checkout fechado…" morde pela mudança no store.
- BUG-002 pelo `ProposalCheckoutPage`: `ProposalCheckoutPage.test.tsx`, caso "trocar para um CEP que a busca não localiza…". Morde, e também confere que o número continua `1000`.
- Regressão (CEP localizado continua preenchendo pela busca): `DeliveryBlock.test.tsx`, caso "trocar para um CEP que a busca localiza…". Morde: confere os quatro campos e que a Rua fica desabilitada.
- Há um caso a mais, "o endereço digitado à mão… sobrevive à segunda ida". Ele morde a inicialização de `camposDoCep` na montagem.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O ref `camposDoCep` guarda o CEP a que os quatro campos já pertencem, e a busca só preenche um CEP que ainda não tem campos | sim | O `useCepLookup` de `core` não usa `placeholderData` nem `keepPreviousData`: quando o CEP muda, `data` vem `undefined` até a resposta do CEP novo, então nenhum dado velho é gravado com o CEP novo. O pedido montado semeia num `useLayoutEffect` e só renderiza o bloco depois (`semeadaPara`), então a montagem já encontra os campos da Adri. | sim |
| 2 | `setAddress` esvazia Rua, Bairro, Cidade e UF e põe `manual: false` quando o CEP muda; o que vem no patch continua valendo | sim | O Contrato permite a mudança ("altere só se o fix exigir, e diga no retorno"). Chamadores em produção: `DeliveryBlock` (`edit` e as semeaduras), `useCartShipping` (só `{cep}`; a gaveta não lê a rua) e `semear` (patch inteiro). A gaveta não foi editada, o que respeita o `Não faça`. | sim. As tarefas 13 e 14 só consomem `useCartShipping`, sem depender de `setAddress` |
| 3 | No CEP não localizado, o efeito também grava os quatro campos vazios | sim | É a decisão BUG-002 da tarefa | sim |
| 4 | Número e complemento ficam ao trocar o CEP | sim | Os bugs falam só de Rua, Bairro, Cidade e UF, e o teste do pedido montado confere que o número continua | sim |

## Não conferido

- Suítes passando, `tsc` e lint: só a execução prova.
- As alterações nos quatro arquivos aparecem como `M` em `git status` e o diff foi lido inteiro. Não identifiquei mudança de outra tarefa misturada nesses arquivos.
- O comportamento em navegador (busca real na ViaCEP, recarregar com `sessionStorage`): é da Validation e do QA.
Instruções lidas: CLAUDE.md (raiz) › "O defeito 01", "Convenções que valem em todo o repositório"; apps/store/CLAUDE.md › "Carrinho, chrome e checkout" (com "A prévia de frete na gaveta, e o checkout que a recebe"), "O checkout NÃO exige conta" (passagens sobre endereço e CEP), "Mobile — o que quebra e não grita".

## T12 — wi-impl-task · done · agente adf077cb1c44cfc20

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99/.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/tasks/12-bugs-001-002-checkout-entrega-endereco.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | BUG-001 depois de recarregar: o rascunho é reidratado, o endereço salvo chega primeiro e a busca do CEP chega depois (a ordem em que a rua era reescrita). A rua salva continua, com número e complemento | componente | `DeliveryBlock.test.tsx` › "o endereço acompanha o CEP" › "cliente com conta: a segunda ida da sacola (retirada → PAC) mostra o endereço salvo inteiro, também depois de recarregar" (o trecho "Recarregar" foi reescrito) | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99

## Arquivos alterados

apps/store/src/features/checkout/ui/DeliveryBlock.tsx alterado
apps/store/src/features/checkout/model/checkoutStore.ts alterado
apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx alterado
apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx --testTimeout=20000` (do `PROJECT.md` › Comandos de verificação): 97/97, exit 0.
- O trecho "Recarregar" morde sozinho. Para provar, isolei-o numa cópia temporária do teste, com as duas idas sem asserção e o rascunho já com o endereço salvo:
  - verde com o conserto;
  - vermelho com a guarda `camposDoCep.current === cep` removida;
  - vermelho com `DeliveryBlock.tsx` e `checkoutStore.ts` de antes do conserto, tirados de `git show HEAD:`.
  - Os três arquivos voltaram pela cópia, e conferi cada um com `cmp`.
- Mutante M2 (sem a guarda) contra o arquivo de teste final: o caso reprova, junto com outros dois. O arquivo foi restaurado e conferido com `cmp`.
- Tipos e suíte inteira não foram rodados de novo: a correção só mexeu num arquivo de teste.

## Divergências e descobertas

nada

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 12
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O defeito 01, Convenções que valem em todo o repositório; apps/store/CLAUDE.md › Carrinho, chrome e checkout (com O checkout NÃO exige conta), Mobile — o que quebra e não grita; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - BUG-001 segunda ida retirada → PAC: DeliveryBlock.test.tsx › "cliente com conta: a segunda ida…" e "a busca do CEP chegando DEPOIS…"
  - o mesmo depois de recarregar, no mesmo caso: o endereço salvo chega antes da busca; reescrito na correção e provado vermelho isolado, sem o conserto e sem a guarda
  - BUG-002 CEP não localizado ⇒ quatro campos vazios + mensagem: DeliveryBlock.test.tsx › "trocar para um CEP que a busca NÃO localiza…" e "a gaveta trocou o CEP com o checkout fechado…"
  - o mesmo pelo pedido montado: ProposalCheckoutPage.test.tsx › "trocar para um CEP que a busca não localiza…"
  - regressão CEP localizado continua preenchendo: DeliveryBlock.test.tsx › "trocar para um CEP que a busca localiza…"
  - além do pedido: "o endereço digitado à mão… sobrevive à segunda ida"
  - sem cobertura: nada do bloco Testes
Verificações:
  - DeliveryBlock.test.tsx 97/97; ProposalCheckoutPage.test.tsx 25/25
  - lote de 32 suítes da obrigação e relacionadas, 744/744
  - tsc da loja 0 erros (baseline 0)
  - suíte inteira da loja 7646/7646 em 413 arquivos, com 1 erro de worker por contenção ("Timeout calling onTaskUpdate") e nenhum teste reprovado
  - testes novos vermelhos sobre o código original; mutantes mortos, inclusive o trecho do recarregar isolado
Árvore de trabalho: apps/store/src/features/checkout/ui/DeliveryBlock.tsx, apps/store/src/features/checkout/model/checkoutStore.ts, apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx, apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx (nada commitado)
Citações conferidas: 4 (DeliveryBlock.tsx, checkoutStore.ts, useCepLookup nos dois endereços, ProposalCheckoutPage.tsx); nenhuma deslocou, nenhuma morta
```
