# PRD Tech Review — Revisão técnica do PRD (upstream)

**Goal**: Antes do lookup, validar o **`prd.md`** contra o codebase, levar ao humano **num gate só, pela
página**, tudo o que o parecer achou e exige decisão, aplicar as respostas onde cada uma pertence e
registrar a rodada em `[ITEM_DIR]/prd-review.md`. **Consultivo — sem auto-fix**: nada do parecer toca o
`prd.md` nem a costura sem a resposta do humano.

> **Quem responde é sempre o humano da sessão.** Não há PM nem fórum separado: o eixo
> [`owner`](#o-eixo-owner--de-que-natureza-é-a-decisão) não diz mais _quem_ decide, e sim **de que
> natureza é a decisão** — e, por isso, **para onde vai a resposta**. Negócio reescreve o trecho do
> `prd.md`; técnico vai à seção **Decisões** da costura e nunca toca o `prd.md`. A ordem é fixa: o
> parecer é **retriado**, o gate do PRD Tech Review abre **uma vez** com todos os findings que não são
> `none`, as respostas são aplicadas, e a rodada é registrada.

> Absorve a antiga skill `fullstack-prd-tech-review`. A execução (exploração `thorough`) é **delegada a um
> subagente genérico**; o agente principal consome o parecer consolidado, retria e abre o gate.

---

## Quando rodar

- **`entrada: prd`** — o `prd.md` já está em `[ITEM_DIR]` (cópia fiel do arquivo, da URL ou do texto
  colado; ver o [roteamento](../../SKILL.md)). Roda **antes de disparar qualquer lookup**: lookup sobre
  PRD que vai mudar é trabalho jogado fora.
- **`entrada: descoberta`** — depois que o gate da descoberta fechou e o cabeçalho do `prd.md` diz
  `ratificado no gate`. Roda **inteiro**, igual à entrada com PRD: é a validação adversarial do PRD que a
  descoberta escreveu, não uma formalidade. O `discovery.md` entra no briefing do subagente como
  evidência ([Passo 2](#passo-2--exploração-profunda-do-codebase-thorough)), e só.
- **`entrada: plano`** — não há PRD; não roda PRD Tech Review (vai para [plan.md](../seam/plan.md)).
- **`entrada: prd` sem `prd.md` legível** — o arquivo não abre, a URL não carrega, o texto não veio:
  peça ao humano que cole o conteúdo, salve-o em `prd.md` com a origem anotada, e só então siga. **Não
  prossiga** para a Spec sem PRD em disco.

Ao começar, a linha `fase:` do `item.md` passa a `prd-review` ([estado.md](../setup/estado.md#o-itemmd)).

## Passo 1 — Carregar o PRD e o registro anterior

- **O Work Item**: `[ITEM_DIR]/item.md` — `id`, `titulo`, `tipo`, `entrada`, a **Descrição** e os
  **Insumos**. Os insumos se leem aqui como em [lookup.md](lookup.md#os-anexos-do-work-item): o que eles
  dizem completa o PRD no briefing.
- **O PRD**: `[ITEM_DIR]/prd.md`, inteiro — título, problema de negócio, RF, RNF, critérios de aceite,
  escopo (dentro/fora), Expectativas de UI/UX. E a **versão revisada**, `prd_version`: `1` mais o número de
  linhas da seção `## Histórico de revisões` ao fim do arquivo (sem a seção, `1`).
- **O domínio**: `.specs/project/PROJECT.md` — a Visão, a Topologia e as referências às instruções do
  sistema. É o vocabulário contra o qual o parecer casa os nomes do PRD; ausente uma dimensão, declare.
- **O registro anterior**: `[ITEM_DIR]/prd-review.md`.
  - Não existe → é a **rodada 1**.
  - Existe → é a **rodada N+1**, com `N` o número da última rodada registrada nele: aplique a
    [Rodada N+1](#rodada-n1--o-que-já-foi-respondido) antes de escrever o parecer. Sem essa leitura, a
    rodada reemite achados que o humano já respondeu.
- **Na entrada por descoberta**, também `[ITEM_DIR]/discovery.md` — o Diagnóstico, com os `caminho:linha`
  que a descoberta levantou.

## Passo 2 — Exploração profunda do codebase (`thorough`)

**Não faça amostragem.** Antes de instruir o subagente, identifique a stack e a estrutura do projeto:

- **Monorepo:** se houver workspaces (pnpm/Turborepo/Nx/Lerna), listar os packages/apps relevantes
  (`apps/`, `packages/`) e instruir o subagente a explorar **todos** os relevantes ao domínio do PRD — não
  só a raiz.
- **Git submodules:** verificar `.gitmodules`; submodules não inicializados aparecem vazios e serão
  ignorados — avisar o usuário antes de prosseguir.
- **Vários repositórios:** quais existem é a **Topologia** do `PROJECT.md` que diz; o briefing leva o
  caminho de cada um que o PRD alcança.

Cobrir obrigatoriamente as camadas relevantes para a stack:

- **Camada de dados** — tabelas, colunas, enums, constraints, índices, migrations, modelos/schemas existentes
- **Lógica de negócio** — services, use cases, domain objects relacionados ao domínio do PRD
- **Interfaces de entrada** — controllers, rotas/API, resolvers, handlers, edge functions que expõem a funcionalidade
- **Contratos de tipos** — interfaces, DTOs, types, schemas do domínio
- **UI (se aplicável)** — telas, componentes e hooks relacionados
- **Utilitários relevantes** — parsers, engines, helpers, libs que o domínio usa

Para cada arquivo relevante, retornar: path, o que faz, tipos/interfaces, e o que **já está implementado vs
o que falta**. A análise é local ([code-analysis.md](code-analysis.md)). Afirmação sobre lib, API ou
versão se confere pela Knowledge Verification Chain do [SKILL.md](../../SKILL.md) — Context7 e web
incluídos —, nunca de memória.

Perguntas-guia da exploração:

- Existe implementação que o PRD descreve como "a ser construída"?
- Existe modelo de dados (tabela/tipo/interface) que **conflita** com o que o PRD propõe?
- O fluxo descrito conecta-se a fluxos existentes? Como?
- Há protótipos, mocks ou telas desconectadas relacionadas ao tema?

**O briefing do subagente** leva: o `prd.md` inteiro, o que os insumos dizem, os caminhos dos
repositórios e das instruções do sistema, esta lista de camadas e perguntas, e o formato do
[parecer](#output-do-parecer) — com o `owner` nos quatro valores, um por finding. **Na entrada por
descoberta**, leva também o `discovery.md` como **evidência de partida**: o subagente confere cada
`caminho:linha` dele no disco e explora além dele. Diagnóstico da descoberta não é parecer pronto, e a
exploração não se encurta por ele — o que a descoberta afirmou e o código não confirma é finding.

## Passo 3 — Confrontar PRD × sistema (intenção)

- O que já existe, o que é novo, o que conflita com a **intenção** das instruções do sistema
  (AGENT.md/AGENTS.md/CLAUDE.md/`.github/instructions/`).
- **Declarar ausências explicitamente** — sem domínio, sem contexto ou sem evidência para uma dimensão,
  dizer que falta. **Nunca presumir.**
- Critério marcado `[conhecimento]` no PRD da descoberta é premissa do LLM, não fato do repositório: o
  parecer o confronta com o código como qualquer outro.

## O eixo `owner` — de que natureza é a decisão

`category` diz a **natureza do problema**; `owner` diz a **natureza da decisão** que o resolve — e, com
ela, onde a resposta vai morar. São eixos ortogonais. O teste é um só:

> _A resposta depende do que o **produto quer**, ou do que o **código permite**?_

| `owner`         | O que é                                                                                    | Na página               | Destino da resposta                                                                                      | Bloqueia o lookup?                                      | Conta no veredicto? |
| --------------- | ------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------- |
| `negocio`       | comportamento de produto, escopo, prioridade, regra de negócio                             | item **obrigatório**    | edição do trecho no `prd.md` ([Entrega](#entrega)), em linguagem de negócio                              | **só** `blocking` que o humano deixou sem resposta      | sim                 |
| `tech`          | escolha de implementação, dependência, arquitetura, ferramenta                             | item **obrigatório**    | seção **Decisões** da costura ([spec.md](../seam/spec.md)); **nunca** toca o `prd.md`                     | não                                                     | **não**             |
| `tech_prd_edit` | decisão técnica que **muda comportamento observável ou critério de aceite** escrito no PRD | item **obrigatório**    | **Decisões** **e** edição do trecho do `prd.md` com o texto de substituição em linguagem de negócio      | não                                                     | sim, como `gap`     |
| `none`          | informativo — não há decisão a tomar                                                       | **não vai**             | só no parecer                                                                                            | não                                                     | não                 |

**`tech_prd_edit` é o caso híbrido**, e existe porque a decisão técnica às vezes torna falso um trecho do
PRD. A decisão continua sendo técnica e vai a **Decisões**; o que ela gera no `prd.md` é **a consequência
observável**, reescrita no trecho — nunca a escolha técnica que a provocou.

### A regra de conteúdo — o que pode ir ao `prd.md`

**Detalhe de implementação nunca entra no `prd.md`**: tecnologia, tabela, endpoint, lib, algoritmo
interno, formato de armazenamento. Ele é resposta técnica, e mora na seção **Decisões** da costura. A
pergunta é: _a decisão muda o que o usuário vê, faz ou recebe — ou um critério de aceite?_ Não muda ⇒
`tech`, e o `prd.md` não é tocado. Muda ⇒ `tech_prd_edit`, e a edição obedece a três coisas:

1. **Cita o trecho atual**, em `anchor.quote`, recorte literal do `prd.md`
2. **Traz o texto de substituição pronto**, para colar no lugar do trecho
3. **Está em linguagem de negócio** — comportamento e critério, nunca a escolha técnica que o provocou

O mesmo vale para as edições `negocio`: o texto que entra no `prd.md` é de produto.

O PRD que **congelou** uma escolha técnica num critério de aceite é o caso de borda: a substituição tira a
tecnologia do critério e deixa o comportamento. Exemplo: o critério prescreve `MD5` para guardar senhas —
a engenharia escolhe o substituto, que vai para **Decisões**; o texto de substituição diz _"a senha é
armazenada de forma irreversível, sem que ninguém da operação consiga lê-la"_, e não o nome do algoritmo
novo.

### Regras

1. **`owner` é obrigatório em todo finding.** Omitido, o finding vai à página como **item de
   classificação** — o humano diz a natureza e responde —, e você registra que faltou; nunca adivinhe pelo
   `severity`, e nunca o trate como `negocio` por default.
2. **Um achado tem um `owner` só.** Achado que se divide entre produto e técnica **são dois achados**, com
   `key` distinta cada um. Não escreva um item misto: a resposta dele não teria destino único.
3. **Achado com resposta correta única não é pergunta.** Havendo uma só saída defensável, **afirme-a** no
   `suggestion` e leve à página para ratificar — não a emita como pergunta aberta. Pergunta aberta é para
   onde há escolha real.
4. **`owner` é estável entre rodadas**, como a `key`. Mudou de uma rodada para outra, diga por quê no
   `body` do finding: o destino da resposta mudou, e uma decisão que estava em **Decisões** pode passar a
   reescrever o `prd.md` (ou o contrário).
5. **Nada se aplica sem resposta.** O agente não edita o `prd.md` nem escreve em **Decisões** por conta do
   parecer: quem transforma achado em mudança é a resposta da página. O `suggestion` é proposta, não
   decisão.

### Efeito no veredicto e no bloqueio

O `summary.verdict` se deriva **apenas dos findings `negocio` e `tech_prd_edit`** — os que pedem mudança
no `prd.md`. Os `tech` não entram na contagem: um PRD cujos únicos achados são técnicos sai `approved`,
porque não há nada nele a mudar. O veredicto descreve o `prd.md` **revisado** (`prd_version`), antes das
respostas — é informativo, e não decide o que segue.

O que segura o lookup é outra coisa: **só `negocio` com `category: "blocking"` que o humano deixou sem
resposta aplicável** — ele respondeu "não sei", "decido depois". A página não deixa item obrigatório em
branco, então isso só acontece por escolha dele. O escopo que esse bloqueio alcança fica travado: o UC vai
a `Fica fora` no fatiamento, com o bloqueio como motivo; alcançando o PRD inteiro, a fase para — diga o
que trava, que decisão isso exige, e encerre o turno. Os `tech` e os `tech_prd_edit` nunca seguram o
lookup: fecham no gate, e suas respostas entram nos briefings dele.

## Retriagem — antes do gate

O subagente classifica; a thread principal **retria** cada finding antes de montar a página. A retriagem
**não filtra o que vai ao humano** — tudo que não é `none` vai —, ela decide **para onde vai a resposta**.
Errar aqui é editar o `prd.md` com detalhe de implementação, ou enterrar em **Decisões** uma mudança que o
usuário vai ver.

| Resposta ao teste                                   | `owner` depois da retriagem                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| depende do que o produto quer                       | `negocio`                                                                      |
| depende do que o código e a stack permitem          | `tech`; `tech_prd_edit` se a decisão muda comportamento observável ou critério |
| não sei dizer                                       | **item de classificação** na página — o humano decide; nunca `negocio` por default |

Entre `tech` e `tech_prd_edit` decide a [regra de conteúdo](#a-regra-de-conteúdo--o-que-pode-ir-ao-prdmd).
Finding **sem `owner`** cai na última linha. Achado que mistura as duas naturezas se divide em dois
(Regra 2).

O parecer bruto do subagente e o rascunho da retriagem ficam na **pasta temporária**
([estado.md](../setup/estado.md#a-pasta-temporária)), nunca em `[ITEM_DIR]`.

Diga no CLI o resultado da retriagem, **inclusive quando nada mudou**: quantos findings por `owner`, e
quantos você moveu, de onde para onde.

## Output do parecer

O parecer é o envelope **`prd-review/v1`** (JSON), seguido de um corpo em markdown com a leitura humana do
diagnóstico. É o mesmo envelope que o [registro local](#o-registro-local) guarda, rodada a rodada.

```json
{
  "schema": "prd-review/v1",
  "work_item_ref": "<WI-ID>",
  "round": 1,
  "prd_version": 1,
  "reviewed_at": "<ISO 8601 com offset>",
  "skill": "wi-workflow/prd-tech-review",
  "skill_version": "<metadata.version do SKILL.md>",
  "summary": {
    "verdict": "approved | changes_requested_gaps | changes_requested_blocking",
    "blocking": 0,
    "gaps": 0,
    "questions": 0,
    "tech_decisions": 0,
    "scenarios": [
      {
        "title": "...",
        "type": "happy_path|alternativo|erro|borda|seguranca|performance",
        "risk": "P0|P1|P2"
      }
    ]
  },
  "findings": [
    {
      "id": "F1",
      "key": "slug-estavel-do-achado",
      "category": "blocking | gap | improvement | overlap | naming | question",
      "owner": "negocio | tech | tech_prd_edit | none",
      "severity": "critical | high | medium | low | info",
      "title": "...",
      "anchor": {
        "quote": "...",
        "prefix": "...",
        "suffix": "...",
        "section": "..."
      },
      "body": "parecer em markdown",
      "suggestion": "opcional",
      "questions": ["opcional"]
    }
  ]
}
```

**`findings[].key` (obrigatório)** — chave **estável entre rodadas** do mesmo achado: um slug curto,
semântico e em `kebab-case` derivado do problema, **não** do texto citado (ex.:
`credits-monthly-source-of-truth`, `rbac-permission-undefined`). É por ela que a rodada seguinte sabe o
que já foi respondido, e é ela o `id` do item na página. Regras:

- **Reemitir um achado ⇒ repetir exatamente a mesma `key`** registrada no `prd-review.md`. Chave diferente
  é achado novo: a resposta que o humano já deu se perde, e a pergunta volta como se fosse nova.
- **Nunca reciclar** uma `key` para um achado diferente, e nunca usar `F1`/`F2` (isso é o `id`, local ao
  envelope).

**`round`** — o número da rodada: `1`, ou o da última registrada no `prd-review.md` mais um.

**`prd_version`** — a versão do `prd.md` que a rodada **efetivamente revisou**, lida do Histórico de
revisões no Passo 1. É por ela que a rodada seguinte sabe se o PRD mudou depois do parecer.

**`findings[].owner`** — os quatro valores, e **todos ficam no envelope**: o registro é local, e a rodada
seguinte precisa das `key` técnicas tanto quanto das de negócio para não perguntar de novo.

**`findings[].suggestion`** — a proposta do parecer, que a página oferece como sugestão. No `negocio` e no
`tech_prd_edit`, é **o texto de substituição** do trecho, pronto e em linguagem de negócio; no
`tech_prd_edit`, precedido da decisão técnica que o provoca. No `tech`, a saída técnica proposta.

**Categorias de `findings[].category`** (taxonomia única): `blocking` (bloqueio — impede a implementação),
`gap` (lacuna — gera retrabalho se ignorada), `improvement` (melhoria — não bloqueia), `overlap`
(sobreposição com outro PRD/módulo), `naming` (nomenclatura em desacordo com o glossário/domínio),
`question` (pergunta objetiva sobre o produto — usar o array `questions[]` do próprio finding, não uma
seção à parte).

**`summary.blocking` / `gaps` / `questions`** contam os findings `negocio` e `tech_prd_edit` — o que pede
mudança no `prd.md`. **`summary.tech_decisions`** é **informativo**: conta os `tech`, cuja resposta vai a
**Decisões**.

**`summary.verdict`** é derivado dos findings, nunca arbitrado à mão, e **ignora os `tech` e os `none`**:
`blocking > 0` → `changes_requested_blocking`; senão `gaps > 0` → `changes_requested_gaps`; senão
`approved`. Um parecer com 8 decisões técnicas e nenhum achado de negócio sai `approved`.

**`summary.scenarios[]`** — Cenários Preliminares em **linguagem de negócio** (sem Gherkin/BDD/arquivos
`.feature`), cobrindo os tipos aplicáveis: happy_path, alternativo, erro, borda, seguranca, performance.

**`anchor.quote`** — o texto do `prd.md` **exatamente como está no arquivo**, curto (recorte literal,
nunca paráfrase): é ele que a edição procura e troca. `prefix`/`suffix` com ~30 caracteres de contexto de
cada lado desambiguam trechos repetidos; `section` leva o heading da seção onde o trecho aparece. Lacuna
sem trecho a trocar — o PRD não diz nada sobre aquilo — ancora no trecho mais próximo do assunto, e o
texto de substituição o reescreve já com o que faltava.

Template completo do registro: [templates/report/prd-tech-review-report.md](../../templates/report/prd-tech-review-report.md).

### Regras de redação (importante)

- **Cite arquivos e tabelas concretos** — não "o sistema já tem algo similar", e sim "a tabela `x` com
  campos A, B já cobre este requisito (`caminho/arquivo`)".
- **Bloqueio × Lacuna:** bloqueio **impede** a implementação (conflito de modelo, interface não
  especificada, elo quebrado); lacuna **gera retrabalho** se ignorada (comportamento ambíguo, campo sem
  fonte, enum não definido).
- **Nunca invente o que não encontrou** — se não existe no codebase, diga que não existe.
- **Sem seções de elogio ao PRD** — o parecer é técnico, não diplomático. Fatos do codebase primeiro,
  julgamento depois.

## Entrega

A ordem é fixa: **retriar → gate do PRD Tech Review, pela página → aplicar as respostas → registrar.**
Nada toca o `prd.md` nem a costura antes de o gate fechar.

1. **Retriar** — a [Retriagem](#retriagem--antes-do-gate), finding a finding, dita no CLI.

2. **Abrir o gate do PRD Tech Review** — **um só**, pela página, no formato de
   [handoff.md](handoff.md#o-gate-do-prd-tech-review--um-item-por-finding), havendo qualquer finding que
   não seja `none`. **Todos** eles vão — de negócio e técnicos —, um item obrigatório por finding, do que
   trava para o que não trava. Sem página, o gate **bloqueia**: a
   [política](handoff.md#servidor--e-a-política-de-bloqueio) é a do handoff, e inline só quando o humano
   pedir explicitamente. Sem nenhum finding que não seja `none`, não há página: vá ao passo 4.

3. **Aplicar as respostas**, verbatim, pela [regra das respostas](handoff.md#as-respostas):
   - **`negocio`** — troque **só** o trecho citado (`anchor.quote`) no `prd.md` pelo texto aprovado: a
     sugestão escolhida, com a ressalva do humano aplicada a ela, ou o texto livre dele. Resposta que não é
     um trecho pronto — uma decisão, um número — entra no trecho com a menor edição que a contenha, nas
     palavras do humano. Resposta "não sei / decido depois" não edita nada: o achado fica **aberto** no
     registro e, sendo `blocking`, vale o [bloqueio](#efeito-no-veredicto-e-no-bloqueio).
   - **`tech`** — a resposta vai à seção **Decisões** da costura quando ela for escrita; guarde-a no
     contexto até lá. **Nunca toca o `prd.md`.** Resposta que, aplicada, muda comportamento observável ou
     critério do PRD transforma o finding em `tech_prd_edit` — diga isso no CLI e leve o texto de
     substituição a uma segunda página do mesmo gate, só com esses itens: a edição do `prd.md` precisa de
     texto aprovado.
   - **`tech_prd_edit`** — a decisão vai a **Decisões** **e** o trecho do `prd.md` é trocado pelo texto
     de substituição aprovado. Resposta de que a decisão não muda nada que o PRD diga — é detalhe de
     implementação — rebaixa o finding a `tech`: só **Decisões**, e o `prd.md` fica como está.
   - **Classificado pelo humano** — segue a linha do `owner` que ele deu.

   Editado o `prd.md`, acrescente ao fim dele — criando a seção se não existir — uma linha em
   `## Histórico de revisões`: `r<n> · <data> · <keys alteradas>`. Rodada que não alterou o `prd.md` não
   ganha linha: o Histórico conta versões do texto, e é dele que sai o `prd_version` da rodada seguinte.
   **O PRD que veio de fora** — o arquivo do humano fora de `[ITEM_DIR]`, a URL — **não é editado**: só a
   cópia `prd.md`. Diga isso no CLI, com o caminho da origem, para o humano decidir se leva as mudanças
   para lá.

   Diga no CLI, por `key`, o trecho antes e depois de cada edição, o que foi a **Decisões**, e o que
   segue aberto.

4. **Registrar** — escreva a rodada em `[ITEM_DIR]/prd-review.md` ([O registro local](#o-registro-local)),
   e acrescente a linha do gate à tabela **Gates** do `item.md`
   ([handoff.md](handoff.md#registro--a-linha-do-gate-no-itemmd)): `prd-review r<n>`, a data, e o
   resultado — o `verdict`, quantos aplicados ao `prd.md`, quantos em **Decisões** e quantos abertos. A linha `fase:` passa a `specify`
   ([estado.md](../setup/estado.md#o-itemmd)). Rodada sem item na página registra igual, com `sem itens`.

O `handoff.json` e o `answers.json` ficam na pasta temporária; apague-os ao fechar a fase, ou deixe — são
temporários. **Interrompida a revisão antes de o gate fechar**, nada foi aplicado nem registrado: a
próxima sessão recomeça do Passo 1, e reaproveita o rascunho da pasta temporária só se ele ainda existir
e o `prd.md` não tiver mudado.

## O registro local

`[ITEM_DIR]/prd-review.md` é o registro do PRD Tech Review deste Work Item, e o único: não há histórico
em outro lugar. **Uma seção por rodada**, `## Rodada r<n>`, a mais recente no fim; rodada registrada não
se reescreve. Cada seção traz:

1. **O envelope `prd-review/v1`** da rodada, inteiro — todos os findings, com os quatro `owner`.
2. **As respostas da página, por `key`** — a `escolha`, o `texto`, o `owner` final (depois da
   classificação ou do rebaixamento) e o **estado**: `aplicado`, `aberto` ou `sem item` (os `none`).
3. **O que foi aplicado, e onde** — por `key`: o trecho antes e o trecho depois no `prd.md`, ou a linha
   que vai a **Decisões**. É o trecho depois que a rodada seguinte procura no `prd.md` para saber se ele
   mudou.
4. **A leitura humana** — o veredicto e o que pede atenção, em 2 a 4 frases.

O formato está no [template](../../templates/report/prd-tech-review-report.md). Versionar o registro segue
a Regra 1: só a pedido ([estado.md](../setup/estado.md#versionar--só-a-pedido)).

## Rodada N+1 — o que já foi respondido

A rodada N+1 acontece quando o humano pede nova revisão — o PRD de origem mudou e a cópia foi refeita, o
`prd.md` foi editado à mão, o escopo andou. Antes de recalcular os findings, percorra **cada `key`** do
`prd-review.md` — pelo estado da rodada mais recente em que ela aparece — e decida explicitamente:

| Estado no registro                                                                                      | Decisão                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `aplicado`, e o `prd.md` **não mudou** no trecho (o trecho depois está lá, literal; no `tech`, o `anchor.quote`) | **Não volta.** Está respondido — nem reescrito, nem com outra `key`.                                                                     |
| `aplicado`, e o `prd.md` **mudou** no trecho depois da resposta                                         | **Reemitir com a mesma `key`**, se o problema persiste no texto novo, dizendo no `body` o que mudou e qual foi a resposta anterior. Sanado no texto novo → não volta. |
| `aberto` ("não sei / decido depois"), e o problema **persiste**                                         | **Reemitir com a mesma `key`**, com a pergunta de antes; se nada mudou, diga isso — não reescreva o achado.                                     |
| `aberto`, e o texto **sanou** o problema                                                                | **Não reemitir.** Registre na rodada como sanado.                                                                                              |
| `sem item` (`none`)                                                                                     | Volta só no parecer, se ainda vale. Nunca vai à página.                                                                                        |

O achado reemitido vai à página **com a resposta anterior no `corpo`**: o humano vê o que já disse e o
que mudou desde então. Os achados **novos** passam pela retriagem como na rodada 1. Então siga a mesma
[Entrega](#entrega), com `round` e `prd_version` atualizados; o `summary.verdict` se recalcula a partir dos
findings desta rodada.

> Sinal de alerta: muitos findings novos numa rodada N+1 e nenhum reemitido quase sempre significa `key`
> inconsistente entre rodadas — confira as chaves contra o `prd-review.md` antes de abrir a página.

## Depois

Fechado o gate e registrada a rodada, siga ao lookup — [lookup.md](lookup.md). O lookup lê o `prd.md` **já
editado**, e as respostas `tech` entram nos briefings dele como premissa: são o que o PRD não diz, e o
lookup é onde elas valem mais. Só `negocio` com `blocking` deixado aberto segura escopo; o resto não
espera ninguém.

> Se um achado `negocio` só se responde lendo o código, o `owner` está errado — não o humano.
> Reclassifique: ele é `tech`, e a resposta não toca o `prd.md`.
