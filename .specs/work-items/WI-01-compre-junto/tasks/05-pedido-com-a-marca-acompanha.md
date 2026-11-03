## 05 · [apps/store, supabase (checkout + migration), apps/backoffice, packages/supabase] O pedido guarda e mostra "acompanha"

**Status:** done

`UC-05 (pedido), CA-04.5, CA-04.6` — WI-01

**Objetivo.** O pedido guarda de qual principal e de qual lista cada peça veio, nunca aceita uma marca forjada, entra na fila de material como hoje, e a confirmação e o painel dizem "acompanha o <principal>".

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy, › Feature-Sliced Design; `apps/store/CLAUDE.md` › Página do produto, › Carrinho, chrome e checkout, › Material afetivo e Gaveta de material, › A home não salta; `apps/backoffice/CLAUDE.md` › O fornecedor da peça, › `/admin/perguntas`, › O editor de Produtos em destaque, › A busca de produto, › O movimento do painel; `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram (e, na tarefa do pedido, › `checkout`). Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (O que muda: `buildOrderItems`/`create-order`, `OrderItemsSummary`, item no painel), §7 — Decisões

**Depende de.** a tarefa 04 deixou pronta a marca no carrinho e nas linhas. Confira que existe.
**Habilita.** 06 (as colunas de `order_items` que o relatório lê).

### Critérios de aceite

**UC-05 · A sacola e o pedido mostram o que foi comprado junto** (nesta tarefa, o pedido)
- CA-05.2 No pedido (confirmação, Minha Conta e painel), o item adicional diz que acompanha o principal [gate Q-09]
- CA-05.4 A marca "acompanha" é informativa: ela não muda preço nem desconto [código: `supabase/functions/checkout/handlers.ts:432-435` — a linha do pedido vem do navegador]

**UC-04 · critérios que o pedido prova**
- CA-04.5 O pedido feito com o conjunto entra na fila de material se qualquer peça exige material [código: `packages/core/src/material/material.ts:251-254`]
- CA-04.6 O valor cobrado no pagamento é igual ao total mostrado na sacola e no checkout [código: `apps/store/src/features/checkout/model/useCheckoutTotals.ts:1-26`]

**UC-06 · o dado que o relatório lê** (a tela é da tarefa 06)
- CA-06.1 Num período escolhido, o relatório mostra quantos pedidos tiveram peças compradas junto, quantas peças adicionais foram vendidas e o valor delas. Uma peça conta como "comprada junto" quando entrou na sacola pelo bloco do Compre Junto e o principal dela está no mesmo pedido. O pedido guarda, no momento da compra, de qual principal e de qual lista a peça veio, e editar a lista depois não muda o relatório. [gate Q-09; conhecimento; PRD Tech Review r1]


### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| marca no carrinho — `CartItem.accompanies?: { mainProductId, listId }[]` (uma **lista**: a mesma linha pode acompanhar mais de um principal; `listId` `null` na peça avulsa), `CartEntry`/`addItems`, `companionsOf` e a frase da sacola (`companionPhrase`) | JÁ EXISTE (tarefa 04). Consuma; não altere | — | — |
| colunas novas de `order_items`: principal (**texto**, porque `order_items.product_id` é `text`) e lista; sem FK que bloqueie apagar lista usada no passado; nulas | VOCÊ CRIA (migration, só local) | marca | colunas |
| `buildOrderItems`: leva a marca ao payload (os itens do bump e do pedido montado seguem sem marca) | VOCÊ ALTERA | itens | payload |
| `supabase/functions/checkout/handlers.ts`: o `insert` de `order_items` por **lista explícita de colunas** (molde `COLUNAS_DO_PEDIDO`) com **todas** as chaves de hoje (`product_id`, `product_name`, `product_image`, `size`, `finish`, `quantity`, `unit_price`, `variant_id`, `price_source`, `variant_label`, `variant_options`, `requires_material`, `material_kinds`, `engraving_text`) mais a marca; descarta a marca cujo principal não está nos itens do pedido; lê a regra de `core/buy-together` | VOCÊ ALTERA | corpo do pedido | linhas do pedido |
| `OrderItemsSummary`, `itemDetailLine`, `OrderSummaryItem`: a frase na confirmação `/pedido/:id`, o nome do principal vindo de outra linha do mesmo pedido por `product_id` | VOCÊ ALTERA | itens | frase |
| item do pedido no painel (`AdminOrderPage.tsx`, `useAdminOrder.ts`) | VOCÊ ALTERA | itens | frase |
| `mercado-pago/handlers.ts`, `create-payment` | JÁ EXISTE. **Não altere**; confirme que o preço continua recalculado de `unit_price`/`variant_id`/`price_source` e que ignora a coluna nova | — | — |

### Decisões já tomadas

- (#13, `marca-acompanha-carrinho-e-order-items`) **D-marca-acompanha** — campo opcional no item do carrinho (`estrelinha-cart` v3→v4 preservando; chave inalterada), frase derivada na renderização; `create-order` grava `order_items` por lista explícita de colunas (molde `COLUNAS_DO_PEDIDO`) e descarta a marca cujo principal não está no pedido; a marca guarda principal e lista (CA-06.1). Preço segue recalculado no servidor
- (#14, `relatorio-de-adesao-rpc-e-regua-ad-055`) **D-relatorio** — RPC admin única (`has_role` ⇒ `42501` primeiro, `security definer`, `search_path=''`), régua do AD-055 por fragmento comparado em teste, período em dias de Brasília no banco; entra em `marcacaoSoPorAcao.test.ts`; rota nova ⇒ `rotasSobGuarda`, `navItems`, `focusRoutes`
- (#16, `estado-de-compra-por-adicional-e-gravacao`) **D-estado-de-compra** — regra pura "o conjunto pode ser levado?" em `entities/product/lib` (ou `core` se o painel validar); `EngravingField` parametrizado por id; `add_to_cart` com vários itens em `core/analytics`. O botão único faz a barra fixa conhecer o conjunto
- (#17, `guardas-que-a-feature-toca`) **D-guardas** — por tarefa: `semMaterialNaPaginaDoProduto` (escopo literal, incluir o widget novo), `marcacaoSoPorAcao` (RPC nova), `animacaoRespeitaMovimento`, `rotasSobGuarda`/`navItems`/`focusRoutes`, `buscaDeProdutoComDonoUnico`, fixtures com `buy_together_ids`, e o guarda de schema novo (uma régua por comando, `mutar()` que lança)

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| colunas de snapshot em `order_items` | `supabase/migrations/20260811120000_22-material-afetivo.sql` (91-104) |
| lista explícita de colunas | `supabase/functions/checkout/handlers.ts` › `COLUNAS_DO_PEDIDO` (202-229, uso em 412-415) e o `insert` de itens (432-435) que hoje espalha `{ ...item, order_id }`; `supabase/migrations/20261103120000_89-pedido-montado.sql` (506) |
| teste do `create-order` | `supabase/functions/checkout/__tests__/createOrder.test.ts` (241, 864) |
| payload dos itens | `apps/store/src/features/checkout/lib/buildOrderPayload.ts` › `buildOrderItems` (63-125) |
| resumo do pedido | `apps/store/src/entities/order/ui/OrderItemsSummary.tsx` (52-82) e `entities/order/lib/itemDetailLine.ts` (4-27) |
| item no painel | `apps/backoffice/src/pages/admin/AdminOrderPage.tsx` (483-550), `entities/order/api/useAdminOrder.ts` (190) |
| guarda de schema | `apps/store/src/shared/lib/__tests__/orderNumberSchema.test.ts` (uma régua por comando, `mutar()` que lança) |

### Testes

- `create-order`: grava a marca (principal e lista) na linha adicional; descarta a marca cujo principal não está nos itens e a forjada; não grava coluna fora da lista; o preço continua o do servidor (nível: unidade da function com dublê, estendendo `createOrder.test.ts`).
- Guarda de fonte: as chaves de `buildOrderItems` batem com as colunas permitidas do `create-order` (nível: guarda que lê disco, âncora dupla e sensor).
- `buildOrderItems`: leva a marca ao payload; item do bump e do pedido montado sem marca (nível: unidade).
- Confirmação `/pedido/:id` e painel: "acompanha o X" e "o X e o Y"; pedido sem Compre Junto igual ao de antes (nível: componente e página real).
- Guarda de schema da migration: colunas nulas, sem FK que bloqueie apagar lista, sem escrita de dado; probe no banco local de que o `order_items` antigo lê igual (nível: guarda e integração local).
- O pedido do conjunto entra na fila de material se qualquer peça exige material (nível: unidade com `initialMaterialStatus`).

### Obrigações

- **Segurança (P0 do PRD)**: a linha do pedido vem do navegador; a marca é informativa (CA-05.4) e **não muda preço nem desconto**. A function descarta a marca cujo principal não está no pedido e **não grava coluna fora da lista**. Escreva um guarda de fonte que **cruze as chaves de `buildOrderItems` com as colunas de `create-order`** (loja e function não importam uma da outra): esquecer uma chave é descarte silencioso.
- A function importa `core/buy-together` por caminho no Deno: relativo com `.ts` explícito; o runtime local de `checkout` pode não subir (`CLAUDE.md` › Estado conhecido) — prove por teste de unidade com dublê e, se o boot local falhar, registre.
- Migration só no local, prefixo apurado na hora, `if not exists`, sem escrita de dado, sem `grant` a `anon`; guarda de schema novo com uma régua por comando.
- Tipos (`DbOrderItem`, `OrderItem`) e `COLUNAS_DOS_ITENS` do app do ateliê (`apps/mobile-adm/src/entities/order/api/usePedido.ts` 78) **não** quebram com coluna nova: confirme por teste de leitura, sem editar o app.
- A folha de separação (`pickSlip.ts`) e o e-mail ficam como estão (CA-05.2 cita só confirmação, Minha Conta e painel; Minha Conta só mostra foto e contagem).
- `semMaterialNaPaginaDoProduto` e a fila de material: o pedido entra na fila se qualquer peça exige material, sem regra nova (`initialMaterialStatus`).
- Medição: store, backoffice, core e functions, um por vez; documente em `supabase/CLAUDE.md` › `checkout` e `apps/store/CLAUDE.md` › Carrinho.

### Não faça

- A tela e a RPC do relatório (tarefa 06).
- Desconto e qualquer leitura da marca para decidir preço (WI 92).
- Mexer em `mercado-pago`, `create-payment` ou `packages/core/src/payment/**`.
- Folha de separação, e-mail e app do ateliê.
- Validação de estoque no servidor (fora do PRD).

### Pronto quando

- [ ] o pedido feito com o conjunto grava a marca (principal e lista) em cada linha adicional, e o preço continua o do servidor
- [ ] a marca forjada, ou cujo principal não está no pedido, é descartada; coluna fora da lista não é gravada (teste de unidade da function)
- [ ] a confirmação `/pedido/:id` e o painel dizem "acompanha o <principal>" (inclusive "o X e o Y"); o pedido de quem não usou o Compre Junto fica igual
- [ ] o pedido do conjunto entra na fila de material se qualquer peça exige material
- [ ] probe no banco local: as colunas novas existem, nulas por padrão, e o `order_items` antigo lê igual
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório tocado (tipos do workspace e a suíte do workspace com `--testTimeout=20000` sem o `--`; e a suíte da loja quando o painel mudou), sem comandos copiados aqui: estão em `CLAUDE.md` › Comandos e › Baselines e em `.specs/project/PROJECT.md` › Comandos de verificação


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
