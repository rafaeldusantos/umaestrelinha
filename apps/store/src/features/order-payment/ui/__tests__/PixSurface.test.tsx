import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PixState } from '../../model/usePixPayment'
import PixSurface from '../PixSurface'

/**
 * As quatro telas do PIX — boards `58 C`/`D`/`E`/`F`.
 *
 * `PIX-P1-03`, `PIX-P2-01`, `PIX-P2-03`, `PIX-P2-04`, `PIX-P2-05`.
 *
 * **jsdom devolve 0 para toda medida de layout**, então nada aqui mede tamanho: o que se prova é
 * presença, texto e token de classe — e por **token exato**, nunca `toContain` de prefixo
 * (`L-034`), porque `text-estrelinha-ink-soft` contém `text-estrelinha-ink` como substring e uma
 * régua ingênua diria que o tempo está em tinta quando ele está apagado.
 */

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, ...rest }: { value: string }) => (
    <svg data-testid="qr" data-value={value} {...rest} />
  ),
}))

const settings = {
  payment: { pix_enabled: true, pix_discount_percent: 5, card_enabled: true, max_installments: 6, min_installment_value: 10 },
  general: { whatsapp: '(51) 99999-8888', email: 'ola@umaestrelinha.com.br', store_name: 'Uma Estrelinha' },
}
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => settings.payment,
  useGeneralSettings: () => settings.general,
}))

const onGenerate = vi.fn()
const onCopy = vi.fn()

const montar = (state: PixState, extra: Record<string, unknown> = {}) =>
  render(
    <MemoryRouter>
      <PixSurface
        state={state}
        amount={46.55}
        orderNumber="0244"
        orderHref="/pedido/abc-123"
        onGenerate={onGenerate}
        onCopy={onCopy}
        copied={false}
        {...extra}
      />
    </MemoryRouter>,
  )

const pronto = (secondsLeft = 587): PixState => ({
  kind: 'ready',
  qrCode: '00020126580014br.gov.bcb.pix',
  secondsLeft,
})

/** Token exato, nunca substring: `text-estrelinha-ink-soft` contém `text-estrelinha-ink`. */
const temClasse = (el: Element, token: string) =>
  new RegExp(`(?:^|\\s)${token}(?![-\\w])`).test(el.className)

/** As pílulas CHEIAS que recebem toque — botão e âncora, nunca o pontinho de um aviso. */
const pilhasCheias = (container: HTMLElement) =>
  [...container.querySelectorAll('button, a')].filter(el =>
    temClasse(el, 'bg-estrelinha-primary'),
  )

beforeEach(() => {
  onGenerate.mockReset()
  onCopy.mockReset()
  settings.payment.pix_discount_percent = 5
  settings.general.whatsapp = '(51) 99999-8888'
})

describe('PixSurface — código pronto (PIX-P1-03)', () => {
  it('diz o valor, o QR, o copia-e-cola e o tempo', () => {
    montar(pronto())

    expect(screen.getByText('R$ 46,55')).toBeInTheDocument()
    expect(screen.getByTestId('qr')).toHaveAttribute(
      'data-value',
      '00020126580014br.gov.bcb.pix',
    )
    expect(screen.getByLabelText('Código PIX copia e cola')).toHaveValue(
      '00020126580014br.gov.bcb.pix',
    )
    expect(screen.getByTestId('pix-tempo')).toHaveTextContent('09:47')
  })

  it('nomeia o pedido e a situação, pelo formatador', () => {
    montar(pronto())

    expect(screen.getByText('#0244')).toBeInTheDocument()
    expect(screen.getByText(/Aguardando pagamento/)).toBeInTheDocument()
  })

  it('copiar chama quem sabe copiar, e o rótulo confirma quando o estado diz', () => {
    const { unmount } = montar(pronto())
    fireEvent.click(screen.getByRole('button', { name: 'Copiar código' }))
    expect(onCopy).toHaveBeenCalledTimes(1)
    unmount()

    montar(pronto(), { copied: true })
    expect(screen.getByRole('button', { name: 'Código copiado' })).toBeInTheDocument()
  })

  it('o desconto do PIX sai das configurações, nunca do JSX', () => {
    // `PDP-24`: número cravado no texto mente no dia em que a dona muda o percentual no painel.
    montar(pronto())
    expect(screen.getByText('já com os 5% de desconto do PIX')).toBeInTheDocument()
  })

  it('com desconto zerado a nota não promete desconto nenhum', () => {
    settings.payment.pix_discount_percent = 0
    montar(pronto())

    expect(screen.queryByText(/desconto do PIX/)).not.toBeInTheDocument()
    expect(screen.getByText('a pagar com PIX')).toBeInTheDocument()
  })

  it('afirma que a tela avança sozinha — é o que faz a pessoa não recarregar', () => {
    montar(pronto())

    expect(screen.getByText(/Estamos de olho no seu pagamento/)).toBeInTheDocument()
  })
})

