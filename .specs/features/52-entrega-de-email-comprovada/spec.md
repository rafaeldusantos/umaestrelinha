# Entrega de e-mail comprovada — o cano aberto, e um sensor que acuse quando fechar

**Antecedente**: auditoria de comunicação com a cliente (2026-09-17), que abriu `BL-033`..`BL-043`, e
a medição contra o projeto hospedado `hgkrsfpupypxtygjgthf` em **2026-09-19**, que está registrada
abaixo e é o que motiva esta feature existir **antes** da aba de Notificações (`BL-033`).

Esta spec é a primeira de cinco que fecham a comunicação da loja. Ela não acrescenta **um** evento,
uma tela ou um texto: ela faz o que já existe **chegar**, e põe um sensor no caminho.

## Problem Statement

A loja tem um motor de notificação completo desde a feature `42` — 15 eventos, pré-condição por
estado, reivindicação atômica, auditoria por linha, reenvio manual, régua de tom. **Ele nunca
entregou um e-mail em produção.**

Medido em 2026-09-19 contra o hospedado: `order_notifications` tem **uma** linha em toda a história
da loja, e ela é uma falha.

```
event: order_received   status: failed   attempts: 1   sent_at: null
error: "403 validation_error: The send.umaestrelinha.com.br domain
        is not verified. Please, add and verify your domain on
        https://resend.com/domains"
created_at: 2026-09-06T23:50:08Z
```

O secret `RESEND_FROM` foi gravado às **22:48 do mesmo dia** e não foi tocado desde então. O domínio
que o erro nomeia **nunca existiu** na conta Resend — é o `send.` que a feature `42` identificou como
defeito `D1` e corrigiu **na documentação**, sem corrigir o secret. São 36 pedidos e 31 pagos com uma
tentativa de e-mail e um 403.

Ao lado, três coisas que a mesma medição confirmou e que pertencem ao mesmo cano:

| # | O quê | Evidência de 2026-09-19 |
| --- | --- | --- |
| **A1** | **Nada verifica o auth de produção.** O workflow declara que não faz `config push` (e a razão está certa), mas a CLI **não tem `config pull`** — o `[auth]` do hospedado não é legível por comando nenhum. SMTP, os três templates, `site_url` e `otp_length` existem lá só se alguém colou no dashboard | `supabase config --help` → subcomando único: `push`. 2 usuários em `auth.users`, uma recuperação tentada em 2026-09-14, entrega não observável |
| **A2** | **A function zumbi `send-email` está viva.** Removida do código no commit `480a171`; `functions deploy` sobe o que existe e **não remove o que sumiu** | `functions list` → **nove** functions (oito do repositório + a zumbi); `send-email` está `ACTIVE`, com `created_at ≈ updated_at` (nunca reimplantada); `OPTIONS` responde **200**. *A `BL-041` dizia "dez" — são nove. **A versão não é registrada de propósito**: mede v7, v15 e v17 no mesmo dia sem redeploy. O que identifica o zumbi é slug + `ACTIVE`.* |
| **A3** | **`order_notes` e `order_status_history` são `FOR ALL USING (true)`** desde 2026-04, com `grant all to anon`: qualquer sessão anônima **lê e grava** nota interna sobre a morte de alguém. O defeito está nomeado por escrito dentro do repositório, na migration da `34`, e nunca foi consertado. **Medido no banco, é um pouco pior do que esta linha dizia**: `pg_policies.roles` é `{public}`, não `{authenticated}` — a policy alcança **todo** papel, e é o `grant` que a torna explorável | `20260415160758:24-25` e `:40-41`; `20260801130000:29`; `pg_policies` do banco local, 2026-09-19 |

O que une os quatro: **nenhum deles quebra build, `tsc` ou teste**, e nenhum tem sensor. O 403 de
2026-09-06 ficou treze dias no banco sem ninguém ver, e só apareceu porque alguém foi olhar.

## Goals

- [ ] **O transacional entrega em produção**, provado por uma linha `sent` em `order_notifications`
      com `provider_message_id` preenchido — não por inspeção de secret.
- [ ] **Existe um sensor recorrente** que falha no dia em que o remetente deixar de ser aceito, e que
      **declara por escrito o que ele não cobre**.
- [ ] **O auth de produção deixa de ser não verificado**: SMTP e os três templates conferidos no
      dashboard e registrados. *(A meta original dizia "e o SMTP local ligado"; ela foi revogada — ver
      `DLV-11`/`DLV-12`, superseded.)*
