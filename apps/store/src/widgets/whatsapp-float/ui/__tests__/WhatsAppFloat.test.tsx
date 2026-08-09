import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WhatsAppFloat from '../WhatsAppFloat'

/**
 * `COP-08` — o WhatsApp fala pelo nome que a admin cadastrou.
 *
 * O nome da loja no balão e na mensagem sai de `store_settings.general`, e o fallback é
 * **Uma Estrelinha**. Sem teste, o fallback é a linha mais fácil de esquecer num rebrand: ele só
 * aparece quando a configuração está vazia — que é justamente o estado de um ambiente novo.
 */

const settings = { whatsapp: '', whatsapp_message: '', store_name: '' }

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => settings,
}))

function renderFloat() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <WhatsAppFloat />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  settings.whatsapp = '51986550542'
  settings.whatsapp_message = ''
  settings.store_name = ''
})

describe('WhatsAppFloat — o nome da loja (COP-08)', () => {
  it('usa o `store_name` de store_settings quando ele existe', () => {
    settings.store_name = 'Uma Estrelinha Joias'
    renderFloat()

    fireEvent.click(screen.getByLabelText('Abrir conversa no WhatsApp'))

    expect(screen.getByText('Uma Estrelinha Joias')).toBeInTheDocument()
    const link = screen.getByText('Iniciar conversa').closest('a')!
    expect(decodeURIComponent(link.getAttribute('href')!)).toContain('Uma Estrelinha Joias')
  })

  it('sem `store_name` cadastrado, cai em Uma Estrelinha', () => {
    renderFloat()

    fireEvent.click(screen.getByLabelText('Abrir conversa no WhatsApp'))

    expect(screen.getByText('Uma Estrelinha')).toBeInTheDocument()
    const href = decodeURIComponent(
      screen.getByText('Iniciar conversa').closest('a')!.getAttribute('href')!,
    )
    expect(href).toContain('Uma Estrelinha')
  })

  it('`whatsapp_message` cadastrada vence a mensagem padrão', () => {
    settings.whatsapp_message = 'Oi Adri, quero criar uma joia afetiva'
    renderFloat()

    fireEvent.click(screen.getByLabelText('Abrir conversa no WhatsApp'))

    const href = decodeURIComponent(
      screen.getByText('Iniciar conversa').closest('a')!.getAttribute('href')!,
    )
    expect(href).toContain('Oi Adri, quero criar uma joia afetiva')
  })

  it('sem WhatsApp cadastrado o widget não renderiza nada', () => {
    settings.whatsapp = ''
    const { container } = renderFloat()

    expect(container).toBeEmptyDOMElement()
  })

  it('o convite não usa vocabulário do produto anterior', () => {
    renderFloat()

    fireEvent.click(screen.getByLabelText('Abrir conversa no WhatsApp'))

    expect(screen.queryByText(/botton|pin/i)).not.toBeInTheDocument()
  })
})
