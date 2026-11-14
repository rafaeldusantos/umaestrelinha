# Backend `local` — o registro é o disco

Vale quando o backend é `local` ([backend.md](backend.md#detecção)). O registro do QA é o que está em
`[QA_DIR]`. Não existe outro lugar para onde ele "sobe": gravar o arquivo é registrar, e o humano vê antes
de valer. Os três envelopes — `qa-plan/v1`, `qa-result/v1` e `qa-issue/v1` — continuam
([workspace.md](workspace.md#envelopes)): são a língua comum com uma automação E2E, quando houver, e quem lê
`qa/` lê o envelope sem precisar entender o texto.

---

## Onde cada arquivo mora

| Arquivo                                   | Quem escreve                                    | Quando                    | Vale como registro                                     |
| ----------------------------------------- | ----------------------------------------------- | ------------------------- | ------------------------------------------------------ |
| `test-plans/<feature>-test-plan.md`       | `pd-qa-planner`                                 | Fase 1                    | com `**Gate 1:** aprovado em <data>` no cabeçalho      |
| `test-plans/personas.md` · `journeys/` · `charters/` · `<suite>-regression.md` | `pd-qa-planner` | Fase 1     | junto com o test-plan                                  |
| `test-cases/<TC-ID>.md`                   | `pd-qa-planner` · a automação E2E acrescenta e atualiza o bloco Automação | Fase 1 | junto com o test-plan                     |
| `sessions/CH-NN-<slug>.md`                | `pd-qa-explorer`                                | Fase 2                    | é log: vale ao ser escrito                             |
| `retest.md`                               | `pd-qa-retester`                                | Fase 2                    | é log: o **veredito** do reteste; o `status` do bug só muda no Gate 3 |
| `screenshots/`                            | `pd-qa-explorer` · `pd-qa-retester`             | Fase 2                    | é a evidência, citada por caminho                      |
| `issues/BUG-NNN.md` (novo)                | `pd-qa-triager`                                 | Fase 3                    | depois do Gate 3                                       |
| `issues/BUG-NNN.md` (`status` e **Histórico** de bug existente) | **a thread principal** | Gate 3          | ao ser gravado — só com o de acordo do humano          |
| `qa-result.md`                            | `pd-qa-triager`                                 | Fase 3                    | com `**Gate 3:** confirmado em <data>` no cabeçalho    |
| `decisoes-produto.md`                     | a thread principal                              | depois do gate das perguntas ao produto | ao ser gravado                           |
| `e2e/`                                    | a automação E2E, quando houver                  | fora desta skill          | esta skill só lê                                       |

**Os cabeçalhos de gate.** O briefing do planner e o do triager levam `registro: disco`. Com ele, o
planner escreve `**Gate 1:** pendente` no cabeçalho do test-plan — sempre, inclusive no `revisar` — e o
triager escreve `**Gate 3:** pendente` no do `qa-result.md`. Só a thread principal troca para
`aprovado em <data>` / `confirmado em <data>`, com o de acordo do humano. Até lá é rascunho, e o anúncio
diz isso.

**Fora de `[QA_DIR]`**, esta skill só escreve **uma linha por gate fechado** na tabela **Gates** do
`[ITEM_DIR]/item.md` — Gate 1, gate das perguntas do plano, Gate 3, gate das perguntas ao produto. Não muda
`fase:` nem nenhum outro campo do `item.md`: ele é da `pd-workflow`. Sem `item.md` (Work Item que não
nasceu pela `pd-workflow`), o cabeçalho do test-plan e do `qa-result.md` é o registro, e você diz isso.
**Não crie o `item.md`.**

```markdown
| QA · Gate 1 — plano | 2026-10-31 | aprovado · 24 TC · qa/test-plans/sso-test-plan.md |
| QA · perguntas do plano | 2026-10-31 | 3 itens · 3 respondidos |
| QA · Gate 3 — veredito | 2026-11-02 | fail · 3 bugs novos · 1 resolved · qa/qa-result.md |
| QA · perguntas ao produto | 2026-11-02 | 2 itens · 1 respondido · inline a pedido |
```

`inline a pedido` só quando o humano pediu para responder no chat
([gates.md](gates.md#perguntas-pela-página)).

## A pasta temporária

O que não é registro mora **fora do repositório**: no Claude Code, `<scratchpad>/wi/<WI-ID>/`; fora dele,
`wi/<WI-ID>/` no diretório temporário do sistema (`$TMPDIR`, `/tmp`, `%TEMP%`). Vão para lá o
`handoff.json` e o `answers.json` da [página de perguntas](gates.md#perguntas-pela-página), e arquivo
baixado de uma URL que o humano informou como insumo. **Nunca** vai a `[ITEM_DIR]`. Apague ao fechar a
fase, ou deixe — é temporária.

## As operações no local

| Operação | O que fazer |
|---|---|
| `canal.sondar` | nada. A sonda que conta no local é a da [página de perguntas](gates.md#a-página-é-obrigatória) |
| `item.titulo` | pergunte o título (para o slug, em kebab-case) e onde está o que foi pedido, em bloco com o resto da Fase 0; crie `[ITEM_DIR]` só com `qa/` dentro |
| `qa.estado` | leia o cabeçalho do test-plan (`**Gate 1:** pendente` · `aprovado em <data>`) e o do `qa-result.md` (`**Gate 3:** pendente` · `confirmado em <data>`; com mais de uma linha `**Gate 3:**`, vale a última do arquivo) — `grep`, sem abrir o corpo |
| `contexto.ler` | leia `item.md` (`tipo`, `entrada`, `fase`, **Insumos**), localize o resto no disco ([context.md](../context/context.md)); URL a baixar vai à pasta temporária |
| `bugs.todos` | nada: os bugs do Work Item são os `issues/BUG-*.md` |
| `plano.registrar` | troque `**Gate 1:** pendente` por `aprovado em <data>` no cabeçalho do test-plan e acrescente a linha `QA · Gate 1 — plano` em `item.md` › Gates |
| `perguntas.registrar` | a linha `QA · perguntas do plano` ou `QA · perguntas ao produto` em `item.md` › Gates |
| `evidencia.enviar` | nada: o `evidence[].url` já é o caminho relativo a `qa/` |
| `resultado.registrar` | troque `**Gate 3:** pendente` por `confirmado em <data>` no cabeçalho do `qa-result.md` e acrescente a linha `QA · Gate 3 — veredito` em `item.md` › Gates |
| `bug.registrar` | nada: o `BUG-NNN.md` que o triager escreveu e o Gate 3 confirmou, ou a transição que você gravou, já é o registro |
| `temporaria.limpar` | apague a pasta temporária, ou deixe |

Sem `item.md`, as linhas de Gates não se escrevem: o cabeçalho basta.

**Arquivos antigos.** O `status` gravado só é `open`, `resolved` ou `invalid`; o veredito `cannot-reproduce`
do reteste deixa o bug `open` até o humano fechá-lo no Gate 3. Arquivo antigo com `still-open` ou
`cannot-reproduce` **gravado como `status`**: `still-open` conta como `open`; `cannot-reproduce` conta como
`resolved` — alguém já o fechou assim. Evidência gravada com a chave `path` vale como `url`. A primeira gravação daquele arquivo
reescreve o valor no formato atual ([workspace.md](workspace.md#envelopes)).

## Conferir o que foi gravado

Depois de cada gravação de gate, confira no disco o que mudou — o cabeçalho do test-plan ou do
`qa-result.md`, o `status` e a linha de Histórico de cada bug transicionado, o arquivo apagado de cada bug
descartado, a linha nova do `item.md` — e diga ao humano, por caminho, o que ficou registrado. Gravação que
não conferiu ⇒ diga qual e pare antes da seguinte.
