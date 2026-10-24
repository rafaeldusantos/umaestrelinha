import { beforeEach, describe, expect, it } from 'vitest'

import { runAppAction, type LinhaDaAcao } from '../appAction.ts'
import { ERRO, ZERO_LINHAS, criarDuble, passosDe, type Duble } from './dubleDoClient.ts'

// Feature `75` · `MAA-02`, `07`, `08`, `09`, `13`, `14`, `15`, `38`, `40` — a ação do app, composta
// sobre as três escritas (design §5.2). Um caso por ramo e **um caso por passo que falha provando
// que o seguinte não roda** (`L-050`): a ordem é lida do `log` do dublê, nunca suposta.

const ID = 'ord-1'
let d: Duble

const linha = (parcial: Partial<LinhaDaAcao>): LinhaDaAcao => ({
  id: ID,
  status: 'paid',
  material_status: 'nao_aplicavel',
  tracking_code: null,
  payment_method: 'pix',
  shipping_service_id: '1',
  ...parcial,
})

const rpcOk = (status: string) => () => ({ data: { ok: true, status, reason: null }, error: null })

/** Responde por tabela e pelo valor do `update`: `status` × `tracking_code`. */
const porPasso =
  (r: { status?: unknown; tracking?: unknown; historico?: unknown }) =>
  (c: { tabela: string; passos: unknown[][] }) => {
    if (c.tabela === 'order_status_history') return r.historico ?? { data: null, error: null }
    const valores = c.passos[0][1] as Record<string, unknown>
    const escolhido = 'status' in valores ? r.status : r.tracking
    if (escolhido instanceof Error) throw escolhido
    return escolhido ?? { data: [{ id: ID }], error: null }
  }

beforeEach(() => {
  d = criarDuble()
})

describe('Recebi o material', () => {
  const row = linha({ status: 'pending', material_status: 'aguardando_material' })

  it('só `set_material_status("material_recebido")` — nenhuma cadeia de tabela', async () => {
    const r = await runAppAction(d.deps, row, { tipo: 'primaria' })

    expect(r).toEqual({ tipo: 'ok', emailSent: true, materialMudou: false })
    expect(d.rpcs).toEqual([{ fn: 'set_material_status', args: { p_order_id: ID, p_status: 'material_recebido' } }])
    expect(d.cadeias).toEqual([])
    expect(d.log).toEqual(['rpc set_material_status', 'notify material_status_changed'])
  })

  it('`sem-papel` é repassado', async () => {
    d.responderRpc = () => ({ data: { ok: false, status: null, reason: 'not_admin' }, error: null })
    expect(await runAppAction(d.deps, row, { tipo: 'primaria' })).toEqual({ tipo: 'sem-papel' })
  })

  it('`material-recusado` é repassado com o alvo', async () => {
    d.responderRpc = () => ({ data: { ok: false, status: 'em_producao', reason: 'invalid_transition' }, error: null })
    expect(await runAppAction(d.deps, row, { tipo: 'primaria' })).toEqual({
      tipo: 'material-recusado',
      reason: 'invalid_transition',
      status: 'em_producao',
      to: 'material_recebido',
    })
  })

  it('`falhou` é repassado', async () => {
    d.responderRpc = () => ({ data: null, error: { message: 'rede' } })
    expect(await runAppAction(d.deps, row, { tipo: 'primaria' })).toEqual({ tipo: 'falhou', erro: { message: 'rede' } })
  })
})

