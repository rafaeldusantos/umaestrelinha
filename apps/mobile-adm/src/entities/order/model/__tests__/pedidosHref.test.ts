// Feature `73` · T11 · `MAI-07`, `MAI-15` — os três endereços da Início, por um dono só.
import { describe, expect, it } from 'vitest'
import { QUEUE_BLOCKS } from '@estrelinha/core/orders'
import { lerDestinoDePedidos, pedidosHref } from '../pedidosHref'

describe('pedidosHref', () => {
  it('"Ver pedidos" ⇒ a visão "Precisa de ação" no endereço', () => {
    expect(pedidosHref({ visao: 'precisa-acao' })).toBe('/pedidos?visao=precisa-acao')
  })

  it('"Ver todos" ⇒ a visão "Tudo" no endereço', () => {
    expect(pedidosHref({ visao: 'tudo' })).toBe('/pedidos?visao=tudo')
  })

  it('cada bloco ⇒ o id DELE em `QUEUE_BLOCKS`, escrito por extenso (não derivado da própria lista)', () => {
    expect(pedidosHref({ bloco: 'aguardando' })).toBe('/pedidos?bloco=aguardando')
    expect(pedidosHref({ bloco: 'a-separar' })).toBe('/pedidos?bloco=a-separar')
    expect(pedidosHref({ bloco: 'sem-rastreio' })).toBe('/pedidos?bloco=sem-rastreio')
    expect(pedidosHref({ bloco: 'pix-aguardando' })).toBe('/pedidos?bloco=pix-aguardando')
    // Âncora: os quatro de cima são TODOS os blocos de `core` — um bloco novo lá pede um caso aqui.
    expect(QUEUE_BLOCKS.map((b) => b.id)).toEqual(['aguardando', 'a-separar', 'sem-rastreio', 'pix-aguardando'])
  })

  it('fora do vocabulário, lança — nunca um endereço que a lista não entende', () => {
    expect(() => pedidosHref({ bloco: 'inventado' as never })).toThrow()
    expect(() => pedidosHref({ visao: 'fila-material' as never })).toThrow()
  })
})

describe('lerDestinoDePedidos — a leitura que a `74` fará do MESMO endereço', () => {
  it('ida e volta, nos seis destinos', () => {
    const destinos = [
      { visao: 'precisa-acao' as const },
      { visao: 'tudo' as const },
      ...QUEUE_BLOCKS.map((b) => ({ bloco: b.id })),
    ]
    for (const d of destinos) {
      const href = pedidosHref(d)
      expect(lerDestinoDePedidos(href.slice(href.indexOf('?')))).toEqual(d)
    }
  })

  it('valor desconhecido ou ausente ⇒ `null`', () => {
    expect(lerDestinoDePedidos('?bloco=inventado')).toBeNull()
    expect(lerDestinoDePedidos('?visao=inventada')).toBeNull()
    expect(lerDestinoDePedidos('')).toBeNull()
  })

  // Fecho r3 (E1): os dois no endereço não deveriam acontecer, mas quando acontecem o BLOCO vence —
  // é o mais específico, e é a promessa do arquivo e de `MAI-07`. A ordem dos parâmetros não muda nada.
  it('bloco e visão juntos ⇒ o bloco vence (MAI-07)', () => {
    expect(lerDestinoDePedidos('?visao=tudo&bloco=aguardando')).toEqual({ bloco: 'aguardando' })
    expect(lerDestinoDePedidos('?bloco=aguardando&visao=tudo')).toEqual({ bloco: 'aguardando' })
  })
})
