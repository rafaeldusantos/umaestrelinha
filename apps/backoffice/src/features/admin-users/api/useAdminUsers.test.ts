import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { functions: { invoke } },
}))

import { useAdminUsers } from './useAdminUsers'

/**
 * O hook de `/admin/usuarios` (`USR-20`, `USR-22`, `USR-26`, `USR-30`).
 *
 * O caso que mais importa aqui é o do **motivo legível**: `functions.invoke` devolve `error` para
 * qualquer status ≥ 400 e **descarta o corpo**. Sem ler o corpo do `FunctionsHttpError`, a frase que
 * o handler escreveu ("esta conta tem 7 pedidos…") nunca chega à tela, e a Adri lê
 * "Edge Function returned a non-2xx status code". As duas pontas certas, resultado errado.
 */

const ADRI = '11111111-1111-1111-1111-111111111111'
const ANA = '22222222-2222-2222-2222-222222222222'

const LISTA = {
  users: [
    { id: ADRI, email: 'adri@x.invalid', name: 'Adri', created_at: 'a', last_sign_in_at: null, is_self: true },
    { id: ANA, email: 'ana@x.invalid', name: 'Ana', created_at: 'b', last_sign_in_at: null, is_self: false },
  ],
}

/** Um erro no formato que o supabase-js produz para status ≥ 400: a `Response` vai em `context`. */
const erroHttp = (corpo: unknown) => ({
  name: 'FunctionsHttpError',
  message: 'Edge Function returned a non-2xx status code',
  context: { json: async () => corpo },
})

const listaOk = () => invoke.mockResolvedValueOnce({ data: LISTA, error: null })

beforeEach(() => {
  invoke.mockReset()
})

const montar = async () => {
  const hook = renderHook(() => useAdminUsers())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useAdminUsers — leitura', () => {
  it('lê pela function, por GET, e expõe a lista', async () => {
    listaOk()
    const { result } = await montar()

    expect(invoke).toHaveBeenCalledWith('admin-users?action=list', { method: 'GET' })
    expect(result.current.users).toEqual(LISTA.users)
    expect(result.current.error).toBeNull()
  })

  it('USR-26: falha de leitura preenche `error` e deixa a lista VAZIA', async () => {
    // Os dois juntos são o que a tela precisa para distinguir "quebrou" de "não há ninguém".
    invoke.mockResolvedValueOnce({
      data: null,
      error: erroHttp({ error: 'Não foi possível ler quem tem acesso ao painel.' }),
    })
    const { result } = await montar()

    expect(result.current.error).toBe('Não foi possível ler quem tem acesso ao painel.')
    expect(result.current.users).toEqual([])
  })

  it('lista vazia NÃO é erro — `error` fica nulo', async () => {
    invoke.mockResolvedValueOnce({ data: { users: [] }, error: null })
    const { result } = await montar()

    expect(result.current.users).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('corpo ilegível cai no fallback em português, e nunca na mensagem crua do supabase-js', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: {
        name: 'FunctionsHttpError',
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: async () => {
            throw new Error('proxy devolveu HTML')
          },
        },
      },
    })
    const { result } = await montar()

    expect(result.current.error).toBe('Não foi possível ler quem tem acesso ao painel.')
    expect(result.current.error).not.toContain('non-2xx')
  })

  it('erro SEM `context` (queda de rede) também cai no fallback', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { name: 'FunctionsFetchError', message: 'failed' } })
    const { result } = await montar()

    expect(result.current.error).toBe('Não foi possível ler quem tem acesso ao painel.')
  })
})

