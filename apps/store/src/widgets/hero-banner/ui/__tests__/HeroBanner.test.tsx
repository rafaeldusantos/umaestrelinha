import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HeroBanner from '../HeroBanner'

/**
 * O hero da home — `IDN-04` AC "o hero não exibe mascote nem produto de pin".
 *
 * A arte anterior era uma **cartela de pins**: papel picotado, cinco discos e
 * um selo. Ela não tinha re-skin possível — um botton desenhado em ouro
 * continua sendo um botton —, e o remap da Fase 3 tinha justamente pintado os
 * cinco discos de `accent` sem que nada acusasse.
 */

const renderHero = () => render(<MemoryRouter><HeroBanner /></MemoryRouter>)

describe('Hero — a arte é a marca, não o produto antigo', () => {
  it('mostra o símbolo da marca', () => {
    renderHero()
    expect(screen.getByRole('img', { name: 'Uma Estrelinha' })).toBeInTheDocument()
  })

  it('não sobrou nenhum disco da cartela de pins', () => {
    // A cartela eram cinco `rounded-full` com preenchimento dentro da figura,
    // mais a moldura pontilhada. Se um deles voltar, volta o produto errado.
    const { container } = renderHero()
    const pontilhado = container.querySelectorAll('.border-dashed')
    expect(pontilhado).toHaveLength(0)
  })

  it('a figura aparece também no celular', () => {
    // A cartela era `hidden md:flex` porque 440px não cabiam em 390. O
    // símbolo cabe, então o hero deixa de ser só texto no tamanho que
    // responde por ~90% dos acessos.
    const { container } = renderHero()
    const figura = screen.getByRole('img', { name: 'Uma Estrelinha' }).closest('div')!
      .parentElement!
    expect(figura.className).not.toContain('hidden')
    void container
  })

  it('nenhum texto do hero é ouro', () => {
    // O único ouro é a régua de 1px do sobretítulo — objeto gráfico.
    const { container } = renderHero()
    for (const node of container.querySelectorAll('h1, p, span, a')) {
      expect(node.className.toString()).not.toMatch(/text-estrelinha-accent/)
    }
  })

  it('o CTA tem alvo de toque de 44px', () => {
    renderHero()
    expect(screen.getByRole('link', { name: /Explorar coleções/ }).className).toContain('min-h-11')
  })
})

describe('Hero — a chamada descreve o produto desta loja', () => {
  it('fala de joia, e não de coleção de bottons', () => {
    const { container } = renderHero()
    expect(container.textContent).toMatch(/joia/i)
    expect(container.textContent).not.toMatch(/botton|K-Pop|anime|colecionadora/i)
  })

  it('não anuncia calendário de lançamento', () => {
    // "Drop novo toda sexta" era promessa de agenda que esta loja não tem — a
    // mesma razão pela qual a T16 recusou semear a tabela `drops`.
    const { container } = renderHero()
    expect(container.textContent).not.toMatch(/drop/i)
  })

  it('não afirma número de clientes que ninguém conta', () => {
    const { container } = renderHero()
    expect(container.textContent).not.toMatch(/\+?\s?2\.000/)
  })
})
