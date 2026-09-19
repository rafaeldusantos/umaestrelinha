# Entrega de e-mail comprovada — evidência

**Spec**: [`spec.md`](./spec.md) · **Design**: [`design.md`](./design.md) · **Tasks**: [`tasks.md`](./tasks.md)
**Data**: 2026-09-19 · **Projeto hospedado**: `hgkrsfpupypxtygjgthf`

> **A evidência do autor está aqui; o veredito independente está no fim.** O Verifier de olhos
> frescos rodou, devolveu **FAIL** na primeira rodada com 6 mutantes sobreviventes, e os consertos
> estão aplicados — ver *Verificação independente*. O que está neste documento é medição (comando,
> saída, data), com a parte que só a operação prova separada do que a suíte alcança.

---

## Os passos de operação

| # | Passo | Estado | Evidência |
| --- | --- | --- | --- |
| **O1** | `RESEND_FROM` correto em produção | ✅ feito | abaixo |
| **O2** | SMTP local ligado | ❌ **revogado por decisão** | abaixo |
| **O3** | Dashboard: SMTP + 3 templates do hospedado | 🟡 **SMTP ativo** (2026-09-19); templates pendentes | — |
| **O4** | `functions delete send-email` | ✅ **feito** (2026-09-19) | `functions list` → **oito**, todas do repositório |
| **O5** | Uma linha `sent` real em `order_notifications` | ⏳ **bloqueado por O3/O4** | — |
| **O6** | Criar o secret **`RESEND_API_KEY` do GITHUB** | ✅ **feito pelo usuário** (2026-09-19) | achado pela verificação; ver abaixo |
| **O7** | Trocar o remetente de produção por `RESEND_SENDER_NAME` + `RESEND_SENDER_EMAIL`, e apagar `RESEND_FROM` | ✅ **feito** (2026-09-19T14:29) | T8; **mas ver o alerta de ORDEM abaixo** |

### O1 — o remetente de produção, corrigido e medido

O estado **antes**, lido de `order_notifications` do hospedado (a única linha da história da loja):

```
event: order_received   status: failed   attempts: 1   sent_at: null
provider_message_id: null
error: "403 validation_error: The <subdomínio que nunca existiu> domain is not verified."
created_at: 2026-09-06T23:50:08Z
```

> O endereço daquele remetente **não é transcrito aqui**: `authSenderDomain.test.ts` recusa a string
> em todo arquivo fora de `.specs/`, e este documento vive dentro. A forma está na `spec.md`, que é o
> lugar onde o escopo do guarda a permite.

Medição contra a API do Resend **antes** de gravar:

| Remetente | HTTP |
| --- | --- |
| `Adri - Uma Estrelinha<adri@loja.umaestrelinha.com.br>` (sem espaço, valor do `.env`) | **200** |
| `Adri - Uma Estrelinha <adri@loja.umaestrelinha.com.br>` (com espaço) | **200** |
| `Uma Estrelinha <acesso@loja.umaestrelinha.com.br>` (auth) | **200** |
| o remetente antigo | **403** |

`GET /domains` → **um** domínio, `loja.umaestrelinha.com.br`, `status: verified`, `sa-east-1`.

Gravado com a grafia **com espaço** (RFC 5322 inequívoca). Digest de `RESEND_FROM`:
`4939ea3ae21d…` → `fa3abd80c6ac…`, e o digest é hash estável do valor, então ele **é** a prova.

> A primeira escrita deste documento datava a troca em "11:58", e a API devolve
> `updated_at 2026-09-19T12:25:23.633Z`. Os dois são verdadeiros e o segundo é o que vale: às 11:58
> foi a gravação original; às 12:25 o **mesmo valor** foi regravado no teste que provou que o digest
> é estável entre escritas. `updated_at` é da última escrita, não da que mudou o valor — e é por
> isso que o digest, e não o carimbo, é a evidência.

