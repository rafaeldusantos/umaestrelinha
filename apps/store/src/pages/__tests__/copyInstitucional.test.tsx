import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * `L-030`: mock do módulo INTEIRO. A Sobre lê `whatsapp` das settings para decidir se a ação "Falar
 * com a Adri" existe (feature 29) — hook novo consumido por qualquer uma das páginas desta suíte
 * precisa aparecer aqui, senão o render estoura antes de qualquer asserção de copy.
 */
const { settingsGeral } = vi.hoisted(() => ({
  settingsGeral: { whatsapp: '', store_name: 'Uma Estrelinha' },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => settingsGeral,
}))

import AboutPage from '../AboutPage'
import NotFound from '../NotFound'
import JewelryCarePage from '../JewelryCarePage'
import NewsletterBanner from '@/features/newsletter/ui/NewsletterBanner'

/**
 * A copy institucional — `COP-07`.
 *
 * As páginas de texto da loja não têm dado, não têm estado e não têm interação: nenhum outro
 * teste passa por elas, e é exatamente por isso que a marca anterior sobreviveu aqui até a última
 * task da feature. A `brandScan` pega o NOME antigo em qualquer arquivo; o que ela não sabe é se a
 * página **diz** alguma coisa — que a Sobre apresenta a Adri, que a 404 fala de joia, que os
 * cuidados com a joia não viram propaganda, e que o tom é o do negócio.
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

describe('Cuidados com sua joia afetiva — a ficha não vira propaganda (COP-07)', () => {
  it('descreve conservação da joia, não a loja', () => {
    renderPagina(<JewelryCarePage />)

    const texto = document.body.textContent ?? ''
    expect(texto).toMatch(/prata/i)
    expect(texto).toMatch(/flanela/i)
  })

  it('não sobrou vocabulário da loja anterior nem tom festivo', () => {
    renderPagina(<JewelryCarePage />)

    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(PRODUTO_ANTERIOR)
    expect(texto).not.toMatch(FESTIVO)
  })
})

/**
 * Feature 42 — a newsletter para de prometer (`FIX-04`, defeito D4).
 *
 * A faixa da home confirmava "Você vai receber as novidades da loja no seu e-mail" — e não persiste,
 * não inscreve, não envia. É a mesma classe da copy institucional: uma promessa que a loja não cumpre,
 * feita a quem acabou de perder alguém. A confirmação é o retorno de uma ação, então ela existe; o
 * que não pode existir é a promessa de e-mail.
 */
describe('Newsletter — a confirmação não promete o que a loja não envia (FIX-04)', () => {
  const confirmar = () => {
    const { container } = render(<NewsletterBanner content={{ title: 'Novidades', subtitle: '', cta_label: 'Enviar' }} />)
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'cliente@exemplo.invalid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    return container
  }

  it('confirma com "Anotado. Quando houver novidades, escrevemos."', () => {
    confirmar()

    expect(screen.getByText('Anotado. Quando houver novidades, escrevemos.')).toBeInTheDocument()
  })

  it('NÃO afirma que a cliente vai receber e-mail', () => {
    const container = confirmar()

    expect(container.textContent).not.toMatch(/vai receber/i)
    expect(container.textContent).not.toMatch(/no seu e-mail/i)
    // E a régua do tom desta suíte vale para a faixa também.
    expect(container.textContent).not.toMatch(FESTIVO)
  })
})
