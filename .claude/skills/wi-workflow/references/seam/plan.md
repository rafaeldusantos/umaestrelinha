# Plan — a costura sem PRD

Mesmo papel do [spec.md](spec.md): **o que se escreve antes de fatiar**. Muda só o que a alimenta — aqui
não há PRD nem handoff, e só há design a ler quando o humano informou uma fonte — sem ela e com tela no
escopo, o humano diz como prosseguir. O que entra é o `item.md`, os insumos dele, as fontes de design
quando há, e o que o código responde.

Dali em diante o caminho é **idêntico** ao da entrada com PRD: fatiamento → `tasks/` → auditoria → corrida
da fila → Validation.

**Quando:** o `item.md` diz **`entrada: plano`** — `bug`, `incident`, `technical_debt`, ou `improvement`
pequeno que o humano aceitou levar sem PRD. Nenhum deles exige PRD: a ausência de `prd.md` é o esperado,
não bloqueio.

> A entrada é a do `item.md`, decidida no roteamento — não a redecida aqui pelo tipo. Para `improvement`
> sem PRD, `entrada: plano` é **sugestão** do agente, nunca decisão dele: sugerida com justificativa — o
> escopo cabe em poucas telas ou arquivos —, o agente para e espera; confirmada, grava no `item.md`;
> recusada, segue a descoberta e não insiste.

---

## Entrada

| Campo            | O que é                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `work item`      | título e **Descrição** do `item.md` — o pedido do humano, verbatim                                                                                              |
| `anexos`         | os insumos — os arquivos e URLs do pedido e de `item.md` › Insumos —, lidos sempre, antes de numerar os comportamentos, e o que se tirou de cada um ([lookup.md](../discovery/lookup.md)) |
| `comportamentos` | o que precisa passar a ser verdade, numerado `C-01`, `C-02`, … — um por comportamento verificável                                                               |
| `design`         | o retorno do `wi-design-lookup` de cada fonte de design que o humano informou — só quando há — ou da fonte que ele deu ao responder a pergunta                  |
| `código`         | o retorno do `wi-code-lookup` de cada repositório que o Work Item alcança                                                                                       |
| `eval`           | o relatório de avaliação local — só quando o repositório tem um e a condição do [lookup.md](../discovery/lookup.md) vale —, e os achados que o WI resolve       |

**Os comportamentos substituem os UCs.** Sem PRD não há critério de aceite escrito por ninguém, então é
aqui que ele nasce — e é contra esta lista que a auditoria da fila confere. Numere-os a partir do título,
da descrição e dos insumos, antes de disparar o lookup: é o `escopo` que cada subagent recebe.

## O que não roda nesta entrada

