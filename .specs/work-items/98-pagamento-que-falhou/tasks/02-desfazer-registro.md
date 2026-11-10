## 02 · [supabase · packages/core · apps/backoffice] Desfazer o registro — ação no bloco Pagamento do painel

**Status:** done

`UC-03` — 98

**Objetivo.** A admin desfaz um pagamento registrado à mão, com motivo, e o pedido volta a não pago com estoque, cupom e venda devolvidos.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §O "defeito 01", §Os guardas, §Convenções, §Baselines, §CI e deploy), `apps/backoffice/CLAUDE.md` › Molde dos formulários, Pedidos e a fila de material; `packages/core/CLAUDE.md` › `order-actions`, `payment`, Convenções de tipo; `supabase/CLAUDE.md` › Migrations, RLS. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (O que nasce: RPC admin "desfazer registro"; Decisões 6 e 14).

**Depende de.** 01 — a tabela do registro manual (com `payment_status` anterior e quantidades baixadas), a ação de registrar em `core/order-actions` e o bloco Pagamento com o registro. Confira que existe antes de começar.
**Habilita.** o instante do desfazer, a partir do qual a 07 reconta o prazo do cancelamento automático.

### Critérios de aceite

**UC-03**
- CA-03.11 O registro manual pode ser desfeito por admin, informando o motivo. Desfazer devolve o pagamento ao estado anterior ao registro, tira a data do pagamento, devolve o pedido de "Pago" para "Pendente", devolve ao estoque o que foi baixado e devolve o uso do cupom; o pedido sai da venda do Dashboard e da Início. Observação e comprovantes ficam guardados no histórico. Desfazer fica no histórico, com quem fez, quando e o motivo [gate Q-07; r1 desfazer-registro-efeitos]
- CA-03.12 Pagamento aprovado pelo meio de pagamento da loja não tem "Desfazer" [r1 desfazer-registro-efeitos]
- CA-03.13 Desfazer só é possível enquanto o pedido está em "Pago"; com o pedido em Separando, Enviado ou Entregue a ação não aparece [r1 desfazer-limites]
- CA-03.14 Desfazer não manda e-mail à cliente [r1 desfazer-limites]
- CA-03.15 Um registro desfeito volta a contar o prazo do cancelamento automático a partir do desfazer [r1 desfazer-limites]

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| RPC admin de desfazer (`order_id`, motivo) → desfecho por string | VOCÊ CRIA | painel via `core/order-actions` | desfecho |
| Campos desfeito_em/por/motivo do registro manual — `order_manual_payments.undone_at`, `undone_by` (`on delete set null`), `undone_by_name` e `undone_reason` | JÁ EXISTE (criados na 01). Preencha | | |
| Tabela do registro manual (`order_manual_payments`, no máximo um vivo por pedido: índice único parcial `where undone_at is null`) e o `payment_status` anterior (`previous_payment_status`) / quantidades baixadas (`stock_deducted`, jsonb `[{variant_id \| product_id, quantidade}]`) | JÁ EXISTE (01, migrations `20261112120000` e `20261112130000`). Consuma | | |
| Ação de registrar em `packages/core/src/order-actions/` | JÁ EXISTE (01). Imite | | |

### Decisões já tomadas

- Desfazer é exceção explícita de "aprovado não regride" (`packages/core/src/payment/status.ts:15-22`), **só para origem manual**, e é RPC própria **fora de `canTransition`** — a exceção não pode vazar para o webhook.
- Volta o `payment_status` anterior gravado no registro, tira `paid_at`, devolve o pedido de Pago para Pendente, devolve ao estoque **as quantidades efetivamente baixadas** (gravadas no registro) e o uso do cupom; o pedido sai da venda do Dashboard e da Início.
- Só com o pedido em "Pago"; em Separando/Enviado/Entregue a ação não aparece; pagamento aprovado pela loja não tem "Desfazer".
- Não manda e-mail à cliente; observação e comprovantes ficam guardados; o desfazer vai ao histórico com quem, quando e motivo.
- O instante do desfazer fica gravado para o prazo do cancelamento automático recomeçar dele (a 07 lê).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| RPC admin + escrita no dono | a ação de registrar que a 01 criou em `packages/core/src/order-actions/`; `packages/core/src/order-actions/material.ts › writeMaterialStatus` |
| Linha de histórico com motivo | a linha "Pagamento registrado manualmente" que a 01 criou |

Abra o arquivo antes de escrever o seu.

### Testes

- Integração local (probe): desfazer deixa `paid_at` nulo, o `payment_status` anterior, `paid→pending`, estoque e `used_count` devolvidos, observação preservada, histórico com motivo; o pedido sai de `store_movement`/`store_overview`.
- Integração local: desfazer recusado com o pedido fora de `paid` e num pagamento aprovado pela loja.
- Página real (painel): "Desfazer" só aparece em Pago e para registro manual; pede motivo; não abre o portão de e-mail.

### Obrigações

- Migration nova em `supabase/migrations/` com o próximo prefixo livre (apure na hora: `ls supabase/migrations | tail`; o prefixo é a chave em `schema_migrations`, nunca repita). Aplique **só** no local (`supabase migration up --local`); nunca `--linked`, nunca `db push`. Migration aplicada é imutável (AD-017): recrie em migration nova.
- RLS de tabela nova: RLS ligada, `revoke all … from anon` (e `public`), policy `to authenticated` com `has_role(auth.uid(),'admin')` no `using` **e** no `with check`, nenhum `grant` — molde `supabase/migrations/20261108120000_95-observacao-do-pedido.sql`. Nada novo em colunas de `orders` que a cliente não deva ler (`get-order` devolve `orders` quase inteira, `supabase/functions/checkout/handlers.ts:710-715`; a cliente lê `select('*')`).
- Toda RPC nova chamada por código entra na lista literal de `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts` (com `create function` conferido na migration).
- Prove o que grava por probe contra o banco local (AD-012), numa transação desfeita, em `.specs/work-items/98-pagamento-que-falhou/probes/`.
- Módulo de `packages/core` que uma edge function importe: todo especificador relativo com `.ts` explícito, `import type` incluso; sem React, Supabase como valor, alias ou `node:`; nunca escreva a forma proibida de import em comentário (o bundler do `supabase start` lê comentário). `strictNullChecks` é `false`: veredito devolve `string | null` ou discrimina por literal de string.
- Escrita do pedido só pelo dono (AD-059); gate com a suíte do backoffice e a da loja.

### Não faça

- Não mexa em `canTransition` nem no webhook.
- Não implemente o cancelamento automático (07) nem os selos da 03.
- Não envie e-mail no desfazer.

### Pronto quando

- [ ] o probe local mostra o pedido de volta a Pendente com estoque, cupom e venda devolvidos e o histórico com motivo
- [ ] a ação só aparece em Pago e para registro manual
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
