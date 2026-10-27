// Feature `75` · T23..T26 — as ações no pedido pela árvore REAL (`<App />` com sessão admin sobre o
// dublê do client, que REGISTRA cada escrita, RPC e invocação). O dono da escrita (`core/order-actions`)
// e a porta do app (`gravarAcao`) são os de verdade: o que se prova é a tela inteira — o rodapé, a
// folha, a confirmação, o erro, a recusa — sobre o que de fato foi mandado ao banco.
//
// T23: `MAA-01`..`MAA-09`, `MAA-13`, `MAA-15`, `MAA-16`, `MAA-20`..`MAA-26`, `MAA-31`, `MAA-35`,
// `MAA-38`, `MAA-40`, `MAA-41`. T24: `MAA-11`, `MAA-14`, `MAA-16`. T25: `MAA-17`..`MAA-19`.
// T26: `MAA-36`, `MAA-37`, `MAA-16` (cartão), `MAA-20` (trava compartilhada).
//
// As frases são escritas POR EXTENSO (nunca lidas da constante que provam).
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chargeMaterialUrl as chargeMaterialUrlDoPainel } from '../../../../backoffice/src/features/order-list/model/chargeMaterial'

import { pedidoHref, type PedidoDoDetalhe } from '@/entities/order'
import { esquecerAcoes } from '@/features/order-actions'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { esquecerRolagens } from '@/shared/lib/useRolagemRestaurada'
import { RESERVA_DO_RODAPE, RODAPE_NO_FIM } from '@/shared/ui/alturas'
import { fake, type Elo, type RespostaTabela } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { DETALHE_DE_RETIRADA, NOTA, detalhe, item, statusRow } from '@/test/pedidos'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
const ID = '00000000-0000-4000-8000-000000000244'
const AVISO = 'send-notification?action=trigger'

const UMA_LINHA: RespostaTabela = { data: [{ id: ID }], error: null }
const ZERO_LINHAS: RespostaTabela = { data: [], error: null }
const ERRO_500: RespostaTabela = { data: null, error: { message: 'Internal Server Error', code: 'XX000' } }
const ENVIOU = { data: { sent: true }, error: null }
const NAO_ENVIOU = { data: { sent: false }, error: null }

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const ehDetalhe = (cadeia: Elo[]) => cadeia.some((e) => e.metodo === 'maybeSingle')
const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

/** O banco do caso: `atual` é o pedido que a PRÓXIMA leitura devolve. */
let atual: PedidoDoDetalhe | null
const responder = (pedido: PedidoDoDetalhe | null, notificacoes: unknown[] = []) => {
  atual = pedido
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
  fake.responderTabela('order_list', (cadeia): RespostaTabela =>
    ehDetalhe(cadeia) ? { data: atual, error: null } : { data: atual ? [atual] : [], error: null, count: atual ? 1 : 0 },
  )
  fake.responderTabela('order_items', { data: [item()], error: null })
  fake.responderTabela('order_status_history', { data: [statusRow()], error: null })
  fake.responderTabela('order_notes', { data: [NOTA], error: null })
  fake.responderTabela('order_notifications', { data: notificacoes, error: null })
}
const abrir = async () => {
  await montarApp(pedidoHref(ID), { estado: { doApp: true } })
  await andar(50)
}

const rodape = () => screen.queryByTestId('rodape-da-acao')
const botaoDoRodape = () => within(rodape()!).getByRole('button', { name: /./ })
const aviso = () => screen.queryByTestId('aviso-da-acao')
const alerta = () => (rodape() ? within(rodape()!).queryByRole('alert') : null)
const tocar = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el)
  })
  await andar(50)
}
const escritasDeOrders = () => fake.escritasDe('orders')
const valoresDe = (i: number) => escritasDeOrders()[i].valores[0]

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  esquecerRolagens()
  esquecerAcoes()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  act(() => esquecerAcoes())
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------------------------
// T23 — o rodapé no detalhe
// ---------------------------------------------------------------------------------------------

describe('o rodapé por estado (MAA-01, MAA-06, MAA-10, MAA-16, MAA-38)', () => {
  it.each([
    ['material aguardando', detalhe({ status: 'paid', material_status: 'aguardando_material' }), 'Recebi o material'],
    ['material a caminho', detalhe({ status: 'paid', material_status: 'material_enviado' }), 'Recebi o material'],
    ['pago, sem material', detalhe({ status: 'paid' }), 'Iniciar separação'],
    ['em separação', detalhe({ status: 'separating' }), 'Marcar como enviado'],
    ['enviado sem código', detalhe({ status: 'shipped', tracking_code: null }), 'Salvar rastreio'],
    ['retirada em separação', { ...DETALHE_DE_RETIRADA, status: 'separating' }, 'Marcar como retirado'],
  ] as const)('%s ⇒ "%s"', async (_n, pedido, rotulo) => {
    responder(pedido)
    await abrir()
    expect(botaoDoRodape()).toHaveTextContent(rotulo)
  })

  it.each([
    ['cancelado com o material aguardando', detalhe({ status: 'cancelled', payment_status: 'cancelled', material_status: 'aguardando_material' })],
    ['entregue', detalhe({ status: 'delivered', tracking_code: 'BR987654321BR' })],
    ['pendente', detalhe({ status: 'pending', payment_status: 'pending' })],
    ['enviado com código', detalhe({ status: 'shipped', tracking_code: 'BR123456789BR' })],
    ['retirada entregue', { ...DETALHE_DE_RETIRADA, status: 'delivered' }],
  ])('%s ⇒ SEM rodapé, e sem reserva', async (_n, pedido) => {
    responder(pedido as PedidoDoDetalhe)
    await abrir()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pedido #0244')
    expect(rodape()).toBeNull()
    expect(screen.queryByTestId('reserva-do-rodape')).toBeNull()
  })

  it('retirada NUNCA tem folha: nem no rodapé, nem "Informar/Alterar" (MAA-16)', async () => {
    responder({ ...DETALHE_DE_RETIRADA, status: 'shipped' })
    await abrir()
    expect(rodape()).toBeNull()
    expect(screen.queryByTestId('editar-rastreio')).toBeNull()
  })
})

describe('a forma do rodapé (MAA-31, prova de forma; a medida é da T31)', () => {
  it('fixo, largura inteira, acima da barra; botão de `min-h-12`; a reserva no fim do conteúdo', async () => {
    responder(detalhe({ status: 'paid' }))
    await abrir()
    expect(tokens(rodape())).toEqual(expect.arrayContaining(['fixed', 'inset-x-0', ...RODAPE_NO_FIM.split(' ')]))
    // No detalhe a barra de abas não é desenhada (protótipo, 2026-10-26).
    expect(screen.queryByRole('navigation', { name: 'Áreas do ateliê' })).toBeNull()
    expect(tokens(botaoDoRodape())).toEqual(expect.arrayContaining(['min-h-12', 'w-full']))
    const reserva = screen.getByTestId('reserva-do-rodape')
    expect(tokens(reserva)).toContain(RESERVA_DO_RODAPE)
    expect(reserva).toHaveAttribute('aria-hidden', 'true')
    // A reserva vem DEPOIS do Histórico, no fluxo da página.
    const historico = screen.getByRole('region', { name: 'Histórico' })
    expect(historico.compareDocumentPosition(reserva) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.documentElement.style.getPropertyValue('--altura-do-rodape')).not.toBe('')
  })
})

