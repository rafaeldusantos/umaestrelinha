## 01 · [store: apps/backoffice, packages/core, apps/mobile-adm, packages/supabase] A folha de separação nova, aberta pela página do pedido

**Status:** done

`C-01 · C-02 · C-03 · C-04 · C-05 · C-06 · C-07` — 96

**Objetivo.** A folha de separação passa a ter o layout novo (foto, cliente em destaque, data ao lado do número, quantidade em destaque, frete acima do endereço, sem "Material esperado", com Recado e Observação), montada por uma leitura única de N pedidos, e a página do pedido a abre por essa leitura.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz), `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`, `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · plan.md — Código — /Users/rafael.santos/Projetos/uma-estrelinha/store (e §2 Comportamentos, §5 Design).

**Habilita.** A tarefa 02 consome daqui: o carregador `entities/order/api/pickSlipOrders.ts` (lê N ids e devolve `PickSlipOrder[]` na ordem dos ids) e a nova forma de `openPickSlips` que abre a janela no clique e recebe os pedidos depois de uma leitura assíncrona. Deixe os dois exportados pelos barrels (`@/entities/order`, `@/features/pick-slip`) e com a assinatura documentada no próprio arquivo.

### Critérios de aceite

| #    | O que precisa passar a ser verdade |
| ---- | ---------------------------------- |
| C-01 | Cada item da folha mostra a foto da peça numa moldura fixa; sem foto, a moldura fica vazia, sem imagem quebrada nem texto "undefined". A folha só manda imprimir depois de as fotos carregarem |
| C-02 | O nome da cliente aparece em destaque no cabeçalho, em linha própria, fora do subtítulo cinza |
| C-03 | A data do pedido aparece ao lado do número do pedido (`Pedido #0244 · 07/11/2026`) |
| C-04 | A quantidade de cada item aparece em destaque (corpo maior, negrito) |
| C-05 | O bloco "Material esperado" (estado do material e código do envelope) sai da folha |
| C-06 | O bloco Entrega mostra o tipo de frete escolhido acima do endereço; a retirada sai como "Retirada no escritório"; sem frete gravado, a linha não aparece |
| C-07 | Havendo Recado da cliente (`orders.notes`) ou Observação do admin (`order_admin_notes`), cada um sai na folha do seu pedido, na folha de um pedido e no lote |

### Design — o que a folha faz

Sem protótipo (o usuário mandou seguir sem design). Preto no branco para impressão, como hoje (sem token do painel no CSS).
- **Cabeçalho**: `<h1>` "Pedido #N · dd/mm/aaaa" (data no fuso da loja); abaixo, o nome da cliente em linha própria, 16–18px, negrito.
- **Item**: linha em grade `quantidade | foto | nome`. Quantidade em ~18px negrito ("2×"); foto em moldura de 56px com borda fina, `object-fit: cover`; sem foto, a moldura vazia. Nome, variação, gravação e a linha "Material: …" como hoje.
- **Entrega**: primeira linha o frete, em negrito; abaixo, o endereço. Sem frete, só o endereço.
- **Recado** e **Observação**: os blocos com borda que já existem.
- Enquanto a leitura não volta, a janela mostra "Preparando a folha…".

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `packages/core/src/orders/delivery.ts › shippingMethodLabel` | VOCÊ CRIA | `{ shipping_method?: string \| null; shipping_service_id?: string \| null }` | `string \| null` — retirada (`isPickupOrder`) ⇒ `PICKUP_METHOD_NAME`; senão o `shipping_method` aparado; vazio ⇒ `null` |
| data completa no fuso da loja em `packages/core/src/time` (ex.: `formatStoreDate`) | VOCÊ CRIA | ISO string | `dd/mm/aaaa` em `STORE_TIME_ZONE` |
| `apps/backoffice/src/entities/order/api/pickSlipOrders.ts` (ex.: `fetchPickSlipOrders(ids)`) | VOCÊ CRIA | `string[]` de ids | `Promise<PickSlipOrder[]>` na ordem dos ids |
| `features/pick-slip/lib/pickSlip.ts › buildPickSlipHtml`, `openPickSlips`, `PickSlipItem`, `PickSlipOrder` | JÁ EXISTE. Altere | — | `PickSlipItem.image`; `PickSlipOrder.shipping_method`, `shipping_service_id`; `openPickSlips` abre no clique e preenche depois |
| `DbOrder` em `packages/supabase/src/types/index.ts` | JÁ EXISTE. Acrescente `shipping_method?: string \| null` | — | — |
| `core/orders/itemPhoto.ts › itemPhoto`, `catalogProductIds` | JÁ EXISTE. Consuma; não altere | — | — |
| `core/media/rendition.ts › renditionUrl`, `core/media › primaryImage` | JÁ EXISTE. Consuma; não altere | — | — |
| `core/shipping/pickup.ts › isPickupOrder`, `PICKUP_METHOD_NAME` | JÁ EXISTE. Consuma; não altere | — | — |
| `ORDER_ADMIN_NOTE_COLUMNS` (`@estrelinha/core/order-actions`) | JÁ EXISTE. Consuma; não altere | — | — |
| tabelas `orders`, `order_items`, `order_admin_notes`, `products` (RLS de admin) | JÁ EXISTE. Só leitura | — | — |

