// O cabeçalho da Loja ao vivo e a linha de frescor, pela árvore REAL (`<App />` com sessão admin
// sobre o dublê do client). A linha só diz há quanto tempo a tela foi atualizada quando as DUAS
// leituras (a presença, `store_live`, e Acessos, `store_movement`) estão na tela: com uma delas
// carregando ou em falha, não há frescor a afirmar.
process.env.TZ = 'UTC'

import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { focusManager } from '@tanstack/react-query'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { resumo } from '@/test/resumo'
import { movimentoComAcessos } from '@/test/movimento'
import { presenca } from '@/test/presenca'
import { FALHA_DE_LEITURA } from '@/shared/ui/leitura'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const REDE = { message: 'Failed to fetch' }

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('store_overview', resumo())
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  focusManager.setFocused(undefined)
})

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const abrir = async () => {
  await montarApp('/ao-vivo')
  await andar(50)
}
const bloco = (nome: string) => screen.getByRole('region', { name: nome })
const cabecalho = () => screen.getByTestId('cabecalho-ao-vivo')
const semFrescor = () => {
  expect(screen.queryByTestId('frescor-ao-vivo')).toBeNull()
  expect(cabecalho()).not.toHaveTextContent('Atualizado')
}
const temClasse = (el: Element, token: string) => el.className.split(/\s+/).includes(token)

describe('o frescor só com as duas leituras na tela', () => {
  it('a presença em falha e Acessos de pé: nenhum "Atualizado", nem agora nem segundos depois', async () => {
    fake.responderRpc('store_movement', movimentoComAcessos())
    fake.falharRpc('store_live', REDE)
    await abrir()
    await andar(3000)
    expect(within(bloco('Agora na loja')).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Visitas, hoje, 41' })).toBeInTheDocument()
    semFrescor()
    await andar(6000)
    semFrescor()
  })

  it('o contrário: Acessos em falha e a presença de pé, nenhum "Atualizado"', async () => {
    fake.falharRpc('store_movement', REDE)
    fake.responderRpc('store_live', presenca())
    await abrir()
    await andar(3000)
    expect(within(bloco('Acessos')).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(within(bloco('Agora na loja')).getByTestId('numero-ao-vivo')).toBeInTheDocument()
    semFrescor()
    await andar(6000)
    semFrescor()
  })

  it('a presença ainda chegando: nenhum "Atualizado agora" antes de ela ter número', async () => {
    fake.responderRpc('store_movement', movimentoComAcessos())
    fake.pendurarRpc('store_live')
    await abrir()
    await andar(2000)
    expect(bloco('Agora na loja')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('group', { name: 'Visitas, hoje, 41' })).toBeInTheDocument()
    semFrescor()
  })

  it('Acessos ainda chegando: nenhum frescor, com a presença já na tela', async () => {
    fake.pendurarRpc('store_movement')
    fake.responderRpc('store_live', presenca())
    await abrir()
    await andar(2000)
    expect(within(bloco('Agora na loja')).getByTestId('numero-ao-vivo')).toBeInTheDocument()
    semFrescor()
  })

  it('com as duas boas, a linha volta e conta pela mais velha: "agora", e "há 5 s" cinco segundos depois', async () => {
    fake.responderRpc('store_movement', movimentoComAcessos())
    fake.responderRpc('store_live', presenca())
    await abrir()
    expect(screen.getByTestId('frescor-ao-vivo').textContent).toBe('Atualizado agora')
    await andar(5000)
    expect(screen.getByTestId('frescor-ao-vivo').textContent).toBe('Atualizado há 5 s')
  })
})

describe('o cabeçalho mede 60 px com a borda', () => {
  it('`box-border`, piso de 60 px e recuo vertical de 4 px: 44 do Voltar + 8 + 1 da borda cabem nos 60', async () => {
    fake.responderRpc('store_movement', movimentoComAcessos())
    fake.responderRpc('store_live', presenca())
    await abrir()
    const h = cabecalho()
    for (const t of ['box-border', 'min-h-[60px]', 'border-b', 'py-1']) expect(temClasse(h, t)).toBe(true)
    // nenhum recuo vertical maior: com `py-2` o conteúdo já é 60 e a borda faz 61
    for (const t of ['py-2', 'py-3', 'pt-2', 'pb-2', 'h-[61px]']) expect(temClasse(h, t)).toBe(false)
    // o piso é mínimo, não altura fixa: a fonte a 200 % ainda faz o cabeçalho crescer
    expect(h.className.split(/\s+/).some((c) => /^h-/.test(c))).toBe(false)
    const voltar = within(h).getByRole('button', { name: 'Voltar' })
    expect(temClasse(voltar, 'h-11')).toBe(true)
  })
})
