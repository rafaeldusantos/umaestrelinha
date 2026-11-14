# Browser — Playwright para QA manual

O driver da Fase 2 é um browser real que você conduz pelo snapshot de acessibilidade, por um de três
caminhos — a orquestração escolhe na sonda, nesta ordem, e passa no briefing (`driver`):

| `driver`        | O que é                                          | Quando                                                                                                                    |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `agent-browser` | **`agent-browser`** 0.39+ pelo Bash              | **preferido**: snapshot só do que é interativo, comandos encadeados numa chamada, um browser por charter (lotes paralelos) |
| `cli`           | **`playwright-cli`** pelo Bash                   | primeiro fallback: um browser por charter, mas devolve o snapshot como arquivo — uma leitura a mais                       |
| `mcp`           | **Playwright MCP**, headless — tools `browser_*` | último fallback: um browser para todos, a rodada em sequência, e o snapshot também vem como arquivo                       |

A ordem é medida, não gosto: em rodadas reais de QA, sessões com o `agent-browser` fizeram 0,7 chamada ao
modelo por ação de browser e receberam ~200 caracteres por ação; com o `playwright-cli`, 1,5 e ~280; com o
MCP, 1,2 a 1,4 e ~1.000 a 1.200. Cada chamada relê o contexto inteiro da sessão.

Os três conduzem um Chromium pelo snapshot com refs (`e12`; no `agent-browser`, o comando usa `@e12`). Uma
sessão usa **um** driver do começo ao fim: não troque no meio.

As tools do MCP chegam com o prefixo do servidor (`mcp__playwright__browser_*` ou parecido); os nomes
abaixo são o sufixo.

---

## Configuração recomendada

### `agent-browser` — preferido

Headless por padrão, com o Chromium que ele instala. A versão mínima é a **0.39** — a primeira com viewport
aplicado e sessões paralelas isoladas. Instale uma vez:

```bash
npm install -g agent-browser && agent-browser install
```

