// A folha da observação do pedido — molde de `FolhaDoRastreio.test.tsx`. A porta (`gravarObservacao`) é
// dublada por módulo: aqui se prova a FOLHA e a gravação dela (`useObservacaoDoPedido`, real) — o que ela
// manda à porta, o que ela recusa sem rede pela regra de `core`, a trava durante a gravação e o erro em
// módulo com o texto preservado. A fiação na árvore real é de `pages/__tests__/observacaoDoPedido.test.tsx`.
//
// As frases são escritas POR EXTENSO (nunca lidas das constantes que elas provam).
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ObservacaoDoPedido } from '@/entities/order'
import { OBSERVACAO, linha } from '@/test/pedidos'

import { EditarObservacao, esquecerAcoes, useObservacaoDoPedido } from '../..'
import type { ResultadoDaObservacao } from '../../api/gravarAcao'
import { useEntradaDoErro } from '../../model/erros'
import { useAviso } from '../../model/avisos'

const porta = vi.hoisted(() => ({ gravarObservacao: vi.fn() }))
vi.mock('../../api/gravarAcao', () => ({ gravarAcao: vi.fn(), gravarObservacao: porta.gravarObservacao }))
vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))
vi.mock('@estrelinha/auth', async (original) => ({
  ...(await original<typeof import('@estrelinha/auth')>()),
  useAuthContext: () => ({ user: { id: 'u-1', email: 'adri@exemplo.invalid' }, customer: { name: '  Adri Muniz ' } }),
}))

const ID = '00000000-0000-4000-8000-000000000244'
const PEDIDO = linha({ id: ID })
const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

let n = 0
const montarHistorico = () => {
  n += 1
  window.history.pushState({ usr: null, key: `s-${n}`, idx: 0 }, '', `/sentinela-${n}`)
  window.history.pushState({ usr: { doApp: true }, key: `p-${n}`, idx: 1 }, '', `/pedidos/${ID}`)
}

const Origem = () => {
  const entrada = useEntradaDoErro(ID)
  const aviso = useAviso()
  return (
    <>
      <output data-testid="origem-do-erro">{entrada?.de ?? ''}</output>
      <output data-testid="aviso">{aviso?.titulo ?? ''}</output>
    </>
  )
}

const Abridor = ({ gravada }: { gravada: ObservacaoDoPedido | null }) => {
  const observacao = useObservacaoDoPedido(ID)
  return (
    <main>
      <h1 tabIndex={-1}>Pedido #0244</h1>
      <EditarObservacao pedido={PEDIDO} observacao={observacao} gravada={gravada} />
      <Origem />
    </main>
  )
}

const montar = (gravada: ObservacaoDoPedido | null = null) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Abridor gravada={gravada} />
      </BrowserRouter>
    </QueryClientProvider>,
  )
}
const abridor = () => screen.getByTestId('editar-observacao')
const abrir = () => act(() => fireEvent.click(abridor()))
const folha = () => screen.queryByRole('dialog')
const campo = () => screen.getByLabelText('Observação') as HTMLTextAreaElement
const salvar = () => screen.getByRole('button', { name: /^(Salvar|Salvando…)$/ })
const esperar = () => act(() => new Promise<void>((r) => setTimeout(r, 30)))
const tocarSalvar = () =>
  act(async () => {
    fireEvent.click(salvar())
  })

beforeEach(() => {
  esquecerAcoes()
  porta.gravarObservacao.mockReset()
  montarHistorico()
})
afterEach(() => act(() => esquecerAcoes()))

