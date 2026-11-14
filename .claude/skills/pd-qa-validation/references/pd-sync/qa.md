# pd-sync — as operações do QA no ProductDock

Lido **só** quando o backend é `productdock`. Cada operação que o núcleo cita
([backend.md](../setup/backend.md#operações)) tem aqui o comando exato e o que se lê da resposta. O canal,
a invocação da sessão, o escopo e a pasta de envio estão em [sync.md](sync.md); a reação a exit `1` e `2` é
sempre a de [códigos de saída](sync.md#códigos-de-saída), e cada operação só diz o que tem de particular.

Submeter é **publicar**: o time vê na aba Qualidade do Work Item. Por isso nada sobe sem o gate do humano.

---

## As operações

### `canal.sondar`

[Sonda de canal](sync.md#sonda-de-canal) e, com a CLI usável, [sonda de versões](sync.md#sonda-de-versões).
A primeira bloqueia; a segunda só avisa.

### `item.titulo`

`[ITEM_DIR]` não existe (o Work Item não passou pela `pd-workflow` nesta máquina) ⇒ crie
`.productdock/work-items/[WI-ID]-[name]/`, com `[name]` em kebab-case a partir do título que `wi list`
devolve para a chave, e `qa/` dentro. Não pergunte o título.

### `qa.estado`

```bash
productdock state phase <ref> --json
```

Uma vez por sessão, no preflight; a mesma resposta serve à Fase 0. Leve ao contexto `uses_plan`,
`artifacts_found`, `open_qa_bugs`, `work_item_type` (o `tipo` do campo `wi` dos briefings) e `status` (Work
Item já além do desenvolvimento vai ao anúncio da Fase 0 — [context.md](../context/context.md#3-o-que-a-fase-0-entrega)).

| Sinal | De onde vem |
| --- | --- |
| Gate 1 fechado | `artifacts_found` lista o artefato `qa-plan` |
| Gate 1 pendente | há test-plan em `[QA_DIR]/test-plans/` e `artifacts_found` **não** lista `qa-plan` |
| rodada fechada | existe `[QA_DIR]/qa-result.md` |

Aqui também se confere o escopo, antes de qualquer outra leitura
([sync.md](sync.md#escopo-de-projetorepositório)): a costura está em `[ITEM_DIR]` e `artifacts_found` não a
traz ⇒ pare.

### `contexto.ler`

Na pasta de envio, na ordem, depois de `qa.estado`:

| Chamada                                     | Para quê                                                           | Leve ao contexto              |
| ------------------------------------------- | ------------------------------------------------------------------ | ----------------------------- |
| `wi prd <ref> --json --out <envio>/prd.json` | o que foi pedido — **só** se `[ITEM_DIR]/prd.md` não existe; o `prd.md` prevalece | tem PRD: sim/não |
| `wi prototypes <ref> --json --out <envio>/prototypes.json` | a fonte de design do Work Item                     | `count` e as `tool`           |
| `wi attachments <ref> --download <envio>/attachments --json --out <envio>/attachments.json` | mockups, fluxos, planilhas de regra que o PRD cita | `count` |
| `wi bugs <ref> --status open --json --out <envio>/qa-bugs-open.json` | os bugs abertos do Work Item                 | `count`                       |

`count: 0` e `data: null` são sucesso: Work Item sem protótipo, sem anexo, sem bug aberto. No modo
`retestar`, só `qa.estado` e `wi bugs`.

O que entra na lista `fontes` ([context.md](../context/context.md#3-o-que-a-fase-0-entrega)):

- `prd`: `[ITEM_DIR]/prd.md`, ou `<envio>/prd.json` quando ele não existe
- `design`: uma linha por protótipo de `prototypes.json` — `tool · url · protótipo do Work Item` —, somada às
  fontes que o `prd.md` e o `PROJECT.md` trazem. O mesmo link nas duas origens entra uma vez
- `insumos`: `<envio>/attachments/`, quando houve anexo, e o que o humano citou na mensagem

Depois, **materialize os bugs** de `qa-bugs-open.json` ([abaixo](#materializar-bugs-em-issues)): a partir
daí, os bugs abertos do Work Item são os arquivos de `issues/`, como no núcleo.

`bugs_abertos` (a lista do reteste e o teste do modo `retestar`) é o conjunto de `issues/<id>.md` dos `id` de
`qa-bugs-open.json` — não o grep do disco. Arquivo em `issues/` com `status: open` cujo `id` não está em
`qa-bugs-open.json` não vai ao reteste: diga isso no anúncio da Fase 0. O status dele se alinha em
`bugs.todos`, na Fase 3.

### `bugs.todos`

```bash
productdock wi bugs <ref> --status all --json --out <envio>/qa-bugs-all.json
```

Na Fase 3, antes de despachar o triager — para numerar e deduplicar contra o que outra rodada, o eng. de QA
ou o time na UI registrou. **Materialize** todos os que não têm arquivo, de qualquer status. O triager não
recebe este JSON: lê `issues/`.

### `plano.registrar`

```bash
productdock artifact submit <QA_DIR>/test-plans/<feature>-test-plan.md --ref <ref> --phase qa --type qa-plan --json
```

Ver [Gate 1](#gate-1). Caso que a automação E2E criou no plano depois do envio implica reenviar o `qa-plan`
— o plano continua um só.

### `perguntas.registrar`

Nada. As respostas do plano entram no redespacho do planner; as do produto, em `decisoes-produto.md`.

### `evidencia.enviar`

Ver [Evidência](#evidência).

### `resultado.registrar`

```bash
productdock artifact submit <QA_DIR>/qa-result.md --ref <ref> --phase qa --type qa-result --json
```

Um por rodada, depois de `evidencia.enviar`.

### `bug.registrar`

```bash
productdock artifact submit <QA_DIR>/issues/BUG-NNN.md --ref <ref> --phase qa --type qa-issue --json
```

Um por arquivo: os bugs novos, depois os transicionados no Gate 3 — inclusive os materializados.

### `temporaria.limpar`

Apague a [pasta de envio](sync.md#a-pasta-de-envio), só depois de todo o Gate 3 conferido.

## Materializar bugs em `issues/`

O bug que só existe na plataforma — registrado na UI, por outra rodada ou pelo eng. de QA — vira arquivo
antes do reteste e da triagem. É o que deixa `issues/` como a fonte única dos subagents. Quem materializa é a
thread principal; nenhum subagent lê o JSON.

Para cada bug do read-back **sem** `[QA_DIR]/issues/<id>.md`:

1. Escreva o arquivo no formato de `templates/triage/bug.md`: o envelope `qa-issue/v1` com `id`, `title`
   **letra por letra**, `severity`, `status` e `tc_ref` do read-back; `priority` pela tabela de severidade do
   [contrato](../shared/contrato-qa.md#bugs) quando não vier; `type` como veio, ou `functional` quando não
   vier
2. O corpo sai do `body` do read-back. O que ele não traz fica `não informado no registro original` — **não
   reconstrua passos de memória**. No reteste, o `retest.md` completa o que o retester viu
3. `**Origem:**` como o read-back diz; sem origem, `**Origem:** plataforma`

Bug **com** arquivo cujo `status` na plataforma é outro (resolvido ou invalidado na UI) ⇒ a plataforma é a
fonte de verdade: regrave o `status` do envelope com o dela, acrescente ao **Histórico** a linha
`<data> · plataforma · <de> → <para>`, e diga isso no anúncio da fase. Não é transição do QA: não sobe de
volta.

Diga quantos materializou, por caminho.

## Gate 1

Aprovado o plano ([gates.md](../setup/gates.md#gate-1)), `plano.registrar` e [confira o
efeito](#conferir-o-efeito). Envelope recusado com exit `1` é o único caso em que se edita o envelope do
test-plan à mão: corrija o campo que o `error.message` nomeia, diga qual, e reenvie uma vez.

Não há cabeçalho `**Gate 1:**` nem evento de estado: o `qa-plan` na plataforma é o registro.

## Gate 3

Com o de acordo do humano, **depois** das gravações em disco do núcleo
([gates.md](../setup/gates.md#gate-3) — descartes, transições, ajuste do envelope), na ordem, cada passo só
depois do anterior conferido:

1. **Evidência** — `evidencia.enviar`, uma chamada por screenshot citada no `qa-result.md`
   ([abaixo](#evidência))
2. **`qa-result`** — `resultado.registrar`
3. **`qa-issue` dos bugs novos** — `bug.registrar`, um por arquivo `issues/BUG-NNN.md` novo
4. **`qa-issue` das transições** — `bug.registrar` dos bugs que o Gate 3 transicionou (`resolved`,
   reabertos, `cannot-reproduce` fechado pelo humano): mesmo `id`, mesmo `title`, novo `status`. Bug que segue
   `open` sem transição (`still-open`, `cannot-reproduce` não fechado, `blocked`) não se reenvia
5. **`temporaria.limpar`**

Bug descartado no gate não tem mais arquivo, e por isso não sobe. A pergunta final do Gate 3 é também a
autorização do envio: sem o de acordo, nada sobe.

Falhou um passo ⇒ pare ali: o que já subiu fica, o arquivo em `[QA_DIR]` do que não subiu fica como está —
é dele que sai o reenvio — e você diz ao humano o que subiu, o que não, e o caminho.

## Evidência

`wi evidence` sobe **um arquivo por chamada**. O caminho no bucket é derivado no servidor — não há flag de
caminho; o nome em disco vira só o final legível. O `path` da resposta é lido, nunca proposto.

Para cada entrada de `evidence[]` no envelope do `qa-result.md` cujo `url` é um caminho relativo a `qa/`
(`screenshots/<arquivo>.png`):

1. `productdock wi evidence <QA_DIR>/<url> --ref <ref> --json`
2. Regrave, no próprio `qa-result.md`, o valor de `url` pelo `path` devolvido — o envio é verbatim do arquivo,
   então a troca é gravada antes do `resultado.registrar`

Leitura tolerante: entrada com a chave `path` no lugar de `url`, ou com o marcador `<upload:<caminho>>`, vale
pelo caminho que traz — e é regravada como `url`. Entrada cujo `url` já é um `path` do bucket (de um envio
anterior que parou no meio) não sobe de novo.

Só PNG, JPEG, GIF e WEBP, até 10 MB. Trace, vídeo e outro formato não sobem: tire a entrada do `evidence[]` e
anote na seção **Evidências não enviadas** do `qa-result.md`, com o caminho em disco. Arquivo recusado sai
exit `1` (`unsupported_file_type`, `file_too_large`, `empty_file`) — é problema **daquele arquivo**, não do
canal: tire a entrada, anote na mesma seção e siga.

## Envelopes

A forma dos três envelopes está no núcleo ([workspace.md](../setup/workspace.md#envelopes)). Aqui, o que é
da plataforma:

- **Os schemas são contrato com a plataforma.** Copie a forma, troque os valores; campo ou enum fora do
  schema volta exit `1`
- **O `qa-issue` versiona sob uma identidade — não acumula.** Cada envio é mais uma versão da mesma linhagem.
  Mudar o estado de um bug = reenviar com o **mesmo `id` e o mesmo `title`** e o novo `status`: é transição, e
  é aceita. **Reusar um número para outro defeito é recusado** — mesmo `id`, `status: "open"` e `title`
  diferente volta exit `1` nomeando `id`, e nada se grava. A numeração sai de `issues/` depois de
  `bugs.todos`, e é uma só para esta skill e a `pd-workflow-qa`
- `status` ∈ `{open, resolved, invalid}`. `invalid` só chega da plataforma, pela materialização: esta skill
  nunca envia `invalid`. Veredito do reteste (`still-open`, `cannot-reproduce`) nunca vai como `status`
- `evidence[].url` publicado é o `path` que `wi evidence` devolveu — nunca um caminho local, nunca uma URL
  assinada

## Conferir o efeito

Exit `0` não basta: confira que o `.data` traz o artefato com o `type` e a versão esperados. Falhou o
envio, o arquivo em `[QA_DIR]` fica como está — é dele que sai o reenvio. Diga ao humano o que subiu, o que
não subiu, e o caminho do que ficou.

## Ao encerrar

- Diga o que foi submetido e o que ficou só em disco.
- O card **não** se moveu: o handoff de QA é manual, na UI.
- Com bug aberto, eles seguem na aba Qualidade e voltam ao Dev pela `pd-workflow`, como fix tasks. Da
  terceira rodada em diante, sem `critical` nem `high` aberto, a recomendação é o handoff com os bugs
  restantes registrados.
- Sem bug aberto, o desenvolvimento está fechado: o Dev move o card para `review` na UI, e o eng. de QA segue
  com a `pd-workflow-qa` no ambiente deployed.
