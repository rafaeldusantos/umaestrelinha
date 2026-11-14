# Plan — a costura sem PRD

Mesmo papel do [spec.md](spec.md): **o que se escreve antes de fatiar**. Muda só o que a alimenta — aqui
não há PRD nem handoff, e só há design a ler quando o Work Item tem fonte de design — sem ela e com tela
no escopo, o humano diz como prosseguir. O que entra é o Work Item, os anexos e insumos dele, as fontes de
design dele quando há, e o que o código responde.

**[productdock]** Na plataforma é o artefato `plan` da fase `specify`. Dali em diante o caminho é
**idêntico** ao da entrada com PRD: fatiamento → `tasks/` → auditoria → corrida da fila → Validation.

**Quando** ([o que cada backend habilita](../setup/backend.md#o-que-cada-backend-habilita)):

- **[productdock]** `item.ler` ([backend](../setup/backend.md)) devolve **`uses_plan: true`** — `bug`,
  `incident`, `technical_debt`, e `improvement` em Fluxo Rápido (`flow_mode: 'fast'`, PROD-144). Nenhum
  deles exige PRD: `prd.obter` sem conteúdo, com sucesso, é sucesso, não bloqueio
- **[local]** o `item.md` diz **`entrada: plano`** — `bug`, `incident`, `technical_debt`, ou `improvement`
  pequeno que o humano aceitou levar sem PRD. A ausência de `prd.md` é o esperado, não bloqueio

> A entrada é a registrada no estado do Work Item — não a redecida aqui pelo tipo. **[productdock]** Não
> recombine `(tipo, flow_mode)` em prosa para decidir a entrada — leia `uses_plan`. Ele é derivado das
> regras de artefato da plataforma, que já combinam os dois. Recombinar aqui é como a divergência começa.
> **[local]** Para `improvement` sem PRD, `entrada: plano` é **sugestão** do agente, nunca decisão dele:
> sugerida com justificativa — o escopo cabe em poucas telas ou arquivos —, o agente para e espera;
> confirmada, grava no `item.md`; recusada, segue a descoberta e não insiste.

---

## Entrada

| Campo            | O que é                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `work item`      | título e descrição do Work Item (`item.buscar`) — **[local]** a **Descrição** do `item.md`, o pedido do humano, verbatim                                                                                          |
| `anexos`         | os anexos e insumos do Work Item (`insumos.ler`) — sempre, antes de numerar os comportamentos — e o que se tirou de cada um ([lookup.md](../discovery/lookup.md))                                             |
| `comportamentos` | o que precisa passar a ser verdade, numerado `C-01`, `C-02`, … — um por comportamento verificável                                                                                                              |
| `design`         | o retorno do `pd-design-lookup` de cada fonte de design do Work Item — só quando há — ou da fonte que o humano deu ao responder a pergunta                                                                     |
| `código`         | o retorno do `pd-code-lookup` de cada repositório que o Work Item alcança                                                                                                                                       |
| `eval`           | o report de eval (`eval.ler`) — só quando a condição do [lookup.md](../discovery/lookup.md) vale —, e os achados que o WI resolve                                                                               |

**Os comportamentos substituem os UCs.** Sem PRD não há critério de aceite escrito por ninguém, então é
aqui que ele nasce — e é contra esta lista que a auditoria da fila confere. Numere-os a partir do título,
da descrição e dos anexos, antes de disparar o lookup: é o `escopo` que cada subagent recebe.

## O que não roda nesta entrada

| Etapa                       | Por quê                                                                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRD Tech Review             | não há PRD a revisar                                                                                                                                                                                                                                                            |
| Design lookup sem fonte     | nenhuma fonte de design — **[productdock]** o Work Item sem protótipo; **[local]** nenhum link de design nos insumos — **e nenhum `C-nn` toca tela**: não há design a ler, e segue sem reclamar e sem perguntar                                                                |
| Handoff                     | não há decisão de produto pendente — pergunta com recomendação defensável vira premissa `a ratificar` no plano. **[productdock]** só a sem recomendação vira pergunta direta, antes dele (passo 7 do Comportamento). **[local]** as duas vão ao [gate das perguntas do plano](#as-perguntas--o-gate-da-página) |
| Conferência de fronteira    | só quando o lookup rodou em **mais de um** repositório                                                                                                                                                                                                                          |

O design lookup **roda** quando o Work Item tem fonte de design: sem PRD, a fonte é **[productdock]** os
protótipos cadastrados no Work Item; **[local]** os links de design do pedido e de `item.md` › Insumos
([lookup.md](../discovery/lookup.md)). Só eles — e a fonte que o humano der ao responder a pergunta do
passo 2 do Comportamento: nesta entrada não há seção UI/UX de PRD a ler, e as fontes declaradas no
`PROJECT.md` não disparam lookup sozinhas — dão, no máximo, a mecânica de uma ferramenta desconhecida.
Nenhuma fonte com algum `C-nn` que toca tela não é o caso "não roda": é essa pergunta ao humano.

A conferência de **cobertura** roda sempre, e é barata: todo `C-nn` foi reivindicado no `Recorte` de
algum repositório? Nenhum reivindicou, é órfão: **[productdock]** você pergunta antes de escrever o plano;
**[local]** vai ao gate das perguntas do plano, sem recomendação.

## Comportamento

1. **Leia os anexos e insumos do Work Item, sempre** (`insumos.ler` — **[productdock]** só os anexos, sem o
   contexto de especificação), antes de numerar os `C-nn`. O que precisa ser baixado vai à
   [pasta temporária](../setup/backend.md#raízes), nunca a `[ITEM_DIR]`; **[local]** arquivo do repositório se lê no lugar. Leia cada um — XLSX com ferramenta local; sem como
   ler, o bloco **Anexos consultados** diz isso — e numere os comportamentos a partir do título, da
   descrição e do que os anexos dizem. Imagem anexada é insumo de escopo, não fonte de design: não dispara
   `pd-design-lookup`. Nenhum anexo é sucesso — segue sem reclamar e sem perguntar, e o bloco fica `nada`,
   com o porquê. **[productdock]** Falha de sessão **bloqueia a fase**, e o MCP nunca entra no lugar
   ([códigos de saída](../pd-sync/sync.md#códigos-de-saída),
   [anexos, protótipos e eval](../pd-sync/workflow.md#anexos-protótipos-e-eval)). O procedimento está no
   [lookup.md](../discovery/lookup.md)
2. **Resolva a fonte de design** antes do code lookup. **Com fonte** — **[productdock]** os protótipos do
   Work Item (`insumos.ler`, só agora, depois de `fase.entrar(specify)`); **[local]** o link de design nos
   insumos — ⇒ um `pd-design-lookup` por fonte, todos na mesma mensagem, cada um com a URL como `fonte` e
   os `C-nn` como `escopo` — a mecânica pelo `tool` do protótipo, ou pela forma do link (`figma`, `claude_design`, `link`), e ferramenta
   desconhecida é pergunta ao humano, como no [lookup.md](../discovery/lookup.md). **Nenhuma fonte e
   algum `C-nn` toca tela** — julgado pelo texto dele: tela, formulário, botão, o que o usuário vê — ⇒
   **pergunte ao humano como prosseguir**, no chat e antes do code lookup: não siga em silêncio, não
   invente fonte, não dispare o code lookup com o design declarado ausente e não caia num valor de outro
   Work Item. A resposta decide: um link vira fonte e ganha o seu `pd-design-lookup` (**[local]** e entra
   em `item.md` › Insumos); "seguir sem design" vale como a declaração do passo 4. **Nenhuma fonte e
   nenhum `C-nn` toca tela** ⇒ siga sem design lookup, sem reclamar e sem perguntar. **[productdock]**
   Falha de sessão bloqueia a fase, como no passo 1
3. **Leia o report de eval quando a condição vale** (`eval.ler`) — o Work Item vem de um achado de eval,
   ou o escopo toca uma dimensão avaliada (segurança, observabilidade, qualidade de backend, qualidade de
   frontend) —, antes do code lookup. **[productdock]** A fonte é a plataforma, nunca o `latest.json` de
   `.productdock/evals/`; sem avaliação daquele tipo, segue sem citar; falha de sessão **bloqueia a fase**.
   **[local]** Só quando o repositório tem relatório local (ex.: `.specs/evals/<tipo>/latest.json`): é
   opcional e nunca bloqueia. Cada achado que o Work Item resolve se liga ao `C-nn` que o resolve e vai no
   `escopo` do code lookup — o procedimento está no [lookup.md](../discovery/lookup.md). Condição que não
   vale, ou sem relatório: nada se lê, e o bloco de achados do Diagnóstico fica `nada`
4. **Localize o ponto do ajuste pelo lookup**, não por leitura sua na thread principal. Um `pd-code-lookup`
   por repositório que o escopo alcança, todos na mesma mensagem — é o mesmo agent da entrada com PRD, com o
   mesmo briefing, e o `design` dele é o retorno do passo 2 — ou, sem fonte de design, a declaração "este
   Work Item não tem design". O que os anexos dizem vai no `escopo`, junto do `C-nn` a que se liga
5. **Testes existentes são obrigatórios no levantamento.** No ponto do ajuste: que teste já existe, e a
   decisão explícita — ajustar os que existem, criar novos, ou os dois. Nenhum plano fecha sem isso
6. **Levantamento que desmente esta entrada para antes do plano.** O lookup achou contrato público novo ou
   alterado (rota, API, schema, migration, evento) consumido por outro repositório, regra de negócio que só
   o produto escreve, ou decisão de produto em aberto: **pare antes de escrever o `plan.md`**, mostre a
   evidência com `caminho:linha` e pergunte, no chat, como seguir. A decisão é do humano.
   - **[productdock]** **Não registre troca de fluxo e não sugira a troca** — a troca `fast → full` nunca
     é sugerida pelo agente ([Fluxo Rápido](../pd-sync/workflow.md#fluxo-rápido)). Pedida a troca pelo
     humano, vale o que o Fluxo Rápido diz; em tipo sem troca, o registro vai a `Riscos` e `Não
     resolvido`, e reclassificar o Work Item é com ele, na plataforma
   - **[local]** As opções são manter a entrada sem PRD, levar o Work Item à descoberta, ou o humano
     trazer um PRD. Trocada a entrada, grave `entrada` e `fase` no `item.md`
     ([o item.md](../setup/local.md#o-itemmd)) e siga o caminho novo; mantida, o registro vai a `Riscos`
     e `Não resolvido`
7. **As perguntas não seguram o plano.** Esta entrada promete **um** gate de aprovação, e uma pergunta
   antes do plano é um gate a mais. Separe as incertezas do levantamento em dois grupos:
   - **com recomendação defensável** — sustentada em `caminho:linha`, no arquivo de instruções ou no caso
     análogo do repositório: o status devolvido num caso repetido, o nome de uma função, qual de duas
     mensagens mostrar. Escreva o plano **com a recomendação como premissa** e registre a pergunta em
     `Perguntas e respostas` como `a ratificar`
   - **sem recomendação defensável, ou que muda escopo ou entrada** — regra de negócio que só o produto sabe, comportamento órfão. Tela
     sem fonte já foi antes do code lookup (passo 2), e o que muda a entrada é o passo 6

   O canal é por backend ([o que cada backend habilita](../setup/backend.md#o-que-cada-backend-habilita)):

   - **[productdock]** a `a ratificar` vai junto do plano e da fila, e a aprovação a ratifica. **Só a sem
     recomendação, ou a que muda escopo ou entrada, para antes do plano**, todas num turno só, no chat
   - **[local]** a sem recomendação entra em `Perguntas e respostas` com a recomendação `—` e a resposta
     `em aberto`, e o trecho que depende dela em `Não resolvido` até a resposta. As duas vão juntas, numa
     abertura só, ao [gate das perguntas do plano](#as-perguntas--o-gate-da-página)

   Pergunta cuja resposta não muda nada não se faz

8. Toda afirmação sobre o código carrega `caminho:linha`. A data do cabeçalho é o que a qualifica
9. Não invente o que o lookup não disse. Seção sem conteúdo se escreve `nada`

## Regras

1. **A fila não entra no plano.** Ele antecede o fatiamento — nenhum número de tarefa, nenhuma ordem
2. **Convenção não entra** — é o arquivo de instruções de cada repositório que governa
3. **Um gate no chat só, e é o do fatiamento.** Não peça aprovação do plano em separado, e **não pare
   antes dele por pergunta que tem recomendação defensável**: ela entra no plano como premissa `a
   ratificar`. Sem PRD, o plano e a fila são a mesma decisão, e dois gates no chat para uma decisão é a
   cerimônia que esta entrada existe para não ter.
   **[productdock]** Escrito e publicado o plano, apresente-o **junto com as perguntas a ratificar e a
   fila**, no mesmo turno, e encerre: a aprovação ratifica. **[local]** Havendo perguntas, elas vão antes
   pela página, todas numa abertura; respondidas — ou não havendo nenhuma —, apresente o plano **e a fila
   no mesmo turno**, e encerre
4. O que ficou em aberto aparece nominalmente em `Não resolvido` — é dele que sai o `Fica fora` da fila
5. Descoberta posterior que torne falsa uma afirmação do plano se corrige **no plano**, no próprio
   arquivo, e o artefato se publica de novo (`artefato.publicar(plan)`): dois enunciados divergentes é
   pior que um só

## As perguntas — o gate da página

**[local]** O **gate das perguntas do plano** é review técnico com perguntas ao humano, e por isso vai pela
página do [handoff.md](../discovery/handoff.md) — o mesmo `handoff.json`, o mesmo servidor, na
[pasta temporária](../setup/local.md#a-pasta-temporária). Só abre se `Perguntas e respostas` tem linha.
**[productdock]** Este gate não existe: vale o passo 7 e a Regra 3.

1. Escrito o `plan.md` com as premissas, monte um item por linha de `Perguntas e respostas`: a pergunta
   `a ratificar` leva a recomendação como opção sugerida e se ratifica com um clique; a `em aberto` é
   **obrigatória**, com 2–3 sugestões e a linha `Muda`
2. **A página é obrigatória.** Sem Node ≥ 18, sem porta, timeout ou erro do servidor ⇒ **bloqueie** o gate,
   diga exatamente como resolver e pare — o procedimento é o do [handoff.md](../discovery/handoff.md).
   Inline no chat **só quando o humano pedir explicitamente nesta conversa** ("responde no chat", "sem
   página"); silêncio ou "pode seguir" não é pedido
3. Respondida, aplique ao `plan.md`: ratificada vira `ratificada no gate`; respondida de outro jeito entra
   **verbatim**, e o plano se corrige no trecho que ela tocava; a `em aberto` respondida sai de `Não
   resolvido`. Então `gate.registrar(perguntas do plano)` ([backend](../setup/backend.md))
4. Então fatie, e apresente **plano + fila no mesmo turno**, no chat ([tasks.md](../planning/tasks.md)).
   Objeção ao plano na aprovação da fila corrige o `plan.md` e a fila antes de escrever `tasks/`

## Saída — arquivo `[ITEM_DIR]/plan.md`

Toda seção é obrigatória, na ordem abaixo.

```markdown
# <WI-REF> · <título>

Costura de <data>. Sem PRD — <bug | incident | technical_debt | improvement em Fluxo Rápido | improvement sem PRD>.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Convenção de cada repositório: o arquivo de instruções dele.

## Diagnóstico

<o que está errado, ou a dívida a pagar, com `caminho:linha` real. Para improvement: o que passa a
existir, e por que cabe sem PRD.>

**Achados de eval que este Work Item resolve**

Eval `<tipo>` · repositório `<repositório>` · execução `<execução>` de `<data>`.
| Achado (`id`) | Severidade | `arquivo:linha` no report | Resolvido por |
|---|---|---|---|
| | | | C-nn |

<um cabeçalho e uma tabela por execução lida, como no [spec.md](spec.md). O `arquivo:linha` é o do
report, na data da execução — o de hoje vai em **Código**, no `O que muda`. `nada` com o porquê: a
condição do report de eval não vale; não há avaliação daquele tipo; ou nenhum achado cabe no escopo.>

**Anexos consultados**

| Anexo | Tipo | O que se tirou | Alimenta |
| ----- | ---- | -------------- | -------- |
|       |      |                | C-nn     |

<um anexo por linha, todos os que `insumos.ler` listou, como no [spec.md](spec.md). O arquivo baixado
se apaga com a pasta temporária: "O que se tirou" guarda o conteúdo que importou — o caso, a regra, a
evidência —, não só o nome. Anexo que não diz nada do escopo fica com "consultado, sem uso" e o porquê,
e `—` em Alimenta; anexo que não foi possível ler diz isso, e por quê. `nada` com o porquê: o Work Item
não tem anexo nem insumo.>

## Comportamentos

| #    | O que precisa passar a ser verdade |
| ---- | ---------------------------------- |
| C-01 |                                    |

<`C-nn` que resolve um achado de eval cita o `id` dele no texto.>

## Fora do escopo

<o que este Work Item explicitamente não resolve.>

## Design

Fontes: <cada fonte de design lida — [productdock] o protótipo do Work Item, com nome, `tool` e URL;
[local] o link, a ferramenta, e de onde veio (o pedido, `item.md` › Insumos) —, ou a fonte que o humano
deu ao responder a pergunta de como prosseguir, com a pergunta e a resposta.>

<o comportamento consolidado pelo design lookup, uma subseção por tela: estrutura, dados exibidos,
campos, ações, estados vazio/carregando/erro. Divergência entre fontes: o que valeu, e quem decidiu.
`nada` só em dois casos: sem fonte e nenhum `C-nn` toca tela; ou o humano mandou seguir sem design — e
aí a pergunta e a resposta ficam registradas aqui.>

## Código — <caminho do repositório>

Uma seção destas por repositório onde o lookup rodou.

- **Instruções** — os arquivos de instruções lidos; para o grande demais, as seções que governam esta
  mudança, como `caminho › seção`
- **Recorte** — os `C-nn` que este repositório reivindicou
- **O que já serve** — com `caminho:linha`
- **O que muda** — com `caminho:linha`; o achado de eval que o Work Item resolve, com o `id` dele e onde
  o código está hoje
- **O que nasce**
- **Exemplares** — o que imitar, por tipo de artefato, com `caminho:linha`
- **Obrigações transversais** — o que o repositório exige de todo código novo
- **Testes** — o que já existe no ponto do ajuste, a decisão (ajustar · criar · ambos), e o
  comportamento a cobrir em cada nível
- **Depende / Expõe** — só quando há mais de um repositório

## Fronteira entre repositórios

Um repositório só: `nada`.
| Depende (repo) | Expõe (repo) | Como casou |
|---|---|---|

## Cobertura

Todo `C-nn` aparece aqui.
| # | Reivindicado por |
|---|---|

## Perguntas e respostas

O que o levantamento levou ao humano nesta entrada. A pergunta com recomendação defensável entra com a
recomendação como premissa e a resposta `a ratificar`; [productdock] aprovada a fila sem objeção, vira
`ratificada na aprovação`; [local] ratificada na página, vira `ratificada no gate`, e a sem recomendação
entra `em aberto` até a resposta. Respondida de outro jeito, a resposta entra verbatim e o plano se
corrige. `nada` se não houve.
| # | A pergunta | A recomendação (premissa do plano) | A resposta |
|---|---|---|---|

## Riscos

<regressões possíveis, áreas adjacentes que o ajuste encosta.>

## Não resolvido

<o que continua aberto, e por quê.>
```

O cabeçalho e o parágrafo abaixo dele são literais. O rótulo do improvement é **[productdock]**
`improvement em Fluxo Rápido`; **[local]** `improvement sem PRD`.

## Persistência

Escrito o plano, persista **antes** de apresentar a fila, na ordem ([backend](../setup/backend.md)):

1. o `[ITEM_DIR]/plan.md`, completo — **[local]** com as respostas do gate das perguntas já aplicadas,
   quando houve
2. `artefato.publicar(plan)`, na mesma fase `specify` da costura com PRD. **[productdock]** O plano vai à
   plataforma com as perguntas `a ratificar`. **[local]** Não há envio: o `plan.md` em disco é o artefato
3. **[local]** `gate.registrar(perguntas do plano)`, quando houve, e `fase.entrar(tasks)`.
   **[productdock]** Não há transição de fase aqui: a próxima é `implement`, depois da fila
   ([tasks.md](../planning/tasks.md#5-entrar-no-implement))

O plano **nunca fica com uma premissa superada**. **[productdock]** Aprovada a fila, atualize a coluna `A
resposta` — `ratificada na aprovação`, ou a resposta verbatim; resposta que muda uma premissa corrige
também o trecho do plano que ela tocava e a fila — e **publique o `plan` de novo**
(`artefato.publicar(plan)`, Regra 5) **antes** de escrever `tasks/` e de publicar a fila. **[local]**
Resposta que muda uma premissa — na página ou na aprovação da fila — corrige o trecho do plano que ela
tocava, e a fila, **antes** de escrever `tasks/` (Regra 5). Versionar o `plan.md` é do humano, a pedido.

## Retomada

Sessão perdida **antes** do plano, por backend
([o que cada backend habilita](../setup/backend.md#o-que-cada-backend-habilita)):

- **[productdock]** o plano é o **único estado em disco** desta entrada: sessão perdida antes dele
  recomeça o Work Item
- **[local]** o estado em disco é o `item.md`, a costura e o status das tarefas
  ([sinais da retomada](../setup/local.md#sinais-da-retomada)): sessão perdida antes do plano recomeça a
  fase `specify`, sem reabrir gate já registrado

Depois dele, nos dois, retoma no fatiamento lendo o `plan.md`, sem refazer lookup. Fila já escrita não é
retomada por aqui — é o caso da tabela de retomada do [SKILL.md](../../SKILL.md). **Com bugs abertos do
Work Item** (`bugs.abertos`), a fila escrita também não é refeita: cada bug sem fix task vira tarefa ao
fim de `tasks/`, em lote com os vizinhos da mesma tela ou componente — ver
[validation.md](../execution/validation.md#bugs-abertos-do-work-item).
