## 01 · [supabase · packages/core · apps/backoffice] Registrar pagamento — tela do pedido no painel

**Status:** done

`UC-03, UC-04` — 98

**Objetivo.** A admin registra, numa tela própria do pedido, um pagamento feito por fora da loja (meio, data e hora, observação, até 3 comprovantes) e o pedido passa a se comportar em todo lugar como pago; o bloco Pagamento mostra o registro.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §O "defeito 01", §Os guardas, §Convenções, §Baselines, §CI e deploy), `apps/backoffice/CLAUDE.md` › Molde dos formulários, Pedidos e a fila de material, O aviso à cliente é escolha (feature 88), Dívidas conhecidas (upload); `packages/core/CLAUDE.md` › Pureza, `order-actions`, `orders/*`, Convenções de tipo; `supabase/CLAUDE.md` › Migrations, RLS, `mercado-pago` (`apply_payment_approval`), `send-notification`; `DESIGN.md` › 1, 8. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (O que muda: bloco Pagamento, `apply_payment_approval`, gatilhos, Pendente→Pago, lote; O que nasce: RPC registrar, tabelas, bucket privado, envio de comprovante, ação em `core/order-actions`, campo de data e hora, rótulos dos meios).

**Habilita.** a tabela do registro manual (com o `payment_status` anterior e as quantidades baixadas de estoque) que a 02 desfaz, a 03 cruza com o webhook e a 08 lê; a ação de `core/order-actions` que a 02 imita; o bloco Pagamento em que 02, 03 e 06 acrescentam ações e selos.

### Critérios de aceite

**UC-03**
- CA-03.1 A ação existe para pedido com pagamento pendente, recusado ou vencido e não cancelado [pedido]
- CA-03.2 Pede meio, data, observação e comprovantes, todos opcionais; até 3 comprovantes (JPG, PNG, WebP, HEIC ou PDF), 10 MB cada [gate Q-03; r1 formatos-de-imagem]
- CA-03.2a O meio é escolhido numa lista fixa: PIX direto, transferência, dinheiro, cartão de crédito (link de outro gateway ou maquininha), outro [gate Q-06]
- CA-03.2b A data e a hora do pagamento são as informadas pela admin, já preenchidas com agora, no horário de Brasília; não podem ser no futuro nem antes da criação do pedido, e a recusa diz o motivo [gate P-03; r1 limites-da-data-do-pagamento]
- CA-03.3 Ao confirmar, o pedido fica pago no pagamento, com a data do pagamento, e um pedido pendente avança para "Pago" [código: supabase/migrations/20261030120000_pagamento-aprovado-marca-pago.sql:46-56]
- CA-03.3a Se o pagamento foi aprovado pela loja (ou registrado por outra admin) enquanto o formulário estava aberto, a tela diz isso, não grava o registro e não guarda os comprovantes [r1 corrida-com-a-aprovacao]
- CA-03.4 O estoque baixa e o uso do cupom conta, como num pagamento pela loja [código: mesma migration:76-118]
- CA-03.5 Registrar duas vezes não repete nenhum efeito [r1 pagamento-em-dobro]
- CA-03.6 O histórico do pedido mostra "Pagamento registrado manualmente", quem fez e quando [código: useAdminOrders.ts:140-154; core/order-actions]
- CA-03.7 O pedido entra na venda do Dashboard e da Início pela data do pagamento [código: 20261104140000_acessos-com-sacola.sql:269-276]
- CA-03.8 A admin escolhe se a cliente recebe o e-mail de pagamento confirmado (ou as instruções de envio do material, quando o pedido espera material), no mesmo portão dos outros gestos; o aviso interno de pedido pago não sai para o registro feito no painel [r1 aviso-interno-do-proprio-registro]
- CA-03.9 Levar um pedido não pago a "Pago" pelo painel — pelo "Avançar mesmo assim", pelo "Outro status" ou pelo "Avançar status" em lote — abre o "Registrar pagamento"; o lote deixa de fora os pedidos não pagos e diz quantos ficaram [gate Q-05; r1 outros-caminhos-que-marcam-pago]
- CA-03.10 A recusa (arquivo grande, de tipo não aceito, mais de 3) aparece antes de qualquer gravação, com o motivo [conhecimento]

