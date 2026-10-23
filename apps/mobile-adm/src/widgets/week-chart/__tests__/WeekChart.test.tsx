// Feature `73` · T15 · `MAI-10` — o gráfico de 7 dias.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { formatPriceWhole } from '@estrelinha/core/formatters'
import { resumo } from '@/test/resumo'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO } from '@/shared/ui/leitura'
import WeekChart from '../ui/WeekChart'

const classes = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)
const comDado = (r = resumo()) => ({ dado: r, falhou: false, tentarDeNovo: vi.fn() })
const barras = () => screen.getAllByTestId('barra')
const alturas = () => screen.getAllByTestId('altura').map((a) => (a as HTMLElement).style.height)

describe('WeekChart — com dado', () => {
  it('7 barras, NA ORDEM DO BANCO: valor em R$ mil com uma casa, dia abreviado, "hoje" na última', () => {
    render(<WeekChart leitura={comDado()} />)
    expect(barras()).toHaveLength(7)
    // 420, 0, 1300, 2650, 359, 0, 1077 — sex, sáb, dom, seg, ter, qua, hoje.
    expect(barras().map((b) => b.textContent)).toEqual([
      '0,4sex', '—sáb', '1,3dom', '2,7seg', '0,4ter', '—qua', '1,1hoje',
    ])
  })

  it('"com ATÉ uma casa" (MAI-10): 1000 ⇒ "1", 1500 ⇒ "1,5", 289 ⇒ "0,3" — o milhar exato não ganha ",0"', () => {
    const r = resumo()
    const valores = [1000, 1500, 289, 0, 0, 0, 0]
    r.semana = r.semana.map((d, i) => ({ ...d, faturamento: valores[i], vendas: valores[i] > 0 ? 1 : 0 }))
    render(<WeekChart leitura={comDado(r)} />)
    expect(barras().slice(0, 3).map((b) => b.textContent)).toEqual(['1sex', '1,5sáb', '0,3dom'])
  })

  it('a barra mais alta é a do maior valor (84 px); proporcional nas outras; piso de 4 px no dia zero', () => {
    render(<WeekChart leitura={comDado()} />)
    // maior = 2650 ⇒ 84. 420 ⇒ 13; 1300 ⇒ 41; 359 ⇒ 11; 1077 ⇒ 34; zeros ⇒ 4.
    expect(alturas()).toEqual(['13px', '4px', '41px', '84px', '11px', '4px', '34px'])
  })

  // Fecho r3 (G1): o piso de 4 px vale também para o dia com venda PEQUENA, não só para o zero —
  // 10 / 2650 × 84 arredonda para 0, e uma venda de verdade não pode sumir do gráfico.
  it('um dia de R$ 10 com o maior em R$ 2.650: barra de 4 px, nunca 0 (MAI-10)', () => {
    const r = resumo()
    r.semana = r.semana.map((d, i) => (i === 1 ? { ...d, faturamento: 10, vendas: 1 } : d))
    expect(Math.round((10 / 2650) * 84)).toBe(0) // âncora: sem o piso, a barra seria 0
    render(<WeekChart leitura={comDado(r)} />)
    expect(alturas()[1]).toBe('4px')
    expect(alturas()[3]).toBe('84px')
  })

  it('só a última barra (hoje) tem a cor de destaque; dia sem venda é `line`, com venda é `primary`', () => {
    render(<WeekChart leitura={comDado()} />)
    const cores = screen.getAllByTestId('altura').map((a) => classes(a).find((c) => c.startsWith('bg-')))
    expect(cores).toEqual([
      'bg-estrelinha-primary', 'bg-estrelinha-line', 'bg-estrelinha-primary', 'bg-estrelinha-primary',
      'bg-estrelinha-primary', 'bg-estrelinha-line', 'bg-estrelinha-accent',
    ])
  })

  it('hoje sem venda: ainda "hoje", com a cor de destaque, `—` e o piso', () => {
    const r = resumo()
    r.semana[6] = { ...r.semana[6], vendas: 0, faturamento: 0 }
    render(<WeekChart leitura={comDado(r)} />)
    const ultima = barras()[6]
    expect(ultima.textContent).toBe('—hoje')
    expect(classes(within(ultima).getByTestId('altura'))).toContain('bg-estrelinha-accent')
    expect((within(ultima).getByTestId('altura') as HTMLElement).style.height).toBe('4px')
  })

  it('semana inteira sem venda: sete pisos de 4 px, sete `—`, total `R$ 0`', () => {
    const r = resumo({ semana: resumo().semana.map((d) => ({ ...d, vendas: 0, faturamento: 0 })) })
    render(<WeekChart leitura={comDado(r)} />)
    expect(alturas()).toEqual(Array(7).fill('4px'))
    expect(barras().every((b) => b.textContent?.startsWith('—'))).toBe(true)
    expect(screen.getByTestId('total-da-semana').textContent).toBe(formatPriceWhole(0))
  })

  it('o total dos 7 dias no cabeçalho, sem centavos (R$ 5.806)', () => {
    render(<WeekChart leitura={comDado()} />)
    expect(screen.getByTestId('total-da-semana').textContent).toBe(formatPriceWhole(5806))
    expect(formatPriceWhole(5806)).toMatch(/^R\$\s5\.806$/)
  })

  it('a legenda', () => {
    render(<WeekChart leitura={comDado()} />)
    expect(screen.getByText('Pedidos pagos, em R$ mil.')).toBeInTheDocument()
  })

  it('cada barra tem nome acessível com o dia e o valor', () => {
    render(<WeekChart leitura={comDado()} />)
    expect(barras()[1]).toHaveAccessibleName('sáb: sem venda')
    expect(barras()[6]).toHaveAccessibleName(/^Hoje: R\$\s1\.077,00$/)
  })
})

describe('WeekChart — sem dado', () => {
  it('carregando: `aria-busy`, nenhuma barra nem total', () => {
    render(<WeekChart leitura={{ dado: undefined, falhou: false, tentarDeNovo: vi.fn() }} />)
    expect(screen.getByRole('region', { name: 'Vendas · 7 dias' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryAllByTestId('barra')).toHaveLength(0)
    expect(screen.queryByTestId('total-da-semana')).toBeNull()
  })

  it('falhou sem dado: a frase e "Tentar de novo"', () => {
    const tentarDeNovo = vi.fn()
    render(<WeekChart leitura={{ dado: undefined, falhou: true, tentarDeNovo }} />)
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    // Fecho r3 (G3/Q1): a falha não se anuncia "ocupada" — `aria-busy` é só do esqueleto (MAI-30).
    expect(screen.getByRole('region', { name: 'Vendas · 7 dias' })).not.toHaveAttribute('aria-busy')
    expect(screen.queryAllByTestId('barra')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: TENTAR_DE_NOVO }))
    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
  })
})
