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

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STORAGE_CACHE_CONTROL } from '@estrelinha/core/media'

import {
  ACCEPTED_TYPES,
  MAX_FILE_BYTES,
  uploadFailureMessage,
  uploadImageBlob,
  uploadProductImage,
  uploadProductImages,
  validateImageFile,
  type UploadProgress,
} from './uploadProductImage'

const MB = 1024 * 1024

/** File com `size` controlado — alocar 12 MB de verdade só para medir um número é desperdício. */
const fileOf = (name: string, type: string, size: number): File => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

let createObjectURL: ReturnType<typeof vi.fn>
let toBlobSpy: ReturnType<typeof vi.spyOn>
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
  toBlobSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
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

describe('validateImageFile — PMD-02 AC 4', () => {
  it('aceita os três tipos da copy: PNG, JPG e WebP', () => {
    expect(validateImageFile(fileOf('a.png', 'image/png', 2 * MB))).toBeNull()
    expect(validateImageFile(fileOf('b.jpg', 'image/jpeg', 2 * MB))).toBeNull()
    expect(validateImageFile(fileOf('c.webp', 'image/webp', 2 * MB))).toBeNull()
    expect(ACCEPTED_TYPES).toEqual(['image/png', 'image/jpeg', 'image/webp'])
  })

  it('rejeita tipo fora da lista com motivo `type`', () => {
    expect(validateImageFile(fileOf('anim.gif', 'image/gif', 1 * MB))).toBe('type')
    expect(validateImageFile(fileOf('doc.pdf', 'application/pdf', 1 * MB))).toBe('type')
  })

  it('rejeita acima de 8 MB com motivo `size`', () => {
    expect(MAX_FILE_BYTES).toBe(8 * MB)
    expect(validateImageFile(fileOf('grande.png', 'image/png', 12 * MB))).toBe('size')
    expect(validateImageFile(fileOf('limite.png', 'image/png', 8 * MB + 1))).toBe('size')
  })

  it('aceita exatamente 8 MB — o teto é inclusivo', () => {
    expect(validateImageFile(fileOf('limite.png', 'image/png', 8 * MB))).toBeNull()
  })
})

