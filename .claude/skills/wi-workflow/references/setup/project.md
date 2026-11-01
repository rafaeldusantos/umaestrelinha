# Configuração do projeto — `PROJECT.md`

Uma vez por projeto. É daqui que o levantamento sai: **quantos code lookups disparam**, se a conferência
de fronteira tem o que conferir, e onde o design vive. Sem ele você adivinharia as duas coisas, e
adivinhar aqui contamina todo o resto.

**Caminho fixo:** `.specs/project/PROJECT.md`. Não existe, ou falta uma das duas seções
obrigatórias ⇒ escreva-o **antes** de seguir.

**Ele pode já existir.** A `tlc-spec-driven` usa a mesma raiz `.specs/` e escreve o seu próprio
`PROJECT.md`. Encontrando um, **não o sobrescreva**: leia-o inteiro, e acrescente só o que falta —
**Topologia** e **Fontes de design**, com o humano, e as seções opcionais quando fizerem falta —, ao fim do
arquivo ou onde a estrutura dele indicar. Seção que já existe com outro nome mas responde a mesma pergunta
vale como está: diga qual leu como qual. O resto do arquivo — visão, escopo, restrições, o que a tlc
escreveu — fica intacto, e você não o reformata. A `.specs/features/` também é dela: esta skill não a lê
nem a escreve.

Ele declara **decisão e forma** — nunca o que existe no código. O que cada repositório já tem é o lookup
que descobre, a cada Work Item.

---

## As duas perguntas que só o humano responde

**Topologia** — como os repositórios se organizam e **por qual ponteiro se descobrem**. Não escreva a
lista de repositórios: escreva onde ela está (`.gitmodules`, os diretórios de aplicação de um monorepo,
ou "o próprio repositório"). Repositório único não tem fronteira a conferir, e a conferência 1 do
[lookup.md](../discovery/lookup.md) não roda.

**Fontes de design** — onde o comportamento das telas está desenhado. Uma linha por fonte:

| Campo       | O que é                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Fonte       | o tipo e o nome — servidor MCP de design, repositório de protótipo, página publicada                       |
| Localizador | `fixo` (o valor está aqui) ou `por Work Item` (os links que o humano informou no pedido e em `item.md` › Insumos, e os da seção UI/UX do `prd.md`) |
| Mecânica    | como se acessa, quando o tipo não é óbvio para o agente. `pendente` é valor válido                         |

**`nenhuma` é resposta legítima e definitiva** para Work Item de backend, de dado, de infraestrutura:
gravada, não se reconfirma a cada Work Item. Ela não cala a pergunta de um Work Item cujo escopo toca
tela e que não tem fonte — nem link nos insumos, nem no PRD: aí a skill pergunta ao humano como prosseguir
mesmo sob `nenhuma` ([lookup.md](../discovery/lookup.md)).

**A fonte de design de cada Work Item vem do que o humano informou**, sem precisar de linha nesta tabela:
os links de design do pedido e de `item.md` › Insumos e, com PRD, os da seção "Expectativas de UI/UX" do
`prd.md`. Link informado já é a declaração — vale inclusive contra um `nenhuma`. As fontes `fixo` desta
tabela seguem valendo junto. Ferramenta `figma`, `claude_design` e `link` têm mecânica conhecida,
reconhecida pela forma do link; fora delas precisa de uma linha aqui com a **Mecânica**, e é pergunta ao
humano até ter ([lookup.md](../discovery/lookup.md)).

Campo `pendente` é pergunta ao humano **na hora em que ele fizer falta**, não antes. Respondido, a
resposta pertence a este arquivo — senão a mesma pergunta volta no próximo Work Item.

## As instruções do sistema

O `PROJECT.md` **referencia** as instruções do repositório por dimensão; não copia o conteúdo delas.
Escaneie a raiz e os módulos no primeiro uso: `AGENT.md`/`AGENTS.md` (raiz e modulares), `CLAUDE.md`,
`.github/instructions/`, `CONTRIBUTING.md`.

Reescaneie sob demanda — _"atualizar contexto do projeto"_, _"refresh project context"_ — quando o humano
editar essas instruções: só a tabela de referências muda; Topologia, Fontes de design e Visão ficam.

## Comandos de verificação e ambiente local

