# Gates

Quem abre o gate é a thread principal, lendo o relatório do subagent — nunca o subagent. Gate que abre sem
pendência também se anuncia: gate que só fala quando bloqueia não se distingue de gate que não aconteceu.

O que cada gate exige do humano é o mesmo nos dois backends. O que acontece depois — registrar, publicar —
é uma operação de backend ([backend.md](backend.md#operações)).

| O quê                                                        | Canal                                          |
| ------------------------------------------------------------ | ---------------------------------------------- |
| aprovação do plano (Gate 1) e confirmação do veredito (Gate 3) | **chat**                                     |
| perguntas 🔴 do planner e perguntas ao produto (≤3)            | **`[productdock]`** uma mensagem no chat · **`[local]`** [a página](#perguntas-pela-página) |

---

## Gate técnico

**Fase 0 → Fase 2.** Não bloqueia a Fase 1: dá para planejar antes de o Dev fechar.

Esta skill é o passo seguinte à Validation da `pd-workflow`, na mesma máquina. Executar sobre implementação
que a Validation não aprovou é testar o que ainda vai mudar.

| `[ITEM_DIR]/qa-report.md`  | O que fazer                                                                       |
| -------------------------- | --------------------------------------------------------------------------------- |
| `**Status**: PASS`         | abre                                                                              |
| `FAIL` ou `PARTIAL`        | **bloqueia**: corrija pela `pd-workflow` e rode a Validation de novo              |
| não existe                 | **bloqueia**: rode a Validation da `pd-workflow` antes                            |

O `qa-report.md` é mais velho que o último commit do branch (`git log -1 --format=%cI` × data do
arquivo) ⇒ avise que a Validation pode estar desatualizada, e pergunte se segue. Essa conferência de data só
vale para a Fase 2 (`executar`, `retestar`), não para `planejar`.

## Gate 1

**Fase 1 (plano) → Fase 2 (execução).** Abre em dois passos.

**1. Perguntas 🔴.** O relatório do `pd-qa-planner` traz perguntas 🔴 (bloqueiam o plano: critério ambíguo,
persona sem acesso definido, regra de negócio que nenhuma fonte decide) ⇒ leve **todas de uma vez**, no
formato de [As perguntas do QA](#as-perguntas-do-qa), e redespache uma vez com `respostas`. 🟡 e 🟢 não
bloqueiam e não vão ao gate de perguntas: entram no resumo do plano, no chat, junto com o pedido de
aprovação. Fechado o gate das perguntas, `perguntas.registrar`.

**2. Aprovação — no chat.** Apresente o resumo — do relatório, sem abrir o plano:

```
Plano de QA — <WI> · <título>
  Tamanho: pequeno | médio | grande (critérios X · telas X, contados por você) · Personas: X · Jornadas: X · Charters: X em X lotes · TC: X (P0 X · P1 X · P2 X · P3 X)
  Critérios: X de Y cobertos  ·  sem cobertura: <IDs, ou "nenhum">
  Ambiente da execução: <bloqueios, e-mail de dev, viewport — uma linha, ou "sem restrição declarada">
  Automação: e2e X (missing X) · integration X · manual X
  Perguntas 🟡: <uma por linha, ou "nenhuma">
  Arquivos: <QA_DIR>/test-plans/ · <QA_DIR>/test-cases/
Aprova o plano para seguir para a execução?
```

**`[productdock]`** A última linha é _"Aprova o plano para submeter ao ProductDock e seguir para a
execução?"_ — aprovar é também autorizar a publicação.

Aprovado ⇒ `plano.registrar` e confira o efeito. Ajustes ⇒ redespache o `pd-qa-planner` em modo `revisar`
com os ajustes em `respostas`, e reapresente. Aprovar o plano **não** é autorizar a execução no modo
`planejar`: ali a rodada encerra.

Critério sem nenhum TC é **sempre** dito, mesmo quando o humano aprova assim. Plano acima do teto do
tamanho, ou charter acima do orçamento, também: com o porquê do planner, ou redespache em `revisar` antes de
pedir a aprovação ([plan.md](../plan/plan.md)).

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
de bug existente mudou. Sem o humano de acordo, nada vale e nada sobe.

Apresente — do relatório do `pd-qa-triager`:

```
Resultado de QA — <WI>
  Veredito: pass | fail | partial
  TC: pass X · fail X · blocked X · skip X   ·   critérios cobertos X de Y
  Bugs novos: X (critical X · high X · medium X · low X)
    BUG-NNN · <severidade> · <título>          (um por linha)
  Transições: resolved X (BUG-…) · still-open X (BUG-…) · cannot-reproduce X (BUG-…) · reabertos X (BUG-…)
  Evidências: X screenshots em <QA_DIR>/screenshots/
  Perguntas ao produto (≤3): X — vão depois deste gate
  Sugestões de backlog: X — <título sugerido, um por linha>  · não voltam a este Work Item
Confirma o veredito, os bugs novos e as transições?
```

**`[productdock]`** A última linha é _"Confirma o veredito, os bugs novos e as transições, e envio evidência,
qa-result e os qa-issue ao ProductDock?"_ — a mesma confirmação autoriza o envio.

`cannot-reproduce` só fecha com o humano de acordo: sem isso, o bug fica `open` e volta ao próximo reteste
([workspace.md](workspace.md#o-status-do-bug)).

Com o de acordo, na ordem — cada passo só depois do anterior conferido:

1. **Bugs descartados** — o que o humano tirou da lista: apague o `issues/BUG-NNN.md` (era rascunho) e
   anote em **Achados que não viraram bug** do `qa-result.md`, com `descartado no Gate 3 — <motivo>`
2. **Transições** — para cada bug da tabela de transições do triager: o novo `status` no envelope, a
   `severity` reavaliada quando é reabertura, e uma linha no **Histórico** do corpo (rodada, de → para, o
   que se viu, a evidência). `id` e `title` não mudam. Para gravar, edite o envelope e acrescente a linha; não
   releia o bug inteiro
3. **Envelope do `qa-result.md`** — ajuste se o humano descartou bug (`issues`, `test_cases[].bug_ref`,
   `verdict`)
4. **`evidencia.enviar`**
5. **`resultado.registrar`**
6. **`bug.registrar`** — um por bug novo, depois um por bug transicionado
7. **`temporaria.limpar`**

Os passos 1 a 3 são do disco, iguais nos dois backends; 4 a 7 são do backend
([backend.md](backend.md#operações)). Falhou um passo ⇒ pare ali e diga o que ficou registrado, o que não, e
o caminho.

Depois, havendo **perguntas ao produto**, faça-as no formato de [As perguntas do QA](#as-perguntas-do-qa).
As respostas vão a `decisoes-produto.md` com o destino de cada uma — `WI novo` é o padrão para toda resposta
que pede mudança ([triage.md](../triage/triage.md#depois-das-respostas--decisoes-produtomd)) — e o gate
fechado é `perguntas.registrar`. As perguntas e as sugestões de backlog **não** viram bug nem `qa-issue` e
não bloqueiam o registro do Gate 3.

## As perguntas do QA

As 🔴 do planner (Gate 1) e as perguntas ao produto (depois do Gate 3) vão ao humano **todas de uma vez**,
em itens com `id`. **`[productdock]`** numa mensagem no chat, no [formato inline](#gate-inline).
**`[local]`** [pela página](#perguntas-pela-página).

| Gate                            | `id`             | Obrigatório | O item traz                                                                    | Fecha com                                                         |
| ------------------------------- | ---------------- | ----------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| perguntas do plano (Gate 1)     | `Q-01`…          | sim         | o critério e a fonte, o que nenhuma fonte decide, os TC que dependem           | `Muda`: o que a resposta muda no plano                            |
| perguntas ao produto (Gate 3)   | `P-01`…          | sim         | o comportamento observado, onde (tela, charter), o critério, por que decide a jornada | `Muda`: o destino em `decisoes-produto.md`                  |
| destino da pergunta ao produto  | `P-01-destino`…  | não         | "se a resposta pedir mudança, para onde ela vai"                               | `Default`: `WI novo`                                              |

Todo item leva 2 a 3 sugestões; elas são atalho, nunca substituem a resposta livre. Nas perguntas ao
produto, as sugestões são as respostas plausíveis **e** `decido depois — fica pendente`: quem responde é o
humano da sessão, que pode precisar consultar alguém (no `productdock`, o PM). O item de destino tem as
sugestões `WI novo` e `escopo deste WI`; só a escolha explícita de `escopo deste WI` traz a mudança para
este Work Item.

Ordene do que trava para o que não trava. A resposta: o que o humano escolheu é a decisão, o que escreveu ao
lado a qualifica; só texto que nega a escolha vira pergunta nova. **Nunca aplique um `Default` em silêncio**,
e o gate nunca se pula: sem resposta, ele segue pendente.

### Gate inline

Os mesmos itens, todos num turno só, na ordem acima:

```
[Q-01]  <o que exige decisão, em uma linha>            (obrigatório | opcional)
  <rótulo>: <valor>
  Muda: <o que a resposta altera>                      (nos obrigatórios)
  Default: <o que faço sem resposta>                   (nos opcionais)
  Opções: <A> · <B>
```

Depois do último, uma linha dizendo quantos são obrigatórios.

### Perguntas pela página

**`[local]`** As perguntas desta skill ao humano passam pela **página de perguntas da `pd-workflow`**
(`templates/handoff-ui/`), e só por ela. A página é do pacote da `pd-workflow`; esta skill escreve só o
`handoff.json`. **Não gere HTML.**

#### A página é obrigatória

Sonda, no início da sessão: `node -v` ≥ 18 **e** `<pd-workflow>/templates/handoff-ui/server.cjs` existe (em
`.claude/skills/pd-workflow/`, `~/.claude/skills/pd-workflow/` ou `.github/skills/pd-workflow/`). Ela não
bloqueia a sessão: bloqueia **só o gate de perguntas**, e só se houver pergunta. Anuncie o resultado.

Sem a página, **o gate das perguntas bloqueia**. Diga exatamente o que falta e como resolver, e pare:

| O que falhou                                                 | O que dizer                                                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `node -v` ausente ou < 18                                    | instale o Node ≥ 18 e me chame de novo                                                          |
| `server.cjs` da `pd-workflow` não encontrado                  | instale a `pd-workflow` (com `templates/handoff-ui/`) em `.claude/skills/` ou `~/.claude/skills/` |
| o servidor saiu com `3` (nenhuma porta livre na faixa 8477–8484) | libere uma porta da faixa — ou diga qual usar, e eu rodo com `--port` — e me chame de novo   |
| saiu com `2` (timeout — ninguém enviou)                       | rode de novo quando puder responder; o gate segue pendente                                        |
| saiu com `4` (`handoff.json` inválido)                         | o erro é seu: corrija o campo que ele nomeia e rode de novo. Persistindo, bloqueie e mostre o erro |
| saiu com `5` (erro inesperado)                                 | mostre a saída, e rode de novo quando o humano pedir                                            |

**Inline no chat só quando o humano pedir explicitamente, nesta conversa** — "responde no chat", "sem
página". Silêncio, "pode seguir" ou "tanto faz" não são pedido. Pedido, apresente os itens no
[formato inline](#gate-inline). O que o servidor imprimir como próximo passo é da `pd-workflow`; aqui vale
esta tabela.

Sem pergunta 🔴 e sem pergunta ao produto, a página não é necessária e nada para.

#### Subir a página

1. Escreva o `handoff.json` na [pasta temporária](local.md#a-pasta-temporária)
2. Rode, **em background** — é a saída do processo que devolve o controle à sessão; sem polling, sem
   `sleep`:

   ```
   node <diretório da pd-workflow>/templates/handoff-ui/server.cjs --dir <pasta temporária>
   ```

   Confira que o arquivo existe antes de montar o comando. Ele valida o `handoff.json`, escolhe a porta em
   `127.0.0.1`, abre o browser e espera 45 min
3. Anuncie no chat a URL e a contagem de itens — o conteúdo vive na página, não se repete no chat — e
   encerre o turno
4. Saída `0`: as respostas vêm no stdout (e em `answers.json`). Cada uma traz `escolha` (a sugestão clicada,
   ou `null`) e `texto` (livre). Sem `escolha`, o `texto` é a resposta; com `escolha`, ela é a decisão e o
   `texto` a qualifica

#### O `handoff.json`

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
`corpo` com `Muda`; `obrigatorio: false` fecha com `Default`. Todo item leva 2 a 3 `sugestoes`. A página não
tem seção de contexto: o que for indispensável para responder entra no `corpo`.

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
