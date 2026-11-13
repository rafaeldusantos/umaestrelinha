## 03 · [apps/backoffice] Lista de produtos — filtro pela campanha e edição em massa

**Status:** done

`UC-04` — 102

**Objetivo.** A dona filtra a lista de produtos pela campanha e pelo percentual, vê o percentual na linha e marca ou tira várias peças de uma vez.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; `apps/backoffice/CLAUDE.md` › Molde dos formulários · Descontos. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (Painel); §7 · spec.md — Decisões.

**Depende de.** 01 — `apps/backoffice/src/entities/campaign/` (leitura e porta de escrita das marcações em lote) e os links "Ver as peças" que já apontam para `/admin/produtos?campanha=<id>` e `&percentual=<p>`. Confira que existem antes de começar.

### Critérios de aceite

### UC-04 · Marcar várias de uma vez
- Na lista de produtos, selecionar várias e aplicar "Black Friday: X%" ou "Tirar da Black Friday" pela edição em
  massa que já existe; os percentuais oferecidos são os da campanha. Na edição em massa, a dona escolhe primeiro a campanha e depois o percentual;
  o filtro da lista também começa pela campanha.
- A lista ganha o filtro pela campanha (todas, ou um percentual) e o percentual na linha.
- Na tela da campanha, "Ver as peças" leva à lista já filtrada.

- **CA-07** Tirar da campanha (ou encerrar a campanha) devolve o preço de sempre em todas as superfícies, e
  `price`/`compare_price` no banco são os mesmos de antes.

- **CA-15** Em 390×844 e 1440×900: o selo inteiro nos cartões de 173 e 220 px, sem rolagem horizontal; fonte a 200 %
  sem cortar o percentual; a tela de campanhas do painel sem rolagem lateral em 390.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| filtro `campanha`/`percentual` da lista, no servidor, com chip e visão salva | VOCÊ CRIA | `?campanha=<id>&percentual=<p>` | a lista filtrada |
| percentual na linha | VOCÊ CRIA | a marcação da peça (embed) | "15%" com o nome da campanha |
| ação de edição em massa "campanha → percentual" e "Tirar da {nome}" | VOCÊ CRIA | as peças selecionadas | a escrita pela porta |
| porta de escrita em lote em `apps/backoffice/src/entities/campaign/` | JÁ EXISTE (tarefa 01). Consuma; não altere. | `(productIds[], campaignId, percent \| null)` | — |

### Decisões já tomadas

- H-10: UC-04 segue o molde do filtro por fornecedor e o painel de edição em massa: primeiro a campanha, depois o percentual; "Tirar da {nome}" tira as selecionadas.
- A edição em massa **não** é patch em `products`: escreve em `product_campaigns` pela porta da tarefa 01.
- O filtro começa pela campanha (todas as campanhas agendadas ou em vigência, na ordem do início), e depois o percentual.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| filtro no servidor, chip e visão | `apps/backoffice/src/entities/product/api/productQuery.ts:39,56,73 — supplierIds`; `useAdminProducts.ts:104 — o embed`; `features/product-list/model/__tests__/fornecedorNosFiltros.test.ts` |
| ação em massa | `apps/backoffice/src/features/bulk-edit/ui/BulkEditPanel.tsx`, `model/buildBulkPatch.ts` |

### Testes

- Hook/consulta: o filtro por campanha e por percentual vira a cadeia de filtros esperada no PostgREST (asserção sobre os filtros do dublê); o recorte sobrevive na URL.
- Página real da lista: `?campanha=<id>&percentual=15` abre filtrada com o chip; a linha mostra o percentual.
- Edição em massa: escolher a campanha e 20% chama a porta com os ids selecionados; "Tirar da Black Friday" chama com `null`; os percentuais oferecidos são os da campanha.
- Probe da gravação em lote (`AD-012`) contra o banco local.

### Obrigações

- `animacaoRespeitaMovimento.test.ts` (escopo literal): acrescente os arquivos de UI novos desta tarefa — nesta onda só esta tarefa edita esse guarda.
- `buscaDeProdutoComDonoUnico.test.ts` continua verde (o filtro não é por nome).
- Sem rolagem lateral em 390 na lista com o filtro novo.

### Não faça

- O campo da campanha no formulário do produto (tarefa 02); as telas de campanha (tarefa 01); qualquer mudança em `entities/campaign` (tarefa 01).

### Pronto quando

- [ ] UC-04 provado pela página real e pelo probe da gravação em lote
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
