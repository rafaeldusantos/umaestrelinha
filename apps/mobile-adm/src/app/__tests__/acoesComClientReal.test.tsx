// Feature `75` · T28 · `MAA-04`, `MAA-21`, `MAA-22`, `MAA-23`, Success Criterion 2 (com o probe da T29)
// — as ações no pedido sobre o `<App />` real e o supabase-js REAL (`src/test/clientReal.ts`): só o
// `fetch` e o storage são nossos. O dono da escrita (`core/order-actions`), a porta (`gravarAcao`) e o
// `PostgrestClient` são os de verdade, então o que se prova aqui é o que a `75` afirma sobre a REDE: o
// PATCH que de fato sai, o `?status=in.(…)` que de fato vai na query, e o que a tela faz com a resposta
// que o PostgREST manda de verdade.
//
// O caso que a feature existe para impedir (`MAA-21`): a RLS de `orders` filtra o `update` de uma conta
// que perdeu o papel e o PostgREST responde **200 com `[]`** — sem erro nenhum. Sem a conferência
// (`atelie_clock`) isso viraria "o pedido mudou", ou pior, sucesso. Aqui o PATCH responde `[]` e a
// conferência responde 403 `42501` (a forma que o PostgREST manda para `raise … errcode '42501'`).
//
// "Em nenhum instante": o DOM é lido a cada passo de 50 ms do relógio falso, do toque até a recusa
// assumir. As frases são escritas por extenso.
process.env.TZ = 'UTC'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { pedidoHref, type PedidoDoDetalhe } from '@/entities/order'
import { esquecerAcoes } from '@/features/order-actions'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { real, type Real, type RespostaRpcReal } from '@/test/clientReal'
import { detalhe, item } from '@/test/pedidos'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const ID = '00000000-0000-4000-8000-000000000244'
const ORDERS = '/rest/v1/orders'
const RELOGIO = '/rest/v1/rpc/atelie_clock'
const MATERIAL = '/rest/v1/rpc/set_material_status'

const RELOGIO_OK: RespostaRpcReal = { status: 200, corpo: { lido_em: '2026-10-23T14:30:00.123456+00:00' } }
const RECUSA_403: RespostaRpcReal = {
  status: 403,
  corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' },
}
const UMA_LINHA: RespostaRpcReal = { status: 200, corpo: [{ id: ID }] }
const ZERO_LINHAS: RespostaRpcReal = { status: 200, corpo: [] }
const ERRO_500: RespostaRpcReal = { status: 500, corpo: { code: 'XX000', details: null, hint: null, message: 'boom' } }
const HISTORICO_OK: RespostaRpcReal = { status: 201, corpo: [] }

/** Qualquer confirmação de ação — nenhuma pode aparecer quando a escrita não valeu. */
const CONFIRMACAO = /Separação iniciada\.|Material registrado\.|Rastreio salvo\.|Retirada registrada\./

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const corpo = () => document.body.textContent ?? ''
const aviso = () => screen.queryByTestId('aviso-da-acao')

type Onde = 'detalhe' | 'cartão'

/** As leituras das duas telas, com o pedido; `orders` responde só à ESCRITA (`PATCH`). */
const cenario = (pedido: PedidoDoDetalhe, extra: { patch?: RespostaRpcReal; material?: RespostaRpcReal } = {}) =>
  real.criar({
    sessao: 'valida',
    papel: 'admin',
    cadastro: 'ok',
    rpc: { atelie_clock: RELOGIO_OK, ...(extra.material ? { set_material_status: extra.material } : {}) },
    tabelas: {
      order_list: { status: 200, corpo: [pedido] },
      order_items: { status: 200, corpo: [item()] },
      orders: { porMetodo: { PATCH: extra.patch ?? UMA_LINHA } },
      order_status_history: { porMetodo: { POST: HISTORICO_OK, GET: { status: 200, corpo: [] } } },
    },
  })

/** O botão da ação na tela escolhida (o rodapé do detalhe, ou o botão no cartão da lista). */
const botao = (onde: Onde) =>
  onde === 'detalhe'
    ? screen.queryByTestId('rodape-da-acao')?.querySelector('button') ?? null
    : screen.queryAllByTestId('acao-do-cartao')[0]?.querySelector('button') ?? null

const abrir = async (onde: Onde, rotulo: string) => {
  const caminho = onde === 'detalhe' ? pedidoHref(ID) : '/pedidos?visao=tudo'
  window.history.pushState(onde === 'detalhe' ? { usr: { doApp: true }, key: 'montado', idx: 0 } : {}, '', caminho)
  render(<App />)
  for (let i = 0; i < 80 && !botao(onde)?.textContent?.includes(rotulo); i++) await andar(50)
  expect(botao(onde)).toHaveTextContent(rotulo)
}

