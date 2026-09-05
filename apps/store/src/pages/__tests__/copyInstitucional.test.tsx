import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * A Políticas deixou de ser sem estado na feature 27: o percentual do Pix passou a vir das settings
 * (`PDP-24`), em vez de cravado no texto. As outras duas páginas seguem sem dado nenhum.
 */
const { settingsPagamento, settingsFrete, settingsGeral } = vi.hoisted(() => ({
  settingsPagamento: { pix_enabled: true, pix_discount_percent: 5 },
  // Feature 37: o interruptor é campo próprio. A faixa guardada (150) **sobrevive** ao desligar —
  // por isso os testes abaixo alternam `free_shipping_enabled`, e não zeram o número.
  settingsFrete: { free_shipping_enabled: true, free_shipping_threshold: 150 },
  // Feature 29: a Sobre passou a ler `whatsapp` das settings para decidir se a ação "Falar com a
  // Adri" existe. O mock deste arquivo substitui o módulo inteiro, então um hook novo consumido
  // por qualquer uma das três páginas precisa aparecer aqui — senão o render estoura antes de
  // qualquer asserção de copy.
  settingsGeral: { whatsapp: '', store_name: 'Uma Estrelinha' },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => settingsPagamento,
  useShippingSettings: () => settingsFrete,
  useGeneralSettings: () => settingsGeral,
}))

import AboutPage from '../AboutPage'
import NotFound from '../NotFound'
import PoliciesPage from '../PoliciesPage'

beforeEach(() => {
  settingsPagamento.pix_enabled = true
  settingsPagamento.pix_discount_percent = 5
  settingsFrete.free_shipping_enabled = true
  settingsFrete.free_shipping_threshold = 150
})

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

  /**
   * `PDP-24` — o percentual do Pix vem das settings.
   *
   * A página cravava "5% de desconto no PIX!" enquanto o resto da loja lia
   * `pix_discount_percent`: mudar o número no painel deixava esta página mentindo em silêncio.
   */
  it('o percentual do Pix vem das settings, e não do texto', () => {
    settingsPagamento.pix_discount_percent = 7
    renderPagina(<PoliciesPage />)

    expect(screen.getByText(/7% de desconto no PIX!/)).toBeInTheDocument()
    expect(screen.queryByText(/5% de desconto no PIX!/)).toBeNull()
  })

  it('com o Pix desligado, a promessa de desconto não aparece', () => {
    settingsPagamento.pix_enabled = false
    renderPagina(<PoliciesPage />)

    expect(screen.queryByText(/desconto no PIX/)).toBeNull()
    // O meio de pagamento continua anunciado — o que sai é só a promessa do desconto.
    expect(screen.getByText(/Aceitamos Pix e cartão de crédito/)).toBeInTheDocument()
  })

  it('com percentual zerado, a promessa de desconto não aparece', () => {
    settingsPagamento.pix_discount_percent = 0
    renderPagina(<PoliciesPage />)

    expect(screen.queryByText(/desconto no PIX/)).toBeNull()
  })

  /**
   * O teto do frete grátis também vem das settings.
   *
   * Cravava "R$ 150" no texto enquanto `free_shipping_threshold` já existia e já alimentava os selos
   * da página do produto — mesma classe do `5%` acima, na mesma página.
   */
  it('o teto do frete grátis vem das settings, e não do texto', () => {
    settingsFrete.free_shipping_threshold = 199.9
    renderPagina(<PoliciesPage />)

    expect(screen.getByText(/acima de R\$ 199,90/)).toBeInTheDocument()
    expect(screen.queryByText(/acima de R\$ 150/)).toBeNull()
  })

  it('com o interruptor DESLIGADO, a promessa não aparece', () => {
    settingsFrete.free_shipping_enabled = false
    renderPagina(<PoliciesPage />)

    expect(screen.queryByText(/Frete grátis/)).toBeNull()
    // A faixa segue 150 no banco, e a página não a menciona — o número guardado não vaza (FRG-03,
    // invariante 3).
    expect(screen.queryByText(/R\$ 150/)).toBeNull()
    // A seção de envio continua existindo — o que sai é só a promessa.
    expect(screen.getByRole('heading', { name: 'Envio' })).toBeInTheDocument()
  })

  it('interruptor LIGADO com faixa zerada também não promete nada', () => {
    // Configuração inválida (`FRG-12` impede de gravar). O que importa aqui é que ela não vire
    // "frete grátis para compras acima de R$ 0,00".
    settingsFrete.free_shipping_enabled = true
    settingsFrete.free_shipping_threshold = 0
    renderPagina(<PoliciesPage />)

    expect(screen.queryByText(/Frete grátis/)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Envio' })).toBeInTheDocument()
  })
})
