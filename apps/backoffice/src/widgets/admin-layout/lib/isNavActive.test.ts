import { describe, it, expect } from 'vitest'
import { isNavActive } from './isNavActive'

describe('isNavActive', () => {
  it('activates Produtos on a nested product route', () => {
    expect(isNavActive('/admin/produtos/novo', '/admin/produtos')).toBe(true)
    expect(isNavActive('/admin/produtos/123/editar', '/admin/produtos')).toBe(true)
    expect(isNavActive('/admin/produtos', '/admin/produtos')).toBe(true)
  })

  it('does not activate Dashboard on nested routes (exact match only)', () => {
    expect(isNavActive('/admin/produtos', '/admin')).toBe(false)
    expect(isNavActive('/admin', '/admin')).toBe(true)
  })

  it('does not cross-match sibling routes', () => {
    expect(isNavActive('/admin/produtos', '/admin/pedidos')).toBe(false)
    // prefixo de string que não é de segmento não deve casar
    expect(isNavActive('/admin/produtos-extra', '/admin/produtos')).toBe(false)
  })
})

describe('isNavActive — o destino mais específico vence', () => {
  it('Pedidos montados acende sozinho na lista e na página de uma proposta', () => {
    for (const p of ['/admin/pedidos/montados', '/admin/pedidos/montados/abc']) {
      expect(isNavActive(p, '/admin/pedidos/montados')).toBe(true)
      expect(isNavActive(p, '/admin/pedidos')).toBe(false)
    }
  })

  it('Pedidos continua acendendo no pedido e na montagem', () => {
    expect(isNavActive('/admin/pedidos', '/admin/pedidos')).toBe(true)
    expect(isNavActive('/admin/pedidos/123', '/admin/pedidos')).toBe(true)
    expect(isNavActive('/admin/pedidos/montar', '/admin/pedidos')).toBe(true)
    expect(isNavActive('/admin/pedidos/123', '/admin/pedidos/montados')).toBe(false)
  })
})
