# Tarefa — anatomia do arquivo

Cada tarefa é uma ordem de serviço para quem nunca esteve nesta conversa e não pode voltar a ela.

Um arquivo por tarefa, em `[ITEM_DIR]/tasks/<nn>-<slug>.md`. **Entrada com PRD**; sem PRD, a mesma
anatomia, com o `plan.md` no lugar do `spec.md` — inclusive para o bloco **Design**, quando o Work Item tem
protótipo ou o humano deu a fonte ao responder a pergunta de como prosseguir.

---

## Entrada

| Campo      | O que é                                                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `escopo`   | os UCs desta tarefa, com os critérios de aceite na íntegra                                                                                                                   |
| `design`   | o recorte do design lookup para as telas desta tarefa — da seção **Design** do `spec.md`, ou do `plan.md` quando o Work Item sem PRD tem protótipo ou fonte dada pelo humano |
| `código`   | o recorte do code lookup para os repositórios desta tarefa                                                                                                                   |
| `decisões` | o que as conferências resolveram e o que o humano respondeu no handoff                                                                                                       |

## Comportamento

1. Leve a decisão que esta tarefa precisa, verbatim
2. Aponte a convenção pelo arquivo de instruções do repositório, nunca a copie para dentro da tarefa
3. Repita a decisão que serve a duas tarefas nas duas — cada arquivo é completo em si

## Regras

1. O teste de cada linha: quem executa erraria se não soubesse disto? Não, a linha não entra
2. Aponte o exemplar real com `caminho:linha`, em vez de escrever snippet. **A citação diz também o que
   se espera achar ali** — `tsconfig.app.json:25 — o exclude`, não `tsconfig.app.json:25` nu. As tarefas
   rodam em sequência na mesma árvore, então a tarefa `N` desloca as linhas que as tarefas `N+1…` citam: com
   o alvo nomeado, o deslocamento custa uma releitura; sem ele, quem executa não sabe se achou a coisa certa.
   Onde o alvo tem nome no código, **cite pelo símbolo** — `user.repository.ts › findByEmail` —, que
   sobrevive a inserção acima dele
3. Só o que a tarefa toca, com dono — a tarefa não é inventário do código
4. Sem histórico da conversa, sem o PRD inteiro, sem o relatório de lookup cru
5. Nada que dependa do que uma tarefa anterior fez entra com valor fixo. O caso típico é o número da
   migration: a tarefa diz a regra e onde eles vivem, quem implementa apura o próximo livre na hora
6. Decisão que só a outra tarefa usa não entra nesta
7. A política do fim do arquivo — premissa que falha, verificação que não fecha, o que devolver — vai
   verbatim em toda tarefa, igual em todas. Cada arquivo é completo em si: não existe arquivo de política
   para a tarefa consultar
8. **A verificação assere só o que existe ao fim DESTA tarefa.** Configurar e observar são momentos
   diferentes: tarefa de fundação que registra prefixo de rota, pipe de validação ou CORS não tem como provar
   nada por requisição HTTP, porque nenhuma rota nasce nela — sem rota, o caminho novo e o antigo respondem
   404 igualmente, não há corpo para o pipe validar e não há resposta que carregue cabeçalho de CORS. A
   asserção de contrato pertence à tarefa em que a **primeira rota nasce**, e é lá que ela vai. Ao escrever
   `Testes` e `Pronto quando` de tarefa sem tela, a pergunta é o que existe **quando ela fechar**, nunca o que
   ela configurou
9. **Nunca crie rota, tela ou endpoint para poder testar.** Isso é escopo de outra tarefa da fila. Tarefa
   sem nada a observar diz, no lugar do bloco `Testes`, que não tem teste de contrato e por quê — e fica com a
   verificação que cabe, em geral unitária, do que ela de fato passou a possuir

## O arquivo de instruções

É como esta skill chama o que governa o COMO de cada repositório: `AGENTS.md`, `AGENT.md`, `CLAUDE.md`,
`.github/copilot-instructions.md` ou `.github/instructions/*.md`, na raiz e nos módulos. O code lookup
descobriu quais existem, e é a lista dele que vai no parágrafo **Antes de tocar em qualquer arquivo** —
com os caminhos reais, nunca com a expressão genérica.

O arquivo grande demais para ler inteiro — o que o code lookup relatou em `Lidos por seção` — entra no
parágrafo pelas seções que governam esta tarefa, como `caminho › seção`, e não pelo caminho nu: quem
executa lê o índice de títulos e essas seções por inteiro.

## Saída — arquivo de tarefa

Na ordem do schema abaixo.

Vão em toda tarefa: o cabeçalho, a linha **Status**, **Objetivo**, o parágrafo do arquivo de instruções,
**Critérios de aceite**, **Contrato**, **Pronto quando** e tudo depois do `---`.

