// Feature `73` · T11 · `MAI-22`, `MAI-24` — a vigia da recusa, sobre o `AuthProvider` REAL (o dublê
// do client por baixo). A régua de "chamou `retryAdminCheck`" é a consulta do papel (`user_roles`)
// saindo de novo: é o efeito observável dele, e não um espião sobre um contexto escrito à mão.
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuthContext } from '@estrelinha/auth'
import { fake } from '@/test/fakeSupabase'
import { ehRecusaDePapel, useRecusaDePapel } from '../useRecusaDePapel'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const RECUSA = { message: 'permission denied for function store_overview', code: '42501' }
const REDE = { message: 'Failed to fetch' }

const Sonda = ({ erros, boa = erros.length === 0 }: { erros: unknown[]; boa?: boolean }) => {
  const { loading } = useAuthContext()
  const recusada = useRecusaDePapel(erros, boa)
  return <p data-testid="sonda">{`${loading ? 'carregando' : 'pronto'}:${recusada ? 'recusada' : 'ok'}`}</p>
}

const consultasDoPapel = () => fake.estado.tabelas.filter((t) => t === 'user_roles').length

const montar = async (erros: unknown[]) => {
  const r = render(
    <AuthProvider>
      <Sonda erros={erros} />
    </AuthProvider>,
  )
  await waitFor(() => expect(screen.getByTestId('sonda').textContent).toMatch(/^pronto/))
  return r
}

beforeEach(() => {
  fake.reset()
  fake.comSessao('adri@exemplo.invalid', { admin: true })
})
afterEach(() => vi.useRealTimers())

describe('useRecusaDePapel', () => {
  it('sem erro: não reconfere nada, e não há recusa', async () => {
    await montar([])
    expect(consultasDoPapel()).toBe(1)
    expect(screen.getByTestId('sonda').textContent).toBe('pronto:ok')
  })

  it('o primeiro `42501` reconfere o papel UMA vez — e um segundo `42501` não reconfere de novo', async () => {
    const { rerender } = await montar([])
    expect(consultasDoPapel()).toBe(1)

    rerender(
      <AuthProvider>
        <Sonda erros={[RECUSA]} />
      </AuthProvider>,
    )
    await waitFor(() => expect(consultasDoPapel()).toBe(2))
    await waitFor(() => expect(screen.getByTestId('sonda').textContent).toBe('pronto:recusada'))

    // Outra leitura recusada, outro objeto de erro: a vigia já pediu.
    rerender(
      <AuthProvider>
        <Sonda erros={[RECUSA, { ...RECUSA }]} />
      </AuthProvider>,
    )
    await new Promise((r) => setTimeout(r, 50))
    expect(consultasDoPapel()).toBe(2)
  })

  it('a marca é por CONTA: A recusada e reconferida, A sai, B entra e é recusada ⇒ B reconfere de novo (N02 da r2)', async () => {
    // A é a conta do `beforeEach`. A marca da vigia é do MÓDULO: abrir sem erro primeiro encerra o
    // episódio que um caso vizinho tenha deixado aberto para ela, senão o caso mediria o vizinho.
    fake.tornarAdmin('conta-b@exemplo.invalid')
    const sonda = (erros: unknown[]) => (
      <AuthProvider>
        <Sonda erros={erros} />
      </AuthProvider>
    )
    const { rerender } = await montar([])
    expect(consultasDoPapel()).toBe(1)
    rerender(sonda([RECUSA]))
    // A abertura perguntou o papel (1) e a recusa de A o reconfere (2).
    await waitFor(() => expect(consultasDoPapel()).toBe(2))
    await waitFor(() => expect(screen.getByTestId('sonda').textContent).toBe('pronto:recusada'))

    // A sai. Nenhuma leitura boa no meio: o erro continua o mesmo.
    await act(async () => {
      await fake.client.auth.signOut()
    })
    rerender(sonda([RECUSA]))
    await new Promise((r) => setTimeout(r, 20))
    expect(consultasDoPapel()).toBe(2)

    // B entra: o provider pergunta o papel dela (3) e a recusa de B é outro episódio (4).
    await act(async () => {
      await fake.client.auth.signInWithPassword({ email: 'conta-b@exemplo.invalid', password: 'x' })
    })
    rerender(sonda([{ ...RECUSA }]))
    await waitFor(() => expect(consultasDoPapel()).toBe(4))
    await new Promise((r) => setTimeout(r, 50))
    expect(consultasDoPapel()).toBe(4)
  })

  it('erro de REDE nunca reconfere o papel, e não é recusa (`MAI-24`)', async () => {
    const { rerender } = await montar([REDE])
    rerender(
      <AuthProvider>
        <Sonda erros={[REDE, { message: 'boom', code: '500' }, null]} />
      </AuthProvider>,
    )
    await new Promise((r) => setTimeout(r, 50))
    expect(consultasDoPapel()).toBe(1)
    expect(screen.getByTestId('sonda').textContent).toBe('pronto:ok')
  })
})

