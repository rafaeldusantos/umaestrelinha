## 04 · [apps/store, packages/core] Levar o conjunto: botão único, barra fixa, sacola e GA4

**Status:** done

`UC-04, UC-05 (sacola), UC-08` — WI-01

**Objetivo.** Um toque no botão da página — a barra fixa no celular, o da coluna no computador — leva o principal e os adicionais marcados à sacola, cada um como linha própria, e a sacola diz "acompanha o <principal>".

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy, › Feature-Sliced Design; `apps/store/CLAUDE.md` › Página do produto, › Carrinho, chrome e checkout, › Material afetivo e Gaveta de material, › A home não salta; `packages/core/CLAUDE.md` › Quando um código pertence ao pacote, › Pureza, › Os módulos. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Loja), §4 — Código, §7 — Decisões

**Depende de.** a tarefa 03 deixou o bloco e o estado do conjunto prontos. Confira que existem.
**Habilita.** 05 (a marca no carrinho e no payload).

### Critérios de aceite

**UC-04 · A cliente leva o conjunto à sacola**
Com adicionais marcados, o botão de compra da página — a barra fixa no celular, o da coluna de informação no computador — diz "Levar o conjunto" e adiciona o principal e os adicionais marcados; a gaveta da sacola abre mostrando as linhas.
- CA-04.1 Cada peça entra como linha própria, com a sua variação e a sua gravação, e cada adicional entra com quantidade 1, qualquer que seja a quantidade do principal; a cliente ajusta na sacola. Uma peça levada pelo conjunto que já estiver na sacola, na mesma variação e gravação, soma à linha existente, e essa linha passa a dizer que acompanha o principal. Se acompanhar mais de um principal, a linha diz "acompanha o Pingente X e o Pingente Y". [código: `apps/store/src/entities/cart/model/cartStore.ts:104-134`; gate Q-08; PRD Tech Review r1]
- CA-04.2 A sacola abre depois de adicionar, como já acontece com o botão da página [código: `useProductPurchase.tsx:152-156`]
- CA-04.3 Se a gravação do principal ou de um adicional for recusada (limite de caracteres), nada é adicionado e a recusa é mostrada junto do campo [código: `useProductPurchase.tsx:116-122`]
- CA-04.4 Uma linha do conjunto removida da sacola não remove as outras [conhecimento]
- CA-04.7 A sacola de quem já tinha peças antes desta mudança continua intacta [código: `cartStore.ts:169-190` (`version` + `migrate`); `CLAUDE.md` › chaves de `localStorage`]
- CA-04.8 Enquanto o principal não pode ser comprado (combinação indisponível), o bloco continua visível, mas o botão do conjunto fica bloqueado com o mesmo aviso da página. Se o produto inteiro estiver esgotado, o bloco não aparece. O bloco nunca leva adicionais sem o principal. [PRD Tech Review r1]
- CA-04.9 Na barra fixa do celular, com adicionais marcados, a barra mostra o total do conjunto e a linha "Conjunto · N peças" (N = o principal mais os adicionais marcados), sem o preço no PIX; sem adicional marcado, mostra o preço do principal e "X no PIX", como hoje. O preço no PIX do conjunto aparece só no bloco. [gate principal 2026-11-02 · barra-fixa-com-conjunto]

**UC-05 · A sacola e o pedido mostram o que foi comprado junto** (nesta tarefa, só a sacola; o pedido é da tarefa 05)
- CA-05.1 Na sacola, a linha do adicional diz "acompanha o <nome do principal>", com o nome completo do produto principal, que quebra de linha quando preciso; o Compre Junto não cria campo de nome curto [gate Q-09; gate principal 2026-11-02 · nome-do-principal-na-frase]
- CA-05.3 Removido o principal da sacola, os adicionais continuam na sacola como peças comuns, sem a frase "acompanha" [conhecimento]

**UC-08 · Medição** (nesta tarefa, só a adição ao carrinho; a exibição e a escolha do bloco são da tarefa 03)
- CA-08.2 Adicionar o conjunto conta cada peça com a quantidade certa, sem contar o principal duas vezes [código: `useProductPurchase.tsx:144-150`]


**Requisitos não-funcionais desta tarefa**
- RNF-03 O preço anunciado ao Google (feed e JSON-LD) não muda por causa do Compre Junto [código: `packages/core/CLAUDE.md:119-121`]
- RNF-04 Exibido = cobrado: o total do bloco é a soma dos preços que cada peça terá na sacola, e o preço no PIX segue a mesma conta de exibição da página. Os descontos do pedido (promoção, cupom, frete) só aparecem na sacola e no checkout, e o valor cobrado é o total mostrado ali. [código: `packages/core/src/payment/pix.ts`; PRD Tech Review r1]

