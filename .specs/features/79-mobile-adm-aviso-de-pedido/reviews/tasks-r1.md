# Revisão — Tasks (rodada 1)
Veredito: APROVADO

## Achados

### R1 — O lado do APP de `MAN-34` não tem asserção na árvore do app, e o arquivo que muda não está no *Where* (menor)
- Onde: `tasks.md`, T05, *Where* (lista `settings.ts`, `history.ts`, `send-notification/handlers.ts` e `apps/backoffice/src/**/OrderHistory*.test.tsx`) e *Done when* ("o `select` do app pede `provider_message_id` (se não pedir, acrescentado aqui, com teste)").
- Problema: `MAN-34` diz "painel **e** app". Conferido: `apps/mobile-adm/src/entities/order/model/linha.ts:29-30` define `COLUNAS_DAS_NOTIFICACOES = 'id, event, channel, status, attempts, delivery_status, error, created_at, sent_at'` — **sem** `provider_message_id`, então a mudança no app é certa, não condicional, e o arquivo não está no *Where*. O par de UI (`L-064`) é pedido só no painel; no app, `widgets/order-detail/ui/Historico.tsx` decide o alerta por `ev.kind === 'email' && ev.emailSent === false`, e nenhum caso desenha uma linha de push pela página real do app.
- Cenário: o detalhe "Entregue a X de Y aparelhos" nunca aparece no app se o `select` não for alterado (o `buildHistory` recebe `provider_message_id` indefinido), e a suíte do app fica verde porque nenhum caso monta o histórico com uma linha `channel = 'push'`.
- Sugestão: pôr `entities/order/model/linha.ts` no *Where* da T05, tirar o "se não pedir" e acrescentar um caso pelo detalhe real do app (`PedidoPage`) com uma linha de push enviada parcial (título com `(Celular)`, detalhe exato) e uma falha (título `O aviso no celular não chegou.`, em alerta).

### R2 — `T10` usa `orderStateFailure` (T04) sem declarar a dependência (menor)
- Onde: `tasks.md`, T10 *Depends on*: `T09`; cadeia T09 → T05 → T03; T04 fora dela. A tabela "Diagrama × dependências" marca T10 ✅.
- Problema: a metade push de `forEvent` chama `orderStateFailure`, que nasce na T04. A ordem só funciona porque o plano de execução é sequencial; o campo *Depends on* não descreve a dependência real.
- Cenário: se alguém paralelizar as fases ou reordenar a Fase 1 confiando nos *Depends on*, a T10 começa sem a função.
- Sugestão: `T10 — Depends on: T04, T09`.

### R3 — O Full gate deixa `catalog-import` de fora, e a T27 promete seis workspaces (menor)
- Onde: *Gate Check Commands*, linha Full ("core + functions + mobile-adm + store + backoffice") e Build ("Full + `tsc` …"); T27 *Done when* ("os seis workspaces um por vez").
- Problema: o Build gate é definido como Full + tipos + lint + build, e o Full não roda a suíte de `catalog-import`. A T27 cobra seis. Os scripts conferidos existem (`@estrelinha/{core,functions,mobile-adm,store,backoffice,catalog-import}` todos com `test`; os sete `tsconfig` citados existem).
- Cenário: quem seguir só a tabela fecha a T27 com cinco suítes e a baseline de `catalog-import` sem remedição.
- Sugestão: incluir `catalog-import` na definição do Build gate.

### R4 — Duas metades de ACs do motor sem caso explícito (menor)
- Onde: T09 *Done when*; spec `MAN-05` (segunda frase) e `MAN-07` ("**não** retenta dentro do mesmo envio").
- Problema: a T09 prova `claim` nulo ⇒ `already_sent`, mas não que uma linha `failed` de push é reivindicada de novo na retentativa (a T08 prova o `check` de canal, não o `claim` sobre linha `push` `failed`); e "uma tentativa por aparelho por envio" não tem asserção (um laço de retentativa sobre 429 passaria).
- Cenário: um mutante que repete o POST no 429/5xx sobrevive à suíte; a retomada depois de falha total só é provada pela RPC da `42`, para o canal `email`.
- Sugestão: na T09, `sender.send` chamado exatamente uma vez por inscrição no caso de falha; na T08 (ou T26), `claim_order_notification` sobre uma linha `push` `failed` devolve a linha.

### R5 — As chaves VAPID de dev no `.env` da raiz reabrem o caminho de `BL-044` (menor)
- Onde: cabeçalho *Banco e functions* ("As chaves VAPID de dev vão no `.env` da raiz") e T02.
- Problema: o `CLAUDE.md` raiz registra que `supabase secrets set` rodado da raiz mescla o `.env` local (sete secrets de produção sobrescritos). Com `VAPID_KEYS` de dev ali, a mesma mescla gravaria as chaves de dev em produção, sem erro. A T14 documenta o procedimento seguro, mas a T29 não lista o risco como operação.
- Cenário: no dia de gravar as chaves de produção, um `secrets set` da raiz sobe as de dev; o push sai assinado com a chave errada e as inscrições feitas com a pública de produção param de receber.
- Sugestão: na T29, escrever esta consequência junto da pendência "gerar e gravar as chaves de produção".

## Conferido sem achado
- Rastreabilidade: os 42 `MAN-xx` aparecem na tabela "Requisito → Task" e em *Reqs* de ao menos uma task; nenhuma task sem requisito (T01, T27 e T29 apontam o gate de regressão e `MAN-42`; T02 aponta o risco R1 do Design).
- Cada passo 1–10 de `deliverPush` (design §4.2), as seis ações da porta (§4.3) e os cinco casos de tradução de erro (§4.5) têm caso nomeado na T09, T13 e T17.
- Fiação do webhook (R5 do Design) provada por comportamento pelo handler real na T11, com o mutante "sem o repasse em `fireTrigger`"; `fireTrigger` existe em `supabase/functions/mercado-pago/handlers.ts:98`.
- A porta `trigger` usada na T28 existe (`send-notification/handlers.ts:340`).
- Guardas citados existem nos caminhos indicados: `orderNotificationsSchema`, `chaveDeServidorForaDoNavegador`, `marcacaoSoPorAcao`, `emailCheckWorkflow` (store); `swSemDadosDaLoja`, `vercelConfig`, `rotasSobGuarda`, `abasSaoAsRotas`, `escritaSoPelaPorta`, `leituraSoComPapel`, `clientRealPareado` (mobile-adm); `wiringResolve`, `http.test` (functions); `precondition.test`, `orders/__tests__/history.test` (core). `NOTIFICATION_CHANNELS` (`core/notifications/settings.ts:13`) não é comparado com o SQL por nenhum guarda, então acrescentar `push` na T05 antes da migration da T06 não quebra o gate.
- Dependências sem ciclo e nenhuma aponta para fase posterior; a ordem core → banco → motor/porta → app → tela/SW → fecho é executável.
- Prefixo de migration `20261026120000` livre (a última no disco é `20261025120000`).
- Convenções: itens com `NN-nome-em-kebab-case`; nenhum commit por task, sub-agentes sem `git stash`/`reset` (BL-012); branch derivada de `feature/mobile-adm` (AD-056); só banco local, sem `db reset`/`stop --all`/`db push`/`secrets set`/`deploy`.
- Matriz de testes cobre cada camada tocada, inclusive o que jsdom não alcança (SW em `vm`, client real, probe, navegador); a validação de co-localização bate com a matriz. Os comandos de gate usam `--testTimeout=20000` sem o `--`, como o `CLAUDE.md` exige.
