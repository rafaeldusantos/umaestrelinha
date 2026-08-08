import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadImage } from './loadImage'

// ENG-02: loadImage seta crossOrigin='anonymous' ANTES do src para que toBlob()/toDataURL()
// de um canvas com assets do Storage não lancem SecurityError (canvas tainting).

let lastImage: any = null

class FakeImage {
  crossOrigin: string | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  // valor de crossOrigin capturado NO MOMENTO em que src é atribuído (prova a ordem)
  crossOriginWhenSrcSet: string | null | undefined = undefined
  _src = ''
  get src() {
    return this._src
  }
  set src(v: string) {
    this.crossOriginWhenSrcSet = this.crossOrigin
    this._src = v
  }
  constructor() {
    lastImage = this
  }
}

beforeEach(() => {
  lastImage = null
  vi.stubGlobal('Image', FakeImage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadImage', () => {
  it('seta crossOrigin=anonymous ANTES de atribuir o src (ENG-02)', async () => {
    const promise = loadImage('https://storage.example/bg.png')
    // no instante da atribuição do src, crossOrigin já era 'anonymous'
    expect(lastImage.crossOriginWhenSrcSet).toBe('anonymous')
    expect(lastImage.crossOrigin).toBe('anonymous')
    expect(lastImage.src).toBe('https://storage.example/bg.png')
    lastImage.onload()
    await expect(promise).resolves.toBe(lastImage)
  })

  it('resolve com a imagem carregada no onload', async () => {
    const promise = loadImage('https://storage.example/art.png')
    lastImage.onload()
    await expect(promise).resolves.toBe(lastImage)
  })

  it('rejeita no onerror', async () => {
    const promise = loadImage('https://storage.example/broken.png')
    lastImage.onerror()
    await expect(promise).rejects.toThrow()
  })
})