describe('uploadFailureMessage — nomeia arquivo e motivo', () => {
  it('diz o nome do arquivo e o formato aceito quando o tipo é inválido', () => {
    expect(uploadFailureMessage({ file: 'anim.gif', reason: 'type' })).toBe(
      'anim.gif: formato não aceito — use PNG, JPG ou WebP',
    )
  })

  it('diz o nome do arquivo e o teto quando o tamanho estoura', () => {
    expect(uploadFailureMessage({ file: 'grande.png', reason: 'size' })).toBe(
      'grande.png: maior que 8 MB',
    )
  })

  it('diz o nome do arquivo quando o envio em si falhou', () => {
    expect(uploadFailureMessage({ file: 'foto.png', reason: 'upload' })).toBe(
      'foto.png: falha ao enviar',
    )
  })
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

describe('compressão — PMD-02 AC 5: WebP de 1600 px', () => {
  it('reduz o maior lado para 1600 px preservando a proporção', async () => {
    sourceSize = { width: 3000, height: 2000 }

    await uploadImageBlob(new Blob(['raw'], { type: 'image/png' }))

    expect(lastCanvas?.width).toBe(1600)
    expect(lastCanvas?.height).toBe(1067)
  })

  it('não amplia imagem menor que o teto', async () => {
    sourceSize = { width: 900, height: 400 }

    await uploadImageBlob(new Blob(['raw'], { type: 'image/png' }))

    expect(lastCanvas?.width).toBe(900)
    expect(lastCanvas?.height).toBe(400)
  })

  it('uploadImageBlob segue aceitando Blob puro — contrato do estúdio de mockup', async () => {
    const url = await uploadImageBlob(new Blob(['render'], { type: 'image/png' }))

    expect(url).toMatch(
      /\/storage\/v1\/object\/public\/product-images\/products\/[0-9a-f-]+\.webp$/,
    )
    expect(uploadMock).toHaveBeenCalledTimes(1)
    // O blob enviado é o WebP comprimido, não o original.
    expect(uploadMock.mock.calls[0][2]).toMatchObject({ contentType: 'image/webp' })
  })

  it('o destino padrão continua `product-images/products` (feature 24 — T26)', async () => {
    // `uploadImageBlob` ganhou `{ bucket, folder }` para a Home poder gravar em `home-images`. O
    // default é exatamente o que estava cravado antes, e este teste é o que impede a generalização
    // de mover a arte de três chamadores sem que nada acuse.
    await uploadImageBlob(new Blob(['raw'], { type: 'image/png' }))

    expect(fromMock).toHaveBeenCalledWith('product-images')
    expect(uploadMock.mock.calls[0][0]).toMatch(/^products\/[0-9a-f-]+\.webp$/)
  })

  it('bucket e pasta explícitos mandam no `from`, no caminho e na URL pública', async () => {
    const url = await uploadImageBlob(new Blob(['raw'], { type: 'image/png' }), {
      bucket: 'home-images',
      folder: 'sections',
    })

    expect(fromMock).toHaveBeenCalledWith('home-images')
    expect(uploadMock.mock.calls[0][0]).toMatch(/^sections\/[0-9a-f-]+\.webp$/)
    expect(url).toMatch(
      /\/storage\/v1\/object\/public\/home-images\/sections\/[0-9a-f-]+\.webp$/,
    )
  })

  it('respeita a resolução e o formato pedidos pelo estúdio (PMD-05 AC 5)', async () => {
    sourceSize = { width: 3000, height: 2000 }

    const url = await uploadImageBlob(new Blob(['render'], { type: 'image/png' }), {
      maxDimension: 2000,
      format: 'image/png',
    })

    expect(lastCanvas?.width).toBe(2000)
    expect(toBlobSpy.mock.calls[0][1]).toBe('image/png')
    expect(uploadMock.mock.calls[0][2]).toMatchObject({ contentType: 'image/png' })
    expect(url).toMatch(/\.png$/)
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

/**
 * `PRF-05` (AC 1, 2) — um ano de cache, com um dono só.
 *
 * O caminho do objeto carrega um UUID, então ele é imutável: a foto gravada nunca muda de conteúdo
 * sob a mesma URL. Uma hora de cache era desperdício puro — e, depois da feature 38, também fazia
 * cada revisita repetir a transformação do `render/image`, que é o que custa dinheiro.
 *
 * O literal `'3600'` estava escrito AQUI e no importador (`tools/catalog-import/src/write/storage.ts`).
 * Duas escritas do mesmo número, em workspaces diferentes, que divergem sem nada quebrar.
 */
describe('uploadImageBlob — o cacheControl (PRF-05)', () => {
  it('grava com UM ANO, e o valor vem do dono em `@estrelinha/core/media`', async () => {
    await uploadImageBlob(new Blob(['x'], { type: 'image/png' }))

    const [, , opcoes] = uploadMock.mock.calls[0]
    expect(opcoes.cacheControl).toBe(STORAGE_CACHE_CONTROL)
    expect(Number(STORAGE_CACHE_CONTROL)).toBe(365 * 24 * 3600)
  })

  it('`upsert: false` continua — o caminho tem UUID, colidir seria defeito, não rotina', async () => {
    await uploadImageBlob(new Blob(['x'], { type: 'image/png' }))

    expect(uploadMock.mock.calls[0][2].upsert).toBe(false)
  })

  it('o arquivo NÃO contém mais o literal `3600` — lido do disco', () => {
    // A asserção acima passaria com o literal de volta, desde que ele valesse o mesmo. Esta é a que
    // impede o segundo dono de renascer: o valor tem de VIR do módulo, não estar escrito aqui.
    const aqui = dirname(fileURLToPath(import.meta.url))
    const fonte = readFileSync(resolve(aqui, 'uploadProductImage.ts'), 'utf8')

    expect(fonte).toContain("from '@estrelinha/core/media'")
    expect(fonte).toContain('cacheControl: STORAGE_CACHE_CONTROL')
    expect(fonte).not.toMatch(/cacheControl:\s*'\d+'/)
  })
})
