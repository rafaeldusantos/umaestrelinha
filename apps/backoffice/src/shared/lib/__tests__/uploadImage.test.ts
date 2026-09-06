// O motor de upload compartilhado (feature 39 / T19) — os casos que provam a COMPRESSÃO e o destino.
//
// Vieram inteiros de `features/product-form/lib/uploadProductImage.test.ts`, junto com a função que
// eles medem: `uploadImageBlob` saiu de `features/product-form` para `shared/lib` porque a Home
// (feature 24) e o banner do menu (feature 39) o consomem, e feature importando de feature é a
// fronteira FSD ao contrário. Nenhuma asserção foi afrouxada na mudança de casa — o que muda é o
// caminho do import.
//
// O que ficou lá: a validação NOMINAL (tipo, tamanho, mensagem com o nome do arquivo) e o lote, que
// são regra do formulário de produto. Aqui só entra o que qualquer chamador de `Blob` compartilha.

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
  ACCEPTED_TYPES,
  MAX_FILE_BYTES,
  storagePublicPrefix,
  uploadFailureMessage,
  uploadImageBlob,
  validateImageFile,
} from '../uploadImage'

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

describe('`BL-009` — o host do Storage não tem mais fallback cravado', () => {
  it('o prefixo público sai do env do runner, e não de um ref de projeto escrito no código', () => {
    // O `|| 'https://<ref>.supabase.co'` que vivia aqui era inalcançável na prática, e é assim que
    // um fallback se parece antes de virar defeito: bastava alguém dar um default ao client de
    // `@estrelinha/supabase` para toda imagem enviada apontar para OUTRO projeto, sem erro nenhum.
    // Antes de 2026-08-29 o valor cravado era um ref que nem existe na conta.
    //
    // `vitest.config.ts` fixa `VITE_SUPABASE_URL` como `http://127.0.0.1:54341`. A asserção mede o
    // env, não uma constante — se o `||` voltar, o valor gravado deixa de acompanhá-lo.
    expect(storagePublicPrefix('menu-images')).toBe(
      `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/menu-images/`,
    )
    expect(storagePublicPrefix('menu-images')).not.toContain('supabase.co')
  })

  it('a URL devolvida pelo envio usa o MESMO prefixo — um dono só do endereço', async () => {
    // `deleteProductImage` desfaz esta conta para achar o caminho do objeto. Com duas escritas
    // soltas, mudar o formato numa delas faria o apagar sair em silêncio sem apagar nada.
    const url = await uploadImageBlob(new Blob(['raw'], { type: 'image/png' }), {
      bucket: 'menu-images',
      folder: 'banners',
    })

    expect(url?.startsWith(storagePublicPrefix('menu-images'))).toBe(true)
  })
})
