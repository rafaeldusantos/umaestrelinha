# Log da implementação por ondas — 92

## T01 — wi-impl-task · review · agente afdf60127fec96ab6

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/01-aba-compre-junto-desconto-por-adicional.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | `AddonConfig.discountPercent` é **opcional** (`discountPercent?: number \| null`). Se ele não vier, vale como sem desconto. | Campo obrigatório `number \| null`, como diz a letra do Contrato | Obrigatório, ele quebra o `tsc` da loja em `useBuyTogetherData.ts`/`toConfig` e nos testes da loja. Mapear a coluna ali é trabalho declarado da 02 ("VOCÊ ALTERA"), e esta tarefa não pode mexer no bloco da loja. Opcional é mais fácil de desfazer. | tarefas 02 e 03: quem monta `AddonConfig` tem de preencher o campo, porque o `tsc` não vai cobrar. Propagado para as duas. |
| 2 | A função do preço chama-se `buyTogetherDiscountedPrice(unitPrice, percent)` e fica numa folha nova, `packages/core/src/buy-together/discount.ts`, sem import. Percentual `null`/`undefined` devolve o preço sem mudança. | Pôr a função em `rules.ts` ou em `total.ts` | O Contrato pede folha nova. Sem import, o Deno alcança o arquivo, como em `marks.ts`. | 02, 03 e 04 consomem esse nome. Propagado para 02 e 03. |
| 3 | A recusa chama-se `addonDiscountRefusal(percent)`, com a frase "O desconto ao levar junto é um número inteiro de 1% a 50%." montada a partir de `BUY_TOGETHER_DISCOUNT_MIN`/`_MAX`. `NaN` também é recusado. | Frase diferente para cada caso (fora da faixa, não inteiro) | Uma frase só, como `listNameRefusal`. `NaN` nunca deve virar "sem desconto". | a frase aparece na tela e no toast do salvar. Os testes a escrevem por extenso. |
| 4 | A recusa do desconto entrou em `addonsRefusal`, antes da recusa da própria joia e da peça repetida. Com ela o salvar dá toast com a frase, foca a aba e não grava nada (nem o produto). A frase aparece também no campo (`role="alert"`, `aria-invalid`). | Desabilitar o Salvar pela barra (`blockedNote`), como no adicional incompleto | O painel já recusa as regras de `core` desse jeito, pelo toast no submit. O incompleto é outra categoria. | `persistAddons.ts`, `AdminProductFormPage` (sem alteração). |
| 5 | Frases da prévia: `{Nome da peça} sai a R$ X com esta joia.` ou `… sai de R$ X a R$ Y com esta joia.`; numa lista, `As peças de {Lista} saem de R$ X a R$ Y com esta joia.` | O artigo "a corrente" da spec | O painel não conhece o gênero do nome da peça. Usar o nome inteiro evita um artigo errado. | só a tela do painel. |
| 6 | Preços que a prévia considera: as variações ativas e liberadas que têm preço (sem liberar nenhuma, valem todas as ativas). Sem grade com preço, vale o `base_price`. Numa lista entram só as peças ativas, sem a própria joia. Estoque não conta. Se as variações liberadas não têm preço, não há prévia. | Usar `variantSellable` (com estoque) | A prévia mostra por quanto a peça sai, e o estoque muda a toda hora. A loja já pula a joia da própria lista. | só a prévia (`discountPreview.ts`). |
| 7 | O campo é `type="number"`, `inputMode="numeric"`, min 1, max 50, step 1, placeholder "Sem". Vazio grava `null`. | Campo de texto livre | É o controle numérico de sempre. O navegador nunca entrega texto inválido, e o que vier fora da faixa a recusa de `core` pega. | `BuyTogetherTab.tsx`. |
| 8 | `useBuyTogetherLists` passou a ler `product_variants(id, price, is_active)` dentro do embed da peça. `PecaDaLista` ganhou `precoBase` e `variacoes` (só as ativas). | Uma consulta separada de variações | É uma leitura só, e eu provei a forma por HTTP no banco local (200). | o índice e o editor de listas usam o mesmo hook. Os campos novos são aditivos. |
| 9 | Prefixo da migration: `20261107130000` (o maior era `20261107120000`, mais 1 h). | — | É a regra da tarefa. | ordem de publicação da onda. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Preço com desconto arredondado a centavo por unidade (79 com 10% = 71,10; 25 com 15% = 21,25); percentual nulo devolve o preço | unidade (core) | `packages/core/src/buy-together/__tests__/discount.test.ts` | sim | — |
| 2 | A recusa devolve a frase para 0, 51 e 10,5 e `null` para 1, 50 e vazio | unidade (core) | `packages/core/src/buy-together/__tests__/rules.test.ts` | sim | — |
| 3 | Guarda da migration: `add column if not exists`, coluna inteira e nula, `check` com os limites importados de `core`, sem dado, sem `grant` e sem policy, com sensores | guarda de schema (store) | `apps/store/src/shared/lib/__tests__/compreJuntoDescontoSchema.test.ts` | sim | — |
| 4 | Mudar só o percentual marca o rascunho como alterado; o corpo gravado leva `discount_percent` (igualdade exata); fora da faixa é recusado antes de escrever; a carga lê o percentual | unidade (painel) | `apps/backoffice/src/features/product-form/model/addons.test.ts`, `persistAddons.test.ts` | sim | — |
| 5 | Página real: o campo recusa 51 com a frase antes de gravar; a prévia mostra "R$ X" e, com variações de preços diferentes ou numa lista, "de R$ X a R$ Y"; mudar só o percentual grava | página real (painel) | `apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx` › "o desconto ao levar junto" | sim | vermelho |
| 6 | O banco recusa gravação direta com 0, 51 e 10,5; o painel grava o percentual por HTTP (upsert por id, embed do formulário); a outra joia não muda; anônimo não escreve | integração (Supabase local) | `.specs/work-items/92-desconto-da-compra-casada/probes/01-desconto-do-adicional.sh` | sim (11 `ok —`) | não se aplica |

A fatia 5 foi escrita depois da implementação da tela, então não passou pelo vermelho. Por isso levou quatro mutações, uma de cada vez, com cópia e `cmp`, e todas deram vermelho:
- a prévia sem chamar `buyTogetherDiscountedPrice`: 3 falhas;
- a lista usando só `precoBase`: 1 falha;
- `addonsRefusal` sem a recusa do desconto: 1 falha;
- o corpo do upsert com `discount_percent: null` fixo: 1 falha.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

packages/core/src/buy-together/discount.ts criado
packages/core/src/buy-together/__tests__/discount.test.ts criado
packages/core/src/buy-together/rules.ts alterado
packages/core/src/buy-together/__tests__/rules.test.ts alterado
packages/core/src/buy-together/availability.ts alterado
packages/core/src/buy-together/index.ts alterado
packages/core/src/buy-together/__tests__/purity.test.ts alterado
packages/supabase/src/types/buyTogether.ts alterado
supabase/migrations/20261107130000_compre-junto-desconto.sql criado
apps/store/src/shared/lib/__tests__/compreJuntoDescontoSchema.test.ts criado
apps/backoffice/src/features/product-form/model/addons.ts alterado
apps/backoffice/src/features/product-form/model/addons.test.ts alterado
apps/backoffice/src/features/product-form/model/persistAddons.ts alterado
apps/backoffice/src/features/product-form/model/persistAddons.test.ts alterado
apps/backoffice/src/features/product-form/model/discountPreview.ts criado
apps/backoffice/src/features/product-form/model/useProductForm.ts alterado
apps/backoffice/src/features/product-form/ui/BuyTogetherTab.tsx alterado
apps/backoffice/src/features/buy-together-lists/api/useBuyTogetherLists.ts alterado
apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx alterado
.specs/work-items/92-desconto-da-compra-casada/probes/01-desconto-do-adicional.sh criado
.specs/work-items/92-desconto-da-compra-casada/tasks/02-bloco-na-pagina-do-produto-com-desconto.md alterado
.specs/work-items/92-desconto-da-compra-casada/tasks/03-sacola-e-checkout-com-desconto.md alterado

## Verificação

- **Um arquivo de teste** (de `PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`, a cada fatia. Verde em todas.
- **Tipos** (de `CLAUDE.md` › Comandos), `npx tsc --noEmit -p …`:
  - `packages/core/tsconfig.json`: 11 erros, iguais aos 11 herdados do `CLAUDE.md` › Baselines (carousel 5, pickHomeBanners 1, pickHomeCollections 1, sitemap/urls 2, supabase/client 2). Nenhum em arquivo que eu toquei.
  - `apps/store/tsconfig.app.json`: 0.
  - `apps/mobile-adm/tsconfig.app.json`: 0.
  - `apps/backoffice/tsconfig.app.json`: 7 erros, todos em `features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (TS2593/TS2304, falta o import de `describe`/`it`/`expect`). O arquivo está limpo no `git status` e veio do HEAD `4c6e9a16`. Não é desta tarefa: não está na baseline de 0 do `CLAUDE.md`, mas não é arquivo meu.
  - Não houve `baseline` na entrada e não medi antes da primeira fatia. Comparei contra a linha *Tipos* do `CLAUDE.md` › Baselines.
- **Verificação mínima** (de `CLAUDE.md` › Baselines e `PROJECT.md`: suíte do workspace tocado mais a da loja), exit fora de pipe:
  - core: 5318/214, exit 0
  - backoffice: 5106/281, exit 0
  - store: 6916/367, exit 0
- **ESLint** nos arquivos tocados do painel e no guarda da loja: exit 0, sem achado.
- **Ambiente local** (de `PROJECT.md` › Ambiente local):
  - `supabase status`: de pé (edge runtime e pooler parados, sem uso aqui).
  - `supabase migration up --local`: aplicou só `20261107130000`.
  - Probe HTTP em `:54441`: 11 `ok —`, exit 0. Os selects do embed das listas também foram conferidos por HTTP (200).
- `pnpm install --frozen-lockfile --offline` no worktree, porque ele não tinha `node_modules`. Lockfile intacto.

Instruções lidas: `CLAUDE.md` (raiz, no contexto) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; `packages/core/CLAUDE.md` › Quando um código pertence, Pureza, Os módulos, Dinheiro, Convenções de tipo (o arquivo tem 45 KB; as seções de módulos alheios não foram lidas de ponta a ponta); `apps/backoffice/CLAUDE.md` › Molde dos formulários, Pedidos e a fila de material, Compre Junto › Listas, Compre Junto › Adesão, Compre Junto › a aba "Compre junto" do produto; `supabase/CLAUDE.md` › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS; `.specs/LESSONS.md` › L-013, L-014, L-015; `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local. Não li `supabase/CLAUDE.md` › Edge functions, mercado-pago, checkout e send-notification, porque esta tarefa não toca function.

## Divergências e descobertas

- **O código não tinha o bloco do Design.** O Design fala do bloco "Desconto ao levar junto" desabilitado, com "10" fixo e a etiqueta "WI 92 · depois". Isso é do protótipo; o código não tinha bloco nenhum, e eu o criei do zero.
- **Migration da tarefa inteira, não da fatia.** Quanto ao contrato "VOCÊ ALTERA (só o export da folha nova)" do barrel: o barrel ganhou só `export * from './discount.ts'`. As constantes e a recusa ficaram em `rules.ts`, que o barrel já exportava.
- **Teste antigo atualizado.** O caso de payload exato em `AdminProductFormPage.compreJunto.test.tsx` ("grava só os adicionais DESTA joia…") e os dois de `persistAddons.test.ts` ganharam `discount_percent: null`. É o comportamento novo, com a igualdade exata mantida, não um afrouxamento.
- **O dublê de `buy_together_list_items` mudou.** Ele passou a devolver `product_variants` dentro da peça, e os testes antigos seguem verdes.
- **Bug no meu próprio probe.** Na primeira execução, a limpeza falhou (vírgula no começo do `in.(…)`) e deixou 3 linhas minhas no banco local. Apaguei as três por id, corrigi o probe e rodei de novo. A limpeza conferida no psql: 8 linhas, as mesmas de antes, nenhuma criada nos últimos 5 minutos.
- **O probe do WI-01 apaga dados.** O `03-adicionais-no-produto.sh` do WI-01, usado como molde, apaga **todos** os adicionais das duas primeiras joias do banco local na limpeza. A minha cópia escolhe só joias sem adicional e apaga só o que criou, por id.
- **Erro de tipo herdado no backoffice.** `ProposalStateBadge.test.tsx` dá 7 erros de tipo (falta o import do vitest), vindo do commit `4c6e9a16`. A `CLAUDE.md` diz 0 para o painel, então a baseline está velha. Não consertei.
- **Prova em navegador fica para depois.** Os 390 px sem rolagem horizontal e o alvo de 44 px estão só no código (`grid-cols-1` abaixo de `lg`, campo `h-11`, `max-w-[120px]`, `break-words`). jsdom não mede layout. Fica para a Validation/QA.
- **Propagado na 02** (linhas 48–49 do Contrato): o nome e o caminho da função; `AddonConfig.discountPercent` declarado opcional, com `toConfig` passando a preenchê-lo.
- **Propagado na 03** (linha 59 do Contrato): o nome e o caminho da função; `discountPercent` opcional.
- **Vale saber na 03.** O `purity.test.ts` agora fixa 8 arquivos no módulo e 10 visitados. A 03 é dona desse teste na onda dela e acrescenta a folha que criar.
- **Documentação não atualizada.** `packages/core/CLAUDE.md` (tabela de módulos › `./buy-together`) e `apps/backoffice/CLAUDE.md` (a aba do produto) não mencionam o desconto. Isso é do fecho da feature, não desta tarefa.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 01
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, as seções citadas); packages/core/CLAUDE.md (seções gerais e de dinheiro, a tabela de módulos e as convenções de tipo); apps/backoffice/CLAUDE.md › Molde dos formulários, Pedidos e a fila de material, Compre Junto › Listas, Adesão, a aba do produto; supabase/CLAUDE.md › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS; .specs/LESSONS.md › L-013..L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - função do preço: packages/core/src/buy-together/__tests__/discount.test.ts
  - recusa 0/51/10,5 e 1/50/vazio: packages/core/src/buy-together/__tests__/rules.test.ts
  - guarda de schema: apps/store/src/shared/lib/__tests__/compreJuntoDescontoSchema.test.ts (15 casos, sensores por mutação)
  - rascunho e payload: apps/backoffice/src/features/product-form/model/addons.test.ts e persistAddons.test.ts
  - página real (recusa de 51, prévia R$ X, faixa de variações e de lista, gravação): apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx
  - integração no banco local: .specs/work-items/92-desconto-da-compra-casada/probes/01-desconto-do-adicional.sh
  - sem cobertura automatizada: 390 sem rolagem e alvo de 44 em navegador (jsdom não mede layout; fica para a Validation)
Verificações:
  - testes de cada arquivo: verdes
  - tsc: core 11 (os herdados), store 0, mobile-adm 0, backoffice 7 herdados de ProposalStateBadge.test.tsx (HEAD, não tocado)
  - suítes: core 5318/214, backoffice 5106/281, store 6916/367, exit 0
  - eslint dos arquivos tocados: limpo
  - migration aplicada só no local
  - probe: 11 ok
Árvore de trabalho: os 20 arquivos de código, testes e probe da seção "Arquivos alterados", mais os contratos das tasks 02 e 03; nada commitado
Citações conferidas: 9 abertas (o check de position da migration :66; rules.ts; marks.ts; addons.ts › addonsChanged/addonsFromRow; persistAddons.ts › linha/addonsRefusal; PromotionShowcaseCard.tsx; compreJuntoSchema.test.ts; AdminProductFormPage.compreJunto.test.tsx; useBuyTogetherLists.ts:16). Nenhuma morta. O bloco "desabilitado, com 10 fixo e a etiqueta" do Design não existia no código (é do protótipo).
Propagado: 02, linhas 48–49 do Contrato (nome e caminho de buyTogetherDiscountedPrice; AddonConfig.discountPercent opcional, toConfig o preenche); 03, linha 59 do Contrato (o mesmo)
```

## T01 — wi-impl-review · fixing · agente a422a3617c366fbeb

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/01-aba-compre-junto-desconto-por-adicional.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | teste que não morde | atrapalha | packages/core/src/buy-together/__tests__/discount.test.ts:7-18 | Nenhum caso separa arredondar de truncar. Os casos dão 7110, 2125, 1791,0000000000002 e 3166,35 (este último arredonda e trunca para o mesmo 3166). Se `Math.round` virar `Math.floor` em `discount.ts:16`, os quatro casos seguem verdes. O mesmo vale para a página real: 45, 63, 21,25 e 59,50 são contas exatas. Só o mutante "sem arredondamento nenhum" morre (pelo 19,90). Esta função é a dona única da conta de dinheiro que as tarefas 02, 03 e 04 vão consumir. Falta um caso em que arredondar e truncar dão centavos diferentes, por exemplo 19,99 com 15% (1699,15 → 16,99 nos dois; não serve) ou 9,99 com 15% (849,15 → 8,49 nos dois; não serve). Um que serve: 0,99 com 50% = 49,5 → 0,50 arredondando e 0,49 truncando. | Testes: "unidade (`core`): a função do preço arredonda a centavo por unidade (79 com 10% = 71,10; 25 com 15% = 21,25)…"; Contrato: "preço → preço arredondado a centavo" |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o campo grava 1–50 inteiro e o banco recusa fora disso (probe) | migration `20261107130000_compre-junto-desconto.sql` (`check … between 1 and 50`); `persistAddons.ts` (`linha` com `discount_percent`, `addonsRefusal` chamando `addonDiscountRefusal`); probe `probes/01-desconto-do-adicional.sh` (0/51 → 23514, 10.5 → 400, upsert por id, embed) | só execução (o probe registrou 11 `ok —`) |
| a prévia e a faixa aparecem com os valores certos | `discountPreview.ts` (`precosDaPeca`, `discountPreviewLine`); `BuyTogetherTab.tsx` `DiscountField`; os testes da página dão 71,10, a faixa 45,00–63,00 e a lista 21,25–59,50 | sim |
| a prévia chama a função de 01, sem conta própria | `discountPreview.ts` chama `buyTogetherDiscountedPrice`; não há outra conta de percentual | sim |
| a função do preço com desconto e as constantes estão exportadas pelo barrel de `core/buy-together` | `index.ts` faz `export * from './discount.ts'`; `rules.ts` (já exportado pelo barrel) traz `BUY_TOGETHER_DISCOUNT_MIN`/`_MAX` | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim (com o achado 1) |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

- RNF-03 (folha e `rules.ts` só com imports relativos `.ts`, e a régua de pureza atualizada): cumprida. `discount.ts` não tem nenhum import. `purity.test.ts` passou a listar `discount.ts`, a contagem foi de 9 para 10 visitados e há uma âncora do export.
- `AD-012` (provar por probe HTTP): cumprida. O probe roda em `:54441` e se recusa a rodar fora do local. Grava pelos mesmos verbos do painel (upsert com `on_conflict=id`) e lê pelo mesmo embed.
- `compreJuntoSemColunaAntiga` (não usar a coluna antiga): cumprida. O diff não cita `buy_together_ids` em lugar nenhum.
- `useBuyTogetherLists.ts` com os preços das variações: cumprida. O embed agora lê `product_variants(id, price, is_active)`, e `PecaDaLista` ganhou `precoBase` e `variacoes` (só as ativas).
- Mobile primeiro (campo e prévia em 390, alvo ≥ 44): o campo é `h-11` (44 px), a grade é de uma coluna abaixo de `lg` e a prévia tem `break-words`/`min-w-0`. A ausência de rolagem horizontal em 390 só um navegador mostra.

## Testes

- Unidade `core`, a função do preço: `packages/core/src/buy-together/__tests__/discount.test.ts`. Cobre 71,10, 21,25 e o percentual nulo/ausente. A asserção morde em parte: não separa arredondar de truncar (achado 1).
- Unidade `core`, a recusa (0, 51 e 10,5 recusados; 1, 50 e vazio passam): `rules.test.ts`. A frase está escrita por extenso, os limites são cravados e `NaN` também é recusado. Morde.
- Guarda de schema: `apps/store/src/shared/lib/__tests__/compreJuntoDescontoSchema.test.ts`. Cobre `if not exists`, a coluna nula e sem default, o `check` contra os limites importados de `core`, a ausência de dado, de `grant` e de policy, e a âncora de 2 comandos. Cada régua tem sensor, e `mutar()` lança quando não acha o alvo. Morde.
- Unidade do painel (só o percentual muda ⇒ alterado; payload com `discount_percent` em igualdade exata): `addons.test.ts` (inclusive a volta ao valor gravado, que não conta como alteração) e `persistAddons.test.ts` (upsert em `toEqual` exato, insert, recusa sem escrita, carga). Morde.
- Página real do painel (51 recusado com a frase antes de gravar; prévia "R$ X" e faixa por variação e por lista): `AdminProductFormPage.compreJunto.test.tsx`. Cobre o toast, o `role="alert"`, o `aria-invalid`, nenhuma escrita no produto nem nos adicionais, o texto exato da prévia nos três casos e o upsert exato ao mudar só o percentual. Morde, com a ressalva de que os valores da prévia são todos contas exatas (achado 1).
- Integração Supabase local: `probes/01-desconto-do-adicional.sh`. Morde (exige 23514/400, confere que nenhuma linha ficou gravada e que o anônimo não muda o valor).

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `discountPercent?: number \| null`, opcional | sim | Obrigatório, ele quebra o `toConfig` de `apps/store/src/entities/product/api/useBuyTogetherData.ts`, o único outro produtor de `AddonConfig`, que é terreno da 02 pela regra "Não mexa no bloco da loja". Com `strictNullChecks` desligado, a leitura dos consumidores é a mesma. | sim: as tarefas 02 (linha 49) e 03 (linha 59) já dizem que o campo é opcional e que `toConfig` tem de preenchê-lo |
| 2 | `buyTogetherDiscountedPrice(unitPrice, percent)` numa folha nova, `discount.ts`, sem import | sim | O Contrato pede folha nova; o molde é `marks.ts` | sim: 02 e 03 citam nome e caminho. A 04 não nomeia a função, e o desconto dela vem pela 03 |
| 3 | `addonDiscountRefusal` com uma frase só, montada das constantes; `NaN` recusado | sim | Mesma forma de `listNameRefusal`/`addonCountRefusal` | sim |
| 4 | A recusa entra em `addonsRefusal` e aparece no toast do submit e também no campo | sim | É assim que as outras recusas de `core` já chegam (`apps/backoffice/CLAUDE.md` › aba Compre junto) | sim |
| 5 | A frase da prévia usa o nome inteiro da peça, ou "As peças de {Lista}" | sim | O Design diz "a corrente sai a R$ X" só como exemplo. Sem "economiza", sem exclamação | sim |
| 6 | A prévia considera as variações ativas e liberadas com preço, ou o `base_price` sem grade; na lista, só as peças ativas e sem a própria joia; o estoque não conta | sim | Coerente com `variantSellable`/`pieceOf` (variação sem preço não se vende) e com o fato de `resolveAddons` pular o principal | sim (só `discountPreview.ts`) |
| 7 | `type="number"`, min 1, max 50, step 1, placeholder "Sem", vazio grava `null` | sim | CA-01.1 ("vazio = sem desconto") | sim |
| 8 | `LIST_ITEM_COLUMNS` passa a embutir `product_variants(id, price, is_active)`; campos aditivos em `PecaDaLista` | sim | É a obrigação da tarefa; a forma foi provada por HTTP | sim (o índice e o editor de listas leem o mesmo hook; os campos só se somam) |
| 9 | Prefixo `20261107130000` | sim | O maior antes dele era `20261107120000`; não há prefixo repetido | sim |

## Não conferido

- Não rodei nada: suítes, `tsc`, lint e o probe são só execução. A "11 `ok —`" do probe vem da palavra do implementador.
- `.specs/work-items/92-desconto-da-compra-casada/probes/01-desconto-do-adicional.sh` e os dois arquivos de `tasks/` (02 e 03) aparecem `??`, sem intent-to-add. Julguei esses arquivos inteiros pelo escopo da tarefa. Nas tarefas 02 e 03 só pude conferir que as afirmações propagadas (o nome da função e o campo opcional) estão lá. Que o resto desses arquivos não foi mexido depende da palavra do implementador, porque não há baseline.
- `apps/backoffice/src/features/product-form/model/discountPreview.ts` não tem teste de unidade próprio. As frases estão provadas só pela página real, e o ramo em que as variações liberadas não têm preço (retorna `[]`) não é exercido.
- Uma diferença de borda que não virou achado: com variações liberadas numa peça que deixou de ter grade (`variacoes` vazio), `precosDaPeca` devolve o `base_price`, enquanto `pieceOf` na loja pula o adicional. O painel já avisa nesse caso.
- 390 sem rolagem horizontal e o alvo de 44 px sob o dedo: só um navegador mostra.
- Os testes da tela de listas (`AdminBuyTogether.test.tsx`) com o `LIST_ITEM_COLUMNS` novo: não abri o arquivo, que não está em `alterados`.

Instruções lidas: `CLAUDE.md` (raiz, carregado no contexto); `apps/backoffice/CLAUDE.md` › Molde dos formulários, Compre Junto › Listas, Compre Junto › Adesão, Compre Junto › a aba "Compre junto" do produto. Não li `packages/core/CLAUDE.md`, `supabase/CLAUDE.md` nem `.specs/LESSONS.md` › L-013..L-015. Por isso nenhum achado de `convenção violada` se apoia neles, e as regras de migration foram conferidas só pelo que a raiz e a tarefa dizem.

## T01 — wi-impl-task · done · agente afdf60127fec96ab6

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/01-aba-compre-junto-desconto-por-adicional.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O preço com desconto arredonda o meio centavo para cima, e não trunca. Casos novos: 0,99 com 50% = 0,50 (truncar daria 0,49) e 1,99 com 50% = 1,00 (truncar daria 0,99). | unidade (core) | `packages/core/src/buy-together/__tests__/discount.test.ts` › "arredonda o meio centavo para cima, e não trunca" | sim | vermelho |

O check de mutação trocou `Math.round` por `Math.floor` em `discount.ts`, com cópia fora do repositório. Resultado: 2 de 4 casos ficaram vermelhos, o novo e o antigo "arredonda o centavo que a conta em ponto flutuante deixaria torto". Restaurei pela cópia, `cmp` conferiu o arquivo idêntico, e a suíte `buy-together` voltou ao verde (89/89).

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

packages/core/src/buy-together/discount.ts criado
packages/core/src/buy-together/__tests__/discount.test.ts criado
packages/core/src/buy-together/rules.ts alterado
packages/core/src/buy-together/__tests__/rules.test.ts alterado
packages/core/src/buy-together/availability.ts alterado
packages/core/src/buy-together/index.ts alterado
packages/core/src/buy-together/__tests__/purity.test.ts alterado
packages/supabase/src/types/buyTogether.ts alterado
supabase/migrations/20261107130000_compre-junto-desconto.sql criado
apps/store/src/shared/lib/__tests__/compreJuntoDescontoSchema.test.ts criado
apps/backoffice/src/features/product-form/model/addons.ts alterado
apps/backoffice/src/features/product-form/model/addons.test.ts alterado
apps/backoffice/src/features/product-form/model/persistAddons.ts alterado
apps/backoffice/src/features/product-form/model/persistAddons.test.ts alterado
apps/backoffice/src/features/product-form/model/discountPreview.ts criado
apps/backoffice/src/features/product-form/model/useProductForm.ts alterado
apps/backoffice/src/features/product-form/ui/BuyTogetherTab.tsx alterado
apps/backoffice/src/features/buy-together-lists/api/useBuyTogetherLists.ts alterado
apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx alterado
.specs/work-items/92-desconto-da-compra-casada/probes/01-desconto-do-adicional.sh criado
.specs/work-items/92-desconto-da-compra-casada/tasks/02-bloco-na-pagina-do-produto-com-desconto.md alterado
.specs/work-items/92-desconto-da-compra-casada/tasks/03-sacola-e-checkout-com-desconto.md alterado

Na correção, só `discount.test.ts` mudou.

## Verificação

Comandos rodados na correção, de `PROJECT.md` › Comandos de verificação:
- `pnpm --filter @estrelinha/core exec vitest run src/buy-together/__tests__/discount.test.ts`: 4/4, exit 0.
- O mesmo comando com o mutante `Math.floor`: exit 1, 2 casos falham.
- `pnpm --filter @estrelinha/core exec vitest run src/buy-together` depois de restaurar: 89/89, exit 0.

A correção não mexeu em código de produção, então não rodei tipos nem as outras suítes de novo.

Instruções lidas: as mesmas da implementação.

## Divergências e descobertas

O achado diz que os quatro casos antigos seguiam verdes com `Math.floor`. Na medição, um deles ("arredonda o centavo que a conta em ponto flutuante deixaria torto", 19,90 e 33,33) também fica vermelho com o `floor`. Uma das contas desse caso cai logo abaixo do inteiro em ponto flutuante, e só o arredondamento a salva.

Mesmo assim o achado procede. Nenhum caso pegava o meio centavo exato, que é onde arredondar e truncar mais se separam, e a defesa contra o `floor` dependia de um acidente de ponto flutuante. Os casos novos (0,99 e 1,99 com 50%) fixam isso de propósito.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 01
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, as seções citadas); packages/core/CLAUDE.md (seções gerais e de dinheiro, a tabela de módulos e as convenções de tipo); apps/backoffice/CLAUDE.md › Molde dos formulários, Pedidos e a fila de material, Compre Junto › Listas, Adesão, a aba do produto; supabase/CLAUDE.md › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS; .specs/LESSONS.md › L-013..L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - função do preço: packages/core/src/buy-together/__tests__/discount.test.ts (desde a correção, com o meio centavo: 0,99 e 1,99 com 50%, que matam o Math.floor)
  - recusa 0/51/10,5 e 1/50/vazio: packages/core/src/buy-together/__tests__/rules.test.ts
  - guarda de schema: apps/store/src/shared/lib/__tests__/compreJuntoDescontoSchema.test.ts (15 casos, sensores por mutação)
  - rascunho e payload: apps/backoffice/src/features/product-form/model/addons.test.ts e persistAddons.test.ts
  - página real (recusa de 51, prévia R$ X, faixa de variações e de lista, gravação): apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx
  - integração no banco local: .specs/work-items/92-desconto-da-compra-casada/probes/01-desconto-do-adicional.sh
  - sem cobertura automatizada: 390 sem rolagem e alvo de 44 em navegador (jsdom não mede layout; fica para a Validation)
Verificações:
  - testes de cada arquivo: verdes
  - tsc: core 11 (os herdados), store 0, mobile-adm 0, backoffice 7 herdados de ProposalStateBadge.test.tsx (HEAD, não tocado)
  - suítes: core 5318/214, backoffice 5106/281, store 6916/367, exit 0
  - eslint dos arquivos tocados: limpo
  - migration aplicada só no local
  - probe: 11 ok
  - correção: discount.test.ts 4/4; o mutante Math.floor derruba 2; restaurado, buy-together 89/89
Árvore de trabalho: os 20 arquivos de código, testes e probe da seção "Arquivos alterados", mais os contratos das tasks 02 e 03; nada commitado
Citações conferidas: 9 abertas (o check de position da migration :66; rules.ts; marks.ts; addons.ts › addonsChanged/addonsFromRow; persistAddons.ts › linha/addonsRefusal; PromotionShowcaseCard.tsx; compreJuntoSchema.test.ts; AdminProductFormPage.compreJunto.test.tsx; useBuyTogetherLists.ts:16). Nenhuma morta. O bloco "desabilitado, com 10 fixo e a etiqueta" do Design não existia no código (é do protótipo).
Propagado: 02, linhas 48–49 do Contrato (nome e caminho de buyTogetherDiscountedPrice; AddonConfig.discountPercent opcional, toConfig o preenche); 03, linha 59 do Contrato (o mesmo)
```

## T02 — wi-impl-task · review · agente ac6bb8f611d746813

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/02-bloco-na-pagina-do-produto-com-desconto.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | `bundleTotal` mudou de forma: recebe `addons: { price, discountPercent? }[]` e devolve `{ total, discount }`. O tipo de entrada é exportado como `BundleAddon` | manter `addonPrices: number[]` e acrescentar um array de percentuais alinhado por posição | o contrato pede "peças com preço e percentual" e "o total e o desconto"; dois arrays paralelos desalinham sem que nada acuse. O único consumidor de produção era `useBuyTogether`, e os testes antigos foram reescritos com os mesmos valores | a tarefa 04 (teste de paridade): a linha de contrato dela foi propagada |
| 2 | `TakenAddon.price` (o que vai à sacola) continua sendo o preço CHEIO da variação. O desconto aparece só no total do bloco | mandar à sacola o preço já descontado | a sacola e o servidor recalculam o desconto (tarefa 03, D-04); mandar o preço descontado faria a conta duas vezes | tarefa 03 (a sacola lê a configuração por conta própria) |
| 3 | O percentual vai ao `BuyTogetherAddon` por id do adicional, lido de `data.addons` dentro de `useBuyTogether` | pôr `discountPercent` no `ResolvedAddon` de `availability.ts` | `availability.ts` está dentro da cerca da tarefa 03 nesta onda | nenhum fora do hook |
| 4 | O "de/por" é um componente novo, `buy-together/AddonPrice.tsx`, que chama `buyTogetherDiscountedPrice`. A linha e os cartões da lista usam o mesmo componente | escrever a conta ou o markup duas vezes | a tarefa manda as linhas chamarem a função de 01; um componente só evita um segundo desenho | só o bloco |
| 5 | O cartão de uma peça da lista mostra o "de/por" só quando há desconto. Sem desconto ele fica como hoje, sem preço nenhum. O "de" do cartão é `addon.price` quando essa peça é a escolhida e a escolha está completa; nas outras é `product.price`, a mesma regra da linha | mostrar sempre o preço no cartão; usar o menor preço vendável da peça | "sem percentual, o bloco é idêntico ao de hoje"; e a linha já usa `addon.price ?? product.price` | só o bloco |
| 6 | A linha do desconto se escreve `−{formatPrice(x)}` (sinal de menos U+2212, sem espaço), igual ao "Desconto progressivo" do `OrderSummary` | "− R$ X" com espaço, como está no recorte de design | regra 1: vale o que o repositório já faz. O recorte não fixa o espaço | a tarefa 03 escreve a mesma linha na sacola e no checkout; se ela usar outra grafia, as duas superfícies divergem visualmente |
| 7 | A faixa de rolagem do protótipo não foi implementada: os cartões continuam na grade de hoje. O `relative` ficou no invólucro do preço, para o `sr-only` nunca alargar a faixa nem a grade | trocar a grade por uma faixa que rola | o recorte de design só pede o "de/por" no cartão; mudar o layout seria ampliar o escopo | só o bloco |
| 8 | A região viva do bloco (o anúncio "Total do conjunto: …") anuncia o total já descontado e não ganhou frase de desconto | anunciar também o valor do desconto | o recorte não pede; menor superfície | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `bundleTotal`: corrente a 10% e estojo a 15% dão o total descontado e o desconto do conjunto; sem percentual, o mesmo de hoje | unidade (core) | packages/core/src/buy-together/__tests__/total.test.ts | sim | — |
| 2 | a leitura pede `discount_percent` e o mapeia para `discountPercent` (`null` quando vem nulo) | unidade (hook com o client dublado) | apps/store/src/entities/product/api/__tests__/useBuyTogetherData.test.tsx | sim | — |
| 3 | a linha mostra o "de/por" e "N% a menos levando junto" | componente | apps/store/src/entities/product/ui/__tests__/BuyTogetherDesconto.test.tsx | sim | — |
| 4 | a peça da lista mostra o "de/por" sem a frase | componente | idem | sim | — |
| 5 | a peça sem desconto mostra só o preço (na linha e no cartão da lista) | componente | idem | sim | vermelho (2 mutações: o `AddonPrice` tratando `null` como desconto; o painel sem a guarda) |
| 6 | com peça com desconto marcada: "Desconto do Compre Junto −R$ X" acima do total, o total descontado, o PIX sobre ele e a frase da nota | componente | idem | sim | — |
| 7 | só peça sem desconto marcada: nem a linha do desconto nem a frase | componente | idem | sim | vermelho (mutação: `temDesconto` sem `discount > 0`) |
| 8 | página real: o bloco, a barra fixa e a nota da coluna mostram o mesmo total descontado (131,50) | página real | apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx | sim | vermelho (mutação: `useBuyTogether` passando `discountPercent: null` ao `bundleTotal`) |
| 9 | acessibilidade: o nome da caixa termina com ", 10% a menos levando junto"; o leitor de tela lê "de … por …" (o par visível fica `aria-hidden`); o `sr-only` tem ancestral `relative` | componente | BuyTogetherDesconto.test.tsx | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

packages/core/src/buy-together/total.ts alterado
packages/core/src/buy-together/__tests__/total.test.ts alterado
apps/store/src/entities/product/api/useBuyTogetherData.ts alterado
apps/store/src/entities/product/api/__tests__/useBuyTogetherData.test.tsx alterado
apps/store/src/entities/product/model/useBuyTogether.ts alterado
apps/store/src/entities/product/ui/buy-together/AddonPrice.tsx criado
apps/store/src/entities/product/ui/buy-together/AddonRow.tsx alterado
apps/store/src/entities/product/ui/buy-together/AddonPanel.tsx alterado
apps/store/src/entities/product/ui/buy-together/BuyTogetherBlock.tsx alterado
apps/store/src/entities/product/ui/__tests__/BuyTogetherDesconto.test.tsx criado
apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx alterado
.specs/work-items/92-desconto-da-compra-casada/tasks/04-servidor-cobra-o-que-a-tela-mostrou.md alterado (só a linha de contrato de `bundleTotal`)

## Verificação

- Conferência de tipos, da fonte `CLAUDE.md` › Comandos:
  - `npx tsc --noEmit -p apps/store/tsconfig.app.json`: baseline 0, final 0.
  - `npx tsc --noEmit -p packages/core/tsconfig.json`: baseline 11, final 11, os mesmos pares arquivo + código.
  - Numa rodada intermediária apareceu um TS2345 em `packages/core/src/payment/pricing.ts:651`, que é trabalho em andamento da tarefa 03. Ele sumiu na rodada final.
- Um arquivo de teste, da fonte `PROJECT.md` › Comandos de verificação: `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`. Os arquivos de cada fatia ficaram verdes: total.test.ts 15/15, useBuyTogetherData.test.tsx 8/8, BuyTogetherDesconto.test.tsx 9/9, ProductPageLevarConjunto.test.tsx 22/22. Depois da última edição, o lote `src/entities/product`, as páginas de produto, a barra fixa, `touchTarget` e `accentText` deram 732/732.
- Verificação mínima, da fonte `CLAUDE.md` › Baselines (suíte do workspace):
  - store: `pnpm --filter @estrelinha/store test --testTimeout=20000` deu exit 0, 6926/368.
  - core: `pnpm --filter @estrelinha/core test --testTimeout=20000` deu exit 1, 5320 de 5322. As 2 falhas são da tarefa 03, que roda em paralelo, e não deste trabalho (ver Divergências).
- Lint dos arquivos tocados (`npx eslint`): 0 erros. Ficaram 2 warnings de fronteira FSD em `ProductInfo.tsx`, que já estão na baseline e não são arquivo meu.

Instruções lidas:
- `CLAUDE.md` (raiz, já no contexto) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy
- `packages/core/CLAUDE.md` › Quando um código pertence, Pureza, Os módulos, Dinheiro, shopping, proposals, Convenções de tipo. Li pelo índice: as seções dos outros módulos (menu, home, material e outros) não foram lidas por inteiro
- `apps/store/CLAUDE.md` › O bloco Compre Junto (WI-01), O botão único leva o conjunto (WI-01), Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha" (WI-01), Minha conta e o detalhe do pedido
- `.specs/LESSONS.md` › L-013, L-014, L-015
- `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local

## Divergências e descobertas

- **Falhas na suíte de `core` que são da tarefa 03, não minhas.**
  - `buy-together/__tests__/purity.test.ts`: a âncora lista os arquivos do módulo e acusa `cartDiscount.ts`, um arquivo novo da 03 que ainda está em andamento.
  - `payment/__tests__/manualDiscount.test.ts`: acusa um import novo em `pricing.ts`, também da 03.
  - A minha mudança em `total.ts` só importa `./discount.ts`, que já é do módulo. Por isso ela não muda a contagem de visitados (10) da `purity.test.ts`.
- **Prettier formatou três arquivos meus com o estilo errado, e restaurei os três.** Rodei `npx prettier --write` sem a configuração do repositório, e ele passou `AddonRow.tsx`, `AddonPrice.tsx` e `BuyTogetherDesconto.test.tsx` para aspas duplas e ponto-e-vírgula. Restaurei assim:
  - `AddonRow.tsx`: reaplicando as minhas edições sobre `git show HEAD:` (leitura).
  - `AddonPrice.tsx`: conferido com `cmp` contra a cópia de segurança.
  - `BuyTogetherDesconto.test.tsx`: reescrito.
  - O diff final de `AddonRow.tsx` tem só as minhas linhas (+20/−5). Os testes rodaram de novo depois.
- **Defeito do meu próprio teste de página, corrigido no teste e não na implementação.** O `textContent` não põe espaço entre os spans do rótulo e do valor, então a asserção passou a ler o valor exato da linha do rótulo.
- **Propagado para a tarefa 04**: a linha de contrato de `bundleTotal` agora descreve a forma nova (`addons: { price, discountPercent? }[]` → `{ total, discount }`). Foi decisão minha (premissa 1).
- **Citações conferidas: 8, nenhuma morta, nenhuma deslocada.**
  - Os quatro exemplares do `Siga a forma de`: `useBuyTogether.ts`, `AddonRow.tsx`, `BuyTogetherBlock.tsx` + `total.ts › bundlePix` e `ProductPageBuyTogether.test.tsx`. Para o teste de página usei `ProductPageLevarConjunto.test.tsx`, porque o exemplar dubla a barra fixa como `null` e não serviria para comparar com ela.
  - `discount.ts`, `AddonConfig.discountPercent` e a coluna `discount_percent` da migration `20261107130000`: os três existem, como a linha `Depende de` promete.
- **Três fatias passaram de primeira e levaram o check de mutação (5, 7 e 8).** As três ficaram vermelhas com a implementação quebrada e voltaram ao verde depois da restauração pela cópia, conferida com `cmp`.
- **O que ficou sem execução:**
  - A RNF-05 (390×844 sem rolagem horizontal, o "de/por" sem quebrar) só tem prova por forma: `min-w-0`, `flex-wrap`, o `relative` do `sr-only` e a grade da linha, que já tinha `minmax(0,1fr)`. O jsdom não mede layout, então a prova em navegador fica para a Validation/QA.
  - Nenhum comportamento de banco ficou de fora: a coluna já existe e a leitura foi provada com o client dublado.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 02
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções, Os guardas, Baselines, CI e deploy; packages/core/CLAUDE.md (Quando pertence, Pureza, Os módulos, Dinheiro, shopping, proposals, Convenções de tipo); apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho/chrome/checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - unidade core, bundleTotal com 10% e 15% e sem percentual: packages/core/src/buy-together/__tests__/total.test.ts (3 casos novos, 4 reescritos para a forma nova com os mesmos valores)
  - componente, a linha com "de/por" e "N% a menos levando junto"; a peça da lista com "de/por"; a peça sem desconto só com o preço: apps/store/src/entities/product/ui/__tests__/BuyTogetherDesconto.test.tsx
  - componente, a linha do desconto, o total descontado, o PIX sobre ele e a frase; só peça sem desconto, nada disso: idem
  - página real, a barra fixa e a nota da coluna com o mesmo total do bloco: apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx
  - acessibilidade, o nome da caixa com o percentual e o "de … por …" lido: BuyTogetherDesconto.test.tsx
  - a leitura de discount_percent: useBuyTogetherData.test.tsx (asserção estendida)
  - sem cobertura: a RNF-05 em navegador, porque o jsdom não mede layout (fica para a Validation/QA)
Verificações: tsc store 0 (baseline 0); tsc core 11 (baseline 11, os mesmos); os arquivos de cada fatia verdes; suíte store exit 0 6926/368; suíte core 5320/5322, as 2 falhas da tarefa 03 em andamento (purity.test.ts com cartDiscount.ts novo; manualDiscount.test.ts com import novo em pricing.ts); eslint 0 erros
Árvore de trabalho: total.ts e total.test.ts (core); useBuyTogetherData.ts e o teste dele, useBuyTogether.ts, AddonPrice.tsx (novo), AddonRow.tsx, AddonPanel.tsx, BuyTogetherBlock.tsx, BuyTogetherDesconto.test.tsx (novo) e ProductPageLevarConjunto.test.tsx (store); a linha de contrato da tarefa 04
Citações conferidas: 8; nenhuma deslocada nem morta (o exemplar do teste de página dubla a barra fixa, por isso usei ProductPageLevarConjunto.test.tsx)
Propagado: 04 · a linha de contrato de `bundleTotal` passou a dizer a forma nova (`addons: { price, discountPercent? }[]` → `{ total, discount }`)
```

## T02 — wi-impl-review · done · agente ad5f54f35546514c7

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/02-bloco-na-pagina-do-produto-com-desconto.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o bloco mostra "de/por", a linha do desconto e o total descontado nos testes de componente e de página | `AddonPrice.tsx` (novo), `AddonRow.tsx` (o preço e a frase "N% a menos levando junto"), `AddonPanel.tsx` (o "de/por" no cartão da lista), `BuyTogetherBlock.tsx` (a linha "Desconto do Compre Junto" acima do total, e a frase na nota); testes em `BuyTogetherDesconto.test.tsx` e `ProductPageLevarConjunto.test.tsx` | sim |
| `bundleTotal` chama a função de 01, sem conta própria | `packages/core/src/buy-together/total.ts`: `buyTogetherDiscountedPrice` é chamada para cada peça; ali só se somam centavos | sim |
| sem percentual, o bloco é idêntico ao de hoje | `AddonPrice` sem percentual desenha um único `<span>` com as mesmas classes de antes; `AddonPanel` só desenha preço com percentual; linha e frase da nota dependem de `discount > 0`. A linha ganhou um invólucro `flex-col` em volta do preço, sem efeito visual | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- RNF-05, a grade da linha com `minmax(0,1fr)`: `AddonRow.tsx` mantém `grid-cols-[44px_64px_minmax(0,1fr)]`. O "de/por" é `flex min-w-0 flex-wrap`, e a linha do desconto é `flex-wrap`. O que sobra (390×844, sem rolagem) só aparece em navegador.
- RNF-05, o `.sr` com ancestral posicionado: `AddonPrice.tsx` põe `relative` no invólucro, pai direto do `sr-only`. Um teste confere isso (`BuyTogetherDesconto.test.tsx`, "o texto do leitor de tela tem ancestral posicionado").
- Guardas da loja:
  - `tomDoCompreJunto.test.ts` varre o diretório `buy-together/` com `readdirSync`, então alcança o `AddonPrice.tsx` novo. Os textos novos não têm exclamação nem urgência.
  - Nenhum controle novo foi criado, então `touchTarget` não muda.
  - As cores usadas são `primary` e `ink-soft`, sem texto em `accent`, então `accentText` não muda.
  - Nenhuma menção a material, então `semMaterialNaPaginaDoProduto` não muda.

## Testes

- unidade (`core`), `total.test.ts`:
  - Corrente a 10% e estojo a 15%: `toEqual({ total: 229.24, discount: 13.99 })`, conferido à mão contra `buyTogetherDiscountedPrice` (80,91 e 28,33).
  - Percentual nulo ou ausente: `{ 150.5, 0 }`.
  - Desconto que não incide sobre a joia na quantidade: `{ 240, 10 }`.
  - Morde.
- componente, a linha e a lista, `BuyTogetherDesconto.test.tsx`:
  - O "de" riscado (token exato `line-through`), o "por" 80,91 e a frase do percentual.
  - O cartão da lista com "de R$ 40,00 por R$ 36,00", sem a frase.
  - A peça sem desconto: sem riscado, sem frase e com o nome acessível curto.
  - Morde.
- componente, o total, mesmo arquivo:
  - A linha "Desconto do Compre Junto −R$ 8,99" vem antes do total (`compareDocumentPosition`).
  - O total 200,91, o PIX 190,86 (calculado pelo bloco sobre o total recebido) e a nota completa com a frase.
  - O caso só sem desconto: nem a linha nem a frase.
  - Morde.
- página real, `ProductPageLevarConjunto.test.tsx`:
  - Pelo `useBuyTogether` real, a barra, a nota da coluna e o bloco mostram 131,50, e a barra não mostra 135,00.
  - As variações valem 25 e 35, valores diferentes (L-013).
  - Morde.
- acessibilidade:
  - O nome da caixa é exatamente "Levar junto: Corrente Veneziana, Ouro, 10% a menos levando junto".
  - O `sr-only` lê exatamente "de R$ 89,90 por R$ 80,91", e o par visível está dentro de `aria-hidden`.
  - Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `bundleTotal({ mainPrice, mainQty, addons: BundleAddon[] }) → { total, discount }` | sim | o Contrato ("peças marcadas com preço e percentual" → "total … e o desconto"). Único consumidor em produção: `useBuyTogether.ts`. `useBuyAction` e `ProductBuyBar` leem `buyTogether.total`, que continua número | sim: a tarefa 04, linha 52, já traz a forma nova. O barrel faz `export * from './total.ts'`, sem edição |
| 2 | `TakenAddon.price` continua cheio | sim | a tarefa 03 recalcula o desconto na sacola, com um hook de configuração próprio (Contrato da 03, linha 58) | sim |
| 3 | o percentual é lido de `data.addons` por id dentro do hook, sem tocar em `availability.ts` | sim | a tarefa 03 extrai de `availability.ts` (linha 57 dela), então mexer nele agora seria pisar na cerca | sim |
| 4 | um `AddonPrice` único para a linha e o cartão, chamando `buyTogetherDiscountedPrice` | sim | D-"a conta é da função de 01"; o diff não tem conta de desconto na tela | sim |
| 5 | o cartão da lista só mostra preço com desconto; o "de" é `addon.price` na peça escolhida e `product.price` nas outras | sim | "sem percentual, o bloco é idêntico ao de hoje"; a linha usa a mesma regra (`addon.price ?? …product.price`) | sim |
| 6 | a grafia `−{formatPrice(x)}`, sem espaço | sim | `OrderSummary.tsx:222` usa a mesma grafia no "Desconto progressivo" | sim, e o risco de divergir da 03 está declarado |
| 7 | a grade dos cartões fica como está, sem faixa de rolagem | sim | o recorte só pede o "de/por" no cartão; nenhuma faixa existe no código; a folha B reusa o `AddonPanel` (`AddonSheet.tsx:55`) | sim |
| 8 | a região viva anuncia o total descontado, sem frase de desconto | sim | o recorte não pede o anúncio | sim |

## Não conferido

- O que só a execução mostra: a suíte passando, o `tsc` e o lint, e a medida em 390×844 sem rolagem horizontal (RNF-05). Esta última é da Validation/QA.
- CA-02.4, a paridade bloco = sacola, fica para o teste da tarefa 04. Aqui só confere que o bloco calcula só a joia e as peças com o desconto (D-04).
- Diff sem baseline: nenhum. Os dois arquivos novos (`AddonPrice.tsx` e `BuyTogetherDesconto.test.tsx`) aparecem como `A` em `git status`, então estão no diff.

Instruções lidas:
- `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy
- `packages/core/CLAUDE.md` › começo e tabela de módulos (linha `./buy-together`)
- `apps/store/CLAUDE.md` › O bloco Compre Junto (WI-01), O botão único leva o conjunto (WI-01)
- `.specs/LESSONS.md` › L-013, L-014, L-015

As seções "Carrinho, chrome e checkout", "A sacola v4" e "Minha conta" de `apps/store/CLAUDE.md` foram vistas só pelo título: esta tarefa não toca nenhuma dessas superfícies.

## T03 — wi-impl-task · review · agente a87cdc3a8d2b26307

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/03-sacola-e-checkout-com-desconto.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A regra nova é a folha `packages/core/src/buy-together/cartDiscount.ts`, com `allocateBuyTogetherDiscount(lines, config, marks)` e `buyTogetherOfferPercent(...)`. `pricing.ts` a importa por caminho relativo com `.ts` | Pôr a regra dentro de `pricing.ts` | O contrato pede a folha em `core/buy-together`, e as duas chamam `buyTogetherDiscountedPrice` de 01 | 04 (o servidor consome a mesma regra pela `mercado-pago`/`checkout`) |
| 2 | A entrada é `buyTogether?: BuyTogetherPricingInput \| null` = `{ addons: (AddonConfig & { mainProductId })[], lists, marks?: (string[] \| null)[] }`, com `marks` alinhado por índice com `items`. `PricingItem.variant_id?` é opcional | Pôr a marca dentro de `PricingItem` | O contrato só põe `variant_id?` em `PricingItem` | 04 monta essa entrada no servidor, com `marks` = a marca que ele validou |
| 3 | A saída fica em `OrderPricingOutcome.buyTogetherDiscount?` e em `buyTogetherLines?: { index, discountedUnits, segments: { units, percent, unitPrice, mainProductId }[], fullTotal, total, discount }[]`, e os dois campos só existem quando a entrada veio. `totals` não muda de forma | Pôr o campo em `totals` | RNF-02 (nenhum objeto de totais muda de forma); precedente de `promotionDiscount` | 04 (a partição em duas linhas sai de `segments`), 05–08 |
| 4 | Cada unidade de joia dá uma unidade de desconto **por adicional** (slot). Numa lista com duas peças na sacola e 1 joia, só uma unidade (a de maior preço) recebe | Uma unidade por peça distinta dentro da mesma lista | A lista pede exatamente uma peça na página. A redação da CA-03.2 ("uma unidade de uma peça que ela oferece") é ambígua aqui | 04 e o cálculo em geral |
| 5 | A precedência `claimPieces` foi extraída de `resolveAddons` para uma função pura em `availability.ts`. A regra a aplica **depois** do filtro de variação escondida da linha do principal, e sem estoque | Aplicar a precedência antes do filtro de esconder | "Vale o percentual do adicional que a página mostra"; o contrato diz "sem estoque" | `resolveAddons` (mesmo comportamento, os testes de availability seguem verdes) |
| 6 | Par recíproco: com marca de um lado só, recebe a peça marcada. Com as duas marcadas ou nenhuma, recebe a de menor preço cheio da unidade (o menor `unit_price` entre as linhas dela); no empate, a que vem antes na sacola | No caso das duas marcadas, deixar as duas receberem | D-11 só fala de marca única; D-19 desempata pela ordem | 04 |
| 7 | "Promoção aplicada" só conta se a promoção vencer algum item contra a base (o menor entre bump e casado). O cupom descartado só é nomeado se descontar algo no subtotal ou no frete. Essa nuance só vale com a entrada `buyTogether` | Mudar o caminho antigo | D-06 e RNF-02 | 04 (a gravação do `promotion_id` lê `applied`) |
| 8 | Hook novo `useCartBuyTogether(ids)` em `entities/cart/api`, com `staleTime: 0`. Os ids são as linhas da sacola **mais** os principais citados pelas marcas (para a frase "volta"). A leitura traz `main:products!..._product_id_fkey(id, name)`. Sem nenhum adicional com desconto, `config: null` e a entrada não é passada | O staleTime padrão da loja (5 min); ler só os ids da sacola | CA-03.12 (frescor acima de cache) e o nome da joia que saiu da sacola | Gaveta e checkout |
| 9 | `variant_id` só vai em `pricingItems` quando há entrada de desconto casado | Mandar sempre | `useCheckoutTotals.test.tsx:241` compara `pricingItems` por igualdade, e é essa lista que vai ao pedido (RNF-02) | 04 (o payload recebe `variant_id` quando há config) |
| 10 | As frases ficam em `entities/cart/lib/buyTogetherPricing.ts › buyTogetherLineFacts`: "Acompanha o X · N% a menos" (junta os principais da marca com os que deram o desconto; N = o primeiro segmento, o maior), "N com desconto, M a preço cheio" e "O desconto de N% volta com o X na sacola." (só para a peça com marca e só na sacola, como o Design pede). Com desconto, a frase toma o lugar da frase "acompanha" (`data-testid="acompanha"`) | Mostrar duas linhas de frase | Menor superfície, e a forma do Design | Gaveta e `OrderSummary` |
| 11 | Os testes que montam a gaveta e o checkout sem `QueryClientProvider` ganharam `vi.mock('@/entities/cart/api/useCartBuyTogether')` sem configuração, nos 8 arquivos (mesmo padrão de `usePromotions`) | Devolver vazio dentro do hook quando falta o provider | Hook condicional fere as regras de hooks; o mock não afrouxa nenhuma asserção | Testes da loja |
| 12 | A régua "pricing.ts sem nenhum import" (`manualDiscount.test.ts`) virou uma caminhada pelo grafo (só relativo com `.ts`, sem pacote, `node:` nem alias), com âncora exata dos 5 arquivos e sensor | Manter a régua (impossível com o contrato) | RNF-03 e o contrato pedem o import da folha | Quem acrescentar import em `pricing.ts` atualiza a âncora |
| 13 | Os tipos locais de `core/pricing` vão para um arquivo novo, `pricing/types.ts`, importado por `index.ts` e `grid.ts` | Declarar em `index.ts` | `grid.ts` importando de `index.ts` criaria um ciclo, porque `index` reexporta `grid` | `core/pricing` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Sem a entrada nova, `resolveOrderPricing` dá o objeto inteiro de hoje (ausente e `null`) | unidade core | `packages/core/src/payment/__tests__/buyTogetherDiscount.test.ts` | sim | vermelho (M14) |
| 2 | Joia + corrente 10% → 71,10; o PIX incide depois | unidade core | idem | sim | vermelho (M9, M14) |
| 3 | 1 joia × 2 correntes; duas joias somam; maior percentual primeiro; linha de maior preço primeiro; desempate pela ordem | unidade core | idem | sim | vermelho (M1, M2, M10, M11) |
| 4 | Promoção menor vence sem somar; bump vence; cupom acumula sobre o já descontado; descartado só nomeado quando desconta | unidade core | idem | sim | vermelho (M7, M8, M9) |
| 5 | Duas joias → o maior percentual; avulsa antes da lista; ordem entre listas; par recíproco com e sem marca; variação escondida e não liberada; principal sem grade | unidade core | idem + `buy-together/__tests__/cartDiscount.test.ts` | sim | vermelho (M3, M4, M5, M6, M12, M13, M16, M17); M15 ficou verde (equivalente) |
| 6 | O desconto sai em `buyTogetherDiscount`, nunca em `promotionDiscount` | unidade core | `buyTogetherDiscount.test.ts` | sim | vermelho (M9) |
| 7 | Gaveta e checkout: de/por, frase, linha mista, "Desconto do Compre Junto" com o mesmo valor, nota; tirar a joia tira o desconto e mostra a frase "volta"; peça pelo catálogo ganha o desconto; nova leitura com outro percentual muda a sacola; par recíproco pela marca da sacola | componente/página loja | `apps/store/src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx` | sim | vermelho (S1–S6; S6 morreu depois do caso do par recíproco) |
| 8 | A leitura da configuração (select com `discount_percent` e FKs nomeadas, `in` com os ids, ordem, `null` sem desconto ou com erro, `staleTime: 0`, nova leitura traz o percentual novo) | hook loja | `apps/store/src/entities/cart/api/__tests__/useCartBuyTogether.test.tsx` | sim | vermelho (H1–H3; H1 morreu depois de o teste usar o staleTime da loja) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

packages/core/src/buy-together/cartDiscount.ts — criado
packages/core/src/buy-together/__tests__/cartDiscount.test.ts — criado
packages/core/src/buy-together/availability.ts — alterado
packages/core/src/buy-together/index.ts — alterado
packages/core/src/buy-together/__tests__/purity.test.ts — alterado
packages/core/src/payment/pricing.ts — alterado
packages/core/src/payment/__tests__/buyTogetherDiscount.test.ts — criado
packages/core/src/payment/__tests__/manualDiscount.test.ts — alterado
packages/core/src/pricing/types.ts — criado
packages/core/src/pricing/index.ts — alterado
packages/core/src/pricing/grid.ts — alterado
apps/store/src/entities/cart/api/useCartBuyTogether.ts — criado
apps/store/src/entities/cart/api/__tests__/useCartBuyTogether.test.tsx — criado
apps/store/src/entities/cart/lib/buyTogetherPricing.ts — criado
apps/store/src/entities/cart/index.ts — alterado
apps/store/src/entities/cart/model/useCartPromotion.ts — alterado
apps/store/src/entities/cart/model/__tests__/useCartPromotion.test.ts — alterado
apps/store/src/features/checkout/model/useCheckoutTotals.ts — alterado
apps/store/src/features/checkout/model/__tests__/useCheckoutTotals.test.tsx — alterado
apps/store/src/features/checkout/ui/OrderSummary.tsx — alterado
apps/store/src/features/checkout/ui/__tests__/OrderSummary.test.tsx — alterado
apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx — alterado
apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx — alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawer.test.tsx — alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx — alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaMedida.test.tsx — alterado
apps/store/src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx — criado
apps/store/src/pages/__tests__/CheckoutPage.test.tsx — alterado
apps/store/src/pages/__tests__/checkoutSobreviveAVoltaDaAba.test.tsx — alterado
.specs/STATE.md — alterado

## Verificação

- Tipos, de `CLAUDE.md` › Comandos (`npx tsc --noEmit -p …`). Não veio baseline, então contei contra a linha *Tipos* de `CLAUDE.md` › Baselines, com a árvore no estado de agora (a 02 corre em paralelo):
  - store app: 0
  - store server: 0
  - mobile-adm: 0
  - `packages/core`: 11, os mesmos herdados (home/sitemap/supabase client), nenhum em arquivo meu
  - backoffice: 7, todos TS2593/TS2304 em `apps/backoffice/src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx`, do commit `4c6e9a16`, anterior ao WI. Não é desta tarefa; a linha *Tipos* diz 0
- Um arquivo de teste, de `PROJECT.md` › Comandos de verificação (`pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`). Todos verdes no fim:
  - core: `buyTogetherDiscount.test.ts` (21), `cartDiscount.test.ts`, os diretórios `src/payment`, `src/buy-together`, `src/pricing`, `src/coupons`, `src/proposals`, `src/seo` e `src/shopping`
  - store: `compreJuntoSacolaECheckout.test.tsx` (7), `useCartBuyTogether.test.tsx` (5), e os diretórios `src/widgets/cart-drawer`, `src/entities/cart` e `src/features/checkout`
- Verificação mínima, de `CLAUDE.md` › Baselines (a suíte do workspace tocado, exit fora de pipe), todas exit 0:
  - core: 5348/216
  - store, em lotes: 5135/269 + 1783/99 + 20/2
  - functions: 1439/39 (consome `pricing.ts`)
  - backoffice, em lotes: 1227/90 + 3879/191 (consome core)
  - Os números de store e core já incluem o trabalho da 02, que corre na mesma árvore
- Os testes existentes de `pricing.test.ts`, `orderBump.test.ts` e `progressive.test.ts` passaram sem nenhuma asserção tocada.
- Lint (`npx eslint`) nos arquivos da loja que toquei: 0/0.
- Instruções lidas:
  - `CLAUDE.md` (raiz), as seções da tarefa (O "defeito 01", Alias de import, Convenções, Os guardas, Baselines, CI e deploy), lidas pelo contexto já carregado; o arquivo do worktree é idêntico ao da raiz principal
  - `packages/core/CLAUDE.md` › índice, Os módulos, Dinheiro e `proposals`
  - `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido
  - `.specs/LESSONS.md` › L-013, L-014, L-015
  - `.specs/project/PROJECT.md` › Comandos de verificação e Ambiente local
- O `tdd` foi lido.

## Divergências e descobertas

- **Guarda mudado.** `packages/core/src/payment/__tests__/manualDiscount.test.ts` exigia "nenhuma linha de import" em `pricing.ts`. O contrato obriga o import da folha nova, então a régua passou a caminhar o grafo transitivo, com âncora exata e sensor. A régua não foi afrouxada: o que se mede continua sendo o que o Deno exige (decisão 12).
- **Âncora atualizada.** `buy-together/__tests__/purity.test.ts` agora conta 9 arquivos e 11 visitados.
- **Ordem do ciclo.** Escrevi a implementação antes dos testes. Por isso todas as fatias passaram de primeira e todas levaram o check de mutação: 26 mutantes, todos vermelhos por asserção, cópia restaurada e conferida com `cmp`, exceto:
  - M15 ficou verde e é equivalente: o filtro "peça = o próprio principal" em `offersOf` é redundante com o filtro de elegibilidade `line.product_id === grant.mainProductId`
  - S6 e H1 ficaram verdes na primeira rodada; os testes ganharam o caso que faltava e os dois morreram
- **Afirmações velhas de `packages/core/CLAUDE.md`.** Ficaram falsas e não as editei, porque não é desta tarefa:
  - o aviso "`pricing/index.ts` e `pricing/grid.ts` ainda importam tipos de `@estrelinha/supabase/types`… impede o boot LOCAL" deixou de valer (D-12 feito)
  - a linha de `./buy-together` em "Os módulos" não cita `cartDiscount`/`claimPieces`
  - quem fechar o WI atualiza as duas
- **Sem integração no ambiente local.** O efeito do `select` do hook novo contra o PostgREST real (FKs nomeadas, embed de `main`) não foi executado; só o dublê registra a forma. É o modo de falha `PGRST201` do `AD-012`: fica para a 04 ou a Validation provar contra o banco local.
- **`AD-073` escrito em `.specs/STATE.md`.** O número estava livre (o último era `AD-072`).
- **Citações conferidas.** Abri 8:
  - `pricing.ts › manualDiscount/perItemMin/resolveChargedItems`
  - `availability.ts:152-160 (claimed)`, que estava em 152-160
  - `marks.ts`
  - `useBuyTogetherData.ts`
  - `OrderSummary.tsx` (a linha "Desconto progressivo")
  - `core/pricing/index.ts:19-25`
  - `grid.ts:6`
  - `cartStore.ts`
  - Nenhuma estava morta nem deslocada. O `Depende de` 01 confere: `discountPercent`, a coluna em `20261107130000` e `buyTogetherDiscountedPrice`.
- **`grid.ts`.** `file` o identifica como "data" (há bytes fora de UTF-8); editei em modo binário para preservar o resto.
- Nada a propagar: as afirmações da 04 sobre a entrada e a saída de 03 continuam verdadeiras.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz; seções da tarefa) · packages/core/CLAUDE.md (índice, Os módulos, Dinheiro, proposals) · apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido · .specs/LESSONS.md › L-013, L-014, L-015 · .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - RNF-02 por objeto inteiro (ausente e nulo) — packages/core/src/payment/__tests__/buyTogetherDiscount.test.ts
  - joia + corrente 10% = 71,10 e o PIX depois — idem
  - 1×2, as joias somam, o maior percentual primeiro, a linha de maior preço primeiro, o desempate pela ordem — idem
  - promoção vence sem somar / promoção que não vence não conta / bump vence / cupom acumula / descartado só quando desconta — idem
  - o maior percentual entre joias / avulsa antes da lista / ordem entre listas / par recíproco com e sem marca / variação escondida e não liberada / principal sem grade — idem + packages/core/src/buy-together/__tests__/cartDiscount.test.ts
  - o desconto em buyTogetherDiscount, não em promotionDiscount — buyTogetherDiscount.test.ts
  - gaveta e checkout (linha mista, frase da volta, "Desconto do Compre Junto" com o mesmo valor, tirar a joia, peça pelo catálogo, nova leitura muda a sacola, par recíproco pela marca da sacola) — apps/store/src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx
  - a leitura da configuração e a nova leitura — apps/store/src/entities/cart/api/__tests__/useCartBuyTogether.test.tsx
  - Sem cobertura: o select contra o PostgREST real (não há prova de integração no banco local nesta tarefa)
Verificações:
  - tsc: store 0, server 0, mobile-adm 0, core 11 herdados, backoffice 7 alheios (ProposalStateBadge.test.tsx, commit 4c6e9a16)
  - suítes exit 0: core 5348/216, store 5135+1783+20, functions 1439/39, backoffice 1227+3879
  - testes antigos de pricing, orderBump e progressive intocados
  - 26 mutantes vermelhos, 1 equivalente declarado (M15)
  - eslint dos arquivos da loja que toquei 0/0
Árvore de trabalho: os 30 arquivos de `Arquivos alterados` (core: cartDiscount.ts, pricing.ts, availability.ts, pricing/types.ts e companhia; store: useCartBuyTogether, buyTogetherPricing, useCartPromotion, useCheckoutTotals, OrderSummary, CartDrawer, CartDrawerRow e os testes; .specs/STATE.md com o AD-073); nada commitado
Citações conferidas: 8 abertas ao usar; nenhuma deslocada, nenhuma morta
Caducou: nenhuma tarefa fechada afetada. Em packages/core/CLAUDE.md, o aviso de `pricing/index.ts`/`grid.ts` com `import type` de pacote ficou falso pelo D-12 (registrado, não reescrito)
```

## T03 — wi-impl-review · fixing · agente a82a4cbd06535ff75

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/03-sacola-e-checkout-com-desconto.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | convenção violada | atrapalha | apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx:24 e apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx:7 | Os dois imports novos de `buyTogetherLineFacts` / `BuyTogetherLineFacts` usam o caminho profundo `@/entities/cart/lib/buyTogetherPricing`, embora a própria tarefa tenha posto os dois no barrel (`apps/store/src/entities/cart/index.ts`) e o `OrderSummary.tsx` já os importe de `@/entities/cart` | `CLAUDE.md` (raiz), Feature-Sliced Design: "Cada slice tem um barrel `index.ts` (public API). **Novo código deve importar do slice** (`@/entities/product`) e não de caminhos profundos." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| RNF-02: os testes existentes de `pricing` passam sem uma asserção tocada | `pricing.test.ts`, `orderBump.test.ts` e `progressive.test.ts` estão fora de `git status`, sem nenhuma alteração. `buyTogetherDiscount.test.ts:70-88` compara o objeto inteiro com a entrada ausente e com `null`, e confere que os campos novos não aparecem | só execução |
| a gaveta e o checkout mostram o mesmo desconto, pela mesma função | `useCartPromotion.ts:155-184` e `useCheckoutTotals.ts:153-193`: a mesma leitura (`useCartBuyTogether(cartBuyTogetherIds(items))`) e a mesma entrada (`cartBuyTogetherInput`) vão a `resolveOrderPricing`. Os valores exibidos saem de `buyTogetherDiscount` e `buyTogetherLines` (`CartDrawer.tsx:279-291`, `OrderSummary.tsx:250-263`). Provado em `compreJuntoSacolaECheckout.test.tsx:117-144` | sim |
| `pricing.ts` e a regra chamam a função de 01, sem conta própria | `cartDiscount.ts:25,240` chama `buyTogetherDiscountedPrice`. `pricing.ts` só usa `seg.unitPrice` (`buyTogetherParts`) | sim |
| `AD-073` escrito em `.specs/STATE.md` | `.specs/STATE.md:1750-1772`, emendando o `AD-015` | sim |
| `core/pricing` sem `import type` de pacote | `pricing/index.ts:19-25` e `pricing/grid.ts:6` importam de `./types.ts` (arquivo novo) | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima (tsc do core, testes) | — | só execução |

## Obrigações

- **`payment/**` muda por declaração, RNF-02 provada por valor**: aplicada. Os três arquivos de teste citados estão intocados. A régua do objeto inteiro está em `buyTogetherDiscount.test.ts:70-88`. A régua "pricing.ts sem import" de `manualDiscount.test.ts` foi trocada por uma caminhada pelo grafo, com âncora exata e sensor. A troca é exigida pelo próprio contrato, que manda `pricing.ts` importar a folha nova, e não é afrouxamento.
- **RNF-03 e `purity.test.ts`**: aplicada. `cartDiscount.ts:24-25` só tem imports relativos com `.ts`, e `pricing.ts:5-9` também. O `purity.test.ts` foi atualizado com a lista exata (9 arquivos), a contagem 11 e uma âncora no export novo.
- **"Defeito 01", nenhuma conta na tela**: aplicada. `buyTogetherPricing.ts` só monta a entrada e escreve as frases. A única subtração é `quantity − discountedUnits`, que conta unidades e não é dinheiro.
- **Hook em `entities/`**: aplicada (`apps/store/src/entities/cart/api/useCartBuyTogether.ts`).
- **`packages/core` sem lint, tsc e testes como gate**: só a execução prova.

## Testes

- **Sem a entrada nova, objeto idêntico**: `buyTogetherDiscount.test.ts:71-87`. Morde: `toEqual` no objeto inteiro e `not.toHaveProperty` nos campos novos.
- **Joia + corrente 10% → 71,10, PIX depois**: `buyTogetherDiscount.test.ts:91-108`. Morde: `totals` inteiro com o PIX de 37,11 sobre 371,10, e as linhas por igualdade. Também `cartDiscount.test.ts:43-59`.
- **Alocação por unidades**: `buyTogetherDiscount.test.ts:110-162`. Cobre 1×2, a soma de duas joias, o maior percentual primeiro (segmento exato), a linha mais cara primeiro e o desempate pelo índice. Morde.
- **Promoção, bump, cupom e descartado**: `buyTogetherDiscount.test.ts:173-238`. Cobre a promoção que vence sem somar (355,30), a promoção que não passa da base (não aplicada), o bump que vence (desconto casado 0), o cupom sobre 371,10 (37,11) e o descartado nomeado ou não, nos dois sentidos, inclusive o frete. Morde.
- **Percentuais, precedência, par recíproco, variação e principal sem grade**: `buyTogetherDiscount.test.ts:125-143` e `:241-326`. Cobre a avulsa antes da lista com percentuais invertidos, a ordem entre listas, o par recíproco com e sem marca (valores 7,9 e 60), a variação escondida (inclusive a mista), a variação não liberada e o principal sem grade. Morde.
- **O desconto vai a `buyTogetherDiscount`, nunca a `promotionDiscount`**: `buyTogetherDiscount.test.ts:164-170`. Morde.
- **Gaveta e checkout**: `compreJuntoSacolaECheckout.test.tsx`. Monta a gaveta e o resumo reais e dubla só a leitura. Cobre o de/por, a frase, o mesmo valor nas duas, a linha mista, tirar a joia (com a frase da volta), a peça pelo catálogo, o percentual novo e o par recíproco. Morde. A releitura com `staleTime: 0` está provada à parte em `useCartBuyTogether.test.tsx:138-154`, com o dublê registrando tabela, select, `in` e ordem.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | A folha `cartDiscount.ts` com `allocateBuyTogetherDiscount` e `buyTogetherOfferPercent` | sim | O contrato ("folha nova em `core/buy-together`") e os imports com `.ts` | sim |
| 2 | Entrada `buyTogether` com `marks` alinhado por índice; `variant_id?` em `PricingItem` | sim | O contrato só põe `variant_id?` em `PricingItem` (`pricing.ts:15-21`) | sim |
| 3 | Saídas `buyTogetherDiscount` e `buyTogetherLines` só com a entrada; `totals` sem mudar de forma | sim | RNF-02 e o precedente de `manualDiscount` | sim |
| 4 | Uma unidade de desconto por adicional (slot) e por unidade de joia | sim | spec.md:140, "percentual por par (principal, peça)". A redação de CA-03.2 é ambígua, como ele declarou | sim |
| 5 | `claimPieces` extraído, aplicado depois do filtro de esconder, sem estoque | sim | É extração fiel de `resolveAddons` (`availability.ts:113-137`, `183`), e D-05/D-21 dizem "sem estoque" | sim |
| 6 | Par recíproco: com marca única, recebe a marcada; com as duas marcadas ou nenhuma, a de menor preço cheio; no empate, a ordem | sim | D-11, D-19 e CA-03.10 (`cartDiscount.ts:186-205`) | sim |
| 7 | "Aplicada" só se a promoção vence a base; o descartado só é nomeado se descontar | sim | D-06; o caminho antigo fica intacto (`!input.buyTogether ||`, `pricing.ts:703-706`) | sim |
| 8 | Hook com `staleTime: 0`, ids da sacola mais os das marcas, `config: null` sem desconto | sim | CA-03.12; o exemplar `useBuyTogetherData.ts:68-70` usa os mesmos nomes de FK | sim |
| 9 | `variant_id` em `pricingItems` só com a entrada | sim | `buildOrderItems` lê `variant_id` de `item`, não de `pricingItems` (`buildOrderPayload.ts:84`). O pedido não muda por isso | sim |
| 10 | Frases em `buyTogetherLineFacts`; com desconto, a frase toma o lugar da "acompanha" | sim | O recorte Design da tarefa | sim |
| 11 | Mock de `useCartBuyTogether` nos 8 arquivos de teste montados sem provider | sim | Os 8 diffs só acrescentam o `vi.mock` (com `config: null`); nenhuma asserção foi tocada | sim |
| 12 | A régua de `pricing.ts` passou a caminhar o grafo, com âncora dos 5 arquivos e sensor | sim | O contrato exige o import, e a régua nova é mais estrita no grafo | sim |
| 13 | `pricing/types.ts` local para evitar o ciclo | sim | D-12; os tipos são estruturalmente compatíveis com `packages/supabase/src/types/index.ts` | sim |

## Não conferido

- Os arquivos novos aparecem como `A` (no índice). Por isso li cada um inteiro, e o baseline existe.
- Não rodei tsc nem testes. Ficaram sem prova por leitura dois pontos: a compatibilidade dos tipos locais de `core/pricing/types.ts` com os consumidores de `grid.ts` (o painel), e o gate dos 11 erros herdados.
- Uma consequência a jusante que a tarefa não pede tratar: com a configuração presente, `CheckoutPage.tsx` passa a `buildOrderPayload` um `totals` já com o desconto casado, enquanto `order_items.unit_price` sai a preço cheio. Quem cuida disso é a tarefa 04, e a premissa 3 já a lista no raio de alcance.
- O comentário de `packages/core/src/pricing/types.ts:3` cita o nome do pacote em prosa, no arquivo que o Deno passa a alcançar. Não confirmei se o bundler do `supabase start` tropeça nessa forma; o incidente registrado foi com import relativo sem extensão escrito por extenso.
- RNF-05 (390×844 sem rolagem) só o navegador prova.

Instruções lidas: CLAUDE.md (raiz), carregado inteiro no contexto (O "defeito 01", Alias de import, Convenções, Os guardas, Baselines, CI e deploy, Feature-Sliced Design); apps/store/CLAUDE.md › só a busca por "barrel"/import profundo, sem as seções citadas pela tarefa; packages/core/CLAUDE.md › só a busca por "barrel"; .specs/LESSONS.md (L-013, L-014, L-015) não lido.

## T03 — wi-impl-task · done · agente a87cdc3a8d2b26307

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/03-sacola-e-checkout-com-desconto.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

nada

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 7 | Gaveta e checkout com o desconto do Compre Junto (reaberta só pelos imports da gaveta) | componente/página loja | `apps/store/src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx` e `apps/store/src/widgets/cart-drawer/ui/__tests__/*` | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

A correção alterou dois arquivos, ambos já alterados na implementação. A lista abaixo é tudo o que a tarefa alterou, implementação e correção juntas:

packages/core/src/buy-together/cartDiscount.ts — criado
packages/core/src/buy-together/__tests__/cartDiscount.test.ts — criado
packages/core/src/buy-together/availability.ts — alterado
packages/core/src/buy-together/index.ts — alterado
packages/core/src/buy-together/__tests__/purity.test.ts — alterado
packages/core/src/payment/pricing.ts — alterado
packages/core/src/payment/__tests__/buyTogetherDiscount.test.ts — criado
packages/core/src/payment/__tests__/manualDiscount.test.ts — alterado
packages/core/src/pricing/types.ts — criado
packages/core/src/pricing/index.ts — alterado
packages/core/src/pricing/grid.ts — alterado
apps/store/src/entities/cart/api/useCartBuyTogether.ts — criado
apps/store/src/entities/cart/api/__tests__/useCartBuyTogether.test.tsx — criado
apps/store/src/entities/cart/lib/buyTogetherPricing.ts — criado
apps/store/src/entities/cart/index.ts — alterado
apps/store/src/entities/cart/model/useCartPromotion.ts — alterado
apps/store/src/entities/cart/model/__tests__/useCartPromotion.test.ts — alterado
apps/store/src/features/checkout/model/useCheckoutTotals.ts — alterado
apps/store/src/features/checkout/model/__tests__/useCheckoutTotals.test.tsx — alterado
apps/store/src/features/checkout/ui/OrderSummary.tsx — alterado
apps/store/src/features/checkout/ui/__tests__/OrderSummary.test.tsx — alterado
apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx — alterado (implementação e correção: o import passou a vir do barrel `@/entities/cart`)
apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx — alterado (implementação e correção: o import passou a vir do barrel `@/entities/cart`)
apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawer.test.tsx — alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx — alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/sacolaMedida.test.tsx — alterado
apps/store/src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx — criado
apps/store/src/pages/__tests__/CheckoutPage.test.tsx — alterado
apps/store/src/pages/__tests__/checkoutSobreviveAVoltaDaAba.test.tsx — alterado
.specs/STATE.md — alterado

## Verificação

- Conferência de tipos da loja (`npx tsc --noEmit -p apps/store/tsconfig.app.json`, de `CLAUDE.md` › Comandos): 0 erros, igual à linha *Tipos* de `CLAUDE.md` › Baselines.
- Testes dos arquivos que a correção tocou (`pnpm --filter @estrelinha/store exec vitest run src/widgets/cart-drawer src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx src/widgets/store-layout --testTimeout=20000`, forma de `PROJECT.md` › Comandos de verificação): exit 0, 89 testes em 7 arquivos, todos verdes.
- `npx eslint` nos dois arquivos corrigidos: 0 erros e 0 avisos.
- Instruções lidas: as mesmas da implementação (`CLAUDE.md` › Feature-Sliced Design, que fundamenta o achado).

## Divergências e descobertas

nada

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz; seções da tarefa e Feature-Sliced Design) · packages/core/CLAUDE.md (índice, Os módulos, Dinheiro, proposals) · apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido · .specs/LESSONS.md › L-013, L-014, L-015 · .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - RNF-02 por objeto inteiro (ausente e nulo) — packages/core/src/payment/__tests__/buyTogetherDiscount.test.ts
  - joia + corrente 10% = 71,10 e o PIX depois — idem
  - 1×2, as joias somam, o maior percentual primeiro, a linha de maior preço primeiro, o desempate pela ordem — idem
  - promoção vence sem somar, promoção que não vence não conta, bump vence, cupom acumula, o descartado só nomeado quando desconta — idem
  - o maior percentual entre joias, a avulsa antes da lista, a ordem entre listas, o par recíproco com e sem marca, a variação escondida e a não liberada, o principal sem grade — idem + packages/core/src/buy-together/__tests__/cartDiscount.test.ts
  - o desconto em buyTogetherDiscount, não em promotionDiscount — buyTogetherDiscount.test.ts
  - gaveta e checkout (linha mista, frase da volta, "Desconto do Compre Junto" com o mesmo valor, tirar a joia, peça pelo catálogo, nova leitura muda a sacola, par recíproco pela marca) — apps/store/src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx
  - a leitura da configuração e a nova leitura — apps/store/src/entities/cart/api/__tests__/useCartBuyTogether.test.tsx
  - Sem cobertura: o select contra o PostgREST real (nenhuma prova no banco local nesta tarefa)
Verificações:
  - implementação: tsc store 0 / server 0 / mobile-adm 0 / core 11 herdados / backoffice 7 alheios (ProposalStateBadge.test.tsx, commit 4c6e9a16)
  - implementação: suítes exit 0 — core 5348/216, store 5135+1783+20, functions 1439/39, backoffice 1227+3879
  - implementação: 26 mutantes vermelhos, 1 equivalente (M15)
  - correção: tsc da loja 0, 89/7 verdes, eslint 0/0
Árvore de trabalho: os 30 arquivos de `Arquivos alterados` (core: cartDiscount.ts, pricing.ts, pricing/types.ts e companhia; loja: o hook, o lib, useCartPromotion, useCheckoutTotals, OrderSummary, CartDrawer, CartDrawerRow e os testes; .specs/STATE.md com o AD-073). A correção mudou só os imports de CartDrawer.tsx e CartDrawerRow.tsx para o barrel `@/entities/cart`. Nada commitado
Citações conferidas: 8 abertas ao usar; nenhuma deslocada, nenhuma morta
Caducou: nenhuma tarefa fechada afetada. Em packages/core/CLAUDE.md, o aviso de `pricing/index.ts`/`grid.ts` com `import type` de pacote ficou falso pelo D-12 (registrado, não reescrito)
```

## T04 — wi-impl-task · review · agente afd48c357280044cc

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/04-servidor-cobra-o-que-a-tela-mostrou.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Acrescentei `resolveOrderLines(input, outcome)` a `packages/core/src/payment/pricing.ts`. Ele é só exportado e não muda nenhuma conta: devolve as linhas do pedido (preço cheio e cobrado por unidade, no caminho que venceu, com a linha mista partida em duas e as partes de mesmo preço juntadas) e os descontos por tipo (`orderBumpDiscount` = cheio − subtotal − promoção − casado, com `|| 0` contra o `-0`). | Remontar os passos (bump, faixa, casado, `perItemMin`) na loja e no servidor. | L-015 e o "defeito 01": a loja e o servidor chamam a mesma função. A regra de `pricing.ts` (tarefa 03) continua intocada. | A loja grava o pedido por aqui e o servidor regrava por aqui. 05, 06, 07 e 08 leem `unit_price` = cobrado e `full_unit_price` produzidos por esta função. |
| 2 | Criei `joinOrderRows` em `core/payment/orderLines.ts` (arquivo sem import). Ele junta as linhas pela identidade da linha da sacola (`product_id`, `variant_id`, `size`, `finish`, `engraving_text`) e une as marcas. | Juntar só por produto + variação. | É a chave de `itemKey`. Gravações diferentes são linhas diferentes também na sacola. | O recálculo do `create-payment` e o teste de exibido = cobrado. |
| 3 | O servidor regrava as linhas de cada peça para casar com as partes recalculadas: atualiza só o que mudou, insere a parte a mais (copiando o snapshot da 1ª linha) e apaga a linha que sobrou. | Manter o formato das linhas como a loja gravou. | Quando outro desconto passa a valer no lugar do casado, o pedido fica mais barato e segue, mas o número de partes muda. Sem regravar, `unit_price × quantidade` não somaria o subtotal. | Nesses casos raros os ids de `order_items` mudam (05, 06, 07 e 08 leem itens). A baixa de estoque por linha soma igual. |
| 4 | Não ordeno a leitura de `order_items`: nenhuma coluna guarda a posição da linha. | Criar coluna de posição, ou ordenar por `created_at` (empata na gravação em lote). | É a menor superfície. O desempate por posição só pesa em bordas raras, como o par recíproco com o mesmo preço e percentuais diferentes, sem marca. | Recálculo dessas bordas: o total pode sair diferente do da sacola, e então segue mais barato ou cai no 422. |
| 5 | A guarda compara a soma dos três descontos gravados com a soma recalculada, em centavos (D-03). O código é `buy_together_price_changed` quando o casado caiu; nos outros casos (inclusive o bump que caiu) é `promotion_no_longer_valid`. Pela D-13, a frase da promoção passou a ser "A promoção deste pedido mudou. Nada foi cobrado." | Manter a guarda da promoção sozinha, ao lado de uma do casado. | Com guardas separadas, recusaria o caso em que um desconto troca de lugar com outro e o pedido fica mais barato. | Pedido criado antes do deploy tem `order_bump_discount` = 0: na transição, o bump recalculado soma ao lado do recalculado e afrouxa a guarda da promoção. A loja não tem tela própria para `promotion_no_longer_valid` (segue a mensagem genérica). |
| 6 | O corpo do 422 traz `displayed_total` (`orders.total` gravado), `total` (recalculado) e `piece` (o nome da primeira peça cujo total recalculado subiu, ou `null`). | Recalcular o "agora" na loja depois de reler a configuração. | O número que vai ser cobrado é do servidor. | As duas telas de "o valor mudou". |
| 7 | Se a leitura de `product_buy_together` falha no `create-payment`, a resposta é 500 "Não foi possível calcular o pedido. Tente de novo.", antes de qualquer chamada ao Mercado Pago. | Seguir a preço cheio. | Seguir a preço cheio viraria um 422 de "o valor mudou" falso. | Disponibilidade do pagamento quando essa leitura falha. |
| 8 | A conversão linha → configuração (`buyTogetherDiscountConfig`, mais o tipo da linha) foi para `core/buy-together/cartDiscount.ts`. O `select` foi para `core/buy-together/io/discountSelect.ts`. A sacola (`useCartBuyTogether`) passou a chamar os dois, e o servidor usa os mesmos. | Manter uma cópia do `select` e do mapeamento na loja e outra na function; ou o `select` direto em `core/buy-together`. | Uma leitura só. Fica num subdiretório porque `tomDoCompreJunto.test.ts` lê os literais do diretório de cima e acusa o `!` da sintaxe de embed do PostgREST. Não é texto que a cliente lê. | A gaveta e o checkout (mesmo resultado; o teste do hook continua verde). 06 é dona do guarda de tom. |
| 9 | O `discount` do `purchase` (GA4) soma `buy_together_discount`, arredondado a centavo. `order_bump_discount` não entra. | Somar também o bump. | O bump já ia embutido em `unit_price` antes e nunca entrou no `discount`. | Relatórios do GA4. |
| 10 | O PIX que nasce do checkout recebe o 422 na rota do pagamento. A rota tira o pedido do rascunho e volta para `/checkout` levando `{ priceChanged }` no estado da navegação. O checkout mostra o aviso, e "Confirmar com o novo total" roda `handleConfirm` de novo, criando outro pedido. No cartão, o mesmo aviso aparece no próprio checkout. A origem é decidida na montagem da rota: `checkoutStore.orderId === id`. | Confirmar a partir da própria rota do PIX. | A tela "Checkout · o valor mudou" mora no checkout, e o pedido antigo não pode ser repago (tomaria o mesmo 422). | O pedido antigo fica `pending` no banco: em Minha conta ele mostra a versão com o contato (05). |
| 11 | `useCartBuyTogether` passou a expor `refresh`, que o checkout chama depois do 422 do cartão. | `useQueryClient` no `CheckoutPage`. | Os testes da página montam sem `QueryClientProvider` (L-030). | Nada além da gaveta e do checkout. O objeto é memoizado. |
| 12 | A tela do link/Minha conta tem componente próprio (`PriceChangedContact`): portão de 10 dígitos por `whatsappHref`, e-mail só quando existe, os rótulos do design e a mensagem "Olá. O valor do meu pedido #NNNN mudou e o pagamento não seguiu. Podemos combinar como seguir?". O aviso do checkout fica no fluxo, logo acima do botão de pagar. | Reusar `PolicyContact` (os rótulos são outros). | Segue o design e o tom memorial (sem exclamação). | Só as duas telas novas. |
| 13 | `buildOrderItems` passou a exigir `lines` (de `useCheckoutTotals().orderLines`). | Um recuo que calcula só o bump quando `lines` falta. | Um segundo caminho de preço em silêncio. | `CheckoutPage` e os testes da montagem do pedido. |
| 14 | Migration `20261107140000_compre-junto-desconto-no-pedido.sql`: colunas com `add column if not exists`, e os `check` nomeados dentro de um `do $$` com guarda. Aplicada só no banco local. | `check` inline. | É o molde da migration de `promotion_discount`. | 05, 07 e 08 (a próxima migration usa o prefixo `20261107150000` ou maior). |
| 15 | A asserção `not.toMatch(/accompanies/)` foi invertida (D-11): o recálculo lê a marca de `order_items` por `ITENS_DO_RECALCULO`, e nunca do corpo. Ganhou três sensores: sem a coluna, `body?.items…accompanies` e `body.accompanies…`. | — | É o que a D-11 manda. | `createOrder.test.ts`. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Bloco = sacola: mesmo total sem promoção nem cupom; com promoção, a sacola dá o menor | core | `packages/core/src/buy-together/__tests__/blocoIgualSacola.test.ts` | sim | vermelho (desconto apagado de `bundleTotal`; desconto casado apagado de `cartDiscount`) |
| 2 | `displayedEqualsCharged` estendido: casado, bump, promoção e cupom; linha mista gravada e juntada; par recíproco pela marca | core | `packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts` | sim | vermelho (junção desligada: 2 falhas; `winner` ignorado: 1 falha) |
| 3 | A criação guarda as colunas novas (`buy_together_discount`, `order_bump_discount`, `full_unit_price`) | functions | `supabase/functions/checkout/__tests__/createOrder.test.ts` | sim | — |
| 4 | O pagamento ignora `unit_price` e marca forjados (corpo e linhas) e recalcula pelo banco | functions | `supabase/functions/mercado-pago/__tests__/buyTogetherCharge.test.ts` | sim | vermelho (configuração lida como nula: 6 falhas) |
| 5 | 422 `buy_together_price_changed` quando sai mais caro; segue quando igual, mais barato ou com outro desconto no lugar | functions | idem | sim | vermelho (guarda desligada: 2 falhas) |
| 6 | Grava cobrado, cheio e descontos por tipo; linha mista em duas, bump não dobra; insere a parte a mais e apaga a que sobra; pin pelo cheio; par recíproco pela marca gravada | functions | idem + `handlers.test.ts` (reescritos) | sim | vermelho (pin lendo `unit_price`; junção desligada; marcas vazias) |
| 7 | `purchase` leva o preço cobrado e soma o casado | functions | `supabase/functions/mercado-pago/__tests__/analytics.test.ts` | sim | vermelho (preço lido de `full_unit_price`) |
| 8 | Payload da loja: linha mista em duas, cobrado e cheio, descontos por tipo no corpo | loja | `apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts` | sim | — |
| 9 | Guarda: chaves do corpo do pedido = `COLUNAS_DO_PEDIDO` nos dois sentidos, com sensores; âncora dos itens 14→15 | loja | `chavesDoPedido.test.ts` (novo), `chavesDoItemDoPedido.test.ts` | sim | — (sensores embutidos) |
| 10 | O 422 vira `PriceChangedError` com antes, agora e peça; o da promoção continua erro comum | loja | `apps/store/src/features/checkout/api/__tests__/useCreatePayment.test.tsx` | sim | vermelho |
| 11 | A máquina do PIX: o valor que mudou vira `price-changed`, não `failed` | loja | `apps/store/src/features/order-payment/model/__tests__/usePixPayment.test.tsx` | sim | vermelho |
| 12 | Checkout: o 422 mostra "O valor do seu pedido mudou" com antes e agora; "Confirmar com o novo total" cria outro pedido; "Voltar à sacola"; chegada pelo PIX via estado | loja | `apps/store/src/pages/__tests__/CheckoutPage.test.tsx` | sim | vermelho (sem o ramo; sem ler o estado; sem descartar o pedido) |
| 13 | Link/Minha conta: "O valor deste pedido mudou" com o contato; pedido da sacola volta ao checkout | loja | `apps/store/src/pages/__tests__/OrderPaymentPage.test.tsx` | sim | vermelho (origem sempre falsa; sem descartar o pedido) |
| 14 | Integração local: a criação grava as colunas novas e o `check` recusa negativo | integração | `.specs/work-items/92-desconto-da-compra-casada/probes/02-desconto-no-pedido.sh` | sim (8 `ok —`) | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

supabase/migrations/20261107140000_compre-junto-desconto-no-pedido.sql — criado
supabase/functions/checkout/handlers.ts — alterado
supabase/functions/checkout/__tests__/createOrder.test.ts — alterado
supabase/functions/mercado-pago/handlers.ts — alterado
supabase/functions/mercado-pago/analytics.ts — alterado
supabase/functions/mercado-pago/__tests__/handlers.test.ts — alterado
supabase/functions/mercado-pago/__tests__/analytics.test.ts — alterado
supabase/functions/mercado-pago/__tests__/buyTogetherCharge.test.ts — criado
packages/core/src/payment/pricing.ts — alterado
packages/core/src/payment/orderLines.ts — criado
packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts — alterado
packages/core/src/buy-together/cartDiscount.ts — alterado
packages/core/src/buy-together/io/discountSelect.ts — criado
packages/core/src/buy-together/__tests__/blocoIgualSacola.test.ts — criado
packages/core/CLAUDE.md — alterado
packages/supabase/src/types/index.ts — alterado
supabase/CLAUDE.md — alterado
apps/store/src/entities/cart/api/useCartBuyTogether.ts — alterado
apps/store/src/entities/order/api/useOrders.ts — alterado
apps/store/src/features/checkout/api/useCreatePayment.ts — alterado
apps/store/src/features/checkout/api/__tests__/useCreatePayment.test.tsx — alterado
apps/store/src/features/checkout/lib/buildOrderPayload.ts — alterado
apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts — alterado
apps/store/src/features/checkout/lib/__tests__/chavesDoItemDoPedido.test.ts — alterado
apps/store/src/features/checkout/lib/__tests__/chavesDoPedido.test.ts — criado
apps/store/src/features/checkout/model/useCheckoutTotals.ts — alterado
apps/store/src/features/order-payment/index.ts — alterado
apps/store/src/features/order-payment/model/usePixPayment.ts — alterado
apps/store/src/features/order-payment/model/__tests__/usePixPayment.test.tsx — alterado
apps/store/src/features/order-payment/ui/PixSurface.tsx — alterado
apps/store/src/features/order-payment/ui/PriceChangedCheckout.tsx — criado
apps/store/src/features/order-payment/ui/PriceChangedContact.tsx — criado
apps/store/src/pages/CheckoutPage.tsx — alterado
apps/store/src/pages/OrderPaymentPage.tsx — alterado
apps/store/src/pages/__tests__/CheckoutPage.test.tsx — alterado
apps/store/src/pages/__tests__/OrderPaymentPage.test.tsx — alterado
apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx — alterado (só o dublê de `useCreatePayment` passou a espalhar o módulo real)
apps/store/src/pages/__tests__/checkoutSobreviveAVoltaDaAba.test.tsx — alterado (idem)
.specs/work-items/92-desconto-da-compra-casada/probes/02-desconto-no-pedido.sh — criado

## Verificação

- Tipos: `npx tsc --noEmit -p apps/store/tsconfig.app.json` (fonte: CLAUDE.md › Comandos). 0 erros; baseline 0, sem mudança.
- Tipos: `npx tsc --noEmit -p packages/core/tsconfig.json` (CLAUDE.md). 11 erros; baseline 11, com os mesmos arquivos e códigos.
- Tipos: `apps/mobile-adm/tsconfig.app.json` 0 e `apps/store/tsconfig.server.json` 0.
- Tipos: `apps/backoffice/tsconfig.app.json` dá 7 erros, todos em `features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx`. O arquivo vem do commit `4c6e9a16` e eu não toquei nele; a baseline do backoffice não foi capturada antes.
- Um arquivo de teste: `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (fonte: PROJECT.md › Comandos de verificação), por fatia. Todos verdes no fim.
- Verificação mínima (fonte: CLAUDE.md › Baselines, um workspace por vez, saída capturada fora de pipe):
  - core: 5354 testes em 217 arquivos, exit 0
  - functions: 1452 em 40, exit 0
  - store: 6954 em 371, exit 0
  - backoffice: 5106 em 281, exit 0 (rodado porque o painel consome `core` e os tipos)
- Lint: `npx eslint .` em `apps/store` dá 2 erros e 2 warnings, igual à baseline 2/2 (CLAUDE.md).
- Banco local: `supabase migration up --local` (fonte: PROJECT.md › Ambiente local) aplicou `20261107140000`. As colunas foram conferidas no `information_schema`.
- Probe: `02-desconto-no-pedido.sh` contra `:54441`, exit 0, 8 `ok —`. Apaga o que criou (conferido: zero linhas restantes).
- Grafo do Deno: `deno info supabase/functions/mercado-pago/index.ts` e `.../checkout/index.ts` resolvem sem erro, sem especificador de pacote. É um comando de diagnóstico, não declarado como verificação.
- Instruções lidas: CLAUDE.md (raiz, idêntico ao do repositório principal, já em contexto) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; packages/core/CLAUDE.md (inteiro); apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; supabase/CLAUDE.md › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, mercado-pago, send-notification, checkout; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- **Ficou sem execução**: o `create-payment` subindo no runtime local e o 422 de ponta a ponta, com a chave do Mercado Pago no `--env-file`. O edge runtime local está parado (`supabase status`), e `supabase functions serve` é um processo que não termina sozinho (regra 8). Provado em vez disso:
  - o grafo de módulos resolve no Deno (`deno info`, nenhum `import type` de pacote);
  - a gravação das colunas novas, por probe HTTP no PostgREST local, com os mesmos verbos do `create-order` e do `create-payment`.
- **Erros de tipo que vieram da tarefa 03**: `deno check` (modo estrito) acusa 7 erros, em `buy-together/cartDiscount.ts:200` (`cp`/`cq` possivelmente nulos) e `payment/pricing.ts:490` (`single.get(...)` possivelmente indefinido). O edge runtime não confere tipo no boot. Não consertei: não é desta tarefa.
- **Lock do Deno**: rodar `deno info`/`deno check` acrescentou entradas a `deno.lock`. Devolvi o conteúdo do HEAD por `git show HEAD:deno.lock` copiado para o arquivo. O diff dele está vazio.
- **Fatias em que teste e implementação nasceram no mesmo passo** (sem rodar o vermelho antes): 2, 4–7 e 10–13. Todas levaram o check de mutação, com o vermelho visto (coluna `Mutação`). As fatias 3, 8 e 9 passaram pelo vermelho no ciclo.
- **Sobrevivente achado pelo check**: na fatia 6, zerar as marcas no servidor ficou verde na primeira bateria. Acrescentei o caso do par recíproco no servidor, e ele mata o mutante.
- **Citações conferidas**: 11 abertas no uso.
  - Deslocadas e relocalizadas: a guarda `promotion_no_longer_valid` (citada perto de `:668-701`); a asserção `not.toMatch(/accompanies/)` (citada perto de `:1231`, estava em `:1237`); o ramo do pin (citado em `:479-486`, estava em `:481`).
  - Nenhuma citação morta.
- **Afirmações de documentação que esta tarefa tornou falsas**, atualizadas:
  - `supabase/CLAUDE.md`: "o `create-payment` … não a lê" (a marca) e a descrição do recálculo do `mercado-pago`;
  - `packages/core/CLAUDE.md` › Dinheiro: a guarda passou a ser a soma dos três descontos;
  - o comentário de `DbOrderItem` em `packages/supabase/src/types/index.ts`.
  - As tabelas de Baselines do CLAUDE.md raiz não foram mexidas: o WI não fechou.
- **Arquivos alterados fora da posse listada em `waves.md`**, todos necessários ao contrato (a onda 3 é só desta tarefa):
  - `apps/store/src/pages/CheckoutPage.tsx` e `OrderPaymentPage.tsx`;
  - `entities/order/api/useOrders.ts` (só tipos; é da 05 na onda 4);
  - `entities/cart/api/useCartBuyTogether.ts`, `features/checkout/model/useCheckoutTotals.ts`, `core/buy-together/cartDiscount.ts`, `core/payment/pricing.ts` (só um export novo);
  - os dublês de dois testes de página.
- **Guardas que acusaram e foram atendidos pelo código**, não afrouxados:
  - `tomDoCompreJunto.test.ts` acusou o `!` do embed do PostgREST: o `select` foi para `io/`;
  - `chavesDoItemDoPedido.test.ts`: a âncora subiu de 14 para 15, o número medido.
- **Testes antigos reescritos com o comportamento novo** (C-01 e D-13): a gravação do pedido com os dois descontos novos; o update do item com `full_unit_price`; o "sem update redundante" com `full_unit_price` certo; a frase da promoção sem "Recarregue a sacola".
- **Propagado**: nada. As afirmações das tarefas 05–08 sobre as colunas e `unit_price` = cobrado batem com o que foi entregue.
- **Caducou**: nada, nas tarefas fechadas 01–03.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; packages/core/CLAUDE.md (inteiro); apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; supabase/CLAUDE.md › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, mercado-pago, send-notification, checkout; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - core paridade bloco = sacola: packages/core/src/buy-together/__tests__/blocoIgualSacola.test.ts
  - core displayedEqualsCharged estendido (casado, bump, promoção, cupom, linha mista juntada, par recíproco): packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts
  - functions, ignora unit_price e marca forjados e recalcula pelo banco: supabase/functions/mercado-pago/__tests__/buyTogetherCharge.test.ts
  - functions, 422 buy_together_price_changed quando sai mais caro e segue quando igual, mais barato ou com outro desconto no lugar: idem
  - functions, grava cobrado, cheio e descontos por tipo; linha mista em duas e bump uma vez; insere e apaga linhas; pin pelo cheio na 2ª tentativa: idem + supabase/functions/mercado-pago/__tests__/handlers.test.ts
  - functions, a criação guarda as colunas novas: supabase/functions/checkout/__tests__/createOrder.test.ts
  - functions, o purchase leva o cobrado e soma o casado: supabase/functions/mercado-pago/__tests__/analytics.test.ts
  - loja, checkout com "O valor do seu pedido mudou", antes/agora e "Confirmar com o novo total": apps/store/src/pages/__tests__/CheckoutPage.test.tsx (+ useCreatePayment.test.tsx, usePixPayment.test.tsx)
  - loja, link/Minha conta com "O valor deste pedido mudou" e o contato: apps/store/src/pages/__tests__/OrderPaymentPage.test.tsx
  - loja, payload do pedido: apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts
  - guarda das chaves do pedido = COLUNAS_DO_PEDIDO, com sensor: apps/store/src/features/checkout/lib/__tests__/chavesDoPedido.test.ts
  - integração local, a criação grava as colunas novas: .specs/work-items/92-desconto-da-compra-casada/probes/02-desconto-no-pedido.sh
  - SEM cobertura: o create-payment subindo no runtime local e o 422 com o percentual caindo entre a criação e o pagamento, de ponta a ponta. O edge runtime está parado e functions serve não termina sozinho (regra 8). Só o grafo Deno foi provado (deno info).
Verificações:
  - tsc: store 0 (baseline 0); core 11 (idênticos à baseline); mobile-adm 0; server 0; backoffice 7, anteriores, em ProposalStateBadge.test.tsx, que não toquei
  - suítes: core 5354/217, functions 1452/40, store 6954/371, backoffice 5106/281, todas exit 0
  - eslint store 2/2 (baseline)
  - migration aplicada só no local
  - probe 02: 8 ok
Árvore de trabalho:
  - migration nova 20261107140000
  - checkout/handlers.ts e mercado-pago/handlers.ts + analytics.ts
  - core: resolveOrderLines, orderLines.ts, buyTogetherDiscountConfig, io/discountSelect.ts
  - tipos; loja (payload, totais, 422 no checkout e na rota do PIX, duas telas novas)
  - testes e o probe 02
  - docs de supabase/ e core/
  - nada commitado
Citações conferidas: 11. Deslocadas: a guarda promotion_no_longer_valid, a asserção not.toMatch(/accompanies/) (1231→1237) e o ramo do pin (479→481). Mortas: nenhuma.
Caducou: nada
```

## T04 — wi-impl-review · fixing · agente a0a6b9b47f4eb827d

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/04-servidor-cobra-o-que-a-tela-mostrou.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | premissa derrubada (premissa 5) | quebra | `supabase/functions/mercado-pago/handlers.ts:766-772` · `apps/store/src/pages/CheckoutPage.tsx:649` · `apps/store/src/features/order-payment/model/usePixPayment.ts` (ramo `setError`) | A guarda agora soma também o bump (D-03). Por isso um bump que caiu entre a criação e o pagamento passa a dar 422 `promotion_no_longer_valid`, um caminho de recusa que não existia antes. A frase que mostrava a saída ("Recarregue a sacola…") foi trocada por "A promoção deste pedido mudou. Nada foi cobrado.", e nenhuma tela trata esse código. No cartão, o `catch` genérico mantém o `orderId` no rascunho, e a nova confirmação reaproveita o mesmo pedido `pending` (PGM-08, `CheckoutPage.tsx:418` só invalida quando o rascunho está velho): o 422 volta igual. No PIX, o estado `failed` oferece "Tentar de novo" sobre o mesmo pedido, e o 422 também se repete. A cliente fica presa, sem ver o total novo e sem poder confirmar. A frase ainda diz "promoção" quando quem caiu foi a oferta do checkout. | CA-04.3: "Recusado o pagamento, no checkout a cliente vê o total novo e confirma a compra outra vez". D-13: "a mensagem 'Recarregue a sacola para ver o novo total' (`mercado-pago/handlers.ts`, na guarda) sai; no checkout a cliente vê o total novo e confirma outra vez". |
| 2 | comportamento sem teste | atrapalha | `.specs/work-items/92-desconto-da-compra-casada/probes/02-desconto-no-pedido.sh:1-8` | O probe prova só as colunas pelo PostgREST: insert, update e `check` 23514. As outras duas metades da linha de integração ficaram sem teste: o `create-payment` subindo no runtime local e dando o total da tela, e o 422 de ponta a ponta com o percentual caindo. O próprio `implement-log.md:952,1002` declara essa ausência. | Bloco `Testes`: "integração (Supabase local): o `create-payment` sobe no runtime local (depois de D-12) e dá o mesmo total da tela; 422 quando o percentual cai entre a criação e o pagamento […]; a criação grava as colunas novas". |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o pedido grava o preço cheio e o cobrado por linha e os descontos por tipo (probe local) | migration `20261107140000_…sql`; `checkout/handlers.ts` (`COLUNAS_DO_PEDIDO`/`COLUNAS_DOS_ITENS`); `buildOrderPayload.ts`; `mercado-pago/handlers.ts` (`regravarLinhas` e o update de `orders`); probe `02-desconto-no-pedido.sh` | sim (o probe, só execução) |
| o 422 só quando o pedido sai mais caro, com as duas telas | `mercado-pago/handlers.ts:731-773`; `PriceChangedCheckout.tsx`, `PriceChangedContact.tsx`, `CheckoutPage.tsx`, `OrderPaymentPage.tsx` | em parte: as duas telas existem só para `buy_together_price_changed`; o 422 da promoção ou do bump fica sem saída (achado 1) |
| a paridade bloco = sacola e o `displayedEqualsCharged` estendido passam | `blocoIgualSacola.test.ts`; `displayedEqualsCharged.test.ts` (bloco novo) | só execução |
| o `create-payment` sobe no runtime local | grafo Deno provado só por `deno info`, segundo o log; o runtime não foi subido | só execução, e o log declara que não foi executada |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | em parte (achado 2) |
| testes dos arquivos que você alterou, passando | — | só execução |
| a verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- Ordem de publicação migration → functions → bundles: registrada em `spec.md:175`. Nada no diff a contraria.
- `index.ts` só faz wiring: cumprida. Toda a lógica está em `mercado-pago/handlers.ts`, e o `index.ts` não está no diff.
- `AD-012` (gravação provada por probe local): cumprida para as colunas (`probes/02`). Os testes que asseriam o update com o preço de catálogo foram reescritos e ficaram mais estritos: `handlers.test.ts:2795` passou a exigir `{ unit_price: 18.4, full_unit_price: 18.4 }`.
- Âncoras dos guardas: `chavesDoItemDoPedido.test.ts` subiu de 14 para 15. O diff não cria escrita nova em `apps/**`, então `pedidoComDonoUnico.test.ts` não precisa mudar.
- RNF-03 nos arquivos de `core` que as functions importam: cumprida. `orderLines.ts` e `io/discountSelect.ts` não têm import, `cartDiscount.ts` importa com `.ts`, e `pricing.ts` importa `../buy-together/cartDiscount.ts`.

## Testes

- core, paridade bloco = sacola: `packages/core/src/buy-together/__tests__/blocoIgualSacola.test.ts`. Morde: compara números feitos à mão nas duas pontas e cobre o caso com promoção, em que a sacola mostra o menor.
- core, `displayedEqualsCharged` estendido: `packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts`. Morde: cobre casado, bump, promoção e cupom, e o par recíproco tem um sensor sem a marca (190 contra 180). O lado do servidor é um espelho escrito à mão (`servidorRecalcula`), que monta a entrada como o handler monta. A sensibilidade do handler real fica com `buyTogetherCharge.test.ts`.
- functions, ignora `unit_price` e marca forjados: `buyTogetherCharge.test.ts:176`. Morde: as linhas vêm com `unit_price: 1` e a cobrança sai 450,10, com as linhas regravadas.
- functions, 422 quando sai mais caro e segue quando igual ou mais barato, inclusive com outro desconto no lugar do casado: `buyTogetherCharge.test.ts:151,206,224,233,245`. Morde: confere código, corpo, zero chamadas ao Mercado Pago e as gravações.
- functions, grava cobrado, cheio e descontos; linha mista; bump não dobra; pin pelo cheio: `buyTogetherCharge.test.ts:278,291,361`. Morde: no pin, ler `unit_price` cobraria 20, e o teste exige 25.
- functions, a criação guarda as colunas novas, e o `purchase` leva o cobrado e soma o casado: `createOrder.test.ts:184` e `:1235` (`full_unit_price` dentro do `toEqual`); `analytics.test.ts:163`. Morde.
- loja, as duas telas: `CheckoutPage.test.tsx` (bloco novo: cartão, "Voltar à sacola", PIX pelo estado da navegação) e `OrderPaymentPage.test.tsx` (contato no link e volta ao checkout quando o pedido é da sacola). Também `useCreatePayment.test.tsx` e `usePixPayment.test.tsx`. Morde.
- guarda das chaves do pedido = `COLUNAS_DO_PEDIDO`: `chavesDoPedido.test.ts`. Morde, nos dois sentidos, com três sensores.
- integração (Supabase local): só a parte das colunas. Faltam o runtime e o 422 de ponta a ponta (achado 2).
- D-11, a asserção invertida: `createOrder.test.ts:1249-1270`. Invertida com sensores, não afrouxada.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `resolveOrderLines` em `pricing.ts`, sem mudar a regra | sim | O diff de `pricing.ts` só acrescenta. `resolveOrderPricing` ficou intocado. | sim |
| 2 | `joinOrderRows` pela identidade da linha (`itemKey`) | sim | `orderLines.ts` usa a chave com tamanho, acabamento e gravação, como D-02/D-18 pedem ("personalização"). | sim |
| 3 | regravar as linhas (update, insert, delete) | sim | `regravarLinhas`, coberto em `buyTogetherCharge.test.ts:245,291` | sim |
| 4 | não ordenar a leitura de `order_items` | sim (é uma borda declarada) | Nenhuma coluna de posição existe | sim |
| 5 | guarda pela soma; `promotion_no_longer_valid` sem tela própria | não, na metade "sem tela própria" | CA-04.3 e D-13 (achado 1). Com o bump dentro da soma, passa a existir uma recusa nova que deixa a cliente presa. | parcialmente: o raio fala em "mensagem genérica", mas não diz que o pedido é reaproveitado e o 422 se repete |
| 6 | o 422 leva `displayed_total`, `total` e `piece` | sim | `handlers.ts:756-762` e os testes | sim |
| 7 | 500 quando a leitura de `product_buy_together` falha | sim | Volta antes de qualquer chamada ao Mercado Pago | sim |
| 8 | a configuração e o `select` em `core`, com o `select` em `io/` | sim | O store e a function usam o mesmo texto e o mesmo mapeamento. A folha não tem import. | sim |
| 9 | o `discount` do GA soma o casado e não o bump | sim | D-08; `analytics.test.ts:163` | sim |
| 10 | o PIX volta ao checkout com `{ priceChanged }`, e a origem é decidida na montagem | sim | `OrderPaymentPage.tsx` e o teste | sim |
| 11 | `refresh` em `useCartBuyTogether` | sim | O objeto é memoizado, e `CheckoutPage` chama `refresh?.()` | sim |
| 12 | componente próprio `PriceChangedContact` | sim | Usa `whatsappHref`, com o portão de 10 dígitos de `PolicyContact`, e os textos do recorte de design | sim |
| 13 | `buildOrderItems` exige `lines` | sim | Não sobra um segundo caminho de preço | sim |
| 14 | migration `20261107140000`, com `check` nomeado | sim | O maior prefixo era `20261107130000`, então é o maior + 1 h. É aditiva e segue o molde de `promotion_discount`. | sim |
| 15 | inverter `not.toMatch(/accompanies/)` com sensores | sim | D-11; `createOrder.test.ts:1249-1270` | sim |

## Não conferido

- Não rodei teste, probe nem runtime. O resultado de cada um é só execução.
- `deno check` acusa 7 erros de tipo em `buy-together/cartDiscount.ts:200` e `payment/pricing.ts:490`, segundo o `implement-log.md:955`. Vieram da tarefa 03 e estão fora deste recorte.
- O diff de `pricing.ts` e o de `cartDiscount.ts` mostram só o que esta tarefa acrescentou: a 03 já está commitada (`ac505fa8`). Não separei mais nada.
- O layout das duas telas novas em 390/1440 depende de medida em navegador e fica com a Validation/QA.
- Não li o protótipo do design. A tarefa diz que o recorte é a fonte.
- Instruções lidas: `CLAUDE.md` (raiz), inteiro, injetado no contexto; `packages/core/CLAUDE.md` › da abertura até "`faq/block.ts`" (incluindo Pureza, Os módulos, Dinheiro); `apps/store/CLAUDE.md` › Carrinho, chrome e checkout; A sacola v4 e a marca "acompanha"; O PIX tem endereço; O cartão espera POR CIMA do checkout (início). Das seções citadas, não li O bloco Compre Junto, O botão único leva o conjunto nem Minha conta e o detalhe do pedido. `supabase/CLAUDE.md`: só o trecho do diff (mercado-pago e checkout) e a busca por "Ordem de publicação". `.specs/LESSONS.md`: só os títulos de L-013, L-014 e L-015.

## T04 — wi-impl-task · done · agente afd48c357280044cc

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/04-servidor-cobra-o-que-a-tela-mostrou.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 5 (revista) | A guarda continua comparando a soma dos três descontos por item (D-03). **Todo 422 da guarda agora leva o mesmo corpo**: `displayed_total`, `total` e `piece`. O código diz qual desconto caiu: `buy_together_price_changed` quando foi o casado, `promotion_no_longer_valid` quando foi a promoção ou o bump. A frase só nomeia o Compre Junto quando foi ele; nos outros casos é "Um desconto deste pedido mudou. Nada foi cobrado.". **A loja trata os dois códigos como "o valor mudou"**: `PriceChangedError` ganhou `reason: 'buy_together' \| 'discount'`. No checkout, o pedido sai do rascunho, aparece o antes e o agora, e "Confirmar com o novo total" cria outro pedido. No PIX, a rota vira `price-changed` (nunca `failed` com "Tentar de novo"): o pedido da sacola volta ao checkout, e o de outra hora mostra o contato. | Manter `promotion_no_longer_valid` como erro comum. Também descartei tirar o bump da soma. | CA-04.3 e D-13: recusado o pagamento, a cliente vê o total novo e confirma outra vez. Repagar o mesmo pedido daria o mesmo 422, e era aí que ela ficava presa. | `mercado-pago/handlers.ts` (corpo dos dois 422); `useCreatePayment`, `usePixPayment`, `OrderPaymentPage`, `CheckoutPage` e `PriceChangedCheckout` (nova prop opcional `reason`; ausente, vale o texto do Compre Junto). Um `promotion_no_longer_valid` vindo de um motor antigo, sem `total` no corpo, mostraria "Agora R$ NaN"; na ordem de publicação (functions antes dos bundles) isso não acontece. |
| 16 | Escrevi o probe da cobrança no runtime (`probes/03-cobranca-no-runtime.sh`), mas ele não foi executado de ponta a ponta. Ele prova que o `create-payment` sobe, que grava em `orders.total` o total da tela com o desconto casado (antes da chamada ao Mercado Pago) e que o percentual caindo para 5% dá 422 `buy_together_price_changed` sem order no Mercado Pago. Quando o runtime está fora do ar, ele para com exit 3 sem gravar nada. | Subir o edge runtime (`supabase start` ou `functions serve`) para rodá-lo. | Regra 8: subir infraestrutura não é decisão minha. O runtime local está parado (503 `name resolution failed`). | Só o probe. A prova de ponta a ponta fica pendente de quem subir o runtime (ver `Ao humano`). |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 5 (reaberta) | O bump ou a promoção que caem dão 422 com antes, agora e peça, e a frase não diz "promoção" nem "Compre Junto" | functions | `supabase/functions/mercado-pago/__tests__/buyTogetherCharge.test.ts`; o caso da promoção em `handlers.test.ts` foi reescrito com o corpo novo | sim | — (passou pelo vermelho; além disso, tirar o `total` do corpo derruba 2 casos) |
| 10 (reaberta) | O 422 de outro desconto também vira `PriceChangedError`, com `reason: 'discount'` | loja | `apps/store/src/features/checkout/api/__tests__/useCreatePayment.test.tsx` | sim | vermelho (ignorar o código `promotion_no_longer_valid`) |
| 12 (reaberta) | No checkout, o desconto que caiu mostra o mesmo aviso sem nomear o Compre Junto, e "Confirmar com o novo total" cria outro pedido | loja | `apps/store/src/pages/__tests__/CheckoutPage.test.tsx` | sim | vermelho (texto preso ao do Compre Junto) |
| 14b | Integração: o `create-payment` no runtime local cobra o total da tela, e o percentual que cai dá 422 | integração | `.specs/work-items/92-desconto-da-compra-casada/probes/03-cobranca-no-runtime.sh` | não executado: runtime fora do ar (exit 3) | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

A correção tocou estes arquivos:
- supabase/functions/mercado-pago/handlers.ts — alterado
- supabase/functions/mercado-pago/__tests__/buyTogetherCharge.test.ts — alterado
- supabase/functions/mercado-pago/__tests__/handlers.test.ts — alterado
- apps/store/src/features/checkout/api/useCreatePayment.ts — alterado
- apps/store/src/features/checkout/api/__tests__/useCreatePayment.test.tsx — alterado
- apps/store/src/features/order-payment/model/usePixPayment.ts — alterado
- apps/store/src/features/order-payment/model/__tests__/usePixPayment.test.tsx — alterado
- apps/store/src/features/order-payment/ui/PriceChangedCheckout.tsx — alterado
- apps/store/src/pages/OrderPaymentPage.tsx — alterado
- apps/store/src/pages/CheckoutPage.tsx — alterado
- apps/store/src/pages/__tests__/CheckoutPage.test.tsx — alterado
- apps/store/src/pages/__tests__/OrderPaymentPage.test.tsx — alterado
- .specs/work-items/92-desconto-da-compra-casada/probes/03-cobranca-no-runtime.sh — criado

Tudo o que a tarefa alterou, juntando implementação e correção:
- supabase/migrations/20261107140000_compre-junto-desconto-no-pedido.sql — criado
- supabase/functions/checkout/handlers.ts — alterado
- supabase/functions/checkout/__tests__/createOrder.test.ts — alterado
- supabase/functions/mercado-pago/handlers.ts — alterado
- supabase/functions/mercado-pago/analytics.ts — alterado
- supabase/functions/mercado-pago/__tests__/handlers.test.ts — alterado
- supabase/functions/mercado-pago/__tests__/analytics.test.ts — alterado
- supabase/functions/mercado-pago/__tests__/buyTogetherCharge.test.ts — criado
- packages/core/src/payment/pricing.ts — alterado
- packages/core/src/payment/orderLines.ts — criado
- packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts — alterado
- packages/core/src/buy-together/cartDiscount.ts — alterado
- packages/core/src/buy-together/io/discountSelect.ts — criado
- packages/core/src/buy-together/__tests__/blocoIgualSacola.test.ts — criado
- packages/core/CLAUDE.md — alterado
- packages/supabase/src/types/index.ts — alterado
- supabase/CLAUDE.md — alterado
- apps/store/src/entities/cart/api/useCartBuyTogether.ts — alterado
- apps/store/src/entities/order/api/useOrders.ts — alterado
- apps/store/src/features/checkout/api/useCreatePayment.ts — alterado
- apps/store/src/features/checkout/api/__tests__/useCreatePayment.test.tsx — alterado
- apps/store/src/features/checkout/lib/buildOrderPayload.ts — alterado
- apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts — alterado
- apps/store/src/features/checkout/lib/__tests__/chavesDoItemDoPedido.test.ts — alterado
- apps/store/src/features/checkout/lib/__tests__/chavesDoPedido.test.ts — criado
- apps/store/src/features/checkout/model/useCheckoutTotals.ts — alterado
- apps/store/src/features/order-payment/index.ts — alterado
- apps/store/src/features/order-payment/model/usePixPayment.ts — alterado
- apps/store/src/features/order-payment/model/__tests__/usePixPayment.test.tsx — alterado
- apps/store/src/features/order-payment/ui/PixSurface.tsx — alterado
- apps/store/src/features/order-payment/ui/PriceChangedCheckout.tsx — criado
- apps/store/src/features/order-payment/ui/PriceChangedContact.tsx — criado
- apps/store/src/pages/CheckoutPage.tsx — alterado
- apps/store/src/pages/OrderPaymentPage.tsx — alterado
- apps/store/src/pages/__tests__/CheckoutPage.test.tsx — alterado
- apps/store/src/pages/__tests__/OrderPaymentPage.test.tsx — alterado
- apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx — alterado
- apps/store/src/pages/__tests__/checkoutSobreviveAVoltaDaAba.test.tsx — alterado
- .specs/work-items/92-desconto-da-compra-casada/probes/02-desconto-no-pedido.sh — criado
- .specs/work-items/92-desconto-da-compra-casada/probes/03-cobranca-no-runtime.sh — criado

## Verificação

- `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md › Comandos de verificação), arquivo por arquivo nos testes que a correção tocou: todos verdes.
- Suíte de functions (CLAUDE.md › Baselines): 1453 testes, exit 0.
- Suíte da loja (CLAUDE.md › Baselines): 6955 testes em 371 arquivos, exit 0.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros; a baseline era 0, sem mudança.
- `npx eslint .` em `apps/store`: 2 erros e 2 warnings, iguais à baseline.
- `probes/03-cobranca-no-runtime.sh`: exit 3, porque o runtime está fora do ar (HTTP 503).
- `deno.lock` sem diff.
- Instruções lidas: as mesmas da implementação (a correção continua a mesma conversa).

## Divergências e descobertas

- **Achado 2 aplicado só em parte.** O probe que faltava foi escrito, mas não pôde rodar: o edge runtime local está parado e eu não o subo (regra 8). Ficam sem execução duas coisas: o `create-payment` subindo no runtime e dando o total da tela, e o 422 de ponta a ponta com o percentual caindo. Pela minha regra, um teste do bloco `Testes` que encontra o ambiente local fora do ar seria o caso 5 de aborto. Fechei a correção do achado 1 e deixei a execução com quem pode subir o runtime.
- A frase do 422 da promoção mudou uma segunda vez: de "A promoção deste pedido mudou. Nada foi cobrado." (implementação) para "Um desconto deste pedido mudou. Nada foi cobrado.". A asserção de `handlers.test.ts` foi reescrita com o corpo novo, e nada foi afrouxado.

## Ao humano

Achado 2: o teste de integração que ele pede está escrito, mas não pude rodá-lo. O edge runtime do Supabase local está parado (`supabase status` mostra `supabase_edge_runtime_uma-estrelinha-store` e o pooler em "Stopped services", e a function responde 503 `name resolution failed`), e eu não subo infraestrutura (regra 8). Para fechar:
1. Suba o runtime local com `supabase start`, servindo a `mercado-pago` com uma chave de teste ou inválida do Mercado Pago no `--env-file` (supabase/CLAUDE.md › mercado-pago).
2. Rode `bash .specs/work-items/92-desconto-da-compra-casada/probes/03-cobranca-no-runtime.sh`.

O esperado são 4 linhas `ok —` e exit 0: o runtime responde, o total da tela fica gravado, o 422 `buy_together_price_changed` sai e nenhuma order é criada no Mercado Pago.

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; packages/core/CLAUDE.md (inteiro); apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; supabase/CLAUDE.md › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, mercado-pago, send-notification, checkout; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos:
  - core: paridade bloco = sacola em packages/core/src/buy-together/__tests__/blocoIgualSacola.test.ts
  - core: displayedEqualsCharged estendido (casado, bump, promoção, cupom, linha mista juntada, par recíproco) em packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts
  - functions: unit_price e marca forjados ignorados, recálculo pelo banco, em supabase/functions/mercado-pago/__tests__/buyTogetherCharge.test.ts
  - functions: 422 quando sai mais caro (casado: buy_together_price_changed; bump ou promoção: promotion_no_longer_valid, com antes e agora), e segue quando igual, mais barato ou com outro desconto no lugar; mesmo arquivo + handlers.test.ts
  - functions: grava cobrado, cheio e descontos por tipo; linha mista em duas e bump uma vez; insere e apaga linhas; pin pelo cheio; mesmo arquivo + handlers.test.ts
  - functions: a criação guarda as colunas novas, em supabase/functions/checkout/__tests__/createOrder.test.ts
  - functions: o purchase usa o preço cobrado e soma o casado, em supabase/functions/mercado-pago/__tests__/analytics.test.ts
  - loja: no checkout, "O valor do seu pedido mudou" com antes e agora e "Confirmar com o novo total", também quando caiu outro desconto, em CheckoutPage.test.tsx, useCreatePayment.test.tsx e usePixPayment.test.tsx
  - loja: no link e em Minha conta, "O valor deste pedido mudou" com o contato, em OrderPaymentPage.test.tsx
  - loja: payload, em buildOrderPayload.test.ts
  - guarda das chaves do pedido, em chavesDoPedido.test.ts
  - integração das colunas: probes/02-desconto-no-pedido.sh (8 ok)
  - integração do runtime: probes/03-cobranca-no-runtime.sh, escrito e NÃO executado (edge runtime local parado; subi-lo não é meu, regra 8)
Verificações:
  - tsc: store 0, core 11 (iguais à baseline), mobile-adm 0, server 0; backoffice 7, de antes, em ProposalStateBadge.test.tsx
  - suítes: core 5354, functions 1453, store 6955, backoffice 5106; todas com exit 0
  - eslint store 2/2
  - migration aplicada só no banco local
  - probe 02: 8 ok; probe 03: exit 3 (runtime fora do ar)
Árvore de trabalho: migration 20261107140000; as functions checkout e mercado-pago; core (resolveOrderLines, joinOrderRows, buyTogetherDiscountConfig, io/discountSelect.ts); os tipos; a loja (payload, totais, o 422 tratado no checkout e na rota do PIX, duas telas novas); testes; probes 02 e 03; a documentação de supabase/ e core/. Nada commitado.
Citações conferidas: 11. Deslocadas: a guarda promotion_no_longer_valid, a asserção not.toMatch(/accompanies/) (linha 1231 → 1237) e o ramo do pin (479 → 481). Mortas: nenhuma.
Caducou: nada
```

## T08 — wi-impl-task · review · agente a2e012b1726ee0c18

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/08-adesao-com-desconto-concedido.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Prefixo `20261107150000` (o maior existente, `20261107140000`, + 1 h), nome `compre-junto-adesao-desconto` | outro prefixo | regra da tarefa e de `waves.md` (a 08 é a única migration da onda 4) | a 07 (onda 5) usa o próximo prefixo, `20261107160000` ou maior |
| 2 | O desconto é calculado por linha em `pares` (`(coalesce(full_unit_price, unit_price) - unit_price) * quantity as desconto`) e levado pelas mesmas CTEs `distinct` do valor (`linhas`, `joia_linhas`, `lista_linhas`), então cada linha conta uma vez por recorte. Os indicadores e "por lista" usam `coalesce(sum, 0)`; "por joia" usa `sum` puro, como o valor | calcular o desconto a partir do pedido (`orders.buy_together_discount`) | D-15 fala em qualquer desconto que venceu na linha, e a régua tem de ser a da marca (CA-06.1). Somar por linha deixa o recuo das linhas sem preço cheio ser medido (dá 0, nunca nulo) | a RPC e o probe |
| 3 | A tela não ganhou indicador novo: a chave `desconto_concedido` dos indicadores vem na resposta, mas só a coluna (tabela e cartões, por joia e por lista) aparece | um 4º `StatCard`, ou o total no subtítulo do valor | o Design manda a coluna, e o subtítulo do valor continua "pelo preço pago em cada peça". A menor superfície vence | só a tela: mostrar o total é uma linha a mais em `AdoptionReport.tsx` |
| 4 | Se a resposta vier sem a chave (bundle publicado antes da migration), a célula mostra "—" | `?? 0` | um zero seria número que ninguém contou | só a tela |
| 5 | O rótulo "Desconto concedido" é a constante `DISCOUNT_GIVEN_LABEL` em `model/adoption.ts`. Coluna entre "Valor" e "Peça que mais sai"; no cartão, a linha "Desconto concedido: R$ X" fica antes de "Mais sai" | pôr a coluna depois de "Peça que mais sai" | o valor e o desconto ficam lado a lado, e "Mais sai" continua sendo o último parágrafo do cartão, que é o que um teste do BUG-013 confere | só a tela |
| 6 | Nada foi para `packages/core`: quem calcula é o banco, e a tela só escreve o número | uma função em core | o número não tem segundo leitor em TS | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O guarda de schema lê a migration vigente e cobra `desconto_concedido` com o recuo para nulo; `mutar()` lança | guarda de fonte (unidade) | apps/store/src/shared/lib/__tests__/compreJuntoAdesaoSchema.test.ts | sim (67/67) | vermelho: apagar `'desconto_concedido', j.desconto` da migration real reprova 2; restaurada pela cópia e conferida com `cmp` |
| 2 | Na página real, a coluna "Desconto concedido" aparece na tabela e nos cartões, por joia e por lista, com o valor da RPC | componente / página real | apps/backoffice/src/pages/admin/AdminBuyTogetherAdoption.test.tsx | sim (27/27) | vermelho: ler `valor` no lugar do desconto (3 falham), zerar por lista (2), tirar a linha do cartão (2), recuo para 0 (1). Arquivo restaurado e conferido com `cmp` |
| 3 | No banco local, um pedido com desconto devolve o valor líquido e o desconto concedido | integração (Supabase local) | .specs/work-items/92-desconto-da-compra-casada/probes/05-adesao.sh | sim (21 `ok —`, 0 falhas) | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

supabase/migrations/20261107150000_compre-junto-adesao-desconto.sql criado
apps/store/src/shared/lib/__tests__/compreJuntoAdesaoSchema.test.ts alterado
apps/backoffice/src/features/buy-together-adoption/model/adoption.ts alterado
apps/backoffice/src/features/buy-together-adoption/ui/AdoptionReport.tsx alterado
apps/backoffice/src/pages/admin/AdminBuyTogetherAdoption.test.tsx alterado
.specs/work-items/92-desconto-da-compra-casada/probes/05-adesao.sh criado

## Verificação

- `supabase status` (PROJECT.md › Ambiente local): o Postgres local está de pé.
- `supabase migration up --local` (PROJECT.md): aplicou `20261107150000`, só no banco local.
- `bash .specs/work-items/92-desconto-da-compra-casada/probes/05-adesao.sh` contra `:54442`: 21 `ok —`, 0 falhas. O probe original do WI-01 também deu 0 falhas sobre a função nova.
- `pnpm --filter @estrelinha/store exec vitest run src/shared/lib/__tests__/compreJuntoAdesaoSchema.test.ts --testTimeout=20000` (PROJECT.md): 67/67, exit 0.
- `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminBuyTogetherAdoption.test.tsx --testTimeout=20000` (PROJECT.md): 27/27, exit 0.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (CLAUDE.md › Comandos): 7 erros, todos em `apps/backoffice/src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (TS2593/TS2304). Não veio `baseline`. O arquivo é do commit `4c6e9a16`, anterior ao WI, e não foi tocado por esta tarefa. Nenhum erro em arquivo meu.
- `npx eslint` nos arquivos tocados do painel: limpo.
- `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (CLAUDE.md › Baselines): 5111/281, exit 0.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines): 6973 passam e 1 falha, exit 1. A falha é `src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx` ("o resumo: Subtotal cheio, uma linha por desconto…"), na área da tarefa 05, que roda ao mesmo tempo nesta árvore. Não é arquivo desta tarefa.

Instruções lidas: CLAUDE.md › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; apps/backoffice/CLAUDE.md › Molde dos formulários, Pedidos e a fila de material, Compre Junto › Listas, Compre Junto › Adesão, Compre Junto › a aba "Compre junto" do produto; supabase/CLAUDE.md › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, mercado-pago, send-notification, checkout; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- Fatia 3 (o probe, que sobe infraestrutura) passou de primeira sem o check de mutação. A fixtura dá valores diferentes ao valor e ao desconto em cada linha (L-013): o valor de 30 dias continua 220 e o desconto é 37. Ela também tem uma linha sem preço cheio (B e C dão 0.0; sem o `coalesce`, dariam nulo e o probe reprovaria) e três linhas com preço cheio que não podem contar (a joia principal, a peça sem principal e a do pedido cancelado).
- O guarda deixou de ler `20261107120000` pelo nome e passou a ler a última migration que recria `buy_together_adoption` (molde de `pagamentoMarcaPagoSchema`). Uma âncora nova confere que a vigente não é a de 20261107120000.
- Testes antigos reescritos, sem afrouxar: em `AdminBuyTogetherAdoption.test.tsx`, as listas exatas de cabeçalhos e células ganharam a coluna "Desconto concedido" (a régua ficou mais estrita). Na fixtura do WI-01 copiada para o probe, cada linha ganhou `full_unit_price`, e as asserções de antes não mudaram.
- A falha da suíte da loja em `entities/order` é da tarefa 05, que corre em paralelo. Não toquei nela.
- Não atualizei `supabase/CLAUDE.md` › O relatório de adesão nem `apps/backoffice/CLAUDE.md` › Adesão com a chave nova e a migration vigente. Isso fica para o fecho do WI, junto das baselines.
- Ordem de publicação: a migration antes do bundle do painel. Se o bundle subir antes, a tela mostra "—" na coluna.
- Citações conferidas: as três foram abertas na hora de usar (`compreJuntoAdesaoSchema.test.ts:94-101`, `pagamentoMarcaPagoSchema.test.ts`, `20261107120000_compre-junto-adesao.sql`, incluindo `:22` e `:66`). Nenhuma deslocou, nenhuma estava morta. A dependência da tarefa 04 está no código: `order_items.full_unit_price`, na migration `20261107140000`.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 08
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz, por seções); apps/backoffice/CLAUDE.md (por seções); supabase/CLAUDE.md (por seções); .specs/LESSONS.md (L-013, L-014, L-015); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: guarda de schema na migration vigente, com a régua `descontoConcedido`, 12 sensores novos e a âncora da vigente — apps/store/src/shared/lib/__tests__/compreJuntoAdesaoSchema.test.ts; página real com a coluna na tabela e nos cartões, por joia e por lista, o valor pago intacto, "—" sem a chave e o tom memorial — apps/backoffice/src/pages/admin/AdminBuyTogetherAdoption.test.tsx; integração no banco local com pedido com desconto, por indicadores, joia, lista, 30 e 7 dias, e o recuo da linha sem preço cheio — .specs/work-items/92-desconto-da-compra-casada/probes/05-adesao.sh. Nada ficou sem cobertura.
Verificações: probe 21 ok e 0 falhas; guarda 67/67; página 27/27; tsc do store 0; tsc do backoffice 7 erros, todos em ProposalStateBadge.test.tsx (de antes do WI, não tocado); eslint limpo; suíte do backoffice 5111/281 com exit 0; suíte do store 6973 passam e 1 falha em OrderItemsSummary.test.tsx (área da tarefa 05, em paralelo).
Árvore de trabalho: supabase/migrations/20261107150000_compre-junto-adesao-desconto.sql (novo, aplicado só no local); apps/store/src/shared/lib/__tests__/compreJuntoAdesaoSchema.test.ts; apps/backoffice/src/features/buy-together-adoption/model/adoption.ts; apps/backoffice/src/features/buy-together-adoption/ui/AdoptionReport.tsx; apps/backoffice/src/pages/admin/AdminBuyTogetherAdoption.test.tsx; .specs/work-items/92-desconto-da-compra-casada/probes/05-adesao.sh (novo). Nada commitado.
Citações conferidas: 3 abertas na hora de usar; nenhuma deslocada, nenhuma morta.
```

## T08 — wi-impl-review · done · agente a52ffa882db900b2d

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/08-adesao-com-desconto-concedido.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a RPC devolve `desconto_concedido` e o valor líquido (probe local) | `supabase/migrations/20261107150000_compre-junto-adesao-desconto.sql`: `desconto` calculado por linha em `pares`, levado por `linhas`/`joia_linhas`/`lista_linhas`, chave nos indicadores, em `por_joia` e em `por_lista`; `valor` continua `unit_price * quantity`. Probe `probes/05-adesao.sh`, passo 8 (37 em 30 dias, 22 em 7, por joia e por lista) | sim (o resultado do probe só a execução prova) |
| o guarda lê a migration vigente | `compreJuntoAdesaoSchema.test.ts`: `queCriam`/`VIGENTE` acha a última migration com `create or replace function public.buy_together_adoption`, e há uma âncora que exige ≥2 e uma vigente ≠ `20261107120000` | sim |
| a tela mostra a coluna | `AdoptionReport.tsx`: um `<th>`/`<td>` "Desconto concedido" na tabela e a linha "Desconto concedido: R$ X" nos cartões, nos dois recortes | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | os três (ver Testes) | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- `AD-017`: a `20261107120000` não aparece no diff (`git status` só lista a migration nova como `A`). A correção veio em migration nova. Cumprida.
- `marcacaoSoPorAcao.test.ts`: a função foi recriada com o mesmo nome e a mesma assinatura `(integer, timestamptz)`, então a lista de RPCs fica igual. Cumprida.
- Prefixo: `20261107150000` = o maior anterior (`20261107140000`) + 1 h, sem repetição. A tarefa 07 continua dizendo "o maior existente + 1 hora", e isso segue verdadeiro. Cumprida.

## Testes

- Guarda de schema (`apps/store/src/shared/lib/__tests__/compreJuntoAdesaoSchema.test.ts`): a régua `descontoConcedido` é aplicada à migration vigente pelo `it.each(Object.keys(R))`. Ela cobra `(coalesce(i.full_unit_price, i.unit_price) - i.unit_price) * i.quantity`, o `distinct` em cada recorte, `coalesce(sum…,0)` nos indicadores e por lista, e a chave nos três lugares. São 11 sensores, um por peça, e entre eles está o que tira o recuo `coalesce` (o nulo), com `mutar()` que lança. Há também um sensor novo de `valorPeloPrecoPago` contra o valor cheio. Morde.
- Página real (`apps/backoffice/src/pages/admin/AdminBuyTogetherAdoption.test.tsx`): os valores de desconto da fixtura são diferentes dos de valor em toda linha (37, 5, 35, 2, 0). As células são lidas pela coluna e os cartões por `<p>`, nos dois recortes. Há o caso "—" para a resposta sem a chave e o indicador de valor conferido contra o cheio (257). Morde.
- Integração (`.specs/work-items/92-desconto-da-compra-casada/probes/05-adesao.sh`): a fixtura tem preço cheio nas linhas marcadas. Uma linha não tem preço cheio (recuo 0). A joia principal, a peça sem principal e o pedido cancelado têm preço cheio e não podem contar. O passo 8 confere o total, o desconto por joia e por lista, e os 7 dias. As asserções de valor de antes ficaram intactas, e é isso que prova o valor líquido. Morde: ler `full_unit_price` sem o recuo, contar a joia principal ou contar o cancelado mudariam os números.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Prefixo `20261107150000`, nome `compre-junto-adesao-desconto` | sim | `ls supabase/migrations` (o maior anterior é `20261107140000`) e as Obrigações da tarefa | sim: a 07 só diz "o maior + 1 h" |
| 2 | Desconto por linha em `pares`, levado pelas mesmas CTEs `distinct`; `coalesce(sum,0)` nos indicadores e por lista, `sum` puro por joia | sim | D-15 da tarefa (soma por linha marcada, linha sem preço cheio conta 0) e a forma do `valor` na migration original | sim (RPC e probe) |
| 3 | Sem indicador novo; só a coluna, e o subtítulo do valor fica igual | sim | Design da tarefa ("a coluna na tabela e nos cartões… o indicador de valor segue 'pelo preço pago'") | sim |
| 4 | Chave ausente ⇒ "—" | sim | nada o contradiz; o tipo declara `number`, mas a tela trata `null`/`undefined` | sim |
| 5 | `DISCOUNT_GIVEN_LABEL` em `model/adoption.ts`; coluna entre Valor e Peça que mais sai; no cartão, antes de "Mais sai" | sim | mesmo padrão de `NO_TOP_PIECE`/`DIRECT_PIECE_LABEL`; "Mais sai" continua sendo o último `<p>` | sim |
| 6 | Nada em `packages/core` | sim | a regra só tem um leitor, o banco; a tela só formata. `apps/backoffice/CLAUDE.md` › Adesão diz "`model/adoption.ts` só escreve o que veio" | sim |

## Não conferido

- Não rodei nenhum teste, nem o probe, nem `tsc`. Pela regra, os números que dependem de execução (21 `ok —`, as suítes verdes) não foram vistos.
- `05-adesao.sh` está `??` (untracked, sem intent-to-add). Julguei o arquivo inteiro comparando com a cópia do WI-01 (`.specs/work-items/WI-01-compre-junto/probes/05-adesao.sh`). O diff mostra só a fixtura de `full_unit_price` e o passo 8 acrescentados. Como o arquivo está em `.specs/`, não há código de produção sem baseline.
- No probe, a mensagem do passo 8 por lista diz "a linha de duas joias conta uma vez". Só que essa linha (O4) não tem preço cheio e contribui 0, então o probe não mede essa propriedade para o desconto. Quem a cobre é a régua estrutural do guarda (`distinct` em `lista_linhas` mais `sum` sobre `lista_linhas`). Não é achado.
- Não vi a tela em navegador (largura dos cartões a 390, a coluna nova a 1440). Isso é da Validation/QA.
- Instruções lidas: `CLAUDE.md` (raiz, carregado no contexto); `apps/backoffice/CLAUDE.md` › Compre Junto › Adesão; `supabase/CLAUDE.md` › Migrations, A marca "acompanha" no pedido, O relatório de adesão ao Compre Junto. Não li `.specs/LESSONS.md` › L-013/L-014/L-015, nem as outras seções que a tarefa cita (Molde dos formulários, Pedidos, RLS, Edge functions), porque não tocam no recorte do diff.

## T05 — wi-impl-task · review · agente acf6310633a5978a7

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/05-confirmacao-minha-conta-e-email.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A regra única é `orderSummary(order)` numa folha nova, `packages/core/src/orders/summary.ts`, exportada pelo barrel `@estrelinha/core/orders`. Ela devolve `{ detailed, subtotal, shipping, discounts: {key,label,amount}[], total, rows: {charged, full, buyTogetherPercent, showsCompanion}[] }`. | Uma função por superfície; o resumo montado dentro de `OrderItemsSummary` | O dono é único, e o contrato da tarefa pede uma folha em `core/orders`. | As tarefas 06 e 07 consomem essa forma; propaguei para as duas. |
| 2 | Formato novo ("detalhado") só quando **todas** as linhas do pedido têm `full_unit_price`. Se qualquer linha não tiver, o pedido sai no formato de antes: subtotal gravado, cupom, PIX. | Detalhar só as linhas que têm o preço cheio | Com uma linha sem preço cheio, a soma dos cheios não fecha. O pedido montado pelo painel nunca recebe `full_unit_price` (o `proposal_id` sai antes do recálculo) e continua no formato antigo. | 06, 07 e o e-mail |
| 3 | No formato detalhado o Subtotal é Σ `full_unit_price × quantity` e o Total é `orders.total`. As linhas aparecem nesta ordem: Compre Junto, progressivo, oferta, cupom, PIX, só as maiores que zero. | Somar os descontos a `orders.subtotal` | A soma dos cheios é o que a tarefa pede. A conta fecha por construção: `resolveOrderLines` grava a oferta como resto, cheio − cobrado − progressivo − casado. | 06, 07 |
| 4 | O desconto do order bump se chama "Desconto da oferta". | "Oferta do checkout" e outros rótulos | É o vocabulário que o painel já usa ("Desconto da oferta (%)"). Rótulo é fácil de trocar. | Rótulo em `ORDER_DISCOUNT_LABELS`; 06 e 07 o herdam |
| 5 | O cupom aparece como "Cupom {CÓDIGO}" quando há código. Sem código: "Cupom" no formato novo e "Desconto" no antigo (como hoje). O e-mail **não** pede `coupon_code` no `select`. | Pedir `coupon_code` no e-mail | O protótipo do e-mail diz só "Cupom", e o e-mail de pedido antigo continua byte a byte igual: o teste T12 dos quatro legados segue verde. | E-mail |
| 6 | "N% a menos" só aparece na primeira parte de uma peça partida que acompanha um principal do mesmo pedido. E só quando essas partes somam exatamente `buy_together_discount`. Se não somam (por exemplo, a promoção venceu numa peça que acompanha), a peça mostra o "de/por" sem dizer de onde veio o desconto. | Inferir o percentual de toda linha com marca; esconder o percentual sempre que houver promoção | O pedido não grava o desconto por linha. Dizer o desconto errado é pior do que não dizer. | Loja, e-mail, 06, 07 |
| 7 | Da linha mista partida, só a primeira parte (a do casado) diz "Acompanha o …". A outra parte é a peça avulsa, sem a frase (`showsCompanion`). No formato antigo a frase não muda. | Repetir a frase nas duas partes | Segue o desenho: "outra a preço cheio". | Loja, 06, 07 |
| 8 | A linha de detalhe da peça continua "{variação} · Qtd: N". | Trocar por "N unidade(s)", como o recorte de design sugere | Pedido antigo tem de continuar igual, e os testes de `itemDetailLine` existentes cravam "Qtd". | Loja |
| 9 | No e-mail, a linha com o casado ganha "Compre Junto · N% a menos" sob a variação, e o valor cheio aparece riscado (`<s>`) acima do cobrado. Na versão texto: `— R$ 36,00 (de R$ 40,00; Compre Junto · 10% a menos)`. | Mudar a estrutura da tabela | É a forma mínima de mostrar o "de/por". Pedido sem desconto sai byte a byte como antes. | E-mail |
| 10 | O exemplo da prévia (`render/sample.ts`) continua com 2 itens: a corrente acompanha o pingente com 10%. Subtotal cobrado 285, PIX 14,25, total 295,65, `buy_together_discount` 4. | Acrescentar um 3º item | `render.test.ts` crava `toHaveLength(2)`. | Prévia do painel |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O resumo fecha (Subtotal − descontos + frete = Total) com Compre Junto, bump, promoção, cupom e PIX; pedido sem `full_unit_price` cai no formato de antes | unidade (core) | `packages/core/src/orders/__tests__/summary.test.ts` | sim | vermelho (4 mutações: linha do casado removida, subtotal gravado no lugar do cheio, atribuição sem conferência, formato detalhado sempre) |
| 2 | A confirmação mostra o "de/por", a linha partida e as linhas de desconto; pedido antigo igual ao de hoje | componente (loja) | `apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx` | sim | vermelho (4 mutações: subtotal gravado, ramo do de/por, frase sem `showsCompanion`, sem o percentual) |
| 3 | O e-mail mostra o "de/por" e uma linha por desconto, e a conta fecha; a prévia (`sample.ts`) tem desconto; o `select` do motor e o da prévia trazem as colunas novas | functions | `supabase/functions/send-notification/__tests__/render.test.ts`, `dispatch.test.ts`, `handlers.test.ts` | sim | vermelho (6 mutações: colunas dos itens fora do `select` do motor; colunas do pedido fora do `select` do motor; ramo do de/por; subtotal gravado; colunas dos itens fora do `select` da prévia) |
| 4 | Guarda de alcance Deno da folha nova | unidade (core) | `packages/core/src/orders/__tests__/summaryDenoReach.test.ts` | sim | vermelho (o import de `orderLines` sem `.ts`: 3 casos falharam) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

packages/core/src/orders/summary.ts — criado
packages/core/src/orders/__tests__/summary.test.ts — criado
packages/core/src/orders/__tests__/summaryDenoReach.test.ts — criado
packages/core/src/orders/index.ts — alterado
packages/core/src/orders/__tests__/purity.test.ts — alterado
apps/store/src/entities/order/ui/OrderItemsSummary.tsx — alterado
apps/store/src/entities/order/lib/itemDetailLine.ts — alterado
apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx — alterado
supabase/functions/send-notification/render/layout.ts — alterado
supabase/functions/send-notification/render/email.ts — alterado
supabase/functions/send-notification/render/sample.ts — alterado
supabase/functions/send-notification/dispatch.ts — alterado
supabase/functions/send-notification/handlers.ts — alterado
supabase/functions/send-notification/__tests__/render.test.ts — alterado
supabase/functions/send-notification/__tests__/dispatch.test.ts — alterado
supabase/functions/send-notification/__tests__/handlers.test.ts — alterado
.specs/work-items/92-desconto-da-compra-casada/tasks/06-painel-do-pedido-com-desconto.md — alterado
.specs/work-items/92-desconto-da-compra-casada/tasks/07-app-do-atelie-detalhe-do-pedido.md — alterado

## Verificação

- Um arquivo de teste por fatia: `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (`PROJECT.md` › Comandos de verificação). Todos verdes.
- Tipos da loja: `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros. Baseline 0, nada novo.
- Tipos do core: `npx tsc --noEmit -p packages/core/tsconfig.json` (CLAUDE.md › Comandos/Baselines): 11 erros. São os mesmos 11 herdados da baseline, por arquivo e quantidade (carousel 5, pickHomeBanners 1, pickHomeCollections 1, sitemap urls 2, supabase client 2). Nada novo.
- Verificação mínima, suíte de cada workspace tocado (CLAUDE.md › Baselines), um por vez, exit fora de pipe:
  - core: 5374/219, exit 0
  - functions: 1460/40, exit 0
  - store: 6974/371, exit 0 (inclui os guardas `numeroDoPedidoComDonoUnico`, `situacaoComDonoUnico`, `brandScan` e de tom)
- eslint nos três arquivos tocados da loja: limpo.

Instruções lidas:
- `CLAUDE.md` (raiz), já no contexto
- `packages/core/CLAUDE.md` (pela tabela de módulos e pelas seções Dinheiro, `orders/*`, `order-actions`, `customers`)
- `apps/store/CLAUDE.md` › O bloco Compre Junto · O botão único leva o conjunto · Carrinho, chrome e checkout · A sacola v4 e a marca "acompanha" · Minha conta e o detalhe do pedido
- `supabase/CLAUDE.md` › Migrations · O Compre Junto · A marca "acompanha" · O relatório de adesão · RLS · Edge functions · mercado-pago · send-notification · checkout · order-proposals
- `.specs/LESSONS.md` › L-013 · L-014 · L-015
- `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local

## Divergências e descobertas

- **A referência `tdd` foi lida tarde.** Li depois das fatias, não antes da primeira. Em cada fatia a implementação veio antes do teste, então nenhum teste passou pelo vermelho do próprio ciclo. Para compensar, cada fatia levou o check de mutação, com a cópia guardada fora do repositório e conferida com `cmp`; todas deram vermelho (ver `Fatias`). A revisão deve ler as asserções sabendo disso.
- **Ordem de publicação.** Os `select` explícitos do e-mail (`dispatch.ts › ORDER_COLUMNS` e `handlers.ts › previewOrder`) agora pedem `full_unit_price`, `buy_together_discount` e `order_bump_discount`. Publicar a function antes da migration `20261107140000` faria o PostgREST devolver `42703` para a consulta inteira, e nenhum e-mail sairia. A ordem é migration → functions → bundles; está registrada no comentário de `ORDER_COLUMNS`.
- **A seção da costura (spec.md §3/§4) não foi aberta**, embora a tarefa a aponte: a regra 5 deste procedimento proíbe. Tudo o que faltava está em Decisões e premissas.
- **Minha conta**: o detalhe do pedido da conta é a mesma página `/pedido/:id` (`OrderConfirmationPage` → `OrderItemsSummary`), então não há segunda superfície. A lista da conta (foto e contagem) não mudou.
- O `get-order` e o `useOrder` leem `*`, então as colunas novas já chegam à loja sem mudança de `select`.
- **Propagado** para 06 e 07: a linha do Contrato agora nomeia `orderSummary`, o arquivo e a forma de entrada e saída. Em 06, o rótulo "a oferta do checkout" virou "Desconto da oferta".
- A árvore tem mudanças da tarefa 08 em paralelo (migration `20261107150000`, adesão no painel, `compreJuntoAdesaoSchema.test.ts`). Não as toquei, e a suíte da loja passou com elas.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 05
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); packages/core/CLAUDE.md; apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; supabase/CLAUDE.md › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, mercado-pago, checkout, send-notification; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: unidade core — packages/core/src/orders/__tests__/summary.test.ts (o resumo fecha com Compre Junto, bump, promoção, cupom e PIX, pelo pedido montado via resolveOrderPricing + resolveOrderLines; pedido sem full_unit_price no formato de antes); componente loja — apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx (de/por, linha partida, linhas de desconto, pedido antigo igual); functions — send-notification/__tests__/render.test.ts (e-mail com de/por, uma linha por desconto, a conta fecha, pedido antigo, prévia com desconto), dispatch.test.ts e handlers.test.ts (os select do motor e da prévia trazem as colunas, com fixtura função do select); guarda Deno — packages/core/src/orders/__tests__/summaryDenoReach.test.ts. Nada ficou sem cobertura; a medida em 390×844 fica para a Validation (jsdom não mede layout)
Verificações: tsc loja 0 (baseline 0); tsc core 11 (os 11 herdados, nada novo); suítes core 5374/219, functions 1460/40, store 6974/371, as três exit 0; eslint dos arquivos da loja limpo; check de mutação em cada fatia, todos vermelho
Árvore de trabalho: core/orders/summary.ts (novo) + barrel + testes; OrderItemsSummary.tsx, itemDetailLine.ts e teste; send-notification layout.ts, email.ts, sample.ts, dispatch.ts, handlers.ts e três testes; tasks 06 e 07 (a linha do Contrato); nada commitado
Citações conferidas: 4 (buy-together/marks.ts, OrderItemsSummary.tsx › Linha, layout.ts › totalsTable e itemsTable, a migration 20261107140000 da tarefa 04); nenhuma deslocada nem morta
Propagado: 06 — Contrato nomeia orderSummary (arquivo, entrada, saída) e o rótulo "Desconto da oferta"; 07 — Contrato nomeia orderSummary (arquivo, entrada, saída)
```

## T05 — wi-impl-review · fixing · agente a7d3d757f5c2c84a9

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/05-confirmacao-minha-conta-e-email.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | premissa derrubada | atrapalha | apps/store/src/entities/order/lib/itemDetailLine.ts:34 (inalterado; a premissa 8 o mantém) | A premissa 8 mantém "{variação} · Qtd: N" também no pedido novo. O motivo dado, que o pedido antigo tem de continuar igual, não exige isso: o formato novo pode ser ligado só quando `resumo.detailed` for verdadeiro, como já acontece com o "de/por" e as linhas de desconto. | Tarefa › Design: "'Itens do pedido': a linha mista partida em duas — … —, cada uma com '{variação} · N unidade(s)'." e "Este recorte é a fonte". |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| confirmação, Minha conta e e-mail mostram o resumo novo pela regra de `core/orders` | `OrderItemsSummary.tsx` chama `orderSummary` (a confirmação e Minha conta são a mesma página, `/pedido/:id`, e o pedido vem de `select('*, order_items(*)')` em `useOrders.ts:61,76` e em `checkout/handlers.ts:679`). No e-mail: `layout.ts` (`itemsTable`, `totalsTable`, `textBody`). Os selects estão em `dispatch.ts` `ORDER_COLUMNS` e em `handlers.ts` `previewOrder` | sim |
| pedido antigo continua igual | `summary.ts`: com `detailed=false` saem subtotal gravado, "Desconto"/"Cupom X" e PIX. Na loja, rótulos, frete "Grátis" e valores ficam equivalentes. No e-mail, "Desconto" e os valores ficam iguais, sem `<s>` | sim (a parte byte a byte do e-mail só a execução prova) |
| a folha nova é alcançável pelo Deno | `summary.ts` importa só `../payment/orderLines.ts`, que é uma folha sem import. `layout.ts` importa `.../orders/summary.ts` por caminho relativo. `summaryDenoReach.test.ts` cobre isso | sim |
| cada comportamento do bloco `Testes` coberto por um teste escrito | ver a seção Testes | sim |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- RNF-03: a folha usa só imports relativos com `.ts`, e o e-mail a importa por caminho relativo (`layout.ts:11`). O barrel `orders/index.ts` reexporta com `.ts`. Aplicada.
- Os guardas `numeroDoPedidoComDonoUnico` e `situacaoComDonoUnico` seguem valendo: as telas tocadas não montam número de pedido nem mapa de status. `ORDER_DISCOUNT_LABELS` mora em `core`, fora do escopo de `situacaoComDonoUnico`. Aplicada.
- Ordem de publicação functions → bundles: não é coisa de código. O comentário em `dispatch.ts:159-162` acrescenta migration → function, o que não contradiz a ordem pedida.

## Testes

- unidade (core), o resumo fecha com Compre Junto, bump, promoção, cupom e PIX: `packages/core/src/orders/__tests__/summary.test.ts`. As fixturas saem das funções reais `resolveOrderPricing` e `resolveOrderLines`, e os testes conferem a ordem e os rótulos das linhas, os valores e `fecha(s) === total`. Morde.
- unidade (core), pedido sem `full_unit_price` cai no formato de antes: o mesmo arquivo, no `describe` "pedido de antes". Confere `detailed=false`, a lista exata de descontos e o caso de uma linha só sem preço cheio. Morde.
- componente (loja), "de/por", linha partida, linhas de desconto e pedido antigo igual: `apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx`, no novo `describe`. Confere o `<s>` e o valor cobrado, "Acompanha o … · 10% a menos" só na parte casada, a parte avulsa sem frase e sem "de/por", os `dt` na ordem certa, a soma que fecha e, no pedido antigo, os rótulos de antes com subtotal 200. Morde.
- functions, o e-mail com "de/por", uma linha por desconto e a conta que fecha: `supabase/functions/send-notification/__tests__/render.test.ts`, que cobre HTML e texto. Os testes do motor (`dispatch.test.ts`) e da prévia real (`handlers.test.ts`) usam uma fixtura que só devolve as colunas pedidas no `select`. Assim, tirar uma coluna do select faz cair `Desconto do Compre Junto` e "289,00". Morde.
- functions, a prévia `render/sample.ts` com desconto: `render.test.ts`, no último caso, que confere "10% a menos", a linha do desconto e o fechamento da conta. Morde.
- guarda de alcance Deno: `packages/core/src/orders/__tests__/summaryDenoReach.test.ts`. Ancora o grafo (2 arquivos), traz sensores para `import type` sem extensão, para import de pacote e para CRLF/LF no removedor de comentário, e confere que o e-mail importa o arquivo e não o barrel. Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `orderSummary` numa folha nova `orders/summary.ts`, exportada pelo barrel, com a forma declarada | sim | Contrato da tarefa; `summary.ts`; `index.ts` | sim: a forma está repetida no Contrato das tarefas 06 e 07 |
| 2 | Formato detalhado só se todas as linhas têm `full_unit_price` | sim | `mercado-pago/handlers.ts:420`: o ramo `proposal_id` sai antes do recálculo que grava `full_unit_price` (linhas 804 a 920) | sim |
| 3 | Subtotal = Σ cheio × qtd, Total = `orders.total`, ordem das linhas | sim | Design da tarefa (a ordem bate); fixturas de `summary.test.ts` montadas pelas funções reais | sim |
| 4 | Rótulo "Desconto da oferta" | sim | Design diz apenas "o da oferta do checkout" e não fixa o rótulo; 06 repete esse rótulo | sim |
| 5 | "Cupom {CÓDIGO}"; no e-mail, só "Cupom", sem `coupon_code` no select | sim | Design do e-mail: "totais … Cupom …"; pedido antigo continua "Desconto" | sim |
| 6 | "N% a menos" só quando os candidatos somam exatamente `buy_together_discount` | sim | `summary.ts` (`attributed`); teste "o percentual só sai quando o snapshot confere" | sim |
| 7 | Só a primeira parte da linha mista diz "Acompanha" (`showsCompanion`) | sim | Design: "uma com 'Acompanha o {joia} · N% a menos' … outra a preço cheio"; `joinOrderRows` agrupa pela identidade | sim |
| 8 | Manter "{variação} · Qtd: N" | não | Design da tarefa: "cada uma com '{variação} · N unidade(s)'". O pedido antigo pode ficar igual condicionando em `detailed` (achado 1) | sim: o raio diz só "Loja" |
| 9 | No e-mail, "Compre Junto · N% a menos" sob a variação e `<s>` cheio acima do cobrado; no texto, "(de …; …)" | sim | Design do e-mail; `layout.ts` `itemsTable` e `textBody` | sim |
| 10 | O exemplo continua com 2 itens: corrente a 36/40, 285 + 24,90 − 14,25 = 295,65 | sim | `render.test.ts` usa `toHaveLength(2)`; a conta do exemplo fecha (289 − 4 − 14,25 + 24,90 = 295,65) | sim |

## Não conferido

- `.specs/work-items/92-desconto-da-compra-casada/tasks/06-…md` e `07-…md` estão `??` (o diretório `tasks/` inteiro está untracked, sem intent-to-add) e por isso não têm baseline. Julguei só o estado atual. O Contrato das duas descreve a forma de `orderSummary` de acordo com a premissa 1. Sem baseline, não consigo provar que a propagação mexeu só nas afirmações que a descoberta tornou falsas e em nada mais desses arquivos.
- RNF-05 (390×844 sem rolagem horizontal, "de/por" sem quebrar em pílula): só o navegador mede.
- Se as suítes passam, e o T12 dos e-mails legados "byte a byte": dependem de execução.
- `packages/core/src/payment/orderLines.ts` (`joinOrderRows`) vem da tarefa 04 e não está em `alterados`. Conferi apenas que é uma folha sem import.
Instruções lidas: `CLAUDE.md` (raiz, recebido no contexto: O "defeito 01", Alias de import, Convenções, Os guardas, Baselines, CI e deploy); `apps/store/CLAUDE.md` › A sacola v4 e a marca "acompanha", › Minha conta e o detalhe do pedido; `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Convenções de tipo; `supabase/CLAUDE.md` › `send-notification` — o motor de notificação. Não li `apps/store/CLAUDE.md` › O bloco Compre Junto, › O botão único, › Carrinho, chrome e checkout, as demais seções de `supabase/CLAUDE.md` (Migrations, Compre Junto, adesão, RLS, mercado-pago, checkout) nem `.specs/LESSONS.md` L-013..L-015. A L-014 está descrita na própria tarefa, em D-01.

## T05 — wi-impl-task · done · agente acf6310633a5978a7

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/05-confirmacao-minha-conta-e-email.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 8 | (revista) No pedido novo (`resumo.detailed` verdadeiro), a linha de detalhe da peça passa a ser "{variação} · N unidade(s)": "1 unidade", "2 unidades". No pedido de antes continua "{variação} · Qtd: N". Para isso `itemDetailLine(item, detailed = false)` ganhou um segundo parâmetro, e `OrderItemsSummary` passa `resumo.detailed`. | Manter "Qtd: N" em todo pedido | O achado está certo: ligar o formato novo só no pedido detalhado, como já acontece com o "de/por", deixa o pedido antigo intacto e segue o recorte de design. | Só a loja (`itemDetailLine` não tem outro consumidor). As tarefas 06 e 07 seguem o próprio padrão de tela. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 2 | A confirmação mostra o "de/por", a linha partida (cada parte com "{variação} · N unidade(s)") e as linhas de desconto; o pedido antigo continua com "Qtd: N" | componente (loja) | `apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx` (+1 caso, e asserções novas nos casos da linha partida e do pedido antigo) | sim | vermelho (com `itemDetailLine(item)` sem `resumo.detailed`, 2 casos falham) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

packages/core/src/orders/summary.ts — criado
packages/core/src/orders/__tests__/summary.test.ts — criado
packages/core/src/orders/__tests__/summaryDenoReach.test.ts — criado
packages/core/src/orders/index.ts — alterado
packages/core/src/orders/__tests__/purity.test.ts — alterado
apps/store/src/entities/order/ui/OrderItemsSummary.tsx — alterado
apps/store/src/entities/order/lib/itemDetailLine.ts — alterado
apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx — alterado
supabase/functions/send-notification/render/layout.ts — alterado
supabase/functions/send-notification/render/email.ts — alterado
supabase/functions/send-notification/render/sample.ts — alterado
supabase/functions/send-notification/dispatch.ts — alterado
supabase/functions/send-notification/handlers.ts — alterado
supabase/functions/send-notification/__tests__/render.test.ts — alterado
supabase/functions/send-notification/__tests__/dispatch.test.ts — alterado
supabase/functions/send-notification/__tests__/handlers.test.ts — alterado
.specs/work-items/92-desconto-da-compra-casada/tasks/06-painel-do-pedido-com-desconto.md — alterado
.specs/work-items/92-desconto-da-compra-casada/tasks/07-app-do-atelie-detalhe-do-pedido.md — alterado

## Verificação

Só o que a correção tocou e rodou:
- Arquivo de teste da fatia: `pnpm --filter @estrelinha/store exec vitest run src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx --testTimeout=20000` (`PROJECT.md`), 25/25.
- Check de mutação: vermelho, como esperado; arquivo restaurado pela cópia e conferido com `cmp`.
- Tipos da loja: `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos), 0 erros, igual à baseline.
- eslint em `src/entities/order`: limpo.
- Suíte da loja: `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines), 6975/371, exit 0.

Instruções lidas: as mesmas da implementação, sem releitura.

## Divergências e descobertas

nada

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 05
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); packages/core/CLAUDE.md; apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; supabase/CLAUDE.md › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, mercado-pago, checkout, send-notification; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: unidade core — packages/core/src/orders/__tests__/summary.test.ts (o resumo fecha com Compre Junto, bump, promoção, cupom e PIX, pelo pedido montado via resolveOrderPricing + resolveOrderLines; pedido sem full_unit_price no formato de antes); componente loja — apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx (de/por, linha partida com "{variação} · N unidade(s)", linhas de desconto, pedido antigo igual com "Qtd: N"); functions — send-notification/__tests__/render.test.ts (e-mail com de/por, uma linha por desconto, a conta fecha, pedido antigo, prévia com desconto), dispatch.test.ts e handlers.test.ts (os select do motor e da prévia trazem as colunas, com fixtura função do select); guarda Deno — packages/core/src/orders/__tests__/summaryDenoReach.test.ts. Nada ficou sem cobertura; a medida em 390×844 fica para a Validation (jsdom não mede layout)
Verificações: tsc loja 0 (baseline 0); tsc core 11 (os 11 herdados, nada novo); suítes core 5374/219, functions 1460/40, store 6975/371 (remedida na correção), as três exit 0; eslint dos arquivos da loja limpo; check de mutação em cada fatia, todos vermelho
Árvore de trabalho: core/orders/summary.ts (novo) + barrel + testes; OrderItemsSummary.tsx, itemDetailLine.ts e teste; send-notification layout.ts, email.ts, sample.ts, dispatch.ts, handlers.ts e três testes; tasks 06 e 07 (a linha do Contrato); nada commitado
Citações conferidas: 4 (buy-together/marks.ts, OrderItemsSummary.tsx › Linha, layout.ts › totalsTable e itemsTable, a migration 20261107140000 da tarefa 04); nenhuma deslocada nem morta
Propagado: 06 — Contrato nomeia orderSummary (arquivo, entrada, saída) e o rótulo "Desconto da oferta"; 07 — Contrato nomeia orderSummary (arquivo, entrada, saída)
```

## T06 — wi-impl-task · review · agente a1d86e7d902ca2e6b

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/06-painel-do-pedido-com-desconto.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O preço do item no painel continua sendo o da UNIDADE (ao lado de "N un"). Com desconto, mostra o cheio da unidade riscado (`full_unit_price`) e o cobrado (`unit_price`) embaixo. Se há desconto quem decide é `orderSummary(...).rows[i].full != null` | Passar a mostrar o total da linha (`rows[i].charged`/`full`), como faz a loja | O painel sempre mostrou o preço unitário ao lado da quantidade. Assim o pedido antigo fica exatamente como antes e nenhum valor é calculado na tela | `AdminOrderPage.tsx` (bloco Itens) |
| 2 | Os rótulos do cartão Pagamento passam a vir de `orderSummary` também nos pedidos antigos: "Desconto PIX" no lugar de "Desconto Pix", e "Cupom <código>" quando o pedido antigo tem `coupon_code` | Manter o bloco antigo, com os rótulos de antes, para pedido sem `full_unit_price` | A tarefa pede "os rótulos saem de `orderSummary`" e "uma regra só". A composição do pedido antigo (subtotal gravado, cupom, PIX, frete, total) continua a mesma | `AdminOrderPage.tsx`. Mudou o seletor de texto de `AdminOrderPage.origem.test.tsx` (`'Desconto Pix'` → `'Desconto PIX'`); as asserções não mudaram |
| 3 | Ordem do cartão Pagamento: Subtotal, os descontos de `core` menos o PIX, o "Desconto combinado" da proposta (`ManualDiscountRow`, que continua como era), Desconto PIX, Frete, Total | Usar a ordem da loja (Frete antes dos descontos) | É a ordem que a seção Design da tarefa define, e mantém o desconto combinado entre o desconto e o PIX, como já asserido em `AdminOrderPage.origem.test.tsx` | `AdminOrderPage.tsx` |
| 4 | Na linha mista partida, a frase "Acompanha o …" só sai quando `rows[i].showsCompanion` é verdadeiro. Não acrescentei o sufixo "· N% a menos" que a loja usa | Copiar o sufixo de percentual da loja | O recorte de Design não pede o percentual; o "quanto" está na linha "Desconto do Compre Junto". Pela regra 4, a menor superfície vence | `AdminOrderPage.tsx`. O app do ateliê (tarefa 07) decide o dele |
| 5 | O escopo do guarda de tom vai além das quatro pontas de D-09: entram também `entities/order/ui/OrderItemsSummary.tsx` e `packages/core/src/orders/summary.ts` (onde mora o rótulo "Desconto do Compre Junto") | Ler só as quatro pontas que D-09 nomeia | Sem `summary.ts`, as frases novas do painel e do e-mail ficariam fora da régua, porque o painel desenha rótulos de `core`. `ProductInfo.tsx` continua fora, declarado no arquivo e asserido pela âncora | `tomDoCompreJunto.test.ts` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O pedido com desconto mostra "de/por" na peça | página real (painel) | `apps/backoffice/src/pages/admin/AdminOrderPage.desconto.test.tsx` › "a peça com desconto mostra o preço cheio riscado e o cobrado" | sim | — |
| 2 | A linha mista aparece partida em duas; só a parte com desconto diz o que acompanha | página real (painel) | idem › "a linha mista aparece partida em duas…" | sim | — |
| 3 | "Desconto do Compre Junto − R$ X" aparece, e a conta fecha | página real (painel) | idem › "o cartão Pagamento parte do cheio… e a conta fecha" | sim | — |
| 4 | O pedido antigo fica como hoje | página real (painel) | idem › "subtotal gravado, o desconto do cupom e o PIX…" | sim | — |
| 5 | Guarda: as frases novas sem "economiz", exclamação ou urgência; a âncora acha as quatro pontas; o sensor prova que "Economize!" num arquivo do escopo reprova | guarda que lê o fonte | `apps/store/src/entities/product/ui/__tests__/tomDoCompreJunto.test.ts` | sim | vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

apps/backoffice/src/pages/admin/AdminOrderPage.tsx alterado
apps/backoffice/src/pages/admin/AdminOrderPage.desconto.test.tsx criado
apps/backoffice/src/pages/admin/AdminOrderPage.origem.test.tsx alterado
apps/store/src/entities/product/ui/__tests__/tomDoCompreJunto.test.ts alterado

## Verificação

- Um arquivo de teste, de `PROJECT.md` › Comandos de verificação: `pnpm --filter … exec vitest run <arquivo> --testTimeout=20000`.
  - `AdminOrderPage.desconto.test.tsx`: as 4 falharam antes da implementação; 4/4 verdes depois.
  - `src/pages/admin/AdminOrderPage*`: 124/124 verdes, depois de trocar o seletor `'Desconto Pix'` em `.origem`.
  - `tomDoCompreJunto.test.ts`: 5/5 verdes.
- Check de mutação no guarda: injetei "Grátis, economize" num literal de `AdminOrderPage.tsx` e 2 casos falharam. Restaurei pela cópia, `cmp` conferiu byte a byte, e o arquivo voltou a 5/5.
- Tipos, de `CLAUDE.md` › Comandos:
  - `npx tsc --noEmit -p apps/store/tsconfig.app.json`: 0 erros.
  - `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`: 7 erros (TS2304 ×3, TS2593 ×4), todos em `features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx`. Esse arquivo já estava no commit base `4c6e9a16`, e não o toquei. Não veio baseline e não medi uma antes da primeira fatia; nenhum erro está em arquivo que eu toquei.
- Verificação mínima, de `CLAUDE.md` › Baselines e `PROJECT.md`:
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: exit 0, 5115 testes em 282 arquivos.
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: exit 0, 6976 testes em 371 arquivos.
- `npx eslint` nos quatro arquivos tocados: limpo.

Instruções lidas:
- `CLAUDE.md` (raiz, no contexto): O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy
- `apps/backoffice/CLAUDE.md`: Molde dos formulários; Pedidos e a fila de material (com "O aviso à cliente é escolha…"); Compre Junto › Listas; Compre Junto › Adesão; Compre Junto › a aba "Compre junto" do produto
- `apps/store/CLAUDE.md`: O bloco Compre Junto; O botão único leva o conjunto; Carrinho, chrome e checkout; A sacola v4 e a marca "acompanha"; Minha conta e o detalhe do pedido
- `.specs/LESSONS.md`: L-013, L-014, L-015
- `.specs/project/PROJECT.md`: Comandos de verificação, Ambiente local

## Divergências e descobertas

- O guarda lê só os literais entre aspas e crases, não o texto JSX. As frases do cartão Pagamento chegam pelo rótulo de `core` (`summary.ts`, que está no escopo). Texto escrito direto como JSX numa das pontas fica fora da régua — limitação que já existia, declarada aqui.
- O desconto combinado da proposta (`manual_discount`) não entra em `orderSummary`. Continua sendo desenhado à parte por `ManualDiscountRow`. Num pedido montado pelo painel que tenha `full_unit_price`, não conferi se Subtotal cheio − descontos + frete fecha com o total quando há desconto combinado. Isso é da regra de `core` (tarefa 05), e não alterei.
- Nenhuma citação de linha deslocada que importasse: `AdminOrderPage.tsx:729` (Subtotal) estava na 729, e o bloco Itens foi achado pelo alvo.
- Nenhuma transição ou animação nova: `animacaoRespeitaMovimento` não é afetado.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 06
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz › O "defeito 01", Alias de import, Convenções, Os guardas, Baselines, CI e deploy); apps/backoffice/CLAUDE.md (Molde dos formulários, Pedidos e a fila de material, Compre Junto › Listas/Adesão/aba do produto); apps/store/CLAUDE.md (O bloco Compre Junto, O botão único leva o conjunto, Carrinho chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido); .specs/LESSONS.md (L-013, L-014, L-015); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: "de/por" na peça, linha mista partida, "Desconto do Compre Junto − R$ X" com a conta fechando, pedido antigo como hoje — todos em apps/backoffice/src/pages/admin/AdminOrderPage.desconto.test.tsx; o guarda de tom (âncora das quatro pontas, "economiz" na régua, sensor de "Economize!" num arquivo do escopo) em apps/store/src/entities/product/ui/__tests__/tomDoCompreJunto.test.ts. Nada ficou sem cobertura.
Verificações: os arquivos de teste tocados verdes (4/4, 124/124 nas páginas do pedido, 5/5 no guarda); mutação no guarda deu vermelho e o arquivo foi restaurado com cmp; tsc store 0; tsc backoffice com 7 erros só em ProposalStateBadge.test.tsx, que já estava no commit base e não foi tocado; suíte backoffice exit 0 (5115/282); suíte store exit 0 (6976/371); eslint limpo nos arquivos tocados.
Árvore de trabalho: apps/backoffice/src/pages/admin/AdminOrderPage.tsx (alterado), AdminOrderPage.desconto.test.tsx (criado), AdminOrderPage.origem.test.tsx (seletor 'Desconto Pix' → 'Desconto PIX'), apps/store/src/entities/product/ui/__tests__/tomDoCompreJunto.test.ts (escopo, régua e sensores). Nada commitado.
Citações conferidas: 5 (orderSummary em core/orders/summary.ts, AdminOrderPage.tsx:729, AdminOrderPage.acompanha.test.tsx, tomDoCompreJunto.test.ts, render/layout.ts só lido); nenhuma deslocada, nenhuma morta.
```

A divergência é o rótulo do PIX ("Desconto Pix" → "Desconto PIX", vindo de `core`), que mudou um seletor de texto em `AdminOrderPage.origem.test.tsx`. Não havia o que propagar ("Habilita: nada"), e nada caducou.

## T06 — wi-impl-review · done · agente aa84e4eec2246a69e

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/06-painel-do-pedido-com-desconto.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o painel do pedido mostra o resumo pela regra de `core/orders` | `AdminOrderPage.tsx`: `const resumo = orderSummary({ ...order, order_items: items })`. O Subtotal, os descontos (`resumo.discounts`), o Frete e o Total do cartão Pagamento vêm de `resumo`. O "de/por" é decidido por `resumo.rows[index].full != null`, e a frase "Acompanha" por `rows[index].showsCompanion`. Nenhum desconto é calculado na tela | sim |
| o guarda de tom cobre as quatro pontas e reprova "economiz" | `tomDoCompreJunto.test.ts`: `PONTAS` lista OrderSummary, OrderItemsSummary, summary.ts, layout.ts e AdminOrderPage. A âncora exige `OrderSummary.tsx`, `layout.ts`, `AdminOrderPage.tsx` e `summary.ts`, exige `ProductInfo.tsx` ausente e exige o literal 'Desconto do Compre Junto'. A régua `tomProibido` agora começa por `economiz` | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `AdminOrderPage.desconto.test.tsx` (4 casos) e `tomDoCompreJunto.test.ts` (âncora, sensor novo, frases novas no sensor e no inverso) | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- `animacaoRespeitaMovimento.test.ts` vale para transições novas: o diff de `AdminOrderPage.tsx` não acrescenta nenhuma classe `transition-*` ou `animate-*`. Não há o que parear.
- Guarda que recusa string descreve a forma proibida: o cabeçalho de `tomDoCompreJunto.test.ts` diz "usa o verbo de economia no imperativo" e não escreve a palavra. A forma por extenso só aparece nos sensores ('Economize no conjunto', 'Você economizou…', a mutação 'Economize! Grátis'). Aplicada.

## Testes

- Página real do painel, "de/por": `AdminOrderPage.desconto.test.tsx`, caso "a peça com desconto mostra o preço cheio riscado e o cobrado". Assere o `<s>` com R$ 100,00 e o texto exato `R$ 100,00R$ 80,00`, a frase "Acompanha o Pingente Estrela" e o principal sem riscado. Os preços cheio e cobrado divergem (100 contra 80), como pede L-013. Morde.
- Linha partida: caso "a linha mista aparece partida em duas". Exige 2 `li`; a parte avulsa sai sem `<s>`, com R$ 100,00 e sem "Acompanha". Morde, e mata a remoção do recorte por `showsCompanion`.
- "Desconto do Compre Junto − R$ X" e a conta fecha: caso do cartão Pagamento. Usa `toEqual` sobre as linhas na ordem (Subtotal 400, Compre Junto 20, PIX 19, Frete 25, Total 386), mais a soma subtotal − descontos + frete = total, com valores literais. Morde: pega a ordem e pega o subtotal líquido, o caso de L-014.
- Pedido antigo igual ao de hoje: caso no segundo `describe`. Exige os rótulos `Subtotal, Desconto, Desconto PIX, Frete, Total`, o subtotal gravado (180), "Grátis", o total 155,50, nenhuma menção a Compre Junto e nada riscado. Morde. A grafia "Desconto PIX" é a premissa 2.
- Guarda, as frases novas sem "economiz", exclamação ou urgência: o caso principal varre os literais das pontas, sem comentário. O literal 'Desconto do Compre Junto' é exigido na âncora, o que prova que `summary.ts` está mesmo sendo varrido. Morde.
- Guarda, a âncora encontra os quatro arquivos: `toContain` de cada basename e `not.toContain('ProductInfo.tsx')`. Morde.
- Guarda, o sensor de "Economize!": troca `'Grátis'` por `'Economize! Grátis'` no `AdminOrderPage.tsx` real. Exige que a mutação mudou a fonte (`not.toBe`), que o original sai limpo e que o mutado acusa exatamente esse literal, pelas mesmas `literais` e `tomProibido` do caso principal. Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O preço ao lado de "N un" continua o da unidade, com o cheio da unidade riscado; quem decide se há desconto é `rows[i].full` | sim | O Design pede só "de/por" na linha, não o total da linha. O valor riscado é o `full_unit_price` gravado; nada é calculado na tela | sim (`AdminOrderPage.tsx`, bloco Itens) |
| 2 | Os rótulos do cartão Pagamento vêm de `orderSummary` também no pedido antigo ("Desconto PIX", "Cupom X") | sim | A tarefa diz "os rótulos saem de `orderSummary`", e é `core` (tarefa 05, que não se altera) que decide o rótulo do pedido antigo. A composição antiga (subtotal gravado, desconto, PIX, frete, total) se mantém | sim: a única consequência fora da página é o seletor trocado em `AdminOrderPage.origem.test.tsx`, e a diferença no diff é só essa string |
| 3 | A ordem é Subtotal, descontos sem o PIX, desconto combinado, PIX, Frete, Total | sim | Bate com a ordem da seção Design. `origem.test.tsx` ("entre o desconto e o desconto Pix") continua válido, e a aritmética do desconto combinado segue fora de `orderSummary`, como era (180 − 18 − 20 − 6,5 = 135,5) | sim |
| 4 | Sem o sufixo "· N% a menos" na frase "Acompanha" | sim | O recorte de Design não pede o percentual, e o valor do desconto está na linha "Desconto do Compre Junto" | sim; o app do ateliê fica para a tarefa 07 |
| 5 | O escopo do guarda inclui também `OrderItemsSummary.tsx` e `core/orders/summary.ts` | sim | D-09 manda "ampliar o escopo aos arquivos das frases novas", e o rótulo "Desconto do Compre Junto" mora em `summary.ts`. `ProductInfo.tsx` fica fora, declarado e asserido. `layout.ts` só é lido, não editado (Não faça respeitado) | sim (`tomDoCompreJunto.test.ts`) |

## Não conferido

- Se os testes passam, e se o `tsc` do painel aceita `item.full_unit_price` e o spread de `order` em `orderSummary`: os dois dependem dos tipos que as tarefas anteriores deixaram, e só a execução prova.
- Se o guarda de tom, varrendo `AdminOrderPage.tsx` e `layout.ts` inteiros, não acusa algum literal anterior a esta tarefa (por exemplo, uma string com `!` ou "hoje"): só a execução mostra.
- A aritmética de um pedido de proposta que seja "detalhado" (com `full_unit_price`): o subtotal cheio, o `order_bump_discount` como resto e o desconto combinado mostrado à parte. Depende de como o servidor grava o resto (tarefas anteriores) e não está no recorte desta tarefa.
- Todos os quatro arquivos de `alterados` aparecem no `git diff` (o novo como `A`, com intent-to-add); não houve arquivo sem baseline.
- Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md`, inteiro (a do contexto: o "defeito 01", Alias de import, Convenções, Os guardas, Baselines, CI e deploy). Em `apps/backoffice/CLAUDE.md` li só o índice de títulos, mais uma busca por Pix e resumo do pedido; as seções que a tarefa cita não foram lidas por inteiro (Molde dos formulários, Compre Junto › aba e Adesão, Pedidos e a fila de material). Em `apps/store/CLAUDE.md`, só uma busca por PIX e resumo, sem ler as seções citadas. `.specs/LESSONS.md` › L-013, L-014, L-015.

## T07 — wi-impl-task · review · agente a5440f4ec395430f1

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/07-app-do-atelie-detalhe-do-pedido.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A ordem das linhas segue a da loja (`OrderItemsSummary`) e a do app até hoje: Subtotal, Frete, uma linha por desconto, Total | A ordem que o Design da tarefa escreve (Subtotal, descontos, Frete, Total) | O CA-05.3 pede "a mesma composição do resumo da loja", e a loja põe o Frete antes dos descontos. Também é a ordem que o app já usava. Mudar a ordem é uma linha | o desenho de `BlocoValores.tsx`; a ordem está cravada em `pedidoDescontoCompreJunto.test.tsx` |
| 2 | Os rótulos e o recorte vêm de `orderSummary`. Isso muda texto do pedido antigo: "Desconto do Pix" vira "Desconto PIX", e cupom sem código vira "Desconto". A linha "Promoção" deixa de aparecer em pedido sem preço cheio | Manter os rótulos e a linha "Promoção" do app | A tarefa proíbe rótulo e regra no app. A linha "Promoção" ao lado de um subtotal já líquido é o defeito L-014 que a tarefa manda corrigir | o detalhe de todo pedido no app, inclusive os antigos |
| 3 | O resumo é calculado UMA vez, na `PedidoPage`, por `resumoDoPedido(pedido, itens)` (`widgets/order-detail/model/resumo.ts`, que só monta a entrada). `BlocoValores` recebe `resumo` e `BlocoItens` recebe `precos` | Cada bloco chamar `orderSummary` por conta própria | Uma chamada só evita duas leituras divergentes | a assinatura de `BlocoValores` (`resumo` passou a ser obrigatório) e o prop novo `precos` de `BlocoItens` |
| 4 | Se a leitura dos itens falha, o resumo recebe o pedido sem linhas e mostra o formato de sempre: subtotal gravado, cupom, PIX. Nenhuma linha "Compre Junto" | Mostrar `buy_together_discount` sem o subtotal cheio | Sem as linhas, a regra não conhece o preço cheio. Uma linha de desconto ao lado do subtotal líquido contaria o dinheiro duas vezes | só o estado "itens em falha" do detalhe |
| 5 | O "de/por" mostra os totais da linha (`full` e `charged` de `rows`) numa linha nova `data-parte="de-por"`, com "De"/"por" em `sr-only`. A linha "quantidade × preço unitário" fica igual (unitário cobrado). A frase "Acompanha o …" e o "N% a menos" não entram | Trocar a linha da quantidade; acrescentar a frase "acompanha" | O Design pede só "de/por" e a linha partida. A frase e o percentual seriam superfície nova (regra 4: a menor superfície) | `BlocoItens.tsx` |
| 6 | `COLUNAS_DOS_ITENS` também pede `variant_id`, `size` e `finish` | Pedir só `full_unit_price` e `accompanies_product_ids` | `orderSummary` junta as linhas partidas por produto, variação, tamanho, acabamento e gravação (`joinOrderRows`). Sem essas colunas, `showsCompanion` sairia errado | a leitura do detalhe do app; o probe `02-lista` confere as chaves |
| 7 | As colunas novas dos itens entram ANTES de `'requires_material, material_kinds'`, que segue sendo uma linha exata | Acrescentá-las no fim e mexer na exceção do guarda `semDadoSensivelDeClienteNoApp` | O guarda permite exatamente aquela linha de texto. Mudar a ordem das colunas não muda nada no PostgREST | `linha.ts` |
| 8 | Prefixo da migration `20261107160000`. O maior era `20261107150000`, da tarefa 08. Conferi duas vezes, a segunda já no fim: nenhum prefixo repetido | — | Regra do maior prefixo + 1 hora | se a tarefa 06 criar uma migration depois, ela precisa usar `20261107170000` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `order_list` traz as colunas novas, e as chaves do app batem exatamente com a resposta do PostgREST | integração (Supabase local) | `.specs/features/74-mobile-adm-pedidos/probes/02-lista.sh` (50 `ok —`, TUDO OK) | sim | não se aplica |
| 2 | Pedido com desconto: "de/por" na peça, a linha mista partida em duas, "Desconto do Compre Junto" e o Total do pedido | página real (app) | `apps/mobile-adm/src/pages/__tests__/pedidoDescontoCompreJunto.test.tsx` (casos 1–3) | sim | — (4 de 5 casos ficaram vermelhos antes da implementação; o caso "Total é `orders.total`" já passava, porque é comportamento antigo). Mesmo assim reinjetei 6 mutantes, e os 6 morreram por asserção: subtotal do pedido no lugar do cheio, "de/por" desligado, `precos` sem fiação na página, `full_unit_price` fora do select, `buy_together_discount` fora do select, Total recalculado pela soma. Restauração conferida com `cmp` |
| 3 | Pedido antigo fica igual: subtotal gravado, sem "de/por", sem linha do Compre Junto | página real (app) | o mesmo arquivo, casos 4 e 5 (o 5 é o de itens em falha) | sim | — (vermelho antes) |
| 4 | Linhas de valor no widget, com os rótulos de `core`: sem "Promoção" ao lado do subtotal líquido; o progressivo com linha própria no pedido com preço cheio | componente | `apps/mobile-adm/src/widgets/order-detail/__tests__/ItensValoresEntregaHistorico.test.tsx` (reescrito para a assinatura nova) | sim | vermelho (o mutante "subtotal do pedido" também derrubou o caso do progressivo) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

supabase/migrations/20261107160000_compre-junto-desconto-na-lista-de-pedidos.sql — criado
apps/mobile-adm/src/entities/order/model/linha.ts — alterado
apps/mobile-adm/src/test/pedidos.ts — alterado
apps/mobile-adm/src/widgets/order-detail/model/resumo.ts — criado
apps/mobile-adm/src/widgets/order-detail/index.ts — alterado
apps/mobile-adm/src/widgets/order-detail/ui/BlocoValores.tsx — alterado
apps/mobile-adm/src/widgets/order-detail/ui/BlocoItens.tsx — alterado
apps/mobile-adm/src/pages/PedidoPage.tsx — alterado
apps/mobile-adm/src/pages/__tests__/pedidoDescontoCompreJunto.test.tsx — criado
apps/mobile-adm/src/widgets/order-detail/__tests__/ItensValoresEntregaHistorico.test.tsx — alterado
apps/mobile-adm/src/entities/order/api/__tests__/usePedido.test.tsx — alterado
.specs/features/74-mobile-adm-pedidos/probes/02-lista.ts — alterado (só o comentário da régua 7)
.specs/work-items/92-desconto-da-compra-casada/probes/07-lista-do-app.saida.txt — criado

## Verificação

- `supabase migration up --local` (PROJECT.md › Ambiente local): aplicada, e `order_list` termina em `buy_together_discount, order_bump_discount`.
- `bash .specs/features/74-mobile-adm-pedidos/probes/02-lista.sh` (contra o Supabase local): exit 0, 50 `ok —`, TUDO OK, banco restaurado em 87 pedidos. Rodei de novo depois de reordenar as colunas: mesmo resultado.
- `pnpm --filter @estrelinha/mobile-adm exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md › Comandos de verificação), arquivo por arquivo durante as fatias: verde.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros. Baseline medida antes da primeira fatia: 0 erros; diferença: nenhuma.
- `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` (CLAUDE.md › Baselines): exit 0, 2371/149.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (PROJECT.md: a suíte da loja quando o app muda): exit 0, 6976/371.
- `npx eslint .` em `apps/mobile-adm` (CLAUDE.md › Baselines): 0/0.
- Não rodei a suíte do backoffice. A tarefa 06 edita o painel em paralelo, e a PROJECT.md pede só a suíte da loja.
- Instruções lidas: CLAUDE.md › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy (vieram no contexto); apps/mobile-adm/CLAUDE.md › Pedidos (feature 74), Os guardas do app, Testes; supabase/CLAUDE.md › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, checkout (de mercado-pago e send-notification li só a linha da tabela de functions); .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local; e a referência `tdd.md`.

## Divergências e descobertas

- O Design da tarefa põe o Frete depois dos descontos; a loja põe antes. Segui a loja (decisão 1).
- Dois testes antigos do app cravavam as listas exatas de colunas: `usePedido.test.tsx` (as colunas de `order_items` e "termina em `material_tracking_set_by`"). Atualizei os dois para as listas novas. A asserção da `82` continua exigindo as duas colunas juntas, e uma asserção nova exige o fim em `buy_together_discount, order_bump_discount`. Nada foi afrouxado.
- No widget, três testes antigos de valores mudaram de comportamento por mandato da tarefa (L-014): "Promoção" ao lado do subtotal líquido deixou de aparecer, e os rótulos passaram a vir de `core`. Foram reescritos, não afrouxados.
- O guarda `semDadoSensivelDeClienteNoApp` permite exatamente a linha `'requires_material, material_kinds'`. Por isso as colunas novas entraram antes dela (decisão 7); o guarda não foi tocado.
- Citações conferidas: 5. `20261028120000_82-envelope-da-cliente.sql:82-104` estava no lugar e é a definição vigente de `order_list`. `BlocoValores.tsx:40-49` estava no lugar. `summary.ts` e o barrel estavam como a tarefa diz. `linha.ts` estava como a tarefa diz. O probe `02-lista.ts` importa o esperado de `linha.ts`, então "atualizar o esperado" aconteceu sozinho; só acrescentei uma nota no comentário dele.
- A fatia 1 (probe no banco) não leva check de mutação. A sensibilidade das chaves está provada pelos mutantes da fatia 2, porque o dublê do teste da página só devolve as colunas que o `select` pede.
- Nenhum arquivo seguinte de `tasks/` a propagar: a 07 não habilita nada.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 07
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; apps/mobile-adm/CLAUDE.md › Pedidos (feature 74), Os guardas do app, Testes; supabase/CLAUDE.md › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, checkout (mercado-pago e send-notification só pela tabela de functions); .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: página real — apps/mobile-adm/src/pages/__tests__/pedidoDescontoCompreJunto.test.tsx ("de/por" e a linha partida; o resumo com o subtotal cheio, "Desconto do Compre Junto", PIX e o Total do pedido; o Total que é orders.total mesmo quando a soma daria outro número; o pedido antigo igual; os itens em falha sem afirmar desconto); integração no banco local — .specs/features/74-mobile-adm-pedidos/probes/02-lista.sh com as chaves novas (saída em .specs/work-items/92-desconto-da-compra-casada/probes/07-lista-do-app.saida.txt); widget — ItensValoresEntregaHistorico.test.tsx reescrito (rótulos de core, sem "Promoção" ao lado do subtotal líquido, o progressivo no pedido com preço cheio). Nada ficou sem cobertura.
Verificações: migration up --local aplicada; probe 02-lista 50 ok, TUDO OK; tsc mobile-adm 0 (baseline 0); suíte mobile-adm 2371/149 exit 0; suíte store 6976/371 exit 0; eslint mobile-adm 0/0; 6 mutantes reinjetados e 6 mortos por asserção, restauração conferida com cmp.
Árvore de trabalho: supabase/migrations/20261107160000_compre-junto-desconto-na-lista-de-pedidos.sql (novo); apps/mobile-adm: entities/order/model/linha.ts, test/pedidos.ts, widgets/order-detail/{index.ts, model/resumo.ts (novo), ui/BlocoValores.tsx, ui/BlocoItens.tsx}, pages/PedidoPage.tsx, testes pages/__tests__/pedidoDescontoCompreJunto.test.tsx (novo), widgets/order-detail/__tests__/ItensValoresEntregaHistorico.test.tsx, entities/order/api/__tests__/usePedido.test.tsx; .specs/features/74-mobile-adm-pedidos/probes/02-lista.ts (comentário); .specs/work-items/92-desconto-da-compra-casada/probes/07-lista-do-app.saida.txt (novo). Nada commitado.
Citações conferidas: 5 abertas; nenhuma deslocada, nenhuma morta.
```

A divergência é a ordem das linhas: o Design da tarefa põe o Frete depois dos descontos, e eu segui a ordem da loja, Frete antes (decisão 1). Nenhum arquivo de tarefa seguinte precisou de propagação, e nenhuma tarefa fechada caducou.

## T07 — wi-impl-review · done · agente afcf5eb8dd6b1f87f

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/07-app-do-atelie-detalhe-do-pedido.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o detalhe do app mostra o resumo pela regra de `core/orders` | `widgets/order-detail/model/resumo.ts` (só monta a entrada de `orderSummary`), `PedidoPage.tsx` (uma chamada, `resumoDoPedido(p, detalhe.itens)`), `BlocoValores.tsx` (subtotal, frete, `resumo.discounts.map`, total de `resumo.total`), `BlocoItens.tsx` (de/por por `precos[posicao]`, alinhado com `order_items`, como `summary.ts` declara) | sim |
| `order_list` traz as colunas novas e o probe `02-lista` passa | migration `20261107160000_…lista-de-pedidos.sql` (lista da `82` copiada sem reordenar, `buy_together_discount` e `order_bump_discount` no fim, `security_invoker`); o probe importa o esperado de `linha.ts`; saída `07-lista-do-app.saida.txt` com "TUDO OK" e as chaves exatas do detalhe e de `order_items` | só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `pages/__tests__/pedidoDescontoCompreJunto.test.tsx` (página real) e o probe `02-lista` (integração) | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

- Os guardas do app seguem valendo: a tela não compara vocabulário de status/pagamento nem predicado de recorte (`regraDePedidoSoNoCore`); a leitura não mudou de caminho, só as colunas do `select` (`leituraSoComPapel`); `BlocoItens`/`BlocoValores` não ganharam `transition-*`/`animate-*` (`movimentoDosPedidos`). A execução deles fica para a medição.
- Prefixo da migration: `20261107160000`, logo depois do maior que existia (`20261107150000`). Nenhum prefixo repetido em `supabase/migrations/`.

## Testes

- Página real (app): `apps/mobile-adm/src/pages/__tests__/pedidoDescontoCompreJunto.test.tsx`. A asserção morde:
  - o dublê só devolve as colunas que o `select` pede, então apagar uma coluna de `COLUNAS_DO_*` derruba o teste;
  - o "de/por" é comparado pelo texto exato (`De R$ 120,00, por R$ 96,00`), e a parte avulsa da linha partida tem que vir sem ele;
  - a lista ordenada das linhas de valor é comparada por igualdade, com "Desconto do Compre Junto − R$ 24,00";
  - o Total é `orders.total` mesmo quando a soma daria outro número (599,90);
  - o pedido antigo sai no formato do subtotal gravado, sem "de/por" e sem a linha do Compre Junto;
  - com os itens em falha, nenhuma linha do Compre Junto aparece.
- Integração: `.specs/features/74-mobile-adm-pedidos/probes/02-lista.ts`. A régua 7 confere a igualdade exata das chaves contra `linha.ts`. Ela passou de primeira (`sem mutação`), e a leitura confirma que é igualdade, não presença.
- Complementares:
  - `ItensValoresEntregaHistorico.test.tsx`: as asserções antigas foram reescritas para os rótulos de `core`, e cada mudança ganhou um teste ao lado. O caso da "Promoção" ao lado do subtotal líquido virou o L-014 invertido, com o par detalhado.
  - `usePedido.test.tsx`: o `select` exato de `order_items`, e as duas colunas no fim de `COLUNAS_DO_DETALHE`.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Ordem Subtotal, Frete, descontos, Total | sim | O resumo da loja (`OrderItemsSummary`) põe Subtotal (l.118), Frete (l.120) e depois `resumo.discounts` (l.123). O CA-05.3 pede a mesma composição da loja | sim |
| 2 | Os rótulos e o recorte vêm de `orderSummary`: "Desconto PIX", "Desconto" no cupom sem código, sem "Promoção" no pedido não detalhado | sim | São os `ORDER_DISCOUNT_LABELS` e o `couponLabel` de `summary.ts`. A tarefa proíbe composição no app. Nenhum outro arquivo do app procura "Desconto do Pix" nem `data-parte` cupom/pix/promocao | sim |
| 3 | Uma chamada em `PedidoPage`; `BlocoValores` recebe `resumo` como prop obrigatório, `BlocoItens` recebe `precos` | sim | Os únicos chamadores de `BlocoValores` são `PedidoPage.tsx:168` e o teste do widget, e os dois foram atualizados | sim |
| 4 | Com os itens em falha, o resumo recebe `order_items: []` e mostra o formato não detalhado | sim | `isDetailedOrder` exige pelo menos uma linha; sem linhas não sai nenhuma linha de desconto casado | sim |
| 5 | O de/por mostra os totais da linha (`full`/`charged`) numa linha nova; a frase "Acompanha" e o percentual ficam de fora | sim | O Design pede só "de/por" e a linha partida | sim |
| 6 | `COLUNAS_DOS_ITENS` também pede `variant_id`, `size` e `finish` | sim | `joinOrderRows` em `summary.ts` agrupa por essas chaves e decide `showsCompanion` | sim (o probe confere as chaves) |
| 7 | As colunas novas entram antes de `requires_material, material_kinds` | sim | A ordem do `select` não muda o PostgREST; o `it.each` de `usePedido.test` crava a string | sim |
| 8 | Prefixo `20261107160000` | sim | O maior anterior era `20261107150000`, e não há repetição | sim. A 06 só menciona migration em tese, sem nenhum item de `order_list` no Contrato |

## Não conferido

- Não rodei nada: os testes do app, os guardas do app (`regraDePedidoSoNoCore`, `leituraSoComPapel`, `movimentoDosPedidos`, `semDadoSensivelDeClienteNoApp`), `tsc`, lint e o probe `02-lista.sh`. O resultado do probe está só no arquivo de saída que o implementador gravou.
- A saída `.specs/work-items/92-desconto-da-compra-casada/probes/07-lista-do-app.saida.txt` não tem intent-to-add (`??` no status). Julguei o arquivo inteiro: é saída de probe, e o conteúdo bate com o escopo. Fica sem baseline para provar que foi gerada pela execução descrita.
- Leitura de layout, como a linha `de-por` a 390 px e com fonte a 200 %: só navegador mede.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (raiz, carregado no contexto: › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy). `apps/mobile-adm/CLAUDE.md` › Pedidos (feature 74), só o trecho da seção (regra em `core/orders`, Total é `orders.total`). Não li `apps/mobile-adm/CLAUDE.md` › Os guardas do app e › Testes, nem `supabase/CLAUDE.md` e `.specs/LESSONS.md` (L-013..L-015). A conferência dessas fontes se apoiou na tarefa, na migration-exemplar da `82` e no código de `core/orders/summary.ts`.

## T14 — wi-impl-task · review · agente a8f35ee838eab3da9

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/14-bug-6-previa-da-faixa-da-lista.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A prévia da lista segue a mesma precedência que a loja usa: chama `claimPieces` de `@estrelinha/core/buy-together`. A peça avulsa vence a lista, e entre listas vale a ordem. Fica na nova `pecasDaListaNestaJoia` em `model/discountPreview.ts`. | Tirar só as peças avulsas com um filtro escrito à mão na aba. | Uma segunda escrita da regra de precedência seria o "defeito 01". `claimPieces` já é a regra única da página do produto e da sacola. | `discountPreview.ts` e `BuyTogetherTab.tsx`. Nenhuma outra tarefa usa isso. |
| 2 | A peça avulsa leva a peça da lista mesmo que ela esteja fora do ar ou sem estoque. Não considera o "Some quando" (`hiddenOnVariantIds`): na prévia, a avulsa leva a peça em todas as variações. | Repetir aqui o estoque e a visibilidade por variação do principal, como faz `resolveAddons`. | A linha da lista não tem os dados da peça dos outros adicionais. A prévia também não é por variação do principal. Fica a forma mais simples e mais fácil de desfazer. Nesses casos raros, a faixa pode omitir um preço que a loja mostra. | Só a frase da prévia. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | BUG-006: a faixa da lista deixa de fora a peça que já é adicional avulso desta joia, mesmo com a lista antes na ordem. A prévia da avulsa não muda. | página real (componente) | `apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx`: "numa lista, a faixa deixa de fora a peça que já é adicional avulso desta joia, como a loja" | sim (reprovou antes: 21,25 no lugar de 42,50) | — |
| 2 | Entre duas listas com a mesma peça, ela fica na primeira e sai da faixa da segunda. | página real (componente) | mesmo arquivo: "entre duas listas com a mesma peça, ela fica na primeira e sai da faixa da segunda" | sim (reprovou antes: "de R$ 22,50 a R$ 45,00") | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

apps/backoffice/src/features/product-form/model/discountPreview.ts alterado
apps/backoffice/src/features/product-form/ui/BuyTogetherTab.tsx alterado
apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminProductFormPage.compreJunto.test.tsx --testTimeout=20000` (fonte: `PROJECT.md` › Comandos de verificação). Antes do conserto: 2 falhas em 35, as duas novas, com o valor do bug. Depois do conserto: 35 de 35.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (fonte: `CLAUDE.md` › Comandos). Saiu com 7 erros, todos em `apps/backoffice/src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx`, um arquivo que não toquei, do commit `4c6e9a16`. Não recebi baseline, então comparei por arquivo: nenhum erro nos arquivos que alterei.
- `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (fonte: `CLAUDE.md` › Baselines). Exit 0, 5117 testes em 282 arquivos.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (fonte: `CLAUDE.md` › Baselines, a suíte da loja quando o painel muda). Exit 1, 6981 de 6987 passaram. As 6 falhas estão em `CheckoutPage.test.tsx`, `compreJuntoSacolaECheckout.test.tsx` e `OrderItemsSummary.test.tsx`. Os três estão modificados na árvore pelas tarefas 09, 10 e 11, que rodam em paralelo. Nenhum guarda reprovou, e nenhum dos três arquivos é desta tarefa.

Instruções lidas: `CLAUDE.md` (raiz, no contexto) › O "defeito 01", Alias de import, Convenções, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `apps/backoffice/CLAUDE.md` › Molde dos formulários, Compre Junto › a aba "Compre junto" do produto; `.specs/LESSONS.md` › L-013, L-014, L-015; `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- O diagnóstico confirmou a localização do planejamento: a causa estava em `BuyTogetherTab.tsx`. A prévia da lista pegava todas as peças ativas da lista, menos a joia, e ignorava `claimPieces`, que `resolveAddons` aplica na loja.
- Um caso fica sem cobertura. Pela decisão 2, se a peça avulsa estiver fora do ar ou sem estoque, ou escondida em alguma variação do principal, a loja devolve a peça à lista e a prévia não. É um caso raro e está registrado.
- As falhas da suíte da loja vêm das tarefas paralelas (veja Verificação).
- O `tsc` do painel já tinha 7 erros antes desta tarefa, em `ProposalStateBadge.test.tsx`. Não mexi neles.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 14
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções, Os guardas, Baselines; packages/core/CLAUDE.md (inteiro); apps/backoffice/CLAUDE.md › Molde dos formulários, Compre Junto › a aba "Compre junto" do produto; .specs/LESSONS.md › L-013, L-014, L-015
Testes escritos: BUG-006 → apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx ("numa lista, a faixa deixa de fora a peça que já é adicional avulso desta joia, como a loja"; reprovou antes do conserto com o piso de R$ 21,25), e a vizinha entre duas listas ("entre duas listas com a mesma peça…"). Sem cobertura: a peça avulsa fora do ar, sem estoque ou com "some quando", que a loja devolveria à lista (decisão 2).
Verificações: o teste do arquivo passa 35/35 (2 reprovaram antes do conserto); suíte do backoffice exit 0 (5117/282); suíte da loja com 6 falhas em arquivos das tarefas 09–11 em andamento, nenhuma desta tarefa; tsc do painel com 7 erros que já existiam, só em ProposalStateBadge.test.tsx, nenhum em arquivo tocado.
Árvore de trabalho: apps/backoffice/src/features/product-form/model/discountPreview.ts (pecasDaListaNestaJoia, via claimPieces de core), apps/backoffice/src/features/product-form/ui/BuyTogetherTab.tsx (a prévia da lista usa a função nova), apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx (+2 casos)
Citações conferidas: 2 (os dois arquivos do Contrato); nenhuma deslocada nem morta
```

## T14 — wi-impl-review · done · agente ab64678caf26c7f44

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/14-bug-6-previa-da-faixa-da-lista.md
Veredito: serve

Não encontrei nenhum achado. A prévia da lista no painel passa a usar a mesma regra de precedência da loja (`claimPieces`). Os dois testes novos derrubam o comportamento antigo. Só há uma ressalva, que a premissa 2 já declara: num caso raro a prévia ainda pode divergir da loja. Está explicada na seção Premissas.

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| nada |       |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a reprodução de BUG-006 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto | `discountPreview.ts` (`pecasDaListaNestaJoia` chama `claimPieces`), `BuyTogetherTab.tsx:405-409` (a faixa da lista passa a vir dela), e o teste "numa lista, a faixa deixa de fora a peça que já é adicional avulso desta joia" em `AdminProductFormPage.compreJunto.test.tsx` | sim, pela leitura. Com o código antigo, a Fita (R$ 25 × 0,85 = R$ 21,25) entraria na faixa e a asserção de "de R$ 42,50 a R$ 59,50" reprovaria. Que ela reprovou de fato antes do conserto, só a execução mostra |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | os dois casos novos no mesmo arquivo | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`.

## Testes

- **Comportamento esperado de BUG-006** — `apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx`, caso "numa lista, a faixa deixa de fora a peça que já é adicional avulso desta joia, como a loja".
  - Monta a página real, com a lista antes da peça avulsa na ordem. Assim prova que a avulsa vence a lista mesmo vindo depois, e não só que a ordem decide.
  - Confere a frase exata das duas prévias. **Morde**: com a regra antiga, o piso seria R$ 21,25.
  - O nível (página real) é o certo, porque o defeito era de fiação da tela, e a regra de precedência já é testada em `core`.
- **Caso extra: duas listas com a mesma peça** — mesmo arquivo, caso "entre duas listas com a mesma peça, ela fica na primeira e sai da faixa da segunda".
  - **Morde**: com o código antigo, a lista "Pingentes" daria a faixa de R$ 22,50 a R$ 45,00, e não "a R$ 45,00".

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | A precedência vem de `claimPieces` (`@estrelinha/core/buy-together`), dentro de `pecasDaListaNestaJoia` em `model/discountPreview.ts`, em vez de um filtro escrito à mão na aba. | sim | `claimPieces` (`packages/core/src/buy-together/availability.ts:124-137`) é a mesma função que `resolveAddons` usa na loja (`:183`). Escrever um filtro à mão seria a segunda escrita da regra, o "defeito 01" do `CLAUDE.md` da raiz. O formato do candidato bate com o de `claimPieces`. | sim: só os dois arquivos de produção. `BuyTogetherTab` repassa a `addons` completa a cada linha. |
| 2 | A peça avulsa leva a peça da lista mesmo fora do ar ou sem estoque. A prévia ignora `hiddenOnVariantIds`. | sim, com o limite que ele mesmo declarou | Na loja, `resolveAddons` só deixa a avulsa levar a peça quando `pieceOf` devolve algo (`availability.ts:97-111` e `:168-170`). Uma avulsa inativa ou sem estoque não leva nada, e a lista fica com a peça. No painel, a frase omite esse preço. É exatamente a divergência que ele declarou ("a faixa pode omitir um preço que a loja mostra"). A linha da lista não recebe os dados das peças dos outros adicionais (`useProductVariants` por linha, `BuyTogetherTab.tsx:397`). A linha da avulsa já aparece marcada "fora do ar". Não achei instrução nem exigência da tarefa que cubra esse caso raro. | sim: só a frase da prévia. |

## Não conferido

- Que os dois testes novos reprovaram antes do conserto e passam agora: só a execução prova. Eu não rodei teste.
- Os três arquivos aparecem como ` M` em `git status`. O diff deles traz só mudanças que esta tarefa explica.

Instruções lidas:
- `CLAUDE.md` (raiz): já carregado no contexto, em especial "O defeito 01", "Alias de import", "Convenções que valem em todo o repositório", "Os guardas" e "Baselines".
- `apps/backoffice/CLAUDE.md` › Compre Junto › a aba "Compre junto" do produto, e o índice de títulos.
- Não li: `packages/core/CLAUDE.md` inteiro, `apps/backoffice/CLAUDE.md` › Molde dos formulários e `.specs/LESSONS.md` › L-013..L-015. O diff não toca nada de que essas seções tratam.

## T10 — wi-impl-task · review · agente a2706e995cdcc84c1

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/10-bugs-3-8-linha-da-peca-de-por.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A causa do BUG-003 está na loja, e não em `packages/core/src/payment`. `buyTogetherLineFacts` passou a ler o preço COBRADO de cada linha a partir das linhas de `resolveOrderLines(input, outcome)` (a função que já grava o pedido e que o servidor também chama). Ganhou o parâmetro `charged: readonly ChargedLine[]` | Mudar `buyTogetherLines` em `core/payment/pricing.ts` para somar `parts.charged` em vez de `parts.base` | `buyTogetherLines.total` é, por contrato, "a linha com o casado", e a tarefa não deixa mexer em `payment/**` sem que a causa esteja lá. `resolveOrderLines` já devolve o cobrado no caminho que venceu, então nenhuma conta nova entrou na tela | `buyTogetherLineFacts` (assinatura nova, com dois chamadores: `CartDrawer` e `OrderSummary`) |
| 2 | `useCartPromotion` expõe `orderLines` (o resultado de `resolveOrderLines` para a mesma entrada da gaveta). O checkout já tinha `orderLines` em `useCheckoutTotals` | Calcular as linhas dentro do `CartDrawer` | Fica uma única entrada para `resolveOrderPricing` na gaveta, e nenhuma conta fica no widget | `CartPromotion` ganhou o campo `orderLines`. É aditivo: quem lê o tipo hoje não quebra |
| 3 | O "de/por" de linha com Compre Junto é "preço cheio × qtd" riscado, seguido do total cobrado. Ele aparece só quando o cobrado é menor que o cheio. Vale também quando a promoção ou a oferta vencem o casado | Manter o casado como "por" | É o Esperado do bug. A soma dos "por" fecha com o Total, e a confirmação do mesmo pedido (239,80 → 167,86) já tinha essa forma | Gaveta e resumo do checkout |
| 4 | "· N% a menos" só aparece quando alguma unidade é cobrada pelo preço do casado. Se a promoção ou a oferta vencem, a frase fica só "Acompanha o X" | Manter "10% a menos" sempre | Com outro desconto vencendo, "10% a menos" descreveria um desconto que não foi o cobrado (a mesma frase falsa do bug) | O texto da frase na gaveta e no checkout |
| 5 | "N com desconto, M a preço cheio" passa a contar as unidades COBRADAS a preço cheio, qualquer que seja o desconto | Contar só as unidades com o casado | Era exatamente a frase falsa do BUG-003 | O texto da linha mista |
| 6 | Linha com Compre Junto em que a oferta vence (casado com desconto zero) passa a levar a frase "Acompanha o X" no checkout | Continuar sem frase, como antes | Observado do BUG-003 (Veneziana): a linha saía sem "de/por" e sem "Acompanha" | A frase no resumo do checkout |
| 7 | BUG-008: o padrão do `AddonPrice` do bloco foi escrito nas três linhas. Um `sr-only` diz "de {cheio} por {cobrado}" e o par visível fica `aria-hidden`. O `data-testid` continua no par visível, e o `sr-only` fica num invólucro `relative` irmão dele | Componente compartilhado em `shared/ui`; `sr-only` dentro do elemento com o `testid` | É a forma que o repositório já usa no bloco. Com o `sr-only` fora do `testid`, as asserções existentes de `textContent` seguem verdadeiras sem reescrita | Três trechos de JSX: `CartDrawerRow`, `OrderSummary`, `OrderItemsSummary` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | BUG-003: a promoção vence nas duas unidades. A linha mostra de 158,00 por 110,60, sem "a preço cheio", e as linhas somam o Total (gaveta e checkout) | página (gaveta + resumo reais, `resolveOrderPricing` real) | `apps/store/src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx` › "a promoção vence nas duas unidades…" | sim | — |
| 2 | BUG-003: com a promoção vencendo, a frase não anuncia os 10% | página | idem › "a promoção vence: a linha diz que acompanha…" | sim | — |
| 3 | BUG-003: a oferta do checkout vence o casado. O resumo mostra de 79,00 por 63,20 e "Acompanha" | página | idem › "a oferta do checkout vence o casado…" | sim | — |
| 4 | BUG-008: gaveta e checkout leem "de R$ 79,00 por R$ 71,10" em `sr-only`, e o par visível fica `aria-hidden` | página | idem › "na gaveta e no resumo: …" | sim | — |
| 5 | BUG-008: `/pedido/:id` lê a frase "de … por …" e deixa o par fora da leitura | componente | `apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx` › "o leitor de tela ouve…" | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

apps/store/src/entities/cart/lib/buyTogetherPricing.ts alterado
apps/store/src/entities/cart/model/useCartPromotion.ts alterado
apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx alterado
apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx alterado
apps/store/src/features/checkout/ui/OrderSummary.tsx alterado
apps/store/src/entities/order/ui/OrderItemsSummary.tsx alterado
apps/store/src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx alterado
apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx alterado

## Verificação

- `npx vitest run <arquivo>` nos dois arquivos de teste, antes do conserto: 5 reprovaram pelos motivos esperados. A gaveta mostrava "R$ 158,00R$ 150,10" no lugar de 110,60. A frase tinha "· 10% a menos". O resumo não tinha `summary-item-price` no caso da oferta. Não havia o `sr-only` "de … por …". Depois do conserto, 37/37. Fonte: `PROJECT.md` › Comandos de verificação, na forma de um arquivo (rodei `npx vitest run` dentro de `apps/store`).
- Os testes dos módulos tocados (`widgets/cart-drawer`, `features/checkout`, `entities/cart`, `entities/order`, `pages/__tests__/compreJunto*`, `Checkout*`) passaram: 50 arquivos, 971 casos, exit 0.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` deu 0 erros, exit 0. Fonte: o arquivo de instruções (`CLAUDE.md` › Comandos). Não houve baseline na entrada; o da tabela de Baselines é 0, e segue 0.
- Verificação mínima, `pnpm --filter @estrelinha/store test --testTimeout=20000`: 371 arquivos, 6987 casos, exit 0, fora de pipe. Fonte: `CLAUDE.md` › Baselines, citado no `PROJECT.md`.
- `npx eslint` nos 8 arquivos tocados não acusou nada.

Instruções lidas: `CLAUDE.md` (raiz, no contexto: O "defeito 01", Alias de import, Convenções, Os guardas, Baselines); `packages/core/CLAUDE.md` › da linha 1 até `shopping` (Quando pertence, Pureza, Os módulos, Dinheiro) e Convenções de tipo; `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `.specs/LESSONS.md` › L-013, L-014, L-015.

## Divergências e descobertas

- O `packages/core/CLAUDE.md` deveria ser lido inteiro e foi lido só nas seções gerais e na de Dinheiro, listadas acima. As seções de módulos que esta tarefa não toca (menu, home, faq, shopping, material e outros) ficaram de fora para conter o contexto.
- O arquivo temporário sugerido, `$TMPDIR/wi-impl-saida.txt`, é usado ao mesmo tempo pelas outras tarefas paralelas e foi sobrescrito no meio da leitura. Passei a gravar a saída no scratchpad desta sessão.
- O "Depende de" (tarefas 01–08) confere: `resolveOrderLines`, `buyTogetherLines` e `orderLines` em `useCheckoutTotals` estão na árvore.
- As quatro citações do Contrato conferem. A causa do BUG-003 estava em `buyTogetherPricing.ts`: a linha somava `buyTogetherLines.total`, que é o preço com o casado sozinho e não o cobrado. O conserto precisou de mais dois arquivos fora do Contrato: `useCartPromotion.ts`, para expor `orderLines`, e `CartDrawer.tsx`, para passá-lo. `packages/core/src/payment/**` não foi tocado.
- Nenhuma fatia deu verde de primeira, então nenhuma levou check de mutação.
- Nenhum arquivo seguinte de `tasks/` afirma algo que ficou falso. A 12 e a 16 só citam `useCartPromotion.ts` e `OrderItemsSummary.tsx` como lugares do sintoma.
- Caducou: na tarefa 03, já fechada, a afirmação sobre o checkout ("item com … 'Acompanha o {joia} · N% a menos' e a linha mista") deixa de valer quando a promoção ou a oferta vencem o casado. Nesse caso a frase fica só "Acompanha o {joia}", e a linha mista conta as unidades cobradas a preço cheio. Quando o casado vence, a afirmação segue verdadeira.
- Não fiz prova em navegador: a validação em navegador não é desta tarefa. jsdom não mede se o "de/por" com o invólucro novo cabe em 390.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 10
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz › defeito 01, Alias, Convenções, Guardas, Baselines); packages/core/CLAUDE.md (seções gerais, Dinheiro e Convenções de tipo — não inteiro); apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; .specs/LESSONS.md › L-013, L-014, L-015
Testes escritos: BUG-003 — apps/store/src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx (promoção vence nas duas unidades na gaveta e no checkout; a frase sem o "10%"; a oferta do checkout vence no resumo); BUG-008 — o mesmo arquivo (sr-only "de … por …" + par aria-hidden na gaveta e no checkout) e apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx (/pedido/:id). Todos reprovaram antes do conserto. Sem cobertura: o layout em 390, que só o navegador mede
Verificações: tsc store 0 erros; testes dos arquivos tocados 37/37; módulos tocados 971/971; suíte da loja 6987/371 exit 0; eslint dos arquivos tocados limpo
Árvore de trabalho: buyTogetherPricing.ts, useCartPromotion.ts, CartDrawer.tsx, CartDrawerRow.tsx, OrderSummary.tsx, OrderItemsSummary.tsx e os dois arquivos de teste; nada commitado
Citações conferidas: 4 (as do Contrato), nenhuma deslocada nem morta
Caducou: tarefa 03 · "item com 'Acompanha o {joia} · N% a menos' e a linha mista" no checkout · quando a promoção ou a oferta vencem o casado, a frase fica só "Acompanha o {joia}" e a linha mista conta as unidades cobradas a preço cheio
```

## T09 — wi-impl-task · review · agente ad8cb122c15bbb4d6

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/09-bugs-1-2-checkout-estado-anterior.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Causa comum dos dois bugs: o rascunho do checkout (`CheckoutDraft`, que `isOrderStale` compara) não guarda as peças da sacola. Depois do PIX, o `orderId` fica na aba (`PIX-P1-08`). Assim, trocar a sacola não deixava o pedido velho, e o CTA reusava o pedido anterior (PGM-08) junto com o `bumpChecked` antigo. O conserto: o pedido passa a guardar uma impressão da sacola (`orderCart`). Quando a impressão de agora diverge da do pedido em curso, o checkout descarta o pedido (`invalidateOrder`, que leva junto a chave de idempotência) e desmarca a oferta. | Pôr as peças dentro do `CheckoutDraft`/`isOrderStale` em `core`. Invalidar no `cartStore` a cada mudança da sacola. | `core/checkout` e o `CheckoutDraft` são compartilhados com a function e com `/pedido-montado`, e mudá-los alcança `core` sem necessidade. Escutar o `cartStore` seria uma superfície maior. Um efeito na própria página é a mudança menor e a mais fácil de desfazer. | `CheckoutPage.tsx`, `checkoutStore.ts` |
| 2 | `cartFingerprint(items, couponCode)` em `features/checkout/lib`. Inclui produto, variação, size/finish, gravação, quantidade, `unitPrice`, as marcas `accompanies` e o cupom. A ordem das linhas não conta. | Exportar e reusar o `keyOf`/`itemKey` do `cartStore`. Usar `totals.total` ou as `orderLines`. | A impressão não é a identidade da linha: precisa de tudo o que muda a cobrança. Os totais dependem de leituras assíncronas e invalidariam o pedido de forma espúria enquanto carregam. Um superconjunto dos campos crus não copia a regra do `itemKey`. | `cartFingerprint.ts`; quem precisar do mesmo conceito no futuro |
| 3 | A comparação roda num `useEffect` da página, que depende da impressão (na montagem e quando a sacola muda com a página aberta). Não acrescentei nada no `handleConfirm`. | Checar também no `handleConfirm` via `isStale(cart)`. | Duas guardas se mascaram uma à outra: remover qualquer uma deixaria a suíte verde. O efeito já dispara antes de qualquer toque. | `CheckoutPage.tsx` |
| 4 | Oferta desmarcada só quando o pedido em curso é de outra sacola. Com a mesma sacola ela segue marcada. Sem pedido em curso, ela continua sendo a escolha da cliente nesta sessão de checkout. | Desmarcar a cada montagem. Desmarcar sempre que a sacola muda, mesmo sem pedido. | O critério de aceite fala de "checkout novo" depois de um pedido fechado. Desmarcar sem pedido apagaria uma escolha da compra que ainda está em curso. | `CheckoutPage.tsx` |
| 5 | `setOrder` ganhou um 4º parâmetro opcional, `cart`, com padrão `null`. `orderCart` é persistido e zerado por `invalidateOrder`/`reset`. O `ProposalCheckoutPage` não muda: não passa o parâmetro, não tem o efeito e fica com `null`. | Tornar o parâmetro obrigatório. | Menor superfície; `/pedido-montado` não decide sacola. | `checkoutStore.ts`, os chamadores de `setOrder` |
| 6 | Um pedido persistido antes do deploy fica com `orderCart` nulo, e na primeira volta ao checkout ele é descartado (a oferta é desmarcada). | Tratar o nulo como "mesma sacola". | Errar para o lado de criar um pedido novo é o mais seguro para o caso "valor exibido = valor cobrado" (RNF-01). O custo é no máximo um `pending` órfão por aba aberta no deploy. | sessões de checkout abertas no dia do deploy |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Com um PIX pendente e a sacola trocada (peças, quantidade ou cupom), pagar cria o pedido da sacola nova (BUG-001) | página real | `CheckoutPage.test.tsx` › "o pedido em curso é da sacola que o criou": "com a sacola trocada…", "trocar só a quantidade…", "trocar o cupom…" | sim | — (vermelho antes do conserto: abria `order-1`) |
| 1b | Mesma sacola: voltar e pagar reabre o pedido em curso (par inverso) | página real | "com a MESMA sacola, voltar e pagar reabre o pedido em curso — o par inverso" | sim | vermelho (mutação "invalida sempre que há pedido") |
| 2 | A oferta marcada no pedido anterior aparece desmarcada no checkout da sacola nova, e o pedido novo não a leva (BUG-002) | página real | "a oferta do checkout › marcada no pedido anterior, aparece desmarcada…" | sim | — (vermelho antes do conserto: `aria-checked="true"`) |
| 2b | Mesma sacola: a oferta marcada continua marcada (par inverso) | página real | "a oferta do checkout › com a MESMA sacola, a oferta marcada continua marcada" | sim | vermelho (mesma mutação) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

apps/store/src/features/checkout/lib/cartFingerprint.ts — criado
apps/store/src/features/checkout/model/checkoutStore.ts — alterado
apps/store/src/pages/CheckoutPage.tsx — alterado
apps/store/src/pages/__tests__/CheckoutPage.test.tsx — alterado

## Verificação

- `pnpm exec vitest run src/pages/__tests__/CheckoutPage.test.tsx -t 'sacola que o criou' --testTimeout=20000` (PROJECT.md › Comandos de verificação). Antes do conserto: 4 reprovados, 2 verdes (os pares). Depois: 6/6. Com a mutação: 2 reprovados (os pares). Restaurado pela cópia, conferido com `cmp`.
- Os arquivos de teste tocados ou vizinhos: `CheckoutPage.test.tsx`, `checkoutStore.test.ts`, `checkoutStoreInstancia.test.tsx`, `ProposalCheckoutPage.test.tsx`, `checkoutSobreviveAVoltaDaAba.test.tsx`, `compreJuntoSacolaECheckout.test.tsx`. 237/241 na primeira rodada. Os 4 reprovados eram de `compreJuntoSacolaECheckout` (a linha da peça, `summary-item-price`), que é da tarefa 10 em paralelo. Na suíte completa, logo depois, passaram.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): exit 0, 0 erros. Comparei contra o baseline do CLAUDE.md (store 0), não contra uma medição feita antes da primeira fatia: não houve baseline dado nem medido. Não mudou contra ele.
- `npx eslint` nos 4 arquivos tocados: exit 0.
- Verificação mínima, `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines), rodada duas vezes: **371/371 arquivos e 6987/6987 testes verdes** nas duas. Mesmo assim o exit foi 1 nas duas, por 1 "Unhandled Error: [vitest-worker]: Timeout calling onTaskUpdate". É contenção do RPC do vitest com as tarefas em paralelo na mesma máquina: nenhum teste reprovou e o comando terminou sozinho em ~150 s. Fica sem o "exit 0" estrito, e por isso não declaro esta verificação como fechada.

Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines (do contexto); packages/core/CLAUDE.md (inteiro); apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- A causa mora em `CheckoutPage.tsx` e `checkoutStore.ts`, os dois listados no Contrato. Acrescentei um arquivo novo, `features/checkout/lib/cartFingerprint.ts`. `OrderBump.tsx` não precisou mudar.
- A verificação mínima saiu com exit 1 por um erro de RPC do vitest sob contenção, com todos os testes verdes (ver Verificação).
- Sem baseline de tipos medido antes da primeira fatia: comparei contra o 0 do CLAUDE.md.
- No dublê de `useProductById`, `mockReturnValue` devolve o produto para qualquer id, inclusive `null`, e assim o pedido levaria a oferta mesmo desmarcada. No bloco novo, troquei por `mockImplementation`, que só devolve produto para `bump-1`. Os testes antigos continuam com o dublê cego.
- Há um defeito vizinho, fora do escopo e não consertado: a `OrderPaymentPage` esvazia a sacola quando o pedido aprovado bate com o `orderId` do checkoutStore (`PIX-P1-08`). Se a cliente troca a sacola, não volta ao checkout e paga o pedido antigo por `/conta`, o `orderId` ainda é o antigo, e a sacola nova é esvaziada. O conserto daqui só age quando o checkout monta.
- O "5 ITENS / 3 linhas" do BUG-002 (o subtotal com a oferta escondida) some com a oferta desmarcada. Não investiguei se a linha da oferta deixa de aparecer em "Seu pedido" em outros casos: isso parece ser da tarefa 10/BUG-003.
- Propagação: nenhuma tarefa seguinte (10–18) afirma nada sobre `setOrder`, `checkoutStore` ou `bumpChecked`.
- Infraestrutura: nada. Tudo é jsdom, sem ambiente local.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 09
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, por seção), packages/core/CLAUDE.md, apps/store/CLAUDE.md (por seção), .specs/LESSONS.md (L-013..L-015), .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: BUG-001 — apps/store/src/pages/__tests__/CheckoutPage.test.tsx › "o pedido em curso é da sacola que o criou" (sacola trocada, só a quantidade, só o cupom, e o par da mesma sacola); BUG-002 — mesmo arquivo › "a oferta do checkout" (desmarcada na sacola nova e fora do pedido, e o par da mesma sacola). Sem lacuna de cobertura nos dois bugs; a persistência de `orderCart` no reload não tem teste próprio.
Verificações: testes do bloco vermelhos antes e 6/6 depois; mutação "invalida sempre" derruba os 2 pares; tsc store 0 erros; eslint dos 4 arquivos 0; suíte da loja 6987/6987 e 371/371 verdes, mas exit 1 por um "Timeout calling onTaskUpdate" do vitest sob contenção (2 de 2 rodadas)
Árvore de trabalho: criado apps/store/src/features/checkout/lib/cartFingerprint.ts; alterados apps/store/src/features/checkout/model/checkoutStore.ts, apps/store/src/pages/CheckoutPage.tsx, apps/store/src/pages/__tests__/CheckoutPage.test.tsx; nada commitado
Citações conferidas: 3 (os três arquivos do Contrato); nenhuma deslocada, nenhuma morta
```

## T10 — wi-impl-review · done · agente ac892b8fe5be16bbe

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/10-bugs-3-8-linha-da-peca-de-por.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a reprodução de BUG-003 dá o Esperado, provada por teste que reprovou antes | `buyTogetherPricing.ts` (`buyTogetherLineFacts` passa a somar `unitPrice × quantity` das `ChargedLine` de `resolveOrderLines`, e `mixed` conta as unidades cobradas a preço cheio); `useCartPromotion.ts` expõe `orderLines`; `CartDrawer.tsx:231` e `OrderSummary.tsx:110` passam esse valor. Teste: `compreJuntoSacolaECheckout.test.tsx`, bloco "a linha da peça mostra o preço COBRADO…" (promoção: 158 → 110,60, sem "a preço cheio", Total 410,60, na gaveta e no resumo; oferta: 79 → 63,20 com "Acompanha") | sim. O vermelho antes do conserto só a execução mostra |
| a reprodução de BUG-008 dá o Esperado, provada por teste que reprovou antes | `CartDrawerRow.tsx`, `OrderSummary.tsx` e `OrderItemsSummary.tsx`: um `sr-only` com "de {cheio} por {cobrado}" e o par visível com `aria-hidden`. Testes: `compreJuntoSacolaECheckout.test.tsx` ("o leitor de tela ouve…", gaveta e resumo) e `OrderItemsSummary.test.tsx` (o pedido) | sim. O vermelho antes, só execução |
| cada comportamento do bloco `Testes` coberto por teste escrito | os dois testes acima | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Os itens de `Não faça` foram conferidos:
- O diff não toca `packages/core/src/payment/**`: `git diff --stat` vem vazio.
- Nenhum arquivo de `qa/issues/` está em `alterados`.
- Nenhum bug de outra tarefa foi corrigido.
- A Adesão não foi tocada.

## Testes

- **BUG-003 (promoção vence o casado)**, em `apps/store/src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx`, pela página real com a gaveta e o resumo. A asserção morde:
  - exige o "por" 110,60 e recusa o 150,10 do casado (o valor do caminho antigo, com `line.total`);
  - recusa "a preço cheio", que o caminho antigo produzia ("1 com desconto, 1 a preço cheio");
  - exige o Total.
  O caso vizinho exige a frase exatamente `^Acompanha o X$`, e com isso recusa o "· 10% a menos" antigo.
- **BUG-003 (oferta vence)**, no mesmo arquivo. A asserção morde: antes, com `line.discount = 0`, a linha caía em `NO_FACTS`, sem `summary-item-price` de/por e sem `summary-item-compre-junto`. O teste exige os dois.
- **BUG-008 (gaveta e resumo)**, no mesmo arquivo. A asserção morde: exige o texto inteiro "de R$ 79,00 por R$ 71,10" num nó com a classe `sr-only` e `aria-hidden="true"` no par visível. Nada disso existia antes.
- **BUG-008 (pedido)**, em `apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx`. A asserção morde do mesmo jeito, e tem o inverso: a linha sem desconto não ganha a frase.
- O caso "pingente × 2" do Observado do BUG-003 não tem teste próprio. Ele passa pelo mesmo caminho de código e não é um comportamento separado do bloco `Testes`, então não é achado.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | a causa está na loja; `buyTogetherLineFacts` lê o cobrado de `resolveOrderLines` (parâmetro `charged`) | sim | `BuyTogetherLinePricing.total` está documentado em `pricing.ts:465` como "o total da linha com o casado". O preço que vale é o de `ChargedLine.unitPrice` ("o menor entre o bump, o desconto casado e a faixa"), então a causa não está em `payment/**` | sim: os únicos chamadores são `CartDrawer.tsx:230` e `OrderSummary.tsx:106` |
| 2 | `useCartPromotion` expõe `orderLines`; o checkout já o tinha | sim | `useCheckoutTotals.ts:95/216` já expunha `orderLines` de `resolveOrderLines`. A gaveta usa a mesma `input` para as duas chamadas | sim: o campo é aditivo, e `charged ?? []` cobre dublês que não o tragam. As tarefas 12 e 16 citam os mesmos arquivos, mas nada que a assinatura nova contradiga |
| 3 | o "de/por" é cheio × qtd → cobrado, só quando o cobrado é menor | sim | o Esperado do BUG-003 e o CA-02.4/CA-03.5 citados pela tarefa | sim |
| 4 | "· N% a menos" só quando alguma unidade é cobrada pelo preço do casado | sim | o Esperado do BUG-003 ("a linha não diz…"). A comparação é contra `BuyTogetherSegment.unitPrice` (`cartDiscount.ts:52`) | sim |
| 5 | "N com desconto, M a preço cheio" conta as unidades cobradas a preço cheio | sim | o Observado e o Esperado do BUG-003 | sim |
| 6 | linha com Compre Junto em que a oferta vence leva "Acompanha o X" | sim | a ocorrência da Veneziana no BUG-003 (sem "de/por" nem "Acompanha") | sim |
| 7 | BUG-008 segue o padrão do `AddonPrice`: `sr-only` "de … por …" e par `aria-hidden`, com o `testid` no par visível | sim | `apps/store/src/entities/product/ui/buy-together/AddonPrice.tsx:37-41` usa exatamente essa forma | sim: os três trechos de JSX declarados |

## Não conferido

- **Execução.** Não confiro aqui: os testes passarem, o vermelho antes do conserto, o `tsc` e o lint. Também não confiro se outros testes que leem `CartPromotion` por igualdade (ex.: `useCartPromotion.test.ts`, onde `NO_PROMOTION` ganhou `orderLines: []`) seguem verdes.
- **Diff dos alterados.** Os oito arquivos de `alterados` aparecem como `M` no `git status`, e o diff foi lido contra a baseline. Não houve arquivo sem intent-to-add. A árvore tem trabalho de outras tarefas da onda; nenhuma mudança nos alterados ficou sem explicação por esta tarefa.

Instruções lidas:
- `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (raiz, no contexto: O "defeito 01", Alias de import, Convenções, Os guardas, Baselines)
- `apps/store/CLAUDE.md` › O bloco Compre Junto (WI-01), O botão único leva o conjunto (WI-01), Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha" (WI-01)

Não li:
- `packages/core/CLAUDE.md`, `apps/store/CLAUDE.md` › Minha conta e o detalhe do pedido, e `.specs/LESSONS.md` › L-013..L-015. Nenhuma linha deles foi usada para julgar o diff, e nenhum achado depende deles.

## T11 — wi-impl-task · review · agente a4735eb7bb1e90e1a

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/11-bugs-7-10-app-bloco-de-valores.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A causa de BUG-007 estava fora de `BlocoValores.tsx`: a view `order_list`, que é o que o app lê, nunca expôs `orders.manual_discount` (da feature 89), então o app não sabia que o desconto existia. Criei a migration nova `20261107170000_pedido-montado-desconto-na-lista-de-pedidos.sql`, que recria a view com `manual_discount` como última coluna, e o detalhe passou a pedir essa coluna | Uma sexta leitura de `orders` só para essa coluna dentro de `lerComPapel` | Já há precedente no repositório: a T07 fez a mesma coisa para `buy_together_discount`/`order_bump_discount`. A leitura extra obrigaria cada dublê de teste do app a servir `orders` | Ordem de publicação: migration → bundle do app. Sem a coluna na view, a leitura do detalhe falha inteira |
| 2 | A linha sai como "Desconto combinado", sem o motivo ("— Cliente antiga") | Mostrar o motivo | O motivo fica em `order_proposals`, que tem RLS ligada, nenhuma policy e `revoke` de `authenticated` (SEG-05). Só a edge function `order-proposals` o lê, e o app é proibido de chamar `functions.invoke` (`escritaSoPelaPorta`). Trazer o motivo exigiria uma porta nova de leitura (RPC security definer ou uma emenda ao guarda), o que vai além desta tarefa. O próprio painel usa essa mesma frase quando não tem o motivo (`ManualDiscountRow`) | O reteste do BUG-007 pode marcar como parcial: as linhas fecham com o Total, mas o motivo não aparece. Fica para decisão de produto |
| 3 | A ordem do painel mora na tela (`BlocoValores`), igual ao `AdminOrderPage`: descontos sem PIX → combinado → PIX → Frete → Total | Pôr a linha `manual` e a ordem dentro de `orderSummary` (`core/orders`) | O painel desenha o combinado à parte; com a linha dentro de `core`, o painel mostraria a linha duas vezes. A loja e o e-mail, que estão em edição nas tarefas paralelas 09/10/14/16/17, também mudariam | A posição do combinado fica escrita em dois lugares: painel e app |
| 4 | O rótulo `'Desconto combinado'` virou uma constante local do `BlocoValores` | Importar `MANUAL_DISCOUNT_LABEL` do painel ou criá-lo em `core` | O app não importa do painel. Criar em `core` exigiria mexer na loja e no painel, fora do escopo. A frase já existe em duas cópias (loja e painel) | É a terceira escrita da mesma frase: se mudar num lugar, os outros não acompanham |
| 5 | Mudei para a ordem D-38 as asserções de ordem que a T07 tinha escrito (o Frete passou para depois dos descontos) em `pedidoDescontoCompreJunto.test.tsx`. Também troquei a âncora de `usePedido.test.tsx` para as três últimas colunas da view | Manter a ordem antiga | D-38 revisa a D-36. A âncora ficou mais estrita, não mais frouxa | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | BUG-007: o pedido montado mostra "Desconto combinado − R$ 20,00" antes do PIX e as linhas fecham com o Total (números do #0220); a linha sai também com os itens em falha; o pedido da loja não tem a linha | página real (`<App />` sobre o dublê que só devolve as colunas pedidas) | `apps/mobile-adm/src/pages/__tests__/pedidoDescontoCompreJunto.test.tsx` › "o bloco de valores na ordem e com a composição do painel" | sim | — (vermelho antes do conserto; o caso inverso, que passou de primeira, foi mutado com `combinado >= 0` → vermelho; tirar `manual_discount` de `COLUNAS_DO_DETALHE` → vermelho; os dois restaurados com `cmp`) |
| 2 | BUG-010: Subtotal · Compre Junto · Cupom · PIX · Frete · Total | página real | mesmo arquivo › "o Frete vem depois dos descontos…" | sim | — (vermelho antes do conserto) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

apps/mobile-adm/src/widgets/order-detail/ui/BlocoValores.tsx alterado
apps/mobile-adm/src/entities/order/model/linha.ts alterado
apps/mobile-adm/src/test/pedidos.ts alterado
apps/mobile-adm/src/pages/__tests__/pedidoDescontoCompreJunto.test.tsx alterado
apps/mobile-adm/src/entities/order/api/__tests__/usePedido.test.tsx alterado
supabase/migrations/20261107170000_pedido-montado-desconto-na-lista-de-pedidos.sql criado

## Verificação

- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/pages/__tests__/pedidoDescontoCompreJunto.test.tsx --testTimeout=20000` (PROJECT.md): vermelho antes do conserto (3 falhas); verde depois, 9/9.
- O mesmo comando com `src/widgets/order-detail` e `src/pages/__tests__/PedidoPage.test.tsx`: 103/103.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md §Comandos): 0 erros. A baseline era 0, nada mudou.
- `npx eslint` nos arquivos tocados do app: 0/0.
- Suíte do mobile-adm, `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` (CLAUDE.md §Baselines): na primeira volta, 1 falha minha (a âncora de colunas em `usePedido.test.tsx`), já corrigida; na segunda volta, **2375/149, exit 0**.
- Suíte da loja nos guardas que leem as migrations e os apps (`src/shared/lib/__tests__` e `src/app/__tests__`, 126 arquivos): 3030/3030. A primeira volta saiu com exit 1 por `Timeout calling "onTaskUpdate"` do worker (contenção com as tarefas paralelas), sem nenhuma falha de asserção; a segunda saiu com exit 0.
- Ambiente local: `supabase status` mostra o banco de pé. A view foi aplicada no Postgres local (54442) com `psql -f` da migration (detalhe em Divergências). Probe direto: `order_list` devolve o #0220 com `manual_discount` 20,00 e subtotal, cupom, PIX, frete e total iguais aos do bug; a view continua `security_invoker`.
- Probe `.specs/features/74-mobile-adm-pedidos/probes/02-lista.sh` (Supabase local): exit 0, "TUDO OK", 50 `ok —`. Ele lê o esperado de `linha.ts`, então a coluna nova é conferida sem editar o probe. O banco foi restaurado (96 pedidos antes e depois).

Instruções lidas: CLAUDE.md › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines (do contexto); packages/core/CLAUDE.md (pelo índice e as seções de orders/proposals); apps/mobile-adm/CLAUDE.md (em trechos: detalhe do pedido, ações, guardas); .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- A causa de BUG-007 está fora do arquivo do Contrato: é a view `order_list` (migration nova) e `COLUNAS_DO_DETALHE`. O defeito vem de antes do WI: o app nunca mostrou o desconto combinado da feature 89.
- O motivo do desconto combinado não aparece no app (premissa 2). O Esperado do BUG-007 cita "— Cliente antiga", e só a function de admin chega a esse texto.
- **Migration aplicada no local por `psql -f`, e não por `supabase migration up --local`.** O comando declarado recusou com `MigrationMissingLocalError`: o banco local tem `20261108120000`/`20261109120000` (as da feature 95, da `master`), e elas não existem nesta worktree. Não rodei `migration repair`, porque mexeria no histórico de outra frente. A migration é um único `create or replace view`, idempotente, em 127.0.0.1:54442. Ela **não** foi registrada em `supabase_migrations.schema_migrations`: um `migration up` futuro vai reaplicá-la sem efeito colateral.
- O mobile-adm CLAUDE.md (38 KB) foi lido em trechos, não inteiro.
- O arquivo de saída sugerido (`$TMPDIR/wi-impl-saida.txt`) é compartilhado com as tarefas paralelas e foi sobrescrito por uma delas no meio da medição. Passei a gravar no scratchpad próprio desta tarefa.
- Caducou: T07 (07-app-do-atelie-detalhe-do-pedido.md, fechada), linha 24: "no bloco de valores, Subtotal (cheio) e uma linha por desconto, Frete e Total" e os testes dela com o Frete logo abaixo do Subtotal. A D-38 tornou essa ordem falsa: o Frete vem depois dos descontos. O arquivo da T07 não foi reescrito.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 11
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; packages/core/CLAUDE.md; apps/mobile-adm/CLAUDE.md; .specs/LESSONS.md › L-013, L-014, L-015
Testes escritos: BUG-007 — apps/mobile-adm/src/pages/__tests__/pedidoDescontoCompreJunto.test.tsx (três casos: a linha "Desconto combinado − R$ 20,00" antes do PIX com as linhas fechando no Total do #0220; a linha também com os itens em falha; o inverso sem desconto). BUG-010 — o mesmo arquivo (Subtotal · Compre Junto · Cupom · PIX · Frete · Total). Sem cobertura: o motivo do desconto combinado, que o app não consegue ler (order_proposals sem policy; o app não chama functions)
Verificações: tsc mobile-adm 0; eslint 0/0; suíte mobile-adm 2375/149 exit 0; guardas da loja 3030/126 exit 0 (a 1ª volta parou no timeout de RPC do worker, por contenção); probe 74/02-lista.sh no local: TUDO OK, 50 ok; a view conferida no Postgres local (#0220 com manual_discount 20,00)
Árvore de trabalho: BlocoValores.tsx, entities/order/model/linha.ts, test/pedidos.ts, pedidoDescontoCompreJunto.test.tsx, usePedido.test.tsx (apps/mobile-adm); supabase/migrations/20261107170000_pedido-montado-desconto-na-lista-de-pedidos.sql (nova, aplicada só no local, via psql)
Citações conferidas: 1 (BlocoValores.tsx, no lugar citado); nenhuma deslocada ou morta
Caducou: T07 · "no bloco de valores, Subtotal (cheio) e uma linha por desconto, Frete e Total" (o Frete logo abaixo do Subtotal) · a D-38 põe o Frete depois dos descontos
```

## T09 — wi-impl-review · done · agente ad2cf8038cd3fde50

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/09-bugs-1-2-checkout-estado-anterior.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| nada | | | | | |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a reprodução de BUG-001 dá o Esperado, provado por um teste que reprovou antes do conserto | `CheckoutPage.tsx`: o efeito sobre `sacola` (`cartFingerprint` comparada com `orderCart`; quando divergem, `invalidateOrder`) e `setOrder(..., sacola)`. Teste em `CheckoutPage.test.tsx`, "com a sacola trocada depois do pedido PIX, pagar cria o pedido da sacola nova" (segunda chamada de `create-order` com `['p2']`, rota `order-2`), mais as variantes de quantidade e de cupom | sim (o vermelho anterior é só execução) |
| a reprodução de BUG-002 dá o Esperado, provado por um teste que reprovou antes do conserto | o mesmo efeito chama `toggleBump(false)`. Teste "marcada no pedido anterior, aparece desmarcada no checkout da sacola nova": confere `aria-checked="false"`, `bumpChecked` falso e que o pedido leva só `p2` | sim (o vermelho anterior é só execução) |
| cada comportamento do bloco `Testes` coberto por um teste escrito | o novo `describe` "o pedido em curso é da sacola que o criou", com 6 casos, incluindo os dois pares inversos (mesma sacola) | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`.

## Testes

- **BUG-001**: `apps/store/src/pages/__tests__/CheckoutPage.test.tsx`, os três casos de sacola trocada (peças, quantidade, cupom). A asserção morde. Sem o conserto, `isOrderStale` não enxerga a troca de peças, o CTA reaproveita o `order-1` e `createOrderMutateAsync` fica com 1 chamada em vez de 2. O caso das peças confere ainda os `product_id` da segunda chamada. O par inverso (mesma sacola reabre o `order-1` com 1 chamada) derruba a saída mais fácil, que seria invalidar a cada montagem.
- **BUG-002**: o mesmo arquivo, o `describe` "a oferta do checkout". A asserção morde. Sem o conserto, `bumpChecked` continua `true` no store da aba, e o teste o confere no DOM (`aria-checked`) e no store. Os itens do pedido seguinte são conferidos sem a oferta. O par inverso exige que a oferta continue marcada com a mesma sacola.
- O nível é o de página real, com o `CheckoutPage` montado. Bate com o bloco `Testes`, que pede página quando o defeito é de fiação.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Guardar a impressão da sacola no pedido (`orderCart`) e invalidar por efeito na página, fora de `core/checkout` | sim | `packages/core/CLAUDE.md`: "Não pertence: … regra com um consumidor só que ninguém prevê duplicar". Só `/checkout` decide sacola; `/pedido-montado` usa outra instância do store. Há caso análogo na mesma página: a guarda de `orderIdentity` (IDN-07) também é um efeito em `CheckoutPage.tsx:276` | sim. Só `CheckoutPage.tsx` e `checkoutStore.ts` mudam de comportamento |
| 2 | `cartFingerprint(items, couponCode)` com produto, variação, size/finish, gravação, quantidade, `unitPrice`, as marcas `accompanies` e o cupom, sem depender da ordem | sim | Os campos batem com `CartItem` (`entities/cart/model/cartStore.ts:43-77`; `accompanies` é array). A função não reescreve o `itemKey`. A sacola e o cupom hidratam de `localStorage` de forma síncrona, então não há troca espúria na montagem | sim |
| 3 | Só o efeito da página, sem uma segunda guarda no `handleConfirm` | sim | `handleConfirm` mantém `isStale()` para o rascunho. A sacola só é checada no efeito, que roda depois do commit e antes de qualquer toque. Nada no arquivo de instruções pede as duas guardas | sim |
| 4 | Desmarcar a oferta só quando o pedido em curso é de outra sacola | sim | O Esperado de BUG-002 é "num checkout novo" depois de um pedido fechado. Quando o PIX é pago, `OrderPaymentPage.tsx:112` chama `reset()`, que já zera `bumpChecked` | sim |
| 5 | Quarto parâmetro opcional `cart` em `setOrder`, com padrão `null`; `orderCart` persistido e zerado em `invalidateOrder`/`reset` | sim | Há uma única chamada que passa a impressão, no `CheckoutPage`. A proposta não muda, e isso bate com "checkoutStore é por instância" (`apps/store/CLAUDE.md`, pedido montado) | sim |
| 6 | Pedido de antes do deploy, com `orderCart` nulo, é descartado na volta ao checkout | sim | Fica do lado de RNF-01 (o valor exibido é o cobrado). O custo declarado, no máximo um `pending` órfão por aba, é coerente | sim. As sessões abertas no deploy estão declaradas |

## Não conferido

- **Execução**: não rodei testes, `tsc` nem lint. O vermelho anterior ao conserto e o verde atual são só execução.
- **Comentário antigo fora do lugar**: o JSDoc "Feature `58` — o clique no CTA troca a tela…" (`CheckoutPage.test.tsx:1970-1977`) fica acima do `describe` novo. Já estava acima de um `describe` alheio em HEAD, então vem de tarefa anterior e não entra como achado.
- **Layout**: o comportamento em navegador real (390 e 1440) é da Validation/QA.
- **Baseline do diff**: `cartFingerprint.ts` aparece com `A` (intent-to-add) e tem baseline de diff. Os outros três aparecem com `M`, então nada ficou sem baseline.

Instruções lidas: `CLAUDE.md` (raiz, no contexto: O "defeito 01", Alias de import, Convenções, Os guardas, Baselines); `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, Pureza, Os módulos (as linhas 1-60 e as ocorrências de `checkout`, não o arquivo inteiro); `apps/store/CLAUDE.md` › Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", O pedido montado. Não li `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Minha conta, nem `.specs/LESSONS.md` › L-013..L-015.

## T11 — wi-impl-review · fixing · agente afca59ce88e2d5b69

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/11-bugs-7-10-app-bloco-de-valores.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | critério descoberto | atrapalha | apps/mobile-adm/src/widgets/order-detail/ui/BlocoValores.tsx:12 (a constante `DESCONTO_COMBINADO`) e :72 (a linha `desconto="manual"`) | A linha sai como "Desconto combinado − R$ 20,00", sem o motivo. O implementador declarou isso (premissa 2), e a restrição que ele cita é real: `order_proposals` tem `revoke all … from authenticated` (`20261103120000_89-pedido-montado.sql:158`), e o guarda `escritaSoPelaPorta` só aceita `functions.invoke` na porta dos avisos. Mesmo assim, o Esperado do bug pede o motivo, e esta tarefa não o entrega. Dei `atrapalha` porque o dano que o bug descreve ("as linhas não fecham com o Total") está corrigido e nenhum valor sai errado. Mostrar o motivo pede uma porta de leitura nova, que é decisão de produto e de arquitetura. A correção possível dentro desta rodada é deixar essa decisão registrada e escalada, não escrever código | BUG-007 › Esperado: "As mesmas linhas de desconto do painel, inclusive \"Desconto combinado — Cliente antiga − R$ 20,00\", e as linhas fechando com o Total." · Pronto quando: "a reprodução de BUG-007 dá o **Esperado** do bug" |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a reprodução de BUG-007 dá o Esperado, provado por um teste que reprovou antes | `BlocoValores.tsx:60-72` (a linha do combinado antes do PIX), `linha.ts:29-31` e `:99-100` (a coluna `manual_discount`), a migration `20261107170000` (a coluna na view); o teste está em `pedidoDescontoCompreJunto.test.tsx:181-193` | parcial: as linhas fecham com R$ 901,86 e a linha existe, mas sem o motivo (achado 1). Se o teste reprovou antes, só a execução mostra |
| a reprodução de BUG-010 dá o Esperado, provado por um teste que reprovou antes | `BlocoValores.tsx:67-74`, que põe o Frete depois dos descontos e do PIX; o teste está em `pedidoDescontoCompreJunto.test.tsx:207-222`, com Subtotal · Compre Junto · Cupom · PIX · Frete · Total | sim. Se reprovou antes, só a execução mostra |
| cada comportamento do bloco Testes coberto por um teste escrito | os dois `describe`/`it` novos em `pedidoDescontoCompreJunto.test.tsx` | sim |
| testes dos arquivos alterados, passando | — | só execução |
| a verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Os itens de `Não faça` foram respeitados: nenhum arquivo de `qa/issues/`, nenhum outro bug, nada da Adesão e nada de `packages/core/src/payment/**` entre os alterados.

## Testes

- BUG-007: `apps/mobile-adm/src/pages/__tests__/pedidoDescontoCompreJunto.test.tsx`, o caso "o pedido montado com desconto combinado mostra a linha dele antes do PIX…". A asserção morde: é um `toEqual` sobre a lista inteira de linhas, com a ordem e o texto, e passa pela página real com o dublê do client. Sem a linha, ou com ela fora do lugar, o caso reprova. Há dois vizinhos: com `manual_discount: 0` nenhuma linha "combinado" aparece (é o inverso, e também morde), e com a leitura de itens em falha a linha continua lá.
- BUG-010: o mesmo arquivo, o caso "o Frete vem depois dos descontos…", também com `toEqual` sobre a ordem inteira, e morde. Os três casos da T07 foram reescritos para a ordem D-38. A asserção ficou mais estrita, não mais frouxa.
- `usePedido.test.tsx`: a âncora passou a pedir as três últimas colunas, terminando em `manual_discount`, e é mais estrita que a anterior.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Expor `manual_discount` pela view `order_list` numa migration nova | sim | A lista de colunas é byte a byte a da `20261107160000` (a precedente da T07), com a coluna nova no fim. Segue `security_invoker`, sem `grant` e sem escrita. `envelopeSchema.test.ts` lê só a migration da `82` (`LIMPO`), então não é afetado | sim: a ordem é migration → bundle. A migration é nova e, pela regra da raiz, não vai à `master` sem pergunta. Isso é da publicação, não da tarefa |
| 2 | Linha sem o motivo | sim, como restrição | O `revoke` em `order_proposals` e o guarda `escritaSoPelaPorta` impedem ler o motivo daqui. Mesmo assim, o critério fica parcialmente descoberto (achado 1) | sim, o reteste parcial está declarado |
| 3 | A ordem mora na tela, como no `AdminOrderPage` | sim | `AdminOrderPage.tsx:324-325` e `:754-764` usam o mesmo filtro `descontosAntesDoPix`/`descontoPix` e a mesma posição do combinado. A diferença é só a condição: o painel exige `proposal_id && descontoCombinado > 0`, e o app só `manual_discount > 0`. Na prática, só o pedido montado tem `manual_discount` | sim |
| 4 | O rótulo como constante local | sim (empate) | O app não importa do painel, e não há guarda nem regra escrita para esse rótulo. A terceira cópia está declarada | sim |
| 5 | A ordem D-38 nos testes da T07, e a âncora com três colunas | sim | A D-38 revisa a D-36, como a tarefa diz | sim |

## Não conferido

- Nenhum dos alterados aparece como `??`: a migration está como `A` (intent-to-add), e o diff alcançou todos.
- Não confirmei, porque só a execução mostra, que os testes novos reprovaram antes do conserto nem que a suíte do mobile-adm e a da loja passam.
- O probe `02`, que confere as fixturas contra o PostgREST, não foi rodado. É execução.
- Instruções lidas: `CLAUDE.md` (raiz), pelo contexto e por inteiro; `apps/mobile-adm/CLAUDE.md`, nos trechos do detalhe do pedido e do arnês (linhas 236-262 e 625-640), mais uma busca por `order_list`/`Valores`/`migration`; `packages/core/CLAUDE.md`, só pelo índice de títulos; `.specs/LESSONS.md` › L-013, L-014 e L-015 não foram lidas.

## T11 — wi-impl-task · done · agente a4735eb7bb1e90e1a

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/11-bugs-7-10-app-bloco-de-valores.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 2 (revista) | A linha continua "Desconto combinado − R$ 20,00", sem o motivo. **Fica registrado que o BUG-007 está atendido só em parte**: as linhas fecham com o Total, mas o motivo ("— Cliente antiga") que o Esperado pede não aparece. A decisão de criar uma porta de leitura sobe ao humano como pendência de produto e arquitetura. Opções: (a) uma RPC `security definer` com `has_role` que devolva o motivo do pedido e entre na allowlist de `rpc(` do app e na lista literal de `marcacaoSoPorAcao`; (b) a function `order-proposals?action=get` liberada ao app, emendando o guarda `escritaSoPelaPorta`; (c) aceitar a linha sem motivo no app e emendar o Esperado do bug | Abrir a porta de leitura nesta rodada | `order_proposals` tem RLS sem policy e `revoke all … from authenticated` (`20261103120000_89-pedido-montado.sql:158`, SEG-05). O app só chama `functions.invoke` na porta dos avisos (`escritaSoPelaPorta`). Abrir a porta é decisão de arquitetura e de segurança, fora do Contrato desta tarefa, e o achado manda escalar em vez de escrever código | O reteste do BUG-007 vai achar o motivo ausente. O bug não fecha como `verified` sem uma das opções (a)/(b)/(c). Se a escolha for (a) ou (b), o trabalho novo pertence a uma tarefa nova |

## Fatias

nada

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

A correção não alterou nenhum arquivo. Lista completa da tarefa (implementação):
apps/mobile-adm/src/widgets/order-detail/ui/BlocoValores.tsx alterado
apps/mobile-adm/src/entities/order/model/linha.ts alterado
apps/mobile-adm/src/test/pedidos.ts alterado
apps/mobile-adm/src/pages/__tests__/pedidoDescontoCompreJunto.test.tsx alterado
apps/mobile-adm/src/entities/order/api/__tests__/usePedido.test.tsx alterado
supabase/migrations/20261107170000_pedido-montado-desconto-na-lista-de-pedidos.sql criado

## Verificação

nada (a correção não mudou código, então não houve verificação nova; a da implementação continua valendo)
Instruções lidas: as mesmas da implementação.

## Divergências e descobertas

- O Esperado do BUG-007 ("Desconto combinado — Cliente antiga − R$ 20,00") não é atingível no app sem uma porta de leitura nova até `order_proposals`. Isso foi escalado como pendência de decisão (premissa 2), com três opções. O dano do bug (as linhas não fechavam com o Total) está corrigido; só o motivo falta.

## Ao humano

nada. Concordo com o achado. A pendência de decisão que ele pede está na premissa 2 revista e em Divergências.

## O que devolver no fim

```
Tarefa: 11
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; packages/core/CLAUDE.md; apps/mobile-adm/CLAUDE.md; .specs/LESSONS.md › L-013, L-014, L-015
Testes escritos: BUG-007 — apps/mobile-adm/src/pages/__tests__/pedidoDescontoCompreJunto.test.tsx (a linha "Desconto combinado − R$ 20,00" antes do PIX com as linhas fechando no Total do #0220; a linha também com os itens em falha; o inverso sem desconto). BUG-010 — mesmo arquivo (Subtotal · Compre Junto · Cupom · PIX · Frete · Total). Sem cobertura: o MOTIVO do desconto combinado, que o app não lê (order_proposals sem policy, revoke de authenticated; o app não chama functions). Escalado como decisão de produto e arquitetura: RPC definer, function liberada ao app, ou emendar o Esperado
Verificações: tsc mobile-adm 0; eslint 0/0; suíte mobile-adm 2375/149 exit 0; guardas da loja 3030/126 exit 0 (a 1ª volta parou no timeout de RPC do worker, por contenção); probe 74/02-lista.sh no local: TUDO OK, 50 ok; a view conferida no Postgres local (#0220 com manual_discount 20,00). A correção não mudou código
Árvore de trabalho: BlocoValores.tsx, entities/order/model/linha.ts, test/pedidos.ts, pedidoDescontoCompreJunto.test.tsx, usePedido.test.tsx (apps/mobile-adm); supabase/migrations/20261107170000_pedido-montado-desconto-na-lista-de-pedidos.sql (nova, aplicada só no local, via psql)
Citações conferidas: 1 (BlocoValores.tsx, no lugar citado); nenhuma deslocada ou morta
Caducou: T07 · "no bloco de valores, Subtotal (cheio) e uma linha por desconto, Frete e Total" (o Frete logo abaixo do Subtotal) · a D-38 põe o Frete depois dos descontos
```

## T17 — wi-impl-task · review · agente a8d27d5547338803d

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/17-bug-12-ordem-dos-totais-do-email.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O pedido antigo (sem preço cheio) também passa a pôr o Frete depois do "Desconto". Nos dois casos a ordem é Subtotal, descontos, PIX, Frete, Total | Manter o Frete em 2º no pedido antigo | A D-38 vale para o e-mail inteiro ("descontos e PIX antes do Frete"), e um mesmo e-mail com duas ordens conforme a idade do pedido seria uma segunda regra | `layout.ts` (tabela HTML e versão em texto), todos os e-mails que mostram totais |
| 2 | Corrigi também a versão em texto puro do e-mail (`textBody`), não só a tabela HTML | Corrigir só o HTML | O mesmo e-mail sai nas duas formas. Mudar uma só deixaria as duas com ordens diferentes | `layout.ts` |
| 3 | Reescrevi as duas asserções de `render.test.ts` que fixavam a ordem antiga (Frete em 2º) | Deixar essas asserções e só acrescentar um teste novo | Elas codificavam a D-36, que a D-38 revisou. Não afrouxei nada: as listas continuam exatas (`toEqual`), só a ordem mudou para a esperada | `render.test.ts` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | No e-mail "Pedido recebido" com casado, cupom e PIX, os totais saem na ordem Subtotal, Compre Junto, Cupom, Desconto PIX, Frete, Total, em HTML e em texto | unidade (render da function) | `supabase/functions/send-notification/__tests__/render.test.ts`: "o pedido recebido com casado e cupom põe os descontos e o PIX antes do Frete, como o painel" e as duas asserções de ordem reescritas | sim | — (vermelho visto antes do conserto: 3 casos reprovaram) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

supabase/functions/send-notification/render/layout.ts — alterado
supabase/functions/send-notification/__tests__/render.test.ts — alterado

## Verificação

- `pnpm --filter @estrelinha/functions exec vitest run send-notification/__tests__/render.test.ts --testTimeout=20000` (fonte: `PROJECT.md` › Comandos de verificação). Antes do conserto: 3 reprovados, 205 passaram. Depois: 208 de 208, exit 0.
- Verificação mínima, a suíte do workspace tocado: `pnpm --filter @estrelinha/functions test --testTimeout=20000` (fonte: `CLAUDE.md` › Baselines e `PROJECT.md`). 1461 testes em 40 arquivos, exit 0, lido fora de pipe.
- Tipos: não se aplica. O workspace `supabase/functions` não tem projeto `tsc` na linha de tipos do `CLAUDE.md` (é Deno), e nenhum projeto com `tsc` foi tocado. Nada a comparar com o baseline.

Instruções lidas: `CLAUDE.md` (no contexto: › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines); `packages/core/CLAUDE.md` (inteiro); `supabase/CLAUDE.md` › Edge functions, › `send-notification` — o motor de notificação; `.specs/LESSONS.md` › L-013, L-014, L-015; `.specs/project/PROJECT.md` › Comandos de verificação.

## Divergências e descobertas

- A causa estava em `layout.ts`, como o contrato previa, e em dois lugares: `totalsTable` (a tabela HTML) e o bloco `totals` da versão em texto. Nada em `packages/core/src/payment/**` mudou.
- `supabase/CLAUDE.md` não tem seção própria chamada "e-mail". Li as partes que tratam do motor de e-mail: § `send-notification`. A seção § "O Resend tem DOIS usos" não li, porque fala de envio e não da renderização.
- A tarefa não trazia `caminho:linha` para conferir. A única citação, `render/layout.ts` no Contrato, estava no lugar.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 17
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz, nas seções citadas); packages/core/CLAUDE.md (inteiro); supabase/CLAUDE.md › Edge functions e › send-notification; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação
Testes escritos: o comportamento de BUG-012 em supabase/functions/send-notification/__tests__/render.test.ts. O caso novo "o pedido recebido com casado e cupom põe os descontos e o PIX antes do Frete, como o painel" mede a ordem no HTML e no texto. As duas asserções de ordem que existiam foram reescritas para a ordem da D-38. As três reprovaram antes do conserto. Nada ficou sem cobertura.
Verificações: render.test.ts 208/208 (antes do conserto, 3 vermelhos); suíte de functions 1461/40, exit 0. Tipos não se aplicam (Deno, nenhum projeto tsc tocado).
Árvore de trabalho: supabase/functions/send-notification/render/layout.ts e supabase/functions/send-notification/__tests__/render.test.ts. Nada commitado.
Citações conferidas: 1 (render/layout.ts, do Contrato), no lugar. Nenhuma deslocada nem morta.
```

## T17 — wi-impl-review · done · agente a90fd3ecfe37bf7b5

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/17-bug-12-ordem-dos-totais-do-email.md
Veredito: serve

Não achei nenhum defeito. O conserto põe as linhas de desconto antes do Frete nas duas formas do e-mail, a tabela HTML (`totalsTable`) e o texto puro (`textBody`). O teste novo prende exatamente a ordem que o bug pede.

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a reprodução de BUG-012 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto | `layout.ts` (`totalsTable`, por volta da linha 288, e `textBody`, por volta da linha 412: o laço de `summary.discounts` subiu para antes do Frete). `render.test.ts:935`: `order_received` com o desconto do Compre Junto, cupom e PIX. O teste exige a ordem exata com `toEqual` (Subtotal · Desconto do Compre Junto · Cupom · Desconto PIX · Frete · Total) e confere a mesma ordem no texto puro | sim. O vermelho antes do conserto só se vê executando; pela leitura, o código antigo dava o Frete em 2º e reprovaria |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `render.test.ts:935` | sim |
| testes dos arquivos alterados passando | — | só execução |
| a verificação mínima de fechar unidade de trabalho | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Do `Não faça`:
- `qa/issues/`: não tocado.
- Outro bug da rodada: não tocado.
- Adesão: não tocada.
- `packages/core/src/payment/**`: não tocado. O diff fica nos dois arquivos de `alterados`.

## Testes

- **BUG-012, a ordem dos totais do "Pedido recebido"**: `supabase/functions/send-notification/__tests__/render.test.ts:935`.
  - **No HTML, morde.** A lista de rótulos é exigida inteira e na ordem (`toEqual`). Com o Frete em 2º, ela reprova.
  - **No texto, morde.** Ele confere que os seis rótulos existem (`>= 0`) e que a posição de cada um vem depois da anterior (a lista de posições comparada com ela mesma ordenada). O Frete antes dos descontos reprova.
  - **A montagem reproduz o pedido do bug.** `comDesconto({ order_bump_discount: 0 })` traz o desconto do Compre Junto, cupom de 10, PIX de 8,80 e frete de 12,50.
- **As duas asserções reescritas** (`render.test.ts:906-914` e `:931`) continuam exatas (`toEqual`); só a posição do Frete mudou, para depois dos descontos. Não houve afrouxamento.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O pedido antigo também põe o Frete depois do "Desconto" | sim | A D-38 da tarefa ("descontos e PIX antes do Frete" para a loja, inclusive o e-mail) não distingue pedido novo de antigo. As fixtures `legacy-*`, comparadas byte a byte em `render.test.ts:84+`, não têm linha de desconto (busquei "Desconto": nenhuma fixture tem), então a ordem delas não muda | sim. Os únicos totais estão em `layout.ts`, e os e-mails que os mostram passam por `totalsTable`/`textBody` |
| 2 | Corrigir também o texto puro | sim | O mesmo e-mail sai nas duas formas, e o conserto foi aplicado igual nas duas | sim |
| 3 | Reescrever as duas asserções antigas | sim | Elas fixavam a D-36, que a D-38 revisou; a forma exata (`toEqual`) foi mantida | sim. A tarefa 18 (faixa das peças da lista) não depende da ordem dos totais do e-mail |

## Não conferido

- **Execução da suíte de `functions` e o vermelho antes do conserto:** só execução, como a regra manda.
- **A prévia no painel com o pedido #0363:** é reteste da QA.
- **Diff:** os dois arquivos aparecem em `git diff` (estão como `M`, ambos já versionados), então houve baseline completa e nada ficou sem prova por esse lado.

Instruções lidas: `supabase/CLAUDE.md` › `send-notification` — o motor de notificação. O `CLAUDE.md` da raiz veio carregado no contexto (Convenções, Os guardas, Baselines, o "defeito 01"). Não li `packages/core/CLAUDE.md` nem `.specs/LESSONS.md` › L-013..L-015: o diff não toca `core`, e não houve ponto de julgamento que dependesse deles.

## T18 — wi-impl-task · review · agente a95a11dff6492224f

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/18-bug-13-faixa-das-pecas-da-lista.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A faixa das peças segue a forma que o repositório já usa para faixa que rola: `flex snap-x snap-mandatory overflow-x-auto` (como o `slider` do `ProductCarousel`), com o recuo `px-0.5 pb-1.5 pt-0.5` de `FormulaStrip` (o mesmo bloco) e `min-w-0` | Uma grade que rolasse, ou uma solução própria | Regra 1: imitar o caso análogo. O recuo existe para a rolagem não cortar o contorno de foco | `AddonPanel.tsx`, nas três formas do bloco (na linha, a folha e o diálogo de "Em folha"), porque as três desenham o mesmo painel |
| 2 | Cada cartão tem `w-[132px] shrink-0 snap-start`, com a mesma largura em todos os tamanhos de tela | Larguras por breakpoint (o 166px do computador) | O protótipo não estava disponível (CH-09 não rodou). 132 é a largura medida hoje em 390, e a mesma largura em toda tela é o que se desfaz mais fácil. A largura certa só se confere contra o protótipo | Aparência dos cartões da lista nas três formas do bloco. A QA confere a largura no reteste |
| 3 | A barra de rolagem da faixa fica visível (não escondi como `FormulaStrip` esconde) | Esconder a barra | No computador, sem barra nem setas, quem usa mouse não tem como saber que a faixa rola (é a lição da `BL-028`) | O visual da faixa no computador |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | BUG-013: as peças de uma lista ficam numa faixa que rola na horizontal dentro do bloco (flex em linha, `overflow-x-auto`, `snap`, sem grade em nenhum tamanho de tela). Cada cartão tem largura fixa, não encolhe e se encaixa no começo. A última peça mostra o "de/por" | componente | `apps/store/src/entities/product/ui/__tests__/BuyTogetherDesconto.test.tsx` › "as peças correm numa faixa que rola na horizontal dentro do bloco, e não numa grade" | sim (reprovou antes do conserto com `flex: expected false to be true`) | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

apps/store/src/entities/product/ui/buy-together/AddonPanel.tsx alterado
apps/store/src/entities/product/ui/__tests__/BuyTogetherDesconto.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/entities/product/ui/__tests__/BuyTogetherDesconto.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação): antes do conserto, 1 falhou e 9 passaram (o vermelho esperado). Depois, 10/10, exit 0.
- O mesmo comando nos testes vizinhos que leem o bloco (PROJECT.md): `pages/__tests__/ProductPageBuyTogether.test.tsx` 36/36, `tomDoCompreJunto.test.ts` 5/5, `semMaterialNaPaginaDoProduto.test.ts` 11/11, todos com exit 0.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): exit 0, 0 erros. O baseline é 0, então nada mudou.
- Verificação mínima, `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines): exit 0, 372 arquivos e 6991 testes passando. A árvore inclui o trabalho das tarefas paralelas.
- `npx eslint` nos dois arquivos alterados: exit 0, sem achados.

Instruções lidas: `CLAUDE.md` (raiz, que já estava no contexto) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › O bloco Compre Junto (WI-01), O botão único leva o conjunto (WI-01), Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha" (WI-01), Minha conta e o detalhe do pedido (feature `59`); `.specs/LESSONS.md` › L-013, L-014, L-015; `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- A causa estava em `AddonPanel.tsx`, como o Contrato apontava: o `radiogroup` usava `grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:grid-cols-[…×3]`.
- O jsdom não mede layout, então o teste prova a faixa pelas classes dos elementos, não por medida. Três coisas só a QA prova em navegador: que a faixa rola de fato, que o `body` não rola de lado (390, 320 e 1440) e que a largura de 132px confere com o protótipo `Produto - Compre Junto com desconto.html`, que não foi lido. Também ninguém conferiu uma lista com 3 peças ou mais em navegador.
- Nada a propagar: nenhuma tarefa seguinte em `tasks/` afirma a grade. A tarefa 02 já descreve a faixa (linha 35), e nada dela caducou.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 18
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; packages/core/CLAUDE.md (inteiro); apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: BUG-013 (faixa que rola na horizontal no lugar da grade, cartões de largura fixa com snap e o "de/por" até a última peça) — apps/store/src/entities/product/ui/__tests__/BuyTogetherDesconto.test.tsx, "as peças correm numa faixa que rola na horizontal dentro do bloco, e não numa grade"; reprovou antes do conserto. Sem cobertura automatizada: a rolagem medida e o body sem rolagem lateral, porque o jsdom devolve 0 para layout; isso fica para o reteste da QA em navegador
Verificações: vitest do arquivo (vermelho 1/10 antes, verde 10/10 depois); arquivos vizinhos do bloco verdes (36 + 5 + 11); tsc do store com 0 erros; suíte da loja com 372 arquivos e 6991 testes, exit 0; eslint nos dois arquivos sem achados
Árvore de trabalho: apps/store/src/entities/product/ui/buy-together/AddonPanel.tsx (a grade virou faixa flex com overflow-x-auto e snap; os cartões ganharam w-[132px] shrink-0 snap-start); apps/store/src/entities/product/ui/__tests__/BuyTogetherDesconto.test.tsx (+1 teste). Nada commitado
Citações conferidas: 1 (AddonPanel.tsx, do Contrato), estava no lugar; nenhuma deslocou e nenhuma estava morta
```

## T18 — wi-impl-review · done · agente a5cf7eef892cf30ec

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/18-bug-13-faixa-das-pecas-da-lista.md
Veredito: serve

Não achei nenhum defeito: o diff entrega a faixa que rola pedida pela D-39 e pelo bug, com um teste cuja asserção reprova a grade antiga.

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a reprodução de BUG-013 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto | `AddonPanel.tsx:74`: o grupo de rádio deixou de ser `grid grid-cols-[…]` e virou `flex min-w-0 snap-x snap-mandatory flex-row gap-2 overflow-x-auto px-0.5 pb-1.5 pt-0.5`. `AddonPanel.tsx:95`: cada cartão tem `w-[132px] shrink-0 snap-start`. O teste está em `BuyTogetherDesconto.test.tsx:186-209`. Com a classe antiga ele reprovaria pelo token `flex` ausente e pelo regex de `grid` | sim. Que ele reprovou antes do conserto, só a execução prova |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `BuyTogetherDesconto.test.tsx:186` | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Contra o `Não faça`:
- O diff não toca `qa/issues/`, `packages/core/src/payment/**` nem a Adesão.
- Não corrige outro bug: só os dois arquivos de `alterados`, e só o radiogroup das peças da lista.

## Testes

- **A reprodução de BUG-013** está em `apps/store/src/entities/product/ui/__tests__/BuyTogetherDesconto.test.tsx:186`. A asserção morde:
  - Exige `flex`, `flex-row`, `overflow-x-auto`, `snap-x`, `snap-mandatory` e `min-w-0` no radiogroup, por token exato via `temClasse`.
  - Recusa `grid` e `grid-cols-*` com qualquer prefixo de breakpoint, o que pega a classe antiga, e recusa `flex-wrap`.
  - Exige `shrink-0`, `snap-start` e uma largura `w-[Npx]` em cada um dos 4 cartões.
  - Exige o "de/por" na última peça.
- O teste é de componente, sobre o `BuyTogetherBlock` real. É o nível que o bloco `Testes` pede para defeito de tela. O que ele prova é a forma (as classes), não a medida, porque o jsdom devolve 0 para layout.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Faixa em `flex snap-x snap-mandatory overflow-x-auto`, com o recuo de `FormulaStrip` e `min-w-0` | sim | `ProductCarousel.tsx:58-64` usa o mesmo trilho, com `snap-start` na vaga. `FormulaStrip.tsx:27` usa o mesmo `px-0.5 pb-1.5 pt-0.5`. Bate com D-39 (`spec.md:261`) e com `spec.md:57` ("faixa que rola dentro dela") | sim. O comentário em `AddonPanel.tsx:39-43` confirma que o painel é o mesmo nas três formas do bloco, então o raio cobre as três |
| 2 | Cartão `w-[132px]` fixo em todos os tamanhos de tela | sim | Nem a tarefa nem o arquivo de instruções fixam uma largura. O protótipo não foi conferido (CH-09 `not-run`), como ele mesmo declarou. O `min-h-11` foi mantido, então o alvo de toque não piora | sim. A largura fica para o reteste da QA |
| 3 | Barra de rolagem visível, sem esconder como `FormulaStrip` | sim | A raiz `CLAUDE.md` › `BL-028` registra o custo de uma faixa sem afordância de rolagem para quem usa mouse. Nada no arquivo de instruções manda esconder a barra | sim |

## Não conferido

- Que a faixa rola de verdade dentro do bloco sem rolar o `body` em 390, 320 e 1440. Isso depende de a cadeia de ancestrais deixar o painel encolher; `BuyTogetherBlock.tsx:64` usa `minmax(0,1fr)`, mas só o navegador mede. Fica para o reteste da QA.
- Que o teste novo reprovou antes do conserto e que a suíte dos arquivos alterados passa: só execução.
- `BuyTogetherSkeleton.tsx:27` continua com uma grade de 3 colunas. Esse arquivo não está em `alterados` e é o esqueleto do bloco inteiro, então não virou achado.
- Instruções lidas:
  - `apps/store/CLAUDE.md` › O bloco Compre Junto (WI-01), O botão único leva o conjunto (WI-01), Mobile — o que quebra e não grita.
  - `CLAUDE.md` (raiz), pelo contexto já carregado: Convenções que valem em todo o repositório, Os guardas (`BL-028`, `touchTarget`), Baselines.
  - Não abri `packages/core/CLAUDE.md` nem `.specs/LESSONS.md` › L-013..L-015: o diff não toca `core`.

## T12 — wi-impl-task · review · agente a6ff726b4adda117f

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/12-bug-4-selo-do-cupom.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A causa: o selo da gaveta (`CouponInput`, variante `drawer`) mostrava `applied.discount`, o valor que `validateCoupon` calculou na hora da aplicação, sobre o subtotal cheio. Esse valor fica congelado no `couponStore`. A linha do rodapé mostra `totals.couponDiscount` de `resolveOrderPricing`. O conserto: `CouponInput` ganhou a prop opcional `discount` (o valor que está valendo agora) e a gaveta passa `totals.couponDiscount` | Recalcular o desconto dentro do `CouponInput`, ou regravar `applied.discount` no store a cada mudança da sacola | Um valor só, com um dono só (`resolveOrderPricing`). É o mesmo que o checkout já faz no `couponBand` do `OrderSummary`. Não há conta nova na tela | `CouponInput.tsx`, `CartDrawer.tsx`. Sem a prop, o comportamento é o de antes, então o checkout e outros chamadores não mudam |
| 2 | Acrescentei a prop `notApplied`, que a gaveta liga quando `discarded === 'coupon'`. Nesse caso o selo diz "Não aplicado", igual ao `couponBand` do checkout | Deixar o selo mostrar "−R$ 0,00" quando o cupom perde para uma promoção (AD-015) | Com a prop `discount`, o cupom que perdeu viraria "−R$ 0,00", um anúncio falso. O checkout já usa "Não aplicado" | `CouponInput.tsx`, `CartDrawer.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Com desconto do Compre Junto, o selo mostra o mesmo valor da linha: 15% do subtotal já descontado (−R$ 55,67, e não −R$ 56,85) | componente (gaveta real com `CouponInput` real) | `apps/store/src/widgets/cart-drawer/ui/__tests__/seloDoCupom.test.tsx` | sim | — (reprovou antes do conserto: recebeu −R$ 56,85) |
| 2 | Quando a sacola muda, o selo acompanha a linha | componente | idem | sim | — (reprovou antes do conserto: recebeu −R$ 56,85 com a linha em −R$ 45,00) |
| 3 | Cupom que perdeu para a promoção: o selo diz "Não aplicado" | componente | idem | sim | vermelho (com `notApplied={false}` na gaveta o caso reprovou; arquivo restaurado da cópia e conferido com `cmp`) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

apps/store/src/features/apply-coupon/ui/CouponInput.tsx alterado
apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/seloDoCupom.test.tsx criado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/widgets/cart-drawer/ui/__tests__/seloDoCupom.test.tsx --testTimeout=20000` (comando de um arquivo, do `PROJECT.md` › Comandos de verificação): 2 casos reprovaram antes do conserto; depois do conserto, 3/3 passam.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (do `CLAUDE.md` › Comandos): exit 0, 0 erros. O baseline de tipos do store é 0, então não há erro novo.
- `npx eslint src/features/apply-coupon src/widgets/cart-drawer` (`CLAUDE.md` › Baselines): exit 0.
- Verificação mínima, a suíte do workspace `pnpm --filter @estrelinha/store test --testTimeout=20000` (`CLAUDE.md` › Baselines), exit capturado fora de pipe: exit 0, **6993 testes em 373 arquivos**. O número inclui o trabalho das outras tarefas que estão na árvore.

Instruções lidas: `CLAUDE.md` (raiz, já no contexto) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (o índice e as seções de módulos, dinheiro e home até `live`; o resto do arquivo não li); `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `.specs/LESSONS.md` › L-013, L-014, L-015; `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- A causa está em `CouponInput.tsx`, um dos arquivos que o Contrato citava. `packages/core/src/payment/**` não foi tocado.
- O checkout não tinha o bug: ele desenha o próprio selo (`couponBand` no `OrderSummary`) com `totals.couponDiscount`, e só monta `CouponInput` quando não há cupom aplicado.
- Os testes de gaveta que já existiam (`CartDrawer.test.tsx`, `CartDrawerAcompanha.test.tsx`, `compreJuntoSacolaECheckout.test.tsx`) substituem o `CouponInput` por um dublê. Por isso nenhum deles podia ver o selo, e o teste novo monta o `CouponInput` real.
- Nenhuma tarefa seguinte cita `CouponInput` nem o selo, então não houve nada a propagar.
- As saídas de comando foram para `/tmp/x/`, fora do repositório, e não para `$TMPDIR` nem para o scratchpad como o procedimento pede.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 12
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções, Os guardas, Baselines; packages/core/CLAUDE.md (o índice e as seções de módulos, dinheiro e home até live; o resto não li); apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: BUG-004 (o selo com o mesmo valor da linha, com o desconto do Compre Junto; e o selo acompanhando a sacola quando ela muda) em apps/store/src/widgets/cart-drawer/ui/__tests__/seloDoCupom.test.tsx, os dois vermelhos antes do conserto. Mais um caso para o "Não aplicado" do cupom que perde para a promoção, com o check de mutação vermelho. Nada ficou sem cobertura.
Verificações: o arquivo de teste 3/3 verde; tsc do store 0 erros; eslint dos dois diretórios limpo; a suíte do store com exit 0, 6993 testes em 373 arquivos
Árvore de trabalho: alterados apps/store/src/features/apply-coupon/ui/CouponInput.tsx (props opcionais discount e notApplied) e apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx (passa totals.couponDiscount e discarded === 'coupon'); criado apps/store/src/widgets/cart-drawer/ui/__tests__/seloDoCupom.test.tsx; nada commitado
Citações conferidas: 3 abertas ao usar (os três arquivos do Contrato), nenhuma deslocada, nenhuma morta
```

## T12 — wi-impl-review · done · agente a019d091bf29d7886

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/12-bug-4-selo-do-cupom.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a reprodução de BUG-004 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto | `CartDrawer.tsx` passa `discount={discount}` (com `discount = totals.couponDiscount`, l.106) ao `CouponInput`. O selo mostra `shownDiscount = discount ?? applied?.discount`. Os casos 1 e 2 de `seloDoCupom.test.tsx` comparam o selo com a linha do rodapé | sim no código. O vermelho antes do conserto é só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `apps/store/src/widgets/cart-drawer/ui/__tests__/seloDoCupom.test.tsx` (3 casos) | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Conferi as proibições de `Não faça`, e o diff respeita todas:
- não toca em `qa/issues/`;
- não conserta outro bug da rodada;
- não mexe na Adesão;
- não altera `packages/core/src/payment/**`.

## Testes

Um comportamento no bloco `Testes`: o esperado de BUG-004. O teste é `seloDoCupom.test.tsx`. Ele monta o `CartDrawer` real com o `CouponInput` real e dubla só as leituras.

- **Caso 1 morde.** O cupom é gravado com 56,85, o valor da hora da aplicação, e a linha vale 55,67. Os dois números divergem, como pede a L-013, e o código antigo mostraria −56,85 no selo.
- **Caso 2 morde.** Depois de `removeItem`, a linha vai para 45 e o selo congelado ficaria em 56,85.
- **Caso 3 morde.** É o cupom que perdeu para a promoção. O código antigo mostraria −4,01. O mutante que não passa `notApplied` mostraria −R$ 0,00. Os dois falham na asserção `'Não aplicado'`.

O nível é componente com a gaveta real. Para um defeito de fiação, é o nível certo.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Prop opcional `discount` no `CouponInput`, alimentada por `totals.couponDiscount` na gaveta | sim | A linha "Cupom" do rodapé da gaveta (`CartDrawer.tsx:313-316`) já lê o mesmo `discount`, e isso dá um dono só (`resolveOrderPricing`). Os dois chamadores de `CouponInput` são a gaveta e o `OrderSummary.tsx:218`. O `OrderSummary` não passa a prop e só renderiza o input quando não há cupom, porque o cupom aplicado é o `couponBand`. Por isso o checkout não muda | sim |
| 2 | Prop `notApplied`, ligada quando `discarded === 'coupon'`; o selo diz "Não aplicado" | sim | Bate com o `couponBand` do `OrderSummary.tsx:200`, que já usa "Não aplicado". `discarded` sai de `useCartPromotion`, que a gaveta já consumia | sim |

## Não conferido

- Os três arquivos estão com intent-to-add (`M`, `M`, `A`). O diff tem baseline completa, então não há nada não conferido por falta de baseline.
- Não rodei teste. A afirmação de que o teste reprovou antes do conserto é só execução.
- O layout do texto "Não aplicado" no selo em 390 é só navegador.

Instruções lidas:
- `CLAUDE.md` (raiz, carregado em contexto, inclusive › O "defeito 01", Alias de import, Convenções, Os guardas, Baselines)
- `apps/store/CLAUDE.md` › índice de títulos e as linhas que falam de cupom (Carrinho, chrome e checkout; Frete grátis)
- `packages/core/CLAUDE.md` › índice de títulos
- `.specs/LESSONS.md` › L-013, L-014, L-015 (títulos)

## T13 — wi-impl-task · review · agente a721fc278147f0f62

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/13-bug-5-pagamento-valor-antes-do-recalculo.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A causa está fora dos arquivos que o Contrato aponta. `OrderPaymentPage` lê o pedido (`useOrder`) e só depois `usePixPayment` chama `create-payment`, que recalcula e regrava o pedido antes de falar com o Mercado Pago. A tela fica com o total de antes. O conserto ficou em `features/checkout/api/useCreatePayment.ts`: um `onSettled` que invalida `['orders']` | Reler pela página ou pela máquina do PIX (callback `onSettled` em `usePixPayment`, `refetch` de `useOrder`); fazer o servidor devolver o total na resposta | A mutação é dona da chamada que regrava, então ela avisa que o pedido mudou. É o mesmo precedente de `useCreateOrder` (`onSuccess` invalida `['orders']`). Todo consumidor real de `useMutation` já tem `QueryClientProvider`, então não quebra teste nenhum. A resposta do servidor não cobriria o caso medido na QA (Mercado Pago 400): ali não volta corpo de sucesso, e mesmo assim o pedido já foi regravado | `useCreatePayment` é usado também por `CheckoutPage` (cartão) e `ProposalCheckoutPage`. Lá a invalidação só marca o cache como velho, nenhuma tela relê |
| 2 | A invalidação roda no `onSettled`, ou seja, também na falha | Só no `onSuccess` | O servidor regrava o pedido antes do Mercado Pago, e a recusa não desfaz a regravação. É exatamente o caso observado (400 local) | o mesmo de 1 |
| 3 | A invalidação usa o prefixo `['orders']`, e não só `['orders','id',id]` | Só a chave do pedido | A regravação muda o total em toda leitura desse pedido, inclusive na lista de Minha conta (`['orders','customer',…]` e `['orders','email',…]`). Só as consultas com observador ativo releem | as consultas de pedido da loja |
| 4 | Enquanto o código PIX está sendo gerado, `PaymentProgress` ainda mostra o valor de antes. Ele é trocado pelo novo assim que `create-payment` responde | Esconder o valor durante a espera | O valor novo só existe depois da regravação, e a espera é curta. Mexer no desenho da espera seria ir além do escopo do bug | `features/order-payment/ui/PaymentProgress` (não foi alterado) |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | BUG-005: com o pedido regravado mais barato pelo `create-payment`, a tela de pagamento mostra o valor recalculado (R$ 307,11, não R$ 310,37). Dois casos: com o código PIX gerado, e com o Mercado Pago recusando (tela "valor do pedido, ainda não cobrado") | página real (`OrderPaymentPage` com os reais `useOrder`, `usePixPayment` e `useCreatePayment`; só o client do Supabase é dublê) | `apps/store/src/pages/__tests__/OrderPaymentPageValorRegravado.test.tsx` | sim | — (reprovou antes do conserto mostrando R$ 310,37. Depois, com a invalidação retirada pela cópia, reprovou de novo; restaurado e conferido com `cmp`) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

apps/store/src/features/checkout/api/useCreatePayment.ts alterado
apps/store/src/pages/__tests__/OrderPaymentPageValorRegravado.test.tsx criado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/pages/__tests__/OrderPaymentPageValorRegravado.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação): antes do conserto 2 de 2 reprovam, com a tela mostrando R$ 310,37. Depois, 2/2 passam.
- Os testes dos arquivos alterados e dos consumidores de `useCreatePayment`, no mesmo comando (PROJECT.md): `useCreatePayment.test.tsx`, `features/order-payment/**`, `OrderPaymentPage.test.tsx`, `CheckoutPage.test.tsx`, `checkoutSobreviveAVoltaDaAba.test.tsx`, `ProposalCheckoutPage.test.tsx` e `pagamentoComDonoUnico.test.ts`. Resultado: 12 arquivos e 374 testes passando, exit 0.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): exit 0 e 0 erros. Baseline `limpo` (0), nada novo.
- Verificação mínima `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines): 373 arquivos e 6993 testes passando, exit 0 fora de pipe. A árvore tinha trabalho das tarefas 12, 17 e 18 ao mesmo tempo.
- `npx eslint` nos dois arquivos: sem erro nem aviso. A primeira versão do teste importava `@/app/queryClient` e o FSD avisava `pages → app`. Troquei por um `QueryClient` local com `staleTime: Infinity`, que é mais rigoroso: o pedido só relê se alguém o invalidar.

Instruções lidas: CLAUDE.md › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines (vieram no contexto); packages/core/CLAUDE.md, lido do começo até a seção `shopping` (o restante não li); apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido (e também As parcelas do cartão, O PIX tem endereço, O cartão espera POR CIMA, que estavam no mesmo trecho); .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- A causa não está nos arquivos que o Contrato apontava (`features/order-payment/**`, `OrderPaymentPage.tsx`). Está em `features/checkout/api/useCreatePayment.ts`, fora da cerca de paralelismo, e o conserto foi feito lá. Nenhum arquivo do Contrato foi alterado.
- Não deu para ver se o QR traria o valor certo. O servidor cobra o próprio recálculo (`packages/core/CLAUDE.md` › Dinheiro). Não rodei nada contra o Mercado Pago local, e a prova em navegador é da QA/Validation.
- `packages/core/src/payment/**` não foi tocado.
- Propagação: as tarefas seguintes (14 a 18) não afirmam nada que este conserto torne falso.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 13
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; packages/core/CLAUDE.md, lido do começo até a seção `shopping` (o restante não li); apps/store/CLAUDE.md › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: BUG-005 → apps/store/src/pages/__tests__/OrderPaymentPageValorRegravado.test.tsx (2 casos: código gerado, e Mercado Pago recusando depois da regravação), pela página real com useOrder, usePixPayment e useCreatePayment reais; reprovou antes do conserto (tela em R$ 310,37). Ficou sem cobertura: o valor dentro do QR (ele é do servidor; não testável em jsdom nem no Mercado Pago local)
Verificações: teste novo 2/2 (vermelho antes, verde depois, e vermelho de novo com a invalidação retirada pela cópia); consumidores de useCreatePayment e order-payment 374/374 em 12 arquivos; tsc da loja 0 erros (baseline 0); suíte da loja 6993/373, exit 0; eslint dos dois arquivos limpo
Árvore de trabalho: apps/store/src/features/checkout/api/useCreatePayment.ts (onSettled invalida ['orders']); apps/store/src/pages/__tests__/OrderPaymentPageValorRegravado.test.tsx (novo); nada commitado
Citações conferidas: 2 (apps/store/src/features/order-payment/**, apps/store/src/pages/OrderPaymentPage.tsx), as duas presentes; nenhuma deslocada nem morta. A causa estava fora delas (useCreatePayment.ts)
```

## T13 — wi-impl-review · done · agente a93a19238d1fd9bb8

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/13-bug-5-pagamento-valor-antes-do-recalculo.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a reprodução de BUG-005 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto | `apps/store/src/features/checkout/api/useCreatePayment.ts:139-141` (`onSettled` invalida `['orders']`); `apps/store/src/pages/__tests__/OrderPaymentPageValorRegravado.test.tsx` (dois casos: QR gerado, e Mercado Pago 400 depois da regravação) | sim no código; o vermelho antes do conserto e o verde depois só a execução mostra |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `OrderPaymentPageValorRegravado.test.tsx` | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Itens de `Não faça` conferidos: o diff não toca `qa/issues/`, nem outro bug, nem a Adesão, nem `packages/core/src/payment/**`. O conserto ficou fora dos arquivos do `Contrato`, que a própria tarefa permite ("se ela morar fora destes arquivos, siga até ela e diga no retorno"). Isso está declarado na premissa 1.

## Testes

- O valor da tela de pagamento é o do pedido regravado (BUG-005): `apps/store/src/pages/__tests__/OrderPaymentPageValorRegravado.test.tsx`. A asserção morde. A árvore é real de ponta a ponta: `OrderPaymentPage`, `useOrder`, `usePixPayment` e `useCreatePayment` não são dublados. Só o client do Supabase é dublê, e cada leitura de `from()` devolve o `banco.total` atual. A function dublada regrava o total para 307,11 antes de responder. O `QueryClient` usa `staleTime: Infinity` e o canal Realtime nunca dispara, então nada relê o pedido sozinho: sem a invalidação, a tela segue em R$ 310,37 e o `waitFor('R$ 307,11')` reprova. Cada caso confere também que o valor antigo sumiu. O segundo caso reproduz exatamente o 400 medido na QA. O nível é o da página real, que é o certo para um defeito de fiação. A tela usa `amount={order.total}` (`OrderPaymentPage.tsx:227`), e é esse valor que o teste lê.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Conserto na mutação `useCreatePayment`, com `onSettled` invalidando `['orders']`, e não na página nem na máquina do PIX | sim | O precedente existe: `entities/order/api/useOrders.ts:280` invalida `['orders']` no `useCreateOrder`. O arquivo de instruções não decide de outro jeito. Os testes que montam `useCreatePayment` de verdade já têm `QueryClientProvider`: `useCreatePayment.test.tsx:23` e `ProposalCheckoutPage.test.tsx:181`. `CheckoutPage.test.tsx`, `checkoutSobreviveAVoltaDaAba.test.tsx` e `usePixPayment.test.tsx` dublam o hook, então `useQueryClient` não é alcançado | sim. Os consumidores são `usePixPayment`, `CheckoutPage` e `ProposalCheckoutPage`. Nenhuma das duas páginas de checkout lê `useOrder` nem `useOrders`, e nenhuma tarefa seguinte nem contrato fica de fora do raio declarado |
| 2 | A invalidação roda em `onSettled`, inclusive na falha | sim | O caso da QA (Mercado Pago 400 com o pedido já regravado) é coberto pelo segundo teste | sim |
| 3 | Invalidação pelo prefixo `['orders']` | sim | As chaves são `['orders','id',id]` (`useOrder.ts:73`), `['orders','email',…]` e `['orders','customer',…]` (`useOrders.ts:57`, `:72`). Os dois arquivos de instruções lidos não trazem regra contrária | sim |
| 4 | `PaymentProgress` mostra o valor de antes enquanto o código PIX é gerado | sim | O `Esperado` do bug fala da tela de pagamento depois do recálculo, e o valor novo só existe depois de `create-payment` responder. Mudar a espera seria escopo além do bug | sim. `PaymentProgress` não foi alterado |

## Não conferido

- O vermelho antes do conserto e o verde depois, além da suíte da loja e de `tsc`/lint: só a execução prova. Não rodei nada.
- Se a releitura de `['orders']` disparada no `onSettled` durante o fluxo do cartão em `CheckoutPage` tem algum efeito visível. Nenhum observador de pedido foi achado nessa página, mas isso só se confirma rodando.
- Os dois arquivos de `alterados` aparecem no diff (`M` e `A`, com intent-to-add), então a baseline existe para os dois.
- `packages/core/CLAUDE.md` e `.specs/LESSONS.md` (L-013..L-015) não foram lidos: nenhuma premissa nem trecho do diff depende deles.

Instruções lidas: `CLAUDE.md` (raiz, carregado inteiro no contexto); `apps/store/CLAUDE.md` › Carrinho, chrome e checkout; › A sacola v4 e a marca "acompanha"; › O PIX tem endereço, e o checkout entrega o bastão; › O cartão espera POR CIMA do checkout; › Minha conta e o detalhe do pedido.

## T16 — wi-impl-task · review · agente a1c58f2027feecbb0

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/16-bug-11-ordem-do-resumo-na-loja.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Corrigir só a ordem em cada tela (`OrderSummary.tsx` e `OrderItemsSummary.tsx`). Movi a linha do Frete para depois do Desconto PIX, logo antes do Total | Pôr a ordem em `core/orders/summary.ts`, juntando o frete à lista `discounts` | O diagnóstico mostrou que `orderSummary` (core) já devolve os descontos na ordem certa (Compre Junto · progressivo · oferta · cupom · PIX), com `shipping` num campo separado. A ordem errada vinha só de onde cada tela desenhava o Frete. Mexer no core tocaria o painel, o app e o e-mail, que têm tarefas próprias (BUG-010/012) | os dois componentes da loja. As tarefas do BUG-010 e do BUG-012 seguem com o mesmo padrão (a ordem é da tela), e nada do core mudou para elas |
| 2 | Inverti a lista de rótulos de dois testes existentes de `OrderItemsSummary.test.tsx`. Eles defendiam a ordem antiga (Frete em 2º) | Deixar os dois como estavam e só acrescentar testes | Pela D-38, a ordem antiga é o defeito. Mantidos, esses testes ficariam verdes a favor do comportamento removido. A régua não foi afrouxada: continua igualdade exata da lista e a soma que fecha | `OrderItemsSummary.test.tsx` |
| 3 | O teste novo do checkout cobre progressivo + cupom + PIX + frete, e também o "Frete a calcular". Não cobre a linha do Compre Junto | Trocar o dublê fixo de `useCartBuyTogether` por um configurável | O dublê é de módulo e sempre devolve `config: null`. Montar uma configuração de desconto casado no checkout seria trocar o arnês do arquivo inteiro. A linha do Compre Junto fica no mesmo bloco, acima do progressivo, e o Frete agora é o último irmão, então a posição dela fica coberta pela estrutura. Do lado do pedido, a ordem com o Compre Junto está provada em `OrderItemsSummary.test.tsx` | `OrderSummary.test.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Resumo do checkout: Subtotal · descontos · Cupom · Desconto PIX · Frete, com frete escolhido e com "a calcular" | componente | `apps/store/src/features/checkout/ui/__tests__/OrderSummary.test.tsx` › "a ordem das linhas é a do painel…" (2 casos) | sim | — (reprovou antes do conserto, com o Frete em 2º) |
| 2 | Resumo de `/pedido/:id` (confirmação e Minha conta): Subtotal · Compre Junto · progressivo · oferta · Cupom · PIX · Frete · Total, e o pedido antigo Subtotal · Cupom · PIX · Frete · Total | componente | `apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx` › "o resumo: Subtotal cheio…" e "pedido de antes…" | sim | — (reprovou antes do conserto) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

apps/store/src/features/checkout/ui/OrderSummary.tsx alterado
apps/store/src/entities/order/ui/OrderItemsSummary.tsx alterado
apps/store/src/features/checkout/ui/__tests__/OrderSummary.test.tsx alterado
apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/features/checkout/ui/__tests__/OrderSummary.test.tsx src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx --testTimeout=20000` (PROJECT.md › Comandos de verificação). Antes do conserto: 4 reprovados, os quatro pela ordem (o Frete aparecia em 2º). Depois: 79/79, exit 0
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos). Exit 0, zero erros. Nenhum baseline foi passado; o de CLAUDE.md é 0 na loja, então não há erro novo
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines, a verificação mínima: suíte do workspace tocado). 373 arquivos, 6995 testes, exit 0 fora de pipe
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines (pelo contexto carregado da raiz); packages/core/CLAUDE.md › índice e as seções de alcance geral; apps/store/CLAUDE.md › O bloco Compre Junto (WI-01), O botão único leva o conjunto (WI-01), Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha" (WI-01), Minha conta e o detalhe do pedido (feature 59); .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- O diagnóstico ficou dentro dos dois arquivos do Contrato. `packages/core/src/orders/summary.ts` já entrega os descontos na ordem da D-38 e não foi tocado, nem `packages/core/src/payment/**`.
- `packages/core/CLAUDE.md` tem 46 KB. Li o índice e as seções gerais, não o arquivo de ponta a ponta.
- A cerca da tarefa 15 foi respeitada: `PriceChangedCheckout.tsx`, `PriceChangedContact.tsx` e `CheckoutPage.tsx` não foram tocados.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 16
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz, as seções citadas), packages/core/CLAUDE.md (índice e seções gerais), apps/store/CLAUDE.md (as seções citadas), .specs/LESSONS.md (L-013, L-014, L-015), .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: o esperado do BUG-011 no checkout, em apps/store/src/features/checkout/ui/__tests__/OrderSummary.test.tsx (2 casos novos: com frete escolhido e com "a calcular"); em /pedido/:id, em apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx (2 casos que defendiam a ordem antiga, invertidos para a D-38). Todos reprovaram antes do conserto. Sem cobertura: a linha do Compre Junto no teste do checkout, porque o dublê de useCartBuyTogether é fixo em config null; a posição dela fica coberta pela estrutura (o Frete passou a ser o último irmão do bloco) e pelo teste de OrderItemsSummary
Verificações: os dois arquivos de teste 79/79; tsc da loja 0 erros; suíte da loja 6995/373, exit 0
Árvore de trabalho: apps/store/src/features/checkout/ui/OrderSummary.tsx, apps/store/src/entities/order/ui/OrderItemsSummary.tsx e os dois arquivos de teste acima; nada commitado
Citações conferidas: 2 (os dois arquivos do Contrato), nenhuma deslocada nem morta
```

## T16 — wi-impl-review · done · agente af65b3b578196faec

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/16-bug-11-ordem-do-resumo-na-loja.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a reprodução de BUG-011 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto | `OrderSummary.tsx`: a linha do Frete saiu do lugar logo depois do Subtotal e foi para depois do Desconto PIX, como último irmão de `totalLines`, antes de `totalRow`. `OrderItemsSummary.tsx:125-132`: o `resumo.discounts.map` passou para antes do `<Linha rotulo="Frete">`. A ordem final é Subtotal · Compre Junto · progressivo · (oferta) · cupom · PIX · Frete · Total, que é o Esperado. Os testes conferem a ordem por igualdade exata da lista de rótulos | sim no código. Que o teste reprovou antes: só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | um único comportamento (a reprodução do BUG-011), coberto pelo describe novo em `OrderSummary.test.tsx` (checkout) e pelos dois casos de `OrderItemsSummary.test.tsx` (pedido) | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Dos `Não faça`:
- `qa/issues/`: não tocado.
- outros bugs: não tocados.
- Adesão: não tocada.
- `packages/core/src/payment/**`: não tocado.

Os quatro alterados são só os dois componentes e os testes deles.

## Testes

- **BUG-011 no checkout**, em `apps/store/src/features/checkout/ui/__tests__/OrderSummary.test.tsx`, no describe "a ordem das linhas é a do painel":
  - Dois casos: progressivo + cupom + PIX + frete, e o "Frete a calcular" sem CEP.
  - `rotulosDasLinhas` lê os filhos do bloco `totalLines` pelo `summary-subtotal`, e o `toEqual` cobra a lista exata e a posição. Com o Frete de volta em 2º, os dois reprovam. O `lastElementChild` com "a calcular" também morde.
  - A asserção morde.
- **BUG-011 no pedido**, em `apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx`:
  - Dois casos existentes foram invertidos: o do Compre Junto com progressivo, oferta, cupom e PIX, e o do cupom com PIX.
  - Continua igualdade exata da lista de `dt`, e as asserções de valor ficaram intactas.
  - Com a ordem antiga eles reprovam. A asserção morde e não foi afrouxada.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Corrigir a ordem em cada tela, sem mexer em `core/orders/summary.ts` | sim | O checkout não usa `orderSummary` e monta as linhas à mão. Em `OrderItemsSummary` o Frete já era um campo separado de `discounts`. A tarefa diz "se a causa estiver aqui", e a causa estava nas duas telas. As tarefas 11 (BUG-010) e 17 (BUG-012) não supõem mudança em `core`. Não achei linha das instruções que obrigue levar a posição do Frete para `core`. | sim. Única superfície de pedido na loja: `OrderConfirmationPage`, que usa `OrderItemsSummary` (é a mesma de Minha conta) |
| 2 | Inverter os dois testes que defendiam a ordem antiga | sim | Vem da D-38, que a tarefa cita. A régua continua de igualdade exata, e as asserções de soma ficaram intactas | sim |
| 3 | O teste novo do checkout não cobre a linha do Compre Junto | sim | O dublê de módulo de `useCartBuyTogether` devolve `config: null`. Pelo código, a linha do Compre Junto fica antes do progressivo e o Frete é o último irmão. A ordem com o Compre Junto está provada do lado do pedido | sim |

## Não conferido

- Que os testes novos ou invertidos reprovaram antes do conserto, e que passam agora: só a execução prova.
- No checkout, a ordem com a linha do Compre Junto presente não tem teste, porque o dublê do arnês não permite (premissa 3). Fica provada pela leitura do código.
- O "Desconto da oferta" não tem linha própria no `OrderSummary` do checkout. Isso já era assim antes desta tarefa e fica fora dela.

Instruções lidas:
- `CLAUDE.md` (raiz), já no contexto, inteiro.
- `apps/store/CLAUDE.md` › "Carrinho, chrome e checkout", "A sacola v4 e a marca 'acompanha'", "Minha conta e o detalhe do pedido".
- Não li `packages/core/CLAUDE.md`, as seções "O bloco Compre Junto" e "O botão único leva o conjunto" de `apps/store/CLAUDE.md`, nem `.specs/LESSONS.md` › L-013..L-015: nenhum alterado é de `core` ou da página do produto.

## T15 — wi-impl-task · review · agente ae77b742dfa268b7a

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/15-bug-9-convidada-confirmar-novo-total.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Mantive a regra do servidor: o 409 continua pedindo o código. Consertei o ramo condicional do Esperado: quando o código é pedido, a tela diz que o pedido anterior criou a conta e o novo total continua à vista. A causa é esta: o primeiro pedido da convidada cria a conta do e-mail dela, "Confirmar com o novo total" cria outro pedido (D-34), e o `create-order` recusa uma convidada cujo e-mail já tem conta (IDN-08) | Fazer o servidor aceitar o `access_token` do pedido anterior como prova de posse, para criar o segundo pedido sem código. Isso mexeria na function `checkout` e em `core/checkout/identity.ts`, que é regra de identidade e segurança, e o contrato da tarefa só aponta arquivos da loja | Regra 3 (a mais fácil de desfazer) e regra 4 (a menor superfície). O Esperado aceita o código quando ele é de fato necessário, e pela regra de hoje ele é | `CheckoutPage.tsx` e `PriceChangedCheckout.tsx`. Se o humano quiser que o pagamento siga sem código nenhum, é trabalho de servidor e identidade, fora desta tarefa |
| 2 | O aviso "O valor do seu pedido mudou" agora fica de pé até o pedido novo existir: `setPriceChanged(null)` roda logo depois do `createOrder` dar certo, e não mais no clique de "Confirmar" | Continuar limpando no clique e mostrar o motivo só no desafio de código | É a única forma de o total novo seguir à vista quando o servidor responde 409. Em qualquer outra falha de criação (toast) o aviso também fica, e ele continua verdadeiro | `CheckoutPage.tsx`. No cartão, o aviso some quando o pedido é criado, e não mais no clique |
| 3 | O texto do motivo é derivado na renderização: `codeEmail = identity === 'challenge' ? contact.email : null`, só enquanto o aviso existe. Sem estado novo | Um estado próprio, marcado no `catch` do `NeedsOtpError` | Com o aviso de pé, a convidada desafiada sempre teve o primeiro pedido criado sem conta, então a frase é verdadeira. Ela some sozinha quando a sessão existe, porque a sessão vence o e-mail em `resolveCheckoutIdentity` | `CheckoutPage.tsx` |
| 4 | Quando o código passa a ser pedido, o foco vai para o próprio aviso (`tabIndex={-1}`), onde está a explicação | Focar o campo do código no bloco Contato | O campo mora no `ContactBlock` e no `CheckoutSignInChallenge`, fora do contrato. A explicação está no aviso, e o código está logo acima | `PriceChangedCheckout.tsx` |
| 5 | Texto novo, impessoal porque explica um passo técnico: "O seu primeiro pedido criou uma conta na loja com **{e-mail}**. Por isso, antes de criar o pedido com o novo total, é preciso confirmar que o e-mail é seu. O código foi enviado para ele: digite-o no bloco Contato, acima, e confirme com o novo total." | Primeira pessoa da Adri | Pela convenção, mensagem técnica fica impessoal | Só o texto. O reteste da QA lê essa frase |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | BUG-009: a convidada no PIX toca "Confirmar com o novo total" e recebe o 409. O aviso fica, o "Agora R$ 454,05" fica, aparece a frase do pedido anterior, o foco vai para o aviso e não sai toast. Junto, o caso inverso: sem valor mudado, o 409 abre o desafio sem essa frase | página real (`CheckoutPage`) | `apps/store/src/pages/__tests__/CheckoutPage.test.tsx`, "convidada no PIX: o código pedido ao confirmar o novo total vem com o motivo…" e "o par: sem o valor mudado, o 409 abre o desafio sem a frase do pedido anterior" | sim. Antes do conserto reprovou porque o aviso não era encontrado | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

apps/store/src/features/order-payment/ui/PriceChangedCheckout.tsx alterado
apps/store/src/pages/CheckoutPage.tsx alterado
apps/store/src/pages/__tests__/CheckoutPage.test.tsx alterado

## Verificação

- Conferência de tipos antes da primeira fatia, para servir de baseline: `npx tsc --noEmit -p apps/store/tsconfig.app.json`. Fonte: `CLAUDE.md` §Comandos. Saída 0, zero erros
- `pnpm --filter @estrelinha/store exec vitest run src/pages/__tests__/CheckoutPage.test.tsx --testTimeout=20000`. Fonte: `PROJECT.md` › Comandos de verificação
  - antes do conserto: 1 reprovado, 5 passaram (no filtro do bloco do valor mudado)
  - depois: 165/165, saída 0
- Tipos no fim: `npx tsc --noEmit -p apps/store/tsconfig.app.json`, saída 0, zero erros. Baseline também era zero: nada mudou contra ela
- Verificação mínima: `pnpm --filter @estrelinha/store test --testTimeout=20000`. Fonte: `CLAUDE.md` §Baselines. Saída 0, 6997 testes em 373 arquivos, todos passaram
- A mais: `npx eslint` nos três arquivos tocados, limpo
- Instruções lidas:
  - `CLAUDE.md` (raiz, no contexto) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines
  - `packages/core/CLAUDE.md`: Quando um código pertence…, Pureza, Os módulos, Dinheiro, `shopping`, `faq/block.ts` (em parte), `checkout/identity.ts` e Convenções de tipo. As outras seções de módulo foram só vistas no índice
  - `apps/store/CLAUDE.md` › topo, Design system, Mobile, O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", O PIX tem endereço…, O checkout NÃO exige conta, Minha conta e o detalhe do pedido
  - `.specs/LESSONS.md` › L-013, L-014, L-015
  - `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local

## Divergências e descobertas

- O diagnóstico confirmou que a causa está no `CheckoutPage.tsx`: o `onConfirm` limpava o aviso antes de chamar `handleConfirm`, e o 409 do `create-order` abria o desafio sem contexto nenhum. No PIX, a espera (`PaymentProgress`) troca a tela inteira e desmonta o aviso, o que explica o foco no `<body>`.
- O `auth/v1/otp → 429` logo depois do `→ 200` não foi diagnosticado. O `CheckoutSignInChallenge` só envia o código uma vez por e-mail (ref), e a parte de autenticação está fora do contrato. Fica para o reteste da QA conferir se ele se repete.
- Não houve prova em navegador (390 × 844 com fonte a 200 %). Ela é da QA e da Validation, e o jsdom não mede quebra de linha. O e-mail longo leva `break-all` para não abrir rolagem horizontal.
- A tarefa 16 rodou em paralelo na mesma árvore. A suíte da loja passou inteira com o trabalho dela dentro, e não toquei em `OrderSummary.tsx` nem em `OrderItemsSummary.tsx`.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 15
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, as seções citadas); packages/core/CLAUDE.md (as seções de alcance geral e checkout/identity); apps/store/CLAUDE.md (O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", O checkout NÃO exige conta, Minha conta e o detalhe do pedido); .specs/LESSONS.md (L-013, L-014, L-015); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: BUG-009 em apps/store/src/pages/__tests__/CheckoutPage.test.tsx: "convidada no PIX: o código pedido ao confirmar o novo total vem com o motivo, e o total novo fica à vista" (reprovou antes do conserto) e o par "o par: sem o valor mudado, o 409 abre o desafio sem a frase do pedido anterior". Sem cobertura: a medida em 390/200 % (jsdom não mede layout; é da QA) e o 429 do OTP (não diagnosticado, fora do contrato)
Verificações: tsc da loja 0 erros (baseline 0); CheckoutPage.test.tsx 165/165; suíte da loja 6997/373, saída 0; eslint dos três arquivos limpo
Árvore de trabalho: apps/store/src/features/order-payment/ui/PriceChangedCheckout.tsx, apps/store/src/pages/CheckoutPage.tsx, apps/store/src/pages/__tests__/CheckoutPage.test.tsx (nada commitado)
Citações conferidas: 3 abertas (os três arquivos do Contrato); nenhuma deslocada, nenhuma morta. A causa morava em CheckoutPage.tsx (o aviso era limpo antes de confirmar) e o texto em PriceChangedCheckout.tsx; PriceChangedContact.tsx não precisou mudar
```

## T15 — wi-impl-review · done · agente aba854d683ae37cca

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/15-bug-9-convidada-confirmar-novo-total.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a reprodução de BUG-009 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto | `CheckoutPage.tsx:584-585`: `setPriceChanged(null)` saiu do clique e foi para depois do `createOrder` dar certo. `CheckoutPage.tsx:807`: `codeEmail={identity === 'challenge' ? contact.email : null}`. `PriceChangedCheckout.tsx`: o parágrafo do motivo e o foco no aviso (`tabIndex={-1}` + `useEffect`). O teste novo em `CheckoutPage.test.tsx:2187` | sim no código. Que o teste reprova sem o conserto, li pela asserção: com o código antigo, o clique apagava o aviso, e o `getByRole('alert', …)` depois do clique falharia. Ver o vermelho é só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `CheckoutPage.test.tsx:2187` (o caso) e `:2223` (o par) | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`.

Conferi o `Não faça` contra o diff, e ele não foi violado:
- nada em `qa/issues/`;
- nenhum outro bug consertado;
- nada da Adesão;
- nada em `packages/core/src/payment/**`.

`PriceChangedContact.tsx`, que o Contrato lista, não foi tocado. O Contrato diz "se a causa estiver aqui", então tocar nele não era obrigatório.

## Testes

- **BUG-009 (convidada no PIX, 409 depois de "Confirmar com o novo total")**: `apps/store/src/pages/__tests__/CheckoutPage.test.tsx:2187`, no nível da página real. **A asserção morde.** Ela confere quatro coisas depois do clique:
  - o desafio de código aparece;
  - o aviso continua no DOM com o "Agora" em R$ 454,05;
  - o texto do motivo aparece literal, com o e-mail;
  - `document.activeElement` é o aviso, e não houve toast.

  Com o código antigo, o aviso sumia no clique e o caso cairia. Com o foco fora do aviso, a régua do foco cairia. Sem a prop `codeEmail`, a do texto cairia.
- **O par**: `CheckoutPage.test.tsx:2223`. Sem o valor mudado, o 409 abre o desafio sem o aviso e sem a frase. **Morde.** Ele recusa uma frase que aparecesse sempre, ligada só a `identity === 'challenge'`, fora do ramo do aviso.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Manter o 409 do servidor e consertar o ramo condicional do Esperado: quando o código é pedido, a tela diz por quê e o total novo fica à vista | sim | O Esperado do bug: "Se o código for mesmo necessário, a tela diz que ele é pedido porque o pedido anterior criou a conta, e mantém o novo total à vista". O Contrato só nomeia arquivos da loja. A regra IDN-08 está viva no `catch` do `NeedsOtpError` (`CheckoutPage.tsx:590`) | sim. O diff só toca os dois arquivos declarados e o teste |
| 2 | O aviso fica de pé até o pedido novo existir: `setPriceChanged(null)` depois do `createOrder` | sim | Os dois caminhos depois do `createOrder` continuam certos: o PIX navega (`:620`), e o cartão segue para o pagamento, onde um novo `PriceChangedError` volta a pôr o aviso (`:667`). Em toda falha de criação (409, retirada, toast) o aviso fica de pé, e o texto dele continua verdadeiro. "Voltar à sacola" continua limpando. Os casos existentes do cartão e da oferta do checkout (`:2105`, `:2131`) não asserem que o aviso some no clique | sim |
| 3 | O texto é derivado na renderização (`identity === 'challenge'` com o aviso de pé), sem estado novo | sim, com uma ressalva que não vira achado | Ao entrar, a sessão vence o e-mail em `resolveCheckoutIdentity` (`:236`), e a frase some. Ressalva: `challengeEmail` também é preenchido pelo `onChallenge` do `ContactBlock`, na consulta feita no blur (`:770`). Se, com o aviso de pé, a convidada trocar o e-mail por **outro** que já tinha conta, a frase "O seu primeiro pedido criou uma conta… com {e-mail}" sai falsa. É um caminho raro, que a tarefa não pede. O "sempre" da premissa vale para o mesmo e-mail | sim |
| 4 | O foco vai para o próprio aviso (`tabIndex={-1}`), e não para o campo do código | sim | O campo mora no `ContactBlock` e no `CheckoutSignInChallenge`, fora do Contrato. O Observado do bug reclama do foco no `<body>`, e o teste prova que o foco agora está no aviso | sim |
| 5 | Texto impessoal | sim | O CLAUDE.md da raiz, na seção *Estado conhecido*, diz: "Mensagem técnica ('Não foi possível…') fica impessoal." A frase não tem tom festivo nem urgência. O teste cola a frase literal, que é o que o reteste da QA vai ler | sim |

## Não conferido

- O vermelho do teste antes do conserto e o verde de agora: não rodei testes. O que está acima vem da leitura das asserções.
- O desenho em 390 × 844 com a fonte a 200 %: o parágrafo novo dentro do aviso, o `break-all` no e-mail longo e o anel de foco no `<section>`. Isso só um navegador mede, e é da Validation e da QA.
- Os três arquivos aparecem como ` M` no `git status`, com baseline no diff. Nada nas mudanças sai do que esta tarefa explica.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/CLAUDE.md` (o da raiz do repositório, que veio inteiro no contexto) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines e Estado conhecido · `apps/store/CLAUDE.md` › Carrinho, chrome e checkout e O checkout NÃO exige conta (feature `49`), mais o índice de títulos. As outras seções citadas pela tarefa (Compre Junto, botão único, sacola v4, Minha conta), o `packages/core/CLAUDE.md` e o `.specs/LESSONS.md` (L-013..L-015) não foram lidos: o diff não toca nada que eles governam.

## T19 — wi-impl-task · review · agente ac3c5710e1224bea9

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/19-bug-14-cupom-no-pedido-recalculado.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O recálculo do `create-payment` passa a gravar `orders.discount = totals.couponDiscount`, ao lado de subtotal, PIX, total e os descontos por item. O valor vem do mesmo `resolveOrderPricing` que já decide o Total. | Reconstruir o cupom à parte, ou mudar a leitura nas quatro telas (loja, painel, app, e-mail). | A loja grava `discount: totals.couponDiscount` na criação (`buildOrderPayload.ts:186`), pela mesma função. Regravar a coluna faz o pedido ter um dono só, e as quatro telas já leem `orders.discount`. A causa estava só na escrita. | As quatro telas que leem `orders.discount`, que passam a mostrar o cupom recalculado. Pedidos antigos não mudam (não houve escrita em banco). |
| 2 | Quando o cupom deixa de valer no pagamento (expirou ou esgotou), o recálculo grava `discount = 0`. O mesmo vale quando uma promoção vence o cupom (`AD-015`). | Manter o `discount` da criação nesses casos. | Nesses casos o Total cobrado já foi calculado sem o cupom. Manter o valor antigo produziria o mesmo resumo que não fecha, que é este bug. `coupon_code`/`coupon_id` continuam gravados, como antes. | O resumo de um pedido cujo cupom expirou antes do pagamento mostra cupom 0 (ou esconde a linha, conforme a tela). |
| 3 | O caminho da proposta (`chargeProposal`, a regravação perto da linha 1248) não foi tocado. | Gravar `discount` também ali. | Lá o cupom vem travado da proposta, não é recalculado, e a regravação não mexe nele. Esse caminho não tem o bug. | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | BUG-014: com cupom percentual e o desconto casado subindo de 10 % para 20 %, o pedido é regravado com o cupom sobre o subtotal novo (44,22, não os 45,01 da criação). O Total cobrado é 397,98. | unidade do handler (edge function, dublê de supabase/fetch) | `supabase/functions/mercado-pago/__tests__/buyTogetherCharge.test.ts` › "com cupom percentual, a dona subiu o percentual: a linha do cupom é regravada sobre o subtotal novo" | sim (reprovou antes do conserto, só por `discount` ausente) | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

supabase/functions/mercado-pago/handlers.ts alterado
supabase/functions/mercado-pago/__tests__/buyTogetherCharge.test.ts alterado
supabase/functions/mercado-pago/__tests__/handlers.test.ts alterado

## Verificação

- `pnpm --filter @estrelinha/functions exec vitest run mercado-pago/__tests__/buyTogetherCharge.test.ts --testTimeout=20000` (comando de um arquivo, do `PROJECT.md`). Antes do conserto: 1 reprovado, por `discount` ausente. Depois: 13/13, exit 0.
- `... vitest run mercado-pago/__tests__/handlers.test.ts` (mesma fonte). Com o conserto, 29 casos reprovaram: as asserções `toEqual` estritas do `update` de `orders` não tinham a coluna nova. Elas ganharam `discount` com o valor certo de cada cenário (0,74 · 0,98 · 1,72 · 0, conforme os comentários de conta que já estavam nos casos), sem afrouxar nada. Depois: 164/164, exit 0.
- `... vitest run mercado-pago/__tests__/proposalCharge.test.ts`: 20/20, exit 0.
- Verificação mínima (`CLAUDE.md` §Baselines, a suíte do workspace tocado): `pnpm --filter @estrelinha/functions test --testTimeout=20000` deu 1462/40, exit 0, sem pipe.
- Tipos: não se aplica. Só `supabase/functions` mudou, e `CLAUDE.md` diz que o `tsc` não alcança as functions (`esm.sh` + Deno): a linha de Tipos da baseline não tem projeto para elas. `packages/core` não foi tocado. Contra o baseline, nada mudou.
- Instruções lidas: `CLAUDE.md` › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` › índice e "Dinheiro — a regra que não muda por acaso" (arquivo de 46 KB, lido pelo índice e pela seção de alcance geral que a tarefa toca); `supabase/CLAUDE.md` › Edge functions, `mercado-pago`; `.specs/LESSONS.md` › L-013, L-014, L-015 (títulos); `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local.

## Divergências e descobertas

- A causa estava no arquivo que o Contrato aponta: o `update` de `orders` em `createPayment` regravava subtotal, PIX, total e os três descontos por item, mas não a linha do cupom (`discount`). `packages/core/src/payment/**` não foi alterado.
- Cada asserção `toEqual` estrita de `handlers.test.ts` sobre a gravação do pedido (cinco pontos, dois deles helpers) ganhou a coluna `discount`. É mudança de valor gravado, não afrouxamento: com isso, uma coluna extra continua quebrando o teste.
- `packages/core/CLAUDE.md` foi lido pelo índice e pela seção "Dinheiro", não por inteiro (46 KB), pela regra do arquivo grande.
- O pedido #0381 do banco local não foi regravado, como a tarefa manda. O comportamento novo vale para o próximo recálculo. Não houve prova contra o banco local: o bloco Testes pede só o teste de unidade.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 19
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz) › O "defeito 01", Alias de import, Convenções, Os guardas, Baselines; packages/core/CLAUDE.md › índice + Dinheiro; supabase/CLAUDE.md › Edge functions, mercado-pago; .specs/LESSONS.md › L-013, L-014, L-015; .specs/project/PROJECT.md › Comandos de verificação, Ambiente local
Testes escritos: BUG-014 (cupom regravado sobre o subtotal com o desconto casado novo) — supabase/functions/mercado-pago/__tests__/buyTogetherCharge.test.ts, reprovou antes do conserto; nada ficou sem cobertura
Verificações: buyTogetherCharge 13/13, handlers 164/164, proposalCharge 20/20; suíte de @estrelinha/functions 1462/40, exit 0; tipos não se aplicam (functions fora do tsc, core não tocado)
Árvore de trabalho: supabase/functions/mercado-pago/handlers.ts (grava `discount: totals.couponDiscount` no recálculo); __tests__/buyTogetherCharge.test.ts (caso novo + cenário com `cupom`, e `discount: 0` no toEqual existente); __tests__/handlers.test.ts (coluna `discount` nas asserções estritas da gravação); nada commitado
Citações conferidas: 2 (handlers.ts e o diretório __tests__ do Contrato); nenhuma deslocada nem morta
```

## T19 — wi-impl-review · done · agente a8634a3e1a735d2fa

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/19-bug-14-cupom-no-pedido-recalculado.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a reprodução de BUG-014 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto | `supabase/functions/mercado-pago/handlers.ts:791-793`: o `update` de `orders` no recálculo passa a gravar `discount: totals.couponDiscount`, que vem do mesmo `resolveOrderPricing` que decide o Total. Teste: `buyTogetherCharge.test.ts`, caso "com cupom percentual, a dona subiu o percentual…" | sim. Que ele reprovou antes do conserto só a execução mostra; pela leitura, o `toMatchObject` exige a chave `discount: 44.22`, e sem o conserto a gravação não tem essa chave |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | o mesmo caso novo em `buyTogetherCharge.test.ts` | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. Itens de `Não faça` conferidos no diff:
- `qa/issues/` não foi tocado.
- Nenhum outro bug foi corrigido.
- A Adesão não foi tocada.
- `packages/core/src/payment/**` não foi alterado: o diff fica só nos três arquivos de `supabase/functions/mercado-pago/`.
- Não houve escrita de dado no banco.

## Testes

- **BUG-014 (cupom regravado sobre o subtotal novo)**, em `supabase/functions/mercado-pago/__tests__/buyTogetherCharge.test.ts`. O caso novo monta um cupom de 10 % válido e um pedido criado com `discount: 45.01`, e sobe o casado para 20 %. Depois assere o valor cobrado (`397.98`) e a gravação do pedido com `subtotal 442.2`, `discount 44.22`, `buy_together_discount 15.8` e `total 397.98`.
  - A asserção morde: o valor gravado na criação (45,01) difere do recalculado (44,22), como pede a L-013, e sem o conserto a chave `discount` não existe na gravação.
  - Os testes que já existiam ganharam `discount` no objeto esperado: 0 sem cupom, e o cupom recalculado com cupom. Nos casos de cupom expirado, ainda não vigente ou esgotado, `expectCharged` passa a exigir `discount: 0` pelo default. Isso cobre a premissa 2 sem ter sido pedido.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O recálculo grava `orders.discount = totals.couponDiscount`, vindo do mesmo `resolveOrderPricing` | sim | `apps/store/src/features/checkout/lib/buildOrderPayload.ts:186` grava `discount: totals.couponDiscount`, a mesma fonte. Em `handlers.ts:718`, `totals = pricing.totals` vem do mesmo cálculo que define `total` | sim. Nas migrations, `orders.discount` só aparece na criação da tabela (`20260415090935`); quem lê a coluna são as telas, como ele declarou |
| 2 | Cupom inválido no pagamento, ou vencido por uma promoção, grava `discount = 0` | sim | `handlers.ts:683-687`: com o cupom inválido, `coupon` fica indefinido e `resolveOrderPricing` devolve `couponDiscount` 0, o mesmo valor com que o Total foi calculado. É coerente com a regra de que o pedido tem um dono só. Os testes de cupom fora da validade asserem `discount: 0` | sim |
| 3 | O caminho da proposta (`chargeProposal`) não foi tocado | sim | `handlers.ts:1247-1253`: o comentário e o `update` dizem que `discount` é gravado pela RPC a partir da proposta e não é recalculado. Regravá-lo ali seria um segundo autor | sim, nenhum |

## Não conferido

- Que os testes passam e que o caso novo reprovou antes do conserto: só a execução mostra, e eu não rodo testes.
- A aritmética da fixtura do teste novo. O comentário diz "300 + 71,10 + 79 = 450,10", mas o 458,00 cheio só aparece implícito no subtotal de 442,20. É redação, não achado.
- Os três arquivos de `alterados` aparecem em `git status` como `M`, então o diff tem baseline.

Instruções lidas:
- `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/CLAUDE.md` (raiz): O "defeito 01", Alias de import, Convenções, Os guardas, Baselines, pelo contexto carregado.
- `supabase/CLAUDE.md` › Edge functions, › `mercado-pago`.
- `packages/core/CLAUDE.md`: só o índice de títulos.
- `.specs/LESSONS.md` › L-013, L-014, L-015: só os títulos.

## T20 — wi-impl-task · review · agente a35595892657c69e3

Tarefa: .specs/work-items/92-desconto-da-compra-casada/tasks/20-bug-6-previa-da-lista-pula-o-que-a-loja-pula.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A prévia da lista agora chama `resolveAddons` de `@estrelinha/core/buy-together`, a mesma função que a página do produto (`useBuyTogether`) chama. A nova `precosDaListaNestaJoia` em `discountPreview.ts` monta a entrada dela (adicionais na ordem do rascunho, listas, peças) e lê os preços das peças resolvidas: o `precoBase` quando a peça é simples, ou os preços das `variantIds` vendáveis. A antiga `pecasDaListaNestaJoia` (que só chamava `claimPieces`) foi apagada. | Acrescentar um filtro de estoque à mão no painel, o que seria uma segunda escrita da regra (o "defeito 01"). Também descartei levar uma função nova para `core`, porque `resolveAddons` já existe e é a regra pública. | A decisão da tarefa pede que a prévia pule exatamente o que a loja pula, e a forma de garantir isso é chamar a regra da loja, não copiá-la. | `discountPreview.ts` e `BuyTogetherTab.tsx`. Nenhuma tarefa seguinte cita esses símbolos. |
| 2 | Em `PecaDaLista` (`useBuyTogetherLists.ts`), troquei `variacoes` por `produto: PieceProduct \| null`, normalizado com `normalizeOptions`, `normalizeVariants` e `toStockPolicy` de `@estrelinha/core/product`, as mesmas funções do `mapDbToProduct` da loja. O `LIST_ITEM_COLUMNS` passou a pedir `stock_policy, stock_total, options` e `stock, position` nas variações. | Manter `variacoes` ao lado de `produto`: seriam duas fontes para a mesma prévia. | `variacoes` só servia à prévia (conferido por grep). A peça tem de chegar na forma que a regra lê. | A leitura das listas do painel (`/admin/compre-junto` e a aba do produto). A consulta pede três colunas a mais e dois campos a mais por variação, todos já existentes no schema. A forma da leitura não foi provada contra o banco local. |
| 3 | A peça inativa (`ativa: false`) não é passada a `resolveAddons`. | Passá-la e deixar a regra decidir. | Na loja quem esconde essa peça é a RLS, e `resolveAddons` só pula o que a leitura não trouxe. O painel lê a peça inativa, então precisa tirá-la antes. | Só a prévia. |
| 4 | Passei `mainVariantId: null`: a prévia não aplica o "some quando". | Calcular uma prévia por variação do principal. | A prévia é da joia, não de uma variação dela. | Só a prévia. Numa joia com "some quando", a faixa pode incluir um adicional que some numa variação. |
| 5 | A peça avulsa só disputa a peça de uma lista quando aparece nos dados das listas. A forma dela vem da própria lista, com as `targetVariantIds` do adicional avulso. Se a avulsa estiver esgotada, a lista fica com a peça, como na loja (antes o painel tirava a peça da lista mesmo com a avulsa esgotada). | Ler cada avulsa por `useProductVariants` dentro da linha da lista. | A avulsa só afeta a faixa de uma lista quando está nessa lista. | Só a prévia. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | BUG-006: numa lista, a faixa pula a peça sem variação à venda, a peça simples sem saldo e a variação esgotada, como a loja. Antes do conserto o teste reprovou com "de R$ 9,00 a R$ 63,00"; o esperado é "de R$ 22,50 a R$ 45,00". | página real (`AdminProductFormPage`, banco em memória) | `apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx` › "numa lista, a faixa pula a peça sem variação à venda e a variação esgotada, como a loja" | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92

## Arquivos alterados

apps/backoffice/src/features/buy-together-lists/api/useBuyTogetherLists.ts alterado
apps/backoffice/src/features/product-form/model/discountPreview.ts alterado
apps/backoffice/src/features/product-form/ui/BuyTogetherTab.tsx alterado
apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/backoffice exec vitest run src/pages/admin/AdminProductFormPage.compreJunto.test.tsx --testTimeout=20000` (fonte: `PROJECT.md` › Comandos de verificação): antes do conserto, 1 reprovado de 36 (o caso novo); depois, 36 de 36, exit 0.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (fonte: `CLAUDE.md` › Comandos): exit 2, com 7 erros, todos em `apps/backoffice/src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (TS2593/TS2304: `describe`, `it` e `expect` sem tipos). Esse arquivo é do commit `4c6e9a16`, anterior ao WI, e eu não o toquei. O orquestrador não mandou baseline e eu não rodei a conferência antes da primeira fatia; tomo esses erros como herdados. Nenhum erro está em arquivo meu.
- Verificação mínima (fonte: `CLAUDE.md` › Baselines; `PROJECT.md`: a suíte do workspace tocado mais a da loja quando o painel muda):
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: 5118/282, exit 0 (fora de pipe).
  - `pnpm --filter @estrelinha/store test --testTimeout=20000`: 6997/373, exit 0 (fora de pipe).

Instruções lidas:
- `CLAUDE.md` › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines
- `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, Pureza, Os módulos, Convenções de tipo (o arquivo tem 46 KB; li o índice e estas seções, não o inteiro que a tarefa pede)
- `apps/backoffice/CLAUDE.md` › Molde dos formulários, Compre Junto › Listas, Compre Junto › Adesão, Compre Junto › a aba "Compre junto" do produto
- `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto (as seções Carrinho, chrome e checkout, A sacola v4 e Minha conta não foram lidas por inteiro)
- `.specs/LESSONS.md` › L-013, L-014, L-015
- `.specs/project/PROJECT.md` › Comandos de verificação, Ambiente local

## Divergências e descobertas

- A causa não estava só em `discountPreview.ts`: a leitura das listas (`useBuyTogetherLists.ts`) não trazia estoque, política nem eixos. Ela foi alterada também, fora dos três arquivos do Contrato, como a tarefa permite.
- A forma nova da leitura (as colunas embutidas `stock_policy, stock_total, options` e `product_variants(..., stock, position)`) não foi provada contra o Supabase local. O teste usa um dublê que ignora o `select`. Fica para a Validation/QA conferir no ambiente local (`AD-012`).
- Fora do escopo do BUG-006 e não alterado: a prévia de um adicional de peça só (avulso) continua usando `precosDaPeca`, que não pula variação esgotada. Na loja `resolveAddons` pula. Com uma variação liberada esgotada, a prévia do avulso ainda pode anunciar um preço que a loja não oferece.
- Desde que `4c6e9a16` entrou na árvore, o `tsc` do painel não está em 0 (os 7 erros acima, em arquivo de teste), embora a baseline do `CLAUDE.md` diga 0.
- O arquivo temporário padrão (`$TMPDIR/wi-impl-saida.txt`) é compartilhado com a tarefa 19, que roda em paralelo: uma leitura minha pegou a saída de outra execução. Passei a gravar no scratchpad da sessão.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 20
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, por seções), packages/core/CLAUDE.md (por seções), apps/backoffice/CLAUDE.md (por seções), apps/store/CLAUDE.md (por seções), .specs/LESSONS.md (L-013..L-015), .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: BUG-006 — apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx › "numa lista, a faixa pula a peça sem variação à venda e a variação esgotada, como a loja" (reprovou antes do conserto com "de R$ 9,00 a R$ 63,00"; passa com "de R$ 22,50 a R$ 45,00"). Sem lacuna de cobertura no bloco Testes.
Verificações: arquivo de teste 36/36 verde; suíte do backoffice 5118/282 exit 0; suíte da loja 6997/373 exit 0; tsc do backoffice com 7 erros herdados em ProposalStateBadge.test.tsx (commit 4c6e9a16, fora desta tarefa), nenhum erro novo
Árvore de trabalho: useBuyTogetherLists.ts (a peça da lista na forma de PieceProduct, com estoque e eixos), discountPreview.ts (precosDaListaNestaJoia chama resolveAddons de core), BuyTogetherTab.tsx (fiação), AdminProductFormPage.compreJunto.test.tsx (caso novo); nada commitado
Citações conferidas: 3 (as três linhas do Contrato); nenhuma deslocada e nenhuma morta. A causa morava também em useBuyTogetherLists.ts, fora do Contrato
```

## T20 — wi-impl-review · done · agente a55bbb171a4560e9b

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/tasks/20-bug-6-previa-da-lista-pula-o-que-a-loja-pula.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a reprodução de BUG-006 dá o Esperado, provado por um teste que reprovou antes do conserto | `discountPreview.ts` `precosDaListaNestaJoia`: chama `resolveAddons` de `core/buy-together`, a mesma regra que `useBuyTogether.ts:168` da loja usa. Teste novo em `AdminProductFormPage.compreJunto.test.tsx:715` ("a faixa pula a peça sem variação à venda e a variação esgotada, como a loja") | sim no código; o vermelho antes do conserto é só execução |
| cada comportamento do bloco `Testes` coberto por um teste escrito | o mesmo caso, pela página real | sim |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima do arquivo de instruções | — | só execução |

## Obrigações

A tarefa não tem bloco `Obrigações`. A decisão "a prévia pula as mesmas peças que a loja pula, sem uma segunda escrita da regra" está cumprida. O painel não guarda mais nenhum filtro próprio: a peça fora do ar, a sem variação à venda, a variação esgotada ou não liberada, a própria joia e a peça avulsa são decididas por `resolveAddons` (`packages/core/src/buy-together/availability.ts:155`).

## Testes

- BUG-006 (a prévia pula o que a loja pula): `AdminProductFormPage.compreJunto.test.tsx:715`. **A asserção morde.** Ela cobra a frase exata "de R$ 22,50 a R$ 45,00", e cada uma das três peças que a loja pula mudaria esse número se entrasse na faixa:
  - a Corrente Esgotada (20, estoque 0) puxaria o piso para R$ 18,00;
  - a Corrente Sem Saldo (10, `stock_total` 0, `track`) puxaria o piso para R$ 9,00;
  - a Ouro esgotada do Pingente (70) puxaria o teto para R$ 63,00.

  O teste roda na página real, sobre o banco em memória, e passa pela leitura `lerListas`. Fica provada a fiação inteira: a leitura entrega `produto`, a aba o lê e a regra de `core` decide. Os casos antigos continuam com as asserções intactas: avulsa vence a lista, a ordem entre listas, a faixa simples.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | A prévia chama `resolveAddons`; `pecasDaListaNestaJoia` foi apagada | sim | É o que a decisão da tarefa pede ("reusá-la ou compartilhá-la"), e é a mesma chamada de `apps/store/src/entities/product/model/useBuyTogether.ts:168`. O `packages/core/CLAUDE.md` põe `resolveAddons` como a regra pública. `grep` não acha mais nenhum consumidor do símbolo apagado | sim. Só `BuyTogetherTab.tsx:407` chamava |
| 2 | Em `PecaDaLista`, `variacoes` foi trocado por `produto: PieceProduct \| null`, normalizado como na loja; a consulta pede colunas a mais | sim | Os outros `.variacoes` do painel são de outra coisa: `ListItemRow.tsx:47` e `BuyTogetherTab.tsx:212` leem `useProductVariants`, e `order-proposal` usa outro tipo. As colunas pedidas existem no schema (`stock_total` em `20260726000000_products_extended_fields.sql`; `options`, `stock_policy` e `stock`/`position` das variações são lidos pela loja). `hasGrid` precisa de `options`, e elas vêm na consulta | sim. `LIST_ITEM_COLUMNS` só é usado em `useBuyTogetherLists.ts:83` |
| 3 | A peça inativa não é passada à regra | sim | O cabeçalho de `availability.ts` diz que "saiu do ar" é o que a leitura não devolveu (a RLS esconde). Como o painel lê a peça inativa, tirá-la antes reproduz o que a loja recebe | sim |
| 4 | `mainVariantId: null` (o "some quando" não é aplicado) | sim | Com `null`, `resolveAddons` não esconde adicional nenhum, e é o mesmo caminho que a loja segue sem variação escolhida. A regra anterior também não aplicava o "some quando". Nada na tarefa pede prévia por variação | sim, e o limite está declarado |
| 5 | A avulsa só disputa a peça de uma lista quando aparece nos dados das listas; se esgotada, a lista fica com a peça | sim | Em `resolveAddons`, uma avulsa sem `pieceOf` não reivindica nada (`claimPieces` recebe a lista vazia). Se a peça não está em nenhuma lista, não há disputa a resolver. A forma vinda da lista é o mesmo produto, e `pieceOf` usa as `targetVariantIds` do adicional. Bate com a loja | sim |

## Não conferido

- O teste ter reprovado antes do conserto, e a suíte passar: isso só a execução mostra. Eu não rodo teste.
- A forma da consulta nova contra o banco local (o embed com `stock_policy, stock_total, options` e `stock, position` nas variações). O implementador também declara que não provou. Conferi só que as colunas existem nas migrations e são lidas pela loja.
- Os quatro arquivos de `alterados` aparecem como ` M` no `git diff`, então há baseline. Nada ficou sem prova por falta dela.
- Fora do escopo: a loja esconde o bloco inteiro quando a joia principal está esgotada (`mainSoldOut`). A prévia não considera isso. A tarefa não pede.

Instruções lidas: `CLAUDE.md` (raiz, carregado no contexto: O "defeito 01", Alias de import, Convenções, Os guardas, Baselines); `packages/core/CLAUDE.md` › a linha `./buy-together` da tabela de módulos; `apps/backoffice/CLAUDE.md` › Compre Junto › Listas, Compre Junto › Adesão, Compre Junto › a aba "Compre junto" do produto; `apps/store/CLAUDE.md` › a seção do Compre Junto, por `grep` de `resolveAddons`. Não li: `apps/backoffice/CLAUDE.md` › Molde dos formulários, nem `.specs/LESSONS.md` › L-013..L-015. Nenhuma das duas governa o que o diff toca.
