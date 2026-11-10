## 10 · [apps/backoffice] O comprovante escolhido em qualquer momento entra no registro

**Status:** done

`BUG-001` — 98 (fix task de bug da QA, rodada 1)

**Objetivo.** Na tela Registrar pagamento, todo arquivo escolhido — antes ou depois de preencher meio, data e observação, em uma ou várias seleções — aparece na lista e é gravado com o registro; nada é descartado em silêncio.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §O "defeito 01", §Os guardas, §Convenções, §Baselines), `apps/backoffice/CLAUDE.md` › Pedidos, e o(s) bug(s) `qa/issues/BUG-001.md` — passos, esperado × observado e a evidência. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** `spec.md` (Decisões e §Código) e `prd.md` nos critérios que o bug cita.

**Depende de.** 01–09 (done).

### Decisões já tomadas

- Seleções sucessivas **somam** à lista (até o teto de 3); acima do teto, a tela recusa o excedente dizendo por quê, nunca descarta calado.
- O registro só confirma depois de os comprovantes listados terem sido enviados; falha de envio de um comprovante é dita na tela e não vira registro "com comprovante" falso.
- **Classificação**: bug da QA. A causa raiz é sua para achar: reproduza pelo teste antes de mexer no código.

### Testes

- Página real (`AdminOrderPaymentPage` ou equivalente, client dublado como nos testes de 01): escolher um arquivo, preencher meio e observação, escolher mais um — os dois na lista e os dois no upload/RPC.
- Duas seleções sucessivas no mesmo input somam; a quarta é recusada com a frase.
- O registro grava os comprovantes listados (ids no payload da RPC).
- Cada teste novo **reprova antes do conserto** (rode e registre) e passa depois; reinjete o defeito uma vez para ver a asserção morder.

### Não faça

- Não mude o teto (3), os tipos aceitos nem os 10 MB.
- Não afrouxe asserção existente nem mude migration já aplicada (correção de banco vem em migration nova, aplicada só no local).
- Não suba servidor nem navegador: o reteste é da QA.

### Pronto quando

- [ ] BUG-001: nenhuma seleção de arquivo é perdida, provado pela página real
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