describe('o episódio só acaba com uma leitura BOA (BUG-20261024-recusa-com-papel-admin-vira-tempestade)', () => {
  it('sem erro porque a consulta recomeçou (nenhuma leitura boa) NÃO encerra o episódio: o `42501` seguinte não reconfere', async () => {
    const { rerender } = await montar([])
    rerender(
      <AuthProvider>
        <Sonda erros={[RECUSA]} />
      </AuthProvider>,
    )
    await waitFor(() => expect(consultasDoPapel()).toBe(2))

    // A consulta recomeçou: o React Query apagou o erro, e ainda não há dado.
    rerender(
      <AuthProvider>
        <Sonda erros={[]} boa={false} />
      </AuthProvider>,
    )
    await new Promise((r) => setTimeout(r, 20))
    rerender(
      <AuthProvider>
        <Sonda erros={[{ ...RECUSA }]} />
      </AuthProvider>,
    )
    await new Promise((r) => setTimeout(r, 50))
    expect(consultasDoPapel()).toBe(2)

    // Encerra o episódio (a marca é do módulo): uma leitura boa.
    rerender(
      <AuthProvider>
        <Sonda erros={[]} boa />
      </AuthProvider>,
    )
    await new Promise((r) => setTimeout(r, 20))
  })
})

describe('ehRecusaDePapel', () => {
  it('só o código `42501`', () => {
    expect(ehRecusaDePapel(RECUSA)).toBe(true)
    expect(ehRecusaDePapel(REDE)).toBe(false)
    expect(ehRecusaDePapel({ message: '42501' })).toBe(false)
    expect(ehRecusaDePapel(null)).toBe(false)
    expect(ehRecusaDePapel(undefined)).toBe(false)
  })

  it('a página que DESMONTA e remonta com o mesmo `42501` no cache não reconfere de novo — e uma recusa nova, depois de uma leitura boa, reconfere', async () => {
    // A T18 achou o laço pelo `<App />` real: `retryAdminCheck` põe `loading`, o `RequireAdmin` troca
    // a página pelo `fallback`, e a remontagem (com o erro ainda no cache) pedia de novo, para sempre.
    const primeira = await montar([RECUSA])
    await waitFor(() => expect(consultasDoPapel()).toBe(2))
    await waitFor(() => expect(screen.getByTestId('sonda').textContent).toBe('pronto:recusada'))
    primeira.unmount()

    const segunda = await montar([RECUSA])
    await new Promise((r) => setTimeout(r, 50))
    // A nova montagem do provider pergunta o papel uma vez (3); a vigia não acrescenta nada.
    expect(consultasDoPapel()).toBe(3)

    // A leitura voltou a dar certo: o episódio acabou. A próxima recusa é outra, e reconfere.
    segunda.rerender(
      <AuthProvider>
        <Sonda erros={[]} />
      </AuthProvider>,
    )
    await new Promise((r) => setTimeout(r, 20))
    segunda.rerender(
      <AuthProvider>
        <Sonda erros={[RECUSA]} />
      </AuthProvider>,
    )
    await waitFor(() => expect(consultasDoPapel()).toBe(4))
  })
})
