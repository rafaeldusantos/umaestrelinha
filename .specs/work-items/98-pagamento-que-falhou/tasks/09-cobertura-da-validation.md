## 09 · [supabase · apps/backoffice · packages/core · apps/store] Cobertura que a Validation cobrou — GA4 no registro, "Outro status" e tom

**Status:** done

`RNF-07, CA-03.9, RNF-06` — 98

**Objetivo.** Os três critérios que a Validation 1 achou sem prova (ou com prova parcial) passam a ter teste que reprova se o comportamento voltar atrás.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §Os guardas, §Convenções, §Baselines), `apps/backoffice/CLAUDE.md` › Pedidos e a fila de material, `packages/core/CLAUDE.md` › notifications, `supabase/CLAUDE.md` › `mercado-pago`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (Testes).

**Depende de.** 01–08 — o registro manual, o webhook, o "Outro status", o e-mail `order_cancelled_unpaid` e a página `/pagar-com-cartao`. Confira que existe antes de começar.

### Critérios de aceite

- RNF-07 O registro manual não dispara o evento de compra do Google Analytics [premissa ratificada pela recomendação, P-04]
- CA-03.9 Levar um pedido não pago a "Pago" pelo painel — pelo "Avançar mesmo assim", pelo "Outro status" ou pelo "Avançar status" em lote — abre o "Registrar pagamento"; o lote deixa de fora os pedidos não pagos e diz quantos ficaram [gate Q-05; r1 outros-caminhos-que-marcam-pago]
- RNF-06 Tom memorial: nenhuma urgência na cópia para a cliente [código: CLAUDE.md topo]

### Decisões já tomadas

- **Classificação**: test-missing
- **Causa raiz**: RNF-07 vale só por construção (o `purchase` sai por `supabase/functions/mercado-pago/handlers.ts › firePurchase`, que o registro manual não alcança) e nada recusa a volta; o "Outro status" de um pedido não pago para Pago só é provado em `packages/core/src/orders/__tests__/manualPayment.test.ts` (regra), nunca pela página (`apps/backoffice/src/pages/admin/AdminOrderPage.tsx › mudarStatus`; os casos de `AdminOrderPage.aviso.test.tsx` usam pedido pago); a régua de tom (`not.toMatch(/!|urgente|últim/)`) cobre só o informativo e a pendência da loja, não o texto do e-mail `order_cancelled_unpaid` (`packages/core/src/notifications/defaults.ts`) nem as frases de `/pagar-com-cartao` (`apps/store/src/pages/CardLinkPaymentPage.tsx`, `packages/core/src/checkout/cardLink.ts`).
- Só teste: nenhuma mudança de comportamento. Se algum teste reprovar por defeito real, conserte o código e diga.

### Testes

- Integração local: depois de `record_manual_payment`, o pedido não tem `ga_purchase_status` reivindicado (probe `.specs/work-items/98-pagamento-que-falhou/probes/01-registrar.sql`, uma linha `ok —` a mais). Prove que a asserção morde (mutação: reivindicar no corpo da RPC).
- Página real (painel): num pedido não pago, escolher "Pago" (e um status além de Pago) no "Outro status" leva à tela de registro e não grava status.
- Unidade (core/loja): o assunto e o corpo do e-mail `order_cancelled_unpaid` e as frases da página `/pagar-com-cartao` sem exclamação, urgência nem "últim".

### Não faça

- Não mude comportamento de produto, migration aplicada ou texto já aprovado pela costura (salvo se o teste revelar defeito, e diga).

### Pronto quando

- [ ] RNF-07 provado por asserção que morde
- [ ] o "Outro status" de não pago leva à tela de registro, pela página real
- [ ] a régua de tom cobre o e-mail novo e `/pagar-com-cartao`
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho de `CLAUDE.md` §Comandos/§Baselines

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
