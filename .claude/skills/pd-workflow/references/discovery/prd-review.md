# PRD Tech Review — Revisão técnica do PRD (upstream)

**Goal**: Antes do lookup, validar o **PRD** contra o codebase, levar ao humano num gate só o que o parecer
achou e exige decisão técnica, e levar a quem decide o produto o que é dele — para corrigir o PRD antes do
esforço técnico. **Consultivo — sem auto-fix**: nada do parecer muda o PRD nem a costura sem uma resposta.

> **Consultivo não quer dizer "tudo vai a quem decide o produto".** Achado é roteado pela **natureza da
> decisão** — o eixo [`owner`](#o-eixo-owner--de-que-natureza-é-a-decisão). **Técnico se responde nesta
> sessão; só o que é de produto vai a quem decide o produto** — **[productdock]** o PM, pela plataforma;
> **[local]** o humano da conversa, no mesmo gate. A ordem é fixa: o parecer é **retriado**, o gate do
> PRD Tech Review abre **uma vez**, as respostas são aplicadas, e só então o parecer segue ao destino —
> **[productdock]** enviado ao PM **uma vez**, levando o que é dele já com a sugestão do time técnico;
> **[local]** registrado em disco, com o `prd.md` já editado. Mandar decisão técnica ao PM não é cautela: é
> um deadlock, porque ele não tem como responder.

> Absorve a antiga skill `fullstack-prd-tech-review`. A execução (exploração `thorough`) é **delegada a um
> subagente genérico**; a thread principal consome o parecer consolidado, retria e abre o gate.

As operações citadas aqui (`prd.obter`, `insumos.ler`, `tech-review.pegar`, `.ler`, `.enviar`,
`.devolver`, `gate.registrar`, `decisao.registrar`, `fase.entrar`) são do backend do projeto
([backend](../setup/backend.md)). **[productdock]** O pedido de Tech Review, o read-back, as regras
convergentes por rodada, o envio e o que acontece sem pedido aberto estão em
[pd-sync — Tech Review com o PM](../pd-sync/workflow.md#tech-review-com-o-pm).

---

## Quando rodar

Ao entrar na **entrada com PRD**, depois de obter o PRD (`prd.obter`) e **antes de disparar qualquer
lookup**: lookup sobre PRD que vai mudar é trabalho jogado fora.

- **[local] Entrada por descoberta** — depois que o gate da descoberta fechou e o cabeçalho do `prd.md` diz
  `ratificado no gate` ([descoberta.md](descoberta.md)). Roda **inteiro**, igual à entrada com PRD: é a
  validação adversarial do PRD que a descoberta escreveu, não uma formalidade. O `discovery.md` entra no
  briefing do subagente como evidência ([Passo 2](#passo-2--exploração-profunda-do-codebase-thorough)), e
  só.
- **Sem PRD** — a entrada sem PRD não roda PRD Tech Review (vai para [plan.md](../seam/plan.md)).
  **[productdock]** Cobre os Work Items com `uses_plan: true`: bug, incident, technical_debt **e
  improvement em Fluxo Rápido** ([pd-sync](../pd-sync/workflow.md#fluxo-rápido)).
- **PRD que não vem** — a entrada é com PRD, mas não há PRD para revisar:
  - **[productdock]** Work Item sem PRD na plataforma: informe e oriente a criá-lo, ou a publicá-lo, na
    plataforma. **Não prossiga** para a Spec, e não aceite texto colado no lugar — o critério tem de
    existir versionado na plataforma.
  - **[local]** O arquivo não abre, a URL não carrega, o texto não veio: peça ao humano que cole o
    conteúdo, salve-o em `prd.md` com a origem anotada, e só então siga. **Não prossiga** para a Spec sem
    PRD em disco.
- **[productdock] Modo autônomo** — a sessão que o runner de Tech Review da plataforma abre, sem ninguém nela → o mesmo
  procedimento, com os desvios de [prd-review-autonomo.md](prd-review-autonomo.md): não pergunta e não tem
  gate — o que é de produto vai ao PM, o técnico fica pendente para a Spec —, e o envio é único. Numa
  conversa com o humano, é sempre o interativo, este arquivo.

**[local]** Ao começar, `fase.entrar(prd-review)`.

**[productdock] O parecer só entra na plataforma por um pedido de Tech Review aberto.** Por isso o
interativo pega o pedido do Work Item **antes de analisar** (`tech-review.pegar`, no Passo 1) e envia
amarrado a ele; abandonando a revisão, devolve o pedido à fila (`tech-review.devolver`). Sem pedido para
pegar — o PRD já aprovado ao iniciar a Spec, em rascunho, ou o pedido em execução por outro — a revisão
roda igual, mas **não envia nada**. O ciclo do PRD, o pedido e o caminho sem pedido aberto:
[pd-sync](../pd-sync/workflow.md#tech-review-com-o-pm).

## Passo 1 — Identificar o Work Item, pegar o pedido, carregar o PRD e o estado da revisão

- **O Work Item** — título, descrição/problema de negócio e tipo (`item.buscar`, complementando
  `prd.obter`), e os insumos (`insumos.ler` — **[productdock]** só o contexto de especificação: domínio e
  PRDs irmãos). Os insumos se leem aqui como em [lookup.md](lookup.md#os-anexos-do-work-item): o que eles
  dizem completa o PRD no briefing.
- **[productdock] O pedido** — `tech-review.pegar`, **antes de qualquer análise**.
- **O PRD**, inteiro — RF, RNF, critérios de aceite, escopo (dentro/fora), Expectativas de UI/UX — e a
  **versão revisada**:
  - **[productdock]** a versão do PRD na plataforma, que vai no envelope;
  - **[local]** `prd_version`: `1` mais o número de linhas da seção `## Histórico de revisões` ao fim do
    `prd.md` (sem a seção, `1`).
- **O domínio** — o vocabulário contra o qual o parecer casa os nomes do PRD: **[productdock]** o contexto
  de especificação do Work Item e os PRDs irmãos (`insumos.ler`); **[local]** a Visão, a Topologia e as
  referências às instruções do sistema do `PROJECT.md`. Ausente uma dimensão, declare.
- **O estado da revisão** — `tech-review.ler`, **obrigatório, antes de cada rodada, sem exceção**: é o que
  diz se esta é a **rodada 1** ou uma **rodada N+1**, e o que já foi respondido. Sem essa leitura, a
  rodada reemite achados que já foram fechados.
  - **[productdock]** O read-back da plataforma: o número da rodada, o estado de cada achado, o parecer
    anterior e, da segunda rodada em diante, os insumos da rodada incremental — a versão revisada antes e
    as diferenças entre as duas versões ([pd-sync](../pd-sync/workflow.md#tech-review-com-o-pm)).
  - **[local]** `[ITEM_DIR]/prd-review.md`. Não existe → é a **rodada 1**. Existe → é a **rodada N+1**,
    com `N` o número da última rodada registrada nele.

  Rodada N+1: aplique a [Rodada N+1](#rodada-n1--o-estado-de-cada-achado) antes de escrever o parecer.
- **[local] Na entrada por descoberta**, também `[ITEM_DIR]/discovery.md` — o Diagnóstico, com os
  `caminho:linha` que a descoberta levantou.

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
o que falta**. A análise é local ([code-analysis.md](code-analysis.md)); **[productdock]** o índice remoto
de código complementa quando está disponível. Afirmação sobre lib, API ou versão se confere pela Knowledge
Verification Chain do [SKILL.md](../../SKILL.md) — Context7 e web incluídos —, nunca de memória.

Perguntas-guia da exploração:

- Existe implementação que o PRD descreve como "a ser construída"?
- Existe modelo de dados (tabela/tipo/interface) que **conflita** com o que o PRD propõe?
- O fluxo descrito conecta-se a fluxos existentes? Como?
- Há protótipos, mocks ou telas desconectadas relacionadas ao tema?

**O briefing do subagente** leva: o PRD inteiro, o que os insumos dizem, os caminhos dos repositórios e
das instruções do sistema, esta lista de camadas e perguntas, e o formato do
[parecer](#output-do-parecer) — com o `owner` em um dos três valores, um por finding, e o que é só
informação fora dos findings. **[local] Na entrada por descoberta**, leva também o `discovery.md` como
**evidência de partida**: o subagente confere cada `caminho:linha` dele no disco e explora além dele.
Diagnóstico da descoberta não é parecer pronto, e a exploração não se encurta por ele — o que a
descoberta afirmou e o código não confirma é finding.

## Passo 3 — Confrontar PRD × sistema (intenção)

- O que já existe, o que é novo, o que conflita com a **intenção** das instruções do sistema
  (AGENT.md/AGENTS.md/CLAUDE.md/`.github/instructions/`).
- **Declarar ausências explicitamente** — sem domínio, sem PRDs relacionados, sem contexto ou sem
  evidência para uma dimensão, dizer que falta. **Nunca presumir.**
- **[local]** Critério marcado `[conhecimento]` no PRD da descoberta é premissa do modelo, não fato do
  repositório: o parecer o confronta com o código como qualquer outro.

## O eixo `owner` — de que natureza é a decisão

`category` diz a **natureza do problema**; `owner` diz a **natureza da decisão** que o resolve — e, com
ela, para onde vai a resposta. São eixos ortogonais, e é o segundo que decide o roteamento. Sem ele, um
bloqueio técnico e um bloqueio de produto recebem o mesmo tratamento, e o fluxo para num ponto em que o
fórum capaz de resolver ainda não foi aberto. O teste é um só:

> _A resposta depende do que o **produto quer**, ou do que o **código permite**?_

| `owner`         | O que é                                                                                    | Destino da resposta — **[productdock]**                                                                       | Destino da resposta — **[local]**                                                                   | Conta no veredicto? |
| --------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------- |
| `pm`            | comportamento de produto, escopo, prioridade, regra de negócio — **só quem decide o produto responde** | o PM, numa thread no PRD — com a sugestão do time técnico, quando o gate a der                                | o humano da conversa, no gate: a resposta reescreve o trecho do `prd.md`                            | sim                 |
| `tech`          | escolha de implementação, dependência, arquitetura, ferramenta — **o humano na cadeira responde** | seção **Decisões** da costura ([spec.md](../seam/spec.md)); **nunca** vira thread                             | seção **Decisões** da costura; **nunca** toca o `prd.md`                                            | **não**             |
| `tech_prd_edit` | decisão técnica que **muda comportamento observável ou critério de aceite** escrito no PRD | **Decisões**, e uma thread no PRD como pedido de edição, com a decisão já tomada e o texto de substituição    | **Decisões**, e o trecho do `prd.md` trocado pelo texto de substituição                             | sim, como `gap`     |

O que é **só informação** — não há decisão a tomar — não é finding: vai ao corpo do parecer, como
[ponto de atenção](#pontos-de-atenção--o-que-fica-fora-dos-achados) quando ficou fora dos achados.

**`tech_prd_edit` é o caso híbrido**, e existe porque a decisão técnica às vezes torna falso um trecho do
PRD. A decisão continua sendo técnica e vai a **Decisões**; o que ela gera no PRD é **a consequência
observável**, com o texto pronto — nunca a escolha técnica que a provocou, e nunca uma pergunta aberta.
**[productdock]** O PM só ratifica.

### A regra de conteúdo — o que pode ir ao PRD

**Detalhe de implementação nunca vai ao PRD**: tecnologia, tabela, endpoint, lib, algoritmo interno,
formato de armazenamento. Ele é resposta técnica, e mora na seção **Decisões** da costura. A pergunta é:
_a decisão muda o que o usuário vê, faz ou recebe — ou um critério de aceite?_ Não muda ⇒ `tech`, e o PRD
não é tocado. Muda ⇒ `tech_prd_edit`, e a edição obedece a três coisas:

1. **Cita o trecho atual**, em `anchor.quote`, recorte literal do PRD
2. **Traz o texto de substituição pronto**, para colar no lugar do trecho
3. **Está em linguagem de negócio** — comportamento e critério, nunca a escolha técnica que o provocou

O mesmo vale para o texto que um `pm` leva ao PRD: é de produto.

O PRD que **congelou** uma escolha técnica num critério de aceite é o caso de borda: a substituição tira a
tecnologia do critério e deixa o comportamento. Exemplo: o critério prescreve `MD5` para guardar senhas —
a engenharia escolhe o substituto, que vai para **Decisões**; o texto de substituição diz _"a senha é
armazenada de forma irreversível, sem que ninguém da operação consiga lê-la"_, e não o nome do algoritmo
novo.

### Regras

1. **`owner` é obrigatório em todo finding.** Omitido, o finding vai ao gate como **item de
   classificação** — o humano diz a natureza e responde —, e você registra que faltou; nunca o trate como
   `pm` por default, e nunca adivinhe pelo `severity`.
2. **Um achado tem um `owner` só.** Achado que se divide entre produto e técnica **são dois achados**, com
   `key` distinta cada um. Não escreva um item misto: ele trava nos dois fóruns ao mesmo tempo, e a
   resposta dele não teria destino único.
3. **Achado com resposta correta única não é pergunta.** Havendo uma só saída defensável, **afirme-a** no
   `suggestion` e leve ao gate para ratificar — não a emita como pergunta aberta. Pergunta aberta é para
   onde há escolha real.
4. **`owner` é estável entre rodadas**, como a `key`. Mudou de uma rodada para outra, diga por quê no corpo
   do parecer: o destino da resposta mudou — e, **[productdock]**, para o PM não ler o sumiço da thread
   como item sanado.
5. **Nada se aplica sem resposta.** O agente não edita o PRD nem escreve em **Decisões** por conta do
   parecer: quem transforma achado em mudança é a resposta do gate. O `suggestion` é proposta, não
   decisão.
6. **[productdock] O roteamento é seu, não do backend.** Quem separa os fóruns é esta skill, **antes** de
   enviar: o que vai à plataforma carrega só os achados que o PM tem a fazer — um `tech` enviado é thread
   no PRD, e é exatamente o vazamento que esta regra fecha ([pd-sync](../pd-sync/workflow.md#tech-review-com-o-pm)).

### Efeito no veredicto e no bloqueio

O `summary.verdict` se deriva **apenas dos findings `pm` e `tech_prd_edit`** — os que pedem mudança no
PRD. Os `tech` não entram na contagem: um PRD cujos únicos achados são técnicos sai `approved`, porque não
há nada nele a mudar. O veredicto é **informativo**, e não decide o que segue.

O que segura o lookup é **só `pm` com `category: "blocking"`** — e o momento muda com o backend:

- **[productdock]** O `pm` `blocking` enviado ao PM segura o lookup até o PM resolver. Os técnicos fecham
  no gate **antes** do envio e do lookup, e suas respostas entram como insumo dele.
- **[local]** Só o `pm` `blocking` que o humano **deixou sem resposta aplicável** — respondeu "não sei",
  "decido depois". A página não deixa item obrigatório em branco, então isso só acontece por escolha dele.
  O escopo que esse bloqueio alcança fica travado: o UC vai a `Fica fora` no fatiamento, com o bloqueio
  como motivo; alcançando o PRD inteiro, a fase para — diga o que trava, que decisão isso exige, e
  encerre o turno.

Os `tech` e os `tech_prd_edit` nunca seguram o lookup. Ver o passo 4 do Workflow em [SKILL.md](../../SKILL.md).

## Retriagem — antes de qualquer envio

O subagente classifica; a thread principal **retria** cada finding antes de montar o gate e antes que
qualquer coisa saia desta conversa. O subagente erra para o lado do produto, e é esse erro que lota o PRD
de perguntas que quem decide o produto não sabe responder — ou que edita o PRD com detalhe de
implementação e enterra em **Decisões** uma mudança que o usuário vai ver.

| Resposta ao teste                                 | `owner` depois da retriagem                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| depende só do que o produto quer                  | `pm`                                                                           |
| depende do que o código e a stack permitem        | `tech`; `tech_prd_edit` se a decisão muda comportamento observável ou critério |
| não sei dizer                                     | **item de classificação** no gate — o humano decide; nunca `pm` por default    |

Entre `tech` e `tech_prd_edit` decide a [regra de conteúdo](#a-regra-de-conteúdo--o-que-pode-ir-ao-prd).
Finding **sem `owner`** cai na última linha. Achado que mistura as duas naturezas se divide em dois, um
`pm` e um `tech` (Regra 2).

O parecer bruto do subagente e o rascunho da retriagem ficam na **pasta temporária**
([backend](../setup/backend.md#raízes)), nunca em `[ITEM_DIR]`.

Diga no CLI o resultado da retriagem, **inclusive quando nada mudou**: quantos findings por `owner`, e
quantos você moveu, de onde para onde. Uma rodada com 12 lacunas e 9 técnicas leva **3** a quem decide o
produto.

## Premissas — só quando mudam algo para o usuário

A premissa é a suposição sobre o negócio que a análise fez para conseguir seguir com o confronto. Ela é um
finding `pm`: o `title` começa com `"Premissa: "` e o `body` diz a suposição, o que ela muda e termina com
`"Confirme ou corrija."`. Suposição sobre o código não é premissa: é evidência, e vai ao `body` de outro
achado.

**Só sai premissa quando a suposição muda o que o usuário vê, faz ou recebe** em relação ao comportamento
atual do produto. O teste é o da [regra de conteúdo](#a-regra-de-conteúdo--o-que-pode-ir-ao-prd), aplicado
à suposição:

| A suposição                                                                                                               | Destino                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| muda o que o usuário vê, faz ou recebe em relação ao comportamento atual                                                   | **premissa** — finding `pm`                                                                         |
| mantém o comportamento atual                                                                                              | **corpo do parecer**, como informação — [ponto de atenção](#pontos-de-atenção--o-que-fica-fora-dos-achados), não achado |
| feature nova, sem comportamento atual a comparar, e define quem usa, o que vê, o que faz ou o que recebe, sem o PRD dizer | **premissa**                                                                                        |
| feature nova, e é volume, caso de borda sem efeito visível ao usuário ou outra que não define nada disso                  | **corpo do parecer**, como informação — ponto de atenção                                            |

A premissa sai com `category: "question"`. A exceção é a **premissa grave**, a que, se estiver errada,
invalida a feature ou muda quem pode usá-la: ela sai com `category: "blocking"`.

- **[productdock]** A premissa leva também o tipo do achado no envelope, chega ao PM na classe que a
  plataforma dá, e o que acontece com a premissa decidida ou ignorada nas rodadas seguintes está em
  [pd-sync](../pd-sync/workflow.md#tech-review-com-o-pm).
- **[local]** A premissa vai ao gate como qualquer `pm`: confirmada, o trecho do `prd.md` passa a dizer a
  regra; corrigida, entra o texto do humano. Decidida, ela vira regra do `prd.md` e não volta.

## Alternativas — conferidas antes de propor

Toda alternativa que o parecer propõe — as opções de uma pergunta, as `sugestoes` que o gate leva, as
alternativas do achado inviável do [modo autônomo](prd-review-autonomo.md) — passa por três cuidados antes
de sair:

1. **Confira cada uma** contra o restante do PRD e contra o comportamento atual do sistema, como você
   confere um critério: ela contradiz outro trecho, quebra um fluxo que existe, depende de algo que não
   existe?
2. **A que geraria outro achado** é descartada — ou vem acompanhada do que mais precisa ser definido para
   adotá-la, dito na própria alternativa. Não ofereça a saída que a rodada seguinte vai apontar como
   problema.
3. **Cada alternativa diz o que precisa ser escrito no PRD para adotá-la por inteiro** — o critério, a
   regra ou o trecho, em linguagem de negócio. No `body`, depois do impacto: _"Para adotar: <o que
   escrever no PRD>"_.

Sobrou uma alternativa só depois da conferência: não é escolha — afirme a saída, como manda a Regra 3 do
eixo `owner`.

## Pontos de atenção — o que fica fora dos achados

Nenhum ponto que o Tech Review encontrou é descartado em silêncio. O que fica fora dos achados — a
suposição que não muda nada para o usuário, a pergunta mais detalhada sobre assunto já decidido, a
informação sem decisão a tomar — vai ao **corpo do parecer**, na seção **Pontos de atenção**, cada um com
o motivo que o deixou fora.

| O ponto                                                                                                             | Motivo (sugerido)                                       |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| pergunta mais detalhada sobre assunto já respondido, que não muda o que o usuário vê, faz ou recebe                 | `"assunto já decidido — ponto de atenção para a Spec"`  |
| suposição que mantém o comportamento atual, ou que, numa feature nova, não define quem usa, o que vê, faz ou recebe | `"suposição que não muda nada para o usuário"`          |

A seção abre com a contagem — _"N pontos ficaram fora dos achados"_, por motivo — e lista cada um com o
motivo. Nenhum ponto fora ⇒ a seção diz `nenhum`.

O ponto de atenção é informação no parecer: ele não vira thread nem item do gate, não conta no veredicto
e não é pendência levada a outra fase.

**[productdock]** Os pontos vão também no envelope, e as regras de cada rodada — o que entra como achado
novo, os limites por rodada e os motivos deles — acrescentam pontos a esta seção:
[pd-sync](../pd-sync/workflow.md#tech-review-com-o-pm).

## Output do parecer

O parecer é o envelope **`prd-review/v1`** (JSON) — um bloco de código `json` no topo —, seguido de um
corpo em markdown com a leitura humana do diagnóstico e os pontos de atenção. Os campos comuns aos dois
backends:

```json
{
  "schema": "prd-review/v1",
  "work_item_ref": "<WI-ID>",
  "reviewed_at": "<ISO 8601 com offset>",
  "skill": "pd-workflow/prd-tech-review",
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
      "owner": "pm | tech | tech_prd_edit",
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

Cada backend acrescenta os seus campos:

- **[productdock]** a versão do PRD revisada, a marca das regras da rodada, os pontos de atenção, o tipo do
  achado (premissa, inviável) e as alternativas estruturadas — o que cada um diz e quando vai:
  [pd-sync](../pd-sync/workflow.md#tech-review-com-o-pm).
- **[local]** `round` — o número da rodada: `1`, ou o da última registrada no `prd-review.md` mais um — e
  `prd_version` — a versão do `prd.md` que a rodada **efetivamente revisou**, lida do Histórico de revisões
  no Passo 1; é por ela que a rodada seguinte sabe se o PRD mudou depois do parecer
  ([local.md](../setup/local.md)).

**`findings[].key` (obrigatório)** — chave **estável entre rodadas** do mesmo achado: um slug curto,
semântico e em `kebab-case` derivado do problema, **não** do texto citado (ex.:
`credits-monthly-source-of-truth`, `rbac-permission-undefined`). É por ela que a rodada seguinte sabe o
que já foi respondido — **[productdock]** e que a plataforma reaproveita a thread existente, preservando o
estado que o PM deu ao achado e o histórico; **[local]** e é ela o `id` do item na página. Regras:

- **Reemitir um achado ⇒ repetir exatamente a mesma `key`** da rodada anterior (vem em `tech-review.ler`).
  Chave diferente é achado novo: a resposta já dada se perde, e a pergunta volta como se fosse nova.
- **Nunca reciclar** uma `key` para um achado diferente, e nunca usar `F1`/`F2` (isso é o `id`, local ao
  envelope).
- Sempre mande a `key`.

**`skill_version`** — o `metadata.version` do `SKILL.md` desta skill, em todo parecer. É por ele que se
sabe qual comportamento do Tech Review produziu cada rodada.

**`findings[].owner`** — o subagente devolve um dos três valores, e a retriagem confirma. **[productdock]**
O envelope **enviado** carrega só `pm` e `tech_prd_edit`; os `tech` ficam no corpo markdown, como
informativo. **[local]** Todos ficam no envelope: o registro é local, e a rodada seguinte precisa das
`key` técnicas tanto quanto das de produto para não perguntar de novo.

**`findings[].suggestion`** — a proposta do parecer, que o gate oferece como sugestão. No `pm` e no
`tech_prd_edit`, é **o texto de substituição** do trecho, pronto e em linguagem de negócio; no
`tech_prd_edit`, precedido da decisão técnica que o provoca. No `tech`, a saída técnica proposta.
**[productdock]** É também por ele que a resposta do gate chega ao PM, já com a sugestão ou a decisão do
time técnico ([pd-sync](../pd-sync/workflow.md#tech-review-com-o-pm)).

**Categorias de `findings[].category`** (taxonomia única — AD-01): `blocking` (bloqueio — impede a
implementação), `gap` (lacuna — gera retrabalho se ignorada), `improvement` (melhoria — não bloqueia),
`overlap` (sobreposição com outro PRD/módulo), `naming` (nomenclatura em desacordo com o glossário/domínio),
`question` (pergunta objetiva sobre o produto — usar o array `questions[]` do próprio finding, não uma
seção à parte).

**`summary.blocking` / `gaps` / `questions`** contam os findings `pm` e `tech_prd_edit` — o que pede
mudança no PRD. **`summary.tech_decisions`** é **informativo**: conta os `tech` que o gate fechou nesta
rodada, cuja resposta vai a **Decisões** — o número existe para quem lê saber que houve decisão técnica, e
onde ela está.

**`summary.verdict`** é derivado dos findings, nunca arbitrado à mão, e **ignora os `tech`**:
`blocking > 0` → `changes_requested_blocking`; senão `gaps > 0` → `changes_requested_gaps`; senão
`approved`. Um parecer com 8 decisões técnicas e nenhum achado de produto sai `approved`.

**`summary.scenarios[]`** — Cenários Preliminares em **linguagem de negócio** (sem Gherkin/BDD/arquivos
`.feature`), cobrindo os tipos aplicáveis: happy_path, alternativo, erro, borda, seguranca, performance.

**`anchor.quote`** — recorte literal e curto do PRD, nunca paráfrase. `prefix`/`suffix` com ~30
caracteres de contexto de cada lado desambiguam trechos repetidos; `section` leva o heading da seção do
PRD onde o trecho aparece.

- **[productdock]** O texto **visível** do PRD (sem `**`, `#` ou outro markup), para permitir a âncora
  inline no editor.
- **[local]** O texto do `prd.md` **exatamente como está no arquivo**: é ele que a edição procura e troca.
  Lacuna sem trecho a trocar — o PRD não diz nada sobre aquilo — ancora no trecho mais próximo do assunto,
  e o texto de substituição o reescreve já com o que faltava.

Template completo: [templates/report/prd-tech-review-report.md](../../templates/report/prd-tech-review-report.md).

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

A ordem é fixa: **retriar → gate do PRD Tech Review → aplicar as respostas → enviar o parecer →
registrar o gate.** Nada sai desta conversa, e nada toca o `prd.md` nem a costura, antes de o gate fechar.

1. **Retriar** — a [Retriagem](#retriagem--antes-de-qualquer-envio), finding a finding, dita no CLI.

2. **Abrir o gate do PRD Tech Review** — **um só**, no formato de
   [handoff.md](handoff.md#o-gate-do-prd-tech-review--um-item-por-finding), havendo qualquer finding. Um
   item por finding, do que trava para o que não trava, cada um com **2 a 3 `sugestoes`**:

   | Finding                   | No gate                                                                                                   |
   | ------------------------- | --------------------------------------------------------------------------------------------------------- |
   | `tech`                    | o humano decide — item obrigatório                                                                        |
   | `tech_prd_edit`           | o humano decide; a decisão vira a edição do PRD — item obrigatório                                        |
   | sem `owner`, ou na dúvida | o humano classifica, e decide quando for técnico — item obrigatório                                       |
   | `pm`                      | **[productdock]** o humano pode registrar uma resposta sugerida ao PM — item **opcional**, com `Default:` _enviar ao PM sem sugestão_ · **[local]** o humano decide — item obrigatório |

   **[productdock]** O gate abre também havendo pendência para a Spec deixada pelo
   [modo autônomo](prd-review-autonomo.md) ou achado que o PM ignorou sem motivo
   ([pd-sync](../pd-sync/workflow.md#tech-review-com-o-pm)); um gate só de `pm` fecha sem resposta
   nenhuma, e o parecer segue como foi escrito. A página, e o que fazer sem ela, segue a
   [política do backend](handoff.md#servidor--e-a-política-da-página).

   Sem finding nenhum, não há gate: vá ao passo 4.

3. **Aplicar as respostas**, verbatim, pela [regra das respostas](handoff.md#as-respostas):
   - **`tech`** — a resposta vai à seção **Decisões** da costura quando ela for escrita; guarde-a no
     contexto até lá. Valendo além deste WI, `decisao.registrar` agora. **Nunca toca o PRD.** Resposta
     que, aplicada, muda comportamento observável ou critério do PRD transforma o finding em
     `tech_prd_edit` — diga isso no CLI; não é pergunta nova. **[local]** Leve o texto de substituição a
     uma segunda página do mesmo gate, só com esses itens: a edição do `prd.md` precisa de texto aprovado.
   - **`tech_prd_edit`** — a decisão vai a **Decisões**, e a edição segue o backend: **[productdock]** o
     pedido de edição vai ao `suggestion`, com o texto de substituição pronto, e vira uma linha de **PRD
     pendente de ajuste** no `spec.md` — a `key`, o trecho atual, o texto proposto; guarde-as no contexto
     até a costura. **[local]** O trecho do `prd.md` é trocado pelo texto de substituição aprovado.
     Resposta de que a decisão não muda nada que o PRD diga — é detalhe de implementação — rebaixa o
     finding a `tech`: só **Decisões**, e o PRD fica como está.
   - **Classificado pelo humano** — segue a linha do `owner` que ele deu.
   - **`pm`** — **[productdock]** com resposta, ela vai ao `suggestion` como a sugestão do time técnico;
     sem resposta, vale o `Default`. A resposta não decide nada: quem responde é o PM. **[local]** Troque
     **só** o trecho citado (`anchor.quote`) no `prd.md` pelo texto aprovado: a sugestão escolhida, com a
     ressalva do humano aplicada a ela, ou o texto livre dele. Resposta que não é um trecho pronto — uma
     decisão, um número — entra no trecho com a menor edição que a contenha, nas palavras do humano.
     Resposta "não sei / decido depois" não edita nada: o achado fica **aberto** no registro e, sendo
     `blocking`, vale o [bloqueio](#efeito-no-veredicto-e-no-bloqueio).

   **[local]** Editado o `prd.md`, acrescente ao fim dele — criando a seção se não existir — uma linha em
   `## Histórico de revisões`: `r<n> · <data> · <keys alteradas>`. Rodada que não alterou o `prd.md` não
   ganha linha: o Histórico conta versões do texto, e é dele que sai o `prd_version` da rodada seguinte.
   **O PRD que veio de fora** — o arquivo do humano fora de `[ITEM_DIR]`, a URL — **não é editado**: só a
   cópia `prd.md`. Diga isso no CLI, com o caminho da origem, para o humano decidir se leva as mudanças
   para lá. Diga no CLI, por `key`, o trecho antes e depois de cada edição, o que foi a **Decisões**, e o
   que segue aberto.

4. **Enviar o parecer** — `tech-review.enviar`, **uma vez**:
   - **[productdock]** Pelo pedido pego no Passo 1, com só os `pm` e `tech_prd_edit` no envelope, e os
     pontos de atenção no corpo. Sem nenhum `pm` nem `tech_prd_edit`, envie assim mesmo: o envelope vazio
     registra a rodada e fecha o pedido. Nenhuma rodada é reemitida para "fechar os técnicos": eles nunca
     foram enviados. O envio, o arquivo da rodada, as recusas, o status do PRD que sai dele, o pedido
     abandonado e o caminho sem pedido aberto: [pd-sync](../pd-sync/workflow.md#tech-review-com-o-pm).
   - **[local]** Grave a rodada em `[ITEM_DIR]/prd-review.md` ([O registro local](#local-o-registro)).
     Rodada sem item no gate registra igual, com `sem itens`.

5. **Registrar o gate** — `gate.registrar(prd-review)` ([handoff.md](handoff.md#registro)) — **[productdock]**
   com `phase: "prd-tech-review"` ([pd-sync](../pd-sync/workflow.md#gateregistrargate)); **[local]** a
   linha `prd-review r<n>` com o `verdict`, quantos aplicados ao `prd.md`, quantos em **Decisões** e
   quantos abertos. Enviar o parecer e registrar o gate são duas operações: uma não faz a outra.

**[productdock]** O texto do PRD nunca é alterado pelo envio, e esta skill não tem caminho para editá-lo:
o `tech_prd_edit` é o pedido de edição possível, que o PM ratifica editando o PRD e publicando a versão
nova. Até lá, quem segura a contradição visível é o `spec.md`, na seção **PRD pendente de ajuste**.

**[local]** O `handoff.json` e o `answers.json` ficam na pasta temporária; apague-os ao fechar a fase, ou
deixe — são temporários. **Interrompida a revisão antes de o gate fechar**, nada foi aplicado nem
registrado: a próxima sessão recomeça do Passo 1, e reaproveita o rascunho da pasta temporária só se ele
ainda existir e o `prd.md` não tiver mudado.

## [local] O registro

`[ITEM_DIR]/prd-review.md` é o registro do PRD Tech Review deste Work Item, e o único: não há histórico
em outro lugar. **Uma seção por rodada**, `## Rodada r<n>`, a mais recente no fim; rodada registrada não
se reescreve. Cada seção traz:

1. **O envelope `prd-review/v1`** da rodada, inteiro — todos os findings, com os três `owner`.
2. **As respostas do gate, por `key`** — a `escolha`, o `texto`, o `owner` final (depois da classificação
   ou do rebaixamento) e o **estado**: `aplicado` ou `aberto`.
3. **O que foi aplicado, e onde** — por `key`: o trecho antes e o trecho depois no `prd.md`, ou a linha
   que vai a **Decisões**. É o trecho depois que a rodada seguinte procura no `prd.md` para saber se ele
   mudou.
4. **Os pontos de atenção** da rodada, com a contagem.
5. **A leitura humana** — o veredicto e o que pede atenção, em 2 a 4 frases.

O formato está no [template](../../templates/report/prd-tech-review-report.md). Versionar o registro segue
a Regra 1: só a pedido ([local.md](../setup/local.md#versionar--só-a-pedido)).

## Rodada N+1 — o estado de cada achado

O parecer é um **documento vivo**: o Tech Review volta ao PRD quando ele muda — **[productdock]** a cada
versão publicada; **[local]** quando o humano pede nova revisão: o PRD de origem mudou e a cópia foi
refeita, o `prd.md` foi editado à mão, o escopo andou.

Antes de recalcular os findings, percorra **cada `key`** que `tech-review.ler` devolveu e decida
explicitamente se ela volta:

- **[productdock]** Pelo estado de cada achado na plataforma — o que o PM fez com ele, editando o PRD ou
  dando estado ao achado —, com a tabela, as regras de decisão registrada, de texto que contradiz a
  decisão e de `tech_prd_edit`, e o que entra como achado novo em cada rodada:
  [pd-sync](../pd-sync/workflow.md#tech-review-com-o-pm).
- **[local]** Pelo estado da rodada mais recente em que ela aparece no `prd-review.md`:

  | Estado no registro                                                                                                | Decisão                                                                                                                                                                |
  | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `aplicado`, e o `prd.md` **não mudou** no trecho (o trecho depois está lá, literal; no `tech`, o `anchor.quote`) | **Não volta.** Está respondido — nem reescrito, nem com outra `key`.                                                                                                  |
  | `aplicado`, e o `prd.md` **mudou** no trecho depois da resposta                                                   | **Reemitir com a mesma `key`**, se o problema persiste no texto novo, dizendo no `body` o que mudou e qual foi a resposta anterior. Sanado no texto novo → não volta. |
  | `aberto` ("não sei / decido depois"), e o problema **persiste**                                                   | **Reemitir com a mesma `key`**, com a pergunta de antes; se nada mudou, diga isso — não reescreva o achado.                                                           |
  | `aberto`, e o texto **sanou** o problema                                                                          | **Não reemitir.** Registre na rodada como sanado.                                                                                                                      |

  O achado reemitido vai à página **com a resposta anterior no `corpo`**: o humano vê o que já disse e o
  que mudou desde então.

A pergunta **mais detalhada** sobre um assunto já respondido não reabre o achado: ela entra como achado
novo só se mudar o que o usuário vê, faz ou recebe; do contrário, é
[ponto de atenção](#pontos-de-atenção--o-que-fica-fora-dos-achados).

Os achados **novos** passam pela retriagem como na rodada 1. Então siga a mesma [Entrega](#entrega); o
`summary.verdict` se recalcula a partir dos findings desta rodada.

> Sinal de alerta: muitos findings novos numa rodada N+1 e nenhum reemitido quase sempre significa `key`
> inconsistente entre rodadas — confira as chaves antes de abrir o gate.

## Depois

Fechado o gate, enviado o parecer e registrado o gate, siga ao lookup — [lookup.md](lookup.md). As
respostas `tech` entram nos briefings dele como premissa: são o que o PRD não diz, e o lookup é onde elas
valem mais.

- **[productdock]** O que aguarda o PM é **só** o que é dele. Só `pm` com `blocking` segura o lookup; o
  resto espera o PM **sem** segurar ninguém. Os `tech_prd_edit` não seguram a costura: ela segue a
  decisão do gate, e a contradição com o PRD fica visível em **PRD pendente de ajuste** do `spec.md` até o
  PM ajustar o PRD — quem confere é a rodada seguinte e a Validation.
- **[local]** O lookup lê o `prd.md` **já editado**. Só `pm` com `blocking` deixado aberto segura escopo;
  o resto não espera ninguém.

Um WI cujos bloqueios eram todos técnicos não espera ninguém.

> Se o parecer travar o fluxo sobre um achado que o humano na cadeira responderia em segundos — ou se um
> `pm` só se responde lendo o código —, o `owner` está errado, não o humano. Reclassifique.
