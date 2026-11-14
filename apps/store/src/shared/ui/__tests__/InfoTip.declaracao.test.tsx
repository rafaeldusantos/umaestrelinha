// O que jsdom não mede, o ⓘ declara: o alvo de 44px, a folga de 12px até a borda da caixa, a largura
// do balão e a entrada que respeita "menos movimento". jsdom devolve 0 para toda medida de
// layout, então a régua aqui é a DECLARAÇÃO — as classes por token exato e as props entregues ao
// Radix (o `collisionPadding` não chega ao DOM, por isso o conteúdo é dublado e as props, colhidas).
// A medida é do navegador. Molde de `infoGutter.test.tsx` do painel.

import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }))
vi.mock('@estrelinha/ui/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => {
    h.props.push(props)
    return <div data-testid="balao">{children}</div>
  },
}))

import InfoTip from '../InfoTip'
import { TAP_44 } from '@/shared/lib/touchTarget'

const tokens = (cls: string) => cls.split(/\s+/).filter(Boolean)
const tem = (cls: string, token: string) => tokens(cls).includes(token)

const montar = (extra?: { collisionBoundary?: Element | null }) => {
  h.props = []
  render(
    <InfoTip label="Sobre o frete grátis" {...extra}>
      Vale para pedidos acima de R$ 300.
    </InfoTip>,
  )
  const botao = screen.getByRole('button', { name: 'Sobre o frete grátis' })
  expect(h.props.length).toBeGreaterThan(0) // âncora: o balão foi renderizado
  return { botao, conteudo: h.props[h.props.length - 1] }
}

describe('InfoTip — o que só o navegador mede, declarado', () => {
  it('o botão usa TODOS os tokens de `TAP_44` e não carrega `absolute`', () => {
    const { botao } = montar()
    expect(tokens(TAP_44).length).toBeGreaterThan(3) // âncora: a constante tem o que comparar
    for (const t of tokens(TAP_44)) expect(tem(botao.className, t)).toBe(true)
    expect(tem(botao.className, 'relative')).toBe(true)
    expect(tem(botao.className, 'absolute')).toBe(false)
  })

  it('o disco tem 17px e o "i" é escondido do leitor de tela', () => {
    const { botao } = montar()
    expect(tem(botao.className, 'h-[17px]')).toBe(true)
    expect(tem(botao.className, 'w-[17px]')).toBe(true)
    expect(botao.querySelector('[aria-hidden="true"]')?.textContent).toBe('i')
  })

  it('o balão vai de borda a borda da caixa, a 12px de cada lado: `collisionPadding` 12 e a largura disponível do Radix', () => {
    const { conteudo } = montar()
    const cls = String(conteudo.className)
    expect(conteudo.collisionPadding).toBe(12)
    // A largura disponível é a da caixa de colisão menos o `collisionPadding` dos dois lados (o
    // `shift` do Radix está ligado no eixo principal): na gaveta de 390, 366px.
    expect(tem(cls, 'w-[var(--radix-popper-available-width)]')).toBe(true)
    // Nenhum teto fixo que prenda o balão ao ⓘ.
    expect(tokens(cls).some(t => /^(max-)?w-\[min\(/.test(t) || t === 'w-72')).toBe(false)
  })

  it('o balão recebe o alvo de colisão, quando há', () => {
    const caixa = document.createElement('div')
    const { conteudo } = montar({ collisionBoundary: caixa })
    expect(conteudo.collisionBoundary).toBe(caixa)
  })

  it('o balão é escuro com texto claro, em tokens da marca', () => {
    const { conteudo } = montar()
    const cls = String(conteudo.className)
    expect(tem(cls, 'bg-estrelinha-ink')).toBe(true)
    expect(tem(cls, 'text-estrelinha-on-primary')).toBe(true)
    expect(tem(cls, 'shadow-estrelinha-ink')).toBe(true)
  })

  it('a entrada do balão tem par `motion-reduce:` que desliga a animação', () => {
    const { conteudo } = montar()
    const cls = String(conteudo.className)
    expect(tem(cls, 'duration-150')).toBe(true)
    expect(tem(cls, 'motion-reduce:!animate-none')).toBe(true)
  })

  it('SENSOR: a régua é de token exato', () => {
    expect(tem('before:absolute relative', 'absolute')).toBe(false)
    expect(
      tem('sm:w-[var(--radix-popper-available-width)]', 'w-[var(--radix-popper-available-width)]'),
    ).toBe(false)
    expect(tem('motion-reduce:animate-none', 'motion-reduce:!animate-none')).toBe(false)
  })
})