describe('PixSurface — o tempo é fato, não pressão (PIX-P2-05)', () => {
  it('acima de 5 minutos o tempo é `ink`', () => {
    montar(pronto(587))
    const tempo = screen.getByTestId('pix-tempo')

    expect(temClasse(tempo, 'text-estrelinha-ink')).toBe(true)
    expect(temClasse(tempo, 'text-estrelinha-primary')).toBe(false)
  })

  it('abaixo de 5 minutos ele TROCA para `primary` — e só isso', () => {
    // A metade invertida (`L-029`): sem ela, um componente que pintasse tudo de `ink` provaria a
    // régua inteira com a metade fácil.
    montar(pronto(299))
    const tempo = screen.getByTestId('pix-tempo')

    expect(temClasse(tempo, 'text-estrelinha-primary')).toBe(true)
    expect(temClasse(tempo, 'text-estrelinha-ink')).toBe(false)
  })

  it('a fronteira é 300s, não "quase lá"', () => {
    const { unmount } = montar(pronto(300))
    expect(temClasse(screen.getByTestId('pix-tempo'), 'text-estrelinha-ink')).toBe(true)
    unmount()

    montar(pronto(299))
    expect(temClasse(screen.getByTestId('pix-tempo'), 'text-estrelinha-primary')).toBe(true)
  })

  it('nem vermelho nem piscar, em nenhum dos quatro estados', () => {
    const estados: PixState[] = [
      pronto(10),
      { kind: 'expired' },
      { kind: 'failed', message: 'O banco não respondeu a tempo.' },
      { kind: 'approved' },
    ]

    for (const state of estados) {
      const { container, unmount } = montar(state)
      expect(container.innerHTML).not.toMatch(
        /bg-(red|rose|orange|amber)-|text-(red|rose|orange|amber)-[0-9]|animate-pulse|animate-ping/,
      )
      unmount()
    }
  })

  it('nenhum vocabulário de urgência fabricada', () => {
    // `DESIGN.md` §1: nada apressa. A tela do relógio é exatamente onde a tentação aparece.
    const { container } = montar(pronto(30))

    expect(container.textContent).not.toMatch(/corra|rápido|últim|aproveite|não perca|urgent/i)
  })
})

describe('PixSurface — código expirado (PIX-P2-01, PIX-P2-02)', () => {
  it('afirma que nada foi cobrado e que o pedido continua guardado', () => {
    montar({ kind: 'expired' })

    expect(screen.getByRole('heading', { name: 'O código expirou' })).toBeInTheDocument()
    expect(screen.getByText(/Nada foi cobrado e seu pedido continua guardado/)).toBeInTheDocument()
  })

  it('oferece UMA ação: gerar um código novo para o mesmo pedido', () => {
    const { container } = montar({ kind: 'expired' })

    const cta = screen.getByRole('button', { name: 'Gerar um código novo' })
    fireEvent.click(cta)
    expect(onGenerate).toHaveBeenCalledTimes(1)
    expect(container.querySelectorAll('button')).toHaveLength(1)
  })

  it('o valor não muda — é o mesmo pedido', () => {
    montar({ kind: 'expired' })

    expect(screen.getByText('R$ 46,55')).toBeInTheDocument()
    expect(screen.getByText('o mesmo valor, com os 5% do PIX')).toBeInTheDocument()
  })

  it('não mostra QR nenhum — um QR morto é pior que nenhum', () => {
    montar({ kind: 'expired' })

    expect(screen.queryByTestId('qr')).not.toBeInTheDocument()
    expect(screen.getByText('Código expirado')).toBeInTheDocument()
  })

  it('avisa para não pagar duas vezes', () => {
    // O caso real: a pessoa pagou e o código venceu depois. A tela precisa dizer isso antes de ela
    // pagar de novo por conta própria.
    montar({ kind: 'expired' })

    expect(screen.getByText(/não pague de novo/i)).toBeInTheDocument()
  })
})

