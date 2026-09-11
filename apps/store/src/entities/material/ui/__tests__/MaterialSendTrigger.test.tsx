import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { MATERIAL_KIND_LABELS } from '@estrelinha/core/material'
import type { Product } from '@estrelinha/supabase/types'

import { useMaterialDrawerStore } from '../../model/materialDrawerStore'
import MaterialSendTrigger from '../MaterialSendTrigger'

/**
 * `GAV-01`, `GAV-02`, `GAV-03`, `GAV-05`.
 *
 * O caso que mais importa é o de `GAV-03`: a linha **não pode nomear material**. É a regra que a
 * remoção de `MaterialNotice` estabeleceu em 2026-09-11 e que esta feature tinha de respeitar para
 * existir. Ele é asserido contra **todos** os rótulos de `MATERIAL_KIND_LABELS`, não contra uma
 * amostra — um laço sobre a lista real é o que sobrevive a um material novo entrar no enum.
 */

const produto = (requires_material: boolean | null): Product =>
  ({
    id: 'p1',
    name: 'Pingente gota',
    slug: 'pingente-gota',
    price: 209.9,
    requires_material,
    material_kinds: ['cinzas'],
  }) as unknown as Product

describe('MaterialSendTrigger', () => {
  beforeEach(() => {
    useMaterialDrawerStore.setState({ open: false, anchor: null })
  })

  it('renderiza a linha quando a peça exige material', () => {
    render(<MaterialSendTrigger product={produto(true)} />)

    expect(screen.getByRole('button', { name: /Como enviar seu material de DNA/i })).toBeTruthy()
  })

  it('o rótulo e o apoio são as frases INTEIRAS da spec', () => {
    // Asserir fragmento deixa a copy divergir do desenho sem quebrar teste (lição `L-009`).
    render(<MaterialSendTrigger product={produto(true)} />)

    expect(screen.getByText('Como enviar seu material de DNA')).toBeTruthy()
    expect(screen.getByText('Passo a passo, vídeo e quantidade certa')).toBeTruthy()
  })

  it('NÃO renderiza quando `requires_material` é `false`', () => {
    const { container } = render(<MaterialSendTrigger product={produto(false)} />)
    expect(container.innerHTML).toBe('')
  })

  it('NÃO renderiza quando `requires_material` é `null` — o terceiro estado lê como `false`', () => {
    const { container } = render(<MaterialSendTrigger product={produto(null)} />)
    expect(container.innerHTML).toBe('')
  })

  it('não nomeia material nenhum — contra TODOS os rótulos do enum', () => {
    // `GAV-03`. A peça do fixture tem `material_kinds: ['cinzas']` de propósito: se o componente
    // voltar a ler a coluna, este caso é o que reprova.
    render(<MaterialSendTrigger product={produto(true)} />)
    const texto = screen.getByRole('button').textContent ?? ''

    for (const rotulo of Object.values(MATERIAL_KIND_LABELS)) {
      expect(texto.toLowerCase()).not.toContain(rotulo.toLowerCase())
    }
  })

  it('o alvo tem no mínimo 44px de altura', () => {
    render(<MaterialSendTrigger product={produto(true)} />)
    const botao = screen.getByRole('button')

    // jsdom devolve 0 para layout, então a prova possível aqui é a classe que produz a altura —
    // por token exato, porque `'min-h-[64px]'.includes('h-[64px]')` também casaria `h-[64px]`.
    const classes = (botao.getAttribute('class') ?? '').split(/\s+/)
    expect(classes).toContain('min-h-[64px]')
  })

  it('anuncia que abre um DIÁLOGO, e se ele está aberto', () => {
    // A gaveta abre num portal, longe deste ponto do DOM. Sem `aria-haspopup`/`aria-expanded`,
    // quem usa leitor de tela ouve "botão", toca, e não recebe aviso de mudança de contexto.
    render(<MaterialSendTrigger product={produto(true)} />)
    const botao = screen.getByRole('button')

    expect(botao.getAttribute('aria-haspopup')).toBe('dialog')
    expect(botao.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(botao)
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
  })

  it('acionar abre a gaveta', () => {
    render(<MaterialSendTrigger product={produto(true)} />)
    fireEvent.click(screen.getByRole('button'))

    expect(useMaterialDrawerStore.getState().open).toBe(true)
  })

  it('acionar NÃO escolhe material por conta própria', () => {
    // Pré-selecionar seria a loja voltando a afirmar qual é o material da cliente.
    render(<MaterialSendTrigger product={produto(true)} />)
    expect(useMaterialDrawerStore.getState().anchor).toBe(null)
  })
})