describe('useAdminUsers — criar', () => {
  const NOVO = { name: 'Ana Helena', email: 'ana@exemplo.invalid', password: 'segredo123' }

  it('USR-22: cria e RELÊ a lista, sem recarregar a página', async () => {
    listaOk()
    const { result } = await montar()

    invoke.mockResolvedValueOnce({ data: { user: { id: ANA } }, error: null })
    listaOk()

    let motivo: string | null = 'nao-chamou'
    await act(async () => {
      motivo = await result.current.create(NOVO)
    })

    expect(motivo).toBeNull()
    expect(invoke).toHaveBeenCalledWith('admin-users?action=create', { body: NOVO })
    // A releitura. Sem ela a pessoa criada não aparece até um F5.
    expect(invoke).toHaveBeenLastCalledWith('admin-users?action=list', { method: 'GET' })
  })

  it.each([
    ['nome vazio', { ...NOVO, name: '  ' }, 'Informe o nome de quem vai acessar'],
    ['e-mail inválido', { ...NOVO, email: 'x' }, 'E-mail inválido'],
    ['senha curta', { ...NOVO, password: 'abc' }, 'A senha precisa de pelo menos 6 caracteres'],
  ])('recusa %s SEM chamar a rede', async (_rotulo, entrada, esperado) => {
    listaOk()
    const { result } = await montar()
    const antes = invoke.mock.calls.length

    let motivo: string | null = null
    await act(async () => {
      motivo = await result.current.create(entrada)
    })

    expect(motivo).toBe(esperado)
    // A metade que importa: a recusa local não gasta uma ida à function — e, no caso da senha,
    // não manda a senha pela rede para ser recusada lá.
    expect(invoke.mock.calls.length).toBe(antes)
  })

  it('a recusa do SERVIDOR chega com o texto do handler, não com a do supabase-js', async () => {
    listaOk()
    const { result } = await montar()

    invoke.mockResolvedValueOnce({
      data: null,
      error: erroHttp({ error: 'Esta pessoa já tem acesso ao painel.' }),
    })

    let motivo: string | null = null
    await act(async () => {
      motivo = await result.current.create(NOVO)
    })

    expect(motivo).toBe('Esta pessoa já tem acesso ao painel.')
  })

  it('criação recusada NÃO relê a lista', async () => {
    listaOk()
    const { result } = await montar()
    invoke.mockResolvedValueOnce({ data: null, error: erroHttp({ error: 'recusado' }) })

    await act(async () => {
      await result.current.create(NOVO)
    })

    expect(invoke).toHaveBeenLastCalledWith('admin-users?action=create', { body: NOVO })
  })
})

