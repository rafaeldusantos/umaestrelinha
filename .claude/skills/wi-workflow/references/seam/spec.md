# Spec — a costura do Work Item

A costura de um Work Item **com PRD** — `entrada: prd` ou `entrada: descoberta` no `item.md` —, persistida
no momento em que o handoff fechou. É o que uma sessão nova lê para retomar sem refazer lookup, e é a fonte
que a auditoria da fila confere. Sem PRD, o mesmo papel é do [plan.md](plan.md).

Ela reúne num arquivo só o que o SDLC clássico espalhava por spec, design e test design.

Não é enunciado de tarefa, não é plano e não é descrição do sistema.

---

## Entrada

| Campo          | O que é                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `escopo`       | os UCs como você os extraiu do `prd.md`, e o que ele declarou fora                                                                                              |
| `anexos`       | os insumos do Work Item — os arquivos e URLs do pedido e de `item.md` › Insumos —, lidos sempre, antes do lookup, e o que se tirou de cada um ([lookup.md](../discovery/lookup.md)) |
| `design`       | o retorno de cada design lookup, já consolidado                                                                                                                 |
| `código`       | o retorno do code lookup de cada repositório                                                                                                                    |
| `conferências` | fronteira, cobertura, e o que os lookups não resolveram                                                                                                         |
| `handoff`      | cada item levado ao humano nos dois gates da página — o do PRD Tech Review e o principal —, e o que ele respondeu                                               |
| `prd-review`   | os `tech` e `tech_prd_edit` respondidos no gate do PRD Tech Review, do `prd-review.md`: a `key`, a pergunta, a resposta — e, no `tech_prd_edit`, o trecho do `prd.md` que ela trocou |
| `eval`         | o relatório de avaliação local e os achados que o WI resolve — só quando o repositório tem um e a condição do [lookup.md](../discovery/lookup.md) vale            |

## Comportamento

1. Copie o que os lookups devolveram. Consolidar é agrupar por repositório e por tela — não é reescrever,
   resumir nem melhorar a redação de ninguém
2. Resposta do humano vai **verbatim**, com a pergunta que a provocou. Paráfrase de decisão é como decisão
   se perde
3. Toda afirmação sobre o código carrega `caminho:linha`. A data do cabeçalho é o que a qualifica: é o que
   estava lá naquele dia, e ninguém a lê como estado de hoje
4. **O `prd.md` já chega corrigido.** Cada `tech_prd_edit` aprovado no gate do PRD Tech Review foi aplicado
   ao trecho do `prd.md` e registrado no Histórico de revisões dele: a costura não carrega contradição com o
   PRD a ajustar depois. A decisão técnica por trás da edição vai a **Decisões**, com a `key`; o texto de
   negócio que ela produziu já é critério de aceite, e mora no `prd.md`

## Regras

1. **Critério de aceite não entra** — ele é o `prd.md`, verbatim, ao lado. Aqui vai o identificador e o
   título do UC, e nada mais dele
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
8. **Detalhe de implementação nunca vai ao `prd.md`** — nem daqui. Decisão `tech` mora em **Decisões**, e
   só aqui

## Saída — arquivo `[ITEM_DIR]/spec.md`

Toda seção é obrigatória, na ordem abaixo.