### Design — o que a tela faz

### Loja — Página do produto com o bloco Compre Junto (UC-03, UC-04, UC-07)

- **Função:** a cliente monta o conjunto (principal mais até três adicionais) na coluna de informação e o leva por um botão único.
- **Esqueleto da coluna de informação, em ordem:** categoria e nome; preço da variação do principal; linhas do PIX e das parcelas; seletores de variação do principal; campo de gravação do principal (com "Com gravação = Sim"); **bloco Compre Junto**; linha de estoque; botão de compra (a partir de 1024 px, ao lado do seletor de quantidade); aviso de erro do botão; nota "A joia e N peças marcadas · total" (só no computador e só com conjunto); linha "Como enviar seu material de DNA" e o acordeão.
- **Bloco:** cabeçalho "Compre junto" e a frase de abertura (CA-03.14); uma linha por adicional (caixa de marcar, foto, nome — da lista ou do produto, sem título próprio —, resumo da escolha com partes separadas por "·", preço, link de abrir quando há escolha); painel de escolhas quando a linha está marcada ou aberta; rodapé de total, só com ao menos um adicional marcado.
- **Dados:** nome do adicional; foto (no tipo lista, da peça selecionada); preço da variação escolhida (nunca "a partir de"); resumo ("Levar junto: <nome>, <resumo>" é o nome acessível da caixa); rótulo "Escolha a corrente · N modelos" e link "Ver os N modelos"; opção esgotada desabilitada, peça sem combinação vendável omitida; total = principal × quantidade + adicionais marcados (1 cada); PIX = total × (1 − percentual do PIX), ao lado do total; contador do campo de gravação "n / limite" contando o texto aparado.
- **Campos:** caixa de marcar do adicional (checkbox, não); escolha da peça (grupo de rádio com cartões, obrigatória se marcado; a primeira já vem em foco, desmarcada); variação (obrigatória se a peça tem eixo; eixo com uma única opção vendável já nasce escolhido); gravação do adicional (opcional, limite por peça; excedeu: "Cabem até N caracteres nesta peça. Tire X para continuar."; dentro: "Opcional. Deixe em branco se preferir a peça sem gravação."); mensagens de falta: "Escolha a corrente." e "Escolha o <eixo> da <primeira palavra do nome da peça>."
- **Ações:** caixa "Levar junto: <nome>…" marca/desmarca; "Ver os N modelos" / "Ver opções" / "Esconder opções" expande sem marcar; cartão de peça troca a peça; botão único "Adicionar à sacola" / "Levar o conjunto" / "Esgotado" (valida; se faltar escolha, foca e rola até o primeiro adicional incompleto e não adiciona; se completo, adiciona principal e cada adicional como linhas próprias, adicional com quantidade 1, e abre a gaveta); desabilitado com principal esgotado, combinação indisponível ou gravação do principal acima do limite.
- **Estados:** nada marcado ao abrir (total oculto, botão "Adicionar à sacola"); carregando (`aria-busy`, altura mínima reservada de 320 px, esqueleto de título, linha e três cartões); leitura falhou (bloco some); nenhum disponível (bloco some); peça fora do ar (some só ela); peça sem combinação vendável (omitida); peça igual ao principal ou repetida em outro adicional (pulada); variação do principal "Chaveiro" (o adicional com `someCom` some e perde a marca; os outros mantêm a escolha); principal com combinação indisponível ("Essa combinação está indisponível no momento.", botão bloqueado, bloco visível); principal esgotado (bloco não renderiza, botão "Esgotado"); gravação do principal acima do limite ("A gravação passou do limite. Ajuste o texto para continuar."); tentativa com escolha faltando ("Falta uma escolha em 1 peça. Ela está marcada acima." / "… em N peças.").
- **Barra fixa do celular:** sem conjunto, preço do principal e "X no PIX"; com conjunto, total e "Conjunto · N peças" (CA-04.9); mesmo botão único, mesmo rótulo e mesma condição de bloqueio.
- **Gaveta da sacola:** cabeçalho "Sacola · N peça(s)"; cada linha com foto, nome, preço × quantidade, "Acompanha o <nomes>" (vários nomes juntados por vírgulas e "e") enquanto o principal estiver na sacola, chips das opções, `Gravação: “X”`, quantidade e "Remover"; rodapé com subtotal, "ou X no PIX · frete calculado no checkout", "Finalizar compra", "Continuar comprando"; vazia: "Sua sacola está vazia". A frase é recalculada na renderização: removido o principal, some das linhas adicionais; remover uma linha não remove as outras; a mesma peça (id, opções, gravação) soma a quantidade e acumula os principais.
- **Formas do bloco (UC-09):** A "Abre na linha" (marcar abre as escolhas); B "Folha" (celular) / diálogo (computador): cabeçalho com o nome do adicional, mesmo painel de escolhas, rodapé com a frase do que falta e "Incluir no conjunto" (desabilitado enquanto faltar escolha), foco inicial no título, Esc e clique fora fecham; C "Fórmula": faixa decorativa (`aria-hidden`) "Esta joia + <adicional> + …" acima da lista, cada adicional alternável nela.
- **Não mostra:** confirmação do pedido, Minha Conta e painel (CA-05.2); adicional que exige material; recusa de gravação vinda do servidor; GA4; rolagem horizontal, alvos de 44 px e fonte a 200 %; `prefers-reduced-motion`.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| estado do conjunto (marcações, escolhas, recusas, total) e o bloco | JÁ EXISTE (tarefa 03). Consuma; não altere a pasta do bloco | — | — |
| `cartStore`: `version: 4` com `migrate` preservando; campo opcional da marca (principal e lista), **fora** do `itemKey`; `addItems` (várias linhas num gesto, soma à existente) | VOCÊ ALTERA | itens | linhas |
| `useProductPurchase.add` (laço só no principal; adicionais quantidade 1; recusa de gravação de qualquer peça aborta tudo) | VOCÊ ALTERA | conjunto | sacola, gaveta abre |
| botão único em `ProductInfo` (rótulo "Adicionar à sacola"/"Levar o conjunto") e `ProductBuyBar` (conhece o conjunto; total e "Conjunto · N peças"; foco no campo/adicional que falha) | VOCÊ ALTERA | conjunto | — |
| `CartDrawerRow`: frase derivada "acompanha o X e o Y" na renderização | VOCÊ ALTERA | carrinho | frase |
| `core/analytics`: `add_to_cart` com vários itens e `item_list_id` nos adicionais (`view_item_list` e `select_item` do bloco já emitidos pela tarefa 03, com os helpers que existem) | VOCÊ ALTERA | itens | evento |
| `buildOrderPayload`, `create-order`, `OrderItemsSummary`, painel | NÃO TOQUE (tarefa 05) | — | — |

