import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { settings } = vi.hoisted(() => ({
  settings: { whatsapp: '(51) 99999-9999', whatsapp_message: '', store_name: 'Uma Estrelinha' },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => settings,
}))

import MaterialDrawerWhatsApp from '../MaterialDrawerWhatsApp'

/**
 * A saída para o WhatsApp — as invariantes que o componente **escreve no próprio comentário** e que
 * a primeira entrega não provou.
 *
 * Achado da rodada 2 da verificação independente: o único teste mockava um número sempre válido,
 * então "sem WhatsApp configurado o bloco não renderiza" e o escape da mensagem eram afirmações sem
 * asserção. Com `whatsapp` vazio, a cliente veria um botão verde apontando para
 * `https://wa.me/?text=…` — **no material em que a conversa é obrigatória**, que é o pior lugar
 * possível para um link morto.
 */
describe('MaterialDrawerWhatsApp', () => {
  beforeEach(() => {
    settings.whatsapp = '(51) 99999-9999'
    settings.whatsapp_message = ''
  })

  it('renderiza com número configurado, e os dígitos vão limpos para a URL', () => {
    render(<MaterialDrawerWhatsApp />)
    const href = screen.getByTestId('material-drawer-whatsapp').getAttribute('href') ?? ''

    expect(href.startsWith('https://wa.me/51999999999?text=')).toBe(true)
  })

  it('NÃO renderiza sem WhatsApp configurado', () => {
    settings.whatsapp = ''
    const { container } = render(<MaterialDrawerWhatsApp />)

    expect(container.innerHTML).toBe('')
    expect(screen.queryByTestId('material-drawer-whatsapp')).toBeNull()
  })

  it('NÃO renderiza com número curto demais para ser real', () => {
    // DDD + número no Brasil tem 10 ou 11 dígitos. Um campo preenchido pela metade no painel
    // produziria um link que abre uma conversa com ninguém — pior que botão nenhum.
    settings.whatsapp = '(51) 9999'
    const { container } = render(<MaterialDrawerWhatsApp />)

    expect(container.innerHTML).toBe('')
  })

  it('a mensagem é ESCAPADA — um `&` do painel não corta a URL', () => {
    // `whatsapp_message` é campo editável no painel. Sem `encodeURIComponent`, um "&" na frase
    // encerra o parâmetro `text` e a cliente abre o WhatsApp com metade da mensagem.
    settings.whatsapp_message = 'Olá! Quero falar sobre preparo & quantidade do meu material'
    render(<MaterialDrawerWhatsApp />)
    const href = screen.getByTestId('material-drawer-whatsapp').getAttribute('href') ?? ''

    expect(href).toContain('preparo%20%26%20quantidade')
    expect(href.split('&')).toHaveLength(1)
  })

  it('mensagem em branco cai na frase padrão, e ela também é escapada', () => {
    settings.whatsapp_message = '   '
    render(<MaterialDrawerWhatsApp />)
    const href = screen.getByTestId('material-drawer-whatsapp').getAttribute('href') ?? ''

    expect(href).toContain('text=')
    expect(href).not.toContain('text=&')
    // A frase padrão nomeia o caso de uso, e não pode virar texto genérico sem ninguém notar.
    expect(decodeURIComponent(href.split('text=')[1])).toContain('não está na lista')
  })

  it('o rótulo sai em `ink` sobre o verde da marca, não em branco', () => {
    // Branco sobre `#25D366` mede 2,6:1. `DESIGN.md` §2 reserva esse par ao botão do WhatsApp, e o
    // ajuste é o mesmo que o selo numerado das fichas do guia precisou.
    render(<MaterialDrawerWhatsApp />)
    const classes = (
      screen.getByTestId('material-drawer-whatsapp').getAttribute('class') ?? ''
    ).split(/\s+/)

    expect(classes).toContain('bg-estrelinha-whatsapp')
    expect(classes).toContain('text-estrelinha-ink')
    expect(classes).not.toContain('text-white')
  })
})