**Aquele 403 é o sensor de discriminação desta feature**: ele é reproduzível sob demanda, contra a
mesma chave que aceita os dois remetentes atuais. É o controle que prova que o probe da `DLV-05`/
`DLV-06` discrimina, em vez de passar verde sobre nada.

### O2 — revogado, e a razão vale mais que a decisão

A `DLV-11`/`DLV-12` mandavam ligar o `[auth.email.smtp]` local. **Foi feito e desfeito no mesmo dia**,
depois de o usuário perguntar por que SMTP é necessário se os transacionais saem pela API HTTP.

A resposta: quem manda o e-mail de auth **não é o nosso código** — é o GoTrue, que não fala a API HTTP
do Resend. Mas a `C-08` mandava ligar o SMTP local para **validar que o remetente é aceito**, e quem
faz isso agora é o `Email check`, diariamente e sem efeito colateral. Ligar custaria o Mailpit (dev
deixa de funcionar offline e passa a mandar e-mail real, sujeito a limite de envio) e não compraria
garantia nenhuma.

**`DLV-11` e `DLV-12` ficam superseded**, não esquecidas. `BL-045` registra a alternativa estrutural
(o *Send Email Hook*), que tiraria o SMTP do caminho e transformaria os três templates em código
versionado.

### O3 e O4 — o estado no fim da sessão

**`O4` está FEITO.** `supabase functions list --project-ref hgkrsfpupypxtygjgthf` devolve **oito**,
e as oito são as do repositório — `send-email` não está mais lá. `DLV-21` satisfeita.

**`O3` está pela metade**: o **SMTP foi ativado** no dashboard em 2026-09-19. Faltam os **três
templates**, e eles não precisam ser escritos — existem desde a feature `20`, em
`supabase/templates/`, com a identidade da loja, tudo inline, sem webfont, e `{{ .Token }}` nos
três. É colar, junto com o **assunto** de cada um (que vive no `config.toml` e, como ele não é
empurrado, precisa ser digitado no dashboard):

| Tela | Arquivo | Assunto |
| --- | --- | --- |
| Magic Link | `magic_link.html` | `Seu código de acesso — Uma Estrelinha` |
| Confirm signup | `confirmation.html` | `Seu código de acesso — Uma Estrelinha` |
| Reset password | `recovery.html` | `Redefinir sua senha — Uma Estrelinha` |

**Três bastam, e é medido**: a loja dispara `signInWithOtp` (que vira *Magic Link* para e-mail
existente e *Confirm signup* para novo) e `resetPasswordForEmail`. Não há `updateUser` nem convite,
então *Change Email Address* e *Invite user* são inalcançáveis.

**A prova de fecho do `O3` é um login de verdade**: pedir um código na loja e recebê-lo com a cara
da marca e 6 dígitos. Se chegar em inglês com um link, os templates não foram colados — e esse é o
modo de falha que *parece* funcionar.

### O que estava pendente, e por quê (histórico)

- **O3** exige o dashboard. A CLI **não tem `config pull`**, então o `[auth]` do hospedado não é
  legível por comando nenhum — é a limitação que `BL-034` descreve e que esta feature confirmou
  (`supabase config --help` tem um subcomando só: `push`).
- **O4** é remoção em produção, sem desfazer. **Ordem obrigatória** (`DLV-22`): apagar a function
  **antes** do push da migration. Ela ainda chama `claim_order_email`; invertido, o zumbi deixaria de
  ser um endpoint morto e passaria a responder 500 durante a janela entre `db push` e deploy da
  Vercel.
- **O5** depende dos dois: sem SMTP no dashboard não há login, e sem O4 a ordem não fecha.

### O6 — criar o secret `RESEND_API_KEY` **do GitHub**

Achado pela verificação independente, e é o passo que decide se o sensor nasce vivo ou vermelho.

