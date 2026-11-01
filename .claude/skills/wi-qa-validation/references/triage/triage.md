# Fase 3 — Triagem e registro

Achado de sessão é observação; bug é o que sobra depois de deduplicar, reproduzir e medir o impacto na
persona. A triagem junta as sessões e o reteste, decide o que vira `BUG-*`, e escreve o resultado da rodada.
Até o Gate 3, tudo o que ela escreve é rascunho; com o de acordo do humano, você registra.

Quem tria é o `wi-qa-triager`. Você monta o briefing, abre o Gate 3, grava as transições de `status` e
leva as perguntas ao produto à página.

---

## 1. Os bugs já registrados

Estão todos em `[QA_DIR]/issues/` — os desta skill, de rodadas anteriores, e os da automação E2E, quando
houver. É de lá que o triager **numera** (próximo `BUG-N` livre) e **deduplica**. Não há outra fonte de bug
para ler.

## 2. Montar o briefing

| Campo         | O que passar                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `wi`          | a chave                                                                                                         |
| `qa_dir`      | `[QA_DIR]`                                                                                                      |
| `validação`   | o caminho de `[ITEM_DIR]/qa-report.md`                                                                          |
| `e2e`         | o caminho de `[QA_DIR]/e2e/qa-e2e-report.md`, ou `ausente`                                                      |
| `rodada`      | `exploração` ou `confirmação`, branch e build testados, a URL, início e fim da Fase 2                           |
| `costura`     | o caminho de `[ITEM_DIR]/spec.md` ou `plan.md` — é por ela que o triager diz o que o Work Item muda              |
| `referências` | caminhos de `references/shared/contrato-qa.md` e `references/triage/{triage,severity,bug-writing,checklist}.md` |
| `templates`   | caminho da pasta `templates/triage/`                                                                            |

## 3. O que o triager escreve

| Arquivo                       | O que é                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `issues/BUG-NNN.md`           | um por bug novo: envelope `qa-issue/v1` no topo, e o bug para humanos — passos, esperado × observado, persona, jornada, evidência                                  |
| `qa-result.md`                | um por rodada: envelope `qa-result/v1` no topo, `**Gate 3:** pendente` no cabeçalho, e o relatório da rodada — cobertura, sessões, CFR, bugs, lotes de correção, **transições propostas**, riscos, o que não rodou |

