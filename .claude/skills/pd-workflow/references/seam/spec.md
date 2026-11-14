# Spec — a costura do Work Item

A costura de um Work Item **com PRD**, persistida no momento em que o handoff fechou. É o que uma sessão
nova lê para retomar sem refazer lookup, e é a fonte que a auditoria da fila confere. Sem PRD, o mesmo
papel é do [plan.md](plan.md). **[local]** Vale para `entrada: prd` e `entrada: descoberta` no `item.md`.

Ela reúne num arquivo só o que o SDLC clássico espalhava por spec, design e test design. **[productdock]**
Na plataforma ela é o artefato `spec` da fase `specify`.

Não é enunciado de tarefa, não é plano e não é descrição do sistema.

---

## Entrada

| Campo          | O que é                                                                                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `escopo`       | os UCs como você os extraiu do PRD, e o que ele declarou fora                                                                                                                                                                    |
| `anexos`       | os anexos e insumos do Work Item (`insumos.ler`, [backend](../setup/backend.md)) — sempre, antes do lookup — e o que se tirou de cada um ([lookup.md](../discovery/lookup.md))                                                 |
| `design`       | o retorno de cada design lookup, já consolidado                                                                                                                                                                                  |
| `código`       | o retorno do code lookup de cada repositório                                                                                                                                                                                     |
| `conferências` | fronteira, cobertura, e o que os lookups não resolveram                                                                                                                                                                          |
| `handoff`      | cada item levado ao humano, nos dois gates — o do PRD Tech Review (o handoff antecipado) e o principal —, e o que ele respondeu                                                                                                  |
| `prd-review`   | **[productdock]** os `tech_prd_edit` da revisão: a `key`, o trecho atual, o texto proposto — e se foram submetidos ou ficaram sem thread, por não haver pedido aberto. **[local]** os `tech` e `tech_prd_edit` respondidos no gate do PRD Tech Review, do `prd-review.md`: a `key`, a pergunta, a resposta — e, no `tech_prd_edit`, o trecho do `prd.md` que ela trocou |
| `eval`         | o report de eval (`eval.ler`) e os achados que o WI resolve — só quando a condição do [lookup.md](../discovery/lookup.md) vale                                                                                                  |

## Comportamento

1. Copie o que os lookups devolveram. Consolidar é agrupar por repositório e por tela — não é reescrever,
   resumir nem melhorar a redação de ninguém
2. Resposta do humano vai **verbatim**, com a pergunta que a provocou. Paráfrase de decisão é como decisão
   se perde
3. Toda afirmação sobre o código carrega `caminho:linha`. A data do cabeçalho é o que a qualifica: é o que
   estava lá naquele dia, e ninguém a lê como estado de hoje
