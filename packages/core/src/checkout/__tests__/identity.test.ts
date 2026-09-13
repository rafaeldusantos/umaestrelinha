import { describe, expect, it } from 'vitest'
import { checkoutIdentityRefusal, resolveCheckoutIdentity, type CheckoutIdentity } from '../index'

// IDN-02: e-mail com conta, sem sessão ⇒ a tela pede o código
// IDN-08: a MESMA resposta é o que faz o servidor recusar a gravação
// Edge case da spec: quem tem sessão não é desafiada pelo e-mail que digitou

describe('resolveCheckoutIdentity', () => {
  it('com sessão é sessão', () => {
    expect(resolveCheckoutIdentity({ hasSession: true, emailHasAccount: false })).toBe('session')
  })

  it('a sessão vence o e-mail com conta — quem está logada não é desafiada', () => {
    // A borda da spec: o e-mail digitado é o CONTATO do pedido; a identidade é a da conta.
    // Sem esta precedência, quem compra para presentear seria barrada pelo e-mail de quem recebe.
    expect(resolveCheckoutIdentity({ hasSession: true, emailHasAccount: true })).toBe('session')
  })

  it('sem sessão e e-mail livre é convidada', () => {
    expect(resolveCheckoutIdentity({ hasSession: false, emailHasAccount: false })).toBe('guest')
  })

  it('sem sessão e e-mail com conta é desafio', () => {
    expect(resolveCheckoutIdentity({ hasSession: false, emailHasAccount: true })).toBe('challenge')
  })
})

describe('checkoutIdentityRefusal', () => {
  it('não recusa quem tem sessão', () => {
    expect(checkoutIdentityRefusal('session')).toBeNull()
  })

  it('não recusa a convidada', () => {
    expect(checkoutIdentityRefusal('guest')).toBeNull()
  })

  it('recusa o desafio com um motivo legível, que nomeia o cadastro e o código', () => {
    const motivo = checkoutIdentityRefusal('challenge')

    // Asserção sobre o CONTEÚDO, não sobre "não é nulo": uma string vazia passaria no truthiness
    // invertido e deixaria a cliente sem explicação nenhuma na tela e no 409.
    expect(motivo).toContain('cadastro')
    expect(motivo).toContain('código')
  })

  it('a recusa não usa urgência fabricada nem culpa quem digitou', () => {
    // A loja é memorial: o vocabulário é restrição de produto, não preferência de estilo.
    const motivo = checkoutIdentityRefusal('challenge') ?? ''

    expect(motivo).not.toMatch(/agora|rápido|último|urgente|erro|inválido|!/i)
  })

  it('só o desafio recusa — os outros dois vereditos são nulos', () => {
    // Trava o conjunto: um veredito novo que nascesse recusando teria de passar por aqui.
    const vereditos: CheckoutIdentity[] = ['session', 'guest', 'challenge']
    const recusados = vereditos.filter((v) => checkoutIdentityRefusal(v) !== null)

    expect(recusados).toEqual(['challenge'])
  })
})
