import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NewsletterBanner from '../NewsletterBanner'

/**
 * A faixa da newsletter — `IDN-04` e `IDN-09`, board `67W-0`.
 *
 * Ela é a **maior superfície chapada da loja**, e por isso é o lugar onde o
 * remap mecânico da Fase 3 mais custou: ele trocou o rosa Carimbo por `accent`
 * e deixou o painel inteiro em ouro. Ouro em bloco não é o desenho, e nenhum
 * teste de componente reclamaria — a classe existe, o build passa, a cliente vê.
 *
 * As duas asserções que importam são de superfície: o painel é
 * `primary-strong`, e o ouro cabe **só** no botão.
 */

const renderBanner = () => render(<NewsletterBanner />)
const painel = (container: HTMLElement) =>
  container.querySelector('section > div > div') as HTMLElement

describe('Newsletter — o painel não é ouro (IDN-04)', () => {
  it('a superfície é `primary-strong`, como a board desenha', () => {
    const { container } = renderBanner()
    expect(painel(container)).toHaveClass('bg-estrelinha-primary-strong')
  })

  it('nenhuma superfície da faixa é `accent`, exceto o botão', () => {
    const { container } = renderBanner()
    const dourados = [...painel(container).querySelectorAll('*')].filter((n) =>
      n.className.toString().includes('bg-estrelinha-accent'),
    )

    expect(dourados).toHaveLength(1)
    expect(dourados[0].tagName).toBe('BUTTON')
  })

  it('o rótulo do botão é `ink` — o único texto que o acento sustenta', () => {
    // `primary-strong` sobre `accent` mede 4,21:1 e reprova em AA; a razão
    // medida está em `contrast.test.ts`.
    renderBanner()
    const botao = screen.getByRole('button', { name: 'Me cadastrar' })
    expect(botao.className).toContain('text-estrelinha-ink')
    expect(botao.className).not.toContain('text-estrelinha-primary-strong')
  })
})

describe('Newsletter — a persona e a promessa antigas saíram (COP-07)', () => {
  it('convida para a newsletter da loja, e não para o clube de uma persona', () => {
    // Quem prova que os nomes antigos não voltam é a `brandScan.test.ts`, no
    // repositório inteiro. Aqui se afirma o texto que a board escreve.
    renderBanner()
    expect(screen.getByRole('heading', { name: 'Quer saber das novidades?' })).toBeInTheDocument()
  })

  it('não promete cupom que a loja não emite', () => {
    // "10% OFF no primeiro pedido" era da loja anterior e não existe cupom
    // nenhum atrás disso: prometer desconto que não chega é o único defeito
    // desta faixa que custaria dinheiro.
    const { container } = renderBanner()
    expect(container.textContent).not.toMatch(/10%|OFF/i)
  })

  it('pede um dado só — o e-mail', () => {
    // A board desenha nome, telefone e e-mail. Nome e telefone não têm destino
    // nenhum aqui, e pedir dado que ninguém guarda é coleta sem finalidade.
    const { container } = renderBanner()
    const campos = container.querySelectorAll('input')
    expect(campos).toHaveLength(1)
    expect(campos[0]).toHaveAttribute('type', 'email')
  })
})

describe('Newsletter — o envio', () => {
  it('confirma sem prometer desconto', () => {
    renderBanner()
    fireEvent.change(screen.getByLabelText('Seu e-mail'), {
      target: { value: 'adri@umaestrelinha.com.br' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Me cadastrar' }))

    expect(screen.getByText('Tudo certo!')).toBeInTheDocument()
    expect(screen.getByText(/novidades da loja no seu e-mail/)).toBeInTheDocument()
  })

  it('e-mail vazio não confirma nada', () => {
    renderBanner()
    fireEvent.click(screen.getByRole('button', { name: 'Me cadastrar' }))
    expect(screen.queryByText('Tudo certo!')).not.toBeInTheDocument()
  })
})