describe('"Recebi o material" (MAA-02..MAA-05)', () => {
  const AGUARDANDO = () => detalhe({ status: 'paid', material_status: 'aguardando_material' })

  it('UMA RPC com `material_recebido`, um aviso, a confirmação COM e-mail — e o pedido relido', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_status', () => {
      atual = detalhe({ status: 'paid', material_status: 'material_recebido' })
      return { data: { ok: true, status: 'material_recebido' }, error: null }
    })
    fake.filaDeInvocacao(AVISO, ENVIOU)
    await abrir()
    const relidasAntes = fake.cadeiasDe('order_list').filter(ehDetalhe).length
    await tocar(botaoDoRodape())
    expect(fake.chamadasDe('set_material_status')).toEqual([{ nome: 'set_material_status', args: [{ p_order_id: ID, p_status: 'material_recebido' }] }])
    expect(fake.invocacoesDe(AVISO)).toHaveLength(1)
    expect((fake.invocacoesDe(AVISO)[0].opcoes as { body: unknown }).body).toEqual({ order_id: ID, trigger: 'material_status_changed' })
    expect(aviso()).toHaveTextContent('Material registrado.')
    expect(aviso()).toHaveTextContent('O pedido #0244 foi para a bancada. Marina recebe a confirmação por e-mail.')
    expect(escritasDeOrders()).toHaveLength(0)
    expect(fake.cadeiasDe('order_list').filter(ehDetalhe).length).toBeGreaterThan(relidasAntes)
    // Relido: o rodapé mostra a ação do estado novo.
    expect(botaoDoRodape()).toHaveTextContent('Iniciar separação')
    expect(fake.esgotamentos()).toEqual([])
  })

  it('o aviso que NÃO saiu (o idempotente de MAA-05, ou outra admin antes): a confirmação SEM e-mail, sem erro', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_status', { data: { ok: true, status: 'material_recebido' }, error: null })
    fake.filaDeInvocacao(AVISO, NAO_ENVIOU)
    await abrir()
    await tocar(botaoDoRodape())
    expect(aviso()).toHaveTextContent('Material registrado.')
    expect(aviso()!.textContent).toContain('O pedido #0244 foi para a bancada.')
    expect(aviso()!.textContent).not.toMatch(/e-mail/)
    expect(alerta()).toBeNull()
  })

  it('`invalid_transition`: o motivo legível de `core`, nada dito como gravado (MAA-03)', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_status', { data: { ok: false, reason: 'invalid_transition', status: 'em_producao' }, error: null })
    await abrir()
    await tocar(botaoDoRodape())
    expect(alerta()).toHaveTextContent(
      'Este pedido está em “Em produção”. “Material recebido” só é possível a partir de “Aguardando material” ou “Material a caminho”.',
    )
    expect(aviso()).toBeNull()
    expect(fake.invocacoesDe(AVISO)).toHaveLength(0)
  })

  it('`order_not_found`: a releitura leva a "Não encontrei este pedido." (MAA-04)', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_status', () => {
      atual = null
      return { data: { ok: false, reason: 'order_not_found' }, error: null }
    })
    await abrir()
    await tocar(botaoDoRodape())
    expect(screen.getByText('Não encontrei este pedido.')).toBeInTheDocument()
    expect(aviso()).toBeNull()
    expect(rodape()).toBeNull()
  })

  it('`not_admin` com o papel AINDA admin: a recusa da porta entra na vigia — UMA reconferência — e o pedido volta (R11)', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_status', { data: { ok: false, reason: 'not_admin' }, error: null })
    await abrir()
    const papeis = () => fake.estado.tabelas.filter((t) => t === 'user_roles').length
    const antes = papeis()
    await tocar(botaoDoRodape())
    await andar(3000)
    expect(papeis()).toBe(antes + 1)
    expect(window.location.pathname).toBe(pedidoHref(ID))
    expect(screen.getByRole('region', { name: 'Cliente' })).toBeInTheDocument()
    expect(aviso()).toBeNull()
    await andar(30_000)
    expect(papeis()).toBe(antes + 1)
  })

  it('`not_admin`: a recusa da 72 — e NENHUMA confirmação em instante nenhum (MAA-04, MAA-21)', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_status', () => {
      fake.estado.admins.clear()
      fake.falharRpc('atelie_clock', RECUSA)
      return { data: { ok: false, reason: 'not_admin' }, error: null }
    })
    await abrir()
    await act(async () => {
      fireEvent.click(botaoDoRodape())
    })
    for (let i = 0; i < 60; i++) {
      await andar(50)
      expect(document.body.textContent).not.toMatch(/Material registrado/)
      expect(aviso()).toBeNull()
    }
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
  })
})

