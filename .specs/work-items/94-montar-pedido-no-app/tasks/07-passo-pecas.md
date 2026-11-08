## 07 · [apps/mobile-adm · apps/backoffice (guarda)] App: o passo 2 · Peças, com a folha da variação

**Status:** done

`UC-06` — 94

**Objetivo.** A Adri busca as peças com foto, escolhe a variação vendo a foto dela, acrescenta à sacola sem passar do estoque, e confere cada linha com a foto que a cliente verá no link.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `apps/mobile-adm/CLAUDE.md`; `apps/backoffice/CLAUDE.md` › A busca de produto: um dono para as cinco telas (feature 51, AD-036), › Montar pedido para a cliente (feature 89, AD-070); `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Os módulos, › Dinheiro, › customers, › proposals, › Convenções de tipo. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Passo 2 · Peças e folha da variação); §7 · spec.md — Decisões (D-02, D-03, D-05, D-22, D-27). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 01 (busca + dobra, `capaDaLinha`, mapeamento da peça e a regra da foto em `core`) e 06 (a fila do app até o passo 1). Confira que existe antes de começar.
**Habilita.** 08 (a sacola alimenta o resumo do passo 3), 10 (o rascunho guarda as peças).

### Critérios de aceite

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

### Design — o que a tela faz

Sacola "Sacola · N peças": foto retrato 64×80 (da variação, ou "capa"), nome, variação, "Gravação: <texto>", "q × R$", etiquetas "Pede material da cliente" e "<promoção> · 15%", total da linha, "Editar" e lixeira (aria "Editar <nome>", "Remover <nome>"; toast "Peça removida."). "Acrescentar peça", busca "Nome da joia ou SKU" (sem resultado "Nenhuma joia com “q”."), linhas com capa retrato 56×70, nome, "a partir de R$ X · N em estoque · pede material" ("a partir de" só com mais de uma variação; estoque somado) e ícone de mais. Motivo do passo: "Acrescente ao menos uma peça."

Folha da variação: foto 104×130 que troca por variação (sem foto própria, a capa); nome, preço da variação, "Promoção de outubro · 15% nesta peça"; "A foto troca com a variação escolhida.", rótulo do eixo e chips com miniatura redonda, nome e "N em estoque" (esgotada desligada, "Esgotada"); "Quantidade" (mínimo 1) e "N em estoque" — acima do estoque **somando a mesma variação já na sacola**, "Só há N em estoque." e botão desligado; gravação só se a peça aceita ("O que gravar", "Nome, data ou uma palavra", contador n/teto, "Opcional. Deixe em branco se ela preferir a peça sem gravação."); material: "Pede material da cliente. Depois de pago, o pedido entra na fila de material como os da loja."; botão "Acrescentar · R$ X" / "Salvar · R$ X". Abre na primeira variação com estoque; confirmar fecha, limpa a busca, toast "Peça acrescentada." / "Peça atualizada." com "<nome> · <variação>". Peça sem foto: `FotoDaPeca` (fundo areia com a estrela). O desenho não mostra carregando nem erro do catálogo: use o padrão do app.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| leituras do catálogo (produtos ativos com capa, variações com estoque e imagem, promoção vigente para exibição) | VOCÊ CRIA em `apps/mobile-adm/src/entities/product/api/`, dentro de `lerComPapel`, com as projeções do painel (`apps/backoffice/src/entities/product/api/useProductVariants.ts:31` `capa:images->0->>url`) |  |  |
| busca, dobra, `capaDaLinha`, mapeamento da peça, regra da foto da linha | JÁ EXISTE (01) em `core`. Consuma; não altere |  |  |
| `FotoDaPeca` (`apps/mobile-adm/src/shared/ui/FotoDaPeca.tsx`) | JÁ EXISTE. Consuma |  |  |

### Decisões já tomadas

- D-27: "Catálogo uma vez, mesma regra do painel (subida a core)" — o app carrega o catálogo uma vez (em cache durante a montagem) e filtra com a regra de `core`.
- D-03: "Ampliar `buscaDeProdutoComDonoUnico` (ou um par no app) para recusar a segunda busca." — aqui, com o escopo do guarda (`apps/backoffice/src/shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts:33` `ESCOPO`) incluindo `apps/mobile-adm/src`.
- D-22: "Sim: o teto soma a mesma variação já na sacola (\"Só há N em estoque.\")".
- D-05: a sacola mostra a foto pela regra de `core` (variação → `images[0]` → `image_url`), a mesma que a `order-proposals` grava.
- D-02: as leituras de peças e variações dentro de `lerComPapel`; o app não lê promoções para calcular preço (a conta é do `preview`, na 08) — a promoção aqui é só a etiqueta exibida, vinda da mesma leitura que o painel usa; se ela exigir ler `promotions`, deixe a etiqueta para a 08 e diga no retorno.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Leitura com papel | `apps/mobile-adm/src/entities/customer/api/useCliente.ts` + `apps/mobile-adm/src/shared/api/lerComPapel.ts` |
| Folha no histórico | `apps/mobile-adm/src/features/order-actions/model/useFolhaNoHistorico.ts` |
| Mapeamento da peça (agora em `core`) | o que a 01 subiu de `apps/backoffice/src/entities/product/api/useProductVariants.ts › lerPecaParaProposta` |

### Testes

- Página real (app): busca acha pela regra de `core` (nome sem acento, várias palavras); cada linha com capa e "a partir de R$ … · N em estoque · pede material".
- Página real (app): a folha abre na primeira variação com estoque; a foto troca por variação (recuo para a capa); esgotada desligada; acima do estoque somando a sacola, a frase e o botão desligado; gravação só se a peça aceita; editar reabre com "Salvar".
- Página real (app): a sacola mostra a foto da variação; peça sem foto com a moldura da estrela; remover tira a linha.
- Client real (app): conta sem papel na leitura do catálogo ⇒ a recusa.
- Guardas: `buscaDeProdutoComDonoUnico` com o app no escopo (sensor: uma segunda dobra no app reprova); `leituraSoComPapel` (entradas literais novas); `renditionSingleOwner` (URL de rendição só pelo dono); tom e movimento.

### Obrigações

- Toda function do app por uma porta com nome literal por ação; recusa só pelo `42501` de `conferirPapel`; rede é falha, nunca recusa.
- Toda leitura do app por `lerComPapel`.
- Tom memorial (sem emoji, sem `!` nos literais do app, sem urgência) e `motion-reduce:` na mesma linha de toda animação.
- Prova de layout é de navegador (jsdom devolve 0): alvo de 44 px e `body` sem rolagem lateral se conferem na QA, não aqui.
- O gate inclui as suítes da loja e do painel (os guardas de lá varrem `apps/**`).

### Não faça

- Não calcule desconto nem total com promoção no app (é o `preview` da 08).
- Não escreva uma segunda regra de busca no app.
- Não guarde a sacola em storage (é da 10).

### Pronto quando

- [ ] a Adri acrescenta, edita e remove peças com foto, sem passar do estoque somado
- [ ] a busca é a de `core`, e o guarda recusa uma segunda no app
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
