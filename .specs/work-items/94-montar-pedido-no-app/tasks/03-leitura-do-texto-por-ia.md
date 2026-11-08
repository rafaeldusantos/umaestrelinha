## 03 · [supabase · packages/core] Leitura do texto da conversa por IA (agregado: function `customer-parse`)

**Status:** done

`UC-05 (servidor)` — 94

**Objetivo.** Existe uma function de admin que lê um texto colado e devolve contato e/ou endereço já conferidos, pronta para o app (e, depois, o painel) consumir; a fusão "o CEP manda" existe em `core` para o app aplicar.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Os módulos, › Dinheiro, › customers, › proposals, › Convenções de tipo; `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram, › Edge functions, › order-proposals e o pedido que nasce de uma proposta, › Secrets. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código; §7 · spec.md — Decisões (D-10, D-11). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Habilita.** 06 (a folha "Colar texto" no app consome a function e `mergeCep`).

### Critérios de aceite

### Ler os dados de uma mensagem (IA)
- Folha com a área de texto (até 2.000 caracteres, "O texto não fica guardado.") e **Ler o texto**.
- Escopo: em Cliente nova, lê contato + endereço; em "Outro endereço" de cliente cadastrada, lê **só o
  endereço** — nunca troca dados de uma ficha que existe.
- Durante a leitura: botão "Lendo o texto…" desligado. Depois: a folha fecha, os campos se preenchem e
  cada um diz **"Lido do texto — confira."**; editar o campo tira a marca.
- Aviso no topo: "Preenchi 7 de 11 campos. Confira antes de seguir. Não achei: e-mail, CPF,
  complemento. O CEP conferiu rua, bairro e cidade." com **Ler outro texto** e **Desfazer** (volta
  exatamente ao estado anterior).
- O CEP manda: quando o serviço conhece o CEP, rua/bairro/cidade/UF vêm dele, não do texto.
- Texto sem dados: a folha fica aberta — "Não encontrei nome, contato nem endereço neste texto…" e o
  botão secundário vira **Preencher à mão**.
- Leitura fora do ar (timeout, 5xx, sem chave): "A leitura está fora do ar agora. Feche e preencha à
  mão — nada do que você já fez se perde." A montagem nunca depende da IA.
- Nada é gravado pela leitura: a ficha e o endereço só nascem ao **Criar link**.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| function `customer-parse` (`supabase/functions/customer-parse/{index,handlers}.ts`) | VOCÊ CRIA | `{ text, mode: 'contact_and_address' | 'address' }` | campos lidos e conferidos; 503 `not_configured`; 429 `limited`; 4xx texto acima de 2.000; recusa sem papel |
| `[functions.customer-parse] verify_jwt = false` em `supabase/config.toml` | VOCÊ CRIA |  |  |
| `packages/core/src/customers/parse.ts` | VOCÊ CRIA | saída crua do modelo | campos normalizados (máscaras, dígito do CPF, e-mail); o que não passa vira vazio |
| `packages/core/src/customers/mergeCep.ts` | VOCÊ CRIA (puro) | campos lidos + resposta do serviço de CEP | campos com rua/bairro/cidade/UF do CEP quando ele conhece; do texto quando o serviço não responde |
| `_shared/claudePort.ts › ClaudeJsonRequest` + `createClaudeJson` | JÁ EXISTE. Consuma; não altere |  |  |
| `_shared/rateLimit.ts › createRateLimiter` | JÁ EXISTE. Consuma |  |  |
| validadores `packages/core/src/validators/{cpf,phone,email,cep}.ts` | JÁ EXISTE. Importe pelas folhas, com `.ts` (o barril `index.ts:1-6` não serve ao Deno) |  |  |

### Decisões já tomadas

- D-10: "`customer-parse` usa `createClaudeJson` com JSON Schema fixo, `claude-haiku-5-5` e esforço explícito, `requireAdmin` primeiro, 503 sem chave, teto por conta, log sem o texto (só tamanho e desfecho), e `mode: 'contact_and_address' | 'address'`. `core/customers/parse.ts` confere e normaliza (máscaras, dígito do CPF, e-mail) com imports `.ts` das folhas; `core/customers/mergeCep.ts` (puro) aplica \"o CEP manda\" no app."
- D-11: teto por conta no molde da `seo-suggest` (`seo-suggest/index.ts:18-28`: `createRateLimiter(30, 600_000)`); a frase do 429 é da 06.
- Modo `address`: a function nem devolve campos de contato.
- W1 corre com a 01: **não edite** `packages/core/CLAUDE.md`, `supabase/CLAUDE.md` nem `packages/core/package.json` (o barril `./customers` já existe em `packages/core/package.json:44`). O registro da `customer-parse` e de `core/customers/parse.ts` nos CLAUDE.md é da 06.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Function com IA | `supabase/functions/seo-suggest/{index,handlers}.ts` + `supabase/functions/_shared/claudePort.ts` |
| Folha de `core` alcançável pelo Deno | `packages/core/src/customers/__tests__/denoReach.test.ts` |

### Testes

- Unidade (functions): `requireAdmin` vem antes de qualquer outra coisa; 503 sem `ANTHROPIC_API_KEY`; 429 ao bater o teto da conta.
- Unidade (functions): modo `address` não devolve contato; texto acima de 2.000 caracteres é recusado; prazo e 5xx do modelo viram o desfecho "fora do ar"; saída truncada ou recusada vira desfecho próprio, nunca campos inventados.
- Unidade (functions): o log tem só o tamanho e o desfecho, nunca o texto.
- Unidade (core): `parse` aplica `maskPhone`/`maskCep`, recusa CPF com dígito errado e e-mail inválido (viram vazio); `mergeCep`: o CEP manda quando o serviço conhece, e sem resposta fica o que o texto trouxe.
- Guardas: `claudeSoNaPorta` (`supabase/functions/_shared/__tests__/claudeSoNaPorta.test.ts:33` `INDEXES`, âncora `:141-147`) com `customer-parse`; `denoReach` de `core/customers` cobrindo os arquivos novos; `wiringResolve` (deriva sozinho por diretório).

### Obrigações

- `index.ts` só wiring; regra em `handlers.ts` injetável (`AD-004`).
- Todo relativo com `.ts`, `import type` incluso; sem pacote no grafo da function.
- Não chame a API da Anthropic de verdade nos testes; probe contra o modelo real só no ambiente local, se fizer.

### Não faça

- Não crie a folha nem nada no app (é da 06).
- Não edite `packages/core/CLAUDE.md`, `supabase/CLAUDE.md` nem `packages/core/package.json` (são da 01 nesta onda).
- Não guarde o texto em lugar nenhum (banco, log, storage).

### Pronto quando

- [ ] a function responde com campos conferidos nos dois modos, e com os desfechos de recusa, falta de chave, limite e fora do ar
- [ ] `parse` e `mergeCep` cobertos em `core`
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (e a seção Comandos de verificação do `.specs/project/PROJECT.md`)

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
