## 17 · [apps/store] O cabeçalho "Ambiente seguro" não faz a página rolar de lado em 320 px com fonte grande

**Status:** done

`BUG-012` — 98 (fix task de bug da QA, rodada 1)

**Objetivo.** Em `/pagar-com-cartao` (e no cabeçalho de checkout que ela usa), a 320 px com fonte a 200 % o cabeçalho embrulha ou encolhe sem rolagem horizontal do body.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §O "defeito 01", §Os guardas, §Convenções, §Baselines), `apps/store/CLAUDE.md` (mobile, `minmax(0, …)`, cabeçalho do checkout), e o(s) bug(s) `qa/issues/BUG-012.md` — passos, esperado × observado e a evidência. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** `spec.md` (Decisões e §Código) e `prd.md` nos critérios que o bug cita.

**Depende de.** 01–09 (done).

### Decisões já tomadas

- Quem cede: o texto "Ambiente seguro" embrulha (ou some abaixo de `sm` mantendo o ícone com rótulo acessível); logo e voltar intactos.
- **Classificação**: bug da QA. A causa raiz é sua para achar: reproduza pelo teste antes de mexer no código.

### Testes

- Token exato das classes que permitem encolher/embrulhar no cabeçalho (jsdom não mede layout; a medida em navegador é do reteste).
- Cada teste novo **reprova antes do conserto** (rode e registre) e passa depois; reinjete o defeito uma vez para ver a asserção morder.

### Não faça

- Não mexa no cabeçalho principal da loja.
- Não afrouxe asserção existente nem mude migration já aplicada (correção de banco vem em migration nova, aplicada só no local).
- Não suba servidor nem navegador: o reteste é da QA.

### Pronto quando

- [ ] BUG-012 coberto por régua de forma
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu, vermelho antes
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho de `CLAUDE.md` §Comandos/§Baselines (tipos do app tocado e de `packages/core`)

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
