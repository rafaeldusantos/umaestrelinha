## 19 · [apps/store · supabase/functions · packages/core] Pedido gravado fora da loja leva ao WhatsApp, sem oferta de pagar de novo

**Status:** done

`QA-P1` — 98 (fix task de bug da QA, rodada 1)

**Objetivo.** Um pedido não pago que a loja nunca calculou (gravado fora da loja: sem cobrança calculada pela loja, ex.: #0563 com total gravado R$ 10,00 ≠ itens + frete) deixa de mostrar "Gerar novo PIX" e o valor em `/conta` e na página do pedido; mostra que a Adri combina o pagamento, com o WhatsApp (como o informativo do cartão recusado). O servidor recusa gerar cobrança para ele.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §O "defeito 01", §Os guardas, §Convenções, §Baselines), `apps/store/CLAUDE.md` › Minha conta e o detalhe do pedido, `supabase/CLAUDE.md` › `mercado-pago`, `packages/core/CLAUDE.md` › orders; e `qa/decisoes-produto.md` (QA-P1) e `prd.md` CA-01.6, e o(s) bug(s) `qa/issues/QA-P1.md` — passos, esperado × observado e a evidência. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** `spec.md` (Decisões e §Código) e `prd.md` nos critérios que o bug cita.

**Depende de.** 01–09 (done).

### Decisões já tomadas

- Decisão do humano (QA-P1, opção 1). Nunca cobrar pelo `orders.total` (BL-030: as policies de INSERT em `orders` seguem abertas).
- **Como reconhecer** "sem cobrança calculada pela loja": investigue como o WI 98 marca isso (tarefa 04, `order_charge_locks`, `lockedFirstCharge`, e decisão 4 da `spec.md`: pedido pendente de antes da publicação é calculado como hoje). A cliente não lê `order_charge_locks` (só service role): a resposta tem de vir do servidor (ex.: um campo em `get-order`/na leitura da conta, ou uma RPC `security definer` que só diz sim/não) — escolha a menor superfície, sem coluna nova derivável em `orders` (defeito 01), e registre a premissa. Se não houver critério que separe o pedido "gravado fora da loja" do pedido legítimo de antes da publicação, PARE e relate (aborto com a pergunta).
- A pergunta "este pedido aceita pagar de novo pela loja?" continua com um dono só (`pedidoAguardaPagamento`/`repix` em core) — o critério novo entra nele, não numa segunda regra na tela.
- Servidor: `create-payment` recusa esse pedido com código próprio (molde de `order_not_awaiting_payment`) antes de falar com o MP.
- Tom memorial, sem urgência; texto no molde do informativo do cartão.
- **Classificação**: bug da QA. A causa raiz é sua para achar: reproduza pelo teste antes de mexer no código.

### Testes

- `core`: o dono devolve "não oferece pagar" para o pedido sem cobrança calculada pela loja; o par (pedido de catálogo com cobrança travada, e o pendente de antes da publicação que a loja calcula como hoje) continua oferecendo.
- Página real do pedido e da conta: sem "Gerar novo PIX" nem valor, com o WhatsApp; o par com a oferta.
- `handlers.test.ts` do `mercado-pago`: a recusa sem chamada ao MP nem escrita; o par gerando.
- Se usar migration/RPC nova: aplicar só no local, probe em `probes/` e os guardas da loja (`marcacaoSoPorAcao`).
- Cada teste novo **reprova antes do conserto** (rode e registre) e passa depois; reinjete o defeito uma vez para ver a asserção morder.

### Não faça

- Não mexa no pedido montado (`lockedProposalCharge`) nem no link de cartão da admin.
- Não afrouxe asserção existente nem mude migration já aplicada (correção de banco vem em migration nova, aplicada só no local).
- Não suba servidor nem navegador: o reteste é da QA.

### Pronto quando

- [ ] QA-P1 aplicado na tela e no servidor, com o par legítimo intacto
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