**São dois cofres, e o design confundiu os dois.** O `supabase-deploy.yml` confere
`supabase secrets list` — o cofre **da Supabase**, onde a chave existe. O `email-check.yml` lê
`secrets.RESEND_API_KEY` — o cofre **do GitHub**, onde ela **não existe**: os únicos secrets do
GitHub usados neste repositório são `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD`.

**Onde criar**: *Settings → Secrets and variables → Actions → New repository secret*, com o mesmo
valor da chave do Resend.

⚠️ **Nível do repositório, não do environment.** O job do deploy declara `environment: production`;
o `email-check` **não declara environment**, então um secret criado dentro daquele environment
ficaria invisível e o sensor falharia todo dia dizendo "vazia". Acrescentar `environment: production`
ao job resolveria também — mas regra de aprovação no environment faria o cron ficar na fila, então a
saída barata é o nível do repositório. O passo 0 do workflow nomeia as duas possibilidades na
mensagem de erro.

**Estado medido do zumbi em 2026-09-19**: `functions list` devolve **nove** (oito do repositório +
a zumbi, `ACTIVE`), e um `OPTIONS` contra ela responde **200**. *(A `BL-041` dizia "dez" — corrigido.
A **versão saiu dos documentos**: foi medida como v7, v15 e v17 no mesmo dia, com `updated_at`
provando que a function nunca foi reimplantada. Contador mutável da plataforma cravado em três
documentos é três donos de um número que ninguém controla; o que identifica o zumbi é
**slug + `ACTIVE`**.)*

---

## O que a suíte alcança

### Baselines, medidas um workspace por vez, exit code fora de pipe

| Workspace | Antes | Depois | Δ |
| --- | --- | --- | --- |
| store | 3376/218 | **3493/220** | **+117/+2** |
| functions | 599/13 | **654/14** | **+55** |
| core | 2356/92 | **2372/93** | **+16** (`senderFrom`, T8) |
| backoffice | 2711/148 | **2711/148** | 0 — não tocado, remedido |
| catalog-import | 512/23 | **512/23** | 0 — não tocado, remedido |
| **total** | 9554/494 | **9742/498** | **+188/+4** |

Lint **26 erros / 6 warnings** (backoffice 24/4 · store 2/2) — baseline exata. Tipos **0 · 0 · 0**.
`packages/core/src/payment/**` sem uma linha alterada (`git status --porcelain` = zero arquivos).

> **A suíte da loja reprovou 1 caso na primeira medição**, e o culpado era a documentação desta
> feature: `authSenderDomain.test.ts` acusou o subdomínio antigo em `.env.example` e em
> `supabase/config.toml` — os dois textos que eu tinha escrito para **explicar** como aquele domínio
> derrubou a loja. Corrigido descrevendo a forma em vez de grafá-la; a régua virou linha no
> `CLAUDE.md`.

### Sensibilidade dos guardas — injeção real no arquivo real

**`entregaDeEmailSchema.test.ts`** (43 casos): 8 mutantes, cada um derrubando só o que o nomeia —
`with check` omitido (3 casos), `drop policy` faltando (4), `revoke` removido (2), `drop view`
faltando (4, inclusive a âncora), `drop` do motor acrescentado (1), `insert` de dado (1),
`using (true)` de volta (5), `to public` (1). Controle com a árvore limpa: **43/43, exit 0**.

**`emailCheckWorkflow.test.ts`** (**59 casos**, depois dos consertos da verificação — eram 39):
as duas réguas de comportamento (`passoFalhaAoQuebrar` e `passoVerificaOQueDeve`, por `it.each` nos
sete passos) mais os sensores: domínio literal de volta (inclusive escondido em
comentário), declaração de cegueira sumindo, passo 1 aceitando só "parseou", passo 1 largando o 200,
remetente do auth virando literal, `grep|head` no lugar do recorte, 429 reclassificado, corpo do
Resend indo ao log, `admin_public_url` sendo conferida, `exit 1` no passo de divergência,
`::error::` no lugar de `::warning::`, `continue-on-error` removido, e o passo condicionado ao diff.

