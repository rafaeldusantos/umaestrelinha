## 03 · [apps/store, packages/core] Página do produto: o bloco Compre Junto

**Status:** done

`UC-03, UC-07` — WI-01

**Objetivo.** A cliente vê, na coluna de informação, os adicionais disponíveis, marca os que quer, escolhe peça, variação e gravação, e vê o total do conjunto e o preço no PIX, com o bloco sumindo sem quebrar a página quando não há o que oferecer.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy, › Feature-Sliced Design; `apps/store/CLAUDE.md` › Página do produto, › Carrinho, chrome e checkout, › Material afetivo e Gaveta de material, › A home não salta; `packages/core/CLAUDE.md` › Quando um código pertence ao pacote, › Pureza, › Os módulos. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Loja), §4 — Código, §7 — Decisões

**Depende de.** a tarefa 01 deixou pronto o schema, os tipos e `core/buy-together` com barrel. Confira que existem.
**Habilita.** 04 (estado do conjunto e posição do bloco), 07 (a pasta do bloco para trocar a forma).

### Critérios de aceite

**UC-03 · A cliente vê e monta o conjunto na página do produto**
Na coluna de informação, entre a escolha da variação do principal e o botão de compra, a cliente vê os adicionais com foto, o nome da lista ou do produto, e o preço. Ela marca os que quer e, num adicional do tipo lista, escolhe qual peça. Em peça com variações, escolhe a variação. O total do conjunto acompanha cada escolha.
- CA-03.1 O bloco só aparece quando o produto tem ao menos um adicional disponível para a variação escolhida do principal [conhecimento; PRD Tech Review r1]
- CA-03.2 Nenhum adicional vem marcado ao abrir a página [gate P-03]
- CA-03.3 O conjunto usa a variação do principal já escolhida na página; o bloco não repete o seletor do principal [gate P-07; código: `useProductPurchase.tsx:55-62`]
- CA-03.4 O total mostra o preço do principal (da variação escolhida) somado ao dos adicionais marcados, cada um pelo preço da variação escolhida, nunca pelo "a partir de". O total do conjunto conta o principal na quantidade escolhida e cada adicional marcado uma vez. [código: `apps/store/src/entities/product/model/useProductPurchase.tsx:90-92`; PRD Tech Review r1]
- CA-03.5 Ao lado do total, o preço do conjunto no PIX, pela mesma regra de desconto PIX da página [gate Q-12; código: `@estrelinha/core/payment/pix`]
- CA-03.6 Um adicional com variações não pode ser incluído sem a variação escolhida; o bloco diz qual escolha falta [código: `apps/store/src/widgets/cart-drawer/ui/CrossSell.tsx:18-24`]
- CA-03.7 Num adicional do tipo lista, as peças aparecem na ordem da dona e a cliente escolhe exatamente uma. Na página de um produto, uma lista nunca oferece o próprio produto principal, nem uma peça que já aparece em outro adicional desse produto. Essas peças são puladas só ali; a lista continua igual nos outros produtos. [pedido; gate P-08; PRD Tech Review r1]
- CA-03.8 Variação esgotada não pode ser escolhida; peça sem nenhuma variação vendável não aparece na lista [código: `useProductPurchase.tsx:101-105`]
- CA-03.10 Adicional com gravação pede o texto dentro do bloco, com o mesmo campo e o mesmo limite da página; adicional que exige material entra normalmente, e o material segue o pós-compra de hoje [gate Q-11]
- CA-03.11 Em 390px o bloco não cria rolagem horizontal da página, e cada controle tem alvo de toque de pelo menos 44px [código: `CLAUDE.md:306-321`; `apps/store/CLAUDE.md:43-50`]
- CA-03.12 Os textos do bloco não usam urgência, contagem, escassez nem prova social [código: `CLAUDE.md:8`, `CLAUDE.md:365`]
- CA-03.13 Se o adicional exige material da cliente, o bloco não diz qual material [código: `semMaterialNaPaginaDoProduto.test.ts`, `apps/store/CLAUDE.md:848-866`]
- CA-03.14 O bloco abre com o título "Compre junto" e a frase "Peças que eu escolhi para acompanhar esta joia. Marque as que quiser levar." Com adicional marcado, o rodapé diz: "O botão de compra leva a joia e as peças marcadas. Cada uma entra na sacola como uma linha própria, e você pode tirar qualquer uma depois." [gate principal 2026-11-02 · texto-do-bloco]
- CA-03.15 Em celular não há seletor de quantidade do principal; o total do conjunto usa a quantidade do principal que a página mostra, e a cliente ajusta a quantidade na sacola. [gate principal 2026-11-02 · quantidade-do-principal-no-celular]

