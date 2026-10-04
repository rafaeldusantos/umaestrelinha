import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrderHelp from '../OrderHelp'
import { orderHelpMessage } from '../../lib/orderHelpMessage'

// Feature 59 — `DET-12`: o bloco "Alguma dúvida sobre este pedido?" com "Conversar", que abre o
// WhatsApp da loja com o número do pedido na mensagem; sem número configurado, o bloco some.

const { settings } = vi.hoisted(() => ({
  settings: {
    current: { whatsapp: '51998765432', store_name: 'Uma Estrelinha' } as Record<string, string>,
  },
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => settings.current,
}))

beforeEach(() => {
  settings.current = { whatsapp: '51998765432', store_name: 'Uma Estrelinha' }
})

describe('OrderHelp — a ajuda do pedido (DET-12)', () => {
  it('a mensagem leva o número pelo formatador — um prefixo só, nunca colado à mão', () => {
    expect(orderHelpMessage('0244')).toBe('Olá! Tenho uma dúvida sobre o pedido #0244.')
    // O legado e o valor já prefixado saem com UM prefixo — é o formatador, não uma cópia dele.
    expect(orderHelpMessage('NS-169')).toBe('Olá! Tenho uma dúvida sobre o pedido #NS-169.')
    expect(orderHelpMessage('#0244')).toBe('Olá! Tenho uma dúvida sobre o pedido #0244.')
  })

  it('mostra o título e "Conversar" abrindo o WhatsApp da loja com a mensagem pronta', () => {
    render(<OrderHelp orderNumber="0244" />)

    expect(
      screen.getByRole('heading', { name: 'Alguma dúvida sobre este pedido?' }),
    ).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Conversar' })
    const url = new URL(link.getAttribute('href') as string)
    expect(url.origin + url.pathname).toBe('https://wa.me/51998765432')
    expect(url.searchParams.get('text')).toBe('Olá! Tenho uma dúvida sobre o pedido #0244.')
  })

  it('abre em nova aba, com `rel` seguro, e tem o alvo de 44px', () => {
    render(<OrderHelp orderNumber="0244" />)

    const link = screen.getByRole('link', { name: 'Conversar' })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')?.split(' ')).toEqual(
      expect.arrayContaining(['noopener', 'noreferrer']),
    )
    expect(link.className.split(/\s+/)).toContain('min-h-11')
  })

  it.each(['', '519876543', '   '])(
    'número da loja não configurado (%p): o bloco inteiro some',
    (whatsapp) => {
      settings.current = { whatsapp, store_name: 'Uma Estrelinha' }
      const { container } = render(<OrderHelp orderNumber="0244" />)

      expect(container).toBeEmptyDOMElement()
      expect(screen.queryByText('Alguma dúvida sobre este pedido?')).not.toBeInTheDocument()
    },
  )
})
