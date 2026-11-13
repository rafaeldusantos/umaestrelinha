import { describe, expect, it } from 'vitest'
import { announcementBarExists, type Announcement, type AnnouncementSettings } from '../index.ts'

const texto = (over: Partial<Extract<Announcement, { kind: 'text' }>> = {}): Announcement => ({
  id: 'a',
  kind: 'text',
  highlight: 'Frete grátis',
  text: 'acima de R$ 300 para todo o Brasil',
  linkLabel: '',
  href: '',
  ...over,
})

const imagem = (over: Partial<Extract<Announcement, { kind: 'image' }>> = {}): Announcement => ({
  id: 'b',
  kind: 'image',
  imageDesktop: 'https://cdn.exemplo/faixa-1440.webp',
  imageMobile: 'https://cdn.exemplo/faixa-780.webp',
  alt: 'Coleção de inverno',
  href: '/inverno',
  ...over,
})

const faixa = (enabled: boolean, items: Announcement[]): AnnouncementSettings => ({ enabled, items })

describe('a faixa de avisos existe?', () => {
  it('existe com o interruptor ligado e um aviso de texto válido', () => {
    expect(announcementBarExists(faixa(true, [texto()]))).toBe(true)
  })

  it('existe com o interruptor ligado e só um aviso de imagem válido', () => {
    expect(announcementBarExists(faixa(true, [imagem()]))).toBe(true)
  })

  it('não existe com o interruptor desligado, mesmo com avisos válidos', () => {
    expect(announcementBarExists(faixa(false, [texto(), imagem()]))).toBe(false)
  })

  it('não existe com o interruptor ligado e a lista vazia', () => {
    expect(announcementBarExists(faixa(true, []))).toBe(false)
  })

  it('não existe quando todos os avisos são inválidos', () => {
    const vazio = texto({ highlight: '', text: '   ' })
    const semArte = imagem({ imageMobile: '' })
    const externo = texto({ href: 'https://exemplo.com', linkLabel: 'Ver' })
    expect(announcementBarExists(faixa(true, [vazio, semArte, externo]))).toBe(false)
  })

  it('existe quando ao menos um aviso, entre inválidos, é válido', () => {
    const vazio = texto({ highlight: '', text: '' })
    expect(announcementBarExists(faixa(true, [vazio, imagem()]))).toBe(true)
  })

  it('valor ausente não lança e não existe', () => {
    expect(announcementBarExists(null)).toBe(false)
    expect(announcementBarExists(undefined)).toBe(false)
  })
})
