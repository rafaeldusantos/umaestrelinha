// A observação do pedido sobre o `<App />` real e o supabase-js REAL (`src/test/clientReal.ts`) — molde de
// `pedidosComClientReal` (a leitura) e de `acoesComClientReal` (a gravação). Só o `fetch` e o storage
// são nossos: o `lerComPapel`, a porta (`gravarObservacao`) e o dono da escrita (`core/order-actions`)
// são os de verdade.
//
// O que se prova: a conta SEM papel não vê o texto nem grava. `order_admin_notes` responde com a
// observação do outro lado (a RLS a filtraria; aqui ela chega, para a régua ter alvo), e a recusa vem
// de `atelie_clock` em 403 `42501` — a forma que o PostgREST manda para `raise … errcode '42501'`.
// "Em nenhum instante": o DOM é lido a cada passo de 50 ms do relógio falso, e na gravação também por
// um `MutationObserver` (a recusa desmonta a tela no mesmo passo em que uma confirmação apareceria).
// As frases são escritas por extenso.
process.env.TZ = 'UTC'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { pedidoHref } from '@/entities/order'
import { esquecerAcoes } from '@/features/order-actions'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { real, type Real, type RespostaRpcReal } from '@/test/clientReal'
import { OBSERVACAO, detalhe, item } from '@/test/pedidos'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const ID = '00000000-0000-4000-8000-000000000244'
const RELOGIO = '/rest/v1/rpc/atelie_clock'
const OBSERVACOES = '/rest/v1/order_admin_notes'
const RELOGIO_OK: RespostaRpcReal = { status: 200, corpo: { lido_em: '2026-10-23T14:30:00.123456+00:00' } }
const RECUSA_403: RespostaRpcReal = {
  status: 403,
  corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' },
}
const TEXTO_DELA = /letra cursiva/
const NOVO = 'Embrulhar para presente, sem cartão.'
const CONFIRMACAO = /Observação salva\.|Observação apagada\./

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const corpo = () => document.body.textContent ?? ''

const cenario = (relogio: RespostaRpcReal, gravar: RespostaRpcReal = { status: 201, corpo: [] }) =>
  real.criar({
    sessao: 'valida',
    papel: 'admin',
    cadastro: 'ok',
    rpc: { atelie_clock: relogio },
    tabelas: {
      order_list: { status: 200, corpo: [detalhe({ status: 'paid' })] },
      order_items: { status: 200, corpo: [item()] },
      order_admin_notes: {
        porMetodo: {
          GET: { status: 200, corpo: [OBSERVACAO] },
          POST: gravar,
        },
      },
    },
  })

const abrirDetalhe = () => {
  window.history.pushState({ usr: { doApp: true }, key: 'montado', idx: 0 }, '', pedidoHref(ID))
  render(<App />)
}

const observacao = () => screen.queryByRole('region', { name: 'Observação' })

