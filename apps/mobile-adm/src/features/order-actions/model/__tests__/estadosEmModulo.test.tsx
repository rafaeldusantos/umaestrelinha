// Feature `75` · T17 — a trava, o aviso e o erro das ações, em MÓDULO (design §1.2, §3.7; `MAA-20`,
// `MAA-35`, `MAA-36`, A20). Fora do React de propósito: a trava precisa valer no MESMO tique, e o cartão
// e o detalhe precisam ver o mesmo estado sem prop.
import { act, render, renderHook, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { esquecerAcoes, definirErro, lerErro, limparAviso, mostrarAviso, soltar, travar, useAviso, useErroDoPedido, useTravado } from '../..'

beforeEach(() => esquecerAcoes())

describe('travas', () => {
  it('`travar` devolve true, e a segunda chamada NO MESMO TIQUE devolve false', () => {
    expect(travar('o-1')).toBe(true)
    expect(travar('o-1')).toBe(false)
  })

  it('outro pedido não é afetado pela trava de um', () => {
    expect(travar('o-1')).toBe(true)
    expect(travar('o-2')).toBe(true)
  })

  it('`soltar` libera: depois dele, `travar` volta a sair', () => {
    travar('o-1')
    soltar('o-1')
    expect(travar('o-1')).toBe(true)
  })

  it('`useTravado` acompanha a trava, e dois consumidores do mesmo id veem o mesmo', () => {
    const a = renderHook(() => useTravado('o-1'))
    const b = renderHook(() => useTravado('o-1'))
    const outro = renderHook(() => useTravado('o-2'))
    expect([a.result.current, b.result.current]).toEqual([false, false])
    act(() => {
      travar('o-1')
    })
    expect([a.result.current, b.result.current, outro.result.current]).toEqual([true, true, false])
    act(() => soltar('o-1'))
    expect([a.result.current, b.result.current]).toEqual([false, false])
  })
})

describe('avisos', () => {
  it('`mostrarAviso` aparece em `useAviso`, e um novo SUBSTITUI o anterior com chave nova', () => {
    const { result } = renderHook(() => useAviso())
    expect(result.current).toBeNull()
    act(() => mostrarAviso({ titulo: 'Material registrado.', frase: 'O pedido #0251 foi para a bancada.' }))
    expect(result.current).toMatchObject({ titulo: 'Material registrado.', frase: 'O pedido #0251 foi para a bancada.' })
    const primeira = result.current!.chave
    act(() => mostrarAviso({ titulo: 'Material registrado.', frase: 'O pedido #0251 foi para a bancada.' }))
    expect(result.current!.chave).not.toBe(primeira)
    act(() => mostrarAviso({ titulo: 'Rastreio salvo.', frase: 'O código ficou no pedido.' }))
    expect(result.current).toMatchObject({ titulo: 'Rastreio salvo.', frase: 'O código ficou no pedido.' })
  })

  it('`limparAviso(chave)` de um aviso VELHO não apaga o novo; sem chave, apaga', () => {
    const { result } = renderHook(() => useAviso())
    act(() => mostrarAviso({ titulo: 'a', frase: 'a' }))
    const velha = result.current!.chave
    act(() => mostrarAviso({ titulo: 'b', frase: 'b' }))
    act(() => limparAviso(velha))
    expect(result.current?.titulo).toBe('b')
    act(() => limparAviso(result.current!.chave))
    expect(result.current).toBeNull()
    act(() => mostrarAviso({ titulo: 'c', frase: 'c' }))
    act(() => limparAviso())
    expect(result.current).toBeNull()
  })
})

describe('erros por pedido', () => {
  const Cartao = ({ id }: { id: string }) => <p data-testid={`cartao-${id}`}>{useErroDoPedido(id)?.frase ?? ''}</p>
  const Detalhe = ({ id }: { id: string }) => <p data-testid={`detalhe-${id}`}>{useErroDoPedido(id)?.frase ?? ''}</p>

  it('`definirErro(id, e)` aparece nos DOIS consumidores montados juntos (cartão e detalhe), e só no pedido dele', () => {
    render(
      <>
        <Cartao id="o-1" />
        <Detalhe id="o-1" />
        <Cartao id="o-2" />
      </>,
    )
    act(() => definirErro('o-1', { frase: 'Não consegui salvar. Tente de novo.', retentativa: null }))
    expect(screen.getByTestId('cartao-o-1').textContent).toBe('Não consegui salvar. Tente de novo.')
    expect(screen.getByTestId('detalhe-o-1').textContent).toBe('Não consegui salvar. Tente de novo.')
    expect(screen.getByTestId('cartao-o-2').textContent).toBe('')
    act(() => definirErro('o-1', null))
    expect(screen.getByTestId('detalhe-o-1').textContent).toBe('')
  })

  it('o erro leva a `retentativa` (o que o "Tentar de novo" reenvia)', () => {
    const retentativa = { tipo: 'rastreio', codigo: 'AB123456BR', origem: 'acao' } as const
    definirErro('o-1', { frase: 'O código ficou salvo, mas o pedido não foi marcado como enviado.', retentativa })
    expect(lerErro('o-1')).toEqual({ frase: 'O código ficou salvo, mas o pedido não foi marcado como enviado.', retentativa })
  })
})

describe('esquecerAcoes', () => {
  it('zera as travas, o aviso e os erros — e quem observa vê o reset', () => {
    const travado = renderHook(() => useTravado('o-1'))
    const aviso = renderHook(() => useAviso())
    const erro = renderHook(() => useErroDoPedido('o-1'))
    act(() => {
      travar('o-1')
      mostrarAviso({ titulo: 'x', frase: 'y' })
      definirErro('o-1', { frase: 'z', retentativa: { tipo: 'primaria' } })
    })
    expect([travado.result.current, aviso.result.current?.titulo, erro.result.current?.frase]).toEqual([true, 'x', 'z'])
    act(() => esquecerAcoes())
    expect([travado.result.current, aviso.result.current, erro.result.current]).toEqual([false, null, null])
    expect(travar('o-1')).toBe(true)
  })
})