Sonda: `agent-browser --version`. Use **uma sessão por charter** — `--session CH-NN` (ou
`--session retest` no reteste) em **todo** comando: a sessão é o browser. Nada de estado em disco: não use
`--profile`, `--restore`, `--state`, `--auto-connect`, `state save` nem `auth save` — cada sessão entra de novo
([Login](#login)). Para ler a tela, `snapshot -i` (só o que a persona pode tocar); o texto em volta, com
`snapshot -i -c` ou `snapshot -s "<css>"` no trecho.

Em lote, outras sessões rodam ao lado da sua. Mexa só na sua: nunca `close --all`, nem comando com o
`--session` de outro charter.

**Uma chamada por vez na sua sessão.** O `agent-browser` atende cada sessão por um processo só, e duas
chamadas do Bash em paralelo no mesmo `--session` travam as duas. Nada de duas tools de browser na mesma
mensagem: encadeie com `&&` ou use `batch`.

O `network route` só aborta a requisição ou responde com um corpo fixo — **não atrasa resposta**. Charter que
precisa de resposta lenta (o tour Network com requisição longa, um edge case de timeout) declara outro driver
no plano (`driver: cli` ou `mcp`, com `page.route` e um atraso no `run-code` / `browser_run_code_unsafe`) e roda
fora de lote; sem esse driver, o caso vai a Fora da cobertura.

### Playwright MCP — último fallback, headless e isolado

O Playwright MCP abre o browser **visível** por padrão: cada charter abre e fecha uma janela do Chrome na
tela do Dev, roubando o foco enquanto ele trabalha. Registre o servidor **headless e isolado**:

```bash
claude mcp add playwright -s user -- npx @playwright/mcp@latest --headless --isolated
```

Ou, no `.mcp.json` / settings:

```json
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--headless", "--isolated"]
}
```

| Flag         | Efeito                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| `--headless` | nenhuma janela abre; snapshot, screenshot, `browser_resize`, `browser_evaluate`, console e rede funcionam igual |
| `--isolated` | perfil só em memória: cada sessão começa sem login e nada vai a disco — o que o [Login](#login) já exige        |

A variável `PLAYWRIGHT_MCP_HEADLESS=1` tem o mesmo efeito que `--headless`. Sem a flag (headed) só faz
sentido quando o Dev quer **acompanhar a sessão ao vivo** — para depurar um charter, por exemplo.

A configuração é do servidor MCP, não da sessão: você não liga nem desliga headless por tool. Se a janela
abrir, diga ao Dev como trocar a configuração e siga — headed não bloqueia a execução.

### `playwright-cli` — primeiro fallback

Headless e com perfil em memória **por padrão** — não precisa de flag. Instale uma vez:

```bash
npm install -g @playwright/cli@latest
```

Sonda: `playwright-cli --version`. Use **uma sessão nomeada por charter** — `-s=CH-NN` (ou
`-s=retest` no reteste) em **todo** comando: a sessão é o browser, e o nome evita cair no browser de outra
execução. Não use `--persistent` nem `--profile`: o perfil não vai a disco.

Em lote, outras sessões rodam ao lado da sua. Mexa só na sua: nunca `close-all` nem `kill-all`, nem comando
com o `-s` de outro charter.

---

## Os comandos

| Para                               | `agent-browser --session CH-NN …`                        | `mcp` — tool                            | `cli` — `playwright-cli -s=CH-NN …`                                                                     |
| ---------------------------------- | -------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Abrir uma URL                      | `open <url>`                                             | `browser_navigate`                      | `open <url>` na primeira vez, depois `goto <url>`                                                       |
| Voltar                             | `back`                                                   | `browser_navigate_back`                 | `go-back`                                                                                               |
| Recarregar                         | `reload`                                                 | `browser_navigate` na mesma URL         | `reload`                                                                                                |
| Ler a tela                         | `snapshot -i` (trecho: `snapshot -i -s "<css>"`)         | `browser_snapshot`                      | `snapshot` (ou `snapshot <ref>` para um trecho)                                                         |
| Clicar, duplo clique               | `click @e12` · `dblclick @e12`                           | `browser_click` (`doubleClick: true`)   | `click <ref>` · `dblclick <ref>`                                                                        |
| Digitar num campo                  | `fill @e12 "<texto>"` · `type @e12 "<texto>"`            | `browser_type`                          | `fill <ref> "<texto>"` · `type "<texto>"`                                                               |
| Preencher vários campos            | `batch "fill @e5 …" "fill @e6 …"`                        | `browser_fill_form`                     | um `fill` por campo, encadeados                                                                         |
| Escolher opção                     | `select @e12 "<valor>"`                                  | `browser_select_option`                 | `select <ref> "<valor>"`                                                                                |
| Marcar / desmarcar                 | `check @e12` · `uncheck @e12`                            | `browser_click`                         | `check <ref>` · `uncheck <ref>`                                                                         |
| Tecla (Tab, Enter, Esc)            | `press <tecla>`                                          | `browser_press_key`                     | `press <tecla>`                                                                                         |
| Passar o mouse                     | `hover @e12`                                             | `browser_hover`                         | `hover <ref>`                                                                                           |
| Enviar arquivo                     | `upload @e12 <arquivo>`                                  | `browser_file_upload`                   | `upload <arquivo>`                                                                                      |
| Confirmar ou recusar diálogo       | `dialog accept` · `dialog dismiss`                       | `browser_handle_dialog`                 | `dialog-accept` · `dialog-dismiss`                                                                      |
| Esperar um texto aparecer ou sumir | `wait --text "<texto>"` · sumir: `wait --fn "<expressão>"` | `browser_wait_for`                    | `run-code "async page => await page.getByText('<texto>').waitFor()"` (`{ state: 'hidden' }` para sumir) |
| Abas                               | `tab list` · `tab new <url>` · `tab <n>` · `tab close`   | `browser_tabs`                          | `tab-list` · `tab-new <url>` · `tab-select <n>` · `tab-close <n>`                                       |
| Viewport                           | `set viewport <largura> <altura>`                        | `browser_resize`                        | `resize <largura> <altura>`                                                                             |
| Tema                               | `set media dark` · `set media light`                     | `browser_emulate_media` `colorScheme`   | `set-color-scheme dark` · `clear-color-scheme`                                                          |
| Movimento reduzido                 | `set media <tema> reduced-motion`                        | `browser_emulate_media` `reducedMotion` | `set-reduced-motion reduce` · `clear-reduced-motion`                                                    |
| Screenshot                         | `screenshot <caminho>` · `screenshot @e12 <caminho>`     | `browser_take_screenshot`               | `screenshot [ref] --filename=<caminho>`                                                                 |
| Console                            | `console` · `errors`                                     | `browser_console_messages`              | `console [nível]`                                                                                       |
| Rede                               | `network requests --filter <rota>`                       | `browser_network_requests`              | `requests` · `request <n>`                                                                              |
| Ler valor da página                | `get value @e12` · `get styles @e12` · `eval "<expressão>"` | `browser_evaluate`                   | `eval "<expressão>"` · `eval "el => …" <ref>`                                                           |
| Rede offline                       | `set offline on` · `set offline off`                     | ver [Rede offline](#rede-offline)       | ver [Rede offline](#rede-offline)                                                                       |
| Fechar                             | `close`                                                  | `browser_close`                         | `close`                                                                                                 |

## O ciclo

**Navegar → snapshot → interagir → snapshot → conferir.**

1. As refs do snapshot (`e12`) **envelhecem** a cada navegação ou mudança de DOM — tire outro snapshot antes
   de usar uma ref de novo
2. Espere por **estado observável** — o texto que prova o resultado: `wait --text "<texto>"`, `wait --url
   <padrão>`, `wait --load networkidle` no `agent-browser`; `browser_wait_for` no MCP. Espera fixa (`wait <ms>`,
   `waitForTimeout`, `sleep`) só para provocar o caso (requisição longa, sessão ociosa), nunca para "dar tempo":
   ela atrasa a sessão inteira e não prova nada
3. "A página não quebrou" não é resultado. Confira o efeito que a persona esperava: o registro na lista, o
   valor salvo depois de recarregar, a mensagem com o conteúdo certo

**Nas CLIs, encadeie numa chamada só do Bash** a ação e a leitura que a segue — cada chamada é uma volta ao
modelo, e cada volta relê o contexto inteiro da sessão:

```bash
agent-browser --session CH-03 click @e12 && agent-browser --session CH-03 snapshot -i
playwright-cli -s=CH-03 click e12 && playwright-cli -s=CH-03 snapshot
```

No `playwright-cli`, o `snapshot` pode devolver o caminho de um arquivo em vez da árvore: leia o arquivo na
mesma volta (`… snapshot && cat <arquivo>`) ou busque nele o que precisa — e não deixe esses arquivos no
`qa_dir`.

Passos sem decisão no meio — preencher um formulário que você já leu, voltar ao ponto de partida do charter
— também vão numa volta só, com a leitura no fim: no `agent-browser`,
`batch "fill @e5 …" "fill @e6 …" "click @e9" "snapshot -i"`; no `playwright-cli`,
`fill e5 "…" && fill e6 "…" && click e9 && snapshot`. O que pede uma volta própria é a decisão de
exploração: o que tentar agora, a partir do que a tela mostrou.

Script de vários passos (`run-code`, `browser_run_code_unsafe`, `eval` que clica e preenche) não é atalho de
condução: ele esconde da sessão o que a persona veria entre um passo e outro, e costuma vir com espera fixa.
Use o `batch` ou o encadeamento acima; script só para o que o driver não tem comando (interceptar com atraso,
ler um valor computado).

**Com `mcp`**, as versões atuais devolvem, depois de cada ação, só o link do snapshot
(`[Snapshot](….yml)`), não a árvore. Não leia o arquivo inteiro a cada passo: para conferir um trecho,
`browser_snapshot` com `target` na região, ou um `grep` no arquivo pelo que procura. Formulário inteiro de
uma vez: `browser_fill_form`.

## Snapshot

O snapshot é a árvore de acessibilidade: papel, nome acessível, estado. É como a tecnologia assistiva vê a
tela, e é a fonte da checagem de acessibilidade em [cfr.md](cfr.md#2-acessibilidade--checagem-rápida-wcag-21-aa).
Botão sem nome, campo sem rótulo, toast que não aparece como `alert`/`status` — está no snapshot.

O snapshot não mostra cor, tamanho nem posição: para isso, screenshot e valores computados.

## O ambiente do briefing

O campo `ambiente` do briefing traz as regras do ambiente local que valem para a sessão inteira — e você não
lê as instruções do projeto (o `CLAUDE.md`), então é só por ele que elas chegam. Aplique **antes** do primeiro
`open`:

| O que o `ambiente` diz                       | `agent-browser`                                   | `mcp` / `cli`                                                                 |
| -------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| Hosts que não podem receber requisição       | `network route "<padrão>" --abort`, um por padrão | `page.route('<padrão>', r => r.abort())` pelo `browser_run_code_unsafe` / `run-code` |
| Viewport alvo                                | `set viewport <largura> <altura>`                 | `browser_resize` · `resize`                                                   |
| Caixa de e-mail de dev (código, confirmação) | `tab new <url da caixa>` na mesma sessão          | `browser_tabs` · `tab-new`                                                    |
| O que nunca fazer (pagar, digitar cartão…)   | vale como regra do charter                        | idem                                                                          |

A rota vale para a sessão toda, inclusive a navegação. Padrão por **caminho** quando o host é compartilhado
(`**/g/collect*`, e não o domínio inteiro do serviço de métricas). Sem o campo, o ambiente não tem restrição
declarada: siga o charter e não invente bloqueio. Requisição a um host proibido que escapou (a rota caiu, um
host novo apareceu) é achado de ambiente: anote no log com o trecho de rede e siga sem repetir a ação.

## Login

1. **Comece de estado limpo.** Numa sessão nova do `agent-browser` ou da `cli`, sem perfil, ou com `--isolated`
   no MCP, já começa. Sem
   isso, o MCP pode abrir com perfil persistente: se o app já abre logado, saia antes de entrar como a
   persona do charter
2. **Leia a credencial pela referência** que o briefing trouxe — a variável de ambiente
   (`QA_<CONTA>_USUARIO`, `QA_<CONTA>_SENHA` — [contrato](../shared/contrato-qa.md)), a conta de teste documentada. Nunca peça o valor no chat
3. Digite e confira pelo snapshot que entrou como a persona certa. Nas CLIs, passe a **variável**, não o
   valor — o shell expande e o segredo não passa pelo contexto:
   `agent-browser --session CH-03 fill @e5 "$QA_ADMIN_SENHA"`. Nunca `echo` nem `printenv` da variável
4. **O segredo não sai da tela de login:** não vai ao log, à screenshot (nada de screenshot com senha
   visível), nem a trecho de rede ou console
5. **Nunca salve estado de login em disco** — `storageState`, `state-save`, `state save`, `auth save`,
   `--restore`, cookies, `auth.json`, nada.
   `qa_dir` pode ser versionado. Cada sessão entra de novo
6. Referência que não resolve ⇒ sessão `blocked` por `credencial`, e encerre

## Screenshot

Sempre com nome explícito: `browser_take_screenshot` com `filename`, ou `screenshot --filename=`. Nome
relativo resolve contra a raiz do workspace — passe o caminho com o `qa_dir`: `<qa_dir>/screenshots/<nome>.png`.

| Uso                | Nome                          | Exemplo                      |
| ------------------ | ----------------------------- | ---------------------------- |
| Passo de sessão    | `CH-NN-<passo>.png`           | `CH-03-07.png`               |
| Com contexto       | `CH-NN-<passo>-<slug>.png`    | `CH-03-07-erro-cep.png`      |
| Outro viewport     | `CH-NN-<passo>-<largura>.png` | `CH-05-02-375.png`           |
| Reteste            | `retest-BUG-NNN.png`          | `retest-BUG-012.png`         |
| Entorno do reteste | `retest-BUG-NNN-<slug>.png`   | `retest-BUG-012-entorno.png` |

`<passo>` é o número do passo no log, com dois dígitos. Tire screenshot **nos pontos que provam**: o
objetivo alcançado, o erro, o estado errado — não de cada clique. **Não leia a screenshot de volta**: cada
imagem relida entra inteira no contexto e fica lá até o fim da sessão. Ela é evidência para quem lê o log;
o que você precisa saber da tela está no snapshot. Exceção: o `design-check`, que compara a imagem com o
protótipo. Página inteira para layout — `fullPage:
true` no MCP; `screenshot --full <caminho>` no `agent-browser`; na `cli`,
`run-code "async page => await page.screenshot({ path: '<caminho>', fullPage: true })"`. Screenshot do
elemento (`target` no MCP, `screenshot @e12 <caminho>` no `agent-browser`, `screenshot <ref>` na `cli`) para
detalhe de design.

## Viewport

| Nome    | Tamanho    |
| ------- | ---------- |
| desktop | 1280 × 800 |
| tablet  | 768 × 1024 |
| mobile  | 375 × 812  |

Quando o `ambiente` do briefing fixa o viewport alvo do projeto (ex.: `390 × 844`), ele vence esta tabela.
Comece no viewport que a persona usa. Troque de viewport com a tela já carregada e tire snapshot de novo —
layout responsivo muda a árvore.

## Valores computados

`browser_evaluate` / `eval` leem o que a tela não diz no snapshot — **só quando o charter pede** (cor e
contraste no `cfr`, propriedades no `design-check`, performance no `cfr`). Fora disso, a persona não vê
estilo computado nem atributo, e você não precisa dele:

- **estilo** — `getComputedStyle(el)`: `color`, `background-color`, `font-family`, `font-size`, `font-weight`,
  `line-height`, `padding`, `margin`, `border-radius`, `width`, `height`
- **performance** — `performance.getEntriesByType('paint')` e `('navigation')`
- **atributos** — `autocomplete`, `aria-*`, `alt`

No charter de CFR com o `agent-browser`, `a11y` roda a auditoria axe-core da página e `vitals` traz LCP,
CLS e INP — uma chamada cada, no lugar de várias leituras com `eval`. Confira o que eles apontam na tela antes
de registrar: a auditoria acha a violação, quem decide o impacto na persona é você.

Só leitura: nunca altere o DOM, o storage ou os cookies da página, nem leia token ou cookie de sessão.
Uma leitura por pergunta — script que varre a página inteira, ou dezenas de combinações num laço, é
automação, e está fora desta skill.

## Rede offline

No `agent-browser`, `set offline on` e depois `set offline off`. Nos outros dois,
`page.context().setOffline(true)` e depois `false`: no MCP, pela `browser_run_code_unsafe` (quando habilitada
na sessão); na `cli`, pelo `run-code`. Nenhum dos três tem throttling nativo.
Sem como rodar, o tour Network e os edge cases de rede vão para Fora da cobertura.

## Evidência de console e rede

- Console com nível `error` depois de cada passo que falhou — `errors` no `agent-browser`,
  `browser_console_messages` ou `console error`
- A requisição que falhou, com método e status — `network requests --filter <rota>` no `agent-browser`,
  `browser_network_requests` com `filter` na rota da API, ou `requests` e `request <n>`
- Vai ao log como **trecho**: `POST /api/orders → 500`, a mensagem de erro do console. Corte query string,
  header, corpo com token ou dado pessoal
- Não grave arquivo de rede ou console em disco: você escreve só o log (ou o `retest.md`) e as screenshots

## Ao fim

Feche as abas que abriu e o browser — `agent-browser --session CH-NN close`, `playwright-cli -s=CH-NN close`
ou `browser_close`. Se a sessão foi
interrompida, feche assim mesmo antes de devolver o relatório: a próxima sessão abre o browser limpo.
