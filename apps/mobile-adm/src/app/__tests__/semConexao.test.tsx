// Feature 72, T10 — sem conexão, pela árvore REAL (`<App />`): `MAF-19` e `MAF-21`.
// O que se prova além da tela: offline, NENHUMA chamada ao client do Supabase sai — nem a sessão.
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

let online = true
beforeEach(() => {
  fake.reset()
  online = true
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const FRASE = 'Sem conexão. Os dados da loja aparecem quando a internet voltar.'

const cair = (evento: 'online' | 'offline') =>
  act(async () => {
    online = evento === 'online'
    window.dispatchEvent(new Event(evento))
    // Feature `82`, T18: a queda só vira "Sem conexão" depois de 5 s offline contínuos; a volta é na hora.
    await vi.advanceTimersByTimeAsync(evento === 'offline' ? 5700 : 700)
  })

const chamadasAoSupabase = () =>
  Object.values(fake.client.auth).reduce((n, f) => n + f.mock.calls.length, 0) + fake.client.from.mock.calls.length

describe('o app aberto sem conexão (MAF-19)', () => {
  it('mostra a tela "Sem conexão" com "Tentar de novo", e nada do router', async () => {
    online = false
    await montarApp('/')
    expect(screen.getByText(FRASE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entrar no ateliê' })).not.toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Abrindo o painel do ateliê' })).not.toBeInTheDocument()
  })

  it('offline, nenhuma chamada ao client do Supabase — nem a leitura da sessão', async () => {
    online = false
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/pedidos')
    expect(chamadasAoSupabase()).toBe(0)
  })

  it('"Tentar de novo" sem rede mantém a tela e diz que continua sem conexão', async () => {
    online = false
    await montarApp('/')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(screen.getByText(FRASE)).toBeInTheDocument()
    expect(screen.getByText('Ainda sem conexão.')).toBeInTheDocument()
    // S04 da verificação r3: a frase nasce numa região viva, para o leitor de tela anunciar que o
    // toque foi ouvido e a rede continua fora. A região existe ANTES do toque (vazia): uma região
    // que nasce junto com o texto não é anunciada.
    expect(screen.getByRole('status')).toHaveTextContent('Ainda sem conexão.')
  })

  it('a região viva já existe, vazia, antes do toque', async () => {
    online = false
    await montarApp('/')
    expect(screen.getByRole('status')).toHaveTextContent('')
  })
})

describe('a rede caindo e voltando com o app aberto', () => {
  it('evento offline com a aba aberta ⇒ a tela "Sem conexão", sem a aba atrás', async () => {
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/pedidos')
    expect(await screen.findByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
    await cair('offline')
    expect(screen.getByText(FRASE)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Pedidos' })).not.toBeInTheDocument()
  })

  it('com a tela na frente, o título do documento é o dela; com a rede de volta, o da aba', async () => {
    // Paper cut do reteste de QA da 72: o título seguia o da aba que estava atrás da tela.
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/pedidos')
    expect(await screen.findByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
    expect(document.title).toBe('Pedidos · Ateliê')
    await cair('offline')
    expect(document.title).toBe('Sem conexão · Ateliê')
    await cair('online')
    expect(await screen.findByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
    expect(document.title).toBe('Pedidos · Ateliê')
  })

  it('MAF-21 — evento online ⇒ sai da tela sozinho e volta à aba, relendo a sessão', async () => {
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/pedidos')
    await cair('offline')
    const leiturasAntes = fake.client.auth.getSession.mock.calls.length
    await cair('online')
    expect(screen.queryByText(FRASE)).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
    expect(fake.client.auth.getSession.mock.calls.length).toBe(leiturasAntes + 1)
  })

  it('"Tentar de novo" com a rede de volta tira o app da tela', async () => {
    online = false
    await montarApp('/')
    online = true
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
      await vi.advanceTimersByTimeAsync(700)
    })
    expect(screen.queryByText(FRASE)).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Entrar no ateliê' })).toBeInTheDocument()
  })
})
