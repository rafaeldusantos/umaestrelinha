# pd-sync — o canal com o ProductDock

Lido **só** quando o backend é `productdock` ([backend.md](../setup/backend.md#detecção)). Aqui o projeto
**só opera com o ProductDock alcançável**. O canal é a **CLI `productdock`**, invocada como processo externo
com `--json`. Sem sessão de CLI a skill **bloqueia** e conduz o bootstrap — **não** cai no MCP como plano B,
**não** cai para o backend `local` e **não** simula localmente.

Só a thread principal roda `productdock`. Nenhum subagent fala com a plataforma nem lê esta pasta.

O que cada operação do QA faz aqui, com o comando exato, está em [qa.md](qa.md).

---

## Sonda de canal

Uma vez por sessão, antes de qualquer fase (`canal.sondar`):

```bash
productdock wi list --json
```

**`command not found` não conclui a sonda.** Tente a segunda forma antes de declarar "não instalada":

```bash
npx @softdesignbrasil/productdock-cli wi list --json
```

A forma que respondeu é **a invocação desta sessão** — use-a em todas as chamadas seguintes e diga ao
humano qual foi.

| O que volta                                                   | Leitura                                       | O que a skill faz                    |
| ------------------------------------------------------------- | --------------------------------------------- | ------------------------------------ |
| exit `0` + `{"ok":true,…}`                                    | **CLI usável**                                | opera                                |
| `command not found` **nas duas formas**                       | **CLI não instalada**                         | **bloqueia** — bootstrap completo    |
| exit `2`                                                      | **sem sessão** (ou refresh token recusado)    | **bloqueia** — `productdock login`   |
| exit `1` cuja `error.message` manda rodar `productdock link`  | **diretório não linkado**                     | **bloqueia** — `productdock link`    |
| exit `1` por outro motivo                                     | canal ok, erro de negócio                     | ler `error.message`, não é de canal  |

Tools do ProductDock por MCP presentes na sessão **não** autorizam prosseguir. Bloqueado, não grave
artefato "para sincronizar depois".

Mensagens de bloqueio:

- **Sem sessão:** _"Sem sessão da CLI do ProductDock. Esta skill exige a CLI autenticada. Rode
  `productdock login` e me avise — não vou prosseguir localmente."_
- **Sem a CLI:** _"CLI do ProductDock não encontrada — nem como `productdock`, nem por
  `npx @softdesignbrasil/productdock-cli`. Vamos instalá-la e autenticar."_
- **Não linkado:** _"Este diretório não está ligado a um projeto do ProductDock. Rode `productdock link` —
  eu não peço UUID nem escolho projeto por você."_

## Sonda de versões

Skill e agents desatualizados. Uma vez por sessão, **depois** da sonda de canal e só com a CLI usável.
**Nunca bloqueia**: uma versão antiga continua funcionando; a sonda só avisa.

```bash
productdock skill status --json
productdock agent status --json
```

Interessam **só** a `pd-qa-validation` e os agents do catálogo dela — `pd-qa-planner`, `pd-qa-explorer`,
`pd-qa-retester`, `pd-qa-triager`. Outras skills e agents do projeto ficam fora do aviso, mesmo
desatualizados.

| O que volta                                                              | O que a skill faz                                                            |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| item desta skill ou de um agent dela com `state: "outdated"`             | **Avisa numa linha** e segue (mensagem abaixo)                               |
| todos os itens que interessam em `up-to-date`                            | Nada a dizer — segue calada                                                  |
| `modified`, `other-branch`, `missing` ou `unknown`                       | Segue calada — não é atualização; `missing` já é da sonda de agents          |
| a skill ou o agent **ausente** da lista                                  | Segue calada: foi instalado pelo `ai-tools` (canal legado), sem registro no `productdock.json` — não há versão para comparar |
| `{"ok":true}` **sem** `items`, exit ≠ `0`, ou qualquer saída que não se leia | Segue calada: CLI antiga, sem rede ou sem sessão. A sonda de canal é quem bloqueia, não esta |

Mensagem, juntando skill e agents numa linha só:

> _"Há versão nova de `pd-qa-validation` (<instalada> → <nova>) e de `pd-qa-planner` (<instalada> → <nova>).
> Para usar: rode `productdock skill update && productdock agent update` e abra uma sessão nova — sigo agora
> com a versão instalada."_

**Não rode o `update` por conta própria.** A skill em execução já foi carregada — atualizar o `SKILL.md` no
meio da sessão não muda nada até a próxima; e o `update` reescreve os agents que esta sessão vai despachar.
O humano decide quando.

## Bootstrap

1. **Instalar** — `npm install -g @softdesignbrasil/productdock-cli` (ou usar via `npx`, Node ≥ 18)
2. **Autenticar** — `productdock login` (abre o navegador; o humano roda, a skill não tem como)
3. **Ligar o diretório** — `productdock link` (escreve `productdock.json` com projeto e repositório)
4. **Conferir** — `productdock doctor` (`--fix` corrige o que der)
5. **Repetir a sonda.** Enquanto ela não devolver exit `0`, a skill segue bloqueada

Os agents do catálogo, quando faltam: `productdock agent install <nome>`, um por agent.

## Escopo de projeto/repositório

Projeto e repositório saem do **`productdock.json`**, lidos pela própria CLI. **Nunca** peça UUID, nunca
leia arquivo de settings para montar o escopo. `--ref` aceita `PREFIXO-N`.

**Artefatos `qa-*` são repo-scoped, e vão no repositório da costura.** Rode a CLI da pasta que tem
`.productdock/work-items/` — a mesma de onde a `pd-workflow` rodou — e **não** passe `--repository-name`: o
`productdock.json` dela é o escopo de `state phase`, `artifact submit` e `wi evidence`, e é o mesmo da
`spec`, do `plan`, das `tasks` e do `qa-report`. Num projeto com repositório guarda-chuva (`<projeto>-pd`,
papel `wrapper`, com as aplicações e os testes como submódulos), o escopo é o **guarda-chuva** — nunca o da
aplicação testada. Um Work Item que toca web e api tem uma linhagem só; o mesmo `BUG-NNN` enviado de dois
repositórios vira duas linhagens que a plataforma não reconcilia, porque o status do bug sai da maior versão
e a versão se conta por repositório.

**Confira no preflight** (`qa.estado`). O `artifacts_found` de `state phase` traz a costura (`spec` ou
`plan`) ou o `qa-report` ⇒ o escopo é o do Dev, siga. Não traz, e `[ITEM_DIR]` tem `spec.md` ou `plan.md` ⇒
a costura foi enviada de outra pasta: **pare** e diga ao humano para rodar a skill de lá — não tente acertar
o escopo com `--repository-name` (`state phase` não o aceita, e ler com um escopo e escrever com outro cria
duas verdades para o mesmo Work Item). Sem costura nenhuma (só PRD), o escopo do diretório vale. Nada se lê
nem se submete com escopo trocado.

## Os comandos

Toda invocação usa `--json`; a resposta útil vem em `.data`. Read-backs com `--out` vão para a
[pasta de envio](#a-pasta-de-envio). `<ref>` é a chave do Work Item.

| Operação | Comando | Fase |
| --- | --- | --- |
| `canal.sondar` | `productdock wi list --json` · `productdock skill status --json` · `productdock agent status --json` | início |
| `item.titulo` | o título do Work Item na resposta de `wi list` | preflight |
| `qa.estado` | `productdock state phase <ref> --json` | preflight |
| `contexto.ler` | `productdock wi prd <ref> --json --out <envio>/prd.json` (só sem `prd.md`) · `productdock wi prototypes <ref> --json --out <envio>/prototypes.json` · `productdock wi attachments <ref> --download <envio>/attachments --json --out <envio>/attachments.json` · `productdock wi bugs <ref> --status open --json --out <envio>/qa-bugs-open.json` | 0 |
| `bugs.todos` | `productdock wi bugs <ref> --status all --json --out <envio>/qa-bugs-all.json` | 3 |
| `plano.registrar` | `productdock artifact submit <QA_DIR>/test-plans/<feature>-test-plan.md --ref <ref> --phase qa --type qa-plan --json` | Gate 1 |
| `evidencia.enviar` | `productdock wi evidence <QA_DIR>/screenshots/<arquivo>.png --ref <ref> --json` — um por arquivo | Gate 3 |
| `resultado.registrar` | `productdock artifact submit <QA_DIR>/qa-result.md --ref <ref> --phase qa --type qa-result --json` | Gate 3 |
| `bug.registrar` | `productdock artifact submit <QA_DIR>/issues/BUG-NNN.md --ref <ref> --phase qa --type qa-issue --json` | Gate 3 |
| `perguntas.registrar` | nenhum | — |
| `temporaria.limpar` | nenhum — apague a pasta de envio | fim do Gate 3 |

Fora do inventário desta skill: `state update`, `wi comment`, `eval *`, `code *`. Os gates do QA não gravam
evento de estado: o `artifact submit` do `qa-plan` e do `qa-result` já é o registro. O Kanban não se move
por aqui — o handoff de QA é manual, na UI.

## Como ler a resposta

Sob `--json` o `stdout` carrega **exatamente um** documento JSON, no sucesso e na falha:

```jsonc
{ "ok": true,  "operation": "submit_artifact", "data": { /* o payload */ } }
{ "ok": false, "error": { "code": 1, "message": "…" } }
```

Corpo de envio vem de **arquivo**, verbatim. Passar o arquivo **e** `--content` é recusado (exit `1`).

## Códigos de saída

Vale para toda chamada desta skill; cada operação em [qa.md](qa.md) diz só o que tem de particular.

| Exit | Significado     | Reação                                                                                          |
| ---- | --------------- | ----------------------------------------------------------------------------------------------- |
| `0`  | sucesso         | seguir. Vazio (`count: 0`, `data: null`) é sucesso: WI sem PRD, sem protótipo, sem bug aberto   |
| `1`  | erro de negócio | **não** é queda de canal. Ler `error.message`, corrigir o parâmetro ou o envelope, repetir uma vez. Persistindo, ao humano |
| `2`  | sem sessão      | **interromper: bloqueia a fase.** Pedir `productdock login`. Nunca repetir pelo MCP, nunca seguir localmente |

## A pasta de envio

É a pasta temporária do backend `productdock`. Read-backs da CLI nascem **fora do repositório**:

- no Claude Code, `<scratchpad>/pd/<ID do WI>/`;
- fora dele, `pd/<ID do WI>/` no diretório temporário do sistema (`$TMPDIR`, `/tmp`, `%TEMP%`).

| Arquivo             | O que é                                         |
| ------------------- | ----------------------------------------------- |
| `prd.json`          | o PRD, quando `[ITEM_DIR]/prd.md` não existe    |
| `prototypes.json`   | os protótipos cadastrados no Work Item          |
| `attachments.json`  | a listagem dos anexos                           |
| `attachments/`      | os anexos baixados                              |
| `qa-bugs-open.json` | os bugs `open` — de onde sai a materialização da Fase 0 |
| `qa-bugs-all.json`  | todos os bugs — de onde sai a materialização antes da triagem |

Crie a pasta antes do primeiro read-back (`mkdir -p`). Apague-a ao fim do Gate 3 com o efeito conferido
(`temporaria.limpar`). A pasta de envio é temporária: sessão nova refaz os read-backs. **Nunca** vai a
`[ITEM_DIR]`.

Os corpos de envio desta skill (`test-plan`, `qa-result.md`, `issues/BUG-NNN.md`) **não** passam por aqui: são
o registro do QA do Work Item e se submetem direto de `[QA_DIR]`. Daqui, só o `prd.json` e a pasta
`attachments/` vão a briefing de subagent, como caminho na lista `fontes`; os protótipos entram como linhas
de `design`, e os bugs, como arquivos em `issues/` ([qa.md](qa.md#contextoler)).
