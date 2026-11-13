import { describe, expect, it } from 'vitest'
import { DEFAULT_ANNOUNCEMENTS, normalizeAnnouncements } from '../index.ts'

const textoCru = (id: string) => ({
  id,
  kind: 'text',
  highlight: 'Frete grátis',
  text: 'acima de R$ 300',
  linkLabel: 'Ver',
  href: '/ofertas',
})

describe('a leitura do valor gravado', () => {
  it.each([null, undefined, 3, 'faixa', true, [], [1, 2]])('lixo (%j) vira o padrão desligado, sem lançar', bruto => {
    expect(normalizeAnnouncements(bruto)).toEqual({ enabled: false, items: [] })
  })

  it('o padrão é desligado e sem avisos, e a leitura não devolve o mesmo objeto do padrão', () => {
    expect(DEFAULT_ANNOUNCEMENTS).toEqual({ enabled: false, items: [] })
    const lido = normalizeAnnouncements(null)
    lido.items.push(textoCru('x') as never)
    expect(DEFAULT_ANNOUNCEMENTS.items).toEqual([])
  })

  it('só `true` liga o interruptor', () => {
    expect(normalizeAnnouncements({ enabled: true, items: [] }).enabled).toBe(true)
    expect(normalizeAnnouncements({ enabled: 'true', items: [] }).enabled).toBe(false)
    expect(normalizeAnnouncements({ enabled: 1, items: [] }).enabled).toBe(false)
  })

  it('mantém os avisos de texto e de imagem, campo a campo', () => {
    const imagem = {
      id: 'b',
      kind: 'image',
      imageDesktop: 'https://cdn/1440.webp',
      imageMobile: 'https://cdn/780.webp',
      alt: 'Inverno',
      href: '',
    }
    expect(normalizeAnnouncements({ enabled: true, items: [textoCru('a'), imagem] })).toEqual({
      enabled: true,
      items: [textoCru('a'), imagem],
    })
  })

  it('do sexto aviso em diante é ignorado', () => {
    const sete = Array.from({ length: 7 }, (_, i) => textoCru(`a${i + 1}`))
    const lido = normalizeAnnouncements({ enabled: true, items: sete })
    expect(lido.items.map(i => i.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5'])
  })

  it('tipo desconhecido, item nulo, número e texto solto são descartados sem lançar', () => {
    const lido = normalizeAnnouncements({
      enabled: true,
      items: [null, 7, 'aviso', { ...textoCru('z'), kind: 'video' }, { id: 'y' }, textoCru('a')],
    })
    expect(lido.items.map(i => i.id)).toEqual(['a'])
  })

  it('o campo do outro tipo é descartado', () => {
    const lido = normalizeAnnouncements({
      enabled: true,
      items: [
        { ...textoCru('a'), imageDesktop: 'https://cdn/x.webp', alt: 'x' },
        { id: 'b', kind: 'image', imageDesktop: 'd', imageMobile: 'm', alt: 'a', href: '', highlight: 'h', text: 't' },
      ],
    })
    expect(Object.keys(lido.items[0]).sort()).toEqual(['highlight', 'href', 'id', 'kind', 'linkLabel', 'text'])
    expect(Object.keys(lido.items[1]).sort()).toEqual(['alt', 'href', 'id', 'imageDesktop', 'imageMobile', 'kind'])
  })

  it('campo ausente ou de outro tipo vira texto vazio, nunca `null`', () => {
    const lido = normalizeAnnouncements({ enabled: true, items: [{ id: 'a', kind: 'text', highlight: 3, text: null }] })
    expect(lido.items[0]).toEqual({ id: 'a', kind: 'text', highlight: '', text: '', linkLabel: '', href: '' })
  })

  it('aviso sem `id` ganha um pela posição, e `items` que não é lista vira lista vazia', () => {
    const { items } = normalizeAnnouncements({ enabled: true, items: [{ kind: 'text', text: 'x' }] })
    expect(items[0].id).toBe('aviso-1')
    expect(normalizeAnnouncements({ enabled: true, items: { 0: textoCru('a') } }).items).toEqual([])
  })
})
