import { afterEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDocumentMeta } from '../useDocumentMeta'

/**
 * `FAQL-15` — o dono único de `<title>` e `<meta name="description">`.
 *
 * A parte que este arquivo trava é a restauração. Apagar o título ao desmontar deixaria a aba em
 * branco no caminho para a próxima rota; remover uma `<meta>` que já era do documento seria destruir
 * declaração de outro dono.
 */

const descricao = () => document.head.querySelector<HTMLMetaElement>('meta[name="description"]')

afterEach(() => {
  descricao()?.remove()
  document.title = ''
})

describe('useDocumentMeta', () => {
  it('grava título e descrição', () => {
    renderHook(() => useDocumentMeta({ title: 'Perguntas frequentes', description: 'As dúvidas.' }))

    expect(document.title).toBe('Perguntas frequentes')
    expect(descricao()?.getAttribute('content')).toBe('As dúvidas.')
  })

  it('RESTAURA o título anterior no unmount', () => {
    document.title = 'Uma Estrelinha'
    const { unmount } = renderHook(() => useDocumentMeta({ title: 'Perguntas frequentes' }))
    expect(document.title).toBe('Perguntas frequentes')

    unmount()
    expect(document.title).toBe('Uma Estrelinha')
  })

  it('cria a meta quando ela não existe, e a REMOVE no unmount', () => {
    expect(descricao()).toBeNull()
    const { unmount } = renderHook(() => useDocumentMeta({ description: 'Criada aqui.' }))
    expect(descricao()).not.toBeNull()

    unmount()
    expect(descricao()).toBeNull()
  })

  // ⚠️ Quando a meta já era do documento, este hook só troca o conteúdo — e devolve o original.
  // Removê-la apagaria a descrição que o `index.html` declara para todas as outras rotas.
  it('meta preexistente é restaurada, nunca removida', () => {
    const existente = document.createElement('meta')
    existente.setAttribute('name', 'description')
    existente.setAttribute('content', 'A da loja inteira.')
    document.head.appendChild(existente)

    const { unmount } = renderHook(() => useDocumentMeta({ description: 'A desta página.' }))
    expect(descricao()?.getAttribute('content')).toBe('A desta página.')

    unmount()
    expect(descricao()).not.toBeNull()
    expect(descricao()?.getAttribute('content')).toBe('A da loja inteira.')
  })

  it('sem título e sem descrição não toca em nada', () => {
    document.title = 'Intocado'
    renderHook(() => useDocumentMeta(null))

    expect(document.title).toBe('Intocado')
    expect(descricao()).toBeNull()
  })
})
