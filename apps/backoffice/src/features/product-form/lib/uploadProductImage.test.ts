// PMD-02 — o upload passa a dizer a verdade.
//
// O que se prova aqui é a ORDEM: validar tipo e tamanho **antes** de comprimir. Validar depois é
// validar tarde — o arquivo de 40 MB já entrou no canvas, que é onde a aba trava hoje. Por isso o
// teste-chave não é "rejeitou", é "rejeitou sem chamar `URL.createObjectURL`", a primeira coisa que
// `compressImage` faz.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `from` é espionado, e não uma seta anônima: desde a feature 24 `uploadImageBlob` aceita bucket, e
// o argumento passou a ser um comportamento a provar — não mais uma constante do módulo.
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

import {
  uploadProductImage,
  uploadProductImages,
  type UploadProgress,
} from './uploadProductImage'
// A régua de tipo/tamanho e a mensagem foram para `shared/lib` junto com o motor (feature 39, T19);
// os casos delas moraram neste arquivo até lá e estão em `shared/lib/__tests__/uploadImage.test.ts`.
import { MAX_FILE_BYTES } from '@/shared/lib/uploadImage'

const MB = 1024 * 1024

/** File com `size` controlado — alocar 12 MB de verdade só para medir um número é desperdício. */
const fileOf = (name: string, type: string, size: number): File => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

let createObjectURL: ReturnType<typeof vi.fn>
let lastCanvas: HTMLCanvasElement | null = null
/** Dimensões que o `Image` stub reporta — cada teste ajusta antes de chamar. */
let sourceSize = { width: 800, height: 600 }

class ImageStub {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 0
  height = 0
  set src(_value: string) {
    this.width = sourceSize.width
    this.height = sourceSize.height
    queueMicrotask(() => this.onload?.())
  }
}

beforeEach(() => {
  uploadMock.mockReset().mockResolvedValue({ error: null })
  fromMock.mockClear()
  sourceSize = { width: 800, height: 600 }
  lastCanvas = null

  createObjectURL = vi.fn(() => 'blob:fake')
  Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true, writable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true, writable: true })
  vi.stubGlobal('Image', ImageStub)

  // O canvas é criado dentro de `compressImage`; pegá-lo na criação é o que permite medir as
  // dimensões de saída sem espiar a implementação.
  const createElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const element = createElement(tag)
    if (tag === 'canvas') lastCanvas = element as HTMLCanvasElement
    return element
  })

  // jsdom não tem canvas 2d: sem estes dois stubs, `getContext` devolve null e `drawImage` estoura
  // antes de qualquer asserção sobre dimensão.
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

describe('uploadProductImage — validação ANTES da compressão', () => {
  it('arquivo de 12 MB é rejeitado sem entrar no canvas', async () => {
    const result = await uploadProductImage(fileOf('grande.png', 'image/png', 12 * MB))

    expect(result).toEqual({ ok: false, failure: { file: 'grande.png', reason: 'size' } })
    // A prova de que a validação veio antes: `compressImage` cria a object URL na primeira linha.
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('tipo inválido é rejeitado sem entrar no canvas', async () => {
    const result = await uploadProductImage(fileOf('anim.gif', 'image/gif', 1 * MB))

    expect(result).toEqual({ ok: false, failure: { file: 'anim.gif', reason: 'type' } })
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('arquivo válido sobe e devolve a URL pública do bucket', async () => {
    const result = await uploadProductImage(fileOf('foto.png', 'image/png', 3 * MB))

    expect(result.ok).toBe(true)
    expect(result.ok && result.url).toMatch(
      /\/storage\/v1\/object\/public\/product-images\/products\/[0-9a-f-]+\.webp$/,
    )
    expect(uploadMock).toHaveBeenCalledTimes(1)
  })

  it('falha do Storage vira motivo `upload`, nomeando o arquivo', async () => {
    uploadMock.mockResolvedValue({ error: { message: 'boom' } })

    const result = await uploadProductImage(fileOf('foto.png', 'image/png', 3 * MB))

    expect(result).toEqual({ ok: false, failure: { file: 'foto.png', reason: 'upload' } })
  })
})

describe('uploadProductImages — falha parcial não cancela o lote', () => {
  const lote = () => [
    fileOf('1.png', 'image/png', 1 * MB),
    fileOf('2.gif', 'image/gif', 1 * MB),
    fileOf('3.jpg', 'image/jpeg', 2 * MB),
    fileOf('4.webp', 'image/webp', 2 * MB),
    fileOf('5.png', 'image/png', 12 * MB),
    fileOf('6.png', 'image/png', 1 * MB),
  ]

  it('sobe os 4 válidos e nomeia os 2 inválidos individualmente', async () => {
    const { uploaded, failed } = await uploadProductImages(lote())

    expect(uploaded).toHaveLength(4)
    expect(failed).toEqual([
      { file: '2.gif', reason: 'type' },
      { file: '5.png', reason: 'size' },
    ])
    // Os 2 inválidos nunca chegaram ao canvas nem ao Storage.
    expect(createObjectURL).toHaveBeenCalledTimes(4)
    expect(uploadMock).toHaveBeenCalledTimes(4)
  })

  it('erro de Storage no meio do lote não impede os seguintes', async () => {
    uploadMock
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'boom' } })
      .mockResolvedValue({ error: null })

    const { uploaded, failed } = await uploadProductImages([
      fileOf('a.png', 'image/png', 1 * MB),
      fileOf('b.png', 'image/png', 1 * MB),
      fileOf('c.png', 'image/png', 1 * MB),
    ])

    expect(uploaded).toHaveLength(2)
    expect(failed).toEqual([{ file: 'b.png', reason: 'upload' }])
  })

  it('reporta progresso por arquivo, com nome e tamanho', async () => {
    const events: UploadProgress[] = []

    await uploadProductImages(
      [fileOf('ok.png', 'image/png', 3 * MB), fileOf('nao.gif', 'image/gif', 1 * MB)],
      p => events.push(p),
    )

    expect(events).toEqual([
      { file: 'ok.png', size: 3 * MB, status: 'uploading' },
      { file: 'ok.png', size: 3 * MB, status: 'done' },
      { file: 'nao.gif', size: 1 * MB, status: 'error', reason: 'type' },
    ])
  })
})