**UC-04**
- CA-04.1 O bloco Pagamento mostra o meio pelo nome (não o valor técnico), a data, quem registrou, a observação e os comprovantes [conhecimento]
- CA-04.2 O comprovante só abre para admin; o link expira e não é público [conhecimento]

**Não-funcionais**
- RNF-01 "Este pedido foi pago?" tem um dono só: a gravação manual produz o mesmo estado (`approved` + `paid_at`) que o webhook [código: CLAUDE.md "defeito 01"; precondition.ts:88-96]
- RNF-02 Toda escrita do pedido passa pelo dono da escrita (AD-059) [código: pedidoGravadoSoPeloDono.test.ts]
- RNF-03 Comprovante é dado pessoal e financeiro: armazenamento privado, leitura e escrita só para admin [conhecimento]
- RNF-04 O envio funciona em 390px (foto da galeria ou câmera do celular), com alvo de 44px e sem rolagem lateral [código: CLAUDE.md "Mobile é o caso principal"]
- RNF-07 O registro manual não dispara o evento de compra do Google Analytics [premissa ratificada pela recomendação, P-04]
- RNF-08 O registro guarda a origem manual, o meio, quem registrou, a data, a observação e os comprovantes de forma estruturada, não só como nota solta [premissa ratificada pela recomendação, P-05]

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| RPC admin de registrar pagamento (`order_id`, meio, pago_em, observação, caminhos dos comprovantes) → desfecho por string (`ok`, já pago, sem papel, recusa de data) | VOCÊ CRIA | painel via `core/order-actions` | desfecho |
| Tabela do registro manual (meio, pago_em, observação, autor `on delete set null` + nome gravado, `payment_status` anterior, quantidades baixadas por item/variação, desfeito_em/por/motivo — estes três só a 02 preenche) e tabela dos comprovantes (caminho, tipo, tamanho), só admin | VOCÊ CRIA | — | — |
| Bucket privado dos comprovantes (`public = false`, políticas `has_role`) | VOCÊ CRIA | — | URL assinada curta |
| `apply_payment_approval` recriada: aceita data e autor (a do webhook segue com `now()` e autor nulo), devolve as quantidades baixadas, mantém idempotência por `paid_at is null` | VOCÊ CRIA (migration nova) | — | — |
| Gatilho do registro manual (só os e-mails da cliente: `order_paid` ou `material_instructions`, sem `owner_order_paid`) | VOCÊ CRIA em `packages/core/src/notifications/triggers.ts` | — | — |
| Rótulos dos meios manuais (PIX direto, transferência, dinheiro, cartão de crédito, outro) nas duas vozes | VOCÊ CRIA em `packages/core/src/orders/labels.ts` | — | — |
| Rota da tela "Registrar pagamento" sob o `RequireAdmin` | VOCÊ CRIA em `apps/backoffice/src/app/App.tsx` | — | — |
| `apply_payment_approval` atual | JÁ EXISTE. `supabase/migrations/20261030120000_pagamento-aprovado-marca-pago.sql:23-128` | — | — |
| Porta `trigger` do motor com `customer: false` | JÁ EXISTE. Consuma; não altere. `supabase/functions/send-notification/handlers.ts › runTrigger` | | |
| Portão de aviso | JÁ EXISTE. Consuma; não altere. `apps/backoffice/src/features/order-notice › useGestoComAviso`, `NoticeDialog.tsx`; `core/notifications/notice.ts › customerNoticeFor` | | |
| `bulkMaterial.ts › runStatusBulk` + `bulkSummary` | JÁ EXISTE. Estenda | | |

### Decisões já tomadas