Duas seções **opcionais**, por repositório, que a execução da fila consome. Não bloqueiam o preflight da
skill: arquivo sem elas é válido, e elas se completam **na hora em que fazem falta** — no preflight da
corrida ([queue.md](../execution/queue.md#preflight)), não antes. Ao escrever o `PROJECT.md` pela primeira
vez, preencha o que a varredura das instruções já responder e deixe o resto `pendente`.

**Comandos de verificação** — os três que o `wi-impl-task` usa em cada repositório: conferir tipos (ou
compilar), rodar **um** arquivo de teste, e a verificação mínima de fechar unidade de trabalho. A fonte
primária continua sendo o arquivo de instruções do repositório: comando que ele declara **não se copia
para cá** — a linha diz `instruções` e aponta a seção. Esta tabela guarda o que o arquivo de instruções não
declara e o humano **confirmou**, e é por isso que o `wi-impl-task` pode usá-la sem deduzir nada. Comando
sugerido e não confirmado não entra.

**Ambiente local** — o que roda na máquina de quem executa a fila e serve para provar o que só a execução
prova (banco, broker, cache, serviço emulado). Tem duas formas:

- **já de pé**, mantido pelo humano: banco em container, `docker compose` do projeto, stack local da
  plataforma (`supabase start`, emuladores do Firebase, LocalStack). Por repositório: o que é, como
  conferir que está de pé — um comando que termina sozinho, como `docker compose ps`, `pg_isready` ou
  `supabase status` —, e como aplicar mudança de schema **nele**;
- **subido pelo próprio teste**: Testcontainers, banco em memória (H2, SQLite), servidor embutido do
  framework. Não há o que conferir: o comando de teste declarado sobe e derruba sozinho. A linha diz como
  a mudança de schema chega a ele (em geral, o próprio teste aplica).

A forma de aplicar mudança de schema é a ferramenta do projeto apontada para o local: `supabase migration
up --local`, `flyway migrate` ou `liquibase update` com a URL local, `dotnet ef database update` com a
connection string local, `rails db:migrate` ou `alembic upgrade head` no ambiente de teste. Nunca um
comando que aponte para ambiente compartilhado. `nenhum` é resposta legítima e definitiva, como em Fontes
de design. A skill nunca sobe o ambiente da primeira forma: confere, e pede ao humano quando precisa dele
de pé.

## Output

```markdown
# [Nome do Projeto]

## Visão

[1-2 frases: o que é, para quem, que problema resolve]

## System Instructions (fonte da intenção)

| Dimensão     | Onde está                                                                    |
| ------------ | ---------------------------------------------------------------------------- |
| ARCHITECTURE | [ex.: `AGENT.md` §Arquitetura]                                               |
| TESTING      | [ex.: `AGENT.md` §Testes — os comandos que ele não declara ficam em Comandos de verificação] |
| CODE STYLE   | [ex.: `.github/instructions/style.md`]                                       |
| INTEGRATIONS | [ex.: `supabase/AGENT.md`]                                                   |
| CONCERNS     | [ex.: `AGENT.md` §Erros Comuns a Evitar]                                     |

## Topologia

- **Forma:** [monorepo | multi-repo | repositório único]
- **Onde estão os repositórios:** [o ponteiro — `.gitmodules`, os diretórios de aplicação, ou "o próprio repositório"]
- **Conferência de fronteira entre repositórios:** [sim | não]

## Fontes de design

| Fonte         | Localizador                                      | Mecânica                      |
| ------------- | ------------------------------------------------ | ----------------------------- |
| [tipo e nome] | fixo: `[valor]` · por Work Item: `[onde no PRD]` | [como se acessa · `pendente`] |

> `nenhuma` quando o projeto não tem design a ler. Escrever `nenhuma` é o acordo, e ele não se reconfirma.
> Os links de design do Work Item — os do pedido, os de `item.md` › Insumos e os da seção UI/UX do
> `prd.md` — não precisam de linha nesta tabela: entram pelo `lookup.md`. Precisa de linha a **Mecânica**
> de uma ferramenta que não seja `figma`, `claude_design` ou `link`.

## Comandos de verificação

| Repositório | Tipos | Um arquivo de teste | Verificação mínima | Origem |
| ----------- | ----- | ------------------- | ------------------ | ------ |
| [caminho]   | [`instruções` · o comando · `pendente`] | [idem, com `<arquivo>` no lugar do caminho] | [idem] | [`instruções §X` · `confirmado pelo humano em AAAA-MM-DD`] |

> Opcional. Comando que o arquivo de instruções declara fica como `instruções`, sem cópia.

## Ambiente local

| Repositório | O que é                                                                                       | Conferir que está de pé                                                            | Aplicar migration nele                                                                             |
| ----------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [caminho]   | [ex.: Postgres no `docker compose` · Supabase local · Testcontainers · `nenhum` · `pendente`] | [ex.: `docker compose ps db` · `supabase status` · `não se aplica — o teste sobe`] | [ex.: `flyway migrate` com a URL local · `supabase migration up --local` · o próprio teste aplica] |

> Opcional. `nenhum` é definitivo e não se reconfirma. Nunca um comando que aponte para o remoto.

## Escopo

**Inclui:** [capacidades core]
**Fora:** [o que explicitamente não está sendo construído]

## Restrições

- [timeline · técnicas · recursos, se aplicável]
```

Arquivo que já existia (da `tlc-spec-driven`, ou escrito à mão): este schema é a referência das seções
que faltam, não um molde para reescrevê-lo.

**Teto:** ~2.000 tokens. A tabela de dimensões **referencia** caminhos; não cola o conteúdo deles.

**Confira antes de seguir:** a Topologia declara o _ponteiro_ dos repositórios, e não uma lista escrita à
mão? As fontes de design têm Localizador — ou `nenhuma`, explicitamente? Num arquivo que já existia, o que
estava lá continua lá, letra por letra?
