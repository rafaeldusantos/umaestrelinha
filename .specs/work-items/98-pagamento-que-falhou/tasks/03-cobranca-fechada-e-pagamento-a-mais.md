## 03 · [supabase · packages/core · apps/backoffice] Cobrança fechada e pagamento a mais — servidor e selos no bloco Pagamento

**Status:** done

`UC-02, UC-03, UC-06` — 98

**Objetivo.** Cancelar ou registrar um pedido fecha a cobrança aberta no Mercado Pago, o servidor recusa cobrar pedido cancelado ou pago, e uma aprovação que chega depois não repete efeitos e aparece no painel como "pago duas vezes" ou "pago depois de cancelado".

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §O "defeito 01", §Os guardas, §Convenções, §Baselines, §CI e deploy), `supabase/CLAUDE.md` › Edge functions, `mercado-pago`, `send-notification`, Migrations; `apps/backoffice/CLAUDE.md` › Pedidos e a fila de material, O aviso à cliente é escolha (88); `packages/core/CLAUDE.md` › `orders/*`, `notifications`, Pureza. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (O que muda: `create-payment`, `apply_payment_approval`, webhook, precondição, cancelar pelo painel; O que nasce: marcadores; Decisões 2, 3, 22).

**Depende de.** 01 — o registro manual e o bloco Pagamento com o registro. Confira que existe antes de começar.
**Habilita.** a regra de fechar a cobrança aberta (que a 06 e a 07 reaproveitam) e a recusa de pedido cancelado/pago na `create-payment` (que a 06 estende).

### Critérios de aceite

**UC-02**
- CA-02.4 Pedido cancelado não oferece pagamento em tela nenhuma, e o servidor recusa a cobrança [conhecimento]

**UC-03**
- CA-03.5a Ao registrar, o código PIX ou o link de cartão em aberto deixam de poder ser pagos [r1 pagamento-em-dobro]
- CA-03.5b Se um pagamento da loja for aprovado num pedido já pago (registrado ou não), o pedido não repete estoque, cupom nem e-mail, e o bloco Pagamento mostra "Pago duas vezes — devolver um dos valores" [r1 pagamento-em-dobro]
- CA-03.16 Pedido avançado à mão para depois de "Pago" sem pagamento registrado mostra no bloco Pagamento "Pagamento não registrado" com a ação de registrar, e a cliente não vê oferta de pagar de novo nele [r1 outros-caminhos-que-marcam-pago]

**UC-06**
- CA-06.3 Ao cancelar, o código PIX ou a cobrança de cartão em aberto deixam de poder ser pagos [r1 cancelamento-com-cobranca-aberta]
- CA-06.4 Se ainda assim um pagamento for aprovado depois do cancelamento, o pedido continua cancelado, nada é baixado do estoque, a cliente não recebe "pagamento confirmado" e o painel mostra o pedido como "Pago depois de cancelado — devolver o valor" [r1 cancelamento-com-cobranca-aberta]

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| Recusa de `orders.status = 'cancelled'` e de pedido pago/registrado em `create-payment`, antes de escrita ou chamada ao MP | VOCÊ CRIA em `supabase/functions/mercado-pago/handlers.ts` (perto de `:381-386`) | | erro 4xx com código |
| Porta admin que fecha a cobrança aberta de um pedido (usada ao cancelar pelo painel e ao registrar) | VOCÊ CRIA (ação admin numa function existente ou nova, `requireAdmin`), reaproveitando `cancelPreviousOrder` | `order_id` | desfecho |
| Marcadores estruturados "pago duas vezes" e "pago depois de cancelado" (dado + regra em `core/orders`) e o "Pagamento não registrado" (derivado: status além de Pago sem pagamento aprovado) | VOCÊ CRIA | | |
| `apply_payment_approval` recriada: em pedido cancelado não grava `paid_at`/estoque/cupom e marca; em pedido já pago marca em vez de calar | VOCÊ CRIA (migration nova sobre a versão da 01) | | |
| Precondição de `order_paid`/`material_instructions` recusa pedido cancelado | VOCÊ ALTERA `packages/core/src/notifications/precondition.ts` (perto de `:88-96`) | | |
| `cancelPreviousOrder` | JÁ EXISTE. Consuma. `mercado-pago/handlers.ts › cancelPreviousOrder` | | |
| Webhook | JÁ EXISTE. `mercado-pago/handlers.ts:1355-1416` (no-op silencioso em `:1376-1393`; `duplicate_approved_other_order` em `:1357-1375`) | | |
| Cancelar pelo painel | JÁ EXISTE. `apps/backoffice/src/entities/order/api/useAdminOrders.ts › cancelOrder` (única entrada da allowlist de `pedidoGravadoSoPeloDono`) | | |