describe('cadastrar', () => {
  it('sem observação: "Adicionar observação" abre a folha vazia, com o título e a frase', async () => {
    montar(null)
    expect(abridor()).toHaveTextContent(/^Adicionar observação$/)
    await abrir()
    expect(screen.getByRole('dialog', { name: 'Adicionar observação' })).toBeInTheDocument()
    expect(screen.getByText('Só quem administra vê. A cliente não recebe.')).toBeInTheDocument()
    expect(campo().value).toBe('')
    expect(screen.getByTestId('contador-da-observacao')).toHaveTextContent('0 / 1000')
  })

  it('manda à porta o pedido, o texto digitado e o autor (o nome do cadastro, aparado) — e fecha só depois do sucesso', async () => {
    let soltar: (r: ResultadoDaObservacao) => void = () => {}
    porta.gravarObservacao.mockImplementationOnce(() => new Promise<ResultadoDaObservacao>((ok) => (soltar = ok)))
    montar(null)
    await abrir()
    fireEvent.change(campo(), { target: { value: '  Gravar em letra cursiva.  ' } })
    await tocarSalvar()
    expect(porta.gravarObservacao).toHaveBeenCalledWith(ID, '  Gravar em letra cursiva.  ', { userId: 'u-1', userName: 'Adri Muniz' })
    expect(folha()).toBeInTheDocument()
    await act(async () => {
      soltar({ tipo: 'ok', nota: { order_id: ID, note: 'Gravar em letra cursiva.', updated_by: 'u-1', updated_by_name: 'Adri Muniz', updated_at: OBSERVACAO.updated_at } })
    })
    await esperar()
    expect(folha()).toBeNull()
    expect(screen.getByTestId('aviso')).toHaveTextContent('Observação salva.')
  })

  it('sem nada digitado, "Salvar" fica indisponível e não vai à porta', async () => {
    montar(null)
    await abrir()
    expect(salvar()).toHaveAttribute('aria-disabled', 'true')
    await tocarSalvar()
    expect(porta.gravarObservacao).not.toHaveBeenCalled()
  })
})

describe('editar', () => {
  it('com observação: "Editar" (nome acessível "Editar observação") abre a folha com o texto gravado', async () => {
    montar(OBSERVACAO)
    expect(screen.getByRole('button', { name: 'Editar observação' })).toBe(abridor())
    await abrir()
    expect(screen.getByRole('dialog', { name: 'Editar observação' })).toBeInTheDocument()
    expect(campo().value).toBe('Gravar o nome com letra cursiva, como no pedido anterior.')
    // O texto igual ao gravado (aparado) não diz nada: "Salvar" indisponível.
    expect(salvar()).toHaveAttribute('aria-disabled', 'true')
    fireEvent.change(campo(), { target: { value: 'Gravar o nome com letra cursiva, como no pedido anterior.   ' } })
    expect(salvar()).toHaveAttribute('aria-disabled', 'true')
  })

  it('manda o texto editado à porta e fecha no sucesso', async () => {
    porta.gravarObservacao.mockResolvedValueOnce({ tipo: 'ok', nota: { ...OBSERVACAO, order_id: ID, updated_by: 'u-1', note: 'Letra de forma.' } })
    montar(OBSERVACAO)
    await abrir()
    fireEvent.change(campo(), { target: { value: 'Letra de forma.' } })
    await tocarSalvar()
    await esperar()
    expect(porta.gravarObservacao).toHaveBeenCalledTimes(1)
    expect(porta.gravarObservacao.mock.calls[0].slice(0, 2)).toEqual([ID, 'Letra de forma.'])
    expect(folha()).toBeNull()
  })

  it('esvaziar a observação gravada vai à porta (o dono apaga) e confirma "Observação apagada."', async () => {
    porta.gravarObservacao.mockResolvedValueOnce({ tipo: 'ok', nota: null })
    montar(OBSERVACAO)
    await abrir()
    fireEvent.change(campo(), { target: { value: '   ' } })
    expect(salvar()).not.toHaveAttribute('aria-disabled')
    await tocarSalvar()
    await esperar()
    expect(porta.gravarObservacao.mock.calls[0].slice(0, 2)).toEqual([ID, '   '])
    expect(screen.getByTestId('aviso')).toHaveTextContent('Observação apagada.')
  })
})

