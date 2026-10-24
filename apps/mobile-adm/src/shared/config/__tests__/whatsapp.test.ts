// Feature `75` · T25 — a cor do lembrete no WhatsApp passa de 4,5:1 (WCAG 1.4.3). A régua CALCULA a
// razão, e o sensor prova que o verde claro da marca reprovaria.
import { describe, expect, it } from 'vitest'

import { WHATSAPP_FUNDO, WHATSAPP_TEXTO } from '../whatsapp'

const canal = (v: number) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminancia = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}
const razao = (a: string, b: string) => {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

describe('a cor do lembrete no WhatsApp (MAA-17)', () => {
  it('o texto sobre o fundo passa de 4,5:1', () => {
    expect(razao(WHATSAPP_TEXTO, WHATSAPP_FUNDO)).toBeGreaterThanOrEqual(4.5)
  })

  it('SENSOR: o verde claro da marca (#25D366) com texto branco reprovaria', () => {
    expect(razao('#FFFFFF', '#25D366')).toBeLessThan(4.5)
  })
})
