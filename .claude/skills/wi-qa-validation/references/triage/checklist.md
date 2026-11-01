# Checklist de cobertura da triagem

O triager confere cada item antes de devolver. Item que não fecha **não** se resolve inventando: vai ao
`qa-result.md` como lacuna — em **Fora da cobertura** ou **Riscos residuais** — com o motivo exato. Lacuna
dita é resultado; lacuna escondida é um `pass` falso.

---

## Personas

- [ ] Toda persona do `personas.md` tem ao menos uma sessão `done` — ou a lacuna dita, com o motivo
      (credencial, massa, ambiente)
- [ ] A persona fora do caminho feliz (primeira vez, mobile, acessibilidade, permissão restrita) rodou
- [ ] Todo bug nomeia a persona mais atingida

## Jornadas

- [ ] Toda jornada do plano foi percorrida por alguma sessão até o objetivo — ou até onde quebrou
- [ ] A jornada de abandono ou erro rodou
- [ ] Todo bug diz a jornada e o passo onde acontece

## Charters

- [ ] Todo charter tem `sessions/CH-NN-*.md` — ou está no relatório como `not-run`, com o motivo
- [ ] Charter `blocked` diz o que faltou e o que ficou sem cobrir
- [ ] O **Fora da cobertura** de cada sessão chegou ao **Fora da cobertura** do `qa-result.md`

## CFR

- [ ] O charter de CFR rodou, ou o motivo está dito
- [ ] Os achados de CFR foram triados como os demais — `type: cfr`, nível pelo impacto, não pela categoria

## Design-check

- [ ] Com protótipo no Work Item: o `design-check` rodou, ou está `not-run` por `design` (sem o MCP da
      fonte)
- [ ] Todo bug visual traz a tabela **Design × implementado** e o viewport

## Casos `TC-*`

- [ ] Todo TC **P0 e P1** do plano tem veredito no `test_cases` — ou está em **Fora da cobertura**
- [ ] TC P0/P1 `blocked` levou o veredito a `partial`; TC P0 `fail`, a `fail`
- [ ] Todo TC `fail` tem `bug_ref` — novo, reaberto ou `duplicado de` um `open`
- [ ] TC que rodou em mais de uma sessão tem um veredito só, o pior: `fail` > `blocked` > `skip` > `pass`

## Critérios

- [ ] Todo critério da fonte está em `coverage.items` com seu `status`
- [ ] Critério sem nenhum TC executado é `missing` e está em `coverage.missing`
- [ ] `acceptance_total` é o número de critérios da tabela de cobertura do plano

## Bugs

- [ ] Nenhum `spec-gap` virou bug — está em **Perguntas ao produto** ou em **Sugestões de backlog**
- [ ] Toda pergunta ao produto é `mudança` — no escopo da costura e decisiva para a jornada —, e são no
      máximo 3; na rodada de confirmação, nenhuma
- [ ] Defeito pré-existente ou fora da superfície da mudança só virou bug sendo `critical` ou `high`
- [ ] Achados com a mesma causa observável viraram um bug só, com as ocorrências
- [ ] Nenhum achado duplica um bug `open` ou `still-open` de `issues/`; `resolved` ou `cannot-reproduce` que
      voltou está proposto como reabertura; nada descartado num Gate 3 anterior voltou como bug
- [ ] `intermitente` virou bug só com duas ocorrências ou evidência clara
- [ ] Todo bug tem passos a partir de um estado limpo e esperado com a fonte

## Reteste

- [ ] Todo bug aberto que o reteste recebeu tem resultado no `retest.md` — ou está dito por que não retestou
- [ ] Todo `resolved`, `still-open` e `cannot-reproduce` do reteste está na tabela de transições, com o `id`
      e o `title` do arquivo, letra por letra; `blocked` está no relatório sem transição
- [ ] Nenhum arquivo de bug existente foi tocado — transição é proposta, quem grava é a thread no Gate 3
- [ ] Achado novo no entorno foi triado como achado, não colado no bug retestado

## Evidência

- [ ] Toda screenshot citada — no `qa-result.md` ou num `BUG-*` — existe em `screenshots/`
- [ ] Todo bug novo ou reaberto cita ao menos uma screenshot
- [ ] Todo `evidence[].path` é `screenshots/<arquivo>` de um arquivo que existe, com o `label` igual ao nome
      do arquivo
- [ ] Toda screenshot citada por um `BUG-*` está no `evidence[]`

## Envelope × corpo

- [ ] O JSON de cada envelope é válido e está no topo do arquivo, em ` ```json `
- [ ] Enums minúsculos, exceto `priority`; `priority` coerente com `severity` ([severity.md](severity.md#ajustes))
- [ ] `issues.total` = soma de `by_severity` = bugs novos + reaberturas propostas desta rodada
- [ ] Cada `severity` do corpo do `qa-result.md` é a do envelope do bug
- [ ] Todo `tc_ref` e todo `test_cases[].tc_ref` existem em `cases[].id` do `qa-plan`
- [ ] Todo `bug_ref` aponta para um `BUG-N` que existe em `issues/`
- [ ] Bugs novos numerados a partir do maior `BUG-N` de `issues/`, sem repetir número
- [ ] `verdict` segue a regra: `fail` com `critical`/`high` aberto ou TC P0 `fail`; `partial` com TC P0/P1
      `blocked` ou charter que não rodou; `pass` nos demais
- [ ] `gates` `build`, `lint` e `test` copiados do `qa-report.md`; `e2e` do `qa-e2e-report.md` — ou `skip`
      com o `summary` dizendo qual fonte faltou
