// ADI-03..06 — o dono único do envio de imagens da página.
//
// O motor (`uploadProductImages`) é dublado com promessas controladas pelo teste: é o que permite
// provar a concorrência — dois lotes no ar, o PRIMEIRO terminando antes — sem relógio falso.
// `uploadFailureMessage` é o real: a frase do toast é o que a Adri lê (ADI-05).

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UploadProgress } from '../lib/uploadProductImage'

const { uploadMock, toastMock } = vi.hoisted(() => ({ uploadMock: vi.fn(), toastMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { storage: { from: () => ({ upload: vi.fn(), remove: vi.fn() }) } },
}))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: toastMock }))
vi.mock('../lib/uploadProductImage', async importOriginal => ({
  ...(await importOriginal<typeof import('../lib/uploadProductImage')>()),
  uploadProductImages: uploadMock,
}))

import { UPLOAD_DONE_LINGER_MS, useProductImageUpload } from './useProductImageUpload'

const fileOf = (name: string) => new File(['x'], name, { type: 'image/png' })

type Outcome = { uploaded: string[]; failed: { file: string; reason: 'size' | 'type' | 'upload' }[] }

/** Um lote cujo fim o teste decide, e que emite progresso pelo `onProgress` real do hook. */
const deferredBatch = () => {
  let resolve!: (value: Outcome) => void
  let emit!: (event: UploadProgress) => void
  const promise = new Promise<Outcome>(r => (resolve = r))
  uploadMock.mockImplementationOnce((_files: File[], onProgress: (e: UploadProgress) => void) => {
    emit = onProgress
    return promise
  })
  return {
    finish: (value: Outcome) => resolve(value),
    emit: (event: UploadProgress) => emit(event),
  }
}

const setup = () => {
  const onUploaded = vi.fn()
  const onUploadingChange = vi.fn()
  const hook = renderHook(() => useProductImageUpload({ onUploaded, onUploadingChange }))
  return { ...hook, onUploaded, onUploadingChange }
}

beforeEach(() => {
  uploadMock.mockReset()
  toastMock.mockReset()
})