describe('o teto (a regra de core: aparado, por ponto de código)', () => {
  it('acima de 1000: a frase da recusa, o contador em alerta, "Salvar" indisponível e ZERO chamadas à porta', async () => {
    montar(null)
    await abrir()
    fireEvent.change(campo(), { target: { value: 'a'.repeat(1001) } })
    expect(screen.getByTestId('contador-da-observacao')).toHaveTextContent('1001 / 1000')
    expect(tokens(screen.getByTestId('contador-da-observacao'))).toContain('text-estrelinha-alert')
    expect(screen.getByText('A observação vai até 1000 caracteres.')).toBeInTheDocument()
    expect(campo()).toHaveAttribute('aria-invalid', 'true')
    expect(salvar()).toHaveAttribute('aria-disabled', 'true')
    await tocarSalvar()
    // Nem o submit do formulário passa.
    await act(async () => {
      fireEvent.submit(campo().form!)
    })
    expect(porta.gravarObservacao).not.toHaveBeenCalled()
    expect(folha()).toBeInTheDocument()
  })

  it('1000 caracteres fora do plano básico (2000 unidades de UTF-16) cabem; espaço nas pontas não conta', async () => {
    porta.gravarObservacao.mockResolvedValueOnce({ tipo: 'ok', nota: null })
    montar(null)
    await abrir()
    const texto = `  ${'𝒜'.repeat(1000)}  `
    fireEvent.change(campo(), { target: { value: texto } })
    expect(screen.getByTestId('contador-da-observacao')).toHaveTextContent('1000 / 1000')
    expect(campo()).not.toHaveAttribute('maxlength')
    expect(screen.queryByText('A observação vai até 1000 caracteres.')).toBeNull()
    await tocarSalvar()
    expect(porta.gravarObservacao).toHaveBeenCalledWith(ID, texto, expect.anything())
  })
  it('a gravação (`salvar`) recusa o teto ela mesma, antes da trava e da rede — não só o botão da folha', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useObservacaoDoPedido(ID), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    let r: boolean | undefined
    await act(async () => {
      r = await result.current.salvar('a'.repeat(1001))
    })
    expect(r).toBe(false)
    expect(porta.gravarObservacao).not.toHaveBeenCalled()
    expect(result.current.travado).toBe(false)
  })
})

describe('a trava durante a gravação', () => {
  const comGravacaoNoAr = async () => {
    let soltar: (r: ResultadoDaObservacao) => void = () => {}
    porta.gravarObservacao.mockImplementationOnce(() => new Promise<ResultadoDaObservacao>((ok) => (soltar = ok)))
    montar(null)
    await abrir()
    fireEvent.change(campo(), { target: { value: 'Embrulhar para presente.' } })
    await tocarSalvar()
    return (r: ResultadoDaObservacao) => soltar(r)
  }

  it('"Salvando…", indisponível, campo só leitura; o segundo toque não sai', async () => {
    const soltar = await comGravacaoNoAr()
    expect(salvar()).toHaveTextContent('Salvando…')
    expect(salvar()).toHaveAttribute('aria-disabled', 'true')
    expect(campo()).toHaveAttribute('readonly')
    await tocarSalvar()
    expect(porta.gravarObservacao).toHaveBeenCalledTimes(1)
    await act(async () => soltar({ tipo: 'ok', nota: null }))
    await esperar()
    expect(folha()).toBeNull()
  })

  it.each([
    ['o Escape', () => fireEvent.keyDown(folha()!, { key: 'Escape' })],
    ['"Agora não"', () => fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))],
  ] as const)('com a gravação no ar, %s não fecha a folha', async (_n, gesto) => {
    const soltar = await comGravacaoNoAr()
    await act(async () => gesto())
    await esperar()
    expect(folha()).toBeInTheDocument()
    expect(salvar()).toHaveTextContent('Salvando…')
    await act(async () => soltar({ tipo: 'ok', nota: null }))
    await esperar()
    expect(folha()).toBeNull()
  })
})

