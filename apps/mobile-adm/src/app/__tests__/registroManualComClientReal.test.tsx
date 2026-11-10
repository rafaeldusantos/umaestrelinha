// O pagamento registrado à mão sobre o `<App />` real e o supabase-js REAL (`src/test/clientReal.ts`) —
// molde de `observacaoComClientReal`. Só o `fetch` e o storage são nossos: o `lerComPapel` e o detalhe
// são os de verdade.
//
// O que se prova: a conta SEM papel não vê o registro. `order_manual_payments` responde com o registro
// do outro lado (a RLS o filtraria; aqui ele chega, para a régua ter alvo), e a recusa vem de
// `atelie_clock` em 403 `42501`. "Em nenhum instante": o DOM é lido a cada passo de 50 ms do relógio
// falso. O par com a RPC em 200 prova que a página desenha o registro — a régua "nenhum texto" tem alvo.
process.env.TZ = 'UTC'

import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { pedidoHref } from '@/entities/order'
import { esquecerAcoes } from '@/features/order-actions'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { real, type RespostaRpcReal } from '@/test/clientReal'
import { detalhe, item } from '@/test/pedidos'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const ID = '00000000-0000-4000-8000-000000000244'
const RELOGIO = '/rest/v1/rpc/atelie_clock'
const REGISTROS = '/rest/v1/order_manual_payments'
const RELOGIO_OK: RespostaRpcReal = { status: 200, corpo: { lido_em: '2026-10-23T14:30:00.123456+00:00' } }
const RECUSA_403: RespostaRpcReal = {
  status: 403,
  corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' },
}
const REGISTRO = { method: 'transferencia', paid_at: '2026-11-08T15:30:00+00:00', note: 'Transferiu da conta do marido.' }
const TEXTO_DO_REGISTRO = /Registrado à mão|conta do marido/

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const corpo = () => document.body.textContent ?? ''

const cenario = (relogio: RespostaRpcReal) =>
  real.criar({
    sessao: 'valida',
    papel: 'admin',
    cadastro: 'ok',
    rpc: { atelie_clock: relogio },
    tabelas: {
      order_list: { status: 200, corpo: [detalhe({ status: 'paid', payment_status: 'approved' })] },
      order_items: { status: 200, corpo: [item()] },
      order_manual_payments: { status: 200, corpo: [REGISTRO] },
    },
  })

const abrirDetalhe = () => {
  window.history.pushState({ usr: { doApp: true }, key: 'montado', idx: 0 }, '', pedidoHref(ID))
  render(<App />)
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

describe('o registro manual sobre o client real', () => {
  it('par: com o papel e a RPC em 200, o detalhe mostra o registro (meio e observação), sem comprovante', async () => {
    const r = cenario(RELOGIO_OK)
    abrirDetalhe()
    for (let i = 0; i < 80 && !/conta do marido/.test(corpo()); i++) await andar(50)
    expect(screen.getByText('Registrado à mão')).toBeInTheDocument()
    expect(screen.getByText('Transferência')).toBeInTheDocument()
    expect(screen.getByText('Transferiu da conta do marido.')).toBeInTheDocument()
    expect(corpo()).not.toMatch(/comprovante/i)
    expect(r.quantos(REGISTROS)).toBeGreaterThan(0)
    expect(r.quantos('/rest/v1/order_manual_payment_receipts')).toBe(0)
  })

  it('`atelie_clock` 403 `42501` + o registro do outro lado ⇒ a recusa da `72`, e o registro em instante nenhum', async () => {
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
    // A consulta saiu e o registro existia do outro lado: é a recusa que o barra.
    expect(r.quantos(REGISTROS)).toBeGreaterThan(0)
    expect(instantes.length).toBeGreaterThan(60)
    expect(instantes.findIndex((t) => TEXTO_DO_REGISTRO.test(t))).toBe(-1)
  })
})
