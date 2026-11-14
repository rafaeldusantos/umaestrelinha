# PRD Tech Review — Parecer e registro

O parecer é o mesmo nos dois backends — o envelope `prd-review/v1` seguido da leitura humana
([prd-review.md](../../references/discovery/prd-review.md#output-do-parecer)). O que muda é o destino:

- **[productdock]** o parecer **enviado** pelo pedido de Tech Review — [o formato](#productdock-o-parecer-enviado);
- **[local]** o registro `[ITEM_DIR]/prd-review.md`, uma seção por rodada — [o formato](#local-o-registro-prd-reviewmd).

---

## [productdock] O parecer enviado

**Work Item**: [WI-ID] — [título]
**PRD revisado**: versão [N]
**Data**: [YYYY-MM-DD]
**Autor do parecer**: PRD Tech Review (agente)

### Envelope `prd-review/v1`

```json
{
  "schema": "prd-review/v1",
  "work_item_ref": "[WI-ID]",
  "reviewed_at": "[YYYY-MM-DDThh:mm:ss-03:00]",
  "skill": "pd-workflow/prd-tech-review",
  "skill_version": "[metadata.version do SKILL.md]",
  "review_rules": "convergent/v1",
  "reviewed_brief_version": 3,
  "summary": {
    "verdict": "changes_requested_blocking",
    "blocking": 1,
    "gaps": 2,
    "questions": 1,
    "tech_decisions": 2,
    "scenarios": [
      {
        "title": "Usuário cria item com dados válidos",
        "type": "happy_path",
        "risk": "P1"
      },
      {
        "title": "Usuário tenta criar item duplicado",
        "type": "erro",
        "risk": "P1"
      }
    ]
  },
  "findings": [
    {
      "id": "F1",
      "key": "status-free-text-vs-enum",
      "category": "blocking",
      "owner": "pm",
      "severity": "critical",
      "title": "PRD propõe campo que conflita com coluna existente",
      "anchor": {
        "quote": "o campo status deve aceitar qualquer texto livre",
        "prefix": "Para o novo cadastro, ",
        "suffix": " informado pelo usuário.",
        "section": "Requisitos Funcionais"
      },
      "body": "A tabela `work_items` já tem a coluna `status` como enum fechado (`backlog|prd|specification|...`) usada pelo Kanban (`apps/web/src/features/kanban`). Texto livre quebra o pipeline SDLC existente.",
      "suggestion": "Reaproveitar o enum atual ou propor um novo campo (`status_detail`) em vez de sobrescrever `status`.",
      "questions": []
    },
    {
      "id": "F2",
      "key": "listing-pagination-undefined",
      "category": "gap",
      "owner": "pm",
      "severity": "medium",
      "title": "Critério de aceite não define paginação da listagem",
      "anchor": {
        "quote": "a listagem deve mostrar todos os itens",
        "prefix": "Na tela principal, ",
        "suffix": " cadastrados pelo usuário.",
        "section": "Critérios de Aceite"
      },
      "body": "Não há menção a volume esperado nem paginação/ordenação. Sem isso, a tela pode não performar com bases grandes.",
      "suggestion": "Sugestão do time técnico: páginas de 50 itens, mais recentes primeiro — é o padrão das outras listagens do produto.",
      "questions": ["Qual o volume esperado de itens por usuário/projeto?"]
    },
    {
      "id": "F3",
      "key": "export-report-instant",
      "category": "gap",
      "owner": "tech_prd_edit",
      "severity": "medium",
      "title": "Exportação não pode ser instantânea com o volume esperado",
      "anchor": {
        "quote": "o relatório é baixado imediatamente ao clicar em Exportar",
        "prefix": "Critério 4: ",
        "suffix": ", em formato planilha.",
        "section": "Critérios de Aceite"
      },
      "body": "Com o volume do critério 2, gerar o relatório na mesma requisição estoura o tempo limite da API. O time técnico decidiu gerar o relatório em segundo plano; o que muda para o usuário é o momento em que ele recebe o arquivo.",
      "suggestion": "Decidido pelo time técnico: o relatório passa a ser gerado em segundo plano. Substituir o trecho citado por: \"ao clicar em Exportar, o usuário é avisado de que o relatório está sendo preparado e recebe uma notificação com o link para baixá-lo quando ficar pronto\".",
      "questions": []
    }
  ],
  "attention_points": [
    {
      "text": "O PRD não diz se a listagem mostra itens arquivados; a análise seguiu com o comportamento atual, que não os mostra",
      "reason": "suposição que não muda nada para o usuário"
    }
  ]
}
```

O `findings[]` enviado carrega **só** `owner: "pm"` e `owner: "tech_prd_edit"`. Os `owner: "tech"` fecham no gate do PRD Tech Review, antes deste envio, e não viram thread: `tech_decisions` só os conta. No envelope interativo, só a premissa leva `kind` (`"premissa"`, como no exemplo do modo autônomo abaixo); `alternatives` e `kind: "inviavel"` não saem. `review_rules`, `skill_version` e `attention_points` vão em todo parecer, nos dois modos.

#### No modo autônomo — os findings tipados

No [modo autônomo](../../references/discovery/prd-review-autonomo.md) o `findings[]` carrega só `owner: "pm"`, e dois destinos levam o tipo do achado em `kind`: a premissa e o `tech_prd_edit` reescrito para o PM, com as alternativas estruturadas. O `pm` comum sai sem `kind`, como no interativo; `tech_decisions` é `0`.

```json
[
  {
    "id": "F1",
    "key": "export-includes-cancelled",
    "category": "question",
    "owner": "pm",
    "kind": "premissa",
    "severity": "medium",
    "title": "Premissa: o relatório exportado traz também os pedidos cancelados",
    "anchor": {
      "quote": "o usuário exporta o relatório de pedidos",
      "prefix": "Na tela de pedidos, ",
      "suffix": " em formato planilha.",
      "section": "Requisitos Funcionais"
    },
    "body": "O PRD não diz se o relatório traz os pedidos cancelados, e a tela de pedidos hoje os esconde. A análise assumiu que o relatório os traz, marcados como cancelados — o usuário passa a receber na planilha linhas que não vê na tela. Confirme ou corrija.",
    "questions": []
  },
  {
    "id": "F2",
    "key": "export-report-instant",
    "category": "gap",
    "owner": "pm",
    "kind": "inviavel",
    "severity": "medium",
    "title": "Exportação não pode ser instantânea com o volume esperado",
    "anchor": {
      "quote": "o relatório é baixado imediatamente ao clicar em Exportar",
      "prefix": "Critério 4: ",
      "suffix": ", em formato planilha.",
      "section": "Critérios de Aceite"
    },
    "body": "O critério 4 pede o relatório baixado na hora. Com o volume do critério 2, isso não cabe numa única espera do usuário (geração síncrona em `apps/api/src/export/export.controller.ts:42`). Alternativas: (A) o usuário é avisado de que o relatório está sendo preparado e recebe o link quando ficar pronto — espera, mas não perde a tela. Para adotar: trocar o critério 4 por \"o usuário é avisado de que o relatório está sendo preparado e recebe o link quando ficar pronto\"; (B) a exportação fica limitada a um período menor — resposta imediata, menos dados por vez. Para adotar: dizer no critério 4 o período máximo por exportação; (C) o relatório é gerado à noite e fica disponível no dia seguinte — sem espera, sem os dados do dia. Para adotar: trocar o critério 4 por \"o relatório fica disponível no dia seguinte, com os dados até o dia anterior\".",
    "questions": [],
    "alternatives": [
      {
        "label": "A",
        "title": "Avisar e enviar o link quando o relatório ficar pronto",
        "impact": "O usuário espera, mas não perde a tela. Para adotar: trocar o critério 4 por \"o usuário é avisado de que o relatório está sendo preparado e recebe o link quando ficar pronto\""
      },
      {
        "label": "B",
        "title": "Limitar a exportação a um período menor",
        "impact": "Resposta imediata, com menos dados por vez. Para adotar: dizer no critério 4 o período máximo por exportação"
      },
      {
        "label": "C",
        "title": "Gerar o relatório à noite",
        "impact": "Sem espera, mas sem os dados do dia. Para adotar: trocar o critério 4 por \"o relatório fica disponível no dia seguinte, com os dados até o dia anterior\""
      }
    ]
  }
]
```

Sem texto substituto único no `inviavel` — quem escolhe é o PM; cada alternativa termina com o que escrever no PRD para adotá-la, no `body` e no `impact`. O prefixo `"Premissa: "` e o fecho `"Confirme ou corrija."` continuam mesmo com o `kind`: são o fallback de quem não o lê.

### Leitura humana (opcional)

[2 a 4 frases resumindo o veredicto e o que precisa de atenção antes do lookup — ex.: "Diagnóstico: PRD tem 1 bloqueio (conflito de schema em `status`), 1 lacuna (paginação não definida) e 1 ajuste de texto decidido pelo time técnico (exportação em segundo plano). Corrigir o bloqueio antes de disparar o lookup."]

### Pontos de atenção

[A contagem do que ficou fora dos achados pelas regras da rodada, por regra, e cada ponto com o motivo — a mesma lista de `attention_points`. Ex.: "3 pontos ficaram fora dos achados: 2 pelo corte da terceira rodada e 1 suposição que não muda nada para o usuário." Nenhum ponto fora ⇒ `nenhum`. Quando valer, também aqui: a linha de que a rodada foi feita **sem as diferenças** entre a versão revisada antes e a atual (e por quê), a de que foi **a primeira rodada com as regras convergentes** (sem o corte da terceira rodada), e as **Premissas não confirmadas** — as ignoradas pelo PM, com a suposição seguida e o motivo dele.]

### Decisões técnicas (informativo)

[Os `owner: "tech"` que o gate do PRD Tech Review fechou, uma linha cada — sem pergunta, sem pedido ao PM. Opcional — o registro completo é a seção **Decisões** do `spec.md`. No [modo autônomo](../../references/discovery/prd-review-autonomo.md) ninguém decide nada: esta seção não existe, e no lugar dela vem **Questões técnicas para a Spec** — quantas são e, por questão, a `key`, a pergunta, as opções e a evidência `caminho:linha`. Ex.: "A geração em segundo plano reaproveita a fila de jobs existente (`apps/worker/src/jobs/index.ts`)."]

---

> Consultivo — o texto do PRD **não** foi alterado; os pedidos de edição (`tech_prd_edit`) aguardam o PM ratificar. O parecer entra pelo pedido de Tech Review da versão publicada, e o envio fecha o pedido. O status do PRD, que estava Publicada durante o Tech Review, sai dos achados no servidor — nenhum Bloqueio nem Lacuna aberto → Aprovada, com Observações e Sugestões abertas ou não; algum Bloqueio → Com bloqueios; Lacunas sem Bloqueio → Com lacunas —; o `summary.verdict` é informativo. Parecer de versão anterior à atual (`reviewed_brief_version`) fica marcado como desatualizado e não move nada.

---

## [local] O registro `prd-review.md`

**Work Item**: [WI-ID] — [título]
**PRD**: `[ITEM_DIR]/prd.md` · origem: [caminho, URL ou "colado na conversa"]

Registro local do PRD Tech Review deste Work Item: uma seção por rodada, a mais recente no fim. Rodada
registrada não se reescreve — a seguinte lê as `key` daqui (`references/discovery/prd-review.md`, seção
Rodada N+1).

---

### Rodada r[N]

**Data**: [YYYY-MM-DD] · **PRD revisado**: versão [prd_version] · **Gate**: [página | inline a pedido | sem itens]

#### Envelope `prd-review/v1`

```json
{
  "schema": "prd-review/v1",
  "work_item_ref": "[WI-ID]",
  "round": 1,
  "prd_version": 1,
  "reviewed_at": "[YYYY-MM-DDThh:mm:ss-03:00]",
  "skill": "pd-workflow/prd-tech-review",
  "skill_version": "[metadata.version do SKILL.md]",
  "summary": {
    "verdict": "changes_requested_blocking",
    "blocking": 1,
    "gaps": 2,
    "questions": 1,
    "tech_decisions": 1,
    "scenarios": [
      {
        "title": "Usuário cria item com dados válidos",
        "type": "happy_path",
        "risk": "P1"
      },
      {
        "title": "Usuário tenta criar item duplicado",
        "type": "erro",
        "risk": "P1"
      }
    ]
  },
  "findings": [
    {
      "id": "F1",
      "key": "status-free-text-vs-enum",
      "category": "blocking",
      "owner": "pm",
      "severity": "critical",
      "title": "PRD propõe status livre onde o produto hoje tem etapas fixas",
      "anchor": {
        "quote": "o campo status deve aceitar qualquer texto livre",
        "prefix": "Para o novo cadastro, ",
        "suffix": " informado pelo usuário.",
        "section": "Requisitos Funcionais"
      },
      "body": "A tabela `orders` já tem `status` como enum fechado (`draft|placed|shipped|delivered`), usado pelos filtros da listagem (`apps/web/src/features/orders/filters.ts:18`). Texto livre quebra os filtros e os relatórios existentes. A decisão é de produto: o que o usuário precisa registrar que as etapas atuais não cobrem.",
      "suggestion": "O pedido segue as etapas atuais (rascunho, realizado, enviado, entregue); o usuário pode acrescentar uma observação livre, que não altera a etapa.",
      "questions": ["O que o usuário precisa registrar que as etapas atuais não cobrem?"]
    },
    {
      "id": "F2",
      "key": "listing-pagination-undefined",
      "category": "gap",
      "owner": "pm",
      "severity": "medium",
      "title": "Critério de aceite não define paginação da listagem",
      "anchor": {
        "quote": "a listagem deve mostrar todos os itens",
        "prefix": "Na tela principal, ",
        "suffix": " cadastrados pelo usuário.",
        "section": "Critérios de Aceite"
      },
      "body": "Não há menção a volume esperado nem paginação/ordenação. As outras listagens do produto paginam em 50, mais recentes primeiro (`apps/web/src/components/Paginated.tsx:12`).",
      "suggestion": "a listagem mostra os itens cadastrados pelo usuário em páginas de 50, os mais recentes primeiro",
      "questions": ["Qual o volume esperado de itens por usuário?"]
    },
    {
      "id": "F3",
      "key": "export-report-instant",
      "category": "gap",
      "owner": "tech_prd_edit",
      "severity": "medium",
      "title": "Exportação não pode ser instantânea com o volume esperado",
      "anchor": {
        "quote": "o relatório é baixado imediatamente ao clicar em Exportar",
        "prefix": "Critério 4: ",
        "suffix": ", em formato planilha.",
        "section": "Critérios de Aceite"
      },
      "body": "Com o volume do critério 2, gerar o relatório na mesma requisição estoura o tempo limite da API (`apps/api/src/export/export.controller.ts:42`). A saída técnica é gerar em segundo plano; o que muda para o usuário é o momento em que recebe o arquivo.",
      "suggestion": "Gerar o relatório em segundo plano. Substituir o trecho citado por: \"ao clicar em Exportar, o usuário é avisado de que o relatório está sendo preparado e recebe uma notificação com o link para baixá-lo quando ficar pronto\".",
      "questions": []
    },
    {
      "id": "F4",
      "key": "export-job-queue",
      "category": "gap",
      "owner": "tech",
      "severity": "low",
      "title": "Onde roda a geração em segundo plano",
      "anchor": {
        "quote": "o relatório é baixado imediatamente ao clicar em Exportar",
        "prefix": "Critério 4: ",
        "suffix": ", em formato planilha.",
        "section": "Critérios de Aceite"
      },
      "body": "Já existe fila de jobs em `apps/worker/src/jobs/index.ts:7`, com retry configurado.",
      "suggestion": "Reaproveitar a fila de jobs existente.",
      "questions": []
    }
  ]
}
```

Todos os findings ficam no envelope, com os três `owner`. `blocking`, `gaps` e `questions` contam só
`pm` e `tech_prd_edit`; `tech_decisions` conta os `tech`; o `verdict` deriva daqueles dois.

#### Respostas do gate

| `key`                          | `owner` final   | `escolha`                         | `texto`                               | Estado     |
| ------------------------------ | --------------- | --------------------------------- | ------------------------------------- | ---------- |
| `status-free-text-vs-enum`     | `pm`            | [a sugestão clicada, ou `null`]   | [o texto livre, verbatim]             | aplicado   |
| `listing-pagination-undefined` | `pm`            | [...]                             | [...]                                 | aplicado   |
| `export-report-instant`        | `tech_prd_edit` | [...]                             | [...]                                 | aplicado   |
| `export-job-queue`             | `tech`          | [...]                             | [...]                                 | aplicado   |

Estado: `aplicado` · `aberto` (o humano respondeu "não sei / decido depois"). `owner` final diferente do
do envelope diz por quê, numa linha abaixo da tabela.

#### O que foi aplicado, e onde

- **`status-free-text-vs-enum`** — `prd.md` › Requisitos Funcionais
  - antes: "o campo status deve aceitar qualquer texto livre"
  - depois: "[o texto aprovado, como ficou no `prd.md`]"
- **`listing-pagination-undefined`** — `prd.md` › Critérios de Aceite
  - antes: "a listagem deve mostrar todos os itens"
  - depois: "[...]"
- **`export-report-instant`** — **Decisões** da costura: "[a decisão técnica]" · `prd.md` › Critérios de Aceite
  - antes: "o relatório é baixado imediatamente ao clicar em Exportar"
  - depois: "[o texto de substituição aprovado]"
- **`export-job-queue`** — **Decisões** da costura: "[a resposta, verbatim]" · `prd.md` não tocado

O "depois" é literal: é ele que a rodada seguinte procura no `prd.md` para saber se o trecho mudou.
`Histórico de revisões` do `prd.md`: `r[N] · [YYYY-MM-DD] · [keys alteradas]` — ou "sem alteração no
`prd.md`". O PRD de origem ([caminho ou URL]) **não** foi editado.

#### Pontos de atenção

[A contagem do que ficou fora dos achados, por motivo, e cada ponto com o motivo. Ex.: "1 ponto ficou
fora dos achados: a listagem não mostra itens arquivados, como hoje — suposição que não muda nada para o
usuário." Nenhum ponto fora ⇒ `nenhum`.]

#### Leitura humana

[2 a 4 frases: o veredicto, o que mudou no `prd.md`, o que foi a **Decisões** e o que segue aberto —
ex.: "O PRD tinha 1 bloqueio (status livre contra as etapas fixas), 2 lacunas e 1 decisão técnica.
Bloqueio e lacunas foram respondidos e reescritos no `prd.md`; a geração em segundo plano vai a
Decisões. Nada segue aberto: o lookup pode correr."]
