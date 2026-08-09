import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AboutPage from '../AboutPage'
import NotFound from '../NotFound'
import PoliciesPage from '../PoliciesPage'

/**
 * A copy institucional — `COP-07`.
 *
 * As três páginas de texto da loja não têm dado, não têm estado e não têm interação: nenhum outro
 * teste passa por elas, e é exatamente por isso que a marca anterior sobreviveu aqui até a última
 * task da feature. A `brandScan` pega o NOME antigo em qualquer arquivo; o que ela não sabe é se a
 * página **diz** alguma coisa — que a Sobre apresenta a Adri, que a 404 fala de joia, e que o tom
 * é o do negócio.
 *
 * O negócio é homenagem a quem morreu, leite materno, dente de leite e pelo de pet. Linguagem
 * festiva aqui não é "fora do tom": é a loja rindo na frente de quem acabou de perder alguém.
 */

function renderPagina(node: React.ReactElement) {
  return render(<MemoryRouter initialEntries={['/']}>{node}</MemoryRouter>)
}

/** Emoji, exclamação de festa e o vocabulário do produto anterior. */
const FESTIVO = /🎉|🥳|✨|💜|💖|😢|👋|bora |fandom|colecionar/i
const PRODUTO_ANTERIOR = /botton|\bpin\b|\bpins\b|alfinete/i

describe('Sobre — quem faz a joia (COP-07)', () => {
  it('apresenta a Adri Muniz, joalheira em Porto Alegre', () => {
    renderPagina(<AboutPage />)

    expect(screen.getByText('Adri Muniz')).toBeInTheDocument()
    expect(screen.getByText(/Porto Alegre/)).toBeInTheDocument()
  })

  it('descreve o que a loja faz — material do cliente virando joia', () => {
    renderPagina(<AboutPage />)

    const texto = document.body.textContent ?? ''
    expect(texto).toMatch(/cinzas/i)
    expect(texto).toMatch(/à mão/i)
  })

  it('não sobrou persona nem vocabulário da loja anterior', () => {
    renderPagina(<AboutPage />)

    // O NOME da marca anterior é assunto da `brandScan`, que varre o repositório
    // inteiro — repeti-lo aqui obrigaria este arquivo a entrar na allowlist dela,
    // e arquivo em allowlist deixa de ser varrido para sempre. O que se prova aqui
    // é o que ela não sabe ver: o vocabulário e o tom.
    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(PRODUTO_ANTERIOR)
    expect(texto).not.toMatch(FESTIVO)
  })
})

describe('404 — o estado vazio mais visitado da loja (COP-07)', () => {
  it('não fala de pin nem convida a colecionar', () => {
    renderPagina(<NotFound />)

    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(PRODUTO_ANTERIOR)
    expect(texto).not.toMatch(FESTIVO)
  })

  it('oferece as duas saídas: início e busca', () => {
    renderPagina(<NotFound />)

    expect(screen.getByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Ver coleções' })).toHaveAttribute('href', '/busca')
  })
})

describe('Políticas — o texto que a cliente lê antes de enviar o material (COP-07)', () => {
  it('cobre envio, pagamento, trocas e privacidade', () => {
    renderPagina(<PoliciesPage />)

    for (const secao of ['Envio', 'Pagamento', 'Trocas e Devoluções', 'Privacidade']) {
      expect(screen.getByRole('heading', { name: secao })).toBeInTheDocument()
    }
  })

  it('não usa vocabulário da loja anterior', () => {
    renderPagina(<PoliciesPage />)

    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(PRODUTO_ANTERIOR)
  })
})