describe('useAdminUsers — editar, remover e apagar', () => {
  it('editar manda id, nome e e-mail, e NÃO manda senha', async () => {
    listaOk()
    const { result } = await montar()
    invoke.mockResolvedValueOnce({ data: { user: {} }, error: null })
    listaOk()

    await act(async () => {
      await result.current.update(ANA, 'Ana H.', 'ana.nova@x.invalid')
    })

    expect(invoke).toHaveBeenCalledWith('admin-users?action=update', {
      body: { id: ANA, name: 'Ana H.', email: 'ana.nova@x.invalid' },
    })
    const corpo = invoke.mock.calls.find(c => c[0].includes('action=update'))![1].body
    expect(corpo).not.toHaveProperty('password')
  })

  it('USR-28: editar com sucesso RELÊ a lista — o nome novo aparece sem F5', async () => {
    // A assimetria que sobrou depois do conserto do G2: `create`, `revoke` e `remove` ganharam a
    // asserção de releitura, e `update` não. Sem ela, apagar o `refetch` de `update()` deixa o nome
    // ANTIGO na tabela até alguém recarregar — e a dona acabou de digitar o novo.
    listaOk()
    const { result } = await montar()
    invoke.mockResolvedValueOnce({ data: { user: {} }, error: null })
    listaOk()

    await act(async () => {
      await result.current.update(ANA, 'Ana H.', 'ana.nova@x.invalid')
    })

    expect(invoke).toHaveBeenLastCalledWith('admin-users?action=list', { method: 'GET' })
  })

  it('editar recusa nome vazio localmente, sem rede', async () => {
    listaOk()
    const { result } = await montar()
    const antes = invoke.mock.calls.length

    let motivo: string | null = null
    await act(async () => {
      motivo = await result.current.update(ANA, '  ', 'ana@x.invalid')
    })

    expect(motivo).toBe('Informe o nome de quem vai acessar')
    expect(invoke.mock.calls.length).toBe(antes)
  })

  it('remover do painel chama `revoke` e relê', async () => {
    listaOk()
    const { result } = await montar()
    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null })
    listaOk()

    await act(async () => {
      await result.current.revoke(ANA)
    })

    expect(invoke).toHaveBeenCalledWith('admin-users?action=revoke', { body: { id: ANA } })
    expect(invoke).toHaveBeenLastCalledWith('admin-users?action=list', { method: 'GET' })
  })

  it('apagar conta chama `delete`, e a recusa por histórico chega INTEIRA', async () => {
    // O texto com o número é o produto desta feature. Perdê-lo no transporte transformaria a recusa
    // acionável em "deu erro".
    listaOk()
    const { result } = await montar()
    invoke.mockResolvedValueOnce({
      data: null,
      error: erroHttp({
        error:
          'Esta conta tem 7 pedidos no histórico da loja, e apagá-la deixaria esses registros sem dono. Use “Remover do painel”: o acesso sai e o histórico fica.',
      }),
    })

    let motivo: string | null = null
    await act(async () => {
      motivo = await result.current.remove(ANA)
    })

    expect(invoke).toHaveBeenCalledWith('admin-users?action=delete', { body: { id: ANA } })
    expect(motivo).toContain('7 pedidos')
    expect(motivo).toContain('Remover do painel')
  })

  it('USR-31: apagar com sucesso RELÊ a lista — a pessoa some da tela', async () => {
    // O caso que faltava, e a lacuna era discriminante: o único teste de `delete` exercitava o ramo
    // de RECUSA, que retorna ANTES da releitura. Apagar `await fetch()` de `remove()` deixava a
    // suíte inteira verde, e a linha da pessoa apagada continuaria na tabela até um F5.
    //
    // O irmão `revoke` já tinha esta asserção; `remove` não.
    listaOk()
    const { result } = await montar()

    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null })
    listaOk()

    let motivo: string | null = 'nao-chamou'
    await act(async () => {
      motivo = await result.current.remove(ANA)
    })

    expect(motivo).toBeNull()
    expect(invoke).toHaveBeenLastCalledWith('admin-users?action=list', { method: 'GET' })
  })

  it('USR-31: apagar RECUSADO não relê — a lista em cache continua verdadeira', async () => {
    // O par. Sem ele, um `refetch` incondicional passaria no caso acima e gastaria uma releitura a
    // cada recusa — e recusa é o desfecho NORMAL desta ação, porque quase todo admin tem histórico.
    listaOk()
    const { result } = await montar()
    invoke.mockResolvedValueOnce({ data: null, error: erroHttp({ error: 'tem histórico' }) })

    await act(async () => {
      await result.current.remove(ANA)
    })

    expect(invoke).toHaveBeenLastCalledWith('admin-users?action=delete', { body: { id: ANA } })
  })

  it('remover e apagar são ações DIFERENTES — nunca a mesma chamada', async () => {
    listaOk()
    const { result } = await montar()
    invoke.mockResolvedValue({ data: { ok: true }, error: null })

    await act(async () => {
      await result.current.revoke(ANA)
    })
    await act(async () => {
      await result.current.remove(ANA)
    })

    const acoes = invoke.mock.calls.map(c => String(c[0]))
    expect(acoes).toContain('admin-users?action=revoke')
    expect(acoes).toContain('admin-users?action=delete')
  })
})

describe('useAdminUsers — reenviar senha', () => {
  it('USR-18: chama `reset-password` com o id, e NÃO com o e-mail', async () => {
    // Mandar o e-mail daqui abriria a porta para pedir código de uma conta do painel para um
    // endereço arbitrário. O handler ignora, e o hook não manda.
    listaOk()
    const { result } = await montar()
    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null })

    await act(async () => {
      await result.current.resetPassword(ANA)
    })

    expect(invoke).toHaveBeenCalledWith('admin-users?action=reset-password', { body: { id: ANA } })
    expect(invoke.mock.calls.find(c => c[0].includes('reset-password'))![1].body).not.toHaveProperty(
      'email',
    )
  })

  it('USR-30: o rate limit chega como recusa legível', async () => {
    listaOk()
    const { result } = await montar()
    invoke.mockResolvedValueOnce({
      data: null,
      error: erroHttp({ error: 'Aguarde alguns segundos para reenviar' }),
    })

    let motivo: string | null = null
    await act(async () => {
      motivo = await result.current.resetPassword(ANA)
    })

    expect(motivo).toBe('Aguarde alguns segundos para reenviar')
  })

  it('reenviar NÃO relê a lista — nada nela muda', async () => {
    listaOk()
    const { result } = await montar()
    const antes = invoke.mock.calls.length
    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null })

    await act(async () => {
      await result.current.resetPassword(ANA)
    })

    // Uma chamada a mais, e só: a do envio. Um `refetch` aqui piscaria a tabela sem motivo.
    expect(invoke.mock.calls.length).toBe(antes + 1)
  })
})
