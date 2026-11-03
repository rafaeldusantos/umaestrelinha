# Log da implementação por ondas — WI-01

## T01 — wi-impl-task · review · agente a46e6d20c2f157497

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/01-listas-do-compre-junto.md
Situação: fechou

## Aborto
nada

## Decisões e premissas
| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Nomes das tabelas e da view: `buy_together_lists`, `buy_together_list_items`, `product_buy_together` (adicionais) e `buy_together_list_usage`. Migration `20261105120000_compre-junto.sql`. | `product_addons`, `list_usage` | Segue o vocabulário do Work Item. O prefixo foi apurado na hora (o último era `20261104140000`). | As tarefas 02, 03, 06 e 07 consomem estes nomes. A 02 e a 06 devem ler o schema da migration. |
| 2 | Nenhum `revoke` nem `grant` a `anon`. O `select` do anon vem do privilégio padrão do schema. A leitura é uma policy `for select to anon, authenticated using (true)` por tabela, e a escrita uma policy `for all to authenticated` com `has_role` no `using` e no `with check`. | `revoke all from anon` seguido de `grant select` | A obrigação é "nenhum `grant` a `anon`", e o precedente de `product_faqs` faz assim. O guarda recusa qualquer `grant` a `anon`. | Só a migration e o guarda `compreJuntoSchema`. |
| 3 | O teto de 12 peças por lista é `position` 0..11 numa chave única `(list_id, position)` `deferrable initially deferred`. O limite de 3 adicionais por joia é `position` 0..2 com chave única `(product_id, position)`, também adiada. | Trigger de contagem; chave única comum, que impediria trocar duas posições numa gravação | O banco assume o teto sem trigger. A chave adiada deixa reordenar com `upsert`. | A tarefa 02 grava `product_buy_together` respeitando as posições 0..2. |
| 4 | `variant_ids`, `target_variant_ids` e `hidden_on_variant_ids` são `uuid[] not null default '{}'` sem FK. Vazio significa "todas as ativas". | FK com cascata | Decisão #11 da tarefa: a cascata deixaria zero linhas e a peça passaria a valer todas. | A loja (07) e o `checkout` (03) devem pular a peça cujas variações liberadas não existem mais. |
| 5 | A view `buy_together_list_usage` devolve uma linha por (lista, joia que a usa), com `product_name` e `product_slug`. Filtra `kind = 'list'`. | Coluna de contagem; view já agregada | A view não é um segundo dono do número. A contagem e os nomes saem da mesma leitura. | A tarefa 02 usa a view para mostrar o uso. |
| 6 | O `save` do painel tira as peças que saíram antes de gravar as novas com `upsert`. A nova lista é inserida com `.insert().select('id').maybeSingle()`. | `.single()`; apagar tudo e reinserir | A posição é única na lista, e uma peça que saiu ainda ocupa a posição de quem entra no lugar dela. O dublê de teste só tem `maybeSingle`. | Só a feature `buy-together-lists`. A gravação não é atômica: falha no meio deixa estado parcial, e a tela mostra a recusa. |
| 7 | `ProductSearchField` ganhou a prop opcional `bloquearForaDoAr` (padrão desligado). Ligada, a peça fora do ar vira linha desabilitada "Fora do ar". | Componente novo; mudar o comportamento para todas as superfícies | O design pede o resultado desabilitado com motivo. Nas outras superfícies escolher peça despublicada continua legítimo. | As outras quatro superfícies da busca não mudam. A tarefa 02 pode reutilizar a prop. |
| 8 | Rotas: `/admin/compre-junto` (item "Compre Junto" em Catálogo, entre Filtros da loja e a Biblioteca), `/admin/compre-junto/listas/nova` e `/admin/compre-junto/listas/:id`. Só o índice entra em `navGroups`. | Aba "Adesão" no índice | A aba "Adesão" é da tarefa 06. O índice mostra só "Listas (N)". | A tarefa 06 acrescenta a aba. A 07 usa a navegação deste menu. |
| 9 | "A partir de R$ X" usa `base_price` da peça. "Ver as N joias" e os nomes do "Em uso" saem sem destino de link. O "Como a cliente vê" é só texto, sem desenho. | Menor preço entre as variações; desenhar o bloco no painel | O design diz que o destino dos links "Em uso" não é mostrado. Desenhar o bloco no painel seria um segundo desenho da loja (`AD-019`). | Nenhum. |
| 10 | O contador do nome usa o `CharCounter` existente, que mostra `9/40`, e não "n / 40". O campo tem `maxLength=40`. | Contador próprio | O guarda `contadorComDonoUnico` recusa a sexta escrita do contador. | Nenhum. |

## Fatias
`Mutação`: `—` = a fatia passou pelo vermelho. Escrevi a implementação e o teste na mesma passada, então onde o verde veio de primeira a coluna traz o check feito.
| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Os tetos 3, 12 e 40 são constantes e cada recusa devolve o texto escrito. Recusam: 4º adicional, 13ª peça, nome vazio ou acima de 40, lista sem peças usada, apagar lista em uso (3 nomes e "e outras") e o principal como adicional. A recusa do produto repetido também. | unidade | `packages/core/src/buy-together/__tests__/rules.test.ts` | sim | vermelho (2 testes caíram quando troquei `>` por `>=` em `listItemCountRefusal` e em `listDeleteRefusal`; restaurei pela cópia, `cmp` ok) |
| 2 | Pureza e alcance do Deno: nenhum import de pacote e todo relativo com `.ts`. Âncora de 3 arquivos e 3 sensores. | guarda que lê disco | `packages/core/src/buy-together/__tests__/purity.test.ts` | sim | `não se aplica` (a régua é de leitura de disco, e os sensores injetam o defeito) |
| 3 | A migration respeita o contrato: `if not exists`, `restrict` do vínculo, `check`s de posição, tipo e limites importados de `core`, as duas FKs nomeadas, variações sem FK, RLS, ausência de `grant` a `anon`, `security_invoker` e nenhum dado. Uma régua por comando. | guarda que lê disco | `apps/store/src/shared/lib/__tests__/compreJuntoSchema.test.ts` (21 testes) | sim | `—`. Cada asserção tem sensor por `mutar()`, que lança. O sensor da policy carrega o nome da tabela, porque os corpos são idênticos. |
| 4 | Probe no banco local: anônimo lê e não escreve; escrita só do admin; as quatro leituras respondem; nome vazio ou de 41 recusado; posição 12 e 3 recusadas; tipo e alvo incoerentes recusados; embed pelas duas FKs nomeadas responde 200; a view nomeia a joia; apagar lista em uso dá 409; as peças saem em cascata. | integração no banco local | `.specs/work-items/WI-01-compre-junto/probes/01-listas.sh` (19 `ok —`, falhas 0) | sim | `não se aplica` (sobe o banco local) |
| 5 | Contas do rascunho: acrescentar, recusar a 13ª, mover, arrastar, tirar, liberar variações, as linhas a gravar e a comparação. | unidade | `apps/backoffice/src/features/buy-together-lists/model/__tests__/draft.test.ts` (12) | sim | não feito. Quem cobre o que o rascunho faz na tela é o teste 6, onde os mutantes morreram. |
| 6 | Tela de Listas pela página real: índice com "em N joias", aviso e vazio; erro de leitura; criar; contador e Salvar desabilitado sem nome; lista vazia salvável; busca com "Já está na lista" e "Fora do ar"; 13ª recusada; Subir/Descer; arrastar; tirar; liberar variações e "Oferecer todas"; peça fora do ar marcada; "em uso" com até 4 nomes; excluir em uso recusado nomeando 3 joias e "e outras"; excluir sem uso; o `23503` do banco virando a frase acionável. | página real (client dublado) | `apps/backoffice/src/pages/admin/AdminBuyTogether.test.tsx` (18) | sim | vermelho nos 3 mutantes injetados: `listDeleteRefusal` ignorada, `disabled` do "Subir" removido e `bloquearForaDoAr` virando falso. Os três arquivos restauraram pela cópia (`cmp` ok). |
| 7 | Rota fora do guarda reprova, nav, foco e movimento com par `motion-reduce:` (guardas existentes estendidos) | guardas existentes | `navItems.test.ts` (lista de Catálogo e caso novo do Compre Junto), `animacaoRespeitaMovimento.test.ts` (escopo com `ListItemRow.tsx`, âncoras 54→58 tokens e 26→28 pares), `rotasSobGuarda` e `focusRoutes` (passam sem mudar) | sim | — |

## Repositórios tocados
/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

## Arquivos alterados
- `supabase/migrations/20261105120000_compre-junto.sql` criado
- `packages/core/src/buy-together/index.ts`, `rules.ts`, `types.ts` criados
- `packages/core/src/buy-together/__tests__/rules.test.ts`, `purity.test.ts` criados
- `packages/core/package.json` alterado (entrada `./buy-together`)
- `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`, `apps/backoffice/CLAUDE.md` alterados (documentação da tarefa)
- `packages/supabase/src/types/buyTogether.ts` criado
- `packages/supabase/src/types/index.ts` alterado
- `apps/store/src/shared/lib/__tests__/compreJuntoSchema.test.ts` criado
- `apps/backoffice/src/features/buy-together-lists/` criado: `index.ts`, `model/draft.ts` e `model/__tests__/draft.test.ts`, `api/useBuyTogetherLists.ts`, `ui/ListItemRow.tsx`, `ui/BuyTogetherListEditor.tsx`, `ui/BuyTogetherListsIndex.tsx`
- `apps/backoffice/src/pages/admin/AdminBuyTogetherPage.tsx`, `AdminBuyTogetherListPage.tsx`, `AdminBuyTogether.test.tsx` criados
- `apps/backoffice/src/entities/product/ui/ProductSearchField.tsx` alterado (prop `bloquearForaDoAr`)
- `apps/backoffice/src/app/App.tsx` alterado (3 rotas)
- `apps/backoffice/src/widgets/admin-layout/model/navItems.ts` alterado (item "Compre Junto"), `navItems.test.ts` alterado
- `apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts` alterado
- `.specs/work-items/WI-01-compre-junto/probes/01-listas.sh` criado

## Verificação
- `pnpm install --offline --frozen-lockfile`: o worktree não tinha `node_modules`. O arquivo de instruções não declara esse passo; foi o único jeito de rodar os comandos de verificação. Exit 0.
- Tipos, `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (arquivo de instruções): baseline 0 e depois 0. Um erro TS2352 que eu mesmo introduzi no teste foi corrigido.
- Tipos, `npx tsc --noEmit -p packages/core/tsconfig.json` (arquivo de instruções): baseline 11 e depois 11, mesmos arquivos e códigos.
- Um arquivo de teste: `pnpm --filter … exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md).
- Suíte do backoffice com `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (arquivo de instruções): 273 arquivos, 4975 testes, exit 0. Antes eram 4944/271 na baseline do arquivo de instruções.
- Suíte da loja (o painel mudou): 354 arquivos, 6662 testes, exit 0.
- Suíte do core: 209 arquivos, 5248 testes, exit 0.
- `eslint` nos arquivos novos e alterados do backoffice: limpo.
- `git diff --name-only -- packages/core/src/payment`: vazio.
- `supabase migration up --local` aplicou só a nova migration, no banco local, sem `--linked`.
- Probe `01-listas.sh`: 19 `ok —`, falhas 0.
- Instruções lidas: `CLAUDE.md` da raiz (inteiro, via o contexto carregado), `packages/core/CLAUDE.md › Quando um código pertence ao pacote, › Pureza, › Os módulos`, `supabase/CLAUDE.md › Migrations, › RLS — o molde que os guardas cobram`, `apps/backoffice/CLAUDE.md` (só o índice de títulos; li o código dos exemplares em vez das seções citadas, que não abri), `.specs/project/PROJECT.md › Comandos de verificação, › Ambiente local`.

## Divergências e descobertas
- Citações conferidas: 14 `Siga a forma de`, abertas ao usar. Nenhuma morta. As linhas aproximadas bateram pelo alvo nomeado: `faq` migration 60-82/107-114/154-194, `FeaturedProductsEditor` 62-74, `ProductSearchField` e `useProductVariants`, `App.tsx` e `navItems.ts`. Não abri `MenuTree.tsx` 380-485 nem `AdminFaqsPage` além do que usei; o "mover para cima/baixo" segue o molde pelo comportamento, não pelo código.
- Não li as seções de `apps/backoffice/CLAUDE.md` citadas pela tarefa (fornecedor, perguntas, produtos em destaque, busca, movimento). Li os exemplares de código e os cabeçalhos dos arquivos, que repetem as regras.
- A tarefa pede "aba Listas (com contagem) e aba Adesão". Entrei só o cabeçalho "Listas (N)", sem Radix tabs, porque a Adesão é da tarefa 06.
- Não fiz o "mover para cima/baixo" por teclado nem a alça de arraste no celular: a alça só aparece em `md` e acima, e os botões Subir/Descer cobrem teclado e toque, como o design diz.
- O probe foi escrito em `.specs/work-items/WI-01-compre-junto/probes/`, e não em `.specs/features/`, porque o Work Item usa esse diretório.
- A `ProductSearchField` mantém o contador "N no catálogo" e o limite de resultados dela. Não impus a regra "busca de 2 caracteres, até 8 resultados" do design. O componente existente já tem seu limite de desenho (teto de 20, `ProdutoDoPool`). Esse limite pertence ao dono único da busca, então não mudei.
- O dublê do teste exige `maybeSingle`. Se um dia o dublê ganhar `.single()`, o código pode voltar a ele.
- `baseline` de testes do arquivo de instruções (backoffice 4944/271, store 6501/347, core 5126/202) ficou desatualizada em relação ao disco de hoje (4975/273, 6662/354, 5248/209). Não atualizei: a tarefa não pede e a diferença vem de outros Work Items da árvore.
- Probes `.sh` e testes que dependem do banco rodaram contra o Supabase local compartilhado entre os worktrees (porta 54441). A migration foi aplicada nele e não será revertida, e as tarefas de outros worktrees verão as tabelas novas.
- Nenhum arquivo `tasks/` seguinte foi alterado. Afirmações de tarefas 02..07 que dependam de nomes (tabelas, view) devem ler a premissa 1; não houve afirmação contrária no repositório que eu tenha visto.
- Caducou: nada. Nenhuma tarefa de número menor existe.

## Ao humano
nada

## O que devolver no fim
Tarefa: 01
Caso: fechou limpo
Instruções lidas: `CLAUDE.md` (raiz); `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Os módulos; `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram; `apps/backoffice/CLAUDE.md` (só o índice de títulos); `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local
Testes escritos: unidade das recusas e tetos — `packages/core/src/buy-together/__tests__/rules.test.ts`; pureza e Deno — `packages/core/src/buy-together/__tests__/purity.test.ts`; schema da migration — `apps/store/src/shared/lib/__tests__/compreJuntoSchema.test.ts`; probe do banco local — `.specs/work-items/WI-01-compre-junto/probes/01-listas.sh`; rascunho das listas — `apps/backoffice/src/features/buy-together-lists/model/__tests__/draft.test.ts`; tela de Listas pela página real — `apps/backoffice/src/pages/admin/AdminBuyTogether.test.tsx`; guardas estendidos — `navItems.test.ts` e `animacaoRespeitaMovimento.test.ts` (`rotasSobGuarda` e `focusRoutes` passam sem edição). Sem cobertura: nenhuma peça do bloco `Testes`. A recusa do produto repetido e a do principal como adicional estão só em unidade, porque a tela de adicionais é da tarefa 02.
Verificações: tipos backoffice 0 (baseline 0) e core 11 (baseline 11, idênticos); suíte do backoffice 4975/273, da loja 6662/354 e do core 5248/209, todas exit 0; eslint limpo nos arquivos tocados; `payment/` sem diff; probe com 19 `ok —`
Árvore de trabalho: migration, `core/buy-together` (e entrada no `package.json`), tipos em `packages/supabase`, guarda de schema na loja, feature `buy-together-lists` no painel (índice, editor, rascunho, leitura e escrita), duas páginas, três rotas, item de nav, prop `bloquearForaDoAr` no `ProductSearchField`, três linhas de documentação nos `CLAUDE.md`, probe. Nada commitado.
Citações conferidas: 14 abertas ao usar; 0 deslocadas além do aceitável; 0 mortas.

## T01 — wi-impl-review · done · agente af602e8ec847dcbf6

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/01-listas-do-compre-junto.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| nada | | | | | |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| A dona cria, nomeia (até 40), ordena (arraste e mover) e salva uma lista de até 12 peças com variações liberadas; a 13ª é recusada com o texto do design | `BuyTogetherListEditor.tsx` (nome, `CharCounter`, `maxLength=40`, `acrescentar` → `addItem` → `listItemCountRefusal`) e `ListItemRow.tsx` (Subir/Descer, arraste, "Escolher quais"). Texto da recusa em `core/buy-together/rules.ts`, idêntico ao do design. Gravação em `useBuyTogetherLists.ts` (`save`). | sim |
| Apagar lista em uso é recusado pelo banco (`restrict`) e pela tela, nomeando os produtos | Migration: `product_buy_together_list_id_fkey ... on delete restrict`. Tela: `remove` chama `listDeleteRefusal(usadaEm)` e traduz o `23503`. | sim |
| Peça fora do ar aparece marcada "saiu do ar" no editor e no índice | Editor: selo `saiu-do-ar-N` e aviso em `ListItemRow.tsx`. Índice: `aviso(foraDoAr(l))` em `BuyTogetherListsIndex.tsx`. | sim |
| Probe no banco local: anônimo lê e não escreve; escrita só com `has_role`; tabelas respondem pelo PostgREST | `.specs/work-items/WI-01-compre-junto/probes/01-listas.sh`. As policies da migration são coerentes com isso. | só execução |
| `git diff --name-only -- packages/core/src/payment` vazio | Nenhum arquivo de `payment/` aparece no status. | sim |
| Cada comportamento do bloco `Testes` coberto por teste escrito | Ver seção Testes. | sim |
| Testes dos arquivos alterados passando | | só execução |
| Verificação mínima (tipos, suíte do workspace, suíte da loja) | | só execução |

## Obrigações

- **Core:** as recusas moram em `core/buy-together/rules.ts`, a tela as importa, e o guarda `compreJuntoSchema` importa os três tetos de `@estrelinha/core/buy-together`. Aplicado.
- **Banco:** leitura pública `using (true)` nas três tabelas. Escrita `for all to authenticated` com `has_role` no `using` e no `with check`. Nenhum `grant`. `if not exists` nas tabelas e índices. Sem escrita de dado. Prefixo `20261105120000` (a apuração na hora foi declarada pelo implementador e não conferi). Aplicação só no local: não é verificável pelo diff.
- **Tipos:** `buyTogether.ts` e `index.ts` só acrescentam. A prova por probe HTTP é o `01-listas.sh` (não executado por mim).
- **Import relativo com `.ts`:** `index.ts` usa `./rules.ts` e `./types.ts`. `purity.test.ts` guarda isso, e nenhum comentário escreve a forma proibida.
- **Guardas:** `rotasSobGuarda` e `navItems` valem pela classe (rotas dentro do bloco e `navItems.test.ts` estendido). `animacaoRespeitaMovimento` ganhou `ListItemRow.tsx` com âncoras 58/28. `buscaDeProdutoComDonoUnico` não precisou de extensão, porque a peça é lida por id (`useProductVariants`).
- **Mobile primeiro:** tabela `hidden md:table` e cartões `md:hidden`. Alvos `h-11`/`min-h-11`.
- **Documentação:** linha de `./buy-together` em `packages/core/CLAUDE.md`, seção em `supabase/CLAUDE.md`, seção em `apps/backoffice/CLAUDE.md`. As três aplicadas.
- **Não faça:** sem desconto, sem tela de adicionais, sem aba "Adesão", sem rota de loja, sem mexer em `payment/**`. Nenhum `drop column`. Respeitado.

## Testes

- **Unidade `core/buy-together`:** `core/src/buy-together/__tests__/rules.test.ts`. As frases estão escritas por extenso, e os limites 12/13 e 40/41 são testados dos dois lados. Morde.
- **Pureza e alcance do Deno:** `core/src/buy-together/__tests__/purity.test.ts`. Tem âncora de 3 arquivos e sensores para `import type` sem extensão, React/Supabase e comentário. Morde. Esse arquivo é untracked e não está em `alterados`.
- **Guarda de schema:** `apps/store/src/shared/lib/__tests__/compreJuntoSchema.test.ts`. Uma régua por comando. Os tetos são importados. `mutar()` lança quando não acha o alvo. A mutação das policies carrega o nome da tabela, então não acerta a tabela errada. Morde.
- **Probe no banco local:** `.specs/work-items/WI-01-compre-junto/probes/01-listas.sh`. Existe, mas não o li nem o executei.
- **Tela pela página real:** `apps/backoffice/src/pages/admin/AdminBuyTogether.test.tsx`. Li só os títulos dos 20 casos, que cobrem criar, mover, arrastar, tirar, variações, fora do ar, 13ª recusada, excluir em uso e "em N joias". Não li as asserções.
- **Guardas existentes estendidos:** `navItems.test.ts` e `animacaoRespeitaMovimento.test.ts`, com âncoras subidas. Cumprido.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Nomes das tabelas e da view; migration `20261105120000` | sim | Bate com o Contrato da tarefa e com o `Habilita` (02, 03, 06, 07) | sim |
| 2 | Sem `revoke` nem `grant`; leitura por policy `to anon, authenticated`, escrita `to authenticated` com `has_role` nos dois lados | sim | O precedente `product_faqs` faz o mesmo (`create policy ... for select to public using (true)`). A tarefa exige só "nenhum `grant` a `anon`". | sim |
| 3 | Teto como `position` com chave única `deferrable initially deferred` | sim | A tarefa pede "até 12 por lista" e "posição 0..2". O guarda assere o `deferrable`. | sim (02 grava com posições 0..2) |
| 4 | `uuid[]` sem FK, vazio = todas | sim | Decisão #11 da tarefa pede exatamente isso. | sim (03 e 07 pulam a peça cujas liberadas não existem) |
| 5 | View com linha por (lista, joia), `security_invoker` | sim | Contrato: "view de uso ... que nomeia os produtos". | sim |
| 6 | `save` tira as peças que saíram e depois faz `upsert`; `maybeSingle` na criação | sim | O raio declarou que a gravação não é atômica. O guarda de `save` e o comportamento batem com o Contrato. | sim |
| 7 | `ProductSearchField` ganhou a prop `bloquearForaDoAr`, com padrão desligado | sim | O design pede o resultado desabilitado "Fora do ar". O diff é aditivo e o padrão não muda as outras superfícies. | sim. Cabe notar que `ProductSearchField` tem outros chamadores, mas o padrão desligado os preserva. |
| 8 | Rotas `/admin/compre-junto`, `/listas/nova`, `/listas/:id`; só o índice em `navGroups` | sim | O Design diz que a aba "Adesão" é da 06. O índice mostra "Listas (N)". | sim |
| 9 | "A partir de" usa `base_price`; "Em uso" sem link; "Como a cliente vê" só texto | sim | O Design: "Não mostra: destino dos links". `AD-019` proíbe o segundo desenho. | sim |
| 10 | `CharCounter` existente, que mostra `9/40` em vez de "n / 40" | sim | O guarda `contadorComDonoUnico` recusa a sexta escrita do contador. O desvio é cosmético. | sim |

## Não conferido

- **Sem baseline de git:** `rules.ts`, `types.ts` e `purity.test.ts` (`packages/core/src/buy-together/`), `AdminBuyTogetherListPage.tsx`, `AdminBuyTogether.test.tsx` e o probe aparecem como `??` no status. A lista `alterados` nem os cita. Julguei os arquivos inteiros pelo escopo da tarefa. Não consigo provar, sem baseline, que o implementador não tocou no que a tarefa proibia tocar. Pelo status, `packages/core/src/payment/**` está limpo.
- **Fatias de `sem mutação`:** a fatia 2 (pureza) eu li e ela morde. A fatia 4 (probe no banco) eu não li nem executei, então o `não se aplica` dela não tem prova minha.
- **Não executei nada:** nem testes, nem tipos, nem o probe, nem o `supabase migration up`. Que a migration foi aplicada só no local e que o prefixo foi apurado na hora vem da palavra do implementador.
- **Asserções do `AdminBuyTogether.test.tsx`:** li só os títulos dos casos, não o corpo.
- **Diff de `navItems.test.ts`:** é um arquivo alterado que não está em `alterados`. Li o diff dele e é coerente com a tarefa.
- **Citações da tarefa:** não conferi as linhas dos exemplares citados em "Siga a forma de". Abri o `20260816120000_28-perguntas-frequentes.sql` só para a policy e a forma da leitura pública.

Instruções lidas: `CLAUDE.md` da raiz, pelo contexto carregado (sem releitura por seção). As seções de `packages/core/CLAUDE.md`, `apps/backoffice/CLAUDE.md` e `supabase/CLAUDE.md` que a tarefa manda ler não foram abertas por inteiro. Li apenas os diffs das seções que o implementador acrescentou nesses três arquivos.

## T02 — wi-impl-task · review · agente a623dd7819a8a7ab5

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/02-compre-junto-no-produto.md
Situação: fechou

## Aborto
nada

## Decisões e premissas
| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A gravação dos adicionais é por `id`: apaga só o que a dona tirou (recortado por `product_id` e `id`), faz `upsert` com `onConflict: 'id'` do que ficou e insere o novo. | `upsert` por `(product_id, position)`, como no molde `persistSupplier`. | A posição é única mas `deferrable`, e o Postgres não aceita chave adiada como alvo de `on conflict`. O probe HTTP confirmou: `on_conflict` pela posição dá 500. A chave adiada deixa reordenar numa gravação só. | `persistAddons.ts` e o guia em `apps/backoffice/CLAUDE.md`. A tarefa 03 não grava, então não é afetada. |
| 2 | O embed de `product_buy_together` no `PRODUCT_FORM_SELECT` usa a FK nomeada `product_buy_together!product_buy_together_product_id_fkey(...)`. | Embed sem dica. | A tabela tem duas FKs para `products`, e sem a dica o PostgREST responde 300 (provado no probe). | Quem embutir a tabela no select de `products` precisa da dica. A tarefa 03 já prevê "FK nomeada", então nada foi corrigido lá. |
| 3 | O produto principal é escondido da busca (`excluir`), e a peça já escolhida em outro adicional aparece desabilitada com "Já está em outro adicional". A recusa de `core` (`addonIsMainRefusal`) continua como rede de baixo. | Mostrar o principal desabilitado com "É esta joia", como o desenho. `rotuloJaEscolhida` é um rótulo só por campo. | Menor superfície, e o `ProductSearchField` é compartilhado. CA-02.5 cumprido: o principal não é escolhível. | Só a aba. |
| 4 | As frases "adicional incompleto" e "N adicionais estão sem lista ou peça" ficam no painel (`features/product-form/model/addons.ts`), não em `core/buy-together`. | Um arquivo novo em `core/buy-together`. | A cerca da onda só deixa arquivos NOVOS em `core/buy-together`, e `purity.test.ts` crava a lista de arquivos do módulo (`index`, `rules`, `types`). Um arquivo novo quebraria essa âncora, que a tarefa 03 também pode tocar. Teto, "a própria joia" e "peça repetida" vêm de `core`, como pede a tarefa. | Se outra superfície precisar da frase do incompleto, ela sobe para `core` depois. |
| 5 | Os links "Editar a lista" e "Criar uma lista nova" são `<a target="_blank">` para `/admin/compre-junto/listas/...`. | `Link` na mesma aba. | O desenho não define o destino nem o que acontece com o produto não salvo. Outra aba não perde as alterações. | Só a aba. |
| 6 | Adicionar `TabId` `'compre-junto'` e a barra do topo com `blockedNote`, que desabilita o Salvar e mostra "1 adicional está sem lista ou peça." (prop opcional em `ProductFormHeader`). | Desabilitar o Salvar só dentro da aba. | O desenho manda a barra dizer isso. | `validateProduct.ts` e `errorsByTab`, que passou a ter 6 chaves. Reescrevi 2 testes de contagem (veja Divergências). |
| 7 | A faixa de "convertido do antigo" não foi feita. | Implementá-la. | É opcional no desenho, e a conversão de dados já acontece na migration. O painel não consegue distinguir "convertido" de "criado pela dona". | Nenhum. |
| 8 | Duplicar um produto traz os adicionais com `id: null`. | Copiar com os ids. | Gravar com o id do original atualizaria as linhas do produto de origem. | `productRowToForm` com `asCopy`. |