- "Registrar pagamento" é **tela própria** do pedido, não modal ("Editor é TELA"); "Avançar mesmo assim", "Outro status" (inclusive o salto de não pago direto para Separando/Enviado/Entregue) e o lote levam um pedido não pago a ela; o lote exclui os não pagos e diz quantos ficaram.
- A porta manual chama o **mesmo corpo** de `apply_payment_approval` (data e autor como parâmetro), sem copiar a baixa de estoque; linha de histórico "Pagamento registrado manualmente", com autor e quando, **mesmo sem mudança de status**.
- O meio informado mora no registro manual; `orders.payment_method` **não muda**.
- Observação e comprovantes nunca viram coluna de `orders`.
- `created_by`/autor das tabelas novas: `on delete set null` + nome gravado (molde da 95).
- `NEXT_STATUS` de `bulkMaterial.ts` passa a ler `PROXIMO` (hoje não exportado: exporte-o) de `packages/core/src/orders/nextStep.ts` (era cópia).
- HEIC aceito e guardado como chegou; no painel abre como download.
- Todos os campos do formulário são opcionais (gate Q-03); data/hora de Brasília, não futura, não anterior à criação do pedido.
- O aviso interno "pedido pago" à dona não sai no registro manual; a admin escolhe o e-mail da cliente no portão da 88.
- O registro manual não dispara o `purchase` do GA4.
- Não fechar aqui a cobrança aberta no Mercado Pago (é a 03).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Escrita por RPC no dono, client injetado | `packages/core/src/order-actions/material.ts › writeMaterialStatus`; `apps/backoffice/src/entities/order/api/useAdminOrders.ts › setMaterialStatus` |
| Tabela só de admin com autor e nome | `supabase/migrations/20261108120000_95-observacao-do-pedido.sql`; `packages/core/src/order-actions/adminNote.ts › writeAdminNote` |
| Recriar `apply_payment_approval` | `supabase/migrations/20261030120000_pagamento-aprovado-marca-pago.sql` + `apps/store/src/shared/lib/__tests__/pagamentoMarcaPagoSchema.test.ts` |
| Políticas de storage com `has_role` | `supabase/migrations/20260815120000_24-home-gerenciavel.sql:240-275 — policies do bucket home-images` (sem `public` e sem leitura pública) |
| Portão de aviso no gesto | `apps/backoffice/src/pages/admin/AdminOrderPage.tsx:160-180 — uso de useGestoComAviso` |
| Validação de arquivo antes da rede | `apps/backoffice/src/shared/lib/uploadImage.ts › validateImageFile`/`uploadFailureMessage` (o envio dele não serve: é público e comprime) |
| Formulário do painel | `apps/backoffice/src/shared/ui › FormCard`, `FieldGroup`, `ActionButton`, `RecordPageHeader` |
| Lote que exclui e conta | `apps/backoffice/src/features/order-list/model/bulkMaterial.ts › runStatusBulk` (`untouched`) |

Abra o arquivo antes de escrever o seu.

### Testes

- Integração local (probe): registrar grava `approved`, `paid_at` = data informada, `pending→paid`, uma linha de histórico com autor, estoque uma vez, `used_count` do cupom +1; o pedido entra em `store_movement`/`store_overview` pela data informada.
- Integração local: registrar duas vezes e por duas sessões não repete efeito; registrar com o pedido já aprovado recusa sem gravar nada.
- Integração local: data futura e anterior à criação recusadas com motivo.
- Integração local: cliente logada e `anon` não leem nem gravam as tabelas novas nem o bucket; a URL assinada expira; `order_list` e a leitura da cliente não trazem observação nem comprovante.
- Unidade (core): o gatilho do registro manual produz o e-mail da cliente (pago, ou instruções do material) e não o aviso interno.
- Unidade (core): a data local de Brasília vira o instante certo; recusas de data.
- Unidade: recusa de arquivo (tipo, 10 MB, mais de 3) antes da rede.
- Unidade (core): os rótulos dos meios na voz do painel e na da cliente.
- Unidade (core): o próximo passo de Pendente→Pago, e o "Outro status" de não pago para além de Pago, levam à tela de registro; o lote exclui os não pagos e conta.
- Página real (painel): o bloco Pagamento mostra meio pelo nome, data em Brasília, quem registrou, observação e comprovantes; o portão marca e desmarca o e-mail da cliente.