**`handlers.test.ts`** (+21 casos): `from_valid` virando régua nova (1 reprova), oitava chave com
prefixo da chave (3), acesso ao banco dentro de `configCheck` (19), `case` sumindo do `route` (18).

### O probe do banco local (`AD-012` — não é inspeção de tipo)

Migration aplicada à mão, **duas vezes**, para provar idempotência: `exit 0` nas duas; a segunda só
emite `NOTICE … skipping`.

| Prova | Resultado |
| --- | --- |
| policies depois | `{authenticated}` · `has_role` no `using` **e** no `with check`, nas duas tabelas |
| grants de `anon` nas duas tabelas | **nenhum** |
| view `order_emails` | não existe |
| motor (`order_notifications` + as 2 RPCs) | intacto |
| admin grava e lê, por **PostgREST com JWT real** | `GET` 200 · `POST` **201**, nas duas tabelas |
| `anon` nas **4** combinações, por SQL | `ERROR 42501 permission denied` |
| `anon` nas **4** combinações, por PostgREST | **401** `42501` |
| `GET /rest/v1/order_emails` | **404** |
| autenticada **não-admin** | `select` devolve 0 linhas; `insert` barrado por RLS |

A última linha é o que prova que `to authenticated` sozinho **não** bastava, e que o `with check` é
quem segura a gravação.

> As duas linhas de probe foram apagadas depois (0 restantes). A migration **não** foi registrada em
> `supabase_migrations.schema_migrations` — um `db push` local a aplicará de novo, e isso é
> inofensivo, porque a idempotência está provada.

---

### O7 — o remetente de produção passa a ser DOIS secrets

A T8 aposentou `RESEND_FROM`. O código **não a lê mais**: o remetente é composto de
`RESEND_SENDER_NAME` + `RESEND_SENDER_EMAIL` por `senderFrom`, em `core`.

**Enquanto os dois não existirem em produção, o remetente cai no default de caixa-de-areia** —
`onboarding@resend.dev`, que responde 200 e entrega só ao dono da conta. O `Email check` recusa esse
estado por `from_is_default`, então o sensor acusa no dia seguinte; mas quem compra nesse meio-tempo
não recebe e-mail.

No dashboard (*Settings → Edge Functions → Secrets*), ou por CLI de um diretório sem `.env`:

```
RESEND_SENDER_NAME   = Adri - Uma Estrelinha
RESEND_SENDER_EMAIL  = adri@loja.umaestrelinha.com.br
```

E **apagar `RESEND_FROM`**, que virou secret órfão. Deixá-la é deixar um valor que parece
configuração e não é lido por nada — a mesma classe da function zumbi.

> O `supabase-deploy.yml` já confere a presença das duas (a lista passou de 7 para 8 nomes), então
> um deploy com elas faltando **falha antes do `db push`**.

---

## O que NÃO está provado

1. **Que o e-mail CHEGA.** O Resend aceitar é 200; chegar depende de DKIM, reputação e filtro de
   spam. Nenhum passo desta feature mede isso.
2. **Que o GoTrue do hospedado tem SMTP e os três templates.** É a `O3`, e o `Email check` **declara
   essa cegueira por extenso** — de propósito, para ninguém concluir que o auth está coberto.
3. **Que o `Email check` roda verde no agendador.** O YAML e o shell foram validados por parser e por
   `bash -n`; o workflow ainda não executou no GitHub.
4. **Que a migration aplica no hospedado.** Ela só rodou contra o banco local.
5. ~~**O veredito independente.**~~ — **rodou.** Ver abaixo.

---

## Verificação independente (autor ≠ verificador)

**Primeira rodada: FAIL.** 25 mutantes injetados nos arquivos reais — 18 morreram, **6 sobreviveram**,
1 morreu por acidente (pela âncora de um sensor, não por régua).