## Fatias
| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Conversão de `buy_together_ids`: até 3, na ordem, inexistente/própria/repetido descartados, idempotente | probe psql + guarda de schema | `probes/02-conversao.sh` (6 ok); `apps/store/src/shared/lib/__tests__/compreJuntoConversaoSchema.test.ts` (18) | sim | não se aplica (o probe roda no banco; o guarda tem 11 sensores de mutação embutidos) |
| 2 | Contas puras: recusa do 4º, principal e peça repetida recusados com motivo escrito, ordenar, "some quando" | unidade | `apps/backoffice/src/features/product-form/model/addons.test.ts` (10) | sim | vermelho (2 mutantes: `addonCountRefusal` e o recorte de `targetsOutside`) |
| 3 | `persistAddons`: só os adicionais da joia, ordem delete→upsert→insert, falha no meio, recusa antes de escrever, carga ordenada, cópia sem id | unidade (dublê com diário) | `persistAddons.test.ts` (12) | sim | vermelho (3 mutantes: recorte por joia, `onConflict`, `list_id` por tipo) |
| 4 | Aba pela página real: acrescentar, 4ª recusada, lista, peça, variações, "some quando", "saiu do ar", ordenar, Salvar bloqueado, gravação recortada, sem mudança não escreve, apagar | página real | `apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx` (18) | sim | vermelho (mutante na fiação da página: `savedSnapshot.addons` trocado por `addons`, 3 testes caíram) |
| 5 | Nenhum envio do painel nomeia a coluna antiga | guarda que lê disco (âncora de arquivos e de 4 caminhos, 4 sensores) | `apps/backoffice/src/shared/lib/__tests__/compreJuntoSemColunaAntiga.test.ts` (4) | sim | —: a primeira execução reprovou, acusando um teste meu que citava o nome numa string. Reescrevi o teste. |
| 6 | Gravação provada por HTTP contra `:54441` (`AD-012`) | integração local | `probes/03-adicionais-no-produto.sh` (11 ok; limpa o que cria; `product_buy_together` ficou com 0 linhas) | sim | não se aplica |

## Repositórios tocados
/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

## Arquivos alterados
- `supabase/migrations/20261105130000_compre-junto-conversao.sql` criado (aplicada só no local com `supabase migration up --local`)
- `.specs/work-items/WI-01-compre-junto/probes/02-conversao.sh` criado
- `.specs/work-items/WI-01-compre-junto/probes/03-adicionais-no-produto.sh` criado
- `apps/store/src/shared/lib/__tests__/compreJuntoConversaoSchema.test.ts` criado
- `apps/backoffice/src/features/product-form/model/addons.ts` criado
- `apps/backoffice/src/features/product-form/model/persistAddons.ts` criado
- `apps/backoffice/src/features/product-form/model/addons.test.ts` criado
- `apps/backoffice/src/features/product-form/model/persistAddons.test.ts` criado
- `apps/backoffice/src/features/product-form/ui/BuyTogetherTab.tsx` criado
- `apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx` criado
- `apps/backoffice/src/shared/lib/__tests__/compreJuntoSemColunaAntiga.test.ts` criado
- `apps/backoffice/src/features/product-form/model/useProductForm.ts` alterado (campo `buy_together_addons`, snapshot `addons`, embed, cópia sem id)
- `apps/backoffice/src/features/product-form/model/validateProduct.ts` alterado (`TabId` e `TAB_IDS`)
- `apps/backoffice/src/features/product-form/ui/ProductFormHeader.tsx` alterado (`blockedNote`)
- `apps/backoffice/src/pages/admin/AdminProductFormPage.tsx` alterado (aba, `persistAddons`, sem `buy_together_ids`, o card saiu de Relacionados)
- `apps/backoffice/src/entities/product/api/useAdminProducts.ts` alterado (`getProduct` sem `buy_together_ids`)
- `apps/backoffice/src/features/product-form/model/useProductForm.test.ts` alterado (fixture sem `buy_together_ids`)
- `apps/backoffice/src/pages/admin/AdminProductFormPage.test.tsx` alterado
- `apps/backoffice/src/features/product-form/model/validateProduct.test.ts` alterado
- `apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts` alterado (`BuyTogetherTab.tsx` entrou no escopo; âncoras 58/28 → 62/30, medidas)
- `apps/backoffice/CLAUDE.md` alterado (seção "Compre Junto › a aba do produto")

Não toquei em `packages/core/src/buy-together/` nem em `apps/store/src/entities/product` e `ProductPage.tsx`, que são da cerca da tarefa 03.

