// Feature 79, T15 — `MAN-21`: a origem só é obedecida quando é caminho do próprio app.
import { describe, expect, it } from 'vitest'
import { destinoDepoisDoLogin } from '../destinoDepoisDoLogin'

describe('destinoDepoisDoLogin (MAN-21)', () => {
  it('caminho do app é aceito, com a query', () => {
    expect(destinoDepoisDoLogin({ from: '/pedidos/x' })).toBe('/pedidos/x')
    expect(destinoDepoisDoLogin({ from: '/pedidos?visao=todos' })).toBe('/pedidos?visao=todos')
  })

  it.each([
    ['a Início', { from: '/' }],
    ['outro host (//)', { from: '//host/pedidos/x' }],
    ['outro host pela barra invertida (/\\)', { from: '/\\host/pedidos/x' }],
    ['URL absoluta', { from: 'https://x' }],
    ['relativo', { from: 'pedidos' }],
    ['vazio', { from: '' }],
    ['não-string', { from: 42 }],
    ['objeto sem from', { profundidade: 1 }],
    ['null', null],
    ['undefined', undefined],
  ])('%s ⇒ /', (_nome, estado) => {
    expect(destinoDepoisDoLogin(estado)).toBe('/')
  })
})
