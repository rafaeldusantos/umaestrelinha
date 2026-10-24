// Feature `73` · T11 · `MAI-07`, `MAI-15` — os três endereços da Início, por um dono só.
import { describe, expect, it } from 'vitest'
import { DEFAULT_ORDER_SLICE, ORDER_VIEWS, QUEUE_BLOCKS } from '@estrelinha/core/orders'
import { lerDestinoDePedidos, pedidoHref, pedidosHref, recorteDoEndereco } from '../pedidosHref'

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
    // Até a `73` a Início só conhecia duas visões e `fila-material` lançava aqui. Desde a `74` o
    // vocabulário é o de `ORDER_VIEWS` (`MAP-03`): a régua "fora do vocabulário lança" continua, com
    // uma visão que não existe em lugar nenhum.
    expect(() => pedidosHref({ visao: 'inventada' as never })).toThrow()
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

// Feature `74` · T13 — `MAP-03`..`MAP-06`: o endereço aceita as seis visões de `core`.
describe('as seis visões de ORDER_VIEWS (feature 74)', () => {
  it('cada visão ⇒ o id DELA, escrito por extenso', () => {
    expect(pedidosHref({ visao: 'fila-material' })).toBe('/pedidos?visao=fila-material')
    expect(pedidosHref({ visao: 'a-separar' })).toBe('/pedidos?visao=a-separar')
    expect(pedidosHref({ visao: 'em-transito' })).toBe('/pedidos?visao=em-transito')
    expect(pedidosHref({ visao: 'concluidos' })).toBe('/pedidos?visao=concluidos')
    // Âncora: as seis de `core` — uma visão nova lá pede um caso aqui.
    expect(ORDER_VIEWS.map((v) => v.id)).toEqual(['precisa-acao', 'tudo', 'fila-material', 'a-separar', 'em-transito', 'concluidos'])
  })

  it('ida e volta nas seis visões e nos quatro blocos', () => {
    const destinos = [...ORDER_VIEWS.map((v) => ({ visao: v.id })), ...QUEUE_BLOCKS.map((b) => ({ bloco: b.id }))]
    expect(destinos).toHaveLength(10)
    for (const d of destinos) {
      const href = pedidosHref(d)
      expect(lerDestinoDePedidos(href.slice(href.indexOf('?')))).toEqual(d)
    }
  })
})

describe('recorteDoEndereco — a única leitura que a lista faz (A5)', () => {
  it('sem parâmetro ⇒ "Precisa de ação"', () => {
    expect(recorteDoEndereco('')).toEqual({ visao: 'precisa-acao' })
    expect(DEFAULT_ORDER_SLICE).toEqual({ visao: 'precisa-acao' })
  })

  it('valor fora do vocabulário ⇒ "Precisa de ação", nunca um recorte qualquer', () => {
    expect(recorteDoEndereco('?visao=inventada')).toEqual({ visao: 'precisa-acao' })
    expect(recorteDoEndereco('?bloco=inventado')).toEqual({ visao: 'precisa-acao' })
    expect(recorteDoEndereco('?outro=1')).toEqual({ visao: 'precisa-acao' })
  })

  it('o recorte do endereço, quando ele diz um', () => {
    expect(recorteDoEndereco('?visao=concluidos')).toEqual({ visao: 'concluidos' })
    expect(recorteDoEndereco('?bloco=sem-rastreio')).toEqual({ bloco: 'sem-rastreio' })
  })

  it('bloco vence visão também aqui', () => {
    expect(recorteDoEndereco('?visao=tudo&bloco=pix-aguardando')).toEqual({ bloco: 'pix-aguardando' })
  })

  it('bloco inválido com visão válida ⇒ o padrão (o bloco "venceu" e não se entende)', () => {
    expect(recorteDoEndereco('?visao=tudo&bloco=inventado')).toEqual({ visao: 'precisa-acao' })
  })
})

describe('pedidoHref (MAP-20, MAP-52)', () => {
  it('o detalhe mora em /pedidos/<id>', () => {
    expect(pedidoHref('00000000-0000-4000-8000-000000000244')).toBe('/pedidos/00000000-0000-4000-8000-000000000244')
  })
})