- [ ] **Um dono só em produção**: a function zumbi apagada, a view e as duas RPCs de compatibilidade
      derrubadas, e um passo de CI que acuse a divergência entre o remoto e o repositório.
- [ ] **A nota interna sobre a morte de alguém deixa de ser pública**, com guarda lendo a migration.
- [ ] **Sem regressão de baseline** (lint, tipos, testes), e `packages/core/src/payment/**` sem uma
      linha alterada.

## Out of Scope

| Item | Motivo |
| --- | --- |
| **A aba Notificações e os 11 eventos desligados** | É a `BL-033`, e tem tamanho próprio. Esta feature abre o cano; ligar torneira é a próxima. **Consequência declarada**: ao fim desta feature a loja segue avisando só nos 4 eventos ligados |
| **`store_settings.material` (endereço do ateliê)** | Precondição da `BL-033`, não desta. Confirmado ausente em produção (9 chaves), mas nenhum evento que o usa está ligado |
| **`ADMIN_PUBLIC_URL` como secret** | Mesma razão: só os dois eventos da dona o usam, e os dois estão desligados. Entra na `BL-033` |
| **O rastreio do Melhor Envio que não avisa** (`BL-035`) | Feature `54`. É gatilho, não cano |
| **A convidada sem rastreio de material** (`BL-036`) | Feature `54` |
| **`post_delivery_care` sem rotina** (`BL-037`), carrinho (`BL-038`), newsletter (`BL-039`) | Feature `55`. As três pedem decisão da dona antes de código |
| **Os três guardas cegos do motor** (`BL-042`) e os seis defeitos de conteúdo (`BL-043`) | Feature `56` |
| **Reenviar os e-mails dos 31 pedidos pagos** | Avisar "pagamento aprovado" de compra antiga seria mentira — é a mesma régua que a `42` aplicou aos pedidos importados da Nuvemshop |
| **Canal WhatsApp** | Feature `43`, ainda só com spec |
| **`packages/core/src/payment/**` e o recálculo da `mercado-pago`** | Cano de e-mail não é dinheiro. Conferido por `git diff --name-only` no gate |
| **`store_settings` legível por `anon` inteira** e `get_abandoned_cart` aberta | Levantados junto com `A3` na mesma varredura, mas são decisão de produto (o segundo é decisão **declarada** na migration `20260802120000:170-177`), não conserto. Ficam em `BL-040` como resíduo |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| **O valor de `RESEND_FROM` em produção** | `Adri - Uma Estrelinha<adri@loja.umaestrelinha.com.br>` — o valor do `.env` local | É o remetente cujo `POST /emails` devolveu **200** na medição de 2026-09-16 (`BL-034`). O `.env.example` documenta `loja@`, que é **texto velho**: nunca foi o valor real | **n — o usuário confere o valor atual no dashboard antes da gravação** |
| **Quem grava o secret em produção** | Eu, por `supabase secrets set`, depois da confirmação do usuário | Decisão do usuário em 2026-09-19. O valor anterior é anotado **antes** — ele é a evidência do defeito | y |
| **O probe manda e-mail de verdade?** | Sim, para `delivered@resend.dev` (endereço simulador do Resend) | Não custa reputação, não chega a pessoa nenhuma, e é o único jeito de provar que o remetente **é aceito**. Já é o endereço que a medição de 2026-09-16 usou | y |
| **O probe cobre o auth?** | **Parcialmente, e isso é escrito no próprio workflow** | Ele prova que o remetente `acesso@` é aceito pela chave — mata o modo `BUG-20260728`. Ele **não** prova que o GoTrue do hospedado tem SMTP ligado nem os templates colados, porque esse transporte é outro e a CLI não o lê | y |
| **Conferir SMTP e templates do hospedado** | Fora do código: passo de operação, com captura registrada no `validation.md` | `config.toml` não é empurrado (regra do deploy), e não há `config pull`. É o molde que a `42` já usou | y |
| **Cadência do probe** | Diário, no molde do `sitemap-check.yml` | O que se compra com a frequência é o teto do tempo em que a quebra passa despercebida. Custa duas chamadas HTTP | y |
| **Apagar a function zumbi** | `supabase functions delete send-email`, **pelo usuário ou por mim com confirmação** | É remoção em produção e não tem desfazer. A migration que derruba a view e as RPCs vai junto, mas **depois** — a function publicada ainda as chama | y |
| **Ordem entre apagar a function e derrubar as RPCs** | Function primeiro, migration depois | Invertido, a function zumbi passa a responder 500 em vez de 200 — trocaria um endpoint morto por um endpoint que **falha**, e o `db push` roda em paralelo com o deploy da Vercel. Ver `ADR` na Edge Case | y |
| **A linha `failed` de 2026-09-06** | **Fica onde está**, e é reivindicável de novo | `claim_order_notification` reivindica com `on conflict … where status <> 'sent'`, então uma retentativa a converte. Apagá-la destruiria a evidência do defeito | y |
| **`order_notes`/`order_status_history`: quem escreve hoje** | Só o backoffice, por sessão admin; a `admin-users` usa service role (ignora RLS) | Conferido por varredura em `apps/**` e `supabase/functions/**` em 2026-09-19 — **zero** escritor na loja. Fechar por `has_role` não quebra caminho nenhum | y |
| **Molde da policy nova** | `customer_notes` da migration `34` (`FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'))`) | O próprio comentário dela diz que **não** copiou o `FOR ALL USING (true)` de `order_notes` porque aquilo era defeito. Esta feature é a volta que a `34` não deu | y |
| **O guarda da migration nova** | Régua **por comando**, com sensor por mutação, no molde de `adminUsersSchema.test.ts` | `L-033`: uma régua para a família mede a forma do primeiro comando e deixa o segundo escapar. São duas tabelas, dois `drop policy`, duas `create policy` | y |
| **Onde mora o guarda** | `apps/store/src/shared/lib/__tests__/` | É onde moram `materialTransitions`, `homeSections`, `importSchema` e `checkoutSchema` — acidente de origem, e o `CLAUDE.md` já o declara. Mudar de casa agora seria mover 8 arquivos numa feature de cano | y |
| **Lições vinculantes** | `L-021` (âncora de contagem), `L-031` (CRLF antes do stripper), `L-033` (régua por comando), `L-034` (token exato), `L-035` (escopo é parte da asserção), `L-036` (AC com duas metades assere o literal) | `scripts/lessons.py` devolve "no confirmed lessons" (as 15 do `lessons.json` estão `candidate`), mas o `CLAUDE.md` do projeto cita estas como regra | y |

