// Feature `73` · T12 · `MAI-19`, `MAI-31` — o gesto de puxar para atualizar.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PullToRefresh, { ATUALIZANDO, LIMIAR_DO_PUXAR } from '../PullToRefresh'

const puxar = (alvo: HTMLElement, ate: number) => {
  fireEvent.touchStart(alvo, { touches: [{ clientY: 100 }] })
  fireEvent.touchMove(alvo, { touches: [{ clientY: 100 + ate / 2 }] })
  fireEvent.touchMove(alvo, { touches: [{ clientY: 100 + ate }] })
  fireEvent.touchEnd(alvo, { touches: [] })
}

const rolarPara = (y: number) => Object.defineProperty(window, 'scrollY', { value: y, configurable: true })

const montar = (onRefresh: () => Promise<unknown>) => {
  render(
    <PullToRefresh onRefresh={onRefresh}>
      <p>conteúdo</p>
    </PullToRefresh>,
  )
  return screen.getByText('conteúdo')
}

/** Uma promessa que o teste resolve ou rejeita quando quiser. */
const controlada = () => {
  let resolver = () => {}
  let rejeitar = () => {}
  const p = new Promise<void>((res, rej) => {
    resolver = res
    rejeitar = () => rej(new Error('falhou'))
  })
  return { p, resolver, rejeitar }
}

afterEach(() => rolarPara(0))

describe('PullToRefresh', () => {
  it('no topo, acima do limiar: `onRefresh` UMA vez', async () => {
    const onRefresh = vi.fn(async () => {})
    const alvo = montar(onRefresh)
    await act(async () => puxar(alvo, LIMIAR_DO_PUXAR + 10))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('o limiar é 64 px: 63 não chama, 64 chama', async () => {
    expect(LIMIAR_DO_PUXAR).toBe(64)
    const onRefresh = vi.fn(async () => {})
    const alvo = montar(onRefresh)
    await act(async () => puxar(alvo, 63))
    expect(onRefresh).not.toHaveBeenCalled()
    await act(async () => puxar(alvo, 64))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('fora do topo (página rolada): não dispara', async () => {
    rolarPara(120)
    const onRefresh = vi.fn(async () => {})
    const alvo = montar(onRefresh)
    await act(async () => puxar(alvo, 200))
    expect(onRefresh).not.toHaveBeenCalled()
  })

  // Fecho r3 (T1): a borda do "topo" é 0, não uma folga. Rolada 1 px, a página já não é topo.
  it('rolada 1 px (`scrollY = 1`): não dispara — o topo é exatamente 0', async () => {
    rolarPara(1)
    const onRefresh = vi.fn(async () => {})
    const alvo = montar(onRefresh)
    await act(async () => puxar(alvo, 200))
    expect(onRefresh).not.toHaveBeenCalled()
  })

  // Fecho r3 (T2): só o dedo DESCENDO conta. Subir 100 px no topo é rolar, não puxar.
  it('dedo SUBINDO (`clientY` de 200 para 100) no topo: não dispara', async () => {
    const onRefresh = vi.fn(async () => {})
    const alvo = montar(onRefresh)
    await act(async () => {
      fireEvent.touchStart(alvo, { touches: [{ clientY: 200 }] })
      fireEvent.touchMove(alvo, { touches: [{ clientY: 150 }] })
      fireEvent.touchMove(alvo, { touches: [{ clientY: 100 }] })
      fireEvent.touchEnd(alvo, { touches: [] })
    })
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('indicador `role="status"` "Atualizando…" enquanto a promessa está no ar; some ao terminar', async () => {
    const c = controlada()
    const alvo = montar(() => c.p)
    expect(screen.queryByRole('status')).toBeNull()
    await act(async () => puxar(alvo, 100))
    expect(screen.getByRole('status')).toHaveTextContent(ATUALIZANDO)
    expect(ATUALIZANDO).toBe('Atualizando…')
    await act(async () => c.resolver())
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('na FALHA o indicador também some — e a rejeição não vaza', async () => {
    const c = controlada()
    const alvo = montar(() => c.p)
    await act(async () => puxar(alvo, 100))
    expect(screen.getByRole('status')).toBeInTheDocument()
    await act(async () => c.rejeitar())
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('um segundo gesto com a releitura no ar não chama de novo', async () => {
    const c = controlada()
    const onRefresh = vi.fn(() => c.p)
    const alvo = montar(onRefresh)
    await act(async () => puxar(alvo, 100))
    await act(async () => puxar(alvo, 100))
    expect(onRefresh).toHaveBeenCalledTimes(1)
    await act(async () => c.resolver())
    await act(async () => puxar(alvo, 100))
    expect(onRefresh).toHaveBeenCalledTimes(2)
  })

  it('o giro do indicador tem `motion-reduce:animate-none` no mesmo nó (`MAI-31`)', async () => {
    const c = controlada()
    const alvo = montar(() => c.p)
    await act(async () => puxar(alvo, 100))
    const animados = screen.getByRole('status').querySelectorAll('[class*="animate-"]')
    expect(animados.length).toBeGreaterThan(0)
    for (const n of animados) {
      const classes = (n.getAttribute('class') ?? '').split(/\s+/)
      expect(classes).toContain('motion-reduce:animate-none')
    }
    await act(async () => c.resolver())
  })
})

describe('o `body` do app contém o rolar além do topo', () => {
  it('`overscroll-behavior-y: contain` na regra do `body` de `app/app.css`', () => {
    const css = readFileSync(resolve(__dirname, '../../../app/app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const body = /(?:^|\n)body\s*\{([^}]*)\}/.exec(css)
    expect(body).not.toBeNull()
    expect(body![1]).toMatch(/overscroll-behavior-y:\s*contain\s*;/)
  })
})
