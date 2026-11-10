## 13 · [apps/store · supabase/functions] Pedido levado adiante sem pagamento não gera PIX pelo endereço de pagamento

**Status:** done

`BUG-005` — 98 (fix task de bug da QA, rodada 1)

**Objetivo.** Abrir `/pedido/:id/pagamento` de um pedido que a admin levou adiante sem pagamento (Em Separação ou além, `payment_status` não aprovado) não chama o `create-payment` e mostra o mesmo caminho que a página do pedido já mostra para esse caso; o servidor recusa gerar cobrança para esse pedido.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §O "defeito 01", §Os guardas, §Convenções, §Baselines), `apps/store/CLAUDE.md` › Minha conta e pagamento, `supabase/CLAUDE.md` › `mercado-pago`, e o(s) bug(s) `qa/issues/BUG-005.md` — passos, esperado × observado e a evidência. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** `spec.md` (Decisões e §Código) e `prd.md` nos critérios que o bug cita.

**Depende de.** 01–09 (done).

### Decisões já tomadas

- A pergunta "este pedido aceita pagar de novo?" tem um dono (`pedidoAguardaPagamento`/core); a rota e o `create-payment` a usam — nada de segunda regra na tela.
- Recusa do servidor com código próprio (ex.: 409 `order_not_awaiting_payment`) antes de falar com o Mercado Pago, no molde de `order_cancelled`/`order_already_paid`.
- **Classificação**: bug da QA. A causa raiz é sua para achar: reproduza pelo teste antes de mexer no código.

### Testes

- Página real da rota com pedido em `separating` sem pagamento: zero chamadas a `create-payment` e o texto do caminho alternativo.
- `handlers.test.ts` do `mercado-pago`: o pedido nesse estado recebe a recusa e o dublê do MP não é chamado; o par `pending` continua gerando.
- Cada teste novo **reprova antes do conserto** (rode e registre) e passa depois; reinjete o defeito uma vez para ver a asserção morder.

### Não faça

- Não mexa no `pagamentoComDonoUnico` além do necessário; ele deve continuar verde.
- Não afrouxe asserção existente nem mude migration já aplicada (correção de banco vem em migration nova, aplicada só no local).
- Não suba servidor nem navegador: o reteste é da QA.

### Pronto quando

- [ ] BUG-005 recusado na tela e no servidor
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