### Obrigações

- Migration nova em `supabase/migrations/` com o próximo prefixo livre (apure na hora: `ls supabase/migrations | tail`; o prefixo é a chave em `schema_migrations`, nunca repita). Aplique **só** no local (`supabase migration up --local`); nunca `--linked`, nunca `db push`. Migration aplicada é imutável (AD-017): recrie em migration nova.
- RLS de tabela nova: RLS ligada, `revoke all … from anon` (e `public`), policy `to authenticated` com `has_role(auth.uid(),'admin')` no `using` **e** no `with check`, nenhum `grant` — molde `supabase/migrations/20261108120000_95-observacao-do-pedido.sql`. Nada novo em colunas de `orders` que a cliente não deva ler (`get-order` devolve `orders` quase inteira, `supabase/functions/checkout/handlers.ts:710-715`; a cliente lê `select('*')`).
- Toda RPC nova chamada por código entra na lista literal de `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts` (com `create function` conferido na migration).
- Prove o que grava por probe contra o banco local (AD-012), numa transação desfeita, em `.specs/work-items/98-pagamento-que-falhou/probes/`.
- Módulo de `packages/core` que uma edge function importe: todo especificador relativo com `.ts` explícito, `import type` incluso; sem React, Supabase como valor, alias ou `node:`; nunca escreva a forma proibida de import em comentário (o bundler do `supabase start` lê comentário). `strictNullChecks` é `false`: veredito devolve `string | null` ou discrimina por literal de string.
- `apps/store/src/shared/lib/__tests__/pagamentoMarcaPagoSchema.test.ts` lê a migration **vigente** da função: ele tem de continuar passando contra a nova; rode também o probe `supabase/operacoes/pagamento-aprovado-marca-pago.probe.sql`.
- Escrita do pedido só pelo dono (AD-059, `pedidoGravadoSoPeloDono.test.ts`): a ação nova mora em `packages/core/src/order-actions/` e é exportada no `index.ts` dele; nenhum `update` novo em `orders` fora dele.
- `avisoComDonoUnico.test.ts`: "avisa?" só por `customerNoticeFor`; acrescente o gesto novo ao portão.
- Fuso só por `STORE_TIME_ZONE` / `store_time_zone()` (`fusoComDonoUnico.test.ts`).
- Arquivos de UI novos do painel com movimento entram em `animacaoRespeitaMovimento.test.ts` (par `motion-reduce:`).
- Rota nova do painel dentro do bloco do `RequireAdmin` (`rotasSobGuarda.test.ts`); se for destino de navegação, `navItems`/`focusRoutes`.
- Mobile primeiro: 390×844, alvos de 44 px, sem rolagem lateral; câmera e galeria no campo de arquivo (`accept`).
- Gate: suíte do backoffice **e** da loja (os guardas da loja varrem o painel), um workspace por vez, `--testTimeout=20000` sem o `--`, exit code fora de pipe.

### Não faça

- Não implemente o desfazer (é a 02), o fechamento da cobrança no MP nem os selos "pago duas vezes"/"pago depois de cancelado"/"Pagamento não registrado" (é a 03), o link de cartão (06), nem a leitura no app do ateliê (08).
- Não mude `orders.payment_method`; não grave observação, comprovante nem meio em coluna de `orders`.
- Não use `shared/lib/uploadImage.ts` para enviar comprovante (é público e comprime).
- Não aplique migration fora do banco local; não faça commit.

### Pronto quando

- [ ] a tela de registro grava pela RPC e o probe local mostra `approved` + `paid_at` informado + histórico + estoque e cupom uma vez
- [ ] registrar de novo ou com o pedido aprovado não repete efeito e a tela diz isso
- [ ] o bloco Pagamento mostra meio, data, autor, observação e comprovantes por URL assinada
- [ ] os três caminhos para Pago levam à tela; o lote exclui e conta
- [ ] `pagamentoMarcaPagoSchema`, `marcacaoSoPorAcao`, `pedidoGravadoSoPeloDono` e `avisoComDonoUnico` passando
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
