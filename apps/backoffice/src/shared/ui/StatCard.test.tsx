import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DollarSign } from 'lucide-react'
import StatCard from './StatCard'

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Pedidos Hoje" value={42} />)
    expect(screen.getByText('Pedidos Hoje')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders a string value', () => {
    render(<StatCard label="Faturamento" value="R$ 1.234,00" />)
    expect(screen.getByText('R$ 1.234,00')).toBeInTheDocument()
  })

  it('renders the subtitle only when provided', () => {
    const { rerender } = render(<StatCard label="Taxa" value="10%" />)
    expect(screen.queryByText('3 recuperados')).not.toBeInTheDocument()
    rerender(<StatCard label="Taxa" value="10%" subtitle="3 recuperados" />)
    expect(screen.getByText('3 recuperados')).toBeInTheDocument()
  })

  it('renders an icon when provided', () => {
    const { container } = render(<StatCard label="Fat." value="R$ 0" icon={DollarSign} accent="text-emerald-500" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

// Feature 71 · task 24 · `VIS-05` (esqueleto por card) e `VIS-08` (lugar do ⓘ). As props novas são
// ADITIVAS e OPCIONAIS: os outros consumidores (`AdminDashboard`, Cupons, Promoções, Carrinhos) não
// passam nada e não podem mudar — `AdminPromotionsPage.test.tsx` e `AdminCouponsPage.test.tsx` leem
// o valor como "o segundo `<p>` do cartão".
describe('StatCard — carregando e ⓘ (feature 71)', () => {
  /**
   * O desenho de ANTES, copiado de `StatCard.tsx` como estava até a feature 70. A única diferença é a
   * desarmação de movimento (`motion-reduce:transition-none`), exigida pelo guarda
   * `animacaoRespeitaMovimento` ao lado da transição que já existia.
   */
  const ANTES = ({ label, value, icon: Icon, accent, subtitle }: {
    label: string; value: string | number; icon?: typeof DollarSign; accent?: string; subtitle?: string
  }) => (
    <div className="bg-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-colors motion-reduce:transition-none">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        {Icon && <Icon className={['w-4 h-4 shrink-0', accent ?? 'text-muted-foreground'].join(' ')} />}
      </div>
      <p className="font-heading text-2xl font-bold text-foreground mt-2">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )

  it('sem as props novas, a saída é IDÊNTICA à de antes (com e sem ícone e subtítulo)', () => {
    const casos = [
      { label: 'Fat. do Mês', value: 'R$ 1.234,00' },
      { label: 'Pendentes', value: 3, icon: DollarSign, accent: 'text-amber-500', subtitle: 'desde ontem' },
    ]
    for (const props of casos) {
      const novo = render(<StatCard {...props} />)
      const antigo = render(<ANTES {...props} />)
      expect(novo.container.innerHTML).toBe(antigo.container.innerHTML)
      novo.unmount()
      antigo.unmount()
    }
  })

  it('carregando: nenhum `<p>` de valor e nenhum número no card — um esqueleto no lugar', () => {
    const { container } = render(<StatCard label="Visitas únicas" value={0} subtitle="x" loading />)
    const ps = Array.from(container.querySelectorAll('p'))
    // Só o rótulo continua `<p>`: o valor e o subtítulo saem.
    expect(ps.map(p => p.textContent)).toEqual(['Visitas únicas'])
    expect(container.textContent).toBe('Visitas únicas')
    const esqueleto = container.querySelector('[data-skeleton="valor"]')
    expect(esqueleto).not.toBeNull()
    expect(esqueleto!.tagName).toBe('DIV')
    expect(esqueleto!.getAttribute('aria-hidden')).toBe('true')
  })

  it('o esqueleto pulsa, e desliga o pulso para quem pediu menos movimento — na MESMA classe', () => {
    const { container } = render(<StatCard label="Vendas" value={0} loading />)
    const classes = (container.querySelector('[data-skeleton="valor"]')!.getAttribute('class') ?? '').split(/\s+/)
    expect(classes).toContain('animate-pulse')
    expect(classes).toContain('motion-reduce:animate-none')
  })

  it('`info` vai para o CABEÇALHO, ao lado do rótulo, antes do ícone', () => {
    const { container } = render(
      <StatCard
        label="Visitas únicas"
        value="12"
        icon={DollarSign}
        info={<button type="button" aria-label="O que conta">i</button>}
      />,
    )
    const cabecalho = container.firstElementChild!.firstElementChild!
    const botao = screen.getByRole('button', { name: 'O que conta' })
    expect(cabecalho.contains(botao)).toBe(true)
    expect(cabecalho.querySelector('p')!.textContent).toBe('Visitas únicas')
    // O ícone continua no cabeçalho, depois do ⓘ.
    const svg = cabecalho.querySelector('svg')!
    expect(botao.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // E o valor continua sendo o segundo `<p>` do cartão.
    expect(container.querySelectorAll('p')[1].textContent).toBe('12')
  })

  it('com `info`, o ícone decorativo não recebe toque — senão ele cobre a borda do alvo de 44 do ⓘ', () => {
    // Medido em navegador (prova-navegador.md da feature 71): o alvo do ⓘ é 44×44 por margem
    // negativa, o `gap-2` é 8px, e o ícone ficava 6px dentro da borda direita do alvo. Um toque ali
    // caía no `<svg>` e o Popover não abria. jsdom não mede layout; o que se trava aqui é a classe,
    // por token exato (`pointer-events-none` e não um prefixo dele).
    const { container } = render(
      <StatCard
        label="Visitas únicas"
        value="12"
        icon={DollarSign}
        info={<button type="button" aria-label="O que conta">i</button>}
      />,
    )
    const svg = container.firstElementChild!.firstElementChild!.querySelector('svg')!
    const classes = (svg.getAttribute('class') ?? '').split(/\s+/)
    expect(classes).toContain('pointer-events-none')
  })

  it('`value` aceita conteúdo de frase (span), e continua dentro do `<p>` do valor', () => {
    const { container } = render(
      <StatCard
        label="Ticket médio"
        value={<><span aria-hidden="true">—</span><span className="sr-only">sem vendas no período</span></>}
      />,
    )
    const valor = container.querySelectorAll('p')[1]
    expect(valor.textContent).toBe('—sem vendas no período')
    expect(valor.querySelectorAll('span')).toHaveLength(2)
  })
})
