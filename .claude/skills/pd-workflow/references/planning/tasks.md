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

4. **Bug aberto do Work Item não é fatiado.** O que o preflight leu por `bugs.abertos`
   ([backend](../setup/backend.md)) fica fora desta fila e fora da auditoria: o critério dele é o corpo do
   bug, não a costura. Ele entra depois, como fix task ao fim da fila (seção 5)

> **Por que não por camada.** A fila que quebra por deliverable — interface, serviço, endpoint,
> componente — produz em cada tarefa código que só a seguinte torna verificável. A fatia vertical fecha
> verde sozinha: um comportamento do usuário, com o teste que o prova, do banco à tela. Quem executa não
> precisa de nenhuma outra tarefa para saber se acertou.

**A fila é sequencial por padrão**: a ordem é a numeração, uma tarefa por vez — tarefa propaga descoberta
e decisão para os arquivos seguintes. **[productdock]** É sempre assim: não há ondas, e a fila da
plataforma vai sem paralelismo ([o que cada backend habilita](../setup/backend.md#o-que-cada-backend-habilita)).
**[local]** As ondas abaixo dizem o que dela pode rodar ao mesmo tempo.

### As ondas — o que roda em paralelo

**[local]** A numeração é a ordem; as **ondas** dizem o que dela pode rodar ao mesmo tempo. A corrida
([queue.md](../execution/queue.md)) despacha as tarefas de uma onda juntas, um `pd-impl-task` por tarefa, e
só abre a onda seguinte quando todas fecharam. Fila de duas tarefas ou mais sempre leva o plano de ondas;
sem paralelismo possível, ele é uma onda por tarefa.

5. **O grafo vem do `Depende de` de cada tarefa** — nunca da numeração. Uma tarefa entra na primeira onda
   em que todas as dependências dela já fecharam em ondas anteriores. Escreva o grafo numa linha:
   `01→02→03`, `06 ← 03+04`

6. **Posse exclusiva por onda.** Para cada tarefa, os arquivos e pastas que ela pode criar ou editar — os
   `VOCÊ CRIA` e os arquivos que ela altera. **Duas tarefas da mesma onda nunca tocam o mesmo arquivo**:
   barrel `index.ts`, roteador, registro de módulo, componente compartilhado, migration de numeração
   sequencial e o arquivo de instruções contam. Colidindo, separe-as em ondas seguidas, ou mande uma delas
   criar a parte nova em arquivo próprio e registrar numa linha que só ela toca

7. **Dependência relaxada só com contrato fixado.** Uma tarefa sobe para a onda da que ela consome só
   quando o contrato consumido já está escrito numa decisão da costura (nome, forma, campos) **e** ela não
   precisa do código da outra para verificar — teste com o contrato dublado, não com a implementação. Diga
   qual dependência relaxou e por quê. Na dúvida, não relaxe: uma onda a mais custa tempo, e uma
   dependência furada custa uma tarefa refeita

8. **Até 4 tarefas por onda.** Onda maior se quebra em ondas seguidas, pela numeração. Mudança global
   (renomeação em massa, dependência nova, configuração de build) roda sozinha na sua onda

O plano vai para `[ITEM_DIR]/waves.md` (seção 3), neste formato — as linhas `ONDAS:`, `posse:` e
`relaxada:` são lidas por máquina, então siga a forma:

```markdown
# Ondas — <WI-ID>

ONDAS: 01,08 | 02 | 03,07 | 04 | 05,06

Grafo: 01→02→03→04→05 · 06 ← 03+04 · 07 ← 02 · 08 ← 02 (relaxada)

## W1: 01, 08
- 01 posse: apps/api/src/orders/, packages/contracts/src/orders.ts
- 08 posse: apps/web/src/reports/
- 08 relaxada: depende da 02; o formato do campo foi fixado nas Decisões do spec.md e a 08 não precisa do código da 02 para verificar

## W2: 02
- 02 posse: apps/web/src/orders/
```

Uma seção `## W<n>` por onda, na ordem de `ONDAS:`; toda tarefa da fila aparece numa onda e só numa.

## 2. Apresentar, e esperar

Apresente a fila no CLI e peça aprovação: **uma linha por tarefa**, com número, repositórios, tela, o que
ela passa a possuir e os UCs que cobre. Depois da última, `Fica fora`. **[local]** Então o plano de ondas —
a linha `ONDAS:`, o grafo e, por onda, a posse de cada tarefa e a dependência relaxada, se houver. É uma
aprovação só: aprovar a fila é aprovar as ondas.

**Na entrada sem PRD**, o plano vai no mesmo turno, antes da fila ([plan.md](../seam/plan.md)):

- **[productdock]** as perguntas a ratificar vão logo depois da fila — cada uma com a recomendação que o
  plano já assumiu, e a linha "aprovar a fila as ratifica"
- **[local]** o plano já vai com as respostas do gate das perguntas do plano aplicadas — e, depois da
  fila, uma linha com o que esse gate ratificou ou mudou
  ([plan.md](../seam/plan.md#as-perguntas--o-gate-da-página))

Apresentada, **encerre o turno**: não pergunte se pode começar, não ofereça prévia de arquivo, não escreva
nada. Tarefa que cria o que outras consomem diz, na linha dela, o que ela deixa pronto.

## 3. Escrever

Aprovada, e só então, escreva a `tasks/` dentro da pasta que a costura já criou. Objeção ao fatiamento ou,
sem PRD, ao plano: corrija a costura e a fila antes, e apresente de novo.

**[productdock]** Na entrada sem PRD, a aprovação sem objeção ratifica as perguntas pendentes: marque-as
`ratificada na aprovação` no `plan.md`; resposta que muda uma recomendação se aplica ao `plan.md` e à
fila. Nos dois casos, publique o `plan` de novo antes de escrever a `tasks/`
([plan.md](../seam/plan.md#persistência)).

```
[ITEM_DIR]/
├── item.md         # [local] a ficha — fase: tasks
├── prd.md          # cópia fiel — já escrito (só com PRD)
├── spec.md         # a costura — já escrita (plan.md sem PRD)
├── waves.md        # [local] o plano de ondas (fila de 2 ou mais)
└── tasks/
    └── <nn>-<slug>.md
```

`<slug>` é o título em kebab-case, curto, sem artigo, e o prefixo tem dois dígitos (`01`, não `1`).

**[local]** O `waves.md` sai junto com a `tasks/`, pelo formato da seção 1 › As ondas. Fila de uma tarefa
não o escreve. **Cada arquivo nasce com `**Status:** pending`**, na linha logo abaixo do título
([task.md](task.md), [status das tarefas](../setup/local.md#status-das-tarefas)). É o único registro de
progresso da fila, e quem o move é a corrida. **[productdock]** O arquivo de tarefa não leva linha de
status: o progresso da fila vive na plataforma.

**A numeração dos arquivos é a única fonte da ordem** — **[local]** o `waves.md` só agrupa o que dela roda
junto —, e não existe índice nem arquivo de estado da fila — nem `tasks.md` em `[ITEM_DIR]`. Cada tarefa
se basta: quem a executa leva ao fim, propaga o que descobriu nos arquivos seguintes e relata.

## 4. Auditar

Escritos os arquivos, um subagent **`pd-task-audit`** tenta derrubá-los. É o único passo que confere o
escrito contra o decidido — sem ele, a fila sai do mesmo contexto que a propôs, e ninguém a leu de fora.

**Só com fila de duas tarefas ou mais.** Fila de uma não tem ordem, posse nem citação entre tarefas a
cruzar: a auditoria não roda, e a finalização diz `não roda: fila de 1`.

1. **Um subagent só.** Ele recebe o caminho da pasta do WI e a fila como o humano a aprovou — e nada mais.
   Critérios de aceite, design, lookup e decisões ele lê do `prd.md` e do `spec.md` (do `plan.md`, sem
   PRD), no disco. **Nada do que ele julga passa por você**: é isso que torna a auditoria independente do
   contexto que escreveu a fila. Critério com a `key` de um finding ao lado vale como está na tarefa; sem
   `key`, vale o `prd.md` atual. **[productdock]** É o critério sob **PRD pendente de ajuste** no
   `spec.md`, que vale com o **texto proposto**: a auditoria confere contra ele, porque o do `prd.md`
   está, por decisão registrada, errado. **[local]** O `prd.md` já traz as edições aprovadas no gate do PRD
   Tech Review: é contra ele, como está, que a auditoria confere. O `waves.md` também é dela: nenhuma
   tarefa depende de algo que só uma tarefa de onda igual ou posterior cria (salvo a `relaxada` com
   contrato fixado na costura), e nenhum par da mesma onda toca o mesmo arquivo. O que ela derrubar muda a
   `tasks/` **e** o `waves.md` antes de entrar no Implement

2. **Achado vazio é resultado legítimo, e o briefing diz isso com essas palavras.** Fila sem defeito é o
   esperado quando o fatiamento foi bem feito. Não peça um número de achados, não peça "pelo menos um", não
   reclame do vazio

3. **A auditoria roda antes de qualquer código existir, e ela sabe disso.** São três as classes de citação
   que ela cruza, não duas: arquivo que existe agora, arquivo que uma tarefa anterior cria — e **arquivo que
   existe agora e que uma tarefa anterior apaga**, que "está no disco" no momento em que ela olha e não estará
   quando a tarefa que o cita rodar. A terceira é a que escapa se ninguém a pedir, e é achado de `citação
morta` como as outras. O que ela **não** tem como pegar é a citação `caminho:linha` cuja linha desloca
   quando uma tarefa anterior edita o arquivo: no momento da auditoria toda citação ainda está correta. Isso
   se cobre do outro lado — na conferência de citações do preflight de cada `pd-impl-task`
   ([task.md](task.md)) e na forma de citar, que nomeia o alvo além da linha

4. Aplique o que voltou: defeito que quebra a execução você corrige no arquivo, e diz qual foi. Defeito
   que exige decisão — escopo, posse, ordem — volta ao humano, e você não escolhe por ele. **Uma rodada só**:
   corrigido, não dispare de novo

5. Veredito `a fila não serve` não se corrige com remendo: os arquivos no disco não servem. Diga ao humano
   o que a auditoria condenou, **não publique nada nem avance a fase**, e pergunte se refaz o fatiamento ou
   se apaga a `tasks/`. A decisão é dele

6. O veredito entra na finalização, inclusive quando é `a fila serve` e não houve achado nenhum

## 5. Entrar no Implement

Auditoria não condenada — ou fila de 1, sem auditoria —, nesta ordem ([backend](../setup/backend.md)):

1. `artefato.publicar(tasks)` — a fila, como artefato único. **[local]** Não há envio, sincronização nem
   corpo a montar: a `tasks/` em disco **é** a fila. **[productdock]** O corpo se monta na pasta temporária
   **a partir de `tasks/`**, com o envelope `tasks/v1` no topo e cada arquivo de tarefa, íntegro, na
   ordem da numeração; é a lista que o card _Implementação_ do Work Item renderiza. Um `T<nn>` por
   arquivo, igual ao prefixo numérico dele (`01-navegacao.md` → `T01`), sem exceção; uma fase só; sem
   paralelismo, cada tarefa dependendo da anterior; todas `pending` na criação; o `spec_ref` copiado da
   linha **Trecho da costura** do arquivo, e omitido — nunca vazio — na tarefa sem ela. O envelope
   inteiro e as regras dele estão no [pd-sync](../pd-sync/workflow.md), e o corpo montado nunca mora em
   `[ITEM_DIR]`
2. `fase.entrar(implement)`. **[productdock]** Registra a fase interna do SDLC **e** avança a coluna
   Refino Técnico → Desenvolvimento, definindo o usuário logado como responsável
   ([Kanban](../pd-sync/workflow.md#kanban))
3. `gate.registrar(fila)` — o veredito da auditoria: aprovada, o intervalo de tarefas e o veredito

**[productdock]** Rejeição do envelope volta com o campo exato (`phases.0.id`, por exemplo). Corrija
**aquele campo** e publique de novo. **Regra de parada:** o mesmo campo reclamado duas vezes é bloqueio —
relate a mensagem do servidor ao humano e pare. Não varie campos às cegas até passar; cada tentativa que
passa grava artefato de verdade. Confira o **efeito** em `item.ler` (`tasks_progress`), não o sucesso da
publicação. Conferido, apague o corpo montado da pasta temporária; rejeitado, ou sem o efeito, ele fica: é
dele que sai a correção e o reenvio.

**Bugs abertos lidos no preflight.** Com a fila no Implement, cada bug ainda aberto e sem fix task vira
tarefa ao fim dela — agrupado com os vizinhos da mesma tela ou componente — apresentar, aprovar, escrever,
publicar a fila de novo —, pelo procedimento de
[validation.md](../execution/validation.md#bugs-abertos-do-work-item). Ela **não** passa pelo
`pd-task-audit`: o critério é o corpo do bug, que a auditoria não tem na costura para conferir, e a fix
task leva o `BUG-N` como rastreio. O bloco de finalização (seção 6) sai uma vez, depois delas.

### Tarefa acrescentada ou corrigida depois

Fix task que a Validation acrescenta ([validation.md](../execution/validation.md)), fix task de bug aberto
do Work Item ([validation.md](../execution/validation.md#bugs-abertos-do-work-item)), ou correção de um
arquivo já escrito: edite ou acrescente o arquivo em `tasks/`, e só ele. O arquivo novo nasce `pending`; o
corrigido **mantém o status que tinha** — corrigir não desfaz progresso.

- **[productdock]** O status muda depois da publicação só pela marcação da corrida (`tarefa.marcar`,
  [queue.md](../execution/queue.md)), que não reescreve o corpo: não se remonta a fila para mudar status.
  Arquivo acrescentado ou corrigido deixa o corpo da plataforma desatualizado, e a marcação não o corrige:
  publique a fila de novo, inteira (`artefato.publicar(tasks)`), remontada a partir de `tasks/`, com o
  **status atual** de cada tarefa — as já fechadas vão `done`, a nova vai `pending` —, porque a publicação
  inteira substitui o envelope, e `pending` em tudo desfaz o progresso já registrado. Confira o efeito e
  apague o corpo montado, como na seção 5
- **[local]** O arquivo novo nasce `**Status:** pending`. Fix task nova devolve o Work Item à fase
  `implement` (`fase.entrar(implement)`). Fix tasks novas ganham ondas pelas mesmas regras da seção 1 —
  posse pela localização do bug, sem arquivo em comum ⇒ mesma onda, a maior severidade primeiro:
  acrescente as ondas ao fim da linha `ONDAS:` do `waves.md` e uma seção `## W<n>` para cada. A corrida
  das fix tasks percorre só essas

## 6. Finalização — e o gate da execução

A fila escrita **não autoriza escrever código**. Aprovar o fatiamento responde _"a divisão está certa"_;
começar a corrida é outra pergunta, e é a que muda a natureza do trabalho — daqui em diante o agente
escreve no repositório, não na pasta do Work Item.

Encerre com este bloco quando a auditoria não condenou a fila, **e nada depois dele**:

```
<WI-REF> · fila escrita          nada foi executado · nada foi commitado

[ITEM_DIR]/
  item.md                       ← fase implement · gate fila                     ([local])
  prd.md + spec.md | plan.md    ← a costura desta entrada
  tasks/<nn>-<slug>.md          ← uma linha por arquivo escrito ([local] todos pending)
  waves.md                      ← ONDAS: <a linha do arquivo>  ([local], fila de 2 ou mais)

Auditoria: <veredito>            <n> corrigido(s) · <n> ao humano · "nenhum achado" · "não roda: fila de 1"
Plataforma: <spec|plan> v<n> · tasks v<n> · fase implement · coluna Desenvolvimento   ([productdock])

Para executar, me diga até onde:  "executa a fila"  ·  "implemente a tarefa 01"
Versionar a pasta do Work Item no Git só se você pedir:  "commita a pasta do <WI-ID>"   ([local])
```

As linhas marcadas `([local])` ou `([productdock])` só saem naquele backend, e sem a marca.

Impresso o bloco, **encerre o turno**. Não comece a corrida, não despache `pd-impl-task`, não rode
`git add -N`, não ofereça prévia do primeiro arquivo. Quem abre a corrida é o humano, e
[queue.md](../execution/queue.md) começa do pedido dele.

> **O gate já pode estar fechado.** Se a aprovação da fila veio com a execução autorizada na mesma
> mensagem — _"aprovado, pode executar"_, _"fatia e roda"_ —, isso **é** a autorização: imprima o bloco e
> siga para a corrida, dizendo em uma linha que está seguindo sob ela. O que não vale é inferir de
> silêncio, de um "ok" seco sobre a fila, ou de uma autorização dada em outro Work Item. Na dúvida,
> encerre o turno: custa uma mensagem, e o erro contrário custa uma árvore suja que ninguém pediu.