describe('"Iniciar separação" (MAA-06..MAA-09, MAA-40)', () => {
  it('sem material: SÓ o status (`paid → separating`, guardado), UMA linha de histórico, UM aviso', async () => {
    responder(detalhe({ status: 'paid' }))
    fake.filaDeEscrita('orders', () => {
      atual = detalhe({ status: 'separating' })
      return UMA_LINHA
    })
    fake.filaDeEscrita('order_status_history', { data: null, error: null })
    fake.filaDeInvocacao(AVISO, ENVIOU)
    await abrir()
    await tocar(botaoDoRodape())
    expect(fake.chamadasDe('set_material_status')).toHaveLength(0)
    expect(escritasDeOrders()).toHaveLength(1)
    expect(valoresDe(0)).toEqual({ status: 'separating' })
    expect(escritasDeOrders()[0].cadeia).toEqual([
      { metodo: 'eq', args: ['id', ID] },
      { metodo: 'eq', args: ['status', 'paid'] },
      { metodo: 'select', args: ['id'] },
    ])
    expect(fake.escritasDe('order_status_history').map((e) => e.valores[0])).toEqual([
      { order_id: ID, from_status: 'paid', to_status: 'separating', note: null },
    ])
    expect(fake.invocacoesDe(AVISO)).toHaveLength(1)
    // `separar` sem material nunca promete e-mail (o `order_status_changed` de `separating` não produz).
    expect(aviso()).toHaveTextContent('Separação iniciada.')
    expect(aviso()!.textContent).toContain('Pedido #0244 em separação.')
    expect(aviso()!.textContent).not.toMatch(/e-mail/)
    expect(botaoDoRodape()).toHaveTextContent('Marcar como enviado')
  })

  it('com o material na bancada: a RPC `em_producao` PRIMEIRO, depois o status — "em produção", com e-mail', async () => {
    responder(detalhe({ status: 'paid', material_status: 'material_recebido' }))
    fake.filaRpc('set_material_status', { data: { ok: true, status: 'em_producao' }, error: null })
    fake.filaDeInvocacao(AVISO, ENVIOU, NAO_ENVIOU)
    fake.filaDeEscrita('orders', UMA_LINHA)
    fake.filaDeEscrita('order_status_history', { data: null, error: null })
    await abrir()
    await tocar(botaoDoRodape())
    expect(fake.log().filter((l) => /^(rpc set_|invoke|update|insert)/.test(l))).toEqual([
      'rpc set_material_status',
      `invoke ${AVISO}`,
      'update orders',
      'insert order_status_history',
      `invoke ${AVISO}`,
    ])
    expect(fake.chamadasDe('set_material_status')[0].args).toEqual([{ p_order_id: ID, p_status: 'em_producao' }])
    expect(aviso()!.textContent).toContain('Pedido #0244 em produção. Marina recebe o aviso por e-mail.')
  })

  it('o material RECUSADO: o status NÃO é gravado, e o motivo legível (MAA-09)', async () => {
    responder(detalhe({ status: 'paid', material_status: 'material_recebido' }))
    fake.filaRpc('set_material_status', { data: { ok: false, reason: 'invalid_transition', status: 'aguardando_material' }, error: null })
    await abrir()
    await tocar(botaoDoRodape())
    expect(escritasDeOrders()).toHaveLength(0)
    expect(alerta()).toHaveTextContent('Este pedido está em “Aguardando material”. “Em produção” só é possível a partir de “Material recebido”.')
    expect(aviso()).toBeNull()
  })

  it('a PARCIAL: material em produção, status em 500 ⇒ a frase e "Tentar de novo", que grava SÓ o status (MAA-40)', async () => {
    responder(detalhe({ status: 'paid', material_status: 'material_recebido' }))
    fake.filaRpc('set_material_status', () => {
      atual = detalhe({ status: 'paid', material_status: 'em_producao' })
      return { data: { ok: true, status: 'em_producao' }, error: null }
    })
    fake.filaDeInvocacao(AVISO, NAO_ENVIOU)
    fake.filaDeEscrita('orders', ERRO_500)
    await abrir()
    await tocar(botaoDoRodape())
    expect(alerta()).toHaveTextContent('A produção ficou registrada, mas o pedido não passou para separação.')
    expect(aviso()).toBeNull()

    fake.filaDeEscrita('orders', () => {
      atual = detalhe({ status: 'separating', material_status: 'em_producao' })
      return UMA_LINHA
    })
    fake.filaDeEscrita('order_status_history', { data: null, error: null })
    fake.filaDeInvocacao(AVISO, NAO_ENVIOU)
    await tocar(within(alerta()!).getByRole('button', { name: 'Tentar de novo' }))
    expect(fake.chamadasDe('set_material_status')).toHaveLength(1)
    expect(escritasDeOrders()).toHaveLength(2)
    expect(valoresDe(1)).toEqual({ status: 'separating' })
    expect(aviso()).toHaveTextContent('Separação iniciada.')
    expect(alerta()).toBeNull()
  })

  // QA C01 (`BUG-20261024-tentar-de-novo-diz-falha-sem-tentar`): o status afetou ZERO linhas porque
  // OUTRA escrita levou o pedido adiante (outra aba a `separating`, ou o painel a `cancelled`). O
  // "Tentar de novo" relê a linha e ela já não oferece "Iniciar separação": nada vai à rede e a frase
  // é "o pedido mudou", sem retentativa — nunca "Não consegui salvar" sem ter tentado (laço sem saída).
  it.each([
    ['outra aba levou a `separating`', 'separating'],
    ['o painel cancelou entre os dois passos', 'cancelled'],
  ])('a PARCIAL por zero linhas (%s): "Tentar de novo" NÃO vai à rede e diz que o pedido mudou (MAA-40, MAA-21)', async (_, destino) => {
    responder(detalhe({ status: 'paid', material_status: 'material_recebido' }))
    fake.filaRpc('set_material_status', () => {
      atual = detalhe({ status: 'paid', material_status: 'em_producao' })
      return { data: { ok: true, status: 'em_producao' }, error: null }
    })
    fake.filaDeInvocacao(AVISO, NAO_ENVIOU)
    fake.filaDeEscrita('orders', () => {
      atual = detalhe({ status: destino, material_status: 'em_producao' })
      return ZERO_LINHAS
    })
    await abrir()
    await tocar(botaoDoRodape())
    expect(alerta()).toHaveTextContent('A produção ficou registrada, mas o pedido não passou para separação.')

    const rpcsAntes = fake.chamadasDe('set_material_status').length
    const escritasAntes = escritasDeOrders().length
    const invocacoesAntes = fake.invocacoesDe(AVISO).length
    await tocar(within(alerta()!).getByRole('button', { name: 'Tentar de novo' }))

    expect(fake.chamadasDe('set_material_status')).toHaveLength(rpcsAntes)
    expect(escritasDeOrders()).toHaveLength(escritasAntes)
    expect(fake.escritasDe('order_status_history')).toHaveLength(0)
    expect(fake.invocacoesDe(AVISO)).toHaveLength(invocacoesAntes)
    expect(alerta()).toHaveTextContent('Este pedido mudou enquanto você olhava.')
    expect(alerta()).not.toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(within(alerta()!).queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
    expect(aviso()).toBeNull()
  })
})

describe('"Marcar como enviado" (MAA-13, MAA-15)', () => {
  const digitarESalvar = async (codigo: string) => {
    const dialogo = screen.getByRole('dialog', { name: 'Marcar como enviado' })
    fireEvent.change(within(dialogo).getByLabelText('Código de rastreio'), { target: { value: codigo } })
    await tocar(within(dialogo).getByRole('button', { name: 'Salvar' }))
  }

  it('abre a folha; salvar grava o rastreio (guardado, sem transportadora), DEPOIS o status, e UM aviso', async () => {
    responder(detalhe({ status: 'separating' }))
    fake.filaDeEscrita('orders', UMA_LINHA, () => {
      atual = detalhe({ status: 'shipped', tracking_code: 'AN123456789BR' })
      return UMA_LINHA
    })
    fake.filaDeEscrita('order_status_history', { data: null, error: null })
    fake.filaDeInvocacao(AVISO, ENVIOU)
    await abrir()
    await tocar(botaoDoRodape())
    expect(screen.getByRole('dialog', { name: 'Marcar como enviado' })).toBeInTheDocument()
    await digitarESalvar(' an 1234 5678 9br ')

    expect(valoresDe(0)).toEqual({ tracking_code: 'AN123456789BR' })
    expect(valoresDe(0)).not.toHaveProperty('shipping_carrier')
    expect(escritasDeOrders()[0].cadeia).toEqual([
      { metodo: 'eq', args: ['id', ID] },
      { metodo: 'in', args: ['status', ['separating', 'shipped']] },
      { metodo: 'select', args: ['id'] },
    ])
    expect(valoresDe(1)).toEqual({ status: 'shipped' })
    expect(escritasDeOrders()[1].cadeia).toContainEqual({ metodo: 'eq', args: ['status', 'separating'] })
    expect(fake.escritasDe('order_status_history').map((e) => e.valores[0])).toEqual([
      { order_id: ID, from_status: 'separating', to_status: 'shipped', note: null },
    ])
    expect(fake.invocacoesDe(AVISO)).toHaveLength(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(aviso()).toHaveTextContent('Rastreio salvo.')
    expect(aviso()!.textContent).toContain('Marina recebe o aviso de postagem por e-mail.')
    // A folha fechada NÃO deixou "o pedido mudou" para trás.
    expect(screen.queryByText('Este pedido mudou enquanto você olhava.')).toBeNull()
    expect(rodape()).toBeNull()
  })

  it('zero linhas no rastreio (o pedido foi cancelado com a folha aberta): NADA mais é gravado, "mudou" (MAA-13, MAA-21)', async () => {
    responder(detalhe({ status: 'separating' }))
    fake.filaDeEscrita('orders', ZERO_LINHAS)
    await abrir()
    await tocar(botaoDoRodape())
    atual = detalhe({ status: 'cancelled', payment_status: 'cancelled' })
    await digitarESalvar('AN123456789BR')
    expect(escritasDeOrders()).toHaveLength(1)
    expect(fake.invocacoesDe(AVISO)).toHaveLength(0)
    expect(screen.getAllByText('Este pedido mudou enquanto você olhava.').length).toBeGreaterThanOrEqual(1)
    expect(aviso()).toBeNull()
  })

  it('a PARCIAL do rastreio: a folha fecha, "Tentar de novo" NÃO a reabre e grava SÓ o status (MAA-15 a)', async () => {
    responder(detalhe({ status: 'separating' }))
    fake.filaDeEscrita('orders', UMA_LINHA, () => {
      atual = detalhe({ status: 'separating', tracking_code: 'AN123456789BR' })
      return ERRO_500
    })
    await abrir()
    await tocar(botaoDoRodape())
    await digitarESalvar('AN123456789BR')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(alerta()).toHaveTextContent('O código ficou salvo, mas o pedido não foi marcado como enviado.')
    expect(fake.invocacoesDe(AVISO)).toHaveLength(0)

    fake.filaDeEscrita('orders', () => {
      atual = detalhe({ status: 'shipped', tracking_code: 'AN123456789BR' })
      return UMA_LINHA
    })
    fake.filaDeEscrita('order_status_history', { data: null, error: null })
    fake.filaDeInvocacao(AVISO, ENVIOU)
    await tocar(within(alerta()!).getByRole('button', { name: 'Tentar de novo' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(escritasDeOrders()).toHaveLength(3)
    expect(escritasDeOrders().filter((e) => 'tracking_code' in (e.valores[0] as object))).toHaveLength(1)
    expect(valoresDe(2)).toEqual({ status: 'shipped' })
    expect(fake.invocacoesDe(AVISO)).toHaveLength(1)
    expect(aviso()).toHaveTextContent('Rastreio salvo.')
  })
})

describe('"Marcar como retirado" (MAA-38)', () => {
  it('`separating → delivered` guardado, uma linha de histórico, um aviso, "Retirada registrada."', async () => {
    responder({ ...DETALHE_DE_RETIRADA, status: 'separating' })
    fake.filaDeEscrita('orders', () => {
      atual = { ...DETALHE_DE_RETIRADA, status: 'delivered' }
      return UMA_LINHA
    })
    fake.filaDeEscrita('order_status_history', { data: null, error: null })
    fake.filaDeInvocacao(AVISO, ENVIOU)
    await abrir()
    await tocar(botaoDoRodape())
    expect(valoresDe(0)).toEqual({ status: 'delivered' })
    expect(escritasDeOrders()[0].cadeia).toContainEqual({ metodo: 'eq', args: ['status', 'separating'] })
    expect(fake.escritasDe('order_status_history').map((e) => e.valores[0])).toEqual([
      { order_id: ID, from_status: 'separating', to_status: 'delivered', note: null },
    ])
    expect(fake.invocacoesDe(AVISO)).toHaveLength(1)
    expect(aviso()).toHaveTextContent('Retirada registrada.')
    expect(aviso()!.textContent).toContain('Pedido #0244 entregue.')
    expect(rodape()).toBeNull()
  })
})

describe('zero linhas, recusa, rede e aviso que falha (MAA-21, MAA-22, MAA-24)', () => {
  it('zero linhas com o papel de pé: "Este pedido mudou enquanto você olhava." e o pedido relido', async () => {
    responder(detalhe({ status: 'paid' }))
    fake.filaDeEscrita('orders', () => {
      atual = detalhe({ status: 'separating' })
      return ZERO_LINHAS
    })
    await abrir()
    const relogioAntes = fake.chamadasDe('atelie_clock').length
    await tocar(botaoDoRodape())
    expect(alerta()).toHaveTextContent('Este pedido mudou enquanto você olhava.')
    // A conferência do papel (uma) e a releitura (pelo menos uma).
    expect(fake.chamadasDe('atelie_clock').length).toBeGreaterThanOrEqual(relogioAntes + 2)
    expect(fake.escritasDe('order_status_history')).toHaveLength(0)
    expect(fake.invocacoesDe(AVISO)).toHaveLength(0)
    expect(aviso()).toBeNull()
    expect(botaoDoRodape()).toHaveTextContent('Marcar como enviado')
  })

  it('zero linhas com `42501` na conferência: a recusa da 72, e nenhuma confirmação', async () => {
    responder(detalhe({ status: 'paid' }))
    fake.filaDeEscrita('orders', () => {
      fake.estado.admins.clear()
      fake.falharRpc('atelie_clock', RECUSA)
      return ZERO_LINHAS
    })
    await abrir()
    await tocar(botaoDoRodape())
    await andar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Separação iniciada|Marina|#0244/)
  })

  it('500: "Não consegui salvar. Tente de novo.", o pedido como estava — nunca a recusa (MAA-22)', async () => {
    responder(detalhe({ status: 'paid' }))
    fake.filaDeEscrita('orders', ERRO_500)
    await abrir()
    await tocar(botaoDoRodape())
    await andar(3000)
    expect(window.location.pathname).toBe(pedidoHref(ID))
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(alerta()).toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(botaoDoRodape()).toHaveTextContent('Iniciar separação')
    expect(aviso()).toBeNull()
  })

  it('o aviso que FALHA: a gravação vale, sem erro, e a confirmação não cita e-mail (MAA-24)', async () => {
    responder(detalhe({ status: 'paid', material_status: 'aguardando_material' }))
    fake.filaRpc('set_material_status', { data: { ok: true, status: 'material_recebido' }, error: null })
    fake.filaDeInvocacao(AVISO, { data: null, error: { message: 'FunctionsHttpError' } })
    await abrir()
    await tocar(botaoDoRodape())
    expect(aviso()).toHaveTextContent('Material registrado.')
    expect(aviso()!.textContent).not.toMatch(/e-mail/)
    expect(alerta()).toBeNull()
  })
})

describe('espera, exclusividade e trava (MAA-20, MAA-35, L-063)', () => {
  it('os três estados são EXCLUSIVOS — e o erro FICA até a próxima ação', async () => {
    responder(detalhe({ status: 'paid' }))
    let soltar: (r: RespostaTabela) => void = () => {}
    fake.filaDeEscrita('orders', () => new Promise<RespostaTabela>((ok) => (soltar = ok)))
    await abrir()
    await act(async () => {
      fireEvent.click(botaoDoRodape())
    })
    // No ar: "Salvando…", sem erro, sem confirmação.
    expect(botaoDoRodape()).toHaveTextContent('Salvando…')
    expect(botaoDoRodape()).toHaveAttribute('aria-disabled', 'true')
    expect(alerta()).toBeNull()
    expect(aviso()).toBeNull()

    await act(async () => soltar(ERRO_500))
    await andar(50)
    // Erro: o alerta, sem "Salvando…", sem confirmação.
    expect(alerta()).toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(botaoDoRodape()).toHaveTextContent('Iniciar separação')
    expect(aviso()).toBeNull()
    // Fica: 30 s depois, ainda lá.
    await andar(30_000)
    expect(alerta()).toHaveTextContent('Não consegui salvar. Tente de novo.')

    // A próxima ação, que dá certo: a confirmação, sem erro.
    fake.filaDeEscrita('orders', () => {
      atual = detalhe({ status: 'separating' })
      return UMA_LINHA
    })
    fake.filaDeEscrita('order_status_history', { data: null, error: null })
    fake.filaDeInvocacao(AVISO, NAO_ENVIOU)
    await tocar(botaoDoRodape())
    expect(aviso()).toHaveTextContent('Separação iniciada.')
    expect(alerta()).toBeNull()
  })

  it('com um erro na tela, a PRÓXIMA ação no ar o esconde: "Salvando…" nunca divide o rodapé com o alerta', async () => {
    responder(detalhe({ status: 'paid' }))
    fake.filaDeEscrita('orders', ERRO_500)
    await abrir()
    await tocar(botaoDoRodape())
    expect(alerta()).toHaveTextContent('Não consegui salvar. Tente de novo.')
    let soltar: (r: RespostaTabela) => void = () => {}
    fake.filaDeEscrita('orders', () => new Promise<RespostaTabela>((ok) => (soltar = ok)))
    await act(async () => {
      fireEvent.click(botaoDoRodape())
    })
    expect(botaoDoRodape()).toHaveTextContent('Salvando…')
    expect(alerta()).toBeNull()
    await act(async () => soltar(ERRO_500))
    await andar(50)
    expect(alerta()).toHaveTextContent('Não consegui salvar. Tente de novo.')
  })

  it('dois toques seguidos ⇒ UMA escrita (MAA-20)', async () => {
    responder(detalhe({ status: 'paid' }))
    fake.filaDeEscrita('orders', UMA_LINHA)
    fake.filaDeEscrita('order_status_history', { data: null, error: null })
    fake.filaDeInvocacao(AVISO, NAO_ENVIOU)
    await abrir()
    const b = botaoDoRodape()
    await act(async () => {
      fireEvent.click(b)
      fireEvent.click(b)
    })
    await andar(50)
    expect(escritasDeOrders()).toHaveLength(1)
    expect(fake.esgotamentos()).toEqual([])
  })
})

describe('sem conexão e Realtime (MAA-25, MAA-26)', () => {
  it('sem conexão: a tela "Sem conexão", e ZERO escritas — nada enfileirado', async () => {
    let online = true
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
    responder(detalhe({ status: 'paid' }))
    await abrir()
    await act(async () => {
      online = false
      window.dispatchEvent(new Event('offline'))
      await vi.advanceTimersByTimeAsync(700)
    })
    expect(screen.getByText('Sem conexão. Os dados da loja aparecem quando a internet voltar.')).toBeInTheDocument()
    expect(rodape()).toBeNull()
    await andar(5000)
    expect(fake.estado.escritas).toEqual([])
    expect(fake.chamadasDe('set_material_status')).toHaveLength(0)
    // A conexão volta (o estado de "online" do app é global: o próximo caso não pode nascer offline).
    await act(async () => {
      online = true
      window.dispatchEvent(new Event('online'))
      await vi.advanceTimersByTimeAsync(700)
    })
  })

  it('o aviso do Realtime troca o estado: o rodapé muda de rótulo', async () => {
    responder(detalhe({ status: 'paid' }))
    await abrir()
    expect(botaoDoRodape()).toHaveTextContent('Iniciar separação')
    atual = detalhe({ status: 'separating' })
    act(() => {
      fake.emitir('orders')
    })
    await andar(50)
    expect(botaoDoRodape()).toHaveTextContent('Marcar como enviado')
  })

  it('a folha aberta para uma ação que deixou de valer FECHA com "mudou" (MAA-26)', async () => {
    responder(detalhe({ status: 'separating' }))
    await abrir()
    await tocar(botaoDoRodape())
    expect(screen.getByRole('dialog', { name: 'Marcar como enviado' })).toBeInTheDocument()
    atual = detalhe({ status: 'cancelled', payment_status: 'cancelled' })
    act(() => {
      fake.emitir('orders')
    })
    await andar(100)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(alerta()).toHaveTextContent('Este pedido mudou enquanto você olhava.')
    expect(window.location.pathname).toBe(pedidoHref(ID))
  })
})

// ---------------------------------------------------------------------------------------------
// T24 — "Informar" / "Alterar" na Entrega
// ---------------------------------------------------------------------------------------------

describe('"Informar" / "Alterar" na Entrega (MAA-11, MAA-14, MAA-16)', () => {
  const editar = () => screen.queryByTestId('editar-rastreio')
  const salvarNaFolha = async (titulo: string, codigo: string) => {
    const dialogo = screen.getByRole('dialog', { name: titulo })
    fireEvent.change(within(dialogo).getByLabelText('Código de rastreio'), { target: { value: codigo } })
    await tocar(within(dialogo).getByRole('button', { name: 'Salvar' }))
  }

  it.each([
    ['shipped sem código', detalhe({ status: 'shipped', tracking_code: null }), 'Informar', 'Salvar rastreio', 'A cliente recebe o e-mail de postagem assim que você salvar o código.'],
    [
      'shipped com código, sem aviso de postagem no histórico',
      detalhe({ status: 'shipped', tracking_code: 'BR123456789BR' }),
      'Alterar',
      'Alterar rastreio',
      'O código aparece no pedido dela.',
    ],
    ['delivered sem código', detalhe({ status: 'delivered', tracking_code: null }), 'Informar', 'Salvar rastreio', 'O código aparece no pedido dela.'],
    ['delivered com código', detalhe({ status: 'delivered', tracking_code: 'BR987654321BR' }), 'Alterar', 'Alterar rastreio', 'O código aparece no pedido dela.'],
  ] as const)('%s: "%s", 44 px, abre "%s" com a frase pelo par (status, código)', async (_n, pedido, rotulo, titulo, frase) => {
    responder(pedido)
    await abrir()
    const bloco = screen.getByRole('region', { name: 'Entrega' })
    const b = within(bloco).getByRole('button', { name: `${rotulo} o rastreio` })
    expect(b).toHaveTextContent(rotulo)
    expect(tokens(b)).toContain('min-h-11')
    await tocar(b)
    const dialogo = screen.getByRole('dialog', { name: titulo })
    expect(within(dialogo).getByText(frase)).toBeInTheDocument()
  })

  // BUG-20261024-folha-afirma-aviso-que-falhou: a folha lê o MESMO `order_notifications` que o
  // histórico. Com o `order_shipped` falho, ela não afirma que a cliente recebeu o aviso.
  const avisoDePostagem = (status: string, attempts: number) => ({
    id: `n-${status}`,
    event: 'order_shipped',
    channel: 'email',
    status,
    attempts,
    delivery_status: null,
    error: status === 'failed' ? 'falhou' : null,
    created_at: '2026-10-24T12:00:00.000Z',
    sent_at: status === 'sent' ? '2026-10-24T12:00:01.000Z' : null,
  })
  it.each([
    ['falhou', avisoDePostagem('failed', 1), 'O código aparece no pedido dela.'],
    ['saiu', avisoDePostagem('sent', 1), 'A cliente já recebeu o aviso de postagem. O código novo aparece no pedido dela, mas não gera outro e-mail.'],
  ] as const)('shipped com código e o aviso de postagem que %s no histórico ⇒ a frase da folha diz isso', async (_n, notificacao, frase) => {
    responder(detalhe({ status: 'shipped', tracking_code: 'BR123456789BR' }), [notificacao])
    await abrir()
    await tocar(within(screen.getByRole('region', { name: 'Entrega' })).getByRole('button', { name: 'Alterar o rastreio' }))
    const dialogo = screen.getByRole('dialog', { name: 'Alterar rastreio' })
    expect(within(dialogo).getByText(frase)).toBeInTheDocument()
    if (notificacao.status === 'failed') expect(within(dialogo).queryByText(/já recebeu/)).toBeNull()
  })

  // Revalidação V10: a leitura de `order_notifications` em ERRO não diz se o aviso saiu — a folha fica
  // com a frase neutra, nunca "A cliente já recebeu o aviso de postagem".
  it('shipped com código e a leitura dos avisos em ERRO ⇒ a frase neutra, sem afirmar o e-mail', async () => {
    responder(detalhe({ status: 'shipped', tracking_code: 'BR123456789BR' }))
    fake.falharTabela('order_notifications', { message: 'TypeError: Failed to fetch' })
    await abrir()
    await tocar(within(screen.getByRole('region', { name: 'Entrega' })).getByRole('button', { name: 'Alterar o rastreio' }))
    const dialogo = screen.getByRole('dialog', { name: 'Alterar rastreio' })
    expect(within(dialogo).getByText('O código aparece no pedido dela.')).toBeInTheDocument()
    expect(within(dialogo).queryByText(/já recebeu/)).toBeNull()
  })

  it.each([
    ['pago', detalhe({ status: 'paid' })],
    ['em separação', detalhe({ status: 'separating' })],
    ['pendente', detalhe({ status: 'pending', payment_status: 'pending' })],
    ['cancelado', detalhe({ status: 'cancelled', payment_status: 'cancelled' })],
    ['retirada enviada', { ...DETALHE_DE_RETIRADA, status: 'shipped' }],
    ['retirada entregue', { ...DETALHE_DE_RETIRADA, status: 'delivered' }],
  ])('%s ⇒ sem "Informar/Alterar"', async (_n, pedido) => {
    responder(pedido as PedidoDoDetalhe)
    await abrir()
    expect(editar()).toBeNull()
  })

  it('`delivered` sem código, com `sent === true`: SÓ o código (guarda `delivered`), o disparo, e a confirmação SEM e-mail (MAA-14)', async () => {
    responder(detalhe({ status: 'delivered', tracking_code: null }))
    fake.filaDeEscrita('orders', () => {
      atual = detalhe({ status: 'delivered', tracking_code: 'AN123456789BR' })
      return UMA_LINHA
    })
    fake.filaDeInvocacao(AVISO, ENVIOU)
    await abrir()
    await tocar(editar()!)
    await salvarNaFolha('Salvar rastreio', 'AN123456789BR')
    expect(escritasDeOrders()).toHaveLength(1)
    expect(valoresDe(0)).toEqual({ tracking_code: 'AN123456789BR' })
    expect(escritasDeOrders()[0].cadeia).toContainEqual({ metodo: 'in', args: ['status', ['delivered']] })
    expect(fake.escritasDe('order_status_history')).toHaveLength(0)
    expect(fake.invocacoesDe(AVISO).map((i) => (i.opcoes as { body: { trigger: string } }).body.trigger)).toEqual(['order_status_changed'])
    expect(aviso()).toHaveTextContent('Rastreio salvo.')
    expect(aviso()!.textContent).toContain('O código ficou no pedido.')
    expect(aviso()!.textContent).not.toMatch(/e-mail/)
  })

  it('`shipped` com código ("Alterar"): sem histórico, sem status, confirmação sem e-mail', async () => {
    responder(detalhe({ status: 'shipped', tracking_code: 'BR123456789BR' }))
    fake.filaDeEscrita('orders', UMA_LINHA)
    fake.filaDeInvocacao(AVISO, ENVIOU)
    await abrir()
    await tocar(editar()!)
    await salvarNaFolha('Alterar rastreio', 'AN123456789BR')
    expect(escritasDeOrders()).toHaveLength(1)
    expect(valoresDe(0)).toEqual({ tracking_code: 'AN123456789BR' })
    expect(escritasDeOrders()[0].cadeia).toContainEqual({ metodo: 'in', args: ['status', ['shipped']] })
    expect(fake.escritasDe('order_status_history')).toHaveLength(0)
    expect(aviso()!.textContent).toContain('O código ficou no pedido.')
    expect(aviso()!.textContent).not.toMatch(/e-mail/)
  })

  it('código IGUAL ao salvo, em "Alterar": grava e confirma sem e-mail (edge case)', async () => {
    responder(detalhe({ status: 'shipped', tracking_code: 'BR123456789BR' }))
    fake.filaDeEscrita('orders', UMA_LINHA)
    fake.filaDeInvocacao(AVISO, NAO_ENVIOU)
    await abrir()
    await tocar(editar()!)
    const dialogo = screen.getByRole('dialog', { name: 'Alterar rastreio' })
    expect((within(dialogo).getByLabelText('Código de rastreio') as HTMLInputElement).value).toBe('BR123456789BR')
    await tocar(within(dialogo).getByRole('button', { name: 'Salvar' }))
    expect(escritasDeOrders()).toHaveLength(1)
    expect(valoresDe(0)).toEqual({ tracking_code: 'BR123456789BR' })
    expect(aviso()).toHaveTextContent('Rastreio salvo.')
  })

  it('`shipped` sem código pela Entrega: a confirmação CITA o e-mail quando ele saiu (o par do `order_shipped`)', async () => {
    responder(detalhe({ status: 'shipped', tracking_code: null }))
    fake.filaDeEscrita('orders', UMA_LINHA)
    fake.filaDeInvocacao(AVISO, ENVIOU)
    await abrir()
    await tocar(editar()!)
    await salvarNaFolha('Salvar rastreio', 'AN123456789BR')
    expect(aviso()!.textContent).toContain('Marina recebe o aviso de postagem por e-mail.')
  })
})

// ---------------------------------------------------------------------------------------------
// T25 — o lembrete no WhatsApp
// ---------------------------------------------------------------------------------------------

describe('"Lembrar do envio no WhatsApp" (MAA-17..MAA-19)', () => {
  const lembrete = () => screen.queryByRole('link', { name: 'Lembrar do envio no WhatsApp (abre em outra aba)' })

  it('aguardando, com número: um link para o `wa.me`, em nova aba, com a URL de `core` e a idade da LEITURA', async () => {
    // O relógio do aparelho 40 dias DEPOIS da leitura: se a idade viesse dele, o texto mudaria de faixa.
    vi.setSystemTime(new Date('2026-12-02T12:00:00Z'))
    const pedido = detalhe({ status: 'paid', material_status: 'aguardando_material', customer_phone: '(51) 99999-0000', created_at: '2026-10-20T13:04:05.123456+00:00' })
    responder(pedido)
    await abrir()
    const a = lembrete()!
    expect(a.getAttribute('href')).toBe(chargeMaterialUrlDoPainel(pedido, pedido.customer_phone, new Date(LIDO_EM)))
    expect(a.getAttribute('href')).not.toBe(chargeMaterialUrlDoPainel(pedido, pedido.customer_phone, new Date()))
    expect(a.getAttribute('href')!.startsWith('https://wa.me/5551999990000?text=')).toBe(true)
    expect(a).toHaveAttribute('target', '_blank')
    expect(a).toHaveAttribute('rel', 'noopener noreferrer')
    expect(tokens(a)).toEqual(expect.arrayContaining(['min-h-11', 'w-full']))
    expect(within(screen.getByRole('region', { name: 'Material afetivo' })).getByRole('link', { name: 'Lembrar do envio no WhatsApp (abre em outra aba)' })).toBe(a)
  })

  it('o texto do `href`: sem nomear o material, sem urgência — e byte a byte o que o painel monta (MAA-19)', async () => {
    const pedido = detalhe({ status: 'paid', material_status: 'aguardando_material', customer_phone: '51999990000' })
    responder(pedido)
    await abrir()
    const texto = decodeURIComponent(new URL(lembrete()!.getAttribute('href')!).searchParams.get('text')!)
    const doPainel = decodeURIComponent(new URL(chargeMaterialUrlDoPainel(pedido, pedido.customer_phone, new Date(LIDO_EM))).searchParams.get('text')!)
    expect(texto).toBe(doPainel)
    expect(texto).toMatch(/^Oi, Marina! Aqui é a Adri, da Uma Estrelinha\./)
    expect(texto).not.toMatch(/cinza|leite|cabelo|pelo|dente|coto|flor|pena|urgente|últim|prazo/i)
  })

  it('tocar NÃO grava nada nem chama RPC de escrita (MAA-18)', async () => {
    responder(detalhe({ status: 'paid', material_status: 'aguardando_material', customer_phone: '51999990000' }))
    await abrir()
    const rpcsAntes = fake.estado.chamadasRpc.length
    await act(async () => {
      fireEvent.click(lembrete()!)
    })
    expect(fake.estado.escritas).toEqual([])
    expect(fake.estado.invocacoes).toEqual([])
    expect(fake.estado.chamadasRpc.slice(rpcsAntes).filter((c) => c.nome !== 'atelie_clock')).toEqual([])
  })

  it.each([
    ['sem número', detalhe({ status: 'paid', material_status: 'aguardando_material', customer_phone: null })],
    ['número inválido', detalhe({ status: 'paid', material_status: 'aguardando_material', customer_phone: '123' })],
    ['material a caminho', detalhe({ status: 'paid', material_status: 'material_enviado', customer_phone: '51999990000' })],
    ['cancelado', detalhe({ status: 'cancelled', payment_status: 'cancelled', material_status: 'aguardando_material', customer_phone: '51999990000' })],
  ])('%s ⇒ sem lembrete (MAA-17)', async (_n, pedido) => {
    responder(pedido)
    await abrir()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pedido #0244')
    expect(lembrete()).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------
// T26 — a ação no cartão da lista
// ---------------------------------------------------------------------------------------------

describe('a ação no cartão da lista (MAA-36, MAA-37, MAA-16, MAA-20)', () => {
  let linhasDaLista: PedidoDoDetalhe[]
  const responderLista = (linhas: PedidoDoDetalhe[]) => {
    linhasDaLista = linhas
    responder(linhas[0] ?? null)
    fake.responderTabela('order_list', (cadeia): RespostaTabela =>
      ehDetalhe(cadeia) ? { data: atual, error: null } : { data: linhasDaLista, error: null, count: linhasDaLista.length },
    )
  }
  const abrirLista = async () => {
    await montarApp('/pedidos?visao=tudo')
    await andar(50)
  }
  const cartoes = () => screen.queryAllByTestId('acao-do-cartao')
  const botaoDoCartao = () => within(cartoes()[0]).getByRole('button', { name: /./ })

  it.each([
    ['material aguardando', detalhe({ status: 'paid', material_status: 'aguardando_material' }), 'Recebi o material'],
    ['pago, sem material', detalhe({ status: 'paid' }), 'Iniciar separação'],
    ['em separação', detalhe({ status: 'separating' }), 'Marcar como enviado'],
    ['enviado sem código', detalhe({ status: 'shipped', tracking_code: null }), 'Salvar rastreio'],
    ['retirada em separação', { ...DETALHE_DE_RETIRADA, status: 'separating' }, 'Marcar como retirado'],
  ] as const)('%s: o MESMO rótulo do rodapé, `min-h-11`, FORA do link', async (_n, pedido, rotulo) => {
    responderLista([pedido])
    await abrirLista()
    expect(botaoDoCartao()).toHaveTextContent(rotulo)
    expect(tokens(botaoDoCartao())).toContain('min-h-11')
    expect(botaoDoCartao().closest('a')).toBeNull()
    expect(document.querySelectorAll('a button')).toHaveLength(0)
    // Irmão da linha no MESMO `<li>`.
    const li = botaoDoCartao().closest('li')!
    expect(within(li).getByRole('link', { name: 'Pedido #0244, Marina Duarte' })).toBeInTheDocument()
  })

  it.each([
    ['cancelado com o material aguardando', detalhe({ status: 'cancelled', payment_status: 'cancelled', material_status: 'aguardando_material' })],
    ['entregue', detalhe({ status: 'delivered', tracking_code: 'BR987654321BR' })],
    ['enviado com código', detalhe({ status: 'shipped', tracking_code: 'BR123456789BR' })],
  ])('%s ⇒ sem botão no cartão', async (_n, pedido) => {
    responderLista([pedido])
    await abrirLista()
    expect(screen.getByRole('link', { name: 'Pedido #0244, Marina Duarte' })).toBeInTheDocument()
    expect(cartoes()).toHaveLength(0)
  })

  // C04 (`BUG-20261024-botao-do-cartao-sem-o-pedido-no-nome`): no recorte "Aguardando material" são
  // vinte botões com o mesmo rótulo, irmãos do link (Q5) — nada os contextualizava. O nome acessível
  // é o rótulo VISÍVEL primeiro (o rótulo dentro do nome) e depois o pedido, por extenso.
  it('dois cartões com a mesma ação: cada botão diz QUAL pedido — o rótulo visível primeiro (MAA-36, C04)', async () => {
    const outro = '00000000-0000-4000-8000-000000000245'
    responderLista([
      detalhe({ status: 'paid', material_status: 'aguardando_material' }),
      { ...detalhe({ status: 'paid', material_status: 'aguardando_material' }), id: outro, order_number: '0245', customer_name: 'Lúcia Prado' },
    ])
    await abrirLista()
    const botoes = cartoes().map((c) => within(c).getByRole('button', { name: /./ }))
    expect(botoes).toHaveLength(2)
    expect(botoes[0]).toHaveAccessibleName('Recebi o material, Pedido #0244, Marina Duarte')
    expect(botoes[1]).toHaveAccessibleName('Recebi o material, Pedido #0245, Lúcia Prado')
    expect(botoes[0]).toHaveTextContent(/^Recebi o material$/)
  })

  it('com a trava, o nome acompanha o texto visível e continua dizendo o pedido (C04)', async () => {
    const { travar } = await import('@/features/order-actions')
    responderLista([detalhe({ status: 'paid' })])
    await abrirLista()
    act(() => {
      travar(ID)
    })
    expect(botaoDoCartao()).toHaveAccessibleName('Salvando…, Pedido #0244, Marina Duarte')
  })

  it('o tom do ponto vem de `appPrimaryAction`: `marcar-retirado` é o primário (A14b); a frase não muda', async () => {
    responderLista([{ ...DETALHE_DE_RETIRADA, status: 'separating' }])
    await abrirLista()
    const ponto = document.querySelector('[data-ponto]')!
    expect(ponto.getAttribute('data-ponto')).toBe('marcar-retirado')
    expect(tokens(ponto)).toContain('bg-estrelinha-primary')
  })

  it('tocar no botão NÃO navega e grava; tocar no resto do cartão abre o detalhe', async () => {
    responderLista([detalhe({ status: 'paid' })])
    fake.filaDeEscrita('orders', UMA_LINHA)
    fake.filaDeEscrita('order_status_history', { data: null, error: null })
    fake.filaDeInvocacao(AVISO, NAO_ENVIOU)
    await abrirLista()
    await tocar(botaoDoCartao())
    expect(window.location.pathname).toBe('/pedidos')
    expect(escritasDeOrders()).toHaveLength(1)
    expect(aviso()).toHaveTextContent('Separação iniciada.')
    await tocar(screen.getByRole('link', { name: 'Pedido #0244, Marina Duarte' }))
    expect(window.location.pathname).toBe(pedidoHref(ID))
  })

  it('o rastreio abre a MESMA folha, sem sair da lista', async () => {
    responderLista([detalhe({ status: 'separating' })])
    await abrirLista()
    await tocar(botaoDoCartao())
    expect(screen.getByRole('dialog', { name: 'Marcar como enviado' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/pedidos')
    expect(window.location.search).toBe('?visao=tudo')
  })

  it('depois de gravar a lista é RELIDA e o pedido que saiu do recorte SAI — sem pular para o topo (MAA-37)', async () => {
    responderLista([detalhe({ status: 'paid' })])
    fake.filaDeEscrita('orders', () => {
      linhasDaLista = []
      return UMA_LINHA
    })
    fake.filaDeEscrita('order_status_history', { data: null, error: null })
    fake.filaDeInvocacao(AVISO, NAO_ENVIOU)
    await abrirLista()
    const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const leiturasAntes = fake.cadeiasDe('order_list').filter((c) => !ehDetalhe(c)).length
    await tocar(botaoDoCartao())
    expect(fake.cadeiasDe('order_list').filter((c) => !ehDetalhe(c)).length).toBeGreaterThan(leiturasAntes)
    expect(screen.queryByRole('link', { name: 'Pedido #0244, Marina Duarte' })).toBeNull()
    expect(rolar).not.toHaveBeenCalledWith(0, 0)
  })

  it('a TRAVA é a do pedido: com a ação no ar (vinda do detalhe), o cartão diz "Salvando…" e não grava (MAA-20)', async () => {
    const { travar } = await import('@/features/order-actions')
    responderLista([detalhe({ status: 'paid' })])
    await abrirLista()
    act(() => {
      travar(ID)
    })
    expect(botaoDoCartao()).toHaveTextContent('Salvando…')
    expect(botaoDoCartao()).toHaveAttribute('aria-disabled', 'true')
    await tocar(botaoDoCartao())
    expect(fake.estado.escritas).toEqual([])
  })

  it('a recusa vinda do cartão com o papel AINDA admin: UMA reconferência pela vigia da página (R11)', async () => {
    responderLista([detalhe({ status: 'paid', material_status: 'aguardando_material' })])
    fake.filaRpc('set_material_status', { data: { ok: false, reason: 'not_admin' }, error: null })
    await abrirLista()
    const papeis = () => fake.estado.tabelas.filter((t) => t === 'user_roles').length
    const antes = papeis()
    await tocar(botaoDoCartao())
    await andar(3000)
    expect(papeis()).toBe(antes + 1)
    expect(window.location.pathname).toBe('/pedidos')
    expect(screen.getByRole('link', { name: 'Pedido #0244, Marina Duarte' })).toBeInTheDocument()
  })

  // Revalidação V05 (C01 pelo CARTÃO): o "Tentar de novo" do cartão reenvia a retentativa do erro — a
  // primária COM `espera: 'separar'`. Sem ela, a linha relida já não oferece "Iniciar separação" e o
  // cartão diria "Não consegui salvar" sem ir à rede, ou — retirada relida em `separating` — gravaria
  // `delivered` ("Marcar como retirado"). O mesmo it.each do rodapé, mais o caso da retirada.
  it.each([
    ['outra aba levou a `separating`', detalhe({ status: 'paid', material_status: 'material_recebido' }), 'separating'],
    ['o painel cancelou entre os dois passos', detalhe({ status: 'paid', material_status: 'material_recebido' }), 'cancelled'],
    ['retirada relida em `separating`', { ...DETALHE_DE_RETIRADA, status: 'paid', material_status: 'material_recebido' }, 'separating'],
  ] as const)('a PARCIAL por zero linhas pelo CARTÃO (%s): "Tentar de novo" NÃO vai à rede e diz que o pedido mudou (MAA-40, MAA-21, C01)', async (_n, pedido, destino) => {
    const base = pedido as PedidoDoDetalhe
    responderLista([base])
    fake.filaRpc('set_material_status', () => {
      atual = { ...base, material_status: 'em_producao' }
      linhasDaLista = [atual]
      return { data: { ok: true, status: 'em_producao' }, error: null }
    })
    fake.filaDeInvocacao(AVISO, NAO_ENVIOU)
    fake.filaDeEscrita('orders', () => {
      atual = { ...base, status: destino, material_status: 'em_producao' }
      linhasDaLista = [atual]
      return ZERO_LINHAS
    })
    await abrirLista()
    expect(botaoDoCartao()).toHaveTextContent('Iniciar separação')
    await tocar(botaoDoCartao())
    const alertaDoCartao = () => within(cartoes()[0]).getByRole('alert')
    expect(alertaDoCartao()).toHaveTextContent('A produção ficou registrada, mas o pedido não passou para separação.')

    const rpcsAntes = fake.chamadasDe('set_material_status').length
    const escritasAntes = escritasDeOrders().length
    const invocacoesAntes = fake.invocacoesDe(AVISO).length
    await tocar(within(alertaDoCartao()).getByRole('button', { name: 'Tentar de novo' }))

    expect(fake.chamadasDe('set_material_status')).toHaveLength(rpcsAntes)
    expect(escritasDeOrders()).toHaveLength(escritasAntes)
    expect(escritasDeOrders().some((e) => (e.valores[0] as { status?: string })?.status === 'delivered')).toBe(false)
    expect(fake.escritasDe('order_status_history')).toHaveLength(0)
    expect(fake.invocacoesDe(AVISO)).toHaveLength(invocacoesAntes)
    expect(alertaDoCartao()).toHaveTextContent('Este pedido mudou enquanto você olhava.')
    expect(alertaDoCartao()).not.toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(within(alertaDoCartao()).queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
    expect(aviso()).toBeNull()
    expect(window.location.pathname).toBe('/pedidos')
  })

  it('a falha fica NO CARTÃO (`role="alert"`), e a recusa vinda do cartão leva à recusa da 72 (R11)', async () => {
    responderLista([detalhe({ status: 'paid' })])
    fake.filaDeEscrita('orders', ERRO_500)
    await abrirLista()
    await tocar(botaoDoCartao())
    expect(within(cartoes()[0]).getByRole('alert')).toHaveTextContent('Não consegui salvar. Tente de novo.')

    fake.filaDeEscrita('orders', () => {
      fake.estado.admins.clear()
      fake.falharRpc('atelie_clock', RECUSA)
      return ZERO_LINHAS
    })
    await tocar(botaoDoCartao())
    await andar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
  })
})
