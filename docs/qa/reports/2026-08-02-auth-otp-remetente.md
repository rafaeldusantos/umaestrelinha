# QA Run Report — 2026-08-02 — login por código: remetente do Resend

- **Scope:** reteste dirigido de `BUG-20260728-auth-local-so-entrega-ao-dono-do-resend` depois da
  verificação do domínio `send.nanita.com.br` no Resend, mais a correção do vazamento de erro em
  inglês que o mesmo bug expôs. Escopo estreito de propósito: uma cadeia (pedir código → receber →
  resgatar), não um ciclo de catálogo.
- **Cadence tier:** targeted
- **Build:** `5fd2d1c` + as mudanças deste ciclo (branch `feat/backoffice-nav-groups-rebrand-nanita`)
  · **Environment:** loja `http://localhost:8080`, Supabase local `127.0.0.1:54321`, Resend com
  domínio `send.nanita.com.br` verificado
- **Started:** 2026-08-02T15:05-03:00 · **Encerrado:** 2026-08-02T15:35-03:00 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Bia | Mobile User | phone-large 390×844 / wifi-fast / pt-BR | re-walk de `AUTH-overlay-preserva-carrinho` |

## Flows in Scope

- `J-compra-pix-celular` — passo 0 (autenticar). O bug bloqueava a jornada inteira na porta.

---

## O que estava quebrado

Pedir o código de acesso devolvia `500 unexpected_failure`. O log do GoTrue dá a causa sem
ambiguidade — não era falha silenciosa, era recusa explícita do Resend:

```
gomail: could not send email 1: 550 You can only send testing emails to your own email address
(rafael@aproximma.com.br). To send emails to other recipients, please verify a domain at
resend.com/domains, and change the `from` address to an email using this domain.
```

`supabase/config.toml` ainda tinha `admin_email = "onboarding@resend.dev"`, o remetente
compartilhado de sandbox.

**Duas premissas comuns sobre esse erro são falsas, e vale registrar as duas:**

1. **Não era "o Supabase mandando magic link em vez do Resend".** SMTP em `smtp.resend.com:465`
   autenticando com a `RESEND_API_KEY` *é* o Resend enviando. E os três templates de
   `supabase/templates/` renderizam **só** `{{ .Token }}` — código de 6 dígitos, zero links.
   `"Error sending magic link email"` é o rótulo interno do GoTrue para o handler `/otp`; pela
   mesma herança, o audit event do request sai como `user_recovery_requested`.
2. **`RESEND_FROM` não tinha nada a ver.** Ela já estava correta (`loja@send.nanita.com.br`) e
   serve **só** aos e-mails transacionais da edge function. São dois remetentes, em dois lugares
   diferentes. Acreditar que trocar um trocava os dois é exatamente o que manteve o auth no
   sandbox.

## O que mudou

| Arquivo | Mudança |
|---|---|
| `supabase/config.toml` | `admin_email` → `acesso@send.nanita.com.br`; comentários corrigidos (Mailpit vazio é esperado; `RESEND_DEV_REDIRECT_TO` virou opt-in) |
| `packages/core/src/auth/errors.ts` (novo) | `authErrorMessage` — tradução dos erros do GoTrue, com fallback que garante que `error.message` nunca chega à tela |
| `packages/auth/src/AuthContext.tsx` | os 7 retornos que devolviam `error.message` cru passam pelo mapper |
| `packages/core/src/pricing/index.ts` | `export * from './grid'` → `'./grid.ts'` — ver "Achado incidental" |
| `.env` / `.env.example` / `CLAUDE.md` / `docs/DEPLOY.md` / `docs/qa/README.md` | sincronia dos dois remetentes e do ponto de observação |

## Evidence

**1. O restart pegou** (o container de auth tinha 3 dias e carregava config pré-rebrand):

| Var | Antes | Depois |
|---|---|---|
| `GOTRUE_SMTP_ADMIN_EMAIL` | `onboarding@resend.dev` | `acesso@send.nanita.com.br` |
| `GOTRUE_SMTP_SENDER_NAME` | `NanaPin` | `Nanita` |
| `GOTRUE_MAILER_SUBJECTS_MAGIC_LINK` | `Seu código de acesso NanaPin` | `Seu código de acesso Nanita` |

O flip NanaPin→Nanita é a asserção grátis de que o `supabase stop && start` aconteceu de verdade:
o GoTrue faz hot-reload do HTML dos templates, mas os subjects vêm de env de container.

**2. Envio aceito, para um endereço que NÃO é o dono da conta Resend** — o caso exato que falhava:

```
POST /auth/v1/otp  {"email":"rafaeldusantos@gmail.com","create_user":true}
→ 200   (antes: 500 unexpected_failure)
log: "path":"/otp","status":200 — sem nenhuma linha `gomail:`
```

**3. O código existe e é resgatável.** Recuperado do hash local em `auth.one_time_tokens`
(sha224 de `email+otp`, 10⁶ candidatos) só para fechar a cadeia sem depender da caixa de entrada:

