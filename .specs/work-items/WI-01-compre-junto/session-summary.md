# WI-01 Compre Junto — resumo da sessão de implementação

**Data**: 2026-11-02 · **Branch**: `feature/WI-01` (local, base `master`) · **Worktree**: `store-worktrees/store__feature-WI-01`
**Resultado**: as 7 tarefas `done` · Validation 1 **PASS** · `fase: done` · nada foi enviado ao remoto.

## Commits na branch (`git log --oneline master..HEAD`)

```
415af2b5 docs(WI-01): T06 AD-072 e o handoff no STATE.md
07fc6a29 fix(WI-01): T03 arquivos que ficaram fora do commit da tarefa
67626a0c fix(WI-01): T01 arquivos que ficaram fora do commit da tarefa
22980fdd feat(WI-01): T06 Relatório de adesão ao Compre Junto (aba Adesão) e fecho da documentação
e342b330 feat(WI-01): T05 O pedido guarda e mostra "acompanha"
baca8a4f feat(WI-01): T07 A dona escolhe a forma do bloco na loja
38b16e8a feat(WI-01): T04 Levar o conjunto: botão único, barra fixa, sacola e GA4
c845659a feat(WI-01): T03 Página do produto: o bloco Compre Junto
2c06612c feat(WI-01): T02 Compre junto no formulário do produto (aba "Compre junto")
23d346d4 feat(WI-01): T01 Listas do Compre Junto (menu Compre Junto › Listas)
```

Os sete `feat` são os commits de onda, feitos pelo orquestrador. Os três últimos são da Validation: os commits de onda de T01, T03 e T06 deixaram de fora arquivos que o código commitado já importava, e a branch não compilava fora do worktree (ver *Desvios*). No total, 130 arquivos e +10860/−149 linhas.

Ondas: `01 | 02,03 | 04,07 | 05 | 06`.

## O que foi feito, por tarefa

| Tarefa | Commits | Entrega |
| --- | --- | --- |
| **T01** Listas | `23d346d4`, `67626a0c` | Migration `20261105120000_compre-junto.sql`: tabelas `buy_together_lists`, `buy_together_list_items`, `product_buy_together` e a view `buy_together_list_usage`. Leitura pública, escrita com `has_role`, `restrict` na lista em uso. `core/buy-together` com os tetos (3 adicionais, 12 peças, nome de 40) e as recusas `string \| null`. No painel, o menu "Compre Junto" em Catálogo, o índice e o editor de listas (reordenar, variações liberadas, "saiu do ar", "em uso em N produtos"). `ProductSearchField` ganhou `bloquearForaDoAr`. Probe `01-listas.sh`. |
| **T02** Aba do produto | `2c06612c` | Migration de conversão `20261105130000` (de `buy_together_ids` para adicionais do tipo produto, até 3, idempotente). Aba "Compre junto" no formulário: até 3 adicionais, cada um peça ou lista, ordenáveis, com variações liberadas e "some nas variações do principal". A gravação é por `id` (`persistAddons`) e não toca outro produto. O painel deixou de mandar `buy_together_ids`. Probe `02-conversao.sh`. |
| **T03** Bloco na página do produto | `c845659a`, `07fc6a29` | `useBuyTogetherData` (leitura), `useBuyTogether` (estado), `BuyTogetherBlock`/`AddonRow`/`BuyTogetherSkeleton`. Em `core`: `resolveAddons`, `variantSellable`, `bundleTotal`, `bundlePix`, `addonMissingChoice`, `addonEngravingRefusal`. Nada vem marcado, o bloco usa a variação do principal, total e PIX, gravação dentro do bloco, peças indisponíveis puladas, falha de leitura sem quebrar a página, `view_item_list` e `select_item`. `VariantPicker` ganhou `idPrefix` e `EngravingField` ganhou `id`. |
| **T04** Levar o conjunto | `38b16e8a` | Botão único (`useBuyAction`) compartilhado pelo CTA e pela barra fixa: "Adicionar à sacola" ou "Levar o conjunto". Sacola v4 com `CartItem.accompanies[]` e `migrate` da v3 intacto; a frase "acompanha o X e o Y". A barra fixa mostra "Conjunto · N peças" sem PIX. `add_to_cart` com vários itens e `item_list_id`. |
| **T07** Forma do bloco | `baca8a4f` | `store_settings.buy_together.form` (`inline`, `sheet` ou `formula`), normalizada em `core` (`normalizeBuyTogetherForm`, padrão "Na linha"), lida por `useBuyTogetherForm`. Cartão da escolha no índice do Compre Junto. Na loja: "Em folha" (`AddonSheet`, com `Sheet` no celular e `Dialog` no computador, foco e Esc) e "Com fórmula" (`FormulaStrip`, `aria-hidden`). |
| **T05** O pedido guarda "acompanha" | `e342b330` | Migration `20261106120000`: `order_items.accompanies_product_ids text[]` e `accompanies_list_ids uuid[]`, alinhados por posição, nulos e sem FK. `core/buy-together/marks.ts` é o dono da regra (descarta marca forjada ou com principal fora do pedido). A function `checkout` grava a marca com a lista de colunas fechada e o preço do servidor intocado. A frase aparece na confirmação, na conta e no painel, inclusive "o X e o Y". Probe `04-marca-no-pedido.sh`. |
| **T06** Relatório de adesão | `22980fdd`, `415af2b5` | Migration `20261107120000` com a RPC `buy_together_adoption(p_dias, p_agora)`: 7, 30 ou 90 dias de Brasília, régua de venda do `AD-055`, recusa `42501` sem papel, só a marca do pedido. A aba Adesão (`/admin/compre-junto/adesao`) traz pedidos, peças e valor, parte dos pagos, média, recortes por joia e por lista ("Peça escolhida direto no produto", "Lista apagada") e o estado vazio escrito. Fecho da documentação: `CLAUDE.md` (guardas, baselines, Estado conhecido), os `CLAUDE.md` de módulo, `AD-072` e o handoff no `STATE.md`. Probe `05-adesao.sh`. |

