import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CampaignBand from '../CampaignBand'
import CampaignBadgeInline from '../CampaignBadgeInline'

// O selo da campanha nas duas formas: a faixa do pé da foto (30 px) e a forma em linha (26 px).
// As cores vêm da campanha e são usadas CRUZADAS: o texto na cor de destaque sobre a faixa, e o
// percentual na cor da faixa sobre o destaque.

const BLACK_FRIDAY = { badge_text: 'Black Friday', band_color: '#161514', accent_color: '#C2A063' }
const DIA_DAS_MAES = { badge_text: 'Dia das Mães', band_color: '#6E2433', accent_color: '#F6DCD8' }

// jsdom normaliza a cor do `style` para `rgb(...)`.
const RGB = {
  '#161514': 'rgb(22, 21, 20)',
  '#C2A063': 'rgb(194, 160, 99)',
  '#6E2433': 'rgb(110, 36, 51)',
  '#F6DCD8': 'rgb(246, 220, 216)',
} as const

describe.each([
  ['a faixa do cartão', CampaignBand],
  ['o selo em linha', CampaignBadgeInline],
])('%s', (_nome, Selo) => {
  it('diz o texto da campanha e o percentual com o sinal de menos tipográfico', () => {
    render(<Selo campaign={BLACK_FRIDAY} percent={20} />)
    const selo = screen.getByRole('img', { name: 'Black Friday, 20% de desconto' })
    expect(selo.textContent).toBe('Black Friday−20%')
  })

  it('usa as duas cores da campanha cruzadas', () => {
    render(<Selo campaign={BLACK_FRIDAY} percent={20} />)
    const texto = screen.getByText('Black Friday')
    const pct = screen.getByText('−20%')
    expect(texto.style.backgroundColor).toBe(RGB['#161514'])
    expect(texto.style.color).toBe(RGB['#C2A063'])
    expect(pct.style.backgroundColor).toBe(RGB['#C2A063'])
    expect(pct.style.color).toBe(RGB['#161514'])
  })

  it('outra campanha ("Dia das Mães") mostra o texto e as cores dela, sem mudança de código', () => {
    render(<Selo campaign={DIA_DAS_MAES} percent={15} />)
    expect(screen.getByRole('img', { name: 'Dia das Mães, 15% de desconto' })).toBeInTheDocument()
    const texto = screen.getByText('Dia das Mães')
    expect(texto.style.backgroundColor).toBe(RGB['#6E2433'])
    expect(texto.style.color).toBe(RGB['#F6DCD8'])
    expect(screen.getByText('−15%').style.backgroundColor).toBe(RGB['#F6DCD8'])
  })

  it('o texto sai em maiúsculas, sem quebra e sem reticências; o percentual nunca encolhe', () => {
    render(<Selo campaign={BLACK_FRIDAY} percent={20} />)
    const texto = screen.getByText('Black Friday')
    expect(texto.className.split(/\s+/)).toEqual(expect.arrayContaining(['uppercase', 'whitespace-nowrap']))
    expect(texto.className).not.toMatch(/(?:^|\s)(truncate|text-ellipsis)(?![-\w])/)
    expect(screen.getByText('−20%').className.split(/\s+/)).toContain('shrink-0')
  })
})

describe('as medidas de cada forma', () => {
  it('a faixa mede 30 px e fica colada no pé da foto, ponta a ponta', () => {
    render(<CampaignBand campaign={BLACK_FRIDAY} percent={20} />)
    const classes = screen.getByRole('img').className.split(/\s+/)
    expect(classes).toEqual(expect.arrayContaining(['absolute', 'inset-x-0', 'bottom-0', 'h-[30px]']))
    expect(screen.getByText('Black Friday').className.split(/\s+/)).toEqual(
      expect.arrayContaining(['text-[11px]', 'font-bold', 'tracking-[0.08em]', 'pl-[12px]', 'pr-[8px]']),
    )
    expect(screen.getByText('−20%').className.split(/\s+/)).toEqual(
      expect.arrayContaining(['text-[13px]', 'px-[11px]']),
    )
  })

  it('o selo em linha mede 26 px, com cantos de 6 px; texto com folga 10/9 px, percentual 12 px com folga 9 px', () => {
    render(<CampaignBadgeInline campaign={BLACK_FRIDAY} percent={20} />)
    const classes = screen.getByRole('img').className.split(/\s+/)
    expect(classes).toEqual(expect.arrayContaining(['h-[26px]', 'rounded-[6px]']))
    const texto = screen.getByText('Black Friday').className.split(/\s+/)
    expect(texto).toEqual(
      expect.arrayContaining(['text-[11px]', 'font-bold', 'tracking-[0.08em]', 'pl-[10px]', 'pr-[9px]']),
    )
    expect(texto).not.toContain('pl-[12px]')
    const pct = screen.getByText('−20%').className.split(/\s+/)
    expect(pct).toEqual(expect.arrayContaining(['text-[12px]', 'font-bold', 'px-[9px]']))
    expect(pct).not.toContain('text-[13px]')
  })
})
