```json
{
  "schema": "qa-result/v1",
  "verdict": "pass | fail | partial",
  "executed_at": "<fim da Fase 2, ISO 8601 UTC>",
  "branch": "<branch testada>",
  "duration_min": 0,
  "gates": [
    {
      "name": "build",
      "command": "<do qa-report.md>",
      "status": "pass | fail | skip",
      "summary": "<do qa-report.md>"
    },
    {
      "name": "lint",
      "command": "<do qa-report.md>",
      "status": "pass | fail | skip",
      "summary": "<do qa-report.md>"
    },
    {
      "name": "test",
      "command": "<do qa-report.md>",
      "status": "pass | fail | skip",
      "summary": "<passed/total>"
    },
    {
      "name": "e2e",
      "command": "<do qa-e2e-report.md>",
      "status": "pass | fail | skip",
      "summary": "<passed/total>"
    }
  ],
  "coverage": {
    "acceptance_total": 0,
    "acceptance_covered": 0,
    "items": [
      {
        "criterion": "<ID na fonte: P1-AC01 · C-01>",
        "validated_by": {
          "tc_ref": "TC-…",
          "type": "e2e | integration | manual"
        },
        "status": "covered | partial | missing"
      }
    ],
    "missing": []
  },
  "test_cases": [
    {
      "tc_ref": "TC-…",
      "verdict": "pass | fail | blocked | skip",
      "bug_ref": "BUG-NNN"
    }
  ],
  "evidence": [
    { "label": "<arquivo>.png", "url": "screenshots/<arquivo>.png" }
  ],
  "issues": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
  }
}
```

<!--
  Envelope — um valor por campo; as listas acima são os enums de qa-result/v1.
  - gates: build, lint e test copiados do qa-report.md (`**Build**`, `**Lint**`, o `Summary` dos testes);
    o que ele não traz: "skip", summary "não consta no qa-report.md", command "—". e2e do
    qa/e2e/qa-e2e-report.md; sem ele: "skip", summary "sem rodada E2E", command "—".
  - coverage.items: um por critério da tabela de cobertura do plano. covered = todo TC do critério teve
    veredito pass ou fail · partial = parte deles blocked ou skip · missing = nenhum TC executado.
    validated_by: o TC de maior prioridade do critério; type = o automation.target dele.
  - test_cases: todo TC que uma sessão conferiu, com o pior veredito entre sessões. bug_ref só no fail;
    remova o campo nos demais.
  - evidence: toda screenshot citada por um BUG-* e as que provam TC P0. url = o caminho relativo a qa/, de
    um arquivo que existe em screenshots/; label = o nome do arquivo. Não escreva caminho absoluto nem URL:
    quem troca o valor, se for o caso, é a thread principal no Gate 3. Arquivo antigo com "path" no lugar de
    "url" se lê do mesmo jeito.
  - issues: os bugs desta rodada com status open — novos + reabertos propostos.
  - verdict: fail com bug critical/high confirmado aberto (novo, reaberto ou still-open; cannot-reproduce não conta) ou TC P0 fail · partial com TC P0/P1 blocked ou charter que
    não rodou · pass nos demais.
  Apague este comentário.
-->

# Resultado de QA — <WI> · <título do Work Item>

<!-- [local] Só no backend `local` (briefing com `registro: disco`): mantenha a linha **Gate 3:**
abaixo, `pendente` ao escrever — a thread principal troca para `confirmado em <AAAA-MM-DD>` com o de acordo
do humano. No backend `productdock` (`registro: plataforma`), apague a linha: o estado do Gate 3 é da
plataforma. Apague este comentário. -->
**Gate 3:** pendente

## Resumo

**Veredito:** pass | fail | partial — <a razão em uma linha>

<Dois ou três parágrafos: o que a rodada cobriu, o que uma pessoa de verdade consegue e não consegue fazer
hoje, e o que decide o veredito.>

| TC                                   | Critérios       | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------ | --------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass X · fail X · blocked X · skip X | X de Y cobertos | X          | X         | resolved X · still-open X · cannot-reproduce X · blocked X |

## Rodada

- **Ambiente:** <URL>
- **Branch / build:** <o que foi testado>
- **Execução:** <início> → <fim> (X min)
- **Browser:** <nome e versão> · **Viewports:** <os que as sessões usaram>
- **Personas e acesso:** <PER-NN → conta; sem valores de credencial>

## Gate técnico

- **Validation do Dev:** `[ITEM_DIR]/qa-report.md` — PASS, de <data>
- **Rodada E2E:** `qa/e2e/qa-e2e-report.md` — <veredito, ambiente, data> | sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build |        |        |
| lint  |        |        |
| test  |        |        |
| e2e   |        |        |

## Cobertura — critério → TC

| Critério | Fonte      | TC         | Veredito                      | Status                      |
| -------- | ---------- | ---------- | ----------------------------- | --------------------------- |
|          | prd · plan | TC-…, TC-… | pass · fail (BUG-…) · blocked | covered · partial · missing |

**Sem cobertura:** <critério — por quê, um por linha, ou `nada`>

## Sessões

