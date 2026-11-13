import { describe, expect, it } from 'vitest'
import {
  announcementRefusal,
  announcementRefusals,
  announcementsRefusal,
  type Announcement,
  type ImageAnnouncement,
  type TextAnnouncement,
} from '../index.ts'

const texto = (over: Partial<TextAnnouncement> = {}): TextAnnouncement => ({
  id: 't',
  kind: 'text',
  highlight: 'Frete grátis',
  text: 'acima de R$ 300',
  linkLabel: '',
  href: '',
  ...over,
})

const imagem = (over: Partial<ImageAnnouncement> = {}): ImageAnnouncement => ({
  id: 'i',
  kind: 'image',
  imageDesktop: 'https://cdn.exemplo/1440.webp',
  imageMobile: 'https://cdn.exemplo/780.webp',
  alt: 'Coleção de inverno',
  href: '',
  ...over,
})

const letras = (n: number): string => 'a'.repeat(n)

describe('um aviso de texto', () => {
  it('vale só com o trecho em destaque, ou só com o texto', () => {
    expect(announcementRefusal(texto({ text: '' }), 0)).toBeNull()
    expect(announcementRefusal(texto({ highlight: '' }), 0)).toBeNull()
  })

  it('vale com destino e sem rótulo', () => {
    expect(announcementRefusal(texto({ href: '/ofertas' }), 0)).toBeNull()
  })

  it('vazio é recusado, com o ordinal do aviso', () => {
    expect(announcementRefusal(texto({ highlight: '  ', text: '' }), 1)).toBe(
      '2º aviso: escreva o trecho em destaque ou o texto. Um aviso vazio não aparece na loja.',
    )
  })

  it('rótulo sem destino é recusado', () => {
    expect(announcementRefusal(texto({ linkLabel: 'Ver', href: '' }), 0)).toBe(
      '1º aviso: Sem destino, o rótulo do link não aparece.',
    )
  })

  it('o vazio vem antes do rótulo sem destino', () => {
    expect(announcementRefusal(texto({ highlight: '', text: '', linkLabel: 'Ver' }), 0)).toBe(
      '1º aviso: escreva o trecho em destaque ou o texto. Um aviso vazio não aparece na loja.',
    )
  })

  it('o trecho em destaque passa de 40 caracteres', () => {
    expect(announcementRefusal(texto({ highlight: letras(40), text: '' }), 0)).toBeNull()
    expect(announcementRefusal(texto({ highlight: letras(41), text: '' }), 2)).toBe(
      '3º aviso: o trecho em destaque passa de 40 caracteres.',
    )
  })

  it('o texto passa de 60 caracteres', () => {
    expect(announcementRefusal(texto({ highlight: '', text: letras(60) }), 0)).toBeNull()
    expect(announcementRefusal(texto({ highlight: '', text: letras(61) }), 0)).toBe(
      '1º aviso: o texto passa de 60 caracteres.',
    )
  })

  it('o rótulo do link passa de 20 caracteres', () => {
    const base = { highlight: 'a', text: '', href: '/ofertas' }
    expect(announcementRefusal(texto({ ...base, linkLabel: letras(20) }), 0)).toBeNull()
    expect(announcementRefusal(texto({ ...base, linkLabel: letras(21) }), 0)).toBe(
      '1º aviso: o rótulo do link passa de 20 caracteres.',
    )
  })

  it('o conjunto passa de 90 caracteres, mesmo com cada campo dentro do teto', () => {
    const noLimite = texto({ highlight: letras(30), text: letras(50), linkLabel: letras(10), href: '/ofertas' })
    expect(announcementRefusal(noLimite, 0)).toBeNull()
    const acima = texto({ highlight: letras(30), text: letras(50), linkLabel: letras(11), href: '/ofertas' })
    expect(announcementRefusal(acima, 0)).toBe(
      '1º aviso: juntos, o trecho em destaque, o texto e o rótulo do link passam de 90 caracteres — no celular, o aviso não cabe em duas linhas.',
    )
  })

  it('conta o texto aparado — espaço nas pontas não estoura o teto', () => {
    expect(announcementRefusal(texto({ highlight: `  ${letras(40)}  `, text: '' }), 0)).toBeNull()
  })
})

