# BUG-20260728-auth-local-so-entrega-ao-dono-do-resend: Login por código não funciona em dev: e-mail vai para o Resend, não para o Mailpit

- **User impact:** Blocks-Completion
- **Persona affected:** Marina
- **Journey / step:** J-compra-pix-celular — passo 0 (autenticar)
- **Scenarios:** AUTH-overlay-preserva-carrinho
- **First seen:** 2026-07-28 · `../reports/2026-07-28-checkout-08-09.md`
- **Status:** **fixed** (retestado em persona)

## Symptom (what the user experiences)

Pedir o código de 6 dígitos em ambiente local não entrega e-mail nenhum. O overlay volta para o estado inicial ('Enviar código'), sem erro visível e sem avançar para o passo de digitar o código. O Mailpit local (`:54324`) fica vazio.

## Reproduction (from the persona's entry point)

1. Loja local em `/checkout`, deslogada.
2. Digitar qualquer e-mail que não seja o do dono da conta Resend.
3. Tocar 'Enviar código'.
4. Observar: nenhum e-mail no Mailpit, overlay volta ao estado inicial, nenhum erro na tela nem no console.

## Evidence

Mailpit `GET /api/v1/messages` retorna vazio. `supabase/config.toml` → `[auth.email.smtp] enabled = true`, `host = smtp.resend.com`, `admin_email = onboarding@resend.dev`. O próprio comentário do arquivo registra: *"funciona sem domínio verificado, mas só entrega para o e-mail da conta Resend"*. Console do browser sem erros.

## Why it matters

**Bloqueia a compra inteira em dev para qualquer pessoa que não seja o dono da conta Resend** — incluindo QA, novos devs e qualquer persona de teste. E o modo de falha é o pior possível: silencioso. A cliente (ou o dev) fica olhando um botão que voltou ao normal, sem saber que o e-mail nunca vai chegar.

Contornado nesta sessão semeando uma senha pela Admin API — o que **não** é um caminho que uma pessoa real tem.

## Root cause (when known)

A feature `04-store-login-ux` versionou o SMTP apontando para o Resend — correto — mas deixou
`admin_email = "onboarding@resend.dev"`, o remetente compartilhado de sandbox, que o Resend só
entrega para o dono da conta. **A causa é o remetente, não o SMTP estar ligado.**

O registro original dizia "Duas saídas possíveis: `enabled = false` no `config.toml` versionado, ou
documentar que dev local usa senha. **Decisão de humano**". Nenhuma das duas foi necessária: o
relatório listava uma terceira (`../reports/2026-07-28-checkout-08-09.md:181-190` — verificar um
domínio no Resend), e foi ela que se tomou. Isso mantém o SMTP versionado **e** faz o login local
funcionar para qualquer e-mail, que era o objetivo da opção 1.

**Duas coisas que este registro afirmava e não conferem:**

- **"Sem erro visível" está errado.** `AuthEntry.tsx:34,69` renderiza `res.error` num
  `role="alert"`. O GoTrue devolvia `500 unexpected_failure` e a loja mostrava
  `"Error sending magic link email"` — em inglês. A sessão de 28/07 provavelmente leu isso como
  ruído técnico. O modo de falha não era invisível; era incompreensível.
- **"Mailpit vazio" não era sintoma.** Com `[auth.email.smtp]` ligado, o Mailpit nunca recebe
  e-mail de auth. A conclusão "nenhum e-mail foi enviado" veio da linha enganosa em
  `docs/qa/README.md` (corrigida) — quando na verdade o envio estava sendo **recusado com erro
  explícito** (`550`) no log do GoTrue, que era onde olhar.

---

## Fix — 2026-08-02

- **O que mudou:** `admin_email` em `[auth.email.smtp]` passou de `onboarding@resend.dev` para
  `acesso@send.nanita.com.br`, depois da verificação do domínio `send.nanita.com.br` no Resend.
  Junto, `authErrorMessage` (`packages/core/src/auth/errors.ts`) passou a traduzir os erros do
  GoTrue — os 7 retornos do `AuthContext` que devolviam `error.message` cru agora passam por ele,
  com fallback que garante que nenhum inglês chegue à cliente.
- **Commit:** ver `fix(auth): e-mails de login saem do domínio verificado da Nanita` e
  `fix(auth): erro de login fala português`.
- **Teste de regressão:** `packages/core/src/auth/__tests__/errors.test.ts` — *"o payload literal do
  BUG-20260728 vira português"* usa o erro exato deste bug
  (`{message:'Error sending magic link email', code:'unexpected_failure', status:500}`).
  Discriminação provada por mutação: sem o mapeamento, 4 testes ficam vermelhos.
  No lado da loja, `authContext.test.tsx` ganhou *"nunca deixa o 500 do GoTrue chegar cru à
  cliente"*.
- **Retestado:** re-caminhada em 390×844 como Bia, sessão fresca. `POST /auth/v1/otp` para
  `rafaeldusantos@gmail.com` (**não** é o dono da conta Resend) devolve **200**, sem `gomail:` no
  log; o código foi resgatado em `/auth/v1/verify` → `200` com sessão bearer. No overlay: avança
  para "Digite o código" sem alerta, o carrinho sobrevive ao fechar, e o reenvio dentro dos 60s diz
  **"Aguarde alguns segundos para reenviar"** em português. Gate completo: **2123 testes, 0
  falhas** · `tsc` 0/0 · lint na baseline (35/16). Relatório:
  `../reports/2026-08-02-auth-otp-remetente.md`.
- **Aberto:** a confirmação de **caixa de entrada** (chegou? spam? SPF/DKIM com
  `d=send.nanita.com.br`?) depende de acesso ao Gmail e não foi feita — está listada no relatório.
