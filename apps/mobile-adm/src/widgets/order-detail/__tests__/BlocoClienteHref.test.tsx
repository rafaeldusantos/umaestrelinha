// Feature `76` · T06 (`MAC-26`) — o `href` do "WhatsApp" do bloco Cliente passou a vir de
// `whatsappChatUrl` (`core`, ao lado de `normalizeBrPhone`). A SAÍDA não pode mudar: o teste monta o
// `BlocoCliente` REAL com cinco telefones e compara o `href` com uma CÓPIA LITERAL do `whatsappDe` de
// antes (lida do disco no momento da troca — hash em `baseline.md`).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { normalizeBrPhone } from '@estrelinha/core/notifications'
import { detalhe } from '@/test/pedidos'
import BlocoCliente from '../ui/BlocoCliente'

/** CÓPIA LITERAL do que `BlocoCliente.tsx` fazia antes da `76`. */
const whatsappDeAntes = (numero: string) => `https://wa.me/${numero}`
const hrefAntes = (telefone: string | null) => {
  const numero = normalizeBrPhone(telefone)
  return numero ? whatsappDeAntes(numero) : null
}

const hrefDoBloco = (telefone: string | null) => {
  const { container, unmount } = render(
    <MemoryRouter>
      <BlocoCliente pedido={detalhe({ customer_phone: telefone })} />
    </MemoryRouter>,
  )
  const link = Array.from(container.querySelectorAll('a')).find((a) => a.textContent === 'WhatsApp')
  const href = link ? link.getAttribute('href') : null
  unmount()
  return href
}

const TELEFONES: [string, string | null, string | null][] = [
  ['máscara com +55', '+55 (51) 99812-4471', 'https://wa.me/5551998124471'],
  ['só dígitos com 55', '5551998124471', 'https://wa.me/5551998124471'],
  ['fixo com máscara', '(51) 3012-3456', 'https://wa.me/555130123456'],
  ['curto demais', '123', null],
  ['vazio', '', null],
]

describe('BlocoCliente: o href do WhatsApp (MAC-26)', () => {
  it.each(TELEFONES)('%s: o href é o de sempre, escrito por extenso', (_nome, telefone, esperado) => {
    expect(hrefDoBloco(telefone)).toBe(esperado)
    expect(hrefDoBloco(telefone)).toBe(hrefAntes(telefone))
  })

  it('sem telefone (null): sem link', () => {
    expect(hrefDoBloco(null)).toBeNull()
  })

  it('o link nunca carrega mensagem pronta', () => {
    expect(hrefDoBloco('+55 (51) 99812-4471')).not.toContain('?text=')
  })

  it('o bloco chama whatsappChatUrl e não escreve mais o endereço à mão', () => {
    const fonte = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'ui', 'BlocoCliente.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
    expect(fonte).toContain('whatsappChatUrl(')
    expect(fonte).not.toContain('wa.me')
  })
})
