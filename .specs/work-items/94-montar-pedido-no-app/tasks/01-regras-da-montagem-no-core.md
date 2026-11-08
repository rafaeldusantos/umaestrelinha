## 01 · [packages/core · apps/backoffice · supabase] Regras compartilhadas da montagem em `core` (agregado, sem tela)

**Status:** done

`UC-06, UC-09 (base)` — 94

**Objetivo.** A busca de produto, a capa, o mapeamento da peça, a regra "qual foto vai na linha" e a frase de link sem loja passam a morar em `core`, alcançáveis pelo app e pelo Deno, com o painel reexportando sem mudar de comportamento; o boot local de `order-proposals`, `mercado-pago` e `checkout` fica conferido.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `apps/backoffice/CLAUDE.md` › A busca de produto: um dono para as cinco telas (feature 51, AD-036), › Montar pedido para a cliente (feature 89, AD-070); `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Os módulos, › Dinheiro, › customers, › proposals, › Convenções de tipo; `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram, › Edge functions, › order-proposals e o pedido que nasce de uma proposta, › Secrets. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código; §7 · spec.md — Decisões (D-03, D-05, D-07, D-24). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Habilita.** 02 (a regra da foto no `precificar`), 04 (`LINK_WITHOUT_STORE`), 07 (busca, capa e mapeamento da peça no app).

### Critérios de aceite

Do `prd.md`, a parte que esta tarefa sustenta (as telas são de outras tarefas):

### Passo 2 · Peças
- Busca do dono único (`AD-036`). Cada linha: a **foto de capa** (retrato 4:5) e "a partir de R$ … · N
  em estoque · pede material".
- Folha da variação: **foto grande da variação escolhida**, que troca a cada toque (imagem por
  variação, feature `81`; sem foto própria, usa a capa); chips com **miniatura** e estoque (esgotada
  desligada), promoção vigente, quantidade (acima do estoque → "Só há 3 em estoque." e botão
  desligado), gravação só se a peça aceita (mesmo teto), aviso de material, botão "Acrescentar · R$
  378,00". Editar reabre a mesma folha com "Salvar".
- Na sacola, cada linha mostra a foto da variação escolhida — a mesma que a cliente verá no link.
- Peça sem foto cadastrada: o quadro fica no fundo areia com a estrela da marca, como as fotos do
  detalhe do pedido e de "Joias mais pedidas" no app.

### Pedido montado
- Cartão escuro com o link — sempre disponível enquanto o pedido montado está aberto, também ao reabri-lo depois, no app e no painel; nunca é preciso gerar um link novo para copiar —, **Enviar pelo WhatsApp** (só com telefone) e **Copiar link**; sem telefone,
  "Sem telefone — copie o link." A mensagem do WhatsApp aparece escrita.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| módulo de busca de produto (busca + dobra + palavras do termo) em `packages/core/src/` (nome a escolher, ex. `product-search/`) | VOCÊ CRIA (move do painel) | termo, lista de produtos | produtos filtrados, na regra de hoje |
| `capaDaLinha`, mapeamento da peça para proposta (variações, estoque, capa da variação com recuo), texto do estoque | VOCÊ CRIA (move do painel; só a parte pura — recebe a linha lida, não o client) | linha lida do banco | peça da proposta |
| regra "qual foto vai na linha" (variação → `images[0]` → `image_url`) | VOCÊ CRIA, folha sem import em `packages/core/src/proposals/` | variação, produto | URL ou nulo |
| `LINK_WITHOUT_STORE` | VOCÊ CRIA em `packages/core/src/proposals/` (move de `apps/backoffice/src/features/order-proposal/model/copy.ts:12`) | — | frase |
| `packages/core/package.json` (entrada do módulo novo de busca) | VOCÊ ALTERA |  |  |
| reexports do painel (`entities/product/lib/buscarProdutos.ts`, `shared/lib/texto.ts › dobrarTexto`/`palavrasDoTermo`, `entities/product/api/useProductCovers.ts › capaDaLinha`, `useProductVariants.ts › lerPecaParaProposta` mapeamento, `entities/product/lib/estoque.ts › textoDoEstoque`, `features/order-proposal/model/copy.ts`) | JÁ EXISTE. Passa a reexportar por referência |  |  |
| `packages/core/src/pricing/` (`types.ts`, `index.ts`, `grid.ts`) | JÁ EXISTE. Consuma; não altere (os tipos já são locais, `types.ts:1-35`) |  |  |