| Etapa                       | Por quê                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PRD Tech Review             | não há PRD a revisar                                                                                                                                                                       |
| Design lookup sem fonte     | nenhum link de design nos insumos **e nenhum `C-nn` toca tela**: não há design a ler, e segue sem reclamar e sem perguntar                                                                 |
| Handoff principal           | não há decisão de produto pendente — pergunta com recomendação defensável vira premissa `a ratificar` no plano e vai ao [gate das perguntas do plano](#as-perguntas--o-gate-da-página)       |
| Conferência de fronteira    | só quando o lookup rodou em **mais de um** repositório                                                                                                                                     |

O design lookup **roda** quando o humano informou fonte de design: sem PRD, os links de design do pedido e
de `item.md` › Insumos são a fonte ([lookup.md](../discovery/lookup.md)). Só eles — e a fonte que o humano
der ao responder a pergunta do passo 2 do Comportamento: nesta entrada não há seção UI/UX de PRD a ler, e
as fontes declaradas no `PROJECT.md` não disparam lookup sozinhas — dão, no máximo, a mecânica de uma
ferramenta desconhecida. Nenhuma fonte com algum `C-nn` que toca tela não é o caso "não roda": é essa
pergunta ao humano.

A conferência de **cobertura** roda sempre, e é barata: todo `C-nn` foi reivindicado no `Recorte` de
algum repositório? Nenhum reivindicou, é órfão e vai ao gate das perguntas do plano, sem recomendação.

## Comportamento

1. **Leia os insumos, sempre**, antes de numerar os `C-nn`: cada arquivo e cada URL que o humano listou no
   pedido e em `item.md` › Insumos. Arquivo do repositório se lê no lugar; URL que precisa ser baixada vai
   à [pasta temporária](../setup/estado.md#a-pasta-temporária), nunca a `[ITEM_DIR]`. XLSX com ferramenta
   local; sem como ler, o bloco **Anexos consultados** diz isso. Numere os comportamentos a partir do
   título, da descrição e do que os insumos dizem. Imagem é insumo de escopo, não fonte de design: não
   dispara `wi-design-lookup`. Nenhum insumo é o caso comum — segue sem reclamar e sem perguntar, e o
   bloco fica `nada`, com o porquê
2. **Resolva a fonte de design** antes do code lookup. **Link de design nos insumos** ⇒ um
   `wi-design-lookup` por fonte, todos na mesma mensagem, cada um com o link como `fonte` e os `C-nn` como
   `escopo` — a mecânica pela forma do link (`figma`, `claude_design`, `link`), e ferramenta desconhecida é
   pergunta ao humano, como no [lookup.md](../discovery/lookup.md). **Nenhuma fonte e algum `C-nn` toca
   tela** — julgado pelo texto dele: tela, formulário, botão, o que o usuário vê — ⇒ **pergunte ao humano
   como prosseguir**, no chat e antes do code lookup: não siga em silêncio, não invente fonte, não dispare
   o code lookup com o design declarado ausente e não caia num valor de outro Work Item. A resposta
   decide: um link vira fonte, entra em `item.md` › Insumos e ganha o seu `wi-design-lookup`; "seguir sem
   design" vale como a declaração do passo 4. **Nenhuma fonte e nenhum `C-nn` toca tela** ⇒ siga sem
   design lookup, sem reclamar e sem perguntar
3. **Leia o relatório de avaliação quando há e a condição vale** — o Work Item vem de um achado de
   avaliação, ou o escopo toca uma dimensão avaliada (segurança, observabilidade, qualidade de backend,
   qualidade de frontend) **e** o repositório tem relatório local (ex.: `.specs/evals/<tipo>/latest.json`),
   antes do code lookup. É opcional e nunca bloqueia: sem relatório, nada se lê, e o bloco de achados do
   Diagnóstico fica `nada`. Cada achado que o Work Item resolve se liga ao `C-nn` que o resolve e vai no
   `escopo` do code lookup ([lookup.md](../discovery/lookup.md))
4. **Localize o ponto do ajuste pelo lookup**, não por leitura sua na thread principal. Um `wi-code-lookup`
   por repositório que o escopo alcança, todos na mesma mensagem — é o mesmo agent da entrada com PRD, com o
   mesmo briefing, e o `design` dele é o retorno do passo 2 — ou, sem fonte de design, a declaração "este
   Work Item não tem design". O que os insumos dizem vai no `escopo`, junto do `C-nn` a que se liga
5. **Testes existentes são obrigatórios no levantamento.** No ponto do ajuste: que teste já existe, e a
   decisão explícita — ajustar os que existem, criar novos, ou os dois. Nenhum plano fecha sem isso
6. **Levantamento que desmente esta entrada para antes do plano.** O lookup achou contrato público novo ou
   alterado (rota, API, schema, migration, evento) consumido por outro repositório, regra de negócio sem
   dono, ou decisão de produto em aberto: **pare antes de escrever o `plan.md`**, mostre a evidência com
   `caminho:linha` e pergunte, no chat, como seguir — manter a entrada sem PRD, levar o Work Item à
   descoberta, ou o humano trazer um PRD. A decisão é dele. Trocada a entrada, grave `entrada` e `fase` no
   `item.md` ([estado.md](../setup/estado.md#o-itemmd)) e siga o caminho novo; mantida, o registro vai a
   `Riscos` e `Não resolvido`
7. **As perguntas não seguram o plano.** Separe as incertezas do levantamento em dois grupos:
   - **com recomendação defensável** — sustentada em `caminho:linha`, no arquivo de instruções ou no caso
     análogo do repositório: o status devolvido num caso repetido, o nome de uma função, qual de duas
     mensagens mostrar. Escreva o plano **com a recomendação como premissa** e registre a pergunta em
     `Perguntas e respostas` como `a ratificar`
   - **sem recomendação defensável** — regra de negócio que só o produto sabe, comportamento órfão. Registre
     em `Perguntas e respostas` com a recomendação `—` e a resposta `em aberto`, e o trecho que depende dela
     em `Não resolvido` até a resposta. Tela sem fonte já foi antes do code lookup (passo 2), e o que muda a
     entrada é o passo 6

   As duas vão juntas, numa abertura só, ao [gate das perguntas do plano](#as-perguntas--o-gate-da-página).
   Pergunta cuja resposta não muda nada não se faz

8. Toda afirmação sobre o código carrega `caminho:linha`. A data do cabeçalho é o que a qualifica
9. Não invente o que o lookup não disse. Seção sem conteúdo se escreve `nada`

## Regras

1. **A fila não entra no plano.** Ele antecede o fatiamento — nenhum número de tarefa, nenhuma ordem
2. **Convenção não entra** — é o arquivo de instruções de cada repositório que governa
3. **Um gate no chat só, e é o do fatiamento.** Havendo perguntas, elas vão antes pela página, todas numa
   abertura; respondidas — ou não havendo nenhuma —, apresente o plano **e a fila no mesmo turno**, e
   encerre. Não peça aprovação do plano em separado, e **não pare antes dele por pergunta que tem
   recomendação defensável**: ela entra no plano como premissa `a ratificar`. Sem PRD, o plano e a fila são
   a mesma decisão, e dois gates no chat para uma decisão é a cerimônia que esta entrada existe para não ter
4. O que ficou em aberto aparece nominalmente em `Não resolvido` — é dele que sai o `Fica fora` da fila
5. Descoberta posterior que torne falsa uma afirmação do plano se corrige **no plano**, no próprio
   arquivo: dois enunciados divergentes é pior que um só

## As perguntas — o gate da página

O **gate das perguntas do plano** é review técnico com perguntas ao humano, e por isso vai pela página
do [handoff.md](../discovery/handoff.md) — o mesmo `handoff.json`, o mesmo servidor, na
[pasta temporária](../setup/estado.md#a-pasta-temporária). Só abre se `Perguntas e respostas` tem linha.

1. Escrito o `plan.md` com as premissas, monte um item por linha de `Perguntas e respostas`: a pergunta
   `a ratificar` leva a recomendação como opção sugerida e se ratifica com um clique; a `em aberto` é
   **obrigatória**, com 2–3 sugestões e a linha `Muda`
2. **A página é obrigatória.** Sem Node ≥ 18, sem porta, timeout ou erro do servidor ⇒ **bloqueie** o gate,
   diga exatamente como resolver e pare — o procedimento é o do [handoff.md](../discovery/handoff.md).
   Inline no chat **só quando o humano pedir explicitamente nesta conversa** ("responde no chat", "sem
   página"); silêncio ou "pode seguir" não é pedido
3. Respondida, aplique ao `plan.md`: ratificada vira `ratificada no gate`; respondida de outro jeito entra
   **verbatim**, e o plano se corrige no trecho que ela tocava; a `em aberto` respondida sai de `Não
   resolvido`. Linha no `item.md` › Gates (`perguntas do plano`)
4. Então fatie, e apresente **plano + fila no mesmo turno**, no chat ([tasks.md](../planning/tasks.md)).
   Objeção ao plano na aprovação da fila corrige o `plan.md` e a fila antes de escrever `tasks/`

## Saída — arquivo `[ITEM_DIR]/plan.md`

Toda seção é obrigatória, na ordem abaixo.

```markdown
# <WI-ID> · <título>

Costura de <data>. Sem PRD — <bug | incident | technical_debt | improvement sem PRD>.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Convenção de cada repositório: o arquivo de instruções dele.

## Diagnóstico

<o que está errado, ou a dívida a pagar, com `caminho:linha` real. Para improvement sem PRD: o que passa a
existir, e por que cabe sem PRD.>

**Achados de eval que este Work Item resolve**

Relatório `<caminho do relatório local>` · repositório `<repositório>` · execução de `<data>`.
| Achado (`id`) | Severidade | `arquivo:linha` no relatório | Resolvido por |
|---|---|---|---|
| | | | C-nn |

<um cabeçalho e uma tabela por relatório lido. O `arquivo:linha` é o do relatório, na data da execução — o
de hoje vai em **Código**, no `O que muda`. `nada` com o porquê: o repositório não tem relatório de
avaliação local; a condição não vale; ou nenhum achado cabe no escopo.>

**Anexos consultados**

| Insumo (caminho ou URL) | Tipo | O que se tirou | Alimenta |
| ----------------------- | ---- | -------------- | -------- |
|                         |      |                | C-nn     |

<um insumo por linha, todos os que o humano informou. Arquivo baixado de URL se perde com a pasta
temporária: "O que se tirou" guarda o conteúdo que importou — o caso, a regra, a evidência —, não só o
nome. Insumo que não diz nada do escopo fica com "consultado, sem uso" e o porquê, e `—` em Alimenta;
insumo que não foi possível ler diz isso, e por quê. `nada` com o porquê: o humano não informou insumo
nenhum.>

## Comportamentos

| #    | O que precisa passar a ser verdade |
| ---- | ---------------------------------- |
| C-01 |                                    |

<`C-nn` que resolve um achado de eval cita o `id` dele no texto.>

## Fora do escopo

<o que este Work Item explicitamente não resolve.>

## Design

Fontes: <cada fonte de design lida — o link, a ferramenta, e de onde veio (o pedido, `item.md` › Insumos)
—, ou a fonte que o humano deu ao responder a pergunta de como prosseguir, com a pergunta e a resposta.>

<o comportamento consolidado pelo design lookup, uma subseção por tela: estrutura, dados exibidos,
campos, ações, estados vazio/carregando/erro. Divergência entre fontes: o que valeu, e quem decidiu.
`nada` só em dois casos: sem fonte e nenhum `C-nn` toca tela; ou o humano mandou seguir sem design — e aí
a pergunta e a resposta ficam registradas aqui.>

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

O que o levantamento levou ao humano nesta entrada, pelo gate das perguntas do plano. A pergunta com
recomendação defensável entra com a recomendação como premissa e a resposta `a ratificar`; ratificada na
página, vira `ratificada no gate`; respondida de outro jeito, a resposta entra verbatim e o plano se
corrige. A sem recomendação entra `em aberto` até a resposta. `nada` se não houve.
| # | A pergunta | A recomendação (premissa do plano) | A resposta |
|---|---|---|---|

## Riscos

<regressões possíveis, áreas adjacentes que o ajuste encosta.>

## Não resolvido

<o que continua aberto, e por quê.>
```

O cabeçalho e o parágrafo abaixo dele são literais.

## Persistência

Escrever o arquivo **é** persistir: o `plan.md` em disco é o artefato, e não existe envio depois dele.
Antes de apresentar a fila, na ordem:

1. o `[ITEM_DIR]/plan.md`, completo — com as respostas do gate das perguntas já aplicadas, quando houve
2. no `item.md`, a linha `perguntas do plano` na tabela **Gates**, quando houve
   ([estado.md](../setup/estado.md#o-itemmd))
3. no `item.md`, `fase: tasks`

O plano em disco **nunca fica com uma premissa superada**: resposta que muda uma premissa — na página ou na
aprovação da fila — corrige o trecho do plano que ela tocava, e a fila, **antes** de escrever `tasks/`
(Regra 5). Versionar o `plan.md` é do humano, a pedido
([estado.md](../setup/estado.md#versionar--só-a-pedido)). A próxima transição de fase é `implement` — ver
[tasks.md](../planning/tasks.md).

## Retomada

O estado em disco é o `item.md`, a costura e o status das tarefas
([estado.md](../setup/estado.md#retomada)). Sessão perdida antes do plano recomeça a fase `specify`;
depois dele, retoma no fatiamento lendo o `plan.md`, sem refazer lookup. Fila já escrita não é retomada.
**Com bugs abertos da QA** (`qa/issues/BUG-*.md` abertos), a fila escrita também não é refeita: cada bug
sem fix task vira tarefa ao fim de `tasks/`, em lote com os vizinhos da mesma tela ou componente — ver
[validation.md](../execution/validation.md#bugs-abertos-da-qa).
