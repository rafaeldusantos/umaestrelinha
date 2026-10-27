// Feature 83 · `LAV-04` — as frases do cartão "Visitas hoje".
import { describe, expect, it } from 'vitest'

import {
  VISITS_TODAY_HINT,
  VISITS_TODAY_TITLE,
  visitsTodayFailedLabel,
  visitsTodayLabel,
  visitsTodayLoadingLabel,
} from '../card.ts'

describe('o cartão "Visitas hoje" (LAV-04)', () => {
  it('o eyebrow e a linha de apoio', () => {
    expect(VISITS_TODAY_TITLE).toBe('Visitas hoje')
    expect(VISITS_TODAY_HINT).toBe('Hoje, ontem e a semana, por horário')
  })

  it('o nome acessível com dado, com o número em pt-BR', () => {
    expect(visitsTodayLabel(41)).toBe('Visitas hoje, 41. Abrir loja ao vivo')
    expect(visitsTodayLabel(1240)).toBe('Visitas hoje, 1.240. Abrir loja ao vivo')
    expect(visitsTodayLabel(0)).toBe('Visitas hoje, 0. Abrir loja ao vivo')
  })

  it('carregando abre a tela; a falha relê — o nome diz o que o toque faz', () => {
    expect(visitsTodayLoadingLabel).toBe('Visitas hoje, carregando. Abrir loja ao vivo')
    expect(visitsTodayFailedLabel).toBe('Visitas hoje: não consegui carregar. Tentar de novo')
  })
})