/** A conta PERDE o papel agora: a próxima conferência é 403 `42501` e a próxima consulta do papel, vazia. */
const perderOPapel = (r: Real) => {
  r.estado.papel = 'not-admin'
  r.estado.rpc = { ...r.estado.rpc, atelie_clock: RECUSA_403 }
}

/**
 * Toca e observa por `ms`: o `body` a cada 50 ms do relógio falso **e** todo texto que ENTROU no DOM
 * nesse meio (um `MutationObserver` guarda o texto de cada nó acrescentado e de cada texto alterado).
 * O segundo existe porque a releitura recusada desmonta a tela no MESMO passo de 50 ms em que uma
 * confirmação indevida apareceria — ler só o `body` entre os passos não a veria (medido: o mutante que
 * trata "zero linhas" como sucesso passava pelo detalhe com a leitura por passo, sensor da T28).
 */
const tocarEObservar = async (el: Element, ms: number) => {
  const entrou: string[] = []
  const obs = new MutationObserver((registros) => {
    for (const m of registros) {
      if (m.type === 'characterData') entrou.push(m.target.textContent ?? '')
      m.addedNodes.forEach((n) => entrou.push(n.textContent ?? ''))
    }
  })
  obs.observe(document.body, { childList: true, subtree: true, characterData: true })
  await act(async () => {
    fireEvent.click(el)
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

describe.each(['detalhe', 'cartão'] as const)('"Iniciar separação" pelo %s, sobre o client real', (onde) => {
  it('par: o PATCH devolve a linha ⇒ a confirmação aparece (a régua "nenhuma confirmação" tem alvo)', async () => {
    const r = cenario(detalhe({ status: 'paid' }))
    await abrir(onde, 'Iniciar separação')
    await tocarEObservar(botao(onde)!, 500)
    expect(aviso()).toHaveTextContent('Separação iniciada.')
    const patch = r.chamadasDe('PATCH', ORDERS)
    expect(patch).toHaveLength(1)
    expect(patch[0].corpo).toEqual({ status: 'separating' })
    const busca = decodeURIComponent(patch[0].busca)
    expect(busca).toContain(`id=eq.${ID}`)
    expect(busca).toContain('status=eq.paid')
    expect(busca).toContain('select=id')
    expect(r.chamadasDe('POST', '/rest/v1/order_status_history')).toHaveLength(1)
  })

  it('PATCH 200 com `[]` + `atelie_clock` 403 `42501` ⇒ a recusa da `72`, e NENHUMA confirmação em instante nenhum', async () => {
    const r = cenario(detalhe({ status: 'paid' }), { patch: ZERO_LINHAS })
    await abrir(onde, 'Iniciar separação')
    const relogioAntes = r.quantos(RELOGIO)
    perderOPapel(r)
    const instantes = await tocarEObservar(botao(onde)!, 4000)
    // O PATCH de fato saiu, e a resposta vazia virou PERGUNTA (a conferência foi feita).
    expect(r.chamadasDe('PATCH', ORDERS)).toHaveLength(1)
    expect(r.quantos(RELOGIO)).toBeGreaterThan(relogioAntes)
    expect(instantes.length).toBeGreaterThan(80)
    expect(instantes.findIndex((t) => CONFIRMACAO.test(t))).toBe(-1)
    expect(instantes.findIndex((t) => /Este pedido mudou enquanto você olhava\./.test(t))).toBe(-1)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    // Nada depois do `update` vazio: nem histórico, nem aviso.
    expect(r.chamadasDe('POST', '/rest/v1/order_status_history')).toHaveLength(0)
    expect(r.pedidos.filter((p) => p.startsWith('/functions/v1/'))).toHaveLength(0)
  })

  it('PATCH em 500 ⇒ "Não consegui salvar. Tente de novo.", a rota mantida, NUNCA a recusa (MAA-22)', async () => {
    const r = cenario(detalhe({ status: 'paid' }), { patch: ERRO_500 })
    await abrir(onde, 'Iniciar separação')
    const rota = window.location.pathname + window.location.search
    const instantes = await tocarEObservar(botao(onde)!, 3000)
    expect(r.chamadasDe('PATCH', ORDERS)).toHaveLength(1)
    expect(window.location.pathname + window.location.search).toBe(rota)
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    const lugar = onde === 'detalhe' ? screen.getByTestId('rodape-da-acao') : screen.getAllByTestId('acao-do-cartao')[0]
    expect(within(lugar).getByRole('alert')).toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(instantes.findIndex((t) => CONFIRMACAO.test(t))).toBe(-1)
    // Rede/5xx nunca vira pergunta de papel.
    expect(r.estado.papel).toBe('admin')
  })
})

describe('a conferência SEM REDE depois de zero linhas (rede nunca é recusa, MAA-22/MAA-23)', () => {
  it('PATCH `[]` + `atelie_clock` com a rede caída ⇒ nenhuma recusa, nenhuma reconferência do papel, nenhuma confirmação', async () => {
    const r = cenario(detalhe({ status: 'paid' }), { patch: ZERO_LINHAS })
    await abrir('detalhe', 'Iniciar separação')
    const papeisAntes = r.quantos('/rest/v1/user_roles')
    const relogioAntes = r.quantos(RELOGIO)
    r.estado.rpc = { ...r.estado.rpc, atelie_clock: 'rede' }
    const instantes = await tocarEObservar(botao('detalhe')!, 4000)
    expect(r.chamadasDe('PATCH', ORDERS)).toHaveLength(1)
    expect(r.quantos(RELOGIO)).toBeGreaterThan(relogioAntes)
    expect(window.location.pathname).toBe(pedidoHref(ID))
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    // A recusa entraria na vigia, que reconfere o papel UMA vez (R11); a falha de rede não.
    expect(r.quantos('/rest/v1/user_roles')).toBe(papeisAntes)
    expect(instantes.findIndex((t) => CONFIRMACAO.test(t))).toBe(-1)
    expect(instantes.findIndex((t) => /Este pedido mudou enquanto você olhava\./.test(t))).toBe(-1)
  })
})

describe('"Recebi o material" sobre o client real (RPC `set_material_status`)', () => {
  const AGUARDANDO = () => detalhe({ status: 'paid', material_status: 'aguardando_material' })

  it('par: a RPC responde `ok` ⇒ "Material registrado." (a régua tem alvo)', async () => {
    const r = cenario(AGUARDANDO(), { material: { status: 200, corpo: { ok: true, status: 'material_recebido' } } })
    await abrir('detalhe', 'Recebi o material')
    await tocarEObservar(botao('detalhe')!, 500)
    expect(aviso()).toHaveTextContent('Material registrado.')
    expect(r.chamadasDe('POST', MATERIAL).map((c) => c.corpo)).toEqual([{ p_order_id: ID, p_status: 'material_recebido' }])
    expect(r.chamadasDe('PATCH', ORDERS)).toHaveLength(0)
  })

  it('`{ ok: false, reason: "not_admin" }` ⇒ a recusa da `72`, e nenhuma confirmação em instante nenhum (MAA-04)', async () => {
    const r = cenario(AGUARDANDO(), { material: { status: 200, corpo: { ok: false, reason: 'not_admin' } } })
    await abrir('detalhe', 'Recebi o material')
    perderOPapel(r)
    const instantes = await tocarEObservar(botao('detalhe')!, 4000)
    expect(r.chamadasDe('POST', MATERIAL)).toHaveLength(1)
    expect(instantes.findIndex((t) => CONFIRMACAO.test(t))).toBe(-1)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(r.pedidos.filter((p) => p.startsWith('/functions/v1/'))).toHaveLength(0)
  })
})

describe('"Marcar como enviado" sobre o client real: o que vai no PATCH', () => {
  it('o corpo do rastreio SEM `shipping_carrier`, a query com `status=in.(separating,shipped)`, depois o status', async () => {
    const r = cenario(detalhe({ status: 'separating' }))
    await abrir('detalhe', 'Marcar como enviado')
    await act(async () => {
      fireEvent.click(botao('detalhe')!)
    })
    await andar(100)
    const dialogo = screen.getByRole('dialog', { name: 'Marcar como enviado' })
    fireEvent.change(within(dialogo).getByLabelText('Código de rastreio'), { target: { value: ' an 1234 5678 9br ' } })
    await tocarEObservar(within(dialogo).getByRole('button', { name: 'Salvar' }), 500)

    const patch = r.chamadasDe('PATCH', ORDERS)
    expect(patch).toHaveLength(2)
    expect(patch[0].corpo).toEqual({ tracking_code: 'AN123456789BR' })
    expect(patch[0].corpo).not.toHaveProperty('shipping_carrier')
    const busca0 = decodeURIComponent(patch[0].busca)
    expect(busca0).toContain(`id=eq.${ID}`)
    expect(busca0).toContain('status=in.(separating,shipped)')
    expect(busca0).toContain('select=id')
    expect(patch[1].corpo).toEqual({ status: 'shipped' })
    expect(decodeURIComponent(patch[1].busca)).toContain('status=eq.separating')
    expect(aviso()).toHaveTextContent('Rastreio salvo.')
  })
})

// Feature `82` · T13 — `ENV-10`, A8: `set_material_tracking` responde `not_allowed` IGUAL para "sem papel"
// e "pedido não existe" (de propósito, na RPC) — não existe `not_admin` nela. A porta não o trata como
// recusa direta nem como sucesso: pergunta a `atelie_clock`. `42501` ⇒ a recusa da `72`; papel de pé ⇒
// "Este pedido mudou enquanto você olhava.", com a folha aberta. Sobre o supabase-js REAL.
describe('o código do envelope sobre o client real: `not_allowed` é PERGUNTA (ENV-10)', () => {
  const ENVELOPE = '/rest/v1/rpc/set_material_tracking'
  const NAO_PERMITIDO: RespostaRpcReal = { status: 200, corpo: { ok: false, status: null, reason: 'not_allowed' } }
  const AGUARDANDO = () => detalhe({ status: 'paid', material_status: 'aguardando_material' })
  const CONFIRMOU = /Código do envelope registrado\./

  const cenarioDoEnvelope = (corpo: RespostaRpcReal) => {
    const r = cenario(AGUARDANDO())
    r.estado.rpc = { ...r.estado.rpc, set_material_tracking: corpo }
    return r
  }

  /** Abre a folha do envelope pelo bloco Material e digita um código válido. Devolve o "Salvar". */
  const abrirAFolha = async () => {
    await abrir('detalhe', 'Recebi o material')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Informar código do envelope' }))
    })
    await andar(100)
    const dialogo = screen.getByRole('dialog', { name: 'Código do envelope' })
    fireEvent.change(within(dialogo).getByLabelText('Código de rastreio do envio da cliente'), { target: { value: 'an 123456789 br' } })
    return within(dialogo).getByRole('button', { name: 'Salvar' })
  }

  it('par: a RPC responde `ok` ⇒ "Código do envelope registrado." (a régua tem alvo)', async () => {
    const r = cenarioDoEnvelope({ status: 200, corpo: { ok: true, status: 'material_enviado', reason: null } })
    const salvar = await abrirAFolha()
    await tocarEObservar(salvar, 500)
    expect(r.chamadasDe('POST', ENVELOPE).map((c) => c.corpo)).toEqual([{ p_order_id: ID, p_code: 'AN123456789BR' }])
    expect(aviso()).toHaveTextContent('Código do envelope registrado.')
    expect(r.chamadasDe('PATCH', ORDERS)).toHaveLength(0)
  })

  it('`not_allowed` + `atelie_clock` 403 `42501` ⇒ a recusa da `72`, e NENHUM aviso de sucesso em instante nenhum', async () => {
    const r = cenarioDoEnvelope(NAO_PERMITIDO)
    const salvar = await abrirAFolha()
    const relogioAntes = r.quantos(RELOGIO)
    perderOPapel(r)
    const instantes = await tocarEObservar(salvar, 4000)
    expect(r.chamadasDe('POST', ENVELOPE)).toHaveLength(1)
    // A resposta virou PERGUNTA: a conferência foi feita.
    expect(r.quantos(RELOGIO)).toBeGreaterThan(relogioAntes)
    expect(instantes.length).toBeGreaterThan(80)
    expect(instantes.findIndex((t) => CONFIRMOU.test(t))).toBe(-1)
    expect(instantes.findIndex((t) => /Este pedido mudou enquanto você olhava\./.test(t))).toBe(-1)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    // Nada depois da recusa: nenhum aviso à cliente nem à dona.
    expect(r.pedidos.filter((p) => p.startsWith('/functions/v1/'))).toHaveLength(0)
  })

  it('`not_allowed` com `atelie_clock` 200 (papel de pé) ⇒ "Este pedido mudou…" NA folha, aberta — nunca a recusa nem o sucesso', async () => {
    const r = cenarioDoEnvelope(NAO_PERMITIDO)
    const salvar = await abrirAFolha()
    const relogioAntes = r.quantos(RELOGIO)
    const instantes = await tocarEObservar(salvar, 1500)
    expect(r.chamadasDe('POST', ENVELOPE)).toHaveLength(1)
    expect(r.quantos(RELOGIO)).toBeGreaterThan(relogioAntes)
    const dialogo = screen.getByRole('dialog', { name: 'Código do envelope' })
    expect(within(dialogo).getByRole('alert')).toHaveTextContent('Este pedido mudou enquanto você olhava.')
    expect(instantes.findIndex((t) => CONFIRMOU.test(t))).toBe(-1)
    expect(window.location.pathname).toBe(pedidoHref(ID))
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(r.estado.papel).toBe('admin')
    expect(r.pedidos.filter((p) => p.startsWith('/functions/v1/'))).toHaveLength(0)
  })
})