**Open questions:** uma, e ela **não trava a spec** — só a primeira task:

- **Qual é o valor atual de `RESEND_FROM` em produção.** A CLI devolve digest, não valor, e tentar
  quebrá-lo é exploração de credencial. O usuário confere em *Settings → Edge Functions → Secrets* e
  informa. Se por qualquer motivo a conferência não acontecer, o default assumido é a gravação do
  valor do `.env` local **sem** registrar o anterior — o conserto acontece igual, e o que se perde é
  a evidência, não o resultado.

---

## User Stories

### P1: O transacional volta a entregar, e há prova ⭐ MVP

**User Story**: Como cliente que acabou de pagar, quero receber o e-mail de confirmação, para saber
que o pedido existe e o que acontece agora.

**Why P1**: É a razão de a feature existir. Sem isto, os 15 eventos, a aba da `BL-033` e as três
features seguintes se apoiam num cano fechado — e toda validação delas seria teatro.

**Acceptance Criteria**:

1. WHEN o secret `RESEND_FROM` do projeto hospedado é lido depois desta feature THEN ele SHALL
   nomear um endereço do domínio **`loja.umaestrelinha.com.br`**, e o valor anterior SHALL estar
   transcrito no `validation.md` junto com o instante da troca.
2. WHEN um pedido de teste percorre o caixa em produção (ou a porta `?action=send` é chamada por
   admin para um pedido existente) THEN `order_notifications` SHALL ganhar uma linha com
   `status = 'sent'`, `sent_at` não nulo e `provider_message_id` preenchido, e o `validation.md`
   SHALL registrar o id e a captura do e-mail recebido.
3. WHEN a linha `failed` de 2026-09-06 é reivindicada de novo pela RPC `claim_order_notification`
   THEN ela SHALL ser reaproveitada (não duplicada), porque o `on conflict` recorta
   `status <> 'sent'`. **O guarda desse recorte é herdado da feature `42`** e mora em
   `apps/store/src/shared/lib/__tests__/orderNotificationsSchema.test.ts` — ele lê o `.sql` do
   disco, que é onde a regra vive. **Esta feature não acrescenta caso na suíte de `functions`, e a
   razão é régua**: lá o dublê **mocka a RPC**, então um caso ali asseriria o dublê e não o
   `on conflict` — *dublê que não enxerga torna a regra inauditável*. A primeira escrita desta AC
   pedia um caso em `functions`, e teria produzido exatamente esse teste vazio.