describe('useProductImageUpload', () => {
  it('ADI-04/ADI-06: chama o motor com os arquivos e entrega só as URLs enviadas, na ordem', async () => {
    uploadMock.mockResolvedValue({ uploaded: ['https://cdn/a.webp', 'https://cdn/b.webp'], failed: [] })
    const { result, onUploaded } = setup()
    const files = [fileOf('a.png'), fileOf('b.png')]

    await act(() => result.current.upload(files))

    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(uploadMock.mock.calls[0][0]).toEqual(files)
    expect(onUploaded).toHaveBeenCalledTimes(1)
    expect(onUploaded).toHaveBeenCalledWith(['https://cdn/a.webp', 'https://cdn/b.webp'])
    expect(toastMock).toHaveBeenCalledWith({ title: '2 imagem(ns) enviada(s)!' })
  })

  it('ADI-05: lote parcial ⇒ um toast por falha com a frase de uploadFailureMessage, e os outros seguem', async () => {
    uploadMock.mockResolvedValue({
      uploaded: ['https://cdn/ok.webp'],
      failed: [
        { file: 'grande.png', reason: 'size' },
        { file: 'quebrou.png', reason: 'upload' },
      ],
    })
    const { result, onUploaded } = setup()

    await act(() =>
      result.current.upload([fileOf('ok.png'), fileOf('grande.png'), fileOf('quebrou.png')]),
    )

    expect(onUploaded).toHaveBeenCalledWith(['https://cdn/ok.webp'])
    const destrutivos = toastMock.mock.calls.filter(([t]) => t.variant === 'destructive')
    expect(destrutivos).toHaveLength(2)
    expect(destrutivos[0][0].title).toBe('grande.png: maior que 8 MB')
    expect(destrutivos[1][0].title).toMatch(/^quebrou\.png/)
    expect(toastMock).toHaveBeenCalledWith({ title: '1 imagem(ns) enviada(s)!' })
  })

  it('lote todo recusado ⇒ onUploaded não é chamado, nem o toast de sucesso', async () => {
    uploadMock.mockResolvedValue({ uploaded: [], failed: [{ file: 'x.gif', reason: 'type' }] })
    const { result, onUploaded } = setup()

    await act(() => result.current.upload([fileOf('x.gif')]))

    expect(onUploaded).not.toHaveBeenCalled()
    expect(toastMock).toHaveBeenCalledTimes(1)
    expect(toastMock.mock.calls[0][0].variant).toBe('destructive')
  })

  it('lista vazia não chama o motor nem muda o estado', async () => {
    const { result, onUploadingChange, onUploaded } = setup()

    await act(() => result.current.upload([]))

    expect(uploadMock).not.toHaveBeenCalled()
    expect(onUploadingChange).not.toHaveBeenCalled()
    expect(onUploaded).not.toHaveBeenCalled()
    expect(result.current.uploading).toBe(false)
  })

  it('ADI-03: progress tem uma linha por arquivo, e o evento seguinte do mesmo arquivo substitui o anterior', async () => {
    const batch = deferredBatch()
    const { result } = setup()

    let pending!: Promise<void>
    act(() => {
      pending = result.current.upload([fileOf('a.png'), fileOf('b.png')])
    })
    act(() => {
      batch.emit({ file: 'a.png', size: 1, status: 'uploading' })
      batch.emit({ file: 'b.png', size: 1, status: 'uploading' })
      batch.emit({ file: 'a.png', size: 1, status: 'done' })
    })

    expect(result.current.progress).toEqual([
      { file: 'b.png', size: 1, status: 'uploading' },
      { file: 'a.png', size: 1, status: 'done' },
    ])

    await act(async () => {
      batch.finish({ uploaded: ['https://cdn/a.webp'], failed: [] })
      await pending
    })
  })

  it('ADI-03: onUploadingChange recebe true no começo e false no fim, uma vez cada', async () => {
    const batch = deferredBatch()
    const { result, onUploadingChange } = setup()

    let pending!: Promise<void>
    act(() => {
      pending = result.current.upload([fileOf('a.png')])
    })
    expect(result.current.uploading).toBe(true)
    expect(onUploadingChange.mock.calls).toEqual([[true]])

    await act(async () => {
      batch.finish({ uploaded: ['https://cdn/a.webp'], failed: [] })
      await pending
    })
    expect(result.current.uploading).toBe(false)
    expect(onUploadingChange.mock.calls).toEqual([[true], [false]])
  })

  it('dois lotes concorrentes: o PRIMEIRO terminando antes não destrava; uploading só volta a false no fim do último', async () => {
    const primeiro = deferredBatch()
    const segundo = deferredBatch()
    const { result, onUploadingChange, onUploaded } = setup()

    let p1!: Promise<void>
    let p2!: Promise<void>
    act(() => {
      p1 = result.current.upload([fileOf('resumo.png')])
    })
    act(() => {
      p2 = result.current.upload([fileOf('modal.png')])
    })
    act(() => {
      primeiro.emit({ file: 'resumo.png', size: 1, status: 'uploading' })
      segundo.emit({ file: 'modal.png', size: 1, status: 'uploading' })
    })
    // Os dois lotes somam no mesmo progresso: o segundo não apaga as linhas do primeiro.
    expect(result.current.progress.map(p => p.file)).toEqual(['resumo.png', 'modal.png'])

    await act(async () => {
      primeiro.finish({ uploaded: ['https://cdn/resumo.webp'], failed: [] })
      await p1
    })
    expect(onUploaded).toHaveBeenCalledWith(['https://cdn/resumo.webp'])
    expect(result.current.uploading).toBe(true)
    expect(onUploadingChange.mock.calls).toEqual([[true]])

    await act(async () => {
      segundo.finish({ uploaded: ['https://cdn/modal.webp'], failed: [] })
      await p2
    })
    expect(onUploaded).toHaveBeenLastCalledWith(['https://cdn/modal.webp'])
    expect(result.current.uploading).toBe(false)
    expect(onUploadingChange.mock.calls).toEqual([[true], [false]])
  })

  it('um lote novo depois de o anterior terminar começa com o progresso limpo', async () => {
    uploadMock.mockImplementationOnce(async (_f: File[], onProgress: (e: UploadProgress) => void) => {
      onProgress({ file: 'velho.png', size: 1, status: 'done' })
      return { uploaded: ['https://cdn/velho.webp'], failed: [] }
    })
    const { result } = setup()
    await act(() => result.current.upload([fileOf('velho.png')]))
    expect(result.current.progress.map(p => p.file)).toEqual(['velho.png'])

    const batch = deferredBatch()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.upload([fileOf('novo.png')])
    })
    expect(result.current.progress).toEqual([])
    await act(async () => {
      batch.finish({ uploaded: [], failed: [] })
      await pending
    })
  })

  // BUG-20261028-linhas-de-envio-ficam-na-tela: as linhas "enviada" ficavam no Resumo para sempre —
  // até de uma foto já removida no modal. Quando o ÚLTIMO lote termina, as "enviada" saem depois de
  // um intervalo curto; as "falhou" ficam até o próximo envio, porque a Adri precisa ler qual
  // arquivo não entrou (o toast some sozinho, a linha não).
  describe('as linhas "enviada" saem depois do envio', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('o intervalo é de 4 segundos', () => {
      expect(UPLOAD_DONE_LINGER_MS).toBe(4000)
    })

    it('terminado o envio, as "enviada" ficam até o intervalo e depois saem; as "falhou" ficam', async () => {
      uploadMock.mockImplementationOnce(async (_f: File[], onProgress: (e: UploadProgress) => void) => {
        onProgress({ file: 'ok.png', size: 1, status: 'done' })
        onProgress({ file: 'ruim.png', size: 1, status: 'error' })
        return { uploaded: ['https://cdn/ok.webp'], failed: [{ file: 'ruim.png', reason: 'upload' }] }
      })
      const { result } = setup()
      await act(() => result.current.upload([fileOf('ok.png'), fileOf('ruim.png')]))

      expect(result.current.progress.map(p => p.file)).toEqual(['ok.png', 'ruim.png'])
      act(() => {
        vi.advanceTimersByTime(UPLOAD_DONE_LINGER_MS - 1)
      })
      expect(result.current.progress.map(p => p.file)).toEqual(['ok.png', 'ruim.png'])
      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(result.current.progress).toEqual([{ file: 'ruim.png', size: 1, status: 'error' }])
    })

    it('com outro lote ainda no ar, nada sai: o primeiro terminar não limpa as linhas', async () => {
      const primeiro = deferredBatch()
      const segundo = deferredBatch()
      const { result } = setup()
      let p1!: Promise<void>
      let p2!: Promise<void>
      act(() => {
        p1 = result.current.upload([fileOf('resumo.png')])
        p2 = result.current.upload([fileOf('modal.png')])
      })
      act(() => {
        primeiro.emit({ file: 'resumo.png', size: 1, status: 'done' })
        segundo.emit({ file: 'modal.png', size: 1, status: 'uploading' })
      })
      await act(async () => {
        primeiro.finish({ uploaded: ['https://cdn/resumo.webp'], failed: [] })
        await p1
      })
      act(() => {
        vi.advanceTimersByTime(UPLOAD_DONE_LINGER_MS * 3)
      })
      expect(result.current.progress.map(p => `${p.file}:${p.status}`)).toEqual([
        'resumo.png:done',
        'modal.png:uploading',
      ])

      await act(async () => {
        segundo.emit({ file: 'modal.png', size: 1, status: 'done' })
        segundo.finish({ uploaded: ['https://cdn/modal.webp'], failed: [] })
        await p2
      })
      act(() => {
        vi.advanceTimersByTime(UPLOAD_DONE_LINGER_MS)
      })
      expect(result.current.progress).toEqual([])
    })

    it('um envio novo dentro do intervalo cancela a limpeza: o lote no ar não perde as linhas dele', async () => {
      uploadMock.mockImplementationOnce(async (_f: File[], onProgress: (e: UploadProgress) => void) => {
        onProgress({ file: 'velho.png', size: 1, status: 'done' })
        return { uploaded: ['https://cdn/velho.webp'], failed: [] }
      })
      const { result } = setup()
      await act(() => result.current.upload([fileOf('velho.png')]))
      act(() => {
        vi.advanceTimersByTime(UPLOAD_DONE_LINGER_MS / 2)
      })

      const batch = deferredBatch()
      let pending!: Promise<void>
      act(() => {
        pending = result.current.upload([fileOf('a.png'), fileOf('b.png')])
      })
      act(() => {
        batch.emit({ file: 'a.png', size: 1, status: 'done' })
        batch.emit({ file: 'b.png', size: 1, status: 'uploading' })
      })
      act(() => {
        vi.advanceTimersByTime(UPLOAD_DONE_LINGER_MS * 3)
      })
      // A linha "enviada" de um lote AINDA no ar fica: ela é parte do progresso que corre.
      expect(result.current.progress.map(p => `${p.file}:${p.status}`)).toEqual(['a.png:done', 'b.png:uploading'])

      await act(async () => {
        batch.finish({ uploaded: ['https://cdn/a.webp'], failed: [{ file: 'b.png', reason: 'upload' }] })
        await pending
      })
    })

    it('desmontar com a limpeza agendada não deixa o temporizador vivo', async () => {
      uploadMock.mockResolvedValueOnce({ uploaded: ['https://cdn/a.webp'], failed: [] })
      const { result, unmount } = setup()
      await act(() => result.current.upload([fileOf('a.png')]))
      expect(vi.getTimerCount()).toBe(1)
      unmount()
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