### Decisões já tomadas

- (#4, `barra-fixa-com-conjunto`) "Como no protótipo: total + "Conjunto · N peças", PIX só no bloco" → CA-04.9
- (#5, `quantidade-do-principal-no-celular`) "Manter como o protótipo e como a página de hoje: sem seletor no celular, ajusta-se na sacola" → CA-03.15
- (#13, `marca-acompanha-carrinho-e-order-items`) **D-marca-acompanha** — campo opcional no item do carrinho (`estrelinha-cart` v3→v4 preservando; chave inalterada), frase derivada na renderização; `create-order` grava `order_items` por lista explícita de colunas (molde `COLUNAS_DO_PEDIDO`) e descarta a marca cujo principal não está no pedido; a marca guarda principal e lista (CA-06.1). Preço segue recalculado no servidor
- (#16, `estado-de-compra-por-adicional-e-gravacao`) **D-estado-de-compra** — regra pura "o conjunto pode ser levado?" em `entities/product/lib` (ou `core` se o painel validar); `EngravingField` parametrizado por id; `add_to_cart` com vários itens em `core/analytics`. O botão único faz a barra fixa conhecer o conjunto
- (#20, `evento-ga4-com-varios-itens`) **D-ga4** — `addToCartEvent` aceita lista de itens (ou função irmã) em `core/analytics`, com teste de "principal uma vez"; `item_list_id` nos adicionais

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| versão do carrinho e `migrate` que preserva | `apps/store/src/entities/cart/model/cartStore.ts` › `version`/`migrate` (169-190, o v2→v3 em 181-188); teste `cartStore.test.ts` (169-196); fixture `pages/__tests__/ProposalCheckoutPage.test.tsx` (120, `version: 3` literal) |
| `addItem` e identidade da linha | `cartStore.ts` › `itemKey` (85-98) e `addItem` (104-134) |
| linha da sacola com texto derivado | `apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx` (34-115; a frase da gravação em 105-115) |
| `add()` com evento e gaveta | `apps/store/src/entities/product/model/useProductPurchase.tsx` (116-157; evento 144-150) |
| barra fixa e foco no campo | `apps/store/src/widgets/product-buy-bar/ui/ProductBuyBar.tsx` (67-96, `aoTocar` 89; preço da faixa 127-145) e `ProductInfo.tsx` (CTA 185-239, 214-222) |
| evento GA4 e lista | `packages/core/src/analytics/events.ts` (73-112, `addToCartEvent`), `items.ts`; `apps/store/src/shared/lib/analytics/useTrackList.ts` (19-46) e `widgets/related-products/ui/RelatedProducts.tsx` (9, 29) |

### Testes

- Página real do produto: sem marcação o botão diz "Adicionar à sacola" e leva só o principal; com marcação diz "Levar o conjunto" e leva todos, cada um como linha própria com variação e gravação e quantidade 1; barra fixa e CTA levam o mesmo (nível: página real).
- Gravação do principal ou de um adicional recusada: nada entra e a recusa aparece junto do campo; principal indisponível bloqueia o botão com o aviso da página (nível: página real).
- Carrinho: `migrate` v3→v4 preserva a sacola; peça já na sacola soma à linha e vira "acompanha o X e o Y"; remover o principal tira a frase; remover um adicional não remove os outros (nível: unidade do store e da linha da sacola).
- GA4: `add_to_cart` com todos os itens e o principal uma vez; `item_list_id` nos adicionais; a tarefa não emite `view_item_list` nem `select_item` (nível: unidade de `core/analytics` e página real).
- Barra fixa: total do conjunto e "Conjunto · N peças" com marcação; preço e "X no PIX" sem (nível: componente `ProductBuyBar`).
- No celular a barra leva o que o bloco marcou; sem rolagem horizontal; a barra não briga com a barra do sistema (nível: prova em navegador).

### Obrigações

- **A marca não entra no `itemKey`** (CA-04.1: a peça avulsa e a do conjunto somam numa linha) e **não decide preço**: o servidor recalcula (tarefa 05 e `mercado-pago`). O nome do principal na frase vem do carrinho, derivado na renderização; removido o principal, a frase some.
- `estrelinha-cart` **mantém a chave**; só a `version` sobe, com `migrate` que preserva a sacola de quem já visitou (`CLAUDE.md` › Convenções, chaves de `localStorage`).
- GA4: só o `add_to_cart` é seu (o do bloco é da 03): `add_to_cart` com todos os itens **uma vez**, principal sem duplicar (`useProductPurchase.tsx:144-150` hoje conta por unidade); `core/analytics/__tests__/denoReach.test.ts`, `events.test.ts` e `items.test.ts` entram no gate (`purchase.ts` é lido pelo Deno).
- `ProductBuyBar.test.tsx`, `…Material.test.tsx` e `…Reveal.test.tsx` não podem quebrar; só a `ProductBuyBar` e a `ProductInfo` mostram o rótulo do botão.
- Zero linha em `packages/core/src/payment/**` e no feed; o valor cobrado é o da sacola (CA-04.6 é da tarefa 05).
- **Prova em navegador a 390×844, 130 % e 200 % de fonte**: marcar a corrente, tocar a barra fixa, e a sacola recebe o que o botão prometeu; sem rolagem horizontal; a barra fixa não briga com a barra do sistema.
- Documente em `apps/store/CLAUDE.md` › Carrinho (v4, marca) e › Página do produto (botão único).

### Não faça

- Gravar a marca no pedido, `create-order`, confirmação, painel (tarefa 05).
- As formas "Em folha" e "Com fórmula" (tarefa 07).
- Seletor de quantidade no celular (CA-03.15: não há).
- Desconto, combinar o acabamento; compre junto na gaveta e no checkout.
- `view_item_list` do bloco e `select_item` da escolha: são da tarefa 03 (já nascem na pasta do bloco).
- Alterar o `itemKey` ou a chave `estrelinha-cart`.

### Pronto quando

- [ ] sem adicional marcado o botão diz "Adicionar à sacola" e leva só o principal; com marcação diz "Levar o conjunto" e leva todos, cada um como linha com a sua variação e gravação, quantidade 1
- [ ] tocar a barra fixa e o CTA do computador levam o mesmo
- [ ] gravação recusada de qualquer peça: nada entra e a recusa aparece junto do campo; principal indisponível bloqueia o botão com o aviso da página
- [ ] sacola v3 abre intacta depois do `migrate`; peça já na sacola soma e passa a dizer "acompanha o X e o Y"; remover o principal tira a frase; remover um adicional não remove os outros
- [ ] `add_to_cart` com todos os itens e o principal uma vez, sem duplicar
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