4. WHEN a troca do secret é feita THEN nenhuma migration e nenhum arquivo de
   `packages/core/src/payment/**` SHALL ser alterado, conferido por `git diff --name-only`.
   *(A `mercado-pago` saiu desta lista: a T8 e o conserto do import a alcançaram — ver `DLV-29` e a
   nota de ordem em `DLV-31`.)*
5. **`DLV-29`** — WHEN o remetente dos transacionais é configurado THEN ele SHALL vir de **dois**
   campos, `RESEND_SENDER_NAME` e `RESEND_SENDER_EMAIL`, compostos por **um único dono**
   (`senderFrom`, em `core`) que aplica a regra de aspas do RFC 5322; `RESEND_FROM` SHALL NOT ser
   lida por nenhum entrypoint. **Motivo**: a assimetria com o auth (que sempre teve dois campos) é
   a causa raiz do `BUG-20260728`.
6. **`DLV-30`** — WHEN alguém cola o valor combinado antigo no campo do **endereço** THEN
   `senderFrom` SHALL devolver vazio, e o motor SHALL recusar com `invalid_from` — nunca montar
   `Nome <Nome <e@x>>`. A composição SHALL NOT lançar: derrubar o módulo levaria junto a porta
   `config-check`, que é quem diagnostica.
7. **`DLV-31`** — WHEN um secret de produção é apagado THEN a remoção SHALL acontecer **depois** do
   deploy do código que deixou de lê-lo. **Medido e violado nesta feature**: `RESEND_FROM` foi
   apagada às 14:29 e o bundle publicado (pré-`52`) ainda a lia, então o remetente caiu no default
   de caixa-de-areia — 200 do Resend, entrega só ao dono da conta. É a **ordem simétrica** do
   `DLV-22` (apagar a function antes da migration), e a regra geral é a mesma: **remoção em
   produção se ordena pelo que está PUBLICADO, nunca pelo que está no disco.**

**Independent Test**: uma linha `sent` com `provider_message_id` em `order_notifications`, e o e-mail
aberto no celular.

---

### P1: Um sensor diário, que declara o que NÃO cobre ⭐ MVP

**User Story**: Como dona, quero saber no dia seguinte que o e-mail parou de sair, e não treze dias
depois quando alguém for olhar o banco.

**Why P1**: É a metade que impede o defeito de voltar. O 403 de 2026-09-06 não foi um acidente raro —
foi uma troca de secret que ninguém mediu, e a próxima troca de DNS, de chave ou de domínio produz o
mesmo silêncio. Um conserto sem sensor é um conserto com data de validade.

**Acceptance Criteria**:

1. WHEN o workflow `Email check` roda THEN ele SHALL consultar `GET https://api.resend.com/domains` e
   falhar se `loja.umaestrelinha.com.br` não estiver com `status: verified` — é a precondição **comum**
   aos dois streams (transacional por HTTP e auth por SMTP).
2. WHEN o workflow roda THEN ele SHALL fazer `POST /emails` para `delivered@resend.dev` a partir do
   remetente **transacional** e a partir do remetente **do auth** (`acesso@loja.umaestrelinha.com.br`),
   e SHALL falhar se qualquer um não devolver **200** — nomeando na mensagem de erro qual dos dois
   caiu, porque os dois têm consertos diferentes.
3. WHEN qualquer verificação falha THEN a mensagem SHALL distinguir **"o Resend está fora"** de
   **"a nossa configuração está errada"**, para que a falha não mande procurar no lugar errado.
4. WHEN alguém lê o workflow THEN ele SHALL declarar em comentário, por extenso, que **não** prova que
   o GoTrue do hospedado tem SMTP ligado nem os templates colados — e por quê (a CLI não tem
   `config pull`; o transporte é outro).
5. WHEN o workflow é agendado THEN ele SHALL rodar diariamente **e** aceitar `workflow_dispatch`, no
   molde do `sitemap-check.yml`.
6. WHEN o probe precisa da chave THEN ele SHALL lê-la de `secrets.RESEND_API_KEY` e SHALL NOT
   registrar a chave nem o corpo da resposta em log.
