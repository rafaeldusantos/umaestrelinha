// Feature 72, T07 — a splash desenhada (`MAF-05`, `MAF-07`).
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Splash from '../ui/Splash'
import tailwindConfig from '../../../../tailwind.config'

/** Token exato: `w-[300px]` não pode ser satisfeito por `max-w-[300px]` nem por `w-[3000px]`. */
const temToken = (el: Element, token: string) => el.getAttribute('class')!.split(/\s+/).includes(token)

/**
 * A régua do movimento: todo token `animate-*` (ou `transition*`) de um nó exige, no MESMO nó, um
 * `motion-reduce:` que desligue movimento. Recebe a lista de classes para os sensores a chamarem.
 */
const movimentoSemPar = (classes: string[]): string[] => {
  const moventes = classes.filter((c) => /^(animate-(?!none)|transition)/.test(c))
  if (moventes.length === 0) return []
  const desliga = classes.some((c) => c === 'motion-reduce:animate-none' || c === 'motion-reduce:transition-none')
  return desliga ? [] : moventes
}

describe('Splash — o desenho (MAF-05)', () => {
  it('o lockup é SVG INLINE, nunca <img> — a splash não tem estado de carregamento', () => {
    const { container } = render(<Splash />)
    const lockup = screen.getByTestId('splash-lockup')
    expect(lockup.querySelector('svg')).not.toBeNull()
    expect(lockup.querySelector('svg')!.getAttribute('aria-label')).toBe('Uma Estrelinha')
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('o lockup sai a 300 px (a exceção declarada à escada da marca)', () => {
    render(<Splash />)
    expect(temToken(screen.getByTestId('splash-lockup'), 'w-[300px]')).toBe(true)
  })

  it('o fundo é primary-strong, cobrindo a tela', () => {
    render(<Splash />)
    const tela = screen.getByRole('status')
    expect(temToken(tela, 'bg-estrelinha-primary-strong')).toBe(true)
    expect(temToken(tela, 'fixed')).toBe(true)
    expect(temToken(tela, 'inset-0')).toBe(true)
  })

  it('a barra tem 120 px, trilho on-primary com opacidade e progresso accent', () => {
    render(<Splash />)
    const trilho = screen.getByTestId('splash-trilho')
    expect(temToken(trilho, 'w-[120px]')).toBe(true)
    expect(temToken(trilho, 'bg-estrelinha-on-primary/20')).toBe(true)
    expect(temToken(screen.getByTestId('splash-progresso'), 'bg-estrelinha-accent')).toBe(true)
  })

  it('o rótulo "Ateliê · painel" em on-primary, 11px, 600, .1em, maiúsculas', () => {
    render(<Splash />)
    const rotulo = screen.getByText('Ateliê · painel')
    for (const t of ['text-estrelinha-on-primary', 'text-[11px]', 'font-semibold', 'tracking-[.1em]', 'uppercase']) {
      expect(temToken(rotulo, t)).toBe(true)
    }
    // `accent` nunca é texto — ele só preenche a barra.
    expect(rotulo.getAttribute('class')).not.toMatch(/text-estrelinha-accent/)
  })
})

describe('Splash — movimento reduzido (MAF-07)', () => {
  it('o lockup e a barra se movem, e cada um carrega o par motion-reduce:', () => {
    const { container } = render(<Splash />)
    const nos = [...container.querySelectorAll('[class]')]
    const moventes = nos.filter((n) => n.getAttribute('class')!.split(/\s+/).some((c) => /^animate-(?!none)/.test(c)))
    // Âncora: os dois movimentos existem (sem ela, a régua abaixo aprovaria uma splash vazia).
    expect(moventes.map((n) => n.getAttribute('data-testid'))).toEqual(['splash-lockup', 'splash-progresso'])
    for (const n of nos) expect(movimentoSemPar(n.getAttribute('class')!.split(/\s+/))).toEqual([])
  })

  it('o estado final das animações é o que o movimento reduzido mostra: lockup no lugar, barra cheia', () => {
    const kf = tailwindConfig.theme.extend.keyframes
    // Sem deslocamento e sem opacidade: o lockup nunca nasce invisível.
    expect(kf['splash-lockup'].to.transform).toBe('translateY(0)')
    expect(JSON.stringify(kf['splash-lockup'])).not.toMatch(/opacity/)
    // A barra sem animação é `w-full` com escala 1 — cheia e parada.
    expect(temToken(render(<Splash />).getByTestId('splash-progresso'), 'w-full')).toBe(true)
  })

  it('SENSOR — a régua acusa animação sem par e absolve com o par', () => {
    expect(movimentoSemPar(['animate-splash-lockup'])).toEqual(['animate-splash-lockup'])
    expect(movimentoSemPar(['animate-splash-lockup', 'motion-reduce:opacity-100'])).toEqual(['animate-splash-lockup'])
    expect(movimentoSemPar(['animate-splash-lockup', 'motion-reduce:animate-none'])).toEqual([])
    expect(movimentoSemPar(['transition-colors'])).toEqual(['transition-colors'])
  })
})
