## 07 · [supabase · packages/core · apps/store · apps/backoffice] Cancelamento automático — o job, o e-mail e o que a cliente vê

**Status:** done

`UC-01, UC-06` — 98

**Objetivo.** O pedido não pago em Pendente é cancelado sozinho em 7 dias, com a cobrança fechada, e a cliente vê que foi por falta de pagamento, com o WhatsApp.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §O "defeito 01", §Os guardas, §Convenções, §Baselines, §CI e deploy), `supabase/CLAUDE.md` › Edge functions, `send-notification`, `mercado-pago`, Migrations (`pg_cron`); `packages/core/CLAUDE.md` › `notifications`, `orders/*`; `apps/store/CLAUDE.md` › Minha conta e o detalhe do pedido; `apps/backoffice/CLAUDE.md` › Configurações (Notificações). Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (O que nasce: job, gatilho e evento, marcador; Decisões 1, 2, 13, 18, 23, 24).

**Depende de.** 02 — o instante do desfazer; 03 — a regra de fechar a cobrança aberta. Confira que existe antes de começar.

### Critérios de aceite

**UC-01**
- CA-01.3 Passados os 7 dias, o pedido já foi cancelado automaticamente e mostra o que diz o CA-06.5 [r1 janela-do-pix-x-cancelamento]

**UC-06**
- CA-06.1 Pedido ainda em "Pendente", sem pagamento confirmado, é cancelado automaticamente 7 dias depois de criado [gate Q-04; r1 recorte-do-cancelamento-automatico]
- CA-06.1a Não é cancelado: pedido que a loja já avançou (Pago, Separando, Enviado, Entregue), pedido com material da cliente enviado ou recebido, e pedido criado antes da publicação desta mudança [r1 recorte-do-cancelamento-automatico]
- CA-06.2 Pedido com pagamento registrado manualmente ou aprovado nunca é cancelado por esse prazo [conhecimento]
- CA-06.5 O pedido cancelado por falta de pagamento diz isso à cliente em /pedido/:id e /conta e mostra o WhatsApp [r1 janela-do-pix-x-cancelamento]
- CA-06.6 O cancelamento automático manda à cliente um e-mail próprio ("cancelado por falta de pagamento"), para todos os pedidos cancelados automaticamente. Quando cancelado pelo admin, não enviar email — isto é, o e-mail "cancelado por falta de pagamento" só sai no cancelamento automático; o cancelamento pela admin continua com a caixa de escolha, como hoje. O e-mail novo nasce desligado, como os outros, e a Adri o revisa e liga em Notificações [r1 aviso-do-cancelamento-automatico; handoff H-01, H-02]

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| Edge function agendada que cancela (recorte, fecha a cobrança, grava o marcador, dispara o e-mail) | VOCÊ CRIA | | |
| Agendamento (`pg_cron` + chamada da function), condicionado à extensão | VOCÊ CRIA (migration, molde `20261104120000_presenca-na-loja.sql:209-222`) | | |
| Marcador estruturado "cancelado por falta de pagamento" | VOCÊ CRIA (dado + regra em `core/orders`); nunca `cancel_reason` | | |
| Evento e gatilho do e-mail "cancelado por falta de pagamento", nascendo **desligado** | VOCÊ CRIA em `packages/core/src/notifications/events.ts`, `catalog.ts`, `defaults.ts`, render da `send-notification` e `check` de `order_notifications.event` recriado (molde `20260920120000_57-avisos-para-a-dona.sql`) | | |
| Data de corte (só pedidos criados depois da publicação) | VOCÊ CRIA, fixada na migration | | |
| Estado "cancelado por falta de pagamento" + WhatsApp em `/pedido/:id` e `/conta` | VOCÊ ALTERA `orderActionState.ts`, `OrderActionPanel.tsx`, `attention.ts` | | |
| Regra de fechar cobrança | JÁ EXISTE (03). Consuma `closeOpenCharge(deps, order)` exportada de `supabase/functions/mercado-pago/handlers.ts` (cancela a order do MP; nunca lança; devolve `fechada`/`nao_fechada`/`sem_cobranca`). A porta HTTP `mercado-pago?action=close-charge` é só do painel (`requireAdmin`, e recusa pedido em aberto com 409 `em_aberto`): uma function agendada não a chama | `{ mp_order_id }` | desfecho |

### Decisões já tomadas

