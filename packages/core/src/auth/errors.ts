// Tradução dos erros do GoTrue para o português da loja.
//
// ---------------------------------------------------------------------------------------------
// Por que isto existe: até 2026-08-02 o `AuthContext` devolvia `error.message` cru em sete
// pontos, e os passos do overlay renderizavam a string direto num `role="alert"` vermelho. Quando
// o remetente do Resend quebrou, a cliente leu **"Error sending magic link email"** na tela — em
// inglês, citando "magic link" num fluxo que manda código de 6 dígitos
// (BUG-20260728-auth-local-so-entrega-ao-dono-do-resend).
//
// Por que em `core` e não em `@estrelinha/auth`: `packages/auth/package.json` não tem bloco
// `scripts`, então teste posto lá é invisível ao `pnpm test` (`turbo run test`). `core` já roda
// vitest, e o precedente de constante compartilhada de auth morar aqui já existe
// (`MIN_PASSWORD_LENGTH`, usado pelo mesmo `AuthContext`).
// ---------------------------------------------------------------------------------------------

import { MIN_PASSWORD_LENGTH } from '../constants.ts'

/**
 * O formato mínimo de um `AuthError` do supabase-js. Declarado estruturalmente em vez de importar
 * o tipo: mantém `core` livre de dependência do client de auth, e aceita tanto o erro real quanto
 * o objeto simples que os testes montam.
 */
export interface AuthErrorLike {
  message?: string
  code?: string
  status?: number
  name?: string
}

/**
 * A rede de segurança. Qualquer coisa que não caia numa regra conhecida vira isto — inclusive
 * códigos que o Supabase inventar depois de hoje. É o que garante a regra dura do módulo:
 * **`error.message` nunca chega à tela**.
 */
export const AUTH_ERROR_FALLBACK = 'Não foi possível concluir agora. Tente de novo em instantes.'

const RATE_LIMITED = 'Aguarde alguns segundos para reenviar'
const SEND_FAILED = 'Não conseguimos enviar seu código agora. Tente de novo em instantes.'
const SESSION_GONE = 'Sessão expirada. Entre novamente.'
const OFFLINE = 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'

const BY_CODE: Record<string, string> = {
  // Reenvio antes do `max_frequency = "60s"` do config.toml. A spec da 04 pede esta redação
  // desde sempre; era o único item do desenho que nunca tinha chegado ao código.
  over_email_send_rate_limit: RATE_LIMITED,
  over_request_rate_limit: 'Muitas tentativas. Espere um minuto e tente de novo.',

  // O GoTrue devolve `otp_expired` para código ERRADO e para código VENCIDO — não dá para
  // distinguir os dois pelo erro, e prometer a diferença seria mentira. Daí a redação única.
  otp_expired: 'Código inválido ou expirado. Peça um novo.',
  otp_disabled: 'Entrada por código indisponível no momento.',

  // O 500 deste bug. Do lado da cliente é indistinguível de qualquer outra falha de envio.
  unexpected_failure: SEND_FAILED,

  invalid_credentials: 'E-mail ou senha inválidos',
  validation_failed: 'E-mail inválido',
  email_address_invalid: 'E-mail inválido',
  email_address_not_authorized: 'Não conseguimos enviar para este e-mail.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',

  signup_disabled: 'Cadastro por e-mail indisponível no momento.',
  email_provider_disabled: 'Cadastro por e-mail indisponível no momento.',
  provider_disabled: 'Esta forma de entrar está indisponível no momento.',

  user_banned: 'Esta conta está bloqueada. Fale com a gente.',
  user_not_found: 'Não encontramos uma conta com esse e-mail.',

  weak_password: `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
  same_password: 'A senha nova precisa ser diferente da atual.',

  session_expired: SESSION_GONE,
  session_not_found: SESSION_GONE,
  bad_jwt: SESSION_GONE,
  refresh_token_not_found: SESSION_GONE,

  request_timeout: 'A conexão demorou demais. Tente de novo.',
  captcha_failed: 'Não conseguimos confirmar que você não é um robô. Tente de novo.',
}

/**
 * Devolve a mensagem em português para um erro de auth, ou `null` quando não houve erro.
 *
 * A ordem das checagens importa: `code` é o sinal mais específico e estável (o GoTrue promete os
 * códigos, não as mensagens), `status` é o fallback grosso, e a falha de rede vem por último
 * porque só é reconhecível pela ausência dos outros dois.
 */
export function authErrorMessage(error: AuthErrorLike | null | undefined): string | null {
  if (!error) return null

  const byCode = error.code ? BY_CODE[error.code] : undefined
  if (byCode) return byCode

  // Falha de fetch: o supabase-js embrulha em `AuthRetryableFetchError` com `status` 0. Dizer
  // "tente de novo em instantes" para quem está sem internet manda a pessoa repetir o que não
  // pode dar certo.
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) return OFFLINE

  if (error.status === 429) return RATE_LIMITED
  if (typeof error.status === 'number' && error.status >= 500) return SEND_FAILED

  return AUTH_ERROR_FALLBACK
}
