// Feature 25 — o palco (`PRV-14`, `PRV-15`, `PRV-17`).
//
// jsdom não carrega o documento de um iframe, então **o desenho da Home não se mede aqui** — quem o
// mede é `homeComposition.test.tsx`, na loja, que é justamente o ponto da feature: existe um desenho
// só. O que se mede aqui é o quadro: a medida que a loja recebe, a escala, e o que aparece quando
// não há loja configurada.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

/**
 * Dá ao palco uma medida de verdade.
 *
 * jsdom **não implementa `ResizeObserver`**, então sem isto a caixa do palco fica `{0,0}` e
 * `previewFrame` devolve o piso nos dois modos — a tela cheia e o modo normal imprimiriam o mesmo
 * texto, e qualquer troca da altura do quadro passaria despercebida. O dublê chama o callback na
 * hora do `observe`, que é o que o observador real faz no primeiro quadro.
 */
const comPalcoDe = (caixa: { width: number; height: number }) => {
  class ObservadorFalso {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(alvo: Element) {
      this.callback(
        [{ target: alvo, contentRect: caixa } as unknown as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      )
    }
    unobserve() {}
    disconnect() {}
  }
  // Atribuição direta, e não `vi.stubGlobal`: o setup do workspace já define `ResizeObserver` como
  // propriedade não reconfigurável, e o stub do vitest tenta redefini-la.
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ObservadorFalso
}

const observadorOriginal = (globalThis as { ResizeObserver?: unknown }).ResizeObserver

beforeEach(() => {
  storeUrl.valor = 'http://localhost:8082'
})

afterEach(() => {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = observadorOriginal
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

  it('FOCO-15: sem loja NÃO se oferece tela cheia — não há o que ampliar', () => {
    montar()
    expect(screen.queryByRole('button', { name: 'Tela cheia' })).toBeNull()
  })
})

/**
 * A tela cheia — FOCO-15, 19, 20, 21 (feature 47).
 *
 * jsdom devolve 0 para toda medida de layout e não implementa `ResizeObserver`, então **a escala de
 * 100% não se mede aqui** — quem a mede é `previewFrame`, em `core`, com caixas sintéticas. O que
 * se prova aqui é o **fio**: o botão alterna o modo, o modo chega à `<section>`, a métrica sai de
 * `previewFrame`, e o `<iframe>` **não remonta** em transição nenhuma.
 */
describe('HomeLivePreview — a tela cheia', () => {
  const palco = () => screen.getByTestId('palco-previa')
  const entrar = () => fireEvent.click(screen.getByRole('button', { name: 'Tela cheia' }))
  const sair = () => fireEvent.click(screen.getByRole('button', { name: 'Sair da tela cheia' }))

  it('FOCO-15: o controle existe, rotulado, na barra do palco', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Tela cheia' })).toBeInTheDocument()
  })

  it('acionar o controle aplica o modo na `<section>` do palco', () => {
    montar()
    expect(palco()).not.toHaveAttribute('data-fullscreen')

    entrar()

    expect(palco()).toHaveAttribute('data-fullscreen', 'true')
    expect(palco().className).toContain('fixed')
    expect(palco().className).toContain('inset-0')
  })

  it('FOCO-19: o controle de sair devolve a tela ao normal', () => {
    montar()
    entrar()

    sair()

    expect(palco()).not.toHaveAttribute('data-fullscreen')
    expect(screen.getByRole('button', { name: 'Tela cheia' })).toBeInTheDocument()
  })

  it('FOCO-19: `Escape` também sai — pelo componente real', () => {
    montar()
    entrar()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(palco()).not.toHaveAttribute('data-fullscreen')
  })

  it('FOCO-21: o `<iframe>` é o MESMO nó antes e depois, e o `src` não muda', () => {
    montar()
    const antes = quadro()
    const endereco = antes?.getAttribute('src')

    entrar()
    const durante = quadro()
    sair()
    const depois = quadro()

    // Identidade do nó, não igualdade de atributos: se o React remontasse, o documento da loja
    // recarregaria e o rascunho já entregue pela ponte se perderia.
    expect(durante).toBe(antes)
    expect(depois).toBe(antes)
    expect(depois?.getAttribute('src')).toBe(endereco)
  })

  it('FOCO-16/17: com palco MEDIDO, o quadro cresce em altura e a escala fica em 1', () => {
    // **Sem palco medido, este caso não mede nada.** jsdom não implementa `ResizeObserver`, então a
    // caixa fica `{0,0}` e `previewFrame` devolve o piso nos dois modos — a métrica imprimiria o
    // mesmo texto ligado e desligado, e trocar a altura do quadro por `PREVIEW_DEVICES[device]`
    // passaria despercebido. Com a caixa de 1440 × 988, os dois modos ficam distinguíveis.
    comPalcoDe({ width: 1440, height: 988 })
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Computador' }))

    // Normal: 1024 × 768 reduzido para caber na altura disponível (948 / 768 > 1 ⇒ trava em 1).
    expect(quadro()).toHaveAttribute('height', '768')
    expect(screen.getByTestId('metrica-previa')).toHaveTextContent('1024 × 768 · 100%')

    entrar()

    // Tela cheia: a altura passa a ser o espaço vertical real (988 − 40), e a escala é exatamente 1.
    expect(quadro()).toHaveAttribute('width', '1024')
    expect(quadro()).toHaveAttribute('height', '948')
    expect(quadro()?.style.transform).toBe('scale(1)')
    expect(screen.getByTestId('metrica-previa')).toHaveTextContent('1024 × 948 · 100%')
  })

  it('FOCO-18: o celular NÃO estica em tela cheia, mesmo com palco enorme', () => {
    comPalcoDe({ width: 1440, height: 1400 })
    montar()

    expect(quadro()).toHaveAttribute('height', '844')

    entrar()

    // A altura do celular é a **dobra**: esticá-la mentiria sobre o que a cliente vê.
    expect(quadro()).toHaveAttribute('width', '390')
    expect(quadro()).toHaveAttribute('height', '844')
    expect(screen.getByTestId('metrica-previa')).toHaveTextContent('390 × 844 · 100%')
  })

  it('FOCO-16: num palco APERTADO a tela cheia mantém 100% — é o que ela existe para entregar', () => {
    // Sem tela cheia o computador caberia por `transform: scale(0.83…)`; com ela, não encolhe.
    comPalcoDe({ width: 900, height: 700 })
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Computador' }))

    expect(screen.getByTestId('metrica-previa')).not.toHaveTextContent('100%')
    // **E o quadro REALMENTE encolhe** (`PRV-14`). Sem esta linha, cravar `scale(1)` no iframe
    // sobrevive: a barra diria `84%` e a prévia renderizaria a 100% dentro de uma caixa reservada
    // para o tamanho reduzido — a loja aparece cortada, e a métrica mente sobre o que está na tela.
    expect(quadro()?.style.transform).not.toBe('scale(1)')

    entrar()

    expect(quadro()?.style.transform).toBe('scale(1)')
    expect(screen.getByTestId('metrica-previa')).toHaveTextContent('1024 × 768 · 100%')
  })

  it('FOCO-20: clicar num bloco da prévia SAI do modo e então abre o editor', () => {
    const onSelect = vi.fn()
    render(<HomeLivePreview sections={[secao('a')]} highlightId={null} onSelect={onSelect} />)

    entrar()
    expect(palco()).toHaveAttribute('data-fullscreen', 'true')

    // A mensagem da ponte, como a loja a manda: origem exata e a janela do próprio iframe.
    const evento = new MessageEvent('message', {
      data: { source: 'estrelinha-home-preview', type: 'select', sectionId: 'a' },
      origin: 'http://localhost:8082',
    })
    Object.defineProperty(evento, 'source', { value: quadro()?.contentWindow })
    fireEvent(window, evento)

    // As DUAS coisas: sai do modo **e** abre o editor. Só sair deixaria o clique sem efeito; só
    // abrir entregaria um formulário atrás de uma prévia que ocupa a tela inteira.
    expect(onSelect).toHaveBeenCalledWith('a')
    expect(palco()).not.toHaveAttribute('data-fullscreen')
  })

  it('`FOLGA` não existe mais neste arquivo — a folga tem um dono, e é `core`', () => {
    const fonte = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), 'HomeLivePreview.tsx'),
      'utf8',
    )
    // A régua procura **uso**, nunca menção: o arquivo explica em comentário que a folga saiu daqui,
    // e uma régua ingênua acusaria justamente o arquivo que está certo. Linha e bloco na mesma
    // passada, com `[^\n\r]` fechando antes do `\r` (CRLF).
    const codigo = fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

    expect(codigo).toContain('previewFrame')
    expect(codigo).not.toContain('FOLGA')
    expect(codigo).not.toContain('previewScale')
  })
})