**Os 6 eram todos da mesma classe, e todos no mesmo arquivo**: o guarda do `email-check.yml` media
**presença de texto** e os marcadores `[n/7]`, nunca **o comportamento de falhar**. Como o produto
daquele workflow *é* falhar quando o elo quebra, **5 dos 7 passos podiam ser esvaziados** mantendo o
`echo` — com os 39 casos verdes. Dois negavam `DLV-05` e `DLV-06` ao pé da letra: o `exit 1` do
passo 5 (o domínio sai de `verified` e o sensor fica verde) e o probe inteiro do remetente do auth.

**Conserto**: duas réguas novas, ancoradas no recorte de bloco que o arquivo já tinha —
`passoFalhaAoQuebrar(n)` (o bloco tem `::error::` **e** `exit 1`) e `passoVerificaOQueDeve(n)` (o
bloco contém o predicado daquele passo). Aplicadas por `it.each` aos sete passos, com um sensor por
mutante sobrevivente. Os dois `provar_remetente` ganharam `|| exit 1` explícito — antes dependiam do
`set -e`, e era isso que os tornava removíveis sem régua nenhuma reclamar.
**Guarda: 39 → 59 casos.** O mutante M11 foi reinjetado **no arquivo real** e derruba 2 casos; o
arquivo foi restaurado por cópia, com `md5sum` conferido (`git checkout` não serve: ele é untracked).

**O que a verificação confirmou** — as cinco baselines número por número, lint 26/6, tipos 0·0·0,
`payment/**` e `mercado-pago` intocados, e os 82 casos novos do store. E confirmou empiricamente a
`DLV-28`: dois secrets ainda compartilham o `updated_at` de 12:00:18 (a assinatura da mescla),
enquanto os cinco restaurados têm carimbos distintos.

**O que ela também achou, e não era mutante:**

- **`O6` — o secret `RESEND_API_KEY` do GITHUB não existe, e o design afirmava que sim.** Ele dizia
  que era "a mesma que o `supabase-deploy.yml` já confere"; é falso, e o erro é de **categoria**: o
  deploy lê `supabase secrets list`, o cofre **da Supabase**. São dois cofres, e ter um não dá o
  outro. Sem esse passo, o sensor nasce **vermelho todo dia** dizendo "vazia".
- **`DLV-11`/`DLV-12` estavam revogadas só no `validation.md`** — a `spec.md` e o `design.md`
  continuavam mandando descomentar o SMTP. Marcadas **superseded na spec**, no precedente da `45`.
- **`DLV-03` não ganhou asserção**, e a AC nomeava a suíte errada. A régua existe desde a `42`, na
  suíte da loja. A AC foi reapontada, com a razão de **não** escrever um caso em `functions`: lá o
  dublê mocka a RPC, e o caso asseriria o dublê.
- **Três números errados** sobre o zumbi, em três documentos (nove × dez × oito, e a versão).
  Corrigidos na spec, no `validation.md` e na `BL-041`.
- **`config-check` ainda não está publicada** — produção responde o 400-com-lista-de-actions que o
  passo 1 chama de "bundle velho". O desenho daquele passo ficou validado por acidente feliz.

---

## Consequências declaradas

- **A loja segue avisando só nos 4 eventos ligados.** Os 11 restantes continuam inalcançáveis até a
  aba de Notificações existir (`BL-033`, feature `53`). Esta feature abriu o cano; ligar torneira é a
  próxima.
- **`MELHOR_ENVIO_SENDER_JSON` ficou com valor de desenvolvimento** em produção (`BL-044`), efeito
  colateral do incidente de `secrets set`. A cotação funciona (usa só o CEP); a criação de etiqueta é
  que pode falhar com 422, e ninguém a exercitou desde a troca.
- **`DLV-11`/`DLV-12` superseded** pela decisão do usuário sobre o SMTP local (ver O2).
