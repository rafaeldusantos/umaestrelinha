// Feature `88` · T09 — `CRG-01`, `CRG-02`, `A-11`: o botão que grava mostra o trabalho NELE, e o
// portão de uma gravação por vez (`usePendingAction`) não deixa o segundo clique sair.
//
// jsdom devolve 0 para toda medida de layout: o alvo de 44 px é provado pela CLASSE, por token exato
// (`h-11` é substring de `min-h-11`, então `toContain` sobre a string inteira não serve).
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ActionButton } from './ActionButton'
import { usePendingAction } from '../lib/usePendingAction'

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

describe('ActionButton — CRG-01', () => {
  it('sem `pending`: o rótulo, habilitado, sem `aria-busy` e sem indicador', () => {
    render(<ActionButton pendingLabel="Marcando como enviado…">Marcar como enviado</ActionButton>)
    const botao = screen.getByRole('button', { name: 'Marcar como enviado' })
    expect(botao).toBeEnabled()
    expect(botao).not.toHaveAttribute('aria-busy')
    expect(botao.querySelector('svg')).toBeNull()
    expect(screen.queryByText('Marcando como enviado…')).toBeNull()
  })

  it('com `pending`: o gerúndio, `aria-busy="true"`, desabilitado e o `Loader2` girando', () => {
    render(
      <ActionButton pending pendingLabel="Marcando como enviado…">
        Marcar como enviado
      </ActionButton>,
    )
    const botao = screen.getByRole('button', { name: 'Marcando como enviado…' })
    expect(botao).toHaveAttribute('aria-busy', 'true')
    expect(botao).toBeDisabled()
    expect(screen.queryByText('Marcar como enviado')).toBeNull()
    const icone = botao.querySelector('svg')
    expect(icone).not.toBeNull()
    expect(tokens(icone!)).toContain('animate-spin')
    // O lucide marca o ícone com a classe do nome: é o `Loader2`, não um ícone qualquer girando.
    expect(tokens(icone!)).toContain('lucide-loader-circle')
    expect(icone).toHaveAttribute('aria-hidden', 'true')
  })

  it('`disabled` do chamador continua valendo sem `pending`', () => {
    render(
      <ActionButton disabled pendingLabel="Salvando…">
        Salvar
      </ActionButton>,
    )
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  it('alvo de 44 px só quando o chamador pede (`min-h-11`, token exato)', () => {
    const { rerender } = render(<ActionButton pendingLabel="Salvando…">Salvar</ActionButton>)
    expect(tokens(screen.getByRole('button'))).not.toContain('min-h-11')

    rerender(
      <ActionButton alvo44 pendingLabel="Salvando…">
        Salvar
      </ActionButton>,
    )
    expect(tokens(screen.getByRole('button'))).toContain('min-h-11')
  })
})

/** Uma promessa que o teste resolve ou rejeita quando quiser — a gravação "em curso". */
const segurada = <T,>() => {
  let resolver!: (v: T) => void
  let rejeitar!: (e: unknown) => void
  const promessa = new Promise<T>((ok, ko) => {
    resolver = ok
    rejeitar = ko
  })
  return { promessa, resolver, rejeitar }
}

/** Duas ações do mesmo pedido, cada uma com o seu botão — a composição que a página vai usar. */
function Pedido({ salvar, avancar }: { salvar: () => Promise<string>; avancar: () => Promise<string> }) {
  const { pendente, rodar, anunciar, regiaoViva } = usePendingAction()
  const clicar = (chave: string, gerundio: string, fn: () => Promise<string>) => async () => {
    const r = await rodar(chave, gerundio, fn)
    if (r !== undefined) anunciar(r)
  }
  return (
    <>
      <ActionButton
        pending={pendente === 'rastreio'}
        disabled={pendente !== null}
        pendingLabel="Salvando rastreio…"
        onClick={clicar('rastreio', 'Salvando rastreio…', salvar)}
      >
        Salvar rastreio
      </ActionButton>
      <ActionButton
        pending={pendente === 'avancar'}
        disabled={pendente !== null}
        pendingLabel="Marcando como enviado…"
        onClick={clicar('avancar', 'Marcando como enviado…', avancar)}
      >
        Marcar como enviado
      </ActionButton>
      {regiaoViva}
    </>
  )
}

describe('usePendingAction — CRG-02 e CRG-09', () => {
  it('só o botão da gravação em curso mostra o estado; o outro fica desabilitado sem indicador', async () => {
    const g = segurada<string>()
    render(<Pedido salvar={() => g.promessa} avancar={vi.fn(async () => 'ok')} />)

    fireEvent.click(screen.getByRole('button', { name: 'Salvar rastreio' }))

    const emCurso = await screen.findByRole('button', { name: 'Salvando rastreio…' })
    expect(emCurso).toHaveAttribute('aria-busy', 'true')
    const outro = screen.getByRole('button', { name: 'Marcar como enviado' })
    expect(outro).toBeDisabled()
    expect(outro).not.toHaveAttribute('aria-busy')
    expect(outro.querySelector('svg')).toBeNull()

    await act(async () => g.resolver('Rastreio salvo'))
  })

  it('`rodar` com outra gravação em curso NÃO executa a segunda — contado pela função dublada', async () => {
    const g = segurada<string>()
    const primeira = vi.fn(() => g.promessa)
    const segunda = vi.fn(async () => 'segunda')
    let api!: ReturnType<typeof usePendingAction>
    function Sonda() {
      api = usePendingAction()
      return null
    }
    render(<Sonda />)

    let p1!: Promise<unknown>
    let p2!: Promise<unknown>
    // As duas no MESMO tique, sem render no meio: é o duplo clique que o estado do React ainda não
    // viu. Quem barra é a trava síncrona, não o `pendente` do render.
    act(() => {
      p1 = api.rodar('a', 'Salvando…', primeira)
      p2 = api.rodar('b', 'Avançando…', segunda)
    })
    await expect(p2).resolves.toBeUndefined()
    expect(segunda).not.toHaveBeenCalled()
    expect(primeira).toHaveBeenCalledTimes(1)
    expect(api.pendente).toBe('a')

    await act(async () => {
      g.resolver('feito')
      await p1
    })
    expect(api.pendente).toBeNull()
  })

  it('duplo clique no MESMO botão: uma requisição só', async () => {
    const g = segurada<string>()
    const salvar = vi.fn(() => g.promessa)
    render(<Pedido salvar={salvar} avancar={vi.fn(async () => 'ok')} />)

    const botao = screen.getByRole('button', { name: 'Salvar rastreio' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    await act(async () => g.resolver('ok'))
    expect(salvar).toHaveBeenCalledTimes(1)
  })

  it('`pendente` volta a `null` em SUCESSO, e devolve o valor da função', async () => {
    let api!: ReturnType<typeof usePendingAction>
    function Sonda() {
      api = usePendingAction()
      return null
    }
    render(<Sonda />)
    let r: unknown
    await act(async () => {
      r = await api.rodar('a', 'Salvando…', async () => 42)
    })
    expect(r).toBe(42)
    expect(api.pendente).toBeNull()
  })

  it('`pendente` volta a `null` em FALHA (a promessa rejeita), e a falha chega a quem chamou', async () => {
    let api!: ReturnType<typeof usePendingAction>
    function Sonda() {
      api = usePendingAction()
      return null
    }
    render(<Sonda />)
    const erro = new Error('rede caiu')
    await act(async () => {
      await expect(api.rodar('a', 'Salvando…', async () => Promise.reject(erro))).rejects.toBe(erro)
    })
    expect(api.pendente).toBeNull()

    // E a trava abriu: a próxima gravação sai.
    const depois = vi.fn(async () => 'ok')
    await act(async () => {
      await api.rodar('b', 'Salvando…', depois)
    })
    expect(depois).toHaveBeenCalledTimes(1)
  })

  it('a região viva (`aria-live="polite"`) anuncia o gerúndio e, ao terminar, o resultado', async () => {
    const g = segurada<string>()
    render(<Pedido salvar={() => g.promessa} avancar={vi.fn(async () => 'ok')} />)
    const regiao = document.querySelector('[aria-live="polite"]')
    expect(regiao).not.toBeNull()
    expect(regiao).toHaveTextContent('')

    fireEvent.click(screen.getByRole('button', { name: 'Salvar rastreio' }))
    await screen.findByRole('button', { name: 'Salvando rastreio…' })
    expect(regiao).toHaveTextContent('Salvando rastreio…')

    await act(async () => g.resolver('Rastreio salvo — a cliente foi avisada por e-mail'))
    expect(regiao).toHaveTextContent('Rastreio salvo — a cliente foi avisada por e-mail')
    expect(regiao).not.toHaveTextContent('Salvando rastreio…')
  })
})