### Decisões já tomadas

- P1: a folha em lote leva Recado e Observação de cada pedido (reverte a decisão N6 da WI 95; reescreva o comentário `pickSlip.ts › PickSlipOrder.admin_note` que diz "a folha em lote não").
- P2: a foto é a da regra `itemPhoto` (snapshot `order_items.product_image` vence; capa atual do catálogo onde falta), nunca a foto da variação.
- P3: "Imprimir sem observação, não é obrigatório" — falha de `order_admin_notes` degrada para folha sem o bloco Observação; falha de `orders`/`order_items` LANÇA (nada impresso, folha sem itens seria afirmação falsa); falha de `products` degrada para foto nenhuma.
- P5: a folha de um pedido (`AdminOrderPage.tsx`, botão da folha) usa o mesmo carregador do lote para o id dela — uma montagem só.
- P6: o app do ateliê passa a delegar a `shippingMethodLabel` no lugar da regra escrita à mão em `apps/mobile-adm/src/widgets/order-detail/ui/BlocoValores.tsx:33` (só ali; `BlocoEntrega.tsx` fica como está se não for a mesma regra).
- P7: a linha "Material: …" de cada item fica; sai só o bloco "Material esperado" (e os imports `MATERIAL_STATUS_LABELS`/`toMaterialStatus` que ficarem órfãos).
- A miniatura usa `renditionUrl` com largura de 2× a moldura (112); URL externa volta inalterada.
- `openPickSlips` abre a janela de forma síncrona no gesto do clique (senão o popup é bloqueado depois do `await`), escreve "Preparando a folha…", preenche quando os pedidos chegarem, e só chama `print()` depois do `load` das imagens do documento (com teto de espera, para não travar se uma imagem não responder). Leitura que falha fecha a janela e o chamador avisa. Popup bloqueado devolve sinal para o chamador avisar. Desenhe a API para ser testável sem navegador (o HTML continua em `buildPickSlipHtml`).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| leitura por lote de ids que lança | `apps/backoffice/src/entities/order/api/sentEmails.ts › fetchSentEmails` |
| capa do catálogo por id que degrada | `apps/backoffice/src/entities/order/api/useAdminOrder.ts › lerProdutos` |
| foto com moldura vazia | `apps/backoffice/src/pages/admin/AdminOrderPage.tsx` — o bloco dos itens que usa `itemPhoto` |
| rótulo em `core` alcançável pelo Deno | `packages/core/src/orders/delivery.ts › shippingLine` |
| colunas da observação | `apps/backoffice/src/features/order-admin-note/api/useOrderAdminNote.ts › lerObservacao` |
| teste de conteúdo da folha | `apps/backoffice/src/features/pick-slip/__tests__/pickSlip.test.ts` |
| teste da página com o client dublado | `apps/backoffice/src/pages/admin/AdminOrderPage.observacao.test.tsx` |

### Testes