## Por repositório e área

Há um repositório só, o monorepo. As áreas tocadas:

- **`supabase/migrations`**: 4 migrations, aplicadas **só no banco local**.
- **`supabase/functions/checkout`**: a marca no `create-order`.
- **`packages/core`** (21 arquivos): o módulo `buy-together` (regras, disponibilidade, total, marcas, forma), o hook `useBuyTogetherForm` e o `add_to_cart` de vários itens em `analytics`.
- **`packages/supabase`**: os tipos `buyTogether` e `settings`. **`packages/ui`**: um arquivo.
- **`apps/backoffice`** (43 arquivos): listas, aba do produto, forma, adesão, a marca no pedido e as rotas.
- **`apps/store`** (53 arquivos): o bloco, a compra do conjunto, a sacola v4, a marca no pedido e os guardas novos.
- **Documentação**: `CLAUDE.md`, `supabase/CLAUDE.md`, `apps/*/CLAUDE.md`, `packages/core/CLAUDE.md`, `.specs/STATE.md`.

## Decisões e premissas

- **`AD-072`: a lista não é coleção.** Ela mora em tabelas próprias, sem rota, menu nem sitemap. A marca no pedido é um snapshot, e editar ou apagar uma lista não reescreve o relatório.
- **Gate da página (G1, humano)**: as três formas do bloco ficam construídas e a dona escolhe, com "Na linha" como padrão; os textos do protótipo foram ratificados; o nome completo do principal; a barra fixa com o total e "Conjunto · N peças"; sem seletor de quantidade no celular. A fila e as ondas foram aprovadas em G2.
- **T05, premissa revista na revisão**: a primeira versão guardava um principal por linha e perdia o "o X e o Y". Passou a guardar arrays alinhados. A migration foi reescrita no lugar e o banco local corrigido à mão; ela nunca saiu do local.
- **T03**: `variantSellable` é uma cópia deliberada de `isVariantAvailable` que também exige preço, com um teste de igualdade. Na repetição, a peça avulsa vence a lista. "A partir de" nunca entra no total. O esqueleto só aparece quando a configuração já disse que há adicionais.
- **T04**: a marca é uma lista `{ mainProductId, listId }` e a frase é derivada na renderização. Recusas de gravação e escolhas faltando são barradas em `useBuyAction`. O N de "Conjunto · N peças" conta os marcados; o total soma só os completos.
- **T07**: sem migration semeando `buy_together` (a ausência da linha vale "Na linha"). Fechar a folha com a escolha incompleta tira a marca. A faixa da fórmula é clicável, mas fica fora do teclado e do leitor de tela.
- **T06**: a regra "o principal está no mesmo pedido" é conferida de novo no SQL. Cada linha conta uma vez nos totais. Período fora de 7/30/90 é recusado com `22023`.
- **T02**: gravar com o id do original duplicaria linhas, então duplicar um produto traz os adicionais com `id: null`.