**UC-07 · O bloco se adapta à indisponibilidade**
**Critérios de aceite**
- CA-07.1 Adicional cuja peça saiu do ar ou esgotou some do bloco; os outros continuam. Numa lista, só a peça indisponível some [conhecimento]
- CA-07.2 Se nenhum adicional estiver disponível, o bloco inteiro some e a página fica como hoje [conhecimento]
- CA-07.3 Se a leitura dos adicionais falhar, o bloco não aparece e o resto da página continua de pé [código: `apps/store/CLAUDE.md:635-638`, DST-17]

**UC-08 · Medição** (nesta tarefa, só a exibição e a escolha; o `add_to_cart` é da tarefa 04)
- CA-08.1 Ver o bloco gera uma exibição de lista própria e escolher um adicional gera seleção de item, com um identificador de lista do Compre Junto [código: `packages/core/src/analytics/events.ts:76-99`]


**Requisitos não-funcionais desta tarefa**
- RNF-01 Mobile primeiro: prova em 390×844 antes de 1440, sem rolagem horizontal do body [código: `CLAUDE.md:306-321`]
- RNF-02 Os produtos dos adicionais chegam numa consulta só e não atrasam a primeira pintura da página; enquanto carregam, o espaço do bloco fica reservado (sem salto) [código: `apps/store/CLAUDE.md` › "A home não salta" (feature 40); conhecimento]
- RNF-05 Movimento do bloco respeita `prefers-reduced-motion` [código: `apps/backoffice/CLAUDE.md` › "O movimento do painel"; conhecimento]
- RNF-06 Acessível por teclado e leitor de tela: cada adicional é um controle marcável com nome que inclui a peça e a variação [conhecimento]

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
| tabelas, tipos, `core/buy-together` (tetos, recusas, barrel `index.ts`) | JÁ EXISTE (tarefa 01). Consuma; não altere os arquivos dela, só **acrescente** arquivos e exports | — | — |
| `core/buy-together`: disponibilidade (produto inativo/apagado, variação esgotada, peça sem variação vendável, variações liberadas que sumiram, principal e peça repetida pulados, adicional que some para a variação do principal), total do conjunto, nome acessível/resumo | VOCÊ CRIA (arquivos novos + export no barrel) | produtos e configuração | adicionais disponíveis, total |
| leitura da configuração dos adicionais do produto e dos produtos/variações (embed com FK nomeada **ou** hook à parte, ver decisão 15) | VOCÊ CRIA | id do produto | adicionais, produtos |
| estado de conjunto na página (marcações, peça escolhida, variação, gravação por adicional, `canTake`, recusas, total, PIX) — um hook em `entities/product/model` que a tarefa 04 consome para adicionar à sacola | VOCÊ CRIA | — | estado do conjunto |
| componente do bloco (forma "Na linha"), esqueleto reservado, `EngravingField` por id | VOCÊ CRIA / ALTERA `EngravingField` (id parametrizado) | — | — |
| `ProductPage.tsx`, `ProductInfo.tsx` (encaixe do bloco), `useProductPurchase.tsx` (não altere o `add`), `cartStore`, `ProductBuyBar` | JÁ EXISTE. Encaixe só o bloco em `ProductInfo`/`ProductPage`; não altere `add`, carrinho nem a barra (tarefa 04) | — | — |

### Decisões já tomadas