describe('Iniciar separação COM o material na bancada (`MAA-07`..`MAA-09`, `MAA-40`)', () => {
  const row = linha({ status: 'paid', material_status: 'material_recebido' })

  it('material `em_producao` ANTES, depois o status com a guarda `paid`, histórico e o aviso do status', async () => {
    d.responderRpc = rpcOk('em_producao')
    const r = await runAppAction(d.deps, row, { tipo: 'primaria' })

    expect(r).toEqual({ tipo: 'ok', emailSent: true, materialMudou: true })
    expect(d.rpcs).toEqual([{ fn: 'set_material_status', args: { p_order_id: ID, p_status: 'em_producao' } }])
    expect(passosDe(d, 'orders')).toEqual([
      [
        ['update', { status: 'separating' }],
        ['eq', 'id', ID],
        ['eq', 'status', 'paid'],
        ['select', 'id'],
      ],
    ])
    expect(passosDe(d, 'order_status_history')).toEqual([
      [['insert', { order_id: ID, from_status: 'paid', to_status: 'separating', note: null }]],
    ])
    expect(d.log).toEqual([
      'rpc set_material_status',
      'notify material_status_changed',
      'update orders',
      'insert order_status_history',
      'notify order_status_changed',
    ])
  })

  it('o `emailSent` é o do aviso do MATERIAL (`in_production`) — o de `separating` não produz e-mail', async () => {
    d.responderRpc = rpcOk('em_producao')
    d.notify.mockImplementation(async (_id: string, gatilho: string) => gatilho !== 'material_status_changed')
    expect(await runAppAction(d.deps, row, { tipo: 'primaria' })).toEqual({ tipo: 'ok', emailSent: false, materialMudou: true })
  })

  it.each([
    ['recusado', () => ({ data: { ok: false, status: 'aguardando_material', reason: 'invalid_transition' }, error: null })],
    ['sem papel', () => ({ data: { ok: false, status: null, reason: 'not_admin' }, error: null })],
    ['com erro', () => ({ data: null, error: { message: 'rede' } })],
  ])('material %s ⇒ ZERO `update` de status (`MAA-09`)', async (_r, rpc) => {
    d.responderRpc = rpc
    const r = await runAppAction(d.deps, row, { tipo: 'primaria' })

    expect(r.tipo).not.toBe('ok')
    expect(d.cadeias).toEqual([])
    expect(d.log).toEqual(['rpc set_material_status'])
  })

  it('o recusado volta com o alvo `em_producao`', async () => {
    d.responderRpc = () => ({ data: { ok: false, status: 'aguardando_material', reason: 'invalid_transition' }, error: null })
    expect(await runAppAction(d.deps, row, { tipo: 'primaria' })).toEqual({
      tipo: 'material-recusado',
      reason: 'invalid_transition',
      status: 'aguardando_material',
      to: 'em_producao',
    })
  })

  it.each([
    ['falhou', ERRO, 'falhou'],
    ['zero linhas', ZERO_LINHAS, 'nenhuma-linha'],
  ])('status %s DEPOIS do material ⇒ `parcial` etapa material, causa `%s`, sem histórico (`MAA-40`)', async (_r, resposta, causa) => {
    d.responderRpc = rpcOk('em_producao')
    d.responder = porPasso({ status: resposta })
    const r = await runAppAction(d.deps, row, { tipo: 'primaria' })

    expect(r).toEqual({ tipo: 'parcial', etapa: 'material', causa })
    expect(passosDe(d, 'order_status_history')).toEqual([])
    expect(d.log).toEqual(['rpc set_material_status', 'notify material_status_changed', 'update orders'])
  })
})

describe('Iniciar separação SEM o material', () => {
  it('só o status; `materialMudou` falso', async () => {
    const r = await runAppAction(d.deps, linha({ status: 'paid', material_status: 'nao_aplicavel' }), { tipo: 'primaria' })

    expect(r).toEqual({ tipo: 'ok', emailSent: true, materialMudou: false })
    expect(d.rpcs).toEqual([])
    expect(passosDe(d, 'orders')[0]).toEqual([
      ['update', { status: 'separating' }],
      ['eq', 'id', ID],
      ['eq', 'status', 'paid'],
      ['select', 'id'],
    ])
  })

  it('a RETENTATIVA de `MAA-40` (material já `em_producao`, status `paid`) grava só o status, zero RPC', async () => {
    const r = await runAppAction(d.deps, linha({ status: 'paid', material_status: 'em_producao' }), { tipo: 'primaria' })

    expect(r.tipo).toBe('ok')
    expect(d.rpcs).toEqual([])
    expect(passosDe(d, 'orders')).toHaveLength(1)
  })

  it('a mesma RETENTATIVA com `espera: separar` ainda grava só o status quando a linha ainda é `separar`', async () => {
    const r = await runAppAction(d.deps, linha({ status: 'paid', material_status: 'em_producao' }), { tipo: 'primaria', espera: 'separar' })

    expect(r.tipo).toBe('ok')
    expect(d.rpcs).toEqual([])
    expect(passosDe(d, 'orders')).toHaveLength(1)
  })

  // QA C01: a linha relida já não oferece "Iniciar separação" (outra aba a levou a `separating`, o
  // painel a cancelou) ⇒ `mudou`, sem ir à rede — nunca `falhou` ("Não consegui salvar" sem tentar).
  it.each([
    ['`separating` (outra aba)', linha({ status: 'separating', material_status: 'em_producao' })],
    ['`cancelled` (o painel)', linha({ status: 'cancelled', material_status: 'em_producao' })],
    ['`separating` de retirada (a ação virou "retirado")', linha({ status: 'separating', material_status: 'em_producao', shipping_service_id: 'retirada' })],
  ])('RETENTATIVA com `espera: separar` sobre a linha relida %s ⇒ `mudou`, nenhuma ida à rede', async (_r, row) => {
    expect(await runAppAction(d.deps, row, { tipo: 'primaria', espera: 'separar' })).toEqual({ tipo: 'mudou' })
    expect(d.log).toEqual([])
  })

  it.each([
    ['falhou', ERRO, { tipo: 'falhou', erro: ERRO.error }],
    ['zero linhas', ZERO_LINHAS, { tipo: 'nenhuma-linha' }],
  ])('status %s sem material ⇒ o desfecho do status, nunca `parcial`', async (_r, resposta, esperado) => {
    d.responder = porPasso({ status: resposta })
    expect(await runAppAction(d.deps, linha({ status: 'paid' }), { tipo: 'primaria' })).toEqual(esperado)
  })
})

