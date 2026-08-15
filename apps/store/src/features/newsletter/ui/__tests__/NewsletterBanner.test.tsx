import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DEFAULT_HOME_COMPOSITION, type HomeSectionConfig } from '@estrelinha/core/home'
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

const CONTEUDO_DE_HOJE = DEFAULT_HOME_COMPOSITION.find((s) => s.type === 'newsletter')!.config

const renderBanner = (content: HomeSectionConfig = CONTEUDO_DE_HOJE) =>
  render(<NewsletterBanner content={content} />)
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

describe('Newsletter — o texto vem do conteúdo, não do arquivo (HOME-41)', () => {
  it('desenha título, subtítulo e o rótulo do botão que a prop traz', () => {
    // Com fallback literal dentro do widget, este teste passaria mostrando os textos antigos — o
    // segundo dono que a emenda `E1` fecha.
    renderBanner({
      title: 'Receba as novidades do ateliê',
      subtitle: 'Uma mensagem por mês, sem promoção inventada.',
      cta_label: 'Quero receber',
    })

    expect(
      screen.getByRole('heading', { name: 'Receba as novidades do ateliê' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Uma mensagem por mês, sem promoção inventada.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quero receber' })).toBeInTheDocument()
  })

  it('a confirmação do envio NÃO é editável', () => {
    // Ela não é chamada de marketing, é o retorno de uma ação: deixá-la em branco tiraria a única
    // resposta que a cliente recebe depois de se cadastrar.
    renderBanner({ title: 'Outro título', cta_label: 'Enviar' })
    fireEvent.change(screen.getByLabelText('Seu e-mail'), {
      target: { value: 'adri@umaestrelinha.com.br' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(screen.getByText('Tudo certo!')).toBeInTheDocument()
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
