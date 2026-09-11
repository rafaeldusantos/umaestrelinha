import { beforeEach, describe, expect, it } from 'vitest'

import { useMaterialDrawerStore } from '../materialDrawerStore'

/**
 * `GAV-15` — **a escolha da cliente sobrevive ao fechar, na mesma aba.**
 *
 * O caso que importa é o quarto: fechar **não** pode limpar `anchor`. Se limpasse, a cliente que
 * abriu a gaveta, escolheu "Cinzas", fechou para reler o preço e reabriu, cairia de volta na
 * pergunta — e o defeito passaria despercebido em revisão, porque `closeDrawer: () => set({ open:
 * false, anchor: null })` parece a implementação mais "limpa" das duas.
 */

const estadoInicial = useMaterialDrawerStore.getState()

describe('materialDrawerStore', () => {
  beforeEach(() => {
    useMaterialDrawerStore.setState({ open: estadoInicial.open, anchor: estadoInicial.anchor })
  })

  it('nasce fechada e sem escolha', () => {
    const { open, anchor } = useMaterialDrawerStore.getState()
    expect(open).toBe(false)
    expect(anchor).toBe(null)
  })

  it('abrir liga `open` sem inventar escolha', () => {
    useMaterialDrawerStore.getState().openDrawer()
    expect(useMaterialDrawerStore.getState().open).toBe(true)
    expect(useMaterialDrawerStore.getState().anchor).toBe(null)
  })

  it('escolher grava a âncora e NÃO fecha a gaveta', () => {
    useMaterialDrawerStore.getState().openDrawer()
    useMaterialDrawerStore.getState().setAnchor('cinzas')

    expect(useMaterialDrawerStore.getState().anchor).toBe('cinzas')
    expect(useMaterialDrawerStore.getState().open).toBe(true)
  })

  it('fechar PRESERVA a escolha', () => {
    useMaterialDrawerStore.getState().openDrawer()
    useMaterialDrawerStore.getState().setAnchor('cinzas')
    useMaterialDrawerStore.getState().setDrawerOpen(false)

    expect(useMaterialDrawerStore.getState().open).toBe(false)
    expect(useMaterialDrawerStore.getState().anchor).toBe('cinzas')
  })

  it('reabrir devolve a escolha de antes', () => {
    useMaterialDrawerStore.getState().openDrawer()
    useMaterialDrawerStore.getState().setAnchor('leite-materno')
    useMaterialDrawerStore.getState().setDrawerOpen(false)
    useMaterialDrawerStore.getState().openDrawer()

    expect(useMaterialDrawerStore.getState().open).toBe(true)
    expect(useMaterialDrawerStore.getState().anchor).toBe('leite-materno')
  })

  it('não existe um SEGUNDO caminho de fechamento', () => {
    // A verificação independente achou um `closeDrawer()` exportado e testado que NENHUMA tela
    // chamava — o X, o Escape e o véu passam todos por `onOpenChange` → `setDrawerOpen`. Sobra
    // exportada é a forma do `deleteSection` da feature 41, e o risco real é os dois divergirem
    // quando alguém finalmente ligar o segundo.
    expect('closeDrawer' in useMaterialDrawerStore.getState()).toBe(false)
  })

  it('trocar de material substitui a escolha', () => {
    useMaterialDrawerStore.getState().setAnchor('cinzas')
    useMaterialDrawerStore.getState().setAnchor('unhas')
    expect(useMaterialDrawerStore.getState().anchor).toBe('unhas')
  })

  it('`setDrawerOpen` serve os dois sentidos — é o que o `Sheet` do Radix chama', () => {
    useMaterialDrawerStore.getState().setDrawerOpen(true)
    expect(useMaterialDrawerStore.getState().open).toBe(true)
    useMaterialDrawerStore.getState().setDrawerOpen(false)
    expect(useMaterialDrawerStore.getState().open).toBe(false)
  })

  it('não grava nada em `localStorage`', () => {
    // Chave nova em `localStorage` é dívida: a regra que proíbe renomeá-las volta a valer no
    // primeiro cliente real. Este store é efêmero de propósito.
    useMaterialDrawerStore.getState().openDrawer()
    useMaterialDrawerStore.getState().setAnchor('cinzas')

    const chaves = Object.keys(window.localStorage)
    expect(chaves.filter(k => k.includes('material'))).toEqual([])
  })
})
