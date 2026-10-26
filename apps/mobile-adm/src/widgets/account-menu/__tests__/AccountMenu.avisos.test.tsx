// Feature `79` · T22 — o menu da conta com os avisos, pela árvore REAL (`<App />` com sessão admin).
// `MAN-17` (o item "Avisos neste celular") e `MAN-30` (sair apaga a inscrição deste aparelho antes do
// `signOut`, e pergunta quando a porta falha). O navegador é o arnês de `@/test/push`; a porta, o dublê
// por fila do mesmo arquivo. Os casos antigos do menu moram em `AccountMenu.test.tsx`, intocados.
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { falhou, filaDaPorta, ok, portaFalsa, push } from '@/test/push'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))
vi.mock('@/features/push-notifications/api/portaDeAvisos', async () => (await import('@/test/push')).portaFalsa)

const EMAIL = 'adri@exemplo.invalid'
const EXISTENTE = 'https://fcm.googleapis.com/fcm/send/p79-existente'
const RECUSA = Object.assign(new Error('acesso restrito ao painel'), { code: '42501' })
const PERGUNTA = 'Não consegui parar os avisos deste celular.'

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => vi.useRealTimers())

const andar = (ms = 50) => act(() => vi.advanceTimersByTimeAsync(ms))
const temToken = (el: Element, token: string) => (el.getAttribute('class') ?? '').split(/\s+/).includes(token)
const abrirMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Sua conta' }))
const sair = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
  await andar()
}

describe('"Avisos neste celular" no menu (MAN-17)', () => {
  it('é um link para `/avisos`, com alvo de 48 px; tocar leva à tela e o menu FECHA', async () => {
    await montarApp('/pedidos')
    abrirMenu()
    const link = screen.getByRole('link', { name: 'Avisos neste celular' })
    expect(link).toHaveAttribute('href', '/avisos')
    expect(temToken(link, 'min-h-12')).toBe(true)
    fireEvent.click(link)
    await andar()
    expect(window.location.pathname).toBe('/avisos')
    expect(screen.getByRole('heading', { level: 1, name: 'Avisos neste celular' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sua conta' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Avisos neste celular' })).toBeNull()
  })
})

describe('sair com os avisos deste aparelho (MAN-30)', () => {
  it('sem inscrição ⇒ o "Sair" de sempre: `signOut` e ZERO chamadas à porta', async () => {
    push.instalar()
    await montarApp('/')
    abrirMenu()
    await sair()
    expect(fake.client.auth.signOut).toHaveBeenCalledTimes(1)
    for (const f of Object.values(portaFalsa)) expect(f).not.toHaveBeenCalled()
    expect(window.location.pathname).toBe('/login')
  })

  it('sem suporte a Web Push ⇒ o "Sair" de sempre, sem porta', async () => {
    await montarApp('/')
    abrirMenu()
    await sair()
    expect(fake.client.auth.signOut).toHaveBeenCalledTimes(1)
    expect(portaFalsa.desinscrever).not.toHaveBeenCalled()
  })

  it('com inscrição ⇒ a PORTA e o navegador ANTES do `signOut` (ordem provada)', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('desinscrever', ok({ ok: true }))
    await montarApp('/')
    abrirMenu()
    await sair()
    expect(portaFalsa.desinscrever).toHaveBeenCalledWith(EXISTENTE)
    expect(push.chamadas.unsubscribe).toBe(1)
    expect(fake.client.auth.signOut).toHaveBeenCalledTimes(1)
    // A porta antes do navegador (o log do arnês), e os dois antes do `signOut` (a ordem global do vitest).
    const log = push.chamadas.log
    expect(log.indexOf('porta desinscrever')).toBeGreaterThanOrEqual(0)
    expect(log.indexOf('porta desinscrever')).toBeLessThan(log.indexOf('unsubscribe'))
    const saida = fake.client.auth.signOut.mock.invocationCallOrder[0]
    expect(portaFalsa.desinscrever.mock.invocationCallOrder[0]).toBeLessThan(saida)
    expect(push.inscricao).toBeNull()
    expect(window.location.pathname).toBe('/login')
  })

  it('a porta falhando ⇒ a frase de MAN-30 com os dois botões, SEM `signOut`, e o foco no primeiro (L-066)', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('desinscrever', falhou())
    await montarApp('/')
    abrirMenu()
    await sair()
    expect(screen.getByRole('alert')).toHaveTextContent(PERGUNTA)
    const tentar = screen.getByRole('button', { name: 'Tentar de novo' })
    const mesmoAssim = screen.getByRole('button', { name: 'Sair mesmo assim' })
    expect(temToken(tentar, 'min-h-12')).toBe(true)
    expect(temToken(mesmoAssim, 'min-h-12')).toBe(true)
    expect(document.activeElement).toBe(tentar)
    expect(screen.queryByRole('button', { name: 'Sair' })).toBeNull()
    expect(fake.client.auth.signOut).not.toHaveBeenCalled()
    expect(push.chamadas.unsubscribe).toBe(0)
    expect(window.location.pathname).toBe('/')
  })

  it('"Sair mesmo assim" ⇒ `signOut`, sem nova tentativa na porta', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('desinscrever', falhou())
    await montarApp('/')
    abrirMenu()
    await sair()
    fireEvent.click(screen.getByRole('button', { name: 'Sair mesmo assim' }))
    await andar()
    expect(fake.client.auth.signOut).toHaveBeenCalledTimes(1)
    expect(portaFalsa.desinscrever).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe('/login')
  })

  it('"Tentar de novo" ⇒ nova tentativa na porta; dando certo, sai', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('desinscrever', falhou(), ok({ ok: true }))
    await montarApp('/')
    abrirMenu()
    await sair()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await andar()
    expect(portaFalsa.desinscrever).toHaveBeenCalledTimes(2)
    expect(push.chamadas.unsubscribe).toBe(1)
    expect(fake.client.auth.signOut).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe('/login')
  })

  it('"Tentar de novo" falhando outra vez ⇒ a pergunta de novo, ainda sem `signOut`', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('desinscrever', falhou(), falhou())
    await montarApp('/')
    abrirMenu()
    await sair()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await andar()
    expect(portaFalsa.desinscrever).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('alert')).toHaveTextContent(PERGUNTA)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(fake.client.auth.signOut).not.toHaveBeenCalled()
  })

  it('fechar o menu com a pergunta aberta: reaberto, ele volta ao "Sair"', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('desinscrever', falhou())
    await montarApp('/')
    abrirMenu()
    await sair()
    fireEvent.keyDown(document, { key: 'Escape' })
    abrirMenu()
    expect(screen.queryByText(PERGUNTA)).toBeNull()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('a porta RECUSANDO por papel ⇒ `signOut` direto, sem a pergunta', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('desinscrever', () => Promise.reject(RECUSA))
    await montarApp('/')
    abrirMenu()
    await sair()
    expect(screen.queryByText(PERGUNTA)).toBeNull()
    expect(fake.client.auth.signOut).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe('/login')
  })
})