7. WHEN alguém lê `.env.example` e `supabase/CLAUDE.md` depois desta feature THEN os dois SHALL
   declarar que **`supabase secrets set` mescla o `.env` do diretório atual** — atualizando toda
   chave que já exista no hospedado e tenha homônima local, sem criar chave nova e sem avisar —, com
   a medição de 2026-09-19 como evidência (`count: 8` da raiz do projeto × `count: 1` de um
   diretório sem `.env`), e SHALL prescrever o procedimento seguro: dashboard, ou CLI a partir de um
   diretório sem `.env`.
8. WHEN a documentação descreve como conferir uma troca de secret THEN ela SHALL registrar que o
   digest de `secrets list` é **hash estável do valor** — logo serve de antes/depois sem revelar
   nada — e que **`updated_at` idêntico em todos os secrets é a assinatura da mescla**, enquanto
   carimbos distintos indicam gravações deliberadas.

**Independent Test**: rodar por `workflow_dispatch` com a configuração boa (verde) e com um remetente
propositalmente errado numa branch (vermelho, nomeando qual caiu); e `grep` do procedimento seguro
nos dois arquivos.

---

### P2: O auth de produção deixa de ser não verificado

**User Story**: Como cliente, quero que o código de 6 dígitos chegue quando eu peço para entrar, para
conseguir abrir a minha conta e ver o meu pedido.

**Why P2**: O modo de falha é pior que o do transacional — sem SMTP no dashboard o GoTrue cai no
compartilhado da Supabase (~2 e-mails/hora) e o login fica inoperante; **com** SMTP e sem os templates
chega o link padrão em inglês enquanto a loja pede um código que o e-mail não traz, e isso *parece*
funcionar. Não é P1 porque, diferente do transacional, não há evidência de que esteja quebrado — há
evidência de que **ninguém sabe**.

**Acceptance Criteria**:

1. ~~WHEN o bloco `[auth.email.smtp]` do `supabase/config.toml` é lido depois desta feature THEN
   ele SHALL estar **descomentado**~~ — **SUPERSEDED em 2026-09-19, decisão do usuário.** O bloco
   segue **comentado**, e o dev segue no Mailpit. A `C-08` mandava ligar para *validar que o
   remetente é aceito pela chave*; quem faz essa validação agora é o `Email check` (`DLV-05`,
   `DLV-06`), diariamente e sem efeito colateral. Ligar custaria o Mailpit — dev deixa de funcionar
   offline e passa a mandar e-mail real, sujeito a limite — e não compraria garantia nova.
   **O que PERMANECE desta AC**: a pendência `C-08` do `.env.example` SHALL estar marcada como
   vencida, com a data e o que cada passo mediu.
2. ~~WHEN o passo local é executado THEN um pedido de código na loja SHALL chegar pelo Resend~~ —
   **SUPERSEDED pela mesma decisão.** O e-mail de auth do dev continua caindo no Mailpit, de
   propósito.

   > **Por que isto está riscado e não apagado**: é o precedente da `45`, onde `POL-15`/`POL-16`
   > foram revogadas no meio da execução e marcadas **superseded na `spec.md`**. Registrar a
   > revogação só no `validation.md` faz quem abrir a feature seguinte ler a spec e concluir que
   > duas ACs não foram cumpridas. A alternativa estrutural — tirar o SMTP do caminho de vez — está
   > em `BL-045` (*Send Email Hook*).
3. WHEN o dashboard do projeto hospedado é conferido THEN o `validation.md` SHALL registrar, com
   captura, o estado de: SMTP (ligado/desligado, host e remetente), os **três** templates
   (`confirmation`, `magic_link`, `recovery`) e `otp_length`/`otp_expiry` — e, se algum divergir de
   `supabase/templates/` ou do `config.toml`, o conserto SHALL ser feito no dashboard e recapturado.
4. WHEN alguém lê `supabase/CLAUDE.md` depois desta feature THEN ele SHALL declarar que **a CLI não
   tem `config pull`**, que o `[auth]` do hospedado é verificável só por dashboard ou probe, e qual
   parte disso o `Email check` cobre.

**Independent Test**: pedir um código de acesso na loja local e recebê-lo por Resend; e a captura do
dashboard no `validation.md`.

---

### P2: A nota interna sobre a morte de alguém deixa de ser pública

**User Story**: Como dona, quero que a anotação que faço sobre um pedido — que às vezes registra quem
morreu — seja legível só por quem administra a loja.

**Why P2**: É exposição de dado sensível em produção, já nomeada por escrito no repositório e nunca
consertada. Não é P1 só porque o dano depende de alguém procurar, e não há indício de que tenham
procurado.