## Verificação
- Tipos do backoffice: `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (do `CLAUDE.md` › Comandos). Exit 0, 0 erros, o mesmo que o baseline `0`.
- Arquivos desta tarefa: `pnpm exec vitest run <arquivo> --testTimeout=20000` (do `PROJECT.md`). Todos verdes.
- Suíte do backoffice: `pnpm test --testTimeout=20000` (do `CLAUDE.md` › Baselines). Exit 0, **5019/277**. O baseline escrito é 4944/271, mas esta árvore tem trabalho de outras tarefas.
- Suíte da loja: `pnpm test --testTimeout=20000` (idem). 6713 passam e 1 falha: `useBuyTogetherData.test.tsx` (`pede os produtos de todos os adicionais numa consulta só, sem o próprio principal`). É um teste novo da tarefa 03 em andamento, que não é meu. Meus guardas na suíte da loja (`compreJuntoConversaoSchema`, `marcacaoSoPorAcao`, `brandScan` etc.) passam.
- Probes locais: `02-conversao.sh` (6 ok, roda em transação com `ROLLBACK`) e `03-adicionais-no-produto.sh` (11 ok).
- Migration aplicada só no local (`migration list` mostra 20261105130000). Não consultei produção.
- Instruções lidas: `CLAUDE.md` da raiz (pelo contexto carregado); `apps/backoffice/CLAUDE.md › O fornecedor da peça, › Compre Junto › Listas, › O editor de Produtos em destaque, › O movimento do painel`; `PROJECT.md › Comandos de verificação, › Ambiente local`. Não abri `packages/core/CLAUDE.md` nem `supabase/CLAUDE.md` por seção. Li o código de `core/buy-together` e a migration da tarefa 01 diretamente.

## Divergências e descobertas
- **Testes antigos reescritos por mudança de valor da spec, não afrouxados:**
  - `AdminProductFormPage.test.tsx`: de 5 para 6 abas, o seletor de Relacionados passou de 2 para 1, e a asserção "os dois seletores existem" ficou vazia porque o `tabpanel` herda o rótulo "Compre junto" do `aria-labelledby`. Troquei por uma asserção que prova a ausência do card dentro do painel ativo.
  - `validateProduct.test.ts`: `errorsByTab` ganhou a chave `'compre-junto'`.
- **Citações do `Siga a forma de` conferidas e usadas:** `persistSupplier.ts`, `persistProduct.ts` › `persistProductRelations`, `AdminProductFormPage.tsx` (aba e card de Relacionados) e `RelatedProductsSelect.tsx` / `ProductSearchField.tsx`. Nenhuma estava morta; os números de linha deslocaram, e relocalizei pelo alvo nomeado.
- Fatia de infraestrutura que passou de primeira sem o check de mutação: não houve. As fatias 2, 3 e 4 passaram de primeira e levaram o check de mutação.
- A tarefa pede o selo "saiu do ar" em adicional de produto e o painel só sabe disso pela peça inativa. Produto **apagado** não aparece: a FK `on delete cascade` apaga o adicional junto.
- Sem ambiente local fora do ar: o Supabase local estava de pé em 54441/54442. O `supabase status` listou edge runtime e pooler parados, e não precisei deles.
- Faixa "convertido do antigo" (opcional) não feita, ver premissa 7.
- Afirmações de tarefas seguintes: nada falso, então não propaguei nada. A tarefa 03 já prevê a FK nomeada no embed.

## Ao humano
nada

## O que devolver no fim
Tarefa: 02
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, pelo contexto), apps/backoffice/CLAUDE.md (seções citadas), .specs/project/PROJECT.md (Comandos de verificação, Ambiente local). Não abri packages/core/CLAUDE.md nem supabase/CLAUDE.md por seção.
Testes escritos:
- Recusa do 4º adicional e principal não escolhível: `addons.test.ts`, `persistAddons.test.ts`, e a página em `AdminProductFormPage.compreJunto.test.tsx`.
- Gravar só os adicionais do produto, falha no meio, delete recortado: `persistAddons.test.ts` e a página.
- Aba pela página real (acrescentar, ordenar, lista ou peça, variações liberadas, "some quando", "saiu do ar", incompleto desabilita o Salvar): `AdminProductFormPage.compreJunto.test.tsx`.
- Conversão de `buy_together_ids`: `probes/02-conversao.sh` e `compreJuntoConversaoSchema.test.ts`.
- Nenhum envio do painel nomeia `buy_together_ids`: `compreJuntoSemColunaAntiga.test.ts`.
- Gravação por HTTP em `:54441`: `probes/03-adicionais-no-produto.sh`.
- Nada ficou sem cobertura. Pela página não provei "falha no meio" no `persistAddons`; ela está só em unidade.
Verificações: tsc backoffice 0 erros; suíte do backoffice 5019/277 exit 0; suíte da loja 6713/6714, a falha é `useBuyTogetherData.test.tsx`, da tarefa 03; probes locais 02 (6 ok) e 03 (11 ok); migration só no local.
Árvore de trabalho: arquivos listados em "Arquivos alterados"; nada commitado e a linha `**Status:**` intocada.
Citações conferidas: 6 abertas ao usar (as 5 do `Siga a forma de` mais `featured.ts`/`rules.ts` de `core`); as linhas das citadas deslocaram e relocalizei pelo alvo; nenhuma morta.
Propagado: nada.
Caducou: nada.

## T03 — wi-impl-task · review · agente a2b069f3b2dae0f4e

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/03-bloco-na-pagina-do-produto.md
Situação: fechou

(Caso, no schema da tarefa: fechou com divergência. A divergência está em "Divergências e descobertas".)

## Aborto
nada

## Decisões e premissas
| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Leitura à parte, no molde de `useProductFaqs`: `useBuyTogetherData` lê a configuração com a lista e as peças dela num `select` só, com a FK da lista nomeada. Depois lê os produtos por `useProductsByIds`. Decisão #15 | Embed no `PRODUCT_SELECT` | O `select` é compartilhado por `useProduct`, `useProducts` e `useRecoverCart`. Mexer nele muda a listagem inteira | 07 e 04 não dependem do embed. Os 7 testes de página que dublam hooks ganharam um mock de `useBuyTogetherData` |
| 2 | O estado do conjunto fica em `entities/product/model/useBuyTogether.ts`. A `ProductPage` o monta e o `ProductInfo` o recebe por prop opcional `buyTogether`. Expõe `display`, `addons`, `total`, `canTake`, `firstIncompleteId`, `incompleteCount`, `taken` e as ações | Montar o hook dentro do bloco | A 04 precisa do mesmo estado no botão único e na barra fixa | 04 consome `taken`, `canTake` e `firstIncompleteId`. 07 troca a forma sem tocar no hook |
| 3 | O PIX do conjunto é calculado em `BuyTogetherBlock` (`bundlePix(total, usePaymentSettings())`). O hook só devolve `total` | PIX dentro do hook | Os testes de página dublam `useStoreSettings` sem `usePaymentSettings`. Com o hook lendo a configuração, 28 casos quebravam por "No QueryClient" | A 04 calcula o PIX da barra com a própria leitura, como `ProductBuyBar` já faz |
| 4 | Frase de falta de uma lista: "Escolha a peça." O rótulo é "Escolha a peça · N modelos" | "Escolha a corrente." | O nome da lista não serve para concordar artigo e gênero ("a Pulseiras") | Texto de 03, 04 e 07 no desenho. Troca por constante em `core/buy-together/total.ts` |
| 5 | Mensagem de eixo faltando: "Escolha o <eixo> da <primeira palavra>", com o eixo como cadastrado. Dá "Escolha o Cor da Pingente." | Concordar gênero por eixo | É a letra do desenho. Fica gramaticalmente torta para eixos femininos | Só texto. Corrigir exige decisão de copy |
| 6 | Cópia deliberada de `isVariantAvailable` em `core/buy-together` (`variantSellable`, que também exige preço). Um teste a compara com `isVariantAvailable` em todas as combinações de política, estoque e pausa | Importar `core/pricing` | `core/pricing/index.ts` importa tipos de pacote e quebra o alcance pelo Deno | A function `checkout` (05) reusa `resolveAddons` e `variantSellable` |
| 7 | Peça avulsa vence a lista na repetição. Entre listas vale a ordem da dona. Adicional sem peça sobrando some | Posição pura | Uma peça avulsa é escolha explícita da dona. O resultado é determinístico | A 05 (checkout) deve aplicar a mesma regra, chamando `resolveAddons` |
| 8 | Linha ainda sem escolha completa mostra "a partir de X" (menor preço vendável). O total nunca usa esse valor: só entram os adicionais completos | Linha sem preço | A linha precisa mostrar preço antes da escolha. CA-03.4 vale para o total | Só a linha |
| 9 | O esqueleto só aparece quando a configuração já disse que há adicionais e os produtos estão a caminho. Enquanto a configuração carrega, o bloco não escreve nada | Reservar espaço desde o início | A tarefa diz "esqueleto só quando há adicionais". Reservar sempre deslocaria toda joia sem adicional | Pode haver um salto pequeno quando a configuração chega. A prova de CLS em navegador fica com a Validation |
| 10 | `select_item` sai ao marcar o adicional, uma vez por adicional por montagem. Numa lista sai com a primeira peça | Emitir também ao escolher a peça | CA-08.1 diz "escolher um adicional" | A 04 emite o `add_to_cart` |
| 11 | `VariantPicker` ganhou `idPrefix` e `EngravingField` ganhou `id` e aceita um objeto estrutural de gravação. Os padrões não mudam | Wrapper novo | Dois seletores de `Cor` na mesma página repetiam `id` e `aria-labelledby` | A barra fixa continua focando `ENGRAVING_FIELD_ID` |
| 12 | Os adicionais marcados que somem (a variação do principal os esconde) perdem a marca por efeito de poda. O mesmo vale para as escolhas deles | Manter o estado escondido | "Some e perde a marca" | Só o estado do hook |
| 13 | O guarda `purity.test.ts`, de 03, teve a âncora trocada: de 3 para 5 arquivos do módulo e 7 visitados. `total.ts` importa as folhas `material/material.ts` e `payment/pix.ts`, por caminho com `.ts`. A mudança é de contagem, sem afrouxar régua | Duplicar o `pixPrice` | `pixPrice` é o dono do PIX | `payment/**` sem diff |

## Fatias
| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Disponibilidade: peça fora do ar, esgotada, sem variação vendável, liberadas que sumiram nunca viram "todas", numa lista só a indisponível some | unidade | `packages/core/src/buy-together/__tests__/availability.test.ts` | sim | — (passou pelo vermelho) |
| 2 | Principal e peça repetida pulados só ali. Adicional escondido para a variação do principal | unidade | idem | sim | — |
| 3 | Total = principal × quantidade + adicionais × 1. PIX = `pixPrice` do total, nunca a soma dos PIX. Recusa de gravação. Frases de falta | unidade | `.../__tests__/total.test.ts` | sim | — |
| 4 | Pureza e alcance do Deno com os arquivos novos | unidade | `.../__tests__/purity.test.ts` (âncora ajustada) | sim | — |
| 5 | Leitura: colunas e FK, filtro pela joia, ordem, mapeamento, uma consulta de produtos sem o principal, erro vira `error` | integração com client dublado | `apps/store/src/entities/product/api/__tests__/useBuyTogetherData.test.tsx` | sim | não se aplica (o dublê registra tabela, `select`, `eq` e `in`) |
| 6 | Página real: nada marcado ao abrir; marcar abre as escolhas; total e PIX acompanham (100 + 35 = 135, PIX 128,25, escritos à mão); falta diz qual escolha; esgotado desabilitado; eixo único já escolhido; quantidade do principal entra no total; desmarcar | página real | `apps/store/src/pages/__tests__/ProductPageBuyTogether.test.tsx` (26 casos) | sim | 5 mutantes reinjetados, 4 mortos por asserção |
| 7 | Principal esgotado (simples e grade) esconde o bloco; combinação indisponível mantém; leitura que falha deixa a página de pé; nenhum adicional esconde; esqueleto com `aria-busy` e `min-h-[320px]` | página real | idem | sim | o mutante de "grade toda esgotada" sobreviveu. Escrevi o caso que faltava e ele morreu |
| 8 | Listas: ordem da dona, pula o principal e a esgotada, escolhe exatamente uma, foco do teclado na primeira sem vir marcada, setas movem a escolha | página real | idem | sim | — |
| 9 | A variação do principal esconde o adicional, que perde a marca. Os outros mantêm a escolha | página real | idem | sim | mutante de poda morto |
| 10 | Gravação do adicional: limite da peça, contador, texto aparado, apaga ao trocar para variação sem gravação, `id` próprio por adicional | página real | idem | sim | — |
| 11 | GA4: uma `view_item_list` com `compre-junto`, uma `select_item` por adicional sem duplicar | página real | idem | sim | mutante de dedupe morto |
| 12 | O bloco alcançado pelo guarda de material | guarda | `semMaterialNaPaginaDoProduto.test.ts` (escopo estendido e âncora nova) | sim | — |
| 13 | Tom memorial no bloco e em `core` | guarda | `apps/store/src/entities/product/ui/__tests__/tomDoCompreJunto.test.ts` | sim | sensores nos dois sentidos |
| 14 | Esqueleto só com adicionais, com a altura reservada | componente | coberto na fatia 7, pela página | sim | — |

Mutação: 6 mutantes reinjetados em `useBuyTogether.ts` e `availability.ts`, restauração conferida com `cmp`. O 6º (`claimed.clear = () => {}`) era no-op por construção e não prova nada. Um mutante de `useTrackList` (só quando `ready`) sobreviveu como equivalente: fora de `ready`, `shown` já é vazio.

## Repositórios tocados
/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

## Arquivos alterados
Todos sob `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01`.

Em `packages/core/src/buy-together/`:
- `availability.ts` criado
- `total.ts` criado
- `index.ts` alterado
- `__tests__/availability.test.ts` criado
- `__tests__/total.test.ts` criado
- `__tests__/purity.test.ts` alterado

Em `apps/store/src/`:
- `entities/product/api/useBuyTogetherData.ts` criado
- `entities/product/model/useBuyTogether.ts` criado
- `entities/product/ui/buy-together/BuyTogetherBlock.tsx` criado
- `entities/product/ui/buy-together/AddonRow.tsx` criado
- `entities/product/ui/buy-together/BuyTogetherSkeleton.tsx` criado
- `entities/product/ui/EngravingField.tsx` alterado
- `entities/product/ui/VariantPicker.tsx` alterado
- `entities/product/ui/ProductInfo.tsx` alterado
- `pages/ProductPage.tsx` alterado
- Testes criados:
  - `pages/__tests__/ProductPageBuyTogether.test.tsx`
  - `entities/product/api/__tests__/useBuyTogetherData.test.tsx`
  - `entities/product/ui/__tests__/tomDoCompreJunto.test.ts`
- Testes alterados (guardas e fixture):
  - `entities/product/ui/__tests__/semMaterialNaPaginaDoProduto.test.ts`
  - `entities/product/lib/__tests__/cardSelect.test.ts` (tirou `buy_together_ids` do fixture)
- Testes alterados (só o mock de `useBuyTogetherData`):
  - `app/__tests__/ProductPageOptionHead.test.tsx`
  - `pages/__tests__/ProductPage.test.tsx`
  - `pages/__tests__/ProductPageMaterialDrawer.test.tsx`
  - `pages/__tests__/ProductPageRelated.test.tsx`
  - `pages/__tests__/ProductPageVariant.test.tsx`
  - `pages/__tests__/cardAbreNaVariacao.test.tsx`
  - `pages/__tests__/produtoMedido.test.tsx`

Documentação: `apps/store/CLAUDE.md` alterado (seção "O bloco Compre Junto" em Página do produto). `packages/core/CLAUDE.md` alterado (linha do `./buy-together`).

Nenhum arquivo de `payment/**`, `core/analytics`, migration, painel ou tarefa de outra onda foi tocado.

## Verificação
- Todos os comandos vieram de `CLAUDE.md` §Comandos/§Baselines e de `.specs/project/PROJECT.md` › Comandos de verificação:
  - `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`, por fatia
  - suíte do workspace com `--testTimeout=20000` sem o `--`
- `@estrelinha/core test`: exit 0, 5277 testes em 211 arquivos (a baseline do fecho da 89 era 5126/202).
- `@estrelinha/store test`: exit 0, 6717 testes em 358 arquivos (a baseline era 6475/347).
- `npx tsc --noEmit -p apps/store/tsconfig.app.json`: exit 0, 0 erros, igual à baseline.
- `npx tsc --noEmit -p packages/core/tsconfig.json`: 11 erros, nos mesmos arquivos herdados da baseline, nenhum em arquivo tocado.
- `npx eslint .` em `apps/store`: 2 erros e 2 warnings, igual à baseline 2/2. São `ShareButtons`, `ShippingCalc` e as duas fronteiras FSD que `ProductInfo` já tinha. Não criei a terceira violação.
- O painel não foi tocado, então a suíte do backoffice não rodou.
- Prova em navegador a 390×844, 130 % e 200 %: não rodei. O briefing manda deixá-la para a Validation e a regra 8 proíbe subir servidor. Ficou pendente: rolagem horizontal, alvos de 44 px, nomes longos a 200 % e CLS do espaço reservado. Em jsdom só há proxies de classe (`grid-cols-[minmax(0,1fr)]`, `break-words`, `min-h-[320px]`).
- Ambiente local: não houve migration nem comportamento de banco novo nesta tarefa. A leitura foi provada contra client dublado que registra `select`, FK e filtros. Um `GET` real contra o banco local ficou sem execução, e quem fecha isso é a Validation.
- Instruções lidas:
  - `CLAUDE.md` da raiz: o contexto carregado (o arquivo inteiro)
  - `apps/store/CLAUDE.md` › Design system, › Mobile, › A home não salta, › Página do produto, › Material afetivo, › Gaveta de material, › Carrinho, chrome e checkout
  - `packages/core/CLAUDE.md` › Quando um código pertence ao pacote, › Pureza, › Os módulos
  - `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local

## Divergências e descobertas
- Os 7 arquivos de teste de página que dublam hooks sem `QueryClientProvider` (lista em Arquivos alterados) quebravam com "No QueryClient set". Adicionei só o mock de `useBuyTogetherData` neles. Nenhuma asserção foi tocada.
- O `purity.test.ts` da tarefa 01 tinha âncora cravada em 3 arquivos. Troquei por 5 do módulo e 7 visitados, pelo item 13 acima. Era arquivo untracked de 01.
- A citação "(`useProductPurchase.tsx:55-62` e outras)": abri os arquivos pelo alvo nomeado e todas bateram. Não houve citação morta.
- Texto de "Escolha a corrente · N modelos" e "Escolha a corrente." do desenho ficou diferente do implementado (decisão 4). A tarefa 07 repete o desenho. Não reescrevi nada nelas, porque o texto é do desenho e não uma afirmação de código.
- Os dois avisos de baseline continuam como estavam: lint 2/2 pré-existente e os 11 erros de tipo de `core`.
- A tarefa 02 rodava junto. Não toquei nos arquivos dela. `cardSelect.test.ts` (que a tarefa mandava limpar) é `Record<string, unknown>`, então a remoção do campo não depende da tarefa 02 tirar a coluna do tipo `DbProduct`.
- O mutante sobrevivente do `useTrackList` é equivalente, como descrito na seção Fatias.
- Propagado: nada. Nenhuma afirmação de tarefa seguinte ficou falsa. Quem implementar a 04 deve usar `taken`, `canTake` e `firstIncompleteId` do `useBuyTogether`, e aplicar a precedência da decisão 7 no servidor chamando `resolveAddons`.
- Caducou: nada.

## Ao humano
nada

## O que devolver no fim
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: `CLAUDE.md` (raiz, contexto carregado); `apps/store/CLAUDE.md` › Design system, › Mobile, › A home não salta, › Página do produto, › Material afetivo, › Gaveta de material, › Carrinho, chrome e checkout; `packages/core/CLAUDE.md` › Quando um código pertence ao pacote, › Pureza, › Os módulos; `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local
Testes escritos:
- Unidade em `core/buy-together` (disponibilidade, repetição, variação do principal, total, PIX do total, frases): `availability.test.ts`, `total.test.ts`, `purity.test.ts`
- Leitura: `useBuyTogetherData.test.tsx`
- Página real (nada marcado, total e PIX, falta de escolha, esgotado, principal esgotado e combinação indisponível, falha e nenhum adicional, esqueleto, gravação, lista, variação do principal, GA4): `ProductPageBuyTogether.test.tsx`
- Guardas: `semMaterialNaPaginaDoProduto.test.ts` estendido, `tomDoCompreJunto.test.ts`
- Sem cobertura: a medição em navegador (390 px, 130 % e 200 % de fonte, alvos de 44 px, rolagem horizontal, CLS). jsdom devolve 0 para layout, e a tarefa manda a prova para a Validation

Verificações:
- core 5277/211 exit 0
- store 6717/358 exit 0
- tipos store 0, core 11 herdados
- lint store 2/2 igual à baseline
- 6 mutantes reinjetados com restauração conferida por `cmp`: 4 mortos por asserção, 1 sobrevivente que virou caso novo e morreu, 1 equivalente declarado (mais um no-op por construção, que não conta)

Árvore de trabalho: veja "Arquivos alterados". Nada foi commitado, e a linha `Status:` não foi tocada.
Citações conferidas: 14 abertas ao usar (`useProductPurchase`, `CrossSell`, `EngravingField`, `variantSelection`, `VariantPicker`, `useProductsByIds`, `useProductFaqs`, `mapProduct`, `pix.ts`, `featured.ts`, `events.ts`, `useTrackList`, `denoReach` e `purity.test.ts` como moldes). Nenhuma deslocada nem morta.
Propagado: nada
Caducou: nada

## T02 — wi-impl-review · fixing · agente a87cf396de162171c

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/02-compre-junto-no-produto.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | identificador de processo | atrapalha | apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx:1, :208, :229, :260, :322, :341, :357 | O comentário de abertura cita `UC-02`. Seis `describe` levam o código do critério de aceite no nome: `CA-02.1`, `CA-02.3`, `CA-02.2 / CA-02.5`, `CA-02.7`, `CA-02.9`, `CA-02.4`. | regra do workflow: identificador de processo não entra no código |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| Até 3 adicionais, ordena, escolhe lista ou peça, libera variações, marca onde some, grava; a 4ª é recusada com o motivo escrito | `BuyTogetherTab.tsx` (recusa `recusa-do-quarto`, `moveAddon`, `chooseList`/`chooseProduct`, `toggleTargetVariant`, `toggleHiddenOn`), `addons.ts`, `persistAddons.ts`, `AdminProductFormPage.tsx` (chama `persistAddons` depois do produto e dos fornecedores) | sim, e o teste de página os exercita; só execução para passar |
| O principal não é escolhível; a peça já escolhida aparece desabilitada com o motivo | `BuyTogetherTab.tsx`: `excluir={[mainProductId]}` e `rotuloJaEscolhida="Já está em outro adicional"`. Rede de baixo: `addonIsMainRefusal` em `addons.ts` e `persistAddons.ts`. | sim (premissa 3 sustentada, ver abaixo) |
| Gravar um produto não altera o Compre Junto de outro | `persistAddons.ts`: `delete` com `eq('product_id')` e `in('id')`; linhas com `product_id`. Teste `persistAddons.test.ts` assere o diário completo. | sim |
| Conversão provada por probe no banco local, idempotente | Migration `20261105130000_compre-junto-conversao.sql`; `probes/02-conversao.sh`; guarda `compreJuntoConversaoSchema.test.ts` | sim; o probe só a execução prova |
| Nenhum arquivo do painel manda `buy_together_ids` | `grep` em `apps/backoffice/src`: só o comentário de `useProductForm.ts:97` e o guarda. `useAdminProducts.ts`, `AdminProductFormPage.tsx` e `useProductForm.ts` não o mandam. | sim |
| Cada comportamento de `Testes` coberto | ver Testes | sim |
| Testes dos arquivos alterados passando; verificação mínima | — | só execução |

## Obrigações

- A coluna sai do painel, não do banco: aplicada em `useAdminProducts.ts`, `useProductForm.ts`, `AdminProductFormPage.tsx` e na fixture `useProductForm.test.ts`. Não há `drop column`.
- Migration só no local e probe `psql`: `probes/02-conversao.sh`, 6 ok, conforme o retorno. Não vi a execução, ver Não conferido.
- Gravar só os adicionais da joia, com a falha no meio sem deixar a joia sem nenhum: ordem apaga o que a dona tirou, atualiza o que ficou, insere o novo. Aplicada.
- A recusa vem de `core/buy-together` antes de qualquer escrita: `addonsRefusal` roda antes dos três passos e também em `handleSubmit`. Probe HTTP em `probes/03-adicionais-no-produto.sh`.
- Selo "saiu do ar" pelo design system: `data-testid=saiu-do-ar-N` com tokens `estrelinha-admin-amber`. Aplicado.
- `animacaoRespeitaMovimento`: `BuyTogetherTab.tsx` entrou no escopo e as âncoras subiram para 62/30. Os `transition-colors` têm `motion-reduce:transition-none`.
- `buscaDeProdutoComDonoUnico`: a aba usa o `ProductSearchField`, sem busca própria. A suíte da loja na medição só a execução prova.
- Documentação: `apps/backoffice/CLAUDE.md` aparece como alterado.

## Testes

- Recusa do 4º adicional e principal não escolhível, vinda de `core`: `addons.test.ts`, `persistAddons.test.ts` (4ª, própria joia e repetida, zero escritas) e `AdminProductFormPage.compreJunto.test.tsx` (4ª, principal fora da busca). Morde.
- Gravar só os adicionais dele, falha no meio: `persistAddons.test.ts`. O dublê registra tabela, operação e filtros. Cobre o caso do delete recortado por joia, o de nunca apagar tudo, a falha no insert e a falha no upsert parando antes do insert. Morde.
- Aba pela página real: `AdminProductFormPage.compreJunto.test.tsx`. Cobre acrescentar, ordenar, lista, peça, variações, onde some, saiu do ar, incompleto desabilitando o Salvar e gravação. Nível correto.
- Conversão: `probes/02-conversao.sh` e `compreJuntoConversaoSchema.test.ts`. Uma régua por comando, com sensores por mutação para cada uma. Morde.
- Nenhum envio nomeia `buy_together_ids`: `compreJuntoSemColunaAntiga.test.ts`. Tem âncora de arquivos e sensores de comentário com CRLF e LF.
- Gravação por probe HTTP: `probes/03-adicionais-no-produto.sh`, 11 ok pelo retorno. Não executado por mim.
- Testes de contagem reescritos (`AdminProductFormPage.test.tsx`: 5 para 6 abas; `validateProduct.test.ts`: chave nova). Reescritas pela mudança de comportamento, não afrouxadas.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Gravação por `id`, com `upsert` em `onConflict: 'id'`, em vez de por posição | sim | A tarefa aponta `persistSupplier` como molde, mas a posição deferrable inviabiliza o `on conflict`. O resultado preserva "upsert antes de apagar" e "só os da joia". | sim |
| 2 | Embed com a FK nomeada `product_buy_together_product_id_fkey` | sim | A tarefa 03 já prevê FK nomeada. Visto em `PRODUCT_FORM_SELECT`. | sim |
| 3 | O principal fica fora da busca (`excluir`); a peça já escolhida fica desabilitada com o motivo | sim | CA-02.5 exige "não pode ser escolhido" e "já escolhido aparece desabilitado com o motivo", e os dois são cumpridos. | sim |
| 4 | As frases do incompleto ficam no painel, não em `core/buy-together` | sim | A tarefa só diz que teto, "a própria joia" e "repetida" vêm de `core`, e isso foi feito. Nenhum arquivo de `core` está em `alterados`. | sim |
| 5 | Links "Editar a lista" e "Criar uma lista nova" abrem em outra aba | sim | O destino "não está desenhado" (`Não mostra`), então a decisão era dele. | sim |
| 6 | `TabId` `'compre-junto'`, `blockedNote` na barra, Salvar desabilitado e `errorsByTab` com 6 chaves | sim | O desenho manda a barra dizer a frase. `TAB_IDS` e as fixtures de teste foram atualizados. | sim |
| 7 | Não fez a faixa "convertido do antigo" | sim | O próprio desenho a marca como opcional. | sim |
| 8 | A cópia do produto traz os adicionais com `id: null` | sim | O snapshot da cópia fica vazio (`adopt` só preenche com `productId`), então `persistAddons` insere linhas novas. Não há perda de gravação. Defeito possível, não achado: `hiddenOnVariantIds` e `targetVariantIds` copiados ainda apontam para variações do original. Ficam inertes e não quebram. | sim |

## Não conferido

- Não executei probes nem testes, por regra. Os resultados "6 ok" e "11 ok" do probe `psql` e do probe HTTP, a suíte da loja e o `tsc` vêm do retorno do implementador.
- Os arquivos de `alterados` aparecem como `A` (intent-to-add) ou `M` no git; li o diff e os arquivos inteiros. Não li `ProductFormHeader.test`, `addons.test.ts` por inteiro, nem os dois probes `.sh` além de confirmar que existem.
- `packages/core/src/buy-together/index.ts` e arquivos da loja aparecem modificados na árvore (tarefas 01 e 03 da mesma onda). Não estão em `alterados` e não os julguei.
- `apps/backoffice/CLAUDE.md`: só confirmei que há diff; não li o texto acrescentado.
- Instruções lidas: `CLAUDE.md` da raiz, lido de forma integral pelo contexto de sistema (› O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy). `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md` e `supabase/CLAUDE.md` não foram lidos por mim; só as seções citadas pela tarefa existem como referência. Conferi o diff contra a tarefa e a raiz.

## T02 — wi-impl-task · done · agente a623dd7819a8a7ab5

Tarefa: .specs/work-items/WI-01-compre-junto/tasks/02-compre-junto-no-produto.md
Situação: fechou

## Aborto
nada

## Decisões e premissas
Nenhuma premissa foi revista nesta correção. As 8 premissas do relatório anterior seguem como estavam.

## Fatias
Nada reaberto. A correção só renomeou títulos, sem mudar asserção.

## Repositórios tocados
/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

## Arquivos alterados
- `apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx` alterado (achado 1). Tirei `UC-02` do comentário de abertura. Os seis `describe` com código de critério ganharam nomes de domínio:
  - "o teto de 3 adicionais"
  - "adicional do tipo lista"
  - "adicional do tipo peça"
  - "peça que saiu do ar"
  - "onde o adicional some"
  - "ordenar os adicionais"

## Verificação
- `pnpm exec vitest run src/pages/admin/AdminProductFormPage.compreJunto.test.tsx --testTimeout=20000` (comando do `PROJECT.md`): 18/18 passam.
- `grep` por `UC-` e `CA-0` nos arquivos de código e teste que criei: nenhuma ocorrência restante. Os arquivos conferidos foram `addons`, `persistAddons` e seu teste, `BuyTogetherTab`, os dois guardas `compreJunto*` e a página.
- Não rodei de novo a suíte inteira nem os tipos, porque só mudaram títulos de teste. Os resultados anteriores seguem válidos.
- Instruções lidas: as mesmas do relatório anterior.

## Divergências e descobertas
nada

## Ao humano
nada. O achado 1 está correto e foi aplicado.

## O que devolver no fim
Tarefa: 02
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, pelo contexto), apps/backoffice/CLAUDE.md (seções citadas), .specs/project/PROJECT.md (Comandos de verificação, Ambiente local). Não abri packages/core/CLAUDE.md nem supabase/CLAUDE.md por seção.
Testes escritos: os mesmos do relatório anterior. A correção só mudou títulos em `AdminProductFormPage.compreJunto.test.tsx`.
Verificações: arquivo da página, 18/18. Anteriores mantidas: tsc do backoffice com 0 erros, suíte do backoffice 5019/277 exit 0, suíte da loja com 1 falha que é da tarefa 03, probes 02 (6 ok) e 03 (11 ok), migration só no local.
Árvore de trabalho: como no relatório anterior, mais a renomeação dos títulos acima. Nada commitado e a linha `**Status:**` intocada.
Citações conferidas: 6, como antes; nenhuma morta.
Propagado: nada.
Caducou: nada.

## T03 — wi-impl-review · fixing · agente a104fb1642ba293bc

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/03-bloco-na-pagina-do-produto.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
|---|---|---|---|---|---|
| 1 | identificador de processo | atrapalha | apps/store/src/entities/product/model/useBuyTogether.ts:136 e apps/store/src/pages/ProductPage.tsx:201 | Os dois comentários explicam o código pelo plano de trabalho ("é a tarefa seguinte", "a tarefa de levar o conjunto à sacola precisa do…"). Isso narra a divisão de tarefas, e não o código. | regra do workflow: identificador de processo não entra no código (comentário que narra a mudança em vez de explicar o código). A correção é trocar por "a sacola e a barra fixa leem o mesmo estado". |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| Página real: nada marcado ao abrir; marcar mostra o painel; total e PIX acompanham | ProductPageBuyTogether.test.tsx (casos "abre com o título…", "marcar abre as escolhas…", "100 + 35, PIX 128,25"), useBuyTogether.ts, BuyTogetherBlock.tsx | só execução |
| Grade sem variação diz qual escolha falta; esgotado não é escolhível; peça sem variação vendável não aparece | `addonMissingChoice` em total.ts, `restrict` e `pieceOf`, testes "Escolha o Cor da Pingente.", `Rosa` desabilitado, availability.test.ts | só execução |
| Principal esgotado: bloco ausente; combinação indisponível: bloco visível | `mainSoldOut` em useBuyTogether.ts, 3 casos na página | só execução |
| `view_item_list` e `select_item`, uma vez cada | `useTrackList` e `toggle` com `announced`, bloco "medição" na página | só execução |
| Leitura falha: página de pé; nenhum disponível: bloco ausente | `status` 'error' e `display` 'off', 2 casos na página | só execução |
| Prova em navegador a 390×844, alvos ≥ 44 px, 200 % de fonte, espaço reservado sem salto | `min-h-[320px]`, `min-h-11`, `break-words`, `grid-cols-[minmax(0,1fr)]` estão no código. A medida não é conferível aqui. | só execução (navegador) |
| Cada comportamento do bloco `Testes` coberto | ver seção Testes | sim |
| Testes dos arquivos alterados passando e verificação mínima do workspace | | só execução |

## Obrigações

- Bloco em `entities/product/ui/buy-together`, entrando por prop opcional em `ProductInfo`. Não há import de widget por baixo, então não nasce terceira violação FSD.
- PIX do total: `bundlePix` chama `pixPrice` em `total.ts`. Não há soma de PIX por peça. `payment/**` e `core/analytics` estão sem diff.
- `semMaterialNaPaginaDoProduto`: escopo estendido ao hook e à leitura. O bloco está sob `entities/product/ui`, já no escopo, e ganhou âncora própria.
- Tom memorial: `tomDoCompreJunto.test.ts` varre o bloco e o `core/buy-together` do disco.
- Mobile: `grid-cols-[minmax(0,1fr)]`, `min-h-11`, par `motion-reduce:` em `animate-pulse` e `transition-colors`. Os alvos de toque usam `min-h-11` em vez de `TAP_44`. Não vi isso contrariar o guarda (não rodei).
- `ProductBuyBar` e os testes dele não foram tocados.
- `buy_together_ids` saiu do fixture `cardSelect.test.ts`.
- `apps/store/CLAUDE.md` ganhou a seção do bloco. O arquivo não está em `alterados`, mas `git diff` mostra o texto.
- Não faça: não há `add`, carrinho, barra, formas de folha ou fórmula, desconto, nem escrita nas tabelas. `core/analytics` não foi alterado.

## Testes

- Unidade em `core/buy-together`: availability.test.ts e total.test.ts. Cobrem disponibilidade, liberadas que não viram "todas", lista e principal pulados, adicional escondido pela variação, total em centavos, PIX do total (≠ soma dos PIX) e paridade com `isVariantAvailable`. Mordem, pois os valores são literais.
- Página real: ProductPageBuyTogether.test.tsx. Só a fronteira de dados é dublada. Cobre todos os itens do bloco Testes. Mordem, com valores calculados à mão (135 / 128,25 / 330 / 313,50).
- Esqueleto: caso na página com `aria-busy` e `min-h-[320px]` por token exato, mais o caso "sem adicional não há esqueleto". O nível é página, e não componente isolado. Na prática cobre o mesmo comportamento, então não relato.
- GA4: bloco "medição" na página real. Confere a lista `compre-junto`, uma `view_item_list` mesmo com re-render, e `select_item` sem repetir ao desmarcar e remarcar. Morde.
- Tom e material: tomDoCompreJunto.test.ts, com sensor e sensor inverso, e a âncora nova de `semMaterialNaPaginaDoProduto`. Mordem.
- Leitura (fatia `sem mutação`, nº 5): useBuyTogetherData.test.tsx tem 6 casos. Conferem tabela, colunas, FK nomeada, `eq`, `order`, consulta única sem o principal e erro que sobe (config e produtos). Pelas asserções, o teste morde. Li os títulos dos casos, não o corpo de cada um.
- Navegador a 390/130/200 %: sem teste de jsdom, por declaração da tarefa.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Hook à parte (molde `useProductFaqs`), com FK nomeada, em vez de embed no `PRODUCT_SELECT` | sim | A decisão #15 da tarefa deixa a escolha ao implementador. `PRODUCT_SELECT` é compartilhado, como a tarefa diz. Os mocks nos testes de página aparecem no diff. | sim |
| 2 | Estado em `useBuyTogether`, montado em `ProductPage`, passado por prop opcional | sim | Contrato: "um hook em `entities/product/model` que a tarefa 04 consome". `useProductPurchase` não foi tocado. | sim |
| 3 | O PIX do conjunto é calculado no bloco, e o hook devolve só o `total` | sim | A tarefa só exige `pixPrice(total)`. `bundlePix` é o único caminho. | sim |
| 4 | "Escolha a peça." | sim | A tarefa manda "Escolha a corrente." como exemplo. Premissa e CLAUDE.md justificam a troca. É só texto. | sim |
| 5 | "Escolha o <eixo> da <primeira palavra>" | sim | É a letra do Design. | sim |
| 6 | Cópia de `variantSellable` em core, com teste de paridade que lê os dois | sim | O CLAUDE.md raiz prevê "cópia deliberada com guarda que lê os dois". O `denoReach` de `pricing` justifica a cópia. | sim |
| 7 | Peça avulsa vence a lista na repetição | sim | CA-03.7 só diz "nem uma peça que já aparece em outro adicional". Testado. A 05 deve chamar `resolveAddons`, e o raio já diz isso. | sim |
| 8 | "a partir de" na linha antes da escolha; o total nunca o usa | sim | CA-03.4 vale para o total. O Design diz "preço da variação escolhida (nunca "a partir de")", mas antes da escolha não há variação. O teste prova que, depois de escolher, o texto some. É empate, e fica de pé. | sim |
| 9 | O esqueleto só aparece quando a configuração já disse que há adicionais | sim | Letra do Design: "esqueleto só quando há adicionais". O salto possível está declarado. | sim |
| 10 | `select_item` ao marcar, uma vez por adicional | sim | CA-08.1 e o teste. | sim |
| 11 | `idPrefix` no `VariantPicker` e `id` no `EngravingField`, com os padrões intactos | sim | A tarefa pede "`EngravingField` por id". O padrão `ENGRAVING_FIELD_ID` continua lido pela barra fixa. | sim |
| 12 | Adicional que some perde a marca por efeito de poda | sim | Design: "o adicional com `someCom` some e perde a marca". Testado. | sim |
| 13 | Âncora de `purity.test.ts` de 3 para 5 arquivos e 7 visitados, para o grafo transitivo | sim | A contagem acompanha o grafo real, e as réguas não foram afrouxadas. `payment/**` sem diff. | sim |

## Não conferido

- Nenhum teste foi rodado, por regra desta revisão. Tipos, lint e suítes ficam como `só execução`.
- A prova em navegador (390, 130 %, 200 %, CLS, alvos de 44 px) é da Validation.
- Não abri o corpo de todos os casos de availability.test.ts e total.test.ts, só os títulos. Também não abri os arquivos de teste de página alterados só por mock (ProductPage, Related, Variant, cardAbreNaVariacao, MaterialDrawer, produtoMedido, OptionHead) além dos hunks mostrados.
- `touchTarget.test.ts` e `alvoDeToqueNaoRoubaPosicao.test.ts` não foram executados. Não confirmei que `min-h-11` no lugar de `TAP_44` os satisfaz.
- Todos os arquivos de `alterados` aparecem como `M`, `A` ou `??` com intent-to-add já aplicado. Mesmo assim, a árvore mistura tarefas anteriores da onda (tarefa 02 no backoffice, migration), e eu não as julguei.
- Instruções lidas: `CLAUDE.md` da raiz (só o que veio no contexto: Mapa, Defeito 01, Convenções, Guardas, Baselines, CI e deploy, FSD), e `apps/store/CLAUDE.md` e `packages/core/CLAUDE.md` pelo que está no diff (seção do bloco). Não li essas seções inteiras direto do disco.

## T03 — wi-impl-task · done · agente a2b069f3b2dae0f4e

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/03-bloco-na-pagina-do-produto.md
Situação: fechou

## Aborto
nada

## Decisões e premissas
nada (a correção não revê nenhuma das 13 premissas da implementação)

## Fatias
nada (nenhuma fatia reaberta)

## Repositórios tocados
/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

## Arquivos alterados
- `apps/store/src/entities/product/model/useBuyTogether.ts`: alterado. O comentário do hook agora diz "O hook só decide e mostra; a sacola e a barra fixa leem o mesmo estado."
- `apps/store/src/pages/ProductPage.tsx`: alterado. O comentário agora diz "a sacola e a barra fixa leem o mesmo estado."

## Verificação
- `grep -n tarefa` nos dois arquivos não acha mais nada. Nos demais arquivos novos do bloco (`ui/buy-together/*.tsx` e `api/useBuyTogetherData.ts`) também não havia menção.
- `pnpm --filter @estrelinha/store exec vitest run src/pages/__tests__/ProductPageBuyTogether.test.tsx --testTimeout=20000`: 26/26 passam. O comando segue o PROJECT.md › Comandos de verificação.
- Mudança só em comentário. Tipos, lint e suítes completas do fecho (core 5277/211, store 6717/358) não foram rodados de novo.
- Instruções lidas: nada novo; vale o que a implementação leu.

## Divergências e descobertas
nada

## Ao humano
nada (achado 1 aplicado integralmente)

## O que devolver no fim
Tarefa: 03
Caso: fechou com divergência (a divergência é a da implementação: nomes e textos do desenho que diferem do implementado, nas decisões 4 e 5 da implementação; a correção não acrescentou nenhuma)
Instruções lidas: as da implementação: `CLAUDE.md` (raiz), `apps/store/CLAUDE.md` (seções citadas), `packages/core/CLAUDE.md` (seções citadas), `.specs/project/PROJECT.md` › Comandos de verificação e Ambiente local
Testes escritos: os da implementação, sem acréscimo. A prova em navegador a 390×844, 130 % e 200 % segue pendente para a Validation.
Verificações: core 5277/211 exit 0; store 6717/358 exit 0; tipos store 0; tipos core 11 herdados; lint store 2/2 (igual à baseline). Após a correção rodou só o arquivo de página do bloco, 26/26.
Árvore de trabalho: os arquivos da implementação, mais os dois comentários corrigidos. Nada commitado, e a linha Status não foi tocada.
Citações conferidas: 14, sem deslocamento nem citação morta (da implementação).
Propagado: nada
Caducou: nada

## T04 — wi-impl-task · aborted · agente a470f9ebac984879e

Tarefa: 04
Caso: fechou com divergência
Instruções lidas: `CLAUDE.md` da raiz (lido por seções) e `apps/store/CLAUDE.md` (lido por seções). O `packages/core/CLAUDE.md` e `.specs/project/PROJECT.md › Comandos de verificação` não foram lidos por inteiro, só consultados quanto à pureza do módulo e aos comandos. Comandos de tipos, de um arquivo e da suíte do workspace: do `PROJECT.md`, que remete a `CLAUDE.md` §Comandos e §Baselines.

Testes escritos (todos verdes):
- **Página real, sem marcação** (`apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx`): o botão diz "Adicionar à sacola", leva só o principal e a gaveta abre.
- **Página real, com marcação** (mesmo arquivo): o botão diz "Levar o conjunto". Roda para a coluna e para a barra fixa e as duas levam o mesmo.
  - Cada peça entra como linha própria, com variação, gravação e a marca.
  - O adicional entra com quantidade 1, mesmo com o principal em 3.
  - Peça que já estava na sacola soma e ganha a marca.
  - As gravações do principal e do adicional entram, cada uma na sua linha.
- **Página real, recusas** (mesmo arquivo): nada entra e o foco vai ao adicional ou ao campo.
  - Falta de escolha: o aviso some quando a escolha é feita e aí leva.
  - Gravação do adicional acima do limite: a recusa aparece junto do campo.
  - Gravação do principal acima do limite.
  - Combinação do principal indisponível: o bloco fica e o botão da coluna bloqueia.
- **Barra fixa** (mesmo arquivo): total e "Conjunto · N peças" sem Pix com marcação; preço e "no Pix" sem marcação. Ficou no nível da página real, não no teste isolado de `ProductBuyBar`. Os `ProductBuyBar*.test.tsx` seguem verdes.
- **GA4, unidade** (`packages/core/src/analytics/__tests__/events.test.ts` e `items.test.ts`): `add_to_cart` com vários itens, `item_list_id` e `item_list_name` nos adicionais. `denoReach` segue verde. Na página real: um evento só, o principal uma vez, nenhum `select_item`, e a tarefa não emite `view_item_list`.
- **Carrinho, unidade** (`apps/store/src/entities/cart/model/__tests__/cartStore.test.ts`): `migrate` v3→v4 intacto, versão 4, chave `estrelinha-cart` mantida, `addItems`, soma e acúmulo de marcas, `companionsOf`, remoção do principal tirando a frase, remoção de um adicional preservando os outros.
- **Frase da sacola** (`apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx`): "Acompanha o X e o Y", com o nome completo; some quando o principal é removido.
- **Mutação**: mutantes reinjetados nos arquivos reais e restaurados com `cmp`; nenhum arquivo ficou quebrado. Em `useBuyAction`, `useProductPurchase`, `cartStore` e `events.ts` os testes reprovaram. Dois mutantes de `companionsOf` sobreviveram, e um caso novo cobrindo-os matou os dois.
- **Sem cobertura: prova em navegador** (390×844, 130 % e 200 % de fonte, barra do sistema, rolagem lateral). Servidor e navegador estão fora do escopo da tarefa (regra 8); fica para a validação.

Verificações:
- `npx tsc --noEmit -p apps/store/tsconfig.app.json`: 0 erros. `packages/core/tsconfig.json`: 11 erros herdados, os mesmos arquivos do baseline.
- Suíte do core: 5291 testes passam, 212 arquivos, exit 0.
- Suíte da loja (`pnpm --filter @estrelinha/store test --testTimeout=20000`): 6728 passam e 38 falham, em 3 arquivos que não são meus.
  - Os três: `ProductPageBuyTogether.test.tsx` (26), `ProductPageMaterialDrawer.test.tsx` (9) e `produtoMedido.test.tsx` (3).
  - Erro nos três: `No QueryClient set` / `useStoreSettings` ausente no mock de `@estrelinha/core/hooks/useStoreSettings`.
  - Causa provável: o `BuyTogetherBlock` da tarefa 07 passou a chamar `useBuyTogetherForm`, que lê `useStoreSettings`, antes do `return` de `display === 'off'`.
  - Atenção: não rodei esses arquivos sem a minha mudança, então o vínculo com a 07 é leitura da pilha de erros, não prova. O `produtoMedido` não menciona o bloco e deve ser conferido primeiro.
  - A tarefa 07 precisa dublar `useStoreSettings` nesses testes (o meu arquivo novo já faz isso) ou o bloco precisa sobreviver sem o provider.
- ESLint nos arquivos tocados: 0 erros e 2 warnings de fronteira FSD que já existiam. Backoffice e mobile-adm não foram tocados.

Árvore de trabalho (nada commitado por mim):
- **core**:
  - `packages/core/src/analytics/items.ts`: `list_id`/`list_name` no item e `item_list_id`/`item_list_name` na allowlist.
  - `packages/core/src/analytics/events.ts`: `addToCartEvent` aceita `{ item }` ou `{ items }`.
  - Testes de `events` e `items` do core estendidos.
- **loja, carrinho**: `entities/cart/model/cartStore.ts` (tipos `CompanionMark` e `CartEntry`, campo `accompanies`, `addItems`, `companionsOf`, versão 4) e o `cartStore.test.ts` (o caso "versão é 3" virou "é 4").
- **loja, compra**:
  - Criado: `entities/product/model/useBuyAction.ts`.
  - Alterados: `useProductPurchase.tsx`, `ProductInfo.tsx`, `ProductBuyBar.tsx`, `ProductPage.tsx`, o barrel `entities/product/index.ts`.
  - Alteração mínima aditiva em `useBuyTogether.ts`: `listId` em `BuyTogetherAddon` e em `TakenAddon`.
- **loja, sacola**: `CartDrawerRow.tsx`, `drawerFacts.ts` (`companionPhrase`) e o teste novo da frase.
- **Docs**: `apps/store/CLAUDE.md` ganhou "O botão único leva o conjunto" e "A sacola v4 e a marca acompanha".
- **Fora da cerca da tarefa 07**: não toquei em `settings.ts`, nos arquivos do bloco nem em `apps/backoffice`.

**Decisões e premissas**
1. **Forma da marca.** `accompanies?: { mainProductId, listId | null }[]` no item do carrinho, só o id do principal, nunca o nome. A frase é derivada na renderização, o que dá CA-05.3 sem escrita extra. A tarefa 05 consome este campo. Descartei guardar o nome no item, que ficaria desatualizado.
2. **Botão único.** `useBuyAction` é montado uma vez na página e passado a `ProductInfo` e `ProductBuyBar` por prop opcional. Sem a prop cada um monta o seu, para os testes antigos não quebrarem. O aviso e a validação ficam num lugar só.
3. **Aviso de combinação indisponível.** A coluna já mostra a frase ao lado do seletor, então não criei um segundo aviso. O `useBuyAction` só avisa a tentativa com escolha faltando ou gravação recusada.
4. **Aviso derivado do estado.** Some quando a causa some, sem limpeza manual.
5. **Mensagem para N > 1 peças.** O texto "Elas estão marcadas acima." é minha redação; a tarefa cita só "… em N peças.".
6. **N de "Conjunto · N peças".** Conta os adicionais marcados, completos ou não, como a CA-04.9 pede. O total só soma os completos.

**Divergências**
- A leitura do bloco `Testes` e o `.specs/work-items/` ficaram dentro da árvore deste Work Item; o caminho da tarefa citado pelo orquestrador está no worktree e foi o usado.
- Citações do código conferidas: `cartStore.ts` (104-134 e 169-190), `useProductPurchase.tsx` (116-157), `ProductBuyBar` e `ProductInfo`, `events.ts` — todas abertas e sem deslocamento relevante. `CartDrawerRow` (34-115) foi aberto no trecho da gravação.
- A fixture `ProposalCheckoutPage.test.tsx` segue com `version: 3` literal; o `migrate` a preserva e ela exercita a migração. Mantida.
- **Prova em navegador** da seção Obrigações não executada (ver acima).

Propagado: nada. Nenhuma afirmação da tarefa 05 ficou falsa; ela já supõe `addItems` e a marca com principal e lista.
Caducou: nada.

## T07 — wi-impl-task · review · agente ac326adcda1f08f0e

Tarefa: 07 (/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/07-forma-do-bloco.md)
Caso: fechou com divergência (a prova em navegador ficou de fora, ver Verificações; o restante do bloco Testes está coberto)
Situação: fechou

Instruções lidas: CLAUDE.md da raiz (seções listadas na tarefa: defeito 01, guardas, convenções, baselines, CI, FSD), apps/store/CLAUDE.md, apps/backoffice/CLAUDE.md e packages/core/CLAUDE.md (as seções que a tarefa nomeia), `.specs/project/PROJECT.md` (Comandos de verificação, Ambiente local). `tdd.md` lido.

Decisões e premissas
1. A forma fica em `store_settings`, chave `buy_together`, valor `{ form: 'inline' | 'sheet' | 'formula' }`, sem migration.
   - Descartei uma consulta separada só para essa chave.
   - Como a chave entrou em `SettingsKey`/`SettingsMap`/`DEFAULTS`, a leitura reaproveita o `select` das outras chaves (zero requisição nova).
   - O hook é à parte: `useBuyTogetherForm`, em `core/hooks`.
   - Raio: `packages/supabase/src/types/settings.ts` (`DEFAULT_BUY_TOGETHER`, o tipo `form: string`, deliberadamente cru) e `useStoreSettings.ts`.
2. O vocabulário e a normalização moram em `core/buy-together/settings.ts`; o tipo do banco é `string` para não ter uma segunda lista das três formas.
   - `storeSettingsDefaults.test.ts` compara `DEFAULT_BUY_TOGETHER.form` com `DEFAULT_BUY_TOGETHER_FORM`, e confere que nenhuma migration grava `'buy_together'`.
3. "Em folha": fechar sem completar a escolha (Esc, fundo ou "Fechar") tira a marca do adicional e abre mão da escolha parcial; fechar com a escolha completa mantém.
   - Descartei deixar marcado um adicional incompleto, que o botão de compra recusaria depois.
   - O painel de escolhas é o mesmo `AddonPanel`, extraído de `AddonRow`.
   - O foco vai ao título ao abrir. Ao fechar, volta ao controle que abriu (a caixa ou o link "Ver opções"), registrado em ref, porque o Radix só devolve o foco sozinho quando há `Trigger`.
   - Raio: só o bloco da loja.
4. Celular usa folha de baixo (`Sheet`, `useCompactViewport`, abaixo de 768 px); computador usa `Dialog`. Usei o X padrão do `Dialog`, com o "Close" sr-only em inglês do primitivo.
5. "Com fórmula": a faixa é `aria-hidden`, mostra só "Esta joia" + os nomes dos adicionais, e os nomes são botões com `tabIndex={-1}` que alternam o adicional. O teclado e o leitor de tela ficam só com a lista.
6. O cartão do painel mora no índice de `/admin/compre-junto`, via prop `aside` do índice (`BuyTogetherFormCard`). Usa `toast` direto e não `useToast`, porque o teste do irmão dubla só `toast`.
7. `BuyTogetherBlock` foi dividido em casca e `ReadyBlock`: a forma só é lida quando há bloco a desenhar.
   - Isso evitou "No QueryClient set" nos testes de página com status `off`.
   - Só `ProductPageBuyTogether.test.tsx` precisou de uma linha de mock de `useBuyTogetherForm`.

Fatias (Mutação: `vermelho` = quebrei a implementação e o teste falhou; `—` = teste que não é unitário/de domínio, sem check de mutação)
| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Valor desconhecido/ausente vira "Na linha"; as três formas e os nomes | unidade | `packages/core/src/buy-together/__tests__/settings.test.ts` | sim | vermelho |
| 2 | Default do TS é a forma padrão de core; nenhuma migration grava a chave | guarda | `apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts` (+2 casos) | sim | vermelho (default trocado para `sheet`) |
| 3 | A dona vê as três formas ("Na linha" marcada sem escolha), escolhe, grava e relê; valor inválido abre "Na linha"; falha de gravação avisa | página real do painel | `apps/backoffice/src/pages/admin/AdminBuyTogetherForm.test.tsx` (5) | sim | — |
| 4 | "Na linha" é o padrão; valor desconhecido não quebra a página | página real da loja | `apps/store/src/pages/__tests__/ProductPageBuyTogetherForma.test.tsx` | sim | — |
| 5 | "Com fórmula": faixa `aria-hidden` acima da lista, fora do leitor de tela; chip alterna o adicional | página real da loja | idem | sim | vermelho (tirei `aria-hidden`) |
| 6 | "Em folha": título com foco, Incluir desabilitado até completar, Esc, foco de volta, "Ver opções" sem marcar, peça simples sem folha, celular com folha de baixo | página real da loja | idem | sim | vermelho (foco de volta, foco no título, desmarcar ao sair, `disabled` do Incluir: os quatro mutantes reprovaram) |
| 7 | Regras iguais nas três formas (total 100+35, PIX 128,25, esgotada desabilitada, falta de escolha dita e adicional marcado incompleto fora do total) | página real da loja | idem (`describe.each` das 3 formas) | sim | — |

Repositórios tocados
/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

Arquivos alterados (caminhos relativos ao worktree)
- criado: `packages/core/src/buy-together/settings.ts`, `packages/core/src/buy-together/__tests__/settings.test.ts`, `packages/core/src/hooks/useBuyTogetherForm.ts`
- alterado: `packages/core/src/buy-together/index.ts` (export de `settings.ts`), `packages/core/src/buy-together/__tests__/purity.test.ts` (âncora de 5 para 6 arquivos e de 7 para 8 visitados), `packages/core/src/hooks/useStoreSettings.ts`, `packages/supabase/src/types/settings.ts`
- criado: `apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherFormCard.tsx`, `apps/backoffice/src/pages/admin/AdminBuyTogetherForm.test.tsx`
- alterado: `apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherListsIndex.tsx`, `apps/backoffice/src/features/buy-together-lists/index.ts`, `apps/backoffice/src/pages/admin/AdminBuyTogetherPage.tsx`, `apps/backoffice/CLAUDE.md` (seção do Compre Junto › Listas)
- criado: `apps/store/src/entities/product/ui/buy-together/{AddonPanel.tsx, AddonSheet.tsx, FormulaStrip.tsx, panel.ts}`, `apps/store/src/pages/__tests__/ProductPageBuyTogetherForma.test.tsx`
- alterado: `apps/store/src/entities/product/ui/buy-together/{AddonRow.tsx, BuyTogetherBlock.tsx}`, `apps/store/src/pages/__tests__/ProductPageBuyTogether.test.tsx` (uma linha de mock), `apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts`
- Não toquei em `apps/store/CLAUDE.md`, `ProductInfo`, `ProductPage`, `ProductBuyBar`, `cartStore`, `useProductPurchase` nem analytics.

Verificação
- Instruções e PROJECT.md: comandos de `CLAUDE.md` §Comandos/§Baselines e de `PROJECT.md` (`pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`).
- `tsc --noEmit -p apps/store/tsconfig.app.json`: 0 erros. `apps/backoffice/tsconfig.app.json`: 0 erros. `packages/core/tsconfig.json`: 11 erros, todos herdados (carousel, pickHome, urls, client.ts), nenhum em arquivo meu.
- Core, suíte inteira: 212 arquivos, 5291 testes, tudo verde.
- Store, suíte inteira: 361 arquivos, 6766 testes, tudo verde, exit 0 (inclui o trabalho das outras tarefas da árvore).
- Backoffice, suíte inteira: 5023 passaram e 1 falhou, `originZipNotRead.test.ts`.
  - O guarda acusa `origin_zip` na linha 18 de `apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx`.
  - É arquivo da tarefa 04, em andamento em paralelo (está na cerca), não meu; não mexi. A 04 precisa tirar esse literal da fixture.
- ESLint nos arquivos que toquei: 0 erros. No painel, 0 warnings. Na loja, uma primeira versão acrescentou 3 warnings de `react-refresh/only-export-components`; movi os helpers para `panel.ts` e os warnings sumiram.
- Prova em navegador a 390 e 1440: NÃO feita. O PROJECT.md e a regra 8 proíbem subir dev server nesta tarefa, e a validação em navegador é da skill de QA. Ficam por provar: rolagem horizontal, alvos de 44 px e fonte a 200% nas três formas. Pontos a olhar: a folha de baixo com `max-h-[90dvh]` no celular, o diálogo no computador, e a faixa de fórmula quebrando linha com nomes longos. `motion-reduce` foi aplicado nas classes de animação da folha e do diálogo, e o guarda de movimento do painel não cobre o novo cartão (ele não declara transition).
- O "o que vai à sacola" (CA-09.3 com o carrinho) não tem teste da minha parte: o envio do conjunto ao carrinho é da tarefa 04. A igualdade das regras ficou provada em total, PIX, variação faltando e esgotada, nas três formas.
- Baseline de contagem: o store veio a 6766/361 e o backoffice a 5024/278 (1 reprovação alheia). Os números do CLAUDE.md raiz não foram atualizados por mim.

Divergências e descobertas
- `AddonRow` e `BuyTogetherBlock` (da tarefa 03) foram alterados: o painel foi extraído para `AddonPanel` e a forma entra por prop. A tarefa autoriza trocar a forma no componente raiz; o comportamento da forma "Na linha" ficou idêntico (os 582 testes de `entities/product` e das páginas do Compre Junto passam).
- `purity.test.ts` de `core/buy-together` teve a âncora de contagem atualizada (mais um arquivo no módulo), sem afrouxar régua.
- O `Dialog` do `packages/ui` traz um "Close" sr-only em inglês; não alterei o primitivo.
- Fatias 4, 5, 6 e 7 foram escritas depois da implementação (a extração do painel e a folha nasceram juntas). Os quatro mutantes de 6, o de 5 e os de 1 e 2 provam que os testes mordem.

Citações conferidas: 6 (`packages/core/src/shipping` como molde de setting, `storeSettingsDefaults.test.ts`, `dialog.tsx`/`sheet.tsx`, `dialogGridTrack` via grid-cols-1 do Dialog, `features/settings` com `SettingsSaveButton`/`FormCard`, página do menu da tarefa 01). Nenhuma deslocada; nenhuma morta. A página do menu fica em `AdminBuyTogetherPage.tsx` (índice), não na de lista.

Propagado: nada.
Caducou: nada.
Bloqueio: nada.

## T07 — wi-impl-review · aborted · agente a1d699b8ceec5060a

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/07-forma-do-bloco.md
Veredito: serve com correção, no sentido de que a revisão não pôde ser feita. Não há achados porque não havia o que julgar, e isso não é aprovação.

Parei sem ler o diff nem a tarefa. A entrada traz `alterados: nada`, ou seja, nenhum arquivo para julgar. O procedimento define `alterados` como a fronteira do que eu julgo. A árvore do worktree tem dezenas de arquivos modificados, de `apps/backoffice` e `apps/store`. Esses arquivos podem ser da tarefa 07 ou de outras tarefas da onda, e sem a lista não consigo separar uma coisa da outra. Julgá-los sem fronteira seria atribuir ao implementador trabalho que pode não ser dele.

## Achados
nada

## Cobertura da tarefa
Não conferida. Não li a tarefa nem o diff porque `alterados` veio vazio.

## Obrigações
Não conferidas.

## Testes
Não conferidos.

## Premissas
nada (recebido `nada`).

## Não conferido
- Tudo. A causa é `alterados: nada`. Reenvie a revisão com a lista real de arquivos tocados pela tarefa 07.
- Se a tarefa 07 de fato não alterou nada, o implementador não entregou, e isso deve ser tratado antes de revisar.
- Verifiquei só que `tasks/07-forma-do-bloco.md` existe no worktree e que `git status` mostra a árvore suja.
Instruções lidas: nenhuma.

## T07 — wi-impl-task · aborted · agente abbbe2b68f54d3195

Tarefa: 07
Caso: fechou com divergência
Instruções lidas: `CLAUDE.md` da raiz (lido por inteiro, é o arquivo único); `.specs/project/PROJECT.md` › Comandos de verificação e Ambiente local. Não reli `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md` nem `packages/core/CLAUDE.md`: a retomada encontrou o trabalho quase todo pronto e só confirmei com testes.

Retomada: uma execução anterior deixou na árvore, completas e com teste, todas as fatias abaixo. Rodei o teste de cada uma, todos verdes, e as dei por prontas sem reescrever. A coluna Mutação seria `retomada`, mas fiz o check de mutação só no `settings.ts`.

Testes escritos (já existiam na árvore, confirmados verdes):
- Normalização da forma (unidade): `packages/core/src/buy-together/__tests__/settings.test.ts`, 13 casos. Valor desconhecido, ausente ou de outro tipo vira "Na linha". Mutação: troquei o retorno padrão do `settings.ts` por `value as BuyTogetherForm`. 9 casos falharam; restaurei a cópia e conferi com `cmp`.
- O default do TypeScript bate com o banco (guarda): `apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts`. Confere que `DEFAULT_BUY_TOGETHER.form` é a forma padrão de `core` e que nenhuma migration grava `buy_together`. 53 casos verdes.
- Painel, a dona escolhe a forma, grava e relê (página real): `apps/backoffice/src/pages/admin/AdminBuyTogetherForm.test.tsx`. Passou junto com `AdminBuyTogether.test.tsx`, 23 casos.
- Loja, as três formas pela página real do produto: `apps/store/src/pages/__tests__/ProductPageBuyTogetherForma.test.tsx`, 18 casos. Cobre "Em folha" (foco no título, Esc, foco de volta), a faixa de "Com fórmula" fora do leitor de tela, e as regras de compra iguais nas três formas.
- Sem cobertura: a prova em navegador a 390 e 1440. Não subi servidor nem navegador (regra 8, e a validação em navegador é da QA). A fatia fica sem execução nesses dois viewports.

Verificações (comandos do `CLAUDE.md` › Comandos e do `PROJECT.md`):
- `tsc` do store: 0 erros. `tsc` do backoffice: 0 erros. `tsc` de `packages/core`: 11 erros, o mesmo número de baseline herdado, nenhum em arquivo que toquei (comparei só pela contagem).
- Suíte do store: 361 arquivos, 6768 testes, exit 0.
- Suíte do backoffice: 278 arquivos, 5024 testes, 2 falhas.
  - `AdminOrdersPage.aviso.test.tsx`, lote de 60 pedidos: falhou na suíte cheia e passou rodado só com `originZipNotRead`, junto com o outro arquivo. Parece contenção de tempo; é o caso que a baseline já descreve, mas não rodei o arquivo sozinho.
  - `originZipNotRead.test.ts`: reprova. É um achado real, abaixo.
- Core (`src/buy-together`): 5 arquivos, 61 testes, verdes.

Árvore de trabalho (não commitei nada):
- `packages/core/src/buy-together/settings.ts`, `__tests__/settings.test.ts` e `index.ts`.
- `packages/core/src/hooks/useBuyTogetherForm.ts` e `useStoreSettings.ts`.
- `packages/supabase/src/types/settings.ts`.
- Loja: `apps/store/src/entities/product/ui/buy-together/` (`AddonSheet.tsx`, `FormulaStrip.tsx`, `BuyTogetherBlock.tsx`, `AddonRow.tsx`, `AddonPanel.tsx`), `ProductPageBuyTogetherForma.test.tsx` e `storeSettingsDefaults.test.ts`.
- Painel: `apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherFormCard.tsx`, o `index.ts` da feature, `BuyTogetherListsIndex.tsx` (prop `aside`), `AdminBuyTogetherPage.tsx`, `AdminBuyTogetherForm.test.tsx` e `apps/backoffice/CLAUDE.md` (parágrafo do cartão).
- Não toquei em `apps/store/CLAUDE.md`. A nota da forma do bloco na loja fica para a tarefa 06.

Citações conferidas: 6, as que usei. Nenhuma morta nem deslocada. Conferi a pasta do bloco (tarefa 03) e a página do menu (tarefa 01), ambas presentes. Dos exemplares, abri `core/shipping` e `storeSettingsDefaults` pela forma que a execução anterior já seguiu. `dialog.tsx` e `sheet` entram pelo `AddonSheet`. Os cartões de `features/settings` não abri.

Divergências e descobertas:
- `originZipNotRead.test.ts` do painel reprova por `apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx:18`, que contém `origin_zip`. Esse arquivo é da tarefa 04, em `widgets/cart-drawer`, que está na cerca de não-tocar. Não corrigi. O conserto é tirar a chave `origin_zip` da fixture, como o `CLAUDE.md` já registrou para o fecho da `89`. Tem de ser feito pela tarefa 04 ou no fecho do WI.
- `storeSettingsDefaults` não assere "o que o banco grava", porque a chave `buy_together` não tem migration. A premissa é que a ausência da linha é o padrão. O guarda confere o lado do TypeScript e que nenhuma migration semeia a chave. Raio de alcance: só esse teste.
- O `dismiss` do `AddonSheet` tira a marca do adicional quando a folha é fechada com a escolha incompleta. Premissa tomada na execução anterior: a folha existe para completar a escolha, e deixar marcado um adicional que o botão de compra recusaria seria uma armadilha. Raio de alcance: só a forma "Em folha".

Propagado: nada.
Caducou: nada.

## T04 — wi-impl-task · aborted · agente a45657b147f13d445

Tarefa: 04 (levar o conjunto)
Caso: fechou com divergência — o código e os testes estão verdes, mas a suíte da loja sai com exit 1 por um erro não tratado do vitest (descrito abaixo).
Instruções lidas: CLAUDE.md da raiz (seções do preflight), apps/store/CLAUDE.md, packages/core/CLAUDE.md. Li as seções citadas pela tarefa e usei os comandos de verificação do CLAUDE.md da raiz. Não abri o PROJECT.md.

Retomada: encontrei quase tudo pronto na árvore, deixado pela execução interrompida.
- Código já feito: `cartStore` v4 com `migrate`, `addItems` e a marca `accompanies`; `useProductPurchase.add(taken)`; `useBuyAction`; `ProductInfo` e `ProductBuyBar` com o botão único; `CartDrawerRow` e `drawerFacts` com a frase "acompanha"; `core/analytics` com `add_to_cart` de vários itens e `item_list_id`.
- Testes já escritos: `ProductPageLevarConjunto.test.tsx` (16), `CartDrawerAcompanha.test.tsx` (5), `cartStore.test.ts` (v3→v4, `addItems`), `events.test.ts` e `items.test.ts`.
- Documentação já escrita em `apps/store/CLAUDE.md`: Carrinho v4 e a marca, o botão único, o bloco Compre Junto.
- Rodei os arquivos dessas fatias: 190 passaram na loja, 85 em `core/analytics`.

Lacuna que completei: faltava o teste no nível do componente `ProductBuyBar` (total do conjunto, "Conjunto · N peças" e sem o PIX com adicional marcado; preço e "no Pix" sem marcação). Acrescentei 2 casos em `apps/store/src/widgets/product-buy-bar/ui/__tests__/ProductBuyBar.test.tsx`. O arquivo passa com 25.

Testes escritos, por comportamento do bloco `Testes`:
- Página real (botão, linhas, quantidade 1, barra e CTA levam o mesmo; recusa de gravação; principal indisponível): `ProductPageLevarConjunto.test.tsx`.
- Carrinho (`migrate` v3→v4, soma e "acompanha o X e o Y", remover o principal, remover um adicional): `cartStore.test.ts` e `CartDrawerAcompanha.test.tsx`.
- GA4: `core/analytics/__tests__/events.test.ts` e `items.test.ts`, mais `ProductPageLevarConjunto.test.tsx` (`add_to_cart` de uma vez só, principal uma vez, sem emitir `view_item_list` nem `select_item` da tarefa).
- Barra fixa: `ProductBuyBar.test.tsx`.
- Prova em navegador (390×844, 130 % e 200 %): não feita. Navegador e servidor ficam fora da tarefa (regra 8), então fica para a QA.

Verificações:
- `npx tsc --noEmit -p apps/store/tsconfig.app.json`: 0 erros. O baseline do CLAUDE.md é 0, então não houve regressão.
- `packages/core/tsconfig.json`: 11 erros, os 11 herdados do baseline do CLAUDE.md, sem alteração.
- `pnpm --filter @estrelinha/core test --testTimeout=20000`: exit 0, 5291 testes em 212 arquivos.
- `pnpm --filter @estrelinha/store test --testTimeout=20000`: 6768 testes em 361 arquivos, todos passam. O comando sai com exit 1 nas duas rodadas, por um erro não tratado do vitest: `Timeout calling "onTaskUpdate"` (RPC do worker).
  - Nenhuma asserção falhou. Isso não é falha de teste, mas a verificação não saiu limpa e o humano deve revisar.
  - Provável causa: a carga da máquina, com a tarefa 07 rodando em paralelo e guardas que varrem disco. É hipótese, não medida, e não consegui comparar com uma árvore sem as minhas mudanças.
- Painel não tocado por esta tarefa, então a suíte do backoffice não foi rodada.

Árvore de trabalho (worktree `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01`), arquivos desta tarefa:
- `apps/store/src/entities/cart/model/cartStore.ts` (+ teste)
- `apps/store/src/entities/product/model/useProductPurchase.tsx`
- `apps/store/src/entities/product/model/useBuyAction.ts` (criado)
- `apps/store/src/entities/product/ui/ProductInfo.tsx`
- `apps/store/src/widgets/product-buy-bar/ui/ProductBuyBar.tsx` (+ teste alterado nesta rodada)
- `apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx` e `model/drawerFacts.ts`
- `packages/core/src/analytics/events.ts` e `items.ts` (+ testes)
- `apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx` e `widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx` (criados)
- `apps/store/CLAUDE.md`

Sem commit, sem alteração na linha `**Status:**`.

Citações conferidas: não abri uma a uma as citações `caminho:linha` da tarefa, porque o código já estava escrito. Conferi só a existência e a forma do `cartStore` v4 e dos testes de migração. Nenhuma citação morta e nenhuma propagação necessária.

Mutação: não apliquei o check de mutação. O trabalho já estava na árvore da corrida interrompida, e os dois testes novos de `ProductBuyBar` passaram de primeira sem esse check. Os dois casos são de componente, com `buyTogether` dublado por cast.

Caducou: nada.

## T04 — wi-impl-task · review · agente a48ae9edfe5ebff05

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/04-levar-o-conjunto.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartei | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A marca é uma lista: `CartItem.accompanies?: { mainProductId, listId }[]`. A linha guarda a lista de origem (`listId`, `null` na peça avulsa), e quando a mesma peça é levada por outro principal a marca nova entra na lista sem repetir uma que já está lá | Uma marca única por linha | CA-04.1 pede "acompanha o X e o Y" numa linha que soma, e uma marca só perderia o segundo principal | Tarefa 05: as colunas de `order_items` (pensadas para um principal só) vão ter de escolher qual marca gravar, ou gravar todas. Já propagado no contrato da 05 |
| 2 | Um objeto só, `useBuyAction(purchase, buyTogether)` (`entities/product/model`), montado pela `ProductPage` e passado à `ProductInfo` e à `ProductBuyBar` pela prop opcional `action`. Sem a prop, cada superfície monta o seu próprio | Duplicar o rótulo e a validação em cada superfície | O botão é único (D-estado-de-compra), e a prop opcional mantém de pé os testes antigos de `ProductInfo` e `ProductBuyBar` | `ProductInfo`, `ProductBuyBar`, tarefa 07 (os botões das formas) |
| 3 | `addToCartEvent` aceita `{ item }` ou `{ items }`. `list_id`/`list_name` passam a ser campos do item e saem como `item_list_id`/`item_list_name` | Uma função irmã | É a forma de menor superfície: o tipo de entrada fica um só, e quem já chamava com `{ item }` não muda | `core/analytics` (que o Deno lê por `purchase.ts`; `denoReach` verde) |
| 4 | A recusa de gravação de um adicional e a escolha que falta são barradas em `useBuyAction`, antes de chamar `purchase.add`. Em `add` só a gravação do principal aborta | Validar tudo dentro de `add` | O foco e o aviso já moram onde mora o estado do conjunto | `useProductPurchase`, `useBuyAction` |
| 5 | Mexi em `useBuyTogether.ts` para expor `listId` no adicional e em `TakenAddon`, sem tocar a pasta do bloco (`ui/buy-together/`) | Deduzir a lista de outra fonte | A marca precisa da lista (CA-06.1), e o hook é o dono do estado do conjunto. A cerca da 07 nomeia só a pasta do bloco | Tarefa 07 consome o hook, e a mudança só acrescenta um campo |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `migrate` v3→v4 preserva a sacola; chave `estrelinha-cart`, versão 4 | unidade do store | `apps/store/src/entities/cart/model/__tests__/cartStore.test.ts` | sim | retomada |
| 2 | `addItems`: linhas próprias, o adicional com quantidade 1, a peça que já está na sacola soma e ganha a marca, as marcas se acumulam | unidade do store | `cartStore.test.ts` | sim | retomada (check meu: sem a soma ⇒ vermelho) |
| 3 | `companionsOf` / frase "Acompanha o X e o Y"; removido o principal, a frase some; remover um adicional não remove as outras linhas | unidade do store e da linha da sacola | `cartStore.test.ts`, `apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx` | sim | retomada (check meu: `companionsOf` sem `main &&` ⇒ vermelho; "e" trocado por "," ⇒ vermelho) |
| 4 | GA4: `add_to_cart` com vários itens, o principal uma vez, `item_list_id` nos adicionais | unidade de `core/analytics` | `packages/core/src/analytics/__tests__/events.test.ts`, `items.test.ts` | sim | retomada (check meu: `items.slice(0,1)` ⇒ vermelho; sem `item_list_id` ⇒ vermelho) |
| 5 | Página real: sem marcação "Adicionar à sacola" leva só o principal; com marcação "Levar o conjunto" leva todos (variação, gravação, quantidade 1); a coluna e a barra fixa levam o mesmo; a gaveta abre | página real | `apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx` | sim | retomada |
| 6 | Página real: um único `add_to_cart` com o principal uma vez; o toque não emite `view_item_list` nem `select_item` | página real | `ProductPageLevarConjunto.test.tsx` (asserção apertada nesta corrida: compara antes e depois do toque) | sim | retomada |
| 7 | Gravação recusada (do principal ou de um adicional), escolha faltando, combinação indisponível do principal: nada entra, e o aviso e o foco ficam junto do campo | página real | `ProductPageLevarConjunto.test.tsx` | sim | retomada |
| 8 | Barra fixa: com marcação, total e "Conjunto · N peças" sem o Pix; sem marcação, preço e "no Pix" | componente `ProductBuyBar` e página real | `apps/store/src/widgets/product-buy-bar/ui/__tests__/ProductBuyBar.test.tsx`, `ProductPageLevarConjunto.test.tsx` | sim | retomada |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

## Arquivos alterados

apps/store/src/entities/cart/model/cartStore.ts alterado
apps/store/src/entities/cart/model/__tests__/cartStore.test.ts alterado
apps/store/src/entities/product/model/useProductPurchase.tsx alterado
apps/store/src/entities/product/model/useBuyAction.ts criado
apps/store/src/entities/product/model/useBuyTogether.ts alterado
apps/store/src/entities/product/index.ts alterado
apps/store/src/entities/product/ui/ProductInfo.tsx alterado
apps/store/src/pages/ProductPage.tsx alterado
apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx criado
apps/store/src/widgets/product-buy-bar/ui/ProductBuyBar.tsx alterado
apps/store/src/widgets/product-buy-bar/ui/__tests__/ProductBuyBar.test.tsx alterado
apps/store/src/widgets/cart-drawer/model/drawerFacts.ts alterado
apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx criado
packages/core/src/analytics/events.ts alterado
packages/core/src/analytics/items.ts alterado
packages/core/src/analytics/__tests__/events.test.ts alterado
packages/core/src/analytics/__tests__/items.test.ts alterado
apps/store/CLAUDE.md alterado
.specs/work-items/WI-01-compre-junto/tasks/05-pedido-com-a-marca-acompanha.md alterado

## Verificação

- Arquivos da fatia: `pnpm --filter @estrelinha/store exec vitest run <cartStore, cart-drawer, ProductPageLevarConjunto, product-buy-bar> --testTimeout=20000` (de `PROJECT.md` › Comandos de verificação). Exit 0, 9 arquivos, 145 testes. Depois da edição: `ProductPageLevarConjunto` com 16/16.
- Checks de mutação, um arquivo de cada vez, com cópia fora do repositório e restauração conferida por `cmp`: 5 mutantes, os 5 deram vermelho.
- Tipos: `npx tsc --noEmit -p apps/store/tsconfig.app.json` (de `CLAUDE.md` › Comandos) dá 0 erros, igual ao baseline. `npx tsc --noEmit -p packages/core/tsconfig.json` dá 11 erros, os mesmos 11 herdados do baseline do `CLAUDE.md` (carousel 5, pickHomeBanners 1, pickHomeCollections 1, sitemap urls 2, supabase client 2). Nenhum erro novo.
- Suíte do core: `pnpm --filter @estrelinha/core test --testTimeout=20000` (`CLAUDE.md` › Baselines). Exit 0, 212 arquivos, 5291 testes (`denoReach`, `events`, `items` incluídos).
- Suíte do store: `pnpm --filter @estrelinha/store test --testTimeout=20000` (`CLAUDE.md` › Baselines). Exit 1, 2 testes reprovados em 1 de 361 arquivos (6772 passaram). Os 2 estão em `src/pages/__tests__/ProductPageBuyTogetherForma.test.tsx` ("a forma Em folha": o foco esperado no título da folha cai no `<body>`). Esse arquivo é da tarefa 07, que corre em paralelo nesta árvore, e não é desta tarefa.
- Lint (`npx eslint .` em `apps/store`, de `CLAUDE.md` › Baselines): 2 erros e 2 avisos, igual ao baseline 2/2. Consertei um `no-irregular-whitespace` (NBSP literal) no meu teste.
- Instruções lidas: `CLAUDE.md` (raiz; recebido inteiro no contexto); `apps/store/CLAUDE.md` › A home não salta, › Página do produto (com O bloco Compre Junto e O botão único), › Material afetivo, › A gaveta de material, › Carrinho, chrome e checkout (com A sacola v4); `packages/core/CLAUDE.md` › Quando um código pertence, › Pureza, › Os módulos; `.specs/project/PROJECT.md` › Comandos de verificação.

## Divergências e descobertas

- Retomada: encontrei as 8 fatias prontas na árvore (implementação, testes e documentação em `apps/store/CLAUDE.md`), e rodei os testes delas: verdes. Nesta corrida fiz só três coisas:
  - apertei a asserção "não emite `view_item_list`/`select_item`", que antes era `<= 1` e agora compara antes e depois do toque;
  - consertei o lint do teste;
  - propaguei a forma da marca para a tarefa 05.
- Mutação: as fatias retomadas vão marcadas `retomada`. Para as fatias unitárias 2, 3 e 4 rodei o check agora, e os 5 mutantes deram vermelho.
- Propagado, tarefa 05: a linha do Contrato "marca no carrinho (principal, lista)" agora nomeia a forma real, `CartItem.accompanies?: { mainProductId, listId }[]`, uma lista de marcas, com `companionsOf` e `companionPhrase`.
- Prova em navegador (390×844, 130 %/200 %) da Obrigação: não feita. Pelo procedimento, a validação em navegador é da Validation/QA (`wi-qa-validation`).
- Suíte do store vermelha só no arquivo da tarefa 07 (`ProductPageBuyTogetherForma.test.tsx`), em progresso na mesma árvore. Não toquei.
- Citações: as linhas citadas de `cartStore.ts`, `useProductPurchase.tsx`, `ProductBuyBar.tsx` e `ProductInfo.tsx` deslocaram com as mudanças desta tarefa e da 03. Relocalizei pelos alvos (`itemKey`, `addItem`, `migrate`, `aoTocar` substituído por `buy.tap`, o evento em `add`). Nenhuma citação morta.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz; inteiro); apps/store/CLAUDE.md › A home não salta, › Página do produto (O bloco Compre Junto, O botão único), › Material afetivo, › A gaveta de material, › Carrinho, chrome e checkout (A sacola v4); packages/core/CLAUDE.md › Quando um código pertence, › Pureza, › Os módulos; .specs/project/PROJECT.md › Comandos de verificação
Testes escritos:
  - página real: botão e conjunto pela coluna e pela barra, gaveta abre, quantidade só no principal, soma à linha existente, gravações, recusas (escolha faltando, gravação do adicional, gravação do principal, combinação indisponível) → apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx
  - carrinho: migrate v3→v4, addItems, marcas acumuladas, companionsOf → apps/store/src/entities/cart/model/__tests__/cartStore.test.ts; frase da linha, remover o principal tira a frase, remover um adicional não remove as outras → apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx
  - GA4: add_to_cart com vários itens, o principal uma vez, item_list_id → packages/core/src/analytics/__tests__/events.test.ts e items.test.ts; o toque não emite view_item_list nem select_item → ProductPageLevarConjunto.test.tsx
  - barra fixa: total e "Conjunto · N peças" / preço e Pix → apps/store/src/widgets/product-buy-bar/ui/__tests__/ProductBuyBar.test.tsx e ProductPageLevarConjunto.test.tsx
  - sem cobertura: a prova em navegador (390, 130 %/200 %, rolagem horizontal, a barra do sistema); é da Validation/QA
Verificações: testes da fatia, 145/145 verdes; tsc store 0 e core 11 herdados (sem erro novo); core 5291/5291 verdes; store 6772 verdes e 2 reprovados, só em ProductPageBuyTogetherForma.test.tsx (tarefa 07 em paralelo); lint do store 2/2 (baseline); mutação 5/5 vermelhos
Árvore de trabalho: cartStore (v4, marca, addItems, companionsOf), useProductPurchase.add(taken), useBuyAction (novo), useBuyTogether (listId), ProductInfo, ProductBuyBar, ProductPage, CartDrawerRow e drawerFacts (frase), core/analytics events e items, os testes listados, apps/store/CLAUDE.md, tasks/05 (propagação); nada commitado
Citações conferidas: 8 abertas; deslocaram as linhas de cartStore.ts, useProductPurchase.tsx, ProductBuyBar.tsx e ProductInfo.tsx, relocalizadas pelos alvos; nenhuma morta
Propagado: tarefa 05 · a linha do Contrato "marca no carrinho (principal, lista)" passa a nomear a forma real, `CartItem.accompanies?: { mainProductId, listId }[]` (uma lista; listId null na peça avulsa), com companionsOf e companionPhrase
```

## T07 — wi-impl-task · review · agente acfa390a5cd53b300

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/07-forma-do-bloco.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Os valores gravados são `inline` / `sheet` / `formula`, em `store_settings` na chave `buy_together` e no formato `{ form }`. Os nomes que a dona lê ("Na linha", "Em folha", "Com fórmula") ficam em `BUY_TOGETHER_FORM_LABELS`, em `core/buy-together/settings.ts` | Gravar o rótulo em português | Um rótulo se troca sem migrar dado; o identificador gravado não | O formato da linha `buy_together`, que a tarefa 06 documenta |
| 2 | Nenhuma migration semeia `buy_together`: sem a linha, vale "Na linha". O guarda `storeSettingsDefaults` confere que `DEFAULT_BUY_TOGETHER.form` é igual a `DEFAULT_BUY_TOGETHER_FORM` e que nenhuma migration grava a chave | Semear a chave por migration com `value \|\|` | Semear fixaria uma escolha que a dona nunca fez; a tarefa diz "sem migration" | O guarda `storeSettingsDefaults.test.ts` |
| 3 | A leitura é `useBuyTogetherForm`, em `packages/core/src/hooks`, por cima do `useStoreSettings`. A loja e o painel leem o mesmo hook | Um hook só da loja, em `apps/store`, que o contrato sugeria ("hook à parte") | O painel também precisa ler a forma gravada; dois hooks dariam dois donos da leitura (o "defeito 01") | O painel e a loja |
| 4 | O cartão da escolha fica no índice `/admin/compre-junto`, acima das listas, pela prop opcional `aside` do `BuyTogetherListsIndex` | Uma rota ou aba nova | A tarefa deixou o lugar em aberto; esta é a menor superfície | A tarefa 06, se ela reorganizar o índice em abas, leva o `aside` junto |
| 5 | Na forma "Em folha", sair da folha (Esc, fundo ou Fechar) com a escolha incompleta tira a marca do adicional; sair com a escolha completa mantém a marca. "Incluir no conjunto" só fecha a folha | Deixar marcado um adicional incompleto fora da folha | Seria uma armadilha que o botão de compra recusaria depois. A regra de compra segue a mesma: incompleto nunca vai à sacola | Só `AddonSheet.tsx` |
| 6 | Celular ou computador é decidido pelo `useCompactViewport` que já existe (abaixo de 768 px): `Sheet` de baixo no celular, `Dialog` acima disso. O foco inicial e o de volta são feitos à mão (`onOpenAutoFocus` / `onCloseAutoFocus`) | Usar o `Trigger` do Radix | A folha é comandada pelo estado do conjunto, sem `Trigger`, e sem ele o Radix não devolve o foco sozinho | Só `AddonSheet.tsx` |
| 7 | A faixa "Com fórmula" é `aria-hidden`. Os nomes nela são clicáveis (alternam o adicional) mas ficam fora do teclado (`tabIndex={-1}`); quem usa teclado ou leitor de tela tem a lista | Uma faixa sem clique | O desenho pede "cada adicional alternável nela", e o CA-09.5 a quer fora do leitor de tela | Só `FormulaStrip.tsx` |
| 8 | O caso "variação faltando" na forma "Em folha" é provado assim: sair da folha incompleta tira a marca, e o botão leva só a joia | Exigir na folha a mesma frase de falta da linha | Na folha não existe adicional marcado e incompleto fora dela. A regra que vale nas três formas é que o adicional incompleto nunca vai à sacola | Só o teste `ProductPageBuyTogetherForma.test.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Valor desconhecido ou ausente vira "Na linha" | unidade | `packages/core/src/buy-together/__tests__/settings.test.ts` | sim | vermelho (dois mutantes de `normalizeBuyTogetherForm`) |
| 2 | O default do TypeScript bate com o banco (nenhuma migration grava a chave) | guarda | `apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts` | sim | retomada |
| 3 | A dona escolhe uma das três formas, grava e relê; valor inválido abre como "Na linha"; a falha ao gravar avisa | página real do painel | `apps/backoffice/src/pages/admin/AdminBuyTogetherForm.test.tsx` | sim | vermelho (chave do `value` trocada no cartão) |
| 4 | Cada forma desenha as escolhas; "Em folha" com foco no título, Esc e foco de volta; "Com fórmula" com a faixa fora do leitor de tela | página real do produto | `apps/store/src/pages/__tests__/ProductPageBuyTogetherForma.test.tsx` | sim | vermelho (`aria-hidden`, foco no título, foco de volta e `form` ignorado; quatro mutantes, todos mortos) |
| 5 | As regras de compra iguais nas três formas: total e PIX, variação faltando e o que vai à sacola | página real do produto | o mesmo arquivo, `describe.each` das três formas (+6 casos nesta corrida) | sim | — (a regra é de `useBuyTogether` e `useBuyAction`; a forma não entra nela) |
| 6 | 390 e 1440 sem rolagem horizontal e com alvos de 44 px | prova em navegador | — | não executada | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

## Arquivos alterados

packages/core/src/buy-together/settings.ts criado
packages/core/src/buy-together/__tests__/settings.test.ts criado
packages/core/src/buy-together/index.ts alterado
packages/core/src/hooks/useBuyTogetherForm.ts criado
packages/core/src/hooks/useStoreSettings.ts alterado
packages/supabase/src/types/settings.ts alterado
apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts alterado
apps/store/src/entities/product/ui/buy-together/AddonSheet.tsx criado
apps/store/src/entities/product/ui/buy-together/FormulaStrip.tsx criado
apps/store/src/entities/product/ui/buy-together/AddonPanel.tsx criado
apps/store/src/entities/product/ui/buy-together/panel.ts criado
apps/store/src/entities/product/ui/buy-together/AddonRow.tsx alterado
apps/store/src/entities/product/ui/buy-together/BuyTogetherBlock.tsx alterado
apps/store/src/pages/__tests__/ProductPageBuyTogetherForma.test.tsx criado
apps/store/src/entities/product/ui/__tests__/semMaterialNaPaginaDoProduto.test.ts alterado
apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherFormCard.tsx criado
apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherListsIndex.tsx alterado
apps/backoffice/src/features/buy-together-lists/index.ts alterado
apps/backoffice/src/pages/admin/AdminBuyTogetherPage.tsx alterado
apps/backoffice/src/pages/admin/AdminBuyTogetherForm.test.tsx criado
apps/backoffice/CLAUDE.md alterado

Sobre a pasta `buy-together/`: ela inteira está sem commit na árvore (o commit da tarefa 03 só levou `useBuyTogether.ts` e `ProductPage.tsx`). Por isso `AddonPanel.tsx` e `panel.ts` podem ter nascido da 03 e sido extraídos pela corrida anterior desta tarefa; não dá para separar pelo git.

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run <5 arquivos do bloco> --testTimeout=20000` (de `PROJECT.md` › Comandos de verificação): exit 0, 112/112.
- Arquivo da forma na loja, depois dos casos novos: exit 0, 24/24.
- Check de mutação: 7 mutantes em `FormulaStrip`, `AddonSheet` (2), `AddonRow`, `core settings.ts` (2) e `BuyTogetherFormCard`. Todos sintaticamente válidos, todos mortos por asserção, cada arquivo restaurado da cópia e conferido com `cmp`.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (`CLAUDE.md` › Comandos): 0 erros.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`: 0 erros.
- `npx tsc --noEmit -p packages/core/tsconfig.json`: 11 erros, os mesmos herdados que a linha Tipos da baseline registra (`carousel`, `pickHome*`, `sitemap/urls`, `supabase/client`). Nenhum erro novo, nenhum em arquivo tocado. A tarefa não recebeu `baseline`; comparei contra a da tabela do `CLAUDE.md`.
- `pnpm --filter @estrelinha/core test --testTimeout=20000` (`CLAUDE.md` › Baselines): exit 0, 5291/212.
- `pnpm --filter @estrelinha/store test --testTimeout=20000`: exit 0, 6774/361.
- `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`: exit 1, 5023 de 5024. O único caso que falha é `originZipNotRead.test.ts`, que acusa `apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx:18`. Esse arquivo é da tarefa 04 (pasta `cart-drawer`, dentro da cerca); não é desta tarefa e não mexi nele. `AdminBuyTogetherForm.test.tsx` passa (5/5).
- `npx eslint` nos arquivos do bloco e do cartão: limpo.

Instruções lidas: `CLAUDE.md` da raiz (as seções citadas estavam no contexto; diferença contra a cópia do repositório principal conferida por `diff`, só em CI e infra); `apps/store/CLAUDE.md` › Design system, › Mobile, › A home não salta, › Página do produto (com O bloco Compre Junto e O botão único), › Material afetivo, › A gaveta de material, › Carrinho, chrome e checkout (com A sacola v4); `apps/backoffice/CLAUDE.md` › O editor de Produtos em destaque, › A busca de produto, › Gravar não desmonta a tela, › O movimento do painel, › `/admin/perguntas`, › O fornecedor da peça, › Compre Junto (Listas e a aba do produto); `packages/core/CLAUDE.md` › Quando um código pertence, › Pureza, › Os módulos; `.specs/project/PROJECT.md` › Comandos de verificação.

## Divergências e descobertas

- Retomada: a corrida anterior deixou na árvore o setting em `core`, o hook, o guarda de defaults, as formas "Em folha" e "Com fórmula", o cartão do painel com o teste dele e a nota no `apps/backoffice/CLAUDE.md`. Rodei os testes dessas fatias: verdes. Faltava cobrir, no bloco `Testes`, "o que vai à sacola igual nas três formas". Acrescentei dois casos por forma, usando o `cartStore` real só pela leitura (não editei o arquivo).
- A fatia 5 é um teste de página (jsdom, sem infraestrutura) que passou de primeira. A regra que ela cobre mora em `useBuyTogether` e `useBuyAction`, que são das tarefas 03 e 04. Os mutantes que rodei foram na forma, não nessa regra.
- `semMaterialNaPaginaDoProduto`: a varredura já alcançava a pasta inteira; acrescentei as âncoras de `AddonPanel`, `AddonSheet` e `FormulaStrip`. `tomDoCompreJunto` varre a pasta inteira por construção.
- A prova em navegador em 390 e 1440 não foi executada: validação em navegador é da etapa de Validation/QA, pela regra deste agente. Fica para essa etapa, mesmo constando no `Pronto quando`.
- Da tarefa 04 (na árvore, fora da minha cerca): `CartDrawerAcompanha.test.tsx` cita `origin_zip` numa fixture, e o guarda `originZipNotRead` do painel reprova por isso.
- A linha `./buy-together` do `packages/core/CLAUDE.md` (escrita pela 03) não cita `settings.ts` nem o hook `useBuyTogetherForm`. Não editei; a nota está no `apps/backoffice/CLAUDE.md`.
- Nenhuma afirmação de tarefa seguinte ficou falsa: a 06 só espera "a nota da forma do bloco".

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 07
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, as seções citadas); apps/store/CLAUDE.md › Design system, Mobile, A home não salta, Página do produto, Material afetivo, Gaveta de material, Carrinho, chrome e checkout; apps/backoffice/CLAUDE.md › Produtos em destaque, A busca de produto, Gravar não desmonta, O movimento do painel, /admin/perguntas, O fornecedor da peça, Compre Junto; packages/core/CLAUDE.md › Quando um código pertence, Pureza, Os módulos; .specs/project/PROJECT.md › Comandos de verificação
Testes escritos: settings.ts → packages/core/src/buy-together/__tests__/settings.test.ts; default igual ao banco → apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts; painel grava e relê → apps/backoffice/src/pages/admin/AdminBuyTogetherForm.test.tsx; as três formas, foco da folha, Esc, faixa aria-hidden e regras de compra iguais (total/PIX, variação faltando, o que vai à sacola) → apps/store/src/pages/__tests__/ProductPageBuyTogetherForma.test.tsx. Sem cobertura: rolagem horizontal e alvos de 44 px em 390/1440 — só um navegador mede; fica para a Validation/QA
Verificações: tsc store 0, backoffice 0, core 11 herdados (iguais à baseline); core 5291/212 verde; store 6774/361 verde; backoffice 5023/5024 — o único reprovado (originZipNotRead) acusa CartDrawerAcompanha.test.tsx, da tarefa 04; 7 mutantes, 7 mortos por asserção; eslint limpo
Árvore de trabalho: core settings.ts (+ teste, barril), core hooks/useBuyTogetherForm.ts, useStoreSettings.ts (DEFAULTS), supabase types settings.ts (buy_together), storeSettingsDefaults.test.ts, loja buy-together/{AddonSheet, FormulaStrip, AddonPanel, panel, AddonRow, BuyTogetherBlock}, ProductPageBuyTogetherForma.test.tsx, semMaterialNaPaginaDoProduto.test.ts (âncoras), painel BuyTogetherFormCard.tsx, BuyTogetherListsIndex.tsx (aside), barril, AdminBuyTogetherPage.tsx, AdminBuyTogetherForm.test.tsx, apps/backoffice/CLAUDE.md. Nota para a 06 levar ao apps/store/CLAUDE.md: "O bloco tem três formas, escolhidas pela dona no índice /admin/compre-junto (store_settings.buy_together = { form: 'inline' | 'sheet' | 'formula' }, sem linha = 'inline', normalizado por normalizeBuyTogetherForm e lido por useBuyTogetherForm): 'Na linha' abre o painel na linha; 'Em folha' abre o mesmo painel num Sheet de baixo abaixo de 768 px e num Dialog acima, foco no título, Esc/fundo/Fechar saem, o foco volta ao controle da linha, sair incompleto tira a marca, 'Incluir no conjunto' desabilitado enquanto falta escolha; 'Com fórmula' é 'Na linha' com a faixa aria-hidden 'Esta joia + …' (chips clicáveis, tabIndex -1). A forma não muda total, PIX nem o que vai à sacola."
Citações conferidas: 6 abertas (freeShippingState/storeSettingsDefaults, dialog/sheet do packages/ui com dialogGridTrack, features/settings com SettingsSaveButton/FormCard, a página do menu da 01, a pasta do bloco da 03); nenhuma deslocada nem morta
```

## T04 — wi-impl-review · fixing · agente a553c6b5cf4d9be45

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/04-levar-o-conjunto.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | --- | --- | --- | --- | --- |
| 1 | teste que não morde | atrapalha | apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx:288 e :304 | Os dois casos do principal só conferem que "nada entra" e que o botão fica bloqueado. O de :288 (gravação do principal acima do limite) não confere que a recusa aparece junto do campo. O de :304 (combinação indisponível) não confere o aviso da página ("Essa combinação está indisponível no momento."). Se o aviso ou a recusa sumissem da tela, os dois casos continuariam verdes. Os casos do adicional (recusa junto do campo, foco, aviso) mordem. | Testes: "Gravação do principal ou de um adicional recusada: nada entra e a recusa aparece junto do campo; principal indisponível bloqueia o botão com o aviso da página (nível: página real)" |
| 2 | identificador de processo | atrapalha | apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx:177 | Comentário de teste com número de tarefa: "view_item_list e select_item são do bloco (tarefa 03)." | regra do workflow: identificador de processo não entra no código |
| 3 | convenção violada | atrapalha | apps/store/src/pages/ProductPage.tsx:19; apps/store/src/widgets/product-buy-bar/ui/ProductBuyBar.tsx:9 | Os imports novos vão por caminho profundo. `useBuyAction` é importado de `@/entities/product/model/useBuyAction`, mas o mesmo diff o exporta pelo barrel (`entities/product/index.ts`). O tipo `BuyTogether` vem de `@/entities/product/model/useBuyTogether`. A ProductBuyBar já importa `useBuyAction` pelo barrel na linha 8, ao lado. | CLAUDE.md raiz › Feature-Sliced Design: "Cada slice tem um barrel `index.ts` (public API). **Novo código deve importar do slice** (`@/entities/product`) e não de caminhos profundos." |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| Sem adicional marcado, o botão diz "Adicionar à sacola" e leva só o principal; com marcação diz "Levar o conjunto" e leva todos, cada um como linha com a sua variação e gravação, quantidade 1 | `useBuyAction.ts` (label, tap); `useProductPurchase.tsx` add(taken) com `quantity: 1` nos adicionais; `cartStore.addItems`; `ProductInfo.tsx` e `ProductBuyBar.tsx` usam `buy.label` | sim |
| Tocar a barra fixa e o CTA do computador levam o mesmo | `ProductPage.tsx` monta um só `useBuyAction` e o passa às duas superfícies pela prop `action` | sim |
| Gravação recusada de qualquer peça: nada entra e a recusa aparece junto do campo; principal indisponível bloqueia o botão com o aviso da página | adicional: `useBuyAction.tap` barra quando `incompleteCount > 0` (o adicional com recusa não fica `ready`) e foca `engraving-<id>`; principal: a recusa e o `canAdd` de `useProductPurchase.add`; botão `disabled={!canAdd}` | sim (com a lacuna de teste do achado 1) |
| Sacola v3 abre intacta depois do `migrate`; peça já na sacola soma e passa a dizer "acompanha o X e o Y"; remover o principal tira a frase; remover um adicional não remove os outros | `cartStore.ts` com `version: 4` e `migrate` que deixa a v3 passar sem conversão; `addItems` acumula as marcas; `companionsOf` + `companionPhrase` calculados na renderização em `CartDrawerRow.tsx` | sim |
| `add_to_cart` com todos os itens e o principal uma vez, sem duplicar | `useProductPurchase.tsx`: um evento `{ items }`; `events.ts` aceita `item` ou `items` | sim |
| Cada comportamento do bloco `Testes` coberto por um teste escrito | ver seção Testes; a prova em navegador não tem artefato no diff | parcial (achado 1; navegador em Não conferido) |
| Testes dos arquivos alterados passando | — | só execução |
| Verificação mínima (tipos e suíte do workspace) | — | só execução |

## Obrigações

- A marca fica fora do `itemKey` e não decide preço: `itemKey` não mudou, `addItems` compara por `keyOf` e a marca não entra no preço. O nome do principal vem do carrinho, calculado na renderização (`companionsOf`). Aplicada.
- `estrelinha-cart` mantém a chave e só a `version` sobe, com `migrate` que preserva: `cartStore.ts` (name intocado, `version: 4`); o teste confere a versão e o nome. Aplicada.
- GA4: só o `add_to_cart`, num evento, com o principal uma vez: `useProductPurchase.tsx`. O teste de página confirma que o toque não emite `view_item_list` nem `select_item`. Aplicada. `denoReach`/`events`/`items` verdes: só execução.
- `ProductBuyBar.test`, `…Material.test` e `…Reveal.test` não podem quebrar: os casos antigos não foram tocados no diff. O resultado é só execução. Só a barra e a coluna mostram o rótulo do botão: aplicada.
- Zero linha em `packages/core/src/payment/**` e no feed: nenhum desses arquivos está em `alterados`. Aplicada.
- Prova em navegador a 390×844, 130 % e 200 %: não há artefato no recorte. Ver Não conferido.
- Documentar em `apps/store/CLAUDE.md` › Carrinho (v4, marca) e › Página do produto (botão único): seções "O botão único leva o conjunto (WI-01)" e "A sacola v4 e a marca 'acompanha' (WI-01)". Aplicada.

## Testes

- Página real (sem marcação leva só o principal; com marcação leva tudo, linhas próprias, variação, gravação, quantidade 1; barra e CTA levam o mesmo): `ProductPageLevarConjunto.test.tsx`, com `describe.each` sobre a coluna e a barra. Morde: confere item a item `variantLabel`, `unitPrice`, `accompanies` e as gravações "Ana"/"Léo".
- Gravação recusada / principal indisponível: mesmo arquivo. O lado do adicional morde (texto da recusa junto do campo, foco, aviso, sacola vazia). O lado do principal morde só no "nada entra" (achado 1).
- Carrinho (migrate v3→v4, soma com marca, "o X e o Y", remover o principal, remover um adicional): `cartStore.test.ts` e `CartDrawerAcompanha.test.tsx`. Morde: as marcas acumulam sem repetir, `companionsOf` deixa de nomear o principal removido, e a frase é conferida pelo texto renderizado na linha certa.
- GA4: `events.test.ts` (igualdade exata com `item_list_id` só no adicional), `items.test.ts` (allowlist ampliada com igualdade, e chave ausente quando não há valor) e a página real (um evento, `value` 125/335, principal com `quantity` 3). Morde.
- Barra fixa (total e "Conjunto · N peças" com marcação; preço e "no Pix" sem): `ProductBuyBar.test.tsx`, novo describe, também repetido na página real. Morde.
- Prova em navegador: sem arquivo no recorte. Não conferido.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | A marca é uma lista `accompanies?: { mainProductId, listId }[]`, sem repetir a mesma | sim | CA-04.1 pede "acompanha o X e o Y" numa linha que soma; D-marca-acompanha pede principal e lista | sim. A 05, linha 34, já descreve a lista e deixa à 05 decidir as colunas (linha 35). O snapshot do carrinho abandonado (`useAbandonedCartTracker`) mapeia campo a campo e só deixa a marca de fora, sem quebrar nada |
| 2 | Um `useBuyAction` montado pela página e passado pela prop opcional `action`; sem a prop, cada superfície monta o seu | sim | D-estado-de-compra ("o botão único faz a barra fixa conhecer o conjunto"); a prop opcional mantém os testes antigos | sim. A 07 proíbe tocar `ProductInfo`/`ProductBuyBar` e consome só o estado do bloco |
| 3 | `addToCartEvent` aceita `{ item }` ou `{ items }`; `list_id`/`list_name` viram `item_list_id`/`item_list_name` no item | sim | D-ga4 ("aceita lista de itens (ou função irmã)"); a allowlist EVT-14 continua por igualdade e as chaves novas não são dado pessoal | sim. `ANALYTICS_ITEM_KEYS` só é lido pelo próprio teste; o lado Deno só ganha campos opcionais |
| 4 | A recusa de gravação de um adicional e a escolha que falta são barradas em `useBuyAction`, antes de `purchase.add` | sim | O Contrato pede que a recusa de qualquer peça aborte tudo. Isso vale, porque `add` só é chamado com todos os marcados `ready`, e a recusa do adicional deixa a linha não-`ready` (`useBuyTogether.ts:267`). O foco é obrigação do botão (Contrato, linha da `ProductBuyBar`) | sim |
| 5 | `useBuyTogether.ts` passa a expor `listId` no adicional e em `TakenAddon`, sem tocar a pasta do bloco | sim | O Contrato proíbe alterar "a pasta do bloco" (`ui/buy-together/`), e o hook está em `model/`. A mudança só acrescenta campos e não muda o comportamento; `addon.listId` já existia na entrada | sim. A 07 consome o hook, e o campo é só aditivo |

## Não conferido

- Prova em navegador (390×844, 130 % e 200 % de fonte, rolagem horizontal, a barra fixa diante da barra do sistema): obrigação e linha de `Testes` sem artefato nos `alterados`. Fica sem prova nesta revisão.
- `ProductInfo.tsx` e `apps/store/CLAUDE.md` trazem também trabalho da tarefa 03 que não está commitado: o commit `c845659a` (T03) só levou `useBuyTogether.ts` e `ProductPage.tsx`. A prop `buyTogether`, o `BuyTogetherBlock` na `ProductInfo` e a seção "O bloco Compre Junto (WI-01)" do CLAUDE.md não são explicados por esta tarefa. Não foram julgados.
- `.specs/work-items/WI-01-compre-junto/` inteiro está `??` (sem intent-to-add). O arquivo da tarefa 05 foi lido inteiro e confere com o raio declarado, mas sem baseline não dá para provar o que a propagação mudou nele nem que mais nada foi mexido. Isso depende da palavra do implementador.
- Testes, tipos e lint passando: não rodei (só execução).
Instruções lidas: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/CLAUDE.md › O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy, › Feature-Sliced Design (pelo conteúdo carregado no contexto da sessão, igual ao da raiz); apps/store/CLAUDE.md › Página do produto (inclusive as subseções novas), › Carrinho, chrome e checkout (inclusive "A sacola v4…"). Não li packages/core/CLAUDE.md › Quando um código pertence ao pacote / Pureza / Os módulos por inteiro; a pureza de `core/analytics` foi conferida pelo diff (nenhum import novo).

## T07 — wi-impl-review · fixing · agente a707ac1ab0fad9a82

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/07-forma-do-bloco.md
Veredito: serve com correção

## Achados

| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
|---|---|---|---|---|---|
| 1 | premissa derrubada (premissa 5) | quebra | apps/store/src/entities/product/ui/buy-together/AddonSheet.tsx:35, :57-58 (com `useBuyTogether.ts:267`, `ready: choice.marked && …`) | Na forma "Em folha", o botão fica `disabled={!addon.ready}`, e `ready` só é verdadeiro com o adicional marcado. Pelo caminho "Ver opções" / "Ver os N modelos", a folha abre sem marcar (AddonRow:79-88, `toggleOpen`). Ali a cliente escolhe tudo e mesmo assim "Incluir no conjunto" continua desabilitado para sempre. Com a escolha completa, `missing` e a recusa ficam nulos, então nenhuma frase aparece para explicar o bloqueio. E, mesmo que o botão habilitasse, o clique só faz `toggleOpen`, sem incluir nada. Fica um beco sem saída: o botão diz "Incluir" e não inclui. A premissa 5 ("Incluir no conjunto só fecha a folha") é a origem do defeito. O teste "Ver opções abre a folha sem marcar" para no Esc e não cobre esse caminho. | Design, formas do bloco: "rodapé com a frase do que falta e 'Incluir no conjunto' (desabilitado enquanto faltar escolha)". CA-09.3: "as regras de UC-03 e UC-04 valem iguais nas três" (em "Na linha", escolher pelo "Ver opções" e depois marcar funciona). |
| 2 | obrigação furada | atrapalha | apps/store/src/entities/product/ui/buy-together/AddonSheet.tsx:113 | O diálogo do computador (≥ 768 px, faixa que inclui tablet de toque) não usa `hideClose` e herda o fechar padrão do `DialogContent` de `packages/ui`: ícone `h-4 w-4` sem área de 44 px, `transition-opacity` sem par `motion-reduce:` e rótulo "Close" em inglês. A folha do celular, ao contrário, troca esse fechar por um `SheetClose` próprio de 44 px com o rótulo "Fechar". | Obrigações: "Par `motion-reduce:`, alvos de 44 px, sem rolagem horizontal". |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a dona escolhe a forma, grava e relê; sem escolha a loja usa "Na linha"; valor desconhecido cai em "Na linha" sem quebrar | `core/buy-together/settings.ts` (`normalizeBuyTogetherForm`, `DEFAULT_BUY_TOGETHER_FORM`); `core/hooks/useBuyTogetherForm.ts`; `BuyTogetherFormCard.tsx` + `AdminBuyTogetherPage.tsx` (aside); `AdminBuyTogetherForm.test.tsx` | sim |
| "Em folha": foco no título, Esc fecha, foco volta; "Com fórmula": faixa fora do leitor de tela; as regras de compra iguais nas três (teste pela página real) | `AddonSheet.tsx` (`onOpenAutoFocus`/`onCloseAutoFocus`), `FormulaStrip.tsx` (`aria-hidden`), `ProductPageBuyTogetherForma.test.tsx` | em parte: foco, Esc e faixa batem; a regra de incluir na forma "Em folha" diverge pelo caminho "Ver opções" (achado 1) |
| prova em navegador das três formas em 390 e 1440 | não executada (linha `sem mutação`) | só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `settings.test.ts`, `storeSettingsDefaults.test.ts`, `AdminBuyTogetherForm.test.tsx`, `ProductPageBuyTogetherForma.test.tsx` | sim (exceto a prova em navegador) |
| testes dos arquivos alterados, passando | — | só execução |
| verificação mínima (tipos e suíte de cada workspace; suíte da loja com o painel mudado) | — | só execução |

## Obrigações

- **Só apresentação (CA-09.3):** total, PIX e o que vai à sacola não dependem da forma (`BuyTogetherBlock` só escolhe a faixa e passa `form` adiante). Cumprida, com a exceção do caminho "Ver opções" na forma "Em folha" (achado 1).
- **Padrão aditivo e idempotente, default do TS igual ao do banco:** sem migration. `DEFAULT_BUY_TOGETHER` em `packages/supabase/src/types/settings.ts`. O guarda em `storeSettingsDefaults.test.ts` confere que o default é igual à forma padrão de `core` e que nenhuma migration grava a chave. Cumprida.
- **"Em folha" com foco no título, Esc fecha e foco volta, usando `Dialog`/`Sheet` de `packages/ui`; "Com fórmula" `aria-hidden` e sem informação nova:** cumprida em `AddonSheet.tsx` e `FormulaStrip.tsx`.
- **Par `motion-reduce:`, 44 px, sem rolagem horizontal, prova em navegador:** o par está em `SheetContent`/`DialogContent` e a faixa usa `min-h-11`. O fechar do diálogo do computador fica fora (achado 2). A prova em navegador não foi executada.
- **`semMaterialNaPaginaDoProduto` inclui os arquivos novos:** cumprida. Há asserção para `AddonPanel`, `AddonSheet` e `FormulaStrip`, que já estão no escopo `entities/product/ui`.
- **Não editar `apps/store/CLAUDE.md`; documentar o cartão em `apps/backoffice/CLAUDE.md`:** cumprida. A nota foi acrescentada ao `apps/backoffice/CLAUDE.md`, e `apps/store/CLAUDE.md` não está nos alterados.

## Testes

- **`settings.ts`: valor desconhecido ou ausente vira "Na linha" (unidade):** `packages/core/src/buy-together/__tests__/settings.test.ts`. Morde: são nove valores inválidos, entre eles `'Sheet'` e `['sheet']`.
- **Default do TS igual ao que o banco grava (guarda):** `storeSettingsDefaults.test.ts`, describe "a forma do bloco Compre Junto". Morde, com âncora de mais de 50 migrations e comentário removido.
- **Painel: escolher, gravar e reler (página real):** `AdminBuyTogetherForm.test.tsx`. Morde: confere o upsert exato, e o `disabled` depois da releitura só passa se a chave foi invalidada. Também cobre o valor desconhecido com o hook real e a falha ao gravar.
- **Loja: cada forma, foco, Esc, faixa e regras iguais nas três (página real):** `ProductPageBuyTogetherForma.test.tsx`. Morde nos casos de foco (`toHaveFocus`), Esc, faixa `aria-hidden` e no `describe.each` das três formas (total 135/128,25, sacola). Ressalva: o caso "valor desconhecido" da página normaliza dentro do próprio teste, com o hook dublado. É redundante, mas a fiação do hook com a normalização está provada no teste do painel. Lacuna: nenhum caso escolhe na folha aberta por "Ver opções" e tenta incluir (achado 1).
- **390 e 1440 sem rolagem horizontal e com 44 px (prova em navegador):** não executada.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Valores `inline`/`sheet`/`formula` em `store_settings.buy_together` `{ form }`, rótulos em `BUY_TOGETHER_FORM_LABELS` | sim | Decisão #21 da tarefa; molde das outras chaves de `SettingsMap` | sim (a tarefa 06 documenta a nota) |
| 2 | Sem migration; o guarda confere o default e a ausência de semeadura | sim | "sem migration" no Contrato e na Decisão #21; `fetchAllSettings` mescla `DEFAULTS` | sim |
| 3 | `useBuyTogetherForm` em `core/hooks`, lido pela loja e pelo painel | sim | Regra 1 do "defeito 01" na raiz (dois consumidores ⇒ `core`). O hook continua "à parte" do `useStoreSettings` | sim |
| 4 | Cartão no índice `/admin/compre-junto` pela prop `aside` | sim | A tarefa deixou o lugar aberto. A tarefa 06 cria a aba Adesão na mesma página, e o raio a cita | sim |
| 5 | Sair da folha incompleta desmarca; "Incluir no conjunto" só fecha | não | Desenho do rodapé ("desabilitado enquanto faltar escolha") e CA-09.3. Pelo "Ver opções" o botão fica morto e não inclui (achado 1) | o raio "Só `AddonSheet.tsx`" confere, mas a causa também passa por `ready` em `useBuyTogether` |
| 6 | `useCompactViewport` decide `Sheet` × `Dialog`; foco feito à mão | sim | `apps/store/CLAUDE.md` (gaveta de material: sem `Trigger` o Radix não devolve o foco) | sim |
| 7 | Faixa `aria-hidden`, botões clicáveis com `tabIndex={-1}` | sim | CA-09.5 e desenho ("cada adicional alternável nela") | sim |
| 8 | "Variação faltando" em folha provada pela saída que desmarca | sim, enquanto a regra da premissa 5 for mantida | Teste `describe.each`, último caso | sim |

## Não conferido

- `AddonRow.tsx`, `AddonPanel.tsx`, `BuyTogetherBlock.tsx` e `panel.ts` aparecem como `A` (intent-to-add) e trazem o arquivo inteiro. O commit da T03 (`c845659a`) gravou só `useBuyTogether.ts` e `ProductPage.tsx`, então o resto do bloco da tarefa 03 está na mesma adição sem commit. Não há baseline para separar o que é da 07 (a prop `form`, o ramo `sheet`, a faixa) do que é da 03. Julguei só o que a 07 explica, e o resto (por exemplo o "a partir de" no preço do `AddonRow`, que o desenho proíbe) não virou achado. Pelo mesmo motivo, que o implementador não tocou no estado do conjunto nem na lógica de compra dentro desses arquivos depende da palavra dele.
- `semMaterialNaPaginaDoProduto.test.ts`: as entradas de `ESCOPO` para `useBuyTogether.ts`/`useBuyTogetherData.ts` e o comentário com `CA-03.13` são provavelmente da tarefa 03, no mesmo diff. Não foram atribuídos à 07.
- Não conferi se `tomDoCompreJunto.test.ts`, `touchTarget.test.ts` e `animacaoRespeitaMovimento.test.ts` alcançam os arquivos novos (`AddonSheet`, `FormulaStrip`, `BuyTogetherFormCard`), porque só a execução diz.
- A prova em navegador e as suítes e tipos são só execução.
- Instruções lidas: `CLAUDE.md` da raiz (carregado no contexto, por inteiro); `apps/store/CLAUDE.md` › Página do produto, › O bloco Compre Junto (WI-01), › O botão único leva o conjunto (WI-01), › A gaveta de material (trecho do foco devolvido à mão); `apps/backoffice/CLAUDE.md` › a seção Compre Junto alterada pela tarefa. As demais seções citadas de `apps/backoffice/CLAUDE.md` e de `packages/core/CLAUDE.md` (Quando um código pertence, Pureza, Os módulos) não foram lidas por inteiro. A conferência de pureza e alcance de `core/buy-together/settings.ts` (sem imports) e de `core/hooks/useBuyTogetherForm.ts` foi feita pela regra da raiz.

## T04 — wi-impl-task · done · agente a48ae9edfe5ebff05

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/04-levar-o-conjunto.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 6 | O barrel `entities/product/index.ts` passa a exportar só o tipo `BuyTogether` (`export type { BuyTogether } from './model/useBuyTogether'`) | `export * from './model/useBuyTogether'` | A menor superfície que resolve o achado 3. O resto do hook continua fora da API pública | `entities/product/index.ts` e quem importa dele |
| 7 | No teste, o campo de gravação do principal é achado pelo rótulo (`getAllByLabelText('O que gravar')[0]`, que é o primeiro na ordem do DOM) | Importar `ENGRAVING_FIELD_ID` por caminho profundo | Aquele import seria outro caminho profundo, que é o que o achado 3 recusa | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 7 | Gravação do principal recusada: nada entra, a recusa aparece junto do campo (`aria-invalid`, `aria-describedby` com o texto) e o toque leva o foco ao campo. Combinação indisponível: o aviso da página aparece e o botão bloqueia | página real | `apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx` | sim | vermelho: apaguei o aviso da combinação em `ProductInfo` e o `aria-describedby` em `EngravingField`, e em cada caso 1 teste falhou |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

## Arquivos alterados

apps/store/src/entities/cart/model/cartStore.ts alterado
apps/store/src/entities/cart/model/__tests__/cartStore.test.ts alterado
apps/store/src/entities/product/model/useProductPurchase.tsx alterado
apps/store/src/entities/product/model/useBuyAction.ts criado
apps/store/src/entities/product/model/useBuyTogether.ts alterado
apps/store/src/entities/product/index.ts alterado
apps/store/src/entities/product/ui/ProductInfo.tsx alterado
apps/store/src/pages/ProductPage.tsx alterado
apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx criado
apps/store/src/widgets/product-buy-bar/ui/ProductBuyBar.tsx alterado
apps/store/src/widgets/product-buy-bar/ui/__tests__/ProductBuyBar.test.tsx alterado
apps/store/src/widgets/cart-drawer/model/drawerFacts.ts alterado
apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx criado
packages/core/src/analytics/events.ts alterado
packages/core/src/analytics/items.ts alterado
packages/core/src/analytics/__tests__/events.test.ts alterado
packages/core/src/analytics/__tests__/items.test.ts alterado
apps/store/CLAUDE.md alterado
.specs/work-items/WI-01-compre-junto/tasks/05-pedido-com-a-marca-acompanha.md alterado

O que a correção tocou: `ProductPageLevarConjunto.test.tsx`, `entities/product/index.ts`, `pages/ProductPage.tsx` e `widgets/product-buy-bar/ui/ProductBuyBar.tsx`.

## Verificação

- `pnpm exec vitest run` sobre `ProductPageLevarConjunto`, `product-buy-bar` e `ProductPage.test` com `--testTimeout=20000` (comando de um arquivo do `PROJECT.md`): exit 0, 60/60.
- Mutação, com restauração por cópia conferida por `cmp`: 2 mutantes, os 2 deram vermelho.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (`CLAUDE.md` › Comandos): 0 erros, igual ao baseline.
- `npx eslint` nos arquivos tocados (`CLAUDE.md` › Baselines): 0 problemas.
- Suíte do store, `pnpm --filter @estrelinha/store test --testTimeout=20000` (`CLAUDE.md` › Baselines): exit 0, 361 arquivos, 6774 testes. O arquivo da tarefa 07 que reprovava na rodada anterior agora também passa.
- Instruções lidas: as mesmas da implementação, já no contexto.

## Divergências e descobertas

- Achado 3: corrigi só o import desta tarefa em `ProductPage.tsx:19`. A linha 18 (`useBuyTogether` por caminho profundo) veio da tarefa 03 e ficou como está: o hook não está no barrel, e exportá-lo inteiro ampliaria a superfície pública.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz; inteiro); apps/store/CLAUDE.md › A home não salta, › Página do produto (O bloco Compre Junto, O botão único), › Material afetivo, › A gaveta de material, › Carrinho, chrome e checkout (A sacola v4); packages/core/CLAUDE.md › Quando um código pertence, › Pureza, › Os módulos; .specs/project/PROJECT.md › Comandos de verificação
Testes escritos:
  - página real: botão e conjunto pela coluna e pela barra, a gaveta abre, quantidade só no principal, soma à linha existente, gravações, e as recusas: escolha faltando, gravação do adicional, gravação do principal (com a recusa junto do campo e o foco nele) e combinação indisponível (com o aviso da página) → apps/store/src/pages/__tests__/ProductPageLevarConjunto.test.tsx
  - carrinho: migrate v3→v4, addItems, marcas acumuladas, companionsOf → apps/store/src/entities/cart/model/__tests__/cartStore.test.ts; frase da linha, remover o principal tira a frase, remover um adicional não remove as outras → apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx
  - GA4: add_to_cart com vários itens, o principal uma vez, item_list_id → packages/core/src/analytics/__tests__/events.test.ts e items.test.ts; o toque não emite view_item_list nem select_item → ProductPageLevarConjunto.test.tsx
  - barra fixa: total e "Conjunto · N peças" / preço e Pix → apps/store/src/widgets/product-buy-bar/ui/__tests__/ProductBuyBar.test.tsx e ProductPageLevarConjunto.test.tsx
  - sem cobertura: a prova em navegador (390, 130 %/200 %, rolagem horizontal, a barra do sistema), que é da Validation/QA
Verificações: tsc store 0, core 11 herdados (nenhum novo); core 5291/5291; store 6774/6774 depois da correção; lint do store 2/2 (o baseline); mutação 7/7 vermelhos (5 na implementação, 2 na correção)
Árvore de trabalho: cartStore (v4, marca, addItems, companionsOf), useProductPurchase.add(taken), useBuyAction (novo), useBuyTogether (listId), barrel de entities/product (useBuyAction e o tipo BuyTogether), ProductInfo, ProductBuyBar, ProductPage, CartDrawerRow e drawerFacts (a frase), core/analytics events e items, os testes listados, apps/store/CLAUDE.md, tasks/05 (propagação); nada commitado
Citações conferidas: 8 abertas; deslocaram as de cartStore.ts, useProductPurchase.tsx, ProductBuyBar.tsx e ProductInfo.tsx, relocalizadas pelos alvos; nenhuma morta
Propagado: tarefa 05 · a linha do Contrato "marca no carrinho (principal, lista)" passa a nomear a forma real, `CartItem.accompanies?: { mainProductId, listId }[]` (uma lista; listId null na peça avulsa), com companionsOf e companionPhrase
```

## T07 — wi-impl-task · done · agente acfa390a5cd53b300

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/07-forma-do-bloco.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 5 (revista) | Na forma "Em folha", "Incluir no conjunto" fica habilitado quando a escolha está completa: nada falta e a gravação cabe no limite, esteja o adicional marcado ou não. O clique marca o adicional, se ainda não estiver marcado, e fecha a folha. Sair da folha (Esc, fundo ou Fechar) com o adicional marcado e a escolha incompleta continua tirando a marca. Sair sem marcar mantém o que foi escolhido, sem marcar. | O botão preso a `addon.ready` e o clique que só fechava a folha. | Pelo "Ver opções" a folha abre sem marcar, e o botão ficava desabilitado para sempre: era um beco sem saída (achado 1). Agora o botão faz o que diz. A marcação usa o `toggle` do estado da 03, que eu não alterei. | Só `AddonSheet.tsx` |
| 9 | Acrescentei ao `DialogContent` de `packages/ui` a prop opcional `hideClose`, no mesmo molde do `hideClose` do `SheetContent`. O diálogo do computador passa a usar o mesmo fechar da folha do celular: 44 px, rótulo "Fechar", sem transição. | Manter o fechar padrão do `DialogContent` (ícone de 16 px, rótulo "Close", `transition-opacity` sem par `motion-reduce:`). Também descartei sobrescrever esse fechar por classe. | A mudança é aditiva: o padrão é `false` e as outras telas não mudam. A sobrescrita por classe não conserta o rótulo em inglês. | `packages/ui/src/dialog.tsx`, que todos os diálogos dos três apps usam. O comportamento deles não muda; tipos e suítes dos três apps foram medidos. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 7 | Pelo "Ver opções", escolher a variação habilita "Incluir no conjunto", que marca o adicional, fecha a folha, devolve o foco ao link e soma o total (100 + 35) | página real do produto | `apps/store/src/pages/__tests__/ProductPageBuyTogetherForma.test.tsx` | sim | — (reprova contra o código antigo, tanto com o `disabled={!addon.ready}` quanto com o clique que só fechava) |
| 8 | O diálogo do computador tem um único fechar, chamado "Fechar", com `h-11 w-11` e sem transição | página real do produto | o mesmo arquivo | sim | — (reprova com o `hideClose` retirado) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

## Arquivos alterados

packages/core/src/buy-together/settings.ts criado
packages/core/src/buy-together/__tests__/settings.test.ts criado
packages/core/src/buy-together/index.ts alterado
packages/core/src/hooks/useBuyTogetherForm.ts criado
packages/core/src/hooks/useStoreSettings.ts alterado
packages/supabase/src/types/settings.ts alterado
packages/ui/src/dialog.tsx alterado
apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts alterado
apps/store/src/entities/product/ui/buy-together/AddonSheet.tsx criado
apps/store/src/entities/product/ui/buy-together/FormulaStrip.tsx criado
apps/store/src/entities/product/ui/buy-together/AddonPanel.tsx criado
apps/store/src/entities/product/ui/buy-together/panel.ts criado
apps/store/src/entities/product/ui/buy-together/AddonRow.tsx alterado
apps/store/src/entities/product/ui/buy-together/BuyTogetherBlock.tsx alterado
apps/store/src/pages/__tests__/ProductPageBuyTogetherForma.test.tsx criado
apps/store/src/entities/product/ui/__tests__/semMaterialNaPaginaDoProduto.test.ts alterado
apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherFormCard.tsx criado
apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherListsIndex.tsx alterado
apps/backoffice/src/features/buy-together-lists/index.ts alterado
apps/backoffice/src/pages/admin/AdminBuyTogetherPage.tsx alterado
apps/backoffice/src/pages/admin/AdminBuyTogetherForm.test.tsx criado
apps/backoffice/CLAUDE.md alterado

Nesta correção mudaram `AddonSheet.tsx`, `packages/ui/src/dialog.tsx` e `ProductPageBuyTogetherForma.test.tsx`.

## Verificação

Todos os comandos vêm de `PROJECT.md › Comandos de verificação` e de `CLAUDE.md › Comandos/Baselines`.

- **Arquivo de teste da forma, mais três guardas** (`ProductPageBuyTogetherForma`, `dialogGridTrack`, `touchTarget`, `alvoDeToqueNaoRoubaPosicao`), com `pnpm --filter @estrelinha/store exec vitest run <arquivos> --testTimeout=20000`: exit 0, 57 de 57.
- **Prova de que os testes novos pegam o defeito:** reinjetei os três defeitos dos achados no `AddonSheet.tsx` real (o `disabled={!addon.ready}`, o clique que só fechava e o `hideClose` retirado). Cada um derrubou o caso correspondente. O arquivo foi restaurado da cópia e conferido com `cmp`.
- **Tipos** (`npx tsc --noEmit -p apps/{store,backoffice,mobile-adm}/tsconfig.app.json`): 0 erros nos três. Medi o mobile-adm porque `packages/ui` mudou.
- **Suíte da loja**: exit 0, 6776 testes em 361 arquivos.
- **Suíte do mobile-adm**: exit 0, 2365 testes em 148 arquivos.
- **Suíte do backoffice**: exit 1, 5023 de 5024. Falha só `originZipNotRead`, que acusa `CartDrawerAcompanha.test.tsx` da tarefa 04. É a mesma falha da implementação e não vem desta tarefa.
- **eslint** nos dois arquivos alterados da loja: limpo.

Instruções lidas: as mesmas da implementação, sem releitura.

## Divergências e descobertas

- `packages/ui` passou a ser tocado por esta tarefa: o `DialogContent` ganhou a prop `hideClose`. O contrato da tarefa não listava o pacote, e a mudança é aditiva. O `packages/ui/CLAUDE.md` não foi atualizado com a prop nova.
- Uma suíte foi rodada em segundo plano sem querer: a primeira rodada do backoffice passou do teto de 120 s da ferramenta e foi movida sozinha para o fundo. Esperei a saída dela, num comando em primeiro plano, antes de fechar. O resultado é o registrado acima.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 07
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, as seções citadas); apps/store/CLAUDE.md › Design system, Mobile, A home não salta, Página do produto, Material afetivo, Gaveta de material, Carrinho, chrome e checkout; apps/backoffice/CLAUDE.md › Produtos em destaque, A busca de produto, Gravar não desmonta, O movimento do painel, /admin/perguntas, O fornecedor da peça, Compre Junto; packages/core/CLAUDE.md › Quando um código pertence, Pureza, Os módulos; .specs/project/PROJECT.md › Comandos de verificação
Testes escritos:
- settings.ts → packages/core/src/buy-together/__tests__/settings.test.ts
- default igual ao banco → apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts
- painel grava e relê → apps/backoffice/src/pages/admin/AdminBuyTogetherForm.test.tsx
- loja → apps/store/src/pages/__tests__/ProductPageBuyTogetherForma.test.tsx: as três formas; o foco da folha; o Esc; a faixa aria-hidden; o caminho "Ver opções" → "Incluir no conjunto" marca e fecha; o fechar do diálogo com 44 px e o rótulo "Fechar"; as regras de compra iguais nas três (total e PIX, variação faltando, o que vai à sacola)
- Sem cobertura: rolagem horizontal e alvos de 44 px a 390/1440, que só um navegador mede. Fica para a Validation/QA.
Verificações:
- Tipos: store 0, backoffice 0, mobile-adm 0; core com os 11 erros herdados da baseline.
- Suítes: core 5291/212 verde, store 6776/361 verde, mobile-adm 2365/148 verde.
- Backoffice 5023 de 5024: o único caso reprovado (originZipNotRead) acusa CartDrawerAcompanha.test.tsx, da tarefa 04.
- Mutantes: 7 na implementação e 3 na correção, todos mortos por asserção.
- eslint: limpo.
Árvore de trabalho:
- core: buy-together/settings.ts, o teste e o barril; hooks/useBuyTogetherForm.ts; useStoreSettings.ts
- supabase: types/settings.ts
- packages/ui: dialog.tsx (prop hideClose, aditiva)
- loja: storeSettingsDefaults.test.ts; buy-together/{AddonSheet, FormulaStrip, AddonPanel, panel, AddonRow, BuyTogetherBlock}; ProductPageBuyTogetherForma.test.tsx; semMaterialNaPaginaDoProduto.test.ts
- painel: BuyTogetherFormCard.tsx, BuyTogetherListsIndex.tsx, o barril, AdminBuyTogetherPage.tsx, AdminBuyTogetherForm.test.tsx; apps/backoffice/CLAUDE.md
Nota da forma do bloco para a 06 levar ao apps/store/CLAUDE.md:
  O bloco tem três formas. A dona escolhe no índice /admin/compre-junto; o valor fica em store_settings.buy_together = { form: 'inline' | 'sheet' | 'formula' }. Sem linha gravada vale 'inline'. O valor passa por normalizeBuyTogetherForm e a loja o lê por useBuyTogetherForm.
  - 'Na linha' abre as escolhas na própria linha.
  - 'Em folha' abre o mesmo painel numa folha de baixo abaixo de 768 px e num diálogo acima disso, com o fechar próprio de 44 px ("Fechar"). O foco vai ao título; Esc, fundo e Fechar saem; o foco volta ao controle da linha. Sair da folha com o adicional marcado e incompleto tira a marca. "Incluir no conjunto" fica habilitado com a escolha completa, marca o adicional e fecha.
  - 'Com fórmula' é a 'Na linha' com a faixa aria-hidden "Esta joia + …"; os chips são clicáveis e ficam fora do teclado (tabIndex -1).
  A forma não muda total, PIX nem o que vai à sacola.
Citações conferidas: 6 abertas, nenhuma deslocada nem morta.
```

## T05 — wi-impl-task · review · agente aa7fc13d8555744c1

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/05-pedido-com-a-marca-acompanha.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Cada linha do pedido guarda **um** principal: duas colunas escalares, preenchidas com a primeira marca válida (a primeira cujo principal está no pedido). | Colunas em array, ou `jsonb` com todas as marcas da linha. | O Contrato diz "principal (texto) e lista". O relatório da 06 agrupa por joia principal, e uma linha creditada a dois principais seria contada duas vezes. É a menor superfície. | Tarefa 06 (lê colunas escalares). CA-05.2, item "o X e o Y": por linha do pedido isso não pode mais acontecer. A frase com dois nomes está provada em `core` (`companionPhrase`). Nas telas está provado que cada adicional nomeia o seu próprio principal. |
| 2 | As colunas se chamam `order_items.accompanies_product_id text` e `accompanies_list_id uuid`: nulas, sem default, sem FK. | Outros nomes; uma FK para `buy_together_lists` com `set null` ou `restrict`. | O nome segue o campo `accompanies` do carrinho. A FK bloquearia apagar uma lista já usada, ou apagaria o histórico junto (pedido explícito do Contrato). | Tarefa 06 (a RPC do relatório lê esses dois nomes). |
| 3 | A regra fica em `packages/core/src/buy-together/marks.ts` (`orderItemMark`), um arquivo sem nenhum import. A loja (`buildOrderItems`) e a function (`linhaDoItem`) chamam a mesma função. "Forjada" quer dizer forma inválida: principal que não é texto ou é vazio, marca que aponta para a própria peça, lista que não é uuid. | Ler o banco para conferir se a lista existe ou se o adicional está configurado em `product_buy_together`. | A marca é informativa (CA-05.4). Se o servidor lesse o banco, a venda ficaria dependendo dessa leitura. Uma lista que não é uuid derrubaria o insert, por isso ela é descartada. | Tarefa 06: um uuid forjado mas bem formado de uma lista que não existe pode aparecer no recorte "por lista". Só isso; preço não é afetado. |
| 4 | `companionPhrase` foi para `core/buy-together`; `drawerFacts.ts` agora a reexporta (mesma referência, comprovada com `toBe`). | Escrever uma segunda frase para a confirmação e o painel. | Seriam dois donos da mesma frase (o "defeito 01"). A gaveta continua igual. O Contrato dizia "não altere": a mudança é só de lugar, sem mudança de comportamento. | A gaveta (`CartDrawerRow` continua importando de `drawerFacts`). |
| 5 | `buildOrderItems` manda sempre as duas chaves; ficam `null` na linha comum e no bump. | Mandar as chaves só quando existe marca. | Assim o guarda compara as chaves das três formas de linha por igualdade. | `CheckoutPage.test.tsx`: a expectativa exata do bump ganhou as duas chaves nulas. |
| 6 | `useAdminOrder.ts` e `useOrder`/`useOrders` não foram mexidos (só os tipos). | Alterar o hook, como o Contrato previa. | Eles já leem `select('*')` ou `order_items(*)`, então as colunas chegam sozinhas. | nenhum |
| 7 | O guarda que cruza as chaves ficou em `apps/store/src/features/checkout/lib/__tests__/chavesDoItemDoPedido.test.ts`. | `shared/lib/__tests__`. | Ele importa `buildOrderItems`, e um teste em `shared` importando de `features` cruzaria camada do FSD. | nenhum |
| 8 | A frase aparece logo abaixo do nome, no estilo da linha de detalhe: `text-[13px] ink-soft` na loja, `text-xs text-secondary` no painel. | Badge ou cor de destaque. | É informativa, e o tom é memorial. | nenhum |
| 9 | Pedido montado: nenhum teste novo de "sem marca". | Teste no `proposal.ts`. | Esse caminho não passa por `buildOrderItems`, e a RPC `create_order_from_proposal` lista as colunas explicitamente (migration 89:506), sem as novas. Fica sem marca por construção. | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Regra da marca (aceita, descarta a de fora do pedido e a forjada), frase "o X e o Y", nome do principal tirado do mesmo pedido | unidade (core) | `packages/core/src/buy-together/__tests__/marks.test.ts` | sim | — |
| 2 | A frase da sacola é a mesma referência de `core` | unidade | `CartDrawerAcompanha.test.tsx` (caso novo) | sim | vermelho |
| 3 | Guarda de schema: colunas nulas, sem FK, sem dado, sem grant | guarda que lê disco | `apps/store/src/shared/lib/__tests__/compreJuntoNoPedidoSchema.test.ts` | sim | — |
| 4 | Probe local: as colunas existem e o `order_items` antigo lê igual | integração local | `.specs/work-items/WI-01-compre-junto/probes/04-marca-no-pedido.sh` | sim | não se aplica |
| 5 | `create-order` grava a marca, descarta a de fora do pedido e a forjada, não grava coluna fora da lista | unidade da function com dublê | `supabase/functions/checkout/__tests__/createOrder.test.ts` (bloco novo) | sim | — (4 casos) · vermelho (3 que passaram de primeira) |
| 6 | `buildOrderItems` leva a marca; o bump vai sem; o preço não muda | unidade | `buildOrderPayload.test.ts` (bloco novo) | sim | — · vermelho (preço) |
| 7 | O pedido do conjunto entra na fila de material se qualquer peça exige | unidade com `initialMaterialStatus` | `buildOrderPayload.test.ts` | sim | vermelho |
| 8 | Guarda que cruza as chaves de `buildOrderItems` com `COLUNAS_DOS_ITENS` + `COLUNAS_DA_MARCA` | guarda que lê disco, âncora dupla, sensor | `chavesDoItemDoPedido.test.ts` | sim | vermelho |
| 9 | Confirmação: "Acompanha o X"; cada adicional com o seu principal; pedido sem Compre Junto igual | componente | `OrderItemsSummary.test.tsx` | sim | — · vermelho |
| 10 | Confirmação pela página real | página | `OrderConfirmationPage.test.tsx` (bloco novo) | sim | vermelho (a primeira mutação sobreviveu; ver Divergências) |
| 11 | Painel: "Acompanha o X", "o X" e "o Y", pedido sem Compre Junto igual | página real | `apps/backoffice/src/pages/admin/AdminOrderPage.acompanha.test.tsx` | sim | — · vermelho |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

## Arquivos alterados

packages/core/src/buy-together/marks.ts criado
packages/core/src/buy-together/__tests__/marks.test.ts criado
packages/core/src/buy-together/index.ts alterado
packages/core/src/buy-together/__tests__/purity.test.ts alterado
packages/supabase/src/types/index.ts alterado
supabase/migrations/20261106120000_compre-junto-no-pedido.sql criado
supabase/functions/checkout/handlers.ts alterado
supabase/functions/checkout/__tests__/createOrder.test.ts alterado
supabase/CLAUDE.md alterado
apps/store/CLAUDE.md alterado
apps/store/src/features/checkout/lib/buildOrderPayload.ts alterado
apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts alterado
apps/store/src/features/checkout/lib/__tests__/chavesDoItemDoPedido.test.ts criado
apps/store/src/shared/lib/__tests__/compreJuntoNoPedidoSchema.test.ts criado
apps/store/src/entities/order/api/useOrders.ts alterado
apps/store/src/entities/order/lib/itemDetailLine.ts alterado
apps/store/src/entities/order/ui/OrderItemsSummary.tsx alterado
apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx alterado
apps/store/src/pages/__tests__/OrderConfirmationPage.test.tsx alterado
apps/store/src/pages/__tests__/CheckoutPage.test.tsx alterado
apps/store/src/widgets/cart-drawer/model/drawerFacts.ts alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx alterado
apps/backoffice/src/pages/admin/AdminOrderPage.tsx alterado
apps/backoffice/src/pages/admin/AdminOrderPage.acompanha.test.tsx criado
.specs/work-items/WI-01-compre-junto/probes/04-marca-no-pedido.sh criado

## Verificação

- Tipos (fonte: arquivo de instruções, `CLAUDE.md` › Comandos): `npx tsc --noEmit -p apps/store/tsconfig.app.json` → 0; `apps/backoffice/tsconfig.app.json` → 0; `packages/core/tsconfig.json` → 11, os mesmos do baseline medido antes da primeira fatia (store 0 · backoffice 0 · core 11, comparados por arquivo e código). `apps/mobile-adm/tsconfig.app.json` → 0. Uma rodada intermediária deu TS2322 em `marks.ts`, que é meu: com `strictNullChecks` desligado o `unknown` não estreitava. Consertei.
- Um arquivo de teste (fonte: `PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000`, a cada fatia, todos verdes.
- Verificação mínima (fonte: `CLAUDE.md` › Baselines), um workspace por vez, exit fora de pipe:
  - core: 5306/213, exit 0
  - functions: 1438/39, exit 0
  - store: 6807/363, exit 0. A primeira rodada reprovou 1 caso em `CheckoutPage.test.tsx`, expectativa exata do bump; consertei.
  - backoffice: 5027/279, exit 0. A primeira rodada reprovou `originZipNotRead`; ver Divergências.
  - mobile-adm: só `src/entities/order` e `src/entities/customer`, 384/19, exit 0. Confirma que `COLUNAS_DOS_ITENS` do app não quebra; o app não foi editado.
- ESLint nos arquivos tocados (store e backoffice): limpo.
- Ambiente local (`PROJECT.md` › Ambiente local): `supabase status` com o DB de pé; `supabase migration up --local` aplicou só `20261106120000`. Probe `ANTES=676446f95531132f7f1edf98716da23d ./04-marca-no-pedido.sh` → 4 `ok —`, 0 falhas. As colunas estão nulas e sem default, sem FK. O md5 das 16 colunas antigas nas 119 linhas é idêntico antes e depois. A marca grava e a lista apaga sem esbarrar, numa transação desfeita.
- Instruções lidas: `CLAUDE.md` (raiz, no contexto) › O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy, › Feature-Sliced Design. `apps/store/CLAUDE.md` › Página do produto (inclui "O bloco Compre Junto" e "O botão único"), › Carrinho, chrome e checkout (inclui "A sacola v4"), › Material afetivo. `supabase/CLAUDE.md` › Migrations (inclui "O Compre Junto"), › RLS — o molde, › Edge functions, › `checkout`. `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local. Do `apps/backoffice/CLAUDE.md` só o índice de títulos; as seções citadas pela tarefa (fornecedor, perguntas, destaque, busca, movimento) não tratam do item do pedido. `apps/store/CLAUDE.md` › A gaveta de material e › A home não salta não foram lidas: a tarefa não toca nesses pontos.

## Divergências e descobertas

- **CA-05.2, item "o X e o Y" no pedido**: pela decisão #1, uma linha do pedido acompanha um único principal. A frase com dois nomes está provada em `core` e na sacola. Na confirmação e no painel está provado que dois adicionais nomeiam dois principais diferentes, uma frase por linha.
- O fixture de `CartDrawerAcompanha.test.tsx`, que veio da tarefa 04, tinha `origin_zip: ''`. O guarda `originZipNotRead` do painel o acusou (precedente registrado no fecho da `89`). Removi a chave do fixture, porque eu já mexia nesse arquivo.
- `CheckoutPage.test.tsx`: a expectativa exata do item do bump ganhou `accompanies_product_id`/`accompanies_list_id: null`. É asserção a mais, nada foi afrouxado.
- A âncora de `core/buy-together/__tests__/purity.test.ts` passou de 6 para 7 arquivos e de 8 para 9 visitados, por causa do `marks.ts` novo.
- O insert de `order_items` em `create-order` era `{ ...item, order_id }`, como a tarefa dizia. Agora é por lista explícita, e `id`, `order_id` e chaves inventadas pelo navegador não chegam mais ao banco.
- Página da confirmação: o primeiro check de mutação **ficou verde**. A mutação "frase com o nome de qualquer outra linha" passava no caso "sem Compre Junto", que tinha uma linha só. Reforcei o caso com duas linhas e a mesma mutação ficou vermelha.
- `/Acompanha/` casa com a ação "Acompanhar pedido" da página de confirmação. As asserções de ausência usam `/Acompanha o /`.
- O boot local da function `checkout` não foi tentado: o edge runtime local está parado (`supabase status`: "Stopped services"). A function está provada por teste de unidade com dublê, como a tarefa autoriza.
- `create-payment` (`mercado-pago/handlers.ts:430`, 738, 1029) lê `order_items` por `select` explícito, sem as colunas novas. Um caso de `createOrder.test.ts` crava o `select` do recálculo e a ausência de `accompanies` no arquivo. Não foi alterado.
- Fatia 4 (o probe) é de infraestrutura e passou de primeira, sem check de mutação.
- Citações conferidas ao usar, 12: `handlers.ts` 202-229 / 412-415 / 432-435 batem. `AdminOrderPage.tsx` 483-550: deslocou, o `items.map` está na linha 481; relocalizei. `useAdminOrder.ts:190`, `buildOrderPayload.ts` 63-125, `OrderItemsSummary.tsx` 52-82, `itemDetailLine.ts` 4-27, migration 22 (91-104), migration 89 (506), `createOrder.test.ts` 241/864 e `orderNumberSchema.test.ts` batem. `material.ts:251-254` bate.
- Caducou: tarefa 04 (fechada) · o Contrato dela põe `companionPhrase` em `widgets/cart-drawer/model/drawerFacts.ts` · ela agora mora em `core/buy-together/marks.ts`, e `drawerFacts` a reexporta (decisão #4).

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 05
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/store/CLAUDE.md (Página do produto, Carrinho/checkout, Material afetivo); apps/backoffice/CLAUDE.md (índice); supabase/CLAUDE.md (Migrations, RLS, Edge functions, checkout); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos:
  - create-order (grava marca; descarta a de fora do pedido e a forjada; sem coluna fora da lista; todas as colunas de hoje; preço intocado e create-payment sem ler a marca): supabase/functions/checkout/__tests__/createOrder.test.ts
  - guarda de fonte (chaves de buildOrderItems = colunas do create-order, âncora dupla e sensores): apps/store/src/features/checkout/lib/__tests__/chavesDoItemDoPedido.test.ts
  - buildOrderItems (marca no payload; bump sem marca; preço intocado): apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts
  - confirmação e painel ("Acompanha o X"; um principal por adicional; pedido sem Compre Junto igual): apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx, apps/store/src/pages/__tests__/OrderConfirmationPage.test.tsx, apps/backoffice/src/pages/admin/AdminOrderPage.acompanha.test.tsx
  - guarda de schema e probe local: apps/store/src/shared/lib/__tests__/compreJuntoNoPedidoSchema.test.ts; .specs/work-items/WI-01-compre-junto/probes/04-marca-no-pedido.sh
  - fila de material com initialMaterialStatus: buildOrderPayload.test.ts
  - regra pura e frase: packages/core/src/buy-together/__tests__/marks.test.ts
  - sem cobertura: "o X e o Y" numa mesma linha do pedido (decisão #1: um principal por linha; a frase com dois nomes está provada em core e na sacola)
Verificações: tsc store 0 · backoffice 0 · core 11 (= baseline) · mobile-adm 0; suítes core 5306/213, functions 1438/39, store 6807/363, backoffice 5027/279, todas exit 0; mobile-adm order/customer 384/19; migration aplicada só no local; probe 4 ok / 0 falhas; eslint limpo nos tocados
Árvore de trabalho: ver "Arquivos alterados" (25 caminhos); nada commitado
Citações conferidas: 12; deslocou AdminOrderPage.tsx 483 (items.map na 481); nenhuma morta
Caducou: tarefa 04 · companionPhrase "em drawerFacts" · movida para core/buy-together/marks.ts, com drawerFacts reexportando
```

## T05 — wi-impl-review · fixing · agente ac466671b0a63cde4

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/05-pedido-com-a-marca-acompanha.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | premissa derrubada | quebra | `packages/core/src/buy-together/marks.ts:35-52` (`orderItemMark` devolve só a primeira marca válida) e `:80-86` (`orderItemCompanionNames` devolve no máximo um nome); `supabase/migrations/20261106120000_compre-junto-no-pedido.sql:21-23` (duas colunas escalares) | Pela premissa 1, cada linha do pedido guarda um único principal. Por isso a confirmação e o painel nunca conseguem dizer "o X e o Y". Uma linha que na sacola dizia "Acompanha o X e o Y" (CA-04.1, entregue na tarefa 04) aparece no pedido como "Acompanha o X": o segundo principal se perde na gravação. Os testes de tela (`OrderItemsSummary.test.tsx` "cada adicional nomeia o próprio principal", `AdminOrderPage.acompanha.test.tsx` "dois principais no pedido") testam outra coisa: duas linhas com um principal cada, não uma linha com dois. | Pronto quando: "a confirmação `/pedido/:id` e o painel dizem 'acompanha o <principal>' (inclusive 'o X e o Y')". Testes: "Confirmação `/pedido/:id` e painel: 'acompanha o X' e 'o X e o Y'". spec.md:214: "peça já na sacola soma e vira 'acompanha o X e o Y' (…) frase na gaveta, no `/pedido/:id` e no painel". O motivo que o implementador deu (o relatório da 06 agrupa por joia e contaria duas vezes) é real. Mesmo assim ele não decide sozinho contra um critério escrito: ou se guardam todas as marcas da linha, ou o humano corta o "o X e o Y" do pedido. Como a forma das colunas é o que a tarefa 06 lê, essa escolha precisa ser feita antes de a 06 rodar. |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o pedido feito com o conjunto grava a marca (principal e lista) em cada linha adicional, e o preço continua o do servidor | `buildOrderPayload.ts:69-105`, `handlers.ts:267-285,487-495`; teste `createOrder.test.ts` (bloco "a marca acompanha"), com leitura do `select` explícito de `mercado-pago/handlers.ts` | sim (com a ressalva do achado 1: grava só uma marca por linha) |
| a marca forjada, ou cujo principal não está no pedido, é descartada; coluna fora da lista não é gravada | `marks.ts:35-52`, `COLUNAS_DOS_ITENS`/`COLUNAS_DA_MARCA` em `handlers.ts:242-264`; casos "descarta…" e "não grava coluna fora da lista" em `createOrder.test.ts` | sim |
| a confirmação `/pedido/:id` e o painel dizem "acompanha o <principal>" (inclusive "o X e o Y"); o pedido de quem não usou o Compre Junto fica igual | `OrderItemsSummary.tsx:53-80`, `AdminOrderPage.tsx:500-548` | não: "o X e o Y" não é possível no pedido (achado 1). O resto bate. |
| o pedido do conjunto entra na fila de material se qualquer peça exige material | `buildOrderPayload.test.ts`, caso com `initialMaterialStatus` (só o adicional exige ⇒ `aguardando_material`) | sim |
| probe no banco local: as colunas novas existem, nulas por padrão, e o `order_items` antigo lê igual | `probes/04-marca-no-pedido.sh` (colunas, sem FK, md5 das 16 colunas antigas, transação desfeita) | só execução |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver seção Testes | parcial: "o X e o Y" no pedido não foi testado (achado 1) |
| testes dos arquivos que você alterou, passando | relatado pelo implementador | só execução |
| a verificação mínima de cada repositório (tipos e suítes, loja quando o painel mudou) | relatado: core 5306/213, functions 1438/39, store 6807/363, backoffice 5027/279; tipos 0 · 0 · core 11 | só execução |

## Obrigações

- Segurança, a marca é informativa e não muda preço: aplicada. `linhaDoItem` grava por lista explícita, `orderItemMark` descarta a marca forjada ou cujo principal está fora do pedido, e o `create-payment` lê preço por `select` explícito sem a marca (teste lê a fonte).
- Guarda de fonte que cruza as chaves de `buildOrderItems` com as colunas do `create-order`: aplicada em `chavesDoItemDoPedido.test.ts`. Igualdade nas três formas de linha, âncora dupla, um sensor para coluna removida e outro para constante renomeada.
- Import de `core/buy-together` por caminho relativo com `.ts`: aplicado (`handlers.ts:39` importa `marks.ts`, que não tem import nenhum). `purity.test.ts` caminha o grafo transitivo.
- Migration só no local, `if not exists`, sem escrita de dado, sem `grant`, guarda com uma régua por comando: aplicada (`compreJuntoNoPedidoSchema.test.ts`, com `mutar()` que lança).
- Tipos e `COLUNAS_DOS_ITENS` do app do ateliê não quebram: o implementador relata `tsc` 0 no mobile-adm e a suíte de `entities/order` e `entities/customer` verde, sem editar o app. Isso é um teste de leitura que já existia, não um escrito agora. Aceitável pela letra da obrigação.
- Folha de separação e e-mail intocados: aplicada (nenhum arquivo deles no diff).
- Fila de material sem regra nova: aplicada (`initialMaterialStatus`, sem mudança em `material.ts`).
- Medição e documentação em `supabase/CLAUDE.md` › `checkout` e `apps/store/CLAUDE.md` › Carrinho: documentação aplicada nas duas. A medição foi relatada.

## Testes

- `create-order` (grava, descarta a de fora do pedido e a forjada, nenhuma coluna fora da lista, preço do servidor): `supabase/functions/checkout/__tests__/createOrder.test.ts`. Morde: confere por propriedade nas linhas gravadas pelo dublê, as chaves por igualdade e todas as 14 colunas por `toEqual`.
- Guarda de fonte, chaves × colunas: `apps/store/src/features/checkout/lib/__tests__/chavesDoItemDoPedido.test.ts`. Morde: compara por igualdade, e os sensores chamam o mesmo colhedor.
- `buildOrderItems` (leva a marca; bump e montado sem marca): `buildOrderPayload.test.ts`. Morde. O pedido montado não tem teste, pela premissa 9: o caminho da RPC lista as colunas, então isso se sustenta.
- Confirmação e painel: `OrderItemsSummary.test.tsx`, `OrderConfirmationPage.test.tsx` (página real), `AdminOrderPage.acompanha.test.tsx` (página real). Morde para "Acompanha o X" e para "pedido sem Compre Junto igual" (com duas linhas, para não passar vazio). Não cobre "o X e o Y" numa linha (achado 1).
- Guarda de schema mais probe: `compreJuntoNoPedidoSchema.test.ts`, com uma régua por comando, sensores e `mutar()` que lança; e `probes/04-marca-no-pedido.sh`, que só a execução prova.
- Fila de material: `buildOrderPayload.test.ts` com `initialMaterialStatus`. Morde: tem o par `nao_aplicavel`.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Um principal por linha, em duas colunas escalares | não | Pronto quando ("inclusive 'o X e o Y'"), bloco Testes, spec.md:214, CA-04.1 na sacola | sim: lista a 06, que de fato agrupa "por joia principal" (06:7, 06:21) |
| 2 | `accompanies_product_id text`, `accompanies_list_id uuid`, nulas, sem FK | sim | `order_items.product_id` é texto. O Contrato pede "sem FK que bloqueie apagar lista". O probe apaga a lista numa transação | sim (06) |
| 3 | Regra em `marks.ts` sem import, chamada pela loja e pela function, sem ler o banco | sim | CA-05.4 (informativa), root CLAUDE.md › denoReach, "defeito 01" | sim: declara o uuid forjado mas bem formado no recorte "por lista" da 06 |
| 4 | `companionPhrase` subiu para `core`, e `drawerFacts` reexporta (`toBe`) | sim | O Contrato marca a frase como "não altere", mas o comportamento não mudou. Root CLAUDE.md, consequência 1 do "defeito 01", manda para `core` quando há dois consumidores, e a tarefa diz que o arquivo de instruções manda no COMO | sim |
| 5 | As duas chaves sempre presentes, `null` na linha comum e no bump | sim | É o que permite ao guarda comparar por igualdade | sim (`CheckoutPage.test.tsx`) |
| 6 | Hooks de leitura não alterados | sim | `useAdminOrder.ts:190` `select('*')` e `useOrders.ts:61,76` `order_items(*)` | sim |
| 7 | Guarda em `features/checkout/lib/__tests__` | sim | FSD: `shared` não importa de `features` | sim |
| 8 | Frase no estilo da linha de detalhe | sim | Tom memorial, sem badge | sim |
| 9 | Pedido montado sem teste novo | sim | O caminho da proposta vai por RPC com colunas explícitas, não por `buildOrderItems` nem `linhaDoItem` (`handlers.ts:374`) | sim |

## Não conferido

- `.specs/work-items/WI-01-compre-junto/probes/04-marca-no-pedido.sh` está `??`, sem intent-to-add. É arquivo de `.specs/`, novo, e foi julgado inteiro pelo escopo da tarefa. Não há baseline do que existia antes, mas por ser arquivo novo da tarefa isso não esconde nada proibido.
- `supabase/CLAUDE.md`: a seção "O Compre Junto — listas e adicionais (migration `20261105120000_compre-junto.sql`)" aparece no mesmo diff. Esta tarefa não a explica (é da tarefa 01 ou de onda anterior) e ela não foi julgada.
- `purity.test.ts` aparece como arquivo novo no diff, e o implementador o declara "alterado" (âncora de 6 para 7). Não dá para separar o que veio de tarefa anterior; julguei o estado atual.
- Observação fora do diff: o comentário em `apps/store/src/entities/order/api/useOrders.ts:142-143` ("`order_items` é inserido com o espalhamento do item") ficou falso com a lista explícita. A linha não foi tocada pelo diff, por isso não virou achado.
- Resultados de suíte, `tsc`, ESLint e probe: só a execução prova. Não rodei.
- O boot local da function `checkout` com o import novo não foi conferido. A prova é por unidade com dublê, como a obrigação admite.
Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (raiz, no contexto: O "defeito 01", Os guardas, Convenções, Baselines, CI e deploy, Feature-Sliced Design); `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram, › `checkout`; `apps/store/CLAUDE.md` › índice de títulos, › Carrinho, chrome e checkout (incluindo › A sacola v4 e a marca "acompanha"). Não li `apps/backoffice/CLAUDE.md` nem `apps/store/CLAUDE.md` › Página do produto, › Material afetivo, › A home não salta: as seções citadas não governam o item do pedido nem a migration.

## T05 — wi-impl-task · done · agente aa7fc13d8555744c1

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/05-pedido-com-a-marca-acompanha.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 (revista) | Cada linha do pedido guarda **todos** os principais válidos que acompanha, com a lista de origem de cada um. São dois arrays alinhados por posição: `accompanies_product_ids text[]` e `accompanies_list_ids uuid[]`. Um elemento nulo na lista indica peça escolhida direto no produto; nas linhas sem marca, as duas colunas ficam nulas. | As duas colunas escalares (um principal por linha). Também descartado: uma coluna `jsonb` única. | O achado está certo: com colunas escalares, o "o X e o Y" da sacola se perdia na gravação, contra o Pronto quando e a spec. Dois arrays mantêm a forma "principal e lista" do Contrato. | Tarefa 06. A RPC do relatório lê dois arrays: desaninha os dois juntos para os recortes por joia e por lista, e conta cada linha uma vez nos totais. Já propagado para a 06. |
| 2 (revista) | Colunas `order_items.accompanies_product_ids text[]` e `accompanies_list_ids uuid[]`. Nulas, sem default e sem FK. | Os nomes no singular. | Agora são arrays. | Tarefa 06 |
| 3 (revista) | Regra `orderItemMarks` (antes `orderItemMark`), mais `markColumns` e `marksFromColumns`, em `core/buy-together/marks.ts`, chamada pela loja e pela function. Devolve todas as marcas válidas na ordem em que vieram, sem repetir o par principal+lista. Descarta só a marca inválida, e a lista dela cai junto, para os dois arrays continuarem alinhados. "Forjada" continua significando forma inválida; agora inclui também coluna que não é array. | Ficar só com a primeira marca válida. | Mesma razão da decisão 1. | Tarefa 06: um uuid forjado mas bem formado continua podendo aparecer no recorte "por lista". Preço não é afetado. |
| 10 | No banco local, apaguei as duas colunas escalares que a primeira versão desta migration tinha criado (vazias: 0 linhas com marca), removi o registro `20261106120000` de `supabase_migrations.schema_migrations` e reapliquei com `supabase migration up --local`. Reescrevi o arquivo da migration em vez de criar uma migration nova. | Uma segunda migration convertendo as colunas. | A migration nunca saiu do banco local e foi criada nesta mesma tarefa. Com uma migration de correção, ficariam duas migrations para uma feature que ainda não foi publicada. Não houve reset nem drop da base, só das duas colunas vazias que eu mesmo criei. | Só o banco local deste repositório. Nenhuma outra árvore aplicou essa versão. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Regra das marcas: guarda todas, descarta só a inválida mantendo o alinhamento, não repete; colunas ida e volta; nomes de dois principais | unidade (core) | `packages/core/src/buy-together/__tests__/marks.test.ts` (reescrito) | sim | vermelho (`return out.slice(0, 1)` e `break` depois do primeiro nome) |
| 3 | Guarda de schema: arrays nulos, sem FK, sem dado, sem grant; volta a coluna escalar reprova | guarda que lê disco | `compreJuntoNoPedidoSchema.test.ts` | sim | — (sensores por mutação no próprio guarda) |
| 4 | Probe local: os arrays existem, o antigo lê igual, linha com dois principais grava alinhada | integração local | `probes/04-marca-no-pedido.sh` | sim | não se aplica |
| 5 | `create-order` grava os dois principais alinhados; na marca parcial descarta só a de fora; forjada (inclusive coluna que não é array) cai | unidade da function | `createOrder.test.ts` | sim | vermelho (`slice(0, 1)`) |
| 6 | `buildOrderItems` leva os dois principais alinhados | unidade | `buildOrderPayload.test.ts` | sim | vermelho (`slice(0, 1)`) |
| 9 | Confirmação: a mesma linha diz "Acompanha o X e o Y" | componente | `OrderItemsSummary.test.tsx` | sim | vermelho (`break`) |
| 10 | Página real `/pedido/:id`: "o X e o Y" | página | `OrderConfirmationPage.test.tsx` | sim | vermelho (`break`) |
| 11 | Painel: a mesma linha diz "Acompanha o X e o Y" | página real | `AdminOrderPage.acompanha.test.tsx` | sim | vermelho (`break`) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

## Arquivos alterados

packages/core/src/buy-together/marks.ts criado
packages/core/src/buy-together/__tests__/marks.test.ts criado
packages/core/src/buy-together/index.ts alterado
packages/core/src/buy-together/__tests__/purity.test.ts alterado
packages/supabase/src/types/index.ts alterado
supabase/migrations/20261106120000_compre-junto-no-pedido.sql criado
supabase/functions/checkout/handlers.ts alterado
supabase/functions/checkout/__tests__/createOrder.test.ts alterado
supabase/CLAUDE.md alterado
apps/store/CLAUDE.md alterado
apps/store/src/features/checkout/lib/buildOrderPayload.ts alterado
apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts alterado
apps/store/src/features/checkout/lib/__tests__/chavesDoItemDoPedido.test.ts criado
apps/store/src/shared/lib/__tests__/compreJuntoNoPedidoSchema.test.ts criado
apps/store/src/entities/order/api/useOrders.ts alterado
apps/store/src/entities/order/lib/itemDetailLine.ts alterado
apps/store/src/entities/order/ui/OrderItemsSummary.tsx alterado
apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx alterado
apps/store/src/pages/__tests__/OrderConfirmationPage.test.tsx alterado
apps/store/src/pages/__tests__/CheckoutPage.test.tsx alterado
apps/store/src/widgets/cart-drawer/model/drawerFacts.ts alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx alterado
apps/backoffice/src/pages/admin/AdminOrderPage.tsx alterado
apps/backoffice/src/pages/admin/AdminOrderPage.acompanha.test.tsx criado
.specs/work-items/WI-01-compre-junto/probes/04-marca-no-pedido.sh criado
.specs/work-items/WI-01-compre-junto/tasks/06-relatorio-de-adesao.md alterado

## Verificação

Só o que a correção tocou e rodou:
- Tipos (fonte: o arquivo de instruções): store 0, backoffice 0, mobile-adm 0. Core 11, iguais ao baseline por arquivo e código.
- Suítes (fonte: arquivo de instruções › Baselines), uma por vez, código de saída lido sem pipe:
  - core 5310/213, saída 0
  - functions 1439/39, saída 0
  - store 6811/363, saída 0
  - backoffice 5028/279, saída 0
- Um arquivo de teste (fonte: `PROJECT.md`): os arquivos de cada fatia reaberta, verdes.
- Banco local: apaguei as duas colunas escalares vazias e o registro da versão, depois `supabase migration up --local` aplicou só `20261106120000` (agora com arrays). O probe `ANTES=676446f95531132f7f1edf98716da23d ./04-marca-no-pedido.sh` deu 4 ok e 0 falhas: os arrays estão nulos e sem default, não há FK, o md5 das colunas antigas não mudou, e uma linha com dois principais (um de lista, um avulso) grava alinhada.
- ESLint nos arquivos tocados: limpo.
- Instruções lidas: as mesmas da implementação, sem releitura.

## Divergências e descobertas

- A primeira versão da migration `20261106120000` (colunas escalares) foi reescrita no lugar, e o banco local foi corrigido à mão (decisão #10). Ela nunca saiu do banco local.
- Ao reescrever, o guarda de contagem pegou um `;` no texto do `comment on column`, que contava como quarto comando. Troquei por vírgula e reapliquei o comentário no banco local para bater com o arquivo.
- **Propagado** para a tarefa 06, no Contrato da linha "colunas de `order_items`": nomes e forma (arrays alinhados por posição, elemento nulo = peça direto no produto), mais a orientação de desaninhar os dois juntos nos recortes e contar cada linha uma vez nos totais.
- Os testes de tela antigos de "dois adicionais, dois principais" continuam, e foram acrescentados os de "a mesma linha com dois principais", que o achado cobrava.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 05
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz); apps/store/CLAUDE.md (Página do produto, Carrinho/checkout, Material afetivo); apps/backoffice/CLAUDE.md (índice); supabase/CLAUDE.md (Migrations, RLS, Edge functions, checkout); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos:
  - create-order (grava todos os principais alinhados com as listas; descarta só a marca de fora do pedido e a forjada; sem coluna fora da lista; todas as colunas de hoje; preço intocado e create-payment sem ler a marca): supabase/functions/checkout/__tests__/createOrder.test.ts
  - guarda de fonte (chaves de buildOrderItems = COLUNAS_DOS_ITENS + COLUNAS_DA_MARCA, âncora dupla e sensores): apps/store/src/features/checkout/lib/__tests__/chavesDoItemDoPedido.test.ts
  - buildOrderItems (marca no payload, inclusive dois principais; bump sem marca; preço intocado): apps/store/src/features/checkout/lib/__tests__/buildOrderPayload.test.ts
  - confirmação e painel ("Acompanha o X"; a mesma linha com "o X e o Y"; um principal por adicional; pedido sem Compre Junto igual): apps/store/src/entities/order/ui/__tests__/OrderItemsSummary.test.tsx, apps/store/src/pages/__tests__/OrderConfirmationPage.test.tsx, apps/backoffice/src/pages/admin/AdminOrderPage.acompanha.test.tsx
  - guarda de schema e probe local: apps/store/src/shared/lib/__tests__/compreJuntoNoPedidoSchema.test.ts; .specs/work-items/WI-01-compre-junto/probes/04-marca-no-pedido.sh
  - fila de material com initialMaterialStatus: buildOrderPayload.test.ts
  - regra pura, colunas e frase: packages/core/src/buy-together/__tests__/marks.test.ts
  - sem cobertura: nada
Verificações: tsc store 0 · backoffice 0 · mobile-adm 0 · core 11 (= baseline); suítes core 5310/213, functions 1438→1439/39, store 6811/363, backoffice 5028/279, todas com saída 0; mobile-adm order/customer 384/19 (na implementação); migration (arrays) aplicada só no local; probe 4 ok / 0 falhas; eslint limpo nos tocados
Árvore de trabalho: ver "Arquivos alterados" (26 caminhos); nada commitado
Citações conferidas: 12; deslocou AdminOrderPage.tsx 483 (items.map na 481); nenhuma morta
Propagado: tarefa 06 · Contrato "colunas de order_items (principal, lista)" → nomes accompanies_product_ids text[] / accompanies_list_ids uuid[], arrays alinhados por posição, desaninhar juntos, linha conta uma vez nos totais
Caducou: tarefa 04 · companionPhrase "em drawerFacts" · movida para core/buy-together/marks.ts, com drawerFacts reexportando
```

## T06 — wi-impl-task · review · agente ade8d8e980175fcb1

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/06-relatorio-de-adesao.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A aba Adesão é uma **rota** nova, `/admin/compre-junto/adesao`. As abas Listas e Adesão são um `<nav>` de `NavLink` (`BuyTogetherTabs`, em `features/buy-together-lists`). Na página de Listas elas entram pela prop `aside` já existente, junto do `BuyTogetherFormCard`. | Abas por `?aba=` dentro da mesma página; uma prop nova `tabs` no `BuyTogetherListsIndex`. | O painel já faz abas como rotas (`/admin/pedidos/montados`). Usar o `aside` evita mexer no componente do índice. | `App.tsx`, os guardas `navItems`/`focusRoutes`/`rotasSobGuarda`, `AdminBuyTogetherPage.tsx` |
| 2 | Nome da RPC: `buy_together_adoption(p_dias integer default 30, p_agora timestamptz default now())`. Ela devolve jsonb com `pedidos_pagos`, `pedidos_com`, `pecas`, `valor`, `parte`, `media`, `por_joia[]` e `por_lista[]`. `parte` e `media` já vêm calculadas, e vêm `null` quando o divisor é 0. | Mandar só as contagens e fazer as contas no painel. | A conta fica com um dono só (o banco). A divisão por zero é tratada no SQL. | o contrato entre a migration e `features/buy-together-adoption` |
| 3 | Período fora de 7/30/90 é recusado com `22023`. A janela é de N dias de Brasília contando o dia de hoje: `store_day(p_agora) - (N-1)` até `p_agora`. | Período livre; N dias de 24 h corridas. | CA-06.4, e o dia de Brasília pelo banco. | migration, guarda |
| 4 | Uma peça só conta se o principal está no mesmo pedido, e isso é **conferido de novo no SQL** (`exists` em `order_items`). Não confio só no descarte que a `checkout` já faz. | Confiar só no que a function grava. | CA-06.1; o relatório não fica dependendo de quem gravou a marca. | migration |
| 5 | A linha marcada conta **uma vez** nos indicadores, uma vez por joia e uma vez por lista, mesmo quando acompanha duas joias da mesma lista. O valor é `unit_price * quantity`. | Somar uma vez por par desaninhado. | Contrato ("a linha conta UMA vez") e CA-06.5. | migration, probe |
| 6 | O recorte por lista traz todas as listas que existem hoje (as sem venda com 0 e "—"), as listas apagadas que tiveram venda (sem nome; o painel escreve "Lista apagada") e sempre uma linha `direto`. O nome é o de **hoje**. | Mostrar só listas com venda; congelar o nome da lista no pedido. | Pelo Design, a lista sem venda aparece com 0. Congelar o nome exigiria coluna nova em `order_items`, e isso é proibido aqui. | migration, UI |
| 7 | As frases da tela moram em `features/buy-together-adoption/model/adoption.ts`: "X% dos N pedidos pagos" (no singular, "do 1 pedido pago"), "n,n por pedido, em média" com uma casa decimal, "Nenhum pedido pago no período", "sem média no período" e o texto do vazio "Nenhum pedido teve peças compradas junto nos últimos N dias.". | Levar para `packages/core`. | Só o painel lê essas frases (core/CLAUDE.md › quando pertence ao pacote). | só o painel |
| 8 | Na primeira carga e ao trocar de período aparece o esqueleto do `StatCard`. Os dados do período anterior não ficam na tela. | `placeholderData` com os dados anteriores. | Mostrar números de 30 dias com o rótulo de 7 seria afirmar algo falso. | só a UI |
| 9 | O registro de decisão novo é o `AD-072` (o número estava livre na árvore e no repositório principal). Também acrescentei uma entrada curta de Handoff no `STATE.md`. | — | Contrato: "AD novo, número livre apurado na hora". | `.specs/STATE.md` |
| 10 | Atualizei também o `supabase/CLAUDE.md` (o contrato não o lista). | Deixá-lo de fora. | O `CLAUDE.md` da raiz manda atualizar o `CLAUDE.md` do módulo que a feature mexeu, e a migration é dele. | supabase/CLAUDE.md |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | RPC: `42501` sem papel, antes de ler; `anon` não executa; `22023` fora de 7/30/90 | probe psql local | `probes/05-adesao.sh` | sim (17 `ok —`, 0 falhas) | não se aplica (passou pelo vermelho: a função não existia) |
| 2 | RPC: só pagos e não cancelados; recorte por joia e por lista; peça que mais sai com a variação; linha "direto"; soma da quantidade da linha; editar ou apagar a lista não muda o histórico | probe psql local | `probes/05-adesao.sh` | sim | — (vermelho antes da migration) |
| 3 | Guarda da migration: uma régua por comando, fragmento da régua do AD-055 comparado ao do `store_movement` vigente | guarda de schema | `apps/store/src/shared/lib/__tests__/compreJuntoAdesaoSchema.test.ts` (53) | sim | vermelho (mutei o arquivo real, tirando o recorte de cancelado: 3 casos caíram; restaurei pela cópia, `cmp` ok) |
| 4 | Página Adesão: período 7/30/90 (padrão 30), indicadores, regra, vazio escrito, carregando, erro, tabela/cartões, barra, abas | página real | `apps/backoffice/src/pages/admin/AdminBuyTogetherAdoption.test.tsx` (15) | sim | — (vermelho: a página não existia); mesmo assim 3 mutações em `adoption.ts` (linha direto, barra, singular), as 3 caíram, restaurado com `cmp` |
| 5 | A RPC nova na lista literal `RPCS` | guarda existente | `marcacaoSoPorAcao.test.ts` | sim | — (vermelho antes de acrescentar) |
| 6 | Rota e navegação: rotas do Compre Junto, `isNavActive` na aba, Compre Junto sem foco, as abas no escopo de movimento | guardas existentes | `navItems.test.ts`, `focusRoutes.test.ts`, `rotasSobGuarda.test.ts`, `animacaoRespeitaMovimento.test.ts` | sim | — (o `navItems` ficou vermelho com a rota nova e depois foi estendido) |
| 7 | Baselines medidas, um workspace por vez | medição | todas as suítes | sim | não se aplica |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01

## Arquivos alterados

supabase/migrations/20261107120000_compre-junto-adesao.sql criado
.specs/work-items/WI-01-compre-junto/probes/05-adesao.sh criado
apps/store/src/shared/lib/__tests__/compreJuntoAdesaoSchema.test.ts criado
apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts alterado
apps/backoffice/src/features/buy-together-adoption/model/adoption.ts criado
apps/backoffice/src/features/buy-together-adoption/api/useBuyTogetherAdoption.ts criado
apps/backoffice/src/features/buy-together-adoption/ui/AdoptionReport.tsx criado
apps/backoffice/src/features/buy-together-adoption/index.ts criado
apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherTabs.tsx criado
apps/backoffice/src/features/buy-together-lists/index.ts alterado
apps/backoffice/src/pages/admin/AdminBuyTogetherAdoptionPage.tsx criado
apps/backoffice/src/pages/admin/AdminBuyTogetherAdoption.test.tsx criado
apps/backoffice/src/pages/admin/AdminBuyTogetherPage.tsx alterado
apps/backoffice/src/app/App.tsx alterado
apps/backoffice/src/widgets/admin-layout/model/navItems.test.ts alterado
apps/backoffice/src/widgets/admin-layout/model/focusRoutes.test.ts alterado
apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts alterado
CLAUDE.md alterado
.specs/STATE.md alterado
apps/backoffice/CLAUDE.md alterado
apps/store/CLAUDE.md alterado
supabase/CLAUDE.md alterado

## Verificação

- Um arquivo de teste: `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md › Comandos de verificação). O guarda passou com 53/53, a página com 15/15, `marcacaoSoPorAcao` com 96/96, e os quatro guardas do painel com 60/60.
- Migration aplicada só no local, com `supabase migration up --local` (PROJECT.md › Ambiente local). O probe `05-adesao.sh` deu 17 ok e 0 falhas.
- Tipos, `npx tsc --noEmit -p …` (CLAUDE.md › Comandos):
  - Baseline de entrada: backoffice 0, store 0.
  - No fecho: backoffice 0, store 0, mobile-adm 0, store server 0, catalog-import 0; `packages/core` 11, os herdados, iguais à baseline. Sem erro novo.
- Suítes, `pnpm --filter @estrelinha/<w> test --testTimeout=20000` (CLAUDE.md › Baselines), um workspace por vez, código de saída lido fora de pipe:
  - Entrada, com a árvore parada: backoffice 5028/279, store 6811/363.
  - Fecho: backoffice 5043/280 (+15/+1), store 6865/364 (+54/+1), core 5310/213, functions 1439/39, catalog-import 512/23.
  - mobile-adm: na primeira volta, 1 falha em `useFolhaNoHistorico.test.tsx`. Isolado, o arquivo passou verde duas vezes, e a suíte remedida fechou em 2365/148 com exit 0. O WI-01 não toca no mobile-adm.
  - A suíte da loja rodou de novo depois das mudanças nos `.md`: 6865, exit 0.
- Lint, `npx eslint .` por app (CLAUDE.md › Baselines): backoffice 23/5, store 2/2, mobile-adm 0/0. Igual à baseline.

Instruções lidas:
- `CLAUDE.md` da raiz, por seção: › O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy, › Feature-Sliced Design, › Comandos.
- `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Os módulos.
- `apps/backoffice/CLAUDE.md`:
  - lidas: › O Dashboard e o bloco "Movimento da loja", › O movimento do painel, › Compre Junto › Listas, › Compre Junto › a aba "Compre junto" do produto;
  - só pelo índice de títulos: › O fornecedor da peça, › /admin/perguntas, › O editor de Produtos em destaque, › A busca de produto.
- `supabase/CLAUDE.md` › Migrations (com O Compre Junto e A marca "acompanha"), › RLS — o molde que os guardas cobram.
- `.specs/project/PROJECT.md` › Comandos de verificação, › Ambiente local.
- O `tdd`.

## Divergências e descobertas

- **Prova em navegador não feita.** O bloco `Obrigações` da tarefa pede prova a 390 e 1440. Pelas regras deste procedimento, validação em navegador é da Validation e da skill de QA, então ficou para elas. A tabela no computador e os cartões no celular só foram conferidos por classes de breakpoint (jsdom não mede layout).
- **Commits anteriores incompletos.** Arquivos de tarefas anteriores continuam fora do Git, embora `git log` mostre os commits T01..T05/T07. Exemplos:
  - `AdminBuyTogetherListPage.tsx`, que o `App.tsx` já commitado importa;
  - `AdminBuyTogether.test.tsx`;
  - `packages/core/src/buy-together/{rules,types,total,availability}.ts`;
  - `useBuyTogetherData.ts`;
  - o `navItems.test.ts` modificado pela T01.
  
  Não toquei em nenhum deles além do `navItems.test.ts`, onde acrescentei a rota `/adesao`. Fica para o orquestrador ao commitar.
- **Baseline do `CLAUDE.md` envelhecida.** A linha anterior é do fecho da `89`. A `master` recebeu o `AD-071` e a `90` sem remedir a tabela. Por isso registrei os números do fecho e só o delta medido da T06; o delta do WI inteiro não dá para calcular contra aquela linha. Está escrito no parágrafo novo de Baselines.
- **Probes de infraestrutura sem check de mutação.** `05-adesao.sh` (fatias 1 e 2) passou pelo vermelho, mas não teve check de mutação, por ser teste contra o banco. A revisão deve ler as asserções dele. Elas conferem o SQLSTATE, os números das fixtures e o md5 de antes e depois de mexer na lista.
- **Notas que vinham de outras tarefas.** O contrato deixava comigo a nota da tarefa 07 no `apps/store/CLAUDE.md`. Escrevi a partir do código (`core/buy-together/settings.ts`, `BuyTogetherBlock.tsx`), sem o relatório da 07.
- **Guardas de tarefas anteriores registrados.** Pus na tabela de guardas do `CLAUDE.md` da raiz os guardas das tarefas anteriores (`compreJuntoSchema`, `compreJuntoConversaoSchema`, `compreJuntoNoPedidoSchema`, `compreJuntoSemColunaAntiga`, `tomDoCompreJunto`, `chavesDoItemDoPedido`, `purity` de buy-together). A descrição de cada um veio do comentário de cabeçalho do arquivo.
- **Divergência do Contrato.** A RPC lê `public.buy_together_lists` para pôr as listas sem venda com 0. Ela nunca lê `buy_together_list_items` nem `product_buy_together`; o guarda recusa as duas.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 06
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz, por seção: O "defeito 01", Os guardas, Convenções, Baselines, CI e deploy, Feature-Sliced Design, Comandos); packages/core/CLAUDE.md (Quando um código pertence a este pacote, Pureza, Os módulos); apps/backoffice/CLAUDE.md (O Dashboard e o bloco "Movimento da loja", O movimento do painel, Compre Junto › Listas, Compre Junto › aba do produto; as demais citadas pelo índice); supabase/CLAUDE.md (Migrations, RLS); .specs/project/PROJECT.md (Comandos de verificação, Ambiente local)
Testes escritos: RPC (42501, só pagos/não cancelados, por joia e por lista, peça que mais sai com variação, linha "direto", soma da quantidade, editar a lista não muda o histórico) → .specs/work-items/WI-01-compre-junto/probes/05-adesao.sh, e o guarda de schema com a régua do AD-055 comparada ao Dashboard → apps/store/src/shared/lib/__tests__/compreJuntoAdesaoSchema.test.ts; página Adesão (7/30/90, padrão 30, indicadores, vazio escrito, tabela e cartões, erro, abas) → apps/backoffice/src/pages/admin/AdminBuyTogetherAdoption.test.tsx; RPC em marcacaoSoPorAcao e rota/nav → marcacaoSoPorAcao.test.ts, navItems.test.ts, focusRoutes.test.ts, rotasSobGuarda.test.ts, animacaoRespeitaMovimento.test.ts; baselines medidas. Sem cobertura: a medida em navegador a 390 e 1440 (é da Validation/QA; jsdom não mede layout)
Verificações: probe 17 ok / 0 falhas; tsc 0 em store, backoffice, mobile-adm, store server e catalog-import, core 11 herdados; suítes no fecho store 6865/364, backoffice 5043/280, core 5310/213, functions 1439/39, mobile-adm 2365/148 (1 falha de contenção na primeira volta, verde isolado e remedido), catalog-import 512/23; lint 23/5, 2/2, 0/0
Árvore de trabalho: migration 20261107120000_compre-junto-adesao.sql (aplicada só no local), probe 05-adesao.sh, feature buy-together-adoption (model/api/ui), BuyTogetherTabs, AdminBuyTogetherAdoptionPage e o teste dela, rota no App.tsx, abas na página de Listas, guardas estendidos (marcacaoSoPorAcao, navItems, focusRoutes, animacaoRespeitaMovimento), guarda novo compreJuntoAdesaoSchema; CLAUDE.md (raiz: guardas, baselines, Estado conhecido, decisão da dona), .specs/STATE.md (AD-072 e handoff), apps/backoffice/CLAUDE.md, apps/store/CLAUDE.md, supabase/CLAUDE.md. Nada commitado
Citações conferidas: 9 abertas ao usar (presenca-leitura.sql, 73-resumo-do-atelie.sql, 71-visitas-unicas.sql, overviewSchema.test.ts, visitasSchema.test.ts, marcacaoSoPorAcao.test.ts com a lista RPCS — agora em 157-207 —, AdminDashboard/StoreMovement, a página da tarefa 01, a migration da tarefa 05); nenhuma deslocou, nenhuma estava morta
Caducou: tarefa 01 · o Compre Junto com três rotas (o índice e as duas do editor), afirmado no navItems.test.ts e no apps/backoffice/CLAUDE.md · a aba Adesão acrescentou /admin/compre-junto/adesao (o teste e o CLAUDE.md do módulo foram atualizados; o arquivo da tarefa 01 não foi reescrito)
```

## T06 — wi-impl-review · done · agente a67c91b06b7f990e0

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/tasks/06-relatorio-de-adesao.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| a aba Adesão mostra pedidos, peças e valor do período, por joia e por lista, só de pedidos pagos e não cancelados, e a regra bate com a do Dashboard (teste de fragmento) | `supabase/migrations/20261107120000_compre-junto-adesao.sql:55-178` (CTE `vendas` com `payment_status = 'approved' and status <> 'cancelled'`, `por_joia`, `por_lista`); `AdoptionReport.tsx:148-211`; a regra comparada com o `store_movement` vigente lido do disco em `compreJuntoAdesaoSchema.test.ts:89-102,132-141,273-276` | sim |
| sem papel a RPC recusa com `42501` (probe) | migration `:44-46` (`has_role` é o primeiro comando); `probes/05-adesao.sh:66-75,103-106`; guarda `recusaPrimeiro` | sim (o probe passou: só execução) |
| estado vazio escrito; editar uma lista não muda o histórico | `AdoptionReport.tsx:200-204` + `adoption.ts:56`; o corpo da função só lê a marca do pedido (guarda `historicoSoDaMarca`); probe `:88-95,135-139` (md5 igual antes e depois de apagar a lista) | sim |
| baselines e guardas do `CLAUDE.md`, `STATE.md` e os `CLAUDE.md` de módulo atualizados com números medidos | `CLAUDE.md` (Baselines, tabela de guardas, Estado conhecido, a tabela da dona); `.specs/STATE.md` (`AD-072` e o Handoff); `apps/backoffice/CLAUDE.md`, `apps/store/CLAUDE.md`, `supabase/CLAUDE.md` | sim (os números em si: só execução) |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim |
| testes dos arquivos que você alterou, passando | — | só execução |
| a verificação mínima de fechar unidade de trabalho (tipos, suíte do workspace, suíte da loja) | o implementador declara tipos 0 e as suítes medidas | só execução |

## Obrigações

- A régua de venda do `AD-055` por fragmento comparado em teste; o período em dias de Brasília no banco: aplicada. `vendaIgualAoDashboard` compara o fragmento com o `store_movement` vigente, colhido do disco, e tem um sensor nos dois sentidos. `periodoEmDiasDeBrasilia` exige `store_day(p_agora)` e `store_day_start(v_desde)`. `semRelogioDoServidor` recusa `current_date`, `now()` e `paid_at::date`. A RPC entrou em `marcacaoSoPorAcao.test.ts:161-164`.
- Peças = soma de `quantity` da linha marcada; editar a lista não muda o histórico: aplicada. Na migration, `:85` faz `sum(l.quantity)` sobre `linhas`, que é distinta por item, e as réguas `linhaUmaVez` e `umaVezPorRecorte` guardam isso. O probe confere 5 peças com a linha de duas joias contada uma vez, e o md5 igual depois de apagar a lista.
- Recusa sem papel com `42501` antes de qualquer leitura, provada por probe: aplicada (`05-adesao.sh:103-104`).
- Estado vazio escrito e divisão por zero tratada: aplicada. O SQL devolve `null` em `parte` e `media` quando o divisor é 0 (`:160-161`). O painel cobre isso em `adoption.ts:59-69` e no teste de página, que confere a ausência de NaN e Infinity.
- Nada de "pessoas": aplicada. As frases falam só de pedidos e peças, e o teste confere a ausência de `pessoa|usuári|cliente`.
- Fecho da feature: aplicado. As baselines estão medidas por workspace, com a entrada medida da tarefa. Os guardas novos estão na tabela. O Estado conhecido traz a ordem de publicação, a conferência da contagem de `buy_together_ids` e o aviso de migration na `master`. O `STATE.md` tem o `AD-072` e o Handoff.
- Mobile primeiro: aplicada no código (tabela `hidden md:table`, cartões `md:hidden`, `min-w-0` e `break-words` nos cartões). A prova a 390 e 1440 é da Validation/QA e está declarada como pendente.

## Testes

- RPC do relatório (42501, régua de venda, por joia e por lista, peça que mais sai com a variação, linha direto, soma da quantidade, histórico): são o probe `.specs/work-items/WI-01-compre-junto/probes/05-adesao.sh` e o guarda `apps/store/src/shared/lib/__tests__/compreJuntoAdesaoSchema.test.ts`. Mordem. O probe confere valores exatos de um conjunto de pedidos que discrimina os casos: o cancelado e o pendente, o principal ausente, a linha com três principais da mesma lista, o pedido de 10 dias fora dos 7, a lista sem venda e a lista apagada. O guarda tem uma régua por comando, um sensor por régua e `mutar()` que lança. O fragmento da régua de venda é comparado com o do Dashboard.
- Página da aba Adesão: `apps/backoffice/src/pages/admin/AdminBuyTogetherAdoption.test.tsx`, na página real com só o client dublado. Morde: confere o argumento `p_dias` em 30, 7 e 90, as células exatas da tabela nos dois recortes, os cabeçalhos com e sem Pedidos, a largura da barra (100% e 29%), o vazio escrito, o esqueleto, o erro com "Tentar de novo" e as abas por rota. O que jsdom não mede (a tabela e os cartões pelo breakpoint) ficou em asserção de classe por token exato, e isso está declarado no arquivo.
- RPC nova na lista literal e rota/nav nos guardas: `marcacaoSoPorAcao.test.ts` (entrada nova), `navItems.test.ts` (a lista de rotas `/admin/compre-junto*` por igualdade e `isNavActive` da aba), `focusRoutes.test.ts` e `animacaoRespeitaMovimento.test.ts` (o escopo e as âncoras 63/31). O `rotasSobGuarda` não precisou mudar: ele varre todas as rotas `/admin/*`, e a rota nova está dentro do bloco do `RequireAdmin` em `App.tsx:111`.
- Baselines: medição, só execução.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Adesão como rota `/admin/compre-junto/adesao`, abas em `NavLink`, entrando pelo `aside` da página de Listas | sim | Segue o precedente `/admin/pedidos/montados`. O `aside` renderiza entre o cabeçalho e as listas (`BuyTogetherListsIndex.tsx:68`) | sim. `rotasSobGuarda` está listado e não precisou mudar (é genérico) |
| 2 | RPC `buy_together_adoption(p_dias, p_agora)` com `parte` e `media` calculadas no banco | sim | Contrato: "RPC admin… sai indicadores…". O molde de `store_overview`. O hook só lê | sim |
| 3 | `22023` fora de 7/30/90; janela `store_day(p_agora) - (N-1)` até `p_agora` | sim | CA-06.4; Obrigações (`store_day_start`, nunca `current_date`) | sim |
| 4 | Confere de novo no SQL que o principal está no mesmo pedido | sim | CA-06.1 ("e o principal dela está no mesmo pedido") | sim |
| 5 | A linha conta uma vez nos indicadores, por joia e por lista; valor = `unit_price * quantity` | sim | Contrato ("a linha conta UMA vez"), CA-06.5 | sim |
| 6 | O recorte por lista traz as listas de hoje com 0, as apagadas que venderam sem nome e sempre a linha `direto`; o nome é o de hoje | sim | Design ("lista sem venda… 0 peças"). Congelar o nome exigiria coluna em `order_items`, e o contrato marca essas colunas como JÁ EXISTE (consuma, não altere). Os números não mudam ao editar ou apagar a lista (probe) | sim |
| 7 | As frases da tela no `model/adoption.ts` do painel, fora de `core` | sim | `packages/core/CLAUDE.md` › Quando um código pertence a este pacote: só há um consumidor | sim |
| 8 | Esqueleto ao trocar de período, sem `placeholderData` | sim | A chave da query inclui o período; `carregando = isPending && !data` (`AdoptionReport.tsx:151`) | sim |
| 9 | `AD-072` e uma entrada de Handoff no `STATE.md` | sim | O repositório principal vai até `AD-071` (`.specs/STATE.md:1702`), e não há outro `AD-072` em `.specs` | sim |
| 10 | Atualizar também `supabase/CLAUDE.md` | sim | `CLAUDE.md` da raiz › Workflow de specs: "atualize… o `CLAUDE.md` do módulo que ela mexeu" | sim |

## Não conferido

- Nenhum arquivo de `alterados` aparece como `??`: todos estão no diff (`A` ou `M`), então há baseline para todos.
- A execução das suítes, dos tipos, do lint e do probe, e os números de baseline em si: não rodei nada (a revisão é só leitura). A prova em navegador a 390 e 1440 é da Validation/QA.
- Os diffs de `CLAUDE.md` da raiz, `navItems.test.ts` e `apps/backoffice/CLAUDE.md` trazem também linhas das tarefas 01 a 05 e 07: as linhas dos guardas `compreJuntoSchema`, `compreJuntoSemColunaAntiga` e `tomDoCompreJunto`, o item Compre Junto em Catálogo e a seção das listas. Elas valem como registro de fecho que esta tarefa pede ("guardas novos na tabela"), mas o conteúdo delas não foi julgado contra as tarefas de origem.
- `compreJuntoAdesaoSchema.test.ts:16` cita o caminho `.specs/work-items/WI-01-compre-junto/probes/05-adesao.sh`. Não tratei como identificador de processo porque há precedente: outros guardas de schema citam o caminho do probe em `.specs/features/<nn>-…`.
Instruções lidas: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/CLAUDE.md (o da raiz, pelo contexto: › O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy, › Feature-Sliced Design); packages/core/CLAUDE.md › Quando um código pertence a este pacote, › Pureza; supabase/CLAUDE.md › Migrations (início), › RLS — o molde que os guardas cobram; apps/backoffice/CLAUDE.md › O movimento do painel. Não li `packages/core/CLAUDE.md` › Os módulos, nem as seções do backoffice sobre o fornecedor, `/admin/perguntas`, Produtos em destaque e a busca de produto, porque nenhum arquivo do diff toca esses assuntos.