4. **A edição técnica do PRD segue o dono do PRD**
   ([o que cada backend habilita](../setup/backend.md#o-que-cada-backend-habilita)):
   - **[productdock]** **Decisão técnica do handoff antecipado vale sobre o PRD.** Onde um `tech_prd_edit`
     contradiz o texto do PRD, a costura segue a decisão — e a contradição fica dita em `PRD pendente de
     ajuste`, para quem ler o PRD depois não encontrá-la sozinho. O `prd.md` é cópia fiel e não se edita
   - **[local]** **O `prd.md` já chega corrigido.** Cada `tech_prd_edit` aprovado no gate do PRD Tech
     Review foi aplicado ao trecho do `prd.md` e registrado no Histórico de revisões dele: a costura não
     carrega contradição com o PRD a ajustar depois. A decisão técnica por trás da edição vai a
     **Decisões**, com a `key`; o texto de negócio que ela produziu já é critério de aceite, e mora no
     `prd.md`

## Regras

1. **Critério de aceite não entra** — ele é o `prd.md`, verbatim, ao lado. Aqui vai o identificador e o
   título do UC, e nada mais dele. **[productdock]** A exceção é o trecho citado em `PRD pendente de
   ajuste`: ele entra porque é o texto que está errado
2. **A fila não entra.** O spec antecede o fatiamento: nenhum número de tarefa, nenhuma ordem de execução,
   nenhuma divisão de trabalho aparece aqui
3. **Convenção não entra.** Como se escreve uma migration, onde entra uma rota, qual o envelope de
   resposta — é o arquivo de instruções do repositório que governa, e ele não se copia para cá
4. Não invente o que o lookup não disse. Seção sem conteúdo se escreve `nada`; o que ninguém conferiu vai
   em `Não resolvido`, nunca como afirmação
5. Divergência entra com a resolução ao lado, e com quem resolveu — a conferência ou o humano. Divergência
   sem resolução é `Não resolvido`
6. O que o handoff deixou travado aparece nominalmente: é ele que vira `Fica fora` no fatiamento
7. **O bloco `Testes` de cada repositório governa o teste**, e é dele que sai o bloco
   `Testes` de cada tarefa. Não escreva plano de teste em prosa aqui, nem matriz de cobertura: nomeie o
   comportamento a cobrir e o nível, como o lookup os devolveu
8. **Detalhe de implementação nunca vai ao PRD** — nem daqui. Decisão técnica mora em **Decisões**, e só
   ali

## Saída — arquivo `[ITEM_DIR]/spec.md`

Toda seção é obrigatória, na ordem abaixo. **[productdock]** inclusive `PRD pendente de ajuste`;
**[local]** essa seção não existe — o `prd.md` já traz as edições aprovadas.

```markdown
# <WI-REF> · <título>

Costura de <data>. PRD <versão do PRD>.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Critérios de aceite: `prd.md`, ao lado. Convenção de cada repositório: o arquivo de instruções dele.

## Escopo

| UC             | Título | Origem                                                    |
| -------------- | ------ | --------------------------------------------------------- |
| <UC-01 / C-01> |        | caso de uso do PRD · comportamento numerado nesta costura |

**Achados de eval que este Work Item resolve**

Eval `<tipo>` · repositório `<repositório>` · execução `<execução>` de `<data>`.
| Achado (`id`) | Severidade | `arquivo:linha` no report | Resolvido por |
|---|---|---|---|
| | | | UC-nn |

<um cabeçalho e uma tabela por execução lida, pelo [lookup.md](../discovery/lookup.md). O `arquivo:linha`
é o do report, na data da execução — o de hoje vai em **Código**, no `O que muda`. [productdock] o
cabeçalho leva `eval_type`, `repository_key`, `execution_id` e `executed_at` do report; [local] o caminho
do relatório local no lugar da execução. `nada` com o porquê: a condição do report de eval não vale; não
há avaliação daquele tipo ([productdock] o report veio `data: null`; [local] o repositório não tem
relatório de avaliação local); ou nenhum achado cabe no escopo.>

**Anexos consultados**

| Anexo | Tipo | O que se tirou | Alimenta |
| ----- | ---- | -------------- | -------- |
|       |      |                | UC-nn    |

<um anexo por linha, todos os que `insumos.ler` listou — [productdock] o `file_name` e o `mime_type` de
cada anexo do Work Item; [local] o caminho ou a URL de cada insumo do pedido e de `item.md` › Insumos.
O arquivo baixado fica na pasta temporária e se apaga com ela: "O que se tirou" guarda o conteúdo que
importou — o caso, a regra, a evidência —, não só o nome. Anexo que não diz nada do escopo fica com
"consultado, sem uso" e o porquê, e `—` em Alimenta; anexo que não foi possível ler diz isso, e por quê.
Imagem anexada é insumo de escopo, não fonte de design: não vai à seção **Design**. `nada` com o porquê:
o Work Item não tem anexo nem insumo.>

## Fora do escopo

<o que o PRD declara fora, verbatim. E a máquina de estados quando houver.>

## Design

Fontes: <cada fonte, com o localizador já resolvido — o projeto, a URL, o caminho —, e de onde ela
veio: o link da seção "Expectativas de UI/UX" do PRD; [productdock] o protótipo do Work Item
(`insumos.ler`, com o `tool`) — marcando o que o PRD não cita —, e o link do PRD que saiu do cadastro,
com a pergunta ao humano e a resposta (vale ou foi substituído); [local] o link de design que o humano
informou no pedido ou em `item.md` › Insumos; a fonte `fixo` do `PROJECT.md`; ou a resposta do humano à
pergunta de como prosseguir sem fonte — com a pergunta e a resposta. Sem tela no escopo e sem fonte, ou
com o humano mandando seguir sem design: `nada`, e o porquê.>

<o comportamento consolidado, uma subseção por tela: estrutura, dados exibidos, campos com tipo e
validação, ações com a condição de cada uma aparecer, estados vazio/carregando/erro. O que o design
não mostra fica dito que não mostra.>

Divergências entre fontes: <a divergência, e o que valeu — com quem decidiu.>

## Código — <caminho do repositório>

Uma seção destas por repositório onde o lookup rodou.

- **Instruções** — os arquivos de instruções lidos; para o grande demais, as seções que governam esta
  mudança, como `caminho › seção`
- **Recorte** — os UCs que este repositório reivindicou
- **O que já serve** — com `caminho:linha`
- **O que muda** — com `caminho:linha`; o achado de eval que o Work Item resolve, com o `id` dele e onde
  o código está hoje
- **O que nasce**
- **Exemplares** — o que imitar, por tipo de artefato, com `caminho:linha`
- **Obrigações transversais** — o que o repositório exige de todo código novo
- **Testes** — o comportamento a cobrir, e em que nível
- **Depende / Expõe** — o que este repositório precisa do outro, e o que oferece

## Fronteira entre repositórios

Cada `depende` com o `expõe` que o atende, e como casaram — dado, formato e momento da chamada.
Topologia de repositório único: `nada`.
| Depende (repo) | Expõe (repo) | Como casou |
|---|---|---|

## Cobertura dos UCs

Todo UC do `Escopo` aparece aqui.
| UC | Reivindicado por |
|---|---|

## Decisões

O que as conferências resolveram e o que o humano respondeu nos dois gates. A resposta dele é verbatim.
As decisões técnicas moram aqui — e só aqui: não vão ao PRD. [local] No `tech_prd_edit`, a linha diz
também que o trecho do `prd.md` foi trocado, e em que rodada do Histórico de revisões.
| # | A pergunta | A resposta | Quem decidiu |
|---|---|---|---|

<`Quem decidiu`: a conferência · o humano no gate principal · o humano no gate do PRD Tech Review
(`key` · `tech` | `tech_prd_edit`, e [local] a rodada `r<n>`).>

## PRD pendente de ajuste

[productdock] Cada `tech_prd_edit` cuja thread não fechou com o PRD editado — ou que ficou `sem thread`,
porque a revisão não tinha pedido aberto e não submeteu nada. A costura e a fila seguem a decisão, não o
trecho. Sem pendência: `nada`.
| Finding (`key`) | Trecho atual do PRD | Texto proposto | Estado |
|---|---|---|---|

## Não resolvido

O que continua aberto, e por quê. É daqui que sai o `Fica fora` do fatiamento.
```

O cabeçalho e o parágrafo abaixo dele são literais: vão iguais em todo spec, sem adaptar ao caso.
`<versão do PRD>` é **[productdock]** `versão <n>`, a que `prd.obter` devolveu; **[local]** `r<n>`, a
última rodada do `## Histórico de revisões` do `prd.md` — sem histórico, `r0`.

## Persistência

Escrita a costura, persista **antes** de apresentar a fila, na ordem
([backend](../setup/backend.md)):

1. o `[ITEM_DIR]/spec.md`, completo
2. `artefato.publicar(spec)`. **[productdock]** O corpo vai do arquivo, verbatim — não há transcrição
   para dentro de argumento, e um spec de 200 kB é uma publicação normal
   ([quando sincronizar](../pd-sync/workflow.md#quando-sincronizar)). **[local]** Não há envio: o
   `spec.md` em disco é o artefato
3. **[local]** `gate.registrar(handoff)`, se ainda não estiver registrado, e `fase.entrar(tasks)`.
   **[productdock]** O gate do handoff já foi registrado quando ele fechou
   ([handoff.md](../discovery/handoff.md)), e não há transição de fase aqui: a próxima é `implement`,
   depois da fila ([tasks.md](../planning/tasks.md#5-entrar-no-implement))

**`design.md` e `test-design.md` não existem nesta skill**, nem as fases `design` e `test-design`. O
conteúdo deles está nas seções **Design** e **Código** e nos blocos **Testes** da costura, e nos blocos
`Design` e `Testes` de cada arquivo de tarefa. **[productdock]** Não há transição de fase para `design`:
a coluna do Kanban já avançou quando a `specify` começou ([Kanban](../pd-sync/workflow.md#kanban)). A
plataforma deixa de receber os artefatos `design` e `test-design` — é consequência assumida do fluxo por
costura, e o Work Item mostra dois cards a menos.

## PRD pendente de ajuste — quando fecha

**[productdock]** A linha sai quando a thread está `resolved` **e** o trecho citado não está mais no PRD —
as duas conferidas, por `tech-review.ler` e `prd.obter`. Thread resolvida com o trecho intacto é o PM
ratificando sem editar: a linha fica. **Linha `sem thread`** — a revisão rodou sem pedido aberto, com o
PRD já **Aprovada** — não tem thread a conferir: ela sai quando o trecho citado não está mais no PRD que
`prd.obter` devolve, isto é, quando o PM publicou a edição; até lá, fica, e o texto proposto segue como
orientação ao humano. A conferência acontece na rodada N+1 do [PRD Tech Review](../discovery/prd-review.md)
e na Validation; linha que sai traz o `prd.md` de novo (`prd.obter`) e publica o spec outra vez
(`artefato.publicar(spec)`). Linha que continua aberta no fechamento da fase vai ao humano, nominalmente.
O detalhe está em [Tech Review com o PM](../pd-sync/workflow.md#tech-review-com-o-pm).

## Retomada

Sessão perdida **antes** do spec, por backend
([o que cada backend habilita](../setup/backend.md#o-que-cada-backend-habilita)):

- **[productdock]** a costura é o **único estado em disco**: sessão perdida antes dela recomeça o Work
  Item — os gates já aprovados estão na plataforma
- **[local]** o estado em disco é o `item.md`, a costura e o status das tarefas
  ([sinais da retomada](../setup/local.md#sinais-da-retomada)): sessão perdida antes do spec retoma da
  fase do `item.md`, sem reabrir gate já registrado

Depois dele, nos dois, retoma no fatiamento lendo o `spec.md`, sem refazer lookup nem reabrir handoff.
Fila já escrita não é retomada por aqui — é o caso da tabela de retomada do [SKILL.md](../../SKILL.md).

Escrito o spec, apresente a fila. Descoberta posterior que torne falsa uma afirmação dele — no fatiamento
ou na auditoria — se corrige também no spec, no próprio arquivo, e o artefato se publica de novo
(`artefato.publicar(spec)`): dois enunciados divergentes é pior que um só.