**Acceptance Criteria**:

1. WHEN a migration desta feature é aplicada THEN as policies `Allow all order_status_history` e
   `Allow all order_notes` SHALL ter sido derrubadas por `drop policy if exists`, e cada tabela SHALL
   ter **uma** policy `FOR ALL TO authenticated` cujo `using` **e** `with check` chamam
   `public.has_role(auth.uid(), 'admin')` — molde de `customer_notes`, na migration da `34` (o
   `DROP`/`CREATE` fica logo depois do bloco de comentário que o explica; **citar por número de linha
   apodrece**, e a primeira escrita desta AC apontava para o comentário em vez do comando).
   A policy **nova** também SHALL ser precedida de `drop policy if exists` — sem isso a migration não
   é idempotente, porque o Postgres não tem `create policy if not exists`.
2. WHEN a migration é aplicada THEN ela SHALL revogar de `anon` o acesso de escrita e leitura às duas
   tabelas, desfazendo o alcance do `grant all … to anon` de `20260801130000:29`.
3. WHEN a migration é lida do disco por um guarda novo THEN o guarda SHALL reprovar, **por comando e
   com sensor de mutação para cada um** (`L-033`): a volta de `USING (true)` em qualquer das duas; um
   `drop policy` faltando; uma `create policy` sem `has_role`; o `with check` omitido (que deixaria a
   gravação aberta com a leitura fechada); `grant` alcançando `anon`; e escrita de dado na migration.
4. WHEN o guarda roda THEN ele SHALL carregar **âncora dupla** (`L-021`): o arquivo foi lido **e** as
   **duas** tabelas foram encontradas — uma régua que casasse zero tabela passaria em silêncio.
5. WHEN o painel grava nota e muda status depois da migration THEN as duas operações SHALL continuar
   funcionando com sessão de admin, provado por probe contra o banco local (não por inspeção de tipo
   — `AD-012`).
6. WHEN uma sessão `anon` tenta ler ou gravar nas duas tabelas depois da migration THEN ela SHALL ser
   recusada, provado por probe com a chave publicável.

**Independent Test**: dois probes contra o banco local — admin escreve e lê; `anon` é recusado nas
quatro combinações (ler/gravar × duas tabelas).

---

### P3: Um dono só em produção

**User Story**: Como quem opera a loja, quero que o que está publicado seja o que está no
repositório, para que ninguém precise adivinhar se uma function da lista é viva ou zumbi.

**Why P3**: É higiene com risco real mas baixo — a `send-email` zumbi é um endpoint público sem JWT
rodando código da marca anterior, que ninguém mede e cujo log ninguém lê. Não bloqueia cliente
nenhuma hoje.

**Acceptance Criteria**:

1. WHEN `supabase functions list --project-ref hgkrsfpupypxtygjgthf` é executado depois desta feature
   THEN ele SHALL devolver **oito** functions — as oito de `supabase/functions/` que não começam com
   `_` — e `send-email` SHALL NOT estar entre elas; o `validation.md` SHALL registrar a lista antes e
   depois. **A `BL-041` diz "dez", e está errada**: medido em 2026-09-19, são **nove** publicadas
   (as oito do repositório mais a zumbi).
2. WHEN a function é removida THEN a remoção SHALL acontecer **antes** da migration que derruba a view
   e as RPCs, e o `validation.md` SHALL registrar a ordem — invertida, a function zumbi passaria de
   endpoint morto a endpoint que falha 500 durante a janela entre o `db push` e o deploy.
3. WHEN a migration desta feature é aplicada THEN ela SHALL derrubar a view `public.order_emails` e as
   funções `public.claim_order_email` e `public.finish_order_email`, todas por `drop … if exists`, e
   SHALL NOT tocar `order_notifications`, `claim_order_notification` nem `finish_order_notification`.
4. WHEN o guarda da migration roda THEN ele SHALL asserir a queda das três **e** a permanência das
   três do motor — sem o segundo sentido, uma migration que derrubasse o motor junto passaria
   (é a régua dos dois sentidos que a `41` usou no cadeado do hero).
5. WHEN o workflow `Supabase Deploy` roda THEN ele SHALL comparar a lista remota de functions com os
   diretórios de `supabase/functions/` e SHALL **avisar** (não falhar) na divergência, nomeando cada
   slug sobrando e cada um faltando.
6. WHEN o passo de comparação avisa THEN ele SHALL NOT bloquear o deploy — function zumbi é dívida,
   não incidente, e derrubar o deploy por ela pararia a loja por um problema que não é dela.