| Charter | Persona | Tour | Status                                         | Ações   | TC              | Achados | Bugs  |
| ------- | ------- | ---- | ---------------------------------------------- | ------- | --------------- | ------- | ----- |
| CH-NN   |         |      | done · blocked (<motivo>) · not-run (<motivo>) | X de Y  | pass X · fail X | X       | BUG-… |

## CFR

| Categoria             | Jornadas | Resultado            | Bugs |
| --------------------- | -------- | -------------------- | ---- |
| Acessibilidade        |          | ok · fricção · falha |      |
| Responsividade        |          |                      |      |
| Performance percebida |          |                      |      |
| Segurança visível     |          |                      |      |

<Ou: `não rodou` — o motivo.>

## Design-check

- **Fonte de design:** <fonte e telas conferidas, ou `sem fonte de design no Work Item`>
- **Status:** done · not-run (<motivo: sem acesso à fonte>)
- **Divergências:** X — <BUG-… por componente, ou `nenhuma`>

## Bugs novos

Por nível: Bloqueia a conclusão X · Perda de dados X · Dano à confiança X · Fricção X · Cosmético X
Por severidade: critical X · high X · medium X · low X

| Bug | Nível | Severidade | Prioridade | Título | Persona · jornada, passo | TC  |
| --- | ----- | ---------- | ---------- | ------ | ------------------------ | --- |

**Reabertos:** <BUG-N — título — onde voltou, um por linha, ou `nada`>

## Lotes de correção sugeridos

<!-- Os bugs que ficam open ao fim da rodada (novos, reabertos, still-open), agrupados por tela e
componente para o Dev corrigir numa tarefa só. Sugestão para o pd-workflow, que confere no código — não
vai ao envelope. Regras em references/triage/triage.md#lotes-de-correção. Bug sozinho é lote de um. -->

| Lote | Bugs         | Tela · componente     | Por que juntos                                                                    | Maior severidade               |
| ---- | ------------ | --------------------- | --------------------------------------------------------------------------------- | ------------------------------ |
| L1   | BUG-…, BUG-… | <tela> · <componente> | <mesmo componente · mesma tela, mesma origem aparente · componente compartilhado> | critical · high · medium · low |

<Ou: `nada` — sem bug aberto ao fim da rodada.>

## Transições propostas

<!-- Reteste e reaberturas. Proposta: quem grava o `status` e a linha do Histórico no arquivo do bug é a
thread principal, no Gate 3. still-open e cannot-reproduce são vereditos: o bug segue open (cannot-reproduce
só fecha se o humano decidir no Gate 3). `blocked` não transiciona. -->

| Bug | Título (do arquivo, letra por letra) | Origem                       | Veredito                                              | Status proposto                                   | Severidade             | Evidência                        |
| --- | ------------------------------------ | ---------------------------- | ----------------------------------------------------- | ------------------------------------------------- | ---------------------- | -------------------------------- |
|     |                                      | reteste · reabertura (CH-NN) | resolved · still-open · cannot-reproduce · reabertura | open → resolved · fica open · resolved → open     | mantida · <reavaliada> | `screenshots/retest-BUG-NNN.png` |

**Reteste `blocked`:** <BUG-N — o motivo, um por linha, ou `nada`>

<Ou: `sem bugs abertos no Work Item e nenhuma reabertura`.>

## Achados que não viraram bug

<O achado, a sessão, e `duplicado de BUG-N` · `spec-gap` · `intermitente sem segunda ocorrência` ·
`conforme a fonte` · `invalid em BUG-N` · `descartado no Gate 3 de <data> — <motivo>` — um por linha, ou
`nada`. A thread principal acrescenta aqui o que o humano descartar neste Gate 3.>

## Perguntas ao produto

<!-- Só `spec-gap` de classe `mudança`: no escopo da costura e decisivo para a jornada. No máximo 3; na
rodada de confirmação, `nada`. Regras em references/triage/triage.md#perguntas-ao-produto-e-sugestões-de-backlog. -->

| #   | Comportamento observado | Pergunta | Critério · charter | Por que decide a jornada |
| --- | ----------------------- | -------- | ------------------ | ------------------------ |

<Ou: `nada`.>

## Sugestões de backlog

<!-- spec-gap `pré-existente`, `polimento` ou `excedente`, e defeito pré-existente abaixo de high. Não é bug,
nem pergunta, nem fix task deste Work Item: o humano decide se abre um Work Item novo. -->

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |

<Ou: `nada`.>

## Evidências não enviadas

<!-- [productdock] Só no backend `productdock`: a thread principal a preenche no Gate 3 com o arquivo que a
plataforma recusou e o motivo (`unsupported_file_type` · `file_too_large` · `empty_file`). O triager escreve
`nada`; no backend `local`, a thread remove a seção. -->

<`nada`.>

## Riscos residuais

<O que a rodada não prova e pesa: intermitentes, vários Dano à confiança na mesma jornada, fricção repetida
na mesma área, bug still-open de severidade alta — um por linha, ou `nada`.>

## Fora da cobertura

<O que não rodou e por quê: charters not-run ou blocked, TC P0/P1 sem veredito, personas sem sessão,
viewports e browsers não exercitados — um por linha, ou `nada`.>
