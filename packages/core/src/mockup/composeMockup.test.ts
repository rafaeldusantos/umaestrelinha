import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { composeMockup } from './composeMockup'
import { loadImage } from './loadImage'

// ENG-01: desenha fundo → arte recortada na art-zone → overlay com globalCompositeOperation=blend;
//          retorna { canvas, toBlob, toDataURL }.
// ENG-04: sem overlay → compõe fundo + arte, sem camada de blend, sem erro.
// ENG-06: canvas na resolução NATURAL do fundo.
// ENG-02: imagens vêm de loadImage (crossOrigin) → export não lança.

type Call = { method: string; args: any[] }

function createFakeCtx() {
  const calls: Call[] = []
  const rec = (method: string) => (...args: any[]) => {
    calls.push({ method, args })
  }
  let gco = 'source-over'
  const ctx: any = {
    calls,
    drawImage: rec('drawImage'),
    beginPath: rec('beginPath'),
    closePath: rec('closePath'),
    ellipse: rec('ellipse'),
    clip: rec('clip'),
    save: rec('save'),
    restore: rec('restore'),
    translate: rec('translate'),
    rotate: rec('rotate'),
  }
  Object.defineProperty(ctx, 'globalCompositeOperation', {
    get: () => gco,
    set: (v: string) => {
      gco = v
      calls.push({ method: 'set globalCompositeOperation', args: [v] })
    },
  })
  return ctx
}

function createFakeCanvas(ctx: any) {
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toDataURL: (type = 'image/png') => `data:${type};base64,ZmFrZQ==`,
    toBlob: (cb: (b: any) => void, type = 'image/png') => cb({ __blob: true, type }),
  }
}

function makeImg(naturalWidth: number, naturalHeight: number, width = naturalWidth, height = naturalHeight) {
  return { naturalWidth, naturalHeight, width, height, crossOrigin: null as string | null }
}

const ZONE = { shape: 'ellipse' as const, cx: 0.5, cy: 0.5, rx: 0.25, ry: 0.25, rotation: 0 }

let fakeCtx: any
let fakeCanvas: any