**Independent Test**: `functions list` devolvendo nove; e o passo de CI acusando um slug plantado.

---

## Edge Cases

- WHEN o `POST /emails` do probe devolve **429** (teto do Resend) THEN o workflow SHALL tratar como
  **indisponibilidade**, não como configuração errada, e a mensagem SHALL dizer isso.
- WHEN `api.resend.com` não responde dentro do timeout THEN o workflow SHALL falhar nomeando
  indisponibilidade — nunca declarar o remetente inválido por ausência de resposta.
- WHEN o secret `RESEND_FROM` está **vazio** em produção THEN a function cai no default
  `Uma Estrelinha <onboarding@resend.dev>` (`index.ts`, `envOr`), que entrega **só** para o dono da
  conta Resend. O probe SHALL cobrir esse caso, porque é um 200 que não entrega a cliente nenhuma.
- WHEN a migration roda duas vezes THEN ela SHALL ser idempotente — `drop … if exists` e
  `create policy` depois de `drop policy if exists`, sem `do $$` de backfill e **sem uma linha de
  escrita de dado**.
- WHEN o `db push` e o deploy da Vercel rodam em paralelo (janela conhecida do projeto) THEN nenhuma
  tela publicada SHALL depender da view `order_emails` — conferido por `notificationSingleOwner.test.ts`,
  que já assere zero leitores.
- WHEN alguém tenta gravar nota com sessão autenticada **não-admin** THEN a policy SHALL recusar —
  `authenticated` sozinho não basta, e é exatamente o que o comentário da `34` alerta.
- WHEN o guarda novo lê a migration num checkout Windows THEN o removedor de comentário SHALL
  normalizar CRLF **antes** (`L-031`), sob pena de acusar a prosa que explica a regra.

---

## Requirement Traceability

| ID | Story | Fecha | Fase | Status |
| --- | --- | --- | --- | --- |
| DLV-01 | P1 transacional | — | Tasks | Pending |
| DLV-02 | P1 transacional | — | Tasks | Pending |
| DLV-03 | P1 transacional | — | Tasks | Pending |
| DLV-04 | P1 transacional | — | Tasks | Pending |
| DLV-05 | P1 sensor | `BL-034` (c) | Tasks | Pending |
| DLV-06 | P1 sensor | `BL-034` (c) | Tasks | Pending |
| DLV-07 | P1 sensor | — | Tasks | Pending |
| DLV-08 | P1 sensor | — | Tasks | Pending |
| DLV-09 | P1 sensor | — | Tasks | Pending |
| DLV-10 | P1 sensor | — | Tasks | Pending |
| DLV-11 | P2 auth | `BL-034` (a) | — | **Superseded** (2026-09-19) |
| DLV-12 | P2 auth | `BL-034` (a) | — | **Superseded** (2026-09-19) |
| DLV-13 | P2 auth | `BL-034` (b) | Tasks | Pending |
| DLV-14 | P2 auth | — | Tasks | Pending |
| DLV-15 | P2 notas | `BL-040` | Tasks | Pending |
| DLV-16 | P2 notas | `BL-040` | Tasks | Pending |
| DLV-17 | P2 notas | `BL-040` | Tasks | Pending |
| DLV-18 | P2 notas | `BL-040` | Tasks | Pending |
| DLV-19 | P2 notas | `BL-040` | Tasks | Pending |
| DLV-20 | P2 notas | `BL-040` | Tasks | Pending |
| DLV-21 | P3 dono único | `BL-041` | Tasks | Pending |
| DLV-22 | P3 dono único | `BL-041` | Tasks | Pending |
| DLV-23 | P3 dono único | `BL-041` | Tasks | Pending |
| DLV-24 | P3 dono único | `BL-041` | Tasks | Pending |
| DLV-25 | P3 dono único | `BL-041` | Tasks | Pending |
| DLV-26 | P3 dono único | `BL-041` | Tasks | Pending |
| DLV-27 | P1 sensor | incidente 2026-09-19 | Tasks | Pending |
| DLV-28 | P1 sensor | incidente 2026-09-19 | Tasks | Pending |
| DLV-29 | P1 transacional | `BUG-20260728` | Tasks | Pending |
| DLV-30 | P1 transacional | `BUG-20260728` | Tasks | Pending |
| DLV-31 | P1 transacional | rodada 2 | Tasks | Pending |