O triager **não** toca em bug existente. As transições — `resolved`, `still-open` e `cannot-reproduce` do
reteste, e as reaberturas que a deduplicação achou — saem como **proposta**, na tabela de transições do
relatório e do `qa-result.md`; quem as grava no arquivo do bug é você, no Gate 3
([artefatos.md](../setup/artefatos.md#o-status-do-bug)).

Um arquivo por artefato: o registro é o que está em disco, sem cópia para manter em sincronia. No
`evidence[]` do envelope, cada entrada é o `path` relativo a `qa/` (`screenshots/<arquivo>.png`).

## Lotes de correção

O bug é registrado um a um — um `BUG-NNN.md` por bug, sempre. A **correção** não precisa ser: bugs na mesma
tela e no mesmo componente costumam cair no mesmo trecho de código, e corrigi-los numa tarefa só poupa ao
Dev abrir o mesmo arquivo três vezes. O triager sugere os lotes em **Lotes de correção sugeridos** do
`qa-result.md`; o `wi-workflow` os usa como ponto de partida das fix tasks e confere no código.

Entram todos os bugs que ficam `open` ao fim da rodada — novos, reabertos e `still-open` do reteste. Agrupe
pelo que a sessão observou, nesta ordem:

1. **Mesmo componente na mesma tela** — o lote mais forte
2. **Mesma tela**, componentes diferentes — só se o observado sugere a mesma origem (o mesmo dado errado
   em dois lugares, o mesmo padrão visual quebrado)
3. **Mesmo componente em telas diferentes** — um componente compartilhado (o mesmo seletor de data, o mesmo
   botão primário fora do protótipo)

Regras:

- **Até 4 bugs por lote.** Mais que isso vira tarefa grande demais para revisar e retestar
- **Na dúvida, separado.** Lote errado custa mais que uma tarefa a mais. Bug sem tela nem componente fica
  sozinho
- **Não é deduplicação.** Bugs do mesmo lote continuam bugs distintos, cada um com o seu arquivo e o seu
  reteste. Se parecem o mesmo bug, isso é a deduplicação — de volta ao passo de deduplicar
- O lote leva a **maior severidade** entre os bugs dele — é ela que decide a ordem da correção
- O lote é **sugestão**: não vai a envelope nenhum, nem muda o bug

## 4. Ler o relatório

O triager devolve o veredito, a contagem de TC, a lista de bugs novos (id, severidade, título), os lotes
de correção sugeridos, as transições propostas (de → para, e a severidade reavaliada nas reaberturas), os
achados que **não** viraram bug e por quê (duplicado de `BUG-N`, comportamento conforme a fonte,
`spec-gap`, descartado num Gate 3 anterior), as perguntas ao produto e as sugestões de backlog, e a lista de
screenshots citadas.

`spec-gap` não é bug. Ele chega ao Gate 3 já classificado — **Perguntas ao produto** ou **Sugestões de
backlog** —, separado dos bugs.

## Perguntas ao produto e sugestões de backlog

Pergunta de produto é do PRD Tech Review e da Fase 1, antes do código. A que nasce na execução é a que
escapou — e cada resposta "muda" volta ao Dev como trabalho novo, que a rodada seguinte testa e que gera
novas perguntas. Por isso o triager **classifica** todo `spec-gap` pelo escopo, antes de levá-lo ao humano.
As que ficam vão pela [página](../setup/gates.md#perguntas-pela-página), depois do Gate 3:

| Classe          | Quando                                                                                                                                                            | Vai para                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `mudança`       | o comportamento é parte do que o Work Item muda — um critério da fonte, a superfície que o charter marca como **Mudança** — **e** a resposta decide se a persona conclui a jornada | **Perguntas ao produto**    |
| `pré-existente` | o comportamento já existia antes da mudança, ou mora em superfície que a costura não toca — inclusive quando a sessão passou por ela                              | **Sugestões de backlog**    |
| `polimento`     | refinamento sem fonte que não impede a jornada: microcopy, animação, contraste de elemento não-textual, ordem de foco depois de uma ação, detalhe de anúncio ao leitor de tela | **Sugestões de backlog**    |

Regras:

- **Até 3 perguntas por rodada.** Mais de 3 `mudança`: as 3 de maior impacto na persona ficam; as demais
  vão a Sugestões de backlog com a nota `excedente`. Muita pergunta é sinal de PRD incompleto — diga isso
  ao humano, e a recomendação é voltar ao PRD Tech Review da `wi-workflow`, não responder uma a uma
- **Na dúvida entre `mudança` e as outras, não é `mudança`.** O custo de uma sugestão a mais no backlog é
  zero; o de uma pergunta a mais é uma rodada
- **Rodada de confirmação não faz pergunta** ([workspace.md](../setup/workspace.md#rodada-de-confirmação)):
  todo `spec-gap` dela é Sugestão de backlog
- **Sugestão de backlog não é bug, nem pergunta, nem fix task.** É uma linha com o comportamento, onde, e
  um título sugerido para o Work Item novo. O humano decide se abre

### Depois das respostas — `decisoes-produto.md`

As respostas chegam pela página, depois do Gate 3 — quem responde é o humano da sessão. Registre-as em
`[QA_DIR]/decisoes-produto.md`, uma linha por pergunta, **com o destino** — é a única coisa que o
`wi-workflow` lê dali:

| #   | Pergunta | Decisão | Destino |
| --- | -------- | ------- | ------- |

| Destino               | Quando                                                                                     | O que acontece                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `nada`                | o comportamento atual está certo                                                           | nada                                                                                              |
| `pendente`            | o humano respondeu `decido depois`                                                         | a linha fica `pendente` e não bloqueia nada; quando o humano trouxer a resposta, ela entra aqui com o destino |
| `ajusta o plano`      | o comportamento está certo e o TC esperava outro                                           | `wi-qa-planner` em `revisar`                                                                      |
| `WI novo`             | **o padrão** para toda resposta que pede mudança                                           | o humano abre o Work Item; este não muda                                                          |
| `escopo deste WI`     | o humano escolheu, **explicitamente**, `escopo deste WI` no item de destino da página (ou disse isso nesta conversa) | o `wi-workflow` revisa a costura (novo critério) e só então fatia — nunca fix task direto         |

Resposta que pede mudança **não** ganha `escopo deste WI` por padrão: o item de destino da página tem
`WI novo` como `Default`, e só a escolha explícita do humano muda isso. Anote quem decidiu. Sugestão de
backlog que o humano promove a pergunta entra aqui do mesmo jeito. Nenhuma linha vira bug.

## 5. Gate 3 e o registro

Ver [gates.md](../setup/gates.md#gate-3). O registro é seu, na ordem do gate, conferindo no disco cada
passo ([artefatos.md](../setup/artefatos.md#conferir-o-que-foi-gravado)).

Ao fim, diga:

- o veredito e o que ficou registrado — o `qa-result.md`, X bugs novos, X transições gravadas — por caminho
- o que o humano descartou e por quê
- que os bugs abertos (`open` e `still-open`) voltam ao Dev pelo `wi-workflow`, como fix tasks — agrupadas
  pelos lotes sugeridos, que o `wi-workflow` confere no código
- as perguntas ao produto respondidas, as `pendente`, e o destino de cada uma em `decisoes-produto.md`
- as sugestões de backlog, para o humano decidir se abre Work Item — elas **não** voltam a este
- que **nada foi commitado**