describe('PixSurface — a falha é do banco (PIX-P2-03)', () => {
  const falha: PixState = { kind: 'failed', message: 'O banco não respondeu a tempo.' }

  it('diz de que lado foi a falha, nomeia o pedido e afirma que nada foi cobrado', () => {
    montar(falha)

    expect(screen.getByText(/A falha foi do lado do banco/)).toBeInTheDocument()
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent('O banco não respondeu a tempo.')
    expect(within(alerta).getByText('#0244')).toBeInTheDocument()
    expect(alerta).toHaveTextContent(/nada foi cobrado/i)
  })

  it('oferece as DUAS saídas: tentar de novo e falar no WhatsApp', () => {
    montar(falha)

    fireEvent.click(screen.getByRole('button', { name: 'Tentar gerar o código de novo' }))
    expect(onGenerate).toHaveBeenCalledTimes(1)

    const wa = screen.getByRole('link', { name: 'Falar com a gente no WhatsApp' })
    expect(wa).toHaveAttribute('href', expect.stringContaining('https://wa.me/5199999888'))
    expect(wa).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('sem WhatsApp cadastrado, o botão NÃO aparece — `wa.me/` sem dígito abre conversa com ninguém', () => {
    settings.general.whatsapp = ''
    montar(falha)

    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar gerar o código de novo' })).toBeInTheDocument()
  })

  it('o WhatsApp é o ÚNICO estado em que ele aparece', () => {
    // Ele existe porque aqui é o único ponto em que a loja não sabe o que fazer sozinha. Nos outros
    // três, mandar para o WhatsApp seria empurrar trabalho para a dona sem motivo.
    for (const state of [pronto(), { kind: 'expired' } as PixState, { kind: 'approved' } as PixState]) {
      const { unmount } = montar(state)
      expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument()
      unmount()
    }
  })
})

describe('PixSurface — pagamento confirmado (PIX-P2-04)', () => {
  it('confirma na própria tela, com a hora', () => {
    montar({ kind: 'approved' })

    expect(screen.getByRole('heading', { name: 'Pagamento confirmado' })).toBeInTheDocument()
    expect(screen.getByText(/Confirmado às \d{2}:\d{2}/)).toBeInTheDocument()
    // O versalete muda junto: a situação do pedido deixa de ser "aguardando".
    expect(screen.getByText('#0244').closest('p')).toHaveTextContent(
      'Pedido #0244 · Pagamento confirmado',
    )
    expect(screen.queryByText(/Aguardando pagamento/)).not.toBeInTheDocument()
  })

  it('diz para onde o comprovante está indo, quando sabe', () => {
    montar({ kind: 'approved' }, { customerEmail: 'marina.y@email.com' })

    expect(screen.getByText('marina.y@email.com')).toBeInTheDocument()
  })

  it('sem e-mail, NÃO promete comprovante para endereço nenhum', () => {
    montar({ kind: 'approved' })

    expect(screen.queryByText(/comprovante está indo/)).not.toBeInTheDocument()
    expect(screen.getByText(/Abrindo os detalhes do seu pedido/)).toBeInTheDocument()
  })

  it('o caminho manual para o pedido continua visível', () => {
    // A metade que a AC cobra: se a navegação falhar, a pessoa não pode ficar presa numa tela que
    // diz que deu certo e não vai a lugar nenhum.
    montar({ kind: 'approved' })

    expect(screen.getByRole('link', { name: 'Ver os detalhes do pedido' })).toHaveAttribute(
      'href',
      '/pedido/abc-123',
    )
  })
})

describe('PixSurface — o que vale nos quatro estados', () => {
  const todos: [string, PixState][] = [
    ['pronto', pronto()],
    ['expirado', { kind: 'expired' }],
    ['falha', { kind: 'failed', message: 'O banco não respondeu a tempo.' }],
    ['confirmado', { kind: 'approved' }],
  ]

  it.each(todos)('%s: o caminho manual para o pedido está na tela', (_nome, state) => {
    montar(state)

    expect(screen.getByRole('link', { name: 'Ver os detalhes do pedido' })).toHaveAttribute(
      'href',
      '/pedido/abc-123',
    )
  })

  it.each(todos)('%s: no máximo UMA pílula cheia (DESIGN.md §8)', (_nome, state) => {
    const { container } = montar(state)

    expect(pilhasCheias(container).length).toBeLessThanOrEqual(1)
  })

  it.each([
    ['pronto', pronto(), 'Copiar código'],
    ['expirado', { kind: 'expired' } as PixState, 'Gerar um código novo'],
    ['falha', { kind: 'failed', message: 'x' } as PixState, 'Tentar gerar o código de novo'],
  ])('%s: a pílula cheia é a ação principal daquele estado', (_nome, state, rotulo) => {
    const { container } = montar(state)
    const cheias = pilhasCheias(container)

    expect(cheias).toHaveLength(1)
    expect(cheias[0]).toHaveTextContent(rotulo as string)
  })

  it('confirmado NÃO tem pílula cheia — o board `58 D` não desenha botão nenhum', () => {
    // Declarado em vez de escondido: a única saída ali é o link de texto, e a tela avança sozinha.
    const { container } = montar({ kind: 'approved' })

    expect(pilhasCheias(container)).toHaveLength(0)
    expect(screen.getByRole('link', { name: 'Ver os detalhes do pedido' })).toBeInTheDocument()
  })

  it.each(todos)('%s: diz o valor a pagar', (_nome, state) => {
    montar(state)

    expect(screen.getByText('R$ 46,55')).toBeInTheDocument()
  })

  it.each(todos)('%s: nenhuma classe de cor fora da paleta', (_nome, state) => {
    const { container } = montar(state)

    expect(container.innerHTML).not.toMatch(
      /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/,
    )
  })

  it('a espera (`generating`) não é desenhada aqui — quem a desenha é a PaymentProgress', () => {
    const { container } = montar({ kind: 'generating', slow: false })

    expect(container.firstChild).toBeNull()
  })
})