beforeEach(() => {
  fakeCtx = createFakeCtx()
  fakeCanvas = createFakeCanvas(fakeCtx)
  vi.stubGlobal('document', { createElement: (tag: string) => (tag === 'canvas' ? fakeCanvas : {}) })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('composeMockup', () => {
  it('compõe na ordem fundo → clip(elipse) → arte(transform) → blend → overlay (ENG-01)', () => {
    const background = makeImg(800, 600)
    const art = makeImg(100, 100)
    const overlay = makeImg(800, 600)
    composeMockup({ background, art, overlay, artZone: ZONE, blendMode: 'screen' })

    const methods: string[] = fakeCtx.calls.map((c: Call) => c.method)
    const drawIdxs = methods.reduce(
      (acc: number[], m: string, i: number) => (m === 'drawImage' ? [...acc, i] : acc),
      [] as number[],
    )
    expect(drawIdxs).toHaveLength(3) // fundo, arte, overlay
    const [bgIdx, artIdx, overlayIdx] = drawIdxs
    const ellipseIdx = methods.indexOf('ellipse')
    const clipIdx = methods.indexOf('clip')
    const saveIdx = methods.indexOf('save')
    const restoreIdx = methods.indexOf('restore')
    const translateIdx = methods.indexOf('translate')
    const gcoIdx = methods.indexOf('set globalCompositeOperation')

    // ordem relativa exigida pela ENG-01
    expect(bgIdx).toBeLessThan(saveIdx)
    expect(saveIdx).toBeLessThan(ellipseIdx)
    expect(ellipseIdx).toBeLessThan(clipIdx) // clip é sobre a elipse
    expect(clipIdx).toBeLessThan(translateIdx) // arte transformada dentro do clip
    expect(translateIdx).toBeLessThan(artIdx)
    expect(artIdx).toBeLessThan(restoreIdx) // restore após a arte
    expect(restoreIdx).toBeLessThan(overlayIdx) // overlay fora do clip (canvas cheio)
    expect(artIdx).toBeLessThan(gcoIdx) // blend definido após a arte
    expect(gcoIdx).toBeLessThan(overlayIdx) // overlay desenhado após set do blend

    // valores concretos (amarram resolveArtZone + coverFitTransform à composição)
    expect(fakeCtx.calls[bgIdx].args).toEqual([background, 0, 0, 800, 600])
    // zona: cx=0.5*800=400, cy=0.5*600=300, rx=0.25*800=200, ry=0.25*600=150
    expect(fakeCtx.calls[ellipseIdx].args).toEqual([400, 300, 200, 150, 0, 0, Math.PI * 2])
    expect(fakeCtx.calls[translateIdx].args).toEqual([400, 300]) // centro + offset(0,0)
    // cover-fit: box 400x300, arte 100x100 → scale=max(4,3)=4 → 400x400 centrado
    expect(fakeCtx.calls[artIdx].args).toEqual([art, -200, -200, 400, 400])
    expect(fakeCtx.calls[gcoIdx].args).toEqual(['screen'])
    expect(fakeCtx.calls[overlayIdx].args).toEqual([overlay, 0, 0, 800, 600])
  })

  it('sem overlay: não seta blend nem desenha overlay (ENG-04)', () => {
    const background = makeImg(800, 600)
    const art = makeImg(100, 100)
    composeMockup({ background, art, artZone: ZONE })

    const methods: string[] = fakeCtx.calls.map((c: Call) => c.method)
    const drawCount = methods.filter((m) => m === 'drawImage').length
    expect(drawCount).toBe(2) // apenas fundo + arte
    expect(methods).not.toContain('set globalCompositeOperation')
  })

  it('usa multiply como blend padrão quando há overlay sem blendMode', () => {
    composeMockup({
      background: makeImg(800, 600),
      art: makeImg(100, 100),
      overlay: makeImg(800, 600),
      artZone: ZONE,
    })
    const gcoCall = fakeCtx.calls.find((c: Call) => c.method === 'set globalCompositeOperation')
    expect(gcoCall).toBeDefined()
    expect(gcoCall.args).toEqual(['multiply'])
  })

  it('dimensiona o canvas pela resolução NATURAL do fundo (ENG-06)', () => {
    // naturalWidth/Height diferem de width/height p/ provar que usa a natural
    const background = makeImg(1234, 567, 300, 150)
    const result = composeMockup({ background, art: makeImg(100, 100), artZone: ZONE })
    expect(result.canvas.width).toBe(1234)
    expect(result.canvas.height).toBe(567)
  })

  it('export (toDataURL/toBlob) não lança e usa imagens de loadImage (ENG-01/ENG-02)', async () => {
    let created: any = null
    class FakeImage {
      crossOrigin: string | null = null
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      naturalWidth = 400
      naturalHeight = 400
      width = 400
      height = 400
      _src = ''
      get src() {
        return this._src
      }
      set src(v: string) {
        this._src = v
      }
      constructor() {
        created = this
      }
    }
    vi.stubGlobal('Image', FakeImage)

    const loadFake = (src: string) => {
      const p = loadImage(src)
      created.onload()
      return p
    }
    const background = await loadFake('https://storage.example/bg.png')
    const art = await loadFake('https://storage.example/art.png')
    const overlay = await loadFake('https://storage.example/overlay.png')

    // ENG-02: loadImage garantiu crossOrigin antes do export
    expect(background.crossOrigin).toBe('anonymous')

    const result = composeMockup({ background, art, overlay, artZone: ZONE, blendMode: 'multiply' })

    const url = result.toDataURL()
    expect(url).toMatch(/^data:image\/png/)
    await expect(result.toBlob()).resolves.toMatchObject({ __blob: true })
  })
})