- (#1, `forma-do-bloco` — como o bloco abre as escolhas) escolha "A — abre na linha, sem a faixa de fórmula"; ressalva verbatim: "Adicionar no menu Compre Junto a opção do usuário admin configurar como ele quer que aparece na Loja. Adicione esses 3 modos". Aplicação: A é o padrão; as três formas são construídas; a dona escolhe no menu Compre Junto (UC-09). A ressalva estende a escolha; não a nega. **Premissa:** uma configuração só, para a loja inteira (a ressalva não fala de por produto)
- (#2, `texto-do-bloco`) "Ratificar os três textos do protótipo como estão" → CA-03.14
- (#15, `leitura-da-configuracao-na-pagina`) **D-leitura-na-pagina** — configuração embutida no select do produto com FK nomeada (evita `PGRST201`); produtos dos adicionais e das listas por `useProductsByIds`; esqueleto só quando há adicionais; erro ⇒ página de pé. O code lookup avisa que o embed entra no `PRODUCT_SELECT` (`mapProduct.ts:50-51`), compartilhado por `useProduct.ts:20,37`, `useProducts.ts:194` e `useRecoverCart`; a tarefa decide entre o embed e um hook à parte (molde `useProductFaqs`) pelo teste que mostrar menos risco, mantendo o esqueleto sem salto
- (#16, `estado-de-compra-por-adicional-e-gravacao`) **D-estado-de-compra** — regra pura "o conjunto pode ser levado?" em `entities/product/lib` (ou `core` se o painel validar); `EngravingField` parametrizado por id; `add_to_cart` com vários itens em `core/analytics`. O botão único faz a barra fixa conhecer o conjunto
- (#17, `guardas-que-a-feature-toca`) **D-guardas** — por tarefa: `semMaterialNaPaginaDoProduto` (escopo literal, incluir o widget novo), `marcacaoSoPorAcao` (RPC nova), `animacaoRespeitaMovimento`, `rotasSobGuarda`/`navItems`/`focusRoutes`, `buscaDeProdutoComDonoUnico`, fixtures com `buy_together_ids`, e o guarda de schema novo (uma régua por comando, `mutar()` que lança)
- (#20, `evento-ga4-com-varios-itens`) **D-ga4** — `addToCartEvent` aceita lista de itens (ou função irmã) em `core/analytics`, com teste de "principal uma vez"; `item_list_id` nos adicionais

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| estado de compra por produto, `canAdd`, recusa de gravação | `apps/store/src/entities/product/model/useProductPurchase.tsx` (67-178; gravação 84-99, `canAdd` 102-105) |
| recusa de grade sem variação | `apps/store/src/widgets/cart-drawer/ui/CrossSell.tsx` (18-24, 78-100) |
| seletor de variações da página | `entities/product/ui/VariantPicker.tsx` (`surface="page"`) e `entities/product/lib/variantSelection.ts` (`canAddSelection`, `findVariant`, `initialSelection`, `hasSellableGrid`) |
| campo de gravação | `entities/product/ui/EngravingField.tsx` (8, 21-79; `ENGRAVING_FIELD_ID` é lido por `widgets/product-buy-bar/ui/ProductBuyBar.tsx` 9 e 91: mantenha o id do principal) |
| busca de vários produtos por id | `entities/product/api/useProductsByIds.ts` (24-51), `PRODUCT_CARD_SELECT` em `entities/product/lib/mapProduct.ts` (106-143; o comentário do `PGRST201` em 44-51) |
| leitura à parte passada por prop | `pages/ProductPage.tsx` › `useProductFaqs` (206) e `entities/product/api/useProductFaqs.ts` (26) |
| esqueleto sem salto | `apps/store/CLAUDE.md` › A home não salta; `widgets/home-renderer` esqueleto |
| PIX do conjunto | `packages/core/src/payment/pix.ts` › `pixPrice` (31-35) e `payment/__tests__/displayedEqualsCharged.test.ts` |
| módulo `core` | `packages/core/src/home/featured.ts`; pureza/Deno: `packages/core/src/checkout/__tests__/denoReach.test.ts` e `packages/core/src/proposals/__tests__/purity.test.ts` — o molde de pureza e de alcance do Deno (especificador relativo com `.ts` explícito, `import type` incluso) |

### Testes

- Unidade em `core/buy-together`: disponibilidade (produto inativo ou apagado, variação esgotada, peça sem variação vendável, variações liberadas que sumiram nunca viram "todas", numa lista só a peça indisponível some); principal e peça repetida pulados só naquele produto; adicional que some para a variação do principal; total = principal × quantidade + adicionais × 1; PIX = `pixPrice` do total, nunca a soma dos PIX (nível: unidade).
- Página real do produto: nada marcado ao abrir; marcar abre as escolhas; total e PIX acompanham; variação faltando diz qual escolha falta; esgotado não é escolhível; gravação do adicional com o limite da peça; principal esgotado esconde o bloco; combinação indisponível mantém o bloco; leitura que falha deixa a página de pé; nenhum adicional disponível esconde o bloco (nível: página real, não a árvore montada no teste).
- Esqueleto só quando há adicionais, com a altura reservada (nível: componente; a medida em navegador).
- GA4 do bloco: ver o bloco gera `view_item_list` própria e escolher um adicional gera `select_item` com o identificador de lista do Compre Junto, uma vez por exibição/escolha (nível: página real, com os helpers existentes).
- O bloco nunca diz qual material e não usa urgência, contagem ou prova social (nível: guardas `semMaterialNaPaginaDoProduto` e de tom, com escopo estendido).
- Em 390 sem rolagem horizontal, alvos ≥ 44 px, nomes longos a 130 % e 200 % de fonte (nível: prova em navegador; jsdom devolve 0).

### Obrigações

- O bloco mora em `entities/product/ui` (ou entra na `ProductInfo` por prop/slot): **nunca** importe widget por baixo (as duas violações FSD de `ProductInfo` já existem em `warn`; não crie a terceira).
- Preço do conjunto = `pixPrice(total)`; **não** some os PIX de cada peça (RNF-04). Zero linha em `packages/core/src/payment/**`; `shoppingParity.test.ts` sem uma linha; feed e JSON-LD intocados (RNF-03).
- `semMaterialNaPaginaDoProduto.test.ts` tem escopo literal: inclua os arquivos novos do bloco; o bloco **nunca** diz qual material (CA-03.13).
- Tom memorial: sem urgência, contagem, escassez, prova social nem emoji (`copyInstitucional.test.tsx`).
- Mobile primeiro: `grid-cols-[minmax(0,1fr)]` no celular, `TAP_44`/`TAP_ROW` (`alvoDeToqueNaoRoubaPosicao.test.ts`: o `relative` do auxiliar apaga o `absolute` — use as duas formas com cuidado), par `motion-reduce:`; **prova em navegador a 390×844, 130 % e 200 % de fonte** com o banco local (dev server + Playwright; bloqueie `*.supabase.co`; confira o bundle servido antes de medir) — jsdom devolve 0 para layout.
- O principal em `ProductBuyBar.test.tsx` (3 arquivos de teste) não pode quebrar.
- `strictNullChecks: false`: recusas `string | null`.
- Tire `buy_together_ids` do fixture `apps/store/src/entities/product/lib/__tests__/cardSelect.test.ts` (57): a coluna sai do painel na tarefa 02 e esse fixture é da loja, que é sua nesta onda.
- Documente em `apps/store/CLAUDE.md` › Página do produto o bloco, o hook e o que ele lê.

### Não faça

- Adicionar à sacola, botão único, barra fixa, `addItems`, carrinho v4 (tarefa 04).
- O `add_to_cart` do botão (tarefa 04); aqui só `view_item_list` e `select_item`, com `viewItemListEvent`, `selectItemEvent` e `useTrackList`, que já existem — **não altere `core/analytics`**.
- As formas "Em folha" e "Com fórmula" e a leitura do setting (tarefa 07): aqui a forma é só "Na linha".
- Frase "acompanha" (04 e 05).
- Desconto, combinar o acabamento, compre junto no card, na gaveta e no checkout.
- Qualquer escrita nas tabelas do Compre Junto.

### Pronto quando

- [ ] página real do produto com adicionais: nada marcado ao abrir; marcar mostra o painel de escolhas; o total e o PIX do conjunto acompanham cada escolha
- [ ] adicional com grade sem variação diz qual escolha falta; esgotado não é escolhível; peça sem variação vendável não aparece
- [ ] principal esgotado: bloco ausente; combinação indisponível: bloco visível
- [ ] ver o bloco gera `view_item_list` própria e escolher um adicional gera `select_item`, uma vez cada, sem duplicar
- [ ] leitura falha: página de pé sem bloco; nenhum adicional disponível: bloco ausente
- [ ] prova em navegador a 390×844 sem rolagem horizontal, alvos ≥ 44 px, nomes longos a 200 % de fonte, e o espaço do bloco reservado sem salto
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
