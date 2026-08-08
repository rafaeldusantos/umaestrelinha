import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { setGuestEmail } from '@/features/abandoned-cart/model/useAbandonedCartTracker'
import { useCheckoutStore } from '../../model/checkoutStore'
import ContactBlock from '../ContactBlock'

// CHK-03: campos do bloco Contato (nome, e-mail, WhatsApp) — CPF vive no bloco 3.
// CHK-04: bloco completo colapsa com resumo + "Alterar"; nenhum botão geleia no bloco.
// CHK-11: `setGuestEmail(email, consent)` preservado do `CustomerStep`.
// FLW-02/FLW-03: `Continuar` só habilita com o bloco válido, e é ele quem fecha o bloco.
// FLW-04/ADR-02: semear de `customers` NÃO suja o bloco — se sujasse, o recorrente redigitaria.

vi.mock('@/features/abandoned-cart/model/useAbandonedCartTracker', () => ({
  setGuestEmail: vi.fn(),
}))

const authState: { customer: { id: string; name: string; email: string; phone?: string } | null } = {
  customer: null,
}
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))

const onEdit = vi.fn()
const onContinue = vi.fn()

const renderOpen = (canContinue = false) =>
  render(
    <ContactBlock
      open
      complete={false}
      onEdit={onEdit}
      onContinue={onContinue}
      canContinue={canContinue}
    />,
  )
const renderCollapsed = () =>
  render(
    <ContactBlock
      open={false}
      complete
      onEdit={onEdit}
      onContinue={onContinue}
      canContinue
    />,
  )

const continuar = () => screen.getByRole('button', { name: 'Continuar' })

beforeEach(() => {
  useCheckoutStore.getState().reset()
  sessionStorage.clear()
  onEdit.mockClear()
  onContinue.mockClear()
  vi.mocked(setGuestEmail).mockClear()
  authState.customer = null
})

describe('ContactBlock — aberto (CHK-03)', () => {
  it('renderiza nome, e-mail, WhatsApp e o checkbox de consentimento', () => {
    renderOpen()

    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('WhatsApp')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('NÃO tem campo de CPF (ele vive no bloco Pagamento)', () => {
    renderOpen()

    expect(screen.queryByLabelText(/cpf/i)).not.toBeInTheDocument()
  })

  it('pré-preenche nome, e-mail e WhatsApp de `customers`', () => {
    authState.customer = { id: 'c1', name: 'Marina Yamashita', email: 'marina@email.com', phone: '11987654321' }
    renderOpen()

    expect(screen.getByLabelText('Nome completo')).toHaveValue('Marina Yamashita')
    expect(screen.getByLabelText('E-mail')).toHaveValue('marina@email.com')
    expect(screen.getByLabelText('WhatsApp')).toHaveValue('11987654321')
  })

  it('digitar grava os três campos no checkoutStore (base de CHK-03)', () => {
    renderOpen()

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Marina' } })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'marina@email.com' } })
    fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: '11987654321' } })

    const contact = useCheckoutStore.getState().contact
    expect(contact.name).toBe('Marina')
    expect(contact.email).toBe('marina@email.com')
    expect(contact.whatsapp).toBe('11987654321')
  })
})

describe('ContactBlock — Continuar (FLW-02, FLW-03)', () => {
  it('bloco inválido deixa o Continuar desabilitado', () => {
    renderOpen(false)

    expect(continuar()).toBeDisabled()
  })

  it('bloco válido habilita o Continuar', () => {
    renderOpen(true)

    expect(continuar()).toBeEnabled()
  })

  it('clicar em Continuar chama onContinue — é a pessoa que fecha o bloco', () => {
    renderOpen(true)

    fireEvent.click(continuar())

    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('Continuar desabilitado não chama onContinue', () => {
    renderOpen(false)

    fireEvent.click(continuar())

    expect(onContinue).not.toHaveBeenCalled()
  })

  // Premissa mobile do projeto: alvo de toque de 44px.
  it('o Continuar tem alvo de toque de 44px', () => {
    renderOpen(true)

    expect(continuar()).toHaveClass('min-h-11')
  })

  it('bloco colapsado não renderiza Continuar', () => {
    renderCollapsed()

    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument()
  })
})

describe('ContactBlock — o que suja o bloco (FLW-01, FLW-04)', () => {
  it('digitar em qualquer campo marca o bloco como sujo', () => {
    renderOpen()

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Marina' } })

    expect(useCheckoutStore.getState().dirty).toEqual(['contact'])
  })

  it('alterar o consentimento também marca o bloco como sujo', () => {
    renderOpen()

    fireEvent.click(screen.getByRole('checkbox'))

    expect(useCheckoutStore.getState().dirty).toEqual(['contact'])
  })

  // ADR-02: é ESTA distinção que faz o cliente recorrente ver o bloco já colapsado. Se a
  // semeadura sujasse, o bloco só fecharia depois de um `Continuar` que ninguém pediu.
  it('semear de `customers` NÃO suja o bloco', () => {
    authState.customer = {
      id: 'c1',
      name: 'Marina Yamashita',
      email: 'marina@email.com',
      phone: '11987654321',
    }
    renderOpen()

    expect(screen.getByLabelText('Nome completo')).toHaveValue('Marina Yamashita')
    expect(useCheckoutStore.getState().dirty).toEqual([])
  })

  it('renderizar o bloco sem interação nenhuma não suja', () => {
    renderOpen()

    expect(useCheckoutStore.getState().dirty).toEqual([])
  })
})

describe('ContactBlock — captação de carrinho abandonado (CHK-11)', () => {
  it('preencher o e-mail chama setGuestEmail com o e-mail e o consentimento atuais', () => {
    renderOpen()

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'marina@email.com' } })

    expect(setGuestEmail).toHaveBeenCalledWith('marina@email.com', false)
  })

  it('alterar o consentimento chama setGuestEmail de novo com o novo valor', () => {
    useCheckoutStore.getState().setContact({ email: 'marina@email.com' })
    renderOpen()
    vi.mocked(setGuestEmail).mockClear()

    fireEvent.click(screen.getByRole('checkbox'))

    expect(setGuestEmail).toHaveBeenCalledWith('marina@email.com', true)
  })

  it('e-mail ainda sem @ não dispara setGuestEmail', () => {
    renderOpen()

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'marina' } })

    expect(setGuestEmail).not.toHaveBeenCalled()
  })
})

describe('ContactBlock — colapsado (CHK-04)', () => {
  it('exibe nome e e-mail numa linha e não renderiza os campos', () => {
    useCheckoutStore.getState().setContact({
      name: 'Marina Yamashita',
      email: 'marina@email.com',
      whatsapp: '11987654321',
    })
    renderCollapsed()

    expect(screen.getByText('Marina Yamashita · marina@email.com')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
  })

  it('a ação "Alterar" chama onEdit', () => {
    renderCollapsed()

    fireEvent.click(screen.getByRole('button', { name: 'Alterar' }))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})

describe('ContactBlock — paleta (CHK-04 / DESIGN.md §8)', () => {
  it('aberto: nenhum elemento com bg-nanita-jam', () => {
    const { container } = renderOpen()

    expect(container.querySelectorAll('[class*="bg-nanita-jam"]')).toHaveLength(0)
  })

  it('colapsado: nenhum elemento com bg-nanita-jam', () => {
    const { container } = renderCollapsed()

    expect(container.querySelectorAll('[class*="bg-nanita-jam"]')).toHaveLength(0)
  })
})
