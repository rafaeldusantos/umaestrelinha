import { describe, expect, it } from 'vitest'
// Importado pelo barrel: prova que authErrorMessage sai de @estrelinha/core/auth.
import { AUTH_ERROR_FALLBACK, authErrorMessage } from '../index'
import { MIN_PASSWORD_LENGTH } from '../../constants'

// Os códigos abaixo foram conferidos contra o `ErrorCode` de @supabase/auth-js@2.110.7
// (dist/main/lib/error-codes.d.ts). Um código inventado aqui cairia no fallback e o teste
// passaria mesmo assim — daí a conferência ter sido feita na fonte, não de memória.

describe('authErrorMessage — sem erro', () => {
  it('devolve null para null', () => {
    expect(authErrorMessage(null)).toBeNull()
  })

  it('devolve null para undefined', () => {
    expect(authErrorMessage(undefined)).toBeNull()
  })
})

describe('authErrorMessage — por código', () => {
  const cases: ReadonlyArray<[string, string]> = [
    ['over_email_send_rate_limit', 'Aguarde alguns segundos para reenviar'],
    ['over_request_rate_limit', 'Muitas tentativas. Espere um minuto e tente de novo.'],
    ['otp_expired', 'Código inválido ou expirado. Peça um novo.'],
    ['otp_disabled', 'Entrada por código indisponível no momento.'],
    ['unexpected_failure', 'Não conseguimos enviar seu código agora. Tente de novo em instantes.'],
    ['invalid_credentials', 'E-mail ou senha inválidos'],
    ['validation_failed', 'E-mail inválido'],
    ['email_address_invalid', 'E-mail inválido'],
    ['email_address_not_authorized', 'Não conseguimos enviar para este e-mail.'],
    ['email_not_confirmed', 'Confirme seu e-mail antes de entrar.'],
    ['signup_disabled', 'Cadastro por e-mail indisponível no momento.'],
    ['email_provider_disabled', 'Cadastro por e-mail indisponível no momento.'],
    ['provider_disabled', 'Esta forma de entrar está indisponível no momento.'],
    ['user_banned', 'Esta conta está bloqueada. Fale com a gente.'],
    ['user_not_found', 'Não encontramos uma conta com esse e-mail.'],
    ['weak_password', `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`],
    ['same_password', 'A senha nova precisa ser diferente da atual.'],
    ['session_expired', 'Sessão expirada. Entre novamente.'],
    ['session_not_found', 'Sessão expirada. Entre novamente.'],
    ['bad_jwt', 'Sessão expirada. Entre novamente.'],
    ['refresh_token_not_found', 'Sessão expirada. Entre novamente.'],
    ['request_timeout', 'A conexão demorou demais. Tente de novo.'],
    ['captcha_failed', 'Não conseguimos confirmar que você não é um robô. Tente de novo.'],
  ]

  it.each(cases)('%s → %s', (code, expected) => {
    expect(authErrorMessage({ code, message: 'some english text' })).toBe(expected)
  })

  it('o código vence o status: 500 com over_email_send_rate_limit continua sendo rate limit', () => {
    expect(authErrorMessage({ code: 'over_email_send_rate_limit', status: 500 })).toBe(
      'Aguarde alguns segundos para reenviar',
    )
  })
})

describe('authErrorMessage — por status, quando não há código', () => {
  it('429 vira a mensagem de reenvio', () => {
    expect(authErrorMessage({ status: 429, message: 'For security purposes...' })).toBe(
      'Aguarde alguns segundos para reenviar',
    )
  })

  it('500 vira a mensagem de falha de envio', () => {
    expect(authErrorMessage({ status: 500 })).toBe(
      'Não conseguimos enviar seu código agora. Tente de novo em instantes.',
    )
  })

  it('503 também', () => {
    expect(authErrorMessage({ status: 503 })).toBe(
      'Não conseguimos enviar seu código agora. Tente de novo em instantes.',
    )
  })

  it('400 sem código cai no fallback, não em "falha de envio"', () => {
    expect(authErrorMessage({ status: 400 })).toBe(AUTH_ERROR_FALLBACK)
  })
})

describe('authErrorMessage — falha de rede', () => {
  it('reconhece AuthRetryableFetchError pelo name', () => {
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toBe(
      'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
    )
  })

  it('reconhece status 0 sozinho', () => {
    expect(authErrorMessage({ status: 0, message: 'Failed to fetch' })).toBe(
      'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
    )
  })
})

describe('authErrorMessage — a garantia do módulo', () => {
  // BUG-20260728: o remetente do Resend estava no sandbox, o GoTrue devolvia 500 e a cliente lia
  // "Error sending magic link email" — em inglês, citando magic link num fluxo de código de 6
  // dígitos. Este é O teste de regressão do bug.
  it('o payload literal do BUG-20260728 vira português', () => {
    const real = {
      message: 'Error sending magic link email',
      code: 'unexpected_failure',
      status: 500,
    }
    expect(authErrorMessage(real)).toBe(
      'Não conseguimos enviar seu código agora. Tente de novo em instantes.',
    )
  })

  it('nunca devolve a mensagem crua de um código desconhecido', () => {
    const english = 'Something went terribly wrong'
    const result = authErrorMessage({ code: 'code_que_nao_existe_ainda', message: english })
    expect(result).not.toBe(english)
    expect(result).toBe(AUTH_ERROR_FALLBACK)
  })

  it('erro sem código, sem status e sem name cai no fallback', () => {
    expect(authErrorMessage({ message: 'anything' })).toBe(AUTH_ERROR_FALLBACK)
  })

  it('nenhuma mensagem conhecida contém texto em inglês do GoTrue', () => {
    const suspects = ['magic link', 'Error sending', 'For security purposes', 'Token has expired']
    const codes = [
      'over_email_send_rate_limit',
      'otp_expired',
      'unexpected_failure',
      'invalid_credentials',
      'session_expired',
    ]
    for (const code of codes) {
      const msg = authErrorMessage({ code }) ?? ''
      for (const suspect of suspects) expect(msg).not.toContain(suspect)
    }
    expect(AUTH_ERROR_FALLBACK).not.toContain('Error')
  })
})