### Decisões já tomadas

- D-03: "Subir para `core` (com `.ts` explícito, pura): `buscarProdutos` + a dobra de busca, `capaDaLinha` e o mapeamento da peça para proposta (variações, estoque, capa da variação com recuo para a da peça); o painel reexporta por referência (`toBe`). As leituras ficam no app, dentro de `lerComPapel`, com as mesmas projeções. Ampliar `buscaDeProdutoComDonoUnico` (ou um par no app) para recusar a segunda busca. A foto continua pela `FotoDaPeca`/`renditionUrl`." — aqui só a subida e o dono do guarda passando a `core`; a ampliação ao app é da 07.
- D-05: "Um dono da regra \"qual foto vai na linha\" em `core` (variação → `images[0]` → `image_url`), chamado pela montagem do app, pela do painel e pela `precificar` da `order-proposals`" — aqui o dono e a montagem do painel; a `precificar` é da 02.
- D-07: `LINK_WITHOUT_STORE` sobe para `core/proposals`, o painel reexporta.
- D-24: "A tarefa vira: denoReach de pricing, boot local conferido das três functions e os dois CLAUDE.md corrigidos" — as três: `order-proposals`, `mercado-pago` e `checkout`.
- Nesta onda (W1) os arquivos `packages/core/CLAUDE.md`, `supabase/CLAUDE.md` e `packages/core/package.json` são desta tarefa; a 03 corre em paralelo e não os edita.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Regra subida com reexport e prova por `toBe` | `apps/backoffice/src/app/__tests__/regrasDoPedidoNoCore.test.ts` |
| Folha de `core` alcançável pelo Deno | `packages/core/src/customers/__tests__/denoReach.test.ts`; `packages/core/src/pricing/types.ts` |

### Testes

- Unidade (core): a busca movida passa com os casos de antes (os testes do painel sobem junto ou são reescritos contra `core`, sem perder asserção).
- Unidade (core): a foto da linha nos três recuos (variação com foto; sem foto e com `images[0]`; só `image_url`; nada → nulo).
- Guarda: o painel reexporta cada símbolo movido por referência (`toBe`) — uma cópia com o mesmo valor reprova.
- Guarda: `denoReach` de `core/pricing` (grafo transitivo com `.ts`, `import type` incluso, sem pacote) e dos arquivos novos que uma function vá importar (a foto da linha).
- Guarda: `buscaDeProdutoComDonoUnico` (`apps/backoffice/src/shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts:233` `DONO_DA_DOBRA`, `:137`) aponta o dono em `core`, sem perder sensor.

### Obrigações

- Todo especificador relativo dos arquivos novos que uma function importa leva `.ts` explícito, `import type` incluso; em comentário, descreva a forma proibida, não a escreva (o bundler do `supabase start` lê comentários) — `CLAUDE.md › Alias de import`.
- `lerPecaParaProposta` importa o client e `@estrelinha/supabase/types` (`useProductVariants.ts:23`, `:27`): só a função de mapeamento sobe; a leitura fica no painel.
- Boot local: suba o Supabase local (`supabase status`, portas 54440–54449; nunca `supabase stop --all`) e confira que `order-proposals`, `mercado-pago` e `checkout` respondem (401 sem header, não 503 `BOOT_ERROR`). Encerre o que você subir.
- Corrija `supabase/CLAUDE.md:506-509` e `packages/core/CLAUDE.md:501-503` (o `import type` de pacote em `pricing` já não existe) pelo que você medir.
- O gate inclui as suítes da loja e do painel (os guardas de lá varrem `apps/**`).

### Não faça

- Não toque em `supabase/functions/order-proposals/handlers.ts` (a `precificar` é da 02).
- Não crie leitura de catálogo no app nem amplie o guarda da busca ao app (é da 07).
- Não edite `packages/core/src/customers/**`, `supabase/functions/customer-parse/**` nem `supabase/config.toml` (são da 03, na mesma onda).

### Pronto quando

- [ ] o painel monta propostas como antes, com a busca, a capa e a peça vindas de `core` (suíte do backoffice verde)
- [ ] a regra da foto da linha existe em `core` com os três recuos
- [ ] o boot local das três functions conferido e os dois CLAUDE.md corrigidos
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (e a seção Comandos de verificação do `.specs/project/PROJECT.md`)

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