**A linha `**Status:**` é a primeira depois do título**, e nasce `pending`. É o progresso da fila
([estado.md](../setup/estado.md#status-das-tarefas)): só a thread principal a move, na corrida. Quem
executa uma tarefa, e quem propaga descoberta para os arquivos seguintes, **nunca a toca**.

As outras — as linhas `Trecho da costura`, `Depende de` e `Habilita`, **Design**, **Decisões já
tomadas**, **Siga a forma de**, **Testes**, **Obrigações**, **Não faça** — entram só quando têm
conteúdo. Seção sem conteúdo se omite: `nada` não é preenchimento.

````markdown
## <nn> · [repositórios afetados] <tela / destino de navegação — ou, em WI sem tela, o agregado>

**Status:** pending

`<UCs cobertos>` — <WI-ID>

**Objetivo.** Uma frase: o que passa a ser possível quando isto fechar.

**Antes de tocar em qualquer arquivo**, leia por inteiro: <os caminhos do arquivo de instruções —
o da raiz de cada repositório desta tarefa e o de cada módulo que ela toca; o lookup descobriu
quais existem. O grande demais para ler inteiro entra como `caminho › seção`, uma por seção que
governa esta tarefa>. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a
divergência vai no retorno.

**Trecho da costura.** §<N> · <spec.md | plan.md> — <o título da seção `##` da costura que esta
tarefa executa, contando as seções a partir de 1>. É o rastreio da tarefa até a costura: quem
executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** <a tarefa anterior e o que ela deixou pronto>. Confira que existe antes de começar.
**Habilita.** <o que a próxima consome daqui>.

### Critérios de aceite

<verbatim do PRD, íntegros, agrupados por UC. Não parafraseie, não resuma, não corte bullet.
Isto é a definição de pronto. O `prd.md` já traz as edições aprovadas no gate do PRD Tech Review:
copie-o como está. Sem PRD, os `C-nn` do `plan.md` que esta tarefa cobre, verbatim.>

### Design — o que a tela faz

<o recorte do design lookup para estas telas: estrutura, dados exibidos, campos com tipo e
validação, ações com a condição de cada uma aparecer, estados vazio/carregando/erro. Sai da seção
Design da costura — do `spec.md`, ou do `plan.md` quando o Work Item sem PRD tem protótipo ou fonte
dada pelo humano; com o Design da costura em `nada`, o bloco se omite.
Este recorte é a fonte: não vá ao design buscar o que não está aqui. Detalhe visual que ele
não menciona resolve-se pelo design system do repositório.>

### Contrato

| Item            | Dono                            | Entra | Sai |
| --------------- | ------------------------------- | ----- | --- |
| <rota / tabela> | VOCÊ CRIA                       |       |     |
| <rota / tabela> | JÁ EXISTE. Consuma; não altere. |       |     |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

<as que ESTA tarefa precisa: nomenclatura resolvida nas conferências e respostas do humano ao
handoff. Uma linha cada.>

### Siga a forma de

| O que você vai escrever | Imite                                                  |
| ----------------------- | ------------------------------------------------------ |
| <tipo de artefato>      | `caminho:linha — o alvo`, ou `caminho › símbolo`      |

<do bloco `Exemplares` do lookup. Abra o arquivo antes de escrever o seu.>

### Testes

<do bloco `Testes` do lookup, recortado para esta tarefa. Uma linha por comportamento, dizendo
o nível. Nomeie o comportamento, não o arquivo. A linha pode citar o UC ou o `C-nn` de onde ele vem —
a tarefa é artefato do Work Item, e o identificador é rastreabilidade —, mas o comportamento se
descreve em palavras: é dele que sai o nome do teste, e no repositório o identificador não entra.
Escrever estes testes é parte da tarefa.
Cada comportamento tem que ser observável ao fim DESTA tarefa (regra 8). Não havendo nenhum,
a seção se omite e a linha diz, em `Pronto quando`, que a tarefa não tem teste de contrato e
por quê — não se cria rota nem tela para poder testar.>

### Obrigações

<do bloco `Obrigações transversais` do code lookup, recortado para esta tarefa e **já
aplicado a este caso**: o método exato a acrescentar e onde, a classe a alterar e em que
ordem, as chaves a criar e em quais arquivos. Nunca a regra genérica — a obrigação já
resolvida.
Obrigação que vem de arquivo de configuração cita a **severidade** junto da regra e o
`caminho:linha` onde ela está — `@typescript-eslint/no-floating-promises` (`error` em
`eslint.config.mjs:30`) —, porque é a severidade que diz se o item bloqueia o fechamento da
tarefa ou é conselho. Não descreva como bloqueante o que está em `warn`: obrigação que exagera
a consequência ensina quem executa a não confiar na obrigação.>

### Não faça

<a cerca, nominal — nomeie cada coisa, não escreva "o resto". Duas origens: comportamento que
o PRD declara fora do escopo, e tela ou artefato que pertence a outra tarefa da fila.>

### Pronto quando

- [ ] <uma asserção verificável por critério de aceite significativo>
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório
      <sem comandos aqui: estão no arquivo de instruções ou, no que ele não declara, na seção Comandos de verificação do
      `.specs/project/PROJECT.md` — é lá que quem executa os procura, e não num bloco desta tarefa.
      Suíte completa, build, e2e, integração e validação em navegador não entram.
      A linha dos testes existe só quando a tarefa tem o bloco `Testes`.>

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
````

O bloco depois do `---` é literal: vai igual em toda tarefa, sem adaptar ao caso.