```
POST /auth/v1/verify  {"type":"email","email":"rafaeldusantos@gmail.com","token":"982857"}
→ 200  {"token_type":"bearer", user.email = "rafaeldusantos@gmail.com"}
```

**4. Re-walk de persona (Bia, 390×844, Chrome).**

| Passo | Observado |
|---|---|
| Loja em 390×844 | sem scroll horizontal no body (`scrollWidth === innerWidth`) |
| Adicionar Luffy Gear 5 | `nanapin-cart` com 1 item |
| `/checkout` deslogada | overlay abre em "Entrar ou criar conta" |
| Enviar código | avança para **"Digite o código"**, cooldown "Reenviar em 0:54", **nenhum alerta de erro** |
| Fechar o overlay (Esc) | dialog fecha, `/checkout` intacto, **carrinho segue com 1 item** ✅ |
| Reenviar dentro dos 60s | alerta diz **"Aguarde alguns segundos para reenviar"** — em português ✅ |

O passo 4 é o antes-e-depois do bug: era ali que aparecia `"Error sending magic link email"` num
`role="alert"` vermelho.

**5. Gates.** `pnpm test` 4/4 (store 505, backoffice 850, core 536, functions 232) ·
`tsc --noEmit` store 0 / backoffice 0 · `pnpm lint` 35 err / 16 warn = **baseline exata**.
Discriminação do teste de regressão provada por mutação: removendo o mapeamento de
`unexpected_failure`, 4 testes ficam vermelhos, incluindo *"o payload literal do BUG-20260728 vira
português"*.

## Correções ao registro anterior

- **O bug dizia "sem erro visível" e "overlay volta ao estado inicial".** Não confere com o código:
  `AuthEntry.tsx:34,69` renderiza `res.error` num `role="alert"`. O que a sessão de 28/07 viu como
  "silencioso" era, na verdade, a mensagem **em inglês** — provavelmente lida como ruído técnico e
  não como o erro do fluxo. O modo de falha real era pior de outro jeito: não invisível, mas
  incompreensível para a cliente.
- **`docs/qa/README.md` induzia ao erro.** A tabela de entry points listava
  "Mailpit (e-mails de auth) `:54324`". Com `[auth.email.smtp]` ligado, o Mailpit **nunca** recebe
  e-mail de auth — caixa vazia é o desenho, não sintoma. Foi essa linha que sustentou a conclusão
  "nenhum e-mail foi enviado" quando o envio estava sendo **recusado com erro explícito** no log do
  GoTrue. Corrigida, com o ponto de observação certo.
- **`.specs/features/04-store-login-ux/validation.md:114` registrava um PASS falso.** O critério
  "rate limit → mensagem orientando aguardar" estava ✅ citando `AuthCodeStep.tsx:38-42`, que é só
  `setError(res.error)`. A mensagem vinha do **mock**; nenhum código de produção a produzia. A
  metade "cooldown" do critério sempre foi verdadeira, a metade "mensagem" nunca foi — só passou a
  ser hoje. Corrigido no arquivo.

## Achado incidental (mais grave que o bug original)

**`supabase start` estava quebrado no repo inteiro.** `packages/core/src/pricing/index.ts:228`
tinha `export * from './grid'` sem extensão. O arquivo está no grafo de import do **Deno**
(`mercado-pago/handlers.ts` importa `pricing/index.ts` por caminho relativo), e o CLI monta um bind
mount por arquivo importado no boot:

```
failed to read file: open packages/core/src/pricing/grid: no such file or directory
```

Nada no lado de JS pegava — Vite e Vitest resolvem sem extensão, e `tsc` também. Isso explica o
container de auth com 3 dias: **ninguém conseguia reiniciar a stack desde a feature 11/T26.** Junto
com a nota de `docs/qa/README.md` ("antes de exercitar pagamento: `supabase stop && supabase
start`"), significa que o caminho de pagamento provavelmente também não subia. Corrigido com a
extensão explícita e um comentário dizendo por que ela é obrigatória.

## Aberto — precisa de olho humano

**A entrega na caixa de entrada não foi verificada por mim, e não dá para verificar daqui.** O que
está provado é que o Resend **aceitou** o envio (SMTP 200, sem 550). O que falta, e só quem tem
acesso ao Gmail consegue:

1. O e-mail chegou em `rafaeldusantos@gmail.com`?
2. **Caiu na entrada ou no spam?** É o primeiro envio de um subdomínio novo — o momento de maior
   risco de filtro. Se cair no spam, é achado real.
3. *Mostrar original* → `SPF: PASS`, `DKIM: PASS` com **`d=send.nanita.com.br`**, `DMARC: PASS`.
4. Remetente exibe **Nanita**, endereço `acesso@send.nanita.com.br`, assunto
   **`Seu código de acesso Nanita`**, corpo com o código de 6 dígitos na caixa framboesa.

Se os quatro passarem, a cadeia está fechada ponta a ponta.

## Bugs

Nenhum bug novo. Um fechado: `../bugs/BUG-20260728-auth-local-so-entrega-ao-dono-do-resend.md`.
