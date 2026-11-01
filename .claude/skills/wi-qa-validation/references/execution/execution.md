# Fase 2 — Execução

Cada charter do plano vira uma sessão exploratória no browser real, num subagent próprio: a sessão é longa,
cheia de screenshot e de leitura de tela, e nada disso precisa passar pela thread principal. Com bugs
abertos no Work Item, um subagent de reteste fecha a fase.

Quem executa são o `wi-qa-explorer` e o `wi-qa-retester`. Você resolve o app e as credenciais, ordena os
charters, despacha um por vez, e abre o Gate 2.

---

## 0. Antes de despachar

1. **Gate técnico** — [gates.md](../setup/gates.md#gate-técnico)
2. **Driver de browser** — Playwright MCP na sessão (`driver: mcp`, preferido) ou `playwright-cli`
   instalado (`driver: cli`, fallback), pela sonda do [SKILL.md](../../SKILL.md#pré-requisitos--sondas-no-início-da-sessão).
   Nenhum dos dois ⇒ bloqueie: sem browser não há execução
3. **O app, no local.** Esta skill fecha o desenvolvimento: o app é o do branch do Dev, rodando na máquina
   dele. Ambiente deployed está fora desta skill. A primeira que valer:
   1. URL local que o Dev deu (`localhost`, túnel do próprio Dev)
   2. **Ambiente local** do `PROJECT.md`, já de pé — confira com o comando que a linha declara
   3. Comando para subir que o `PROJECT.md` ou o README declara — **confirme com o Dev antes**: subir o
      app é processo que fica rodando, e porta, banco e segredo são dele. Confirmado, **você** sobe em
      segundo plano e derruba ao fim da fase
   4. Nada disso ⇒ pergunte como o app sobe no local. Sem app, a Fase 2 não roda

   URL de homologação ou produção oferecida ⇒ diga que ambiente deployed está fora desta skill e confirme
   antes de usar: o build ali pode não ser o do branch

   **Mais de uma aplicação.** Num guarda-chuva (`.gitmodules` na raiz, cada aplicação um submódulo) ou com a
   `spec.md` tocando mais de um repositório (um `## Código — <caminho>` por repositório), o app é o
   **conjunto**: o front que o browser abre e cada back que ele chama. Resolva cada um pela mesma escada,
   por repositório — a linha dele no **Ambiente local** do `PROJECT.md`, ou o README **do submódulo** —, e só
   despache com todos de pé: front no ar com a api fora produz bug falso. Confira também que cada submódulo
   está no branch do Work Item (`git -C <submódulo> branch --show-current`): em HEAD destacado, no commit que
   o guarda-chuva aponta, ele não roda o código do Dev — diga isso ao Dev, sem `checkout`. A pergunta do que
   faltar é uma só, com uma linha por aplicação

4. **Credenciais por conta.** O plano diz quais contas as personas usam. Confira se as variáveis do
   [contrato](../shared/contrato-qa.md#personas-e-contas) existem — `QA_<CONTA>_USUARIO` e
   `QA_<CONTA>_SENHA` —, sem ler o valor. Faltando, peça que o Dev as defina; nunca o valor no chat. O
   briefing leva os nomes das variáveis, não o segredo. Persona sem credencial ⇒
   os charters dela vão `blocked`, os demais seguem

Pergunte o que faltar dos itens 3 e 4 **numa mensagem**.

## 1. Ordem dos charters

Liste `test-plans/charters/` — só os nomes. Ordem: prioridade do charter (P0 primeiro), e dentro dela a
ordem do plano. Charter que já tem `sessions/CH-NN-*.md` não roda de novo (retomada).

**Rodada de confirmação** ([workspace.md](../setup/workspace.md#rodada-de-confirmação)): só os charters com
TC `fail` ou `blocked` no `qa-result-<data>.md` anterior, e os de critério novo por `escopo deste WI`. Os
demais não rodam, e o Gate 2 diz quais ficaram de fora e por quê.

O charter de **conferência visual** (`design-check`) só roda se a Fase 0 achou fonte de design e ela é
legível: o MCP dela na sessão (Figma, Claude Design); com `tool: link`, o link abre no browser sem login
que o agente não tem; com `tool: arquivo`, o arquivo existe. Sem isso, `not-run` com o motivo — não confira
design de memória.

## 2. Despachar o `wi-qa-explorer`

**Um por charter, em sequência** — o Playwright MCP compartilha o browser. Despachar dois ao mesmo tempo faz
um navegar na sessão do outro. Com `driver: cli` a regra é a mesma: a rodada não muda de forma conforme o
driver.

| Campo         | O que passar                                                                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa_dir`      | `[QA_DIR]`                                                                                                                                                                    |
| `charter`     | o caminho do `CH-NN-*.md`                                                                                                                                                     |
| `app`         | a URL                                                                                                                                                                         |
| `driver`      | `mcp` ou `cli`, o da sonda; com `cli`, a sessão é `-s=CH-NN`                                                                                                                  |
| `credenciais` | conta → os nomes das variáveis (`QA_<CONTA>_USUARIO`, `QA_<CONTA>_SENHA`); `anonima` sem login                                                                                |
| `rodada`      | `exploração` na primeira rodada sobre o plano; `confirmação` nas seguintes                                                                                                    |
| `orçamento`   | as ações de browser do time-box do charter ([charters.md](charters.md#time-box-e-orçamento)); metade na confirmação                                                          |
| `design`      | só no `design-check`: as fontes de design da Fase 0 — `tool` e link ou caminho de cada uma |
| `referências` | caminhos de `references/execution/{charters,tours,edge-cases,browser}.md` e `references/triage/severity.md`; mais `cfr.md` no charter de CFR e `design-check.md` no de design |
| `template`    | caminho de `templates/execution/session-log.md`                                                                                                                               |

O explorer escreve `sessions/CH-NN-<slug>.md` e as screenshots em `screenshots/CH-NN-*.png`, e devolve um
relatório curto. **Não abra o log**: o relatório basta para o Gate 2, e o triager lê o log do disco.

Sessão `blocked` por credencial ou massa ⇒ siga para o próximo charter; leve ao Gate 2.

## 3. Reteste

Só se a Fase 0 achou bugs abertos (`status` `open` ou `still-open`). Um `wi-qa-retester`, depois do
último charter:

| Campo         | O que passar                                                                    |
| ------------- | ------------------------------------------------------------------------------- |
| `qa_dir`      | `[QA_DIR]`                                                                      |
| `bugs`        | os caminhos dos `issues/BUG-*.md` abertos, da Fase 0                            |
| `app`         | a URL                                                                           |
| `driver`      | como no explorer; com `cli`, a sessão é `-s=retest`                             |
| `credenciais` | como no explorer                                                                |
| `referências` | caminhos de `references/execution/browser.md` e `references/triage/severity.md` |
| `template`    | caminho de `templates/execution/retest.md`                                      |

No modo `retestar`, ele é o único despacho da fase. O retester decide o veredito de cada bug e o escreve
no `retest.md`; **não** muda o `status` no arquivo do bug — quem grava é você, no
[Gate 3](../setup/gates.md#gate-3).

## 4. Fechar a fase

Derrube o app se foi você quem subiu. Abra o [Gate 2](../setup/gates.md#gate-2).