describe('um aviso de imagem', () => {
  it('com as duas artes e a descrição, vale com ou sem destino', () => {
    expect(announcementRefusal(imagem(), 0)).toBeNull()
    expect(announcementRefusal(imagem({ href: '/inverno' }), 0)).toBeNull()
  })

  it('sem a arte do computador é recusado', () => {
    expect(announcementRefusal(imagem({ imageDesktop: '' }), 0)).toBe(
      '1º aviso: envie a arte do computador.',
    )
  })

  it('sem a arte do celular é recusado', () => {
    expect(announcementRefusal(imagem({ imageMobile: ' ' }), 3)).toBe('4º aviso: envie a arte do celular.')
  })

  it('sem texto alternativo é recusado', () => {
    expect(announcementRefusal(imagem({ alt: '' }), 0)).toBe(
      '1º aviso: Descreva a arte: é o que o leitor de tela e o Google leem.',
    )
  })
})

describe('todos os motivos de um aviso de imagem, juntos', () => {
  it('só com a arte do computador e o alternativo vazio, cobra a arte do celular e a descrição', () => {
    expect(announcementRefusals(imagem({ imageMobile: '', alt: '' }), 3)).toEqual([
      '4º aviso: envie a arte do celular.',
      '4º aviso: Descreva a arte: é o que o leitor de tela e o Google leem.',
    ])
  })

  it('sem nenhuma das duas artes e sem descrição, cobra as três, na ordem da tela', () => {
    expect(announcementRefusals(imagem({ imageDesktop: '', imageMobile: '', alt: '' }), 0)).toEqual([
      '1º aviso: envie a arte do computador.',
      '1º aviso: envie a arte do celular.',
      '1º aviso: Descreva a arte: é o que o leitor de tela e o Google leem.',
    ])
  })

  it('com as duas artes e o alternativo só com espaços, cobra só a descrição', () => {
    expect(announcementRefusals(imagem({ alt: '   ' }), 0)).toEqual([
      '1º aviso: Descreva a arte: é o que o leitor de tela e o Google leem.',
    ])
  })

  it('completo, nenhum motivo', () => {
    expect(announcementRefusals(imagem(), 0)).toEqual([])
    expect(announcementRefusals(imagem({ href: '/inverno' }), 0)).toEqual([])
  })

  it('o primeiro motivo da lista é o que a recusa de um motivo só devolve', () => {
    const incompleto = imagem({ imageMobile: '', alt: '' })
    expect(announcementRefusal(incompleto, 0)).toBe('1º aviso: envie a arte do celular.')
    expect(announcementsRefusal({ enabled: true, items: [incompleto] })).toBe('1º aviso: envie a arte do celular.')
  })
})

describe('todos os motivos de um aviso de texto', () => {
  it('continua com um motivo só, o primeiro que falha', () => {
    expect(announcementRefusals(texto({ highlight: '', text: '', linkLabel: 'Ver', href: 'https://x.com' }), 0)).toEqual([
      '1º aviso: escreva o trecho em destaque ou o texto. Um aviso vazio não aparece na loja.',
    ])
    expect(announcementRefusals(texto(), 0)).toEqual([])
  })
})

describe('o destino de qualquer aviso', () => {
  it.each(['https://exemplo.com', '//exemplo.com', '/\\exemplo.com'])(
    'recusa %j com o motivo da régua do Banner principal',
    href => {
      const motivo = announcementRefusal(texto({ href }), 0)
      expect(motivo).toMatch(/^1º aviso: /)
      expect(motivo).not.toBe('1º aviso: ')
      expect(announcementRefusal(imagem({ href }), 0)).toBe(motivo)
    },
  )

  it('o motivo é o mesmo texto da régua do Banner principal', () => {
    expect(announcementRefusal(texto({ href: 'https://exemplo.com' }), 0)).toBe(
      '1º aviso: O endereço precisa começar com “/”: a loja só aponta para páginas dela.',
    )
  })
})

describe('a lista de avisos', () => {
  it('lista vazia vale', () => {
    expect(announcementsRefusal({ enabled: true, items: [] })).toBeNull()
  })

  it('cinco avisos valem; o sexto é recusado com o motivo', () => {
    const cinco: Announcement[] = Array.from({ length: 5 }, (_, i) => texto({ id: `t${i}` }))
    expect(announcementsRefusal({ enabled: true, items: cinco })).toBeNull()
    expect(announcementsRefusal({ enabled: true, items: [...cinco, texto({ id: 't6' })] })).toBe(
      'Cabem 5 avisos na faixa, e há 6. Remova os que sobram.',
    )
  })

  it('devolve o motivo do primeiro aviso recusado, com o ordinal dele', () => {
    const items: Announcement[] = [texto(), imagem({ alt: '' }), texto({ highlight: '', text: '' })]
    expect(announcementsRefusal({ enabled: true, items })).toBe(
      '2º aviso: Descreva a arte: é o que o leitor de tela e o Google leem.',
    )
  })
})
