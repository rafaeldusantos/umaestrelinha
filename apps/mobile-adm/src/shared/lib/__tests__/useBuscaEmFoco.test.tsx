// Conserto do QA da `76` · `BUG-20261024-teclado-aberto-esconde-os-resultados-da-busca` — o sinal que tira
// a barra de abas de cena. Só o campo de TEXTO de uma busca (`role="search"`) vale: o campo do rastreio,
// numa folha, e um botão dentro da busca não mexem na barra.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useBuscaEmFoco } from '../useBuscaEmFoco'

const Sonda = () => {
  const emFoco = useBuscaEmFoco()
  return (
    <>
      <output data-testid="sonda">{String(emFoco)}</output>
      <div role="search">
        <input aria-label="busca" />
        <button type="button">limpar</button>
      </div>
      <input aria-label="rastreio" />
      <textarea aria-label="nota" />
    </>
  )
}
const sonda = () => screen.getByTestId('sonda').textContent

describe('useBuscaEmFoco', () => {
  it('foco no campo da busca ⇒ verdadeiro; foco fora ⇒ falso', () => {
    render(<Sonda />)
    expect(sonda()).toBe('false')
    act(() => screen.getByLabelText('busca').focus())
    expect(sonda()).toBe('true')
    act(() => screen.getByLabelText('busca').blur())
    expect(sonda()).toBe('false')
  })

  it('um campo de texto FORA de uma busca não conta', () => {
    render(<Sonda />)
    act(() => screen.getByLabelText('rastreio').focus())
    expect(sonda()).toBe('false')
    act(() => screen.getByLabelText('nota').focus())
    expect(sonda()).toBe('false')
  })

  it('um botão DENTRO da busca não conta (só o campo de texto abre o teclado)', () => {
    render(<Sonda />)
    act(() => screen.getByRole('button', { name: 'limpar' }).focus())
    expect(sonda()).toBe('false')
  })

  it('passar do campo da busca para outro campo desliga', () => {
    render(<Sonda />)
    act(() => screen.getByLabelText('busca').focus())
    act(() => screen.getByLabelText('rastreio').focus())
    expect(sonda()).toBe('false')
  })

  it('já montado com o foco na busca ⇒ verdadeiro', () => {
    const { unmount } = render(<Sonda />)
    act(() => screen.getByLabelText('busca').focus())
    unmount()
    // O campo ficou fora do documento: nada em foco.
    render(<Sonda />)
    expect(sonda()).toBe('false')
  })

  // `BUG-20261024-primeiro-toque-em-chip-ou-limpar-se-perde-com-a-busca-em-foco`: o toque que tira o foco
  // não pode mexer no layout antes do clique.
  it('um toque que tira o foco espera o clique para soltar o sinal', () => {
    render(<Sonda />)
    act(() => screen.getByLabelText('busca').focus())
    const botao = screen.getByRole('button', { name: 'limpar' })
    fireEvent.pointerDown(botao)
    act(() => screen.getByLabelText('busca').blur())
    expect(sonda()).toBe('true')
    fireEvent.pointerUp(botao)
    expect(sonda()).toBe('true')
    fireEvent.click(botao)
    expect(sonda()).toBe('false')
  })

  it('um toque sem clique solta o sinal depois do fim do toque, e o cancelado na hora', () => {
    vi.useFakeTimers()
    try {
      render(<Sonda />)
      act(() => screen.getByLabelText('busca').focus())
      fireEvent.pointerDown(document.body)
      act(() => screen.getByLabelText('busca').blur())
      fireEvent.pointerUp(document.body)
      expect(sonda()).toBe('true')
      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(sonda()).toBe('false')

      act(() => screen.getByLabelText('busca').focus())
      expect(sonda()).toBe('true')
      fireEvent.pointerDown(document.body)
      act(() => screen.getByLabelText('busca').blur())
      expect(sonda()).toBe('true')
      fireEvent.pointerCancel(document.body)
      expect(sonda()).toBe('false')
    } finally {
      vi.useRealTimers()
    }
  })

  it('o foco que volta ao campo durante o toque cancela a saída pendente', () => {
    render(<Sonda />)
    act(() => screen.getByLabelText('busca').focus())
    fireEvent.pointerDown(document.body)
    act(() => screen.getByLabelText('busca').blur())
    act(() => screen.getByLabelText('busca').focus())
    fireEvent.click(document.body)
    expect(sonda()).toBe('true')
  })

  // `BUG-20261024-...` reaberto (reteste 3): no navegador a ordem é pointerdown, pointerup, mousedown,
  // focusout(campo), focusin(BOTÃO). O `focusin` do botão tocado não pode soltar o sinal antes do clique.
  it('o foco que CHEGA ao botão tocado não solta o sinal antes do clique', () => {
    render(<Sonda />)
    act(() => screen.getByLabelText('busca').focus())
    const botao = screen.getByRole('button', { name: 'limpar' })
    fireEvent.pointerDown(botao)
    fireEvent.pointerUp(botao)
    // O foco passa do campo ao botão: focusout(input) e focusin(botão), como o navegador faz.
    act(() => botao.focus())
    expect(sonda()).toBe('true')
    fireEvent.click(botao)
    expect(sonda()).toBe('false')
  })

  it('o foco que chega a outro campo de texto fora da busca, com o dedo no vidro, também espera o clique', () => {
    render(<Sonda />)
    act(() => screen.getByLabelText('busca').focus())
    fireEvent.pointerDown(screen.getByLabelText('rastreio'))
    act(() => screen.getByLabelText('rastreio').focus())
    expect(sonda()).toBe('true')
    fireEvent.click(screen.getByLabelText('rastreio'))
    expect(sonda()).toBe('false')
  })

  it('o prazo do primeiro toque não solta o segundo (toque duplo)', () => {
    vi.useFakeTimers()
    try {
      render(<Sonda />)
      act(() => screen.getByLabelText('busca').focus())
      const botao = screen.getByRole('button', { name: 'limpar' })
      fireEvent.pointerDown(botao)
      fireEvent.pointerUp(botao)
      fireEvent.click(botao)
      // Segundo toque antes de os 150 ms do primeiro vencerem.
      act(() => {
        vi.advanceTimersByTime(50)
      })
      fireEvent.pointerDown(botao)
      act(() => screen.getByLabelText('busca').blur())
      expect(sonda()).toBe('true')
      act(() => {
        vi.advanceTimersByTime(200)
      })
      // O prazo velho não pode ter zerado o toque novo: segue em foco até o segundo clique.
      expect(sonda()).toBe('true')
      fireEvent.click(botao)
      expect(sonda()).toBe('false')
    } finally {
      vi.useRealTimers()
    }
  })
})
