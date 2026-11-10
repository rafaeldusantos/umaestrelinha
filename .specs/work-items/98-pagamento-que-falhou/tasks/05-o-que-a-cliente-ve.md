## 05 · [packages/core · apps/store · supabase/functions/checkout] O que a cliente vê — /pedido/:id e /conta

**Status:** done

`UC-01, UC-02, UC-04` — 98

**Objetivo.** A cliente vê, no pedido e na conta, o caminho certo para cada falha: novo PIX, o informativo de WhatsApp no cartão (só com tentativa de cobrança), nada a pagar num pedido que a loja já avançou, e o meio informado pela admin num pedido pago por fora.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §O "defeito 01", §Os guardas, §Convenções, §Baselines, §CI e deploy), `apps/store/CLAUDE.md` › Minha conta e o detalhe do pedido, O PIX tem endereço (AD-042), O checkout NÃO exige conta; `packages/core/CLAUDE.md` › `orders/situation.ts`, `orders/*`, Pureza; `supabase/CLAUDE.md` › `checkout` (`get-order`); `DESIGN.md` › 1, 8. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (O que muda: `podePagarComPix`, cartão recusado/pendente, selo do cartão expirado; Decisões 9, 16, 21).

**Depende de.** 01 — o registro manual e os rótulos dos meios em `packages/core/src/orders/labels.ts`. Confira que existe antes de começar.

### Critérios de aceite

**UC-01**
- CA-01.1 Pedido PIX com pagamento pendente, não cancelado e sem pagamento confirmado mostra "Pagar com PIX" [código: apps/store/src/entities/order/lib/podePagarComPix.ts:40-45]
- CA-01.2 PIX vencido ou recusado até 7 dias depois do pedido mostra "Gerar novo PIX", com a data-limite [código: packages/core/src/orders/repix.ts:49-53]

**UC-02**
- CA-02.1 Pedido de cartão recusado ou pendente, não cancelado, mostra à cliente um informativo para entrar em contato pelo WhatsApp para resolver o pagamento [gate Q-01]
- CA-02.2 A loja não oferece à cliente, por conta própria, pagar de novo por cartão nem trocar o meio para PIX [gate Q-01]
- CA-02.3 Pedido de cartão com tentativa de pagamento sem resposta também mostra o informativo; pedido de cartão criado e nunca cobrado (abandonado no checkout) não aparece nas pendências da conta [r1 informativo-em-pedido-abandonado]

**UC-04**
- CA-04.3 A cliente vê o pedido como pago, com o selo e a jornada de sempre, o meio informado pela admin (ex.: "Transferência") e o mesmo total; nunca vê a observação nem o comprovante [r1 meio-que-a-cliente-ve]

**Não-funcionais**
- RNF-06 Tom memorial: nenhuma urgência na cópia para a cliente [código: CLAUDE.md topo]

CA-01.3 (o que aparece depois de 7 dias) é da tarefa 07; CA-01.4 e CA-01.5/01.6 são da tarefa 04. Esta tarefa cobre do UC-01 só o que a cliente vê antes disso.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| Regra de oferta (PIX pendente, PIX novo, informativo de cartão com tentativa, nada para avançado à mão) | VOCÊ ALTERA em `packages/core/src/orders/repix.ts` (`RepixInput` ganha a tentativa de cobrança, `mp_order_id`) e `apps/store/src/entities/order/lib/podePagarComPix.ts` | | |
| Estados do topo e pendências | VOCÊ ALTERA `apps/store/src/widgets/order-action/lib/orderActionState.ts`, `ui/OrderActionPanel.tsx`, `apps/store/src/entities/order/lib/attention.ts` | | |
| Meio informado à cliente (sem observação nem comprovante) na leitura do pedido: `get-order` e a leitura da cliente logada | VOCÊ CRIA (campo exposto, lido do registro manual da 01) | | |
| Bloco "Pagamento e entrega" | JÁ EXISTE. `apps/store/src/entities/order/ui/OrderPaymentDelivery.tsx:60-66`; voz em `apps/store/src/entities/order/lib/paymentDelivery.ts:19-26` | | |

### Decisões já tomadas

- Cartão recusado, ou pendente **com tentativa de cobrança** (`mp_order_id`), mostra o informativo de WhatsApp; pedido de cartão criado e nunca cobrado não aparece nas pendências.
- A loja não oferece por conta própria pagar de novo por cartão nem trocar para PIX (AD-003 revista; `OrderPaymentPage.tsx:219` já recusa não-PIX).
- Pedido avançado à mão para depois de Pago sem pagamento não oferece pagar (recorte no dono).
- A cliente vê o meio informado pela admin (ex.: "Transferência"), nunca a observação nem o comprovante; `orders.payment_method` não muda.
- Sem número de WhatsApp configurado, o informativo fica só com o texto (régua de `whatsappHref`).
- Selo do cartão expirado aparecendo como "PIX expirou" (`packages/core/src/orders/situation.ts:145`): corrija se aparecer nas telas tocadas.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Cartão e frase do topo | `apps/store/src/widgets/order-action/ui/OrderActionPanel.tsx › Cartao`, `ConversarNoWhatsApp`; `orderActionState.ts` |
| Pendência da conta | `apps/store/src/entities/order/lib/attention.ts`; `apps/store/src/widgets/order-attention/ui/AttentionList.tsx` |

Abra o arquivo antes de escrever o seu.

### Testes

- Unidade (core): PIX pendente oferece pagar; PIX vencido em 7 dias oferece novo; cartão recusado ou pendente com tentativa ⇒ informativo; abandonado sem tentativa ⇒ nada; avançado à mão ⇒ sem oferta.
- Página real (loja, `/pedido/:id` e `/conta`): cada estado acima com a cópia certa; pedido pago por fora mostra o meio informado e nunca a observação.
- Integração local: `get-order` devolve o meio informado e não devolve observação nem comprovante.

### Obrigações

- Módulo de `packages/core` que uma edge function importe: todo especificador relativo com `.ts` explícito, `import type` incluso; sem React, Supabase como valor, alias ou `node:`; nunca escreva a forma proibida de import em comentário (o bundler do `supabase start` lê comentário). `strictNullChecks` é `false`: veredito devolve `string | null` ou discrimina por literal de string.
- `situacaoComDonoUnico.test.ts`: nenhuma tabela de rótulos de status na loja; quem responde é `orderSituation`.
- `pagamentoComDonoUnico.test.ts` continua passando (nada de PIX fora do dono).
- Tom memorial: sem urgência, exclamação ou emoji; copy na primeira pessoa da Adri ("fale comigo"), mensagem técnica impessoal.
- Mobile primeiro: 390×844, 44 px, sem rolagem lateral.
- Gate: suíte da loja, core e functions (se `get-order` mudar), um workspace por vez.

### Não faça

- Não crie tela de cartão nem troca de meio (o link de cartão é a 06).
- Não implemente o "cancelado por falta de pagamento" (é a 07).

### Pronto quando

- [ ] cada estado de oferta provado pela regra pura e pela página real
- [ ] a cliente vê o meio informado e nunca observação/comprovante
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho de `CLAUDE.md` §Comandos/§Baselines (tipos do app tocado e de `packages/core`, na seção Comandos de verificação de `.specs/project/PROJECT.md`)

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
