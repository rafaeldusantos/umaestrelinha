# Browser — Playwright para QA manual

O driver da Fase 2 é um browser real que você conduz pelo snapshot de acessibilidade, por um de dois
caminhos — a orquestração escolhe na sonda e passa no briefing (`driver`):

| `driver` | O que é                                          | Quando                                                                       |
| -------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| `mcp`    | **Playwright MCP**, headless — tools `browser_*` | **preferido**: cada ação já devolve o estado da tela, menos voltas ao modelo |
| `cli`    | **`playwright-cli`** pelo Bash                   | **fallback**: o MCP não está na sessão                                       |

Os dois usam o mesmo motor do Playwright e o mesmo snapshot com refs (`e12`). Uma sessão usa **um**
driver do começo ao fim: não troque no meio.

As tools do MCP chegam com o prefixo do servidor (`mcp__playwright__browser_*` ou parecido); os nomes
abaixo são o sufixo.

---

## Configuração recomendada

### Playwright MCP — headless e isolado

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

### `playwright-cli` — fallback

Headless e com perfil em memória **por padrão** — não precisa de flag. Instale uma vez:

```bash
npm install -g @playwright/cli@latest
```

Sonda: `playwright-cli --version`. Use **uma sessão nomeada por charter** — `-s=CH-NN` (ou
`-s=retest` no reteste) em **todo** comando: a sessão é o browser, e o nome evita cair no browser de outra
execução. Não use `--persistent` nem `--profile`: o perfil não vai a disco.

---

## Os comandos

| Para                               | `mcp` — tool                            | `cli` — `playwright-cli -s=CH-NN …`                                                                     |
| ---------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Abrir uma URL                      | `browser_navigate`                      | `open <url>` na primeira vez, depois `goto <url>`                                                       |
| Voltar                             | `browser_navigate_back`                 | `go-back`                                                                                               |
| Recarregar                         | `browser_navigate` na mesma URL         | `reload`                                                                                                |
| Ler a tela                         | `browser_snapshot`                      | `snapshot` (ou `snapshot <ref>` para um trecho)                                                         |
| Clicar, duplo clique               | `browser_click` (`doubleClick: true`)   | `click <ref>` · `dblclick <ref>`                                                                        |
| Digitar num campo                  | `browser_type`                          | `fill <ref> "<texto>"` · `type "<texto>"`                                                               |
| Preencher vários campos            | `browser_fill_form`                     | um `fill` por campo, encadeados                                                                         |
| Escolher opção                     | `browser_select_option`                 | `select <ref> "<valor>"`                                                                                |
| Marcar / desmarcar                 | `browser_click`                         | `check <ref>` · `uncheck <ref>`                                                                         |
| Tecla (Tab, Enter, Esc)            | `browser_press_key`                     | `press <tecla>`                                                                                         |
| Passar o mouse                     | `browser_hover`                         | `hover <ref>`                                                                                           |
| Enviar arquivo                     | `browser_file_upload`                   | `upload <arquivo>`                                                                                      |
| Confirmar ou recusar diálogo       | `browser_handle_dialog`                 | `dialog-accept` · `dialog-dismiss`                                                                      |
| Esperar um texto aparecer ou sumir | `browser_wait_for`                      | `run-code "async page => await page.getByText('<texto>').waitFor()"` (`{ state: 'hidden' }` para sumir) |
| Abas                               | `browser_tabs`                          | `tab-list` · `tab-new <url>` · `tab-select <n>` · `tab-close <n>`                                       |
| Viewport                           | `browser_resize`                        | `resize <largura> <altura>`                                                                             |
| Tema                               | `browser_emulate_media` `colorScheme`   | `set-color-scheme dark` · `clear-color-scheme`                                                          |
| Movimento reduzido                 | `browser_emulate_media` `reducedMotion` | `set-reduced-motion reduce` · `clear-reduced-motion`                                                    |
| Screenshot                         | `browser_take_screenshot`               | `screenshot [ref] --filename=<caminho>`                                                                 |
| Console                            | `browser_console_messages`              | `console [nível]`                                                                                       |
| Rede                               | `browser_network_requests`              | `requests` · `request <n>`                                                                              |
| Ler valor da página                | `browser_evaluate`                      | `eval "<expressão>"` · `eval "el => …" <ref>`                                                           |
| Fechar                             | `browser_close`                         | `close`                                                                                                 |

## O ciclo

**Navegar → snapshot → interagir → snapshot → conferir.**

