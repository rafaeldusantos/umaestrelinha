# PRD Tech Review — Registro

**Work Item**: [WI-ID] — [título]
**PRD**: `[ITEM_DIR]/prd.md` · origem: [caminho, URL ou "colado na conversa"]

Registro local do PRD Tech Review deste Work Item: uma seção por rodada, a mais recente no fim. Rodada
registrada não se reescreve — a seguinte lê as `key` daqui (wi-workflow, `references/discovery/prd-review.md`,
seção Rodada N+1).

---

## Rodada r[N]

**Data**: [YYYY-MM-DD] · **PRD revisado**: versão [prd_version] · **Gate**: [página | inline a pedido | sem itens]

### Envelope `prd-review/v1`

```json
{
  "schema": "prd-review/v1",
  "work_item_ref": "[WI-ID]",
  "round": 1,
  "prd_version": 1,
  "reviewed_at": "[YYYY-MM-DDThh:mm:ss-03:00]",
  "skill": "wi-workflow/prd-tech-review",
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
      "owner": "negocio",
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
      "owner": "negocio",
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

Todos os findings ficam no envelope, com os quatro `owner`. `blocking`, `gaps` e `questions` contam só
`negocio` e `tech_prd_edit`; `tech_decisions` conta os `tech`; o `verdict` deriva daqueles dois.

### Respostas da página

| `key`                          | `owner` final   | `escolha`                         | `texto`                               | Estado     |
| ------------------------------ | --------------- | --------------------------------- | ------------------------------------- | ---------- |
| `status-free-text-vs-enum`     | `negocio`       | [a sugestão clicada, ou `null`]   | [o texto livre, verbatim]             | aplicado   |
| `listing-pagination-undefined` | `negocio`       | [...]                             | [...]                                 | aplicado   |
| `export-report-instant`        | `tech_prd_edit` | [...]                             | [...]                                 | aplicado   |
| `export-job-queue`             | `tech`          | [...]                             | [...]                                 | aplicado   |

Estado: `aplicado` · `aberto` (o humano respondeu "não sei / decido depois") · `sem item` (`none`, não foi
à página). `owner` final diferente do do envelope diz por quê, numa linha abaixo da tabela.

### O que foi aplicado, e onde

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

### Leitura humana

[2 a 4 frases: o veredicto, o que mudou no `prd.md`, o que foi a **Decisões** e o que segue aberto —
ex.: "O PRD tinha 1 bloqueio (status livre contra as etapas fixas), 2 lacunas e 1 decisão técnica.
Bloqueio e lacunas foram respondidos e reescritos no `prd.md`; a geração em segundo plano vai a
Decisões. Nada segue aberto: o lookup pode correr."]