## Desvios do PRD e da costura

- **Commits de onda incompletos (corrigido na Validation).** T01, T03 e T06 tiveram arquivos fora dos commits de onda: `rules.ts`, `types.ts`, a página do editor de listas, `availability`, `total`, `useBuyTogetherData`, o esqueleto, `EngravingField`/`VariantPicker`, os testes e mocks, e o `AD-072`. Corrigido em `67626a0c`, `07fc6a29` e `415af2b5`. Depois disso, `git diff HEAD` fora dos artefatos está vazio.
- **T02: sem a faixa "convertido do antigo".** Ela era opcional no desenho, e o painel não distingue uma linha convertida de uma criada pela dona. A conversão é feita pela migration (CA-02.8 segue coberto).
- **T05 → T06**: o contrato da coluna do pedido mudou de escalar para array e foi propagado ao arquivo da T06 antes de ela rodar.
- **Corridas interrompidas**: T04 e T07 abortaram e foram retomadas, no total quatro execuções de implementação e uma revisão sem lista de arquivos. As versões finais foram revisadas ("serve com correção") e as correções aplicadas. Dois achados cruzados das corridas paralelas sumiram na árvore final, com a suíte inteira verde na Validation: os mocks de `useStoreSettings` nas páginas de produto e o `origin_zip` na fixture de `CartDrawerAcompanha`, que `originZipNotRead` acusava.
- **Afirmações caducadas** (o comportamento continua coberto): a `companionPhrase` saiu de `drawerFacts` e foi para `core` (T05 tornou a afirmação da T04 falsa); o Compre Junto ganhou a quarta rota `/admin/compre-junto/adesao` (T06 sobre a T01).

## Gates executados (Validation 1, `qa-report.md`)

| Gate | Resultado |
| --- | --- |
| Testes (um workspace por vez, exit fora de pipe) | core 5310/213 · functions 1439/39 · store 6865/364 · backoffice 5043/280 · mobile-adm 2365/148 · catalog-import 512/23. **21534 passam, 0 falham**, exit 0 em todos |
| Tipos | store 0 · backoffice 0 · mobile-adm 0 · `tsconfig.server` 0 · `packages/core` 11, todos herdados e nos mesmos arquivos do baseline |
| Lint | backoffice 23/5 · store 2/2 · mobile-adm 0/0, igual ao baseline |
| Build | verde nos três apps. O `pnpm build` da raiz reprovou primeiro por falta de `.env` no worktree (`%VITE_SUPABASE_URL%` cru no `index.html`); refeito com a env do banco local na linha de comando |
| Cobertura | 59/59 critérios COVERED. CA-03.11 (390px, 44px) e as três formas têm só régua de fonte |
| Probes (durante as tarefas, banco local) | `01-listas`, `02-conversao`, `04-marca-no-pedido` (4 ok), `05-adesao`; não rodaram de novo na Validation |

## Pendências conhecidas

1. **Prova em navegador**: nenhuma tarefa subiu navegador, e isso é da QA real-user. Falta o bloco em 390×844 e 1440, com 130 % e 200 % de fonte (CA-03.11), as três formas, a barra fixa com o conjunto, a aba Adesão e o percurso do conjunto até o pedido.
2. **Publicação**: as quatro migrations estão **só no banco local**. A ordem é: tabelas → conversão → marca e relatório → painel → loja com a function `checkout`. O `drop column products.buy_together_ids` vem numa migration futura, depois do painel publicado. Antes do deploy, o usuário confere em produção a contagem de produtos com `buy_together_ids`. Migration nova não vai à `master` sem pergunta.
3. **O relatório nasce vazio**: ele só conta pedidos feitos depois do deploy, com a marca.
4. **Ambiente do worktree**: não há `.env`. Para o `pnpm build` da raiz e para subir os apps na QA, é preciso a env do banco local (`VITE_SUPABASE_URL=http://127.0.0.1:54441`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
5. **Curadoria da dona**: escolher a forma do bloco, montar as listas e conferir os adicionais convertidos de cada produto.
