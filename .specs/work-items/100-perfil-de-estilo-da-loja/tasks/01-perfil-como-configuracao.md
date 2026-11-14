## 01 · [packages/core, packages/supabase, apps/store] O perfil como configuração da loja (módulo `core/appearance`, tipo, default e canal da prévia)

**Status:** done

`UC-01 · UC-02 · UC-03 (contrato) · RN-07 · CA-06` — 100

**Objetivo.** o perfil de estilo passa a existir como configuração `appearance` normalizada em `core`, legível pela loja, pelo painel e pela função `api/page`, com o canal da prévia pronto.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; `packages/core/CLAUDE.md` › Quando pertence · Pureza · Os módulos · `announcements` · Convenções de tipo; `apps/store/CLAUDE.md` › Modo prévia. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §5 · spec.md — Código (e §8 Decisões, C1, R10, H6, H7, H8). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Habilita.** a 02 importa `StyleProfile` por `import type`; a 04 usa `styleProfileOf`, `STYLE_PROFILE_ATTRIBUTE` e `appearance` em `DEFAULTS`/tipos; a 05 usa o atributo, o normalizador, o hook e o canal; a 07 usa o hook, a cópia do card e o canal.

### Critérios de aceite

**UC-01 · Ligar o perfil Black Friday**
- Em **Configurações**, um card "Perfil de estilo da loja" com duas opções (Padrão, Black Friday), cada uma com uma
  amostra das cores, e "Salvar".
- Salvo, a próxima página que a cliente abrir já vem com o perfil (RN-04); quem já está com a loja aberta passa a ver o
  perfil novo em alguns minutos, ao trocar de página.
- O card diz o que muda ("só as cores; textos, blocos e preços continuam") e quanto tempo leva para todos verem.

**UC-02 · Voltar ao Padrão**
- A mesma chave. Nenhum dado se perde: o perfil não apaga nem regrava conteúdo.

- **RN-07 · Configuração com valor desconhecido ⇒ Padrão**, sem erro (molde de `featuredDisplay`).

- **CA-06** Valor desconhecido gravado na configuração ⇒ a loja abre no Padrão.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `packages/core/src/appearance/` (`types.ts`, `normalize.ts`, `preview.ts`, `copy.ts`, `index.ts`, `__tests__/`) | VOCÊ CRIA | — | o contrato C1 do `spec.md` › Decisões, exatamente com aqueles nomes |
| `@estrelinha/core/appearance` (alias de import / `exports` do pacote) | VOCÊ CRIA | — | o barrel acima, alcançável como os outros módulos de `core` |
| o hook de leitura do perfil salvo em `packages/core/src/hooks/` (ex.: `useStyleProfile`) | VOCÊ CRIA | `useStoreSettings` | `{ profile: StyleProfile, isLoading }` normalizado |
| `packages/core/src/hooks/useStoreSettings.ts › DEFAULTS` | JÁ EXISTE. Acrescente `appearance: DEFAULT_APPEARANCE` | — | — |
| `packages/supabase/src/types/settings.ts › SettingsKey / SettingsMap` | JÁ EXISTE. Acrescente `'appearance'`, reexportando o tipo e o default de `core` (molde de `:24-35`) | — | — |
| `store_settings` linha `key='appearance'`, `value={ profile }` | JÁ EXISTE a tabela; a chave nasce sem migration | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- C1 (o contrato) e R10 do `spec.md` › Decisões, verbatim lá: sem migration; ausente = Padrão; desconhecido, nulo, de outro tipo ⇒ `padrao`.
- H6: o atributo é `data-perfil`, valores `padrao` e `black-friday`.
- H7: o texto do aviso do card é: "Depois de salvar, quem abrir a loja já vê o perfil novo nas páginas de produto e de categoria em até 5 minutos, e nas outras páginas em até 1 hora. Quem já está com a loja aberta vê ao trocar de página."
- H8: a mensagem de sucesso do card é: "Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora."
- A cópia do card (para `copy.ts`): título "Perfil de estilo da loja"; descrição "Muda só as cores da loja. Textos, blocos da Home, preços e menu continuam iguais, e voltar ao Padrão é a mesma escolha."; "Padrão" — "Ardósia e ouro, a cara de sempre da loja."; "Black Friday" — "Preto e ouro, para a campanha."; "Em uso"; "Ver a loja com este perfil"; "Salvar"; título do modal "A loja com o perfil {nome}"; subtítulo "Prévia, sem salvar. A loja publicada não muda."; "Fechar"; rótulo acessível do grupo "Perfil de estilo".

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| tipo + default + normalizador de chave sem migration | `packages/core/src/buy-together/settings.ts:13-36 — DEFAULT_BUY_TOGETHER_FORM / normalizeBuyTogetherForm` |
| recuo para valor desconhecido | `packages/core/src/home/featured.ts › featuredDisplay` |
| canal da prévia | `packages/core/src/announcements/preview.ts` (todo) |
| pureza com âncora | `packages/core/src/announcements/__tests__/purity.test.ts` |
| reexportação do tipo pelo pacote de tipos | `packages/supabase/src/types/settings.ts:24-35` |
| guarda sem migration | `apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts:577-619` (o `describe` do Compre Junto) |

