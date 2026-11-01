# Fatiamento — da costura à fila de tarefas

**As duas entradas.** A fila é **uma tarefa por tela** (ou, em WI sem tela, por agregado de domínio),
cada uma traçando um caminho completo de ponta a ponta.

Entrada: a costura em disco — o `prd.md` e o `spec.md` com PRD, o `plan.md` sem. Sem costura em disco não
existe fila. A anatomia de cada arquivo está em [task.md](task.md).

---

## 1. Fatiar

1. **Cada tarefa é uma tela com as sobreposições que ela abre** — ou, em WI sem tela, um agregado de
   domínio e o contrato que ele expõe —, e traça um caminho completo de ponta a ponta. **Nunca quebre por
   camada**: não existe tarefa de migration, de use case ou de componente, e o contrato que serve só a uma
   tela nasce dentro da tarefa dela

2. **Numere na ordem de execução**: navegação e shell antes das telas filhas; e entre telas, quem cria o
   contrato compartilhado antes de quem o consome. Compartilhado é o que duas tarefas ou mais usam — é só ele
   que ordena a fila

3. Todo UC extraído do PRD aparece uma vez: coberto por uma tarefa, ou nominalmente em `Fica fora`, com o
   motivo. `Fica fora` sem nada se escreve `nada`. UC que o handoff deixou travado é `Fica fora`, e o motivo
   é o bloqueio

4. **Bug aberto da QA não é fatiado.** O que o preflight leu de `qa/issues/` fica fora desta fila e
   fora da auditoria: o critério dele é o corpo do bug, não a costura. Ele entra depois, como fix task ao
   fim da fila (seção 5)

> **Por que não por camada.** A fila que quebra por deliverable — interface, serviço, endpoint,
> componente — produz em cada tarefa código que só a seguinte torna verificável. A fatia vertical fecha
> verde sozinha: um comportamento do usuário, com o teste que o prova, do banco à tela. Quem executa não
> precisa de nenhuma outra tarefa para saber se acertou.

## 2. Apresentar, e esperar

