import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
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

function renderFloat(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
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

/**
 * `URL-01` — o caminho do produto virou `/produtos/:slug` (`AD-018`).
 *
 * O FAB é `bottom-20` com 56px de lado: na página do produto ele nasceria exatamente sobre o botão
 * de favoritos da barra de compra. A regra de esconder existia com o prefixo antigo, e um prefixo
 * esquecido a desligaria em silêncio — o widget voltaria a aparecer, sobreposto.
 */
describe('WhatsAppFloat — some na página do produto, pelo caminho novo', () => {
  it('não renderiza em `/produtos/:slug`', () => {
    const { container } = renderFloat('/produtos/joia-de-leite-materno')

    expect(container).toBeEmptyDOMElement()
  })

  it('continua renderizando numa categoria de dois segmentos', () => {
    renderFloat('/joias-afetivas/joia-de-leite-materno')

    expect(screen.getByLabelText('Abrir conversa no WhatsApp')).toBeInTheDocument()
  })
})

/**
 * **A bolha não muda a caixa do contêiner** — `PRF-18`.
 *
 * O teaser entra sozinho 2,2 s depois da montagem. Em fluxo, dentro de um `flex-col` ancorado por
 * `bottom-20`, entrar significava crescer a caixa do contêiner **para cima** — e o Chrome registra
 * isso como deslocamento do próprio contêiner. O Lighthouse de 2026-09-06 mediu 0,0215 ali.
 *
 * Não entrou no CLS total daquela execução (0,244 é o rodapé, e as duas caíram em janelas de sessão
 * diferentes) — mas entraria em qualquer página onde as duas coincidissem, e o custo de evitá-lo é
 * uma classe.
 *
 * jsdom devolve 0 para toda medida de layout, então o que se assere é a **forma**: a bolha fora do
 * fluxo, ancorada acima do botão. A prova de que não há salto é de navegador.
 */
describe('WhatsAppFloat — a bolha não desloca a caixa (PRF-18)', () => {
  const comBolhaVisivel = (fn: (teaser: HTMLElement) => void) => {
    vi.useFakeTimers()
    try {
      renderFloat()
      act(() => {
        vi.advanceTimersByTime(2500)
      })
      fn(screen.getByLabelText('Abrir mensagem'))
    } finally {
      vi.useRealTimers()
    }
  }

  it('a bolha entra FORA DO FLUXO, ancorada acima do botão', () => {
    comBolhaVisivel((teaser) => {
      expect(teaser.className).toContain('absolute')
      expect(teaser.className).toContain('bottom-full')
    })
  })

  it('o vão de 12px vem de `mb-3`, não do `gap` do flex — filho absoluto não participa do gap', () => {
    comBolhaVisivel((teaser) => {
      expect(teaser.className).toContain('mb-3')
    })
  })

  it('o contêiner continua sendo o bloco de contenção — `fixed`, sem `relative` redundante', () => {
    comBolhaVisivel((teaser) => {
      const container = teaser.parentElement!
      expect(container.className).toContain('fixed')
    })
  })
})
