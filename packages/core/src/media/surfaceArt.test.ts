import { describe, expect, it } from 'vitest'
import { surfaceArt, surfaceImage, type DeviceSurface } from './surfaceArt'

/**
 * `BNR-22` / `AD-030` — o dono único da arte por dispositivo.
 *
 * Os casos aqui são a régua que `menuBannerArt` (feature 39) carregava, mais os bordos que a
 * delegação não pode perder. O que os torna necessários e não decorativos: cada um deles já foi, em
 * algum momento, respondido de dois jeitos diferentes por duas telas.
 */

const AMBAS: DeviceSurface[] = ['desktop', 'mobile']

describe('surfaceImage — a arte GRAVADA desta superfície', () => {
  it('devolve a arte do computador quando a superfície é desktop', () => {
    expect(surfaceImage('/d.jpg', '/m.jpg', 'desktop')).toBe('/d.jpg')
  })

  it('devolve a arte do celular quando a superfície é mobile', () => {
    expect(surfaceImage('/d.jpg', '/m.jpg', 'mobile')).toBe('/m.jpg')
  })

  it('NÃO recua para a outra superfície — essa é a diferença para `surfaceArt`', () => {
    expect(surfaceImage('/d.jpg', null, 'mobile')).toBeNull()
    expect(surfaceImage(null, '/m.jpg', 'desktop')).toBeNull()
  })

  it.each(AMBAS)('apara o espaço da arte (%s)', surface => {
    expect(surfaceImage('  /d.jpg  ', '  /m.jpg  ', surface)).toBe(
      surface === 'desktop' ? '/d.jpg' : '/m.jpg',
    )
  })

  it.each(AMBAS)('string só de espaço NÃO é arte (%s)', surface => {
    // O caso que fez a loja e o painel discordarem na feature 39.
    expect(surfaceImage('   ', '   ', surface)).toBeNull()
  })

  it.each(AMBAS)('string vazia não é arte (%s)', surface => {
    expect(surfaceImage('', '', surface)).toBeNull()
  })

  it.each(AMBAS)('`null` e `undefined` não são arte (%s)', surface => {
    expect(surfaceImage(null, null, surface)).toBeNull()
    expect(surfaceImage(undefined, undefined, surface)).toBeNull()
  })

  it.each(AMBAS)('valor que não é string não é arte (%s)', surface => {
    // O jsonb não tem forma garantida: número, objeto e array são todos alcançáveis do banco.
    expect(surfaceImage(42, { url: '/x.jpg' }, surface)).toBeNull()
  })
})

describe('surfaceArt — a arte desta superfície, com recuo para a da outra', () => {
  it.each(AMBAS)('com arte própria, usa a dela e NÃO declara reaproveitamento (%s)', surface => {
    expect(surfaceArt('/d.jpg', '/m.jpg', surface)).toEqual({
      image: surface === 'desktop' ? '/d.jpg' : '/m.jpg',
      imageReused: false,
    })
  })

  it('sem a arte do celular, recua para a do computador e DECLARA que reaproveitou', () => {
    expect(surfaceArt('/d.jpg', null, 'mobile')).toEqual({ image: '/d.jpg', imageReused: true })
  })

  it('sem a arte do computador, recua para a do celular e DECLARA que reaproveitou', () => {
    expect(surfaceArt(null, '/m.jpg', 'desktop')).toEqual({ image: '/m.jpg', imageReused: true })
  })

  it.each(AMBAS)('sem arte nenhuma, devolve `null` e NÃO declara reaproveitamento (%s)', surface => {
    // `imageReused: true` com `image: null` seria um estado que faz a tela avisar sobre nada.
    expect(surfaceArt(null, null, surface)).toEqual({ image: null, imageReused: false })
  })

  it('arte só de espaço na superfície pedida conta como AUSENTE e dispara o recuo', () => {
    expect(surfaceArt('/d.jpg', '   ', 'mobile')).toEqual({ image: '/d.jpg', imageReused: true })
  })

  it('arte só de espaço na OUTRA superfície não vira recuo', () => {
    expect(surfaceArt('   ', null, 'mobile')).toEqual({ image: null, imageReused: false })
  })

  it('a arte reaproveitada também sai aparada', () => {
    expect(surfaceArt('  /d.jpg  ', null, 'mobile')).toEqual({
      image: '/d.jpg',
      imageReused: true,
    })
  })
})