- Recorte: `orders.status = 'pending'`, sem pagamento confirmado, sem material `material_enviado`/`material_recebido`, criado depois da publicação; 7 dias da criação, ou do desfazer (02) quando houver.
- O cancelamento roda como **edge function agendada** (um job SQL não chama o MP nem o motor).
- O e-mail novo só sai no cancelamento automático e nasce desligado; o cancelamento pela admin continua com a caixa de escolha, como hoje (H-01, H-02).
- Gerar link de cartão não adia o prazo.
- `pg_cron` no hospedado não foi confirmado: o agendamento é condicionado à extensão e avisa quando ela falta.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| E-mail de dentro de function | `supabase/functions/mercado-pago/handlers.ts › fireTrigger` com `dispatchTrigger` |
| Job condicionado à extensão | `supabase/migrations/20261104120000_presenca-na-loja.sql:209-222` |
| Recriar `check` de evento | `supabase/migrations/20260920120000_57-avisos-para-a-dona.sql` |

Abra o arquivo antes de escrever o seu.

### Testes

- Unidade (function, dublê): só pedidos do recorte são cancelados; o prazo reinicia do desfazer; executar duas vezes não repete efeito; fecha a cobrança e dispara o gatilho.
- Unidade (core): o gatilho produz o e-mail próprio; o catálogo, os padrões e os ícones cobrem o evento novo (desligado).
- Integração local: o job contra o banco local cancela só o recorte, com a data de corte.
- Página real (loja): pedido cancelado por falta de pagamento mostra a frase e o WhatsApp em `/pedido/:id` e `/conta`.

### Obrigações

- Migration nova em `supabase/migrations/` com o próximo prefixo livre (apure na hora: `ls supabase/migrations | tail`; o prefixo é a chave em `schema_migrations`, nunca repita). Aplique **só** no local (`supabase migration up --local`); nunca `--linked`, nunca `db push`. Migration aplicada é imutável (AD-017): recrie em migration nova.
- RLS de tabela nova: RLS ligada, `revoke all … from anon` (e `public`), policy `to authenticated` com `has_role(auth.uid(),'admin')` no `using` **e** no `with check`, nenhum `grant` — molde `supabase/migrations/20261108120000_95-observacao-do-pedido.sql`. Nada novo em colunas de `orders` que a cliente não deva ler (`get-order` devolve `orders` quase inteira, `supabase/functions/checkout/handlers.ts:710-715`; a cliente lê `select('*')`).
- Toda RPC nova chamada por código entra na lista literal de `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts` (com `create function` conferido na migration).
- Prove o que grava por probe contra o banco local (AD-012), numa transação desfeita, em `.specs/work-items/98-pagamento-que-falhou/probes/`.
- Módulo de `packages/core` que uma edge function importe: todo especificador relativo com `.ts` explícito, `import type` incluso; sem React, Supabase como valor, alias ou `node:`; nunca escreva a forma proibida de import em comentário (o bundler do `supabase start` lê comentário). `strictNullChecks` é `false`: veredito devolve `string | null` ou discrimina por literal de string.
- O `tsc` da loja (`npx tsc --noEmit -p apps/store/tsconfig.app.json`, baseline 0) cobre `supabase/functions/mercado-pago/handlers.ts` e o grafo que ele importa (`_shared/*`, `send-notification/dispatch.ts`, os módulos de `packages/core`): um teste da loja importa o handler real (`apps/store/src/pages/__tests__/OrderPaymentPagePrecoTravado.test.tsx`, tarefa 04). Toda linha nova nesse grafo conta na baseline de tipos da loja. Com `strictNullChecks` falso, o padrão de recusa das functions `if (!auth.ok) return json({ error: auth.error }, auth.status)` dá TS2339 ali: leia o ramo da recusa com o tipo dele, como `closeCharge` faz (`const recusa = auth as { status: number; error: string }`). Rode também esse `tsc` no fecho.
- Vocabulário de eventos com um dono: `orderNotificationsSchema`, `storeSettingsDefaults`, `catalog.test.ts`, `eventIcons.test.ts`, `notificationSingleOwner`.
- `wiringResolve.test.ts` e `config.toml` da function nova.
- Tom memorial no e-mail e na loja.
- Gate: suítes de functions, core, loja e backoffice, um workspace por vez. Ordem de publicação: migration → functions → bundles.

### Não faça

- Não cancele pedidos importados, avançados à mão ou com material enviado/recebido.
- Não mexa na caixa de aviso do cancelamento pela admin.

### Pronto quando

- [ ] o job cancela só o recorte, provado contra o banco local
- [ ] o evento novo existe desligado e o e-mail sai quando ligado
- [ ] a loja mostra "cancelado por falta de pagamento" com WhatsApp
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
