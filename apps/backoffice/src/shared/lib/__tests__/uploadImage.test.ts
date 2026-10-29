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
const { uploadMock, removeMock, fromMock } = vi.hoisted(() => {
  const uploadMock = vi.fn()
  const removeMock = vi.fn()
  return {
    uploadMock,
    removeMock,
    fromMock: vi.fn(() => ({ upload: uploadMock, remove: removeMock })),
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
  deleteStorageImage,
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
/** Liga a falha de decodificação do `Image` stub — o arquivo corrompido com tipo válido. */
let falharCarga = false
/**
 * O que o contexto 2d recebeu, NA ORDEM: atribuições de suavização e a chamada de `drawImage`.
 * É a ordem que `IMG-10` exige — a suavização ligada depois do desenho não vale para ele.
 */
let eventosDoContexto: string[] = []

class ImageStub {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 0
  height = 0
  set src(_value: string) {
    this.width = sourceSize.width
    this.height = sourceSize.height
    queueMicrotask(() => (falharCarga ? this.onerror?.() : this.onload?.()))
  }
}

beforeEach(() => {
  uploadMock.mockReset().mockResolvedValue({ error: null })
  fromMock.mockClear()
  sourceSize = { width: 800, height: 600 }
  falharCarga = false
  eventosDoContexto = []
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
    set imageSmoothingEnabled(v: boolean) {
      eventosDoContexto.push(`imageSmoothingEnabled=${v}`)
    },
    set imageSmoothingQuality(v: string) {
      eventosDoContexto.push(`imageSmoothingQuality=${v}`)
    },
    drawImage: vi.fn(() => eventosDoContexto.push('drawImage')),
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

describe('compressão — WebP de até 2400 px (feature 87)', () => {
  it('IMG-11: reduz o maior lado para 2400 px preservando a proporção', async () => {
    sourceSize = { width: 4000, height: 3000 }

    await uploadImageBlob(new Blob(['raw'], { type: 'image/png' }))

    expect(lastCanvas?.width).toBe(2400)
    expect(lastCanvas?.height).toBe(1800)
  })

  it('IMG-11: a régua é o maior lado também quando ele é a altura', async () => {
    sourceSize = { width: 1500, height: 3000 }

    await uploadImageBlob(new Blob(['raw'], { type: 'image/jpeg' }))

    expect(lastCanvas?.width).toBe(1200)
    expect(lastCanvas?.height).toBe(2400)
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
    // `vitest.config.ts` fixa `VITE_SUPABASE_URL` como `http://127.0.0.1:54441`. A asserção mede o
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

/**
 * `PRF-05` (AC 1, 2) — um ano de cache, com um dono só.
 *
 * O caminho do objeto carrega um UUID, então ele é imutável: a foto gravada nunca muda de conteúdo
 * sob a mesma URL. Uma hora de cache era desperdício puro — e, depois da feature 38, também fazia
 * cada revisita repetir a transformação do `render/image`, que é o que custa dinheiro.
 *
 * O literal `'3600'` estava escrito em `features/product-form/lib/uploadProductImage.ts` e no
 * importador (`tools/catalog-import/src/write/storage.ts`). Duas escritas do mesmo número, em
 * workspaces diferentes, que divergem sem nada quebrar.
 *
 * **Os casos vieram da feature 38 e mudaram de casa junto com o motor** (feature 39 / T19): quem
 * grava no Storage hoje é `shared/lib/uploadImage.ts`, e um guarda que lesse o arquivo antigo
 * passaria a aprovar por vacuidade — o arquivo continua existindo, só não faz mais o upload.
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
    const fonte = readFileSync(resolve(aqui, '../uploadImage.ts'), 'utf8')

    expect(fonte).toContain("from '@estrelinha/core/media'")
    expect(fonte).toContain('cacheControl: STORAGE_CACHE_CONTROL')
    expect(fonte).not.toMatch(/cacheControl:\s*'\d+'/)
  })

  it('o arquivo que PERDEU o motor também não grava mais cacheControl nenhum', () => {
    // A contrapartida da mudança de casa: se `uploadProductImage.ts` voltar a chamar `upload` com
    // um número escrito à mão, o segundo dono renasce no endereço antigo — e o guarda acima, que
    // olha só para `shared/lib`, aprovaria isso em silêncio.
    const aqui = dirname(fileURLToPath(import.meta.url))
    const antigo = readFileSync(
      resolve(aqui, '../../../features/product-form/lib/uploadProductImage.ts'),
      'utf8',
    )

    expect(antigo).not.toMatch(/cacheControl:/)
  })
})

/** Q05 do QA da `86` — apagar a arte enviada e não gravada (o órfão de `home-images/menu/`). */
describe('deleteStorageImage', () => {
  beforeEach(() => {
    removeMock.mockReset()
    fromMock.mockClear()
  })

  it('apaga pelo caminho dentro do bucket — o inverso da conta de `uploadImageBlob`', async () => {
    const url = `${storagePublicPrefix('home-images')}menu/abc.webp`
    await deleteStorageImage(url, { bucket: 'home-images', folder: 'menu' })
    expect(fromMock).toHaveBeenCalledWith('home-images')
    expect(removeMock).toHaveBeenCalledWith(['menu/abc.webp'])
  })

  it('URL de fora da pasta (ou de outro bucket) NÃO apaga nada', async () => {
    await deleteStorageImage(`${storagePublicPrefix('home-images')}home/abc.webp`, { bucket: 'home-images', folder: 'menu' })
    await deleteStorageImage(`${storagePublicPrefix('product-images')}menu/abc.webp`, { bucket: 'home-images', folder: 'menu' })
    await deleteStorageImage('https://cdn.exemplo/menu/abc.webp', { bucket: 'home-images', folder: 'menu' })
    expect(removeMock).not.toHaveBeenCalled()
  })

  it('falha do Storage não lança', async () => {
    removeMock.mockRejectedValue(new Error('rede'))
    await expect(
      deleteStorageImage(`${storagePublicPrefix('home-images')}menu/x.webp`, { bucket: 'home-images', folder: 'menu' }),
    ).resolves.toBeUndefined()
  })
})

describe('feature 87 — o original não é estragado', () => {
  it('IMG-09: o WebP recomprimido sai com qualidade 0.92', async () => {
    await uploadImageBlob(new Blob(['raw'], { type: 'image/jpeg' }))

    expect(toBlobSpy).toHaveBeenCalledTimes(1)
    expect(toBlobSpy.mock.calls[0][1]).toBe('image/webp')
    expect(toBlobSpy.mock.calls[0][2]).toBe(0.92)
  })

  it('IMG-10: a suavização `high` é ligada ANTES do desenho', async () => {
    sourceSize = { width: 4000, height: 3000 }

    await uploadImageBlob(new Blob(['raw'], { type: 'image/jpeg' }))

    expect(eventosDoContexto).toEqual([
      'imageSmoothingEnabled=true',
      'imageSmoothingQuality=high',
      'drawImage',
    ])
  })

  it('IMG-12: WebP dentro do teto é gravado como chegou — o MESMO Blob, sem canvas', async () => {
    sourceSize = { width: 1024, height: 1280 }
    const original = new Blob(['webp-da-dona'], { type: 'image/webp' })

    const url = await uploadImageBlob(original)

    expect(toBlobSpy).not.toHaveBeenCalled()
    expect(eventosDoContexto).toEqual([])
    expect(uploadMock.mock.calls[0][1]).toBe(original)
    expect(url).toMatch(/\/product-images\/products\/[0-9a-f-]+\.webp$/)
  })

  it('IMG-12: exatamente no teto (2400) também não passa pelo canvas', async () => {
    sourceSize = { width: 2400, height: 1600 }
    const original = new Blob(['webp'], { type: 'image/webp' })

    await uploadImageBlob(original)

    expect(uploadMock.mock.calls[0][1]).toBe(original)
    expect(toBlobSpy).not.toHaveBeenCalled()
  })

  it('IMG-12: PNG dentro do teto com saída PNG é gravado como chegou (o alfa não passa pelo canvas)', async () => {
    sourceSize = { width: 800, height: 800 }
    const original = new Blob(['png-transparente'], { type: 'image/png' })

    await uploadImageBlob(original, { format: 'image/png' })

    expect(uploadMock.mock.calls[0][1]).toBe(original)
    expect(uploadMock.mock.calls[0][2]).toMatchObject({ contentType: 'image/png' })
    expect(toBlobSpy).not.toHaveBeenCalled()
  })

  it('IMG-13: JPEG pequeno com saída WebP passa pelo canvas — uma recompressão', async () => {
    sourceSize = { width: 800, height: 600 }
    const original = new Blob(['jpeg'], { type: 'image/jpeg' })

    await uploadImageBlob(original)

    expect(toBlobSpy).toHaveBeenCalledTimes(1)
    expect(uploadMock.mock.calls[0][1]).not.toBe(original)
    expect(lastCanvas?.width).toBe(800)
  })

  it('IMG-13: PNG pequeno com saída WebP passa pelo canvas', async () => {
    const original = new Blob(['png'], { type: 'image/png' })

    await uploadImageBlob(original)

    expect(toBlobSpy).toHaveBeenCalledTimes(1)
    expect(uploadMock.mock.calls[0][1]).not.toBe(original)
  })

  it('IMG-13: WebP acima do teto passa pelo canvas e sai reduzido', async () => {
    sourceSize = { width: 2401, height: 1000 }
    const original = new Blob(['webp'], { type: 'image/webp' })

    await uploadImageBlob(original)

    expect(toBlobSpy).toHaveBeenCalledTimes(1)
    expect(lastCanvas?.width).toBe(2400)
    expect(uploadMock.mock.calls[0][1]).not.toBe(original)
  })

  it('IMG-13: Blob sem tipo (o render do estúdio) passa pelo canvas', async () => {
    const original = new Blob(['render'])

    await uploadImageBlob(original)

    expect(toBlobSpy).toHaveBeenCalledTimes(1)
    expect(uploadMock.mock.calls[0][1]).not.toBe(original)
  })

  it('IMG-14: o caminho sem canvas grava com o `contentType` do formato e o cache de um ano', async () => {
    await uploadImageBlob(new Blob(['webp'], { type: 'image/webp' }))

    expect(uploadMock.mock.calls[0][2]).toMatchObject({
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    })
  })

  it('IMG-14: arquivo que não decodifica devolve `null` também quando seria gravado sem canvas', async () => {
    falharCarga = true

    const url = await uploadImageBlob(new Blob(['corrompido'], { type: 'image/webp' }))

    expect(url).toBeNull()
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('IMG-14: arquivo que não decodifica devolve `null` no caminho com canvas', async () => {
    falharCarga = true

    const url = await uploadImageBlob(new Blob(['corrompido'], { type: 'image/jpeg' }))

    expect(url).toBeNull()
    expect(uploadMock).not.toHaveBeenCalled()
  })
})