const perderOPapel = (r: Real) => {
  r.estado.papel = 'not-admin'
  r.estado.rpc = { ...r.estado.rpc, atelie_clock: RECUSA_403 }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  esquecerAcoes()
})
afterEach(() => {
  act(() => esquecerAcoes())
  real.atual?.client.auth.stopAutoRefresh()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('a leitura da observação sobre o client real', () => {
  it('par: com o papel e a RPC em 200, o texto aparece — a régua "nenhum texto" tem alvo', async () => {
    const r = cenario(RELOGIO_OK)
    abrirDetalhe()
    for (let i = 0; i < 80 && !TEXTO_DELA.test(corpo()); i++) await andar(50)
    expect(within(observacao()!).getByText(TEXTO_DELA)).toBeInTheDocument()
    expect(r.quantos(OBSERVACOES)).toBeGreaterThan(0)
  })

  it('`atelie_clock` 403 `42501` + `order_admin_notes` com o texto ⇒ a recusa da `72`, e o texto em instante nenhum', async () => {
    const r = cenario(RECUSA_403)
    abrirDetalhe()
    const instantes: string[] = [corpo()]
    for (let i = 0; i < 60 && r.quantos(RELOGIO) === 0; i++) {
      await andar(50)
      instantes.push(corpo())
    }
    r.estado.papel = 'not-admin'
    for (let feito = 0; feito < 4000; feito += 50) {
      await andar(50)
      instantes.push(corpo())
    }
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    // A consulta saiu e o texto existia do outro lado: é a recusa que o barra.
    expect(r.quantos(OBSERVACOES)).toBeGreaterThan(0)
    expect(instantes.length).toBeGreaterThan(60)
    expect(instantes.findIndex((t) => TEXTO_DELA.test(t))).toBe(-1)
  })
})

describe('a gravação da observação sobre o client real', () => {
  const abrirAFolha = async () => {
    abrirDetalhe()
    for (let i = 0; i < 80 && !screen.queryByTestId('editar-observacao'); i++) await andar(50)
    await act(async () => {
      fireEvent.click(screen.getByTestId('editar-observacao'))
    })
    await andar(50)
    const campo = within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Observação' })
    fireEvent.change(campo, { target: { value: NOVO } })
  }

  const salvarEObservar = async (ms: number) => {
    const entrou: string[] = []
    const obs = new MutationObserver((registros) => {
      for (const m of registros) {
        if (m.type === 'characterData') entrou.push(m.target.textContent ?? '')
        m.addedNodes.forEach((n) => entrou.push(n.textContent ?? ''))
      }
    })
    obs.observe(document.body, { childList: true, subtree: true, characterData: true })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    })
    const instantes = [corpo()]
    for (let feito = 0; feito < ms; feito += 50) {
      await andar(50)
      instantes.push(corpo())
    }
    entrou.push(...obs.takeRecords().flatMap((m) => [...m.addedNodes].map((n) => n.textContent ?? '')))
    obs.disconnect()
    return [...instantes, ...entrou]
  }

  it('par: com o papel de pé, o POST sai com o texto e o upsert por `order_id`, e a confirmação aparece', async () => {
    const r = cenario(RELOGIO_OK, {
      status: 201,
      corpo: [{ order_id: ID, note: NOVO, updated_by: null, updated_by_name: null, updated_at: OBSERVACAO.updated_at }],
    })
    await abrirAFolha()
    const instantes = await salvarEObservar(600)
    const posts = r.chamadasDe('POST', OBSERVACOES)
    expect(posts).toHaveLength(1)
    expect(posts[0].corpo).toMatchObject({ order_id: ID, note: NOVO })
    expect(decodeURIComponent(posts[0].busca)).toContain('on_conflict=order_id')
    expect(instantes.some((t) => CONFIRMACAO.test(t))).toBe(true)
  })

  it('a conta perde o papel antes de salvar ⇒ a recusa da `72`, NENHUM POST e nenhuma confirmação em instante nenhum', async () => {
    const r = cenario(RELOGIO_OK)
    await abrirAFolha()
    const relogioAntes = r.quantos(RELOGIO)
    perderOPapel(r)
    const instantes = await salvarEObservar(4000)
    // A porta conferiu o papel antes de escrever, e a recusa barrou a escrita.
    expect(r.quantos(RELOGIO)).toBeGreaterThan(relogioAntes)
    expect(r.chamadasDe('POST', OBSERVACOES)).toHaveLength(0)
    expect(r.chamadasDe('DELETE', OBSERVACOES)).toHaveLength(0)
    expect(instantes.length).toBeGreaterThan(80)
    expect(instantes.findIndex((t) => CONFIRMACAO.test(t))).toBe(-1)
    expect(instantes.findIndex((t) => /Este pedido mudou enquanto você olhava\./.test(t))).toBe(-1)
    // A recusa nunca é desenhada como falha de gravação: ela vai à vigia, não ao erro da folha.
    expect(instantes.findIndex((t) => /Não consegui salvar\./.test(t))).toBe(-1)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(corpo()).not.toMatch(TEXTO_DELA)
  })

  // A releitura do detalhe fica pendurada: a recusa só pode chegar à vigia pela PRÓPRIA gravação (o
  // `erroBruto` da porta), e não pela leitura que viria depois — sem este caso, a releitura mascarava
  // o caminho (medido: apagar a recusa da gravação da vigia deixava os casos acima verdes).
  it('com a releitura pendurada, a recusa da GRAVAÇÃO sozinha leva à recusa da `72` — nunca à falha da folha', async () => {
    const r = cenario(RELOGIO_OK)
    await abrirAFolha()
    perderOPapel(r)
    r.estado.tabelas = { ...r.estado.tabelas, order_list: 'pendura' }
    const instantes = await salvarEObservar(4000)
    expect(r.chamadasDe('POST', OBSERVACOES)).toHaveLength(0)
    expect(instantes.findIndex((t) => /Não consegui salvar\./.test(t))).toBe(-1)
    expect(instantes.findIndex((t) => CONFIRMACAO.test(t))).toBe(-1)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
  })
})