```markdown
# <WI-ID> · <título>

Costura de <data>. PRD r<n>.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Critérios de aceite: `prd.md`, ao lado. Convenção de cada repositório: o arquivo de instruções dele.

## Escopo

| UC             | Título | Origem                                                    |
| -------------- | ------ | --------------------------------------------------------- |
| <UC-01 / C-01> |        | caso de uso do PRD · comportamento numerado nesta costura |

**Achados de eval que este Work Item resolve**

Relatório `<caminho do relatório local>` · repositório `<repositório>` · execução de `<data>`.
| Achado (`id`) | Severidade | `arquivo:linha` no relatório | Resolvido por |
|---|---|---|---|
| | | | UC-nn |

<um cabeçalho e uma tabela por relatório lido. O `arquivo:linha` é o do relatório, na data da execução — o
de hoje vai em **Código**, no `O que muda`. `nada` com o porquê: o repositório não tem relatório de
avaliação local; a condição do [lookup.md](../discovery/lookup.md) não vale; ou nenhum achado cabe no
escopo.>

**Anexos consultados**

| Insumo (caminho ou URL) | Tipo | O que se tirou | Alimenta |
| ----------------------- | ---- | -------------- | -------- |
|                         |      |                | UC-nn    |

<um insumo por linha, todos os que o humano informou — no pedido e em `item.md` › Insumos. Arquivo baixado
de URL fica na pasta temporária e se perde com ela: "O que se tirou" guarda o conteúdo que importou — o
caso, a regra, a evidência —, não só o nome. Insumo que não diz nada do escopo fica com "consultado, sem
uso" e o porquê, e `—` em Alimenta; insumo que não foi possível ler diz isso, e por quê. Imagem é insumo de
escopo, não fonte de design: não vai à seção **Design**. `nada` com o porquê: o humano não informou
insumo nenhum.>

## Fora do escopo

<o que o PRD declara fora, verbatim. E a máquina de estados quando houver.>

## Design

Fontes: <cada fonte, com o localizador já resolvido — o projeto, a URL, o caminho —, e de onde ela
veio: o link da seção "Expectativas de UI/UX" do `prd.md`; o link de design que o humano informou no
pedido ou em `item.md` › Insumos; a fonte `fixo` do `PROJECT.md`; ou a resposta do humano à pergunta de
como prosseguir sem fonte — com a pergunta e a resposta. Sem tela no escopo e sem fonte, ou com o humano
mandando seguir sem design: `nada`, e o porquê.>

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

O que as conferências resolveram, o que o humano respondeu no gate principal, e os `tech` e `tech_prd_edit`
do gate do PRD Tech Review. A resposta dele é verbatim. Decisão técnica mora aqui — e só aqui: não vai ao
`prd.md`. No `tech_prd_edit`, a linha diz também que o trecho do `prd.md` foi trocado, e em que rodada do
Histórico de revisões.
| # | A pergunta | A resposta | Quem decidiu |
|---|---|---|---|

<`Quem decidiu`: a conferência · o humano no gate principal · o humano no gate do PRD Tech Review
(`key` · `tech` | `tech_prd_edit` · `r<n>`).>

## Não resolvido

O que continua aberto, e por quê. É daqui que sai o `Fica fora` do fatiamento.
```

O cabeçalho e o parágrafo abaixo dele são literais: vão iguais em todo spec, sem adaptar ao caso. `r<n>` é
a última rodada do `## Histórico de revisões` do `prd.md`; sem histórico, `r0`.

## Persistência

Escrever o arquivo **é** persistir: o `spec.md` em disco é o artefato, e não existe envio depois dele. Antes
de apresentar a fila, na ordem:

1. o `[ITEM_DIR]/spec.md`, completo
2. no `item.md`, a linha do gate `handoff` na tabela **Gates**, se ainda não estiver lá
   ([estado.md](../setup/estado.md#o-itemmd))
3. no `item.md`, `fase: tasks`

**`design.md` e `test-design.md` não existem nesta skill.** O conteúdo deles está nas seções **Design** e
**Código** e nos blocos **Testes** da costura, e nos blocos `Design` e `Testes` de cada arquivo de tarefa.
A próxima transição de fase é `implement` — ver [tasks.md](../planning/tasks.md).

## Retomada

O estado em disco é o `item.md`, a costura e o status das tarefas ([estado.md](../setup/estado.md#retomada)).
Sessão perdida antes do spec retoma da fase do `item.md`, sem reabrir gate já registrado; depois dele,
retoma no fatiamento lendo o `spec.md`, sem refazer lookup nem reabrir handoff. Fila já escrita não é
retomada — é o caso da Retomada do [estado.md](../setup/estado.md#retomada).

Escrito o spec, apresente a fila. Descoberta posterior que torne falsa uma afirmação dele — no fatiamento
ou na auditoria — se corrige também no spec, no próprio arquivo: dois enunciados divergentes é pior que um
só.