Apresente a fila no CLI e peça aprovação: **uma linha por tarefa**, com número, repositórios, tela, o que
ela passa a possuir e os UCs que cobre. Depois da última, `Fica fora`. **Na entrada sem PRD**, o plano vai
no mesmo turno, antes da fila, já com as respostas do gate das perguntas do plano aplicadas — e, depois da
fila, uma linha com o que esse gate ratificou ou mudou ([plan.md](../seam/plan.md#as-perguntas--o-gate-da-página)).

Apresentada, **encerre o turno**: não pergunte se pode começar, não ofereça prévia de arquivo, não escreva
nada. Tarefa que cria o que outras consomem diz, na linha dela, o que ela deixa pronto.

## 3. Escrever

Aprovada, e só então, escreva a `tasks/` dentro da pasta que a costura já criou. Objeção ao fatiamento ou,
sem PRD, ao plano: corrija a costura e a fila antes, e apresente de novo.

```
[ITEM_DIR]/
├── item.md         # a ficha — fase: tasks
├── prd.md          # já escrito (só com PRD)
├── spec.md         # a costura — já escrita (plan.md sem PRD)
└── tasks/
    └── <nn>-<slug>.md
```

`<slug>` é o título em kebab-case, curto, sem artigo, e o prefixo tem dois dígitos (`01`, não `1`).

**Cada arquivo nasce com `**Status:** pending`**, na linha logo abaixo do título
([task.md](task.md), [estado.md](../setup/estado.md#status-das-tarefas)). É o único registro de progresso
da fila, e quem o move é a corrida.

**A numeração dos arquivos é a única fonte da ordem**, e não existe índice nem arquivo de estado da fila —
nem `tasks.md`. Cada tarefa se basta: quem a executa leva ao fim, propaga o que descobriu nos arquivos
seguintes e relata.

## 4. Auditar

Escritos os arquivos, um subagent **`wi-task-audit`** tenta derrubá-los. É o único passo que confere o
escrito contra o decidido — sem ele, a fila sai do mesmo contexto que a propôs, e ninguém a leu de fora.

**Só com fila de duas tarefas ou mais.** Fila de uma não tem ordem, posse nem citação entre tarefas a
cruzar: a auditoria não roda, e a finalização diz `não roda: fila de 1`.

1. **Um subagent só.** Ele recebe o caminho da pasta do WI e a fila como o humano a aprovou — e nada mais.
   Critérios de aceite, design, lookup e decisões ele lê do `prd.md` e do `spec.md` (do `plan.md`, sem
   PRD), no disco. **Nada do que ele julga passa por você**: é isso que torna a auditoria independente do
   contexto que escreveu a fila. O `prd.md` já traz as edições aprovadas no gate do PRD Tech Review: é
   contra ele, como está, que a auditoria confere

2. **Achado vazio é resultado legítimo, e o briefing diz isso com essas palavras.** Fila sem defeito é o
   esperado quando o fatiamento foi bem feito. Não peça um número de achados, não peça "pelo menos um", não
   reclame do vazio

3. **A auditoria roda antes de qualquer código existir, e ela sabe disso.** São três as classes de citação
   que ela cruza, não duas: arquivo que existe agora, arquivo que uma tarefa anterior cria — e **arquivo que
   existe agora e que uma tarefa anterior apaga**, que "está no disco" no momento em que ela olha e não estará
   quando a tarefa que o cita rodar. A terceira é a que escapa se ninguém a pedir, e é achado de `citação
morta` como as outras. O que ela **não** tem como pegar é a citação `caminho:linha` cuja linha desloca
   quando uma tarefa anterior edita o arquivo: no momento da auditoria toda citação ainda está correta. Isso
   se cobre do outro lado — na conferência de citações do preflight de cada `wi-impl-task`
   ([task.md](task.md)) e na forma de citar, que nomeia o alvo além da linha

4. Aplique o que voltou: defeito que quebra a execução você corrige no arquivo, e diz qual foi. Defeito
   que exige decisão — escopo, posse, ordem — volta ao humano, e você não escolhe por ele. **Uma rodada só**:
   corrigido, não dispare de novo

5. Veredito `a fila não serve` não se corrige com remendo: os arquivos no disco não servem. Diga ao humano
   o que a auditoria condenou, **não avance a fase** e pergunte se refaz o fatiamento ou se apaga a
   `tasks/`. A decisão é dele

6. O veredito entra na finalização, inclusive quando é `a fila serve` e não houve achado nenhum

## 5. Entrar no Implement

Auditoria não condenada — ou fila de 1, sem auditoria —, no `item.md` ([estado.md](../setup/estado.md#o-itemmd)):

1. a linha do gate `fila` na tabela **Gates**: aprovada, o intervalo de tarefas e o veredito da auditoria
2. `fase: implement`

Não há envio, sincronização nem corpo a montar: a `tasks/` em disco **é** a fila.

**Bugs abertos lidos no preflight.** Com a fila no Implement, cada bug ainda aberto e sem fix task vira
tarefa ao fim dela — agrupado com os vizinhos da mesma tela ou componente — apresentar, aprovar, escrever —,
pelo procedimento de [validation.md](../execution/validation.md#bugs-abertos-da-qa). Ela **não** passa pelo
`wi-task-audit`: o critério é o corpo do bug, que a auditoria não tem na costura para conferir, e a fix task
leva o `BUG-N` como rastreio. O bloco de finalização (seção 6) sai uma vez, depois delas.

### Tarefa acrescentada ou corrigida depois

Fix task que a Validation acrescenta ([validation.md](../execution/validation.md)), fix task de bug aberto
da QA ([validation.md](../execution/validation.md#bugs-abertos-da-qa)), ou correção de um arquivo já
escrito: edite ou acrescente o arquivo em `tasks/`, e só ele. O arquivo novo nasce `**Status:** pending`; o
corrigido **mantém o status que tinha** — corrigir não desfaz progresso. Fix task nova devolve o `item.md`
a `fase: implement`.

## 6. Finalização — e o gate da execução

A fila escrita **não autoriza escrever código**. Aprovar o fatiamento responde _"a divisão está certa"_;
começar a corrida é outra pergunta, e é a que muda a natureza do trabalho — daqui em diante o agente
escreve no repositório, não na pasta do Work Item.

Encerre com este bloco quando a auditoria não condenou a fila, **e nada depois dele**:

```
<WI-ID> · fila escrita          nada foi executado · nada foi commitado

[ITEM_DIR]/
  item.md                       ← fase implement · gate fila
  prd.md + spec.md | plan.md    ← a costura desta entrada
  tasks/<nn>-<slug>.md          ← uma linha por arquivo escrito, todos pending

Auditoria: <veredito>            <n> corrigido(s) · <n> ao humano · "nenhum achado" · "não roda: fila de 1"

Para executar, me diga até onde:  "executa a fila"  ·  "implemente a tarefa 01"
Versionar a pasta do Work Item no Git só se você pedir:  "commita a pasta do <WI-ID>"
```

Impresso o bloco, **encerre o turno**. Não comece a corrida, não despache `wi-impl-task`, não rode
`git add -N`, não ofereça prévia do primeiro arquivo. Quem abre a corrida é o humano, e
[queue.md](../execution/queue.md) começa do pedido dele.

> **O gate já pode estar fechado.** Se a aprovação da fila veio com a execução autorizada na mesma
> mensagem — _"aprovado, pode executar"_, _"fatia e roda"_ —, isso **é** a autorização: imprima o bloco e
> siga para a corrida, dizendo em uma linha que está seguindo sob ela. O que não vale é inferir de
> silêncio, de um "ok" seco sobre a fila, ou de uma autorização dada em outro Work Item. Na dúvida,
> encerre o turno: custa uma mensagem, e o erro contrário custa uma árvore suja que ninguém pediu.
