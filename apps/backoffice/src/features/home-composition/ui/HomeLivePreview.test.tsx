// Feature 25 — o palco (`PRV-14`, `PRV-15`, `PRV-17`).
//
// jsdom não carrega o documento de um iframe, então **o desenho da Home não se mede aqui** — quem o
// mede é `homeComposition.test.tsx`, na loja, que é justamente o ponto da feature: existe um desenho
// só. O que se mede aqui é o quadro: a medida que a loja recebe, a escala, e o que aparece quando
// não há loja configurada.

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeSection } from '@estrelinha/core/home'

const { storeUrl } = vi.hoisted(() => ({ storeUrl: { valor: 'http://localhost:8082' } }))

vi.mock('@/shared/lib/storeOrigin', () => ({
  get STORE_URL() {
    return storeUrl.valor
  },
  storeOrigin: () => (storeUrl.valor ? new URL(storeUrl.valor).origin : null),
}))

import HomeLivePreview from './HomeLivePreview'

const secao = (id: string): HomeSection => ({
  id,
  type: 'hero',
  position: 0,
  active: true,
  config: {},
})

const montar = (sections: HomeSection[] = [secao('a')]) =>
  render(<HomeLivePreview sections={sections} highlightId={null} onSelect={vi.fn()} />)

const quadro = () => document.querySelector('iframe')

beforeEach(() => {
  storeUrl.valor = 'http://localhost:8082'
})

describe('PRV-14 — o alternador abre no celular', () => {
  it('ao montar, Celular está pressionado e o quadro mede 390 × 844', () => {
    montar()

    expect(screen.getByRole('button', { name: 'Celular' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Computador' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(quadro()).toHaveAttribute('width', '390')
    expect(quadro()).toHaveAttribute('height', '844')
  })

  it('Computador troca a medida para 1024 × 768', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Computador' }))

    expect(quadro()).toHaveAttribute('width', '1024')
    expect(quadro()).toHaveAttribute('height', '768')
    expect(quadro()).toHaveAttribute('data-device', 'desktop')
  })

  it('trocar de dispositivo NÃO troca o `src` nem remonta o quadro', async () => {
    montar()
    const antes = quadro()
    const src = antes?.getAttribute('src')

    fireEvent.click(screen.getByRole('button', { name: 'Computador' }))

    expect(quadro()).toBe(antes)
    expect(quadro()?.getAttribute('src')).toBe(src)
  })

  it('a medida vai no atributo, e a redução é por `transform` — encolher o iframe mostraria o layout de celular', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Computador' }))

    const frame = quadro() as HTMLIFrameElement
    expect(frame.getAttribute('width')).toBe('1024')
    expect(frame.style.transform).toContain('scale(')
    expect(frame.style.transformOrigin).toBe('top left')
  })
})

describe('PRV-15 — a barra do palco', () => {
  it('diz a medida e a escala', () => {
    montar()
    expect(screen.getByTestId('metrica-previa')).toHaveTextContent('390 × 844 · 100%')
  })

  it('o `src` é a home em modo prévia', () => {
    montar()
    expect(quadro()).toHaveAttribute('src', 'http://localhost:8082/?preview=1')
  })

  it('recarregar REMONTA o quadro, mantendo o mesmo endereço', async () => {
    montar()
    const antes = quadro()

    fireEvent.click(screen.getByRole('button', { name: 'Recarregar a prévia' }))

    expect(quadro()).not.toBe(antes)
    expect(quadro()).toHaveAttribute('src', 'http://localhost:8082/?preview=1')
  })

  it('o link de nova aba abre a loja SEM o modo prévia', () => {
    montar()
    expect(screen.getByRole('link', { name: 'Abrir a loja em nova aba' })).toHaveAttribute(
      'href',
      'http://localhost:8082/',
    )
  })
})

describe('PRV-17 — sem `VITE_STORE_URL` a ausência é declarada', () => {
  beforeEach(() => {
    storeUrl.valor = ''
  })

  it('nenhum iframe é montado', () => {
    montar()
    expect(quadro()).toBeNull()
  })

  it('o texto nomeia a variável e o arquivo onde ela vai', () => {
    montar()
    const vazio = screen.getByTestId('previa-sem-loja')

    expect(vazio).toHaveTextContent('VITE_STORE_URL')
    expect(vazio).toHaveTextContent('apps/backoffice/.env')
    expect(vazio).toHaveTextContent('http://localhost:8082')
  })

  it('diz que o resto da tela continua funcionando — a prévia não bloqueia a curadoria', () => {
    montar()
    expect(screen.getByTestId('previa-sem-loja')).toHaveTextContent(
      'A lista ao lado continua funcionando',
    )
  })

  it('sem loja não há link de nova aba apontando para lugar nenhum', () => {
    montar()
    expect(screen.queryByRole('link', { name: 'Abrir a loja em nova aba' })).toBeNull()
  })
})
