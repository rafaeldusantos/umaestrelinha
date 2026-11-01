# Gates

Quem abre o gate é a thread principal, lendo o relatório do subagent — nunca o subagent. Gate que abre sem
pendência também se anuncia: gate que só fala quando bloqueia não se distingue de gate que não aconteceu.

Dois canais, cada um com o seu papel:

| O quê                                                        | Canal                                          |
| ------------------------------------------------------------ | ---------------------------------------------- |
| aprovação do plano (Gate 1) e confirmação do veredito (Gate 3) | **chat**                                     |
| perguntas 🔴 do planner e perguntas ao produto (≤3)            | **a página web** — [abaixo](#perguntas-pela-página) |

---

## Gate técnico

**Fase 0 → Fase 2.** Não bloqueia a Fase 1: dá para planejar antes de o Dev fechar.

Esta skill é o passo seguinte à Validation do `wi-workflow`, na mesma máquina. Executar sobre implementação
que a Validation não aprovou é testar o que ainda vai mudar.

| `[ITEM_DIR]/qa-report.md`  | O que fazer                                                                       |
| -------------------------- | --------------------------------------------------------------------------------- |
| `**Status**: PASS`         | abre                                                                              |
| `FAIL` ou `PARTIAL`        | **bloqueia**: corrija pelo `wi-workflow` e rode a Validation de novo              |
| não existe                 | **bloqueia**: rode a Validation do `wi-workflow` antes                            |

O `qa-report.md` é mais velho que o último commit do branch (`git log -1 --format=%cI` × data do
arquivo) ⇒ avise que a Validation pode estar desatualizada, e pergunte se segue.

## Gate 1

**Fase 1 (plano) → Fase 2 (execução).** Abre em dois passos.

**1. Perguntas 🔴 — pela página.** O relatório do `wi-qa-planner` traz perguntas 🔴 (bloqueiam o plano:
critério ambíguo, persona sem acesso definido, regra de negócio que nenhuma fonte decide) ⇒ leve **todas
numa página só** ([abaixo](#perguntas-pela-página)) e redespache uma vez com `respostas`. Sem página, o
gate **bloqueia** — não pergunte no chat, salvo pedido explícito do humano. 🟡 e 🟢 não bloqueiam e não vão
à página: entram no resumo do plano, no chat, junto com o pedido de aprovação.

**2. Aprovação — no chat.** Apresente o resumo — do relatório, sem abrir o plano:

```
Plano de QA — <WI> · <título>
  Personas: X · Jornadas: X · Charters: X · TC: X (P0 X · P1 X · P2 X · P3 X)
  Critérios: X de Y cobertos  ·  sem cobertura: <IDs, ou "nenhum">
  Automação: e2e X (missing X) · integration X · manual X
  Perguntas 🟡: <uma por linha, ou "nenhuma">
  Arquivos: <QA_DIR>/test-plans/ · <QA_DIR>/test-cases/
Aprova o plano para seguir para a execução?
```

Aprovado ⇒ registre ([artefatos.md](artefatos.md#onde-cada-arquivo-mora-e-quem-escreve)): troque
`**Gate 1:** pendente` por `aprovado em <data>` no cabeçalho do test-plan, acrescente a linha
`QA · Gate 1 — plano` na tabela **Gates** do `item.md`, e confira. Ajustes ⇒ redespache o `wi-qa-planner`
em modo `revisar` com os ajustes em `respostas`, e reapresente. Aprovar o plano **não** é autorizar a
execução no modo `planejar`: ali a rodada encerra.

Critério sem nenhum TC é **sempre** dito, mesmo quando o humano aprova assim.

## Gate 2

**Fase 2 (execução) → Fase 3 (triagem).** Sempre abre — o resultado de cada sessão, inclusive a bloqueada,
é insumo da triagem.

O que você leva ao anúncio:

- sessões `done` · `blocked` (com o motivo: credencial, massa, ambiente fora) · `not-run`
- achados por sessão, com a gravidade que o explorer propôs
- reteste: `resolved` · `still-open` · `cannot-reproduce` · `blocked` — veredito do retester, que só vira
  `status` no Gate 3
- charter `blocked` por insumo que o humano tem ⇒ pergunte agora, em bloco, e ofereça rodar de novo **só
  aquele** charter antes da triagem. É pedido de insumo (credencial, massa, URL), não pergunta de produto:
  vai no chat

## Gate 3

**Fase 3 (triagem) → registro.** Até aqui os bugs novos e o `qa-result.md` são rascunho, e nenhum `status`
de bug existente mudou. Sem o humano de acordo, nada vale.

Apresente — do relatório do `wi-qa-triager`:

```
Resultado de QA — <WI>
  Veredito: pass | fail | partial
  TC: pass X · fail X · blocked X · skip X   ·   critérios cobertos X de Y
  Bugs novos: X (critical X · high X · medium X · low X)
    BUG-NNN · <severidade> · <título>          (um por linha)
  Transições: resolved X (BUG-…) · still-open X (BUG-…) · cannot-reproduce X (BUG-…) · reabertos X (BUG-…)
  Evidências: X screenshots em <QA_DIR>/screenshots/
  Perguntas ao produto (≤3): X — vão pela página, depois deste gate
  Sugestões de backlog: X — <título sugerido, um por linha>  · não voltam a este Work Item
Confirma o veredito, os bugs novos e as transições?
```

`cannot-reproduce` só fecha com o humano de acordo: sem isso, o bug fica como está e volta ao próximo
reteste.

Com o de acordo, grave — cada passo conferido no disco:

1. **Bugs descartados** — o que o humano tirou da lista: apague o `issues/BUG-NNN.md` (era rascunho) e
   anote em **Achados que não viraram bug** do `qa-result.md`, com `descartado no Gate 3 — <motivo>`
2. **Transições** — para cada bug da tabela de transições do triager: o novo `status` no envelope, a
   `severity` reavaliada quando é reabertura, e uma linha no **Histórico** do corpo (rodada, de → para, o
   que se viu, a evidência). `id` e `title` não mudam
3. **`qa-result.md`** — `**Gate 3:** pendente` vira `confirmado em <data>`; ajuste o envelope se o humano
   descartou bug (`issues`, `test_cases[].bug_ref`, `verdict`)
4. **`item.md`** — a linha `QA · Gate 3 — veredito` na tabela **Gates**

Depois, havendo **perguntas ao produto**, abra a [página](#perguntas-pela-página) com elas. As respostas
vão a `decisoes-produto.md` com o destino de cada uma — `WI novo` é o padrão para toda resposta que pede
mudança ([triage.md](../triage/triage.md#depois-das-respostas--decisoes-produtomd)) — e o gate ganha a
linha `QA · perguntas ao produto` no `item.md`. As perguntas e as sugestões de backlog **não** viram bug e
não bloqueiam o registro do Gate 3.

## Perguntas pela página

As perguntas desta skill ao humano — as 🔴 do planner e as perguntas ao produto — passam pela **página de
perguntas da `wi-workflow`**, e só por ela. A página é do pacote da `wi-workflow`; esta skill escreve só o
`handoff.json`. **Não gere HTML.**

### A página é obrigatória

Sem a página, **o gate das perguntas bloqueia**. Diga exatamente o que falta e como resolver, e pare:

| O que falhou                                                 | O que dizer                                                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `node -v` ausente ou < 18                                    | instale o Node ≥ 18 e me chame de novo                                                          |
| `server.cjs` da `wi-workflow` não encontrado                  | instale a `wi-workflow` (com `templates/handoff-ui/`) em `.claude/skills/` ou `~/.claude/skills/` |
| o servidor saiu com `3` (nenhuma porta livre na faixa 8477–8484) | libere uma porta da faixa — ou diga qual usar, e eu rodo com `--port` — e me chame de novo   |
| saiu com `2` (timeout — ninguém enviou)                       | rode de novo quando puder responder; o gate segue pendente                                        |
| saiu com `4` (`handoff.json` inválido)                         | o erro é seu: corrija o campo que ele nomeia e rode de novo. Persistindo, bloqueie e mostre o erro |
| saiu com `5` (erro inesperado)                                 | mostre a saída, e rode de novo quando o humano pedir                                            |

**Inline no chat só quando o humano pedir explicitamente, nesta conversa** — "responde no chat", "sem
página". Silêncio, "pode seguir" ou "tanto faz" não são pedido. Pedido, apresente os mesmos itens inline,
todos num turno só ([formato](#gate-inline)). O que o servidor imprimir como próximo passo é da
`wi-workflow`; aqui vale esta tabela.

Só o gate das perguntas bloqueia. Sem pergunta 🔴 e sem pergunta ao produto, a página não é necessária e
nada para.

### Subir a página

1. Escreva o `handoff.json` na [pasta temporária](artefatos.md#a-pasta-temporária) — `<scratchpad>/wi/<WI-ID>/`
2. Rode, **em background** — é a saída do processo que devolve o controle à sessão; sem polling, sem
   `sleep`:

   ```
   node <diretório da wi-workflow>/templates/handoff-ui/server.cjs --dir <pasta temporária>
   ```

   O diretório se resolve de onde a `wi-workflow` está instalada — `.claude/skills/wi-workflow/`,
   `~/.claude/skills/wi-workflow/` ou `.github/skills/wi-workflow/`. Confira que o arquivo existe antes de
   montar o comando. Ele valida o `handoff.json`, escolhe a porta em `127.0.0.1`, abre o browser e espera
   45 min
3. Anuncie no chat a URL e a contagem de itens — o conteúdo vive na página, não se repete no chat — e
   encerre o turno
4. Saída `0`: as respostas vêm no stdout (e em `answers.json`). Cada uma traz `escolha` (a sugestão clicada,
   ou `null`) e `texto` (livre). Sem `escolha`, o `texto` é a resposta; com `escolha`, ela é a decisão e o
   `texto` a qualifica. Só quando o `texto` nega a `escolha` isso vira pergunta nova

### O `handoff.json`

```json
{
  "wi": "ACME-14",
  "itens": [
    {
      "id": "Q-01",
      "titulo": "<o que exige decisão, em uma linha>",
      "corpo": [
        { "rotulo": "<rótulo>", "valor": "<valor>" },
        { "rotulo": "Muda", "valor": "<o que a resposta altera>" }
      ],
      "sugestoes": ["<opção A>", "<opção B>"],
      "obrigatorio": true
    }
  ]
}
```

O servidor confere a forma: chave desconhecida é recusada; item `obrigatorio: true` (o padrão) fecha o
`corpo` com `Muda`; `obrigatorio: false` fecha com `Default` — o que você faz sem resposta. Todo item leva
2 a 3 `sugestoes`; elas são atalho, nunca substituem o texto livre. A página não tem seção de contexto: o
que for indispensável para responder entra no `corpo`.

| Gate                            | `id`             | `obrigatorio` | O `corpo` traz                                                                 | Fecha com                                                         |
| ------------------------------- | ---------------- | ------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| perguntas do plano (Gate 1)     | `Q-01`…          | `true`        | o critério e a fonte, o que nenhuma fonte decide, os TC que dependem           | `Muda`: o que a resposta muda no plano                            |
| perguntas ao produto (Gate 3)   | `P-01`…          | `true`        | o comportamento observado, onde (tela, charter), o critério, por que decide a jornada | `Muda`: o destino em `decisoes-produto.md`                  |
| destino da pergunta ao produto  | `P-01-destino`…  | `false`       | "se a resposta pedir mudança, para onde ela vai"                               | `Default`: `WI novo`                                              |

Nas perguntas ao produto, as `sugestoes` são as respostas plausíveis **e** `decido depois — fica pendente`:
quem responde é o humano da sessão, que pode precisar consultar alguém. O item de destino tem as
`sugestoes` `WI novo` e `escopo deste WI`; só a escolha explícita de `escopo deste WI` traz a mudança para
este Work Item.

Ordene do que trava para o que não trava.

### Gate inline

Só com o pedido explícito do humano. Os mesmos itens, todos num turno só, na mesma ordem da página:

```
[Q-01]  <o que exige decisão, em uma linha>            (obrigatório | opcional)
  <rótulo>: <valor>
  Muda: <o que a resposta altera>                      (nos obrigatórios)
  Default: <o que faço sem resposta>                   (nos opcionais)
  Opções: <A> · <B>
```

Depois do último, uma linha dizendo quantos são obrigatórios. O que o humano escolheu é a decisão, o que
ele escreveu ao lado a qualifica — igual à página.

### Registro

Gate de perguntas fechado ⇒ uma linha na tabela **Gates** do `item.md` (`QA · perguntas do plano` ou
`QA · perguntas ao produto`, a data, quantos itens e quantos respondidos — e `inline a pedido` quando o
humano pediu para responder no chat). As respostas do plano entram no
redespacho do planner; as do produto, em `decisoes-produto.md`.

## Anúncio entre fases

Ao fim de cada fase, sempre:

```
✓ Fase X concluída — <nome>
  Artefatos: <caminhos em [QA_DIR]>
  <a linha de contagem da fase — ver abaixo>
  Gate X: ABERTO | BLOQUEADO (<motivo>)
  → Próximo: Fase Y — <nome>  |  AGUARDANDO VOCÊ: <o que falta>
```

| Fase | Linha de contagem                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------- |
| 0    | `PRD: sim/não · costura: spec/plan/nenhuma · fontes de design X · insumos X · bugs abertos X · Validation: PASS/FAIL/ausente` |
| 1    | `Personas X · jornadas X · charters X · TC X · critérios X/Y · perguntas 🔴 X 🟡 X · plano: rascunho até o Gate 1` |
| 2    | `Rodada: exploração/confirmação · sessões: done X · blocked X · not-run X · achados X · reteste: resolved X · still-open X` |
| 3    | `Veredito: … · bugs novos X · transições X · evidências X · perguntas X · backlog X · rascunho até o Gate 3` |