Abra o arquivo antes de escrever o seu.

### Testes

- Unidade: `normalizeAppearance`/`styleProfileOf` — ausente, `null`, string, número, objeto sem `profile`, `profile` desconhecido ⇒ `padrao`; `padrao` e `black-friday` passam.
- Unidade: o canal — a mensagem `draft` com perfil válido é aceita; carimbo de outro canal (o da faixa, o da home) é recusado; perfil desconhecido é recusado (ou normalizado — escolha e registre); `ready` é aceito.
- Unidade: pureza do módulo — todo especificador relativo com `.ts` (inclusive `import type`), sem React/Supabase/Deno/alias, com âncora de contagem de arquivos.
- Unidade: o hook devolve o perfil normalizado e `padrao` sem a chave.
- Guarda (suíte da loja, `storeSettingsDefaults.test.ts`): o default de `appearance` é o de `core` (`toBe`) e nenhuma migration grava `'appearance'`.

Escrever estes testes é parte da tarefa.

### Obrigações

- `packages/core/src/appearance/**` é alcançado pela função `api/page` (esbuild fora do Vite): `.ts` explícito em todo especificador relativo, `import type` incluso (`CLAUDE.md` › Alias de import). Sem React, Supabase ou alias.
- `strictNullChecks: false`: o parse devolve `Mensagem | null`, nunca `{ ok: boolean }`.
- `packages/` não passa por ESLint (`BL-002`): só `tsc -p packages/core/tsconfig.json` (baseline 11 herdados) e teste.
- O guarda de dono único de chave que recusa string: descreva a forma proibida em comentário, não a escreva.

### Não faça

- Não toque em `packages/ui/**` (tokens e marca: tarefas 02 e 03), em `packages/core/src/page/**` e `apps/store/server/**` (tarefa 04), em `apps/store/src/app/**` e `widgets/announcement-bar/**` (tarefa 05), em `apps/backoffice/**` (tarefa 07).
- Não escreva migration.
- Não ligue o perfil ao calendário da campanha (WI 102) — fora do escopo.

### Pronto quando

- [ ] `normalizeAppearance(qualquer coisa desconhecida)` devolve `{ profile: 'padrao' }` e o teste prova
- [ ] `appearance` está em `DEFAULTS` e em `SettingsMap`, e `storeSettingsDefaults.test.ts` prova a ausência de migration
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (`CLAUDE.md` › Comandos e `.specs/project/PROJECT.md` › Comandos de verificação): o `tsc` de cada projeto tocado sem erro novo contra a baseline e a suíte do workspace tocado

---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