### Decisões já tomadas

- Qualquer cancelamento (automático ou pela admin) fecha a cobrança aberta no MP; a caixa de aviso do cancelamento pela admin continua como hoje (H-01).
- Registrar (01) também fecha a cobrança aberta: chame a porta desta tarefa no fluxo de registro.
- Aprovação em pedido cancelado: o pedido continua cancelado, nada de estoque, cupom, `paid_at` de venda nem e-mail; o painel mostra "Pago depois de cancelado — devolver o valor".
- Aprovação em pedido já pago (registrado ou não): nada se repete; o painel mostra "Pago duas vezes — devolver um dos valores".
- `purchase` do GA4 não sai em "pago duas vezes" nem em "pago depois de cancelado" (`mercado-pago/handlers.ts › sendPurchase`).
- Pedido avançado à mão para depois de Pago sem pagamento mostra "Pagamento não registrado" com a ação de registrar (a tela da 01).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Recriar a função | `supabase/migrations/20261030120000_pagamento-aprovado-marca-pago.sql` e a versão que a 01 criou |
| Envio de efeito a partir de function | `supabase/functions/mercado-pago/handlers.ts › fireTrigger` |
| Ação admin numa function | `supabase/functions/send-notification/handlers.ts › runTrigger` (exige admin) |

Abra o arquivo antes de escrever o seu.

### Testes

- Unidade (functions, dublê): `create-payment` recusa pedido cancelado e pedido pago sem chamar o MP.
- Unidade (functions, dublê): o webhook em pedido cancelado e em pedido já pago marca, não repete efeito nem e-mail nem `purchase`.
- Unidade (core): a precondição recusa "pagamento confirmado" em pedido cancelado; a regra de "Pagamento não registrado".
- Integração local (function servida com chaves externas inválidas, molde da 89): pedido cancelado ⇒ recusa sem chamar o MP.
- Integração local (probe SQL): `apply_payment_approval` em pedido cancelado não grava `paid_at`/estoque/cupom e marca; em pedido pago, marca.
- Página real (painel): os três selos aparecem no bloco Pagamento; cancelar pelo painel chama a porta de fechar cobrança.

### Obrigações

- Migration nova em `supabase/migrations/` com o próximo prefixo livre (apure na hora: `ls supabase/migrations | tail`; o prefixo é a chave em `schema_migrations`, nunca repita). Aplique **só** no local (`supabase migration up --local`); nunca `--linked`, nunca `db push`. Migration aplicada é imutável (AD-017): recrie em migration nova.
- RLS de tabela nova: RLS ligada, `revoke all … from anon` (e `public`), policy `to authenticated` com `has_role(auth.uid(),'admin')` no `using` **e** no `with check`, nenhum `grant` — molde `supabase/migrations/20261108120000_95-observacao-do-pedido.sql`. Nada novo em colunas de `orders` que a cliente não deva ler (`get-order` devolve `orders` quase inteira, `supabase/functions/checkout/handlers.ts:710-715`; a cliente lê `select('*')`).
- Toda RPC nova chamada por código entra na lista literal de `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts` (com `create function` conferido na migration).
- Prove o que grava por probe contra o banco local (AD-012), numa transação desfeita, em `.specs/work-items/98-pagamento-que-falhou/probes/`.
- Módulo de `packages/core` que uma edge function importe: todo especificador relativo com `.ts` explícito, `import type` incluso; sem React, Supabase como valor, alias ou `node:`; nunca escreva a forma proibida de import em comentário (o bundler do `supabase start` lê comentário). `strictNullChecks` é `false`: veredito devolve `string | null` ou discrimina por literal de string.
- `apps/store/src/shared/lib/__tests__/pagamentoMarcaPagoSchema.test.ts` e o probe `supabase/operacoes/pagamento-aprovado-marca-pago.probe.sql` contra a versão nova.
- `supabase/functions/_shared/__tests__/wiringResolve.test.ts`: todo nome chamado no `index.ts` importado ou declarado; lógica em `handlers.ts` (AD-004).
- Ordem de publicação desta tarefa: migration → functions (`mercado-pago`, a que hospeda a porta) → bundle do painel.
- Gate: suíte de functions, core, backoffice e loja, um workspace por vez.

### Não faça

- Não mude o preço cobrado (é a 04) nem crie o link de cartão (06) ou o job de cancelamento (07).
- Não tire a caixa de aviso do cancelamento pela admin.

### Pronto quando

- [ ] `create-payment` recusa pedido cancelado e pago antes do MP
- [ ] cancelar pelo painel e registrar fecham a cobrança aberta
- [ ] aprovação em cancelado/pago marca, não repete efeito e aparece no painel
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