**ID format:** `DLV-[NUMBER]`, na ordem das ACs de cada story. `DLV-27`/`DLV-28` são as ACs 7 e 8 da
story do sensor, acrescentadas depois da escrita inicial — ver *O incidente que criou as duas*.

**Coverage:** 28 total, 0 mapeados a tasks, **28 unmapped ⚠️** (a fase Tasks resolve).

---

## O incidente que criou `DLV-27` e `DLV-28`

Em 2026-09-19, ao consertar o `RESEND_FROM`, um `supabase secrets set` com **uma** chave na linha de
comando gravou **oito** — ele mesclou o `.env` local. Sete secrets de produção foram sobrescritos com
valores de desenvolvimento, entre eles `STORE_PUBLIC_URL` (virou `http://localhost:8082`, confirmado
pelas `<loc>` do sitemap servido), `MELHOR_ENVIO_ENV` (era `production`, virou `sandbox`) e os dois
`MERCADO_PAGO_*`.

Provado por controle: o mesmo comando, com o mesmo valor, devolve `count: 8` da raiz do projeto e
`count: 1` de um diretório sem `.env`.

Quase tudo foi restaurado no mesmo dia — os digests de `MERCADO_PAGO_ACCESS_TOKEN`,
`MERCADO_PAGO_WEBHOOK_SECRET`, `STORE_PUBLIC_URL`, `MELHOR_ENVIO_ENV` e `RESEND_API_KEY` voltaram a
ser **idênticos aos anteriores**, o que prova igualdade de valor. Sobrou `MELHOR_ENVIO_SENDER_JSON`
com o valor de dev (`BL-044`).

**Três coisas que este episódio ensina e que a feature tem de deixar escritas:**

- **O `.env` de desenvolvimento é um segundo dono dos secrets de produção**, e nada dizia isso. É o
  "defeito 01" dentro da ferramenta.
- **O digest de `secrets list` é hash estável do valor.** Foi o que permitiu provar a restauração sem
  ninguém revelar segredo nenhum — e é a técnica de antes/depois que o `validation.md` vai usar.
- **`updated_at` uniforme delata a mescla.** Antes do incidente havia cinco carimbos distintos, sinal
  de gravações deliberadas; depois, os oito compartilhavam o mesmo instante.

---

## A varredura de dimensões implícitas

Escopo Large ⇒ todas as nove resolvem em requisito ou `N/A porquê`.

| Dimensão | Onde resolve |
| --- | --- |
| Input validation & bounds | `DLV-01` (domínio do remetente), Edge Case do `RESEND_FROM` vazio |
| Failure / partial-failure | `DLV-09` (distinguir indisponibilidade de má configuração), Edge Cases 429 e timeout |
| Idempotency / retry / duplicate | `DLV-03` (a linha `failed` é reivindicável, não duplicada), Edge Case da migration idempotente |
| Auth boundaries & rate limits | `DLV-15`..`DLV-20` (RLS por `has_role`), `DLV-10` (probe não registra a chave), Edge Case 429 |
| Concurrency / ordering | `DLV-22` (function antes da migration), Edge Case da janela `db push` × Vercel |
| Data lifecycle / expiry | **N/A porque** esta feature não cria dado com ciclo de vida. A linha `failed` fica por decisão registrada, e o probe manda para um simulador que não retém |
| Observability | É a feature. `DLV-05`..`DLV-10` e `DLV-25` |
| External-dependency failure | Edge Cases 429 e timeout; `DLV-09` |
| State-transition integrity | `DLV-03` (o recorte `status <> 'sent'` do `on conflict`) |

---

## Success Criteria

- [ ] `order_notifications` tem ao menos **uma** linha `sent` com `provider_message_id`, e o e-mail
      correspondente foi aberto num celular.
- [ ] `Email check` roda verde por agendamento, e vermelho quando se planta um remetente errado.
- [ ] O `validation.md` carrega a captura do dashboard com SMTP e os três templates do hospedado.
- [ ] `supabase functions list` devolve **oito** — as do repositório. Hoje devolve nove (a
      oitava do repo mais a zumbi). *A primeira escrita desta linha dizia "nove" e contradizia a
      `DLV-21`, que pede oito.*
- [ ] Uma sessão `anon` é recusada nas quatro combinações contra `order_notes` e
      `order_status_history`; o painel segue gravando.
- [ ] Baselines sem regressão, medidas por workspace com exit code fora de pipe e
      `--testTimeout=20000` na loja e no painel; `packages/core/src/payment/**` intocado.
