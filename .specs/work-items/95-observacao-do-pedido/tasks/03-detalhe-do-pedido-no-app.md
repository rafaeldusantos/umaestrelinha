## 03 · [. — apps/mobile-adm] Detalhe do pedido no app do ateliê

**Status:** done

`C-06` — 95

**Objetivo.** No app do ateliê, quem administra vê a observação do pedido e consegue cadastrá-la e editá-la, com a mesma regra do Backoffice.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — por seção: O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines), `packages/core/CLAUDE.md › order-actions`; e por seção: `apps/mobile-adm/CLAUDE.md › O acesso é o MESMO do Backoffice`, `› Pedidos (feature 74)`, `› Ações no pedido (feature 75)`, `› O envelope da cliente (feature 82)`, `› Os guardas do app`, `› Testes`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §5 · plan.md — Código — /Users/rafael.santos/Projetos/uma-estrelinha/store. É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 01: a tabela `order_admin_notes` (RLS `has_role`), `core/orders/adminNote.ts` (`ORDER_ADMIN_NOTE_MAX`, `adminNoteRefusal`, `adminNoteLength`), `core/orders/adminNoteAuthor.ts` (`adminNoteAuthorLine`, a frase de autoria) e o dono da escrita `core/order-actions/adminNote.ts` (client injetado). Confira que existem antes de começar.

### Critérios de aceite

- **C-06** O app do ateliê mostra a observação no detalhe do pedido e permite cadastrá-la e editá-la; a falha da leitura não derruba os outros blocos, a conta sem papel não vê o texto nem grava, e a regra da escrita é a mesma do Backoffice (um dono em `core`)

### Design — o que a tela faz

Sem protótipo (o humano mandou seguir sem design).

- Bloco "Observação" no detalhe do pedido (molde `BlocoDoDetalhe`), com o texto e "Atualizada em <data> às <hora> por <nome>" (`updated_by_name`) (só a última edição) — a frase vem de `adminNoteAuthorLine` (`@estrelinha/core/orders`), nunca escrita no app. Sem observação, o bloco mostra só a ação "Adicionar observação"; com observação, "Editar".
- A ação abre uma folha (molde de `FolhaDoRastreio`, feature 75) com textarea, contador (teto 1000, contado por `adminNoteLength` de `core` — texto aparado, por ponto de código —, sem `maxLength` nativo, que conta UTF-16) e Salvar, desabilitado quando `adminNoteRefusal` recusa; alvo ≥ 44px; trava durante a gravação; erro em módulo, como as ações do pedido; o teclado virtual não cobre o Salvar.
- Estados: carregando (esqueleto do bloco), erro de leitura do bloco (frase própria do bloco, os outros blocos seguem), recusa de papel (a recusa da feature 72, sem o texto).

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `apps/mobile-adm/src/entities/order/api/usePedido.ts` | JÁ EXISTE. Altere. | — | sexta leitura `order_admin_notes` por `order_id` (`maybeSingle`) **dentro** do callback de `lerComPapel`, como `Bloco<…>` que falha sozinho |
| `apps/mobile-adm/src/entities/order/model/linha.ts` | JÁ EXISTE. Altere. | — | constante das colunas lidas da observação |
| porta `apps/mobile-adm/src/features/order-actions/api/gravarAcao.ts` | JÁ EXISTE. Altere. | `orderId`, texto | confere o papel (`conferirPapel`) e chama o dono `core/order-actions/adminNote.ts` passando o client **como valor**; nenhuma escrita direta de tabela |
| bloco em `apps/mobile-adm/src/widgets/order-detail/ui/` e folha em `apps/mobile-adm/src/features/order-actions/ui/` | VOCÊ CRIA | — | — |
| `order_admin_notes`, `core/orders/adminNote.ts`, `core/orders/adminNoteAuthor.ts`, `core/order-actions/adminNote.ts` | JÁ EXISTE (tarefa 01). Consuma; não altere. | | |

### Decisões já tomadas

- O app mostra, cadastra e edita (N5: "opção para editar e cadastrar").
- A escrita tem um dono em `core/order-actions/adminNote.ts`; o app chama pela porta única `gravarAcao.ts` (o client só pode ser importado pelos arquivos que `escritaSoPelaPorta.test.ts` aceita).
- Teto 1000, aparado, por ponto de código — a regra de `core`.
- Só a última edição, sem histórico (N2).
- Nomes de tabela e coluna (`order_admin_notes`, `note`) não casam os termos proibidos de `semDadoSensivelDeClienteNoApp.test.ts`; confira ao escrever.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| leitura dentro do `lerComPapel` | `apps/mobile-adm/src/entities/order/api/usePedido.ts` — as cinco leituras do detalhe |
| bloco do detalhe com três estados | `apps/mobile-adm/src/widgets/order-detail/ui/BlocoDoDetalhe.tsx` + `Bloco<T>` de `entities/order/model/linha.ts` |
| escrita pela porta | `apps/mobile-adm/src/features/order-actions/api/gravarAcao.ts` — a gravação do rastreio |
| folha de edição | `apps/mobile-adm/src/features/order-actions/ui/FolhaDoRastreio.tsx` (+ `__tests__/FolhaDoRastreio.test.tsx`) |
| recusa sobre o supabase-js real | `apps/mobile-adm/src/app/__tests__/acoesComClientReal.test.tsx` e `pedidosComClientReal.test.tsx` |

### Testes

- Página (`PedidoPage` real): o bloco mostra a observação e a autoria; sem observação, só "Adicionar observação"; a falha da leitura da observação não derruba os outros blocos.
- Folha: cadastra; edita; recusa acima do teto sem ir à rede; trava durante a gravação; erro de gravação em módulo, com o texto preservado.
- Sobre o client real: com `atelie_clock` em 403 `42501`, nenhum texto da observação aparece e nenhuma confirmação de gravação.
- Guardas existentes continuam passando: `escritaSoPelaPorta`, `leituraSoComPapel`, `semDadoSensivelDeClienteNoApp`, `movimentoDosPedidos` (se o arquivo novo tiver movimento, com par `motion-reduce:`).
- Fixturas do `fakeSupabase` com a tabela nova (ele lança para tabela não configurada).

### Obrigações

- Leitura só dentro de `lerComPapel`; escrita só pela porta `gravarAcao.ts`.
- Mobile é o caso principal: 390×844 sem rolagem horizontal, alvo ≥ 44px, fonte a 130 % e 200 %; foco volta a um lugar ao fechar a folha.
- Tom memorial: nada de emoji, exclamação ou urgência nos textos.
- Gate "sem regressão" do mobile-adm (lint 0/0, tipos 0) e das suítes que os guardas cruzados alcançam (store) — `CLAUDE.md › Baselines`.

### Não faça

- Ler ou gravar `order_admin_notes` fora de `usePedido.ts`/`gravarAcao.ts`; importar o client em arquivo novo.
- Mudar `core/order-actions/adminNote.ts` ou a regra de `core` (tarefa 01); qualquer coisa da proposta (tarefa 02).
- Mostrar o Recado da cliente no app (fora do escopo).
- Commit.

### Pronto quando

- [ ] o detalhe do pedido mostra a observação com a autoria
- [ ] a folha cadastra e edita pela porta única, com a regra de `core`
- [ ] a conta sem papel não vê o texto nem grava (provado sobre o client real)
- [ ] a falha da leitura da observação não derruba os outros blocos
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