- unidade (folha): sem o bloco "Material esperado" nem o código do envelope (inverter o caso que hoje assere `'Material esperado'` e `'envelope BR44 9182 3'`).
- unidade (folha): o `<h1>` traz a data ao lado do número; o nome da cliente em linha própria em destaque, fora do subtítulo cinza.
- unidade (folha): a quantidade sai em destaque.
- unidade (folha): item com foto imprime `<img>` com a URL dada e `alt` escapado; item sem foto imprime a moldura vazia, sem `<img>` e sem "undefined".
- unidade (folha): Entrega imprime o frete antes do endereço (PAC, SEDEX, retirada); sem frete, nenhuma linha vazia.
- unidade (folha): lote de dois pedidos — cada folha com os seus itens, endereço, frete, recado e observação, sem misturar.
- unidade (core): `shippingMethodLabel` — retirada pelo `shipping_service_id` vence o texto gravado; serviço comum aparado; vazio/só espaço ⇒ `null`. A data no fuso da loja, inclusive uma meia-noite UTC que em Brasília é o dia anterior.
- unidade (carregador, client dublado registrando a cadeia): `.in` sobre os ids em `orders`, `order_items`, `order_admin_notes`; `products` só com os ids que `catalogProductIds` aceita; falha de `orders`/`order_items` lança; falha de `order_admin_notes` devolve sem observação; falha de `products` devolve sem foto de catálogo (snapshot continua); ordem dos ids preservada; foto pela regra `itemPhoto`.
- unidade (janela): `print()` só depois do `load` das imagens; popup bloqueado devolve o sinal; leitura que falha fecha a janela.
- página (`AdminOrderPage` real): o botão da folha passa pelo carregador com o id do pedido e entrega pedido com observação, frete e foto (ajustar `AdminOrderPage.observacao.test.tsx`, que hoje assere `admin_note` no objeto passado a `openPickSlips`).
- app do ateliê: o caso existente do `BlocoValores` continua verde delegando a `core`.

### Obrigações

- "defeito 01": a regra do nome do frete mora só em `core/orders/delivery.ts`; a folha e o `BlocoValores.tsx` a chamam. A foto vem de `itemPhoto`, nunca de cópia.
- `core/orders/*` e `core/time/*`: todo especificador relativo com `.ts` explícito (inclusive `import type`), nenhum import de pacote — `denoReach`/`purity` do diretório.
- `fusoComDonoUnico` (suíte da loja, sem allowlist): o fuso só por `STORE_TIME_ZONE` importado de `core/time/zone.ts`.
- `renditionSingleOwner` (suíte da loja): URL de rendição só por `renditionUrl`; nunca `render/image`, `width=` ou `quality=` à mão.
- `buscaDeProdutoComDonoUnico`: `products` só por `.in('id', …)`.
- `provenanceNotRead`: o carregador não nomeia `nuvemshop_status`, `nuvemshop_payment_status`, `nuvemshop_shipping_status`.
- `AD-012`: declarar `DbOrder.shipping_method`; colunas do carregador nomeadas e existentes no schema (conferir em `supabase/migrations`).
- CSS da folha preto no branco: sem token `estrelinha-admin` (`pickSlip.test.ts` já guarda isso).
- Lint sem `any` novo (baseline do painel 23/5; `@typescript-eslint/no-explicit-any` é `error`).
- Fronteira FSD: `features/pick-slip` pode importar `entities/order`; `entities` não importa `features`. Se `PickSlipOrder` precisar ser conhecido pelo carregador, mova o tipo para onde a fronteira permita (ex.: o carregador em `entities` devolve o tipo e `features/pick-slip` o reexporta), sem import de camada de cima.

### Não faça

- Os dois botões "Folha de separação" da lista de Pedidos (`AdminOrdersPage.tsx`, `OrderBulkBar.tsx`) e o teto de 10 por lote — são da tarefa 02.
- Nenhuma migration, nenhuma mudança de RLS, nenhuma leitura nova em `order_list`.
- Não ler a foto da variação (`product_variants.image_url`).
- Não mexer na loja (`apps/store`) além do que um guarda dela exigir.

### Pronto quando

- [ ] a folha tem foto com moldura, cliente em destaque, data ao lado do número, quantidade em destaque, frete acima do endereço, Recado e Observação, e não tem "Material esperado"
- [ ] `shippingMethodLabel` e a data no fuso da loja existem em `core` e o `BlocoValores.tsx` delega
- [ ] o carregador lê N pedidos com as regras de falha de P3 e devolve na ordem dos ids
- [ ] a página do pedido abre a folha pelo carregador, e `openPickSlips` só imprime depois das fotos
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