describe('o erro de gravação mora em módulo, com o texto preservado', () => {
  it('com FALHA a folha fica aberta, com a frase em role="alert", o texto digitado e "Salvar" de volta', async () => {
    porta.gravarObservacao.mockResolvedValueOnce({ tipo: 'falhou', erro: new Error('rede') })
    montar(null)
    await abrir()
    fireEvent.change(campo(), { target: { value: 'Embrulhar para presente.' } })
    await tocarSalvar()
    await esperar()
    expect(folha()).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(campo().value).toBe('Embrulhar para presente.')
    expect(salvar()).toHaveTextContent(/^Salvar$/)
    expect(salvar()).not.toHaveAttribute('aria-disabled')
    // Em módulo, com a origem: só a folha da observação o desenha.
    expect(screen.getByTestId('origem-do-erro')).toHaveTextContent('observacao')
  })

  it('a porta que LANÇA sem ser recusa vira a mesma falha, com o texto preservado', async () => {
    porta.gravarObservacao.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    montar(null)
    await abrir()
    fireEvent.change(campo(), { target: { value: 'Embrulhar para presente.' } })
    await tocarSalvar()
    await esperar()
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(campo().value).toBe('Embrulhar para presente.')
  })

  it('"mudou" fica aberta com a frase — nunca diz que salvou', async () => {
    porta.gravarObservacao.mockResolvedValueOnce({ tipo: 'mudou' })
    montar(null)
    await abrir()
    fireEvent.change(campo(), { target: { value: 'Embrulhar para presente.' } })
    await tocarSalvar()
    await esperar()
    expect(screen.getByRole('alert')).toHaveTextContent('Este pedido mudou enquanto você olhava.')
    expect(screen.getByTestId('aviso')).toHaveTextContent('')
  })

  it('a recusa de papel (42501) NÃO vira erro da folha nem confirmação — vai à vigia da página', async () => {
    porta.gravarObservacao.mockRejectedValueOnce({ code: '42501', message: 'acesso restrito ao painel' })
    montar(null)
    await abrir()
    fireEvent.change(campo(), { target: { value: 'Embrulhar para presente.' } })
    await tocarSalvar()
    await esperar()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByTestId('aviso')).toHaveTextContent('')
    expect(screen.getByTestId('origem-do-erro')).toHaveTextContent('')
  })
})

describe('a forma', () => {
  it('"Agora não", "Salvar" e o botão do bloco com alvo de 44 px ou mais (token exato); sem o X do canto', async () => {
    montar(null)
    expect(tokens(abridor())).toContain('min-h-11')
    await abrir()
    expect(tokens(salvar())).toContain('min-h-12')
    expect(tokens(screen.getByRole('button', { name: 'Agora não' }))).toContain('min-h-12')
    expect(screen.queryByRole('button', { name: /close|fechar/i })).toBeNull()
  })

  it('o movimento da folha e do fundo desliga com menos movimento, no seletor de estado', async () => {
    montar(null)
    await abrir()
    const dialogo = folha()!
    expect(tokens(dialogo)).toEqual(
      expect.arrayContaining(['motion-reduce:data-[state=open]:animate-none', 'motion-reduce:data-[state=closed]:animate-none']),
    )
    const fundo = [...document.querySelectorAll('[data-state="open"]')].find(
      (el) => el.getAttribute('role') !== 'dialog' && tokens(el).includes('bg-black/80'),
    )
    expect(tokens(fundo ?? null)).toEqual(
      expect.arrayContaining(['motion-reduce:data-[state=open]:animate-none', 'motion-reduce:data-[state=closed]:animate-none']),
    )
  })

  it('o foco vai ao campo ao abrir e volta a quem abriu ao fechar', async () => {
    montar(null)
    act(() => abridor().focus())
    await abrir()
    await esperar()
    expect(document.activeElement).toBe(campo())
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Agora não' })))
    await esperar()
    expect(folha()).toBeNull()
    // O Radix devolve o foco num `setTimeout` depois de desmontar o conteúdo: espera-se o desfecho.
    await waitFor(() => expect(document.activeElement).toBe(abridor()))
    expect(document.activeElement).not.toBe(document.body)
  })
})
