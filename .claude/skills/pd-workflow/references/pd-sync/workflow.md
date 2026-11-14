# pd-sync — as operações da pd-workflow no ProductDock

Cada operação que o núcleo nomeia ([backend.md](../setup/backend.md)) tem aqui o comando exato, o que se
confere na resposta e o que ela tem de particular. O canal — sondas, escopo, como ler a resposta, a pasta
de envio, a tabela de comandos — está em [sync.md](sync.md). Todo comando vai com `--json`, roda **na
thread principal** e segue os [códigos de saída](sync.md#códigos-de-saída); o que cada operação diz sobre
exit é só o que ela tem de particular. A tool MCP equivalente nunca entra no lugar ([O MCP](sync.md#o-mcp)).

Neste backend a plataforma é a única fonte do estado: não há `item.md`, não há linha `**Status:**` nas
tarefas, não há `prd-review.md`. Gates aprovados, decisões, lições, fase e progresso persistem na
plataforma, e o único estado em disco é a costura (e a `tasks/`, depois de aprovada).

---

## As operações

### `canal.sondar`

Início de cada sessão: a [Sonda de canal](sync.md#sonda-de-canal) (CLI e MCP, os quatro estados, as
mensagens de bloqueio) e, só com a CLI usável, a [Sonda de versões](sync.md#sonda-de-versões). Sem sessão,
a fase bloqueia e a skill conduz o [bootstrap](sync.md#bootstrap). Faltando agent do catálogo, a instrução
de instalação deste backend está em [Agents faltando](sync.md#agents-faltando).

A corrida da fila repete a sonda de canal no preflight dela: sem sessão, **bloqueie** — o progresso da
corrida vive na plataforma.

No [modo autônomo](../discovery/prd-review-autonomo.md) a sonda é o próprio `wi prd`; a de versões e o
preflight não rodam.

### `item.ler`

```bash
productdock state phase <ref> --json
```

No preflight, antes de qualquer chamada de artefato. Em `.data`:

- **`uses_plan`** — a fonte do roteamento. Ele é derivado das regras de artefato da plataforma, que já
  combinam tipo **e** fluxo: **nunca** recombine `(work_item_type, flow_mode)` em prosa para decidir a
  entrada — é como a divergência começa.
  - `uses_plan: false` ⇒ **entrada com PRD** — `feature`, e `improvement` em `full`, que usa **PRD delta**
    sobre feature existente.
  - `uses_plan: true` ⇒ **entrada sem PRD** — `bug`, `incident`, `technical_debt`, e `improvement` em
    Fluxo Rápido (`flow_mode: 'fast'`, PROD-144). Nenhum deles exige PRD: `wi prd` devolvendo
    `{ content: null }` com exit `0` é sucesso, não bloqueio.
- `work_item_type` e `flow_mode` — lidos pelo [Fluxo Rápido](#fluxo-rápido), e só por ele.
- `tasks_progress` e `implementation_complete` — o progresso da fila na plataforma
  ([Sinais da retomada](#sinais-da-retomada)).
- **`open_qa_bugs`** — os bugs `open` na aba Qualidade do Work Item, de qualquer origem. `> 0` dispara
  [`bugs.abertos`](#bugsabertos) antes da tabela de retomada; `0`, ou o campo ausente, não dispara leitura
  nenhuma.
- `artifacts_found`, `status`, `current_phase` — informativos.

`state phase` é também **onde se confere o efeito** de um envio de `tasks` (`tasks_progress`) e do fecho
da fila (todas `done` e `implementation_complete: true`) — o `success` do submit não prova nada. Não aceita
`--repository-name`: o escopo é o do diretório ([escopo](sync.md#escopo-de-projetorepositório)).

### `item.buscar`

```bash
productdock wi list --search "<termo>" --json
```

Busca por título, descrição ou tipo. Na entrada sem PRD, é daqui que saem o título e a descrição do Work
Item (o insumo `work item` do [plan.md](../seam/plan.md)); no Tech Review interativo, complementa o
`wi prd` para achar o Work Item. Não roda no modo autônomo — o `<ref>` vem do runner.

### `item.criar`

Não existe neste backend: o Work Item nasce na plataforma, e `[WI-ID]` usa o prefixo do projeto. O que a
skill cria é a pasta `[ITEM_DIR]` = `.productdock/work-items/[WI-ID]-[name]/` — sempre criar/verificar antes
de escrever qualquer artefato ([Persistência](sync.md#persistência--gerar-local-e-submeter)). Decisão de
produto do QA com destino `WI novo`: diga ao humano que o Work Item novo é aberto na plataforma, e siga.

### `prd.obter`

```bash
productdock wi prd <ref> --json
```

- Com PRD: salvar `.data.content` como `[ITEM_DIR]/prd.md`, cópia fiel — sem resumir, sem omitir, sem
  reformatar —, com a versão (`.data.version`) e a data no fim. Conversa longa, busque de novo em vez de
  reconstituir de memória. A `.data.version` é a que o parecer declara em `reviewed_brief_version`, e a
  versão que o cabeçalho da costura cita ("PRD versão <versão>").
- **Work Item sem PRD na entrada com PRD é bloqueio.** `{ content: null, message }` com exit `0` é
  sucesso da chamada e ausência do insumo. Antes de concluir, confirme o formato do ref e tente variações
  (`PREFIXO-N`, número, título). Persistindo, **pare** e oriente o humano a criar ou publicar o PRD na
  plataforma — não prossiga para a Spec. Texto colado na conversa **não substitui PRD**: o que a fila cita
  como critério tem que existir na plataforma, versionado, para a auditoria conferir.
- Linha de **PRD pendente de ajuste** que fecha traz o `prd.md` de novo por aqui
  ([PRD pendente de ajuste](#prd-pendente-de-ajuste)).
- **Versão anterior** (rodada incremental do Tech Review):
  `productdock wi prd <ref> --version <n> --json --out <pasta de envio>/prd-v<n>.json`. A opção não existe
  no `wi prd` da CLI atual: o `--version` é lido como a versão do programa, e a resposta é
  `{"ok":true,"version":"<versão da CLI>"}` com exit `0`, sem PRD, e o `--out` não grava o arquivo. É o
  caso "a versão anterior não veio" dos
  [insumos da rodada incremental](#os-insumos-da-rodada-incremental--versão-anterior-parecer-anterior-e-diferenças).

### `insumos.ler`

Três comandos, todos só leitura, todos antes do lookup. Na entrada sem PRD só os anexos (antes de numerar)
e os protótipos (depois do `phase_change specify`); o `spec-context` é só da entrada com PRD.

- **Grounding de domínio** — `productdock wi spec-context <ref> --json`: em `.data`, visão do produto,
  modelo de domínio, discovery insights, requisitos não-funcionais e specs irmãs; em
  `.data.current_state.decisions[]`, as decisões já registradas, entre elas as
  [pendências para a Spec](#pendentes-para-a-spec--o-que-o-modo-autônomo-deixou) e as respostas a
  [ignorados sem motivo](#ignorados-sem-motivo--a-pergunta-que-volta-na-spec). Roda no Passo 1 do Tech
  Review e no lookup. O registro é por Work Item **e** repositório: o `spec-context` lê só o do repositório
  em que roda.
- **Anexos** — `wi attachments`: [Os anexos do Work Item](#os-anexos-do-work-item).
- **Protótipos** — `wi prototypes`:
  [Os protótipos do Work Item](#os-protótipos-do-work-item--e-a-reconciliação-com-o-prd).

### `eval.ler`

`eval list` → `eval latest`, só quando a condição vale: [O report de eval](#o-report-de-eval).

### `codigo.buscar`

```bash
productdock code map --json
productdock code search "<query>" --json      # --top-k até 50
```

Complementam a análise local quando o índice remoto está disponível — no Passo 2 do Tech Review e no
lookup —: são atalho para achar onde procurar, não substituto da leitura. Toda afirmação continua vindo com
`caminho:linha` do disco. Repositório nunca indexado devolve `indexed: false` com exit `0`: é resultado,
não erro; busca vazia é sucesso. Não aplicam o `project.repository` por padrão — `--repository-id` só para
estreitar de propósito.

### `bugs.abertos`

`wi bugs --status open`, quando `open_qa_bugs > 0`: [Bugs da aba Qualidade](#bugs-da-aba-qualidade).

### `fase.entrar(<fase>)`

```bash
productdock state update --ref "<ref>" --type phase_change --content '{"phase":"<fase>"}' --json
```

| Fase         | Quando                                                                                                   | Efeito no card ([Kanban](#kanban))                         |
| ------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `specify`    | ao iniciar o Work Item — com PRD, depois do Tech Review; sem PRD, depois de numerar os comportamentos   | Refino Produto → Refino Técnico, e define o responsável    |
| `implement`  | fila aprovada, auditada e com o `tasks` submetido                                                        | Refino Técnico → Desenvolvimento, e define o responsável   |
| `validation` | fila fechada, com o efeito conferido em `tasks_progress`                                                 | nenhum — o card já está em Desenvolvimento                 |

**Não existe `phase_change` para `design`, `test-design` nem `tasks`**: as fases `design` e `test-design`
não existem nesta skill, e a coluna já foi para Refino Técnico quando a `specify` começou. **Nunca**
`phase_change` para `review`: a ida para "Aguardando Testes" é manual. Fix task acrescentada depois não
roda `phase_change` nenhum.

### `gate.registrar(<gate>)`

```bash
productdock state update --ref "<ref>" --type review \
  --content '{"phase":"<fase do gate>","status":"<status>","iteration":<n>}' --json
```

| Gate                               | `phase`           | `status`                                                                                      | Quando                                                                                    |
| ---------------------------------- | ----------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `prd-review` — PRD Tech Review (antecipado) | `prd-tech-review` | `issues` com `blocking + gaps > 0`; senão `questions` com `questions > 0`; senão `pass` — com `issues` e `questions` | depois de submeter o parecer — ou, sem pedido aberto, ao fechar o antecipado ([Tech Review com o PM](#tech-review-com-o-pm)) |
| Handoff principal (entrada com PRD) | `specify`         | `pass`                                                                                        | fechado o gate, **antes** de escrever a costura — obrigatório mesmo que o antecipado já tenha rodado |
| Fila                               | `tasks`           | `pass` — o veredito da auditoria                                                              | sincronizada a fila ([Quando sincronizar](#quando-sincronizar))                          |

Os gates `descoberta`, `perguntas do plano`, `execução`, `fix tasks`, `validation <n>` e `mudança de
escopo` não existem neste backend: não há `state update` para eles.

Fica no `feature_state` da plataforma, retomável sem sessão viva. **Registrar o gate não submete artefato,
e submeter não registra o gate**: são duas operações, e a etapa só fecha com as duas. O status do PRD
**não** se grava por `state update` — ele só entra pelo envio do parecer.

### `decisao.registrar`

```bash
productdock state update --ref "<ref>" --type decision \
  --content '{"title":"…","description":"…","impact":"…","trade_off":"…"}' --json
```

- Decisão que vale **além deste Work Item** — do handoff antecipado, do principal, da corrida (as
  premissas de raio de alcance largo são candidatas naturais) —, **uma a uma**. A decisão que vale só aqui
  fica na seção **Decisões** da costura e não vai à plataforma. O `feature_state` é índice de retomada; o
  registro completo das respostas é a seção **Decisões**.
- O `id` volta do servidor em `applied.id`; confira `accepted_fields` e `ignored_fields`.
- Neste backend a decisão vai à plataforma, e não a um arquivo local.
- Pendência para a Spec (modo autônomo) e resposta a pendência ou a ignorado sem motivo têm formato
  próprio: [Pendentes para a Spec](#pendentes-para-a-spec--o-que-o-modo-autônomo-deixou) e
  [Ignorados sem motivo](#ignorados-sem-motivo--a-pergunta-que-volta-na-spec).

### `licao.registrar` · `bloqueio.registrar`

```bash
productdock state update --ref "<ref>" --type lesson  --content '{"title":"…","description":"…"}' --json
productdock state update --ref "<ref>" --type blocker --content '{"title":"…","description":"…","impact":"…","workaround":"…","resolution":"…"}' --json
```

Aprendizado que vale além deste Work Item — ao fechar a fila, depois da Validation PASS — vai para a
plataforma, **não para um arquivo local**. O `blocker` registra o que travou a fase.

### `artefato.publicar(<tipo>)`

```bash
productdock artifact submit <arquivo> --ref "<ref>" --phase <fase> --type <tipo> --json
```

O corpo vai **do arquivo em disco**, verbatim — sem transcrever para dentro de um argumento. Artefatos
repo-scoped vão no repositório do diretório — no guarda-chuva, o wrapper, sem flag; `--repository-name`
só no diretório linkado sem `project.repository` ([escopo](sync.md#escopo-de-projetorepositório)).

| Tipo        | Arquivo                            | `--phase`   | Quando                                                                                                                  |
| ----------- | ---------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `spec`      | `[ITEM_DIR]/spec.md`               | `specify`   | escrita a costura com PRD, **antes de apresentar a fila**                                                               |
| `plan`      | `[ITEM_DIR]/plan.md`               | `specify`   | escrita a costura sem PRD, **antes de apresentar a fila**, com as perguntas `a ratificar`                              |
| `tasks`     | `<pasta de envio>/tasks.md`        | `tasks`     | fila aprovada e auditada — e de novo, em modo full, a cada arquivo de tarefa acrescentado ou corrigido depois do envio |
| `qa-report` | `[ITEM_DIR]/qa-report.md`          | `qa-run`    | Validation PASS                                                                                                         |
| `implement` | `<pasta de envio>/implement.md`    | `implement` | Validation PASS, depois do `qa-report`                                                                                  |

**`spec` e `plan`.** A plataforma aceita `plan` como artefato de primeira classe, na mesma fase `specify`
da costura com PRD. Um spec ou plano de 200 kB é uma chamada normal. Re-submeta com o mesmo comando:

- quando uma descoberta posterior — no fatiamento, na auditoria — torna falsa uma afirmação da costura e
  ela é corrigida: dois enunciados divergentes é pior que um só;
- **`plan`**: aprovada a fila, atualizada a coluna `A resposta` das perguntas (`ratificada na aprovação`,
  ou a resposta verbatim) e corrigido o trecho que uma resposta mudou — **antes** de escrever `tasks/` e de
  submeter o `tasks`. O plano da plataforma nunca fica com uma premissa superada;
- **`spec`**: quando uma linha de [PRD pendente de ajuste](#prd-pendente-de-ajuste) fecha;
- na mudança de escopo vinda de decisão de produto do QA (`escopo deste WI`), aprovada a costura alterada.

**`tasks`** — o corpo é montado na pasta de envio a partir de `tasks/` ([O envelope `tasks/v1`](#o-envelope-tasksv1)).
Auditoria não condenada, nesta ordem: o submit, e então [`fase.entrar(implement)`](#faseentrarfase).
Veredito `a fila não serve` não sincroniza nada. Rejeição de envelope volta com o campo exato
(`phases.0.id`, por exemplo): corrija **aquele campo** e reenvie. **Regra de parada:** o mesmo campo
reclamado duas vezes é bloqueio — relate a mensagem do servidor ao humano e pare. Não varie campos às
cegas até passar; cada tentativa que passa grava artefato de verdade. Confira o **efeito** em
[`item.ler`](#itemler) (`tasks_progress`), não o `success` do submit. Conferido, apague o `tasks.md` da
pasta de envio; rejeitado, ou sem o efeito, ele fica.

**Status depois do envio** vai por [`tarefa.marcar`](#tarefamarcarstatus): o modo `patch` herda o corpo
Markdown no servidor, então não se remonta o `tasks.md` para mudar status. **Arquivo de tarefa
acrescentado ou corrigido depois do envio** — fix task da Validation, fix task de bug aberto, correção de
um arquivo já sincronizado — deixa o corpo da plataforma desatualizado, e `patch` não o corrige: remonte
`<pasta de envio>/tasks.md` a partir de `tasks/` e reenvie em modo **full**, com o mesmo comando, e apague
depois de conferir o efeito. O envelope remontado leva o **status atual** de cada tarefa — as já fechadas
vão `done`, a nova vai `pending`: o reenvio full substitui o envelope inteiro, e `pending` em tudo desfaz o
progresso que os `patch` gravaram. Ajuste `summary` de acordo.

**`qa-report`** — gerado localmente com o template da Validation; não se busca o artefato da plataforma.

**`implement`** — marca a Implementação como `done` (artefato `phase_artifacts`), com um resumo da
implementação validada. O resumo é corpo de envio: monte-o em `<pasta de envio>/implement.md`, **nunca**
em `[ITEM_DIR]`, e apague-o depois do submit com exit `0`; falhou, ele fica para o reenvio. `--status` já
é `done` por padrão. Isso fecha a fase de Implementação no nível do artefato (espelha o "concluir
implementação" do frontend — `markImplementationReadyManually`), independente da coluna do Kanban. As
duas chamadas da Validation PASS rodam sozinhas, nesta ordem: `qa-report`, `implement`.

**O que não se publica:** `artifact submit --phase define --type prd` grava o PRD sem passar pelo PM, e
não é caminho desta skill — o PRD é upstream. Os artefatos `design` e `test-design` também não: o
conteúdo deles está na costura e nas tarefas, e o Work Item mostra dois cards a menos.

#### O envelope `tasks/v1`

O artefato `tasks` é validado **fail-fast no servidor**: o corpo **tem que começar** com um bloco
` ```json ` com o envelope `tasks/v1`, antes de qualquer Markdown. É essa lista que o card _Implementação_
do Work Item renderiza. Sem o bloco, o servidor recusa (exit `1`, nada é gravado); envelope malformado
volta citando o campo.

Monte `<pasta de envio>/tasks.md` **a partir de `tasks/`**. Nesta ordem: o envelope, e depois o conteúdo
de cada arquivo de tarefa, íntegro, na ordem da numeração.

````
```json
{
  "schema": "tasks/v1",
  "title": "<WI-REF> — <título do Work Item>",
  "phases": [
    {
      "id": "F1",
      "name": "<a entrega, em uma frase>",
      "tasks": [
        { "id": "T01", "title": "<título da tarefa, sem o prefixo e sem o [repositório]>", "status": "pending", "parallel": false, "depends_on": [], "spec_ref": { "section": "<N>", "file": "<spec.md | plan.md>" } },
        { "id": "T02", "title": "<…>", "status": "pending", "parallel": false, "depends_on": ["T01"], "spec_ref": { "section": "<N>", "file": "<spec.md | plan.md>" } }
      ]
    }
  ],
  "summary": { "total_tasks": 2, "tasks_done": 0, "phases_total": 1, "phases_done": 0 }
}
```
````

Regras do envelope:

- **`T<nn>` é o prefixo numérico do arquivo.** `01-navegacao.md` → `T01`. A correspondência é 1:1 e não
  tem exceção: é ela que liga o que a plataforma mostra ao que existe em disco
- **Uma fase só, `F1`.** `phases` aqui é agrupamento da lista, não o vocabulário de fase do SDLC, e esta
  fila não tem fases — a ordem é a numeração. Não invente fases que a fila não tem
- **`parallel` é sempre `false`.** Neste backend a fila é estritamente sequencial: tarefa propaga
  descoberta e decisão para os arquivos seguintes, e paralelizar destrói isso. Não há ondas
- **`depends_on` é a tarefa imediatamente anterior**, pela mesma razão
- Todas `pending` na criação; `in-progress` ao despachar a tarefa e `done` ao fechá-la, ambos por
  [`patch`](#tarefamarcarstatus). Tarefa que abortou ou foi condenada fica `in-progress`. O status vem
  **deste campo**, nunca de checkbox de prosa
- **`spec_ref` é o trecho da costura que a tarefa executa**, copiado da linha **Trecho da costura** do
  arquivo dela: `section` é o número da seção (`§N`, contando as seções `##` da costura a partir de 1) e
  `file` é o arquivo da costura — `spec.md` na entrada com PRD, `plan.md` na sem PRD. O Work Item mostra
  `spec §N · arquivo` embaixo do nome da task. Opcional: tarefa sem a linha — a fix task de bug, por
  exemplo — sai sem `spec_ref`, e nunca com `section` ou `file` vazios — o servidor recusa o envelope
  citando o campo
- **O `tasks.md` não mora em `[ITEM_DIR]`.** Quem manda é `tasks/`; o `tasks.md` existe só entre a
  montagem e o envio, na pasta de envio, e se apaga com o envio confirmado

O bloco de finalização do fatiamento traz, neste backend, a linha
`Plataforma: <spec|plan> v<n> · tasks v<n> · fase implement · coluna Desenvolvimento`.

### `tarefa.marcar(<status>)`

**Despacho** — antes de despachar o implementador:

```bash
productdock artifact submit --ref "<ref>" --phase tasks --type tasks \
  --mode patch --patch '{"tasks":[{"id":"T03","status":"in-progress"}]}' --json
```

É o que faz a tela mostrar qual tarefa está rodando, e não só quais terminaram.

**Fecho** — fechou, e só quando fechou, em duas chamadas: o status da tarefa e o progresso da fila.

```bash
productdock artifact submit --ref "<ref>" --phase tasks --type tasks \
  --mode patch --patch '{"tasks":[{"id":"T03","status":"done"}]}' --json

productdock state update --ref "<ref>" --type phase_progress \
  --content '{"phase":"implement","fase_index":3,"fase_total":7,"fase_name":"<título da tarefa>"}' --json
```

- O modo `patch` herda o corpo Markdown e devolve `patched[]` — que é a **prova** de que o envelope foi
  lido. No modo `full`, `success: true` diz só que a chamada foi aceita.
- **`patched[]` vazio é falha silenciosa:** relate e pare de mandar `patch` — o `in-progress` e o `done` —,
  mas **não pare a corrida** por isso.
- No `phase_progress`, `fase_index` é a posição da tarefa na fila **inteira** — o número do arquivo,
  `03-…` → `3` —, e `fase_total` é o total de arquivos em `tasks/`, mesmo em corrida de tarefa única; o
  `fase_name` é o título da tarefa, o mesmo do envelope. `ignored_fields` não vazio na resposta é a mesma
  falha silenciosa: relate, pare de mandar `phase_progress`, e siga.
- Tarefa que abortou, foi condenada pela revisão ou teve o subagent interrompido **fica `in-progress`** —
  não volta a `pending`, não vira `done`: é assim que a plataforma mostra onde a fila parou.
- Fechada a última tarefa **não há `phase_progress` de fechamento**: confira o efeito em
  [`item.ler`](#itemler) — `tasks_progress` todas `done` e `implementation_complete: true` — e então
  [`fase.entrar(validation)`](#faseentrarfase).

A coluna `Plataforma` do relatório da corrida é `T<nn> done <i>/<n>` (o `phase_progress` enviado),
`T<nn> in-progress` na tarefa em que a corrida parou, ou o motivo de não ter sido registrada.

### `tech-review.pegar` · `.ler` · `.enviar` · `.devolver`

| Operação               | Comando                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `tech-review.pegar`    | `productdock prd-review claim <ref> --json --out <pasta de envio>/prd-review-claim-r<n>.json`                           |
| `tech-review.ler`      | `productdock prd-review get <ref> --json --out <pasta de envio>/prd-review-before-r<n>.json`                            |
| `tech-review.enviar`   | `productdock prd-review submit <pasta de envio>/prd-review-r<n>.md --ref <ref> --job-id <job.id> --json --out <pasta de envio>/prd-review-round-r<n>.json` |
| `tech-review.devolver` | `productdock prd-review release <ref> --json`                                                                           |

O procedimento inteiro — o pedido, o read-back, a rodada N+1, os limites, o envio, as recusas — está em
[Tech Review com o PM](#tech-review-com-o-pm). O modo autônomo não roda `claim` nem `release`.

### `fluxo.encurtar`

`state update --type flow_change` e reler `state phase`: [Fluxo Rápido](#fluxo-rápido).

---

## Quando sincronizar

Cada célula lista **todos** os comandos daquela etapa, na ordem. Etapa com duas operações (artefato **e**
estado) precisa das duas: executar uma e considerar a etapa fechada é o erro clássico — nenhum erro
aparece, e o card fica desatualizado. Todos com `--json`.

| Evento                                      | Artefato local                    | Comandos, na ordem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Iniciar o Work Item                         | —                                 | 1. `state update --ref <ref> --type phase_change --content '{"phase":"specify"}'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| PRD buscado                                 | salvar `prd.md`                   | — (já está na plataforma)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| PRD Tech Review fechado (com PRD)           | parecer na pasta de envio         | 0. antes da análise: `prd-review claim <ref> --out <pasta de envio>/prd-review-claim-r<n>.json` — o `job.id`<br>1. depois do handoff antecipado: `prd-review submit <pasta de envio>/prd-review-r<n>.md … --job-id <job.id> --out <pasta de envio>/prd-review-round-r<n>.json` (só `pm`/`tech_prd_edit`) — **só com pedido pego**; `job: null` não submete nada<br>2. `state update … --type review --content '{"phase":"prd-tech-review","status":"…","iteration":N}'`<br>3. decisões técnicas que valem além do WI, `--type decision`<br>4. apagar os arquivos da rodada<br>— revisão abandonada antes do envio: `prd-review release <ref>`<br>— **modo autônomo**: sem `claim` nem handoff; 1 com o `--job-id <job_id>` do runner, 1 e 2 com os nomes de arquivo dele, `--type decision` para **toda** questão técnica, como pendência `[Pendente para a Spec] `, e o passo 4 não existe — a pasta é do runner ([prd-review-autonomo.md](../discovery/prd-review-autonomo.md)) |
| Fluxo Rápido confirmado pelo humano         | —                                 | 1. `state update … --type flow_change --content '{"flow_mode":"fast"}'`<br>2. reler `state phase` para o `uses_plan` novo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Handoff fechado (entrada com PRD)           | —                                 | 1. `state update … --type review --content '{"phase":"specify","status":"pass","iteration":N}'`<br>2. as decisões que valem além do WI, uma a uma, `--type decision`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Costura escrita                             | salvar `spec.md` **ou** `plan.md` | 1. `artifact submit spec.md … --phase specify --type spec`<br>— sem PRD: `artifact submit plan.md … --phase specify --type plan`<br>2. apagar `attachments.json`, `attachments/` e os `eval-*.json` da pasta de envio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Fila aprovada (sem PRD)                     | corrigir `plan.md`                | 1. `artifact submit plan.md … --phase specify --type plan` com `A resposta` atualizada — **antes** de escrever `tasks/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Fila aprovada e auditada                    | salvar `tasks/`                   | 1. montar `<pasta de envio>/tasks.md` a partir de `tasks/` e `artifact submit <pasta de envio>/tasks.md … --phase tasks --type tasks` (envelope validado fail-fast)<br>2. `state update … --type phase_change --content '{"phase":"implement"}'`<br>3. efeito conferido em `tasks_progress`: apagar o `tasks.md` da pasta de envio<br>4. `state update … --type review --content '{"phase":"tasks","status":"pass","iteration":1}'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Arquivo de tarefa corrigido depois do envio | corrigir `tasks/`                 | 1. remontar `<pasta de envio>/tasks.md`, com o status atual de cada tarefa, e `artifact submit … --phase tasks --type tasks` em modo **full**<br>2. efeito conferido: apagar o `tasks.md` da pasta de envio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Bugs abertos ao iniciar ou retomar          | `tasks/` + uma fix task por lote  | 1. `state phase` com `open_qa_bugs > 0`: `wi bugs <ref> --status open --out <pasta de envio>/qa-bugs-open.json`, antes da tabela de retomada<br>2. aprovadas as fix tasks: remontar `<pasta de envio>/tasks.md` com o status atual de cada tarefa e `artifact submit … --phase tasks --type tasks` em modo **full**<br>3. efeito conferido: apagar `tasks.md` e `qa-bugs-open.json` — **nada** de `qa-issue` nem `resolved`; ver [Bugs da aba Qualidade](#bugs-da-aba-qualidade)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Tarefa despachada                           | —                                 | 1. `artifact submit … --phase tasks --type tasks --mode patch --patch '{"tasks":[{"id":"T<nn>","status":"in-progress"}]}'` — `patched[]` é a prova                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Tarefa fechada                              | —                                 | 1. `artifact submit … --phase tasks --type tasks --mode patch --patch '{"tasks":[{"id":"T<nn>","status":"done"}]}'` — `patched[]` é a prova<br>2. `state update … --type phase_progress --content '{"phase":"implement","fase_index":<nº do arquivo>,"fase_total":<arquivos em tasks/>,"fase_name":"<título da tarefa>"}'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Fila fechada                                | —                                 | 1. conferir `tasks_progress` em `state phase` (todas `done`, `implementation_complete: true`) — não há `phase_progress` de fechamento<br>2. `state update … --type phase_change --content '{"phase":"validation"}'`<br>3. decisões e lições que valem além do WI: `--type decision` e `--type lesson`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Linha de PRD pendente de ajuste fechada     | `prd.md` de novo + `spec.md`      | 1. `wi prd <ref>` e regravar `prd.md`<br>2. tirar a linha do `spec.md` e `artifact submit spec.md … --phase specify --type spec`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Validation PASS                             | salvar `qa-report.md`             | 1. `artifact submit qa-report.md … --phase qa-run --type qa-report`<br>2. montar `<pasta de envio>/implement.md`, `artifact submit <pasta de envio>/implement.md … --phase implement --type implement` e apagá-lo<br>3. lição que vale além do WI: `--type lesson`<br>— **handoff manual**: o usuário move o card para `review`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

> Na Validation PASS, marque a Implementação como `done` **no artefato** (`--status` já é `done` por
> padrão). O **status do Kanban** (ida para `review` / "Aguardando Testes") é movido **manualmente** pelo
> usuário — a skill não o altera.

## Sinais da retomada

A tabela de retomada do `SKILL.md` decide por **sinais**. Neste backend, cada um vem daqui — a costura e a
`tasks/` do disco, o resto da plataforma:

| Sinal                                            | De onde vem no `productdock`                                                                                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a entrada (com PRD × sem PRD)                    | `uses_plan` de [`item.ler`](#itemler)                                                                                                                                |
| costura que contradiz a entrada                  | `spec.md` **e** `plan.md` juntos em `[ITEM_DIR]`, ou `spec.md` com `uses_plan: true`, ou `plan.md` com `uses_plan: false`                                             |
| há bug aberto                                    | `open_qa_bugs > 0` em `item.ler`, e a lista de [`bugs.abertos`](#bugsabertos) — `count: 0` na lista é "não há"                                                      |
| bug aberto sem fix task                          | o `BUG-N` da lista que não aparece em nenhuma linha **Bug** de um arquivo de `tasks/`                                                                                |
| Validation PASS / FAIL                           | o veredito do `[ITEM_DIR]/qa-report.md` em disco — o artefato da plataforma não se busca                                                                            |
| todas as tarefas `done`                          | `tasks_progress` com todas `done` (e `implementation_complete: true`). `qa-report.md` PASS com `done < total` é de uma fila anterior às fix tasks: não vale          |
| há fila aprovada, com tarefa por fazer           | `tasks/` com arquivo **e** `tasks_progress` preenchido com `done < total`                                                                                            |
| onde a corrida parou                             | a tarefa `in-progress` em `tasks_progress` — sugestão ao humano, nunca decisão, inclusive sobre recomeçar do zero ou do que ficou na árvore                          |
| fila sem registro na plataforma                  | `tasks/` com arquivo e `tasks_progress` **nulo**                                                                                                                     |
| corpo de envio esquecido                         | `tasks.md` em `[ITEM_DIR]`, sem `tasks/`                                                                                                                             |
| costura escrita, sem fila                        | `spec.md` ou `plan.md` em `[ITEM_DIR]`, sem `tasks/`                                                                                                                 |
| PRD sem costura (com PRD)                        | `prd.md` em `[ITEM_DIR]` sem costura — o Tech Review se refaz, e o [read-back](#pegar-o-pedido-e-o-read-back) faz dela rodada N+1                                   |
| plataforma adiantada, disco vazio                | [`item.ler`](#itemler) mostra costura, fila ou tarefas concluídas (`artifacts_found`, `tasks_progress`) **e** `[ITEM_DIR]` não existe ou não tem a costura — outro checkout, outra máquina, outra branch: **pare e pergunte** onde está o checkout; não recomece o fluxo nem recrie a fila por cima |
| nada                                             | `[ITEM_DIR]` vazio ou ausente, e a plataforma sem costura nem fila                                                                                                   |

Sessão perdida **antes** da costura recomeça o Work Item: os gates já aprovados estão na plataforma
(`state update --type review`), não em disco, e não se leem para retomar. Depois da costura, retoma no
fatiamento lendo `spec.md` ou `plan.md`, sem refazer lookup nem reabrir handoff. Na corrida, o que está na
árvore de trabalho e o `task.status` do envelope na plataforma são o único registro.

## Fluxo Rápido

O gravar do `flow_mode` (PROD-144). O protocolo de sugestão — avaliação, apresentação, proibição, recusa —
é do `SKILL.md`; este backend dá o gatilho e o comando.

**Gatilho** — avaliar só quando as quatro valem juntas, lidas de [`item.ler`](#itemler): `uses_plan: false`,
`work_item_type: 'improvement'`, `flow_mode: 'full'`, status em `backlog`/`prd`/`specification`. Qualquer
uma faltando: **não sugerir**. São as mesmas quatro que o servidor confere.

Sugerir o Fluxo Rápido sem gravá-lo não muda nada: o roteamento lê `uses_plan`, que o servidor deriva do
`flow_mode`. **Confirmado pelo humano, grave** — é este o comando:

```bash
productdock state update --ref "<ref>" --type flow_change \
  --content '{"flow_mode":"fast"}' --json
```

Quatro checagens rodam no servidor, nesta ordem, e qualquer uma recusa a chamada com exit `1`:

| #   | Checagem         | Recusa quando                                                              |
| --- | ---------------- | -------------------------------------------------------------------------- |
| 1   | valor            | `flow_mode` não é `'full'` nem `'fast'`                                    |
| 2   | acesso           | quem chama não participa do projeto (nem é org-admin)                      |
| 3   | tipo             | `work_item_type` ≠ `improvement`                                           |
| 4   | janela de status | status fora de `backlog`, `prd`, `specification` — a mensagem traz a lista |

- **`--dry-run` valida as quatro sem gravar.** Use-o quando a sugestão for limítrofe: ele responde se a
  troca seria aceita antes de você levá-la ao humano.
- **A prova de que gravou é `previous_flow_mode`**, não o `success`. A resposta traz
  `{ success, work_item_id, flow_mode, previous_flow_mode, … }`; `previous_flow_mode: "full"` com
  `flow_mode: "fast"` é a troca que aconteceu.
- **A recusa é exit `1`, não `2`** — erro de negócio, não queda de canal. Leve a mensagem ao humano: ela
  diz qual das quatro barrou.
- Depois de gravar, **releia `productdock state phase <ref> --json`**: é de lá que sai o `uses_plan` que
  roteia, e é ele — não o `flow_mode` que você acabou de mandar — a fonte do roteamento.

> **Nunca grave sem confirmação humana explícita nesta conversa.** Silêncio, "pode seguir" genérico e
> decisão anterior sobre outro Work Item **não** são confirmação. A troca inversa (`fast → full`) nunca é
> sugerida pelo agente — só se o humano pedir, e aí é o mesmo comando com `{"flow_mode":"full"}`.

**Levantamento que desmente a entrada sem PRD** — contrato público consumido por outro repositório, regra
de negócio sem dono, decisão de produto em aberto —: **não grave `flow_change` e não sugira a troca**. A
decisão é do humano: pedida a troca, vale o comando acima; em tipo sem troca (`bug`, `incident`,
`technical_debt`), o registro vai a `Riscos` e `Não resolvido` da costura, e reclassificar o Work Item é
com ele, na plataforma.

## Tech Review com o PM

Neste backend quem decide o produto é o PM, pela plataforma, e o parecer do PRD Tech Review entra nela.
O que vale nos dois backends — o eixo `owner`, a regra de conteúdo, a retriagem, as premissas, as
alternativas, o handoff antecipado, a forma do envelope — está no [prd-review.md](../discovery/prd-review.md).
Aqui está o que só existe com o PM remoto.

> **Consultivo não quer dizer "tudo vai ao PM".** Técnico se responde no chat, nesta sessão; só negócio
> vai ao PM. Mandar decisão técnica ao PM não é cautela: é um deadlock, porque ele não tem como responder.

`productdock watch` é pré-requisito **só** do [modo autônomo](../discovery/prd-review-autonomo.md); sem
ele, o Tech Review segue pelo interativo, na IDE. Numa conversa com o humano, é sempre o interativo.

### O pedido de Tech Review — o parecer só entra por ele

O ciclo do PRD tem **cinco status**: **Rascunho**, **Publicada**, **Com bloqueios**, **Com lacunas** e
**Aprovada**. Quando o PM publica uma versão, a plataforma abre um **pedido de Tech Review** daquele Work
Item, e o PRD fica **Publicada** enquanto o pedido está na fila ou em execução — "na fila", "em execução"
e "falhou" são estados do **pedido**, nunca do PRD. **O parecer só entra na plataforma por esse pedido**:
o servidor recusa, sem gravar nada, a rodada que não chega por um pedido aberto.

Por isso o interativo **pega o pedido do Work Item antes de analisar** e envia amarrado a ele
(`--job-id`, na [Entrega](#entrega)). Enquanto o pedido é desta sessão, o card do PRD mostra "Tech Review
em execução" e o editor fica bloqueado para o PM — só a execução trava o PRD: na fila e com falha o PM
edita o rascunho sobre a versão publicada, e publicar a versão seguinte cancela o pedido da anterior
(`replaced_by_new_request`) e enfileira um novo. Abandonando a revisão, **devolva o pedido à fila**
([Abandonar a revisão](#abandonar-a-revisão--devolver-o-pedido)).

- **Pedido pego** → a revisão segue o procedimento inteiro e é **submetida uma vez**, pelo pedido.
- **Sem pedido para pegar** — o PRD já está **Aprovada** ao iniciar a Spec, está em **Rascunho**, ou o
  pedido já está em execução por outro (o `productdock watch`) → a revisão roda igual, mas **não submete
  nada** ([Sem pedido aberto](#sem-pedido-aberto--a-revisão-que-não-volta-ao-prd)).

### Pegar o pedido e o read-back

No Passo 1 do Tech Review, depois de [`prd.obter`](#prdobter) — complementado por
[`item.buscar`](#itembuscar) e pelo `wi spec-context` de [`insumos.ler`](#insumosler) para domínio e PRDs
irmãos —, **antes de qualquer análise**:

```bash
productdock prd-review claim <ref> --json --out <pasta de envio>/prd-review-claim-r<n>.json
```

- `.data.job` com um pedido → guarde o **`job.id`**: é o `--job-id` do envio. O pedido é desta sessão
  por **60 minutos**, renovados a cada `productdock prd-review get <ref>` que ela roda — não há comando
  de heartbeat. Sessão que passa de 60 minutos sem um read-back perde o pedido, que volta à fila.
- `.data.job: null` com exit `0` → **não há pedido para pegar**: siga a análise, mas o caminho é o de
  [Sem pedido aberto](#sem-pedido-aberto--a-revisão-que-não-volta-ao-prd) — nada será submetido.
- exit `1` aqui é sem `link` ou sem permissão de editar Work Item.

**Obrigatório: o read-back no mesmo passo**, antes de cada rodada, sem exceção:

```bash
productdock prd-review get <ref> --json --out <pasta de envio>/prd-review-before-r<n>.json
```

Ele devolve, em `.data`, **uma linha por `finding_key`** — a mais recente de cada achado, sem perder os
antigos — com o `status`, a **decisão** com que o PM resolveu ou o **motivo** com que ignorou, o estado
anterior do arquivado (`archived_from_status`), a classe (`finding_class`: Bloqueio, Lacuna, Observação ou
Sugestão) e a origem na rodada (`round_origin`); o `summary` por status; o **`last_review`** — o parecer
anterior: a rodada, o `reviewed_brief_version` que ele revisou, o `skill_version`, o `review_rules` e o
corpo —; e o **`next_round`**, o número desta rodada. **Não traz conversa do PM** — a plataforma não tem
respostas nos achados: o que o PM decidiu é o **estado** do achado, a decisão ou o motivo que ele deu, e o
texto do PRD que ele publicou. Não procure resposta humana nas mensagens. `wi prd` sozinho traz só o texto
do PRD; sem esse read-back a rodada seguinte reemite achados que o PM já fechou (foi exatamente o
incidente PROD-134).

- **O número da rodada é o `next_round`** — a numeração que a plataforma já usa: os Tech Reviews
  concluídos do PRD, somando todas as versões publicadas, inclusive os feitos antes das
  [regras convergentes](#o-que-entra-como-achado-novo--rodadas-incrementais), mais um. Não o recalcule
  pelo `count`: um parecer anterior sem achado nenhum conta como rodada. É o `<n>` dos nomes de arquivo.
- `next_round: 1` → é a **rodada 1** (revisão nova).
- `next_round` maior que 1 → é uma **rodada N+1**: aplicar o protocolo da
  [Rodada N+1](#rodada-n1--o-estado-de-cada-achado) antes de escrever o parecer. Conferir `summary.open`
  antes de montar a rodada — achado ignorado não volta, e Observação ou Sugestão resolvida também não.
- Read-back sem `next_round` (plataforma anterior a ele) → `count: 0` é a rodada 1; `count > 0` é uma
  rodada N+1 tratada **como segunda rodada** — sem o número, o
  [corte da terceira rodada](#o-que-entra-como-achado-novo--rodadas-incrementais) não se aplica. Diga isso
  no corpo do parecer.
- Exit `1` porque o WI não tem revisão nenhuma **não existe**: WI sem revisão volta exit `0` com
  `count: 0`.

Da segunda rodada em diante, os três
[insumos da rodada incremental](#os-insumos-da-rodada-incremental--versão-anterior-parecer-anterior-e-diferenças).

O mesmo read-back alimenta os [ignorados sem motivo](#ignorados-sem-motivo--a-pergunta-que-volta-na-spec),
e o `wi spec-context` as [pendências para a Spec](#pendentes-para-a-spec--o-que-o-modo-autônomo-deixou).

### O que o envelope leva à plataforma

Sobre os campos comuns do `prd-review/v1` ([prd-review.md](../discovery/prd-review.md)), o envio a este
backend leva:

- **`reviewed_brief_version`** — a versão do PRD que a rodada **efetivamente revisou**: a `.data.version`
  do `wi prd` que alimentou o parecer, inteiro positivo. Mande sempre. É por ela que a plataforma ancora as
  threads na versão certa: versão anterior à atual marca o parecer como **desatualizado**, e ele não muda o
  status nem o selo do PRD; versão maior que a atual é recusada (exit `1`). Omitido, o servidor trata o
  parecer como revisão da versão atual — compatível, mas cego a um PRD que mudou durante a rodada.
- **`skill_version`** — o `metadata.version` do `SKILL.md` desta skill, em todo parecer. É por ele que se
  sabe qual comportamento do Tech Review produziu cada rodada: a plataforma o registra no pedido.
- **`review_rules`** — `"convergent/v1"`, em todo parecer: marca que a rodada seguiu as
  [regras convergentes](#o-que-entra-como-achado-novo--rodadas-incrementais). É por esse marcador, lido no
  `last_review` da rodada seguinte, que se sabe se o corte da terceira rodada já pode valer.
- **`attention_points`** — os [pontos de atenção](#pontos-de-atenção-e-os-limites): um item
  `{ "text", "reason" }` por ponto, o mesmo que o corpo lista. Nenhum ponto fora ⇒ `[]`.
- **`findings[].owner` — só `pm` e `tech_prd_edit`.** O roteamento é da skill, **antes** de submeter: um
  finding `tech` no envelope é thread no PRD, e é exatamente o vazamento que a retriagem fecha. Os `tech` e
  o que é só informação ficam no corpo markdown, como informativo. Se o servidor recusar o envelope por causa do campo
  `owner` (exit `1`, nada gravado — ele diz o que corrigir), remova-o dos findings e mantenha o roteamento
  pelo corpo do parecer: o eixo não depende de o backend persistir o campo.
- **`findings[].kind`** — `"premissa"` nos dois modos; `"inviavel"` **só no
  [modo autônomo](../discovery/prd-review-autonomo.md)**, no `tech_prd_edit` reescrito para o PM, com
  as alternativas no lugar do texto substituto. No interativo o `tech_prd_edit` chega ao PM com a decisão
  já tomada, sem `kind`. O `pm` comum sai sem `kind` nos dois. Omitido, o servidor trata o achado como
  padrão — e a premissa continua reconhecível pelo título (`"Premissa: "`) e pelo fecho do `body`
  (`"Confirme ou corrija."`), que não saem.
- **`findings[].alternatives`** — só com `kind: "inviavel"`: 2 a 3 itens `{ "label", "title", "impact" }`,
  na ordem do `body`; o `body` mantém as alternativas em texto, com a mesma letra. Omitido, a plataforma
  mostra o achado com as opções de achado sem sugestão, e as alternativas aparecem no corpo.
- **`findings[].suggestion`** — é por ele que a resposta do handoff antecipado chega ao PM:
  - `pm` com resposta no handoff → `"Sugestão do time técnico: <a resposta, verbatim>"`. Sem resposta, vai
    sem essa linha — o `suggestion` do parecer, se houver, segue como está.
  - `tech_prd_edit` → a decisão tomada no handoff, em linguagem de negócio, **e** o texto de substituição
    pronto: `"Decidido pelo time técnico: <decisão>. Substituir o trecho citado por: \"<texto>\""`. O PM
    ratifica; não há pergunta a responder.
- **`findings[].key`** — a do achado; reemitir ⇒ a mesma `key` que veio no `prd-review get`. É por ela que
  a plataforma reaproveita a thread, preservando o estado que o PM deu, o histórico e o código do achado no
  painel. Chave diferente = thread nova = o estado se perde. Se a `key` for omitida, o backend deriva uma
  de `category|title|anchor.quote` — funciona, mas quebra a continuidade se o PM editar o trecho. `owner`
  que muda entre rodadas (de `pm` para `tech`) tira a thread do `findings[]`, e a plataforma a marca
  `superseded`: diga por quê no corpo, para o PM não ler o sumiço como item sanado.

Plataforma que ainda não conhece `review_rules`, `attention_points`, `kind` ou `alternatives` recusa o
envelope (exit `1`, nada gravado, a mensagem nomeia o campo): tire o campo nomeado e reenvie — os pontos,
a contagem e as alternativas continuam no corpo, que é onde a transparência se sustenta.

**Veredicto e contagens.** O `summary.verdict` e as contagens se derivam **só dos findings `pm` e
`tech_prd_edit`** — que são, depois da retriagem, os únicos no `findings[]`. Os `tech` não entram na
contagem e não pintam o card do PRD; um PRD cujos únicos bloqueios são técnicos sai `approved`.
`summary.gaps` conta só as **Lacunas** — as Observações não entram nele. `summary.tech_decisions` é
informativo: conta os `tech` que o antecipado fechou nesta rodada. O `verdict` é **informativo**: o status
do PRD não sai dele, e sim dos achados, no servidor.

**As classes que o PM vê.** As seis `category` do envelope continuam — é por elas que a análise distingue
o achado —, mas o painel do PRD as agrupa em **quatro classes**, derivadas no servidor da categoria e da
severidade: **Bloqueio** (`blocking`, inclusive a premissa grave), **Lacuna** (`gap`, `question`,
`overlap` de severidade `critical`, `high` ou `medium`), **Observação** (`gap`, `question`, `overlap` de
severidade `low` ou `info`, e a premissa que não é Bloqueio) e **Sugestão** (`improvement`, `naming`). O
PM resolve Bloqueio e Lacuna — com uma decisão —, e pode resolver ou **ignorar** Observação e Sugestão;
só Bloqueio e Lacuna abertos seguram a aprovação do PRD. O read-back traz a classe de cada achado em
`finding_class`; achado anterior a ela vem sem classe, e vale a mesma regra aplicada à categoria e à
severidade.

### O gate do PM

**Só `owner: "pm"` com `category: "blocking"` bloqueia o lookup** — espera o PM. Os `tech` e os
`tech_prd_edit` fecham no handoff antecipado **antes** do envio e do lookup, e suas respostas entram como
insumo dele. O veredicto e o bloqueio ignoram os `tech`.

O que aguarda o PM é **só** o que é dele: o PRD em **Com bloqueios** ou **Com lacunas** significa que há
achado `pm`/`tech_prd_edit` aberto; o resto espera o PM **sem** segurar ninguém. Com o PRD **Aprovada**,
segue para o lookup. Um WI cujos bloqueios eram todos técnicos não espera ninguém. Os `tech_prd_edit`
também não seguram a costura: ela segue a decisão do handoff, e a contradição fica em
[PRD pendente de ajuste](#prd-pendente-de-ajuste).

> Se o parecer travar o fluxo sobre um achado que o humano na cadeira responderia em segundos, o `owner`
> está errado — não o humano. Reclassifique.

### O antecipado neste backend

O handoff antecipado abre havendo qualquer finding, qualquer
[pendência para a Spec](#pendentes-para-a-spec--o-que-o-modo-autônomo-deixou) ou qualquer achado
[ignorado sem motivo](#ignorados-sem-motivo--a-pergunta-que-volta-na-spec). Além dos itens obrigatórios
(`tech`, `tech_prd_edit`, sem `owner`), leva:

| Item                  | `obrigatorio` | O `corpo` traz                                          | Fecha com                                    | `sugestoes`                                                                                    |
| --------------------- | ------------- | ------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pm`                  | `false`       | o achado como vai ao PM                                 | `Default`: enviar ao PM sem sugestão         | as respostas que o time técnico sugeriria                                                      |
| pendência para a Spec | `true`        | a pergunta, a evidência `caminho:linha`, a linha `Muda` | `Muda`                                       | as opções da pendência                                                                         |
| ignorado sem motivo   | `false`       | o que o achado apontava e que o PM o ignorou sem motivo | `Default`: seguir a Spec sem tratar o ponto  | as saídas técnicas defensáveis e _"não se aplica — seguir sem tratar"_                        |

Um handoff só de `pm` fecha sem resposta nenhuma, e o parecer segue como foi escrito. **A resposta a um
`pm` não decide nada**: ela vira `"Sugestão do time técnico: …"` na thread, e quem responde continua sendo
o PM. Todo `tech_prd_edit` que sai do antecipado é uma linha de [PRD pendente de ajuste](#prd-pendente-de-ajuste)
no `spec.md`: a `key`, o trecho atual, o texto proposto — guarde-as no contexto até a costura. Resposta que
transforma um `tech` em `tech_prd_edit` diz isso no chat.

### Entrega

A ordem é fixa: **retriar → handoff antecipado → submeter uma vez, pelo pedido → registrar o gate.** Nada
sai para o PM antes de o handoff fechar, e nenhuma rodada é reemitida para "fechar os técnicos": eles nunca
foram enviados. Sem pedido pego, siga [Sem pedido aberto](#sem-pedido-aberto--a-revisão-que-não-volta-ao-prd).

1. **Submeter o parecer — uma vez, pelo pedido**, com o envelope `prd-review/v1` no topo do arquivo, **só
   os `pm` e `tech_prd_edit`** no `findings[]`, `skill_version`, `review_rules: "convergent/v1"`,
   `reviewed_brief_version` e os `attention_points` — com a seção **Pontos de atenção** e a contagem no
   corpo. O handoff demorou? Rode o read-back de novo (`prd-review get <ref> --json`) logo antes: ele
   renova o pedido desta sessão e mostra o estado atual.

   ```bash
   productdock prd-review submit <pasta de envio>/prd-review-r<n>.md --ref <ref> --job-id <job.id> --json \
     --out <pasta de envio>/prd-review-round-r<n>.json
   ```

   O `--job-id` é o `job.id` que o `claim` devolveu — **nunca** submeta sem ele: sem pedido, o servidor
   recusa a rodada e não grava nada.

   **O parecer mora na pasta de envio, com o número da rodada no nome** — `prd-review-r1.md`,
   `prd-review-r2.md`, e assim por diante —, e **não** em `[ITEM_DIR]`. Nunca escreva o arquivo com nome
   nu (`prd-review.md`): nome nu resolve no diretório corrente, que é a raiz do repositório, e colide entre
   Work Items. Não há rastro local das rodadas: a plataforma guarda o histórico, e `prd-review get` o
   devolve — comparar rodadas é o read-back, não um arquivo em disco. Lida a resposta, apague da pasta de
   envio os arquivos da rodada — o parecer, o `prd-review-claim-r<n>.json`, o `prd-review-before-r<n>.json`,
   o `prd-review-round-r<n>.json` e o `prd-v<versão>.json`, quando houver. Envio recusado não apaga nada: o
   arquivo é o que você corrige e reenvia.

   O corpo vai do arquivo em disco, verbatim — o bloco cercado ` ```json ` continua sendo a primeira coisa
   dele, e um corpo sem ele é recusado (exit `1`, nada gravado). A operação grava as threads inline no
   PRD, **fecha o pedido** e move o status do PRD — não há outro caminho para registrar o resultado do Tech
   Review. Sem nenhum `pm` nem `tech_prd_edit`, submeta assim mesmo: o envelope de `findings` vazio
   registra a rodada, fecha o pedido e leva o PRD a **Aprovada**.

   **O status do PRD sai dos achados, no servidor** — por este caminho e pelo do modo autônomo, a mesma
   regra: nenhum Bloqueio nem Lacuna aberto → **Aprovada**, e a versão segue para a Spec — Observações e
   Sugestões abertas não seguram; algum Bloqueio aberto → **Com bloqueios**; Lacunas abertas sem nenhum
   Bloqueio → **Com lacunas**. Parecer de versão anterior à atual (`reviewed_brief_version`) chega marcado
   como desatualizado e não move nada. O texto do PRD nunca é alterado pelo envio.

   **A resposta (em `.data`) confirma o que aconteceu** — é ela que decide a rodada seguinte, então leia-a,
   não presuma pelo exit `0`:

   - `threads_updated` — achados reemitidos que reaproveitaram a thread aberta;
   - `threads_reopened` — Bloqueios e Lacunas resolvidos sem decisão que você reemitiu porque continuam no
     texto: a thread voltou a aberta. Achado resolvido **com decisão** entre eles é falha da Rodada N+1 — a
     decisão não se reabre;
   - `threads_skipped_closed` — achados ignorados, ou Observações e Sugestões resolvidas, que você reemitiu
     por engano: **nada** foi postado para eles. Diferente de zero, a Rodada N+1 falhou em respeitar o
     estado — confira a tabela antes da próxima rodada;
   - `threads_superseded` — achados que saíram do parecer (considerados sanados);
   - `threads_created` — achados novos desta rodada;
   - `review_round` — o número da rodada.

   > Sinal de alerta: `threads_created` alto numa rodada N+1 com `threads_updated` e `threads_reopened` em
   > zero quase sempre significa `key` inconsistente entre rodadas — confira as chaves antes de seguir.

   **Envio recusado por causa do pedido** — exit `1`, nada gravado:

   | `data.code` da recusa        | O que aconteceu                                                                                                    | O que fazer                                                                                                                                                                                                                                        |
   | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `prd_review_job_not_running` | o pedido não está mais com esta sessão: o PM o cancelou, ou passou de 60 minutos sem read-back e ele voltou à fila | **Não reenvie sem `--job-id`.** Rode `prd-review claim <ref>` uma vez: voltou um pedido → reenvie com o `job.id` novo; `job: null` → o PM cancelou e o PRD voltou a **Rascunho**: siga [Sem pedido aberto](#sem-pedido-aberto--a-revisão-que-não-volta-ao-prd) |
   | `prd_review_job_not_found`   | o `--job-id` não é um pedido deste Work Item                                                                       | confira o `job.id` no arquivo do `claim` e reenvie                                                                                                                                                                                                 |
   | `prd_review_job_required`    | o envio saiu sem `--job-id` e a versão não tem pedido aberto                                                       | não force: é o caso de [Sem pedido aberto](#sem-pedido-aberto--a-revisão-que-não-volta-ao-prd)                                                                                                                                                     |

2. **Registrar o gate** — [`gate.registrar(prd-review)`](#gateregistrargate), com `phase: prd-tech-review` no conteúdo:

   ```bash
   productdock state update --ref <ref> --type review \
     --content '{"phase":"prd-tech-review","status":"<pass|issues|questions>","iteration":<n>,"issues":…,"questions":…}' --json
   ```

   **São duas operações**: submeter o parecer não registra o gate, e registrar o gate não submete o
   parecer.

3. **As decisões técnicas que valem além do WI**, uma a uma — [`decisao.registrar`](#decisaoregistrar).

> **Fechar o loop do PRD exige o PM.** A CLI não tem comando que proponha edição ao PRD — `wi` só lê, e
> `prd-review` só pega o pedido, lê e submete achados; `artifact submit --phase define --type prd` grava o
> PRD sem passar pelo PM, e não é caminho desta skill (o PRD é upstream). O `tech_prd_edit` é o pedido de
> edição possível hoje: um achado com o texto pronto, que o PM ratifica editando o PRD e publicando a
> versão nova. Até lá, quem segura a contradição visível é o `spec.md`, na seção
> [PRD pendente de ajuste](#prd-pendente-de-ajuste).

### Abandonar a revisão — devolver o pedido

Pegou o pedido e a revisão não vai chegar ao envio — o humano desistiu ou interrompeu, a sessão vai
terminar antes do submit, o PRD não veio —: **devolva o pedido à fila** antes de encerrar.

```bash
productdock prd-review release <ref> --json
```

O pedido volta a "na fila", o PRD segue **Publicada**, o editor do PM volta a ficar liberado, e o runner
ou outra sessão o pegam depois. Sem o `release`, o pedido fica preso a esta sessão até os 60 minutos
vencerem, com o editor do PM bloqueado. Não há `release` depois de um envio aceito: o envio já fechou o
pedido. Exit `1` dizendo que não há `claim` daquele Work Item nesta máquina → não há o que devolver (o
pedido não foi pego aqui, ou já foi devolvido).

### Sem pedido aberto — a revisão que não volta ao PRD

O `claim` devolveu `job: null`. O caso comum: o PRD já está **Aprovada** e você está iniciando a Spec.
**Com o PRD Aprovada, a revisão feita na IDE não volta ao PRD nem muda o status dele**: achados só entram
no PRD pelo Tech Review de uma versão publicada. O que a revisão encontrar de técnico fica na Spec; o que
for de negócio vira uma **nova edição do PRD**, publicada pelo caminho normal — e a publicação abre um
pedido novo.

- **Não submeta.** Nada de `prd-review submit` — sem pedido o servidor recusa
  (`prd_review_job_required`) e nada grava; não tente contornar.
- **Retriagem e handoff antecipado, iguais.** O que muda é o destino depois dele:

  | Finding         | Sem pedido aberto                                                                                                                                                                                                                        |
  | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `tech`          | seção **Decisões** da costura, como sempre                                                                                                                                                                                               |
  | `tech_prd_edit` | a decisão vai a **Decisões**; a linha de **PRD pendente de ajuste** entra com o estado `sem thread`, e o texto proposto vai ao humano como orientação: o PM edita o PRD com ele e publica                                                |
  | `pm`            | **orientação ao humano**, no fechamento do antecipado: por achado, a `key`, o trecho do PRD, o que falta e a sugestão do time técnico quando houver — e que fechar é do PM, editando o PRD e publicando uma versão nova. Não vira thread |

- **`pm` com `blocking` continua segurando o lookup**: diga isso ao humano junto da orientação e encerre
  o turno — ele decide se espera a nova edição do PRD ou como seguir.
- **Registre o gate** (`--type review`) como na [Entrega](#entrega), com o `status` pela mesma regra.
- **Pedido já em execução por outro** — o PRD está **Publicada** e o `productdock watch` pegou o pedido:
  o parecer daquela rodada é o dele. Não submeta; diga ao humano que o Tech Review está em execução, e
  rode o read-back de novo quando ele terminar.
- Apague da pasta de envio o `prd-review-claim-r<n>.json` e o `prd-review-before-r<n>.json` ao fechar o
  handoff — não há parecer nem resposta de envio nesta rodada.

### Rodada N+1 — o estado de cada achado

O parecer é um **documento vivo**: a cada versão publicada, o Tech Review volta ao PRD. O PM age de duas
formas, e **as duas contam**:

1. **editando o texto do PRD** e publicando a versão nova — visível em `productdock wi prd`;
2. **dando estado ao achado** no painel — resolvido com uma **decisão** (Bloqueio, Lacuna, Observação ou
   Sugestão) ou ignorado, com ou sem **motivo** (só Observação e Sugestão) —, visível **só** em
   `productdock prd-review get`.

Não há resposta do PM a ler: a plataforma não tem conversa nos achados, e o read-back não a traz. Ao
publicar uma versão nova, os achados da anterior saem do painel como `archived`, e o
`archived_from_status` guarda o estado que tinham, com a decisão e o motivo. Antes de recalcular os
findings, percorra **cada linha** devolvida pelo read-back — uma por `finding_key` — e decida
explicitamente; a classe do achado é o `finding_class`, ou, no achado sem classe, a
[regra das classes](#o-que-o-envelope-leva-à-plataforma):

| Estado do achado                                                                         | Decisão                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ignored`                                                                                | **Nunca reemitir.** O PM ignorou a Observação ou a Sugestão — ela não aparece de novo, nem reescrita, nem com outra `key`. Premissa ignorada segue como premissa não confirmada: a análise segue com a suposição, como se confirmada, e o corpo a lista em **Premissas não confirmadas**, com o motivo do PM |
| `resolved` **com decisão**                                                               | **Não reemitir**, mesmo que o trecho citado continue igual no PRD: a decisão é a regra. O texto do PRD que **contradiz** a decisão é achado novo — ver abaixo                                                                                       |
| `resolved` sem decisão, Bloqueio ou Lacuna, e o problema **continua** no texto do `wi prd` | **Reemitir com a mesma `key`**, dizendo no `body` o que continua no texto. O envio reabre a thread (`threads_reopened`): o PM a deu como resolvida, mas o PRD não mudou                                                                         |
| `resolved` sem decisão, Bloqueio ou Lacuna, e o texto **sanou** o problema               | **Não reemitir.** Está fechado                                                                                                                                                                                                                      |
| `resolved`, Observação ou Sugestão                                                       | **Não reemitir**, mesmo que o trecho continue — Observação e Sugestão resolvidas não voltam                                                                                                                                                        |
| `open`                                                                                   | Persiste → reemitir **com a mesma `key`** (segue pendente); se nada mudou, dizer isso — não reescrever o achado. Sanado no texto → não reemitir: a plataforma a marca `superseded`                                                                 |
| `archived`                                                                               | Decida pelo `archived_from_status`, pela linha correspondente acima: `ignored` nunca volta; `resolved` segue as linhas de `resolved`, com a decisão que tinha; `open` volta se persiste. Reemitido, vai com a **mesma `key`** — a thread nova herda o código do achado |
| `superseded`                                                                             | Histórico de rodada anterior. Ignorar                                                                                                                                                                                                               |

**A decisão registrada é regra de negócio decidida.** A premissa confirmada ou corrigida não volta como
premissa, nem com a suposição contrária. E a pergunta **mais detalhada** sobre um assunto já respondido
não reabre o achado: ela entra como achado novo só se mudar o que o usuário vê, faz ou recebe — e aí passa
pelas [regras do achado novo](#o-que-entra-como-achado-novo--rodadas-incrementais); do contrário, é
[ponto de atenção](#pontos-de-atenção-e-os-limites) para a Spec, no corpo do parecer.

**Texto que contradiz a decisão é achado novo**, em qualquer rodada: `key` nova — nunca a do achado
resolvido —, a classe que tiver, e o `body` cita a decisão registrada e o trecho do PRD que a contradiz
(`anchor.quote` no trecho). É a única forma de um assunto decidido voltar ao PM.

**Thread de `tech_prd_edit` fechada não é PRD ajustado** — ver [PRD pendente de ajuste](#prd-pendente-de-ajuste).

**Thread `tech` herdada** — de rodada anterior à regra de só `pm`/`tech_prd_edit` no envelope — não se
reemite: o finding sai do `findings[]`, a plataforma a marca `superseded`, e a decisão, se já houve, vai
ao `spec.md`.

Depois de decidir item a item, siga a mesma [Entrega](#entrega): os findings **novos** passam pela
retriagem e, havendo `tech`, `tech_prd_edit`, sem `owner` ou `pm` novo, pelo handoff antecipado — os
reemitidos não voltam a ele, e o `suggestion` que levaram segue igual. Então **submeter novamente**, pelo
pedido desta versão, o envelope com os `findings` recalculados; o `summary.verdict` se recalcula a partir
dos findings restantes.

### Os insumos da rodada incremental — versão anterior, parecer anterior e diferenças

Da segunda rodada em diante, o Tech Review revisa **o que mudou**, e para isso precisa de três coisas:

1. **O parecer anterior** — o `last_review` do read-back: o corpo, a rodada, o `review_rules` e o
   `reviewed_brief_version`, a versão que ele revisou.
2. **A versão revisada antes** — o texto daquela versão:

   ```bash
   productdock wi prd <ref> --version <last_review.reviewed_brief_version> --json \
     --out <pasta de envio>/prd-v<versão anterior>.json
   ```

3. **As diferenças entre as duas versões** — calculadas aqui, comparando a versão anterior com a atual
   (`wi prd` sem `--version`): o que foi **alterado** (trecho que existia e mudou) e o que foi
   **acrescentado** (seção, UC, regra ou critério que não existia).

**Sem a versão anterior, sem diff — e diga isso.** A CLI pode não ter `wi prd --version` — a atual não
tem, e responde com a versão do programa, sem PRD ([prd.obter](#prdobter)) —, o `last_review` pode faltar
no read-back, ou a versão anterior pode não vir. Em qualquer desses casos, a rodada segue as **regras da
segunda rodada, sem diff**: como não há como provar que um trecho não mudou, todo trecho conta como
alterado — o achado novo entra pelas regras da segunda rodada e pelos limites —, e o corte da terceira
rodada não se aplica, porque sem diff não se separa o trecho acrescentado. O corpo do parecer diz, numa
linha, que a rodada foi feita sem as diferenças e por quê. Não contorne a falta lendo versão por outro
caminho.

Mesma versão nas duas pontas (`reviewed_brief_version` do `last_review` igual à `.data.version` atual) é
diff vazio: nada foi alterado nem acrescentado.

### O que entra como achado novo — rodadas incrementais

Achado **novo** é o que não é reemissão de uma `key` da [Rodada N+1](#rodada-n1--o-estado-de-cada-achado).
O reemitido segue a tabela de lá; o novo passa por estas regras, nesta ordem, e o que elas deixam fora vai
a [pontos de atenção](#pontos-de-atenção-e-os-limites) — nunca some:

| Rodada (`next_round`)                                                  | Entra como achado novo                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1                                                                      | tudo o que a análise encontrar, dentro dos [limites](#pontos-de-atenção-e-os-limites). A profundidade da primeira rodada não muda                                                                                                                                                                                                 |
| 2                                                                      | só o achado que está num **trecho alterado ou acrescentado** desde a última versão revisada, o que é **Bloqueio**, ou o texto que **contradiz uma decisão registrada** — dentro dos limites                                                                                                                                      |
| 3 em diante                                                            | só **Bloqueios**. Lacunas, Observações e Sugestões novas vão a pontos de atenção. Duas exceções: o texto que **contradiz uma decisão registrada** entra como achado, na classe que tiver; e o **trecho acrescentado** desde a última versão revisada é revisado como numa segunda rodada — Lacunas e Observações entram, dentro dos limites |
| 3 em diante, e o `last_review` **sem** `review_rules: "convergent/v1"` | **a primeira rodada feita com estas regras**: segue as regras da segunda rodada, sem o corte, mesmo que o número seja 3 ou maior. Diga isso no corpo                                                                                                                                                                              |

O número da rodada é o `next_round` do read-back — sem ele, a rodada é tratada como segunda
([read-back](#pegar-o-pedido-e-o-read-back)). A pergunta mais detalhada sobre assunto já respondido segue
a regra da [Rodada N+1](#rodada-n1--o-estado-de-cada-achado): só entra se mudar o que o usuário vê, faz ou
recebe.

As regras e os limites valem para o que vai ao PM — os `pm`, as premissas e os `tech_prd_edit` —, depois
da retriagem e antes do handoff antecipado: o `pm` que fica fora não vira item do handoff; o
`tech_prd_edit` que fica fora vai ao handoff como `tech` — a decisão técnica se toma igual, e só o pedido
de edição ao PM vira ponto de atenção. Os `tech` não passam por elas — nunca viram thread, e fecham no
handoff como sempre.

### Pontos de atenção e os limites

Nenhum ponto que o Tech Review encontrou é descartado em silêncio. O que as regras deixam fora dos
achados vai ao **corpo do parecer**, na seção **Pontos de atenção**, e a `attention_points` do envelope,
com a mesma lista.

**Os limites, em toda rodada:** no máximo **5 Lacunas novas**, priorizadas por severidade, e no máximo
**5 Observações novas** — as premissas que não são Bloqueio contam aqui. O excedente vai a pontos de
atenção. **Bloqueios não têm limite**, e os reemitidos não contam: o limite é do que é novo nesta rodada.

**O que vai a pontos de atenção**, cada um com o `reason` que diz a regra:

| O ponto                                                                                                              | `reason` (sugerido)                                                                     |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| achado novo fora de trecho alterado, da segunda rodada em diante                                                     | `"fora dos trechos alterados desde a última versão revisada"`                           |
| Lacuna, Observação ou Sugestão nova, da terceira rodada em diante, fora das duas exceções                            | `"a partir da terceira rodada, só Bloqueios entram como achados novos"`                 |
| a Lacuna ou a Observação além das cinco da rodada                                                                    | `"limite de 5 Lacunas novas por rodada"` / `"limite de 5 Observações novas por rodada"` |
| pergunta mais detalhada sobre assunto já respondido, que não muda o que o usuário vê, faz ou recebe                  | `"assunto já decidido — ponto de atenção para a Spec"`                                  |
| suposição que mantém o comportamento atual, ou que, numa feature nova, não define quem usa, o que vê, faz ou recebe | `"suposição que não muda nada para o usuário"`                                          |

**No corpo do parecer**, a seção **Pontos de atenção** abre com a contagem — _"N pontos ficaram fora dos
achados por estas regras"_, por regra — e lista cada um com o motivo. Nenhum ponto fora ⇒ a seção diz
`nenhum`, e `attention_points` vai `[]`. No mesmo corpo, quando valer: a linha de que a rodada foi feita
**sem as diferenças**, a de que foi **a primeira com as regras convergentes** (sem o corte), e a lista de
**Premissas não confirmadas** — as ignoradas pelo PM, com a suposição e o motivo.

O ponto de atenção é informação no parecer: ele não vira thread, não conta no veredicto e não é
pendência levada a outra fase.

### Pendentes para a Spec — o que o modo autônomo deixou

O [modo autônomo](../discovery/prd-review-autonomo.md) não pergunta nada a ninguém: cada questão técnica
que ele achou ficou registrada como decisão **pendente**, para o desenvolvedor responder quando iniciar o
Work Item. É no antecipado que ela é perguntada.

1. **Recupere.** O `wi spec-context <ref> --json` do Passo 1: leia `.data.current_state.decisions[]` e
   separe as de `title` começando com `[Pendente para a Spec] `. O `description` delas traz `key: <key>`,
   a pergunta, as opções e a evidência. Mais de uma com a mesma `key` vale a mais recente; `key` que já tem
   uma decisão **sem** o prefixo foi respondida, e não volta
2. **Pergunte.** Cada pendência aberta é um item **obrigatório** do antecipado: `id` = a `key`,
   `titulo` = o título sem o prefixo, `corpo` com a pergunta, a evidência `caminho:linha` e a linha `Muda`,
   e as opções como `sugestoes`. Havendo pendência, o antecipado abre mesmo que a rodada não tenha finding
   novo
3. **Não duplique.** Um finding `tech` desta rodada com a mesma `key` de uma pendência **é** a pendência:
   vira um item só, com a evidência mais recente no `corpo`. A rodada não a recria como finding novo nem
   como thread
4. **Registre a resposta.** Verbatim, à seção **Decisões** da costura, como qualquer `tech` respondido, e a
   uma nova `state update --type decision`, sem o prefixo:

   ```bash
   productdock state update --ref <ref> --type decision \
     --content '{"title":"<o título sem o prefixo>","description":"key: <key> · Resposta: <a resposta, verbatim>"}' --json
   ```

   A pendência original fica como está — é a decisão nova, com a mesma `key`, que a fecha

Resposta que, aplicada, muda comportamento observável ou critério do PRD transforma a pendência em
`tech_prd_edit`, como qualquer `tech` respondido no antecipado.

O registro é por repositório: a Spec iniciada em outro repositório do projeto não enxerga as pendências
que o runner gravou — a limitação está no
[modo autônomo](../discovery/prd-review-autonomo.md#registro-das-pendências).

### Ignorados sem motivo — a pergunta que volta na Spec

O PM pode ignorar uma Observação ou uma Sugestão sem dizer por quê. O achado ignorado **nunca volta ao
PRD** — a [Rodada N+1](#rodada-n1--o-estado-de-cada-achado) não o reemite —, mas a dúvida que ele
levantava não morreu: ela volta **como pergunta técnica**, no início da Spec. Só o ignorado **sem motivo**
volta; o ignorado com motivo já tem resposta, e a Observação aberta ou resolvida não vem.

1. **Recupere.** O read-back — `prd-review get` — traz uma linha por `finding_key`. Separe as de
   `status: ignored` — ou `archived` com `archived_from_status: ignored` — com o motivo vazio. A `key` que
   já tem decisão registrada sem o prefixo de pendência, no `wi spec-context`, foi respondida numa Spec
   anterior, e não volta
2. **Pergunte.** Cada uma é um item do antecipado, `obrigatorio: false`: `id` = a `key`, `titulo` = o
   título do achado, `corpo` com o que o achado apontava (o trecho do PRD, quando havia), a linha _"O PM
   ignorou este ponto no PRD sem dizer o motivo"_ e uma linha `Default`: _seguir a Spec sem tratar o
   ponto_; e 2 a 3 `sugestoes` — as saídas técnicas defensáveis e _"não se aplica — seguir sem tratar"_
3. **Não leve ao PRD.** A resposta não vira thread, não volta ao `findings[]` e não reabre o achado. Ela é
   técnica: vai verbatim à seção **Decisões** da costura e a uma `state update --type decision`, no mesmo
   formato da resposta a uma pendência —
   `{"title":"<o título do achado>","description":"key: <key> · Resposta: <a resposta, verbatim>"}` —,
   para uma Spec seguinte não perguntar de novo. Sem resposta, vale o `Default`, e nada se registra

Resposta que, aplicada, mudaria o que o PRD diz não reabre o achado: é decisão de produto, e vai ao humano
como orientação para o PM editar o PRD e publicar a versão nova, como o `pm` de
[Sem pedido aberto](#sem-pedido-aberto--a-revisão-que-não-volta-ao-prd).

### PRD pendente de ajuste

Neste backend o `prd.md` é cópia fiel e **nunca se edita**. A edição técnica que o Tech Review decidiu —
o `tech_prd_edit` — vive na seção **PRD pendente de ajuste** do `spec.md`, até o PM publicar o PRD
ajustado: cada `tech_prd_edit` cuja thread não fechou com o PRD editado — ou que ficou `sem thread`,
porque a revisão não tinha pedido aberto e não submeteu nada. A costura e a fila seguem a decisão, não o
trecho, e o critério sob a linha vai ao briefing dos lookups e à tarefa com o texto proposto e a `key`, não
com o do `prd.md`. Sem pendência, a seção diz `nada`.

**Quando a linha fecha.** A linha sai quando a thread está `resolved` — ou `archived` com
`archived_from_status: resolved` — **e** o trecho citado (`anchor.quote`) não está mais no PRD — as duas
conferidas, por `prd-review get` e `wi prd`. Resolvida com o trecho fora do PRD → ajustado: busque o
`prd.md` de novo, tire a linha do `spec.md` e re-submeta o spec ([`artefato.publicar`](#artefatopublicartipo)),
se ele já existir. Resolvida **com decisão** e o trecho intacto → é o PM ratificando sem editar: não
reemita, a linha fica, com a decisão do PM ao lado, e o que o texto contradisser dela é achado novo.
Resolvida **sem decisão** e o trecho intacto → é Lacuna que persiste: reemita com a mesma `key`, e a linha
fica. Thread aberta → segue pendente: a linha fica. **Linha `sem thread`** não tem thread a conferir: ela
sai quando o trecho citado não está mais no `wi prd`, isto é, quando o PM publicou a edição; até lá, fica,
e o texto proposto segue como orientação ao humano.

**Quem confere:** a rodada N+1 do Tech Review e a Validation. Na Validation, para cada linha, confira a
thread pela `key` em `productdock prd-review get <ref> --json` e o trecho em `productdock wi prd <ref>
--json`. Linha que continua aberta — thread aberta, resolvida com o trecho intacto, ou `sem thread` com o
trecho intacto — **não muda o veredito**, mas vai ao humano no fechamento da fase, nominalmente: a `key`,
o trecho atual e o texto proposto. A implementação seguiu a decisão do handoff; quem ler o PRD agora
encontra outra coisa. Diga que fechar isso é do PM — a CLI não tem como propor a edição por conta própria.

---

## Bugs da aba Qualidade

Os bugs abertos do Work Item, neste backend, são os `open` da **aba Qualidade** — os que a plataforma
registra e os `qa-issue` que a `pd-qa-validation` submeteu. É a `pd-workflow` que os leva de volta à fila.

**Quando.** No preflight, ao iniciar ou retomar o Work Item, logo depois de [`item.ler`](#itemler) e
**antes** da tabela de retomada — e de novo no passo de cobertura da Validation. O sinal é `open_qa_bugs`
em `.data`. Vale nas duas entradas, com e sem PRD. `open_qa_bugs: 0` — ou o campo ausente — não dispara
leitura nenhuma, e o fluxo segue normal, sem bloquear e sem inventar bug.

**Ler — obrigatório antes de rotear:**

```bash
productdock wi bugs <ref> --status open --json --out <pasta de envio>/qa-bugs-open.json
```

O `--out` vai à [pasta de envio](sync.md#a-pasta-de-envio), **nunca** a `[ITEM_DIR]`. Em `.data` voltam
`summary` (`{ open, resolved, invalid }`), `count` e `issues[]` — um por bug, na última versão, com `id`
(`BUG-N`), `title`, `severity`, `status` e o `body` em markdown, intacto. O `body` é o critério da fix
task, íntegro.

- `count: 0` → **sucesso**: o contador e a lista divergiram, ou o bug foi fechado entre as duas chamadas.
  Diga isso em uma linha e siga a tabela de retomada como se não houvesse bug.
- `count > 0` → confira `summary.open` e **liste ao humano** cada bug: `BUG-N`, título, severidade.
- exit `1` aqui é ref que não resolve, Work Item não visível ou `--status` recusado. Exit `2` bloqueia até
  `productdock login`, e não se segue pelo disco como se não houvesse bug.

**Depois.** Aprovadas as fix tasks, reenvie o `tasks` em modo **full**, remontado na pasta de envio a
partir de `tasks/`, com o status atual de cada tarefa — as fechadas `done`, as fix tasks novas `pending` —
e o `summary` ajustado ([`artefato.publicar(tasks)`](#artefatopublicartipo)). Confira o efeito em
`tasks_progress`, e apague o `tasks.md` e o `qa-bugs-open.json` da pasta de envio. A fix task de bug não
tem `spec_ref` no envelope.

**O que a skill não faz com bug:** não marca `resolved`, não reenvia `qa-issue`, não edita nem apaga o
bug. Corrigir é do Dev; retestar e fechar são do QA, na aba Qualidade ou pela `pd-qa-validation`. A
correção dos bugs que o QA abrir — `"corrigir os bugs do <ref>"` — retoma pela plataforma em qualquer
sessão.

A `pd-qa-validation`, como esta skill, exige a CLI neste backend e bloqueia sem sessão; ela publica
`qa-plan`, `qa-result` e um `qa-issue` por bug na aba Qualidade, e **não** move o Kanban.

## Anexos, protótipos e eval

Os três são só leitura, e os três gravam na pasta de envio, nunca em `[ITEM_DIR]`.

### Os anexos do Work Item

Vale nas duas entradas, **sempre**: com PRD, junto das unidades de escopo e antes de qualquer lookup; sem
PRD, antes de numerar os `C-nn`. A fonte é a plataforma, num comando só — a listagem e os arquivos:

```bash
productdock wi attachments <ref> --download <pasta de envio>/attachments --json --out <pasta de envio>/attachments.json
```

- `.data` é `{ work_item_id, count, attachments[] }`, o mais recente primeiro, cada um com `file_name`,
  `mime_type`, `file_size` (em bytes), `created_at` e `author_name`. O `signed_url` vem mascarado sob
  `--json` e não serve daqui: os arquivos vêm do `--download`.
- O `--download` grava cada arquivo em `<pasta de envio>/attachments/`, criando a pasta, pelo nome-base
  do `file_name`; dois anexos com o mesmo nome viram `print.png` e `print-2.png`. Cada arquivo gravado sai
  no `stderr` como `Gravado: <caminho>` — é ali que está o caminho de cada um, não no `.data`.
- **Nunca em `[ITEM_DIR]`**: nem a listagem, nem os arquivos. Download apontado para dentro de
  `.productdock/work-items/` está no lugar errado.
- exit `0` com `count: 0` (`attachments: []`) — **sem anexo**: é sucesso, e não grava nada. Siga sem
  reclamar e sem perguntar, e registre na costura `nada`, com o porquê.
- exit `1` aqui é ref errada, `404` do Work Item, `403` de quem não é membro do projeto, ou um download
  recusado no meio. O que já foi gravado antes da falha fica na pasta, e o `stderr` o nomeia.
- exit `2` bloqueia também quando acontece no meio dos downloads.

Como ler cada arquivo, o que vai ao briefing e à costura: [lookup.md](../discovery/lookup.md). Imagem
anexada não é fonte de design. Escrita e submetida a costura, apague o `attachments.json` e a pasta
`attachments/` da pasta de envio.

### Os protótipos do Work Item — e a reconciliação com o PRD

```bash
productdock wi prototypes <ref> --json --out <pasta de envio>/prototypes.json
```

São os links da aba Refinamento, em `.data.prototypes[]`, cada um com `url`, `name` e `tool`, e cada um é
uma fonte — não precisa estar declarado no `PROJECT.md`. **Roda sempre**, nas duas entradas — com PRD
também, mesmo quando a seção UI/UX cita link: o PRD é um retrato do momento em que foi escrito, e o
cadastro é o estado de agora. `count: 0` (`prototypes: []`, exit `0`) é sucesso. Disparados os design
lookups, apague o `prototypes.json`.

- O `tool` diz a mecânica: `figma` e `claude_design` são servidor MCP de design, `link` é página ou
  documento publicado. `tool` fora desses três é tipo desconhecido: a mecânica vem do `PROJECT.md`, e não
  estando lá, **pergunte ao humano** — dizendo que a resposta pertence ao `PROJECT.md`.
- **Sem PRD**, a lista é a fonte de design: com itens, um design lookup por protótipo; vazia, segue a regra
  de "sem fonte" do [lookup.md](../discovery/lookup.md).

**Com PRD, reconcilie pela URL** os links da seção "Expectativas de UI/UX" do `prd.md` com o cadastro (a
mesma URL nas duas é uma fonte só). É lá que a plataforma grava os protótipos do Work Item quando escreve o
PRD, e a seção pode terminar com a nota `o work item tem mais N protótipo(s) cadastrado(s) além dos listados
aqui`: o PRD cortou a lista, e o cadastro completa.

- **Nas duas** ⇒ fonte.
- **Só no cadastro** — protótipo vinculado depois do PRD, ou cortado da lista do PRD ⇒ fonte também, sem
  perguntar: o cadastro é a declaração do PO. Registre na seção **Design** da costura que o PRD não o cita.
- **Só no PRD, com o cadastro vazio** ⇒ fonte: é PRD escrito à mão ou anterior ao cadastro, e não há com o
  que divergir.
- **Só no PRD, com o cadastro não vazio** ⇒ o link saiu do cadastro — o protótipo foi trocado ou
  desvinculado depois do PRD. **Pergunte ao humano**, inline e antes de disparar qualquer lookup, se o link
  ainda vale ou se foi substituído; nunca o use em silêncio e nunca o descarte em silêncio. Valendo, é
  fonte; substituído, sai da lista. A resposta vai à seção **Design** da costura, e o PRD desatualizado é
  item da seção [PRD pendente de ajuste](#prd-pendente-de-ajuste).

O link do PRD e o protótipo do Work Item são fonte também contra um `PROJECT.md` que diz `nenhuma` — o
registro no Work Item já é a declaração —, e somam-se às fontes `fixo` do `PROJECT.md`. A resposta do
humano a "sem fonte e com tela" fica só na seção **Design** da costura: o cadastro de protótipo é da
plataforma.

### O report de eval

Vale nas duas entradas, antes do code lookup, **só quando** a condição vale — basta uma das duas:

- **O Work Item vem de um achado de eval**: o título ou a descrição citam um eval, uma dimensão avaliada
  ou um achado — ou o Work Item é débito técnico gerado pela tela Eval.
- **O escopo toca uma dimensão avaliada**: segurança, observabilidade, qualidade de backend ou qualidade
  de frontend.

Nenhuma das duas: não consulte, não pergunte e não cite — a costura registra `nada` no bloco de achados.

**Qual tipo.** Um `eval_type` por dimensão que a condição alcança. A skill de eval e o tipo que a
plataforma guarda têm nomes diferentes:

| Skill de eval               | `eval_type`        |
| --------------------------- | ------------------ |
| `pd-security-eval`          | `security`         |
| `pd-observability-eval`     | `observability`    |
| `pd-backend-practices-eval` | `backend_quality`  |
| `pd-frontend-audit-eval`    | `frontend_quality` |

**A fonte é a plataforma, pela CLI** — sempre:

1. `productdock eval list --type <eval_type> --json` — os repositórios do projeto com avaliação daquele
   tipo, o mais recente primeiro. O `key` de cada item é a `repository_key` que o `eval latest` aceita.
   Ache o do repositório que o escopo alcança; com um repositório só avaliado, é ele.
2. `productdock eval latest --type <eval_type> --repository <repository_key> --json --out <pasta de envio>/eval-<eval_type>.json`
   — o report da execução mais recente daquele repositório: `execution_id`, `executed_at`,
   `repository_key` e, em `view.findings[]`, cada achado com `id`, `title`, `severity`, `category`,
   `location` (`file`, `line`) e o `work_item` vinculado. Dois repositórios avaliados no mesmo tipo, um
   arquivo por repositório: `eval-<eval_type>-<repository_key>.json`. `--execution-id <id>` lê uma
   execução do histórico.

- exit `0` com `data: null` (`eval latest`) ou `data: []` (`eval list`) — **sem avaliação**: é sucesso.
  Siga sem citar achado, e registre na costura que não há avaliação daquele tipo.
- exit `1` aqui é tipo desconhecido, `repository_key` errada ou `403` de quem não é membro do projeto.

**O `latest.json` em `.productdock/evals/<tipo>/` não é fonte.** É o último report commitado naquele
repositório, não o último submetido à plataforma — pode estar velho, ou ser de outro repositório. Não o
leia no lugar do comando, nem para completá-lo. E esta leitura não roda eval nem submete eval: rodar e
submeter é das skills de eval, fora deste fluxo. O report é um retrato: `executed_at` e `repository_key`
dizem de quando e de onde ele é.

Quais achados o Work Item resolve, o que vai ao briefing e à costura: [lookup.md](../discovery/lookup.md).
Escrita e submetida a costura, apague os `eval-*.json` da pasta de envio.

## Kanban

A coluna do card avança **automaticamente, forward-only**, pela plataforma, conforme a fase:

```
phase_change→specify    ⇒ Refino Produto → Refino Técnico  (+ responsável)
phase_change→implement  ⇒ Refino Técnico → Desenvolvimento (+ responsável)
```

- O `phase_change` **nunca regride** coluna movida manualmente, e **não** avança para `review`.
- O `phase_change` da Validation (`phase: "validation"`) registra só a fase interna do SDLC e **não** move
  a coluna — o card já está em Desenvolvimento.
- **O handoff de QA é manual, para todos os tipos.** Na Validation PASS, depois de marcar a Implementação
  como `done` no artefato (`implement`), **informe o usuário** que a implementação foi validada e que
  **ele deve mover o card para `review` ("Aguardando Testes") manualmente** (drag & drop) quando quiser
  passar para o time de QA. **Não** rode `state update --type phase_change --content '{"phase":"review"}'`
  como forma de "avançar o Kanban" — a transição de coluna é uma decisão humana. O "DONE" da implementação
  é o do **artefato**, independente da coluna.
- **Em FAIL não há mudança de status** — o Kanban permanece onde o usuário o deixou (tipicamente
  `development`). Repetir até PASS; no PASS, o handoff para "Aguardando Testes" é manual.
- **QA real-user opcional por tipo (PROD-105):** a plataforma trata o **card de QA real-user** (skill
  `pd-qa-validation`) como `required` para `feature`, `recommended` para `improvement`/`bug` e `optional`
  para `task`/`technical_debt`/`incident` (podendo ser marcado "não aplicável" na UI). Isso governa apenas
  a visibilidade/skip do card e do passo QA no Work Item — **não** altera a Validation, obrigatória para
  todos os tipos. Com o card `required` ou `recommended`, a oferta da `pd-qa-validation` vem antes de
  mover o card; `optional`, mencione que existe, sem insistir.
- A `pd-qa-validation` não move o Kanban nem avança a coluna.
