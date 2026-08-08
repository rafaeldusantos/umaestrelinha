# Deploy — Vercel + Supabase hospedado

Guia de configuração de produção da Nanita. Dois apps deployados de forma independente na
Vercel, um backend Supabase hospedado, e um workflow do GitHub Actions que aplica migrations e
edge functions a cada push na `main`.

| Peça | Onde roda | Quem publica |
| --- | --- | --- |
| `apps/store` | Vercel (projeto `nanapin-store`) | integração Git da Vercel |
| `apps/backoffice` | Vercel (projeto `nanapin-backoffice`) | integração Git da Vercel |
| `supabase/migrations` | projeto Supabase `mfdgqlirsjswxpbhgxig` | GitHub Actions (`supabase-deploy.yml`) |
| `supabase/functions` | idem | GitHub Actions (`supabase-deploy.yml`) |
| `supabase/config.toml` | **só local** | ninguém — ver [Por que config.toml não sobe](#por-que-configtoml-não-sobe) |

Referência do projeto Supabase: **`mfdgqlirsjswxpbhgxig`** · URL `https://mfdgqlirsjswxpbhgxig.supabase.co`

---

## 0. Antes de tudo — rotacione a secret key

A `sb_secret_...` (service role) foi compartilhada em canal de chat. Ela ignora RLS: quem tem
essa chave lê e escreve **qualquer linha de qualquer tabela**. Vá em
**Supabase → Project Settings → API Keys → Secret keys → Rotate** e gere uma nova antes de
colocar a loja no ar.

Regras que valem para sempre:

- A secret key **nunca** entra em variável `VITE_*`. Tudo que tem prefixo `VITE_` é compilado
  dentro do bundle e fica visível no navegador.
- A loja e o backoffice usam **só** `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.
  A publishable key é pública por design — a proteção é RLS.
- A secret key só existe dentro das edge functions, onde o próprio Supabase injeta
  `SUPABASE_SERVICE_ROLE_KEY` automaticamente. **Não** precisa ser setada à mão.
- O `SUPABASE_JWKS_URL` não é usado pelo código atual — pode ignorar.

---

## 1. Primeiro sync manual do banco (uma vez, da sua máquina)

Antes de ligar a automação, o estado do projeto remoto precisa bater com `supabase/migrations/`.
Faça isso local, com calma, olhando o resultado de cada comando.

```bash
# 1.1 — autentique o CLI (abre o navegador)
npx supabase login

# 1.2 — vincule o repo ao projeto remoto (pede a senha do banco)
npx supabase link --project-ref mfdgqlirsjswxpbhgxig

# 1.3 — compare local x remoto ANTES de aplicar nada
npx supabase migration list --linked
```

O que a saída do 1.3 significa:

- **Coluna `Remote` vazia em todas as linhas** → projeto virgem. Siga para o `db push`.
- **Algumas linhas com `Remote` preenchido** → normal, o push aplica só o resto.
- **`Remote` tem versões que o `Local` não tem** (ex.: schema criado pelo Lovable ou pelo Studio)
  → **não faça push**. Reconcilie primeiro com
  `npx supabase migration repair --status reverted <versao>` ou
  `npx supabase migration repair --status applied <versao>`, conforme o caso. Um `db push` por
  cima de um schema divergente falha no meio e deixa o banco em estado parcial.

```bash
# 1.4 — aplicar
npx supabase db push --linked
```

O `db push` **não** roda `supabase/seed.sql`. Se precisar de dados iniciais (categorias, settings),
rode os inserts manualmente pelo SQL Editor do painel — e revise antes, porque o seed é escrito
para um banco vazio.

### 1.5 — Secrets das edge functions

O `[edge_runtime.secrets]` do `config.toml` só vale local. No projeto hospedado:

```bash
npx supabase secrets set \
  MERCADO_PAGO_ACCESS_TOKEN=APP_USR-... \
  MERCADO_PAGO_WEBHOOK_SECRET=... \
  RESEND_API_KEY=re_... \
  RESEND_FROM="Nanita Store<loja@send.nanita.com.br>" \
  STORE_PUBLIC_URL=https://nanita.com.br \
  MELHOR_ENVIO_TOKEN=... \
  MELHOR_ENVIO_ENV=production \
  MELHOR_ENVIO_SENDER_JSON='{"...":"..."}'
```

Cuidados:

- **`RESEND_DEV_REDIRECT_TO` não vai para produção.** Preenchida, ela sequestra todo destinatário
  e nenhum cliente recebe e-mail.
- **`STORE_PUBLIC_URL` é a origem da loja**, não a do Supabase. É a base dos links "Acompanhar em
  Minha conta" nos e-mails.
- **`RESEND_FROM` malformado é 422 em todos os e-mails** — apagão silencioso. Use
  `Nome <email@dominio>` ou só `email@dominio`, e o domínio precisa estar verificado no Resend
  (`onboarding@resend.dev` só entrega para o dono da conta).
- **`RESEND_FROM` é só dos transacionais.** O remetente dos e-mails de **auth** é outro
  (`acesso@send.nanita.com.br`) e não é secret: no local vem de `admin_email` em
  `[auth.email.smtp]` do `config.toml`; no hospedado, do painel (§5.1). Trocar só o `RESEND_FROM`
  deixa o login mandando do endereço antigo — foi exatamente assim que o `BUG-20260728` nasceu.
- `MERCADO_PAGO_ACCESS_TOKEN` de produção: confira o modo com
  `curl -s https://api.mercadopago.com/users/me -H "Authorization: Bearer $TOKEN"` — se aparecer
  `test_user` em `tags`, ainda é sandbox. O prefixo `APP_USR-` **não** distingue.
- As `MELHOR_ENVIO_*` não estão no `.env.example` da raiz; pegue os valores do painel do
  Melhor Envio.

Confira o que ficou setado (mostra só os nomes/digests, não os valores):

```bash
npx supabase secrets list
```

### 1.6 — Deploy inicial das functions

```bash
npx supabase functions deploy --project-ref mfdgqlirsjswxpbhgxig
```

Sobem `melhor-envio`, `mercado-pago` e `send-email`. `_shared/` é ignorado pelo CLI por causa do
prefixo `_`. O `verify_jwt = false` de cada uma vem do `[functions.*]` do `config.toml` — o CLI lê
essa parte no deploy, então não precisa de flag.

---

## 2. GitHub — secrets e Actions

Os dois workflows já estão no repo:

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — em PR e em push na `main`: install,
  `pnpm test`, `pnpm build`. `lint` e `typecheck` rodam com `continue-on-error` porque existe
  baseline de erros pré-existentes (ver `CLAUDE.md` → "Estado conhecido / dívidas"); quando a
  baseline for zerada, remova o `continue-on-error` e eles viram gate de verdade. Os testes rodam
  com `turbo --concurrency=1`: em paralelo, os dois apps saturam o runner de 2 vCPUs e a suíte do
  backoffice fica flaky (crash no meio da coleta, não falha real de asserção).
- [`.github/workflows/supabase-deploy.yml`](../.github/workflows/supabase-deploy.yml) — em push na
  `main` que toque `supabase/migrations/**` ou `supabase/functions/**`: `db push` + `functions
  deploy`. Também dá para disparar na mão (**Actions → Supabase Deploy → Run workflow**), com
  checkbox separado para migrations e functions.

### 2.1 — Criar o Environment `production`

**Settings → Environments → New environment → `production`.**

Marque **Required reviewers** com você mesmo. Assim todo `db push` automático espera um clique de
aprovação — o que você quer, porque migration em produção não tem `Ctrl+Z`.

### 2.2 — Secrets do Environment

Em **Settings → Environments → production → Environment secrets**:

| Secret | Valor | Onde achar |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | `sbp_...` | https://supabase.com/dashboard/account/tokens → Generate new token |
| `SUPABASE_PROJECT_REF` | `mfdgqlirsjswxpbhgxig` | — |
| `SUPABASE_DB_PASSWORD` | senha do Postgres | Project Settings → Database → Database password (se não souber, **Reset database password**) |

O `SUPABASE_ACCESS_TOKEN` é um token **de conta**, não do projeto: ele consegue mexer em todos os
seus projetos Supabase. Guarde só como secret do Environment (não como secret do repositório) para
ficar coberto pelo required reviewer.

### 2.3 — Proteger a `main`

**Settings → Branches → Add rule** em `main`: exigir PR e exigir o status check **`test + build`**
do CI. Sem isso, um push direto na `main` com teste vermelho vai para produção.

---

## 3. Vercel — dois projetos, um repositório

O monorepo vira **dois projetos** na Vercel apontando para o mesmo repo, cada um com um Root
Directory diferente. Os arquivos [`apps/store/vercel.json`](../apps/store/vercel.json) e
[`apps/backoffice/vercel.json`](../apps/backoffice/vercel.json) já definem build, SPA rewrite,
cache e headers — o que sobra é o que só existe no painel.

### 3.1 — Importar

**Vercel → Add New → Project → Import** `rafaeldusantos/nanapin-store`. Faça duas vezes:

| | Projeto 1 | Projeto 2 |
| --- | --- | --- |
| Project Name | `nanapin-store` | `nanapin-backoffice` |
| **Root Directory** | `apps/store` | `apps/backoffice` |
| Framework Preset | Vite | Vite |
| Build / Output / Install | deixe como está — vêm do `vercel.json` | idem |

### 3.2 — Ligar "Include files outside the Root Directory"

**Settings → Build and Deployment → Root Directory → marcar "Include files outside of the Root
Directory in the Build Step".**

Isso é **obrigatório**, não opcional. Os apps importam `packages/ui`, `packages/core`,
`packages/auth` e `packages/supabase` como **source**, via alias do Vite (`path.resolve(root,
"packages/...")`). Sem esse toggle a Vercel só copia `apps/store/` e o build quebra em
`Failed to resolve import "@nanapin/ui"`.

### 3.3 — Variáveis de ambiente

**Settings → Environment Variables**, marcando os três ambientes (Production, Preview, Development):

Projeto `nanapin-store`:

```
VITE_SUPABASE_URL=https://mfdgqlirsjswxpbhgxig.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_QuMTlvxE5KaoQOSg3KvJ3A_slwQZBeK
VITE_MP_PUBLIC_KEY=<public key de PRODUÇÃO do Mercado Pago>
```

Projeto `nanapin-backoffice`:

```
VITE_SUPABASE_URL=https://mfdgqlirsjswxpbhgxig.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_QuMTlvxE5KaoQOSg3KvJ3A_slwQZBeK
```

A `VITE_MP_PUBLIC_KEY` tem que ser o **par** do `MERCADO_PAGO_ACCESS_TOKEN` que você setou nos
secrets do Supabase. Public key de teste com access token de produção = Brick que monta e cobrança
que falha.

Variável `VITE_*` é lida no **build**, não em runtime: mudar o valor exige **Redeploy** (e um
redeploy *sem* "Use existing Build Cache").

### 3.4 — Se o build falhar no install

O repo declara `packageManager: pnpm@11.11.0`. Se a Vercel reclamar de versão de pnpm
desconhecida, adicione a env var `ENABLE_EXPERIMENTAL_COREPACK=1` no projeto — com ela a Vercel
usa exatamente a versão do campo `packageManager`.

### 3.5 — Builds que não precisavam rodar

O `ignoreCommand` dos `vercel.json` usa `turbo-ignore`: um commit que só mexe no backoffice não
dispara build da loja, e vice-versa. Se um deploy for cancelado como "no changes" mas você
precisava dele (mudou env var, por exemplo), use **Redeploy** no painel — ele ignora o
`ignoreCommand`.

---

## 4. DNS — nanita.com.br

Plano de domínios:

| Domínio | Aponta para |
| --- | --- |
| `nanita.com.br` | projeto `nanapin-store` (principal) |
| `www.nanita.com.br` | redirect 308 → `nanita.com.br` |
| `admin.nanita.com.br` | projeto `nanapin-backoffice` |

Passos:

1. No projeto `nanapin-store`: **Settings → Domains → Add** → `nanita.com.br`. A Vercel pergunta o
   que fazer com o `www` — escolha **redirecionar www para o apex**.
2. No projeto `nanapin-backoffice`: **Settings → Domains → Add** → `admin.nanita.com.br`.
3. A Vercel mostra os registros exatos a criar. **Use os valores que aparecem no painel**, porque
   os IPs de apex mudam por região/conta. O formato é sempre:
   - apex (`nanita.com.br`) → registro **A** para o IP que a Vercel indicar
     (historicamente `76.76.21.21`; contas novas recebem `216.198.79.1`);
   - subdomínios (`www`, `admin`) → registro **CNAME** para o host que a Vercel indicar
     (`cname.vercel-dns.com` ou um `*.vercel-dns-0NN.com`).
4. Crie os registros no painel do registrador (Registro.br, se o `.com.br` foi registrado lá:
   **Meus domínios → nanita.com.br → Editar zona DNS**). TTL padrão serve.
5. Volte na Vercel e espere o check virar **Valid Configuration**. Propagação leva de minutos a
   algumas horas; o certificado TLS é emitido sozinho depois disso.

Enquanto o DNS não propaga, os domínios `*.vercel.app` já funcionam — dá para fazer todo o resto
da configuração usando eles e trocar as URLs depois.

---

## 5. Depois que o domínio estiver no ar

Esta parte é a que costuma ser esquecida e quebra login e pagamento em produção.

### 5.1 — Auth (painel do Supabase)

**Authentication → URL Configuration**

- Site URL: `https://nanita.com.br`
- Redirect URLs: adicione todas —
  ```
  https://nanita.com.br
  https://nanita.com.br/**
  https://admin.nanita.com.br
  https://admin.nanita.com.br/**
  ```
  Os `/**` cobrem os `returnTo` dinâmicos da loja (`/conta`, `/checkout`, `/favoritos`).

**Authentication → Providers → Google**: crie um client OAuth **web separado** para produção em
https://console.cloud.google.com/auth/clients, com Authorized redirect URI
`https://mfdgqlirsjswxpbhgxig.supabase.co/auth/v1/callback`, e cole client ID/secret. Tire o
consent screen de "Testing" para "In production", senão só os test users conseguem logar.

**Authentication → SMTP Settings**: host `smtp.resend.com`, porta `465`, user `resend`, senha =
`RESEND_API_KEY`, **Sender email `acesso@send.nanita.com.br`**, **Sender name `Nanita`**. É o
espelho de `admin_email` / `sender_name` em `[auth.email.smtp]` do `config.toml` — o `config.toml`
não é empurrado para o hospedado (ver §7), então este campo é a única cópia que vale lá. Deixá-lo
em `onboarding@resend.dev` derruba **todo** login por código: o Resend recusa com
`550 You can only send testing emails to your own email address`, e o GoTrue devolve
`500 unexpected_failure` (`BUG-20260728`).

**Authentication → Email Templates**: cole o conteúdo de `supabase/templates/magic_link.html`,
`confirmation.html` e `recovery.html`. Todos usam `{{ .Token }}` — o login da loja é por **código
de 6 dígitos**, não por link. Um template padrão do Supabase (que manda link) quebra o fluxo.

### 5.2 — Mercado Pago

**Painel MP → Suas integrações → sua aplicação → Webhooks**, URL de notificação:

```
https://mfdgqlirsjswxpbhgxig.supabase.co/functions/v1/mercado-pago?action=webhook
```

Salve e copie a **assinatura secreta** que aparece — é o `MERCADO_PAGO_WEBHOOK_SECRET`. Produção e
teste têm segredos **distintos**: se você setou o de teste, todo webhook de produção volta 401.

A URL fica só no painel: a API de Orders recusa `notification_url` no corpo
(`unsupported_properties`).

### 5.3 — Resend

O subdomínio de envio **`send.nanita.com.br`** já está verificado em **Resend → Domains** (SPF/DKIM
na mesma zona DNS do passo 4), desde 2026-08-02. É `send.` e não o apex: manter o envio num
subdomínio isola a reputação do domínio principal.

Dois endereços saem dele, e cada um se configura num lugar diferente:

| Stream | Endereço | Onde se configura |
| --- | --- | --- |
| E-mails de **auth** (código de login, reset) | `acesso@send.nanita.com.br` | Painel Supabase → SMTP Settings (§5.1). Local: `admin_email` no `config.toml`. |
| E-mails **transacionais** (pedido) | `loja@send.nanita.com.br` | Secret `RESEND_FROM` (§3). |

Reputação de entrega é medida no domínio da assinatura DKIM (`d=send.nanita.com.br`), o mesmo para
os dois — separar o local-part não custa entrega e deixa cada stream filtrável no painel do Resend.

---

## 6. Ordem de deploy no dia a dia

Vercel e Supabase publicam em paralelo e não se conhecem. Isso cria uma janela de alguns minutos
em que um lado está novo e o outro velho. Regra:

- **Mudança compatível para trás** (coluna nova opcional, tabela nova): merge normal na `main`,
  os dois workflows correm juntos, tudo bem.
- **Mudança quebrante** (renomear/remover coluna, mudar contrato de function): aplique o banco
  **antes** do front. Rode **Actions → Supabase Deploy → Run workflow** com só
  `push_migrations` marcado, confirme, e só então faça o merge do código.
- No caminho inverso (função nova que o front ainda não usa) não há problema.

Existe um caso concreto já documentado: durante um deploy em que a edge function sobe antes do
bundle da loja, abas já abertas continuam mandando item sem `variant_id`. É para isso que existe
a env `STRICT_VARIANT_PRICING=false` — ligue-a só durante a janela e **religue depois**, porque
deixá-la desligada em regime é cobrar `base_price` em silêncio.

## Por que config.toml não sobe

O `supabase/config.toml` descreve o ambiente **local**: `site_url = http://127.0.0.1:8080`,
redirect urls de localhost, SMTP com `RESEND_DEV_REDIRECT_TO`. Existe um `supabase config push`,
mas rodá-lo apontado para produção sobrescreveria o auth do projeto hospedado com essa
configuração de desenvolvimento — login quebrado, e-mail sequestrado. Por isso o workflow faz
só `db push` e `functions deploy`.

A consequência é que **auth de produção é configuração de painel**, e mudanças em
`config.toml`/`templates/` precisam ser replicadas à mão (seção 5.1). Se isso incomodar, o
caminho é um segundo `config.toml` de produção com `env()` para as URLs — não está feito.

---

## 7. Smoke test depois do primeiro deploy

Comece em **390×844** (≈90% dos acessos da loja são mobile) e só depois olhe desktop:

1. `https://nanita.com.br` abre, sem scroll horizontal no body.
2. Recarregue direto em `https://nanita.com.br/checkout` — tem que carregar, não 404. (É o teste
   do rewrite de SPA; se falhar, o `vercel.json` não foi aplicado.)
3. Login por código de 6 dígitos, **com um e-mail que não seja o dono da conta Resend**: o e-mail
   chega, o remetente é `Nanita <acesso@send.nanita.com.br>`, o assunto é
   `Seu código de acesso Nanita`, e o código funciona. Se der erro na tela, o log real está em
   **Supabase → Authentication → Logs** — a mensagem que a cliente vê é traduzida e genérica de
   propósito.
4. Login com Google.
5. Carrinho → checkout → PIX: QR code aparece, e-mail "pedido recebido" chega.
6. Pague o PIX e confirme que o webhook mudou o pedido para pago e que o e-mail de aprovação saiu
   (**Supabase → Edge Functions → mercado-pago → Logs** se não sair).
7. `https://admin.nanita.com.br` exige login admin e lista os pedidos.
