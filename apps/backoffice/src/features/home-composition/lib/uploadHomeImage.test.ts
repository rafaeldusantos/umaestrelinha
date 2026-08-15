// T26 — o envio da arte da Home (feature 24, `HOME-27` e `HOME-28`).
//
// Três ACs se provam aqui, e cada uma tem uma armadilha própria:
//
// 1. **O bucket é `home-images`**, e o do produto **não muda**. O default é o que estava cravado.
// 2. **A medida sai do arquivo original, ANTES de comprimir.** O teste usa um `Image` que reporta
//    tamanhos diferentes a cada leitura: uma implementação que medisse depois do canvas leria o
//    segundo e não daria aviso nenhum. É o discriminador da ordem.
// 3. **Falha de envio devolve `url: null`** — sem URL não há o que gravar, e é isso que impede a
//    seção de ficar com banner pela metade.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layoutRatios } from '@estrelinha/core/home'

const { uploadMock, fromMock } = vi.hoisted(() => {
  const uploadMock = vi.fn()
  return {
    uploadMock,
    fromMock: vi.fn(() => ({ upload: uploadMock, remove: vi.fn() })),
  }
})

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { storage: { from: fromMock } },
}))

import { HOME_BUCKET, HOME_FOLDER, uploadHomeImage } from './uploadHomeImage'
import { uploadImageBlob } from '@/features/product-form'

const MB = 1024 * 1024

const fileOf = (name: string, type: string, size: number): File => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

let createObjectURL: ReturnType<typeof vi.fn>
/**
 * Os tamanhos que o `Image` reporta, **na ordem em que for lido**.
 *
 * O último se repete quando a fila acaba. É o que permite distinguir "mediu o original" de "mediu o
 * comprimido": a primeira leitura é a de `naturalSize`, a segunda é a de dentro de `compressImage`.
 */
let sizeQueue: { width: number; height: number }[] = []
let reads = 0

class ImageStub {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 0
  height = 0
  set src(_value: string) {
    const size = sizeQueue[Math.min(reads, sizeQueue.length - 1)]
    reads += 1
    this.width = size.width
    this.height = size.height
    queueMicrotask(() => this.onload?.())
  }
}

beforeEach(() => {
  uploadMock.mockReset().mockResolvedValue({ error: null })
  fromMock.mockClear()
  sizeQueue = [{ width: 1176, height: 1020 }]
  reads = 0

  createObjectURL = vi.fn(() => 'blob:fake')
  Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true, writable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true, writable: true })
  vi.stubGlobal('Image', ImageStub)

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
  ) {
    callback(new Blob(['webp'], { type: 'image/webp' }))
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** A vaga grande de `hero_pair` — 1176 × 1020 px, de `layoutRatios`, nunca redigitada aqui. */
const vagaGrande = () => layoutRatios('hero_pair')[0]
/** A vaga de apoio de `hero_pair` — 1176 × 486 px. */
const vagaApoio = () => layoutRatios('hero_pair')[1]

describe('uploadHomeImage — o bucket é o da Home, e o do produto não muda', () => {
  it('grava em `home-images/sections` e devolve a URL pública desse bucket', async () => {
    const result = await uploadHomeImage(fileOf('banner.png', 'image/png', 2 * MB))

    expect(HOME_BUCKET).toBe('home-images')
    expect(HOME_FOLDER).toBe('sections')
    expect(fromMock).toHaveBeenCalledWith('home-images')
    expect(uploadMock.mock.calls[0][0]).toMatch(/^sections\/[0-9a-f-]+\.webp$/)
    expect(result.url).toMatch(
      /\/storage\/v1\/object\/public\/home-images\/sections\/[0-9a-f-]+\.webp$/,
    )
    expect(result.error).toBeNull()
  })

  it('`uploadImageBlob` sem opção continua em `product-images/products` — nenhum chamador muda', async () => {
    const url = await uploadImageBlob(new Blob(['raw'], { type: 'image/png' }))

    expect(fromMock).toHaveBeenCalledWith('product-images')
    expect(uploadMock.mock.calls[0][0]).toMatch(/^products\/[0-9a-f-]+\.webp$/)
    expect(url).toMatch(
      /\/storage\/v1\/object\/public\/product-images\/products\/[0-9a-f-]+\.webp$/,
    )
  })
})

describe('uploadHomeImage — o aviso de proporção (HOME-27)', () => {
  it('arte na proporção da vaga não gera aviso', async () => {
    sizeQueue = [{ width: 2352, height: 2040 }]

    const result = await uploadHomeImage(fileOf('certa.png', 'image/png', 2 * MB), vagaGrande())

    expect(result.warning).toBeNull()
    expect(result.url).not.toBeNull()
  })

  it('arte fora da proporção avisa com a medida recomendada em px, e NÃO bloqueia', async () => {
    sizeQueue = [{ width: 1200, height: 1200 }]

    const result = await uploadHomeImage(fileOf('quadrada.png', 'image/png', 2 * MB), vagaApoio())

    expect(result.warning).toBe(
      'Esta arte é 1:1 e a vaga é 2,42:1 — o tamanho recomendado é 1176 × 486 px.',
    )
    // Aviso, não recusa: o arquivo subiu e a URL veio junto.
    expect(result.url).toMatch(/home-images\/sections\//)
    expect(result.error).toBeNull()
  })

  it('mede o arquivo ORIGINAL, antes de comprimir', async () => {
    // A 1ª leitura é a de `naturalSize`; a 2ª é a de dentro de `compressImage`. Se a medida saísse
    // do canvas, a proporção lida seria a da vaga e o aviso não existiria.
    sizeQueue = [
      { width: 1200, height: 1200 },
      { width: 1176, height: 486 },
    ]

    const result = await uploadHomeImage(fileOf('quadrada.png', 'image/png', 2 * MB), vagaApoio())

    expect(result.warning).toBe(
      'Esta arte é 1:1 e a vaga é 2,42:1 — o tamanho recomendado é 1176 × 486 px.',
    )
  })

  it('sem vaga declarada não há proporção a comparar', async () => {
    sizeQueue = [{ width: 1200, height: 1200 }]

    const result = await uploadHomeImage(fileOf('livre.png', 'image/png', 2 * MB))

    expect(result.warning).toBeNull()
  })
})

describe('uploadHomeImage — falha não deixa nada pela metade (HOME-28)', () => {
  it('tipo recusado devolve `url: null` e nem chega ao canvas nem ao Storage', async () => {
    const result = await uploadHomeImage(fileOf('anim.gif', 'image/gif', 1 * MB), vagaGrande())

    expect(result.url).toBeNull()
    expect(result.error).toBe('anim.gif: formato não aceito — use PNG, JPG ou WebP')
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('arquivo acima do teto devolve `url: null`, nomeando o arquivo', async () => {
    const result = await uploadHomeImage(fileOf('grande.png', 'image/png', 12 * MB), vagaGrande())

    expect(result.url).toBeNull()
    expect(result.error).toBe('grande.png: maior que 8 MB')
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('erro do Storage devolve `url: null` — não há URL para gravar na seção', async () => {
    uploadMock.mockResolvedValue({ error: { message: 'boom' } })

    const result = await uploadHomeImage(fileOf('banner.png', 'image/png', 2 * MB), vagaGrande())

    expect(result.url).toBeNull()
    expect(result.error).toBe('banner.png: falha ao enviar')
    expect(result.warning).toBeNull()
  })
})