1. As refs do snapshot (`e12`) **envelhecem** a cada navegação ou mudança de DOM — tire outro snapshot antes
   de usar uma ref de novo
2. Espere por **estado observável** — o texto que prova o resultado. Espera fixa só para provocar o caso
   (requisição longa, sessão ociosa), nunca para "dar tempo"
3. "A página não quebrou" não é resultado. Confira o efeito que a persona esperava: o registro na lista, o
   valor salvo depois de recarregar, a mensagem com o conteúdo certo

**Com `cli`, encadeie numa chamada só do Bash** a ação e a leitura que a segue — cada chamada é uma volta ao
modelo, e é aí que a CLI perde tempo para o MCP:

```bash
playwright-cli -s=CH-03 click e12 && playwright-cli -s=CH-03 snapshot
```

Se o `snapshot` devolver o caminho de um arquivo em vez da árvore, leia o arquivo na mesma volta
(`… snapshot && cat <arquivo>`) ou busque nele o que precisa — e não deixe esses arquivos no `qa_dir`.

## Snapshot

O snapshot é a árvore de acessibilidade: papel, nome acessível, estado. É como a tecnologia assistiva vê a
tela, e é a fonte da checagem de acessibilidade em [cfr.md](cfr.md#2-acessibilidade--checagem-rápida-wcag-21-aa).
Botão sem nome, campo sem rótulo, toast que não aparece como `alert`/`status` — está no snapshot.

O snapshot não mostra cor, tamanho nem posição: para isso, screenshot e valores computados.

## Login

1. **Comece de estado limpo.** Com `--isolated` no MCP, ou com a `cli` sem `--persistent`, já começa. Sem
   isso, o MCP pode abrir com perfil persistente: se o app já abre logado, saia antes de entrar como a
   persona do charter
2. **Leia a credencial pela referência** que o briefing trouxe — a variável de ambiente
   (`QA_<CONTA>_USUARIO`, `QA_<CONTA>_SENHA` — [contrato](../shared/contrato-qa.md#personas-e-contas)), a conta de teste documentada. Nunca peça o valor no chat
3. Digite e confira pelo snapshot que entrou como a persona certa. Com `cli`, passe a **variável**, não o
   valor — o shell expande e o segredo não passa pelo contexto:
   `playwright-cli -s=CH-03 fill e5 "$QA_ADMIN_SENHA"`. Nunca `echo` nem `printenv` da variável
4. **O segredo não sai da tela de login:** não vai ao log, à screenshot (nada de screenshot com senha
   visível), nem a trecho de rede ou console
5. **Nunca salve estado de login em disco** — `storageState`, `state-save`, cookies, `auth.json`, nada.
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
true` no MCP; na `cli`, `run-code "async page => await page.screenshot({ path: '<caminho>', fullPage: true })"`.
Screenshot do elemento (`target` no MCP, `screenshot <ref>` na `cli`) para detalhe de design.

## Viewport

| Nome    | Tamanho    |
| ------- | ---------- |
| desktop | 1280 × 800 |
| tablet  | 768 × 1024 |
| mobile  | 375 × 812  |

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

Só leitura: nunca altere o DOM, o storage ou os cookies da página, nem leia token ou cookie de sessão.
Uma leitura por pergunta — script que varre a página inteira, ou dezenas de combinações num laço, é
automação, e está fora desta skill.

## Rede offline

Nenhum dos dois tem throttling nativo. Para cortar a conexão, `page.context().setOffline(true)` e depois
`false`: no MCP, pela `browser_run_code_unsafe` (quando habilitada na sessão); na `cli`, pelo `run-code`.
Sem como rodar, o tour Network e os edge cases de rede vão para Fora da cobertura.

## Evidência de console e rede

- Console com nível `error` depois de cada passo que falhou — `browser_console_messages` ou `console error`
- A requisição que falhou, com método e status — `browser_network_requests` com `filter` na rota da API,
  ou `requests` e `request <n>`
- Vai ao log como **trecho**: `POST /api/orders → 500`, a mensagem de erro do console. Corte query string,
  header, corpo com token ou dado pessoal
- Não grave arquivo de rede ou console em disco: você escreve só o log (ou o `retest.md`) e as screenshots

## Ao fim

Feche as abas que abriu e o browser — `browser_close`, ou `playwright-cli -s=CH-NN close`. Se a sessão foi
interrompida, feche assim mesmo antes de devolver o relatório: a próxima sessão abre o browser limpo.