describe('Marcar como enviado — rastreio a partir de `separating` (`MAA-13`..`MAA-15`)', () => {
  const row = linha({ status: 'separating', tracking_code: null })
  const pedido = { tipo: 'rastreio' as const, codigo: ' an 123 456 789 br ', origem: 'acao' as const }

  it('código NORMALIZADO, sem transportadora, guarda `[separating, shipped]` → status `shipped` com guarda → histórico → UM aviso', async () => {
    const r = await runAppAction(d.deps, row, pedido)

    expect(r).toEqual({ tipo: 'ok', emailSent: true, materialMudou: false })
    expect(passosDe(d, 'orders')).toEqual([
      [
        ['update', { tracking_code: 'AN123456789BR' }],
        ['eq', 'id', ID],
        ['in', 'status', ['separating', 'shipped']],
        ['select', 'id'],
      ],
      [
        ['update', { status: 'shipped' }],
        ['eq', 'id', ID],
        ['eq', 'status', 'separating'],
        ['select', 'id'],
      ],
    ])
    expect(passosDe(d, 'order_status_history')).toEqual([
      [['insert', { order_id: ID, from_status: 'separating', to_status: 'shipped', note: null }]],
    ])
    expect(d.notify).toHaveBeenCalledTimes(1)
    expect(d.log).toEqual(['update orders', 'update orders', 'insert order_status_history', 'notify order_status_changed'])
  })

  it.each([
    ['zero linhas', ZERO_LINHAS, { tipo: 'nenhuma-linha' }],
    ['erro', ERRO, { tipo: 'falhou', erro: ERRO.error }],
  ])('passo 1 com %s ⇒ o desfecho dele e NADA depois', async (_r, resposta, esperado) => {
    d.responder = porPasso({ tracking: resposta })
    expect(await runAppAction(d.deps, row, pedido)).toEqual(esperado)
    expect(d.log).toEqual(['update orders'])
    expect(d.notify).not.toHaveBeenCalled()
  })

  it.each([
    ['falhou', ERRO, 'falhou'],
    ['zero linhas', ZERO_LINHAS, 'nenhuma-linha'],
  ])('passo 2 %s ⇒ `parcial` etapa rastreio, sem histórico e sem aviso', async (_r, resposta, causa) => {
    d.responder = porPasso({ status: resposta })
    expect(await runAppAction(d.deps, row, pedido)).toEqual({ tipo: 'parcial', etapa: 'rastreio', causa })
    expect(d.log).toEqual(['update orders', 'update orders'])
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('O PULO: código igual ao salvo em modo `enviar` ⇒ zero `update` do código, um de status (`MAA-15` a)', async () => {
    const r = await runAppAction(d.deps, linha({ status: 'separating', tracking_code: 'AN123456789BR' }), pedido)

    expect(r.tipo).toBe('ok')
    expect(passosDe(d, 'orders')).toEqual([
      [
        ['update', { status: 'shipped' }],
        ['eq', 'id', ID],
        ['eq', 'status', 'separating'],
        ['select', 'id'],
      ],
    ])
    expect(d.notify).toHaveBeenCalledTimes(1)
  })

  it('código DIFERENTE do salvo em `enviar` grava o novo', async () => {
    await runAppAction(d.deps, linha({ status: 'separating', tracking_code: 'XX000000000BR' }), pedido)
    expect(passosDe(d, 'orders')[0][0]).toEqual(['update', { tracking_code: 'AN123456789BR' }])
  })
})

describe('Rastreio a partir de `shipped`/`delivered` — só o código', () => {
  it('`shipped` sem código (`salvar`, do rodapé): guarda `[shipped]`, sem histórico, um aviso, nunca status', async () => {
    const r = await runAppAction(d.deps, linha({ status: 'shipped' }), {
      tipo: 'rastreio',
      codigo: 'AN123456789BR',
      origem: 'acao',
    })

    expect(r).toEqual({ tipo: 'ok', emailSent: true, materialMudou: false })
    expect(passosDe(d, 'orders')).toEqual([
      [
        ['update', { tracking_code: 'AN123456789BR' }],
        ['eq', 'id', ID],
        ['in', 'status', ['shipped']],
        ['select', 'id'],
      ],
    ])
    expect(passosDe(d, 'order_status_history')).toEqual([])
    expect(d.log).toEqual(['update orders', 'notify order_status_changed'])
  })

  it('`alterar` com o MESMO código ainda grava (Q9)', async () => {
    await runAppAction(d.deps, linha({ status: 'shipped', tracking_code: 'AN123456789BR' }), {
      tipo: 'rastreio',
      codigo: 'AN123456789BR',
      origem: 'entrega',
    })
    expect(passosDe(d, 'orders')).toHaveLength(1)
    expect(passosDe(d, 'orders')[0][0]).toEqual(['update', { tracking_code: 'AN123456789BR' }])
  })

  it('`delivered` (da Entrega): guarda `[delivered]`, só o código, um aviso', async () => {
    await runAppAction(d.deps, linha({ status: 'delivered' }), { tipo: 'rastreio', codigo: 'AN123456789BR', origem: 'entrega' })
    expect(passosDe(d, 'orders')).toEqual([
      [
        ['update', { tracking_code: 'AN123456789BR' }],
        ['eq', 'id', ID],
        ['in', 'status', ['delivered']],
        ['select', 'id'],
      ],
    ])
    expect(d.notify).toHaveBeenCalledTimes(1)
  })

  it('zero linhas ⇒ `nenhuma-linha`, sem aviso', async () => {
    d.responder = () => ZERO_LINHAS
    expect(
      await runAppAction(d.deps, linha({ status: 'shipped' }), { tipo: 'rastreio', codigo: 'AN123456789BR', origem: 'acao' }),
    ).toEqual({ tipo: 'nenhuma-linha' })
    expect(d.notify).not.toHaveBeenCalled()
  })
})

describe('Marcar como retirado', () => {
  it('status `separating → delivered` com a guarda, histórico e o aviso', async () => {
    const r = await runAppAction(d.deps, linha({ status: 'separating', shipping_service_id: 'retirada' }), { tipo: 'primaria' })

    expect(r).toEqual({ tipo: 'ok', emailSent: true, materialMudou: false })
    expect(passosDe(d, 'orders')).toEqual([
      [
        ['update', { status: 'delivered' }],
        ['eq', 'id', ID],
        ['eq', 'status', 'separating'],
        ['select', 'id'],
      ],
    ])
    expect(passosDe(d, 'order_status_history')).toEqual([
      [['insert', { order_id: ID, from_status: 'separating', to_status: 'delivered', note: null }]],
    ])
  })
})

describe('Nenhuma chamada quando não há o que gravar', () => {
  it('código que `trackingCodeRefusal` recusa ⇒ nenhuma ida à rede', async () => {
    const r = await runAppAction(d.deps, linha({ status: 'separating' }), { tipo: 'rastreio', codigo: ' ab 12 ', origem: 'acao' })
    expect(r.tipo).toBe('falhou')
    expect(d.log).toEqual([])
  })

  it.each([
    ['retirada (sem rastreio, `MAA-16`)', linha({ status: 'shipped', shipping_service_id: 'retirada' })],
    ['`paid` (sem folha)', linha({ status: 'paid' })],
  ])('rastreio pedido para %s ⇒ nenhuma ida à rede', async (_r, row) => {
    const r = await runAppAction(d.deps, row, { tipo: 'rastreio', codigo: 'AN123456789BR', origem: 'acao' })
    expect(r.tipo).toBe('falhou')
    expect(d.log).toEqual([])
  })

  it.each([
    ['entregue', linha({ status: 'delivered' })],
    ['cancelado com material aguardando', linha({ status: 'cancelled', material_status: 'aguardando_material' })],
    ['`separating` não retirada (a ação é a folha)', linha({ status: 'separating' })],
  ])('ação primária pedida para %s ⇒ nenhuma ida à rede', async (_r, row) => {
    const r = await runAppAction(d.deps, row, { tipo: 'primaria' })
    expect(r.tipo).toBe('falhou')
    expect(d.log).toEqual([])
  })
})
