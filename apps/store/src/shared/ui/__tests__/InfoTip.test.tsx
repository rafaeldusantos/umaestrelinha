// O ⓘ da loja: um botão com balão informativo que abre com o ponteiro do mouse, com o toque e com o
// foco, e fecha ao sair, ao tocar fora e com Esc. Os casos montam o Popover REAL do Radix (não um
// dublê), porque o que se prova é o par botão × balão — o estado, o `aria-expanded` e o Portal.
//
// jsdom 20 não tem `PointerEvent`: o `fireEvent` cai num `Event` genérico e o `pointerType` some.
// `ponteiro` cria o evento e grava o tipo nele, que é o campo que o componente lê.

import { act, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import InfoTip from '../InfoTip'

type Tipo = 'mouse' | 'touch'

const ponteiro = (
  el: Element,
  nome: 'pointerEnter' | 'pointerLeave' | 'pointerDown' | 'pointerOver' | 'pointerOut',
  pointerType: Tipo,
) => {
  const ev = createEvent[nome](el)
  Object.defineProperty(ev, 'pointerType', { value: pointerType })
  fireEvent(el, ev)
}

/** Passar o mouse: o React deriva o `onPointerEnter` do `pointerover`. */
const entrar = (el: Element, t: Tipo) => {
  ponteiro(el, 'pointerOver', t)
  ponteiro(el, 'pointerEnter', t)
}
const sair = (el: Element, t: Tipo) => {
  ponteiro(el, 'pointerOut', t)
  ponteiro(el, 'pointerLeave', t)
}

/** Um clique de verdade com o tipo do ponteiro: pointerdown → foco → click. */
const tocar = (el: HTMLElement, t: Tipo) => {
  ponteiro(el, 'pointerDown', t)
  act(() => el.focus())
  fireEvent.click(el)
}

const montar = () =>
  render(
    <div>
      <p>
        Frete grátis
        <InfoTip label="Sobre o frete grátis">Vale para pedidos acima de R$ 300.</InfoTip>
      </p>
      <button type="button">Fora</button>
    </div>,
  )

const botao = () => screen.getByRole('button', { name: 'Sobre o frete grátis' })
const balao = () => screen.queryByRole('tooltip')

describe('InfoTip — abrir e fechar', () => {
  it('abre ao passar o ponteiro do mouse e fecha ao sair', () => {
    montar()
    expect(balao()).toBeNull()
    entrar(botao(), 'mouse')
    expect(balao()).not.toBeNull()
    sair(botao(), 'mouse')
    expect(balao()).toBeNull()
  })

  it('passar o dedo por cima não abre — só o mouse abre por passagem', () => {
    montar()
    entrar(botao(), 'touch')
    expect(balao()).toBeNull()
  })

  it('o toque alterna: abre no primeiro e fecha no segundo', () => {
    montar()
    tocar(botao(), 'touch')
    expect(balao()).not.toBeNull()
    tocar(botao(), 'touch')
    expect(balao()).toBeNull()
  })

  it('o clique do mouse mantém aberto depois de o ponteiro sair', () => {
    montar()
    entrar(botao(), 'mouse')
    tocar(botao(), 'mouse')
    expect(balao()).not.toBeNull()
    sair(botao(), 'mouse')
    expect(balao()).not.toBeNull()
  })

  it('Esc fecha', () => {
    montar()
    tocar(botao(), 'touch')
    expect(balao()).not.toBeNull()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(balao()).toBeNull()
  })

  it('clicar fora fecha', async () => {
    montar()
    tocar(botao(), 'touch')
    expect(balao()).not.toBeNull()
    // O Radix só passa a ouvir o `pointerdown` de fora um tique depois de abrir.
    await act(() => new Promise(r => setTimeout(r, 0)))
    const fora = screen.getByRole('button', { name: 'Fora' })
    ponteiro(fora, 'pointerDown', 'touch')
    fireEvent.click(fora)
    expect(balao()).toBeNull()
  })

  it('o foco pelo teclado abre, e a perda do foco fecha', () => {
    montar()
    act(() => botao().focus())
    expect(balao()).not.toBeNull()
    act(() => screen.getByRole('button', { name: 'Fora' }).focus())
    expect(balao()).toBeNull()
  })

  it('perder o foco sem que outro elemento o receba também fecha', () => {
    // O foco indo para outro controle o Radix já trata como "fora"; o foco que só sai do botão
    // (para o corpo da página) não passa por ele.
    montar()
    act(() => botao().focus())
    expect(balao()).not.toBeNull()
    act(() => botao().blur())
    expect(balao()).toBeNull()
  })
})

describe('InfoTip — o que o leitor de tela recebe', () => {
  it('o botão tem o rótulo recebido e o `aria-expanded` acompanha o estado', () => {
    montar()
    expect(botao().getAttribute('aria-expanded')).toBe('false')
    tocar(botao(), 'touch')
    expect(botao().getAttribute('aria-expanded')).toBe('true')
    tocar(botao(), 'touch')
    expect(botao().getAttribute('aria-expanded')).toBe('false')
  })

  it('o balão tem `role="tooltip"` e o conteúdo recebido', () => {
    montar()
    tocar(botao(), 'touch')
    const b = screen.getByRole('tooltip')
    expect(b.textContent).toBe('Vale para pedidos acima de R$ 300.')
  })

  it('o conteúdo pode ser um nó, não só texto', () => {
    render(
      <InfoTip label="Sobre o frete">
        <span data-testid="no">Sul e Sudeste</span>
      </InfoTip>,
    )
    tocar(screen.getByRole('button', { name: 'Sobre o frete' }), 'touch')
    expect(screen.getByRole('tooltip').contains(screen.getByTestId('no'))).toBe(true)
  })
})
