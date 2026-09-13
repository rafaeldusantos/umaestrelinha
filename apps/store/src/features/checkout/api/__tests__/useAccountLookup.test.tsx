import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

/**
 * `IDN-01`/`IDN-09` — a consulta do e-mail.
 *
 * Os dois casos que decidem o desenho:
 *
 *   - **uma requisição por e-mail normalizado**, senão cada blur de um campo que a pessoa revisita
 *     dispara outra, e o teto por IP da function fecha na cara de quem só estava corrigindo;
 *   - **falha responde `false`**, nunca `true`: a recusa que decide é a do servidor, e um `true` de
 *     erro desafiaria toda cliente nova — ninguém compraria.
 */

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { functions: { invoke } } }))

import { resetAccountLookupCache, useAccountLookup } from '../useAccountLookup'

const lookup = () => renderHook(() => useAccountLookup()).result.current

beforeEach(() => {
  resetAccountLookupCache()
  invoke.mockReset().mockResolvedValue({ data: { registered: false }, error: null })
})

describe('useAccountLookup — a resposta', () => {
  it('`registered: true` vira `true`', async () => {
    invoke.mockResolvedValue({ data: { registered: true }, error: null })

    await expect(lookup().check('marina@exemplo.com')).resolves.toBe(true)
  })

  it('`registered: false` vira `false`', async () => {
    await expect(lookup().check('nova@exemplo.com')).resolves.toBe(false)
  })

  it('pergunta à action `identify` da function `checkout`', async () => {
    await lookup().check('marina@exemplo.com')

    expect(invoke).toHaveBeenCalledWith('checkout?action=identify', {
      body: { email: 'marina@exemplo.com' },
    })
  })

  it('um corpo sem `registered` não vira "tem conta"', async () => {
    invoke.mockResolvedValue({ data: {}, error: null })

    await expect(lookup().check('marina@exemplo.com')).resolves.toBe(false)
  })
})

describe('useAccountLookup — uma pergunta por e-mail (IDN-01)', () => {
  it('dois blur no MESMO e-mail fazem UMA requisição', async () => {
    invoke.mockResolvedValue({ data: { registered: true }, error: null })
    const { check } = lookup()

    await check('marina@exemplo.com')
    await check('marina@exemplo.com')

    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it('maiúsculas e espaços são o MESMO e-mail', async () => {
    // A chave é a normalizada, a mesma que o servidor usa em `lower(trim(...))`. Sem isso, corrigir
    // a caixa de uma letra dispararia outra consulta e a tela poderia responder diferente.
    invoke.mockResolvedValue({ data: { registered: true }, error: null })
    const { check } = lookup()

    await check('  Marina@Exemplo.COM ')
    await check('marina@exemplo.com')

    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it('e-mail diferente pergunta de novo', async () => {
    invoke.mockResolvedValue({ data: { registered: true }, error: null })
    const { check } = lookup()

    await check('marina@exemplo.com')
    await check('outra@exemplo.com')

    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it('duas chamadas simultâneas compartilham a MESMA requisição em voo', async () => {
    // O caso que um cache de RESULTADO (em vez de promessa) não cobre: as duas saem antes de a
    // primeira responder.
    invoke.mockResolvedValue({ data: { registered: true }, error: null })
    const { check } = lookup()

    await Promise.all([check('marina@exemplo.com'), check('marina@exemplo.com')])

    expect(invoke).toHaveBeenCalledTimes(1)
  })
})

describe('useAccountLookup — entrada inválida não vira requisição', () => {
  it.each([
    ['vazio', ''],
    ['sem arroba', 'marina.exemplo.com'],
    ['sem domínio', 'marina@'],
    ['sem ponto', 'marina@exemplo'],
    ['só espaços', '   '],
  ])('%s responde `false` sem chamar a function', async (_rotulo, email) => {
    await expect(lookup().check(email)).resolves.toBe(false)
    expect(invoke).not.toHaveBeenCalled()
  })
})

describe('useAccountLookup — a falha responde `false` (IDN-09)', () => {
  it('erro da function responde `false`', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('429') })

    await expect(lookup().check('marina@exemplo.com')).resolves.toBe(false)
  })

  it('rede caindo responde `false` em vez de lançar', async () => {
    // Um throw aqui subiria pelo `onBlur` do campo e derrubaria o checkout inteiro.
    invoke.mockRejectedValue(new Error('Failed to fetch'))

    await expect(lookup().check('marina@exemplo.com')).resolves.toBe(false)
  })

  it('resposta negativa NÃO é cacheada — a rede pode voltar', async () => {
    // Cachear o `false` de uma falha prenderia a pessoa no caminho de convidada pelo resto da
    // sessão, e ela só descobriria no 409 do fim.
    invoke.mockResolvedValueOnce({ data: null, error: new Error('boom') })
    invoke.mockResolvedValue({ data: { registered: true }, error: null })
    const { check } = lookup()

    await expect(check('marina@exemplo.com')).resolves.toBe(false)
    await expect(check('marina@exemplo.com')).resolves.toBe(true)
    expect(invoke).toHaveBeenCalledTimes(2)
  })
})
